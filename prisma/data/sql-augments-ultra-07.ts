/**
 * SQL ULTRA — batch 07: Window functions I (window function basics, ROW_NUMBER /
 * RANK / DENSE_RANK, choosing between them, LAG and LEAD, running totals and moving
 * averages). Every example was run by scripts/verify-sql-examples.ts (sql.js 1.10.2
 * like the page, PostgreSQL 16 for postgres examples); quoted output is that run's output.
 */
import type { SqlUltraAugment } from "./sql-augments.types";

const augments: SqlUltraAugment[] = [
  {
    title: `What are window functions?`,
    difficulty: "medium",
    seoDescription: `Window functions compute per-row values over related rows without collapsing them: OVER, PARTITION BY, ORDER BY, frames, and why they cannot go in WHERE.`,
    description: `**Question presented to candidate:**
"What is a window function in SQL? How is it different from a normal aggregate with GROUP BY, and what do PARTITION BY and ORDER BY inside the OVER clause actually do?"

**What a strong answer should cover:**
- A window function computes a value for each row from a set of related rows (the window) and, unlike \`GROUP BY\`, does not collapse the rows: every input row stays in the result
- The \`OVER (...)\` clause defines the window: \`PARTITION BY\` splits rows into groups, \`ORDER BY\` orders rows inside each partition, and an optional frame (\`ROWS\` / \`RANGE\` / \`GROUPS\`) picks which rows around the current one are used
- The families: ranking (\`ROW_NUMBER\`, \`RANK\`, \`DENSE_RANK\`, \`NTILE\`), offset (\`LAG\`, \`LEAD\`, \`FIRST_VALUE\`), and ordinary aggregates used with \`OVER\` (\`SUM\`, \`AVG\`, \`COUNT\`)
- Window functions are evaluated after \`WHERE\`, \`GROUP BY\` and \`HAVING\`, so they cannot be used in \`WHERE\`; filter on them in an outer query or CTE
- Engine support: PostgreSQL since 8.4, MySQL since 8.0, SQLite since 3.25.0; adding \`ORDER BY\` to \`OVER\` silently changes an aggregate into a running one

**Code / implementation expected:** Yes — a query that shows a per-row value next to a per-group total, and a filter on a window result via a subquery.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  dept TEXT NOT NULL,
  salary INTEGER NOT NULL,
  hired DATE NOT NULL
);
INSERT INTO employees (id, name, dept, salary, hired) VALUES
  (1, 'Asha', 'Engineering', 120000, '2019-04-01'),
  (2, 'Ben', 'Engineering', 95000, '2021-06-15'),
  (3, 'Chen', 'Engineering', 95000, '2022-01-10'),
  (4, 'Dana', 'Sales', 70000, '2020-02-03'),
  (5, 'Eli', 'Sales', 82000, '2018-09-20'),
  (6, 'Fay', 'Sales', 60000, '2023-03-01'),
  (7, 'Gus', 'Support', 55000, '2022-07-11'),
  (8, 'Hana', 'Support', 64000, '2021-11-30');
\`\`\``,
    answer: `**Target Audience:** Beginners who know \`GROUP BY\` and want to understand the \`OVER (...)\` syntax from zero, plus candidates who want the precise vocabulary (partition, frame, peers).
**Difficulty:** Medium
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15, both run for this page. MySQL facts are cited from its documentation.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and error message shown was produced by actually running it; the **Verified** section quotes each example output in full.

## 1. Why This Even Matters — A Story First

A teacher has a stack of marked exam papers. The head asks two different questions:

1. "What was the average mark for each class?" The teacher writes one line per class on a sticky note. The papers themselves are no longer in the answer; they have been **summarised away**.
2. "Write on every paper how this student did compared with their class average." Now every paper stays in the pile, and each one gets an extra note scribbled in the margin: "class average 71, you scored 84".

The first question is \`GROUP BY\`. The second is a **window function**: it looks at a group of related rows (the student and their classmates) to compute something, but it writes the answer onto each row instead of replacing the rows with a summary. Before window functions, the second question needed a self join or a correlated subquery. With them it is one line, and it unlocks rankings, running totals, "previous row" comparisons and top-N-per-group, which is why interviewers love them.

## 2. The Core Idea: Keep the Rows, Add a Column

📌 **Interview term: window function** — a function that computes a value for the current row from a set of rows related to it, written with an \`OVER (...)\` clause, and that does **not** reduce the number of rows.

📌 **Interview term: window** — the set of rows the function looks at for the current row.

Here is what \`GROUP BY\` does with the table above: 8 employees become 3 rows.

~~~text
dept | headcount | dept_total
Engineering | 3 | 310000
Sales | 3 | 212000
Support | 2 | 119000
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 760 260" role="img" aria-label="GROUP BY turns three Engineering rows into one summary row">
  <defs>
    <marker id="sql07q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="230" height="50" rx="8"/>
  <text class="d-text" x="145" y="60" text-anchor="middle">Asha 120000</text>
  <rect class="d-box" x="30" y="105" width="230" height="50" rx="8"/>
  <text class="d-text" x="145" y="135" text-anchor="middle">Ben 95000</text>
  <rect class="d-box" x="30" y="180" width="230" height="50" rx="8"/>
  <text class="d-text" x="145" y="210" text-anchor="middle">Chen 95000</text>
  <rect class="d-box-accent" x="470" y="95" width="260" height="70" rx="8"/>
  <text class="d-text" x="600" y="124" text-anchor="middle">Engineering</text>
  <text class="d-sub" x="600" y="148" text-anchor="middle">1 row, total 310000</text>
  <path class="d-edge" d="M 264 55 L 360 55 L 360 120 L 464 120" marker-end="url(#sql07q1-arrow)"/>
  <path class="d-edge" d="M 264 130 L 464 130" marker-end="url(#sql07q1-arrow)"/>
  <path class="d-edge" d="M 264 205 L 360 205 L 360 140 L 464 140" marker-end="url(#sql07q1-arrow)"/>
  <text class="d-sub" x="425" y="80" text-anchor="middle">GROUP BY</text>
</svg>

And here is the window version (the first example). All 8 rows are still there; each one carries its department total and its share of it:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 260" role="img" aria-label="A window function keeps all three Engineering rows and writes the group total onto each one">
  <defs>
    <marker id="sql07q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="250" height="220" rx="10"/>
  <text class="d-sub" x="145" y="45" text-anchor="middle">window: dept = Engineering</text>
  <rect class="d-box" x="40" y="65" width="210" height="44" rx="8"/>
  <text class="d-text" x="145" y="92" text-anchor="middle">Asha 120000</text>
  <rect class="d-box" x="40" y="125" width="210" height="44" rx="8"/>
  <text class="d-text" x="145" y="152" text-anchor="middle">Ben 95000</text>
  <rect class="d-box" x="40" y="185" width="210" height="44" rx="8"/>
  <text class="d-text" x="145" y="212" text-anchor="middle">Chen 95000</text>
  <rect class="d-box-accent" x="440" y="65" width="290" height="44" rx="8"/>
  <text class="d-text" x="585" y="92" text-anchor="middle">Asha 120000 | 310000</text>
  <rect class="d-box-accent" x="440" y="125" width="290" height="44" rx="8"/>
  <text class="d-text" x="585" y="152" text-anchor="middle">Ben 95000 | 310000</text>
  <rect class="d-box-accent" x="440" y="185" width="290" height="44" rx="8"/>
  <text class="d-text" x="585" y="212" text-anchor="middle">Chen 95000 | 310000</text>
  <path class="d-edge-accent" d="M 254 87 L 434 87" marker-end="url(#sql07q1-arrow2)"/>
  <path class="d-edge-accent" d="M 254 147 L 434 147" marker-end="url(#sql07q1-arrow2)"/>
  <path class="d-edge-accent" d="M 254 207 L 434 207" marker-end="url(#sql07q1-arrow2)"/>
  <text class="d-sub" x="345" y="35" text-anchor="middle">SUM OVER</text>
</svg>

~~~text
name | dept | salary | dept_total | pct_of_dept
Asha | Engineering | 120000 | 310000 | 38.7
Ben | Engineering | 95000 | 310000 | 30.6
Chen | Engineering | 95000 | 310000 | 30.6
Eli | Sales | 82000 | 212000 | 38.7
Dana | Sales | 70000 | 212000 | 33
Fay | Sales | 60000 | 212000 | 28.3
Hana | Support | 64000 | 119000 | 53.8
Gus | Support | 55000 | 119000 | 46.2
~~~

The same \`SUM\` function did both jobs. What made it a window function is only the \`OVER (PARTITION BY dept)\` after it.

(Engine detail visible above: SQLite shows \`33\` where PostgreSQL shows \`33.0\`, because SQLite \`ROUND\` returns a floating-point value that this page prints without a trailing \`.0\`, while PostgreSQL returns a \`numeric\`.)

## 3. The Anatomy of \`OVER (...)\`

~~~sql
function_name(args) OVER (
  PARTITION BY dept          -- 1. which rows belong together
  ORDER BY hired             -- 2. in what order inside each group
  ROWS BETWEEN 2 PRECEDING   -- 3. which slice around the current row (the frame)
       AND CURRENT ROW
)
~~~

All three parts are optional:

📌 **Interview term: PARTITION BY** — splits the rows into independent groups, like \`GROUP BY\` but without collapsing. The function restarts in each partition. With no \`PARTITION BY\`, the whole result is one partition.

📌 **Interview term: window ORDER BY** — orders rows *inside* each partition. Ranking and offset functions need it to mean anything; for aggregates it turns a whole-group total into a running one. It is independent of the query final \`ORDER BY\`, which only sorts the output.

📌 **Interview term: frame** — the sub-range of the partition used for the current row, given as \`ROWS\`, \`RANGE\` or \`GROUPS BETWEEN start AND end\`. Frames are covered in depth in [How do you calculate a running total or moving average?](/interview-question/how-do-you-calculate-a-running-total-or-moving-average)

\`OVER ()\` with nothing inside means "all rows of the result". The second example uses all three shapes at once: a numbering, a running sum and a whole-table average:

~~~text
name | hired | salary | hire_order | payroll_so_far | company_avg
Eli | 2018-09-20 | 82000 | 1 | 82000 | 80125
Asha | 2019-04-01 | 120000 | 2 | 202000 | 80125
Dana | 2020-02-03 | 70000 | 3 | 272000 | 80125
Ben | 2021-06-15 | 95000 | 4 | 367000 | 80125
Hana | 2021-11-30 | 64000 | 5 | 431000 | 80125
Chen | 2022-01-10 | 95000 | 6 | 526000 | 80125
Gus | 2022-07-11 | 55000 | 7 | 581000 | 80125
Fay | 2023-03-01 | 60000 | 8 | 641000 | 80125
~~~

📌 **Interview term: default frame** — when \`ORDER BY\` is present and no frame is written, the frame is \`RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\`: from the first row of the partition up to the current row *and its ties*. That is why \`payroll_so_far\` is a running total. With no \`ORDER BY\`, the frame is the whole partition, which is why \`company_avg\` is the same everywhere.

### The tie trap

📌 **Interview term: peers** — rows that are equal on the window \`ORDER BY\` columns. The default \`RANGE\` frame treats peers as one step. Ordering by \`salary\`, Ben and Chen both earn 95000, so \`SUM(salary) OVER (ORDER BY salary)\` gives both of them 521000, not 426000 and then 521000. Switching to \`ROWS\` steps one physical row at a time, but then the order *between* the tied rows is up to the engine. The same query on both engines:

~~~sql
SELECT name, salary,
       SUM(salary) OVER (ORDER BY salary ROWS UNBOUNDED PRECEDING) AS running
FROM employees
ORDER BY salary, name;
~~~

SQLite 3.45:

~~~text
name | salary | running
Gus | 55000 | 55000
Fay | 60000 | 115000
Hana | 64000 | 179000
Dana | 70000 | 249000
Eli | 82000 | 331000
Ben | 95000 | 426000
Chen | 95000 | 521000
Asha | 120000 | 641000
~~~

PostgreSQL 16:

~~~text
name | salary | running
Gus | 55000 | 55000
Fay | 60000 | 115000
Hana | 64000 | 179000
Dana | 70000 | 249000
Eli | 82000 | 331000
Ben | 95000 | 521000
Chen | 95000 | 426000
Asha | 120000 | 641000
~~~

Look at Ben and Chen: SQLite counted Ben first, PostgreSQL counted Chen first. Neither is wrong; the window order did not say. Add a unique tiebreaker (\`ORDER BY salary, id\`) whenever row-by-row results matter.

## 4. The Three Families of Window Functions

| Family | Functions | What they answer | Page |
| :--- | :--- | :--- | :--- |
| Ranking | \`ROW_NUMBER\`, \`RANK\`, \`DENSE_RANK\`, \`NTILE\`, \`PERCENT_RANK\`, \`CUME_DIST\` | "What position is this row in its group?" | [ROW_NUMBER vs RANK vs DENSE_RANK](/interview-question/what-is-the-difference-between-row-number-rank-and-dense-rank) |
| Offset (value) | \`LAG\`, \`LEAD\`, \`FIRST_VALUE\`, \`LAST_VALUE\`, \`NTH_VALUE\` | "What was the value in a neighbouring row?" | [LAG and LEAD](/interview-question/what-do-the-lag-and-lead-window-functions-do) |
| Aggregate | \`SUM\`, \`AVG\`, \`COUNT\`, \`MIN\`, \`MAX\` with \`OVER\` | "Total, average or count over the window" | [Running totals and moving averages](/interview-question/how-do-you-calculate-a-running-total-or-moving-average) |

📌 **Interview term: window aggregate** — an ordinary aggregate function used with \`OVER\`. Without \`OVER\` it collapses rows; with it, it does not.

### Naming a window with \`WINDOW\`

When several functions share a window, name it once. This ran on both engines with identical output:

~~~sql
SELECT name, dept, salary,
       RANK() OVER w AS dept_rank,
       SUM(salary) OVER w AS running_dept_total
FROM employees
WINDOW w AS (PARTITION BY dept ORDER BY salary DESC)
ORDER BY dept, dept_rank, name;
~~~

~~~text
name | dept | salary | dept_rank | running_dept_total
Asha | Engineering | 120000 | 1 | 120000
Ben | Engineering | 95000 | 2 | 310000
Chen | Engineering | 95000 | 2 | 310000
Eli | Sales | 82000 | 1 | 82000
Dana | Sales | 70000 | 2 | 152000
Fay | Sales | 60000 | 3 | 212000
Hana | Support | 64000 | 1 | 64000
Gus | Support | 55000 | 2 | 119000
~~~

(Ben and Chen share rank 2 and running total 310000: they are peers again.)

## 5. When Window Functions Run

<svg class="iq-diagram" width="100%" viewBox="0 0 760 200" role="img" aria-label="Where window functions run in the logical order of a query">
  <defs>
    <marker id="sql07q1-arrow3" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="10" y="70" width="110" height="56" rx="8"/>
  <text class="d-text" x="65" y="103" text-anchor="middle">FROM</text>
  <rect class="d-box" x="160" y="70" width="110" height="56" rx="8"/>
  <text class="d-text" x="215" y="103" text-anchor="middle">WHERE</text>
  <rect class="d-box" x="310" y="70" width="130" height="56" rx="8"/>
  <text class="d-text" x="375" y="96" text-anchor="middle">GROUP BY</text>
  <text class="d-sub" x="375" y="116" text-anchor="middle">HAVING</text>
  <rect class="d-box-accent" x="480" y="70" width="130" height="56" rx="8"/>
  <text class="d-text" x="545" y="96" text-anchor="middle">SELECT</text>
  <text class="d-sub" x="545" y="116" text-anchor="middle">windows here</text>
  <rect class="d-box" x="650" y="70" width="100" height="56" rx="8"/>
  <text class="d-text" x="700" y="96" text-anchor="middle">ORDER BY</text>
  <text class="d-sub" x="700" y="116" text-anchor="middle">LIMIT</text>
  <path class="d-edge" d="M 124 98 L 154 98" marker-end="url(#sql07q1-arrow3)"/>
  <path class="d-edge" d="M 274 98 L 304 98" marker-end="url(#sql07q1-arrow3)"/>
  <path class="d-edge" d="M 444 98 L 474 98" marker-end="url(#sql07q1-arrow3)"/>
  <path class="d-edge" d="M 614 98 L 644 98" marker-end="url(#sql07q1-arrow3)"/>
</svg>

Window functions are computed after \`FROM\`, \`WHERE\`, \`GROUP BY\` and \`HAVING\`, at the \`SELECT\` step, and before the final \`ORDER BY\` and \`LIMIT\`. Two consequences follow, both checked by running.

**You cannot filter on them in \`WHERE\`.** Trying to keep employees above their department average directly:

~~~sql
SELECT name FROM employees WHERE salary > AVG(salary) OVER (PARTITION BY dept);
~~~

SQLite:

~~~text
Error: misuse of window function AVG()
~~~

PostgreSQL:

~~~text
ERROR:  window functions are not allowed in WHERE
LINE 1: SELECT name FROM employees WHERE salary > AVG(salary) OVER (...
                                                  ^
~~~

The fix is to compute the window in a subquery (or a [CTE](/interview-question/what-is-a-cte-common-table-expression)) and filter outside it, which is the third example:

~~~text
name | dept | salary | dept_avg
Asha | Engineering | 120000 | 103333
Eli | Sales | 82000 | 70667
Hana | Support | 64000 | 59500
~~~

📌 **Interview term: QUALIFY** — a non-standard clause in Snowflake, BigQuery and DuckDB that filters on window results directly ([Snowflake QUALIFY](https://docs.snowflake.com/sql-reference/constructs/qualify), [DuckDB QUALIFY](https://duckdb.org/docs/archive/0.9/sql/query_syntax/qualify)). PostgreSQL 16 and SQLite 3.45 do not have it; writing it was a syntax error on both here.

**They can use aggregates.** Because \`GROUP BY\` runs first, a window can rank the groups themselves:

~~~text
dept | dept_total | dept_rank
Engineering | 310000 | 1
Sales | 212000 | 2
Support | 119000 | 3
~~~

The full step-by-step order is on [What is the logical order of execution of a SQL query?](/interview-question/what-is-the-logical-order-of-execution-of-a-sql-query)

## 6. What the Engine Does

To compute a window, the engine sorts the rows by the \`PARTITION BY\` columns, then by the window \`ORDER BY\` columns, and walks the sorted rows once, resetting the running state at each partition boundary. PostgreSQL shows this directly (the fourth example):

~~~text
QUERY PLAN
WindowAgg
  ->  Sort
        Sort Key: dept
        ->  Seq Scan on employees
~~~

📌 **Interview term: WindowAgg** — the PostgreSQL plan node that evaluates window functions over its sorted input. The \`Sort\` under it is the main cost; an index whose order matches \`PARTITION BY ... ORDER BY ...\` can let the planner skip it. On this 8-row table the planner chose a sequential scan and a sort; on other data it may choose differently.

Compared with the pre-window way of writing "each row next to its department total", a correlated subquery \`(SELECT SUM(salary) FROM employees e2 WHERE e2.dept = e.dept)\`, the window version needs one sort and one pass, while the subquery can mean a separate lookup for every row (planners can sometimes rewrite it, so measure with \`EXPLAIN\` on real data).

## 7. Engine Support

| Engine | Window functions since | Source |
| :--- | :--- | :--- |
| PostgreSQL | 8.4 (July 2009) | [DBTA on the 8.4 release](https://www.dbta.com/Editorial/News-Flashes/PostgreSQL-Version-84-Database-Released-by-the-PostgreSQL-Global-Development-Group-55071.aspx) |
| PostgreSQL | all SQL:2011 frame options (\`RANGE\` offsets, \`GROUPS\`, \`EXCLUDE\`) in 11 | [PostgreSQL 11 release notes](https://www.postgresql.org/docs/release/11.0/) |
| MySQL | 8.0 (first in the 8.0.2 milestone) | [MySQL blog: 8.0.2 introducing window functions](https://dev.mysql.com/blog-archive/mysql-8-0-2-introducing-window-functions/) |
| SQLite | 3.25.0 (2018-09-15); \`GROUPS\`, \`EXCLUDE\` and \`RANGE\` offsets in 3.28.0 | [SQLite 3.28.0 release log](https://sqlite.org/releaselog/3_28_0.html) |

MySQL 5.7 and older have none, which is why old Stack Overflow answers emulate ranking with user variables. MySQL 8.0 still rejects the \`GROUPS\` frame unit ([MySQL window function restrictions](https://dev.mysql.com/doc/refman/8.0/en/window-function-restrictions.html)).

## 8. Verified: Running the Code

The three SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above). The PostgreSQL example, the error messages and the side-by-side \`ROWS\` comparison were run on PostgreSQL 16.15 in a scratch database with the same schema.

Example 1, department totals on every row:

~~~text
name | dept | salary | dept_total | pct_of_dept
Asha | Engineering | 120000 | 310000 | 38.7
Ben | Engineering | 95000 | 310000 | 30.6
Chen | Engineering | 95000 | 310000 | 30.6
Eli | Sales | 82000 | 212000 | 38.7
Dana | Sales | 70000 | 212000 | 33
Fay | Sales | 60000 | 212000 | 28.3
Hana | Support | 64000 | 119000 | 53.8
Gus | Support | 55000 | 119000 | 46.2
~~~

Example 2, \`ORDER BY\` inside \`OVER\`:

~~~text
name | hired | salary | hire_order | payroll_so_far | company_avg
Eli | 2018-09-20 | 82000 | 1 | 82000 | 80125
Asha | 2019-04-01 | 120000 | 2 | 202000 | 80125
Dana | 2020-02-03 | 70000 | 3 | 272000 | 80125
Ben | 2021-06-15 | 95000 | 4 | 367000 | 80125
Hana | 2021-11-30 | 64000 | 5 | 431000 | 80125
Chen | 2022-01-10 | 95000 | 6 | 526000 | 80125
Gus | 2022-07-11 | 55000 | 7 | 581000 | 80125
Fay | 2023-03-01 | 60000 | 8 | 641000 | 80125
~~~

Example 3, filtering through a subquery:

~~~text
name | dept | salary | dept_avg
Asha | Engineering | 120000 | 103333
Eli | Sales | 82000 | 70667
Hana | Support | 64000 | 59500
~~~

Example 4, PostgreSQL plan:

~~~text
QUERY PLAN
WindowAgg
  ->  Sort
        Sort Key: dept
        ->  Seq Scan on employees
~~~

## Common Pitfalls

- **Putting a window function in \`WHERE\` or \`HAVING\`.** Both engines reject it; wrap the query and filter outside.
- **Adding \`ORDER BY\` to \`OVER\` without meaning to.** \`SUM(x) OVER (PARTITION BY g)\` is a group total; \`SUM(x) OVER (PARTITION BY g ORDER BY d)\` is a running total. One clause changes the meaning.
- **Forgetting peers.** The default \`RANGE\` frame gives tied rows the same running value. Use \`ROWS\` and a tiebreaker for strictly row-by-row results.
- **No unique tiebreaker.** \`ROW_NUMBER\` and \`ROWS\` frames over a non-unique order are non-deterministic; the two engines here broke the Ben/Chen tie in opposite ways.
- **Assuming the window \`ORDER BY\` sorts the output.** It does not. Always add the query final \`ORDER BY\`.
- **Using \`LAST_VALUE\` with the default frame.** The frame ends at the current row, so \`LAST_VALUE\` returns the current row itself; add \`ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">window function</strong> computes a value for each row from a set of related rows, its <strong style="color:#ffca28;">window</strong>, and keeps every row. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY</code> turns 3 Engineering rows into 1; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SUM(salary) OVER (PARTITION BY dept)</code> keeps all 3 and writes 310000 on each.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The OVER clause:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PARTITION BY</code> splits the rows into independent groups, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY</code> orders them inside each group, and an optional <strong style="color:#ffca28;">frame</strong> (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROWS BETWEEN 2 PRECEDING AND CURRENT ROW</code>) narrows the window to rows around the current one. Empty <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OVER ()</code> means the whole result is one window.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Families:</strong> <span style="color:#f0e2c8;">Ranking functions (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROW_NUMBER</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RANK</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DENSE_RANK</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NTILE</code>), offset functions (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LAG</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LEAD</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FIRST_VALUE</code>), and any normal aggregate (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SUM</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AVG</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT</code>) turned into a window aggregate by adding <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OVER</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Evaluation order:</strong> <span style="color:#f0e2c8;">Windows are computed after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HAVING</code> and before the final <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LIMIT</code>. So you cannot put one in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code> (PostgreSQL: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window functions are not allowed in WHERE</code>); filter in an outer query or CTE.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Trap and support:</strong> <span style="color:#f0e2c8;">Adding <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY</code> inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OVER</code> switches an aggregate from whole-partition to running total, because the default frame becomes start-of-partition to the current row. Supported in PostgreSQL since 8.4, MySQL since 8.0 and SQLite since 3.25.0.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use a window function together with GROUP BY?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. The window runs over the grouped rows, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RANK() OVER (ORDER BY SUM(salary) DESC)</code> ranks departments by their totals. The aggregate inside the window is evaluated first, at the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY</code> step.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">SUM(x) OVER (ORDER BY d)</code> give the same total on two rows?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The default frame with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RANGE</code> includes all <strong style="color:#ffca28;">peers</strong>, rows with the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">d</code>. Both tied rows see the full sum. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROWS</code> plus a unique tiebreaker to step one row at a time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the rows where a window value meets a condition, such as rank 1?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compute the window in a subquery or CTE and filter in the outer query: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT * FROM (SELECT ..., ROW_NUMBER() OVER (...) AS rn FROM t) x WHERE rn = 1</code>. Some engines (Snowflake, BigQuery, DuckDB) offer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">QUALIFY</code> for this; PostgreSQL 16 and SQLite do not.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the engine actually do to compute it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It sorts the rows by the partition keys and then the order keys, then walks the sorted rows once, resetting at each partition boundary. In PostgreSQL that is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Sort</code> node feeding a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WindowAgg</code> node; an index already in that order can remove the sort.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a window function faster than a self join or correlated subquery?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually. A per-department total by correlated subquery can look up the department again for each row; the window version sorts once and scans once. Check with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXPLAIN</code> on real data. It also keeps the query shorter and avoids join fan-out.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Window function | A function with \`OVER (...)\` that computes a per-row value from related rows without collapsing them |
| Window | The set of rows used for the current row |
| PARTITION BY | Splits rows into independent groups for the window |
| Window ORDER BY | Orders rows inside each partition; separate from the query final \`ORDER BY\` |
| Frame | The slice of the partition, given with \`ROWS\`, \`RANGE\` or \`GROUPS\` |
| Default frame | With \`ORDER BY\`: \`RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\`; without: the whole partition |
| Peers | Rows tied on the window \`ORDER BY\` columns |
| Window aggregate | A normal aggregate (\`SUM\`, \`AVG\`...) used with \`OVER\` |
| QUALIFY | A non-standard clause in some engines to filter on window results |
| WindowAgg | The PostgreSQL plan node that computes window functions |

**Conclusion:** A window function answers a group question but writes the answer onto every row instead of collapsing them, and the \`OVER\` clause says which rows count: \`PARTITION BY\` picks the group, \`ORDER BY\` orders it, and the frame narrows it. Remember that windows run after \`WHERE\` and \`GROUP BY\` (so filter on them from an outer query), that adding \`ORDER BY\` turns an aggregate into a running one with a peer-aware default frame, and that a unique tiebreaker makes results deterministic. With those rules, rankings, running totals and previous-row comparisons are all the same tool.`,
    examples: [
      {
        label: `Each employee next to the department total and their share of it (no rows collapsed)`,
        code: `SELECT name, dept, salary,
       SUM(salary) OVER (PARTITION BY dept) AS dept_total,
       ROUND(100.0 * salary / SUM(salary) OVER (PARTITION BY dept), 1) AS pct_of_dept
FROM employees
ORDER BY dept, salary DESC, name;`,
      },
      {
        label: `ORDER BY inside OVER: a numbering, a running sum and a whole-table average in one pass`,
        code: `SELECT name, hired, salary,
       ROW_NUMBER() OVER (ORDER BY hired) AS hire_order,
       SUM(salary) OVER (ORDER BY hired) AS payroll_so_far,
       ROUND(AVG(salary) OVER ()) AS company_avg
FROM employees
ORDER BY hired;`,
      },
      {
        label: `Filter on a window result: wrap it in a subquery (it cannot go in WHERE)`,
        code: `SELECT name, dept, salary, dept_avg
FROM (
  SELECT name, dept, salary,
         ROUND(AVG(salary) OVER (PARTITION BY dept)) AS dept_avg
  FROM employees
) AS t
WHERE salary > dept_avg
ORDER BY dept, name;`,
      },
      {
        label: `PostgreSQL: the plan shows a Sort feeding a WindowAgg node`,
        code: `EXPLAIN (COSTS OFF)
SELECT name, dept, salary,
       SUM(salary) OVER (PARTITION BY dept) AS dept_total
FROM employees;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `What is the difference between ROW_NUMBER, RANK, and DENSE_RANK?`,
    difficulty: "medium",
    seoDescription: `ROW_NUMBER, RANK and DENSE_RANK differ only on ties: 1,2,3,4 vs 1,2,2,4 vs 1,2,2,3. Run examples, the formulas, PARTITION BY and NULL ordering.`,
    description: `**Question presented to candidate:**
"Walk me through ROW_NUMBER, RANK and DENSE_RANK. If I have scores 95, 90, 90, 85, what does each one return, and why?"

**What a strong answer should cover:**
- All three are ranking window functions that number rows inside each partition by the window \`ORDER BY\`; they differ only in how they treat ties (rows with equal sort values, called peers)
- \`ROW_NUMBER\` gives every row a distinct number (1, 2, 3, 4) and breaks ties arbitrarily unless the \`ORDER BY\` is unique
- \`RANK\` gives peers the same number and then skips (1, 2, 2, 4): rank = 1 + number of rows strictly ahead
- \`DENSE_RANK\` gives peers the same number with no gap (1, 2, 2, 3): dense rank = 1 + number of distinct values strictly ahead
- \`PARTITION BY\` restarts the numbering per group; NULL placement in the sort differs by engine (PostgreSQL puts NULL first in \`DESC\`, SQLite last), so say \`NULLS LAST\`

**Code / implementation expected:** Yes — one query putting the three side by side over data with ties.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE exam_scores (
  id INTEGER PRIMARY KEY,
  class TEXT NOT NULL,
  student TEXT NOT NULL,
  score INTEGER
);
INSERT INTO exam_scores (id, class, student, score) VALUES
  (1, 'A', 'Ana', 95),
  (2, 'A', 'Ben', 90),
  (3, 'A', 'Cai', 90),
  (4, 'A', 'Dev', 85),
  (5, 'A', 'Eva', 85),
  (6, 'A', 'Fin', 85),
  (7, 'A', 'Gia', 70),
  (8, 'B', 'Hal', 88),
  (9, 'B', 'Ivy', 88),
  (10, 'B', 'Jon', 75),
  (11, 'B', 'Kim', NULL);
\`\`\``,
    answer: `**Target Audience:** Beginners who have just met window functions and want the three ranking functions explained with real numbers, plus candidates who want the exact definitions.
**Difficulty:** Medium
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15, both run for this page.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result shown was produced by actually running it; the **Verified** section quotes each example output in full.

This page is the fundamentals: what each function returns and why. For choosing between them in real tasks (top-N filters, dedup, "Nth highest") see the companion page [RANK() vs DENSE_RANK() vs ROW_NUMBER() — when does the gap matter and how do you choose?](/interview-question/rank-vs-dense-rank-vs-row-number-when-does-the-gap-matter-and-how-do-you-choose)

## 1. Why This Even Matters — A Story First

Seven runners finish a race. Ana is fastest, Ben and Cai cross the line together, then Dev, Eva and Fin all tie, then Gia. How do you number them?

- The **cloakroom** gives everyone a distinct ticket, 1 to 7, no matter who tied. Ben and Cai get 2 and 3 in whatever order they reached the desk.
- The **official results board** says Ben and Cai are both 2nd, and the next runner is 4th, because three people finished ahead of Dev. Nobody is 3rd.
- The **medal table** groups by finishing time: there is a 1st time, a 2nd time, a 3rd time and a 4th time, so Dev, Eva and Fin share 3rd place.

Those are exactly \`ROW_NUMBER\`, \`RANK\` and \`DENSE_RANK\`. They agree whenever there are no ties and disagree only on ties, which is precisely where interview questions (and production bugs) live.

## 2. The Three Functions on One Data Set

📌 **Interview term: ranking function** — a window function that returns a position number for each row within its partition, based on the window \`ORDER BY\`. (What a window function is: [What are window functions?](/interview-question/what-are-window-functions))

📌 **Interview term: peers** — rows that are equal on every column of the window \`ORDER BY\`. Ben and Cai (90) are peers; so are Dev, Eva and Fin (85).

<svg class="iq-diagram" width="100%" viewBox="0 0 760 472" role="img" aria-label="Seven scores with ties numbered by ROW_NUMBER, RANK and DENSE_RANK side by side">
  <text class="d-sub" x="120" y="40" text-anchor="middle">student and score</text>
  <text class="d-accent" x="355" y="40" text-anchor="middle">ROW_NUMBER</text>
  <text class="d-accent" x="515" y="40" text-anchor="middle">RANK</text>
  <text class="d-accent" x="675" y="40" text-anchor="middle">DENSE_RANK</text>
  <rect class="d-box" x="20" y="70" width="200" height="36" rx="6"/>
  <text class="d-text" x="120" y="94" text-anchor="middle">Ana 95</text>
  <rect class="d-box-muted" x="300" y="70" width="110" height="36" rx="6"/>
  <text class="d-text" x="355" y="94" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="460" y="70" width="110" height="36" rx="6"/>
  <text class="d-text" x="515" y="94" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="620" y="70" width="110" height="36" rx="6"/>
  <text class="d-text" x="675" y="94" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="20" y="126" width="200" height="36" rx="6"/>
  <text class="d-text" x="120" y="150" text-anchor="middle">Ben 90</text>
  <rect class="d-box-muted" x="300" y="126" width="110" height="36" rx="6"/>
  <text class="d-text" x="355" y="150" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="460" y="126" width="110" height="36" rx="6"/>
  <text class="d-text" x="515" y="150" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="620" y="126" width="110" height="36" rx="6"/>
  <text class="d-text" x="675" y="150" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="20" y="182" width="200" height="36" rx="6"/>
  <text class="d-text" x="120" y="206" text-anchor="middle">Cai 90</text>
  <rect class="d-box-muted" x="300" y="182" width="110" height="36" rx="6"/>
  <text class="d-text" x="355" y="206" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="460" y="182" width="110" height="36" rx="6"/>
  <text class="d-text" x="515" y="206" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="620" y="182" width="110" height="36" rx="6"/>
  <text class="d-text" x="675" y="206" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="20" y="238" width="200" height="36" rx="6"/>
  <text class="d-text" x="120" y="262" text-anchor="middle">Dev 85</text>
  <rect class="d-box-muted" x="300" y="238" width="110" height="36" rx="6"/>
  <text class="d-text" x="355" y="262" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="460" y="238" width="110" height="36" rx="6"/>
  <text class="d-text" x="515" y="262" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="620" y="238" width="110" height="36" rx="6"/>
  <text class="d-text" x="675" y="262" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="20" y="294" width="200" height="36" rx="6"/>
  <text class="d-text" x="120" y="318" text-anchor="middle">Eva 85</text>
  <rect class="d-box-muted" x="300" y="294" width="110" height="36" rx="6"/>
  <text class="d-text" x="355" y="318" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="460" y="294" width="110" height="36" rx="6"/>
  <text class="d-text" x="515" y="318" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="620" y="294" width="110" height="36" rx="6"/>
  <text class="d-text" x="675" y="318" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="20" y="350" width="200" height="36" rx="6"/>
  <text class="d-text" x="120" y="374" text-anchor="middle">Fin 85</text>
  <rect class="d-box-muted" x="300" y="350" width="110" height="36" rx="6"/>
  <text class="d-text" x="355" y="374" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="460" y="350" width="110" height="36" rx="6"/>
  <text class="d-text" x="515" y="374" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="620" y="350" width="110" height="36" rx="6"/>
  <text class="d-text" x="675" y="374" text-anchor="middle">3</text>
  <rect class="d-box" x="20" y="406" width="200" height="36" rx="6"/>
  <text class="d-text" x="120" y="430" text-anchor="middle">Gia 70</text>
  <rect class="d-box-muted" x="300" y="406" width="110" height="36" rx="6"/>
  <text class="d-text" x="355" y="430" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="460" y="406" width="110" height="36" rx="6"/>
  <text class="d-text" x="515" y="430" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="620" y="406" width="110" height="36" rx="6"/>
  <text class="d-text" x="675" y="430" text-anchor="middle">4</text>
</svg>

The first example, over class A:

~~~text
student | score | row_num | rnk | dense_rnk
Ana | 95 | 1 | 1 | 1
Ben | 90 | 2 | 2 | 2
Cai | 90 | 3 | 2 | 2
Dev | 85 | 4 | 4 | 3
Eva | 85 | 5 | 4 | 3
Fin | 85 | 6 | 4 | 3
Gia | 70 | 7 | 7 | 4
~~~

📌 **Interview term: ROW_NUMBER** — a sequential number 1, 2, 3, ... with no repeats. Ties are broken by whatever else is in the \`ORDER BY\` (here \`student\`); if nothing breaks them, the order among peers is arbitrary.

📌 **Interview term: RANK** — peers get the same number, and the following row gets the number it would have had without the tie, leaving a **gap**. After two people at 2, the next is 4.

📌 **Interview term: DENSE_RANK** — peers get the same number, and the following row gets the next integer, so there is **no gap**. After two people at 2, the next is 3.

| Score | ROW_NUMBER | RANK | DENSE_RANK |
| :--- | :--- | :--- | :--- |
| 95 | 1 | 1 | 1 |
| 90 | 2 | 2 | 2 |
| 90 | 3 | 2 | 2 |
| 85 | 4 | 4 | 3 |
| 85 | 5 | 4 | 3 |
| 85 | 6 | 4 | 3 |
| 70 | 7 | 7 | 4 |

Notice two invariants in that table: the last \`RANK\` (7) equals the row count because Gia does not tie, and the last \`DENSE_RANK\` (4) equals the number of distinct scores.

## 3. What Exactly Are They Counting?

The cleanest way to remember the difference is a formula, and the third example proves it by computing each one twice, once with the window function and once by brute force with a correlated subquery:

- \`RANK\` = 1 + (number of rows with a strictly better score)
- \`DENSE_RANK\` = 1 + (number of **distinct** strictly better scores)

~~~text
student | score | rnk | rows_above_plus_1 | dense_rnk | distinct_above_plus_1
Ana | 95 | 1 | 1 | 1 | 1
Ben | 90 | 2 | 2 | 2 | 2
Cai | 90 | 2 | 2 | 2 | 2
Dev | 85 | 4 | 4 | 3 | 3
Eva | 85 | 4 | 4 | 3 | 3
Fin | 85 | 4 | 4 | 3 | 3
Gia | 70 | 7 | 7 | 4 | 4
~~~

The columns match row for row. Dev has 3 rows above him (Ana, Ben, Cai), so \`RANK\` 4; but only 2 distinct scores above him (95, 90), so \`DENSE_RANK\` 3. \`ROW_NUMBER\` has no such formula over values, because it depends on position, not value.

📌 **Interview term: gap** — the skipped numbers after a tie in \`RANK\`. The size of the gap is (number of peers - 1): two 90s skip one number (3), three 85s skip two (5 and 6).

## 4. PARTITION BY: One Ranking per Group

Add \`PARTITION BY class\` and each class gets its own independent numbering starting at 1 (the second example):

~~~text
class | student | score | row_num | rnk | dense_rnk
A | Ana | 95 | 1 | 1 | 1
A | Ben | 90 | 2 | 2 | 2
A | Cai | 90 | 3 | 2 | 2
A | Dev | 85 | 4 | 4 | 3
A | Eva | 85 | 5 | 4 | 3
A | Fin | 85 | 6 | 4 | 3
A | Gia | 70 | 7 | 7 | 4
B | Hal | 88 | 1 | 1 | 1
B | Ivy | 88 | 2 | 1 | 1
B | Jon | 75 | 3 | 3 | 2
B | Kim | NULL | 4 | 4 | 3
~~~

In class B, Hal and Ivy tie at 88, so both are \`RANK\` 1 and Jon is \`RANK\` 3 but \`DENSE_RANK\` 2. Kim has no score (NULL) and lands last because the query says \`NULLS LAST\`.

## 5. The NULL Trap: Engines Disagree

📌 **Interview term: NULL ordering** — where NULLs go in a sort. PostgreSQL treats NULL as larger than every value, so it comes **last in ASC and first in DESC**. SQLite treats NULL as smaller than every value, so it comes first in ASC and last in DESC. Ranking by \`score DESC\` therefore makes a missing score the winner on PostgreSQL. The fourth example, on PostgreSQL 16:

~~~text
student | score | rank_default | rank_nulls_last
Hal | 88 | 2 | 1
Ivy | 88 | 2 | 1
Jon | 75 | 4 | 3
Kim | NULL | 1 | 4
~~~

The same query on SQLite 3.45 (both columns agree there, because NULL is already last in DESC):

~~~text
student | score | rank_default | rank_nulls_last
Hal | 88 | 1 | 1
Ivy | 88 | 1 | 1
Jon | 75 | 3 | 3
Kim | NULL | 4 | 4
~~~

On PostgreSQL, Kim (no score) is \`rank_default\` 1 and pushes Hal and Ivy down to 2. Writing \`NULLS LAST\` makes both engines agree. SQLite has accepted \`NULLS FIRST\` / \`NULLS LAST\` since 3.30.0 ([release log](https://www.sqlite.org/releaselog/3_30_0.html)). MySQL has no such clause and treats NULL as lower than any value, like SQLite; the usual workaround there is \`ORDER BY score IS NULL, score DESC\` ([Baeldung on sorting NULLs](https://www.baeldung.com/sql/sort-ascending-null-values-last)).

## 6. Deterministic or Not?

\`RANK\` and \`DENSE_RANK\` are deterministic: peers always get the same number, so it does not matter how the engine orders them internally. \`ROW_NUMBER\` is not, when the window \`ORDER BY\` has ties. On PostgreSQL 16, numbering by \`score DESC\` alone gave:

~~~text
student | rn
Ana | 1
Ben | 2
Cai | 3
Dev | 4
Eva | 5
Fin | 6
Gia | 7
~~~

Ben got 2 and Cai 3 this time, but nothing in the query guarantees it; a different plan, more data or another engine can swap them. In [What are window functions?](/interview-question/what-are-window-functions) the two engines here broke an identical tie in opposite ways. Always add a unique tiebreaker (\`ORDER BY score DESC, id\`) when you will filter on \`ROW_NUMBER\`.

A ranking function with an empty window order is legal but useless: every row is a peer of every other, so \`RANK() OVER ()\` returned 1 for all seven rows on SQLite:

~~~text
student | r
Ana | 1
Ben | 1
Cai | 1
Dev | 1
Eva | 1
Fin | 1
Gia | 1
~~~

Ranking functions also ignore any frame clause. Adding \`ROWS BETWEEN CURRENT ROW AND CURRENT ROW\` to all three windows left every number unchanged on both engines here; the rank is always computed against the whole partition.

## 7. The Relatives: NTILE, PERCENT_RANK, CUME_DIST

📌 **Interview term: NTILE(k)** — divides the ordered rows into k buckets as equal as possible, numbered 1 to k. Bucket boundaries ignore ties: Dev and Eva (85) are in bucket 2 but Fin (85) is in bucket 3 below.

📌 **Interview term: PERCENT_RANK** — (RANK - 1) / (rows - 1), from 0 for the first to 1 for the last.

📌 **Interview term: CUME_DIST** — (rows at or ahead of the current row, peers included) / rows.

~~~text
student | score | tercile | pct_rank | cume
Ana | 95 | 1 | 0 | 0.14
Ben | 90 | 1 | 0.17 | 0.43
Cai | 90 | 1 | 0.17 | 0.43
Dev | 85 | 2 | 0.5 | 0.86
Eva | 85 | 2 | 0.5 | 0.86
Fin | 85 | 3 | 0.5 | 0.86
Gia | 70 | 3 | 1 | 1
~~~

(Run on SQLite.) On PostgreSQL the same \`ROUND(PERCENT_RANK() OVER (...), 2)\` fails, because \`PERCENT_RANK\` and \`CUME_DIST\` return \`double precision\` and the two-argument \`ROUND\` only accepts \`numeric\`. The error PostgreSQL 16 gave:

~~~text
ERROR:  function round(double precision, integer) does not exist
LINE 1: SELECT student, ROUND(PERCENT_RANK() OVER (ORDER BY score DE...
                        ^
HINT:  No function matches the given name and argument types. You might need to add explicit type casts.
~~~

The fix is a cast: \`ROUND((PERCENT_RANK() OVER (ORDER BY score DESC))::numeric, 2)\`.

## 8. Verified: Running the Code

The three SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above). They produced identical output on PostgreSQL 16.15. The PostgreSQL example and the \`ROUND\` error were run on PostgreSQL 16.15 in a scratch database with the same schema.

Example 1, side by side:

~~~text
student | score | row_num | rnk | dense_rnk
Ana | 95 | 1 | 1 | 1
Ben | 90 | 2 | 2 | 2
Cai | 90 | 3 | 2 | 2
Dev | 85 | 4 | 4 | 3
Eva | 85 | 5 | 4 | 3
Fin | 85 | 6 | 4 | 3
Gia | 70 | 7 | 7 | 4
~~~

Example 2, partitioned by class:

~~~text
class | student | score | row_num | rnk | dense_rnk
A | Ana | 95 | 1 | 1 | 1
A | Ben | 90 | 2 | 2 | 2
A | Cai | 90 | 3 | 2 | 2
A | Dev | 85 | 4 | 4 | 3
A | Eva | 85 | 5 | 4 | 3
A | Fin | 85 | 6 | 4 | 3
A | Gia | 70 | 7 | 7 | 4
B | Hal | 88 | 1 | 1 | 1
B | Ivy | 88 | 2 | 1 | 1
B | Jon | 75 | 3 | 3 | 2
B | Kim | NULL | 4 | 4 | 3
~~~

Example 3, the counting formulas:

~~~text
student | score | rnk | rows_above_plus_1 | dense_rnk | distinct_above_plus_1
Ana | 95 | 1 | 1 | 1 | 1
Ben | 90 | 2 | 2 | 2 | 2
Cai | 90 | 2 | 2 | 2 | 2
Dev | 85 | 4 | 4 | 3 | 3
Eva | 85 | 4 | 4 | 3 | 3
Fin | 85 | 4 | 4 | 3 | 3
Gia | 70 | 7 | 7 | 4 | 4
~~~

Example 4, PostgreSQL NULL placement:

~~~text
student | score | rank_default | rank_nulls_last
Hal | 88 | 2 | 1
Ivy | 88 | 2 | 1
Jon | 75 | 4 | 3
Kim | NULL | 1 | 4
~~~

## Common Pitfalls

- **Using \`ROW_NUMBER\` on a non-unique order and treating the result as stable.** Peers can be numbered either way; add a unique tiebreaker.
- **Expecting \`RANK\` to be consecutive.** After a tie it skips; a filter like \`rnk = 3\` can return no rows at all.
- **Forgetting NULLs in \`DESC\` rankings on PostgreSQL.** A NULL score ranks 1st unless you write \`NULLS LAST\` or filter NULLs out.
- **Leaving out the window \`ORDER BY\`.** Every row becomes a peer and every rank is 1.
- **Confusing the window \`ORDER BY\` with the query \`ORDER BY\`.** The ranking order does not sort the output; add a final \`ORDER BY\`.
- **Assuming \`NTILE\` respects ties.** Equal values can land in different buckets.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What they share:</strong> <span style="color:#f0e2c8;">All three are <strong style="color:#ffca28;">ranking window functions</strong>: they number the rows of each partition in the order of the window <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY</code>. The only difference is what they do with <strong style="color:#ffca28;">peers</strong>, rows that tie on that order.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. ROW_NUMBER:</strong> <span style="color:#f0e2c8;">Always distinct: 95, 90, 90, 85 becomes 1, 2, 3, 4. Which of the two 90s gets 2 is arbitrary unless the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY</code> has a unique tiebreaker such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">student</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">id</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. RANK:</strong> <span style="color:#f0e2c8;">Peers share a number and the next number skips: 1, 2, 2, 4. It equals 1 + the number of rows strictly ahead, like sports standings where two people tied for second means nobody is third.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. DENSE_RANK:</strong> <span style="color:#f0e2c8;">Peers share a number with no gap: 1, 2, 2, 3. It equals 1 + the number of <strong style="color:#ffca28;">distinct</strong> values strictly ahead, so the last rank equals the number of distinct scores.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PARTITION BY class</code> restarts all three per class. NULLs sort first in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DESC</code> on PostgreSQL and last on SQLite, so a missing score can rank 1st; write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NULLS LAST</code>. All three ignore any frame clause.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the maximum value of each function in a partition of n rows?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROW_NUMBER</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RANK</code> both end at most at n (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROW_NUMBER</code> exactly n; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RANK</code> is n unless the last rows tie). <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DENSE_RANK</code> ends at the number of distinct values, 4 for the 7 scores here.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you pick each one?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROW_NUMBER</code> when you need exactly one row per position (dedup, pagination, pick one winner). <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RANK</code> for standings where a tie should push others down. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DENSE_RANK</code> for questions about distinct values, like the 2nd highest salary. The scenario page goes deeper.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ROW_NUMBER() OVER (ORDER BY score DESC)</code> deterministic?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">score</code> is unique. Tied rows may be numbered in either order and can change between runs or engines. Add a unique column to the window <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use RANK without ORDER BY in OVER?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It runs but means nothing: with no order every row is a peer of every other, so every row gets rank 1 (checked on SQLite). Always give ranking functions an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What are NTILE, PERCENT_RANK and CUME_DIST?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NTILE(k)</code> splits the ordered rows into k nearly equal buckets (ties can be split across buckets). <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PERCENT_RANK</code> is (rank - 1) / (n - 1). <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CUME_DIST</code> is the share of rows at or ahead of the current one, peers included.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Ranking function | A window function returning a position within a partition |
| Peers | Rows tied on the window \`ORDER BY\` |
| ROW_NUMBER | 1, 2, 3, ... with no repeats; ties broken arbitrarily without a tiebreaker |
| RANK | Peers share a number, then a gap: 1 + rows strictly ahead |
| DENSE_RANK | Peers share a number, no gap: 1 + distinct values strictly ahead |
| Gap | Numbers skipped by \`RANK\` after a tie |
| NULL ordering | Where NULLs sort; differs between PostgreSQL and SQLite |
| NTILE(k) | Splits ordered rows into k near-equal buckets |
| PERCENT_RANK | (rank - 1) / (rows - 1) |
| CUME_DIST | Share of rows at or ahead of the current row |

**Conclusion:** \`ROW_NUMBER\`, \`RANK\` and \`DENSE_RANK\` number rows in the same order and differ only on ties: \`ROW_NUMBER\` never repeats (1, 2, 3, 4), \`RANK\` repeats and then skips (1, 2, 2, 4) because it counts rows ahead, and \`DENSE_RANK\` repeats without skipping (1, 2, 2, 3) because it counts distinct values ahead. Say that, give the 95/90/90/85 example, and add the two details that separate a strong answer: \`ROW_NUMBER\` needs a unique tiebreaker to be deterministic, and NULL placement in a \`DESC\` ranking differs between engines unless you write \`NULLS LAST\`.`,
    examples: [
      {
        label: `The three functions side by side over class A (ties at 90 and 85)`,
        code: `SELECT student, score,
       ROW_NUMBER() OVER (ORDER BY score DESC, student) AS row_num,
       RANK()       OVER (ORDER BY score DESC) AS rnk,
       DENSE_RANK() OVER (ORDER BY score DESC) AS dense_rnk
FROM exam_scores
WHERE class = 'A'
ORDER BY score DESC, student;`,
      },
      {
        label: `PARTITION BY class restarts the numbering in each class`,
        code: `SELECT class, student, score,
       ROW_NUMBER() OVER (PARTITION BY class ORDER BY score DESC NULLS LAST, student) AS row_num,
       RANK()       OVER (PARTITION BY class ORDER BY score DESC NULLS LAST) AS rnk,
       DENSE_RANK() OVER (PARTITION BY class ORDER BY score DESC NULLS LAST) AS dense_rnk
FROM exam_scores
ORDER BY class, row_num;`,
      },
      {
        label: `What RANK and DENSE_RANK count: rows ahead vs distinct values ahead`,
        code: `SELECT e.student, e.score,
       RANK() OVER (ORDER BY e.score DESC) AS rnk,
       1 + (SELECT COUNT(*) FROM exam_scores x
            WHERE x.class = 'A' AND x.score > e.score) AS rows_above_plus_1,
       DENSE_RANK() OVER (ORDER BY e.score DESC) AS dense_rnk,
       1 + (SELECT COUNT(DISTINCT x.score) FROM exam_scores x
            WHERE x.class = 'A' AND x.score > e.score) AS distinct_above_plus_1
FROM exam_scores AS e
WHERE e.class = 'A'
ORDER BY e.score DESC, e.student;`,
      },
      {
        label: `PostgreSQL: a NULL score ranks first in DESC order unless you say NULLS LAST`,
        code: `SELECT student, score,
       RANK() OVER (ORDER BY score DESC) AS rank_default,
       RANK() OVER (ORDER BY score DESC NULLS LAST) AS rank_nulls_last
FROM exam_scores
WHERE class = 'B'
ORDER BY rank_nulls_last, student;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `RANK() vs DENSE_RANK() vs ROW_NUMBER() — when does the gap matter and how do you choose?`,
    difficulty: "hard",
    seoDescription: `Choosing ROW_NUMBER, RANK or DENSE_RANK is choosing a tie policy: top-N filters, RANK = 2 returning nothing, Nth highest values and one row per key.`,
    description: `**Question presented to candidate:**
"Say we pay a bonus to the top 3 sales reps in each region, and some reps have exactly the same revenue. Would you use ROW_NUMBER, RANK or DENSE_RANK to pick them? When does the difference actually change the result, and how do you decide?"

**What a strong answer should cover:**
- The functions only differ on ties, so the choice is a business question: should ties share a place, and should "top N" mean N rows, N places or N distinct values?
- \`WHERE rn <= N\` with \`ROW_NUMBER\` always returns at most N rows per group but drops tied rows arbitrarily unless there is a business tiebreaker; \`RANK <= N\` returns every row tied at the boundary (can be more than N); \`DENSE_RANK <= N\` returns N distinct values (can be many more rows)
- The gap matters for equality filters: \`RANK() = 2\` returns nothing after a tie for first, while \`DENSE_RANK() = 2\` means "the second-highest value" (the Nth highest salary pattern)
- \`ROW_NUMBER\` with a unique tiebreaker is the tool for dedup and "latest row per key"; \`RANK = 1\` there can return two rows
- Equivalents and performance: \`FETCH FIRST n ROWS WITH TIES\` (PostgreSQL 13+) behaves like \`RANK <= n\` for one group; PostgreSQL 15+ can stop a WindowAgg early on these filters

**Clarifying questions expected:**
- If two reps tie at the cut-off, do both get the bonus, or do we need exactly three people?
- Is there a natural tiebreaker (earlier close date, lower id), or would picking one be arbitrary?
- Does "top 3" mean three people or the three highest revenue figures?

**Code / implementation expected:** Yes — the same "top 3" filter with all three functions, showing the different row counts.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE sales_reps (
  id INTEGER PRIMARY KEY,
  rep TEXT NOT NULL,
  region TEXT NOT NULL,
  revenue INTEGER NOT NULL
);
INSERT INTO sales_reps (id, rep, region, revenue) VALUES
  (1, 'Mia', 'North', 500),
  (2, 'Noah', 'North', 450),
  (3, 'Olu', 'North', 450),
  (4, 'Pia', 'North', 450),
  (5, 'Raj', 'North', 300),
  (6, 'Sam', 'South', 610),
  (7, 'Tia', 'South', 610),
  (8, 'Uma', 'South', 400),
  (9, 'Vik', 'South', 380);
CREATE TABLE plan_changes (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  plan TEXT NOT NULL
);
INSERT INTO plan_changes (id, email, changed_at, plan) VALUES
  (1, 'ann@example.com', '2024-05-01 09:00', 'free'),
  (2, 'ann@example.com', '2024-06-12 14:30', 'pro'),
  (3, 'bo@example.com', '2024-05-20 10:00', 'free'),
  (4, 'bo@example.com', '2024-07-01 08:00', 'pro'),
  (5, 'bo@example.com', '2024-07-01 08:00', 'team'),
  (6, 'cy@example.com', '2024-06-02 16:45', 'free');
\`\`\``,
    answer: `**Target Audience:** Developers who know what the three ranking functions return and now need to choose one for a real task (top N, Nth highest, dedup), plus candidates preparing for the follow-ups.
**Difficulty:** Hard
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15, both run for this page. SQL Server and PostgreSQL version facts are cited.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result shown was produced by actually running it; the **Verified** section quotes each example output in full.

The definitions (1, 2, 3, 4 vs 1, 2, 2, 4 vs 1, 2, 2, 3) are covered on [What is the difference between ROW_NUMBER, RANK, and DENSE_RANK?](/interview-question/what-is-the-difference-between-row-number-rank-and-dense-rank). This page is about **choosing**: the situations where the gap changes which rows come back.

## 1. Why This Even Matters — A Story First

A sales director announces: "Bonuses for the top 3 reps in every region." In the North region the numbers are Mia 500, then Noah, Olu and Pia all on exactly 450, then Raj on 300.

Who gets a bonus? Three different people in the room give three different answers:

- Finance: "Three bonuses, that is the budget. Mia plus two of the 450s." (Which two? Nobody can say.)
- HR: "Mia is 1st and the three 450s are joint 2nd. Four bonuses." Raj is 5th.
- The director: "I meant the top three *revenue levels*: 500, 450 and 300. Everybody gets one."

All three are reasonable, and they are exactly \`ROW_NUMBER\`, \`RANK\` and \`DENSE_RANK\` with \`<= 3\`. The SQL is one word different, the payroll is different, and if the query was written without asking, someone gets an unpleasant surprise. That is why interviewers ask this as a "how do you choose" question: the right answer starts with a question back.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| If there is a tie at the cut-off, do all tied rows qualify? | Yes means \`RANK\` (or \`WITH TIES\`); no means \`ROW_NUMBER\` with a tiebreaker |
| Does "top N" mean N rows, N places or N distinct values? | Rows: \`ROW_NUMBER\`; places: \`RANK\`; values: \`DENSE_RANK\` |
| Is there a business tiebreaker? | Without one, \`ROW_NUMBER\` picks arbitrarily and the result can change between runs |
| Can the ranking column be NULL? | PostgreSQL sorts NULL first in \`DESC\`, so a missing value can win rank 1 |
| Is this per group or one global list? | Per group needs \`PARTITION BY\`; a global list can use \`LIMIT\` or \`FETCH FIRST ... WITH TIES\` |

## 3. The Decision in One Picture

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="Choosing a ranking function: exactly one row per slot gives ROW_NUMBER, ties share a place and push others down gives RANK, counting distinct values gives DENSE_RANK">
  <defs>
    <marker id="sql07q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="20" width="420" height="64" rx="8"/>
  <text class="d-text" x="230" y="47" text-anchor="middle">Need exactly one row per position?</text>
  <text class="d-sub" x="230" y="70" text-anchor="middle">dedup, latest row, pagination</text>
  <rect class="d-box-accent" x="530" y="20" width="210" height="64" rx="8"/>
  <text class="d-accent" x="635" y="47" text-anchor="middle">ROW_NUMBER</text>
  <text class="d-sub" x="635" y="70" text-anchor="middle">plus a unique tiebreaker</text>
  <rect class="d-box" x="20" y="118" width="420" height="64" rx="8"/>
  <text class="d-text" x="230" y="145" text-anchor="middle">Ties share a place and push others down?</text>
  <text class="d-sub" x="230" y="168" text-anchor="middle">standings, prizes, top N people with ties</text>
  <rect class="d-box-accent" x="530" y="118" width="210" height="64" rx="8"/>
  <text class="d-accent" x="635" y="145" text-anchor="middle">RANK</text>
  <text class="d-sub" x="635" y="168" text-anchor="middle">1, 2, 2, 4</text>
  <rect class="d-box" x="20" y="216" width="420" height="64" rx="8"/>
  <text class="d-text" x="230" y="243" text-anchor="middle">Asking about distinct values?</text>
  <text class="d-sub" x="230" y="266" text-anchor="middle">Nth highest salary, price tiers</text>
  <rect class="d-box-accent" x="530" y="216" width="210" height="64" rx="8"/>
  <text class="d-accent" x="635" y="243" text-anchor="middle">DENSE_RANK</text>
  <text class="d-sub" x="635" y="266" text-anchor="middle">1, 2, 2, 3</text>
  <path class="d-edge-accent" d="M 444 52 L 524 52" marker-end="url(#sql07q3-arrow)"/>
  <path class="d-edge-accent" d="M 444 150 L 524 150" marker-end="url(#sql07q3-arrow)"/>
  <path class="d-edge-accent" d="M 444 248 L 524 248" marker-end="url(#sql07q3-arrow)"/>
</svg>

📌 **Interview term: tie policy** — the business rule for what happens when rows are equal on the ranking column. Choosing a ranking function *is* choosing a tie policy; a strong answer says so out loud.

📌 **Interview term: tiebreaker** — an extra column in the window \`ORDER BY\` that makes the order unique, such as \`id\` or \`closed_at\`. It turns \`ROW_NUMBER\` from arbitrary into reproducible.

## 4. Scenario 1: Top N With a Tie at the Boundary

The first example ranks North and marks who qualifies for "top 3" under each function:

~~~text
rep | revenue | row_num | rnk | dense_rnk | top3_row_num | top3_rank | top3_dense
Mia | 500 | 1 | 1 | 1 | yes | yes | yes
Noah | 450 | 2 | 2 | 2 | yes | yes | yes
Olu | 450 | 3 | 2 | 2 | yes | yes | yes
Pia | 450 | 4 | 2 | 2 | - | yes | yes
Raj | 300 | 5 | 5 | 3 | - | - | yes
~~~

| Filter | Rows returned | Meaning |
| :--- | :--- | :--- |
| \`row_num <= 3\` | 3 | Exactly N rows. Pia was dropped only because her \`id\` is larger; that is the tiebreaker deciding |
| \`rnk <= 3\` | 4 | Everyone whose position is 3 or better, all ties at the boundary included |
| \`dense_rnk <= 3\` | 5 | Everyone at one of the 3 highest distinct revenues |

📌 **Interview term: boundary tie** — a tie that straddles the cut-off N. It is the only case where \`ROW_NUMBER <= N\` and \`RANK <= N\` differ.

Per region, the same three filters with N = 2 return different counts in both regions (run on SQLite and PostgreSQL with identical output):

~~~text
region | top2_row_num | top2_rank | top2_dense
North | 2 | 4 | 4
South | 2 | 2 | 3
~~~

In South, Sam and Tia tie for first at 610, so \`RANK <= 2\` and \`ROW_NUMBER <= 2\` agree (2 reps) but \`DENSE_RANK <= 2\` adds Uma, the second distinct level. In North, \`RANK <= 2\` takes all four of Mia and the 450s.

For the full per-group top-N pattern see [Top-N per group with RANK() OVER (PARTITION BY)](/interview-question/top-n-per-group-with-rank-over-partition-by-how-do-you-get-top-2-per-department-), and for alternatives and their cost [LATERAL vs window function vs correlated subquery for top-N per group](/interview-question/lateral-vs-window-function-vs-correlated-subquery-for-top-n-per-group-which-scal).

## 5. Scenario 2: Equality Filters, Where the Gap Bites

\`<=\` filters only differ at the boundary. \`=\` filters can return **nothing**. The second example asks each region for rank 2 and dense rank 2:

~~~text
region | rep | revenue | rnk | dense_rnk
North | Noah | 450 | 2 | 2
North | Olu | 450 | 2 | 2
North | Pia | 450 | 2 | 2
South | Uma | 400 | 3 | 2
~~~

📌 **Interview term: rank gap** — the numbers \`RANK\` skips after a tie. In South, Sam and Tia share rank 1, so the next rank is 3: there is no rank 2, and \`WHERE rnk = 2\` returns no South row. \`DENSE_RANK\` has no gaps, so Uma is dense rank 2, the second-highest revenue figure.

That is the reason the classic [How do you find the Nth highest salary?](/interview-question/how-do-you-find-the-nth-highest-salary) answer uses \`DENSE_RANK() = N\`: "the Nth highest salary" is a question about distinct values. With \`ROW_NUMBER() = 2\`, South would return Tia, a joint top earner, as "second highest", which is wrong.

## 6. Scenario 3: Exactly One Row per Key

To get each user current plan, take the latest change per email. User \`bo@example.com\` has two changes stamped with the same minute (a data quality problem that happens in real systems). The third example:

~~~text
email | changed_at | plan | rnk | row_num
ann@example.com | 2024-06-12 14:30 | pro | 1 | 1
bo@example.com | 2024-07-01 08:00 | team | 1 | 1
bo@example.com | 2024-07-01 08:00 | pro | 1 | 2
cy@example.com | 2024-06-02 16:45 | free | 1 | 1
~~~

\`WHERE rnk = 1\` returned **two** rows for bo, because both are peers at the latest timestamp. Any join to this "latest plan" view would now duplicate bo. \`ROW_NUMBER\` with a tiebreaker (\`id DESC\`, the most recently inserted row) gives \`row_num = 1\` to exactly one of them. Filtering on \`row_num = 1\` instead of \`rnk = 1\` is the correct query.

📌 **Interview term: deduplication with ROW_NUMBER** — number the rows within each key by a unique order and keep \`row_num = 1\`. It is the standard way to keep one row per key; see [How do you delete duplicate rows but keep one?](/interview-question/how-do-you-delete-duplicate-rows-but-keep-one)

## 7. Shortcuts and Performance

📌 **Interview term: WITH TIES** — a row-limiting option that returns the first n rows plus every further row equal to the last one on the \`ORDER BY\`. For a single list it is \`RANK <= n\` without a window. PostgreSQL added \`FETCH FIRST ... WITH TIES\` in version 13 ([PostgreSQL 13 release announcement](https://www.postgresql.org/about/news/2077/)); SQL Server has long had \`TOP (n) WITH TIES\` ([TOP (Transact-SQL)](https://technet.microsoft.com/en-us/library/ms189463)). The fourth example, on PostgreSQL 16:

~~~text
rep | revenue
Mia | 500
Noah | 450
Olu | 450
Pia | 450
~~~

Asking for 2 rows returned 4, because Noah, Olu and Pia all tie with the 2nd row. SQLite 3.45 does not have this syntax:

~~~text
Error: near "FETCH": syntax error
~~~

It only works on one list; for per-group top N, you still need \`PARTITION BY\` and a ranking function.

📌 **Interview term: run condition** — since PostgreSQL 15, the planner can push a filter on \`row_number()\`, \`rank()\`, \`dense_rank()\` or \`count()\` from the outer query into the WindowAgg node, so the node stops producing rows once the value can no longer satisfy the filter ([Percona on the PostgreSQL 15 change](https://www.percona.com/blog/introducing-performance-improvement-of-window-functions-in-postgresql-15/)). PostgreSQL 16 here:

~~~text
QUERY PLAN
WindowAgg
  Run Condition: (rank() OVER (?) <= 3)
  ->  Sort
        Sort Key: sales_reps.revenue DESC
        ->  Seq Scan on sales_reps
~~~

The sort still has to read every row, so the saving is in the window work, not the scan. The choice between the three functions does not change cost meaningfully; they all need the same sort.

## 8. Verified: Running the Code

The three SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above); they also gave identical output on PostgreSQL 16.15. The PostgreSQL example, the plan and the per-region counts were run on PostgreSQL 16.15 in a scratch database with the same schema.

Example 1, top 3 in North:

~~~text
rep | revenue | row_num | rnk | dense_rnk | top3_row_num | top3_rank | top3_dense
Mia | 500 | 1 | 1 | 1 | yes | yes | yes
Noah | 450 | 2 | 2 | 2 | yes | yes | yes
Olu | 450 | 3 | 2 | 2 | yes | yes | yes
Pia | 450 | 4 | 2 | 2 | - | yes | yes
Raj | 300 | 5 | 5 | 3 | - | - | yes
~~~

Example 2, rank 2 vs dense rank 2:

~~~text
region | rep | revenue | rnk | dense_rnk
North | Noah | 450 | 2 | 2
North | Olu | 450 | 2 | 2
North | Pia | 450 | 2 | 2
South | Uma | 400 | 3 | 2
~~~

Example 3, latest plan per user:

~~~text
email | changed_at | plan | rnk | row_num
ann@example.com | 2024-06-12 14:30 | pro | 1 | 1
bo@example.com | 2024-07-01 08:00 | team | 1 | 1
bo@example.com | 2024-07-01 08:00 | pro | 1 | 2
cy@example.com | 2024-06-02 16:45 | free | 1 | 1
~~~

Example 4, PostgreSQL \`WITH TIES\`:

~~~text
rep | revenue
Mia | 500
Noah | 450
Olu | 450
Pia | 450
~~~

## Common Pitfalls

- **Choosing without asking about ties.** The query is correct only relative to a tie policy; state the one you assumed.
- **\`ROW_NUMBER\` without a tiebreaker for anything you will filter on.** The rows that survive can change between runs, which shows up as flaky reports.
- **\`RANK() = N\` for "the Nth highest value".** After a tie above N, no row has rank N. Use \`DENSE_RANK\`.
- **\`RANK() = 1\` for "the latest row".** Duplicate timestamps return two rows and duplicate every join downstream. Use \`ROW_NUMBER\` with \`id\` as the tiebreaker.
- **Assuming \`rnk <= N\` returns N rows.** It returns more on a boundary tie; size any downstream budget or \`LIMIT\` accordingly.
- **Ranking a nullable column \`DESC\` on PostgreSQL.** NULLs come first and win rank 1; add \`NULLS LAST\` or filter them.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Frame it as a tie policy:</strong> <span style="color:#f0e2c8;">The three functions agree until there is a tie, so the choice is really a business rule: do tied rows share a place, and does top N mean N <strong style="color:#ffca28;">rows</strong>, N <strong style="color:#ffca28;">places</strong> or N <strong style="color:#ffca28;">distinct values</strong>?</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Top-N filters:</strong> <span style="color:#f0e2c8;">With 500, 450, 450, 450, 300, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">row_num &lt;= 3</code> keeps 3 reps and silently drops one of the 450s, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rnk &lt;= 3</code> keeps 4 (everyone tied at the boundary), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dense_rnk &lt;= 3</code> keeps all 5 (three distinct revenue levels).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Equality filters:</strong> <span style="color:#f0e2c8;">The gap bites with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">=</code>: if two reps tie for first, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RANK() = 2</code> returns <strong style="color:#ffca28;">nothing</strong>, because the next rank is 3. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DENSE_RANK() = 2</code> means the second-highest value, which is why the Nth-highest-salary answer uses it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. One row per key:</strong> <span style="color:#f0e2c8;">For dedup or latest row per user, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROW_NUMBER</code> with a unique tiebreaker such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">id DESC</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RANK() = 1</code> returns two rows when two changes share the latest timestamp.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Extras:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FETCH FIRST n ROWS WITH TIES</code> (PostgreSQL 13+, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TOP n WITH TIES</code> in SQL Server) equals <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RANK &lt;= n</code> for one group. PostgreSQL 15+ shows a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Run Condition</code> on the WindowAgg and stops computing once the rank passes n.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The business wants exactly 3 winners but there is a tie at 3rd. What do you do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Push back for a rule, then encode it as a tiebreaker in the window <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY</code> (earlier close date, larger deal count). <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROW_NUMBER() OVER (ORDER BY revenue DESC, closed_at, id)</code> gives exactly 3 and is reproducible. Without a rule the pick is arbitrary and can change between runs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you find the 2nd highest salary per department?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC)</code> and filter <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">= 2</code>. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RANK</code>, a tie for first leaves no 2 at all; with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROW_NUMBER</code>, a tie for first returns the other top earner as second.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">RANK &lt;= N</code> filter return fewer than N rows?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, only if the group has fewer than N rows. It can return more than N when there is a tie at the boundary. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DENSE_RANK &lt;= N</code> can return far more than N rows when values repeat.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a performance difference between them?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not meaningfully: all three need the same sort. What matters is the filter. In PostgreSQL 15+ a filter like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rnk &lt;= 3</code> in the outer query becomes a run condition, so the WindowAgg stops early, though the sort still reads all input.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ORDER BY ... LIMIT 3</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LIMIT</code> works for one global list, not per group, and it cuts ties arbitrarily. For per-group top N you need a window function or a [LATERAL join](/interview-question/lateral-join-how-do-you-fetch-the-top-3-orders-per-customer-efficiently).</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Tie policy | The business rule for equal values; choosing a ranking function encodes it |
| Tiebreaker | Extra unique column in the window \`ORDER BY\` that makes the order reproducible |
| Boundary tie | A tie straddling the cut-off N; where \`ROW_NUMBER\` and \`RANK\` filters differ |
| Rank gap | Numbers skipped by \`RANK\` after a tie; makes \`RANK = N\` filters return nothing |
| Deduplication with ROW_NUMBER | Number rows per key by a unique order and keep \`row_num = 1\` |
| WITH TIES | Row-limiting option that also returns rows tied with the last row |
| Run condition | PostgreSQL 15+ optimisation that stops a WindowAgg early on rank filters |

**Conclusion:** \`ROW_NUMBER\`, \`RANK\` and \`DENSE_RANK\` only disagree on ties, so choosing between them means choosing a tie policy. Use \`ROW_NUMBER\` with a unique tiebreaker when you need exactly one row per position (dedup, latest row, exactly N winners); \`RANK\` when tied rows share a place and push the next ones down (standings, "top N with ties", the same as \`WITH TIES\`); and \`DENSE_RANK\` when the question is about distinct values (the Nth highest salary). Remember that the gap matters most for equality filters, where \`RANK() = 2\` can return nothing, and ask the interviewer what should happen at a tie before you write the query.`,
    examples: [
      {
        label: `Top 3 in North with each function: 3, 4 or 5 reps qualify`,
        code: `WITH ranked AS (
  SELECT rep, revenue,
         ROW_NUMBER() OVER (ORDER BY revenue DESC, id) AS row_num,
         RANK()       OVER (ORDER BY revenue DESC) AS rnk,
         DENSE_RANK() OVER (ORDER BY revenue DESC) AS dense_rnk
  FROM sales_reps
  WHERE region = 'North'
)
SELECT rep, revenue, row_num, rnk, dense_rnk,
       CASE WHEN row_num <= 3 THEN 'yes' ELSE '-' END AS top3_row_num,
       CASE WHEN rnk <= 3 THEN 'yes' ELSE '-' END AS top3_rank,
       CASE WHEN dense_rnk <= 3 THEN 'yes' ELSE '-' END AS top3_dense
FROM ranked
ORDER BY row_num;`,
      },
      {
        label: `Where the gap bites: RANK = 2 finds nobody in South, DENSE_RANK = 2 finds the second-highest revenue`,
        code: `WITH ranked AS (
  SELECT region, rep, revenue,
         RANK()       OVER (PARTITION BY region ORDER BY revenue DESC) AS rnk,
         DENSE_RANK() OVER (PARTITION BY region ORDER BY revenue DESC) AS dense_rnk
  FROM sales_reps
)
SELECT region, rep, revenue, rnk, dense_rnk
FROM ranked
WHERE rnk = 2 OR dense_rnk = 2
ORDER BY region, rep;`,
      },
      {
        label: `Latest plan per user: RANK = 1 returns two rows for a tied timestamp, ROW_NUMBER with a tiebreaker returns one`,
        code: `WITH ranked AS (
  SELECT email, changed_at, plan,
         RANK()       OVER (PARTITION BY email ORDER BY changed_at DESC) AS rnk,
         ROW_NUMBER() OVER (PARTITION BY email ORDER BY changed_at DESC, id DESC) AS row_num
  FROM plan_changes
)
SELECT email, changed_at, plan, rnk, row_num
FROM ranked
WHERE rnk = 1
ORDER BY email, row_num;`,
      },
      {
        label: `PostgreSQL: FETCH FIRST 2 ROWS WITH TIES keeps everyone tied with the last row`,
        code: `SELECT rep, revenue
FROM sales_reps
WHERE region = 'North'
ORDER BY revenue DESC
FETCH FIRST 2 ROWS WITH TIES;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `What do the LAG and LEAD window functions do?`,
    difficulty: "medium",
    seoDescription: `LAG and LEAD read a value from the previous or next row: offset and default arguments, PARTITION BY, growth rates, and the missing IGNORE NULLS.`,
    description: `**Question presented to candidate:**
"What do LAG and LEAD do? Say I have monthly revenue and I want each month next to the previous month and the change between them — how would you write it, and what happens on the first row?"

**What a strong answer should cover:**
- \`LAG(expr)\` returns \`expr\` from the row before the current one in the window order, \`LEAD(expr)\` from the row after; both keep every row and replace a self join on "the previous row"
- Full form \`LAG(expr, offset, default)\`: offset is how many rows back (default 1), default is returned when that row does not exist (otherwise NULL, so the first row has no previous value)
- They need \`ORDER BY\` in \`OVER\` to mean anything, and \`PARTITION BY\` to stop one entity (a user) reading another entity rows
- Typical uses: period-over-period change, time between events per user, detecting state changes; filter on the result in an outer query
- Gotchas: integer division in percentage change, the default must match the column type on PostgreSQL, and \`IGNORE NULLS\` is not available on PostgreSQL 16 or SQLite (SQL Server 2022 has it)

**Code / implementation expected:** Yes — previous and next value with the difference, plus a per-user version with \`PARTITION BY\`.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE monthly_revenue (
  month TEXT PRIMARY KEY,
  revenue INTEGER NOT NULL
);
INSERT INTO monthly_revenue (month, revenue) VALUES
  ('2024-01', 1000),
  ('2024-02', 1200),
  ('2024-03', 1150),
  ('2024-04', 1400),
  ('2024-05', 1400),
  ('2024-06', 1300);
CREATE TABLE logins (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  login_date DATE NOT NULL
);
INSERT INTO logins (id, user_id, login_date) VALUES
  (1, 1, '2024-03-01'),
  (2, 1, '2024-03-02'),
  (3, 1, '2024-03-09'),
  (4, 1, '2024-03-10'),
  (5, 2, '2024-03-01'),
  (6, 2, '2024-03-15'),
  (7, 3, '2024-03-05');
CREATE TABLE meter_readings (
  id INTEGER PRIMARY KEY,
  reading INTEGER
);
INSERT INTO meter_readings (id, reading) VALUES
  (1, 120),
  (2, NULL),
  (3, NULL),
  (4, 135),
  (5, NULL);
\`\`\``,
    answer: `**Target Audience:** Beginners who want to compare a row with the row before or after it, plus candidates who want the arguments, the engine differences and the follow-ups.
**Difficulty:** Medium
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15, both run for this page. SQL Server facts are cited from Microsoft documentation.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and error message shown was produced by actually running it; the **Verified** section quotes each example output in full.

## 1. Why This Even Matters — A Story First

You keep a notebook with one line per month: the month and how much the shop made. Every month you do the same thing: put your finger on this month line, glance **up one line** to see last month, and write the difference in the margin. Sometimes you glance **down one line** to see whether next month (already forecast) is higher.

SQL normally processes a row on its own: a row knows nothing about the row above it. \`LAG\` is "glance up" and \`LEAD\` is "glance down". Without them, "compare with the previous row" needs a self join with a fiddly condition to find which row *is* the previous one. With them it is one function call, which is why they appear in almost every analytics interview: churn, sessions, growth, price changes.

## 2. The Core Idea

📌 **Interview term: offset window function** — a window function that returns a value from another row at a fixed distance from the current row within the window order. \`LAG\`, \`LEAD\`, \`FIRST_VALUE\`, \`LAST_VALUE\` and \`NTH_VALUE\` belong to this family. (Window function basics: [What are window functions?](/interview-question/what-are-window-functions))

📌 **Interview term: LAG** — \`LAG(expr)\` returns \`expr\` evaluated on the previous row of the window order.

📌 **Interview term: LEAD** — \`LEAD(expr)\` returns \`expr\` evaluated on the next row.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 290" role="img" aria-label="For the March row, LAG reads the February row above it and LEAD reads the April row below it">
  <defs>
    <marker id="sql07q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="260" y="20" width="240" height="44" rx="8"/>
  <text class="d-text" x="380" y="47" text-anchor="middle">2024-01 | 1000</text>
  <rect class="d-box" x="260" y="84" width="240" height="44" rx="8"/>
  <text class="d-text" x="380" y="111" text-anchor="middle">2024-02 | 1200</text>
  <rect class="d-box-accent" x="260" y="148" width="240" height="44" rx="8"/>
  <text class="d-accent" x="380" y="175" text-anchor="middle">2024-03 | 1150</text>
  <rect class="d-box" x="260" y="212" width="240" height="44" rx="8"/>
  <text class="d-text" x="380" y="239" text-anchor="middle">2024-04 | 1400</text>
  <path class="d-edge-accent" d="M 256 170 L 180 170 L 180 106 L 254 106" marker-end="url(#sql07q4-arrow)"/>
  <text class="d-sub" x="90" y="143" text-anchor="middle">LAG gives 1200</text>
  <path class="d-edge-accent" d="M 504 170 L 580 170 L 580 234 L 506 234" marker-end="url(#sql07q4-arrow)"/>
  <text class="d-sub" x="675" y="207" text-anchor="middle">LEAD gives 1400</text>
</svg>

The current row is March (1150). \`LAG(revenue)\` reaches one row up and returns 1200; \`LEAD(revenue)\` reaches one row down and returns 1400. The first example applies that to every month and computes the change:

~~~text
month | revenue | prev_revenue | next_revenue | change | pct_change
2024-01 | 1000 | NULL | 1200 | NULL | NULL
2024-02 | 1200 | 1000 | 1150 | 200 | 20
2024-03 | 1150 | 1200 | 1400 | -50 | -4.2
2024-04 | 1400 | 1150 | 1400 | 250 | 21.7
2024-05 | 1400 | 1400 | 1300 | 0 | 0
2024-06 | 1300 | 1400 | NULL | -100 | -7.1
~~~

January has no previous row, so \`prev_revenue\`, \`change\` and \`pct_change\` are NULL; June has no next row, so \`next_revenue\` is NULL. Every row is still present: unlike \`GROUP BY\`, nothing collapsed.

(Engine detail: SQLite printed \`20\` and \`0\` where PostgreSQL prints \`20.0\` and \`0.0\`, because SQLite \`ROUND\` returns a floating-point value and PostgreSQL a \`numeric\`.)

## 3. The Three Arguments

~~~sql
LAG(expr [, offset [, default]]) OVER (PARTITION BY ... ORDER BY ...)
LEAD(expr [, offset [, default]]) OVER (PARTITION BY ... ORDER BY ...)
~~~

📌 **Interview term: offset** — how many rows away to look; 1 if omitted. \`LAG(revenue, 2)\` is two rows back.

📌 **Interview term: default value** — what to return when the row at that offset does not exist (before the start or after the end of the partition). Without it, NULL.

The second example uses all three:

~~~text
month | revenue | two_back | prev_or_0 | next_month
2024-01 | 1000 | NULL | 0 | 2024-02
2024-02 | 1200 | NULL | 1000 | 2024-03
2024-03 | 1150 | 1000 | 1200 | 2024-04
2024-04 | 1400 | 1200 | 1150 | 2024-05
2024-05 | 1400 | 1150 | 1400 | 2024-06
2024-06 | 1300 | 1400 | 1400 | none
~~~

\`LAG\` and \`LEAD\` ignore any frame clause: adding \`ROWS BETWEEN CURRENT ROW AND CURRENT ROW\` to both left every value unchanged on SQLite and PostgreSQL here.

\`two_back\` is NULL for the first two months; \`prev_or_0\` shows 0 instead of NULL for January; \`next_month\` says \`none\` for June.

**The default must match the type on PostgreSQL.** SQLite is dynamically typed, so \`LAG(revenue, 1, 'n/a')\` happily mixed text into an integer column:

~~~text
month | p
2024-01 | n/a
2024-02 | 1000
2024-03 | 1200
2024-04 | 1150
2024-05 | 1400
2024-06 | 1400
~~~

PostgreSQL 16 refused it:

~~~text
ERROR:  invalid input syntax for type integer: "n/a"
LINE 1: SELECT month, LAG(revenue, 1, 'n/a') OVER (ORDER BY month) A...
                                      ^
~~~

To show a label there, cast the result: \`COALESCE(LAG(revenue) OVER (...)::text, 'n/a')\`.

📌 **Interview term: default vs COALESCE** — \`LAG(x, 1, 0)\` substitutes 0 only when the previous row *does not exist*. \`COALESCE(LAG(x), 0)\` also substitutes 0 when the previous row exists but its value is NULL. They differ whenever the column itself holds NULLs.

## 4. PARTITION BY: Previous Row of the Same Entity

Without \`PARTITION BY\`, \`LAG\` looks at the previous row in the whole result, so user 2 first login would be compared with user 1 last login. \`PARTITION BY user_id\` restarts the window per user, so the first login of every user gets NULL. The third example computes days since the same user previous login:

~~~text
user_id | login_date | prev_login | days_since_prev
1 | 2024-03-01 | NULL | NULL
1 | 2024-03-02 | 2024-03-01 | 1
1 | 2024-03-09 | 2024-03-02 | 7
1 | 2024-03-10 | 2024-03-09 | 1
2 | 2024-03-01 | NULL | NULL
2 | 2024-03-15 | 2024-03-01 | 14
3 | 2024-03-05 | NULL | NULL
~~~

(SQLite has no date subtraction; \`julianday()\` turns a date string into a day number. That function does not exist on PostgreSQL, where you subtract two \`date\` values directly.)

To filter on a \`LAG\` result, compute it in a subquery or [CTE](/interview-question/what-is-a-cte-common-table-expression), because window functions cannot appear in \`WHERE\`. The fourth example, on PostgreSQL 16, finds returning users who were away for a week or more:

~~~text
user_id | prev_login | login_date | days_away
1 | 2024-03-02 | 2024-03-09 | 7
2 | 2024-03-01 | 2024-03-15 | 14
~~~

\`login_date - prev_login\` on two PostgreSQL \`date\` values gives an integer number of days.

## 5. What LAG Replaces

Before window functions, the previous row needed a self join plus a subquery to find it. This gives the same \`prev_revenue\` column (run on SQLite):

~~~sql
SELECT m.month, m.revenue, p.revenue AS prev_revenue
FROM monthly_revenue AS m
LEFT JOIN monthly_revenue AS p
  ON p.month = (SELECT MAX(month) FROM monthly_revenue WHERE month < m.month)
ORDER BY m.month;
~~~

~~~text
month | revenue | prev_revenue
2024-01 | 1000 | NULL
2024-02 | 1200 | 1000
2024-03 | 1150 | 1200
2024-04 | 1400 | 1150
2024-05 | 1400 | 1400
2024-06 | 1300 | 1400
~~~

The \`LAG\` version sorts once and reads each row once; the self join can run the inner \`MAX\` lookup for every row. More importantly, it is easy to get wrong (forget the \`LEFT\` and January disappears). See [What is a self join?](/interview-question/what-is-a-self-join)

## 6. Gotcha: Integer Division in Growth Rates

\`revenue\` is an integer, and integer divided by integer is integer division on both engines. Without the \`100.0\` the growth rate collapses to zero (same output on SQLite and PostgreSQL):

~~~text
month | growth_int
2024-01 | NULL
2024-02 | 0
2024-03 | 0
2024-04 | 0
2024-05 | 0
2024-06 | 0
~~~

Multiplying by \`100.0\` (or casting to a decimal type) before dividing, as in the first example, keeps the fraction. Divide by \`NULLIF(LAG(...), 0)\` if the previous value can be 0. Full month-over-month and year-over-year patterns are on [How do you calculate year-over-year or month-over-month growth in SQL?](/interview-question/how-do-you-calculate-year-over-year-or-month-over-month-growth-in-sql)

## 7. Gotcha: NULLs and IGNORE NULLS

Plain \`LAG\` returns the previous row value even when it is NULL:

~~~text
id | reading | prev_reading
1 | 120 | NULL
2 | NULL | 120
3 | NULL | NULL
4 | 135 | NULL
5 | NULL | 135
~~~

📌 **Interview term: IGNORE NULLS** — a standard SQL option that makes \`LAG\` / \`LEAD\` skip NULL values and return the nearest non-NULL one. SQL Server added it in SQL Server 2022 ([Microsoft LEAD documentation](https://learn.microsoft.com/en-us/sql/t-sql/functions/lead-transact-sql); [sqlserverfast.com on LAG and LEAD](https://sqlserverfast.com/blog/hugo/2024/01/plansplaining-part-27-lag-and-lead/)). PostgreSQL 16 rejected it:

~~~text
ERROR:  syntax error at or near "NULLS"
LINE 1: SELECT id, reading, LAG(reading) IGNORE NULLS OVER (ORDER BY...
                                                ^
~~~

and so did SQLite 3.45 (\`Error: near "NULLS": syntax error\`).

📌 **Interview term: forward fill** — replacing each NULL with the last known value. A portable trick: \`COUNT(reading)\` counts only non-NULL values, so a running \`COUNT(reading) OVER (ORDER BY id)\` stays the same across a run of NULLs. That number labels a group that starts at each real reading; the group \`MAX\` is that reading. Same output on both engines:

~~~text
id | reading | last_known
1 | 120 | 120
2 | NULL | 120
3 | NULL | 120
4 | 135 | 135
5 | NULL | 135
~~~

## 8. Engine Support

| Engine | \`LAG\` / \`LEAD\` | \`IGNORE NULLS\` |
| :--- | :--- | :--- |
| PostgreSQL 16 | yes (since 8.4) | no: syntax error, run here |
| SQLite 3.45 | yes (since 3.25.0) | no: syntax error, run here |
| SQL Server | since 2012 | since 2022 |
| MySQL | since 8.0 | not verified for this page |

SQL Server dates are from the Microsoft and sqlserverfast.com pages cited above; PostgreSQL, SQLite and MySQL first versions are cited on [What are window functions?](/interview-question/what-are-window-functions)

## 9. Verified: Running the Code

The three SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above). The PostgreSQL example and all PostgreSQL error messages were run on PostgreSQL 16.15 in a scratch database with the same schema.

Example 1, previous, next and change:

~~~text
month | revenue | prev_revenue | next_revenue | change | pct_change
2024-01 | 1000 | NULL | 1200 | NULL | NULL
2024-02 | 1200 | 1000 | 1150 | 200 | 20
2024-03 | 1150 | 1200 | 1400 | -50 | -4.2
2024-04 | 1400 | 1150 | 1400 | 250 | 21.7
2024-05 | 1400 | 1400 | 1300 | 0 | 0
2024-06 | 1300 | 1400 | NULL | -100 | -7.1
~~~

Example 2, offset and default:

~~~text
month | revenue | two_back | prev_or_0 | next_month
2024-01 | 1000 | NULL | 0 | 2024-02
2024-02 | 1200 | NULL | 1000 | 2024-03
2024-03 | 1150 | 1000 | 1200 | 2024-04
2024-04 | 1400 | 1200 | 1150 | 2024-05
2024-05 | 1400 | 1150 | 1400 | 2024-06
2024-06 | 1300 | 1400 | 1400 | none
~~~

Example 3, days since the previous login per user:

~~~text
user_id | login_date | prev_login | days_since_prev
1 | 2024-03-01 | NULL | NULL
1 | 2024-03-02 | 2024-03-01 | 1
1 | 2024-03-09 | 2024-03-02 | 7
1 | 2024-03-10 | 2024-03-09 | 1
2 | 2024-03-01 | NULL | NULL
2 | 2024-03-15 | 2024-03-01 | 14
3 | 2024-03-05 | NULL | NULL
~~~

Example 4, PostgreSQL returning users:

~~~text
user_id | prev_login | login_date | days_away
1 | 2024-03-02 | 2024-03-09 | 7
2 | 2024-03-01 | 2024-03-15 | 14
~~~

## Common Pitfalls

- **No \`ORDER BY\` in \`OVER\`.** \`LAG(revenue) OVER ()\` ran and even looked right on this tiny table (rows came out in insertion order), but nothing guarantees which row counts as previous.
- **Forgetting \`PARTITION BY\` for per-entity data.** One user first event is compared with another user last event and produces nonsense gaps.
- **Treating "12 rows back" as "12 months back".** \`LAG(x, 12)\` counts rows; a missing month shifts every comparison.
- **Integer division in growth rates.** Multiply by \`100.0\` first and guard the divisor with \`NULLIF(..., 0)\`.
- **A default of the wrong type on PostgreSQL.** \`LAG(int_col, 1, 'n/a')\` fails; cast or \`COALESCE\` instead.
- **Filtering on \`LAG\` in \`WHERE\`.** Not allowed; wrap the query.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LAG(expr)</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">expr</code> from the <strong style="color:#ffca28;">previous</strong> row in the window order and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LEAD(expr)</code> from the <strong style="color:#ffca28;">next</strong> row. They are offset window functions: every row stays, and you get a neighbour value as a new column without a self join.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Arguments:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LAG(expr, offset, default)</code>: offset is how many rows away (default 1), default is what to return when that row does not exist. Without a default, the first row <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LAG</code> and the last row <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LEAD</code> are NULL.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. OVER clause:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY</code> defines what previous means, so it is required in practice; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PARTITION BY user_id</code> stops a user first login from reading another user last one. Frames are ignored by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LAG</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LEAD</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Typical uses:</strong> <span style="color:#f0e2c8;">Month-over-month change (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">revenue - LAG(revenue) OVER (ORDER BY month)</code>), time since the previous event per user, and spotting state changes. To filter on the result, compute it in a subquery or CTE first.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Gotchas:</strong> <span style="color:#f0e2c8;">Integer division makes growth 0, so multiply by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">100.0</code> first. PostgreSQL requires the default to match the column type. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IGNORE NULLS</code> is rejected by PostgreSQL 16 and SQLite (SQL Server 2022 has it); emulate it with a running <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT</code> group.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you write this before window functions existed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A self join to the previous row, usually with a correlated subquery to find it: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ON p.month = (SELECT MAX(month) FROM t WHERE month &lt; m.month)</code>. It gives the same result but is longer and can do a lookup per row; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LAG</code> sorts once and scans once.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">LAG(x, 1, 0)</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">COALESCE(LAG(x), 0)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The default only applies when the offset row does not exist. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COALESCE</code> also replaces a NULL that really is stored in the previous row. Pick based on which situation you want to paper over.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you compare with the same month last year?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If there is one row per month with no gaps, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LAG(revenue, 12) OVER (ORDER BY month)</code>. If months can be missing, an offset of 12 rows is not 12 months; join on the date minus one year or fill the gaps first. The growth page covers this.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the previous non-NULL value?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IGNORE NULLS</code> is missing (PostgreSQL 16, SQLite), number the groups with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(col) OVER (ORDER BY id)</code>, which only increments on non-NULL rows, then take <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MAX(col) OVER (PARTITION BY grp)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">LAG</code> and no <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ORDER BY</code> in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">OVER</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It runs, but previous means whatever order the engine happens to process rows in. It may look right on a small table and then change with a different plan. Always order the window.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Offset window function | Returns a value from another row at a fixed distance in the window order |
| LAG | Value from the previous row (or \`offset\` rows back) |
| LEAD | Value from the next row (or \`offset\` rows ahead) |
| Offset | How many rows away to look; default 1 |
| Default value | Returned when the offset row does not exist; NULL otherwise |
| Default vs COALESCE | Default covers a missing row; \`COALESCE\` also covers a stored NULL |
| IGNORE NULLS | Skip NULLs when looking back or ahead; not in PostgreSQL 16 or SQLite |
| Forward fill | Replace NULLs with the last known value |

**Conclusion:** \`LAG\` and \`LEAD\` let a row read a column from the row before or after it in the window order, which turns "compare with the previous period" or "time since the last event" into a single expression instead of a self join. Give them an \`ORDER BY\` so previous has a meaning, a \`PARTITION BY\` so entities do not bleed into each other, and an offset and default when you need them. Watch the classic traps: integer division in growth rates, a type-mismatched default on PostgreSQL, row offsets that are not calendar offsets, and the missing \`IGNORE NULLS\` on PostgreSQL 16 and SQLite, which a running \`COUNT\` group works around.`,
    examples: [
      {
        label: `Each month with the previous and next month revenue, the change and the % change`,
        code: `SELECT month, revenue,
       LAG(revenue)  OVER (ORDER BY month) AS prev_revenue,
       LEAD(revenue) OVER (ORDER BY month) AS next_revenue,
       revenue - LAG(revenue) OVER (ORDER BY month) AS change,
       ROUND(100.0 * (revenue - LAG(revenue) OVER (ORDER BY month))
             / LAG(revenue) OVER (ORDER BY month), 1) AS pct_change
FROM monthly_revenue
ORDER BY month;`,
      },
      {
        label: `The offset and default arguments: two rows back, 0 instead of NULL, a label for the last row`,
        code: `SELECT month, revenue,
       LAG(revenue, 2)        OVER (ORDER BY month) AS two_back,
       LAG(revenue, 1, 0)     OVER (ORDER BY month) AS prev_or_0,
       LEAD(month, 1, 'none') OVER (ORDER BY month) AS next_month
FROM monthly_revenue
ORDER BY month;`,
      },
      {
        label: `PARTITION BY user: days since the same user previous login (SQLite date maths)`,
        code: `SELECT user_id, login_date,
       LAG(login_date) OVER (PARTITION BY user_id ORDER BY login_date) AS prev_login,
       CAST(julianday(login_date)
            - julianday(LAG(login_date) OVER (PARTITION BY user_id ORDER BY login_date)) AS INTEGER) AS days_since_prev
FROM logins
ORDER BY user_id, login_date;`,
      },
      {
        label: `PostgreSQL: returning users, away 7 days or more (filter on LAG in an outer query)`,
        code: `SELECT user_id, prev_login, login_date, login_date - prev_login AS days_away
FROM (
  SELECT user_id, login_date::date AS login_date,
         LAG(login_date::date) OVER (PARTITION BY user_id ORDER BY login_date) AS prev_login
  FROM logins
) AS t
WHERE login_date - prev_login >= 7
ORDER BY user_id, login_date;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `How do you calculate a running total or moving average?`,
    difficulty: "medium",
    seoDescription: `Running totals and moving averages with SUM and AVG OVER: frames, ROWS vs RANGE vs GROUPS, the tie trap of the default frame, and missing dates.`,
    description: `**Question presented to candidate:**
"Given a table of daily sales per store, how would you add a running total, and a 3-day moving average, to every row? What exactly decides which rows go into each calculation?"

**What a strong answer should cover:**
- A running total is \`SUM(amount) OVER (PARTITION BY store ORDER BY day ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)\`; a moving average is \`AVG(...)\` with a bounded frame such as \`ROWS BETWEEN 2 PRECEDING AND CURRENT ROW\`
- The frame clause decides the rows: \`ROWS\` counts physical rows, \`RANGE\` uses value distance on the \`ORDER BY\` column (peers included), \`GROUPS\` counts distinct peer groups
- The default frame with \`ORDER BY\` is \`RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\`, so rows tied on the order key share one running value; use \`ROWS\` plus a unique tiebreaker for a strict row-by-row total
- Missing dates: "last 3 rows" is not "last 3 days"; use \`RANGE BETWEEN INTERVAL '2 days' PRECEDING AND CURRENT ROW\` (PostgreSQL 11+) or a numeric day key, or fill the gaps first
- The first rows of a moving average have short frames (fewer than 3 rows); count the frame and blank them if only full windows are wanted

**Clarifying questions expected:**
- Should the total restart per store (or per month), or run across everything?
- Are there missing days, and should "3-day" mean three calendar days or three rows?
- Can several rows share the same date, and if so, should they be summed together?

**Code / implementation expected:** Yes — a running total with \`PARTITION BY\` and a moving average with an explicit \`ROWS\` frame.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE daily_sales (
  day DATE NOT NULL,
  store TEXT NOT NULL,
  amount INTEGER NOT NULL,
  PRIMARY KEY (store, day)
);
INSERT INTO daily_sales (day, store, amount) VALUES
  ('2024-03-01', 'A', 100),
  ('2024-03-02', 'A', 120),
  ('2024-03-03', 'A', 90),
  ('2024-03-05', 'A', 150),
  ('2024-03-06', 'A', 60),
  ('2024-03-07', 'A', 110),
  ('2024-03-01', 'B', 40),
  ('2024-03-02', 'B', 70),
  ('2024-03-03', 'B', 50);
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  order_day DATE NOT NULL,
  amount INTEGER NOT NULL
);
INSERT INTO orders (id, order_day, amount) VALUES
  (1, '2024-03-01', 50),
  (2, '2024-03-01', 30),
  (3, '2024-03-02', 20),
  (4, '2024-03-03', 40),
  (5, '2024-03-03', 10);
\`\`\``,
    answer: `**Target Audience:** Beginners who need a cumulative sum or a smoothed trend line in SQL, plus candidates who want to explain frames (\`ROWS\`, \`RANGE\`, \`GROUPS\`) precisely.
**Difficulty:** Medium
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15, both run for this page. Version facts are cited.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result shown was produced by actually running it; the **Verified** section quotes each example output in full.

## 1. Why This Even Matters — A Story First

A fitness tracker shows two numbers under each day. One is "steps this month so far": Monday 8,000, Tuesday 15,000, Wednesday 21,000, always adding today to everything before. The other is the "7-day average" line on the chart: it ignores the one lazy Sunday and the one marathon Saturday and shows the trend.

The first is a **running total**: start at the beginning and keep adding. The second is a **moving average**: look at a fixed-size window of recent days, average it, then slide the window forward one day. Both are the same SQL tool, a window aggregate with a **frame**, and the frame is where almost every bug in this area lives: ties on the same date, and missing dates.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Restart per store, per month, or never? | Decides the \`PARTITION BY\` |
| Can there be missing days? | "3 rows" and "3 days" then differ; you need \`RANGE\` with an interval or gap filling |
| Can several rows share a date? | The default frame gives them one shared running value |
| Should the first days, with less than a full window, show a value? | Decides whether you blank short frames |

## 3. The Frame: Which Rows Are Added Up

A window aggregate such as \`SUM(...) OVER (...)\` adds up the rows in its **frame**, a slice of the partition defined relative to the current row. (What a window and a partition are: [What are window functions?](/interview-question/what-are-window-functions))

📌 **Interview term: window frame** — the set of rows, relative to the current row, that a window aggregate uses: \`ROWS | RANGE | GROUPS BETWEEN start AND end\`.

📌 **Interview term: frame bounds** — \`UNBOUNDED PRECEDING\` (start of partition), \`n PRECEDING\`, \`CURRENT ROW\`, \`n FOLLOWING\`, \`UNBOUNDED FOLLOWING\` (end of partition).

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="A three row frame around the current row slides down the ordered rows: the running total frame starts at the first row, the moving average frame covers two rows before and the current row">
  <rect class="d-box-muted" x="30" y="30" width="120" height="44" rx="8"/>
  <text class="d-text" x="90" y="57" text-anchor="middle">Mar 01</text>
  <rect class="d-box-muted" x="170" y="30" width="120" height="44" rx="8"/>
  <text class="d-text" x="230" y="57" text-anchor="middle">Mar 02</text>
  <rect class="d-box" x="310" y="30" width="120" height="44" rx="8"/>
  <text class="d-text" x="370" y="57" text-anchor="middle">Mar 03</text>
  <rect class="d-box" x="450" y="30" width="120" height="44" rx="8"/>
  <text class="d-text" x="510" y="57" text-anchor="middle">Mar 05</text>
  <rect class="d-box-accent" x="590" y="30" width="140" height="44" rx="8"/>
  <text class="d-accent" x="660" y="57" text-anchor="middle">Mar 06 now</text>
  <rect class="d-box-muted" x="30" y="110" width="700" height="44" rx="8"/>
  <text class="d-sub" x="380" y="137" text-anchor="middle">running total frame: UNBOUNDED PRECEDING to CURRENT ROW</text>
  <rect class="d-box-accent" x="310" y="180" width="420" height="44" rx="8"/>
  <text class="d-sub" x="520" y="207" text-anchor="middle">moving average frame: 2 PRECEDING to CURRENT ROW</text>
</svg>

For the current row (March 6), a running total frame starts at the first row of the partition. A 3-row moving average frame covers the two rows before it and itself.

## 4. Running Total

📌 **Interview term: running total (cumulative sum)** — for each row, the sum of that row and every earlier row in the order.

The first example: a running total per store, which restarts at B, next to each store total:

~~~text
store | day | amount | store_running_total | store_total
A | 2024-03-01 | 100 | 100 | 630
A | 2024-03-02 | 120 | 220 | 630
A | 2024-03-03 | 90 | 310 | 630
A | 2024-03-05 | 150 | 460 | 630
A | 2024-03-06 | 60 | 520 | 630
A | 2024-03-07 | 110 | 630 | 630
B | 2024-03-01 | 40 | 40 | 160
B | 2024-03-02 | 70 | 110 | 160
B | 2024-03-03 | 50 | 160 | 160
~~~

\`SUM(amount) OVER (PARTITION BY store)\` has no \`ORDER BY\`, so its frame is the whole partition: the store total on every row. Add \`ORDER BY day\` and the same function becomes cumulative. Dividing one by the other gives a running percentage (store B, both engines agree up to the trailing \`.0\` PostgreSQL prints):

~~~text
store | day | amount | pct_of_store_so_far
B | 2024-03-01 | 40 | 25
B | 2024-03-02 | 70 | 68.8
B | 2024-03-03 | 50 | 100
~~~

## 5. Moving Average

📌 **Interview term: moving (rolling) average** — the average over a fixed-size window that slides with the current row. "3-row trailing" means the current row and the two before it.

The second example, store A, also counts how many rows each frame really held:

~~~text
day | amount | moving_avg_3 | rows_in_frame
2024-03-01 | 100 | 100 | 1
2024-03-02 | 120 | 110 | 2
2024-03-03 | 90 | 103.3 | 3
2024-03-05 | 150 | 120 | 3
2024-03-06 | 60 | 100 | 3
2024-03-07 | 110 | 106.7 | 3
~~~

The first two values are not 3-row averages: March 1 averaged one row (100) and March 2 two rows (110). That is the **warm-up** period. If only full windows should show, test the frame size; a centered version uses one row on each side:

~~~text
day | amount | full_window_avg | centered_avg
2024-03-01 | 100 | NULL | 110
2024-03-02 | 120 | NULL | 103.3
2024-03-03 | 90 | 103.3 | 120
2024-03-05 | 150 | 120 | 100
2024-03-06 | 60 | 100 | 106.7
2024-03-07 | 110 | 106.7 | 85
~~~

(Both run on SQLite; PostgreSQL gave the same numbers printed as \`110.0\`, \`120.0\` and so on. \`WINDOW w AS (...)\` names the frame once so \`COUNT\` and \`AVG\` are guaranteed to use the same one.)

📌 **Interview term: trailing vs centered window** — trailing (\`n PRECEDING AND CURRENT ROW\`) only looks back and suits live dashboards; centered (\`n PRECEDING AND n FOLLOWING\`) looks both ways and changes when new rows arrive.

## 6. ROWS vs RANGE: The Default Frame and Ties

📌 **Interview term: default frame** — if \`OVER\` has \`ORDER BY\` but no frame, the frame is \`RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\`. Without \`ORDER BY\`, the frame is the whole partition.

📌 **Interview term: peers** — rows with equal values in the window \`ORDER BY\`. A \`RANGE\` frame that ends at \`CURRENT ROW\` ends at the *last peer* of the current row.

Two orders were placed on March 1 and two on March 3. The third example compares the default frame with an explicit \`ROWS\` frame:

~~~text
id | order_day | amount | default_range | rows_by_id
1 | 2024-03-01 | 50 | 80 | 50
2 | 2024-03-01 | 30 | 80 | 80
3 | 2024-03-02 | 20 | 100 | 100
4 | 2024-03-03 | 40 | 150 | 140
5 | 2024-03-03 | 10 | 150 | 150
~~~

With the default \`RANGE\`, orders 1 and 2 are peers, so both show 80, the total for the whole day. With \`ROWS\` and \`id\` as a tiebreaker, the total steps one order at a time: 50, then 80. Both are valid, they answer different questions ("total by end of this day" vs "total after this order"). The bug is not knowing which one you wrote.

📌 **Interview term: ROWS / RANGE / GROUPS** — the three frame units. \`ROWS\` counts physical rows. \`RANGE\` measures distance in the *value* of the single \`ORDER BY\` column. \`GROUPS\` counts peer groups (distinct values). Same orders table, run on both engines with identical output:

~~~text
id | order_day | amount | this_and_prev_day | all_others
1 | 2024-03-01 | 50 | 80 | 100
2 | 2024-03-01 | 30 | 80 | 120
3 | 2024-03-02 | 20 | 100 | 130
4 | 2024-03-03 | 40 | 70 | 110
5 | 2024-03-03 | 10 | 70 | 140
~~~

\`GROUPS BETWEEN 1 PRECEDING AND CURRENT ROW\` adds this day and the previous distinct day (March 3: 40 + 10 + 20 = 70). \`EXCLUDE CURRENT ROW\` drops the current row from the frame (order 1: 150 - 50 = 100).

## 7. Missing Dates: 3 Rows Is Not 3 Days

Store A has no row for March 4. A \`ROWS\` frame does not know that; it just takes the two previous rows.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="With a missing day, ROWS 2 PRECEDING reaches back to March 2, while RANGE 2 days PRECEDING only reaches March 3">
  <rect class="d-box" x="30" y="30" width="130" height="44" rx="8"/>
  <text class="d-text" x="95" y="57" text-anchor="middle">Mar 02</text>
  <rect class="d-box" x="190" y="30" width="130" height="44" rx="8"/>
  <text class="d-text" x="255" y="57" text-anchor="middle">Mar 03</text>
  <rect class="d-box-muted" x="350" y="30" width="130" height="44" rx="8"/>
  <text class="d-sub" x="415" y="57" text-anchor="middle">Mar 04 missing</text>
  <rect class="d-box-accent" x="510" y="30" width="150" height="44" rx="8"/>
  <text class="d-accent" x="585" y="57" text-anchor="middle">Mar 05 now</text>
  <rect class="d-box-accent" x="30" y="110" width="630" height="44" rx="8"/>
  <text class="d-sub" x="345" y="137" text-anchor="middle">ROWS 2 PRECEDING: Mar 02, Mar 03, Mar 05</text>
  <rect class="d-box-muted" x="190" y="180" width="470" height="44" rx="8"/>
  <text class="d-sub" x="425" y="207" text-anchor="middle">RANGE 2 days PRECEDING: Mar 03, Mar 05</text>
</svg>

📌 **Interview term: value-based (RANGE) frame with an offset** — \`RANGE BETWEEN INTERVAL '2 days' PRECEDING AND CURRENT ROW\` keeps the rows whose order value is within 2 days of the current one, however many rows that is. The fourth example, on PostgreSQL 16:

~~~text
day | amount | last_3_rows | last_3_days
2024-03-01 | 100 | 100 | 100
2024-03-02 | 120 | 220 | 220
2024-03-03 | 90 | 310 | 310
2024-03-05 | 150 | 360 | 240
2024-03-06 | 60 | 300 | 210
2024-03-07 | 110 | 320 | 320
~~~

For March 5, \`last_3_rows\` added March 2, 3 and 5 (360), reaching across the gap into a fourth calendar day; \`last_3_days\` added only March 3 and 5 (240). PostgreSQL added \`RANGE\` offsets in version 11 ([PostgreSQL 11 release notes](https://www.postgresql.org/docs/release/11.0/)).

SQLite has had \`RANGE\` offsets since 3.28.0 ([release log](https://sqlite.org/releaselog/3_28_0.html)) and the distance is numeric, so order by a day number. \`julianday()\` gives one; the result matches PostgreSQL:

~~~text
day | amount | last_3_days
2024-03-01 | 100 | 100
2024-03-02 | 120 | 220
2024-03-03 | 90 | 310
2024-03-05 | 150 | 240
2024-03-06 | 60 | 210
2024-03-07 | 110 | 320
~~~

Careful: ordering by the date *text* instead raised no error on SQLite 3.45. It silently returned each day on its own, because no text value is within "2" of another, so the frame held only the current row and its peers:

~~~text
day | amount | not_3_days
2024-03-01 | 100 | 100
2024-03-02 | 120 | 120
2024-03-03 | 90 | 90
2024-03-05 | 150 | 150
2024-03-06 | 60 | 60
2024-03-07 | 110 | 110
~~~

The other fix is to build a complete calendar first ([What is a CROSS JOIN and when is it useful?](/interview-question/what-is-a-cross-join-and-when-is-it-useful) shows the grid technique) and then use \`ROWS\`, with 0 for missing days. Which one is right depends on whether a missing day means "no sales" (fill with 0) or "no data" (skip it).

## 8. What It Replaces, and the Cost

The pre-window way is a correlated subquery that re-sums every earlier row. It gives the same numbers as the \`ROWS\` running total (run on SQLite):

~~~text
id | order_day | amount | running_total
1 | 2024-03-01 | 50 | 50
2 | 2024-03-01 | 30 | 80
3 | 2024-03-02 | 20 | 100
4 | 2024-03-03 | 40 | 140
5 | 2024-03-03 | 10 | 150
~~~

📌 **Interview term: quadratic running total** — the correlated version reads, for row k, all k earlier rows: about n²/2 row reads for n rows, 50 million for 10,000 rows. A window running total sorts once (n log n) and then keeps a running sum in a single pass.

| Approach | Work for n rows | Handles ties correctly |
| :--- | :--- | :--- |
| \`SUM() OVER (ORDER BY ... ROWS ...)\` | one sort, one pass | yes, with a tiebreaker |
| Correlated subquery / self join | about n²/2 row reads | only if the condition repeats the tiebreaker |

Engine support for the frame features used here: PostgreSQL 11+ and SQLite 3.28+ for \`GROUPS\`, \`EXCLUDE\` and \`RANGE\` offsets (sources above); MySQL 8.0 supports \`ROWS\` and \`RANGE\` but rejects \`GROUPS\` ([MySQL window function restrictions](https://dev.mysql.com/doc/refman/8.0/en/window-function-restrictions.html)).

## 9. Verified: Running the Code

The three SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above); PostgreSQL 16.15 gave the same numbers (with \`.0\` on rounded values). The PostgreSQL example was run on PostgreSQL 16.15 in a scratch database with the same schema.

Example 1, running total per store:

~~~text
store | day | amount | store_running_total | store_total
A | 2024-03-01 | 100 | 100 | 630
A | 2024-03-02 | 120 | 220 | 630
A | 2024-03-03 | 90 | 310 | 630
A | 2024-03-05 | 150 | 460 | 630
A | 2024-03-06 | 60 | 520 | 630
A | 2024-03-07 | 110 | 630 | 630
B | 2024-03-01 | 40 | 40 | 160
B | 2024-03-02 | 70 | 110 | 160
B | 2024-03-03 | 50 | 160 | 160
~~~

Example 2, 3-row moving average:

~~~text
day | amount | moving_avg_3 | rows_in_frame
2024-03-01 | 100 | 100 | 1
2024-03-02 | 120 | 110 | 2
2024-03-03 | 90 | 103.3 | 3
2024-03-05 | 150 | 120 | 3
2024-03-06 | 60 | 100 | 3
2024-03-07 | 110 | 106.7 | 3
~~~

Example 3, default \`RANGE\` vs \`ROWS\` with ties:

~~~text
id | order_day | amount | default_range | rows_by_id
1 | 2024-03-01 | 50 | 80 | 50
2 | 2024-03-01 | 30 | 80 | 80
3 | 2024-03-02 | 20 | 100 | 100
4 | 2024-03-03 | 40 | 150 | 140
5 | 2024-03-03 | 10 | 150 | 150
~~~

Example 4, PostgreSQL rows vs calendar days:

~~~text
day | amount | last_3_rows | last_3_days
2024-03-01 | 100 | 100 | 100
2024-03-02 | 120 | 220 | 220
2024-03-03 | 90 | 310 | 310
2024-03-05 | 150 | 360 | 240
2024-03-06 | 60 | 300 | 210
2024-03-07 | 110 | 320 | 320
~~~

## Common Pitfalls

- **Relying on the default frame.** \`SUM(x) OVER (ORDER BY d)\` is \`RANGE\`, so rows tied on \`d\` share a value. Write the frame out.
- **No unique tiebreaker with \`ROWS\`.** Tied rows are added in an arbitrary order; add \`id\` to the window \`ORDER BY\`.
- **Calling a 3-row average a 3-day average.** With missing dates they differ; use a \`RANGE\` interval or fill the gaps.
- **Forgetting \`PARTITION BY\`.** Store B total would continue on from store A.
- **A \`RANGE\` offset over a text date in SQLite.** No error, just a frame of one day; order by \`julianday(day)\`.
- **Reporting warm-up values as full averages.** The first n - 1 rows average fewer rows; count the frame.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Running total:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SUM(amount) OVER (PARTITION BY store ORDER BY day ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PARTITION BY</code> restarts it per store, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY</code> sets the direction, and the <strong style="color:#ffca28;">frame</strong> says from the first row up to this one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Moving average:</strong> <span style="color:#f0e2c8;">Same shape with a bounded frame: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AVG(amount) OVER (ORDER BY day ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)</code> is a 3-row moving average. The first two rows have only 1 and 2 rows in their frame; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(*) OVER</code> the same frame tells you.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Frame units:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">ROWS</strong> counts physical rows. <strong style="color:#ffca28;">RANGE</strong> uses value distance on the order key and always includes peers (equal keys). <strong style="color:#ffca28;">GROUPS</strong> counts distinct peer groups. Writing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY</code> without a frame gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The tie trap:</strong> <span style="color:#f0e2c8;">Because the default is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RANGE</code>, two orders on the same day get the same running total (80, 80). For a strict row-by-row total use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROWS</code> and a unique tiebreaker: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY order_day, id</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Gaps in dates:</strong> <span style="color:#f0e2c8;">Three rows is not three days if a day is missing. PostgreSQL 11+ supports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RANGE BETWEEN INTERVAL '2 days' PRECEDING AND CURRENT ROW</code>; SQLite 3.28+ accepts numeric offsets, so order by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">julianday(day)</code>. Or build a calendar and fill the gaps first.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How did people write running totals before window functions?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A correlated subquery summing every earlier row, or a self join with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY</code>. Both give the same numbers but re-read the earlier rows for each row, which is quadratic work; the window version sorts once and scans once.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is my running total the same on two rows?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They tie on the window <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY</code> and the default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RANGE</code> frame treats them as peers, so each sees the sum including the other. Add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROWS</code> and a tiebreaker, or aggregate per day first if a per-day total is what you want.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you show the moving average only when the window is full?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compute <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(*)</code> over the same frame and return the average only when it equals the window size: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CASE WHEN COUNT(*) OVER w = 3 THEN AVG(amount) OVER w END</code>, with a named <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WINDOW w</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between a trailing and a centered moving average?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Trailing uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2 PRECEDING AND CURRENT ROW</code> and only looks back, which suits dashboards. Centered uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 PRECEDING AND 1 FOLLOWING</code>, which smooths better but needs future rows, so the last value changes when tomorrow arrives.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you get a running percentage of the total?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Divide the running sum by the whole-partition sum: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">100.0 * SUM(x) OVER (... ROWS UNBOUNDED PRECEDING) / SUM(x) OVER (PARTITION BY store)</code>. Multiply by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">100.0</code> first to avoid integer division.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Window frame | The rows, relative to the current one, that a window aggregate uses |
| Frame bounds | \`UNBOUNDED PRECEDING\`, \`n PRECEDING\`, \`CURRENT ROW\`, \`n FOLLOWING\`, \`UNBOUNDED FOLLOWING\` |
| Running total (cumulative sum) | Sum of the current row and all earlier rows |
| Moving (rolling) average | Average over a fixed-size window that slides with the current row |
| Trailing vs centered window | Looks back only vs looks both ways |
| Default frame | With \`ORDER BY\`: \`RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\` |
| Peers | Rows tied on the window \`ORDER BY\` |
| ROWS / RANGE / GROUPS | Frame units: physical rows, value distance, peer groups |
| Value-based (RANGE) frame with an offset | Rows within a value distance, such as 2 days, of the current row |
| Quadratic running total | The correlated-subquery version, about n²/2 row reads |

**Conclusion:** A running total and a moving average are the same thing with different frames: \`SUM(...) OVER (PARTITION BY ... ORDER BY ... ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)\` for the total, and \`AVG(...) OVER (... ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)\` for a 3-row average. Write the frame explicitly, because the default \`RANGE\` frame gives tied rows one shared value; add a unique tiebreaker for \`ROWS\`; and when dates can be missing, decide whether you mean rows or calendar days and use a \`RANGE\` interval or a filled calendar accordingly. Mention the warm-up rows and the n²-versus-one-pass cost against a correlated subquery, and you have covered what interviewers ask.`,
    examples: [
      {
        label: `Running total per store, next to the store total`,
        code: `SELECT store, day, amount,
       SUM(amount) OVER (PARTITION BY store ORDER BY day
                         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS store_running_total,
       SUM(amount) OVER (PARTITION BY store) AS store_total
FROM daily_sales
ORDER BY store, day;`,
      },
      {
        label: `3-row moving average for store A, with the number of rows in each frame`,
        code: `SELECT day, amount,
       ROUND(AVG(amount) OVER (ORDER BY day
                               ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 1) AS moving_avg_3,
       COUNT(*) OVER (ORDER BY day
                      ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS rows_in_frame
FROM daily_sales
WHERE store = 'A'
ORDER BY day;`,
      },
      {
        label: `The default frame (RANGE) vs ROWS when two orders share a day`,
        code: `SELECT id, order_day, amount,
       SUM(amount) OVER (ORDER BY order_day) AS default_range,
       SUM(amount) OVER (ORDER BY order_day, id
                         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS rows_by_id
FROM orders
ORDER BY order_day, id;`,
      },
      {
        label: `PostgreSQL: last 3 rows vs last 3 calendar days when a day is missing`,
        code: `SELECT day::date AS day, amount,
       SUM(amount) OVER (ORDER BY day::date
                         ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS last_3_rows,
       SUM(amount) OVER (ORDER BY day::date
                         RANGE BETWEEN INTERVAL '2 days' PRECEDING AND CURRENT ROW) AS last_3_days
FROM daily_sales
WHERE store = 'A'
ORDER BY day;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
];

export default augments;
