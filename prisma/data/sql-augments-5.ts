import type { SqlAugment } from "./sql-augments.types";

const augments: SqlAugment[] = [
  {
    title: "How do you optimize a slow SQL query?",
    description:
      "Explain query optimization.\n\n" +
      "Here is the schema for our `orders` and `customers` tables:\n" +
      "```sql\n" +
      "CREATE TABLE customers (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  name VARCHAR(50),\n" +
      "  region VARCHAR(30)\n" +
      ");\n" +
      "INSERT INTO customers VALUES (1, 'Alice', 'East');\n" +
      "INSERT INTO customers VALUES (2, 'Bob', 'West');\n" +
      "INSERT INTO customers VALUES (3, 'Charlie', 'East');\n\n" +
      "CREATE TABLE orders (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  customer_id INT,\n" +
      "  product VARCHAR(50),\n" +
      "  amount INT\n" +
      ");\n" +
      "INSERT INTO orders VALUES (1, 1, 'Laptop', 1200);\n" +
      "INSERT INTO orders VALUES (2, 1, 'Phone', 800);\n" +
      "INSERT INTO orders VALUES (3, 2, 'Tablet', 400);\n" +
      "INSERT INTO orders VALUES (4, 3, 'Laptop', 1200);\n" +
      "INSERT INTO orders VALUES (5, 2, 'Phone', 800);\n" +
      "```",
    answer:
      "## SQL Query Optimization Strategies\n\n" +
      "Optimizing a slow query is a systematic process. Follow this checklist from highest to lowest impact:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 220' role='img' aria-label='Query optimization strategy pyramid'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- Optimization pyramid -->" +
      "<g transform='translate(80, 10)'>" +
      "  <rect class='d-box-accent' x='70' y='0' width='180' height='30' rx='4'/>" +
      "  <text class='d-accent d-text' x='160' y='20' text-anchor='middle' font-size='9' font-weight='bold'>1. Check EXPLAIN Plan</text>" +
      "  <rect class='d-box' x='40' y='35' width='240' height='30' rx='4'/>" +
      "  <text class='d-sub' x='160' y='55' text-anchor='middle' font-size='9' font-weight='bold'>2. Add / Fix Indexes</text>" +
      "  <rect class='d-box' x='10' y='70' width='300' height='30' rx='4'/>" +
      "  <text class='d-sub' x='160' y='90' text-anchor='middle' font-size='9' font-weight='bold'>3. Rewrite the Query</text>" +
      "  <rect class='d-box' x='0' y='105' width='320' height='30' rx='4'/>" +
      "  <text class='d-sub' x='160' y='125' text-anchor='middle' font-size='9' font-weight='bold'>4. Reduce Result Set</text>" +
      "  <rect class='d-box' x='0' y='140' width='320' height='30' rx='4'/>" +
      "  <text class='d-sub' x='160' y='160' text-anchor='middle' font-size='9' font-weight='bold'>5. Schema / Architecture Changes</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### Optimization Checklist\n\n" +
      "| Step | Action | Details |\n" +
      "|---:|---|---|\n" +
      "| 1 | **Run EXPLAIN** | Look for full table scans, missing indexes, and high row estimates. |\n" +
      "| 2 | **Add indexes** | Index columns used in `WHERE`, `JOIN`, `ORDER BY`, and `GROUP BY`. |\n" +
      "| 3 | **Rewrite the query** | Replace `NOT IN` with `NOT EXISTS`, correlated subqueries with JOINs. |\n" +
      "| 4 | **Select only needed columns** | Avoid `SELECT *` — fetch only required fields. |\n" +
      "| 5 | **Filter early** | Push `WHERE` conditions as early as possible (predicate pushdown). |\n" +
      "| 6 | **Limit results** | Use `LIMIT` / `TOP` to reduce data transferred. |\n" +
      "| 7 | **Avoid functions on indexed columns** | `WHERE YEAR(created_at) = 2024` prevents index usage; use range conditions instead. |\n" +
      "| 8 | **Denormalize if needed** | Materialized views, summary tables for read-heavy workloads. |\n\n" +
      "### Anti-Patterns to Avoid\n\n" +
      "```sql\n-- ❌ Function on indexed column (prevents index use):\nWHERE UPPER(name) = 'ALICE'\n\n-- ✅ Use a case-insensitive collation or store normalized:\nWHERE name = 'Alice'\n\n-- ❌ SELECT * (fetches unnecessary data):\nSELECT * FROM orders JOIN customers ON ...\n\n-- ✅ Select only what you need:\nSELECT o.id, c.name, o.amount FROM orders o JOIN customers c ON ...\n```\n\n" +
      "**Interview tip:** Always start your answer with *\"First I'd run EXPLAIN to identify the bottleneck\"* — this shows a methodical approach rather than guessing.",
    examples: [
      {
        label: "Query Optimization Playground",
        tech: "sql",
        code:
          "-- Check the execution plan:\n" +
          "EXPLAIN QUERY PLAN\n" +
          "SELECT c.name, SUM(o.amount) AS total\n" +
          "FROM orders o\n" +
          "JOIN customers c ON o.customer_id = c.id\n" +
          "WHERE c.region = 'East'\n" +
          "GROUP BY c.name;\n" +
          "\n" +
          "-- Then run the optimized query:\n" +
          "SELECT c.name, SUM(o.amount) AS total\n" +
          "FROM orders o\n" +
          "JOIN customers c ON o.customer_id = c.id\n" +
          "WHERE c.region = 'East'\n" +
          "GROUP BY c.name;"
      }
    ]
  },
  {
    title: "How do you read an EXPLAIN query plan?",
    description:
      "Explain EXPLAIN plans.\n\n" +
      "Here is the schema for our `orders` table:\n" +
      "```sql\n" +
      "CREATE TABLE orders (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  customer_id INT,\n" +
      "  product VARCHAR(50),\n" +
      "  amount INT,\n" +
      "  created_at TEXT\n" +
      ");\n" +
      "INSERT INTO orders VALUES (1, 1, 'Laptop', 1200, '2024-01-15');\n" +
      "INSERT INTO orders VALUES (2, 2, 'Phone', 800, '2024-02-20');\n" +
      "INSERT INTO orders VALUES (3, 1, 'Tablet', 400, '2024-03-10');\n" +
      "INSERT INTO orders VALUES (4, 3, 'Laptop', 1200, '2024-04-05');\n" +
      "INSERT INTO orders VALUES (5, 2, 'Monitor', 600, '2024-05-12');\n" +
      "```",
    answer:
      "## Reading an EXPLAIN Query Plan\n\n" +
      "`EXPLAIN` (or `EXPLAIN ANALYZE`) shows the **execution strategy** the database optimizer chose for your query. It reveals which indexes are used, how tables are scanned, and estimated vs. actual row counts.\n\n" +
      "### Key Terms Across Engines\n\n" +
      "| Term | Meaning | Good or Bad |\n" +
      "|---|---|---|\n" +
      "| **Seq Scan / Full Table Scan** | Reads every row in the table | ⚠️ Bad on large tables |\n" +
      "| **Index Scan** | Uses an index to find matching rows | ✅ Good |\n" +
      "| **Index Only Scan** | All data comes from the index (covering index) | ✅ Best |\n" +
      "| **Nested Loop** | For each row in outer table, scan inner table | ⚠️ Slow for large × large |\n" +
      "| **Hash Join** | Build hash table on smaller table, probe with larger | ✅ Good for equi-joins |\n" +
      "| **Merge Join** | Both inputs sorted, merge side by side | ✅ Good when pre-sorted |\n" +
      "| **Sort** | Sort operation (for ORDER BY, DISTINCT, Merge Join) | ⚠️ Check if it spills to disk |\n" +
      "| **Bitmap Scan** | Combine multiple indexes into a bitmap | ✅ Good for OR conditions |\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 200' role='img' aria-label='EXPLAIN plan tree structure'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- Query plan tree -->" +
      "<g transform='translate(150, 10)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='180' height='30' rx='4'/>" +
      "  <text class='d-accent d-text' x='90' y='20' text-anchor='middle' font-size='9' font-weight='bold'>SELECT (Result)</text>" +
      "</g>" +
      "<line class='d-edge' x1='200' y1='40' x2='120' y2='60' marker-end='url(#arrow)'/>" +
      "<line class='d-edge' x1='280' y1='40' x2='360' y2='60' marker-end='url(#arrow)'/>" +
      "<!-- Left branch -->" +
      "<g transform='translate(40, 65)'>" +
      "  <rect class='d-box' x='0' y='0' width='160' height='30' rx='4'/>" +
      "  <text class='d-sub' x='80' y='20' text-anchor='middle' font-size='9' font-weight='bold'>Hash Join (cost: 5.2)</text>" +
      "</g>" +
      "<line class='d-edge' x1='80' y1='95' x2='60' y2='115' marker-end='url(#arrow)'/>" +
      "<line class='d-edge' x1='150' y1='95' x2='200' y2='115' marker-end='url(#arrow)'/>" +
      "<g transform='translate(5, 120)'>" +
      "  <rect class='d-box' x='0' y='0' width='110' height='30' rx='4'/>" +
      "  <text class='d-sub' x='55' y='20' text-anchor='middle' font-size='8'>Seq Scan: orders</text>" +
      "</g>" +
      "<g transform='translate(145, 120)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='120' height='30' rx='4'/>" +
      "  <text class='d-accent d-text' x='60' y='20' text-anchor='middle' font-size='8'>Index Scan: customers</text>" +
      "</g>" +
      "<!-- Right branch -->" +
      "<g transform='translate(310, 65)'>" +
      "  <rect class='d-box' x='0' y='0' width='130' height='30' rx='4'/>" +
      "  <text class='d-sub' x='65' y='20' text-anchor='middle' font-size='9' font-weight='bold'>Sort (cost: 2.1)</text>" +
      "</g>" +
      "<!-- Legend -->" +
      "<g transform='translate(310, 140)'>" +
      "  <rect class='d-box' x='0' y='0' width='160' height='50' rx='4'/>" +
      "  <text class='d-sub' x='80' y='18' text-anchor='middle' font-weight='bold' font-size='8'>Read Bottom → Top</text>" +
      "  <text class='d-sub' x='80' y='38' text-anchor='middle' font-size='8'>Leaf nodes execute first</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### What to Look For\n\n" +
      "1. **Full table scans** on large tables → Add an index.\n" +
      "2. **High estimated rows** vs actual rows → Statistics are stale, run `ANALYZE`.\n" +
      "3. **Nested loops** with large inner tables → Consider a hash or merge join.\n" +
      "4. **Sort operations** → Can you add an index to avoid sorting?\n" +
      "5. **Filter applied late** → Can you push the predicate closer to the scan?\n\n" +
      "**Interview tip:** Always mention that you read the plan **bottom-up and inside-out** — leaf nodes execute first, parent nodes consume their output.",
    examples: [
      {
        label: "EXPLAIN Plan Playground",
        tech: "sql",
        code:
          "-- View the query plan:\n" +
          "EXPLAIN QUERY PLAN\n" +
          "SELECT product, SUM(amount) AS total\n" +
          "FROM orders\n" +
          "WHERE amount > 500\n" +
          "GROUP BY product\n" +
          "ORDER BY total DESC;\n" +
          "\n" +
          "-- Create an index and compare:\n" +
          "CREATE INDEX idx_orders_amount ON orders(amount);\n" +
          "\n" +
          "EXPLAIN QUERY PLAN\n" +
          "SELECT product, SUM(amount) AS total\n" +
          "FROM orders\n" +
          "WHERE amount > 500\n" +
          "GROUP BY product\n" +
          "ORDER BY total DESC;"
      }
    ]
  },
  {
    title: "What is a covering index?",
    description:
      "Explain covering indexes.\n\n" +
      "Here is the schema for our `orders` table:\n" +
      "```sql\n" +
      "CREATE TABLE orders (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  customer_id INT,\n" +
      "  product VARCHAR(50),\n" +
      "  amount INT,\n" +
      "  status VARCHAR(20)\n" +
      ");\n" +
      "INSERT INTO orders VALUES (1, 101, 'Laptop', 1200, 'shipped');\n" +
      "INSERT INTO orders VALUES (2, 102, 'Phone', 800, 'delivered');\n" +
      "INSERT INTO orders VALUES (3, 101, 'Tablet', 400, 'shipped');\n" +
      "INSERT INTO orders VALUES (4, 103, 'Monitor', 600, 'pending');\n" +
      "INSERT INTO orders VALUES (5, 102, 'Keyboard', 100, 'delivered');\n" +
      "```",
    answer:
      "## Covering Index\n\n" +
      "A **covering index** is an index that contains **all columns** needed to satisfy a query, so the database can answer the query **entirely from the index** without reading the actual table rows (no \"table lookup\" or \"heap fetch\" needed).\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 180' role='img' aria-label='Covering index vs regular index lookup'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- Regular index path -->" +
      "<g transform='translate(10, 10)'>" +
      "  <text class='d-sub' x='115' y='0' text-anchor='middle' font-weight='bold' font-size='10'>Regular Index</text>" +
      "  <rect class='d-box' x='0' y='10' width='100' height='40' rx='4'/>" +
      "  <text class='d-sub' x='50' y='35' text-anchor='middle' font-size='9'>Index Scan</text>" +
      "  <line class='d-edge' x1='100' y1='30' x2='130' y2='30' marker-end='url(#arrow)'/>" +
      "  <rect class='d-box' x='135' y='10' width='100' height='40' rx='4'/>" +
      "  <text class='d-accent d-text' x='185' y='28' text-anchor='middle' font-size='8' font-weight='bold'>Table Lookup</text>" +
      "  <text class='d-sub' x='185' y='42' text-anchor='middle' font-size='7'>(extra I/O!)</text>" +
      "</g>" +
      "<!-- Covering index path -->" +
      "<g transform='translate(10, 90)'>" +
      "  <text class='d-accent d-text' x='115' y='0' text-anchor='middle' font-weight='bold' font-size='10'>Covering Index</text>" +
      "  <rect class='d-box-accent' x='0' y='10' width='130' height='40' rx='4'/>" +
      "  <text class='d-accent d-text' x='65' y='28' text-anchor='middle' font-size='9'>Index Only Scan</text>" +
      "  <text class='d-sub' x='65' y='42' text-anchor='middle' font-size='7'>(all data in index)</text>" +
      "  <line class='d-edge' x1='130' y1='30' x2='160' y2='30' marker-end='url(#arrow)'/>" +
      "  <text class='d-accent d-text' x='185' y='35' font-size='9' font-weight='bold'>✅ Done!</text>" +
      "</g>" +
      "<!-- Comparison -->" +
      "<g transform='translate(280, 15)'>" +
      "  <rect class='d-box' x='0' y='0' width='190' height='145' rx='5'/>" +
      "  <text class='d-sub' x='95' y='20' text-anchor='middle' font-weight='bold' font-size='9'>Example</text>" +
      "  <text class='d-sub' x='10' y='45' font-size='8'>Query: SELECT product, amount</text>" +
      "  <text class='d-sub' x='10' y='60' font-size='8'>FROM orders WHERE status='shipped'</text>" +
      "  <text class='d-sub' x='10' y='85' font-size='8'>Regular: INDEX(status)</text>" +
      "  <text class='d-sub' x='10' y='100' font-size='8'>→ find rows, then read table</text>" +
      "  <text class='d-accent d-text' x='10' y='120' font-size='8' font-weight='bold'>Covering: INDEX(status,</text>" +
      "  <text class='d-accent d-text' x='10' y='135' font-size='8' font-weight='bold'>product, amount) → done!</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### How to Create a Covering Index\n\n" +
      "```sql\n-- This query:\nSELECT product, amount FROM orders WHERE status = 'shipped';\n\n-- Needs this covering index:\nCREATE INDEX idx_cover ON orders(status, product, amount);\n-- Now it's an \"Index Only Scan\" — no table access!\n```\n\n" +
      "### Trade-offs\n\n" +
      "| Advantage | Disadvantage |\n" +
      "|---|---|\n" +
      "| Eliminates expensive table lookups | Index size increases (more columns stored) |\n" +
      "| Dramatically speeds up read queries | Slows down writes (more data to maintain) |\n" +
      "| Reduces I/O by staying in index pages | May not help if query columns change often |\n\n" +
      "**Interview tip:** If asked *\"how would you speed up this specific query?\"*, check if adding extra columns to an existing index would make it **covering** — it's one of the most impactful optimizations.",
    examples: [
      {
        label: "Covering Index Playground",
        tech: "sql",
        code:
          "-- Step 1: Plan WITHOUT covering index:\n" +
          "EXPLAIN QUERY PLAN\n" +
          "SELECT product, amount FROM orders WHERE status = 'shipped';\n" +
          "\n" +
          "-- Step 2: Create a covering index:\n" +
          "CREATE INDEX idx_cover ON orders(status, product, amount);\n" +
          "\n" +
          "-- Step 3: Plan WITH covering index (Index Only Scan):\n" +
          "EXPLAIN QUERY PLAN\n" +
          "SELECT product, amount FROM orders WHERE status = 'shipped';"
      }
    ]
  },
  {
    title: "Why does column order matter in a composite index?",
    description:
      "Explain composite index column order.\n\n" +
      "Here is the schema for our `orders` table:\n" +
      "```sql\n" +
      "CREATE TABLE orders (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  customer_id INT,\n" +
      "  status VARCHAR(20),\n" +
      "  amount INT,\n" +
      "  created_at TEXT\n" +
      ");\n" +
      "INSERT INTO orders VALUES (1, 101, 'shipped', 1200, '2024-01-15');\n" +
      "INSERT INTO orders VALUES (2, 102, 'pending', 800, '2024-02-20');\n" +
      "INSERT INTO orders VALUES (3, 101, 'shipped', 400, '2024-03-10');\n" +
      "INSERT INTO orders VALUES (4, 103, 'delivered', 1200, '2024-04-05');\n" +
      "INSERT INTO orders VALUES (5, 102, 'shipped', 600, '2024-05-12');\n" +
      "```",
    answer:
      "## Composite Index Column Order — The Left-Prefix Rule\n\n" +
      "A **composite index** (multi-column index) is a B-Tree sorted by the first column, then by the second within each group of the first, and so on. The database can only use the index starting from the **leftmost** columns — this is the **left-prefix rule**.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 200' role='img' aria-label='Composite index left-prefix rule visualization'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- Index structure INDEX(status, customer_id, amount) -->" +
      "<g transform='translate(15, 10)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='450' height='30' rx='4'/>" +
      "  <text class='d-accent d-text' x='225' y='20' text-anchor='middle' font-weight='bold' font-size='10'>INDEX(status, customer_id, amount)</text>" +
      "</g>" +
      "<!-- Level 1: status -->" +
      "<g transform='translate(15, 50)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='130' height='30' rx='4'/>" +
      "  <text class='d-accent d-text' x='65' y='20' text-anchor='middle' font-size='9' font-weight='bold'>delivered</text>" +
      "  <rect class='d-box-accent' x='160' y='0' width='130' height='30' rx='4'/>" +
      "  <text class='d-accent d-text' x='225' y='20' text-anchor='middle' font-size='9' font-weight='bold'>pending</text>" +
      "  <rect class='d-box-accent' x='320' y='0' width='130' height='30' rx='4'/>" +
      "  <text class='d-accent d-text' x='385' y='20' text-anchor='middle' font-size='9' font-weight='bold'>shipped</text>" +
      "</g>" +
      "<!-- Level 2: customer_id within status -->" +
      "<line class='d-edge' x1='385' y1='80' x2='340' y2='100' marker-end='url(#arrow)'/>" +
      "<line class='d-edge' x1='385' y1='80' x2='430' y2='100' marker-end='url(#arrow)'/>" +
      "<g transform='translate(305, 105)'>" +
      "  <rect class='d-box' x='0' y='0' width='55' height='25' rx='3'/>" +
      "  <text class='d-sub' x='28' y='17' text-anchor='middle' font-size='8'>c:101</text>" +
      "</g>" +
      "<g transform='translate(400, 105)'>" +
      "  <rect class='d-box' x='0' y='0' width='55' height='25' rx='3'/>" +
      "  <text class='d-sub' x='28' y='17' text-anchor='middle' font-size='8'>c:102</text>" +
      "</g>" +
      "<!-- Usability table -->" +
      "<g transform='translate(15, 145)'>" +
      "  <rect class='d-box' x='0' y='0' width='450' height='45' rx='4'/>" +
      "  <text class='d-sub' x='20' y='17' font-size='8'>✅ WHERE status='shipped'</text>" +
      "  <text class='d-sub' x='220' y='17' font-size='8'>✅ WHERE status='shipped' AND customer_id=101</text>" +
      "  <text class='d-accent d-text' x='20' y='37' font-size='8' font-weight='bold'>❌ WHERE customer_id=101 (skips leftmost!)</text>" +
      "  <text class='d-accent d-text' x='270' y='37' font-size='8' font-weight='bold'>❌ WHERE amount > 500 (skips leftmost!)</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### Which Queries Can Use INDEX(A, B, C)?\n\n" +
      "| Query WHERE Clause | Uses Index? | Reason |\n" +
      "|---|---|---|\n" +
      "| `WHERE A = ?` | ✅ Yes | Uses first column |\n" +
      "| `WHERE A = ? AND B = ?` | ✅ Yes | Uses first two columns |\n" +
      "| `WHERE A = ? AND B = ? AND C = ?` | ✅ Yes (full) | Uses all three columns |\n" +
      "| `WHERE B = ?` | ❌ No | Skips column A |\n" +
      "| `WHERE C = ?` | ❌ No | Skips columns A and B |\n" +
      "| `WHERE A = ? AND C = ?` | ⚠️ Partial | Uses A only, cannot skip B |\n\n" +
      "### Column Order Guidelines\n\n" +
      "1. **Equality columns first** — columns used with `=` should come before range columns (`>`, `<`, `BETWEEN`).\n" +
      "2. **High-selectivity columns first** — columns that filter out more rows should appear earlier.\n" +
      "3. **ORDER BY columns last** — if the index order matches `ORDER BY`, the database can skip sorting.\n\n" +
      "**Interview tip:** Say *\"I think of a composite index like a phone book — it's sorted by last name, then first name. You can look up by last name alone, but not by first name alone.\"*",
    examples: [
      {
        label: "Composite Index Playground",
        tech: "sql",
        code:
          "-- Create a composite index:\n" +
          "CREATE INDEX idx_status_cust ON orders(status, customer_id);\n" +
          "\n" +
          "-- ✅ This uses the index (leftmost prefix):\n" +
          "EXPLAIN QUERY PLAN\n" +
          "SELECT * FROM orders WHERE status = 'shipped';\n" +
          "\n" +
          "-- ✅ This also uses the index (both columns):\n" +
          "EXPLAIN QUERY PLAN\n" +
          "SELECT * FROM orders WHERE status = 'shipped' AND customer_id = 101;\n" +
          "\n" +
          "-- ❌ This cannot use the index (skips status):\n" +
          "EXPLAIN QUERY PLAN\n" +
          "SELECT * FROM orders WHERE customer_id = 101;"
      }
    ]
  },
  {
    title: "What is a deadlock and how do you prevent it?",
    description:
      "Explain deadlocks.\n\n" +
      "Here is the schema for our `accounts` table:\n" +
      "```sql\n" +
      "CREATE TABLE accounts (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  holder VARCHAR(50),\n" +
      "  balance REAL\n" +
      ");\n" +
      "INSERT INTO accounts VALUES (1, 'Alice', 5000.00);\n" +
      "INSERT INTO accounts VALUES (2, 'Bob', 3000.00);\n" +
      "INSERT INTO accounts VALUES (3, 'Charlie', 7500.00);\n" +
      "```",
    answer:
      "## Deadlocks in SQL\n\n" +
      "A **deadlock** occurs when two (or more) transactions are each waiting for the other to release a lock, creating a **circular dependency**. Neither can proceed, so the database must detect and break the cycle by rolling back one transaction (the \"victim\").\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 200' role='img' aria-label='Deadlock circular wait diagram'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- Transaction A -->" +
      "<g transform='translate(50, 30)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='140' height='50' rx='5'/>" +
      "  <text class='d-accent d-text' x='70' y='22' text-anchor='middle' font-weight='bold' font-size='10'>Transaction A</text>" +
      "  <text class='d-sub' x='70' y='40' text-anchor='middle' font-size='8'>Holds lock on Row 1</text>" +
      "</g>" +
      "<!-- Transaction B -->" +
      "<g transform='translate(290, 30)'>" +
      "  <rect class='d-box' x='0' y='0' width='140' height='50' rx='5'/>" +
      "  <text class='d-sub' x='70' y='22' text-anchor='middle' font-weight='bold' font-size='10'>Transaction B</text>" +
      "  <text class='d-sub' x='70' y='40' text-anchor='middle' font-size='8'>Holds lock on Row 2</text>" +
      "</g>" +
      "<!-- Wants arrows (creating cycle) -->" +
      "<line class='d-edge' x1='190' y1='45' x2='290' y2='45' marker-end='url(#arrow)' stroke-width='2'/>" +
      "<text class='d-accent d-text' x='240' y='38' text-anchor='middle' font-size='8' font-weight='bold'>Wants Row 2</text>" +
      "<line class='d-edge' x1='290' y1='65' x2='190' y2='65' marker-end='url(#arrow)' stroke-width='2'/>" +
      "<text class='d-accent d-text' x='240' y='78' text-anchor='middle' font-size='8' font-weight='bold'>Wants Row 1</text>" +
      "<!-- Deadlock symbol -->" +
      "<g transform='translate(190, 100)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='100' height='35' rx='5'/>" +
      "  <text class='d-accent d-text' x='50' y='22' text-anchor='middle' font-weight='bold' font-size='11'>🔒 DEADLOCK</text>" +
      "</g>" +
      "<!-- Prevention -->" +
      "<g transform='translate(50, 150)'>" +
      "  <rect class='d-box' x='0' y='0' width='380' height='40' rx='5'/>" +
      "  <text class='d-sub' x='190' y='16' text-anchor='middle' font-weight='bold' font-size='9'>Prevention: Always lock resources in the SAME ORDER</text>" +
      "  <text class='d-sub' x='190' y='32' text-anchor='middle' font-size='8'>Both transactions should lock Row 1 first, then Row 2</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### Classic Deadlock Scenario\n\n" +
      "```\nTime  Transaction A                 Transaction B\n─────────────────────────────────────────────────\nT1    LOCK Row 1 ✅                \nT2                                 LOCK Row 2 ✅\nT3    LOCK Row 2 ⏳ (waiting...)   \nT4                                 LOCK Row 1 ⏳ (waiting...)\n      ──── DEADLOCK! Circular wait ────\n```\n\n" +
      "### Prevention Strategies\n\n" +
      "| Strategy | How |\n" +
      "|---|---|\n" +
      "| **Consistent lock ordering** | Always acquire locks in the same order (e.g., by ascending PK) |\n" +
      "| **Short transactions** | Minimize the time locks are held — do work outside the transaction |\n" +
      "| **Lock timeouts** | Set `lock_timeout` so blocked transactions fail fast instead of waiting forever |\n" +
      "| **Retry logic** | Catch deadlock errors in the application and retry the transaction |\n" +
      "| **Reduce lock scope** | Use row-level locks instead of table-level locks |\n" +
      "| **Optimistic concurrency** | Use version columns instead of pessimistic locks |\n\n" +
      "**Interview tip:** The key insight is that deadlocks are **inevitable** in concurrent systems — the goal is not to prevent them entirely but to **minimize their frequency and handle them gracefully with retries**.",
    examples: [
      {
        label: "Lock Ordering Playground",
        tech: "sql",
        code:
          "-- Simulate a safe transfer (consistent lock ordering):\n" +
          "-- Always lock the lower ID first!\n" +
          "SELECT * FROM accounts WHERE id = 1; -- Lock Row 1 first\n" +
          "SELECT * FROM accounts WHERE id = 2; -- Then Row 2\n" +
          "\n" +
          "-- Perform the transfer:\n" +
          "UPDATE accounts SET balance = balance - 500 WHERE id = 1;\n" +
          "UPDATE accounts SET balance = balance + 500 WHERE id = 2;\n" +
          "\n" +
          "-- Verify:\n" +
          "SELECT * FROM accounts;"
      }
    ]
  },
  {
    title: "When would you use a transaction explicitly?",
    description:
      "Explain explicit transactions.\n\n" +
      "Here is the schema for our `accounts` and `transfers` tables:\n" +
      "```sql\n" +
      "CREATE TABLE accounts (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  holder VARCHAR(50),\n" +
      "  balance REAL\n" +
      ");\n" +
      "INSERT INTO accounts VALUES (1, 'Alice', 5000.00);\n" +
      "INSERT INTO accounts VALUES (2, 'Bob', 3000.00);\n\n" +
      "CREATE TABLE transfers (\n" +
      "  id INTEGER PRIMARY KEY AUTOINCREMENT,\n" +
      "  from_acct INT,\n" +
      "  to_acct INT,\n" +
      "  amount REAL,\n" +
      "  created_at TEXT DEFAULT CURRENT_TIMESTAMP\n" +
      ");\n" +
      "```",
    answer:
      "## Explicit Transactions\n\n" +
      "By default, most databases run in **auto-commit** mode — each statement is its own transaction. You use **explicit transactions** (`BEGIN` / `COMMIT` / `ROLLBACK`) when you need **atomicity across multiple statements** — either they all succeed or none of them take effect.\n\n" +
      "| Mode | Behavior | Use Case |\n" +
      "|---|---|---|\n" +
      "| **Auto-commit** | Each statement is its own transaction | Simple reads, single-statement writes |\n" +
      "| **Explicit** | Multiple statements grouped atomically | Transfers, multi-table updates, batch inserts |\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 170' role='img' aria-label='Transaction commit and rollback flow'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- BEGIN -->" +
      "<g transform='translate(10, 50)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='70' height='35' rx='4'/>" +
      "  <text class='d-accent d-text' x='35' y='22' text-anchor='middle' font-size='10' font-weight='bold'>BEGIN</text>" +
      "</g>" +
      "<line class='d-edge' x1='80' y1='67' x2='100' y2='67' marker-end='url(#arrow)'/>" +
      "<!-- Operations -->" +
      "<g transform='translate(105, 35)'>" +
      "  <rect class='d-box' x='0' y='0' width='130' height='65' rx='4'/>" +
      "  <text class='d-sub' x='65' y='18' text-anchor='middle' font-weight='bold' font-size='9'>Operations</text>" +
      "  <text class='d-sub' x='65' y='35' text-anchor='middle' font-size='8'>UPDATE acct 1 (-$500)</text>" +
      "  <text class='d-sub' x='65' y='50' text-anchor='middle' font-size='8'>UPDATE acct 2 (+$500)</text>" +
      "  <text class='d-sub' x='65' y='62' text-anchor='middle' font-size='8'>INSERT transfer log</text>" +
      "</g>" +
      "<!-- Success path -->" +
      "<line class='d-edge' x1='235' y1='55' x2='270' y2='35' marker-end='url(#arrow)'/>" +
      "<g transform='translate(275, 15)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='80' height='35' rx='4'/>" +
      "  <text class='d-accent d-text' x='40' y='22' text-anchor='middle' font-size='10' font-weight='bold'>COMMIT</text>" +
      "</g>" +
      "<line class='d-edge' x1='355' y1='32' x2='375' y2='32' marker-end='url(#arrow)'/>" +
      "<text class='d-sub' x='420' y='37' text-anchor='middle' font-size='9'>✅ All saved</text>" +
      "<!-- Failure path -->" +
      "<line class='d-edge' x1='235' y1='80' x2='270' y2='100' marker-end='url(#arrow)'/>" +
      "<g transform='translate(275, 85)'>" +
      "  <rect class='d-box' x='0' y='0' width='95' height='35' rx='4'/>" +
      "  <text class='d-sub' x='48' y='22' text-anchor='middle' font-size='10' font-weight='bold'>ROLLBACK</text>" +
      "</g>" +
      "<line class='d-edge' x1='370' y1='102' x2='390' y2='102' marker-end='url(#arrow)'/>" +
      "<text class='d-accent d-text' x='430' y='107' text-anchor='middle' font-size='9' font-weight='bold'>↩ All undone</text>" +
      "<!-- Label -->" +
      "<text class='d-sub' x='250' y='50' font-size='7'>Success</text>" +
      "<text class='d-accent d-text' x='250' y='100' font-size='7' font-weight='bold'>Error</text>" +
      "</svg>\n\n" +
      "### When to Use Explicit Transactions\n\n" +
      "1. **Money transfers** — Debit one account and credit another atomically.\n" +
      "2. **Multi-table inserts** — Insert a parent row and its children together.\n" +
      "3. **Batch operations** — Wrap 1000 inserts in one transaction for performance.\n" +
      "4. **Check-then-act patterns** — Read a value, validate it, then update based on it.\n" +
      "5. **Data migrations** — Move data between tables safely.\n\n" +
      "### Common Pitfalls\n\n" +
      "- **Long-running transactions** hold locks and block other users.\n" +
      "- **Forgetting COMMIT** — data appears saved in your session but isn't visible to others.\n" +
      "- **Nested transactions** — most engines don't truly nest; use `SAVEPOINT` instead.\n\n" +
      "**Interview tip:** Emphasize the real-world scenario: *\"A bank transfer must debit and credit atomically — if the debit succeeds but the credit fails, we'd lose money. That's why we wrap both in a transaction.\"*",
    examples: [
      {
        label: "Transaction Playground",
        tech: "sql",
        code:
          "-- Atomic bank transfer with transaction:\n" +
          "BEGIN TRANSACTION;\n" +
          "\n" +
          "-- Debit Alice\n" +
          "UPDATE accounts SET balance = balance - 500 WHERE id = 1;\n" +
          "\n" +
          "-- Credit Bob\n" +
          "UPDATE accounts SET balance = balance + 500 WHERE id = 2;\n" +
          "\n" +
          "-- Log the transfer\n" +
          "INSERT INTO transfers (from_acct, to_acct, amount)\n" +
          "VALUES (1, 2, 500.00);\n" +
          "\n" +
          "COMMIT;\n" +
          "\n" +
          "-- Verify results:\n" +
          "SELECT * FROM accounts;\n" +
          "SELECT * FROM transfers;"
      }
    ]
  },
  {
    title: "What is an UPSERT?",
    description:
      "Explain UPSERT.\n\n" +
      "Here is the schema for our `inventory` table:\n" +
      "```sql\n" +
      "CREATE TABLE inventory (\n" +
      "  product_id INT PRIMARY KEY,\n" +
      "  name VARCHAR(50),\n" +
      "  quantity INT,\n" +
      "  last_updated TEXT\n" +
      ");\n" +
      "INSERT INTO inventory VALUES (1, 'Widget', 100, '2024-01-15');\n" +
      "INSERT INTO inventory VALUES (2, 'Gadget', 50, '2024-02-20');\n" +
      "INSERT INTO inventory VALUES (3, 'Gizmo', 75, '2024-03-10');\n" +
      "```",
    answer:
      "## UPSERT — INSERT or UPDATE in One Statement\n\n" +
      "An **UPSERT** combines `INSERT` and `UPDATE` into a single atomic operation: if a row with the given key **exists**, it updates the existing row; if it **doesn't exist**, it inserts a new row.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 170' role='img' aria-label='UPSERT decision flow diagram'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- UPSERT input -->" +
      "<g transform='translate(10, 45)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='100' height='50' rx='5'/>" +
      "  <text class='d-accent d-text' x='50' y='22' text-anchor='middle' font-weight='bold' font-size='10'>UPSERT</text>" +
      "  <text class='d-sub' x='50' y='40' text-anchor='middle' font-size='8'>id=2, qty=200</text>" +
      "</g>" +
      "<!-- Decision diamond -->" +
      "<line class='d-edge' x1='110' y1='70' x2='145' y2='70' marker-end='url(#arrow)'/>" +
      "<g transform='translate(150, 40)'>" +
      "  <rect class='d-box' x='0' y='0' width='120' height='60' rx='5'/>" +
      "  <text class='d-sub' x='60' y='22' text-anchor='middle' font-weight='bold' font-size='9'>Row with</text>" +
      "  <text class='d-sub' x='60' y='38' text-anchor='middle' font-weight='bold' font-size='9'>id=2 exists?</text>" +
      "</g>" +
      "<!-- Yes path -->" +
      "<line class='d-edge' x1='270' y1='55' x2='310' y2='30' marker-end='url(#arrow)'/>" +
      "<text class='d-sub' x='288' y='38' font-size='7'>Yes</text>" +
      "<g transform='translate(315, 10)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='150' height='40' rx='5'/>" +
      "  <text class='d-accent d-text' x='75' y='17' text-anchor='middle' font-weight='bold' font-size='9'>UPDATE</text>" +
      "  <text class='d-sub' x='75' y='33' text-anchor='middle' font-size='8'>SET quantity=200</text>" +
      "</g>" +
      "<!-- No path -->" +
      "<line class='d-edge' x1='270' y1='85' x2='310' y2='110' marker-end='url(#arrow)'/>" +
      "<text class='d-accent d-text' x='288' y='102' font-size='7' font-weight='bold'>No</text>" +
      "<g transform='translate(315, 90)'>" +
      "  <rect class='d-box' x='0' y='0' width='150' height='40' rx='5'/>" +
      "  <text class='d-sub' x='75' y='17' text-anchor='middle' font-weight='bold' font-size='9'>INSERT</text>" +
      "  <text class='d-sub' x='75' y='33' text-anchor='middle' font-size='8'>New row with id=2</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### Syntax Across Databases\n\n" +
      "| Database | Syntax |\n" +
      "|---|---|\n" +
      "| **SQLite** | `INSERT ... ON CONFLICT(key) DO UPDATE SET ...` |\n" +
      "| **PostgreSQL** | `INSERT ... ON CONFLICT(key) DO UPDATE SET ...` |\n" +
      "| **MySQL** | `INSERT ... ON DUPLICATE KEY UPDATE ...` |\n" +
      "| **SQL Server** | `MERGE ... WHEN MATCHED THEN UPDATE WHEN NOT MATCHED THEN INSERT` |\n" +
      "| **Standard SQL** | `MERGE` statement |\n\n" +
      "### Why Not Just INSERT + UPDATE Separately?\n\n" +
      "- **Race conditions:** Between checking and inserting, another transaction could insert the same key.\n" +
      "- **Performance:** One statement = one round trip = one lock acquisition.\n" +
      "- **Atomicity:** The check-and-act is indivisible.\n\n" +
      "**Interview tip:** Mention that UPSERT is essential for **idempotent data pipelines** — you can safely retry a failed batch import without creating duplicates.",
    examples: [
      {
        label: "UPSERT Playground",
        tech: "sql",
        code:
          "-- Before: Check current inventory\n" +
          "SELECT * FROM inventory;\n\n" +
          "-- UPSERT: Update existing product (id=2)\n" +
          "INSERT INTO inventory (product_id, name, quantity, last_updated)\n" +
          "VALUES (2, 'Gadget', 200, '2024-06-01')\n" +
          "ON CONFLICT(product_id) DO UPDATE SET\n" +
          "  quantity = excluded.quantity,\n" +
          "  last_updated = excluded.last_updated;\n\n" +
          "-- UPSERT: Insert new product (id=4)\n" +
          "INSERT INTO inventory (product_id, name, quantity, last_updated)\n" +
          "VALUES (4, 'Doohickey', 30, '2024-06-01')\n" +
          "ON CONFLICT(product_id) DO UPDATE SET\n" +
          "  quantity = excluded.quantity,\n" +
          "  last_updated = excluded.last_updated;\n\n" +
          "-- After: Verify changes\n" +
          "SELECT * FROM inventory;"
      }
    ]
  },
  {
    title: "What are foreign key cascade options?",
    description:
      "Explain cascade options.\n\n" +
      "Here is the schema for our `departments` and `employees` tables:\n" +
      "```sql\n" +
      "CREATE TABLE departments (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  name VARCHAR(50)\n" +
      ");\n" +
      "INSERT INTO departments VALUES (1, 'Engineering');\n" +
      "INSERT INTO departments VALUES (2, 'Sales');\n" +
      "INSERT INTO departments VALUES (3, 'Marketing');\n\n" +
      "CREATE TABLE employees (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  name VARCHAR(50),\n" +
      "  dept_id INT REFERENCES departments(id) ON DELETE SET NULL ON UPDATE CASCADE\n" +
      ");\n" +
      "INSERT INTO employees VALUES (1, 'Alice', 1);\n" +
      "INSERT INTO employees VALUES (2, 'Bob', 2);\n" +
      "INSERT INTO employees VALUES (3, 'Charlie', 1);\n" +
      "INSERT INTO employees VALUES (4, 'David', 3);\n" +
      "```",
    answer:
      "## Foreign Key Cascade Options\n\n" +
      "When a parent row is **deleted** or **updated**, the cascade option determines what happens to the child rows that reference it:\n\n" +
      "| Option | On DELETE | On UPDATE |\n" +
      "|---|---|---|\n" +
      "| `CASCADE` | Delete all child rows | Update child FK values to match new parent PK |\n" +
      "| `SET NULL` | Set child FK column to NULL | Set child FK column to NULL |\n" +
      "| `SET DEFAULT` | Set child FK to its default value | Set child FK to its default value |\n" +
      "| `RESTRICT` | Block the delete if children exist | Block the update if children exist |\n" +
      "| `NO ACTION` | Same as RESTRICT (checked at statement end) | Same as RESTRICT (checked at statement end) |\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 220' role='img' aria-label='Foreign key cascade options comparison'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- Parent table -->" +
      "<g transform='translate(15, 10)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='120' height='40' rx='5'/>" +
      "  <text class='d-accent d-text' x='60' y='25' text-anchor='middle' font-weight='bold' font-size='10'>DELETE dept 1</text>" +
      "</g>" +
      "<!-- CASCADE -->" +
      "<line class='d-edge' x1='135' y1='20' x2='170' y2='20' marker-end='url(#arrow)'/>" +
      "<g transform='translate(175, 5)'>" +
      "  <rect class='d-box' x='0' y='0' width='140' height='50' rx='4'/>" +
      "  <text class='d-sub' x='70' y='18' text-anchor='middle' font-weight='bold' font-size='9'>ON DELETE CASCADE</text>" +
      "  <text class='d-accent d-text' x='70' y='38' text-anchor='middle' font-size='8' font-weight='bold'>Alice, Charlie DELETED</text>" +
      "</g>" +
      "<!-- SET NULL -->" +
      "<line class='d-edge' x1='75' y1='50' x2='75' y2='70' marker-end='url(#arrow)'/>" +
      "<g transform='translate(15, 75)'>" +
      "  <rect class='d-box' x='0' y='0' width='140' height='50' rx='4'/>" +
      "  <text class='d-sub' x='70' y='18' text-anchor='middle' font-weight='bold' font-size='9'>ON DELETE SET NULL</text>" +
      "  <text class='d-sub' x='70' y='38' text-anchor='middle' font-size='8'>Alice.dept_id → NULL</text>" +
      "</g>" +
      "<!-- RESTRICT -->" +
      "<g transform='translate(175, 75)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='140' height='50' rx='4'/>" +
      "  <text class='d-accent d-text' x='70' y='18' text-anchor='middle' font-weight='bold' font-size='9'>ON DELETE RESTRICT</text>" +
      "  <text class='d-accent d-text' x='70' y='38' text-anchor='middle' font-size='8' font-weight='bold'>❌ ERROR! Blocked</text>" +
      "</g>" +
      "<!-- Best practices -->" +
      "<g transform='translate(15, 145)'>" +
      "  <rect class='d-box' x='0' y='0' width='450' height='60' rx='5'/>" +
      "  <text class='d-sub' x='225' y='18' text-anchor='middle' font-weight='bold' font-size='9'>Best Practice Guidelines</text>" +
      "  <text class='d-sub' x='225' y='36' text-anchor='middle' font-size='8'>Use CASCADE sparingly — accidental deletes can wipe entire hierarchies.</text>" +
      "  <text class='d-sub' x='225' y='52' text-anchor='middle' font-size='8'>Prefer RESTRICT for critical data; use SET NULL for optional relationships.</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### When to Use Each\n\n" +
      "- **CASCADE:** Composition relationships (delete an order → delete its line items).\n" +
      "- **SET NULL:** Optional associations (delete a department → employees become unassigned).\n" +
      "- **RESTRICT:** Critical data protection (don't delete a customer who has orders).\n\n" +
      "**Interview tip:** Warn about the danger of cascading deletes: *\"CASCADE can silently delete thousands of child rows — in production, I prefer RESTRICT and handle orphans explicitly in application code.\"*",
    examples: [
      {
        label: "Cascade Options Playground",
        tech: "sql",
        code:
          "-- Enable foreign key enforcement (SQLite):\n" +
          "PRAGMA foreign_keys = ON;\n\n" +
          "-- Check current state:\n" +
          "SELECT e.name, e.dept_id, d.name AS dept_name\n" +
          "FROM employees e\n" +
          "LEFT JOIN departments d ON e.dept_id = d.id;\n\n" +
          "-- Delete department 3 (Marketing) — David's dept_id becomes NULL:\n" +
          "DELETE FROM departments WHERE id = 3;\n\n" +
          "-- Verify the cascade effect:\n" +
          "SELECT * FROM employees;"
      }
    ]
  },
  {
    title: "What is table partitioning?",
    description:
      "Explain table partitioning.\n\n" +
      "Here is the schema for our `sales` table:\n" +
      "```sql\n" +
      "CREATE TABLE sales (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  product VARCHAR(50),\n" +
      "  amount INT,\n" +
      "  region VARCHAR(20),\n" +
      "  sale_date TEXT\n" +
      ");\n" +
      "INSERT INTO sales VALUES (1, 'Laptop', 1200, 'East', '2024-01-15');\n" +
      "INSERT INTO sales VALUES (2, 'Phone', 800, 'West', '2024-02-20');\n" +
      "INSERT INTO sales VALUES (3, 'Tablet', 400, 'East', '2024-03-10');\n" +
      "INSERT INTO sales VALUES (4, 'Monitor', 600, 'North', '2024-04-05');\n" +
      "INSERT INTO sales VALUES (5, 'Keyboard', 100, 'West', '2024-05-12');\n" +
      "INSERT INTO sales VALUES (6, 'Laptop', 1200, 'East', '2024-06-20');\n" +
      "```",
    answer:
      "## Table Partitioning\n\n" +
      "**Partitioning** splits a large table into smaller, more manageable pieces called **partitions**, while still appearing as a single logical table to queries. Each partition stores a subset of the rows based on a **partitioning key**.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 200' role='img' aria-label='Table partitioning strategies comparison'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- Original table -->" +
      "<g transform='translate(10, 30)'>" +
      "  <rect class='d-box' x='0' y='0' width='90' height='140' rx='5'/>" +
      "  <text class='d-sub' x='45' y='20' text-anchor='middle' font-weight='bold' font-size='9'>Full Table</text>" +
      "  <text class='d-sub' x='45' y='45' text-anchor='middle' font-size='8'>1M+ rows</text>" +
      "  <text class='d-sub' x='45' y='65' text-anchor='middle' font-size='8'>All regions</text>" +
      "  <text class='d-sub' x='45' y='85' text-anchor='middle' font-size='8'>All dates</text>" +
      "  <text class='d-accent d-text' x='45' y='115' text-anchor='middle' font-size='7' font-weight='bold'>Slow scans!</text>" +
      "</g>" +
      "<!-- Arrow -->" +
      "<line class='d-edge' x1='105' y1='100' x2='135' y2='100' marker-end='url(#arrow)' stroke-width='2'/>" +
      "<!-- Range partitions -->" +
      "<g transform='translate(145, 10)'>" +
      "  <text class='d-sub' x='75' y='10' text-anchor='middle' font-weight='bold' font-size='9'>Range Partitioning (by date)</text>" +
      "  <rect class='d-box-accent' x='0' y='20' width='150' height='35' rx='4'/>" +
      "  <text class='d-accent d-text' x='75' y='42' text-anchor='middle' font-size='9'>Q1: Jan-Mar</text>" +
      "  <rect class='d-box-accent' x='0' y='60' width='150' height='35' rx='4'/>" +
      "  <text class='d-accent d-text' x='75' y='82' text-anchor='middle' font-size='9'>Q2: Apr-Jun</text>" +
      "  <rect class='d-box' x='0' y='100' width='150' height='35' rx='4'/>" +
      "  <text class='d-sub' x='75' y='122' text-anchor='middle' font-size='9'>Q3: Jul-Sep</text>" +
      "  <rect class='d-box' x='0' y='140' width='150' height='35' rx='4'/>" +
      "  <text class='d-sub' x='75' y='162' text-anchor='middle' font-size='9'>Q4: Oct-Dec</text>" +
      "</g>" +
      "<!-- List partitions -->" +
      "<g transform='translate(320, 10)'>" +
      "  <text class='d-sub' x='75' y='10' text-anchor='middle' font-weight='bold' font-size='9'>List Partitioning (by region)</text>" +
      "  <rect class='d-box-accent' x='0' y='20' width='150' height='35' rx='4'/>" +
      "  <text class='d-accent d-text' x='75' y='42' text-anchor='middle' font-size='9'>East</text>" +
      "  <rect class='d-box' x='0' y='60' width='150' height='35' rx='4'/>" +
      "  <text class='d-sub' x='75' y='82' text-anchor='middle' font-size='9'>West</text>" +
      "  <rect class='d-box' x='0' y='100' width='150' height='35' rx='4'/>" +
      "  <text class='d-sub' x='75' y='122' text-anchor='middle' font-size='9'>North</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### Partitioning Types\n\n" +
      "| Type | Key | Example |\n" +
      "|---|---|---|\n" +
      "| **Range** | Continuous value ranges | By date (Q1, Q2, Q3...), by ID range |\n" +
      "| **List** | Discrete value sets | By region (East, West), by status |\n" +
      "| **Hash** | Hash of column value | Distribute evenly across N partitions |\n" +
      "| **Composite** | Combination | Range by date, then list by region |\n\n" +
      "### Benefits\n\n" +
      "1. **Partition pruning:** Queries filtering by partition key scan only the relevant partition(s).\n" +
      "2. **Faster maintenance:** `TRUNCATE` or `DROP` a partition instead of deleting millions of rows.\n" +
      "3. **Parallel query execution:** Each partition can be scanned by a separate worker.\n" +
      "4. **Tablespace management:** Place hot partitions on fast SSDs, cold on slower storage.\n\n" +
      "### When to Partition\n\n" +
      "- Tables with **millions of rows** where queries consistently filter by a specific column.\n" +
      "- **Time-series data** where old data is archived or deleted periodically.\n" +
      "- NOT for small tables — partitioning overhead outweighs benefits.\n\n" +
      "**Interview tip:** Partitioning is a **physical optimization** (how data is stored), while normalization is a **logical design** (how data is structured). They solve different problems.",
    examples: [
      {
        label: "Partitioning Demo Playground",
        tech: "sql",
        code:
          "-- Simulate partition pruning with WHERE on the partition key:\n" +
          "-- Only scan Q1 data (Jan-Mar):\n" +
          "SELECT product, SUM(amount) AS total\n" +
          "FROM sales\n" +
          "WHERE sale_date BETWEEN '2024-01-01' AND '2024-03-31'\n" +
          "GROUP BY product;\n\n" +
          "-- Regional partition query:\n" +
          "SELECT region, COUNT(*) AS order_count, SUM(amount) AS revenue\n" +
          "FROM sales\n" +
          "GROUP BY region\n" +
          "ORDER BY revenue DESC;"
      }
    ]
  }
];

export default augments;
