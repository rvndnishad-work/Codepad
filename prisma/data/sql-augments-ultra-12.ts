/**
 * SQL ULTRA — batch 12: Transactions (ACID, explicit transactions, COMMIT /
 * ROLLBACK / SAVEPOINT, isolation levels, PostgreSQL anomalies per level).
 * Every example was run by scripts/verify-sql-examples.ts (sql.js 1.10.2 like
 * the page, PostgreSQL 16 for postgres examples); quoted output is that run's
 * output. Two-session timelines were run with two concurrent psql sessions.
 */
import type { SqlUltraAugment } from "./sql-augments.types";

const augments: SqlUltraAugment[] = [
  {
    title: `What are ACID properties?`,
    difficulty: "medium",
    seoDescription: `ACID explained with a bank transfer: atomicity, consistency, isolation and durability, how engines implement each, and the SQLite error trap.`,
    description: `**Question presented to candidate:**
"People say a relational database is ACID. What do the four letters actually mean, and can you show me one concrete thing the database does for each of them — say, for a bank transfer between two accounts?"

**What a strong answer should cover:**
- Atomicity: a transaction is all or nothing; if any step fails or the client calls \`ROLLBACK\`, every change it made is undone (implemented with an undo log or old row versions)
- Consistency: a committed transaction moves the database from one valid state to another; the database enforces declared rules (\`CHECK\`, \`NOT NULL\`, foreign keys, unique keys) and the application owns the business invariants
- Isolation: concurrent transactions do not see each other half-done; how strictly is the isolation level, and most engines default to something weaker than serializable
- Durability: once \`COMMIT\` returns, the change survives a crash, because it was written to a write-ahead log (WAL) and flushed to disk first
- Engine details that trip people up: in SQLite a failed statement does not abort the transaction (PostgreSQL does), and durability knobs such as \`synchronous_commit\` trade safety for speed

**Code / implementation expected:** Optional — a transfer wrapped in \`BEGIN ... COMMIT\` / \`ROLLBACK\` and a \`CHECK\` constraint is enough to illustrate the four properties.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE accounts (
  id      INTEGER PRIMARY KEY,
  owner   TEXT    NOT NULL,
  balance INTEGER NOT NULL CHECK (balance >= 0)
);

CREATE TABLE transfers (
  id      INTEGER PRIMARY KEY,
  from_id INTEGER NOT NULL REFERENCES accounts (id),
  to_id   INTEGER NOT NULL REFERENCES accounts (id),
  amount  INTEGER NOT NULL CHECK (amount > 0)
);

INSERT INTO accounts (id, owner, balance) VALUES
  (1, 'Alice', 100),
  (2, 'Bob',    50),
  (3, 'Chen',  300);
\`\`\``,
    answer: `**Target Audience:** Beginners who have heard "ACID" and want to know what each letter promises in practice, and candidates preparing for the follow-ups ("which letter is weakest by default?", "what does durable actually cost?").
**Difficulty:** Medium
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15, both run for this page. The concepts apply to every transactional database (MySQL InnoDB, SQL Server, Oracle); engine differences are called out where they matter.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and error message shown was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

You hand a bank clerk a slip: "move 30 from Alice to Bob". The clerk has two ledgers. She crosses out 30 in Alice's ledger, and just then the fire alarm rings and everyone leaves the building. When they come back, Alice is 30 poorer and Bob is no richer. The money has vanished.

A good bank has four habits that make this impossible:

1. A slip is either done completely or not at all. A half-done slip is torn up and Alice's line is restored.
2. The ledgers must always obey the rules: nobody goes below zero, and the total money never changes because of a transfer.
3. While the clerk is halfway through a slip, nobody else is allowed to read the ledgers and see the half-done state.
4. Once the clerk stamps a slip "done", it is written into a fireproof book, so even if the building burns down tonight, the transfer is still there tomorrow.

Those four habits are **A**tomicity, **C**onsistency, **I**solation and **D**urability. A database gives you all four for a group of statements called a transaction.

📌 **Interview term: transaction** — a group of SQL statements that the database treats as one unit of work. It starts with \`BEGIN\` (or implicitly) and ends with \`COMMIT\` (keep the changes) or \`ROLLBACK\` (throw them away).

📌 **Interview term: ACID** — the four guarantees a transaction gives: Atomicity, Consistency, Isolation, Durability. The acronym is credited to Theo Härder and Andreas Reuter, "Principles of Transaction-Oriented Database Recovery", ACM Computing Surveys, 1983 ([ACID on Wikipedia](https://en.wikipedia.org/wiki/ACID)).

<svg class="iq-diagram" width="100%" viewBox="0 0 800 190" role="img" aria-label="Four boxes: Atomicity means all or nothing, Consistency means rules hold, Isolation means no half-done views, Durability means committed survives a crash">
  <rect class="d-box-accent" x="20" y="40" width="160" height="110" rx="12"/>
  <text class="d-text" x="100" y="82" text-anchor="middle">Atomicity</text>
  <text class="d-sub" x="100" y="110" text-anchor="middle">all or nothing</text>
  <rect class="d-box" x="220" y="40" width="160" height="110" rx="12"/>
  <text class="d-text" x="300" y="82" text-anchor="middle">Consistency</text>
  <text class="d-sub" x="300" y="110" text-anchor="middle">rules always hold</text>
  <rect class="d-box" x="420" y="40" width="160" height="110" rx="12"/>
  <text class="d-text" x="500" y="82" text-anchor="middle">Isolation</text>
  <text class="d-sub" x="500" y="110" text-anchor="middle">no half-done views</text>
  <rect class="d-box-accent" x="620" y="40" width="160" height="110" rx="12"/>
  <text class="d-text" x="700" y="82" text-anchor="middle">Durability</text>
  <text class="d-sub" x="700" y="110" text-anchor="middle">survives a crash</text>
</svg>

## 2. A — Atomicity: All or Nothing

Plain language: either every statement in the transaction takes effect, or none of them does. There is no state in which only the debit happened.

The first example moves 30 from Alice to Bob inside a transaction, looks at the balances, then changes its mind with \`ROLLBACK\`:

~~~sql
BEGIN;
UPDATE accounts SET balance = balance - 30 WHERE id = 1;
UPDATE accounts SET balance = balance + 30 WHERE id = 2;
SELECT owner, balance FROM accounts ORDER BY id;
ROLLBACK;
SELECT owner, balance FROM accounts ORDER BY id;
~~~

~~~text
owner | balance
Alice | 70
Bob | 80
Chen | 300

owner | balance
Alice | 100
Bob | 50
Chen | 300
~~~

The first result set is what the transaction sees of its own work: Alice 70, Bob 80. After \`ROLLBACK\`, both updates are gone and the balances are back to 100 and 50.

The same happens when the failure is not your choice. If the server crashes after the debit, the transaction never committed, so on restart the database undoes it:

<svg class="iq-diagram" width="100%" viewBox="0 0 800 250" role="img" aria-label="A transfer: debit Alice, then a crash before credit Bob. On restart the database undoes the debit, so the state goes back to before the transaction">
  <defs>
    <marker id="sql12q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="30" width="160" height="70" rx="10"/>
  <text class="d-text" x="100" y="60" text-anchor="middle">BEGIN</text>
  <text class="d-sub" x="100" y="84" text-anchor="middle">Alice 100, Bob 50</text>
  <rect class="d-box" x="250" y="30" width="160" height="70" rx="10"/>
  <text class="d-text" x="330" y="60" text-anchor="middle">debit Alice 30</text>
  <text class="d-sub" x="330" y="84" text-anchor="middle">Alice 70</text>
  <rect class="d-box-accent" x="480" y="30" width="160" height="70" rx="10"/>
  <text class="d-text" x="560" y="60" text-anchor="middle">CRASH</text>
  <text class="d-sub" x="560" y="84" text-anchor="middle">credit never ran</text>
  <line class="d-edge" x1="184" y1="65" x2="242" y2="65" marker-end="url(#sql12q1-arrow)"/>
  <line class="d-edge" x1="414" y1="65" x2="472" y2="65" marker-end="url(#sql12q1-arrow)"/>
  <rect class="d-box" x="480" y="160" width="160" height="70" rx="10"/>
  <text class="d-text" x="560" y="190" text-anchor="middle">restart: undo</text>
  <text class="d-sub" x="560" y="214" text-anchor="middle">Alice 100, Bob 50</text>
  <line class="d-edge-accent" x1="560" y1="104" x2="560" y2="152" marker-end="url(#sql12q1-arrow)"/>
</svg>

📌 **Interview term: atomicity** — a transaction's changes are applied entirely or not at all. A rollback, an error the application reacts to, or a crash before commit all leave the database as if the transaction never started.

How the engine can undo things: it keeps the information needed to reverse each change until the commit. PostgreSQL keeps the old row versions in the table (a new version is written for every update and only becomes visible at commit); MySQL InnoDB and Oracle keep an undo log; SQLite in its default mode writes a rollback journal ([SQLite: atomic commit](https://www.sqlite.org/atomiccommit.html)).

📌 **Interview term: rollback journal / undo log** — the record of "how to put things back" that makes rollback possible.

### The trap: atomicity is not automatic on errors in every engine

Here is a transfer where the second statement breaks the \`CHECK (balance >= 0)\` rule (Alice only has 100, and we try to take 130). On **PostgreSQL 16**, run with \`psql\`:

~~~sql
BEGIN;
UPDATE accounts SET balance = balance + 130 WHERE id = 2;
UPDATE accounts SET balance = balance - 130 WHERE id = 1;
COMMIT;
SELECT owner, balance FROM accounts ORDER BY id;
SELECT SUM(balance) AS total_money FROM accounts;
~~~

~~~text
BEGIN
UPDATE 1
ERROR:  new row for relation "accounts" violates check constraint "accounts_balance_check"
DETAIL:  Failing row contains (1, Alice, -30).
ROLLBACK
 owner | balance
-------+---------
 Alice |     100
 Bob   |      50
 Chen  |     300
(3 rows)

 total_money
-------------
         450
(1 row)
~~~

PostgreSQL marks the whole transaction as failed after the error, and the \`COMMIT\` answers \`ROLLBACK\`. Bob's credit is gone too. Total money: 450, as before.

The same script on **SQLite 3.45.0** (each statement run in turn, the error caught):

~~~text
> BEGIN
> UPDATE accounts SET balance = balance + 130 WHERE id = 2
> UPDATE accounts SET balance = balance - 130 WHERE id = 1
  ERROR: CHECK constraint failed: balance >= 0
> COMMIT
> SELECT owner, balance FROM accounts ORDER BY id
owner | balance
Alice | 100
Bob | 180
Chen | 300
> SELECT SUM(balance) AS total_money FROM accounts
total_money
580
~~~

SQLite undid only the **failed statement** and kept the transaction open, so the \`COMMIT\` saved Bob's +130. The bank just created 130 out of nothing. This is documented SQLite behaviour: by default a constraint error aborts the current statement, not the transaction ([SQLite: ON CONFLICT](https://www.sqlite.org/lang_conflict.html)). MySQL InnoDB does the same for errors such as a duplicate key: it rolls back the statement and keeps the transaction open, while a deadlock rolls back the whole transaction ([MySQL: InnoDB error handling](https://dev.mysql.com/doc/en/innodb-error-handling.html); not run here). The rule for application code: **when any statement in a transaction fails, issue \`ROLLBACK\`**. Never commit after an error.

📌 **Interview term: statement-level rollback** — undoing only the statement that failed, leaving the earlier statements of the transaction in place. SQLite and MySQL do this by default; PostgreSQL instead aborts the whole transaction until you \`ROLLBACK\` (or roll back to a savepoint — see [What are COMMIT, ROLLBACK, and SAVEPOINT?](/interview-question/what-are-commit-rollback-and-savepoint)).

## 3. C — Consistency: the Rules Hold Before and After

Plain language: a transaction takes the database from one valid state to another valid state. "Valid" means two kinds of rules:

- **Rules the database knows about** because you declared them: \`PRIMARY KEY\`, \`UNIQUE\`, \`NOT NULL\`, \`CHECK\`, \`FOREIGN KEY\`. The database refuses any change that breaks them (as you saw with the check constraint above).
- **Rules only your application knows**, such as "a transfer never changes the total amount of money" or "every transfer row matches two balance changes". The database cannot know these; it only promises that if each transaction keeps them, atomicity and isolation will not break them.

The second example commits a full transfer and checks both kinds:

~~~sql
BEGIN;
INSERT INTO transfers (id, from_id, to_id, amount) VALUES (1, 1, 2, 30);
UPDATE accounts SET balance = balance - 30 WHERE id = 1;
UPDATE accounts SET balance = balance + 30 WHERE id = 2;
COMMIT;
SELECT owner, balance FROM accounts ORDER BY id;
SELECT (SELECT SUM(balance) FROM accounts) AS total_money,
       (SELECT COUNT(*) FROM transfers)    AS transfers_logged;
~~~

~~~text
owner | balance
Alice | 70
Bob | 80
Chen | 300

total_money | transfers_logged
450 | 1
~~~

Total money is still 450, and the log row exists together with both balance changes. A third party never sees the log row without the balance changes, or the other way round.

The third example asks PostgreSQL which rules it enforces on \`accounts\` on its own:

~~~text
rule | definition
accounts_balance_check | CHECK ((balance >= 0))
accounts_pkey | PRIMARY KEY (id)
~~~

📌 **Interview term: consistency (in ACID)** — every committed transaction leaves the database satisfying all declared constraints, and, if the application wrote it correctly, all business invariants. Note the C is the one property that is partly the application's job; Martin Kleppmann argues in *Designing Data-Intensive Applications* that the C is a property of the application rather than of the database, which relies on A and I to keep it.

📌 **Interview term: invariant** — a statement that must always be true about the data, such as "total money is constant" or "no balance is negative". Declare it as a constraint when you can ([What is a CHECK constraint?](/interview-question/what-is-a-check-constraint)); otherwise your transactions must preserve it.

Do not confuse this with the "C" of the CAP theorem, which is about replicas agreeing with each other. Same word, unrelated meaning.

## 4. I — Isolation: No Half-Done Views

Plain language: while your transaction is running, other sessions should not see its half-finished state, and ideally the final result should look as if transactions ran one after another.

This was run with two \`psql\` sessions against PostgreSQL 16 (default isolation level \`read committed\`):

| Step | Session A (the transfer) | Session B (a report) |
| :--- | :--- | :--- |
| 1 | \`BEGIN;\` | |
| 2 | \`UPDATE accounts SET balance = balance - 30 WHERE id = 1;\` | |
| 3 | \`UPDATE accounts SET balance = balance + 30 WHERE id = 2;\` | |
| 4 | | \`SELECT owner, balance FROM accounts ORDER BY id;\` → Alice 100, Bob 50, Chen 300 (no wait) |
| 5 | \`COMMIT;\` | |
| 6 | | same \`SELECT\` → Alice 70, Bob 80, Chen 300 |

Session B never saw "Alice 70, Bob 50". It saw the old state (without waiting: PostgreSQL readers do not block on writers) and then the new one.

📌 **Interview term: isolation** — concurrent transactions do not interfere with each other. Full isolation is called **serializable**: the result equals some one-at-a-time order of the transactions.

📌 **Interview term: isolation level** — how much interference a database allows in exchange for speed. The SQL standard defines four (READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ, SERIALIZABLE). The I is the property most often weakened by default: PostgreSQL, SQL Server and Oracle default to READ COMMITTED and MySQL InnoDB to REPEATABLE READ ([MySQL manual](https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html)), none of which is fully serializable. SQLite transactions are serializable because it allows only one writer at a time ([SQLite: isolation](https://sqlite.org/isolation.html)). The levels and their anomalies have their own pages: [What are transaction isolation levels?](/interview-question/what-are-transaction-isolation-levels) and [Transaction isolation levels in Postgres — what anomalies does each level prevent?](/interview-question/transaction-isolation-levels-in-postgres-what-anomalies-does-each-level-prevent)

📌 **Interview term: MVCC (multi-version concurrency control)** — the technique PostgreSQL, MySQL InnoDB and Oracle use for isolation: an update writes a new version of the row, and each transaction reads the version that was committed as of its snapshot. That is why B could read without waiting for A.

## 5. D — Durability: Committed Means Saved

Plain language: once \`COMMIT\` returns successfully, the change will survive a process crash, an operating-system crash or a power cut.

How: before reporting success, the database writes a description of the change to a sequential log file and forces it to disk (\`fsync\`). The table files themselves can be updated later; after a crash, the database replays the log.

📌 **Interview term: write-ahead log (WAL)** — the rule "write the log record to durable storage before the data change counts as done". PostgreSQL calls its log the WAL, MySQL InnoDB the redo log, SQL Server the transaction log.

📌 **Interview term: fsync** — the operating-system call that forces written data out of memory caches onto the disk. Without it, "written" data can still be lost on power failure.

The fourth example shows the settings that control this on the PostgreSQL 16 server used for this page:

~~~text
name | setting
fsync | on
full_page_writes | on
synchronous_commit | on
wal_level | replica
~~~

- \`fsync = on\`: PostgreSQL forces WAL to disk. Turning it off can corrupt the database after a crash.
- \`synchronous_commit = on\`: \`COMMIT\` waits until its WAL is flushed. With \`off\`, a crash can lose the last few commits (but never corrupts data); the PostgreSQL docs describe this as a deliberate trade of durability for speed ([PostgreSQL: asynchronous commit](https://www.postgresql.org/docs/16/wal-async-commit.html)).
- \`full_page_writes = on\`: protects against half-written pages after a crash.

Durability has a price, and it is easy to measure. On the machine used for this page, 2,000 single-row \`INSERT\`s as 2,000 separate transactions took about 0.9–1.7 s on PostgreSQL and 2.3–2.9 s on a SQLite file, versus about 0.15–0.2 s and 0.005 s when wrapped in one transaction: each commit waits for a disk flush. Numbers vary by hardware; the ratio is the point. More in [When would you use a transaction explicitly?](/interview-question/when-would-you-use-a-transaction-explicitly)

## 6. Verified: Running the Code

The two SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above); they returned the same rows on PostgreSQL 16.15. The two PostgreSQL examples ran on PostgreSQL 16.15 in a scratch database with the same schema. The error transcripts in section 2 were produced with \`psql\` (PostgreSQL) and with sql.js running each statement separately (SQLite); the isolation timeline in section 4 was run with two concurrent \`psql\` sessions.

Example 1, atomicity with \`ROLLBACK\`:

~~~text
owner | balance
Alice | 70
Bob | 80
Chen | 300

owner | balance
Alice | 100
Bob | 50
Chen | 300
~~~

Example 2, a committed transfer:

~~~text
owner | balance
Alice | 70
Bob | 80
Chen | 300

total_money | transfers_logged
450 | 1
~~~

Example 3, the constraints PostgreSQL enforces:

~~~text
rule | definition
accounts_balance_check | CHECK ((balance >= 0))
accounts_pkey | PRIMARY KEY (id)
~~~

Example 4, the durability settings:

~~~text
name | setting
fsync | on
full_page_writes | on
synchronous_commit | on
wal_level | replica
~~~

## 7. Which Part of the Engine Provides Which Letter

| Property | Plain meaning | Mechanism | Who is responsible |
| :--- | :--- | :--- | :--- |
| Atomicity | All or nothing | Undo log / old row versions / rollback journal | Database (plus the app must \`ROLLBACK\` on error) |
| Consistency | Rules hold after every commit | Constraints, triggers | Shared: database checks declared rules, app keeps business invariants |
| Isolation | No interference between concurrent transactions | Locks and MVCC snapshots, chosen by isolation level | Database, at the level the app picks |
| Durability | Committed data survives crashes | WAL + fsync at commit | Database (and hardware that honours flushes) |

## Edge Cases

- **Single statements are transactions too.** In autocommit mode each statement runs in its own transaction, so a single \`UPDATE\` touching 1,000 rows is all-or-nothing on its own.
- **DDL.** PostgreSQL and SQLite can roll back \`CREATE TABLE\` / \`ALTER TABLE\`; MySQL commits implicitly before most DDL ([MySQL: statements that cause an implicit commit](https://dev.mysql.com/doc/refman/8.0/en/implicit-commit.html)), so a migration there is not atomic.
- **Durability depends on the disk.** A drive or virtual disk that acknowledges a flush it has not done can lose committed data no matter what the database does.
- **Replication.** Durability on one server does not mean the replica has the change; asynchronous replicas can lag, and a failover can lose recent commits unless synchronous replication is configured.
- **NoSQL "ACID".** Many document stores offer ACID only within one document or one partition. Ask what the unit of atomicity is.

## Common Pitfalls

- **Committing after an error.** On SQLite and MySQL the earlier statements are still there; the \`COMMIT\` saves a half-transfer (shown above). Always \`ROLLBACK\` when any statement fails.
- **Saying "consistency means replicas agree".** That is CAP consistency. ACID consistency is "constraints and invariants hold".
- **Assuming the default isolation level is serializable.** It usually is not; read-modify-write code can still lose updates under READ COMMITTED.
- **Turning off \`fsync\` for speed.** It risks corruption, not just lost commits. Use \`synchronous_commit = off\` for workloads that can lose the last few commits, or batch many changes into one transaction.
- **Keeping invariants only in application code.** Another service or a manual \`UPDATE\` bypasses them. Declare what you can as \`CHECK\`, \`UNIQUE\` and foreign keys.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Frame it:</strong> <span style="color:#f0e2c8;">ACID is the set of guarantees a <strong style="color:#ffca28;">transaction</strong> gives: a group of statements the database treats as one unit, ended by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COMMIT</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROLLBACK</code>. I would use a transfer between two accounts as the example.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Atomicity:</strong> <span style="color:#f0e2c8;">All or nothing. If the credit fails or the server crashes after the debit, the debit is undone using the undo log or old row versions. One engine detail: SQLite and MySQL only roll back the failed statement, so the app must issue <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROLLBACK</code>; PostgreSQL aborts the whole transaction.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Consistency:</strong> <span style="color:#f0e2c8;">Every commit leaves the database valid: declared rules like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CHECK (balance &gt;= 0)</code>, foreign keys and unique keys are enforced by the database, while invariants like total money stays constant are the application's job.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Isolation:</strong> <span style="color:#f0e2c8;">Other sessions never see the half-done transfer. How strict is set by the <strong style="color:#ffca28;">isolation level</strong>; most engines default to READ COMMITTED (MySQL InnoDB to REPEATABLE READ), which is weaker than serializable, so lost updates are still possible.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Durability:</strong> <span style="color:#f0e2c8;">When <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COMMIT</code> returns, the change is in the <strong style="color:#ffca28;">write-ahead log</strong> flushed to disk with fsync, so it survives a crash. That flush is why 2,000 separate commits are many times slower than one transaction.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which ACID property is the database not fully responsible for?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Consistency. The database enforces the constraints you declared, but a business rule it does not know about, such as total money stays constant, is only kept if each transaction is written correctly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If a statement inside my transaction fails, is the transaction rolled back automatically?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Depends on the engine. PostgreSQL marks the transaction aborted and turns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COMMIT</code> into a rollback. SQLite and MySQL undo only the failed statement and keep the transaction open, so a later <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COMMIT</code> saves the earlier statements. Always <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROLLBACK</code> on error.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How can a database be durable and still fast?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It writes changes sequentially to the WAL and only flushes that log at commit; table pages are written later. Group commit flushes several transactions at once, and you can relax it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">synchronous_commit = off</code> if losing the last few commits after a crash is acceptable.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a single UPDATE without BEGIN atomic?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. In autocommit mode every statement runs in its own implicit transaction, so an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UPDATE</code> touching 1,000 rows changes all of them or none. You need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BEGIN</code> when several statements must succeed together.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between ACID consistency and CAP consistency?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">ACID consistency means constraints and invariants hold after each transaction. CAP consistency (linearizability) means every replica returns the latest write. They are unrelated properties that happen to share a word.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Transaction | A group of statements treated as one unit, ended by \`COMMIT\` or \`ROLLBACK\` |
| ACID | Atomicity, Consistency, Isolation, Durability |
| Atomicity | All of a transaction happens or none of it does |
| Rollback journal / undo log | The record the engine keeps to reverse uncommitted changes |
| Statement-level rollback | Undoing only the failed statement while the transaction stays open |
| Consistency (ACID) | Every commit leaves all declared constraints and business invariants true |
| Invariant | A fact about the data that must always hold |
| Isolation | Concurrent transactions do not see or break each other |
| Isolation level | How much interference is allowed: READ UNCOMMITTED to SERIALIZABLE |
| MVCC | Keeping several row versions so readers see a snapshot without blocking writers |
| Durability | A committed change survives crashes and power loss |
| Write-ahead log (WAL) | The log written and flushed before a commit is acknowledged |
| fsync | The OS call that forces data from caches onto disk |

**Conclusion:** ACID is the contract a transaction gives you. Atomicity means a transfer can never be half-applied — but remember that on SQLite and MySQL you must still \`ROLLBACK\` after an error yourself. Consistency means the declared rules hold after every commit, while business invariants stay your code's job. Isolation keeps concurrent work from seeing half-done states, and it is the letter engines weaken by default for speed. Durability means a returned \`COMMIT\` survived to the write-ahead log on disk, which is also why many small commits are slow and one big transaction is fast.`,
    examples: [
      {
        label: `Atomicity: a transfer inside BEGIN, then ROLLBACK undoes both updates`,
        code: `BEGIN;
UPDATE accounts SET balance = balance - 30 WHERE id = 1;
UPDATE accounts SET balance = balance + 30 WHERE id = 2;
SELECT owner, balance FROM accounts ORDER BY id;
ROLLBACK;
SELECT owner, balance FROM accounts ORDER BY id;`,
      },
      {
        label: `Consistency: a committed transfer keeps the total and logs the transfer`,
        code: `BEGIN;
INSERT INTO transfers (id, from_id, to_id, amount) VALUES (1, 1, 2, 30);
UPDATE accounts SET balance = balance - 30 WHERE id = 1;
UPDATE accounts SET balance = balance + 30 WHERE id = 2;
COMMIT;
SELECT owner, balance FROM accounts ORDER BY id;
SELECT (SELECT SUM(balance) FROM accounts) AS total_money,
       (SELECT COUNT(*) FROM transfers)    AS transfers_logged;`,
      },
      {
        label: `PostgreSQL: the rules the database itself enforces on accounts`,
        code: `SELECT conname AS rule, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'accounts'::regclass
ORDER BY conname;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: the settings that make COMMIT durable on this server`,
        code: `SELECT name, setting
FROM pg_settings
WHERE name IN ('fsync', 'synchronous_commit', 'wal_level', 'full_page_writes')
ORDER BY name;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `When would you use a transaction explicitly?`,
    difficulty: "easy",
    seoDescription: `When to use BEGIN and COMMIT yourself: multi-statement changes, rollback on failed rules, fast bulk loads, migrations, and when to avoid long transactions.`,
    description: `**Question presented to candidate:**
"Most of the time our code just runs SQL statements one by one and it works. When would you actually reach for \`BEGIN\` and \`COMMIT\` yourself? Give me real cases from an app like an online shop, and tell me when you would avoid a transaction."

**What a strong answer should cover:**
- By default each statement runs in its own transaction (autocommit), so a single statement is already atomic; an explicit transaction is for several statements that must succeed or fail together (order + items + stock)
- Business-rule failures: check the row count of a conditional update and \`ROLLBACK\` when the rule fails, so no half-written order remains
- Performance: many small writes in one transaction avoid one disk flush per commit, so bulk loads are much faster
- Schema migrations: PostgreSQL and SQLite can roll back DDL; MySQL commits implicitly before most DDL
- Read-then-write and consistent reports: a transaction alone at READ COMMITTED does not stop lost updates; pair it with an atomic \`UPDATE\`, \`SELECT ... FOR UPDATE\` or a stronger isolation level
- When not to: never hold a transaction open across user think time or slow network calls; keep transactions short

**Clarifying questions expected:**
- Which database and driver? (Some drivers open a transaction implicitly; others autocommit.)
- Can the operation be expressed as one statement, or does it span several tables?

**Code / implementation expected:** Yes — an order placed as one transaction, and a rollback when a stock check fails.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE products (
  id    INTEGER PRIMARY KEY,
  name  TEXT    NOT NULL,
  stock INTEGER NOT NULL CHECK (stock >= 0)
);

CREATE TABLE orders (
  id         INTEGER PRIMARY KEY,
  customer   TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE order_items (
  order_id   INTEGER NOT NULL REFERENCES orders (id),
  product_id INTEGER NOT NULL REFERENCES products (id),
  qty        INTEGER NOT NULL CHECK (qty > 0),
  PRIMARY KEY (order_id, product_id)
);

INSERT INTO products (id, name, stock) VALUES
  (1, 'Keyboard',  5),
  (2, 'Mouse',    12),
  (3, 'Monitor',   1);

INSERT INTO orders (id, customer, created_at) VALUES
  (100, 'Alice', '2026-10-16');

INSERT INTO order_items (order_id, product_id, qty) VALUES
  (100, 2, 1);
\`\`\``,
    answer: `**Target Audience:** Beginners who know \`INSERT\` and \`UPDATE\` and want to know when wrapping them in \`BEGIN ... COMMIT\` matters, and candidates who want concrete scenarios rather than a definition.
**Difficulty:** Easy
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15, both run for this page. Notes on MySQL and drivers are cited.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and error message shown was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

You are packing a parcel for a customer: write the label, put two keyboards and a mouse in the box, and tick them off the stock sheet. If the phone rings after you wrote the label but before you ticked off the stock, nobody is hurt: you are one person and you will finish the job.

A web shop is not one person. The "phone ringing" is a crashed server, a timeout, or a stock check that fails halfway through. If each step was saved on its own, you are left with an order that has a label but no items, or stock that went down for an order that does not exist. An explicit transaction is the box you put all the steps in, so they are saved together or not at all.

This page is about *when* you need that box. What the four guarantees are is covered in [What are ACID properties?](/interview-question/what-are-acid-properties), and the commands themselves in [What are COMMIT, ROLLBACK, and SAVEPOINT?](/interview-question/what-are-commit-rollback-and-savepoint)

## 2. What Happens When You Do Nothing: Autocommit

📌 **Interview term: autocommit** — the default mode of PostgreSQL, SQLite, MySQL and SQL Server: every statement that is not inside an explicit transaction runs in its own transaction and is committed as soon as it finishes.

📌 **Interview term: implicit transaction** — the one-statement transaction autocommit creates for you. It is fully atomic: an \`UPDATE\` that touches 1,000 rows changes all of them or none.

📌 **Interview term: explicit transaction** — one you open yourself with \`BEGIN\` (or \`START TRANSACTION\`) and close with \`COMMIT\` or \`ROLLBACK\`. Everything in between is one unit.

<svg class="iq-diagram" width="100%" viewBox="0 0 800 260" role="img" aria-label="Autocommit wraps each statement in its own transaction. An explicit transaction wraps several statements so they commit together">
  <text class="d-sub" x="20" y="34">autocommit (default)</text>
  <rect class="d-box-muted" x="20" y="50" width="220" height="60" rx="10"/>
  <text class="d-text" x="130" y="86" text-anchor="middle">INSERT orders</text>
  <rect class="d-box-muted" x="290" y="50" width="220" height="60" rx="10"/>
  <text class="d-text" x="400" y="86" text-anchor="middle">INSERT order_items</text>
  <rect class="d-box-muted" x="560" y="50" width="220" height="60" rx="10"/>
  <text class="d-text" x="670" y="86" text-anchor="middle">UPDATE products</text>
  <text class="d-sub" x="20" y="164">explicit BEGIN ... COMMIT</text>
  <rect class="d-box-accent" x="20" y="180" width="760" height="60" rx="10"/>
  <text class="d-text" x="130" y="216" text-anchor="middle">INSERT orders</text>
  <text class="d-text" x="400" y="216" text-anchor="middle">INSERT order_items</text>
  <text class="d-text" x="670" y="216" text-anchor="middle">UPDATE products</text>
</svg>

In the top row, each statement commits on its own, so a failure after the first one leaves an order with no items. In the bottom row, the three statements commit together.

Watch out for drivers: the Python DB-API standard says that if a database supports autocommit, it "must be initially off" for a new connection, so Python drivers start a transaction for you and nothing is saved until you call \`commit()\` ([PEP 249](https://peps.python.org/pep-0249/)). JDBC, by contrast, starts new connections in autocommit mode ([java.sql.Connection](https://docs.oracle.com/javase/8/docs/api/java/sql/Connection.html#setAutoCommit-boolean-)). Know which one your stack uses.

## 3. Use Case 1: Several Writes That Belong Together

The classic case: one business action changes several rows or tables. Placing an order writes the order, its items, and decrements stock:

~~~sql
BEGIN;
INSERT INTO orders (id, customer, created_at) VALUES (101, 'Bob', '2026-10-17');
INSERT INTO order_items (order_id, product_id, qty) VALUES (101, 1, 2), (101, 2, 1);
UPDATE products SET stock = stock - 2 WHERE id = 1 AND stock >= 2;
UPDATE products SET stock = stock - 1 WHERE id = 2 AND stock >= 1;
COMMIT;
SELECT id, name, stock FROM products ORDER BY id;
SELECT o.id, o.customer, p.name, i.qty
FROM orders AS o
JOIN order_items AS i ON i.order_id = o.id
JOIN products AS p ON p.id = i.product_id
ORDER BY o.id, p.name;
~~~

~~~text
id | name | stock
1 | Keyboard | 3
2 | Mouse | 11
3 | Monitor | 1

id | customer | name | qty
100 | Alice | Mouse | 1
101 | Bob | Keyboard | 2
101 | Bob | Mouse | 1
~~~

Keyboard stock went from 5 to 3 and Mouse from 12 to 11 in the same commit that created order 101. Other sessions see either none of it or all of it.

Other everyday examples of the same shape: a money transfer (debit plus credit), signing up a user (user row plus profile row plus an audit row), moving a row from \`cart\` to \`orders\` (insert plus delete), and writing a row plus an "outbox" event row that another process will publish.

## 4. Use Case 2: A Business Rule Can Fail Halfway

The stock decrement above has a guard, \`AND stock >= 2\`. If the guard fails, the \`UPDATE\` changes **zero rows** and raises no error. That is your signal to roll back. Chen tries to buy two monitors, but only one is in stock:

~~~sql
BEGIN;
INSERT INTO orders (id, customer, created_at) VALUES (102, 'Chen', '2026-10-17');
INSERT INTO order_items (order_id, product_id, qty) VALUES (102, 3, 2);
UPDATE products SET stock = stock - 2 WHERE id = 3 AND stock >= 2;
SELECT changes() AS rows_updated;
ROLLBACK;
SELECT (SELECT COUNT(*) FROM orders WHERE id = 102)           AS order_102_rows,
       (SELECT COUNT(*) FROM order_items WHERE order_id = 102) AS item_rows,
       (SELECT stock FROM products WHERE id = 3)               AS monitor_stock;
~~~

~~~text
rows_updated
0

order_102_rows | item_rows | monitor_stock
0 | 0 | 1
~~~

\`changes()\` is SQLite's "rows affected by the last statement". It returned 0, so the application issued \`ROLLBACK\`, and order 102 and its item row are gone as if they never existed. Monitor stock is still 1.

📌 **Interview term: rows affected (row count)** — how many rows the last \`INSERT\`/\`UPDATE\`/\`DELETE\` changed. In PostgreSQL it is the number in the command tag (\`UPDATE 0\`), exposed by every driver (for example \`cursor.rowcount\`); SQLite exposes it as \`changes()\`. Checking it is how a conditional update tells you that a rule failed.

The same applies to real errors: if any statement raises an error, the application must send \`ROLLBACK\`. On SQLite and MySQL a failed statement does not end the transaction, so a careless \`COMMIT\` would save the statements before it (demonstrated in [What are ACID properties?](/interview-question/what-are-acid-properties)).

## 5. Use Case 3: Bulk Writes Are Much Faster in One Transaction

Every commit waits for the write-ahead log to be flushed to disk (that is durability). 2,000 separate inserts means 2,000 flushes; one transaction means one. Measured on the machine used for this page, inserting 2,000 rows one statement at a time:

| Engine | 2,000 autocommit inserts | Same inserts inside one \`BEGIN ... COMMIT\` |
| :--- | :--- | :--- |
| SQLite 3.45.1 file database (Python \`sqlite3\`, journal mode DELETE, synchronous FULL) | 2.3–2.9 s | 0.004–0.006 s |
| PostgreSQL 16.15 via \`psql -f\` (fsync on, synchronous_commit on) | 0.9–1.7 s | 0.15–0.20 s |

The absolute numbers depend on the disk; the gap is what matters. For loads of thousands to millions of rows, commit in batches (for example every 10,000 rows) so one failure does not throw away the whole load and the transaction does not grow without bound. PostgreSQL \`COPY\` is faster still.

## 6. Use Case 4: Schema Migrations

A migration often does several things: create a table, add a column, backfill data. If step 3 fails, you want steps 1 and 2 gone as well. PostgreSQL supports this:

~~~sql
BEGIN;
CREATE TABLE coupons (code TEXT PRIMARY KEY, percent_off INTEGER);
ALTER TABLE products ADD COLUMN sku TEXT;
ROLLBACK;
SELECT to_regclass('coupons') IS NULL AS coupons_table_gone,
       (SELECT COUNT(*) FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'sku') AS sku_columns;
~~~

~~~text
coupons_table_gone | sku_columns
t | 0
~~~

\`t\` means true: the new table does not exist and the new column is not there.

📌 **Interview term: transactional DDL** — schema changes (\`CREATE\`, \`ALTER\`, \`DROP\`) that obey \`ROLLBACK\` like data changes. PostgreSQL has it; SQLite too (a \`CREATE TABLE\` followed by \`ROLLBACK\` left nothing behind in \`sqlite_master\` when run for this page). MySQL does **not**: most DDL statements implicitly commit the current transaction before they run ([MySQL: statements that cause an implicit commit](https://dev.mysql.com/doc/refman/8.0/en/implicit-commit.html)), so a failed MySQL migration can stop halfway.

## 7. Use Case 5: Read-Then-Write and Consistent Reports

Two more reasons to open a transaction, each with a catch.

**Read, decide, then write.** "Read the stock, if it is at least 1, write stock minus 1." Wrapping that in \`BEGIN ... COMMIT\` is **not enough** under the default READ COMMITTED. Run with two \`psql\` sessions on PostgreSQL 16:

| Step | Session A | Session B |
| :--- | :--- | :--- |
| 1 | \`BEGIN;\` \`SELECT stock ...\` → 5 | |
| 2 | | \`BEGIN;\` \`SELECT stock ...\` → 5 |
| 3 | \`UPDATE products SET stock = 4 ...\` | |
| 4 | | \`UPDATE products SET stock = 4 ...\` (waits for A) |
| 5 | \`COMMIT;\` | the update now runs |
| 6 | | \`COMMIT;\` → final stock **4**, not 3 |

📌 **Interview term: lost update** — two transactions read the same value, both compute a new one from it, and the second write overwrites the first. A transaction does not prevent it at READ COMMITTED.

Fixes: let the database do the arithmetic in one statement (\`SET stock = stock - 1 WHERE stock >= 1\`, which the same two-session test resolved correctly to 3), lock the row while you decide with \`SELECT ... FOR UPDATE\` (see [FOR UPDATE vs FOR UPDATE NOWAIT vs FOR UPDATE SKIP LOCKED — which to use when?](/interview-question/for-update-vs-for-update-nowait-vs-for-update-skip-locked-which-to-use-when)), or use REPEATABLE READ / SERIALIZABLE and retry on serialization errors.

**A report made of several queries.** Under READ COMMITTED each statement sees the latest committed data, so a "total stock" query and a "stock by product" query run a second apart can disagree. \`BEGIN ISOLATION LEVEL REPEATABLE READ\` (PostgreSQL, MySQL InnoDB) gives every query in the transaction the same snapshot. The anomalies and levels are explained in [What are transaction isolation levels?](/interview-question/what-are-transaction-isolation-levels)

## 8. When Not to Use a (Long) Transaction

- **Never wait for a human inside a transaction.** "BEGIN, show the form, wait for the user to click Save, COMMIT" holds locks for minutes and blocks other writers.
- **Avoid slow network calls inside it.** Calling a payment API or sending an email while the transaction holds row locks makes every other request for those rows wait. Commit first, then call out (or use an outbox table).
- **Do not wrap a single statement just out of habit.** It is already atomic in autocommit mode.
- **Watch "idle in transaction".** In PostgreSQL a session that ran \`BEGIN\` and stopped sending statements keeps its locks and stops \`VACUUM\` from cleaning up old row versions. \`idle_in_transaction_session_timeout\` (0 = disabled, as on this server) kills such sessions; PostgreSQL 17 adds \`transaction_timeout\` for the whole transaction ([postgresqlco.nf: transaction_timeout](https://postgresqlco.nf/doc/en/param/transaction_timeout/)); it does not exist on PostgreSQL 16 (\`unrecognized configuration parameter "transaction_timeout"\` when tried here).
- **Do not nest \`BEGIN\`.** A second \`BEGIN\` is an error in SQLite (\`cannot start a transaction within a transaction\`) and only a warning in PostgreSQL (\`there is already a transaction in progress\`); both were run here. Use savepoints for nested units of work.

## 9. Verified: Running the Code

The two SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above). The first returned the same rows on PostgreSQL 16.15; the second uses SQLite's \`changes()\`, which PostgreSQL does not have (\`function changes() does not exist\`); there you read the row count from the driver. The PostgreSQL example ran on PostgreSQL 16.15 in a scratch database with the same schema. The lost-update timeline was run with two concurrent \`psql\` sessions, and the timings in section 5 were measured with Python \`sqlite3\` and \`psql\` on the same machine.

Example 1, the order as one transaction:

~~~text
id | name | stock
1 | Keyboard | 3
2 | Mouse | 11
3 | Monitor | 1

id | customer | name | qty
100 | Alice | Mouse | 1
101 | Bob | Keyboard | 2
101 | Bob | Mouse | 1
~~~

Example 2, the failed stock check rolled back:

~~~text
rows_updated
0

order_102_rows | item_rows | monitor_stock
0 | 0 | 1
~~~

Example 3, transactional DDL on PostgreSQL:

~~~text
coupons_table_gone | sku_columns
t | 0
~~~

## 10. Decision Table

| Situation | Explicit transaction? | Why |
| :--- | :--- | :--- |
| One \`UPDATE\`/\`INSERT\`/\`DELETE\` | No | Autocommit already makes it atomic |
| Several writes for one business action | Yes | All or nothing |
| A rule checked by a conditional update | Yes, roll back on 0 rows | No half-written order |
| Bulk insert of thousands of rows | Yes, in batches | One disk flush per batch instead of per row |
| Schema migration | Yes on PostgreSQL / SQLite | Transactional DDL; MySQL commits DDL implicitly |
| Read, decide, write | Yes, plus \`FOR UPDATE\` or an atomic update or a stronger level | A plain transaction still loses updates |
| Multi-query report that must agree | Yes, REPEATABLE READ | One snapshot for all queries |
| Waiting for user input or a slow API | No | Long-held locks block everyone else |

## Common Pitfalls

- **Thinking \`BEGIN ... COMMIT\` makes read-then-write safe.** At READ COMMITTED two sessions can still both read 5 and both write 4.
- **Ignoring the row count.** A guarded \`UPDATE\` that matched zero rows is not an error; if you do not check it, you commit an order without the stock change.
- **Committing after an error.** SQLite and MySQL keep the earlier statements; always \`ROLLBACK\` on failure.
- **Holding a transaction open across an HTTP call or user think time.** Locks pile up and \`VACUUM\` falls behind.
- **Not knowing your driver's default.** Python DB-API drivers open transactions implicitly, so forgetting \`commit()\` silently loses writes; JDBC autocommits each statement unless you turn that off.
- **Running MySQL migrations as if DDL could roll back.** It commits implicitly; plan reversible steps instead.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Default first:</strong> <span style="color:#f0e2c8;">By default every statement runs in <strong style="color:#ffca28;">autocommit</strong> mode, so a single <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UPDATE</code> is already atomic. I open an explicit transaction when several statements must succeed or fail together.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The core case:</strong> <span style="color:#f0e2c8;">Placing an order writes the order row, the item rows and decrements stock. Wrapped in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BEGIN ... COMMIT</code>, other sessions see all of it or none of it, and a crash halfway leaves nothing behind.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Rules and errors:</strong> <span style="color:#f0e2c8;">A guarded <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UPDATE ... WHERE stock &gt;= 2</code> that affects 0 rows is my signal to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROLLBACK</code>. On any error I roll back too, because SQLite and MySQL keep earlier statements if you commit.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Speed and migrations:</strong> <span style="color:#f0e2c8;">Bulk inserts in one transaction need one disk flush instead of one per row, which was several times to hundreds of times faster in my tests. PostgreSQL can also roll back DDL, so migrations run in a transaction; MySQL commits DDL implicitly.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Limits:</strong> <span style="color:#f0e2c8;">A transaction alone does not prevent <strong style="color:#ffca28;">lost updates</strong> at READ COMMITTED, so read-then-write needs an atomic update, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FOR UPDATE</code>, or a stronger level. And I keep transactions short: no user think time or slow API calls inside.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a single UPDATE statement atomic without BEGIN?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. Autocommit wraps it in an implicit transaction, so all matching rows change or none do. You need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BEGIN</code> only to group several statements.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why are inserts so much faster inside one transaction?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each commit waits for the write-ahead log to be flushed to disk. With autocommit that is one flush per row; in one transaction it is one flush in total. Batch very large loads so one failure does not lose everything.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">I wrapped read stock then write stock minus 1 in a transaction. Is that safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not at READ COMMITTED: two sessions can both read 5 and both write 4. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UPDATE ... SET stock = stock - 1 WHERE stock &gt;= 1</code>, lock with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT ... FOR UPDATE</code>, or use SERIALIZABLE and retry.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can I call a payment API inside the transaction?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Better not: the transaction keeps its row locks while the API is slow, blocking other requests. Commit the order as pending, call the API, then update the status, or write an outbox row that a worker processes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a migration be rolled back if it fails halfway?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On PostgreSQL and SQLite, yes, if it runs inside one transaction, because DDL is transactional. On MySQL most DDL implicitly commits, so a failed migration can be left half-applied.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Autocommit | Default mode: each statement is committed on its own |
| Implicit transaction | The one-statement transaction autocommit creates |
| Explicit transaction | One opened with \`BEGIN\` and closed with \`COMMIT\` or \`ROLLBACK\` |
| Rows affected (row count) | How many rows the last write changed; 0 means a guard failed |
| Transactional DDL | Schema changes that roll back like data changes |
| Lost update | Two read-modify-write transactions where the second overwrites the first |

**Conclusion:** You rarely need \`BEGIN\` for one statement, because autocommit already makes it atomic. Reach for an explicit transaction when one business action spans several statements, when a rule checked halfway may force you to undo, when you load many rows (one flush instead of thousands), and when you run migrations on an engine with transactional DDL. Remember what a transaction does not do on its own: it does not stop lost updates at READ COMMITTED, and it should never stay open while you wait for a person or a slow service.`,
    examples: [
      {
        label: `Place an order as one unit: order row, item rows and stock decrements commit together`,
        code: `BEGIN;
INSERT INTO orders (id, customer, created_at) VALUES (101, 'Bob', '2026-10-17');
INSERT INTO order_items (order_id, product_id, qty) VALUES (101, 1, 2), (101, 2, 1);
UPDATE products SET stock = stock - 2 WHERE id = 1 AND stock >= 2;
UPDATE products SET stock = stock - 1 WHERE id = 2 AND stock >= 1;
COMMIT;
SELECT id, name, stock FROM products ORDER BY id;
SELECT o.id, o.customer, p.name, i.qty
FROM orders AS o
JOIN order_items AS i ON i.order_id = o.id
JOIN products AS p ON p.id = i.product_id
ORDER BY o.id, p.name;`,
      },
      {
        label: `A stock check fails inside the transaction, so the app rolls everything back`,
        code: `BEGIN;
INSERT INTO orders (id, customer, created_at) VALUES (102, 'Chen', '2026-10-17');
INSERT INTO order_items (order_id, product_id, qty) VALUES (102, 3, 2);
UPDATE products SET stock = stock - 2 WHERE id = 3 AND stock >= 2;
SELECT changes() AS rows_updated;
ROLLBACK;
SELECT (SELECT COUNT(*) FROM orders WHERE id = 102)           AS order_102_rows,
       (SELECT COUNT(*) FROM order_items WHERE order_id = 102) AS item_rows,
       (SELECT stock FROM products WHERE id = 3)               AS monitor_stock;`,
      },
      {
        label: `PostgreSQL: a migration inside a transaction rolls back completely (transactional DDL)`,
        code: `BEGIN;
CREATE TABLE coupons (code TEXT PRIMARY KEY, percent_off INTEGER);
ALTER TABLE products ADD COLUMN sku TEXT;
ROLLBACK;
SELECT to_regclass('coupons') IS NULL AS coupons_table_gone,
       (SELECT COUNT(*) FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'sku') AS sku_columns;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `What are COMMIT, ROLLBACK, and SAVEPOINT?`,
    difficulty: "medium",
    seoDescription: `COMMIT, ROLLBACK and SAVEPOINT explained with runnable SQL: partial rollback, nesting, recovering from errors in PostgreSQL, and SQLite differences.`,
    description: `**Question presented to candidate:**
"Walk me through COMMIT, ROLLBACK and SAVEPOINT. What exactly does each one do, and when would you use a savepoint instead of rolling back the whole transaction — for example, importing a batch of customers where a few rows are duplicates?"

**What a strong answer should cover:**
- \`COMMIT\` makes every change of the transaction permanent and visible to others; \`ROLLBACK\` discards all of them and ends the transaction
- \`SAVEPOINT name\` marks a point inside a transaction; \`ROLLBACK TO SAVEPOINT name\` undoes only the work after it and keeps the transaction (and the savepoint) alive; \`RELEASE SAVEPOINT name\` forgets the mark but keeps the work
- Nothing is permanent until the outer \`COMMIT\`: rolling back the outer transaction also discards released savepoints
- PostgreSQL aborts the whole transaction after any error ("current transaction is aborted"); a savepoint before the risky statement is how you recover and continue; PL/pgSQL \`EXCEPTION\` blocks and many ORMs' "nested transactions" are savepoints under the hood
- Engine differences: SQLite allows \`SAVEPOINT\` outside \`BEGIN\` (it starts a transaction), PostgreSQL rejects it; \`COMMIT\` with no open transaction is an error in SQLite and a warning in PostgreSQL

**Code / implementation expected:** Yes — a transaction with a savepoint that rolls back one step and commits the rest.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE customers (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

INSERT INTO customers (id, name, email) VALUES
  (1, 'Alice', 'alice@example.com'),
  (2, 'Bob',   'bob@example.com'),
  (3, 'Chen',  'chen@example.com');
\`\`\``,
    answer: `**Target Audience:** Beginners who have seen \`BEGIN\` and \`COMMIT\` and want to know exactly what each command does, and candidates preparing for the savepoint and error-recovery follow-ups.
**Difficulty:** Medium
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15, both run for this page. \`SAVEPOINT\`, \`ROLLBACK TO SAVEPOINT\` and \`RELEASE SAVEPOINT\` are standard SQL and also exist in MySQL InnoDB; SQL Server spells it \`SAVE TRANSACTION\` / \`ROLLBACK TRANSACTION name\`.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and error message shown was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

You are writing a long essay in a word processor. Three tools save you:

- **Save** writes the document to disk. Everyone who opens the file now sees your changes. That is \`COMMIT\`.
- **Close without saving** throws away everything since the last save. That is \`ROLLBACK\`.
- Before trying a risky rewrite of chapter 3, you make a **checkpoint**. The rewrite turns out badly, so you go back to the checkpoint: chapters 1 and 2 are still there, only the bad rewrite is gone, and you keep writing. That is \`SAVEPOINT\` and \`ROLLBACK TO SAVEPOINT\`.

The checkpoint is not a save. If you then close without saving, chapters 1 and 2 are lost too.

Why transactions exist at all is covered in [What are ACID properties?](/interview-question/what-are-acid-properties) and [When would you use a transaction explicitly?](/interview-question/when-would-you-use-a-transaction-explicitly); this page is about the commands.

## 2. COMMIT and ROLLBACK

📌 **Interview term: COMMIT** — ends the current transaction and makes all its changes permanent (durable) and visible to other sessions. \`END\` is a PostgreSQL and SQLite synonym; \`COMMIT WORK\` is the standard long form.

📌 **Interview term: ROLLBACK** — ends the current transaction and discards every change it made, as if it never ran. \`ABORT\` is a PostgreSQL synonym.

~~~sql
BEGIN;
INSERT INTO customers (id, name, email) VALUES (4, 'Dara', 'dara@example.com');
COMMIT;
BEGIN;
INSERT INTO customers (id, name, email) VALUES (5, 'Eve', 'eve@example.com');
ROLLBACK;
SELECT id, name FROM customers ORDER BY id;
~~~

~~~text
id | name
1 | Alice
2 | Bob
3 | Chen
4 | Dara
~~~

Dara was committed and is there; Eve was rolled back and is not.

What happens when there is no transaction to end (both run for this page):

| Statement with no open transaction | SQLite 3.45.0 | PostgreSQL 16 |
| :--- | :--- | :--- |
| \`COMMIT\` | error: \`cannot commit - no transaction is active\` | \`WARNING:  there is no transaction in progress\` |
| \`ROLLBACK\` | error: \`cannot rollback - no transaction is active\` | \`WARNING:  there is no transaction in progress\` |
| \`BEGIN\` inside a transaction | error: \`cannot start a transaction within a transaction\` | \`WARNING:  there is already a transaction in progress\` |

## 3. SAVEPOINT, ROLLBACK TO and RELEASE

📌 **Interview term: SAVEPOINT** — \`SAVEPOINT name\` marks a point inside the current transaction that you can return to later. It does not save anything to disk.

📌 **Interview term: ROLLBACK TO SAVEPOINT** — undoes every change made after the named savepoint. The transaction stays open, the work before the savepoint stays, and the savepoint itself **still exists**, so you can roll back to it again.

📌 **Interview term: RELEASE SAVEPOINT** — forgets the savepoint (and any savepoints created after it) but keeps all the work. It does not commit anything on its own inside a \`BEGIN\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 900 260" role="img" aria-label="Timeline: BEGIN, insert Dara, SAVEPOINT before_eve, insert Eve, ROLLBACK TO before_eve removes Eve only, insert Farid, COMMIT keeps Dara and Farid">
  <defs>
    <marker id="sql12q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <line class="d-edge" x1="20" y1="90" x2="885" y2="90"/>
  <rect class="d-box-muted" x="20" y="60" width="100" height="60" rx="8"/>
  <text class="d-text" x="70" y="95" text-anchor="middle">BEGIN</text>
  <rect class="d-box" x="165" y="60" width="110" height="60" rx="8"/>
  <text class="d-text" x="220" y="95" text-anchor="middle">+ Dara</text>
  <rect class="d-box-accent" x="320" y="60" width="130" height="60" rx="8"/>
  <text class="d-text" x="385" y="88" text-anchor="middle">SAVEPOINT</text>
  <text class="d-sub" x="385" y="108" text-anchor="middle">before_eve</text>
  <rect class="d-box" x="495" y="60" width="100" height="60" rx="8"/>
  <text class="d-text" x="545" y="95" text-anchor="middle">+ Eve</text>
  <rect class="d-box" x="640" y="60" width="100" height="60" rx="8"/>
  <text class="d-text" x="690" y="95" text-anchor="middle">+ Farid</text>
  <rect class="d-box-muted" x="785" y="60" width="100" height="60" rx="8"/>
  <text class="d-text" x="835" y="95" text-anchor="middle">COMMIT</text>
  <path class="d-edge-accent" d="M545,124 C545,200 385,200 385,128" fill="none" marker-end="url(#sql12q3-arrow)"/>
  <text class="d-accent" x="575" y="205">ROLLBACK TO before_eve</text>
</svg>

The import story as SQL: insert Dara, mark a savepoint, insert Eve, decide Eve was wrong, go back, then insert Farid and commit:

~~~sql
BEGIN;
INSERT INTO customers (id, name, email) VALUES (4, 'Dara', 'dara@example.com');
SAVEPOINT before_eve;
INSERT INTO customers (id, name, email) VALUES (5, 'Eve', 'eve@example.com');
ROLLBACK TO SAVEPOINT before_eve;
RELEASE SAVEPOINT before_eve;
INSERT INTO customers (id, name, email) VALUES (6, 'Farid', 'farid@example.com');
COMMIT;
SELECT id, name FROM customers ORDER BY id;
~~~

~~~text
id | name
1 | Alice
2 | Bob
3 | Chen
4 | Dara
6 | Farid
~~~

Dara and Farid were committed, Eve was undone. The \`RELEASE\` after the rollback is tidy-up: it removes the mark, which matters if a loop creates many savepoints.

📌 **Interview term: subtransaction** — the name PostgreSQL uses internally for the work after a savepoint. Each savepoint starts one; \`ROLLBACK TO\` aborts it; \`RELEASE\` merges it into the parent.

## 4. Nesting and Names

Savepoints nest like a stack. Rolling back to an outer savepoint also destroys the inner ones and their work. The third example (SQLite) also shows a SQLite-only feature: a \`SAVEPOINT\` with no \`BEGIN\` starts a transaction, and \`RELEASE\` of that outermost savepoint commits it:

~~~sql
SAVEPOINT batch;
INSERT INTO customers (id, name, email) VALUES (4, 'Dara', 'dara@example.com');
SAVEPOINT a;
INSERT INTO customers (id, name, email) VALUES (5, 'Eve', 'eve@example.com');
SAVEPOINT b;
INSERT INTO customers (id, name, email) VALUES (6, 'Farid', 'farid@example.com');
ROLLBACK TO a;
INSERT INTO customers (id, name, email) VALUES (7, 'Gita', 'gita@example.com');
RELEASE batch;
SELECT id, name FROM customers ORDER BY id;
~~~

~~~text
id | name
1 | Alice
2 | Bob
3 | Chen
4 | Dara
7 | Gita
~~~

\`ROLLBACK TO a\` removed both Eve (after \`a\`) and Farid (after \`b\`, which was inside \`a\`), and \`b\` no longer exists. Dara (before \`a\`) and Gita (after the rollback) remain. A \`COMMIT\` after \`RELEASE batch\` fails with \`cannot commit - no transaction is active\`, which proves the release committed (run for this page).

The **same script on PostgreSQL** behaves completely differently, because PostgreSQL only allows savepoints inside a transaction block. Each savepoint command fails with \`ERROR:  SAVEPOINT can only be used in transaction blocks\` (and \`ROLLBACK TO SAVEPOINT can only be used in transaction blocks\`, \`RELEASE SAVEPOINT can only be used in transaction blocks\`), and every \`INSERT\` autocommits on its own. The result on PostgreSQL 16 was all seven customers, including Eve and Farid. Always start with \`BEGIN\` if the code must be portable.

More rules checked on both engines:

- **\`ROLLBACK TO\` keeps the savepoint.** You can roll back to the same savepoint again; in SQLite, a \`ROLLBACK TO\` the outermost savepoint even leaves the transaction open (a following \`ROLLBACK\` succeeded without error).
- **Duplicate names.** \`SAVEPOINT a\` twice is allowed. \`ROLLBACK TO a\` and \`RELEASE a\` use the most recent one; after releasing it, the older \`a\` becomes visible again. Run on both engines: \`SAVEPOINT a\`, insert Dara, \`SAVEPOINT a\`, insert Eve, \`ROLLBACK TO a\` left only Dara; then \`RELEASE a\` and another \`ROLLBACK TO a\` removed Dara too.
- **Unknown names** are errors: SQLite \`no such savepoint: nope\`, PostgreSQL \`savepoint "a" does not exist\`.

## 5. Why PostgreSQL Users Need Savepoints: the Aborted Transaction

In PostgreSQL, any error inside a transaction puts the whole transaction into a failed state. Run with \`psql\` on PostgreSQL 16, importing three customers where the second has a duplicate email:

~~~sql
BEGIN;
INSERT INTO customers (id, name, email) VALUES (4, 'Dara', 'dara@example.com');
INSERT INTO customers (id, name, email) VALUES (5, 'Alice B', 'alice@example.com');
INSERT INTO customers (id, name, email) VALUES (6, 'Farid', 'farid@example.com');
COMMIT;
SELECT id, name FROM customers ORDER BY id;
~~~

~~~text
BEGIN
INSERT 0 1
ERROR:  duplicate key value violates unique constraint "customers_email_key"
DETAIL:  Key (email)=(alice@example.com) already exists.
ERROR:  current transaction is aborted, commands ignored until end of transaction block
ROLLBACK
 id | name
----+-------
  1 | Alice
  2 | Bob
  3 | Chen
(3 rows)
~~~

Farid's insert was refused (\`commands ignored until end of transaction block\`), and the \`COMMIT\` answered \`ROLLBACK\`: Dara is lost too.

📌 **Interview term: aborted transaction state** — PostgreSQL's rule that after an error the only accepted commands are \`ROLLBACK\` or \`ROLLBACK TO SAVEPOINT\`.

With a savepoint before the risky row, the transaction recovers:

~~~sql
BEGIN;
INSERT INTO customers (id, name, email) VALUES (4, 'Dara', 'dara@example.com');
SAVEPOINT row_5;
INSERT INTO customers (id, name, email) VALUES (5, 'Alice B', 'alice@example.com');
ROLLBACK TO SAVEPOINT row_5;
INSERT INTO customers (id, name, email) VALUES (6, 'Farid', 'farid@example.com');
COMMIT;
SELECT id, name FROM customers ORDER BY id;
~~~

~~~text
BEGIN
INSERT 0 1
SAVEPOINT
ERROR:  duplicate key value violates unique constraint "customers_email_key"
DETAIL:  Key (email)=(alice@example.com) already exists.
ROLLBACK
INSERT 0 1
COMMIT
 id | name
----+-------
  1 | Alice
  2 | Bob
  3 | Chen
  4 | Dara
  6 | Farid
(5 rows)
~~~

(The \`ROLLBACK\` line is the command tag psql prints for \`ROLLBACK TO SAVEPOINT\`.)

SQLite reaches the same 5 rows **without** a savepoint, because a failed statement there only undoes itself (\`UNIQUE constraint failed: customers.email\`, then Farid inserts and \`COMMIT\` keeps Dara and Farid; run for this page). That is convenient here and dangerous elsewhere, as [What are ACID properties?](/interview-question/what-are-acid-properties) shows with a half-applied transfer.

📌 **Interview term: ON_ERROR_ROLLBACK** — a psql variable (\`on\`, \`interactive\` for interactive sessions only, or \`off\`) that silently wraps every statement in a savepoint, so one failed statement does not kill the transaction. With \`\\set ON_ERROR_ROLLBACK on\`, the three-row import above (no explicit savepoint) committed Dara and Farid when run for this page. Many drivers and ORMs do the same thing on request: Django's nested \`atomic()\` blocks and SQLAlchemy's \`begin_nested()\` emit \`SAVEPOINT\` statements.

## 6. The Same Thing Inside PL/pgSQL

A \`BEGIN ... EXCEPTION ... END\` block in PL/pgSQL runs its body in a subtransaction, which is a savepoint you never name. The fourth example uses it to import three rows and skip the duplicate:

~~~sql
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      (4, 'Dara',    'dara@example.com'),
      (5, 'Alice B', 'alice@example.com'),
      (6, 'Farid',   'farid@example.com')
    ) AS v(id, name, email)
    ORDER BY id
  LOOP
    BEGIN
      INSERT INTO customers (id, name, email) VALUES (r.id, r.name, r.email);
    EXCEPTION WHEN unique_violation THEN
      RAISE NOTICE 'skipped %', r.email;
    END;
  END LOOP;
END
$$;
SELECT id, name, email FROM customers ORDER BY id;
~~~

~~~text
id | name | email
1 | Alice | alice@example.com
2 | Bob | bob@example.com
3 | Chen | chen@example.com
4 | Dara | dara@example.com
6 | Farid | farid@example.com
~~~

The server also printed \`NOTICE:  skipped alice@example.com\`. The PostgreSQL docs warn that a block with an \`EXCEPTION\` clause is "significantly more expensive to enter and exit than a block without one" ([PL/pgSQL: trapping errors](https://www.postgresql.org/docs/16/plpgsql-control-structures.html#PLPGSQL-ERROR-TRAPPING)), so for a pure "skip duplicates" import, \`INSERT ... ON CONFLICT DO NOTHING\` is simpler and cheaper (see [What is an UPSERT?](/interview-question/what-is-an-upsert)).

## 7. COMMIT AND CHAIN

\`COMMIT AND CHAIN\` and \`ROLLBACK AND CHAIN\` end the transaction and immediately start a new one with the **same characteristics** (isolation level, read-only). Run on PostgreSQL 16: \`BEGIN ISOLATION LEVEL REPEATABLE READ; INSERT ...; COMMIT AND CHAIN; SHOW transaction_isolation;\` printed \`repeatable read\`, and outside a transaction block \`COMMIT AND CHAIN can only be used in transaction blocks\` is an error. SQLite does not support the \`AND CHAIN\` clause.

## 8. Verified: Running the Code

The three SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above). The first two returned the same rows on PostgreSQL 16.15; the third behaves differently on PostgreSQL, as described in section 4. The PL/pgSQL example ran on PostgreSQL 16.15 in a scratch database with the same schema. The psql transcripts in section 5 and the rules in sections 2, 4 and 7 were run with \`psql\` and with sql.js statement by statement (psql file-name prefixes removed from the error lines).

Example 1, COMMIT and ROLLBACK:

~~~text
id | name
1 | Alice
2 | Bob
3 | Chen
4 | Dara
~~~

Example 2, a savepoint undoing one step:

~~~text
id | name
1 | Alice
2 | Bob
3 | Chen
4 | Dara
6 | Farid
~~~

Example 3, nested savepoints on SQLite:

~~~text
id | name
1 | Alice
2 | Bob
3 | Chen
4 | Dara
7 | Gita
~~~

Example 4, the PL/pgSQL import:

~~~text
id | name | email
1 | Alice | alice@example.com
2 | Bob | bob@example.com
3 | Chen | chen@example.com
4 | Dara | dara@example.com
6 | Farid | farid@example.com
~~~

## 9. The Commands Side by Side

| Command | Ends the transaction? | Keeps which work? | Engine notes |
| :--- | :--- | :--- | :--- |
| \`COMMIT\` | Yes | All of it, permanently | Warning (PostgreSQL) / error (SQLite) if none is open |
| \`ROLLBACK\` | Yes | None | Discards released savepoints too |
| \`SAVEPOINT s\` | No | — (sets a mark) | SQLite: starts a transaction if none is open; PostgreSQL: error outside a block |
| \`ROLLBACK TO SAVEPOINT s\` | No | Work before \`s\` | \`s\` survives and can be used again; clears PostgreSQL's aborted state |
| \`RELEASE SAVEPOINT s\` | No (SQLite: yes if \`s\` started the transaction) | All of it | Also releases savepoints created after \`s\` |
| \`COMMIT AND CHAIN\` | Yes, and starts a new one | All of it | PostgreSQL (and the SQL standard); not in SQLite |

## Common Pitfalls

- **Thinking \`RELEASE\` or a savepoint saves data.** Nothing is durable until the outer \`COMMIT\`; a final \`ROLLBACK\` discards released savepoints too.
- **Continuing after an error in PostgreSQL without a savepoint.** Every later statement fails with "current transaction is aborted" and the \`COMMIT\` becomes a rollback.
- **Relying on SQLite's "SAVEPOINT starts a transaction" in portable code.** PostgreSQL refuses it and autocommits each statement instead.
- **A savepoint per row in a big loop.** Each one is a subtransaction with overhead (and in PostgreSQL, many open subtransactions in one transaction can hurt performance); prefer \`ON CONFLICT\` or validating data first.
- **Forgetting \`ROLLBACK TO\` keeps the savepoint.** In a loop that reuses a name, either \`RELEASE\` it or know which one you are returning to.
- **Swallowing the error.** Rolling back to a savepoint fixes the transaction, not the data: log or report the skipped row.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. COMMIT and ROLLBACK:</strong> <span style="color:#f0e2c8;">Both end the transaction. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COMMIT</code> makes every change permanent and visible to other sessions; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROLLBACK</code> discards every change as if the transaction never ran.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. SAVEPOINT:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SAVEPOINT</code> is a named checkpoint inside the transaction. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROLLBACK TO SAVEPOINT</code> undoes only the work after it and keeps the transaction open; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RELEASE SAVEPOINT</code> forgets the mark but keeps the work.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Nothing is saved early:</strong> <span style="color:#f0e2c8;">Savepoints are not commits. If the outer transaction rolls back, released savepoints are discarded too. Rolling back to an outer savepoint also removes the inner ones.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why they matter in PostgreSQL:</strong> <span style="color:#f0e2c8;">After any error PostgreSQL marks the transaction <strong style="color:#ffca28;">aborted</strong> and ignores further commands, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COMMIT</code> turns into a rollback. A savepoint before a risky statement lets me <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROLLBACK TO</code> it and carry on, which is exactly what PL/pgSQL <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXCEPTION</code> blocks and ORM nested transactions do.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Engine differences:</strong> <span style="color:#f0e2c8;">SQLite only undoes the failed statement, lets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SAVEPOINT</code> start a transaction, and errors on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COMMIT</code> with nothing open; PostgreSQL warns instead and rejects savepoints outside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BEGIN</code>. For skip-the-duplicates imports I would use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ON CONFLICT DO NOTHING</code> rather than a savepoint per row.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does RELEASE SAVEPOINT commit the work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, inside a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BEGIN</code> it only removes the mark; the work becomes permanent at the outer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COMMIT</code>. The one exception is SQLite, where releasing the outermost savepoint that started the transaction commits it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">After ROLLBACK TO SAVEPOINT, can I roll back to the same savepoint again?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROLLBACK TO</code> keeps the savepoint, so you can retry a step and return to the same mark as often as needed. Savepoints created after it are destroyed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does my COMMIT print ROLLBACK in PostgreSQL?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An earlier statement failed, so the transaction was in the aborted state. PostgreSQL ignores the rest and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COMMIT</code> ends it as a rollback. Use a savepoint before statements that may fail, or retry the whole transaction.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do ORMs implement nested transactions?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With savepoints: the outer block runs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BEGIN</code>, an inner block runs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SAVEPOINT</code>, an exception in the inner block runs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROLLBACK TO SAVEPOINT</code>, and success runs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RELEASE</code>. Django <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">atomic()</code> and SQLAlchemy <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">begin_nested()</code> work this way.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are savepoints free?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Each one starts a subtransaction, and a PL/pgSQL block with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXCEPTION</code> clause is documented as significantly more expensive to enter and exit. For bulk imports, validate first or use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INSERT ... ON CONFLICT</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| COMMIT | End the transaction and make its changes permanent and visible |
| ROLLBACK | End the transaction and discard all its changes |
| SAVEPOINT | A named mark inside a transaction you can return to |
| ROLLBACK TO SAVEPOINT | Undo work after the mark; the transaction and the mark stay |
| RELEASE SAVEPOINT | Forget the mark, keep the work |
| Subtransaction | PostgreSQL's internal unit for the work after a savepoint |
| Aborted transaction state | PostgreSQL after an error: only \`ROLLBACK\` or \`ROLLBACK TO\` accepted |
| ON_ERROR_ROLLBACK | psql option that wraps each statement in an automatic savepoint |

**Conclusion:** \`COMMIT\` keeps everything and \`ROLLBACK\` throws everything away; both end the transaction. A \`SAVEPOINT\` is a checkpoint inside it: \`ROLLBACK TO\` undoes just the work after the checkpoint and lets you continue, \`RELEASE\` drops the checkpoint and keeps the work, and nothing is permanent until the outer \`COMMIT\`. In PostgreSQL savepoints are also the only way to survive an error mid-transaction, which is why PL/pgSQL exception blocks and ORM "nested transactions" are built on them; in SQLite the rules differ (a savepoint can start a transaction, and failed statements roll back only themselves), so test the behaviour on the engine you ship.`,
    examples: [
      {
        label: `COMMIT keeps a transaction, ROLLBACK throws one away`,
        code: `BEGIN;
INSERT INTO customers (id, name, email) VALUES (4, 'Dara', 'dara@example.com');
COMMIT;
BEGIN;
INSERT INTO customers (id, name, email) VALUES (5, 'Eve', 'eve@example.com');
ROLLBACK;
SELECT id, name FROM customers ORDER BY id;`,
      },
      {
        label: `SAVEPOINT + ROLLBACK TO undoes one step, the rest is committed`,
        code: `BEGIN;
INSERT INTO customers (id, name, email) VALUES (4, 'Dara', 'dara@example.com');
SAVEPOINT before_eve;
INSERT INTO customers (id, name, email) VALUES (5, 'Eve', 'eve@example.com');
ROLLBACK TO SAVEPOINT before_eve;
RELEASE SAVEPOINT before_eve;
INSERT INTO customers (id, name, email) VALUES (6, 'Farid', 'farid@example.com');
COMMIT;
SELECT id, name FROM customers ORDER BY id;`,
      },
      {
        label: `SQLite: nested savepoints, rolling back to an outer one, RELEASE of the outermost commits`,
        code: `SAVEPOINT batch;
INSERT INTO customers (id, name, email) VALUES (4, 'Dara', 'dara@example.com');
SAVEPOINT a;
INSERT INTO customers (id, name, email) VALUES (5, 'Eve', 'eve@example.com');
SAVEPOINT b;
INSERT INTO customers (id, name, email) VALUES (6, 'Farid', 'farid@example.com');
ROLLBACK TO a;
INSERT INTO customers (id, name, email) VALUES (7, 'Gita', 'gita@example.com');
RELEASE batch;
SELECT id, name FROM customers ORDER BY id;`,
      },
      {
        label: `PostgreSQL: a PL/pgSQL EXCEPTION block (an implicit savepoint) skips duplicate rows in an import`,
        code: `DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      (4, 'Dara',    'dara@example.com'),
      (5, 'Alice B', 'alice@example.com'),
      (6, 'Farid',   'farid@example.com')
    ) AS v(id, name, email)
    ORDER BY id
  LOOP
    BEGIN
      INSERT INTO customers (id, name, email) VALUES (r.id, r.name, r.email);
    EXCEPTION WHEN unique_violation THEN
      RAISE NOTICE 'skipped %', r.email;
    END;
  END LOOP;
END
$$;
SELECT id, name, email FROM customers ORDER BY id;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `What are transaction isolation levels?`,
    difficulty: "medium",
    seoDescription: `Transaction isolation levels explained: dirty, non-repeatable and phantom reads, lost updates and write skew, the four levels, and real engine defaults.`,
    description: `**Question presented to candidate:**
"What are transaction isolation levels? Name them, tell me which problems each one prevents, and tell me what your database uses by default and why it is not the strictest one."

**What a strong answer should cover:**
- Isolation is a dial between correctness and concurrency: the stricter the level, the more the database must block or abort concurrent transactions
- The three read phenomena the SQL standard uses: dirty read, non-repeatable read, phantom read — and the four levels defined by which of them they allow (READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ, SERIALIZABLE)
- Anomalies the standard table misses: lost update and write skew; only SERIALIZABLE rules out all of them
- Real defaults: PostgreSQL, SQL Server and Oracle use READ COMMITTED, MySQL InnoDB uses REPEATABLE READ, SQLite is serializable; engines may implement a level more strictly than the standard (PostgreSQL treats READ UNCOMMITTED as READ COMMITTED)
- Implementation: locks versus MVCC snapshots, and how to set the level per transaction

**Code / implementation expected:** Optional — a two-session timeline showing one anomaly, and the syntax to set a level for one transaction.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE accounts (
  id      INTEGER PRIMARY KEY,
  owner   TEXT    NOT NULL,
  balance INTEGER NOT NULL
);

CREATE TABLE products (
  id    INTEGER PRIMARY KEY,
  name  TEXT    NOT NULL,
  stock INTEGER NOT NULL
);

CREATE TABLE app_memory (
  session    TEXT PRIMARY KEY,
  seen_stock INTEGER NOT NULL
);

INSERT INTO accounts (id, owner, balance) VALUES
  (1, 'Alice', 100),
  (2, 'Bob',    50),
  (3, 'Chen',  300);

INSERT INTO products (id, name, stock) VALUES
  (1, 'Keyboard', 5);
\`\`\``,
    answer: `**Target Audience:** Beginners who know what a transaction is and want to understand what "isolation level" means, and candidates who need the anomaly names, the four standard levels and the real engine defaults.
**Difficulty:** Medium
**Engines:** PostgreSQL 16.15 (all two-session timelines were run on it with two concurrent \`psql\` sessions) and SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples use). MySQL, SQL Server and Oracle facts are cited from their documentation. The PostgreSQL-specific detail for each level is on its own page: [Transaction isolation levels in Postgres — what anomalies does each level prevent?](/interview-question/transaction-isolation-levels-in-postgres-what-anomalies-does-each-level-prevent)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and error message shown was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

A family shares one shopping list on the fridge. Mum is rewriting it: she has crossed out "milk" and not yet written "oat milk". Dad glances at the list right then and leaves for the shop without milk. That is reading someone's half-finished work.

There are stricter house rules you could adopt:

1. You may only read the list when nobody is mid-edit. (Dad waits a few seconds.)
2. Once you have read the list, it must not change until you are back from the shop. (Mum has to wait for Dad to come home before she edits.)
3. Everybody uses the list strictly one at a time. (Nobody ever sees a surprise, but the kitchen is often blocked.)

Each stricter rule removes a kind of mistake and makes everybody wait more. Isolation levels are exactly these house rules for a database: a choice of how much concurrent transactions are allowed to see of each other, traded against how much they have to wait or retry.

📌 **Interview term: isolation level** — the setting that decides which interference between concurrent transactions the database allows. Stricter levels prevent more anomalies but block or abort more transactions.

📌 **Interview term: anomaly (phenomenon)** — a wrong or surprising result that can only happen because two transactions ran at the same time. Running them one after the other would never produce it.

<svg class="iq-diagram" width="100%" viewBox="0 0 800 370" role="img" aria-label="A staircase of four levels from READ UNCOMMITTED at the bottom to SERIALIZABLE at the top. Higher levels block more anomalies and allow less concurrency">
  <rect class="d-box-muted" x="20" y="290" width="160" height="60" rx="8"/>
  <text class="d-text" x="100" y="316" text-anchor="middle">READ UNCOMMITTED</text>
  <text class="d-sub" x="100" y="338" text-anchor="middle">blocks nothing</text>
  <rect class="d-box" x="220" y="200" width="160" height="60" rx="8"/>
  <text class="d-text" x="300" y="226" text-anchor="middle">READ COMMITTED</text>
  <text class="d-sub" x="300" y="248" text-anchor="middle">no dirty reads</text>
  <rect class="d-box" x="420" y="110" width="160" height="60" rx="8"/>
  <text class="d-text" x="500" y="136" text-anchor="middle">REPEATABLE READ</text>
  <text class="d-sub" x="500" y="158" text-anchor="middle">rows read stay put</text>
  <rect class="d-box-accent" x="620" y="20" width="160" height="60" rx="8"/>
  <text class="d-text" x="700" y="46" text-anchor="middle">SERIALIZABLE</text>
  <text class="d-sub" x="700" y="68" text-anchor="middle">as if one at a time</text>
</svg>

## 2. The Three Read Phenomena of the SQL Standard

The SQL-92 standard defines its four levels by three phenomena. Each was run on PostgreSQL 16 with two \`psql\` sessions; the \`accounts\` table starts with Alice 100, Bob 50, Chen 300.

### Dirty read

📌 **Interview term: dirty read** — reading a change another transaction has made but not committed. If that transaction then rolls back, you acted on data that never existed.

| Step | Session A | Session B |
| :--- | :--- | :--- |
| 1 | \`BEGIN;\` \`UPDATE accounts SET balance = 0 WHERE id = 1;\` | |
| 2 | | \`BEGIN ISOLATION LEVEL READ UNCOMMITTED;\` |
| 3 | | \`SELECT balance FROM accounts WHERE id = 1;\` → **100** |
| 4 | \`ROLLBACK;\` | \`COMMIT;\` |

Even when asked for READ UNCOMMITTED, PostgreSQL never shows uncommitted data: B saw 100, not 0. The PostgreSQL documentation says its READ UNCOMMITTED "behaves like READ COMMITTED" ([PostgreSQL 16: transaction isolation](https://www.postgresql.org/docs/16/transaction-iso.html)). Engines that do allow dirty reads at READ UNCOMMITTED include SQL Server with locking read committed ([SET TRANSACTION ISOLATION LEVEL](https://learn.microsoft.com/en-us/sql/t-sql/statements/set-transaction-isolation-level-transact-sql)) and MySQL InnoDB ([MySQL: isolation levels](https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html)); those were not run here.

### Non-repeatable read

📌 **Interview term: non-repeatable read** — you read a row twice in the same transaction and get different values, because another transaction updated it and committed in between.

<svg class="iq-diagram" width="100%" viewBox="0 0 800 280" role="img" aria-label="Non-repeatable read timeline: session A reads balance 100, session B updates it to 70 and commits, session A reads again and gets 70 under READ COMMITTED but 100 under REPEATABLE READ">
  <defs>
    <marker id="sql12q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="20" y="50">Session A</text>
  <text class="d-text" x="20" y="200">Session B</text>
  <line class="d-edge" x1="130" y1="45" x2="780" y2="45" marker-end="url(#sql12q4-arrow)"/>
  <line class="d-edge" x1="130" y1="195" x2="780" y2="195" marker-end="url(#sql12q4-arrow)"/>
  <rect class="d-box" x="150" y="70" width="170" height="56" rx="8"/>
  <text class="d-text" x="235" y="96" text-anchor="middle">read: 100</text>
  <text class="d-sub" x="235" y="116" text-anchor="middle">first SELECT</text>
  <rect class="d-box-muted" x="340" y="216" width="190" height="56" rx="8"/>
  <text class="d-text" x="435" y="242" text-anchor="middle">set 70, COMMIT</text>
  <text class="d-sub" x="435" y="262" text-anchor="middle">autocommit UPDATE</text>
  <rect class="d-box-accent" x="560" y="70" width="210" height="56" rx="8"/>
  <text class="d-text" x="665" y="96" text-anchor="middle">read again</text>
  <text class="d-sub" x="665" y="116" text-anchor="middle">RC: 70, RR: 100</text>
</svg>

| Step | Session A | Session B |
| :--- | :--- | :--- |
| 1 | \`BEGIN ISOLATION LEVEL READ COMMITTED;\` | |
| 2 | \`SELECT balance ... WHERE id = 1;\` → 100 | |
| 3 | | \`UPDATE accounts SET balance = 70 WHERE id = 1;\` (autocommit) |
| 4 | \`SELECT balance ... WHERE id = 1;\` → **70** | |

The same steps with \`BEGIN ISOLATION LEVEL REPEATABLE READ;\` returned **100** both times: the second read used the same snapshot as the first.

### Phantom read

📌 **Interview term: phantom read** — you run the same search twice and a row appears (or disappears) that matches the condition, because another transaction inserted or deleted it and committed.

| Step | Session A | Session B |
| :--- | :--- | :--- |
| 1 | \`BEGIN ISOLATION LEVEL READ COMMITTED;\` | |
| 2 | \`SELECT COUNT(*) FROM accounts WHERE balance >= 100;\` → 2 | |
| 3 | | \`INSERT INTO accounts VALUES (4, 'Dara', 500);\` |
| 4 | same \`SELECT\` → **3** | |

Under REPEATABLE READ the second count was still **2** on PostgreSQL. The standard would allow a phantom at REPEATABLE READ; PostgreSQL is stricter than required here (its docs list phantoms at that level as "Allowed, but not in PG").

## 3. The Four Standard Levels

| Level | Dirty read | Non-repeatable read | Phantom read |
| :--- | :--- | :--- | :--- |
| READ UNCOMMITTED | possible | possible | possible |
| READ COMMITTED | prevented | possible | possible |
| REPEATABLE READ | prevented | prevented | possible |
| SERIALIZABLE | prevented | prevented | prevented |

This is the SQL-standard table: the **minimum** each level must prevent. An engine may prevent more. The level names are the same everywhere; the behaviour under each name is not.

📌 **Interview term: READ COMMITTED** — every statement sees only data committed before that statement began. The most common default.

📌 **Interview term: REPEATABLE READ** — rows you have read do not change for the rest of your transaction. In MVCC engines this is usually implemented as one snapshot for the whole transaction.

📌 **Interview term: SERIALIZABLE** — the result of running transactions concurrently equals the result of running them in some one-at-a-time (serial) order. It is the only level that rules out every anomaly.

## 4. Two Anomalies the Table Leaves Out

In 1995 Berenson, Bernstein, Gray and others showed that the three phenomena do not describe all the ways concurrent transactions go wrong ([A Critique of ANSI SQL Isolation Levels](https://arxiv.org/abs/cs/0701157)). Two matter in practice.

### Lost update

📌 **Interview term: lost update** — two transactions read the same value, both compute a new value from it, and the second write silently overwrites the first.

A single script cannot run two sessions at once, so the first example replays the interleaving step by step, keeping what each "application session" read in a small \`app_memory\` table:

~~~sql
-- Replay of a lost update, one step at a time.
-- Session A and session B each read the stock into application memory.
INSERT INTO app_memory (session, seen_stock) SELECT 'A', stock FROM products WHERE id = 1;
INSERT INTO app_memory (session, seen_stock) SELECT 'B', stock FROM products WHERE id = 1;

-- Each sells one keyboard and writes back "what I saw minus 1".
UPDATE products SET stock = (SELECT seen_stock - 1 FROM app_memory WHERE session = 'A') WHERE id = 1;
UPDATE products SET stock = (SELECT seen_stock - 1 FROM app_memory WHERE session = 'B') WHERE id = 1;

SELECT session, seen_stock FROM app_memory ORDER BY session;
SELECT name, stock AS stock_after_two_sales FROM products WHERE id = 1;
~~~

~~~text
session | seen_stock
A | 5
B | 5

name | stock_after_two_sales
Keyboard | 4
~~~

Two keyboards sold, stock went from 5 to 4. The real two-session run on PostgreSQL 16 under READ COMMITTED ended the same way: both sessions read 5, both wrote 4, B's update waited for A's commit and then overwrote it, final stock **4**. Under REPEATABLE READ, B's update instead failed with \`ERROR:  could not serialize access due to concurrent update\` (SQLSTATE \`40001\`) and the application has to retry.

The fix that works at any level is to let the database read and write in one statement:

~~~sql
UPDATE products SET stock = stock - 1 WHERE id = 1;
UPDATE products SET stock = stock - 1 WHERE id = 1;
SELECT name, stock AS stock_after_two_sales FROM products WHERE id = 1;
~~~

~~~text
name | stock_after_two_sales
Keyboard | 3
~~~

Run concurrently in two \`psql\` sessions under READ COMMITTED, the second \`UPDATE\` waited for the first to commit, then re-read the row and wrote 3. Other fixes: lock the row with \`SELECT ... FOR UPDATE\` before deciding ([FOR UPDATE vs FOR UPDATE NOWAIT vs FOR UPDATE SKIP LOCKED — which to use when?](/interview-question/for-update-vs-for-update-nowait-vs-for-update-skip-locked-which-to-use-when)), or a version column checked in the \`WHERE\` clause (optimistic locking).

### Write skew

📌 **Interview term: write skew** — two transactions each read a set of rows, check a rule ("at least one doctor stays on call"), and each update a **different** row. Neither overwrote the other, yet together they break the rule. REPEATABLE READ (snapshot isolation) does not prevent it; SERIALIZABLE does. Shown step by step on [Transaction isolation levels in Postgres — what anomalies does each level prevent?](/interview-question/transaction-isolation-levels-in-postgres-what-anomalies-does-each-level-prevent) and in depth on [Serializable isolation pitfalls — write skew, retry storms, and when advisory locks beat SSI?](/interview-question/serializable-isolation-pitfalls-write-skew-retry-storms-and-when-advisory-locks-)

## 5. What Real Databases Use by Default

| Engine | Default level | Notes |
| :--- | :--- | :--- |
| PostgreSQL | READ COMMITTED | \`SHOW default_transaction_isolation\` printed \`read committed\` on PostgreSQL 16.15; three distinct levels internally, READ UNCOMMITTED behaves as READ COMMITTED |
| MySQL (InnoDB) | REPEATABLE READ | All four levels supported ([MySQL manual](https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html)) |
| SQL Server | READ COMMITTED | Locking by default on SQL Server; Azure SQL Database turns \`READ_COMMITTED_SNAPSHOT\` on by default, so readers use row versions instead ([Microsoft docs](https://learn.microsoft.com/en-us/sql/t-sql/statements/set-transaction-isolation-level-transact-sql)) |
| Oracle | READ COMMITTED | Offers READ COMMITTED, SERIALIZABLE and a READ ONLY mode; no READ UNCOMMITTED ([Oracle concepts](https://docs.oracle.com/cd/A58617_01/server.804/a58227/ch10.htm)) |
| SQLite | SERIALIZABLE | One writer at a time, so transactions are serializable except in shared-cache mode with \`read_uncommitted\` ([SQLite: isolation](https://sqlite.org/isolation.html)) |

Why not default to SERIALIZABLE everywhere? Because it costs throughput: lock-based engines make transactions wait longer, and MVCC engines abort some transactions with serialization errors that the application must retry. READ COMMITTED is a pragmatic middle: no dirty reads, rarely blocks, and the remaining anomalies can be handled where they matter.

## 6. How Engines Implement Isolation

📌 **Interview term: lock-based isolation (two-phase locking)** — readers take shared locks and writers take exclusive locks; a stricter level holds locks longer (until commit) and locks ranges to stop phantoms. Correct, but readers and writers block each other.

📌 **Interview term: MVCC snapshot** — every update writes a new version of the row; a transaction reads the versions committed as of its snapshot. READ COMMITTED takes a new snapshot per statement, REPEATABLE READ one per transaction. Readers never block writers. PostgreSQL, MySQL InnoDB, Oracle and SQL Server's snapshot modes work this way.

📌 **Interview term: serialization failure** — the error (SQLSTATE \`40001\`) an MVCC engine raises at REPEATABLE READ or SERIALIZABLE when it cannot let a transaction finish without breaking the level's promise. The fix is to retry the whole transaction.

## 7. Setting the Level

Per transaction in PostgreSQL:

~~~sql
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT current_setting('transaction_isolation')         AS this_transaction,
       current_setting('default_transaction_isolation') AS server_default;
COMMIT;
~~~

~~~text
this_transaction | server_default
repeatable read | read committed
~~~

The standard form is \`SET TRANSACTION ISOLATION LEVEL ...\` as the first statement of a transaction. PostgreSQL enforces "first": after a query it says \`ERROR:  SET TRANSACTION ISOLATION LEVEL must be called before any query\` (run here). For a whole session: \`SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL ...\` (PostgreSQL) or \`SET SESSION TRANSACTION ISOLATION LEVEL ...\` (MySQL).

PostgreSQL accepts every standard name, including READ UNCOMMITTED, and reports back what you asked for; the behaviour is READ COMMITTED (the dirty-read timeline in section 2):

~~~text
level_you_asked_for | alice_balance
read uncommitted | 100
~~~

SQLite has no isolation-level setting for normal connections: \`BEGIN DEFERRED\`, \`BEGIN IMMEDIATE\` and \`BEGIN EXCLUSIVE\` only choose when the write lock is taken.

## 8. Verified: Running the Code

The two SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above); both returned the same rows on PostgreSQL 16.15. The two PostgreSQL examples ran on PostgreSQL 16.15 in a scratch database with the same schema. Every two-session timeline on this page (dirty read, non-repeatable read, phantom, lost update, atomic update) was run with two concurrent \`psql\` sessions against a scratch PostgreSQL 16.15 database, and the values quoted are what those sessions printed.

Example 1, the lost update replayed:

~~~text
session | seen_stock
A | 5
B | 5

name | stock_after_two_sales
Keyboard | 4
~~~

Example 2, atomic updates:

~~~text
name | stock_after_two_sales
Keyboard | 3
~~~

Example 3, setting the level:

~~~text
this_transaction | server_default
repeatable read | read committed
~~~

Example 4, READ UNCOMMITTED in PostgreSQL:

~~~text
level_you_asked_for | alice_balance
read uncommitted | 100
~~~

## 9. Choosing a Level

| Need | Level | Extra care |
| :--- | :--- | :--- |
| Typical web requests, single-statement updates | READ COMMITTED | Atomic \`UPDATE ... SET x = x - 1\`, constraints, \`FOR UPDATE\` for read-then-write |
| A report of several queries that must agree | REPEATABLE READ (read only) | Keep it short; long snapshots hold back cleanup |
| Rules across several rows (no overlapping bookings, one on-call doctor) | SERIALIZABLE | Retry on SQLSTATE \`40001\` |
| Never | READ UNCOMMITTED | Dirty reads where supported; no speed gain on MVCC engines |

## Common Pitfalls

- **Assuming the default is serializable.** It almost never is; READ COMMITTED allows lost updates in read-modify-write code.
- **Quoting the standard table as engine behaviour.** PostgreSQL's REPEATABLE READ has no phantoms; its READ UNCOMMITTED has no dirty reads; MySQL's REPEATABLE READ behaves differently again. Name the engine.
- **Forgetting lost update and write skew.** The three-phenomena table looks complete but is not; interviewers often ask about these two.
- **Raising the level without retry logic.** At REPEATABLE READ and SERIALIZABLE on MVCC engines, transactions fail with \`40001\` by design and must be retried in full.
- **Setting the level after the first query.** PostgreSQL rejects it; set it in \`BEGIN\` or as the first statement.
- **Using a stricter level where a constraint or atomic update would do.** \`UNIQUE\`, \`CHECK\` and \`SET x = x - 1\` are cheaper and work at any level.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">An <strong style="color:#ffca28;">isolation level</strong> decides how much concurrent transactions can see of each other. Stricter levels prevent more anomalies but make transactions wait or retry more.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Standard levels:</strong> <span style="color:#f0e2c8;">The SQL standard defines four by three read phenomena: READ UNCOMMITTED allows dirty reads, READ COMMITTED stops them, REPEATABLE READ also stops non-repeatable reads, and SERIALIZABLE also stops phantoms.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Beyond the table:</strong> <span style="color:#f0e2c8;">Two anomalies matter in practice: the <strong style="color:#ffca28;">lost update</strong> (two read-modify-writes, one overwrites the other) and <strong style="color:#ffca28;">write skew</strong> (two transactions update different rows and together break a rule). Only SERIALIZABLE prevents all of them.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Real defaults:</strong> <span style="color:#f0e2c8;">PostgreSQL, SQL Server and Oracle default to READ COMMITTED, MySQL InnoDB to REPEATABLE READ, SQLite is serializable. Engines can be stricter than the standard: PostgreSQL has no dirty reads at READ UNCOMMITTED and no phantoms at REPEATABLE READ.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Practice:</strong> <span style="color:#f0e2c8;">I keep READ COMMITTED for normal work and handle the risky spots with atomic <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UPDATE ... SET x = x - 1</code>, constraints or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FOR UPDATE</code>; I use SERIALIZABLE for multi-row rules, with a retry loop for SQLSTATE <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">40001</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between a non-repeatable read and a phantom?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A non-repeatable read is an existing row whose values changed between two reads. A phantom is a row that newly appears in, or disappears from, the result of a repeated search because of an insert or delete.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does PostgreSQL support READ UNCOMMITTED?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It accepts the name, but the behaviour is READ COMMITTED: in a two-session test, a READ UNCOMMITTED reader still saw 100 while another session had uncommitted 0. PostgreSQL implements only three distinct levels.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is SERIALIZABLE not the default?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It costs concurrency. Lock-based engines block more, and MVCC engines abort transactions with serialization failures that the app must retry. Most workloads are fine at READ COMMITTED with targeted locking.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does REPEATABLE READ stop lost updates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In PostgreSQL, yes, by aborting the second writer with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">could not serialize access due to concurrent update</code>, which you must retry. It does not stop write skew, because the two transactions write different rows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do MVCC databases implement isolation without blocking readers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Writers create new row versions, and each transaction reads the versions committed as of its snapshot: a new snapshot per statement at READ COMMITTED, one per transaction at REPEATABLE READ. Readers never wait for writers.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Isolation level | Which interference between concurrent transactions is allowed |
| Anomaly (phenomenon) | A result only possible because transactions overlapped |
| Dirty read | Reading another transaction's uncommitted change |
| Non-repeatable read | The same row read twice gives different values |
| Phantom read | The same search returns a new or missing row |
| READ COMMITTED | Each statement sees data committed before it started |
| REPEATABLE READ | Rows read stay the same for the whole transaction |
| SERIALIZABLE | Concurrent result equals some one-at-a-time order |
| Lost update | The second read-modify-write overwrites the first |
| Write skew | Two transactions update different rows and together break a rule |
| Lock-based isolation (2PL) | Isolation by holding shared and exclusive locks |
| MVCC snapshot | Isolation by reading row versions committed as of a point in time |
| Serialization failure | SQLSTATE 40001: the transaction must be retried |

**Conclusion:** Isolation levels are the database's answer to "how much may concurrent transactions see of each other?". The standard defines four levels by three read phenomena — dirty, non-repeatable and phantom reads — but real systems also have to deal with lost updates and write skew, which only SERIALIZABLE rules out. Most engines default to READ COMMITTED (MySQL InnoDB to REPEATABLE READ) because stricter levels cost waiting or retries, and each engine implements the names a little differently. A good answer names the anomalies, the default of the engine you use, and how you protect the cases the default does not cover.`,
    examples: [
      {
        label: `A lost update replayed step by step: two sessions read 5, both write 4`,
        code: `-- Replay of a lost update, one step at a time.
-- Session A and session B each read the stock into application memory.
INSERT INTO app_memory (session, seen_stock) SELECT 'A', stock FROM products WHERE id = 1;
INSERT INTO app_memory (session, seen_stock) SELECT 'B', stock FROM products WHERE id = 1;

-- Each sells one keyboard and writes back "what I saw minus 1".
UPDATE products SET stock = (SELECT seen_stock - 1 FROM app_memory WHERE session = 'A') WHERE id = 1;
UPDATE products SET stock = (SELECT seen_stock - 1 FROM app_memory WHERE session = 'B') WHERE id = 1;

SELECT session, seen_stock FROM app_memory ORDER BY session;
SELECT name, stock AS stock_after_two_sales FROM products WHERE id = 1;`,
      },
      {
        label: `The same two sales as atomic updates: the database reads and writes in one step`,
        code: `-- The same two sales written as atomic updates: the database reads and writes in one step.
UPDATE products SET stock = stock - 1 WHERE id = 1;
UPDATE products SET stock = stock - 1 WHERE id = 1;
SELECT name, stock AS stock_after_two_sales FROM products WHERE id = 1;`,
      },
      {
        label: `PostgreSQL: set the level for one transaction and read it back`,
        code: `BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT current_setting('transaction_isolation')         AS this_transaction,
       current_setting('default_transaction_isolation') AS server_default;
COMMIT;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: READ UNCOMMITTED is accepted (it behaves as READ COMMITTED)`,
        code: `BEGIN ISOLATION LEVEL READ UNCOMMITTED;
SELECT current_setting('transaction_isolation') AS level_you_asked_for,
       (SELECT balance FROM accounts WHERE id = 1) AS alice_balance;
COMMIT;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `Transaction isolation levels in Postgres — what anomalies does each level prevent?`,
    difficulty: "medium",
    seoDescription: `PostgreSQL isolation levels tested with two sessions: what READ COMMITTED, REPEATABLE READ and SERIALIZABLE (SSI) prevent, 40001 errors and retries.`,
    description: `**Question presented to candidate:**
"In PostgreSQL specifically, walk me through READ COMMITTED, REPEATABLE READ and SERIALIZABLE. For each one, which anomalies can still happen, what does the database do when two transactions collide, and what does my application have to handle?"

**What a strong answer should cover:**
- PostgreSQL implements three distinct levels; READ UNCOMMITTED behaves as READ COMMITTED, so dirty reads never happen
- READ COMMITTED (default): a new snapshot per statement; non-repeatable reads, phantoms, lost updates in read-modify-write code and write skew are possible; a blocked \`UPDATE\` waits, then re-checks its \`WHERE\` on the newest row version
- REPEATABLE READ: one snapshot taken at the first statement (not at \`BEGIN\`); no non-repeatable reads and, stricter than the standard, no phantoms; a concurrent update of the same row aborts with SQLSTATE 40001; write skew still possible
- SERIALIZABLE: Serializable Snapshot Isolation (SSI, since 9.1) tracks read/write dependencies with SIRead predicate locks and aborts one transaction of a dangerous pattern with 40001, so write skew is prevented; reads never block
- Application duties: retry the whole transaction on 40001, keep serializable transactions short, use \`READ ONLY DEFERRABLE\` for long reports, or use explicit locks (\`FOR UPDATE\`) at READ COMMITTED instead

**Clarifying questions expected:**
- Which invariant are we protecting — one row (counter, balance) or a rule across several rows (on-call roster, no overlapping bookings)?
- Can the application retry a transaction safely (no external side effects inside it)?

**Code / implementation expected:** Optional — a two-session timeline for write skew, and the fix with SERIALIZABLE plus retry or with \`FOR UPDATE\`.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE doctors (
  name    TEXT PRIMARY KEY,
  shift   TEXT    NOT NULL,
  on_call INTEGER NOT NULL
);

CREATE TABLE accounts (
  id      INTEGER PRIMARY KEY,
  owner   TEXT    NOT NULL,
  balance INTEGER NOT NULL
);

INSERT INTO doctors (name, shift, on_call) VALUES
  ('Alice', 'night', 1),
  ('Bob',   'night', 1),
  ('Chen',  'day',   0);

INSERT INTO accounts (id, owner, balance) VALUES
  (1, 'Alice', 100),
  (2, 'Bob',    50),
  (3, 'Chen',  300);
\`\`\``,
    answer: `**Target Audience:** Developers who know the four standard isolation levels and want to know exactly how PostgreSQL behaves at each one, and candidates preparing for "what does your app have to do at SERIALIZABLE?".
**Difficulty:** Medium
**Engines:** PostgreSQL 16.15. Every two-session timeline on this page was run with two concurrent \`psql\` sessions against a scratch database seeded from the schema above, and the values and error messages quoted are what those sessions printed. The two runnable examples use SQLite 3.45.0 (sql.js 1.10.2) to show end states; SQLite itself is always serializable. The level-independent basics (what a dirty read or a phantom is) are on [What are transaction isolation levels?](/interview-question/what-are-transaction-isolation-levels)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and error message shown was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

A hospital rule: at night, at least one doctor must be on call. Alice and Bob are both on call and both feel unwell. At the same moment each opens the rota app, which checks "are at least two doctors on call?" — yes, two — and lets each of them sign off. Each check was correct when it ran. Each sign-off changed only that doctor's own row. Nobody overwrote anybody. And the hospital has nobody on call.

Which PostgreSQL isolation level stops this? Not the default, and not the one called REPEATABLE READ either. Only SERIALIZABLE does, and it does so by making one of the two transactions fail so the app can try again. Knowing what each level lets through, and what PostgreSQL does on a collision, is what this question is about.

## 2. The Map: Three Real Levels

<svg class="iq-diagram" width="100%" viewBox="0 0 800 300" role="img" aria-label="Three PostgreSQL levels. READ COMMITTED takes a snapshot per statement, REPEATABLE READ one snapshot per transaction, SERIALIZABLE one snapshot plus dependency tracking that aborts dangerous patterns">
  <rect class="d-box" x="20" y="30" width="220" height="110" rx="10"/>
  <text class="d-text" x="130" y="66" text-anchor="middle">READ COMMITTED</text>
  <text class="d-sub" x="130" y="92" text-anchor="middle">snapshot per statement</text>
  <text class="d-sub" x="130" y="116" text-anchor="middle">default</text>
  <rect class="d-box" x="290" y="30" width="220" height="110" rx="10"/>
  <text class="d-text" x="400" y="66" text-anchor="middle">REPEATABLE READ</text>
  <text class="d-sub" x="400" y="92" text-anchor="middle">one snapshot per txn</text>
  <text class="d-sub" x="400" y="116" text-anchor="middle">same-row conflict: 40001</text>
  <rect class="d-box-accent" x="560" y="30" width="220" height="110" rx="10"/>
  <text class="d-text" x="670" y="66" text-anchor="middle">SERIALIZABLE</text>
  <text class="d-sub" x="670" y="92" text-anchor="middle">snapshot + SSI tracking</text>
  <text class="d-sub" x="670" y="116" text-anchor="middle">dangerous pattern: 40001</text>
  <rect class="d-box-muted" x="20" y="190" width="760" height="80" rx="10"/>
  <text class="d-text" x="400" y="224" text-anchor="middle">READ UNCOMMITTED is accepted and runs as READ COMMITTED</text>
  <text class="d-sub" x="400" y="250" text-anchor="middle">no level ever shows uncommitted data</text>
</svg>

📌 **Interview term: snapshot** — the set of transactions whose changes a query may see: everything committed before the snapshot was taken, plus the transaction's own changes. PostgreSQL implements isolation with MVCC: an update writes a new row version and each snapshot picks the versions that were committed for it.

PostgreSQL accepts all four standard names but implements three; its documentation states that READ UNCOMMITTED "behaves like READ COMMITTED" ([PostgreSQL 16: transaction isolation](https://www.postgresql.org/docs/16/transaction-iso.html)). In a two-session test, a READ UNCOMMITTED reader saw 100 while another session had an uncommitted update to 0.

| Anomaly | READ COMMITTED (default) | REPEATABLE READ | SERIALIZABLE |
| :--- | :--- | :--- | :--- |
| Dirty read | prevented | prevented | prevented |
| Non-repeatable read | **possible** | prevented | prevented |
| Phantom read | **possible** | prevented (stricter than the standard) | prevented |
| Lost update (read, then write back) | **possible** | prevented: second writer gets 40001 | prevented: 40001 |
| Write skew | **possible** | **possible** | prevented: one transaction gets 40001 |

Every cell marked possible or prevented above was reproduced on PostgreSQL 16 with two sessions (section 7 lists the runs).

## 3. READ COMMITTED: a Fresh Snapshot for Every Statement

📌 **Interview term: statement-level snapshot** — at READ COMMITTED each statement sees the data committed before *that statement* began. Two \`SELECT\`s in the same transaction can see different data.

So a balance read twice can change (non-repeatable read: 100, then 70 after another session's commit), and a count can change (phantom: 2, then 3 after another session inserted a row).

What happens when two writers touch the same row is the subtle part:

📌 **Interview term: row lock wait and re-check** — if an \`UPDATE\` finds a row that another open transaction has already updated, it waits. When that transaction commits, PostgreSQL re-evaluates the \`WHERE\` condition on the **new** row version and updates it only if it still matches. The docs describe this and warn that the result can be inconsistent ([PostgreSQL 16: Read Committed](https://www.postgresql.org/docs/16/transaction-iso.html#XACT-READ-COMMITTED)).

This makes \`SET stock = stock - 1\` safe (two sessions decremented 5 to 3, the second waiting for the first), but it has a strange edge. Run with two sessions; balances start at Alice 100, Bob 50, Chen 300:

| Step | Session A | Session B |
| :--- | :--- | :--- |
| 1 | \`BEGIN;\` \`UPDATE accounts SET balance = 50 WHERE id = 3;\` (Chen) | |
| 2 | \`UPDATE accounts SET balance = balance + 100 WHERE id = 2;\` (Bob → 150) | |
| 3 | | \`BEGIN;\` \`UPDATE accounts SET balance = 0 WHERE balance >= 100;\` → waits for A |
| 4 | \`COMMIT;\` | the update finishes |
| 5 | | \`SELECT owner, balance ...\` → Alice 0, Bob **150**, Chen **50** |

B's statement zeroed Alice, re-checked Chen after waiting (now 50, no longer matches, skipped), and never touched Bob, whose old version (50) did not match when the statement started even though his committed balance is now 150. No single moment in time had exactly those rows matching. For "bulk update by condition" jobs, this is a reason to use REPEATABLE READ or explicit locks.

What READ COMMITTED does **not** protect is logic in your application: "read stock 5, write 4" in two sessions ends at 4 (lost update), and the on-call check in the story ends with nobody on call (write skew), even with the check written into the \`UPDATE\` itself.

## 4. REPEATABLE READ: One Snapshot for the Whole Transaction

📌 **Interview term: snapshot isolation** — all statements in the transaction read from one snapshot. PostgreSQL's REPEATABLE READ is snapshot isolation.

The snapshot is taken at the **first statement**, not at \`BEGIN\`:

| Step | Session A | Session B |
| :--- | :--- | :--- |
| 1 | \`BEGIN ISOLATION LEVEL REPEATABLE READ;\` | |
| 2 | | \`UPDATE accounts SET balance = 70 WHERE id = 1;\` |
| 3 | \`SELECT balance ... WHERE id = 1;\` → **70** (snapshot taken now) | |
| 4 | | \`UPDATE accounts SET balance = 40 WHERE id = 1;\` |
| 5 | \`SELECT balance ... WHERE id = 1;\` → **70** (same snapshot) | |

Repeated reads return the same rows and the same values, and new rows inserted by others never appear (the phantom count stayed at 2). The SQL standard would allow phantoms here; PostgreSQL does not.

When two REPEATABLE READ transactions update the **same row**, the second one cannot simply overwrite, because it would be updating a version it never saw:

| Step | Session A | Session B |
| :--- | :--- | :--- |
| 1 | \`BEGIN ISOLATION LEVEL REPEATABLE READ;\` \`SELECT stock\` → 5 | \`BEGIN ISOLATION LEVEL REPEATABLE READ;\` \`SELECT stock\` → 5 |
| 2 | \`UPDATE products SET stock = 4 WHERE id = 1;\` | |
| 3 | | \`UPDATE products SET stock = 4 WHERE id = 1;\` → waits |
| 4 | \`COMMIT;\` | \`ERROR:  could not serialize access due to concurrent update\` |

📌 **Interview term: serialization failure (SQLSTATE 40001)** — PostgreSQL's way of saying "letting you continue would break the isolation level". The transaction is aborted and the application must retry it from the start. Even \`SET stock = stock - 1\` gets this error at REPEATABLE READ (tested: final stock 4 after one success and one failure, versus 3 at READ COMMITTED), so a retry loop is mandatory at this level.

What it still allows is **write skew**, because the two doctors update different rows and there is no same-row conflict to detect:

<svg class="iq-diagram" width="100%" viewBox="0 0 800 300" role="img" aria-label="Write skew: Alice and Bob each read two doctors on call, each takes themselves off call, both commit, and nobody is on call">
  <defs>
    <marker id="sql12q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="220" height="64" rx="8"/>
  <text class="d-text" x="130" y="58" text-anchor="middle">A reads: 2 on call</text>
  <text class="d-sub" x="130" y="80" text-anchor="middle">so Alice may leave</text>
  <rect class="d-box" x="20" y="200" width="220" height="64" rx="8"/>
  <text class="d-text" x="130" y="228" text-anchor="middle">B reads: 2 on call</text>
  <text class="d-sub" x="130" y="250" text-anchor="middle">so Bob may leave</text>
  <rect class="d-box" x="300" y="30" width="200" height="64" rx="8"/>
  <text class="d-text" x="400" y="68" text-anchor="middle">Alice off call</text>
  <rect class="d-box" x="300" y="200" width="200" height="64" rx="8"/>
  <text class="d-text" x="400" y="238" text-anchor="middle">Bob off call</text>
  <rect class="d-box-accent" x="570" y="110" width="210" height="74" rx="8"/>
  <text class="d-text" x="675" y="142" text-anchor="middle">both commit</text>
  <text class="d-accent" x="675" y="166" text-anchor="middle">0 on call</text>
  <line class="d-edge" x1="244" y1="62" x2="292" y2="62" marker-end="url(#sql12q5-arrow)"/>
  <line class="d-edge" x1="244" y1="232" x2="292" y2="232" marker-end="url(#sql12q5-arrow)"/>
  <line class="d-edge-accent" x1="504" y1="62" x2="564" y2="130" marker-end="url(#sql12q5-arrow)"/>
  <line class="d-edge-accent" x1="504" y1="232" x2="564" y2="166" marker-end="url(#sql12q5-arrow)"/>
</svg>

| Step | Session A (Alice) | Session B (Bob) |
| :--- | :--- | :--- |
| 1 | \`BEGIN ISOLATION LEVEL REPEATABLE READ;\` | |
| 2 | \`UPDATE doctors SET on_call = 0 WHERE name = 'Alice' AND (SELECT COUNT(*) FROM doctors WHERE on_call = 1 AND name <> 'Alice') >= 1;\` | |
| 3 | | \`BEGIN ISOLATION LEVEL REPEATABLE READ;\` the same statement for Bob |
| 4 | \`COMMIT;\` → ok | \`COMMIT;\` → ok |
| 5 | Alice 0, Bob 0, Chen 0: nobody on call | |

The same timeline at READ COMMITTED ended the same way. The first runnable example shows the end state those two commits produce:

~~~sql
SELECT COUNT(*) AS on_call_before FROM doctors WHERE on_call = 1;
UPDATE doctors SET on_call = 0 WHERE name = 'Alice';
UPDATE doctors SET on_call = 0 WHERE name = 'Bob';
SELECT name, shift, on_call FROM doctors ORDER BY name;
SELECT COUNT(*) AS on_call_after FROM doctors WHERE on_call = 1;
~~~

~~~text
on_call_before
2

name | shift | on_call
Alice | night | 0
Bob | night | 0
Chen | day | 0

on_call_after
0
~~~

📌 **Interview term: write skew** — two transactions read an overlapping set of rows, each makes a decision based on what it read, and each writes a different row. Each would be correct alone; together they break the rule.

## 5. SERIALIZABLE: Snapshot Isolation Plus a Watchdog

The goal of SERIALIZABLE is simple to state: the result must equal **some** one-at-a-time order of the transactions. Run the two doctors one after the other and the guard works:

~~~sql
UPDATE doctors SET on_call = 0
WHERE name = 'Alice'
  AND (SELECT COUNT(*) FROM doctors WHERE on_call = 1 AND name <> 'Alice') >= 1;
UPDATE doctors SET on_call = 0
WHERE name = 'Bob'
  AND (SELECT COUNT(*) FROM doctors WHERE on_call = 1 AND name <> 'Bob') >= 1;
SELECT name, on_call FROM doctors ORDER BY name;
~~~

~~~text
name | on_call
Alice | 0
Bob | 1
Chen | 0
~~~

Bob's update found no other doctor on call and changed nothing. SERIALIZABLE guarantees concurrent runs end like this or fail.

📌 **Interview term: Serializable Snapshot Isolation (SSI)** — PostgreSQL's SERIALIZABLE implementation, added in 9.1 ([PostgreSQL wiki: SSI](https://wiki.postgresql.org/wiki/SSI); the first SSI in a production release according to [Ports and Grittner, VLDB 2012](https://www.drkp.net/papers/ssi-vldb12.pdf)). It runs on snapshots like REPEATABLE READ, records which transactions read data that others wrote, and when it sees a pattern of dependencies that could not happen in any serial order, it aborts one transaction. Reads never wait for locks.

📌 **Interview term: SIRead lock (predicate lock)** — the marker SSI keeps for "this transaction read these rows / pages / this table". It blocks nothing; it is only used to detect conflicts. The third example shows one:

~~~sql
BEGIN ISOLATION LEVEL SERIALIZABLE;
-- read the rows the rule depends on (PERFORM runs the query and discards the result)
DO $$ BEGIN PERFORM COUNT(*) FROM doctors WHERE on_call = 1; END $$;
-- the predicate lock that read left behind
SELECT l.locktype, c.relname, l.mode
FROM pg_locks AS l
JOIN pg_class AS c ON c.oid = l.relation
WHERE l.pid = pg_backend_pid() AND l.mode = 'SIReadLock'
ORDER BY c.relname;
COMMIT;
~~~

~~~text
locktype | relname | mode
relation | doctors | SIReadLock
~~~

The query scanned the whole table, so the lock covers the whole relation. With an index scan PostgreSQL would lock pages or tuples instead; a coarse lock is still correct but causes more false-positive aborts. The plan, and therefore the lock granularity, may differ on other data.

The doctor timeline at SERIALIZABLE (both sessions running the guarded \`UPDATE\`):

| Step | Session A (Alice) | Session B (Bob) |
| :--- | :--- | :--- |
| 1 | \`BEGIN ISOLATION LEVEL SERIALIZABLE;\` guarded update | |
| 2 | | \`BEGIN ISOLATION LEVEL SERIALIZABLE;\` guarded update (no wait) |
| 3 | \`COMMIT;\` → ok | |
| 4 | | \`COMMIT;\` → error below |
| 5 | Alice 0, **Bob 1**, Chen 0 | |

~~~text
ERROR:  could not serialize access due to read/write dependencies among transactions
DETAIL:  Reason code: Canceled on identification as a pivot, during commit attempt.
HINT:  The transaction might succeed if retried.
~~~

Retried, Bob's transaction ran against the new data, found no one else on call, updated zero rows and committed: the rule held. That is the deal SERIALIZABLE offers: correctness for any mix of transactions, in exchange for **retrying on SQLSTATE 40001**.

Practical rules for SERIALIZABLE in PostgreSQL:

- Retry the whole transaction (re-read, re-decide), not just the failed statement; keep side effects such as emails outside it.
- All transactions that touch the invariant must use SERIALIZABLE; one READ COMMITTED writer is invisible to SSI's checks.
- Keep transactions short; long ones raise the abort rate.
- For long reports use \`BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY DEFERRABLE;\`: it may wait at the start until it can take a snapshot that can never be part of an anomaly, then runs without any risk of a serialization failure ([PostgreSQL 16: SET TRANSACTION](https://www.postgresql.org/docs/16/sql-set-transaction.html)). Run here, \`current_setting('transaction_isolation')\`, \`transaction_read_only\` and \`transaction_deferrable\` reported \`serializable | on | on\`.

Retry storms, advisory locks and other production trade-offs are on [Serializable isolation pitfalls — write skew, retry storms, and when advisory locks beat SSI?](/interview-question/serializable-isolation-pitfalls-write-skew-retry-storms-and-when-advisory-locks-)

## 6. The Lock-Based Alternative at READ COMMITTED

Instead of letting SSI detect the conflict, you can make the transactions queue up: lock every row the rule depends on before deciding.

~~~sql
BEGIN;
SELECT name FROM doctors WHERE on_call = 1 ORDER BY name FOR UPDATE;
UPDATE doctors SET on_call = 0 WHERE name = 'Alice';
COMMIT;
~~~

~~~text
name
Alice
Bob
~~~

With two sessions: A locked Alice and Bob; B's identical \`SELECT ... FOR UPDATE\` waited; after A committed, B's query re-checked the rows and returned only \`Bob\`. B's app then sees one doctor on call and refuses. Final state: Alice 0, Bob 1. This works when the rows to lock already exist; it cannot lock rows that do not exist yet (for example "no overlapping booking"), which is where SERIALIZABLE, a unique or exclusion constraint, or an advisory lock fits. Details: [FOR UPDATE vs FOR UPDATE NOWAIT vs FOR UPDATE SKIP LOCKED — which to use when?](/interview-question/for-update-vs-for-update-nowait-vs-for-update-skip-locked-which-to-use-when) Locking in a consistent order matters, or you trade write skew for deadlocks: [What is a deadlock and how do you prevent it?](/interview-question/what-is-a-deadlock-and-how-do-you-prevent-it)

## 7. Verified: Running the Code

The two SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above); both returned the same rows on PostgreSQL 16.15. The two PostgreSQL examples ran on PostgreSQL 16.15 in a scratch database with the same schema. The two-session runs, each against a freshly seeded scratch database: READ UNCOMMITTED dirty-read attempt; non-repeatable read and phantom at READ COMMITTED and REPEATABLE READ; read-then-write lost update and atomic decrement at both levels; the READ COMMITTED re-check edge case; the REPEATABLE READ first-statement snapshot; the guarded doctor update at all three levels; the \`FOR UPDATE\` fix; and the SERIALIZABLE retry.

Example 1, the write-skew end state:

~~~text
on_call_before
2

name | shift | on_call
Alice | night | 0
Bob | night | 0
Chen | day | 0

on_call_after
0
~~~

Example 2, the serial schedule:

~~~text
name | on_call
Alice | 0
Bob | 1
Chen | 0
~~~

Example 3, the SIRead lock:

~~~text
locktype | relname | mode
relation | doctors | SIReadLock
~~~

Example 4, the \`FOR UPDATE\` lock query:

~~~text
name
Alice
Bob
~~~

## 8. What the Application Must Do at Each Level

| Level | Typical use | Your code must |
| :--- | :--- | :--- |
| READ COMMITTED | Default for OLTP | Use atomic updates (\`x = x - 1\`), constraints, \`FOR UPDATE\` for read-then-write and multi-row rules |
| REPEATABLE READ | Consistent multi-query reads, reports | Retry on 40001 if it writes; still guard multi-row rules |
| SERIALIZABLE | Multi-row invariants without hand-written locks | Retry the whole transaction on 40001, keep it short, run all writers of the invariant at this level |

## Common Pitfalls

- **Believing REPEATABLE READ is "safe enough" for rules across rows.** It is snapshot isolation; write skew passes straight through (nobody on call, above).
- **Raising the level without a retry loop.** At REPEATABLE READ and SERIALIZABLE, SQLSTATE 40001 is normal, not a bug.
- **Mixing levels.** SSI only protects transactions that all run at SERIALIZABLE; one READ COMMITTED writer can break the invariant.
- **Expecting the snapshot at \`BEGIN\`.** It is taken at the first statement; anything committed in between is visible.
- **Trusting a guarded \`UPDATE ... WHERE (SELECT COUNT(*) ...)\` at READ COMMITTED.** The subquery reads a snapshot that ignores the other open transaction; it only works serially.
- **Long serializable transactions and coarse predicate locks.** Sequential scans lock whole tables and raise false-positive aborts; index the columns the rule reads.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Three real levels:</strong> <span style="color:#f0e2c8;">PostgreSQL accepts four names but implements three; READ UNCOMMITTED runs as READ COMMITTED, so there are never dirty reads. All three use MVCC snapshots, and readers do not block writers.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. READ COMMITTED:</strong> <span style="color:#f0e2c8;">The default takes a <strong style="color:#ffca28;">new snapshot per statement</strong>: non-repeatable reads, phantoms, lost updates in read-then-write code and write skew are possible. A blocked <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UPDATE</code> waits and then re-checks its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code> on the newest row, which keeps <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stock = stock - 1</code> correct.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. REPEATABLE READ:</strong> <span style="color:#f0e2c8;">One snapshot from the first statement: no non-repeatable reads and, stricter than the standard, no phantoms. Two transactions updating the same row make the second fail with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">could not serialize access due to concurrent update</code>, SQLSTATE <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">40001</code>. Write skew still passes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. SERIALIZABLE:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">SSI</strong>, since 9.1: snapshots plus SIRead predicate locks that track who read what. A dangerous read/write pattern, like two doctors both going off call, makes one commit fail with 40001, so every anomaly is prevented without read locks.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. What the app does:</strong> <span style="color:#f0e2c8;">Retry the whole transaction on 40001, keep it short, run every writer of the invariant at SERIALIZABLE, and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">READ ONLY DEFERRABLE</code> for long reports. Or stay at READ COMMITTED and lock the rows the rule reads with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FOR UPDATE</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does PostgreSQL REPEATABLE READ allow phantoms?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Its snapshot hides rows inserted by others after the snapshot, so a repeated count stayed at 2 in my test while another session inserted a matching row. The standard allows phantoms here; PostgreSQL is stricter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When exactly is the REPEATABLE READ snapshot taken?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At the first statement of the transaction, not at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BEGIN</code>. A change committed between <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BEGIN</code> and the first query is visible; anything committed after that first query is not.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between the two 40001 messages?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">concurrent update</code> comes from REPEATABLE READ or SERIALIZABLE when you update a row someone else changed after your snapshot. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">read/write dependencies among transactions</code> comes only from SSI at SERIALIZABLE, when it detects a pattern that no serial order could produce. Both mean retry.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use SERIALIZABLE everywhere?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Transactions can fail and must be retried, abort rates rise with long transactions and coarse predicate locks, and every writer must use it. Many teams use READ COMMITTED plus targeted <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FOR UPDATE</code> or constraints, and SERIALIZABLE only for invariants that are hard to lock.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a guarded UPDATE with a COUNT subquery prevent write skew at READ COMMITTED?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Each statement reads a snapshot that ignores the other open transaction, so both guards saw another doctor on call and both updates committed. It only works if the transactions run one after the other, or at SERIALIZABLE.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Snapshot | The committed data a query is allowed to see |
| Statement-level snapshot | READ COMMITTED: a new snapshot for every statement |
| Row lock wait and re-check | A blocked \`UPDATE\` waits, then re-tests its \`WHERE\` on the new row version |
| Snapshot isolation | One snapshot for the whole transaction: PostgreSQL REPEATABLE READ |
| Serialization failure (40001) | The error that tells the app to retry the whole transaction |
| Write skew | Two transactions read the same rows and write different ones, breaking a rule |
| Serializable Snapshot Isolation (SSI) | PostgreSQL SERIALIZABLE: snapshots plus dependency tracking that aborts dangerous patterns |
| SIRead lock (predicate lock) | Non-blocking marker of what a serializable transaction read |

**Conclusion:** PostgreSQL has three real levels. READ COMMITTED takes a snapshot per statement and lets non-repeatable reads, phantoms, lost updates and write skew through, while making blocked \`UPDATE\`s wait and re-check. REPEATABLE READ gives one snapshot per transaction, blocks phantoms (more than the standard requires) and turns same-row conflicts into 40001 errors, but still allows write skew. SERIALIZABLE adds SSI, which detects the dangerous read/write patterns and aborts one transaction, so every anomaly is prevented at the price of retrying. Pick the level by the invariant you protect, and either retry on 40001 or lock explicitly.`,
    examples: [
      {
        label: `What write skew leaves behind: both guarded updates applied, nobody on call`,
        code: `-- What write skew leaves behind: each doctor checked "2 on call, so I may leave",
-- and both updates were applied.
SELECT COUNT(*) AS on_call_before FROM doctors WHERE on_call = 1;
UPDATE doctors SET on_call = 0 WHERE name = 'Alice';
UPDATE doctors SET on_call = 0 WHERE name = 'Bob';
SELECT name, shift, on_call FROM doctors ORDER BY name;
SELECT COUNT(*) AS on_call_after FROM doctors WHERE on_call = 1;`,
      },
      {
        label: `The same two requests run one after the other: the guard keeps one doctor on call`,
        code: `-- The same two requests run one after the other (a serial schedule),
-- each guarded by the rule "someone else must still be on call".
UPDATE doctors SET on_call = 0
WHERE name = 'Alice'
  AND (SELECT COUNT(*) FROM doctors WHERE on_call = 1 AND name <> 'Alice') >= 1;
UPDATE doctors SET on_call = 0
WHERE name = 'Bob'
  AND (SELECT COUNT(*) FROM doctors WHERE on_call = 1 AND name <> 'Bob') >= 1;
SELECT name, on_call FROM doctors ORDER BY name;`,
      },
      {
        label: `PostgreSQL: a read under SERIALIZABLE leaves an SIRead predicate lock`,
        code: `BEGIN ISOLATION LEVEL SERIALIZABLE;
-- read the rows the rule depends on (PERFORM runs the query and discards the result)
DO $$ BEGIN PERFORM COUNT(*) FROM doctors WHERE on_call = 1; END $$;
-- the predicate lock that read left behind
SELECT l.locktype, c.relname, l.mode
FROM pg_locks AS l
JOIN pg_class AS c ON c.oid = l.relation
WHERE l.pid = pg_backend_pid() AND l.mode = 'SIReadLock'
ORDER BY c.relname;
COMMIT;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: the lock-based fix at READ COMMITTED locks every on-call row first`,
        code: `BEGIN;
SELECT name FROM doctors WHERE on_call = 1 ORDER BY name FOR UPDATE;
UPDATE doctors SET on_call = 0 WHERE name = 'Alice';
COMMIT;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
];

export default augments;
