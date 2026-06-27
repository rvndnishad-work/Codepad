import type { SqlAugment } from "./sql-augments.types";

const augments: SqlAugment[] = [
  {
    title: "How does GROUP BY work with aggregate functions?",
    description:
      "Explain grouping and aggregates.\n\n" +
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
      "INSERT INTO sales VALUES (4, 'Banana', 75);\n" +
      "INSERT INTO sales VALUES (5, 'Apple', 200);\n" +
      "```",
    answer:
      "## Logical Grouping & Aggregation\n\n" +
      "The `GROUP BY` clause partition table rows into logical subsets (groups) sharing identical values for the grouped columns. Then, **aggregate functions** (like `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`) compute a single summary value across all rows within each subset:\n\n" +
      "| Phase | Action | Operation Description |\n" +
      "|---|---|---|\n" +
      "| **1. Partitioning** | Sorting/Hashing | Rows are grouped together based on key column values. |\n" +
      "| **2. Accumulating** | Evaluating | Aggregate functions scan and compile values inside each partition. |\n" +
      "| **3. Collapsing** | Reducing | The engine outputs exactly **one row per group**, discarding individual raw rows. |\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 180' role='img' aria-label='GROUP BY collapsing rows aggregation diagram'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- Input rows block -->" +
      "<g transform='translate(10, 20)'>" +
      "  <rect class='d-box' x='0' y='0' width='110' height='140' rx='5'/>" +
      "  <text class='d-sub' x='55' y='20' text-anchor='middle' font-weight='bold'>Input Rows</text>" +
      "  <text class='d-sub' x='15' y='50' font-size='9'>Apple: 100</text>" +
      "  <text class='d-sub' x='15' y='70' font-size='9'>Apple: 150</text>" +
      "  <text class='d-sub' x='15' y='90' font-size='9'>Banana: 50</text>" +
      "  <text class='d-sub' x='15' y='110' font-size='9'>Apple: 200</text>" +
      "</g>" +
      "<!-- GROUP BY hashing / partition lines -->" +
      "<line class='d-edge' x1='130' y1='60' x2='180' y2='50' marker-end='url(#arrow)'/>" +
      "<line class='d-edge' x1='130' y1='100' x2='180' y2='120' marker-end='url(#arrow)'/>" +
      "<!-- Intermediate Grouped buckets -->" +
      "<g transform='translate(200, 10)'>" +
      "  <rect class='d-box' x='0' y='10' width='100' height='60' rx='4'/>" +
      "  <text class='d-sub' x='50' y='25' text-anchor='middle' font-weight='bold' font-size='10'>Apple Group</text>" +
      "  <text class='d-sub' x='10' y='45' font-size='8'>SUM(100+150+200)</text>" +
      "  <rect class='d-box' x='0' y='80' width='100' height='60' rx='4'/>" +
      "  <text class='d-sub' x='50' y='95' text-anchor='middle' font-weight='bold' font-size='10'>Banana Group</text>" +
      "  <text class='d-sub' x='10' y='115' font-size='8'>SUM(50+75)</text>" +
      "</g>" +
      "<!-- Aggregated outputs -->" +
      "<line class='d-edge' x1='310' y1='40' x2='350' y2='60' marker-end='url(#arrow)'/>" +
      "<line class='d-edge' x1='310' y1='110' x2='350' y2='100' marker-end='url(#arrow)'/>" +
      "<g transform='translate(360, 40)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='110' height='80' rx='5'/>" +
      "  <text class='d-accent d-text' x='55' y='20' text-anchor='middle' font-weight='bold'>Output</text>" +
      "  <text class='d-sub' x='15' y='45' font-size='9' font-weight='bold'>Apple: 450</text>" +
      "  <text class='d-sub' x='15' y='65' font-size='9' font-weight='bold'>Banana: 125</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### Syntactic Constraints\n" +
      "- **Non-Aggregated Columns:** When a query uses `GROUP BY`, every non-aggregated column in the `SELECT` list **must** be explicitly named inside the `GROUP BY` clause. Failing to do this causes a compilation syntax error in standard SQL (like PostgreSQL), because the engine cannot determine *which* representative raw row values to pick for the unmatched fields.\n" +
      "- **WHERE vs HAVING:** `WHERE` pre-filters rows before groupings are compiled, whereas `HAVING` filters group rows after they are computed.\n\n" +
      "**Interview tip:** Mention that databases perform groupings using either **Hash Aggregate** (creating an in-memory hash table, fast for small-to-medium keys) or **Sort Aggregate** (sorting rows by key columns, fast when the columns are already indexed).",
    examples: [
      {
        label: "GROUP BY Playground",
        tech: "sql",
        code:
          "-- Compile product order counts and total sales amount:\n" +
          "SELECT \n" +
          "  product, \n" +
          "  COUNT(*) AS orders_count, \n" +
          "  SUM(amount) AS total_sales\n" +
          "FROM sales\n" +
          "GROUP BY product;"
      }
    ]
  },
  {
    title: "What is a subquery and what is a correlated subquery?",
    description:
      "Explain subqueries.\n\n" +
      "Here is the schema for our `employees` table:\n" +
      "```sql\n" +
      "CREATE TABLE employees (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  name VARCHAR(50),\n" +
      "  department VARCHAR(50),\n" +
      "  salary INT\n" +
      ");\n" +
      "INSERT INTO employees VALUES (1, 'Alice', 'Engineering', 90000);\n" +
      "INSERT INTO employees VALUES (2, 'Bob', 'Engineering', 80000);\n" +
      "INSERT INTO employees VALUES (3, 'Charlie', 'Sales', 70000);\n" +
      "INSERT INTO employees VALUES (4, 'David', 'Sales', 75000);\n" +
      "```",
    answer:
      "## Independent vs. Correlated Subqueries\n\n" +
      "A subquery is a nested query block inside an outer SQL statement. Subqueries fall into two logical categories:\n\n" +
      "1. **Independent Subquery (Nested):** Evaluates **exactly once** before the outer query runs. The result is passed as a static literal value/list to the outer query. Runs in $O(M + N)$ time.\n" +
      "2. **Correlated Subquery:** References columns from the outer query block. It behaves like an **inner loop** in programming, evaluating **once for every single row** evaluated by the outer query. Runs in $O(M \\times N)$ time.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 160' role='img' aria-label='Correlated subquery nested loops execution flow'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- Outer query loop -->" +
      "<rect class='d-box-accent' x='15' y='25' width='140' height='100' rx='5'/>" +
      "<text class='d-accent d-text' x='85' y='45' text-anchor='middle' font-weight='bold'>Outer Query Loop</text>" +
      "<text class='d-sub' x='30' y='75' font-size='9'>For each Employee e1</text>" +
      "<text class='d-sub' x='30' y='95' font-size='9' fill-opacity='0.7'>ID, Salary, Dept</text>" +
      "<!-- Evaluation Arrow -->" +
      "<line class='d-edge' x1='165' y1='75' x2='295' y2='75' marker-end='url(#arrow)'/>" +
      "<text class='d-sub' x='230' y='65' text-anchor='middle' font-size='9'>Ref Outer Dept</text>" +
      "<!-- Inner correlated query -->" +
      "<rect class='d-box' x='310' y='25' width='150' height='100' rx='5'/>" +
      "<text class='d-sub' x='385' y='45' text-anchor='middle' font-weight='bold'>Nested Subquery</text>" +
      "<text class='d-sub' x='325' y='75' font-size='9'>Compute AVG(salary)</text>" +
      "<text class='d-sub' x='325' y='95' font-size='9'>where e2.dept = e1.dept</text>" +
      "<!-- Back arrow -->" +
      "<path d='M310,105 Q230,125 165,105' fill='none' class='d-edge' marker-end='url(#arrow)'/>" +
      "</svg>\n\n" +
      "### Comparison Summary\n" +
      "| Attribute | Independent Subquery | Correlated Subquery |\n" +
      "|---|---|---|\n" +
      "| **Execution** | Runs once initially | Runs once per outer query row |\n" +
      "| **Complexity** | $O(M + N)$ | $O(M \\times N)$ (worst-case without indexes) |\n" +
      "| **Scope Link** | Self-contained | References tables in outer clauses |\n" +
      "| **Common Use** | IN lists, SELECT constants | EXISTS, conditional aggregates per group |\n\n" +
      "**Interview tip:** While correlated queries are useful, they can cause major latency spikes on large datasets. Always mention that you can often refactor correlated subqueries into `INNER JOIN`s or CTEs with window functions, allowing the database engine to perform efficient hash/merge joins instead of nested loops.",
    examples: [
      {
        label: "Subqueries Playground",
        tech: "sql",
        code:
          "-- Find employees who earn more than their department's average salary:\n" +
          "SELECT \n" +
          "  name, \n" +
          "  department, \n" +
          "  salary\n" +
          "FROM employees e1\n" +
          "WHERE salary > (\n" +
          "  SELECT AVG(salary)\n" +
          "  FROM employees e2\n" +
          "  WHERE e2.department = e1.department\n" +
          ");"
      }
    ]
  },
  {
    title: "What are window functions?",
    description:
      "Explain window functions.\n\n" +
      "Here is the schema for our `employees` table:\n" +
      "```sql\n" +
      "CREATE TABLE employees (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  name VARCHAR(50),\n" +
      "  department VARCHAR(50),\n" +
      "  salary INT\n" +
      ");\n" +
      "INSERT INTO employees VALUES (1, 'Alice', 'Engineering', 90000);\n" +
      "INSERT INTO employees VALUES (2, 'Bob', 'Engineering', 80000);\n" +
      "INSERT INTO employees VALUES (3, 'Charlie', 'Sales', 70000);\n" +
      "INSERT INTO employees VALUES (4, 'David', 'Sales', 75000);\n" +
      "```",
    answer:
      "## Window Functions\n\n" +
      "Window functions perform calculations across a set of table rows that are related to the current query row. Unlike `GROUP BY` operations, window functions **do not collapse** individual rows into groups; they append calculated aggregated summaries alongside each original detail row:\n\n" +
      "### Syntax Syntax\n" +
      "```sql\n" +
      "FUNCTION() OVER (\n" +
      "  PARTITION BY partition_col\n" +
      "  ORDER BY sort_col\n" +
      "  ROWS BETWEEN 1 PRECEDING AND CURRENT ROW\n" +
      ")\n" +
      "```\n\n" +
      "- **`PARTITION BY`:** Segregates rows into buckets (partitions).\n" +
      "- **`ORDER BY`:** Establishes the calculation sequence inside each partition.\n" +
      "- **`ROWS/RANGE` (Frame):** Restricts the window boundary relative to the current row.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 180' role='img' aria-label='Window function partition and frame visualizer'>" +
      "<!-- Partition 1: Eng -->" +
      "<rect class='d-box' x='10' y='20' width='460' height='65' rx='5'/>" +
      "<text class='d-sub' x='20' y='35' font-weight='bold' font-size='10'>PARTITION BY department (Engineering)</text>" +
      "<g transform='translate(20, 45)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='160' height='30' rx='3'/>" +
      "  <text class='d-accent d-text' x='10' y='18' font-size='9'>Alice | Sal: 90k | SUM: 170k</text>" +
      "  <rect class='d-box-muted' x='180' y='0' width='160' height='30' rx='3'/>" +
      "  <text class='d-sub' x='190' y='18' font-size='9'>Bob | Sal: 80k | SUM: 80k</text>" +
      "  <text class='d-sub' x='355' y='18' font-size='8' fill-opacity='0.7'>Ordered by Salary</text>" +
      "</g>" +
      "<!-- Partition 2: Sales -->" +
      "<rect class='d-box' x='10' y='95' width='460' height='65' rx='5'/>" +
      "<text class='d-sub' x='20' y='110' font-weight='bold' font-size='10'>PARTITION BY department (Sales)</text>" +
      "<g transform='translate(20, 120)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='160' height='30' rx='3'/>" +
      "  <text class='d-accent d-text' x='10' y='18' font-size='9'>David | Sal: 75k | SUM: 145k</text>" +
      "  <rect class='d-box-muted' x='180' y='0' width='160' height='30' rx='3'/>" +
      "  <text class='d-sub' x='190' y='18' font-size='9'>Charlie | Sal: 70k | SUM: 70k</text>" +
      "  <text class='d-sub' x='355' y='18' font-size='8' fill-opacity='0.7'>Ordered by Salary</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### Common Window functions\n" +
      "- **Aggregate:** `SUM()`, `AVG()`, `COUNT()`, `MIN()`, `MAX()` computes running totals.\n" +
      "- **Ranking:** `ROW_NUMBER()`, `RANK()`, `DENSE_RANK()` generates list indexing.\n" +
      "- **Value:** `LAG()`, `LEAD()`, `FIRST_VALUE()`, `LAST_VALUE()` accesses sibling rows relative to current indexes.\n\n" +
      "**Interview tip:** Explain that window functions run during the final stages of execution (specifically after `HAVING` and before `DISTINCT`), meaning you cannot place window clauses inside the `WHERE` filter. To filter rows based on window results (e.g. finding top-ranked items), you must wrap the query inside a CTE or subquery.",
    examples: [
      {
        label: "Window Functions Playground",
        tech: "sql",
        code:
          "-- Compute running department totals and rank employees by salary:\n" +
          "SELECT \n" +
          "  name, \n" +
          "  department, \n" +
          "  salary,\n" +
          "  SUM(salary) OVER (\n" +
          "    PARTITION BY department \n" +
          "    ORDER BY salary ASC\n" +
          "  ) AS running_dept_total,\n" +
          "  RANK() OVER (\n" +
          "    PARTITION BY department \n" +
          "    ORDER BY salary DESC\n" +
          "  ) AS dept_salary_rank\n" +
          "FROM employees;"
      }
    ]
  },
  {
    title: "What is the difference between DELETE, TRUNCATE, and DROP?",
    description:
      "Compare DELETE, TRUNCATE, and DROP.\n\n" +
      "Here is the schema for our `temp_logs` table:\n" +
      "```sql\n" +
      "CREATE TABLE temp_logs (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  message TEXT\n" +
      ");\n" +
      "INSERT INTO temp_logs VALUES (1, 'Init log');\n" +
      "INSERT INTO temp_logs VALUES (2, 'Error log');\n" +
      "```",
    answer:
      "## DELETE vs. TRUNCATE vs. DROP\n\n" +
      "These commands clear database records, but differ significantly in execution mechanisms, transaction safety, and structural impact:\n\n" +
      "| Operation | Command Type | Log Activity | Transaction rollback | Speed |\n" +
      "|---|---|---|---|---|\n" +
      "| **`DELETE`** | DML (Data Manipulation) | Row-by-row logging | Allowed (Fully transaction safe) | Slow |\n" +
      "| **`TRUNCATE`** | DDL (Data Definition) | Deallocates data pages | Database-dependent (Allowed in Postgres/SQL Server) | Fast |\n" +
      "| **`DROP`** | DDL (Data Definition) | Removes schema & files | Database-dependent (Allowed in Postgres) | Instant |\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 180' role='img' aria-label='DELETE vs TRUNCATE vs DROP storage layout'>" +
      "<!-- DELETE visual -->" +
      "<g transform='translate(10, 20)'>" +
      "  <rect class='d-box' x='0' y='0' width='140' height='130' rx='5'/>" +
      "  <text class='d-sub' x='70' y='20' text-anchor='middle' font-weight='bold'>DELETE FROM</text>" +
      "  <rect class='d-box-muted' x='10' y='35' width='120' height='20' rx='3'/>" +
      "  <text class='d-sub' x='70' y='48' text-anchor='middle' font-size='8' text-decoration='line-through'>Row 1 (Logged)</text>" +
      "  <rect class='d-box-accent' x='10' y='65' width='120' height='20' rx='3'/>" +
      "  <text class='d-accent d-text' x='70' y='78' text-anchor='middle' font-size='8'>Row 2 (Retained)</text>" +
      "  <text class='d-sub' x='70' y='110' text-anchor='middle' font-size='8' fill-opacity='0.7'>Keeps table structure</text>" +
      "</g>" +
      "<!-- TRUNCATE visual -->" +
      "<g transform='translate(170, 20)'>" +
      "  <rect class='d-box' x='0' y='0' width='140' height='130' rx='5'/>" +
      "  <text class='d-sub' x='70' y='20' text-anchor='middle' font-weight='bold'>TRUNCATE TABLE</text>" +
      "  <rect class='d-box-muted' x='10' y='45' width='120' height='40' rx='3' stroke-dasharray='3,3'/>" +
      "  <text class='d-sub' x='70' y='68' text-anchor='middle' font-size='9'>Pages Deallocated</text>" +
      "  <text class='d-sub' x='70' y='110' text-anchor='middle' font-size='8' fill-opacity='0.7'>Keeps empty table schema</text>" +
      "</g>" +
      "<!-- DROP visual -->" +
      "<g transform='translate(330, 20)'>" +
      "  <rect class='d-box-muted' x='0' y='0' width='140' height='130' rx='5' stroke-dasharray='3,3' fill-opacity='0.5'/>" +
      "  <text class='d-sub' x='70' y='20' text-anchor='middle' font-weight='bold' fill-opacity='0.5'>DROP TABLE</text>" +
      "  <text class='d-sub' x='70' y='70' text-anchor='middle' font-size='10' font-weight='bold'>Schema Deleted</text>" +
      "  <text class='d-sub' x='70' y='110' text-anchor='middle' font-size='8' fill-opacity='0.7'>Removes from catalog</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### Core Distinctions\n" +
      "- **Identity Seed:** `TRUNCATE` resets auto-increment (`IDENTITY` / `SERIAL`) values back to the initial start seed. `DELETE` leaves the counter at its current position.\n" +
      "- **Triggers:** `DELETE` fires all individual row-level database `BEFORE/AFTER DELETE` triggers. `TRUNCATE` and `DROP` bypass trigger loops entirely because they operate on storage allocations, not rows.\n" +
      "- **Locks:** `DELETE` acquires individual row/range locks. `TRUNCATE` locks the entire table schema structure.\n\n" +
      "**Interview tip:** Point out that `TRUNCATE` is faster because it is a metadata operation: instead of logging every row deletion in the Transaction Log (WAL), it deallocates the table's data pages directly.",
    examples: [
      {
        label: "Delete vs Truncate Playground",
        tech: "sql",
        code:
          "-- 1. Delete a specific row (keeps other rows and structural definition)\n" +
          "DELETE FROM temp_logs WHERE id = 2;\n\n" +
          "SELECT * FROM temp_logs;\n\n" +
          "-- 2. Clean the entire table\n" +
          "-- TRUNCATE TABLE temp_logs; -- (Resets identities)\n" +
          "-- DROP TABLE temp_logs; -- (Deletes table schema)"
      }
    ]
  },
  {
    title: "How do you find the Nth highest salary?",
    description:
      "Explain a common SQL puzzle.\n\n" +
      "Here is the schema for our `employees` table:\n" +
      "```sql\n" +
      "CREATE TABLE employees (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  name VARCHAR(50),\n" +
      "  salary INT\n" +
      ");\n" +
      "INSERT INTO employees VALUES (1, 'Alice', 90000);\n" +
      "INSERT INTO employees VALUES (2, 'Bob', 80000);\n" +
      "INSERT INTO employees VALUES (3, 'Charlie', 80000);\n" +
      "INSERT INTO employees VALUES (4, 'David', 70000);\n" +
      "```",
    answer:
      "## Finding the Nth Highest Salary\n\n" +
      "Finding the Nth highest salary is a classic interview question. The optimal solution depends on how you want to handle duplicate salary values. The SQL standard provides three ranking functions:\n\n" +
      "### Ranking Function Behavior on Duplicate Salaries ($80,000, $80,000, $70,000):\n" +
      "| Function | Behavior | Output Ranks |\n" +
      "|---|---|---|\n" +
      "| **`ROW_NUMBER()`** | Sequential numbers | `1, 2, 3, 4` |\n" +
      "| **`RANK()`** | Leaves gaps after ties | `1, 2, 2, 4` (no rank 3) |\n" +
      "| **`DENSE_RANK()`** | No gaps after ties | `1, 2, 2, 3` (rank 2 covers both tie rows) |\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 160' role='img' aria-label='DENSE_RANK vs RANK behavior comparison'>" +
      "<!-- Header -->" +
      "<text class='d-sub' x='30' y='25' font-weight='bold' font-size='10'>Salary</text>" +
      "<text class='d-sub' x='150' y='25' font-weight='bold' font-size='10'>ROW_NUMBER()</text>" +
      "<text class='d-sub' x='270' y='25' font-weight='bold' font-size='10'>RANK()</text>" +
      "<text class='d-sub' x='380' y='25' font-weight='bold' font-size='10'>DENSE_RANK()</text>" +
      "<!-- Row 1 -->" +
      "<g transform='translate(10, 35)'>" +
      "  <rect class='d-box' x='0' y='0' width='460' height='25' rx='3'/>" +
      "  <text class='d-sub' x='20' y='16' font-size='9'>$90,000 (Alice)</text>" +
      "  <text class='d-sub' x='160' y='16' font-size='9'>1</text>" +
      "  <text class='d-sub' x='270' y='16' font-size='9'>1</text>" +
      "  <text class='d-accent d-text' x='385' y='16' font-size='9' font-weight='bold'>1</text>" +
      "</g>" +
      "<!-- Row 2 -->" +
      "<g transform='translate(10, 65)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='460' height='25' rx='3'/>" +
      "  <text class='d-accent d-text' x='20' y='16' font-size='9'>$80,000 (Bob)</text>" +
      "  <text class='d-sub' x='160' y='16' font-size='9'>2</text>" +
      "  <text class='d-sub' x='270' y='16' font-size='9'>2</text>" +
      "  <text class='d-accent d-text' x='385' y='16' font-size='9' font-weight='bold'>2 (N=2 Output)</text>" +
      "</g>" +
      "<!-- Row 3 -->" +
      "<g transform='translate(10, 95)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='460' height='25' rx='3'/>" +
      "  <text class='d-accent d-text' x='20' y='16' font-size='9'>$80,000 (Charlie)</text>" +
      "  <text class='d-sub' x='160' y='16' font-size='9'>3</text>" +
      "  <text class='d-sub' x='270' y='16' font-size='9'>2</text>" +
      "  <text class='d-accent d-text' x='385' y='16' font-size='9' font-weight='bold'>2 (N=2 Output)</text>" +
      "</g>" +
      "<!-- Row 4 -->" +
      "<g transform='translate(10, 125)'>" +
      "  <rect class='d-box' x='0' y='0' width='460' height='25' rx='3'/>" +
      "  <text class='d-sub' x='20' y='16' font-size='9'>$70,000 (David)</text>" +
      "  <text class='d-sub' x='160' y='16' font-size='9'>4</text>" +
      "  <text class='d-sub' x='270' y='16' font-size='9'>4 (Gap)</text>" +
      "  <text class='d-sub' x='385' y='16' font-size='9'>3</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### Common Approaches\n" +
      "1. **Approach 1: Using `DENSE_RANK()` (Recommended)**\n" +
      "   Correctly handles duplicates so that the second highest unique value is returned even if there is a tie for first:\n" +
      "   ```sql\n" +
      "   WITH SalaryCTE AS (\n" +
      "     SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) as rnk\n" +
      "     FROM employees\n" +
      "   )\n" +
      "   SELECT DISTINCT salary FROM SalaryCTE WHERE rnk = N;\n" +
      "   ```\n" +
      "2. **Approach 2: Using `OFFSET` seek (MySQL/Postgres)**\n" +
      "   Simple syntax, but fails to handle duplicate tie records cleanly unless you use `DISTINCT`:\n" +
      "   ```sql\n" +
      "   SELECT DISTINCT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET N-1;\n" +
      "   ```\n\n" +
      "**Interview tip:** Explain that the `OFFSET` seek solution runs in $O(N \\log N)$ time due to global sorting. Using `DENSE_RANK` with a partition clause is the industry standard for production environments.",
    examples: [
      {
        label: "Nth Salary Playground",
        tech: "sql",
        code:
          "-- Find the second highest salary using DENSE_RANK (should return $80,000):\n" +
          "WITH ranked_salaries AS (\n" +
          "  SELECT \n" +
          "    name, \n" +
          "    salary, \n" +
          "    DENSE_RANK() OVER (ORDER BY salary DESC) as rnk\n" +
          "  FROM employees\n" +
          ")\n" +
          "SELECT name, salary \n" +
          "FROM ranked_salaries \n" +
          "WHERE rnk = 2;"
      }
    ]
  },
  {
    title: "What is a view and a materialized view?",
    description:
      "Compare views.\n\n" +
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
      "## Standard View vs. Materialized View\n\n" +
      "Views simplify complex query pipelines, but differ fundamentally in how their data is queried and stored:\n\n" +
      "- **Standard View:** A virtual table defined by a saved SQL statement. It stores **no data on disk**. When queried, the engine expands the view's definition into the parent query block and runs it on the active dataset.\n" +
      "- **Materialized View:** A physical table on disk that stores the **precompiled results** of the view's query. It speeds up reads for massive aggregations, but must be updated (refreshed) when the underlying table data changes.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 180' role='img' aria-label='Standard View query expansion vs Materialized View disk reads'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- View execution path -->" +
      "<g transform='translate(15, 20)'>" +
      "  <rect class='d-box' x='0' y='0' width='210' height='140' rx='5'/>" +
      "  <text class='d-sub' x='105' y='20' text-anchor='middle' font-weight='bold'>Standard View (Virtual)</text>" +
      "  <text class='d-sub' x='20' y='50' font-size='9'>Query: SELECT * FROM my_view</text>" +
      "  <path d='M20,70 L190,70' class='d-edge' marker-end='url(#arrow)'/>" +
      "  <text class='d-sub' x='105' y='65' text-anchor='middle' font-size='8'>Expands definition at run time</text>" +
      "  <rect class='d-box-accent' x='20' y='95' width='170' height='30' rx='3'/>" +
      "  <text class='d-accent d-text' x='105' y='114' text-anchor='middle' font-size='9'>Scans raw tables on disk</text>" +
      "</g>" +
      "<!-- Materialized View execution path -->" +
      "<g transform='translate(255, 20)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='210' height='140' rx='5'/>" +
      "  <text class='d-accent d-text' x='105' y='20' text-anchor='middle' font-weight='bold'>Materialized View (Cached)</text>" +
      "  <text class='d-sub' x='20' y='50' font-size='9'>Query: SELECT * FROM mat_view</text>" +
      "  <path d='M20,70 L190,70' class='d-edge' marker-end='url(#arrow)'/>" +
      "  <text class='d-sub' x='105' y='65' text-anchor='middle' font-size='8'>Reads precomputed snapshot directly</text>" +
      "  <rect class='d-box' x='20' y='95' width='170' height='30' rx='3'/>" +
      "  <text class='d-sub' x='105' y='114' text-anchor='middle' font-size='9'>Skips joins/aggregates scans</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### Materialized View Updates\n" +
      "Because materialized views store snapshots, they must be refreshed regularly using a command like `REFRESH MATERIALIZED VIEW view_name;`:\n\n" +
      "- **Complete Refresh:** Re-runs the entire query, rebuilding the dataset on disk.\n" +
      "- **Incremental Refresh (Fast):** Updates the view with only the changes detected in the source tables (often implemented via database logs or triggers).\n\n" +
      "**Interview tip:** Explain that standard views provide structural security and abstraction without overhead, while materialized views are a read-cache layer that trades storage space and write synchronization for query performance.",
    examples: [
      {
        label: "Views Playground",
        tech: "sql",
        code:
          "-- 1. Create a virtual standard view:\n" +
          "CREATE VIEW sales_summary AS\n" +
          "SELECT product, SUM(amount) AS total_sales\n" +
          "FROM sales\n" +
          "GROUP BY product;\n\n" +
          "-- 2. Query the view (runs aggregate calculation on sales table):\n" +
          "SELECT * FROM sales_summary;"
      }
    ]
  },
  {
    title: "What is the difference between a clustered and non-clustered index?",
    description:
      "Compare index types.\n\n" +
      "Here is the schema for our `customers` table:\n" +
      "```sql\n" +
      "CREATE TABLE customers (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  name VARCHAR(50),\n" +
      "  city VARCHAR(50)\n" +
      ");\n" +
      "INSERT INTO customers VALUES (1, 'Alice', 'Chicago');\n" +
      "INSERT INTO customers VALUES (2, 'Bob', 'New York');\n" +
      "INSERT INTO customers VALUES (3, 'Charlie', 'Chicago');\n" +
      "```",
    answer:
      "## Clustered vs. Non-Clustered Indexes\n\n" +
      "Indexes use B-Trees to speed up data lookups, but differ in how they organize and reference rows on disk:\n\n" +
      "- **Clustered Index:** The leaf pages of the index contain the **actual table data rows**. This physical storage structure sorts the table data on disk based on the index key. Consequently, a table can have **only one** clustered index (typically on the Primary Key).\n" +
      "- **Non-Clustered Index:** A separate index structure on disk. The leaf pages contain **index keys and pointers** (Row IDs or Clustered Primary Keys) that point back to the actual data location. You can define multiple non-clustered indexes.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 180' role='img' aria-label='Clustered vs Non-Clustered Index structures'>" +
      "<!-- Clustered Index Leaf -->" +
      "<g transform='translate(15, 20)'>" +
      "  <rect class='d-box' x='0' y='0' width='210' height='140' rx='5'/>" +
      "  <text class='d-sub' x='105' y='20' text-anchor='middle' font-weight='bold'>Clustered Index B-Tree</text>" +
      "  <rect class='d-box-accent' x='20' y='45' width='170' height='75' rx='4'/>" +
      "  <text class='d-accent d-text' x='105' y='65' text-anchor='middle' font-weight='bold'>Leaf Node Pages</text>" +
      "  <text class='d-accent d-text' x='105' y='85' text-anchor='middle' font-size='9'>Store actual data rows</text>" +
      "  <text class='d-accent d-text' x='105' y='105' text-anchor='middle' font-size='9' fill-opacity='0.8'>Sorted physically on disk</text>" +
      "</g>" +
      "<!-- Non-Clustered Index Leaf -->" +
      "<g transform='translate(255, 20)'>" +
      "  <rect class='d-box' x='0' y='0' width='210' height='140' rx='5'/>" +
      "  <text class='d-sub' x='105' y='20' text-anchor='middle' font-weight='bold'>Non-Clustered Index</text>" +
      "  <rect class='d-box' x='20' y='45' width='170' height='40' rx='4'/>" +
      "  <text class='d-sub' x='105' y='60' text-anchor='middle' font-weight='bold'>Leaf Node Pages</text>" +
      "  <text class='d-sub' x='105' y='75' text-anchor='middle' font-size='9'>Store Key + Row ID Pointer</text>" +
      "  <!-- Pointer arrow -->" +
      "  <path d='M105,85 L105,105' class='d-edge' fill='none' stroke-dasharray='2,2'/>" +
      "  <rect class='d-box-accent' x='20' y='110' width='170' height='22' rx='3'/>" +
      "  <text class='d-accent d-text' x='105' y='124' text-anchor='middle' font-size='9'>Indirect lookup to clustered table</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### Compare lookup operations\n" +
      "1. **Clustered Seek:** The query engine walks the B-Tree directly to the leaf node page, returning the row in **one logical read**.\n" +
      "2. **Non-Clustered Seek:** The engine finds the matching key in the index B-Tree, retrieves the row ID / Primary Key, and then performs a **Bookmark/Key Lookup** on the clustered index to read the remaining columns (requiring extra database reads).\n\n" +
      "**Interview tip:** Explain that you can optimize non-clustered indexes by using a **Covering Index** (with the `INCLUDE` clause). This appends select data columns directly to the non-clustered index leaf nodes, allowing the query planner to bypass the Key Lookup phase entirely.",
    examples: [
      {
        label: "Clustered vs. Non-Clustered Indexing Playground",
        tech: "sql",
        code:
          "-- 1. Create a non-clustered index on the 'city' column:\n" +
          "CREATE INDEX idx_customers_city ON customers(city);\n\n" +
          "-- 2. Explain the query plan (SQLite WASM planner):\n" +
          "EXPLAIN QUERY PLAN \n" +
          "SELECT * FROM customers \n" +
          "WHERE city = 'Chicago';"
      }
    ]
  },
  {
    title: "How do you paginate efficiently in SQL?",
    description:
      "Explain pagination.\n\n" +
      "Here is the schema for our `customers` table:\n" +
      "```sql\n" +
      "CREATE TABLE customers (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  name VARCHAR(50)\n" +
      ");\n" +
      "INSERT INTO customers VALUES (1, 'Alice');\n" +
      "INSERT INTO customers VALUES (2, 'Bob');\n" +
      "INSERT INTO customers VALUES (3, 'Charlie');\n" +
      "```",
    answer:
      "## Efficient SQL Pagination\n\n" +
      "Paginating datasets is a common frontend design pattern. There are two primary ways to implement it:\n\n" +
      "### 1. Offset Pagination (`LIMIT ... OFFSET ...`)\n" +
      "The query engine scans all rows from the beginning, counts up to the offset value, and discards them before returning the page. On large datasets, page request times degrade exponentially: **$O(N)$ time complexity**.\n" +
      "```sql\n" +
      "SELECT * FROM customers ORDER BY id LIMIT 10 OFFSET 10000; -- Scans 10,010 rows to return 10\n" +
      "```\n\n" +
      "### 2. Keyset Seek Pagination (Seek Method)\n" +
      "The query queries from where the previous page left off using a `WHERE` condition on a sorted indexed column (like `id`). It runs in **$O(\\log N)$ time complexity**, maintaining low latency regardless of page depth.\n" +
      "```sql\n" +
      "SELECT * FROM customers WHERE id > 10000 ORDER BY id LIMIT 10; -- Directly jumps to ID using index\n" +
      "```\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 180' role='img' aria-label='Offset scan vs Seek jump latency'>" +
      "<!-- Offset Scan -->" +
      "<g transform='translate(15, 20)'>" +
      "  <rect class='d-box' x='0' y='0' width='210' height='140' rx='5'/>" +
      "  <text class='d-sub' x='105' y='20' text-anchor='middle' font-weight='bold'>Offset Scan (Slow)</text>" +
      "  <!-- Scan bar representing scanning whole table -->" +
      "  <rect class='d-box-muted' x='20' y='45' width='170' height='20' rx='3'/>" +
      "  <text class='d-sub' x='105' y='58' text-anchor='middle' font-size='8'>Scans & Discards (O(N) Scans)</text>" +
      "  <line x1='20' y1='85' x2='175' y2='85' stroke='currentColor' stroke-width='2' stroke-dasharray='1,2'/>" +
      "  <rect class='d-box-accent' x='140' y='95' width='50' height='25' rx='3'/>" +
      "  <text class='d-accent d-text' x='165' y='111' text-anchor='middle' font-size='8'>Page N</text>" +
      "</g>" +
      "<!-- Keyset Seek -->" +
      "<g transform='translate(255, 20)'>" +
      "  <rect class='d-box-accent' x='0' y='0' width='210' height='140' rx='5'/>" +
      "  <text class='d-accent d-text' x='105' y='20' text-anchor='middle' font-weight='bold'>Keyset Seek (Fast)</text>" +
      "  <rect class='d-box-muted' x='20' y='45' width='70' height='20' rx='3' fill-opacity='0.4'/>" +
      "  <text class='d-sub' x='55' y='58' text-anchor='middle' font-size='8'>Skipped (Index)</text>" +
      "  <!-- Arrow jumping -->" +
      "  <path d='M95,55 Q130,45 145,90' fill='none' class='d-edge' stroke-width='2' stroke='var(--accent)'/>" +
      "  <rect class='d-box-accent' x='125' y='95' width='65' height='25' rx='3'/>" +
      "  <text class='d-accent d-text' x='157' y='111' text-anchor='middle' font-size='8'>Target Page</text>" +
      "  <text class='d-accent d-text' x='105' y='133' text-anchor='middle' font-size='7'>Direct O(log N) Jump</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### Comparison Summary\n" +
      "| Metric | Offset Pagination | Keyset / Seek Pagination |\n" +
      "|---|---|---|\n" +
      "| **Time Complexity** | $O(N)$ (slows down for deep pages) | $O(\\log N)$ (consistently fast) |\n" +
      "| **Drifting Records** | Can return duplicates if rows are inserted/deleted | Immune to pagination duplication drift |\n" +
      "| **Arbitrary Jumps** | Easy to jump directly to page `N` | Difficult (must seek sequentially via keys) |\n\n" +
      "**Interview tip:** Explain that while Offset pagination is simple to write and supports arbitrary page jumps (e.g. clicking Page 20), seek pagination is the gold standard for infinite scroll APIs (like Twitter or Instagram) because it performs consistently and doesn't duplicate records if rows are added or removed during browsing.",
    examples: [
      {
        label: "Pagination Playground",
        tech: "sql",
        code:
          "-- 1. Offset Pagination (returns row 2 by skipping row 1):\n" +
          "SELECT * FROM customers \n" +
          "ORDER BY id \n" +
          "LIMIT 1 OFFSET 1;\n\n" +
          "-- 2. Keyset Seek Pagination (replaces offset, starting from id > 1):\n" +
          "SELECT * FROM customers \n" +
          "WHERE id > 1 \n" +
          "ORDER BY id \n" +
          "LIMIT 1;"
      }
    ]
  },
  {
    title: "What are COMMIT, ROLLBACK, and SAVEPOINT?",
    description:
      "Explain transaction control.\n\n" +
      "Here is the schema for our `accounts` table:\n" +
      "```sql\n" +
      "CREATE TABLE accounts ( \n" +
      "  id INT PRIMARY KEY,\n" +
      "  name VARCHAR(50),\n" +
      "  balance INT\n" +
      ");\n" +
      "INSERT INTO accounts VALUES (1, 'Alice', 1000);\n" +
      "```",
    answer:
      "## Transaction Control Commands\n\n" +
      "Transactions group database queries into single logical blocks. Transaction controls let you save or undo changes to maintain database consistency:\n\n" +
      "- **`COMMIT`:** Saves all transaction modifications permanently to disk, updates the Write-Ahead Log (WAL), and releases transaction locks.\n" +
      "- **`ROLLBACK`:** Reverts all modifications made during the active transaction block, restoring the database back to its pre-transaction state.\n" +
      "- **`SAVEPOINT`:** Establishes a temporary checkpoint inside the active transaction block. This allows you to roll back a subset of query changes (via `ROLLBACK TO savepoint_name`) without aborting the entire transaction.\n" +
      "\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 180' role='img' aria-label='Transaction timeline with SAVEPOINT and ROLLBACK checkpoints'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<!-- Timeline line -->" +
      "<line x1='20' y1='80' x2='440' y2='80' stroke='currentColor' stroke-width='2' marker-end='url(#arrow)'/>" +
      "<!-- Commit point -->" +
      "<circle cx='400' cy='80' r='5' class='d-box-accent'/>" +
      "<text class='d-sub' x='400' y='65' text-anchor='middle' font-size='9'>COMMIT</text>" +
      "<!-- Active transaction states -->" +
      "<g transform='translate(40, 60)'>" +
      "  <rect class='d-box' x='0' y='0' width='80' height='40' rx='4'/>" +
      "  <text class='d-sub' x='40' y='18' text-anchor='middle' font-size='8' font-weight='bold'>BEGIN</text>" +
      "  <text class='d-sub' x='40' y='32' text-anchor='middle' font-size='7' fill-opacity='0.8'>Debit $100</text>" +
      "</g>" +
      "<!-- Savepoint 1 -->" +
      "<circle cx='170' cy='80' r='5' class='d-box-accent'/>" +
      "<text class='d-sub' x='170' y='65' text-anchor='middle' font-size='9'>SAVEPOINT sp1</text>" +
      "<g transform='translate(200, 60)'>" +
      "  <rect class='d-box' x='0' y='0' width='80' height='40' rx='4'/>" +
      "  <text class='d-sub' x='40' y='18' text-anchor='middle' font-size='8' font-weight='bold'>Update Row</text>" +
      "  <text class='d-sub' x='40' y='32' text-anchor='middle' font-size='7' fill-opacity='0.8'>Debit $200</text>" +
      "</g>" +
      "<!-- Rollback path -->" +
      "<path d='M280,110 Q225,140 170,95' fill='none' class='d-edge' stroke-width='2' marker-end='url(#arrow)' stroke-dasharray='2,2'/>" +
      "<text class='d-sub' x='225' y='145' text-anchor='middle' font-size='8'>ROLLBACK TO sp1</text>" +
      "</svg>\n\n" +
      "### Common Transaction Flow\n" +
      "```sql\n" +
      "BEGIN TRANSACTION;\n" +
      "UPDATE accounts SET balance = balance - 100 WHERE id = 1;\n" +
      "SAVEPOINT sp1;\n" +
      "UPDATE accounts SET balance = balance - 500 WHERE id = 2; -- High risk query\n" +
      "-- If balance drops below zero, roll back to checkpoint:\n" +
      "ROLLBACK TO sp1;\n" +
      "COMMIT; -- Saves $100 debit, ignores $500 debit\n" +
      "```\n\n" +
      "**Interview tip:** Explain that savepoints are fully transactional and do not save changes to disk immediately. If you run a global `ROLLBACK` statement, it reverts the entire transaction, including all queries preceding the active savepoint markers.",
    examples: [
      {
        label: "Transaction Control Playground",
        tech: "sql",
        code:
          "-- 1. Start a transaction block:\n" +
          "BEGIN TRANSACTION;\n" +
          "UPDATE accounts SET balance = balance - 100 WHERE id = 1;\n\n" +
          "-- 2. Establish a savepoint marker:\n" +
          "SAVEPOINT sp1;\n" +
          "UPDATE accounts SET balance = balance - 200 WHERE id = 1;\n\n" +
          "-- 3. Revert only the second update statement:\n" +
          "ROLLBACK TO sp1;\n" +
          "COMMIT;\n\n" +
          "-- 4. Result balance should be $900 (only the first update committed):\n" +
          "SELECT * FROM accounts;"
      }
    ]
  }
];

export default augments;
