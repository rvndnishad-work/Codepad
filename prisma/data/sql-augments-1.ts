import type { SqlAugment } from "./sql-augments.types";

const augments: SqlAugment[] = [
  {
    title: "What are the different types of SQL joins?",
    description:
      "Explain INNER, LEFT, RIGHT, FULL joins.\n\n" +
      "Here is the schema for our `customers` and `orders` tables:\n" +
      "```sql\n" +
      "CREATE TABLE customers (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  name VARCHAR(50)\n" +
      ");\n" +
      "INSERT INTO customers VALUES (1, 'Alice');\n" +
      "INSERT INTO customers VALUES (2, 'Bob');\n" +
      "INSERT INTO customers VALUES (3, 'Charlie');\n\n" +
      "CREATE TABLE orders (\n" +
      "  order_id INT PRIMARY KEY,\n" +
      "  customer_id INT,\n" +
      "  amount INT\n" +
      ");\n" +
      "INSERT INTO orders VALUES (10, 1, 100);\n" +
      "INSERT INTO orders VALUES (20, 2, 250);\n" +
      "INSERT INTO orders VALUES (30, 99, 50);\n" +
      "```",
    answer:
      "## SQL Joins\n\n" +
      "SQL joins combine rows from two or more tables based on a related column between them. Relational databases support several join types that handle non-matching rows differently:\n\n" +
      "| Join Type | Behavior | Output Description |\n" +
      "|---|---|---|\n" +
      "| `INNER JOIN` | Default join | Returns rows only when there is a match in **both** tables. |\n" +
      "| `LEFT JOIN` | Outer join | Returns **all** rows from the left table, plus matching rows from the right (or `NULL`s). |\n" +
      "| `RIGHT JOIN` | Outer join | Returns **all** rows from the right table, plus matching rows from the left (or `NULL`s). |\n" +
      "| `FULL JOIN` | Outer join | Returns all rows when there is a match in **either** table (with `NULL`s where unmatched). |\n" +
      "| `CROSS JOIN` | Cartesian product | Combines every row from the left table with every row from the right. |\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 180' role='img' aria-label='Venn Diagrams of INNER, LEFT, RIGHT and FULL Joins'>" +
      "<g transform='translate(0, 0)'>" +
      "  <circle cx='60' cy='80' r='40' class='d-box-muted' />" +
      "  <circle cx='100' cy='80' r='40' class='d-box-muted' />" +
      "  <path d='M80,45 A40,40 0 0,1 100,80 A40,40 0 0,1 80,115 A40,40 0 0,1 60,80 A40,40 0 0,1 80,45 Z' class='d-box-accent' />" +
      "  <text x='80' y='145' text-anchor='middle' class='d-sub'>INNER JOIN</text>" +
      "</g>" +
      "<g transform='translate(120, 0)'>" +
      "  <circle cx='60' cy='80' r='40' class='d-box-accent' />" +
      "  <circle cx='100' cy='80' r='40' class='d-box-muted' />" +
      "  <path d='M80,45 A40,40 0 0,1 100,80 A40,40 0 0,1 80,115 A40,40 0 0,1 60,80 A40,40 0 0,1 80,45 Z' class='d-box-accent' />" +
      "  <text x='80' y='145' text-anchor='middle' class='d-sub'>LEFT JOIN</text>" +
      "</g>" +
      "<g transform='translate(240, 0)'>" +
      "  <circle cx='60' cy='80' r='40' class='d-box-muted' />" +
      "  <circle cx='100' cy='80' r='40' class='d-box-accent' />" +
      "  <path d='M80,45 A40,40 0 0,1 100,80 A40,40 0 0,1 80,115 A40,40 0 0,1 60,80 A40,40 0 0,1 80,45 Z' class='d-box-accent' />" +
      "  <text x='80' y='145' text-anchor='middle' class='d-sub'>RIGHT JOIN</text>" +
      "</g>" +
      "<g transform='translate(360, 0)'>" +
      "  <circle cx='60' cy='80' r='40' class='d-box-accent' fill-opacity='0.75' />" +
      "  <circle cx='100' cy='80' r='40' class='d-box-accent' fill-opacity='0.75' />" +
      "  <text x='80' y='145' text-anchor='middle' class='d-sub'>FULL JOIN</text>" +
      "</g>" +
      "</svg>\n\n" +
      "### Practical Advice\n" +
      "- **Filter in ON vs WHERE:** For outer joins, conditions in `ON` determine which rows are joined. Conditions in `WHERE` filter the *resulting* row set. Filtering the right table in `WHERE` often accidentally coerces a `LEFT JOIN` into an `INNER JOIN` (since `NULL`s are filtered out).\n" +
      "- **Performance:** Always join on indexed columns (like primary keys and foreign keys) to avoid nested loop full-table scans.\n\n" +
      "**Interview tip:** emphasize that outer joins (`LEFT`/`RIGHT`/`FULL`) preserve unmatched rows by padding them with `NULL`s. Explicitly point out that `RIGHT JOIN` is semantic mirror of `LEFT JOIN`, but `LEFT JOIN` is preferred in production queries for left-to-right code readability.",
    examples: [
      {
        label: "Joins Playground",
        tech: "sql",
        code:
          "-- Seeded tables: customers (1: Alice, 2: Bob, 3: Charlie)\n" +
          "-- and orders (10: customer_id 1, 20: customer_id 2, 30: customer_id 99)\n\n" +
          "-- 1. INNER JOIN (Alice and Bob match, Charlie and Order 30 are excluded)\n" +
          "SELECT c.name, o.order_id, o.amount\n" +
          "FROM customers c\n" +
          "INNER JOIN orders o ON c.id = o.customer_id;\n\n" +
          "-- 2. LEFT JOIN (All customers kept; Charlie gets NULL values for order columns)\n" +
          "SELECT c.name, o.order_id, o.amount\n" +
          "FROM customers c\n" +
          "LEFT JOIN orders o ON c.id = o.customer_id;"
      }
    ]
  },
  {
    title: "What is the difference between WHERE and HAVING?",
    description:
      "Compare WHERE and HAVING clauses. WHERE filters rows before grouping; HAVING filters groups after GROUP BY.\n\n" +
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
      "## WHERE vs HAVING\n\n" +
      "Both clauses filter result rows, but they run at different stages of logical query execution:\n\n" +
      "- **`WHERE`** filters individual raw rows **before** they are grouped by `GROUP BY`. It cannot refer to aggregate functions (like `SUM` or `COUNT`).\n" +
      "- **`HAVING`** filters summary group rows **after** they are grouped by `GROUP BY`. It is designed to filter on aggregate calculations.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 120' role='img' aria-label='Logical query execution order'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<rect class='d-box-accent' x='10' y='35' width='60' height='30' rx='4'/><text class='d-accent d-text' x='40' y='53' text-anchor='middle'>FROM</text>" +
      "<rect class='d-box' x='90' y='35' width='65' height='30' rx='4'/><text class='d-sub' x='122' y='53' text-anchor='middle'>WHERE</text>" +
      "<rect class='d-box' x='175' y='35' width='70' height='30' rx='4'/><text class='d-sub' x='210' y='53' text-anchor='middle'>GROUP BY</text>" +
      "<rect class='d-box-accent' x='265' y='35' width='65' height='30' rx='4'/><text class='d-accent d-text' x='297' y='53' text-anchor='middle'>HAVING</text>" +
      "<rect class='d-box' x='350' y='35' width='60' height='30' rx='4'/><text class='d-sub' x='380' y='53' text-anchor='middle'>SELECT</text>" +
      "<rect class='d-box' x='430' y='35' width='40' height='30' rx='4'/><text class='d-sub' x='450' y='53' text-anchor='middle'>LIMIT</text>" +
      "<line class='d-edge' x1='70' y1='50' x2='85' y2='50' marker-end='url(#arrow)'/>" +
      "<line class='d-edge' x1='155' y1='50' x2='170' y2='50' marker-end='url(#arrow)'/>" +
      "<line class='d-edge' x1='245' y1='50' x2='260' y2='50' marker-end='url(#arrow)'/>" +
      "<line class='d-edge' x1='330' y1='50' x2='345' y2='50' marker-end='url(#arrow)'/>" +
      "<line class='d-edge' x1='410' y1='50' x2='425' y2='50' marker-end='url(#arrow)'/>" +
      "</svg>\n\n" +
      "### Query Execution Flow\n" +
      "1. `FROM` loads tables and performs joins.\n" +
      "2. `WHERE` filters input rows (reducing database search space early).\n" +
      "3. `GROUP BY` organizes filtered rows into groups.\n" +
      "4. `HAVING` filters out entire groups that do not match the condition.\n" +
      "5. `SELECT` formats columns, computes aggregates, and evaluates aliases.\n" +
      "6. `LIMIT` restricts output size.\n\n" +
      "**Interview tip:** Explain that you can filter the same query with both clauses: use `WHERE` to pre-filter rows (e.g., `WHERE status = 'ACTIVE'`) and `HAVING` to filter aggregated totals (e.g., `HAVING SUM(amount) > 100`). Pre-filtering in `WHERE` is much faster because it keeps the grouping footprint small.",
    examples: [
      {
        label: "WHERE vs HAVING Playground",
        tech: "sql",
        code:
          "-- 1. WHERE: filters rows before grouping (amount > 70)\n" +
          "SELECT product, amount \n" +
          "FROM sales \n" +
          "WHERE amount > 70;\n\n" +
          "-- 2. HAVING: filters groups after GROUP BY (sum of amount > 150)\n" +
          "SELECT product, SUM(amount) AS total_sales\n" +
          "FROM sales\n" +
          "GROUP BY product\n" +
          "HAVING SUM(amount) > 150;\n\n" +
          "-- 3. Combined: WHERE filters raw rows, HAVING filters aggregated groups\n" +
          "SELECT product, SUM(amount) AS total_sales\n" +
          "FROM sales\n" +
          "WHERE amount > 70\n" +
          "GROUP BY product\n" +
          "HAVING SUM(amount) > 150;"
      }
    ]
  },
  {
    title: "What is database normalization?",
    answer:
      "## Database Normalization\n\n" +
      "Normalization organizes a database schema to minimize data redundancy and prevent data anomalies (Insert, Update, and Delete anomalies). It progresses through sequential stages called **Normal Forms**:\n\n" +
      "| Normal Form | Rule | Action Required |\n" +
      "|---|---|---|\n" +
      "| **1NF** | Atomic columns | Values must be atomic (no arrays/comma-separated lists) and rows must be unique. |\n" +
      "| **2NF** | No partial dependencies | Must be in 1NF, and all non-key columns must depend on the *entire* primary key. |\n" +
      "| **3NF** | No transitive dependencies | Must be in 2NF, and non-key columns cannot depend on other non-key columns. |\n" +
      "| **BCNF** | Key determinants | A stronger version of 3NF where every determinant must be a candidate key. |\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 140' role='img' aria-label='Normal forms progressive steps'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<rect class='d-box' x='15' y='35' width='80' height='40' rx='5'/><text class='d-sub' x='55' y='55' text-anchor='middle'>1NF</text><text class='d-sub' x='55' y='70' text-anchor='middle' font-size='8'>Atomic Values</text>" +
      "<rect class='d-box' x='130' y='35' width='80' height='40' rx='5'/><text class='d-sub' x='170' y='55' text-anchor='middle'>2NF</text><text class='d-sub' x='170' y='70' text-anchor='middle' font-size='8'>No Partial Deps</text>" +
      "<rect class='d-box-accent' x='245' y='35' width='80' height='40' rx='5'/><text class='d-accent d-text' x='285' y='55' text-anchor='middle'>3NF</text><text class='d-sub' x='285' y='70' text-anchor='middle' font-size='8'>No Transitive Deps</text>" +
      "<rect class='d-box' x='360' y='35' width='80' height='40' rx='5'/><text class='d-sub' x='400' y='55' text-anchor='middle'>BCNF</text><text class='d-sub' x='400' y='70' text-anchor='middle' font-size='8'>Key Determinants</text>" +
      "<line class='d-edge' x1='95' y1='55' x2='125' y2='55' marker-end='url(#arrow)'/>" +
      "<line class='d-edge' x1='210' y1='55' x2='240' y2='55' marker-end='url(#arrow)'/>" +
      "<line class='d-edge' x1='325' y1='55' x2='355' y2='55' marker-end='url(#arrow)'/>" +
      "<text class='d-sub' x='240' y='110' text-anchor='middle'>Normalization reduces redundancy, data anomalies, and improves integrity</text>" +
      "</svg>\n\n" +
      "### Trade-offs\n" +
      "- **Advantages:** Smaller storage size, consistent updates, avoids data duplication.\n" +
      "- **Disadvantages:** Complex queries requiring many joins, which can slow down read-heavy reporting systems. Databases are often **denormalized** (introducing redundant data intentionally) in high-throughput data warehouses to optimize reads.\n\n" +
      "**Interview tip:** Explain that BCNF is reached when every determinant is a superkey. Be ready to explain that while normalized tables are ideal for write-heavy OLTP systems, denormalized schemas (like Star or Snowflake schemas) are often used for OLAP reporting pipelines.",
    examples: [
      {
        label: "Normal Form Demo",
        tech: "sql",
        code:
          "-- Denormalized (redundant customer info in order rows):\n" +
          "-- CREATE TABLE orders_unnormalized (id INT, cust_name VARCHAR, cust_city VARCHAR, amount INT);\n\n" +
          "-- Normalized into 3NF:\n" +
          "CREATE TABLE customers_3nf (\n" +
          "  id INT PRIMARY KEY,\n" +
          "  name VARCHAR(50),\n" +
          "  city VARCHAR(50)\n" +
          ");\n\n" +
          "CREATE TABLE orders_3nf (\n" +
          "  id INT PRIMARY KEY,\n" +
          "  customer_id INT,\n" +
          "  amount INT,\n" +
          "  FOREIGN KEY (customer_id) REFERENCES customers_3nf(id)\n" +
          ");"
      }
    ]
  },
  {
    title: "What are ACID properties?",
    answer:
      "## ACID Properties\n\n" +
      "A database **transaction** is a sequence of SQL queries executed as a single unit of work. ACID is a set of properties that guarantee database transactions are processed reliably:\n\n" +
      "- **Atomicity:** All-or-nothing execution. If any query inside the transaction fails, the entire transaction is aborted and rolled back to its original state.\n" +
      "- **Consistency:** The transaction moves the database from one valid state to another, maintaining all schema constraints (keys, checks, unique constraints).\n" +
      "- **Isolation:** Concurrent transactions execute without interfering with each other. The database guarantees that the state matches a sequential order of transactions.\n" +
      "- **Durability:** Once committed, the transaction's changes are permanent (even in the event of a power loss or database crash) by writing to a Write-Ahead Log (WAL).\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 150' role='img' aria-label='Transaction lifecycle state machine'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<rect class='d-box' x='15' y='50' width='80' height='30' rx='5'/><text class='d-sub' x='55' y='69' text-anchor='middle'>Active</text>" +
      "<rect class='d-box' x='140' y='15' width='120' height='30' rx='5'/><text class='d-sub' x='200' y='34' text-anchor='middle'>Partially Committed</text>" +
      "<rect class='d-box-accent' x='330' y='15' width='100' height='30' rx='5'/><text class='d-accent d-text' x='380' y='34' text-anchor='middle'>Committed</text>" +
      "<rect class='d-box' x='140' y='85' width='120' height='30' rx='5'/><text class='d-sub' x='200' y='104' text-anchor='middle'>Failed</text>" +
      "<rect class='d-box' x='330' y='85' width='100' height='30' rx='5'/><text class='d-sub' x='380' y='104' text-anchor='middle'>Aborted</text>" +
      "<line class='d-edge' x1='95' y1='65' x2='135' y2='30' marker-end='url(#arrow)'/>" +
      "<line class='d-edge' x1='95' y1='65' x2='135' y2='95' marker-end='url(#arrow)'/>" +
      "<line class='d-edge' x1='260' y1='30' x2='320' y2='30' marker-end='url(#arrow)'/>" +
      "<line class='d-edge' x1='200' y1='45' x2='200' y2='75' marker-end='url(#arrow)'/>" +
      "<line class='d-edge' x1='260' y1='100' x2='320' y2='100' marker-end='url(#arrow)'/>" +
      "</svg>\n\n" +
      "### Transaction Controls\n" +
      "- `BEGIN TRANSACTION` / `START TRANSACTION`: Initiates the block.\n" +
      "- `COMMIT`: Consolidates and saves changes permanently.\n" +
      "- `ROLLBACK`: Reverts all statements inside the active transaction.\n" +
      "- `SAVEPOINT`: Creates sub-checkpoints to rollback partially without aborting the entire sequence.\n\n" +
      "**Interview tip:** Explain that Isolation is the most expensive property. The SQL standard defines different Isolation Levels (Read Uncommitted, Read Committed, Repeatable Read, Serializable) to let developers trade strict compliance for query performance.",
    examples: [
      {
        label: "Transaction Playground",
        tech: "sql",
        code:
          "-- Setup account balances table:\n" +
          "CREATE TABLE accounts (id INT PRIMARY KEY, name VARCHAR(50), balance INT);\n" +
          "INSERT INTO accounts VALUES (1, 'Alice', 1000);\n" +
          "INSERT INTO accounts VALUES (2, 'Bob', 500);\n\n" +
          "-- Transfer money transaction safely:\n" +
          "BEGIN TRANSACTION;\n" +
          "UPDATE accounts SET balance = balance - 100 WHERE id = 1;\n" +
          "UPDATE accounts SET balance = balance + 100 WHERE id = 2;\n" +
          "COMMIT;\n\n" +
          "SELECT * FROM accounts;"
      }
    ]
  },
  {
    title: "What is a self join?",
    description:
      "Explain self joins. A self join is a regular join, but the table is joined with itself.\n\n" +
      "Here is the schema for our `employees` table:\n" +
      "```sql\n" +
      "CREATE TABLE employees (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  name VARCHAR(50),\n" +
      "  manager_id INT\n" +
      ");\n" +
      "INSERT INTO employees VALUES (1, 'Alice', NULL);\n" +
      "INSERT INTO employees VALUES (2, 'Bob', 1);\n" +
      "INSERT INTO employees VALUES (3, 'Charlie', 1);\n" +
      "INSERT INTO employees VALUES (4, 'David', 2);\n" +
      "```",
    answer:
      "## Self Joins\n\n" +
      "A **self join** is a regular join in which a table is joined with itself. It is extremely useful for querying hierarchical relationships stored inside a single table (such as an organizational chart or directory paths).\n\n" +
      "Because you are joining the same table, you **must use table aliases** to differentiate the left instance from the right instance.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 150' role='img' aria-label='Self join employees manager hierarchy'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<rect class='d-box-accent' x='190' y='15' width='100' height='30' rx='5'/><text class='d-accent d-text' x='240' y='34' text-anchor='middle'>Alice (ID: 1)</text>" +
      "<rect class='d-box' x='80' y='80' width='100' height='30' rx='5'/><text class='d-sub' x='130' y='99' text-anchor='middle'>Bob (Mgr: 1)</text>" +
      "<rect class='d-box' x='300' y='80' width='100' height='30' rx='5'/><text class='d-sub' x='350' y='99' text-anchor='middle'>Charlie (Mgr: 1)</text>" +
      "<line class='d-edge' x1='220' y1='45' x2='150' y2='75' marker-end='url(#arrow)'/>" +
      "<line class='d-edge' x1='260' y1='45' x2='330' y2='75' marker-end='url(#arrow)'/>" +
      "<text class='d-sub' x='240' y='135' text-anchor='middle'>Joined table aliases (e.g. employees e JOIN employees m) map these relations</text>" +
      "</svg>\n\n" +
      "### Common Query Template\n" +
      "To map employee names directly to their manager's name, you aliased the table as `e` (for employee) and `m` (for manager):\n\n" +
      "```sql\n" +
      "SELECT e.name AS employee, m.name AS manager\n" +
      "FROM employees e\n" +
      "LEFT JOIN employees m ON e.manager_id = m.id;\n" +
      "```\n\n" +
      "**Interview tip:** Explain that you use a `LEFT JOIN` instead of an `INNER JOIN` in self-joins for hierarchies so that root nodes (like the CEO, who has no manager) are still returned in the output instead of being filtered out.",
    examples: [
      {
        label: "Self Join Playground",
        tech: "sql",
        code:
          "-- Seeded tables: employees (1: Alice/CEO, 2: Bob/Mgr Alice, 3: Charlie/Mgr Alice, 4: David/Mgr Bob)\n" +
          "-- Run self join mapping:\n\n" +
          "SELECT \n" +
          "  e.name AS employee_name,\n" +
          "  m.name AS manager_name\n" +
          "FROM employees e\n" +
          "LEFT JOIN employees m ON e.manager_id = m.id;"
      }
    ]
  },
  {
    title: "What is an index and how does it speed up queries?",
    description:
      "Explain indexes.\n\n" +
      "Here is the schema for our `customers` table:\n" +
      "```sql\n" +
      "CREATE TABLE customers (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  name VARCHAR(50),\n" +
      "  email VARCHAR(50)\n" +
      ");\n" +
      "INSERT INTO customers VALUES (1, 'Alice', 'alice@example.com');\n" +
      "INSERT INTO customers VALUES (2, 'Bob', 'bob@example.com');\n" +
      "INSERT INTO customers VALUES (3, 'Charlie', 'charlie@example.com');\n" +
      "```",
    answer:
      "## Database Indexing\n\n" +
      "An **index** is an auxiliary, sorted data structure that maps **column values → storage pointers**, allowing the database engine to find matching rows without reading the entire table (avoiding sequential table scans).\n\n" +
      "The default index type is a **B-Tree** (Balanced Tree), which organizes keys in a sorted, multi-level hierarchy:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 150' role='img' aria-label='Index structure search diagram'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<rect class='d-box' x='20' y='50' width='120' height='40' rx='5'/><text class='d-sub' x='80' y='75' text-anchor='middle'>Index (B-Tree Key)</text>" +
      "<rect class='d-box-accent' x='300' y='50' width='140' height='40' rx='5'/><text class='d-accent d-text' x='370' y='75' text-anchor='middle'>Table Row Pointer</text>" +
      "<line class='d-edge' x1='140' y1='70' x2='290' y2='70' marker-end='url(#arrow)'/>" +
      "<text class='d-sub' x='220' y='60' text-anchor='middle'>Fast O(log n)</text>" +
      "<text class='d-sub' x='240' y='125' text-anchor='middle'>Index maps search keys directly to storage locations, avoiding table scans</text>" +
      "</svg>\n\n" +
      "### Key Concepts\n" +
      "- **Clustered Index:** Determines the physical sorting order of rows on disk. Only one per table (typically the Primary Key).\n" +
      "- **Non-Clustered Index:** A separate index structure that stores index keys and points back to the clustered rows.\n" +
      "- **Covering Index:** A composite index that contains all columns requested by a query, allowing the database to complete the query without accessing the main table block (Index-Only Scan).\n\n" +
      "**Interview tip:** Explain that indexing is a trade-off. It speeds up `SELECT`, `ORDER BY`, and `JOIN` operations, but slows down `INSERT`, `UPDATE`, and `DELETE` queries because the database has to update the B-Tree indexes synchronously on writes.",
    examples: [
      {
        label: "Indexing Playground",
        tech: "sql",
        code:
          "-- CREATE INDEX statement structure:\n" +
          "-- CREATE INDEX idx_customers_name ON customers(name);\n\n" +
          "-- Query planner explain checks:\n" +
          "EXPLAIN SELECT * FROM customers WHERE name = 'Alice';"
      }
    ]
  },
  {
    title: "What are transaction isolation levels?",
    description:
      "Explain isolation levels.\n\n" +
      "Here is the schema for our `customers` table:\n" +
      "```sql\n" +
      "CREATE TABLE customers (\n" +
      "  id INT PRIMARY KEY,\n" +
      "  name VARCHAR(50),\n" +
      "  email VARCHAR(50)\n" +
      ");\n" +
      "INSERT INTO customers VALUES (1, 'Alice', 'alice@example.com');\n" +
      "INSERT INTO customers VALUES (2, 'Bob', 'bob@example.com');\n" +
      "INSERT INTO customers VALUES (3, 'Charlie', 'charlie@example.com');\n" +
      "```",
    answer:
      "## Transaction Isolation Levels\n\n" +
      "Transaction isolation controls how concurrent transactions see changes made by other transactions. It trades **data consistency** for **query concurrency**:\n\n" +
      "| Isolation Level | Dirty Reads | Non-Repeatable Reads | Phantom Reads |\n" +
      "|---|---|---|---|\n" +
      "| **Read Uncommitted** | Allowed | Allowed | Allowed |\n" +
      "| **Read Committed** | Prevented | Allowed | Allowed |\n" +
      "| **Repeatable Read** | Prevented | Prevented | Allowed (or blocked in Postgres/InnoDB) |\n" +
      "| **Serializable** | Prevented | Prevented | Prevented |\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 160' role='img' aria-label='Isolation vs Concurrency trade-off'>" +
      "<defs><marker id='arrow' markerWidth='6' markerHeight='6' refX='5' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>" +
      "<line x1='50' y1='130' x2='440' y2='130' stroke='currentColor' stroke-width='2' marker-end='url(#arrow)'/>" +
      "<line x1='50' y1='130' x2='50' y2='20' stroke='currentColor' stroke-width='2' marker-end='url(#arrow)'/>" +
      "<text class='d-sub' x='245' y='150' text-anchor='middle'>Isolation Strength (Read Uncommitted -> Serializable)</text>" +
      "<text class='d-sub' x='20' y='75' text-anchor='middle' transform='rotate(-90 20 75)'>Concurrency</text>" +
      "<path d='M80,40 Q240,70 400,110' fill='none' class='d-edge' stroke-width='3'/>" +
      "<circle cx='80' cy='40' r='6' class='d-box-accent'/>" +
      "<text class='d-sub' x='95' y='35'>Read Uncommitted</text>" +
      "<circle cx='400' cy='110' r='6' class='d-box-accent'/>" +
      "<text class='d-sub' x='385' y='95'>Serializable</text>" +
      "</svg>\n\n" +
      "### Transactional Anomalies\n" +
      "- **Dirty Read:** Transaction A reads uncommitted writes from Transaction B.\n" +
      "- **Non-Repeatable Read:** Transaction A re-reads a row and finds different values because Transaction B updated and committed it.\n" +
      "- **Phantom Read:** Transaction A re-runs a range scan query and finds newly inserted rows committed by Transaction B.\n\n" +
      "**Interview tip:** Mention that databases use locking mechanisms (shared/exclusive locks) or **MVCC** (Multi-Version Concurrency Control) to implement isolation. PostgreSQL defaults to *Read Committed*, while MySQL's InnoDB defaults to *Repeatable Read*.",
    examples: [
      {
        label: "Isolation Levels Playground",
        tech: "sql",
        code:
          "-- Set isolation level statements:\n" +
          "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;\n\n" +
          "SELECT * FROM customers;"
      }
    ]
  }
];

export default augments;
