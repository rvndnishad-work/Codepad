/**
 * SQL ULTRA — batch 01: Query basics (logical order, joins, WHERE vs HAVING,
 * DISTINCT, CASE). Every example was run by scripts/verify-sql-examples.ts
 * (sql.js 1.10.2 like the page, PostgreSQL 16 for postgres examples); quoted
 * output is that run's output.
 */
import type { SqlUltraAugment } from "./sql-augments.types";

const augments: SqlUltraAugment[] = [
  {
    title: `What is the logical order of execution of a SQL query?`,
    difficulty: "easy",
    seoDescription: `SQL clauses run as FROM, WHERE, GROUP BY, HAVING, SELECT, DISTINCT, ORDER BY, LIMIT, which is why WHERE cannot use aliases or aggregates.`,
    description: `**Question presented to candidate:**
"We write a query starting with SELECT, but the database does not run it top to bottom. Walk me through the order in which the clauses are logically evaluated, and use it to explain why you can use a column alias in ORDER BY but not in WHERE."

**What a strong answer should cover:**
- The logical order: FROM and JOINs, then WHERE, GROUP BY, HAVING, window functions, SELECT, DISTINCT, ORDER BY, and finally LIMIT / OFFSET
- Consequences: WHERE cannot see aggregates or SELECT aliases, HAVING filters groups, window functions cannot be filtered in the same query level, ORDER BY can use aliases
- The difference between this **logical** order (what the query means) and the **physical** plan (what the engine actually does, such as pushing a filter into a scan)
- Engine differences: SQLite and MySQL accept some aliases where the standard and PostgreSQL do not
- The fix when you need a later value earlier: wrap the query in a subquery or CTE

**Code / implementation expected:** Optional — explain with one grouped query, ideally showing the alias error and the subquery fix.

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
  salary INTEGER NOT NULL,
  hired DATE NOT NULL
);
INSERT INTO departments (id, name) VALUES (1, 'Engineering'), (2, 'Sales'), (3, 'Support');
INSERT INTO employees (id, name, dept_id, salary, hired) VALUES
  (1, 'Asha', 1, 120000, '2019-03-01'),
  (2, 'Ben', 1, 95000, '2021-07-15'),
  (3, 'Chen', 1, 88000, '2023-01-09'),
  (4, 'Dara', 2, 70000, '2020-05-20'),
  (5, 'Eli', 2, 64000, '2022-11-02'),
  (6, 'Fay', 2, 58000, '2024-02-12'),
  (7, 'Gus', 3, 52000, '2018-09-30'),
  (8, 'Hana', 3, 49000, '2023-06-18');
\`\`\``,
    answer: `**Target Audience:** Beginners who can write a simple SELECT and want to understand why some queries fail with "column does not exist".
**Difficulty:** Easy
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15. MySQL and SQL Server differences are noted where they matter.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and error message shown was produced by actually running the query; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

Think of a cooking recipe card. The title at the top says "Chocolate cake, cut into 8 slices, served on a plate". That is the first thing you read, but it is the last thing that happens. First you fetch ingredients from the cupboard, throw away the bad eggs, mix things into bowls, discard a bowl that did not rise, and only then cut, plate and serve.

A SQL query is written the same way: \`SELECT\` (the plating) is written first, but it is evaluated after the rows have been fetched (\`FROM\`), filtered (\`WHERE\`), grouped (\`GROUP BY\`) and filtered again (\`HAVING\`). Once you know that order, a whole family of errors stops being mysterious:

- Why does \`WHERE total > 100\` say the column does not exist, when \`total\` is right there in my SELECT?
- Why can I not write \`WHERE COUNT(*) > 1\`?
- Why does \`WHERE RANK() OVER (...) = 1\` fail?

They all have the same answer: that clause runs **before** the thing it refers to has been computed.

## 2. The Logical Order, Step by Step

📌 **Interview term: declarative language** — you describe the result you want, and the database decides how to compute it. SQL is declarative; the clause order you type is grammar, not a sequence of instructions.

📌 **Interview term: logical query processing order** — the order in which the clauses are defined to take effect, which decides what each clause can see. It is the standard way to reason about a query's meaning.

<svg class="iq-diagram" width="100%" viewBox="0 0 780 300" role="img" aria-label="The logical order of a SQL query in eight steps, from FROM and JOIN to LIMIT">
  <defs>
    <marker id="sql01q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="160" height="76" rx="10"/>
  <text class="d-text" x="100" y="72" text-anchor="middle">1. FROM / JOIN</text>
  <text class="d-sub" x="100" y="96" text-anchor="middle">build the row set</text>
  <rect class="d-box" x="215" y="40" width="160" height="76" rx="10"/>
  <text class="d-text" x="295" y="72" text-anchor="middle">2. WHERE</text>
  <text class="d-sub" x="295" y="96" text-anchor="middle">filter rows</text>
  <rect class="d-box" x="410" y="40" width="160" height="76" rx="10"/>
  <text class="d-text" x="490" y="72" text-anchor="middle">3. GROUP BY</text>
  <text class="d-sub" x="490" y="96" text-anchor="middle">rows become groups</text>
  <rect class="d-box" x="605" y="40" width="160" height="76" rx="10"/>
  <text class="d-text" x="685" y="72" text-anchor="middle">4. HAVING</text>
  <text class="d-sub" x="685" y="96" text-anchor="middle">filter groups</text>
  <rect class="d-box-accent" x="20" y="196" width="160" height="76" rx="10"/>
  <text class="d-text" x="100" y="228" text-anchor="middle">5. SELECT</text>
  <text class="d-sub" x="100" y="252" text-anchor="middle">windows, aliases</text>
  <rect class="d-box" x="215" y="196" width="160" height="76" rx="10"/>
  <text class="d-text" x="295" y="228" text-anchor="middle">6. DISTINCT</text>
  <text class="d-sub" x="295" y="252" text-anchor="middle">drop duplicates</text>
  <rect class="d-box" x="410" y="196" width="160" height="76" rx="10"/>
  <text class="d-text" x="490" y="228" text-anchor="middle">7. ORDER BY</text>
  <text class="d-sub" x="490" y="252" text-anchor="middle">sort, aliases ok</text>
  <rect class="d-box" x="605" y="196" width="160" height="76" rx="10"/>
  <text class="d-text" x="685" y="228" text-anchor="middle">8. LIMIT</text>
  <text class="d-sub" x="685" y="252" text-anchor="middle">keep the first N</text>
  <path class="d-edge" d="M 182 78 L 211 78" marker-end="url(#sql01q1-arrow)"/>
  <path class="d-edge" d="M 377 78 L 406 78" marker-end="url(#sql01q1-arrow)"/>
  <path class="d-edge" d="M 572 78 L 601 78" marker-end="url(#sql01q1-arrow)"/>
  <path class="d-edge-accent" d="M 685 118 L 685 156 L 100 156 L 100 192" marker-end="url(#sql01q1-arrow)"/>
  <path class="d-edge" d="M 182 234 L 211 234" marker-end="url(#sql01q1-arrow)"/>
  <path class="d-edge" d="M 377 234 L 406 234" marker-end="url(#sql01q1-arrow)"/>
  <path class="d-edge" d="M 572 234 L 601 234" marker-end="url(#sql01q1-arrow)"/>
</svg>

The first row of the diagram works on raw rows and groups; the arrow drops into the second row, where \`SELECT\` finally produces the output columns and their aliases. Everything in the second row can see those aliases; nothing in the first row can.

| Step | Clause | What it does | What it can see |
| :--- | :--- | :--- | :--- |
| 1 | \`FROM\`, \`JOIN ... ON\` | Builds one big row set from the tables | Table columns |
| 2 | \`WHERE\` | Keeps or drops **individual rows** | Table columns, no aggregates, no SELECT aliases |
| 3 | \`GROUP BY\` | Collapses rows into **groups**, one output row per group | Table columns |
| 4 | \`HAVING\` | Keeps or drops **whole groups** | Grouped columns and aggregates |
| 5 | Window functions, then \`SELECT\` | Computes the output expressions and gives them aliases | Everything above |
| 6 | \`DISTINCT\` | Removes duplicate output rows | The SELECT list |
| 7 | \`ORDER BY\` | Sorts the result | SELECT aliases and (usually) table columns |
| 8 | \`LIMIT\` / \`OFFSET\` (or \`FETCH FIRST\`) | Keeps a slice of the sorted rows | The sorted result |

📌 **Interview term: column alias** — the name you give an output column with \`AS\`, like \`AVG(salary) AS avg_salary\`. It is created in step 5, so only steps 6 to 8 can reliably refer to it.

📌 **Interview term: aggregate function** — a function that turns many rows into one value per group: \`COUNT\`, \`SUM\`, \`AVG\`, \`MIN\`, \`MAX\`. They exist from step 3 onwards, which is exactly why they are legal in \`HAVING\` and illegal in \`WHERE\`. See [How does GROUP BY work with aggregate functions?](/interview-question/how-does-group-by-work-with-aggregate-functions)

## 3. Watching the Steps on Real Data

The first example peels one query apart. The question: "for people hired since 2019, which departments have at least 2 such people, and what is their average salary? Show the top 2 by average salary."

~~~sql
SELECT d.name AS dept, COUNT(*) AS headcount, AVG(e.salary) AS avg_salary
FROM employees AS e
JOIN departments AS d ON d.id = e.dept_id
WHERE e.hired >= '2019-01-01'
GROUP BY d.name
HAVING COUNT(*) >= 2
ORDER BY avg_salary DESC
LIMIT 2;
~~~

What happens, in logical order, on the 8 employees:

1. **FROM / JOIN** pairs each employee with their department: 8 rows.
2. **WHERE** drops Gus (hired 2018-09-30): 7 rows remain.
3. **GROUP BY** makes 3 groups: Engineering (Asha, Ben, Chen), Sales (Dara, Eli, Fay), Support (Hana only).
4. **HAVING** drops Support, whose \`COUNT(*)\` is 1.
5. **SELECT** computes \`dept\`, \`headcount\` and \`avg_salary\` for the 2 surviving groups.
6. **ORDER BY** sorts by the alias \`avg_salary\`, which now exists.
7. **LIMIT 2** keeps both rows.

The example runs the first two stages as their own queries so you can see the intermediate rows, then the full query. Its output, from sql.js:

~~~text
name | dept | salary | hired
Asha | Engineering | 120000 | 2019-03-01
Ben | Engineering | 95000 | 2021-07-15
Chen | Engineering | 88000 | 2023-01-09
Dara | Sales | 70000 | 2020-05-20
Eli | Sales | 64000 | 2022-11-02
Fay | Sales | 58000 | 2024-02-12
Hana | Support | 49000 | 2023-06-18

dept | headcount | avg_salary
Engineering | 3 | 101000
Sales | 3 | 64000
Support | 1 | 49000

dept | headcount | avg_salary
Engineering | 3 | 101000
Sales | 3 | 64000
~~~

Notice that the WHERE filter changed the groups. Without it, Gus would be in Support, giving Support 2 people, and Support would survive HAVING. Filtering rows before grouping and filtering groups after grouping are different questions; the sibling page [What is the difference between WHERE and HAVING?](/interview-question/what-is-the-difference-between-where-and-having) goes deep on that.

A small engine note: \`AVG\` prints as \`101000\` in SQLite (a floating-point value the page shows without decimals) and as \`101000.000000000000\` in PostgreSQL (a \`numeric\`). Same value, different type.

## 4. The Errors the Order Explains

Each of these was run on PostgreSQL 16.15 and on SQLite 3.45.0. PostgreSQL follows the standard closely; SQLite is more permissive about aliases.

### An alias in WHERE

~~~sql
SELECT name, salary * 12 AS yearly FROM employees WHERE yearly > 1000000 ORDER BY name;
~~~

PostgreSQL:

~~~text
ERROR:  column "yearly" does not exist
~~~

\`WHERE\` (step 2) runs before \`SELECT\` (step 5) has created \`yearly\`. Repeat the expression (\`WHERE salary * 12 > 1000000\`) or compute it one level down in a subquery or [CTE](/interview-question/what-is-a-cte-common-table-expression).

SQLite runs the same query and returns Asha, Ben and Chen: it looks the name up in the SELECT list as a fallback. That is a non-standard convenience; do not rely on it if the query may move to another engine. The example "SQLite accepts a SELECT alias" shows it.

### An aggregate in WHERE

~~~sql
SELECT name, salary FROM employees WHERE salary > AVG(salary);
~~~

~~~text
PostgreSQL: ERROR:  aggregate functions are not allowed in WHERE
SQLite:     misuse of aggregate function AVG()
~~~

There are no groups yet in step 2, so there is nothing to average. "Employees paid above the average" needs a subquery: \`WHERE salary > (SELECT AVG(salary) FROM employees)\`. See [What is a subquery and what is a correlated subquery?](/interview-question/what-is-a-subquery-and-what-is-a-correlated-subquery)

### A window function in WHERE

~~~sql
SELECT name, RANK() OVER (ORDER BY salary DESC) AS r FROM employees WHERE r <= 3;
~~~

~~~text
PostgreSQL: ERROR:  column "r" does not exist
SQLite:     misuse of aliased window function r
~~~

Writing the window function itself into \`WHERE\` gives \`window functions are not allowed in WHERE\` (PostgreSQL) and \`misuse of window function RANK()\` (SQLite). Window functions are computed at step 5, after \`WHERE\`, \`GROUP BY\` and \`HAVING\`.

📌 **Interview term: window function** — a function with an \`OVER (...)\` clause that computes a value for each row from a set of related rows, without collapsing them like \`GROUP BY\` does. See [What are window functions?](/interview-question/what-are-window-functions)

The second example shows both halves of this. Inside the Sales filter, \`RANK()\` only ranks the 3 Sales rows (Dara 1, Eli 2, Fay 3), proof that it ran after \`WHERE\`. Then the fix: compute the rank in a derived table and filter on it outside:

~~~sql
SELECT name, dept_id, salary
FROM (
  SELECT name, dept_id, salary,
         RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS pay_rank
  FROM employees
) AS ranked
WHERE pay_rank = 1
ORDER BY dept_id;
~~~

This "compute, then filter one level up" shape is the standard answer for top-N per group; see [Top-N per group with RANK() OVER (PARTITION BY)](/interview-question/top-n-per-group-with-rank-over-partition-by-how-do-you-get-top-2-per-department-).

### An alias inside an ORDER BY expression

\`ORDER BY yearly DESC\` works in both engines. \`ORDER BY yearly + 0 DESC\` fails in PostgreSQL with \`column "yearly" does not exist\`: PostgreSQL resolves a bare output-column name in ORDER BY, but an expression in ORDER BY is resolved against the input columns. SQLite accepts both forms.

### DISTINCT, then ORDER BY on a column that is gone

~~~sql
SELECT DISTINCT dept_id FROM employees ORDER BY salary;
~~~

~~~text
ERROR:  for SELECT DISTINCT, ORDER BY expressions must appear in select list
~~~

\`DISTINCT\` (step 6) has already merged the 3 Engineering rows into one, so there is no single \`salary\` left to sort that row by. PostgreSQL refuses; SQLite returned \`3, 2, 1\` here, quietly picking some salary per group. More in [What does DISTINCT do and what is its cost?](/interview-question/what-does-distinct-do-and-what-is-its-cost)

### Alias rules by engine

| Alias used in | Standard SQL | PostgreSQL 16 (run) | SQLite 3.45 (run) | MySQL (manual) |
| :--- | :--- | :--- | :--- | :--- |
| \`WHERE\` | No | No | Yes | No |
| \`GROUP BY\` | No | Yes (output column name) | Yes | Yes |
| \`HAVING\` | No | No | Yes | Yes |
| \`ORDER BY\` (bare name) | Yes | Yes | Yes | Yes |

PostgreSQL accepted \`GROUP BY dept\` where \`dept\` is the alias of \`d.name\`, but rejected \`HAVING n > 2\` with \`column "n" does not exist\`. The [MySQL manual](https://dev.mysql.com/doc/refman/8.4/en/problems-with-alias.html) documents aliases in GROUP BY, ORDER BY and HAVING, and forbids them in WHERE; that column was not run here.

## 5. Logical Order Is Not Execution Order

📌 **Interview term: query plan (physical plan)** — the concrete steps the engine chooses to compute the result: which index or scan, which join algorithm, in which order. You see it with \`EXPLAIN\`. See [How do you read an EXPLAIN query plan?](/interview-question/how-do-you-read-an-explain-query-plan)

The logical order defines what the answer must be. The optimizer may do the work in any order that gives the same answer. The PostgreSQL example asks for the plan of the grouped query:

~~~text
QUERY PLAN
Limit
  ->  Sort
        Sort Key: (count(*)) DESC
        ->  HashAggregate
              Group Key: d.name
              Filter: (count(*) >= 2)
              ->  Hash Join
                    Hash Cond: (e.dept_id = d.id)
                    ->  Seq Scan on employees e
                          Filter: (hired >= '2019-01-01'::date)
                    ->  Hash
                          ->  Seq Scan on departments d
~~~

Read it from the most indented line upward. The \`hired >= '2019-01-01'\` condition is attached to the **scan** of \`employees\`, before the join, even though logically \`WHERE\` runs after \`FROM\`/\`JOIN\`. That is a legal rewrite called predicate pushdown: filtering early gives the same rows and less work. The \`HAVING\` condition appears as a \`Filter\` on the \`HashAggregate\` node (grouping), and \`Sort\` and \`Limit\` come last, which does match the logical order. On other data or with indexes the planner may pick a different plan; the logical meaning stays the same.

📌 **Interview term: predicate pushdown** — the optimizer moves a filter condition as close to the data source as possible (into a scan, or below a join) so fewer rows flow through the rest of the plan.

One more consequence: because the engine may reorder work, the logical order is **not** a promise about evaluation order inside an expression. \`WHERE x <> 0 AND y / x > 1\` is not guaranteed to check \`x <> 0\` first; the [PostgreSQL docs on expression evaluation](https://www.postgresql.org/docs/16/sql-expressions.html#SYNTAX-EXPRESS-EVAL) recommend a \`CASE\` when order matters. See [What is the CASE expression?](/interview-question/what-is-the-case-expression)

## 6. Verified: Running the Code

The three SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above). The PostgreSQL example was run on PostgreSQL 16.15 in a scratch database with the same schema.

Example 1, the query peeled apart:

~~~text
name | dept | salary | hired
Asha | Engineering | 120000 | 2019-03-01
Ben | Engineering | 95000 | 2021-07-15
Chen | Engineering | 88000 | 2023-01-09
Dara | Sales | 70000 | 2020-05-20
Eli | Sales | 64000 | 2022-11-02
Fay | Sales | 58000 | 2024-02-12
Hana | Support | 49000 | 2023-06-18

dept | headcount | avg_salary
Engineering | 3 | 101000
Sales | 3 | 64000
Support | 1 | 49000

dept | headcount | avg_salary
Engineering | 3 | 101000
Sales | 3 | 64000
~~~

Example 2, window functions after WHERE, and filtering on a rank one level up:

~~~text
name | salary | pay_rank
Dara | 70000 | 1
Eli | 64000 | 2
Fay | 58000 | 3

name | dept_id | salary
Asha | 1 | 120000
Dara | 2 | 70000
Gus | 3 | 52000
~~~

Example 3, SQLite accepting aliases in WHERE and HAVING (both statements fail on PostgreSQL with \`column ... does not exist\`):

~~~text
name | yearly
Asha | 1440000
Ben | 1140000
Chen | 1056000

dept | n
Engineering | 3
Sales | 3
~~~

Example 4, the PostgreSQL plan:

~~~text
QUERY PLAN
Limit
  ->  Sort
        Sort Key: (count(*)) DESC
        ->  HashAggregate
              Group Key: d.name
              Filter: (count(*) >= 2)
              ->  Hash Join
                    Hash Cond: (e.dept_id = d.id)
                    ->  Seq Scan on employees e
                          Filter: (hired >= '2019-01-01'::date)
                    ->  Hash
                          ->  Seq Scan on departments d
~~~

## Common Pitfalls

- **Filtering on an alias in WHERE.** Works by accident in SQLite, fails in PostgreSQL and SQL Server. Repeat the expression or move it into a subquery or CTE.
- **Putting an aggregate condition in WHERE.** \`WHERE COUNT(*) > 1\` is always an error; group conditions go in \`HAVING\`.
- **Filtering on a window function in the same level.** Wrap it: compute \`ROW_NUMBER()\` or \`RANK()\` inside, filter outside.
- **Expecting LIMIT before ORDER BY.** \`LIMIT\` is last; it slices the already-sorted result. Without \`ORDER BY\`, which rows you get is not defined.
- **Thinking the logical order is the execution order.** It defines the result, not the plan; the optimizer pushes filters down and reorders joins. Use \`EXPLAIN\` to see what really runs.
- **Relying on short-circuit evaluation in WHERE.** The engine may evaluate \`AND\` operands in any order; use \`CASE\` to force order.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Declarative:</strong> <span style="color:#f0e2c8;">SQL says what you want, not how. The clauses are written SELECT first, but they are <strong style="color:#ffca28;">logically</strong> evaluated in another order, and that order decides which names each clause can see.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The order:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FROM</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">JOIN</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HAVING</code>, window functions, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DISTINCT</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY</code>, and last <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LIMIT</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OFFSET</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Consequences:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code> runs before grouping, so no aggregates there, and before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT</code>, so no aliases. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HAVING</code> filters groups. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY</code> runs after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT</code>, so it can use aliases.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Window functions:</strong> <span style="color:#f0e2c8;">They are computed after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HAVING</code>, so you cannot filter on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RANK()</code> in the same level. Compute it in a subquery or CTE and filter outside.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Logical vs physical:</strong> <span style="color:#f0e2c8;">This is about meaning, not execution. The optimizer may push a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code> filter into the table scan or reorder joins, as PostgreSQL <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXPLAIN</code> shows, as long as the result is the same. Some engines, like SQLite and MySQL, also accept aliases in places the standard does not.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can I use an alias in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ORDER BY</code> but not in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">WHERE</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY</code> is evaluated after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT</code> has produced the aliased columns, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code> is evaluated before them. PostgreSQL 16 answers <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE yearly &gt; 1000000</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">column "yearly" does not exist</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">DISTINCT</code> sit, and why does PostgreSQL reject <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">SELECT DISTINCT a ... ORDER BY b</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DISTINCT</code> runs after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT</code> and before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY</code>. Once duplicates of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> are merged, a row no longer has one value of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b</code> to sort by, so PostgreSQL raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for SELECT DISTINCT, ORDER BY expressions must appear in select list</code>. SQLite accepts it and picks a value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do I keep only the top earner per department?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compute <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC)</code> in a subquery or CTE, then filter <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE pay_rank = 1</code> in the outer query. A window function in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code> is an error.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the database really run <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">FROM</code> first and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">SELECT</code> later?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only logically. The planner is free to reorder work: in the PostgreSQL plan the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hired</code> filter is applied inside the scan of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">employees</code>, before the join. It must return the same rows the logical order defines.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where do <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">UNION</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">LIMIT</code> fit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each branch of a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION</code> is evaluated through its own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DISTINCT</code>; then the set operation combines them; then a final <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LIMIT</code> apply to the combined result.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Declarative language | You state the result you want; the engine decides how to compute it |
| Logical query processing order | FROM/JOIN, WHERE, GROUP BY, HAVING, window functions, SELECT, DISTINCT, ORDER BY, LIMIT — the order that defines what each clause can see |
| Column alias | A name given to an output column with \`AS\`; created at the SELECT step |
| Aggregate function | \`COUNT\`, \`SUM\`, \`AVG\`, \`MIN\`, \`MAX\`: one value per group, available from GROUP BY onwards |
| Window function | A function with \`OVER (...)\` that computes a per-row value from related rows; evaluated with SELECT, after WHERE and HAVING |
| Query plan (physical plan) | The concrete operations the engine runs, shown by \`EXPLAIN\` |
| Predicate pushdown | Moving a filter closer to the data source so fewer rows flow through the plan |

**Conclusion:** A SQL query is logically evaluated as FROM and JOIN, WHERE, GROUP BY, HAVING, window functions, SELECT, DISTINCT, ORDER BY and LIMIT, even though it is written SELECT first. That single fact explains why WHERE cannot use aggregates, aliases or window functions, why HAVING exists, and why ORDER BY can sort by an alias. When you need a value earlier than its step, compute it in a subquery or CTE and filter one level up. Keep the logical order separate from the physical plan: the optimizer is free to push filters down and reorder joins, and some engines, such as SQLite and MySQL, accept aliases where the standard and PostgreSQL do not.`,
    examples: [
      {
        label: `Peel one query apart: the rows that survive each step`,
        code: `-- Step 1 + 2: FROM / JOIN builds the rows, WHERE drops rows (Gus was hired in 2018)
SELECT e.name, d.name AS dept, e.salary, e.hired
FROM employees AS e
JOIN departments AS d ON d.id = e.dept_id
WHERE e.hired >= '2019-01-01'
ORDER BY e.id;

-- Step 3: GROUP BY turns those 7 rows into one row per department
SELECT d.name AS dept, COUNT(*) AS headcount, AVG(e.salary) AS avg_salary
FROM employees AS e
JOIN departments AS d ON d.id = e.dept_id
WHERE e.hired >= '2019-01-01'
GROUP BY d.name
ORDER BY d.name;

-- Steps 4 to 8: HAVING drops a group, SELECT names the columns,
-- ORDER BY can use the alias, LIMIT keeps the first 2
SELECT d.name AS dept, COUNT(*) AS headcount, AVG(e.salary) AS avg_salary
FROM employees AS e
JOIN departments AS d ON d.id = e.dept_id
WHERE e.hired >= '2019-01-01'
GROUP BY d.name
HAVING COUNT(*) >= 2
ORDER BY avg_salary DESC
LIMIT 2;`,
      },
      {
        label: `Window functions run after WHERE: rank inside a filter, then filter on the rank in an outer query`,
        code: `-- RANK() only sees the rows WHERE let through (the Sales team)
SELECT name, salary, RANK() OVER (ORDER BY salary DESC) AS pay_rank
FROM employees
WHERE dept_id = 2
ORDER BY pay_rank;

-- To filter ON a window result, compute it one level down
SELECT name, dept_id, salary
FROM (
  SELECT name, dept_id, salary,
         RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS pay_rank
  FROM employees
) AS ranked
WHERE pay_rank = 1
ORDER BY dept_id;`,
      },
      {
        label: `SQLite accepts a SELECT alias in WHERE and HAVING (PostgreSQL rejects both)`,
        code: `-- Non-standard: SQLite resolves the alias yearly inside WHERE
SELECT name, salary * 12 AS yearly
FROM employees
WHERE yearly > 1000000
ORDER BY name;

-- Non-standard: SQLite resolves the alias n inside HAVING
SELECT d.name AS dept, COUNT(*) AS n
FROM employees AS e
JOIN departments AS d ON d.id = e.dept_id
GROUP BY dept
HAVING n > 2
ORDER BY dept;`,
      },
      {
        label: `PostgreSQL: the physical plan pushes WHERE into the table scan`,
        code: `EXPLAIN (COSTS OFF)
SELECT d.name AS dept, COUNT(*) AS headcount
FROM employees AS e
JOIN departments AS d ON d.id = e.dept_id
WHERE e.hired >= '2019-01-01'
GROUP BY d.name
HAVING COUNT(*) >= 2
ORDER BY headcount DESC
LIMIT 2;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `What are the different types of SQL joins?`,
    difficulty: "easy",
    seoDescription: `INNER, LEFT, RIGHT, FULL OUTER, CROSS and self joins explained on real tables: what happens to unmatched rows, NULL keys, and row multiplication.`,
    description: `**Question presented to candidate:**
"We have a customers table and an orders table. Some customers never ordered, and a few orders point at a customer that is missing. Walk me through the join types SQL gives you, what each one returns for those rows, and when you would reach for each."

**What a strong answer should cover:**
- INNER JOIN keeps only matching pairs; LEFT / RIGHT OUTER JOIN also keep unmatched rows from one side, filled with NULLs; FULL OUTER JOIN keeps unmatched rows from both sides
- CROSS JOIN is every row paired with every row (a Cartesian product); a self join is a table joined to itself
- Joins multiply rows: a one-to-many join repeats the "one" side once per match, so aggregates and counts must account for it
- NULL join keys never match (NULL = NULL is not true), and unmatched rows are where NULLs appear in the output
- Anti-join and semi-join patterns: LEFT JOIN ... WHERE right.key IS NULL or NOT EXISTS for "rows with no match", EXISTS for "rows with at least one match"
- Engine support: SQLite has RIGHT and FULL OUTER JOIN only since 3.39.0; MySQL has no FULL OUTER JOIN

**Code / implementation expected:** Yes — write an INNER and a LEFT JOIN and say what happens to unmatched rows.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT
);
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER,
  amount INTEGER NOT NULL,
  placed DATE NOT NULL
);
INSERT INTO customers (id, name, city) VALUES
  (1, 'Asha', 'Pune'),
  (2, 'Ben', 'Leeds'),
  (3, 'Chen', 'Pune'),
  (4, 'Dara', NULL);
INSERT INTO orders (id, customer_id, amount, placed) VALUES
  (101, 1, 250, '2026-01-05'),
  (102, 1, 120, '2026-02-11'),
  (103, 2, 90, '2026-02-20'),
  (104, 3, 40, '2026-03-02'),
  (105, 9, 75, '2026-03-04'),
  (106, NULL, 60, '2026-03-09');
\`\`\``,
    answer: `**Target Audience:** Beginners who know SELECT and WHERE on one table and now need data from two tables.
**Difficulty:** Easy
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, which runs the examples on this page) and PostgreSQL 16.15; MySQL and SQL Server notes come from their documentation and are marked as such.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output was produced by actually running the queries; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Picture a school dance with two lists: the students who signed up, and the dance cards with a student number written on each. Some students have two cards, one student has none, and one card has a number nobody recognises, and another card is blank.

Now the teacher asks different questions:

- "Show me each student with their cards." Students without cards are not interesting: **inner join**.
- "Show me every student, and their cards if they have any." Nobody is left out: **left join**.
- "Show me every card, and whose it is if we know." **Right join**.
- "Show me everything, matched where possible." **Full outer join**.
- "Make every possible student and card pair, for a seating chart." **Cross join**.

The data is identical every time. The join type is only the rule for **what to do with the rows that did not find a partner**. That is the whole topic, and our tables are built to show it: Dara has no orders, order 105 points at a customer 9 that does not exist, and order 106 has no customer at all.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 420" role="img" aria-label="Customers on the left matched to orders on the right by customer id, with one customer and two orders unmatched">
  <text class="d-text" x="130" y="30" text-anchor="middle">customers</text>
  <text class="d-text" x="570" y="30" text-anchor="middle">orders</text>
  <rect class="d-box" x="40" y="60" width="180" height="44" rx="8"/>
  <text class="d-text" x="130" y="88" text-anchor="middle">1 Asha</text>
  <rect class="d-box" x="40" y="140" width="180" height="44" rx="8"/>
  <text class="d-text" x="130" y="168" text-anchor="middle">2 Ben</text>
  <rect class="d-box" x="40" y="220" width="180" height="44" rx="8"/>
  <text class="d-text" x="130" y="248" text-anchor="middle">3 Chen</text>
  <rect class="d-box-muted" x="40" y="300" width="180" height="44" rx="8"/>
  <text class="d-text" x="130" y="328" text-anchor="middle">4 Dara</text>
  <rect class="d-box" x="480" y="50" width="180" height="40" rx="8"/>
  <text class="d-text" x="570" y="76" text-anchor="middle">101 for 1</text>
  <rect class="d-box" x="480" y="110" width="180" height="40" rx="8"/>
  <text class="d-text" x="570" y="136" text-anchor="middle">102 for 1</text>
  <rect class="d-box" x="480" y="170" width="180" height="40" rx="8"/>
  <text class="d-text" x="570" y="196" text-anchor="middle">103 for 2</text>
  <rect class="d-box" x="480" y="230" width="180" height="40" rx="8"/>
  <text class="d-text" x="570" y="256" text-anchor="middle">104 for 3</text>
  <rect class="d-box-muted" x="480" y="290" width="180" height="40" rx="8"/>
  <text class="d-text" x="570" y="316" text-anchor="middle">105 for 9</text>
  <rect class="d-box-muted" x="480" y="350" width="180" height="40" rx="8"/>
  <text class="d-text" x="570" y="376" text-anchor="middle">106 for NULL</text>
  <path class="d-edge-accent" d="M 222 82 L 478 70"/>
  <path class="d-edge-accent" d="M 222 82 L 478 130"/>
  <path class="d-edge-accent" d="M 222 162 L 478 190"/>
  <path class="d-edge-accent" d="M 222 242 L 478 250"/>
</svg>

The four accent lines are the matches the \`ON o.customer_id = c.id\` condition finds. The grey boxes are the rows with no partner: they are what the different join types disagree about.

## 2. The Building Block: A Join Condition

📌 **Interview term: join** — combining rows from two tables into wider rows. The \`ON\` clause is a condition tested on each candidate pair; the pair is kept when the condition is **true**.

📌 **Interview term: join key** — the columns compared in the \`ON\` clause, usually a foreign key (\`orders.customer_id\`) against a primary key (\`customers.id\`). See [What is the difference between a primary key and a foreign key?](/interview-question/what-is-the-difference-between-a-primary-key-and-a-foreign-key)

Because the test must be **true**, a NULL key never matches anything: \`NULL = 1\` and even \`NULL = NULL\` are *unknown*, not true. That is why order 106 never pairs with a customer. More on that three-valued logic in [How does SQL handle NULL values?](/interview-question/how-does-sql-handle-null-values)

## 3. INNER JOIN and LEFT JOIN

📌 **Interview term: INNER JOIN** — returns only the pairs where the join condition is true. Plain \`JOIN\` means \`INNER JOIN\`.

📌 **Interview term: LEFT (OUTER) JOIN** — returns every row of the left table; where no right row matches, the right-side columns are NULL. \`OUTER\` is optional.

~~~sql
SELECT c.name, o.id AS order_id, o.amount
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
ORDER BY c.name, o.id;
~~~

The first example runs the inner and the left version side by side:

~~~text
name | order_id | amount
Asha | 101 | 250
Asha | 102 | 120
Ben | 103 | 90
Chen | 104 | 40

name | order_id | amount
Asha | 101 | 250
Asha | 102 | 120
Ben | 103 | 90
Chen | 104 | 40
Dara | NULL | NULL
~~~

The two result sets are identical except for one row: \`Dara | NULL | NULL\`. Inner join dropped her because nothing matched; left join kept her and filled the order columns with NULL. Also notice that Asha appears **twice** in both: she has two orders.

"Left" simply means "the table written before the \`JOIN\` keyword". Swap the tables and a left join keeps the other side.

## 4. RIGHT JOIN and FULL OUTER JOIN

📌 **Interview term: RIGHT (OUTER) JOIN** — the mirror of a left join: every row of the right table is kept. Any right join can be rewritten as a left join by swapping the tables, which is why many teams only write left joins.

📌 **Interview term: FULL OUTER JOIN** — every row from both sides appears at least once: matched pairs, left rows with NULLs on the right, and right rows with NULLs on the left.

~~~text
name | order_id | customer_id
Asha | 101 | 1
Asha | 102 | 1
Ben | 103 | 2
Chen | 104 | 3
NULL | 105 | 9
NULL | 106 | NULL

name | order_id | customer_id
Asha | 101 | 1
Asha | 102 | 1
Ben | 103 | 2
Chen | 104 | 3
NULL | 105 | 9
NULL | 106 | NULL
Dara | NULL | NULL
~~~

The right join keeps the two orphan orders (105 and 106) with a NULL name. The full join adds Dara on top: 7 rows, which is 4 matched pairs plus 1 unmatched customer plus 2 unmatched orders.

Engine support is the classic trap here:

- **SQLite** added \`RIGHT JOIN\` and \`FULL OUTER JOIN\` in [version 3.39.0](https://www.sqlite.org/releaselog/3_39_0.html) (2022-06-25). Older SQLite builds, which still ship in some places, reject them. This page runs 3.45.0.
- **MySQL** has no \`FULL OUTER JOIN\`; the usual emulation is a left join combined with the unmatched rows of a right join through [UNION](/interview-question/what-is-the-difference-between-union-and-union-all). This was not run here.
- **PostgreSQL** and **SQL Server** support all of them.

One detail the run exposed: without \`NULLS LAST\`, the two engines sort the NULL \`order_id\` of Dara differently. Ordered by \`o.id\` alone, SQLite put Dara's row **first** and PostgreSQL put it **last**, because SQLite treats NULL as smaller than any value and PostgreSQL as larger. The example says \`ORDER BY o.id NULLS LAST\` (supported since [SQLite 3.30.0](https://www.sqlite.org/releaselog/3_30_0.html)) so both engines print the same thing.

## 5. CROSS JOIN and Self Join

📌 **Interview term: CROSS JOIN (Cartesian product)** — every row of the left table paired with every row of the right, with no condition. 4 customers by 6 orders gives 24 rows. Useful for generating combinations (every store by every day), dangerous when you forget a join condition. Full page: [What is a CROSS JOIN and when is it useful?](/interview-question/what-is-a-cross-join-and-when-is-it-useful)

📌 **Interview term: self join** — joining a table to itself under two aliases, such as employees to their managers or customers to other customers in the same city. It is not a new join type, just any join where both sides are the same table. Full page: [What is a self join?](/interview-question/what-is-a-self-join)

## 6. Joins Multiply Rows

📌 **Interview term: fan-out (row multiplication)** — in a one-to-many join, each row on the "one" side is repeated once per matching row on the "many" side. Aggregates computed after the join see the repeated rows.

The third example counts:

~~~text
customers | orders | cross_rows | inner_rows | left_rows | full_rows
4 | 6 | 24 | 4 | 5 | 7

name | joined_rows | orders | total
Asha | 2 | 2 | 370
Ben | 1 | 1 | 90
Chen | 1 | 1 | 40
Dara | 1 | 0 | NULL
~~~

Read the first line: inner join gives 4 (the matched pairs), left join 5 (plus Dara), full join 7, cross join 24. The second result shows the counting trap. After a left join, \`COUNT(*)\` counts **joined rows**, so Dara gets 1 even though she has no orders. \`COUNT(o.id)\` counts only non-NULL order ids and gives the honest 0, and \`SUM(o.amount)\` is NULL for her, not 0. The difference between the COUNT forms has its own page: [What is the difference between COUNT(*), COUNT(col), and COUNT(DISTINCT col)?](/interview-question/what-is-the-difference-between-count-count-col-and-count-distinct-col)

Fan-out also explains a common bug: joining customers to orders **and** to support tickets in one query multiplies the two lists against each other, and \`SUM(amount)\` comes out too large. Aggregate each child table in its own subquery first, then join the results.

## 7. Anti-Joins and Semi-Joins

Two questions come up constantly, and neither is a join type keyword:

📌 **Interview term: anti-join** — "rows in A with **no** match in B". Written as \`LEFT JOIN B ... WHERE B.key IS NULL\` or \`WHERE NOT EXISTS (...)\`.

📌 **Interview term: semi-join** — "rows in A with **at least one** match in B", each A row returned once. Written with \`WHERE EXISTS (...)\` or \`IN (...)\`; a plain inner join would repeat Asha for each of her orders.

~~~text
name
Dara

order_id | customer_id
105 | 9
106 | NULL
~~~

Dara is the only customer with no orders. The orphan check finds order 105 (customer 9 does not exist) and order 106 (NULL key). On a real schema a foreign key constraint would stop 105 from being inserted, but it does not stop a NULL key unless the column is also \`NOT NULL\`.

Test a column that **cannot** be NULL in a real match, such as the right table's primary key or the join key itself. Testing a nullable data column like \`o.amount IS NULL\` would also return customers who have an order with a NULL amount.

PostgreSQL recognises the anti-join shape and runs a dedicated operator for it:

~~~text
QUERY PLAN
Hash Right Anti Join
  Hash Cond: (o.customer_id = c.id)
  ->  Seq Scan on orders o
  ->  Hash
        ->  Seq Scan on customers c
~~~

A detail from the run: written as \`WHERE o.id IS NULL\` (testing the orders primary key instead of the join key), PostgreSQL 16 did **not** use the anti join and planned a plain join plus a filter:

~~~text
QUERY PLAN
Hash Right Join
  Hash Cond: (o.customer_id = c.id)
  Filter: (o.id IS NULL)
  ->  Seq Scan on orders o
  ->  Hash
        ->  Seq Scan on customers c
~~~

Both return the same rows; the join-key form (or \`NOT EXISTS\`) let the planner prove the rewrite. On other data the planner may choose different join algorithms. The deeper comparison is in [What is the difference between EXISTS and IN?](/interview-question/what-is-the-difference-between-exists-and-in) and [Why might EXISTS outperform a JOIN for existence checks?](/interview-question/why-might-exists-outperform-a-join-for-existence-checks)

## 8. Choosing a Join

| You want | Use | Unmatched left rows | Unmatched right rows |
| :--- | :--- | :--- | :--- |
| Only rows that have a partner | \`INNER JOIN\` | dropped | dropped |
| All of A, with B where it exists | \`LEFT JOIN\` | kept, B columns NULL | dropped |
| All of B, with A where it exists | \`RIGHT JOIN\` (or swap and use LEFT) | dropped | kept, A columns NULL |
| Everything, reconciling two lists | \`FULL OUTER JOIN\` | kept | kept |
| Every combination | \`CROSS JOIN\` | no condition at all | no condition at all |
| A rows with no B | anti-join: \`NOT EXISTS\` or \`LEFT JOIN ... IS NULL\` | only these | not returned |
| A rows with some B, once each | semi-join: \`EXISTS\` | not returned | not returned |

Two more join-shaped tools have their own pages: [LATERAL joins](/interview-question/what-is-a-lateral-join) (a subquery that can reference the left row, good for top-N per row) and the subtle difference between a filter in \`ON\` and in \`WHERE\` for outer joins, covered in [Does a filter in the ON clause behave differently from WHERE in a LEFT JOIN?](/interview-question/does-a-filter-in-the-on-clause-behave-differently-from-where-in-a-left-join)

## 9. Verified: Running the Code

The four SQLite examples ran as this page runs them (sql.js 1.10.2, SQLite 3.45.0, fresh in-memory database seeded from the schema above); the PostgreSQL example ran on PostgreSQL 16.15 in a scratch database with the same schema.

Example 1, inner vs left:

~~~text
name | order_id | amount
Asha | 101 | 250
Asha | 102 | 120
Ben | 103 | 90
Chen | 104 | 40

name | order_id | amount
Asha | 101 | 250
Asha | 102 | 120
Ben | 103 | 90
Chen | 104 | 40
Dara | NULL | NULL
~~~

Example 2, right and full outer:

~~~text
name | order_id | customer_id
Asha | 101 | 1
Asha | 102 | 1
Ben | 103 | 2
Chen | 104 | 3
NULL | 105 | 9
NULL | 106 | NULL

name | order_id | customer_id
Asha | 101 | 1
Asha | 102 | 1
Ben | 103 | 2
Chen | 104 | 3
NULL | 105 | 9
NULL | 106 | NULL
Dara | NULL | NULL
~~~

Example 3, row counts and fan-out:

~~~text
customers | orders | cross_rows | inner_rows | left_rows | full_rows
4 | 6 | 24 | 4 | 5 | 7

name | joined_rows | orders | total
Asha | 2 | 2 | 370
Ben | 1 | 1 | 90
Chen | 1 | 1 | 40
Dara | 1 | 0 | NULL
~~~

Example 4, anti-joins:

~~~text
name
Dara

order_id | customer_id
105 | 9
106 | NULL
~~~

Example 5, the PostgreSQL anti join plan:

~~~text
QUERY PLAN
Hash Right Anti Join
  Hash Cond: (o.customer_id = c.id)
  ->  Seq Scan on orders o
  ->  Hash
        ->  Seq Scan on customers c
~~~

## Common Pitfalls

- **Filtering the right table in WHERE after a LEFT JOIN.** \`WHERE o.amount > 100\` removes the NULL-padded rows and silently turns the left join into an inner join. Put the condition in \`ON\` if you want to keep unmatched left rows.
- **Counting with COUNT(*) after a LEFT JOIN.** It counts joined rows, so a customer with no orders shows 1. Count a column from the right table instead.
- **Summing across two one-to-many joins.** Joining two child tables at once multiplies their rows; aggregate each one separately first.
- **Using DISTINCT to hide fan-out.** If a join returns duplicates you did not expect, fix the join or use \`EXISTS\`; \`DISTINCT\` hides the symptom and costs a sort or hash.
- **Expecting NULL keys to match.** They never do; use \`IS NOT DISTINCT FROM\` in the \`ON\` clause if you truly want NULL to match NULL.
- **Assuming every engine has every join.** MySQL has no \`FULL OUTER JOIN\`, and SQLite before 3.39.0 had neither \`RIGHT\` nor \`FULL\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What a join is:</strong> <span style="color:#f0e2c8;">A join combines rows of two tables into wider rows, using a condition in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ON</code>. The join type only decides what happens to rows that find <strong style="color:#ffca28;">no match</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Inner and outer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INNER JOIN</code> keeps matched pairs only. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LEFT JOIN</code> also keeps every left row, padding the right side with NULL; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RIGHT JOIN</code> is the mirror; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FULL OUTER JOIN</code> keeps unmatched rows from both sides.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The others:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CROSS JOIN</code> pairs every row with every row, so 4 by 6 gives 24 rows. A self join joins a table to itself under two aliases, like employee to manager.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Row multiplication:</strong> <span style="color:#f0e2c8;">Joins multiply: a customer with 2 orders appears twice. That is why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(*)</code> after a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LEFT JOIN</code> gives 1 for a customer with no orders, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(o.id)</code> gives the honest 0.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Patterns and engines:</strong> <span style="color:#f0e2c8;">Anti-join with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LEFT JOIN ... WHERE right.key IS NULL</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT EXISTS</code>; NULL keys never match. SQLite gained <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RIGHT</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FULL</code> joins in 3.39.0, and MySQL still has no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FULL OUTER JOIN</code>, so you emulate it with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">WHERE</code> on the right table turn my <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">LEFT JOIN</code> into an inner join?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE o.amount &gt; 100</code> runs after the join, and for unmatched rows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">o.amount</code> is NULL, so the comparison is not true and those rows are dropped. Put the condition in the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ON</code> clause to keep them. Full treatment in the ON vs WHERE page.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">LEFT JOIN</code> the same as <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">LEFT OUTER JOIN</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OUTER</code> is optional, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">JOIN</code> on its own means <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INNER JOIN</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does an order with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">customer_id</code> NULL match anything?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ON</code> test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NULL = id</code> is unknown, never true, so order 106 only appears in joins that keep unmatched right rows, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RIGHT</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FULL</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you emulate <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">FULL OUTER JOIN</code> in MySQL?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LEFT JOIN</code> united with the unmatched rows of a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RIGHT JOIN</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LEFT JOIN ... UNION ALL RIGHT JOIN ... WHERE left.key IS NULL</code>. Plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION</code> also works but pays for duplicate removal.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;"><code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">LEFT JOIN ... IS NULL</code> or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">NOT EXISTS</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both mean anti-join. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT EXISTS</code> states the intent directly and is safe with NULLs; PostgreSQL 16 turned both into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Hash Right Anti Join</code> here when the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IS NULL</code> test was on the join key.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Join | Combining rows of two tables into wider rows wherever the \`ON\` condition is true |
| Join key | The columns compared in \`ON\`, usually a foreign key against a primary key |
| INNER JOIN | Only the matching pairs |
| LEFT (OUTER) JOIN | Every left row, with NULLs where the right side had no match |
| RIGHT (OUTER) JOIN | Every right row, with NULLs where the left side had no match |
| FULL OUTER JOIN | Every row from both sides, matched where possible |
| CROSS JOIN (Cartesian product) | Every row paired with every row, no condition |
| Self join | A table joined to itself under two aliases |
| Fan-out (row multiplication) | One-to-many joins repeat the "one" row per match |
| Anti-join | Rows in A with no match in B (\`NOT EXISTS\`, or \`LEFT JOIN ... IS NULL\`) |
| Semi-join | Rows in A with at least one match in B, once each (\`EXISTS\`) |

**Conclusion:** Every join starts from the same idea, pairing rows wherever the \`ON\` condition is true, and the join types differ only in what they do with rows that found no partner: inner drops them, left and right keep one side, full keeps both, and cross join has no condition at all. Two habits separate a strong answer from a memorised one: remembering that joins multiply rows, so counts and sums after a join need care, and knowing the anti-join and semi-join patterns for "has no" and "has some" questions. Mention the engine gaps (no FULL OUTER JOIN in MySQL, RIGHT and FULL only since SQLite 3.39.0) and that NULL keys never match, and you have covered what interviewers probe.`,
    examples: [
      {
        label: `INNER JOIN vs LEFT JOIN: what happens to Dara, who has no orders`,
        code: `-- INNER JOIN: only pairs where the ON condition is true
SELECT c.name, o.id AS order_id, o.amount
FROM customers AS c
INNER JOIN orders AS o ON o.customer_id = c.id
ORDER BY c.name, o.id;

-- LEFT JOIN: every customer, with NULLs where no order matched
SELECT c.name, o.id AS order_id, o.amount
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
ORDER BY c.name, o.id;`,
      },
      {
        label: `RIGHT JOIN and FULL OUTER JOIN (SQLite 3.39.0 and later)`,
        code: `-- RIGHT JOIN: every order, with NULLs where no customer matched
SELECT c.name, o.id AS order_id, o.customer_id
FROM customers AS c
RIGHT JOIN orders AS o ON o.customer_id = c.id
ORDER BY o.id;

-- FULL OUTER JOIN: unmatched rows from both sides
SELECT c.name, o.id AS order_id, o.customer_id
FROM customers AS c
FULL OUTER JOIN orders AS o ON o.customer_id = c.id
ORDER BY o.id NULLS LAST, c.name;`,
      },
      {
        label: `How many rows each join produces, and how a one-to-many join repeats the left row`,
        code: `-- 4 customers, 6 orders: row counts per join type
SELECT
  (SELECT COUNT(*) FROM customers) AS customers,
  (SELECT COUNT(*) FROM orders) AS orders,
  (SELECT COUNT(*) FROM customers CROSS JOIN orders) AS cross_rows,
  (SELECT COUNT(*) FROM customers c JOIN orders o ON o.customer_id = c.id) AS inner_rows,
  (SELECT COUNT(*) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id) AS left_rows,
  (SELECT COUNT(*) FROM customers c FULL JOIN orders o ON o.customer_id = c.id) AS full_rows;

-- After a LEFT JOIN, COUNT(*) counts joined rows; COUNT(o.id) counts real orders
SELECT c.name, COUNT(*) AS joined_rows, COUNT(o.id) AS orders, SUM(o.amount) AS total
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
GROUP BY c.id, c.name
ORDER BY c.id;`,
      },
      {
        label: `Anti-joins: customers with no orders, and orders with no customer`,
        code: `-- Customers who never ordered (LEFT JOIN + IS NULL on the right side)
SELECT c.name
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
WHERE o.id IS NULL
ORDER BY c.name;

-- Orphan orders: the customer is missing or the key is NULL
SELECT o.id AS order_id, o.customer_id
FROM orders AS o
LEFT JOIN customers AS c ON c.id = o.customer_id
WHERE c.id IS NULL
ORDER BY o.id;`,
      },
      {
        label: `PostgreSQL: a LEFT JOIN with IS NULL on the join key becomes an anti join`,
        code: `EXPLAIN (COSTS OFF)
SELECT c.name
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
WHERE o.customer_id IS NULL;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `What is the difference between WHERE and HAVING?`,
    difficulty: "easy",
    seoDescription: `WHERE filters rows before GROUP BY and cannot use aggregates; HAVING filters groups after aggregation. Examples, edge cases and engine differences.`,
    description: `**Question presented to candidate:**
"Both WHERE and HAVING filter rows, so why does SQL need two of them? Using an orders table, show me a query that needs both, and tell me what goes wrong if you put a condition in the wrong one."

**What a strong answer should cover:**
- WHERE filters individual rows **before** grouping; HAVING filters groups **after** GROUP BY and the aggregates are computed
- WHERE cannot use aggregate functions; HAVING is where conditions like \`SUM(amount) > 200\` or \`COUNT(*) >= 2\` go
- Moving a row condition from WHERE to HAVING changes the answer when it is not on a grouped column, and putting a filter in WHERE can remove whole groups (conditional aggregation keeps them)
- HAVING without GROUP BY treats the whole table as one group; a HAVING condition on a grouped column is legal but belongs in WHERE (PostgreSQL pushes it down)
- Engine notes: SQLite allows HAVING without GROUP BY only since 3.39.0; MySQL and SQLite accept SELECT aliases in HAVING, PostgreSQL does not

**Code / implementation expected:** Yes — one GROUP BY query with a WHERE row filter and a HAVING group filter.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer TEXT NOT NULL,
  region TEXT NOT NULL,
  status TEXT NOT NULL,
  amount INTEGER NOT NULL
);
INSERT INTO orders (id, customer, region, status, amount) VALUES
  (1, 'Asha', 'North', 'paid', 300),
  (2, 'Asha', 'North', 'paid', 150),
  (3, 'Asha', 'North', 'refunded', 500),
  (4, 'Ben', 'South', 'paid', 80),
  (5, 'Ben', 'South', 'paid', 60),
  (6, 'Chen', 'North', 'refunded', 220),
  (7, 'Dara', 'South', 'paid', 400),
  (8, 'Dara', 'South', 'paid', 90),
  (9, 'Dara', 'South', 'paid', 30),
  (10, 'Eli', 'North', 'paid', 45);
\`\`\``,
    answer: `**Target Audience:** Beginners who have just met GROUP BY and are unsure which filter goes where.
**Difficulty:** Easy
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, which runs the examples on this page) and PostgreSQL 16.15; MySQL notes come from its manual and are marked.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output and error messages were produced by actually running the queries; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

A teacher has a pile of exam papers and wants to know which classes did well. Two very different filters come up:

1. "Ignore the papers that were handed in late." That is a decision about **each paper**, made before anything is added up.
2. "Only show classes whose average is above 70." That is a decision about **each class**, and it can only be made after the papers are sorted into classes and averaged.

You cannot do the second filter on a single paper: one paper has no "class average". And if you do the first filter after averaging, the late papers have already polluted the averages. SQL has one clause for each moment: \`WHERE\` is the paper filter, \`HAVING\` is the class filter.

## 2. The Core Idea

📌 **Interview term: WHERE clause** — a condition tested on each **row** of the \`FROM\`/\`JOIN\` result. Rows where it is not true are dropped before grouping. It cannot contain aggregate functions.

📌 **Interview term: HAVING clause** — a condition tested on each **group** after \`GROUP BY\` has formed the groups and computed the aggregates. It is where conditions on \`COUNT\`, \`SUM\`, \`AVG\`, \`MIN\` and \`MAX\` go.

📌 **Interview term: aggregate function** — a function that turns the rows of a group into one value (\`COUNT\`, \`SUM\`, \`AVG\`, \`MIN\`, \`MAX\`). See [What are the common aggregate functions?](/interview-question/what-are-the-common-aggregate-functions)

<svg class="iq-diagram" width="100%" viewBox="0 0 800 190" role="img" aria-label="Ten order rows pass WHERE to become eight rows, GROUP BY makes four groups, and HAVING keeps two groups">
  <defs>
    <marker id="sql01q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="150" height="104" rx="10"/>
  <text class="d-text" x="95" y="74" text-anchor="middle">orders</text>
  <text class="d-sub" x="95" y="98" text-anchor="middle">all rows</text>
  <text class="d-text" x="95" y="124" text-anchor="middle">10 rows</text>
  <rect class="d-box-accent" x="225" y="40" width="150" height="104" rx="10"/>
  <text class="d-text" x="300" y="74" text-anchor="middle">WHERE</text>
  <text class="d-sub" x="300" y="98" text-anchor="middle">status = paid</text>
  <text class="d-text" x="300" y="124" text-anchor="middle">8 rows</text>
  <rect class="d-box" x="430" y="40" width="150" height="104" rx="10"/>
  <text class="d-text" x="505" y="74" text-anchor="middle">GROUP BY</text>
  <text class="d-sub" x="505" y="98" text-anchor="middle">customer</text>
  <text class="d-text" x="505" y="124" text-anchor="middle">4 groups</text>
  <rect class="d-box-accent" x="635" y="40" width="150" height="104" rx="10"/>
  <text class="d-text" x="710" y="74" text-anchor="middle">HAVING</text>
  <text class="d-sub" x="710" y="98" text-anchor="middle">SUM &gt; 200</text>
  <text class="d-text" x="710" y="124" text-anchor="middle">2 groups</text>
  <path class="d-edge" d="M 172 92 L 221 92" marker-end="url(#sql01q3-arrow)"/>
  <path class="d-edge" d="M 377 92 L 426 92" marker-end="url(#sql01q3-arrow)"/>
  <path class="d-edge" d="M 582 92 L 631 92" marker-end="url(#sql01q3-arrow)"/>
</svg>

On our 10 orders, the query "paid revenue per customer, over 200" flows exactly like this: \`WHERE\` removes the 2 refunded rows, \`GROUP BY\` makes 4 groups (Asha, Ben, Dara, Eli), and \`HAVING\` keeps the 2 whose paid total is over 200. The full clause order, and why aliases and window functions follow the same logic, is on the sibling page [What is the logical order of execution of a SQL query?](/interview-question/what-is-the-logical-order-of-execution-of-a-sql-query)

| | \`WHERE\` | \`HAVING\` |
| :--- | :--- | :--- |
| Filters | individual rows | groups (one row per group) |
| Runs | before \`GROUP BY\` | after \`GROUP BY\` and aggregation |
| Can use aggregates | no (error) | yes |
| Can use non-grouped columns | yes, any column | only grouped columns or aggregates |
| Without \`GROUP BY\` | normal row filter | whole table is one group |
| Can use an index | yes, often | the aggregate part, no |

## 3. A Query That Needs Both

~~~sql
SELECT customer, COUNT(*) AS orders, SUM(amount) AS total
FROM orders
WHERE status = 'paid'
GROUP BY customer
HAVING SUM(amount) > 200
ORDER BY customer;
~~~

The first example runs it, then runs the same query without the \`WHERE\`:

~~~text
customer | orders | total
Asha | 2 | 450
Dara | 3 | 520

customer | orders | total
Asha | 3 | 950
Chen | 1 | 220
Dara | 3 | 520
~~~

With the \`WHERE\`, Asha's paid total is 300 + 150 = 450 from 2 orders. Without it, her refunded 500 is added and she shows 950 from 3 orders, and Chen appears with a total of 220 made up entirely of a refund. Same \`HAVING\`, different question answered. The order matters: the row filter decided what was inside each group before the group filter looked at the totals.

### What WHERE refuses

~~~sql
SELECT customer, SUM(amount) AS total FROM orders WHERE SUM(amount) > 200 GROUP BY customer;
~~~

~~~text
PostgreSQL: ERROR:  aggregate functions are not allowed in WHERE
SQLite:     misuse of aggregate: SUM()
~~~

Both engines reject it at parse time; at the moment \`WHERE\` runs there are no groups to sum.

## 4. A WHERE Filter Can Delete Whole Groups

This is the subtle half of the question, and it comes up in real reports. "Show every customer and their paid total" is **not** the same as "group the paid orders":

~~~text
customer | paid_total
Asha | 450
Ben | 140
Dara | 520
Eli | 45

customer | paid_total | all_orders
Asha | 450 | 3
Ben | 140 | 2
Chen | 0 | 1
Dara | 520 | 3
Eli | 45 | 1

customer | paid_total
Asha | 450
Ben | 140
Chen | NULL
Dara | 520
Eli | 45
~~~

In the first result Chen is gone. His only order was refunded, so \`WHERE status = 'paid'\` removed his only row, and a group with no rows does not exist. If the report must list every customer, move the condition **inside** the aggregate:

📌 **Interview term: conditional aggregation** — putting the filter inside the aggregate, as \`SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END)\`, so each group is kept and only the matching rows contribute. It is also how you compute several filtered totals in one pass. See [What is the CASE expression?](/interview-question/what-is-the-case-expression) and [How do you pivot rows into columns?](/interview-question/how-do-you-pivot-rows-into-columns)

📌 **Interview term: FILTER clause** — the SQL-standard shorthand \`SUM(amount) FILTER (WHERE status = 'paid')\`. PostgreSQL supports it, and SQLite since [3.30.0](https://www.sqlite.org/releaselog/3_30_0.html). Notice the difference in the run: the \`CASE ... ELSE 0\` version gives Chen \`0\`, the \`FILTER\` version gives \`NULL\`, because \`SUM\` over no rows is NULL. Wrap it in \`COALESCE(..., 0)\` if you want zero; see [What do COALESCE and NULLIF do?](/interview-question/what-do-coalesce-and-nullif-do)

The general rule: a condition in \`WHERE\` decides **which rows exist**; a condition in \`HAVING\` decides **which groups are shown**; a condition inside an aggregate decides **what each group counts**.

## 5. HAVING Without GROUP BY, and Aggregates You Do Not Select

~~~text
orders | total
10 | 1875

customer | total
Asha | 950
Dara | 520
~~~

The first query has no \`GROUP BY\`. Because it uses aggregates, the whole table is one group, and \`HAVING\` decides whether that single row is returned: the total is 1875, so it is. With \`HAVING SUM(amount) > 5000\` the same query returned **no row at all** in both engines, which is different from returning a row with a zero.

SQLite has only allowed this form since [3.39.0](https://www.sqlite.org/releaselog/3_39_0.html) (2022-06-25); older versions rejected a HAVING without a GROUP BY. A \`HAVING\` on a query with no aggregates at all is still rejected:

~~~text
SQLite:     HAVING clause on a non-aggregate query
PostgreSQL: ERROR:  column "orders.customer" must appear in the GROUP BY clause or be used in an aggregate function
~~~

The second query shows that \`HAVING\` may use an aggregate that is not in the \`SELECT\` list: \`MAX(amount) >= 400\` keeps Asha (her refund of 500 counts here) and Dara (400), and only their totals are printed.

## 6. Non-Aggregate Conditions in HAVING

\`HAVING customer <> 'Ben'\` is legal, because \`customer\` is a grouped column: every row of a group has the same value. It gives the same result as the \`WHERE\` version, and PostgreSQL knows that:

~~~text
QUERY PLAN
HashAggregate
  Group Key: customer
  Filter: (sum(amount) > 200)
  ->  Seq Scan on orders
        Filter: (customer <> 'Ben'::text)
~~~

The \`customer <> 'Ben'\` test was moved down to the \`Seq Scan\` (filtering rows before grouping), while only \`sum(amount) > 200\` stayed as a \`Filter\` on the \`HashAggregate\` node. On other data the planner might group by sorting instead of hashing; the pushdown is the point. SQLite's plan for the same query (\`EXPLAIN QUERY PLAN\`) only shows \`SCAN orders\` and \`USE TEMP B-TREE FOR GROUP BY\`, which does not say where the condition is applied, so do not count on every engine doing this rewrite. Write row conditions in \`WHERE\`; it is clearer and never slower.

### Aliases in HAVING

~~~sql
SELECT customer, SUM(amount) AS total FROM orders GROUP BY customer HAVING total > 200;
~~~

PostgreSQL 16 rejects this with \`column "total" does not exist\`; SQLite 3.45 accepts it. The [MySQL manual](https://dev.mysql.com/doc/refman/8.4/en/problems-with-alias.html) documents aliases in \`HAVING\` as an extension (not run here). Repeating \`SUM(amount)\` works everywhere, and the engine computes it once.

## 7. Verified: Running the Code

The three SQLite examples ran as this page runs them (sql.js 1.10.2, SQLite 3.45.0, fresh in-memory database seeded from the schema above); the PostgreSQL example ran on PostgreSQL 16.15 in a scratch database with the same schema. The SQLite results were also run on PostgreSQL and matched.

Example 1, WHERE and HAVING together, then HAVING alone:

~~~text
customer | orders | total
Asha | 2 | 450
Dara | 3 | 520

customer | orders | total
Asha | 3 | 950
Chen | 1 | 220
Dara | 3 | 520
~~~

Example 2, WHERE removing a group vs conditional aggregation vs FILTER:

~~~text
customer | paid_total
Asha | 450
Ben | 140
Dara | 520
Eli | 45

customer | paid_total | all_orders
Asha | 450 | 3
Ben | 140 | 2
Chen | 0 | 1
Dara | 520 | 3
Eli | 45 | 1

customer | paid_total
Asha | 450
Ben | 140
Chen | NULL
Dara | 520
Eli | 45
~~~

Example 3, HAVING without GROUP BY, and on an unselected aggregate:

~~~text
orders | total
10 | 1875

customer | total
Asha | 950
Dara | 520
~~~

Example 4, the PostgreSQL plan with the HAVING condition pushed down:

~~~text
QUERY PLAN
HashAggregate
  Group Key: customer
  Filter: (sum(amount) > 200)
  ->  Seq Scan on orders
        Filter: (customer <> 'Ben'::text)
~~~

## Common Pitfalls

- **Aggregates in WHERE.** \`WHERE COUNT(*) > 1\` is always an error; group conditions belong in \`HAVING\`.
- **Row conditions in HAVING.** Legal for grouped columns, but they read as group logic and not every engine pushes them down. Put them in \`WHERE\`.
- **A WHERE that silently drops groups.** "Every customer with their paid total" needs conditional aggregation; \`WHERE status = 'paid'\` loses customers with no paid orders.
- **Expecting a zero row from HAVING without GROUP BY.** If the condition fails you get no row at all, not a row of zeros.
- **Using a SELECT alias in HAVING.** Works in MySQL and SQLite, fails in PostgreSQL and the standard; repeat the expression.
- **Forgetting NULL.** \`SUM(...) FILTER (...)\` over no rows is NULL, and \`HAVING SUM(x) > 0\` treats NULL as not true, so that group disappears.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One line:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code> filters <strong style="color:#ffca28;">rows</strong> before grouping; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HAVING</code> filters <strong style="color:#ffca28;">groups</strong> after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY</code> has computed the aggregates.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why two clauses:</strong> <span style="color:#f0e2c8;">An aggregate like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SUM(amount)</code> does not exist until the rows are grouped, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE SUM(amount) &gt; 200</code> is an error. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HAVING</code> is the filter that runs late enough to see it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Example:</strong> <span style="color:#f0e2c8;">Paid revenue per customer above 200: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE status = 'paid'</code> removes refunds first, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY customer</code> sums, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HAVING SUM(amount) &gt; 200</code> keeps the big ones. Drop the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code> and refunds change the totals.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Placement rule:</strong> <span style="color:#f0e2c8;">If a condition does not need an aggregate, put it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code>: fewer rows get grouped. PostgreSQL even moves such a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HAVING</code> condition into the scan itself, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code> is where a reader expects it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Edge cases:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HAVING</code> without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY</code> treats the table as one group (SQLite allows that since 3.39.0). A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code> filter can delete whole groups; to keep them, filter inside the aggregate with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CASE</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FILTER</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">HAVING</code> use a column alias from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">SELECT</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not in standard SQL or PostgreSQL 16, which says <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">column "total" does not exist</code>. MySQL and SQLite accept it as an extension. Repeat the aggregate to stay portable.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">HAVING customer &lt;&gt; 'Ben'</code> wrong?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It returns the right rows, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">customer</code> is a grouped column, but it reads as if it depended on the groups. PostgreSQL 16 planned it as a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Filter</code> on the scan, exactly like a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code>. Write it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can I use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">HAVING</code> on a column that is not grouped?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT customer, amount FROM orders HAVING amount &gt; 300</code> fails in PostgreSQL with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">column "orders.customer" must appear in the GROUP BY clause or be used in an aggregate function</code>, and in SQLite with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HAVING clause on a non-aggregate query</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do I count paid and refunded orders per customer in one query?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Conditional aggregation: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END)</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(*) FILTER (WHERE status = 'paid')</code>. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE status = 'paid'</code> would throw the refunded rows away before you could count them.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which is faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Filtering in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code> is usually cheaper, since rows dropped early are never grouped and the condition can use an index. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HAVING</code> is not slower by itself; it simply cannot run before the grouping.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| WHERE clause | Row filter, applied before grouping; no aggregates allowed |
| HAVING clause | Group filter, applied after GROUP BY and aggregation |
| Aggregate function | \`COUNT\`, \`SUM\`, \`AVG\`, \`MIN\`, \`MAX\`: one value per group |
| Conditional aggregation | Filtering inside an aggregate with \`CASE\`, so every group is kept |
| FILTER clause | Standard \`agg(...) FILTER (WHERE ...)\` shorthand for conditional aggregation |

**Conclusion:** WHERE and HAVING are both filters, but they act at different moments. WHERE decides which rows exist before grouping and cannot see aggregates; HAVING decides which groups are shown after GROUP BY has computed them. Put every condition that does not need an aggregate in WHERE, use HAVING for conditions on COUNT, SUM and friends, and remember the third option: when a report must keep every group, move the filter inside the aggregate with CASE or FILTER instead of deleting rows with WHERE.`,
    examples: [
      {
        label: `WHERE drops refunded rows, HAVING drops small customers; without the WHERE the answer changes`,
        code: `-- Paid revenue per customer, only customers whose paid total is over 200
SELECT customer, COUNT(*) AS orders, SUM(amount) AS total
FROM orders
WHERE status = 'paid'
GROUP BY customer
HAVING SUM(amount) > 200
ORDER BY customer;

-- Same HAVING, no WHERE: refunds now count towards the total
SELECT customer, COUNT(*) AS orders, SUM(amount) AS total
FROM orders
GROUP BY customer
HAVING SUM(amount) > 200
ORDER BY customer;`,
      },
      {
        label: `WHERE can remove a whole group; conditional aggregation keeps it`,
        code: `-- WHERE removes Chen entirely: he has no paid rows to group
SELECT customer, SUM(amount) AS paid_total
FROM orders
WHERE status = 'paid'
GROUP BY customer
ORDER BY customer;

-- Filter inside the aggregate instead: every customer stays
SELECT customer,
       SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS paid_total,
       COUNT(*) AS all_orders
FROM orders
GROUP BY customer
ORDER BY customer;

-- Standard FILTER clause (SQLite 3.30.0 and later, PostgreSQL): NULL when nothing matched
SELECT customer, SUM(amount) FILTER (WHERE status = 'paid') AS paid_total
FROM orders
GROUP BY customer
ORDER BY customer;`,
      },
      {
        label: `HAVING without GROUP BY, and HAVING on an aggregate that is not selected`,
        code: `-- No GROUP BY: the whole table is one group
SELECT COUNT(*) AS orders, SUM(amount) AS total
FROM orders
HAVING SUM(amount) > 1000;

-- HAVING may use aggregates that are not in the SELECT list
SELECT customer, SUM(amount) AS total
FROM orders
GROUP BY customer
HAVING MAX(amount) >= 400
ORDER BY customer;`,
      },
      {
        label: `PostgreSQL: a HAVING condition on a grouped column is pushed down into the scan`,
        code: `EXPLAIN (COSTS OFF)
SELECT customer, SUM(amount) AS total
FROM orders
GROUP BY customer
HAVING customer <> 'Ben' AND SUM(amount) > 200;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `What does DISTINCT do and what is its cost?`,
    difficulty: "easy",
    seoDescription: `SELECT DISTINCT removes duplicate rows across the whole select list. See how engines sort or hash to do it, what that costs, and when EXISTS is better.`,
    description: `**Question presented to candidate:**
"What does SELECT DISTINCT actually do, row by row? And when a colleague adds DISTINCT to a slow report query to get rid of duplicates, what does it cost the database, and what would you suggest instead?"

**What a strong answer should cover:**
- DISTINCT removes duplicate **result rows**, comparing the whole SELECT list, not one column; for DISTINCT, NULLs count as equal to each other
- It runs after SELECT and before ORDER BY, which is why PostgreSQL requires ORDER BY expressions to appear in the select list
- Cost: the engine must find duplicates, by sorting (Sort + Unique) or hashing (HashAggregate), using memory proportional to the distinct rows and spilling to disk past \`work_mem\`; an index that already delivers rows in order can avoid that work
- DISTINCT used to hide join fan-out is a smell: EXISTS (a semi-join) or fixing the join is cheaper and more correct
- Related forms: COUNT(DISTINCT col), GROUP BY as an equivalent, UNION vs UNION ALL, and PostgreSQL's DISTINCT ON for "one row per key"

**Code / implementation expected:** Optional — a DISTINCT query and its plan, or a join fixed with EXISTS instead of DISTINCT.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT
);
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  product TEXT NOT NULL,
  amount INTEGER NOT NULL,
  placed DATE NOT NULL
);
INSERT INTO customers (id, name, city) VALUES
  (1, 'Asha', 'Pune'),
  (2, 'Ben', 'Leeds'),
  (3, 'Chen', 'Pune'),
  (4, 'Dara', NULL),
  (5, 'Eli', NULL),
  (6, 'Fay', 'Leeds');
INSERT INTO orders (id, customer_id, product, amount, placed) VALUES
  (1, 1, 'Laptop', 900, '2026-01-04'),
  (2, 1, 'Mouse', 25, '2026-01-04'),
  (3, 1, 'Laptop', 950, '2026-02-10'),
  (4, 2, 'Phone', 600, '2026-01-15'),
  (5, 2, 'Mouse', 25, '2026-03-01'),
  (6, 3, 'Phone', 650, '2026-02-02'),
  (7, 4, 'Mouse', 30, '2026-02-20'),
  (8, 4, 'Mouse', 30, '2026-03-05');
\`\`\``,
    answer: `**Target Audience:** Beginners who use \`SELECT DISTINCT\` and want to know what it really does and why it can make a query slow.
**Difficulty:** Easy
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, which runs the examples on this page) and PostgreSQL 16.15; plans were captured on both. MySQL notes are marked as not run.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output and plans were produced by actually running the queries; the **Verified** section quotes them in full.

## 1. Why This Even Matters — A Story First

A wedding planner has a pile of 300 RSVP cards and needs the list of **towns** guests are coming from, to book hotels. She cannot just read the cards top to bottom and write down each town, because Pune would appear 80 times. She has two options:

- **Sort the cards by town.** Now every Pune card is next to every other Pune card, and she writes down a town only when it changes. That is a lot of shuffling up front.
- **Keep a notepad of towns already written.** For each card, she checks the notepad: new town, write it down; seen it, skip. No shuffling, but the notepad must fit on her desk.

That is exactly what a database does for \`SELECT DISTINCT\`, and those are exactly its two strategies: **sort** or **hash**. The result is tiny, but the work is proportional to the whole pile. That is "the cost of DISTINCT".

## 2. What DISTINCT Does

📌 **Interview term: DISTINCT** — a modifier on \`SELECT\` that removes duplicate rows from the result. Two rows are duplicates when **all** the selected columns are equal.

~~~text
city
NULL
NULL
Leeds
Leeds
Pune
Pune

city
NULL
Leeds
Pune

customer_id | product
1 | Laptop
1 | Mouse
2 | Mouse
2 | Phone
3 | Phone
4 | Mouse
~~~

Three things to notice in the first example:

1. **It is about rows, not a column.** In the third result, customer 1 appears twice (Laptop and Mouse) because the *pair* differs; the second Laptop order of customer 1 disappeared because the pair \`(1, Laptop)\` was already there. Writing \`SELECT DISTINCT(customer_id), product\` changes nothing: both engines returned the same six rows, because the parentheses only wrap the expression.
2. **NULLs collapse into one.** Dara and Eli both have a NULL city, and \`DISTINCT\` returns a single NULL row. That is surprising if you know that \`NULL = NULL\` is not true: for duplicate removal (and \`GROUP BY\`), SQL treats NULLs as **not distinct** from each other. See [How does SQL handle NULL values?](/interview-question/how-does-sql-handle-null-values)
3. **NULL sorting differs by engine.** SQLite printed the NULL row first; PostgreSQL printed the same rows with NULL last (\`Leeds\`, \`Pune\`, \`NULL\`). That is an \`ORDER BY\` difference, not a \`DISTINCT\` one.

📌 **Interview term: IS NOT DISTINCT FROM** — the comparison operator that behaves like \`DISTINCT\` does: it is true when both sides are equal **or** both are NULL. In the run, \`NULL = NULL\` gave NULL while \`NULL IS NOT DISTINCT FROM NULL\` gave true (\`1\` in SQLite, \`t\` in PostgreSQL). SQLite added this operator in [3.39.0](https://www.sqlite.org/releaselog/3_39_0.html).

### Where it sits in the query

\`DISTINCT\` is applied after \`SELECT\` has produced the output rows and before \`ORDER BY\` and \`LIMIT\`. One consequence, from a PostgreSQL 16 run:

~~~sql
SELECT DISTINCT city FROM customers ORDER BY name;
~~~

~~~text
ERROR:  for SELECT DISTINCT, ORDER BY expressions must appear in select list
~~~

Once two Pune customers are merged into one row, that row has no single \`name\` to sort by. SQLite accepted the same shape in our runs and picked a value; that is not portable. The full clause order is on [What is the logical order of execution of a SQL query?](/interview-question/what-is-the-logical-order-of-execution-of-a-sql-query)

## 3. Counting Distinct Values

~~~text
all_rows | non_null_cities | distinct_cities
6 | 4 | 2

distinct_pairs
6
~~~

📌 **Interview term: COUNT(DISTINCT col)** — counts the distinct **non-NULL** values of a column. Here 6 customers, 4 with a city, 2 distinct cities. Unlike \`SELECT DISTINCT\`, the NULL is not counted at all. The three COUNT forms have their own page: [What is the difference between COUNT(*), COUNT(col), and COUNT(DISTINCT col)?](/interview-question/what-is-the-difference-between-count-count-col-and-count-distinct-col)

\`COUNT(DISTINCT customer_id, product)\` is an error in both engines here (SQLite: \`wrong number of arguments to function COUNT()\`; PostgreSQL: \`function count(integer, text) does not exist\`). Counting a \`SELECT DISTINCT\` subquery is the portable way. MySQL accepts a multi-column \`COUNT(DISTINCT a, b)\`, according to third-party references; that was not verified here.

## 4. The Cost: Sort or Hash

The database cannot know a row is a duplicate without comparing it with the rows it has already seen. There are two general ways to do it.

📌 **Interview term: sort-based duplicate elimination (Sort + Unique)** — sort the rows by all the DISTINCT columns, then walk the sorted rows and keep a row only when it differs from the previous one. Sorting costs roughly O(n log n) comparisons on n input rows, and the sort needs memory or temporary disk space.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 330" role="img" aria-label="Sort based DISTINCT: input cities are sorted so duplicates sit next to each other, then the Unique step keeps one of each">
  <defs>
    <marker id="sql01q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="100" y="28" text-anchor="middle">input rows</text>
  <text class="d-text" x="360" y="28" text-anchor="middle">after Sort</text>
  <text class="d-text" x="620" y="28" text-anchor="middle">after Unique</text>
  <rect class="d-box" x="40" y="50" width="120" height="34" rx="6"/>
  <text class="d-text" x="100" y="72" text-anchor="middle">Pune</text>
  <rect class="d-box" x="40" y="94" width="120" height="34" rx="6"/>
  <text class="d-text" x="100" y="116" text-anchor="middle">Leeds</text>
  <rect class="d-box" x="40" y="138" width="120" height="34" rx="6"/>
  <text class="d-text" x="100" y="160" text-anchor="middle">Pune</text>
  <rect class="d-box" x="40" y="182" width="120" height="34" rx="6"/>
  <text class="d-text" x="100" y="204" text-anchor="middle">NULL</text>
  <rect class="d-box" x="40" y="226" width="120" height="34" rx="6"/>
  <text class="d-text" x="100" y="248" text-anchor="middle">NULL</text>
  <rect class="d-box" x="40" y="270" width="120" height="34" rx="6"/>
  <text class="d-text" x="100" y="292" text-anchor="middle">Leeds</text>
  <rect class="d-box" x="300" y="50" width="120" height="34" rx="6"/>
  <text class="d-text" x="360" y="72" text-anchor="middle">Leeds</text>
  <rect class="d-box-muted" x="300" y="94" width="120" height="34" rx="6"/>
  <text class="d-sub" x="360" y="116" text-anchor="middle">Leeds</text>
  <rect class="d-box" x="300" y="138" width="120" height="34" rx="6"/>
  <text class="d-text" x="360" y="160" text-anchor="middle">Pune</text>
  <rect class="d-box-muted" x="300" y="182" width="120" height="34" rx="6"/>
  <text class="d-sub" x="360" y="204" text-anchor="middle">Pune</text>
  <rect class="d-box" x="300" y="226" width="120" height="34" rx="6"/>
  <text class="d-text" x="360" y="248" text-anchor="middle">NULL</text>
  <rect class="d-box-muted" x="300" y="270" width="120" height="34" rx="6"/>
  <text class="d-sub" x="360" y="292" text-anchor="middle">NULL</text>
  <rect class="d-box-accent" x="560" y="94" width="120" height="34" rx="6"/>
  <text class="d-text" x="620" y="116" text-anchor="middle">Leeds</text>
  <rect class="d-box-accent" x="560" y="160" width="120" height="34" rx="6"/>
  <text class="d-text" x="620" y="182" text-anchor="middle">Pune</text>
  <rect class="d-box-accent" x="560" y="226" width="120" height="34" rx="6"/>
  <text class="d-text" x="620" y="248" text-anchor="middle">NULL</text>
  <path class="d-edge" d="M 164 177 L 294 177" marker-end="url(#sql01q4-arrow)"/>
  <path class="d-edge" d="M 424 177 L 554 177" marker-end="url(#sql01q4-arrow)"/>
</svg>

After sorting, duplicates sit next to each other (the grey boxes), so a single pass keeps the first of each run. That second pass is cheap; the sort is what costs.

📌 **Interview term: hash-based duplicate elimination (HashAggregate)** — read the rows in any order and put each key into a hash table; emit a row only the first time its key is seen. About O(n) work, but the hash table holds every **distinct** key, so memory grows with the number of distinct rows, not the input.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 220" role="img" aria-label="Hash based DISTINCT: each row is looked up in a hash table of keys already seen, and only new keys are emitted">
  <defs>
    <marker id="sql01q4h-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="160" height="90" rx="10"/>
  <text class="d-text" x="100" y="98" text-anchor="middle">next row</text>
  <text class="d-sub" x="100" y="122" text-anchor="middle">in any order</text>
  <rect class="d-box-accent" x="280" y="40" width="180" height="130" rx="10"/>
  <text class="d-text" x="370" y="78" text-anchor="middle">hash table</text>
  <text class="d-sub" x="370" y="104" text-anchor="middle">keys seen so far</text>
  <text class="d-sub" x="370" y="128" text-anchor="middle">Pune, Leeds, NULL</text>
  <rect class="d-box" x="560" y="30" width="140" height="56" rx="10"/>
  <text class="d-text" x="630" y="64" text-anchor="middle">new: emit</text>
  <rect class="d-box-muted" x="560" y="124" width="140" height="56" rx="10"/>
  <text class="d-text" x="630" y="158" text-anchor="middle">seen: skip</text>
  <path class="d-edge" d="M 184 105 L 274 105" marker-end="url(#sql01q4h-arrow)"/>
  <path class="d-edge-accent" d="M 464 80 L 554 60" marker-end="url(#sql01q4h-arrow)"/>
  <path class="d-edge-dashed" d="M 464 130 L 554 150" marker-end="url(#sql01q4h-arrow)"/>
</svg>

Each incoming row costs one hash lookup. New keys go to the output and into the table; keys already in the table are skipped.

### What PostgreSQL chose

~~~text
QUERY PLAN
HashAggregate
  Group Key: customer_id, product
  ->  Seq Scan on orders
~~~

On this small table the planner picked the hash strategy. Turning it off for the session (\`SET enable_hashagg = off\`, a planner switch meant for experiments, not production) shows the sort strategy for the same query:

~~~text
QUERY PLAN
Unique
  ->  Sort
        Sort Key: customer_id, product
        ->  Seq Scan on orders
~~~

The planner picks between them on cost estimates, so on other data, or with other statistics, it may choose the other one. Two settings decide when they become expensive: \`work_mem\` (the memory one sort or hash may use, 4MB by default on the PostgreSQL 16.15 server used here) and \`hash_mem_multiplier\` (2 here). Since PostgreSQL 13, a hash aggregate that outgrows \`work_mem × hash_mem_multiplier\` spills to disk rather than growing without limit ([PostgreSQL 13 release notes](https://www.postgresql.org/docs/release/13.0/)); a sort that outgrows \`work_mem\` becomes an external merge sort on disk. Reading those nodes is covered in [How do you read EXPLAIN ANALYZE — cost, actual time, rows, and Buffers?](/interview-question/how-do-you-read-explain-analyze-cost-actual-time-rows-and-buffers)

### What SQLite chose, and how an index removes the work

~~~text
id | parent | notused | detail
3 | 0 | 0 | SCAN orders
12 | 0 | 0 | USE TEMP B-TREE FOR DISTINCT

id | parent | notused | detail
3 | 0 | 0 | SCAN orders USING COVERING INDEX orders_customer_product
~~~

Without an index, SQLite's plan says \`USE TEMP B-TREE FOR DISTINCT\`: it builds a temporary sorted structure of the rows it has seen. After creating an index on \`(customer_id, product)\`, the plan becomes \`SCAN orders USING COVERING INDEX orders_customer_product\` and the temporary B-tree is gone: the index already returns rows in \`(customer_id, product)\` order, so duplicates arrive next to each other for free. The ids in the first column are internal node numbers. See [What is an index and how does it speed up queries?](/interview-question/what-is-an-index-and-how-does-it-speed-up-queries) and [What is a covering index?](/interview-question/what-is-a-covering-index)

| Strategy | Work | Memory | Output order | Good when |
| :--- | :--- | :--- | :--- | :--- |
| Sort + Unique | about O(n log n) | the rows being sorted, spills to disk | sorted | you also need \`ORDER BY\` on those columns |
| HashAggregate | about O(n) | one entry per distinct key | no order | few distinct values among many rows |
| Index scan + Unique | about O(n), no sort | none extra | index order | an index starts with exactly the DISTINCT columns |

The overall lesson: DISTINCT costs a pass over **all** the input rows plus a sort or hash, even when the result is three rows. On a large join that is the most expensive step of the query.

## 5. DISTINCT as a Band-Aid for Join Fan-Out

The most common real-world reason for a \`DISTINCT\` is a join that returned "too many rows":

~~~text
name
Asha
Ben
Dara
Dara

name
Asha
Ben
Dara

name
Asha
Ben
Dara
~~~

📌 **Interview term: join fan-out** — a one-to-many join repeats the "one" row once per match. Dara bought two mice, so the join lists her twice.

\`DISTINCT\` gives the right names, but only after the database has built every customer-order pair and then thrown the extras away. It also hides a correctness risk: it removes rows that are equal in the **selected** columns, so two different customers who are both named "Ben" would be merged into one. \`EXISTS\` asks the real question ("does at least one such order exist?"), returns each customer once by construction, and can stop looking at a customer's orders after the first match.

📌 **Interview term: semi-join** — returning each row of A at most once when at least one matching row exists in B. \`EXISTS\` and \`IN\` express it; the optimizer has dedicated semi-join operators for it. More in [What is the difference between EXISTS and IN?](/interview-question/what-is-the-difference-between-exists-and-in) and [Why might EXISTS outperform a JOIN for existence checks?](/interview-question/why-might-exists-outperform-a-join-for-existence-checks)

If a query "needs" a DISTINCT and you cannot say which duplicate rows it removes and why they exist, that is a sign the join or the grain of the query is wrong.

## 6. Relatives of DISTINCT

- **\`GROUP BY\` the same columns** returns the same rows. PostgreSQL 16 planned \`SELECT customer_id, product FROM orders GROUP BY customer_id, product\` as the same \`HashAggregate\` as the DISTINCT version. Prefer \`GROUP BY\` when you also compute aggregates. See [How does GROUP BY work with aggregate functions?](/interview-question/how-does-group-by-work-with-aggregate-functions)
- **\`UNION\` vs \`UNION ALL\`**: \`UNION\` de-duplicates the combined result (a DISTINCT over both branches), \`UNION ALL\` does not and is cheaper. See [What is the difference between UNION and UNION ALL?](/interview-question/what-is-the-difference-between-union-and-union-all)
- **Finding the duplicates** rather than hiding them: \`GROUP BY ... HAVING COUNT(*) > 1\`. See [How do you find duplicate rows in a table?](/interview-question/how-do-you-find-duplicate-rows-in-a-table)

📌 **Interview term: DISTINCT ON** — a PostgreSQL extension that keeps the **first row of each group** of the listed expressions, where "first" is decided by \`ORDER BY\`. The \`ORDER BY\` must start with the \`DISTINCT ON\` expressions; otherwise PostgreSQL 16 raises \`SELECT DISTINCT ON expressions must match initial ORDER BY expressions\`.

~~~text
customer_id | product | amount | placed
1 | Laptop | 950 | 2026-02-10
2 | Mouse | 25 | 2026-03-01
3 | Phone | 650 | 2026-02-02
4 | Mouse | 30 | 2026-03-05
~~~

This returns the latest order per customer (ties broken by the higher id), whole rows and all. SQLite does not have it; the portable equivalent is \`ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY placed DESC, id DESC)\` and keeping row 1, covered in [Top-N per group with RANK() OVER (PARTITION BY)](/interview-question/top-n-per-group-with-rank-over-partition-by-how-do-you-get-top-2-per-department-).

## 7. Verified: Running the Code

The four SQLite examples ran as this page runs them (sql.js 1.10.2, SQLite 3.45.0, fresh in-memory database seeded from the schema above); the three PostgreSQL examples ran on PostgreSQL 16.15 in a scratch database with the same schema.

Example 1, DISTINCT basics:

~~~text
city
NULL
NULL
Leeds
Leeds
Pune
Pune

city
NULL
Leeds
Pune

customer_id | product
1 | Laptop
1 | Mouse
2 | Mouse
2 | Phone
3 | Phone
4 | Mouse
~~~

Example 2, counting:

~~~text
all_rows | non_null_cities | distinct_cities
6 | 4 | 2

distinct_pairs
6
~~~

Example 3, fan-out, DISTINCT and EXISTS:

~~~text
name
Asha
Ben
Dara
Dara

name
Asha
Ben
Dara

name
Asha
Ben
Dara
~~~

Example 4, SQLite plans without and with the index:

~~~text
id | parent | notused | detail
3 | 0 | 0 | SCAN orders
12 | 0 | 0 | USE TEMP B-TREE FOR DISTINCT

id | parent | notused | detail
3 | 0 | 0 | SCAN orders USING COVERING INDEX orders_customer_product
~~~

Example 5, PostgreSQL hash plan:

~~~text
QUERY PLAN
HashAggregate
  Group Key: customer_id, product
  ->  Seq Scan on orders
~~~

Example 6, PostgreSQL sort plan:

~~~text
QUERY PLAN
Unique
  ->  Sort
        Sort Key: customer_id, product
        ->  Seq Scan on orders
~~~

Example 7, DISTINCT ON:

~~~text
customer_id | product | amount | placed
1 | Laptop | 950 | 2026-02-10
2 | Mouse | 25 | 2026-03-01
3 | Phone | 650 | 2026-02-02
4 | Mouse | 30 | 2026-03-05
~~~

## Common Pitfalls

- **Thinking DISTINCT applies to the first column.** It applies to the whole select list; \`DISTINCT(a), b\` is the same as \`DISTINCT a, b\`.
- **Using DISTINCT to fix a join.** It hides fan-out, costs a sort or hash over every joined row, and can merge rows that only look equal in the selected columns. Use \`EXISTS\` or fix the join.
- **Adding DISTINCT "just in case".** On a query that is already unique it can still cost a full de-duplication: PostgreSQL 16 planned \`SELECT DISTINCT id, name FROM customers\` as a \`HashAggregate\` even though \`id\` is the primary key.
- **Ordering by a column that is not selected.** PostgreSQL rejects it with \`SELECT DISTINCT\`; SQLite silently picks a value.
- **Forgetting NULL rules.** \`SELECT DISTINCT\` keeps one NULL row, \`COUNT(DISTINCT col)\` ignores NULLs entirely.
- **Using UNION when UNION ALL is meant.** \`UNION\` pays for duplicate removal across both branches.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it does:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT DISTINCT</code> removes duplicate <strong style="color:#ffca28;">result rows</strong>. Two rows are duplicates when every column in the select list is equal, and for this purpose NULLs count as equal, so many NULLs become one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Where it runs:</strong> <span style="color:#f0e2c8;">Logically after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT</code> and before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY</code>. That is why PostgreSQL insists that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY</code> columns appear in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT DISTINCT</code> list.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The cost:</strong> <span style="color:#f0e2c8;">To find duplicates the engine must either <strong style="color:#ffca28;">sort</strong> the rows and drop neighbours (Sort + Unique) or <strong style="color:#ffca28;">hash</strong> them into a table of seen keys (HashAggregate). That is extra CPU, memory up to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">work_mem</code>, and disk spill beyond it. An index that already delivers rows in order can make it cheap.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The smell:</strong> <span style="color:#f0e2c8;">DISTINCT added to make duplicates go away usually hides join fan-out. Ask what the duplicates mean: if the question is "customers who bought X", use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXISTS</code>, which never makes the duplicates in the first place.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Relatives:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY</code> the same columns gives the same rows and usually the same plan; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(DISTINCT col)</code> counts distinct non-NULL values; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION</code> de-duplicates where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION ALL</code> does not; PostgreSQL's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DISTINCT ON</code> keeps one whole row per key.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">SELECT DISTINCT(a), b</code> distinct on <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a</code> only?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. The parentheses just wrap the expression <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DISTINCT</code> still applies to the whole row <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a, b)</code>. Both engines returned exactly the same rows with and without the parentheses. For one row per <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> in PostgreSQL, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DISTINCT ON (a)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;"><code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">DISTINCT</code> or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">GROUP BY</code> — which is faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For the same column list they mean the same thing, and PostgreSQL 16 planned both as the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashAggregate</code> here. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY</code> when you also need aggregates, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DISTINCT</code> when you only need the unique rows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does PostgreSQL handle a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">DISTINCT</code> too big for memory?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Since PostgreSQL 13 a hash aggregate spills to disk when it exceeds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">work_mem</code> times <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hash_mem_multiplier</code> (4MB and 2 by default on the 16.15 server used here); a sort spills to disk as an external sort. Either way, a big <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DISTINCT</code> can mean temporary files.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do I get the latest order per customer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In PostgreSQL, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT DISTINCT ON (customer_id) ... ORDER BY customer_id, placed DESC</code>. Portable SQL uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY placed DESC)</code> and keeps row 1.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are NULLs equal for <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">DISTINCT</code> but not for <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">=</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NULL = NULL</code> is unknown, yet <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DISTINCT</code> puts all NULLs in one group. The operator that matches DISTINCT semantics is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IS NOT DISTINCT FROM</code>, which SQLite has since 3.39.0.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| DISTINCT | Removes duplicate result rows, comparing every selected column |
| IS NOT DISTINCT FROM | Equality that treats two NULLs as equal, matching DISTINCT semantics |
| COUNT(DISTINCT col) | Number of distinct non-NULL values of a column |
| Sort-based duplicate elimination (Sort + Unique) | Sort the rows, then keep a row only when it differs from the previous one |
| Hash-based duplicate elimination (HashAggregate) | Keep a hash table of seen keys, emit each key once |
| Join fan-out | A one-to-many join repeating the "one" row per match |
| Semi-join | Each row of A once if a match exists in B, as \`EXISTS\` expresses |
| DISTINCT ON | PostgreSQL extension: the first row of each group, by \`ORDER BY\` |

**Conclusion:** DISTINCT removes duplicate result rows by comparing the whole select list, treating NULLs as equal, and it runs after SELECT and before ORDER BY. Its cost is that the engine has to look at every input row and find duplicates by sorting or hashing, which takes CPU and memory and can spill to disk, unless an index already delivers the rows in order. The strongest part of an answer is knowing when not to use it: if DISTINCT is there to hide duplicates created by a join, rewrite the query with EXISTS or fix the join, and reach for GROUP BY, COUNT(DISTINCT) or PostgreSQL's DISTINCT ON when they say what you mean more directly.`,
    examples: [
      {
        label: `DISTINCT compares whole result rows, and treats NULLs as one value`,
        code: `-- Raw column: six rows, with repeats and two NULLs
SELECT city FROM customers ORDER BY city;

-- DISTINCT: one row per distinct value, and the two NULLs collapse into one
SELECT DISTINCT city FROM customers ORDER BY city;

-- Several columns: a row is a duplicate only if EVERY selected column matches
SELECT DISTINCT customer_id, product FROM orders ORDER BY customer_id, product;`,
      },
      {
        label: `COUNT(DISTINCT col) ignores NULLs; counting distinct pairs needs a subquery`,
        code: `SELECT COUNT(*) AS all_rows,
       COUNT(city) AS non_null_cities,
       COUNT(DISTINCT city) AS distinct_cities
FROM customers;

-- COUNT(DISTINCT a, b) is not accepted by SQLite or PostgreSQL: count a DISTINCT subquery
SELECT COUNT(*) AS distinct_pairs
FROM (SELECT DISTINCT customer_id, product FROM orders) AS t;`,
      },
      {
        label: `DISTINCT as a band-aid for join fan-out, and the EXISTS fix`,
        code: `-- Who bought a mouse? The join repeats Dara, who bought two
SELECT c.name
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
WHERE o.product = 'Mouse'
ORDER BY c.name;

-- DISTINCT hides the repeat, after building and de-duplicating every pair
SELECT DISTINCT c.name
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
WHERE o.product = 'Mouse'
ORDER BY c.name;

-- EXISTS asks the real question: each customer once, no duplicates to remove
SELECT c.name
FROM customers AS c
WHERE EXISTS (SELECT 1 FROM orders AS o WHERE o.customer_id = c.id AND o.product = 'Mouse')
ORDER BY c.name;`,
      },
      {
        label: `SQLite: DISTINCT needs a temporary B-tree, unless an index already provides the order`,
        code: `-- Without a suitable index SQLite builds a temporary B-tree to find duplicates
EXPLAIN QUERY PLAN
SELECT DISTINCT customer_id, product FROM orders;

-- With an index on exactly those columns, rows arrive sorted and the temp B-tree is gone
CREATE INDEX orders_customer_product ON orders (customer_id, product);
EXPLAIN QUERY PLAN
SELECT DISTINCT customer_id, product FROM orders;`,
      },
      {
        label: `PostgreSQL: DISTINCT planned as a HashAggregate`,
        code: `EXPLAIN (COSTS OFF)
SELECT DISTINCT customer_id, product FROM orders;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: with hash aggregation disabled, the same DISTINCT becomes Sort + Unique`,
        code: `SET enable_hashagg = off;
EXPLAIN (COSTS OFF)
SELECT DISTINCT customer_id, product FROM orders;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL DISTINCT ON: the latest order per customer`,
        code: `SELECT DISTINCT ON (customer_id) customer_id, product, amount, placed
FROM orders
ORDER BY customer_id, placed DESC, id DESC;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `What is the CASE expression?`,
    difficulty: "easy",
    seoDescription: `CASE is SQL's if-then-else expression. Learn simple vs searched CASE, first-match-wins, the missing ELSE, NULL traps and conditional aggregation.`,
    description: `**Question presented to candidate:**
"SQL has no if statement inside a query, yet reports constantly need 'if this then that'. Explain the CASE expression: its two forms, how it decides which branch wins, what happens when nothing matches, and show me two or three places you would use it."

**What a strong answer should cover:**
- CASE is an **expression** that returns one value per row, usable anywhere a value is: SELECT, WHERE, ORDER BY, GROUP BY, inside aggregates, in UPDATE ... SET
- The searched form (\`CASE WHEN condition THEN ...\`) and the simple form (\`CASE expr WHEN value THEN ...\`); WHEN branches are tested top to bottom and the first true one wins
- No ELSE means NULL when nothing matches; the simple form compares with \`=\`, so \`WHEN NULL\` never matches and you need \`WHEN x IS NULL\`
- Common uses: bucketing values, custom sort orders, conditional aggregation (pivot-style counts), guarding division by zero
- Engine details: all branches must have compatible types in PostgreSQL (SQLite does not care); PostgreSQL may evaluate a constant in an unused branch at plan time; SQLite has \`iif()\`, PostgreSQL does not

**Code / implementation expected:** Yes — a searched CASE that buckets a value, ideally also a CASE inside SUM or COUNT.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer TEXT NOT NULL,
  status TEXT,
  amount INTEGER NOT NULL,
  items INTEGER NOT NULL
);
INSERT INTO orders (id, customer, status, amount, items) VALUES
  (1, 'Asha', 'shipped', 1200, 3),
  (2, 'Ben', 'pending', 80, 1),
  (3, 'Chen', 'cancelled', 450, 0),
  (4, 'Dara', 'shipped', 300, 2),
  (5, 'Eli', NULL, 45, 1),
  (6, 'Fay', 'pending', 999, 4),
  (7, 'Gus', 'shipped', 150, 0),
  (8, 'Hana', 'returned', 220, 2);
\`\`\``,
    answer: `**Target Audience:** Beginners who can write SELECT, WHERE and GROUP BY and need "if this, then that" logic inside a query.
**Difficulty:** Easy
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, which runs the examples on this page) and PostgreSQL 16.15; SQL Server and MySQL notes are marked with their source.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output and error messages were produced by actually running the queries; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

A post office sorts parcels with a simple card taped to the wall:

1. Heavier than 20 kg? Freight bay.
2. Heavier than 2 kg? Parcel shelf.
3. Anything else: letter tray.

The clerk reads the card **from the top** and stops at the first line that fits. A 25 kg crate is "heavier than 2 kg" too, but it never gets that far: line 1 already sent it to freight. If the card had no "anything else" line, a postcard would match nothing and end up nowhere.

That card is a SQL \`CASE\` expression, and the two surprises in it (first match wins, and no "anything else" means nowhere) are the two things interviewers check.

## 2. The Core Idea: An Expression, Not a Statement

📌 **Interview term: CASE expression** — SQL's conditional expression. For each row it evaluates conditions in order and returns the value of the first branch that matches. Because it is an **expression** (it produces a value), it can be used anywhere a value is allowed: in \`SELECT\`, \`WHERE\`, \`ORDER BY\`, \`GROUP BY\`, inside aggregate functions, and in \`UPDATE ... SET\`. It is not a control-flow statement: it cannot run one query or another.

There are two forms.

📌 **Interview term: searched CASE** — \`CASE WHEN condition THEN result [WHEN ...] [ELSE result] END\`. Each \`WHEN\` holds any boolean condition. This is the general form.

📌 **Interview term: simple CASE** — \`CASE expression WHEN value THEN result [WHEN ...] [ELSE result] END\`. The expression is compared with each value using \`=\`. Shorter when you are matching one column against fixed values.

~~~sql
-- searched
CASE WHEN amount >= 1000 THEN 'large' WHEN amount >= 200 THEN 'medium' ELSE 'small' END

-- simple
CASE status WHEN 'shipped' THEN 'Done' WHEN 'pending' THEN 'Waiting' ELSE 'Other' END
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 700 330" role="img" aria-label="A searched CASE tests each WHEN from top to bottom; the first true condition returns its value, otherwise ELSE, or NULL when there is no ELSE">
  <defs>
    <marker id="sql01q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="30" width="260" height="56" rx="10"/>
  <text class="d-text" x="170" y="64" text-anchor="middle">WHEN amount &gt;= 1000</text>
  <rect class="d-box" x="40" y="140" width="260" height="56" rx="10"/>
  <text class="d-text" x="170" y="174" text-anchor="middle">WHEN amount &gt;= 200</text>
  <rect class="d-box-muted" x="40" y="250" width="260" height="56" rx="10"/>
  <text class="d-text" x="170" y="284" text-anchor="middle">ELSE, or NULL if none</text>
  <rect class="d-box-accent" x="440" y="30" width="200" height="56" rx="10"/>
  <text class="d-text" x="540" y="64" text-anchor="middle">large</text>
  <rect class="d-box-accent" x="440" y="140" width="200" height="56" rx="10"/>
  <text class="d-text" x="540" y="174" text-anchor="middle">medium</text>
  <rect class="d-box-accent" x="440" y="250" width="200" height="56" rx="10"/>
  <text class="d-text" x="540" y="284" text-anchor="middle">small</text>
  <path class="d-edge-accent" d="M 302 58 L 436 58" marker-end="url(#sql01q5-arrow)"/>
  <text class="d-sub" x="370" y="46" text-anchor="middle">true</text>
  <path class="d-edge-accent" d="M 302 168 L 436 168" marker-end="url(#sql01q5-arrow)"/>
  <text class="d-sub" x="370" y="156" text-anchor="middle">true</text>
  <path class="d-edge" d="M 302 278 L 436 278" marker-end="url(#sql01q5-arrow)"/>
  <path class="d-edge-dashed" d="M 170 88 L 170 136" marker-end="url(#sql01q5-arrow)"/>
  <text class="d-sub" x="212" y="118" text-anchor="middle">not true</text>
  <path class="d-edge-dashed" d="M 170 198 L 170 246" marker-end="url(#sql01q5-arrow)"/>
  <text class="d-sub" x="212" y="228" text-anchor="middle">not true</text>
</svg>

For each row, the conditions on the left are tested from the top. The first one that is **true** returns its value on the right and the rest are skipped. A condition that is false **or NULL** passes the row down to the next test, and a row that passes every test gets the \`ELSE\` value, or NULL when there is no \`ELSE\`.

## 3. First Match Wins

~~~text
id | amount | size
1 | 1200 | large
2 | 80 | small
3 | 450 | medium
4 | 300 | medium
5 | 45 | small
6 | 999 | medium
7 | 150 | small
8 | 220 | medium

id | amount | size
1 | 1200 | medium
2 | 80 | small
3 | 450 | medium
4 | 300 | medium
5 | 45 | small
6 | 999 | medium
7 | 150 | small
8 | 220 | medium
~~~

In the first result, order 1 (1200) is \`large\`, 450 and 999 are \`medium\`. The second query has the same three branches in a different order, and order 1 is now \`medium\`: \`1200 >= 200\` is true, so the first branch wins and \`amount >= 1000\` is never looked at. When conditions overlap, order the branches from most specific to least specific, or make them non-overlapping (\`WHEN amount >= 200 AND amount < 1000\`).

## 4. The Missing ELSE and the NULL Trap

~~~text
id | status | label
1 | shipped | Done
2 | pending | Waiting
3 | cancelled | NULL
4 | shipped | Done
5 | NULL | NULL
6 | pending | Waiting
7 | shipped | Done
8 | returned | NULL

id | status | label
1 | shipped | Done
2 | pending | Other
3 | cancelled | Other
4 | shipped | Done
5 | NULL | Unknown
6 | pending | Other
7 | shipped | Done
8 | returned | Other
~~~

Two separate lessons are in the first result:

- **No ELSE means NULL.** Orders 3 (\`cancelled\`) and 8 (\`returned\`) matched no branch, and there is no \`ELSE\`, so \`label\` is NULL. That is legal, but it is rarely what a report wants. Write the \`ELSE\` even when it is \`ELSE NULL\`, so a reader sees it was deliberate.
- **\`WHEN NULL\` never matches.** Order 5 has a NULL status, and the simple form tests \`status = NULL\`, which is unknown, never true. So the \`'Unknown'\` branch is dead code. The second query uses the searched form with \`WHEN status IS NULL\`, which works. More on unknown comparisons in [How does SQL handle NULL values?](/interview-question/how-does-sql-handle-null-values)

📌 **Interview term: three-valued logic** — in SQL a condition can be true, false or unknown (NULL). \`CASE\`, \`WHERE\` and \`HAVING\` only act on **true**; false and unknown are treated the same way.

Two special cases of CASE have their own functions: \`COALESCE(a, b)\` is a \`CASE\` that returns the first non-NULL value, and \`NULLIF(a, b)\` is a \`CASE\` that returns NULL when the two are equal. See [What do COALESCE and NULLIF do?](/interview-question/what-do-coalesce-and-nullif-do)

## 5. Where CASE Earns Its Keep

### Custom sort order and conditional aggregation

~~~text
id | status
2 | pending
6 | pending
1 | shipped
4 | shipped
7 | shipped
3 | cancelled
5 | NULL
8 | returned

total | shipped | pending_value | big_orders
8 | 3 | 1079 | 5
~~~

The first query sorts by a **computed** rank: pending orders first, then shipped, then everything else, with \`id\` breaking ties. Alphabetical order would put \`cancelled\` first; the CASE expresses a business order instead.

The second query is the most useful pattern in reporting:

📌 **Interview term: conditional aggregation** — an aggregate over a \`CASE\`, so each aggregate only counts the rows you choose. One scan of the table gives several filtered totals: 3 shipped orders, 1079 of pending value (80 + 999), and 5 orders of 200 or more. \`COUNT(CASE WHEN amount >= 200 THEN 1 END)\` works because the CASE returns NULL for the other rows and \`COUNT(expr)\` ignores NULLs. This is also how you [pivot rows into columns](/interview-question/how-do-you-pivot-rows-into-columns), and how you keep every group when a \`WHERE\` would remove some (see [What is the difference between WHERE and HAVING?](/interview-question/what-is-the-difference-between-where-and-having)).

The standard \`FILTER\` clause says the same thing more directly, \`COUNT(*) FILTER (WHERE status = 'shipped')\`, and returned 3 in both engines here; SQLite has it since [3.30.0](https://www.sqlite.org/releaselog/3_30_0.html). \`CASE\` works everywhere, including MySQL and SQL Server.

### CASE in an UPDATE

~~~text
id | status
1 | shipped
2 | pending
3 | cancelled
4 | shipped
5 | pending
6 | pending
7 | shipped
8 | cancelled
~~~

One \`UPDATE\` with a \`CASE\` replaced two separate updates: the NULL status of order 5 became \`pending\`, and the \`returned\` order 8 became \`cancelled\`. The \`ELSE status\` line matters: without it, every other row would be set to NULL.

### Guarding a division

Dividing by a column that can be 0 behaves differently by engine, from runs on this data:

| Engine | \`450 / 0\` | \`7 / 2\` |
| :--- | :--- | :--- |
| SQLite 3.45 | \`NULL\` (no error) | \`3\` (integer division) |
| PostgreSQL 16 | \`ERROR:  division by zero\` | \`3\` (integer division) |

The PostgreSQL example guards it with a CASE:

~~~text
id | amount | items | per_item
1 | 1200 | 3 | 400
2 | 80 | 1 | 80
3 | 450 | 0 | NULL
4 | 300 | 2 | 150
5 | 45 | 1 | 45
6 | 999 | 4 | 249
7 | 150 | 0 | NULL
8 | 220 | 2 | 110
~~~

Orders 3 and 7 have zero items and get NULL instead of an error. \`amount / NULLIF(items, 0)\` is the shorter idiom for the same thing; it also returned NULL for order 3 in the PostgreSQL run.

## 6. Engine Details That Interviewers Like

### PostgreSQL may evaluate a constant in an unused branch

A \`CASE\` skips the later branches for a row, but PostgreSQL's planner simplifies **constant** subexpressions before any row is read. From a PostgreSQL 16 run on this table, where every amount is positive:

~~~sql
SELECT id, CASE WHEN amount > 0 THEN amount ELSE 1/0 END AS v FROM orders ORDER BY id;
~~~

~~~text
ERROR:  division by zero
~~~

No row ever reaches the \`ELSE\`, yet the query fails, because \`1/0\` was folded at plan time. The same query with \`ELSE amount/0\`, which depends on the row, ran fine and returned the amounts. The [PostgreSQL documentation for CASE](https://www.postgresql.org/docs/16/functions-conditional.html) describes this exact behaviour. SQLite ran the same query without an error and returned the amounts.

### All branches must agree on a type in PostgreSQL

~~~sql
SELECT id, CASE WHEN amount > 100 THEN 'big' ELSE 0 END AS mixed FROM orders ORDER BY id;
~~~

~~~text
ERROR:  invalid input syntax for type integer: "big"
~~~

PostgreSQL resolves one result type for the whole CASE (here \`integer\`, from the \`0\`) and fails converting \`'big'\`. Mixed numeric types are promoted: \`pg_typeof(CASE WHEN true THEN 1 ELSE 2.5 END)\` returned \`numeric\`. SQLite is dynamically typed and returned \`big\` and \`0\` side by side; \`typeof()\` gave \`text\` for one row and \`integer\` for another. Give every branch the same type, with a cast if needed, to be portable.

### Shorthands and limits

- **SQLite** has \`iif(condition, a, b)\` since [3.32.0](https://www.sqlite.org/releaselog/3_32_0.html); it is a CASE with one WHEN. **PostgreSQL 16** has no such function: \`function iif(boolean, unknown, unknown) does not exist\`.
- **SQL Server** allows only 10 levels of nested CASE expressions ([error 125](https://learn.microsoft.com/en-us/sql/relational-databases/errors-events/mssqlserver-125-database-engine-error)). Deep nesting is a sign to flatten into one searched CASE with more WHEN branches, or to use a lookup table and a join.

## 7. Verified: Running the Code

The four SQLite examples ran as this page runs them (sql.js 1.10.2, SQLite 3.45.0, fresh in-memory database seeded from the schema above); the PostgreSQL example ran on PostgreSQL 16.15 in a scratch database with the same schema. The four SQLite examples were also run on PostgreSQL 16 and returned the same rows.

Example 1, bucketing and branch order:

~~~text
id | amount | size
1 | 1200 | large
2 | 80 | small
3 | 450 | medium
4 | 300 | medium
5 | 45 | small
6 | 999 | medium
7 | 150 | small
8 | 220 | medium

id | amount | size
1 | 1200 | medium
2 | 80 | small
3 | 450 | medium
4 | 300 | medium
5 | 45 | small
6 | 999 | medium
7 | 150 | small
8 | 220 | medium
~~~

Example 2, simple CASE, missing ELSE, and IS NULL:

~~~text
id | status | label
1 | shipped | Done
2 | pending | Waiting
3 | cancelled | NULL
4 | shipped | Done
5 | NULL | NULL
6 | pending | Waiting
7 | shipped | Done
8 | returned | NULL

id | status | label
1 | shipped | Done
2 | pending | Other
3 | cancelled | Other
4 | shipped | Done
5 | NULL | Unknown
6 | pending | Other
7 | shipped | Done
8 | returned | Other
~~~

Example 3, custom sort and conditional aggregation:

~~~text
id | status
2 | pending
6 | pending
1 | shipped
4 | shipped
7 | shipped
3 | cancelled
5 | NULL
8 | returned

total | shipped | pending_value | big_orders
8 | 3 | 1079 | 5
~~~

Example 4, CASE in an UPDATE:

~~~text
id | status
1 | shipped
2 | pending
3 | cancelled
4 | shipped
5 | pending
6 | pending
7 | shipped
8 | cancelled
~~~

Example 5, guarding a division on PostgreSQL:

~~~text
id | amount | items | per_item
1 | 1200 | 3 | 400
2 | 80 | 1 | 80
3 | 450 | 0 | NULL
4 | 300 | 2 | 150
5 | 45 | 1 | 45
6 | 999 | 4 | 249
7 | 150 | 0 | NULL
8 | 220 | 2 | 110
~~~

## Common Pitfalls

- **Overlapping branches in the wrong order.** The first true \`WHEN\` wins; \`WHEN amount >= 200\` before \`WHEN amount >= 1000\` means nothing is ever \`large\`.
- **Forgetting ELSE.** Unmatched rows become NULL, and in an \`UPDATE ... SET col = CASE ...\` that wipes the column for every unmatched row.
- **\`CASE x WHEN NULL\`.** The simple form compares with \`=\`, so it never matches NULL; use the searched form with \`IS NULL\`.
- **Mixing result types.** Works in SQLite, fails in PostgreSQL; cast every branch to one type.
- **Trusting CASE to hide a constant error.** PostgreSQL may fold \`1/0\` in a branch no row reaches and fail anyway.
- **Using CASE where a table belongs.** A 40-branch CASE mapping codes to names is a lookup table waiting to be created and joined.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CASE</code> is SQL's conditional <strong style="color:#ffca28;">expression</strong>: for each row it returns one value, so it can go anywhere a value can, including <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY</code>, inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SUM</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT</code>, and in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UPDATE ... SET</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Two forms:</strong> <span style="color:#f0e2c8;">The searched form <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CASE WHEN amount &gt;= 1000 THEN 'large' ... END</code> takes any condition. The simple form <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CASE status WHEN 'shipped' THEN ... END</code> compares one expression with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">=</code> against each value.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. How it decides:</strong> <span style="color:#f0e2c8;">The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHEN</code> branches are tested top to bottom and the <strong style="color:#ffca28;">first true one wins</strong>, so put the most specific test first. If nothing matches and there is no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ELSE</code>, the result is NULL.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Where it earns its keep:</strong> <span style="color:#f0e2c8;">Bucketing values into labels, custom sort orders, conditional aggregation such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END)</code>, and guarding a division by zero.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Gotchas:</strong> <span style="color:#f0e2c8;">Simple <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CASE x WHEN NULL</code> never matches, so write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHEN x IS NULL</code>. In PostgreSQL all branches need compatible types, and a constant like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1/0</code> in an unused branch can still fail at planning time.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">CASE</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">COALESCE</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COALESCE(a, b)</code> is shorthand for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CASE WHEN a IS NOT NULL THEN a ELSE b END</code>. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COALESCE</code> for "first non-NULL value" and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CASE</code> for any other condition.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">CASE</code> short-circuit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Branches are evaluated in order and later ones are skipped for a row once one is true, which is why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CASE WHEN items = 0 THEN NULL ELSE amount / items END</code> works on PostgreSQL. The exception is constants: PostgreSQL 16 still raised <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">division by zero</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ELSE 1/0</code> even though no row reached that branch, because the planner folds constants early.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">CASE</code> return different types?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In PostgreSQL no: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CASE WHEN amount &gt; 100 THEN 'big' ELSE 0 END</code> fails with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">invalid input syntax for type integer: "big"</code>. SQLite allows it and returns a mix of text and integers. Cast to one type to be portable.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you pivot statuses into columns?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">One conditional aggregate per column: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) AS shipped</code>, and the same for each status, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY</code> the row key. PostgreSQL and SQLite 3.30+ also accept <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(*) FILTER (WHERE status = 'shipped')</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a shorter <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">IF</code> function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">SQLite has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">iif(cond, a, b)</code> since 3.32.0; PostgreSQL 16 has none and reports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">function iif(boolean, unknown, unknown) does not exist</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CASE</code> is the portable choice.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| CASE expression | A conditional expression returning one value per row; usable anywhere a value is |
| Searched CASE | \`CASE WHEN condition THEN ... END\`, any boolean condition per branch |
| Simple CASE | \`CASE expr WHEN value THEN ... END\`, compares with \`=\` |
| Three-valued logic | Conditions are true, false or unknown (NULL); CASE only takes a branch on true |
| Conditional aggregation | An aggregate over a CASE, giving several filtered totals in one pass |

**Conclusion:** CASE is SQL's if-then-else as an expression: it returns one value per row and therefore fits in SELECT, WHERE, ORDER BY, aggregates and UPDATE. Use the searched form for any condition and the simple form for matching one column against fixed values, remember that the first true branch wins and that a missing ELSE yields NULL, and test for NULL with IS NULL rather than WHEN NULL. In practice CASE is what turns raw rows into report-ready labels, business sort orders and pivot-style counts; mention PostgreSQL's strict typing and plan-time constant folding, and you have covered the details interviewers probe.`,
    examples: [
      {
        label: `Searched CASE: bucket order sizes, and see why branch order matters`,
        code: `-- First true WHEN wins, so test the most specific condition first
SELECT id, amount,
       CASE
         WHEN amount >= 1000 THEN 'large'
         WHEN amount >= 200 THEN 'medium'
         ELSE 'small'
       END AS size
FROM orders
ORDER BY id;

-- Same branches, wrong order: 1200 is caught by the first test and becomes medium
SELECT id, amount,
       CASE
         WHEN amount >= 200 THEN 'medium'
         WHEN amount >= 1000 THEN 'large'
         ELSE 'small'
       END AS size
FROM orders
ORDER BY id;`,
      },
      {
        label: `Simple CASE, the missing ELSE, and the WHEN NULL trap`,
        code: `-- Simple CASE compares status = 'shipped', status = 'pending', status = NULL ...
-- WHEN NULL never matches, and with no ELSE the rest become NULL
SELECT id, status,
       CASE status
         WHEN 'shipped' THEN 'Done'
         WHEN 'pending' THEN 'Waiting'
         WHEN NULL THEN 'Unknown'
       END AS label
FROM orders
ORDER BY id;

-- Searched CASE with IS NULL handles it, and ELSE catches everything else
SELECT id, status,
       CASE
         WHEN status IS NULL THEN 'Unknown'
         WHEN status = 'shipped' THEN 'Done'
         ELSE 'Other'
       END AS label
FROM orders
ORDER BY id;`,
      },
      {
        label: `CASE in ORDER BY (custom sort) and inside aggregates (conditional counts)`,
        code: `-- Custom sort order: pending first, then shipped, then everything else
SELECT id, status
FROM orders
ORDER BY CASE status WHEN 'pending' THEN 1 WHEN 'shipped' THEN 2 ELSE 3 END, id;

-- Conditional aggregation: several filtered totals in one pass
SELECT COUNT(*) AS total,
       SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) AS shipped,
       SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS pending_value,
       COUNT(CASE WHEN amount >= 200 THEN 1 END) AS big_orders
FROM orders;`,
      },
      {
        label: `CASE in UPDATE: change several values in one statement`,
        code: `-- One pass over the table: NULL becomes pending, returned becomes cancelled
UPDATE orders
SET status = CASE
               WHEN status IS NULL THEN 'pending'
               WHEN status = 'returned' THEN 'cancelled'
               ELSE status
             END;

SELECT id, status FROM orders ORDER BY id;`,
      },
      {
        label: `PostgreSQL: CASE guards a division that would otherwise raise division by zero`,
        code: `SELECT id, amount, items,
       CASE WHEN items = 0 THEN NULL ELSE amount / items END AS per_item
FROM orders
ORDER BY id;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
];

export default augments;
