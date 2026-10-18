/**
 * SQL ULTRA — batch 06: Classic interview problems (finding and deleting
 * duplicates, the Nth highest salary, string aggregation, pivoting). Every
 * example was run by scripts/verify-sql-examples.ts (sql.js 1.10.2 like the
 * page, PostgreSQL 16 for postgres examples); quoted output is that run's output.
 */
import type { SqlUltraAugment } from "./sql-augments.types";

const augments: SqlUltraAugment[] = [
  {
    title: `How do you find duplicate rows in a table?`,
    difficulty: "easy",
    seoDescription: `Find duplicate rows with GROUP BY and HAVING COUNT(*) > 1, see every copy with a window COUNT, and handle NULLs, case and spaces. All examples run.`,
    description: `**Question presented to candidate:**
"Our \`customers\` table was loaded from three different sign-up forms and we think some people are in it more than once. How would you find the duplicates with SQL, and what exactly counts as a duplicate?"

**What a strong answer should cover:**
- Define the duplicate first: which columns make two rows "the same" (here the email), since the surrogate \`id\` is always unique
- The core pattern: \`GROUP BY\` the key columns, then \`HAVING COUNT(*) > 1\` to keep only groups with more than one row
- Seeing the full duplicate rows, not just the keys: a window \`COUNT(*) OVER (PARTITION BY ...)\`, or a join/\`EXISTS\` back to the grouped keys
- Dirty data: case and stray spaces (\`LOWER(TRIM(email))\`), and that \`GROUP BY\` puts all NULLs in one group even though \`NULL = NULL\` is not true
- Engine detail: PostgreSQL and SQLite compare text case-sensitively by default, MySQL default collation does not
- Prevention: a \`UNIQUE\` constraint or unique expression index once the data is clean

**Clarifying questions expected:**
- Which columns define a duplicate: the whole row, or a business key like the email?
- Should \`Asha@Example.com\` and \`asha@example.com\` count as the same person?
- Do you only want to report duplicates, or also remove them afterwards?

**Code / implementation expected:** Yes — a \`GROUP BY ... HAVING COUNT(*) > 1\` query, plus one way to list the full duplicate rows.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  email TEXT,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  signed_up DATE NOT NULL
);
INSERT INTO customers (id, email, name, city, signed_up) VALUES
  (1, 'asha@example.com', 'Asha', 'Pune', '2024-01-05'),
  (2, 'ben@example.com', 'Ben', 'Delhi', '2024-01-07'),
  (3, 'asha@example.com', 'Asha', 'Pune', '2024-02-11'),
  (4, 'Chen@Example.com', 'Chen', 'Mumbai', '2024-02-15'),
  (5, 'chen@example.com ', 'Chen', 'Mumbai', '2024-03-02'),
  (6, 'dara@example.com', 'Dara', 'Pune', '2024-03-09'),
  (7, 'asha@example.com', 'Asha K', 'Pune', '2024-03-20'),
  (8, NULL, 'Eli', 'Delhi', '2024-03-22'),
  (9, NULL, 'Fay', 'Delhi', '2024-03-25'),
  (10, 'ben@example.com', 'Ben', 'Delhi', '2024-04-01');
\`\`\``,
    answer: `**Target Audience:** Beginners who know \`SELECT\` and want the standard duplicate-finding pattern, and candidates who want the details interviewers probe (NULLs, case, collation).
**Difficulty:** Easy
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15, both run for this page. MySQL behaviour is cited from its manual.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result shown was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

A school is printing ID cards. The office merged three spreadsheets of sign-ups, and now the printer is about to make two cards for Ben and three for Asha. Nobody typed the same row twice on purpose: one form stored \`Chen@Example.com\`, another \`chen@example.com \` with a space on the end, and a third had Asha twice because she pressed Submit twice.

Before anyone deletes anything, someone has to answer a simple question: **which people appear more than once, and how many times?** That is "find the duplicates". It is the first step of every data clean-up, every migration and every "why are our customer numbers too high?" investigation, and it is one of the most common SQL screening questions because it tests whether you really understand \`GROUP BY\` and \`HAVING\`.

## 2. First, Decide What "Duplicate" Means

Every row in \`customers\` has a different \`id\`, so no two rows are literally identical. A duplicate is always defined by **some** columns:

- **Same business key:** the same email means the same person (rows 1, 3 and 7 for Asha, even though row 7 spells the name \`Asha K\`).
- **Same values in every column except the id:** rows 1 and 3 are exact copies apart from id and date.
- **Same after cleaning:** \`Chen@Example.com\` and \`chen@example.com \` (trailing space) are the same email to a human, but not to the database.

📌 **Interview term: business key (natural key)** — the column or columns that identify a real-world thing, like an email or a passport number, as opposed to the generated **surrogate key** (\`id\`). Duplicates are defined on the business key.

Ask the interviewer which definition they want. The SQL is easy once that is settled.

## 3. The Core Pattern: GROUP BY ... HAVING COUNT(*) > 1

📌 **Interview term: GROUP BY** — puts rows with equal values in the listed columns into one group and returns one output row per group. Aggregate functions such as \`COUNT(*)\` then summarise each group. See [How does GROUP BY work with aggregate functions?](/interview-question/how-does-group-by-work-with-aggregate-functions)

📌 **Interview term: HAVING** — a filter on groups, applied after grouping and counting. \`WHERE\` filters single rows before grouping, so it cannot see \`COUNT(*)\`. More in [What is the difference between WHERE and HAVING?](/interview-question/what-is-the-difference-between-where-and-having)

<svg class="iq-diagram" width="100%" viewBox="0 0 780 330" role="img" aria-label="Rows are grouped by email, each group is counted, and HAVING keeps only the groups whose count is above one">
  <defs>
    <marker id="sql06q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="200" height="40" rx="8"/>
  <text class="d-text" x="120" y="46" text-anchor="middle">rows</text>
  <rect class="d-box" x="20" y="80" width="200" height="34" rx="6"/>
  <text class="d-sub" x="120" y="102" text-anchor="middle">1 asha@example.com</text>
  <rect class="d-box" x="20" y="124" width="200" height="34" rx="6"/>
  <text class="d-sub" x="120" y="146" text-anchor="middle">3 asha@example.com</text>
  <rect class="d-box" x="20" y="168" width="200" height="34" rx="6"/>
  <text class="d-sub" x="120" y="190" text-anchor="middle">7 asha@example.com</text>
  <rect class="d-box" x="20" y="212" width="200" height="34" rx="6"/>
  <text class="d-sub" x="120" y="234" text-anchor="middle">6 dara@example.com</text>
  <rect class="d-box" x="20" y="256" width="200" height="34" rx="6"/>
  <text class="d-sub" x="120" y="278" text-anchor="middle">2 and 10 ben@example.com</text>
  <rect class="d-box-muted" x="290" y="20" width="200" height="40" rx="8"/>
  <text class="d-text" x="390" y="46" text-anchor="middle">GROUP BY email</text>
  <rect class="d-box" x="290" y="124" width="200" height="34" rx="6"/>
  <text class="d-sub" x="390" y="146" text-anchor="middle">asha: COUNT 3</text>
  <rect class="d-box" x="290" y="212" width="200" height="34" rx="6"/>
  <text class="d-sub" x="390" y="234" text-anchor="middle">dara: COUNT 1</text>
  <rect class="d-box" x="290" y="256" width="200" height="34" rx="6"/>
  <text class="d-sub" x="390" y="278" text-anchor="middle">ben: COUNT 2</text>
  <rect class="d-box-muted" x="560" y="20" width="200" height="40" rx="8"/>
  <text class="d-text" x="660" y="46" text-anchor="middle">HAVING COUNT &gt; 1</text>
  <rect class="d-box-accent" x="560" y="124" width="200" height="34" rx="6"/>
  <text class="d-text" x="660" y="146" text-anchor="middle">asha 3</text>
  <rect class="d-box-accent" x="560" y="256" width="200" height="34" rx="6"/>
  <text class="d-text" x="660" y="278" text-anchor="middle">ben 2</text>
  <path class="d-edge" d="M 224 141 L 286 141" marker-end="url(#sql06q1-arrow)"/>
  <path class="d-edge" d="M 224 229 L 286 229" marker-end="url(#sql06q1-arrow)"/>
  <path class="d-edge" d="M 224 273 L 286 273" marker-end="url(#sql06q1-arrow)"/>
  <path class="d-edge-accent" d="M 494 141 L 556 141" marker-end="url(#sql06q1-arrow)"/>
  <path class="d-edge-accent" d="M 494 273 L 556 273" marker-end="url(#sql06q1-arrow)"/>
  <path class="d-edge-dashed" d="M 494 229 L 530 229"/>
  <text class="d-sub" x="536" y="234">dropped</text>
</svg>

Each email becomes one group, each group is counted, and \`HAVING COUNT(*) > 1\` throws away the groups of size one (Dara). The first example, on SQLite:

~~~text
email | copies
NULL | 2
asha@example.com | 3
ben@example.com | 2
~~~

Two surprises are already in this tiny result:

1. **A NULL "duplicate".** Eli and Fay have no email, and \`GROUP BY\` put them together in one group of 2. That looks odd because \`NULL = NULL\` is not true in SQL (it is NULL, see the check below), but the SQL standard treats NULLs as "not distinct" for grouping, so all NULLs share a group. Two customers without an email are not the same person, so add \`WHERE email IS NOT NULL\` when the key is nullable. See [How does SQL handle NULL values?](/interview-question/how-does-sql-handle-null-values)
2. **Chen is missing.** \`Chen@Example.com\` and \`chen@example.com \` are different strings, so they landed in separate groups of size 1. The next section fixes that.

The same query on PostgreSQL 16 returns the same groups, but sorts NULL **last** in ascending order where SQLite sorts it first:

~~~text
email | copies
asha@example.com | 3
ben@example.com | 2
NULL | 2
~~~

The equality check, run in SQLite (1 is true, 0 is false):

~~~text
eq_case | eq_space | eq_null
0 | 0 | NULL
~~~

Case matters, a trailing space matters, and \`NULL = NULL\` gives NULL. PostgreSQL returns \`f | f | NULL\` for the same query.

## 4. Seeing the Whole Rows, Not Just the Keys

\`GROUP BY\` collapses each group into one row, so the ids, names and dates disappear. To decide which copy to keep you need to see every row.

📌 **Interview term: window function** — a function computed over a set of rows related to the current row (its **window**) without collapsing them. \`COUNT(*) OVER (PARTITION BY x)\` writes the size of each row group next to every row. See [What are window functions?](/interview-question/what-are-window-functions)

<svg class="iq-diagram" width="100%" viewBox="0 0 760 230" role="img" aria-label="GROUP BY collapses each group to one row, while a window COUNT keeps every row and writes the group size next to it">
  <rect class="d-box-muted" x="20" y="20" width="330" height="40" rx="8"/>
  <text class="d-text" x="185" y="46" text-anchor="middle">GROUP BY email</text>
  <rect class="d-box" x="20" y="80" width="330" height="40" rx="6"/>
  <text class="d-sub" x="185" y="105" text-anchor="middle">asha@example.com | 3</text>
  <rect class="d-box" x="20" y="134" width="330" height="40" rx="6"/>
  <text class="d-sub" x="185" y="159" text-anchor="middle">one row per group, ids are gone</text>
  <rect class="d-box-muted" x="410" y="20" width="330" height="40" rx="8"/>
  <text class="d-text" x="575" y="46" text-anchor="middle">COUNT(*) OVER (PARTITION BY email)</text>
  <rect class="d-box-accent" x="410" y="80" width="330" height="34" rx="6"/>
  <text class="d-sub" x="575" y="102" text-anchor="middle">1 | asha@example.com | 3</text>
  <rect class="d-box-accent" x="410" y="124" width="330" height="34" rx="6"/>
  <text class="d-sub" x="575" y="146" text-anchor="middle">3 | asha@example.com | 3</text>
  <rect class="d-box-accent" x="410" y="168" width="330" height="34" rx="6"/>
  <text class="d-sub" x="575" y="190" text-anchor="middle">7 | asha@example.com | 3</text>
</svg>

The second example uses a window count, groups on the cleaned email \`LOWER(TRIM(email))\`, and leaves NULL emails out. Window functions cannot be used in \`WHERE\`, so the count is computed in a subquery and filtered outside:

~~~text
id | email | name | signed_up | copies
1 | asha@example.com | Asha | 2024-01-05 | 3
3 | asha@example.com | Asha | 2024-02-11 | 3
7 | asha@example.com | Asha K | 2024-03-20 | 3
2 | ben@example.com | Ben | 2024-01-07 | 2
10 | ben@example.com | Ben | 2024-04-01 | 2
4 | Chen@Example.com | Chen | 2024-02-15 | 2
5 | chen@example.com  | Chen | 2024-03-02 | 2
~~~

Now Chen shows up: rows 4 and 5 are the same email once case and spaces are removed. A quick sanity check on how much cleaning changes the picture:

~~~text
rows_total | distinct_emails | distinct_normalised
10 | 5 | 4
~~~

📌 **Interview term: normalisation key (match key)** — an expression that maps every spelling of the same value to one canonical form, here \`LOWER(TRIM(email))\`. Grouping on it finds duplicates the raw column hides. (Not to be confused with [database normalization](/interview-question/what-is-database-normalization), which is about table design.)

A version that works without window functions (older MySQL, for instance) joins the grouped keys back to the table:

~~~sql
SELECT c.*
FROM customers AS c
JOIN (
  SELECT email FROM customers
  WHERE email IS NOT NULL
  GROUP BY email HAVING COUNT(*) > 1
) AS d ON d.email = c.email
ORDER BY c.email, c.id;
~~~

## 5. Duplicates Across Several Columns

When "duplicate" means "the same in every meaningful column", list all of them in \`GROUP BY\`. The third example also shows the smallest id and every id in the group. \`GROUP_CONCAT\` is the SQLite (and MySQL) name; PostgreSQL spells it \`STRING_AGG(id::text, ',')\`, which is the subject of [How do you aggregate values into a single string?](/interview-question/how-do-you-aggregate-values-into-a-single-string)

~~~text
email | name | city | copies | first_id | ids
asha@example.com | Asha | Pune | 2 | 1 | 1,3
ben@example.com | Ben | Delhi | 2 | 2 | 2,10
~~~

Row 7 (\`Asha K\`) is no longer counted, because its name differs. Whether that is right depends on your definition from section 2: by email it is a duplicate, by full row it is not.

\`SELECT DISTINCT\` gives the opposite view, one row per distinct combination; comparing \`COUNT(*)\` with \`COUNT(DISTINCT ...)\` tells you how many extra rows exist. See [What does DISTINCT do and what is its cost?](/interview-question/what-does-distinct-do-and-what-is-its-cost)

## 6. Listing Only the Extra Copies

Often the real question is "which rows would I delete?". Those are the rows for which an **earlier** row with the same key exists. The fourth example uses a correlated \`EXISTS\`:

~~~text
id | email | name
3 | asha@example.com | Asha
7 | asha@example.com | Asha K
10 | ben@example.com | Ben
~~~

Asha keeps row 1 and Ben keeps row 2; rows 3, 7 and 10 are the extras. The \`earlier.id < later.id\` condition matters: without it every row matches itself, and a plain self-join on email would turn a group of 3 into 9 pairs. Deleting exactly these rows, and choosing which copy survives, is covered in [How do you delete duplicate rows but keep one?](/interview-question/how-do-you-delete-duplicate-rows-but-keep-one). The \`EXISTS\` mechanics are in [What is the difference between EXISTS and IN?](/interview-question/what-is-the-difference-between-exists-and-in)

## 7. Engine Differences That Change the Answer

| Behaviour | SQLite 3.45 | PostgreSQL 16 | MySQL 8.x |
| :--- | :--- | :--- | :--- |
| \`'x' = 'X'\` | false (run above) | false (run above) | true with the default \`utf8mb4_0900_ai_ci\` collation |
| NULLs in \`GROUP BY\` | one group (run above) | one group (run above) | one group |
| NULL position in \`ORDER BY email\` | first | last | first |
| Window \`COUNT(*) OVER\` | yes | yes | yes, from MySQL 8.0 |
| List ids of a group | \`GROUP_CONCAT(id, ',')\` | \`STRING_AGG(id::text, ',')\` | \`GROUP_CONCAT(id)\` |

The MySQL rows come from the [MySQL 8.0 manual on case sensitivity in string searches](https://dev.mysql.com/doc/refman/8.0/en/case-sensitivity.html): the default character set and collation are \`utf8mb4\` and \`utf8mb4_0900_ai_ci\`, so non-binary comparisons and grouping are case-insensitive. The NULL ordering rule is from the [MySQL 8.4 manual on NULL values](https://dev.mysql.com/doc/refman/8.4/en/null-values.html) (NULLs sort before other values in ascending order). On MySQL the first example would therefore already merge Chen; it was not run on MySQL for this page.

## 8. Prevent Duplicates Coming Back

📌 **Interview term: unique index on an expression** — an index that enforces uniqueness of a computed value, such as \`LOWER(TRIM(email))\`, not just of the raw column. Both SQLite and PostgreSQL support it.

Trying to create it while duplicates still exist is itself a duplicate detector. PostgreSQL 16:

~~~text
ERROR:  could not create unique index "customers_email_norm_uq"
DETAIL:  Key (lower(TRIM(BOTH FROM email)))=(ben@example.com) is duplicated.
~~~

SQLite (sql.js 1.10.2):

~~~text
ERR UNIQUE constraint failed: index 'customers_email_norm_uq'
~~~

After the clean-up, the same statement succeeds and every future insert is checked. A unique index allows any number of NULLs in both engines by default; PostgreSQL 15 added \`UNIQUE NULLS NOT DISTINCT\` to make NULLs collide ([PostgreSQL 15 release notes](https://www.postgresql.org/docs/release/15.0/)). Background on constraints: [What is the difference between a primary key and a unique constraint?](/interview-question/what-is-the-difference-between-a-primary-key-and-a-unique-constraint)

## 9. Verified: Running the Code

All four examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above). The PostgreSQL output and error messages above were run on PostgreSQL 16.15 in a scratch database with the same schema.

Example 1, \`GROUP BY ... HAVING\`:

~~~text
email | copies
NULL | 2
asha@example.com | 3
ben@example.com | 2
~~~

Example 2, window count on the cleaned email:

~~~text
id | email | name | signed_up | copies
1 | asha@example.com | Asha | 2024-01-05 | 3
3 | asha@example.com | Asha | 2024-02-11 | 3
7 | asha@example.com | Asha K | 2024-03-20 | 3
2 | ben@example.com | Ben | 2024-01-07 | 2
10 | ben@example.com | Ben | 2024-04-01 | 2
4 | Chen@Example.com | Chen | 2024-02-15 | 2
5 | chen@example.com  | Chen | 2024-03-02 | 2
~~~

Example 3, several columns:

~~~text
email | name | city | copies | first_id | ids
asha@example.com | Asha | Pune | 2 | 1 | 1,3
ben@example.com | Ben | Delhi | 2 | 2 | 2,10
~~~

Example 4, only the extra copies:

~~~text
id | email | name
3 | asha@example.com | Asha
7 | asha@example.com | Asha K
10 | ben@example.com | Ben
~~~

## Common Pitfalls

- **Grouping by the surrogate key.** \`GROUP BY id\` never finds anything, because ids are unique. Group by the business key.
- **Counting NULLs as duplicates.** All NULL keys fall into one group; filter them with \`WHERE key IS NOT NULL\` unless "missing" really means "same".
- **Trusting raw text equality.** Case and trailing spaces hide real duplicates on PostgreSQL and SQLite; on MySQL the default collation merges case for you, which can surprise in the other direction.
- **Putting the aggregate in WHERE.** \`WHERE COUNT(*) > 1\` is an error; the group filter belongs in \`HAVING\`.
- **Self-joining without an ordering condition.** \`a.email = b.email\` alone matches every row with itself and produces n² pairs per group; add \`a.id < b.id\` or use \`EXISTS\`.
- **Selecting non-grouped columns.** \`SELECT id, email ... GROUP BY email\` is rejected by PostgreSQL; SQLite accepts it and returns the id of an arbitrary row in the group, which looks like an answer but is not one.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define the duplicate:</strong> <span style="color:#f0e2c8;">First I ask what makes two rows the same. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">id</code> is always unique, so a duplicate means the same <strong style="color:#ffca28;">business key</strong>, here the email, or the same values in every column except the id.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Core query:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY email HAVING COUNT(*) &gt; 1</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY</code> puts rows with equal emails in one group, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(*)</code> measures each group, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HAVING</code> filters groups after they are counted, which <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code> cannot do.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. See the rows:</strong> <span style="color:#f0e2c8;">That gives keys, not rows. To see every copy with its id I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(*) OVER (PARTITION BY email)</code> in a subquery and keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">copies &gt; 1</code>, or join the grouped keys back to the table.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Dirty data:</strong> <span style="color:#f0e2c8;">Real duplicates hide behind case and spaces, so I group on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LOWER(TRIM(email))</code>. I also exclude NULLs, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY</code> puts all NULL emails into one group even though <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NULL = NULL</code> is not true.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Then fix it:</strong> <span style="color:#f0e2c8;">Once found, I delete the extra copies keeping one, and add a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNIQUE</code> constraint or a unique index on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LOWER(TRIM(email))</code> so it cannot happen again; creating that index fails while duplicates exist, which is also a quick test.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why HAVING and not WHERE?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code> runs before grouping, on single rows, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(*)</code> does not exist yet. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HAVING</code> runs after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY</code> on the groups. Putting an aggregate in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code> is an error: SQLite says <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">misuse of aggregate function COUNT()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you find rows that are identical in every column?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Group by every column except the surrogate key: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY email, name, city HAVING COUNT(*) &gt; 1</code>. If the table has no key at all, group by all columns; SQLite <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rowid</code> or PostgreSQL <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ctid</code> can then tell the copies apart.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a self-join a good way to do it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXISTS</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">earlier.id &lt; later.id</code> lists only the extra copies, which is exactly what you delete. A plain self-join on email without the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code> condition multiplies rows: a group of 3 gives 9 pairs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this perform on a big table?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY</code> sorts or hashes the whole table once. An index on the key column lets the engine read it in order, and for the window version an index on the partition expression helps too. It is one pass, not a loop.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would MySQL give the same answer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not always. MySQL default collation <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">utf8mb4_0900_ai_ci</code> is case- and accent-insensitive, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY email</code> already merges <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Chen@Example.com</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">chen@example.com</code>. PostgreSQL and SQLite compare text exactly.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Business key (natural key) | The real-world identifier duplicates are defined on, such as an email |
| GROUP BY | Puts rows with equal values into groups, one output row per group |
| HAVING | Filters groups after aggregation |
| Window function | Computes over related rows without collapsing them, such as \`COUNT(*) OVER (PARTITION BY x)\` |
| Normalisation key (match key) | A cleaned expression like \`LOWER(TRIM(email))\` that maps every spelling to one value |
| Unique index on an expression | Enforces uniqueness of a computed value, preventing new duplicates |

**Conclusion:** Finding duplicates is two decisions and one query. Decide which columns define "the same" (a business key, every column but the id, or a cleaned expression), and decide what to do with NULLs. Then \`GROUP BY\` those columns with \`HAVING COUNT(*) > 1\` to get the duplicate keys, a window \`COUNT(*) OVER (PARTITION BY ...)\` to see every copy, or \`EXISTS\` with an \`earlier.id < later.id\` condition to list exactly the rows you would delete. Remember that SQLite and PostgreSQL compare text exactly while MySQL default collation does not, and finish by adding a unique constraint so the clean-up stays clean.`,
    examples: [
      {
        label: `The core pattern: group by the key, keep groups with more than one row`,
        code: `SELECT email, COUNT(*) AS copies
FROM customers
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY email;`,
      },
      {
        label: `Every duplicate row in full, matching emails case- and space-insensitively`,
        code: `SELECT id, email, name, signed_up, copies
FROM (
  SELECT c.*,
         COUNT(*) OVER (PARTITION BY LOWER(TRIM(email))) AS copies
  FROM customers AS c
  WHERE email IS NOT NULL
) AS t
WHERE copies > 1
ORDER BY LOWER(TRIM(email)), id;`,
      },
      {
        label: `Duplicates across several columns, with the ids in each group (SQLite GROUP_CONCAT)`,
        code: `SELECT email, name, city, COUNT(*) AS copies, MIN(id) AS first_id, GROUP_CONCAT(id, ',') AS ids
FROM customers
GROUP BY email, name, city
HAVING COUNT(*) > 1
ORDER BY email;`,
      },
      {
        label: `Only the extra copies: rows that have an earlier row with the same email`,
        code: `SELECT later.id, later.email, later.name
FROM customers AS later
WHERE EXISTS (
  SELECT 1
  FROM customers AS earlier
  WHERE earlier.email = later.email
    AND earlier.id < later.id
)
ORDER BY later.id;`,
      },
    ],
  },
  {
    title: `How do you delete duplicate rows but keep one?`,
    difficulty: "medium",
    seoDescription: `Delete duplicates but keep one row with MIN(id) or ROW_NUMBER(), avoid the NULL-key trap, handle keyless tables with rowid or ctid. All examples run.`,
    description: `**Question presented to candidate:**
"We found duplicate subscribers: the same email signed up two or three times. Write the SQL to delete the duplicates but keep exactly one row per email. How do you choose which one survives, and how would you do it safely on a big production table?"

**What a strong answer should cover:**
- Decide the survivor rule first (oldest id, newest row, most complete row) and make it deterministic with a tie-breaker
- Pattern 1: \`DELETE ... WHERE id NOT IN (SELECT MIN(id) ... GROUP BY key)\`; pattern 2: \`ROW_NUMBER() OVER (PARTITION BY key ORDER BY ...)\` and delete \`rn > 1\`
- NULL keys: \`GROUP BY\` lumps all NULLs together, so a careless query deletes rows that are not duplicates
- Tables without a key: SQLite \`rowid\`, PostgreSQL \`ctid\`, or copy the distinct rows into a new table
- Engine detail: PostgreSQL \`DELETE ... USING\` and \`RETURNING\`; MySQL rejects a subquery on the target table (error 1093) unless it is wrapped in a derived table
- Safety: preview with a \`SELECT\` first, run in a transaction, batch large deletes, then add a \`UNIQUE\` constraint

**Clarifying questions expected:**
- Which copy should we keep: the first sign-up, the latest, or the one with the most data?
- Do other tables reference these rows through foreign keys (do child rows need re-pointing first)?
- How big is the table, and can it be locked or must the delete run while traffic continues?

**Code / implementation expected:** Yes — a \`DELETE\` that keeps one row per group, with the survivor chosen by \`MIN(id)\` or \`ROW_NUMBER()\`.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE subscribers (
  id INTEGER PRIMARY KEY,
  email TEXT,
  name TEXT NOT NULL,
  created DATE NOT NULL
);
INSERT INTO subscribers (id, email, name, created) VALUES
  (1, 'asha@example.com', 'Asha', '2024-01-05'),
  (2, 'ben@example.com', 'Ben', '2024-01-07'),
  (3, 'asha@example.com', 'Asha', '2024-02-11'),
  (4, 'chen@example.com', 'Chen', '2024-02-15'),
  (5, 'CHEN@example.com', 'Chen L', '2024-03-02'),
  (6, 'dara@example.com', 'Dara', '2024-03-09'),
  (7, 'asha@example.com', 'Asha K', '2024-03-20'),
  (8, NULL, 'Eli', '2024-03-22'),
  (9, NULL, 'Fay', '2024-03-25'),
  (10, 'ben@example.com', 'Ben', '2024-04-01');
CREATE TABLE page_hits (
  path TEXT NOT NULL,
  visitor TEXT NOT NULL,
  day DATE NOT NULL
);
INSERT INTO page_hits (path, visitor, day) VALUES
  ('/home', 'v1', '2024-05-01'),
  ('/home', 'v1', '2024-05-01'),
  ('/pricing', 'v2', '2024-05-01'),
  ('/home', 'v1', '2024-05-02'),
  ('/pricing', 'v2', '2024-05-01'),
  ('/docs', 'v3', '2024-05-02'),
  ('/docs', 'v3', '2024-05-02'),
  ('/docs', 'v3', '2024-05-02');
\`\`\``,
    answer: `**Target Audience:** Developers who can find duplicates and now need to remove them without losing data, and candidates preparing for the classic "delete duplicates, keep one" question.
**Difficulty:** Medium
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15, both run for this page. MySQL and SQL Server forms are cited, not run.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result shown was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

A newsletter has 10 sign-ups but only 6 real people: Asha signed up three times, Ben twice, and Chen once in lowercase and once in capitals. Every send goes out three times to Asha, and she is about to hit "report spam".

Deleting all the Asha rows would lose her. Deleting "the duplicates" sounds simple until someone asks: **which** Asha row is the duplicate? The first sign-up? The one where she typed her full name? Once that is decided, the SQL is a few lines. Getting the decision wrong, or forgetting about the people with no email at all, is how a clean-up script deletes real customers.

Finding the duplicates is its own question: [How do you find duplicate rows in a table?](/interview-question/how-do-you-find-duplicate-rows-in-a-table). This page starts where that one ends.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What defines a duplicate: email, email ignoring case, or the whole row? | It is the \`GROUP BY\` / \`PARTITION BY\` key |
| Which copy should survive? | It is the \`ORDER BY\` of the ranking, or \`MIN\` vs \`MAX\` |
| Can the key be NULL? | NULLs group together and would be "deduplicated" by mistake |
| Do other tables reference these rows? | Child rows must be re-pointed to the survivor first, or the foreign key blocks the delete |
| How large is the table and how busy? | Decides between one \`DELETE\`, batches, or copy-and-swap |

## 3. Step Zero: Preview What You Will Delete

📌 **Interview term: survivor rule** — the deterministic rule that picks which row of each duplicate group is kept, for example "lowest id". Deterministic means it gives the same answer every time; ordering by a date alone is not, if two rows share the date, so add \`id\` as a tie-breaker.

Write the delete as a \`SELECT\` first. Here the survivor rule is "lowest id", and the query lists every row that is **not** the survivor:

~~~sql
SELECT id, email, name, created, rn
FROM (
  SELECT s.*,
         ROW_NUMBER() OVER (PARTITION BY LOWER(email) ORDER BY id) AS rn
  FROM subscribers AS s
  WHERE email IS NOT NULL
) AS ranked
WHERE rn > 1
ORDER BY id;
~~~

~~~text
id | email | name | created | rn
3 | asha@example.com | Asha | 2024-02-11 | 2
5 | CHEN@example.com | Chen L | 2024-03-02 | 2
7 | asha@example.com | Asha K | 2024-03-20 | 3
10 | ben@example.com | Ben | 2024-04-01 | 2
~~~

Four rows will go. If that list surprises you, fix the query before any row is touched.

## 4. Pattern 1: Keep MIN(id) per Group

The oldest row in each group has the smallest id. Keep those, delete everything else. The first example, then the table afterwards:

~~~text
id | email | name | created
1 | asha@example.com | Asha | 2024-01-05
2 | ben@example.com | Ben | 2024-01-07
4 | chen@example.com | Chen | 2024-02-15
6 | dara@example.com | Dara | 2024-03-09
8 | NULL | Eli | 2024-03-22
9 | NULL | Fay | 2024-03-25
~~~

Rows 3, 5, 7 and 10 are gone; Eli and Fay, who have no email, are untouched. \`LOWER(email)\` merged \`chen@\` and \`CHEN@\`.

**The NULL trap.** Drop the two \`email IS NOT NULL\` filters and run it again:

~~~sql
DELETE FROM subscribers
WHERE id NOT IN (SELECT MIN(id) FROM subscribers GROUP BY LOWER(email));
~~~

~~~text
id | email | name
1 | asha@example.com | Asha
2 | ben@example.com | Ben
4 | chen@example.com | Chen
6 | dara@example.com | Dara
8 | NULL | Eli
~~~

Fay is deleted. \`GROUP BY\` put Eli and Fay in one "NULL" group and kept only its lowest id, although two people without an email are not duplicates of each other. (Why NULLs group together while \`NULL = NULL\` is not true is explained in [How does SQL handle NULL values?](/interview-question/how-does-sql-handle-null-values).)

📌 **Interview term: NOT IN with a subquery** — keeps rows whose value is not in the list. It returns no rows at all if the list contains a NULL. \`MIN(id)\` over a primary key is never NULL, so it is safe here; with a nullable column prefer \`NOT EXISTS\`. See [What is the difference between NOT IN and NOT EXISTS when NULLs are involved?](/interview-question/what-is-the-difference-between-not-in-and-not-exists-when-nulls-are-involved)

## 5. Pattern 2: ROW_NUMBER() and Delete rn > 1

\`MIN\`/\`MAX\` only expresses "oldest" or "newest by id". A window function expresses any rule.

📌 **Interview term: ROW_NUMBER()** — a window function that numbers the rows of each partition 1, 2, 3 in the order given by its \`ORDER BY\`, with no ties. \`PARTITION BY\` restarts the numbering for every key. See [What is the difference between ROW_NUMBER, RANK, and DENSE_RANK?](/interview-question/what-is-the-difference-between-row-number-rank-and-dense-rank)

<svg class="iq-diagram" width="100%" viewBox="0 0 760 256" role="img" aria-label="Rows with the same email are numbered by ROW_NUMBER, the row numbered one is kept and the others are deleted">
  <rect class="d-box-muted" x="20" y="20" width="300" height="40" rx="8"/>
  <text class="d-text" x="170" y="46" text-anchor="middle">PARTITION BY LOWER(email)</text>
  <rect class="d-box-muted" x="440" y="20" width="300" height="40" rx="8"/>
  <text class="d-text" x="590" y="46" text-anchor="middle">result</text>
  <rect class="d-box" x="20" y="84" width="300" height="40" rx="6"/>
  <text class="d-sub" x="170" y="109" text-anchor="middle">id 1 asha | rn 1</text>
  <rect class="d-box" x="20" y="138" width="300" height="40" rx="6"/>
  <text class="d-sub" x="170" y="163" text-anchor="middle">id 3 asha | rn 2</text>
  <rect class="d-box" x="20" y="192" width="300" height="40" rx="6"/>
  <text class="d-sub" x="170" y="217" text-anchor="middle">id 7 asha | rn 3</text>
  <rect class="d-box-accent" x="440" y="84" width="300" height="40" rx="6"/>
  <text class="d-text" x="590" y="109" text-anchor="middle">kept</text>
  <rect class="d-box-muted" x="440" y="138" width="300" height="40" rx="6"/>
  <text class="d-sub" x="590" y="163" text-anchor="middle">deleted</text>
  <rect class="d-box-muted" x="440" y="192" width="300" height="40" rx="6"/>
  <text class="d-sub" x="590" y="217" text-anchor="middle">deleted</text>
  <path class="d-edge-accent" d="M 324 104 L 436 104"/>
  <path class="d-edge-dashed" d="M 324 158 L 436 158"/>
  <path class="d-edge-dashed" d="M 324 212 L 436 212"/>
</svg>

Row number 1 in each partition is the survivor; every row numbered 2 or more is deleted. The window \`ORDER BY\` (here \`id\`) decides who gets number 1.

The second example keeps the **newest** sign-up instead (\`ORDER BY created DESC, id DESC\`):

~~~text
id | email | name | created
5 | CHEN@example.com | Chen L | 2024-03-02
6 | dara@example.com | Dara | 2024-03-09
7 | asha@example.com | Asha K | 2024-03-20
8 | NULL | Eli | 2024-03-22
9 | NULL | Fay | 2024-03-25
10 | ben@example.com | Ben | 2024-04-01
~~~

Now Asha survives as row 7 (\`Asha K\`, her latest sign-up), Ben as row 10 and Chen as row 5. Same data, different survivor rule, different rows deleted. The window cannot appear directly in \`DELETE ... WHERE\`, so it lives in a subquery that returns the ids to delete.

📌 **Interview term: tie-breaker** — an extra column in the \`ORDER BY\` (usually the primary key) that makes the ranking unique when the main sort column has equal values. Without it \`ROW_NUMBER()\` may pick a different survivor on each run.

## 6. Tables With No Key: rowid and ctid

A log table with no primary key can contain rows that are identical in every column. There is nothing to put in \`MIN(id)\`, but every engine has a hidden physical address for each row.

📌 **Interview term: rowid (SQLite) / ctid (PostgreSQL)** — the hidden row identifier. In SQLite an ordinary table stores rows by a 64-bit \`rowid\`. In PostgreSQL \`ctid\` is the physical location (page, item) of the row version; it changes when the row is updated or the table is rewritten, so use it only inside one statement, never store it ([PostgreSQL 16 system columns](https://www.postgresql.org/docs/16/ddl-system-columns.html)).

The third example uses SQLite \`rowid\`, then adds a unique index so the duplicates cannot come back:

~~~text
rows_before
8

path | visitor | day
/docs | v3 | 2024-05-02
/home | v1 | 2024-05-01
/home | v1 | 2024-05-02
/pricing | v2 | 2024-05-01
~~~

Eight rows became four. \`rowid\` does not exist on PostgreSQL:

~~~text
ERROR:  column "rowid" does not exist
LINE 1: ...ETE FROM page_hits WHERE rowid NOT IN (SELECT MIN(rowid) FRO...
                                                             ^
~~~

The PostgreSQL version uses \`ctid\` and a self-join (each row is deleted if an identical row with a smaller \`ctid\` exists):

~~~text
path | visitor | day | ctid
/docs | v3 | 2024-05-02 | (0,6)
/home | v1 | 2024-05-01 | (0,1)
/home | v1 | 2024-05-02 | (0,4)
/pricing | v2 | 2024-05-01 | (0,3)
~~~

## 7. PostgreSQL: DELETE ... USING and RETURNING

PostgreSQL can join in a \`DELETE\` with \`USING\`, and \`RETURNING\` hands back the deleted rows, so you see exactly what went in the same statement. The fourth example puts the delete in a data-modifying CTE and sorts its output:

~~~text
id | email | name
3 | asha@example.com | Asha
5 | CHEN@example.com | Chen L
7 | asha@example.com | Asha K
10 | ben@example.com | Ben
~~~

Those are the same four rows the preview in section 3 listed. In an application, keep the returned ids in an audit table or log before committing.

**Other engines (not run here):**

- **MySQL** rejects \`DELETE FROM t WHERE id NOT IN (SELECT MIN(id) FROM t ...)\` with error 1093, because a subquery may not read the table being modified ([Bytebase reference for MySQL error 1093](https://www.bytebase.com/reference/mysql/error/1093-cant-specify-target-table/)). Wrap the subquery in a derived table so it is materialised first:

~~~sql
-- MySQL, not run here
DELETE FROM subscribers
WHERE email IS NOT NULL
  AND id NOT IN (
    SELECT id FROM (
      SELECT MIN(id) AS id FROM subscribers
      WHERE email IS NOT NULL GROUP BY LOWER(email)
    ) AS keep_ids
  );
~~~

- **SQL Server** can delete through a CTE directly, which removes the rows from the base table ([sqlservertutorial.net walkthrough](https://www.sqlservertutorial.net/sql-server-basics/delete-duplicates-from-a-table-in-sql-server/)):

~~~sql
-- SQL Server, not run here
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY LOWER(email) ORDER BY id) AS rn
  FROM subscribers WHERE email IS NOT NULL
)
DELETE FROM ranked WHERE rn > 1;
~~~

## 8. Choosing a Pattern

| Pattern | Survivor rule | Engines | Watch out for |
| :--- | :--- | :--- | :--- |
| \`NOT IN (SELECT MIN(id) ... GROUP BY key)\` | oldest or newest by id only | SQLite, PostgreSQL, SQL Server; MySQL needs a derived table | NULL keys group together |
| \`ROW_NUMBER()\` and \`rn > 1\` | anything an \`ORDER BY\` can express | all with window functions (MySQL from 8.0) | needs a tie-breaker |
| Self-join, delete \`a.id > b.id\` | lowest id | all; PostgreSQL \`USING\`, MySQL \`DELETE a FROM t a JOIN t b ...\` | a group of n compares n² pairs |
| \`rowid\` / \`ctid\` | first stored copy | SQLite / PostgreSQL | only for tables without a usable key |
| Copy \`SELECT DISTINCT\` to a new table and swap | one per identical row | all | indexes, constraints, grants, foreign keys must be recreated |

## 9. Doing It Safely on a Real Table

📌 **Interview term: batched delete** — deleting a large set in chunks of a few thousand rows per transaction, in a loop, so that each transaction holds row locks briefly and replication does not fall behind.

1. **Preview** with the \`SELECT\` from section 3 and check the count.
2. **Re-point children.** If \`orders.subscriber_id\` references a duplicate, \`UPDATE\` it to the survivor id first, or the foreign key blocks the delete (or a cascade silently deletes the orders). See [What are foreign key cascade options?](/interview-question/what-are-foreign-key-cascade-options)
3. **Run in a transaction**, compare the deleted count with the preview, then \`COMMIT\`; see [When would you use a transaction explicitly?](/interview-question/when-would-you-use-a-transaction-explicitly)
4. **Batch** big deletes, and make sure the key column is indexed so each batch is cheap.
5. **Prevent recurrence** with a \`UNIQUE\` constraint or unique index on \`LOWER(email)\`. Creating it fails while any duplicate remains, which doubles as a final check.

\`DELETE\` versus \`TRUNCATE\` versus \`DROP\` is a separate topic: [What is the difference between DELETE, TRUNCATE, and DROP?](/interview-question/what-is-the-difference-between-delete-truncate-and-drop)

## 10. Verified: Running the Code

The three SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above, so each example starts from all 10 subscribers and 8 page hits). The PostgreSQL example and the PostgreSQL outputs above were run on PostgreSQL 16.15 in a scratch database with the same schema.

Example 1, keep \`MIN(id)\`:

~~~text
id | email | name | created
1 | asha@example.com | Asha | 2024-01-05
2 | ben@example.com | Ben | 2024-01-07
4 | chen@example.com | Chen | 2024-02-15
6 | dara@example.com | Dara | 2024-03-09
8 | NULL | Eli | 2024-03-22
9 | NULL | Fay | 2024-03-25
~~~

Example 2, keep the newest with \`ROW_NUMBER()\`:

~~~text
id | email | name | created
5 | CHEN@example.com | Chen L | 2024-03-02
6 | dara@example.com | Dara | 2024-03-09
7 | asha@example.com | Asha K | 2024-03-20
8 | NULL | Eli | 2024-03-22
9 | NULL | Fay | 2024-03-25
10 | ben@example.com | Ben | 2024-04-01
~~~

Example 3, a table with no key:

~~~text
rows_before
8

path | visitor | day
/docs | v3 | 2024-05-02
/home | v1 | 2024-05-01
/home | v1 | 2024-05-02
/pricing | v2 | 2024-05-01
~~~

Example 4, PostgreSQL \`DELETE ... USING ... RETURNING\`:

~~~text
id | email | name
3 | asha@example.com | Asha
5 | CHEN@example.com | Chen L
7 | asha@example.com | Asha K
10 | ben@example.com | Ben
~~~

## Common Pitfalls

- **No survivor rule.** "Delete the duplicates" without saying which copy stays leads to arguments after the data is gone. Decide and write it as an \`ORDER BY\`.
- **Forgetting NULL keys.** Rows with a NULL key are grouped together and all but one are deleted, as the trap above showed. Filter \`key IS NOT NULL\`.
- **A non-deterministic ranking.** \`ORDER BY created\` with two equal dates may keep a different row each run; add \`id\`.
- **Running the delete before the preview.** Always run the same logic as a \`SELECT\` first and compare counts.
- **Ignoring foreign keys.** Children of a deleted duplicate either block the delete or, with \`ON DELETE CASCADE\`, disappear with it. Re-point them first.
- **Storing or reusing ctid.** It is a physical address that changes on update or \`VACUUM FULL\`; use it only within one statement.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Survivor rule first:</strong> <span style="color:#f0e2c8;">Before writing the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DELETE</code> I agree which copy survives: the oldest id, the newest row, or the most complete one. The rule must be deterministic, so I always add a tie-breaker like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">id</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Simple version:</strong> <span style="color:#f0e2c8;">Keep the lowest id per key: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DELETE FROM t WHERE id NOT IN (SELECT MIN(id) FROM t GROUP BY key)</code>. It is short and works everywhere except MySQL, which needs the subquery wrapped in a derived table.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Flexible version:</strong> <span style="color:#f0e2c8;">For any survivor rule I number each group with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROW_NUMBER() OVER (PARTITION BY key ORDER BY created DESC, id DESC)</code> and delete the rows where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rn &gt; 1</code>. Changing the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY</code> changes who survives.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Traps:</strong> <span style="color:#f0e2c8;">NULL keys all fall into one group, so I filter <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">key IS NOT NULL</code> or a customer without an email gets deleted. A table with no key needs a physical row id: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rowid</code> in SQLite, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ctid</code> in PostgreSQL.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Safely in production:</strong> <span style="color:#f0e2c8;">I run the same query as a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT</code> first, do the delete in a transaction and check the count, re-point foreign keys if children exist, batch it on big tables, and finish with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNIQUE</code> constraint so it cannot recur.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just SELECT DISTINCT into a new table?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a huge table where most rows go, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CREATE TABLE new AS SELECT DISTINCT ...</code> plus a swap can beat a giant <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DELETE</code>. But it needs a write freeze, and you must recreate indexes, constraints, grants and foreign keys. For a few duplicates, deleting in place is simpler.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does MySQL do with the NOT IN version?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It fails with error 1093, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">You can not specify target table for update in FROM clause</code>, because the subquery reads the table being deleted from. Wrap the subquery in a derived table, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT id FROM (SELECT MIN(id) AS id ...) AS keep</code>, or use a multi-table <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DELETE ... JOIN</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is NOT IN dangerous here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT IN</code> returns nothing if the subquery yields a NULL. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MIN(id)</code> on a primary key can never be NULL, so this one is safe; with a nullable column it is not, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT EXISTS</code> is the safer habit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you delete millions of duplicates without locking everything?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Delete in batches of a few thousand ids per transaction, in a loop, so each transaction holds locks briefly and the replica keeps up. An index on the key column keeps each batch cheap.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you keep the most complete row instead of the oldest?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, change the window ordering, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY (phone IS NULL), (name IS NULL), id</code>, so rows with more filled columns rank first. Or merge the columns into the survivor with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UPDATE</code> before deleting.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Survivor rule | The deterministic rule that picks which row of each group is kept |
| NOT IN with a subquery | Keeps rows not in a list; returns nothing if the list contains NULL |
| ROW_NUMBER() | Numbers rows 1, 2, 3 within each partition, with no ties |
| Tie-breaker | An extra unique sort column that makes a ranking deterministic |
| rowid / ctid | Hidden row identifiers in SQLite / PostgreSQL, used when a table has no key |
| Batched delete | Deleting in small chunks per transaction to keep locks and replication lag short |

**Conclusion:** Deleting duplicates is a ranking problem. Partition the rows by the duplicate key, order each partition by your survivor rule plus a tie-breaker, and delete every row that is not first: \`NOT IN (SELECT MIN(id) ...)\` when the rule is "oldest", \`ROW_NUMBER() ... rn > 1\` for any other rule, and \`rowid\` or \`ctid\` when the table has no key at all. Filter out NULL keys, preview with a \`SELECT\`, re-point foreign keys, run it in a transaction (in batches on a big table), and finish with a unique constraint so you never have to do it again.`,
    examples: [
      {
        label: `Keep the oldest row per email (lowest id) with NOT IN and MIN(id)`,
        code: `DELETE FROM subscribers
WHERE email IS NOT NULL
  AND id NOT IN (
    SELECT MIN(id)
    FROM subscribers
    WHERE email IS NOT NULL
    GROUP BY LOWER(email)
  );

SELECT id, email, name, created FROM subscribers ORDER BY id;`,
      },
      {
        label: `Keep the newest row per email with ROW_NUMBER() and delete rn > 1`,
        code: `DELETE FROM subscribers
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY LOWER(email)
             ORDER BY created DESC, id DESC
           ) AS rn
    FROM subscribers
    WHERE email IS NOT NULL
  ) AS ranked
  WHERE rn > 1
);

SELECT id, email, name, created FROM subscribers ORDER BY id;`,
      },
      {
        label: `A table with no key: tell identical rows apart by SQLite rowid, then add a UNIQUE index`,
        code: `-- page_hits has no key: SQLite rowid tells identical rows apart
SELECT COUNT(*) AS rows_before FROM page_hits;

DELETE FROM page_hits
WHERE rowid NOT IN (
  SELECT MIN(rowid) FROM page_hits GROUP BY path, visitor, day
);

-- Stop them coming back
CREATE UNIQUE INDEX page_hits_uq ON page_hits (path, visitor, day);

SELECT path, visitor, day FROM page_hits ORDER BY path, day;`,
      },
      {
        label: `PostgreSQL: DELETE ... USING a ranked CTE, with RETURNING to see what was removed`,
        code: `WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY LOWER(email) ORDER BY id) AS rn
  FROM subscribers
  WHERE email IS NOT NULL
),
deleted AS (
  DELETE FROM subscribers AS s
  USING ranked AS r
  WHERE s.id = r.id AND r.rn > 1
  RETURNING s.id, s.email, s.name
)
SELECT id, email, name FROM deleted ORDER BY id;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `How do you find the Nth highest salary?`,
    difficulty: "medium",
    seoDescription: `Find the Nth highest salary with DENSE_RANK, DISTINCT + LIMIT/OFFSET or a correlated count, and handle ties, NULLs and a missing Nth value. All run.`,
    description: `**Question presented to candidate:**
"Given an \`employees\` table with a \`salary\` column, write a query that returns the third highest salary. Then make it work for any N, and tell me what your query does when two people earn the same amount, when some salaries are NULL, and when there are fewer than N distinct salaries."

**What a strong answer should cover:**
- Clarify "Nth highest": the Nth distinct salary value (ties count once) or the Nth row; the classic answer means distinct values
- \`DENSE_RANK() OVER (ORDER BY salary DESC)\` and filter \`= N\`, which returns every employee at that salary; why \`ROW_NUMBER()\` and \`RANK()\` give different answers on ties
- Without window functions: \`SELECT DISTINCT salary ... ORDER BY salary DESC LIMIT 1 OFFSET N-1\`, or the correlated "N-1 distinct salaries are higher" subquery
- Fewer than N salaries: a bare \`LIMIT/OFFSET\` returns no row; wrapping it in a scalar subquery returns NULL instead
- NULL salaries: PostgreSQL sorts NULL first in \`DESC\` order, so the "highest" can be NULL unless you filter it or write \`NULLS LAST\`; SQLite, MySQL and SQL Server sort it last in \`DESC\`
- Per group (Nth highest per department) with \`PARTITION BY\`, and the cost: one sort of the table, helped by an index on \`salary\`

**Clarifying questions expected:**
- If two employees share the top salary, is the next one the 2nd or the 3rd highest?
- Should the result be the salary value or the employees who earn it?
- What should come back when there is no Nth salary: no row, or NULL?

**Code / implementation expected:** Yes — a \`DENSE_RANK()\` query, and one approach that works without window functions.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  dept TEXT NOT NULL,
  salary INTEGER
);
INSERT INTO employees (id, name, dept, salary) VALUES
  (1, 'Asha', 'Engineering', 120000),
  (2, 'Ben', 'Engineering', 95000),
  (3, 'Chen', 'Engineering', 120000),
  (4, 'Dara', 'Sales', 70000),
  (5, 'Eli', 'Sales', 85000),
  (6, 'Fay', 'Sales', 85000),
  (7, 'Gus', 'Marketing', 60000),
  (8, 'Hana', 'Marketing', 95000),
  (9, 'Ivan', 'Marketing', NULL);
\`\`\``,
    answer: `**Target Audience:** Beginners meeting ranking queries for the first time, and candidates who want the tie, NULL and empty-result details interviewers use to separate answers.
**Difficulty:** Medium
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15, both run for this page. MySQL and SQL Server behaviour is cited from their manuals.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result shown was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

At a running race the organisers hand out medals. Two runners cross the line together in first place. Who gets bronze?

- If medals go to **finishing times**, the two winners share gold, the next time is silver, the one after is bronze.
- If medals go to **positions**, the two winners take places 1 and 2 and the next runner is 3rd.
- If ties **use up** places, both winners are 1st, nobody is 2nd, the next runner is 3rd.

"Find the third highest salary" is exactly this question with salaries instead of times. It is asked so often because the one-line answer is easy and the follow-ups (ties, NULLs, "what if there are only two salaries?") test whether you really understand sorting and ranking. The medals story maps straight onto three SQL functions.

## 2. Pin Down What "Nth Highest" Means

Our nine employees earn 120000 (twice), 95000 (twice), 85000 (twice), 70000, 60000, and Ivan has no salary recorded (NULL). There are five **distinct** salaries.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="The distinct salaries form a ladder from highest to lowest, and DENSE_RANK numbers the steps so tied employees share a step">
  <rect class="d-box-muted" x="20" y="20" width="160" height="40" rx="8"/>
  <text class="d-text" x="100" y="46" text-anchor="middle">DENSE_RANK</text>
  <rect class="d-box-muted" x="220" y="20" width="200" height="40" rx="8"/>
  <text class="d-text" x="320" y="46" text-anchor="middle">distinct salary</text>
  <rect class="d-box-muted" x="460" y="20" width="280" height="40" rx="8"/>
  <text class="d-text" x="600" y="46" text-anchor="middle">employees on the step</text>
  <rect class="d-box" x="20" y="76" width="160" height="34" rx="6"/>
  <text class="d-sub" x="100" y="98" text-anchor="middle">1</text>
  <rect class="d-box" x="220" y="76" width="200" height="34" rx="6"/>
  <text class="d-sub" x="320" y="98" text-anchor="middle">120000</text>
  <rect class="d-box" x="460" y="76" width="280" height="34" rx="6"/>
  <text class="d-sub" x="600" y="98" text-anchor="middle">Asha, Chen</text>
  <rect class="d-box" x="20" y="120" width="160" height="34" rx="6"/>
  <text class="d-sub" x="100" y="142" text-anchor="middle">2</text>
  <rect class="d-box" x="220" y="120" width="200" height="34" rx="6"/>
  <text class="d-sub" x="320" y="142" text-anchor="middle">95000</text>
  <rect class="d-box" x="460" y="120" width="280" height="34" rx="6"/>
  <text class="d-sub" x="600" y="142" text-anchor="middle">Ben, Hana</text>
  <rect class="d-box-accent" x="20" y="164" width="160" height="34" rx="6"/>
  <text class="d-text" x="100" y="186" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="220" y="164" width="200" height="34" rx="6"/>
  <text class="d-text" x="320" y="186" text-anchor="middle">85000</text>
  <rect class="d-box-accent" x="460" y="164" width="280" height="34" rx="6"/>
  <text class="d-text" x="600" y="186" text-anchor="middle">Eli, Fay</text>
  <rect class="d-box" x="20" y="208" width="160" height="34" rx="6"/>
  <text class="d-sub" x="100" y="230" text-anchor="middle">4</text>
  <rect class="d-box" x="220" y="208" width="200" height="34" rx="6"/>
  <text class="d-sub" x="320" y="230" text-anchor="middle">70000</text>
  <rect class="d-box" x="460" y="208" width="280" height="34" rx="6"/>
  <text class="d-sub" x="600" y="230" text-anchor="middle">Dara</text>
  <rect class="d-box" x="20" y="252" width="160" height="34" rx="6"/>
  <text class="d-sub" x="100" y="274" text-anchor="middle">5</text>
  <rect class="d-box" x="220" y="252" width="200" height="34" rx="6"/>
  <text class="d-sub" x="320" y="274" text-anchor="middle">60000</text>
  <rect class="d-box" x="460" y="252" width="280" height="34" rx="6"/>
  <text class="d-sub" x="600" y="274" text-anchor="middle">Gus</text>
</svg>

Each distinct salary is one step of the ladder; tied employees stand on the same step. The usual meaning of "the 3rd highest salary" is step 3, 85000, earned by Eli and Fay. Confirm that with the interviewer, then pick the function that matches.

## 3. The Window-Function Answer: DENSE_RANK()

📌 **Interview term: window function** — a function computed over a set of rows related to the current row, written with \`OVER (...)\`, that does not collapse rows the way \`GROUP BY\` does. See [What are window functions?](/interview-question/what-are-window-functions)

📌 **Interview term: ROW_NUMBER / RANK / DENSE_RANK** — the three ranking window functions. \`ROW_NUMBER()\` numbers rows 1, 2, 3 with no ties; \`RANK()\` gives tied rows the same number and then skips (1, 1, 3); \`DENSE_RANK()\` gives tied rows the same number and does not skip (1, 1, 2). The full comparison lives in [What is the difference between ROW_NUMBER, RANK, and DENSE_RANK?](/interview-question/what-is-the-difference-between-row-number-rank-and-dense-rank) and when the gap matters in [RANK() vs DENSE_RANK() vs ROW_NUMBER() — when does the gap matter and how do you choose?](/interview-question/rank-vs-dense-rank-vs-row-number-when-does-the-gap-matter-and-how-do-you-choose)

The first example shows all three side by side, then uses \`DENSE_RANK()\` to answer the question:

~~~text
name | salary | row_num | rnk | dense
Asha | 120000 | 1 | 1 | 1
Chen | 120000 | 2 | 1 | 1
Ben | 95000 | 3 | 3 | 2
Hana | 95000 | 4 | 3 | 2
Eli | 85000 | 5 | 5 | 3
Fay | 85000 | 6 | 5 | 3
Dara | 70000 | 7 | 7 | 4
Gus | 60000 | 8 | 8 | 5

name | salary
Eli | 85000
Fay | 85000
~~~

The \`dense\` column is the ladder step, so \`dense = 3\` returns Eli and Fay at 85000. Look at what the other columns would have said for "3rd":

- \`row_num = 3\` is Ben at 95000, the 2nd highest salary:

~~~text
name | salary
Ben | 95000
~~~

- \`rnk = 3\` is also 95000 (Ben and Hana), and \`rnk = 2\` returns nothing at all, because \`RANK()\` skipped 2.

A window function cannot be used in \`WHERE\` (it is computed after \`WHERE\`; see [What is the logical order of execution of a SQL query?](/interview-question/what-is-the-logical-order-of-execution-of-a-sql-query)), which is why the rank is computed in a subquery and filtered outside. A CTE works the same way.

Window functions exist in SQLite since 3.25.0 ([release log](https://www.sqlite.org/releaselog/3_25_0.html)), in PostgreSQL, in SQL Server, and in MySQL from 8.0 ([MySQL 8.0 window function descriptions](https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html)). On older MySQL use one of the next two approaches.

## 4. Without Window Functions: DISTINCT + LIMIT/OFFSET

📌 **Interview term: LIMIT / OFFSET** — \`LIMIT 1 OFFSET 2\` skips the first two rows of the sorted result and returns the next one. Skipping N-1 rows of the distinct salaries, sorted high to low, lands on the Nth. SQL Server and the SQL standard spell it \`OFFSET 2 ROWS FETCH NEXT 1 ROWS ONLY\` ([T-SQL ORDER BY clause](https://learn.microsoft.com/en-us/sql/t-sql/queries/select-order-by-clause-transact-sql)).

\`DISTINCT\` matters: without it, the two 120000 rows would use up offsets 0 and 1.

**What if there is no Nth salary?** \`LIMIT 1 OFFSET 9\` on five distinct salaries returns **no row at all**, which application code often mishandles. Wrapping the query in a **scalar subquery** turns "no row" into one row holding NULL. The second example asks for the 3rd and the 10th highest at once:

~~~text
third_highest | tenth_highest
85000 | NULL
~~~

📌 **Interview term: scalar subquery** — a subquery used where a single value is expected, in the \`SELECT\` list for example. If it returns no row its value is NULL; if it returns more than one row, PostgreSQL raises \`more than one row returned by a subquery used as an expression\`, while SQLite silently uses the first row (both run for this page). See [What is a subquery and what is a correlated subquery?](/interview-question/what-is-a-subquery-and-what-is-a-correlated-subquery)

The famous special case for N = 2 needs neither windows nor \`LIMIT\`:

~~~sql
SELECT MAX(salary) AS second_highest
FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);
~~~

~~~text
second_highest
95000
~~~

\`MAX\` ignores NULLs, so Ivan does not disturb it, and it returns NULL when only one distinct salary exists. It does not generalise to N, which is why interviewers follow up with "now the 5th".

## 5. The Fully Portable Answer: Count the Higher Salaries

A salary is the Nth highest exactly when **N-1 distinct salaries are higher** than it. That works on any SQL engine, even one without \`LIMIT\`. The third example asks for N = 3, so 2 higher salaries:

~~~text
salary
85000
~~~

📌 **Interview term: correlated subquery** — a subquery that refers to a column of the outer query (\`e1.salary\` here), so it is conceptually re-run for every outer row. That makes it O(n²) unless the optimiser rewrites it; use it to show you understand the logic, not on a large table.

## 6. The NULL Trap, Engine by Engine

📌 **Interview term: NULL sort order** — where NULLs go in \`ORDER BY\`. SQLite, MySQL and SQL Server treat NULL as smaller than every value, so it comes first ascending and **last** descending. PostgreSQL treats NULL as larger than every value, so it comes last ascending and **first** descending. Sources: [PostgreSQL 16 ORDER BY](https://www.postgresql.org/docs/16/queries-order.html), [MySQL 8.4 NULL values](https://dev.mysql.com/doc/refman/8.4/en/null-values.html), [T-SQL ORDER BY](https://learn.microsoft.com/en-us/sql/t-sql/queries/select-order-by-clause-transact-sql).

The fourth example runs the "obvious" query on PostgreSQL 16 without filtering NULLs:

~~~text
name | salary | dense
Ivan | NULL | 1
Asha | 120000 | 2
Chen | 120000 | 2
Ben | 95000 | 3
~~~

Ivan, whose salary is unknown, is ranked as the highest earner, and every real salary moves down one step. The same query on SQLite puts Ivan last, so the bug does not show there:

~~~text
name | salary | dense
Asha | 120000 | 1
Chen | 120000 | 1
Ben | 95000 | 2
Hana | 95000 | 2
~~~

The \`LIMIT/OFFSET\` version is hit too. Without the NULL filter, "the 3rd highest" on PostgreSQL is:

~~~text
salary
95000
~~~

and on SQLite:

~~~text
salary
85000
~~~

Two fixes, both shown working on PostgreSQL 16: filter with \`WHERE salary IS NOT NULL\` (what the examples above do), or say where NULLs go, in both the window and the outer sort:

~~~text
name | salary | dense
Asha | 120000 | 1
Chen | 120000 | 1
Ben | 95000 | 2
Hana | 95000 | 2
~~~

\`NULLS LAST\` is accepted by PostgreSQL and by SQLite since 3.30.0 ([SQLite 3.30.0 release log](https://www.sqlite.org/releaselog/3_30_0.html)); filtering is the portable choice.

## 7. Nth Highest per Group

"Second highest salary in each department" is the same query with \`PARTITION BY\`, which restarts the ranking for each department:

~~~sql
SELECT dept, name, salary
FROM (
  SELECT dept, name, salary, id,
         DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS dense
  FROM employees
  WHERE salary IS NOT NULL
) AS ranked
WHERE dense = 2
ORDER BY dept, id;
~~~

~~~text
dept | name | salary
Engineering | Ben | 95000
Marketing | Gus | 60000
Sales | Dara | 70000
~~~

Marketing has only two real salaries (Ivan is NULL), so its 2nd highest is Gus. The general "top N per group" pattern, including \`LATERAL\` alternatives, has its own pages: [Top-N per group with RANK() OVER (PARTITION BY) — how do you get top 2 per department without collapsing rows?](/interview-question/top-n-per-group-with-rank-over-partition-by-how-do-you-get-top-2-per-department-) and [LATERAL vs window function vs correlated subquery for top-N per group — which scales?](/interview-question/lateral-vs-window-function-vs-correlated-subquery-for-top-n-per-group-which-scal)

## 8. Comparing the Approaches

| Approach | Ties | No Nth value | NULL handling | Cost | Works on |
| :--- | :--- | :--- | :--- | :--- | :--- |
| \`DENSE_RANK() = N\` | one step per distinct salary, returns all tied people | no row | filter, or \`NULLS LAST\` on PostgreSQL | one sort | any engine with window functions |
| \`ROW_NUMBER() = N\` | counts people, not salaries | no row | same | one sort | same |
| \`DISTINCT ... LIMIT 1 OFFSET N-1\` | distinct values | no row; NULL if wrapped as a scalar subquery | filter | one sort, can stop early with an index | SQLite, PostgreSQL, MySQL; SQL Server uses \`OFFSET ... FETCH\` |
| N-1 higher distinct salaries | distinct values | no row | filter | O(n²) | any SQL engine |
| \`MAX\` below \`MAX\` | distinct values | NULL | \`MAX\` skips NULL | two aggregates | any, but only N = 2 |

📌 **Interview term: top-N query** — any query returning the first N rows by some ordering. With an index on \`salary\`, an engine can read the index from the high end and stop after N steps instead of sorting the whole table; see [What is an index and how does it speed up queries?](/interview-question/what-is-an-index-and-how-does-it-speed-up-queries)

## 9. Verified: Running the Code

The three SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above). The PostgreSQL example and the PostgreSQL outputs above were run on PostgreSQL 16.15 in a scratch database with the same schema.

Example 1, the three ranking functions and \`DENSE_RANK() = 3\`:

~~~text
name | salary | row_num | rnk | dense
Asha | 120000 | 1 | 1 | 1
Chen | 120000 | 2 | 1 | 1
Ben | 95000 | 3 | 3 | 2
Hana | 95000 | 4 | 3 | 2
Eli | 85000 | 5 | 5 | 3
Fay | 85000 | 6 | 5 | 3
Dara | 70000 | 7 | 7 | 4
Gus | 60000 | 8 | 8 | 5

name | salary
Eli | 85000
Fay | 85000
~~~

Example 2, \`LIMIT/OFFSET\` in scalar subqueries:

~~~text
third_highest | tenth_highest
85000 | NULL
~~~

Example 3, the correlated count:

~~~text
salary
85000
~~~

Example 4, PostgreSQL with an unfiltered NULL:

~~~text
name | salary | dense
Ivan | NULL | 1
Asha | 120000 | 2
Chen | 120000 | 2
Ben | 95000 | 3
~~~

## Common Pitfalls

- **Using ROW_NUMBER for a salary question.** It counts people, so ties push the real Nth salary down the list.
- **Forgetting DISTINCT with LIMIT/OFFSET.** Duplicate salaries use up offsets and the answer comes out too low.
- **Not filtering NULLs on PostgreSQL.** NULL sorts first in \`DESC\` order and becomes "the highest salary"; SQLite and MySQL hide the bug, so it appears only after deploying to PostgreSQL.
- **Returning no row when N is too large.** A bare \`LIMIT/OFFSET\` returns an empty result; wrap it in a scalar subquery (or \`COALESCE\` that) if the caller expects a value.
- **Filtering a window function in WHERE.** It is not computed yet at that point; filter it in an outer query or CTE.
- **Writing \`OFFSET N\`.** The Nth row is reached by skipping N-1 rows: \`OFFSET 2\` for the 3rd.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify ties:</strong> <span style="color:#f0e2c8;">I first ask whether Nth highest means the Nth <strong style="color:#ffca28;">distinct</strong> salary. With two people on 120000, is 95000 the 2nd or the 3rd highest? The classic answer is distinct values, so 95000 is 2nd.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Window answer:</strong> <span style="color:#f0e2c8;">Then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DENSE_RANK() OVER (ORDER BY salary DESC)</code> in a subquery and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE dense = N</code>. Dense rank gives tied salaries the same number with no gaps, so it returns every employee earning the Nth salary.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Without windows:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT DISTINCT salary ... ORDER BY salary DESC LIMIT 1 OFFSET N-1</code>, wrapped in a scalar subquery so it returns NULL instead of no row when there are fewer than N salaries. The fully portable version counts: exactly N-1 distinct salaries are higher.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. NULLs:</strong> <span style="color:#f0e2c8;">NULL salaries must be filtered. PostgreSQL treats NULL as larger than any value, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY salary DESC</code> puts it first and it becomes rank 1. I add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE salary IS NOT NULL</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NULLS LAST</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost and variants:</strong> <span style="color:#f0e2c8;">It is one sort of the table, or a short walk backwards on an index on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">salary</code>. Per department I add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PARTITION BY dept</code>, which is the top-N per group pattern.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not ROW_NUMBER?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROW_NUMBER()</code> never ties, so with two people on 120000 the 3rd row is Ben at 95000, which is the 2nd highest salary, and which tied person comes 3rd depends on the tie-breaker. It answers 'the 3rd employee', not 'the 3rd salary'.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would RANK be the right one?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When ties should consume positions, as in a competition: two people tied for 1st, nobody is 2nd. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RANK()</code> gives 1, 1, 3. Ask the interviewer; most mean <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DENSE_RANK()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you make N a parameter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Bind it: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LIMIT 1 OFFSET ?</code> with N-1, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE dense = ?</code> with N. Never concatenate N into the SQL string. In PostgreSQL or MySQL you can wrap it in a function, as the LeetCode version of this problem asks.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about the second highest without anything fancy?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT MAX(salary) FROM employees WHERE salary &lt; (SELECT MAX(salary) FROM employees)</code>. It is the classic trick, but it does not generalise to N.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does the correlated version perform?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It runs the inner <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(DISTINCT ...)</code> once per outer row, so it is O(n²) without help. Fine for a whiteboard, slow on a million rows; the window or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LIMIT/OFFSET</code> versions sort once.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Window function | A function over related rows, written with \`OVER (...)\`, that keeps every row |
| ROW_NUMBER / RANK / DENSE_RANK | 1, 2, 3 with no ties / ties share, then skip / ties share, no skip |
| LIMIT / OFFSET | Skip some sorted rows and return the next ones |
| Scalar subquery | A subquery used as a single value; NULL when it finds no row |
| Correlated subquery | A subquery that refers to the outer row, re-evaluated per row |
| NULL sort order | Where NULLs go in \`ORDER BY\`; first in \`DESC\` on PostgreSQL, last on SQLite, MySQL and SQL Server |
| Top-N query | A query returning the first N rows by an ordering, ideally stopping early on an index |

**Conclusion:** "The Nth highest salary" is a ranking question in disguise. Settle what ties mean (almost always distinct salaries), then use \`DENSE_RANK() OVER (ORDER BY salary DESC)\` and filter \`= N\` to get every employee at that salary, or \`SELECT DISTINCT salary ... LIMIT 1 OFFSET N-1\` inside a scalar subquery when you only need the value and want NULL when it does not exist. Know the portable "N-1 higher salaries" version for engines without windows, and always deal with NULL salaries explicitly, because PostgreSQL ranks NULL above every real value in descending order.`,
    examples: [
      {
        label: `ROW_NUMBER vs RANK vs DENSE_RANK on tied salaries, then the 3rd highest with DENSE_RANK`,
        code: `SELECT name, salary,
       ROW_NUMBER() OVER (ORDER BY salary DESC, id) AS row_num,
       RANK()       OVER (ORDER BY salary DESC) AS rnk,
       DENSE_RANK() OVER (ORDER BY salary DESC) AS dense
FROM employees
WHERE salary IS NOT NULL
ORDER BY salary DESC, id;

SELECT name, salary
FROM (
  SELECT name, salary, id,
         DENSE_RANK() OVER (ORDER BY salary DESC) AS dense
  FROM employees
  WHERE salary IS NOT NULL
) AS ranked
WHERE dense = 3
ORDER BY id;`,
      },
      {
        label: `DISTINCT + LIMIT/OFFSET wrapped in a scalar subquery: NULL when there is no Nth salary`,
        code: `SELECT
  (SELECT DISTINCT salary FROM employees
   WHERE salary IS NOT NULL
   ORDER BY salary DESC LIMIT 1 OFFSET 2) AS third_highest,
  (SELECT DISTINCT salary FROM employees
   WHERE salary IS NOT NULL
   ORDER BY salary DESC LIMIT 1 OFFSET 9) AS tenth_highest;`,
      },
      {
        label: `No window functions, no LIMIT: exactly N-1 distinct salaries are higher`,
        code: `SELECT DISTINCT e1.salary
FROM employees AS e1
WHERE e1.salary IS NOT NULL
  AND 2 = (
    SELECT COUNT(DISTINCT e2.salary)
    FROM employees AS e2
    WHERE e2.salary > e1.salary
  );`,
      },
      {
        label: `PostgreSQL trap: NULL sorts first in DESC order, so it takes rank 1`,
        code: `SELECT name, salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS dense
FROM employees
ORDER BY salary DESC, id
LIMIT 4;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `How do you aggregate values into a single string?`,
    difficulty: "medium",
    seoDescription: `Join row values into one string with STRING_AGG, GROUP_CONCAT or LISTAGG: ordering, DISTINCT, NULLs, empty groups and dialect limits, with run output.`,
    description: `**Question presented to candidate:**
"We have \`posts\` and a \`post_tags\` table with one row per tag. The blog page wants one row per post with all its tags in a single comma-separated string, like \`analytics, sql, window\`. How do you do that in SQL, and what changes between PostgreSQL, MySQL, SQLite and SQL Server?"

**What a strong answer should cover:**
- String aggregation is an aggregate function: it collapses a group of rows into one text value, used with \`GROUP BY\`
- The names: \`STRING_AGG(col, sep)\` in PostgreSQL and SQL Server, \`GROUP_CONCAT\` in MySQL and SQLite (SQLite 3.44 also accepts \`string_agg\`), \`LISTAGG\` in Oracle
- Order is not guaranteed unless you say so: \`ORDER BY\` inside the aggregate (SQL Server: \`WITHIN GROUP (ORDER BY ...)\`)
- NULL values are skipped; a group with nothing to join gives NULL, so \`COALESCE\` it; \`DISTINCT\` removes repeats
- Limits and traps: MySQL \`group_concat_max_len\` (1024 by default) truncates silently; PostgreSQL needs text input (\`id::text\`); values containing the separator make the string ambiguous, where a JSON or array aggregate is safer

**Code / implementation expected:** Yes — a \`GROUP BY\` query with \`STRING_AGG\` or \`GROUP_CONCAT\` and an explicit order.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE posts (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL
);
CREATE TABLE post_tags (
  post_id INTEGER NOT NULL REFERENCES posts(id),
  tag TEXT
);
INSERT INTO posts (id, title) VALUES
  (1, 'Intro to SQL'),
  (2, 'Window functions'),
  (3, 'Indexing deep dive'),
  (4, 'Draft post'),
  (5, 'FAQ');
INSERT INTO post_tags (post_id, tag) VALUES
  (1, 'sql'),
  (1, 'beginner'),
  (2, 'sql'),
  (2, 'window'),
  (2, 'analytics'),
  (3, 'sql'),
  (3, 'performance'),
  (3, 'indexes'),
  (3, 'performance'),
  (3, NULL),
  (5, 'faq'),
  (5, 'tips, tricks');
\`\`\``,
    answer: `**Target Audience:** Beginners who know \`GROUP BY\` and want to produce "one row with a list", and candidates who need the dialect differences that interviewers love to ask.
**Difficulty:** Medium
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15, both run for this page. MySQL, SQL Server and Oracle syntax is cited from their documentation, not run.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result shown was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

A teacher has a pile of sticky notes, one per student per club: "Asha — chess", "Asha — drama", "Ben — chess". The head asks for a list with one line per student: "Asha: chess, drama". The teacher sorts the notes into piles by student, then writes each pile on one line, separating the clubs with commas.

That is string aggregation. The database keeps one row per tag (which is the right way to store it), but a web page, a CSV export or an email wants one row per post with all its tags in one cell. Interviewers ask about it because every database names it differently, and because it hides three small traps: order, NULLs and length limits.

## 2. The Idea: an Aggregate That Builds Text

📌 **Interview term: aggregate function** — a function that takes many rows and returns one value per group, such as \`COUNT\`, \`SUM\` or \`MAX\`. String aggregation is one of them: its result is a string. See [What are the common aggregate functions?](/interview-question/what-are-the-common-aggregate-functions)

📌 **Interview term: string aggregation (STRING_AGG / GROUP_CONCAT / LISTAGG)** — the aggregate that concatenates the values of a group, putting a separator between them (never after the last one).

<svg class="iq-diagram" width="100%" viewBox="0 0 760 220" role="img" aria-label="Three tag rows of post 2 are grouped and joined with a separator into the single string analytics, sql, window">
  <defs>
    <marker id="sql06q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="220" height="40" rx="8"/>
  <text class="d-text" x="130" y="46" text-anchor="middle">post_tags rows</text>
  <rect class="d-box" x="20" y="76" width="220" height="34" rx="6"/>
  <text class="d-sub" x="130" y="98" text-anchor="middle">2 | sql</text>
  <rect class="d-box" x="20" y="120" width="220" height="34" rx="6"/>
  <text class="d-sub" x="130" y="142" text-anchor="middle">2 | window</text>
  <rect class="d-box" x="20" y="164" width="220" height="34" rx="6"/>
  <text class="d-sub" x="130" y="186" text-anchor="middle">2 | analytics</text>
  <rect class="d-box-muted" x="300" y="98" width="180" height="56" rx="8"/>
  <text class="d-text" x="390" y="122" text-anchor="middle">STRING_AGG</text>
  <text class="d-sub" x="390" y="142" text-anchor="middle">ORDER BY tag</text>
  <rect class="d-box-accent" x="540" y="98" width="200" height="56" rx="8"/>
  <text class="d-text" x="640" y="122" text-anchor="middle">post 2</text>
  <text class="d-sub" x="640" y="142" text-anchor="middle">analytics, sql, window</text>
  <path class="d-edge" d="M 244 93 L 296 118" marker-end="url(#sql06q4-arrow)"/>
  <path class="d-edge" d="M 244 137 L 296 128" marker-end="url(#sql06q4-arrow)"/>
  <path class="d-edge" d="M 244 181 L 296 140" marker-end="url(#sql06q4-arrow)"/>
  <path class="d-edge-accent" d="M 484 126 L 536 126" marker-end="url(#sql06q4-arrow)"/>
</svg>

The \`GROUP BY\` decides which rows end up in one string; the separator and the \`ORDER BY\` inside the function decide what the string looks like. How grouping itself works is covered in [How does GROUP BY work with aggregate functions?](/interview-question/how-does-group-by-work-with-aggregate-functions)

## 3. The Everyday Query

The first example joins posts to their tags, groups by post, and joins the tags alphabetically. \`LEFT JOIN\` keeps the post with no tags (see [What are the different types of SQL joins?](/interview-question/what-are-the-different-types-of-sql-joins)):

~~~text
id | title | tags
1 | Intro to SQL | beginner, sql
2 | Window functions | analytics, sql, window
3 | Indexing deep dive | indexes, performance, performance, sql
4 | Draft post | (none)
5 | FAQ | faq, tips, tricks
~~~

Three details in that result:

- **Post 3 lists \`performance\` twice**, because the tag was imported twice. Section 4 shows \`DISTINCT\`.
- **Post 3 also has a NULL tag row**, and it simply does not appear: string aggregation skips NULLs, like every aggregate except \`COUNT(*)\`.
- **Post 4 has no tags**, so there was nothing to join and the aggregate returned NULL, which \`COALESCE\` replaced with \`(none)\`. Without \`COALESCE\` you get NULL, not an empty string:

~~~text
g
NULL
~~~

More on \`COALESCE\` in [What do COALESCE and NULLIF do?](/interview-question/what-do-coalesce-and-nullif-do)

## 4. Order, DISTINCT and Names in SQLite

📌 **Interview term: ordered-set aggregate / aggregate ORDER BY** — an \`ORDER BY\` written **inside** the aggregate call, which fixes the order the values are fed in. Without it the order is whatever order the engine reads the rows, which depends on the plan and can change. In SQLite it arrived in 3.44.0, together with \`string_agg()\` as an alias for \`group_concat()\` ([SQLite 3.44.0 release log](https://sqlite.org/releaselog/3_44_0.html)).

The second example shows the variations side by side. Note the separator \`' / '\` in the \`string_agg\` column:

~~~text
post_id | all_tags | distinct_tags | via_string_agg | n_tags
2 | sql,window,analytics | analytics,sql,window | window / sql / analytics | 3
3 | sql,performance,indexes,performance | indexes,performance,sql | sql / performance / performance / indexes | 4
~~~

- \`all_tags\` has no \`ORDER BY\`: it happens to come out in insertion order here, but nothing promises that.
- \`distinct_tags\` removes the repeated \`performance\` and sorts. In SQLite, \`DISTINCT\` only works with a single argument, so the separator must stay the default comma:

~~~text
ERR DISTINCT aggregates must have exactly one argument
~~~

- \`n_tags\` is \`COUNT(tag)\`, which, like the string, ignores the NULL tag of post 3. See [What is the difference between COUNT(*), COUNT(col), and COUNT(DISTINCT col)?](/interview-question/what-is-the-difference-between-count-count-col-and-count-distinct-col)

## 5. PostgreSQL: STRING_AGG and ARRAY_AGG

PostgreSQL has \`STRING_AGG(expression, separator)\` with optional \`DISTINCT\` and \`ORDER BY\`, and \`ARRAY_AGG\`, which builds a real array instead of a string. The third example runs both on PostgreSQL 16:

~~~text
id | tags | tag_array
1 | beginner, sql | {beginner,sql}
2 | analytics, sql, window | {analytics,sql,window}
3 | indexes, performance, sql | {indexes,performance,performance,sql,NULL}
4 | NULL | {NULL}
5 | faq, tips, tricks | {faq,"tips, tricks"}
~~~

Compare the two columns:

- \`STRING_AGG\` skipped the NULL tag of post 3 and returned NULL for post 4.
- \`ARRAY_AGG\` **keeps** NULLs: post 3 has \`NULL\` at the end of its array, and post 4 has \`{NULL}\`, an array with one NULL element coming from the \`LEFT JOIN\`. Add \`FILTER (WHERE t.tag IS NOT NULL)\` if you do not want that.
- In the array, \`"tips, tricks"\` is quoted, so it stays one element. In the string it is indistinguishable from two tags.

\`STRING_AGG\` only accepts text. Passing an integer fails:

~~~text
ERROR:  function string_agg(integer, unknown) does not exist
LINE 1: SELECT STRING_AGG(post_id, ',') FROM post_tags;
               ^
HINT:  No function matches the given name and argument types. You might need to add explicit type casts.
~~~

The \`ORDER BY\` of a \`DISTINCT\` aggregate must use the aggregated expression, otherwise PostgreSQL refuses:

~~~text
ERROR:  in an aggregate with DISTINCT, ORDER BY expressions must appear in argument list
LINE 1: SELECT STRING_AGG(DISTINCT tag, ',' ORDER BY post_id) FROM p...
                                                     ^
~~~

To fix the integer error, cast it, as in \`STRING_AGG(post_id::text, ',' ORDER BY post_id)\`:

~~~text
post_id | ids
1 | 1,1
2 | 2,2,2
~~~

The function is documented in the [PostgreSQL 16 aggregate functions table](https://www.postgresql.org/docs/16/functions-aggregate.html).

## 6. When Values Contain the Separator

📌 **Interview term: delimiter collision** — when a value contains the separator character, so the joined string can no longer be split back reliably. \`faq, tips, tricks\` could be two tags or three.

The fourth example puts the joined text next to SQLite \`json_group_array\`, which escapes each value into a JSON array:

~~~text
post_id | joined_text | json_array
1 | beginner, sql | ["beginner","sql"]
5 | faq, tips, tricks | ["faq","tips, tricks"]
~~~

The JSON array keeps \`"tips, tricks"\` as one element. When the result goes to code rather than a human, return JSON (\`json_group_array\` in SQLite, \`json_agg\` in PostgreSQL) or a PostgreSQL array, never a string you will have to split again.

## 7. The Same Query in Every Dialect

| Engine | Function | Order | Distinct | Notes |
| :--- | :--- | :--- | :--- | :--- |
| PostgreSQL | \`STRING_AGG(tag, ', ' ORDER BY tag)\` | inside the call | \`STRING_AGG(DISTINCT tag, ...)\` | text only; \`ARRAY_AGG\`, \`json_agg\` for structured results (run above) |
| SQLite | \`GROUP_CONCAT(tag, ', ' ORDER BY tag)\`, alias \`string_agg\` | inside the call, from 3.44.0 | one argument only | default separator is a comma (run above) |
| MySQL | \`GROUP_CONCAT(DISTINCT tag ORDER BY tag SEPARATOR ', ')\` | inside the call | yes | result truncated at \`group_concat_max_len\`, 1024 by default |
| SQL Server | \`STRING_AGG(tag, ', ') WITHIN GROUP (ORDER BY tag)\` | \`WITHIN GROUP\` | no \`DISTINCT\`; deduplicate in a subquery first | from SQL Server 2017; non-MAX input capped at 8000 bytes |
| Oracle | \`LISTAGG(tag, ', ') WITHIN GROUP (ORDER BY tag)\` | \`WITHIN GROUP\` | from 19c | \`ON OVERFLOW TRUNCATE\` from 12.2 |

Sources for the rows not run here: the MySQL syntax and default comma separator from the [DataCamp MySQL string aggregation reference](https://www.datacamp.com/doc/mysql/mysql-string-agg); the 1024 default and silent truncation (warning 1260, visible with \`SHOW WARNINGS\`) from [MySQL bug #78041](https://bugs.mysql.com/78041) and [bug #54443](https://bugs.mysql.com/54443); SQL Server from [Microsoft STRING_AGG docs](https://learn.microsoft.com/en-us/sql/t-sql/functions/string-agg-transact-sql) and the 8000-byte limit from [MSSQLTips](https://www.mssqltips.com/tutorial/sql-string-agg-function/); Oracle overflow handling from [Oracle data warehousing blog on 12.2](https://blogs.oracle.com/datawarehousing/post/dealing-with-very-very-long-string-lists-using-database-122). SQL Server having no \`DISTINCT\` in \`STRING_AGG\` is from a [Microsoft Q&A answer](https://learn.microsoft.com/en-us/answers/questions/552468/string-agg-giving-different-results-than-stuff-for), and Oracle \`LISTAGG(DISTINCT ...)\` arriving in 19c from [Oracle-BASE](https://www.oracle-base.com/articles/19c/listagg-distinct-19c).

## 8. Edge Cases

- **Huge groups.** A post with 50,000 tags builds one enormous string in memory. Aggregate only what you display, or paginate.
- **Mixed types.** SQLite converts numbers to text silently; PostgreSQL insists on text (error above).
- **Reversing it.** Splitting a delimited string back into rows needs \`string_to_table\` in PostgreSQL or a recursive CTE in SQLite ([How do recursive CTEs work?](/interview-question/how-do-recursive-ctes-work)). If you split often, keep the data as rows.
- **Storing the result.** A comma-separated column breaks first normal form; see [What is database normalization?](/interview-question/what-is-database-normalization)

## 9. Verified: Running the Code

The three SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above). The PostgreSQL example and the PostgreSQL outputs above were run on PostgreSQL 16.15 in a scratch database with the same schema.

Example 1, tags per post:

~~~text
id | title | tags
1 | Intro to SQL | beginner, sql
2 | Window functions | analytics, sql, window
3 | Indexing deep dive | indexes, performance, performance, sql
4 | Draft post | (none)
5 | FAQ | faq, tips, tricks
~~~

Example 2, SQLite options:

~~~text
post_id | all_tags | distinct_tags | via_string_agg | n_tags
2 | sql,window,analytics | analytics,sql,window | window / sql / analytics | 3
3 | sql,performance,indexes,performance | indexes,performance,sql | sql / performance / performance / indexes | 4
~~~

Example 3, PostgreSQL \`STRING_AGG\` and \`ARRAY_AGG\`:

~~~text
id | tags | tag_array
1 | beginner, sql | {beginner,sql}
2 | analytics, sql, window | {analytics,sql,window}
3 | indexes, performance, sql | {indexes,performance,performance,sql,NULL}
4 | NULL | {NULL}
5 | faq, tips, tricks | {faq,"tips, tricks"}
~~~

Example 4, text versus JSON array:

~~~text
post_id | joined_text | json_array
1 | beginner, sql | ["beginner","sql"]
5 | faq, tips, tricks | ["faq","tips, tricks"]
~~~

## Common Pitfalls

- **No ORDER BY inside the aggregate.** The list order then depends on the plan; tests pass and production output shuffles.
- **Forgetting the empty group.** A post with no tags yields NULL, which breaks string concatenation in the application; \`COALESCE\` it.
- **Assuming NULLs appear.** \`STRING_AGG\` and \`GROUP_CONCAT\` skip them silently, \`ARRAY_AGG\` keeps them; know which one you are using.
- **MySQL truncation.** Long lists are cut at 1024 bytes by default with only a warning; raise \`group_concat_max_len\` for the session.
- **Splitting the string later.** If a value can contain the separator, the split is wrong; return JSON or an array instead.
- **Ordering by something the DISTINCT cannot see.** PostgreSQL requires the \`ORDER BY\` of a \`DISTINCT\` aggregate to use the aggregated expression itself.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">String aggregation is an <strong style="color:#ffca28;">aggregate function</strong>, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SUM</code> but for text: it takes the values of a group of rows and joins them into one string with a separator. You use it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY</code>, one string per group.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The names:</strong> <span style="color:#f0e2c8;">PostgreSQL and SQL Server call it <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">STRING_AGG(tag, ', ')</code>. MySQL and SQLite call it <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP_CONCAT</code>, and SQLite 3.44 added <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string_agg</code> as an alias. Oracle has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LISTAGG(tag, ', ') WITHIN GROUP (ORDER BY tag)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Always order it:</strong> <span style="color:#f0e2c8;">Without an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY</code> inside the aggregate the order is whatever the engine happens to read, which can change between runs. I write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">STRING_AGG(tag, ', ' ORDER BY tag)</code>; SQL Server uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WITHIN GROUP (ORDER BY tag)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. NULLs and empty groups:</strong> <span style="color:#f0e2c8;">NULL values are skipped, and a group with no non-NULL values returns NULL, not an empty string. With a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LEFT JOIN</code> for posts without tags I wrap it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COALESCE</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DISTINCT</code> removes repeated values.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Traps:</strong> <span style="color:#f0e2c8;">MySQL silently truncates at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">group_concat_max_len</code>, 1024 by default. PostgreSQL needs text, so numbers need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">::text</code>. And if a value can contain the separator, I return a JSON array or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ARRAY_AGG</code> instead, so the client can split it safely.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How did people do this before STRING_AGG existed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In SQL Server, the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FOR XML PATH('')</code> trick with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">STUFF</code> to remove the leading comma; in old PostgreSQL, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">array_to_string(array_agg(x), ', ')</code>. Both still work, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">STRING_AGG</code> is clearer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get distinct values in a fixed order?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">PostgreSQL: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">STRING_AGG(DISTINCT tag, ', ' ORDER BY tag)</code>; the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY</code> must use the aggregated expression. SQLite: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP_CONCAT(DISTINCT tag ORDER BY tag)</code>, but only with the default comma, because SQLite rejects <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DISTINCT</code> with two arguments.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you split the string back into rows?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">PostgreSQL has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string_to_table</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unnest(string_to_array(...))</code>, SQL Server has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">STRING_SPLIT</code>, SQLite needs a recursive CTE or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">json_each</code>. If you often split it, the data should stay as rows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should you store tags as a comma-separated column?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. A comma list in one column breaks first normal form: you cannot index one tag, enforce a foreign key, or count tags without parsing. Store rows in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">post_tags</code> and aggregate only for display.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can it run as a window function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In PostgreSQL yes, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">STRING_AGG(tag, ', ') OVER (PARTITION BY post_id)</code> puts the list on every row, and SQLite allows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">group_concat</code> as a window function too. SQL Server rejects <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">STRING_AGG</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OVER</code> as not a valid windowing function.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Aggregate function | Collapses a group of rows into one value per group |
| String aggregation | \`STRING_AGG\` / \`GROUP_CONCAT\` / \`LISTAGG\`: joins a group of values with a separator |
| Aggregate ORDER BY | An \`ORDER BY\` inside the aggregate call that fixes the order of the joined values |
| Delimiter collision | A value containing the separator, making the joined string ambiguous |

**Conclusion:** To turn many rows into one string, group the rows and use the engine's string aggregate: \`STRING_AGG\` in PostgreSQL and SQL Server, \`GROUP_CONCAT\` in MySQL and SQLite (where \`string_agg\` is an alias since 3.44), \`LISTAGG\` in Oracle. Always put an \`ORDER BY\` inside the call (or \`WITHIN GROUP\`), remember that NULLs are skipped and an empty group gives NULL, use \`DISTINCT\` for repeats, cast numbers to text in PostgreSQL, and watch MySQL silent 1024-byte limit. When the result is for code rather than people, aggregate into JSON or an array so values that contain the separator survive.`,
    examples: [
      {
        label: `One row per post with its tags in alphabetical order; posts without tags get a placeholder`,
        code: `SELECT p.id, p.title,
       COALESCE(GROUP_CONCAT(t.tag, ', ' ORDER BY t.tag), '(none)') AS tags
FROM posts AS p
LEFT JOIN post_tags AS t ON t.post_id = p.id
GROUP BY p.id, p.title
ORDER BY p.id;`,
      },
      {
        label: `SQLite options: no ORDER BY, DISTINCT, the string_agg alias, and NULL tags skipped`,
        code: `SELECT post_id,
       GROUP_CONCAT(tag) AS all_tags,
       GROUP_CONCAT(DISTINCT tag ORDER BY tag) AS distinct_tags,
       string_agg(tag, ' / ' ORDER BY tag DESC) AS via_string_agg,
       COUNT(tag) AS n_tags
FROM post_tags
WHERE post_id IN (2, 3)
GROUP BY post_id
ORDER BY post_id;`,
      },
      {
        label: `PostgreSQL: STRING_AGG with DISTINCT and ORDER BY, next to ARRAY_AGG`,
        code: `SELECT p.id,
       STRING_AGG(DISTINCT t.tag, ', ' ORDER BY t.tag) AS tags,
       ARRAY_AGG(t.tag ORDER BY t.tag) AS tag_array
FROM posts AS p
LEFT JOIN post_tags AS t ON t.post_id = p.id
GROUP BY p.id
ORDER BY p.id;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `When a value contains the separator: joined text vs a JSON array`,
        code: `SELECT post_id,
       GROUP_CONCAT(tag, ', ' ORDER BY tag) AS joined_text,
       json_group_array(tag ORDER BY tag) AS json_array
FROM post_tags
WHERE post_id IN (1, 5)
GROUP BY post_id
ORDER BY post_id;`,
      },
    ],
  },
  {
    title: `How do you pivot rows into columns?`,
    difficulty: "hard",
    seoDescription: `Pivot rows into columns with conditional aggregation, FILTER, crosstab or PIVOT, handle empty cells, and build dynamic pivots safely. All examples run.`,
    description: `**Question presented to candidate:**
"Our \`sales\` table has one row per sale with a region, a quarter and an amount. Finance wants a report with one row per region and one column per quarter, \`Q1\` to \`Q4\`, holding the total. Write that query. Then tell me what you would do if the list of quarters is not known in advance, and how the answer differs between PostgreSQL, SQL Server and SQLite."

**What a strong answer should cover:**
- Pivoting turns the distinct values of one column into output columns; the portable way is **conditional aggregation**: \`GROUP BY\` the row key and one \`SUM(CASE WHEN quarter = 'Q1' THEN amount END)\` per column
- Empty cells: without \`ELSE\` the cell is NULL, with \`ELSE 0\` or \`COALESCE\` it is 0; choose deliberately, and make \`COUNT\` versus \`SUM\` behave right
- The \`FILTER (WHERE ...)\` clause (PostgreSQL, SQLite 3.30+) as a cleaner spelling of the same thing
- Engine features: SQL Server and Oracle \`PIVOT\`, PostgreSQL \`crosstab()\` from the \`tablefunc\` extension; all need the column list written out
- SQL needs the output columns at parse time, so a pivot over unknown values needs **dynamic SQL** generated from the data (or pivoting in the application); and the reverse, unpivot, with \`UNION ALL\` or \`UNPIVOT\`

**Clarifying questions expected:**
- Is the set of pivot values fixed (four quarters) or does it grow with the data?
- Should a missing combination show 0 or be empty?
- Is the result for a human report (pivot in SQL or the BI tool) or for code (keep it long)?

**Code / implementation expected:** Yes — a conditional-aggregation pivot query; optionally the dynamic-SQL generator.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE sales (
  id INTEGER PRIMARY KEY,
  region TEXT NOT NULL,
  quarter TEXT NOT NULL,
  amount INTEGER NOT NULL
);
INSERT INTO sales (id, region, quarter, amount) VALUES
  (1, 'North', 'Q1', 100),
  (2, 'North', 'Q1', 50),
  (3, 'North', 'Q2', 120),
  (4, 'North', 'Q3', 90),
  (5, 'South', 'Q1', 80),
  (6, 'South', 'Q3', 60),
  (7, 'South', 'Q4', 110),
  (8, 'West', 'Q2', 70),
  (9, 'West', 'Q4', 40),
  (10, 'West', 'Q4', 25);
\`\`\``,
    answer: `**Target Audience:** Anyone building reports in SQL, from beginners who know \`GROUP BY\` to candidates who will be asked about dynamic pivots and engine-specific \`PIVOT\` syntax.
**Difficulty:** Hard
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15 with the \`tablefunc\` 1.0 extension, both run for this page. SQL Server and Oracle syntax is cited, not run.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result shown was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

A shop keeps its till receipts in a shoebox: every slip says which branch, which quarter, how much. That is a perfect way to **record** sales. But the owner wants a single sheet of paper with a row per branch and four boxes across, Q1 to Q4, each holding the total. To make it, you sort the slips into one pile per branch, then within each pile drop each slip into the right box and add up the boxes.

Databases store data the shoebox way (one row per event, called **long** format), because it is easy to add to and query. Reports and spreadsheets want the sheet-of-paper way (**wide** format). Turning one into the other is a pivot. Interviewers like the question because the simple answer tests \`GROUP BY\` and \`CASE\`, and the follow-up ("what if the quarters are not known?") tests whether you understand that SQL fixes its columns before it reads any data.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the list of pivot values fixed, like four quarters? | Fixed values mean a static query; unknown values mean dynamic SQL |
| Should a missing combination be 0 or empty? | Decides \`ELSE 0\` / \`COALESCE\` versus NULL |
| Which engine? | \`FILTER\`, \`PIVOT\` and \`crosstab\` exist only on some |
| Who consumes the result: a person, a BI tool, or code? | Code and BI tools usually prefer long rows and pivot themselves |
| Do you also need row and column totals? | A total column is one more aggregate; totals rows need \`ROLLUP\` |

## 3. Long vs Wide, and What a Pivot Is

📌 **Interview term: long (narrow) vs wide format** — long format stores one row per observation (\`region, quarter, amount\`); wide format spreads one variable across columns (\`region, q1, q2, q3, q4\`). Long is what tables should store; wide is what reports show.

📌 **Interview term: pivot** — reshaping long rows into wide columns: the distinct values of one column (quarter) become column headings, the values of another (amount) are aggregated into the cells, and the remaining column (region) becomes the row key. The reverse is an **unpivot**.

<svg class="iq-diagram" width="100%" viewBox="0 0 780 290" role="img" aria-label="Long rows of region, quarter and amount are reshaped into a wide table with one row per region and one column per quarter">
  <defs>
    <marker id="sql06q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="250" height="40" rx="8"/>
  <text class="d-text" x="145" y="46" text-anchor="middle">long: one row per sale</text>
  <rect class="d-box" x="20" y="76" width="250" height="32" rx="6"/>
  <text class="d-sub" x="145" y="97" text-anchor="middle">North | Q1 | 100</text>
  <rect class="d-box" x="20" y="116" width="250" height="32" rx="6"/>
  <text class="d-sub" x="145" y="137" text-anchor="middle">North | Q1 | 50</text>
  <rect class="d-box" x="20" y="156" width="250" height="32" rx="6"/>
  <text class="d-sub" x="145" y="177" text-anchor="middle">North | Q2 | 120</text>
  <rect class="d-box" x="20" y="196" width="250" height="32" rx="6"/>
  <text class="d-sub" x="145" y="217" text-anchor="middle">South | Q1 | 80</text>
  <rect class="d-box" x="20" y="236" width="250" height="32" rx="6"/>
  <text class="d-sub" x="145" y="257" text-anchor="middle">more rows</text>
  <rect class="d-box-muted" x="430" y="20" width="330" height="40" rx="8"/>
  <text class="d-text" x="595" y="46" text-anchor="middle">wide: one row per region</text>
  <rect class="d-box-muted" x="430" y="96" width="330" height="36" rx="6"/>
  <text class="d-sub" x="595" y="119" text-anchor="middle">region | q1 | q2 | q3 | q4</text>
  <rect class="d-box-accent" x="430" y="146" width="330" height="36" rx="6"/>
  <text class="d-text" x="595" y="169" text-anchor="middle">North | 150 | 120 | 90 | NULL</text>
  <rect class="d-box" x="430" y="196" width="330" height="36" rx="6"/>
  <text class="d-sub" x="595" y="219" text-anchor="middle">South | 80 | NULL | 60 | 110</text>
  <path class="d-edge-accent" d="M 280 150 L 420 150" marker-end="url(#sql06q5-arrow)"/>
  <text class="d-sub" x="350" y="136" text-anchor="middle">GROUP BY region</text>
</svg>

North had two sales in Q1 (100 and 50), so its Q1 cell is an aggregate, 150. Every pivot is an aggregation, even when each cell happens to hold one row.

## 4. The Portable Answer: Conditional Aggregation

📌 **Interview term: conditional aggregation** — an aggregate whose input is a \`CASE\` expression, so each aggregate only "sees" the rows matching its condition. One such aggregate per output column, plus \`GROUP BY\` on the row key, is a pivot that runs on every SQL engine. The \`CASE\` expression itself is explained in [What is the CASE expression?](/interview-question/what-is-the-case-expression)

<svg class="iq-diagram" width="100%" viewBox="0 0 760 210" role="img" aria-label="Each pivot column is a CASE expression that lets through only the amounts of one quarter, and SUM adds what passes">
  <defs>
    <marker id="sql06q5-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="200" height="40" rx="6"/>
  <text class="d-sub" x="120" y="55" text-anchor="middle">North | Q1 | 100</text>
  <rect class="d-box" x="20" y="90" width="200" height="40" rx="6"/>
  <text class="d-sub" x="120" y="115" text-anchor="middle">North | Q1 | 50</text>
  <rect class="d-box" x="20" y="150" width="200" height="40" rx="6"/>
  <text class="d-sub" x="120" y="175" text-anchor="middle">North | Q2 | 120</text>
  <rect class="d-box-muted" x="280" y="30" width="220" height="40" rx="6"/>
  <text class="d-sub" x="390" y="55" text-anchor="middle">CASE gives 100</text>
  <rect class="d-box-muted" x="280" y="90" width="220" height="40" rx="6"/>
  <text class="d-sub" x="390" y="115" text-anchor="middle">CASE gives 50</text>
  <rect class="d-box-muted" x="280" y="150" width="220" height="40" rx="6"/>
  <text class="d-sub" x="390" y="175" text-anchor="middle">CASE gives NULL</text>
  <rect class="d-box-accent" x="560" y="90" width="180" height="40" rx="8"/>
  <text class="d-text" x="650" y="115" text-anchor="middle">q1 = SUM = 150</text>
  <path class="d-edge" d="M 224 50 L 276 50" marker-end="url(#sql06q5-arrow2)"/>
  <path class="d-edge" d="M 224 110 L 276 110" marker-end="url(#sql06q5-arrow2)"/>
  <path class="d-edge" d="M 224 170 L 276 170" marker-end="url(#sql06q5-arrow2)"/>
  <path class="d-edge-accent" d="M 504 50 L 530 50 L 530 104 L 556 104" marker-end="url(#sql06q5-arrow2)"/>
  <path class="d-edge-accent" d="M 504 110 L 556 110" marker-end="url(#sql06q5-arrow2)"/>
  <path class="d-edge-dashed" d="M 504 170 L 530 170 L 530 118 L 556 118"/>
</svg>

For the \`q1\` column, the \`CASE\` passes Q1 amounts through and turns every other row into NULL; \`SUM\` ignores the NULLs. The first example builds the full report, with one column using \`ELSE 0\` to show the difference, and a row total:

~~~text
region | q1 | q2 | q3 | q4_zero | total
North | 150 | 120 | 90 | 0 | 360
South | 80 | NULL | 60 | 110 | 250
West | NULL | 70 | NULL | 65 | 135
~~~

Read the empty cells:

- **South has no Q2 sale**, so \`q2\` is NULL: no value passed the \`CASE\`, and \`SUM\` of nothing is NULL.
- **North has no Q4 sale**, but \`q4_zero\` shows 0, because \`ELSE 0\` fed a 0 into the sum for every non-Q4 row.

Both are valid; a report usually wants 0, a data feed may want NULL to mean "no data". Write \`COALESCE(SUM(CASE ... END), 0)\` if you want 0 without the \`ELSE\`; see [What do COALESCE and NULLIF do?](/interview-question/what-do-coalesce-and-nullif-do)

**The COUNT trap.** For counting, \`ELSE 0\` is wrong, because \`COUNT\` counts every non-NULL value and 0 is not NULL:

~~~sql
SELECT region,
       COUNT(CASE WHEN quarter = 'Q1' THEN 1 ELSE 0 END) AS wrong_q1_orders,
       COUNT(CASE WHEN quarter = 'Q1' THEN 1 END) AS right_q1_orders
FROM sales
GROUP BY region
ORDER BY region;
~~~

~~~text
region | wrong_q1_orders | right_q1_orders
North | 4 | 2
South | 3 | 1
West | 3 | 0
~~~

The "wrong" column is just the number of rows per region. See [What is the difference between COUNT(*), COUNT(col), and COUNT(DISTINCT col)?](/interview-question/what-is-the-difference-between-count-count-col-and-count-distinct-col)

## 5. The FILTER Clause

📌 **Interview term: FILTER clause** — \`aggregate(...) FILTER (WHERE condition)\`, the SQL-standard way to restrict which rows one aggregate sees. It means the same as conditional aggregation and reads better. Supported by PostgreSQL and by SQLite since 3.30.0 ([SQLite 3.30.0 release log](https://www.sqlite.org/releaselog/3_30_0.html)). MySQL and SQL Server do not support it, going by how [jOOQ translates FILTER](https://www.jooq.org/doc/dev/manual/sql-building/column-expressions/aggregate-functions/aggregate-filter) (it emits a \`CASE\` for those dialects); use \`CASE\` there.

The second example counts orders per quarter and sums half-years, with \`COALESCE\` turning empty halves into 0:

~~~text
region | q1_orders | q4_orders | h1_amount | h2_amount
North | 2 | 0 | 270 | 90
South | 1 | 1 | 80 | 170
West | 0 | 2 | 70 | 65
~~~

\`COUNT(*) FILTER (...)\` returns 0 for no matching rows (a count of nothing is 0), whereas \`SUM\` returns NULL, which is why only the sums are wrapped.

## 6. Engine-Specific Pivot Operators

### PostgreSQL: crosstab()

📌 **Interview term: crosstab** — a function in PostgreSQL \`tablefunc\` extension that takes a query returning \`(row_name, category, value)\` rows and returns one row per \`row_name\` with one column per category. You must declare the output columns and their types in an \`AS ct(...)\` clause. Documented in [PostgreSQL 16 tablefunc](https://www.postgresql.org/docs/16/tablefunc.html).

The third example runs it on PostgreSQL 16, with the extension created in the scratch database first:

~~~text
region | q1 | q2 | q3 | q4
North | 150 | 120 | 90 | NULL
South | 80 | NULL | 60 | 110
West | NULL | 70 | NULL | 65
~~~

The second argument, the explicit category list, matters. With the one-argument form, values are placed into columns left to right as they arrive, so South (no Q2) would get its Q3 value in the \`q2\` column. The two-argument form places each value by category and leaves gaps as NULL, as above.

### SQL Server and Oracle: PIVOT

SQL Server and Oracle have a \`PIVOT\` operator in the \`FROM\` clause ([Microsoft: Using PIVOT and UNPIVOT](https://learn.microsoft.com/en-us/sql/t-sql/queries/from-using-pivot-and-unpivot)). Not run here:

~~~sql
-- SQL Server, not run here
SELECT region, [Q1], [Q2], [Q3], [Q4]
FROM (SELECT region, quarter, amount FROM sales) AS src
PIVOT (SUM(amount) FOR quarter IN ([Q1], [Q2], [Q3], [Q4])) AS p
ORDER BY region;
~~~

Every column of the source that is not aggregated or pivoted becomes part of the row key. Leaving \`id\` in \`src\` would produce one row per sale instead of per region, which is the most common \`PIVOT\` bug and the reason for the derived table. MySQL has no \`PIVOT\` operator in its [SELECT syntax](https://dev.mysql.com/doc/refman/8.4/en/select.html), so conditional aggregation is the way there, and in SQLite.

## 7. Dynamic Pivots: When the Columns Are Not Known

A SQL statement's result columns are fixed when it is parsed, before any row is read. There is no standard way to write "one column per quarter, whatever quarters exist". If a fifth quarter-like value appears, a static pivot silently ignores it.

📌 **Interview term: dynamic SQL** — SQL text built at run time and then executed, here to generate one \`CASE\` column per distinct value in the data. In PostgreSQL it runs through \`EXECUTE\` in PL/pgSQL, in SQL Server through \`sp_executesql\`, elsewhere from application code.

The fourth example generates the pivot query from the distinct quarters (SQLite \`GROUP_CONCAT\` with an ordered argument, from 3.44.0; in PostgreSQL use \`STRING_AGG\`, see [How do you aggregate values into a single string?](/interview-question/how-do-you-aggregate-values-into-a-single-string)):

~~~text
generated_sql
SELECT region, SUM(CASE WHEN quarter = 'Q1' THEN amount END) AS q1, SUM(CASE WHEN quarter = 'Q2' THEN amount END) AS q2, SUM(CASE WHEN quarter = 'Q3' THEN amount END) AS q3, SUM(CASE WHEN quarter = 'Q4' THEN amount END) AS q4 FROM sales GROUP BY region ORDER BY region;
~~~

Running that text gives the same \`q1\` to \`q4\` columns as the first example. Two rules: quote generated identifiers and literals properly (\`format('%I', ...)\` / \`quote_literal\` in PostgreSQL, \`QUOTENAME\` in SQL Server), because the values come from data and could otherwise inject SQL; and remember the result shape now changes when the data does, which can break whatever reads it. See [What is SQL injection and how do parameterized queries prevent it?](/interview-question/what-is-sql-injection-and-how-do-parameterized-queries-prevent-it)

## 8. Unpivot: Wide Back to Long

📌 **Interview term: unpivot** — turning columns back into rows, one row per (row key, column) pair. The portable form is one \`SELECT\` per column glued with \`UNION ALL\`:

~~~sql
WITH pivoted AS (
  SELECT region,
         SUM(CASE WHEN quarter = 'Q1' THEN amount END) AS q1,
         SUM(CASE WHEN quarter = 'Q2' THEN amount END) AS q2
  FROM sales GROUP BY region
)
SELECT region, 'Q1' AS quarter, q1 AS amount FROM pivoted WHERE q1 IS NOT NULL
UNION ALL
SELECT region, 'Q2', q2 FROM pivoted WHERE q2 IS NOT NULL
ORDER BY region, quarter;
~~~

~~~text
region | quarter | amount
North | Q1 | 150
North | Q2 | 120
South | Q1 | 80
West | Q2 | 70
~~~

The CTE is only there to have a wide table to unpivot; see [What is a CTE (Common Table Expression)?](/interview-question/what-is-a-cte-common-table-expression) and [What is the difference between UNION and UNION ALL?](/interview-question/what-is-the-difference-between-union-and-union-all). PostgreSQL can do it in one pass with \`CROSS JOIN LATERAL (VALUES ('Q1', q1), ('Q2', q2))\` ([What is a LATERAL join?](/interview-question/what-is-a-lateral-join)), SQL Server with \`UNPIVOT\`.

## 9. Choosing a Technique

| Technique | Engines | Column list | Empty cells | Notes |
| :--- | :--- | :--- | :--- | :--- |
| \`SUM(CASE ...)\` | all | written out | NULL, or 0 with \`ELSE 0\` | portable default |
| \`FILTER (WHERE ...)\` | PostgreSQL, SQLite 3.30+ | written out | NULL for \`SUM\`, 0 for \`COUNT\` | clearer to read |
| \`crosstab()\` | PostgreSQL + \`tablefunc\` | written out with types | NULL | use the two-argument form |
| \`PIVOT\` | SQL Server, Oracle | written out | NULL | strip extra columns in a derived table first |
| Dynamic SQL | all, via procedure or app | generated | as above | escape identifiers, unstable result shape |
| Pivot in the client / BI tool | any | none | tool decides | often the right answer for reports |

Grand totals per row are one more aggregate (the \`total\` column above). A totals row at the bottom is the job of \`GROUP BY ROLLUP\`: [What do GROUP BY ROLLUP and CUBE do?](/interview-question/what-do-group-by-rollup-and-cube-do)

## 10. Verified: Running the Code

The three SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above). The \`crosstab\` example and the PostgreSQL behaviour above were run on PostgreSQL 16.15 with \`tablefunc\` 1.0 in a scratch database with the same schema; the conditional-aggregation and \`FILTER\` queries also return identical results on PostgreSQL 16.

Example 1, conditional aggregation:

~~~text
region | q1 | q2 | q3 | q4_zero | total
North | 150 | 120 | 90 | 0 | 360
South | 80 | NULL | 60 | 110 | 250
West | NULL | 70 | NULL | 65 | 135
~~~

Example 2, \`FILTER\`:

~~~text
region | q1_orders | q4_orders | h1_amount | h2_amount
North | 2 | 0 | 270 | 90
South | 1 | 1 | 80 | 170
West | 0 | 2 | 70 | 65
~~~

Example 3, PostgreSQL \`crosstab\`:

~~~text
region | q1 | q2 | q3 | q4
North | 150 | 120 | 90 | NULL
South | 80 | NULL | 60 | 110
West | NULL | 70 | NULL | 65
~~~

Example 4, generated dynamic pivot:

~~~text
generated_sql
SELECT region, SUM(CASE WHEN quarter = 'Q1' THEN amount END) AS q1, SUM(CASE WHEN quarter = 'Q2' THEN amount END) AS q2, SUM(CASE WHEN quarter = 'Q3' THEN amount END) AS q3, SUM(CASE WHEN quarter = 'Q4' THEN amount END) AS q4 FROM sales GROUP BY region ORDER BY region;
~~~

## Common Pitfalls

- **Forgetting that every pivot aggregates.** Several rows can land in one cell (North Q1 is 100 + 50); using \`MAX\` where you meant \`SUM\` silently drops data.
- **\`ELSE 0\` inside \`COUNT\`.** It counts every row; leave out the \`ELSE\` or switch to \`SUM\`.
- **NULL vs 0 by accident.** Decide what an empty cell means and write \`ELSE 0\` or \`COALESCE\` on purpose.
- **Extra columns in a \`PIVOT\` source.** Any leftover column (like \`id\`) becomes part of the row key and explodes the rows.
- **One-argument \`crosstab\` with gaps.** Values shift into the wrong columns; pass the category list.
- **Unescaped dynamic SQL.** Pivot values come from data, so quote them as identifiers or validate them.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What a pivot is:</strong> <span style="color:#f0e2c8;">A pivot turns the distinct values of one column, here the quarters, into separate output columns, giving one row per region. It is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY</code> on the row key with one aggregate per output column.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Portable query:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Conditional aggregation</strong>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SUM(CASE WHEN quarter = 'Q1' THEN amount END) AS q1</code>, repeated per quarter, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY region</code>. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CASE</code> lets only that quarter through, the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SUM</code> adds it up. It runs on every engine.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Empty cells:</strong> <span style="color:#f0e2c8;">No <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ELSE</code> means a missing combination is NULL; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ELSE 0</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COALESCE</code> makes it 0. I ask which one the report wants. For counts I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(CASE WHEN ... THEN 1 END)</code>, never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ELSE 0</code>, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT</code> counts zeros.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Engine features:</strong> <span style="color:#f0e2c8;">PostgreSQL and SQLite have <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FILTER (WHERE quarter = 'Q1')</code>, a cleaner spelling. SQL Server and Oracle have a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PIVOT</code> operator, PostgreSQL has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">crosstab()</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tablefunc</code>. All of them still need the column list written out.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Unknown columns:</strong> <span style="color:#f0e2c8;">SQL must know its output columns when it is parsed, so a pivot over values that are not known in advance needs <strong style="color:#ffca28;">dynamic SQL</strong>: query the distinct values, generate the column list, execute the result. Often it is better to return long rows and let the BI tool or application pivot.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does COUNT(CASE ... ELSE 0 END) give the wrong number?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT</code> counts every non-NULL value, and 0 is not NULL, so it counts all rows of the group. Leave out the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ELSE</code> so non-matching rows become NULL and are skipped, or use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SUM(CASE ... THEN 1 ELSE 0 END)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you unpivot columns back into rows?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION ALL</code>, one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT</code> per column, or SQL Server <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNPIVOT</code>, or PostgreSQL <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CROSS JOIN LATERAL (VALUES ('Q1', q1), ('Q2', q2))</code>. Unpivoting is common when a spreadsheet-shaped table must be normalised.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is dynamic SQL safe here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only if the generated identifiers are escaped. The values come from data, so a quarter named with a quote would break the SQL or inject code. Quote them with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">quote_ident</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">format('%I')</code> in PostgreSQL or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">QUOTENAME</code> in SQL Server, or validate against an allow-list.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does crosstab need to be correct?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The source query must be ordered by row name, and with the one-argument form values fill columns from left to right, so a missing quarter shifts later values into the wrong column. The two-argument form with an explicit category list avoids that.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does a pivot perform?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is one scan and one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY</code>; each extra column only adds a cheap <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CASE</code>. The cost is the grouping, so an index or pre-aggregation on the row key helps; hundreds of columns usually mean the pivot belongs in the reporting layer.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Long vs wide format | One row per observation vs one column per category value |
| Pivot | Reshape long rows into wide columns, aggregating into the cells |
| Conditional aggregation | \`SUM(CASE WHEN ... THEN x END)\`: each aggregate sees only matching rows |
| FILTER clause | \`aggregate(...) FILTER (WHERE ...)\`, the standard spelling of the same idea |
| crosstab | PostgreSQL \`tablefunc\` function that pivots \`(row, category, value)\` rows |
| Dynamic SQL | SQL text generated and executed at run time, needed when the columns are not known |
| Unpivot | Turn columns back into rows, with \`UNION ALL\`, \`LATERAL VALUES\` or \`UNPIVOT\` |

**Conclusion:** A pivot is a \`GROUP BY\` on the row key with one aggregate per output column, where each aggregate only sees its own category: \`SUM(CASE WHEN quarter = 'Q1' THEN amount END)\`, or \`FILTER (WHERE ...)\` where supported. That works on every engine; \`crosstab\`, SQL Server and Oracle \`PIVOT\` are shorthands that still need the column list. Decide deliberately between NULL and 0 for empty cells, never put \`ELSE 0\` in a \`COUNT\`, and remember that SQL fixes its columns before reading data, so unknown pivot values need safely generated dynamic SQL, or a reporting layer that pivots long rows for you.`,
    examples: [
      {
        label: `Conditional aggregation: one SUM(CASE ...) per quarter, NULL vs ELSE 0, plus a total`,
        code: `SELECT region,
       SUM(CASE WHEN quarter = 'Q1' THEN amount END) AS q1,
       SUM(CASE WHEN quarter = 'Q2' THEN amount END) AS q2,
       SUM(CASE WHEN quarter = 'Q3' THEN amount END) AS q3,
       SUM(CASE WHEN quarter = 'Q4' THEN amount ELSE 0 END) AS q4_zero,
       SUM(amount) AS total
FROM sales
GROUP BY region
ORDER BY region;`,
      },
      {
        label: `The FILTER clause: counts and half-year sums per region (SQLite 3.30+ and PostgreSQL)`,
        code: `SELECT region,
       COUNT(*) FILTER (WHERE quarter = 'Q1') AS q1_orders,
       COUNT(*) FILTER (WHERE quarter = 'Q4') AS q4_orders,
       COALESCE(SUM(amount) FILTER (WHERE quarter IN ('Q1', 'Q2')), 0) AS h1_amount,
       COALESCE(SUM(amount) FILTER (WHERE quarter IN ('Q3', 'Q4')), 0) AS h2_amount
FROM sales
GROUP BY region
ORDER BY region;`,
      },
      {
        label: `PostgreSQL crosstab() from the tablefunc extension`,
        code: `CREATE EXTENSION IF NOT EXISTS tablefunc;

SELECT *
FROM crosstab(
  $$SELECT region, quarter, SUM(amount)::int
    FROM sales GROUP BY region, quarter ORDER BY 1, 2$$,
  $$VALUES ('Q1'), ('Q2'), ('Q3'), ('Q4')$$
) AS ct(region text, q1 int, q2 int, q3 int, q4 int)
ORDER BY region;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `Dynamic pivot: build the SELECT from the distinct quarters in the data`,
        code: `SELECT 'SELECT region, ' ||
       GROUP_CONCAT(
         'SUM(CASE WHEN quarter = ''' || quarter || ''' THEN amount END) AS ' || LOWER(quarter),
         ', ' ORDER BY quarter
       ) ||
       ' FROM sales GROUP BY region ORDER BY region;' AS generated_sql
FROM (SELECT DISTINCT quarter FROM sales) AS q;`,
      },
    ],
  },
];

export default augments;
