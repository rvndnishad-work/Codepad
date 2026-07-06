/**
 * "Review the AI's code" challenge bank, part 9: SQL (batch 2).
 *
 * IMPORTANT: finding `lines` anchors are 1-based line numbers into `code`
 * exactly as written (first char after the opening backtick = line 1).
 * Grader de-dupes marks BY LINE, so no two findings may share a line.
 * Run `npx tsx prisma/seed-review-challenges.ts --lint` after any edit.
 */
import type { CuratedReviewChallenge } from "./review-challenges.types";

export const REVIEW_CHALLENGES_9: CuratedReviewChallenge[] = [
  {
    slug: "sql-active-users",
    title: "Count active users",
    prompt:
      "Postgres: count how many users are active (status = 'active').",
    language: "sql",
    difficulty: "beginner",
    estimatedMinutes: 4,
    code: `SELECT COUNT(*)
FROM users
WHERE status = "active";`,
    findings: [
      {
        lines: [3, 3],
        category: "logic-bug",
        title: "Double quotes denote an identifier, not a string",
        explanation:
          "In Postgres (and standard SQL) double quotes mean 'the column/table named active', so this errors with `column \"active\" does not exist`. String literals use single quotes: `WHERE status = 'active'`. (MySQL is laxer, which is often where this habit comes from.)",
      },
    ],
  },
  {
    slug: "sql-recent-signups",
    title: "Signups in the last 7 days",
    prompt:
      "Postgres: list users who signed up in the last 7 days, newest first.",
    language: "sql",
    difficulty: "beginner",
    estimatedMinutes: 5,
    code: `SELECT id, email, created_at
FROM users
WHERE created_at > CURRENT_DATE - 7
ORDER BY created_at ASC;`,
    findings: [
      {
        lines: [4, 4],
        category: "logic-bug",
        title: "ASC returns oldest first, not newest",
        explanation:
          "The prompt says newest first, but ORDER BY created_at ASC lists the oldest signup first. Use DESC.",
      },
      {
        lines: [3, 3],
        category: "edge-case",
        title: "Date vs timestamp boundary is fuzzy",
        explanation:
          "CURRENT_DATE - 7 is midnight 7 days ago; comparing a timestamp column to it works, but 'last 7 days' is ambiguous about whether it means 7×24h from now or 7 calendar days. Be explicit: `created_at >= NOW() - INTERVAL '7 days'` for a rolling window.",
        points: 5,
      },
    ],
  },
  {
    slug: "sql-avg-order-value",
    title: "Average order value per status",
    prompt:
      "Postgres: show the average order amount for each status. Include statuses that currently have no orders as 0.",
    language: "sql",
    difficulty: "intermediate",
    estimatedMinutes: 6,
    code: `SELECT status, AVG(amount) AS avg_amount
FROM orders
GROUP BY status
HAVING AVG(amount) > 0
ORDER BY avg_amount DESC;`,
    findings: [
      {
        lines: [4, 4],
        category: "logic-bug",
        title: "HAVING filters out exactly the rows you need",
        explanation:
          "The prompt wants statuses with no/zero orders shown as 0, but `HAVING AVG(amount) > 0` removes them — and you can't GROUP BY into existence a status that has no rows at all. Drop the HAVING, and to include statuses with zero orders, LEFT JOIN from a statuses reference table and COALESCE(AVG(amount), 0).",
      },
      {
        lines: [1, 1],
        category: "edge-case",
        title: "AVG silently ignores NULL amounts",
        explanation:
          "AVG skips NULLs, so orders with a NULL amount don't count toward the average — which may over- or under-state it versus treating them as 0. Decide intent and use `AVG(COALESCE(amount, 0))` if NULLs should count.",
        points: 5,
      },
    ],
  },
  {
    slug: "sql-duplicate-emails",
    title: "Find duplicate emails",
    prompt:
      "Postgres: find email addresses that appear more than once in the users table, with their counts.",
    language: "sql",
    difficulty: "intermediate",
    estimatedMinutes: 6,
    code: `SELECT email, COUNT(*) AS n
FROM users
WHERE COUNT(*) > 1
GROUP BY email;`,
    findings: [
      {
        lines: [3, 3],
        category: "logic-bug",
        title: "Aggregate in WHERE — must be HAVING",
        explanation:
          "You can't use an aggregate like COUNT(*) in WHERE (it's evaluated before grouping) — Postgres errors with 'aggregate functions are not allowed in WHERE'. Filter groups with HAVING: `GROUP BY email HAVING COUNT(*) > 1`.",
      },
      {
        lines: [1, 1],
        category: "edge-case",
        title: "Case/whitespace variants counted as distinct",
        explanation:
          "'Bob@x.com' and 'bob@x.com ' are different strings, so true duplicates that differ only by case or trailing spaces won't be flagged. Group on a normalized form: `LOWER(TRIM(email))` (and consider enforcing it with a unique index).",
        points: 5,
      },
    ],
  },
  {
    slug: "sql-second-highest",
    title: "Second-highest salary",
    prompt:
      "Find the second-highest distinct salary in the employees table. Return NULL if there isn't one.",
    language: "sql",
    difficulty: "intermediate",
    estimatedMinutes: 6,
    code: `SELECT MAX(salary) AS second_highest
FROM employees
WHERE salary < MAX(salary);`,
    findings: [
      {
        lines: [3, 3],
        category: "logic-bug",
        title: "MAX(salary) in WHERE is invalid",
        explanation:
          "The aggregate can't appear in the WHERE of its own query. Compare to a subquery instead: `WHERE salary < (SELECT MAX(salary) FROM employees)`, then take MAX of what remains. That form also correctly returns NULL when there's no second value.",
      },
      {
        lines: [1, 1],
        category: "edge-case",
        title: "Ties aren't 'distinct'",
        explanation:
          "If the top salary is shared by several employees, 'second highest distinct' should skip all of them. MAX over `salary < top` handles that, but an alternative like OFFSET/LIMIT must add DISTINCT or it returns a duplicate of the top. State the distinctness explicitly.",
        points: 5,
      },
    ],
  },
  {
    slug: "sql-running-total",
    title: "Running total of daily revenue",
    prompt:
      "Postgres: for each day, show the day's revenue and the cumulative running total, ordered by day.",
    language: "sql",
    difficulty: "advanced",
    estimatedMinutes: 8,
    code: `SELECT
  day,
  SUM(revenue) AS daily,
  SUM(revenue) OVER (ORDER BY day) AS running_total
FROM daily_revenue
GROUP BY day;`,
    findings: [
      {
        lines: [3, 3],
        category: "logic-bug",
        title: "Mixing a plain aggregate with a window over the same column",
        explanation:
          "Line 3 aggregates revenue per group while line 4 windows over the ungrouped revenue — Postgres requires the window's `revenue` to be inside an aggregate here, and semantically the running total should sum the *daily* totals, not raw rows. Compute the daily sum first (a subquery/CTE), then `SUM(daily) OVER (ORDER BY day)`.",
      },
      {
        lines: [4, 4],
        category: "edge-case",
        title: "Default window frame can include peer rows unexpectedly",
        explanation:
          "With ORDER BY and no explicit frame, the default is RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW, which lumps together all rows sharing the same `day` value — usually fine after grouping, but a landmine if day isn't unique. Spell out `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` when you mean row-by-row.",
        points: 5,
      },
    ],
  },
  {
    slug: "sql-transfer-funds",
    title: "Transfer funds between accounts",
    prompt:
      "Write SQL to move $100 from account 1 to account 2: debit one, credit the other. It must be all-or-nothing.",
    language: "sql",
    difficulty: "advanced",
    estimatedMinutes: 8,
    code: `UPDATE accounts SET balance = balance - 100 WHERE id = 1;

UPDATE accounts SET balance = balance + 100 WHERE id = 2;`,
    findings: [
      {
        lines: [1, 1],
        category: "logic-bug",
        title: "Debit has no guard against going negative",
        explanation:
          "Debiting unconditionally lets an account overdraw below zero. Guard it: `UPDATE ... SET balance = balance - 100 WHERE id = 1 AND balance >= 100`, then verify exactly one row was affected before crediting — abort otherwise.",
      },
      {
        lines: [3, 3],
        category: "logic-bug",
        title: "Two separate statements, no transaction — not atomic",
        explanation:
          "The prompt demands all-or-nothing, but these are two independent statements: if the second UPDATE fails (or the connection drops between them), money is debited and never credited. Wrap both in a transaction — `BEGIN; ... ; COMMIT;` — so they commit or roll back together. The transaction also provides the row locks that stop two concurrent transfers from interleaving and losing an update.",
      },
    ],
  },
  {
    slug: "sql-category-sales",
    title: "Sales per category with names",
    prompt:
      "Postgres: total sales quantity per product category, showing the category name. Categories with no sales should show 0.",
    language: "sql",
    difficulty: "intermediate",
    estimatedMinutes: 7,
    code: `SELECT
  cat.name,
  SUM(oi.quantity) AS units_sold
FROM categories cat
LEFT JOIN products p ON p.category_id = cat.id
LEFT JOIN order_items oi ON oi.product_id = p.id
GROUP BY cat.name;`,
    findings: [
      {
        lines: [3, 3],
        category: "edge-case",
        title: "SUM over no rows is NULL, not 0",
        explanation:
          "For a category with no sales the LEFT JOINs produce NULL quantities and SUM returns NULL, so the column shows blank rather than the 0 the prompt asked for. Wrap it: `COALESCE(SUM(oi.quantity), 0)`.",
      },
      {
        lines: [7, 7],
        category: "logic-bug",
        title: "Grouping by name merges same-named categories",
        explanation:
          "Two distinct categories that happen to share a name collapse into one row when you GROUP BY cat.name. Group by the primary key and select the name: `GROUP BY cat.id, cat.name`.",
      },
    ],
  },
  {
    slug: "sql-latest-status",
    title: "Latest status per order",
    prompt:
      "Postgres: for each order, get its most recent status from order_events (order_id, status, created_at).",
    language: "sql",
    difficulty: "advanced",
    estimatedMinutes: 8,
    code: `SELECT order_id, status, MAX(created_at) AS latest
FROM order_events
GROUP BY order_id;`,
    findings: [
      {
        lines: [1, 1],
        category: "logic-bug",
        title: "status isn't tied to the MAX(created_at) row",
        explanation:
          "Selecting a non-aggregated `status` alongside GROUP BY order_id either errors (Postgres) or returns an arbitrary status unrelated to the latest timestamp (MySQL) — you get MAX(created_at) but some *other* row's status. Use DISTINCT ON (`SELECT DISTINCT ON (order_id) order_id, status, created_at ... ORDER BY order_id, created_at DESC`) or a window function (ROW_NUMBER) to pick the actual latest row.",
      },
      {
        lines: [3, 3],
        category: "edge-case",
        title: "Ties on created_at are non-deterministic",
        explanation:
          "If two events for one order share the exact created_at, 'the latest' is ambiguous and the row returned can vary between runs. Add a tiebreaker to the ordering (e.g. event id DESC) so results are stable.",
        points: 5,
      },
    ],
  },
  {
    slug: "sql-bulk-price-update",
    title: "Raise prices for a supplier",
    prompt:
      "Write an UPDATE that raises every product price by 10% for products from supplier 42.",
    language: "sql",
    difficulty: "intermediate",
    estimatedMinutes: 6,
    code: `UPDATE products
SET price = price * 1.1
WHERE supplier_id = 42
LIMIT 100;`,
    findings: [
      {
        lines: [4, 4],
        category: "hallucinated-api",
        title: "Postgres UPDATE doesn't support LIMIT",
        explanation:
          "`UPDATE ... LIMIT` is MySQL syntax — Postgres raises a syntax error at LIMIT. To cap rows in Postgres you'd update via a subquery/CTE selecting the ids. (And here the arbitrary LIMIT 100 would silently update only *some* matching products, which the prompt didn't want anyway.)",
      },
      {
        lines: [2, 2],
        category: "edge-case",
        title: "Repeated runs compound the increase, and rounding drifts",
        explanation:
          "This UPDATE isn't idempotent — running it twice raises prices 21%, not 10%; if it's part of a retriable job, guard against double-application. Also `price * 1.1` on a NUMERIC(…,2) rounds per row, so cumulative or fractional-cent results may need explicit ROUND to the currency scale.",
        points: 5,
      },
    ],
  },
  {
    slug: "sql-orders-with-items",
    title: "Orders with their item counts",
    prompt:
      "Postgres: list each order with how many line items it has. Orders with no items should show 0.",
    language: "sql",
    difficulty: "intermediate",
    estimatedMinutes: 6,
    code: `SELECT o.id, COUNT(*) AS item_count
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id;`,
    findings: [
      {
        lines: [1, 1],
        category: "logic-bug",
        title: "COUNT(*) counts the NULL-extended row as 1",
        explanation:
          "With a LEFT JOIN, an order with no items still produces one row (all order_items columns NULL), and COUNT(*) counts that row as 1 — so empty orders show item_count 1 instead of 0. Count a column from the joined table: `COUNT(oi.id)`, which ignores NULLs.",
      },
    ],
  },
  {
    slug: "sql-search-products",
    title: "Product search by name",
    prompt:
      "Postgres: a function/query that finds products whose name contains a user-supplied search term, case-insensitive.",
    language: "sql",
    difficulty: "advanced",
    estimatedMinutes: 8,
    code: `-- term comes straight from the search box
CREATE FUNCTION search_products(term TEXT)
RETURNS SETOF products AS $$
BEGIN
  RETURN QUERY EXECUTE
    'SELECT * FROM products
     WHERE name ILIKE ''%' || term || '%''';
END;
$$ LANGUAGE plpgsql;`,
    findings: [
      {
        lines: [7, 7],
        category: "security",
        title: "SQL injection via string-concatenated dynamic SQL",
        explanation:
          "term is concatenated straight into the executed statement, so a term like `'; DROP TABLE products; --` runs. When you must use EXECUTE, pass parameters with USING and a placeholder: `EXECUTE 'SELECT * FROM products WHERE name ILIKE $1' USING '%' || term || '%'` — or skip dynamic SQL entirely and write a plain parameterized query. Escaping is a separate concern: a term containing % or _ is still treated as a wildcard, so escape user wildcards if the term should match literally.",
      },
      {
        lines: [5, 5],
        category: "performance",
        title: "Dynamic EXECUTE + leading-wildcard ILIKE forces a full scan",
        explanation:
          "This whole query could be a plain parameterized statement — the EXECUTE dynamic SQL buys nothing but the injection risk above. And `ILIKE '%term%'` with a leading % can't use a normal btree index, so it sequentially scans products every call. For real search, add a trigram GIN index (pg_trgm) or use full-text search (tsvector) so the lookup is indexable.",
        points: 5,
      },
    ],
  },
  {
    slug: "sql-cohort-retention",
    title: "Monthly new-customer counts",
    prompt:
      "Postgres: count new customers per signup month for 2024, with months labeled and in chronological order.",
    language: "sql",
    difficulty: "advanced",
    estimatedMinutes: 8,
    code: `SELECT
  EXTRACT(MONTH FROM created_at) AS month,
  COUNT(DISTINCT id) AS new_customers
FROM customers
WHERE created_at BETWEEN '2024-01-01' AND '2024-12-31'
GROUP BY month
ORDER BY month;`,
    findings: [
      {
        lines: [5, 5],
        category: "edge-case",
        title: "BETWEEN excludes most of December 31st",
        explanation:
          "'2024-12-31' as a timestamp is midnight, so BETWEEN drops everything after 2024-12-31 00:00:00 — nearly a full day of signups. Use a half-open range: `created_at >= '2024-01-01' AND created_at < '2025-01-01'`.",
      },
      {
        lines: [2, 2],
        category: "logic-bug",
        title: "EXTRACT(MONTH) collapses different years' same month",
        explanation:
          "It returns 1..12 with no year — harmless while the filter is a single year, but it breaks the moment the range spans years, and the label is a bare number, not a month. Prefer `DATE_TRUNC('month', created_at)` for grouping/order and format the label in the SELECT.",
        points: 5,
      },
      {
        lines: [3, 3],
        category: "performance",
        title: "COUNT(DISTINCT id) on a primary key is redundant work",
        explanation:
          "id is unique, so DISTINCT does nothing but add a sort/hash step — `COUNT(*)` is equivalent and cheaper here. Reserve COUNT(DISTINCT …) for genuinely non-unique expressions.",
      },
    ],
  },
  {
    slug: "sql-delete-old-logs",
    title: "Delete old audit logs",
    prompt:
      "Write SQL to delete audit_logs older than 90 days. The table has hundreds of millions of rows.",
    language: "sql",
    difficulty: "intermediate",
    estimatedMinutes: 6,
    code: `DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '90 days'
OR created_at IS NULL;`,
    findings: [
      {
        lines: [3, 3],
        category: "logic-bug",
        title: "OR broadens the delete beyond the intent",
        explanation:
          "Precedence aside, adding `OR created_at IS NULL` silently deletes every row with a NULL timestamp regardless of age — rows that may be recent or that you didn't mean to touch. If NULLs should be purged, say so explicitly; otherwise drop this clause. When mixing AND/OR in a WHERE, always parenthesize to make intent unambiguous.",
      },
      {
        lines: [1, 2],
        category: "performance",
        title: "One giant DELETE locks the table and bloats the WAL",
        explanation:
          "A single DELETE across hundreds of millions of rows holds locks for a long time, generates enormous WAL, and can time out or block writers. Delete in batches (e.g. `DELETE ... WHERE ctid IN (SELECT ctid ... LIMIT 10000)` in a loop), or better, partition by time and DROP old partitions — an instant metadata operation instead of a row-by-row delete.",
        points: 5,
      },
    ],
  },
];
