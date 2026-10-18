/**
 * SQL ULTRA — batch 17: Security and vector search (SQL injection and
 * parameterized queries, pgvector HNSW vs IVFFlat, filtered vector search).
 * Every example was run by scripts/verify-sql-examples.ts (sql.js 1.10.2 like
 * the page, PostgreSQL 16 for postgres examples); quoted output is that run's
 * output. pgvector is not installed locally, so pgvector SQL is marked
 * "not run here" and its behaviour is shown with plain-SQL simulations.
 */
import type { SqlUltraAugment } from "./sql-augments.types";

const augments: SqlUltraAugment[] = [
  {
    title: `What is SQL injection and how do parameterized queries prevent it?`,
    difficulty: "easy",
    seoDescription: `What SQL injection is, why concatenating input into SQL is unsafe, and how parameterized queries, allowlists and least privilege prevent it.`,
    description: `**Question presented to candidate:**
"Our login page builds its query by gluing the username from the form into a SQL string. A security review flagged it as SQL injection. What does that mean, why is it dangerous, and how do parameterized queries fix it?"

**What a strong answer should cover:**
- Definition: untrusted input is pasted into the SQL text, so the parser reads part of the input as SQL instead of as a value
- Why escaping by hand is fragile, and why a bound parameter is different: the SQL text and the values travel separately, so a value can never change the shape of the query
- Where parameters cannot help: table names, column names, \`ORDER BY\` direction and keywords cannot be placeholders, so they need an allowlist (or \`quote_ident\` / \`format('%I')\` in PostgreSQL)
- Defence in depth: least-privilege database roles, ORM raw-query APIs used safely (for example Prisma \`$queryRaw\` tagged template vs \`$queryRawUnsafe\`), input validation as a second layer, not the fix
- Second-order injection: data stored safely can still be unsafe later if another piece of code concatenates it into dynamic SQL

**Code / implementation expected:** Yes — show a concatenated query going wrong and the same lookup written with a placeholder.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  role TEXT NOT NULL
);
INSERT INTO users (id, username, email, role) VALUES
  (1, 'alice', 'alice@example.com', 'admin'),
  (2, 'bob', 'bob@example.com', 'member'),
  (3, 'carol', 'carol@example.com', 'member'),
  (4, 'dan', 'dan@example.com', 'member'),
  (5, 'o''brien', 'obrien@example.com', 'member');
\`\`\``,
    answer: `**Target Audience:** Beginners learning SQL, and developers preparing for backend or security interview questions
**Difficulty:** Easy
**Engines:** SQLite (examples run on sql.js 1.10.2 in the page and checked with Python sqlite3 on SQLite 3.45.1) and PostgreSQL 16.15. The idea is the same in every database and every driver.

> **How to read this doc:** Every new term is explained in plain words first. When it is a term interviewers expect you to know, it is tagged \`📌 Interview term:\` so you can learn the vocabulary too.

## 1. Why This Even Matters — A Story First

Imagine a hotel front desk with a form: "Please write the name of the guest you are visiting: ______". The clerk reads the whole sentence out loud to the guard: "Let in the visitor for room owner ______."

A normal visitor writes "Bob". A mischievous one writes "Bob, and also open every door in the building". If the guard treats everything the clerk reads as an instruction, the visitor just gave the guard an order.

That is SQL injection. The program builds a sentence (a SQL query) and drops whatever the user typed into the blank. If the typed text contains SQL, the database cannot tell which part you wrote and which part the stranger wrote, so it runs both.

OWASP, the best-known web security project, still ranks Injection in its Top 10: it is **A05 in the 2025 edition**, down from third place, and OWASP counts more than 14,000 CVEs for SQL injection alone ([OWASP Top 10 2025, A05 Injection](https://owasp.org/Top10/2025/A05_2025-Injection/)).

## 2. The Broken Pattern: Gluing Input into SQL

A login or lookup function written the naive way looks like this (Python, but every language has the same trap):

~~~text
query = "SELECT id, username FROM users WHERE username = '" + typed_name + "'"
~~~

📌 **Interview term: dynamic SQL** — SQL text that your program builds at runtime as a string, instead of a fixed statement.

📌 **Interview term: string literal** — a value written inside quotes in SQL, like \`'bob'\`. A single quote ends it, and two quotes in a row (\`''\`) mean one quote character inside it.

With normal input the result is fine. With input that contains a quote, the quote closes the literal early and the rest of the input becomes SQL. The first example builds both strings so you can see them:

~~~sql
SELECT 'SELECT id, username FROM users WHERE username = ''' || 'bob' || ''''
       AS built_from_normal_input
UNION ALL
SELECT 'SELECT id, username FROM users WHERE username = ''' || 'x'' OR ''1''=''1' || '''';
~~~

~~~text
built_from_normal_input
SELECT id, username FROM users WHERE username = 'bob'
SELECT id, username FROM users WHERE username = 'x' OR '1'='1'
~~~

The second line is no longer "find the user called something odd". It is "find the user called \`x\`, **or** any row where \`'1'='1'\`", and \`'1'='1'\` is true for every row.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 260" role="img" aria-label="String concatenation: the query template and the user input are glued into one string, and the SQL parser reads the input as code">
  <defs>
    <marker id="sql17q1-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="200" height="70" rx="8"/>
  <text class="d-text" x="130" y="60" text-anchor="middle">query template</text>
  <text class="d-sub" x="130" y="84" text-anchor="middle">written by you</text>
  <rect class="d-box-accent" x="30" y="160" width="200" height="70" rx="8"/>
  <text class="d-text" x="130" y="190" text-anchor="middle">form input</text>
  <text class="d-sub" x="130" y="214" text-anchor="middle">typed by anyone</text>
  <rect class="d-box-muted" x="300" y="95" width="180" height="70" rx="8"/>
  <text class="d-text" x="390" y="125" text-anchor="middle">one SQL string</text>
  <text class="d-sub" x="390" y="149" text-anchor="middle">code and data mixed</text>
  <rect class="d-box" x="550" y="95" width="180" height="70" rx="8"/>
  <text class="d-text" x="640" y="125" text-anchor="middle">SQL parser</text>
  <text class="d-sub" x="640" y="149" text-anchor="middle">reads it all as code</text>
  <path class="d-edge" d="M 232 70 L 294 118" marker-end="url(#sql17q1-a)"/>
  <path class="d-edge-accent" d="M 232 190 L 294 144" marker-end="url(#sql17q1-a)"/>
  <path class="d-edge" d="M 482 130 L 544 130" marker-end="url(#sql17q1-a)"/>
</svg>

The template and the input end up in one string, and the parser has no way to know where your code ends and the input begins.

## 3. What the Database Actually Runs

Here is that second string, run as written:

~~~sql
SELECT id, username
FROM users
WHERE username = 'x' OR '1'='1'
ORDER BY id;
~~~

~~~text
id | username
1 | alice
2 | bob
3 | carol
4 | dan
5 | o'brien
~~~

Every user comes back. On a login form that checks "did the query return a row?", that alone means signing in without a valid name. The same mechanism, with other text after the quote, can read other tables or change data, depending on what the database account is allowed to do; that is why the account permissions in section 7 matter.

📌 **Interview term: SQL injection** — a vulnerability where untrusted input is inserted into the SQL text so that the parser treats part of the input as SQL code rather than as a value.

📌 **Interview term: tautology** — a condition that is always true, such as \`'1'='1'\`. The textbook injection payload uses one to make a \`WHERE\` clause match every row.

## 4. The Fix: Parameterized Queries

A **parameterized query** keeps the SQL text fixed and puts a placeholder where the value goes. The value is sent to the database separately and bound to the placeholder.

~~~text
SQLite / Python / JDBC:   SELECT id, username FROM users WHERE username = ?
PostgreSQL protocol:      SELECT id, username FROM users WHERE username = $1
Named (many drivers):     SELECT id, username FROM users WHERE username = :name
~~~

📌 **Interview term: parameterized query (prepared statement, bind parameter)** — a query whose SQL text contains placeholders; the driver sends the values separately, and the database uses them only as data. "Prepared statement" is the database object that holds the parsed query; "bind parameter" is the placeholder and its value.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 260" role="img" aria-label="Parameterized query: the SQL text with a placeholder is parsed first, and the value is sent separately and bound as data">
  <defs>
    <marker id="sql17q1-b" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="220" height="70" rx="8"/>
  <text class="d-text" x="140" y="60" text-anchor="middle">SQL text with $1</text>
  <text class="d-sub" x="140" y="84" text-anchor="middle">fixed shape</text>
  <rect class="d-box-accent" x="30" y="160" width="220" height="70" rx="8"/>
  <text class="d-text" x="140" y="190" text-anchor="middle">value for $1</text>
  <text class="d-sub" x="140" y="214" text-anchor="middle">sent separately</text>
  <rect class="d-box" x="320" y="30" width="180" height="70" rx="8"/>
  <text class="d-text" x="410" y="60" text-anchor="middle">parse and plan</text>
  <text class="d-sub" x="410" y="84" text-anchor="middle">before any value</text>
  <rect class="d-box-muted" x="560" y="95" width="170" height="70" rx="8"/>
  <text class="d-text" x="645" y="125" text-anchor="middle">execute</text>
  <text class="d-sub" x="645" y="149" text-anchor="middle">value used as data</text>
  <path class="d-edge" d="M 252 65 L 314 65" marker-end="url(#sql17q1-b)"/>
  <path class="d-edge" d="M 502 70 L 556 112" marker-end="url(#sql17q1-b)"/>
  <path class="d-edge-accent" d="M 252 195 L 556 145" marker-end="url(#sql17q1-b)"/>
</svg>

The database parses and plans the query before it looks at the value, so the shape of the query (which columns, which conditions) is decided by your code alone. Whatever the value contains, it can only ever be compared as one string.

The effect is the same as if the input were one properly quoted value. The third example shows that: the whole input, quote and all, is just a strange user name that nobody has.

~~~sql
SELECT COUNT(*) AS matching_rows
FROM users
WHERE username = 'x'' OR ''1''=''1';
~~~

~~~text
matching_rows
0
~~~

In PostgreSQL you can see the server side of this with \`PREPARE\` and \`EXECUTE\`. The \`$1\` is never pasted into the text; it is filled in at execution. A real name that contains a quote, like \`o'brien\`, just works, which string-gluing code often gets wrong too:

~~~sql
PREPARE find_user(text) AS
  SELECT id, username FROM users WHERE username = $1;
EXECUTE find_user('o''brien');
~~~

~~~text
id | username
5 | o'brien
~~~

Executing the same prepared statement with the injection text as its value:

~~~sql
PREPARE count_user(text) AS
  SELECT COUNT(*) AS matching_rows FROM users WHERE username = $1;
EXECUTE count_user('x'' OR ''1''=''1');
~~~

~~~text
matching_rows
0
~~~

In an application you rarely write \`PREPARE\` yourself: the driver does it through the database protocol when you pass values separately. Here is the same comparison in Python with the built-in \`sqlite3\` module (run for this page on SQLite 3.45.1):

~~~text
payload = "x' OR '1'='1"
unsafe  = "SELECT id FROM users WHERE username = '" + payload + "'"
db.execute(unsafe)                                                    # concatenated
db.execute("SELECT id FROM users WHERE username = ?", (payload,))     # parameterized
db.execute("SELECT id FROM users WHERE username = ?", ("o'brien",))   # a real quote
~~~

~~~text
concatenated: [(1,), (2,), (3,), (4,), (5,)]
parameterized: []
quote in a name: [(5,)]
~~~

Python sqlite3 also refuses several statements in one \`execute()\` call: \`db.execute("SELECT 1; SELECT 2")\` raised \`ProgrammingError: You can only execute one statement at a time.\` That narrows what an attacker can do, but it is a side effect of the driver, not a defence to rely on; other drivers accept several statements.

📌 **Interview term: placeholder** — the marker (\`?\`, \`$1\`, \`:name\`) in parameterized SQL where a bound value goes.

## 5. Why Not Just Escape the Quotes?

Escaping means doubling every \`'\` before gluing the string together. It can work, but:

- You must remember it in **every** code path, forever. One forgotten call is a hole.
- It depends on context: a value inside a string literal, a number with no quotes, a \`LIKE\` pattern and an identifier each need different handling.
- Character encodings and database settings have broken hand-written escaping in the past.

A bound parameter removes the problem instead of patching it. Use the driver escaping functions only where parameters cannot reach (next section).

## 6. Where Parameters Cannot Help: Identifiers

A placeholder can stand for a **value**, never for an **identifier** (table or column name) or a **keyword** (\`ASC\`, \`DESC\`). This fails, because the query shape must be known before values arrive:

~~~text
SELECT id, username FROM users ORDER BY ?      -- binds a constant, not a column
~~~

📌 **Interview term: identifier** — the name of a database object, such as a table or a column. It is quoted with double quotes in standard SQL (\`"user name"\`), not single quotes.

For a "sort by" option the user chooses, use an **allowlist**: map each allowed choice to a fixed identifier in your code, and reject anything else.

~~~text
SORTABLE = {"name": "username", "email": "email"}
column = SORTABLE.get(request_sort)            # None if not allowed
if column is None: reject the request
sql = "SELECT id, username FROM users ORDER BY " + column    # only allowlisted text is pasted
~~~

📌 **Interview term: allowlist** — a fixed list of accepted values; anything not on it is rejected. Safer than a blocklist, which tries to list every bad value.

When dynamic SQL is truly needed inside PostgreSQL (for example in a PL/pgSQL function), \`format()\` has separate codes: \`%I\` quotes an identifier and \`%L\` quotes a literal:

~~~sql
SELECT format('SELECT %I FROM users WHERE username = %L',
              'email', 'x'' OR ''1''=''1') AS safe_dynamic_sql;
~~~

~~~text
safe_dynamic_sql
SELECT email FROM users WHERE username = 'x'' OR ''1''=''1'
~~~

The injection text became one harmless literal, with its quotes doubled. \`%I\` adds double quotes only when the name needs them: in a run on PostgreSQL 16.15, \`format('%I | %I | %L', 'email', 'Email; DROP', NULL)\` returned \`email | "Email; DROP" | NULL\`. For values inside PL/pgSQL, prefer \`EXECUTE ... USING\`, which binds them like parameters. See [What is a stored procedure?](/interview-question/what-is-a-stored-procedure) for where that code lives.

## 7. Defence in Depth

Parameters are the fix. These layers limit the damage if something is missed:

- **Least privilege.** The web app should connect as a role that can only do what the app needs (for example \`SELECT, INSERT, UPDATE\` on its own tables), never as a superuser or table owner.
- **Safe ORM use.** Query builders parameterize for you. Raw escape hatches may not: in Prisma (6.19 is installed in this project), the tagged template \`\` $queryRaw\`... \${value}\` \`\` turns each embedded value into a bind parameter, while \`$queryRawUnsafe(query, ...values)\` runs the string as given, so only pass user data as its extra \`values\` arguments.
- **Validation.** Check that an id is a number or that an email looks like an email. It catches mistakes early, but a valid-looking value can still be malicious, so it supports parameters instead of replacing them.
- **Error handling.** Do not show raw database errors to users; they reveal table names and query structure.
- **Second-order injection.** Data you stored safely is still untrusted when you read it back. If some other code later concatenates it into dynamic SQL, the payload fires then.

📌 **Interview term: least privilege** — giving each account only the permissions it needs, so a successful attack can do less.

📌 **Interview term: second-order injection** — input stored safely and later concatenated into a query by different code, where it then acts as SQL.

## 8. Verified: Running the Code

The first three examples ran on sql.js 1.10.2 (SQLite) seeded with the schema above; the PostgreSQL examples ran on PostgreSQL 16.15 in a throwaway database seeded with the same schema. The Python snippet in section 4 ran with the \`sqlite3\` module on SQLite 3.45.1.

What concatenation builds:

~~~text
built_from_normal_input
SELECT id, username FROM users WHERE username = 'bob'
SELECT id, username FROM users WHERE username = 'x' OR '1'='1'
~~~

The concatenated query, run:

~~~text
id | username
1 | alice
2 | bob
3 | carol
4 | dan
5 | o'brien
~~~

The same input as one value:

~~~text
matching_rows
0
~~~

PostgreSQL \`PREPARE\` / \`EXECUTE\` with a name containing a quote:

~~~text
id | username
5 | o'brien
~~~

The same prepared statement with the injection text as its value:

~~~text
matching_rows
0
~~~

\`format()\` with \`%I\` and \`%L\`:

~~~text
safe_dynamic_sql
SELECT email FROM users WHERE username = 'x'' OR ''1''=''1'
~~~

## Common Pitfalls

- **Parameterizing most queries but not all.** One search box or report filter built by concatenation is enough. Grep for SQL strings joined with \`+\`, \`f"..."\` or template strings.
- **Trying to bind a table name or sort direction.** It cannot work; use an allowlist instead of giving up and concatenating raw input.
- **Unsafe raw APIs in ORMs.** \`$queryRawUnsafe\`, \`.raw()\` or \`text()\` built with string formatting bring the bug back even in an ORM codebase.
- **Building a \`LIKE\` pattern by hand.** Bind the pattern as a parameter (\`username LIKE ?\` with \`'%' + term + '%'\` as the value), and remember that \`%\` and \`_\` in user input are still wildcards unless you escape them with an \`ESCAPE\` clause.
- **Assuming stored procedures are safe by default.** A procedure that concatenates its arguments into \`EXECUTE\` is injectable.
- **Connecting as a superuser.** It turns any missed bug into full control of the database.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">SQL injection is when untrusted input is pasted into the SQL <strong style="color:#ffca28;">text</strong>, so the parser treats part of the input as SQL. The classic case is a login query built with string concatenation.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it works:</strong> <span style="color:#f0e2c8;">A quote in the input closes the string literal early, and what follows becomes SQL: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x' OR '1'='1</code> turns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE username = '...'</code> into a condition that is always true.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The fix:</strong> <span style="color:#f0e2c8;">Use <strong style="color:#ffca28;">parameterized queries</strong>: the SQL text has placeholders (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">?</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$1</code>) and the values are sent separately and bound as data. The query shape is fixed before the value is seen, so no value can change it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Where parameters stop:</strong> <span style="color:#f0e2c8;">Identifiers and keywords (table, column, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY</code> direction) cannot be placeholders. Map them through an <strong style="color:#ffca28;">allowlist</strong>, or quote them with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">format('%I')</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">quote_ident</code> in PostgreSQL.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Defence in depth:</strong> <span style="color:#f0e2c8;">Run the app with a least-privilege role, avoid unsafe raw-query APIs like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$queryRawUnsafe</code> with user input, and treat validation and escaping as extra layers, not the fix.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is escaping quotes by hand good enough?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is fragile: you must get every quote, every encoding and every context right, every time, in every code path. Parameters remove the problem instead of patching it, and they also handle names like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">o'brien</code> correctly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do stored procedures prevent SQL injection?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only if the procedure itself uses parameters. A procedure that builds dynamic SQL by concatenating its arguments and runs it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXECUTE</code> is just as injectable. In PL/pgSQL use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXECUTE ... USING</code> for values and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">format('%I')</code> for names.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you safely let users sort by a column they choose?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You cannot bind a column name. Map the user choice to a fixed list, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{"name": "username", "joined": "created_at"}</code>, reject anything else, and only ever paste the allowlisted identifier into the SQL.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does an ORM make you immune?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Its normal query builder parameterizes for you, but raw-query escape hatches do not. In Prisma the tagged template <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$queryRaw</code> turns each embedded value into a parameter, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$queryRawUnsafe(string)</code> runs whatever string you give it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is second-order injection?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The payload is stored safely (with parameters), then later some other code reads it back and concatenates it into a dynamic query. Data from your own database is still untrusted when it started as user input.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Dynamic SQL | SQL text built as a string at runtime |
| String literal | A quoted value in SQL; a single quote ends it |
| SQL injection | Untrusted input inserted into SQL text so part of it runs as SQL |
| Tautology | An always-true condition such as \`'1'='1'\` |
| Parameterized query / prepared statement / bind parameter | Fixed SQL text with placeholders; values sent separately and used only as data |
| Placeholder | \`?\`, \`$1\` or \`:name\` where a bound value goes |
| Identifier | Name of a table, column or other object |
| Allowlist | Fixed list of accepted values; everything else rejected |
| Least privilege | Each account gets only the permissions it needs |
| Second-order injection | Stored input later concatenated into a query by other code |

**Conclusion:** SQL injection happens because concatenation mixes your code and a stranger's data into one string, and the parser cannot tell them apart; a single quote in the input is enough to change what the query means, as the run above showed when one line of input returned every user. Parameterized queries fix it at the root by sending the SQL text and the values separately, so the query shape is fixed before any value is seen and the same input simply matches nothing. Where a placeholder cannot go, such as column names, use an allowlist or \`format('%I')\`, and add least-privilege accounts and careful ORM use so a missed spot does less harm.`,
    examples: [
      {
        label: `What string concatenation builds: normal input vs input containing a quote`,
        code: `SELECT 'SELECT id, username FROM users WHERE username = ''' || 'bob' || ''''
       AS built_from_normal_input
UNION ALL
SELECT 'SELECT id, username FROM users WHERE username = ''' || 'x'' OR ''1''=''1' || '''';`,
      },
      {
        label: `The concatenated query the database actually receives: the WHERE clause is now always true`,
        code: `SELECT id, username
FROM users
WHERE username = 'x' OR '1'='1'
ORDER BY id;`,
      },
      {
        label: `The same input treated as one value (what a bound parameter does): no user has that name`,
        code: `SELECT COUNT(*) AS matching_rows
FROM users
WHERE username = 'x'' OR ''1''=''1';`,
      },
      {
        label: `PostgreSQL: PREPARE / EXECUTE binds the value server-side, so a quote in a real name just works`,
        code: `PREPARE find_user(text) AS
  SELECT id, username FROM users WHERE username = $1;
EXECUTE find_user('o''brien');`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `pgvector cosine similarity index in 2025-26 — HNSW vs IVFFlat for semantic search at scale?`,
    difficulty: "hard",
    seoDescription: `How pgvector HNSW and IVFFlat indexes speed up cosine similarity search, how they differ, and how to tune ef_search, lists and probes for recall.`,
    description: `**Question presented to candidate:**
"We store OpenAI-style embeddings for a few million support articles in Postgres with pgvector and run cosine-similarity search. Which index would you put on the embedding column, HNSW or IVFFlat, and how would you tune it?"

**What a strong answer should cover:**
- Cosine distance, the \`<=>\` operator and the matching \`vector_cosine_ops\` operator class; why normalized vectors make cosine, inner product and L2 rank alike
- Both indexes are approximate (ANN): they trade recall for speed, so recall@k has to be measured against exact search
- IVFFlat: k-means lists built from existing data, \`lists\` at build time and \`ivfflat.probes\` at query time; cheaper to build, must be built after the data is loaded and rebuilt when the data drifts
- HNSW: a layered neighbour graph, \`m\` and \`ef_construction\` at build time and \`hnsw.ef_search\` at query time; better speed-recall trade-off, slower to build and more memory, no training step (pgvector README)
- Version facts: HNSW arrived in pgvector 0.5.0 (2023), iterative index scans in 0.8.0 (2024); indexes on \`vector\` are capped at 2,000 dimensions, \`halfvec\` allows 4,000
- Operations: memory for the build (\`maintenance_work_mem\`), the index only helps \`ORDER BY embedding <=> $1 LIMIT k\`, and filtered queries need extra care

**Clarifying questions expected:**
- How many vectors, how many dimensions, and how fast does the table grow or change?
- What recall is acceptable (for example 95% of the true top 10), and what latency budget per query?
- Do queries also filter on other columns (tenant, category, language)?

**Code / implementation expected:** Optional — the index DDL and tuning settings, plus a way to measure recall against an exact query.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE docs (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  e1 REAL NOT NULL,
  e2 REAL NOT NULL
);
INSERT INTO docs (id, title, e1, e2) VALUES
  (1, 'Reset your password', 0.966, 0.259),
  (2, 'Change account email', 1.813, 0.845),
  (3, 'Two-factor login setup', 0.433, 0.25),
  (4, 'Refund a late order', 0.562, 1.391),
  (5, 'Track a parcel', 0.035, 0.999),
  (6, 'Delivery took too long', -0.347, 1.97),
  (7, 'Export invoices to CSV', -0.985, 0.174),
  (8, 'Monthly billing report', -0.797, -0.07),
  (9, 'Change payment card', -1.128, -0.41),
  (10, 'Cancel a subscription', -0.766, 0.643);
CREATE TABLE ivf_centroids (
  list_id INTEGER PRIMARY KEY,
  c1 REAL NOT NULL,
  c2 REAL NOT NULL
);
INSERT INTO ivf_centroids (list_id, c1, c2) VALUES
  (1, 0.914, 0.407),
  (2, 0.087, 0.996),
  (3, -1.0, 0.0);
CREATE TABLE hnsw_edges (
  src INTEGER NOT NULL,
  dst INTEGER NOT NULL,
  PRIMARY KEY (src, dst)
);
INSERT INTO hnsw_edges (src, dst) VALUES
  (8, 7), (7, 8), (8, 9), (9, 8), (7, 9), (9, 7),
  (7, 10), (10, 7), (10, 6), (6, 10), (10, 5), (5, 10),
  (6, 5), (5, 6), (5, 4), (4, 5), (4, 3), (3, 4),
  (4, 2), (2, 4), (3, 2), (2, 3), (2, 1), (1, 2), (1, 3), (3, 1);
\`\`\``,
    answer: `**Target Audience:** Developers adding semantic search to PostgreSQL, and candidates preparing for backend or ML-infrastructure interviews
**Difficulty:** Hard
**Engines:** PostgreSQL with the pgvector extension. pgvector is not installed on the machine that verified this page, so the index behaviour is explained with plain-SQL simulations that ran on sql.js 1.10.2 (SQLite) and PostgreSQL 16.15; pgvector SQL is marked "not run here" and its facts are cited from the [pgvector README](https://github.com/pgvector/pgvector) and changelog.

> **How to read this doc:** Every new term is explained in plain words first. When it is a term interviewers expect you to know, it is tagged \`📌 Interview term:\` so you can learn the vocabulary too.

## 1. Why This Even Matters — A Story First

Picture a library with a million books and no catalogue. Someone asks for "books like this one". The honest method is to compare the request with every single book. It always finds the best match, and it takes all afternoon.

A smart librarian has two shortcuts. One: put the books on themed shelves, walk to the two or three shelves that best match the request, and only look there (that is **IVFFlat**). Two: give every book a few sticky notes pointing at similar books, start at a well-known book and keep following the note that gets you closer (that is **HNSW**). Both are much faster. Both can occasionally miss the very best book. The interview question is about which shortcut to pick and how to tune it so it rarely misses.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How many vectors, and how many dimensions? | Sets memory and build time; over 2,000 dimensions cannot be indexed as plain \`vector\` |
| How often are rows inserted, updated or deleted? | IVFFlat lists go stale as data drifts; HNSW absorbs inserts but each one costs graph work |
| What recall and latency are acceptable? | Both indexes are tuned on a recall-versus-speed dial |
| Do queries filter on other columns? | Filters interact badly with ANN indexes ([filtered search](/interview-question/filtered-vector-search-with-pgvector-how-do-you-combine-where-category-x-with-or)) |
| Is the embedding model fixed? | A new model means new vectors and a full index rebuild either way |

## 3. Embeddings and Cosine Distance

An **embedding** is a list of numbers that a machine learning model produces for a piece of text (or an image), so that texts with similar meaning get similar lists. Real models produce 384 to 3,072 numbers per text. The examples here use just two numbers per row so you can follow the maths by hand.

📌 **Interview term: embedding** — a fixed-length vector of numbers representing the meaning of an item; similar items have vectors pointing in similar directions.

**Cosine distance** measures the angle between two vectors and ignores their length:

~~~text
cosine_similarity(a, b) = (a . b) / (|a| * |b|)
cosine_distance(a, b)   = 1 - cosine_similarity(a, b)      -- 0 = same direction, 1 = at right angles, 2 = opposite
~~~

📌 **Interview term: cosine distance** — \`1 - cosine similarity\`; small means the vectors point the same way. In pgvector it is the \`<=>\` operator.

Searching exactly means computing this for every row and keeping the smallest. With the query vector \`(0.643, 0.766)\` ("my late order, can I get my money back?"):

~~~sql
WITH q AS (SELECT 0.643 AS q1, 0.766 AS q2)
SELECT d.id, d.title,
       ROUND(1 - (d.e1 * q.q1 + d.e2 * q.q2)
             / (sqrt(d.e1 * d.e1 + d.e2 * d.e2) * sqrt(q.q1 * q.q1 + q.q2 * q.q2)), 4)
         AS cosine_distance
FROM docs d, q
ORDER BY cosine_distance, d.id
LIMIT 3;
~~~

~~~text
id | title | cosine_distance
4 | Refund a late order | 0.049
3 | Two-factor login setup | 0.0602
2 | Change account email | 0.0937
~~~

📌 **Interview term: k-nearest neighbours (kNN), exact search** — return the \`k\` rows closest to the query by checking every row. Always correct, cost grows linearly with the table.

### Why length does not matter (and why people normalize)

The rows in the sample have different lengths (0.5 to 2). Plain Euclidean (L2) distance is affected by length, cosine is not, so on raw vectors the two rank rows differently:

~~~sql
WITH q AS (SELECT 0.643 AS q1, 0.766 AS q2),
scored AS (
  SELECT d.id, d.title,
         ROUND(sqrt(d.e1 * d.e1 + d.e2 * d.e2), 3) AS length,
         ROUND(sqrt((d.e1 - q.q1) * (d.e1 - q.q1) + (d.e2 - q.q2) * (d.e2 - q.q2)), 4) AS l2_raw,
         ROUND(1 - (d.e1 * q.q1 + d.e2 * q.q2)
               / (sqrt(d.e1 * d.e1 + d.e2 * d.e2) * sqrt(q.q1 * q.q1 + q.q2 * q.q2)), 4) AS cosine
  FROM docs d, q
)
SELECT id, title, length, l2_raw,
       RANK() OVER (ORDER BY l2_raw) AS l2_rank,
       cosine,
       RANK() OVER (ORDER BY cosine) AS cosine_rank
FROM scored
WHERE id IN (1, 2, 3, 4, 5, 6)
ORDER BY cosine_rank;
~~~

~~~text
id | title | length | l2_raw | l2_rank | cosine | cosine_rank
4 | Refund a late order | 1.5 | 0.6302 | 3 | 0.049 | 1
3 | Two-factor login setup | 0.5 | 0.5571 | 1 | 0.0602 | 2
2 | Change account email | 2 | 1.1727 | 5 | 0.0937 | 3
1 | Reset your password | 1 | 0.6011 | 2 | 0.1806 | 4
5 | Track a parcel | 1 | 0.6511 | 4 | 0.212 | 5
6 | Delivery took too long | 2 | 1.5588 | 6 | 0.3572 | 6
~~~

Row 2 is close in direction (cosine rank 3) but twice as long, so L2 ranks it 5th. If you **normalize** every vector to length 1 when you write it, cosine distance becomes \`1 - dot product\` and L2, inner product and cosine all give the same order; that is why many systems normalize on write and then use the cheapest operator.

📌 **Interview term: normalization** — dividing a vector by its length so its length is 1.

pgvector operators and their index operator classes (from the [pgvector README](https://github.com/pgvector/pgvector)):

| Distance | Operator | Operator class for the index |
| :--- | :--- | :--- |
| L2 (Euclidean) | \`<->\` | \`vector_l2_ops\` |
| Negative inner product | \`<#>\` | \`vector_ip_ops\` |
| Cosine distance | \`<=>\` | \`vector_cosine_ops\` |

📌 **Interview term: operator class** — tells an index which operator it can answer. A cosine index (\`vector_cosine_ops\`) only helps queries ordered by \`<=>\`.

## 4. Why a Normal Index Does Not Help

A B-tree sorts rows by a column value. "Distance to a query vector" changes with every query, so there is no fixed order to store. PostgreSQL 16 shows this on the sample table, even with a B-tree on both coordinates:

~~~sql
CREATE INDEX docs_e1_e2_idx ON docs (e1, e2);
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id
FROM docs
ORDER BY 1 - (e1 * 0.643 + e2 * 0.766) / sqrt(e1 * e1 + e2 * e2)
LIMIT 3;
~~~

~~~text
QUERY PLAN
Limit (actual rows=3 loops=1)
  ->  Sort (actual rows=3 loops=1)
        Sort Key: (('1'::double precision - (((e1 * '0.643'::double precision) + (e2 * '0.766'::double precision)) / sqrt((((e1 * e1) + (e2 * e2)))::double precision))))
        Sort Method: top-N heapsort  Memory: 25kB
        ->  Seq Scan on docs (actual rows=10 loops=1)
~~~

Every row is read and a top-N sort keeps the best 3. On 10 rows that is instant; on 5 million 1,536-number rows it reads gigabytes per query. (The planner may pick another plan on other data, but no B-tree can return rows in distance order.) See [How do you read an EXPLAIN query plan?](/interview-question/how-do-you-read-an-explain-query-plan) for the node names.

📌 **Interview term: approximate nearest neighbour (ANN) index** — an index that finds *most* of the true nearest neighbours while reading a small part of the data. HNSW and IVFFlat are both ANN indexes.

📌 **Interview term: recall@k** — of the true top \`k\` rows, the fraction the index actually returned. 9 of the true top 10 is recall@10 = 0.9.

## 5. IVFFlat: Shelves Around Centroids

At build time IVFFlat runs k-means on the rows already in the table to pick \`lists\` centre points (**centroids**), then files every row under its nearest centroid. At query time it compares the query with the centroids, scans only the \`probes\` closest lists, and sorts what it found.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="IVFFlat: rows are grouped into lists around centroids, and a query scans only the lists whose centroids are closest">
  <defs>
    <marker id="sql17q2-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="290" y="20" width="180" height="60" rx="8"/>
  <text class="d-text" x="380" y="47" text-anchor="middle">query vector</text>
  <text class="d-sub" x="380" y="68" text-anchor="middle">compare to centroids</text>
  <rect class="d-box-accent" x="30" y="170" width="200" height="90" rx="8"/>
  <text class="d-text" x="130" y="200" text-anchor="middle">list 1</text>
  <text class="d-sub" x="130" y="224" text-anchor="middle">rows 1, 2, 3</text>
  <text class="d-sub" x="130" y="246" text-anchor="middle">probe 1: scanned</text>
  <rect class="d-box" x="280" y="170" width="200" height="90" rx="8"/>
  <text class="d-text" x="380" y="200" text-anchor="middle">list 2</text>
  <text class="d-sub" x="380" y="224" text-anchor="middle">rows 4, 5, 6</text>
  <text class="d-sub" x="380" y="246" text-anchor="middle">probe 2: scanned</text>
  <rect class="d-box-muted" x="530" y="170" width="200" height="90" rx="8"/>
  <text class="d-text" x="630" y="200" text-anchor="middle">list 3</text>
  <text class="d-sub" x="630" y="224" text-anchor="middle">rows 7 to 10</text>
  <text class="d-sub" x="630" y="246" text-anchor="middle">skipped</text>
  <path class="d-edge-accent" d="M 330 84 L 160 164" marker-end="url(#sql17q2-a)"/>
  <path class="d-edge" d="M 380 84 L 380 164" marker-end="url(#sql17q2-a)"/>
  <path class="d-edge-dashed" d="M 430 84 L 600 164" marker-end="url(#sql17q2-a)"/>
</svg>

In the diagram the query is closest to list 1, then list 2. One probe reads only list 1; two probes add list 2. The simulation below does exactly that on the sample (3 centroids, rows assigned to the nearest one, then the top 3 found with 1, 2 and 3 probes, compared with the exact answer \`2, 3, 4\`):

~~~sql
WITH q AS (SELECT 0.643 AS q1, 0.766 AS q2),
cos AS (
  SELECT d.id,
         1 - (d.e1 * q.q1 + d.e2 * q.q2)
             / (sqrt(d.e1 * d.e1 + d.e2 * d.e2) * sqrt(q.q1 * q.q1 + q.q2 * q.q2)) AS dist
  FROM docs d, q
),
assign AS (  -- index build: each row goes to its nearest centroid (its list)
  SELECT id, list_id FROM (
    SELECT d.id, c.list_id,
           ROW_NUMBER() OVER (PARTITION BY d.id ORDER BY
             (d.e1 * c.c1 + d.e2 * c.c2) / sqrt(d.e1 * d.e1 + d.e2 * d.e2) DESC) AS rn
    FROM docs d, ivf_centroids c) WHERE rn = 1
),
list_rank AS (  -- query time: lists ordered by how close their centroid is to q
  SELECT c.list_id, ROW_NUMBER() OVER (ORDER BY c.c1 * q.q1 + c.c2 * q.q2 DESC) AS r
  FROM ivf_centroids c, q
),
exact AS (SELECT id FROM cos ORDER BY dist LIMIT 3),
probes(n) AS (VALUES (1), (2), (3)),
found AS (
  SELECT p.n, x.id FROM probes p
  JOIN (
    SELECT p2.n, c.id, ROW_NUMBER() OVER (PARTITION BY p2.n ORDER BY c.dist) AS k
    FROM probes p2
    JOIN list_rank lr ON lr.r <= p2.n
    JOIN assign a ON a.list_id = lr.list_id
    JOIN cos c ON c.id = a.id
  ) x ON x.n = p.n AND x.k <= 3
)
SELECT n AS probes,
       (SELECT COUNT(*) FROM assign a JOIN list_rank lr ON lr.list_id = a.list_id WHERE lr.r <= n) AS rows_scanned,
       group_concat(id, ',') AS top3_found,
       (SELECT COUNT(*) FROM found f2 WHERE f2.n = f.n AND f2.id IN (SELECT id FROM exact)) || '/3' AS recall_at_3
FROM (SELECT * FROM found ORDER BY n, id) f
GROUP BY n
ORDER BY n;
~~~

~~~text
probes | rows_scanned | top3_found | recall_at_3
1 | 3 | 1,2,3 | 2/3
2 | 6 | 2,3,4 | 3/3
3 | 10 | 2,3,4 | 3/3
~~~

With one probe it read 3 of 10 rows and missed the true best match, row 4 ("Refund a late order"), because that row lives in list 2: recall 2/3. Two probes read 6 rows and found all three. That is the whole IVFFlat trade-off: more probes, more rows read, higher recall.

📌 **Interview term: lists / centroids** — the clusters IVFFlat builds with k-means, set with \`WITH (lists = n)\`.

📌 **Interview term: probes** — how many of the nearest lists a query scans, set with \`SET ivfflat.probes = n\`. More probes, better recall, slower query.

Consequences an interviewer will probe for:

- The centroids come from the data present at build time. The README lists "create the index after the table has some data" as one of the keys to good recall; built on an empty table the centroids mean nothing ([Supabase on HNSW vs IVF](https://supabase.com/blog/increase-performance-pgvector-hnsw)).
- New rows are filed under the existing centroids. If the data drifts (a new product line, a new language), the lists become lopsided and the index should be rebuilt (\`REINDEX\`).
- Starting points from the README: \`lists = rows / 1000\` up to 1M rows and \`sqrt(rows)\` above that, and \`probes = sqrt(lists)\`. For 1M rows that is 1,000 lists and about 32 probes; for 10M rows about 3,162 lists and 56 probes.

## 6. HNSW: A Graph You Walk Downhill

HNSW (Hierarchical Navigable Small World) links every row to up to \`m\` similar rows, in several layers. The top layers have few rows and long links (motorways); layer 0 has every row and short links (local streets). A search enters at the top, greedily moves to whichever neighbour is closer to the query, drops a layer when it cannot improve, and at layer 0 keeps a candidate list of size \`ef_search\` instead of a single best node.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="HNSW: a search enters at the sparse top layer, moves greedily toward the query, then drops to denser layers until layer 0">
  <defs>
    <marker id="sql17q2-b" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="20" width="700" height="70" rx="8"/>
  <text class="d-text" x="120" y="60" text-anchor="middle">layer 2</text>
  <circle class="d-box-accent" cx="300" cy="55" r="14"/>
  <circle class="d-box" cx="560" cy="55" r="14"/>
  <rect class="d-box-muted" x="30" y="130" width="700" height="70" rx="8"/>
  <text class="d-text" x="120" y="170" text-anchor="middle">layer 1</text>
  <circle class="d-box" cx="300" cy="165" r="14"/>
  <circle class="d-box" cx="430" cy="165" r="14"/>
  <circle class="d-box" cx="560" cy="165" r="14"/>
  <rect class="d-box-muted" x="30" y="240" width="700" height="70" rx="8"/>
  <text class="d-text" x="120" y="280" text-anchor="middle">layer 0</text>
  <circle class="d-box" cx="250" cy="275" r="12"/>
  <circle class="d-box" cx="350" cy="275" r="12"/>
  <circle class="d-box" cx="430" cy="275" r="12"/>
  <circle class="d-box" cx="510" cy="275" r="12"/>
  <circle class="d-box-accent" cx="620" cy="275" r="12"/>
  <path class="d-edge-accent" d="M 318 55 L 540 55" marker-end="url(#sql17q2-b)"/>
  <path class="d-edge-dashed" d="M 560 73 L 560 145" marker-end="url(#sql17q2-b)"/>
  <path class="d-edge-dashed" d="M 560 183 L 560 255" marker-end="url(#sql17q2-b)"/>
  <path class="d-edge-accent" d="M 576 275 L 602 275" marker-end="url(#sql17q2-b)"/>
  <text class="d-sub" x="300" y="112" text-anchor="middle">entry point</text>
  <text class="d-sub" x="660" y="112" text-anchor="middle">drop a layer</text>
</svg>

The search starts at a single entry point in the sparse top layer and only reaches the dense bottom layer once it is already near the answer, which is why it reads so few rows.

The greedy step is easy to simulate on one layer. \`hnsw_edges\` holds a small neighbour graph, the walk starts at row 8 ("Monthly billing report", far from the query) and hops to the closest neighbour while that neighbour is closer:

~~~sql
WITH RECURSIVE q AS (SELECT 0.643 AS q1, 0.766 AS q2),
dist AS (
  SELECT d.id, d.title,
         ROUND(1 - (d.e1 * q.q1 + d.e2 * q.q2)
               / (sqrt(d.e1 * d.e1 + d.e2 * d.e2) * sqrt(q.q1 * q.q1 + q.q2 * q.q2)), 4) AS d
  FROM docs d, q
),
walk(step, node, d) AS (
  SELECT 0, 8, (SELECT d FROM dist WHERE id = 8)          -- entry point
  UNION ALL
  SELECT w.step + 1, b.id, b.d
  FROM walk w
  JOIN dist b ON b.id = (SELECT e.dst FROM hnsw_edges e JOIN dist x ON x.id = e.dst
                         WHERE e.src = w.node ORDER BY x.d, x.id LIMIT 1)
  WHERE b.d < w.d                                          -- stop when no neighbour is closer
)
SELECT w.step, w.node, dist.title, w.d AS cosine_distance
FROM walk w JOIN dist ON dist.id = w.node
ORDER BY w.step;
~~~

~~~text
step | node | title | cosine_distance
0 | 8 | Monthly billing report | 1.7075
1 | 7 | Export invoices to CSV | 1.4999
2 | 10 | Cancel a subscription | 1
3 | 5 | Track a parcel | 0.212
4 | 4 | Refund a late order | 0.049
~~~

Four hops, and it ends at row 4, the true nearest neighbour, having computed distances for only the rows next to its path. A pure greedy walk can get stuck at a local minimum; that is why real HNSW keeps \`ef_search\` candidates (default 40 in pgvector) rather than one, and why raising \`hnsw.ef_search\` raises recall.

📌 **Interview term: HNSW** — Hierarchical Navigable Small World, a layered proximity graph searched greedily from a sparse top layer down to a full bottom layer.

📌 **Interview term: m / ef_construction / ef_search** — HNSW settings: \`m\` is the maximum links per node per layer (default 16), \`ef_construction\` the candidate list size while building (default 64), \`hnsw.ef_search\` the candidate list size while querying (default 40). Values from the [pgvector README](https://github.com/pgvector/pgvector).

## 7. The pgvector SQL (not run here)

pgvector is not installed on the verification machine, so this block was not executed; it follows the syntax in the [pgvector README](https://github.com/pgvector/pgvector):

~~~sql
-- not run here: needs the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE articles (
  id        bigint PRIMARY KEY,
  title     text NOT NULL,
  embedding vector(1536) NOT NULL
);

-- HNSW: build any time, even on an empty table
CREATE INDEX articles_embedding_hnsw
  ON articles USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

SET hnsw.ef_search = 100;            -- per session or per transaction (SET LOCAL)
SELECT id, title, embedding <=> $1 AS distance
FROM articles
ORDER BY embedding <=> $1            -- the indexed operator, ascending
LIMIT 10;

-- IVFFlat alternative: build after loading the data
CREATE INDEX articles_embedding_ivf
  ON articles USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 1000);
SET ivfflat.probes = 32;
~~~

The query shape matters: the index is used for \`ORDER BY embedding <=> $1\` with a \`LIMIT\`. Rewriting it as \`ORDER BY 1 - (embedding <=> $1) DESC\` (similarity, highest first) asks for an expression the index cannot order by. Check with \`EXPLAIN\` that you see an index scan on the vector index.

## 8. HNSW vs IVFFlat

| | HNSW | IVFFlat |
| :--- | :--- | :--- |
| Structure | Layered neighbour graph | k-means lists of rows |
| Training step | None; can be built on an empty table | Needs data at build time; rebuild when data drifts |
| Build time and memory | Slower, more memory | Faster, less memory |
| Speed-recall trade-off | Better | Lower |
| Build-time knobs | \`m\` (16), \`ef_construction\` (64) | \`lists\` |
| Query-time knob | \`hnsw.ef_search\` (40) | \`ivfflat.probes\` |
| Good fit | Default for most semantic search, growing tables | Very large, mostly static data where build time or memory matters most |

The "better trade-off, slower build, more memory" wording is how the README itself sums up the two indexes. Since its arrival in pgvector 0.5.0 (released 2023-08-28) HNSW has become the usual default; pgvector 0.8.0 (2024-10-30) added iterative index scans for filtered queries ([pgvector changelog on PGXN](https://pgxn.org/dist/vector/CHANGELOG.html), [PostgreSQL news: pgvector 0.8.0](https://www.postgresql.org/about/news/pgvector-080-released-2952/)). Later 0.8.x releases followed; check the changelog for the latest one before quoting a version.

## 9. Scale: Worked Numbers

- **Raw size.** 1,000,000 rows x 1,536 dimensions x 4 bytes = 6,144,000,000 bytes, about 6.1 GB (5.7 GiB), before the index. 10M rows is about 61 GB.
- **halfvec.** Storing 2-byte floats halves that to about 3.1 GB per million rows, and indexes on \`halfvec\` accept up to 4,000 dimensions instead of 2,000 for \`vector\` ([fast.io on pgvector limits](https://fast.io/resources/pgvector-max-vector-size/)). Recall loss for cosine search is usually small, but measure it on your data.
- **Build memory.** An HNSW build is fastest when the graph fits in \`maintenance_work_mem\`; set it generously for the session that runs \`CREATE INDEX\`.
- **Measure recall.** Take 100 to 1,000 real queries, run each once with the index and once exact (\`SET enable_indexscan = off\` in a transaction, or a sequential scan on a copy), and compare the top \`k\` ids, exactly like the probes table in section 5.

## 10. Verified: Running the Code

The three SQLite examples ran on sql.js 1.10.2 seeded with the schema above; the plan ran on PostgreSQL 16.15 in a throwaway database with the same schema. pgvector itself was not available, so section 7 was not run.

Exact cosine search:

~~~text
id | title | cosine_distance
4 | Refund a late order | 0.049
3 | Two-factor login setup | 0.0602
2 | Change account email | 0.0937
~~~

IVFFlat simulation, recall by number of probes:

~~~text
probes | rows_scanned | top3_found | recall_at_3
1 | 3 | 1,2,3 | 2/3
2 | 6 | 2,3,4 | 3/3
3 | 10 | 2,3,4 | 3/3
~~~

Greedy graph walk:

~~~text
step | node | title | cosine_distance
0 | 8 | Monthly billing report | 1.7075
1 | 7 | Export invoices to CSV | 1.4999
2 | 10 | Cancel a subscription | 1
3 | 5 | Track a parcel | 0.212
4 | 4 | Refund a late order | 0.049
~~~

PostgreSQL plan with no vector index:

~~~text
QUERY PLAN
Limit (actual rows=3 loops=1)
  ->  Sort (actual rows=3 loops=1)
        Sort Key: (('1'::double precision - (((e1 * '0.643'::double precision) + (e2 * '0.766'::double precision)) / sqrt((((e1 * e1) + (e2 * e2)))::double precision))))
        Sort Method: top-N heapsort  Memory: 25kB
        ->  Seq Scan on docs (actual rows=10 loops=1)
~~~

The L2-versus-cosine comparison in section 3 also ran on sql.js 1.10.2 with the same schema.

## Common Pitfalls

- **Mismatched operator class.** A \`vector_l2_ops\` index does nothing for \`ORDER BY embedding <=> $1\`. Match the operator to the class.
- **Ordering by similarity instead of distance.** \`ORDER BY 1 - (embedding <=> $1) DESC\` reads naturally but cannot use the index. Order by the distance operator ascending and compute similarity in the SELECT list.
- **Building IVFFlat on an empty or tiny table.** The centroids come from whatever data exists at build time. Load first, then build, and rebuild after large changes.
- **Never measuring recall.** Adding an ANN index changes results. Without a recall check you cannot tell whether \`ef_search = 40\` is enough for your data.
- **Forgetting dimensions limits.** A 3,072-dimension model cannot be indexed as \`vector\`; use \`halfvec\` or a smaller model or dimension setting.
- **Filtering after the fact.** \`WHERE\` plus ANN can return fewer than \`LIMIT\` rows; see [filtered vector search](/interview-question/filtered-vector-search-with-pgvector-how-do-you-combine-where-category-x-with-or).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Default choice:</strong> <span style="color:#f0e2c8;">For cosine search in pgvector I would start with <strong style="color:#ffca28;">HNSW</strong>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">USING hnsw (embedding vector_cosine_ops)</code> and query with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY embedding &lt;=&gt; $1 LIMIT k</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why HNSW:</strong> <span style="color:#f0e2c8;">It has the better speed-recall trade-off and needs no training step, so it can be built on an empty table and absorbs inserts. The cost is slower builds and more memory.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. When IVFFlat:</strong> <span style="color:#f0e2c8;">IVFFlat clusters rows into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lists</code> with k-means, so it builds faster and smaller, but it must be built after the data exists and rebuilt when the data drifts. Tune <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ivfflat.probes</code> at query time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Tuning:</strong> <span style="color:#f0e2c8;">Both are approximate. I would measure <strong style="color:#ffca28;">recall@k</strong> against an exact query on a sample, then raise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hnsw.ef_search</code> (default 40) or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">probes</code> until recall meets the target within the latency budget.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Scale:</strong> <span style="color:#f0e2c8;">Check memory first: 1M rows of 1536-dim <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector</code> is about 6.1 GB of raw data, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">halfvec</code> (half the size, index cap 4,000 dims instead of 2,000) or partitioning may be needed.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;=&gt;</code> work with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">vector_cosine_ops</code> but not with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">vector_l2_ops</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An index answers only the distance its operator class was built for. Cosine queries use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=&gt;</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector_cosine_ops</code>, L2 uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;-&gt;</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector_l2_ops</code>, inner product uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;#&gt;</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector_ip_ops</code>. A mismatch means the planner cannot use the index and falls back to a sequential scan.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should you normalize embeddings?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If vectors are unit length, cosine distance equals <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 - dot product</code> and all three metrics rank rows the same way, so you can use the cheaper inner product. Many embedding APIs already return normalized vectors; check rather than assume.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did adding a vector index change the results?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because ANN indexes are approximate: they may miss a true neighbour. In the simulation above one probe returned 2 of the true top 3. That is expected; you tune for the recall you need.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you choose <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lists</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">probes</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The pgvector README suggests <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lists = rows / 1000</code> up to 1M rows and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sqrt(rows)</code> above that, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">probes = sqrt(lists)</code> as a start, so about 1,000 lists and 32 probes for 1M rows. Then measure.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens when you add <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">WHERE category = 'X'</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The index returns its candidate list first and the filter runs after, so you can get fewer than <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code> rows. pgvector 0.8.0 added iterative scans for this; partial indexes and partitioning are the other tools.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Embedding | Vector of numbers representing meaning; similar items point the same way |
| Cosine distance | \`1 - cosine similarity\`; pgvector operator \`<=>\` |
| kNN / exact search | Check every row, return the true closest \`k\` |
| Normalization | Scale a vector to length 1 so cosine, dot product and L2 rank alike |
| Operator class | Which distance an index answers, such as \`vector_cosine_ops\` |
| ANN index | Approximate nearest neighbour index; fast, may miss some true neighbours |
| recall@k | Fraction of the true top \`k\` that the index returned |
| Lists / centroids | IVFFlat clusters built by k-means |
| Probes | Number of IVFFlat lists scanned per query |
| HNSW | Layered neighbour graph searched greedily from the top |
| m / ef_construction / ef_search | HNSW links per node, build candidate list, query candidate list |

**Conclusion:** Cosine search in pgvector means ordering by \`embedding <=> $1\` with a \`vector_cosine_ops\` index, and both index types are approximate: the simulations above showed IVFFlat missing the true best row with one probe and finding it with two, and a greedy graph walk reaching the nearest row in four hops while touching only rows along its path. HNSW is the usual default because it has the better speed-recall trade-off and no training step, at the price of slower builds and more memory; IVFFlat is the cheaper, rebuild-when-data-drifts alternative. Whichever you pick, size the memory, mind the 2,000-dimension cap for \`vector\`, and tune \`ef_search\` or \`probes\` by measuring recall@k against exact search.`,
    examples: [
      {
        label: `Exact cosine search: rank every row by cosine distance to the query (the ground truth)`,
        code: `WITH q AS (SELECT 0.643 AS q1, 0.766 AS q2)
SELECT d.id, d.title,
       ROUND(1 - (d.e1 * q.q1 + d.e2 * q.q2)
             / (sqrt(d.e1 * d.e1 + d.e2 * d.e2) * sqrt(q.q1 * q.q1 + q.q2 * q.q2)), 4)
         AS cosine_distance
FROM docs d, q
ORDER BY cosine_distance, d.id
LIMIT 3;`,
      },
      {
        label: `Simulate IVFFlat: scan only the nearest lists, and measure recall@3 for probes = 1, 2, 3`,
        code: `WITH q AS (SELECT 0.643 AS q1, 0.766 AS q2),
cos AS (
  SELECT d.id,
         1 - (d.e1 * q.q1 + d.e2 * q.q2)
             / (sqrt(d.e1 * d.e1 + d.e2 * d.e2) * sqrt(q.q1 * q.q1 + q.q2 * q.q2)) AS dist
  FROM docs d, q
),
assign AS (  -- index build: each row goes to its nearest centroid (its list)
  SELECT id, list_id FROM (
    SELECT d.id, c.list_id,
           ROW_NUMBER() OVER (PARTITION BY d.id ORDER BY
             (d.e1 * c.c1 + d.e2 * c.c2) / sqrt(d.e1 * d.e1 + d.e2 * d.e2) DESC) AS rn
    FROM docs d, ivf_centroids c) WHERE rn = 1
),
list_rank AS (  -- query time: lists ordered by how close their centroid is to q
  SELECT c.list_id, ROW_NUMBER() OVER (ORDER BY c.c1 * q.q1 + c.c2 * q.q2 DESC) AS r
  FROM ivf_centroids c, q
),
exact AS (SELECT id FROM cos ORDER BY dist LIMIT 3),
probes(n) AS (VALUES (1), (2), (3)),
found AS (
  SELECT p.n, x.id FROM probes p
  JOIN (
    SELECT p2.n, c.id, ROW_NUMBER() OVER (PARTITION BY p2.n ORDER BY c.dist) AS k
    FROM probes p2
    JOIN list_rank lr ON lr.r <= p2.n
    JOIN assign a ON a.list_id = lr.list_id
    JOIN cos c ON c.id = a.id
  ) x ON x.n = p.n AND x.k <= 3
)
SELECT n AS probes,
       (SELECT COUNT(*) FROM assign a JOIN list_rank lr ON lr.list_id = a.list_id WHERE lr.r <= n) AS rows_scanned,
       group_concat(id, ',') AS top3_found,
       (SELECT COUNT(*) FROM found f2 WHERE f2.n = f.n AND f2.id IN (SELECT id FROM exact)) || '/3' AS recall_at_3
FROM (SELECT * FROM found ORDER BY n, id) f
GROUP BY n
ORDER BY n;`,
      },
      {
        label: `Simulate an HNSW layer-0 walk: hop to the closest neighbour until none is closer`,
        code: `WITH RECURSIVE q AS (SELECT 0.643 AS q1, 0.766 AS q2),
dist AS (
  SELECT d.id, d.title,
         ROUND(1 - (d.e1 * q.q1 + d.e2 * q.q2)
               / (sqrt(d.e1 * d.e1 + d.e2 * d.e2) * sqrt(q.q1 * q.q1 + q.q2 * q.q2)), 4) AS d
  FROM docs d, q
),
walk(step, node, d) AS (
  SELECT 0, 8, (SELECT d FROM dist WHERE id = 8)          -- entry point
  UNION ALL
  SELECT w.step + 1, b.id, b.d
  FROM walk w
  JOIN dist b ON b.id = (SELECT e.dst FROM hnsw_edges e JOIN dist x ON x.id = e.dst
                         WHERE e.src = w.node ORDER BY x.d, x.id LIMIT 1)
  WHERE b.d < w.d                                          -- stop when no neighbour is closer
)
SELECT w.step, w.node, dist.title, w.d AS cosine_distance
FROM walk w JOIN dist ON dist.id = w.node
ORDER BY w.step;`,
      },
      {
        label: `PostgreSQL without a vector index: ORDER BY distance LIMIT 3 is a Seq Scan plus a top-N sort`,
        code: `CREATE INDEX docs_e1_e2_idx ON docs (e1, e2);
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id
FROM docs
ORDER BY 1 - (e1 * 0.643 + e2 * 0.766) / sqrt(e1 * e1 + e2 * e2)
LIMIT 3;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
  {
    title: `Filtered vector search with pgvector — how do you combine WHERE category = 'X' with ORDER BY embedding <=> $1?`,
    difficulty: "medium",
    seoDescription: `Why pgvector filtered search can return too few rows, and how exact pre-filtering, iterative scans and partial indexes fix it.`,
    description: `**Question presented to candidate:**
"Our help-centre search runs \`SELECT ... WHERE category = 'billing' ORDER BY embedding <=> $1 LIMIT 3\` on pgvector with an HNSW index. Sometimes it returns one row or none, even though there are plenty of billing articles. Why, and how would you fix it?"

**What a strong answer should cover:**
- Why it happens: the ANN index returns its best candidates first (about \`hnsw.ef_search\`, default 40), and the \`WHERE\` filter runs on those candidates afterwards, so a selective filter can leave fewer than \`LIMIT\` rows
- Exact pre-filtering: a B-tree on \`category\` plus an exact distance sort is correct and fast when the filtered set is small; the planner can choose it by itself
- Iterative index scans (pgvector 0.8.0): \`hnsw.iterative_scan = strict_order\` or \`relaxed_order\` keeps scanning until enough rows pass, bounded by \`hnsw.max_scan_tuples\`
- Structural fixes: a partial HNSW index per hot value (\`WHERE category = 'billing'\`), or list partitioning by category with one index per partition
- Trade-offs by selectivity, and how to check which plan you got with \`EXPLAIN\`

**Clarifying questions expected:**
- How many distinct categories, and what fraction of rows does a typical filter keep?
- Is the filter one fixed column, or arbitrary combinations (tenant plus language plus date)?

**Code / implementation expected:** Yes — show the failing pattern, the exact pre-filter, and the pgvector settings or index that fix it.

**Schema used by the examples:**

\`\`\`sql
CREATE TABLE articles (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  e1 REAL NOT NULL,
  e2 REAL NOT NULL
);
INSERT INTO articles (id, title, category, e1, e2) VALUES
  (1, 'Late delivery compensation', 'shipping', 0.4695, 0.8829),
  (2, 'Where is my parcel', 'shipping', 0.5736, 0.8192),
  (3, 'Courier missed my address', 'shipping', 0.342, 0.9397),
  (4, 'Shipping to a PO box', 'shipping', 0.6691, 0.7431),
  (5, 'Damaged box on arrival', 'shipping', 0.1736, 0.9848),
  (6, 'Change delivery slot', 'shipping', -0.0349, 0.9994),
  (7, 'Update profile photo', 'account', 0.8192, 0.5736),
  (8, 'Close my account', 'account', 0.866, 0.5),
  (9, 'Refund to original card', 'billing', 0.9397, 0.342),
  (10, 'Charged twice for one order', 'billing', -0.342, 0.9397),
  (11, 'Download a VAT invoice', 'billing', -0.866, 0.5),
  (12, 'Change billing address', 'billing', -0.9397, -0.342);
\`\`\``,
    answer: `**Target Audience:** Developers running semantic search on PostgreSQL with pgvector, and candidates preparing for backend interviews
**Difficulty:** Medium
**Engines:** PostgreSQL with pgvector. pgvector is not installed on the verification machine, so the behaviour is shown with plain-SQL simulations that ran on sql.js 1.10.2 (SQLite) and a PostgreSQL 16.15 plan; pgvector SQL is marked "not run here" and its settings are cited from the [pgvector README](https://github.com/pgvector/pgvector).

> **How to read this doc:** Every new term is explained in plain words first. When it is a term interviewers expect you to know, it is tagged \`📌 Interview term:\` so you can learn the vocabulary too.

This page is the applied follow-up to [HNSW vs IVFFlat](/interview-question/pgvector-cosine-similarity-index-in-2025-26-hnsw-vs-ivfflat-for-semantic-search-), which explains embeddings, cosine distance and how the two index types work. Here the question is what happens when a vector search also has a \`WHERE\` clause.

## 1. Why This Even Matters — A Story First

You ask a shop assistant for "the three shoes most like this one, but only in red". The assistant grabs the 40 most similar shoes from the stock room, walks back, and only then looks at the colour. None of the 40 is red. "Sorry, nothing." There were red shoes in the back the whole time; they just were not among the first 40 similar ones.

That is filtered vector search with an approximate index. The fix is either to look only at red shoes from the start, or to keep going back to the stock room until three red ones turn up.

## 2. The Correct Result, Computed Exactly

The sample \`articles\` table has 12 help articles in three categories. The vectors are already **normalized** (length 1), so cosine distance is simply \`1 - dot product\`. The query vector \`(0.5, 0.866)\` is a question about delivery, but the user is on the billing page, so we want the 3 closest **billing** articles:

~~~sql
-- vectors are unit length, so cosine distance = 1 - dot product
SELECT id, title,
       ROUND(1 - (e1 * 0.5 + e2 * 0.866), 4) AS cosine_distance
FROM articles
WHERE category = 'billing'
ORDER BY cosine_distance, id
LIMIT 3;
~~~

~~~text
id | title | cosine_distance
9 | Refund to original card | 0.234
10 | Charged twice for one order | 0.3572
11 | Download a VAT invoice | 1
~~~

That is the answer every strategy below should reproduce. (Portability note: this exact query fails on PostgreSQL 16 with \`function round(double precision, integer) does not exist\`, because PostgreSQL only has a two-argument \`round\` for \`numeric\`; cast with \`::numeric\` there.)

📌 **Interview term: filtered vector search** — a nearest-neighbour query restricted by ordinary conditions, such as \`WHERE category = 'billing' ORDER BY embedding <=> $1 LIMIT 3\`.

## 3. Why the Index Version Returns Too Few Rows

An approximate index (HNSW or IVFFlat) does not know about \`category\`. It walks its own structure and hands back its best candidates in distance order, about \`hnsw.ef_search\` of them (40 by default in pgvector). PostgreSQL then applies the \`WHERE\` filter to those candidates and stops at \`LIMIT\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="Post-filtering: the vector index returns its top candidates from all categories, then the category filter removes them, leaving fewer rows than the limit">
  <defs>
    <marker id="sql17q3-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="80" width="190" height="80" rx="8"/>
  <text class="d-text" x="115" y="112" text-anchor="middle">HNSW index</text>
  <text class="d-sub" x="115" y="136" text-anchor="middle">all categories</text>
  <rect class="d-box-muted" x="280" y="80" width="190" height="80" rx="8"/>
  <text class="d-text" x="375" y="112" text-anchor="middle">top candidates</text>
  <text class="d-sub" x="375" y="136" text-anchor="middle">ef_search of them</text>
  <rect class="d-box-accent" x="540" y="80" width="190" height="80" rx="8"/>
  <text class="d-text" x="635" y="112" text-anchor="middle">WHERE filter</text>
  <text class="d-sub" x="635" y="136" text-anchor="middle">may keep 0 rows</text>
  <path class="d-edge" d="M 212 120 L 274 120" marker-end="url(#sql17q3-a)"/>
  <path class="d-edge-accent" d="M 472 120 L 534 120" marker-end="url(#sql17q3-a)"/>
</svg>

The filter only ever sees the candidates the index chose, so if the closest rows belong to other categories, the matching rows never reach it.

📌 **Interview term: post-filtering** — applying the \`WHERE\` condition after the vector index has picked its candidates. Fast, but it can return fewer than \`LIMIT\` rows.

📌 **Interview term: pre-filtering** — narrowing to the matching rows first and ranking only those. Always returns the right rows, but the ranking is exact (no ANN index), so it is only cheap when the matching set is small.

Here is that failure on the sample, with the index candidate list shrunk to 4 so the effect fits in 12 rows:

~~~sql
WITH candidates AS (          -- what an ANN index hands back: its best 4 overall
  SELECT id, category, 1 - (e1 * 0.5 + e2 * 0.866) AS dist
  FROM articles
  ORDER BY dist, id
  LIMIT 4
)
SELECT COUNT(*) AS candidates_from_index,
       SUM(CASE WHEN category = 'billing' THEN 1 ELSE 0 END) AS rows_left_after_filter,
       3 AS rows_requested
FROM candidates;
~~~

~~~text
candidates_from_index | rows_left_after_filter | rows_requested
4 | 0 | 3
~~~

All four nearest articles are about shipping. After the filter nothing is left, although the table holds four billing articles. On a real table the arithmetic is the same: with \`ef_search = 40\` and a filter that keeps 5% of rows, you would expect about 2 matches among the candidates (40 x 0.05), not 10.

## 4. Fix 1: Exact Pre-Filter With a B-Tree

If a filter keeps only a few thousand rows, ranking them exactly is cheap and always correct. A normal B-tree index on \`category\` finds them, and a sort orders them by distance. PostgreSQL 16 plan on the sample (\`enable_seqscan\` is off only because 12 rows would otherwise be scanned sequentially; on a big table the planner reaches this plan by itself when the filter is selective):

~~~sql
CREATE INDEX articles_category_idx ON articles (category);
ANALYZE articles;
SET enable_seqscan = off;
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id
FROM articles
WHERE category = 'billing'
ORDER BY 1 - (e1 * 0.5 + e2 * 0.866)
LIMIT 3;
~~~

~~~text
QUERY PLAN
Limit (actual rows=3 loops=1)
  ->  Sort (actual rows=3 loops=1)
        Sort Key: (('1'::double precision - ((e1 * '0.5'::double precision) + (e2 * '0.866'::double precision))))
        Sort Method: quicksort  Memory: 25kB
        ->  Index Scan using articles_category_idx on articles (actual rows=4 loops=1)
              Index Cond: (category = 'billing'::text)
~~~

The index scan returned the 4 billing rows, the sort kept the best 3. This is also what pgvector does when the planner decides a B-tree on the filter column is cheaper than the vector index, so "add a B-tree on the filter column" is part of the standard advice in the [pgvector README](https://github.com/pgvector/pgvector) for filtering. The planner may pick another plan on other data. Index basics are in [What is an index and how does it speed up queries?](/interview-question/what-is-an-index-and-how-does-it-speed-up-queries).

## 5. Fix 2: Iterative Index Scans (pgvector 0.8.0+)

pgvector 0.8.0 (released 2024-10-30) added **iterative index scans**: when too few candidates pass the filter, the scan fetches more from the index, and repeats until \`LIMIT\` is satisfied or a budget is used up ([PostgreSQL news: pgvector 0.8.0](https://www.postgresql.org/about/news/pgvector-080-released-2952/)).

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="Iterative scan: fetch a batch of candidates, filter, and if fewer than the limit pass, fetch the next batch until enough rows pass or the scan budget runs out">
  <defs>
    <marker id="sql17q3-b" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="40" width="200" height="70" rx="8"/>
  <text class="d-text" x="130" y="70" text-anchor="middle">next batch</text>
  <text class="d-sub" x="130" y="94" text-anchor="middle">from the index</text>
  <rect class="d-box-muted" x="290" y="40" width="180" height="70" rx="8"/>
  <text class="d-text" x="380" y="70" text-anchor="middle">apply WHERE</text>
  <text class="d-sub" x="380" y="94" text-anchor="middle">count the matches</text>
  <rect class="d-box-accent" x="530" y="40" width="200" height="70" rx="8"/>
  <text class="d-text" x="630" y="70" text-anchor="middle">LIMIT reached</text>
  <text class="d-sub" x="630" y="94" text-anchor="middle">return rows</text>
  <rect class="d-box" x="290" y="200" width="180" height="70" rx="8"/>
  <text class="d-text" x="380" y="230" text-anchor="middle">too few rows</text>
  <text class="d-sub" x="380" y="254" text-anchor="middle">budget left</text>
  <path class="d-edge" d="M 232 75 L 284 75" marker-end="url(#sql17q3-b)"/>
  <path class="d-edge-accent" d="M 472 75 L 524 75" marker-end="url(#sql17q3-b)"/>
  <path class="d-edge" d="M 380 114 L 380 194" marker-end="url(#sql17q3-b)"/>
  <path class="d-edge-dashed" d="M 286 235 L 130 235 L 130 116" marker-end="url(#sql17q3-b)"/>
</svg>

When a batch leaves too few rows and there is scan budget left, the loop goes back for the next batch; when the budget runs out it returns what it has.

The simulation walks the full index order and counts billing matches as it goes, to show how far the scan has to travel on this data:

~~~sql
WITH ranked AS (              -- the index order: nearest first, all categories
  SELECT id, title, category,
         ROUND(1 - (e1 * 0.5 + e2 * 0.866), 4) AS dist,
         ROW_NUMBER() OVER (ORDER BY 1 - (e1 * 0.5 + e2 * 0.866), id) AS visited
  FROM articles
),
counted AS (
  SELECT *, SUM(CASE WHEN category = 'billing' THEN 1 ELSE 0 END)
              OVER (ORDER BY visited) AS matches_so_far
  FROM ranked
)
SELECT visited, id, category, dist, matches_so_far
FROM counted
WHERE visited <= (SELECT MIN(visited) FROM counted WHERE matches_so_far = 3)
ORDER BY visited;
~~~

~~~text
visited | id | category | dist | matches_so_far
1 | 1 | shipping | 0.0007 | 0
2 | 2 | shipping | 0.0038 | 0
3 | 3 | shipping | 0.0152 | 0
4 | 4 | shipping | 0.0219 | 0
5 | 5 | shipping | 0.0604 | 0
6 | 7 | account | 0.0937 | 0
7 | 8 | account | 0.134 | 0
8 | 6 | shipping | 0.152 | 0
9 | 9 | billing | 0.234 | 1
10 | 10 | billing | 0.3572 | 2
11 | 11 | billing | 1 | 3
~~~

It had to visit 11 of 12 rows to find 3 billing articles, because the query vector sits in the middle of the shipping cluster. On a real table that is exactly the cost iterative scans pay, and why they have a cap.

📌 **Interview term: iterative index scan** — pgvector 0.8.0 feature that keeps pulling candidates from an HNSW or IVFFlat index until enough rows pass the filter.

The settings (not run here, pgvector is not installed on the verification machine):

~~~sql
-- not run here: needs pgvector 0.8.0 or later
SET hnsw.iterative_scan = strict_order;   -- off (default), strict_order, relaxed_order
SET hnsw.max_scan_tuples = 20000;         -- budget of rows visited (20,000 is the default)
SELECT id, title
FROM articles
WHERE category = 'billing'
ORDER BY embedding <=> $1
LIMIT 3;

-- relaxed_order is faster but may return rows slightly out of order: re-sort outside
SET hnsw.iterative_scan = relaxed_order;
WITH nearest AS MATERIALIZED (
  SELECT id, title, embedding <=> $1 AS distance
  FROM articles
  WHERE category = 'billing'
  ORDER BY distance
  LIMIT 3
)
SELECT * FROM nearest ORDER BY distance;

-- IVFFlat has the same idea: ivfflat.iterative_scan and ivfflat.max_probes
~~~

📌 **Interview term: strict_order / relaxed_order** — the two iterative scan modes: exact distance order, or approximate order for more speed and recall.

📌 **Interview term: max_scan_tuples** — the HNSW iterative scan budget; when it is reached the query returns what it has, which can still be fewer than \`LIMIT\`.

## 6. Fix 3: Partial Indexes and Partitioning

When a few category values are large and fixed, give each its own vector index, so its candidates are all in the category:

~~~sql
-- not run here: needs pgvector
CREATE INDEX articles_billing_hnsw
  ON articles USING hnsw (embedding vector_cosine_ops)
  WHERE category = 'billing';
~~~

The query must contain the same condition (\`WHERE category = 'billing'\`) so the planner can prove the index applies; a generic prepared plan with \`category = $2\` cannot use it. That rule is PostgreSQL planner behaviour, not pgvector: checked on PostgreSQL 16.15 with a B-tree partial index \`ON articles (e1) WHERE category = 'billing'\`, the literal query used \`Index Scan using articles_billing_part\`, while the same query prepared with \`$1\` under \`plan_cache_mode = force_generic_plan\` fell back to \`Seq Scan on articles\` with \`Filter: (category = $1)\`.

📌 **Interview term: partial index** — an index over only the rows matching a \`WHERE\` predicate. Smaller, and every entry already satisfies the filter.

For many values, **list partitioning** by category (or hash partitioning by tenant) gives every partition its own HNSW index, and partition pruning sends the query to one of them. That is a schema decision; weigh it with the rest of your partitioning needs.

📌 **Interview term: partition pruning** — the planner skipping partitions that cannot contain matching rows.

## 7. Choosing a Strategy

| Filter keeps | Best approach | Why |
| :--- | :--- | :--- |
| A small set (say a few thousand rows) | Exact pre-filter: B-tree on the filter column, exact distance sort | Correct and cheap; no recall loss |
| A large share (say over 10%) | Plain ANN index with post-filter, maybe a larger \`ef_search\` | Enough candidates usually pass |
| Something in between | Iterative scans (0.8.0+), \`strict_order\` or \`relaxed_order\` | Keeps scanning until \`LIMIT\` is met, within a budget |
| A few big fixed values | Partial HNSW index per value | Every candidate already matches |
| Many tenants or categories | Partitioning, one index per partition | Each search runs on a smaller, focused index |

The thresholds in the first column are rules of thumb, not measured limits; run \`EXPLAIN (ANALYZE)\` and a recall check on your own data.

## 8. Verified: Running the Code

The three SQLite examples ran on sql.js 1.10.2 seeded with the schema above; the plan ran on PostgreSQL 16.15 in a throwaway database with the same schema. pgvector is not available on the verification machine, so the pgvector blocks in sections 5 and 6 were not run.

Exact filtered result:

~~~text
id | title | cosine_distance
9 | Refund to original card | 0.234
10 | Charged twice for one order | 0.3572
11 | Download a VAT invoice | 1
~~~

Post-filter simulation:

~~~text
candidates_from_index | rows_left_after_filter | rows_requested
4 | 0 | 3
~~~

How far an iterative scan has to walk:

~~~text
visited | id | category | dist | matches_so_far
1 | 1 | shipping | 0.0007 | 0
2 | 2 | shipping | 0.0038 | 0
3 | 3 | shipping | 0.0152 | 0
4 | 4 | shipping | 0.0219 | 0
5 | 5 | shipping | 0.0604 | 0
6 | 7 | account | 0.0937 | 0
7 | 8 | account | 0.134 | 0
8 | 6 | shipping | 0.152 | 0
9 | 9 | billing | 0.234 | 1
10 | 10 | billing | 0.3572 | 2
11 | 11 | billing | 1 | 3
~~~

PostgreSQL plan with a B-tree on \`category\`:

~~~text
QUERY PLAN
Limit (actual rows=3 loops=1)
  ->  Sort (actual rows=3 loops=1)
        Sort Key: (('1'::double precision - ((e1 * '0.5'::double precision) + (e2 * '0.866'::double precision))))
        Sort Method: quicksort  Memory: 25kB
        ->  Index Scan using articles_category_idx on articles (actual rows=4 loops=1)
              Index Cond: (category = 'billing'::text)
~~~

The \`round(double precision, integer)\` error in section 2 came from running the first query on the same PostgreSQL 16.15 database.

## Common Pitfalls

- **Testing without the filter.** Recall measured on unfiltered queries says nothing about filtered ones; measure recall@k for the actual \`WHERE\` clauses users send.
- **Trusting \`LIMIT\`.** With post-filtering, \`LIMIT 10\` means "at most 10". Code that assumes it always gets 10 rows will show half-empty result pages.
- **Turning on \`relaxed_order\` and forgetting to re-sort.** Rows may come back slightly out of order; re-sort in an outer query over a \`MATERIALIZED\` CTE.
- **Parameterizing the partial-index predicate.** \`WHERE category = $2\` in a generic plan cannot match \`WHERE category = 'billing'\` in the index definition.
- **No B-tree on the filter column.** Without it the planner has no cheap pre-filter option and must use the vector index, post-filter and all.
- **Huge \`max_scan_tuples\`.** Raising the budget without limit can turn one rare-category query into a scan of the whole index.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Root cause:</strong> <span style="color:#f0e2c8;">An HNSW or IVFFlat scan returns its best candidates first, around <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hnsw.ef_search</code> of them (default 40), and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code> runs afterwards. If few of those candidates are in the category, you get fewer rows than <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LIMIT</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Selective filter:</strong> <span style="color:#f0e2c8;">If the filter keeps a small set, skip the ANN index: a B-tree on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">category</code> plus an exact distance sort is correct and cheap. The planner may choose it by itself; check with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXPLAIN</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Iterative scans:</strong> <span style="color:#f0e2c8;">On pgvector 0.8.0+ set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hnsw.iterative_scan = strict_order</code> (or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">relaxed_order</code> for more speed) so the scan keeps going until enough rows pass, capped by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hnsw.max_scan_tuples</code> (default 20,000).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Hot values:</strong> <span style="color:#f0e2c8;">For a few big, fixed values use a <strong style="color:#ffca28;">partial index</strong> (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">... USING hnsw (...) WHERE category = 'billing'</code>) or list-partition by category so each partition has its own index.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Trade-off:</strong> <span style="color:#f0e2c8;">Choose by selectivity: exact pre-filter for small sets, plain ANN for broad filters, iterative scans in between, and measure recall@k for the filtered query, not just the unfiltered one.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just raise <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">LIMIT</code> to 100 and filter in the application?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It helps but has no guarantee: if the category holds 1% of the rows, 100 candidates contain about one match on average. It also moves work to the app. Iterative scans or an exact pre-filter fix the cause.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">strict_order</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">relaxed_order</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strict_order</code> returns rows in exact distance order. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">relaxed_order</code> allows slightly out-of-order results for speed, so wrap the query in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MATERIALIZED</code> CTE and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORDER BY</code> the distance again outside.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a partial index get used automatically?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only when the query <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code> clause implies the index predicate, so the query must say <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">category = 'billing'</code> literally, not through a parameter the planner cannot see at plan time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the filter is a tenant id with thousands of tenants?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">One partial index per tenant does not scale. Use exact search per tenant if tenants are small, hash or list partitioning for big ones, and iterative scans for the rest.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know which strategy the planner picked?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXPLAIN (ANALYZE)</code> on a realistic query: an index scan on the HNSW index means ANN plus post-filter, an index scan or bitmap scan on the category B-tree followed by a Sort means exact pre-filter.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Filtered vector search | Nearest-neighbour search restricted by ordinary \`WHERE\` conditions |
| Post-filtering | Filter applied after the vector index picks candidates; may return too few rows |
| Pre-filtering | Narrow to matching rows first, then rank them exactly |
| Iterative index scan | pgvector 0.8.0+: keep fetching candidates until \`LIMIT\` is met or the budget runs out |
| strict_order / relaxed_order | Iterative scan modes: exact order, or faster approximate order |
| max_scan_tuples | Budget of rows an HNSW iterative scan may visit (default 20,000) |
| Partial index | Index over only rows matching a predicate |
| Partition pruning | Planner skips partitions that cannot match |

**Conclusion:** \`WHERE category = 'X' ORDER BY embedding <=> $1 LIMIT k\` goes wrong because the approximate index picks its candidates without knowing about the filter, and the filter runs afterwards: in the simulation the index top 4 were all shipping articles, so the billing query got nothing, while the exact query returned rows 9, 10 and 11. Fix it by matching the strategy to how selective the filter is: an exact pre-filter with a B-tree for small sets (the PostgreSQL plan above filters first and sorts four rows), iterative scans from pgvector 0.8.0 for the middle ground, and partial indexes or partitions for a few big, fixed values, and then measure recall on the filtered queries themselves.`,
    examples: [
      {
        label: `The right answer: filter first, then rank the billing rows by exact cosine distance`,
        code: `-- vectors are unit length, so cosine distance = 1 - dot product
SELECT id, title,
       ROUND(1 - (e1 * 0.5 + e2 * 0.866), 4) AS cosine_distance
FROM articles
WHERE category = 'billing'
ORDER BY cosine_distance, id
LIMIT 3;`,
      },
      {
        label: `The bug, simulated: take the index top 4 over all categories, then filter, and nothing is left`,
        code: `WITH candidates AS (          -- what an ANN index hands back: its best 4 overall
  SELECT id, category, 1 - (e1 * 0.5 + e2 * 0.866) AS dist
  FROM articles
  ORDER BY dist, id
  LIMIT 4
)
SELECT COUNT(*) AS candidates_from_index,
       SUM(CASE WHEN category = 'billing' THEN 1 ELSE 0 END) AS rows_left_after_filter,
       3 AS rows_requested
FROM candidates;`,
      },
      {
        label: `What an iterative scan has to do: keep walking the index order until 3 billing rows have passed`,
        code: `WITH ranked AS (              -- the index order: nearest first, all categories
  SELECT id, title, category,
         ROUND(1 - (e1 * 0.5 + e2 * 0.866), 4) AS dist,
         ROW_NUMBER() OVER (ORDER BY 1 - (e1 * 0.5 + e2 * 0.866), id) AS visited
  FROM articles
),
counted AS (
  SELECT *, SUM(CASE WHEN category = 'billing' THEN 1 ELSE 0 END)
              OVER (ORDER BY visited) AS matches_so_far
  FROM ranked
)
SELECT visited, id, category, dist, matches_so_far
FROM counted
WHERE visited <= (SELECT MIN(visited) FROM counted WHERE matches_so_far = 3)
ORDER BY visited;`,
      },
      {
        label: `PostgreSQL: with a B-tree on category the plan filters first and sorts only the matching rows`,
        code: `CREATE INDEX articles_category_idx ON articles (category);
ANALYZE articles;
SET enable_seqscan = off;
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT id
FROM articles
WHERE category = 'billing'
ORDER BY 1 - (e1 * 0.5 + e2 * 0.866)
LIMIT 3;`,
        runnable: false,
        dialect: "postgres",
      },
    ],
  },
];

export default augments;
