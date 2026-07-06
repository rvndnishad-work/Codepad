/**
 * "Review the AI's code" challenge bank, part 5: Python + SQL.
 *
 * IMPORTANT: finding `lines` anchors are 1-based line numbers into `code`
 * exactly as written (first char after the opening backtick = line 1).
 * Run `npx tsx prisma/seed-review-challenges.ts --lint` after any edit.
 *
 * Grader note: marks are de-duped per line, so no two findings in one
 * challenge may anchor to the same line.
 */
import type { CuratedReviewChallenge } from "./review-challenges.types";

export const REVIEW_CHALLENGES_5: CuratedReviewChallenge[] = [
  // ────────────────────────────────────────────────────────────────────────
  // Python
  // ────────────────────────────────────────────────────────────────────────
  {
    slug: "py-jwt-auth",
    title: "FastAPI JWT auth dependency",
    prompt:
      "FastAPI dependency get_current_user that validates our HS256 JWTs (PyJWT) from the Authorization header and returns the user. Invalid, missing or expired tokens must get a 401.",
    language: "python",
    difficulty: "intermediate",
    estimatedMinutes: 8,
    code: `import time
import jwt
from fastapi import Header, HTTPException
from app.db import db

SECRET = "change-me-later"

def get_current_user(authorization: str = Header(None)):
    token = authorization.split(" ")[1]

    payload = jwt.decode(token, options={"verify_signature": False})

    if payload["exp"] < time.now():
        raise HTTPException(status_code=401, detail="Token expired")

    return db.users.find_one(payload["sub"])`,
    findings: [
      {
        lines: [6, 6],
        category: "security",
        title: "Hard-coded, guessable signing secret",
        explanation:
          "The HS256 secret lives in source control as the string 'change-me-later' — anyone who has ever seen the repo can mint valid tokens for any user. Load it from the environment / a secrets manager, and make startup fail loudly when it's missing or a known default.",
      },
      {
        lines: [9, 9],
        category: "edge-case",
        title: "Missing or malformed Authorization header crashes with a 500",
        explanation:
          "The prompt said missing tokens must 401 — but with no header, `authorization` is None and .split raises AttributeError; a header without a space ('Bearer' alone, or a bare token) raises IndexError. Both surface as 500s. Validate the header shape first (`if not authorization or not authorization.startswith(\"Bearer \")` → HTTPException 401).",
      },
      {
        lines: [11, 11],
        category: "security",
        title: "Signature verification is explicitly disabled",
        explanation:
          "options={\"verify_signature\": False} means the token's signature is never checked — anyone can forge a payload with any user id (and any exp) using an unsigned or self-signed token, and this code trusts it. This is *the* classic PyJWT footgun. Verify properly: `jwt.decode(token, SECRET, algorithms=[\"HS256\"])` — which also validates exp for you, correctly.",
      },
      {
        lines: [13, 13],
        category: "hallucinated-api",
        title: "time.now() doesn't exist",
        explanation:
          "Python's time module has time.time(); now() lives on datetime.datetime — this blend raises `AttributeError: module 'time' has no attribute 'now'` on the first request that gets this far. (With verification enabled, PyJWT checks exp itself and raises ExpiredSignatureError, so the whole manual check should simply be deleted.)",
      },
    ],
  },
  {
    slug: "py-revenue-report",
    title: "Revenue per customer",
    prompt:
      "Given orders (dicts with customer_id and total) and customers (dicts with id and name), return the top 5 customers by revenue as (name, total) pairs, plus the average revenue per customer. Both lists can be large.",
    language: "python",
    difficulty: "beginner",
    estimatedMinutes: 6,
    code: `def revenue_by_customer(orders, customers):
    revenue = {}
    for order in orders:
        for customer in customers:
            if customer["id"] == order["customer_id"]:
                name = customer["name"]
                revenue[name] = revenue.get(name, 0) + order["total"]

    top = sorted(revenue.items(), key=lambda kv: kv[1], descending=True)[:5]
    avg = sum(revenue.values()) / len(revenue)
    return top, avg`,
    findings: [
      {
        lines: [3, 4],
        category: "performance",
        title: "O(orders × customers) nested scan",
        explanation:
          "For every order the code walks the entire customer list — 100k orders × 50k customers is 5 billion comparisons for what should be a dict lookup. Build the index once (`names = {c[\"id\"]: c[\"name\"] for c in customers}`) and the loop becomes O(orders).",
      },
      {
        lines: [5, 5],
        category: "logic-bug",
        title: "Orders with an unknown customer_id silently vanish",
        explanation:
          "If an order's customer_id matches no customer (deleted account, data drift), the inner loop simply never fires — the order's revenue is dropped from every total with no trace. Revenue reports that silently understate are the worst kind of wrong. Decide explicitly: raise, or aggregate under an 'unknown' bucket, but never ignore.",
      },
      {
        lines: [9, 9],
        category: "hallucinated-api",
        title: "sorted() has no descending= keyword",
        explanation:
          "Python's sorted takes `reverse=True` — descending= is SQL/pandas vocabulary and raises `TypeError: 'descending' is an invalid keyword argument`. (It fails on the first call, which is the merciful version of this hallucination.)",
      },
      {
        lines: [10, 10],
        category: "edge-case",
        title: "ZeroDivisionError when there are no customers with revenue",
        explanation:
          "With no orders (or none that matched), `revenue` is empty and len(revenue) is 0 — the report crashes instead of reporting zeros. Guard the division: `avg = sum(revenue.values()) / len(revenue) if revenue else 0`.",
      },
    ],
  },
  {
    slug: "py-ttl-cache",
    title: "TTL cache decorator",
    prompt:
      "Write a @cached(ttl_seconds=...) decorator for expensive functions. Entries expire after the TTL, and the cache must not grow without bound.",
    language: "python",
    difficulty: "intermediate",
    estimatedMinutes: 8,
    code: `import time
import functools
import requests

API_URL = "https://api.exchangerate.host/latest"

def cached(ttl_seconds=60):
    def decorator(fn):
        store = {}

        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            key = str(args)
            if key in store:
                value, at = store[key]
                if time.time() - at < ttl_seconds:
                    return value
            value = fn(*args, **kwargs)
            store[key] = (value, time.time())
            return value

        return wrapper
    return decorator

@cached(ttl_seconds=300)
def get_exchange_rates(base):
    return requests.get(API_URL, params={"base": base}, retries=3).json()`,
    findings: [
      {
        lines: [13, 13],
        category: "logic-bug",
        title: "Keyword arguments are ignored in the cache key",
        explanation:
          "The key is built from *args only — fn(currency=\"EUR\") and fn(currency=\"JPY\") both key as \"()\" and return each other's cached results. Include kwargs deterministically: `key = str(args) + str(sorted(kwargs.items()))`. (str(args) also collides for objects whose repr includes memory addresses — those never hit at all.)",
      },
      {
        lines: [16, 16],
        category: "edge-case",
        title: "TTL measured on the wall clock, not a monotonic clock",
        explanation:
          "time.time() jumps with NTP corrections, DST fixes and manual clock changes — a backwards jump can make entries live far longer than the TTL (negative elapsed), a forward jump expires everything at once. Durations should use `time.monotonic()`, which is immune to clock adjustments.",
      },
      {
        lines: [18, 19],
        category: "performance",
        title: "Expired entries are never evicted — the cache only grows",
        explanation:
          "Expired entries aren't deleted when detected stale, and nothing caps the size — every distinct argument ever used stays in memory forever (the prompt explicitly required bounded growth). Delete on stale hit, and add a max-size/LRU policy (or just use functools.lru_cache plus a TTL wrapper).",
      },
      {
        lines: [27, 27],
        category: "hallucinated-api",
        title: "requests.get() has no retries= parameter",
        explanation:
          "Retries in requests are configured on a Session via an HTTPAdapter with urllib3's Retry — a retries= kwarg on requests.get raises `TypeError: request() got an unexpected keyword argument 'retries'`. The model blended urllib3's API into requests' — a hallucination pattern worth recognizing on sight.",
      },
    ],
  },
  {
    slug: "py-db-backup",
    title: "Nightly pg_dump backup script",
    prompt:
      "Write backup_database(db_name, out_dir): run pg_dump into a timestamped .sql.gz in out_dir, then prune this database's backups older than 30 days.",
    language: "python",
    difficulty: "advanced",
    estimatedMinutes: 9,
    code: `import os
import time
import subprocess
import datetime

def backup_database(db_name, out_dir):
    stamp = datetime.datetime.now().strftime("%Y-%m-%d")
    out_path = os.path.join(out_dir, f"{db_name}-{stamp}.sql.gz")

    result = subprocess.run(
        f"pg_dump {db_name} | gzip > {out_path}",
        shell=True,
    )
    print("backup finished:", result.output)

    for name in os.listdir(out_dir):
        path = os.path.join(out_dir, name)
        age_days = (time.time() - os.path.getctime(path)) / 86400
        if age_days > 30:
            os.remove(path)`,
    findings: [
      {
        lines: [10, 10],
        category: "logic-bug",
        title: "The dump's exit code is never checked",
        explanation:
          "subprocess.run without check=True swallows failure — if pg_dump dies (bad credentials, disk full), you get a zero-byte or truncated .gz, print 'backup finished', and then *prune the old backups that still worked*. A backup script that silently fails while deleting history is worse than no script. Pass check=True (and note the pipeline's exit status is gzip's, not pg_dump's — set `pipefail` or avoid the shell pipeline).",
      },
      {
        lines: [11, 11],
        category: "security",
        title: "Shell command built from interpolated arguments",
        explanation:
          "shell=True with db_name/out_dir f-stringed into the command is command injection: db_name of `app; rm -rf /` executes the rm. Even if today's callers are trusted, this pattern always ends up reachable from user input eventually. Use the argument-list form without a shell, and do the gzip in Python (gzip.open) or via pg_dump's own -Z flag.",
      },
      {
        lines: [14, 14],
        category: "hallucinated-api",
        title: "CompletedProcess has no .output attribute",
        explanation:
          "subprocess.run returns a CompletedProcess whose field is .stdout — and it's None anyway unless you passed capture_output=True. This line raises AttributeError right after the dump (Python's subprocess API blended with check_output's vocabulary).",
      },
      {
        lines: [16, 20],
        category: "edge-case",
        title: "The prune loop deletes ANY old file in out_dir",
        explanation:
          "os.listdir(out_dir) lists everything — other databases' dumps, notes.txt, whatever lives there — and anything older than 30 days is removed, not just this database's backups. Filter to the files this script created (`name.startswith(f\"{db_name}-\") and name.endswith(\".sql.gz\")`). Also worth knowing: getctime is metadata-change time on Linux, not creation time — the timestamp in the filename is the reliable source.",
      },
    ],
  },
  {
    slug: "py-stats-endpoint",
    title: "Dashboard stats endpoint",
    prompt:
      "FastAPI + psycopg2: GET /stats returns total user count and how many users have an active session. It's slow under load — review it.",
    language: "python",
    difficulty: "intermediate",
    estimatedMinutes: 7,
    code: `from fastapi import FastAPI
import psycopg2

app = FastAPI()
DSN = "dbname=app user=api"

@app.get("/stats")
def stats():
    conn = psycopg2.connect(DSN)
    cur = conn.cursor()

    cur.execute("SELECT id FROM users")
    user_ids = [row[0] for row in cur.fetchall()]

    active = 0
    for uid in user_ids:
        cur.execute(
            "SELECT COUNT(*) FROM sessions WHERE user_id = %s AND active",
            (uid,),
        )
        if cur.fetchone()[0] > 0:
            active += 1

    conn.close()
    return {"total": len(user_ids), "active": active}`,
    findings: [
      {
        lines: [9, 9],
        category: "performance",
        title: "A new database connection per request",
        explanation:
          "psycopg2.connect does a full TCP + auth handshake — tens of milliseconds before any query runs, on *every* request, and under load you exhaust Postgres's max_connections. Create a pool once at startup (psycopg2.pool / asyncpg) and borrow from it per request.",
      },
      {
        lines: [12, 13],
        category: "performance",
        title: "Every user id is fetched into memory just to be counted",
        explanation:
          "SELECT id + fetchall materializes the whole users table in Python to compute len() — one `SELECT COUNT(*) FROM users` returns the number without shipping a single row.",
      },
      {
        lines: [16, 20],
        category: "performance",
        title: "N+1: one sessions query per user",
        explanation:
          "A million users means a million COUNT queries per dashboard load. The whole loop is one aggregate: `SELECT COUNT(DISTINCT user_id) FROM sessions WHERE active` — the database is very good at exactly this.",
      },
      {
        lines: [24, 24],
        category: "edge-case",
        title: "The connection leaks whenever a query raises",
        explanation:
          "conn.close() is only reached on success — any exception above skips it and the connection stays checked out until garbage collection gets around to it (under errors + load, that's connection exhaustion). Use `with psycopg2.connect(DSN) as conn, conn.cursor() as cur:` or try/finally.",
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  // SQL
  // ────────────────────────────────────────────────────────────────────────
  {
    slug: "sql-monthly-revenue",
    title: "Monthly revenue report",
    prompt:
      "PostgreSQL: revenue per month for 2025 from the invoices table (amount_cents, refunded_cents, paid_at) — gross and net dollars, months in calendar order, and months with no invoices must still appear with 0.",
    language: "sql",
    difficulty: "intermediate",
    estimatedMinutes: 7,
    code: `SELECT
  TO_CHAR(paid_at, 'Month') AS month,
  SUM(amount_cents) / 100 AS revenue_dollars,
  IFNULL(SUM(amount_cents - refunded_cents), 0) / 100.0 AS net_dollars
FROM invoices
WHERE paid_at >= '2025-01-01'
  AND paid_at < '2026-01-01'
GROUP BY TO_CHAR(paid_at, 'Month')
ORDER BY month;`,
    findings: [
      {
        lines: [3, 3],
        category: "logic-bug",
        title: "Integer division silently truncates the cents",
        explanation:
          "amount_cents is an integer, so integer / integer in Postgres truncates: 199950 / 100 = 1999, not 1999.50 — every month's gross revenue is rounded down to the dollar. Divide by 100.0 (like line 4 does) or cast to numeric.",
      },
      {
        lines: [4, 4],
        category: "hallucinated-api",
        title: "IFNULL is not a Postgres function",
        explanation:
          "IFNULL is MySQL (and NVL is Oracle) — Postgres raises `function ifnull(numeric, integer) does not exist` and the whole query errors. The portable spelling is COALESCE. Cross-dialect function blends are among the most common AI SQL hallucinations.",
      },
      {
        lines: [5, 5],
        category: "edge-case",
        title: "Months with zero invoices are missing from the output",
        explanation:
          "You can't GROUP BY your way into rows that don't exist: a month with no invoices simply isn't in the result, but the prompt required it with 0. Generate the calendar first and LEFT JOIN the aggregates onto it: `generate_series('2025-01-01'::date, '2025-12-01', interval '1 month')`.",
      },
      {
        lines: [9, 9],
        category: "logic-bug",
        title: "ORDER BY month sorts month names alphabetically",
        explanation:
          "`month` here is the TO_CHAR text — so the report reads April, August, December, February… Group and order by a real date (`DATE_TRUNC('month', paid_at)`) and do the pretty formatting in the SELECT (or in the app).",
      },
    ],
  },
  {
    slug: "sql-winback-list",
    title: "Win-back campaign list",
    prompt:
      "MySQL 8: build the win-back email list — customers with no orders in the last 90 days (including customers who never ordered), with lifetime spend, last order date, and a comma-separated list of their order ids. Exclude internal test accounts (email contains 'test').",
    language: "sql",
    difficulty: "advanced",
    estimatedMinutes: 9,
    code: `SELECT
  c.id,
  c.email,
  SUM(o.total) AS lifetime_spend,
  MAX(o.created_at) AS last_order,
  STRING_AGG(o.id, ',') AS order_ids
FROM customers c
JOIN orders o ON o.customer_id = c.id
WHERE o.created_at < NOW() - INTERVAL 90 DAY
  AND LOWER(c.email) NOT LIKE '%test%'
GROUP BY c.id
HAVING last_order < NOW() - INTERVAL 90 DAY
ORDER BY lifetime_spend DESC;`,
    findings: [
      {
        lines: [6, 6],
        category: "hallucinated-api",
        title: "STRING_AGG is not a MySQL function",
        explanation:
          "STRING_AGG is Postgres / SQL Server — MySQL's aggregate string concatenation is `GROUP_CONCAT(o.id SEPARATOR ',')`. MySQL errors immediately. (Mind GROUP_CONCAT's group_concat_max_len truncation default of 1024 for customers with many orders.)",
      },
      {
        lines: [8, 8],
        category: "edge-case",
        title: "INNER JOIN drops the customers who never ordered",
        explanation:
          "The prompt explicitly includes never-ordered customers — arguably the most winnable-back segment — but the inner JOIN requires at least one order row, so they vanish. LEFT JOIN, and handle the NULLs (lifetime_spend 0 via COALESCE, last_order NULL meaning 'never').",
      },
      {
        lines: [9, 9],
        category: "logic-bug",
        title: "The WHERE filter breaks both the inactivity check and the totals",
        explanation:
          "Filtering orders *before* aggregation excludes each customer's recent orders rather than excluding recently-active customers: someone who ordered yesterday still appears (their older orders pass the filter, and MAX over the filtered rows dodges the HAVING) — and everyone's lifetime_spend is understated. Delete this predicate; inactivity is exactly what the HAVING on the *unfiltered* MAX already expresses.",
      },
      {
        lines: [10, 10],
        category: "performance",
        title: "LOWER() + leading-wildcard LIKE forces a full scan",
        explanation:
          "Wrapping the column in LOWER() disables any index on email, and a leading % makes the LIKE unindexable anyway — on a big customers table this is a full scan every run. Store emails normalized to lowercase (or use a generated lowercase column) and, for the 'internal accounts' rule, prefer an explicit is_internal flag over pattern-matching addresses.",
      },
    ],
  },
  {
    slug: "sql-orders-dashboard",
    title: "Slow orders dashboard query",
    prompt:
      "Postgres: the ops dashboard shows today's paid/shipped orders (orders has ~20M rows; indexes on (status), (created_at), (customer_id)). This query takes 30+ seconds — review it for performance.",
    language: "sql",
    difficulty: "advanced",
    estimatedMinutes: 9,
    code: `SELECT DISTINCT
  o.*,
  c.name,
  (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE CAST(o.created_at AS DATE) = CURRENT_DATE
  AND o.status IN ('paid', 'shipped')
ORDER BY o.created_at DESC
LIMIT 50 OFFSET 200000;`,
    findings: [
      {
        lines: [1, 2],
        category: "performance",
        title: "DISTINCT over o.* forces a sort of full-width rows",
        explanation:
          "orders→customers is many-to-one, so the join can't duplicate order rows — the DISTINCT does nothing except force Postgres to sort/hash every wide row (all columns of o.*, including any large ones) before returning. Drop the DISTINCT, and select the columns the dashboard actually shows instead of *.",
      },
      {
        lines: [4, 4],
        category: "performance",
        title: "Correlated subquery: one order_items count per row",
        explanation:
          "The subquery runs once per output row — an N+1 embedded in SQL. Join a pre-aggregated count instead: `LEFT JOIN (SELECT order_id, COUNT(*) n FROM order_items GROUP BY order_id) oi ON oi.order_id = o.id` (or LEFT JOIN LATERAL for just the visible page).",
      },
      {
        lines: [7, 7],
        category: "performance",
        title: "CAST on the column makes the date filter unindexable",
        explanation:
          "Wrapping created_at in CAST means the (created_at) index can't be used — 20M rows get scanned to compare dates. Use a sargable range: `o.created_at >= CURRENT_DATE AND o.created_at < CURRENT_DATE + 1`. (Also decide which timezone 'today' means — CURRENT_DATE is the server's, which is rarely what ops expects.)",
      },
      {
        lines: [10, 10],
        category: "performance",
        title: "OFFSET 200000 computes and throws away 200k rows",
        explanation:
          "OFFSET doesn't skip — Postgres must produce and discard all 200,000 preceding rows (including their correlated subqueries) to serve one page of 50. Use keyset pagination: `WHERE o.created_at < :last_seen ORDER BY o.created_at DESC LIMIT 50`. (And an OFFSET this deep into 'today's orders' suggests the paging state itself is wrong.)",
      },
    ],
  },
];
