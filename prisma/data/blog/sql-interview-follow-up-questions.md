---
slug: sql-interview-follow-up-questions
title: "The SQL Follow-Up Questions Interviewers Ask, and How to Answer Them"
excerpt: Eight SQL questions where the first answer is easy and the follow-up is not, from NULLs and NOT IN to LEFT JOIN filters, window-function ties and why an index is not used, each checked against PostgreSQL 16.
tags: ["interview", "sql", "postgres", "databases", "backend"]
cover: /blog-images/sql-interview-follow-up-questions/cover.png
---

Most SQL interview questions have an easy first answer. "What does `COUNT` do?" "What is a `LEFT JOIN`?" Anyone who has written a report can answer those. The interview is decided by the **follow-up**: the second question that checks whether you know what happens with `NULL`, with ties, with an index, or when a filter moves one line down.

This post goes through eight of those follow-ups. Each one has the first question, a one-line short answer to the follow-up, the reason behind it, and a query you can run to see it. Every result shown below was produced by running the query on PostgreSQL 16.15. Most of it is standard SQL and behaves the same in MySQL, SQL Server and SQLite; where PostgreSQL differs, the post says so.

## The data used in every example

Two small tables: departments, and employees with a salary and a manager. A few values are deliberately missing, because that is where the follow-ups live. Eli has no salary, Farah has no department, and Asha has no manager.

```sql
CREATE TABLE departments (id int PRIMARY KEY, name text NOT NULL);
CREATE TABLE employees (
  id int PRIMARY KEY,
  name text NOT NULL,
  dept_id int REFERENCES departments(id),
  salary int,
  manager_id int
);
INSERT INTO departments VALUES (1, 'Engineering'), (2, 'Sales'), (3, 'Legal');
INSERT INTO employees VALUES
  (1, 'Asha',  1, 120, NULL),
  (2, 'Ben',   1, 100, 1),
  (3, 'Chen',  1, 100, 1),
  (4, 'Dina',  2,  90, 1),
  (5, 'Eli',   2, NULL, 4),
  (6, 'Farah', NULL, 70, 1);
```

`NULL` is SQL for "no value" or "unknown". It is not zero and it is not an empty string, and most surprises below come from that.

## 1. What is the difference between COUNT(*), COUNT(column) and AVG?

> **Short answer:** `COUNT(*)` counts rows. `COUNT(column)` counts rows where that column is not `NULL`. `AVG` and the other aggregates skip `NULL` too, so they divide by the non-null count.

```sql
SELECT COUNT(*)               AS all_rows,
       COUNT(salary)          AS with_salary,
       COUNT(DISTINCT salary) AS distinct_salaries,
       AVG(salary)            AS avg_salary
FROM employees;
```

Output:

```text
 all_rows | with_salary | distinct_salaries |     avg_salary
----------+-------------+-------------------+---------------------
        6 |           5 |                 4 | 96.0000000000000000
```

Six employees, but only five salaries. The average is 480 / 5 = 96, not 480 / 6 = 80. Eli was not counted as earning zero; Eli was left out.

**The follow-up they ask next:** "So how do you count departments with no employees?" With a `LEFT JOIN`, the empty department still produces one row, so `COUNT(*)` reports 1. Count a column from the joined table instead:

```sql
SELECT d.name       AS department,
       COUNT(e.id)  AS headcount,
       COUNT(*)     AS rows_after_join
FROM departments d
LEFT JOIN employees e ON e.dept_id = d.id
GROUP BY d.name
ORDER BY d.name;
```

Output:

```text
 department  | headcount | rows_after_join
-------------+-----------+-----------------
 Engineering |         3 |               3
 Legal       |         0 |               1
 Sales       |         2 |               2
```

Legal has nobody, yet `COUNT(*)` says 1. That is a bug that ships in real dashboards.

## 2. Why does NOT IN return nothing?

The first question is usually "find employees who are not anyone's manager". The natural answer:

```sql
SELECT name FROM employees
WHERE id NOT IN (SELECT manager_id FROM employees);
```

Output:

```text
 name
------
(0 rows)
```

Zero rows, although Ben, Chen, Eli and Farah manage nobody.

> **Short answer:** the subquery returns a `NULL` (Asha has no manager), and `x NOT IN (..., NULL)` can never be true. Use `NOT EXISTS`, or filter the `NULL`s out of the subquery.

`NOT IN (1, 2, NULL)` means "not equal to 1 AND not equal to 2 AND not equal to NULL". Any comparison with `NULL` gives `NULL` (unknown), and `true AND unknown` is unknown. `WHERE` only keeps rows where the condition is true, so every row is thrown away. You can see the unknown directly:

```sql
SELECT 3 NOT IN (1, 2, NULL) AS result;
```

Output:

```text
 result
--------

(1 row)
```

The result is empty: not `true`, not `false`, but `NULL`. SQL has three truth values, and this is called **three-valued logic**.

The fix interviewers want to hear is `NOT EXISTS`, which asks "is there a matching row?" and is not affected by `NULL`s in the other table:

```sql
SELECT name FROM employees e
WHERE NOT EXISTS (
  SELECT 1 FROM employees m WHERE m.manager_id = e.id
)
ORDER BY name;
```

Output:

```text
 name
-------
 Ben
 Chen
 Eli
 Farah
(4 rows)
```

Adding `WHERE manager_id IS NOT NULL` inside the `NOT IN` subquery gives the same four names. It works, but `NOT EXISTS` is the habit worth showing, because it stays correct when someone later makes the column nullable.

**Related follow-up:** "Then how do you compare two values that might both be `NULL`?" `NULL = NULL` is unknown, not true. Use `IS NULL`, or `IS NOT DISTINCT FROM`, which treats two `NULL`s as equal.

## 3. Why can I not use my alias in WHERE?

```sql
SELECT name, salary * 12 AS yearly
FROM employees
WHERE yearly > 1000;
```

Output:

```text
ERROR:  column "yearly" does not exist
```

> **Short answer:** `WHERE` is evaluated before `SELECT`, so the alias does not exist yet. Repeat the expression, or wrap the query in a subquery or CTE.

SQL is written in one order and evaluated in another. This order is the reason behind several follow-ups at once:

![The logical evaluation order of a SQL query: FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY, LIMIT, and which clauses can see aliases and aggregates](/blog-images/sql-interview-follow-up-questions/logical-order.svg)

- **Aliases** are created in `SELECT`, so `ORDER BY` can use them but `WHERE` cannot.
- **Aggregates** such as `AVG` are computed per group, so they cannot appear in `WHERE`, which runs before grouping. PostgreSQL says so directly: `ERROR: aggregate functions are not allowed in WHERE`.
- **`HAVING`** exists for exactly that case: it filters groups after they are formed.

This is the *logical* order, the order that defines what the query means. The database is free to execute it differently (for example, push a filter into an index scan) as long as the result is the same.

One PostgreSQL detail worth knowing: it also accepts output aliases in `GROUP BY`, which is an extension to the standard. `SELECT dept_id AS d, COUNT(*) FROM employees GROUP BY d` runs in PostgreSQL; do not rely on it if the interviewer asks for portable SQL.

## 4. What is the difference between WHERE and HAVING?

> **Short answer:** `WHERE` filters rows before grouping. `HAVING` filters groups after aggregation. Put every condition that does not need an aggregate in `WHERE`, so fewer rows get grouped.

```sql
SELECT dept_id, AVG(salary) AS avg_salary
FROM employees
WHERE salary IS NOT NULL
GROUP BY dept_id
HAVING AVG(salary) > 95
ORDER BY dept_id;
```

Output:

```text
 dept_id |      avg_salary
---------+----------------------
       1 | 106.6666666666666667
```

**The follow-up:** "Could you move `salary IS NOT NULL` into `HAVING`?" Not as written: in `HAVING`, `salary` would have to be grouped or aggregated. And even where both work, filtering early in `WHERE` is the better habit because it shrinks the input to the grouping step.

## 5. Why did my LEFT JOIN turn into an inner join?

The question: "List every department, with its employees who earn more than 95." Most people write the filter in `WHERE`:

```sql
SELECT d.name, e.name AS employee
FROM departments d
LEFT JOIN employees e ON e.dept_id = d.id
WHERE e.salary > 95
ORDER BY 1, 2;
```

That returns only the three Engineering rows. Legal and Sales are gone, which is not what "every department" means. Moving the condition into `ON` keeps them:

```sql
SELECT d.name, e.name AS employee
FROM departments d
LEFT JOIN employees e ON e.dept_id = d.id AND e.salary > 95
ORDER BY 1, 2;
```

Output:

```text
    name     | employee
-------------+----------
 Engineering | Asha
 Engineering | Ben
 Engineering | Chen
 Legal       |
 Sales       |
(5 rows)
```

![The same salary filter placed in ON keeps all five department rows, and placed in WHERE drops Legal and Sales](/blog-images/sql-interview-follow-up-questions/left-join-where.svg)

> **Short answer:** a `LEFT JOIN` fills unmatched rows with `NULL`s, and a `WHERE` condition on the right-hand table is unknown for `NULL`, so it removes exactly the rows the `LEFT JOIN` was meant to keep.

The rule of thumb: conditions about *which rows to match* from the optional table go in `ON`; conditions about *which final rows to keep* go in `WHERE`. If you really do want to filter the outer result on the right table, `WHERE e.id IS NULL` is the classic exception: it is how you find departments with no match at all (an **anti-join**).

## 6. ROW_NUMBER, RANK or DENSE_RANK?

A **window function** computes a value for each row from a set of related rows (the "window") without collapsing them into one row the way `GROUP BY` does. The three ranking functions differ only on ties:

```sql
SELECT name, salary,
       ROW_NUMBER() OVER (ORDER BY salary DESC, name) AS row_number,
       RANK()       OVER (ORDER BY salary DESC)       AS rank,
       DENSE_RANK() OVER (ORDER BY salary DESC)       AS dense_rank
FROM employees
WHERE salary IS NOT NULL
ORDER BY salary DESC, name;
```

Output:

```text
 name  | salary | row_number | rank | dense_rank
-------+--------+------------+------+------------
 Asha  |    120 |          1 |    1 |          1
 Ben   |    100 |          2 |    2 |          2
 Chen  |    100 |          3 |    2 |          2
 Dina  |     90 |          4 |    4 |          3
 Farah |     70 |          5 |    5 |          4
```

> **Short answer:** `ROW_NUMBER` always gives distinct numbers, `RANK` gives ties the same number and then skips (2, 2, 4), and `DENSE_RANK` gives ties the same number without gaps (2, 2, 3).

Pick by the question. "Second-highest salary" usually means the second distinct value, which is `DENSE_RANK() = 2` (Ben and Chen at 100). "Exactly one row per group" means `ROW_NUMBER`.

**The follow-up:** "Ben and Chen both earn 100. Which one gets row number 2?" Without a tie-breaker, the database may return either, and the answer can change between runs or versions. That is why the query above orders by `salary DESC, name`. Always give `ROW_NUMBER` a unique final sort key.

**Top earner per department**, the most common use, partitions the window by department:

```sql
SELECT dept_id, name, salary FROM (
  SELECT dept_id, name, salary,
         ROW_NUMBER() OVER (
           PARTITION BY dept_id
           ORDER BY salary DESC NULLS LAST, name
         ) AS rn
  FROM employees
  WHERE dept_id IS NOT NULL
) ranked
WHERE rn = 1
ORDER BY dept_id;
```

Output:

```text
 dept_id | name | salary
---------+------+--------
       1 | Asha |    120
       2 | Dina |     90
```

`NULLS LAST` matters here: in PostgreSQL, `NULL`s sort as larger than any value, so in a `DESC` order they come first by default, and Eli (no salary) would have been the Sales "top earner".

## 7. I have an index. Why is it not used?

For this question the examples use a bigger table: 200,000 orders with an index on `(customer_id, created_at)` and another on `email`. `EXPLAIN` shows the **query plan**, the steps the database chose to run the query; `COSTS OFF` hides the cost estimates to keep it short.

```sql
CREATE INDEX orders_customer_created ON orders (customer_id, created_at);
CREATE INDEX orders_email ON orders (email);

EXPLAIN (COSTS OFF) SELECT * FROM orders WHERE customer_id = 42;
```

Output:

```text
 Bitmap Heap Scan on orders
   Recheck Cond: (customer_id = 42)
   ->  Bitmap Index Scan on orders_customer_created
         Index Cond: (customer_id = 42)
```

The index is used. Now three queries where it is not:

```sql
EXPLAIN (COSTS OFF) SELECT * FROM orders WHERE created_at >= '2026-10-20';
EXPLAIN (COSTS OFF) SELECT * FROM orders WHERE lower(email) = 'user42@example.com';
EXPLAIN (COSTS OFF) SELECT * FROM orders WHERE email LIKE '%42@example.com';
```

Output (one plan per query):

```text
 Seq Scan on orders
   Filter: (created_at >= '2026-10-20 00:00:00+00'::timestamp with time zone)

 Gather
   Workers Planned: 1
   ->  Parallel Seq Scan on orders
         Filter: (lower(email) = 'user42@example.com'::text)

 Seq Scan on orders
   Filter: (email ~~ '%42@example.com'::text)
```

A **sequential scan** (`Seq Scan`) reads the whole table. Each case has its own reason:

> **Short answer:** an index only helps when the query asks for what the index is sorted by: the leading column of a multicolumn index, the exact expression that was indexed, and a fixed prefix for `LIKE`.

**Not the leading column.** A B-tree index on `(customer_id, created_at)` is sorted by customer first, then by date inside each customer, like a phone book sorted by surname then first name. Finding customer 42 is one jump. Finding every order after 20 October means looking inside every customer's section.

![An index sorted by customer then date keeps customer 42 together, while recent dates are scattered across every customer](/blog-images/sql-interview-follow-up-questions/composite-index.svg)

This is version-dependent, which makes it a good follow-up to know. [PostgreSQL 18](https://www.postgresql.org/docs/release/18/) (released 2025-09-25) added **skip scan** for B-tree indexes, which "allows multi-column btree indexes to be used in more cases such as when there are no restrictions on the first or early indexed columns". The plans above are from PostgreSQL 16, which does not have it. Even with skip scan, an index whose leading column matches your filter is usually the better design.

**A function on the column.** The index stores `email`, not `lower(email)`, so it cannot answer a question about `lower(email)`. Index the expression itself:

```sql
CREATE INDEX orders_email_lower ON orders (lower(email));
EXPLAIN (COSTS OFF) SELECT * FROM orders WHERE lower(email) = 'user42@example.com';
```

Output:

```text
 Bitmap Heap Scan on orders
   Recheck Cond: (lower(email) = 'user42@example.com'::text)
   ->  Bitmap Index Scan on orders_email_lower
         Index Cond: (lower(email) = 'user42@example.com'::text)
```

**A leading wildcard.** `LIKE '%42@example.com'` could start with anything, so a sorted index has nowhere to start looking. A fixed prefix (`'user42%'`) can use a B-tree in principle; in PostgreSQL that also depends on the column's collation, and the index may need the `text_pattern_ops` operator class. For "contains" searches, PostgreSQL offers trigram indexes through the `pg_trgm` extension.

**The follow-up behind the follow-up:** sometimes the planner skips an index on purpose. If a filter matches a large share of the table, reading the whole table in order is cheaper than jumping around through the index. "It did not use my index" is not always a bug; check how many rows match and whether the table statistics are fresh (`ANALYZE`).

## 8. UNION or UNION ALL?

> **Short answer:** `UNION` removes duplicate rows, which costs a sort or hash over the whole result. `UNION ALL` keeps everything and is cheaper. Use `UNION ALL` unless you need duplicates removed.

Combining the Engineering salaries with themselves:

```sql
SELECT salary FROM employees WHERE dept_id = 1
UNION
SELECT salary FROM employees WHERE dept_id = 1
ORDER BY 1;
```

Output:

```text
 salary
--------
    100
    120
```

`UNION` returned two rows, because it removed duplicates across *and within* both inputs: Ben and Chen's 100 collapsed into one. The same query with `UNION ALL` returns all 6 rows. That second point is the follow-up: people expect `UNION` to only remove rows that appear in both halves, but it also removes duplicates inside each half.

## How to answer these in the room

The pattern across all eight is the same, and it is what interviewers listen for:

1. **Give the direct answer first**, in one sentence.
2. **Name the edge case before they do.** "This breaks if the subquery can return `NULL`" earns more than a correct query.
3. **Say how you would check.** "I would run `EXPLAIN`" or "I would test with a department that has no employees" shows you debug with evidence.
4. **Mention the database when it matters.** Skip scan, `NULLS` ordering and aliases in `GROUP BY` all vary by product and version. Saying "in PostgreSQL" is a strength, not a hedge.

## Cheat sheet

| Question | Short answer | The trap |
| :--- | :--- | :--- |
| `COUNT(*)` vs `COUNT(col)` | Rows vs non-null values | `COUNT(*)` after a `LEFT JOIN` counts empty groups as 1 |
| `AVG(col)` | Skips `NULL`s | It is not "missing means zero" |
| `NOT IN (subquery)` | Use `NOT EXISTS` | One `NULL` in the subquery returns zero rows |
| Alias in `WHERE` | Not allowed | `WHERE` runs before `SELECT` |
| `WHERE` vs `HAVING` | Rows before grouping vs groups after | Aggregates are not allowed in `WHERE` |
| Filter on a `LEFT JOIN` table | Put it in `ON` | In `WHERE` it becomes an inner join |
| `ROW_NUMBER` / `RANK` / `DENSE_RANK` | Distinct / ties with gaps / ties without gaps | Add a unique tie-breaker to `ROW_NUMBER` |
| Index not used | Leading column, same expression, fixed prefix | Sometimes a sequential scan is the right plan |
| `UNION` vs `UNION ALL` | Deduplicate vs keep all | `UNION` also removes duplicates within each half |
