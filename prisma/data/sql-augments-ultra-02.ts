/**
 * SQL ULTRA — batch 02: Keys, constraints and types (primary and foreign
 * keys, UNIQUE, CHECK, NOT NULL / DEFAULT, CHAR / VARCHAR / TEXT). Every
 * example was run by scripts/verify-sql-examples.ts (sql.js 1.10.2 like the
 * page, PostgreSQL 16 for postgres examples); quoted output is that run's output.
 */
import type { SqlUltraAugment } from "./sql-augments.types";

const augments: SqlUltraAugment[] = [
  {
    title: `What is the difference between a primary key and a foreign key?`,
    difficulty: "easy",
    seoDescription: `A primary key uniquely identifies each row; a foreign key points at a parent row and blocks orphans. Rules, indexes and SQLite traps, all run.`,
    description: `**Question presented to candidate:**
"Every table in our schema has an \`id\` column, and some tables also have columns like \`customer_id\`. Explain what a primary key is, what a foreign key is, how they work together, and what the database actually enforces for each."

**What a strong answer should cover:**
- A primary key uniquely identifies each row of its own table: unique, never NULL, one per table (it may span several columns)
- A foreign key is a column in a child table whose values must match a primary key (or unique) value in the parent table, or be NULL
- What each enforces: duplicates and NULLs are rejected for the primary key; orphan inserts and deletes of referenced parents are rejected for the foreign key
- Indexes: the primary key always gets one; in PostgreSQL the foreign key column does not, which matters for joins and parent deletes
- Engine detail: SQLite only enforces foreign keys after \`PRAGMA foreign_keys = ON\`, and only allows NULL in a non-INTEGER primary key for legacy reasons
- Cascade options (\`ON DELETE CASCADE\`, \`SET NULL\`, \`RESTRICT\`) as the policy for what happens to children

**Code / implementation expected:** Optional — a two-table schema with \`PRIMARY KEY\` and \`REFERENCES\`, and one join that follows the key.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  total NUMERIC NOT NULL,
  placed DATE NOT NULL
);
INSERT INTO customers (id, email, name) VALUES
  (1, 'asha@example.com', 'Asha'),
  (2, 'ben@example.com', 'Ben'),
  (3, 'chen@example.com', 'Chen'),
  (4, 'dara@example.com', 'Dara');
INSERT INTO orders (id, customer_id, total, placed) VALUES
  (1, 1, 120, '2024-03-01'),
  (2, 1, 35, '2024-03-04'),
  (3, 2, 80, '2024-03-05'),
  (4, 3, 15, '2024-03-07'),
  (5, 3, 60, '2024-03-09'),
  (6, NULL, 22, '2024-03-10'),
  (7, 2, 44, '2024-03-12');
\`\`\``,
    answer: `**Target Audience:** Beginners meeting relational tables for the first time, and anyone who wants the precise rules an interviewer expects.
**Difficulty:** Easy
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15, both run for this page. MySQL and SQL Server differences are cited from their manuals.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and error message shown was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

Picture a library. Every member gets a membership card with a number on it, and no two members ever share a number. That number is how the library tells members apart, even two people both called "Chen".

Now picture the loans ledger. Each line says "book X was borrowed by member 1042". The ledger does not copy the member's name and address onto every line; it just writes the card number. And there is a rule at the desk: you cannot write a loan for member 9999 if no such member exists, and you cannot tear up a member's card while they still have books out.

That is the whole idea:

- The **card number** is a **primary key**: it identifies one member, uniquely, forever.
- The **member number written in the ledger** is a **foreign key**: a reference from one table to a row in another, which the database checks for you.

Without the second rule, the ledger slowly fills with loans for members who do not exist, and nobody can say who has the books. Databases enforce keys so that this kind of rot cannot happen, no matter how many applications write to the tables.

## 2. The Primary Key

📌 **Interview term: primary key** — the column, or set of columns, that uniquely identifies each row of a table. The database enforces two rules on it: no two rows may have the same value, and the value may not be NULL. A table has at most one primary key.

In the schema above, \`customers.id\` and \`orders.id\` are primary keys. Trying to break the rules on PostgreSQL 16:

~~~sql
INSERT INTO customers (id, email, name) VALUES (1, 'x@example.com', 'Copy');
~~~

~~~text
ERROR:  duplicate key value violates unique constraint "customers_pkey"
DETAIL:  Key (id)=(1) already exists.
~~~

And a NULL key on a table whose key is \`code TEXT PRIMARY KEY\`:

~~~text
ERROR:  null value in column "code" of relation "t" violates not-null constraint
DETAIL:  Failing row contains (null).
~~~

Declaring two primary keys on one table is a syntax-level error: \`multiple primary keys for table "t3" are not allowed\`.

📌 **Interview term: composite key** — a primary key made of several columns, written as a table constraint: \`PRIMARY KEY (order_id, product_id)\`. The *combination* must be unique; each column on its own may repeat. Every column in it is NOT NULL.

📌 **Interview term: surrogate key vs natural key** — a **surrogate key** is a meaningless generated number (an identity column, SQLite \`INTEGER PRIMARY KEY\`); a **natural key** is a real-world value that happens to be unique, like an email or an ISBN. Surrogate keys never change, which keeps foreign keys stable; natural keys are better kept as a \`UNIQUE\` constraint next to the surrogate. The trade-offs of \`PRIMARY KEY\` versus \`UNIQUE\` have their own page: [What is the difference between a primary key and a unique constraint?](/interview-question/what-is-the-difference-between-a-primary-key-and-a-unique-constraint)

**A SQLite quirk worth knowing.** On SQLite, \`code TEXT PRIMARY KEY\` accepted two rows with a NULL \`code\` when run for this page. The [SQLite CREATE TABLE docs](https://sqlite.org/lang_createtable.html) explain why: early versions forgot to enforce NOT NULL on primary keys, and the bug was kept for backward compatibility. Only \`INTEGER PRIMARY KEY\` columns and \`WITHOUT ROWID\` tables are protected. Write \`PRIMARY KEY NOT NULL\` on SQLite if the key is not an integer.

📌 **Interview term: rowid alias** — in SQLite, a column declared exactly \`INTEGER PRIMARY KEY\` becomes another name for the hidden \`rowid\`, so it is the table storage key itself and gets a value automatically when you insert NULL or omit it.

## 3. The Foreign Key

📌 **Interview term: foreign key** — a column (or set of columns) in one table whose values must match the primary key, or a unique key, of a row in another table. It is declared with \`REFERENCES parent(column)\` or \`FOREIGN KEY (col) REFERENCES parent(col)\`.

📌 **Interview term: referential integrity** — the guarantee that every foreign key value points at a row that actually exists. The foreign key constraint is how the database enforces it.

📌 **Interview term: parent table / child table** — the table being referenced (\`customers\`) is the parent; the table holding the foreign key (\`orders\`) is the child. The parent is also called the referenced table, the child the referencing table.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="The orders table has a foreign key customer_id that points at the primary key id of the customers table">
  <defs>
    <marker id="sql02q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="30" width="280" height="40" rx="8"/>
  <text class="d-text" x="160" y="56" text-anchor="middle">customers (parent)</text>
  <rect class="d-box-accent" x="20" y="80" width="280" height="44" rx="6"/>
  <text class="d-text" x="40" y="108">id</text>
  <text class="d-accent" x="280" y="108" text-anchor="end">PRIMARY KEY</text>
  <rect class="d-box" x="20" y="134" width="280" height="44" rx="6"/>
  <text class="d-text" x="40" y="162">email</text>
  <text class="d-sub" x="280" y="162" text-anchor="end">UNIQUE NOT NULL</text>
  <rect class="d-box" x="20" y="188" width="280" height="44" rx="6"/>
  <text class="d-text" x="40" y="216">name</text>
  <rect class="d-box-muted" x="460" y="30" width="280" height="40" rx="8"/>
  <text class="d-text" x="600" y="56" text-anchor="middle">orders (child)</text>
  <rect class="d-box" x="460" y="80" width="280" height="44" rx="6"/>
  <text class="d-text" x="480" y="108">id</text>
  <text class="d-sub" x="720" y="108" text-anchor="end">PRIMARY KEY</text>
  <rect class="d-box-accent" x="460" y="134" width="280" height="44" rx="6"/>
  <text class="d-text" x="480" y="162">customer_id</text>
  <text class="d-accent" x="720" y="162" text-anchor="end">FOREIGN KEY</text>
  <rect class="d-box" x="460" y="188" width="280" height="44" rx="6"/>
  <text class="d-text" x="480" y="216">total</text>
  <rect class="d-box" x="460" y="242" width="280" height="44" rx="6"/>
  <text class="d-text" x="480" y="270">placed</text>
  <path class="d-edge-accent" d="M 456 156 L 380 156 L 380 102 L 306 102" marker-end="url(#sql02q1-arrow)"/>
  <text class="d-sub" x="386" y="86" text-anchor="middle">REFERENCES</text>
</svg>

The arrow goes from the child to the parent: \`orders.customer_id\` stores a copy of some \`customers.id\`. One customer can appear in many orders, which is how a **one-to-many relationship** is modelled. A many-to-many relationship needs a third table holding two foreign keys.

The first example follows the key with a join. Order 6 has a NULL \`customer_id\` (a guest checkout), so a \`LEFT JOIN\` keeps it with a NULL name:

~~~text
order_id | customer_id | name | total
1 | 1 | Asha | 120
2 | 1 | Asha | 35
3 | 2 | Ben | 80
4 | 3 | Chen | 15
5 | 3 | Chen | 60
6 | NULL | NULL | 22
7 | 2 | Ben | 44
~~~

A NULL foreign key is allowed unless the column is also \`NOT NULL\`. It means "no parent", not "parent number NULL". For more on joins, see [What are the different types of SQL joins?](/interview-question/what-are-the-different-types-of-sql-joins)

### What the foreign key actually checks

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="What the foreign key checks on each kind of write, on the child side and on the parent side">
  <rect class="d-box-muted" x="20" y="20" width="340" height="44" rx="8"/>
  <text class="d-text" x="190" y="48" text-anchor="middle">Writes to the child (orders)</text>
  <rect class="d-box" x="20" y="84" width="340" height="60" rx="8"/>
  <text class="d-text" x="190" y="110" text-anchor="middle">INSERT or UPDATE customer_id</text>
  <text class="d-sub" x="190" y="132" text-anchor="middle">parent row must exist, or NULL</text>
  <rect class="d-box" x="20" y="164" width="340" height="60" rx="8"/>
  <text class="d-text" x="190" y="190" text-anchor="middle">DELETE an order</text>
  <text class="d-sub" x="190" y="212" text-anchor="middle">always allowed</text>
  <rect class="d-box-muted" x="400" y="20" width="340" height="44" rx="8"/>
  <text class="d-text" x="570" y="48" text-anchor="middle">Writes to the parent (customers)</text>
  <rect class="d-box" x="400" y="84" width="340" height="60" rx="8"/>
  <text class="d-text" x="570" y="110" text-anchor="middle">INSERT a customer</text>
  <text class="d-sub" x="570" y="132" text-anchor="middle">always allowed</text>
  <rect class="d-box-accent" x="400" y="164" width="340" height="60" rx="8"/>
  <text class="d-text" x="570" y="190" text-anchor="middle">DELETE or change a referenced id</text>
  <text class="d-sub" x="570" y="212" text-anchor="middle">blocked, or cascades per ON DELETE</text>
</svg>

Writes to the child are checked against the parent, and writes to the parent are checked against the child. Here are the errors PostgreSQL 16 gives on this schema:

~~~sql
INSERT INTO orders (id, customer_id, total, placed) VALUES (9, 99, 10, '2024-03-15');
~~~

~~~text
ERROR:  insert or update on table "orders" violates foreign key constraint "orders_customer_id_fkey"
DETAIL:  Key (customer_id)=(99) is not present in table "customers".
~~~

~~~sql
DELETE FROM customers WHERE id = 1;
~~~

~~~text
ERROR:  update or delete on table "customers" violates foreign key constraint "orders_customer_id_fkey" on table "orders"
DETAIL:  Key (id)=(1) is still referenced from table "orders".
~~~

Changing a referenced id (\`UPDATE customers SET id = 10 WHERE id = 1\`) gives the same error, and \`DROP TABLE customers\` refuses with \`cannot drop table customers because other objects depend on it\`. Deleting customer 4, who has no orders, succeeds.

What happens to children when a parent goes away is a policy you choose with \`ON DELETE\` / \`ON UPDATE\`: \`NO ACTION\` (the default, an error as above), \`RESTRICT\`, \`CASCADE\`, \`SET NULL\` or \`SET DEFAULT\`. That is the subject of [What are foreign key cascade options?](/interview-question/what-are-foreign-key-cascade-options)

**The target must be unique.** A foreign key may reference a primary key or any column set with a \`UNIQUE\` constraint, because "the parent row" must be one row. Pointing at a non-unique column fails on PostgreSQL with \`there is no unique constraint matching given keys for referenced table "p"\`, and on SQLite (with enforcement on) with \`foreign key mismatch - "fk2" referencing "p"\`.

📌 **Interview term: orphan row** — a child row whose foreign key value has no matching parent. Real foreign key constraints make orphans impossible; "soft" relationships enforced only by application code tend to accumulate them.

## 4. SQLite: Foreign Keys Are Off by Default

This trips up many people because the examples on this page run on SQLite. The [SQLite foreign key docs](https://sqlite.org/foreignkeys.html) state that enforcement is disabled by default for backward compatibility and must be enabled per connection with \`PRAGMA foreign_keys = ON\`. The second example shows it: the pragma reads 0, an order for the non-existent customer 99 goes straight in, and \`PRAGMA foreign_key_check\` then reports the broken row (\`rowid\` 8 in \`orders\`, pointing at \`customers\`):

~~~text
foreign_keys
0

table | rowid | parent | fkid
orders | 8 | customers | 0

foreign_keys
1
~~~

With enforcement on, the same insert fails with \`FOREIGN KEY constraint failed\` (run in the same sql.js build). Notice SQLite does not name the constraint or the value, which makes errors harder to trace than PostgreSQL ones. Every SQLite connection in an application (ORM, migration tool, CLI) must set the pragma, and it cannot be changed inside an open transaction.

The third example asks SQLite where the keys are. \`pk\` is 1 for the primary key column, and \`pragma_foreign_key_list\` shows the reference and its delete rule:

~~~text
name | type | pk
id | INTEGER | 1
email | TEXT | 0
name | TEXT | 0

parent_table | child_column | parent_column | on_delete
customers | customer_id | id | NO ACTION
~~~

## 5. Keys and Indexes

📌 **Interview term: index** — a separate sorted structure (usually a B-tree) that lets the database find rows by a column value without scanning the whole table. See [What is an index and how does it speed up queries?](/interview-question/what-is-an-index-and-how-does-it-speed-up-queries)

The database needs an index to enforce uniqueness quickly, so every primary key and unique constraint gets one automatically. A foreign key is different. The PostgreSQL example lists every index in the scratch database:

~~~text
tablename | indexname | indexdef
customers | customers_email_key | CREATE UNIQUE INDEX customers_email_key ON public.customers USING btree (email)
customers | customers_pkey | CREATE UNIQUE INDEX customers_pkey ON public.customers USING btree (id)
orders | orders_pkey | CREATE UNIQUE INDEX orders_pkey ON public.orders USING btree (id)
~~~

There is \`customers_pkey\`, \`customers_email_key\` (from \`UNIQUE\`) and \`orders_pkey\`, but nothing on \`orders.customer_id\`. The [PostgreSQL constraints chapter](https://www.postgresql.org/docs/16/ddl-constraints.html#DDL-CONSTRAINTS-FK) says so directly: declaring a foreign key does not automatically create an index on the referencing columns. Without one, every \`DELETE FROM customers\` has to scan \`orders\` to check for children, and joins from customer to orders cannot use an index. The usual fix:

~~~sql
CREATE INDEX orders_customer_id_idx ON orders (customer_id);
~~~

MySQL InnoDB behaves differently: the [MySQL foreign key docs](https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html) say it requires an index on the referencing columns and creates one automatically if none exists. In InnoDB the primary key is also the **clustered index**, the order rows are physically stored in ([InnoDB index types](https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html)); see [What is the difference between a clustered and non-clustered index?](/interview-question/what-is-the-difference-between-a-clustered-and-non-clustered-index)

## 6. Primary Key vs Foreign Key at a Glance

| | Primary key | Foreign key |
| :--- | :--- | :--- |
| Purpose | Identify each row of **this** table | Point at a row of **another** (or the same) table |
| Uniqueness | Must be unique | Repeats freely (many orders per customer) |
| NULL | Never (SQLite non-integer keys excepted, see above) | Allowed unless declared \`NOT NULL\` |
| How many per table | At most one | Any number |
| Index created automatically | Yes, a unique index | PostgreSQL and SQLite: no. MySQL InnoDB: yes |
| What it blocks | Duplicate or NULL keys | Orphan inserts/updates in the child, deletes/updates of referenced parent keys |
| Can reference itself | Not applicable | Yes, e.g. \`employees.manager_id REFERENCES employees(id)\` (a self-reference, see [What is a self join?](/interview-question/what-is-a-self-join)) |

## 7. Verified: Running the Code

The three SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above). The PostgreSQL example and every PostgreSQL error message above were run on PostgreSQL 16.15 in a scratch database with the same schema.

Example 1, following the foreign key:

~~~text
order_id | customer_id | name | total
1 | 1 | Asha | 120
2 | 1 | Asha | 35
3 | 2 | Ben | 80
4 | 3 | Chen | 15
5 | 3 | Chen | 60
6 | NULL | NULL | 22
7 | 2 | Ben | 44
~~~

Example 2, SQLite enforcement off by default:

~~~text
foreign_keys
0

table | rowid | parent | fkid
orders | 8 | customers | 0

foreign_keys
1
~~~

Example 3, inspecting the keys:

~~~text
name | type | pk
id | INTEGER | 1
email | TEXT | 0
name | TEXT | 0

parent_table | child_column | parent_column | on_delete
customers | customer_id | id | NO ACTION
~~~

Example 4, PostgreSQL indexes (no index on \`orders.customer_id\`):

~~~text
tablename | indexname | indexdef
customers | customers_email_key | CREATE UNIQUE INDEX customers_email_key ON public.customers USING btree (email)
customers | customers_pkey | CREATE UNIQUE INDEX customers_pkey ON public.customers USING btree (id)
orders | orders_pkey | CREATE UNIQUE INDEX orders_pkey ON public.orders USING btree (id)
~~~

## Common Pitfalls

- **Forgetting \`PRAGMA foreign_keys = ON\` in SQLite.** The \`REFERENCES\` clause is parsed and stored, then ignored, and orphan rows pile up silently. Set it on every connection, and run \`PRAGMA foreign_key_check\` after bulk loads.
- **Not indexing the foreign key column in PostgreSQL.** Joins and parent deletes then scan the child table. Index \`orders(customer_id)\` unless you have measured that you do not need it.
- **Using a mutable natural key as the primary key.** If emails are the key, an email change must ripple through every child table. Use a surrogate key and keep the email \`UNIQUE\`.
- **Assuming a foreign key implies NOT NULL.** It does not; add \`NOT NULL\` when every child must have a parent.
- **Expecting a foreign key to a non-unique column.** The target must be a primary key or unique constraint.
- **Relying on SQLite primary keys to reject NULL.** Only \`INTEGER PRIMARY KEY\` does; add \`NOT NULL\` to text or composite keys.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Primary key:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">primary key</strong> is the column (or columns) that uniquely identifies each row of its own table. The database enforces it as unique and not NULL, and a table has at most one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Foreign key:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">foreign key</strong> is a column in a child table, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">orders.customer_id</code>, whose values must match an existing primary key or unique value in the parent table, or be NULL.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What is enforced:</strong> <span style="color:#f0e2c8;">Inserting an order for customer 99 fails with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">violates foreign key constraint</code>. Deleting a customer who still has orders fails too, unless the key says <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ON DELETE CASCADE</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SET NULL</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Indexes:</strong> <span style="color:#f0e2c8;">The primary key always gets a unique index. In PostgreSQL the foreign key column does not, so I add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CREATE INDEX ON orders (customer_id)</code> for joins and to make parent deletes cheap. MySQL InnoDB creates that index for you.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Engine traps:</strong> <span style="color:#f0e2c8;">SQLite ignores foreign keys until <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PRAGMA foreign_keys = ON</code>, set per connection. And in SQLite a non-INTEGER primary key accepts NULL for legacy reasons, so I add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT NULL</code> explicitly.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a foreign key be NULL?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, unless you also declare it <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT NULL</code>. A NULL foreign key means no parent, like a guest order. With the default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MATCH SIMPLE</code>, a composite key with any NULL column is not checked at all.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a foreign key point at something other than the primary key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, at any column set with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNIQUE</code> or primary key constraint. PostgreSQL rejects other targets with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">there is no unique constraint matching given keys for referenced table</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Natural key or surrogate key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <strong style="color:#ffca28;">surrogate key</strong> (an identity or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INTEGER</code> id) never changes and is small, so foreign keys stay stable. A <strong style="color:#ffca28;">natural key</strong> like an email can change, and then every child row must change with it. I usually use a surrogate primary key plus a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNIQUE</code> constraint on the natural key.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why might a delete on the parent table be slow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For every deleted parent row the database must look for referencing child rows. Without an index on the foreign key column that is a scan of the child table per deleted row.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do foreign keys hurt write performance?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A little: each child insert does an index lookup in the parent, and each parent delete a lookup in the child. That is usually far cheaper than cleaning up orphans later; teams that drop them for speed tend to regret it.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Primary key | The column(s) that uniquely identify each row; unique and NOT NULL, at most one per table |
| Composite key | A key made of several columns; the combination is unique |
| Surrogate key vs natural key | A generated meaningless id vs a real-world unique value like an email |
| Rowid alias | SQLite: a column declared \`INTEGER PRIMARY KEY\` is the hidden rowid |
| Foreign key | Column(s) whose values must match a primary or unique key of a parent row, or be NULL |
| Referential integrity | Every reference points at a row that exists |
| Parent table / child table | The referenced table / the table holding the foreign key |
| Orphan row | A child row whose parent does not exist |
| Index | A sorted lookup structure; created automatically for primary and unique keys, not for PostgreSQL foreign keys |

**Conclusion:** A primary key gives every row of a table its own identity: unique, not NULL, one per table. A foreign key is a reference from a child row to that identity in another table, and the database checks it on both sides: a child cannot point at a missing parent, and a referenced parent cannot disappear unless the \`ON DELETE\` rule says what happens to the children. Know the engine details an interviewer likes to probe: PostgreSQL does not index foreign key columns for you, MySQL InnoDB does, SQLite does not enforce foreign keys until \`PRAGMA foreign_keys = ON\`, and SQLite lets NULL into non-integer primary keys unless you say \`NOT NULL\`.`,
    examples: [
      {
        label: `Follow the foreign key: each order joined to the customer its customer_id points at`,
        code: `SELECT o.id AS order_id, o.customer_id, c.name, o.total
FROM orders AS o
LEFT JOIN customers AS c ON c.id = o.customer_id
ORDER BY o.id;`,
      },
      {
        label: `SQLite: foreign keys are off until you switch them on, so an orphan slips in`,
        code: `-- 0 means foreign key enforcement is off on this connection
PRAGMA foreign_keys;

-- Customer 99 does not exist, but the insert succeeds
INSERT INTO orders (id, customer_id, total, placed) VALUES (8, 99, 10, '2024-03-15');

-- foreign_key_check lists every row that breaks a foreign key
PRAGMA foreign_key_check;

-- Switch enforcement on (per connection, outside a transaction)
PRAGMA foreign_keys = ON;
PRAGMA foreign_keys;`,
      },
      {
        label: `Ask SQLite which column is the primary key and where the foreign key points`,
        code: `SELECT name, type, pk FROM pragma_table_info('customers') ORDER BY cid;

SELECT "table" AS parent_table, "from" AS child_column, "to" AS parent_column, on_delete
FROM pragma_foreign_key_list('orders');`,
      },
      {
        label: `PostgreSQL: the primary key and UNIQUE get indexes, the foreign key column does not`,
        code: `SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `What is the difference between a primary key and a unique constraint?`,
    difficulty: "easy",
    seoDescription: `Primary key vs UNIQUE: both block duplicates, but there is only one primary key, it is never NULL, and it is the row identity. NULL rules per engine.`,
    description: `**Question presented to candidate:**
"Our \`users\` table has an \`id\` primary key, but \`email\` and \`username\` must also be unique. Both a primary key and a unique constraint stop duplicates, so what is actually different about them, and how do you decide which column gets which?"

**What a strong answer should cover:**
- Both reject duplicate values and both are backed by a unique index
- A table has at most one primary key but any number of unique constraints
- The primary key is always NOT NULL; a unique column allows NULL, and by default several NULLs, because NULL is not equal to NULL
- Engine differences: PostgreSQL 15+ \`NULLS NOT DISTINCT\`, SQL Server allowing only one NULL, SQLite letting NULL into some primary keys
- The primary key is the identity other tables reference (a foreign key can also target a unique key), and in MySQL InnoDB it is the clustered index
- Typical design: a stable surrogate primary key plus unique constraints on natural keys like email

**Code / implementation expected:** Optional — a table with one \`PRIMARY KEY\` and two \`UNIQUE\` columns, showing the NULL behaviour.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  phone TEXT UNIQUE
);
CREATE TABLE api_keys (
  id INTEGER PRIMARY KEY,
  owner_email TEXT NOT NULL REFERENCES users(email),
  label TEXT NOT NULL
);
INSERT INTO users (id, email, username, phone) VALUES
  (1, 'asha@example.com', 'asha', '+1-555-0101'),
  (2, 'ben@example.com', 'benk', NULL),
  (3, 'chen@example.com', 'chen', '+1-555-0103'),
  (4, 'dara@example.com', 'dara_d', NULL),
  (5, 'eli@example.com', 'eli', NULL),
  (6, 'fay@example.com', 'fayw', '+1-555-0106');
INSERT INTO api_keys (id, owner_email, label) VALUES
  (1, 'asha@example.com', 'ci-runner'),
  (2, 'asha@example.com', 'laptop'),
  (3, 'chen@example.com', 'billing-sync'),
  (4, 'fay@example.com', 'mobile');
\`\`\``,
    answer: `**Target Audience:** Beginners who know what a table is, and candidates who want the NULL details interviewers like to probe.
**Difficulty:** Easy
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15, both run for this page. SQL Server and MySQL behaviour is cited from their documentation.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and error message shown was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

Think of a passport office. Every citizen has exactly one passport number, printed on every document the office keeps about them. That number is how every other office refers to the person: the tax office, the border records, the visa files.

Citizens also have other things that must be unique: no two people may register the same email for notifications, and no two may hold the same phone number for SMS codes. But some people simply have no phone. That is fine: "no phone" is not a duplicate of anyone else's "no phone".

- The **passport number** is the **primary key**: one per person, never missing, the thing everyone else refers to.
- The **email** and **phone** rules are **unique constraints**: extra "no duplicates" rules, where a missing value is allowed unless you say otherwise.

Both stop duplicates. The difference is in the details: how many you may have, whether a value may be missing, and which one other tables use to point at the row.

## 2. What They Have in Common

📌 **Interview term: primary key** — the column or columns that identify each row of a table: unique, never NULL, at most one per table. The sibling page [What is the difference between a primary key and a foreign key?](/interview-question/what-is-the-difference-between-a-primary-key-and-a-foreign-key) covers how other tables reference it.

📌 **Interview term: unique constraint** — a rule that no two rows may share the same non-NULL value in a column or set of columns. Declared as \`UNIQUE\` on a column or \`UNIQUE (a, b)\` as a table constraint.

📌 **Interview term: candidate key / alternate key** — any column set that could serve as the primary key (unique and always present) is a **candidate key**. You pick one as the primary key; the others become **alternate keys**, which you protect with \`UNIQUE NOT NULL\`. In the schema, \`email\` and \`username\` are alternate keys.

Duplicate values are rejected by both, with the same kind of error. On PostgreSQL 16, inserting a second \`asha@example.com\`:

~~~text
ERROR:  duplicate key value violates unique constraint "users_email_key"
DETAIL:  Key (email)=(asha@example.com) already exists.
~~~

SQLite gives \`UNIQUE constraint failed: users.email\`. Note that PostgreSQL calls both kinds "unique constraint" in the message; the name (\`users_pkey\` vs \`users_email_key\`) tells you which one fired.

Both are enforced with a unique index, created automatically. The second example lists the indexes SQLite made for \`users\`:

~~~text
name | unique | origin
sqlite_autoindex_users_1 | 1 | u
sqlite_autoindex_users_2 | 1 | u
sqlite_autoindex_users_3 | 1 | u

index_name | column_name
sqlite_autoindex_users_1 | email
sqlite_autoindex_users_2 | username
sqlite_autoindex_users_3 | phone
~~~

📌 **Interview term: unique index** — a B-tree index that refuses duplicate entries. It is the mechanism; the constraint is the rule. SQLite names its automatic ones \`sqlite_autoindex_<table>_N\`, and \`origin\` is \`u\` for a \`UNIQUE\` constraint (a non-integer primary key would show \`pk\`). There is no index for \`id\` here because \`INTEGER PRIMARY KEY\` is the rowid itself, the key the table is stored by.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 290" role="img" aria-label="One primary key and several unique constraints on the users table, with what each one allows">
  <rect class="d-box-muted" x="20" y="20" width="300" height="40" rx="8"/>
  <text class="d-text" x="170" y="46" text-anchor="middle">users</text>
  <rect class="d-box-accent" x="20" y="72" width="300" height="44" rx="6"/>
  <text class="d-text" x="40" y="100">id</text>
  <text class="d-accent" x="300" y="100" text-anchor="end">PRIMARY KEY</text>
  <rect class="d-box" x="20" y="126" width="300" height="44" rx="6"/>
  <text class="d-text" x="40" y="154">email</text>
  <text class="d-sub" x="300" y="154" text-anchor="end">UNIQUE NOT NULL</text>
  <rect class="d-box" x="20" y="180" width="300" height="44" rx="6"/>
  <text class="d-text" x="40" y="208">username</text>
  <text class="d-sub" x="300" y="208" text-anchor="end">UNIQUE NOT NULL</text>
  <rect class="d-box" x="20" y="234" width="300" height="44" rx="6"/>
  <text class="d-text" x="40" y="262">phone</text>
  <text class="d-sub" x="300" y="262" text-anchor="end">UNIQUE</text>
  <rect class="d-box-accent" x="420" y="72" width="320" height="44" rx="8"/>
  <text class="d-text" x="580" y="100" text-anchor="middle">exactly one, never NULL</text>
  <rect class="d-box" x="420" y="153" width="320" height="44" rx="8"/>
  <text class="d-text" x="580" y="181" text-anchor="middle">alternate keys, NOT NULL added</text>
  <rect class="d-box" x="420" y="234" width="320" height="44" rx="8"/>
  <text class="d-text" x="580" y="262" text-anchor="middle">unique when present, many NULLs</text>
  <path class="d-edge-accent" d="M 326 94 L 414 94"/>
  <path class="d-edge" d="M 326 148 L 370 148 L 370 175 L 414 175"/>
  <path class="d-edge" d="M 326 202 L 370 202 L 370 175"/>
  <path class="d-edge-dashed" d="M 326 256 L 414 256"/>
</svg>

The primary key is the one identity of the row. \`email\` and \`username\` are alternate keys: unique and required. \`phone\` is unique only among the rows that have a phone.

## 3. The Real Differences

### Difference 1: one primary key, many unique constraints

A second \`PRIMARY KEY\` on one table fails on PostgreSQL with \`multiple primary keys for table "t3" are not allowed\`. Unique constraints have no limit; this table has three.

### Difference 2: NULL

A primary key column is NOT NULL, whether you write it or not. A unique column allows NULL, and the first example shows that **several** rows can have a NULL phone at the same time:

~~~text
id | username | phone
2 | benk | NULL
4 | dara_d | NULL
5 | eli | NULL

users | with_phone | distinct_phones
6 | 3 | 3
~~~

Three users have no phone, yet \`phone\` is \`UNIQUE\`. This is not a loophole: the uniqueness test compares values with \`=\`, and \`NULL = NULL\` is not true (it is unknown), so two NULLs never count as duplicates. See [How does SQL handle NULL values?](/interview-question/how-does-sql-handle-null-values) for the three-valued logic behind that. \`COUNT(phone)\` and \`COUNT(DISTINCT phone)\` both skip NULLs, which is why they agree at 3.

The engines differ here, and interviewers know it:

| Engine | Several NULLs in a UNIQUE column? | Source |
| :--- | :--- | :--- |
| PostgreSQL 16 | Yes by default; one with \`UNIQUE NULLS NOT DISTINCT\` | run for this page; option added in [PostgreSQL 15](https://www.postgresql.org/docs/15/release-15.html) |
| SQLite 3.45 | Yes | run for this page |
| MySQL (InnoDB) | Yes | [MySQL CREATE INDEX docs](https://dev.mysql.com/doc/refman/8.4/en/create-index.html#create-index-unique) |
| SQL Server | Only one NULL per column | [Microsoft: unique and check constraints](https://learn.microsoft.com/en-us/sql/relational-databases/tables/unique-constraints-and-check-constraints) |

On PostgreSQL 16, \`CREATE TABLE u2 (e TEXT UNIQUE NULLS NOT DISTINCT)\` followed by inserting two NULLs gave:

~~~text
ERROR:  duplicate key value violates unique constraint "u2_e_key"
DETAIL:  Key (e)=(null) already exists.
~~~

The fourth example reads PostgreSQL's catalog for \`users\`. Constraint type \`p\` is the primary key and \`u\` the unique constraints; \`attnotnull\` shows \`id\` is NOT NULL even though the schema never wrote \`NOT NULL\` for it, while \`phone\` is nullable:

~~~text
conname | contype | attname | attnotnull
users_pkey | p | id | t
users_email_key | u | email | t
users_phone_key | u | phone | f
users_username_key | u | username | t
~~~

**SQLite exception.** SQLite only forces NOT NULL on \`INTEGER PRIMARY KEY\` columns (and in \`WITHOUT ROWID\` tables). A \`code TEXT PRIMARY KEY\` accepted two NULL keys when run for this page; the [SQLite docs](https://sqlite.org/lang_createtable.html) call this a long-standing bug kept for compatibility. Add \`NOT NULL\` yourself.

**Composite keys and NULL.** A composite unique constraint \`UNIQUE (a, b)\` treats a row as a possible duplicate only when *all* its columns are non-NULL. So \`(1, NULL)\` can be inserted twice. A composite primary key has no such gap, because every column is NOT NULL: on PostgreSQL, \`PRIMARY KEY (a, b)\` rejected \`(1, NULL)\` with \`null value in column "b" of relation "t2" violates not-null constraint\`.

### Difference 3: role in the schema

The primary key is the row's official identity:

- Other tables usually reference it with a foreign key. A foreign key may also reference a \`UNIQUE\` column, as \`api_keys.owner_email\` does here; the third example joins along it:

~~~text
username | label
asha | ci-runner
asha | laptop
chen | billing-sync
fayw | mobile
~~~

- Tools assume it: ORMs use it to track objects, and PostgreSQL logical replication uses the primary key as the default replica identity for replicating updates and deletes ([PostgreSQL docs](https://www.postgresql.org/docs/16/logical-replication-publication.html)).
- In MySQL InnoDB the primary key is the **clustered index**: rows are stored in primary key order, and every secondary index stores the primary key value to find the row ([InnoDB index types](https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html)). A wide primary key there makes every other index wider. More in [What is the difference between a clustered and non-clustered index?](/interview-question/what-is-the-difference-between-a-clustered-and-non-clustered-index)

📌 **Interview term: clustered index** — an index that *is* the table storage, so rows are kept in its key order. InnoDB and SQL Server (by default) cluster on the primary key; PostgreSQL and SQLite rowid tables do not cluster on a unique constraint.

## 4. Side by Side

| | Primary key | Unique constraint |
| :--- | :--- | :--- |
| Rejects duplicates | Yes | Yes, among non-NULL values |
| Per table | At most one | Any number |
| NULL allowed | No (SQLite non-integer keys excepted) | Yes, several by default (one in SQL Server) |
| Index created | Yes, unique | Yes, unique |
| Target of a foreign key | Yes, the usual target | Yes |
| Clustered by default | InnoDB and SQL Server: yes | No |
| Typical use | Surrogate id, the row identity | Natural keys: email, username, SKU |

## 5. Unique Constraint vs Unique Index

📌 **Interview term: partial unique index** — a unique index with a \`WHERE\` clause, enforcing uniqueness only among some rows, for example \`CREATE UNIQUE INDEX ON users (email) WHERE deleted_at IS NULL\` for soft-deleted users. It can be written in PostgreSQL and SQLite, but it is not a constraint, so it cannot be the target of a foreign key (PostgreSQL 16: \`there is no unique constraint matching given keys for referenced table\`), and an upsert must repeat its predicate: \`ON CONFLICT (email) DO NOTHING\` alone fails with \`there is no unique or exclusion constraint matching the ON CONFLICT specification\`, while \`ON CONFLICT (email) WHERE deleted_at IS NULL DO NOTHING\` works. The soft-delete pattern is worked through in [Advanced UPSERT patterns](/interview-question/advanced-upsert-patterns-conditional-updates-xmax-detection-and-soft-delete-awar).

A plain \`UNIQUE\` constraint is the better default: it documents intent in the schema, shows up in \`information_schema.table_constraints\`, and works with \`ON CONFLICT (email)\` in an [UPSERT](/interview-question/what-is-an-upsert).

## 6. Verified: Running the Code

The three SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above). The PostgreSQL example, the PostgreSQL error messages and the \`NULLS NOT DISTINCT\` test were run on PostgreSQL 16.15 in a scratch database.

Example 1, several NULLs in a UNIQUE column:

~~~text
id | username | phone
2 | benk | NULL
4 | dara_d | NULL
5 | eli | NULL

users | with_phone | distinct_phones
6 | 3 | 3
~~~

Example 2, SQLite automatic indexes:

~~~text
name | unique | origin
sqlite_autoindex_users_1 | 1 | u
sqlite_autoindex_users_2 | 1 | u
sqlite_autoindex_users_3 | 1 | u

index_name | column_name
sqlite_autoindex_users_1 | email
sqlite_autoindex_users_2 | username
sqlite_autoindex_users_3 | phone
~~~

Example 3, a foreign key that targets a UNIQUE column:

~~~text
username | label
asha | ci-runner
asha | laptop
chen | billing-sync
fayw | mobile
~~~

Example 4, PostgreSQL constraint catalog:

~~~text
conname | contype | attname | attnotnull
users_pkey | p | id | t
users_email_key | u | email | t
users_phone_key | u | phone | f
users_username_key | u | username | t
~~~

## Common Pitfalls

- **Writing \`UNIQUE\` and forgetting \`NOT NULL\`.** If every user must have an email, \`email TEXT UNIQUE\` is not enough: any number of users can have no email at all.
- **Expecting a composite unique constraint to block \`(1, NULL)\` twice.** It does not, unless \`NULLS NOT DISTINCT\` (PostgreSQL 15+) is used or the columns are NOT NULL.
- **Porting from SQL Server.** A schema that relied on "only one NULL" will accept many NULLs on PostgreSQL, MySQL and SQLite.
- **Making a mutable or wide natural key the primary key.** Every foreign key copy must change with it, and in InnoDB every secondary index carries it.
- **Using a partial unique index where a foreign key must point.** Only a real constraint or full unique index qualifies.
- **Adding a separate index on a column that is already \`UNIQUE\`.** The constraint already created one; a second is pure write cost.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Same core job:</strong> <span style="color:#f0e2c8;">Both a <strong style="color:#ffca28;">primary key</strong> and a <strong style="color:#ffca28;">unique constraint</strong> reject duplicate values, and both are enforced with a unique index the database creates for you.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Count:</strong> <span style="color:#f0e2c8;">A table has at most one primary key, its main identity. It can have any number of unique constraints, the <strong style="color:#ffca28;">alternate keys</strong> like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">email</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">username</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. NULL:</strong> <span style="color:#f0e2c8;">The primary key is always NOT NULL. A unique column allows NULL, and in PostgreSQL, SQLite and MySQL several rows may hold NULL, because NULL is not equal to NULL. SQL Server allows only one, and PostgreSQL 15 added <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NULLS NOT DISTINCT</code> to get that behaviour.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Role:</strong> <span style="color:#f0e2c8;">The primary key is what other tables reference and what ORMs and replication tools use as row identity. A foreign key can also point at a unique column. In MySQL InnoDB the primary key is also the clustered index, so its choice affects storage.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Design:</strong> <span style="color:#f0e2c8;">I give tables a stable surrogate primary key, then put <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNIQUE NOT NULL</code> on the natural keys. If an email changes, only one row changes, and the uniqueness rule still holds.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a unique constraint the same as a unique index?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The constraint is the rule; the index is how it is enforced. In PostgreSQL a constraint creates an index, but a bare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CREATE UNIQUE INDEX</code> can do things a constraint cannot, like a partial index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE deleted_at IS NULL</code>. Only a constraint (or a non-partial unique index) can be the target of a foreign key.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you allow only one NULL?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In PostgreSQL 15+, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNIQUE NULLS NOT DISTINCT</code>. Before that, a partial unique index on a constant: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CREATE UNIQUE INDEX ON t ((true)) WHERE col IS NULL</code>. In SQL Server, the default already allows only one NULL; a filtered index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE col IS NOT NULL</code> gives the many-NULLs behaviour.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a primary key span several columns?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, a composite key like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PRIMARY KEY (order_id, product_id)</code>. All its columns become NOT NULL. A composite unique constraint is satisfied whenever any of its columns is NULL, unless <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NULLS NOT DISTINCT</code> is used.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just make email the primary key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It works, but emails change, and every foreign key copy of it must change too. It is also wider than an integer, so every child index is bigger. A surrogate key plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNIQUE</code> on email avoids both.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a table need a primary key at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">SQL does not require one, but almost every table should have one: without it you cannot reliably address a single row, logical replication in PostgreSQL needs a replica identity for updates and deletes, and InnoDB falls back to clustering on the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNIQUE NOT NULL</code> index, or on a hidden generated row id.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Primary key | The table's one identity: unique, NOT NULL, at most one per table |
| Unique constraint | No two rows share the same non-NULL value in the column(s) |
| Candidate key / alternate key | Any column set that could be the primary key / the candidates not chosen |
| Unique index | The index that enforces uniqueness; the mechanism behind both constraints |
| Clustered index | An index that is the table storage itself; InnoDB clusters on the primary key |
| Partial unique index | A unique index with a WHERE clause, uniqueness among some rows only |

**Conclusion:** A primary key and a unique constraint both forbid duplicates and both get a unique index, but they play different roles. The primary key is the single, never-NULL identity of the row that foreign keys, ORMs and replication rely on; a unique constraint is an extra rule, any number per table, that by default lets many rows be NULL because NULL never equals NULL. Know the exceptions: SQL Server allows one NULL, PostgreSQL 15+ can do the same with \`NULLS NOT DISTINCT\`, and SQLite lets NULL into non-integer primary keys. The usual design is a stable surrogate primary key plus \`UNIQUE NOT NULL\` on natural keys.`,
    examples: [
      {
        label: `A UNIQUE column holds several NULLs: unique means unique among the values that exist`,
        code: `SELECT id, username, phone
FROM users
WHERE phone IS NULL
ORDER BY id;

SELECT COUNT(*) AS users, COUNT(phone) AS with_phone, COUNT(DISTINCT phone) AS distinct_phones
FROM users;`,
      },
      {
        label: `SQLite: each UNIQUE constraint creates its own index; INTEGER PRIMARY KEY needs none`,
        code: `SELECT name, "unique", origin
FROM pragma_index_list('users')
ORDER BY name;

SELECT ii.name AS index_name, ic.name AS column_name
FROM pragma_index_list('users') AS ii
JOIN pragma_index_info(ii.name) AS ic
ORDER BY index_name;`,
      },
      {
        label: `A foreign key may target a UNIQUE column, not only the primary key`,
        code: `SELECT u.username, k.label
FROM api_keys AS k
JOIN users AS u ON u.email = k.owner_email
ORDER BY u.username, k.label;`,
      },
      {
        label: `PostgreSQL: the catalog shows one constraint of type p and three of type u, and the primary key column became NOT NULL`,
        code: `SELECT c.conname, c.contype, a.attname, a.attnotnull
FROM pg_constraint AS c
JOIN pg_attribute AS a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
WHERE c.conrelid = 'users'::regclass
ORDER BY c.contype, c.conname;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `What is a CHECK constraint?`,
    difficulty: "easy",
    seoDescription: `A CHECK constraint is a row rule enforced on every INSERT and UPDATE. Only FALSE rejects a row, so NULL passes. Limits and engine differences, all run.`,
    description: `**Question presented to candidate:**
"We keep finding negative prices and end dates before start dates in our products table. What is a CHECK constraint, how would you use one here, and what are its limits?"

**What a strong answer should cover:**
- A CHECK constraint is a boolean expression every row must satisfy on INSERT and UPDATE; a row is rejected only when the expression is FALSE
- A NULL (unknown) result passes, so CHECK does not replace NOT NULL
- Column-level vs table-level CHECKs, and naming constraints so errors are readable
- Limits: only the current row (no subqueries or other tables in PostgreSQL and SQLite); cross-row or cross-table rules need UNIQUE, foreign keys, exclusion constraints or triggers
- Adding one to a live table: PostgreSQL \`NOT VALID\` then \`VALIDATE CONSTRAINT\`; SQLite cannot add one with ALTER TABLE
- Engine facts: MySQL ignored CHECK before 8.0.16; SQLite type affinity can let a text value through a numeric check

**Code / implementation expected:** Yes — add CHECKs for price, a status list and a date window, and show what happens to a bad row and to a NULL.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL CHECK (price >= 0),
  discount_pct INTEGER CHECK (discount_pct BETWEEN 0 AND 90),
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'retired')),
  sale_starts DATE,
  sale_ends DATE,
  CONSTRAINT sale_window_ok CHECK (sale_ends >= sale_starts)
);
INSERT INTO products (id, name, price, discount_pct, status, sale_starts, sale_ends) VALUES
  (1, 'Desk lamp', 39, 10, 'active', '2024-06-01', '2024-06-30'),
  (2, 'Office chair', 189, NULL, 'active', NULL, NULL),
  (3, 'Monitor arm', 65, 25, 'active', '2024-07-01', NULL),
  (4, 'Cable tray', 0, NULL, 'draft', NULL, NULL),
  (5, 'Footrest', 29, 90, 'retired', '2024-01-01', '2024-01-31'),
  (6, 'Standing mat', 45, 0, 'active', NULL, NULL);
\`\`\``,
    answer: `**Target Audience:** Beginners who have written CREATE TABLE and want the database to refuse bad data, and candidates who need the NULL and engine details.
**Difficulty:** Easy
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15, both run for this page. MySQL behaviour is cited from its manual.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and error message shown was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

A bouncer at a club door has a short list of rules: you must be over 18, you must have a ticket for tonight. He checks every single person, every time, no matter which entrance they use or who sent them. He does not care whether the ticket office already checked; he checks again.

A CHECK constraint is that bouncer for a table. You write the rule once, in the table definition, and from then on every INSERT and every UPDATE from every application, script and console session is checked against it. A negative price or a sale that ends before it starts simply cannot get in.

There is one twist, and it is the thing interviewers ask about: the bouncer only turns people away when the rule is clearly broken. If he cannot tell (the date of birth field is blank), he lets them in. In SQL, "cannot tell" is NULL.

## 2. What a CHECK Constraint Is

📌 **Interview term: CHECK constraint** — a boolean expression declared on a table that every row must satisfy. The database evaluates it whenever a row is inserted or updated and fails the statement if the result is FALSE.

📌 **Interview term: column constraint vs table constraint** — a column constraint is written next to one column and refers to it (\`price NUMERIC CHECK (price >= 0)\`); a table constraint is written as its own line and may refer to several columns of the row (\`CHECK (sale_ends >= sale_starts)\`). Functionally both are checks on the row; the table form is needed for multi-column rules.

📌 **Interview term: named constraint** — writing \`CONSTRAINT sale_window_ok CHECK (...)\` gives the rule a name, which then appears in errors and is what you \`DROP CONSTRAINT\` later. Without a name the engine invents one: PostgreSQL called the price check \`products_price_check\`.

The schema has four checks: \`price >= 0\`, a discount range, a list of allowed statuses, and a named date window. Breaking them on PostgreSQL 16:

~~~sql
INSERT INTO products (id, name, price, status) VALUES (7, 'Negative price', -5, 'active');
~~~

~~~text
ERROR:  new row for relation "products" violates check constraint "products_price_check"
DETAIL:  Failing row contains (7, Negative price, -5, null, active, null, null).
~~~

~~~sql
UPDATE products SET sale_ends = '2024-05-01' WHERE id = 1;
~~~

~~~text
ERROR:  new row for relation "products" violates check constraint "sale_window_ok"
DETAIL:  Failing row contains (1, Desk lamp, 39, 10, active, 2024-06-01, 2024-05-01).
~~~

SQLite reports the same violations as \`CHECK constraint failed: price >= 0\` (the expression, for an unnamed check) and \`CHECK constraint failed: sale_window_ok\` (the name). Updates are checked exactly like inserts.

## 3. The NULL Rule: Only FALSE Is Rejected

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="A CHECK expression has three possible results: true accepts the row, null accepts the row, false rejects it">
  <defs>
    <marker id="sql02q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="110" width="200" height="70" rx="10"/>
  <text class="d-text" x="120" y="140" text-anchor="middle">INSERT or UPDATE</text>
  <text class="d-sub" x="120" y="162" text-anchor="middle">the new row</text>
  <rect class="d-box-accent" x="290" y="110" width="200" height="70" rx="10"/>
  <text class="d-text" x="390" y="140" text-anchor="middle">evaluate CHECK</text>
  <text class="d-sub" x="390" y="162" text-anchor="middle">price &gt;= 0</text>
  <rect class="d-box" x="560" y="20" width="180" height="64" rx="10"/>
  <text class="d-text" x="650" y="48" text-anchor="middle">TRUE</text>
  <text class="d-sub" x="650" y="70" text-anchor="middle">row accepted</text>
  <rect class="d-box-muted" x="560" y="113" width="180" height="64" rx="10"/>
  <text class="d-text" x="650" y="141" text-anchor="middle">NULL (unknown)</text>
  <text class="d-sub" x="650" y="163" text-anchor="middle">row accepted</text>
  <rect class="d-box-accent" x="560" y="206" width="180" height="64" rx="10"/>
  <text class="d-text" x="650" y="234" text-anchor="middle">FALSE</text>
  <text class="d-accent" x="650" y="256" text-anchor="middle">statement fails</text>
  <path class="d-edge" d="M 222 145 L 286 145" marker-end="url(#sql02q3-arrow)"/>
  <path class="d-edge" d="M 492 130 L 525 130 L 525 52 L 556 52" marker-end="url(#sql02q3-arrow)"/>
  <path class="d-edge-dashed" d="M 492 145 L 556 145" marker-end="url(#sql02q3-arrow)"/>
  <path class="d-edge-accent" d="M 492 160 L 525 160 L 525 238 L 556 238" marker-end="url(#sql02q3-arrow)"/>
</svg>

A comparison involving NULL is neither true nor false; it is **unknown**, which SQL represents as NULL. The SQL standard says a CHECK is violated only when the expression is FALSE, so unknown passes. The first example evaluates each check expression on the seeded rows:

~~~text
id | name | discount_pct | discount_check | sale_starts | sale_ends | window_check
1 | Desk lamp | 10 | 1 | 2024-06-01 | 2024-06-30 | 1
2 | Office chair | NULL | NULL | NULL | NULL | NULL
3 | Monitor arm | 25 | 1 | 2024-07-01 | NULL | NULL
4 | Cable tray | NULL | NULL | NULL | NULL | NULL
5 | Footrest | 90 | 1 | 2024-01-01 | 2024-01-31 | 1
6 | Standing mat | 0 | 1 | NULL | NULL | NULL
~~~

SQLite prints a true comparison as 1. Office chair has no discount: \`discount_check\` is NULL and the row was accepted. Monitor arm has a start date and no end date: \`window_check\` is NULL and it was accepted, which is exactly what we want for an open-ended sale. But it also means \`CHECK (price >= 0)\` alone would allow a NULL price. Required values need \`NOT NULL\` as well, which is why the schema says \`price NUMERIC NOT NULL CHECK (price >= 0)\`. See [What are NOT NULL, DEFAULT and other column constraints?](/interview-question/what-are-not-null-default-and-other-column-constraints) and [How does SQL handle NULL values?](/interview-question/how-does-sql-handle-null-values)

📌 **Interview term: three-valued logic** — SQL conditions evaluate to TRUE, FALSE or UNKNOWN. \`WHERE\` keeps only TRUE rows, but \`CHECK\` rejects only FALSE rows, so UNKNOWN is treated oppositely by the two.

If you want "both dates or neither", say so explicitly: \`CHECK ((sale_starts IS NULL) = (sale_ends IS NULL))\`.

## 4. Watching Bad Rows Bounce

A failing statement cannot be a runnable example here (it would stop with an error), so the second example uses SQLite's \`INSERT OR IGNORE\`, which skips rows that violate a CHECK, NOT NULL, UNIQUE or PRIMARY KEY constraint instead of failing the statement. Of four rows, only Wrist rest satisfies all the checks:

~~~text
rows_inserted
1

id | name | price | status
10 | Wrist rest | 15 | draft
~~~

The negative price, the \`on_sale\` status and the backwards sale window were all rejected. In PostgreSQL there is no \`OR IGNORE\` for CHECK violations (\`ON CONFLICT\` only handles unique and exclusion constraint conflicts); a bad row fails the whole statement, and inside a transaction you would roll back or use a savepoint.

## 5. What a CHECK Cannot Do

A CHECK looks at one row, in isolation, at the moment it is written.

- **No subqueries.** \`CHECK (n > (SELECT 1))\` fails at CREATE TABLE time: PostgreSQL says \`cannot use subquery in check constraint\`, SQLite says \`subqueries prohibited in CHECK constraints\`.
- **No other rows.** "At most 3 active products per category" or "no overlapping bookings" cannot be a CHECK. Use a \`UNIQUE\` constraint, a partial unique index, a PostgreSQL exclusion constraint, or a [trigger](/interview-question/what-is-a-database-trigger).
- **No other tables.** That is what a foreign key is for: [What is the difference between a primary key and a foreign key?](/interview-question/what-is-the-difference-between-a-primary-key-and-a-foreign-key)
- **Do not hide lookups in functions.** PostgreSQL lets a CHECK call a user function, and its [CREATE TABLE docs](https://www.postgresql.org/docs/16/sql-createtable.html) warn that CHECK expressions are assumed immutable: the check is not re-run when other data changes, so a function that reads another table produces a rule that goes stale.

## 6. Engine Differences You Must Know

### SQLite: type affinity can slip past a numeric check

📌 **Interview term: type affinity** — SQLite stores values by their actual type, not the declared one; a column declared \`NUMERIC\` only *prefers* numbers and will keep \`'free'\` as text. See [What is the difference between CHAR, VARCHAR, and TEXT?](/interview-question/what-is-the-difference-between-char-varchar-and-text) for more on SQLite types.

SQLite compares values of different storage classes by a fixed order in which any text is greater than any number. So \`'free' >= 0\` is true and the third example's insert succeeds:

~~~text
id | name | price | stored_type | check_result
4 | Cable tray | 0 | integer | 1
11 | Sample pack | free | text | 1
~~~

On PostgreSQL the same insert fails before any CHECK runs: \`invalid input syntax for type numeric: "free"\`. In SQLite, guard the type too, \`CHECK (typeof(price) IN ('integer', 'real') AND price >= 0)\`, or declare the table \`STRICT\` (SQLite 3.37.0+, [docs](https://sqlite.org/stricttables.html)).

### SQLite: no ALTER TABLE ADD CONSTRAINT

\`ALTER TABLE o ADD CONSTRAINT q CHECK (qty > 0)\` is a syntax error in SQLite (\`near "constraint": syntax error\`). Adding a check means rebuilding the table: create a new one, copy the rows, drop and rename. SQLite also has \`PRAGMA ignore_check_constraints = ON\`, which disables checks for the connection; with it on, a \`-7\` went into a \`CHECK (n > 0)\` column in the run for this page.

### PostgreSQL: adding a CHECK to a live table

\`ALTER TABLE ... ADD CONSTRAINT ... CHECK (...)\` scans every existing row and fails if one breaks the rule (\`check constraint "qty_pos" of relation "orders" is violated by some row\`), while holding a lock that blocks writes. For big tables, PostgreSQL offers a two-step path ([ALTER TABLE docs](https://www.postgresql.org/docs/16/sql-altertable.html)):

1. \`ADD CONSTRAINT ... NOT VALID\` — returns at once; new and updated rows are checked from now on, old rows are not.
2. \`VALIDATE CONSTRAINT name\` — scans old rows later, with a lock that does not block normal reads and writes.

The fourth example adds a \`NOT VALID\` check and reads the catalog; \`convalidated\` is \`f\` only for the new one:

~~~text
conname | convalidated | definition
name_not_blank | f | CHECK ((length(TRIM(BOTH FROM name)) > 0)) NOT VALID
products_discount_pct_check | t | CHECK (((discount_pct >= 0) AND (discount_pct <= 90)))
products_price_check | t | CHECK ((price >= (0)::numeric))
products_status_check | t | CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'retired'::text])))
sale_window_ok | t | CHECK ((sale_ends >= sale_starts))
~~~

In a test run for this page, after \`NOT VALID\` a new bad row was still rejected, and \`VALIDATE CONSTRAINT\` failed while an old bad row existed, then succeeded once that row was fixed.

### MySQL: CHECK was ignored before 8.0.16

The [MySQL manual](https://dev.mysql.com/doc/refman/8.0/en/create-table-check-constraints.html) says that before 8.0.16 the CHECK clause was parsed and ignored, and from 8.0.16 it is enforced. A schema written for an older MySQL may contain checks that existing data has never respected. MySQL also accepts \`NOT ENFORCED\` to store a check without applying it.

## 7. CHECK vs the Alternatives

| Rule | Best tool | Why |
| :--- | :--- | :--- |
| Value range, format, allowed list, column vs column in the same row | \`CHECK\` | Cheap, declarative, no extra objects |
| Value must exist in another table | Foreign key | Checked on both sides, unlike a CHECK |
| No duplicates | \`UNIQUE\` / primary key | Needs to see other rows |
| No overlapping ranges | PostgreSQL exclusion constraint | Cross-row rule with an index behind it |
| Allowed list that changes often | Lookup table + foreign key | New values with an INSERT, not a migration |
| Same rule on many columns | PostgreSQL \`DOMAIN\` | \`CREATE DOMAIN pos_int AS int CHECK (VALUE > 0)\`; \`(-1)::pos_int\` failed with \`value for domain pos_int violates check constraint "pos_int_check"\` |

## 8. Verified: Running the Code

The three SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above). The PostgreSQL example and every PostgreSQL error above were run on PostgreSQL 16.15 in a scratch database with the same schema.

Example 1, NULL results pass:

~~~text
id | name | discount_pct | discount_check | sale_starts | sale_ends | window_check
1 | Desk lamp | 10 | 1 | 2024-06-01 | 2024-06-30 | 1
2 | Office chair | NULL | NULL | NULL | NULL | NULL
3 | Monitor arm | 25 | 1 | 2024-07-01 | NULL | NULL
4 | Cable tray | NULL | NULL | NULL | NULL | NULL
5 | Footrest | 90 | 1 | 2024-01-01 | 2024-01-31 | 1
6 | Standing mat | 0 | 1 | NULL | NULL | NULL
~~~

Example 2, INSERT OR IGNORE keeps only the valid row:

~~~text
rows_inserted
1

id | name | price | status
10 | Wrist rest | 15 | draft
~~~

Example 3, SQLite type affinity and a numeric check:

~~~text
id | name | price | stored_type | check_result
4 | Cable tray | 0 | integer | 1
11 | Sample pack | free | text | 1
~~~

Example 4, PostgreSQL NOT VALID:

~~~text
conname | convalidated | definition
name_not_blank | f | CHECK ((length(TRIM(BOTH FROM name)) > 0)) NOT VALID
products_discount_pct_check | t | CHECK (((discount_pct >= 0) AND (discount_pct <= 90)))
products_price_check | t | CHECK ((price >= (0)::numeric))
products_status_check | t | CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'retired'::text])))
sale_window_ok | t | CHECK ((sale_ends >= sale_starts))
~~~

## Common Pitfalls

- **Expecting CHECK to reject NULL.** \`CHECK (price >= 0)\` lets NULL in; add \`NOT NULL\`.
- **Leaving checks unnamed.** PostgreSQL named the unnamed table checks of a test table \`tc_check\` and \`tc_a_check\`; a name like \`sale_window_ok\` says which rule broke.
- **Trying to express cross-row or cross-table rules as a CHECK.** Use UNIQUE, foreign keys, exclusion constraints or triggers.
- **Trusting a numeric CHECK in SQLite.** Without \`STRICT\` or a \`typeof\` guard, text can pass a numeric comparison.
- **Adding a CHECK to a huge PostgreSQL table in one step.** It scans the table under a write-blocking lock; use \`NOT VALID\` then \`VALIDATE\`.
- **Assuming old MySQL enforced CHECK.** Before 8.0.16 it did not.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">CHECK constraint</strong> is a boolean expression attached to a table that every row must satisfy. The database evaluates it on every INSERT and UPDATE and fails the statement if it is FALSE, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CHECK (price &gt;= 0)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. NULL passes:</strong> <span style="color:#f0e2c8;">A row is rejected only when the result is FALSE. If the expression is NULL, unknown, the row is accepted, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CHECK (price &gt;= 0)</code> lets a NULL price in. Pair it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT NULL</code> when the value is required.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Scope:</strong> <span style="color:#f0e2c8;">Column CHECKs test one column; table CHECKs can compare columns of the same row, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CHECK (sale_ends &gt;= sale_starts)</code>. I name them with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CONSTRAINT sale_window_ok</code> so the error says what broke.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Limits:</strong> <span style="color:#f0e2c8;">A CHECK sees only the current row. PostgreSQL and SQLite reject subqueries in it. Rules across rows or tables need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNIQUE</code>, a foreign key, an exclusion constraint or a trigger.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Production:</strong> <span style="color:#f0e2c8;">On a big PostgreSQL table I add it <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT VALID</code>, which checks only new writes, then run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">VALIDATE CONSTRAINT</code> later with a lighter lock. And I remember MySQL only enforces CHECK since 8.0.16.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why use a CHECK instead of validating in the application?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every writer is covered: other services, scripts, migrations, a psql session. The database is the last line of defence and it is the only place a rule cannot be skipped. Application validation is still useful for friendly messages.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">CHECK with an IN list or a lookup table for statuses?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A CHECK list is simple and fast but changing it needs a migration. A lookup table with a foreign key lets you add statuses with an INSERT and attach metadata. PostgreSQL also offers enum types and domains.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a CHECK call a function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, but in PostgreSQL the function should be immutable. The CHECK is only re-evaluated when the row is written, so a function that reads other tables gives a rule that silently goes stale.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens to existing rows when you add a CHECK?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">PostgreSQL scans the table and refuses if any row fails: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">check constraint ... is violated by some row</code>. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT VALID</code> existing rows are skipped until <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">VALIDATE CONSTRAINT</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is a domain?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A PostgreSQL named type with its own CHECK, such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CREATE DOMAIN pos_int AS int CHECK (VALUE &gt; 0)</code>. Every column of that type shares the rule, so it is defined once.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| CHECK constraint | A boolean rule every row must satisfy on INSERT and UPDATE; fails only on FALSE |
| Column vs table constraint | Written on one column / written separately, able to compare several columns of the row |
| Named constraint | \`CONSTRAINT name CHECK (...)\`; the name appears in errors and in DROP CONSTRAINT |
| Three-valued logic | TRUE, FALSE, UNKNOWN; CHECK accepts UNKNOWN, WHERE drops it |
| Type affinity | SQLite: the declared type is a preference, values keep their own storage class |

**Conclusion:** A CHECK constraint is the cheapest way to make a table refuse impossible data: write the rule once and every writer is held to it. Remember the details an interviewer will test: only a FALSE result rejects the row, so NULL passes and required columns also need NOT NULL; a check sees only the current row, so uniqueness and references belong to other constraints; and the engines differ, with SQLite's type affinity, SQLite's missing ALTER TABLE ADD CONSTRAINT, PostgreSQL's NOT VALID / VALIDATE path for live tables, and MySQL enforcing CHECK only from 8.0.16.`,
    examples: [
      {
        label: `A CHECK only rejects FALSE: rows where the expression is NULL were accepted`,
        code: `SELECT id, name, discount_pct,
       discount_pct BETWEEN 0 AND 90 AS discount_check,
       sale_starts, sale_ends,
       sale_ends >= sale_starts AS window_check
FROM products
ORDER BY id;`,
      },
      {
        label: `SQLite: INSERT OR IGNORE skips the rows that fail a CHECK and keeps the good one`,
        code: `INSERT OR IGNORE INTO products (id, name, price, discount_pct, status, sale_starts, sale_ends) VALUES
  (7, 'Negative price', -5, NULL, 'active', NULL, NULL),
  (8, 'Unknown status', 12, NULL, 'on_sale', NULL, NULL),
  (9, 'Backwards sale', 20, 5, 'active', '2024-09-30', '2024-09-01'),
  (10, 'Wrist rest', 15, 5, 'draft', NULL, NULL);

SELECT changes() AS rows_inserted;

SELECT id, name, price, status FROM products WHERE id >= 7 ORDER BY id;`,
      },
      {
        label: `SQLite pitfall: the text value 'free' passes CHECK (price >= 0), because in SQLite any text compares greater than any number`,
        code: `INSERT INTO products (id, name, price, discount_pct, status) VALUES (11, 'Sample pack', 'free', NULL, 'draft');

SELECT id, name, price, typeof(price) AS stored_type, price >= 0 AS check_result
FROM products
WHERE id IN (4, 11)
ORDER BY id;`,
      },
      {
        label: `PostgreSQL: add a CHECK to a live table with NOT VALID, then VALIDATE it separately`,
        code: `ALTER TABLE products ADD CONSTRAINT name_not_blank CHECK (length(trim(name)) > 0) NOT VALID;

SELECT conname, convalidated, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'products'::regclass AND contype = 'c'
ORDER BY conname;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `What are NOT NULL, DEFAULT and other column constraints?`,
    difficulty: "easy",
    seoDescription: `NOT NULL makes a value required; DEFAULT only fills omitted columns, so an explicit NULL still gets in. Plus generated and identity columns and migrations.`,
    description: `**Question presented to candidate:**
"Walk me through the column constraints you can put in a CREATE TABLE: NOT NULL, DEFAULT and the others. For each, tell me what the database enforces, and what changes when you add one to a table that already has data."

**What a strong answer should cover:**
- NOT NULL rejects missing values; it is the most common constraint and the one CHECK and UNIQUE do not replace
- DEFAULT is not a constraint on the data: it only supplies a value when the column is omitted (or written as \`DEFAULT\`); an explicit NULL is stored as NULL
- The rest of the family: PRIMARY KEY, UNIQUE, CHECK, REFERENCES (foreign key), plus generated columns and identity columns, and column vs table constraints
- Naming constraints with \`CONSTRAINT name\` so errors and migrations are readable
- Adding to a live table: \`SET NOT NULL\` fails if NULLs exist; \`ADD COLUMN ... NOT NULL\` needs a DEFAULT; PostgreSQL 11+ adds a constant default without rewriting the table
- Engine differences: SQLite \`INTEGER PRIMARY KEY\` auto-assigns ids, PostgreSQL uses identity columns; SQLite cannot add a column with a non-constant default

**Code / implementation expected:** Optional — a CREATE TABLE using each constraint, and inserts that show a default being applied versus an explicit NULL.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE tickets (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'open',
  channel TEXT DEFAULT 'email',
  assignee TEXT,
  ref_code TEXT UNIQUE,
  slug TEXT GENERATED ALWAYS AS (lower(replace(title, ' ', '-'))) STORED
);
INSERT INTO tickets (id, title, priority, status, channel, assignee, ref_code) VALUES
  (1, 'Login page slow', 2, 'open', 'email', 'asha', 'T-1001'),
  (2, 'Refund not received', 1, 'pending', 'phone', 'ben', 'T-1002'),
  (3, 'Typo on pricing page', 5, 'closed', 'chat', NULL, 'T-1003'),
  (4, 'Export to CSV fails', 3, 'open', NULL, 'chen', NULL),
  (5, 'Password reset email', 2, 'open', 'email', NULL, NULL);
INSERT INTO tickets (id, title) VALUES (6, 'Dark mode request');
\`\`\``,
    answer: `**Target Audience:** Beginners writing their first CREATE TABLE, and candidates who need the migration details that come up in senior interviews.
**Difficulty:** Easy
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15, both run for this page. Version facts are cited from the PostgreSQL and SQLite release notes.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and error message shown was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

Think of a paper form at a doctor's surgery. Some boxes have a red star: *name* and *date of birth* must be filled in, or the receptionist hands the form back. Some boxes come pre-printed: *Preferred contact: email* is already ticked, unless you tick something else. One box says "office use only": the receptionist computes it from the others. And the form number in the corner is stamped by the office, never written by the patient.

A table definition is that form, and its column constraints are those printed rules:

- the red star is **NOT NULL**,
- the pre-ticked box is a **DEFAULT**,
- "office use only" is a **generated column**,
- the stamped form number is an **identity** or auto-assigned primary key,
- and the small print ("must be between 1 and 5", "no two forms with the same reference") is **CHECK** and **UNIQUE**.

The point of putting these rules in the database, not only in the app, is that they hold for every writer: the web app, the mobile app, a nightly import and a developer in a SQL console.

## 2. The Constraint Family at a Glance

📌 **Interview term: constraint** — a rule declared in the schema that the database enforces on every write. A write that breaks it fails with an error and changes nothing.

📌 **Interview term: column constraint vs table constraint** — a column constraint is written as part of one column definition (\`title TEXT NOT NULL\`); a table constraint is written as its own item in the CREATE TABLE and may span several columns (\`UNIQUE (a, b)\`, \`CHECK (ends >= starts)\`).

| Clause | What it guarantees | NULL allowed? | Own page |
| :--- | :--- | :--- | :--- |
| \`NOT NULL\` | A value is always present | No, that is the point | this page |
| \`DEFAULT expr\` | Nothing; it supplies a value when the column is omitted | Yes, unless NOT NULL | this page |
| \`UNIQUE\` | No two rows share a non-NULL value | Yes, several by default | [primary key vs unique](/interview-question/what-is-the-difference-between-a-primary-key-and-a-unique-constraint) |
| \`PRIMARY KEY\` | Unique and NOT NULL; the row identity | No | [primary key vs foreign key](/interview-question/what-is-the-difference-between-a-primary-key-and-a-foreign-key) |
| \`CHECK (expr)\` | Every row makes \`expr\` not FALSE | Yes (NULL passes) | [CHECK constraint](/interview-question/what-is-a-check-constraint) |
| \`REFERENCES t(c)\` | The value exists in the parent table | Yes, unless NOT NULL | [cascade options](/interview-question/what-are-foreign-key-cascade-options) |
| \`GENERATED ALWAYS AS (expr) STORED\` | The value is always computed from the row | Follows the expression | this page |
| \`GENERATED ... AS IDENTITY\` | A system-assigned number (PostgreSQL) | No | this page |

The \`tickets\` table in the schema uses almost all of them. This page goes deep on NOT NULL, DEFAULT, generated and identity columns, and links the others.

## 3. NOT NULL

📌 **Interview term: NOT NULL constraint** — the column may never hold NULL. It is checked on INSERT and UPDATE.

NULL means "no value / unknown". Many columns should never be unknown: a ticket without a title or a status is a bug. On PostgreSQL 16, inserting a row with only an id:

~~~text
ERROR:  null value in column "title" of relation "tickets" violates not-null constraint
DETAIL:  Failing row contains (32, null, 3, open, email, null, null, null).
~~~

Notice the failing row already contains \`3\`, \`open\` and \`email\`: the defaults were filled in **before** the NOT NULL check ran, which is why an omitted column with a default never trips NOT NULL. SQLite reports the same as \`NOT NULL constraint failed: tickets.title\`.

Why NOT NULL matters more than people expect: \`UNIQUE\` lets many NULLs in, \`CHECK (priority BETWEEN 1 AND 5)\` lets NULL in (an unknown result passes), and a foreign key lets NULL in. Only NOT NULL actually says "required". See [How does SQL handle NULL values?](/interview-question/how-does-sql-handle-null-values)

## 4. DEFAULT

📌 **Interview term: DEFAULT clause** — a value or expression the database uses for a column when an INSERT does not provide one. It is not a constraint on the data: it never rejects anything and never replaces a value you wrote.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 270" role="img" aria-label="An INSERT that omits columns: defaults and generated values are filled in first, then the constraints are checked, then the row is stored or the statement fails">
  <defs>
    <marker id="sql02q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="90" width="160" height="80" rx="10"/>
  <text class="d-text" x="100" y="122" text-anchor="middle">INSERT</text>
  <text class="d-sub" x="100" y="146" text-anchor="middle">id and title only</text>
  <rect class="d-box-accent" x="225" y="90" width="160" height="80" rx="10"/>
  <text class="d-text" x="305" y="122" text-anchor="middle">fill values</text>
  <text class="d-sub" x="305" y="146" text-anchor="middle">DEFAULT, generated</text>
  <rect class="d-box" x="430" y="90" width="160" height="80" rx="10"/>
  <text class="d-text" x="510" y="122" text-anchor="middle">check row</text>
  <text class="d-sub" x="510" y="146" text-anchor="middle">NOT NULL, CHECK, keys</text>
  <rect class="d-box-accent" x="630" y="20" width="110" height="70" rx="10"/>
  <text class="d-text" x="685" y="60" text-anchor="middle">stored</text>
  <rect class="d-box-muted" x="630" y="170" width="110" height="70" rx="10"/>
  <text class="d-text" x="685" y="210" text-anchor="middle">error</text>
  <path class="d-edge" d="M 182 130 L 221 130" marker-end="url(#sql02q4-arrow)"/>
  <path class="d-edge" d="M 387 130 L 426 130" marker-end="url(#sql02q4-arrow)"/>
  <path class="d-edge-accent" d="M 592 115 L 610 115 L 610 55 L 626 55" marker-end="url(#sql02q4-arrow)"/>
  <path class="d-edge-dashed" d="M 592 145 L 610 145 L 610 205 L 626 205" marker-end="url(#sql02q4-arrow)"/>
</svg>

Defaults and generated values are filled in first; only then is the complete row checked against NOT NULL, CHECK and the keys. The first example inserts two tickets. Ticket 10 names only \`id\` and \`title\`, so \`priority\`, \`status\` and \`channel\` come from their defaults. Ticket 11 writes \`channel\` as NULL explicitly, so it gets NULL, not \`'email'\`. Ticket 6 (seeded the same way as ticket 10) is shown for comparison:

~~~text
id | title | priority | status | channel | slug
6 | Dark mode request | 3 | open | email | dark-mode-request
10 | Printer jam | 3 | open | email | printer-jam
11 | VPN drops | 3 | open | NULL | vpn-drops
~~~

That difference catches people: ORMs and APIs that send every field, including NULL for "not set", bypass the database default entirely. If the column must always have a value, use \`NOT NULL DEFAULT ...\`; then an explicit NULL is an error instead of silent missing data. On PostgreSQL, \`INSERT INTO tickets (id, title, status) VALUES (31, 'x', NULL)\` failed with \`null value in column "status" ... violates not-null constraint\`.

Ways to ask for the default explicitly:

- Leave the column out of the column list.
- Write the keyword \`DEFAULT\` in \`VALUES\` (PostgreSQL, MySQL, SQL Server). SQLite 3.45 rejects it with \`near "DEFAULT": syntax error\`.
- \`INSERT INTO t DEFAULT VALUES\` for a row of only defaults.

The PostgreSQL example uses the keyword and \`RETURNING\` to see what was stored, including the generated \`slug\`:

~~~text
id | priority | status | channel | assignee | slug
20 | 3 | open | email | NULL | laptop-will-not-boot
~~~

**Expression defaults.** \`DEFAULT CURRENT_TIMESTAMP\`, \`DEFAULT now()\`, \`DEFAULT gen_random_uuid()\` (built in since [PostgreSQL 13](https://www.postgresql.org/docs/13/functions-uuid.html)) are evaluated once per inserted row. A default cannot refer to other columns of the row; use a generated column for that.

**SQLite note:** \`INSERT OR REPLACE\` with an explicit NULL for a \`NOT NULL\` column that has a default stores the default instead of failing; this is documented SQLite behaviour of the REPLACE conflict algorithm ([ON CONFLICT docs](https://sqlite.org/lang_conflict.html)), and it did so in a test run for this page. Plain INSERT fails as expected.

## 5. Generated and Identity Columns

📌 **Interview term: generated column** — a column whose value is always computed from other columns of the same row, declared \`GENERATED ALWAYS AS (expr) STORED\` (computed on write and stored) or \`VIRTUAL\` (computed on read). You cannot write to it: PostgreSQL says \`cannot insert a non-DEFAULT value into column "slug"\`, SQLite says \`cannot INSERT into generated column "slug"\`.

Version facts: SQLite added generated columns in 3.31.0 ([SQLite docs](https://sqlite.org/gencol.html)); PostgreSQL added stored ones in [12](https://www.postgresql.org/docs/12/release-12.html), and virtual ones, now the default kind, in [18](https://www.postgresql.org/docs/18/release-18.html). The schema writes \`STORED\` explicitly so it means the same on every version. In PostgreSQL the expression must be immutable.

📌 **Interview term: identity column** — a column whose value the database assigns from an internal sequence, declared \`GENERATED ALWAYS AS IDENTITY\` or \`GENERATED BY DEFAULT AS IDENTITY\` (PostgreSQL 10+, [release notes](https://www.postgresql.org/docs/10/release-10.html); also SQL Server's \`IDENTITY\` and MySQL's \`AUTO_INCREMENT\`).

This is a real portability trap. In SQLite, \`id INTEGER PRIMARY KEY\` is assigned automatically when you omit it. In PostgreSQL the same declaration is just an integer key: \`INSERT INTO tickets VALUES (DEFAULT, 'x')\` failed with \`null value in column "id" of relation "tickets" violates not-null constraint\`. PostgreSQL needs:

~~~sql
CREATE TABLE users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL UNIQUE
);
~~~

With \`ALWAYS\`, a hand-written id is refused: \`cannot insert a non-DEFAULT value into column "id"\` with the hint \`Use OVERRIDING SYSTEM VALUE to override.\` \`BY DEFAULT\` accepts a supplied value, which is convenient for data loads but lets the sequence and the data drift apart.

## 6. What SQLite Stored

The second example asks SQLite for every column with its flags: \`notnull\` 1 for NOT NULL columns, \`dflt_value\` the default expression as text, \`pk\` 1 for the primary key, and \`hidden\` 3 for a stored generated column:

~~~text
name | type | notnull | dflt_value | pk | hidden
id | INTEGER | 0 | NULL | 1 | 0
title | TEXT | 1 | NULL | 0 | 0
priority | INTEGER | 1 | 3 | 0 | 0
status | TEXT | 1 | 'open' | 0 | 0
channel | TEXT | 0 | 'email' | 0 | 0
assignee | TEXT | 0 | NULL | 0 | 0
ref_code | TEXT | 0 | NULL | 0 | 0
slug | TEXT | 0 | NULL | 0 | 3
~~~

In PostgreSQL the same information is in \`information_schema.columns\` (\`is_nullable\`, \`column_default\`, \`is_generated\`, \`is_identity\`).

## 7. Adding Constraints to a Table That Has Data

This is where the interview turns practical.

**Adding a NOT NULL column.** Existing rows need a value. Without a default, SQLite refuses: \`Cannot add a NOT NULL column with default value NULL\`. With one, every existing row gets it, as the third example shows:

~~~text
id | title | sla_hours
1 | Login page slow | 24
2 | Refund not received | 24
3 | Typo on pricing page | 24
4 | Export to CSV fails | 24
5 | Password reset email | 24
6 | Dark mode request | 24
~~~

In PostgreSQL 11 and later, adding a column with a constant (non-volatile) default does not rewrite the table: the value is stored once in the catalog and returned for old rows ([PostgreSQL 11 release notes](https://www.postgresql.org/docs/11/release-11.html)). A volatile default such as \`clock_timestamp()\` still rewrites every row. SQLite refuses a non-constant default in ADD COLUMN outright: \`ADD COLUMN created TEXT DEFAULT CURRENT_TIMESTAMP\` failed with \`Cannot add a column with non-constant default\`.

**Making an existing column NOT NULL.** The database checks every row first. On PostgreSQL, \`ALTER TABLE tickets ALTER COLUMN assignee SET NOT NULL\` failed with \`column "assignee" of relation "tickets" contains null values\`. Backfill first (\`UPDATE ... SET assignee = 'unassigned' WHERE assignee IS NULL\`), then add it. On a very large table the scan holds a strong lock; the [ALTER TABLE docs](https://www.postgresql.org/docs/16/sql-altertable.html) note that \`SET NOT NULL\` can skip the scan when a valid \`CHECK (col IS NOT NULL)\` constraint already proves it (added in [PostgreSQL 12](https://www.postgresql.org/docs/release/12.0/)), which is the safe path: add that check \`NOT VALID\`, \`VALIDATE\` it, then \`SET NOT NULL\`.

**Adding a DEFAULT to an existing column** only affects future inserts; existing NULLs stay NULL.

## 8. Verified: Running the Code

The three SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above). The PostgreSQL example and every PostgreSQL error above were run on PostgreSQL 16.15 in a scratch database with the same schema.

Example 1, DEFAULT vs explicit NULL:

~~~text
id | title | priority | status | channel | slug
6 | Dark mode request | 3 | open | email | dark-mode-request
10 | Printer jam | 3 | open | email | printer-jam
11 | VPN drops | 3 | open | NULL | vpn-drops
~~~

Example 2, the column flags SQLite stored:

~~~text
name | type | notnull | dflt_value | pk | hidden
id | INTEGER | 0 | NULL | 1 | 0
title | TEXT | 1 | NULL | 0 | 0
priority | INTEGER | 1 | 3 | 0 | 0
status | TEXT | 1 | 'open' | 0 | 0
channel | TEXT | 0 | 'email' | 0 | 0
assignee | TEXT | 0 | NULL | 0 | 0
ref_code | TEXT | 0 | NULL | 0 | 0
slug | TEXT | 0 | NULL | 0 | 3
~~~

Example 3, adding a NOT NULL column with a default:

~~~text
id | title | sla_hours
1 | Login page slow | 24
2 | Refund not received | 24
3 | Typo on pricing page | 24
4 | Export to CSV fails | 24
5 | Password reset email | 24
6 | Dark mode request | 24
~~~

Example 4, PostgreSQL DEFAULT keyword with RETURNING:

~~~text
id | priority | status | channel | assignee | slug
20 | 3 | open | email | NULL | laptop-will-not-boot
~~~

## Common Pitfalls

- **Thinking DEFAULT prevents NULL.** It only fills omitted columns; an explicit NULL is stored unless the column is also NOT NULL.
- **Relying on CHECK or UNIQUE to make a column required.** Both accept NULL; only NOT NULL means required.
- **Porting \`INTEGER PRIMARY KEY\` from SQLite to PostgreSQL** and expecting ids to appear. Use an identity column.
- **Running \`SET NOT NULL\` before backfilling.** It fails on the first NULL, and on a big table the validating scan holds a heavy lock.
- **Adding a column with a volatile default on a big PostgreSQL table.** \`clock_timestamp()\` or \`random()\` rewrites every row; a constant default does not.
- **Leaving constraints unnamed in schemas you will migrate.** Generated names differ between engines and environments; \`CONSTRAINT priority_range CHECK (...)\` keeps migrations predictable.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. NOT NULL:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">NOT NULL</strong> says the column must always have a value. An insert that omits it with no default, or writes NULL, fails with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">violates not-null constraint</code>. It is the constraint I add most, because CHECK and UNIQUE both let NULL through.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. DEFAULT:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">DEFAULT</strong> is not a rule about the data. It supplies a value only when the column is left out of the INSERT, or written as the keyword <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DEFAULT</code>. An explicit NULL is stored as NULL, and NOT NULL then rejects it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The family:</strong> <span style="color:#f0e2c8;">The other column constraints are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PRIMARY KEY</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNIQUE</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CHECK</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">REFERENCES</code>. Related column clauses are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GENERATED ALWAYS AS (...) STORED</code> for computed columns and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GENERATED ... AS IDENTITY</code> for ids. Multi-column rules go in table constraints, and I name them with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CONSTRAINT name</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Live tables:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ALTER COLUMN ... SET NOT NULL</code> fails if any NULL exists, so I backfill first. A new NOT NULL column needs a default; since PostgreSQL 11 a constant default is stored in the catalog, so there is no table rewrite.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Engines:</strong> <span style="color:#f0e2c8;">SQLite fills an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INTEGER PRIMARY KEY</code> for you; PostgreSQL needs an identity column. SQLite cannot <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ADD COLUMN</code> with a non-constant default like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CURRENT_TIMESTAMP</code>, and cannot add a CHECK with ALTER TABLE at all.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If a column has a DEFAULT, does it still need NOT NULL?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, if it must never be empty. The default only covers inserts that omit the column; any insert or update can still write NULL explicitly unless NOT NULL forbids it. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">status TEXT NOT NULL DEFAULT 'open'</code> is the usual pair.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a DEFAULT be an expression?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DEFAULT now()</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DEFAULT gen_random_uuid()</code> in PostgreSQL, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DEFAULT CURRENT_TIMESTAMP</code> in SQLite. It is evaluated per inserted row. It cannot refer to other columns; that is what a generated column is for.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Identity column or SERIAL?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In PostgreSQL 10+ use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GENERATED ALWAYS AS IDENTITY</code>: it is SQL standard, its sequence belongs to the column, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ALWAYS</code> rejects hand-written ids unless you say <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OVERRIDING SYSTEM VALUE</code>. SERIAL is an older shorthand for a sequence plus a default.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you add NOT NULL to a big PostgreSQL table safely?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Backfill the NULLs in batches, add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CHECK (col IS NOT NULL) NOT VALID</code>, run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">VALIDATE CONSTRAINT</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SET NOT NULL</code>, which since PostgreSQL 12 can use the validated check instead of scanning the table.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a constraint slow down writes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">NOT NULL, DEFAULT and CHECK cost almost nothing per row. UNIQUE and PRIMARY KEY add an index lookup and update, and a foreign key adds a lookup in the parent. That is cheap compared to cleaning bad data later.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Constraint | A schema rule enforced on every write; a violating write fails |
| Column vs table constraint | Written on one column / written separately, may span columns |
| NOT NULL constraint | The column must always have a value |
| DEFAULT clause | The value used when an INSERT omits the column; not a constraint on the data |
| Generated column | A column computed from other columns of the row; cannot be written |
| Identity column | A column the database numbers from an internal sequence |

**Conclusion:** Column constraints are the printed rules of the table: NOT NULL makes a value required, DEFAULT supplies one when the writer says nothing, and UNIQUE, PRIMARY KEY, CHECK and REFERENCES add uniqueness, identity, value rules and references, with generated and identity columns for values the database computes or assigns. The two facts interviewers test most are that DEFAULT does not stop an explicit NULL (only NOT NULL does), and how to add these rules to a table that already has data: backfill before SET NOT NULL, give a new NOT NULL column a constant default, and know your engine, since PostgreSQL 11+ adds such a column without a rewrite while SQLite refuses non-constant defaults in ADD COLUMN.`,
    examples: [
      {
        label: `Omit a column and its DEFAULT fills it; write NULL and NULL is stored`,
        code: `-- Only id and title given: priority, status and channel come from their DEFAULTs
INSERT INTO tickets (id, title) VALUES (10, 'Printer jam');

-- channel written as NULL: the DEFAULT is NOT used
INSERT INTO tickets (id, title, channel) VALUES (11, 'VPN drops', NULL);

SELECT id, title, priority, status, channel, slug
FROM tickets
WHERE id IN (6, 10, 11)
ORDER BY id;`,
      },
      {
        label: `The constraints SQLite stored for each column`,
        code: `SELECT name, type, "notnull", dflt_value, pk, hidden
FROM pragma_table_xinfo('tickets')
ORDER BY cid;`,
      },
      {
        label: `ADD COLUMN ... NOT NULL DEFAULT gives every existing row the default`,
        code: `ALTER TABLE tickets ADD COLUMN sla_hours INTEGER NOT NULL DEFAULT 24;

SELECT id, title, sla_hours
FROM tickets
ORDER BY id;`,
      },
      {
        label: `PostgreSQL: the DEFAULT keyword inside VALUES, and RETURNING to see what was stored`,
        code: `INSERT INTO tickets (id, title, priority, channel)
VALUES (20, 'Laptop will not boot', DEFAULT, DEFAULT)
RETURNING id, priority, status, channel, assignee, slug;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `What is the difference between CHAR, VARCHAR, and TEXT?`,
    difficulty: "easy",
    seoDescription: `CHAR pads to a fixed length, VARCHAR has a maximum, TEXT has none. Padding traps, length errors and engine differences in PostgreSQL, SQLite, MySQL.`,
    description: `**Question presented to candidate:**
"When you design a table, how do you choose between CHAR, VARCHAR and TEXT for a string column? What does each one actually do with the value, and does the choice affect performance?"

**What a strong answer should cover:**
- \`CHAR(n)\` is fixed length and blank-padded; \`VARCHAR(n)\` is variable length with a maximum; \`TEXT\` is variable length without a declared maximum
- Padding semantics: trailing spaces in \`CHAR\` are insignificant in comparisons and dropped when converted to text, which produces surprises with \`LIKE\` and concatenation
- Length limits are counted in characters in PostgreSQL and MySQL but in bytes in SQL Server; too-long values raise an error, while an explicit cast truncates
- Engine facts: in PostgreSQL there is no performance difference and \`TEXT\` or \`VARCHAR\` is recommended; SQLite ignores declared lengths entirely (type affinity); MySQL \`TEXT\` needs a prefix length to be indexed; SQL Server \`TEXT\` is deprecated in favour of \`VARCHAR(MAX)\`
- A sensible rule: use \`TEXT\`/\`VARCHAR\` by default, a length or CHECK only when it is a real business rule, \`CHAR\` almost never

**Code / implementation expected:** Optional — show what each type stores for \`'ab'\` and how comparisons with trailing spaces behave.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE countries (
  code CHAR(2) PRIMARY KEY,
  name VARCHAR(40) NOT NULL,
  notes TEXT
);
CREATE TABLE samples (
  id INTEGER PRIMARY KEY,
  c CHAR(5),
  v VARCHAR(5),
  t TEXT
);
INSERT INTO countries (code, name, notes) VALUES
  ('IN', 'India', 'Uses the Indian rupee. Official languages include Hindi and English.'),
  ('JP', 'Japan', NULL),
  ('BR', 'Brazil', 'Largest country in South America.'),
  ('DE', 'Germany', NULL),
  ('KE', 'Kenya', 'Capital: Nairobi.');
INSERT INTO samples (id, c, v, t) VALUES
  (1, 'ab', 'ab', 'ab'),
  (2, 'ab  ', 'ab  ', 'ab  '),
  (3, 'héllo', 'héllo', 'héllo');
\`\`\``,
    answer: `**Target Audience:** Beginners choosing types for their first tables, and candidates who need the engine-specific facts behind "it depends".
**Difficulty:** Easy
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples on this page use) and PostgreSQL 16.15 (UTF-8 database), both run for this page. MySQL and SQL Server facts are cited from their manuals.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and error message shown was produced by actually running it; the **Verified** section quotes the example output in full.

## 1. Why This Even Matters — A Story First

Imagine three ways to give people name badges.

- **Fixed boxes.** Every badge has exactly 5 squares, one letter per square. "Ab" gets three empty squares after it. Every badge is the same size, and short names waste space.
- **A strip with a limit.** You write the name on a strip and cut it to length, but the rule says no longer than 5 letters. "Ab" uses two letters' worth of strip.
- **A strip with no limit.** Cut to length, any length you like.

Those are \`CHAR(5)\`, \`VARCHAR(5)\` and \`TEXT\`. The surprising part is not the storage, it is the behaviour: with fixed boxes, is "Ab" followed by three empty squares the same name as "Ab"? Different databases answer differently, and that is where the real bugs come from.

## 2. The Three Types

📌 **Interview term: CHAR(n) / CHARACTER(n)** — a fixed-length string type. Values shorter than n are padded with spaces up to n; longer values are an error. Also called **blank-padded** (\`bpchar\` inside PostgreSQL).

📌 **Interview term: VARCHAR(n) / CHARACTER VARYING(n)** — a variable-length string with a maximum length of n. A value is stored as it is, without padding.

📌 **Interview term: TEXT** — a variable-length string with no declared maximum. Not in the SQL standard, but supported by PostgreSQL, MySQL and SQLite, with different implementations.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 290" role="img" aria-label="The value ab stored as CHAR 5 is padded with three spaces, as VARCHAR 5 it keeps two characters with room to spare, and as TEXT it keeps two characters with no limit">
  <text class="d-text" x="20" y="54">CHAR(5)</text>
  <rect class="d-box-accent" x="170" y="28" width="56" height="44" rx="4"/>
  <text class="d-text" x="198" y="56" text-anchor="middle">a</text>
  <rect class="d-box-accent" x="236" y="28" width="56" height="44" rx="4"/>
  <text class="d-text" x="264" y="56" text-anchor="middle">b</text>
  <rect class="d-box-muted" x="302" y="28" width="56" height="44" rx="4"/>
  <text class="d-sub" x="330" y="56" text-anchor="middle">pad</text>
  <rect class="d-box-muted" x="368" y="28" width="56" height="44" rx="4"/>
  <text class="d-sub" x="396" y="56" text-anchor="middle">pad</text>
  <rect class="d-box-muted" x="434" y="28" width="56" height="44" rx="4"/>
  <text class="d-sub" x="462" y="56" text-anchor="middle">pad</text>
  <text class="d-sub" x="540" y="56">always 5 characters</text>
  <text class="d-text" x="20" y="154">VARCHAR(5)</text>
  <rect class="d-box-accent" x="170" y="128" width="56" height="44" rx="4"/>
  <text class="d-text" x="198" y="156" text-anchor="middle">a</text>
  <rect class="d-box-accent" x="236" y="128" width="56" height="44" rx="4"/>
  <text class="d-text" x="264" y="156" text-anchor="middle">b</text>
  <path class="d-edge-dashed" d="M 302 128 L 490 128 L 490 172 L 302 172 Z"/>
  <text class="d-sub" x="396" y="156" text-anchor="middle">limit 5</text>
  <text class="d-sub" x="540" y="156">2 characters, max 5</text>
  <text class="d-text" x="20" y="254">TEXT</text>
  <rect class="d-box-accent" x="170" y="228" width="56" height="44" rx="4"/>
  <text class="d-text" x="198" y="256" text-anchor="middle">a</text>
  <rect class="d-box-accent" x="236" y="228" width="56" height="44" rx="4"/>
  <text class="d-text" x="264" y="256" text-anchor="middle">b</text>
  <text class="d-sub" x="540" y="256">2 characters, no limit</text>
</svg>

That is the textbook model. Each engine then implements it differently, so the rest of this page goes engine by engine, with every behaviour run or cited.

## 3. PostgreSQL: Same Storage, Different Semantics

The [PostgreSQL character types docs](https://www.postgresql.org/docs/16/datatype-character.html) state that there is no performance difference among the three types apart from the extra storage for the blank-padded type and a few CPU cycles to check the length, and that \`character(n)\` is usually the slowest of the three. They recommend \`text\` or \`character varying\`. So in PostgreSQL the choice is about behaviour, not speed.

### Padding behaviour

The PostgreSQL example stores \`'ab'\`, \`'ab  '\` (two trailing spaces) and \`'héllo'\` in a \`CHAR(5)\` column \`c\` and a \`VARCHAR(5)\` column \`v\`:

~~~text
id | c_concat | c_len | c_bytes | c_eq_ab | v_concat | v_eq_ab
1 | [ab] | 2 | 5 | t | [ab] | t
2 | [ab] | 2 | 5 | t | [ab  ] | f
3 | [héllo] | 5 | 6 | f | [héllo] | f
~~~

What it shows:

- \`c\` really holds 5 characters: \`octet_length(c)\` is 5 for \`'ab'\`. But \`length(c)\` says 2, because PostgreSQL treats trailing spaces in \`CHAR\` as insignificant.
- Rows 1 and 2 are **the same value** in \`c\`: the two trailing spaces of row 2 disappeared into the padding. In \`v\` they are different: \`[ab  ]\` keeps its spaces and does not equal \`'ab'\`.
- \`'[' || c || ']'\` gives \`[ab]\`: converting \`CHAR\` to text for concatenation strips the trailing spaces.
- \`'héllo'\` is 5 characters and 6 bytes (\`é\` takes two bytes in UTF-8), and fits in \`CHAR(5)\`: the limit counts characters.

📌 **Interview term: pad semantics** — whether trailing spaces count when comparing strings. PostgreSQL \`CHAR\` ignores them; \`VARCHAR\` and \`TEXT\` compare every character.

The second PostgreSQL example adds the traps:

~~~text
cast_truncates | char_pad_eq | varchar_pad_eq | char_like_ab | chars | utf8_bytes
abc | t | f | f | 5 | 6
~~~

- \`'abcdef'::varchar(3)\` returns \`abc\`: an **explicit cast** truncates silently, as the SQL standard requires.
- \`'ab'::char(5) = 'ab   '::char(5)\` is true; the same comparison on \`varchar\` is false.
- \`'ab'::char(5) LIKE 'ab'\` is **false**. Pattern matching sees the padded value, so code that works with \`=\` breaks with \`LIKE\`.

### Length errors

Storing a too-long value is an error, not a truncation:

~~~sql
INSERT INTO countries (code, name, notes) VALUES ('IND', 'x', NULL);
~~~

~~~text
ERROR:  value too long for type character(2)
~~~

One exception from the SQL standard: if the excess characters are all spaces, they are truncated without an error. \`'abcde   '\` (5 letters, 3 spaces) went into \`VARCHAR(5)\` and was stored as \`abcde\`. And because \`'IN '\` becomes \`'IN'\` in a \`CHAR(2)\` primary key, inserting it failed as a duplicate: \`duplicate key value violates unique constraint "countries_pkey"\`.

The limit itself is capped: \`VARCHAR(10485761)\` failed with \`length for type varchar cannot exceed 10485760\`. For anything longer, use \`TEXT\`; the docs give about 1 GB as the longest storable string.

📌 **Interview term: TOAST** — PostgreSQL's mechanism for large values: when a row grows past about 2 kB, its large field values are compressed and/or moved to a side table automatically. It applies equally to \`TEXT\` and \`VARCHAR\`, which is one reason they perform the same.

### The usual PostgreSQL advice

Use \`TEXT\` (or \`VARCHAR\` without a limit, which is the same thing), and when a maximum is a real business rule, express it as a constraint you can change cheaply:

~~~sql
CREATE TABLE accounts (
  username TEXT NOT NULL CHECK (char_length(username) BETWEEN 3 AND 30)
);
~~~

See [What is a CHECK constraint?](/interview-question/what-is-a-check-constraint). In a run for this page, raising \`VARCHAR(50)\` to \`VARCHAR(100)\` (or to \`TEXT\`) left the table file untouched (\`pg_relation_filenode\` unchanged), while lowering it to \`VARCHAR(20)\` rewrote the table into a new file, and lowering it to \`VARCHAR(5)\` failed with \`value too long for type character varying(5)\`. A CHECK can instead be replaced with \`NOT VALID\` and \`VALIDATE\`, without a rewrite or a long lock.

## 4. SQLite: The Declared Type Is a Hint

📌 **Interview term: type affinity** — SQLite stores each value with its own storage class (NULL, INTEGER, REAL, TEXT, BLOB); a column declaration only sets a preferred type. Per the [SQLite datatype docs](https://sqlite.org/datatype3.html), any declared type containing \`CHAR\`, \`CLOB\` or \`TEXT\` gets TEXT affinity, and the length in parentheses is ignored.

So in SQLite \`CHAR(2)\`, \`VARCHAR(40)\` and \`TEXT\` are identical. The first example inserts a 3-letter code into \`CHAR(2)\` and a 67-character name into \`VARCHAR(40)\`; both are accepted and both are stored as \`text\`:

~~~text
code | code_len | name_len | code_type | name_type
IND | 3 | 67 | text | text
~~~

And there is no padding at all. The second example shows \`CHAR(5)\` keeping \`'ab'\` as 2 characters, and \`'ab  '\` keeping its spaces, so it is not equal to \`'ab'\`:

~~~text
id | c_value | c_len | c_eq_ab | v_eq_ab
1 | [ab] | 2 | 1 | 1
2 | [ab  ] | 4 | 0 | 0
3 | [héllo] | 5 | 0 | 0
~~~

Note \`length('héllo')\` is 5 here too: SQLite \`length()\` counts characters for text values. To get real enforcement in SQLite, add a \`CHECK (length(code) = 2)\`. A \`STRICT\` table (3.37.0+, [docs](https://sqlite.org/stricttables.html)) enforces storage classes but only accepts the type names INT, INTEGER, REAL, TEXT, BLOB and ANY: \`CREATE TABLE s (a VARCHAR(40)) STRICT\` failed with \`unknown datatype for s.a: "varchar(40)"\`, so there too the length rule is a CHECK on a TEXT column.

This matters for this site: the runnable examples here use SQLite, so a length rule you expect from PostgreSQL will not show up in them.

## 5. MySQL and SQL Server

**MySQL** ([CHAR and VARCHAR](https://dev.mysql.com/doc/refman/8.4/en/char.html)):

- \`CHAR\` values are padded on storage and trailing spaces are removed on retrieval (unless the \`PAD_CHAR_TO_FULL_LENGTH\` SQL mode is on).
- \`VARCHAR(n)\` counts characters, but every row shares a 65,535-byte maximum row size, so the usable n depends on the character set and the other columns.
- \`TEXT\` is a separate family (\`TINYTEXT\` to \`LONGTEXT\`). Indexing a \`TEXT\` column requires a prefix length, such as \`INDEX (body(100))\` ([column indexes](https://dev.mysql.com/doc/refman/8.4/en/column-indexes.html)). This is why \`VARCHAR(255)\` is common in MySQL schemas.

**SQL Server** ([char and varchar](https://learn.microsoft.com/en-us/sql/t-sql/data-types/char-and-varchar-transact-sql)):

- n in \`CHAR(n)\` / \`VARCHAR(n)\` is a **byte** count from 1 to 8,000, so fewer multibyte characters fit. \`VARCHAR(MAX)\` stores up to 2^31-1 bytes.
- \`NCHAR\` / \`NVARCHAR\` store Unicode as UTF-16.
- The old \`TEXT\`, \`NTEXT\` and \`IMAGE\` types are deprecated; Microsoft says to use \`VARCHAR(MAX)\`, \`NVARCHAR(MAX)\` and \`VARBINARY(MAX)\` instead ([ntext, text and image](https://learn.microsoft.com/en-us/sql/t-sql/data-types/ntext-text-and-image-transact-sql)).

## 6. Side by Side

| | CHAR(n) | VARCHAR(n) | TEXT |
| :--- | :--- | :--- | :--- |
| Length | Fixed, padded to n | Variable, at most n | Variable, no declared max |
| Trailing spaces in comparisons (PostgreSQL) | Ignored | Significant | Significant |
| Too long on INSERT (PostgreSQL) | Error | Error | Never too long (about 1 GB cap) |
| Explicit cast to the type (PostgreSQL) | Truncates / pads | Truncates | Not applicable |
| PostgreSQL performance | Slowest (padding) | Same as TEXT | Same as VARCHAR |
| SQLite | TEXT affinity, length ignored | TEXT affinity, length ignored | TEXT affinity |
| MySQL | Spaces stripped on read | Counts characters, row limit | Needs prefix to index |
| SQL Server | n bytes | n bytes, or MAX | Deprecated |

**A rule that works everywhere:** use the variable-length type by default (\`TEXT\` in PostgreSQL and SQLite, \`VARCHAR(n)\` with a realistic n in MySQL and SQL Server); put a length limit in only when it is a business rule; avoid \`CHAR(n)\` unless a standard really fixes the length and you have checked how your engine compares padded values.

## 7. Verified: Running the Code

The two SQLite examples were run the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above). The two PostgreSQL examples and every PostgreSQL error above were run on PostgreSQL 16.15 in a scratch UTF-8 database with the same schema.

Example 1, SQLite ignores declared lengths:

~~~text
code | code_len | name_len | code_type | name_type
IND | 3 | 67 | text | text
~~~

Example 2, SQLite does not pad CHAR:

~~~text
id | c_value | c_len | c_eq_ab | v_eq_ab
1 | [ab] | 2 | 1 | 1
2 | [ab  ] | 4 | 0 | 0
3 | [héllo] | 5 | 0 | 0
~~~

Example 3, PostgreSQL padding semantics:

~~~text
id | c_concat | c_len | c_bytes | c_eq_ab | v_concat | v_eq_ab
1 | [ab] | 2 | 5 | t | [ab] | t
2 | [ab] | 2 | 5 | t | [ab  ] | f
3 | [héllo] | 5 | 6 | f | [héllo] | f
~~~

Example 4, PostgreSQL casts, padding equality and LIKE:

~~~text
cast_truncates | char_pad_eq | varchar_pad_eq | char_like_ab | chars | utf8_bytes
abc | t | f | f | 5 | 6
~~~

## Common Pitfalls

- **Using \`CHAR(n)\` for variable data.** Padding changes comparisons, \`LIKE\` and concatenation, and costs space; in PostgreSQL it is also the slowest.
- **Expecting SQLite to enforce \`VARCHAR(n)\`.** It never does; add a CHECK.
- **Relying on an explicit cast for validation.** \`::varchar(3)\` truncates silently; only storing into the column raises the error.
- **Assuming n counts characters everywhere.** SQL Server counts bytes, so UTF-8 data fits fewer characters than n.
- **Picking \`VARCHAR(255)\` by habit in PostgreSQL.** It brings no speed, and a later change to the limit is a migration; use TEXT plus a CHECK when the limit matters.
- **Indexing a MySQL \`TEXT\` column without a prefix.** It is rejected; use a prefix index or \`VARCHAR\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The three types:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CHAR(n)</code> is fixed length: shorter values are padded with spaces to n. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">VARCHAR(n)</code> is variable length with a maximum of n. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TEXT</code> is variable length with no declared maximum.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Padding semantics:</strong> <span style="color:#f0e2c8;">In PostgreSQL, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CHAR</code> trailing spaces are treated as insignificant: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'ab'::char(5) = 'ab   '</code> is true and the spaces vanish when it becomes text. But <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LIKE 'ab'</code> is false, so CHAR causes subtle bugs.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Limits:</strong> <span style="color:#f0e2c8;">A too-long value fails with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value too long for type character varying(3)</code>, while an explicit cast truncates silently. PostgreSQL and MySQL count n in characters; SQL Server counts bytes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Performance:</strong> <span style="color:#f0e2c8;">In PostgreSQL the docs say there is no performance difference among the three, apart from the padding cost of CHAR, so I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TEXT</code>, plus a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CHECK (char_length(x) &lt;= n)</code> when the limit is a real rule. SQLite ignores the declared length entirely.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Other engines:</strong> <span style="color:#f0e2c8;">MySQL <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TEXT</code> is stored differently from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">VARCHAR</code> and needs a prefix length to be indexed, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">VARCHAR(255)</code> is common there. SQL Server deprecated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TEXT</code>; use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">VARCHAR(MAX)</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NVARCHAR</code> for Unicode.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is CHAR(n) actually the right choice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Rarely. For genuinely fixed codes like ISO country codes it documents intent, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TEXT</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CHECK (char_length(code) = 2)</code> does the same without padding quirks. The PostgreSQL docs say CHAR is usually the slowest of the three because of its storage cost.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is VARCHAR(255) faster than VARCHAR(1000) or TEXT?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In PostgreSQL, no: storage depends on the actual value, not the declared limit. In MySQL the declared size can matter for in-memory temporary tables and the 65,535-byte row limit, which is one reason people pick modest limits there.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why might changing VARCHAR(50) to VARCHAR(100) be cheap but the reverse expensive?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Raising a limit cannot invalidate existing rows, so PostgreSQL only updates the catalog. Lowering it rewrites the table, and fails if any row is too long. That asymmetry is an argument for TEXT plus a CHECK, which you can swap without changing the column type.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">n</code> count characters or bytes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Characters in PostgreSQL and MySQL: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'héllo'</code> is 5 characters and 6 UTF-8 bytes. Bytes in SQL Server <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">VARCHAR(n)</code>, so fewer multibyte characters fit; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NVARCHAR(n)</code> counts byte pairs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How large can a TEXT value be?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">PostgreSQL allows about 1 GB per value, and large values are compressed and moved out of line automatically (TOAST). <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">VARCHAR(n)</code> itself is capped at n = 10485760.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| CHAR(n) / CHARACTER(n) | Fixed-length, blank-padded string of n characters |
| VARCHAR(n) / CHARACTER VARYING(n) | Variable-length string with a maximum of n |
| TEXT | Variable-length string with no declared maximum |
| Pad semantics | Whether trailing spaces count in comparisons |
| TOAST | PostgreSQL compression and out-of-line storage for large values |
| Type affinity | SQLite: the declared type is a preference; lengths are ignored |

**Conclusion:** CHAR, VARCHAR and TEXT differ on paper by fixed length, a maximum, and no maximum, but the useful answer is engine by engine. PostgreSQL stores all three the same way and performs the same, so TEXT with a CHECK for real limits is the usual choice, and CHAR mainly brings padding surprises with comparisons, LIKE and concatenation. SQLite ignores declared lengths entirely. MySQL treats TEXT as a separate kind of column that needs prefix indexes, and SQL Server counts VARCHAR lengths in bytes and has deprecated TEXT for VARCHAR(MAX). Saying which engine you mean is what turns a textbook answer into a strong one.`,
    examples: [
      {
        label: `SQLite: declared lengths are not enforced, and every one of these types is stored as text`,
        code: `INSERT INTO countries (code, name, notes)
VALUES ('IND', 'The Republic of India, as written out in full on official documents', NULL);

SELECT code, length(code) AS code_len, length(name) AS name_len,
       typeof(code) AS code_type, typeof(name) AS name_type
FROM countries
WHERE code = 'IND';`,
      },
      {
        label: `SQLite: CHAR(5) is not padded, and trailing spaces count in comparisons`,
        code: `SELECT id,
       '[' || c || ']' AS c_value, length(c) AS c_len,
       c = 'ab' AS c_eq_ab, v = 'ab' AS v_eq_ab
FROM samples
ORDER BY id;`,
      },
      {
        label: `PostgreSQL: CHAR pads to 5, ignores trailing spaces in comparisons and drops them when converted to text`,
        code: `SELECT id,
       '[' || c || ']' AS c_concat, length(c) AS c_len, octet_length(c) AS c_bytes, c = 'ab' AS c_eq_ab,
       '[' || v || ']' AS v_concat, v = 'ab' AS v_eq_ab
FROM samples
ORDER BY id;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: a cast truncates silently, padding equality differs by type, and LIKE sees the padding`,
        code: `SELECT 'abcdef'::varchar(3) AS cast_truncates,
       'ab'::char(5) = 'ab   '::char(5) AS char_pad_eq,
       'ab'::varchar(5) = 'ab  '::varchar(5) AS varchar_pad_eq,
       'ab'::char(5) LIKE 'ab' AS char_like_ab,
       char_length('héllo') AS chars, octet_length('héllo') AS utf8_bytes;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
];

export default augments;
