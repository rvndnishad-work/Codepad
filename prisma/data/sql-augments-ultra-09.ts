/**
 * SQL ULTRA — batch 09: Recursion and LATERAL (how recursive CTEs work, the
 * org-chart walk, cycle detection and search order, what LATERAL is, top-3
 * orders per customer with LATERAL). Every example was run by
 * scripts/verify-sql-examples.ts (sql.js 1.10.2 like the page, PostgreSQL 16
 * for postgres examples); quoted output is that run's output.
 */
import type { SqlUltraAugment } from "./sql-augments.types";

const augments: SqlUltraAugment[] = [
  {
    title: `How do recursive CTEs work?`,
    difficulty: "hard",
    seoDescription: `How a recursive CTE runs: anchor, recursive member, working table, termination, UNION vs UNION ALL and engine limits, with tree walks that were run.`,
    description: `**Question presented to candidate:**
"Walk me through how a recursive CTE actually executes. What are the two parts, how does the database know when to stop, and what would you use one for?"

**What a strong answer should cover:**
- The shape: \`WITH RECURSIVE name AS (anchor UNION [ALL] recursive term)\`; the anchor runs once, the recursive term refers to the CTE itself
- The execution model: a working table holds only the rows from the previous step; the recursive term runs against it, new rows are appended to the result and become the next working table; it stops when a step produces no rows
- Termination is the author's job: a WHERE condition, a join that runs out of children, \`UNION\` instead of \`UNION ALL\`, or a depth guard; engines differ on safety nets (SQL Server MAXRECURSION 100, MySQL \`cte_max_recursion_depth\` 1000, none in PostgreSQL or SQLite)
- Typical uses: walking trees and graphs (org charts, categories, bill of materials), generating series and calendars
- Restrictions: no aggregates in the recursive term, the CTE may be referenced only once there, column types must match (PostgreSQL rejects \`varchar(20)\` vs \`varchar\`)
- Engine detail: PostgreSQL and MySQL require the \`RECURSIVE\` keyword, SQLite accepts plain \`WITH\`, SQL Server has no \`RECURSIVE\` keyword at all

**Code / implementation expected:** Yes — a number generator and a tree walk (descendants or ancestors) with a depth column.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id INTEGER REFERENCES categories(id)
);
INSERT INTO categories (id, name, parent_id) VALUES
  (1, 'Electronics', NULL),
  (2, 'Computers', 1),
  (3, 'Laptops', 2),
  (4, 'Desktops', 2),
  (5, 'Phones', 1),
  (6, 'Accessories', 1),
  (7, 'Chargers', 6),
  (8, 'Cables', 6),
  (9, 'Home', NULL),
  (10, 'Kitchen', 9);
\`\`\``,
    answer: `**Target Audience:** Anyone who can write a JOIN and a basic CTE, meeting \`WITH RECURSIVE\` for the first time; and candidates who want to explain the execution model precisely.
**Difficulty:** Hard
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15, both run for this page. MySQL and SQL Server facts are cited, not run.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result, plan and error message below was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

Picture a family tree drawn on index cards. Each card has a name and, in the corner, the name of the parent. Someone asks: *"List everyone descended from Grandma."*

You cannot do it in one look. You pull Grandma's card (that is your starting point). Then you pull every card whose corner says "Grandma": her children. Then every card whose corner names one of *those* children: the grandchildren. You keep going, each round looking only at the cards you found in the previous round, until a round finds nobody. Then you stop and hand over the whole pile.

That is exactly what a recursive CTE does. A normal SQL query cannot do it, because a JOIN goes one level deep and you do not know in advance how many levels there are. A recursive CTE repeats the "find the next level" step for you until there is nothing left to find.

## 2. The Two Parts

A CTE (common table expression) is a named subquery written with \`WITH\`; if that is new, read [What is a CTE (Common Table Expression)?](/interview-question/what-is-a-cte-common-table-expression) first. A *recursive* CTE is one whose definition refers to its own name.

📌 **Interview term: recursive CTE** — a CTE declared with \`WITH RECURSIVE\` whose body is two queries joined by \`UNION ALL\` (or \`UNION\`), where the second one reads from the CTE itself.

The smallest possible example counts from 1 to 5:

~~~sql
WITH RECURSIVE cnt(n) AS (
  SELECT 1                 -- anchor: runs once
  UNION ALL
  SELECT n + 1 FROM cnt    -- recursive term: reads the previous step
  WHERE n < 5              -- stop condition
)
SELECT n FROM cnt;
~~~

~~~text
n
1
2
3
4
5
~~~

📌 **Interview term: anchor member** (also *non-recursive term* or *seed*) — the query before \`UNION ALL\`. It does not mention the CTE and runs exactly once. Here it produces the single row \`1\`.

📌 **Interview term: recursive member** (also *recursive term*) — the query after \`UNION ALL\`. It mentions the CTE by name and is run again and again. Here it turns each \`n\` into \`n + 1\`.

📌 **Interview term: termination condition** — whatever makes the recursive member eventually return zero rows. Here it is \`WHERE n < 5\`: when the previous step produced 5, the next step produces nothing and the loop ends.

## 3. How It Actually Executes

The word "recursive" is misleading. The database does not call a function inside itself; it runs a loop. The SQL standard and the PostgreSQL documentation describe the same algorithm:

1. Run the anchor. Put its rows in the result **and** in a temporary *working table*.
2. Run the recursive member, with every reference to the CTE reading **only the working table**.
3. Append the new rows to the result. They replace the working table.
4. If the working table is empty, stop. Otherwise go back to step 2.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="Recursive CTE loop: the anchor fills the working table, the recursive term reads it and produces new rows, which are added to the result and become the next working table until a step returns no rows">
  <defs>
    <marker id="sql09q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="180" height="70" rx="8"/>
  <text class="d-text" x="110" y="70" text-anchor="middle">Anchor member</text>
  <text class="d-sub" x="110" y="94" text-anchor="middle">runs once</text>
  <rect class="d-box-accent" x="290" y="40" width="190" height="70" rx="8"/>
  <text class="d-text" x="385" y="70" text-anchor="middle">Working table</text>
  <text class="d-sub" x="385" y="94" text-anchor="middle">last step only</text>
  <rect class="d-box" x="290" y="200" width="190" height="70" rx="8"/>
  <text class="d-text" x="385" y="230" text-anchor="middle">Recursive term</text>
  <text class="d-sub" x="385" y="254" text-anchor="middle">joins to it</text>
  <rect class="d-box" x="570" y="40" width="170" height="70" rx="8"/>
  <text class="d-text" x="655" y="70" text-anchor="middle">Result</text>
  <text class="d-sub" x="655" y="94" text-anchor="middle">all rows so far</text>
  <path class="d-edge" d="M 202 75 L 284 75" marker-end="url(#sql09q1-arrow)"/>
  <path class="d-edge-accent" d="M 385 112 L 385 194" marker-end="url(#sql09q1-arrow)"/>
  <path class="d-edge-accent" d="M 482 235 L 540 235 L 540 140 L 440 140 L 440 116" marker-end="url(#sql09q1-arrow)"/>
  <text class="d-accent" x="600" y="200" text-anchor="middle">new rows</text>
  <path class="d-edge-dashed" d="M 482 60 L 564 60" marker-end="url(#sql09q1-arrow)"/>
  <text class="d-sub" x="110" y="235" text-anchor="middle">stop when a step</text>
  <text class="d-sub" x="110" y="257" text-anchor="middle">returns no rows</text>
  <path class="d-edge-dashed" d="M 288 235 L 200 235" marker-end="url(#sql09q1-arrow)"/>
</svg>

The loop ends as soon as one round adds nothing. The final result is everything appended along the way; that is what the outer \`SELECT\` reads.

📌 **Interview term: working table** — the rows produced by the previous iteration. Each iteration of the recursive member sees only these rows, not the whole result so far. PostgreSQL shows it in a plan as a \`WorkTable Scan\`.

📌 **Interview term: fixed point** — the state where an iteration adds no new rows. A recursive CTE runs until it reaches one; if the data never lets it, the query never finishes.

### Watching the iterations on a tree

The schema above is a category tree: each row has a \`parent_id\` pointing at its parent, and the top categories have \`parent_id\` NULL. Walking down from Electronics, each iteration adds one level of the tree. This query labels each row with the iteration that produced it (it is \`depth\`, because each iteration goes one level deeper):

~~~sql
WITH RECURSIVE subtree(id, name, depth) AS (
  SELECT id, name, 0 FROM categories WHERE id = 1
  UNION ALL
  SELECT c.id, c.name, s.depth + 1
  FROM categories AS c
  JOIN subtree AS s ON c.parent_id = s.id
)
SELECT depth AS iteration, group_concat(name, ', ') AS rows_added
FROM (SELECT * FROM subtree ORDER BY id)
GROUP BY depth
ORDER BY depth;
~~~

~~~text
iteration | rows_added
0 | Electronics
1 | Computers, Phones, Accessories
2 | Laptops, Desktops, Chargers, Cables
~~~

(\`group_concat\` is the SQLite spelling; PostgreSQL uses \`string_agg\`, see [How do you aggregate values into a single string?](/interview-question/how-do-you-aggregate-values-into-a-single-string).) Iteration 3 joins the four leaf categories to \`categories\` and finds no children, so the working table is empty and the loop stops. Home and Kitchen are never touched: the anchor did not start there.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="The Electronics subtree, one row of boxes per iteration: iteration 0 is Electronics, iteration 1 adds its three children, iteration 2 adds four grandchildren">
  <defs>
    <marker id="sql09q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-accent" x="60" y="55" text-anchor="middle">step 0</text>
  <text class="d-accent" x="60" y="155" text-anchor="middle">step 1</text>
  <text class="d-accent" x="60" y="255" text-anchor="middle">step 2</text>
  <rect class="d-box-accent" x="340" y="30" width="140" height="40" rx="6"/>
  <text class="d-text" x="410" y="55" text-anchor="middle">Electronics</text>
  <rect class="d-box" x="170" y="130" width="140" height="40" rx="6"/>
  <text class="d-text" x="240" y="155" text-anchor="middle">Computers</text>
  <rect class="d-box" x="340" y="130" width="140" height="40" rx="6"/>
  <text class="d-text" x="410" y="155" text-anchor="middle">Phones</text>
  <rect class="d-box" x="510" y="130" width="140" height="40" rx="6"/>
  <text class="d-text" x="580" y="155" text-anchor="middle">Accessories</text>
  <rect class="d-box-muted" x="120" y="230" width="120" height="40" rx="6"/>
  <text class="d-text" x="180" y="255" text-anchor="middle">Laptops</text>
  <rect class="d-box-muted" x="260" y="230" width="120" height="40" rx="6"/>
  <text class="d-text" x="320" y="255" text-anchor="middle">Desktops</text>
  <rect class="d-box-muted" x="460" y="230" width="120" height="40" rx="6"/>
  <text class="d-text" x="520" y="255" text-anchor="middle">Chargers</text>
  <rect class="d-box-muted" x="600" y="230" width="120" height="40" rx="6"/>
  <text class="d-text" x="660" y="255" text-anchor="middle">Cables</text>
  <path class="d-edge" d="M 380 72 L 260 126" marker-end="url(#sql09q1-arrow2)"/>
  <path class="d-edge" d="M 410 72 L 410 126" marker-end="url(#sql09q1-arrow2)"/>
  <path class="d-edge" d="M 440 72 L 560 126" marker-end="url(#sql09q1-arrow2)"/>
  <path class="d-edge" d="M 220 172 L 185 226" marker-end="url(#sql09q1-arrow2)"/>
  <path class="d-edge" d="M 260 172 L 315 226" marker-end="url(#sql09q1-arrow2)"/>
  <path class="d-edge" d="M 560 172 L 525 226" marker-end="url(#sql09q1-arrow2)"/>
  <path class="d-edge" d="M 600 172 L 655 226" marker-end="url(#sql09q1-arrow2)"/>
</svg>

Each row of boxes is one iteration: the recursive member joined the boxes of the row above to their children.

## 4. Walking Down and Walking Up

Real queries carry extra columns through the recursion. A \`depth\` counter and a \`path\` string are the two most useful:

~~~sql
WITH RECURSIVE subtree(id, name, depth, path) AS (
  SELECT id, name, 0, name
  FROM categories
  WHERE id = 1
  UNION ALL
  SELECT c.id, c.name, s.depth + 1, s.path || ' > ' || c.name
  FROM categories AS c
  JOIN subtree AS s ON c.parent_id = s.id
)
SELECT id, name, depth, path
FROM subtree
ORDER BY path;
~~~

~~~text
id | name | depth | path
1 | Electronics | 0 | Electronics
6 | Accessories | 1 | Electronics > Accessories
8 | Cables | 2 | Electronics > Accessories > Cables
7 | Chargers | 2 | Electronics > Accessories > Chargers
2 | Computers | 1 | Electronics > Computers
4 | Desktops | 2 | Electronics > Computers > Desktops
3 | Laptops | 2 | Electronics > Computers > Laptops
5 | Phones | 1 | Electronics > Phones
~~~

Sorting by \`path\` puts every parent directly before its children, which is the order you want for an indented menu. Without an \`ORDER BY\` in the outer query the order of rows from a CTE is not guaranteed. (Sorting by a name path is alphabetical within each level; for other orders see the search-order part of [Recursive CTE with cycle detection — how do you handle circular manager references and produce a search order?](/interview-question/recursive-cte-with-cycle-detection-how-do-you-handle-circular-manager-references).)

📌 **Interview term: adjacency list** — the table design where each row stores its parent id (\`parent_id\`, \`manager_id\`). It is the most common way to store a tree, and the recursive CTE is the standard way to query it.

The same pattern runs upward. Start at a leaf and join on \`p.id = a.parent_id\` instead of \`c.parent_id = s.id\`:

~~~sql
WITH RECURSIVE ancestors(id, name, parent_id, steps_up) AS (
  SELECT id, name, parent_id, 0
  FROM categories
  WHERE id = 3
  UNION ALL
  SELECT p.id, p.name, p.parent_id, a.steps_up + 1
  FROM categories AS p
  JOIN ancestors AS a ON p.id = a.parent_id
)
SELECT id, name, steps_up
FROM ancestors
ORDER BY steps_up;
~~~

~~~text
id | name | steps_up
3 | Laptops | 0
2 | Computers | 1
1 | Electronics | 2
~~~

The walk stops on its own: Electronics has \`parent_id\` NULL, and \`p.id = NULL\` matches nothing. The direction of the join is the only difference between "all descendants" and "all ancestors". The applied version of this, an org chart, is [Recursive CTE for an org chart — how do you list all reports (direct + indirect) of a manager?](/interview-question/recursive-cte-for-an-org-chart-how-do-you-list-all-reports-direct-indirect-of-a-).

## 5. What the Plan Looks Like in PostgreSQL

~~~sql
EXPLAIN (COSTS OFF)
WITH RECURSIVE subtree(id, name, depth) AS (
  SELECT id, name, 0 FROM categories WHERE id = 1
  UNION ALL
  SELECT c.id, c.name, s.depth + 1
  FROM categories AS c
  JOIN subtree AS s ON c.parent_id = s.id
)
SELECT * FROM subtree;
~~~

~~~text
QUERY PLAN
CTE Scan on subtree
  CTE subtree
    ->  Recursive Union
          ->  Index Scan using categories_pkey on categories
                Index Cond: (id = 1)
          ->  Hash Join
                Hash Cond: (c.parent_id = s.id)
                ->  Seq Scan on categories c
                ->  Hash
                      ->  WorkTable Scan on subtree s
~~~

Read it bottom up. \`Recursive Union\` has two children: the anchor (an index lookup of \`id = 1\` on the primary key) and the recursive member, a join between \`categories\` and the \`WorkTable Scan\`, which is the working table. The planner may pick another join method on other data; on a large table you want an index on \`parent_id\` so each iteration is an index lookup per working row rather than a full scan. See [How do you read an EXPLAIN query plan?](/interview-question/how-do-you-read-an-explain-query-plan).

📌 **Interview term: Recursive Union** — the PostgreSQL plan node that implements the loop: it runs its first child once and its second child repeatedly against the working table.

## 6. Stopping: UNION vs UNION ALL, and Safety Nets

The recursion stops only when an iteration returns no rows. Three ways to make sure that happens:

**A condition or the shape of the data.** \`WHERE n < 5\`, or a tree that runs out of children.

**\`UNION\` instead of \`UNION ALL\`.** With \`UNION\`, rows that already exist in the result are thrown away before they enter the working table. This generator cycles 1, 2, 3, 1, 2, 3, ... forever, but with \`UNION\` the second 1 is a duplicate, the working table becomes empty, and it stops:

~~~sql
WITH RECURSIVE t(n) AS (
  SELECT 1
  UNION
  SELECT n % 3 + 1 FROM t
)
SELECT n FROM t ORDER BY n;
~~~

~~~text
n
1
2
3
~~~

The catch: \`UNION\` compares whole rows. As soon as you carry a \`depth\` or \`path\` column, every row is different and \`UNION\` no longer protects you. It also costs a duplicate check per row.

📌 **Interview term: UNION vs UNION ALL in a recursive CTE** — \`UNION ALL\` appends every produced row (fast, can loop forever on cyclic data); \`UNION\` discards rows already in the result (stops on repeated rows, slower). See [What is the difference between UNION and UNION ALL?](/interview-question/what-is-the-difference-between-union-and-union-all).

**An outer \`LIMIT\`.** Both SQLite and PostgreSQL produce CTE rows on demand, so a \`LIMIT\` in the outer query stops even an endless \`UNION ALL\` generator. Both engines returned this for the same cycling generator with \`UNION ALL\`:

~~~sql
WITH RECURSIVE t(n) AS (
  SELECT 1
  UNION ALL
  SELECT n % 3 + 1 FROM t
)
SELECT n FROM t LIMIT 7;
~~~

~~~text
n
1
2
3
1
2
3
1
~~~

Do not rely on this outside of generators: any outer \`ORDER BY\`, aggregate or join that needs every row will wait for a recursion that never ends.

**Engine safety nets** differ, and this is a common interview follow-up:

| Engine | Keyword | Built-in recursion limit |
| :--- | :--- | :--- |
| PostgreSQL 16 | \`WITH RECURSIVE\` required (run: plain \`WITH\` fails) | none; a runaway query runs until cancelled or \`statement_timeout\` |
| SQLite 3.45 | \`RECURSIVE\` optional (run: plain \`WITH\` works) | none |
| MySQL 8.0 | \`WITH RECURSIVE\` required when a CTE refers to itself ([MySQL manual, WITH](https://dev.mysql.com/doc/refman/8.0/en/with.html)) | \`cte_max_recursion_depth\`, default 1000, added in 8.0.3 ([MySQL worklog 10972](https://dev.mysql.com/worklog/task/?id=10972)) |
| SQL Server | plain \`WITH\`, no \`RECURSIVE\` keyword | \`OPTION (MAXRECURSION n)\`, default 100, 0 means unlimited; exceeding it raises Msg 530 ([MSSQLTips](https://www.mssqltips.com/sqlservertip/5111/fix-sql-server-cte-maximum-recursion-exhausted-error/)) |

Without \`RECURSIVE\`, PostgreSQL 16 refused the counter:

~~~text
ERROR:  relation "cnt" does not exist
DETAIL:  There is a WITH item named "cnt", but it cannot be referenced from this part of the query.
HINT:  Use WITH RECURSIVE, or re-order the WITH items to remove forward references.
~~~

while SQLite ran it anyway:

~~~sql
WITH cnt(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM cnt WHERE n < 5)
SELECT n FROM cnt;
~~~

~~~text
n
1
2
3
4
5
~~~

Write \`RECURSIVE\` always; it is portable to every engine except SQL Server.

📌 **Interview term: depth guard** — an explicit \`WHERE depth < N\` in the recursive member, so that bad data (for example a cycle) cannot make the query run forever. The specific cycle techniques are in [the cycle-detection question](/interview-question/recursive-cte-with-cycle-detection-how-do-you-handle-circular-manager-references).

## 7. Rules the Recursive Member Must Follow

These all come from the "it only sees the previous iteration" model.

**No aggregates.** A \`COUNT(*)\` over one iteration's rows has no stable meaning. Both engines reject it:

~~~text
PostgreSQL 16:  ERROR:  aggregate functions are not allowed in a recursive query's recursive term
SQLite 3.45:    recursive aggregate queries not supported
~~~

Aggregate in the outer query instead, as the iteration trace in section 3 does.

**No ORDER BY / LIMIT inside the recursive member** in PostgreSQL (\`ERROR:  ORDER BY in a recursive query is not implemented\`). SQLite does accept an \`ORDER BY\` there, with a special meaning: it chooses which queued row is processed next, which is one way to get depth-first order in SQLite.

**Column types must match.** PostgreSQL decides each column type from the anchor, and the recursive member must produce the same type. With a \`name VARCHAR(20)\` column, \`t.path || ' > ' || c.name\` is plain \`varchar\`, and PostgreSQL 16 said:

~~~text
ERROR:  recursive query "t" column 2 has type character varying(20) in non-recursive term but type character varying overall
HINT:  Cast the output of the non-recursive term to the correct type.
~~~

The fix is a cast in the anchor: \`SELECT id, name::text FROM ...\` (or \`CAST(name AS TEXT)\`). SQLite has no such check because its columns are dynamically typed. This is one of the most common surprises when moving a recursive CTE from SQLite tests to PostgreSQL.

**The CTE is referenced once, and not on the nullable side of an outer join** (PostgreSQL 16, when the CTE was on the right of a LEFT JOIN: \`recursive reference to query "s" must not appear within an outer join\`; SQLite accepted the same query). Join the CTE with an inner join, or put it on the left of a LEFT JOIN.

## 8. Verified: Running the Code

The four examples on this page were run by the project verifier: the first three on sql.js 1.10.2 (SQLite 3.45.0) seeded with the schema above, the plan on PostgreSQL 16.15 in a scratch database seeded with the same schema. The counter printed:

~~~text
n
1
2
3
4
5
~~~

The downward tree walk printed:

~~~text
id | name | depth | path
1 | Electronics | 0 | Electronics
6 | Accessories | 1 | Electronics > Accessories
8 | Cables | 2 | Electronics > Accessories > Cables
7 | Chargers | 2 | Electronics > Accessories > Chargers
2 | Computers | 1 | Electronics > Computers
4 | Desktops | 2 | Electronics > Computers > Desktops
3 | Laptops | 2 | Electronics > Computers > Laptops
5 | Phones | 1 | Electronics > Phones
~~~

The upward walk printed:

~~~text
id | name | steps_up
3 | Laptops | 0
2 | Computers | 1
1 | Electronics | 2
~~~

The PostgreSQL plan printed:

~~~text
QUERY PLAN
CTE Scan on subtree
  CTE subtree
    ->  Recursive Union
          ->  Index Scan using categories_pkey on categories
                Index Cond: (id = 1)
          ->  Hash Join
                Hash Cond: (c.parent_id = s.id)
                ->  Seq Scan on categories c
                ->  Hash
                      ->  WorkTable Scan on subtree s
~~~

The iteration trace, \`UNION\`, \`LIMIT\` and no-\`RECURSIVE\` queries in the prose were run the same way on SQLite (the first three also on PostgreSQL 16.15, with the same rows; the trace uses \`string_agg\` there). Every error message quoted above was copied from a run on PostgreSQL 16.15 or sql.js 1.10.2.

## Common Pitfalls

- **No termination on cyclic data.** A \`UNION ALL\` walk over a graph with a cycle never ends in PostgreSQL or SQLite. Add a depth guard or cycle detection whenever the data is not guaranteed to be a tree.
- **Joining in the wrong direction.** \`c.parent_id = s.id\` walks down; \`p.id = a.parent_id\` walks up. Swapping them silently returns the wrong set.
- **Expecting ordered output.** In these runs rows came out in iteration order, but no engine guarantees it. Always \`ORDER BY\` a \`path\` or \`depth\` column in the outer query.
- **Relying on \`UNION\` to stop when you carry depth or path.** Those columns make every row unique, so \`UNION\` deduplicates nothing.
- **\`varchar(n)\` type mismatch in PostgreSQL.** Cast the anchor column to \`text\` when the recursive member concatenates.
- **Forgetting the index.** Every iteration joins the working table to the base table on \`parent_id\`; without an index on it, each level is a full scan.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Shape:</strong> <span style="color:#f0e2c8;">A recursive CTE is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WITH RECURSIVE name AS (anchor UNION ALL recursive_term)</code>. The <strong style="color:#ffca28;">anchor</strong> is an ordinary query that runs once; the <strong style="color:#ffca28;">recursive term</strong> refers to the CTE by name.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Execution:</strong> <span style="color:#f0e2c8;">The anchor rows go into a <strong style="color:#ffca28;">working table</strong> and into the result. Then the recursive term runs against the working table only, its new rows are added to the result and replace the working table, and this repeats. It is iteration, not real recursion.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Termination:</strong> <span style="color:#f0e2c8;">It stops when a step produces zero rows. That happens naturally when a tree runs out of children, or through a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE n &lt; 5</code> condition. If it never happens the query runs forever, so I add a depth guard on data I do not trust.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Uses:</strong> <span style="color:#f0e2c8;">Trees and graphs stored as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent_id</code> columns: org charts, category trees, bill of materials, plus generating series and calendars. I carry a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">depth</code> and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path</code> column so I can sort and indent the result.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Engine details:</strong> <span style="color:#f0e2c8;">PostgreSQL shows it as a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Recursive Union</code> over a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WorkTable Scan</code>. Aggregates are not allowed in the recursive term. SQL Server stops at 100 levels by default (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MAXRECURSION</code>), MySQL at 1000 (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cte_max_recursion_depth</code>); PostgreSQL and SQLite have no such limit.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">UNION</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">UNION ALL</code> in a recursive CTE?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION ALL</code> keeps every row and is the fast default. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION</code> discards rows that were already produced, so a step that only finds old rows adds nothing and the recursion stops. In the run for this page, a cyclic generator <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n % 3 + 1</code> stopped after 1, 2, 3 with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION</code>, but needed a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LIMIT</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION ALL</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the recursive term really evaluated recursively?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Despite the name, the engine loops: each iteration sees only the rows produced by the previous iteration (the working table), not the whole result. That is why a self-join of the CTE to itself in the recursive term is not allowed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you not use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">COUNT(*)</code> in the recursive term?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the term runs once per iteration over a partial set, an aggregate would have no stable meaning. PostgreSQL 16 says <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aggregate functions are not allowed in a recursive query's recursive term</code>; SQLite says <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">recursive aggregate queries not supported</code>. Aggregate in the outer SELECT instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get a tree in display order, parents before children?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Build a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path</code> column in the recursive term and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY path</code> in the outer query, or use PostgreSQL 14 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SEARCH DEPTH FIRST BY</code>. The rows come out of the CTE in no guaranteed order otherwise.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens on a cycle in the data?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION ALL</code> the recursion never ends. You detect it by carrying the visited path and refusing to revisit, or with PostgreSQL 14 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CYCLE</code> clause; that is the topic of the cycle-detection question on this site.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Recursive CTE | A \`WITH RECURSIVE\` CTE whose second part reads from itself |
| Anchor member | The first query; runs once and seeds the result |
| Recursive member | The second query; runs repeatedly against the previous iteration |
| Termination condition | What makes the recursive member eventually return no rows |
| Working table | The rows of the previous iteration, the only rows the recursive member sees |
| Fixed point | The iteration that adds nothing, where the loop stops |
| Adjacency list | A tree stored as rows with a parent id column |
| Recursive Union | PostgreSQL plan node that runs the loop |
| UNION vs UNION ALL | Deduplicate against the result (can stop cycles) vs append everything (fast) |
| Depth guard | A \`WHERE depth < N\` in the recursive member that caps the recursion |

**Conclusion:** A recursive CTE is a loop written as a query: the anchor runs once, then the recursive member runs again and again against only the rows the previous round produced, until a round produces nothing. That model explains everything an interviewer will ask: why it walks a tree one level per iteration (Electronics, then three children, then four grandchildren), why aggregates are not allowed inside it, why \`UNION\` can stop a cycle but only when rows repeat exactly, and why you must make termination certain yourself, since PostgreSQL and SQLite have no built-in limit while SQL Server stops at 100 and MySQL at 1000. Carry a \`depth\` and a \`path\`, order by them in the outer query, and index the parent column.`,
    examples: [
      {
        label: `The smallest recursive CTE: count from 1 to 5`,
        code: `WITH RECURSIVE cnt(n) AS (
  SELECT 1                 -- anchor: runs once
  UNION ALL
  SELECT n + 1 FROM cnt    -- recursive term: reads the previous step
  WHERE n < 5              -- stop condition
)
SELECT n FROM cnt;`,
      },
      {
        label: `Walk down a tree: every category under Electronics with its depth and path`,
        code: `WITH RECURSIVE subtree(id, name, depth, path) AS (
  SELECT id, name, 0, name
  FROM categories
  WHERE id = 1
  UNION ALL
  SELECT c.id, c.name, s.depth + 1, s.path || ' > ' || c.name
  FROM categories AS c
  JOIN subtree AS s ON c.parent_id = s.id
)
SELECT id, name, depth, path
FROM subtree
ORDER BY path;`,
      },
      {
        label: `Walk up a tree: the ancestors of Laptops (a breadcrumb)`,
        code: `WITH RECURSIVE ancestors(id, name, parent_id, steps_up) AS (
  SELECT id, name, parent_id, 0
  FROM categories
  WHERE id = 3
  UNION ALL
  SELECT p.id, p.name, p.parent_id, a.steps_up + 1
  FROM categories AS p
  JOIN ancestors AS a ON p.id = a.parent_id
)
SELECT id, name, steps_up
FROM ancestors
ORDER BY steps_up;`,
      },
      {
        label: `PostgreSQL plan: Recursive Union over a WorkTable Scan`,
        code: `EXPLAIN (COSTS OFF)
WITH RECURSIVE subtree(id, name, depth) AS (
  SELECT id, name, 0 FROM categories WHERE id = 1
  UNION ALL
  SELECT c.id, c.name, s.depth + 1
  FROM categories AS c
  JOIN subtree AS s ON c.parent_id = s.id
)
SELECT * FROM subtree;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `Recursive CTE for an org chart — how do you list all reports (direct + indirect) of a manager?`,
    difficulty: "medium",
    seoDescription: `List every direct and indirect report of a manager with a recursive CTE: levels, a printed org chart, headcounts, depth limits and the manager_id index.`,
    description: `**Question presented to candidate:**
"We store employees in one table with a \`manager_id\` column. Given a manager, write a query that returns everyone who reports to them, directly or through other managers, with how many levels down each person is."

**What a strong answer should cover:**
- Why a plain self join is not enough: each join adds exactly one level, and the depth of the tree is unknown
- A recursive CTE: anchor = the direct reports (\`manager_id = :id\`), recursive member joins \`employees.manager_id = reports.id\`, carrying a \`level\` column
- Deciding whether the manager themself is in the result (anchor on \`id = :id\` with level 0, or on \`manager_id = :id\` with level 1)
- Presentation: a \`path\` column to print the chart in tree order, and aggregating the walk for headcount per manager
- Performance: an index on \`manager_id\` turns each iteration into index lookups (PostgreSQL shows a Nested Loop with an Index Scan per working-table row)
- Robustness: a depth guard or cycle check when the data could contain a loop; alternatives for very read-heavy trees (closure table, materialized path)

**Clarifying questions expected:**
- Should the result include the manager, and do you want the depth or the full chain for each person?
- Can the data contain cycles or people with several managers (a graph, not a tree)?
- How big is the org and how often is this run: per request, or for a report?

**Code / implementation expected:** Yes — a recursive CTE listing all reports with their level, plus ideally the tree-ordered view or the headcount roll-up.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  manager_id INTEGER REFERENCES employees(id)
);
CREATE INDEX employees_manager_id_idx ON employees (manager_id);
INSERT INTO employees (id, name, title, manager_id) VALUES
  (1, 'Maya', 'CEO', NULL),
  (2, 'Raj', 'VP Engineering', 1),
  (3, 'Lena', 'VP Sales', 1),
  (4, 'Omar', 'Engineering Manager', 2),
  (5, 'Priya', 'Engineering Manager', 2),
  (6, 'Sam', 'Senior Engineer', 4),
  (7, 'Tara', 'Engineer', 4),
  (8, 'Uma', 'Engineer', 5),
  (9, 'Victor', 'Account Executive', 3),
  (10, 'Wen', 'Account Executive', 3),
  (11, 'Zoe', 'Intern', 6);
\`\`\``,
    answer: `**Target Audience:** Developers who know JOINs and have seen a basic recursive CTE; the applied interview version of "walk a hierarchy".
**Difficulty:** Medium
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15; every query below was run on both and returned the same rows.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and plan below was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

HR asks: *"Raj is leaving. Who is affected?"* Not just the two engineering managers who report to him, but their engineers, and the intern one of those engineers mentors. In the database each person only knows one thing: who their *own* manager is. Nobody stores "Zoe is three levels under Raj".

So you work like a phone tree. Call Raj's direct reports. Each of them calls their direct reports. Those people call theirs. When nobody has anyone left to call, everyone affected has been reached. A recursive CTE is that phone tree in SQL. This page applies the mechanics explained in [How do recursive CTEs work?](/interview-question/how-do-recursive-ctes-work) to the most common interview version of the problem.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Should the manager appear in the result? | Decides the anchor: \`id = :id\` (level 0) or \`manager_id = :id\` (level 1). |
| Do you need the level, the full chain, or just the list? | A \`level\` column is free; a \`path\` column costs string building but gives tree order. |
| Can someone have two managers, or can the data have loops? | Then it is a graph, not a tree, and you need cycle protection. |
| How large is the org, and how often is this queried? | Decides whether a live recursive query is fine or the hierarchy should be precomputed. |
| Is the hierarchy historical (as of a date)? | Then the join also needs a validity-date condition. |

## 3. The Data: One Table, One Pointer per Row

Each employee row points at its manager through \`manager_id\`; the CEO has NULL.

📌 **Interview term: adjacency list** — storing a hierarchy as one row per node with a column pointing at its parent (\`manager_id\`). Simple to insert into and move around; hierarchical reads need recursion.

📌 **Interview term: self-referencing foreign key** — \`manager_id INTEGER REFERENCES employees(id)\`: a foreign key that points into the same table.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 400" role="img" aria-label="Org chart of the example data: Maya at the top, Raj and Lena below her, Omar and Priya under Raj, Sam and Tara under Omar, Uma under Priya, Zoe under Sam. The subtree under Raj is highlighted">
  <defs>
    <marker id="sql09q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="330" y="20" width="100" height="40" rx="6"/>
  <text class="d-text" x="380" y="45" text-anchor="middle">Maya</text>
  <rect class="d-box-accent" x="190" y="100" width="100" height="40" rx="6"/>
  <text class="d-text" x="240" y="125" text-anchor="middle">Raj</text>
  <rect class="d-box-muted" x="490" y="100" width="100" height="40" rx="6"/>
  <text class="d-text" x="540" y="125" text-anchor="middle">Lena</text>
  <rect class="d-box" x="90" y="180" width="100" height="40" rx="6"/>
  <text class="d-text" x="140" y="205" text-anchor="middle">Omar</text>
  <rect class="d-box" x="290" y="180" width="100" height="40" rx="6"/>
  <text class="d-text" x="340" y="205" text-anchor="middle">Priya</text>
  <rect class="d-box-muted" x="440" y="180" width="100" height="40" rx="6"/>
  <text class="d-text" x="490" y="205" text-anchor="middle">Victor</text>
  <rect class="d-box-muted" x="590" y="180" width="100" height="40" rx="6"/>
  <text class="d-text" x="640" y="205" text-anchor="middle">Wen</text>
  <rect class="d-box" x="20" y="260" width="90" height="40" rx="6"/>
  <text class="d-text" x="65" y="285" text-anchor="middle">Sam</text>
  <rect class="d-box" x="150" y="260" width="90" height="40" rx="6"/>
  <text class="d-text" x="195" y="285" text-anchor="middle">Tara</text>
  <rect class="d-box" x="295" y="260" width="90" height="40" rx="6"/>
  <text class="d-text" x="340" y="285" text-anchor="middle">Uma</text>
  <path class="d-edge" d="M 360 62 L 260 96" marker-end="url(#sql09q2-arrow)"/>
  <path class="d-edge" d="M 400 62 L 520 96" marker-end="url(#sql09q2-arrow)"/>
  <path class="d-edge-accent" d="M 225 142 L 155 176" marker-end="url(#sql09q2-arrow)"/>
  <path class="d-edge-accent" d="M 255 142 L 325 176" marker-end="url(#sql09q2-arrow)"/>
  <path class="d-edge" d="M 525 142 L 495 176" marker-end="url(#sql09q2-arrow)"/>
  <path class="d-edge" d="M 555 142 L 625 176" marker-end="url(#sql09q2-arrow)"/>
  <path class="d-edge-accent" d="M 125 222 L 75 256" marker-end="url(#sql09q2-arrow)"/>
  <path class="d-edge-accent" d="M 155 222 L 185 256" marker-end="url(#sql09q2-arrow)"/>
  <path class="d-edge-accent" d="M 340 222 L 340 256" marker-end="url(#sql09q2-arrow)"/>
  <rect class="d-box" x="20" y="340" width="90" height="40" rx="6"/>
  <text class="d-text" x="65" y="365" text-anchor="middle">Zoe</text>
  <path class="d-edge-accent" d="M 65 302 L 65 336" marker-end="url(#sql09q2-arrow)"/>
</svg>

The highlighted part is the answer for Raj: Omar and Priya (level 1), Sam, Tara and Uma (level 2), and Zoe (level 3).

## 4. Why a Self Join Is Not Enough

A self join can look one level up per join (see [What is a self join?](/interview-question/what-is-a-self-join)). Two joins cover two levels:

~~~sql
SELECT e.name AS employee, m.name AS manager, g.name AS skip_level
FROM employees AS e
JOIN employees AS m ON m.id = e.manager_id
LEFT JOIN employees AS g ON g.id = m.manager_id
WHERE m.id = 2 OR m.manager_id = 2
ORDER BY e.name;
~~~

~~~text
employee | manager | skip_level
Omar | Raj | Maya
Priya | Raj | Maya
Sam | Omar | Raj
Tara | Omar | Raj
Uma | Priya | Raj
~~~

Zoe is missing, because she is three levels down and the query only has two levels of joins. You could add a third join, and then the org grows a fourth level. You need a query that repeats the join as many times as the data requires.

## 5. The Recursive CTE

~~~sql
WITH RECURSIVE reports(id, name, title, manager_id, level) AS (
  SELECT id, name, title, manager_id, 1
  FROM employees
  WHERE manager_id = 2          -- direct reports of Raj
  UNION ALL
  SELECT e.id, e.name, e.title, e.manager_id, r.level + 1
  FROM employees AS e
  JOIN reports AS r ON e.manager_id = r.id
)
SELECT r.name, r.title, m.name AS reports_to, r.level
FROM reports AS r
JOIN employees AS m ON m.id = r.manager_id
ORDER BY r.level, r.name;
~~~

~~~text
name | title | reports_to | level
Omar | Engineering Manager | Raj | 1
Priya | Engineering Manager | Raj | 1
Sam | Senior Engineer | Omar | 2
Tara | Engineer | Omar | 2
Uma | Engineer | Priya | 2
Zoe | Intern | Sam | 3
~~~

Line by line:

- **The anchor** (\`WHERE manager_id = 2\`) finds the direct reports, Omar and Priya, and gives them \`level = 1\`.
- **The recursive member** joins \`employees\` to the rows found in the previous round: anyone whose \`manager_id\` is one of those ids. First round: Sam, Tara (under Omar) and Uma (under Priya), level 2. Second round: Zoe (under Sam), level 3. Third round: nobody has Zoe, Tara or Uma as manager, so the round is empty and the recursion stops.
- **The outer query** joins back to \`employees\` once more to show each person's own manager's name, and orders the result. It runs once on the finished set.

📌 **Interview term: direct vs indirect reports** — direct reports have \`manager_id\` equal to the manager (level 1); indirect reports are reached through one or more intermediate managers (level 2 and deeper). The recursive CTE returns both; \`WHERE level = 1\` would keep only the direct ones.

📌 **Interview term: level (depth)** — a counter carried through the recursion, set in the anchor and incremented in the recursive member. It costs nothing and answers "how far down" questions.

**Including the manager.** Anchor on \`WHERE id = 2\` with level 0 instead. The next example does that, because a chart needs its root.

## 6. Printing It as an Org Chart

Ordering by \`level\` lists one level after another. To print a real chart, every manager has to be followed directly by their own team. Carry a \`path\` of names and sort by it:

~~~sql
WITH RECURSIVE tree(id, name, title, level, path) AS (
  SELECT id, name, title, 0, name
  FROM employees
  WHERE id = 2
  UNION ALL
  SELECT e.id, e.name, e.title, t.level + 1, t.path || ' / ' || e.name
  FROM employees AS e
  JOIN tree AS t ON e.manager_id = t.id
)
SELECT substr('............', 1, level * 4) || name AS org_chart, title
FROM tree
ORDER BY path;
~~~

~~~text
org_chart | title
Raj | VP Engineering
....Omar | Engineering Manager
........Sam | Senior Engineer
............Zoe | Intern
........Tara | Engineer
....Priya | Engineering Manager
........Uma | Engineer
~~~

📌 **Interview term: materialized path (in a query)** — a string such as \`Raj / Omar / Sam\` built during the recursion. Sorting by it gives depth-first tree order. Siblings come out alphabetically here; if two siblings could share a name, build the path from zero-padded ids instead, so the sort is still unambiguous.

(The dots are padding so the indentation survives in the result table; in an application you would indent using \`level\`.) This is a depth-first order. Breadth-first is simply \`ORDER BY level, name\` as in section 5. PostgreSQL 14 and later can generate both orders for you with the \`SEARCH\` clause, covered in [Recursive CTE with cycle detection — how do you handle circular manager references and produce a search order?](/interview-question/recursive-cte-with-cycle-detection-how-do-you-handle-circular-manager-references).

## 7. Variations Interviewers Ask For

**Walk up instead of down: the chain of command for Zoe.** Anchor on the employee and join the manager of the previous row:

~~~sql
WITH RECURSIVE up(id, name, title, manager_id, hops) AS (
  SELECT id, name, title, manager_id, 0 FROM employees WHERE id = 11
  UNION ALL
  SELECT m.id, m.name, m.title, m.manager_id, u.hops + 1
  FROM employees AS m JOIN up AS u ON m.id = u.manager_id
)
SELECT hops, name, title FROM up ORDER BY hops;
~~~

~~~text
hops | name | title
0 | Zoe | Intern
1 | Sam | Senior Engineer
2 | Omar | Engineering Manager
3 | Raj | VP Engineering
4 | Maya | CEO
~~~

It stops by itself at Maya, whose \`manager_id\` is NULL. This is the query behind "can this manager approve this employee's expense?": check whether the manager's id appears in the employee's chain.

**Limit the depth.** Put the condition on the previous row in the recursive member:

~~~sql
WITH RECURSIVE reports(id, name, level) AS (
  SELECT id, name, 1 FROM employees WHERE manager_id = 2
  UNION ALL
  SELECT e.id, e.name, r.level + 1
  FROM employees AS e
  JOIN reports AS r ON e.manager_id = r.id
  WHERE r.level < 2              -- stop after two levels
)
SELECT name, level FROM reports ORDER BY level, name;
~~~

~~~text
name | level
Omar | 1
Priya | 1
Sam | 2
Tara | 2
Uma | 2
~~~

Rows at level 2 are still produced, but they are not expanded further, so Zoe is gone. Filtering in the outer query (\`WHERE level <= 2\`) gives the same rows but still walks the whole subtree first; putting the limit inside saves the work. The same pattern is the standard depth guard against bad data.

**Headcount for every manager at once.** Instead of starting from one manager, seed the CTE with every (manager, direct report) pair and extend each pair downward, keeping the original manager:

~~~sql
WITH RECURSIVE chain(manager_id, employee_id) AS (
  SELECT manager_id, id
  FROM employees
  WHERE manager_id IS NOT NULL
  UNION ALL
  SELECT c.manager_id, e.id
  FROM chain AS c
  JOIN employees AS e ON e.manager_id = c.employee_id
)
SELECT m.name AS manager,
       COUNT(*) AS total_reports,
       SUM(CASE WHEN e.manager_id = m.id THEN 1 ELSE 0 END) AS direct_reports
FROM chain AS c
JOIN employees AS m ON m.id = c.manager_id
JOIN employees AS e ON e.id = c.employee_id
GROUP BY m.id, m.name
ORDER BY total_reports DESC, manager;
~~~

~~~text
manager | total_reports | direct_reports
Maya | 10 | 2
Raj | 6 | 2
Omar | 3 | 2
Lena | 2 | 2
Priya | 1 | 1
Sam | 1 | 1
~~~

The CTE produced one row for every (manager, someone below them) pair; the aggregate runs in the outer query, because aggregates are not allowed inside the recursive member. Maya has 10 reports: everyone except herself. People with no reports (Tara, Uma, Victor, Wen, Zoe) do not appear; LEFT JOIN from \`employees\` if they must show 0.

📌 **Interview term: transitive closure** — the set of all (ancestor, descendant) pairs of a hierarchy. The \`chain\` CTE computes it; a **closure table** stores it permanently so reads need no recursion.

## 8. Performance: Index the Pointer Column

Every iteration does the same thing: for each row of the previous level, find employees whose \`manager_id\` equals its id. That is a lookup on \`manager_id\`, so the schema above creates \`employees_manager_id_idx\`. On a table this small PostgreSQL would just scan it, so the example disables sequential scans to show the plan it uses when the table is large enough for the index to win (the planner may choose differently on your data):

~~~sql
SET enable_seqscan = off;
EXPLAIN (COSTS OFF)
WITH RECURSIVE reports(id, name, level) AS (
  SELECT id, name, 1 FROM employees WHERE manager_id = 2
  UNION ALL
  SELECT e.id, e.name, r.level + 1
  FROM employees AS e
  JOIN reports AS r ON e.manager_id = r.id
)
SELECT name, level FROM reports;
~~~

~~~text
QUERY PLAN
CTE Scan on reports
  CTE reports
    ->  Recursive Union
          ->  Bitmap Heap Scan on employees
                Recheck Cond: (manager_id = 2)
                ->  Bitmap Index Scan on employees_manager_id_idx
                      Index Cond: (manager_id = 2)
          ->  Nested Loop
                ->  WorkTable Scan on reports r
                ->  Index Scan using employees_manager_id_idx on employees e
                      Index Cond: (manager_id = r.id)
~~~

The anchor uses the index to find Raj's direct reports; the recursive member is a \`Nested Loop\`: for each row in the \`WorkTable Scan\` (the previous level) one \`Index Scan\` on \`manager_id\`. The work is proportional to the size of the subtree, not the size of the company. Without the index, each level would scan the whole table.

| Approach | Read "all reports" | Insert / move a person | Notes |
| :--- | :--- | :--- | :--- |
| Adjacency list + recursive CTE | one recursive query; cost grows with subtree size | update one \`manager_id\` | the default; needs an index on \`manager_id\` |
| Closure table | one indexed join, no recursion | insert or delete many pairs | best for very read-heavy hierarchies |
| Materialized path column (\`/1/2/4/\`) | prefix match, \`LIKE '/1/2/%'\` | rewrite the paths of the moved subtree | PostgreSQL also offers the \`ltree\` extension for this |

## 9. Verified: Running the Code

The four examples were run by the project verifier: three on sql.js 1.10.2 (SQLite 3.45.0) seeded with the schema above, the plan on PostgreSQL 16.15 in a scratch database seeded with the same schema. All reports of Raj:

~~~text
name | title | reports_to | level
Omar | Engineering Manager | Raj | 1
Priya | Engineering Manager | Raj | 1
Sam | Senior Engineer | Omar | 2
Tara | Engineer | Omar | 2
Uma | Engineer | Priya | 2
Zoe | Intern | Sam | 3
~~~

The indented chart:

~~~text
org_chart | title
Raj | VP Engineering
....Omar | Engineering Manager
........Sam | Senior Engineer
............Zoe | Intern
........Tara | Engineer
....Priya | Engineering Manager
........Uma | Engineer
~~~

The headcount roll-up:

~~~text
manager | total_reports | direct_reports
Maya | 10 | 2
Raj | 6 | 2
Omar | 3 | 2
Lena | 2 | 2
Priya | 1 | 1
Sam | 1 | 1
~~~

The PostgreSQL plan:

~~~text
QUERY PLAN
CTE Scan on reports
  CTE reports
    ->  Recursive Union
          ->  Bitmap Heap Scan on employees
                Recheck Cond: (manager_id = 2)
                ->  Bitmap Index Scan on employees_manager_id_idx
                      Index Cond: (manager_id = 2)
          ->  Nested Loop
                ->  WorkTable Scan on reports r
                ->  Index Scan using employees_manager_id_idx on employees e
                      Index Cond: (manager_id = r.id)
~~~

The self-join, chain-of-command and depth-limit queries in the prose were run the same way; each of the SQLite queries was also run on PostgreSQL 16.15 and returned identical rows.

## Common Pitfalls

- **Joining the wrong way round.** Walking down is \`e.manager_id = r.id\`; writing \`e.id = r.manager_id\` walks up, and the query still runs, returning the wrong people.
- **Forgetting the manager decision.** Anchoring on \`id = :id\` includes the manager, \`manager_id = :id\` does not. Say which one you chose.
- **Filtering depth in the outer query only.** It works, but the whole subtree is still walked. Put the depth limit in the recursive member.
- **No index on \`manager_id\`.** Every iteration becomes a full scan of the employees table.
- **Assuming the data is a tree.** One bad update (\`manager_id\` pointing at a subordinate) makes a \`UNION ALL\` walk run forever. Guard against cycles when the data is not validated.
- **Relying on output order.** Without \`ORDER BY level\` or \`ORDER BY path\` the rows come back in an order you did not ask for.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Why recursion:</strong> <span style="color:#f0e2c8;">A self join on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">manager_id</code> gives one level per join, and an org chart has an unknown number of levels. A recursive CTE repeats the join until nobody new is found.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The query:</strong> <span style="color:#f0e2c8;">Anchor: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT ... FROM employees WHERE manager_id = :id</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">level = 1</code>. Recursive member: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">JOIN reports r ON e.manager_id = r.id</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r.level + 1</code>. For Raj that returned six people, down to Zoe at level 3.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Choices:</strong> <span style="color:#f0e2c8;">I ask whether the manager should be included; if so I anchor on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">id = :id</code> at level 0. I carry a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path</code> column when the result has to be shown as a tree, and I aggregate the walk for headcounts.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Performance:</strong> <span style="color:#f0e2c8;">Each iteration joins the previous level to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">employees</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">manager_id</code>, so an index on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">manager_id</code> matters. On PostgreSQL 16 the plan became a Nested Loop over the WorkTable with an Index Scan on that index.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Safety:</strong> <span style="color:#f0e2c8;">If the data can contain a loop (A manages B manages A), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION ALL</code> never terminates, so I add a depth guard or cycle detection. For huge, read-heavy trees I would consider a closure table or a materialized path.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you go the other way, the chain of command above someone?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Anchor on the employee and join <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m.id = up.manager_id</code>. For Zoe it returned Sam, Omar, Raj and Maya with hops 1 to 4, and stopped on its own when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">manager_id</code> was NULL.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you limit it to two levels?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE r.level &lt; 2</code> to the recursive member. The filter goes on the previous row, so rows at level 2 are still produced but not expanded; in the run Zoe at level 3 disappeared.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you count all reports per manager in one query?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Seed the CTE with every (manager, direct report) pair and keep extending <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">employee_id</code> downwards while keeping <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">manager_id</code>. That gives one row per manager and descendant, which <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY</code> counts: Maya 10, Raj 6, Omar 3.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is this fast for 100,000 employees?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each iteration is one index lookup per row of the previous level, so the cost is proportional to the size of the subtree, not the table. For an all-managers roll-up the pair set can be large (sum of depths), so a report like that is often precomputed or stored in a closure table.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What alternatives to an adjacency list exist?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A closure table storing every ancestor and descendant pair, a materialized path column like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/1/2/4/</code>, or nested sets. They make reads simple at the cost of more work on every insert or move.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Adjacency list | A hierarchy stored as one row per node with a parent pointer |
| Self-referencing foreign key | A foreign key that points into its own table, like \`manager_id\` |
| Direct vs indirect reports | One level down vs reached through intermediate managers |
| Level (depth) | Counter carried through the recursion to show how far down a row is |
| Materialized path | A string of ancestors built during the walk; sorting by it gives tree order |
| Transitive closure | Every (ancestor, descendant) pair of the hierarchy |
| Closure table | A table that stores the transitive closure so reads need no recursion |

**Conclusion:** Listing all reports of a manager is the textbook use of a recursive CTE: anchor on the direct reports, join \`employees.manager_id\` to the rows of the previous round, and carry a \`level\` so you can tell direct from indirect. A self join stops at the number of joins you wrote (it missed Zoe at level 3); the recursive CTE keeps going until a round finds nobody. Add a \`path\` when the output must look like a chart, aggregate the walk for headcounts, index \`manager_id\` so each round is an index lookup, and guard against cycles whenever the data could contain one.`,
    examples: [
      {
        label: `All direct and indirect reports of Raj (id 2), with their level`,
        code: `WITH RECURSIVE reports(id, name, title, manager_id, level) AS (
  SELECT id, name, title, manager_id, 1
  FROM employees
  WHERE manager_id = 2          -- direct reports of Raj
  UNION ALL
  SELECT e.id, e.name, e.title, e.manager_id, r.level + 1
  FROM employees AS e
  JOIN reports AS r ON e.manager_id = r.id
)
SELECT r.name, r.title, m.name AS reports_to, r.level
FROM reports AS r
JOIN employees AS m ON m.id = r.manager_id
ORDER BY r.level, r.name;`,
      },
      {
        label: `The same walk printed as an indented org chart, in tree order`,
        code: `WITH RECURSIVE tree(id, name, title, level, path) AS (
  SELECT id, name, title, 0, name
  FROM employees
  WHERE id = 2
  UNION ALL
  SELECT e.id, e.name, e.title, t.level + 1, t.path || ' / ' || e.name
  FROM employees AS e
  JOIN tree AS t ON e.manager_id = t.id
)
SELECT substr('............', 1, level * 4) || name AS org_chart, title
FROM tree
ORDER BY path;`,
      },
      {
        label: `Headcount roll-up: total and direct reports for every manager`,
        code: `WITH RECURSIVE chain(manager_id, employee_id) AS (
  SELECT manager_id, id
  FROM employees
  WHERE manager_id IS NOT NULL
  UNION ALL
  SELECT c.manager_id, e.id
  FROM chain AS c
  JOIN employees AS e ON e.manager_id = c.employee_id
)
SELECT m.name AS manager,
       COUNT(*) AS total_reports,
       SUM(CASE WHEN e.manager_id = m.id THEN 1 ELSE 0 END) AS direct_reports
FROM chain AS c
JOIN employees AS m ON m.id = c.manager_id
JOIN employees AS e ON e.id = c.employee_id
GROUP BY m.id, m.name
ORDER BY total_reports DESC, manager;`,
      },
      {
        label: `PostgreSQL plan: each iteration uses the index on manager_id`,
        code: `SET enable_seqscan = off;
EXPLAIN (COSTS OFF)
WITH RECURSIVE reports(id, name, level) AS (
  SELECT id, name, 1 FROM employees WHERE manager_id = 2
  UNION ALL
  SELECT e.id, e.name, r.level + 1
  FROM employees AS e
  JOIN reports AS r ON e.manager_id = r.id
)
SELECT name, level FROM reports;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `Recursive CTE with cycle detection — how do you handle circular manager references and produce a search order?`,
    difficulty: "hard",
    seoDescription: `Stop a recursive CTE looping on circular manager data with a visited path or the PostgreSQL CYCLE clause, and order it depth-first or breadth-first.`,
    description: `**Question presented to candidate:**
"A bad data import left three managers reporting to each other in a circle, and now our org-chart query never finishes. How do you make a recursive CTE safe against cycles, how do you find the people caught in the loop, and how do you control whether the result comes out depth-first or breadth-first?"

**What a strong answer should cover:**
- Why it loops: with \`UNION ALL\` every iteration finds rows again, the working table never becomes empty, and PostgreSQL and SQLite have no built-in recursion limit
- Portable cycle detection: carry the visited path (a delimited string, or an array in PostgreSQL), flag a row whose id is already in the path, and stop expanding flagged rows
- PostgreSQL 14+ \`CYCLE id SET is_cycle USING path\`, which generates that bookkeeping for you, and \`SEARCH DEPTH FIRST\` / \`SEARCH BREADTH FIRST BY ... SET ordercol\` for the output order
- Cheaper partial defences: \`UNION\` (stops only when whole rows repeat) and a depth guard (bounds the work but returns repeated rows)
- A data-quality query that lists the employees who are on a loop, and preventing it at write time
- Search order: breadth-first = order by depth; depth-first = order by the path; SQLite can also pick the queue order with \`ORDER BY\` inside the recursive member

**Clarifying questions expected:**
- Do you want the query to tolerate the bad rows and still return everything reachable, or to report them?
- Which order does the consumer need: level by level, or each manager followed by their whole team?

**Code / implementation expected:** Yes — a recursive walk with path-based cycle detection, plus the PostgreSQL \`CYCLE\` / \`SEARCH\` clauses or an equivalent ordering.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  manager_id INTEGER REFERENCES employees(id)
);
INSERT INTO employees (id, name, manager_id) VALUES
  (1, 'Ana', NULL),
  (2, 'Ben', 1),
  (3, 'Cara', 1),
  (4, 'Dev', 2),
  (5, 'Eve', 2),
  (6, 'Fay', 3),
  (7, 'Kim', 9),
  (8, 'Leo', 7),
  (9, 'Mia', 8),
  (10, 'Ned', 8);
\`\`\``,
    answer: `**Target Audience:** Developers who can write a recursive CTE and now need it to survive bad data; candidates asked the "what if the hierarchy has a loop?" follow-up.
**Difficulty:** Hard
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15, both run for this page. The \`CYCLE\` and \`SEARCH\` clauses are PostgreSQL 14 and later.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and error below was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

You are following signs to a museum. Each sign points to the next one. After a while you notice the café on the corner: you have passed it before. Someone has turned a sign around, and you are walking in a circle. Without noticing the café you would walk forever.

A recursive CTE follows \`manager_id\` pointers the same way, and it has no eyes of its own. If a reorg import makes Kim manage Leo, Leo manage Mia, and Mia manage Kim, a walk down from Kim keeps returning to Kim. The fix is to give the query a memory of where it has been, the café, and to stop when it sees a place twice. That memory is the **path**. The order in which you visit places, whole street first or one branch to the end first, is the **search order**, the second half of this question.

The mechanics of recursive CTEs are in [How do recursive CTEs work?](/interview-question/how-do-recursive-ctes-work) and the plain org-chart walk is in [Recursive CTE for an org chart — how do you list all reports (direct + indirect) of a manager?](/interview-question/recursive-cte-for-an-org-chart-how-do-you-list-all-reports-direct-indirect-of-a-). This page is about making them safe and ordered.

## 2. The Broken Data

The schema has a healthy tree (Ana, Ben, Cara, Dev, Eve, Fay) and a damaged part:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="Kim manages Leo, Leo manages Mia and Ned, and Mia manages Kim, which closes a loop of three people; Ned hangs off the loop">
  <defs>
    <marker id="sql09q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="300" y="30" width="140" height="44" rx="8"/>
  <text class="d-text" x="370" y="57" text-anchor="middle">Kim (7)</text>
  <rect class="d-box-accent" x="520" y="200" width="140" height="44" rx="8"/>
  <text class="d-text" x="590" y="227" text-anchor="middle">Leo (8)</text>
  <rect class="d-box-accent" x="80" y="200" width="140" height="44" rx="8"/>
  <text class="d-text" x="150" y="227" text-anchor="middle">Mia (9)</text>
  <rect class="d-box-muted" x="560" y="30" width="140" height="44" rx="8"/>
  <text class="d-text" x="630" y="57" text-anchor="middle">Ned (10)</text>
  <path class="d-edge-accent" d="M 420 76 L 560 196" marker-end="url(#sql09q3-arrow)"/>
  <text class="d-sub" x="540" y="125" text-anchor="middle">manages</text>
  <path class="d-edge-accent" d="M 516 222 L 226 222" marker-end="url(#sql09q3-arrow)"/>
  <text class="d-sub" x="370" y="250" text-anchor="middle">manages</text>
  <path class="d-edge-accent" d="M 180 196 L 320 76" marker-end="url(#sql09q3-arrow)"/>
  <text class="d-sub" x="200" y="125" text-anchor="middle">manages</text>
  <path class="d-edge" d="M 610 196 L 630 78" marker-end="url(#sql09q3-arrow)"/>
</svg>

Kim, Leo and Mia manage each other in a circle; Ned reports to Leo, so he is not on the loop but is reachable from it. Notice that no one outside the loop manages anyone inside it: in a table where each person has at most one manager, a loop is always its own island, reachable from below (walking up from Ned) or from inside (walking down from Kim).

📌 **Interview term: cycle** — a chain of pointers that returns to where it started (7 → 8 → 9 → 7). A hierarchy with a cycle is no longer a tree but a graph.

### What happens without protection

The plain walk down from Kim never reaches an empty iteration. On PostgreSQL 16, with \`SET statement_timeout = '2s'\`, the query \`WITH RECURSIVE walk(id, depth) AS (... UNION ALL ...) SELECT count(*) FROM walk;\` ended with:

~~~text
ERROR:  canceling statement due to statement timeout
~~~

Without the timeout it would have kept going, since neither PostgreSQL nor SQLite has a recursion limit. SQL Server would stop at its default \`MAXRECURSION\` of 100 and MySQL at \`cte_max_recursion_depth\` 1000 ([MSSQLTips](https://www.mssqltips.com/sqlservertip/5111/fix-sql-server-cte-maximum-recursion-exhausted-error/), [MySQL worklog 10972](https://dev.mysql.com/worklog/task/?id=10972)); those are errors, not answers.

## 3. Cheap Defences and Why They Are Not Enough

**\`UNION\` instead of \`UNION ALL\`.** If the CTE carries only the id, a repeated person is a duplicate row, \`UNION\` throws it away, and the iteration becomes empty:

~~~sql
WITH RECURSIVE r(id) AS (
  SELECT 7
  UNION
  SELECT e.id FROM employees AS e JOIN r ON e.manager_id = r.id
)
SELECT e.name FROM r JOIN employees AS e ON e.id = r.id ORDER BY e.name;
~~~

~~~text
name
Kim
Leo
Mia
Ned
~~~

Correct, and it stops. But the moment you add \`depth\` or a path, every row differs from every earlier row and \`UNION\` removes nothing.

**A depth guard.** \`WHERE w.depth < 5\` in the recursive member guarantees the query ends:

~~~sql
WITH RECURSIVE walk(id, name, depth) AS (
  SELECT id, name, 0 FROM employees WHERE id = 7
  UNION ALL
  SELECT e.id, e.name, w.depth + 1
  FROM employees AS e
  JOIN walk AS w ON e.manager_id = w.id
  WHERE w.depth < 5                     -- depth guard
)
SELECT depth, group_concat(name, ', ') AS names
FROM walk
GROUP BY depth
ORDER BY depth;
~~~

~~~text
depth | names
0 | Kim
1 | Leo
2 | Mia, Ned
3 | Kim
4 | Leo
5 | Mia, Ned
~~~

It terminates, but the result is wrong: Kim, Leo, Mia and Ned each appear twice. A depth guard bounds the damage; it does not detect the cycle.

📌 **Interview term: depth guard** — a maximum depth in the recursive member. A safety net, not cycle detection; choose a limit far above the real depth of the hierarchy.

## 4. Real Cycle Detection: Carry the Path

Give every row the list of ids visited on the way to it. Before expanding a row, check whether its id is already in that list.

~~~sql
WITH RECURSIVE walk(id, name, depth, path, is_cycle) AS (
  SELECT id, name, 0, ',' || id || ',', 0
  FROM employees
  WHERE id = 7                                   -- start at Kim
  UNION ALL
  SELECT e.id, e.name, w.depth + 1,
         w.path || e.id || ',',
         CASE WHEN w.path LIKE '%,' || e.id || ',%' THEN 1 ELSE 0 END
  FROM employees AS e
  JOIN walk AS w ON e.manager_id = w.id
  WHERE w.is_cycle = 0                           -- do not expand a repeated row
)
SELECT name, depth, path, is_cycle
FROM walk
ORDER BY depth, name;
~~~

~~~text
name | depth | path | is_cycle
Kim | 0 | ,7, | 0
Leo | 1 | ,7,8, | 0
Mia | 2 | ,7,8,9, | 0
Ned | 2 | ,7,8,10, | 0
Kim | 3 | ,7,8,9,7, | 1
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 760 170" role="img" aria-label="The path check: the walk carries the ids it has visited; when the next id is already in the path the row is flagged as a cycle and not expanded">
  <defs>
    <marker id="sql09q3-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="50" width="150" height="70" rx="8"/>
  <text class="d-text" x="95" y="80" text-anchor="middle">,7,</text>
  <text class="d-sub" x="95" y="104" text-anchor="middle">Kim</text>
  <rect class="d-box" x="210" y="50" width="150" height="70" rx="8"/>
  <text class="d-text" x="285" y="80" text-anchor="middle">,7,8,</text>
  <text class="d-sub" x="285" y="104" text-anchor="middle">Leo</text>
  <rect class="d-box" x="400" y="50" width="150" height="70" rx="8"/>
  <text class="d-text" x="475" y="80" text-anchor="middle">,7,8,9,</text>
  <text class="d-sub" x="475" y="104" text-anchor="middle">Mia</text>
  <rect class="d-box-accent" x="590" y="50" width="150" height="70" rx="8"/>
  <text class="d-text" x="665" y="80" text-anchor="middle">7 already in path</text>
  <text class="d-sub" x="665" y="104" text-anchor="middle">is_cycle = 1, stop</text>
  <path class="d-edge" d="M 172 85 L 204 85" marker-end="url(#sql09q3-arrow2)"/>
  <path class="d-edge" d="M 362 85 L 394 85" marker-end="url(#sql09q3-arrow2)"/>
  <path class="d-edge-accent" d="M 552 85 L 584 85" marker-end="url(#sql09q3-arrow2)"/>
</svg>

How it works:

- The path starts as \`,7,\` and every step appends \`id,\`. The commas on both sides make the check exact: \`LIKE '%,7,%'\` matches 7 but not 17 or 70.
- When the walk reaches Kim again, \`,7,\` is already in \`,7,8,9,\`, so that row is marked \`is_cycle = 1\`.
- \`WHERE w.is_cycle = 0\` means a marked row is never expanded, so the next iteration is empty and the recursion stops. Every real person appears exactly once, plus one marker row showing where the loop closed. Add \`WHERE is_cycle = 0\` in the outer query to drop it.

This version ran with the same rows on SQLite and PostgreSQL, because it uses only \`||\`, \`LIKE\` and \`CASE\`.

📌 **Interview term: visited path** — a column carrying the keys already visited on the way to the current row. Membership in it is the cycle test. It also gives you depth-first ordering for free (section 6).

📌 **Interview term: cycle mark** — a flag column set on the row that would revisit a key. Rows with the mark are output but not expanded.

**In PostgreSQL, use an array** instead of a string: \`ARRAY[id]\` in the anchor, \`w.path || e.id\` in the recursive member, and the test \`e.id <> ALL (w.path)\` in its WHERE. That version drops the repeat row instead of marking it:

~~~sql
WITH RECURSIVE walk(id, name, depth, path) AS (
  SELECT id, name, 0, ARRAY[id] FROM employees WHERE id = 7
  UNION ALL
  SELECT e.id, e.name, w.depth + 1, w.path || e.id
  FROM employees AS e
  JOIN walk AS w ON e.manager_id = w.id
  WHERE e.id <> ALL (w.path)
)
SELECT name, depth, path FROM walk ORDER BY depth, name;
~~~

~~~text
name | depth | path
Kim | 0 | {7}
Leo | 1 | {7,8}
Mia | 2 | {7,8,9}
Ned | 2 | {7,8,10}
~~~

It needs no PostgreSQL 14 features, so it is the version to use on older servers.

## 5. PostgreSQL 14+: the CYCLE Clause

PostgreSQL 14 added the SQL-standard \`SEARCH\` and \`CYCLE\` clauses for recursive queries ([PostgreSQL 14 release announcement](https://www.postgresql.org/about/news/postgresql-14-released-2318/)). \`CYCLE\` writes the path bookkeeping for you:

~~~sql
WITH RECURSIVE walk(id, name, depth) AS (
  SELECT id, name, 0 FROM employees WHERE id = 7
  UNION ALL
  SELECT e.id, e.name, w.depth + 1
  FROM employees AS e
  JOIN walk AS w ON e.manager_id = w.id
) CYCLE id SET is_cycle USING path
SELECT name, depth, is_cycle, path
FROM walk
ORDER BY depth, name;
~~~

~~~text
name | depth | is_cycle | path
Kim | 0 | f | {(7)}
Leo | 1 | f | {(7),(8)}
Mia | 2 | f | {(7),(8),(9)}
Ned | 2 | f | {(7),(8),(10)}
Kim | 3 | t | {(7),(8),(9),(7)}
~~~

Same five rows as the hand-written version: the marker row has \`is_cycle = t\`, and \`path\` is an array of row values (\`{(7),(8),(9),(7)}\`). \`CYCLE id\` names the column(s) that identify a node; you can list several (\`CYCLE a, b\`). The two generated columns are added to the CTE output, and according to the commit that added the feature the clause is rewritten into ordinary recursive SQL by the query rewriter, so expect it to cost about the same as section 4 ([depesz, Waiting for PostgreSQL 14 – SEARCH and CYCLE clauses](https://depesz.com/tag/cycle)).

📌 **Interview term: CYCLE clause** — \`CYCLE col SET mark_col USING path_col\` after a recursive CTE: PostgreSQL 14+ (standard SQL) tracks visited \`col\` values and marks the row that closes a loop.

## 6. Search Order: Depth-First vs Breadth-First

A recursive CTE produces rows in no guaranteed order, so the order of the result is entirely up to the outer \`ORDER BY\`. The two orders people want:

| Order | Means | How to get it |
| :--- | :--- | :--- |
| Breadth-first | all of level 0, then all of level 1, then level 2 | \`ORDER BY depth, name\`, or \`SEARCH BREADTH FIRST BY name SET ord\` |
| Depth-first | each person followed by their whole team, like an indented chart | \`ORDER BY path\` (keys must sort correctly), or \`SEARCH DEPTH FIRST BY name SET ord\` |

📌 **Interview term: depth-first vs breadth-first search order** — depth-first follows one branch to the bottom before the next (Ana, Ben, Dev, Eve, Cara, Fay); breadth-first finishes each level first (Ana, Ben, Cara, Dev, Eve, Fay).

PostgreSQL 14+ builds the sort column with \`SEARCH\`:

~~~sql
WITH RECURSIVE tree(id, name, depth) AS (
  SELECT id, name, 0 FROM employees WHERE id = 1
  UNION ALL
  SELECT e.id, e.name, t.depth + 1
  FROM employees AS e
  JOIN tree AS t ON e.manager_id = t.id
) SEARCH DEPTH FIRST BY name SET dfs_order
SELECT name, depth, dfs_order
FROM tree
ORDER BY dfs_order;
~~~

~~~text
name | depth | dfs_order
Ana | 0 | {(Ana)}
Ben | 1 | {(Ana),(Ben)}
Dev | 2 | {(Ana),(Ben),(Dev)}
Eve | 2 | {(Ana),(Ben),(Eve)}
Cara | 1 | {(Ana),(Cara)}
Fay | 2 | {(Ana),(Cara),(Fay)}
~~~

\`dfs_order\` is an array of the \`BY\` values along the path, which sorts parents before children. \`SEARCH BREADTH FIRST BY name SET bfs_order\` instead produced a \`(depth, name)\` record per row:

~~~text
name | depth | bfs_order
Ana | 0 | (0,Ana)
Ben | 1 | (1,Ben)
Cara | 1 | (1,Cara)
Dev | 2 | (2,Dev)
Eve | 2 | (2,Eve)
Fay | 2 | (2,Fay)
~~~

📌 **Interview term: SEARCH clause** — \`SEARCH { DEPTH | BREADTH } FIRST BY col SET ordercol\` after a recursive CTE (PostgreSQL 14+): adds a column whose sort order is depth-first or breadth-first. You still have to \`ORDER BY\` it.

Without PostgreSQL 14, sort by a path you build yourself. With a name path that is \`ORDER BY path\` as in the org-chart question; with numeric ids, pad them (\`lpad(id::text, 6, '0')\` in PostgreSQL) so that 10 does not sort before 9.

**SQLite has its own trick:** an \`ORDER BY\` *inside* the recursive member decides which queued row is processed next. Ordering by depth descending makes it depth-first:

~~~sql
WITH RECURSIVE tree(id, name, depth) AS (
  SELECT id, name, 0 FROM employees WHERE id = 1
  UNION ALL
  SELECT e.id, e.name, t.depth + 1
  FROM employees AS e
  JOIN tree AS t ON e.manager_id = t.id
  ORDER BY 3 DESC, 2 ASC     -- SQLite only: deepest queued row first
)
SELECT name, depth FROM tree;
~~~

~~~text
name | depth
Ana | 0
Ben | 1
Dev | 2
Eve | 2
Cara | 1
Fay | 2
~~~

PostgreSQL rejects this (\`ORDER BY in a recursive query is not implemented\`), so treat it as SQLite-specific.

## 7. Finding Everyone on a Loop

Detection keeps queries alive; the data is still wrong. To report it, start a walk *upward* from every employee and look for walks that come back to their own start:

~~~sql
WITH RECURSIVE up(start_id, id, manager_id, path, is_cycle) AS (
  SELECT id, id, manager_id, ',' || id || ',', 0
  FROM employees
  UNION ALL
  SELECT u.start_id, m.id, m.manager_id,
         u.path || m.id || ',',
         CASE WHEN u.path LIKE '%,' || m.id || ',%' THEN 1 ELSE 0 END
  FROM employees AS m
  JOIN up AS u ON m.id = u.manager_id
  WHERE u.is_cycle = 0
)
SELECT e.name, u.path AS loop_path
FROM up AS u
JOIN employees AS e ON e.id = u.start_id
WHERE u.is_cycle = 1 AND u.id = u.start_id     -- came back to where it started
ORDER BY e.name;
~~~

~~~text
name | loop_path
Kim | ,7,9,8,7,
Leo | ,8,7,9,8,
Mia | ,9,8,7,9,
~~~

Ned's upward walk also hits a repeat (Leo, Kim, Mia, Leo), but the repeated id is Leo, not Ned, so \`u.id = u.start_id\` excludes him: he is not on the loop, he only reports into it. Fix the three rows, then prevent recurrence at write time: a \`CHECK (manager_id <> id)\` only stops the one-person loop, so a longer loop needs a check in the application or a trigger that runs this walk for the changed row (see [What is a database trigger?](/interview-question/what-is-a-database-trigger)).

## 8. Verified: Running the Code

The four examples were run by the project verifier: the first two on sql.js 1.10.2 (SQLite 3.45.0) seeded with the schema above, the last two on PostgreSQL 16.15 in a scratch database seeded with the same schema. The path-based walk from Kim:

~~~text
name | depth | path | is_cycle
Kim | 0 | ,7, | 0
Leo | 1 | ,7,8, | 0
Mia | 2 | ,7,8,9, | 0
Ned | 2 | ,7,8,10, | 0
Kim | 3 | ,7,8,9,7, | 1
~~~

The loop report:

~~~text
name | loop_path
Kim | ,7,9,8,7,
Leo | ,8,7,9,8,
Mia | ,9,8,7,9,
~~~

The \`CYCLE\` clause:

~~~text
name | depth | is_cycle | path
Kim | 0 | f | {(7)}
Leo | 1 | f | {(7),(8)}
Mia | 2 | f | {(7),(8),(9)}
Ned | 2 | f | {(7),(8),(10)}
Kim | 3 | t | {(7),(8),(9),(7)}
~~~

\`SEARCH DEPTH FIRST\`:

~~~text
name | depth | dfs_order
Ana | 0 | {(Ana)}
Ben | 1 | {(Ana),(Ben)}
Dev | 2 | {(Ana),(Ben),(Dev)}
Eve | 2 | {(Ana),(Ben),(Eve)}
Cara | 1 | {(Ana),(Cara)}
Fay | 2 | {(Ana),(Cara),(Fay)}
~~~

The \`UNION\`, depth-guard and SQLite queue-order queries in the prose ran on sql.js 1.10.2 (the first two also on PostgreSQL 16.15 with the same rows; the depth guard uses \`string_agg\` there); the array version, \`SEARCH BREADTH FIRST\`, the statement timeout and the \`ORDER BY\` rejection were run on PostgreSQL 16.15.

## Common Pitfalls

- **Relying on \`UNION\` while carrying depth or path.** Every row is distinct, so nothing is removed and the loop continues.
- **Checking the path without delimiters.** \`path LIKE '%7%'\` also matches 17 and 70. Wrap every id in delimiters (\`,7,\`) or use an array.
- **Marking but still expanding.** Setting \`is_cycle\` is not enough; the recursive member must also have \`WHERE w.is_cycle = 0\` (the \`CYCLE\` clause does this for you).
- **Treating a depth guard as detection.** It returns duplicated people up to the limit; use it only as a backstop.
- **Forgetting the outer ORDER BY.** \`SEARCH\` only adds a column; without \`ORDER BY dfs_order\` the output order is still unspecified.
- **Expecting SQLite tricks on PostgreSQL.** \`ORDER BY\` inside the recursive member works in SQLite only; the \`CYCLE\`/\`SEARCH\` clauses need PostgreSQL 14+ and were rejected by SQLite 3.45.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Why it hangs:</strong> <span style="color:#f0e2c8;">A recursive CTE stops only when an iteration returns no rows. With a loop like Kim, Leo, Mia, Kim and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION ALL</code>, every iteration finds the same people again, and PostgreSQL and SQLite have no recursion limit, so it runs until a timeout.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Portable fix:</strong> <span style="color:#f0e2c8;">Carry the visited ids in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path</code> column. In the recursive member, flag the row when its id is already in the path, and add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE w.is_cycle = 0</code> so flagged rows are not expanded. That works on any engine with string concatenation and LIKE.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. PostgreSQL 14+:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CYCLE id SET is_cycle USING path</code> adds exactly those two columns for you; the path is an array of row values. Filter <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE NOT is_cycle</code> in the outer query if you do not want the marker row.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Search order:</strong> <span style="color:#f0e2c8;">Breadth-first is ordering by depth. Depth-first is ordering by the path. PostgreSQL 14 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SEARCH DEPTH FIRST BY name SET ord</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SEARCH BREADTH FIRST</code> builds the sort column for you.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Root cause:</strong> <span style="color:#f0e2c8;">Detection keeps the query alive, but the data is still wrong. I would run a check that lists everyone on a loop, fix the rows, and stop new loops at write time, for example with a trigger or in the application.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">UNION</code> instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">UNION ALL</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION</code> discards rows that already exist, so it does stop a loop, but only when the whole row repeats. As soon as you carry <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">depth</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path</code>, each row is new and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION</code> deduplicates nothing. With only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">id</code> carried, it returned Kim, Leo, Mia and Ned and stopped.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a depth guard enough?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It guarantees termination, but it does not detect anything: with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE depth &lt; 5</code> the walk from Kim returned Kim again at depth 3 and Leo at depth 4. Use it as a backstop on top of cycle detection, with a limit well above the real depth.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the CYCLE clause generate?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A boolean column that is true on the row that closes the loop and an array of the visited key values; that row is emitted once and not expanded. According to the commit that added it, the clause is rewritten into ordinary recursive SQL, so expect it to cost about the same as the manual version.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is the path check expensive?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It grows with depth: each row carries its whole path, and checking membership is linear in its length. For org charts (depth in the tens) it is negligible; for deep graphs keep the path short (ids, not names) and index the join column.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the row with is_cycle true included?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">So you can see where the loop closed. In the run from Kim the walk returned the four real rows plus Kim at depth 3 marked true; add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE NOT is_cycle</code> (or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is_cycle = 0</code>) in the outer query to drop it.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Cycle | A chain of pointers that leads back to its start |
| Depth guard | A maximum depth in the recursive member; stops the query but does not detect cycles |
| Visited path | Column carrying the keys already visited, used for the cycle test and for ordering |
| Cycle mark | Flag on the row that would revisit a key; such rows are not expanded |
| CYCLE clause | PostgreSQL 14+ \`CYCLE col SET mark USING path\`, automatic cycle detection |
| SEARCH clause | PostgreSQL 14+ \`SEARCH DEPTH/BREADTH FIRST BY col SET ord\`, a ready-made sort column |
| Depth-first vs breadth-first | One branch to the bottom first vs one whole level at a time |

**Conclusion:** A recursive CTE stops only when an iteration finds nothing, so a management loop makes a \`UNION ALL\` walk run forever on PostgreSQL and SQLite. \`UNION\` helps only while rows repeat exactly, and a depth guard only bounds the damage. Real detection carries the visited path, marks the row whose key is already in it, and stops expanding marked rows: portable with a delimited string, cleaner with an array, and generated for you by PostgreSQL 14's \`CYCLE\` clause. The same path gives you depth-first order, \`depth\` gives breadth-first, and \`SEARCH\` packages both. Then run the loop report and fix the data, because detection hides the symptom, not the cause.`,
    examples: [
      {
        label: `Portable cycle detection: carry the visited path and stop at a repeated id`,
        code: `WITH RECURSIVE walk(id, name, depth, path, is_cycle) AS (
  SELECT id, name, 0, ',' || id || ',', 0
  FROM employees
  WHERE id = 7                                   -- start at Kim
  UNION ALL
  SELECT e.id, e.name, w.depth + 1,
         w.path || e.id || ',',
         CASE WHEN w.path LIKE '%,' || e.id || ',%' THEN 1 ELSE 0 END
  FROM employees AS e
  JOIN walk AS w ON e.manager_id = w.id
  WHERE w.is_cycle = 0                           -- do not expand a repeated row
)
SELECT name, depth, path, is_cycle
FROM walk
ORDER BY depth, name;`,
      },
      {
        label: `Data-quality check: which employees sit on a management loop?`,
        code: `WITH RECURSIVE up(start_id, id, manager_id, path, is_cycle) AS (
  SELECT id, id, manager_id, ',' || id || ',', 0
  FROM employees
  UNION ALL
  SELECT u.start_id, m.id, m.manager_id,
         u.path || m.id || ',',
         CASE WHEN u.path LIKE '%,' || m.id || ',%' THEN 1 ELSE 0 END
  FROM employees AS m
  JOIN up AS u ON m.id = u.manager_id
  WHERE u.is_cycle = 0
)
SELECT e.name, u.path AS loop_path
FROM up AS u
JOIN employees AS e ON e.id = u.start_id
WHERE u.is_cycle = 1 AND u.id = u.start_id     -- came back to where it started
ORDER BY e.name;`,
      },
      {
        label: `PostgreSQL 14+: the CYCLE clause does the bookkeeping`,
        code: `WITH RECURSIVE walk(id, name, depth) AS (
  SELECT id, name, 0 FROM employees WHERE id = 7
  UNION ALL
  SELECT e.id, e.name, w.depth + 1
  FROM employees AS e
  JOIN walk AS w ON e.manager_id = w.id
) CYCLE id SET is_cycle USING path
SELECT name, depth, is_cycle, path
FROM walk
ORDER BY depth, name;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL 14+: SEARCH DEPTH FIRST for a tree-ordered result`,
        code: `WITH RECURSIVE tree(id, name, depth) AS (
  SELECT id, name, 0 FROM employees WHERE id = 1
  UNION ALL
  SELECT e.id, e.name, t.depth + 1
  FROM employees AS e
  JOIN tree AS t ON e.manager_id = t.id
) SEARCH DEPTH FIRST BY name SET dfs_order
SELECT name, depth, dfs_order
FROM tree
ORDER BY dfs_order;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `What is a LATERAL join?`,
    difficulty: "hard",
    seoDescription: `LATERAL lets a FROM subquery reference earlier tables and run per row: latest order per customer, LEFT JOIN LATERAL ON true, plans, and engine support.`,
    description: `**Question presented to candidate:**
"What does the LATERAL keyword do in a FROM clause? Show me a query that needs it, and tell me how it differs from a normal join to a subquery."

**What a strong answer should cover:**
- A normal derived table in FROM cannot reference other tables of the same FROM clause; \`LATERAL\` lets it reference items to its left
- Semantics: the lateral subquery is evaluated once per row of the left side, like a correlated subquery that can return many rows and many columns
- \`CROSS JOIN LATERAL\` drops left rows with no result; \`LEFT JOIN LATERAL ... ON true\` keeps them with NULLs
- Typical uses: top-N / latest-row per group with \`ORDER BY ... LIMIT\`, several columns from one lookup, reusing a computed expression, set-returning functions (implicitly lateral)
- Plans: usually a Nested Loop that runs the inner side once per outer row, fast when an index serves the inner lookup
- Engine support: PostgreSQL and MySQL 8.0.14+ spell it \`LATERAL\`, SQL Server uses \`CROSS APPLY\` / \`OUTER APPLY\`, SQLite has no \`LATERAL\`

**Code / implementation expected:** Yes — a LATERAL subquery that returns each customer's latest order, and the LEFT JOIN LATERAL variant.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL
);
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  ordered_at TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL
);
CREATE INDEX orders_customer_date_idx ON orders (customer_id, ordered_at);
INSERT INTO customers (id, name, city) VALUES
  (1, 'Asha', 'Pune'),
  (2, 'Ben', 'Leeds'),
  (3, 'Chen', 'Austin'),
  (4, 'Dara', 'Oslo');
INSERT INTO orders (id, customer_id, ordered_at, amount) VALUES
  (101, 1, '2025-01-05', 120.00),
  (102, 1, '2025-02-11', 45.50),
  (103, 1, '2025-03-02', 300.00),
  (104, 2, '2025-01-20', 80.00),
  (105, 2, '2025-03-15', 60.00),
  (106, 3, '2025-02-28', 210.00),
  (107, 1, '2025-03-20', 15.00),
  (108, 3, '2025-03-01', 95.00);
\`\`\``,
    answer: `**Target Audience:** Developers comfortable with joins and subqueries who meet \`LATERAL\` in PostgreSQL code; candidates who need the precise definition and its uses.
**Difficulty:** Hard
**Engines:** PostgreSQL 16.15 (all LATERAL examples were run there), SQLite 3.45.0 via sql.js 1.10.2 for the runnable SQLite equivalent. MySQL and SQL Server facts are cited, not run.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result, plan and error message below was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

You run a small shop and keep two binders: one of customers, one of orders. Your manager asks for *"each customer with their latest order"*.

You could photocopy the whole order binder, sort it, and then try to match pages back to customers. But what you would naturally do is this: open the customer binder, and **for each customer**, flip through the orders binder for that customer, take the newest page, and staple it to the customer card. Next customer, same thing.

That "for each row on the left, run a little query using that row" is exactly what \`LATERAL\` adds to SQL. Without it, every subquery in the FROM clause is computed once, blind to the other tables, like the photocopy. With it, the subquery can look at the current customer.

## 2. The Problem LATERAL Solves

A subquery in the FROM clause is called a derived table. It is computed as if it stood alone, so it cannot mention another table of the same FROM clause. Try to filter it by the current customer:

~~~sql
SELECT c.name, o.id
FROM customers AS c
JOIN (SELECT id, customer_id FROM orders WHERE orders.customer_id = c.id LIMIT 1) AS o ON true;
~~~

PostgreSQL 16 refuses, and the hint tells you the answer:

~~~text
ERROR:  invalid reference to FROM-clause entry for table "c"
DETAIL:  There is an entry for table "c", but it cannot be referenced from this part of the query.
HINT:  To reference that table, you must mark this subquery with LATERAL.
~~~

📌 **Interview term: derived table** — a subquery in FROM with an alias, used like a table. On its own it is not correlated: it cannot see sibling FROM items.

📌 **Interview term: LATERAL** — a keyword before a FROM-clause subquery (or function call) that allows it to reference columns of FROM items that appear **before** it. Logically, it is evaluated once for each row of those items.

## 3. The Canonical Example: Latest Order per Customer

~~~sql
SELECT c.name, o.id AS order_id, o.ordered_at, o.amount
FROM customers AS c
CROSS JOIN LATERAL (
  SELECT id, ordered_at, amount
  FROM orders
  WHERE orders.customer_id = c.id      -- refers to c, defined to the left
  ORDER BY ordered_at DESC
  LIMIT 1
) AS o
ORDER BY c.name;
~~~

~~~text
name | order_id | ordered_at | amount
Asha | 107 | 2025-03-20 | 15.00
Ben | 105 | 2025-03-15 | 60.00
Chen | 108 | 2025-03-01 | 95.00
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 760 290" role="img" aria-label="LATERAL: for each customer row on the left, the subquery on the right runs with that customer id and returns its own rows, which are joined to that customer">
  <defs>
    <marker id="sql09q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="220" height="230" rx="8"/>
  <text class="d-text" x="130" y="60" text-anchor="middle">customers c</text>
  <rect class="d-box-accent" x="45" y="80" width="170" height="38" rx="6"/>
  <text class="d-text" x="130" y="104" text-anchor="middle">Asha, id 1</text>
  <rect class="d-box-muted" x="45" y="134" width="170" height="38" rx="6"/>
  <text class="d-text" x="130" y="158" text-anchor="middle">Ben, id 2</text>
  <rect class="d-box-muted" x="45" y="188" width="170" height="38" rx="6"/>
  <text class="d-text" x="130" y="212" text-anchor="middle">Chen, id 3</text>
  <rect class="d-box-accent" x="470" y="50" width="270" height="130" rx="8"/>
  <text class="d-text" x="605" y="85" text-anchor="middle">LATERAL subquery</text>
  <text class="d-sub" x="605" y="112" text-anchor="middle">WHERE customer_id = c.id</text>
  <text class="d-sub" x="605" y="138" text-anchor="middle">ORDER BY ordered_at DESC</text>
  <text class="d-sub" x="605" y="162" text-anchor="middle">LIMIT 1</text>
  <path class="d-edge-accent" d="M 217 99 L 464 99" marker-end="url(#sql09q4-arrow)"/>
  <text class="d-accent" x="340" y="86" text-anchor="middle">c.id = 1</text>
  <path class="d-edge-dashed" d="M 464 150 L 217 150" marker-end="url(#sql09q4-arrow)"/>
  <text class="d-sub" x="340" y="174" text-anchor="middle">order 107</text>
  <rect class="d-box-muted" x="470" y="215" width="270" height="45" rx="8"/>
  <text class="d-text" x="605" y="243" text-anchor="middle">runs again for Ben, Chen</text>
</svg>

For every customer row, PostgreSQL plugs that row's \`c.id\` into the subquery, runs it, and joins whatever comes back to that customer. Three things are worth noticing:

- The subquery returns **several columns** (id, date, amount) from the same row. A scalar subquery in the SELECT list could return only one.
- It can use **ORDER BY and LIMIT** per customer. That is what makes "latest", "top 3" and "nearest" queries natural; the top-N version is [LATERAL JOIN — how do you fetch the top 3 orders per customer efficiently?](/interview-question/lateral-join-how-do-you-fetch-the-top-3-orders-per-customer-efficiently).
- **Dara is missing.** She has no orders, the subquery returned no rows for her, and a cross join with zero rows produces nothing.

📌 **Interview term: CROSS JOIN LATERAL** — pairs each left row with every row its lateral subquery returns; a left row whose subquery returns nothing disappears. \`FROM a, LATERAL (...)\` with a comma means the same.

## 4. Keeping Rows With No Match: LEFT JOIN LATERAL ... ON true

~~~sql
SELECT c.name, o.order_id, o.ordered_at, o.amount
FROM customers AS c
LEFT JOIN LATERAL (
  SELECT id AS order_id, ordered_at, amount
  FROM orders
  WHERE orders.customer_id = c.id
  ORDER BY ordered_at DESC
  LIMIT 1
) AS o ON true
ORDER BY c.name;
~~~

~~~text
name | order_id | ordered_at | amount
Asha | 107 | 2025-03-20 | 15.00
Ben | 105 | 2025-03-15 | 60.00
Chen | 108 | 2025-03-01 | 95.00
Dara | NULL | NULL | NULL
~~~

The join condition already lives inside the subquery, but a LEFT JOIN requires an ON clause, so you write \`ON true\`. Dara now appears with NULLs, exactly like a normal LEFT JOIN with no match.

📌 **Interview term: LEFT JOIN LATERAL ... ON true** — the outer-join form: keeps every left row, filling the lateral columns with NULL when the subquery returns nothing.

## 5. How It Runs: a Nested Loop

~~~sql
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT c.name, o.amount
FROM customers AS c
CROSS JOIN LATERAL (
  SELECT amount FROM orders
  WHERE orders.customer_id = c.id
  ORDER BY ordered_at DESC
  LIMIT 1
) AS o;
~~~

~~~text
QUERY PLAN
Nested Loop (actual rows=3 loops=1)
  ->  Seq Scan on customers c (actual rows=4 loops=1)
  ->  Limit (actual rows=1 loops=4)
        ->  Index Scan Backward using orders_customer_date_idx on orders (actual rows=1 loops=4)
              Index Cond: (customer_id = c.id)
~~~

Read it from the top: a \`Nested Loop\` takes the 4 customers from the outer \`Seq Scan\`, and for each one (\`loops=4\`) runs the inner \`Limit\`. The inner side walks the index \`orders_customer_date_idx (customer_id, ordered_at)\` **backwards** from the newest entry for that customer and stops after one row. \`actual rows=3\` at the top: Dara produced nothing. The planner may choose a different plan on other data, but this shape (per-row index probe plus LIMIT) is the reason LATERAL is fast for latest-row and top-N queries. See [How do you read an EXPLAIN query plan?](/interview-question/how-do-you-read-an-explain-query-plan).

📌 **Interview term: nested loop join** — for each outer row, run the inner side once. With an index on the inner lookup, each iteration is a short index scan; without one, each is a full scan, which is how a LATERAL query on a big table becomes slow.

## 6. Other Uses

**Several aggregates from one lookup.** One lateral subquery can compute a whole row of figures per customer:

~~~sql
SELECT c.name, s.order_count, s.total, s.total / s.order_count AS avg_order
FROM customers AS c
CROSS JOIN LATERAL (
  SELECT COUNT(*) AS order_count, SUM(amount) AS total
  FROM orders WHERE orders.customer_id = c.id
) AS s
WHERE s.order_count > 0
ORDER BY c.name;
~~~

~~~text
name | order_count | total | avg_order
Asha | 4 | 480.50 | 120.1250000000000000
Ben | 2 | 140.00 | 70.0000000000000000
Chen | 2 | 305.00 | 152.5000000000000000
~~~

(An aggregate without GROUP BY always returns one row, so Dara got \`order_count = 0\` and the WHERE removed her; \`NUMERIC\` division in PostgreSQL prints many decimals.)

**Name a computed expression once.** You cannot use a SELECT-list alias in WHERE (see [What is the logical order of execution of a SQL query?](/interview-question/what-is-the-logical-order-of-execution-of-a-sql-query)); a lateral subquery computes it once and both places can use it:

~~~sql
SELECT o.id, o.amount, t.tax, t.amount_with_tax
FROM orders AS o
CROSS JOIN LATERAL (
  SELECT round(o.amount * 0.18, 2) AS tax,
         round(o.amount * 1.18, 2) AS amount_with_tax
) AS t
WHERE t.amount_with_tax > 200
ORDER BY o.id;
~~~

~~~text
id | amount | tax | amount_with_tax
103 | 300.00 | 54.00 | 354.00
106 | 210.00 | 37.80 | 247.80
~~~

**Set-returning functions are implicitly lateral.** A function call in FROM may reference earlier tables without the keyword (PostgreSQL 16 also accepted \`, LATERAL unnest(...)\` with the same two rows, so the keyword is allowed but optional):

~~~sql
SELECT c.name, tag
FROM customers AS c, unnest(string_to_array(c.city || ',' || c.name, ',')) AS tag
WHERE c.id = 1;
~~~

~~~text
name | tag
Asha | Pune
Asha | Asha
~~~

📌 **Interview term: set-returning function (table function)** — a function that returns rows, like \`unnest\`, \`generate_series\` or \`jsonb_array_elements\`. In FROM it may refer to earlier tables, which is lateral behaviour without the keyword.

## 7. Engine Support

| Engine | Syntax | Notes |
| :--- | :--- | :--- |
| PostgreSQL | \`CROSS JOIN LATERAL\`, \`LEFT JOIN LATERAL ... ON true\`, \`, LATERAL\` | all examples here ran on 16.15 |
| MySQL | \`LATERAL\` derived tables from 8.0.14 ([MySQL manual](https://dev.mysql.com/doc/refman/8.0/en/lateral-derived-tables.html)) | not run here |
| SQL Server | \`CROSS APPLY\` / \`OUTER APPLY\` ([Microsoft Learn, FROM clause](https://learn.microsoft.com/sql/t-sql/queries/from-transact-sql)) | the right side is evaluated for every left row; \`OUTER APPLY\` keeps rows with no result |
| SQLite | no \`LATERAL\`; table-valued functions such as \`json_each\` may reference earlier tables | the LATERAL query above failed with \`near "SELECT": syntax error\` on 3.45.0 |

📌 **Interview term: CROSS APPLY / OUTER APPLY** — SQL Server spelling of \`CROSS JOIN LATERAL\` and \`LEFT JOIN LATERAL ... ON true\`.

**Without LATERAL (SQLite and older engines).** For one value per row, a correlated scalar subquery does the job, but you need one subquery per column:

~~~sql
SELECT c.name,
       (SELECT o.id FROM orders AS o WHERE o.customer_id = c.id
        ORDER BY o.ordered_at DESC LIMIT 1) AS last_order_id,
       (SELECT o.amount FROM orders AS o WHERE o.customer_id = c.id
        ORDER BY o.ordered_at DESC LIMIT 1) AS last_amount
FROM customers AS c
ORDER BY c.name;
~~~

~~~text
name | last_order_id | last_amount
Asha | 107 | 15
Ben | 105 | 60
Chen | 108 | 95
Dara | NULL | NULL
~~~

Same answer as section 4 (SQLite shows \`15\` where PostgreSQL shows \`15.00\`, because SQLite stores a whole-number NUMERIC as an integer). The lookup is repeated per column, and it cannot return several rows per customer. For that, the window-function form works everywhere:

~~~sql
SELECT name, order_id, ordered_at, amount
FROM (
  SELECT c.name, o.id AS order_id, o.ordered_at, o.amount,
         ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY o.ordered_at DESC) AS rn
  FROM customers AS c
  JOIN orders AS o ON o.customer_id = c.id
) AS ranked
WHERE rn = 1
ORDER BY name;
~~~

~~~text
name | order_id | ordered_at | amount
Asha | 107 | 2025-03-20 | 15
Ben | 105 | 2025-03-15 | 60
Chen | 108 | 2025-03-01 | 95
~~~

SQLite also lets a table-valued function see earlier tables, the same lateral behaviour as \`unnest\` above:

~~~sql
SELECT c.name, j.value AS tag
FROM customers AS c, json_each('["' || c.city || '","' || c.name || '"]') AS j
WHERE c.id = 1
ORDER BY j.key;
~~~

~~~text
name | tag
Asha | Pune
Asha | Asha
~~~

For which of LATERAL, a window function or a correlated subquery wins at scale, see [LATERAL vs Window Function vs Correlated Subquery for top-N per group — which scales when?](/interview-question/lateral-vs-window-function-vs-correlated-subquery-for-top-n-per-group-which-scal). Correlated subqueries themselves are explained in [What is a subquery and what is a correlated subquery?](/interview-question/what-is-a-subquery-and-what-is-a-correlated-subquery).

## 8. Verified: Running the Code

The three LATERAL examples were run by the project verifier on PostgreSQL 16.15 in a scratch database seeded with the schema above, and the SQLite equivalent on sql.js 1.10.2 (SQLite 3.45.0). Latest order per customer:

~~~text
name | order_id | ordered_at | amount
Asha | 107 | 2025-03-20 | 15.00
Ben | 105 | 2025-03-15 | 60.00
Chen | 108 | 2025-03-01 | 95.00
~~~

With LEFT JOIN LATERAL:

~~~text
name | order_id | ordered_at | amount
Asha | 107 | 2025-03-20 | 15.00
Ben | 105 | 2025-03-15 | 60.00
Chen | 108 | 2025-03-01 | 95.00
Dara | NULL | NULL | NULL
~~~

The plan with actual row counts:

~~~text
QUERY PLAN
Nested Loop (actual rows=3 loops=1)
  ->  Seq Scan on customers c (actual rows=4 loops=1)
  ->  Limit (actual rows=1 loops=4)
        ->  Index Scan Backward using orders_customer_date_idx on orders (actual rows=1 loops=4)
              Index Cond: (customer_id = c.id)
~~~

The SQLite correlated-subquery equivalent:

~~~text
name | last_order_id | last_amount
Asha | 107 | 15
Ben | 105 | 60
Chen | 108 | 95
Dara | NULL | NULL
~~~

The aggregate, computed-expression and \`unnest\` queries and the missing-LATERAL error ran on PostgreSQL 16.15; the window-function and \`json_each\` queries and the LATERAL syntax error ran on sql.js 1.10.2 (the window query also on PostgreSQL, with the same rows and \`15.00\`-style amounts).

## Common Pitfalls

- **Forgetting the keyword.** A FROM subquery that mentions an earlier table needs \`LATERAL\`; PostgreSQL says so in the error hint.
- **Losing rows with CROSS JOIN LATERAL.** Parents with no matching child vanish. Use \`LEFT JOIN LATERAL ... ON true\` when they must stay.
- **No index for the inner lookup.** The inner side runs once per outer row; without an index on \`(customer_id, ordered_at)\` each run scans the orders table.
- **ORDER BY without a tie-breaker inside the subquery.** With two orders on the same date, \`LIMIT 1\` picks either one. Add a unique column (\`ORDER BY ordered_at DESC, id DESC\`).
- **Referencing a table to the right.** LATERAL sees only FROM items listed before it.
- **Assuming portability.** \`LATERAL\` is not in SQLite and is spelled \`APPLY\` in SQL Server.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LATERAL</code> before a subquery in FROM lets that subquery reference columns of the tables listed <strong style="color:#ffca28;">to its left</strong>. Without it, a derived table is computed on its own and cannot see them.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Semantics:</strong> <span style="color:#f0e2c8;">Logically the lateral subquery runs once per left row, with that row values plugged in. It is a correlated subquery that may return many rows and many columns, and it is joined to the row that produced it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Join types:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CROSS JOIN LATERAL</code> (or a comma) drops left rows for which the subquery returns nothing. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LEFT JOIN LATERAL (...) ON true</code> keeps them with NULLs, which is how Dara, with no orders, stayed in the result.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. When I use it:</strong> <span style="color:#f0e2c8;">Latest or top-N rows per parent with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY ... LIMIT</code>, several columns from one lookup, naming a computed expression once, and set-returning functions like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unnest</code>, which are implicitly lateral.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Performance and engines:</strong> <span style="color:#f0e2c8;">The plan is a Nested Loop: PostgreSQL 16 ran the inner <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Limit</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loops=4</code> over an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Index Scan Backward</code>, so it is fast when an index serves the lookup. MySQL 8.0.14+ supports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LATERAL</code>, SQL Server uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CROSS APPLY</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OUTER APPLY</code>, SQLite has none.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is LATERAL different from a correlated subquery in the SELECT list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A scalar subquery in the SELECT list must return one value. A lateral subquery can return several columns and several rows. To get id and amount of the latest order without LATERAL you need two scalar subqueries, as in the SQLite example, each doing the lookup again.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ON true</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A LEFT JOIN needs an ON clause, but the join condition is already inside the subquery (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">customer_id = c.id</code>). <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ON true</code> just says keep every pair, and the LEFT part keeps the customers with no match.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you leave out the LATERAL keyword?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">PostgreSQL 16 rejects the query: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">invalid reference to FROM-clause entry for table "c"</code>, with the hint <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">To reference that table, you must mark this subquery with LATERAL.</code></span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is LATERAL always faster than a window function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. For a few rows per outer row with a matching index, LATERAL does a short index scan per outer row. For the whole table, a single pass with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROW_NUMBER()</code> can win. The sibling question on top-N per group compares them.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the SQL Server equivalent?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CROSS APPLY</code> behaves like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CROSS JOIN LATERAL</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OUTER APPLY</code> like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LEFT JOIN LATERAL ... ON true</code>; it also takes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TOP (n)</code> subqueries and table-valued functions.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Derived table | A subquery in FROM, computed on its own, that cannot see sibling FROM items |
| LATERAL | Lets a FROM subquery or function reference FROM items before it; evaluated per left row |
| CROSS JOIN LATERAL | Pairs each left row with its subquery rows; drops left rows with none |
| LEFT JOIN LATERAL ... ON true | Keeps every left row, with NULLs when the subquery returns nothing |
| Nested loop join | Runs the inner side once per outer row; the usual plan for LATERAL |
| Set-returning function | A function in FROM that returns rows; implicitly lateral |
| CROSS APPLY / OUTER APPLY | The SQL Server equivalents of the two LATERAL joins |

**Conclusion:** \`LATERAL\` turns a FROM-clause subquery into a "for each row on the left, run this" subquery: it may reference earlier tables, return many rows and many columns, and use \`ORDER BY ... LIMIT\` per row. That makes latest-row and top-N-per-parent queries short and, with the right index, fast: PostgreSQL 16 ran the inner \`Limit\` once per customer over a backward index scan. Use \`CROSS JOIN LATERAL\` when parents without children may disappear and \`LEFT JOIN LATERAL ... ON true\` when they must stay, remember that it is \`APPLY\` in SQL Server and absent in SQLite, and compare it with a window function when you need the answer for every group in the table.`,
    examples: [
      {
        label: `CROSS JOIN LATERAL: each customer with their most recent order`,
        code: `SELECT c.name, o.id AS order_id, o.ordered_at, o.amount
FROM customers AS c
CROSS JOIN LATERAL (
  SELECT id, ordered_at, amount
  FROM orders
  WHERE orders.customer_id = c.id      -- refers to c, defined to the left
  ORDER BY ordered_at DESC
  LIMIT 1
) AS o
ORDER BY c.name;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `LEFT JOIN LATERAL ... ON true keeps customers without orders`,
        code: `SELECT c.name, o.order_id, o.ordered_at, o.amount
FROM customers AS c
LEFT JOIN LATERAL (
  SELECT id AS order_id, ordered_at, amount
  FROM orders
  WHERE orders.customer_id = c.id
  ORDER BY ordered_at DESC
  LIMIT 1
) AS o ON true
ORDER BY c.name;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `The plan: a Nested Loop that runs the inner Limit once per customer`,
        code: `EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT c.name, o.amount
FROM customers AS c
CROSS JOIN LATERAL (
  SELECT amount FROM orders
  WHERE orders.customer_id = c.id
  ORDER BY ordered_at DESC
  LIMIT 1
) AS o;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `SQLite has no LATERAL: the same answer with correlated scalar subqueries`,
        code: `SELECT c.name,
       (SELECT o.id FROM orders AS o WHERE o.customer_id = c.id
        ORDER BY o.ordered_at DESC LIMIT 1) AS last_order_id,
       (SELECT o.amount FROM orders AS o WHERE o.customer_id = c.id
        ORDER BY o.ordered_at DESC LIMIT 1) AS last_amount
FROM customers AS c
ORDER BY c.name;`,
      },
    ],
  },
  {
    title: `LATERAL JOIN — how do you fetch the top 3 orders per customer efficiently?`,
    difficulty: "medium",
    seoDescription: `Top 3 orders per customer with CROSS JOIN LATERAL and a composite index, ties with WITH TIES, and a measured comparison with ROW_NUMBER on 1M rows.`,
    description: `**Question presented to candidate:**
"For each customer, we want their three biggest orders, for a dashboard that shows a page of customers at a time. How would you write that in PostgreSQL so it stays fast when the orders table has millions of rows?"

**What a strong answer should cover:**
- \`CROSS JOIN LATERAL (SELECT ... WHERE o.customer_id = c.id ORDER BY amount DESC, id DESC LIMIT 3)\`: one small top-3 query per customer
- The index that makes it fast: \`(customer_id, amount DESC, id DESC)\`, so each inner query reads exactly three index entries (PostgreSQL shows \`Limit\` over an \`Index Only Scan\` with \`loops\` = number of customers)
- A deterministic tie-breaker, and the alternative \`FETCH FIRST 3 ROWS WITH TIES\` (PostgreSQL 13+) when tied orders should all be shown
- \`LEFT JOIN LATERAL ... ON true\` when customers without orders must still appear
- The trade-off against \`ROW_NUMBER() OVER (PARTITION BY customer_id ...)\`: the window version reads every order, LATERAL reads three per customer; which wins depends on rows per customer and how many customers you need
- Portability: SQLite has no LATERAL, SQL Server uses \`CROSS APPLY\` with \`TOP (3)\`, MySQL supports LATERAL from 8.0.14

**Clarifying questions expected:**
- "Biggest" by amount or "latest" by date, and what happens with ties at third place?
- Should customers with no orders appear, and do we need all customers or a page of them?

**Code / implementation expected:** Yes — the LATERAL query with the supporting index, ideally with the plan and the window-function alternative.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  ordered_at TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL
);
CREATE INDEX orders_customer_amount_idx ON orders (customer_id, amount DESC, id DESC);
INSERT INTO customers (id, name) VALUES
  (1, 'Asha'),
  (2, 'Ben'),
  (3, 'Chen'),
  (4, 'Dara');
INSERT INTO orders (id, customer_id, ordered_at, amount) VALUES
  (101, 1, '2025-01-05', 120.00),
  (102, 1, '2025-02-11', 45.50),
  (103, 1, '2025-03-02', 300.00),
  (104, 2, '2025-01-20', 80.00),
  (105, 2, '2025-03-15', 60.00),
  (106, 3, '2025-02-28', 210.00),
  (107, 1, '2025-03-20', 15.00),
  (108, 3, '2025-03-01', 95.00),
  (109, 3, '2025-03-09', 40.00),
  (110, 1, '2025-04-02', 80.00),
  (111, 3, '2025-04-11', 130.00),
  (112, 3, '2025-04-30', 25.00),
  (113, 1, '2025-05-06', 80.00);
\`\`\``,
    answer: `**Target Audience:** Developers who know what LATERAL is and now need the classic top-N-per-group query to be fast; the applied interview version.
**Difficulty:** Medium
**Engines:** PostgreSQL 16.15 for the LATERAL queries, plans and the million-row timing test; SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable example on this page uses) for the portable window-function version.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and plan below was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

A librarian is asked: *"For each member, show their three most expensive late fees."* One way: print every late fee ever charged, sort the whole pile by member and amount, and walk through it keeping the first three per member. That works, but the pile has a million sheets and you only wanted the first three of each.

The other way: the fees are already filed in a cabinet, one drawer per member, sorted biggest first. For each member, open their drawer, take the front three sheets, close it. If you only need the first page of 20 members, you open 20 drawers and touch 60 sheets.

The first way is a window function over the whole table. The second is \`LATERAL\` with the right index. This page shows both, measures them, and explains when each one wins. What \`LATERAL\` means is covered in [What is a LATERAL join?](/interview-question/what-is-a-lateral-join); here we apply it.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| "Top" by amount, or "latest" by date? | Decides the ORDER BY and therefore the index. |
| What about ties at third place? | \`LIMIT 3\` with a tie-breaker returns exactly three; \`WITH TIES\` returns all tied rows. |
| Must customers with no orders appear? | \`CROSS JOIN LATERAL\` drops them, \`LEFT JOIN LATERAL ... ON true\` keeps them. |
| All customers, or a page of them? | A page favours LATERAL strongly; all customers narrows the gap. |
| Roughly how many orders per customer? | Many orders per customer is where LATERAL wins by a large factor. |

## 3. The Query

~~~sql
SELECT c.name, t.order_id, t.amount, t.ordered_at
FROM customers AS c
CROSS JOIN LATERAL (
  SELECT o.id AS order_id, o.amount, o.ordered_at
  FROM orders AS o
  WHERE o.customer_id = c.id
  ORDER BY o.amount DESC, o.id DESC   -- id breaks ties
  LIMIT 3
) AS t
ORDER BY c.name, t.amount DESC, t.order_id DESC;
~~~

~~~text
name | order_id | amount | ordered_at
Asha | 103 | 300.00 | 2025-03-02
Asha | 101 | 120.00 | 2025-01-05
Asha | 113 | 80.00 | 2025-05-06
Ben | 104 | 80.00 | 2025-01-20
Ben | 105 | 60.00 | 2025-03-15
Chen | 106 | 210.00 | 2025-02-28
Chen | 111 | 130.00 | 2025-04-11
Chen | 108 | 95.00 | 2025-03-01
~~~

For each customer, the subquery is an ordinary "top 3 of my orders" query; \`LATERAL\` lets it use \`c.id\`. Ben has only two orders, so he gets two rows. Dara has none and, with a cross join, disappears (section 6 keeps her).

📌 **Interview term: top-N per group** — returning the first N rows of each group under some order (top 3 orders per customer), without collapsing the group into one row the way GROUP BY would.

📌 **Interview term: tie-breaker** — an extra unique column in the ORDER BY (\`id DESC\`) so that equal values (two orders of 80.00) are always ordered the same way. Without it, which order is "third" is undefined.

## 4. Why It Is Fast: the Composite Index

The schema creates:

~~~sql
CREATE INDEX orders_customer_amount_idx ON orders (customer_id, amount DESC, id DESC);
~~~

The index stores entries sorted by customer first, then by amount from largest to smallest, then by id. For one customer, the three biggest orders are the first three entries of that customer's section.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 280" role="img" aria-label="Index on customer_id then amount descending: for customer 1 the inner query jumps to the start of that customer in the index, reads three entries and stops">
  <defs>
    <marker id="sql09q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="420" y="20" width="320" height="240" rx="8"/>
  <text class="d-text" x="580" y="48" text-anchor="middle">index (customer_id, amount DESC)</text>
  <rect class="d-box-accent" x="445" y="66" width="270" height="30" rx="5"/>
  <text class="d-text" x="580" y="86" text-anchor="middle">1, 300.00, 103</text>
  <rect class="d-box-accent" x="445" y="102" width="270" height="30" rx="5"/>
  <text class="d-text" x="580" y="122" text-anchor="middle">1, 120.00, 101</text>
  <rect class="d-box-accent" x="445" y="138" width="270" height="30" rx="5"/>
  <text class="d-text" x="580" y="158" text-anchor="middle">1, 80.00, 113</text>
  <rect class="d-box-muted" x="445" y="174" width="270" height="30" rx="5"/>
  <text class="d-sub" x="580" y="194" text-anchor="middle">1, 80.00, 110 (not read)</text>
  <rect class="d-box-muted" x="445" y="210" width="270" height="30" rx="5"/>
  <text class="d-sub" x="580" y="230" text-anchor="middle">2, 80.00, 104 (next customer)</text>
  <rect class="d-box-accent" x="20" y="80" width="230" height="74" rx="8"/>
  <text class="d-text" x="135" y="110" text-anchor="middle">Inner query for Asha</text>
  <text class="d-sub" x="135" y="134" text-anchor="middle">customer_id = 1 LIMIT 3</text>
  <path class="d-edge-accent" d="M 252 100 L 438 81" marker-end="url(#sql09q5-arrow)"/>
  <text class="d-accent" x="340" y="70" text-anchor="middle">seek</text>
  <path class="d-edge-dashed" d="M 438 153 L 252 135" marker-end="url(#sql09q5-arrow)"/>
  <text class="d-sub" x="340" y="175" text-anchor="middle">3 rows, stop</text>
</svg>

The inner query seeks to \`customer_id = 1\`, reads three entries, and stops. Column order in the index matters: equality column first, then the ORDER BY columns in the same direction; see [Why does column order matter in a composite index?](/interview-question/why-does-column-order-matter-in-a-composite-index).

~~~sql
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT c.name, t.id, t.amount
FROM customers AS c
CROSS JOIN LATERAL (
  SELECT o.id, o.amount
  FROM orders AS o
  WHERE o.customer_id = c.id
  ORDER BY o.amount DESC, o.id DESC
  LIMIT 3
) AS t;
~~~

~~~text
QUERY PLAN
Nested Loop (actual rows=8 loops=1)
  ->  Seq Scan on customers c (actual rows=4 loops=1)
  ->  Limit (actual rows=2 loops=4)
        ->  Index Only Scan using orders_customer_amount_idx on orders o (actual rows=2 loops=4)
              Index Cond: (customer_id = c.id)
              Heap Fetches: 8
~~~

How to read it:

- \`Nested Loop\` with \`Seq Scan on customers\` outside: for each of the 4 customers, run the inner side.
- \`Limit (actual rows=2 loops=4)\`: the inner \`LIMIT 3\` ran 4 times. \`actual rows\` is the **average per loop**: 3 + 2 + 3 + 0 = 8 rows over 4 loops is 2.
- \`Index Only Scan using orders_customer_amount_idx\`: no sort node, because the index already returns rows in the requested order. It is *index only* because every column the subquery needs (\`customer_id\`, \`amount\`, \`id\`) is in the index; \`Heap Fetches: 8\` means PostgreSQL still visited the table to check row visibility on this freshly loaded table (after a \`VACUUM\` it drops to 0, as in the large test below).

The planner may choose a different plan on other data. SQLite uses the same index for the inner query; its plan for one customer was:

~~~text
id | parent | notused | detail
4 | 0 | 0 | SEARCH o USING COVERING INDEX orders_customer_amount_idx (customer_id=?)
~~~

📌 **Interview term: index-only scan** — answering a query from the index alone, without reading table rows; possible when the index contains every needed column. See [What is a covering index?](/interview-question/what-is-a-covering-index).

## 5. The Alternative: ROW_NUMBER over a Partition

Without LATERAL (SQLite, or any engine), number each customer's orders and keep numbers 1 to 3:

~~~sql
SELECT name, order_id, amount, ordered_at
FROM (
  SELECT c.name, o.id AS order_id, o.amount, o.ordered_at,
         ROW_NUMBER() OVER (
           PARTITION BY o.customer_id
           ORDER BY o.amount DESC, o.id DESC
         ) AS rn
  FROM customers AS c
  JOIN orders AS o ON o.customer_id = c.id
) AS ranked
WHERE rn <= 3
ORDER BY name, amount DESC, order_id DESC;
~~~

~~~text
name | order_id | amount | ordered_at
Asha | 103 | 300 | 2025-03-02
Asha | 101 | 120 | 2025-01-05
Asha | 113 | 80 | 2025-05-06
Ben | 104 | 80 | 2025-01-20
Ben | 105 | 60 | 2025-03-15
Chen | 106 | 210 | 2025-02-28
Chen | 111 | 130 | 2025-04-11
Chen | 108 | 95 | 2025-03-01
~~~

Same eight rows (SQLite prints \`300\` where PostgreSQL prints \`300.00\`, because SQLite stores whole-number NUMERIC values as integers). The difference is work: the window function has to see every order of every customer to number them. The details of the window approach are in [Top-N per group with RANK() OVER (PARTITION BY) — how do you get top 2 per department without collapsing rows?](/interview-question/top-n-per-group-with-rank-over-partition-by-how-do-you-get-top-2-per-department-), and the ROW_NUMBER vs RANK choice in [What is the difference between ROW_NUMBER, RANK, and DENSE_RANK?](/interview-question/what-is-the-difference-between-row-number-rank-and-dense-rank).

A third, older form uses a correlated count ("fewer than 3 orders beat this one"). It also runs everywhere but does a count per order:

~~~sql
SELECT c.name, o.id AS order_id, o.amount
FROM orders AS o
JOIN customers AS c ON c.id = o.customer_id
WHERE (
  SELECT COUNT(*) FROM orders AS b
  WHERE b.customer_id = o.customer_id
    AND (b.amount > o.amount OR (b.amount = o.amount AND b.id > o.id))
) < 3
ORDER BY c.name, o.amount DESC, o.id DESC;
~~~

~~~text
name | order_id | amount
Asha | 103 | 300
Asha | 101 | 120
Asha | 113 | 80
Ben | 104 | 80
Ben | 105 | 60
Chen | 106 | 210
Chen | 111 | 130
Chen | 108 | 95
~~~

## 6. Ties and Customers Without Orders

Asha has two orders of 80.00 (110 and 113). With the \`id\` tie-breaker she gets 113 and not 110. If the business says "show everyone tied for third", use \`FETCH FIRST 3 ROWS WITH TIES\`, added in PostgreSQL 13 ([PostgreSQL 13 release announcement](https://www.postgresql.org/about/news/2077/)). It needs an ORDER BY without the tie-breaker, since ties are defined by it. And to keep Dara, switch to \`LEFT JOIN LATERAL ... ON true\`:

~~~sql
SELECT c.name, t.order_id, t.amount
FROM customers AS c
LEFT JOIN LATERAL (
  SELECT o.id AS order_id, o.amount
  FROM orders AS o
  WHERE o.customer_id = c.id
  ORDER BY o.amount DESC
  FETCH FIRST 3 ROWS WITH TIES
) AS t ON true
ORDER BY c.name, t.amount DESC, t.order_id;
~~~

~~~text
name | order_id | amount
Asha | 103 | 300.00
Asha | 101 | 120.00
Asha | 110 | 80.00
Asha | 113 | 80.00
Ben | 104 | 80.00
Ben | 105 | 60.00
Chen | 106 | 210.00
Chen | 111 | 130.00
Chen | 108 | 95.00
Dara | NULL | NULL
~~~

Asha now has four rows (both 80.00 orders), and Dara appears with NULLs. In the window version, the same "keep ties" rule is \`RANK() <= 3\` instead of \`ROW_NUMBER() <= 3\`.

📌 **Interview term: FETCH FIRST n ROWS WITH TIES** — standard SQL row limit that also returns every row equal, under the ORDER BY, to the last one; PostgreSQL 13+.

## 7. Measured: LATERAL vs ROW_NUMBER at a Million Rows

To put numbers on "efficiently", I ran both queries on PostgreSQL 16.15 in a scratch database with 1,000,000 random orders, the same index, after \`VACUUM ANALYZE\`, using \`EXPLAIN (ANALYZE, BUFFERS)\`. Times are from three runs on this sandbox machine and will differ on yours; the buffer counts are what matter:

~~~text
Customers  Orders     Query                  Execution time   Shared buffers
20,000     1,000,000  LATERAL, all customers   64 - 95 ms        60,262
20,000     1,000,000  ROW_NUMBER, all          135 - 211 ms      3,835
200        1,000,000  LATERAL, all customers   1.6 - 2.5 ms      604
200        1,000,000  ROW_NUMBER, all          111 - 135 ms      3,835
20,000     1,000,000  LATERAL, page of 20      0.13 ms           64
20,000     1,000,000  ROW_NUMBER, page of 20   0.22 ms           10
~~~

What the numbers say:

- **Many orders per customer** (200 customers, 5,000 orders each): LATERAL read 3 index entries per customer, 604 buffers in total, about 2 ms. The window version read all 1,000,000 index entries, about 120 ms. This is the case LATERAL is made for.
- **Few orders per customer** (20,000 customers, 50 each): LATERAL did 20,000 index seeks, 60,262 buffer hits, because each seek touches several index pages; the window version did one ordered pass over 3,835 pages. LATERAL was still faster here, but only about two to one.
- **A page of customers**: both were sub-millisecond, LATERAL with 64 buffer hits. In PostgreSQL 16 the window plan here stopped early through a merge join; do not count on that in more complex queries.

The window plan showed \`Run Condition: (row_number() OVER (?) <= 3)\`: since PostgreSQL 15 the executor can stop computing row numbers once the condition is false ([commit "Teach planner and executor about monotonic window funcs"](https://www.postgresql.org/message-id/E1ncaj6-000nex-Sn@gemulon.postgresql.org)), but with \`PARTITION BY\` it still has to read every row to reach the next partition.

**Without the index**, LATERAL is the worst choice. Dropping the index and asking for a page of 20 customers gave:

~~~text
 Nested Loop (actual rows=60 loops=1)
   Buffers: shared hit=147068
   ->  Limit (actual rows=20 loops=1)
         ->  Index Only Scan using customers_pkey on customers (actual rows=20 loops=1)
   ->  Limit (actual rows=3 loops=20)
         ->  Sort (actual rows=3 loops=20)
               Sort Key: o.amount DESC, o.id DESC
               Sort Method: top-N heapsort  Memory: 25kB
               ->  Seq Scan on orders o (actual rows=5000 loops=20)
                     Filter: (customer_id = customers.id)
                     Rows Removed by Filter: 995000
 Execution Time: 1041.011 ms
~~~

Each of the 20 inner queries scanned the whole million-row table and threw away 995,000 rows: about one second instead of 0.13 ms. LATERAL is a nested loop, and a nested loop is only as good as its inner lookup. The broader comparison, including correlated subqueries, is [LATERAL vs Window Function vs Correlated Subquery for top-N per group — which scales when?](/interview-question/lateral-vs-window-function-vs-correlated-subquery-for-top-n-per-group-which-scal).

| Situation | Best choice | Why |
| :--- | :--- | :--- |
| Page of parents, many children each | LATERAL + composite index | reads N index entries per parent and stops |
| Every parent, few children each | ROW_NUMBER or LATERAL (measure) | one sequential pass can rival many seeks |
| No suitable index | ROW_NUMBER | LATERAL would scan the table once per parent |
| SQLite or another engine without LATERAL | ROW_NUMBER | portable since window functions are widely supported |
| Ties must be included | \`WITH TIES\` in LATERAL, or \`RANK()\` | \`LIMIT\` and \`ROW_NUMBER\` cut ties arbitrarily |

## 8. Other Engines

- **SQL Server:** \`FROM customers AS c CROSS APPLY (SELECT TOP (3) ... ORDER BY o.amount DESC, o.id DESC) AS t\`, and \`OUTER APPLY\` to keep customers without orders ([Microsoft Learn, FROM clause](https://learn.microsoft.com/sql/t-sql/queries/from-transact-sql)). Not run here.
- **MySQL:** \`LATERAL\` derived tables from 8.0.14 ([MySQL manual](https://dev.mysql.com/doc/refman/8.0/en/lateral-derived-tables.html)). Not run here.
- **SQLite 3.45:** no LATERAL (a LATERAL subquery failed with \`near "SELECT": syntax error\`), so use the window form of section 5.

## 9. Verified: Running the Code

The three PostgreSQL examples were run by the project verifier on PostgreSQL 16.15 in a scratch database seeded with the schema above, and the window example on sql.js 1.10.2 (SQLite 3.45.0). Top 3 per customer:

~~~text
name | order_id | amount | ordered_at
Asha | 103 | 300.00 | 2025-03-02
Asha | 101 | 120.00 | 2025-01-05
Asha | 113 | 80.00 | 2025-05-06
Ben | 104 | 80.00 | 2025-01-20
Ben | 105 | 60.00 | 2025-03-15
Chen | 106 | 210.00 | 2025-02-28
Chen | 111 | 130.00 | 2025-04-11
Chen | 108 | 95.00 | 2025-03-01
~~~

The plan:

~~~text
QUERY PLAN
Nested Loop (actual rows=8 loops=1)
  ->  Seq Scan on customers c (actual rows=4 loops=1)
  ->  Limit (actual rows=2 loops=4)
        ->  Index Only Scan using orders_customer_amount_idx on orders o (actual rows=2 loops=4)
              Index Cond: (customer_id = c.id)
              Heap Fetches: 8
~~~

The window-function version:

~~~text
name | order_id | amount | ordered_at
Asha | 103 | 300 | 2025-03-02
Asha | 101 | 120 | 2025-01-05
Asha | 113 | 80 | 2025-05-06
Ben | 104 | 80 | 2025-01-20
Ben | 105 | 60 | 2025-03-15
Chen | 106 | 210 | 2025-02-28
Chen | 111 | 130 | 2025-04-11
Chen | 108 | 95 | 2025-03-01
~~~

With ties and customers without orders:

~~~text
name | order_id | amount
Asha | 103 | 300.00
Asha | 101 | 120.00
Asha | 110 | 80.00
Asha | 113 | 80.00
Ben | 104 | 80.00
Ben | 105 | 60.00
Chen | 106 | 210.00
Chen | 111 | 130.00
Chen | 108 | 95.00
Dara | NULL | NULL
~~~

The correlated-count query and the SQLite plan were run on sql.js 1.10.2 (the count query also on PostgreSQL, with the same rows). The million-row comparison was run by hand with \`psql\` against a throwaway database that was dropped afterwards.

## Common Pitfalls

- **No composite index.** Without \`(customer_id, amount DESC, id DESC)\` each inner query scans and sorts; in the test that was one second for 20 customers.
- **No tie-breaker.** \`ORDER BY amount DESC LIMIT 3\` can return a different third order on each run when amounts tie.
- **Losing parents with no children.** \`CROSS JOIN LATERAL\` drops Dara; use \`LEFT JOIN LATERAL ... ON true\` if she must appear.
- **Forgetting the outer ORDER BY.** The order of the final rows is not guaranteed by the inner ORDER BY; sort the outer query too.
- **Assuming LATERAL always wins.** For all parents with few children each, a single window pass can be close or better. Measure with \`EXPLAIN (ANALYZE, BUFFERS)\`.
- **Using \`ROW_NUMBER\` when ties matter.** It cuts ties arbitrarily, like \`LIMIT\`; use \`RANK()\` or \`WITH TIES\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The query:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FROM customers c CROSS JOIN LATERAL (SELECT ... FROM orders o WHERE o.customer_id = c.id ORDER BY o.amount DESC, o.id DESC LIMIT 3) t</code>. For each customer it runs a tiny top-3 query, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">id</code> breaks ties so the result is deterministic.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The index:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CREATE INDEX ON orders (customer_id, amount DESC, id DESC)</code>. Each inner query seeks to the customer and reads three entries. On PostgreSQL 16 the plan was a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Limit</code> over an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Index Only Scan</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loops=4</code>, one per customer.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Variations:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LEFT JOIN LATERAL ... ON true</code> keeps customers with no orders. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FETCH FIRST 3 ROWS WITH TIES</code> (PostgreSQL 13+) returns all orders tied with the third one, so Asha got four rows because two orders were 80.00.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Versus a window function:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROW_NUMBER() OVER (PARTITION BY customer_id ...)</code> gives the same rows but reads every order. In my test with 200 customers and 1M orders LATERAL took about 2 ms against about 120 ms; with 20,000 customers of 50 orders each the gap was only about two to one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Portability:</strong> <span style="color:#f0e2c8;">SQL Server writes it <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CROSS APPLY (SELECT TOP (3) ...)</code>; MySQL 8.0.14+ supports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LATERAL</code>; SQLite has no LATERAL, so there I use the window form.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the index is missing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each inner query becomes a scan of the whole orders table plus a top-N sort. In my 1M-row test, 20 customers took about 1 second without the index (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Seq Scan ... loops=20</code>, 995,000 rows removed by filter each time) against 0.13 ms with it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you choose ROW_NUMBER instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you need the answer for every customer and each has only a few orders, or when the engine has no LATERAL. The window version reads the table once in index order, and PostgreSQL 15+ adds a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Run Condition</code> that stops computing row numbers past 3, but it still reads every row.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">amount DESC, id DESC</code> and not just <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">amount DESC</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Without a unique tie-breaker, two orders of 80.00 compete for third place and the database may return either one, even between two runs. Adding <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">id</code> makes the result repeatable, and putting it in the index keeps the scan ordered.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you also show the rank number?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROW_NUMBER() OVER (ORDER BY o.amount DESC, o.id DESC)</code> inside the lateral subquery; it is computed per customer because the subquery only sees that customer orders.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this work with pagination?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Page the customers first (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY id LIMIT 20</code> in a subquery, or keyset pagination), then join LATERAL. The inner query then runs only 20 times: 64 buffer hits in my test.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Top-N per group | The first N rows of each group under an order, without collapsing the group |
| Tie-breaker | A unique column added to ORDER BY so equal values sort deterministically |
| Index-only scan | Answering from the index alone because it contains every needed column |
| FETCH FIRST n ROWS WITH TIES | Row limit that also returns rows tied with the last one (PostgreSQL 13+) |

**Conclusion:** The efficient top-3-per-customer query in PostgreSQL is a \`CROSS JOIN LATERAL\` subquery with \`ORDER BY amount DESC, id DESC LIMIT 3\`, backed by an index on \`(customer_id, amount DESC, id DESC)\`: each customer costs one index seek and three entries, which the plan shows as a \`Limit\` over an \`Index Only Scan\` looping once per customer. It shines when customers have many orders or you only need a page of them (2 ms against 120 ms in the million-row test), it degrades badly without the index (one second for 20 customers), and for every customer with few orders a \`ROW_NUMBER()\` pass is a close competitor and the only option in SQLite. Add \`LEFT JOIN LATERAL ... ON true\` to keep customers without orders and \`WITH TIES\` when tied orders should all be shown.`,
    examples: [
      {
        label: `Top 3 orders per customer with CROSS JOIN LATERAL`,
        code: `SELECT c.name, t.order_id, t.amount, t.ordered_at
FROM customers AS c
CROSS JOIN LATERAL (
  SELECT o.id AS order_id, o.amount, o.ordered_at
  FROM orders AS o
  WHERE o.customer_id = c.id
  ORDER BY o.amount DESC, o.id DESC   -- id breaks ties
  LIMIT 3
) AS t
ORDER BY c.name, t.amount DESC, t.order_id DESC;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `The plan: Limit over an Index Only Scan, once per customer`,
        code: `EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT c.name, t.id, t.amount
FROM customers AS c
CROSS JOIN LATERAL (
  SELECT o.id, o.amount
  FROM orders AS o
  WHERE o.customer_id = c.id
  ORDER BY o.amount DESC, o.id DESC
  LIMIT 3
) AS t;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `Same result without LATERAL (runs in SQLite): ROW_NUMBER per customer`,
        code: `SELECT name, order_id, amount, ordered_at
FROM (
  SELECT c.name, o.id AS order_id, o.amount, o.ordered_at,
         ROW_NUMBER() OVER (
           PARTITION BY o.customer_id
           ORDER BY o.amount DESC, o.id DESC
         ) AS rn
  FROM customers AS c
  JOIN orders AS o ON o.customer_id = c.id
) AS ranked
WHERE rn <= 3
ORDER BY name, amount DESC, order_id DESC;`,
      },
      {
        label: `LEFT JOIN LATERAL with FETCH FIRST 3 ROWS WITH TIES: keep ties and customers with no orders`,
        code: `SELECT c.name, t.order_id, t.amount
FROM customers AS c
LEFT JOIN LATERAL (
  SELECT o.id AS order_id, o.amount
  FROM orders AS o
  WHERE o.customer_id = c.id
  ORDER BY o.amount DESC
  FETCH FIRST 3 ROWS WITH TIES
) AS t ON true
ORDER BY c.name, t.amount DESC, t.order_id;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
];

export default augments;
