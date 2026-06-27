import type { SqlAugment } from "./sql-augments.types";

const augments: SqlAugment[] = [
  {
    title: "What is the difference between a primary key and a foreign key?",
    description:
      "Explain keys.\n\n" +
      "Here is the schema for our `departments` and `employees` tables:\n" +
      "```sql\n" +
      "CREATE TABLE departments (\n" +
      "  dept_id INT PRIMARY KEY,\n" +
      "  dept_name VARCHAR(50)\n" +
      ");\n" +
      "INSERT INTO departments VALUES (1, 'Engineering');\n" +
      "INSERT INTO departments VALUES (2, 'Sales');\n\n" +
      "CREATE TABLE employees (\n" +
      "  emp_id INT PRIMARY KEY,\n" +
      "  name VARCHAR(50),\n" +
      "  department_id INT,\n" +
      "  FOREIGN KEY (department_id) REFERENCES departments(dept_id)\n" +
      ");\n" +
      "INSERT INTO employees VALUES (10, 'Alice', 1);\n" +
      "INSERT INTO employees VALUES (20, 'Bob', 2);\n" +
      "```",
    answer:
      "## Primary Key vs. Foreign Key\n\n" +
      "Primary keys and foreign keys define database constraints that guarantee relational integrity across tables:\n\n" +
      "- **Primary Key (PK):** Uniquely identifies each record inside a table. It cannot contain `NULL` values, and a table can have **only one** primary key.\n" +
      "- **Foreign Key (FK):** Reference column that maps to a primary key in another table (or the same table). It enforces **referential integrity**, ensuring that the value in the child column matches an existing parent row key.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 550 170' role='img' aria-label='Primary Key to Foreign Key relationship mapping'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- Parent Table (Departments) -->" +
      "<g transform='translate(15, 20)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='210' height='125' rx='5'/>" +
      "  <text x='105' y='22' text-anchor='middle' font-weight='bold' font-size='10' fill='var(--accent)'>departments (Parent)</text>" +
      "  <rect class='d-box' x='10' y='35' width='190' height='25' rx='3'/>" +
      "  <text x='105' y='51' text-anchor='middle' font-weight='bold' font-size='9' fill='var(--muted)'>dept_id (PK - Unique, Not Null)</text>" +
      "  <text x='20' y='90' font-size='9' fill='var(--muted)'>dept_name</text>" +
      "</g>" +
      "<!-- Relation edge -->" +
      "<line class='d-edge' x1='230' y1='70' x2='305' y2='70' marker-end='url(#arrow)' stroke-width='2'/>" +
      "<text x='267' y='60' text-anchor='middle' font-size='8.5' fill='var(--muted)'>Enforces Match</text>" +
      "<!-- Child Table (Employees) -->" +
      "<g transform='translate(315, 20)'>" +
      "  <rect class='d-box' x='0' y='0' width='220' height='125' rx='5'/>" +
      "  <text x='110' y='22' text-anchor='middle' font-weight='bold' font-size='10' fill='var(--fg)'>employees (Child)</text>" +
      "  <text x='20' y='50' font-size='9' fill='var(--muted)'>emp_id (PK)</text>" +
      "  <text x='20' y='75' font-size='9' fill='var(--muted)'>name</text>" +
      "  <rect class='d-box-accent' x='10' y='88' width='200' height='25' rx='3'/>" +
      "  <text x='110' y='104' text-anchor='middle' font-weight='bold' font-size='9' fill='var(--accent)'>department_id (FK - Nullable)</text>" +
      "</g>" +
      "</svg>" +
      "### Core Differences\n" +
      "| Attribute | Primary Key | Foreign Key |\n" +
      "|---|---|---|\n" +
      "| **Uniqueness** | Must be strictly unique | Can contain duplicate values |\n" +
      "| **Nullability** | Cannot contain `NULL` | Can contain `NULL` (representing orphan/unassigned state) |\n" +
      "| **Quantity** | Strictly **one** per table | Can define **multiple** foreign key mappings per table |\n" +
      "| **Index** | Automatically creates a Clustered Index | Does not automatically create indexes (manually index for join performance) |\n\n" +
      "**Interview tip:** Emphasize that foreign keys enforce **referential integrity actions** (like `ON DELETE CASCADE`, `ON DELETE SET NULL`, `ON DELETE RESTRICT`) to control parent row deletions.",
    examples: [
      {
        label: "Primary Key vs Foreign Key Playground",
        tech: "sql",
        code:
          "-- 1. Fails: department_id 99 does not exist in departments table (FK constraint)\n" +
          "-- INSERT INTO employees VALUES (30, 'Eve', 99);\n\n" +
          "-- 2. Valid join query mapping relations:\n" +
          "SELECT e.name, d.dept_name\n" +
          "FROM employees e\n" +
          "INNER JOIN departments d ON e.department_id = d.dept_id;"
      }
    ]
  },
  {
    title: "What is the difference between UNION and UNION ALL?",
    description:
      "Compare UNION and UNION ALL.\n\n" +
      "Here is the schema for our `active_customers` and `archive_customers` tables:\n" +
      "```sql\n" +
      "CREATE TABLE active_customers (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  name VARCHAR(50),\n" +
      "  email VARCHAR(50)\n" +
      ");\n" +
      "INSERT INTO active_customers VALUES (1, 'Alice', 'alice@example.com');\n" +
      "INSERT INTO active_customers VALUES (2, 'Bob', 'bob@example.com');\n\n" +
      "CREATE TABLE archive_customers (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  name VARCHAR(50),\n" +
      "  email VARCHAR(50)\n" +
      ");\n" +
      "INSERT INTO archive_customers VALUES (2, 'Bob', 'bob@example.com');\n" +
      "INSERT INTO archive_customers VALUES (3, 'Charlie', 'charlie@example.com');\n" +
      "```",
    answer:
      "## UNION vs. UNION ALL\n\n" +
      "Both operators concatenate the results of two separate queries into a single combined output, but handle duplicates and sorting differently:\n\n" +
      "- **`UNION`:** Combines the outputs and **removes duplicate rows** across the result sets. To do this, the database executes an sorting/deduplication routine on the values.\n" +
      "- **`UNION ALL`:** Appends the query results directly **including all duplicate rows** without performing sorting or deduplication. It is significantly faster.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 180' role='img' aria-label='UNION vs UNION ALL query results comparison'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- Input Sets -->" +
      "<g transform='translate(10, 20)'>" +
      "  <rect class='d-box' x='0' y='0' width='100' height='55' rx='4'/>" +
      "  <text class='d-sub' x='50' y='18' text-anchor='middle' font-size='9' font-weight='bold'>Active: [A, B]</text>" +
      "  <rect class='d-box' x='0' y='75' width='100' height='55' rx='4'/>" +
      "  <text class='d-sub' x='50' y='93' text-anchor='middle' font-size='9' font-weight='bold'>Archive: [B, C]</text>" +
      "</g>" +
      "<!-- UNION ALL flow -->" +
      "<line class='d-edge' x1='120' y1='40' x2='175' y2='40' marker-end='url(#arrow)'/>" +
      "<line class='d-edge' x1='120' y1='105' x2='175' y2='45' marker-end='url(#arrow)'/>" +
      "<g transform='translate(190, 15)'>" +
      "  <rect class='d-box' x='0' y='0' width='110' height='60' rx='4'/>" +
      "  <text class='d-sub' x='55' y='18' text-anchor='middle' font-size='9' font-weight='bold'>UNION ALL</text>" +
      "  <text class='d-sub' x='55' y='38' text-anchor='middle' font-size='9'>[A, B, B, C]</text>" +
      "  <text class='d-sub' x='55' y='50' text-anchor='middle' font-size='7' fill-opacity='0.7'>(Fast append)</text>" +
      "</g>" +
      "<!-- UNION (deduplicate) flow -->" +
      "<line class='d-edge' x1='120' y1='50' x2='175' y2='125' marker-end='url(#arrow)'/>" +
      "<line class='d-edge' x1='120' y1='115' x2='175' y2='135' marker-end='url(#arrow)'/>" +
      "<g transform='translate(190, 105)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='110' height='60' rx='4'/>" +
      "  <text class='d-accent d-text' x='55' y='18' text-anchor='middle' font-size='9' font-weight='bold'>UNION</text>" +
      "  <text class='d-sub' x='55' y='38' text-anchor='middle' font-size='9'>[A, B, C]</text>" +
      "  <text class='d-sub' x='55' y='50' text-anchor='middle' font-size='7' fill-opacity='0.7'>(Sort & Dedup)</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### Compare Operator traits\n" +
      "- **Performance:** `UNION ALL` avoids temporary disk writes or in-memory sorts. `UNION` introduces a sort/unique node step in the execution plan, which scales poorly ($O(N \\log N)$) as records grow.\n" +
      "- **Column Count & Types:** Both require identical column counts in standard order, and compatible data types for mapped columns.\n\n" +
      "**Interview tip:** Explain that you should default to `UNION ALL` for concatenating datasets unless you explicitly need distinct values, as the deduplication overhead in `UNION` degrades latency on large inputs.",
    examples: [
      {
        label: "UNION vs UNION ALL Playground",
        tech: "sql",
        code:
          "-- 1. UNION ALL (Appends Bob twice, total 4 rows):\n" +
          "SELECT name, email FROM active_customers\n" +
          "UNION ALL\n" +
          "SELECT name, email FROM archive_customers;\n\n" +
          "-- 2. UNION (Applies sort to filter duplicate Bob, returns 3 rows):\n" +
          "-- SELECT name, email FROM active_customers\n" +
          "-- UNION\n" +
          "-- SELECT name, email FROM archive_customers;"
      }
    ]
  },
  {
    title: "What is a CTE (Common Table Expression)?",
    description:
      "Explain WITH clauses.\n\n" +
      "Here is the schema for our `sales` table:\n" +
      "```sql\n" +
      "CREATE TABLE sales (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  product VARCHAR(50),\n" +
      "  amount INT\n" +
      ");\n" +
      "INSERT INTO sales VALUES (1, 'Apple', 100);\n" +
      "INSERT INTO sales VALUES (2, 'Apple', 150);\n" +
      "INSERT INTO sales VALUES (3, 'Banana', 50);\n" +
      "```",
    answer:
      "## Common Table Expressions (CTEs)\n\n" +
      "A Common Table Expression (CTE) is a temporary, named result set that exists solely within the execution scope of a single parent query (`SELECT`, `INSERT`, `UPDATE`, or `DELETE`). It is defined using the `WITH` statement:\n\n" +
      "### Basic Syntax Structure\n" +
      "```sql\n" +
      "WITH my_cte AS (\n" +
      "  SELECT col1, col2\n" +
      "  FROM my_table\n" +
      "  WHERE col3 = 'active'\n" +
      ")\n" +
      "SELECT * FROM my_cte; -- Reference the CTE by name\n" +
      "```\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 140' role='img' aria-label='CTE query parser references named expression'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- WITH expression -->" +
      "<rect class='d-box' x='15' y='35' width='140' height='40' rx='5'/>" +
      "<text class='d-sub' x='85' y='55' text-anchor='middle' font-weight='bold'>WITH my_cte AS (...)</text>" +
      "<text class='d-sub' x='85' y='70' text-anchor='middle' font-size='8'>Temporary scoped dataset</text>" +
      "<!-- Execution pipeline -->" +
      "<line class='d-edge' x1='165' y1='55' x2='225' y2='55' marker-end='url(#arrow)'/>" +
      "<!-- Parent query -->" +
      "<rect class='d-box-accent' x='245' y='35' width='210' height='40' rx='5'/>" +
      "<text class='d-accent d-text' x='350' y='55' text-anchor='middle' font-weight='bold'>SELECT FROM my_cte</text>" +
      "<text class='d-sub' x='350' y='70' text-anchor='middle' font-size='8'>Clean modular query structure</text>" +
      "</svg>\n\n" +
      "### Advantages of CTEs\n" +
      "- **Readability:** Breaks down monolithic nested queries into clean, sequential sections that read like programming variables.\n" +
      "- **Recursion:** Standard recursive CTEs (`WITH RECURSIVE`) enable queries to traverse parent-child hierarchical trees or graphs (like organizational charts or menu directories).\n" +
      "- **Modularity:** Let you name subquery outputs and reuse them multiple times inside the same parent query.\n\n" +
      "**Interview tip:** Mention that in most modern databases (like PostgreSQL 12+), non-recursive CTEs are automatically optimized by the query planner, meaning they are evaluated inline and perform identically to subqueries, rather than incurring a physical storage penalty.",
    examples: [
      {
        label: "CTE Playground",
        tech: "sql",
        code:
          "-- Extract aggregated products total, then filter on named expression:\n" +
          "WITH total_sales_cte AS (\n" +
          "  SELECT product, SUM(amount) AS total\n" +
          "  FROM sales\n" +
          "  GROUP BY product\n" +
          ")\n" +
          "SELECT product, total\n" +
          "FROM total_sales_cte\n" +
          "WHERE total > 100;"
      }
    ]
  },
  {
    title: "What is the difference between EXISTS and IN?",
    description:
      "Compare EXISTS and IN.\n\n" +
      "Here is the schema for our `departments` and `employees` tables:\n" +
      "```sql\n" +
      "CREATE TABLE departments (\n" +
      "  dept_id INT PRIMARY KEY,\n" +
      "  dept_name VARCHAR(50)\n" +
      ");\n" +
      "INSERT INTO departments VALUES (1, 'Engineering');\n" +
      "INSERT INTO departments VALUES (2, 'Sales');\n" +
      "INSERT INTO departments VALUES (3, 'Marketing');\n\n" +
      "CREATE TABLE employees (\n" +
      "  emp_id INT PRIMARY KEY,\n" +
      "  name VARCHAR(50),\n" +
      "  department_id INT\n" +
      ");\n" +
      "INSERT INTO employees VALUES (10, 'Alice', 1);\n" +
      "INSERT INTO employees VALUES (20, 'Bob', 2);\n" +
      "```",
    answer:
      "## EXISTS vs. IN\n\n" +
      "Both keywords perform containment checks against subqueries, but differ in evaluation semantics and optimization profiles:\n\n" +
      "- **`IN`:** Evaluates the inner subquery first to generate an **in-memory literal value list**. The outer query then performs standard membership lookups against this set.\n" +
      "- **`EXISTS`:** Runs a correlated evaluation per outer row. The database engine scans index blocks for a match and **short-circuits (stops processing)** the moment the first matching record is located.\n" +
      "\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 160' role='img' aria-label='IN set match vs EXISTS short-circuit comparison'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- IN flow -->" +
      "<g transform='translate(15, 20)'>" +
      "  <rect class='d-box' x='0' y='0' width='210' height='120' rx='5'/>" +
      "  <text class='d-sub' x='105' y='20' text-anchor='middle' font-weight='bold'>IN (Sets)</text>" +
      "  <text class='d-sub' x='20' y='45' font-size='8'>1. Materializes subquery array</text>" +
      "  <rect class='d-box-muted' x='20' y='60' width='170' height='20' rx='3'/>" +
      "  <text class='d-sub' x='105' y='73' text-anchor='middle' font-size='8'>In-memory Set: [1, 2, 3, ...]</text>" +
      "  <text class='d-sub' x='20' y='105' font-size='8'>2. Compares outer column to set</text>" +
      "</g>" +
      "<!-- EXISTS flow -->" +
      "<g transform='translate(255, 20)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='210' height='120' rx='5'/>" +
      "  <text class='d-accent d-text' x='105' y='20' text-anchor='middle' font-weight='bold'>EXISTS (Short-Circuit)</text>" +
      "  <text class='d-sub' x='20' y='45' font-size='8'>1. Evaluates inner query per outer row</text>" +
      "  <line x1='20' y1='65' x2='190' y2='65' stroke='currentColor' stroke-dasharray='2,2'/>" +
      "  <text class='d-sub' x='20' y='85' font-size='8'>2. Scans child indexes</text>" +
      "  <rect class='d-box-accent' x='20' y='95' width='170' height='18' rx='2'/>" +
      "  <text class='d-accent d-text' x='105' y='107' text-anchor='middle' font-size='8'>Found match -> Stop scanning row</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### Compare Traits & Optimization\n" +
      "- **Null Handling:** `IN` returns `UNKNOWN` if the subquery returns any `NULL` value, which can prevent the outer query from matching any rows. `EXISTS` is immune to null anomalies because it checks row existence, not values.\n" +
      "- **Performance:** For small static subqueries, `IN` is fast. For large datasets or selective child tables, `EXISTS` is typically faster because it uses indexes to short-circuit lookup loops.\n\n" +
      "**Interview tip:** Explain that `EXISTS` is safer when dealing with nullable columns, since `NOT IN` will return zero rows if the subquery contains a single `NULL` value.",
    examples: [
      {
        label: "EXISTS vs IN Playground",
        tech: "sql",
        code:
          "-- 1. Using EXISTS (checks matching employee record exist, then short-circuits):\n" +
          "SELECT dept_name FROM departments d\n" +
          "WHERE EXISTS (\n" +
          "  SELECT 1 FROM employees e \n" +
          "  WHERE e.department_id = d.dept_id\n" +
          ");\n\n" +
          "-- 2. Using IN (compares dept_id against materialised set):\n" +
          "-- SELECT dept_name FROM departments\n" +
          "-- WHERE dept_id IN (SELECT department_id FROM employees);"
      }
    ]
  },
  {
    title: "What is the CASE expression?",
    description:
      "Explain CASE.\n\n" +
      "Here is the schema for our `sales` table:\n" +
      "```sql\n" +
      "CREATE TABLE sales (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  product VARCHAR(50),\n" +
      "  amount INT\n" +
      ");\n" +
      "INSERT INTO sales VALUES (1, 'Apple', 100);\n" +
      "INSERT INTO sales VALUES (2, 'Apple', 150);\n" +
      "INSERT INTO sales VALUES (3, 'Banana', 50);\n" +
      "```",
    answer:
      "## CASE Expression\n\n" +
      "The `CASE` expression is SQL's conditional helper, matching `if-then-else` logical branching. It returns a single formatted value based on condition paths:\n\n" +
      "### 1. Simple CASE\n" +
      "Compares a single expression against static values:\n" +
      "```sql\n" +
      "CASE product\n" +
      "  WHEN 'Apple' THEN 'Fruit'\n" +
      "  ELSE 'Other'\n" +
      "END\n" +
      "```\n\n" +
      "### 2. Searched CASE (Recommended)\n" +
      "Evaluates complex boolean check conditions sequentially:\n" +
      "```sql\n" +
      "CASE \n" +
      "  WHEN amount >= 150 THEN 'High'\n" +
      "  ELSE 'Low'\n" +
      "END\n" +
      "```\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 140' role='img' aria-label='CASE evaluation branching flow'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- Input value -->" +
      "<rect class='d-box' x='15' y='35' width='90' height='40' rx='5'/>" +
      "<text class='d-sub' x='60' y='55' text-anchor='middle' font-weight='bold'>Row Value</text>" +
      "<text class='d-sub' x='60' y='70' text-anchor='middle' font-size='8' fill-opacity='0.7'>amount: 150</text>" +
      "<!-- Branching -->" +
      "<line class='d-edge' x1='115' y1='55' x2='175' y2='35' marker-end='url(#arrow)'/>" +
      "<line class='d-edge' x1='115' y1='55' x2='175' y2='75' marker-end='url(#arrow)'/>" +
      "<!-- Decision conditions -->" +
      "<g transform='translate(190, 10)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='120' height='30' rx='3'/>" +
      "  <text class='d-accent d-text' x='60' y='18' text-anchor='middle' font-size='9'>WHEN amount &gt;= 150</text>" +
      "  <line class='d-edge' x1='130' y1='15' x2='180' y2='15' marker-end='url(#arrow)'/>" +
      "  <text class='d-accent d-text' x='200' y='20' font-size='9'>THEN 'High'</text>" +
      "  <rect class='d-box' x='0' y='55' width='120' height='30' rx='3'/>" +
      "  <text class='d-sub' x='60' y='73' text-anchor='middle' font-size='9'>ELSE 'Low'</text>" +
      "  <line class='d-edge' x1='130' y1='70' x2='180' y2='70' marker-end='url(#arrow)'/>" +
      "  <text class='d-sub' x='200' y='75' font-size='9'>THEN 'Low'</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### Common Use Cases\n" +
      "- **Data Pivoting:** Aggregating values into pivot grids (e.g. `SUM(CASE WHEN q = 'Q1' THEN sales END)`).\n" +
      "- **Custom Ordering:** Sorting items in non-alphabetical orders by placing CASE blocks inside `ORDER BY` clauses.\n" +
      "- **Safe Division:** Preventing divide-by-zero errors in calculations dynamically.\n\n" +
      "**Interview tip:** Remind the interviewer that if no `WHEN` condition matches and no `ELSE` clause is specified, the `CASE` expression returns `NULL` by default.",
    examples: [
      {
        label: "CASE Playground",
        tech: "sql",
        code:
          "-- Categorize product sales value ranges dynamically:\n" +
          "SELECT \n" +
          "  product, \n" +
          "  amount,\n" +
          "  CASE \n" +
          "    WHEN amount >= 150 THEN 'High Value'\n" +
          "    WHEN amount >= 100 THEN 'Medium Value'\n" +
          "    ELSE 'Low Value'\n" +
          "  END AS sales_tier\n" +
          "FROM sales;"
      }
    ]
  },
  {
    title: "What do COALESCE and NULLIF do?",
    description:
      "Explain null helpers.\n\n" +
      "Here is the schema for our `products` table:\n" +
      "```sql\n" +
      "CREATE TABLE products (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  name VARCHAR(50),\n" +
      "  price INT,\n" +
      "  discount_price INT\n" +
      ");\n" +
      "INSERT INTO products VALUES (1, 'Laptop', 1000, NULL);\n" +
      "INSERT INTO products VALUES (2, 'Phone', 500, 450);\n" +
      "INSERT INTO products VALUES (3, 'Tablet', 300, 0);\n" +
      "```",
    answer:
      "## COALESCE and NULLIF\n\n" +
      "Both functions manage `NULL` values cleanly to prevent unexpected errors during computations:\n\n" +
      "- **`COALESCE(val1, val2, ...)`:** Returns the **first non-NULL value** in its arguments list. It provides fallback values sequentially.\n" +
      "- **`NULLIF(val1, val2)`:** Returns `NULL` if `val1` equals `val2`. Otherwise, it returns `val1` unchanged. Useful to prevent division-by-zero errors.\n" +
      "\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 150' role='img' aria-label='COALESCE fallback evaluation loop'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- Arg 1 -->" +
      "<rect class='d-box' x='15' y='35' width='100' height='40' rx='5'/>" +
      "<text class='d-sub' x='65' y='52' text-anchor='middle' font-size='9' font-weight='bold'>Arg 1: discount_price</text>" +
      "<text class='d-sub' x='65' y='65' text-anchor='middle' font-size='8' fill-opacity='0.7'>(NULL)</text>" +
      "<!-- First evaluation -->" +
      "<line class='d-edge' x1='120' y1='55' x2='170' y2='55' marker-end='url(#arrow)'/>" +
      "<text class='d-sub' x='145' y='45' text-anchor='middle' font-size='8'>If NULL</text>" +
      "<!-- Arg 2 -->" +
      "<rect class='d-box-accent' x='180' y='35' width='100' height='40' rx='5'/>" +
      "<text class='d-accent d-text' x='230' y='52' text-anchor='middle' font-size='9' font-weight='bold'>Arg 2: price</text>" +
      "<text class='d-accent d-text' x='230' y='65' text-anchor='middle' font-size='8' fill-opacity='0.7'>($1000)</text>" +
      "<!-- Final output -->" +
      "<line class='d-edge' x1='285' y1='55' x2='335' y2='55' marker-end='url(#arrow)'/>" +
      "<rect class='d-box-accent' x='345' y='35' width='120' height='40' rx='5'/>" +
      "<text class='d-accent d-text' x='405' y='58' text-anchor='middle' font-size='9' font-weight='bold'>Output: $1000</text>" +
      "</svg>\n\n" +
      "### Common Scenarios\n" +
      "1. **Fallback Default Values:** Use `COALESCE` to swap null entries with default placeholders (e.g. `COALESCE(phone, 'N/A')`).\n" +
      "2. **Preventing Division Errors:** Wrap denominators inside `NULLIF` to convert zeros to nulls, since standard division by `NULL` returns `NULL` instead of throwing a runtime database error:\n" +
      "   ```sql\n" +
      "   SELECT total_sales / NULLIF(units_sold, 0);\n" +
      "   ```\n\n" +
      "**Interview tip:** Point out that `COALESCE` is syntactic shorthand for a standard `CASE WHEN val1 IS NOT NULL THEN val1 ELSE val2 END` block.",
    examples: [
      {
        label: "COALESCE and NULLIF Playground",
        tech: "sql",
        code:
          "-- 1. COALESCE: fallback discount price to standard price:\n" +
          "SELECT name, COALESCE(discount_price, price) AS final_price\n" +
          "FROM products;\n\n" +
          "-- 2. NULLIF: safe division to avoid division-by-zero crash:\n" +
          "-- SELECT name, price / NULLIF(discount_price, 0) FROM products;"
      }
    ]
  },
  {
    title: "What is the difference between a primary key and a unique constraint?",
    description:
      "Compare PK and UNIQUE.\n\n" +
      "Here is the schema for our `users` table:\n" +
      "```sql\n" +
      "CREATE TABLE users (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  username VARCHAR(50),\n" +
      "  email VARCHAR(50) UNIQUE\n" +
      ");\n" +
      "INSERT INTO users VALUES (1, 'alice', 'alice@example.com');\n" +
      "INSERT INTO users VALUES (2, 'bob', 'bob@example.com');\n" +
      "```",
    answer:
      "## Primary Key vs. Unique Constraint\n\n" +
      "Both constraints guarantee uniqueness for values in a column (or set of columns), but differ in structural behaviors:\n\n" +
      "| Feature | Primary Key | Unique Constraint |\n" +
      "|---|---|---|\n" +
      "| **Nullability** | Cannot contain `NULL` | Can contain `NULL` (usually one or more depending on DB) |\n" +
      "| **Quantity** | Max **one** per table | Can define **multiple** unique columns per table |\n" +
      "| **Index Type** | Defaults to **Clustered Index** | Defaults to **Non-Clustered Index** |\n" +
      "| **Relation Link** | Ideal target for Foreign Keys | Can be referenced by foreign keys but rarely preferred |\n" +
      "\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 180' role='img' aria-label='Clustered Primary Key vs Non-Clustered Unique index paths'>" +
      "<!-- Clustered Primary Key -->" +
      "<g transform='translate(15, 20)'>" +
      "  <rect class='d-box' x='0' y='0' width='210' height='140' rx='5'/>" +
      "  <text class='d-sub' x='105' y='20' text-anchor='middle' font-weight='bold'>Primary Key (Clustered)</text>" +
      "  <rect class='d-box-accent' x='20' y='45' width='170' height='75' rx='4'/>" +
      "  <text class='d-accent d-text' x='105' y='75' text-anchor='middle' font-weight='bold'>Clustered Index B-Tree</text>" +
      "  <text class='d-accent d-text' x='105' y='95' text-anchor='middle' font-size='8' fill-opacity='0.8'>Leaf nodes contain actual table data</text>" +
      "</g>" +
      "<!-- Non-Clustered UNIQUE -->" +
      "<g transform='translate(255, 20)'>" +
      "  <rect class='d-box' x='0' y='0' width='210' height='140' rx='5'/>" +
      "  <text class='d-sub' x='105' y='20' text-anchor='middle' font-weight='bold'>Unique Constraint</text>" +
      "  <rect class='d-box' x='20' y='45' width='170' height='75' rx='4'/>" +
      "  <text class='d-sub' x='105' y='75' text-anchor='middle' font-weight='bold'>Unique Index B-Tree</text>" +
      "  <text class='d-sub' x='105' y='95' text-anchor='middle' font-size='8' fill-opacity='0.8'>Pointers redirect back to PK data block</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### Selection Guidelines\n" +
      "- **Primary Key:** Represents the core identity of the record (e.g. `user_id`, `order_id`). It is used to establish relationships with foreign keys.\n" +
      "- **Unique Constraint:** Identifies alternate unique fields that are not the primary identifier (e.g. `email`, `ssn`, `license_plate`).\n\n" +
      "**Interview tip:** Note that while standard SQL allows multiple `NULL` values inside a column with a `UNIQUE` constraint, Microsoft SQL Server permits only **one** `NULL` row before raising a uniqueness violation.",
    examples: [
      {
        label: "Unique Constraints Playground",
        tech: "sql",
        code:
          "-- 1. Fails: violating unique constraint on email:\n" +
          "-- INSERT INTO users VALUES (3, 'charlie', 'alice@example.com');\n\n" +
          "-- 2. Valid unique lookup:\n" +
          "SELECT * FROM users WHERE email = 'bob@example.com';"
      }
    ]
  },
  {
    title: "What is a CHECK constraint?",
    description:
      "Explain CHECK.\n\n" +
      "Here is the schema for our `products` table:\n" +
      "```sql\n" +
      "CREATE TABLE products (\n" +
      "  id INT PRIMARY KEY, \n" +
      "  name VARCHAR(50),\n" +
      "  price INT CHECK (price >= 0),\n" +
      "  status VARCHAR(20) CHECK (status IN ('active', 'inactive'))\n" +
      ");\n" +
      "INSERT INTO products VALUES (1, 'Book', 15, 'active');\n" +
      "```",
    answer:
      "## CHECK Constraints\n\n" +
      "A `CHECK` constraint enforces domain integrity by validating values before they are written to a column. If a query tries to write a value that evaluates to `FALSE`, the database rejects the statement and raises a constraint violation error:\n\n" +
      "### Common Formats\n" +
      "- **Range checks:** `CHECK (age >= 18)`\n" +
      "- **Format pattern checks:** `CHECK (email LIKE '%@%')`\n" +
      "- **In-list options checks:** `CHECK (status IN ('active', 'inactive'))`\n" +
      "- **Multi-column check constraints:** `CHECK (sale_price < original_price)`\n" +
      "\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 150' role='img' aria-label='CHECK constraint validation gate'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- Input Transaction -->" +
      "<rect class='d-box' x='15' y='35' width='100' height='40' rx='5'/>" +
      "<text class='d-sub' x='65' y='52' text-anchor='middle' font-size='9' font-weight='bold'>INSERT Product</text>" +
      "<text class='d-sub' x='65' y='65' text-anchor='middle' font-size='8' fill-opacity='0.7'>(price = -5)</text>" +
      "<!-- Validation Flow -->" +
      "<line class='d-edge' x1='120' y1='55' x2='170' y2='55' marker-end='url(#arrow)'/>" +
      "<!-- CHECK constraint validator gate -->" +
      "<rect class='d-box-accent' x='180' y='35' width='120' height='40' rx='5'/>" +
      "<text class='d-accent d-text' x='240' y='52' text-anchor='middle' font-size='9' font-weight='bold'>CHECK (price &gt;= 0)</text>" +
      "<text class='d-accent d-text' x='240' y='65' text-anchor='middle' font-size='8' fill-opacity='0.7'>Evaluates: False</text>" +
      "<!-- Rejection path -->" +
      "<line class='d-edge' x1='310' y1='55' x2='360' y2='55' marker-end='url(#arrow)'/>" +
      "<rect class='d-box-muted' x='370' y='35' width='100' height='40' rx='5'/>" +
      "<text class='d-sub' x='420' y='52' text-anchor='middle' font-size='9' font-weight='bold'>Transaction</text>" +
      "<text class='d-sub' x='420' y='65' text-anchor='middle' font-size='8' fill-opacity='0.7'>REJECTED</text>" +
      "</svg>\n\n" +
      "### Integrity Trade-offs\n" +
      "- **Advantages:** Guarantees data integrity directly at the storage level, protecting against bugs in application code.\n" +
      "- **Disadvantages:** Placing complex business logic in the database can make schema updates more rigid.\n\n" +
      "**Interview tip:** Explain that check constraints ignore `NULL` values. If a column is nullable, a check constraint like `CHECK (price >= 0)` will permit a `NULL` price to be written. To prevent this, always pair `CHECK` with a `NOT NULL` constraint.",
    examples: [
      {
        label: "CHECK Constraints Playground",
        tech: "sql",
        code:
          "-- 1. Fails: price check constraint (price >= 0) violated:\n" +
          "-- INSERT INTO products VALUES (2, 'Toy', -5, 'active');\n\n" +
          "-- 2. Fails: status check constraint violated:\n" +
          "-- INSERT INTO products VALUES (3, 'Pen', 2, 'pending');\n\n" +
          "-- 3. Valid insertion:\n" +
          "SELECT * FROM products;"
      }
    ]
  },
  {
    title: "How do recursive CTEs work?",
    description:
      "Explain recursive CTEs.\n\n" +
      "Here is the schema for our `org_structure` table:\n" +
      "```sql\n" +
      "CREATE TABLE org_structure (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  name VARCHAR(50),\n" +
      "  manager_id INT\n" +
      ");\n" +
      "INSERT INTO org_structure VALUES (1, 'Alice', NULL);\n" +
      "INSERT INTO org_structure VALUES (2, 'Bob', 1);\n" +
      "INSERT INTO org_structure VALUES (3, 'Charlie', 2);\n" +
      "INSERT INTO org_structure VALUES (4, 'David', 3);\n" +
      "```",
    answer:
      "## Recursive CTEs\n\n" +
      "A recursive Common Table Expression (CTE) is a query that references its own expression name to traverse hierarchical trees or graph networks. It executes iteratively in three key phases:\n\n" +
      "1. **Anchor Member:** Evaluates the base starting query block (e.g. locating the CEO root node) to populate the initial recursion stack.\n" +
      "2. **Recursive Member:** Joins the CTE with the anchor table to extract child rows. This query is executed repeatedly, referencing the results of the previous iteration.\n" +
      "3. **Termination Check:** The execution loop stops automatically the moment an iteration yields an empty result set (no more child nodes found).\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 180' role='img' aria-label='Recursive query execution loop paths'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- Anchor Member -->" +
      "<rect class='d-box-accent' x='15' y='65' width='110' height='40' rx='5'/>" +
      "<text class='d-accent d-text' x='70' y='85' text-anchor='middle' font-weight='bold'>Anchor: Level 1</text>" +
      "<text class='d-accent d-text' x='70' y='97' text-anchor='middle' font-size='8' fill-opacity='0.8'>Alice (CEO)</text>" +
      "<line class='d-edge' x1='130' y1='85' x2='175' y2='85' marker-end='url(#arrow)'/>" +
      "<!-- Recursion Loop -->" +
      "<g transform='translate(190, 45)'>" +
      "  <rect class='d-box' x='0' y='0' width='130' height='80' rx='5'/>" +
      "  <text class='d-sub' x='65' y='25' text-anchor='middle' font-weight='bold'>Recursive Member</text>" +
      "  <text class='d-sub' x='65' y='45' text-anchor='middle' font-size='8'>Iterate Level N + 1</text>" +
      "  <text class='d-sub' x='65' y='65' text-anchor='middle' font-size='8'>Join children to parent IDs</text>" +
      "</g>" +
      "<!-- Loop back arrow -->" +
      "<path d='M255,45 Q255,10 215,45' fill='none' class='d-edge' marker-end='url(#arrow)' stroke-dasharray='2,2'/>" +
      "<line class='d-edge' x1='325' y1='85' x2='370' y2='85' marker-end='url(#arrow)'/>" +
      "<!-- Termination -->" +
      "<g transform='translate(385, 65)'>" +
      "  <rect class='d-box-muted' x='0' y='0' width='80' height='40' rx='5'/>" +
      "  <text class='d-sub' x='40' y='20' text-anchor='middle' font-size='9' font-weight='bold'>Empty Set</text>" +
      "  <text class='d-sub' x='40' y='32' text-anchor='middle' font-size='7' fill-opacity='0.7'>Loop Ends</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### Common Syntax Template\n" +
      "```sql\n" +
      "WITH RECURSIVE hierarchy_cte AS (\n" +
      "  -- Anchor Member\n" +
      "  SELECT id, manager_id, name, 1 AS level\n" +
      "  FROM org_structure\n" +
      "  WHERE manager_id IS NULL\n" +
      "  \n" +
      "  UNION ALL\n" +
      "  \n" +
      "  -- Recursive Member (referencing hierarchy_cte)\n" +
      "  SELECT e.id, e.manager_id, e.name, h.level + 1\n" +
      "  FROM org_structure e\n" +
      "  INNER JOIN hierarchy_cte h ON e.manager_id = h.id\n" +
      ")\n" +
      "SELECT * FROM hierarchy_cte;\n" +
      "```\n\n" +
      "**Interview tip:** Explain that you must use `UNION ALL` inside recursive CTEs rather than `UNION` in most SQL engines, because deduplicating path sets on every iteration adds significant execution overhead.",
    examples: [
      {
        label: "Recursive CTE Playground",
        tech: "sql",
        code:
          "-- Compile organization hierarchy reporting levels and path nodes:\n" +
          "WITH RECURSIVE org_hierarchy AS (\n" +
          "  -- 1. Anchor member (starts with Alice/CEO)\n" +
          "  SELECT id, name, manager_id, 1 AS level, CAST(name AS TEXT) as path\n" +
          "  FROM org_structure\n" +
          "  WHERE manager_id IS NULL\n" +
          "  \n" +
          "  UNION ALL\n" +
          "  \n" +
          "  -- 2. Recursive member\n" +
          "  SELECT e.id, e.name, e.manager_id, h.level + 1, h.path || ' -> ' || e.name\n" +
          "  FROM org_structure e\n" +
          "  INNER JOIN org_hierarchy h ON e.manager_id = h.id\n" +
          ")\n" +
          "SELECT * FROM org_hierarchy;"
      }
    ]
  }
];

export default augments;
