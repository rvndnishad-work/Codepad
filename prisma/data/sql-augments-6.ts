import type { SqlAugment } from "./sql-augments.types";

const augments: SqlAugment[] = [
  {
    title: "How do you aggregate values into a single string?",
    description:
      "Explain string aggregation.\n\n" +
      "Here is the schema for our `employees` table:\n" +
      "```sql\n" +
      "CREATE TABLE employees (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  name VARCHAR(50),\n" +
      "  department VARCHAR(50)\n" +
      ");\n" +
      "INSERT INTO employees VALUES (1, 'Alice', 'Engineering');\n" +
      "INSERT INTO employees VALUES (2, 'Bob', 'Engineering');\n" +
      "INSERT INTO employees VALUES (3, 'Charlie', 'Sales');\n" +
      "INSERT INTO employees VALUES (4, 'David', 'Sales');\n" +
      "INSERT INTO employees VALUES (5, 'Eve', 'Engineering');\n" +
      "```",
    answer:
      "## String Aggregation — Combining Values Into One String\n\n" +
      "String aggregation collapses multiple row values into a single concatenated string, typically separated by a delimiter. The syntax varies across databases:\n\n" +
      "| Database | Function | Example |\n" +
      "|---|---|---|\n" +
      "| **SQLite / MySQL** | `GROUP_CONCAT(col, sep)` | `GROUP_CONCAT(name, ', ')` |\n" +
      "| **PostgreSQL** | `STRING_AGG(col, sep)` | `STRING_AGG(name, ', ')` |\n" +
      "| **SQL Server** | `STRING_AGG(col, sep)` | `STRING_AGG(name, ', ')` |\n" +
      "| **Oracle** | `LISTAGG(col, sep)` | `LISTAGG(name, ', ')` |\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 160' role='img' aria-label='String aggregation collapsing rows into a single value'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- Input rows -->" +
      "<g transform='translate(10, 10)'>" +
      "  <rect class='d-box' x='0' y='0' width='140' height='130' rx='5'/>" +
      "  <text class='d-sub' x='70' y='20' text-anchor='middle' font-weight='bold' font-size='10'>Engineering Dept</text>" +
      "  <text class='d-sub' x='20' y='50' font-size='9'>Row 1: Alice</text>" +
      "  <text class='d-sub' x='20' y='70' font-size='9'>Row 2: Bob</text>" +
      "  <text class='d-sub' x='20' y='90' font-size='9'>Row 5: Eve</text>" +
      "</g>" +
      "<!-- Arrow -->" +
      "<line class='d-edge' x1='155' y1='75' x2='200' y2='75' marker-end='url(#arrow)' stroke-width='2'/>" +
      "<text class='d-sub' x='178' y='65' text-anchor='middle' font-size='7'>GROUP_CONCAT</text>" +
      "<!-- Output -->" +
      "<g transform='translate(210, 40)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='250' height='65' rx='5'/>" +
      "  <text class='d-accent d-text' x='125' y='22' text-anchor='middle' font-weight='bold' font-size='10'>Aggregated Result</text>" +
      "  <text class='d-sub' x='125' y='50' text-anchor='middle' font-size='10'>\"Alice, Bob, Eve\"</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### Controlling the Output\n\n" +
      "```sql\n-- With ORDER BY (PostgreSQL / SQL Server):\nSTRING_AGG(name, ', ' ORDER BY name ASC)\n-- Result: \"Alice, Bob, Eve\" (sorted)\n\n-- With DISTINCT:\nGROUP_CONCAT(DISTINCT department, ', ')\n-- Removes duplicates before concatenating\n```\n\n" +
      "### Common Use Cases\n\n" +
      "- **Building CSV exports** from grouped data.\n" +
      "- **Displaying tags/categories** as a single string in a report.\n" +
      "- **Creating search-friendly** denormalized fields.\n\n" +
      "**Interview tip:** Always mention the ordering caveat — without `ORDER BY`, the concatenation order is **non-deterministic** in most databases. In SQLite, `GROUP_CONCAT` concatenates in the order rows are processed.",
    examples: [
      {
        label: "String Aggregation Playground",
        tech: "sql",
        code:
          "-- Aggregate employee names by department:\n" +
          "SELECT \n" +
          "  department,\n" +
          "  GROUP_CONCAT(name, ', ') AS team_members,\n" +
          "  COUNT(*) AS team_size\n" +
          "FROM employees\n" +
          "GROUP BY department;"
      }
    ]
  },
  {
    title: "How do you pivot rows into columns?",
    description:
      "Explain pivoting.\n\n" +
      "Here is the schema for our `sales` table:\n" +
      "```sql\n" +
      "CREATE TABLE sales (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  product VARCHAR(50),\n" +
      "  quarter VARCHAR(5),\n" +
      "  revenue INT\n" +
      ");\n" +
      "INSERT INTO sales VALUES (1, 'Laptop', 'Q1', 5000);\n" +
      "INSERT INTO sales VALUES (2, 'Laptop', 'Q2', 6000);\n" +
      "INSERT INTO sales VALUES (3, 'Laptop', 'Q3', 4500);\n" +
      "INSERT INTO sales VALUES (4, 'Phone', 'Q1', 3000);\n" +
      "INSERT INTO sales VALUES (5, 'Phone', 'Q2', 3500);\n" +
      "INSERT INTO sales VALUES (6, 'Phone', 'Q3', 4000);\n" +
      "```",
    answer:
      "## Pivoting — Rows to Columns\n\n" +
      "**Pivoting** transforms row-oriented data into a columnar layout, turning unique values from one column into multiple output columns. This is common for reporting and cross-tab analysis.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 200' role='img' aria-label='Pivot transformation from rows to columns'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- Row format -->" +
      "<g transform='translate(10, 10)'>" +
      "  <rect class='d-box' x='0' y='0' width='160' height='170' rx='5'/>" +
      "  <text class='d-sub' x='80' y='20' text-anchor='middle' font-weight='bold' font-size='10'>Row Format</text>" +
      "  <text class='d-sub' x='15' y='45' font-size='8'>Laptop | Q1 | 5000</text>" +
      "  <text class='d-sub' x='15' y='65' font-size='8'>Laptop | Q2 | 6000</text>" +
      "  <text class='d-sub' x='15' y='85' font-size='8'>Laptop | Q3 | 4500</text>" +
      "  <text class='d-sub' x='15' y='110' font-size='8'>Phone  | Q1 | 3000</text>" +
      "  <text class='d-sub' x='15' y='130' font-size='8'>Phone  | Q2 | 3500</text>" +
      "  <text class='d-sub' x='15' y='150' font-size='8'>Phone  | Q3 | 4000</text>" +
      "</g>" +
      "<!-- Arrow -->" +
      "<line class='d-edge' x1='180' y1='95' x2='220' y2='95' marker-end='url(#arrow)' stroke-width='2'/>" +
      "<text class='d-sub' x='200' y='85' text-anchor='middle' font-size='7'>PIVOT</text>" +
      "<!-- Column format -->" +
      "<g transform='translate(230, 25)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='240' height='130' rx='5'/>" +
      "  <text class='d-accent d-text' x='120' y='20' text-anchor='middle' font-weight='bold' font-size='10'>Column Format</text>" +
      "  <text class='d-sub' x='15' y='50' font-size='8'>Product  | Q1   | Q2   | Q3</text>" +
      "  <text class='d-sub' x='15' y='70' font-size='8'>─────────────────────────</text>" +
      "  <text class='d-sub' x='15' y='90' font-size='8'>Laptop   | 5000 | 6000 | 4500</text>" +
      "  <text class='d-sub' x='15' y='110' font-size='8'>Phone    | 3000 | 3500 | 4000</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### The CASE Expression Technique (Works Everywhere)\n\n" +
      "Since not all databases support `PIVOT`, the **conditional aggregation** approach works universally:\n\n" +
      "```sql\nSELECT \n  product,\n  SUM(CASE WHEN quarter = 'Q1' THEN revenue ELSE 0 END) AS Q1,\n  SUM(CASE WHEN quarter = 'Q2' THEN revenue ELSE 0 END) AS Q2,\n  SUM(CASE WHEN quarter = 'Q3' THEN revenue ELSE 0 END) AS Q3\nFROM sales\nGROUP BY product;\n```\n\n" +
      "### Database-Specific PIVOT Syntax\n\n" +
      "| Database | Approach |\n" +
      "|---|---|\n" +
      "| **SQL Server** | Native `PIVOT` operator |\n" +
      "| **PostgreSQL** | `crosstab()` function (tablefunc extension) |\n" +
      "| **MySQL / SQLite** | CASE + aggregate (no native PIVOT) |\n" +
      "| **Oracle** | Native `PIVOT` operator |\n\n" +
      "**Interview tip:** The CASE-based approach is the safest answer in an interview because it works on every SQL database. Mention that the downside is that you must know the pivot values at query-writing time (they can't be dynamic without dynamic SQL).",
    examples: [
      {
        label: "Pivot Playground",
        tech: "sql",
        code:
          "-- Pivot quarterly revenue from rows to columns:\n" +
          "SELECT \n" +
          "  product,\n" +
          "  SUM(CASE WHEN quarter = 'Q1' THEN revenue ELSE 0 END) AS Q1_Revenue,\n" +
          "  SUM(CASE WHEN quarter = 'Q2' THEN revenue ELSE 0 END) AS Q2_Revenue,\n" +
          "  SUM(CASE WHEN quarter = 'Q3' THEN revenue ELSE 0 END) AS Q3_Revenue,\n" +
          "  SUM(revenue) AS Total\n" +
          "FROM sales\n" +
          "GROUP BY product;"
      }
    ]
  },
  {
    title: "How do you update a table based on another table?",
    description:
      "Explain UPDATE with JOIN.\n\n" +
      "Here is the schema for our `products` and `price_updates` tables:\n" +
      "```sql\n" +
      "CREATE TABLE products (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  name VARCHAR(50),\n" +
      "  price REAL\n" +
      ");\n" +
      "INSERT INTO products VALUES (1, 'Widget', 19.99);\n" +
      "INSERT INTO products VALUES (2, 'Gadget', 49.99);\n" +
      "INSERT INTO products VALUES (3, 'Gizmo', 29.99);\n\n" +
      "CREATE TABLE price_updates (\n" +
      "  product_id INT PRIMARY KEY,\n" +
      "  new_price REAL\n" +
      ");\n" +
      "INSERT INTO price_updates VALUES (1, 24.99);\n" +
      "INSERT INTO price_updates VALUES (3, 34.99);\n" +
      "```",
    answer:
      "## UPDATE with JOIN / Subquery\n\n" +
      "Updating one table based on values from another table is a common operation. The syntax varies significantly across databases:\n\n" +
      "### Syntax Comparison\n\n" +
      "| Database | Syntax |\n" +
      "|---|---|\n" +
      "| **SQLite** | `UPDATE t1 SET col = (SELECT val FROM t2 WHERE t2.key = t1.key)` |\n" +
      "| **PostgreSQL** | `UPDATE t1 SET col = t2.val FROM t2 WHERE t1.key = t2.key` |\n" +
      "| **MySQL** | `UPDATE t1 JOIN t2 ON t1.key = t2.key SET t1.col = t2.val` |\n" +
      "| **SQL Server** | `UPDATE t1 SET col = t2.val FROM t1 JOIN t2 ON t1.key = t2.key` |\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 170' role='img' aria-label='UPDATE with JOIN flow diagram'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- Source table -->" +
      "<g transform='translate(10, 20)'>" +
      "  <rect class='d-box' x='0' y='0' width='130' height='120' rx='5'/>" +
      "  <text class='d-sub' x='65' y='20' text-anchor='middle' font-weight='bold' font-size='10'>price_updates</text>" +
      "  <text class='d-sub' x='15' y='50' font-size='9'>id:1 → $24.99</text>" +
      "  <text class='d-sub' x='15' y='75' font-size='9'>id:3 → $34.99</text>" +
      "</g>" +
      "<!-- Arrow with JOIN -->" +
      "<line class='d-edge' x1='145' y1='80' x2='195' y2='80' marker-end='url(#arrow)' stroke-width='2'/>" +
      "<text class='d-sub' x='170' y='70' text-anchor='middle' font-size='8'>JOIN</text>" +
      "<!-- Target table before -->" +
      "<g transform='translate(200, 10)'>" +
      "  <rect class='d-box' x='0' y='0' width='120' height='140' rx='5'/>" +
      "  <text class='d-sub' x='60' y='20' text-anchor='middle' font-weight='bold' font-size='10'>products (before)</text>" +
      "  <text class='d-accent d-text' x='15' y='50' font-size='9' font-weight='bold'>Widget: $19.99</text>" +
      "  <text class='d-sub' x='15' y='75' font-size='9'>Gadget: $49.99</text>" +
      "  <text class='d-accent d-text' x='15' y='100' font-size='9' font-weight='bold'>Gizmo: $29.99</text>" +
      "</g>" +
      "<!-- Arrow -->" +
      "<line class='d-edge' x1='325' y1='80' x2='360' y2='80' marker-end='url(#arrow)' stroke-width='2'/>" +
      "<!-- Target table after -->" +
      "<g transform='translate(365, 10)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='110' height='140' rx='5'/>" +
      "  <text class='d-accent d-text' x='55' y='20' text-anchor='middle' font-weight='bold' font-size='10'>products (after)</text>" +
      "  <text class='d-accent d-text' x='10' y='50' font-size='9' font-weight='bold'>Widget: $24.99 ✓</text>" +
      "  <text class='d-sub' x='10' y='75' font-size='9'>Gadget: $49.99</text>" +
      "  <text class='d-accent d-text' x='10' y='100' font-size='9' font-weight='bold'>Gizmo: $34.99 ✓</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### Key Considerations\n\n" +
      "1. **Filter rows carefully:** If the subquery returns no match, the column may be set to `NULL` (use `WHERE EXISTS` to avoid this).\n" +
      "2. **One row per target:** Ensure the join produces at most one source row per target row, or you'll get non-deterministic results.\n" +
      "3. **Performance:** For large tables, ensure the join column is indexed on both sides.\n\n" +
      "**Interview tip:** Always mention the cross-database syntax differences — it shows you've worked with multiple database systems.",
    examples: [
      {
        label: "UPDATE from Another Table Playground",
        tech: "sql",
        code:
          "-- Before update:\n" +
          "SELECT p.name, p.price AS current_price, pu.new_price\n" +
          "FROM products p\n" +
          "LEFT JOIN price_updates pu ON p.id = pu.product_id;\n\n" +
          "-- Apply price updates (SQLite syntax):\n" +
          "UPDATE products\n" +
          "SET price = (\n" +
          "  SELECT new_price FROM price_updates\n" +
          "  WHERE price_updates.product_id = products.id\n" +
          ")\n" +
          "WHERE id IN (SELECT product_id FROM price_updates);\n\n" +
          "-- After update:\n" +
          "SELECT * FROM products;"
      }
    ]
  },
  {
    title: "What do GROUP BY ROLLUP and CUBE do?",
    description:
      "Explain ROLLUP and CUBE.\n\n" +
      "Here is the schema for our `sales` table:\n" +
      "```sql\n" +
      "CREATE TABLE sales (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  region VARCHAR(20),\n" +
      "  product VARCHAR(50),\n" +
      "  amount INT\n" +
      ");\n" +
      "INSERT INTO sales VALUES (1, 'East', 'Laptop', 1200);\n" +
      "INSERT INTO sales VALUES (2, 'East', 'Phone', 800);\n" +
      "INSERT INTO sales VALUES (3, 'West', 'Laptop', 1000);\n" +
      "INSERT INTO sales VALUES (4, 'West', 'Phone', 600);\n" +
      "INSERT INTO sales VALUES (5, 'East', 'Laptop', 1500);\n" +
      "INSERT INTO sales VALUES (6, 'West', 'Phone', 700);\n" +
      "```",
    answer:
      "## ROLLUP and CUBE — Multi-Level Aggregation\n\n" +
      "`ROLLUP` and `CUBE` are extensions of `GROUP BY` that automatically generate **subtotal and grand total** rows in a single query. They eliminate the need to write multiple `UNION ALL` queries.\n\n" +
      "| Extension | Generates |\n" +
      "|---|---|\n" +
      "| `GROUP BY ROLLUP(A, B)` | Groups: (A,B), (A), () — **hierarchical subtotals** |\n" +
      "| `GROUP BY CUBE(A, B)` | Groups: (A,B), (A), (B), () — **all combinations** |\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 200' role='img' aria-label='ROLLUP vs CUBE grouping sets comparison'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- ROLLUP -->" +
      "<g transform='translate(15, 10)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='210' height='170' rx='5'/>" +
      "  <text class='d-accent d-text' x='105' y='22' text-anchor='middle' font-weight='bold' font-size='10'>ROLLUP(region, product)</text>" +
      "  <rect class='d-box' x='10' y='30' width='190' height='25' rx='3'/>" +
      "  <text class='d-sub' x='105' y='47' text-anchor='middle' font-size='9'>1. (region, product) — detail</text>" +
      "  <rect class='d-box' x='10' y='60' width='190' height='25' rx='3'/>" +
      "  <text class='d-sub' x='105' y='77' text-anchor='middle' font-size='9'>2. (region) — subtotal per region</text>" +
      "  <rect class='d-box' x='10' y='90' width='190' height='25' rx='3'/>" +
      "  <text class='d-sub' x='105' y='107' text-anchor='middle' font-size='9'>3. () — grand total</text>" +
      "  <text class='d-sub' x='105' y='140' text-anchor='middle' font-size='8'>Hierarchical: right-to-left</text>" +
      "  <text class='d-sub' x='105' y='155' text-anchor='middle' font-size='8'>removal of grouping columns</text>" +
      "</g>" +
      "<!-- CUBE -->" +
      "<g transform='translate(250, 10)'>" +
      "  <rect class='d-box' x='0' y='0' width='210' height='170' rx='5'/>" +
      "  <text class='d-sub' x='105' y='22' text-anchor='middle' font-weight='bold' font-size='10'>CUBE(region, product)</text>" +
      "  <rect class='d-box' x='10' y='30' width='190' height='25' rx='3'/>" +
      "  <text class='d-sub' x='105' y='47' text-anchor='middle' font-size='9'>1. (region, product) — detail</text>" +
      "  <rect class='d-box' x='10' y='60' width='190' height='25' rx='3'/>" +
      "  <text class='d-sub' x='105' y='77' text-anchor='middle' font-size='9'>2. (region) — subtotal per region</text>" +
      "  <rect class='d-box-accent' x='10' y='90' width='190' height='25' rx='3'/>" +
      "  <text class='d-accent d-text' x='105' y='107' text-anchor='middle' font-size='9' font-weight='bold'>3. (product) — subtotal per product</text>" +
      "  <rect class='d-box' x='10' y='120' width='190' height='25' rx='3'/>" +
      "  <text class='d-sub' x='105' y='137' text-anchor='middle' font-size='9'>4. () — grand total</text>" +
      "  <text class='d-sub' x='105' y='160' text-anchor='middle' font-size='8'>All possible combinations</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### Identifying Subtotal Rows\n\n" +
      "Use `GROUPING()` function to distinguish real NULLs from subtotal NULLs:\n" +
      "```sql\nSELECT \n  COALESCE(region, 'ALL') AS region,\n  COALESCE(product, 'ALL') AS product,\n  SUM(amount) AS total,\n  GROUPING(region) AS is_region_total\nFROM sales\nGROUP BY ROLLUP(region, product);\n```\n\n" +
      "**Note:** SQLite does not support `ROLLUP` or `CUBE` natively. The playground demonstrates the equivalent using `UNION ALL`.\n\n" +
      "**Interview tip:** `ROLLUP` is for **hierarchical reports** (date → month → year), while `CUBE` is for **cross-tabulation** (all dimension combinations). Always mention the `GROUPING()` function for distinguishing subtotal rows.",
    examples: [
      {
        label: "ROLLUP Simulation Playground",
        tech: "sql",
        code:
          "-- Simulate ROLLUP with UNION ALL (SQLite compatible):\n" +
          "-- Detail level:\n" +
          "SELECT region, product, SUM(amount) AS total FROM sales\n" +
          "GROUP BY region, product\n" +
          "UNION ALL\n" +
          "-- Region subtotals:\n" +
          "SELECT region, 'ALL' AS product, SUM(amount) FROM sales\n" +
          "GROUP BY region\n" +
          "UNION ALL\n" +
          "-- Grand total:\n" +
          "SELECT 'ALL' AS region, 'ALL' AS product, SUM(amount) FROM sales\n" +
          "ORDER BY region, product;"
      }
    ]
  },
  {
    title: "What is a LATERAL join?",
    description:
      "Explain LATERAL joins.\n\n" +
      "Here is the schema for our `departments` and `employees` tables:\n" +
      "```sql\n" +
      "CREATE TABLE departments (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  name VARCHAR(50)\n" +
      ");\n" +
      "INSERT INTO departments VALUES (1, 'Engineering');\n" +
      "INSERT INTO departments VALUES (2, 'Sales');\n\n" +
      "CREATE TABLE employees (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  name VARCHAR(50),\n" +
      "  dept_id INT,\n" +
      "  salary INT\n" +
      ");\n" +
      "INSERT INTO employees VALUES (1, 'Alice', 1, 95000);\n" +
      "INSERT INTO employees VALUES (2, 'Bob', 1, 85000);\n" +
      "INSERT INTO employees VALUES (3, 'Charlie', 2, 70000);\n" +
      "INSERT INTO employees VALUES (4, 'David', 1, 90000);\n" +
      "INSERT INTO employees VALUES (5, 'Eve', 2, 75000);\n" +
      "```",
    answer:
      "## LATERAL Join — Correlated Subquery in FROM\n\n" +
      "A `LATERAL` join allows a subquery in the `FROM` clause to **reference columns from preceding tables** in the same `FROM` clause. Think of it as a correlated subquery that can return **multiple rows and columns**.\n\n" +
      "| Feature | Regular Subquery in FROM | LATERAL Subquery |\n" +
      "|---|---|---|\n" +
      "| References outer table | ❌ Cannot | ✅ Can |\n" +
      "| Returns multiple rows | ✅ Yes | ✅ Yes |\n" +
      "| Evaluated per outer row | ❌ Once total | ✅ Once per outer row |\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 180' role='img' aria-label='LATERAL join execution model'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- Left table -->" +
      "<g transform='translate(10, 20)'>" +
      "  <rect class='d-box' x='0' y='0' width='100' height='130' rx='5'/>" +
      "  <text class='d-sub' x='50' y='20' text-anchor='middle' font-weight='bold' font-size='10'>departments</text>" +
      "  <text class='d-sub' x='50' y='55' text-anchor='middle' font-size='9'>Engineering</text>" +
      "  <text class='d-sub' x='50' y='85' text-anchor='middle' font-size='9'>Sales</text>" +
      "</g>" +
      "<!-- For each row arrows -->" +
      "<line class='d-edge' x1='115' y1='55' x2='155' y2='45' marker-end='url(#arrow)' stroke-width='2'/>" +
      "<line class='d-edge' x1='115' y1='95' x2='155' y2='115' marker-end='url(#arrow)' stroke-width='2'/>" +
      "<text class='d-sub' x='135' y='35' text-anchor='middle' font-size='7'>For each</text>" +
      "<text class='d-sub' x='135' y='125' text-anchor='middle' font-size='7'>For each</text>" +
      "<!-- LATERAL subquery boxes -->" +
      "<g transform='translate(160, 15)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='160' height='55' rx='5'/>" +
      "  <text class='d-accent d-text' x='80' y='18' text-anchor='middle' font-weight='bold' font-size='9'>LATERAL (Engineering)</text>" +
      "  <text class='d-sub' x='80' y='35' text-anchor='middle' font-size='8'>Top 2: Alice(95K),</text>" +
      "  <text class='d-sub' x='80' y='48' text-anchor='middle' font-size='8'>David(90K)</text>" +
      "</g>" +
      "<g transform='translate(160, 85)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='160' height='55' rx='5'/>" +
      "  <text class='d-accent d-text' x='80' y='18' text-anchor='middle' font-weight='bold' font-size='9'>LATERAL (Sales)</text>" +
      "  <text class='d-sub' x='80' y='35' text-anchor='middle' font-size='8'>Top 2: Eve(75K),</text>" +
      "  <text class='d-sub' x='80' y='48' text-anchor='middle' font-size='8'>Charlie(70K)</text>" +
      "</g>" +
      "<!-- Result -->" +
      "<line class='d-edge' x1='325' y1='45' x2='355' y2='75' marker-end='url(#arrow)'/>" +
      "<line class='d-edge' x1='325' y1='115' x2='355' y2='95' marker-end='url(#arrow)'/>" +
      "<g transform='translate(360, 45)'>" +
      "  <rect class='d-box' x='0' y='0' width='110' height='80' rx='5'/>" +
      "  <text class='d-sub' x='55' y='18' text-anchor='middle' font-weight='bold' font-size='9'>Result</text>" +
      "  <text class='d-sub' x='55' y='40' text-anchor='middle' font-size='8'>4 rows total</text>" +
      "  <text class='d-sub' x='55' y='55' text-anchor='middle' font-size='8'>(Top 2 per dept)</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### Classic Use Case: \"Top N Per Group\"\n\n" +
      "```sql\n-- Top 2 earners per department (PostgreSQL):\nSELECT d.name, e.name, e.salary\nFROM departments d\nLATERAL (\n  SELECT name, salary\n  FROM employees\n  WHERE dept_id = d.id  -- references outer table!\n  ORDER BY salary DESC\n  LIMIT 2\n) e;\n```\n\n" +
      "### Availability\n\n" +
      "- **PostgreSQL** — Full `LATERAL` support.\n" +
      "- **MySQL 8.0+** — `LATERAL` derived tables.\n" +
      "- **SQL Server** — `CROSS APPLY` / `OUTER APPLY` (equivalent).\n" +
      "- **SQLite** — No native support (use correlated subquery or window functions).\n\n" +
      "**Interview tip:** If asked about \"Top N per group\", mention both the `LATERAL` approach and the `ROW_NUMBER()` window function approach. `LATERAL` is often more readable, while `ROW_NUMBER()` is more portable.",
    examples: [
      {
        label: "Top N Per Group Playground",
        tech: "sql",
        code:
          "-- SQLite alternative using ROW_NUMBER (LATERAL not supported):\n" +
          "SELECT dept_name, name, salary\n" +
          "FROM (\n" +
          "  SELECT \n" +
          "    d.name AS dept_name,\n" +
          "    e.name,\n" +
          "    e.salary,\n" +
          "    ROW_NUMBER() OVER (\n" +
          "      PARTITION BY e.dept_id \n" +
          "      ORDER BY e.salary DESC\n" +
          "    ) AS rn\n" +
          "  FROM employees e\n" +
          "  JOIN departments d ON e.dept_id = d.id\n" +
          ")\n" +
          "WHERE rn <= 2\n" +
          "ORDER BY dept_name, salary DESC;"
      }
    ]
  },
  {
    title: "What is the difference between CHAR, VARCHAR, and TEXT?",
    description:
      "Explain string data types.\n\n" +
      "Here is the schema for our `users` table:\n" +
      "```sql\n" +
      "CREATE TABLE users (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  country_code TEXT,\n" +
      "  username TEXT,\n" +
      "  bio TEXT\n" +
      ");\n" +
      "INSERT INTO users VALUES (1, 'US', 'alice', 'Software engineer passionate about databases.');\n" +
      "INSERT INTO users VALUES (2, 'UK', 'bob', 'Data analyst.');\n" +
      "INSERT INTO users VALUES (3, 'IN', 'charlie', NULL);\n" +
      "```",
    answer:
      "## CHAR vs VARCHAR vs TEXT\n\n" +
      "These three string types differ in **storage strategy**, **maximum length**, and **performance characteristics**:\n\n" +
      "| Property | CHAR(n) | VARCHAR(n) | TEXT |\n" +
      "|---|---|---|---|\n" +
      "| **Length** | Fixed, always n chars | Variable, up to n chars | Variable, up to engine max |\n" +
      "| **Padding** | Right-padded with spaces | No padding | No padding |\n" +
      "| **Storage** | Always n bytes | Length prefix + data | Length prefix + data |\n" +
      "| **Max size** | 255 (MySQL), 10485760 (PG) | 65,535 (MySQL), 10MB (PG) | 4GB+ |\n" +
      "| **Indexable** | ✅ Full | ✅ Full (up to limit) | ⚠️ Prefix only (MySQL) |\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 520 180' role='img' aria-label='CHAR vs VARCHAR vs TEXT storage comparison'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- CHAR storage -->" +
      "<g transform='translate(15, 15)'>" +
      "  <text class='d-sub' x='0' y='0' font-weight='bold' style='font-size: 10px;'>CHAR(10) storing \"US\":</text>" +
      "  <rect class='d-box-accent' x='0' y='10' width='25' height='25' rx='2'/><text class='d-accent d-text' x='12' y='28' text-anchor='middle' style='font-size: 9px;'>U</text>" +
      "  <rect class='d-box-accent' x='28' y='10' width='25' height='25' rx='2'/><text class='d-accent d-text' x='40' y='28' text-anchor='middle' style='font-size: 9px;'>S</text>" +
      "  <rect class='d-box' x='56' y='10' width='25' height='25' rx='2'/><text class='d-sub' x='68' y='28' text-anchor='middle' style='font-size: 8px;'>_</text>" +
      "  <rect class='d-box' x='84' y='10' width='25' height='25' rx='2'/><text class='d-sub' x='96' y='28' text-anchor='middle' style='font-size: 8px;'>_</text>" +
      "  <rect class='d-box' x='112' y='10' width='25' height='25' rx='2'/><text class='d-sub' x='124' y='28' text-anchor='middle' style='font-size: 8px;'>_</text>" +
      "  <text class='d-sub' x='145' y='28' style='font-size: 8px;'>... (padded to 10)</text>" +
      "  <text class='d-accent d-text' x='330' y='28' style='font-size: 8.5px; font-weight: bold;'>Always 10 bytes</text>" +
      "</g>" +
      "<!-- VARCHAR storage -->" +
      "<g transform='translate(15, 70)'>" +
      "  <text class='d-sub' x='0' y='0' font-weight='bold' style='font-size: 10px;'>VARCHAR(10) storing \"US\":</text>" +
      "  <rect class='d-box' x='0' y='10' width='25' height='25' rx='2'/><text class='d-sub' x='12' y='28' text-anchor='middle' style='font-size: 8px;'>2</text>" +
      "  <rect class='d-box-accent' x='28' y='10' width='25' height='25' rx='2'/><text class='d-accent d-text' x='40' y='28' text-anchor='middle' style='font-size: 9px;'>U</text>" +
      "  <rect class='d-box-accent' x='56' y='10' width='25' height='25' rx='2'/><text class='d-accent d-text' x='68' y='28' text-anchor='middle' style='font-size: 9px;'>S</text>" +
      "  <text class='d-sub' x='110' y='28' style='font-size: 8px;'>(no padding)</text>" +
      "  <text class='d-accent d-text' x='330' y='28' style='font-size: 8.5px; font-weight: bold;'>Only 3 bytes (1 len + 2 data)</text>" +
      "</g>" +
      "<!-- TEXT storage -->" +
      "<g transform='translate(15, 125)'>" +
      "  <text class='d-sub' x='0' y='0' font-weight='bold' style='font-size: 10px;'>TEXT storing a long bio:</text>" +
      "  <rect class='d-box' x='0' y='10' width='300' height='25' rx='2'/>" +
      "  <text class='d-sub' x='150' y='28' text-anchor='middle' style='font-size: 8px;'>Variable-length, often stored out-of-line (TOAST in PG)</text>" +
      "  <text class='d-accent d-text' x='330' y='28' style='font-size: 8.5px; font-weight: bold;'>No length limit enforced</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### When to Use Each\n\n" +
      "- **CHAR(n):** Fixed-length codes (country codes, state abbreviations, UUIDs of fixed length).\n" +
      "- **VARCHAR(n):** Most string columns — usernames, emails, titles (with a reasonable max length).\n" +
      "- **TEXT:** Long-form content — blog posts, descriptions, JSON blobs (when you don't need a length constraint).\n\n" +
      "### PostgreSQL Note\n\n" +
      "In PostgreSQL, there is **no performance difference** between `VARCHAR(n)` and `TEXT`. The length check is a constraint, not a storage optimization. Many PG developers prefer `TEXT` + a check constraint.\n\n" +
      "**Interview tip:** Mention that in **SQLite**, all three types are stored the same way — SQLite uses dynamic typing and treats them all as `TEXT` affinity.",
    examples: [
      {
        label: "String Types Playground",
        tech: "sql",
        code:
          "-- In SQLite, all string types behave the same:\n" +
          "SELECT \n" +
          "  username,\n" +
          "  country_code,\n" +
          "  LENGTH(country_code) AS code_len,\n" +
          "  LENGTH(bio) AS bio_len,\n" +
          "  TYPEOF(country_code) AS code_type\n" +
          "FROM users;"
      }
    ]
  },
  {
    title: "Why might EXISTS outperform a JOIN for existence checks?",
    description:
      "Explain EXISTS vs JOIN for existence.\n\n" +
      "Here is the schema for our `customers` and `orders` tables:\n" +
      "```sql\n" +
      "CREATE TABLE customers (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  name VARCHAR(50),\n" +
      "  email VARCHAR(100)\n" +
      ");\n" +
      "INSERT INTO customers VALUES (1, 'Alice', 'alice@example.com');\n" +
      "INSERT INTO customers VALUES (2, 'Bob', 'bob@example.com');\n" +
      "INSERT INTO customers VALUES (3, 'Charlie', 'charlie@example.com');\n" +
      "INSERT INTO customers VALUES (4, 'David', 'david@example.com');\n\n" +
      "CREATE TABLE orders (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  customer_id INT,\n" +
      "  product VARCHAR(50),\n" +
      "  amount INT\n" +
      ");\n" +
      "INSERT INTO orders VALUES (1, 1, 'Laptop', 1200);\n" +
      "INSERT INTO orders VALUES (2, 1, 'Phone', 800);\n" +
      "INSERT INTO orders VALUES (3, 2, 'Tablet', 400);\n" +
      "INSERT INTO orders VALUES (4, 1, 'Monitor', 600);\n" +
      "INSERT INTO orders VALUES (5, 3, 'Keyboard', 100);\n" +
      "```",
    answer:
      "## EXISTS vs JOIN for Existence Checks\n\n" +
      "When you need to find rows in Table A that have **at least one** matching row in Table B, both `EXISTS` and `JOIN` work — but `EXISTS` can be faster because it **short-circuits** on the first match.\n\n" +
      "| Approach | Behavior | Result |\n" +
      "|---|---|---|\n" +
      "| `JOIN` | Produces one output row **per match** (may duplicate outer rows) | Requires `DISTINCT` to deduplicate |\n" +
      "| `EXISTS` | Returns TRUE on **first match found**, stops scanning | No duplicates possible |\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 200' role='img' aria-label='EXISTS short-circuit vs JOIN full scan comparison'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- JOIN path -->" +
      "<g transform='translate(10, 10)'>" +
      "  <text class='d-sub' x='110' y='0' text-anchor='middle' font-weight='bold' font-size='10'>JOIN Approach</text>" +
      "  <rect class='d-box' x='0' y='10' width='100' height='50' rx='4'/>" +
      "  <text class='d-sub' x='50' y='30' text-anchor='middle' font-size='9'>Alice (id=1)</text>" +
      "  <text class='d-sub' x='50' y='48' text-anchor='middle' font-size='8'>3 orders</text>" +
      "  <line class='d-edge' x1='100' y1='25' x2='120' y2='20' marker-end='url(#arrow)'/>" +
      "  <line class='d-edge' x1='100' y1='35' x2='120' y2='35' marker-end='url(#arrow)'/>" +
      "  <line class='d-edge' x1='100' y1='45' x2='120' y2='50' marker-end='url(#arrow)'/>" +
      "  <rect class='d-box' x='125' y='5' width='100' height='55' rx='4'/>" +
      "  <text class='d-accent d-text' x='175' y='22' text-anchor='middle' font-size='8' font-weight='bold'>3 result rows!</text>" +
      "  <text class='d-sub' x='175' y='38' text-anchor='middle' font-size='7'>Alice + Laptop</text>" +
      "  <text class='d-sub' x='175' y='48' text-anchor='middle' font-size='7'>Alice + Phone</text>" +
      "  <text class='d-sub' x='175' y='58' text-anchor='middle' font-size='7'>Alice + Monitor</text>" +
      "</g>" +
      "<!-- EXISTS path -->" +
      "<g transform='translate(10, 100)'>" +
      "  <text class='d-accent d-text' x='110' y='0' text-anchor='middle' font-weight='bold' font-size='10'>EXISTS Approach</text>" +
      "  <rect class='d-box-accent' x='0' y='10' width='100' height='50' rx='4'/>" +
      "  <text class='d-accent d-text' x='50' y='30' text-anchor='middle' font-size='9'>Alice (id=1)</text>" +
      "  <text class='d-sub' x='50' y='48' text-anchor='middle' font-size='8'>3 orders</text>" +
      "  <line class='d-edge' x1='100' y1='35' x2='120' y2='35' marker-end='url(#arrow)'/>" +
      "  <rect class='d-box-accent' x='125' y='10' width='100' height='50' rx='4'/>" +
      "  <text class='d-accent d-text' x='175' y='28' text-anchor='middle' font-size='8' font-weight='bold'>1st match found!</text>" +
      "  <text class='d-accent d-text' x='175' y='45' text-anchor='middle' font-size='9' font-weight='bold'>→ STOP ✅</text>" +
      "</g>" +
      "<!-- Comparison box -->" +
      "<g transform='translate(260, 40)'>" +
      "  <rect class='d-box' x='0' y='0' width='210' height='120' rx='5'/>" +
      "  <text class='d-sub' x='105' y='20' text-anchor='middle' font-weight='bold' font-size='9'>Performance Impact</text>" +
      "  <text class='d-sub' x='15' y='45' font-size='8'>If Alice has 1000 orders:</text>" +
      "  <text class='d-sub' x='15' y='65' font-size='8'>JOIN scans all 1000</text>" +
      "  <text class='d-accent d-text' x='15' y='85' font-size='8' font-weight='bold'>EXISTS stops after 1st</text>" +
      "  <text class='d-accent d-text' x='15' y='105' font-size='8' font-weight='bold'>= 1000x fewer reads!</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### The Key Scenarios\n\n" +
      "```sql\n-- ❌ JOIN produces duplicates when a customer has multiple orders:\nSELECT DISTINCT c.name\nFROM customers c\nJOIN orders o ON c.id = o.customer_id;\n-- Alice appears 3 times → need DISTINCT\n\n-- ✅ EXISTS — clean, no duplicates, short-circuits:\nSELECT c.name\nFROM customers c\nWHERE EXISTS (\n  SELECT 1 FROM orders o WHERE o.customer_id = c.id\n);\n```\n\n" +
      "### When JOIN is Better\n\n" +
      "- When you **need data from both tables** (not just checking existence).\n" +
      "- When the inner table is **small** and there's a 1:1 relationship.\n" +
      "- Modern optimizers often transform `EXISTS` into a semi-join internally anyway.\n\n" +
      "**Interview tip:** The critical phrase is **\"semi-join semantics\"** — `EXISTS` naturally performs a semi-join (return the outer row if *any* match exists), which is exactly what you want for existence checks.",
    examples: [
      {
        label: "EXISTS vs JOIN Playground",
        tech: "sql",
        code:
          "-- Method 1: JOIN (may produce duplicates)\n" +
          "SELECT c.name, o.product\n" +
          "FROM customers c\n" +
          "JOIN orders o ON c.id = o.customer_id;\n" +
          "\n" +
          "-- Method 2: EXISTS (clean, one row per customer)\n" +
          "SELECT c.name\n" +
          "FROM customers c\n" +
          "WHERE EXISTS (\n" +
          "  SELECT 1 FROM orders o WHERE o.customer_id = c.id\n" +
          ");\n" +
          "\n" +
          "-- Method 3: NOT EXISTS (customers with NO orders)\n" +
          "SELECT c.name\n" +
          "FROM customers c\n" +
          "WHERE NOT EXISTS (\n" +
          "  SELECT 1 FROM orders o WHERE o.customer_id = c.id\n" +
          ");"
      }
    ]
  }
];

export default augments;
