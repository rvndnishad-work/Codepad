import type { SqlAugment } from "./sql-augments.types";

const augments: SqlAugment[] = [
  {
    title: "What is the logical order of execution of a SQL query?",
    description:
      "Explain query execution order.\n\n" +
      "Here is the schema for our `orders` table:\n" +
      "```sql\n" +
      "CREATE TABLE orders (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  customer VARCHAR(50),\n" +
      "  product VARCHAR(50),\n" +
      "  amount INT,\n" +
      "  region VARCHAR(30)\n" +
      ");\n" +
      "INSERT INTO orders VALUES (1, 'Alice', 'Laptop', 1200, 'East');\n" +
      "INSERT INTO orders VALUES (2, 'Bob', 'Tablet', 300, 'West');\n" +
      "INSERT INTO orders VALUES (3, 'Alice', 'Phone', 800, 'East');\n" +
      "INSERT INTO orders VALUES (4, 'Charlie', 'Laptop', 1200, 'West');\n" +
      "INSERT INTO orders VALUES (5, 'Bob', 'Phone', 800, 'East');\n" +
      "INSERT INTO orders VALUES (6, 'Alice', 'Tablet', 300, 'East');\n" +
      "```",
    answer:
      "## Logical Execution Order vs. Syntactic Order\n\n" +
      "SQL is a **declarative language**, so the order you write clauses (`SELECT`, `FROM`, `WHERE`, etc.) is **not** the order the engine processes them. Understanding the logical execution order is essential for debugging column aliasing issues, understanding when filters apply, and writing correct queries.\n\n" +
      "| Step | Clause | Purpose |\n" +
      "|---:|---|---|\n" +
      "| 1 | `FROM` / `JOIN` | Identify source tables and build the initial Cartesian product or join result. |\n" +
      "| 2 | `WHERE` | Filter individual rows (before grouping). |\n" +
      "| 3 | `GROUP BY` | Partition remaining rows into groups. |\n" +
      "| 4 | `HAVING` | Filter groups (after aggregation). |\n" +
      "| 5 | `SELECT` | Evaluate expressions and column aliases. |\n" +
      "| 6 | `DISTINCT` | Remove duplicate rows from the result set. |\n" +
      "| 7 | `ORDER BY` | Sort the final output. |\n" +
      "| 8 | `LIMIT` / `OFFSET` | Truncate rows for pagination. |\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 240' role='img' aria-label='SQL logical execution order pipeline'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- Pipeline stages -->" +
      "<g transform='translate(10, 15)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='90' height='35' rx='4'/>" +
      "  <text class='d-accent d-text' x='45' y='22' text-anchor='middle' font-size='10' font-weight='bold'>1 FROM</text>" +
      "</g>" +
      "<line class='d-edge' x1='100' y1='32' x2='120' y2='32' marker-end='url(#arrow)'/>" +
      "<g transform='translate(125, 15)'>" +
      "  <rect class='d-box' x='0' y='0' width='90' height='35' rx='4'/>" +
      "  <text class='d-sub' x='45' y='22' text-anchor='middle' font-size='10' font-weight='bold'>2 WHERE</text>" +
      "</g>" +
      "<line class='d-edge' x1='215' y1='32' x2='235' y2='32' marker-end='url(#arrow)'/>" +
      "<g transform='translate(240, 15)'>" +
      "  <rect class='d-box' x='0' y='0' width='100' height='35' rx='4'/>" +
      "  <text class='d-sub' x='50' y='22' text-anchor='middle' font-size='10' font-weight='bold'>3 GROUP BY</text>" +
      "</g>" +
      "<line class='d-edge' x1='340' y1='32' x2='360' y2='32' marker-end='url(#arrow)'/>" +
      "<g transform='translate(365, 15)'>" +
      "  <rect class='d-box' x='0' y='0' width='95' height='35' rx='4'/>" +
      "  <text class='d-sub' x='48' y='22' text-anchor='middle' font-size='10' font-weight='bold'>4 HAVING</text>" +
      "</g>" +
      "<!-- Second row -->" +
      "<line class='d-edge' x1='412' y1='50' x2='412' y2='80' marker-end='url(#arrow)'/>" +
      "<g transform='translate(365, 85)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='95' height='35' rx='4'/>" +
      "  <text class='d-accent d-text' x='48' y='22' text-anchor='middle' font-size='10' font-weight='bold'>5 SELECT</text>" +
      "</g>" +
      "<line class='d-edge' x1='365' y1='102' x2='345' y2='102' marker-end='url(#arrow)'/>" +
      "<g transform='translate(240, 85)'>" +
      "  <rect class='d-box' x='0' y='0' width='100' height='35' rx='4'/>" +
      "  <text class='d-sub' x='50' y='22' text-anchor='middle' font-size='10' font-weight='bold'>6 DISTINCT</text>" +
      "</g>" +
      "<line class='d-edge' x1='240' y1='102' x2='220' y2='102' marker-end='url(#arrow)'/>" +
      "<g transform='translate(125, 85)'>" +
      "  <rect class='d-box' x='0' y='0' width='90' height='35' rx='4'/>" +
      "  <text class='d-sub' x='45' y='22' text-anchor='middle' font-size='10' font-weight='bold'>7 ORDER BY</text>" +
      "</g>" +
      "<line class='d-edge' x1='125' y1='102' x2='105' y2='102' marker-end='url(#arrow)'/>" +
      "<g transform='translate(10, 85)'>" +
      "  <rect class='d-box' x='0' y='0' width='90' height='35' rx='4'/>" +
      "  <text class='d-sub' x='45' y='22' text-anchor='middle' font-size='10' font-weight='bold'>8 LIMIT</text>" +
      "</g>" +
      "<!-- Key insight box -->" +
      "<g transform='translate(30, 155)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='420' height='60' rx='5'/>" +
      "  <text class='d-accent d-text' x='210' y='20' text-anchor='middle' font-size='9' font-weight='bold'>Key Insight</text>" +
      "  <text class='d-sub' x='210' y='38' text-anchor='middle' font-size='8'>SELECT aliases are NOT available in WHERE/GROUP BY because SELECT runs AFTER them.</text>" +
      "  <text class='d-sub' x='210' y='52' text-anchor='middle' font-size='8'>ORDER BY CAN use aliases because it runs AFTER SELECT.</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### Why This Matters\n\n" +
      "- **Column aliases** defined in `SELECT` **cannot** be used in `WHERE` or `GROUP BY` (because those run first).\n" +
      "- `ORDER BY` **can** reference column aliases because it executes after `SELECT`.\n" +
      "- `HAVING` can use aggregate functions because it runs after `GROUP BY`.\n\n" +
      "**Interview tip:** Walk the interviewer through a concrete example: *\"If I write `SELECT SUM(amount) AS total FROM orders WHERE total > 100`—that fails because `WHERE` runs before `SELECT`, so `total` doesn't exist yet. I'd need `HAVING SUM(amount) > 100` instead.\"*",
    examples: [
      {
        label: "Execution Order Demo",
        tech: "sql",
        code:
          "-- This query exercises every clause in logical order:\n" +
          "SELECT \n" +
          "  customer, \n" +
          "  SUM(amount) AS total_spent\n" +
          "FROM orders\n" +
          "WHERE region = 'East'\n" +
          "GROUP BY customer\n" +
          "HAVING SUM(amount) > 500\n" +
          "ORDER BY total_spent DESC\n" +
          "LIMIT 5;"
      }
    ]
  },
  {
    title: "What is the difference between ROW_NUMBER, RANK, and DENSE_RANK?",
    description:
      "Explain ranking functions.\n\n" +
      "Here is the schema for our `exam_scores` table:\n" +
      "```sql\n" +
      "CREATE TABLE exam_scores (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  student VARCHAR(50),\n" +
      "  subject VARCHAR(50),\n" +
      "  score INT\n" +
      ");\n" +
      "INSERT INTO exam_scores VALUES (1, 'Alice', 'Math', 95);\n" +
      "INSERT INTO exam_scores VALUES (2, 'Bob', 'Math', 90);\n" +
      "INSERT INTO exam_scores VALUES (3, 'Charlie', 'Math', 90);\n" +
      "INSERT INTO exam_scores VALUES (4, 'David', 'Math', 85);\n" +
      "INSERT INTO exam_scores VALUES (5, 'Eve', 'Math', 80);\n" +
      "```",
    answer:
      "## Ranking Window Functions\n\n" +
      "All three are **window functions** that assign an ordinal position to each row within a partition based on an `ORDER BY`. The difference lies in **how they handle ties**:\n\n" +
      "| Function | Tie Handling | Gaps After Ties | Example (scores: 95, 90, 90, 85) |\n" +
      "|---|---|---|---|\n" +
      "| `ROW_NUMBER()` | No tie awareness — assigns unique sequential numbers | No gaps (every row is unique) | 1, 2, 3, 4 |\n" +
      "| `RANK()` | Tied rows get the **same** rank | **Yes** — skips positions after ties | 1, 2, 2, **4** |\n" +
      "| `DENSE_RANK()` | Tied rows get the **same** rank | **No** — next rank is consecutive | 1, 2, 2, **3** |\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 210' role='img' aria-label='ROW_NUMBER vs RANK vs DENSE_RANK comparison'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- Score column -->" +
      "<g transform='translate(10, 10)'>" +
      "  <rect class='d-box' x='0' y='0' width='80' height='190' rx='5'/>" +
      "  <text class='d-sub' x='40' y='20' text-anchor='middle' font-weight='bold' font-size='10'>Score</text>" +
      "  <text class='d-sub' x='40' y='50' text-anchor='middle' font-size='11'>95</text>" +
      "  <text class='d-sub' x='40' y='85' text-anchor='middle' font-size='11'>90</text>" +
      "  <text class='d-sub' x='40' y='120' text-anchor='middle' font-size='11'>90</text>" +
      "  <text class='d-sub' x='40' y='155' text-anchor='middle' font-size='11'>85</text>" +
      "  <text class='d-sub' x='40' y='185' text-anchor='middle' font-size='11'>80</text>" +
      "</g>" +
      "<!-- ROW_NUMBER column -->" +
      "<g transform='translate(120, 10)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='100' height='190' rx='5'/>" +
      "  <text class='d-accent d-text' x='50' y='20' text-anchor='middle' font-weight='bold' font-size='10'>ROW_NUMBER</text>" +
      "  <text class='d-sub' x='50' y='50' text-anchor='middle' font-size='11'>1</text>" +
      "  <text class='d-sub' x='50' y='85' text-anchor='middle' font-size='11'>2</text>" +
      "  <text class='d-sub' x='50' y='120' text-anchor='middle' font-size='11'>3</text>" +
      "  <text class='d-sub' x='50' y='155' text-anchor='middle' font-size='11'>4</text>" +
      "  <text class='d-sub' x='50' y='185' text-anchor='middle' font-size='11'>5</text>" +
      "</g>" +
      "<!-- RANK column -->" +
      "<g transform='translate(250, 10)'>" +
      "  <rect class='d-box' x='0' y='0' width='80' height='190' rx='5'/>" +
      "  <text class='d-sub' x='40' y='20' text-anchor='middle' font-weight='bold' font-size='10'>RANK</text>" +
      "  <text class='d-sub' x='40' y='50' text-anchor='middle' font-size='11'>1</text>" +
      "  <text class='d-sub' x='40' y='85' text-anchor='middle' font-size='11'>2</text>" +
      "  <text class='d-sub' x='40' y='120' text-anchor='middle' font-size='11'>2</text>" +
      "  <text class='d-accent d-text' x='40' y='155' text-anchor='middle' font-size='11' font-weight='bold'>4 (gap!)</text>" +
      "  <text class='d-sub' x='40' y='185' text-anchor='middle' font-size='11'>5</text>" +
      "</g>" +
      "<!-- DENSE_RANK column -->" +
      "<g transform='translate(360, 10)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='105' height='190' rx='5'/>" +
      "  <text class='d-accent d-text' x='52' y='20' text-anchor='middle' font-weight='bold' font-size='10'>DENSE_RANK</text>" +
      "  <text class='d-sub' x='52' y='50' text-anchor='middle' font-size='11'>1</text>" +
      "  <text class='d-sub' x='52' y='85' text-anchor='middle' font-size='11'>2</text>" +
      "  <text class='d-sub' x='52' y='120' text-anchor='middle' font-size='11'>2</text>" +
      "  <text class='d-accent d-text' x='52' y='155' text-anchor='middle' font-size='11' font-weight='bold'>3 (no gap)</text>" +
      "  <text class='d-sub' x='52' y='185' text-anchor='middle' font-size='11'>4</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### When to Use Which\n\n" +
      "- **`ROW_NUMBER()`** — Pagination, deduplication (pick one row per group), assigning unique IDs.\n" +
      "- **`RANK()`** — Competition rankings where ties share a position and subsequent positions are skipped (Olympic medals style).\n" +
      "- **`DENSE_RANK()`** — When you need to count *distinct* positions (e.g., \"find the 3rd highest salary\" without gaps).\n\n" +
      "**Interview tip:** `DENSE_RANK` is the go-to for *\"find the Nth highest value\"* questions because it doesn't skip ranks when there are ties.",
    examples: [
      {
        label: "Ranking Functions Playground",
        tech: "sql",
        code:
          "-- Compare all three ranking functions side by side:\n" +
          "SELECT \n" +
          "  student,\n" +
          "  score,\n" +
          "  ROW_NUMBER() OVER (ORDER BY score DESC) AS row_num,\n" +
          "  RANK()       OVER (ORDER BY score DESC) AS rnk,\n" +
          "  DENSE_RANK() OVER (ORDER BY score DESC) AS dense_rnk\n" +
          "FROM exam_scores\n" +
          "ORDER BY score DESC;"
      }
    ]
  },
  {
    title: "What do the LAG and LEAD window functions do?",
    description:
      "Explain LAG and LEAD.\n\n" +
      "Here is the schema for our `monthly_revenue` table:\n" +
      "```sql\n" +
      "CREATE TABLE monthly_revenue (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  month VARCHAR(10),\n" +
      "  revenue INT\n" +
      ");\n" +
      "INSERT INTO monthly_revenue VALUES (1, 'Jan', 10000);\n" +
      "INSERT INTO monthly_revenue VALUES (2, 'Feb', 12000);\n" +
      "INSERT INTO monthly_revenue VALUES (3, 'Mar', 11500);\n" +
      "INSERT INTO monthly_revenue VALUES (4, 'Apr', 13000);\n" +
      "INSERT INTO monthly_revenue VALUES (5, 'May', 14500);\n" +
      "INSERT INTO monthly_revenue VALUES (6, 'Jun', 13500);\n" +
      "```",
    answer:
      "## LAG & LEAD — Accessing Adjacent Rows\n\n" +
      "`LAG` and `LEAD` are **window functions** that let you access data from a **previous** or **next** row in the result set, relative to the current row, without needing a self-join:\n\n" +
      "| Function | Direction | Syntax | Returns |\n" +
      "|---|---|---|---|\n" +
      "| `LAG(col, n, default)` | Backward | Looks **n** rows before current | Previous row's value |\n" +
      "| `LEAD(col, n, default)` | Forward | Looks **n** rows after current | Next row's value |\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 180' role='img' aria-label='LAG and LEAD row access direction diagram'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- Row sequence -->" +
      "<g transform='translate(60, 20)'>" +
      "  <rect class='d-box' x='0' y='0' width='70' height='30' rx='4'/>" +
      "  <text class='d-sub' x='35' y='20' text-anchor='middle' font-size='10'>Jan: 10K</text>" +
      "  <rect class='d-box' x='0' y='40' width='70' height='30' rx='4'/>" +
      "  <text class='d-sub' x='35' y='60' text-anchor='middle' font-size='10'>Feb: 12K</text>" +
      "  <rect class='d-box-accent' x='0' y='80' width='70' height='30' rx='4'/>" +
      "  <text class='d-accent d-text' x='35' y='100' text-anchor='middle' font-size='10' font-weight='bold'>Mar: 11.5K</text>" +
      "  <rect class='d-box' x='0' y='120' width='70' height='30' rx='4'/>" +
      "  <text class='d-sub' x='35' y='140' text-anchor='middle' font-size='10'>Apr: 13K</text>" +
      "</g>" +
      "<!-- LAG arrow (up) -->" +
      "<line class='d-edge' x1='145' y1='90' x2='195' y2='50' marker-end='url(#arrow)' stroke-width='2'/>" +
      "<g transform='translate(200, 20)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='120' height='55' rx='5'/>" +
      "  <text class='d-accent d-text' x='60' y='20' text-anchor='middle' font-weight='bold' font-size='10'>LAG(revenue, 1)</text>" +
      "  <text class='d-sub' x='60' y='40' text-anchor='middle' font-size='9'>Returns: 12000 (Feb)</text>" +
      "</g>" +
      "<!-- LEAD arrow (down) -->" +
      "<line class='d-edge' x1='145' y1='110' x2='195' y2='130' marker-end='url(#arrow)' stroke-width='2'/>" +
      "<g transform='translate(200, 100)'>" +
      "  <rect class='d-box' x='0' y='0' width='120' height='55' rx='5'/>" +
      "  <text class='d-sub' x='60' y='20' text-anchor='middle' font-weight='bold' font-size='10'>LEAD(revenue, 1)</text>" +
      "  <text class='d-sub' x='60' y='40' text-anchor='middle' font-size='9'>Returns: 13000 (Apr)</text>" +
      "</g>" +
      "<!-- Current row label -->" +
      "<text class='d-accent d-text' x='55' y='108' font-size='8' font-weight='bold'>Current →</text>" +
      "</svg>\n\n" +
      "### Common Use Cases\n\n" +
      "- **Month-over-Month (MoM) growth:** `revenue - LAG(revenue) OVER (ORDER BY month)`\n" +
      "- **Running difference analysis:** Detect spikes, drops, or trends by comparing adjacent rows.\n" +
      "- **Gap detection:** Find breaks in sequential data (e.g., missing dates).\n\n" +
      "### Key Parameters\n\n" +
      "```\nLAG(column, offset, default_value) OVER (PARTITION BY ... ORDER BY ...)\n```\n\n" +
      "- **offset** (optional, default `1`): How many rows back/forward to look.\n" +
      "- **default_value** (optional): Value to return when there's no adjacent row (first/last row). Defaults to `NULL`.\n\n" +
      "**Interview tip:** Always mention that `LAG`/`LEAD` require an `ORDER BY` inside the `OVER()` clause — without it, the \"previous\" and \"next\" rows are undefined.",
    examples: [
      {
        label: "LAG/LEAD Revenue Analysis",
        tech: "sql",
        code:
          "-- Month-over-month revenue comparison:\n" +
          "SELECT \n" +
          "  month,\n" +
          "  revenue,\n" +
          "  LAG(revenue, 1, 0) OVER (ORDER BY id)  AS prev_month,\n" +
          "  LEAD(revenue, 1, 0) OVER (ORDER BY id) AS next_month,\n" +
          "  revenue - LAG(revenue, 1, 0) OVER (ORDER BY id) AS mom_change\n" +
          "FROM monthly_revenue;"
      }
    ]
  },
  {
    title: "What are the common aggregate functions?",
    description:
      "Explain aggregate functions.\n\n" +
      "Here is the schema for our `products` table:\n" +
      "```sql\n" +
      "CREATE TABLE products (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  name VARCHAR(50),\n" +
      "  category VARCHAR(30),\n" +
      "  price REAL,\n" +
      "  stock INT\n" +
      ");\n" +
      "INSERT INTO products VALUES (1, 'Keyboard', 'Electronics', 49.99, 120);\n" +
      "INSERT INTO products VALUES (2, 'Mouse', 'Electronics', 29.99, 200);\n" +
      "INSERT INTO products VALUES (3, 'Desk', 'Furniture', 199.99, 30);\n" +
      "INSERT INTO products VALUES (4, 'Chair', 'Furniture', 249.99, 45);\n" +
      "INSERT INTO products VALUES (5, 'Monitor', 'Electronics', 399.99, 60);\n" +
      "INSERT INTO products VALUES (6, 'Lamp', 'Furniture', 59.99, 80);\n" +
      "```",
    answer:
      "## SQL Aggregate Functions\n\n" +
      "Aggregate functions compute a **single summary value** from a set of input rows. They are most commonly used with `GROUP BY` but can also operate on the entire result set.\n\n" +
      "| Function | Purpose | NULL Handling |\n" +
      "|---|---|---|\n" +
      "| `COUNT(*)` | Total number of rows | Counts all rows including NULLs |\n" +
      "| `COUNT(col)` | Rows where `col` is not NULL | Skips NULLs |\n" +
      "| `SUM(col)` | Sum of all non-NULL values | Skips NULLs |\n" +
      "| `AVG(col)` | Arithmetic mean of non-NULL values | Skips NULLs (affects denominator!) |\n" +
      "| `MIN(col)` | Smallest value | Skips NULLs |\n" +
      "| `MAX(col)` | Largest value | Skips NULLs |\n" +
      "| `GROUP_CONCAT(col)` | Concatenate values into a string | SQLite/MySQL specific |\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 200' role='img' aria-label='Aggregate functions reducing rows to single values'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- Input rows -->" +
      "<g transform='translate(10, 10)'>" +
      "  <rect class='d-box' x='0' y='0' width='110' height='170' rx='5'/>" +
      "  <text class='d-sub' x='55' y='20' text-anchor='middle' font-weight='bold' font-size='10'>Input Rows</text>" +
      "  <text class='d-sub' x='15' y='45' font-size='9'>49.99</text>" +
      "  <text class='d-sub' x='15' y='65' font-size='9'>29.99</text>" +
      "  <text class='d-sub' x='15' y='85' font-size='9'>199.99</text>" +
      "  <text class='d-sub' x='15' y='105' font-size='9'>249.99</text>" +
      "  <text class='d-sub' x='15' y='125' font-size='9'>399.99</text>" +
      "  <text class='d-sub' x='15' y='145' font-size='9'>59.99</text>" +
      "</g>" +
      "<!-- Arrows to aggregates -->" +
      "<line class='d-edge' x1='125' y1='50' x2='165' y2='30' marker-end='url(#arrow)'/>" +
      "<line class='d-edge' x1='125' y1='70' x2='165' y2='65' marker-end='url(#arrow)'/>" +
      "<line class='d-edge' x1='125' y1='95' x2='165' y2='100' marker-end='url(#arrow)'/>" +
      "<line class='d-edge' x1='125' y1='120' x2='165' y2='135' marker-end='url(#arrow)'/>" +
      "<line class='d-edge' x1='125' y1='145' x2='165' y2='170' marker-end='url(#arrow)'/>" +
      "<!-- Aggregate boxes -->" +
      "<g transform='translate(170, 15)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='100' height='28' rx='4'/>" +
      "  <text class='d-accent d-text' x='50' y='19' text-anchor='middle' font-size='9' font-weight='bold'>COUNT(*) → 6</text>" +
      "</g>" +
      "<g transform='translate(170, 50)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='100' height='28' rx='4'/>" +
      "  <text class='d-accent d-text' x='50' y='19' text-anchor='middle' font-size='9' font-weight='bold'>SUM → 989.94</text>" +
      "</g>" +
      "<g transform='translate(170, 85)'>" +
      "  <rect class='d-box' x='0' y='0' width='100' height='28' rx='4'/>" +
      "  <text class='d-sub' x='50' y='19' text-anchor='middle' font-size='9' font-weight='bold'>AVG → 164.99</text>" +
      "</g>" +
      "<g transform='translate(170, 120)'>" +
      "  <rect class='d-box' x='0' y='0' width='100' height='28' rx='4'/>" +
      "  <text class='d-sub' x='50' y='19' text-anchor='middle' font-size='9' font-weight='bold'>MIN → 29.99</text>" +
      "</g>" +
      "<g transform='translate(170, 155)'>" +
      "  <rect class='d-box' x='0' y='0' width='100' height='28' rx='4'/>" +
      "  <text class='d-sub' x='50' y='19' text-anchor='middle' font-size='9' font-weight='bold'>MAX → 399.99</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### Critical: NULL Handling in AVG\n\n" +
      "```sql\n-- Given values: 10, NULL, 30\nAVG = (10 + 30) / 2 = 20   -- NULL skipped in BOTH sum AND count\n-- NOT (10 + 0 + 30) / 3 = 13.3!\n```\n\n" +
      "This is a common interview gotcha — `AVG` **ignores** NULLs entirely, it doesn't treat them as 0.\n\n" +
      "**Interview tip:** Mention the distinction between `COUNT(*)` (counts all rows) vs `COUNT(column)` (counts non-NULL values). This is a frequently asked follow-up.",
    examples: [
      {
        label: "Aggregate Functions Playground",
        tech: "sql",
        code:
          "-- All common aggregates in action:\n" +
          "SELECT \n" +
          "  category,\n" +
          "  COUNT(*) AS total_products,\n" +
          "  SUM(price) AS total_value,\n" +
          "  AVG(price) AS avg_price,\n" +
          "  MIN(price) AS cheapest,\n" +
          "  MAX(price) AS most_expensive,\n" +
          "  SUM(stock) AS total_stock\n" +
          "FROM products\n" +
          "GROUP BY category;"
      }
    ]
  },
  {
    title: "What is the difference between COUNT(*), COUNT(col), and COUNT(DISTINCT col)?",
    description:
      "Explain COUNT variations.\n\n" +
      "Here is the schema for our `visits` table:\n" +
      "```sql\n" +
      "CREATE TABLE visits (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  user_name VARCHAR(50),\n" +
      "  page VARCHAR(50),\n" +
      "  referrer VARCHAR(50)\n" +
      ");\n" +
      "INSERT INTO visits VALUES (1, 'Alice', '/home', 'google');\n" +
      "INSERT INTO visits VALUES (2, 'Bob', '/about', NULL);\n" +
      "INSERT INTO visits VALUES (3, 'Alice', '/home', 'google');\n" +
      "INSERT INTO visits VALUES (4, 'Charlie', '/pricing', NULL);\n" +
      "INSERT INTO visits VALUES (5, 'Alice', '/about', 'twitter');\n" +
      "INSERT INTO visits VALUES (6, 'Bob', '/home', NULL);\n" +
      "```",
    answer:
      "## Three Flavors of COUNT\n\n" +
      "| Expression | Counts | NULL Rows | Duplicates |\n" +
      "|---|---|---|---|\n" +
      "| `COUNT(*)` | All rows | ✅ Included | ✅ Included |\n" +
      "| `COUNT(col)` | Non-NULL values in `col` | ❌ Excluded | ✅ Included |\n" +
      "| `COUNT(DISTINCT col)` | Unique non-NULL values | ❌ Excluded | ❌ Excluded |\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 200' role='img' aria-label='COUNT variants comparison with NULL handling'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- Input data -->" +
      "<g transform='translate(10, 10)'>" +
      "  <rect class='d-box' x='0' y='0' width='130' height='170' rx='5'/>" +
      "  <text class='d-sub' x='65' y='20' text-anchor='middle' font-weight='bold' font-size='10'>referrer column</text>" +
      "  <text class='d-sub' x='20' y='45' font-size='9'>1. 'google'</text>" +
      "  <text class='d-accent d-text' x='20' y='65' font-size='9' font-weight='bold'>2. NULL</text>" +
      "  <text class='d-sub' x='20' y='85' font-size='9'>3. 'google'</text>" +
      "  <text class='d-accent d-text' x='20' y='105' font-size='9' font-weight='bold'>4. NULL</text>" +
      "  <text class='d-sub' x='20' y='125' font-size='9'>5. 'twitter'</text>" +
      "  <text class='d-accent d-text' x='20' y='145' font-size='9' font-weight='bold'>6. NULL</text>" +
      "</g>" +
      "<!-- COUNT(*) -->" +
      "<line class='d-edge' x1='145' y1='40' x2='180' y2='35' marker-end='url(#arrow)'/>" +
      "<g transform='translate(185, 15)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='130' height='45' rx='5'/>" +
      "  <text class='d-accent d-text' x='65' y='18' text-anchor='middle' font-weight='bold' font-size='10'>COUNT(*)</text>" +
      "  <text class='d-sub' x='65' y='36' text-anchor='middle' font-size='9'>= 6 (all rows)</text>" +
      "</g>" +
      "<!-- COUNT(col) -->" +
      "<line class='d-edge' x1='145' y1='90' x2='180' y2='90' marker-end='url(#arrow)'/>" +
      "<g transform='translate(185, 70)'>" +
      "  <rect class='d-box' x='0' y='0' width='130' height='45' rx='5'/>" +
      "  <text class='d-sub' x='65' y='18' text-anchor='middle' font-weight='bold' font-size='10'>COUNT(referrer)</text>" +
      "  <text class='d-sub' x='65' y='36' text-anchor='middle' font-size='9'>= 3 (skip 3 NULLs)</text>" +
      "</g>" +
      "<!-- COUNT(DISTINCT col) -->" +
      "<line class='d-edge' x1='145' y1='140' x2='180' y2='145' marker-end='url(#arrow)'/>" +
      "<g transform='translate(185, 125)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='150' height='50' rx='5'/>" +
      "  <text class='d-accent d-text' x='75' y='18' text-anchor='middle' font-weight='bold' font-size='9'>COUNT(DISTINCT referrer)</text>" +
      "  <text class='d-sub' x='75' y='38' text-anchor='middle' font-size='9'>= 2 (google, twitter)</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### Applying to the Example Data\n\n" +
      "```sql\n-- referrer values: 'google', NULL, 'google', NULL, 'twitter', NULL\n" +
      "COUNT(*)                = 6  -- all 6 rows\n" +
      "COUNT(referrer)         = 3  -- 3 NULLs excluded\n" +
      "COUNT(DISTINCT referrer)= 2  -- unique: {google, twitter}\n```\n\n" +
      "### Performance Considerations\n\n" +
      "- **`COUNT(*)`** is optimized in most engines — it often uses the smallest available index.\n" +
      "- **`COUNT(DISTINCT col)`** requires deduplication (hash or sort), making it the **most expensive** variant.\n" +
      "- On **InnoDB** (MySQL), `COUNT(*)` traverses the clustered index; consider a covering index on frequently counted tables.\n\n" +
      "**Interview tip:** The key insight is that `COUNT(col)` and `COUNT(*)` can return **different numbers** when NULLs are present. Always clarify what you're counting.",
    examples: [
      {
        label: "COUNT Variants Playground",
        tech: "sql",
        code:
          "-- Compare all three COUNT forms:\n" +
          "SELECT \n" +
          "  COUNT(*) AS total_rows,\n" +
          "  COUNT(referrer) AS non_null_referrers,\n" +
          "  COUNT(DISTINCT referrer) AS unique_referrers,\n" +
          "  COUNT(DISTINCT user_name) AS unique_users\n" +
          "FROM visits;"
      }
    ]
  },
  {
    title: "How does SQL handle NULL values?",
    description:
      "Explain NULL handling.\n\n" +
      "Here is the schema for our `employees` table:\n" +
      "```sql\n" +
      "CREATE TABLE employees (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  name VARCHAR(50),\n" +
      "  department VARCHAR(50),\n" +
      "  bonus INT\n" +
      ");\n" +
      "INSERT INTO employees VALUES (1, 'Alice', 'Engineering', 5000);\n" +
      "INSERT INTO employees VALUES (2, 'Bob', 'Sales', NULL);\n" +
      "INSERT INTO employees VALUES (3, 'Charlie', 'Engineering', 3000);\n" +
      "INSERT INTO employees VALUES (4, 'David', NULL, NULL);\n" +
      "INSERT INTO employees VALUES (5, 'Eve', 'Sales', 2000);\n" +
      "```",
    answer:
      "## NULL — The Three-Valued Logic of SQL\n\n" +
      "In SQL, `NULL` represents an **unknown** or **missing** value. It is not zero, not an empty string, and not false. SQL uses **three-valued logic** (TRUE, FALSE, UNKNOWN), and any comparison involving NULL yields **UNKNOWN**.\n\n" +
      "| Expression | Result | Reason |\n" +
      "|---|---|---|\n" +
      "| `NULL = NULL` | UNKNOWN | Unknown can't equal unknown |\n" +
      "| `NULL <> 1` | UNKNOWN | Can't compare with unknown |\n" +
      "| `NULL + 10` | NULL | Arithmetic with NULL propagates |\n" +
      "| `NULL AND TRUE` | UNKNOWN | Short-circuit not possible |\n" +
      "| `NULL OR TRUE` | TRUE | TRUE dominates |\n" +
      "| `NULL IS NULL` | TRUE | Correct way to check |\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 180' role='img' aria-label='Three-valued logic truth table for NULL'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- Three-valued logic visualization -->" +
      "<g transform='translate(15, 15)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='130' height='150' rx='5'/>" +
      "  <text class='d-accent d-text' x='65' y='20' text-anchor='middle' font-weight='bold' font-size='10'>Comparison</text>" +
      "  <text class='d-sub' x='15' y='50' font-size='9'>5 = 5</text>" +
      "  <text class='d-sub' x='100' y='50' font-size='9'>→ TRUE</text>" +
      "  <text class='d-sub' x='15' y='75' font-size='9'>5 = 3</text>" +
      "  <text class='d-sub' x='100' y='75' font-size='9'>→ FALSE</text>" +
      "  <text class='d-accent d-text' x='15' y='100' font-size='9' font-weight='bold'>5 = NULL</text>" +
      "  <text class='d-accent d-text' x='100' y='100' font-size='9' font-weight='bold'>→ UNKNOWN</text>" +
      "  <text class='d-accent d-text' x='15' y='125' font-size='9' font-weight='bold'>NULL = NULL</text>" +
      "  <text class='d-accent d-text' x='100' y='125' font-size='9' font-weight='bold'>→ UNKNOWN</text>" +
      "</g>" +
      "<!-- Correct way -->" +
      "<line class='d-edge' x1='155' y1='90' x2='195' y2='90' marker-end='url(#arrow)' stroke-width='2'/>" +
      "<g transform='translate(200, 15)'>" +
      "  <rect class='d-box' x='0' y='0' width='120' height='60' rx='5'/>" +
      "  <text class='d-sub' x='60' y='18' text-anchor='middle' font-weight='bold' font-size='9'>❌ Wrong</text>" +
      "  <text class='d-sub' x='60' y='40' text-anchor='middle' font-size='9'>WHERE col = NULL</text>" +
      "</g>" +
      "<g transform='translate(200, 90)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='120' height='60' rx='5'/>" +
      "  <text class='d-accent d-text' x='60' y='18' text-anchor='middle' font-weight='bold' font-size='9'>✅ Correct</text>" +
      "  <text class='d-accent d-text' x='60' y='40' text-anchor='middle' font-size='9'>WHERE col IS NULL</text>" +
      "</g>" +
      "<!-- Functions -->" +
      "<g transform='translate(340, 15)'>" +
      "  <rect class='d-box' x='0' y='0' width='130' height='150' rx='5'/>" +
      "  <text class='d-sub' x='65' y='20' text-anchor='middle' font-weight='bold' font-size='10'>NULL-Safe Functions</text>" +
      "  <text class='d-sub' x='15' y='45' font-size='9'>COALESCE(a, b)</text>" +
      "  <text class='d-sub' x='15' y='70' font-size='9'>IFNULL(a, b)</text>" +
      "  <text class='d-sub' x='15' y='95' font-size='9'>NULLIF(a, b)</text>" +
      "  <text class='d-sub' x='15' y='120' font-size='9'>IS NULL / IS NOT NULL</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### Key Gotchas\n\n" +
      "1. **`WHERE col = NULL`** — Always returns no rows! Use `WHERE col IS NULL` instead.\n" +
      "2. **`NOT IN` with NULLs** — `SELECT * FROM t WHERE x NOT IN (1, NULL)` returns **no rows** because `x <> NULL` is UNKNOWN.\n" +
      "3. **Aggregates skip NULLs** — `AVG(bonus)` over `{5000, NULL, 3000}` = 4000, **not** 2666.\n" +
      "4. **`DISTINCT` treats NULLs as equal** — Multiple NULLs collapse into one in `SELECT DISTINCT`.\n\n" +
      "**Interview tip:** The `NOT IN` with NULL trap is a classic interview question. Always prefer `NOT EXISTS` when the subquery might return NULLs.",
    examples: [
      {
        label: "NULL Handling Playground",
        tech: "sql",
        code:
          "-- Demonstrate NULL behavior:\n" +
          "SELECT \n" +
          "  name,\n" +
          "  department,\n" +
          "  bonus,\n" +
          "  COALESCE(bonus, 0) AS bonus_or_zero,\n" +
          "  CASE WHEN bonus IS NULL THEN 'No bonus' ELSE 'Has bonus' END AS status\n" +
          "FROM employees;"
      }
    ]
  },
  {
    title: "What does DISTINCT do and what is its cost?",
    description:
      "Explain DISTINCT.\n\n" +
      "Here is the schema for our `orders` table:\n" +
      "```sql\n" +
      "CREATE TABLE orders (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  customer VARCHAR(50),\n" +
      "  product VARCHAR(50),\n" +
      "  amount INT\n" +
      ");\n" +
      "INSERT INTO orders VALUES (1, 'Alice', 'Laptop', 1200);\n" +
      "INSERT INTO orders VALUES (2, 'Bob', 'Phone', 800);\n" +
      "INSERT INTO orders VALUES (3, 'Alice', 'Phone', 800);\n" +
      "INSERT INTO orders VALUES (4, 'Charlie', 'Laptop', 1200);\n" +
      "INSERT INTO orders VALUES (5, 'Alice', 'Laptop', 1200);\n" +
      "INSERT INTO orders VALUES (6, 'Bob', 'Tablet', 400);\n" +
      "```",
    answer:
      "## DISTINCT — Removing Duplicate Rows\n\n" +
      "`SELECT DISTINCT` eliminates duplicate rows from the result set. Two rows are considered duplicates if **all selected columns** have identical values.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 180' role='img' aria-label='DISTINCT deduplication pipeline'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- Input -->" +
      "<g transform='translate(10, 10)'>" +
      "  <rect class='d-box' x='0' y='0' width='140' height='160' rx='5'/>" +
      "  <text class='d-sub' x='70' y='20' text-anchor='middle' font-weight='bold' font-size='10'>Before DISTINCT</text>" +
      "  <text class='d-sub' x='15' y='45' font-size='9'>Alice, Laptop</text>" +
      "  <text class='d-sub' x='15' y='62' font-size='9'>Bob, Phone</text>" +
      "  <text class='d-sub' x='15' y='79' font-size='9'>Alice, Phone</text>" +
      "  <text class='d-sub' x='15' y='96' font-size='9'>Charlie, Laptop</text>" +
      "  <text class='d-accent d-text' x='15' y='113' font-size='9' font-weight='bold'>Alice, Laptop ← dup</text>" +
      "  <text class='d-sub' x='15' y='130' font-size='9'>Bob, Tablet</text>" +
      "</g>" +
      "<!-- Arrow -->" +
      "<line class='d-edge' x1='160' y1='90' x2='200' y2='90' marker-end='url(#arrow)' stroke-width='2'/>" +
      "<text class='d-sub' x='180' y='80' text-anchor='middle' font-size='8'>Hash /</text>" +
      "<text class='d-sub' x='180' y='90' text-anchor='middle' font-size='8'>Sort</text>" +
      "<!-- Output -->" +
      "<g transform='translate(210, 10)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='140' height='140' rx='5'/>" +
      "  <text class='d-accent d-text' x='70' y='20' text-anchor='middle' font-weight='bold' font-size='10'>After DISTINCT</text>" +
      "  <text class='d-sub' x='15' y='50' font-size='9'>Alice, Laptop</text>" +
      "  <text class='d-sub' x='15' y='70' font-size='9'>Alice, Phone</text>" +
      "  <text class='d-sub' x='15' y='90' font-size='9'>Bob, Phone</text>" +
      "  <text class='d-sub' x='15' y='110' font-size='9'>Bob, Tablet</text>" +
      "  <text class='d-sub' x='15' y='130' font-size='9'>Charlie, Laptop</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### How the Engine Implements DISTINCT\n\n" +
      "| Strategy | How It Works | Cost |\n" +
      "|---|---|---|\n" +
      "| **Hash Aggregate** | Build an in-memory hash table of seen row signatures | O(n) avg, but needs memory |\n" +
      "| **Sort + Deduplicate** | Sort all rows, then skip consecutive duplicates | O(n log n) + sort spill risk |\n" +
      "| **Index Scan** | If all selected columns are in a covering index, just scan the index | Cheapest — no extra work |\n\n" +
      "### Performance Pitfalls\n\n" +
      "- **DISTINCT across many columns** increases hash table size or sort cost.\n" +
      "- **Using DISTINCT as a band-aid** for duplicate rows usually means the `JOIN` logic is wrong. Fix the query rather than masking duplicates.\n" +
      "- On large tables, `DISTINCT` can cause **temp file spills** when the hash table exceeds `work_mem`.\n\n" +
      "**Interview tip:** If the interviewer asks about eliminating duplicates, consider whether `GROUP BY` or `EXISTS` might be more appropriate. `DISTINCT` is often a code smell for a poorly structured join.",
    examples: [
      {
        label: "DISTINCT Playground",
        tech: "sql",
        code:
          "-- Compare with and without DISTINCT:\n" +
          "SELECT customer, product FROM orders;\n" +
          "\n" +
          "-- Now with DISTINCT:\n" +
          "SELECT DISTINCT customer, product FROM orders;"
      }
    ]
  },
  {
    title: "What is a stored procedure?",
    description:
      "Explain stored procedures.\n\n" +
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
      "## Stored Procedures\n\n" +
      "A **stored procedure** is a precompiled collection of SQL statements (and optional control-flow logic) stored inside the database itself. It can accept input parameters, perform operations, and return results.\n\n" +
      "| Aspect | Stored Procedure | Inline SQL |\n" +
      "|---|---|---|\n" +
      "| **Location** | Stored inside the database | Sent from the application |\n" +
      "| **Compilation** | Compiled once, cached execution plan | Parsed and planned on every call |\n" +
      "| **Network** | Single call reduces round-trips | Multiple statements = multiple trips |\n" +
      "| **Security** | Can grant EXECUTE without table access | Requires direct table permissions |\n" +
      "| **Debugging** | Harder to debug and version-control | Easier to test in application code |\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 170' role='img' aria-label='Stored procedure architecture flow'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- Application -->" +
      "<g transform='translate(10, 30)'>" +
      "  <rect class='d-box' x='0' y='0' width='100' height='100' rx='5'/>" +
      "  <text class='d-sub' x='50' y='25' text-anchor='middle' font-weight='bold' font-size='10'>Application</text>" +
      "  <text class='d-sub' x='50' y='55' text-anchor='middle' font-size='8'>CALL transfer</text>" +
      "  <text class='d-sub' x='50' y='70' text-anchor='middle' font-size='8'>(1, 2, 500)</text>" +
      "</g>" +
      "<!-- Arrow to DB -->" +
      "<line class='d-edge' x1='115' y1='80' x2='155' y2='80' marker-end='url(#arrow)' stroke-width='2'/>" +
      "<text class='d-sub' x='135' y='70' text-anchor='middle' font-size='7'>1 round-trip</text>" +
      "<!-- Database -->" +
      "<g transform='translate(160, 10)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='310' height='140' rx='5'/>" +
      "  <text class='d-accent d-text' x='155' y='22' text-anchor='middle' font-weight='bold' font-size='10'>Database Engine</text>" +
      "  <!-- Procedure body -->" +
      "  <rect class='d-box' x='15' y='35' width='280' height='90' rx='4'/>" +
      "  <text class='d-sub' x='155' y='55' text-anchor='middle' font-weight='bold' font-size='9'>sp_transfer(from, to, amount)</text>" +
      "  <text class='d-sub' x='155' y='75' text-anchor='middle' font-size='8'>BEGIN TRANSACTION</text>" +
      "  <text class='d-sub' x='155' y='90' text-anchor='middle' font-size='8'>UPDATE accounts SET balance = balance - amount WHERE id = from</text>" +
      "  <text class='d-sub' x='155' y='105' text-anchor='middle' font-size='8'>UPDATE accounts SET balance = balance + amount WHERE id = to</text>" +
      "  <text class='d-sub' x='155' y='118' text-anchor='middle' font-size='8'>COMMIT</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### Advantages\n\n" +
      "1. **Performance:** Precompiled execution plan avoids repeated parsing.\n" +
      "2. **Reduced network traffic:** Bundle multiple SQL statements into a single call.\n" +
      "3. **Security:** Grant `EXECUTE` permission without exposing underlying tables.\n" +
      "4. **Encapsulation:** Business logic lives close to the data.\n\n" +
      "### Disadvantages\n\n" +
      "1. **Version control complexity:** Stored procedures live in the database, not in your Git repo (without extra tooling).\n" +
      "2. **Debugging difficulty:** Limited IDE/debugger support compared to application code.\n" +
      "3. **Vendor lock-in:** PL/pgSQL, T-SQL, and PL/SQL have different syntax.\n" +
      "4. **Testing:** Unit testing stored procedures requires database fixtures.\n\n" +
      "**Interview tip:** Modern architectures often prefer ORMs and application-level logic over stored procedures, but SPs remain valuable for **performance-critical batch operations** and **row-level security enforcement**.",
    examples: [
      {
        label: "Account Query Playground",
        tech: "sql",
        code:
          "-- Simulate what a stored procedure would do:\n" +
          "-- Step 1: Check balances before transfer\n" +
          "SELECT * FROM accounts;\n" +
          "\n" +
          "-- Step 2: Transfer $500 from Alice (id=1) to Bob (id=2)\n" +
          "UPDATE accounts SET balance = balance - 500 WHERE id = 1;\n" +
          "UPDATE accounts SET balance = balance + 500 WHERE id = 2;\n" +
          "\n" +
          "-- Step 3: Verify balances after transfer\n" +
          "SELECT * FROM accounts;"
      }
    ]
  },
  {
    title: "What is a database trigger?",
    description:
      "Explain database triggers.\n\n" +
      "Here is the schema for our `audit_log` and `products` tables:\n" +
      "```sql\n" +
      "CREATE TABLE products (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  name VARCHAR(50),\n" +
      "  price REAL,\n" +
      "  updated_at TEXT\n" +
      ");\n" +
      "INSERT INTO products VALUES (1, 'Widget', 19.99, '2024-01-01');\n" +
      "INSERT INTO products VALUES (2, 'Gadget', 49.99, '2024-01-01');\n" +
      "INSERT INTO products VALUES (3, 'Gizmo', 29.99, '2024-01-01');\n\n" +
      "CREATE TABLE audit_log (\n" +
      "  id INTEGER PRIMARY KEY AUTOINCREMENT,\n" +
      "  table_name TEXT,\n" +
      "  action TEXT,\n" +
      "  old_value TEXT,\n" +
      "  new_value TEXT,\n" +
      "  changed_at TEXT DEFAULT CURRENT_TIMESTAMP\n" +
      ");\n" +
      "```",
    answer:
      "## Database Triggers\n\n" +
      "A **trigger** is a named database object that automatically executes a stored block of SQL in response to specific **DML events** (`INSERT`, `UPDATE`, `DELETE`) on a table. Triggers fire without explicit invocation.\n\n" +
      "| Property | Options |\n" +
      "|---|---|\n" +
      "| **Timing** | `BEFORE` (pre-validate/modify data) or `AFTER` (post-process/audit) |\n" +
      "| **Event** | `INSERT`, `UPDATE`, `DELETE` |\n" +
      "| **Granularity** | Row-level (fires once per row) or Statement-level (fires once per statement) |\n" +
      "| **Special References** | `NEW` (incoming row data) and `OLD` (existing row data) |\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 200' role='img' aria-label='Trigger execution flow diagram'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- DML Event -->" +
      "<g transform='translate(10, 50)'>" +
      "  <rect class='d-box' x='0' y='0' width='90' height='60' rx='5'/>" +
      "  <text class='d-sub' x='45' y='25' text-anchor='middle' font-weight='bold' font-size='10'>DML Event</text>" +
      "  <text class='d-sub' x='45' y='45' text-anchor='middle' font-size='8'>UPDATE</text>" +
      "</g>" +
      "<!-- BEFORE trigger -->" +
      "<line class='d-edge' x1='100' y1='60' x2='120' y2='35' marker-end='url(#arrow)'/>" +
      "<g transform='translate(125, 10)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='100' height='50' rx='5'/>" +
      "  <text class='d-accent d-text' x='50' y='20' text-anchor='middle' font-weight='bold' font-size='9'>BEFORE</text>" +
      "  <text class='d-sub' x='50' y='38' text-anchor='middle' font-size='8'>Validate / Modify</text>" +
      "</g>" +
      "<!-- Actual DML -->" +
      "<line class='d-edge' x1='225' y1='35' x2='245' y2='80' marker-end='url(#arrow)'/>" +
      "<g transform='translate(250, 55)'>" +
      "  <rect class='d-box' x='0' y='0' width='90' height='50' rx='5'/>" +
      "  <text class='d-sub' x='45' y='20' text-anchor='middle' font-weight='bold' font-size='9'>Actual DML</text>" +
      "  <text class='d-sub' x='45' y='38' text-anchor='middle' font-size='8'>Row Modified</text>" +
      "</g>" +
      "<!-- AFTER trigger -->" +
      "<line class='d-edge' x1='340' y1='80' x2='365' y2='80' marker-end='url(#arrow)'/>" +
      "<g transform='translate(370, 55)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='100' height='50' rx='5'/>" +
      "  <text class='d-accent d-text' x='50' y='20' text-anchor='middle' font-weight='bold' font-size='9'>AFTER</text>" +
      "  <text class='d-sub' x='50' y='38' text-anchor='middle' font-size='8'>Audit / Cascade</text>" +
      "</g>" +
      "<!-- OLD/NEW labels -->" +
      "<g transform='translate(130, 120)'>" +
      "  <rect class='d-box' x='0' y='0' width='200' height='60' rx='5'/>" +
      "  <text class='d-sub' x='100' y='18' text-anchor='middle' font-weight='bold' font-size='9'>Special Row References</text>" +
      "  <text class='d-sub' x='100' y='38' text-anchor='middle' font-size='8'>OLD.price = 19.99 (before change)</text>" +
      "  <text class='d-accent d-text' x='100' y='53' text-anchor='middle' font-size='8' font-weight='bold'>NEW.price = 24.99 (after change)</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### Common Use Cases\n\n" +
      "1. **Audit logging** — Automatically log all changes to a separate table.\n" +
      "2. **Data validation** — Reject invalid changes before they're committed.\n" +
      "3. **Auto-calculated fields** — Set `updated_at` timestamps, compute derived columns.\n" +
      "4. **Cascade updates** — Propagate changes to related tables.\n\n" +
      "### Pitfalls\n\n" +
      "- **Hidden side effects:** Triggers are invisible to developers reading the DML statement.\n" +
      "- **Performance impact:** Row-level triggers on bulk operations (UPDATE 1M rows) fire 1M times.\n" +
      "- **Recursive triggers:** Trigger A modifies table B, which fires trigger B on table A → infinite loop.\n" +
      "- **Debugging difficulty:** Hard to trace execution flow when multiple triggers interact.\n\n" +
      "**Interview tip:** Emphasize that triggers should be used sparingly — prefer application-level logic for complex business rules, and reserve triggers for **audit trails** and **low-level data integrity** constraints.",
    examples: [
      {
        label: "Trigger Simulation Playground",
        tech: "sql",
        code:
          "-- In SQLite, we can create a trigger for audit logging:\n" +
          "CREATE TRIGGER IF NOT EXISTS log_price_change\n" +
          "AFTER UPDATE ON products\n" +
          "WHEN OLD.price <> NEW.price\n" +
          "BEGIN\n" +
          "  INSERT INTO audit_log (table_name, action, old_value, new_value)\n" +
          "  VALUES ('products', 'PRICE_CHANGE', OLD.price, NEW.price);\n" +
          "END;\n\n" +
          "-- Now update a product price:\n" +
          "UPDATE products SET price = 24.99 WHERE id = 1;\n\n" +
          "-- Check the audit log:\n" +
          "SELECT * FROM audit_log;"
      }
    ]
  }
];

export default augments;
