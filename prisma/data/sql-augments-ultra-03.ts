/**
 * SQL ULTRA — batch 03: NULLs and aggregates (NULL handling, COALESCE and
 * NULLIF, aggregate functions, the three COUNTs, GROUP BY). Every example was
 * run by scripts/verify-sql-examples.ts (sql.js 1.10.2 like the page,
 * PostgreSQL 16 for postgres examples); quoted output is that run's output.
 */
import type { SqlUltraAugment } from "./sql-augments.types";

const augments: SqlUltraAugment[] = [
  {
    title: `How does SQL handle NULL values?`,
    difficulty: "medium",
    seoDescription: `NULL means unknown: comparisons with it are UNKNOWN, so = NULL matches nothing. Learn IS NULL, three-valued logic, sorting, grouping and NOT IN traps.`,
    description: `**Question presented to candidate:**
"Some of our employees have no bonus recorded and some have no manager. Explain what NULL actually means in SQL, why \`WHERE bonus = NULL\` returns nothing, and which other places in a query NULL quietly changes the result."

**What a strong answer should cover:**
- NULL means unknown or missing, not zero and not an empty string; it is a marker, not a value
- Three-valued logic: comparisons with NULL give UNKNOWN, and WHERE, ON and HAVING keep only rows that are TRUE, so \`= NULL\` matches nothing; use \`IS NULL\` / \`IS NOT NULL\` or the null-safe \`IS [NOT] DISTINCT FROM\`
- NULL propagates through arithmetic and \`||\` concatenation; \`NOT (UNKNOWN)\` is still UNKNOWN, so a filter and its negation can both miss a row
- Where NULLs group together instead: GROUP BY, DISTINCT and set operations put all NULLs in one bucket; UNIQUE allows many NULLs (PostgreSQL 15 added \`NULLS NOT DISTINCT\`)
- Engine details: NULL sorts first in SQLite and last in PostgreSQL ascending (\`NULLS FIRST/LAST\`), Oracle treats \`''\` as NULL, aggregates skip NULLs, and \`NOT IN\` with a NULL in the list returns no rows

**Code / implementation expected:** Optional — show \`= NULL\` vs \`IS NULL\` and one case where a filter and its negation together lose rows.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  manager_id INTEGER,
  dept TEXT,
  bonus INTEGER,
  phone TEXT
);
INSERT INTO employees (id, name, manager_id, dept, bonus, phone) VALUES
  (1, 'Asha', NULL, 'Eng', 5000, '555-0101'),
  (2, 'Ben', 1, 'Eng', NULL, '555-0102'),
  (3, 'Chen', 1, 'Eng', 2000, NULL),
  (4, 'Dara', 1, 'Sales', 0, ''),
  (5, 'Eli', 4, 'Sales', NULL, NULL),
  (6, 'Fay', 4, NULL, 3000, '555-0106'),
  (7, 'Gus', 4, NULL, 1000, NULL);
\`\`\``,
    answer: `**Target Audience:** Beginners who know SELECT and WHERE, and anyone who has been surprised by a query that "lost" rows.
**Difficulty:** Medium
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16. MySQL, SQL Server and Oracle differences are cited where they matter.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you learn the words an interviewer expects. Every result shown was produced by actually running the query; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

Imagine a paper form with a box labelled "Bonus". For Asha someone wrote 5000. For Dara someone wrote 0. For Ben the box is blank.

Is Ben's bonus bigger than 1500? You cannot say. It is not "no": the honest answer is "I don't know". Is Ben's bonus the same as Eli's (also blank)? Again, you don't know: two blank boxes are not proof of two equal numbers.

SQL works exactly like that. A blank box is \`NULL\`, and SQL refuses to guess. That refusal is correct, but it surprises people in three ways:

1. \`WHERE bonus = NULL\` finds nobody, even though two rows are blank.
2. \`WHERE bonus > 1500\` plus \`WHERE NOT (bonus > 1500)\` together do not give you every row.
3. A total or a label silently becomes NULL because one ingredient was NULL.

Once you understand the "I don't know" rule, all three are predictable.

## 2. What NULL Is (and Is Not)

📌 **Interview term: NULL** — a marker meaning "this value is missing or unknown". It is not a value of the column's type: not \`0\`, not \`''\` (empty string), not \`false\`.

In the schema above:

| Employee | \`bonus\` | Meaning |
| :--- | :--- | :--- |
| Asha | 5000 | Known, 5000 |
| Dara | 0 | Known, zero |
| Ben | NULL | Unknown or not recorded |

Dara's \`phone\` is \`''\`, an empty but known string; Chen's is NULL. They behave differently everywhere below.

One engine is the exception: Oracle treats a zero-length string as NULL, so \`''\` and NULL are the same thing there and \`phone = ''\` never matches. Third-party guides document this (for example [IBM's note on Oracle returning NULL for empty strings](https://www.ibm.com/docs/SS7NQD_8.5.7/com.ibm.wbpm.mon.trbl.doc/trbl/ora_null_value.html)); it was not run here. SQLite and PostgreSQL keep \`''\` and NULL apart, as the examples show.

## 3. Three-Valued Logic

📌 **Interview term: three-valued logic (3VL)** — SQL conditions have three possible results: TRUE, FALSE and UNKNOWN. Any comparison (\`=\`, \`<>\`, \`<\`, \`>\`, \`IN\`, \`LIKE\`) with a NULL operand is UNKNOWN.

📌 **Interview term: UNKNOWN** — the truth value of a condition that cannot be decided. In SQLite and PostgreSQL it is represented as a NULL boolean.

The rule that makes this matter: **\`WHERE\`, \`JOIN ... ON\` and \`HAVING\` keep a row only when the condition is TRUE.** FALSE and UNKNOWN are both thrown away.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="A WHERE condition can be TRUE, FALSE or UNKNOWN, and only TRUE rows are kept">
  <defs>
    <marker id="sql03q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="112" width="190" height="76" rx="10"/>
  <text class="d-text" x="115" y="144" text-anchor="middle">bonus &gt; 1500</text>
  <text class="d-sub" x="115" y="168" text-anchor="middle">evaluated per row</text>
  <rect class="d-box-accent" x="300" y="20" width="190" height="70" rx="10"/>
  <text class="d-text" x="395" y="50" text-anchor="middle">TRUE</text>
  <text class="d-sub" x="395" y="72" text-anchor="middle">Asha, Chen, Fay</text>
  <rect class="d-box" x="300" y="115" width="190" height="70" rx="10"/>
  <text class="d-text" x="395" y="145" text-anchor="middle">FALSE</text>
  <text class="d-sub" x="395" y="167" text-anchor="middle">Dara, Gus</text>
  <rect class="d-box-muted" x="300" y="210" width="190" height="70" rx="10"/>
  <text class="d-text" x="395" y="240" text-anchor="middle">UNKNOWN</text>
  <text class="d-sub" x="395" y="262" text-anchor="middle">Ben, Eli (NULL bonus)</text>
  <rect class="d-box-accent" x="570" y="20" width="170" height="70" rx="10"/>
  <text class="d-text" x="655" y="50" text-anchor="middle">kept</text>
  <text class="d-sub" x="655" y="72" text-anchor="middle">in the result</text>
  <rect class="d-box-muted" x="570" y="162" width="170" height="70" rx="10"/>
  <text class="d-text" x="655" y="192" text-anchor="middle">dropped</text>
  <text class="d-sub" x="655" y="214" text-anchor="middle">not TRUE</text>
  <path class="d-edge" d="M 212 140 L 296 60" marker-end="url(#sql03q1-arrow)"/>
  <path class="d-edge" d="M 212 150 L 296 150" marker-end="url(#sql03q1-arrow)"/>
  <path class="d-edge" d="M 212 160 L 296 240" marker-end="url(#sql03q1-arrow)"/>
  <path class="d-edge-accent" d="M 492 55 L 566 55" marker-end="url(#sql03q1-arrow)"/>
  <path class="d-edge-dashed" d="M 492 150 L 566 190" marker-end="url(#sql03q1-arrow)"/>
  <path class="d-edge-dashed" d="M 492 245 L 566 205" marker-end="url(#sql03q1-arrow)"/>
</svg>

The diagram uses the real data: three employees have a bonus over 1500, two have a known bonus that is not, and Ben and Eli have no bonus, so the comparison is UNKNOWN for them and they are dropped along with the FALSE rows.

### The truth tables

\`AND\` and \`OR\` use the known side when it is enough to decide:

| a | b | a AND b | a OR b | NOT a |
| :--- | :--- | :--- | :--- | :--- |
| TRUE | UNKNOWN | UNKNOWN | **TRUE** | FALSE |
| FALSE | UNKNOWN | **FALSE** | UNKNOWN | TRUE |
| UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |

\`TRUE OR anything\` is TRUE, \`FALSE AND anything\` is FALSE. Everything else involving UNKNOWN stays UNKNOWN, including \`NOT UNKNOWN\`. PostgreSQL has a real \`boolean\` type, so the fourth example prints the table directly (\`t\`, \`f\`, \`NULL\`); SQLite has no boolean type and shows \`1\`, \`0\` and \`NULL\`.

## 4. Testing for NULL Correctly

📌 **Interview term: IS NULL / IS NOT NULL** — the predicates that test for the NULL marker. They always return TRUE or FALSE, never UNKNOWN.

~~~sql
SELECT COUNT(*) FROM employees WHERE bonus = NULL;   -- 0: every row is UNKNOWN
SELECT COUNT(*) FROM employees WHERE bonus IS NULL;  -- 2: Ben and Eli
~~~

The first example puts both side by side and then lists everyone with a missing bonus or phone:

~~~text
eq_null_matches | is_null_matches | is_not_null_matches
0 | 2 | 5

name | bonus | phone
Ben | NULL | 555-0102
Chen | 2000 | NULL
Eli | NULL | NULL
Gus | 1000 | NULL
~~~

Dara is not in the second list: her bonus is 0 and her phone is \`''\`, both known values.

📌 **Interview term: IS DISTINCT FROM / IS NOT DISTINCT FROM** — a null-safe comparison: it treats two NULLs as equal and a NULL vs a value as different, and it never returns UNKNOWN. It is standard SQL and works in PostgreSQL; SQLite added it in [3.39.0](https://sqlite.org/releaselog/3_39_0.html) as a spelling of its older \`IS\` / \`IS NOT\` operators. MySQL spells the null-safe equality \`<=>\` ([MySQL 8.4 manual](https://dev.mysql.com/doc/refman/8.4/en/comparison-operators.html)).

Use it when comparing two nullable columns, such as "did the phone change?" in an audit: \`old.phone IS DISTINCT FROM new.phone\` is TRUE when one side is NULL and the other is not, where \`old.phone <> new.phone\` would be UNKNOWN and silently skip the change.

## 5. NULL Spreads Through Expressions

📌 **Interview term: NULL propagation** — most operators and functions return NULL when any input is NULL: \`NULL + 500\`, \`'tel: ' || NULL\`, \`UPPER(NULL)\`, \`NULL > 3\`.

The third example shows it on every employee:

~~~text
name | bonus | bonus_plus_500 | label | not_blank
Asha | 5000 | 5500 | tel: 555-0101 | 1
Ben | NULL | NULL | tel: 555-0102 | 1
Chen | 2000 | 2500 | NULL | 1
Dara | 0 | 500 | tel:  | 0
...
~~~

Ben's bonus plus 500 is NULL; Chen's label disappears entirely because her phone is NULL. Dara's empty phone gives \`tel: \` with nothing after it, and \`not_blank\` correctly says she is the only one with a blank (not missing) phone. PostgreSQL gives the same values (with \`t\`/\`f\` for the boolean). Its \`CONCAT()\` function is an exception to propagation: \`CONCAT('tel: ', NULL)\` returned \`tel: \` there, ignoring the NULL argument.

The usual fix is to decide what NULL should mean and say so with [COALESCE](/interview-question/what-do-coalesce-and-nullif-do): \`COALESCE(bonus, 0) + 500\`.

### The rows a filter and its negation both miss

This is the subtle one. You might expect every row to satisfy either \`bonus > 1500\` or \`NOT (bonus > 1500)\`. The second example counts them:

~~~text
all_rows | gt_1500 | not_gt_1500
7 | 3 | 2

name | bonus | gt_1500 | not_gt_1500 | is_unknown
Ben | NULL | NULL | NULL | 1
Eli | NULL | NULL | NULL | 1
~~~

7 rows, 3 plus 2 accounted for, 2 missing. For Ben and Eli \`bonus > 1500\` is UNKNOWN, and \`NOT UNKNOWN\` is also UNKNOWN, so they fail both filters. This is why "show me everyone else" queries need an explicit \`OR bonus IS NULL\`.

### NOT IN with a NULL

\`x NOT IN (a, b, NULL)\` expands to \`x <> a AND x <> b AND x <> NULL\`. The last part is always UNKNOWN, so the whole condition can never be TRUE. On this data:

~~~sql
SELECT name FROM employees WHERE id NOT IN (SELECT manager_id FROM employees);
~~~

returned **zero rows** on both SQLite and PostgreSQL, because Asha's \`manager_id\` is NULL. Adding \`WHERE manager_id IS NOT NULL\` inside the subquery returned Ben, Chen, Eli, Fay and Gus. \`IN\` has the mirror effect: \`1 IN (2, NULL)\` is NULL, not FALSE, while \`2 IN (2, NULL)\` is TRUE. The full story, and why \`NOT EXISTS\` is the safe form, is on [What is the difference between NOT IN and NOT EXISTS when NULLs are involved?](/interview-question/what-is-the-difference-between-not-in-and-not-exists-when-nulls-are-involved)

## 6. Where NULLs Are Treated as the Same

Comparisons say "two NULLs are not known to be equal", but several operations need to put rows into buckets, and there SQL treats all NULLs as one bucket:

| Operation | NULL behaviour (SQLite 3.45 and PostgreSQL 16, run) |
| :--- | :--- |
| \`GROUP BY dept\` | All NULL depts form **one** group |
| \`SELECT DISTINCT dept\` | One NULL row in the output |
| \`UNION\`, \`INTERSECT\`, \`EXCEPT\` | NULLs count as duplicates of each other |
| \`UNIQUE\` constraint | **Many** NULLs allowed (they do not collide) |
| \`UNIQUE NULLS NOT DISTINCT\` | PostgreSQL 15+ only: a second NULL is rejected |
| \`ORDER BY\` | All NULLs sort together, at one end |

In the third example \`GROUP BY dept\` returned \`Eng 3\`, \`Sales 2\`, \`NULL 2\`: Fay and Gus land in one NULL group.

The UNIQUE row was checked by creating a \`code TEXT UNIQUE\` table and inserting NULL twice: both engines kept 2 rows. With \`UNIQUE NULLS NOT DISTINCT\` on PostgreSQL 16, the second insert failed:

~~~text
ERROR:  duplicate key value violates unique constraint "b2_code_key"
DETAIL:  Key (code)=(null) already exists.
~~~

The option arrived in PostgreSQL 15 ([release notes, as summarised by Percona](https://www.percona.com/blog/postgresql-are-all-nulls-the-same/)). SQL Server is the odd one out here: its unique constraints allow only one NULL, and the usual workaround is a filtered unique index with \`WHERE col IS NOT NULL\` ([Red Gate](https://www.red-gate.com/simple-talk/other/allow-nulls-unique-fields/)); this was not run here.

### NULL in ORDER BY

📌 **Interview term: NULLS FIRST / NULLS LAST** — modifiers on an \`ORDER BY\` key that say where NULLs go, overriding the engine default.

SQLite treats NULL as smaller than every value, so ascending order puts NULL first (the third example: Ben and Eli lead). PostgreSQL treats NULL as larger, so the same \`ORDER BY bonus, id\` put them last. \`ORDER BY bonus NULLS LAST, id\` gave identical output on both. SQLite has accepted \`NULLS FIRST/LAST\` since [3.30.0](https://www.sqlite.org/releaselog/3_30_0.html). For a portable query, always spell it out when NULLs can appear.

## 7. NULL and Aggregates, in One Paragraph

Aggregate functions that take a column skip NULLs: \`COUNT(bonus)\` is 5, \`SUM(bonus)\` adds the 5 known values, and \`AVG(bonus)\` divides by 5, not 7. \`COUNT(*)\` counts rows and so counts all 7. Over zero rows, \`SUM\`, \`AVG\`, \`MIN\` and \`MAX\` return NULL while \`COUNT\` returns 0. These are covered in depth on [What are the common aggregate functions?](/interview-question/what-are-the-common-aggregate-functions) and [What is the difference between COUNT(*), COUNT(col), and COUNT(DISTINCT col)?](/interview-question/what-is-the-difference-between-count-count-col-and-count-distinct-col).

## 8. NULL in Joins

An outer join produces NULLs for the side that has no match: a \`LEFT JOIN\` from employees to a table with no row for Eli gives NULL in every column of the right side. Two consequences:

- Test for "no match" with \`right_table.id IS NULL\`, never \`= NULL\`.
- A join condition \`a.col = b.col\` never matches two NULLs, so rows with NULL keys never join each other. Use \`IS NOT DISTINCT FROM\` in the \`ON\` clause if NULL keys should match (and expect that it may stop the planner from using a plain hash join).

The joins themselves are covered in [What are the different types of SQL joins?](/interview-question/what-are-the-different-types-of-sql-joins)

## 9. Verified: Running the Code

The three SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above). The PostgreSQL example ran on PostgreSQL 16 in a throwaway database with the same schema. Every claim about PostgreSQL in the text (sorting, \`NOT IN\`, \`UNIQUE NULLS NOT DISTINCT\`, \`CONCAT\`) was run the same way.

Example 1, \`= NULL\` vs \`IS NULL\`:

~~~text
eq_null_matches | is_null_matches | is_not_null_matches
0 | 2 | 5

name | bonus | phone
Ben | NULL | 555-0102
Chen | 2000 | NULL
Eli | NULL | NULL
Gus | 1000 | NULL
~~~

Example 2, the rows a filter and its negation both miss:

~~~text
all_rows | gt_1500 | not_gt_1500
7 | 3 | 2

name | bonus | gt_1500 | not_gt_1500 | is_unknown
Ben | NULL | NULL | NULL | 1
Eli | NULL | NULL | NULL | 1
~~~

Example 3, propagation, grouping and sorting:

~~~text
name | bonus | bonus_plus_500 | label | not_blank
Asha | 5000 | 5500 | tel: 555-0101 | 1
Ben | NULL | NULL | tel: 555-0102 | 1
Chen | 2000 | 2500 | NULL | 1
Dara | 0 | 500 | tel:  | 0
Eli | NULL | NULL | NULL | 1
Fay | 3000 | 3500 | tel: 555-0106 | 1
Gus | 1000 | 1500 | NULL | 1

dept | people
Eng | 3
Sales | 2
NULL | 2

name | bonus
Ben | NULL
Eli | NULL
Dara | 0
Gus | 1000
Chen | 2000
Fay | 3000
Asha | 5000
~~~

Example 4, PostgreSQL truth table:

~~~text
a | b | a_and_b | a_or_b | not_a | eq_is_unknown | null_safe_eq
t | NULL | NULL | t | f | t | f
f | NULL | f | NULL | t | t | f
NULL | NULL | NULL | NULL | NULL | t | t
~~~

Read example 4 row by row: \`true AND NULL\` is NULL but \`true OR NULL\` is \`t\`; \`false AND NULL\` is \`f\` but \`false OR NULL\` is NULL. \`(a = b) IS NULL\` is \`t\` on every row, because every comparison involved a NULL, while \`IS NOT DISTINCT FROM\` gives a definite answer, and \`t\` for NULL vs NULL.

## Common Pitfalls

- **Writing \`= NULL\` or \`<> NULL\`.** Always UNKNOWN, so it matches nothing. Use \`IS NULL\` / \`IS NOT NULL\`.
- **Assuming a filter and its \`NOT\` cover every row.** Rows where the condition is UNKNOWN fail both. Add \`OR col IS NULL\` to the "everything else" side.
- **\`NOT IN\` against a subquery that can return NULL.** One NULL makes the result empty. Use \`NOT EXISTS\`, or filter the NULLs out in the subquery.
- **Letting NULL leak into totals and labels.** \`price * qty\` or \`first || ' ' || last\` becomes NULL if one part is NULL; wrap the nullable part in \`COALESCE\`.
- **Relying on the default NULL sort position.** SQLite and PostgreSQL disagree; write \`NULLS FIRST\` or \`NULLS LAST\`.
- **Using NULL and a sentinel interchangeably.** \`0\`, \`''\` and NULL mean different things; mixing them makes every query need two checks. Pick one meaning per column, and add \`NOT NULL\` where a value is required (see [What are NOT NULL, DEFAULT and other column constraints?](/interview-question/what-are-not-null-default-and-other-column-constraints)).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What NULL is:</strong> <span style="color:#f0e2c8;">NULL is a marker for a value that is missing or unknown. It is not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code>, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">''</code> and not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code>; a bonus of 0 is a known amount, a NULL bonus means nobody recorded one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Three-valued logic:</strong> <span style="color:#f0e2c8;">Any comparison with NULL, even <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NULL = NULL</code>, is <strong style="color:#ffca28;">UNKNOWN</strong>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ON</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HAVING</code> keep only TRUE rows, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE bonus = NULL</code> returns nothing. Test with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IS NULL</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IS NOT NULL</code>, or the null-safe <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IS NOT DISTINCT FROM</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. It propagates:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NULL + 500</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'tel: ' || NULL</code> are NULL, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT UNKNOWN</code> is still UNKNOWN, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bonus &gt; 1500</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT (bonus &gt; 1500)</code> together miss the NULL rows. Decide explicitly what NULL should mean, often with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COALESCE</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Where NULLs group:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DISTINCT</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION</code> put all NULLs in one group, while a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNIQUE</code> column accepts many NULLs (PostgreSQL 15 added <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NULLS NOT DISTINCT</code>). Aggregates such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SUM</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AVG</code> skip NULLs.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Engine traps:</strong> <span style="color:#f0e2c8;">SQLite sorts NULL first ascending, PostgreSQL last, so write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NULLS FIRST/LAST</code> when it matters. Oracle stores <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">''</code> as NULL. And <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT IN (subquery)</code> returns no rows when the subquery yields a NULL; use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT EXISTS</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">NULL = NULL</code> not TRUE?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two unknown values are not known to be equal, so the answer is UNKNOWN. Running <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CASE WHEN NULL = NULL THEN 'equal' ELSE 'not proven equal' END</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">not proven equal</code> in both SQLite and PostgreSQL. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IS NOT DISTINCT FROM</code> when you want NULLs to match.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">NULL OR TRUE</code> NULL as well?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OR</code> is TRUE if either side is TRUE, whatever the other side is, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AND</code> is FALSE if either side is FALSE. Only when the known side cannot decide it does the result stay UNKNOWN: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true AND NULL</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false OR NULL</code> are NULL in PostgreSQL 16.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">NOT IN</code> break with NULLs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x NOT IN (1, NULL)</code> means <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x &lt;&gt; 1 AND x &lt;&gt; NULL</code>; the second part is UNKNOWN, so the whole thing is never TRUE. Here <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">id NOT IN (SELECT manager_id FROM employees)</code> returned zero rows because Asha has a NULL manager_id. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT EXISTS</code> does not have this problem.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">UNIQUE</code> column hold two NULLs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, by default in SQLite and PostgreSQL: NULLs are not equal to each other, so they do not collide. Both engines accepted two NULL rows. PostgreSQL 15 added <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNIQUE NULLS NOT DISTINCT</code>, which made the second insert fail with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">duplicate key value violates unique constraint</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">COUNT</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">AVG</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Aggregates over a column skip NULLs: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(bonus)</code> counts 5 of 7 rows and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AVG(bonus)</code> divides by 5, not 7. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(*)</code> counts rows, NULL or not. If NULL should mean zero, write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AVG(COALESCE(bonus, 0))</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| NULL | A marker for a missing or unknown value; not 0, not \`''\`, not false |
| Three-valued logic (3VL) | Conditions evaluate to TRUE, FALSE or UNKNOWN |
| UNKNOWN | The result of a comparison involving NULL; WHERE, ON and HAVING drop it like FALSE |
| IS NULL / IS NOT NULL | Predicates that test for the NULL marker and always return TRUE or FALSE |
| IS DISTINCT FROM | Null-safe comparison that treats two NULLs as equal and never returns UNKNOWN |
| NULL propagation | Operators and most functions return NULL when an input is NULL |
| NULLS FIRST / NULLS LAST | ORDER BY modifiers that place NULLs explicitly |

**Conclusion:** NULL means "unknown", and SQL takes that literally: any comparison with NULL is UNKNOWN, and WHERE, ON and HAVING keep only TRUE rows, so \`= NULL\` matches nothing and a condition and its negation can both miss a row. NULL spreads through arithmetic and concatenation, makes \`NOT IN\` return nothing, and sorts to different ends in SQLite and PostgreSQL, yet GROUP BY, DISTINCT and set operations treat all NULLs as one group and UNIQUE lets many of them in. Test with \`IS NULL\` or \`IS DISTINCT FROM\`, say what a NULL should become with \`COALESCE\`, write \`NULLS FIRST/LAST\` when order matters, and prefer \`NOT EXISTS\` over \`NOT IN\`.`,
    examples: [
      {
        label: `= NULL matches nothing; IS NULL and IS NOT NULL do the job`,
        code: `SELECT
  (SELECT COUNT(*) FROM employees WHERE bonus = NULL) AS eq_null_matches,
  (SELECT COUNT(*) FROM employees WHERE bonus IS NULL) AS is_null_matches,
  (SELECT COUNT(*) FROM employees WHERE bonus IS NOT NULL) AS is_not_null_matches;

SELECT name, bonus, phone
FROM employees
WHERE bonus IS NULL OR phone IS NULL
ORDER BY id;`,
      },
      {
        label: `A filter and its NOT together still miss the NULL rows`,
        code: `-- 7 employees, but "> 1500" plus "NOT > 1500" only accounts for 5
SELECT COUNT(*) AS all_rows,
       SUM(CASE WHEN bonus > 1500 THEN 1 ELSE 0 END) AS gt_1500,
       SUM(CASE WHEN NOT (bonus > 1500) THEN 1 ELSE 0 END) AS not_gt_1500
FROM employees;

-- The two missing rows: the comparison itself is NULL (UNKNOWN)
SELECT name, bonus,
       bonus > 1500 AS gt_1500,
       NOT (bonus > 1500) AS not_gt_1500,
       (bonus > 1500) IS NULL AS is_unknown
FROM employees
WHERE (bonus > 1500) IS NULL
ORDER BY id;`,
      },
      {
        label: `NULL spreads through expressions, groups together, and sorts first in SQLite`,
        code: `-- Arithmetic and || return NULL; IS DISTINCT FROM never does
SELECT name, bonus,
       bonus + 500 AS bonus_plus_500,
       'tel: ' || phone AS label,
       phone IS DISTINCT FROM '' AS not_blank
FROM employees
ORDER BY id;

-- GROUP BY puts every NULL dept into one group
SELECT dept, COUNT(*) AS people
FROM employees
GROUP BY dept
ORDER BY dept NULLS LAST;

-- Ascending sort: SQLite puts NULL first unless told otherwise
SELECT name, bonus
FROM employees
ORDER BY bonus, id;`,
      },
      {
        label: `PostgreSQL: the three-valued truth table with real booleans`,
        code: `SELECT v.a, v.b,
       v.a AND v.b AS a_and_b,
       v.a OR v.b AS a_or_b,
       NOT v.a AS not_a,
       (v.a = v.b) IS NULL AS eq_is_unknown,
       v.a IS NOT DISTINCT FROM v.b AS null_safe_eq
FROM (VALUES (true, NULL::boolean),
             (false, NULL::boolean),
             (NULL::boolean, NULL::boolean)) AS v(a, b);`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `What do COALESCE and NULLIF do?`,
    difficulty: "easy",
    seoDescription: `COALESCE returns the first non-NULL argument and NULLIF returns NULL when two values match. Learn fallbacks, safe division and engine differences.`,
    description: `**Question presented to candidate:**
"Our contacts table has optional nickname and phone columns, and our ad report divides clicks by impressions, which can be zero. Show me how COALESCE and NULLIF help with each, and explain how they relate to each other."

**What a strong answer should cover:**
- \`COALESCE(a, b, ...)\` returns the first argument that is not NULL, scanning left to right; NULL only if all are NULL
- \`NULLIF(a, b)\` returns NULL when \`a = b\`, otherwise \`a\`; the classic uses are turning a sentinel (\`''\`, \`0\`) into NULL and avoiding division by zero
- They combine: \`COALESCE(NULLIF(TRIM(email), ''), 'no email')\`, and \`x / NULLIF(y, 0)\`
- Both are standard shorthands for \`CASE\`; COALESCE stops evaluating once it finds a value
- Engine details: PostgreSQL raises \`division by zero\` and requires compatible argument types, SQLite returns NULL for \`x / 0\` and accepts mixed types; vendor variants \`IFNULL\` (MySQL, SQLite) and \`ISNULL\` (SQL Server) take two arguments and type the result differently

**Code / implementation expected:** Yes — a fallback chain with COALESCE and a safe ratio with NULLIF.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE contacts (
  id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  nickname TEXT,
  mobile TEXT,
  work_phone TEXT,
  email TEXT
);
INSERT INTO contacts (id, full_name, nickname, mobile, work_phone, email) VALUES
  (1, 'Asha Rao', 'Ash', '555-0101', '555-9001', 'asha@example.com'),
  (2, 'Ben Okafor', NULL, NULL, '555-9002', ''),
  (3, 'Chen Li', '', '555-0103', NULL, 'chen@example.com'),
  (4, 'Dara Diaz', NULL, NULL, NULL, '   '),
  (5, 'Eli Novak', 'Eli', NULL, NULL, NULL);
CREATE TABLE campaigns (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  impressions INTEGER NOT NULL,
  clicks INTEGER NOT NULL,
  budget INTEGER
);
INSERT INTO campaigns (id, name, impressions, clicks, budget) VALUES
  (1, 'Spring sale', 20000, 500, 1000),
  (2, 'Newsletter', 8000, 120, NULL),
  (3, 'Draft promo', 0, 0, 300),
  (4, 'Retargeting', 4000, 200, 600);
\`\`\``,
    answer: `**Target Audience:** Beginners who have met NULL and want the two tools that tame it, and candidates who need the engine details.
**Difficulty:** Easy
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16. SQL Server and MySQL variants are cited from their documentation.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you learn the words an interviewer expects. Every result and error shown was produced by actually running the query; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

You are phoning a friend. You try their mobile; no number saved. You try their work phone; nothing either. In the end you write "no phone" on your list. That is **COALESCE**: "try these in order, take the first one that exists".

Now the opposite. A form has an "email" box, and some people typed a few spaces just to get past it. Those spaces are not a real email; you want to treat them as "nothing entered". That is **NULLIF**: "if this value is the fake placeholder, pretend it is missing".

Both are tiny functions, but they answer the most common NULL question in real reports: what should a missing value turn into, and what should turn into a missing value? Background on NULL itself is on [How does SQL handle NULL values?](/interview-question/how-does-sql-handle-null-values)

## 2. COALESCE: The First Value That Exists

📌 **Interview term: COALESCE** — \`COALESCE(a, b, ...)\` returns the first argument that is not NULL, checking from left to right. If every argument is NULL, the result is NULL. It takes one or more arguments and is part of the SQL standard.

<svg class="iq-diagram" width="100%" viewBox="0 0 780 200" role="img" aria-label="COALESCE checks mobile, then work phone, then a default, and returns the first value that is not NULL">
  <defs>
    <marker id="sql03q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="60" width="160" height="80" rx="10"/>
  <text class="d-text" x="100" y="94" text-anchor="middle">mobile</text>
  <text class="d-sub" x="100" y="118" text-anchor="middle">NULL, skip</text>
  <rect class="d-box-muted" x="230" y="60" width="160" height="80" rx="10"/>
  <text class="d-text" x="310" y="94" text-anchor="middle">work_phone</text>
  <text class="d-sub" x="310" y="118" text-anchor="middle">NULL, skip</text>
  <rect class="d-box" x="440" y="60" width="160" height="80" rx="10"/>
  <text class="d-text" x="520" y="94" text-anchor="middle">no phone</text>
  <text class="d-sub" x="520" y="118" text-anchor="middle">first non-NULL</text>
  <rect class="d-box-accent" x="650" y="60" width="110" height="80" rx="10"/>
  <text class="d-text" x="705" y="94" text-anchor="middle">result</text>
  <text class="d-sub" x="705" y="118" text-anchor="middle">no phone</text>
  <path class="d-edge-dashed" d="M 182 100 L 226 100" marker-end="url(#sql03q2-arrow)"/>
  <path class="d-edge-dashed" d="M 392 100 L 436 100" marker-end="url(#sql03q2-arrow)"/>
  <path class="d-edge-accent" d="M 602 100 L 646 100" marker-end="url(#sql03q2-arrow)"/>
</svg>

The diagram is Dara: no mobile, no work phone, so the literal default wins.

~~~sql
COALESCE(mobile, work_phone, 'no phone')
~~~

| Contact | mobile | work_phone | Result |
| :--- | :--- | :--- | :--- |
| Asha | 555-0101 | 555-9001 | 555-0101 |
| Ben | NULL | 555-9002 | 555-9002 |
| Dara | NULL | NULL | no phone |

\`COALESCE(NULL, NULL)\` returns NULL on both engines, which is why a chain normally ends with a literal default.

📌 **Interview term: short-circuit evaluation** — stopping as soon as the answer is known. The [PostgreSQL docs](https://www.postgresql.org/docs/16/functions-conditional.html) say COALESCE evaluates only the arguments needed to find the result. A quick test: \`SELECT COALESCE(1, 1/0)\` returned \`1\` on PostgreSQL 16, although \`1/0\` alone raises \`division by zero\`.

## 3. NULLIF: Turn a Placeholder Into NULL

📌 **Interview term: NULLIF** — \`NULLIF(a, b)\` returns NULL if \`a = b\`, otherwise it returns \`a\`. It takes exactly two arguments.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="NULLIF compares two values and returns NULL when they are equal, otherwise the first value">
  <defs>
    <marker id="sql03q2-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="90" width="200" height="80" rx="10"/>
  <text class="d-text" x="120" y="124" text-anchor="middle">NULLIF(a, b)</text>
  <text class="d-sub" x="120" y="148" text-anchor="middle">is a equal to b</text>
  <rect class="d-box-muted" x="320" y="20" width="200" height="80" rx="10"/>
  <text class="d-text" x="420" y="54" text-anchor="middle">equal</text>
  <text class="d-sub" x="420" y="78" text-anchor="middle">return NULL</text>
  <rect class="d-box-accent" x="320" y="160" width="200" height="80" rx="10"/>
  <text class="d-text" x="420" y="194" text-anchor="middle">not equal or NULL</text>
  <text class="d-sub" x="420" y="218" text-anchor="middle">return a</text>
  <rect class="d-box" x="580" y="20" width="120" height="80" rx="10"/>
  <text class="d-text" x="640" y="54" text-anchor="middle">x / NULL</text>
  <text class="d-sub" x="640" y="78" text-anchor="middle">NULL, no error</text>
  <path class="d-edge" d="M 222 118 L 316 62" marker-end="url(#sql03q2-arrow2)"/>
  <path class="d-edge" d="M 222 142 L 316 198" marker-end="url(#sql03q2-arrow2)"/>
  <path class="d-edge-dashed" d="M 522 60 L 576 60" marker-end="url(#sql03q2-arrow2)"/>
</svg>

Two everyday uses:

1. **Placeholders to NULL.** \`NULLIF(nickname, '')\` treats an empty nickname as missing; \`NULLIF(TRIM(email), '')\` treats an all-spaces email as missing.
2. **Safe division.** \`clicks / NULLIF(impressions, 0)\`: when impressions is 0 the divisor becomes NULL, and anything divided by NULL is NULL, so you get "no rate" instead of an error.

If \`a\` is NULL, \`NULL = b\` is UNKNOWN, not TRUE, so NULLIF returns \`a\`, which is NULL anyway. \`NULLIF('a', 'b')\` returned \`a\`; \`NULLIF(1, 1.0)\` returned NULL on PostgreSQL, because the comparison is numeric.

## 4. The Two Together

The first example uses both on the contacts table:

~~~text
id | naive_name | display_name | best_phone | email
1 | Ash | Ash | 555-0101 | asha@example.com
2 | Ben Okafor | Ben Okafor | 555-9002 | no email
3 |  | Chen Li | 555-0103 | chen@example.com
4 | Dara Diaz | Dara Diaz | no phone | no email
5 | Eli | Eli | no phone | no email
~~~

Look at Chen. Her nickname is \`''\`, an empty string, which is a value, so \`COALESCE(nickname, full_name)\` stops at it and the \`naive_name\` is blank. Wrapping it as \`COALESCE(NULLIF(nickname, ''), full_name)\` turns the blank into NULL first, and COALESCE moves on to \`Chen Li\`. Ben's email \`''\` and Dara's \`'   '\` both become \`no email\` once \`TRIM\` and \`NULLIF\` have run.

📌 **Interview term: sentinel value** — a fake value standing in for "missing", such as \`''\`, \`0\`, \`-1\` or \`'N/A'\`. NULLIF converts a sentinel to NULL so the rest of the SQL treats it like any other missing value.

### Safe ratios

The second example computes a click-through rate:

~~~text
name | impressions | clicks | ctr_pct | ctr_shown
Spring sale | 20000 | 500 | 2.5 | 2.5
Newsletter | 8000 | 120 | 1.5 | 1.5
Draft promo | 0 | 0 | NULL | 0
Retargeting | 4000 | 200 | 5 | 5

name | ctr_integer
Spring sale | 2
Newsletter | 1
Draft promo | NULL
Retargeting | 5
~~~

\`Draft promo\` has 0 impressions. \`NULLIF(impressions, 0)\` makes its rate NULL, and \`COALESCE(..., 0)\` then picks what the report should display. Whether 0 is the right thing to show is a business choice: a rate of 0 claims "nobody clicked", while NULL honestly says "there was nothing to click". The second result set is a reminder of a separate trap: \`clicks * 100 / impressions\` with integers is integer division in both engines, so \`2.5\` becomes \`2\`. Multiply by \`100.0\` to get a decimal result.

### How the engines differ on division by zero

| Query | SQLite 3.45 (run) | PostgreSQL 16 (run) |
| :--- | :--- | :--- |
| \`SELECT 1/0\` | \`NULL\` | \`ERROR:  division by zero\` |
| \`clicks * 100.0 / impressions\` on the table | NULL for Draft promo | \`ERROR:  division by zero\`, whole query fails |
| \`clicks * 100.0 / NULLIF(impressions, 0)\` | NULL for Draft promo | NULL for Draft promo |

So in SQLite the NULLIF looks optional, but the same query without it fails outright on PostgreSQL. Writing it states your intent and keeps the query portable. The fourth example runs the safe version on PostgreSQL:

~~~text
name | ctr_pct | budget_label
Spring sale | 2.50 | 1000
Newsletter | 1.50 | not set
Draft promo | NULL | 300
Retargeting | 5.00 | 600
~~~

Note \`ROUND(numeric, 2)\` prints \`2.50\` in PostgreSQL, where SQLite printed \`2.5\`: PostgreSQL keeps the requested scale of a \`numeric\`.

## 5. COALESCE Inside Aggregates

Aggregates skip NULLs, so COALESCE changes what a number means. The third example:

~~~text
total_budget | avg_known_budgets | avg_unknown_as_zero
1900 | 633.3333333333334 | 475
~~~

\`AVG(budget)\` averages the 3 known budgets (1900 / 3). \`AVG(COALESCE(budget, 0))\` counts the Newsletter as a budget of 0 and divides by 4. Neither is wrong; they answer different questions, and an interviewer will want you to ask which one the business means. More on this in [What are the common aggregate functions?](/interview-question/what-are-the-common-aggregate-functions)

The other common placement is **outside** the aggregate: \`COALESCE(SUM(amount), 0)\`. \`SUM\` over zero rows returns NULL, so a customer with no orders in a [LEFT JOIN](/interview-question/what-are-the-different-types-of-sql-joins) report would show NULL instead of 0 without it.

## 6. They Are Just CASE

📌 **Interview term: syntactic shorthand** — a shorter way of writing something the language can already express. The standard defines both functions in terms of [CASE](/interview-question/what-is-the-case-expression):

~~~sql
COALESCE(a, b)  -- CASE WHEN a IS NOT NULL THEN a ELSE b END
NULLIF(a, b)    -- CASE WHEN a = b THEN NULL ELSE a END
~~~

The second result set of the third example computes both forms side by side and they match row for row. Knowing this helps when you need a variation the functions do not cover, such as "the first value that is not NULL and not negative".

## 7. Types, and the Vendor Variants

📌 **Interview term: type resolution** — how the engine decides the data type of an expression whose inputs have different types.

PostgreSQL requires all COALESCE arguments to resolve to one type. With the integer \`budget\`:

~~~text
ERROR:  invalid input syntax for type integer: "unknown"
~~~

That came from \`COALESCE(budget, 'unknown')\`: PostgreSQL tried to read \`'unknown'\` as an integer. Cast the column instead, \`COALESCE(budget::text, 'not set')\`, as the fourth example does. SQLite has dynamic typing and happily returned \`1000\`, \`unknown\`, \`300\`, \`600\` for the same query, which is convenient but means a column can come back with mixed types.

Vendor two-argument functions:

| Function | Where | Notes |
| :--- | :--- | :--- |
| \`COALESCE(a, b, ...)\` | Standard; all major engines | Any number of arguments |
| \`IFNULL(a, b)\` | MySQL, SQLite | Two arguments only; \`IFNULL(NULL, 'x')\` returned \`x\` in SQLite ([MySQL description](https://www.techonthenet.com/mysql/functions/ifnull.php)) |
| \`ISNULL(a, b)\` | SQL Server | Two arguments; result has the type of the **first** argument, while COALESCE uses the highest-precedence type ([Microsoft docs](https://learn.microsoft.com/en-us/sql/t-sql/language-elements/coalesce-transact-sql)) |

Do not confuse SQL Server \`ISNULL(a, b)\` with the standard predicate \`a IS NULL\`.

## 8. Verified: Running the Code

The three SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above). The PostgreSQL example ran on PostgreSQL 16 in a throwaway database with the same schema, and so did the error messages quoted above.

Example 1, fallback chains and blank strings:

~~~text
id | naive_name | display_name | best_phone | email
1 | Ash | Ash | 555-0101 | asha@example.com
2 | Ben Okafor | Ben Okafor | 555-9002 | no email
3 |  | Chen Li | 555-0103 | chen@example.com
4 | Dara Diaz | Dara Diaz | no phone | no email
5 | Eli | Eli | no phone | no email
~~~

Example 2, a safe click-through rate:

~~~text
name | impressions | clicks | ctr_pct | ctr_shown
Spring sale | 20000 | 500 | 2.5 | 2.5
Newsletter | 8000 | 120 | 1.5 | 1.5
Draft promo | 0 | 0 | NULL | 0
Retargeting | 4000 | 200 | 5 | 5

name | ctr_integer
Spring sale | 2
Newsletter | 1
Draft promo | NULL
Retargeting | 5
~~~

Example 3, COALESCE in an average, and the CASE equivalents:

~~~text
total_budget | avg_known_budgets | avg_unknown_as_zero
1900 | 633.3333333333334 | 475

name | with_coalesce | with_case | with_nullif | with_case2
Spring sale | 1000 | 1000 | 20000 | 20000
Newsletter | 0 | 0 | 8000 | 8000
Draft promo | 300 | 300 | NULL | NULL
Retargeting | 600 | 600 | 4000 | 4000
~~~

Example 4, PostgreSQL:

~~~text
name | ctr_pct | budget_label
Spring sale | 2.50 | 1000
Newsletter | 1.50 | not set
Draft promo | NULL | 300
Retargeting | 5.00 | 600
~~~

## Common Pitfalls

- **Expecting COALESCE to skip empty strings.** \`''\` and \`0\` are values; wrap them in \`NULLIF\` first.
- **Dividing without NULLIF.** It works in SQLite by returning NULL, then fails with \`division by zero\` the day the query runs on PostgreSQL.
- **Hiding a meaningful NULL.** \`COALESCE(rate, 0)\` turns "unknown" into "zero", which changes averages and charts. Decide which one the reader needs.
- **Mixing types in the arguments.** PostgreSQL rejects \`COALESCE(int_col, 'none')\`; cast to text explicitly.
- **Wrapping an indexed column in a filter.** \`WHERE COALESCE(col, 'x') = 'x'\` prevents a plain index lookup; write the \`OR col IS NULL\` form or index the expression.
- **Using \`ISNULL\` in SQL Server with a longer fallback.** The result takes the first argument type and can be cut short; COALESCE avoids that.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. COALESCE:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COALESCE(a, b, c)</code> returns the first argument that is not NULL, left to right, and NULL only if every argument is NULL. It is how you say what a missing value should become: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COALESCE(mobile, work_phone, 'no phone')</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. NULLIF:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NULLIF(a, b)</code> is the opposite direction: it returns NULL when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a = b</code>, otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code>. You use it to turn a placeholder such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">''</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code> into a real NULL.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Together:</strong> <span style="color:#f0e2c8;">The two classic combinations: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x / NULLIF(y, 0)</code> so a zero divisor gives NULL instead of an error, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COALESCE(NULLIF(TRIM(email), ''), 'no email')</code> so blank and missing are handled the same way.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. They are CASE:</strong> <span style="color:#f0e2c8;">Both are standard shorthands for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CASE</code>. COALESCE stops at the first value it finds, so later arguments are not evaluated: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COALESCE(1, 1/0)</code> returned 1 in PostgreSQL 16.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Engine differences:</strong> <span style="color:#f0e2c8;">PostgreSQL raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">division by zero</code> and wants arguments of one type, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COALESCE(budget, 'unknown')</code> on an integer fails; SQLite returns NULL for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x / 0</code> and allows mixed types. MySQL and SQLite also have two-argument <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IFNULL</code>, SQL Server has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ISNULL</code>, which takes the first argument type.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">COALESCE</code> return if all arguments are NULL?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">NULL. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COALESCE(NULL, NULL)</code> returned NULL in both engines. That is why a fallback chain usually ends with a literal default.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">COALESCE(nickname, full_name)</code> still show an empty name?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">''</code> is a value, not NULL, so COALESCE stops at it. In the example Chen gets an empty <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">naive_name</code>. Wrap the column in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NULLIF(nickname, '')</code> first, or clean the data with a constraint.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">NULLIF(y, 0)</code> needed in SQLite?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">SQLite already returns NULL for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x / 0</code>, so the query does not fail without it, but writing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NULLIF</code> documents the intent and makes the query portable: the same division raised <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ERROR: division by zero</code> in PostgreSQL 16.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;"><code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">COALESCE</code> vs <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ISNULL</code> in SQL Server?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ISNULL</code> takes exactly two arguments and returns the type of the first one, so a longer fallback string can be cut to the first column length; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COALESCE</code> takes any number and uses the highest-precedence type, per Microsoft docs. Prefer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COALESCE</code> for portability.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">COALESCE</code> hurt index use?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE COALESCE(status, 'new') = 'new'</code> wraps the column in an expression, so a plain index on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">status</code> cannot be used directly. Write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE status = 'new' OR status IS NULL</code>, or create an expression index on the exact expression.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| COALESCE | Returns the first non-NULL argument, or NULL if all are NULL |
| NULLIF | Returns NULL when its two arguments are equal, otherwise the first |
| Short-circuit evaluation | Stopping once the result is known; COALESCE does not evaluate later arguments |
| Sentinel value | A fake value such as \`''\` or \`0\` standing in for "missing" |
| Syntactic shorthand | A shorter spelling of an existing construct; both functions are CASE expressions |
| Type resolution | How the engine picks one result type from arguments of different types |

**Conclusion:** COALESCE and NULLIF are mirror images: COALESCE turns NULL into a value by taking the first non-NULL argument, and NULLIF turns a value into NULL when it equals a placeholder. Together they handle the two most common real-world cases, a fallback chain for optional columns and a safe ratio with \`x / NULLIF(y, 0)\`. Both are standard shorthands for CASE, COALESCE stops at the first value it finds, and the engines differ in ways that matter: PostgreSQL raises division by zero and insists on one argument type, SQLite quietly returns NULL and mixes types, and SQL Server ISNULL types its result from the first argument.`,
    examples: [
      {
        label: `COALESCE fallback chains, and NULLIF to treat blank strings as missing`,
        code: `SELECT id,
       COALESCE(nickname, full_name) AS naive_name,
       COALESCE(NULLIF(nickname, ''), full_name) AS display_name,
       COALESCE(mobile, work_phone, 'no phone') AS best_phone,
       COALESCE(NULLIF(TRIM(email), ''), 'no email') AS email
FROM contacts
ORDER BY id;`,
      },
      {
        label: `NULLIF(impressions, 0) makes the click-through rate safe, COALESCE picks what to show`,
        code: `SELECT name, impressions, clicks,
       clicks * 100.0 / NULLIF(impressions, 0) AS ctr_pct,
       COALESCE(ROUND(clicks * 100.0 / NULLIF(impressions, 0), 2), 0) AS ctr_shown
FROM campaigns
ORDER BY id;

-- Without 100.0 the division is integer division (500 * 100 / 20000 = 2)
SELECT name, clicks * 100 / NULLIF(impressions, 0) AS ctr_integer
FROM campaigns
ORDER BY id;`,
      },
      {
        label: `COALESCE changes what an average means: skip unknown budgets or count them as 0`,
        code: `SELECT SUM(budget) AS total_budget,
       AVG(budget) AS avg_known_budgets,
       AVG(COALESCE(budget, 0)) AS avg_unknown_as_zero
FROM campaigns;

-- The same logic written as CASE, which is what COALESCE and NULLIF mean
SELECT name,
       COALESCE(budget, 0) AS with_coalesce,
       CASE WHEN budget IS NOT NULL THEN budget ELSE 0 END AS with_case,
       NULLIF(impressions, 0) AS with_nullif,
       CASE WHEN impressions = 0 THEN NULL ELSE impressions END AS with_case2
FROM campaigns
ORDER BY id;`,
      },
      {
        label: `PostgreSQL: NULLIF prevents the division by zero error`,
        code: `SELECT name,
       ROUND(clicks * 100.0 / NULLIF(impressions, 0), 2) AS ctr_pct,
       COALESCE(budget::text, 'not set') AS budget_label
FROM campaigns
ORDER BY id;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `What are the common aggregate functions?`,
    difficulty: "medium",
    seoDescription: `COUNT, SUM, AVG, MIN and MAX turn many rows into one value. Learn how they treat NULLs and empty input, conditional FILTER aggregates and engine extras.`,
    description: `**Question presented to candidate:**
"Using an orders table, walk me through the aggregate functions you use most. What does each return, how do they treat NULLs and empty input, and how would you compute several different totals in one pass over the table?"

**What a strong answer should cover:**
- The core five: \`COUNT\`, \`SUM\`, \`AVG\`, \`MIN\`, \`MAX\`; each turns many rows into one value (per group with GROUP BY, for the whole table without)
- NULL handling: all of them except \`COUNT(*)\` skip NULLs, so \`AVG(col)\` divides by the non-NULL count; over zero rows \`COUNT\` is 0 and the others are NULL
- Types: \`MIN\`/\`MAX\` work on text and dates, \`SUM\`/\`AVG\` need numbers; integer \`SUM(x) / COUNT(*)\` truncates, \`AVG\` does not
- Conditional aggregation with \`FILTER (WHERE ...)\` or \`SUM(CASE ...)\`, so one scan answers several questions
- Beyond the core: string aggregation (\`string_agg\`, \`GROUP_CONCAT\`), statistics (\`stddev\`, \`percentile_cont\`), \`bool_and\`, and the difference between an aggregate and a window function

**Code / implementation expected:** Yes — one query with several aggregates, and one with conditional aggregates per region.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer TEXT NOT NULL,
  region TEXT NOT NULL,
  amount INTEGER NOT NULL,
  discount INTEGER,
  status TEXT NOT NULL,
  ordered_on DATE NOT NULL
);
INSERT INTO orders (id, customer, region, amount, discount, status, ordered_on) VALUES
  (1, 'Asha', 'North', 120, 10, 'shipped', '2024-01-05'),
  (2, 'Ben', 'North', 80, NULL, 'shipped', '2024-01-09'),
  (3, 'Asha', 'North', 200, 20, 'returned', '2024-02-02'),
  (4, 'Chen', 'South', 50, NULL, 'shipped', '2024-02-11'),
  (5, 'Dara', 'South', 300, 30, 'shipped', '2024-02-20'),
  (6, 'Eli', 'South', 75, 0, 'pending', '2024-03-01'),
  (7, 'Fay', 'West', 410, NULL, 'shipped', '2024-03-04'),
  (8, 'Gus', 'West', 65, 5, 'returned', '2024-03-15');
\`\`\``,
    answer: `**Target Audience:** Beginners writing their first reports, and candidates who want the NULL, empty-set and type rules an interviewer probes.
**Difficulty:** Medium
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16; one MySQL fact is cited from its manual.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you learn the words an interviewer expects. Every result shown was produced by actually running the query; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

At the end of the day a shop owner empties the till and asks five questions. How many sales did we make? How much money is that? What was a typical sale? What was the smallest and the biggest? Nobody answers by reading out every receipt; they squash the pile of receipts into one number per question.

That is exactly what an aggregate function does: it takes a pile of rows and returns one value. It is the basis of every dashboard, every "total by month" report and most interview SQL questions. The tricky part is not the arithmetic but the edges: receipts with a blank field (NULL), a day with no receipts at all (empty input), and whole numbers that divide badly.

## 2. What an Aggregate Function Is

📌 **Interview term: aggregate function** — a function that takes a set of input rows and returns one value for the set. Without \`GROUP BY\`, the whole filtered result is one set; with \`GROUP BY\`, each group is its own set (see [How does GROUP BY work with aggregate functions?](/interview-question/how-does-group-by-work-with-aggregate-functions)).

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="Eight order amounts go into an aggregate function, which returns one value such as a count, sum or maximum">
  <defs>
    <marker id="sql03q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="20" width="180" height="290" rx="10"/>
  <text class="d-text" x="110" y="52" text-anchor="middle">amount</text>
  <text class="d-sub" x="110" y="84" text-anchor="middle">120, 80</text>
  <text class="d-sub" x="110" y="116" text-anchor="middle">200, 50</text>
  <text class="d-sub" x="110" y="148" text-anchor="middle">300, 75</text>
  <text class="d-sub" x="110" y="180" text-anchor="middle">410, 65</text>
  <text class="d-sub" x="110" y="230" text-anchor="middle">8 input rows</text>
  <rect class="d-box-accent" x="280" y="125" width="170" height="80" rx="10"/>
  <text class="d-text" x="365" y="160" text-anchor="middle">aggregate</text>
  <text class="d-sub" x="365" y="184" text-anchor="middle">many rows to one</text>
  <rect class="d-box" x="540" y="20" width="200" height="56" rx="10"/>
  <text class="d-text" x="640" y="54" text-anchor="middle">COUNT(*) = 8</text>
  <rect class="d-box" x="540" y="96" width="200" height="56" rx="10"/>
  <text class="d-text" x="640" y="130" text-anchor="middle">SUM = 1300</text>
  <rect class="d-box" x="540" y="172" width="200" height="56" rx="10"/>
  <text class="d-text" x="640" y="206" text-anchor="middle">AVG = 162.5</text>
  <rect class="d-box" x="540" y="248" width="200" height="56" rx="10"/>
  <text class="d-text" x="640" y="282" text-anchor="middle">MIN 50, MAX 410</text>
  <path class="d-edge" d="M 202 165 L 276 165" marker-end="url(#sql03q3-arrow)"/>
  <path class="d-edge" d="M 452 150 L 536 50" marker-end="url(#sql03q3-arrow)"/>
  <path class="d-edge" d="M 452 160 L 536 124" marker-end="url(#sql03q3-arrow)"/>
  <path class="d-edge" d="M 452 170 L 536 198" marker-end="url(#sql03q3-arrow)"/>
  <path class="d-edge" d="M 452 180 L 536 274" marker-end="url(#sql03q3-arrow)"/>
</svg>

The diagram uses the 8 order amounts from the schema. Each aggregate reads all of them and produces one number.

| Function | Returns | Input types | NULLs | Zero rows |
| :--- | :--- | :--- | :--- | :--- |
| \`COUNT(*)\` | Number of rows | Any | Counted (it counts rows) | 0 |
| \`COUNT(col)\` | Number of non-NULL values | Any | Skipped | 0 |
| \`SUM(col)\` | Total | Numbers | Skipped | NULL |
| \`AVG(col)\` | Mean of non-NULL values | Numbers | Skipped (smaller divisor) | NULL |
| \`MIN(col)\` / \`MAX(col)\` | Smallest / largest | Anything sortable: numbers, text, dates | Skipped | NULL |

The three forms of COUNT have their own page: [What is the difference between COUNT(*), COUNT(col), and COUNT(DISTINCT col)?](/interview-question/what-is-the-difference-between-count-count-col-and-count-distinct-col)

## 3. The Core Five on Real Data

The first example runs them all at once:

~~~text
orders | revenue | avg_order | smallest | largest | first_day | last_name_alphabetically
8 | 1300 | 162.5 | 50 | 410 | 2024-01-05 | Gus
~~~

Two things to notice. \`MIN(ordered_on)\` works on a date (stored as \`YYYY-MM-DD\` text in SQLite, a real \`date\` in PostgreSQL); both sort correctly, so the earliest date wins. \`MAX(customer)\` works on text and returns the last name in alphabetical order. In PostgreSQL the result is identical except \`AVG\` prints as \`162.5000000000000000\`: \`avg\` of an integer column returns \`numeric\` there, while SQLite returns a floating-point \`real\`.

📌 **Interview term: scalar aggregate** — an aggregate query without \`GROUP BY\`. It always returns exactly one row, even when no rows matched.

## 4. NULLs and Empty Input

### NULLs are skipped

\`discount\` is NULL on 3 of the 8 orders (Ben, Chen, Fay). The second example's first result set:

~~~text
with_discount | total_discount | avg_of_known | avg_over_all_orders | avg_null_as_zero
5 | 65 | 13 | 8.125 | 8.125
~~~

- \`COUNT(discount)\` is 5, not 8.
- \`AVG(discount)\` is 65 / 5 = 13: the average of the discounts we know about.
- Dividing by every order gives 65 / 8 = 8.125, the same as \`AVG(COALESCE(discount, 0))\`, which counts a missing discount as zero.

Which one is right depends on what NULL means in the data: "not recorded" (use 13) or "no discount given" (use 8.125). Asking that question is a strong interview move. More on NULL in [How does SQL handle NULL values?](/interview-question/how-does-sql-handle-null-values) and on the fix in [What do COALESCE and NULLIF do?](/interview-question/what-do-coalesce-and-nullif-do)

### Empty input

No order is in region \`East\`. The second result set:

~~~text
n | total | avg | biggest | total_or_zero
0 | NULL | NULL | NULL | 0
~~~

There is no data, yet one row comes back, because a scalar aggregate always returns one row. \`COUNT\` answers 0, while \`SUM\`, \`AVG\` and \`MAX\` answer NULL: the sum of nothing is not defined in SQL. \`COALESCE(SUM(amount), 0)\` turns it into 0 for display. With a \`GROUP BY\` the same filter returns **no rows at all**, because there are no groups; the GROUP BY page shows that.

## 5. Types and Precision

📌 **Interview term: integer division** — dividing two integers gives an integer, with the fraction thrown away (run on SQLite and PostgreSQL).

The third example's last result set: \`SUM(amount) / COUNT(*)\` gave \`162\`, \`AVG(amount)\` gave \`162.5\`. A hand-rolled average on integer columns loses precision silently; use \`AVG\`, or multiply by \`1.0\` first. PostgreSQL returns the same \`162\` and \`162.5000000000000000\`.

\`SUM\` of a big integer column can also outgrow the column type; PostgreSQL returns \`bigint\` for \`sum(integer)\` and \`numeric\` for \`sum(bigint)\` ([PostgreSQL aggregate docs](https://www.postgresql.org/docs/16/functions-aggregate.html)), so it does not overflow in normal use. SQLite also has \`total(x)\`, which returns a float and returns 0 instead of NULL for no rows: on the empty East region \`total(amount)\` gave \`0\` where \`SUM(amount)\` gave NULL, and PostgreSQL has no such function (\`function total(integer) does not exist\`).

## 6. Conditional Aggregation: Several Answers in One Pass

📌 **Interview term: conditional aggregation** — feeding only some rows into an aggregate, so one query computes several differently filtered totals in a single scan.

📌 **Interview term: FILTER clause** — standard SQL syntax for conditional aggregation: \`SUM(amount) FILTER (WHERE status = 'shipped')\`. PostgreSQL supports it, and SQLite since [3.30.0](https://www.sqlite.org/releaselog/3_30_0.html). Not every engine does; \`SUM(CASE WHEN ... THEN amount ELSE 0 END)\` is the portable spelling that works everywhere.

The third example, per region:

~~~text
region | orders | shipped_revenue | returns | returned_amount
North | 3 | 200 | 1 | 200
South | 3 | 350 | 0 | 0
West | 2 | 410 | 1 | 65
~~~

One pass, four answers. Without conditional aggregation you would run one query per status, or self-join. A detail: if no row in a group passes the filter, \`SUM(...) FILTER\` returns NULL, while the CASE form with \`ELSE 0\` returns 0. Filtering on \`status = 'pending'\` gave NULL vs 0 for North and West, and 75 for both forms in South. Write \`ELSE NULL\` (or leave out the ELSE) if you want NULL. This pattern is also how [pivoting rows into columns](/interview-question/how-do-you-pivot-rows-into-columns) is done by hand.

## 7. Beyond the Core Five

| Need | PostgreSQL 16 (run) | SQLite in this page (sql.js 1.10.2, run) |
| :--- | :--- | :--- |
| Join strings | \`string_agg(x, ', ' ORDER BY x)\` | \`group_concat(x, ', ')\`; \`string_agg(x, ',')\` also ran |
| Array of values | \`array_agg(x)\` | none |
| All / any true | \`bool_and\`, \`bool_or\` | \`MIN\` / \`MAX\` over 0/1 conditions |
| Median, percentiles | \`percentile_cont\`, \`percentile_disc\` | \`median\`, \`lower_quartile\`, \`upper_quartile\` (bundled extras) |
| Most frequent value | \`mode() WITHIN GROUP (ORDER BY x)\` | none that worked: \`mode(amount)\` returned NULL |
| Spread | \`stddev_samp\`, \`var_samp\` | \`stdev\`, \`variance\` (bundled extras) |
| Any value of a group | \`any_value(x)\` (new in PostgreSQL 16) | none: \`no such function: ANY_VALUE\` |

The "bundled extras" are not core SQLite: the sql.js build behind this page includes them, but Python's SQLite 3.45.1 answered \`no such function: median\` and \`no such function: stdev\`. Do not count on them in another SQLite.

\`any_value\` came with PostgreSQL 16 as the SQL:2023 standard aggregate ([PostgreSQL 16 announcement](https://www.postgresql.org/about/news/postgresql-16-beta-1-released-2643)); MySQL has had its own \`ANY_VALUE()\` since 5.7 ([MySQL 5.7 manual](https://dev.mysql.com/doc/refman/5.7/en/group-by-handling.html)). String aggregation, including ordering and separators, has its own page: [How do you aggregate values into a single string?](/interview-question/how-do-you-aggregate-values-into-a-single-string)

The fourth example runs the PostgreSQL extras per region:

~~~text
region | median_amount | usual_status | stddev_amount | all_shipped | customers | statuses
North | 120 | shipped | 61.1 | f | Asha, Asha, Ben | {returned,shipped}
South | 75 | shipped | 137.7 | f | Chen, Dara, Eli | {pending,shipped}
West | 237.5 | returned | 244.0 | f | Fay, Gus | {returned,shipped}
~~~

📌 **Interview term: ordered-set aggregate** — an aggregate whose result depends on the order of the input, written with \`WITHIN GROUP (ORDER BY ...)\`; \`percentile_cont\` and \`mode\` are examples.

Read it carefully: \`percentile_cont(0.5)\` **interpolates**, so the median of West (410 and 65) is 237.5, an amount nobody paid; \`percentile_disc\` would return an actual value. \`mode()\` for West is a tie between \`returned\` and \`shipped\` (one each); PostgreSQL returned \`returned\`, and you should not depend on which value a tie gives. \`bool_and(status = 'shipped')\` is false everywhere because every region has a non-shipped order.

### DISTINCT inside an aggregate

\`SUM(DISTINCT amount)\` and \`COUNT(DISTINCT customer)\` aggregate each distinct value once. Asha has two North orders, so \`string_agg\` lists her twice while \`array_agg(DISTINCT status)\` lists each status once. \`SUM(DISTINCT x)\` is rarely what you want for money: two different orders of the same amount would be counted once.

## 8. Aggregate vs Window Function

📌 **Interview term: window function** — the same \`SUM\`, \`AVG\` or \`COUNT\`, written with \`OVER (...)\`, computes the value for a set of related rows **without collapsing them**. \`SUM(amount) OVER (PARTITION BY region)\` puts the region total on every order row. Use the aggregate form for "one row per group", the window form for "each row next to its group value". See [What are window functions?](/interview-question/what-are-window-functions) and [How do you calculate a running total or moving average?](/interview-question/how-do-you-calculate-a-running-total-or-moving-average)

An aggregate cannot be used in \`WHERE\`, because WHERE runs before rows are grouped; group filters go in \`HAVING\`. See [What is the difference between WHERE and HAVING?](/interview-question/what-is-the-difference-between-where-and-having)

## 9. Verified: Running the Code

The three SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above). The PostgreSQL example ran on PostgreSQL 16 in a throwaway database with the same schema. The SQLite queries were also run on PostgreSQL to confirm the numbers match (PostgreSQL prints \`avg\` with more decimal places).

Example 1, the core five:

~~~text
orders | revenue | avg_order | smallest | largest | first_day | last_name_alphabetically
8 | 1300 | 162.5 | 50 | 410 | 2024-01-05 | Gus
~~~

Example 2, NULLs and empty input:

~~~text
with_discount | total_discount | avg_of_known | avg_over_all_orders | avg_null_as_zero
5 | 65 | 13 | 8.125 | 8.125

n | total | avg | biggest | total_or_zero
0 | NULL | NULL | NULL | 0
~~~

Example 3, conditional aggregation and integer division:

~~~text
region | orders | shipped_revenue | returns | returned_amount
North | 3 | 200 | 1 | 200
South | 3 | 350 | 0 | 0
West | 2 | 410 | 1 | 65

integer_division | avg
162 | 162.5
~~~

Example 4, PostgreSQL extras:

~~~text
region | median_amount | usual_status | stddev_amount | all_shipped | customers | statuses
North | 120 | shipped | 61.1 | f | Asha, Asha, Ben | {returned,shipped}
South | 75 | shipped | 137.7 | f | Chen, Dara, Eli | {pending,shipped}
West | 237.5 | returned | 244.0 | f | Fay, Gus | {returned,shipped}
~~~

## Common Pitfalls

- **Assuming \`AVG\` counts NULLs as zero.** It skips them and divides by fewer rows. Use \`AVG(COALESCE(x, 0))\` if a missing value really means zero.
- **Expecting \`SUM\` of nothing to be 0.** It is NULL; reports show blanks or break downstream arithmetic. Wrap in \`COALESCE\`.
- **Hand-rolling an average with integers.** \`SUM(x) / COUNT(*)\` truncates; use \`AVG\` or multiply by \`1.0\`.
- **Mixing aggregated and plain columns without GROUP BY.** \`SELECT customer, SUM(amount) FROM orders\` is an error in PostgreSQL and returns an arbitrary customer in SQLite.
- **Running one query per condition.** Several \`FILTER\` or \`CASE\` aggregates in one query scan the table once.
- **Treating a median from \`percentile_cont\` as a real value.** It interpolates between two middle values; use \`percentile_disc\` if you need one that exists.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">An aggregate function turns a set of rows into one value: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SUM</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AVG</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MIN</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MAX</code>. Without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY</code> the set is the whole result; with it, each group gets its own value.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. NULLs:</strong> <span style="color:#f0e2c8;">Every aggregate over a column skips NULLs. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(*)</code> counts rows, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(discount)</code> counts known discounts, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AVG(discount)</code> divides by that smaller count, 13 here instead of 8.125 over all orders.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Empty input:</strong> <span style="color:#f0e2c8;">With no input rows, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT</code> returns 0 and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SUM</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AVG</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MIN</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MAX</code> return NULL, and a query without GROUP BY still returns one row. Wrap with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COALESCE(SUM(x), 0)</code> when the report wants zero.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. One pass, many answers:</strong> <span style="color:#f0e2c8;">Conditional aggregation computes several totals in one scan: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SUM(amount) FILTER (WHERE status = 'shipped')</code> in PostgreSQL and SQLite 3.30+, or the portable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SUM(CASE WHEN ... THEN amount ELSE 0 END)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Beyond the five:</strong> <span style="color:#f0e2c8;">Strings: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string_agg</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP_CONCAT</code>. Statistics: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stddev_samp</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">percentile_cont</code> for a median. Booleans: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bool_and</code>. And if you need the total next to each row instead of collapsing rows, that is a window function, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SUM(...) OVER (...)</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why might <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">AVG(col)</code> differ from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">SUM(col) / COUNT(*)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AVG</code> ignores NULLs, so it divides by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(col)</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SUM(col) / COUNT(*)</code> divides by every row, and with integers it also truncates: 1300 / 8 gave 162 while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AVG</code> gave 162.5.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">SUM</code> return when there are no rows?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">NULL, not 0. On the East region, which has no orders, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(*)</code> returned 0 and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SUM</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AVG</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MAX</code> returned NULL. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COALESCE(SUM(amount), 0)</code> gives 0.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">MIN</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">MAX</code> be used on text and dates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, they use the column ordering: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MIN(ordered_on)</code> gave <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2024-01-05</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MAX(customer)</code> gave <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Gus</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SUM</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AVG</code> need numbers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you compute a median?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">PostgreSQL has the ordered-set aggregate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">percentile_cont(0.5) WITHIN GROUP (ORDER BY amount)</code>, which interpolates (237.5 for the two West orders). Core SQLite has none, but the sql.js build behind this page bundles <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">median()</code>, which also gave 237.5 for West.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Aggregate vs window function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An aggregate with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY</code> collapses rows to one per group. The same function with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OVER (PARTITION BY region)</code> keeps every row and adds the group value next to it, for example each order beside its region total.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Aggregate function | Turns a set of rows into one value: COUNT, SUM, AVG, MIN, MAX |
| Scalar aggregate | An aggregate query without GROUP BY; always one row |
| Integer division | Integer divided by integer gives an integer; the fraction is lost |
| Conditional aggregation | Aggregating only rows that meet a condition, several per query |
| FILTER clause | \`agg(x) FILTER (WHERE cond)\`, the standard syntax for conditional aggregation |
| Ordered-set aggregate | An aggregate that needs \`WITHIN GROUP (ORDER BY ...)\`, such as \`percentile_cont\` |
| Window function | An aggregate with \`OVER (...)\` that keeps every row instead of collapsing them |

**Conclusion:** Aggregate functions collapse many rows into one value: COUNT, SUM, AVG, MIN and MAX cover most needs, over the whole result or per group with GROUP BY. The interview-worthy details are at the edges: every aggregate except \`COUNT(*)\` skips NULLs, so AVG divides by the known values only; over zero rows COUNT is 0 and the others are NULL; MIN and MAX work on text and dates; and integer division truncates where AVG does not. Use FILTER or CASE to compute several conditional totals in one pass, know the extras your engine offers (string_agg, percentile_cont, bool_and, any_value in PostgreSQL 16; median in this page build), and reach for a window function when each row should keep its identity.`,
    examples: [
      {
        label: `The core five over the whole table, including MIN and MAX on dates and text`,
        code: `SELECT COUNT(*) AS orders,
       SUM(amount) AS revenue,
       AVG(amount) AS avg_order,
       MIN(amount) AS smallest,
       MAX(amount) AS largest,
       MIN(ordered_on) AS first_day,
       MAX(customer) AS last_name_alphabetically
FROM orders;`,
      },
      {
        label: `NULLs are skipped, and empty input gives 0 for COUNT but NULL for the rest`,
        code: `-- 3 of 8 orders have no discount recorded
SELECT COUNT(discount) AS with_discount,
       SUM(discount) AS total_discount,
       AVG(discount) AS avg_of_known,
       SUM(discount) * 1.0 / COUNT(*) AS avg_over_all_orders,
       AVG(COALESCE(discount, 0)) AS avg_null_as_zero
FROM orders;

-- No order is in region East: still one row comes back
SELECT COUNT(*) AS n,
       SUM(amount) AS total,
       AVG(amount) AS avg,
       MAX(amount) AS biggest,
       COALESCE(SUM(amount), 0) AS total_or_zero
FROM orders
WHERE region = 'East';`,
      },
      {
        label: `Conditional aggregation: several totals per region in one pass`,
        code: `SELECT region,
       COUNT(*) AS orders,
       SUM(amount) FILTER (WHERE status = 'shipped') AS shipped_revenue,
       COUNT(*) FILTER (WHERE status = 'returned') AS returns,
       SUM(CASE WHEN status = 'returned' THEN amount ELSE 0 END) AS returned_amount
FROM orders
GROUP BY region
ORDER BY region;

-- Integer division truncates; AVG does not
SELECT SUM(amount) / COUNT(*) AS integer_division, AVG(amount) AS avg
FROM orders;`,
      },
      {
        label: `PostgreSQL: median, mode, standard deviation, bool_and, string_agg, array_agg`,
        code: `SELECT region,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY amount) AS median_amount,
       mode() WITHIN GROUP (ORDER BY status) AS usual_status,
       ROUND(stddev_samp(amount), 1) AS stddev_amount,
       bool_and(status = 'shipped') AS all_shipped,
       string_agg(customer, ', ' ORDER BY customer) AS customers,
       array_agg(DISTINCT status ORDER BY status) AS statuses
FROM orders
GROUP BY region
ORDER BY region;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `What is the difference between COUNT(*), COUNT(col), and COUNT(DISTINCT col)?`,
    difficulty: "medium",
    seoDescription: `COUNT(*) counts rows, COUNT(col) skips NULLs and COUNT(DISTINCT col) counts unique non-NULL values. See the LEFT JOIN trap and distinct pairs.`,
    description: `**Question presented to candidate:**
"On our visits table, \`COUNT(*)\`, \`COUNT(user_id)\` and \`COUNT(DISTINCT user_id)\` give three different numbers. Explain what each one counts, and tell me which one you would use for 'visits per user' in a report that LEFT JOINs users to visits."

**What a strong answer should cover:**
- \`COUNT(*)\` counts rows, whatever they contain; \`COUNT(col)\` counts rows where \`col\` is not NULL; \`COUNT(DISTINCT col)\` counts distinct non-NULL values
- \`COUNT(1)\` and \`COUNT(*)\` are the same thing; neither is faster in a meaningful way
- The LEFT JOIN trap: \`COUNT(*)\` counts the NULL-padded row, so a user with no visits shows 1; count a column of the right-hand table instead
- Counting distinct combinations: standard SQL has no multi-column \`COUNT(DISTINCT a, b)\`; use a subquery with \`SELECT DISTINCT a, b\`, a row value in PostgreSQL, or MySQL's extension; beware the concatenation trick and NULLs
- Cost: \`COUNT(DISTINCT)\` needs a sort or hash of all values; \`COUNT(*)\` on PostgreSQL still scans the table because of MVCC

**Code / implementation expected:** Yes — the three counts side by side, and the LEFT JOIN per-user count.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT
);
CREATE TABLE visits (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  referrer TEXT,
  device TEXT NOT NULL
);
INSERT INTO users (id, name, plan) VALUES
  (1, 'Asha', 'pro'),
  (2, 'Ben', 'free'),
  (3, 'Chen', NULL),
  (4, 'Dara', 'free');
INSERT INTO visits (id, user_id, referrer, device) VALUES
  (1, 1, 'google', 'mobile'),
  (2, 1, 'google', 'desktop'),
  (3, 2, 'twitter', 'mobile'),
  (4, NULL, 'google', 'mobile'),
  (5, NULL, NULL, 'desktop'),
  (6, 2, NULL, 'mobile'),
  (7, 1, 'newsletter', 'mobile'),
  (8, NULL, 'twitter', 'tablet');
\`\`\``,
    answer: `**Target Audience:** Beginners who have written \`COUNT(*)\` and want to know why a report's numbers disagree; candidates preparing for the classic COUNT question.
**Difficulty:** Medium
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16. MySQL's multi-column form is cited from its manual.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you learn the words an interviewer expects. Every result shown was produced by actually running the query; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

A museum has a visitor book at the door. At closing time three people ask three questions:

- The cleaner: "How many lines were written in the book today?" **8.**
- The membership officer: "How many lines include a membership number?" Some visitors left it blank: **5.**
- The director: "How many **different** members came?" Asha signed in three times, Ben twice: **2.**

Same book, three honest answers. In SQL these are \`COUNT(*)\`, \`COUNT(user_id)\` and \`COUNT(DISTINCT user_id)\`. Mixing them up is one of the most common reasons two dashboards disagree, and it is a standard interview question because it tests whether you really understand NULL.

## 2. The Three Forms

<svg class="iq-diagram" width="100%" viewBox="0 0 760 360" role="img" aria-label="The user_id column of eight visits counted three ways: all rows gives 8, non-NULL values gives 5, distinct non-NULL values gives 2">
  <defs>
    <marker id="sql03q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="20" width="200" height="320" rx="10"/>
  <text class="d-text" x="120" y="52" text-anchor="middle">visits.user_id</text>
  <text class="d-sub" x="120" y="86" text-anchor="middle">1</text>
  <text class="d-sub" x="120" y="114" text-anchor="middle">1</text>
  <text class="d-sub" x="120" y="142" text-anchor="middle">2</text>
  <text class="d-accent" x="120" y="170" text-anchor="middle">NULL</text>
  <text class="d-accent" x="120" y="198" text-anchor="middle">NULL</text>
  <text class="d-sub" x="120" y="226" text-anchor="middle">2</text>
  <text class="d-sub" x="120" y="254" text-anchor="middle">1</text>
  <text class="d-accent" x="120" y="282" text-anchor="middle">NULL</text>
  <rect class="d-box" x="420" y="30" width="320" height="80" rx="10"/>
  <text class="d-text" x="580" y="64" text-anchor="middle">COUNT(*) = 8</text>
  <text class="d-sub" x="580" y="88" text-anchor="middle">every row</text>
  <rect class="d-box" x="420" y="140" width="320" height="80" rx="10"/>
  <text class="d-text" x="580" y="174" text-anchor="middle">COUNT(user_id) = 5</text>
  <text class="d-sub" x="580" y="198" text-anchor="middle">rows where user_id is not NULL</text>
  <rect class="d-box-accent" x="420" y="250" width="320" height="80" rx="10"/>
  <text class="d-text" x="580" y="284" text-anchor="middle">COUNT(DISTINCT user_id) = 2</text>
  <text class="d-sub" x="580" y="308" text-anchor="middle">distinct non-NULL values: 1 and 2</text>
  <path class="d-edge" d="M 222 120 L 416 70" marker-end="url(#sql03q4-arrow)"/>
  <path class="d-edge" d="M 222 180 L 416 180" marker-end="url(#sql03q4-arrow)"/>
  <path class="d-edge-accent" d="M 222 240 L 416 290" marker-end="url(#sql03q4-arrow)"/>
</svg>

The diagram is the \`user_id\` column of the visits table. Three visits were anonymous, so their \`user_id\` is NULL.

📌 **Interview term: COUNT(*)** — counts rows. It does not look at any column, so it cannot be affected by NULLs.

📌 **Interview term: COUNT(expression)** — counts rows where the expression is not NULL. \`COUNT(user_id)\` skips the anonymous visits.

📌 **Interview term: COUNT(DISTINCT expression)** — counts the number of different non-NULL values of the expression. Duplicates count once; NULL does not count at all.

| Form | Counts | NULLs | Duplicates | On \`visits.user_id\` |
| :--- | :--- | :--- | :--- | :--- |
| \`COUNT(*)\` | Rows | Included (row counted) | Included | 8 |
| \`COUNT(1)\` | Rows (1 is never NULL) | Included | Included | 8 |
| \`COUNT(user_id)\` | Non-NULL values | Excluded | Included | 5 |
| \`COUNT(DISTINCT user_id)\` | Different non-NULL values | Excluded | Collapsed | 2 |

The first example also counts the \`referrer\` column, which is NULL on two visits:

~~~text
all_visits | count_one | logged_in_visits | distinct_users | with_referrer | distinct_referrers
8 | 8 | 5 | 2 | 6 | 3
~~~

\`COUNT(referrer)\` is 6, and \`COUNT(DISTINCT referrer)\` is 3: google, twitter and newsletter. Note that \`SELECT DISTINCT referrer\` would return **four** rows, including a NULL row; \`COUNT(DISTINCT ...)\` does not count it. That asymmetry surprises people.

Two useful identities follow:

- \`COUNT(*) - COUNT(col)\` = the number of NULLs in \`col\` (8 - 5 = 3 anonymous visits).
- \`COUNT(col) = COUNT(*)\` for a \`NOT NULL\` column, which is why \`COUNT(id)\` and \`COUNT(*)\` agree on a primary key.

## 3. COUNT(*) vs COUNT(1)

A myth says \`COUNT(1)\` is faster because it "does not read the columns". \`COUNT(*)\` does not read the columns either; the \`*\` here is special syntax meaning "count rows", not "expand every column". On PostgreSQL 16, \`EXPLAIN (COSTS OFF)\` gave the same plan for both:

~~~text
QUERY PLAN
Aggregate
  ->  Seq Scan on visits
~~~

📌 **Interview term: MVCC (multi-version concurrency control)** — PostgreSQL keeps several versions of a row so readers and writers do not block each other. A consequence is that there is no exact stored row count: \`COUNT(*)\` has to check which row versions are visible to your transaction, so it reads the table (or an index, with an index-only scan). On huge tables, use an estimate such as \`pg_class.reltuples\` when an exact number is not required. See [Seq Scan vs Index Scan vs Index-Only Scan](/interview-question/seq-scan-vs-index-scan-vs-index-only-scan-when-does-postgres-choose-each).

## 4. The LEFT JOIN Trap

This is where the difference costs real money. "How many visits did each user make?":

~~~sql
SELECT u.name, COUNT(*) AS wrong_count, COUNT(v.id) AS visits
FROM users AS u
LEFT JOIN visits AS v ON v.user_id = u.id
GROUP BY u.id, u.name;
~~~

📌 **Interview term: NULL-padded row** — when a \`LEFT JOIN\` finds no match on the right, it still outputs the left row, with NULL in every right-hand column.

Chen and Dara have no visits. The join outputs one row for each of them with \`v.id\`, \`v.device\` and the rest set to NULL. \`COUNT(*)\` counts that row, so they appear to have one visit each:

~~~text
name | wrong_count | visits | devices
Asha | 3 | 3 | 2
Ben | 2 | 2 | 1
Chen | 1 | 0 | 0
Dara | 1 | 0 | 0
~~~

\`COUNT(v.id)\` skips the NULL, giving the correct 0. The rule: **after an outer join, count a column from the optional side that is never NULL in real rows**, usually its primary key. \`COUNT(DISTINCT v.device)\` follows the same logic and is 0 for them too. Joins are covered in [What are the different types of SQL joins?](/interview-question/what-are-the-different-types-of-sql-joins); the grouping itself in [How does GROUP BY work with aggregate functions?](/interview-question/how-does-group-by-work-with-aggregate-functions)

A related trap is the opposite one: joining two child tables (say visits and orders) to users at once multiplies rows, and \`COUNT(v.id)\` is inflated by the number of orders. \`COUNT(DISTINCT v.id)\` hides that, but the right fix is to aggregate each child table in its own subquery before joining.

## 5. Counting Distinct Combinations

📌 **Interview term: distinct combination** — a unique tuple of several columns, such as (referrer, device).

Standard SQL's \`COUNT(DISTINCT ...)\` takes one expression. What each engine did with \`COUNT(DISTINCT referrer, device)\`:

| Engine | Result |
| :--- | :--- |
| SQLite 3.45 (run) | \`wrong number of arguments to function COUNT()\` |
| PostgreSQL 16 (run) | \`function count(text, text) does not exist\` |
| MySQL | Supported as an extension: counts rows with different non-NULL combinations ([MySQL 8.4 manual](https://dev.mysql.com/doc/refman/8.4/en/aggregate-functions.html)); not run here |

The third example shows the portable way, and why a popular shortcut is wrong:

~~~text
distinct_pairs
7

concat_pairs
5
~~~

- \`SELECT COUNT(*) FROM (SELECT DISTINCT referrer, device ...)\` counts 7 pairs. \`DISTINCT\` treats NULLs as equal, so \`(NULL, desktop)\` and \`(NULL, mobile)\` are each one pair.
- \`COUNT(DISTINCT referrer || '|' || device)\` gives 5, because \`NULL || '|' || 'desktop'\` is NULL and COUNT skips it. Concatenation also risks collisions when a value contains the separator.

Which answer is "right" depends on whether a pair with a missing part should count; MySQL's multi-argument form, per its manual, skips such pairs like the concatenation does. In PostgreSQL you can count a **row value**, as the fourth example shows:

~~~text
row_pairs | row_count | no_referrer
7 | 8 | 2
~~~

\`COUNT(DISTINCT (referrer, device))\` gave 7, the same as the subquery. And note \`COUNT((referrer, device))\` is 8: a row value whose fields are partly NULL is not itself NULL, so every row is counted.

## 6. Counting With a Condition

Because COUNT skips NULLs, a \`CASE\` without \`ELSE\` is a portable conditional count. The last result set of the third example:

~~~text
with_plan | plans | missing_plan | free_users
3 | 2 | 1 | 2
~~~

\`COUNT(CASE WHEN plan = 'free' THEN 1 END)\` produces 1 for free users and NULL for everyone else, and COUNT counts the 1s. Two traps: \`COUNT(CASE WHEN ... THEN 1 ELSE 0 END)\` counts **every** row (0 is not NULL), and \`SUM(CASE ... THEN 1 ELSE 0 END)\` is the equivalent written with SUM. PostgreSQL and SQLite 3.30+ also accept \`COUNT(*) FILTER (WHERE plan = 'free')\`. More conditional aggregates on [What are the common aggregate functions?](/interview-question/what-are-the-common-aggregate-functions)

## 7. Cost

| Form | Typical work |
| :--- | :--- |
| \`COUNT(*)\` | Read every row (or an index); no per-row comparison |
| \`COUNT(col)\` | Same scan, plus a NULL check per row |
| \`COUNT(DISTINCT col)\` | Same scan, plus sorting or hashing every value to remove duplicates; memory grows with the number of distinct values |

📌 **Interview term: approximate distinct count** — an estimate (for example with the HyperLogLog algorithm) used when an exact \`COUNT(DISTINCT)\` over billions of rows is too slow. It is offered by extensions and analytics databases rather than core PostgreSQL or SQLite; mention it as a trade-off, not as a built-in.

On data this small every form is instant; the table matters on millions of rows. Check what your engine actually does with \`EXPLAIN\`; see [How do you read an EXPLAIN query plan?](/interview-question/how-do-you-read-an-explain-query-plan)

## 8. Verified: Running the Code

The three SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above), and their queries were also run on PostgreSQL 16 with the same results. The PostgreSQL example, the plans and the error messages above ran on PostgreSQL 16 in a throwaway database with the same schema.

Example 1, the three counts:

~~~text
all_visits | count_one | logged_in_visits | distinct_users | with_referrer | distinct_referrers
8 | 8 | 5 | 2 | 6 | 3
~~~

Example 2, the LEFT JOIN trap:

~~~text
name | wrong_count | visits | devices
Asha | 3 | 3 | 2
Ben | 2 | 2 | 1
Chen | 1 | 0 | 0
Dara | 1 | 0 | 0
~~~

Example 3, distinct pairs and conditional counts:

~~~text
distinct_pairs
7

concat_pairs
5

with_plan | plans | missing_plan | free_users
3 | 2 | 1 | 2
~~~

Example 4, PostgreSQL row values:

~~~text
row_pairs | row_count | no_referrer
7 | 8 | 2
~~~

## Common Pitfalls

- **\`COUNT(*)\` after a LEFT JOIN.** Rows with no match count as 1. Count the right-hand table's key instead.
- **Expecting \`COUNT(DISTINCT col)\` to include NULL.** It never does, even though \`SELECT DISTINCT col\` returns a NULL row.
- **Counting pairs by concatenation.** NULL parts make the whole string NULL and separators can collide; use a \`SELECT DISTINCT a, b\` subquery.
- **\`COUNT(CASE ... ELSE 0 END)\`.** 0 is a value, so every row is counted; leave out the ELSE or use SUM.
- **Using \`COUNT(DISTINCT)\` to hide join fan-out.** It makes the count look right but scans and dedupes far more rows than needed; aggregate before joining.
- **Believing \`COUNT(1)\` is an optimisation.** Same plan, same result; write \`COUNT(*)\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. COUNT(*):</strong> <span style="color:#f0e2c8;">Counts rows. It never looks at a column, so NULLs make no difference: 8 visits gives 8. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(1)</code> is the same thing, the constant is never NULL.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. COUNT(col):</strong> <span style="color:#f0e2c8;">Counts rows where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">col</code> is not NULL. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(user_id)</code> is 5 because 3 visits were anonymous. So <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(*) - COUNT(col)</code> is the number of NULLs.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. COUNT(DISTINCT col):</strong> <span style="color:#f0e2c8;">Counts distinct non-NULL values: 2 different users made those 5 visits. NULL is never counted as a value, not even once.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The LEFT JOIN trap:</strong> <span style="color:#f0e2c8;">After <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">users LEFT JOIN visits</code>, a user with no visits still has one row, padded with NULLs. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(*)</code> counts it as 1; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(v.id)</code> correctly gives 0. Count a non-NULL column from the optional side.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Combinations and cost:</strong> <span style="color:#f0e2c8;">There is no standard <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(DISTINCT a, b)</code>: use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT COUNT(*) FROM (SELECT DISTINCT a, b ...)</code>, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(DISTINCT (a, b))</code> in PostgreSQL. DISTINCT needs a sort or hash of every value, so it is the expensive one.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">COUNT(1)</code> faster than <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">COUNT(*)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Both count rows; PostgreSQL 16 produced the same plan, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Aggregate</code> over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Seq Scan on visits</code>, for each. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(*)</code>, which says what you mean.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">COUNT(*)</code> slow on a big PostgreSQL table?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because of MVCC, each row version has to be checked for visibility to your transaction, so there is no stored row count to read. For an estimate, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reltuples</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pg_class</code> is instant; an index-only scan helps when the visibility map is up to date.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">COUNT(DISTINCT col)</code> count NULL as one value?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT DISTINCT referrer</code> returns NULL as a row, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(DISTINCT referrer)</code> ignored it and returned 3 (google, twitter, newsletter).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you count distinct pairs of columns?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Portable: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT COUNT(*) FROM (SELECT DISTINCT a, b FROM t)</code>, which gave 7 here. Concatenating <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a || '|' || b</code> gave 5 because pairs with a NULL part became NULL. MySQL accepts <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(DISTINCT a, b)</code> as an extension; SQLite and PostgreSQL rejected it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you count only rows that match a condition?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(*) FILTER (WHERE plan = 'free')</code> in PostgreSQL and SQLite 3.30+, or the portable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(CASE WHEN plan = 'free' THEN 1 END)</code>: the CASE gives NULL for other rows and COUNT skips NULLs.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| COUNT(*) | Number of rows, regardless of NULLs |
| COUNT(expression) | Number of rows where the expression is not NULL |
| COUNT(DISTINCT expression) | Number of different non-NULL values |
| MVCC | PostgreSQL keeps row versions per transaction, so COUNT(*) must check visibility rather than read a stored total |
| NULL-padded row | The left row a LEFT JOIN outputs when nothing matches, with NULLs on the right side |
| Distinct combination | A unique tuple of several columns |
| Approximate distinct count | An estimate of COUNT(DISTINCT) from algorithms such as HyperLogLog, traded for speed |

**Conclusion:** \`COUNT(*)\` counts rows, \`COUNT(col)\` counts rows where the column is not NULL, and \`COUNT(DISTINCT col)\` counts different non-NULL values, which is why one table can honestly give 8, 5 and 2. \`COUNT(1)\` is just \`COUNT(*)\`. The difference matters most after a LEFT JOIN, where \`COUNT(*)\` turns "no visits" into 1 and \`COUNT(v.id)\` gives the correct 0. For combinations of columns use a \`SELECT DISTINCT a, b\` subquery or PostgreSQL's row value rather than string concatenation, remember that NULL never counts as a distinct value, and treat \`COUNT(DISTINCT)\` as the expensive form on large tables.`,
    examples: [
      {
        label: `The three counts (and COUNT(1)) side by side on two columns`,
        code: `SELECT COUNT(*) AS all_visits,
       COUNT(1) AS count_one,
       COUNT(user_id) AS logged_in_visits,
       COUNT(DISTINCT user_id) AS distinct_users,
       COUNT(referrer) AS with_referrer,
       COUNT(DISTINCT referrer) AS distinct_referrers
FROM visits;`,
      },
      {
        label: `The LEFT JOIN trap: COUNT(*) gives users with no visits a count of 1`,
        code: `SELECT u.name,
       COUNT(*) AS wrong_count,
       COUNT(v.id) AS visits,
       COUNT(DISTINCT v.device) AS devices
FROM users AS u
LEFT JOIN visits AS v ON v.user_id = u.id
GROUP BY u.id, u.name
ORDER BY u.id;`,
      },
      {
        label: `Counting distinct combinations, and counting with a condition`,
        code: `-- Portable: distinct (referrer, device) pairs, NULL pairs included
SELECT COUNT(*) AS distinct_pairs
FROM (SELECT DISTINCT referrer, device FROM visits) AS t;

-- The concatenation shortcut silently drops pairs with a NULL part
SELECT COUNT(DISTINCT referrer || '|' || device) AS concat_pairs
FROM visits;

-- Counting with conditions, and counting what is missing
SELECT COUNT(plan) AS with_plan,
       COUNT(DISTINCT plan) AS plans,
       COUNT(*) - COUNT(plan) AS missing_plan,
       COUNT(CASE WHEN plan = 'free' THEN 1 END) AS free_users
FROM users;`,
      },
      {
        label: `PostgreSQL: COUNT(DISTINCT (a, b)) on a row value`,
        code: `SELECT COUNT(DISTINCT (referrer, device)) AS row_pairs,
       COUNT((referrer, device)) AS row_count,
       COUNT(*) FILTER (WHERE referrer IS NULL) AS no_referrer
FROM visits;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `How does GROUP BY work with aggregate functions?`,
    difficulty: "medium",
    seoDescription: `GROUP BY splits rows into groups and returns one row per group with aggregates. Learn the single-value rule, NULL groups and engine differences.`,
    description: `**Question presented to candidate:**
"Given a sales table and a reps table, show revenue per product and per region per month. Then explain what GROUP BY actually does to the rows, and why some databases reject \`SELECT product, rep_id, MAX(amount) ... GROUP BY product\` while others run it."

**What a strong answer should cover:**
- GROUP BY splits the filtered rows into groups with equal grouping keys and returns one row per group; aggregates are computed per group
- The single-value rule: every SELECT, HAVING and ORDER BY expression must be a grouping key, an aggregate, or functionally dependent on the keys (PostgreSQL allows other columns of a table grouped by its primary key)
- Engine differences: PostgreSQL and MySQL with \`ONLY_FULL_GROUP_BY\` reject bare columns; SQLite accepts them and, with a single MIN or MAX, takes them from that row; \`ANY_VALUE\` is the explicit form
- NULL keys form one group; grouping by an expression; no GROUP BY means one group (one row even on empty input), GROUP BY on empty input returns no rows
- Where it sits in the logical order (after WHERE, before HAVING), how engines execute it (hash or sort), and when to use a window function instead

**Code / implementation expected:** Yes — grouping by one column, by several columns and an expression, and the bare-column case.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE reps (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT
);
CREATE TABLE sales (
  id INTEGER PRIMARY KEY,
  rep_id INTEGER NOT NULL REFERENCES reps(id),
  product TEXT NOT NULL,
  amount INTEGER NOT NULL,
  sold_on DATE NOT NULL
);
INSERT INTO reps (id, name, region) VALUES
  (1, 'Asha', 'North'),
  (2, 'Ben', 'North'),
  (3, 'Chen', 'South'),
  (4, 'Dara', NULL);
INSERT INTO sales (id, rep_id, product, amount, sold_on) VALUES
  (1, 1, 'Laptop', 1200, '2024-01-10'),
  (2, 1, 'Mouse', 25, '2024-01-12'),
  (3, 2, 'Laptop', 1100, '2024-01-20'),
  (4, 3, 'Monitor', 300, '2024-01-25'),
  (5, 1, 'Monitor', 320, '2024-02-03'),
  (6, 3, 'Laptop', 1150, '2024-02-14'),
  (7, 3, 'Mouse', 30, '2024-02-15'),
  (8, 4, 'Mouse', 20, '2024-02-20'),
  (9, 2, 'Monitor', 310, '2024-02-28');
\`\`\``,
    answer: `**Target Audience:** Beginners writing their first "total per category" query, and candidates who need the single-value rule and the engine differences.
**Difficulty:** Medium
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16. MySQL behaviour is cited from its manual.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you learn the words an interviewer expects. Every result, plan and error shown was produced by actually running the query; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

After a garage sale, you tip the cash box onto the table: nine receipts. Someone asks "how much did we make on each kind of item?". You make three piles, laptops, monitors and mice, and then write one line per pile: how many receipts, and their total.

That is GROUP BY. Making the piles is grouping; writing one summary line per pile is aggregation. And it explains the rule that confuses everybody: once the receipts are in piles, you can say "laptop pile: 3 receipts, 3450 total", but you cannot write one line that says which seller sold "the" laptop: there were three sellers in that pile. SQL refuses to pick one for you, at least in PostgreSQL.

## 2. What GROUP BY Does

📌 **Interview term: GROUP BY** — a clause that partitions the rows remaining after \`WHERE\` into groups whose grouping expressions are equal, and produces one output row per group.

📌 **Interview term: grouping key** — the column or expression listed in GROUP BY. Rows with the same key value go to the same group.

<svg class="iq-diagram" width="100%" viewBox="0 0 800 360" role="img" aria-label="Nine sales rows are sorted into three product groups and each group becomes one output row with a count and a sum">
  <defs>
    <marker id="sql03q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="20" width="190" height="320" rx="10"/>
  <text class="d-text" x="115" y="52" text-anchor="middle">9 sales rows</text>
  <text class="d-sub" x="115" y="88" text-anchor="middle">Laptop 1200</text>
  <text class="d-sub" x="115" y="116" text-anchor="middle">Mouse 25</text>
  <text class="d-sub" x="115" y="144" text-anchor="middle">Laptop 1100</text>
  <text class="d-sub" x="115" y="172" text-anchor="middle">Monitor 300</text>
  <text class="d-sub" x="115" y="200" text-anchor="middle">Monitor 320</text>
  <text class="d-sub" x="115" y="228" text-anchor="middle">Laptop 1150</text>
  <text class="d-sub" x="115" y="256" text-anchor="middle">Mouse 30</text>
  <text class="d-sub" x="115" y="284" text-anchor="middle">Mouse 20</text>
  <text class="d-sub" x="115" y="312" text-anchor="middle">Monitor 310</text>
  <rect class="d-box-muted" x="290" y="30" width="200" height="80" rx="10"/>
  <text class="d-text" x="390" y="64" text-anchor="middle">Laptop group</text>
  <text class="d-sub" x="390" y="88" text-anchor="middle">1200, 1100, 1150</text>
  <rect class="d-box-muted" x="290" y="140" width="200" height="80" rx="10"/>
  <text class="d-text" x="390" y="174" text-anchor="middle">Monitor group</text>
  <text class="d-sub" x="390" y="198" text-anchor="middle">300, 320, 310</text>
  <rect class="d-box-muted" x="290" y="250" width="200" height="80" rx="10"/>
  <text class="d-text" x="390" y="284" text-anchor="middle">Mouse group</text>
  <text class="d-sub" x="390" y="308" text-anchor="middle">25, 30, 20</text>
  <rect class="d-box-accent" x="570" y="30" width="210" height="80" rx="10"/>
  <text class="d-text" x="675" y="64" text-anchor="middle">Laptop</text>
  <text class="d-sub" x="675" y="88" text-anchor="middle">3 sales, 3450</text>
  <rect class="d-box-accent" x="570" y="140" width="210" height="80" rx="10"/>
  <text class="d-text" x="675" y="174" text-anchor="middle">Monitor</text>
  <text class="d-sub" x="675" y="198" text-anchor="middle">3 sales, 930</text>
  <rect class="d-box-accent" x="570" y="250" width="210" height="80" rx="10"/>
  <text class="d-text" x="675" y="284" text-anchor="middle">Mouse</text>
  <text class="d-sub" x="675" y="308" text-anchor="middle">3 sales, 75</text>
  <path class="d-edge" d="M 212 120 L 286 70" marker-end="url(#sql03q5-arrow)"/>
  <path class="d-edge" d="M 212 180 L 286 180" marker-end="url(#sql03q5-arrow)"/>
  <path class="d-edge" d="M 212 240 L 286 290" marker-end="url(#sql03q5-arrow)"/>
  <path class="d-edge-accent" d="M 492 70 L 566 70" marker-end="url(#sql03q5-arrow)"/>
  <path class="d-edge-accent" d="M 492 180 L 566 180" marker-end="url(#sql03q5-arrow)"/>
  <path class="d-edge-accent" d="M 492 290 L 566 290" marker-end="url(#sql03q5-arrow)"/>
</svg>

The diagram is the first example: nine rows, three keys, three output rows.

~~~text
product | sales | revenue | lowest | highest
Laptop | 3 | 3450 | 1100 | 1200
Monitor | 3 | 930 | 300 | 320
Mouse | 3 | 75 | 20 | 30
~~~

The aggregates (\`COUNT\`, \`SUM\`, \`MIN\`, \`MAX\`) are computed once per group, on just that group's rows. The functions themselves are covered on [What are the common aggregate functions?](/interview-question/what-are-the-common-aggregate-functions)

### Where it sits

In the logical order of a query, GROUP BY comes after \`FROM\`/\`JOIN\` and \`WHERE\`, and before \`HAVING\`, \`SELECT\` and \`ORDER BY\` (see [What is the logical order of execution of a SQL query?](/interview-question/what-is-the-logical-order-of-execution-of-a-sql-query)). So:

- \`WHERE\` filters **rows before** grouping; it cannot use aggregates.
- \`HAVING\` filters **groups after** grouping: \`HAVING SUM(amount) > 500\` kept Laptop and Monitor and dropped Mouse (75). See [What is the difference between WHERE and HAVING?](/interview-question/what-is-the-difference-between-where-and-having)

## 3. Several Keys and Expressions

You can group by several columns (one group per distinct combination) and by expressions. The second example groups sales by region and month:

~~~text
region | month | sales | revenue
North | 2024-01 | 3 | 2325
North | 2024-02 | 2 | 630
South | 2024-01 | 1 | 300
South | 2024-02 | 2 | 1180
NULL | 2024-02 | 1 | 20
~~~

Three things to notice:

1. The month is an **expression**: the first 7 characters of the date. \`CAST(... AS TEXT)\` keeps it portable, because PostgreSQL stores \`sold_on\` as a real \`date\` and \`SUBSTR(date, ...)\` fails there (\`function substr(date, integer, integer) does not exist\`). In PostgreSQL you would normally write \`date_trunc('month', sold_on)\` or \`to_char(sold_on, 'YYYY-MM')\`.
2. Dara has no region. **All NULL keys form one group**: GROUP BY treats NULLs as equal for grouping, even though \`NULL = NULL\` is not TRUE in a comparison. See [How does SQL handle NULL values?](/interview-question/how-does-sql-handle-null-values)
3. \`ORDER BY ... NULLS LAST\` is written explicitly, because SQLite sorts NULL first by default and PostgreSQL sorts it last.

The order of the GROUP BY columns does not change which groups exist; it only matters for \`ORDER BY\` and, in some engines, for which index can help.

### No GROUP BY vs GROUP BY on empty input

📌 **Interview term: scalar aggregate** — an aggregate query without GROUP BY. The whole result is a single group, so it returns exactly one row.

The second result set asks for sales over 5000, of which there are none:

~~~text
n | revenue
0 | NULL
~~~

One row, because there is one (empty) group. With \`GROUP BY product\` added, the same filter returned **no rows**: there are no products to make groups from. PostgreSQL printed only the header line \`product | count\`, and SQLite returned no result set. Dashboards that expect "one row with 0" break on exactly this difference.

## 4. The Single-Value Rule

📌 **Interview term: single-value rule** — every expression in \`SELECT\`, \`HAVING\` and \`ORDER BY\` of a grouped query must have one value per group: it must be a grouping key, an aggregate, a constant, or functionally dependent on the grouping keys.

📌 **Interview term: functional dependency** — column B depends on column A if each value of A determines exactly one value of B. A table's primary key determines every other column of that table.

Take this query:

~~~sql
SELECT product, rep_id, MAX(amount) AS top_sale
FROM sales
GROUP BY product;
~~~

The Laptop group has three reps (1, 2 and 3). Which \`rep_id\` should the single Laptop row show? PostgreSQL 16 refuses:

~~~text
ERROR:  column "sales.rep_id" must appear in the GROUP BY clause or be used in an aggregate function
~~~

### How engines differ

📌 **Interview term: bare column** — a column in a grouped query's SELECT list that is neither grouped nor aggregated.

| Engine | Bare column behaviour |
| :--- | :--- |
| PostgreSQL 16 (run) | Error, unless the column is functionally dependent on the keys via a primary key (since [9.1](https://www.postgresql.org/about/news/postgresql-91alpha1-now-available-1233)) |
| MySQL 5.7.5+ | \`ONLY_FULL_GROUP_BY\` is on by default and rejects bare columns that are not functionally dependent ([MySQL 5.7 manual](https://dev.mysql.com/doc/refman/5.7/en/group-by-handling.html)); not run here |
| SQLite 3.45 (run) | Accepted. With exactly one \`MIN()\` or \`MAX()\`, bare columns come from a row holding that min or max; otherwise from an arbitrary row of the group |

The third example shows SQLite's behaviour and the portable alternative:

~~~text
product | rep_id | top_sale
Laptop | 1 | 1200
Monitor | 1 | 320
Mouse | 3 | 30

product | rep_id | top_sale
Laptop | 1 | 1200
Monitor | 1 | 320
Mouse | 3 | 30
~~~

The 1200 laptop sale really was rep 1's, so SQLite's answer is correct here, and SQLite documents this MIN/MAX behaviour (discussed on the [SQLite forum](https://sqlite.org/forum/forumpost/6e6d9fcfc77b2084?raw)). But with no MIN or MAX the value is arbitrary: \`SELECT product, rep_id, sold_on FROM sales GROUP BY product\` returned rep 3 and \`2024-01-25\` for Monitor, one row among three. With ties for the max, SQLite picks one of the tied rows. Do not rely on it if the query may run elsewhere; the join in the second result set works in every engine and returns all tied rows. For "top N per group" see [Top-N per group with RANK() OVER (PARTITION BY)](/interview-question/top-n-per-group-with-rank-over-partition-by-how-do-you-get-top-2-per-department-).

### Functional dependency in PostgreSQL

The fourth example groups by \`r.id\` only, yet selects \`r.name\` and \`r.region\`:

~~~text
id | name | region | sales | revenue | has_product
1 | Asha | North | 3 | 1545 | t
2 | Ben | North | 2 | 1410 | t
3 | Chen | South | 3 | 1480 | t
4 | Dara | NULL | 1 | 20 | t
~~~

PostgreSQL accepts it because \`r.id\` is the primary key of \`reps\`, so each group has exactly one name and region. Grouping by \`s.rep_id\` instead, the foreign key on the other table, failed with \`column "r.name" must appear in the GROUP BY clause...\`: PostgreSQL only uses primary keys of the grouped table for this.

📌 **Interview term: ANY_VALUE** — an aggregate that returns some value from the group and makes "I do not care which" explicit. PostgreSQL added it in version 16 ([announcement](https://www.postgresql.org/about/news/postgresql-16-beta-1-released-2643)) and MySQL documents it as the way to keep \`ONLY_FULL_GROUP_BY\` enabled; SQLite 3.45 in this page has no \`ANY_VALUE\` (\`no such function: ANY_VALUE\`). The example only checks \`ANY_VALUE(s.product) IS NOT NULL\`, because which product it returns is not defined.

## 5. How the Engine Executes It

📌 **Interview term: hash aggregate vs sort (group) aggregate** — the two ways to build groups. A hash aggregate puts each row into a hash table keyed by the group key; a sort aggregate sorts the rows by the key and aggregates each run of equal keys.

PostgreSQL 16 chose a hash on this data; turning hashing off showed the sort-based alternative:

~~~text
QUERY PLAN
HashAggregate
  Group Key: product
  ->  Seq Scan on sales
~~~

~~~text
QUERY PLAN
GroupAggregate
  Group Key: product
  ->  Sort
        Sort Key: product
        ->  Seq Scan on sales
~~~

The second plan came after \`SET enable_hashagg = off\`. An index on the grouping key can provide the rows already sorted, making the sort step unnecessary; on other data the planner may choose differently. SQLite's \`EXPLAIN QUERY PLAN\` for the same query showed \`SCAN sales\` and \`USE TEMP B-TREE FOR GROUP BY\`, its sort-based approach. Reading plans: [How do you read an EXPLAIN query plan?](/interview-question/how-do-you-read-an-explain-query-plan)

## 6. GROUP BY vs Its Neighbours

| Need | Use |
| :--- | :--- |
| One row per group with totals | \`GROUP BY\` + aggregates |
| Just the unique values, no totals | \`SELECT DISTINCT\` (see [What does DISTINCT do and what is its cost?](/interview-question/what-does-distinct-do-and-what-is-its-cost)) |
| Every row, plus its group total | Window function \`SUM(...) OVER (PARTITION BY ...)\` (see [What are window functions?](/interview-question/what-are-window-functions)) |
| Subtotals and a grand total in one query | \`GROUP BY ROLLUP\` / \`CUBE\` (see [What do GROUP BY ROLLUP and CUBE do?](/interview-question/what-do-group-by-rollup-and-cube-do)) |
| Several conditional totals per group | \`FILTER (WHERE ...)\` or \`SUM(CASE ...)\` inside the aggregates |

## 7. Verified: Running the Code

The three SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above). The PostgreSQL example, the error messages and the plans ran on PostgreSQL 16 in a throwaway database with the same schema; the first two SQLite examples gave the same output there.

Example 1, one grouping key:

~~~text
product | sales | revenue | lowest | highest
Laptop | 3 | 3450 | 1100 | 1200
Monitor | 3 | 930 | 300 | 320
Mouse | 3 | 75 | 20 | 30
~~~

Example 2, several keys, an expression, and the empty-input case:

~~~text
region | month | sales | revenue
North | 2024-01 | 3 | 2325
North | 2024-02 | 2 | 630
South | 2024-01 | 1 | 300
South | 2024-02 | 2 | 1180
NULL | 2024-02 | 1 | 20

n | revenue
0 | NULL
~~~

Example 3, a bare column in SQLite and the portable version:

~~~text
product | rep_id | top_sale
Laptop | 1 | 1200
Monitor | 1 | 320
Mouse | 3 | 30

product | rep_id | top_sale
Laptop | 1 | 1200
Monitor | 1 | 320
Mouse | 3 | 30
~~~

Example 4, PostgreSQL functional dependency:

~~~text
id | name | region | sales | revenue | has_product
1 | Asha | North | 3 | 1545 | t
2 | Ben | North | 2 | 1410 | t
3 | Chen | South | 3 | 1480 | t
4 | Dara | NULL | 1 | 20 | t
~~~

## Common Pitfalls

- **Selecting a column that is not grouped or aggregated.** An error in PostgreSQL and MySQL's default mode, an arbitrary value in SQLite. Group by it, aggregate it, or join back.
- **Relying on SQLite's bare-column behaviour.** It is only defined next to a single MIN or MAX, and it does not port.
- **Filtering groups in WHERE.** \`WHERE SUM(amount) > 500\` is an error; use \`HAVING\`.
- **Expecting one row with zeros from an empty grouped query.** GROUP BY on no rows returns nothing; LEFT JOIN from a list of categories if every category must appear.
- **Grouping by a formatted value that differs per engine.** \`SUBSTR\` on a date works in SQLite and fails in PostgreSQL; use the engine date function or cast explicitly.
- **Forgetting NULL keys.** All NULLs form one group, which often shows up as an unlabeled row in a report; label it with \`COALESCE(region, 'unassigned')\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it does:</strong> <span style="color:#f0e2c8;">GROUP BY takes the rows that survived <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code>, puts rows with equal grouping keys into the same group, and outputs one row per group. Aggregates like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SUM</code> are then computed per group.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The single-value rule:</strong> <span style="color:#f0e2c8;">Each output row stands for many input rows, so every selected expression must have one value per group: a grouping key, an aggregate, or something functionally dependent on the key. That is why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT product, rep_id, MAX(amount) ... GROUP BY product</code> is an error in PostgreSQL.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Engine differences:</strong> <span style="color:#f0e2c8;">PostgreSQL lets you select other columns of a table you grouped by its primary key. MySQL enforces the rule with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ONLY_FULL_GROUP_BY</code>. SQLite accepts bare columns; with one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MIN</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MAX</code> it takes them from that row, otherwise from an arbitrary row. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ANY_VALUE</code> says arbitrary on purpose.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Edge cases:</strong> <span style="color:#f0e2c8;">All NULL keys form one group. You can group by expressions such as a month. No GROUP BY means one group, so one row even on empty input; GROUP BY on empty input returns no rows at all.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Placement and execution:</strong> <span style="color:#f0e2c8;">Logically it runs after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code> and before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HAVING</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT</code>, so filter rows in WHERE and groups in HAVING. Physically the engine hashes or sorts the rows; PostgreSQL showed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashAggregate</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GroupAggregate</code> with a sort when hashing was disabled.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does PostgreSQL say a column must appear in the GROUP BY clause?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because that column can have several values inside one group and PostgreSQL will not guess which. The message was <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">column "sales.rep_id" must appear in the GROUP BY clause or be used in an aggregate function</code>. Add it to GROUP BY, wrap it in an aggregate, or restructure with a join or window function.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the row with the max per group, not just the max value?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Join back to the grouped maxima, as the third example does, or rank with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROW_NUMBER() OVER (PARTITION BY product ORDER BY amount DESC)</code> and keep rank 1. Ties return several rows with the join and one with ROW_NUMBER.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">GROUP BY</code> an alias or a column number?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">PostgreSQL and SQLite both accepted <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY p</code> for an alias and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY 2</code> by position, and PostgreSQL accepts <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY 1</code>. Both are non-standard conveniences; repeating the expression is the portable form.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between GROUP BY and DISTINCT?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT DISTINCT product</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT product ... GROUP BY product</code> return the same rows. Use GROUP BY when you need aggregates per group, DISTINCT when you only need the unique rows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use a window function instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When each original row must stay in the output next to its group value, for example every sale beside its product total. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SUM(amount) OVER (PARTITION BY product)</code> does that; GROUP BY collapses the rows.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| GROUP BY | Splits rows into groups with equal keys and outputs one row per group |
| Grouping key | A column or expression listed in GROUP BY |
| Scalar aggregate | An aggregate query with no GROUP BY; one group, one row |
| Single-value rule | Every selected expression must have one value per group |
| Functional dependency | One column determines another, as a primary key determines its row |
| Bare column | A selected column that is neither grouped nor aggregated |
| ANY_VALUE | Aggregate returning an arbitrary value of the group, explicitly |
| Hash aggregate vs sort aggregate | Building groups with a hash table, or by sorting and scanning runs of equal keys |

**Conclusion:** GROUP BY takes the rows that passed WHERE, puts rows with equal keys into groups, and returns one row per group with the aggregates computed per group. Everything else follows from that: every selected expression must have one value per group, which PostgreSQL enforces (relaxed for columns determined by a grouped primary key), MySQL enforces with ONLY_FULL_GROUP_BY, and SQLite does not, taking bare columns from the MIN or MAX row or from an arbitrary one. NULL keys share one group, expressions can be keys, a query without GROUP BY always returns one row while a grouped query on empty input returns none, and the engine builds the groups by hashing or sorting. Use HAVING to filter groups, and a window function when the original rows must stay.`,
    examples: [
      {
        label: `One grouping key: one output row per product`,
        code: `SELECT product,
       COUNT(*) AS sales,
       SUM(amount) AS revenue,
       MIN(amount) AS lowest,
       MAX(amount) AS highest
FROM sales
GROUP BY product
ORDER BY product;`,
      },
      {
        label: `Several keys and an expression: revenue per region per month, with a NULL region group`,
        code: `SELECT r.region,
       SUBSTR(CAST(s.sold_on AS TEXT), 1, 7) AS month,
       COUNT(*) AS sales,
       SUM(s.amount) AS revenue
FROM sales AS s
JOIN reps AS r ON r.id = s.rep_id
GROUP BY r.region, SUBSTR(CAST(s.sold_on AS TEXT), 1, 7)
ORDER BY r.region NULLS LAST, month;

-- No GROUP BY: the whole table is one group, so one row even when nothing matches
SELECT COUNT(*) AS n, SUM(amount) AS revenue
FROM sales
WHERE amount > 5000;`,
      },
      {
        label: `SQLite only: a bare column next to MAX() comes from the max row (PostgreSQL rejects this)`,
        code: `-- Non-standard: rep_id is neither grouped nor aggregated.
-- SQLite takes it from the row that holds MAX(amount).
SELECT product, rep_id, MAX(amount) AS top_sale
FROM sales
GROUP BY product
ORDER BY product;

-- The portable way to get the top sale per product and who made it
SELECT s.product, s.rep_id, s.amount AS top_sale
FROM sales AS s
JOIN (SELECT product, MAX(amount) AS top_amount
      FROM sales
      GROUP BY product) AS m
  ON m.product = s.product AND m.top_amount = s.amount
ORDER BY s.product;`,
      },
      {
        label: `PostgreSQL: GROUP BY the primary key lets you select the other columns of that table`,
        code: `SELECT r.id, r.name, r.region,
       COUNT(*) AS sales,
       SUM(s.amount) AS revenue,
       ANY_VALUE(s.product) IS NOT NULL AS has_product
FROM reps AS r
JOIN sales AS s ON s.rep_id = r.id
GROUP BY r.id
ORDER BY r.id;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
];

export default augments;
