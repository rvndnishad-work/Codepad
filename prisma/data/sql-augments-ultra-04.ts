/**
 * SQL ULTRA — batch 04: Joins and set operations (self join, CROSS JOIN,
 * ON vs WHERE in a LEFT JOIN, UNION vs UNION ALL, DELETE / TRUNCATE / DROP). Every
 * example was run by scripts/verify-sql-examples.ts (sql.js 1.10.2 like the
 * page, PostgreSQL 16 for postgres examples); quoted output is that run's output.
 */
import type { SqlUltraAugment } from "./sql-augments.types";

const augments: SqlUltraAugment[] = [
  {
    title: `What is a self join?`,
    difficulty: "medium",
    seoDescription: `A self join joins a table to itself with two aliases: employee and manager, row-to-row comparisons and pairs, with LEFT JOIN, a.id < b.id and the plan.`,
    description: `**Question presented to candidate:**
"Our \`employees\` table has a \`manager_id\` column that points at another row of the same table. Write a query that lists every employee next to their manager's name, and explain what a self join is and when you would reach for one."

**What a strong answer should cover:**
- A self join is an ordinary join (INNER, LEFT, and so on) in which both sides are the same table, so each copy needs its own alias
- The typical use: a self-referencing foreign key such as \`manager_id REFERENCES employees(id)\`, the adjacency list way of storing a hierarchy
- \`LEFT JOIN\` keeps the root row (the CEO, whose \`manager_id\` is NULL); \`INNER JOIN\` silently drops it
- Other patterns: comparing a row to a related row (earns more than the manager), and building pairs inside a group with \`a.id < b.id\` to avoid self-pairs and mirror duplicates
- Limits: one self join walks exactly one level; an unknown depth needs a recursive CTE
- Performance: the engine treats the two aliases as two independent inputs, so the join column (\`manager_id\`) wants an index like any other join

**Code / implementation expected:** Yes — an employee/manager query with two aliases of the same table, and ideally one comparison or pairing query.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  dept TEXT NOT NULL,
  salary INTEGER NOT NULL,
  manager_id INTEGER REFERENCES employees(id)
);
INSERT INTO employees (id, name, title, dept, salary, manager_id) VALUES
  (1, 'Maya', 'CEO', 'Exec', 250000, NULL),
  (2, 'Raj', 'VP Engineering', 'Eng', 180000, 1),
  (3, 'Lena', 'VP Sales', 'Sales', 170000, 1),
  (4, 'Omar', 'Staff Engineer', 'Eng', 190000, 2),
  (5, 'Priya', 'Engineer', 'Eng', 140000, 2),
  (6, 'Tom', 'Account Exec', 'Sales', 120000, 3),
  (7, 'Zoe', 'Account Exec', 'Sales', 175000, 3),
  (8, 'Ivan', 'Intern', 'Eng', 60000, 4);
\`\`\``,
    answer: `**Target Audience:** Beginners who know a basic join and want to see a table joined to itself, and candidates preparing for the follow-ups.
**Difficulty:** Medium
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15, both run for this page. Self joins are plain standard SQL and work the same way in MySQL and SQL Server.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and error message shown was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

Imagine the company phone list printed on one sheet. Each line has a person, their job, and a column "reports to: #2". To answer "who is Omar's boss?" you find Omar, read the number 2, then run your finger back up the *same sheet* to find line 2: Raj.

Now imagine doing that for everyone at once. The easy way is to photocopy the sheet, lay the two copies side by side, and say: the left copy is "the employee", the right copy is "the manager", and a line on the left belongs next to the line on the right whose number matches its "reports to" column.

That is a self join. The database does not need a second table; it reads the same table twice, under two different names.

## 2. The Idea in Plain Language

📌 **Interview term: self join** — a join in which a table is joined to itself. It is not a separate join type: it is an ordinary \`INNER JOIN\`, \`LEFT JOIN\` or any other join whose two sides happen to be the same table.

📌 **Interview term: table alias** — a short name given to a table in the \`FROM\` clause (\`employees AS e\`). In a self join the aliases are mandatory, because they are the only way to say *which copy* a column comes from.

📌 **Interview term: self-referencing foreign key** — a foreign key that points at the primary key of its own table, like \`manager_id INTEGER REFERENCES employees(id)\`. Storing a tree this way, one parent pointer per row, is called an **adjacency list**. (Primary and foreign keys have their own page: [What is the difference between a primary key and a foreign key?](/interview-question/what-is-the-difference-between-a-primary-key-and-a-foreign-key))

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="Two aliases of the same employees table. The manager_id column of alias e points at the id column of alias m">
  <defs>
    <marker id="sql04q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="280" height="44" rx="8"/>
  <text class="d-text" x="160" y="48" text-anchor="middle">employees AS e (the employee)</text>
  <rect class="d-box" x="20" y="84" width="280" height="44" rx="6"/>
  <text class="d-text" x="40" y="112">id = 4</text>
  <rect class="d-box" x="20" y="138" width="280" height="44" rx="6"/>
  <text class="d-text" x="40" y="166">name = Omar</text>
  <rect class="d-box-accent" x="20" y="192" width="280" height="44" rx="6"/>
  <text class="d-text" x="40" y="220">manager_id = 2</text>
  <rect class="d-box-muted" x="460" y="20" width="280" height="44" rx="8"/>
  <text class="d-text" x="600" y="48" text-anchor="middle">employees AS m (the manager)</text>
  <rect class="d-box-accent" x="460" y="84" width="280" height="44" rx="6"/>
  <text class="d-text" x="480" y="112">id = 2</text>
  <rect class="d-box" x="460" y="138" width="280" height="44" rx="6"/>
  <text class="d-text" x="480" y="166">name = Raj</text>
  <rect class="d-box" x="460" y="192" width="280" height="44" rx="6"/>
  <text class="d-text" x="480" y="220">manager_id = 1</text>
  <path class="d-edge-accent" d="M 304 214 L 380 214 L 380 106 L 454 106" marker-end="url(#sql04q1-arrow)"/>
  <text class="d-accent" x="380" y="270" text-anchor="middle">ON m.id = e.manager_id</text>
</svg>

The two boxes are the same table. Alias \`e\` plays the employee, alias \`m\` plays the manager, and the join condition \`m.id = e.manager_id\` connects a row of \`e\` to the row of \`m\` that is its manager.

This is the hierarchy stored in the example data:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 310" role="img" aria-label="The hierarchy stored in the employees table: Maya at the top, Raj and Lena below her, then Omar, Priya, Tom and Zoe, and Ivan below Omar">
  <rect class="d-box-accent" x="310" y="16" width="140" height="40" rx="8"/>
  <text class="d-text" x="380" y="41" text-anchor="middle">Maya (CEO)</text>
  <rect class="d-box" x="150" y="96" width="140" height="40" rx="8"/>
  <text class="d-text" x="220" y="121" text-anchor="middle">Raj</text>
  <rect class="d-box" x="470" y="96" width="140" height="40" rx="8"/>
  <text class="d-text" x="540" y="121" text-anchor="middle">Lena</text>
  <rect class="d-box" x="20" y="176" width="120" height="40" rx="8"/>
  <text class="d-text" x="80" y="201" text-anchor="middle">Omar</text>
  <rect class="d-box" x="190" y="176" width="120" height="40" rx="8"/>
  <text class="d-text" x="250" y="201" text-anchor="middle">Priya</text>
  <rect class="d-box" x="450" y="176" width="120" height="40" rx="8"/>
  <text class="d-text" x="510" y="201" text-anchor="middle">Tom</text>
  <rect class="d-box" x="620" y="176" width="120" height="40" rx="8"/>
  <text class="d-text" x="680" y="201" text-anchor="middle">Zoe</text>
  <rect class="d-box-muted" x="20" y="256" width="120" height="40" rx="8"/>
  <text class="d-text" x="80" y="281" text-anchor="middle">Ivan</text>
  <line class="d-edge" x1="350" y1="56" x2="240" y2="96"/>
  <line class="d-edge" x1="410" y1="56" x2="520" y2="96"/>
  <line class="d-edge" x1="190" y1="136" x2="90" y2="176"/>
  <line class="d-edge" x1="80" y1="216" x2="80" y2="256"/>
  <line class="d-edge" x1="240" y1="136" x2="250" y2="176"/>
  <line class="d-edge" x1="520" y1="136" x2="510" y2="176"/>
  <line class="d-edge" x1="570" y1="136" x2="670" y2="176"/>
</svg>

## 3. Pattern 1: Each Row Next to Its Parent

The first example lists every employee next to their manager:

~~~sql
SELECT e.name AS employee, e.title, m.name AS manager
FROM employees AS e
LEFT JOIN employees AS m ON m.id = e.manager_id
ORDER BY e.id;
~~~

~~~text
employee | title | manager
Maya | CEO | NULL
Raj | VP Engineering | Maya
Lena | VP Sales | Maya
Omar | Staff Engineer | Raj
Priya | Engineer | Raj
Tom | Account Exec | Lena
Zoe | Account Exec | Lena
Ivan | Intern | Omar
~~~

Read the join condition carefully: \`m.id = e.manager_id\` means "the manager row is the one whose id equals my manager_id". Swapping it to \`m.manager_id = e.id\` asks the opposite question (who reports *to* me) and gives a different result.

**Why \`LEFT JOIN\`?** Maya is the CEO and her \`manager_id\` is NULL, so no \`m\` row matches her. A \`LEFT JOIN\` keeps her with a NULL manager. With an \`INNER JOIN\` she disappears: the same query with \`JOIN\` returned 7 rows instead of 8 when run here. For the full family of join types see [What are the different types of SQL joins?](/interview-question/what-are-the-different-types-of-sql-joins)

**Why the aliases are not optional.** Leaving them out (\`SELECT name FROM employees JOIN employees ON id = manager_id\`) fails on both engines run for this page:

~~~text
SQLite:      ambiguous column name: name
PostgreSQL:  ERROR:  table name "employees" specified more than once
~~~

## 4. Pattern 2: Compare a Row With a Related Row

Once each row sits next to its related row, any column of one can be compared with the other. The classic interview question is "find employees who earn more than their manager":

~~~text
employee | salary | manager | manager_salary
Omar | 190000 | Raj | 180000
Zoe | 175000 | Lena | 170000
~~~

Omar (190,000) out-earns Raj (180,000), and Zoe (175,000) out-earns Lena (170,000). Here an \`INNER JOIN\` is correct: Maya has no manager, so there is nothing to compare her with.

Other questions in the same shape: "orders placed by a customer who was referred by another customer in the same city", "products cheaper than the product they replaced", "flights whose arrival airport is another flight departure airport".

## 5. Pattern 3: Pairs Inside a Group

A self join on a non-key column builds pairs: every employee joined to every colleague in the same department. The trap is that the plain condition produces too much:

| Join condition | Rows on this data | What you get |
| :--- | :--- | :--- |
| \`a.dept = b.dept\` | 26 | Every pair twice, plus everyone paired with themselves |
| \`a.dept = b.dept AND a.id <> b.id\` | 18 | Self-pairs gone, but (Raj, Omar) and (Omar, Raj) both appear |
| \`a.dept = b.dept AND a.id < b.id\` | 9 | Each unordered pair exactly once |

(Counts from running \`SELECT count(*)\` with each condition on SQLite. Eng has 4 people and Sales 3, so the first line is 4 × 4 + 3 × 3 + 1 × 1 = 26.) The third example uses \`a.id < b.id\`:

~~~text
dept | first_person | second_person
Eng | Raj | Omar
Eng | Raj | Priya
Eng | Raj | Ivan
Eng | Omar | Priya
Eng | Omar | Ivan
Eng | Priya | Ivan
Sales | Lena | Tom
Sales | Lena | Zoe
Sales | Tom | Zoe
~~~

📌 **Interview term: mirror duplicates** — the pair (A, B) and the pair (B, A) produced by a symmetric join condition. \`a.id < b.id\` keeps one of each, because exactly one of the two orderings has the smaller id on the left.

Notice the row count grows with the square of the group size. On a real table, joining on a low-selectivity column like \`dept\` can produce millions of pairs; this is the same growth a [CROSS JOIN](/interview-question/what-is-a-cross-join-and-when-is-it-useful) has, limited to each group. The same pairing trick is the basis of one way to find duplicates ([How do you find duplicate rows in a table?](/interview-question/how-do-you-find-duplicate-rows-in-a-table)).

## 6. Going Further: More Levels and Counts

**Two levels up** needs a third alias. Each extra level is one more join:

~~~sql
SELECT e.name, g.name AS grand_manager
FROM employees AS e
JOIN employees AS m ON m.id = e.manager_id
JOIN employees AS g ON g.id = m.manager_id
ORDER BY e.id;
~~~

~~~text
name | grand_manager
Omar | Maya
Priya | Maya
Tom | Maya
Zoe | Maya
Ivan | Raj
~~~

(Output from running it on SQLite with the schema above.) This works only when the depth is known in advance. For "everyone under Raj, at any depth", use a recursive CTE: [Recursive CTE for an org chart — how do you list all reports (direct + indirect) of a manager?](/interview-question/recursive-cte-for-an-org-chart-how-do-you-list-all-reports-direct-indirect-of-a-) and the fundamentals in [How do recursive CTEs work?](/interview-question/how-do-recursive-ctes-work)

**Counting direct reports** turns the join around (manager on the left) and groups. \`LEFT JOIN\` plus \`COUNT(e.id)\` keeps people with zero reports:

~~~sql
SELECT m.name AS manager, COUNT(e.id) AS direct_reports
FROM employees AS m
LEFT JOIN employees AS e ON e.manager_id = m.id
GROUP BY m.id, m.name
ORDER BY m.id;
~~~

~~~text
manager | direct_reports
Maya | 2
Raj | 2
Lena | 2
Omar | 1
Priya | 0
Tom | 0
Zoe | 0
Ivan | 0
~~~

\`COUNT(e.id)\` rather than \`COUNT(*)\` matters: the NULL-padded row of a person with no reports would count as 1 with \`COUNT(*)\`. See [What is the difference between COUNT(*), COUNT(col), and COUNT(DISTINCT col)?](/interview-question/what-is-the-difference-between-count-count-col-and-count-distinct-col)

**Comparing consecutive rows** (this month against last month) can be done with a self join on \`b.seq = a.seq + 1\`, but window functions do it more simply: [What do the LAG and LEAD window functions do?](/interview-question/what-do-the-lag-and-lead-window-functions-do)

## 7. What the Database Actually Does

There is nothing special about a self join inside the engine. The fourth example asks PostgreSQL for the plan:

~~~text
QUERY PLAN
Sort
  Sort Key: e.id
  ->  Hash Left Join
        Hash Cond: (e.manager_id = m.id)
        ->  Seq Scan on employees e
        ->  Hash
              ->  Seq Scan on employees m
~~~

📌 **Interview term: hash join** — the engine reads one input into an in-memory hash table keyed on the join column, then streams the other input and looks each row up. Here the build side is \`employees m\` and the probe side is \`employees e\`: the *same table* scanned twice, exactly as if they were two different tables. On a tiny table without statistics the planner picks sequential scans; on real data with an index on \`manager_id\` it may choose an index-based nested loop instead. For reading plans see [How do you read an EXPLAIN query plan?](/interview-question/how-do-you-read-an-explain-query-plan)

The practical consequence: index the column you join on. PostgreSQL creates an index for the primary key \`id\` but not for the foreign key \`manager_id\`, so "who reports to Raj?" (\`WHERE manager_id = 2\`) scans the table until you add \`CREATE INDEX ON employees (manager_id)\`.

## 8. Verified: Running the Code

The three SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above). The PostgreSQL example was run on PostgreSQL 16.15 in a scratch database with the same schema; the error messages and the extra queries in sections 3, 5 and 6 were run the same way.

Example 1, employee and manager:

~~~text
employee | title | manager
Maya | CEO | NULL
Raj | VP Engineering | Maya
Lena | VP Sales | Maya
Omar | Staff Engineer | Raj
Priya | Engineer | Raj
Tom | Account Exec | Lena
Zoe | Account Exec | Lena
Ivan | Intern | Omar
~~~

Example 2, earning more than the manager:

~~~text
employee | salary | manager | manager_salary
Omar | 190000 | Raj | 180000
Zoe | 175000 | Lena | 170000
~~~

Example 3, pairs in the same department:

~~~text
dept | first_person | second_person
Eng | Raj | Omar
Eng | Raj | Priya
Eng | Raj | Ivan
Eng | Omar | Priya
Eng | Omar | Ivan
Eng | Priya | Ivan
Sales | Lena | Tom
Sales | Lena | Zoe
Sales | Tom | Zoe
~~~

Example 4, the PostgreSQL plan:

~~~text
QUERY PLAN
Sort
  Sort Key: e.id
  ->  Hash Left Join
        Hash Cond: (e.manager_id = m.id)
        ->  Seq Scan on employees e
        ->  Hash
              ->  Seq Scan on employees m
~~~

## Edge Cases

- **The root row.** Any row with a NULL parent pointer vanishes from an \`INNER\` self join. Decide deliberately whether it belongs in the result.
- **Cycles.** Nothing in a plain foreign key stops A managing B and B managing A. A fixed self join will not loop, but a recursive walk will: see [Recursive CTE with cycle detection — how do you handle circular manager references and produce a search order?](/interview-question/recursive-cte-with-cycle-detection-how-do-you-handle-circular-manager-references)
- **A row that is its own parent.** \`manager_id = id\` makes the row match itself in \`ON m.id = e.manager_id\`. Add \`CHECK (manager_id <> id)\` if that should be impossible.
- **Ambiguous \`SELECT *\`.** Both copies have the same column names, so \`SELECT *\` returns \`name\` twice. Name and alias the columns you want.

## Common Pitfalls

- **Using \`INNER JOIN\` when the hierarchy has a root**, then wondering why the CEO is missing from the report.
- **Writing the join condition backwards** (\`m.manager_id = e.id\`), which lists each person next to one of their *reports*, repeated once per report.
- **Building pairs with \`<>\` instead of \`<\`**, which returns every pair twice and doubles any sum computed over the pairs.
- **Chaining self joins for an unknown depth.** Three self joins answer "three levels"; the fourth level silently goes missing. Use a recursive CTE.
- **Forgetting the index on the parent pointer.** Every "children of X" lookup scans the table without one.
- **Using \`NOT IN (SELECT manager_id FROM employees)\` to find people who manage nobody.** The CEO NULL \`manager_id\` makes \`NOT IN\` return no rows; see [What is the difference between NOT IN and NOT EXISTS when NULLs are involved?](/interview-question/what-is-the-difference-between-not-in-and-not-exists-when-nulls-are-involved)

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">self join</strong> is a normal join where both sides are the same table. It is not a separate join type: I write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">employees AS e JOIN employees AS m</code> and the database treats the two aliases as two independent inputs.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why aliases:</strong> <span style="color:#f0e2c8;">Without aliases every column is ambiguous. SQLite says <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ambiguous column name</code>, PostgreSQL refuses with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">table name "employees" specified more than once</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The classic use:</strong> <span style="color:#f0e2c8;">A self-referencing foreign key, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">manager_id REFERENCES employees(id)</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ON m.id = e.manager_id</code> puts each employee next to their manager. I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LEFT JOIN</code> so the CEO, whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">manager_id</code> is NULL, is not dropped.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Other patterns:</strong> <span style="color:#f0e2c8;">Comparing related rows, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE e.salary &gt; m.salary</code>, and building pairs inside a group with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a.dept = b.dept AND a.id &lt; b.id</code>, which removes self-pairs and mirror duplicates.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Limits:</strong> <span style="color:#f0e2c8;">One self join walks exactly one level. Two levels need a second alias; unknown depth needs a <strong style="color:#ffca28;">recursive CTE</strong>. And index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">manager_id</code>, because PostgreSQL does not index foreign key columns for you.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a.id &lt; b.id</code> instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a.id &lt;&gt; b.id</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;&gt;</code> removes the self-pairs but keeps both (Raj, Omar) and (Omar, Raj): 18 rows on this data. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code> keeps only one ordering of each pair: 9 rows. With plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">=</code> on dept you get 26, including everyone paired with themselves.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you find employees who manage nobody?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An anti-join: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.manager_id = m.id)</code>, or a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LEFT JOIN</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">e.manager_id = m.id</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE e.id IS NULL</code>. Avoid <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT IN (SELECT manager_id ...)</code> here: the CEO row has a NULL <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">manager_id</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT IN</code> against a list containing NULL returns nothing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the whole chain of command, not just the direct manager?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A recursive CTE: the anchor selects the starting employee, the recursive part joins <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">employees</code> to the previous level on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">manager_id</code>. A fixed number of self joins only works when the depth is known.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a self join slow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No slower than any other join of the same sizes. The plan shows two scans of the same table and a hash or nested loop join. The real cost is a missing index on the join column, or an accidental near-Cartesian pairing like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a.dept = b.dept</code> on a big table.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use a self join to compare consecutive rows?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, by joining on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b.seq = a.seq + 1</code>, but that needs gapless numbering. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LAG()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LEAD()</code> window functions do it in one pass and are what I would use today.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Self join | A join whose two sides are the same table, told apart by aliases |
| Table alias | A short name for a table in \`FROM\`; mandatory in a self join |
| Self-referencing foreign key | A foreign key pointing at its own table primary key, like \`manager_id\` |
| Adjacency list | Storing a tree as one parent pointer per row |
| Mirror duplicates | (A, B) and (B, A) from a symmetric condition; removed with \`a.id < b.id\` |
| Hash join | A join that builds a hash table from one input and probes it with the other |

**Conclusion:** A self join is nothing more than an ordinary join in which the same table plays two roles, each under its own alias. It shines on self-referencing data: put each row next to its parent with \`ON m.id = e.manager_id\` (with a \`LEFT JOIN\` so the root survives), compare a row with its related row, or build pairs inside a group with \`a.id < b.id\`. Know its limits — one level per join, so use a recursive CTE for unknown depth — and remember that the engine just scans the table twice, so the join column needs an index like any other.`,
    examples: [
      {
        label: `Every employee next to their manager (LEFT JOIN keeps the CEO)`,
        code: `SELECT e.name AS employee, e.title, m.name AS manager
FROM employees AS e
LEFT JOIN employees AS m ON m.id = e.manager_id
ORDER BY e.id;`,
      },
      {
        label: `Compare a row with a related row: who earns more than their manager?`,
        code: `SELECT e.name AS employee, e.salary, m.name AS manager, m.salary AS manager_salary
FROM employees AS e
JOIN employees AS m ON m.id = e.manager_id
WHERE e.salary > m.salary
ORDER BY e.id;`,
      },
      {
        label: `Pairs of colleagues in the same department, each pair once`,
        code: `SELECT a.dept, a.name AS first_person, b.name AS second_person
FROM employees AS a
JOIN employees AS b
  ON a.dept = b.dept
 AND a.id < b.id
ORDER BY a.dept, a.id, b.id;`,
      },
      {
        label: `PostgreSQL: the plan reads the same table twice, as two inputs`,
        code: `EXPLAIN (COSTS OFF)
SELECT e.name AS employee, m.name AS manager
FROM employees AS e
LEFT JOIN employees AS m ON m.id = e.manager_id
ORDER BY e.id;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `What is a CROSS JOIN and when is it useful?`,
    difficulty: "easy",
    seoDescription: `A CROSS JOIN returns every pairing of two inputs (n × m rows). When it helps: combinations, gap-filling grids, one-row totals, and the accidental kind.`,
    description: `**Question presented to candidate:**
"What does a CROSS JOIN return? Most people say you should never use one — can you give me a case where it is actually the right tool, and tell me what can go wrong with it?"

**What a strong answer should cover:**
- A CROSS JOIN returns the Cartesian product: every row of the left input paired with every row of the right, so the row count is n × m, with no join condition
- Legitimate uses: generating combinations (sizes × colors), building a complete grid (stores × months) to \`LEFT JOIN\` real data onto so missing cells show as 0, and attaching a one-row result (a grand total, a config row) to every row
- Equivalent spellings: \`FROM a, b\` and \`JOIN ... ON TRUE\`; the danger is an accidental product from a forgotten join condition
- If either side is empty the result is empty; use \`LEFT JOIN ... ON TRUE\` to keep the left rows
- Engine details: PostgreSQL rejects \`CROSS JOIN ... ON\` and a bare \`JOIN\` without \`ON\`, SQLite accepts both, and SQLite never reorders the two sides of a \`CROSS JOIN\`

**Code / implementation expected:** Yes — a combinations query and, ideally, a calendar or grid query that fills gaps.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE sizes (
  size TEXT PRIMARY KEY,
  sort_order INTEGER NOT NULL
);
CREATE TABLE colors (
  color TEXT PRIMARY KEY
);
CREATE TABLE stores (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE months (
  month TEXT PRIMARY KEY
);
CREATE TABLE sales (
  store_id INTEGER NOT NULL REFERENCES stores(id),
  month TEXT NOT NULL,
  amount INTEGER NOT NULL
);
INSERT INTO sizes (size, sort_order) VALUES ('S', 1), ('M', 2), ('L', 3);
INSERT INTO colors (color) VALUES ('Black'), ('Navy'), ('White');
INSERT INTO stores (id, name) VALUES (1, 'Downtown'), (2, 'Airport');
INSERT INTO months (month) VALUES ('2024-01'), ('2024-02'), ('2024-03');
INSERT INTO sales (store_id, month, amount) VALUES
  (1, '2024-01', 500),
  (1, '2024-03', 300),
  (2, '2024-01', 200),
  (2, '2024-02', 400),
  (2, '2024-03', 600);
\`\`\``,
    answer: `**Target Audience:** Beginners who have seen INNER and LEFT JOIN and want to know what the "join with no condition" is for, plus candidates who want the engine details.
**Difficulty:** Easy
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15, both run for this page. MySQL behaviour is cited from its manual.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and error message shown was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

A T-shirt shop sells three sizes (S, M, L) and three colors (Black, Navy, White). The owner wants a price board listing every shirt you can buy. Nobody types nine lines by hand: you take the list of sizes, the list of colors, and write down every possible pairing. Black-S, Black-M, Black-L, Navy-S, and so on.

That "every item from list one with every item from list two" operation is a CROSS JOIN. It sounds like something you would never want from a database, and on two big tables it is a disaster. But on small, deliberate inputs it is the cleanest way to generate combinations, calendars and report grids.

## 2. The Idea in Plain Language

📌 **Interview term: CROSS JOIN** — a join with no join condition. Each row of the left input is paired with each row of the right input.

📌 **Interview term: Cartesian product** — the mathematical name for that set of all pairs. If the left side has n rows and the right side m rows, the result has exactly n × m rows.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="Three sizes down the side and three colors across the top give a grid of nine combinations">
  <rect class="d-box-muted" x="260" y="20" width="140" height="44" rx="8"/>
  <text class="d-text" x="330" y="47" text-anchor="middle">Black</text>
  <rect class="d-box-muted" x="420" y="20" width="140" height="44" rx="8"/>
  <text class="d-text" x="490" y="47" text-anchor="middle">Navy</text>
  <rect class="d-box-muted" x="580" y="20" width="140" height="44" rx="8"/>
  <text class="d-text" x="650" y="47" text-anchor="middle">White</text>
  <rect class="d-box-muted" x="40" y="90" width="160" height="44" rx="8"/>
  <text class="d-text" x="120" y="117" text-anchor="middle">S</text>
  <rect class="d-box-muted" x="40" y="160" width="160" height="44" rx="8"/>
  <text class="d-text" x="120" y="187" text-anchor="middle">M</text>
  <rect class="d-box-muted" x="40" y="230" width="160" height="44" rx="8"/>
  <text class="d-text" x="120" y="257" text-anchor="middle">L</text>
  <rect class="d-box" x="260" y="90" width="140" height="44" rx="6"/>
  <text class="d-sub" x="330" y="117" text-anchor="middle">Black-S</text>
  <rect class="d-box" x="420" y="90" width="140" height="44" rx="6"/>
  <text class="d-sub" x="490" y="117" text-anchor="middle">Navy-S</text>
  <rect class="d-box" x="580" y="90" width="140" height="44" rx="6"/>
  <text class="d-sub" x="650" y="117" text-anchor="middle">White-S</text>
  <rect class="d-box" x="260" y="160" width="140" height="44" rx="6"/>
  <text class="d-sub" x="330" y="187" text-anchor="middle">Black-M</text>
  <rect class="d-box-accent" x="420" y="160" width="140" height="44" rx="6"/>
  <text class="d-accent" x="490" y="187" text-anchor="middle">Navy-M</text>
  <rect class="d-box" x="580" y="160" width="140" height="44" rx="6"/>
  <text class="d-sub" x="650" y="187" text-anchor="middle">White-M</text>
  <rect class="d-box" x="260" y="230" width="140" height="44" rx="6"/>
  <text class="d-sub" x="330" y="257" text-anchor="middle">Black-L</text>
  <rect class="d-box" x="420" y="230" width="140" height="44" rx="6"/>
  <text class="d-sub" x="490" y="257" text-anchor="middle">Navy-L</text>
  <rect class="d-box" x="580" y="230" width="140" height="44" rx="6"/>
  <text class="d-sub" x="650" y="257" text-anchor="middle">White-L</text>
</svg>

The first example produces the nine variants (sizes 3 × colors 3; \`SELECT count(*) FROM sizes CROSS JOIN colors\` returned 9 when run here):

~~~text
size | color | sku
S | Black | Black-S
M | Black | Black-M
L | Black | Black-L
S | Navy | Navy-S
M | Navy | Navy-M
L | Navy | Navy-L
S | White | White-S
M | White | White-M
L | White | White-L
~~~

📌 **Interview term: cardinality** — the number of rows a result has. For a CROSS JOIN it is the product of the input cardinalities, which is why it grows so fast:

| Left rows | Right rows | Result rows |
| :--- | :--- | :--- |
| 3 | 3 | 9 |
| 12 months | 50 stores | 600 |
| 10,000 | 10,000 | 100,000,000 |
| 100,000 | 100,000 | 10,000,000,000 |

An inner join is, logically, a cross join followed by a filter that keeps only the pairs matching \`ON\`. The engine never actually builds the product for an inner join (it uses hash, merge or index lookups), but this is the definition. See [What are the different types of SQL joins?](/interview-question/what-are-the-different-types-of-sql-joins)

## 3. Use 1: Gap Filling With a Complete Grid

A sales report per store per month has a classic problem: a month with no sales has no rows, so it is missing from the report instead of showing 0. Downtown sold nothing in February. A plain join shows only five cells, with Downtown February simply absent (run on SQLite):

~~~text
name | month | amount
Downtown | 2024-01 | 500
Downtown | 2024-03 | 300
Airport | 2024-01 | 200
Airport | 2024-02 | 400
Airport | 2024-03 | 600
~~~

The fix is to build the grid of every cell you *want* to see first, then attach the facts to it:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 210" role="img" aria-label="Gap filling: stores cross joined with months make a complete grid, then sales are left joined onto it">
  <defs>
    <marker id="sql04q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="20" width="170" height="60" rx="8"/>
  <text class="d-text" x="105" y="46" text-anchor="middle">stores</text>
  <text class="d-sub" x="105" y="68" text-anchor="middle">2 rows</text>
  <rect class="d-box" x="20" y="130" width="170" height="60" rx="8"/>
  <text class="d-text" x="105" y="156" text-anchor="middle">months</text>
  <text class="d-sub" x="105" y="178" text-anchor="middle">3 rows</text>
  <rect class="d-box-accent" x="290" y="75" width="190" height="60" rx="8"/>
  <text class="d-text" x="385" y="101" text-anchor="middle">CROSS JOIN</text>
  <text class="d-sub" x="385" y="123" text-anchor="middle">grid of 6 cells</text>
  <rect class="d-box" x="570" y="75" width="170" height="60" rx="8"/>
  <text class="d-text" x="655" y="101" text-anchor="middle">LEFT JOIN sales</text>
  <text class="d-sub" x="655" y="123" text-anchor="middle">empty cell gives 0</text>
  <path class="d-edge" d="M 194 50 L 240 50 L 240 95 L 284 95" marker-end="url(#sql04q2-arrow)"/>
  <path class="d-edge" d="M 194 160 L 240 160 L 240 115 L 284 115" marker-end="url(#sql04q2-arrow)"/>
  <path class="d-edge-accent" d="M 484 105 L 564 105" marker-end="url(#sql04q2-arrow)"/>
</svg>

\`stores CROSS JOIN months\` makes all 6 store-month cells; the \`LEFT JOIN\` to \`sales\` keeps cells with no sale; \`COALESCE(SUM(...), 0)\` turns their NULL into 0. The second example:

~~~text
store | month | revenue
Downtown | 2024-01 | 500
Downtown | 2024-02 | 0
Downtown | 2024-03 | 300
Airport | 2024-01 | 200
Airport | 2024-02 | 400
Airport | 2024-03 | 600
~~~

📌 **Interview term: densification (gap filling)** — turning sparse data (rows only where something happened) into a dense grid with a row for every combination. It is the main reason CROSS JOIN shows up in analytics work, often before [running totals](/interview-question/how-do-you-calculate-a-running-total-or-moving-average) or [month-over-month growth](/interview-question/how-do-you-calculate-year-over-year-or-month-over-month-growth-in-sql), where a missing month would shift every comparison by one.

Note where the condition \`sa.month = m.month\` lives: in the \`ON\` clause of the LEFT JOIN, not in \`WHERE\`. Moving it to \`WHERE\` would throw the empty cells away again; see [Does a filter in the ON clause behave differently from WHERE in a LEFT JOIN?](/interview-question/does-a-filter-in-the-on-clause-behave-differently-from-where-in-a-left-join)

In PostgreSQL you do not even need a \`months\` table: \`generate_series\` produces the dates. The fourth example extends the grid to April, a month with no data at all:

~~~text
store | month | revenue
Downtown | 2024-01 | 500
Downtown | 2024-02 | 0
Downtown | 2024-03 | 300
Downtown | 2024-04 | 0
Airport | 2024-01 | 200
Airport | 2024-02 | 400
Airport | 2024-03 | 600
Airport | 2024-04 | 0
~~~

📌 **Interview term: calendar table** — a permanent table holding one row per day (or month), used as the left side of gap-filling joins. In SQLite as built for this page (sql.js), \`generate_series\` does not exist (\`no such table: generate_series\` when tried), so a calendar table or a recursive CTE plays that role ([How do recursive CTEs work?](/interview-question/how-do-recursive-ctes-work)).

## 4. Use 2: Attach a One-Row Result to Every Row

A cross join with a one-row input does not multiply anything: n × 1 = n. That makes it a neat way to put a grand total, a config value or a "today" date next to every row. The third example computes each sale share of total revenue (2,000):

~~~text
store | month | amount | pct_of_total
Downtown | 2024-01 | 500 | 25
Downtown | 2024-03 | 300 | 15
Airport | 2024-01 | 200 | 10
Airport | 2024-02 | 400 | 20
Airport | 2024-03 | 600 | 30
~~~

The same could be written with a scalar subquery in the \`SELECT\` list or with a window function, \`SUM(amount) OVER ()\`, which computes the total without a separate scan ([What are window functions?](/interview-question/what-are-window-functions)). The cross join version is handy when the one-row input has several columns you want to use, such as a row of thresholds.

(Engine detail visible in that output: SQLite \`ROUND\` returns a REAL, and \`25.0\` displays as \`25\` on this page. PostgreSQL returns a \`numeric\` and prints \`25.0\`.)

## 5. Three Ways to Write It, and the Accidental Kind

These are equivalent on both engines run here:

~~~sql
SELECT ... FROM sizes CROSS JOIN colors;   -- explicit, preferred
SELECT ... FROM sizes, colors;             -- comma join, old style
SELECT ... FROM sizes JOIN colors ON TRUE; -- inner join with an always-true condition
~~~

(All three returned 9 rows on SQLite and on PostgreSQL here; \`ON 1 = 1\` works on both too.)

📌 **Interview term: accidental Cartesian product** — a cross join you did not mean to write, usually a comma join whose \`WHERE\` condition was forgotten. \`SELECT ... FROM stores, sales\` with no \`WHERE\` returned 10 rows (2 stores × 5 sales) when run here, each sale attached to *both* stores, and any \`SUM\` over it is doubled. Writing explicit \`JOIN ... ON\` for real joins and \`CROSS JOIN\` only when you mean it makes the intent visible in review.

**Engine differences, checked by running:**

| Syntax | SQLite 3.45 | PostgreSQL 16 |
| :--- | :--- | :--- |
| \`a CROSS JOIN b\` | yes | yes |
| \`a, b\` | yes | yes |
| \`a JOIN b\` with no \`ON\` | yes, treated as a cross join | \`ERROR:  syntax error at end of input\` |
| \`a CROSS JOIN b ON ...\` | yes, treated as an inner join | \`ERROR:  syntax error at or near "ON"\` |

MySQL goes further: its manual states that "In MySQL, JOIN, CROSS JOIN, and INNER JOIN are syntactic equivalents" and notes this differs from standard SQL ([MySQL 8.4 JOIN clause](https://dev.mysql.com/doc/refman/8.4/en/join.html)).

**SQLite uses CROSS JOIN to fix the join order.** SQLite runs joins as nested loops, and its query planner documentation says it will not reorder the tables of a \`CROSS JOIN\` ([SQLite query optimizer overview](https://www.sqlite.org/optoverview.html)). The left table is always the outer loop. On this page engine, with the condition moved into \`WHERE\`:

~~~text
stores JOIN sales ON ...                 SCAN sales, then SEARCH stores USING INTEGER PRIMARY KEY
stores CROSS JOIN sales WHERE ...        SCAN stores, then SEARCH sales USING AUTOMATIC COVERING INDEX
~~~

(Detail lines from \`EXPLAIN QUERY PLAN\` on SQLite 3.45.0.) The plain join let the planner put \`sales\` outside; the \`CROSS JOIN\` forced \`stores\` outside. PostgreSQL has no such rule: it treats a cross join with a \`WHERE\` condition like any inner join and picks the order itself. On PostgreSQL 16 both spellings gave the identical plan, a \`Hash Join\` that scans \`sales\` and probes a hash of \`stores\`.

## 6. Edge Case: an Empty Side Empties Everything

n × 0 = 0. Cross joining with an empty table returned \`count(*) = 0\` on both engines here, even though \`sizes\` has 3 rows. If the right side is optional (a table of discounts that may be empty), use \`LEFT JOIN ... ON TRUE\` instead, which kept all left rows with NULLs on the right:

~~~text
size | x
S | NULL
M | NULL
L | NULL
~~~

(SQLite, \`sizes LEFT JOIN empty_t ON 1\`; PostgreSQL gave the same with \`ON true\`.) The same applies to \`CROSS JOIN LATERAL\` in PostgreSQL: if the lateral subquery returns no rows for a left row, that row is dropped; see [What is a LATERAL join?](/interview-question/what-is-a-lateral-join)

## 7. Verified: Running the Code

The three SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above). The PostgreSQL example and the syntax errors in section 5 were run on PostgreSQL 16.15 in a scratch database with the same schema.

Example 1, all variants:

~~~text
size | color | sku
S | Black | Black-S
M | Black | Black-M
L | Black | Black-L
S | Navy | Navy-S
M | Navy | Navy-M
L | Navy | Navy-L
S | White | White-S
M | White | White-M
L | White | White-L
~~~

Example 2, the store × month grid:

~~~text
store | month | revenue
Downtown | 2024-01 | 500
Downtown | 2024-02 | 0
Downtown | 2024-03 | 300
Airport | 2024-01 | 200
Airport | 2024-02 | 400
Airport | 2024-03 | 600
~~~

Example 3, share of the grand total:

~~~text
store | month | amount | pct_of_total
Downtown | 2024-01 | 500 | 25
Downtown | 2024-03 | 300 | 15
Airport | 2024-01 | 200 | 10
Airport | 2024-02 | 400 | 20
Airport | 2024-03 | 600 | 30
~~~

Example 4, PostgreSQL with \`generate_series\`:

~~~text
store | month | revenue
Downtown | 2024-01 | 500
Downtown | 2024-02 | 0
Downtown | 2024-03 | 300
Downtown | 2024-04 | 0
Airport | 2024-01 | 200
Airport | 2024-02 | 400
Airport | 2024-03 | 600
Airport | 2024-04 | 0
~~~

## Common Pitfalls

- **Comma joins with a missing \`WHERE\` condition.** The classic accidental product: no error, just inflated rows and doubled sums.
- **Cross joining two large tables.** Always multiply the row counts before running it; anything past a few million rows is probably a bug.
- **Putting the fact filter in \`WHERE\` after a gap-filling grid.** \`WHERE sa.month = m.month\` removes the empty cells you built the grid to keep; it belongs in the \`ON\` clause.
- **Forgetting \`COALESCE\` around the aggregate.** The empty cells show NULL, not 0, until you wrap \`SUM(...)\`.
- **Assuming an empty side keeps the other side.** It empties the result; use \`LEFT JOIN ... ON TRUE\` for an optional side.
- **Porting SQLite-only syntax.** \`JOIN\` without \`ON\` and \`CROSS JOIN ... ON\` run on SQLite and fail on PostgreSQL.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">CROSS JOIN</strong> returns the <strong style="color:#ffca28;">Cartesian product</strong>: every left row paired with every right row, with no join condition. 3 sizes × 3 colors is 9 rows; the count is always n × m.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Real uses:</strong> <span style="color:#f0e2c8;">Generating combinations (every size and color), building a complete grid such as stores × months to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LEFT JOIN</code> the facts onto so missing cells show as 0, and attaching a one-row result such as a grand total to every row.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Spellings:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a CROSS JOIN b</code>, the old comma form <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FROM a, b</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">JOIN b ON TRUE</code> all mean the same. The comma form is where accidental products come from: forget the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code> condition and 2 stores × 5 sales becomes 10 rows.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Edge case:</strong> <span style="color:#f0e2c8;">If either side is empty the whole result is empty. When the right side is optional, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LEFT JOIN ... ON TRUE</code> so the left rows survive with NULLs.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Engine details:</strong> <span style="color:#f0e2c8;">PostgreSQL rejects <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CROSS JOIN ... ON</code> and a bare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">JOIN</code> without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ON</code>; SQLite accepts both. MySQL treats <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CROSS JOIN</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INNER JOIN</code> as synonyms. SQLite also never reorders the two sides of a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CROSS JOIN</code>, which is a documented way to force join order.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is a CROSS JOIN different from an INNER JOIN?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An inner join is logically a cross join followed by a filter on the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ON</code> condition. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CROSS JOIN</code> is the version with no filter. The planner does not literally build the product for an inner join; it uses hash, merge or index lookups.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you fill gaps in a time series?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Build the full list of periods (a calendar table, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">generate_series</code> in PostgreSQL, or a recursive CTE in SQLite), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CROSS JOIN</code> it with the entities, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LEFT JOIN</code> the facts and wrap the measure in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COALESCE(..., 0)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a CROSS JOIN expensive?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is exactly as big as n × m, so it is fine when one side is tiny (a one-row total, 12 months, 5 sizes) and disastrous when both are large: 100,000 × 100,000 is ten billion rows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">CROSS JOIN LATERAL</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In PostgreSQL a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LATERAL</code> subquery may refer to columns of the row to its left, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CROSS JOIN LATERAL (... LIMIT 3)</code> runs the subquery per left row, for example the top 3 orders per customer. Rows whose subquery returns nothing are dropped; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LEFT JOIN LATERAL ... ON TRUE</code> keeps them.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why would a query suddenly return millions of rows after a refactor?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually a lost join condition: a comma join whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code> predicate was removed, or a join on a column that is not unique on either side. Check the row counts of each input against the output.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| CROSS JOIN | A join with no condition: every left row with every right row |
| Cartesian product | The set of all pairs; n × m rows |
| Cardinality | The number of rows in a result |
| Densification (gap filling) | Building a complete grid so missing combinations appear with 0 |
| Calendar table | A table with one row per date, used as the grid for gap filling |
| Accidental Cartesian product | An unintended cross join from a missing join condition |

**Conclusion:** A CROSS JOIN pairs every row of one input with every row of the other, so its size is always n × m. That makes it dangerous on two big tables and genuinely useful on small, deliberate ones: generating every combination, building a complete store × month grid to \`LEFT JOIN\` real data onto, or attaching a one-row total to every row. Know the equivalent spellings, watch for the accidental product a forgotten comma-join condition creates, remember that an empty side empties the result, and mention the engine quirks: PostgreSQL is strict about \`ON\`, SQLite is lenient and uses \`CROSS JOIN\` to pin the join order.`,
    examples: [
      {
        label: `Every product variant: 3 sizes × 3 colors = 9 rows`,
        code: `SELECT s.size, c.color, c.color || '-' || s.size AS sku
FROM sizes AS s
CROSS JOIN colors AS c
ORDER BY c.color, s.sort_order;`,
      },
      {
        label: `Gap filling: a complete store × month grid, with 0 where there were no sales`,
        code: `SELECT st.name AS store, m.month, COALESCE(SUM(sa.amount), 0) AS revenue
FROM stores AS st
CROSS JOIN months AS m
LEFT JOIN sales AS sa
  ON sa.store_id = st.id
 AND sa.month = m.month
GROUP BY st.id, st.name, m.month
ORDER BY st.id, m.month;`,
      },
      {
        label: `Attach a one-row grand total to every row to compute a share`,
        code: `SELECT st.name AS store, sa.month, sa.amount,
       ROUND(100.0 * sa.amount / t.total, 1) AS pct_of_total
FROM sales AS sa
JOIN stores AS st ON st.id = sa.store_id
CROSS JOIN (SELECT SUM(amount) AS total FROM sales) AS t
ORDER BY st.id, sa.month;`,
      },
      {
        label: `PostgreSQL: cross join with generate_series instead of a months table`,
        code: `SELECT st.name AS store, to_char(m, 'YYYY-MM') AS month,
       COALESCE(SUM(sa.amount), 0) AS revenue
FROM stores AS st
CROSS JOIN generate_series(DATE '2024-01-01', DATE '2024-04-01', INTERVAL '1 month') AS m
LEFT JOIN sales AS sa
  ON sa.store_id = st.id
 AND sa.month = to_char(m, 'YYYY-MM')
GROUP BY st.id, st.name, m
ORDER BY st.id, m;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `Does a filter in the ON clause behave differently from WHERE in a LEFT JOIN?`,
    difficulty: "medium",
    seoDescription: `Yes: in a LEFT JOIN, ON decides what matches and keeps every left row, while WHERE runs after NULL padding and can turn it into an inner join.`,
    description: `**Question presented to candidate:**
"I want every customer with their paid orders, including customers who have none. I wrote \`LEFT JOIN orders ... WHERE o.status = 'paid'\` and some customers vanished. Why? Does it matter whether a condition goes in the ON clause or the WHERE clause?"

**What a strong answer should cover:**
- For an INNER JOIN it does not matter: ON and WHERE give the same rows
- For a LEFT JOIN it matters: ON decides which right rows *match*; unmatched left rows are still kept and padded with NULLs. WHERE runs afterwards and removes rows, including those NULL-padded ones
- So a right-table filter in WHERE turns the LEFT JOIN into an inner join (PostgreSQL even plans it as a plain \`Hash Join\`)
- A left-table filter in ON does not remove left rows; it only stops them from matching. To filter the left table, use WHERE
- \`WHERE o.status = 'paid' OR o.status IS NULL\` is not a fix: it keeps customers with no orders but still drops customers whose orders are all unpaid
- The deliberate use of WHERE on the right table: \`WHERE o.id IS NULL\` for an anti-join

**Code / implementation expected:** Yes — the same LEFT JOIN with the filter in ON and in WHERE, and the different results.

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
  status TEXT NOT NULL,
  total INTEGER NOT NULL
);
INSERT INTO customers (id, name, country) VALUES
  (1, 'Asha', 'IN'),
  (2, 'Ben', 'US'),
  (3, 'Chen', 'IN'),
  (4, 'Dara', 'UK'),
  (5, 'Eli', 'US');
INSERT INTO orders (id, customer_id, status, total) VALUES
  (1, 1, 'paid', 120),
  (2, 1, 'cancelled', 40),
  (3, 2, 'paid', 80),
  (4, 2, 'paid', 25),
  (5, 3, 'pending', 30),
  (6, 5, 'cancelled', 55);
\`\`\``,
    answer: `**Target Audience:** Anyone who has written a LEFT JOIN and been surprised by missing rows; interview candidates who need to explain why.
**Difficulty:** Medium
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15, both run for this page. The behaviour is defined by the SQL standard and is the same in MySQL and SQL Server.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and error message shown was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

A teacher prints the class list and wants to write, next to each student, the tests they scored an A on.

- **Version one:** go down the list; next to each name, write their A-grade tests. A student with no A gets an empty space. Everybody is still on the list. That is a filter in **ON**: it controls what gets written *next to* each name.
- **Version two:** next to each name write *all* their tests (or a blank if they took none). Then go down the sheet and cross out every line that does not show an A. The students with no A — including those with a blank — are now crossed out. That is a filter in **WHERE**: it runs afterwards, on whole lines.

Same condition, "grade = A", completely different list. That is the whole question.

## 2. When Each Clause Runs

📌 **Interview term: logical query processing order** — the order in which the clauses of a query are conceptually applied: \`FROM\` and the joins (with their \`ON\` conditions) first, then \`WHERE\`, then \`GROUP BY\`, \`HAVING\`, \`SELECT\`, \`ORDER BY\`. See [What is the logical order of execution of a SQL query?](/interview-question/what-is-the-logical-order-of-execution-of-a-sql-query)

For a LEFT JOIN the join step itself has two parts:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="Logical order: FROM and JOIN with the ON condition first, which keeps unmatched left rows padded with NULL, then WHERE, which removes rows">
  <defs>
    <marker id="sql04q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="20" width="300" height="70" rx="8"/>
  <text class="d-text" x="190" y="50" text-anchor="middle">customers LEFT JOIN orders</text>
  <text class="d-sub" x="190" y="74" text-anchor="middle">step 1: match rows using ON</text>
  <rect class="d-box-accent" x="40" y="130" width="300" height="70" rx="8"/>
  <text class="d-text" x="190" y="160" text-anchor="middle">add back unmatched customers</text>
  <text class="d-sub" x="190" y="184" text-anchor="middle">step 2: order columns become NULL</text>
  <rect class="d-box" x="40" y="240" width="300" height="70" rx="8"/>
  <text class="d-text" x="190" y="270" text-anchor="middle">WHERE</text>
  <text class="d-sub" x="190" y="294" text-anchor="middle">step 3: keep rows where it is TRUE</text>
  <path class="d-edge" d="M 190 90 L 190 124" marker-end="url(#sql04q3-arrow)"/>
  <path class="d-edge" d="M 190 200 L 190 234" marker-end="url(#sql04q3-arrow)"/>
  <rect class="d-box-muted" x="420" y="20" width="300" height="70" rx="8"/>
  <text class="d-text" x="570" y="50" text-anchor="middle">ON o.status = paid</text>
  <text class="d-sub" x="570" y="74" text-anchor="middle">fewer matches, no customer lost</text>
  <rect class="d-box-muted" x="420" y="240" width="300" height="70" rx="8"/>
  <text class="d-text" x="570" y="270" text-anchor="middle">WHERE o.status = paid</text>
  <text class="d-sub" x="570" y="294" text-anchor="middle">NULL status is not TRUE, row removed</text>
  <path class="d-edge-dashed" d="M 414 55 L 346 55" marker-end="url(#sql04q3-arrow)"/>
  <path class="d-edge-dashed" d="M 414 275 L 346 275" marker-end="url(#sql04q3-arrow)"/>
</svg>

📌 **Interview term: preserved table and null-supplying table** — in \`customers LEFT JOIN orders\`, \`customers\` is the **preserved** table (every row survives the join) and \`orders\` is the **null-supplying** table (its columns become NULL when there is no match).

📌 **Interview term: NULL padding (null-extended row)** — the row the LEFT JOIN adds for a preserved row with no match: the left columns are filled in, every right column is NULL.

The key fact: the \`ON\` condition is applied in step 1, *before* the padding in step 2. \`WHERE\` is applied in step 3, *after* it, so it sees the padded rows and can remove them.

## 3. The Data, Unfiltered

Five customers. Dara has no orders, Chen has only a pending one, Eli only a cancelled one. The plain LEFT JOIN, run on SQLite:

~~~text
name | order_id | status | total
Asha | 1 | paid | 120
Asha | 2 | cancelled | 40
Ben | 3 | paid | 80
Ben | 4 | paid | 25
Chen | 5 | pending | 30
Dara | NULL | NULL | NULL
Eli | 6 | cancelled | 55
~~~

## 4. Filter in ON vs Filter in WHERE

**Filter in ON** (first example). The condition \`o.status = 'paid'\` is part of the matching rule: an order matches a customer only if it belongs to them *and* is paid. Chen, Dara and Eli have no matching order, so they are padded with NULLs and kept:

~~~text
name | order_id | total
Asha | 1 | 120
Ben | 3 | 80
Ben | 4 | 25
Chen | NULL | NULL
Dara | NULL | NULL
Eli | NULL | NULL
~~~

**Filter in WHERE** (second example). The join first attaches every order (the table in section 3), then WHERE tests each row. For Dara the padded \`status\` is NULL, and \`NULL = 'paid'\` is not true but **unknown**, so the row is removed. Chen and Eli are removed because their status is not \`'paid'\`:

~~~text
name | order_id | total
Asha | 1 | 120
Ben | 3 | 80
Ben | 4 | 25
~~~

📌 **Interview term: three-valued logic** — in SQL a comparison can be TRUE, FALSE or UNKNOWN, and any comparison with NULL is UNKNOWN. WHERE keeps only TRUE rows. That is why NULL-padded rows fail almost every WHERE test on a right-table column. More in [How does SQL handle NULL values?](/interview-question/how-does-sql-handle-null-values)

The result is exactly what an INNER JOIN would return, so writing \`LEFT\` bought nothing.

📌 **Interview term: outer join reduction (outer-to-inner join conversion)** — when a WHERE condition rejects NULLs on the null-supplying side, the optimizer is allowed to turn the outer join into an inner join, because the padded rows could never survive anyway. The PostgreSQL example shows it:

~~~text
QUERY PLAN
Hash Join
  Hash Cond: (c.id = o.customer_id)
  ->  Seq Scan on customers c
  ->  Hash
        ->  Seq Scan on orders o
              Filter: (status = 'paid'::text)
~~~

The plan says \`Hash Join\`, not \`Hash Left Join\`. With the filter in ON instead, the same engine planned a \`Hash Left Join\` with \`Filter: (status = 'paid'::text)\` pushed down onto the orders scan (run here, same data). On other data the planner may choose a different join method, but the "left" disappears whenever the WHERE condition rejects NULLs.

## 5. The Opposite Trap: Left-Table Conditions in ON

The rule is not "put everything in ON". The third example asks for Indian customers and their orders, but writes the country test in ON:

~~~text
name | country | order_id
Asha | IN | 1
Asha | IN | 2
Ben | US | NULL
Chen | IN | 5
Dara | UK | NULL
Eli | US | NULL
~~~

Ben, Dara and Eli are still there. ON cannot remove a row of the preserved table, ever; a false ON condition only means "this customer matches no order", and the customer is padded and kept. PostgreSQL shows it as a \`Join Filter: (c.country = 'IN'::text)\` on a \`Hash Right Join\` (run here). The correct query puts the left-table filter in WHERE: \`... ON o.customer_id = c.id WHERE c.country = 'IN'\` returned only Asha (orders 1 and 2) and Chen (order 5).

**The rule of thumb for a LEFT JOIN:**

| Condition on | In \`ON\` | In \`WHERE\` |
| :--- | :--- | :--- |
| Right (null-supplying) table, e.g. \`o.status = 'paid'\` | Restricts which rows match; every left row kept | Removes the padded rows: behaves like an INNER JOIN |
| Left (preserved) table, e.g. \`c.country = 'IN'\` | Does **not** remove left rows; non-matching ones just get NULLs | Removes left rows: usually what you meant |
| \`o.id IS NULL\` | Meaningless here | The anti-join: left rows with no match |

## 6. The Fix That Is Not a Fix

A common attempt to rescue the WHERE version is to allow the NULLs through:

~~~sql
SELECT c.name, o.id AS order_id, o.status
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
WHERE o.status = 'paid' OR o.status IS NULL
ORDER BY c.id, o.id;
~~~

~~~text
name | order_id | status
Asha | 1 | paid
Ben | 3 | paid
Ben | 4 | paid
Dara | NULL | NULL
~~~

(Run on SQLite.) Dara is back, because she has no orders at all. But Chen and Eli are still missing: they *do* have orders, the join attached them, and those rows are neither paid nor NULL. The only correct fix is moving the condition into ON.

## 7. Where It Matters Most: Aggregates and Anti-Joins

**Counting with zeros.** "Paid orders per customer, including zero" needs the filter in ON and a right-table column in \`COUNT\`:

~~~sql
SELECT c.name, COUNT(o.id) AS paid_orders, COALESCE(SUM(o.total), 0) AS paid_total
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id AND o.status = 'paid'
GROUP BY c.id, c.name
ORDER BY c.id;
~~~

~~~text
name | paid_orders | paid_total
Asha | 1 | 120
Ben | 2 | 105
Chen | 0 | 0
Dara | 0 | 0
Eli | 0 | 0
~~~

With the filter moved to WHERE, the same query returned only Asha (1) and Ben (2): the zero rows were removed before \`GROUP BY\` ran. See [How does GROUP BY work with aggregate functions?](/interview-question/how-does-group-by-work-with-aggregate-functions) and [What do COALESCE and NULLIF do?](/interview-question/what-do-coalesce-and-nullif-do)

📌 **Interview term: anti-join** — "rows of A with no match in B". With a LEFT JOIN it uses *both* clauses on purpose: the match rule in ON, the "no match found" test in WHERE:

~~~sql
SELECT c.name
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id AND o.status = 'paid'
WHERE o.id IS NULL
ORDER BY c.id;
~~~

~~~text
name
Chen
Dara
Eli
~~~

Test a column that cannot be NULL in a real match (the primary key \`o.id\`), not a nullable one. \`NOT EXISTS\` says the same thing more directly; see [What is the difference between EXISTS and IN?](/interview-question/what-is-the-difference-between-exists-and-in) and [Why might EXISTS outperform a JOIN for existence checks?](/interview-question/why-might-exists-outperform-a-join-for-existence-checks)

**Inner joins really are the same.** For completeness: \`JOIN orders o ON o.customer_id = c.id AND o.status = 'paid'\` and the same join with \`WHERE o.status = 'paid'\` both returned Asha 1, Ben 3, Ben 4 on SQLite. For inner joins, put join keys in ON and filters in WHERE purely for readability.

## 8. Verified: Running the Code

The three SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above). The PostgreSQL example and the plans described in sections 4 and 5 were run on PostgreSQL 16.15 in a scratch database with the same schema. The extra queries in sections 3, 5, 6 and 7 were run on SQLite with the same schema.

Example 1, filter in ON:

~~~text
name | order_id | total
Asha | 1 | 120
Ben | 3 | 80
Ben | 4 | 25
Chen | NULL | NULL
Dara | NULL | NULL
Eli | NULL | NULL
~~~

Example 2, filter in WHERE:

~~~text
name | order_id | total
Asha | 1 | 120
Ben | 3 | 80
Ben | 4 | 25
~~~

Example 3, a left-table condition in ON:

~~~text
name | country | order_id
Asha | IN | 1
Asha | IN | 2
Ben | US | NULL
Chen | IN | 5
Dara | UK | NULL
Eli | US | NULL
~~~

Example 4, PostgreSQL plan for the WHERE version:

~~~text
QUERY PLAN
Hash Join
  Hash Cond: (c.id = o.customer_id)
  ->  Seq Scan on customers c
  ->  Hash
        ->  Seq Scan on orders o
              Filter: (status = 'paid'::text)
~~~

## Common Pitfalls

- **Filtering the right table in WHERE after a LEFT JOIN**, which silently turns it into an inner join and drops the rows the LEFT JOIN was meant to keep.
- **Patching it with \`OR col IS NULL\`**, which only restores left rows with no match at all, not those whose matches all fail the filter.
- **Filtering the left table in ON**, expecting fewer rows and getting the same number with extra NULLs.
- **\`COUNT(*)\` after a LEFT JOIN**, which counts the NULL-padded row as 1. Use \`COUNT(right_table.id)\`.
- **Anti-join on a nullable column.** \`WHERE o.coupon IS NULL\` cannot tell "no match" from "matched, but the coupon is NULL". Test the right table primary key.
- **Chaining joins after a LEFT JOIN with an INNER JOIN on the right table**, e.g. \`LEFT JOIN orders o ... JOIN payments p ON p.order_id = o.id\`: the inner join rejects the padded rows just like a WHERE would (checked on SQLite with a small \`payments\` table: Dara, who has no orders, disappeared). Use \`LEFT JOIN\` for the second join too.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Short answer:</strong> <span style="color:#f0e2c8;">For an <strong style="color:#ffca28;">INNER JOIN</strong> it makes no difference. For a <strong style="color:#ffca28;">LEFT JOIN</strong> it does, because of when each clause runs: ON is part of the join, WHERE filters the joined result afterwards.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What ON does:</strong> <span style="color:#f0e2c8;">In a LEFT JOIN, ON only decides which order rows <strong style="color:#ffca28;">match</strong> a customer. A customer with no matching order is still kept, with the order columns padded with NULL. So <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ON ... AND o.status = 'paid'</code> keeps all 5 customers and attaches only paid orders.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What WHERE does:</strong> <span style="color:#f0e2c8;">WHERE runs after the padding. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE o.status = 'paid'</code> evaluates to unknown on the NULL rows and drops them, so Chen, Dara and Eli vanish. The LEFT JOIN has become an inner join; PostgreSQL even plans it as a plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Hash Join</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The mirror trap:</strong> <span style="color:#f0e2c8;">A condition on the left table belongs in WHERE. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ON ... AND c.country = 'IN'</code> does not remove the US and UK customers; it only stops them matching any order, so they appear with NULLs.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Rule of thumb:</strong> <span style="color:#f0e2c8;">Right-table conditions that define the match go in ON; left-table conditions and "what rows do I want back" go in WHERE. The one deliberate WHERE on the right table is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE o.id IS NULL</code>, the anti-join.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you fix the WHERE version with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">OR o.status IS NULL</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. That keeps customers with no orders at all, but a customer whose orders are all cancelled or pending has non-NULL rows that fail both tests, so Chen and Eli still disappear. Move the condition into ON.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does it matter for a RIGHT JOIN or FULL JOIN?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, the same logic mirrored: for a RIGHT JOIN the preserved side is the right table, so conditions on the left table belong in ON. For a FULL JOIN both sides are preserved, and any WHERE condition on either side can remove the padded rows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a performance difference between ON and WHERE?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not for inner joins: the optimizer moves the predicates wherever it likes and the plans are identical. For outer joins the two forms are different queries, so compare results first, not speed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you find customers with no paid order?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'paid' WHERE o.id IS NULL</code> — the paid filter in ON, the IS NULL test in WHERE. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT EXISTS</code> expresses the same anti-join more directly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you count paid orders per customer, including zeros?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the filter in ON and count a right-table column: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COUNT(o.id)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COALESCE(SUM(o.total), 0)</code>. With the filter in WHERE, the zero rows are gone before GROUP BY ever sees them.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Logical query processing order | FROM/JOIN with ON, then WHERE, GROUP BY, HAVING, SELECT, ORDER BY |
| Preserved table / null-supplying table | The side of an outer join whose rows always survive / the side that becomes NULL |
| NULL padding (null-extended row) | The row added for an unmatched preserved row, right columns NULL |
| Three-valued logic | TRUE, FALSE, UNKNOWN; comparisons with NULL are UNKNOWN and WHERE keeps only TRUE |
| Outer join reduction | The optimizer turning an outer join into an inner join when WHERE rejects NULLs |
| Anti-join | Rows with no match on the other side; \`LEFT JOIN ... WHERE right.id IS NULL\` or \`NOT EXISTS\` |

**Conclusion:** ON and WHERE are interchangeable only for inner joins. In a LEFT JOIN, ON is the matching rule and runs before unmatched left rows are padded with NULLs, while WHERE runs afterwards and removes rows — including those padded ones, since a comparison with NULL is unknown. So a condition on the right table goes in ON when you want to keep every left row, and a condition on the left table goes in WHERE, because ON can never remove a preserved row. The one deliberate WHERE test on the right table is \`IS NULL\` on its key, the anti-join.`,
    examples: [
      {
        label: `Filter in ON: every customer kept, only paid orders attached`,
        code: `SELECT c.name, o.id AS order_id, o.total
FROM customers AS c
LEFT JOIN orders AS o
  ON o.customer_id = c.id
 AND o.status = 'paid'
ORDER BY c.id, o.id;`,
      },
      {
        label: `Same filter in WHERE: customers without a paid order disappear`,
        code: `SELECT c.name, o.id AS order_id, o.total
FROM customers AS c
LEFT JOIN orders AS o
  ON o.customer_id = c.id
WHERE o.status = 'paid'
ORDER BY c.id, o.id;`,
      },
      {
        label: `Trap: a condition on the LEFT table in ON does not filter customers`,
        code: `SELECT c.name, c.country, o.id AS order_id
FROM customers AS c
LEFT JOIN orders AS o
  ON o.customer_id = c.id
 AND c.country = 'IN'
ORDER BY c.id, o.id;`,
      },
      {
        label: `PostgreSQL: with the filter in WHERE, the plan is a plain inner Hash Join`,
        code: `EXPLAIN (COSTS OFF)
SELECT c.name, o.id AS order_id, o.total
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
WHERE o.status = 'paid';`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `What is the difference between UNION and UNION ALL?`,
    difficulty: "medium",
    seoDescription: `UNION ALL stacks two result sets as they are; UNION also removes duplicate rows, which costs a hash or sort. Rules, NULLs, errors and plans, all run.`,
    description: `**Question presented to candidate:**
"We collect leads from the website and from events, in two tables. I want one combined list. Should I use UNION or UNION ALL, what exactly is the difference, and what does it cost?"

**What a strong answer should cover:**
- Both stack the rows of two queries with the same number of columns; \`UNION ALL\` keeps every row, \`UNION\` removes duplicate rows from the combined result
- Duplicates are whole rows (every column compared), they are removed *within* a branch too, and two NULLs count as equal for this purpose
- The cost: \`UNION\` must sort or hash the whole result to find duplicates (PostgreSQL shows a \`HashAggregate\` or \`Unique\` over \`Append\`); \`UNION ALL\` just appends and can stream
- Rules: column count must match, types must be compatible (PostgreSQL is strict, SQLite is not), column names come from the first branch, one \`ORDER BY\` at the end applies to the whole result
- Default to \`UNION ALL\` when the branches cannot overlap or duplicates are wanted; use \`UNION\` only when you really need distinct rows
- The relatives: \`INTERSECT\` and \`EXCEPT\` (and their \`ALL\` forms in PostgreSQL)

**Code / implementation expected:** Optional — the same two queries combined both ways, with row counts.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE web_leads (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  city TEXT
);
CREATE TABLE event_leads (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  city TEXT
);
INSERT INTO web_leads (id, email, name, city) VALUES
  (1, 'asha@example.com', 'Asha', 'Pune'),
  (2, 'ben@example.com', 'Ben', 'Austin'),
  (3, 'ben@example.com', 'Ben', 'Austin'),
  (4, 'chen@example.com', NULL, 'Lyon');
INSERT INTO event_leads (id, email, name, city) VALUES
  (1, 'ben@example.com', 'Ben', 'Austin'),
  (2, 'chen@example.com', NULL, 'Lyon'),
  (3, 'dara@example.com', 'Dara', 'Oslo'),
  (4, 'asha@example.com', 'Asha K', 'Pune');
\`\`\``,
    answer: `**Target Audience:** Beginners combining results from two tables for the first time, and candidates who need the exact rules and the cost.
**Difficulty:** Medium
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15, both run for this page.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and error message shown was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

You are organising a party and two friends each bring a guest list. You want one list.

- The quick way: staple the second list under the first. Done in a second. Some people appear twice, and you may *want* that, for example to see who was invited by both friends. That is **UNION ALL**.
- The careful way: staple them, then go through the whole combined list, compare every name with every other, and strike out repeats. Correct if you need each guest once, but you had to read and compare everything. That is **UNION**.

The difference is not just "duplicates or not"; it is also that the careful way requires a full pass over everything before you can hand the list over.

## 2. The Two Operators

📌 **Interview term: set operator** — an operator that combines the *rows* of two complete queries (a join combines *columns*). SQL has three: \`UNION\`, \`INTERSECT\` and \`EXCEPT\`, each with an \`ALL\` variant in the standard.

📌 **Interview term: UNION ALL** — returns all rows of the first query followed by all rows of the second. Nothing is compared or removed.

📌 **Interview term: UNION (UNION DISTINCT)** — the same, then removes duplicate rows from the combined result. PostgreSQL also accepts the explicit spelling \`UNION DISTINCT\`; SQLite rejected it here with \`near "DISTINCT": syntax error\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 200" role="img" aria-label="UNION ALL: the rows of both queries are appended, 4 plus 4 gives 8 rows">
  <defs>
    <marker id="sql04q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="20" width="200" height="60" rx="8"/>
  <text class="d-text" x="120" y="46" text-anchor="middle">web_leads</text>
  <text class="d-sub" x="120" y="68" text-anchor="middle">4 rows</text>
  <rect class="d-box" x="20" y="120" width="200" height="60" rx="8"/>
  <text class="d-text" x="120" y="146" text-anchor="middle">event_leads</text>
  <text class="d-sub" x="120" y="168" text-anchor="middle">4 rows</text>
  <rect class="d-box-accent" x="310" y="70" width="180" height="60" rx="8"/>
  <text class="d-text" x="400" y="96" text-anchor="middle">Append</text>
  <text class="d-sub" x="400" y="118" text-anchor="middle">no comparison</text>
  <rect class="d-box" x="570" y="70" width="170" height="60" rx="8"/>
  <text class="d-text" x="655" y="96" text-anchor="middle">UNION ALL</text>
  <text class="d-sub" x="655" y="118" text-anchor="middle">8 rows</text>
  <path class="d-edge" d="M 224 50 L 265 50 L 265 90 L 304 90" marker-end="url(#sql04q4-arrow)"/>
  <path class="d-edge" d="M 224 150 L 265 150 L 265 110 L 304 110" marker-end="url(#sql04q4-arrow)"/>
  <path class="d-edge-accent" d="M 494 100 L 564 100" marker-end="url(#sql04q4-arrow)"/>
</svg>

<svg class="iq-diagram" width="100%" viewBox="0 0 760 200" role="img" aria-label="UNION: the same append, followed by a step that hashes or sorts every row to drop duplicates, 8 rows become 5">
  <defs>
    <marker id="sql04q4-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="70" width="160" height="60" rx="8"/>
  <text class="d-text" x="100" y="96" text-anchor="middle">Append</text>
  <text class="d-sub" x="100" y="118" text-anchor="middle">8 rows</text>
  <rect class="d-box-accent" x="270" y="60" width="240" height="80" rx="8"/>
  <text class="d-text" x="390" y="92" text-anchor="middle">remove duplicates</text>
  <text class="d-sub" x="390" y="118" text-anchor="middle">hash or sort all rows</text>
  <rect class="d-box" x="590" y="70" width="150" height="60" rx="8"/>
  <text class="d-text" x="665" y="96" text-anchor="middle">UNION</text>
  <text class="d-sub" x="665" y="118" text-anchor="middle">5 rows</text>
  <path class="d-edge" d="M 184 100 L 264 100" marker-end="url(#sql04q4-arrow2)"/>
  <path class="d-edge-accent" d="M 514 100 L 584 100" marker-end="url(#sql04q4-arrow2)"/>
</svg>

The data: \`web_leads\` has Ben twice (he filled in the form twice) and Chen with no name; \`event_leads\` has Ben and nameless Chen again, Dara, and Asha under a slightly different name, "Asha K". The first example counts:

~~~text
web_rows | event_rows | union_all_rows | union_rows
4 | 4 | 8 | 5
~~~

## 3. What Counts as a Duplicate

The second example shows the combined, de-duplicated list:

~~~text
email | name
asha@example.com | Asha
asha@example.com | Asha K
ben@example.com | Ben
chen@example.com | NULL
dara@example.com | Dara
~~~

Three rules are visible in those five rows:

1. **Whole rows are compared.** \`Asha\` and \`Asha K\` have the same email but a different name, so both stay. Select fewer columns and more rows become duplicates: \`SELECT email ... UNION SELECT email ...\` returned 4 rows here.
2. **Duplicates within one branch are removed too.** Ben appears twice in \`web_leads\` alone, and once in the result. \`UNION\` is not "rows of B not already in A"; it is "distinct rows of A and B together".
3. **NULLs count as equal.** The two \`(chen@example.com, NULL)\` rows collapsed into one, although \`NULL = NULL\` is not true in a \`WHERE\`. Set operators and \`DISTINCT\` use "is not distinct from" semantics. See [How does SQL handle NULL values?](/interview-question/how-does-sql-handle-null-values)

📌 **Interview term: union-compatible** — two queries can be combined by a set operator only if they return the same number of columns and each column pair has compatible types. Columns are matched by **position**, not by name.

Because the comparison is over the whole row, adding a column changes the answer. The third example adds a literal \`source\`:

~~~text
source | email | name
event | asha@example.com | Asha K
web | asha@example.com | Asha
event | ben@example.com | Ben
web | ben@example.com | Ben
event | chen@example.com | NULL
web | chen@example.com | NULL
event | dara@example.com | Dara
~~~

Now the web and event copies of Ben are different rows, so 7 rows remain. Only the duplicate *inside* \`web_leads\` (two identical \`web, ben\` rows) was removed. A literal source column is a common way to make branches disjoint; at that point \`UNION\` can at most remove in-branch duplicates, and \`UNION ALL\` is usually what you meant.

## 4. The Cost: Why UNION ALL Is Cheaper

To remove duplicates the engine must see every row before it can be sure a row is not a duplicate of a later one. It does that by **hashing** (build a hash table of rows seen) or **sorting** (sort everything, then drop neighbours that are equal). The fourth example shows PostgreSQL plan for \`UNION\`:

~~~text
QUERY PLAN
HashAggregate
  Group Key: web_leads.email, web_leads.name
  ->  Append
        ->  Seq Scan on web_leads
        ->  Seq Scan on event_leads
~~~

📌 **Interview term: Append node** — the plan step that outputs the rows of each child one after the other. For \`UNION ALL\` it is the whole plan; run here, the same query with \`UNION ALL\` planned as:

~~~text
Append
  ->  Seq Scan on web_leads
  ->  Seq Scan on event_leads
~~~

📌 **Interview term: HashAggregate / Unique** — the de-duplication step. With \`SET enable_hashagg = off\` the same \`UNION\` was planned as a sort followed by \`Unique\`, run here:

~~~text
Unique
  ->  Sort
        Sort Key: web_leads.email, web_leads.name
        ->  Append
              ->  Seq Scan on web_leads
              ->  Seq Scan on event_leads
~~~

On other data or settings the planner may choose either; what never changes is that \`UNION\` has an extra step over the full result. What that costs:

| | \`UNION ALL\` | \`UNION\` |
| :--- | :--- | :--- |
| Work beyond reading the inputs | None | Hash or sort every row |
| Memory | Constant, rows stream through | Hash table or sort of the whole result; may spill to disk |
| First row available | Immediately | After all input is read |
| \`LIMIT 10\` on top | Can stop after 10 rows | Must still read everything |
| Result order without \`ORDER BY\` | Not guaranteed (usually branch order) | Not guaranteed |

It is the same cost as \`SELECT DISTINCT\`, covered in [What does DISTINCT do and what is its cost?](/interview-question/what-does-distinct-do-and-what-is-its-cost)

## 5. The Rules, With the Real Error Messages

**Same number of columns.**

~~~text
SQLite:      SELECTs to the left and right of UNION do not have the same number of result columns
PostgreSQL:  ERROR:  each UNION query must have the same number of columns
~~~

**Compatible types.** \`SELECT id FROM web_leads UNION SELECT email FROM event_leads\` (an integer column over a text column):

~~~text
PostgreSQL:  ERROR:  UNION types integer and text cannot be matched
~~~

SQLite ran the same query without complaint, because SQLite columns do not have fixed types; it simply mixed integers and strings in one column. Do not rely on that if the query may move to another engine; cast explicitly.

**Column names come from the first branch.** \`SELECT email AS lead_email, name FROM web_leads UNION ALL SELECT email, name AS full_name FROM event_leads\` returned columns \`lead_email | name\`; the aliases in the second branch are ignored.

**One \`ORDER BY\`, at the end, for the whole result.** It may only name result columns (or positions):

~~~text
ORDER BY inside the first branch:
  SQLite:      ORDER BY clause should come after UNION not before
  PostgreSQL:  ERROR:  syntax error at or near "UNION"
ORDER BY lower(email) at the end:
  SQLite:      1st ORDER BY term does not match any column in the result set
  PostgreSQL:  ERROR:  invalid UNION/INTERSECT/EXCEPT ORDER BY clause
               DETAIL:  Only result column names can be used, not expressions or functions.
~~~

To sort or limit one branch, wrap it. PostgreSQL accepts \`(SELECT ... ORDER BY id LIMIT 1) UNION ALL (SELECT ... ORDER BY id LIMIT 1)\`; SQLite rejected the parentheses (\`near "(": syntax error\`) but accepted the same thing written as \`SELECT * FROM (SELECT ... LIMIT 1) UNION ALL SELECT * FROM (SELECT ... LIMIT 1)\`.

**Chains run left to right.** In \`A UNION ALL B UNION C\`, the final \`UNION\` de-duplicates everything before it: it returned 4 distinct emails here. In \`A UNION B UNION ALL C\` only \`A UNION B\` is de-duplicated, then \`C\` is appended: 8 rows here. Use parentheses (in PostgreSQL) or subqueries when the grouping matters.

## 6. The Relatives: INTERSECT and EXCEPT

| Operator | Returns | Duplicates |
| :--- | :--- | :--- |
| \`A UNION B\` | Rows in A or B | Removed |
| \`A UNION ALL B\` | Rows in A, then rows in B | Kept |
| \`A INTERSECT B\` | Rows in both | Removed |
| \`A EXCEPT B\` | Rows in A that are not in B | Removed |
| \`INTERSECT ALL\`, \`EXCEPT ALL\` | Same, counting copies | PostgreSQL only here; SQLite: \`near "ALL": syntax error\` |

On these tables, \`SELECT email FROM web_leads INTERSECT SELECT email FROM event_leads\` returned asha, ben and chen. \`EXCEPT\` returned no rows, because every web email also appears at events. In PostgreSQL \`EXCEPT ALL\` returned one \`ben@example.com\`: two copies in \`web_leads\` minus one in \`event_leads\`. \`NOT EXISTS\` is often the clearer way to write \`EXCEPT\` when the columns differ: [What is the difference between NOT IN and NOT EXISTS when NULLs are involved?](/interview-question/what-is-the-difference-between-not-in-and-not-exists-when-nulls-are-involved)

**Counting sources instead of removing them.** If the real question is "how many lists is each lead on", keep everything with \`UNION ALL\` and group:

~~~sql
SELECT email, COUNT(*) AS sources
FROM (SELECT email FROM web_leads UNION ALL SELECT email FROM event_leads)
GROUP BY email
ORDER BY email;
~~~

~~~text
email | sources
asha@example.com | 2
ben@example.com | 3
chen@example.com | 2
dara@example.com | 1
~~~

(Run on SQLite; PostgreSQL gave the same counts.) This is also the starting point for [How do you find duplicate rows in a table?](/interview-question/how-do-you-find-duplicate-rows-in-a-table)

## 7. Verified: Running the Code

The three SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above). The PostgreSQL example, the other plans in section 4 and the PostgreSQL errors in section 5 were run on PostgreSQL 16.15 in a scratch database with the same schema; the SQLite errors and extra queries in sections 5 and 6 on SQLite.

Example 1, row counts:

~~~text
web_rows | event_rows | union_all_rows | union_rows
4 | 4 | 8 | 5
~~~

Example 2, the UNION result:

~~~text
email | name
asha@example.com | Asha
asha@example.com | Asha K
ben@example.com | Ben
chen@example.com | NULL
dara@example.com | Dara
~~~

Example 3, with a source column:

~~~text
source | email | name
event | asha@example.com | Asha K
web | asha@example.com | Asha
event | ben@example.com | Ben
web | ben@example.com | Ben
event | chen@example.com | NULL
web | chen@example.com | NULL
event | dara@example.com | Dara
~~~

Example 4, PostgreSQL plan for UNION:

~~~text
QUERY PLAN
HashAggregate
  Group Key: web_leads.email, web_leads.name
  ->  Append
        ->  Seq Scan on web_leads
        ->  Seq Scan on event_leads
~~~

## Common Pitfalls

- **Using \`UNION\` by habit.** It costs a full hash or sort, and on disjoint branches it cannot remove anything. Default to \`UNION ALL\`.
- **Using \`UNION\` and losing rows you needed.** Two genuinely different events with identical column values (same customer, same amount, same day) collapse into one, and totals come out too low.
- **Expecting \`UNION\` to de-duplicate by one column.** It compares whole rows; "Asha" and "Asha K" both survive. De-duplicate by key with \`GROUP BY\` or \`ROW_NUMBER()\` instead.
- **Matching columns by name.** Set operators match by position; swapping two columns in one branch silently mixes data (and on SQLite even mixed types are accepted).
- **Putting \`ORDER BY\` in a branch**, or expecting the result to keep branch order without an \`ORDER BY\` at the end.
- **Forgetting that NULLs are equal here** while they are not equal in a join or \`WHERE\`; results differ from a hand-written "not already present" join.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Both stack rows:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION ALL</code> both put the rows of two queries one after the other. The queries must have the same number of columns with compatible types; the column names come from the first query.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The difference:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION ALL</code> keeps every row. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION</code> then removes duplicate rows from the <strong style="color:#ffca28;">whole</strong> result: 4 + 4 leads gave 8 rows with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION ALL</code> and 5 with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What a duplicate is:</strong> <span style="color:#f0e2c8;">A duplicate is a whole row, every column equal. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION</code> also removes duplicates inside a single branch, and treats two NULLs as equal, unlike <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">=</code>. Add a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">source</code> column and rows that differ only by source are no longer duplicates.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">To find duplicates the engine must hash or sort the entire result: PostgreSQL plans <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashAggregate</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Unique</code> + <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Sort</code> over the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Append</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION ALL</code> is just the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Append</code>, streams rows, and can stop early under a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LIMIT</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Default:</strong> <span style="color:#f0e2c8;">I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION ALL</code> unless I need distinct rows: when branches cannot overlap, for example different date ranges or a literal source column, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION</code> pays for a dedup step that cannot remove anything.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">UNION</code> the same as <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">UNION ALL</code> followed by <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">SELECT DISTINCT</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, logically: distinct rows over the combined result. On PostgreSQL 16 both produced the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashAggregate</code> over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Append</code> plan here. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GROUP BY</code> over a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION ALL</code> is the way to go when you want to count how many sources each row came from.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ORDER BY</code> go?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Once, at the end, and it sorts the whole combined result. An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY</code> inside a branch is an error (SQLite: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY clause should come after UNION not before</code>). To limit a branch, wrap it: parentheses in PostgreSQL, a subquery in SQLite.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the column types differ?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">PostgreSQL resolves one type per column and fails if it cannot: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION types integer and text cannot be matched</code>. SQLite accepts it, because its columns have no fixed types. Cast explicitly so the query is portable.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What are <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">INTERSECT</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">EXCEPT</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The other set operators: rows in both results, and rows in the first but not the second. Like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION</code> they remove duplicates by default; PostgreSQL also supports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INTERSECT ALL</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXCEPT ALL</code>, which SQLite rejects as a syntax error.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">UNION</code> replace an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">OR</code> that is slow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sometimes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE a = 1 OR b = 2</code> can become two index-friendly queries combined with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNION</code>, which also removes rows matching both. Check the plan first: on a test table with an index on each column, PostgreSQL 16 already used both indexes for the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OR</code> with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BitmapOr</code>, so the rewrite bought nothing there.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Set operator | Combines the rows of two queries: UNION, INTERSECT, EXCEPT |
| UNION ALL | All rows of both queries, nothing removed |
| UNION (UNION DISTINCT) | All rows of both, then duplicate rows removed |
| Union-compatible | Same number of columns, compatible types, matched by position |
| Append node | Plan step that outputs each child rows in turn; all a UNION ALL needs |
| HashAggregate / Unique | Plan steps that remove duplicates by hashing or by sorting |

**Conclusion:** \`UNION ALL\` stacks the rows of two union-compatible queries and stops; \`UNION\` stacks them and then removes duplicate rows from the entire result, comparing whole rows, inside each branch as well as across them, and treating NULLs as equal. That extra step is a hash or sort over everything, which costs memory, delays the first row and defeats an early \`LIMIT\`. So reach for \`UNION ALL\` by default, especially when the branches cannot overlap, and use \`UNION\` when you genuinely need each row once.`,
    examples: [
      {
        label: `Row counts: 4 + 4 rows give 8 with UNION ALL and 5 with UNION`,
        code: `SELECT
  (SELECT COUNT(*) FROM web_leads) AS web_rows,
  (SELECT COUNT(*) FROM event_leads) AS event_rows,
  (SELECT COUNT(*) FROM (
     SELECT email, name FROM web_leads
     UNION ALL
     SELECT email, name FROM event_leads)) AS union_all_rows,
  (SELECT COUNT(*) FROM (
     SELECT email, name FROM web_leads
     UNION
     SELECT email, name FROM event_leads)) AS union_rows;`,
      },
      {
        label: `UNION compares whole rows: duplicates inside one branch go too, NULLs count as equal`,
        code: `SELECT email, name FROM web_leads
UNION
SELECT email, name FROM event_leads
ORDER BY email, name;`,
      },
      {
        label: `Adding a source column changes what counts as a duplicate`,
        code: `SELECT 'web' AS source, email, name FROM web_leads
UNION
SELECT 'event', email, name FROM event_leads
ORDER BY email, source;`,
      },
      {
        label: `PostgreSQL: UNION adds a HashAggregate on top of the Append`,
        code: `EXPLAIN (COSTS OFF)
SELECT email, name FROM web_leads
UNION
SELECT email, name FROM event_leads;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `What is the difference between DELETE, TRUNCATE, and DROP?`,
    difficulty: "medium",
    seoDescription: `DELETE removes chosen rows, TRUNCATE empties a table at once, DROP removes the table. Rollback, triggers, identity, locks and space, all run.`,
    description: `**Question presented to candidate:**
"We need to clear out an \`audit_log\` table. A colleague says use DELETE, another says TRUNCATE, and someone suggested just dropping it. What does each one actually do, and how would you choose?"

**What a strong answer should cover:**
- \`DELETE\` removes chosen rows (or all, without \`WHERE\`), row by row, as normal DML: fires row triggers, checks foreign keys per row, can be rolled back, can return the deleted rows
- \`TRUNCATE\` removes all rows at once by replacing the table storage: much faster on big tables, gives the space back immediately, fires no \`ON DELETE\` triggers, can reset identity counters, and refuses when another table has a foreign key to it
- \`DROP TABLE\` removes the table itself: rows, definition, indexes, constraints, triggers and grants
- Transactions: in PostgreSQL and SQL Server all three can be rolled back; in MySQL \`TRUNCATE\` and \`DROP\` cause an implicit commit; SQLite has no \`TRUNCATE\` at all
- Locking and concurrency in PostgreSQL: \`DELETE\` takes a row-level lock mode, \`TRUNCATE\` an \`ACCESS EXCLUSIVE\` lock, and \`TRUNCATE\` is not MVCC-safe
- After a big \`DELETE\` in PostgreSQL the space is only reclaimed by \`VACUUM\`

**Clarifying questions expected:**
- Do we need all rows gone, or only old ones (for example older than 90 days)?
- Do other tables reference this one, and do triggers or replication depend on row-level deletes?
- Is the table being read or written concurrently while we clear it?

**Code / implementation expected:** Optional — the three statements, and ideally a demonstration of rollback or identity behaviour.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  total INTEGER NOT NULL
);
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY,
  event TEXT NOT NULL,
  created DATE NOT NULL
);
INSERT INTO customers (id, name) VALUES (1, 'Asha'), (2, 'Ben'), (3, 'Chen');
INSERT INTO orders (id, customer_id, total) VALUES (1, 1, 120), (2, 1, 35), (3, 2, 80), (4, 3, 15);
INSERT INTO audit_log (id, event, created) VALUES
  (1, 'login', '2024-01-05'),
  (2, 'export', '2024-01-19'),
  (3, 'login', '2024-02-02'),
  (4, 'password change', '2024-02-14'),
  (5, 'login', '2024-03-01'),
  (6, 'export', '2024-03-08');
\`\`\``,
    answer: `**Target Audience:** Beginners who need to remove data safely, and candidates preparing for the engine-specific follow-ups (transactions, locks, identity, space).
**Difficulty:** Medium
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15, both run for this page, including a two-session test on PostgreSQL. MySQL and SQL Server behaviour is cited from their manuals.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and error message shown was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

Think of a filing cabinet in an office.

- **DELETE** is pulling out specific folders, one at a time: "every folder from before February". You can be selective, a clerk writes each removal in the logbook, and if you change your mind before the end of the day you can put them back.
- **TRUNCATE** is tipping the whole drawer into the shredder bin and sliding in an empty one. Every folder goes, instantly, no matter how many there were. Nobody looks at the folders one by one.
- **DROP** is wheeling the entire cabinet out of the building. Not just the folders: the cabinet, its labels and its lock are gone too. To use it again you have to buy and set up a new one.

All three "get rid of the data", which is why people mix them up. They differ in *what* goes, *how fast*, *what else happens* (logbook, triggers, locks) and *whether you can undo it*.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| All rows, or only some (for example older than 90 days)? | Only \`DELETE\` takes a \`WHERE\`; partial cleanup rules out the other two |
| Will the table still be needed? | If not, \`DROP\`; if yes, its definition must survive |
| Do other tables have foreign keys to it? | \`TRUNCATE\` refuses, and \`DROP\` refuses, unless you cascade |
| Are there \`ON DELETE\` triggers, audit logic or logical replication relying on row deletes? | \`TRUNCATE\` skips row triggers |
| Is the table busy while we do this? | \`TRUNCATE\` and \`DROP\` need an exclusive lock in PostgreSQL; a huge \`DELETE\` holds row locks and bloats |
| Which engine? | Rollback, identity reset and even the existence of \`TRUNCATE\` differ |

## 3. The Three Commands

📌 **Interview term: DML vs DDL** — **Data Manipulation Language** statements change rows (\`INSERT\`, \`UPDATE\`, \`DELETE\`); **Data Definition Language** statements change structure (\`CREATE\`, \`ALTER\`, \`DROP\`). \`TRUNCATE\` sits in between: it only removes rows, but it works on the whole table at once like DDL; the MySQL manual, for one, classifies it as DDL ([MySQL TRUNCATE](https://dev.mysql.com/doc/refman/8.4/en/truncate-table.html)).

<svg class="iq-diagram" width="100%" viewBox="0 0 760 270" role="img" aria-label="What remains after each command. DELETE with WHERE keeps the table and the other rows. TRUNCATE keeps the table definition with no rows. DROP removes the table itself">
  <rect class="d-box-muted" x="20" y="20" width="220" height="44" rx="8"/>
  <text class="d-text" x="130" y="48" text-anchor="middle">DELETE ... WHERE</text>
  <rect class="d-box-muted" x="270" y="20" width="220" height="44" rx="8"/>
  <text class="d-text" x="380" y="48" text-anchor="middle">TRUNCATE</text>
  <rect class="d-box-muted" x="520" y="20" width="220" height="44" rx="8"/>
  <text class="d-text" x="630" y="48" text-anchor="middle">DROP TABLE</text>
  <rect class="d-box-accent" x="20" y="90" width="220" height="44" rx="6"/>
  <text class="d-text" x="130" y="118" text-anchor="middle">definition kept</text>
  <rect class="d-box" x="20" y="150" width="220" height="44" rx="6"/>
  <text class="d-sub" x="130" y="178" text-anchor="middle">chosen rows removed</text>
  <rect class="d-box-accent" x="20" y="210" width="220" height="44" rx="6"/>
  <text class="d-text" x="130" y="238" text-anchor="middle">other rows kept</text>
  <rect class="d-box-accent" x="270" y="90" width="220" height="44" rx="6"/>
  <text class="d-text" x="380" y="118" text-anchor="middle">definition kept</text>
  <rect class="d-box" x="270" y="150" width="220" height="44" rx="6"/>
  <text class="d-sub" x="380" y="178" text-anchor="middle">all rows removed</text>
  <rect class="d-box" x="270" y="210" width="220" height="44" rx="6"/>
  <text class="d-sub" x="380" y="238" text-anchor="middle">storage replaced</text>
  <rect class="d-box" x="520" y="90" width="220" height="44" rx="6"/>
  <text class="d-sub" x="630" y="118" text-anchor="middle">definition removed</text>
  <rect class="d-box" x="520" y="150" width="220" height="44" rx="6"/>
  <text class="d-sub" x="630" y="178" text-anchor="middle">all rows removed</text>
  <rect class="d-box" x="520" y="210" width="220" height="44" rx="6"/>
  <text class="d-sub" x="630" y="238" text-anchor="middle">indexes and grants gone</text>
</svg>

### DELETE

📌 **Interview term: DELETE** — removes the rows that match the \`WHERE\` clause (all rows if there is none), one row at a time. Every row deletion is logged, fires row-level triggers and is checked against foreign keys.

The first example deletes January's entries. SQLite and PostgreSQL both accept \`RETURNING\` on \`DELETE\` (both ran it here), so the same statement returns what it removed, followed by what is left:

~~~text
id | event
1 | login
2 | export

id | event | created
3 | login | 2024-02-02
4 | password change | 2024-02-14
5 | login | 2024-03-01
6 | export | 2024-03-08
~~~

### TRUNCATE

📌 **Interview term: TRUNCATE** — removes *all* rows of a table without scanning them, by replacing the table storage with an empty one. No \`WHERE\` is allowed.

In PostgreSQL the effect is visible in the catalog: the table \`relfilenode\` (the number of its data file) changed from one value to another when it was truncated, run here.

**SQLite has no TRUNCATE.** On this page engine, \`TRUNCATE TABLE orders\` fails with \`near "TRUNCATE": syntax error\`. Instead SQLite has the **truncate optimization**: a \`DELETE\` with no \`WHERE\` and no \`RETURNING\`, on a table with no triggers, erases the whole table "without having to visit each row of the table individually" ([SQLite DELETE docs](https://www.sqlite.org/lang_delete.html)).

### DROP

📌 **Interview term: DROP TABLE** — removes the table definition and everything attached to it: rows, indexes, constraints, triggers and permissions. Queries against it then fail. The second example empties the table with \`DELETE\` (table still there), then drops it:

~~~text
rows_left | table_exists
0 | 1

table_exists
0
~~~

After the drop, \`SELECT * FROM audit_log\` fails on SQLite with \`no such table: audit_log\`.

## 4. Can You Undo It? Transactions by Engine

📌 **Interview term: transactional DDL** — DDL statements that take part in a transaction like any other statement, so \`ROLLBACK\` undoes them.

| Engine | \`DELETE\` | \`TRUNCATE\` | \`DROP TABLE\` |
| :--- | :--- | :--- | :--- |
| PostgreSQL 16 | Rolls back | Rolls back (run here) | Rolls back (run here) |
| SQLite 3.45 | Rolls back | Does not exist | Rolls back (run here) |
| SQL Server | Rolls back | Rolls back inside a transaction ([Microsoft Learn](https://learn.microsoft.com/sql/t-sql/statements/truncate-table-transact-sql)) | Not checked for this page |
| MySQL 8.4 (InnoDB) | Rolls back | **Implicit commit, cannot roll back** ([MySQL TRUNCATE](https://dev.mysql.com/doc/refman/8.4/en/truncate-table.html)) | **Implicit commit** ([statements that cause an implicit commit](https://dev.mysql.com/doc/refman/8.4/en/implicit-commit.html)) |

What was run here: on PostgreSQL, \`BEGIN; TRUNCATE audit_log; ROLLBACK;\` brought all 6 rows back (the third example includes it), and \`BEGIN; DROP TABLE audit_log; ROLLBACK;\` left the table and its 6 rows in place. On SQLite, \`BEGIN; DROP TABLE orders; ROLLBACK;\` left \`orders\` with its 4 rows. The MySQL rows come from the linked manual pages, which list both statements as causing an implicit commit.

The MySQL behaviour is the trap: inside a transaction, a \`TRUNCATE\` first commits everything you did before it, and then cannot itself be undone.

## 5. What Else Differs

The third example (PostgreSQL) shows identity behaviour and the rollback in one result:

~~~text
step | what | value
1 | next id after DELETE | 4
2 | next id after TRUNCATE | 4
3 | next id after TRUNCATE RESTART IDENTITY | 1
4 | audit_log rows after TRUNCATE then ROLLBACK | 6
~~~

📌 **Interview term: identity / sequence reset** — \`DELETE\` never touches the id counter, so the next id after deleting three rows is 4. A plain \`TRUNCATE\` in PostgreSQL also continues at 4 (its default is \`CONTINUE IDENTITY\`); only \`TRUNCATE ... RESTART IDENTITY\` starts again at 1. MySQL and SQL Server reset \`AUTO_INCREMENT\` / \`IDENTITY\` on every \`TRUNCATE\`, according to their manuals ([MySQL](https://dev.mysql.com/doc/refman/8.4/en/truncate-table.html), [SQL Server](https://learn.microsoft.com/sql/t-sql/statements/truncate-table-transact-sql)); this was not run here.

**Triggers.** With an \`AFTER DELETE ... FOR EACH ROW\` trigger on \`audit_log\` that copies each removed row into another table, run here on PostgreSQL: \`DELETE FROM audit_log\` logged 6 rows, \`TRUNCATE audit_log\` logged 0. PostgreSQL has separate \`AFTER TRUNCATE ... FOR EACH STATEMENT\` triggers for that case (one fired here); a \`FOR EACH ROW\` truncate trigger is rejected with \`TRUNCATE FOR EACH ROW triggers are not supported\`.

**Foreign keys.** \`TRUNCATE\` does not check row by row, so it refuses outright when another table references this one, even if no rows actually match:

~~~text
ERROR:  cannot truncate a table referenced in a foreign key constraint
DETAIL:  Table "orders" references "customers".
HINT:  Truncate table "orders" at the same time, or use TRUNCATE ... CASCADE.
~~~

\`TRUNCATE customers, orders\` or \`TRUNCATE customers CASCADE\` works. The fourth example shows that \`CASCADE\` empties every referencing table too, which is easy to underestimate:

~~~text
customers | orders | audit_log
0 | 0 | 6
~~~

\`DROP TABLE customers\` refuses for a similar reason (\`cannot drop table customers because other objects depend on it\`, with \`DETAIL:  constraint orders_customer_id_fkey on table orders depends on table customers\`). \`DROP TABLE customers CASCADE\` does not drop \`orders\`: it drops only the foreign key constraint, and in a test transaction here \`orders\` kept its 4 rows. A \`DELETE\` of a referenced customer fails row by row with \`violates foreign key constraint\` unless the key has \`ON DELETE CASCADE\` ([What are foreign key cascade options?](/interview-question/what-are-foreign-key-cascade-options)).

In SQLite, foreign keys are only enforced after \`PRAGMA foreign_keys = ON\`; with it on, \`DROP TABLE customers\` failed with \`FOREIGN KEY constraint failed\`, because SQLite performs an implicit \`DELETE\` of all rows before dropping a table ([SQLite foreign key docs](https://sqlite.org/foreignkeys.html)).

## 6. PostgreSQL Internals: Space, Locks and MVCC

📌 **Interview term: dead tuple and VACUUM** — in PostgreSQL a \`DELETE\` only marks rows as deleted (dead tuples); the space is reclaimed later by \`VACUUM\`. On a 10,000-row test table run here, \`pg_relation_size\` was 1,572,864 bytes before the \`DELETE\`, still 1,572,864 bytes after it, and 0 after \`TRUNCATE\` (after \`VACUUM\`, which can cut off trailing empty pages, it also dropped to 0 in that test; in general \`VACUUM\` only makes space reusable).

📌 **Interview term: ACCESS EXCLUSIVE lock** — the strongest table lock in PostgreSQL; it conflicts with everything, including plain \`SELECT\`. Checked in \`pg_locks\` inside an open transaction: \`DELETE FROM audit_log\` held only \`RowExclusiveLock\` on the table, while \`TRUNCATE audit_log\` held \`AccessExclusiveLock\`. The documentation says the same and recommends \`DELETE\` when concurrent access is needed ([PostgreSQL TRUNCATE](https://www.postgresql.org/docs/16/sql-truncate.html)).

📌 **Interview term: MVCC-safe** — a change is MVCC-safe if a transaction working from an older snapshot keeps seeing the old data. The PostgreSQL docs state that \`TRUNCATE\` is not. Run here with two \`psql\` sessions against a scratch database (\`audit_log\` holding 3 rows):

| Step | Session A | Session B |
| :--- | :--- | :--- |
| 1 | \`BEGIN ISOLATION LEVEL REPEATABLE READ;\` then a query on another table (snapshot taken) | |
| 2 | | \`TRUNCATE audit_log;\` commits at once and sees 0 rows |
| 3 | \`SELECT count(*) FROM audit_log;\` returns **0** | |

With \`DELETE FROM audit_log\` in step 2 instead, session A still saw **3** rows: the old row versions stay visible to its snapshot. And when session A had *already read* \`audit_log\` in step 1, session B \`TRUNCATE\` could not get its lock at all; with \`lock_timeout = '2s'\` it failed with \`canceling statement due to lock timeout\`. So on a busy table \`TRUNCATE\` queues behind every open reader, and every new query on that table then queues behind the \`TRUNCATE\`.

## 7. Comparison at a Glance

| | \`DELETE\` | \`TRUNCATE\` | \`DROP TABLE\` |
| :--- | :--- | :--- | :--- |
| Removes | Matching rows (or all) | All rows | The table itself |
| \`WHERE\` | Yes | No | No |
| Table definition, indexes, grants | Kept | Kept | Removed |
| Speed on a huge table | Proportional to rows | Near-constant | Near-constant |
| Row triggers | Fire | Do not fire | Not applicable |
| Referenced by a foreign key | Checked per row | Refused unless all truncated together or \`CASCADE\` | Refused unless \`CASCADE\` (drops the constraint) |
| Space (PostgreSQL) | Dead tuples until \`VACUUM\` | Freed at once | Freed at once |
| Lock (PostgreSQL) | \`ROW EXCLUSIVE\` + row locks | \`ACCESS EXCLUSIVE\` | \`ACCESS EXCLUSIVE\` |
| Identity counter | Unchanged | PostgreSQL: unchanged unless \`RESTART IDENTITY\` | Gone with the table |
| Roll back | Everywhere | PostgreSQL, SQL Server; not MySQL; SQLite has none | PostgreSQL, SQLite; not MySQL |
| \`RETURNING\` deleted rows | PostgreSQL, SQLite | No | No |

The \`DROP TABLE\` lock line comes from the [PostgreSQL explicit locking docs](https://www.postgresql.org/docs/16/explicit-locking.html), not from a run.

## 8. Verified: Running the Code

The two SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above). The two PostgreSQL examples were run on PostgreSQL 16.15 in a scratch database with the same schema, as were the errors, lock checks, trigger test, size test and the two-session test described above.

Example 1, \`DELETE ... WHERE ... RETURNING\`:

~~~text
id | event
1 | login
2 | export

id | event | created
3 | login | 2024-02-02
4 | password change | 2024-02-14
5 | login | 2024-03-01
6 | export | 2024-03-08
~~~

Example 2, \`DELETE\` without \`WHERE\`, then \`DROP\`:

~~~text
rows_left | table_exists
0 | 1

table_exists
0
~~~

Example 3, identity behaviour and \`TRUNCATE\` rollback:

~~~text
step | what | value
1 | next id after DELETE | 4
2 | next id after TRUNCATE | 4
3 | next id after TRUNCATE RESTART IDENTITY | 1
4 | audit_log rows after TRUNCATE then ROLLBACK | 6
~~~

Example 4, \`TRUNCATE ... CASCADE\`:

~~~text
customers | orders | audit_log
0 | 0 | 6
~~~

## Common Pitfalls

- **Running a \`DELETE\` without \`WHERE\` by accident.** Write the \`WHERE\` first, run it as a \`SELECT COUNT(*)\`, and do destructive work inside a transaction you can roll back.
- **Assuming \`TRUNCATE\` can be rolled back everywhere.** In MySQL it commits implicitly, and also commits whatever your transaction did before it.
- **Using \`TRUNCATE\` on a table with audit triggers or row-based consumers**, which then silently miss every removed row.
- **\`TRUNCATE ... CASCADE\` without checking what references the table.** It empties every referencing table, as the fourth example shows.
- **One giant \`DELETE\` on a live table.** Long locks, bloat, a huge transaction and replication lag; delete in batches, or drop old partitions ([What is table partitioning?](/interview-question/what-is-table-partitioning)).
- **Expecting \`TRUNCATE\` to reset ids in PostgreSQL.** It continues the sequence unless you add \`RESTART IDENTITY\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Three levels:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DELETE</code> removes rows you choose, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TRUNCATE</code> removes every row at once, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DROP TABLE</code> removes the table itself: data, definition, indexes, constraints, triggers and permissions.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. DELETE:</strong> <span style="color:#f0e2c8;">Normal <strong style="color:#ffca28;">DML</strong>: row by row, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code> allowed, row triggers fire, foreign keys checked per row, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RETURNING</code> can hand back the deleted rows. In PostgreSQL the rows become dead tuples and the space comes back only after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">VACUUM</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. TRUNCATE:</strong> <span style="color:#f0e2c8;">Swaps the table storage for an empty file, so it is near-instant on huge tables and frees the space immediately. No <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code>, no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ON DELETE</code> triggers, and it refuses if another table has a foreign key to it unless you say <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CASCADE</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RESTART IDENTITY</code> resets the id counter.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Transactions:</strong> <span style="color:#f0e2c8;">In PostgreSQL and SQL Server all three can be rolled back inside a transaction; I ran <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BEGIN; TRUNCATE; ROLLBACK;</code> and the rows were back. In MySQL <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TRUNCATE</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DROP</code> cause an implicit commit. SQLite has no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TRUNCATE</code>; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DELETE</code> without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code> is optimised instead.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Choosing:</strong> <span style="color:#f0e2c8;">Old rows only: batched <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DELETE</code>. Whole table, nobody reading it, no dependent triggers: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TRUNCATE</code>. Table no longer needed: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DROP</code>. In PostgreSQL <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TRUNCATE</code> takes an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ACCESS EXCLUSIVE</code> lock, so on a busy table it waits behind every reader.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is TRUNCATE so much faster than DELETE?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DELETE</code> visits and logs every row and runs per-row triggers and checks. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TRUNCATE</code> does not look at rows: in PostgreSQL it gives the table a new, empty file (the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">relfilenode</code> changed when I ran it) and removes the old one at commit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is TRUNCATE DDL or DML?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It acts on the table, not on rows, so it behaves like DDL: MySQL documents it as DDL and commits implicitly. PostgreSQL treats it as a transactional command like any other, which is why it can be rolled back there.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does "TRUNCATE is not MVCC-safe" mean?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In PostgreSQL a transaction whose snapshot was taken before the truncate, but which had not touched the table yet, sees it as empty afterwards. I reproduced it: a REPEATABLE READ transaction saw 0 rows after another session committed a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TRUNCATE</code>. After a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DELETE</code> it still saw all 3 rows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you delete 50 million old rows from a live table?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not in one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DELETE</code>: that holds locks for a long time, bloats the table and creates a huge transaction. Delete in batches of a few thousand by key range, commit each batch, and let autovacuum keep up. For time-based data, partitioning and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DROP</code> of old partitions is the clean answer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you get the data back after DROP?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only if the transaction has not committed yet (PostgreSQL and SQLite roll back <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DROP</code>, both run here), or from a backup or point-in-time recovery. In MySQL <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DROP TABLE</code> commits implicitly, so a later <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ROLLBACK</code> does not undo it.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| DML vs DDL | Statements that change rows vs statements that change structure |
| DELETE | Removes matching rows one by one; logged, triggers fire |
| TRUNCATE | Removes all rows by replacing the table storage |
| DROP TABLE | Removes the table and everything attached to it |
| Transactional DDL | DDL that can be rolled back with the transaction |
| Identity / sequence reset | Whether the id counter starts again after clearing |
| Dead tuple and VACUUM | Deleted row versions in PostgreSQL, reclaimed later by VACUUM |
| ACCESS EXCLUSIVE lock | PostgreSQL strongest table lock; blocks even reads |
| MVCC-safe | Older snapshots keep seeing the old data; TRUNCATE is not |

**Conclusion:** \`DELETE\` is the precise, row-by-row tool: it takes a \`WHERE\`, fires triggers, checks foreign keys, can return what it removed and always rolls back, at the price of speed and, in PostgreSQL, of bloat until \`VACUUM\`. \`TRUNCATE\` empties the whole table at once by swapping its storage, so it is fast and frees space immediately, but it skips row triggers, refuses foreign key parents unless you cascade, needs an exclusive lock and is not MVCC-safe; whether you can roll it back depends on the engine (yes in PostgreSQL and SQL Server, no in MySQL, and SQLite has no \`TRUNCATE\` at all). \`DROP TABLE\` removes the table itself. Choose by asking which rows must go, whether the table must survive, and who else is using it.`,
    examples: [
      {
        label: `DELETE with WHERE removes chosen rows and can return them`,
        code: `DELETE FROM audit_log
WHERE created < '2024-02-01'
RETURNING id, event;

SELECT id, event, created FROM audit_log ORDER BY id;`,
      },
      {
        label: `DELETE without WHERE empties the table; DROP removes the table itself`,
        code: `DELETE FROM audit_log;

SELECT
  (SELECT COUNT(*) FROM audit_log) AS rows_left,
  (SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'audit_log') AS table_exists;

DROP TABLE audit_log;

SELECT COUNT(*) AS table_exists
FROM sqlite_master WHERE type = 'table' AND name = 'audit_log';`,
      },
      {
        label: `PostgreSQL: TRUNCATE rolls back, and only RESTART IDENTITY resets the counter`,
        code: `CREATE TABLE t_delete (id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, subject text NOT NULL);
CREATE TABLE t_truncate (id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, subject text NOT NULL);
CREATE TABLE t_restart (id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, subject text NOT NULL);
INSERT INTO t_delete (subject) VALUES ('a'), ('b'), ('c');
INSERT INTO t_truncate (subject) VALUES ('a'), ('b'), ('c');
INSERT INTO t_restart (subject) VALUES ('a'), ('b'), ('c');

DELETE FROM t_delete;
TRUNCATE t_truncate;
TRUNCATE t_restart RESTART IDENTITY;
INSERT INTO t_delete (subject) VALUES ('new');
INSERT INTO t_truncate (subject) VALUES ('new');
INSERT INTO t_restart (subject) VALUES ('new');

BEGIN;
TRUNCATE audit_log;
ROLLBACK;

SELECT 1 AS step, 'next id after DELETE' AS what, (SELECT id FROM t_delete) AS value
UNION ALL SELECT 2, 'next id after TRUNCATE', (SELECT id FROM t_truncate)
UNION ALL SELECT 3, 'next id after TRUNCATE RESTART IDENTITY', (SELECT id FROM t_restart)
UNION ALL SELECT 4, 'audit_log rows after TRUNCATE then ROLLBACK', (SELECT COUNT(*)::int FROM audit_log)
ORDER BY step;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: TRUNCATE ... CASCADE also empties every referencing table`,
        code: `TRUNCATE customers CASCADE;

SELECT
  (SELECT COUNT(*) FROM customers) AS customers,
  (SELECT COUNT(*) FROM orders) AS orders,
  (SELECT COUNT(*) FROM audit_log) AS audit_log;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
];

export default augments;
