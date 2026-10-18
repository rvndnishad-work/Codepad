/**
 * SQL ULTRA — batch 08: Window functions II and CTEs (top-N per group,
 * period-over-period growth, gaps and islands, ROLLUP / CUBE, CTEs). Every
 * example was run by scripts/verify-sql-examples.ts (sql.js 1.10.2 like the
 * page, PostgreSQL 16 for postgres examples); quoted output is that run's output.
 */
import type { SqlUltraAugment } from "./sql-augments.types";

const augments: SqlUltraAugment[] = [
  {
    title: `Top-N per group with RANK() OVER (PARTITION BY) — how do you get top 2 per department without collapsing rows?`,
    difficulty: "medium",
    seoDescription: `Get the top 2 rows per department with RANK() OVER (PARTITION BY ...) in a CTE: why WHERE cannot filter it, how ties change the result, and the cost.`,
    description: `**Question presented to candidate:**
"We have an \`employees\` table with \`dept\` and \`salary\`. Give me the two highest-paid people in every department, with their names and salaries, as normal rows. What happens when two people tie for second place?"

**What a strong answer should cover:**
- Why \`GROUP BY dept\` with \`MAX(salary)\` is the wrong tool: it collapses each department to one row and loses the names; a window function keeps every row and adds a number to it
- \`RANK() OVER (PARTITION BY dept ORDER BY salary DESC)\` numbers each department separately, then an outer query (CTE or derived table) filters \`WHERE rnk <= 2\`
- Why the filter cannot go in the same \`WHERE\`: window functions are computed after \`WHERE\`, so both SQLite and PostgreSQL reject it
- Ties: \`RANK() <= 2\` can return more than two rows per group, \`ROW_NUMBER()\` returns exactly two (add a tiebreaker), \`DENSE_RANK() <= 2\` returns the top two distinct salaries
- Alternatives and cost: a correlated \`COUNT(*)\` subquery (works without window functions), \`LATERAL ... LIMIT\` with an index for few rows per group, \`QUALIFY\` on engines that have it; PostgreSQL 15+ can stop the window early (Run Condition)

**Clarifying questions expected:**
- If two people tie for second place, should both appear, or exactly two rows per department?
- Do departments with fewer than two people still appear (yes, with whoever they have)?
- How big is the table and is there an index on \`(dept, salary)\` — is this a report or a hot API path?

**Code / implementation expected:** Yes — a ranked CTE filtered in an outer query, and an explanation of how the choice of ranking function changes the result on ties.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  dept TEXT NOT NULL,
  salary INTEGER NOT NULL
);
INSERT INTO employees (id, name, dept, salary) VALUES
  (1, 'Asha', 'Engineering', 160000),
  (2, 'Ben', 'Engineering', 150000),
  (3, 'Chen', 'Engineering', 150000),
  (4, 'Dara', 'Engineering', 120000),
  (5, 'Eli', 'Sales', 110000),
  (6, 'Fatima', 'Sales', 95000),
  (7, 'Gus', 'Sales', 80000),
  (8, 'Hana', 'Support', 70000),
  (9, 'Ivan', 'Support', 70000),
  (10, 'Jo', 'Support', 65000),
  (11, 'Kai', 'Legal', 130000);
\`\`\``,
    answer: `**Target Audience:** Beginners who have seen \`GROUP BY\` and want to return the best N rows of every group, and candidates preparing for the tie and performance follow-ups.
**Difficulty:** Medium
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15, both run for this page. The window-function pattern is standard SQL and also works in MySQL 8.0+ and SQL Server.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and error message shown was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

A school holds a sports day with four houses. The head teacher wants a notice board: "the top two runners of each house". She does not want "the fastest time per house" (that is one number per house and no names), and she does not want "the two fastest runners in the school" (they might both be from one house).

What she wants is: split the runners into houses, line each house up from fastest to slowest, give each runner a place number *inside their house*, and pin up everyone with place 1 or 2. If two runners in a house finish with exactly the same time, both share second place, and the notice shows both.

That is the top-N-per-group problem, and the SQL for it follows the story step for step.

## 2. Why GROUP BY Collapses the Rows

The first instinct is \`GROUP BY\`:

~~~sql
SELECT dept, MAX(salary) AS top_salary
FROM employees
GROUP BY dept
ORDER BY dept;
~~~

~~~text
dept | top_salary
Engineering | 160000
Legal | 130000
Sales | 110000
Support | 70000
~~~

📌 **Interview term: collapsing rows** — what \`GROUP BY\` does: every group becomes one output row, and only grouped columns or aggregates can be selected. The names are gone, and there is no way to ask for "the top two" because each department is already one row. (More in [How does GROUP BY work with aggregate functions?](/interview-question/how-does-group-by-work-with-aggregate-functions))

📌 **Interview term: window function** — a function that computes a value *for each row* from a set of related rows (its window), without merging the rows. The output has as many rows as the input. Background: [What are window functions?](/interview-question/what-are-window-functions)

## 3. The Pattern: Rank Inside Each Partition, Filter Outside

<svg class="iq-diagram" width="100%" viewBox="0 0 780 170" role="img" aria-label="Three steps: 11 employee rows, then the window function numbers rows inside each department, then the outer query keeps rank 1 and 2, giving 8 rows">
  <defs>
    <marker id="sql08q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="190" height="80" rx="10"/>
  <text class="d-text" x="115" y="74" text-anchor="middle">employees</text>
  <text class="d-sub" x="115" y="98" text-anchor="middle">11 rows, 4 depts</text>
  <rect class="d-box-accent" x="290" y="40" width="200" height="80" rx="10"/>
  <text class="d-text" x="390" y="74" text-anchor="middle">RANK() OVER</text>
  <text class="d-sub" x="390" y="98" text-anchor="middle">numbers each dept</text>
  <rect class="d-box" x="570" y="40" width="190" height="80" rx="10"/>
  <text class="d-text" x="665" y="74" text-anchor="middle">WHERE rnk &lt;= 2</text>
  <text class="d-sub" x="665" y="98" text-anchor="middle">outer query, 8 rows</text>
  <line class="d-edge-accent" x1="214" y1="80" x2="282" y2="80" marker-end="url(#sql08q1-arrow)"/>
  <line class="d-edge-accent" x1="494" y1="80" x2="562" y2="80" marker-end="url(#sql08q1-arrow)"/>
</svg>

The window does the numbering, the outer query does the cutting. Here is the first example:

~~~sql
WITH ranked AS (
  SELECT dept, name, salary,
         RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS rnk
  FROM employees
)
SELECT dept, name, salary, rnk
FROM ranked
WHERE rnk <= 2
ORDER BY dept, rnk, name;
~~~

~~~text
dept | name | salary | rnk
Engineering | Asha | 160000 | 1
Engineering | Ben | 150000 | 2
Engineering | Chen | 150000 | 2
Legal | Kai | 130000 | 1
Sales | Eli | 110000 | 1
Sales | Fatima | 95000 | 2
Support | Hana | 70000 | 1
Support | Ivan | 70000 | 1
~~~

Read the window clause piece by piece:

📌 **Interview term: PARTITION BY** — splits the rows into independent groups for the window function. Numbering restarts at 1 in each department. Unlike \`GROUP BY\`, it does not merge rows.

📌 **Interview term: ORDER BY inside OVER** — the order used to number the rows inside each partition. It is separate from the query final \`ORDER BY\`, which only sorts the output.

📌 **Interview term: RANK()** — gives each row 1 + the number of rows in its partition that come strictly before it. Rows that tie get the same rank, and the next rank skips (1, 2, 2, 4).

Look at Engineering: Ben and Chen both earn 150,000, so both get rank 2 and both are kept. Engineering returns **three** rows for a "top 2" question. Support is even more striking: Hana and Ivan tie for first, both rank 1, and Jo (65,000) gets rank 3 and is dropped. Legal has one employee and returns one row. That is 8 rows from 11.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="The Engineering partition sorted by salary: Asha rank 1, Ben and Chen tied at rank 2, Dara rank 4 below the cut line rank 2">
  <rect class="d-box-muted" x="20" y="20" width="720" height="44" rx="8"/>
  <text class="d-text" x="380" y="48" text-anchor="middle">Partition dept = Engineering, ORDER BY salary DESC</text>
  <rect class="d-box-accent" x="20" y="84" width="460" height="44" rx="6"/>
  <text class="d-text" x="40" y="112">Asha  160000</text>
  <text class="d-accent" x="560" y="112">rank 1</text>
  <rect class="d-box-accent" x="20" y="138" width="460" height="44" rx="6"/>
  <text class="d-text" x="40" y="166">Ben  150000</text>
  <text class="d-accent" x="560" y="166">rank 2</text>
  <rect class="d-box-accent" x="20" y="192" width="460" height="44" rx="6"/>
  <text class="d-text" x="40" y="220">Chen  150000</text>
  <text class="d-accent" x="560" y="220">rank 2 (tie)</text>
  <line class="d-edge-dashed" x1="20" y1="256" x2="740" y2="256"/>
  <rect class="d-box" x="20" y="276" width="460" height="44" rx="6"/>
  <text class="d-text" x="40" y="304">Dara  120000</text>
  <text class="d-sub" x="560" y="304">rank 4, dropped</text>
</svg>

The dashed line is the cut \`rnk <= 2\`. Dara is rank 4, not 3, because two people share rank 2.

## 4. Why the Filter Needs an Outer Query

It is tempting to write the filter in the same query. Both engines refuse:

~~~sql
SELECT name FROM employees
WHERE RANK() OVER (PARTITION BY dept ORDER BY salary DESC) <= 2;
~~~

~~~text
SQLite:      misuse of window function RANK()
PostgreSQL:  ERROR:  window functions are not allowed in WHERE
~~~

Using the alias does not help either: \`SELECT ..., RANK() OVER (...) AS rnk FROM employees WHERE rnk <= 2\` gives \`misuse of aliased window function rnk\` on SQLite and \`column "rnk" does not exist\` on PostgreSQL (both run here).

📌 **Interview term: logical order of evaluation** — SQL evaluates \`FROM\`, then \`WHERE\`, then \`GROUP BY\` and \`HAVING\`, then window functions, then \`SELECT\` aliases and \`ORDER BY\`. A window value does not exist yet when \`WHERE\` runs, so the filter must sit one level up, in a CTE or derived table. Full detail: [What is the logical order of execution of a SQL query?](/interview-question/what-is-the-logical-order-of-execution-of-a-sql-query)

Some analytic engines add a clause for this. 📌 **Interview term: QUALIFY** — a filter that runs after window functions, the way \`HAVING\` runs after aggregates. Snowflake documents it ([Snowflake QUALIFY](https://docs.snowflake.com/en/sql-reference/constructs/qualify.html)), and BigQuery and DuckDB support it too ([modern-sql.com: QUALIFY](https://modern-sql.com/caniuse/qualify)). PostgreSQL, SQLite, MySQL and SQL Server do not, so the CTE form is the portable one.

## 5. Ties: RANK, ROW_NUMBER or DENSE_RANK?

"Top 2" is ambiguous when values tie, and the choice of function *is* the business rule. The second example shows all three on the departments with ties:

~~~sql
SELECT dept, name, salary,
       ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC, id) AS row_num,
       RANK()       OVER (PARTITION BY dept ORDER BY salary DESC) AS rnk,
       DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS dense_rnk
FROM employees
WHERE dept IN ('Engineering', 'Support')
ORDER BY dept, salary DESC, id;
~~~

~~~text
dept | name | salary | row_num | rnk | dense_rnk
Engineering | Asha | 160000 | 1 | 1 | 1
Engineering | Ben | 150000 | 2 | 2 | 2
Engineering | Chen | 150000 | 3 | 2 | 2
Engineering | Dara | 120000 | 4 | 4 | 3
Support | Hana | 70000 | 1 | 1 | 1
Support | Ivan | 70000 | 2 | 1 | 1
Support | Jo | 65000 | 3 | 3 | 2
~~~

📌 **Interview term: ROW_NUMBER()** — a unique 1, 2, 3 per partition, even for ties. Which tied row gets the lower number is not defined unless the window \`ORDER BY\` has a unique tiebreaker (here \`id\`).

📌 **Interview term: DENSE_RANK()** — like \`RANK()\`, but with no gaps: tied rows share a number and the next distinct value gets the next number (1, 2, 2, 3).

Swap the function in the CTE and the top-2 result changes:

| Filter | Engineering | Support | Total rows | Meaning |
| :--- | :--- | :--- | :--- | :--- |
| \`ROW_NUMBER() <= 2\` | Asha, Ben | Hana, Ivan | 7 | Exactly N people per group |
| \`RANK() <= 2\` | Asha, Ben, Chen | Hana, Ivan | 8 | N places, ties at the edge included |
| \`DENSE_RANK() <= 2\` | Asha, Ben, Chen | Hana, Ivan, Jo | 9 | Everyone holding one of the top N distinct salaries |

\`ROW_NUMBER() <= 2\` on the full table:

~~~text
dept | name | salary | rn
Engineering | Asha | 160000 | 1
Engineering | Ben | 150000 | 2
Legal | Kai | 130000 | 1
Sales | Eli | 110000 | 1
Sales | Fatima | 95000 | 2
Support | Hana | 70000 | 1
Support | Ivan | 70000 | 2
~~~

\`DENSE_RANK() <= 2\` on the full table (Jo now appears, because 65,000 is the second distinct salary in Support):

~~~text
dept | name | salary | rnk
Engineering | Asha | 160000 | 1
Engineering | Ben | 150000 | 2
Engineering | Chen | 150000 | 2
Legal | Kai | 130000 | 1
Sales | Eli | 110000 | 1
Sales | Fatima | 95000 | 2
Support | Hana | 70000 | 1
Support | Ivan | 70000 | 1
Support | Jo | 65000 | 2
~~~

Asking for exactly the second value (\`rnk = 2\`) is a different question with its own traps: [How do you find the Nth highest salary?](/interview-question/how-do-you-find-the-nth-highest-salary) The three functions get their own page: [RANK() vs DENSE_RANK() vs ROW_NUMBER() — when does the gap matter and how do you choose?](/interview-question/rank-vs-dense-rank-vs-row-number-when-does-the-gap-matter-and-how-do-you-choose)

## 6. Without Window Functions: the Correlated Subquery

Older engines (SQLite before 3.25.0, MySQL before 8.0) have no window functions. SQLite added them in 3.25.0 ([SQLite release log](https://www.sqlite.org/releaselog/3_25_0.html)); MySQL lists window functions among the 8.0 features ([MySQL 8.0 GA announcement](https://dev.mysql.com/blog-archive/whats-new-in-mysql-8-0-generally-available)). The classic replacement translates the definition of \`RANK()\` literally: keep a row when fewer than 2 people in the same department earn strictly more.

~~~sql
SELECT e.dept, e.name, e.salary
FROM employees AS e
WHERE (SELECT COUNT(*)
       FROM employees AS x
       WHERE x.dept = e.dept
         AND x.salary > e.salary) < 2
ORDER BY e.dept, e.salary DESC, e.name;
~~~

~~~text
dept | name | salary
Engineering | Asha | 160000
Engineering | Ben | 150000
Engineering | Chen | 150000
Legal | Kai | 130000
Sales | Eli | 110000
Sales | Fatima | 95000
Support | Hana | 70000
Support | Ivan | 70000
~~~

The same 8 rows as \`RANK() <= 2\`. Counting \`DISTINCT x.salary\` instead gives the \`DENSE_RANK()\` meaning. The cost is the problem: the subquery runs once per outer row, so each department is scanned once per member (see [What is a subquery and what is a correlated subquery?](/interview-question/what-is-a-subquery-and-what-is-a-correlated-subquery)).

## 7. What PostgreSQL Does With It

The fourth example asks PostgreSQL 16 for the plan:

~~~sql
EXPLAIN (COSTS OFF)
SELECT dept, name, salary
FROM (
  SELECT dept, name, salary,
         RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS rnk
  FROM employees
) AS ranked
WHERE rnk <= 2;
~~~

~~~text
QUERY PLAN
Subquery Scan on ranked
  ->  WindowAgg
        Run Condition: (rank() OVER (?) <= 2)
        ->  Sort
              Sort Key: employees.dept, employees.salary DESC
              ->  Seq Scan on employees
~~~

Read it bottom-up: scan the table, **sort** by \`(dept, salary DESC)\` so each partition is contiguous and ordered, then **WindowAgg** computes the rank.

📌 **Interview term: Run Condition** — a window filter the planner pushed into the WindowAgg node. Because a rank can only grow inside a partition, once it passes 2 the executor knows the remaining rows of that partition can never qualify and skips them. This optimisation for \`row_number()\`, \`rank()\`, \`dense_rank()\` and \`count()\` arrived in PostgreSQL 15 ([Percona: window function improvements in PostgreSQL 15](https://www.percona.com/blog/introducing-performance-improvement-of-window-functions-in-postgresql-15/)). The plan above is from a tiny table; the planner may choose differently on real data.

The sort is still the big cost: every row is read and sorted. Two ways to do better:

- An index on \`(dept, salary DESC)\` lets the engine read rows already in window order and skip the Sort.
- When groups are large and N is small (top 3 of 10,000 orders per customer), a \`LATERAL\` join with \`ORDER BY ... LIMIT N\` per group reads only N index entries per group: see [LATERAL JOIN — how do you fetch the top 3 orders per customer efficiently?](/interview-question/lateral-join-how-do-you-fetch-the-top-3-orders-per-customer-efficiently) and the comparison in [LATERAL vs Window Function vs Correlated Subquery for top-N per group — which scales when?](/interview-question/lateral-vs-window-function-vs-correlated-subquery-for-top-n-per-group-which-scal)

## 8. Verified: Running the Code

The three SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above); they returned the same rows on PostgreSQL 16.15. The plan was produced on PostgreSQL 16.15 in a scratch database with the same schema. The error messages in section 4 and the extra queries in sections 2 and 5 were run the same way.

Example 1, \`RANK() <= 2\`:

~~~text
dept | name | salary | rnk
Engineering | Asha | 160000 | 1
Engineering | Ben | 150000 | 2
Engineering | Chen | 150000 | 2
Legal | Kai | 130000 | 1
Sales | Eli | 110000 | 1
Sales | Fatima | 95000 | 2
Support | Hana | 70000 | 1
Support | Ivan | 70000 | 1
~~~

Example 2, the three ranking functions:

~~~text
dept | name | salary | row_num | rnk | dense_rnk
Engineering | Asha | 160000 | 1 | 1 | 1
Engineering | Ben | 150000 | 2 | 2 | 2
Engineering | Chen | 150000 | 3 | 2 | 2
Engineering | Dara | 120000 | 4 | 4 | 3
Support | Hana | 70000 | 1 | 1 | 1
Support | Ivan | 70000 | 2 | 1 | 1
Support | Jo | 65000 | 3 | 3 | 2
~~~

Example 3, the correlated subquery:

~~~text
dept | name | salary
Engineering | Asha | 160000
Engineering | Ben | 150000
Engineering | Chen | 150000
Legal | Kai | 130000
Sales | Eli | 110000
Sales | Fatima | 95000
Support | Hana | 70000
Support | Ivan | 70000
~~~

Example 4, the PostgreSQL plan:

~~~text
QUERY PLAN
Subquery Scan on ranked
  ->  WindowAgg
        Run Condition: (rank() OVER (?) <= 2)
        ->  Sort
              Sort Key: employees.dept, employees.salary DESC
              ->  Seq Scan on employees
~~~

## Edge Cases

- **NULL salaries.** \`ORDER BY salary DESC\` puts NULL first on PostgreSQL (NULL sorts as the largest value) and last on SQLite. A NULL salary can take rank 1 on PostgreSQL. Write \`ORDER BY salary DESC NULLS LAST\` (both engines accept it; SQLite since 3.30.0, per its [release log](https://www.sqlite.org/releaselog/3_30_0.html)) or filter NULLs out.
- **Groups smaller than N.** They return all their rows; nothing pads them.
- **Top N overall plus per group.** Rank in one CTE, then apply a second \`ORDER BY ... LIMIT\` outside. Do not confuse \`LIMIT 2\` (two rows in total) with top 2 per group.
- **Ordering by several columns.** \`ORDER BY salary DESC, hire_date\` breaks salary ties by seniority; the rank only ties when every listed column ties.

## Common Pitfalls

- **Putting the window function in \`WHERE\`.** It is computed after \`WHERE\`; wrap it in a CTE or subquery.
- **Using \`RANK()\` and promising "exactly two".** Ties at the cut return more rows. Use \`ROW_NUMBER()\` with a tiebreaker if the API contract is exactly N.
- **\`ROW_NUMBER()\` without a unique tiebreaker.** Tied rows can swap between runs, and so can which one makes the cut.
- **Forgetting \`PARTITION BY\`.** Without it the numbering runs over the whole table and you get the top 2 of the company.
- **Relying on the CTE order for the output.** The final \`ORDER BY\` is still needed; the window \`ORDER BY\` only numbers rows.
- **Expecting the window query to be cheap on a big table.** It sorts everything. For small N per group, an index plus \`LATERAL ... LIMIT\` is often far faster.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Why not GROUP BY:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY dept</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MAX(salary)</code> collapses each department into one row and loses who earned it. I need every row kept and numbered, which is exactly what a <strong style="color:#ffca28;">window function</strong> does.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The pattern:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RANK() OVER (PARTITION BY dept ORDER BY salary DESC)</code> restarts the numbering in each department. I compute it in a CTE and filter <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE rnk &lt;= 2</code> in the outer query.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why the outer query:</strong> <span style="color:#f0e2c8;">Window functions run after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE RANK() OVER (...) &lt;= 2</code> is rejected: PostgreSQL says <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window functions are not allowed in WHERE</code>. Some warehouses (Snowflake, BigQuery, DuckDB) have <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">QUALIFY</code> for this.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Ties decide the function:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RANK() &lt;= 2</code> keeps everyone tied at second, so a group can return 3 rows. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROW_NUMBER()</code> with a tiebreaker such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">id</code> returns exactly 2. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DENSE_RANK() &lt;= 2</code> returns the top two distinct salaries, possibly more people.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Performance:</strong> <span style="color:#f0e2c8;">The window version sorts the whole table by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(dept, salary)</code>. PostgreSQL 15+ adds a <strong style="color:#ffca28;">Run Condition</strong> so it can stop numbering early. For a few rows per group out of millions, an index on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(dept, salary DESC)</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LATERAL ... LIMIT 2</code> is usually faster.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does a department with only one employee return?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Just that one row. The filter is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rnk &lt;= 2</code>, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rnk = 2</code>, so small groups are not dropped. Legal (only Kai) returns one row here.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you do this without window functions?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A correlated subquery: keep a row when fewer than 2 colleagues in the same department earn strictly more, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(SELECT COUNT(*) ... x.salary &gt; e.salary) &lt; 2</code>. That is exactly the definition of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RANK() &lt;= 2</code>, and it returned the same 8 rows here, but it re-scans the department for every row.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why add <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">id</code> to the ROW_NUMBER order?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Without it, Ben and Chen tie and the database may number them either way, so the "top 2" can change between runs. A unique tiebreaker makes the result <strong style="color:#ffca28;">deterministic</strong>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the 2nd highest salary only?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Filter <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rnk = 2</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DENSE_RANK()</code> if you mean the second distinct value. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RANK()</code>, a tie at first place means there is no rank 2 at all. That is the Nth-highest-salary question.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can the window filter be pushed into an index?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not directly; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE rnk &lt;= 2</code> filters a computed value. What helps is an index whose order matches <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PARTITION BY dept ORDER BY salary DESC</code> so the sort disappears, or a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LATERAL</code> join that reads the first 2 index entries per department.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Collapsing rows | \`GROUP BY\` turning each group into a single output row |
| Window function | A per-row calculation over related rows that keeps every row |
| PARTITION BY | Splits rows into groups whose numbering restarts at 1 |
| ORDER BY inside OVER | The order used to number rows inside each partition |
| RANK() | Tied rows share a number, the next number skips (1, 2, 2, 4) |
| ROW_NUMBER() | A unique 1, 2, 3 per partition, ties broken arbitrarily unless you add a tiebreaker |
| DENSE_RANK() | Tied rows share a number, no gaps (1, 2, 2, 3) |
| Logical order of evaluation | \`WHERE\` runs before window functions, so their results are filtered one level up |
| QUALIFY | A post-window filter in Snowflake, BigQuery and DuckDB |
| Run Condition | PostgreSQL 15+ plan detail: the window stops early once the filter can no longer match |

**Conclusion:** Top-N per group is "number the rows inside each group, then keep the small numbers". \`RANK() OVER (PARTITION BY dept ORDER BY salary DESC)\` does the numbering without collapsing rows, and an outer query filters \`rnk <= 2\` because window functions are evaluated after \`WHERE\`. The ranking function you choose is the tie policy: \`ROW_NUMBER()\` for exactly N, \`RANK()\` for N places including ties, \`DENSE_RANK()\` for the top N distinct values. On big tables, remember the sort it implies, and reach for an index or \`LATERAL\` when N is small and groups are large.`,
    examples: [
      {
        label: `Top 2 per department with RANK() in a CTE (ties are kept)`,
        code: `WITH ranked AS (
  SELECT dept, name, salary,
         RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS rnk
  FROM employees
)
SELECT dept, name, salary, rnk
FROM ranked
WHERE rnk <= 2
ORDER BY dept, rnk, name;`,
      },
      {
        label: `ROW_NUMBER vs RANK vs DENSE_RANK side by side on the tied departments`,
        code: `SELECT dept, name, salary,
       ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC, id) AS row_num,
       RANK()       OVER (PARTITION BY dept ORDER BY salary DESC) AS rnk,
       DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS dense_rnk
FROM employees
WHERE dept IN ('Engineering', 'Support')
ORDER BY dept, salary DESC, id;`,
      },
      {
        label: `Without window functions: a correlated COUNT(*) gives the same rows as RANK() <= 2`,
        code: `SELECT e.dept, e.name, e.salary
FROM employees AS e
WHERE (SELECT COUNT(*)
       FROM employees AS x
       WHERE x.dept = e.dept
         AND x.salary > e.salary) < 2
ORDER BY e.dept, e.salary DESC, e.name;`,
      },
      {
        label: `PostgreSQL: the plan shows a Run Condition on the window`,
        code: `EXPLAIN (COSTS OFF)
SELECT dept, name, salary
FROM (
  SELECT dept, name, salary,
         RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS rnk
  FROM employees
) AS ranked
WHERE rnk <= 2;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `How do you calculate year-over-year or month-over-month growth in SQL?`,
    difficulty: "medium",
    seoDescription: `Month-over-month and year-over-year growth in SQL with LAG() and a self join, plus the missing-month trap, integer division and divide-by-zero.`,
    description: `**Question presented to candidate:**
"Finance wants a report: for each month, revenue, the change versus the previous month as a percentage, and the change versus the same month last year. How would you write that in SQL, and what can go wrong with the numbers?"

**What a strong answer should cover:**
- The formula: growth % = (current - previous) / previous × 100, with \`NULLIF(previous, 0)\` so a zero base gives NULL instead of an error
- Month over month with \`LAG(revenue) OVER (ORDER BY month)\`: the previous *row*, computed in a CTE, then the arithmetic in the outer query
- Year over year either with \`LAG(revenue, 12)\` (only safe when every month has a row) or, more robustly, a self join on "same month, previous year"
- Missing months: \`LAG\` returns the previous row, not the previous calendar month; fill a calendar (\`generate_series\` in PostgreSQL, a recursive CTE elsewhere) or check that the months are adjacent
- Arithmetic traps: integer division truncates (\`100 * 8000 / 104000\` is 7), PostgreSQL raises \`division by zero\` while SQLite returns NULL, and the first period has no base (NULL, not 0 %)

**Clarifying questions expected:**
- Is the data already one row per month, or do I aggregate from raw orders (and in which time zone are the dates)?
- What should a month with no sales show: 0 revenue, or no row?
- Should a partial current month be compared with a full previous month?

**Code / implementation expected:** Yes — a LAG-based month-over-month query and a year-over-year comparison, with the division made safe.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE monthly_revenue (
  month TEXT PRIMARY KEY,
  revenue INTEGER NOT NULL
);
INSERT INTO monthly_revenue (month, revenue) VALUES
  ('2024-01', 100000),
  ('2024-02', 92000),
  ('2024-03', 110000),
  ('2024-04', 118000),
  ('2024-05', 121000),
  ('2024-07', 99000),
  ('2024-08', 104000),
  ('2024-09', 112000),
  ('2024-10', 125000),
  ('2024-11', 140000),
  ('2024-12', 168000),
  ('2025-01', 115000),
  ('2025-02', 101200),
  ('2025-03', 126500);
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  order_date TEXT NOT NULL,
  amount INTEGER NOT NULL
);
INSERT INTO orders (id, order_date, amount) VALUES
  (1, '2025-02-03', 40000),
  (2, '2025-02-17', 61200),
  (3, '2025-03-01', 30000),
  (4, '2025-03-09', 52500),
  (5, '2025-03-28', 44000);
\`\`\``,
    answer: `**Target Audience:** Beginners who can write \`GROUP BY\` and want to compare one period with the one before it, and candidates preparing for analytics interviews.
**Difficulty:** Medium
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15, both run for this page. \`LAG()\` is standard SQL and also exists in MySQL 8.0+ and SQL Server; the date functions differ per engine and are named where used.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and error message shown was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

You keep a notebook of your monthly savings. To know whether you are doing better, you look at this month, glance at the line above (last month), and do a quick sum: "I saved 125 this month and 112 last month, so that is 13 more, about 11.6 % up."

Now imagine you forgot to write June. When you reach July, "the line above" is May. If you are not careful you will say "July is down 18 % on the previous month" when really you are comparing with two months ago.

SQL growth reports are exactly this: put the previous value next to the current one, then do the sum. The interesting part is making sure "the line above" really is the previous month.

## 2. The Formula and the Vocabulary

📌 **Interview term: period-over-period growth** — the relative change between a value and the same measure one period earlier: \`(current - previous) / previous × 100\`. **MoM** (month over month) compares adjacent months; **YoY** (year over year) compares a month with the same month a year earlier, which removes seasonality (December is always big for a shop).

📌 **Interview term: base period** — the earlier value you divide by. If it is 0 or missing, the percentage is undefined.

Rows in a table are independent, so the job is to bring the previous value onto the current row. Three tools do it:

| Tool | Gets you | Safe when |
| :--- | :--- | :--- |
| \`LAG(revenue)\` | the value one row back | every period has exactly one row |
| \`LAG(revenue, 12)\` | the value 12 rows back | same, and the data is monthly |
| Self join on the period key | the value of a named earlier period | always; missing periods give NULL |

If the data is raw orders, aggregate it to one row per month first. With dates stored as \`'YYYY-MM-DD'\` text, \`substr(order_date, 1, 7)\` gives the month on both engines run here (on a real \`DATE\` or \`timestamp\` column use \`date_trunc('month', ...)\` in PostgreSQL or \`strftime('%Y-%m', ...)\` in SQLite):

~~~sql
SELECT substr(order_date, 1, 7) AS month, SUM(amount) AS revenue
FROM orders
GROUP BY substr(order_date, 1, 7)
ORDER BY month;
~~~

~~~text
month | revenue
2025-02 | 101200
2025-03 | 126500
~~~

These match the 2025-02 and 2025-03 rows of \`monthly_revenue\`; the rest of this page uses that table.

## 3. Month over Month With LAG

📌 **Interview term: LAG()** — a window function that returns a value from a row *before* the current row in the window order, by default one row back, NULL if there is none. Its mirror is \`LEAD()\`. Fundamentals: [What do the LAG and LEAD window functions do?](/interview-question/what-do-the-lag-and-lead-window-functions-do)

~~~sql
WITH m AS (
  SELECT month, revenue,
         LAG(revenue) OVER (ORDER BY month) AS prev_revenue
  FROM monthly_revenue
)
SELECT month, revenue, prev_revenue,
       revenue - prev_revenue AS change,
       ROUND(100.0 * (revenue - prev_revenue) / NULLIF(prev_revenue, 0), 1) AS mom_pct
FROM m
WHERE month >= '2024-09'
ORDER BY month;
~~~

~~~text
month | revenue | prev_revenue | change | mom_pct
2024-09 | 112000 | 104000 | 8000 | 7.7
2024-10 | 125000 | 112000 | 13000 | 11.6
2024-11 | 140000 | 125000 | 15000 | 12
2024-12 | 168000 | 140000 | 28000 | 20
2025-01 | 115000 | 168000 | -53000 | -31.5
2025-02 | 101200 | 115000 | -13800 | -12
2025-03 | 126500 | 101200 | 25300 | 25
~~~

Three details carry the whole query:

1. **\`LAG\` lives in a CTE.** The \`WHERE month >= '2024-09'\` filter is in the outer query on purpose. Filtering inside the CTE would remove August before \`LAG\` runs, and September would have no previous value. (Window functions run after \`WHERE\`; see [What is the logical order of execution of a SQL query?](/interview-question/what-is-the-logical-order-of-execution-of-a-sql-query))
2. **\`100.0 *\` forces decimal maths.** Both columns are integers, and integer division truncates on both engines run here:

~~~sql
SELECT 100 * (112000 - 104000) / 104000 AS int_pct,
       ROUND(100.0 * (112000 - 104000) / 104000, 1) AS decimal_pct;
~~~

~~~text
int_pct | decimal_pct
7 | 7.7
~~~

3. **\`NULLIF(prev_revenue, 0)\`** turns a zero base into NULL. Without it, a zero divisor behaves differently per engine: \`SELECT 5 / 0\` returned NULL on SQLite and \`ERROR:  division by zero\` on PostgreSQL when run for this page. See [What do COALESCE and NULLIF do?](/interview-question/what-do-coalesce-and-nullif-do)

📌 **Interview term: ROUND(x, n)** — rounds to n decimal places. Note how the engines print the same value: SQLite shows \`12\` (a REAL with no fraction) where PostgreSQL shows \`12.0\` (a NUMERIC that keeps its scale). The numbers are identical; only the display differs. The SQLite run is quoted in the Verified section; this is the PostgreSQL run of the same query:

~~~text
month | revenue | prev_revenue | change | mom_pct
2024-09 | 112000 | 104000 | 8000 | 7.7
2024-10 | 125000 | 112000 | 13000 | 11.6
2024-11 | 140000 | 125000 | 15000 | 12.0
2024-12 | 168000 | 140000 | 28000 | 20.0
2025-01 | 115000 | 168000 | -53000 | -31.5
2025-02 | 101200 | 115000 | -13800 | -12.0
2025-03 | 126500 | 101200 | 25300 | 25.0
~~~

## 4. Year over Year

January is down 31.5 % on December, which sounds alarming until you remember December is the holiday month. YoY compares like with like. The robust way is a self join: each month joined to the row with the same month number and the previous year.

~~~sql
SELECT cur.month,
       cur.revenue,
       prev.revenue AS revenue_last_year,
       ROUND(100.0 * (cur.revenue - prev.revenue) / NULLIF(prev.revenue, 0), 1) AS yoy_pct
FROM monthly_revenue AS cur
LEFT JOIN monthly_revenue AS prev
  ON CAST(substr(prev.month, 1, 4) AS INTEGER) = CAST(substr(cur.month, 1, 4) AS INTEGER) - 1
 AND substr(prev.month, 6, 2) = substr(cur.month, 6, 2)
WHERE cur.month >= '2025-01'
ORDER BY cur.month;
~~~

~~~text
month | revenue | revenue_last_year | yoy_pct
2025-01 | 115000 | 100000 | 15
2025-02 | 101200 | 92000 | 10
2025-03 | 126500 | 110000 | 15
~~~

The same January that was −31.5 % MoM is **+15 % YoY**. The \`LEFT JOIN\` keeps months with no year-ago row (they get NULL). On a real \`DATE\` column the join condition reads more naturally: \`prev.month = cur.month - INTERVAL '1 year'\` in PostgreSQL, \`prev.month = date(cur.month, '-1 year')\` in SQLite. (Self joins have their own page: [What is a self join?](/interview-question/what-is-a-self-join))

Why not \`LAG(revenue, 12)\`? Because "12 rows back" is only "12 months back" if no month is missing. In this data June 2024 has no row, so:

~~~sql
SELECT month, revenue,
       LAG(month, 12)   OVER (ORDER BY month) AS twelve_rows_back,
       LAG(revenue, 12) OVER (ORDER BY month) AS revenue_12_rows_back
FROM monthly_revenue
ORDER BY month DESC
LIMIT 2;
~~~

~~~text
month | revenue | twelve_rows_back | revenue_12_rows_back
2025-03 | 126500 | 2024-02 | 92000
2025-02 | 101200 | 2024-01 | 100000
~~~

March 2025 is silently compared with **February** 2024. Nothing errors; the number is just wrong.

## 5. The Missing-Month Trap

<svg class="iq-diagram" width="100%" viewBox="0 0 780 200" role="img" aria-label="LAG looks one row back. The row before 2024-07 is 2024-05 because 2024-06 has no row, so the comparison silently spans two months">
  <defs>
    <marker id="sql08q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="150" height="60" rx="8"/>
  <text class="d-text" x="95" y="68" text-anchor="middle">2024-04</text>
  <text class="d-sub" x="95" y="88" text-anchor="middle">118000</text>
  <rect class="d-box" x="210" y="40" width="150" height="60" rx="8"/>
  <text class="d-text" x="285" y="68" text-anchor="middle">2024-05</text>
  <text class="d-sub" x="285" y="88" text-anchor="middle">121000</text>
  <rect class="d-box-muted" x="400" y="40" width="150" height="60" rx="8"/>
  <text class="d-sub" x="475" y="68" text-anchor="middle">2024-06</text>
  <text class="d-sub" x="475" y="88" text-anchor="middle">no row</text>
  <rect class="d-box-accent" x="590" y="40" width="170" height="60" rx="8"/>
  <text class="d-text" x="675" y="68" text-anchor="middle">2024-07</text>
  <text class="d-sub" x="675" y="88" text-anchor="middle">99000</text>
  <path class="d-edge-accent" d="M 640 104 L 640 150 L 300 150 L 300 108" marker-end="url(#sql08q2-arrow)"/>
  <text class="d-accent" x="470" y="182" text-anchor="middle">LAG: previous row, two months back</text>
</svg>

The same problem hits MoM. The third example puts the naive calculation next to a safe one that converts each month to a number (\`year * 12 + month\`) and only computes growth when the previous row is exactly one month earlier:

~~~sql
WITH m AS (
  SELECT month, revenue,
         CAST(substr(month, 1, 4) AS INTEGER) * 12
           + CAST(substr(month, 6, 2) AS INTEGER) AS month_no
  FROM monthly_revenue
), w AS (
  SELECT month, revenue, month_no,
         LAG(month)    OVER (ORDER BY month) AS prev_row_month,
         LAG(revenue)  OVER (ORDER BY month) AS prev_revenue,
         LAG(month_no) OVER (ORDER BY month) AS prev_month_no
  FROM m
)
SELECT month, prev_row_month,
       ROUND(100.0 * (revenue - prev_revenue) / prev_revenue, 1) AS naive_mom_pct,
       CASE WHEN month_no - prev_month_no = 1
            THEN ROUND(100.0 * (revenue - prev_revenue) / prev_revenue, 1)
       END AS safe_mom_pct
FROM w
WHERE month BETWEEN '2024-04' AND '2024-08'
ORDER BY month;
~~~

~~~text
month | prev_row_month | naive_mom_pct | safe_mom_pct
2024-04 | 2024-03 | 7.3 | 7.3
2024-05 | 2024-04 | 2.5 | 2.5
2024-07 | 2024-05 | -18.2 | NULL
2024-08 | 2024-07 | 5.1 | 5.1
~~~

The naive column reports July as −18.2 % "month over month" when it is really July against May.

📌 **Interview term: calendar table (date spine)** — a list of every period in a range, used as the left side of a \`LEFT JOIN\` so missing periods appear as rows with NULL data. In PostgreSQL, \`generate_series\` builds it on the fly; in SQLite or MySQL a recursive CTE does the same job ([How do recursive CTEs work?](/interview-question/how-do-recursive-ctes-work)). The fourth example fills the calendar first, then applies \`LAG\`:

~~~sql
WITH calendar AS (
  SELECT to_char(d, 'YYYY-MM') AS month
  FROM generate_series(DATE '2024-03-01', DATE '2024-08-01', INTERVAL '1 month') AS g(d)
), filled AS (
  SELECT c.month, r.revenue,
         LAG(r.revenue) OVER (ORDER BY c.month) AS prev_revenue
  FROM calendar AS c
  LEFT JOIN monthly_revenue AS r ON r.month = c.month
)
SELECT month, revenue, prev_revenue,
       ROUND(100.0 * (revenue - prev_revenue) / NULLIF(prev_revenue, 0), 1) AS mom_pct
FROM filled
WHERE month >= '2024-04'
ORDER BY month;
~~~

~~~text
month | revenue | prev_revenue | mom_pct
2024-04 | 118000 | 110000 | 7.3
2024-05 | 121000 | 118000 | 2.5
2024-06 | NULL | 121000 | NULL
2024-07 | 99000 | NULL | NULL
2024-08 | 104000 | 99000 | 5.1
~~~

Now June exists as a row with NULL revenue, and July correctly has no base. If a missing month really means "zero sales", write \`COALESCE(r.revenue, 0)\` in \`filled\`; then July growth becomes NULL through \`NULLIF\`, since growth from zero is undefined. The calendar starts in March so that April has a base; starting it in April would give April a NULL previous value.

## 6. Variations You Will Be Asked About

- **Per group.** Growth per product or region: \`LAG(revenue) OVER (PARTITION BY product_id ORDER BY month)\`. Without \`PARTITION BY\`, the first month of one product is compared with the last month of another.
- **One query from raw data.** Window functions run after \`GROUP BY\`, so \`SELECT month, SUM(amount), LAG(SUM(amount)) OVER (ORDER BY month) ... GROUP BY month\` is legal; the CTE form is easier to read.
- **Running totals and moving averages** (year to date, 3-month rolling average) use window frames rather than \`LAG\`: [How do you calculate a running total or moving average?](/interview-question/how-do-you-calculate-a-running-total-or-moving-average)
- **Weekly data.** "Same week last year" is ambiguous because ISO years can have 52 or 53 weeks; agree on the definition before writing the join.

## 7. Verified: Running the Code

The three SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above); on PostgreSQL 16.15 they returned the same values, printed as NUMERIC (\`12.0\` where SQLite prints \`12\`, as shown in section 3). The calendar example was run on PostgreSQL 16.15 in a scratch database with the same schema. The extra queries and error messages in sections 2 to 5 were run the same way.

Example 1, month over month:

~~~text
month | revenue | prev_revenue | change | mom_pct
2024-09 | 112000 | 104000 | 8000 | 7.7
2024-10 | 125000 | 112000 | 13000 | 11.6
2024-11 | 140000 | 125000 | 15000 | 12
2024-12 | 168000 | 140000 | 28000 | 20
2025-01 | 115000 | 168000 | -53000 | -31.5
2025-02 | 101200 | 115000 | -13800 | -12
2025-03 | 126500 | 101200 | 25300 | 25
~~~

Example 2, year over year:

~~~text
month | revenue | revenue_last_year | yoy_pct
2025-01 | 115000 | 100000 | 15
2025-02 | 101200 | 92000 | 10
2025-03 | 126500 | 110000 | 15
~~~

Example 3, the missing-month trap:

~~~text
month | prev_row_month | naive_mom_pct | safe_mom_pct
2024-04 | 2024-03 | 7.3 | 7.3
2024-05 | 2024-04 | 2.5 | 2.5
2024-07 | 2024-05 | -18.2 | NULL
2024-08 | 2024-07 | 5.1 | 5.1
~~~

Example 4, PostgreSQL calendar fill:

~~~text
month | revenue | prev_revenue | mom_pct
2024-04 | 118000 | 110000 | 7.3
2024-05 | 121000 | 118000 | 2.5
2024-06 | NULL | 121000 | NULL
2024-07 | 99000 | NULL | NULL
2024-08 | 104000 | 99000 | 5.1
~~~

## Edge Cases

- **The first period.** It has no base; its growth is NULL. Do not \`COALESCE\` it to 0 %, which claims "no change".
- **Negative bases.** Growth from −100 to −50 computes as −50 % although the result improved. For profit or net figures, report the absolute change, or divide by \`ABS(previous)\`.
- **Partial current month.** Comparing 17 days of October with all of September always looks like a drop; compare month-to-date with the same days of the previous month, or exclude the open month.
- **Time zones.** Truncating a UTC timestamp to a month can move orders from the evening of the 31st into the next month for a customer in another zone. Truncate in the business time zone.

## Common Pitfalls

- **Assuming \`LAG\` means "previous month".** It means previous row. Missing months shift every later comparison; use a calendar table or check adjacency.
- **Integer division.** \`100 * diff / prev\` on integer columns truncates (7 instead of 7.7). Multiply by \`100.0\` or cast first.
- **Dividing by a zero base.** PostgreSQL raises \`division by zero\` and fails the whole report; SQLite returns NULL silently. Use \`NULLIF(prev, 0)\`.
- **Filtering before \`LAG\`.** A \`WHERE month >= '2024-09'\` inside the CTE removes the base row the first month needs.
- **Forgetting \`PARTITION BY\` for per-group growth**, which compares across groups.
- **Averaging monthly percentages.** +50 % then −50 % averages to 0 % but leaves you at 75 % of the start. Use the compound rate for multi-period growth.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Formula:</strong> <span style="color:#f0e2c8;">Growth is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(current - previous) / previous * 100</code>. The whole question is how to put the previous value on the same row as the current one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Month over month:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LAG(revenue) OVER (ORDER BY month)</code> brings the previous row value onto the current row. I compute it in a CTE, then do the arithmetic outside, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">100.0 *</code> to force decimal maths and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NULLIF(prev, 0)</code> so a zero base gives NULL instead of an error.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Year over year:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LAG(revenue, 12)</code> works only if every month has a row. The robust form is a self join to the same month of the previous year, which cannot be fooled by a missing month.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The trap:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LAG</code> means previous <strong style="color:#ffca28;">row</strong>, not previous <strong style="color:#ffca28;">month</strong>. If June has no row, July is compared with May. I either build a calendar with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">generate_series</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LEFT JOIN</code> the data to it, or check that the months are adjacent.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Presentation:</strong> <span style="color:#f0e2c8;">The first period has no base, so its growth is NULL, not 0 %. I would also ask whether a partial current month should be compared, and about time zones when truncating timestamps to months.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">100.0</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">100</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With integer columns, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">100 * 8000 / 104000</code> is integer division and gives 7 on both SQLite and PostgreSQL. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">100.0</code> makes the expression decimal, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROUND(..., 1)</code> gives 7.7.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if last month revenue was 0?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Growth from zero is undefined. PostgreSQL raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ERROR: division by zero</code>; SQLite silently returns NULL. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NULLIF(prev, 0)</code> makes both return NULL, and the report shows the absolute change instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you do it on daily data?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Truncate to the period first: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">date_trunc('month', ts)</code> in PostgreSQL, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strftime('%Y-%m', d)</code> in SQLite, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY</code> that, then apply <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LAG</code> over the grouped rows. Window functions run after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY</code>, so it can even be one query.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you compute growth per product?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PARTITION BY product_id</code> to the window: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LAG(revenue) OVER (PARTITION BY product_id ORDER BY month)</code>. Without it, the first month of product B is compared with the last month of product A.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is percentage growth enough for a dashboard?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Show the absolute change too: +100 % from 1 to 2 orders looks dramatic. Over many periods, the compound growth rate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(last / first)^(1/n) - 1</code> is the honest average, not the mean of the monthly percentages.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Period-over-period growth | \`(current - previous) / previous × 100\` for adjacent periods |
| MoM / YoY | Month over month; year over year (same month a year earlier) |
| Base period | The earlier value that the change is divided by |
| LAG() | Window function returning a value from an earlier row in the window order |
| ROUND(x, n) | Round to n decimal places; SQLite prints REAL, PostgreSQL prints NUMERIC with its scale |
| Calendar table (date spine) | Every period in a range, left-joined to the data so gaps appear as rows |

**Conclusion:** Growth in SQL is a two-step job: put the base value on the current row, then divide carefully. \`LAG()\` in a CTE does month over month in one pass; a self join on "same month, previous year" does year over year without being fooled by gaps. The arithmetic needs \`100.0\` to avoid integer division and \`NULLIF(previous, 0)\` to survive a zero base, and the data needs one row per period, which a calendar built with \`generate_series\` or a recursive CTE guarantees. Say "previous row is not previous month" in the interview and you have answered the follow-up before it is asked.`,
    examples: [
      {
        label: `Month over month with LAG(), computed in a CTE and made safe with NULLIF`,
        code: `WITH m AS (
  SELECT month, revenue,
         LAG(revenue) OVER (ORDER BY month) AS prev_revenue
  FROM monthly_revenue
)
SELECT month, revenue, prev_revenue,
       revenue - prev_revenue AS change,
       ROUND(100.0 * (revenue - prev_revenue) / NULLIF(prev_revenue, 0), 1) AS mom_pct
FROM m
WHERE month >= '2024-09'
ORDER BY month;`,
      },
      {
        label: `Year over year: join each month to the same month of the previous year`,
        code: `SELECT cur.month,
       cur.revenue,
       prev.revenue AS revenue_last_year,
       ROUND(100.0 * (cur.revenue - prev.revenue) / NULLIF(prev.revenue, 0), 1) AS yoy_pct
FROM monthly_revenue AS cur
LEFT JOIN monthly_revenue AS prev
  ON CAST(substr(prev.month, 1, 4) AS INTEGER) = CAST(substr(cur.month, 1, 4) AS INTEGER) - 1
 AND substr(prev.month, 6, 2) = substr(cur.month, 6, 2)
WHERE cur.month >= '2025-01'
ORDER BY cur.month;`,
      },
      {
        label: `The missing-month trap: LAG compares July with May unless you check adjacency`,
        code: `WITH m AS (
  SELECT month, revenue,
         CAST(substr(month, 1, 4) AS INTEGER) * 12
           + CAST(substr(month, 6, 2) AS INTEGER) AS month_no
  FROM monthly_revenue
), w AS (
  SELECT month, revenue, month_no,
         LAG(month)    OVER (ORDER BY month) AS prev_row_month,
         LAG(revenue)  OVER (ORDER BY month) AS prev_revenue,
         LAG(month_no) OVER (ORDER BY month) AS prev_month_no
  FROM m
)
SELECT month, prev_row_month,
       ROUND(100.0 * (revenue - prev_revenue) / prev_revenue, 1) AS naive_mom_pct,
       CASE WHEN month_no - prev_month_no = 1
            THEN ROUND(100.0 * (revenue - prev_revenue) / prev_revenue, 1)
       END AS safe_mom_pct
FROM w
WHERE month BETWEEN '2024-04' AND '2024-08'
ORDER BY month;`,
      },
      {
        label: `PostgreSQL: fill a calendar with generate_series, then LAG over the full month list`,
        code: `WITH calendar AS (
  SELECT to_char(d, 'YYYY-MM') AS month
  FROM generate_series(DATE '2024-03-01', DATE '2024-08-01', INTERVAL '1 month') AS g(d)
), filled AS (
  SELECT c.month, r.revenue,
         LAG(r.revenue) OVER (ORDER BY c.month) AS prev_revenue
  FROM calendar AS c
  LEFT JOIN monthly_revenue AS r ON r.month = c.month
)
SELECT month, revenue, prev_revenue,
       ROUND(100.0 * (revenue - prev_revenue) / NULLIF(prev_revenue, 0), 1) AS mom_pct
FROM filled
WHERE month >= '2024-04'
ORDER BY month;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `How do you solve gaps-and-islands problems in SQL?`,
    difficulty: "hard",
    seoDescription: `Solve gaps and islands in SQL: LEAD() for missing ranges, value minus ROW_NUMBER() for streaks, and a LAG change flag with a running SUM for status runs.`,
    description: `**Question presented to candidate:**
"Two related problems. First, our invoice numbers should be continuous, so find every missing range. Second, from the \`logins\` table, find each user's streaks of consecutive login days, with start date, end date and length. How do you approach these gaps-and-islands problems in SQL?"

**What a strong answer should cover:**
- The vocabulary: an **island** is a maximal run of consecutive values (or consecutive rows with the same state), a **gap** is the space between islands
- Gaps: \`LEAD(x) OVER (ORDER BY x)\` puts the next value on each row; where \`next - x > 1\` there is a gap from \`x + 1\` to \`next - 1\`
- Islands, method 1 (difference of sequences): \`value - ROW_NUMBER()\` is constant inside a run of consecutive values, so it works as a group key for \`GROUP BY\`
- Islands, method 2 (change flag + running sum): \`LAG\` marks rows where the state changes, a running \`SUM\` of the flags numbers the runs; works for "same status" runs where values are not numbers
- Pitfalls: duplicates break the ROW_NUMBER trick (de-duplicate first or use \`DENSE_RANK\`), \`PARTITION BY\` per entity, and the date arithmetic differs per engine

**Clarifying questions expected:**
- Can the same value appear twice (two logins on one day), and does it count once?
- What counts as "consecutive": calendar days, business days, or a tolerance such as "within 30 minutes"?
- Is the expected output one row per island, or each row tagged with its island?

**Code / implementation expected:** Yes — a LEAD-based gap query and at least one island-grouping query with the ROW_NUMBER difference or the running-sum technique.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE invoices (
  invoice_no INTEGER PRIMARY KEY,
  amount INTEGER NOT NULL
);
INSERT INTO invoices (invoice_no, amount) VALUES
  (1001, 250), (1002, 120), (1003, 480), (1006, 75), (1007, 310), (1010, 95);
CREATE TABLE logins (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL,
  login_date TEXT NOT NULL
);
INSERT INTO logins (id, user_id, login_date) VALUES
  (1, 'ana', '2025-03-01'),
  (2, 'ana', '2025-03-02'),
  (3, 'ana', '2025-03-02'),
  (4, 'ana', '2025-03-03'),
  (5, 'ana', '2025-03-06'),
  (6, 'ana', '2025-03-07'),
  (7, 'ana', '2025-03-10'),
  (8, 'raj', '2025-03-01'),
  (9, 'raj', '2025-03-03'),
  (10, 'raj', '2025-03-04'),
  (11, 'raj', '2025-03-05'),
  (12, 'raj', '2025-03-06');
CREATE TABLE readings (
  id INTEGER PRIMARY KEY,
  reading_time TEXT NOT NULL,
  status TEXT NOT NULL
);
INSERT INTO readings (id, reading_time, status) VALUES
  (1, '10:00', 'up'),
  (2, '10:05', 'up'),
  (3, '10:10', 'down'),
  (4, '10:15', 'down'),
  (5, '10:20', 'down'),
  (6, '10:25', 'up'),
  (7, '10:30', 'down'),
  (8, '10:35', 'up'),
  (9, '10:40', 'up');
\`\`\``,
    answer: `**Target Audience:** Learners who know \`ROW_NUMBER()\` and \`LAG()\` and want to apply them to runs and holes in data, and candidates preparing for one of the classic hard SQL interview puzzles.
**Difficulty:** Hard
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15, both run for this page. The window functions are standard SQL; the date arithmetic is engine-specific and is shown for both.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and error message shown was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

Picture a wall calendar where you tick every day you went for a run. Stand back and two kinds of pattern jump out: blocks of ticks next to each other ("I ran four days in a row") and empty stretches between them ("I skipped two days").

Your eye finds those blocks instantly. A database cannot "see" neighbours: each row is independent. Gaps and islands are the techniques that let SQL find those blocks and holes, and they turn up everywhere: missing invoice numbers an auditor asks about, login streaks for a gamified app, the periods a server was down, the date ranges a room was booked, the sessions in a stream of clicks.

## 2. The Vocabulary

📌 **Interview term: island** — a maximal run of consecutive values (1001, 1002, 1003) or of consecutive rows sharing a state (three "down" readings in a row). "Maximal" means it cannot be extended: the value before and after does not belong.

📌 **Interview term: gap** — a range of values missing between two islands.

<svg class="iq-diagram" width="100%" viewBox="0 0 780 190" role="img" aria-label="Invoice numbers 1001 to 1010 on a line. 1001 to 1003, 1006 to 1007 and 1010 are present and form three islands. 1004 to 1005 and 1008 to 1009 are missing and form two gaps">
  <rect class="d-box-accent" x="20" y="40" width="62" height="50" rx="6"/>
  <text class="d-text" x="51" y="70" text-anchor="middle">1001</text>
  <rect class="d-box-accent" x="96" y="40" width="62" height="50" rx="6"/>
  <text class="d-text" x="127" y="70" text-anchor="middle">1002</text>
  <rect class="d-box-accent" x="172" y="40" width="62" height="50" rx="6"/>
  <text class="d-text" x="203" y="70" text-anchor="middle">1003</text>
  <rect class="d-box-muted" x="248" y="40" width="62" height="50" rx="6"/>
  <text class="d-sub" x="279" y="70" text-anchor="middle">1004</text>
  <rect class="d-box-muted" x="324" y="40" width="62" height="50" rx="6"/>
  <text class="d-sub" x="355" y="70" text-anchor="middle">1005</text>
  <rect class="d-box-accent" x="400" y="40" width="62" height="50" rx="6"/>
  <text class="d-text" x="431" y="70" text-anchor="middle">1006</text>
  <rect class="d-box-accent" x="476" y="40" width="62" height="50" rx="6"/>
  <text class="d-text" x="507" y="70" text-anchor="middle">1007</text>
  <rect class="d-box-muted" x="552" y="40" width="62" height="50" rx="6"/>
  <text class="d-sub" x="583" y="70" text-anchor="middle">1008</text>
  <rect class="d-box-muted" x="628" y="40" width="62" height="50" rx="6"/>
  <text class="d-sub" x="659" y="70" text-anchor="middle">1009</text>
  <rect class="d-box-accent" x="704" y="40" width="62" height="50" rx="6"/>
  <text class="d-text" x="735" y="70" text-anchor="middle">1010</text>
  <line class="d-edge-accent" x1="20" y1="120" x2="234" y2="120"/>
  <text class="d-accent" x="127" y="150" text-anchor="middle">island 1</text>
  <line class="d-edge-dashed" x1="248" y1="120" x2="386" y2="120"/>
  <text class="d-sub" x="317" y="150" text-anchor="middle">gap</text>
  <line class="d-edge-accent" x1="400" y1="120" x2="538" y2="120"/>
  <text class="d-accent" x="469" y="150" text-anchor="middle">island 2</text>
  <line class="d-edge-dashed" x1="552" y1="120" x2="690" y2="120"/>
  <text class="d-sub" x="621" y="150" text-anchor="middle">gap</text>
  <line class="d-edge-accent" x1="704" y1="120" x2="766" y2="120"/>
  <text class="d-accent" x="735" y="150" text-anchor="middle">island 3</text>
</svg>

The present invoice numbers form three islands and two gaps. Every technique on this page is a way of comparing a row with its neighbour, which is the job of window functions ([What are window functions?](/interview-question/what-are-window-functions)).

## 3. Finding Gaps With LEAD

📌 **Interview term: LEAD()** — a window function that returns a value from the *next* row in the window order (its mirror \`LAG()\` looks back; see [What do the LAG and LEAD window functions do?](/interview-question/what-do-the-lag-and-lead-window-functions-do)).

Put the next invoice number on every row. Wherever the next number is more than one higher, there is a hole:

~~~sql
WITH nxt AS (
  SELECT invoice_no,
         LEAD(invoice_no) OVER (ORDER BY invoice_no) AS next_no
  FROM invoices
)
SELECT invoice_no + 1 AS gap_start,
       next_no - 1    AS gap_end,
       next_no - invoice_no - 1 AS missing
FROM nxt
WHERE next_no - invoice_no > 1
ORDER BY gap_start;
~~~

~~~text
gap_start | gap_end | missing
1004 | 1005 | 2
1008 | 1009 | 2
~~~

The last row (1010) has no next row, \`LEAD\` returns NULL, and \`NULL > 1\` is not true, so it drops out by itself. This returns **one row per gap**, so it scales even when gaps are huge.

If you need every missing number individually (and the range is small), generate the full range and anti-join. In PostgreSQL:

~~~sql
SELECT n AS missing_no
FROM generate_series(1001, 1010) AS g(n)
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = n)
ORDER BY n;
~~~

~~~text
missing_no
1004
1005
1008
1009
~~~

(Run on PostgreSQL 16.15. In the sql.js build this page uses, \`SELECT value FROM generate_series(1,3)\` fails with \`no such table: generate_series\`, because that table-valued function is an optional SQLite extension; a recursive CTE builds the range there, see [How do recursive CTEs work?](/interview-question/how-do-recursive-ctes-work).)

## 4. Islands, Method 1: The Difference of Two Sequences

This is the famous trick. Take each user distinct login dates in order and number them 1, 2, 3, ... with \`ROW_NUMBER()\`. Inside a streak, the date goes up by one day *and* the row number goes up by one. So **date minus row number stays the same** for the whole streak. After a gap the date jumps by more than one but the row number still only goes up by one, so the difference changes.

<svg class="iq-diagram" width="100%" viewBox="0 0 780 260" role="img" aria-label="Two sequences climbing together. Dates rise by one and the row number rises by one inside a streak, so their difference stays the same. After a gap the dates jump but the row number does not, so the difference changes">
  <rect class="d-box-muted" x="20" y="20" width="220" height="44" rx="8"/>
  <text class="d-text" x="130" y="48" text-anchor="middle">login_date</text>
  <rect class="d-box-muted" x="280" y="20" width="200" height="44" rx="8"/>
  <text class="d-text" x="380" y="48" text-anchor="middle">minus row number</text>
  <rect class="d-box-muted" x="520" y="20" width="240" height="44" rx="8"/>
  <text class="d-text" x="640" y="48" text-anchor="middle">group key</text>
  <rect class="d-box" x="20" y="90" width="220" height="40" rx="6"/>
  <text class="d-text" x="130" y="116" text-anchor="middle">03-01, 03-02, 03-03</text>
  <rect class="d-box" x="280" y="90" width="200" height="40" rx="6"/>
  <text class="d-text" x="380" y="116" text-anchor="middle">1, 2, 3</text>
  <rect class="d-box-accent" x="520" y="90" width="240" height="40" rx="6"/>
  <text class="d-text" x="640" y="116" text-anchor="middle">02-28 for all three</text>
  <rect class="d-box" x="20" y="150" width="220" height="40" rx="6"/>
  <text class="d-text" x="130" y="176" text-anchor="middle">03-06, 03-07</text>
  <rect class="d-box" x="280" y="150" width="200" height="40" rx="6"/>
  <text class="d-text" x="380" y="176" text-anchor="middle">4, 5</text>
  <rect class="d-box-accent" x="520" y="150" width="240" height="40" rx="6"/>
  <text class="d-text" x="640" y="176" text-anchor="middle">03-02 for both</text>
  <rect class="d-box" x="20" y="210" width="220" height="40" rx="6"/>
  <text class="d-text" x="130" y="236" text-anchor="middle">03-10</text>
  <rect class="d-box" x="280" y="210" width="200" height="40" rx="6"/>
  <text class="d-text" x="380" y="236" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="520" y="210" width="240" height="40" rx="6"/>
  <text class="d-text" x="640" y="236" text-anchor="middle">03-04</text>
</svg>

Here is that difference computed for ana (in SQLite, subtracting n days is \`date(d, '-n days')\`):

~~~sql
SELECT user_id, login_date,
       ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date) AS rn,
       date(login_date, '-' || ROW_NUMBER() OVER (
              PARTITION BY user_id ORDER BY login_date) || ' days') AS grp
FROM (SELECT DISTINCT user_id, login_date FROM logins) AS d
WHERE user_id = 'ana'
ORDER BY login_date;
~~~

~~~text
user_id | login_date | rn | grp
ana | 2025-03-01 | 1 | 2025-02-28
ana | 2025-03-02 | 2 | 2025-02-28
ana | 2025-03-03 | 3 | 2025-02-28
ana | 2025-03-06 | 4 | 2025-03-02
ana | 2025-03-07 | 5 | 2025-03-02
ana | 2025-03-10 | 6 | 2025-03-04
~~~

The \`grp\` value itself means nothing (2025-02-28 is not a login date). It is just a label that is identical for every row of one island and different between islands.

📌 **Interview term: group identifier (island key)** — a computed value that is the same for all rows of an island and different across islands, so that an ordinary \`GROUP BY\` can collapse each island into one row.

Now group by it:

~~~sql
WITH days AS (
  SELECT DISTINCT user_id, login_date
  FROM logins
), grouped AS (
  SELECT user_id, login_date,
         date(login_date, '-' || ROW_NUMBER() OVER (
                PARTITION BY user_id ORDER BY login_date) || ' days') AS grp
  FROM days
)
SELECT user_id,
       MIN(login_date) AS streak_start,
       MAX(login_date) AS streak_end,
       COUNT(*)        AS days
FROM grouped
GROUP BY user_id, grp
ORDER BY user_id, streak_start;
~~~

~~~text
user_id | streak_start | streak_end | days
ana | 2025-03-01 | 2025-03-03 | 3
ana | 2025-03-06 | 2025-03-07 | 2
ana | 2025-03-10 | 2025-03-10 | 1
raj | 2025-03-01 | 2025-03-01 | 1
raj | 2025-03-03 | 2025-03-06 | 4
~~~

\`PARTITION BY user_id\` restarts the numbering for every user, and \`grp\` is grouped together with \`user_id\`, so two users can never share an island.

**Why the \`DISTINCT\` matters.** ana logged in twice on 2025-03-02. Without de-duplication, the second copy takes row number 3, the difference shifts by a day, and her 3-day streak splits:

~~~sql
WITH grouped AS (
  SELECT user_id, login_date,
         date(login_date, '-' || ROW_NUMBER() OVER (
                PARTITION BY user_id ORDER BY login_date, id) || ' days') AS grp
  FROM logins
)
SELECT user_id, MIN(login_date) AS streak_start, MAX(login_date) AS streak_end, COUNT(*) AS days
FROM grouped
WHERE user_id = 'ana'
GROUP BY user_id, grp
ORDER BY streak_start;
~~~

~~~text
user_id | streak_start | streak_end | days
ana | 2025-03-01 | 2025-03-02 | 2
ana | 2025-03-02 | 2025-03-03 | 2
ana | 2025-03-06 | 2025-03-07 | 2
ana | 2025-03-10 | 2025-03-10 | 1
~~~

Two overlapping "streaks" and a wrong length. Either de-duplicate first, or replace \`ROW_NUMBER()\` with \`DENSE_RANK()\`, which gives both copies the same number (then count \`DISTINCT login_date\`). The three numbering functions are compared in [What is the difference between ROW_NUMBER, RANK, and DENSE_RANK?](/interview-question/what-is-the-difference-between-row-number-rank-and-dense-rank)

📌 **Interview term: Tabibitosan** — a name sometimes used, mostly in the Oracle community, for this "value minus row number" method ([Oracle Community: the Tabibitosan method](https://community.oracle.com/docs/DOC-915680)). You do not need the name, but recognising it helps if an interviewer uses it.

## 5. Islands, Method 2: Change Flag and Running Sum

The difference trick needs values that step by a fixed amount (1, or one day). Many island problems are about **state**: a device reports up or down every 5 minutes; when was it down, and for how long? There is nothing to subtract. Instead:

1. Mark each row with 1 if its state differs from the previous row (\`LAG\`), else 0.
2. A running \`SUM\` of those marks increases by one at each change, so it numbers the runs.
3. Group by that run number.

~~~sql
WITH flagged AS (
  SELECT id, reading_time, status,
         CASE WHEN status = LAG(status) OVER (ORDER BY id)
              THEN 0 ELSE 1 END AS is_new_run
  FROM readings
), numbered AS (
  SELECT id, reading_time, status,
         SUM(is_new_run) OVER (ORDER BY id) AS run_no
  FROM flagged
)
SELECT run_no, status,
       MIN(reading_time) AS run_start,
       MAX(reading_time) AS run_end,
       COUNT(*)          AS readings
FROM numbered
GROUP BY run_no, status
ORDER BY run_no;
~~~

~~~text
run_no | status | run_start | run_end | readings
1 | up | 10:00 | 10:05 | 2
2 | down | 10:10 | 10:20 | 3
3 | up | 10:25 | 10:25 | 1
4 | down | 10:30 | 10:30 | 1
5 | up | 10:35 | 10:40 | 2
~~~

On the first row \`LAG\` is NULL, \`status = NULL\` is not true, so the \`CASE\` gives 1 and the first run is number 1. The three "up" runs (1, 3 and 5) stay separate, which a plain \`GROUP BY status\` could never do.

📌 **Interview term: running sum (cumulative sum)** — \`SUM(x) OVER (ORDER BY ...)\`, which adds up \`x\` from the first row to the current row. With an \`ORDER BY\` and no explicit frame, the default frame runs from the start of the partition to the current row (ties included). More in [How do you calculate a running total or moving average?](/interview-question/how-do-you-calculate-a-running-total-or-moving-average)

This method generalises. Replace the flag with any rule: \`ts - LAG(ts) > INTERVAL '30 minutes'\` starts a new web session (📌 **Interview term: sessionization**); \`start_date > LAG(end_date)\` starts a new block of overlapping bookings.

## 6. PostgreSQL: Date Arithmetic and the Longest Streak

In PostgreSQL, \`date - integer\` gives a date, so the island key is simply \`d - ROW_NUMBER()\`. The fourth example also answers the usual follow-up, "longest streak per user", with PostgreSQL \`DISTINCT ON\`:

~~~sql
WITH days AS (
  SELECT DISTINCT user_id, login_date::date AS d
  FROM logins
), grouped AS (
  SELECT user_id, d,
         d - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY d))::int AS grp
  FROM days
), streaks AS (
  SELECT user_id, MIN(d) AS streak_start, MAX(d) AS streak_end, COUNT(*) AS days
  FROM grouped
  GROUP BY user_id, grp
)
SELECT DISTINCT ON (user_id) user_id, streak_start, streak_end, days
FROM streaks
ORDER BY user_id, days DESC, streak_start;
~~~

~~~text
user_id | streak_start | streak_end | days
ana | 2025-03-01 | 2025-03-03 | 3
raj | 2025-03-03 | 2025-03-06 | 4
~~~

The \`::int\` cast is needed because \`ROW_NUMBER()\` returns \`bigint\` and PostgreSQL has a \`date - integer\` operator but none for \`date - bigint\` (without the cast it fails with \`ERROR:  operator does not exist: date - bigint\` when run here). The SQLite form \`julianday(login_date)\` does not exist in PostgreSQL (\`ERROR:  function julianday(text) does not exist\` when tried here). In SQL Server use \`DATEADD(day, -ROW_NUMBER() OVER (...), d)\`; in MySQL \`DATE_SUB(d, INTERVAL rn DAY)\` (not run here). On other engines replace \`DISTINCT ON\` with \`ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY days DESC) = 1\`, the top-N-per-group pattern from [Top-N per group with RANK() OVER (PARTITION BY)](/interview-question/top-n-per-group-with-rank-over-partition-by-how-do-you-get-top-2-per-department-).

## 7. Choosing a Method

| Situation | Method | Key expression |
| :--- | :--- | :--- |
| Missing ranges in a numeric or date sequence | Gaps with \`LEAD\` | \`next - x > 1\` |
| Runs of consecutive integers or days | Difference of sequences | \`x - ROW_NUMBER()\` |
| Runs of the same state, or "close enough" values | Change flag + running sum | \`SUM(flag) OVER (ORDER BY ...)\` |
| Every missing value, small range | Generate the range + anti-join | \`generate_series\` + \`NOT EXISTS\` |

All window methods cost roughly one sort plus one or two passes: O(n log n), or a single ordered index scan if an index matches \`(user_id, login_date)\`. The old approach, a self join comparing every row with every other, is O(n²) and should not be your answer.

## 8. Verified: Running the Code

The three SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above). The gap and status-run examples returned identical rows on PostgreSQL 16.15; the login-streak example uses SQLite date functions, and its PostgreSQL form is the fourth example, run on PostgreSQL 16.15 in a scratch database with the same schema. The extra queries in sections 3 and 4 were run the same way.

Example 1, gaps in invoice numbers:

~~~text
gap_start | gap_end | missing
1004 | 1005 | 2
1008 | 1009 | 2
~~~

Example 2, login streaks:

~~~text
user_id | streak_start | streak_end | days
ana | 2025-03-01 | 2025-03-03 | 3
ana | 2025-03-06 | 2025-03-07 | 2
ana | 2025-03-10 | 2025-03-10 | 1
raj | 2025-03-01 | 2025-03-01 | 1
raj | 2025-03-03 | 2025-03-06 | 4
~~~

Example 3, status runs:

~~~text
run_no | status | run_start | run_end | readings
1 | up | 10:00 | 10:05 | 2
2 | down | 10:10 | 10:20 | 3
3 | up | 10:25 | 10:25 | 1
4 | down | 10:30 | 10:30 | 1
5 | up | 10:35 | 10:40 | 2
~~~

Example 4, PostgreSQL longest streak per user:

~~~text
user_id | streak_start | streak_end | days
ana | 2025-03-01 | 2025-03-03 | 3
raj | 2025-03-03 | 2025-03-06 | 4
~~~

## Edge Cases

- **Ties in the longest-streak ranking.** Two streaks of equal length: add a tiebreaker (\`streak_start\`) or decide that both should be returned (\`RANK()\`).
- **Time zones.** A login at 23:30 in one zone is the next day in another. Convert timestamps to the user local date *before* building islands.
- **NULL values.** A NULL in the ordered column sorts first on SQLite and last on PostgreSQL, and breaks the arithmetic. Filter NULLs out first.
- **Gap at the edges.** The LEAD query only finds holes *between* existing values. If numbering must start at 1000, a missing 1000 needs an explicit check against the expected start.

## Common Pitfalls

- **Not de-duplicating before \`ROW_NUMBER()\`.** Two rows for one day split a streak; on this data a 3-day streak became two 2-day streaks.
- **Forgetting \`PARTITION BY\` the entity.** One user streak bleeds into the next user, and the group key collides across users.
- **Grouping by the island key alone.** Group by \`(user_id, grp)\`; the same \`grp\` value can occur for different users.
- **Using a plain \`GROUP BY status\` for state runs.** It merges every "up" row into one group; runs need the change-flag numbering.
- **Mixing engines date maths.** \`julianday\` is SQLite, \`d - n\` is PostgreSQL, \`DATEADD\` is SQL Server; an untested port errors or silently subtracts the wrong unit.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Name the problem:</strong> <span style="color:#f0e2c8;">An <strong style="color:#ffca28;">island</strong> is a maximal run of consecutive values or of rows with the same state; a <strong style="color:#ffca28;">gap</strong> is what lies between islands. Both are solved by comparing each row with its neighbour, which is what window functions do.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Gaps:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LEAD(invoice_no) OVER (ORDER BY invoice_no)</code> puts the next number on each row. Where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next - current &gt; 1</code>, the gap is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">current + 1</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next - 1</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Islands by difference:</strong> <span style="color:#f0e2c8;">Inside a run of consecutive values, the value and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROW_NUMBER()</code> both rise by one, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value - ROW_NUMBER()</code> is constant. I <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY</code> that difference and take <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MIN</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MAX</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT</code> per island. For dates, subtract the row number as days.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Islands by change flag:</strong> <span style="color:#f0e2c8;">When rows are not numbers but states (up, down), I flag a row with 1 when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">status &lt;&gt; LAG(status)</code>, and a running <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SUM</code> of the flags numbers each run. This also handles tolerances like "within 30 minutes".</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Pitfalls:</strong> <span style="color:#f0e2c8;">Duplicates break the difference trick, so I de-duplicate first or use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DENSE_RANK()</code>. I <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PARTITION BY</code> the entity (user, device), and I keep the date maths engine-specific: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">d - n</code> on a PostgreSQL date, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">date(d, '-n days')</code> in SQLite.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does a duplicate login break the trick?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two rows on 2025-03-02 get row numbers 2 and 3, so from the second copy on the difference shifts by one day and one streak splits in two. On this data ana 3-day streak came back as two 2-day streaks. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT DISTINCT</code> first, or use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DENSE_RANK()</code>, which gives duplicates the same number.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you find the longest streak per user?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Group into islands, then rank the islands per user by length: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY days DESC)</code> filtered to 1, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DISTINCT ON (user_id) ... ORDER BY user_id, days DESC</code> in PostgreSQL.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you list every missing number, not ranges?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Generate the full range and anti-join: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">generate_series(1001, 1010)</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT EXISTS</code> in PostgreSQL, or a recursive CTE in SQLite or MySQL. Only for small ranges; the LEAD version scales because it returns one row per gap.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if consecutive means within 30 minutes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use the change-flag method: flag a new island when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ts - LAG(ts) &gt; interval '30 minutes'</code>, then running <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SUM</code> of the flags. This is how web sessions are built from click events (sessionization).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is this fast on a big table?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each method is one sort plus one or two window passes over the data, so roughly O(n log n), or a single ordered scan when an index matches <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(user_id, login_date)</code>. Far better than a self join that compares every row with every other row.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Island | A maximal run of consecutive values or of rows with the same state |
| Gap | A range of missing values between two islands |
| LEAD() | Window function returning a value from the next row |
| Group identifier (island key) | A computed value constant within an island and different across islands |
| Tabibitosan | Name sometimes used for the value-minus-row-number method |
| Running sum (cumulative sum) | \`SUM(x) OVER (ORDER BY ...)\` from the first row to the current one |
| Sessionization | Building sessions from events by starting a new island after an idle gap |

**Conclusion:** Gaps and islands look like puzzles, but they reduce to one idea: compare each row with its neighbour. \`LEAD\` finds gaps directly. For islands, either subtract a \`ROW_NUMBER()\` from a value that steps by one, so each run gets a constant key, or flag each change with \`LAG\` and number the runs with a running \`SUM\`. Then an ordinary \`GROUP BY\` turns each island into one row with its start, end and length. De-duplicate first, partition by the entity, and keep the date arithmetic engine-specific.`,
    examples: [
      {
        label: `Gaps: LEAD() finds every missing range of invoice numbers`,
        code: `WITH nxt AS (
  SELECT invoice_no,
         LEAD(invoice_no) OVER (ORDER BY invoice_no) AS next_no
  FROM invoices
)
SELECT invoice_no + 1 AS gap_start,
       next_no - 1    AS gap_end,
       next_no - invoice_no - 1 AS missing
FROM nxt
WHERE next_no - invoice_no > 1
ORDER BY gap_start;`,
      },
      {
        label: `Islands: login streaks with the date minus ROW_NUMBER() trick`,
        code: `WITH days AS (
  SELECT DISTINCT user_id, login_date
  FROM logins
), grouped AS (
  SELECT user_id, login_date,
         date(login_date, '-' || ROW_NUMBER() OVER (
                PARTITION BY user_id ORDER BY login_date) || ' days') AS grp
  FROM days
)
SELECT user_id,
       MIN(login_date) AS streak_start,
       MAX(login_date) AS streak_end,
       COUNT(*)        AS days
FROM grouped
GROUP BY user_id, grp
ORDER BY user_id, streak_start;`,
      },
      {
        label: `Islands of the same status: LAG() change flag plus a running SUM()`,
        code: `WITH flagged AS (
  SELECT id, reading_time, status,
         CASE WHEN status = LAG(status) OVER (ORDER BY id)
              THEN 0 ELSE 1 END AS is_new_run
  FROM readings
), numbered AS (
  SELECT id, reading_time, status,
         SUM(is_new_run) OVER (ORDER BY id) AS run_no
  FROM flagged
)
SELECT run_no, status,
       MIN(reading_time) AS run_start,
       MAX(reading_time) AS run_end,
       COUNT(*)          AS readings
FROM numbered
GROUP BY run_no, status
ORDER BY run_no;`,
      },
      {
        label: `PostgreSQL: longest streak per user with date arithmetic and DISTINCT ON`,
        code: `WITH days AS (
  SELECT DISTINCT user_id, login_date::date AS d
  FROM logins
), grouped AS (
  SELECT user_id, d,
         d - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY d))::int AS grp
  FROM days
), streaks AS (
  SELECT user_id, MIN(d) AS streak_start, MAX(d) AS streak_end, COUNT(*) AS days
  FROM grouped
  GROUP BY user_id, grp
)
SELECT DISTINCT ON (user_id) user_id, streak_start, streak_end, days
FROM streaks
ORDER BY user_id, days DESC, streak_start;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `What do GROUP BY ROLLUP and CUBE do?`,
    difficulty: "medium",
    seoDescription: `ROLLUP and CUBE add subtotal and grand-total rows to GROUP BY: grouping sets, GROUPING() for NULL labels, engine support, and the UNION ALL equivalent.`,
    description: `**Question presented to candidate:**
"I want a sales report with a total per region and product, a subtotal per region, and a grand total, all in one result. What do \`GROUP BY ROLLUP\` and \`GROUP BY CUBE\` do, how are they different, and how do you tell a subtotal row from a real NULL in the data?"

**What a strong answer should cover:**
- Both are shorthands for **grouping sets**: one query that aggregates the same rows at several levels and returns all levels in one result, as if several \`GROUP BY\` queries were glued with \`UNION ALL\`
- \`ROLLUP (a, b)\` = sets \`(a, b)\`, \`(a)\`, \`()\`: a hierarchy of subtotals, n + 1 sets for n columns, so column order matters
- \`CUBE (a, b)\` = every combination \`(a, b)\`, \`(a)\`, \`(b)\`, \`()\`: 2^n sets, for cross-tab reports
- In subtotal rows the rolled-up columns are NULL; \`GROUPING(col)\` returns 1 there and 0 for a NULL that is really in the data, which is how you label and sort the rows
- Engine support: PostgreSQL (since 9.5) and SQL Server have all three; MySQL has only \`WITH ROLLUP\`; SQLite has none, so you emulate with \`UNION ALL\`

**Clarifying questions expected:**
- Which subtotal levels are needed: a hierarchy (region, then product within region) or every cross-combination?
- Can the grouping columns themselves contain NULL in the data?

**Code / implementation expected:** Yes — a ROLLUP query with \`GROUPING()\` used to label subtotal rows, and the \`UNION ALL\` equivalent.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE sales (
  id INTEGER PRIMARY KEY,
  region TEXT,
  product TEXT NOT NULL,
  amount INTEGER NOT NULL
);
INSERT INTO sales (id, region, product, amount) VALUES
  (1, 'North', 'Laptop', 1200),
  (2, 'North', 'Laptop', 800),
  (3, 'North', 'Phone', 500),
  (4, 'South', 'Laptop', 900),
  (5, 'South', 'Phone', 700),
  (6, 'South', 'Phone', 300),
  (7, 'West', 'Phone', 400),
  (8, NULL, 'Laptop', 600);
\`\`\``,
    answer: `**Target Audience:** Beginners who know \`GROUP BY\` and want subtotals and grand totals in one query, and candidates preparing for reporting and analytics questions.
**Difficulty:** Medium
**Engines:** PostgreSQL 16.15 for \`ROLLUP\`, \`CUBE\` and \`GROUPING SETS\`; SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable example on this page uses) for the portable \`UNION ALL\` version, because SQLite has no \`ROLLUP\`. Both were run for this page. MySQL and SQL Server notes are cited.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and error message shown was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

At the end of the month a shop manager prints the sales sheet. Under each region she wants the products listed, then a line "North total", then the next region, and at the very bottom "Grand total". It is the shape of every bank statement, invoice and spreadsheet with subtotals.

With plain \`GROUP BY\` you get one level per query: one query for region and product, another for the region totals, a third for the grand total, and then you stitch them together. \`ROLLUP\` and \`CUBE\` ask the database to produce all those levels in one go, from one read of the data.

## 2. One Query, Several Levels

📌 **Interview term: grouping set** — one list of columns to group by. A normal \`GROUP BY region, product\` has exactly one grouping set, \`(region, product)\`. The empty set \`()\` means "no grouping at all": one row for the whole table, the grand total.

📌 **Interview term: GROUPING SETS** — a \`GROUP BY\` form that lists several grouping sets explicitly. The result contains the rows for each set, one after another, as if you had run one \`GROUP BY\` per set and combined them with \`UNION ALL\`. Columns not in a row grouping set come back as NULL in that row.

📌 **Interview term: super-aggregate row** — a row produced by a coarser grouping set: a subtotal or the grand total.

\`ROLLUP\` and \`CUBE\` are shorthands that generate lists of grouping sets for you.

## 3. ROLLUP: A Hierarchy of Subtotals

📌 **Interview term: ROLLUP** — \`ROLLUP (a, b)\` expands to \`GROUPING SETS ((a, b), (a), ())\`. It drops columns from the right, one at a time, so for n columns there are n + 1 sets. It models a hierarchy (region contains products), so \`ROLLUP (product, region)\` is a different report.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="ROLLUP of region and product produces three grouping sets: region and product, region alone, and the empty set for the grand total">
  <rect class="d-box-accent" x="20" y="20" width="300" height="50" rx="8"/>
  <text class="d-text" x="170" y="51" text-anchor="middle">ROLLUP (region, product)</text>
  <rect class="d-box" x="420" y="20" width="320" height="50" rx="8"/>
  <text class="d-text" x="580" y="51" text-anchor="middle">(region, product) detail</text>
  <rect class="d-box" x="420" y="100" width="320" height="50" rx="8"/>
  <text class="d-text" x="580" y="131" text-anchor="middle">(region) subtotal</text>
  <rect class="d-box" x="420" y="180" width="320" height="50" rx="8"/>
  <text class="d-text" x="580" y="211" text-anchor="middle">() grand total</text>
  <line class="d-edge-accent" x1="324" y1="45" x2="414" y2="45"/>
  <path class="d-edge-accent" d="M 370 45 L 370 125 L 414 125"/>
  <path class="d-edge-accent" d="M 370 125 L 370 205 L 414 205"/>
</svg>

The second example, on PostgreSQL:

~~~sql
SELECT region, product, SUM(amount) AS total,
       GROUPING(region)  AS g_region,
       GROUPING(product) AS g_product
FROM sales
GROUP BY ROLLUP (region, product)
ORDER BY GROUPING(region), region, GROUPING(product), product;
~~~

~~~text
region | product | total | g_region | g_product
North | Laptop | 2000 | 0 | 0
North | Phone | 500 | 0 | 0
North | NULL | 2500 | 0 | 1
South | Laptop | 900 | 0 | 0
South | Phone | 1000 | 0 | 0
South | NULL | 1900 | 0 | 1
West | Phone | 400 | 0 | 0
West | NULL | 400 | 0 | 1
NULL | Laptop | 600 | 0 | 0
NULL | NULL | 600 | 0 | 1
NULL | NULL | 5400 | 1 | 1
~~~

Each region has its detail rows, then a row with \`product\` NULL and \`g_product = 1\`: the region subtotal. The last row has both flags set: the grand total, 5400.

Now look at the two rows that read \`NULL | NULL\` in the region and product columns. One is **600**: sale 8 has no region in the data, and this is the subtotal for that "no region" group. The other is **5400**, the grand total. The NULLs look identical; the flags do not.

📌 **Interview term: GROUPING()** — a function that returns 1 when the column is NULL *because this row is a super-aggregate that rolled it up*, and 0 when the column is part of the row grouping (even if its value is a real NULL). It is the only reliable way to label, sort or filter subtotal rows. With several arguments it returns a bitmask.

## 4. CUBE: Every Combination

📌 **Interview term: CUBE** — \`CUBE (a, b)\` expands to every subset of its columns: \`(a, b)\`, \`(a)\`, \`(b)\`, \`()\`. For n columns that is 2^n grouping sets. It answers "totals by region, totals by product, and both", the shape of a pivot table with row and column totals.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="CUBE of region and product produces four grouping sets: region and product, region alone, product alone, and the empty set">
  <rect class="d-box-accent" x="20" y="20" width="300" height="50" rx="8"/>
  <text class="d-text" x="170" y="51" text-anchor="middle">CUBE (region, product)</text>
  <rect class="d-box" x="420" y="20" width="320" height="50" rx="8"/>
  <text class="d-text" x="580" y="51" text-anchor="middle">(region, product) detail</text>
  <rect class="d-box" x="420" y="100" width="320" height="50" rx="8"/>
  <text class="d-text" x="580" y="131" text-anchor="middle">(region) subtotal</text>
  <rect class="d-box-accent" x="420" y="180" width="320" height="50" rx="8"/>
  <text class="d-text" x="580" y="211" text-anchor="middle">(product) subtotal, extra</text>
  <rect class="d-box" x="420" y="260" width="320" height="50" rx="8"/>
  <text class="d-text" x="580" y="291" text-anchor="middle">() grand total</text>
  <line class="d-edge-accent" x1="324" y1="45" x2="414" y2="45"/>
  <path class="d-edge-accent" d="M 370 45 L 370 125 L 414 125"/>
  <path class="d-edge-accent" d="M 370 125 L 370 205 L 414 205"/>
  <path class="d-edge-accent" d="M 370 205 L 370 285 L 414 285"/>
</svg>

The third example builds readable labels from \`GROUPING()\` instead of exposing the flags:

~~~sql
SELECT CASE WHEN GROUPING(region) = 1 THEN 'ALL REGIONS'
            ELSE COALESCE(region, '(no region)') END AS region_label,
       CASE WHEN GROUPING(product) = 1 THEN 'ALL PRODUCTS'
            ELSE product END AS product_label,
       SUM(amount) AS total
FROM sales
GROUP BY CUBE (region, product)
ORDER BY GROUPING(region), region, GROUPING(product), product;
~~~

~~~text
region_label | product_label | total
North | Laptop | 2000
North | Phone | 500
North | ALL PRODUCTS | 2500
South | Laptop | 900
South | Phone | 1000
South | ALL PRODUCTS | 1900
West | Phone | 400
West | ALL PRODUCTS | 400
(no region) | Laptop | 600
(no region) | ALL PRODUCTS | 600
ALL REGIONS | Laptop | 3500
ALL REGIONS | Phone | 1900
ALL REGIONS | ALL PRODUCTS | 5400
~~~

Compared with \`ROLLUP\`, the cube adds the per-product totals across all regions (Laptop 3500, Phone 1900). And the real NULL region is now labelled \`(no region)\` while the rolled-up one says \`ALL REGIONS\`, which \`COALESCE\` alone could never do. (For \`COALESCE\`, see [What do COALESCE and NULLIF do?](/interview-question/what-do-coalesce-and-nullif-do).) The \`ORDER BY\` uses \`GROUPING()\` so super-aggregates come after the detail. The rows from \`(no region)\` sort after West because PostgreSQL sorts NULL last in ascending order.

| | Grouping sets for \`(region, product)\` | For n columns | Use it for |
| :--- | :--- | :--- | :--- |
| \`GROUP BY region, product\` | \`(region, product)\` | 1 | Plain detail |
| \`ROLLUP (region, product)\` | \`(region, product)\`, \`(region)\`, \`()\` | n + 1 | Hierarchical subtotals |
| \`CUBE (region, product)\` | \`(region, product)\`, \`(region)\`, \`(product)\`, \`()\` | 2^n | Cross-tab totals in every direction |
| \`GROUPING SETS (...)\` | exactly what you list | any | Only the levels you need |

## 5. GROUPING SETS: Say Exactly What You Want

If you want region totals and product totals and the grand total, but not the detail, list the sets yourself:

~~~sql
SELECT region, product, SUM(amount) AS total, GROUPING(region, product) AS grouping_id
FROM sales
GROUP BY GROUPING SETS ((region), (product), ())
ORDER BY GROUPING(region, product), region, product;
~~~

~~~text
region | product | total | grouping_id
North | NULL | 2500 | 1
South | NULL | 1900 | 1
West | NULL | 400 | 1
NULL | NULL | 600 | 1
NULL | Laptop | 3500 | 2
NULL | Phone | 1900 | 2
NULL | NULL | 5400 | 3
~~~

\`GROUPING(region, product)\` is a bitmask with \`region\` as the high bit: 1 means "product rolled up" (region totals), 2 means "region rolled up" (product totals), 3 means both (grand total). Sorting by it groups each level together.

**Filtering levels** works with \`HAVING\`, because the flags exist only after grouping. Only the region subtotals and the grand total:

~~~sql
SELECT region, product, SUM(amount) AS total
FROM sales
GROUP BY ROLLUP (region, product)
HAVING GROUPING(product) = 1
ORDER BY GROUPING(region), region;
~~~

~~~text
region | product | total
North | NULL | 2500
South | NULL | 1900
West | NULL | 400
NULL | NULL | 600
NULL | NULL | 5400
~~~

(See [What is the difference between WHERE and HAVING?](/interview-question/what-is-the-difference-between-where-and-having).)

## 6. Without ROLLUP: the UNION ALL Equivalent

SQLite has no \`ROLLUP\`, \`CUBE\` or \`GROUPING SETS\`. In sql.js 1.10.2, \`GROUP BY ROLLUP (region, product)\` fails with \`no such function: ROLLUP\` (SQLite parses it as a function call), \`GROUPING(...)\` gives \`no such function: GROUPING\`, and \`GROUPING SETS\` gives \`near "SETS": syntax error\`. The first example writes the same report by hand, one \`GROUP BY\` per grouping set:

~~~sql
SELECT region, product, total
FROM (
  SELECT region, product, SUM(amount) AS total, 0 AS lvl
  FROM sales GROUP BY region, product
  UNION ALL
  SELECT region, NULL, SUM(amount), 1
  FROM sales GROUP BY region
  UNION ALL
  SELECT NULL, NULL, SUM(amount), 2
  FROM sales
) AS t
ORDER BY lvl = 2, region IS NULL, region, lvl, product;
~~~

~~~text
region | product | total
North | Laptop | 2000
North | Phone | 500
North | NULL | 2500
South | Laptop | 900
South | Phone | 1000
South | NULL | 1900
West | Phone | 400
West | NULL | 400
NULL | Laptop | 600
NULL | NULL | 600
NULL | NULL | 5400
~~~

These are the same rows and totals as the \`ROLLUP\` output, and the query returned the same result on PostgreSQL. The hand-made \`lvl\` column plays the role of \`GROUPING()\`: without it, the 600 subtotal and the 5400 total would again be indistinguishable. The sort expressions (\`lvl = 2\`, \`region IS NULL\`) put the grand total last and the no-region group after the named regions on both engines, despite their different NULL ordering. (Why \`UNION ALL\` and not \`UNION\`: [What is the difference between UNION and UNION ALL?](/interview-question/what-is-the-difference-between-union-and-union-all))

The cost difference shows in the plan. PostgreSQL computed the whole \`CUBE\` from a single scan:

~~~sql
EXPLAIN (COSTS OFF)
SELECT region, product, SUM(amount)
FROM sales
GROUP BY CUBE (region, product);
~~~

~~~text
QUERY PLAN
MixedAggregate
  Hash Key: region, product
  Hash Key: region
  Hash Key: product
  Group Key: ()
  ->  Seq Scan on sales
~~~

📌 **Interview term: MixedAggregate** — the PostgreSQL plan node that computes several grouping sets in one pass, here with one hash table per set plus \`Group Key: ()\` for the grand total. The \`UNION ALL\` version reads the table three times. The planner may choose a sort-based strategy on other data.

## 7. Engine Support

| Engine | ROLLUP | CUBE | GROUPING SETS | GROUPING() |
| :--- | :--- | :--- | :--- | :--- |
| PostgreSQL | Yes, since 9.5 | Yes | Yes | Yes |
| SQL Server | Yes | Yes | Yes | Yes |
| MySQL 8.0 | \`WITH ROLLUP\` only | No | No | Yes, since 8.0.1 |
| SQLite | No | No | No | No |

Sources: PostgreSQL added \`GROUPING SETS\`, \`CUBE\` and \`ROLLUP\` in 9.5 ([PostgreSQL 9.5 release notes](https://www.postgresql.org/docs/9.5/release-9-5.html)). SQL Server documents all three as \`GROUP BY\` extensions ([Microsoft: Using GROUP BY with ROLLUP, CUBE, and GROUPING SETS](https://learn.microsoft.com/ar-sa/previous-versions/sql/sql-server-2008/bb522495(v=sql.100))). The MySQL 8.0 manual describes the \`WITH ROLLUP\` modifier and \`GROUPING()\` ([MySQL 8.0: GROUP BY modifiers](https://dev.mysql.com/doc/refman/8.0/en/group-by-modifiers.html), [MySQL blog: the GROUPING function](https://dev.mysql.com/blog-archive/mysql-8-0-grouping-function/)), and MySQL staff confirmed in a bug report that MySQL has no \`CUBE()\` or \`GROUPING SETS()\` ([MySQL bug 103134](https://bugs.mysql.com/bug.php?id=103134)). SQLite was checked by running it. In MySQL the syntax is a suffix: \`GROUP BY region, product WITH ROLLUP\` (not run here).

## 8. Verified: Running the Code

The SQLite example was run the way this page runs it (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above), and returned the same rows on PostgreSQL 16.15. The three PostgreSQL examples were run on PostgreSQL 16.15 in a scratch database with the same schema; so were the \`HAVING\` query and the plan in sections 5 and 6. The SQLite error messages in section 6 come from running those statements in sql.js.

Example 1, the UNION ALL equivalent on SQLite:

~~~text
region | product | total
North | Laptop | 2000
North | Phone | 500
North | NULL | 2500
South | Laptop | 900
South | Phone | 1000
South | NULL | 1900
West | Phone | 400
West | NULL | 400
NULL | Laptop | 600
NULL | NULL | 600
NULL | NULL | 5400
~~~

Example 2, ROLLUP with GROUPING() flags:

~~~text
region | product | total | g_region | g_product
North | Laptop | 2000 | 0 | 0
North | Phone | 500 | 0 | 0
North | NULL | 2500 | 0 | 1
South | Laptop | 900 | 0 | 0
South | Phone | 1000 | 0 | 0
South | NULL | 1900 | 0 | 1
West | Phone | 400 | 0 | 0
West | NULL | 400 | 0 | 1
NULL | Laptop | 600 | 0 | 0
NULL | NULL | 600 | 0 | 1
NULL | NULL | 5400 | 1 | 1
~~~

Example 3, CUBE with labels:

~~~text
region_label | product_label | total
North | Laptop | 2000
North | Phone | 500
North | ALL PRODUCTS | 2500
South | Laptop | 900
South | Phone | 1000
South | ALL PRODUCTS | 1900
West | Phone | 400
West | ALL PRODUCTS | 400
(no region) | Laptop | 600
(no region) | ALL PRODUCTS | 600
ALL REGIONS | Laptop | 3500
ALL REGIONS | Phone | 1900
ALL REGIONS | ALL PRODUCTS | 5400
~~~

Example 4, GROUPING SETS:

~~~text
region | product | total | grouping_id
North | NULL | 2500 | 1
South | NULL | 1900 | 1
West | NULL | 400 | 1
NULL | NULL | 600 | 1
NULL | Laptop | 3500 | 2
NULL | Phone | 1900 | 2
NULL | NULL | 5400 | 3
~~~

## Edge Cases

- **Unordered output.** Without \`ORDER BY\`, PostgreSQL returned the \`ROLLUP\` rows in hash order, grand total first and the rest mixed. Always sort by \`GROUPING()\` and the columns.
- **Real NULLs in grouping columns.** They produce rows that look like subtotals. Label with \`GROUPING()\`, never with \`COALESCE\` alone.
- **Averages in subtotals.** \`AVG(amount)\` in a subtotal row is the average over the underlying rows, not the average of the detail averages. That is usually what you want, but say it.
- **Wide CUBEs.** \`CUBE\` on 6 columns is 64 grouping sets. List the ones you need with \`GROUPING SETS\`.

## Common Pitfalls

- **Swapping the ROLLUP column order.** \`ROLLUP (product, region)\` gives per-product subtotals, not per-region ones.
- **Using \`COALESCE(region, 'Total')\` to label subtotals** when the column can be NULL in the data; a real NULL gets mislabelled.
- **Filtering super-aggregates in \`WHERE\`.** \`GROUPING()\` exists only after grouping; use \`HAVING\`.
- **Expecting \`CUBE\` in MySQL or \`ROLLUP\` in SQLite.** MySQL has only \`WITH ROLLUP\`; SQLite needs the \`UNION ALL\` form.
- **Using \`UNION\` instead of \`UNION ALL\` in the emulation.** The branches never produce the same row, so \`UNION\` only adds a de-duplication step over the whole result for nothing.
- **Summing the subtotal rows again in application code**, double counting. Filter on \`GROUPING()\` first.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Core idea:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROLLUP</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CUBE</code> are shorthands for <strong style="color:#ffca28;">grouping sets</strong>: aggregate the same rows at several levels in one pass and return every level in one result, like several <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY</code> queries joined with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION ALL</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. ROLLUP:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROLLUP (region, product)</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(region, product)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(region)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">()</code>: detail, subtotal per region, grand total. It is a hierarchy, n + 1 sets, so the column order matters.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. CUBE:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CUBE (region, product)</code> gives every combination, 2^n sets, adding a subtotal per product across all regions. It is for cross-tab reports; with many columns it explodes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. NULLs and GROUPING():</strong> <span style="color:#f0e2c8;">In subtotal rows the rolled-up column is NULL, which collides with real NULLs in the data. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUPING(region)</code> returns 1 only when the NULL means "all regions", so I use it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CASE</code> labels, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HAVING</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Portability:</strong> <span style="color:#f0e2c8;">PostgreSQL 9.5+ and SQL Server support <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROLLUP</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CUBE</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUPING SETS</code>. MySQL has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY ... WITH ROLLUP</code> only. SQLite has none, so I would write the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION ALL</code> version there.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many rows does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">CUBE (a, b, c)</code> aggregate at?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">2^3 = 8 grouping sets: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a,b,c)</code>, three pairs, three singles and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">()</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROLLUP (a, b, c)</code> gives only 4: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a,b,c)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a,b)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">COALESCE(region, 'Total')</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because a row whose region is really NULL in the data would also become "Total". On this data <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROLLUP</code> returns two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NULL, NULL</code> rows, 600 (the subtotal for unassigned sales) and 5400 (the grand total); only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUPING()</code> tells them apart.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you return only the subtotal rows?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Filter on the flag after grouping: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HAVING GROUPING(product) = 1</code>. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code> cannot see it, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code> runs before grouping.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is it faster than the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">UNION ALL</code> version?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually: the engine reads the table once and computes the levels together. PostgreSQL showed a single <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MixedAggregate</code> node with one hash key per grouping set over one scan, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION ALL</code> scans the table once per branch.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">GROUPING(region, product)</code> return?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A bitmask, one bit per argument with the first argument as the highest bit: 0 for detail rows, 1 for region subtotals, 2 for product subtotals, 3 for the grand total. Handy for sorting.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Grouping set | One list of columns to group by; \`()\` is the grand total |
| GROUPING SETS | Several grouping sets in one \`GROUP BY\`, results combined |
| Super-aggregate row | A subtotal or grand-total row from a coarser grouping set |
| ROLLUP | Hierarchical grouping sets, dropping columns from the right: n + 1 sets |
| CUBE | All combinations of the columns: 2^n sets |
| GROUPING() | 1 when the column was rolled up in this row, 0 otherwise; a bitmask with several arguments |
| MixedAggregate | PostgreSQL plan node computing several grouping sets in one pass |

**Conclusion:** \`ROLLUP\` and \`CUBE\` turn several \`GROUP BY\` queries into one: \`ROLLUP\` walks a hierarchy (detail, subtotal, grand total, n + 1 levels) and \`CUBE\` produces every combination (2^n levels), both shorthands for \`GROUPING SETS\`. The rolled-up columns come back as NULL, so \`GROUPING()\` is the essential companion for labels, sorting and \`HAVING\` filters, especially when the data has real NULLs. PostgreSQL and SQL Server support all of it, MySQL only \`WITH ROLLUP\`, and on SQLite you write the \`UNION ALL\` version by hand.`,
    examples: [
      {
        label: `SQLite (no ROLLUP): the same report as ROLLUP built from three GROUP BYs and UNION ALL`,
        code: `SELECT region, product, total
FROM (
  SELECT region, product, SUM(amount) AS total, 0 AS lvl
  FROM sales GROUP BY region, product
  UNION ALL
  SELECT region, NULL, SUM(amount), 1
  FROM sales GROUP BY region
  UNION ALL
  SELECT NULL, NULL, SUM(amount), 2
  FROM sales
) AS t
ORDER BY lvl = 2, region IS NULL, region, lvl, product;`,
      },
      {
        label: `PostgreSQL: GROUP BY ROLLUP with GROUPING() flags on every row`,
        code: `SELECT region, product, SUM(amount) AS total,
       GROUPING(region)  AS g_region,
       GROUPING(product) AS g_product
FROM sales
GROUP BY ROLLUP (region, product)
ORDER BY GROUPING(region), region, GROUPING(product), product;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: GROUP BY CUBE with readable labels built from GROUPING()`,
        code: `SELECT CASE WHEN GROUPING(region) = 1 THEN 'ALL REGIONS'
            ELSE COALESCE(region, '(no region)') END AS region_label,
       CASE WHEN GROUPING(product) = 1 THEN 'ALL PRODUCTS'
            ELSE product END AS product_label,
       SUM(amount) AS total
FROM sales
GROUP BY CUBE (region, product)
ORDER BY GROUPING(region), region, GROUPING(product), product;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: GROUPING SETS lists exactly the levels you want`,
        code: `SELECT region, product, SUM(amount) AS total, GROUPING(region, product) AS grouping_id
FROM sales
GROUP BY GROUPING SETS ((region), (product), ())
ORDER BY GROUPING(region, product), region, product;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `What is a CTE (Common Table Expression)?`,
    difficulty: "medium",
    seoDescription: `A CTE is a named temporary result set defined with WITH: reuse, chaining, WITH RECURSIVE, inlining vs MATERIALIZED in PostgreSQL 12+, and CTE vs view.`,
    description: `**Question presented to candidate:**
"What is a CTE, the \`WITH\` clause? Show me one, tell me when you would use it instead of a subquery, and tell me whether it changes performance."

**What a strong answer should cover:**
- A CTE is a named, temporary result set defined with \`WITH name AS (...)\` and visible only to the one statement that follows it
- Why use it: readability (a query read top to bottom as named steps), referencing the same intermediate result more than once, and chaining steps where each CTE can use the earlier ones
- \`WITH RECURSIVE\` lets a CTE refer to itself, for hierarchies and generated series (calendars, numbers)
- Performance is engine-specific: since PostgreSQL 12 a non-recursive CTE referenced once is inlined like a subquery; \`MATERIALIZED\` / \`NOT MATERIALIZED\` override that, and SQLite has the same hints since 3.35.0
- Differences from a view (stored in the schema, reusable across queries) and a temporary table (persists for the session, can be indexed); PostgreSQL also allows data-modifying CTEs (\`DELETE ... RETURNING\` inside \`WITH\`)

**Code / implementation expected:** Yes — a CTE that is referenced twice or chained, and ideally a short recursive one.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL
);
INSERT INTO customers (id, name, city) VALUES
  (1, 'Ana', 'Lisbon'),
  (2, 'Ben', 'Leeds'),
  (3, 'Chloe', 'Lisbon'),
  (4, 'Dev', 'Pune'),
  (5, 'Emma', 'Leeds');
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  order_date TEXT NOT NULL,
  amount INTEGER NOT NULL
);
INSERT INTO orders (id, customer_id, order_date, amount) VALUES
  (1, 1, '2025-03-01', 120),
  (2, 1, '2025-03-02', 80),
  (3, 2, '2025-03-02', 40),
  (4, 3, '2025-03-04', 300),
  (5, 3, '2025-03-04', 150),
  (6, 4, '2025-03-05', 60),
  (7, 1, '2025-03-07', 200),
  (8, 5, '2025-03-07', 90),
  (9, 2, '2025-03-07', 30);
\`\`\``,
    answer: `**Target Audience:** Beginners who can write a subquery and want cleaner multi-step queries, and candidates preparing for the performance follow-up.
**Difficulty:** Medium
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15, both run for this page. CTEs are standard SQL; MySQL added them in 8.0. Version facts are cited inline.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and error message shown was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

Think of a recipe. A bad one says: "Add to the bowl the mixture of the flour you sifted with the sugar that you creamed with the butter you softened." A good one says: "1. Soften the butter. 2. Cream it with the sugar. 3. Sift in the flour." Same cooking, but you can read the second one, check each step, and refer back to "the creamed butter" later.

A SQL query full of nested subqueries is the first recipe: you read it from the inside out. A CTE lets you write the second: named steps, top to bottom, each one usable by the steps after it.

## 2. What a CTE Is

📌 **Interview term: CTE (Common Table Expression)** — a named, temporary result set defined in a \`WITH\` clause at the start of a statement. The statement that follows can read it like a table. It is not stored anywhere in the schema and disappears when the statement ends.

The shape:

~~~sql
WITH name AS (
  SELECT ...          -- any query
)
SELECT ... FROM name; -- the one statement that can see it
~~~

📌 **Interview term: scope** — where a name is visible. A CTE is visible only inside its own statement. Running \`WITH t AS (SELECT 1 AS x) SELECT x FROM t;\` and then \`SELECT x FROM t;\` as a second statement fails on the second one: \`no such table: t\` in SQLite and \`ERROR:  relation "t" does not exist\` in PostgreSQL (both run here).

## 3. A CTE Referenced Twice

"Which customers spent more than the average customer?" needs the per-customer totals twice: once to list them, once to average them.

~~~sql
WITH customer_totals AS (
  SELECT customer_id, SUM(amount) AS total_spent, COUNT(*) AS orders
  FROM orders
  GROUP BY customer_id
)
SELECT c.name, t.total_spent, t.orders
FROM customer_totals AS t
JOIN customers AS c ON c.id = t.customer_id
WHERE t.total_spent > (SELECT AVG(total_spent) FROM customer_totals)
ORDER BY t.total_spent DESC;
~~~

~~~text
name | total_spent | orders
Chloe | 450 | 2
Ana | 400 | 3
~~~

The totals are Ana 400, Ben 70, Chloe 450, Dev 60, Emma 90; the average is 214, so Chloe and Ana qualify. Without a CTE, the same \`GROUP BY\` subquery would be written twice, once in \`FROM\` and once inside the \`AVG\`, and a change to one copy could silently miss the other. (Subqueries in general: [What is a subquery and what is a correlated subquery?](/interview-question/what-is-a-subquery-and-what-is-a-correlated-subquery))

## 4. Chaining CTEs

One \`WITH\` can define several CTEs separated by commas, and each one can read the ones defined before it:

<svg class="iq-diagram" width="100%" viewBox="0 0 780 200" role="img" aria-label="Chained CTEs: city_totals feeds grand and shares, grand also feeds shares, and the final SELECT reads shares">
  <defs>
    <marker id="sql08q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="70" width="140" height="56" rx="8"/>
  <text class="d-text" x="90" y="103" text-anchor="middle">orders</text>
  <rect class="d-box" x="210" y="70" width="160" height="56" rx="8"/>
  <text class="d-text" x="290" y="103" text-anchor="middle">city_totals</text>
  <rect class="d-box" x="420" y="10" width="140" height="56" rx="8"/>
  <text class="d-text" x="490" y="43" text-anchor="middle">grand</text>
  <rect class="d-box" x="420" y="134" width="140" height="56" rx="8"/>
  <text class="d-text" x="490" y="167" text-anchor="middle">shares</text>
  <rect class="d-box-accent" x="620" y="134" width="140" height="56" rx="8"/>
  <text class="d-text" x="690" y="167" text-anchor="middle">final SELECT</text>
  <line class="d-edge" x1="164" y1="98" x2="202" y2="98" marker-end="url(#sql08q5-arrow)"/>
  <line class="d-edge" x1="374" y1="90" x2="414" y2="50" marker-end="url(#sql08q5-arrow)"/>
  <line class="d-edge" x1="374" y1="108" x2="414" y2="150" marker-end="url(#sql08q5-arrow)"/>
  <line class="d-edge" x1="490" y1="70" x2="490" y2="126" marker-end="url(#sql08q5-arrow)"/>
  <line class="d-edge-accent" x1="564" y1="162" x2="612" y2="162" marker-end="url(#sql08q5-arrow)"/>
</svg>

~~~sql
WITH city_totals AS (
  SELECT c.city, SUM(o.amount) AS revenue
  FROM orders AS o
  JOIN customers AS c ON c.id = o.customer_id
  GROUP BY c.city
),
grand AS (
  SELECT SUM(revenue) AS all_revenue FROM city_totals
),
shares AS (
  SELECT city, revenue,
         ROUND(100.0 * revenue / all_revenue, 1) AS pct_of_revenue
  FROM city_totals CROSS JOIN grand
)
SELECT city, revenue, pct_of_revenue
FROM shares
ORDER BY revenue DESC;
~~~

~~~text
city | revenue | pct_of_revenue
Lisbon | 850 | 79.4
Leeds | 160 | 15
Pune | 60 | 5.6
~~~

Each step can be tested on its own: replace the final \`SELECT\` with \`SELECT * FROM city_totals\` and you see the intermediate result. That debugging habit is a big part of why CTEs are popular. (PostgreSQL prints \`15.0\` where SQLite prints \`15\`; the value is the same.)

📌 **Interview term: chained CTEs** — several CTEs in one \`WITH\`, where later ones reference earlier ones, forming a pipeline of named steps. A CTE cannot reference one defined *after* it (unless it is recursive).

The same structure appears in many applied answers on this site, for example the ranked CTE in [Top-N per group with RANK() OVER (PARTITION BY)](/interview-question/top-n-per-group-with-rank-over-partition-by-how-do-you-get-top-2-per-department-) and the growth calculations in [How do you calculate year-over-year or month-over-month growth in SQL?](/interview-question/how-do-you-calculate-year-over-year-or-month-over-month-growth-in-sql)

## 5. WITH RECURSIVE in One Paragraph

📌 **Interview term: recursive CTE** — a CTE that references itself. It has an **anchor** member (the starting rows) and a **recursive** member (rows computed from the previous round), joined with \`UNION ALL\`; the engine repeats the recursive member until it returns no new rows.

The everyday use is generating rows that are not in any table, such as a calendar so that days with no orders still appear:

~~~sql
WITH RECURSIVE calendar(day) AS (
  SELECT '2025-03-01'
  UNION ALL
  SELECT date(day, '+1 day') FROM calendar WHERE day < '2025-03-07'
)
SELECT cal.day, COUNT(o.id) AS orders, COALESCE(SUM(o.amount), 0) AS revenue
FROM calendar AS cal
LEFT JOIN orders AS o ON o.order_date = cal.day
GROUP BY cal.day
ORDER BY cal.day;
~~~

~~~text
day | orders | revenue
2025-03-01 | 1 | 120
2025-03-02 | 2 | 120
2025-03-03 | 0 | 0
2025-03-04 | 2 | 450
2025-03-05 | 1 | 60
2025-03-06 | 0 | 0
2025-03-07 | 3 | 320
~~~

March 3 and 6 show 0 instead of being missing. \`date(day, '+1 day')\` is SQLite; PostgreSQL rejected it (\`function date(text, unknown) does not exist\`), and the PostgreSQL form adds 1 to a \`DATE\`:

~~~sql
WITH RECURSIVE calendar(day) AS (
  SELECT DATE '2025-03-01'
  UNION ALL
  SELECT day + 1 FROM calendar WHERE day < DATE '2025-03-07'
)
SELECT cal.day, COUNT(o.id) AS orders, COALESCE(SUM(o.amount), 0) AS revenue
FROM calendar AS cal
LEFT JOIN orders AS o ON o.order_date::date = cal.day
GROUP BY cal.day
ORDER BY cal.day;
~~~

~~~text
day | orders | revenue
2025-03-01 | 1 | 120
2025-03-02 | 2 | 120
2025-03-03 | 0 | 0
2025-03-04 | 2 | 450
2025-03-05 | 1 | 60
2025-03-06 | 0 | 0
2025-03-07 | 3 | 320
~~~

The \`WHERE day < ...\` is the termination condition. Recursion has its own pages: [How do recursive CTEs work?](/interview-question/how-do-recursive-ctes-work), an org-chart walk in [Recursive CTE for an org chart — how do you list all reports (direct + indirect) of a manager?](/interview-question/recursive-cte-for-an-org-chart-how-do-you-list-all-reports-direct-indirect-of-a-), and loops in [Recursive CTE with cycle detection](/interview-question/recursive-cte-with-cycle-detection-how-do-you-handle-circular-manager-references).

## 6. Does a CTE Change Performance?

This is the follow-up interviewers care about, and the answer is "it depends on the engine and the version".

📌 **Interview term: inlining** — the planner replaces the CTE name with its query, as if you had written a subquery, and optimises the whole statement together. Filters from the outer query can then be pushed into the CTE.

📌 **Interview term: materialization** — the CTE is computed once, its rows stored in a temporary work area, and the outer query reads that stored result. Outer filters cannot reach the underlying table, so its indexes are not used for them. This is sometimes called an **optimization fence**.

PostgreSQL 12 changed the default: a non-recursive, side-effect-free CTE referenced once is inlined, one referenced more than once is still materialized, and \`MATERIALIZED\` / \`NOT MATERIALIZED\` override the choice ([PostgreSQL feature matrix: inlined WITH queries](https://www.postgresql.org/about/featurematrix/detail/inlined-with-queries-common-table-expressions); [PostgreSQL docs: WITH queries](https://www.postgresql.org/docs/12/queries-with.html)). The fourth example shows the inlined plan:

~~~sql
EXPLAIN (COSTS OFF)
WITH big_orders AS (
  SELECT id, customer_id, amount FROM orders WHERE amount >= 100
)
SELECT * FROM big_orders WHERE customer_id = 1;
~~~

~~~text
QUERY PLAN
Seq Scan on orders
  Filter: ((amount >= 100) AND (customer_id = 1))
~~~

The CTE has vanished: one scan of \`orders\` with both conditions, exactly what a subquery would give. Adding \`MATERIALIZED\` brings the fence back:

~~~sql
EXPLAIN (COSTS OFF)
WITH big_orders AS MATERIALIZED (
  SELECT id, customer_id, amount FROM orders WHERE amount >= 100
)
SELECT * FROM big_orders WHERE customer_id = 1;
~~~

~~~text
QUERY PLAN
CTE Scan on big_orders
  Filter: (customer_id = 1)
  CTE big_orders
    ->  Seq Scan on orders
          Filter: (amount >= 100)
~~~

Now the CTE is computed on its own (\`CTE big_orders\`), and \`customer_id = 1\` is applied afterwards, on the \`CTE Scan\`. With an index on \`orders(customer_id)\` on a big table, that difference matters. Referencing the CTE twice gave the materialized shape without any keyword:

~~~text
QUERY PLAN
Hash Join
  Hash Cond: (a.customer_id = b.customer_id)
  Join Filter: (a.id < b.id)
  CTE big_orders
    ->  Seq Scan on orders
          Filter: (amount >= 100)
  ->  CTE Scan on big_orders a
  ->  Hash
        ->  CTE Scan on big_orders b
~~~

Both plans are from a tiny table; the planner may choose differently on real data. SQLite has the same \`MATERIALIZED\` and \`NOT MATERIALIZED\` hints since 3.35.0, which also made CTEs used more than once materialized by default ([SQLite 3.35.0 release log](https://www.sqlite.org/releaselog/3_35_0.html)); \`WITH c AS MATERIALIZED (...)\` ran in sql.js 1.10.2 here. CTEs themselves arrived in SQLite 3.8.3 ([SQLite 3.8.3 release log](https://www.sqlite.org/releaselog/3_8_3.html)), and MySQL lists them among the 8.0 features ([MySQL 8.0 GA announcement](https://dev.mysql.com/blog-archive/whats-new-in-mysql-8-0-generally-available)).

## 7. CTE vs Subquery vs View vs Temporary Table

| | CTE | Subquery | View | Temporary table |
| :--- | :--- | :--- | :--- | :--- |
| Lives for | One statement | One place in one statement | Until dropped (schema object) | The session or transaction |
| Reusable within the statement | Yes, by name | No, copy it | Yes | Yes |
| Reusable by other queries | No | No | Yes | Yes, in that session |
| Can be indexed | No | No | No (a materialized view can) | Yes |
| Recursion | \`WITH RECURSIVE\` | No | Only if defined with a recursive CTE | No |

Views get their own page: [What is a view and a materialized view?](/interview-question/what-is-a-view-and-a-materialized-view)

**Data-modifying CTEs (PostgreSQL).** In PostgreSQL a CTE may contain \`INSERT\`, \`UPDATE\` or \`DELETE\` with \`RETURNING\`, so one statement can change rows and report on them:

~~~sql
WITH gone AS (DELETE FROM orders WHERE amount < 50 RETURNING id)
SELECT COUNT(*) AS n FROM gone;
~~~

~~~text
n
2
~~~

(Orders 3 and 9 were deleted in a scratch database.) SQLite rejected the same statement with \`near "DELETE": syntax error\`.

## 8. Verified: Running the Code

The three SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above). The first two returned the same rows on PostgreSQL 16.15 (with \`15.0\` printed for \`15\`); the calendar needs the PostgreSQL form shown in section 5. The plan example and the extra queries in sections 5 to 7 were run on PostgreSQL 16.15 in a scratch database with the same schema, and the error messages come from running those statements on each engine.

Example 1, a CTE referenced twice:

~~~text
name | total_spent | orders
Chloe | 450 | 2
Ana | 400 | 3
~~~

Example 2, chained CTEs:

~~~text
city | revenue | pct_of_revenue
Lisbon | 850 | 79.4
Leeds | 160 | 15
Pune | 60 | 5.6
~~~

Example 3, recursive calendar:

~~~text
day | orders | revenue
2025-03-01 | 1 | 120
2025-03-02 | 2 | 120
2025-03-03 | 0 | 0
2025-03-04 | 2 | 450
2025-03-05 | 1 | 60
2025-03-06 | 0 | 0
2025-03-07 | 3 | 320
~~~

Example 4, the inlined PostgreSQL plan:

~~~text
QUERY PLAN
Seq Scan on orders
  Filter: ((amount >= 100) AND (customer_id = 1))
~~~

## Edge Cases

- **Name shadowing.** A CTE named like a real table hides the table for that statement: \`WITH orders AS (SELECT 1 AS id) SELECT COUNT(*) FROM orders\` returned 1, not 9, on both engines here. Legal, and confusing.
- **Column names.** \`WITH calendar(day) AS (...)\` names the columns explicitly; otherwise they come from the inner \`SELECT\`, so give every expression an alias.
- **Recursive termination.** A recursive member with no stopping condition runs until it fails or hits a limit. A \`LIMIT 3\` on the outer query stopped an endless counter on both engines run here, but do not rely on that.
- **Placement.** The \`WITH\` goes at the start of the statement it belongs to (in PostgreSQL also before \`INSERT\`, \`UPDATE\` and \`DELETE\`), not in the middle of a query.

## Common Pitfalls

- **Assuming a CTE is always faster** (or always slower). Since PostgreSQL 12 a single-use CTE plans like a subquery; check the plan.
- **Assuming the old PostgreSQL fence still applies.** Advice written before version 12 ("CTEs are optimisation fences") is out of date unless you write \`MATERIALIZED\`.
- **Expecting a CTE to persist.** It is gone after the statement; reuse across queries needs a view or temporary table.
- **Referencing a CTE defined later in the same \`WITH\`.** Order the steps; only recursive CTEs may refer to themselves.
- **Writing engine-specific date maths in a "portable" recursive CTE.** \`date(day, '+1 day')\` is SQLite, \`day + 1\` on a \`DATE\` is PostgreSQL.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">CTE</strong> is a named temporary result set: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WITH name AS (SELECT ...)</code> followed by one statement that can use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">name</code> like a table. It exists only for that statement.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why use one:</strong> <span style="color:#f0e2c8;">Readability first: a long query becomes named steps read top to bottom. A CTE can be referenced several times, and later CTEs can build on earlier ones, which nested subqueries cannot do without repeating themselves.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Recursion:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WITH RECURSIVE</code> lets a CTE reference itself: an anchor query plus a recursive part joined with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION ALL</code>. That is how you walk an org chart or generate a calendar of dates.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Performance:</strong> <span style="color:#f0e2c8;">It depends on the engine. Since PostgreSQL 12 a CTE used once is <strong style="color:#ffca28;">inlined</strong> like a subquery, so filters are pushed into it. Referenced twice, or marked <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MATERIALIZED</code>, it is computed once and stored, which can block index use. SQLite has the same hints since 3.35.0.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Versus view and temp table:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">view</strong> is a named query saved in the schema for every query to reuse. A <strong style="color:#ffca28;">temporary table</strong> lasts for the session and can be indexed. A CTE is the lightest: no schema object, gone when the statement ends.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a CTE faster than a subquery?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not by itself. When inlined, PostgreSQL produces the same plan for both: here the CTE disappeared and the plan was a single <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Seq Scan on orders</code> with both filters. It can even be slower when materialized, because the outer filter no longer reaches the table.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you force <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">MATERIALIZED</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When an expensive CTE is referenced several times, or when the planner makes a bad choice after inlining and you want the CTE computed once on its own, as an optimisation fence. Before PostgreSQL 12 every CTE behaved this way.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a CTE modify data?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In PostgreSQL, yes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WITH gone AS (DELETE ... RETURNING id) SELECT count(*) FROM gone</code> deletes and reports in one statement. SQLite rejects it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">near "DELETE": syntax error</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use a CTE in another query later?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Its scope is the one statement. A second <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT</code> that names it fails: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">no such table</code> in SQLite, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">relation does not exist</code> in PostgreSQL. Use a view or a temporary table to reuse it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you stop a recursive CTE looping forever?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A termination condition in the recursive part (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE day &lt; '2025-03-07'</code>), a depth counter, or cycle detection for graphs. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LIMIT</code> on the outer query also stopped an infinite counter on both engines here, but it is a safety net, not a design.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| CTE (Common Table Expression) | A named temporary result set in a \`WITH\` clause, visible to one statement |
| Scope | Where a name is visible; for a CTE, its own statement only |
| Chained CTEs | Several CTEs in one \`WITH\`, each able to read the earlier ones |
| Recursive CTE | A CTE with an anchor and a recursive member that references itself |
| Inlining | The planner folds the CTE into the outer query like a subquery |
| Materialization (optimization fence) | The CTE is computed once and stored; outer filters apply afterwards |

**Conclusion:** A CTE is a named step in a query: \`WITH name AS (...)\` defines it, the statement that follows uses it, and it disappears afterwards. It makes long queries readable, lets one intermediate result be used several times, chains steps into a pipeline and, with \`WITH RECURSIVE\`, generates rows or walks hierarchies. It is not a performance feature by itself: PostgreSQL 12+ inlines a single-use CTE like a subquery, while a materialized one (by keyword or by multiple references) is computed once and shields the table from outer filters, so check the plan when it matters.`,
    examples: [
      {
        label: `A CTE referenced twice: customers who spent more than the average customer`,
        code: `WITH customer_totals AS (
  SELECT customer_id, SUM(amount) AS total_spent, COUNT(*) AS orders
  FROM orders
  GROUP BY customer_id
)
SELECT c.name, t.total_spent, t.orders
FROM customer_totals AS t
JOIN customers AS c ON c.id = t.customer_id
WHERE t.total_spent > (SELECT AVG(total_spent) FROM customer_totals)
ORDER BY t.total_spent DESC;`,
      },
      {
        label: `Chained CTEs: each step reads the one before it`,
        code: `WITH city_totals AS (
  SELECT c.city, SUM(o.amount) AS revenue
  FROM orders AS o
  JOIN customers AS c ON c.id = o.customer_id
  GROUP BY c.city
),
grand AS (
  SELECT SUM(revenue) AS all_revenue FROM city_totals
),
shares AS (
  SELECT city, revenue,
         ROUND(100.0 * revenue / all_revenue, 1) AS pct_of_revenue
  FROM city_totals CROSS JOIN grand
)
SELECT city, revenue, pct_of_revenue
FROM shares
ORDER BY revenue DESC;`,
      },
      {
        label: `WITH RECURSIVE: a calendar so that days without orders still appear`,
        code: `WITH RECURSIVE calendar(day) AS (
  SELECT '2025-03-01'
  UNION ALL
  SELECT date(day, '+1 day') FROM calendar WHERE day < '2025-03-07'
)
SELECT cal.day, COUNT(o.id) AS orders, COALESCE(SUM(o.amount), 0) AS revenue
FROM calendar AS cal
LEFT JOIN orders AS o ON o.order_date = cal.day
GROUP BY cal.day
ORDER BY cal.day;`,
      },
      {
        label: `PostgreSQL: a CTE used once is inlined, so the outer filter reaches the table`,
        code: `EXPLAIN (COSTS OFF)
WITH big_orders AS (
  SELECT id, customer_id, amount FROM orders WHERE amount >= 100
)
SELECT * FROM big_orders WHERE customer_id = 1;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
];

export default augments;
