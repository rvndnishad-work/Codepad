/**
 * "Review the AI's code" challenge bank, part 1: JavaScript + TypeScript.
 *
 * IMPORTANT: finding `lines` anchors are 1-based line numbers into `code`
 * exactly as written (first char after the opening backtick = line 1).
 * Run `npx tsx prisma/seed-review-challenges.ts --lint` after any edit.
 */
import type { CuratedReviewChallenge } from "./review-challenges.types";

export const REVIEW_CHALLENGES_1: CuratedReviewChallenge[] = [
  // ────────────────────────────────────────────────────────────────────────
  // JavaScript
  // ────────────────────────────────────────────────────────────────────────
  {
    slug: "js-debounced-search",
    title: "Debounced live search",
    prompt:
      "Write a debounce helper and wire it to a search input so we only hit /api/search after the user stops typing. Stale responses must not overwrite newer results.",
    language: "javascript",
    difficulty: "intermediate",
    estimatedMinutes: 8,
    code: `// Debounced live search — waits for the user to stop typing before
// hitting the API, and renders the matching products.
const input = document.querySelector("#search");
const results = document.querySelector("#results");

function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    if (timer) {
      timer.cancel();
    }
    timer = setTimeout(fn(...args), delay);
  };
}

async function search(query) {
  const res = await fetch(\`/api/search?q=\${encodeURIComponent(query)}\`);
  const items = await res.json();
  renderResults(items);
}

function renderResults(items) {
  results.innerHTML = items.map((i) => \`<li>\${i.name}</li>\`).join("");
}

input.addEventListener("input", (e) => {
  debounce(search, 300)(e.target.value);
});`,
    findings: [
      {
        lines: [10, 10],
        category: "hallucinated-api",
        title: "Timers don't have a .cancel() method",
        explanation:
          "setTimeout returns a numeric id (or a Timeout object in Node), neither of which has .cancel(). This line throws `timer.cancel is not a function` the second time the user types. The real API is clearTimeout(timer). A classic AI hallucination — it looks like an API that *should* exist.",
      },
      {
        lines: [12, 12],
        category: "logic-bug",
        title: "fn is invoked immediately, not after the delay",
        explanation:
          "`setTimeout(fn(...args), delay)` calls fn right now and passes its *return value* to setTimeout. The debounce never delays anything. It must wrap the call: `setTimeout(() => fn(...args), delay)`.",
      },
      {
        lines: [27, 27],
        category: "logic-bug",
        title: "A fresh debounced function is created on every keystroke",
        explanation:
          "Each input event calls debounce(...) again, producing a new closure with its own `timer = null` — so no timer is ever shared between keystrokes and nothing is actually debounced. Create the debounced function once, outside the listener: `const onInput = debounce(search, 300); input.addEventListener(\"input\", (e) => onInput(e.target.value));`.",
      },
      {
        lines: [17, 19],
        category: "edge-case",
        title: "Stale responses can overwrite newer results",
        explanation:
          "The prompt explicitly required stale-response protection, but nothing guards ordering: if the request for \"re\" resolves after the request for \"react\", the older result list wins. Track a request sequence number and ignore out-of-date responses, or abort the previous request with an AbortController.",
      },
      {
        lines: [23, 23],
        category: "security",
        title: "Unescaped API data injected via innerHTML",
        explanation:
          "Product names from the API are interpolated straight into innerHTML — a product named `<img src=x onerror=alert(1)>` executes script (stored XSS). Build the list with document.createElement/textContent, or escape the values before interpolating.",
      },
    ],
  },
  {
    slug: "js-login-endpoint",
    title: "Express login endpoint",
    prompt:
      "Implement POST /login with Express and node-postgres: verify the email + password against the users table and return a JWT on success.",
    language: "javascript",
    difficulty: "advanced",
    estimatedMinutes: 10,
    code: `const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Pool } = require("pg");

const app = express();
const pool = new Pool();
app.use(express.json());

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query(
    \`SELECT * FROM users WHERE email = '\${email}'\`
  );
  const user = result.rows[0];
  if (!user) {
    return res.status(404).json({ error: "No account for " + email });
  }

  const hash = crypto.createHash("md5").update(password).digest("hex");
  if (hash !== user.password_hash) {
    return res.status(401).json({ error: "Wrong password" });
  }

  const token = jwt.encode({ id: user.id, role: user.role }, "secret");
  res.json({ token, user });
});

app.listen(3000);`,
    findings: [
      {
        lines: [11, 11],
        category: "edge-case",
        title: "Request body is never validated",
        explanation:
          "email and password can be undefined, non-strings, or objects. `undefined` interpolated into the query becomes the literal text 'undefined', and crypto.update(undefined) throws a 500. Validate presence and type up front and return 400.",
      },
      {
        lines: [13, 15],
        category: "security",
        title: "SQL injection via template-literal query",
        explanation:
          "email is interpolated directly into the SQL string — `' OR '1'='1` logs in as the first user, and `'; DROP TABLE users;--` is game over. node-postgres supports parameterized queries: `pool.query('SELECT * FROM users WHERE email = $1', [email])`.",
      },
      {
        lines: [21, 21],
        category: "security",
        title: "MD5 is not a password hash",
        explanation:
          "MD5 is a fast, unsalted digest — billions of guesses per second on a GPU, plus rainbow tables. Passwords need a slow, salted KDF: bcrypt, scrypt, or argon2 (`bcrypt.compare(password, user.password_hash)`). The string comparison is also not constant-time, leaking timing information.",
      },
      {
        lines: [26, 26],
        category: "hallucinated-api",
        title: "jsonwebtoken has no jwt.encode()",
        explanation:
          "The jsonwebtoken package exposes jwt.sign(payload, secret, options) — `jwt.encode` is a hallucination (it exists in Python's PyJWT, which is likely where the model blended it from). Also: the secret is hard-coded ('secret') and no expiresIn is set, so tokens never expire.",
      },
      {
        lines: [27, 27],
        category: "security",
        title: "Returns the entire user row to the client",
        explanation:
          "`user` is `SELECT *` — the response includes password_hash and any other sensitive columns. Return an explicit whitelist ({ id, email, name }) instead of the raw row.",
      },
    ],
  },
  {
    slug: "js-retry-fetch",
    title: "fetchJson with retries",
    prompt:
      "Write fetchJson(url) that retries failed requests up to 3 times with exponential backoff, plus a helper that fetches a list of URLs.",
    language: "javascript",
    difficulty: "intermediate",
    estimatedMinutes: 8,
    code: `// Fetch JSON with retries and exponential backoff.
async function fetchJson(url, retries = 3) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { timeout: 5000 });
      if (!res.ok) {
        continue;
      }
      return res.json();
    } catch (err) {
      console.log("retrying", url);
      await sleep(2 ** i * 1000);
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Convenience: fetch several URLs.
async function fetchAll(urls) {
  const results = [];
  for (const url of urls) {
    results.push(await fetchJson(url));
  }
  return results;
}`,
    findings: [
      {
        lines: [5, 5],
        category: "hallucinated-api",
        title: "fetch has no { timeout } option",
        explanation:
          "The WHATWG fetch API silently ignores an unknown `timeout` property — the request can hang forever and the option does nothing. Real timeouts use AbortController or the newer AbortSignal.timeout(5000) passed as `{ signal }`. (The `timeout` option exists in axios and node's http — a typical cross-library hallucination.)",
      },
      {
        lines: [6, 8],
        category: "logic-bug",
        title: "HTTP errors retry instantly with no backoff",
        explanation:
          "A non-ok response hits `continue`, skipping the catch block — so 500s are retried in a tight loop with zero delay (the backoff only applies to network errors). Throw on !res.ok so both failure kinds share the same backoff path, and don't retry non-retryable statuses like 400/404.",
      },
      {
        lines: [14, 15],
        category: "edge-case",
        title: "Exhausted retries resolve to undefined",
        explanation:
          "When every attempt fails, the loop just ends and the function returns undefined — callers can't tell failure from a legitimately empty body, and `(await fetchJson(u)).items` explodes later with an unrelated TypeError. Rethrow the last error after the final attempt.",
      },
      {
        lines: [24, 25],
        category: "performance",
        title: "URLs are fetched one at a time",
        explanation:
          "`await` inside the for-of serializes every request — 10 URLs × 300ms = 3s instead of ~300ms. Independent requests should run concurrently: `return Promise.all(urls.map((u) => fetchJson(u)))` (or Promise.allSettled if partial failure is acceptable).",
      },
    ],
  },
  {
    slug: "js-shopping-cart",
    title: "Shopping cart module",
    prompt:
      "Implement a small cart module: add items, remove an item by id, compute the total (10% off with code SAVE10), and clear the cart.",
    language: "javascript",
    difficulty: "beginner",
    estimatedMinutes: 6,
    code: `const cart = [];

function addItem(item) {
  cart.push(item);
  return cart;
}

function removeItem(id) {
  const index = cart.findIndex((i) => i.id == id);
  cart.splice(index, 1);
  return cart;
}

function getTotal(discountCode) {
  let total = 0;
  for (let i = 0; i <= cart.length; i++) {
    total += cart[i].price * cart[i].qty;
  }
  if (discountCode === "SAVE10") {
    total = total * 0.9;
  }
  return total.toFixed(2);
}

function clearCart() {
  cart = [];
}`,
    findings: [
      {
        lines: [9, 10],
        category: "edge-case",
        title: "Removing a missing id deletes the last item",
        explanation:
          "findIndex returns -1 when nothing matches, and splice(-1, 1) removes the *last* element — so removing an id that isn't in the cart silently deletes a different product. Guard: `if (index !== -1) cart.splice(index, 1)`.",
      },
      {
        lines: [16, 17],
        category: "logic-bug",
        title: "Off-by-one: loop reads past the end of the array",
        explanation:
          "`i <= cart.length` iterates one index too far; cart[cart.length] is undefined, so `undefined.price` throws a TypeError on every call with a non-empty cart. Use `i < cart.length` (or a for-of / reduce).",
      },
      {
        lines: [22, 22],
        category: "edge-case",
        title: "getTotal returns a string, not a number",
        explanation:
          "toFixed(2) returns a *string* ('19.90'). Any downstream arithmetic (`total + shipping`) becomes string concatenation ('19.905'). Return the number and format only at the display layer.",
      },
      {
        lines: [26, 26],
        category: "logic-bug",
        title: "Reassigning a const throws at runtime",
        explanation:
          "`cart` was declared with const, so `cart = []` throws `TypeError: Assignment to constant variable` the first time someone clears the cart. Empty the existing array instead: `cart.length = 0` (which also keeps other references to the array in sync).",
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  // TypeScript
  // ────────────────────────────────────────────────────────────────────────
  {
    slug: "ts-use-local-storage",
    title: "useLocalStorage hook",
    prompt:
      "Write a useLocalStorage hook for our Next.js app that keeps state in sync with localStorage, including changes made in other tabs.",
    language: "typescript",
    difficulty: "intermediate",
    estimatedMinutes: 8,
    code: `import { useEffect, useState } from "react";

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : initial;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [value]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        setValue(JSON.parse(e.newValue!));
      }
    };
    window.addEventListener("storage", onStorage);
  }, []);

  return [value, setValue] as const;
}`,
    findings: [
      {
        lines: [5, 5],
        category: "edge-case",
        title: "window access crashes during SSR",
        explanation:
          "This is a Next.js app: the initializer runs during server rendering where `window` doesn't exist, throwing `window is not defined`. Guard with `typeof window === \"undefined\"` (returning `initial`), or read localStorage lazily inside a mount effect.",
      },
      {
        lines: [6, 6],
        category: "edge-case",
        title: "JSON.parse of stored data is unguarded",
        explanation:
          "Anything can be in localStorage — an old schema, a value written by other code, or hand-edited junk. If it isn't valid JSON, JSON.parse throws during render and the whole component tree crashes. Wrap in try/catch and fall back to `initial`.",
      },
      {
        lines: [11, 11],
        category: "logic-bug",
        title: "Write-effect dependency array is missing `key`",
        explanation:
          "Deps are `[value]` only. If the caller's `key` prop changes, the effect doesn't re-run until the next value change — and then it writes the *new* value under the new key while the old key keeps the stale value silently. Deps must be `[key, value]`.",
      },
      {
        lines: [19, 20],
        category: "performance",
        title: "storage listener is never removed",
        explanation:
          "The effect adds a window listener but returns no cleanup, so every mount leaks a listener that keeps calling setValue on an unmounted hook (and the empty deps array also freezes `key` in the closure). Return `() => window.removeEventListener(\"storage\", onStorage)` and include `key` in the deps.",
      },
    ],
  },
  {
    slug: "ts-profile-patch",
    title: "PATCH /api/profile route handler",
    prompt:
      "Next.js App Router route handler: PATCH /api/profile lets the signed-in user update their own profile fields (name, bio).",
    language: "typescript",
    difficulty: "advanced",
    estimatedMinutes: 8,
    code: `import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const userId = req.nextUrl.searchParams.get("userId");

  const body = await req.json();

  const user = await prisma.user.update({
    where: { id: userId! },
    data: body,
  });

  console.log(\`profile updated: \${JSON.stringify(user)}\`);
  return NextResponse.json(user);
}`,
    findings: [
      {
        lines: [6, 7],
        category: "security",
        title: "IDOR: the target user comes from the query string",
        explanation:
          "The session is fetched and then ignored — the row to update is whatever ?userId= the caller supplies, so any (even unauthenticated) client can edit any account. Use `session.user.id` as the target and return 401 when there's no session. The `userId!` non-null assertion also hides that the param can be absent.",
      },
      {
        lines: [9, 9],
        category: "edge-case",
        title: "Unparsed, unvalidated request body",
        explanation:
          "req.json() throws on a malformed body (unhandled → 500), and nothing checks the shape. Parse inside try/catch (or .catch(() => null)) and validate against the expected fields before touching the database.",
      },
      {
        lines: [13, 13],
        category: "security",
        title: "Mass assignment: raw body written to the database",
        explanation:
          "`data: body` lets the client set *any* User column — role, banned, emailVerified, passwordHash. The prompt said name and bio; whitelist exactly those: `data: { name: body.name, bio: body.bio }` (after validation).",
      },
      {
        lines: [16, 16],
        category: "security",
        title: "Full user record logged",
        explanation:
          "The updated row (email, password hash, tokens — whatever the model has) is serialized into application logs, where it outlives the request and is visible to anyone with log access. Log the user id and changed field names, never the record.",
      },
      {
        lines: [17, 17],
        category: "security",
        title: "Full user row returned in the response",
        explanation:
          "Same leak, client-side: the JSON response carries every column of the User model. Select or pick only the public fields the UI needs.",
      },
    ],
  },
  {
    slug: "ts-memoize",
    title: "Typed memoize utility",
    prompt:
      "Write a typed memoize(fn) utility for expensive pure functions. The cache must not grow without bound.",
    language: "typescript",
    difficulty: "intermediate",
    estimatedMinutes: 8,
    code: `type AnyFn = (...args: any[]) => any;

export function memoize<F extends AnyFn>(fn: F): F {
  const cache = new Map<string, ReturnType<F>>();

  const memoized = (...args: Parameters<F>) => {
    const key = args.join(",");
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.insert(key, result);
    return result;
  };

  return memoized as F;
}

// Example: expensive lookup used across the app.
export const getUser = memoize(async (id: string) => {
  const res = await fetch(\`/api/users/\${id}\`);
  return res.json();
});`,
    findings: [
      {
        lines: [7, 7],
        category: "logic-bug",
        title: "args.join(',') produces colliding cache keys",
        explanation:
          "join stringifies naively: any object becomes \"[object Object]\" (all object args share one cache entry), and (\"a,b\") vs (\"a\", \"b\") produce the identical key \"a,b\" — different calls silently return each other's results. Use JSON.stringify(args) at minimum, or a nested Map keyed by identity.",
      },
      {
        lines: [4, 4],
        category: "performance",
        title: "Unbounded cache despite the stated requirement",
        explanation:
          "The prompt explicitly required a bounded cache, but entries are never evicted — long-running processes grow this Map forever (a memory leak for high-cardinality args like user ids). Add an LRU policy or a max-size cap that evicts the oldest entry.",
      },
      {
        lines: [12, 12],
        category: "hallucinated-api",
        title: "Map has no .insert() method",
        explanation:
          "JavaScript's Map API is .set(key, value) — .insert() doesn't exist (it's Rust's HashMap vocabulary) and throws `cache.insert is not a function` on the first cache miss. The kind of API blend an AI produces when it's been reading other languages.",
      },
      {
        lines: [20, 22],
        category: "edge-case",
        title: "Rejected promises are cached forever",
        explanation:
          "Memoizing an async function caches the *promise* — including rejected ones. One transient network failure and every future getUser(id) for that id returns the same cached rejection until restart. Delete the cache entry when the promise rejects (`.catch(() => cache.delete(key))` before returning).",
      },
    ],
  },
  {
    slug: "ts-file-server",
    title: "Serve uploaded files",
    prompt:
      "Express + TypeScript: GET /files/:name serves a user-uploaded file from the local ./uploads directory.",
    language: "typescript",
    difficulty: "advanced",
    estimatedMinutes: 8,
    code: `import express from "express";
import fs from "fs";
import path from "path";

const app = express();
const UPLOAD_DIR = path.join(__dirname, "uploads");

app.get("/files/:name", async (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.name);

  const exists = await fs.promises.exists(filePath);
  if (!exists) {
    return res.status(404).send("Not found");
  }

  const data = fs.readFileSync(filePath);
  res.setHeader("Content-Type", "text/html");
  res.send(data);
});

app.listen(8080);`,
    findings: [
      {
        lines: [9, 9],
        category: "security",
        title: "Path traversal via the :name parameter",
        explanation:
          "path.join happily resolves `..%2F..%2Fetc%2Fpasswd` (Express decodes it to ../../etc/passwd) right out of UPLOAD_DIR — arbitrary file read. Resolve the joined path and verify it still starts with UPLOAD_DIR + path.sep (or reject any name containing a separator / '..').",
      },
      {
        lines: [11, 11],
        category: "hallucinated-api",
        title: "fs.promises.exists does not exist",
        explanation:
          "Node's promise API deliberately omits exists — this throws `fs.promises.exists is not a function`. It's one of the most commonly hallucinated Node APIs. Use `fs.promises.access(filePath)` (or stat) in a try/catch — or skip the pre-check entirely and handle the read error, avoiding the TOCTOU race.",
      },
      {
        lines: [16, 16],
        category: "performance",
        title: "Synchronous file read blocks the event loop",
        explanation:
          "readFileSync inside a request handler stalls *every* concurrent request while the file loads, and buffers the whole file in memory. Stream it: `fs.createReadStream(filePath).pipe(res)` (or res.sendFile, which also handles range requests and content types).",
      },
      {
        lines: [17, 17],
        category: "security",
        title: "User uploads served as text/html — stored XSS",
        explanation:
          "Serving arbitrary user uploads with Content-Type: text/html means anyone can upload evil.html and have it execute script on your origin (cookie theft, session takeover). Derive the real content type, add X-Content-Type-Options: nosniff, and serve untrusted uploads with Content-Disposition: attachment (ideally from a separate origin).",
      },
    ],
  },
];
