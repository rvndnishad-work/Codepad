/**
 * SQL ULTRA — batch 05: Subqueries and existence (plain and correlated
 * subqueries, EXISTS vs IN, NOT IN and NULLs, EXISTS vs JOIN, UPDATE from
 * another table). Every example was run by scripts/verify-sql-examples.ts
 * (sql.js 1.10.2 like the page, PostgreSQL 16 for postgres examples); quoted
 * output is that run's output.
 */
import type { SqlUltraAugment } from "./sql-augments.types";

const augments: SqlUltraAugment[] = [
  {
    title: `What is a subquery and what is a correlated subquery?`,
    difficulty: "medium",
    seoDescription: `A subquery is a SELECT inside another statement; a correlated one uses the outer row and runs per row. Shapes, plans and engine traps, all run.`,
    description: `**Question presented to candidate:**
"You will see queries with a SELECT nested inside another SELECT. What is a subquery, what makes a subquery *correlated*, and how does that change how the database runs it? Show me one of each."

**What a strong answer should cover:**
- A subquery is a complete SELECT nested inside another statement, in WHERE, in the SELECT list, in FROM (a derived table) or in HAVING
- The shapes: scalar (one value), row, column list for \`IN\`, and table (a derived table in FROM)
- A non-correlated subquery does not reference the outer query, so it can be evaluated once (PostgreSQL shows it as an \`InitPlan\`)
- A correlated subquery references a column of the outer row, so logically it runs once per outer row (PostgreSQL shows a \`SubPlan\` with \`loops\` equal to the outer row count)
- Trade-offs: correlated subqueries are clear but can be slow without an index on the correlation column; rewrites with a JOIN plus GROUP BY, a window function, or LATERAL
- Engine detail: a scalar subquery that returns two rows is an error in PostgreSQL but silently uses the first row in SQLite

**Code / implementation expected:** Yes — one plain subquery (above the company average) and one correlated subquery (above the own-department average).

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE departments (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  dept_id INTEGER REFERENCES departments(id),
  salary INTEGER NOT NULL
);
INSERT INTO departments (id, name) VALUES
  (1, 'Engineering'),
  (2, 'Sales'),
  (3, 'Support'),
  (4, 'Legal');
INSERT INTO employees (id, name, dept_id, salary) VALUES
  (1, 'Asha', 1, 120000),
  (2, 'Ben', 1, 95000),
  (3, 'Chen', 1, 105000),
  (4, 'Dara', 2, 70000),
  (5, 'Eli', 2, 82000),
  (6, 'Femi', 3, 52000),
  (7, 'Gita', 3, 61000),
  (8, 'Hugo', 2, 64000);
\`\`\``,
    answer: `**Target Audience:** Beginners who have written a SELECT with a WHERE clause and now meet one SELECT nested inside another; also anyone preparing for the follow-up questions on performance.
**Difficulty:** Medium
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15, both run for this page. Notes on MySQL and SQL Server are marked as such.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result, plan and error message below was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

Imagine you are a manager with a spreadsheet of salaries, and your boss asks two questions.

The first: *"Who earns more than the company average?"* You work out the average once (81,125), write it on a sticky note, then go down the list ticking everyone above it. One calculation, then one pass.

The second: *"Who earns more than the average of their own department?"* Now one sticky note is not enough. For Asha in Engineering you need the Engineering average; for Dara in Sales you need the Sales average. For every person you look at, you go back and compute an average for *that person's* department.

Those two ways of working are exactly the two kinds of subquery:

- The first is a **plain subquery**: an inner question you answer once, then use.
- The second is a **correlated subquery**: an inner question whose answer depends on the row you are looking at, so it is asked again for each row.

Knowing which one you wrote tells you how much work the database has to do, and that is why interviewers ask.

## 2. What a Subquery Is

A subquery is just a SELECT written inside another SQL statement, wrapped in parentheses. The outer statement uses its result as if it were a value, a list, or a table.

📌 **Interview term: subquery** (also *inner query* or *nested query*) — a complete SELECT statement nested inside another statement. The statement that contains it is the **outer query**.

Subqueries are grouped by the shape of what they return:

| Shape | Returns | Typical place | Example |
| :--- | :--- | :--- | :--- |
| Scalar subquery | exactly one value (one row, one column) | WHERE, SELECT list | \`salary > (SELECT AVG(salary) FROM employees)\` |
| Column / list subquery | one column, many rows | after \`IN\`, \`ANY\`, \`ALL\` | \`dept_id IN (SELECT id FROM departments WHERE ...)\` |
| Row subquery | one row, several columns | row comparison | \`(a, b) = (SELECT x, y FROM ...)\` |
| Table subquery | a whole table | FROM (a derived table), \`EXISTS\` | \`FROM (SELECT dept_id, AVG(salary) ... GROUP BY dept_id) AS s\` |

📌 **Interview term: scalar subquery** — a subquery used where a single value is expected. If it returns no rows its value is NULL; if it returns more than one row, that is an error in standard SQL (see the engine difference in section 6).

📌 **Interview term: derived table** — a subquery in the FROM clause, given an alias, that the outer query treats like a table. Many engines require the alias; it is good style everywhere.

Here is the plain subquery for the first question in the story. The inner SELECT computes the company average once; the outer SELECT keeps the rows above it.

~~~sql
SELECT name, salary
FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees)
ORDER BY salary DESC;
~~~

~~~text
name | salary
Asha | 120000
Chen | 105000
Ben | 95000
Eli | 82000
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 760 170" role="img" aria-label="A plain subquery runs once, produces one value, and the outer query compares every row with that value">
  <defs>
    <marker id="sql05q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="60" width="200" height="80" rx="8"/>
  <text class="d-text" x="120" y="94" text-anchor="middle">Inner SELECT</text>
  <text class="d-sub" x="120" y="118" text-anchor="middle">AVG(salary)</text>
  <rect class="d-box-accent" x="290" y="60" width="180" height="80" rx="8"/>
  <text class="d-text" x="380" y="94" text-anchor="middle">One value</text>
  <text class="d-sub" x="380" y="118" text-anchor="middle">81125</text>
  <rect class="d-box" x="540" y="60" width="200" height="80" rx="8"/>
  <text class="d-text" x="640" y="94" text-anchor="middle">Outer SELECT</text>
  <text class="d-sub" x="640" y="118" text-anchor="middle">salary above it</text>
  <path class="d-edge-accent" d="M 222 100 L 284 100" marker-end="url(#sql05q1-arrow)"/>
  <path class="d-edge" d="M 472 100 L 534 100" marker-end="url(#sql05q1-arrow)"/>
  <text class="d-accent" x="120" y="40" text-anchor="middle">runs once</text>
</svg>

The inner query does not mention anything from the outer query, so its answer is the same for every row. The database can compute it first and reuse it.

📌 **Interview term: non-correlated subquery** (also *independent* or *uncorrelated* subquery) — a subquery that does not reference any column of the outer query, so it can be evaluated once and its result reused.

## 3. What Makes a Subquery Correlated

Now the second question: above the average of *their own* department. The inner query needs to know which department the current outer row belongs to, so it refers to the outer alias \`e\`:

~~~sql
SELECT e.name, d.name AS dept, e.salary
FROM employees AS e
JOIN departments AS d ON d.id = e.dept_id
WHERE e.salary > (
  SELECT AVG(i.salary)
  FROM employees AS i
  WHERE i.dept_id = e.dept_id   -- e comes from the outer query
)
ORDER BY dept, e.salary DESC;
~~~

~~~text
name | dept | salary
Asha | Engineering | 120000
Eli | Sales | 82000
Gita | Support | 61000
~~~

📌 **Interview term: correlated subquery** — a subquery that references a column of the outer query (here \`e.dept_id\`). Its result can differ for every outer row, so logically it is evaluated once per outer row.

📌 **Interview term: correlation column** — the outer column the subquery depends on (\`e.dept_id\`). An index on the matching inner column (\`employees(dept_id)\`) is what keeps a correlated subquery fast.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 260" role="img" aria-label="A correlated subquery: for each outer employee row the inner query runs again with that row dept_id">
  <defs>
    <marker id="sql05q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="250" height="200" rx="8"/>
  <text class="d-text" x="145" y="60" text-anchor="middle">Outer rows (e)</text>
  <rect class="d-box-accent" x="45" y="80" width="200" height="38" rx="6"/>
  <text class="d-text" x="145" y="104" text-anchor="middle">Asha, dept 1</text>
  <rect class="d-box-muted" x="45" y="130" width="200" height="38" rx="6"/>
  <text class="d-text" x="145" y="154" text-anchor="middle">Ben, dept 1</text>
  <rect class="d-box-muted" x="45" y="180" width="200" height="38" rx="6"/>
  <text class="d-text" x="145" y="204" text-anchor="middle">Dara, dept 2</text>
  <rect class="d-box-accent" x="470" y="60" width="270" height="120" rx="8"/>
  <text class="d-text" x="605" y="96" text-anchor="middle">Inner SELECT</text>
  <text class="d-sub" x="605" y="122" text-anchor="middle">AVG where dept_id = e.dept_id</text>
  <text class="d-sub" x="605" y="148" text-anchor="middle">runs again per outer row</text>
  <path class="d-edge-accent" d="M 250 99 L 464 99" marker-end="url(#sql05q1-arrow2)"/>
  <text class="d-accent" x="357" y="86" text-anchor="middle">e.dept_id = 1</text>
  <path class="d-edge-dashed" d="M 464 150 L 250 150" marker-end="url(#sql05q1-arrow2)"/>
  <text class="d-sub" x="357" y="172" text-anchor="middle">avg 106666</text>
</svg>

For Asha the inner query is effectively \`AVG(salary) WHERE dept_id = 1\`, which is 106,666.67; Asha's 120,000 is above it, Ben's 95,000 is not. Then the outer query moves to the next row and the inner query runs again with that row's department.

Two notes for beginners:

- The aliases matter. The inner \`employees AS i\` and the outer \`employees AS e\` are the same table read twice. Without distinct aliases, \`dept_id = dept_id\` would compare the inner row with itself and always be true.
- Name resolution goes inside out: an unqualified column in the subquery is looked up in the subquery's own FROM first, then in the outer query. Qualify every column in a correlated subquery so you are never surprised.

### Correlated subqueries in the SELECT list

Correlation is not limited to WHERE. A very common use is computing a per-row figure in the SELECT list:

~~~sql
SELECT d.name,
       (SELECT COUNT(*) FROM employees AS e WHERE e.dept_id = d.id) AS headcount,
       (SELECT MAX(e.salary) FROM employees AS e WHERE e.dept_id = d.id) AS top_salary
FROM departments AS d
ORDER BY d.id;
~~~

~~~text
name | headcount | top_salary
Engineering | 3 | 120000
Sales | 3 | 82000
Support | 2 | 61000
Legal | 0 | NULL
~~~

Legal has no employees, so the inner queries find no rows: \`COUNT(*)\` of an empty set is 0, and \`MAX\` of an empty set is NULL. A JOIN would have dropped Legal unless you remembered a LEFT JOIN; the subquery keeps every department automatically.

### A derived table is not correlated

A subquery in FROM is computed as a table on its own. It cannot see \`d\` from the same FROM list:

~~~sql
SELECT d.name, s.avg_salary
FROM departments AS d
JOIN (
  SELECT dept_id, AVG(salary) AS avg_salary
  FROM employees
  GROUP BY dept_id
) AS s ON s.dept_id = d.id
ORDER BY d.id;
~~~

~~~text
name | avg_salary
Engineering | 106666.66666666667
Sales | 72000
Support | 56500
~~~

(PostgreSQL prints the averages as \`106666.666666666667\`, \`72000.000000000000\` and so on, because \`AVG\` of an integer is \`numeric\` there; SQLite returns a floating point number.) To let a FROM-clause subquery reference an earlier table you need \`LATERAL\` (MySQL added it in 8.0.14, per the [MySQL manual on lateral derived tables](https://dev.mysql.com/doc/refman/8.0/en/lateral-derived-tables.html)); see [What is a LATERAL join?](/interview-question/what-is-a-lateral-join).

## 4. Seeing the Difference in the Query Plan

You do not have to take "runs once" versus "runs per row" on faith; both engines tell you.

**SQLite.** \`EXPLAIN QUERY PLAN\` labels the two kinds differently:

~~~sql
EXPLAIN QUERY PLAN
SELECT name FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees);

EXPLAIN QUERY PLAN
SELECT e.name FROM employees AS e
WHERE e.salary > (SELECT AVG(i.salary) FROM employees AS i WHERE i.dept_id = e.dept_id);
~~~

~~~text
id | parent | notused | detail
2 | 0 | 0 | SCAN employees
7 | 0 | 0 | SCALAR SUBQUERY 1
12 | 7 | 0 | SCAN employees

id | parent | notused | detail
2 | 0 | 0 | SCAN e
6 | 0 | 0 | CORRELATED SCALAR SUBQUERY 1
11 | 6 | 0 | SCAN i
~~~

\`SCALAR SUBQUERY 1\` versus \`CORRELATED SCALAR SUBQUERY 1\`: SQLite knows the second one must be re-evaluated as the outer row changes. (The \`id\` numbers are internal and can differ between SQLite versions.)

**PostgreSQL.** The plain subquery becomes an \`InitPlan\`, computed once before the scan, and the filter compares with its result \`$0\`:

~~~text
QUERY PLAN
Seq Scan on employees
  Filter: ((salary)::numeric > $0)
  InitPlan 1 (returns $0)
    ->  Aggregate
          ->  Seq Scan on employees employees_1
~~~

📌 **Interview term: InitPlan** — PostgreSQL plan node for a subquery that does not depend on the outer row; it is executed once and its result is passed in as a parameter.

The correlated one becomes a \`SubPlan\`. With \`EXPLAIN ANALYZE\` you can see how many times it actually ran:

~~~sql
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT e.name, e.salary
FROM employees AS e
WHERE e.salary > (
  SELECT AVG(i.salary) FROM employees AS i WHERE i.dept_id = e.dept_id
);
~~~

~~~text
QUERY PLAN
Seq Scan on employees e (actual rows=3 loops=1)
  Filter: ((salary)::numeric > (SubPlan 1))
  Rows Removed by Filter: 5
  SubPlan 1
    ->  Aggregate (actual rows=1 loops=8)
          ->  Seq Scan on employees i (actual rows=3 loops=8)
                Filter: (dept_id = e.dept_id)
                Rows Removed by Filter: 5
~~~

\`Aggregate (actual rows=1 loops=8)\`: the inner aggregate ran 8 times, once per employee, and each time scanned the employees table looking for rows of that department. With 8 rows that is nothing; with 1 million employees and no index on \`dept_id\` it would be a million scans. The planner may choose a different plan on other data, so read your own plan rather than assume.

📌 **Interview term: SubPlan** — PostgreSQL plan node for a subquery that is re-executed for outer rows; \`loops=N\` in \`EXPLAIN ANALYZE\` shows how many times.

## 5. Making a Correlated Subquery Fast

Three standard moves, best first:

1. **Index the correlation column.** \`CREATE INDEX ON employees (dept_id)\` turns each inner run from a full scan into an index lookup. Often this alone is enough.
2. **Rewrite as a join to a grouped derived table**, so each department's average is computed once:

~~~sql
SELECT e.name, d.name AS dept, e.salary
FROM employees AS e
JOIN departments AS d ON d.id = e.dept_id
JOIN (
  SELECT dept_id, AVG(salary) AS avg_salary
  FROM employees
  GROUP BY dept_id
) AS a ON a.dept_id = e.dept_id
WHERE e.salary > a.avg_salary
ORDER BY dept, e.salary DESC;
~~~

~~~text
name | dept | salary
Asha | Engineering | 120000
Eli | Sales | 82000
Gita | Support | 61000
~~~

Same three rows as the correlated version.

3. **Use a window function**, \`AVG(salary) OVER (PARTITION BY dept_id)\`, which computes the per-department average in one pass and keeps every row; see [What are window functions?](/interview-question/what-are-window-functions).

Existence checks (\`EXISTS\`, \`IN\`) are a special case that optimizers rewrite into semi joins for you; that is the topic of [What is the difference between EXISTS and IN?](/interview-question/what-is-the-difference-between-exists-and-in) and [Why might EXISTS outperform a JOIN for existence checks?](/interview-question/why-might-exists-outperform-a-join-for-existence-checks). For top-N-per-group, where correlated subqueries, window functions and LATERAL compete, see [LATERAL vs Window Function vs Correlated Subquery for top-N per group](/interview-question/lateral-vs-window-function-vs-correlated-subquery-for-top-n-per-group-which-scal).

## 6. Edge Cases and Engine Differences

**A scalar subquery that returns several rows.** \`SELECT dept_id FROM employees\` returns 8 rows. Used where one value is expected:

~~~sql
SELECT name FROM departments
WHERE id = (SELECT dept_id FROM employees);
~~~

PostgreSQL 16 refuses:

~~~text
ERROR:  more than one row returned by a subquery used as an expression
~~~

SQLite runs it and quietly uses the first row the subquery produced:

~~~text
name
Engineering
~~~

That is a classic way for a query to look correct in SQLite tests and then fail in production on PostgreSQL. If you mean "any of these", write \`IN\`; if you mean one specific row, add \`ORDER BY ... LIMIT 1\` or an aggregate.

**A scalar subquery that returns no rows** gives NULL, and NULL compared with anything is unknown, so a WHERE built on it filters the row out (see [How does SQL handle NULL values?](/interview-question/how-does-sql-handle-null-values)).

**ORDER BY inside a subquery** does not order the outer result. Only the outermost ORDER BY controls output order.

**The logical order still applies.** The subquery in WHERE is evaluated as part of the WHERE step, before GROUP BY and SELECT; see [What is the logical order of execution of a SQL query?](/interview-question/what-is-the-logical-order-of-execution-of-a-sql-query).

**MySQL and the target table.** MySQL raises error 1093 (\`ER_UPDATE_TABLE_USED\`) when an UPDATE or DELETE reads the table it is modifying through a subquery; the usual workaround is to wrap that read in a derived table so MySQL materializes it first ([reference](https://www.bytebase.com/reference/mysql/error/1093-cant-specify-target-table/), not run here).

**CTEs** give a subquery a name so you can read it top to bottom and reuse it; see [What is a CTE (Common Table Expression)?](/interview-question/what-is-a-cte-common-table-expression).

## 7. Verified: Running the Code

The four examples of this page were run by the project verifier: the three runnable ones on sql.js 1.10.2 (SQLite 3.45.0), the last on PostgreSQL 16.15 in a scratch database seeded with the schema above. The plain subquery printed:

~~~text
name | salary
Asha | 120000
Chen | 105000
Ben | 95000
Eli | 82000
~~~

The correlated subquery printed:

~~~text
name | dept | salary
Asha | Engineering | 120000
Eli | Sales | 82000
Gita | Support | 61000
~~~

The SQLite plans printed:

~~~text
id | parent | notused | detail
2 | 0 | 0 | SCAN employees
7 | 0 | 0 | SCALAR SUBQUERY 1
12 | 7 | 0 | SCAN employees

id | parent | notused | detail
2 | 0 | 0 | SCAN e
6 | 0 | 0 | CORRELATED SCALAR SUBQUERY 1
11 | 6 | 0 | SCAN i
~~~

The PostgreSQL plan with actual row counts printed:

~~~text
QUERY PLAN
Seq Scan on employees e (actual rows=3 loops=1)
  Filter: ((salary)::numeric > (SubPlan 1))
  Rows Removed by Filter: 5
  SubPlan 1
    ->  Aggregate (actual rows=1 loops=8)
          ->  Seq Scan on employees i (actual rows=3 loops=8)
                Filter: (dept_id = e.dept_id)
                Rows Removed by Filter: 5
~~~

The SELECT-list, derived-table, rewrite and first-row examples in the prose were run the same way on SQLite; the \`InitPlan\` plan and the multiple-row error were run on PostgreSQL 16.15.

## Common Pitfalls

- **Reusing the same alias inside and outside.** \`WHERE dept_id = dept_id\` in the subquery compares the inner row with itself; always alias both copies and qualify every column.
- **Assuming a scalar subquery returns one row.** It is an error in PostgreSQL and a silent first-row pick in SQLite. Guard with an aggregate, \`LIMIT 1\` plus \`ORDER BY\`, or use \`IN\`.
- **A correlated subquery with no index on the correlation column.** It works on test data and becomes a per-row full scan at scale; check \`loops\` in \`EXPLAIN ANALYZE\`.
- **Forgetting the empty case.** \`MAX\`, \`SUM\` and \`AVG\` over no rows give NULL, not 0; wrap with \`COALESCE\` if the report needs 0.
- **Expecting a derived table to see sibling tables.** A FROM-clause subquery is not correlated unless you write \`LATERAL\`.
- **Putting ORDER BY in a subquery and expecting ordered output.** Order only the outermost query.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">subquery</strong> is a complete SELECT nested inside another statement. It can sit in WHERE, in the SELECT list, in FROM as a derived table, or in HAVING, and it can return one value, one column for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IN</code>, or a whole table.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Plain vs correlated:</strong> <span style="color:#f0e2c8;">A plain subquery does not mention the outer query, so it can be computed once: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">salary &gt; (SELECT AVG(salary) FROM employees)</code>. A <strong style="color:#ffca28;">correlated subquery</strong> uses a column of the outer row, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE i.dept_id = e.dept_id</code>, so its answer is different for every outer row.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. How it runs:</strong> <span style="color:#f0e2c8;">Logically a correlated subquery runs once per outer row. On PostgreSQL 16, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXPLAIN ANALYZE</code> showed the plain one as an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">InitPlan</code> and the correlated one as a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SubPlan</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loops=8</code>, one per employee.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Performance:</strong> <span style="color:#f0e2c8;">A correlated subquery is fine when the correlation column is indexed and the outer set is small. On big tables I rewrite it as a JOIN to a grouped derived table, a window function, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LATERAL</code>, and check the plan.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Gotcha:</strong> <span style="color:#f0e2c8;">A scalar subquery must return at most one row. PostgreSQL raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">more than one row returned by a subquery used as an expression</code>; SQLite silently takes the first row, which hides bugs. Zero rows gives NULL on both.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a correlated subquery always be rewritten as a join?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually yes: an aggregate per group becomes a JOIN to a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY</code> derived table or a window function such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AVG(salary) OVER (PARTITION BY dept_id)</code>; existence checks become semi joins. The rewrite must keep the semantics, for example a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LEFT JOIN</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COALESCE</code> where the subquery would have returned NULL or 0.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does a scalar subquery return when it finds no rows?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">NULL. In the run for this page, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MAX(salary)</code> for the Legal department (no employees) came back as NULL while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(*)</code> came back as 0, because COUNT of an empty set is 0.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a derived table in FROM correlated?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, a plain derived table cannot see the other tables of the same FROM clause. To let it reference them you need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LATERAL</code> (PostgreSQL, MySQL 8.0.14+) or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CROSS APPLY</code> in SQL Server.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the database really run the subquery once per row?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That is the logical model. The optimizer may cache results, turn an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXISTS</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IN</code> into a semi join, or decorrelate it. PostgreSQL 16 kept this scalar aggregate as a per-row <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SubPlan</code>, so always check the plan rather than assume.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where can you not use a subquery?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Most engines allow them almost everywhere an expression is allowed. A common restriction: MySQL will not let you <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UPDATE</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DELETE</code> a table and select from the same table in a subquery of that statement without wrapping it in a derived table.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Subquery | A complete SELECT nested inside another statement |
| Outer query | The statement that contains the subquery |
| Scalar subquery | A subquery used as a single value; NULL when it finds no rows |
| Derived table | A subquery in FROM, used like a table, with an alias |
| Non-correlated subquery | A subquery that does not reference the outer query, so it can run once |
| Correlated subquery | A subquery that references an outer column, so it logically runs per outer row |
| Correlation column | The outer column the correlated subquery depends on |
| InitPlan | PostgreSQL node for a subquery evaluated once |
| SubPlan | PostgreSQL node for a subquery re-evaluated for outer rows, with \`loops\` showing how often |

**Conclusion:** A subquery is a SELECT inside another statement, and the one question that decides how it behaves is whether it refers to the outer row. If it does not, it is a plain subquery that can be computed once (\`SCALAR SUBQUERY\` in SQLite, \`InitPlan\` in PostgreSQL). If it does, it is correlated and logically runs once per outer row (\`CORRELATED SCALAR SUBQUERY\`, a \`SubPlan\` with \`loops=8\` for our 8 employees). Correlated subqueries are often the clearest way to say "for each row, look something up", and they are fine with an index on the correlation column; when they get slow, rewrite them as a join to a grouped table or a window function and confirm with the plan.`,
    examples: [
      {
        label: `Plain (non-correlated) subquery: employees paid above the company average`,
        code: `SELECT name, salary
FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees)
ORDER BY salary DESC;`,
      },
      {
        label: `Correlated subquery: employees paid above the average of their own department`,
        code: `SELECT e.name, d.name AS dept, e.salary
FROM employees AS e
JOIN departments AS d ON d.id = e.dept_id
WHERE e.salary > (
  SELECT AVG(i.salary)
  FROM employees AS i
  WHERE i.dept_id = e.dept_id   -- e comes from the outer query
)
ORDER BY dept, e.salary DESC;`,
      },
      {
        label: `SQLite query plans: SCALAR SUBQUERY for the plain one, CORRELATED SCALAR SUBQUERY for the other`,
        code: `EXPLAIN QUERY PLAN
SELECT name FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees);

EXPLAIN QUERY PLAN
SELECT e.name FROM employees AS e
WHERE e.salary > (SELECT AVG(i.salary) FROM employees AS i WHERE i.dept_id = e.dept_id);`,
      },
      {
        label: `PostgreSQL: the correlated SubPlan runs once per outer row (loops=8)`,
        code: `EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT e.name, e.salary
FROM employees AS e
WHERE e.salary > (
  SELECT AVG(i.salary) FROM employees AS i WHERE i.dept_id = e.dept_id
);`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `What is the difference between EXISTS and IN?`,
    difficulty: "medium",
    seoDescription: `IN tests membership in a list; EXISTS tests whether a subquery returns any row. Both are semi joins; plans, NULLs and multi-column checks, all run.`,
    description: `**Question presented to candidate:**
"Say I want every customer who has placed at least one order. I could write \`WHERE id IN (SELECT customer_id FROM orders)\` or \`WHERE EXISTS (SELECT 1 FROM orders WHERE ...)\`. What is the difference between the two, do they return the same rows, and which one would you pick?"

**What a strong answer should cover:**
- \`IN\` tests whether a value is a member of a list or of one column returned by a subquery; \`EXISTS\` tests whether a (usually correlated) subquery returns at least one row
- Both are semi joins: each outer row comes back at most once, however many matches there are
- \`EXISTS\` ignores the select list (\`SELECT 1\`, \`SELECT *\`, even \`SELECT 1/0\` all behave the same) and can carry any multi-column or non-equality condition
- For positive checks they return the same rows even with NULLs; the real difference shows up with \`NOT IN\` versus \`NOT EXISTS\`
- Performance: modern optimizers (PostgreSQL, MySQL 8.0.16+) usually plan both the same way; older advice "EXISTS is always faster" is engine- and version-specific, so read the plan

**Code / implementation expected:** Yes — the same "customers with an order" query written with \`IN\` and with \`EXISTS\`, plus one check that needs more than one column.

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
  total NUMERIC NOT NULL,
  placed DATE NOT NULL
);
INSERT INTO customers (id, name, country) VALUES
  (1, 'Asha', 'IN'),
  (2, 'Ben', 'UK'),
  (3, 'Chen', 'SG'),
  (4, 'Dara', 'UK'),
  (5, 'Eli', 'US'),
  (6, 'Femi', 'NG');
INSERT INTO orders (id, customer_id, total, placed) VALUES
  (1, 1, 120, '2024-03-01'),
  (2, 1, 35, '2024-03-04'),
  (3, 2, 80, '2024-03-05'),
  (4, 3, 15, '2024-02-07'),
  (5, 3, 160, '2024-03-09'),
  (6, 1, 22, '2024-03-10'),
  (7, 5, 44, '2024-01-12'),
  (8, 2, 210, '2024-03-20');
\`\`\``,
    answer: `**Target Audience:** Beginners who know a basic WHERE clause and have seen both forms in code reviews; anyone who has heard "EXISTS is faster" and wants to know when that is true.
**Difficulty:** Medium
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15, both run for this page. MySQL behaviour is cited from its manual.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and plan below was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

A bouncer at a party has to decide who gets in. There are two ways to do the job.

**Way one:** before the doors open, the host hands over a printed guest list. For every person in the queue, the bouncer checks: *is this name on the list?* That is \`IN\`. The list is built first, then each person is checked against it.

**Way two:** there is no list. For every person in the queue, the bouncer radios the ticket office: *does this person have any ticket at all?* The office stops searching the moment it finds one, and answers yes or no. That is \`EXISTS\`.

Either way, the same people get in, and nobody gets in twice just because they bought three tickets. The difference is in *how* the question is asked, what kinds of questions you can ask ("a ticket for Saturday, in the VIP area, over 100 pounds" is easy over the radio and awkward as a single list), and, as the next page shows, what happens when the list has a blank line on it.

## 2. IN: Is This Value in That Set?

📌 **Interview term: IN predicate** — \`expr IN (list)\` or \`expr IN (subquery)\` is true when \`expr\` equals at least one value of the list or of the single column the subquery returns.

With a literal list:

~~~sql
SELECT id, name, country
FROM customers
WHERE country IN ('UK', 'SG')
ORDER BY id;
~~~

~~~text
id | name | country
2 | Ben | UK
3 | Chen | SG
4 | Dara | UK
~~~

With a subquery, the list comes from another table. Customers who have placed at least one order:

~~~sql
SELECT id, name
FROM customers
WHERE id IN (SELECT customer_id FROM orders)
ORDER BY id;
~~~

~~~text
id | name
1 | Asha
2 | Ben
3 | Chen
5 | Eli
~~~

Asha has three orders and still appears once. Dara and Femi have none.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 200" role="img" aria-label="IN builds the set of customer ids from orders, then checks each customer id for membership">
  <defs>
    <marker id="sql05q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="60" width="200" height="80" rx="8"/>
  <text class="d-text" x="120" y="94" text-anchor="middle">orders</text>
  <text class="d-sub" x="120" y="118" text-anchor="middle">customer_id column</text>
  <rect class="d-box-accent" x="290" y="60" width="180" height="80" rx="8"/>
  <text class="d-text" x="380" y="94" text-anchor="middle">Set of values</text>
  <text class="d-sub" x="380" y="118" text-anchor="middle">1, 2, 3, 5</text>
  <rect class="d-box" x="540" y="60" width="200" height="80" rx="8"/>
  <text class="d-text" x="640" y="94" text-anchor="middle">customers.id</text>
  <text class="d-sub" x="640" y="118" text-anchor="middle">member of the set?</text>
  <path class="d-edge" d="M 222 100 L 284 100" marker-end="url(#sql05q2-arrow)"/>
  <path class="d-edge-accent" d="M 534 100 L 476 100" marker-end="url(#sql05q2-arrow)"/>
  <text class="d-accent" x="380" y="40" text-anchor="middle">IN: value against a list</text>
</svg>

The subquery here is not correlated: it does not mention \`customers\`, so it can be computed once. (Correlated versus plain subqueries are explained in [What is a subquery and what is a correlated subquery?](/interview-question/what-is-a-subquery-and-what-is-a-correlated-subquery).)

## 3. EXISTS: Does Any Matching Row Exist?

📌 **Interview term: EXISTS predicate** — \`EXISTS (subquery)\` is true when the subquery returns at least one row and false when it returns none. It is never NULL.

\`EXISTS\` is almost always written as a correlated subquery, joined to the outer row inside its WHERE. Because it is just a WHERE clause, it can carry any condition you like. Customers with an order over 100 placed in March or later:

~~~sql
SELECT c.id, c.name
FROM customers AS c
WHERE EXISTS (
  SELECT 1
  FROM orders AS o
  WHERE o.customer_id = c.id
    AND o.total > 100
    AND o.placed >= '2024-03-01'
)
ORDER BY c.id;
~~~

~~~text
id | name
1 | Asha
2 | Ben
3 | Chen
~~~

Chen qualifies through order 5 (160 on 2024-03-09) even though Chen's other order is small and in February; one matching row is enough.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 200" role="img" aria-label="EXISTS asks for each customer whether the subquery finds any order row, and stops at the first one">
  <defs>
    <marker id="sql05q2-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="200" height="80" rx="8"/>
  <text class="d-text" x="120" y="94" text-anchor="middle">customer row c</text>
  <text class="d-sub" x="120" y="118" text-anchor="middle">id = 1</text>
  <rect class="d-box-accent" x="290" y="60" width="200" height="80" rx="8"/>
  <text class="d-text" x="390" y="94" text-anchor="middle">Subquery</text>
  <text class="d-sub" x="390" y="118" text-anchor="middle">orders of customer 1</text>
  <rect class="d-box-muted" x="560" y="60" width="180" height="80" rx="8"/>
  <text class="d-text" x="650" y="94" text-anchor="middle">TRUE or FALSE</text>
  <text class="d-sub" x="650" y="118" text-anchor="middle">any row at all?</text>
  <path class="d-edge-accent" d="M 222 100 L 284 100" marker-end="url(#sql05q2-arrow2)"/>
  <path class="d-edge" d="M 492 100 L 554 100" marker-end="url(#sql05q2-arrow2)"/>
  <text class="d-accent" x="390" y="40" text-anchor="middle">EXISTS: does a row exist</text>
</svg>

**The select list of EXISTS is ignored.** Only the existence of a row matters, so \`SELECT 1\`, \`SELECT *\` and \`SELECT NULL\` are equivalent. To prove it, put a division by zero there:

~~~sql
SELECT c.id
FROM customers AS c
WHERE EXISTS (SELECT 1/0 FROM orders AS o WHERE o.customer_id = c.id)
ORDER BY c.id;
~~~

~~~text
id
1
2
3
5
~~~

No error on SQLite, and the same rows with no error on PostgreSQL 16 when run for this page: the expression is never evaluated. \`SELECT 1\` is just the convention that tells the reader "I only care that a row exists".

📌 **Interview term: semi join** — a join that returns each row of the left table at most once, if at least one matching row exists on the right, and never returns columns from the right. \`IN (subquery)\` and \`EXISTS\` are the two ways to write a semi join in SQL; the planner implements them with semi join operators.

Compare with a plain JOIN, which returns one row per match:

~~~sql
SELECT c.id, c.name
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
ORDER BY c.id, o.id;
~~~

~~~text
id | name
1 | Asha
1 | Asha
1 | Asha
2 | Ben
2 | Ben
3 | Chen
3 | Chen
5 | Eli
~~~

Eight rows instead of four. Why that matters for speed is the subject of [Why might EXISTS outperform a JOIN for existence checks?](/interview-question/why-might-exists-outperform-a-join-for-existence-checks).

## 4. Multi-Column Checks

\`IN\` compares one value. When the match needs two columns, either use a **row value** on both sides, or switch to \`EXISTS\`.

📌 **Interview term: row value** (row constructor) — a parenthesised list of values such as \`(o.customer_id, o.total)\` that is compared as a unit.

The largest order of each customer, matched on the pair \`(customer_id, total)\`:

~~~sql
SELECT o.customer_id, o.id AS order_id, o.total
FROM orders AS o
WHERE (o.customer_id, o.total) IN (
  SELECT customer_id, MAX(total)
  FROM orders
  GROUP BY customer_id
)
ORDER BY o.customer_id;
~~~

~~~text
customer_id | order_id | total
1 | 1 | 120
2 | 8 | 210
3 | 5 | 160
5 | 7 | 44
~~~

This ran on SQLite 3.45 and PostgreSQL 16 alike; MySQL supports row constructors with \`IN\` too. I could not verify that SQL Server accepts a multi-column \`IN\` subquery, so for portable code write the same check with \`EXISTS\` and two equality conditions, which every engine accepts.

## 5. Do They Perform Differently?

This is where interview folklore says "EXISTS is faster because it stops at the first match". The honest answer: **it depends on the engine, and on modern engines usually not**.

**PostgreSQL 16** turned both queries into the same plan. The \`IN\` version:

~~~text
QUERY PLAN
Hash Join
  Hash Cond: (customers.id = orders.customer_id)
  ->  Seq Scan on customers
  ->  Hash
        ->  HashAggregate
              Group Key: orders.customer_id
              ->  Seq Scan on orders
~~~

The \`EXISTS\` version:

~~~text
QUERY PLAN
Hash Join
  Hash Cond: (c.id = o.customer_id)
  ->  Seq Scan on customers c
  ->  Hash
        ->  HashAggregate
              Group Key: o.customer_id
              ->  Seq Scan on orders o
~~~

Identical apart from aliases: PostgreSQL de-duplicated \`orders.customer_id\` with a \`HashAggregate\` and then did an ordinary hash join, which is a valid way to run a semi join. On other data it may pick a \`Hash Semi Join\` or a \`Nested Loop Semi Join\` instead, for both forms alike.

**MySQL** applies its semijoin strategies to \`IN\` subqueries, and since 8.0.16 to \`EXISTS\` subqueries as well; the [MySQL 8.0 manual on semijoins](https://dev.mysql.com/doc/refman/8.0/en/semijoins.html) says a statement with an \`EXISTS\` subquery predicate is subject to the same transforms as one with the equivalent \`IN\` predicate.

**SQLite** is the engine where the two really are planned differently. \`EXPLAIN QUERY PLAN\` on sql.js 1.10.2:

~~~text
id | parent | notused | detail
2 | 0 | 0 | SEARCH customers USING INTEGER PRIMARY KEY (rowid=?)
6 | 0 | 0 | LIST SUBQUERY 1
8 | 6 | 0 | SCAN orders

id | parent | notused | detail
2 | 0 | 0 | SCAN c
5 | 0 | 0 | CORRELATED SCALAR SUBQUERY 1
9 | 5 | 0 | SCAN o
~~~

For \`IN\`, SQLite builds the list once (\`LIST SUBQUERY 1\`) and probes \`customers\` by primary key for each value. For \`EXISTS\`, it scans customers and runs a correlated subquery per row (\`CORRELATED SCALAR SUBQUERY 1\`). With an index on \`orders(customer_id)\` the \`EXISTS\` probe is a quick index search; without one, each probe scans \`orders\`.

Practical rule: write the form that states your intent most clearly, then read the plan. If two forms produce the same plan, there is no performance argument.

## 6. NULLs: Harmless Here, Dangerous When Negated

In a positive check, NULLs do not change which rows come back:

~~~sql
SELECT 1 IN (1, NULL) AS one_in, 3 IN (1, NULL) AS three_in;
~~~

~~~text
one_in | three_in
1 | NULL
~~~

A match is still true (1). A non-match becomes NULL instead of false, but WHERE keeps only true, so the row is dropped either way. (PostgreSQL prints \`t\` instead of 1.)

Negate it, and that NULL turns into a disaster: \`3 NOT IN (1, NULL)\` is also NULL, so \`NOT IN\` with a NULL in the subquery returns nothing. That has its own page: [What is the difference between NOT IN and NOT EXISTS when NULLs are involved?](/interview-question/what-is-the-difference-between-not-in-and-not-exists-when-nulls-are-involved). The three-valued logic behind it is in [How does SQL handle NULL values?](/interview-question/how-does-sql-handle-null-values).

## 7. IN vs EXISTS at a Glance

| | \`IN\` | \`EXISTS\` |
| :--- | :--- | :--- |
| Tests | value is a member of a list or one-column result | subquery returns at least one row |
| Accepts a literal list | yes | no, only a subquery |
| Typical subquery | non-correlated | correlated |
| Multi-column or non-equality match | row values only, equality only | any WHERE condition |
| Duplicates the outer row | no (semi join) | no (semi join) |
| Can evaluate to NULL | yes, when no match and NULLs are present | no, only true or false |
| Negated form with NULLs | \`NOT IN\` returns nothing | \`NOT EXISTS\` behaves as expected |
| PostgreSQL 16 plan (this data) | Hash Join after HashAggregate | the same |

## 8. Verified: Running the Code

The four examples were run by the project verifier: the first three on sql.js 1.10.2 (SQLite 3.45.0), the last on PostgreSQL 16.15 in a scratch database seeded with the schema above. \`IN\` with a subquery:

~~~text
id | name
1 | Asha
2 | Ben
3 | Chen
5 | Eli
~~~

\`EXISTS\` with several conditions:

~~~text
id | name
1 | Asha
2 | Ben
3 | Chen
~~~

Row-value \`IN\`:

~~~text
customer_id | order_id | total
1 | 1 | 120
2 | 8 | 210
3 | 5 | 160
5 | 7 | 44
~~~

PostgreSQL plan for \`EXISTS\`:

~~~text
QUERY PLAN
Hash Join
  Hash Cond: (c.id = o.customer_id)
  ->  Seq Scan on customers c
  ->  Hash
        ->  HashAggregate
              Group Key: o.customer_id
              ->  Seq Scan on orders o
~~~

The literal-list, JOIN, \`1/0\`, NULL and SQLite plan snippets in the prose were run the same way on SQLite; the \`IN\` plan was run on PostgreSQL 16.15.

## Common Pitfalls

- **Believing "EXISTS is always faster".** On PostgreSQL 16 both forms got the same plan here; on SQLite they differ. Measure with \`EXPLAIN\` on your engine.
- **Forgetting to correlate EXISTS.** \`WHERE EXISTS (SELECT 1 FROM orders)\` with no link to the outer row is true for every customer as soon as any order exists.
- **Replacing IN or EXISTS with a JOIN and getting duplicates.** A join returns one row per match; add \`DISTINCT\` only if you really want a join.
- **Using NOT IN on a nullable column.** One NULL in the subquery makes \`NOT IN\` return nothing; use \`NOT EXISTS\`.
- **Huge literal IN lists built by the application.** Thousands of values bloat the SQL text and parsing; load them into a temporary table (or pass an array in PostgreSQL, \`= ANY($1)\`) and join or use \`EXISTS\`.
- **Assuming row-value IN is portable.** It ran on SQLite and PostgreSQL; write \`EXISTS\` with two conditions when the code must run everywhere.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definitions:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x IN (subquery)</code> asks whether a value is in the set of values one column returns. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXISTS (subquery)</code> asks whether the subquery returns any row at all; it is usually correlated to the outer row, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE o.customer_id = c.id</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Same answer:</strong> <span style="color:#f0e2c8;">For a positive check both are <strong style="color:#ffca28;">semi joins</strong>: each customer comes back once no matter how many orders match. On our data both returned customers 1, 2, 3 and 5.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What only EXISTS does:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXISTS</code> ignores its select list, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT 1</code> is a convention, and it takes any condition: several columns, ranges, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OR</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IN</code> compares one value, or a row value like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(customer_id, total) IN (...)</code> where the engine supports it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Performance:</strong> <span style="color:#f0e2c8;">On PostgreSQL 16 both queries got the identical Hash Join plan. MySQL has applied the same semijoin transforms to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXISTS</code> as to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IN</code> since 8.0.16. So I pick the one that reads more clearly and verify with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXPLAIN</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The real trap:</strong> <span style="color:#f0e2c8;">The difference that bites is the negated form: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT IN</code> returns no rows at all if the subquery yields a NULL, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT EXISTS</code> behaves as people expect. For anti joins I default to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT EXISTS</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is EXISTS always faster than IN?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. That was true for some older optimizers that ran <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IN</code> by materializing a list and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXISTS</code> by probing an index. Today PostgreSQL and MySQL 8 usually rewrite both into the same semi join. SQLite still plans them differently: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LIST SUBQUERY</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IN</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CORRELATED SCALAR SUBQUERY</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXISTS</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does it matter what you put in the EXISTS select list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Only whether a row exists is checked. In the run for this page <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXISTS (SELECT 1/0 ...)</code> returned the normal rows without a division error on both SQLite and PostgreSQL.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you prefer IN?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a literal list, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">country IN ('UK', 'SG')</code>, or a small non-correlated subquery where it reads more naturally. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXISTS</code> only takes a subquery.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just JOIN?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">JOIN</code> returns one row per matching order, so Asha would come back three times; you would need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DISTINCT</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IN</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXISTS</code> never duplicate the outer row.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with NULLs in a positive IN?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Matches are unaffected: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 IN (1, NULL)</code> is true. A non-match becomes NULL instead of false, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">3 IN (1, NULL)</code>, but WHERE drops NULL and false alike, so positive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IN</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXISTS</code> still agree.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| IN predicate | True when a value equals some value of a list or one-column subquery |
| EXISTS predicate | True when the subquery returns at least one row; never NULL |
| Semi join | Returns each left row at most once if a match exists, no right-side columns |
| Row value | A parenthesised tuple such as \`(a, b)\` compared as a unit |

**Conclusion:** \`IN\` asks "is this value in that set?" and \`EXISTS\` asks "does any matching row exist?". For positive checks they are two spellings of the same semi join: each outer row comes back once, NULLs do not change the result, and on PostgreSQL 16 and MySQL 8 the optimizer usually gives them the same plan. Choose \`IN\` for literal lists and simple single-column lookups, \`EXISTS\` for correlated checks with several conditions, and remember that the important difference lives in the negated forms, where \`NOT IN\` and NULLs do not mix.`,
    examples: [
      {
        label: `IN with a subquery: customers who have placed at least one order`,
        code: `SELECT id, name
FROM customers
WHERE id IN (SELECT customer_id FROM orders)
ORDER BY id;`,
      },
      {
        label: `EXISTS with a correlated, multi-condition check: customers with a March order over 100`,
        code: `SELECT c.id, c.name
FROM customers AS c
WHERE EXISTS (
  SELECT 1
  FROM orders AS o
  WHERE o.customer_id = c.id
    AND o.total > 100
    AND o.placed >= '2024-03-01'
)
ORDER BY c.id;`,
      },
      {
        label: `Row-value IN: the largest order of each customer, matched on two columns at once`,
        code: `SELECT o.customer_id, o.id AS order_id, o.total
FROM orders AS o
WHERE (o.customer_id, o.total) IN (
  SELECT customer_id, MAX(total)
  FROM orders
  GROUP BY customer_id
)
ORDER BY o.customer_id;`,
      },
      {
        label: `PostgreSQL: the EXISTS query gets the same Hash Join plan as the IN query`,
        code: `EXPLAIN (COSTS OFF)
SELECT c.id, c.name
FROM customers AS c
WHERE EXISTS (SELECT 1 FROM orders AS o WHERE o.customer_id = c.id);`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `What is the difference between NOT IN and NOT EXISTS when NULLs are involved?`,
    difficulty: "medium",
    seoDescription: `One NULL in the subquery makes NOT IN return no rows; NOT EXISTS ignores it. Three-valued logic, fixes and PostgreSQL plans, all run.`,
    description: `**Question presented to candidate:**
"We need the customers who have never ordered. A colleague wrote \`WHERE id NOT IN (SELECT customer_id FROM orders)\` and it returns no rows at all, although Dara and Eli clearly have no orders. \`NOT EXISTS\` works. Explain exactly why, and how you would write it."

**What a strong answer should cover:**
- SQL uses three-valued logic: comparing with NULL gives UNKNOWN, and WHERE keeps only TRUE
- \`x NOT IN (a, b, NULL)\` means \`x <> a AND x <> b AND x <> NULL\`; the last term is UNKNOWN, so the whole predicate can never be TRUE and the query returns nothing
- \`NOT EXISTS\` only asks whether a matching row exists; a NULL never matches, so it is simply ignored
- The outer side matters too: a NULL outer value is excluded by \`NOT IN\` but kept by \`NOT EXISTS\`
- Fixes: prefer \`NOT EXISTS\`; or filter \`WHERE customer_id IS NOT NULL\` in the subquery; or \`LEFT JOIN ... IS NULL\`; declare the column \`NOT NULL\` if it should be
- Performance: PostgreSQL turns \`NOT EXISTS\` into an anti join but keeps \`NOT IN\` as a filter with a subplan, which degrades badly when the subquery does not fit in memory

**Code / implementation expected:** Yes — show \`NOT IN\` returning nothing and \`NOT EXISTS\` returning the right customers on data with one NULL.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER,
  total NUMERIC NOT NULL
);
INSERT INTO customers (id, name) VALUES
  (1, 'Asha'),
  (2, 'Ben'),
  (3, 'Chen'),
  (4, 'Dara'),
  (5, 'Eli');
INSERT INTO orders (id, customer_id, total) VALUES
  (1, 1, 120),
  (2, 1, 35),
  (3, 2, 80),
  (4, 3, 15),
  (5, NULL, 22),
  (6, 9, 60);
\`\`\``,
    answer: `**Target Audience:** Anyone who has written "find the rows that have no match" and been surprised by an empty result; beginners meeting NULL logic for the first time.
**Difficulty:** Medium
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15, both run for this page; MySQL notes cite its manual.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and plan below was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

A shop owner asks an assistant: *"Which of our five regular customers have never bought anything?"* The assistant gets the pile of receipts. Most receipts have a customer name on them. One receipt is smudged: the name is unreadable.

A careful assistant who takes the question literally says: *"I cannot tell you that Dara has never bought anything. That smudged receipt might be hers. Same for Eli. Same for everyone. So I can confirm nobody."* That assistant is \`NOT IN\`. Technically correct, completely useless.

A practical assistant says: *"I looked for a receipt with Dara's name on it and found none. Same for Eli."* The smudged receipt does not have Dara's name, so it does not count as hers. That assistant is \`NOT EXISTS\`.

Same pile of receipts, two different questions, two different answers. The bug in production is that people think they asked the second question when they wrote the first.

## 2. Three-Valued Logic in Two Minutes

📌 **Interview term: three-valued logic** — SQL conditions evaluate to TRUE, FALSE or UNKNOWN. Any comparison with NULL (\`=\`, \`<>\`, \`<\` ...) is UNKNOWN, because NULL means "value not known".

📌 **Interview term: UNKNOWN** — the third truth value. \`WHERE\` (and \`ON\`, and \`HAVING\`) keep a row only when the condition is TRUE, so UNKNOWN rows are dropped exactly like FALSE ones. \`NOT UNKNOWN\` is still UNKNOWN.

The rules that matter here: \`TRUE AND UNKNOWN\` is UNKNOWN, \`FALSE AND UNKNOWN\` is FALSE, \`TRUE OR UNKNOWN\` is TRUE. The full story is on [How does SQL handle NULL values?](/interview-question/how-does-sql-handle-null-values).

Now look at \`IN\` and \`NOT IN\` against a list that contains NULL:

~~~sql
SELECT
  1 IN (1, 2, NULL)     AS one_in,
  3 IN (1, 2, NULL)     AS three_in,
  3 NOT IN (1, 2, NULL) AS three_not_in,
  3 NOT IN (1, 2)       AS three_not_in_no_null,
  NULL NOT IN (1, 2)    AS null_not_in;
~~~

~~~text
one_in | three_in | three_not_in | three_not_in_no_null | null_not_in
1 | NULL | NULL | 1 | NULL
~~~

(SQLite prints booleans as 1 and 0; PostgreSQL 16 printed \`t | NULL | NULL | t | NULL\` for the same query.) Read the middle column: \`3 NOT IN (1, 2, NULL)\` is NULL, not TRUE. The only thing that changed from the fourth column is the NULL in the list.

## 3. Why NOT IN Returns Nothing

\`x NOT IN (a, b, c)\` is defined as \`x <> a AND x <> b AND x <> c\`. With a NULL in the list, one of those terms is \`x <> NULL\`, which is UNKNOWN. The AND can then be FALSE (if \`x\` matched something) or UNKNOWN (if it did not), but it can never be TRUE.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 230" role="img" aria-label="NOT IN expands into a chain of not-equal tests joined by AND, and the test against NULL is unknown, so the whole chain is unknown">
  <rect class="d-box-muted" x="20" y="20" width="720" height="50" rx="8"/>
  <text class="d-text" x="380" y="51" text-anchor="middle">4 NOT IN (1, 2, 3, NULL)</text>
  <rect class="d-box" x="20" y="110" width="150" height="50" rx="8"/>
  <text class="d-text" x="95" y="141" text-anchor="middle">4 &lt;&gt; 1</text>
  <rect class="d-box" x="210" y="110" width="150" height="50" rx="8"/>
  <text class="d-text" x="285" y="141" text-anchor="middle">4 &lt;&gt; 2</text>
  <rect class="d-box" x="400" y="110" width="150" height="50" rx="8"/>
  <text class="d-text" x="475" y="141" text-anchor="middle">4 &lt;&gt; 3</text>
  <rect class="d-box-accent" x="590" y="110" width="150" height="50" rx="8"/>
  <text class="d-text" x="665" y="141" text-anchor="middle">4 &lt;&gt; NULL</text>
  <text class="d-sub" x="95" y="190" text-anchor="middle">TRUE</text>
  <text class="d-sub" x="285" y="190" text-anchor="middle">TRUE</text>
  <text class="d-sub" x="475" y="190" text-anchor="middle">TRUE</text>
  <text class="d-accent" x="665" y="190" text-anchor="middle">UNKNOWN</text>
  <text class="d-sub" x="190" y="96" text-anchor="middle">AND</text>
  <text class="d-sub" x="380" y="96" text-anchor="middle">AND</text>
  <text class="d-sub" x="570" y="96" text-anchor="middle">AND</text>
</svg>

For Dara (id 4), every real comparison is TRUE, the NULL comparison is UNKNOWN, and \`TRUE AND UNKNOWN\` is UNKNOWN. The WHERE drops her, and it drops every other customer for the same reason.

Here it is on the sample data, where order 5 is a guest checkout with \`customer_id\` NULL:

~~~sql
SELECT
  (SELECT COUNT(*) FROM customers
   WHERE id NOT IN (SELECT customer_id FROM orders)) AS not_in_count,
  (SELECT COUNT(*) FROM customers AS c
   WHERE NOT EXISTS (SELECT 1 FROM orders AS o WHERE o.customer_id = c.id)) AS not_exists_count;
~~~

~~~text
not_in_count | not_exists_count
0 | 2
~~~

The bare \`SELECT id, name FROM customers WHERE id NOT IN (SELECT customer_id FROM orders)\` returned zero rows on both SQLite and PostgreSQL 16 when run for this page: no error, no warning, just an empty result. That silence is what makes this bug dangerous.

📌 **Interview term: anti join** — "return the left rows that have *no* matching row on the right". \`NOT EXISTS\` and \`LEFT JOIN ... IS NULL\` express it directly; \`NOT IN\` only expresses it when neither side can be NULL.

## 4. Why NOT EXISTS Works

\`NOT EXISTS (subquery)\` is TRUE when the subquery returns no rows. It never compares the outer value with the whole list; it just looks for a row where \`o.customer_id = c.id\` is TRUE. For the NULL order that condition is UNKNOWN, so that row is simply not found, which is exactly what you want.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 200" role="img" aria-label="NOT EXISTS looks for an order row whose customer_id equals 4, the NULL row never matches, no row is found, so the result is TRUE">
  <defs>
    <marker id="sql05q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="190" height="80" rx="8"/>
  <text class="d-text" x="115" y="94" text-anchor="middle">customer 4</text>
  <text class="d-sub" x="115" y="118" text-anchor="middle">Dara</text>
  <rect class="d-box-muted" x="280" y="60" width="220" height="80" rx="8"/>
  <text class="d-text" x="390" y="94" text-anchor="middle">orders where</text>
  <text class="d-sub" x="390" y="118" text-anchor="middle">customer_id = 4</text>
  <rect class="d-box-accent" x="570" y="60" width="170" height="80" rx="8"/>
  <text class="d-text" x="655" y="94" text-anchor="middle">no row found</text>
  <text class="d-sub" x="655" y="118" text-anchor="middle">NOT EXISTS is TRUE</text>
  <path class="d-edge" d="M 212 100 L 274 100" marker-end="url(#sql05q3-arrow)"/>
  <path class="d-edge-accent" d="M 502 100 L 564 100" marker-end="url(#sql05q3-arrow)"/>
  <text class="d-sub" x="390" y="40" text-anchor="middle">the NULL row simply does not match</text>
</svg>

~~~sql
SELECT c.id, c.name
FROM customers AS c
WHERE NOT EXISTS (SELECT 1 FROM orders AS o WHERE o.customer_id = c.id)
ORDER BY c.id;
~~~

~~~text
id | name
4 | Dara
5 | Eli
~~~

\`EXISTS\` itself can only be TRUE or FALSE, never UNKNOWN, so its negation is never UNKNOWN either. For the positive forms and how they compare, see [What is the difference between EXISTS and IN?](/interview-question/what-is-the-difference-between-exists-and-in).

## 5. The Other Direction: NULL on the Outer Side

The NULL can also be on the left. Now the question is "which orders point at a customer that does not exist?" Order 6 points at customer 9, which does not exist, and order 5 has no customer at all:

~~~sql
SELECT o.id, o.customer_id, 'NOT IN' AS method
FROM orders AS o
WHERE o.customer_id NOT IN (SELECT id FROM customers)
UNION ALL
SELECT o.id, o.customer_id, 'NOT EXISTS'
FROM orders AS o
WHERE NOT EXISTS (SELECT 1 FROM customers AS c WHERE c.id = o.customer_id)
ORDER BY 3, 1;
~~~

~~~text
id | customer_id | method
5 | NULL | NOT EXISTS
6 | 9 | NOT EXISTS
6 | 9 | NOT IN
~~~

\`NOT IN\` drops order 5 because \`NULL NOT IN (1, 2, 3, 4, 5)\` is UNKNOWN. \`NOT EXISTS\` keeps it because there is no customer whose id equals NULL. Neither is "wrong"; they answer different questions. If guest orders should not be reported, say so explicitly with \`AND o.customer_id IS NOT NULL\` rather than relying on a side effect of \`NOT IN\`.

One more corner: against an **empty** subquery, \`NOT IN\` is TRUE even for NULL, because there is nothing to compare with:

~~~sql
SELECT NULL NOT IN (SELECT id FROM customers WHERE id > 100) AS null_not_in_empty;
~~~

~~~text
null_not_in_empty
1
~~~

(PostgreSQL 16 printed \`t\`.)

## 6. Four Correct Ways to Write "Customers With No Orders"

**1. NOT EXISTS** (shown above) — the default choice: correct with NULLs, works on every engine, any number of conditions.

**2. NOT IN with the NULLs filtered out** — correct, but you must remember the filter every time:

~~~sql
SELECT id, name
FROM customers
WHERE id NOT IN (SELECT customer_id FROM orders WHERE customer_id IS NOT NULL)
ORDER BY id;
~~~

~~~text
id | name
4 | Dara
5 | Eli
~~~

**3. LEFT JOIN ... IS NULL** — test a column that is never NULL in a matched row, the join column itself is the safest choice:

~~~sql
SELECT c.id, c.name
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
WHERE o.customer_id IS NULL
ORDER BY c.id;
~~~

~~~text
id | name
4 | Dara
5 | Eli
~~~

Why the filter must be in WHERE, not ON, is explained in [Does a filter in the ON clause behave differently from WHERE in a LEFT JOIN?](/interview-question/does-a-filter-in-the-on-clause-behave-differently-from-where-in-a-left-join).

**4. EXCEPT** — set difference; NULLs are treated as equal to each other here, and the result has only the key columns:

~~~sql
SELECT id FROM customers
EXCEPT
SELECT customer_id FROM orders
ORDER BY 1;
~~~

~~~text
id
4
5
~~~

(MySQL added \`EXCEPT\` in 8.0.31, per the [8.0.31 release notes](https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-31.html); not run here.)

The real fix at the schema level: if \`orders.customer_id\` should never be NULL, declare it \`NOT NULL\`; see [What are NOT NULL, DEFAULT and other column constraints?](/interview-question/what-are-not-null-default-and-other-column-constraints).

## 7. The Performance Side

Correctness is the headline, but the plans differ too. On PostgreSQL 16 with the sample data, \`NOT EXISTS\` became a real anti join:

~~~text
QUERY PLAN
Hash Right Anti Join
  Hash Cond: (o.customer_id = c.id)
  ->  Seq Scan on orders o
  ->  Hash
        ->  Seq Scan on customers c
~~~

📌 **Interview term: Hash Anti Join** — a hash join that emits the outer rows with no match. "Right" means PostgreSQL hashed the customers side and streamed orders through it; the version-16 release notes credit a change that lets anti joins use the non-nullable input as the inner relation ([PostgreSQL 16 release notes](https://www.postgresql.org/docs/release/16/)).

\`NOT IN\` cannot be turned into an anti join, because the NULL rules make it a different operation. PostgreSQL keeps it as a filter with a hashed subplan:

~~~text
QUERY PLAN
Seq Scan on customers
  Filter: (NOT (hashed SubPlan 1))
  SubPlan 1
    ->  Seq Scan on orders
~~~

📌 **Interview term: hashed SubPlan** — PostgreSQL runs the subquery once, stores its values in an in-memory hash table, and probes it for every outer row. It only does this if the hash table is expected to fit in \`work_mem\`.

When it does not fit, the plan changes for the worse. With 200,000 order rows and \`work_mem\` set to 64kB:

~~~sql
CREATE TABLE big_orders AS
  SELECT g AS id, g % 50000 AS customer_id
  FROM generate_series(1, 200000) AS g;
ANALYZE big_orders;
SET work_mem = '64kB';

EXPLAIN (COSTS OFF)
SELECT id, name FROM customers
WHERE id NOT IN (SELECT customer_id FROM big_orders);
~~~

~~~text
QUERY PLAN
Seq Scan on customers
  Filter: (NOT (SubPlan 1))
  SubPlan 1
    ->  Materialize
          ->  Seq Scan on big_orders
~~~

No more "hashed": for every customer the database walks the materialized list of order rows, which is outer rows times inner rows. The equivalent \`NOT EXISTS\` against \`big_orders\` under the same setting still got a \`Hash Right Anti Join\` in this run. The planner may choose differently on other data and settings, so check your own plan.

On **MySQL**, the optimizer has transformed \`NOT IN\` and \`NOT EXISTS\` subqueries into antijoins since 8.0.17, but its manual notes that the transformation often cannot be applied when the compared expressions are nullable ([MySQL 8.0 manual, semijoins and antijoins](https://dev.mysql.com/doc/refman/8.0/en/semijoins.html)). Not run here.

## 8. NOT IN vs NOT EXISTS at a Glance

| | \`NOT IN (subquery)\` | \`NOT EXISTS (subquery)\` |
| :--- | :--- | :--- |
| NULL in the subquery | returns no rows | ignored |
| NULL in the outer column | row excluded (non-empty list) | row kept |
| Possible results | TRUE, FALSE, UNKNOWN | TRUE, FALSE |
| Multi-column condition | row values only | any WHERE condition |
| PostgreSQL 16 plan here | Filter with hashed SubPlan, plain SubPlan when large | Hash Right Anti Join |
| Safe when | both columns are declared NOT NULL | always |

## 9. Verified: Running the Code

The four examples were run by the project verifier: the first three on sql.js 1.10.2 (SQLite 3.45.0), the last on PostgreSQL 16.15 in a scratch database seeded with the schema above. The count comparison:

~~~text
not_in_count | not_exists_count
0 | 2
~~~

The truth table:

~~~text
one_in | three_in | three_not_in | three_not_in_no_null | null_not_in
1 | NULL | NULL | 1 | NULL
~~~

The orphaned-orders comparison:

~~~text
id | customer_id | method
5 | NULL | NOT EXISTS
6 | 9 | NOT EXISTS
6 | 9 | NOT IN
~~~

The PostgreSQL plan with a large subquery and low \`work_mem\`:

~~~text
QUERY PLAN
Seq Scan on customers
  Filter: (NOT (SubPlan 1))
  SubPlan 1
    ->  Materialize
          ->  Seq Scan on big_orders
~~~

The four rewrites and the empty-subquery case in the prose were run the same way on SQLite (and returned the same rows on PostgreSQL 16.15); the two smaller plans were run on PostgreSQL 16.15.

## Common Pitfalls

- **Writing NOT IN against a nullable column.** It works in testing, then one NULL row arrives and the query silently returns nothing.
- **"Fixing" it with COALESCE on one side only.** \`NOT IN (SELECT COALESCE(customer_id, -1) ...)\` works until \`-1\` becomes a real id; filter with \`IS NOT NULL\` or use \`NOT EXISTS\`.
- **Testing the wrong column in LEFT JOIN ... IS NULL.** Testing a nullable non-key column of the right table also matches rows that did join but have NULL there; test the join column or the primary key.
- **Forgetting the outer-side NULLs.** \`NOT IN\` and \`NOT EXISTS\` disagree on rows whose own column is NULL; decide explicitly.
- **Relying on NOT IN for performance.** PostgreSQL cannot plan it as an anti join, and it degrades to a per-row SubPlan when the list exceeds \`work_mem\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Three-valued logic:</strong> <span style="color:#f0e2c8;">SQL comparisons can be TRUE, FALSE or <strong style="color:#ffca28;">UNKNOWN</strong>, and anything compared with NULL is UNKNOWN. WHERE keeps only TRUE rows.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why NOT IN breaks:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">4 NOT IN (1, 2, 3, NULL)</code> means <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">4 &lt;&gt; 1 AND 4 &lt;&gt; 2 AND 4 &lt;&gt; 3 AND 4 &lt;&gt; NULL</code>. The last term is UNKNOWN, so the whole AND is UNKNOWN, never TRUE. One NULL in the subquery and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT IN</code> returns no rows.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why NOT EXISTS works:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT EXISTS</code> asks whether any row satisfies <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">o.customer_id = c.id</code>. The NULL row never satisfies it, so it is ignored. On our data <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT IN</code> found 0 customers and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT EXISTS</code> found Dara and Eli.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The fix:</strong> <span style="color:#f0e2c8;">I write anti joins as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT EXISTS</code>. If I must keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT IN</code>, I add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE customer_id IS NOT NULL</code> inside the subquery, and if the column should never be NULL I declare it <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT NULL</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Performance bonus:</strong> <span style="color:#f0e2c8;">PostgreSQL 16 planned <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT EXISTS</code> as a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Hash Right Anti Join</code> but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT IN</code> as a filter with a hashed SubPlan; when the subquery is too big for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">work_mem</code> that becomes a per-row <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SubPlan</code> over a materialized list, which is quadratic.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does IN have the same problem?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not in practice. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">3 IN (1, 2, NULL)</code> is UNKNOWN instead of FALSE, but WHERE drops both, and a real match is still TRUE. Only negation turns the UNKNOWN into a missing result.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the NULL is on the outer side?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NULL NOT IN (...)</code> is UNKNOWN for any non-empty list, so an order with a NULL <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">customer_id</code> is excluded by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT IN</code> but returned by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT EXISTS</code>, because no customer has id NULL. Decide which you want; usually <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT EXISTS</code> plus an explicit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">customer_id IS NOT NULL</code> if you want to exclude them.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the subquery returns no rows at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x NOT IN (empty)</code> is TRUE even when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> is NULL. In the run for this page <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NULL NOT IN (SELECT ... WHERE id &gt; 100)</code> returned TRUE on both SQLite and PostgreSQL.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is LEFT JOIN ... IS NULL equivalent?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, if you test a column that cannot be NULL in a matched row, typically the join column itself. PostgreSQL 16 planned <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LEFT JOIN orders ON o.customer_id = c.id WHERE o.customer_id IS NULL</code> as the same anti join as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT EXISTS</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does every engine behave this way?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The NULL semantics are standard SQL, so the wrong result is the same everywhere. What differs is optimization: MySQL has turned <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT IN</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT EXISTS</code> into antijoins since 8.0.17, but its manual notes the transform often cannot apply when the compared expressions are nullable.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Three-valued logic | Conditions are TRUE, FALSE or UNKNOWN; comparisons with NULL are UNKNOWN |
| UNKNOWN | The third truth value; WHERE drops it like FALSE |
| Anti join | Returns left rows that have no matching right row |
| Hash Anti Join | PostgreSQL hash join node that emits unmatched outer rows |
| Hashed SubPlan | PostgreSQL subquery stored once in an in-memory hash table and probed per row |

**Conclusion:** \`NOT IN\` is a chain of \`<>\` comparisons joined by AND, so a single NULL in the subquery makes it UNKNOWN for every row and the query returns nothing; \`NOT EXISTS\` only looks for a matching row, so NULLs never match and are ignored. On the sample data \`NOT IN\` found 0 customers without orders and \`NOT EXISTS\` found the right 2. Default to \`NOT EXISTS\` for anti joins: it is correct with NULLs, it is planned as a real anti join on PostgreSQL, and it does not collapse into a per-row subplan when the data grows. Keep \`NOT IN\` for literal lists and columns declared \`NOT NULL\`.`,
    examples: [
      {
        label: `The bug in one row: NOT IN finds 0 customers without orders, NOT EXISTS finds 2`,
        code: `SELECT
  (SELECT COUNT(*) FROM customers
   WHERE id NOT IN (SELECT customer_id FROM orders)) AS not_in_count,
  (SELECT COUNT(*) FROM customers AS c
   WHERE NOT EXISTS (SELECT 1 FROM orders AS o WHERE o.customer_id = c.id)) AS not_exists_count;`,
      },
      {
        label: `Three-valued logic: IN and NOT IN against a list that contains NULL`,
        code: `SELECT
  1 IN (1, 2, NULL)     AS one_in,
  3 IN (1, 2, NULL)     AS three_in,
  3 NOT IN (1, 2, NULL) AS three_not_in,
  3 NOT IN (1, 2)       AS three_not_in_no_null,
  NULL NOT IN (1, 2)    AS null_not_in;`,
      },
      {
        label: `The other direction: an order with a NULL customer_id is dropped by NOT IN but kept by NOT EXISTS`,
        code: `SELECT o.id, o.customer_id, 'NOT IN' AS method
FROM orders AS o
WHERE o.customer_id NOT IN (SELECT id FROM customers)
UNION ALL
SELECT o.id, o.customer_id, 'NOT EXISTS'
FROM orders AS o
WHERE NOT EXISTS (SELECT 1 FROM customers AS c WHERE c.id = o.customer_id)
ORDER BY 3, 1;`,
      },
      {
        label: `PostgreSQL: with a large subquery and little work_mem, NOT IN falls back to a per-row SubPlan`,
        code: `CREATE TABLE big_orders AS
  SELECT g AS id, g % 50000 AS customer_id
  FROM generate_series(1, 200000) AS g;
ANALYZE big_orders;
SET work_mem = '64kB';

EXPLAIN (COSTS OFF)
SELECT id, name FROM customers
WHERE id NOT IN (SELECT customer_id FROM big_orders);`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `Why might EXISTS outperform a JOIN for existence checks?`,
    difficulty: "medium",
    seoDescription: `A JOIN builds one row per match and needs DISTINCT; EXISTS is a semi join that stops at the first match. Plans and fan-out bugs, all run.`,
    description: `**Question presented to candidate:**
"To list customers who have at least one order, one engineer writes \`SELECT DISTINCT c.* FROM customers c JOIN orders o ON ...\` and another writes \`WHERE EXISTS (SELECT 1 FROM orders o WHERE ...)\`. The second is faster on our big tables. Why might EXISTS beat the JOIN, and is that always true?"

**What a strong answer should cover:**
- A JOIN returns one row per matching pair, so a customer with 40 orders becomes 40 rows (fan-out); DISTINCT or GROUP BY must then remove the duplicates
- EXISTS is a semi join: it needs only the first matching row per outer row, can stop there, and never duplicates the outer row
- With an index on the foreign key, a nested loop semi join reads one index entry per customer instead of all of them; \`EXPLAIN ANALYZE\` shows this as \`rows=1\` versus \`rows=40\` per loop
- Fan-out also silently inflates aggregates (\`COUNT\`, \`SUM\`) when the join is only there to filter
- It is not always faster: optimizers often plan \`IN\`, \`EXISTS\` and even some joins the same way, and a JOIN is correct and fine when you need columns from the other table or the join is on a unique key

**Clarifying questions expected:**
- Do we need any columns from \`orders\`, or only the customer rows?
- Is there an index on \`orders.customer_id\`, and roughly how many orders per customer?

**Code / implementation expected:** Yes — the JOIN with its duplicates, the EXISTS rewrite, and ideally the two plans side by side.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT NOT NULL
);
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  total NUMERIC NOT NULL
);
CREATE INDEX orders_customer_idx ON orders (customer_id);
INSERT INTO customers (id, name, region) VALUES
  (1, 'Asha', 'North'),
  (2, 'Ben', 'North'),
  (3, 'Chen', 'South'),
  (4, 'Dara', 'South'),
  (5, 'Eli', 'North');
INSERT INTO orders (id, customer_id, total) VALUES
  (1, 1, 120),
  (2, 1, 35),
  (3, 1, 22),
  (4, 1, 64),
  (5, 2, 80),
  (6, 3, 15),
  (7, 3, 160),
  (8, 2, 44);
\`\`\``,
    answer: `**Target Audience:** Developers who filter with joins out of habit and want to understand duplicates, semi joins and the plans behind "EXISTS is faster"; beginners who know what a JOIN is.
**Difficulty:** Medium
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15, both run for this page; MySQL notes cite its manual.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and plan below was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

A club wants to invite every member who has ever booked a court. Two volunteers are given the job.

The first volunteer takes the bookings ledger and, for every member, copies out *every* booking they ever made, one line each. Asha booked 40 times, so Asha gets 40 lines. At the end the volunteer has a huge list and spends the afternoon crossing out duplicates so that each name appears once.

The second volunteer opens the ledger at each member's section, sees one booking, writes the name down, and moves on to the next member. Done before lunch.

Both lists end up the same. The first volunteer did a JOIN followed by DISTINCT; the second did an EXISTS. The question "has this member booked at least once?" never needed the other 39 bookings.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do we need any columns from \`orders\`? | If yes, a JOIN is the right tool; if no, it is only a filter and a semi join fits |
| How many orders per customer, roughly? | Fan-out is the cost: 1 order each means no duplicates, 40 each means 40 times the rows |
| Is \`orders.customer_id\` indexed? | A semi join with an index can stop after one entry per customer |
| Which engine and version? | Optimizers differ in how they handle subqueries; the plan is the only proof |
| Is the query part of an aggregate report? | Fan-out inflates \`COUNT\` and \`SUM\`, which is a correctness bug, not just speed |

## 3. Fan-Out: What a JOIN Really Returns

📌 **Interview term: fan-out** (row multiplication) — when one row on one side of a join matches several rows on the other side, it appears once per match in the result.

~~~sql
SELECT c.id, c.name, o.id AS order_id
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
ORDER BY c.id, o.id;
~~~

~~~text
id | name | order_id
1 | Asha | 1
1 | Asha | 2
1 | Asha | 3
1 | Asha | 4
2 | Ben | 5
2 | Ben | 8
3 | Chen | 6
3 | Chen | 7
~~~

Asha has four orders, so she appears four times. To answer "which customers have orders?" with this, you must collapse the rows again with \`DISTINCT\` or \`GROUP BY\`, which means extra sorting or hashing (see [What does DISTINCT do and what is its cost?](/interview-question/what-does-distinct-do-and-what-is-its-cost)).

<svg class="iq-diagram" width="100%" viewBox="0 0 760 260" role="img" aria-label="JOIN path: one customer joined to four orders produces four rows, then DISTINCT collapses them back to one">
  <defs>
    <marker id="sql05q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="100" width="160" height="60" rx="8"/>
  <text class="d-text" x="100" y="136" text-anchor="middle">Asha</text>
  <rect class="d-box-muted" x="260" y="20" width="200" height="40" rx="6"/>
  <text class="d-text" x="360" y="46" text-anchor="middle">Asha + order 1</text>
  <rect class="d-box-muted" x="260" y="80" width="200" height="40" rx="6"/>
  <text class="d-text" x="360" y="106" text-anchor="middle">Asha + order 2</text>
  <rect class="d-box-muted" x="260" y="140" width="200" height="40" rx="6"/>
  <text class="d-text" x="360" y="166" text-anchor="middle">Asha + order 3</text>
  <rect class="d-box-muted" x="260" y="200" width="200" height="40" rx="6"/>
  <text class="d-text" x="360" y="226" text-anchor="middle">Asha + order 4</text>
  <rect class="d-box-accent" x="560" y="100" width="180" height="60" rx="8"/>
  <text class="d-text" x="650" y="128" text-anchor="middle">DISTINCT</text>
  <text class="d-sub" x="650" y="148" text-anchor="middle">back to 1 row</text>
  <path class="d-edge" d="M 182 130 L 254 40" marker-end="url(#sql05q4-arrow)"/>
  <path class="d-edge" d="M 182 130 L 254 100" marker-end="url(#sql05q4-arrow)"/>
  <path class="d-edge" d="M 182 130 L 254 160" marker-end="url(#sql05q4-arrow)"/>
  <path class="d-edge" d="M 182 130 L 254 220" marker-end="url(#sql05q4-arrow)"/>
  <path class="d-edge-accent" d="M 462 130 L 554 130" marker-end="url(#sql05q4-arrow)"/>
</svg>

Counting the rows each approach produces on the sample data:

~~~sql
SELECT
  (SELECT COUNT(*)
   FROM customers AS c JOIN orders AS o ON o.customer_id = c.id) AS join_rows,
  (SELECT COUNT(*) FROM (
     SELECT DISTINCT c.id, c.name
     FROM customers AS c JOIN orders AS o ON o.customer_id = c.id)) AS after_distinct,
  (SELECT COUNT(*)
   FROM customers AS c
   WHERE EXISTS (SELECT 1 FROM orders AS o WHERE o.customer_id = c.id)) AS exists_rows;
~~~

~~~text
join_rows | after_distinct | exists_rows
8 | 3 | 3
~~~

The JOIN built 8 rows to deliver 3. With 1,000 customers and 20 orders each, it would build 20,000 rows to deliver 1,000.

## 4. EXISTS Is a Semi Join

📌 **Interview term: semi join** — a join that returns each row of the outer table at most once, when at least one matching inner row exists, and never returns inner columns. \`EXISTS\` and \`IN (subquery)\` are how you write one in SQL.

~~~sql
SELECT c.id, c.name
FROM customers AS c
WHERE EXISTS (SELECT 1 FROM orders AS o WHERE o.customer_id = c.id)
ORDER BY c.id;
~~~

~~~text
id | name
1 | Asha
2 | Ben
3 | Chen
~~~

📌 **Interview term: short-circuit (early exit)** — a semi join can stop looking for matches for the current outer row as soon as it has found one, because more matches cannot change the answer.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 200" role="img" aria-label="EXISTS path: for Asha the index probe finds order 1, stops, and Asha is returned once">
  <defs>
    <marker id="sql05q4-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="70" width="160" height="60" rx="8"/>
  <text class="d-text" x="100" y="106" text-anchor="middle">Asha</text>
  <rect class="d-box-accent" x="260" y="70" width="220" height="60" rx="8"/>
  <text class="d-text" x="370" y="98" text-anchor="middle">index probe</text>
  <text class="d-sub" x="370" y="118" text-anchor="middle">first match: order 1</text>
  <rect class="d-box-muted" x="560" y="70" width="180" height="60" rx="8"/>
  <text class="d-text" x="650" y="106" text-anchor="middle">Asha, once</text>
  <path class="d-edge" d="M 182 100 L 254 100" marker-end="url(#sql05q4-arrow2)"/>
  <path class="d-edge-accent" d="M 482 100 L 554 100" marker-end="url(#sql05q4-arrow2)"/>
  <text class="d-accent" x="370" y="40" text-anchor="middle">stop here</text>
  <text class="d-sub" x="370" y="170" text-anchor="middle">orders 2, 3, 4 never read</text>
</svg>

The engine is not obliged to stop early, but it is *allowed* to, and a good plan does. A JOIN is never allowed to stop early, because every match is part of its result.

## 5. Proof in the Plans

Plans with 8 rows show little, so the PostgreSQL examples build a bigger data set first: 1,000 customers, 20,000 orders spread over 500 of them (40 each), a primary key on customers and an index on \`many_orders(customer_id)\`. Both queries look at customers 1 to 10.

**EXISTS** on PostgreSQL 16:

~~~sql
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT c.id, c.name
FROM many_customers AS c
WHERE c.id <= 10
  AND EXISTS (SELECT 1 FROM many_orders AS o WHERE o.customer_id = c.id);
~~~

~~~text
QUERY PLAN
Nested Loop Semi Join (actual rows=10 loops=1)
  ->  Index Scan using many_customers_pkey on many_customers c (actual rows=10 loops=1)
        Index Cond: (id <= 10)
  ->  Index Only Scan using many_orders_customer_idx on many_orders o (actual rows=1 loops=10)
        Index Cond: (customer_id = c.id)
        Heap Fetches: 0
~~~

\`Nested Loop Semi Join\`, and the inner \`Index Only Scan\` shows \`actual rows=1 loops=10\`: for each of the 10 customers it read one index entry and stopped.

📌 **Interview term: Nested Loop Semi Join** — PostgreSQL join node that, for each outer row, probes the inner side and moves on after the first match.

**JOIN + DISTINCT** on the same data:

~~~sql
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT DISTINCT c.id, c.name
FROM many_customers AS c
JOIN many_orders AS o ON o.customer_id = c.id
WHERE c.id <= 10;
~~~

~~~text
QUERY PLAN
HashAggregate (actual rows=10 loops=1)
  Group Key: c.id, c.name
  Batches: 1  Memory Usage: 24kB
  ->  Nested Loop (actual rows=400 loops=1)
        ->  Index Scan using many_customers_pkey on many_customers c (actual rows=10 loops=1)
              Index Cond: (id <= 10)
        ->  Index Only Scan using many_orders_customer_idx on many_orders o (actual rows=40 loops=10)
              Index Cond: (customer_id = c.id)
              Heap Fetches: 0
~~~

Same index, but \`actual rows=40 loops=10\`: all 40 entries per customer, 400 joined rows, then a \`HashAggregate\` to get back to 10. That is the extra work EXISTS avoids: 40 times the index reads and a de-duplication step.

**Over the whole table** (no \`WHERE c.id <= 10\`) the JOIN switches to a hash join of all 20,000 orders and de-duplicates afterwards:

~~~text
QUERY PLAN
HashAggregate (actual rows=500 loops=1)
  Group Key: c.id, c.name
  Batches: 1  Memory Usage: 97kB
  ->  Hash Join (actual rows=20000 loops=1)
        Hash Cond: (o.customer_id = c.id)
        ->  Seq Scan on many_orders o (actual rows=20000 loops=1)
        ->  Hash (actual rows=1000 loops=1)
              Buckets: 1024  Batches: 1  Memory Usage: 48kB
              ->  Seq Scan on many_customers c (actual rows=1000 loops=1)
~~~

EXISTS stays a \`Nested Loop Semi Join\`: 1,000 index probes, each stopping at the first entry, with 500 customers returned:

~~~text
QUERY PLAN
Nested Loop Semi Join (actual rows=500 loops=1)
  ->  Seq Scan on many_customers c (actual rows=1000 loops=1)
  ->  Index Only Scan using many_orders_customer_idx on many_orders o (actual rows=0 loops=1000)
        Index Cond: (customer_id = c.id)
        Heap Fetches: 0
~~~

(\`actual rows=0 loops=1000\` is a per-loop average: 500 matches over 1,000 probes, printed rounded to a whole number.) The join step produced 20,000 rows in the first plan and 500 in the second. On the sibling page's smaller data, PostgreSQL instead de-duplicated the order ids first and used a plain hash join for \`EXISTS\`; both are semi join strategies. The planner may choose different plans on other data, sizes or settings, so read your own plan rather than these.

**SQLite** is a useful reminder that optimizers are clever. Three plans on sql.js 1.10.2, with the index on \`orders(customer_id)\`: JOIN + \`DISTINCT c.id, c.name\`, JOIN + \`DISTINCT c.name\`, and \`EXISTS\`:

~~~text
id | parent | notused | detail
4 | 0 | 0 | SCAN c
6 | 0 | 0 | SEARCH o USING COVERING INDEX orders_customer_idx (customer_id=?)

id | parent | notused | detail
4 | 0 | 0 | SCAN o USING COVERING INDEX orders_customer_idx
6 | 0 | 0 | SEARCH c USING INTEGER PRIMARY KEY (rowid=?)
15 | 0 | 0 | USE TEMP B-TREE FOR DISTINCT

id | parent | notused | detail
2 | 0 | 0 | SCAN c
5 | 0 | 0 | CORRELATED SCALAR SUBQUERY 1
9 | 5 | 0 | SEARCH o USING COVERING INDEX orders_customer_idx (customer_id=?)
~~~

In the first plan there is no \`USE TEMP B-TREE FOR DISTINCT\`: because \`c.id\` is the primary key and is in the select list, SQLite knows each customer row is already distinct and needs no separate de-duplication structure. Select only \`c.name\`, which is not unique, and the temp B-tree for DISTINCT appears (and the planner even flips the join order). The \`EXISTS\` plan runs a correlated subquery whose index search can stop at the first entry. Lesson: the cost of the JOIN version depends on whether the engine can prove uniqueness, which is exactly why you read the plan. (The \`id\` numbers are internal and can differ between SQLite versions.)

**MySQL** turns \`IN\` and, since 8.0.16, \`EXISTS\` subqueries into semijoins and chooses by cost among strategies such as FirstMatch (stop at the first match), LooseScan, Materialization and Duplicate Weedout ([MySQL 8.0 manual, semijoins](https://dev.mysql.com/doc/refman/8.0/en/semijoins.html)). Not run here.

## 6. Fan-Out Also Breaks Aggregates

Slow is bad; wrong is worse. Suppose the report is "how many customers with orders per region", and someone reuses the join as a filter:

~~~sql
SELECT 'JOIN' AS method, c.region, COUNT(*) AS customers
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
GROUP BY c.region
UNION ALL
SELECT 'EXISTS', c.region, COUNT(*)
FROM customers AS c
WHERE EXISTS (SELECT 1 FROM orders AS o WHERE o.customer_id = c.id)
GROUP BY c.region
ORDER BY 1, 2;
~~~

~~~text
method | region | customers
EXISTS | North | 2
EXISTS | South | 1
JOIN | North | 6
JOIN | South | 2
~~~

The JOIN says 6 North customers. There are only 2 North customers with orders (Asha and Ben); the 6 is their order count. \`EXISTS\` gives the right answer with no \`DISTINCT\` needed. Aggregation rules are covered in [How does GROUP BY work with aggregate functions?](/interview-question/how-does-group-by-work-with-aggregate-functions).

## 7. When a JOIN Is the Right Answer

EXISTS is not a universal replacement. Use a JOIN when:

- **You need the other table's columns or aggregates.** Order count and total per customer genuinely need the order rows:

~~~sql
SELECT c.name, COUNT(o.id) AS orders, SUM(o.total) AS spent
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
GROUP BY c.id, c.name
ORDER BY c.id;
~~~

~~~text
name | orders | spent
Asha | 4 | 241
Ben | 2 | 124
Chen | 2 | 175
~~~

- **The join is on a unique key**, for example orders joined to their customer: each order matches exactly one customer, so there is no fan-out and nothing to de-duplicate.
- **The planner already produces the same plan.** Modern optimizers handle semi joins well; if \`EXPLAIN\` shows the same plan, pick the clearer query.

The comparison of \`IN\` and \`EXISTS\` themselves is on [What is the difference between EXISTS and IN?](/interview-question/what-is-the-difference-between-exists-and-in); the join types are on [What are the different types of SQL joins?](/interview-question/what-are-the-different-types-of-sql-joins).

## 8. JOIN + DISTINCT vs EXISTS at a Glance

| | JOIN + DISTINCT | EXISTS |
| :--- | :--- | :--- |
| Rows built per outer row | one per match | at most one |
| Can stop at first match | no | yes |
| Needs de-duplication | yes, sort or hash | no |
| Safe for COUNT / SUM over the outer rows | no, inflated by fan-out | yes |
| Returns columns of the inner table | yes | no |
| PostgreSQL 16, 10 customers x 40 orders | 400 joined rows then HashAggregate | Nested Loop Semi Join, 1 index entry per customer |

## 9. Verified: Running the Code

The four examples were run by the project verifier: the first two on sql.js 1.10.2 (SQLite 3.45.0), the last two on PostgreSQL 16.15, each in its own scratch database seeded with the schema above. Each PostgreSQL example creates its own \`many_customers\` and \`many_orders\` tables first, so the setup statements are part of the example code. The fan-out JOIN:

~~~text
id | name | order_id
1 | Asha | 1
1 | Asha | 2
1 | Asha | 3
1 | Asha | 4
2 | Ben | 5
2 | Ben | 8
3 | Chen | 6
3 | Chen | 7
~~~

The row counts:

~~~text
join_rows | after_distinct | exists_rows
8 | 3 | 3
~~~

The EXISTS plan:

~~~text
QUERY PLAN
Nested Loop Semi Join (actual rows=10 loops=1)
  ->  Index Scan using many_customers_pkey on many_customers c (actual rows=10 loops=1)
        Index Cond: (id <= 10)
  ->  Index Only Scan using many_orders_customer_idx on many_orders o (actual rows=1 loops=10)
        Index Cond: (customer_id = c.id)
        Heap Fetches: 0
~~~

The JOIN + DISTINCT plan:

~~~text
QUERY PLAN
HashAggregate (actual rows=10 loops=1)
  Group Key: c.id, c.name
  Batches: 1  Memory Usage: 24kB
  ->  Nested Loop (actual rows=400 loops=1)
        ->  Index Scan using many_customers_pkey on many_customers c (actual rows=10 loops=1)
              Index Cond: (id <= 10)
        ->  Index Only Scan using many_orders_customer_idx on many_orders o (actual rows=40 loops=10)
              Index Cond: (customer_id = c.id)
              Heap Fetches: 0
~~~

The EXISTS list, the inflated counts, the SQLite plans and the per-customer totals were run the same way on SQLite; the whole-table plans were run on PostgreSQL 16.15 with the same setup, several times, with identical output.

## Common Pitfalls

- **Filtering with a JOIN and then patching the duplicates with DISTINCT.** It works, but it builds every matching pair first; write \`EXISTS\` when you only need the filter.
- **Aggregating over a filtering join.** \`COUNT(*)\` and \`SUM\` count matches, not outer rows; the North region showed 6 instead of 2.
- **No index on the foreign key column.** Without \`orders(customer_id)\` the early exit still has to scan to find the first match.
- **Treating "EXISTS is faster" as a law.** SQLite planned \`DISTINCT c.id, c.name\` over the join without any de-duplication structure, and on a unique join key there is no fan-out at all. Measure.
- **Using EXISTS when you do need the columns.** Then you end up writing a second correlated subquery per column; a JOIN with GROUP BY is clearer and usually faster.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The core difference:</strong> <span style="color:#f0e2c8;">A JOIN returns one row per matching pair. A customer with 40 orders becomes 40 rows, and to list customers you must collapse them again with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DISTINCT</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXISTS</code> is a <strong style="color:#ffca28;">semi join</strong>: it only asks whether at least one match exists.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why EXISTS can be faster:</strong> <span style="color:#f0e2c8;">A semi join can stop at the first match. On PostgreSQL 16, for 10 customers with 40 orders each, the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXISTS</code> plan read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rows=1</code> per index probe while the JOIN read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rows=40</code>, producing 400 rows that a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashAggregate</code> then reduced back to 10.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Correctness too:</strong> <span style="color:#f0e2c8;">Fan-out does not only cost time: if the join is only there to filter, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(*)</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SUM</code> over it is inflated. On our data the JOIN counted 6 North customers when there are 2 with orders.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Not always faster:</strong> <span style="color:#f0e2c8;">Optimizers know semi joins well, and SQLite needed no extra de-duplication for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DISTINCT c.id, c.name</code> because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">c.id</code> is the primary key. With a unique join key there is no fan-out at all. So I check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXPLAIN ANALYZE</code>, not folklore.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Rule of thumb:</strong> <span style="color:#f0e2c8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXISTS</code> (or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IN</code>) when you only filter by the other table; use a JOIN when you need its columns. Make sure the foreign key column is indexed either way.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can the optimizer turn a JOIN + DISTINCT into a semi join for you?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not in the runs for this page: PostgreSQL 16 kept a full join followed by a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashAggregate</code>. It cannot assume you do not care about the duplicates. Writing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXISTS</code> states the intent, which gives the planner more freedom.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does MySQL do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">MySQL turns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IN</code> and, since 8.0.16, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXISTS</code> subqueries into semijoins and picks a strategy by cost, such as FirstMatch, which stops at the first matching row, LooseScan, Materialization or Duplicate Weedout. Not run here; it is in the MySQL manual.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is IN any different from EXISTS here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a positive existence check they are two spellings of the same semi join; PostgreSQL gave them identical plans in the runs for the sibling question. The difference that matters is with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT IN</code> and NULLs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is a JOIN the right choice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you need columns or aggregates from the other table, like the order count and total per customer, or when the join is on a unique key so each outer row matches at most once.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What index makes EXISTS fast?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An index on the inner correlation column, here <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">orders(customer_id)</code>. With it each probe is an index lookup that stops at the first entry; in PostgreSQL it was even an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Index Only Scan</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Heap Fetches: 0</code> after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">VACUUM</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Fan-out | One row matching several rows across a join and appearing once per match |
| Semi join | Returns each outer row at most once if a match exists, no inner columns |
| Short-circuit (early exit) | Stopping the search for the current outer row after the first match |
| Nested Loop Semi Join | PostgreSQL node that probes the inner side per outer row and stops at the first match |

**Conclusion:** EXISTS can outperform a JOIN for existence checks because it is a semi join: it needs only one matching row per outer row, can stop there, and never multiplies the outer rows, so no \`DISTINCT\` is needed afterwards. On PostgreSQL 16 the difference was visible directly in \`EXPLAIN ANALYZE\`: one index entry per customer for \`EXISTS\` against forty, plus a de-duplication step, for JOIN + DISTINCT. The same fan-out also inflates counts and sums, which makes \`EXISTS\` the correct choice for filtering, not just the fast one. It is not magic, though: with a unique join key, or when you need the other table's columns, a JOIN is right, and the plan, not folklore, decides which is faster.`,
    examples: [
      {
        label: `Fan-out: a JOIN returns one row per matching order, so Asha appears four times`,
        code: `SELECT c.id, c.name, o.id AS order_id
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
ORDER BY c.id, o.id;`,
      },
      {
        label: `Rows produced: the JOIN makes 8, DISTINCT shrinks them to 3, EXISTS returns 3 directly`,
        code: `SELECT
  (SELECT COUNT(*)
   FROM customers AS c JOIN orders AS o ON o.customer_id = c.id) AS join_rows,
  (SELECT COUNT(*) FROM (
     SELECT DISTINCT c.id, c.name
     FROM customers AS c JOIN orders AS o ON o.customer_id = c.id)) AS after_distinct,
  (SELECT COUNT(*)
   FROM customers AS c
   WHERE EXISTS (SELECT 1 FROM orders AS o WHERE o.customer_id = c.id)) AS exists_rows;`,
      },
      {
        label: `PostgreSQL: EXISTS becomes a Nested Loop Semi Join that reads 1 index entry per customer`,
        code: `CREATE TABLE many_customers AS
  SELECT g AS id, 'c' || g AS name FROM generate_series(1, 1000) AS g;
CREATE TABLE many_orders AS
  SELECT g AS id, (g % 500) + 1 AS customer_id FROM generate_series(1, 20000) AS g;
ALTER TABLE many_customers ADD PRIMARY KEY (id);
CREATE INDEX many_orders_customer_idx ON many_orders (customer_id);
VACUUM ANALYZE many_customers;
VACUUM ANALYZE many_orders;

EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT c.id, c.name
FROM many_customers AS c
WHERE c.id <= 10
  AND EXISTS (SELECT 1 FROM many_orders AS o WHERE o.customer_id = c.id);`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: JOIN + DISTINCT reads all 40 orders per customer, then de-duplicates 400 rows`,
        code: `CREATE TABLE many_customers AS
  SELECT g AS id, 'c' || g AS name FROM generate_series(1, 1000) AS g;
CREATE TABLE many_orders AS
  SELECT g AS id, (g % 500) + 1 AS customer_id FROM generate_series(1, 20000) AS g;
ALTER TABLE many_customers ADD PRIMARY KEY (id);
CREATE INDEX many_orders_customer_idx ON many_orders (customer_id);
VACUUM ANALYZE many_customers;
VACUUM ANALYZE many_orders;

EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT DISTINCT c.id, c.name
FROM many_customers AS c
JOIN many_orders AS o ON o.customer_id = c.id
WHERE c.id <= 10;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `How do you update a table based on another table?`,
    difficulty: "medium",
    seoDescription: `Update from another table with a correlated subquery plus WHERE EXISTS, UPDATE ... FROM, UPDATE JOIN or MERGE, and avoid NULLs and duplicates. All run.`,
    description: `**Question presented to candidate:**
"A supplier sends a file of new prices, which we load into a \`price_updates\` table keyed by SKU. Write the statement that updates \`products.price\` from it. Then tell me what happens to products that are not in the file, and what happens if the file lists the same SKU twice."

**What a strong answer should cover:**
- The portable form: \`SET col = (correlated subquery)\` together with \`WHERE EXISTS (same match)\`, so unmatched rows are left alone
- The join forms per engine: \`UPDATE ... FROM\` (PostgreSQL, SQLite 3.33+, and SQL Server with its own variant), \`UPDATE t JOIN s ON ... SET\` (MySQL), and \`MERGE\` (PostgreSQL 15+, SQL Server, Oracle)
- Without the \`WHERE EXISTS\` guard the correlated form sets every unmatched row to NULL
- Duplicate source rows: \`UPDATE ... FROM\` silently picks an arbitrary match, \`MERGE\` raises an error in PostgreSQL; de-duplicate the source first (ROW_NUMBER or DISTINCT ON)
- Safety: run it in a transaction, check the affected row count or \`RETURNING\`, and skip no-op updates with \`IS DISTINCT FROM\`

**Clarifying questions expected:**
- Which database and version? The syntax differs more here than almost anywhere else in SQL
- Can a SKU appear more than once in the file, and if so which row wins?
- Should SKUs missing from \`products\` be inserted (an upsert) or ignored?

**Code / implementation expected:** Yes — one portable UPDATE and one join-style UPDATE, with the result checked by a SELECT.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price NUMERIC,
  updated DATE
);
CREATE TABLE price_updates (
  sku TEXT NOT NULL,
  new_price NUMERIC NOT NULL,
  effective DATE NOT NULL
);
INSERT INTO products (id, sku, name, price, updated) VALUES
  (1, 'A-100', 'Kettle', 30, '2024-01-01'),
  (2, 'B-200', 'Toaster', 45, '2024-01-01'),
  (3, 'C-300', 'Blender', 80, '2024-01-01'),
  (4, 'D-400', 'Mixer', 120, '2024-01-01'),
  (5, 'E-500', 'Grill', 95, '2024-01-01');
INSERT INTO price_updates (sku, new_price, effective) VALUES
  ('A-100', 27, '2024-03-01'),
  ('C-300', 85, '2024-03-01'),
  ('E-500', 89, '2024-03-01'),
  ('Z-999', 10, '2024-03-01');
\`\`\``,
    answer: `**Target Audience:** Developers who can write a simple UPDATE and now need to drive it from another table, such as a staging import; beginners who want the engine differences laid out.
**Difficulty:** Medium
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15, both run for this page. MySQL and SQL Server syntax is cited from their manuals and was not run here.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and error message below was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

A shop keeps its price tags on the shelves. One morning the supplier emails a sheet: *Kettle now 27, Blender now 85, Grill now 89, and something called Z-999 at 10.* The shop assistant walks the shelves with the sheet.

A good assistant changes the Kettle, Blender and Grill tags, leaves the Toaster and Mixer alone because they are not on the sheet, and ignores Z-999 because the shop does not stock it.

A careless assistant reads the instruction "set every tag to the price on the sheet" literally. For the Toaster the sheet has no price, so they write a blank tag. Now the Toaster and Mixer have no price at all.

And if the sheet lists the Kettle twice, at 27 and at 25, which one wins? A good assistant asks; a careless one picks whichever line they happened to read last.

Updating one table from another is exactly this job, and the three traps in the story (blank tags, ignored extras, duplicate lines) are the three things an interviewer will probe.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which database and version? | The join syntax differs between PostgreSQL, SQLite, MySQL and SQL Server, and SQLite only has \`UPDATE ... FROM\` since 3.33.0 |
| Can a key appear twice in the source? | Decides whether you must de-duplicate, and which row should win |
| What should happen to target rows not in the source? | Usually "leave alone", which is what the WHERE guard is for |
| Should source rows with no target be inserted? | Then it is an upsert or MERGE, not just an UPDATE |
| How many rows? | Millions of rows means batching, locking and plan checks |

## 3. The Portable Way: Correlated Subquery Plus WHERE EXISTS

Standard SQL has no join in UPDATE, but every engine supports a subquery in \`SET\`. The subquery is **correlated**: it refers to the row being updated, \`products.sku\` (see [What is a subquery and what is a correlated subquery?](/interview-question/what-is-a-subquery-and-what-is-a-correlated-subquery)).

~~~sql
UPDATE products
SET (price, updated) = (
  SELECT u.new_price, u.effective
  FROM price_updates AS u
  WHERE u.sku = products.sku
)
WHERE EXISTS (SELECT 1 FROM price_updates AS u WHERE u.sku = products.sku);

SELECT changes() AS rows_changed;
SELECT id, sku, name, price, updated FROM products ORDER BY id;
~~~

~~~text
rows_changed
3

id | sku | name | price | updated
1 | A-100 | Kettle | 27 | 2024-03-01
2 | B-200 | Toaster | 45 | 2024-01-01
3 | C-300 | Blender | 85 | 2024-03-01
4 | D-400 | Mixer | 120 | 2024-01-01
5 | E-500 | Grill | 89 | 2024-03-01
~~~

📌 **Interview term: correlated update** — an UPDATE whose SET (and usually WHERE) uses a subquery that refers to the row being updated, so the new value is looked up per row.

Three rows changed; Toaster and Mixer kept their prices; Z-999 was ignored because UPDATE never creates rows. \`changes()\` is SQLite's function for "rows affected by the last statement"; PostgreSQL reports it as the \`UPDATE 3\` command tag.

The \`SET (price, updated) = (SELECT ...)\` row-value form assigns two columns from one subquery. It ran on both SQLite 3.45 and PostgreSQL 16 for this page. On engines without it, repeat the subquery once per column.

📌 **Interview term: WHERE EXISTS guard** — the \`WHERE EXISTS (same match)\` clause that restricts the UPDATE to rows that have a source row. Without it, see section 6.

## 4. The Join Way: UPDATE ... FROM

Most engines also let you join the source into the UPDATE, which is shorter and lets the planner use a hash join instead of a lookup per row.

📌 **Interview term: UPDATE ... FROM** — a non-standard extension where the FROM clause lists extra tables and the WHERE clause joins them to the target; each target row that joins is updated using values from the joined row.

~~~sql
UPDATE products
SET price = u.new_price,
    updated = u.effective
FROM price_updates AS u
WHERE u.sku = products.sku;

SELECT id, sku, name, price, updated FROM products ORDER BY id;
~~~

~~~text
id | sku | name | price | updated
1 | A-100 | Kettle | 27 | 2024-03-01
2 | B-200 | Toaster | 45 | 2024-01-01
3 | C-300 | Blender | 85 | 2024-03-01
4 | D-400 | Mixer | 120 | 2024-01-01
5 | E-500 | Grill | 89 | 2024-03-01
~~~

Same result as the portable form, and unmatched rows are untouched automatically, because a target row that does not join is not updated. The same statement ran unchanged on PostgreSQL 16. SQLite added it in version 3.33.0, "following the PostgreSQL syntax", per the [SQLite 3.33.0 release log](https://sqlite.org/releaselog/3_33_0.html).

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="Each products row is matched to price_updates on sku; matched rows get the new price, unmatched rows are left alone, and Z-999 in the source matches nothing">
  <defs>
    <marker id="sql05q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="240" height="40" rx="8"/>
  <text class="d-text" x="140" y="46" text-anchor="middle">price_updates (source)</text>
  <rect class="d-box" x="20" y="80" width="240" height="36" rx="6"/>
  <text class="d-text" x="140" y="104" text-anchor="middle">A-100 to 27</text>
  <rect class="d-box" x="20" y="136" width="240" height="36" rx="6"/>
  <text class="d-text" x="140" y="160" text-anchor="middle">C-300 to 85</text>
  <rect class="d-box-muted" x="20" y="192" width="240" height="36" rx="6"/>
  <text class="d-sub" x="140" y="216" text-anchor="middle">Z-999 matches nothing</text>
  <rect class="d-box-muted" x="480" y="20" width="260" height="40" rx="8"/>
  <text class="d-text" x="610" y="46" text-anchor="middle">products (target)</text>
  <rect class="d-box-accent" x="480" y="80" width="260" height="36" rx="6"/>
  <text class="d-text" x="610" y="104" text-anchor="middle">A-100 Kettle: 30 to 27</text>
  <rect class="d-box-accent" x="480" y="136" width="260" height="36" rx="6"/>
  <text class="d-text" x="610" y="160" text-anchor="middle">C-300 Blender: 80 to 85</text>
  <rect class="d-box" x="480" y="192" width="260" height="36" rx="6"/>
  <text class="d-sub" x="610" y="216" text-anchor="middle">B-200 Toaster: unchanged</text>
  <path class="d-edge-accent" d="M 262 98 L 474 98" marker-end="url(#sql05q5-arrow)"/>
  <path class="d-edge-accent" d="M 262 154 L 474 154" marker-end="url(#sql05q5-arrow)"/>
  <text class="d-sub" x="368" y="84" text-anchor="middle">ON sku</text>
</svg>

Rows on the left that match a product update it; Z-999 matches nothing and is ignored, and products with no row on the left keep their values.

### The same idea in other engines (not run here)

| Engine | Syntax shape | Source |
| :--- | :--- | :--- |
| PostgreSQL | \`UPDATE products SET price = u.new_price FROM price_updates u WHERE u.sku = products.sku\` | run for this page |
| SQLite 3.33+ | same as PostgreSQL | run for this page |
| MySQL | \`UPDATE products p JOIN price_updates u ON u.sku = p.sku SET p.price = u.new_price\` | [MySQL 8.0 UPDATE manual](https://dev.mysql.com/doc/refman/8.0/en/update.html), multiple-table syntax |
| SQL Server | \`UPDATE p SET p.price = u.new_price FROM products p JOIN price_updates u ON u.sku = p.sku\` | [UPDATE (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/queries/update-transact-sql) |

The MySQL manual also notes that a multiple-table UPDATE cannot use \`ORDER BY\` or \`LIMIT\`.

**Do not repeat the target table in FROM** (PostgreSQL and SQLite). SQL Server's habit of writing the target again in FROM does something very different here:

~~~sql
UPDATE products
SET price = u.new_price
FROM products AS p
JOIN price_updates AS u ON u.sku = p.sku;

SELECT id, sku, price FROM products ORDER BY id;
~~~

~~~text
id | sku | price
1 | A-100 | 89
2 | B-200 | 89
3 | C-300 | 89
4 | D-400 | 89
5 | E-500 | 89
~~~

\`products AS p\` is a second, independent copy of the table, not the row being updated, and nothing links it to the target. Every product, including Toaster and Mixer, got one arbitrary new price (89 on SQLite, 27 on PostgreSQL 16 in the runs for this page).

## 5. MERGE

📌 **Interview term: MERGE** — the SQL-standard statement that matches a source to a target and says what to do \`WHEN MATCHED\` (update or delete) and \`WHEN NOT MATCHED\` (insert). PostgreSQL added it in version 15 and \`RETURNING\` support for it in 17 ([depesz on the PostgreSQL 17 commit](https://www.depesz.com/2024/03/19/waiting-for-postgresql-17-add-returning-support-to-merge/)); SQL Server and Oracle have long had it.

~~~sql
MERGE INTO products AS p
USING price_updates AS u
ON u.sku = p.sku
WHEN MATCHED THEN
  UPDATE SET price = u.new_price, updated = u.effective;

SELECT id, sku, name, price, updated FROM products ORDER BY id;
~~~

On PostgreSQL 16:

~~~text
id | sku | name | price | updated
1 | A-100 | Kettle | 27 | 2024-03-01
2 | B-200 | Toaster | 45 | 2024-01-01
3 | C-300 | Blender | 85 | 2024-03-01
4 | D-400 | Mixer | 120 | 2024-01-01
5 | E-500 | Grill | 89 | 2024-03-01
~~~

For a pure update from another table, MERGE and \`UPDATE ... FROM\` give the same result. MERGE earns its place when you also want to insert the unmatched source rows (an upsert, see [What is an UPSERT?](/interview-question/what-is-an-upsert)) and in how it treats duplicates, below. SQLite has no MERGE.

## 6. Pitfall One: Unmatched Rows Become NULL

Drop the \`WHERE EXISTS\` guard from the portable form:

~~~sql
UPDATE products
SET price = (SELECT u.new_price FROM price_updates AS u WHERE u.sku = products.sku);

SELECT id, sku, name, price FROM products ORDER BY id;
~~~

~~~text
id | sku | name | price
1 | A-100 | Kettle | 27
2 | B-200 | Toaster | NULL
3 | C-300 | Blender | 85
4 | D-400 | Mixer | NULL
5 | E-500 | Grill | 89
~~~

The UPDATE has no WHERE, so it touches all five rows. For Toaster and Mixer the subquery finds nothing, and a scalar subquery with no rows is NULL. Their prices are gone. Identical result on PostgreSQL 16.

If \`price\` had been declared \`NOT NULL\`, the statement would have failed instead, which is far better. On a test table with that constraint, SQLite said \`NOT NULL constraint failed: products.price\` and PostgreSQL 16 said \`null value in column "price" of relation "products" violates not-null constraint\`.

## 7. Pitfall Two: Duplicate Source Rows

Suppose the file lists A-100 twice: 27 effective 2024-03-01 and 25 effective 2024-04-01. Each approach reacts differently.

**UPDATE ... FROM picks one silently.** On SQLite:

~~~sql
INSERT INTO price_updates (sku, new_price, effective)
VALUES ('A-100', 25, '2024-04-01');

UPDATE products SET price = u.new_price
FROM price_updates AS u
WHERE u.sku = products.sku;

SELECT sku, price FROM products ORDER BY id;
~~~

~~~text
sku | price
A-100 | 25
B-200 | 45
C-300 | 85
D-400 | 120
E-500 | 89
~~~

SQLite used 25 in this run; PostgreSQL 16 used 27 for the same statement. Both are allowed: the [SQLite UPDATE documentation](https://sqlite.org/lang_update.html) says the row used is arbitrary and may change between releases or runs, and SQL Server's UPDATE reference says the result is undefined when the FROM clause yields more than one source value per updated row. No error, no warning.

**The correlated subquery form** errors in PostgreSQL (\`more than one row returned by a subquery used as an expression\`) but SQLite takes the first row it finds:

~~~text
sku | price
A-100 | 27
B-200 | 45
C-300 | 85
D-400 | 120
E-500 | 89
~~~

**MERGE refuses.** PostgreSQL 16:

~~~text
ERROR:  MERGE command cannot affect row a second time
HINT:  Ensure that not more than one source row matches any one target row.
~~~

**The fix is to decide which row wins and de-duplicate the source first.** Portable, with a window function (runs on SQLite and PostgreSQL alike):

~~~sql
INSERT INTO price_updates (sku, new_price, effective)
VALUES ('A-100', 25, '2024-04-01');

UPDATE products
SET price = u.new_price,
    updated = u.effective
FROM (
  SELECT sku, new_price, effective,
         ROW_NUMBER() OVER (PARTITION BY sku ORDER BY effective DESC) AS rn
  FROM price_updates
) AS u
WHERE u.sku = products.sku AND u.rn = 1;

SELECT id, sku, price, updated FROM products ORDER BY id;
~~~

~~~text
id | sku | price | updated
1 | A-100 | 25 | 2024-04-01
2 | B-200 | 45 | 2024-01-01
3 | C-300 | 85 | 2024-03-01
4 | D-400 | 120 | 2024-01-01
5 | E-500 | 89 | 2024-03-01
~~~

On PostgreSQL, \`DISTINCT ON\` is shorter, and \`RETURNING\` shows exactly what changed:

~~~sql
INSERT INTO price_updates (sku, new_price, effective)
VALUES ('A-100', 25, '2024-04-01');

UPDATE products AS p
SET price = latest.new_price,
    updated = latest.effective
FROM (
  SELECT DISTINCT ON (sku) sku, new_price, effective
  FROM price_updates
  ORDER BY sku, effective DESC
) AS latest
WHERE latest.sku = p.sku
RETURNING p.id, p.sku, p.price, p.updated;
~~~

~~~text
id | sku | price | updated
1 | A-100 | 25 | 2024-04-01
3 | C-300 | 85 | 2024-03-01
5 | E-500 | 89 | 2024-03-01
~~~

📌 **Interview term: deterministic update** — an update where each target row matches at most one source row, so the result does not depend on join order. Make the source unique on the join key (a primary key or a de-duplicating subquery) to guarantee it. Finding duplicates is its own question: [How do you find duplicate rows in a table?](/interview-question/how-do-you-find-duplicate-rows-in-a-table).

## 8. Doing It Safely in Production

- **Wrap it in a transaction** and check the row count before \`COMMIT\` (see [When would you use a transaction explicitly?](/interview-question/when-would-you-use-a-transaction-explicitly)). If you expected 3 and it says 5, roll back.
- **Use RETURNING** (PostgreSQL, and SQLite since 3.35.0 per the [SQLite RETURNING docs](https://www2.sqlite.org/lang_returning.html)) to see the changed rows.
- **Skip no-op updates.** In PostgreSQL every updated row writes a new row version even when the value is unchanged. Add \`IS DISTINCT FROM\`, which also handles NULLs correctly:

~~~sql
UPDATE products AS p
SET price = u.new_price, updated = u.effective
FROM price_updates AS u
WHERE u.sku = p.sku
  AND p.price IS DISTINCT FROM u.new_price
RETURNING p.id, p.sku, p.price AS new_price;
~~~

~~~text
id | sku | new_price
1 | A-100 | 27
3 | C-300 | 85
5 | E-500 | 89
~~~

- **Index the source join key** (\`price_updates(sku)\`) for big files, and look at the plan of the equivalent SELECT first.
- **Batch very large updates** by primary key ranges so each transaction holds its row locks briefly.

## 9. Verified: Running the Code

The four examples were run by the project verifier: the first three on sql.js 1.10.2 (SQLite 3.45.0), the last on PostgreSQL 16.15 in a scratch database seeded with the schema above. \`UPDATE ... FROM\`:

~~~text
id | sku | name | price | updated
1 | A-100 | Kettle | 27 | 2024-03-01
2 | B-200 | Toaster | 45 | 2024-01-01
3 | C-300 | Blender | 85 | 2024-03-01
4 | D-400 | Mixer | 120 | 2024-01-01
5 | E-500 | Grill | 89 | 2024-03-01
~~~

The portable correlated form with the guard:

~~~text
rows_changed
3

id | sku | name | price | updated
1 | A-100 | Kettle | 27 | 2024-03-01
2 | B-200 | Toaster | 45 | 2024-01-01
3 | C-300 | Blender | 85 | 2024-03-01
4 | D-400 | Mixer | 120 | 2024-01-01
5 | E-500 | Grill | 89 | 2024-03-01
~~~

The same form without the guard:

~~~text
id | sku | name | price
1 | A-100 | Kettle | 27
2 | B-200 | Toaster | NULL
3 | C-300 | Blender | 85
4 | D-400 | Mixer | NULL
5 | E-500 | Grill | 89
~~~

De-duplicating with \`DISTINCT ON\` and \`RETURNING\` on PostgreSQL:

~~~text
id | sku | price | updated
1 | A-100 | 25 | 2024-04-01
3 | C-300 | 85 | 2024-03-01
5 | E-500 | 89 | 2024-03-01
~~~

The duplicate, self-join and ROW_NUMBER snippets were run the same way on SQLite (and on PostgreSQL 16.15 where the prose quotes its result); MERGE, \`IS DISTINCT FROM\` with \`RETURNING\`, and the error messages were run on PostgreSQL 16.15.

## Common Pitfalls

- **Forgetting the WHERE EXISTS guard** on the correlated form: every unmatched row is set to NULL.
- **Duplicate keys in the source.** \`UPDATE ... FROM\` picks an arbitrary row without complaint (SQLite chose 25, PostgreSQL 27 on the same data); de-duplicate first.
- **Repeating the target table in FROM** on PostgreSQL or SQLite: it becomes an unrelated cross join and every row gets the same value.
- **Assuming the syntax is portable.** MySQL puts the JOIN before SET, SQL Server puts FROM after SET, SQLite before 3.33.0 has no \`UPDATE ... FROM\` at all.
- **Updating without looking first.** Run the join as a SELECT, check the row count, then UPDATE in a transaction.
- **Rewriting unchanged rows.** Add \`IS DISTINCT FROM\` to skip no-op updates and the dead row versions and trigger calls they cause.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Portable answer:</strong> <span style="color:#f0e2c8;">The form that runs everywhere is a correlated subquery in SET plus the same match in WHERE: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SET price = (SELECT new_price FROM price_updates u WHERE u.sku = products.sku) WHERE EXISTS (...)</code>. The WHERE EXISTS is not optional.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Join forms:</strong> <span style="color:#f0e2c8;">Most engines also let you join in the UPDATE. PostgreSQL and SQLite 3.33+ use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UPDATE products SET ... FROM price_updates u WHERE u.sku = products.sku</code>; MySQL writes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UPDATE products p JOIN price_updates u ON ... SET ...</code>; SQL Server uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UPDATE p SET ... FROM products p JOIN price_updates u ON ...</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Unmatched rows:</strong> <span style="color:#f0e2c8;">Without the guard, every product missing from the file gets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">price = NULL</code>, because a scalar subquery with no rows is NULL. With the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UPDATE ... FROM</code> join form, unmatched target rows are simply not updated.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Duplicates:</strong> <span style="color:#f0e2c8;">If the file lists a SKU twice, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UPDATE ... FROM</code> silently uses an arbitrary one, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MERGE</code> in PostgreSQL fails with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cannot affect row a second time</code>, and the subquery form errors in PostgreSQL but takes the first row in SQLite. So I de-duplicate the source first with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROW_NUMBER()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DISTINCT ON</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Safety:</strong> <span style="color:#f0e2c8;">I run it in a transaction, compare the affected row count with what I expect, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RETURNING</code> in PostgreSQL to see the changed rows, and add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IS DISTINCT FROM</code> so unchanged rows are not rewritten.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about rows in the source with no target, like Z-999?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An UPDATE never creates rows, so they are ignored. If they should be inserted, that is an upsert: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INSERT ... ON CONFLICT DO UPDATE</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MERGE ... WHEN NOT MATCHED THEN INSERT</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why add IS DISTINCT FROM to the WHERE?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In PostgreSQL every updated row writes a new row version, fires triggers and creates dead tuples, even when the value is the same. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p.price IS DISTINCT FROM u.new_price</code> skips no-op updates and also treats NULLs correctly, unlike <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;&gt;</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use MERGE instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When one statement must update matches and insert or delete others, or when you want an error rather than a silent pick on duplicate matches. PostgreSQL has had <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MERGE</code> since 15, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RETURNING</code> added in 17.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you update millions of rows safely?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In batches, for example by primary key ranges, each in its own transaction, so locks are short and the work can resume. Index the join key on the source side and check the plan first.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What goes wrong if you list the target table in FROM again?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In PostgreSQL and SQLite, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UPDATE products ... FROM products AS p JOIN ...</code> joins the target to a second, unrelated copy. In the run for this page every product, including the unmatched ones, got the same arbitrary price.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Correlated update | An UPDATE whose SET looks up the new value with a subquery tied to the current row |
| WHERE EXISTS guard | Restricts the UPDATE to rows that have a match in the source |
| UPDATE ... FROM | Non-standard join syntax in UPDATE (PostgreSQL, SQLite 3.33+, SQL Server variant) |
| MERGE | Standard statement with WHEN MATCHED and WHEN NOT MATCHED actions; PostgreSQL 15+ |
| Deterministic update | Each target row matches at most one source row, so the result does not depend on join order |

**Conclusion:** To update a table from another, either look the value up per row with a correlated subquery in SET, guarded by \`WHERE EXISTS\` so unmatched rows keep their values, or join the source into the UPDATE with the engine's syntax: \`UPDATE ... FROM\` in PostgreSQL and SQLite 3.33+, \`UPDATE ... JOIN ... SET\` in MySQL, \`UPDATE ... SET ... FROM ... JOIN\` in SQL Server, or \`MERGE\` where it exists. The statement itself is easy; the interview is about the edges: the missing guard that nulls out Toaster and Mixer, the duplicate SKU that one engine resolves arbitrarily and another rejects, and the habits (transaction, row count, \`RETURNING\`, \`IS DISTINCT FROM\`) that make the update safe to run on real data.`,
    examples: [
      {
        label: `UPDATE ... FROM (PostgreSQL, and SQLite since 3.33.0): join the target to the source and copy columns`,
        code: `UPDATE products
SET price = u.new_price,
    updated = u.effective
FROM price_updates AS u
WHERE u.sku = products.sku;

SELECT id, sku, name, price, updated FROM products ORDER BY id;`,
      },
      {
        label: `Portable form: correlated subquery in SET, guarded by WHERE EXISTS so unmatched rows are untouched`,
        code: `UPDATE products
SET (price, updated) = (
  SELECT u.new_price, u.effective
  FROM price_updates AS u
  WHERE u.sku = products.sku
)
WHERE EXISTS (SELECT 1 FROM price_updates AS u WHERE u.sku = products.sku);

SELECT changes() AS rows_changed;
SELECT id, sku, name, price, updated FROM products ORDER BY id;`,
      },
      {
        label: `The classic bug: the same correlated SET without WHERE EXISTS sets every unmatched price to NULL`,
        code: `UPDATE products
SET price = (SELECT u.new_price FROM price_updates AS u WHERE u.sku = products.sku);

SELECT id, sku, name, price FROM products ORDER BY id;`,
      },
      {
        label: `PostgreSQL: the file lists A-100 twice; DISTINCT ON keeps the latest row, RETURNING shows what changed`,
        code: `INSERT INTO price_updates (sku, new_price, effective)
VALUES ('A-100', 25, '2024-04-01');

UPDATE products AS p
SET price = latest.new_price,
    updated = latest.effective
FROM (
  SELECT DISTINCT ON (sku) sku, new_price, effective
  FROM price_updates
  ORDER BY sku, effective DESC
) AS latest
WHERE latest.sku = p.sku
RETURNING p.id, p.sku, p.price, p.updated;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
];

export default augments;
