/**
 * "Review the AI's code" challenge bank, part 2: Python + SQL.
 *
 * IMPORTANT: finding `lines` anchors are 1-based line numbers into `code`
 * exactly as written. Run `npx tsx prisma/seed-review-challenges.ts --lint`
 * after any edit to eyeball the anchors.
 */
import type { CuratedReviewChallenge } from "./review-challenges.types";

export const REVIEW_CHALLENGES_2: CuratedReviewChallenge[] = [
  // ────────────────────────────────────────────────────────────────────────
  // Python
  // ────────────────────────────────────────────────────────────────────────
  {
    slug: "py-word-count",
    title: "Count word frequencies",
    prompt:
      "Write count_words(path) that reads a text file and returns a dict of word -> frequency, case-insensitive, ignoring punctuation. Return the top N words too.",
    language: "python",
    difficulty: "beginner",
    estimatedMinutes: 7,
    code: `import re

def count_words(path, top_n=10):
    counts = {}
    f = open(path)
    text = f.read().lower()
    words = re.split(r"\\W+", text)
    for word in words:
        counts[word] += 1
    top = sorted(counts.items(), key=lambda x: x[1])[:top_n]
    return counts, top

def merge_counts(a, b=[]):
    for word, n in b:
        a[word] = a.get(word, 0) + n
    return a`,
    findings: [
      {
        lines: [5, 6],
        category: "edge-case",
        title: "File handle is never closed",
        explanation:
          "open() without a `with` block (or an explicit close) leaks the file descriptor — and if read() raises, it's never released. Use `with open(path) as f: text = f.read().lower()`, which also closes on exception.",
      },
      {
        lines: [8, 9],
        category: "logic-bug",
        title: "KeyError: counts[word] += 1 on an unseen word",
        explanation:
          "counts starts empty, so the first time each word appears `counts[word]` raises KeyError. Use `counts[word] = counts.get(word, 0) + 1`, or a collections.Counter / defaultdict(int). Also note re.split(r'\\W+', ...) yields an empty string for leading punctuation — filter falsy tokens.",
      },
      {
        lines: [10, 10],
        category: "logic-bug",
        title: "Top-N sorts ascending, returning the rarest words",
        explanation:
          "sorted(..., key=count) is ascending, so [:top_n] takes the *least* frequent words — the opposite of 'top'. Add reverse=True (or negate the key: `key=lambda x: -x[1]`).",
      },
      {
        lines: [13, 13],
        category: "logic-bug",
        title: "Mutable default argument",
        explanation:
          "`b=[]` is evaluated once at definition time and shared across all calls that omit it. Here it's only read, but it's the canonical Python footgun and will bite the moment someone appends to it. Default to None and create the list inside: `if b is None: b = []`.",
      },
    ],
  },
  {
    slug: "py-user-repo",
    title: "SQLite user repository",
    prompt:
      "Write a small repository around sqlite3: create_user(name, email) and find_by_email(email). Emails are unique.",
    language: "python",
    difficulty: "intermediate",
    estimatedMinutes: 8,
    code: `import sqlite3

conn = sqlite3.connect("app.db")

def create_user(name, email):
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO users (name, email) VALUES ('%s', '%s')" % (name, email)
    )
    return cur.lastrowid

def find_by_email(email):
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE email = ?", email)
    return cur.fetchone()

def email_exists(email):
    return find_by_email(email) is not None`,
    findings: [
      {
        lines: [8, 8],
        category: "security",
        title: "SQL injection via %-formatting",
        explanation:
          "Building the INSERT with `% (name, email)` interpolates raw user input into SQL — an email like `x','y'); DROP TABLE users;--` executes. Use parameter substitution: `cur.execute(\"INSERT INTO users (name, email) VALUES (?, ?)\", (name, email))`.",
      },
      {
        lines: [10, 10],
        category: "logic-bug",
        title: "Write is never committed",
        explanation:
          "sqlite3 opens a transaction implicitly and needs conn.commit() to persist — without it the INSERT is rolled back when the connection closes, so create_user appears to work (returns a lastrowid) but the row vanishes. Commit after the insert.",
      },
      {
        lines: [14, 14],
        category: "logic-bug",
        title: "Query parameters must be a sequence",
        explanation:
          "`execute(sql, email)` passes a bare string; sqlite3 iterates it and binds one parameter per character, raising `Incorrect number of bindings`. Parameters must be a tuple/list: `cur.execute(sql, (email,))`. (Note the trailing comma — `(email)` is just `email`.)",
      },
      {
        lines: [3, 3],
        category: "edge-case",
        title: "One module-level connection shared across threads",
        explanation:
          "A single global connection created at import is not safe to share across threads/requests (sqlite3 raises 'objects created in a thread can only be used in that same thread'), and it's opened once with no way to close it cleanly. Open a connection per operation (or use a connection pool / per-thread factory).",
      },
    ],
  },
  {
    slug: "py-flask-avatar",
    title: "Flask avatar upload",
    prompt:
      "Flask endpoint POST /avatar: accept an uploaded image and save it under ./avatars using the uploaded filename.",
    language: "python",
    difficulty: "advanced",
    estimatedMinutes: 8,
    code: `import os
from flask import Flask, request

app = Flask(__name__)
UPLOAD_DIR = "./avatars"

@app.route("/avatar", methods=["POST"])
def upload_avatar():
    file = request.files["avatar"]
    dest = os.path.join(UPLOAD_DIR, file.filename)
    file.save(dest)
    return {"path": dest}, 200

if __name__ == "__main__":
    app.run(debug=True)`,
    findings: [
      {
        lines: [9, 9],
        category: "edge-case",
        title: "Missing 'avatar' key raises a 400 as an unhandled 500",
        explanation:
          "request.files[\"avatar\"] raises a KeyError (surfacing as a 500) when the field is absent or the request isn't multipart. Use request.files.get(\"avatar\") and return a clean 400 when it's missing or empty.",
      },
      {
        lines: [10, 10],
        category: "security",
        title: "Path traversal / overwrite via unsanitized filename",
        explanation:
          "file.filename is fully attacker-controlled — `../../etc/cron.d/x` or an absolute path escapes UPLOAD_DIR, and a fixed name lets one user overwrite another's file. Sanitize with werkzeug.utils.secure_filename and, better, store under a server-generated random name.",
      },
      {
        lines: [11, 11],
        category: "security",
        title: "No file-type or size validation",
        explanation:
          "Anything is accepted and saved — a .php/.html/.svg payload becomes stored XSS or RCE depending on how avatars are later served, and there's no size cap (trivial disk-fill DoS). Validate the content type/extension against an allowlist and enforce MAX_CONTENT_LENGTH.",
      },
      {
        lines: [15, 15],
        category: "security",
        title: "debug=True in the runnable entrypoint",
        explanation:
          "Flask's debug mode exposes the Werkzeug interactive debugger, which allows arbitrary code execution via the console PIN, and auto-reloads on source changes. It must never be enabled where the code could run in production; gate it behind an env flag.",
      },
    ],
  },
  {
    slug: "py-avg-scores",
    title: "Average scores per student",
    prompt:
      "Given a list of (student, score) tuples, return each student's average score as a dict.",
    language: "python",
    difficulty: "beginner",
    estimatedMinutes: 6,
    code: `def average_scores(records):
    totals = {}
    counts = {}
    for student, score in records:
        totals[student] = totals.get(student, 0) + score
        counts[student] = counts.get(student, 0) + 1

    averages = {}
    for student in totals:
        averages[student] = totals[student] / counts[student]
    return averages

def passed(records, threshold=60):
    avgs = average_scores(records)
    return [s for s in avgs if avgs[s] > threshold]

def top_student(records):
    avgs = average_scores(records)
    return max(avgs, key=avgs.get)`,
    findings: [
      {
        lines: [4, 4],
        category: "edge-case",
        title: "Unpacking assumes exactly two elements per record",
        explanation:
          "`for student, score in records` raises ValueError if any record has a different arity (e.g. a 3-tuple with a timestamp, or a malformed row). Validate the shape, or unpack defensively, before trusting the input.",
      },
      {
        lines: [10, 10],
        category: "edge-case",
        title: "Integer vs float division is data-dependent",
        explanation:
          "This is fine in Python 3 (/ is always float), but note averages aren't rounded — 3 scores of 70/80/90 give 80.0 while 70/80/85 give 78.333333333333. Decide on rounding for display, and beware the same code under Python 2 would do integer division (a common porting bug the model may have carried over).",
        points: 5,
      },
      {
        lines: [15, 15],
        category: "logic-bug",
        title: "Boundary excluded: '> threshold' drops exact passes",
        explanation:
          "A student who averages exactly the passing threshold (60) is considered failing. 'passed' almost always means >= the cutoff. Use `>= threshold` unless the spec truly means strictly greater.",
      },
      {
        lines: [19, 19],
        category: "edge-case",
        title: "max() on empty input raises ValueError",
        explanation:
          "top_student([]) calls max on an empty dict → `ValueError: max() arg is an empty sequence`. Return None (or raise a domain-specific error) when there are no records.",
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  // SQL
  // ────────────────────────────────────────────────────────────────────────
  {
    slug: "sql-top-customers",
    title: "Top customers by spend",
    prompt:
      "Postgres: list each customer's name and total spend from completed orders in 2024, highest first, top 10.",
    language: "sql",
    difficulty: "intermediate",
    estimatedMinutes: 7,
    code: `SELECT
  c.name,
  SUM(o.amount) AS total_spend
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.status = 'completed'
  AND YEAR(o.created_at) = 2024
GROUP BY c.id
ORDER BY total_spend
LIMIT 10;`,
    findings: [
      {
        lines: [5, 6],
        category: "logic-bug",
        title: "WHERE on the LEFT JOIN turns it into an INNER JOIN",
        explanation:
          "Filtering `o.status` in WHERE discards the NULL-extended rows for customers with no orders, so the LEFT JOIN behaves exactly like an INNER JOIN. If customers with zero completed 2024 orders should appear (with 0), move the order predicates into the ON clause and COALESCE the sum.",
      },
      {
        lines: [7, 7],
        category: "hallucinated-api",
        title: "YEAR() is not a Postgres function",
        explanation:
          "YEAR() is MySQL/SQL-Server syntax — Postgres raises `function year(timestamp) does not exist`. Use EXTRACT(YEAR FROM o.created_at) = 2024, or better a sargable range (`created_at >= '2024-01-01' AND created_at < '2025-01-01'`) so an index can be used.",
      },
      {
        lines: [9, 9],
        category: "logic-bug",
        title: "ORDER BY is ascending — this returns the lowest spenders",
        explanation:
          "The prompt asked for highest first, but ORDER BY total_spend defaults to ASC, so LIMIT 10 returns the ten *smallest* totals. Add DESC.",
      },
      {
        lines: [2, 8],
        category: "edge-case",
        title: "GROUP BY c.id but SELECT c.name",
        explanation:
          "Grouping by c.id while selecting c.name is only accepted because id is the primary key (Postgres functional dependency); on databases without that inference, or if you group by a non-key, this errors. Safest is to GROUP BY c.id, c.name. Two customers with the same name are also correctly kept separate only because the grouping key is id — worth stating explicitly.",
        points: 5,
      },
    ],
  },
  {
    slug: "sql-inventory-update",
    title: "Decrement stock on purchase",
    prompt:
      "Write SQL to decrement product stock when an item is purchased, and a query to find products that need reordering (stock below reorder_level).",
    language: "sql",
    difficulty: "intermediate",
    estimatedMinutes: 7,
    code: `-- Decrement stock for a purchased product
UPDATE products
SET stock = stock - 1;

-- Products that need reordering
SELECT name, stock, reorder_level
FROM products
WHERE stock < reorder_level
  OR reorder_level = NULL;

-- Recently restocked (last 7 days)
SELECT name
FROM products
WHERE restocked_at > NOW() - 7;`,
    findings: [
      {
        lines: [2, 3],
        category: "logic-bug",
        title: "UPDATE with no WHERE decrements every product",
        explanation:
          "This drops stock by 1 for the entire products table on every purchase, not the one item bought. It needs `WHERE id = :product_id`. It should also guard against going negative (`AND stock > 0`) and ideally happen atomically with the order insert in a transaction.",
      },
      {
        lines: [9, 9],
        category: "logic-bug",
        title: "= NULL never matches",
        explanation:
          "In SQL, `reorder_level = NULL` is never true (comparison with NULL yields UNKNOWN) — products with a NULL reorder level are silently excluded. Use `reorder_level IS NULL`.",
      },
      {
        lines: [8, 8],
        category: "edge-case",
        title: "NULL stock or reorder_level is dropped by the comparison",
        explanation:
          "If either column can be NULL, `stock < reorder_level` evaluates to UNKNOWN and the row is filtered out — a product with unknown stock won't be flagged for reorder. Decide the intended behavior with COALESCE or explicit IS NULL handling.",
        points: 5,
      },
      {
        lines: [14, 14],
        category: "logic-bug",
        title: "NOW() - 7 doesn't subtract 7 days",
        explanation:
          "In Postgres you can't subtract a bare integer from a timestamp — this raises `operator does not exist: timestamp - integer`. Use an interval: `NOW() - INTERVAL '7 days'`.",
      },
    ],
  },
  {
    slug: "sql-user-search",
    title: "User search stored function",
    prompt:
      "Postgres function search_users(term) that returns users whose name or email matches a search term, case-insensitive.",
    language: "sql",
    difficulty: "advanced",
    estimatedMinutes: 8,
    code: `CREATE FUNCTION search_users(term TEXT)
RETURNS SETOF users AS $$
BEGIN
  RETURN QUERY EXECUTE
    'SELECT * FROM users WHERE name ILIKE ''%' || term || '%''
       OR email ILIKE ''%' || term || '%''';
END;
$$ LANGUAGE plpgsql;

-- Called from the app like:
--   SELECT * FROM search_users(:q);`,
    findings: [
      {
        lines: [4, 6],
        category: "security",
        title: "SQL injection inside a dynamic-SQL function",
        explanation:
          "term is concatenated straight into an EXECUTE string, so a term like `%'' UNION SELECT ... --` runs attacker SQL with the function's privileges — the fact that it's server-side makes it worse, not safer. Use EXECUTE ... USING with a placeholder, or drop EXECUTE entirely: a plain `RETURN QUERY SELECT ... WHERE name ILIKE '%' || term || '%'` parameterizes safely.",
      },
      {
        lines: [5, 6],
        category: "edge-case",
        title: "LIKE wildcards in the term aren't escaped",
        explanation:
          "% and _ in the user's term are treated as wildcards, so searching for a literal '50%' or 'a_b' matches far more than intended. Escape them (or use an escape clause) if the term should be matched literally.",
        points: 5,
      },
      {
        lines: [1, 1],
        category: "hallucinated-api",
        title: "Missing OR REPLACE / IF NOT EXISTS makes this non-idempotent",
        explanation:
          "Re-running the migration fails with `function search_users already exists`. Postgres supports CREATE OR REPLACE FUNCTION — use it so the definition can be updated and the script is safe to re-run.",
        points: 5,
      },
      {
        lines: [2, 2],
        category: "performance",
        title: "RETURNS SETOF users leaks every column, and ILIKE '%term%' can't use a normal index",
        explanation:
          "SETOF users returns all columns (including password hashes / tokens) to the caller — return an explicit row type with just the safe columns. Separately, a leading-wildcard ILIKE '%term%' forces a sequential scan; for real search use a trigram (pg_trgm GIN) index or full-text search.",
      },
    ],
  },
];
