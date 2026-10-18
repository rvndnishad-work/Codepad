/**
 * SQL ULTRA — batch 11: Schema design (normalization, denormalization, foreign key
 * cascade options, JSONB vs columns vs EAV, JSONB querying and GIN indexing).
 * Every example was run by scripts/verify-sql-examples.ts (sql.js 1.10.2 like the
 * page, PostgreSQL 16 for postgres examples); quoted output is that run's output.
 */
import type { SqlUltraAugment } from "./sql-augments.types";

const augments: SqlUltraAugment[] = [
  {
    title: `What is database normalization?`,
    difficulty: "medium",
    seoDescription: `Database normalization explained from zero: functional dependencies, 1NF, 2NF, 3NF and BCNF, the anomalies they prevent, and a worked decomposition.`,
    description: `**Question presented to candidate:**
"What is database normalization? Walk me through 1NF, 2NF and 3NF with an example, and tell me what problems normalization actually prevents."

**What a strong answer should cover:**
- Normalization is the process of splitting tables so that each fact is stored once, in the table whose key it depends on, to remove redundancy and the update, insert and delete anomalies it causes
- The normal forms as rules about keys and functional dependencies: 1NF (atomic values, no repeating groups), 2NF (no non-key column depends on only part of a composite key), 3NF (no non-key column depends on another non-key column), BCNF (every determinant is a candidate key)
- A concrete decomposition: a flat orders sheet split into customers, products, orders and order_items, joined back with foreign keys and no information lost
- Subtle modelling points: a price at the time of sale belongs on the order line, not on the product; a repeated value is not always redundancy
- Trade-off: more tables and joins on reads, cleaner writes and constraints; most OLTP schemas aim for 3NF and denormalize deliberately where reads demand it

**Code / implementation expected:** Optional — queries that expose redundancy in a flat table, and the normalized tables joined back into the same report.

**Schema used by the examples:**

\`\`\`sql
-- One wide table, the way a spreadsheet export looks
CREATE TABLE orders_flat (
  order_id INTEGER,
  order_date TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_city TEXT,
  product_sku TEXT,
  product_name TEXT,
  unit_price NUMERIC,
  qty INTEGER,
  PRIMARY KEY (order_id, product_sku)
);
INSERT INTO orders_flat VALUES
  (101, '2025-03-01', 'Asha', 'asha@old-mail.com', 'Pune', 'KB-01', 'Keyboard', 40, 1),
  (101, '2025-03-01', 'Asha', 'asha@old-mail.com', 'Pune', 'MS-02', 'Mouse', 15, 2),
  (102, '2025-03-04', 'Ben', 'ben@mail.com', 'Leeds', 'KB-01', 'Keyboard', 40, 1),
  (103, '2025-03-09', 'Asha', 'asha@new-mail.com', 'Pune', 'MN-27', 'Monitor 27in', 210, 1),
  (104, '2025-03-12', 'Chen', 'chen@mail.com', 'Austin', 'MS-02', 'Mouse', 18, 3),
  (105, '2025-03-15', 'Ben', 'ben@mail.com', 'Leeds', 'MN-27', 'Monitor 27 inch', 210, 2);

-- The same facts, normalized to 3NF
CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL
);
CREATE TABLE products (
  sku TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  list_price NUMERIC NOT NULL
);
CREATE TABLE orders (
  order_id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(customer_id),
  order_date TEXT NOT NULL
);
CREATE TABLE order_items (
  order_id INTEGER NOT NULL REFERENCES orders(order_id),
  sku TEXT NOT NULL REFERENCES products(sku),
  qty INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  PRIMARY KEY (order_id, sku)
);
INSERT INTO customers VALUES
  (1, 'Asha', 'asha@new-mail.com', 'Pune'),
  (2, 'Ben', 'ben@mail.com', 'Leeds'),
  (3, 'Chen', 'chen@mail.com', 'Austin');
INSERT INTO products VALUES
  ('KB-01', 'Keyboard', 40),
  ('MS-02', 'Mouse', 18),
  ('MN-27', 'Monitor 27in', 210);
INSERT INTO orders VALUES
  (101, 1, '2025-03-01'),
  (102, 2, '2025-03-04'),
  (103, 1, '2025-03-09'),
  (104, 3, '2025-03-12'),
  (105, 2, '2025-03-15');
INSERT INTO order_items VALUES
  (101, 'KB-01', 1, 40),
  (101, 'MS-02', 2, 15),
  (102, 'KB-01', 1, 40),
  (103, 'MN-27', 1, 210),
  (104, 'MS-02', 3, 18),
  (105, 'MN-27', 2, 210);
\`\`\``,
    answer: `**Target Audience:** Beginners who have built a few tables and want to understand why schemas are split the way they are, plus candidates who need to define 1NF to BCNF precisely.
**Difficulty:** Medium
**Engines:** The idea is engine independent. Every query here ran on SQLite 3.45.0 (sql.js 1.10.2, the engine the runnable examples use) and PostgreSQL 16.15 with the same results; the one difference found is called out in section 4.

> **How to read this doc:** Each idea is first explained in plain language, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and error shown was produced by actually running it; the **Verified** section quotes each example output in full.

## 1. Why This Even Matters — A Story First

A small shop keeps its orders in one spreadsheet. Every row has the order number, the date, the customer name, email and city, the product code, name and price, and the quantity. It works fine for a month.

Then Asha emails to say she has a new address. The shop assistant finds her latest order and fixes the email there. Next week the marketing mail goes to her *old* email, because her first order still says \`asha@old-mail.com\`. Then the shop deletes Chen's only order after a refund, and Chen disappears from the business entirely: there is no other row that remembers Chen exists. And when a new headset arrives in stock, there is nowhere to record it until somebody orders one.

None of these bugs is a typo. They come from the **shape** of the table: the same fact (Asha's email, the name of product \`MN-27\`) is written in many rows, and the rows can drift apart. **Normalization** is the discipline of reshaping tables so every fact lives in exactly one place. It is one of the most asked database interview questions because it shows whether you can design a schema, not just query one.

## 2. The Core Idea: One Fact, One Place

📌 **Interview term: normalization** — organising columns into tables so that each fact is stored once, in the table whose key it depends on, removing redundancy and the anomalies it causes. Edgar F. Codd introduced it alongside the relational model; Wikipedia dates first normal form to 1970, second and third to 1971, and Boyce-Codd normal form to 1974 ([Database normalization](https://en.wikipedia.org/wiki/Database_normalization)).

📌 **Interview term: redundancy** — the same fact stored in more than one row. Not every repeated value is redundant: two customers can both live in Pune. A value is redundant when it is *determined* by something else stored nearby, so it could be derived instead of stored.

The flat table in the schema above is the spreadsheet. The first example asks it a simple question: does any customer have more than one email on file?

~~~text
customer_name | emails_on_file | one_email | other_email
Asha | 2 | asha@new-mail.com | asha@old-mail.com
~~~

Asha has two. Nobody typed anything wrong; order 103 was simply saved after she changed address, and order 101 was not updated.

📌 **Interview term: update anomaly** — changing one fact requires updating many rows, and missing one leaves the data contradicting itself.

📌 **Interview term: delete anomaly** — deleting one fact (an order) also deletes an unrelated fact (that the customer exists). On the flat table:

~~~sql
DELETE FROM orders_flat WHERE order_id = 104;
SELECT COUNT(*) AS rows_mentioning_chen FROM orders_flat WHERE customer_name = 'Chen';
~~~

~~~text
rows_mentioning_chen
0
~~~

📌 **Interview term: insert anomaly** — you cannot record one fact without inventing another. A new product with no order yet has no \`order_id\` to go with it. Section 4 shows the two engines reacting differently to that insert.

## 3. Functional Dependencies: The Tool Behind Every Normal Form

📌 **Interview term: functional dependency** — \`X -> Y\` means "if two rows agree on X, they must agree on Y". In a shop, \`customer_email -> customer_city\` (one customer, one city), and \`product_sku -> product_name\`. X is called the **determinant**.

Normal forms are rules about which dependencies a table may contain. So the first step of normalizing is not drawing tables; it is asking which column decides which. You can test a suspected dependency against real data. The second example checks whether \`product_sku\` decides the name and the price in the flat table:

~~~text
product_sku | names_seen | prices_seen
KB-01 | 1 | 1
MN-27 | 2 | 1
MS-02 | 1 | 2
~~~

Two findings, and they need opposite treatment:

- \`MN-27\` has two names ("Monitor 27in" and "Monitor 27 inch"). The name *should* depend on the SKU alone; the data broke that rule because it was retyped. That is redundancy: move the name to a \`products\` table keyed by SKU.
- \`MS-02\` has two prices, 15 and 18. That is **not** a bug: the mouse was cheaper on 1 March than on 12 March. The price *paid* depends on the order line (\`order_id, sku\`), not on the product. So it stays on \`order_items.unit_price\`, and \`products.list_price\` holds only today's price.

This is the judgement interviewers look for: normalization follows the business rules, not the presence of duplicate strings.

📌 **Interview term: candidate key** — a minimal set of columns that uniquely identifies a row. The flat table's key is \`(order_id, product_sku)\`; one of the candidate keys is chosen as the primary key (see [primary key vs foreign key](/interview-question/what-is-the-difference-between-a-primary-key-and-a-foreign-key)).

## 4. The Normal Forms, One at a Time

<svg class="iq-diagram" width="100%" viewBox="0 0 760 200" role="img" aria-label="The normal forms build on each other: 1NF, then 2NF, then 3NF, then BCNF">
  <defs>
    <marker id="sql11q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="10" y="60" width="150" height="80" rx="10"/>
  <text class="d-text" x="85" y="92" text-anchor="middle">1NF</text>
  <text class="d-sub" x="85" y="116" text-anchor="middle">atomic values</text>
  <rect class="d-box" x="205" y="60" width="150" height="80" rx="10"/>
  <text class="d-text" x="280" y="92" text-anchor="middle">2NF</text>
  <text class="d-sub" x="280" y="116" text-anchor="middle">whole key</text>
  <rect class="d-box-accent" x="400" y="60" width="150" height="80" rx="10"/>
  <text class="d-text" x="475" y="92" text-anchor="middle">3NF</text>
  <text class="d-sub" x="475" y="116" text-anchor="middle">nothing but the key</text>
  <rect class="d-box" x="595" y="60" width="150" height="80" rx="10"/>
  <text class="d-text" x="670" y="92" text-anchor="middle">BCNF</text>
  <text class="d-sub" x="670" y="116" text-anchor="middle">every determinant</text>
  <path class="d-edge" d="M 164 100 L 199 100" marker-end="url(#sql11q1-arrow2)"/>
  <path class="d-edge" d="M 359 100 L 394 100" marker-end="url(#sql11q1-arrow2)"/>
  <path class="d-edge" d="M 554 100 L 589 100" marker-end="url(#sql11q1-arrow2)"/>
</svg>

Each form includes the one before it. The popular one-liner for 2NF and 3NF together is that every non-key column must depend on "the key, the whole key, and nothing but the key".

### First normal form (1NF): one value per cell

📌 **Interview term: 1NF** — every column holds a single atomic value of its type, there are no repeating groups (\`phone1\`, \`phone2\`, \`phone3\`), and each row is identifiable by a key.

The classic violation is a comma-separated list in a column, such as \`tags = '1,12,21'\`. The database sees one string, so a search for tag 2 turns into string matching, and the naive version is wrong:

~~~sql
SELECT '1,12,21' LIKE '%2%' AS naive_has_tag_2,
       ',' || '1,12,21' || ',' LIKE '%,2,%' AS exact_has_tag_2;
~~~

~~~text
naive_has_tag_2 | exact_has_tag_2
1 | 0
~~~

(SQLite prints booleans as 1 and 0.) Even the exact version cannot use an index, cannot have a foreign key to a \`tags\` table, and cannot stop someone storing \`'1,,x'\`. The 1NF fix is a child table with one row per (item, tag).

The flat table *is* in 1NF: each cell holds one value. It still has every anomaly from section 2, which is why 1NF alone is not enough.

### Second normal form (2NF): depend on the whole key

📌 **Interview term: partial dependency** — a non-key column depends on only part of a composite key.

📌 **Interview term: 2NF** — 1NF plus no partial dependencies.

The flat key is \`(order_id, product_sku)\`. But \`product_name\` depends only on \`product_sku\`, and \`order_date\`, \`customer_name\`, \`customer_email\` depend only on \`order_id\`. Each partial dependency moves to its own table: product facts to \`products(sku, ...)\`, order facts to \`orders(order_id, ...)\`. What remains keyed by the whole \`(order_id, sku)\` is what truly needs both: \`qty\` and the price paid. That is \`order_items\`.

A table with a single-column primary key cannot have a partial dependency, so it is automatically in 2NF once it is in 1NF.

### Third normal form (3NF): nothing but the key

📌 **Interview term: transitive dependency** — a non-key column depends on another non-key column, which depends on the key: \`order_id -> customer_email -> customer_city\`.

📌 **Interview term: 3NF** — 2NF plus no transitive dependencies of non-key columns on the key.

After the 2NF step, \`orders\` would still carry \`customer_name, customer_email, customer_city\`. They depend on the customer, not on the order. Move them to \`customers\` and leave a \`customer_id\` foreign key in \`orders\`. Now the schema in the example block is reached:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="One wide orders_flat table decomposed into customers, orders, order_items and products">
  <defs>
    <marker id="sql11q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="230" y="20" width="300" height="70" rx="10"/>
  <text class="d-text" x="380" y="50" text-anchor="middle">orders_flat</text>
  <text class="d-sub" x="380" y="72" text-anchor="middle">9 columns, customer and product repeated</text>
  <rect class="d-box-accent" x="20" y="200" width="160" height="80" rx="10"/>
  <text class="d-text" x="100" y="232" text-anchor="middle">customers</text>
  <text class="d-sub" x="100" y="256" text-anchor="middle">name, email, city</text>
  <rect class="d-box-accent" x="210" y="200" width="160" height="80" rx="10"/>
  <text class="d-text" x="290" y="232" text-anchor="middle">orders</text>
  <text class="d-sub" x="290" y="256" text-anchor="middle">customer_id, date</text>
  <rect class="d-box-accent" x="400" y="200" width="160" height="80" rx="10"/>
  <text class="d-text" x="480" y="232" text-anchor="middle">order_items</text>
  <text class="d-sub" x="480" y="256" text-anchor="middle">qty, unit_price</text>
  <rect class="d-box-accent" x="590" y="200" width="150" height="80" rx="10"/>
  <text class="d-text" x="665" y="232" text-anchor="middle">products</text>
  <text class="d-sub" x="665" y="256" text-anchor="middle">name, list_price</text>
  <path class="d-edge" d="M 300 94 L 110 194" marker-end="url(#sql11q1-arrow)"/>
  <path class="d-edge" d="M 350 94 L 295 194" marker-end="url(#sql11q1-arrow)"/>
  <path class="d-edge" d="M 410 94 L 475 194" marker-end="url(#sql11q1-arrow)"/>
  <path class="d-edge" d="M 460 94 L 655 194" marker-end="url(#sql11q1-arrow)"/>
</svg>

Each box answers one question: who is the customer, what is the product, when was the order, and what was on it. The third example joins them back into the original report:

~~~text
order_id | customer | city | product | qty | unit_price | line_total
101 | Asha | Pune | Keyboard | 1 | 40 | 40
101 | Asha | Pune | Mouse | 2 | 15 | 30
102 | Ben | Leeds | Keyboard | 1 | 40 | 40
103 | Asha | Pune | Monitor 27in | 1 | 210 | 210
104 | Chen | Austin | Mouse | 3 | 18 | 54
105 | Ben | Leeds | Monitor 27in | 2 | 210 | 420
~~~

📌 **Interview term: lossless decomposition** — splitting a table so that joining the parts gives back exactly the original rows, no more and no fewer. It is guaranteed when each split happens along a functional dependency and the shared column is a key of one side. The join above reproduces every line of the flat table, now with one email for Asha and one name for the monitor.

### The insert anomaly, and an engine difference

On the flat table, recording a new headset without an order means leaving \`order_id\` empty. PostgreSQL 16 refuses, because primary key columns are implicitly \`NOT NULL\`:

~~~text
ERROR:  null value in column "order_id" of relation "orders_flat" violates not-null constraint
DETAIL:  Failing row contains (null, null, null, null, null, HD-01, Headset, 60, null).
~~~

SQLite 3.45 accepts the same insert:

~~~text
order_id | product_sku | product_name
NULL | HD-01 | Headset
~~~

That is a documented SQLite quirk: a \`PRIMARY KEY\` on columns other than a single \`INTEGER PRIMARY KEY\` does not imply \`NOT NULL\` unless you write it. Either way the flat design is wrong: one engine blocks a legitimate fact, the other stores a half-row. In the normalized schema the headset is simply \`INSERT INTO products VALUES ('HD-01', 'Headset', 60)\`.

### Boyce-Codd normal form (BCNF)

📌 **Interview term: BCNF** — for every non-trivial functional dependency \`X -> Y\`, X is a superkey (contains a candidate key). 3NF has one loophole: it allows \`X -> Y\` when Y is itself part of a candidate key. BCNF closes it.

The textbook case: a table \`(student, course, tutor)\` where each tutor teaches exactly one course (\`tutor -> course\`) and a student has one tutor per course. Keys are \`(student, course)\` and \`(student, tutor)\`. Every column is part of some key, so it is in 3NF, yet \`tutor -> course\` means the course of each tutor is repeated for every student. Splitting into \`tutors(tutor, course)\` and \`enrolments(student, tutor)\` reaches BCNF. The difference only appears with overlapping composite candidate keys, which is why most 3NF schemas are already BCNF.

📌 **Interview term: 4NF / 5NF** — higher forms for multi-valued and join dependencies (for example, a person's skills and languages stored as all combinations in one table). Rare in practice; know that they exist.

## 5. What Normalization Costs, and Where It Stops

| | Flat (unnormalized) | Normalized (3NF / BCNF) |
| :--- | :--- | :--- |
| Change a customer email | Update every order row; miss one and data contradicts itself | Update one row in \`customers\` |
| Record a product with no orders | Not possible (or half-rows) | One insert into \`products\` |
| Delete the last order of a customer | Customer vanishes | Customer stays |
| Read an order report | One table scan | A join of 4 tables on indexed keys |
| Constraints | Hard to express | \`UNIQUE(email)\`, foreign keys, \`NOT NULL\` per table |

The read side is the cost. For OLTP workloads, joins on primary and foreign keys with indexes are cheap. For large analytical scans and very hot read paths, teams **denormalize on purpose** — copy a value, cache a total, build a star schema — accepting redundancy in exchange for fewer joins. That is the subject of [What is denormalization and when should you use it?](/interview-question/what-is-denormalization-and-when-should-you-use-it), and the workload split is explained in [OLTP vs OLAP](/interview-question/what-is-the-difference-between-oltp-and-olap-databases).

## 6. Verified: Running the Code

The three examples ran the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above), and again on PostgreSQL 16.15 in a scratch database, with identical output. The delete, insert and 1NF snippets in the text were run the same way; their outputs are quoted where they appear.

Example 1, update anomaly:

~~~text
customer_name | emails_on_file | one_email | other_email
Asha | 2 | asha@new-mail.com | asha@old-mail.com
~~~

Example 2, functional dependency test:

~~~text
product_sku | names_seen | prices_seen
KB-01 | 1 | 1
MN-27 | 2 | 1
MS-02 | 1 | 2
~~~

Example 3, normalized tables joined back:

~~~text
order_id | customer | city | product | qty | unit_price | line_total
101 | Asha | Pune | Keyboard | 1 | 40 | 40
101 | Asha | Pune | Mouse | 2 | 15 | 30
102 | Ben | Leeds | Keyboard | 1 | 40 | 40
103 | Asha | Pune | Monitor 27in | 1 | 210 | 210
104 | Chen | Austin | Mouse | 3 | 18 | 54
105 | Ben | Leeds | Monitor 27in | 2 | 210 | 420
~~~

## Common Pitfalls

- **Normalizing by string duplication instead of dependencies.** Two customers in Pune is not redundancy; a city that depends on a customer stored on every order is.
- **Moving the sale price to \`products\`.** The price paid is a fact about the order line. Putting it on the product rewrites history every time the price changes.
- **Stopping at 1NF and calling it normalized.** The flat table here is in 1NF and still has update, insert and delete anomalies.
- **Comma-separated IDs in a column.** No index, no foreign key, and \`LIKE '%2%'\` matches 12 and 21.
- **Normalizing without constraints.** Splitting tables but skipping \`UNIQUE(email)\` and foreign keys lets the same anomalies return through the application.
- **Treating 3NF as a law for every workload.** Analytics and caches are often denormalized on purpose; the skill is knowing which copy you made and how it stays correct.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Normalization</strong> is organising tables so that every fact is stored exactly once, in the table whose key it depends on. The goal is not saving disk; it is removing the <strong style="color:#ffca28;">update, insert and delete anomalies</strong> that redundancy causes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The forms:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">1NF</strong>: one atomic value per cell, no repeating groups. <strong style="color:#ffca28;">2NF</strong>: no column depends on only part of a composite key. <strong style="color:#ffca28;">3NF</strong>: no non-key column depends on another non-key column. In one line: every column depends on the key, the whole key and nothing but the key.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Example:</strong> <span style="color:#f0e2c8;">A flat order sheet repeats the customer email on every line. When Asha changes her email and only one row is updated, the table holds two emails for one person. Splitting into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">customers</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">products</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">orders</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">order_items</code> stores her email once, and a join rebuilds the report.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Judgement:</strong> <span style="color:#f0e2c8;">Not every repeated value is redundancy. The price paid sits on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">order_items</code> because it is a fact about the sale; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">products.list_price</code> is today's price. Normalization is driven by <strong style="color:#ffca28;">functional dependencies</strong> in the business, not by spotting duplicate strings.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Trade-off:</strong> <span style="color:#f0e2c8;">Normalized schemas mean more joins on reads but simple, safe writes enforced by keys. OLTP systems usually target <strong style="color:#ffca28;">3NF</strong> (or BCNF) and then <strong style="color:#ffca28;">denormalize</strong> a few hot read paths on purpose, with a plan for keeping the copies in sync.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between 3NF and BCNF?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">3NF allows a dependency <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">X -&gt; A</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A</code> is part of some candidate key; BCNF does not, it requires every determinant <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">X</code> to be a superkey. The two differ only when a table has overlapping composite candidate keys, which is rare, so most 3NF designs are already BCNF.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a comma-separated list in a column a 1NF violation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes for practical purposes: the database cannot index, constrain or join the items. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'1,12,21' LIKE '%2%'</code> is true even though tag 2 is not in the list. Use a child table with one row per item, or a real array or JSON type when the list is truly opaque.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does normalization make queries slower?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Reads need joins, and joins on indexed keys are cheap for OLTP-sized lookups. Writes get faster and safer because one row changes instead of many. Slowness usually shows up in wide analytical scans, which is why warehouses use star schemas instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you find the right tables for a messy spreadsheet?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">List the <strong style="color:#ffca28;">functional dependencies</strong>: which column decides which (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sku -&gt; name</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">customer -&gt; email</code>). Each determinant becomes a key of its own table, its dependents move with it, and the original key keeps only the facts that need all of it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there anything past BCNF?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">4NF removes independent multi-valued facts stored in one table (a person with several skills and several languages), and 5NF handles join dependencies. They come up in theory interviews; in practice 3NF or BCNF plus good constraints is the usual target.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Normalization | Organising tables so each fact is stored once, in the table whose key it depends on |
| Redundancy | A fact stored in several rows, derivable from something else |
| Update anomaly | Changing a fact needs many row updates; missing one causes contradictions |
| Delete anomaly | Deleting one fact also loses an unrelated fact |
| Insert anomaly | A fact cannot be recorded without inventing another |
| Functional dependency | \`X -> Y\`: rows that agree on X agree on Y; X is the determinant |
| Candidate key | A minimal set of columns that uniquely identifies a row |
| 1NF | Atomic values, no repeating groups, rows identifiable by a key |
| Partial dependency | A non-key column depends on part of a composite key |
| 2NF | 1NF with no partial dependencies |
| Transitive dependency | A non-key column depends on another non-key column |
| 3NF | 2NF with no transitive dependencies |
| Lossless decomposition | A split whose join gives back exactly the original rows |
| BCNF | Every determinant of a non-trivial dependency is a superkey |
| 4NF / 5NF | Higher forms for multi-valued and join dependencies |

**Conclusion:** Normalization is not about saving bytes; it is about making each fact live in exactly one place so it cannot contradict itself. Find the functional dependencies, give each determinant its own table, keep on the composite key only what needs the whole key, and link the tables with foreign keys. The flat orders table here showed all three anomalies on real data; the normalized version stores Asha's email once and still rebuilds the same report with a join. Aim for 3NF or BCNF by default, then denormalize only where a measured read path needs it.`,
    examples: [
      {
        label: `Update anomaly: the flat table now holds two different emails for the same customer`,
        code: `SELECT customer_name,
       COUNT(DISTINCT customer_email) AS emails_on_file,
       MIN(customer_email) AS one_email,
       MAX(customer_email) AS other_email
FROM orders_flat
GROUP BY customer_name
HAVING COUNT(DISTINCT customer_email) > 1
ORDER BY customer_name;`,
      },
      {
        label: `Test a functional dependency: does product_sku decide the name and the price?`,
        code: `SELECT product_sku,
       COUNT(DISTINCT product_name) AS names_seen,
       COUNT(DISTINCT unit_price) AS prices_seen
FROM orders_flat
GROUP BY product_sku
ORDER BY product_sku;`,
      },
      {
        label: `The normalized tables joined back into the same order report`,
        code: `SELECT o.order_id, c.name AS customer, c.city,
       p.name AS product, oi.qty, oi.unit_price,
       oi.qty * oi.unit_price AS line_total
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
JOIN order_items oi ON oi.order_id = o.order_id
JOIN products p ON p.sku = oi.sku
ORDER BY o.order_id, p.sku;`,
      },
    ],
  },
  {
    title: `What is denormalization and when should you use it?`,
    difficulty: "medium",
    seoDescription: `Denormalization explained: cached totals, counters, copied columns and materialized views, when they pay off, and how to keep them in sync without drift.`,
    description: `**Question presented to candidate:**
"You have a nicely normalized schema, but the order list page and the revenue dashboard are slow because every request joins and sums. What is denormalization, when would you do it, and how do you keep the copied data correct?"

**What a strong answer should cover:**
- Denormalization is deliberately storing redundant or precomputed data (a copied column, a cached total or counter, a summary table) to make reads cheaper, starting from a normalized design rather than skipping it
- When it pays off: read-heavy paths measured to be slow, expensive aggregates on every request, analytics (star schemas), and values that must be frozen at a point in time (price or address on the order)
- The cost: every write must update the copies, so there is a sync mechanism (same transaction, trigger, materialized view refresh, or async job) and a defined staleness
- The tools on PostgreSQL: triggers, materialized views and \`REFRESH MATERIALIZED VIEW [CONCURRENTLY]\`, generated columns; plus a reconciliation query that detects drift
- Alternatives to try first: indexes, covering indexes, query rewrites, caching outside the database

**Clarifying questions expected:**
- What is the read/write ratio, and which query is actually slow (with a plan)?
- How fresh must the denormalized value be: exact at commit time, or minutes behind?
- Is the copy a cache of current data or a historical snapshot that must not change?

**Code / implementation expected:** Yes — a cached column kept in sync (transaction or trigger), a summary via materialized view, and a drift check.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  order_count INTEGER NOT NULL DEFAULT 0  -- denormalized: copy of COUNT(orders)
);
CREATE TABLE orders (
  order_id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(customer_id),
  customer_city TEXT NOT NULL,           -- denormalized: copied from customers
  order_date TEXT NOT NULL,
  total NUMERIC NOT NULL                 -- denormalized: copy of SUM(order_items)
);
CREATE TABLE order_items (
  order_id INTEGER NOT NULL REFERENCES orders(order_id),
  sku TEXT NOT NULL,
  qty INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  PRIMARY KEY (order_id, sku)
);
INSERT INTO customers VALUES
  (1, 'Asha', 'Pune', 2),
  (2, 'Ben', 'Leeds', 2),
  (3, 'Chen', 'Austin', 1);
INSERT INTO orders VALUES
  (101, 1, 'Pune', '2025-03-01', 70),
  (102, 2, 'Leeds', '2025-03-04', 40),
  (103, 1, 'Pune', '2025-03-09', 210),
  (104, 3, 'Austin', '2025-03-12', 54),
  (105, 2, 'Leeds', '2025-03-15', 400);
INSERT INTO order_items VALUES
  (101, 'KB-01', 1, 40),
  (101, 'MS-02', 2, 15),
  (102, 'KB-01', 1, 40),
  (103, 'MN-27', 1, 210),
  (104, 'MS-02', 3, 18),
  (105, 'MN-27', 2, 210);
\`\`\``,
    answer: `**Target Audience:** Developers who know what normalization is and now face slow reads, plus candidates who need to discuss read/write trade-offs and sync mechanisms precisely.
**Difficulty:** Medium
**Engines:** The SQLite examples ran on SQLite 3.45.0 (sql.js 1.10.2, the page engine). Triggers and materialized views are shown on PostgreSQL 16.15, run in a scratch database for this page. SQLite has triggers but no materialized views.

> **How to read this doc:** Each idea is first explained in plain language, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result shown was produced by actually running it; the **Verified** section quotes each example output in full.

## 1. Why This Even Matters — A Story First

A library keeps one master catalogue: every book, every author, every loan, each fact written once. To answer "how many books has Asha borrowed?" a librarian walks to the loans ledger and counts. That is correct, but slow when a queue of people all ask.

So the librarian starts writing a running tally on the front of Asha's library card. Now the answer takes one glance. The catch: every time Asha borrows a book, someone must remember to update the card. Forget once and the card says 12 while the ledger says 13, and nobody knows which is right unless the ledger is recounted.

That tally is **denormalization**: a deliberate copy of a fact, kept somewhere it is cheaper to read, paid for with extra work on every write. The interview question is really about judgement: when the speed is worth the risk, and how you stop the card and the ledger from disagreeing.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which query is slow, and what does its plan show? | A missing index is fixed without any redundancy; denormalize only after the plan shows a join or aggregate you cannot make cheap |
| What is the read to write ratio of this data? | A copy read a million times and written ten times is cheap to maintain; one written constantly is not |
| How fresh must the value be? | Exact-at-commit needs a transaction or trigger; minutes behind allows a materialized view or async job |
| Is the copy a cache of current data or a historical snapshot? | A price or address on an order must not change later; a cached total must always change |
| How many writers touch the same row? | A single counter row updated by every insert becomes a lock hot spot |

## 3. The Core Idea

📌 **Interview term: denormalization** — intentionally adding redundant or precomputed data to a normalized schema to make specific reads cheaper, accepting extra write work and a risk of inconsistency.

📌 **Interview term: source of truth** — the one place a fact is authoritative. In the schema above, \`order_items\` is the source of truth for what an order contains; \`orders.total\` and \`customers.order_count\` are copies derived from it.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="Normalized read joins three tables at query time while the denormalized read uses one stored column">
  <defs>
    <marker id="sql11q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="150" height="56" rx="8"/>
  <text class="d-text" x="95" y="63" text-anchor="middle">customers</text>
  <rect class="d-box" x="20" y="100" width="150" height="56" rx="8"/>
  <text class="d-text" x="95" y="133" text-anchor="middle">orders</text>
  <rect class="d-box" x="20" y="170" width="150" height="56" rx="8"/>
  <text class="d-text" x="95" y="203" text-anchor="middle">order_items</text>
  <rect class="d-box-muted" x="250" y="95" width="150" height="66" rx="8"/>
  <text class="d-text" x="325" y="124" text-anchor="middle">JOIN + SUM</text>
  <text class="d-sub" x="325" y="146" text-anchor="middle">every request</text>
  <path class="d-edge" d="M 174 58 L 244 115" marker-end="url(#sql11q2-arrow)"/>
  <path class="d-edge" d="M 174 128 L 244 128" marker-end="url(#sql11q2-arrow)"/>
  <path class="d-edge" d="M 174 198 L 244 141" marker-end="url(#sql11q2-arrow)"/>
  <rect class="d-box-accent" x="520" y="60" width="210" height="66" rx="8"/>
  <text class="d-text" x="625" y="89" text-anchor="middle">orders.total</text>
  <text class="d-sub" x="625" y="111" text-anchor="middle">read one column</text>
  <rect class="d-box" x="520" y="160" width="210" height="66" rx="8"/>
  <text class="d-text" x="625" y="189" text-anchor="middle">write path</text>
  <text class="d-sub" x="625" y="211" text-anchor="middle">must update the copy</text>
  <path class="d-edge-dashed" d="M 625 156 L 625 132" marker-end="url(#sql11q2-arrow)"/>
</svg>

On the left, the normalized read joins and sums on every request. On the right, the read touches one stored column, and the cost moves to the write path, which must keep that column correct.

The usual forms of denormalization:

| Form | Example in this schema | Kept in sync by |
| :--- | :--- | :--- |
| Cached aggregate | \`orders.total\` = \`SUM(qty * unit_price)\` | Trigger, or same transaction |
| Cached counter | \`customers.order_count\` | Same transaction, trigger, or periodic recount |
| Copied column | \`orders.customer_city\` from \`customers.city\` | Depends: cache or snapshot (section 5) |
| Summary table | Revenue per city | Materialized view refresh or scheduled job |
| Pre-joined analytics model | Star schema fact and dimension tables | ETL / ELT pipeline |

With the copies in place, the revenue-by-city report reads one table, no join and no line items:

~~~sql
SELECT customer_city, COUNT(*) AS orders, SUM(total) AS revenue
FROM orders GROUP BY customer_city ORDER BY revenue DESC;
~~~

~~~text
customer_city | orders | revenue
Leeds | 2 | 440
Pune | 2 | 280
Austin | 1 | 54
~~~

Leeds says 440, but its real line items sum to 460. The next section shows why.

## 4. The Price: Drift

📌 **Interview term: drift** (data inconsistency) — the copy and the source of truth disagree because some write updated one and not the other.

📌 **Interview term: reconciliation query** — a query that recomputes the derived value from the source of truth and lists the rows where the copy is wrong. Run it in tests and on a schedule in production.

The seed data has a deliberate bug: order 105 was edited from one monitor to two, and the code path that changed the line forgot the total. The first example finds it:

~~~text
order_id | stored_total | real_total
105 | 400 | 420
~~~

Every report that trusted \`orders.total\`, including the city report above, is now wrong by 20. This is the real cost of denormalization: not the extra bytes, but every code path that writes the source now has a second job.

## 5. Keeping the Copies Correct

### Option 1: the same transaction

The simplest rule: the statement that changes the source and the statement that changes the copy commit together. The second example inserts a new order for Chen, its line and the counter update in one transaction, then compares the cached count with a real count:

~~~sql
BEGIN;
INSERT INTO orders VALUES (106, 3, 'Austin', '2025-03-20', 80);
INSERT INTO order_items VALUES (106, 'KB-01', 2, 40);
UPDATE customers SET order_count = order_count + 1 WHERE customer_id = 3;
COMMIT;
SELECT c.name, c.order_count AS cached_count,
       (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.customer_id) AS real_count
FROM customers c ORDER BY c.customer_id;
~~~

~~~text
name | cached_count | real_count
Asha | 2 | 2
Ben | 2 | 2
Chen | 2 | 2
~~~

📌 **Interview term: atomic update of a copy** — changing the source and its copy in one [transaction](/interview-question/when-would-you-use-a-transaction-explicitly), so either both happen or neither does. It is correct only if *every* writer follows the rule, which is the weakness: one forgotten script and the copy drifts.

### Option 2: a trigger

📌 **Interview term: trigger-maintained column** — a [trigger](/interview-question/what-is-a-database-trigger) on the source table recomputes the copy on every insert, update and delete, so no code path can forget it.

The third example (PostgreSQL) recomputes \`orders.total\` from the lines after each change. It also repairs the drift on order 105 because the insert on that order recomputes it from scratch:

~~~sql
CREATE FUNCTION sync_order_total() RETURNS trigger AS $$
BEGIN
  UPDATE orders o
  SET total = (SELECT COALESCE(SUM(qty * unit_price), 0)
               FROM order_items i WHERE i.order_id = o.order_id)
  WHERE o.order_id = COALESCE(NEW.order_id, OLD.order_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_items_sync
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW EXECUTE FUNCTION sync_order_total();

INSERT INTO order_items VALUES (105, 'MS-02', 1, 18);
UPDATE order_items SET qty = 4 WHERE order_id = 104 AND sku = 'MS-02';
DELETE FROM order_items WHERE order_id = 101 AND sku = 'MS-02';

SELECT order_id, total FROM orders ORDER BY order_id;
~~~

~~~text
order_id | total
101 | 40
102 | 40
103 | 210
104 | 72
105 | 438
~~~

Order 105 went from the wrong 400 to 438 (420 plus the new 18 mouse), order 104 to 72 after the quantity change, and order 101 to 40 after a line was deleted. The trigger costs one extra \`UPDATE\` per changed line and hides work from anyone reading the application code, which is the usual objection.

### Option 3: a materialized view

📌 **Interview term: materialized view** — a query whose result is stored as a table and recomputed on \`REFRESH\`. It is denormalization the database manages for you, with staleness between refreshes. (Full treatment: [What is a view and a materialized view?](/interview-question/what-is-a-view-and-a-materialized-view))

The fourth example builds revenue per city, adds a new Austin order, and compares a copy taken before the refresh with the view after it:

~~~text
snapshot | city | revenue
before refresh | Austin | 54
after refresh | Austin | 134
~~~

📌 **Interview term: staleness** — how far behind the source a copy may be. Here the view was wrong (54) until the refresh; that is acceptable for a dashboard updated every few minutes, not for an account balance.

\`REFRESH MATERIALIZED VIEW\` without options blocks reads of the view while it runs: checked here by refreshing inside an open transaction and reading \`pg_locks\`, which showed an \`AccessExclusiveLock\` on the view, the lock mode that conflicts even with \`SELECT\`. \`CONCURRENTLY\` avoids that, but PostgreSQL 16 refuses it unless the view has a unique index:

~~~text
ERROR:  cannot refresh materialized view "public.city_counts" concurrently
HINT:  Create a unique index with no WHERE clause on one or more columns of the materialized view.
~~~

### A cache or a snapshot?

Not every copied column should be synced. Asha moves to Mumbai:

~~~sql
UPDATE customers SET city = 'Mumbai' WHERE customer_id = 1;
SELECT o.order_id, o.customer_city AS city_on_order, c.city AS city_now
FROM orders o JOIN customers c ON c.customer_id = o.customer_id
WHERE c.customer_id = 1 ORDER BY o.order_id;
~~~

~~~text
order_id | city_on_order | city_now
101 | Pune | Mumbai
103 | Pune | Mumbai
~~~

If \`orders.customer_city\` means "where the customer lives now", this is drift. If it means "where this order was shipped", it is exactly right and must never be updated.

📌 **Interview term: snapshot column** — a copy taken at a point in time that records history (price paid, ship-to address, tax rate applied). It looks like denormalization but is actually a separate fact, and normalization theory agrees: it depends on the order, not on the customer.

## 6. When to Denormalize, and When Not To

| Situation | Denormalize? | Why |
| :--- | :--- | :--- |
| Order list page shows each order total, millions of views a day | Often yes: cached \`total\` | Read once per view, written once per edit |
| Dashboard sums a year of sales on every page load | Yes: materialized view or summary table | Minutes of staleness is acceptable |
| Analytics warehouse | Yes: star schema | Scans favour wide pre-joined tables; see [OLTP vs OLAP](/interview-question/what-is-the-difference-between-oltp-and-olap-databases) |
| Query slow because of a missing index | No | Add the index; see [how to optimize a slow query](/interview-question/how-do-you-optimize-a-slow-sql-query) |
| Account balance with many concurrent writers | Careful | A single hot row serialises writers; prefer an append-only ledger plus periodic balance |
| Data changes constantly and is rarely read | No | Sync cost exceeds the read saving |

Start from the normalized design in [What is database normalization?](/interview-question/what-is-database-normalization), measure, and add copies one at a time with a named source of truth.

## 7. Verified: Running the Code

Examples 1 and 2 ran the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above). Examples 3 and 4, and the \`CONCURRENTLY\` error, ran on PostgreSQL 16.15 in a scratch database seeded with the same schema. The city report and the Mumbai snapshot query ran on SQLite.

Example 1, drift check:

~~~text
order_id | stored_total | real_total
105 | 400 | 420
~~~

Example 2, counter updated in the same transaction:

~~~text
name | cached_count | real_count
Asha | 2 | 2
Ben | 2 | 2
Chen | 2 | 2
~~~

Example 3, trigger-maintained total (PostgreSQL):

~~~text
order_id | total
101 | 40
102 | 40
103 | 210
104 | 72
105 | 438
~~~

Example 4, materialized view before and after refresh (PostgreSQL):

~~~text
snapshot | city | revenue
before refresh | Austin | 54
after refresh | Austin | 134
~~~

## Common Pitfalls

- **Denormalizing before measuring.** Most slow reads are a missing index or a bad query; redundancy is the expensive fix.
- **No reconciliation query.** Drift is silent; without a check like example 1 you find out from a customer.
- **Syncing a snapshot.** Updating old orders when a customer moves rewrites history; decide cache or snapshot per column.
- **Forgetting deletes and updates.** A trigger on \`INSERT\` only keeps totals right until the first edit or refund.
- **A single hot counter row.** Every concurrent insert waits on the same row lock; use delta rows or periodic recounts for very hot counters.
- **Assuming the materialized view is current.** It is exactly as fresh as the last \`REFRESH\`; schedule it and show users the refresh time.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Denormalization</strong> is deliberately storing redundant or precomputed data, such as a copied column, a cached total or counter, or a summary table, so that reads need fewer joins or aggregates. It is a step taken *after* normalizing, for a measured reason.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. When:</strong> <span style="color:#f0e2c8;">Read-heavy paths where the join or aggregate is the measured bottleneck, dashboards that sum millions of rows on every request, analytics in <strong style="color:#ffca28;">star schemas</strong>, and values that must be <strong style="color:#ffca28;">frozen</strong> at a point in time, like the price or address on an order.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cost:</strong> <span style="color:#f0e2c8;">Every write now has to update the copy, or the copy <strong style="color:#ffca28;">drifts</strong>. In the demo a cached <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">orders.total</code> said 400 while the lines summed to 420. You trade read speed for write complexity and a risk of inconsistency.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. How to keep it right:</strong> <span style="color:#f0e2c8;">Update the copy in the <strong style="color:#ffca28;">same transaction</strong>, or with a <strong style="color:#ffca28;">trigger</strong> so no code path can forget it, or accept bounded staleness with a <strong style="color:#ffca28;">materialized view</strong> refreshed on a schedule (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">REFRESH MATERIALIZED VIEW CONCURRENTLY</code> needs a unique index). Add a reconciliation query that alerts on drift.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Before you do it:</strong> <span style="color:#f0e2c8;">Try indexes, a covering index or a rewritten query first, and confirm with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXPLAIN ANALYZE</code>. Denormalize the one hot path, document which column is a copy, and name its source of truth.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is denormalization the same as not normalizing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. An unnormalized schema has redundancy by accident and no rule for which copy is right. A denormalized one starts from a normalized model and adds specific copies with a known source of truth and a sync mechanism.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Trigger or application code for keeping a counter in sync?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A trigger runs for every write path, including ad-hoc SQL and other services, so it cannot be forgotten, but it adds hidden work to each write and can become a hot row under concurrency. Application code is visible and testable but every writer must remember it. Either way, keep a drift check.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the problem with a hot counter like <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">customers.order_count</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every insert updates the same row, so concurrent writers queue on that row lock. For very hot counters, insert delta rows and sum them periodically, or shard the counter into several rows and add them up on read.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Materialized view or summary table maintained by triggers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A materialized view is simple and always fully consistent after a refresh, but stale between refreshes and a full refresh recomputes everything. A trigger-maintained table is always current but makes every write more expensive and is harder to get right with concurrency.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is copying the shipping address onto an order denormalization?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It looks like it, but it is usually a <strong style="color:#ffca28;">snapshot</strong>: the order must keep the address it shipped to even after the customer moves. That copy must *not* be kept in sync. Ask whether a copy is a cache of current data or a historical fact before syncing it.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Denormalization | Deliberately adding redundant or precomputed data to speed up reads |
| Source of truth | The one authoritative place a fact is stored |
| Drift | A copy disagrees with its source of truth |
| Reconciliation query | Recomputes a derived value and lists rows where the copy is wrong |
| Atomic update of a copy | Source and copy changed in the same transaction |
| Trigger-maintained column | A trigger recomputes the copy on every change to the source |
| Materialized view | A stored query result recomputed on \`REFRESH\` |
| Staleness | How far behind the source a copy is allowed to be |
| Snapshot column | A point-in-time copy that records history and must not be synced |

**Conclusion:** Denormalization is a trade: you store a fact twice so that a hot read becomes a single-column lookup, and in return every write must keep the copy honest. Do it after normalizing and measuring, give every copy a source of truth and a sync mechanism (same transaction, trigger, or materialized view with known staleness), tell caches apart from snapshots, and run a reconciliation query so drift like the 400-versus-420 order here is caught by you rather than by a customer.`,
    examples: [
      {
        label: `Reconciliation query: find orders whose cached total no longer matches the line items`,
        code: `SELECT o.order_id, o.total AS stored_total, SUM(oi.qty * oi.unit_price) AS real_total
FROM orders o JOIN order_items oi ON oi.order_id = o.order_id
GROUP BY o.order_id, o.total
HAVING o.total <> SUM(oi.qty * oi.unit_price)
ORDER BY o.order_id;`,
      },
      {
        label: `Keep a cached counter correct by updating it in the same transaction as the insert`,
        code: `BEGIN;
INSERT INTO orders VALUES (106, 3, 'Austin', '2025-03-20', 80);
INSERT INTO order_items VALUES (106, 'KB-01', 2, 40);
UPDATE customers SET order_count = order_count + 1 WHERE customer_id = 3;
COMMIT;
SELECT c.name, c.order_count AS cached_count,
       (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.customer_id) AS real_count
FROM customers c ORDER BY c.customer_id;`,
      },
      {
        label: `PostgreSQL: a trigger recomputes orders.total on every insert, update or delete of a line`,
        code: `CREATE FUNCTION sync_order_total() RETURNS trigger AS $$
BEGIN
  UPDATE orders o
  SET total = (SELECT COALESCE(SUM(qty * unit_price), 0)
               FROM order_items i WHERE i.order_id = o.order_id)
  WHERE o.order_id = COALESCE(NEW.order_id, OLD.order_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_items_sync
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW EXECUTE FUNCTION sync_order_total();

INSERT INTO order_items VALUES (105, 'MS-02', 1, 18);
UPDATE order_items SET qty = 4 WHERE order_id = 104 AND sku = 'MS-02';
DELETE FROM order_items WHERE order_id = 101 AND sku = 'MS-02';

SELECT order_id, total FROM orders ORDER BY order_id;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: a materialized view is a denormalized summary that is stale until refreshed`,
        code: `CREATE MATERIALIZED VIEW city_revenue AS
SELECT c.city, COUNT(DISTINCT o.order_id) AS orders, SUM(oi.qty * oi.unit_price) AS revenue
FROM customers c
JOIN orders o ON o.customer_id = c.customer_id
JOIN order_items oi ON oi.order_id = o.order_id
GROUP BY c.city;

INSERT INTO orders VALUES (106, 3, 'Austin', '2025-03-20', 80);
INSERT INTO order_items VALUES (106, 'KB-01', 2, 40);
CREATE TEMP TABLE before_refresh AS SELECT * FROM city_revenue;

REFRESH MATERIALIZED VIEW city_revenue;

SELECT 'before refresh' AS snapshot, city, revenue FROM before_refresh WHERE city = 'Austin'
UNION ALL
SELECT 'after refresh', city, revenue FROM city_revenue WHERE city = 'Austin'
ORDER BY snapshot DESC;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `What are foreign key cascade options?`,
    difficulty: "medium",
    seoDescription: `Foreign key ON DELETE and ON UPDATE options: CASCADE, SET NULL, SET DEFAULT, RESTRICT and NO ACTION, run on SQLite and PostgreSQL, with engine differences.`,
    description: `**Question presented to candidate:**
"When you declare a foreign key you can add ON DELETE and ON UPDATE actions. What options exist, what does each one do to the child rows, and how do you pick one for a given relationship?"

**What a strong answer should cover:**
- The five referential actions: \`NO ACTION\` (the default), \`RESTRICT\`, \`CASCADE\`, \`SET NULL\`, \`SET DEFAULT\`, each set separately for \`ON DELETE\` and \`ON UPDATE\`
- \`NO ACTION\` vs \`RESTRICT\`: both refuse to orphan a child, but \`NO ACTION\` is checked at the end of the statement (or at commit when the constraint is deferred), while \`RESTRICT\` is checked immediately and cannot be deferred
- Choosing by ownership: owned children (addresses, line items) cascade; records with their own value (orders, invoices) restrict; history that outlives the parent uses \`SET NULL\` or \`SET DEFAULT\` to a placeholder
- Engine differences: SQLite enforces foreign keys only after \`PRAGMA foreign_keys = ON\`; MySQL InnoDB treats \`NO ACTION\` as \`RESTRICT\` and rejects \`SET DEFAULT\`; SQL Server has no \`RESTRICT\` keyword
- Operational points: PostgreSQL does not index the referencing column automatically, so cascades and checks on large child tables need an index; cascades can delete far more than expected

**Code / implementation expected:** Yes — a schema with different actions per child table and a delete or update that shows each one.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
-- Orders are financial records: block deleting a customer who has any
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  total NUMERIC NOT NULL
);
-- Addresses belong to the customer: delete them with it, follow id changes
CREATE TABLE addresses (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE ON UPDATE CASCADE,
  city TEXT NOT NULL
);
-- Support tickets outlive the customer: keep them, unlink the owner
CREATE TABLE tickets (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  subject TEXT NOT NULL
);
-- Reviews move to a placeholder account (id 0) when the author is deleted
CREATE TABLE reviews (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL DEFAULT 0 REFERENCES customers(id) ON DELETE SET DEFAULT,
  stars INTEGER NOT NULL
);
INSERT INTO customers VALUES (0, 'deleted user'), (1, 'Asha'), (2, 'Ben'), (3, 'Chen'), (4, 'Dina');
INSERT INTO orders VALUES (101, 1, 70), (102, 2, 40);
INSERT INTO addresses VALUES (1, 1, 'Pune'), (2, 3, 'Austin'), (3, 3, 'Dallas'), (4, 4, 'Delhi');
INSERT INTO tickets VALUES (1, 3, 'Refund request'), (2, 2, 'Login issue');
INSERT INTO reviews VALUES (1, 3, 5), (2, 1, 4);
\`\`\``,
    answer: `**Target Audience:** Beginners who know what a foreign key is and want to know what happens when the parent row is deleted or changed, plus candidates who need the exact semantics of \`NO ACTION\` vs \`RESTRICT\`.
**Difficulty:** Medium
**Engines:** SQLite 3.45.0 (sql.js 1.10.2, the page engine) and PostgreSQL 16.15, both run for this page. MySQL and SQL Server facts are cited from their documentation.

> **How to read this doc:** Each idea is first explained in plain language, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and error message shown was produced by actually running it; the **Verified** section quotes each example output in full.

## 1. Why This Even Matters — A Story First

A gym closes a member's account. What should happen to everything that points at that member?

- Their locker assignment should simply go: a locker cannot belong to nobody.
- Their past invoices must stay, because the accountant needs them. In fact the gym should not be allowed to delete the member while unpaid invoices exist.
- Their reviews of the trainers should stay on the website, but be shown as "former member".
- The help-desk tickets they opened should stay too, just no longer linked to anyone.

Four kinds of child record, four different correct answers. A foreign key without an action gives only one answer (refuse the delete). **Foreign key cascade options**, more formally *referential actions*, let you write each of these business rules into the schema itself, so the database enforces them for every application and every ad-hoc script.

## 2. The Core Idea

📌 **Interview term: foreign key** — a column in a child table whose value must match a key in a parent table, so a child can never point at a parent that does not exist. (Background: [primary key vs foreign key](/interview-question/what-is-the-difference-between-a-primary-key-and-a-foreign-key).)

📌 **Interview term: referential action** — the rule, declared on the foreign key, that runs when a referenced parent row is deleted (\`ON DELETE\`) or its key is changed (\`ON UPDATE\`).

📌 **Interview term: orphan row** — a child row whose foreign key points at a parent that no longer exists. Every referential action is a different way of never producing one.

| Action | Child rows when the parent is deleted | Child rows when the parent key changes |
| :--- | :--- | :--- |
| \`NO ACTION\` (default) | Error if any exist, checked at end of statement or at commit if deferred | Error if any exist |
| \`RESTRICT\` | Error if any exist, checked immediately | Error if any exist |
| \`CASCADE\` | Deleted too | Foreign key updated to the new value |
| \`SET NULL\` | Kept, foreign key set to \`NULL\` | Kept, foreign key set to \`NULL\` |
| \`SET DEFAULT\` | Kept, foreign key set to its column default | Kept, foreign key set to its default |

The schema above uses a different action on each child table of \`customers\`, matching the gym story:

<svg class="iq-diagram" width="100%" viewBox="0 0 840 290" role="img" aria-label="Deleting customer Chen: addresses cascade, tickets are set to null, reviews move to the placeholder, orders would block the delete">
  <defs>
    <marker id="sql11q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="295" y="20" width="250" height="64" rx="10"/>
  <text class="d-text" x="420" y="48" text-anchor="middle">DELETE customer</text>
  <text class="d-sub" x="420" y="70" text-anchor="middle">parent row goes</text>
  <rect class="d-box" x="20" y="180" width="170" height="80" rx="10"/>
  <text class="d-text" x="105" y="212" text-anchor="middle">addresses</text>
  <text class="d-sub" x="105" y="238" text-anchor="middle">CASCADE: deleted</text>
  <rect class="d-box" x="230" y="180" width="170" height="80" rx="10"/>
  <text class="d-text" x="315" y="212" text-anchor="middle">tickets</text>
  <text class="d-sub" x="315" y="238" text-anchor="middle">SET NULL: kept</text>
  <rect class="d-box" x="440" y="180" width="170" height="80" rx="10"/>
  <text class="d-text" x="525" y="212" text-anchor="middle">reviews</text>
  <text class="d-sub" x="525" y="238" text-anchor="middle">SET DEFAULT: id 0</text>
  <rect class="d-box-muted" x="650" y="180" width="170" height="80" rx="10"/>
  <text class="d-text" x="735" y="212" text-anchor="middle">orders</text>
  <text class="d-sub" x="735" y="238" text-anchor="middle">RESTRICT: blocks</text>
  <path class="d-edge" d="M 330 88 L 115 174" marker-end="url(#sql11q3-arrow)"/>
  <path class="d-edge" d="M 390 88 L 320 174" marker-end="url(#sql11q3-arrow)"/>
  <path class="d-edge" d="M 450 88 L 520 174" marker-end="url(#sql11q3-arrow)"/>
  <path class="d-edge-dashed" d="M 510 88 L 725 174" marker-end="url(#sql11q3-arrow)"/>
</svg>

Deleting Chen (who has addresses, a ticket and a review but no orders) triggers the first three actions at once. The orders table would have blocked the delete if Chen had any orders.

## 3. CASCADE, SET NULL and SET DEFAULT in Action

The first example turns enforcement on (SQLite needs this, see section 5), deletes Chen and reads the three child tables:

~~~sql
PRAGMA foreign_keys = ON;
DELETE FROM customers WHERE id = 3;
SELECT id, customer_id, city FROM addresses ORDER BY id;
SELECT id, subject, customer_id FROM tickets ORDER BY id;
SELECT r.id, r.stars, r.customer_id, c.name AS author
FROM reviews r JOIN customers c ON c.id = r.customer_id
ORDER BY r.id;
~~~

~~~text
id | customer_id | city
1 | 1 | Pune
4 | 4 | Delhi

id | subject | customer_id
1 | Refund request | NULL
2 | Login issue | 2

id | stars | customer_id | author
1 | 5 | 0 | deleted user
2 | 4 | 1 | Asha
~~~

📌 **Interview term: ON DELETE CASCADE** — deleting the parent deletes its children. Both Austin and Dallas addresses are gone; only Asha and Dina remain.

📌 **Interview term: ON DELETE SET NULL** — the child survives and its foreign key becomes \`NULL\`. The refund ticket is still there, now unowned. The column must be nullable; \`tickets.customer_id\` deliberately has no \`NOT NULL\`.

📌 **Interview term: ON DELETE SET DEFAULT** — the child's foreign key is set to the column default. Here the default is 0, a placeholder customer named "deleted user", so the 5-star review keeps a valid author. The default must itself be an existing parent key, or the action fails with a foreign key error.

📌 **Interview term: ON UPDATE CASCADE** — changing the parent key rewrites the foreign key in every child. The second example renumbers Dina from 4 to 40:

~~~text
id | customer_id | name | city
1 | 1 | Asha | Pune
2 | 3 | Chen | Austin
3 | 3 | Chen | Dallas
4 | 40 | Dina | Delhi
~~~

Only \`addresses\` had \`ON UPDATE CASCADE\`. Try the same with Chen, who also has a ticket and a review whose foreign keys have no \`ON UPDATE\` clause (so the default \`NO ACTION\` applies), and the update is refused. SQLite:

~~~text
Error: FOREIGN KEY constraint failed
~~~

PostgreSQL (\`UPDATE customers SET id = 30 WHERE id = 3\`):

~~~text
ERROR:  update or delete on table "customers" violates foreign key constraint "tickets_customer_id_fkey" on table "tickets"
DETAIL:  Key (id)=(3) is still referenced from table "tickets".
~~~

PostgreSQL names the constraint and the key; SQLite only says a foreign key failed. That difference shows up in every error on this page.

## 4. RESTRICT vs NO ACTION: Same Result, Different Timing

Deleting Asha, who has order 101, with enforcement on. SQLite:

~~~sql
PRAGMA foreign_keys = ON;
DELETE FROM customers WHERE id = 1;
~~~

~~~text
Error: FOREIGN KEY constraint failed
~~~

PostgreSQL:

~~~text
ERROR:  update or delete on table "customers" violates foreign key constraint "orders_customer_id_fkey" on table "orders"
DETAIL:  Key (id)=(1) is still referenced from table "orders".
~~~

📌 **Interview term: ON DELETE RESTRICT** — refuse the delete or update immediately if any child references the row.

📌 **Interview term: NO ACTION** — the default when no action is written: also refuse, but the check runs at the end of the statement, and can be postponed to commit.

📌 **Interview term: deferrable constraint** — a constraint declared \`DEFERRABLE INITIALLY DEFERRED\` (or switched with \`SET CONSTRAINTS ... DEFERRED\`) is checked at \`COMMIT\` instead of after each statement. That lets one transaction pass through a temporarily invalid state, such as replacing a parent row.

The fourth example (PostgreSQL) replaces plan 1 inside one transaction, delete then re-insert, under each action, and forces the deferred checks with \`SET CONSTRAINTS ALL IMMEDIATE\` so the outcome can be caught and recorded:

~~~sql
CREATE TABLE plans_a (id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE plans_b (id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE subs_a (plan_id INTEGER REFERENCES plans_a(id)
  ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED);
CREATE TABLE subs_b (plan_id INTEGER REFERENCES plans_b(id)
  ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED);
INSERT INTO plans_a VALUES (1, 'basic');
INSERT INTO plans_b VALUES (1, 'basic');
INSERT INTO subs_a VALUES (1);
INSERT INTO subs_b VALUES (1);
CREATE TEMP TABLE outcome (fk_action TEXT, result TEXT);

-- Replace plan 1 inside one transaction: delete it, insert it again,
-- then force the deferred checks to run.
DO $$
BEGIN
  BEGIN
    DELETE FROM plans_a WHERE id = 1;
    INSERT INTO plans_a VALUES (1, 'basic v2');
    SET CONSTRAINTS ALL IMMEDIATE;
    INSERT INTO outcome VALUES ('NO ACTION', 'allowed');
  EXCEPTION WHEN foreign_key_violation THEN
    INSERT INTO outcome VALUES ('NO ACTION', 'rejected');
  END;
  BEGIN
    DELETE FROM plans_b WHERE id = 1;
    INSERT INTO plans_b VALUES (1, 'basic v2');
    SET CONSTRAINTS ALL IMMEDIATE;
    INSERT INTO outcome VALUES ('RESTRICT', 'allowed');
  EXCEPTION WHEN foreign_key_violation THEN
    INSERT INTO outcome VALUES ('RESTRICT', 'rejected');
  END;
END $$;

SELECT fk_action, result FROM outcome ORDER BY fk_action;
~~~

~~~text
fk_action | result
NO ACTION | allowed
RESTRICT | rejected
~~~

With deferred \`NO ACTION\`, by the time the check ran plan 1 existed again, so nothing was orphaned. \`RESTRICT\` checked the moment the row was deleted and refused, even though the constraint was declared deferrable. The same pair of transactions on SQLite 3.45 behaved identically: the \`NO ACTION\` version committed, the \`RESTRICT\` version stopped with \`FOREIGN KEY constraint failed\`.

In practice, when nothing is deferred, the two give the same error. Pick \`RESTRICT\` to say "never, not even temporarily", and the default \`NO ACTION\` when bulk operations or reorderings may need deferral.

## 5. Engine Differences You Should Know

**SQLite: foreign keys are off by default.** Foreign key support arrived in SQLite 3.6.19 disabled by default for backwards compatibility, and must be enabled on each connection with \`PRAGMA foreign_keys = ON\` ([SQLite 3.6.19 release log](https://sqlite.org/releaselog/3_6_19.html)). The third example runs without the pragma: it reads the setting, deletes Asha, and looks for orphans:

~~~text
foreign_keys
0

order_id | customer_id | customer_name
101 | 1 | NULL
~~~

The \`RESTRICT\` was declared, the delete went through anyway, and order 101 now points at nobody. The pattern in the last query, a \`LEFT JOIN\` to the parent with \`WHERE parent.id IS NULL\`, is the standard orphan check to run after loading data with enforcement off.

**MySQL (InnoDB).** The manual says \`NO ACTION\` "is equivalent to \`RESTRICT\`" because MySQL does not support deferred constraint checking, that an omitted action defaults to \`NO ACTION\`, and that InnoDB rejects table definitions containing \`ON DELETE SET DEFAULT\` or \`ON UPDATE SET DEFAULT\` ([MySQL 8.0 FOREIGN KEY Constraints](https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html)). MySQL has also long documented that cascaded foreign key actions do not activate triggers on the child table ([Bug #11472](https://bugs.mysql.com/bug.php?id=11472)); a MySQL worklog describes adding that for the 9.x server ([WL#17024](https://dev.mysql.com/worklog/task/?id=17024)), so check the version you run. In PostgreSQL 16 they do fire: a \`BEFORE DELETE\` row trigger on \`addresses\` logged one call for each of Chen's two addresses when the customer was deleted.

**SQL Server.** The documented actions are \`NO ACTION\` (the default), \`CASCADE\`, \`SET NULL\` and \`SET DEFAULT\`; there is no \`RESTRICT\` keyword ([ALTER TABLE table_constraint](https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-table-table-constraint-transact-sql)).

**PostgreSQL extras.** Since PostgreSQL 15, \`SET NULL\` and \`SET DEFAULT\` accept a column list, such as \`ON DELETE SET NULL (author_id)\`, so a multi-column key can keep its \`tenant_id\` while clearing only the author ([commit: allow specifying column list for foreign key ON DELETE SET actions](https://postgresql.org/message-id/E1muuB2-0004XM-QE%40gemulon.postgresql.org)). Not run here.

| | PostgreSQL 16 | SQLite 3.45 | MySQL 8 InnoDB | SQL Server |
| :--- | :--- | :--- | :--- | :--- |
| Enforced by default | Yes | No, needs \`PRAGMA foreign_keys = ON\` | Yes | Yes |
| \`RESTRICT\` | Yes | Yes | Yes (same as \`NO ACTION\`) | No keyword |
| \`SET DEFAULT\` | Yes | Yes | Rejected by InnoDB | Yes |
| Deferrable \`NO ACTION\` | Yes | Yes | No | No |

The SQLite and PostgreSQL columns were run; the others are from the cited documentation.

## 6. Choosing an Action

| Child | Good action | Reason |
| :--- | :--- | :--- |
| Parts owned by the parent (addresses, order lines, tags on a post) | \`ON DELETE CASCADE\` | They mean nothing without the parent |
| Records with their own legal or financial value (orders, invoices, payments) | \`RESTRICT\` / \`NO ACTION\`, plus soft delete of the parent | Deleting history must be a deliberate act |
| History that should outlive the parent (tickets, audit rows, reviews) | \`SET NULL\` or \`SET DEFAULT\` to a placeholder | Keep the record, drop the link |
| Natural keys that can change (country code, SKU) | \`ON UPDATE CASCADE\` | The new key flows to all children |
| Surrogate integer ids | No \`ON UPDATE\` action needed | The id should never change |

### Index the child column

📌 **Interview term: foreign key index** — an index on the child's referencing column. Every parent delete has to search the child table for matches, for \`RESTRICT\` and \`CASCADE\` alike. PostgreSQL creates an index for primary keys and unique constraints but not for the referencing side. After loading the schema above, PostgreSQL 16 had only the primary key indexes:

~~~text
tablename | indexname
addresses | addresses_pkey
orders | orders_pkey
reviews | reviews_pkey
tickets | tickets_pkey
~~~

So \`DELETE FROM customers\` checks \`addresses.customer_id\` and the other children with no index to use. On a big child table add one per foreign key, for example \`CREATE INDEX ON addresses (customer_id)\`.

## 7. Verified: Running the Code

Examples 1 to 3 ran the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above). Example 4, the PostgreSQL error messages and the index listing ran on PostgreSQL 16.15 in a scratch database with the same schema. The SQLite version of the deferred test was run separately with sql.js.

Example 1, delete with mixed actions:

~~~text
id | customer_id | city
1 | 1 | Pune
4 | 4 | Delhi

id | subject | customer_id
1 | Refund request | NULL
2 | Login issue | 2

id | stars | customer_id | author
1 | 5 | 0 | deleted user
2 | 4 | 1 | Asha
~~~

Example 2, ON UPDATE CASCADE:

~~~text
id | customer_id | name | city
1 | 1 | Asha | Pune
2 | 3 | Chen | Austin
3 | 3 | Chen | Dallas
4 | 40 | Dina | Delhi
~~~

Example 3, SQLite without the pragma:

~~~text
foreign_keys
0

order_id | customer_id | customer_name
101 | 1 | NULL
~~~

Example 4, deferred NO ACTION vs RESTRICT (PostgreSQL):

~~~text
fk_action | result
NO ACTION | allowed
RESTRICT | rejected
~~~

## Common Pitfalls

- **Forgetting \`PRAGMA foreign_keys = ON\` in SQLite.** Every constraint is silently ignored; the third example deleted a customer that had orders.
- **Cascading into financial or audit data.** One delete can chain through orders, payments and shipments. Restrict, and soft-delete the parent.
- **\`SET NULL\` on a \`NOT NULL\` column**, or \`SET DEFAULT\` with a default that is not a real parent row. Both make the action itself fail.
- **No index on the child column.** Each parent delete scans the child table; PostgreSQL does not add this index for you.
- **Assuming \`NO ACTION\` and \`RESTRICT\` are always identical.** They differ once constraints are deferred, and MySQL does not support deferral at all.
- **Using \`ON UPDATE CASCADE\` to paper over mutable keys.** Prefer an immutable surrogate key so the parent key never changes.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What they are:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Referential actions</strong> tell the database what to do with child rows when the parent row they reference is deleted or its key is updated. You set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ON DELETE</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ON UPDATE</code> separately, per foreign key.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The five options:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CASCADE</code> deletes or updates the children too. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SET NULL</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SET DEFAULT</code> keep the children and repoint them. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RESTRICT</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NO ACTION</code> refuse the change while children exist. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NO ACTION</code> is the default.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. NO ACTION vs RESTRICT:</strong> <span style="color:#f0e2c8;">Both block orphans, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NO ACTION</code> is checked at the end of the statement, or at commit if the constraint is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DEFERRABLE INITIALLY DEFERRED</code>, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RESTRICT</code> fires immediately. On PostgreSQL 16, deleting and re-inserting a parent in one transaction passed with deferred <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NO ACTION</code> and failed with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RESTRICT</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. How to choose:</strong> <span style="color:#f0e2c8;">Ask who owns the child. Owned parts (addresses, order lines) <strong style="color:#ffca28;">cascade</strong>. Records with their own legal or financial value (orders, invoices) <strong style="color:#ffca28;">restrict</strong>, and you soft-delete the parent instead. History that should outlive the parent (tickets, reviews) uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SET NULL</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SET DEFAULT</code> to a placeholder.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Engine gotchas:</strong> <span style="color:#f0e2c8;">SQLite ignores foreign keys unless <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PRAGMA foreign_keys = ON</code> is run on each connection. MySQL InnoDB treats <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NO ACTION</code> as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RESTRICT</code> and rejects <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SET DEFAULT</code>. PostgreSQL does not index the child column automatically, so add one before relying on cascades over big tables.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is CASCADE on orders a bad idea?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DELETE FROM customers</code> would silently remove financial history, and cascades chain: orders could cascade to order_items, payments and shipments. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RESTRICT</code> and archive or soft-delete the customer instead; reserve cascade for children that have no meaning without the parent.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with SET NULL if the column is NOT NULL?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The delete fails with a not-null violation, because the action tries to write NULL into a column that forbids it. PostgreSQL 16 said <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null value in column "pid" of relation "c1" violates not-null constraint</code>; SQLite said <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NOT NULL constraint failed: c1.pid</code>. SET NULL needs a nullable column; SET DEFAULT needs a default that itself references an existing parent, such as a placeholder row with id 0.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does a cascading delete get slow on a large table?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For each deleted parent the engine must find the matching children. Without an index on the child foreign key column, that is a sequential scan of the child table per parent. PostgreSQL creates an index for the primary key but not for the referencing column, so add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CREATE INDEX ON addresses (customer_id)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do you ever need ON UPDATE CASCADE?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Rarely with surrogate keys, since an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">id</code> should never change. It matters with natural keys that can change, such as a country code, SKU or username used as a key. Many teams avoid the question by referencing an immutable surrogate key.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do cascades fire triggers on the child table?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In PostgreSQL a cascaded delete or update is carried out by internal referential-integrity triggers, and ordinary row triggers on the child table fire for the rows changed. Checked on PostgreSQL 16: a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BEFORE DELETE</code> trigger on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">addresses</code> fired once per cascaded row. MySQL has long documented that cascades do <strong style="color:#ffca28;">not</strong> fire child triggers, with a newer worklog for 9.x, so check per engine and version before relying on audit triggers.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Foreign key | A child column whose value must exist as a key in the parent table |
| Referential action | The rule declared for \`ON DELETE\` / \`ON UPDATE\` of the parent |
| Orphan row | A child pointing at a parent that does not exist |
| ON DELETE CASCADE | Deleting the parent deletes the children |
| ON DELETE SET NULL | Children kept, foreign key set to \`NULL\` |
| ON DELETE SET DEFAULT | Children kept, foreign key set to the column default |
| ON UPDATE CASCADE | A changed parent key is copied into the children |
| ON DELETE RESTRICT | Refuse immediately while children exist |
| NO ACTION | The default: refuse, checked at statement end or at commit if deferred |
| Deferrable constraint | A constraint whose check can be postponed to \`COMMIT\` |
| Foreign key index | An index on the child referencing column, needed for fast checks and cascades |

**Conclusion:** A foreign key guarantees that children never point at a missing parent, and its referential actions decide how that guarantee is kept: delete the children (\`CASCADE\`), unlink them (\`SET NULL\`, \`SET DEFAULT\`), or refuse (\`RESTRICT\`, \`NO ACTION\`). Choose by ownership, cascade only for parts that mean nothing alone, protect financial history with restrict and soft deletes, remember that \`NO ACTION\` can be deferred while \`RESTRICT\` cannot, index every child column, and in SQLite turn enforcement on before trusting any of it.`,
    examples: [
      {
        label: `Delete a customer: CASCADE removes addresses, SET NULL keeps tickets, SET DEFAULT reassigns reviews`,
        code: `PRAGMA foreign_keys = ON;
DELETE FROM customers WHERE id = 3;
SELECT id, customer_id, city FROM addresses ORDER BY id;
SELECT id, subject, customer_id FROM tickets ORDER BY id;
SELECT r.id, r.stars, r.customer_id, c.name AS author
FROM reviews r JOIN customers c ON c.id = r.customer_id
ORDER BY r.id;`,
      },
      {
        label: `ON UPDATE CASCADE: changing the parent key rewrites the child foreign keys`,
        code: `PRAGMA foreign_keys = ON;
UPDATE customers SET id = 40 WHERE id = 4;
SELECT a.id, a.customer_id, c.name, a.city
FROM addresses a JOIN customers c ON c.id = a.customer_id
ORDER BY a.id;`,
      },
      {
        label: `SQLite trap: foreign keys are off by default, so a RESTRICT delete succeeds and leaves an orphan`,
        code: `PRAGMA foreign_keys;
DELETE FROM customers WHERE id = 1;
SELECT o.id AS order_id, o.customer_id, c.name AS customer_name
FROM orders o
LEFT JOIN customers c ON c.id = o.customer_id
WHERE c.id IS NULL;`,
      },
      {
        label: `PostgreSQL: NO ACTION can be deferred to the end of the transaction, RESTRICT cannot`,
        code: `CREATE TABLE plans_a (id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE plans_b (id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE subs_a (plan_id INTEGER REFERENCES plans_a(id)
  ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED);
CREATE TABLE subs_b (plan_id INTEGER REFERENCES plans_b(id)
  ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED);
INSERT INTO plans_a VALUES (1, 'basic');
INSERT INTO plans_b VALUES (1, 'basic');
INSERT INTO subs_a VALUES (1);
INSERT INTO subs_b VALUES (1);
CREATE TEMP TABLE outcome (fk_action TEXT, result TEXT);

-- Replace plan 1 inside one transaction: delete it, insert it again,
-- then force the deferred checks to run.
DO $$
BEGIN
  BEGIN
    DELETE FROM plans_a WHERE id = 1;
    INSERT INTO plans_a VALUES (1, 'basic v2');
    SET CONSTRAINTS ALL IMMEDIATE;
    INSERT INTO outcome VALUES ('NO ACTION', 'allowed');
  EXCEPTION WHEN foreign_key_violation THEN
    INSERT INTO outcome VALUES ('NO ACTION', 'rejected');
  END;
  BEGIN
    DELETE FROM plans_b WHERE id = 1;
    INSERT INTO plans_b VALUES (1, 'basic v2');
    SET CONSTRAINTS ALL IMMEDIATE;
    INSERT INTO outcome VALUES ('RESTRICT', 'allowed');
  EXCEPTION WHEN foreign_key_violation THEN
    INSERT INTO outcome VALUES ('RESTRICT', 'rejected');
  END;
END $$;

SELECT fk_action, result FROM outcome ORDER BY fk_action;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `JSONB vs normalized columns vs EAV — how do you model flexible attributes without killing query performance?`,
    difficulty: "hard",
    seoDescription: `Typed columns vs EAV vs JSONB for flexible attributes in PostgreSQL: storage, planner statistics, type safety, and the hybrid design most teams ship.`,
    description: `**Question presented to candidate:**
"We sell laptops, shirts and headphones, and every category has different attributes that product managers keep adding. How would you model those flexible attributes in PostgreSQL? Compare typed columns, an EAV table and JSONB, and tell me how each one performs when we filter on them."

**What a strong answer should cover:**
- The three models: typed columns (per category table or nullable columns), entity-attribute-value rows, and a \`jsonb\` document per row, plus the hybrid: real columns for core, hot and constrained fields, \`jsonb\` for the long tail
- EAV costs: one row per attribute (3x the rows and about 3.5x the storage in the demo), a pivot or self-join per filter, values stored as text so comparisons and constraints break
- JSONB costs: no per-key statistics (the planner guessed 100 rows where 4000 matched), no foreign keys or types per key unless you add CHECK constraints, and whole-document rewrites on update
- Fixes that keep JSONB fast: expression indexes (which also give the planner statistics), GIN for containment, generated columns to promote a hot key, CHECK constraints for required types
- A decision rule: promote any attribute you filter, sort, join or constrain on to a real column; keep display-only and rarely queried attributes in JSONB; avoid EAV except for truly user-defined fields

**Clarifying questions expected:**
- Which attributes are filtered or sorted on, and how often, versus only displayed?
- Who defines new attributes: engineers in a migration, or end users at runtime?
- Do attributes need types, required-ness or references to other tables?

**Code / implementation expected:** Yes — the same filter on EAV and JSONB, and a hybrid PostgreSQL table with a generated column, a CHECK constraint and evidence from the planner.

**Schema used by the examples:**

\`\`\`sql
-- Core columns every product has
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL
);
INSERT INTO products VALUES
  (1, 'Air 13', 'laptop', 999),
  (2, 'Pro 14', 'laptop', 1899),
  (3, 'Budget 15', 'laptop', 549),
  (4, 'Oxford shirt', 'shirt', 45),
  (5, 'Linen shirt', 'shirt', 60),
  (6, 'Studio buds', 'headphones', 129);

-- Option A: typed columns in a per-category table
CREATE TABLE laptop_specs (
  product_id INTEGER PRIMARY KEY REFERENCES products(id),
  ram_gb INTEGER NOT NULL,
  screen_in REAL NOT NULL,
  color TEXT NOT NULL
);
INSERT INTO laptop_specs VALUES (1, 8, 13.3, 'silver'), (2, 32, 14.2, 'grey'), (3, 16, 15.6, 'silver');

-- Option B: entity-attribute-value, one row per attribute, value as text
CREATE TABLE product_attrs (
  product_id INTEGER NOT NULL REFERENCES products(id),
  attr TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (product_id, attr)
);
INSERT INTO product_attrs VALUES
  (1, 'ram_gb', '8'), (1, 'screen_in', '13.3'), (1, 'color', 'silver'),
  (2, 'ram_gb', '32'), (2, 'screen_in', '14.2'), (2, 'color', 'grey'),
  (3, 'ram_gb', '16'), (3, 'screen_in', '15.6'), (3, 'color', 'silver'),
  (4, 'size', 'M'), (4, 'color', 'blue'),
  (5, 'size', 'L'), (5, 'color', 'white'),
  (6, 'wireless', 'true'), (6, 'color', 'black');

-- Option C: one JSON document per product (TEXT here, jsonb on PostgreSQL)
CREATE TABLE product_docs (
  product_id INTEGER PRIMARY KEY REFERENCES products(id),
  attrs TEXT NOT NULL
);
INSERT INTO product_docs VALUES
  (1, '{"ram_gb": 8, "screen_in": 13.3, "color": "silver"}'),
  (2, '{"ram_gb": 32, "screen_in": 14.2, "color": "grey"}'),
  (3, '{"ram_gb": 16, "screen_in": 15.6, "color": "silver"}'),
  (4, '{"size": "M", "color": "blue"}'),
  (5, '{"size": "L", "color": "white"}'),
  (6, '{"wireless": true, "color": "black"}');
\`\`\``,
    answer: `**Target Audience:** Developers designing a catalogue, settings or metadata store where attributes vary per row, and candidates facing a schema design question that tests trade-offs rather than syntax.
**Difficulty:** Hard
**Engines:** PostgreSQL 16.15 for everything \`jsonb\`, run in a scratch database for this page. The EAV examples ran on SQLite 3.45.0 (sql.js 1.10.2, the page engine) and the type trap was also run on PostgreSQL 16 with the same answer. MySQL facts are cited.

> **How to read this doc:** Each idea is first explained in plain language, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every number, plan estimate and error message shown was produced by actually running it; the **Verified** section quotes each example output in full.

## 1. Why This Even Matters — A Story First

Imagine a shop that keeps its product details on index cards. For laptops, the card has printed boxes: RAM, screen size, colour. Fast to read, impossible to fill in wrongly, but when the shop starts selling shirts, someone has to print a new kind of card.

A second shop uses blank cards and writes one fact per card: "product 1, RAM, 8". Any product, any attribute, no printing needed. To find "silver laptops with at least 16 GB" a clerk must collect every card for every product and reassemble them on the desk. And since everything is handwritten, one clerk wrote "8", another "8GB", and nobody can sort them.

A third shop staples a free-form note to each product: "RAM 8, screen 13.3, colour silver". One note per product, any fields, easy to read. But the shop manager has no idea how many notes say "silver" until someone reads them all.

These are **typed columns**, **EAV** and **JSONB**. Each is right somewhere. The interview question is whether you can say *where*, with evidence about how each one behaves when you filter on it.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which attributes are used in \`WHERE\`, \`ORDER BY\` or joins, and which are only displayed? | Queried attributes want columns or indexes; display-only ones can live in a document |
| Who adds new attributes: developers in a migration, or users at runtime? | Developer-defined attributes can become columns; user-defined ones need EAV or JSONB |
| Do attributes need types, required-ness, or references to other tables? | Columns give these for free; JSONB needs CHECK constraints; EAV gives almost none |
| How many distinct attributes and how sparse are they? | A few hundred mostly-empty columns is a smell; ten shared ones is fine |
| What is the read and write pattern on a single attribute? | Frequent single-key updates rewrite a whole JSONB document |

## 3. The Three Models

📌 **Interview term: typed columns** — each attribute is a real column with a data type, possibly in a per-category table such as \`laptop_specs\`. The database knows its type, can constrain it, index it and keep statistics on it.

<svg class="iq-diagram" width="100%" viewBox="0 0 820 150" role="img" aria-label="Typed columns store one laptop as one row with three typed columns">
  <rect class="d-box-accent" x="20" y="20" width="200" height="90" rx="10"/>
  <text class="d-text" x="120" y="70" text-anchor="middle">typed columns</text>
  <rect class="d-box" x="280" y="30" width="520" height="46" rx="8"/>
  <text class="d-text" x="300" y="59">1 | ram_gb 8 | screen_in 13.3 | color silver</text>
  <text class="d-sub" x="780" y="59" text-anchor="end">1 row</text>
</svg>

📌 **Interview term: EAV (entity-attribute-value)** — a generic table \`(entity_id, attribute, value)\` with one row per attribute per entity. Attributes become data instead of schema.

<svg class="iq-diagram" width="100%" viewBox="0 0 820 270" role="img" aria-label="EAV stores one laptop as three rows of attribute name and text value">
  <rect class="d-box-accent" x="20" y="20" width="200" height="210" rx="10"/>
  <text class="d-text" x="120" y="130" text-anchor="middle">EAV</text>
  <rect class="d-box" x="280" y="30" width="520" height="46" rx="8"/>
  <text class="d-text" x="300" y="59">1 | ram_gb | 8</text>
  <text class="d-sub" x="780" y="59" text-anchor="end">text</text>
  <rect class="d-box" x="280" y="90" width="520" height="46" rx="8"/>
  <text class="d-text" x="300" y="119">1 | screen_in | 13.3</text>
  <text class="d-sub" x="780" y="119" text-anchor="end">text</text>
  <rect class="d-box" x="280" y="150" width="520" height="46" rx="8"/>
  <text class="d-text" x="300" y="179">1 | color | silver</text>
  <text class="d-sub" x="780" y="179" text-anchor="end">text</text>
</svg>

📌 **Interview term: JSONB** — PostgreSQL's binary JSON type: one document per row, parsed once on write, with operators to reach inside and index support. It was added in PostgreSQL 9.4 (December 2014) ([I Programmer: PostgreSQL 9.4 released](https://www.i-programmer.info/news/84-database/8113-postgresql-94-released.html)).

<svg class="iq-diagram" width="100%" viewBox="0 0 820 150" role="img" aria-label="JSONB stores one laptop as one row holding a document">
  <rect class="d-box-accent" x="20" y="20" width="200" height="90" rx="10"/>
  <text class="d-text" x="120" y="70" text-anchor="middle">jsonb</text>
  <rect class="d-box" x="280" y="30" width="520" height="46" rx="8"/>
  <text class="d-text" x="300" y="59">1 | ram_gb 8, screen_in 13.3, color silver</text>
  <text class="d-sub" x="780" y="59" text-anchor="end">1 doc</text>
</svg>

The schema above stores the same six products all three ways. With typed columns, "silver laptops with at least 16 GB" is the query everyone can write:

~~~sql
SELECT p.name, s.ram_gb, s.color
FROM products p JOIN laptop_specs s ON s.product_id = p.id
WHERE s.ram_gb >= 16 AND s.color = 'silver';
~~~

~~~text
name | ram_gb | color
Budget 15 | 16 | silver
~~~

## 4. EAV: Flexible Schema, Painful Queries

The same question on EAV needs the attribute rows turned back into columns first. The first example does it with conditional aggregation (a [pivot](/interview-question/how-do-you-pivot-rows-into-columns)):

~~~sql
-- Same question on EAV: pivot the attribute rows back into columns
SELECT p.name,
       MAX(CASE WHEN a.attr = 'ram_gb' THEN a.value END) AS ram_gb,
       MAX(CASE WHEN a.attr = 'color' THEN a.value END) AS color
FROM products p
JOIN product_attrs a ON a.product_id = p.id
GROUP BY p.id, p.name
HAVING CAST(MAX(CASE WHEN a.attr = 'ram_gb' THEN a.value END) AS INTEGER) >= 16
   AND MAX(CASE WHEN a.attr = 'color' THEN a.value END) = 'silver'
ORDER BY p.id;
~~~

~~~text
name | ram_gb | color
Budget 15 | 16 | silver
~~~

Correct, but look at what it cost: a join to every attribute row of every product, a \`GROUP BY\`, a \`HAVING\` that repeats each \`CASE\`, and a \`CAST\`, because \`value\` is text. Each extra filter adds another \`CASE\`. The self-join form (\`JOIN product_attrs ram ON ... AND ram.attr = 'ram_gb' JOIN product_attrs color ON ...\`) adds one join per attribute instead.

Forget the cast and the answer is silently wrong. The second example compares the same values as text and as numbers:

~~~text
name | ram_gb | text_compare | number_compare
Air 13 | 8 | 1 | 0
Pro 14 | 32 | 1 | 1
Budget 15 | 16 | 1 | 1
~~~

📌 **Interview term: type erasure** (in EAV) — storing every value in one text column loses its type, so comparisons become alphabetical: \`'8' >= '16'\` is true because the character 8 sorts after 1. PostgreSQL 16 returned the same \`t, t, t\` versus \`f, t, t\` for this query. There is also no way to say "RAM is required for laptops" or "colour must be one of these": a \`CHECK\` on \`value\` cannot see which attribute the row is for without listing every case.

And it multiplies rows. 10000 laptops with three attributes each, stored three ways in PostgreSQL 16, after \`VACUUM ANALYZE\`, sizes including the primary key indexes:

~~~text
model | table_rows | size_with_indexes
typed columns | 10000 | 792 kB
EAV | 30000 | 2736 kB
jsonb | 10000 | 1352 kB
~~~

EAV used 3x the rows and about 3.5x the space of typed columns, because each row repeats the entity id, the attribute name and a row header of its own. The \`jsonb\` version is in between: one row, but every document repeats its key names.

## 5. JSONB: One Row, but the Planner Is Blind

On SQLite (3.38+ has \`->>\`, see [SQLite 3.38.0 release log](https://www.sqlite.org/releaselog/3_38_0.html)) the JSON version of the same query is short, and JSON numbers stay numbers, so \`>= 16\` works without a cast:

~~~sql
SELECT p.name, d.attrs ->> '$.ram_gb' AS ram_gb, d.attrs ->> '$.color' AS color
FROM products p JOIN product_docs d ON d.product_id = p.id
WHERE d.attrs ->> '$.ram_gb' >= 16 AND d.attrs ->> '$.color' = 'silver'
ORDER BY p.id;
~~~

~~~text
name | ram_gb | color
Budget 15 | 16 | silver
~~~

On PostgreSQL the operators are the same idea: \`attrs ->> 'color'\` returns text, \`attrs -> 'ram_gb'\` returns \`jsonb\`, and \`attrs @> '{"color": "silver"}'\` tests containment. The full operator and index tour is on the sibling page [JSONB querying and GIN indexing](/interview-question/jsonb-querying-and-gin-indexing-how-do-you-query-and-index-schemaless-data-effic); this page is about what the model costs.

The biggest hidden cost is **statistics**. \`ANALYZE\` measures each column: how many distinct values, which ones are common. It does not look inside a \`jsonb\` column at individual keys. The fourth example puts 20000 rows in a table, with the colour stored both as a real column and inside \`attrs\`, and asks the planner how many rows it expects for each predicate (read from \`EXPLAIN (FORMAT JSON)\`), next to the real count:

~~~text
predicate | estimated | actual
color = silver (real column) | 4000 | 4000
attrs ->> color = silver | 100 | 4000
attrs ->> color = silver, after expression index | 4000 | 4000
~~~

📌 **Interview term: selectivity estimate** — the planner's guess of how many rows a condition keeps. For the real column it knew 1 in 5 rows is silver and guessed exactly 4000. For \`attrs ->> 'color'\` it had nothing and used a default selectivity of 0.5%, 100 rows: off by 40x. A plan built on "100 rows" may pick a nested loop join that would be fine for 100 rows and is slow for 4000.

📌 **Interview term: expression index** — an index on the result of an expression, here \`CREATE INDEX ON items ((attrs ->> 'color'))\`. Besides serving lookups, it makes \`ANALYZE\` collect statistics on that expression; after one, the estimate was 4000. Extended statistics on an expression are the index-free alternative: on PostgreSQL 16, \`CREATE STATISTICS items_color_stats ON ((attrs ->> 'color')) FROM items\` followed by \`ANALYZE\` also moved the estimate to \`rows=4000\`, with no index to maintain.

Other JSONB trade-offs:

- **No types or required keys by default.** Anything that parses as JSON is accepted. A \`CHECK\` constraint brings rules back (next section).
- **No foreign keys into a document.** A \`"brand_id"\` inside JSON cannot reference \`brands(id)\`.
- **Updates rewrite the document.** Changing one key with \`jsonb_set\` writes a new row version with the whole value.
- **Key names repeat in every row**, which is why it is larger than typed columns in the size table.

## 6. The Hybrid: What Most Teams Actually Ship

📌 **Interview term: hybrid model** — core attributes every row has, and any attribute you filter, sort, join or constrain on, are real columns; the variable long tail goes into one \`jsonb\` column.

The third example builds that table from the schema data on PostgreSQL 16: \`name\`, \`category\` and \`price\` as columns, \`attrs jsonb\` for the rest, a **generated column** that promotes \`ram_gb\` to a typed integer, and a \`CHECK\` that laptops must have a numeric \`ram_gb\`:

~~~sql
CREATE TABLE catalog (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL,
  attrs JSONB NOT NULL DEFAULT '{}',
  ram_gb INTEGER GENERATED ALWAYS AS ((attrs ->> 'ram_gb')::INTEGER) STORED,
  CHECK (category <> 'laptop' OR jsonb_typeof(attrs -> 'ram_gb') = 'number')
);
INSERT INTO catalog (id, name, category, price, attrs)
SELECT p.id, p.name, p.category, p.price, d.attrs::JSONB
FROM products p JOIN product_docs d ON d.product_id = p.id;

SELECT name, category, ram_gb, attrs ->> 'color' AS color
FROM catalog
WHERE ram_gb >= 16 OR attrs @> '{"wireless": true}'
ORDER BY id;
~~~

~~~text
name | category | ram_gb | color
Pro 14 | laptop | 32 | grey
Budget 15 | laptop | 16 | silver
Studio buds | headphones | NULL | black
~~~

📌 **Interview term: generated column** — a column computed from other columns in the same row, here \`GENERATED ALWAYS AS ((attrs ->> 'ram_gb')::INTEGER) STORED\`. It is typed, can be indexed with a plain B-tree, and the planner keeps normal statistics on it. Stored generated columns arrived in PostgreSQL 12 ([EDB: Generated columns in PostgreSQL 12](https://www.enterprisedb.com/blog/generated-columns-postgresql-12)). Products without the key simply get \`NULL\`, as the headphones show.

The \`CHECK\` is real enforcement. Inserting a laptop whose RAM is the string \`"16GB"\`:

~~~sql
CREATE TABLE catalog (id INTEGER PRIMARY KEY, category TEXT, attrs JSONB, CHECK (category <> 'laptop' OR jsonb_typeof(attrs -> 'ram_gb') = 'number'));
INSERT INTO catalog VALUES (7, 'laptop', '{"ram_gb": "16GB"}');
~~~

~~~text
ERROR:  new row for relation "catalog" violates check constraint "catalog_check"
DETAIL:  Failing row contains (7, laptop, {"ram_gb": "16GB"}).
~~~

The query also mixed both worlds: \`ram_gb >= 16\` uses the typed column, \`attrs @> '{"wireless": true}'\` searches the document, and a GIN index on \`attrs\` would serve the second part on a large table (shown on the [GIN page](/interview-question/jsonb-querying-and-gin-indexing-how-do-you-query-and-index-schemaless-data-effic)).

## 7. Side by Side

| | Typed columns | EAV | JSONB | Hybrid |
| :--- | :--- | :--- | :--- | :--- |
| Add an attribute | Migration (\`ALTER TABLE ADD COLUMN\`) | Insert rows | Write the key | Key now, column when it becomes hot |
| Types and NOT NULL | Native | Lost (text) | Via \`CHECK\` | Native for columns |
| Foreign keys | Yes | No (per attribute) | No | Yes for columns |
| Filter on two attributes | Simple \`WHERE\` | Pivot or one self-join per attribute | Simple \`WHERE\` with operators | Simple \`WHERE\` |
| Planner statistics | Yes | On \`value\` as a whole only | None per key without an expression index | Yes for columns |
| Index options | B-tree per column | B-tree on \`(attr, value)\` | GIN, expression B-tree | Both |
| Storage, 10000 laptops x 3 attributes | 792 kB | 2736 kB | 1352 kB | Close to columns plus a small doc |
| Best for | Stable, queried fields | Runtime user-defined fields with metadata | Sparse, varied, mostly displayed | Most product catalogues |

On MySQL, JSON columns are indexed through generated columns or functional indexes, and MySQL 8.0.17 added multi-valued indexes for JSON arrays used by \`MEMBER OF()\`, \`JSON_CONTAINS()\` and \`JSON_OVERLAPS()\` ([MySQL 8.0.17 release blog](https://dev.mysql.com/blog-archive/the-mysql-8-0-17-maintenance-release-is-generally-available/)). Not run here.

## 8. Verified: Running the Code

Examples 1 and 2 ran the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above). Examples 3 and 4, the storage comparison and the CHECK violation ran on PostgreSQL 16.15 in scratch databases seeded with the same schema. The typed-columns and SQLite JSON queries in the text ran on sql.js. The planner may estimate differently on other data or versions; the point is the gap before the expression index.

Example 1, EAV pivot:

~~~text
name | ram_gb | color
Budget 15 | 16 | silver
~~~

Example 2, EAV type trap:

~~~text
name | ram_gb | text_compare | number_compare
Air 13 | 8 | 1 | 0
Pro 14 | 32 | 1 | 1
Budget 15 | 16 | 1 | 1
~~~

Example 3, hybrid table (PostgreSQL):

~~~text
name | category | ram_gb | color
Pro 14 | laptop | 32 | grey
Budget 15 | laptop | 16 | silver
Studio buds | headphones | NULL | black
~~~

Example 4, estimates with and without an expression index (PostgreSQL):

~~~text
predicate | estimated | actual
color = silver (real column) | 4000 | 4000
attrs ->> color = silver | 100 | 4000
attrs ->> color = silver, after expression index | 4000 | 4000
~~~

## Common Pitfalls

- **Choosing EAV for developer-defined attributes.** If engineers add them in code reviews, they can add columns in migrations; EAV only moves the schema into data where nothing checks it.
- **Comparing EAV values as text.** \`'8' >= '16'\` is true; every numeric filter needs a cast, and a bad value (\`'8GB'\`) makes the cast fail or mislead.
- **Putting hot filter keys only inside JSONB.** The planner guesses 0.5% for them; add an expression index or promote them to a (generated) column.
- **No constraints on the document.** Without \`CHECK (jsonb_typeof(...))\` a typo like \`"ram": "16GB"\` is stored forever.
- **Huge documents with frequently changed keys.** Every change rewrites the document; keep counters and statuses in columns.
- **Hundreds of sparse nullable columns** as the "typed" answer. Once most columns are empty for most rows, a per-category table or the hybrid is cleaner.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Three models:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Typed columns</strong> give one row with real types, constraints and statistics. <strong style="color:#ffca28;">EAV</strong> stores one row per attribute as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(entity, attribute, value)</code> text. <strong style="color:#ffca28;">JSONB</strong> stores one binary document per row. Most real systems use a <strong style="color:#ffca28;">hybrid</strong>: core and hot fields as columns, the long tail in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">jsonb</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. EAV costs:</strong> <span style="color:#f0e2c8;">Every filter becomes a pivot or a self-join per attribute, rows multiply (30000 rows and 2736 kB for 10000 laptops versus 792 kB as columns in the demo), and values are text, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'8' &gt;= '16'</code> is true. No types, no required attributes, no foreign keys per attribute.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. JSONB costs:</strong> <span style="color:#f0e2c8;">No per-key statistics: PostgreSQL estimated 100 rows for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">attrs -&gt;&gt; 'color' = 'silver'</code> when 4000 matched, which leads to bad join plans. No types or required keys unless you add CHECK constraints, and an update rewrites the whole document.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Making JSONB fast:</strong> <span style="color:#f0e2c8;">An <strong style="color:#ffca28;">expression index</strong> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(attrs -&gt;&gt; 'color')</code> gives both an index and statistics (the estimate became 4000). A <strong style="color:#ffca28;">GIN</strong> index serves <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@&gt;</code> containment across any key. A <strong style="color:#ffca28;">generated column</strong> promotes a hot key to a typed column, and a <strong style="color:#ffca28;">CHECK</strong> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">jsonb_typeof</code> enforces types.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Decision rule:</strong> <span style="color:#f0e2c8;">If you filter, sort, join, aggregate or constrain on an attribute, make it a column. If it is only displayed or rarely searched, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">jsonb</code> is fine. Reserve EAV for fields defined by end users at runtime, and even then consider <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">jsonb</code> first.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is EAV still the right answer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When end users define attributes at runtime and you need per-attribute metadata, permissions or history rows, as in some CMS, survey and medical systems. Even there, a typed EAV variant (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value_int</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value_text</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value_date</code>) or a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">jsonb</code> column with an attribute registry is usually easier to query.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">JSON or JSONB in PostgreSQL?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">json</code> stores the text as given and re-parses it on every access; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">jsonb</code> stores a parsed binary form, keeps only the last of duplicate keys (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'{"a": 1, "a": 2}'::jsonb</code> gave <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{"a": 2}</code> on PostgreSQL 16), drops insignificant whitespace, and supports GIN indexing and containment. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">jsonb</code> unless you must preserve the exact original text or key order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is a bad row estimate a performance problem if the index is used?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The planner chooses join methods and orders from estimates. Expecting 100 rows it may choose a nested loop that runs 4000 times instead of a hash join. An expression index or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CREATE STATISTICS</code> on the expression gives ANALYZE something to measure.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you migrate a JSONB key to a real column later?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add a generated column (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GENERATED ALWAYS AS ((attrs -&gt;&gt; 'ram_gb')::int) STORED</code>) or a normal column backfilled in batches, index it, switch reads, then optionally remove the key from the document. Generated columns arrived in PostgreSQL 12.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about updates to one key in a big document?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">jsonb_set</code> returns a new document, so PostgreSQL writes a new row version with the whole value; large documents are also TOASTed, which makes small edits expensive. Keep frequently updated counters and statuses in real columns.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Typed columns | Each attribute is a real column with a type, constraints and statistics |
| EAV | Entity-attribute-value: one \`(entity, attribute, value)\` row per attribute |
| Type erasure | EAV values stored as text lose their type, so comparisons go alphabetical |
| JSONB | PostgreSQL binary JSON type with operators and GIN indexing |
| Selectivity estimate | The planner guess of how many rows a condition keeps |
| Expression index | An index on an expression; also gives ANALYZE statistics on it |
| Hybrid model | Hot and core attributes as columns, the long tail in a JSONB column |
| Generated column | A column computed from others in the row, typed and indexable |

**Conclusion:** Flexible attributes are a trade between schema rigidity and query power. Typed columns give types, constraints and statistics but need migrations; EAV needs no migrations but turns every filter into a pivot, erases types and triples the rows; JSONB keeps one row per entity but hides its keys from the planner until you add expression indexes and checks. The answer that holds up in production is the hybrid: real columns for anything you filter, sort, join or constrain on, JSONB for the long tail, generated columns to promote a key when it gets hot, and EAV only for attributes your users invent at runtime.`,
    examples: [
      {
        label: `EAV: pivot attribute rows back into columns to filter on two attributes`,
        code: `-- Same question on EAV: pivot the attribute rows back into columns
SELECT p.name,
       MAX(CASE WHEN a.attr = 'ram_gb' THEN a.value END) AS ram_gb,
       MAX(CASE WHEN a.attr = 'color' THEN a.value END) AS color
FROM products p
JOIN product_attrs a ON a.product_id = p.id
GROUP BY p.id, p.name
HAVING CAST(MAX(CASE WHEN a.attr = 'ram_gb' THEN a.value END) AS INTEGER) >= 16
   AND MAX(CASE WHEN a.attr = 'color' THEN a.value END) = 'silver'
ORDER BY p.id;`,
      },
      {
        label: `The EAV type trap: values are TEXT, so 8 compares as greater than 16`,
        code: `-- The EAV type trap: value is TEXT, so comparisons are alphabetical
SELECT p.name, a.value AS ram_gb,
       a.value >= '16' AS text_compare,
       CAST(a.value AS INTEGER) >= 16 AS number_compare
FROM products p
JOIN product_attrs a ON a.product_id = p.id AND a.attr = 'ram_gb'
ORDER BY p.id;`,
      },
      {
        label: `PostgreSQL hybrid: core columns, a jsonb tail, a generated column for a hot key and a CHECK on a required key`,
        code: `CREATE TABLE catalog (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL,
  attrs JSONB NOT NULL DEFAULT '{}',
  ram_gb INTEGER GENERATED ALWAYS AS ((attrs ->> 'ram_gb')::INTEGER) STORED,
  CHECK (category <> 'laptop' OR jsonb_typeof(attrs -> 'ram_gb') = 'number')
);
INSERT INTO catalog (id, name, category, price, attrs)
SELECT p.id, p.name, p.category, p.price, d.attrs::JSONB
FROM products p JOIN product_docs d ON d.product_id = p.id;

SELECT name, category, ram_gb, attrs ->> 'color' AS color
FROM catalog
WHERE ram_gb >= 16 OR attrs @> '{"wireless": true}'
ORDER BY id;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: the planner has no statistics for a jsonb key until an expression index exists`,
        code: `CREATE TABLE items (
  id INTEGER PRIMARY KEY,
  color TEXT NOT NULL,
  attrs JSONB NOT NULL
);
INSERT INTO items
SELECT g,
       (ARRAY['silver','grey','black','blue','white'])[g % 5 + 1],
       jsonb_build_object('color', (ARRAY['silver','grey','black','blue','white'])[g % 5 + 1],
                          'ram_gb', (ARRAY[8, 16, 32])[g % 3 + 1])
FROM generate_series(1, 20000) AS g;
ANALYZE items;

CREATE FUNCTION estimate(q TEXT) RETURNS INTEGER AS $$
DECLARE plan JSON;
BEGIN
  EXECUTE 'EXPLAIN (FORMAT JSON) ' || q INTO plan;
  RETURN (plan -> 0 -> 'Plan' ->> 'Plan Rows')::INTEGER;
END $$ LANGUAGE plpgsql;

CREATE TEMP TABLE result (step INTEGER, predicate TEXT, estimated INTEGER, actual INTEGER);
INSERT INTO result VALUES
  (1, 'color = silver (real column)',
      estimate('SELECT * FROM items WHERE color = ''silver'''),
      (SELECT COUNT(*) FROM items WHERE color = 'silver')),
  (2, 'attrs ->> color = silver',
      estimate('SELECT * FROM items WHERE attrs ->> ''color'' = ''silver'''),
      (SELECT COUNT(*) FROM items WHERE attrs ->> 'color' = 'silver'));

-- An expression index makes ANALYZE collect statistics on that expression
CREATE INDEX items_color_expr ON items ((attrs ->> 'color'));
ANALYZE items;
INSERT INTO result VALUES
  (3, 'attrs ->> color = silver, after expression index',
      estimate('SELECT * FROM items WHERE attrs ->> ''color'' = ''silver'''),
      (SELECT COUNT(*) FROM items WHERE attrs ->> 'color' = 'silver'));

SELECT predicate, estimated, actual FROM result ORDER BY step;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `JSONB querying and GIN indexing — how do you query and index schemaless data efficiently?`,
    difficulty: "medium",
    seoDescription: `Query PostgreSQL JSONB with ->, ->>, @>, ? and jsonpath, index it with GIN (jsonb_ops vs jsonb_path_ops), and know when you need an expression index.`,
    description: `**Question presented to candidate:**
"You have an events table with a JSONB payload column. Show me how you would pull fields out of it, filter on it, and index it so those filters stay fast. Which queries can a GIN index help with, and which ones can it not?"

**What a strong answer should cover:**
- The extraction operators: \`->\` returns \`jsonb\`, \`->>\` returns \`text\`, \`#>\` / \`#>>\` follow a path; casting extracted text before comparing numbers
- The search operators: containment \`@>\`, key existence \`?\`, \`?|\`, \`?&\`, and SQL/JSON path \`@?\` / \`@@\` (PostgreSQL 12+)
- GIN is an inverted index from keys and values to rows; it serves \`@>\`, \`?\` and jsonpath operators, but not \`->> 'k' = 'v'\`, ranges or sorting, which need a B-tree expression index
- The two operator classes: default \`jsonb_ops\` (supports \`?\`, \`?|\`, \`?&\`, \`@>\`, \`@?\`, \`@@\`) and \`jsonb_path_ops\` (only \`@>\`, \`@?\`, \`@@\`, smaller and more selective)
- How to prove it: \`EXPLAIN\` showing a Bitmap Index Scan, and the pitfalls: JSON \`null\` vs missing key, text comparison of numbers, GIN write cost

**Code / implementation expected:** Yes — extraction queries, a containment filter, a GIN index with an \`EXPLAIN\` plan, and an expression index for an equality filter.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  payload TEXT NOT NULL  -- JSON text here, cast to jsonb on PostgreSQL
);
INSERT INTO events VALUES
  (1, 10, '{"type": "click", "page": "/home", "tags": ["promo", "mobile"], "device": {"os": "ios", "version": 17}}'),
  (2, 10, '{"type": "purchase", "amount": 120, "currency": "EUR", "tags": ["mobile"]}'),
  (3, 11, '{"type": "click", "page": "/pricing", "device": {"os": "android", "version": 14}}'),
  (4, 12, '{"type": "purchase", "amount": 9, "currency": "USD", "tags": ["promo"]}'),
  (5, 12, '{"type": "signup", "referrer": "newsletter"}'),
  (6, 13, '{"type": "purchase", "amount": 45, "currency": "EUR", "coupon": null}');
\`\`\``,
    answer: `**Target Audience:** Developers who store JSON in PostgreSQL and want to query it correctly and fast, and candidates who need to explain GIN, operator classes and when an index does not apply.
**Difficulty:** Medium
**Engines:** PostgreSQL 16.15 for all \`jsonb\`, GIN and plan output, run in scratch databases for this page. The runnable JSON examples use SQLite 3.45.0 (sql.js 1.10.2, the page engine), whose JSON functions and \`->\` / \`->>\` operators are close cousins of PostgreSQL's.

> **How to read this doc:** Each idea is first explained in plain language, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every result and plan shown was produced by actually running it; the **Verified** section quotes each example output in full.

## 1. Why This Even Matters — A Story First

A post office keeps every parcel in one huge room, each with a label stuck on in any format the sender liked: some say "fragile", some list a phone number, some have a customs code. Finding "all parcels with a customs code" means walking past every shelf and reading every label.

So the post office builds a card index at the door. For every word that appears on any label, a card lists the shelves where it appears: "fragile: shelves 3, 17, 40". Now "parcels marked fragile" is one card lookup. But the index only answers questions of the form "which parcels mention X". It cannot answer "parcels heavier than 2 kg sorted by weight", because the cards are not in weight order.

A \`jsonb\` column is the room of free-form labels, and a **GIN index** is that card index. Knowing exactly which questions the card index answers, and rewriting the others or giving them a different index, is what this interview question tests. The model choice itself (should this data be JSON at all?) is the sibling question [JSONB vs normalized columns vs EAV](/interview-question/jsonb-vs-normalized-columns-vs-eav-how-do-you-model-flexible-attributes-without-); here we assume the data is JSON and make it fast.

## 2. Getting Values Out

📌 **Interview term: jsonb** — PostgreSQL's binary JSON type, parsed once on write and stored in a form that can be searched and indexed. It is the type to use for querying; plain \`json\` keeps the original text and re-parses it.

📌 **Interview term: \`->\` and \`->>\`** — field extraction operators. \`->\` returns the value as JSON, so it can be chained; \`->>\` returns it as text (PostgreSQL) or as a plain SQL value (SQLite).

<svg class="iq-diagram" width="100%" viewBox="0 0 780 250" role="img" aria-label="The arrow operator returns jsonb and the double arrow operator returns text">
  <defs>
    <marker id="sql11q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="85" width="230" height="80" rx="10"/>
  <text class="d-text" x="135" y="118" text-anchor="middle">payload</text>
  <text class="d-sub" x="135" y="142" text-anchor="middle">amount: 120</text>
  <rect class="d-box-accent" x="520" y="25" width="240" height="70" rx="10"/>
  <text class="d-text" x="640" y="54" text-anchor="middle">jsonb 120</text>
  <text class="d-sub" x="640" y="78" text-anchor="middle">chain more arrows</text>
  <rect class="d-box" x="520" y="155" width="240" height="70" rx="10"/>
  <text class="d-text" x="640" y="184" text-anchor="middle">text 120</text>
  <text class="d-sub" x="640" y="208" text-anchor="middle">cast before math</text>
  <path class="d-edge-accent" d="M 254 110 L 514 60" marker-end="url(#sql11q5-arrow)"/>
  <path class="d-edge" d="M 254 140 L 514 190" marker-end="url(#sql11q5-arrow)"/>
  <text class="d-sub" x="385" y="40" text-anchor="middle">-&gt; amount</text>
  <text class="d-sub" x="385" y="222" text-anchor="middle">-&gt;&gt; amount</text>
</svg>

The first example runs on the page engine. SQLite added \`->\` and \`->>\` in 3.38.0, compatible in spirit with PostgreSQL and MySQL ([SQLite 3.38.0 release log](https://www.sqlite.org/releaselog/3_38_0.html)), with JSON paths written as \`'$.device.os'\`:

~~~sql
SELECT id,
       payload ->> '$.type' AS type,
       payload ->> '$.device.os' AS os,
       payload -> '$.tags' AS tags_json,
       payload ->> '$.amount' AS amount
FROM events
ORDER BY id;
~~~

~~~text
id | type | os | tags_json | amount
1 | click | ios | ["promo","mobile"] | NULL
2 | purchase | NULL | ["mobile"] | 120
3 | click | android | NULL | NULL
4 | purchase | NULL | ["promo"] | 9
5 | signup | NULL | NULL | NULL
6 | purchase | NULL | NULL | 45
~~~

\`tags_json\` is still JSON text (\`["promo","mobile"]\`), because \`->\` keeps the JSON form. A missing key gives \`NULL\`, never an error. In PostgreSQL the same extraction is \`payload -> 'tags'\`, \`payload ->> 'type'\`, and for a nested path \`payload #>> '{device,os}'\` or \`payload -> 'device' ->> 'os'\`; since PostgreSQL 14 you can also write \`payload['device']['os']\` ([PostgreSQL 14 release notes](https://www.postgresql.org/docs/release/14.0/)).

📌 **Interview term: unnesting** — turning a JSON array into one row per element so it can be filtered, joined and grouped. SQLite has \`json_each\`; PostgreSQL has \`jsonb_array_elements\` and \`jsonb_array_elements_text\`. The second example lists each tag with its event:

~~~sql
SELECT e.id, t.value AS tag
FROM events e, json_each(e.payload, '$.tags') AS t
WHERE e.payload ->> '$.type' IN ('click', 'purchase')
ORDER BY t.value, e.id;
~~~

~~~text
id | tag
1 | mobile
2 | mobile
1 | promo
4 | promo
~~~

### The text comparison trap

\`->>\` in PostgreSQL always returns text, and text compares alphabetically. Purchases over 100 on PostgreSQL 16:

~~~sql
SELECT id,
       p ->> 'amount' AS amount_text,
       p ->> 'amount' > '100' AS text_compare,
       (p ->> 'amount')::NUMERIC > 100 AS numeric_compare,
       p -> 'amount' > '100'::JSONB AS jsonb_compare
FROM (SELECT id, payload::JSONB AS p FROM events) AS e
WHERE p @> '{"type": "purchase"}'
ORDER BY id;
~~~

~~~text
id | amount_text | text_compare | numeric_compare | jsonb_compare
2 | 120 | t | t | t
4 | 9 | t | f | f
6 | 45 | t | f | f
~~~

\`'9' > '100'\` and \`'45' > '100'\` are true as text. Casting to \`numeric\`, or comparing \`jsonb\` to \`jsonb\` with \`->\`, gives the right answer. SQLite is more forgiving here because its \`->>\` returns a real number for a JSON number, so \`payload ->> '$.amount' > 100\` compares numerically, and only an explicit cast to text reproduces the trap:

~~~text
id | amount | number_compare | text_compare
2 | 120 | 1 | 1
4 | 9 | 0 | 1
6 | 45 | 0 | 1
~~~

## 3. Searching Inside Documents

📌 **Interview term: containment (\`@>\`)** — \`a @> b\` is true when document \`a\` contains all the keys, values and array elements of \`b\`. \`payload @> '{"type": "purchase"}'\` means "type is purchase". It is the most important operator because GIN indexes serve it.

📌 **Interview term: key existence (\`?\`, \`?|\`, \`?&\`)** — \`payload ? 'coupon'\` is true if the top-level key exists; \`?|\` takes an array and needs any key, \`?&\` needs all of them.

📌 **Interview term: jsonpath (\`@?\`, \`@@\`)** — the SQL/JSON path language, added in PostgreSQL 12 ([Michael Paquier: Postgres 12 jsonpath](https://paquier.xyz/postgresql-2/postgres-12-jsonpath/)). \`@?\` asks whether a path returns any item: \`payload @? '$.amount ? (@ > 40)'\` means "has an amount greater than 40", with the number compared as a number.

The third example runs them all over the six events on PostgreSQL 16:

~~~sql
SELECT id,
       p @> '{"type": "purchase"}' AS is_purchase,
       p ? 'coupon' AS has_coupon_key,
       p ->> 'coupon' IS NULL AS coupon_is_sql_null,
       p ?| ARRAY['page', 'referrer'] AS has_page_or_referrer,
       p @? '$.amount ? (@ > 40)' AS amount_over_40,
       p #>> '{device,os}' AS os
FROM (SELECT id, payload::JSONB AS p FROM events) AS e
ORDER BY id;
~~~

~~~text
id | is_purchase | has_coupon_key | coupon_is_sql_null | has_page_or_referrer | amount_over_40 | os
1 | f | f | t | t | f | ios
2 | t | f | t | f | t | NULL
3 | f | f | t | t | f | android
4 | t | f | t | f | f | NULL
5 | f | f | t | t | f | NULL
6 | t | t | t | f | t | NULL
~~~

Look at event 6: \`has_coupon_key\` is true because the document contains \`"coupon": null\`, but \`coupon_is_sql_null\` is true for every row, because \`->>\` returns SQL \`NULL\` both for a JSON \`null\` and for a missing key.

📌 **Interview term: JSON null vs SQL NULL** — a key present with value \`null\` is different from an absent key. Tell them apart with \`?\` (key exists) or \`jsonb_typeof(payload -> 'coupon') = 'null'\`.

## 4. GIN: The Index Built for Documents

📌 **Interview term: GIN (Generalized Inverted Index)** — an index that maps each *item* inside a value (for \`jsonb\`: keys, values, array elements) to the list of rows containing it, its **posting list**. A query like \`@> '{"type": "purchase"}'\` looks up the items it needs and intersects their row lists.

<svg class="iq-diagram" width="100%" viewBox="0 0 780 300" role="img" aria-label="A GIN index maps each key and value item to the list of rows containing it">
  <defs>
    <marker id="sql11q5-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="20" width="250" height="56" rx="8"/>
  <text class="d-text" x="145" y="53" text-anchor="middle">type = click</text>
  <rect class="d-box-accent" x="20" y="120" width="250" height="56" rx="8"/>
  <text class="d-text" x="145" y="153" text-anchor="middle">type = purchase</text>
  <rect class="d-box-accent" x="20" y="220" width="250" height="56" rx="8"/>
  <text class="d-text" x="145" y="253" text-anchor="middle">key coupon</text>
  <rect class="d-box" x="470" y="20" width="290" height="56" rx="8"/>
  <text class="d-text" x="615" y="53" text-anchor="middle">rows 1, 3</text>
  <rect class="d-box" x="470" y="120" width="290" height="56" rx="8"/>
  <text class="d-text" x="615" y="153" text-anchor="middle">rows 2, 4, 6</text>
  <rect class="d-box" x="470" y="220" width="290" height="56" rx="8"/>
  <text class="d-text" x="615" y="253" text-anchor="middle">row 6</text>
  <path class="d-edge" d="M 274 48 L 464 48" marker-end="url(#sql11q5-arrow2)"/>
  <path class="d-edge" d="M 274 148 L 464 148" marker-end="url(#sql11q5-arrow2)"/>
  <path class="d-edge" d="M 274 248 L 464 248" marker-end="url(#sql11q5-arrow2)"/>
</svg>

Each arrow is a posting list: the item on the left, the rows that contain it on the right. A containment query on two items intersects two lists.

The fourth example generates 20000 events (1 in 100 is a signup), adds a GIN index and asks for the plan of a containment query:

~~~sql
-- 20000 generated events; 1 in 100 is a signup
CREATE TABLE big_events AS
SELECT g AS id,
       jsonb_build_object(
         'type', CASE WHEN g % 100 = 0 THEN 'signup'
                      WHEN g % 3 = 0 THEN 'purchase' ELSE 'click' END,
         'user', g % 500
       ) AS payload
FROM generate_series(1, 20000) AS g;
CREATE INDEX big_events_gin ON big_events USING GIN (payload jsonb_path_ops);
ANALYZE big_events;

EXPLAIN (COSTS OFF)
SELECT id FROM big_events WHERE payload @> '{"type": "signup"}';
~~~

~~~text
QUERY PLAN
Bitmap Heap Scan on big_events
  Recheck Cond: (payload @> '{"type": "signup"}'::jsonb)
  ->  Bitmap Index Scan on big_events_gin
        Index Cond: (payload @> '{"type": "signup"}'::jsonb)
~~~

📌 **Interview term: Bitmap Index Scan** — the index returns a bitmap of matching row locations, and a **Bitmap Heap Scan** then fetches those pages. \`Recheck Cond\` is there because GIN results can include false positives that the heap row must confirm. Run with \`EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)\`, the same query reported \`actual rows=200\` from the index and 200 heap blocks: exactly the 200 signups, out of 20000 rows. The planner chose this plan for a rare value; for a value in most rows it would choose a sequential scan, which is correct. On other data it may choose differently.

### Two operator classes

📌 **Interview term: operator class** — tells an index type how to index a data type and which operators it can serve. For \`jsonb\` and GIN there are two. Reading PostgreSQL 16's own catalog:

~~~sql
SELECT opc.opcname AS operator_class, string_agg(op.oprname, '  ' ORDER BY op.oprname) AS operators
FROM pg_opclass opc
JOIN pg_am am ON am.oid = opc.opcmethod AND am.amname = 'gin'
JOIN pg_amop ao ON ao.amopfamily = opc.opcfamily
JOIN pg_operator op ON op.oid = ao.amopopr
WHERE opc.opcintype = 'jsonb'::regtype
GROUP BY opc.opcname
ORDER BY opc.opcname;
~~~

~~~text
operator_class | operators
jsonb_ops | ?  ?&  ?|  @>  @?  @@
jsonb_path_ops | @>  @?  @@
~~~

\`jsonb_ops\`, the default when you write \`USING GIN (payload)\`, indexes each key and each value as separate items, so it can answer key existence. \`jsonb_path_ops\` indexes a hash of each path-to-value, which is more selective for containment and smaller, but cannot answer \`?\`. Both indexes on the same 20000 rows:

~~~text
indexname | size
idx_jsonb_ops | 216 kB
idx_jsonb_path_ops | 152 kB
~~~

### What GIN cannot do

On the same table, three plans (this script rebuilds the table with a rare \`coupon\` key on 1 row in 250):

~~~sql
CREATE TABLE big_events AS
SELECT g AS id,
       jsonb_build_object(
         'type', CASE WHEN g % 100 = 0 THEN 'signup'
                      WHEN g % 3 = 0 THEN 'purchase' ELSE 'click' END,
         'user', g % 500
       ) || CASE WHEN g % 250 = 0 THEN '{"coupon": "SPRING"}'::JSONB ELSE '{}'::JSONB END AS payload
FROM generate_series(1, 20000) AS g;
CREATE INDEX path_ops_idx ON big_events USING GIN (payload jsonb_path_ops);
ANALYZE big_events;
EXPLAIN (COSTS OFF) SELECT id FROM big_events WHERE payload ? 'coupon';
DROP INDEX path_ops_idx;
CREATE INDEX default_ops_idx ON big_events USING GIN (payload);
ANALYZE big_events;
EXPLAIN (COSTS OFF) SELECT id FROM big_events WHERE payload ? 'coupon';
CREATE INDEX type_expr_idx ON big_events ((payload ->> 'type'));
ANALYZE big_events;
EXPLAIN (COSTS OFF) SELECT id FROM big_events WHERE payload ->> 'type' = 'signup';
~~~

~~~text
QUERY PLAN
Seq Scan on big_events
  Filter: (payload ? 'coupon'::text)
QUERY PLAN
Bitmap Heap Scan on big_events
  Recheck Cond: (payload ? 'coupon'::text)
  ->  Bitmap Index Scan on default_ops_idx
        Index Cond: (payload ? 'coupon'::text)
QUERY PLAN
Bitmap Heap Scan on big_events
  Recheck Cond: ((payload ->> 'type'::text) = 'signup'::text)
  ->  Bitmap Index Scan on type_expr_idx
        Index Cond: ((payload ->> 'type'::text) = 'signup'::text)
~~~

1. \`? 'coupon'\` with only a \`jsonb_path_ops\` index: **Seq Scan**, because that class has no \`?\` operator.
2. The same query with the default \`jsonb_ops\` index: Bitmap Index Scan.
3. \`payload ->> 'type' = 'signup'\` is a text comparison on an expression, which no GIN class supports. A B-tree **expression index** on \`((payload ->> 'type'))\` serves it. (Without that index, the same query was a Seq Scan even with the GIN index present.)

📌 **Interview term: expression index** — a B-tree index on the result of an expression; the query must use the same expression to match it. It supports equality, ranges and \`ORDER BY\`, which GIN does not, and gives the planner statistics on the expression.

| Query shape | GIN \`jsonb_ops\` | GIN \`jsonb_path_ops\` | B-tree on \`((payload ->> 'k'))\` |
| :--- | :--- | :--- | :--- |
| \`payload @> '{"k": "v"}'\` | Yes | Yes (smaller index) | No |
| \`payload ? 'k'\`, \`?|\`, \`?&\` | Yes | No | No |
| \`payload @? '$.k ? (@ == "v")'\` | Yes | Yes | No |
| \`payload ->> 'k' = 'v'\` | No | No | Yes |
| \`(payload ->> 'n')::numeric > 100\` | No | No | Yes, on the cast expression |
| \`ORDER BY payload ->> 'k'\` | No | No | Yes |

## 5. Cost of GIN on Writes

📌 **Interview term: pending list (fastupdate)** — GIN's buffer of not-yet-merged entries. Because one row creates many index items, GIN batches new entries in a pending list that is merged into the main index by vacuum or when the list exceeds \`gin_pending_list_limit\`. This speeds up inserts on average but can make an occasional insert or search slower. On write-heavy tables, index only the column you actually search, prefer \`jsonb_path_ops\` when containment is enough, and consider expression indexes on the two or three keys that matter instead of a GIN on the whole document. (Described from the PostgreSQL documentation; write-cost timings were not measured here.)

## 6. Verified: Running the Code

Examples 1 and 2 ran the way this page runs them (sql.js 1.10.2, SQLite 3.45.0, a fresh in-memory database seeded from the schema above). Examples 3 and 4, the text-comparison trap, the operator class listing, the index sizes and the three extra plans ran on PostgreSQL 16.15 in scratch databases seeded with the same schema. Plans depend on data and statistics; the ones here are stable for these generated rows.

Example 1, extraction:

~~~text
id | type | os | tags_json | amount
1 | click | ios | ["promo","mobile"] | NULL
2 | purchase | NULL | ["mobile"] | 120
3 | click | android | NULL | NULL
4 | purchase | NULL | ["promo"] | 9
5 | signup | NULL | NULL | NULL
6 | purchase | NULL | NULL | 45
~~~

Example 2, unnesting a JSON array:

~~~text
id | tag
1 | mobile
2 | mobile
1 | promo
4 | promo
~~~

Example 3, jsonb operators (PostgreSQL):

~~~text
id | is_purchase | has_coupon_key | coupon_is_sql_null | has_page_or_referrer | amount_over_40 | os
1 | f | f | t | t | f | ios
2 | t | f | t | f | t | NULL
3 | f | f | t | t | f | android
4 | t | f | t | f | f | NULL
5 | f | f | t | t | f | NULL
6 | t | t | t | f | t | NULL
~~~

Example 4, GIN plan (PostgreSQL):

~~~text
QUERY PLAN
Bitmap Heap Scan on big_events
  Recheck Cond: (payload @> '{"type": "signup"}'::jsonb)
  ->  Bitmap Index Scan on big_events_gin
        Index Cond: (payload @> '{"type": "signup"}'::jsonb)
~~~

## Common Pitfalls

- **Expecting GIN to serve \`->> 'k' = 'v'\`.** It does not. Rewrite as \`@> '{"k": "v"}'\` or add a B-tree expression index.
- **Comparing \`->>\` output as numbers.** It is text in PostgreSQL; \`'9' > '100'\` is true. Cast, or use jsonpath, which compares JSON numbers as numbers.
- **Using \`jsonb_path_ops\` and then querying with \`?\`.** That class cannot serve key existence; the plan falls back to a Seq Scan.
- **Treating \`->> 'k' IS NULL\` as "key missing".** It is also true for \`"k": null\`; use \`?\` to test for the key.
- **A GIN index on every JSON column by reflex.** Each row adds many index entries; index the column and operator class your queries actually use.
- **Not checking the plan.** A query that looks indexable often is not; \`EXPLAIN\` tells you in one line.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Extract:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-&gt;</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">jsonb</code> so you can chain it (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">payload -&gt; 'device' -&gt; 'os'</code>), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-&gt;&gt;</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">text</code> for comparing and displaying, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#&gt;</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#&gt;&gt;</code> take a path array. Cast before maths: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(payload -&gt;&gt; 'amount')::numeric &gt; 100</code>, because as text <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'9' &gt; '100'</code> is true.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Search:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Containment</strong> <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">payload @&gt; '{"type": "purchase"}'</code> asks whether the document includes that fragment. <strong style="color:#ffca28;">Key existence</strong> <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">?</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">?|</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">?&amp;</code> checks top-level keys. <strong style="color:#ffca28;">jsonpath</strong> <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@?</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@@</code> (PostgreSQL 12+) express conditions such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'$.amount ? (@ &gt; 40)'</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. GIN:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">GIN</strong> index is an inverted index: it maps every key and value item to the rows containing it, like the index at the back of a book. It serves <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@&gt;</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">?</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">?|</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">?&amp;</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@?</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@@</code>. On 20000 rows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@&gt; '{"type": "signup"}'</code> used a Bitmap Index Scan on the GIN index.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Operator classes:</strong> <span style="color:#f0e2c8;">Default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">jsonb_ops</code> supports all six operators. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">jsonb_path_ops</code> supports only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@&gt;</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@?</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@@</code> but is smaller: 152 kB versus 216 kB on the demo table. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">jsonb_path_ops</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">? 'coupon'</code> fell back to a Seq Scan.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. What GIN cannot do:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">payload -&gt;&gt; 'type' = 'signup'</code>, ranges like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY</code> do not use GIN; they need a B-tree <strong style="color:#ffca28;">expression index</strong> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">((payload -&gt;&gt; 'type'))</code>. Rewrite equality as containment or add the expression index, and check with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXPLAIN</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did my GIN index not get used for <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">payload -&gt;&gt; 'status' = 'paid'</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">GIN indexes the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">jsonb</code> column, and that condition compares a text expression, so no GIN operator matches. Write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">payload @&gt; '{"status": "paid"}'</code> instead, or create a B-tree index on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">((payload -&gt;&gt; 'status'))</code>; both produced index scans in the demo.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between a missing key and a JSON null?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">payload ? 'coupon'</code> is true when the key exists even with value <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>, and false when it is missing. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">payload -&gt;&gt; 'coupon'</code> returns SQL <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NULL</code> in both cases, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IS NULL</code> cannot tell them apart. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">?</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">jsonb_typeof(payload -&gt; 'coupon') = 'null'</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you choose jsonb_path_ops over the default?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the workload is containment or jsonpath only. It hashes each path-and-value into one item, so the index is smaller and more selective for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@&gt;</code>. If you need key existence (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">?</code>) as well, use the default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">jsonb_ops</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does GIN slow down writes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. One row produces many index entries, one per key and value. PostgreSQL softens this with a pending list (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fastupdate</code>) that batches new entries and is merged later by vacuum or when it fills, which can make some inserts or searches occasionally slower. For write-heavy tables, index only what you search.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you index a range query on a JSON number?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Containment cannot express <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">amount &gt; 100</code>. Use a B-tree expression index on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(((payload -&gt;&gt; 'amount')::numeric))</code> and write the query with the same expression, or promote the key to a typed generated column.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| jsonb | PostgreSQL binary JSON type, searchable and indexable |
| \`->\` / \`->>\` | Extract a field as JSON / as text (SQL value in SQLite) |
| Unnesting | Turning a JSON array into rows (\`json_each\`, \`jsonb_array_elements\`) |
| Containment \`@>\` | Left document contains every part of the right one |
| Key existence \`?\` \`?|\` \`?&\` | Top-level key exists / any of / all of |
| jsonpath \`@?\` \`@@\` | SQL/JSON path tests, PostgreSQL 12+ |
| JSON null vs SQL NULL | A present key with value null differs from a missing key |
| GIN | Inverted index from items inside a value to the rows containing them |
| Bitmap Index Scan | Index returns row locations as a bitmap; heap scan fetches and rechecks |
| Operator class | Defines how an index handles a type and which operators it serves |
| Expression index | B-tree index on an expression such as \`((payload ->> 'type'))\` |
| Pending list | GIN buffer of new entries merged later (\`fastupdate\`) |

**Conclusion:** Querying \`jsonb\` well comes down to matching the operator to the index. Extract with \`->\` and \`->>\` (and cast before comparing numbers), search with containment \`@>\`, key existence \`?\` and jsonpath \`@?\`, and back them with a GIN index: default \`jsonb_ops\` when you need key existence, the smaller \`jsonb_path_ops\` when containment is enough. Equality on an extracted value, ranges and sorting are outside what GIN can do, so give those a B-tree expression index or promote the key to a column, and confirm every choice with \`EXPLAIN\`.`,
    examples: [
      {
        label: `Pull fields out of JSON: -> keeps JSON, ->> returns a plain SQL value, paths reach nested keys`,
        code: `SELECT id,
       payload ->> '$.type' AS type,
       payload ->> '$.device.os' AS os,
       payload -> '$.tags' AS tags_json,
       payload ->> '$.amount' AS amount
FROM events
ORDER BY id;`,
      },
      {
        label: `Unnest a JSON array into rows with json_each, then filter and sort like a table`,
        code: `SELECT e.id, t.value AS tag
FROM events e, json_each(e.payload, '$.tags') AS t
WHERE e.payload ->> '$.type' IN ('click', 'purchase')
ORDER BY t.value, e.id;`,
      },
      {
        label: `PostgreSQL: containment, key existence, jsonpath and path extraction on jsonb`,
        code: `SELECT id,
       p @> '{"type": "purchase"}' AS is_purchase,
       p ? 'coupon' AS has_coupon_key,
       p ->> 'coupon' IS NULL AS coupon_is_sql_null,
       p ?| ARRAY['page', 'referrer'] AS has_page_or_referrer,
       p @? '$.amount ? (@ > 40)' AS amount_over_40,
       p #>> '{device,os}' AS os
FROM (SELECT id, payload::JSONB AS p FROM events) AS e
ORDER BY id;`,
        runnable: false,
        dialect: "postgres",
      },
      {
        label: `PostgreSQL: a GIN index (jsonb_path_ops) serves @> containment on 20000 rows`,
        code: `-- 20000 generated events; 1 in 100 is a signup
CREATE TABLE big_events AS
SELECT g AS id,
       jsonb_build_object(
         'type', CASE WHEN g % 100 = 0 THEN 'signup'
                      WHEN g % 3 = 0 THEN 'purchase' ELSE 'click' END,
         'user', g % 500
       ) AS payload
FROM generate_series(1, 20000) AS g;
CREATE INDEX big_events_gin ON big_events USING GIN (payload jsonb_path_ops);
ANALYZE big_events;

EXPLAIN (COSTS OFF)
SELECT id FROM big_events WHERE payload @> '{"type": "signup"}';`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
];

export default augments;
