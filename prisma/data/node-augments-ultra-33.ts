/**
 * Node.js gap batch 33 — API design (5 questions that previously had only a
 * thin answer): idempotent endpoints, versioning, file uploads, request
 * validation and pagination.
 *
 * Verified in this batch, executed on this machine (Node v22.22.0, Linux).
 * Packages were installed in the scratch folder only: express@5.3.0,
 * multer@2.4.0, zod@4.6.7. Every example below was run with `node` and its
 * output is quoted verbatim in the answer:
 *   - Idempotency: a naive POST that the client abandoned at 100 ms and then
 *     retried created 2 charges. With an Idempotency-Key middleware the same
 *     story created 1 charge: the immediate retry got 409 (still processing),
 *     the later retry got the stored 201 replayed. Two concurrent requests with
 *     one key: one 201, one 409. Same key + different body: 422. Against a
 *     store with a 5 ms async round trip, get-then-set let both concurrent
 *     requests through (2 charges); an atomic set-if-absent let one (1 charge).
 *   - Versioning: one model, two presenters; /v1, /v2 and an Api-Version
 *     header all dispatched correctly, v1 carried Deprecation + Sunset headers,
 *     an unknown version got 400 with the supported list. A node:test contract
 *     test caught a spread-based v1 presenter silently losing `email` after an
 *     internal rename, while the explicit presenter passed.
 *   - Uploads (multer 2 on Express 5): a 2 MB file against a 1 MB limit got
 *     413 LIMIT_FILE_SIZE and left no partial file on disk; a text file sent as
 *     image/png passed fileFilter but failed the magic-byte check (415); a
 *     client-sent filename "../../etc/passwd.png" reached fileFilter as
 *     "passwd.png"; a text field sent after the file was undefined inside
 *     fileFilter but present in the route handler.
 *   - Validation (zod 4): three errors reported in one 400; strictObject
 *     rejected an unknown key; query strings "2"/"50" coerced to numbers;
 *     assigning req.query in Express 5 threw "Cannot set property query of
 *     #<IncomingMessage> which has only a getter"; z.coerce.boolean() turned
 *     "false" into true and z.coerce.number() turned "" into 0.
 *   - Pagination (node:sqlite, in memory, 1,000,000 rows): OFFSET 999000 took
 *     ~9 ms per page vs ~0.01-0.05 ms for keyset; plans were SCAN vs SEARCH.
 *     Two rows inserted between pages made offset page 2 repeat 2 rows; keyset
 *     repeated 0. A cursor API walked 230 rows in 5 pages with no gaps, but a
 *     cursor on created_at alone (no id tie-breaker) saw only 227 of 230.
 *
 * Version / spec facts checked by web search, not memory:
 *   - The Idempotency-Key header is an IETF httpapi working-group
 *     Internet-Draft (draft-ietf-httpapi-idempotency-key-header, draft-07 in
 *     Oct 2025): still work in progress, not an RFC.
 *   - Stripe documents that idempotency keys may be pruned once they are at
 *     least 24 hours old, and that results are saved only once the endpoint
 *     starts executing (not for validation failures or concurrent conflicts).
 *   - RFC 9745 (March 2025) defines the Deprecation response header; its value
 *     is a structured-field Date such as @1688169599. Sunset is RFC 8594.
 *   - Stripe versions its API by date (e.g. 2017-05-24), chosen per request by
 *     the Stripe-Version header, else the SDK pin, else the account default.
 *   - node:sqlite loaded without a flag on this Node 22.22.0 but printed an
 *     ExperimentalWarning (observed, not looked up).
 */
import type { NodeAugment } from "./node-augments.types";

const augments: NodeAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is API idempotency and how would you design idempotent endpoints in a Node.js REST API?",
    seoDescription:
      "Make POST endpoints safe to retry in Node.js: idempotency keys, body fingerprints, 409 for in-flight duplicates and atomic reservation in a shared store.",
    description: `**Question presented to candidate:**
"Our mobile app calls \`POST /charges\` to take a payment. On a flaky network the request times out on the phone, the app retries, and some customers get charged twice. What is idempotency, which of our endpoints already have it, and how would you make \`POST /charges\` safe to retry in a Node.js API?"

**What a strong answer should cover:**
- A clear definition: an operation is idempotent when doing it twice leaves the server in the same state as doing it once. By HTTP semantics GET, HEAD, PUT, DELETE (and OPTIONS) are idempotent; POST and PATCH are not, so they need help.
- Why it matters: a client timeout does not mean the server failed. The server may have finished the work, so a blind retry repeats the side effect.
- The idempotency-key design: the client sends a unique \`Idempotency-Key\` header and reuses it on every retry; the server stores the key (scoped per caller and endpoint), a fingerprint of the request body, and the final response, then replays that response for repeats.
- The edge cases that separate a senior answer: a retry that arrives while the first request is still running (reply 409 or wait), the same key with a different body (reject, e.g. 422), whether to store failures (release the key on 5xx so the client can retry), and a TTL on stored keys.
- Atomicity: the "is this key new?" check and the write must be one step in a shared store (Redis \`SET NX\`, a unique index with \`INSERT ... ON CONFLICT\`), or two concurrent retries both get through on different instances.
- Natural idempotency first where possible: \`PUT\` with a client-chosen ID, upserts, and unique constraints on business keys, with the key-store as the general solution.

**Clarifying questions expected:**
- "Who generates the key and how long might a client keep retrying with it?" (sets the TTL)
- "Do we run more than one instance, and what shared store do we have?" (decides where the atomic reservation lives)
- "Does the payment provider accept its own idempotency key that we can pass through?"

**Code / implementation expected:** Yes. An Express middleware that reserves the key, fingerprints the body, captures and replays the response, plus an explanation of why the reservation must be atomic.`,
    answer: `**Target Audience:** Backend engineers preparing for Node.js API design interviews who have built REST endpoints but have not had to make them safe to retry.
**Difficulty:** Hard

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer expects. Every code sample here was run with Node v22.22.0 and Express 5.3.0, and the output shown is the output it printed.

## 1. Why This Even Matters — A Story First

You press the lift button. Nothing seems to happen, so you press it four more times. The lift still comes once. Pressing the button is **idempotent**: pressing it again does not order a second lift.

Now picture a vending machine where every press drops a can and takes your money. If the display freezes and you press again, you pay twice. That machine is a \`POST /charges\` endpoint with no protection.

The tricky part is that, from the customer's side, a frozen display looks exactly the same whether the machine failed or succeeded. A phone whose request timed out has the same problem: it cannot tell "the server never got it" from "the server charged the card and the reply got lost". So it retries, and the API has to make that retry harmless.

## 2. What Idempotent Means for HTTP

📌 **Interview term: idempotent** — an operation is idempotent if performing it several times leaves the server in the same state as performing it once. The *response* can differ (a second \`DELETE\` may return 404); the *state* must not.

📌 **Interview term: safe method** — a method that is not meant to change server state at all (GET, HEAD, OPTIONS). Every safe method is idempotent, but not every idempotent method is safe.

| Method | Idempotent by HTTP semantics? | Why |
| :--- | :--- | :--- |
| GET, HEAD, OPTIONS | Yes (and safe) | They only read. |
| PUT | Yes | "Set this resource to exactly this." Doing it twice gives the same result. |
| DELETE | Yes | After the first one the thing is gone; the second changes nothing. |
| POST | **No** | "Create a new thing" or "do this action". Twice means two things. |
| PATCH | **No** in general | \`{ "op": "increment" }\` applied twice increments twice. |

Two points interviewers like to hear:

- The table is a **promise you must keep in your code**. A \`PUT\` handler that appends to an audit list or bumps a counter has broken the promise, and HTTP clients and proxies that retry PUTs will hurt you.
- Most problems live in **POST**: creating orders, charging cards, sending emails. That is where you add an idempotency key.

## 3. The Fix: an Idempotency Key

The client generates a random ID (a UUID) once per *logical* operation, for example once per "Pay" tap, and sends it in a header. If it has to retry, it sends **the same** ID again.

📌 **Interview term: idempotency key** — a client-generated unique value, usually sent as an \`Idempotency-Key\` header, that identifies one logical operation across all of its retries. Stripe popularised it, and an IETF working group has an Internet-Draft for the header (\`draft-ietf-httpapi-idempotency-key-header\`; draft-07 is from October 2025 and it is still work in progress, not an RFC).

The server keeps a small record per key:

| Field | Purpose |
| :--- | :--- |
| scope | \`user + method + path + key\`, so two customers cannot collide or read each other's replies |
| state | \`processing\` while the first request runs, \`done\` afterwards |
| fingerprint | a SHA-256 hash of the request body, to catch the same key reused for a different request |
| status + body | the final response, replayed to every retry |
| expiresAt | a TTL; Stripe documents that its keys may be pruned once they are at least 24 hours old |

<svg class="iq-diagram" width="100%" viewBox="0 0 640 330" role="img" aria-label="Sequence: the client sends POST with an idempotency key, the API reserves the key in the store, the client times out, the API finishes and saves the response, the client retries with the same key and receives the saved response without a second charge">
  <defs>
    <marker id="idem-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="16" width="130" height="40" rx="8"/>
  <text class="d-text" x="85" y="41" text-anchor="middle">Client</text>
  <rect class="d-box" x="255" y="16" width="130" height="40" rx="8"/>
  <text class="d-text" x="320" y="41" text-anchor="middle">Node API</text>
  <rect class="d-box-muted" x="490" y="16" width="130" height="40" rx="8"/>
  <text class="d-text" x="555" y="41" text-anchor="middle">Key store</text>
  <path class="d-edge" d="M 85 56 L 85 320"/>
  <path class="d-edge" d="M 320 56 L 320 320"/>
  <path class="d-edge" d="M 555 56 L 555 320"/>
  <path class="d-edge" d="M 89 90 L 312 90" marker-end="url(#idem-arrow)"/>
  <text class="d-sub" x="200" y="80" text-anchor="middle">POST key K</text>
  <path class="d-edge" d="M 324 120 L 547 120" marker-end="url(#idem-arrow)"/>
  <text class="d-sub" x="437" y="110" text-anchor="middle">reserve K</text>
  <text class="d-sub" x="200" y="150" text-anchor="middle">client times out</text>
  <path class="d-edge-accent" d="M 324 190 L 547 190" marker-end="url(#idem-arrow)"/>
  <text class="d-text d-accent" x="437" y="180" text-anchor="middle">save 201 for K</text>
  <path class="d-edge" d="M 89 240 L 312 240" marker-end="url(#idem-arrow)"/>
  <text class="d-sub" x="200" y="230" text-anchor="middle">retry, same key K</text>
  <path class="d-edge-accent" d="M 316 290 L 93 290" marker-end="url(#idem-arrow)"/>
  <text class="d-text d-accent" x="200" y="280" text-anchor="middle">replay saved 201</text>
</svg>

The first request does the work exactly once; the retry is answered from the store and never reaches the payment code.

## 4. The Edge Cases That Make It Hard

A key-to-response cache sounds simple. The interview is in the edge cases:

1. **The retry arrives while the first request is still running.** There is no stored response yet. If you treat "not done" as "not seen", you charge twice. Reserve the key *before* doing the work, and answer a duplicate that finds \`processing\` with **409 Conflict** plus \`Retry-After\` (or make it wait for the result).
2. **The same key with a different body.** That is a client bug, and replaying the old response would hide it. Compare the body fingerprint and reject with **422**.
3. **The first attempt fails.** If the handler threw or returned 5xx, delete the record so a retry can run again. If it returned a 4xx business error ("card declined"), you usually store it, so the retry sees the same answer.
4. **Many instances.** The reservation must be one atomic operation in a store every instance shares. Section 7 shows what goes wrong otherwise.
5. **Expiry.** Keys need a TTL long enough to cover the client's whole retry window; after it, the same key starts a new operation.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="State of one key: no record, then processing when reserved, then done when a final response is saved; a server error deletes the record so a retry can run again">
  <defs>
    <marker id="idem-arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="60" width="150" height="56" rx="10"/>
  <text class="d-text" x="95" y="85" text-anchor="middle">no record</text>
  <text class="d-sub" x="95" y="103" text-anchor="middle">run the handler</text>
  <rect class="d-box" x="245" y="60" width="150" height="56" rx="10"/>
  <text class="d-text" x="320" y="85" text-anchor="middle">processing</text>
  <text class="d-sub" x="320" y="103" text-anchor="middle">duplicate gets 409</text>
  <rect class="d-box-accent" x="470" y="60" width="150" height="56" rx="10"/>
  <text class="d-text d-accent" x="545" y="85" text-anchor="middle">done</text>
  <text class="d-sub" x="545" y="103" text-anchor="middle">duplicate gets replay</text>
  <path class="d-edge" d="M 170 88 L 239 88" marker-end="url(#idem-arrow2)"/>
  <text class="d-sub" x="205" y="48" text-anchor="middle">reserve</text>
  <path class="d-edge" d="M 395 88 L 464 88" marker-end="url(#idem-arrow2)"/>
  <text class="d-sub" x="430" y="48" text-anchor="middle">2xx or 4xx</text>
  <path class="d-edge" d="M 320 116 L 320 170 L 95 170 L 95 122" marker-end="url(#idem-arrow2)"/>
  <text class="d-sub" x="208" y="196" text-anchor="middle">5xx or crash: delete the record</text>
</svg>

## 5. Working Example: an Express Idempotency Middleware

The full script is the first example below. The core is the middleware:

~~~js
function idempotency({ ttlMs = 24 * 60 * 60 * 1000 } = {}) {
  return (req, res, next) => {
    const key = req.get("Idempotency-Key");
    if (!key) return res.status(400).json({ error: "Idempotency-Key header required" });

    const scope = \`\${req.get("X-User")}:\${req.method}:\${req.path}:\${key}\`;
    const fingerprint = crypto.createHash("sha256").update(JSON.stringify(req.body)).digest("hex");
    const existing = idemStore.get(scope);

    if (existing && existing.expiresAt > Date.now()) {
      if (existing.fingerprint !== fingerprint) return res.status(422).json({ ... });
      if (existing.state === "processing") return res.status(409).set("Retry-After", "1").json({ ... });
      res.set("Idempotent-Replayed", "true");
      return res.status(existing.status).json(existing.body);   // replay
    }

    idemStore.set(scope, { state: "processing", fingerprint, expiresAt: ... }); // reserve FIRST

    const originalJson = res.json.bind(res);
    res.json = (body) => {                                      // capture the final response
      if (res.statusCode >= 500) idemStore.delete(scope);
      else idemStore.set(scope, { state: "done", fingerprint, status: res.statusCode, body, ... });
      return originalJson(body);
    };
    next();
  };
}
~~~

Walking through it:

- **Scope.** The stored key includes the caller and the route. Without the user, one customer guessing another's key could read their charge.
- **Fingerprint.** Hashing the body lets the middleware tell a true retry from a reused key.
- **Reserve first.** The record is written as \`processing\` before \`next()\` runs the handler. That is what turns a mid-flight duplicate into a 409 instead of a second charge.
- **Capture by wrapping \`res.json\`.** The handler stays unaware of idempotency. A production version would also capture \`res.send\` and handle streamed responses.
- **The handler** (\`createCharge\`) waits 300 ms to stand in for a slow payment provider, then records a charge.

The client gives up after 100 ms (\`AbortSignal.timeout(100)\`), which is exactly the "phone timed out but the server kept going" case.

## 6. Verified: Running the Code

~~~text
--- 1. naive POST, client times out at 100ms and retries
attempt 1: client gave up: TimeoutError
attempt 2: 201 {"id":"ch_2","amount":500}
charges created: 2 [{"id":"ch_1","amount":500},{"id":"ch_2","amount":500}]
--- 2. same story with an Idempotency-Key
attempt 1: client gave up: TimeoutError
attempt 2 (immediately): 409 {"error":"Request with this key is still in progress"}
attempt 3 (after 400ms): 201 {"id":"ch_1","amount":500} (replayed)
charges created: 1 [{"id":"ch_1","amount":500}]
--- 3. two concurrent requests, same key
request 1: 201 {"id":"ch_2","amount":900}
request 2: 409 {"error":"Request with this key is still in progress"}
--- 4. same key, different body
422 {"error":"Idempotency-Key reused with a different body"}
--- 5. no key
400 {"error":"Idempotency-Key header required"}
total charges created in 2-5: 2
~~~

What this shows:

- **Scenario 1 is the bug from the prompt.** The client saw a \`TimeoutError\`, retried, and the server ended up with two charges (\`ch_1\` and \`ch_2\`) for one tap. The server never failed; the reply was just slower than the client's patience.
- **Scenario 2 is the fix.** The immediate retry arrived while the first request was still inside its 300 ms of work, found \`processing\`, and got **409**. The retry after 400 ms got the original **201 with \`ch_1\`**, marked as replayed. One charge in total.
- **Scenario 3:** two requests fired at the same moment with the same key: one did the work, the other got 409.
- **Scenario 4:** reusing a key with a different amount was refused with **422** rather than silently returning the old charge.
- **Scenario 5:** this API makes the key mandatory on \`/charges\`. Some APIs make it optional; mandatory is safer for money.

📌 **Interview term: replay** — returning the stored response for a repeated key instead of executing the handler again. A response header such as \`Idempotent-Replayed: true\` helps clients and logs tell the two apart.

## 7. Verified: Why the Reservation Must Be Atomic

The demo above uses a \`Map\`. Because there is no \`await\` between \`get\` and \`set\`, the check and the write happen in one synchronous turn of the event loop, so nothing can sneak in between. That stops being true the moment the store is Redis or Postgres, because every call is a network round trip and yields to the event loop.

The second example simulates a shared store with a 5 ms round trip and sends two concurrent requests with the same key, once with "get, then set" and once with a single atomic "set if absent" call:

~~~text
get-then-set: 201 created | 201 created -> charges = 2
set-if-absent: 201 created | 409 in progress -> charges = 1
~~~

With get-then-set, both requests read "no record" before either wrote one, and both charged. With set-if-absent the store itself decides, so exactly one wins.

📌 **Interview term: check-then-act race** — a bug where a decision is based on a read that is already stale by the time you act on it. The fix is to make the check and the write one operation in the shared store.

In practice that one operation is:

| Store | Atomic reservation |
| :--- | :--- |
| Redis | \`SET idem:{scope} processing NX PX 86400000\` returns \`OK\` only for the first caller |
| Postgres / MySQL | a table with a unique index on \`scope\`; \`INSERT ... ON CONFLICT DO NOTHING\` and check the affected row count |
| Same database as the business write | insert the key row and the charge row in **one transaction**, so the key can never say "done" for a charge that rolled back |

The last row is the strongest option when the side effect lives in your own database. When the side effect is an external call (a payment provider), pass your key through to the provider if it accepts one, because your store cannot roll back their system.

## 8. Natural Idempotency: Design It In Where You Can

A key store is the general tool, but often you can avoid needing it:

- **Client-chosen IDs with PUT.** \`PUT /orders/2f9c...\` with a UUID the client generated is "create or replace this exact order", which is idempotent by design.
- **Unique constraints on business keys.** A unique index on \`(user_id, cart_id)\` for orders means a duplicate insert fails instead of creating a second order.
- **Upserts and absolute writes.** \`SET balance = 80\` can be retried; \`SET balance = balance - 20\` cannot. Prefer state transitions with a guard: \`UPDATE orders SET status = 'paid' WHERE id = ? AND status = 'pending'\`.
- **Consumers of queues** have the same problem from the other side, because brokers deliver at least once. The [queue consumer idempotency question](/interview-question/how-do-you-guarantee-idempotency-in-a-queue-consumer) covers deduplicating by message ID.

The client half of the story (which calls to retry, with what backoff and timeout) is in [retries and timeouts for downstream calls](/interview-question/how-do-you-handle-retries-and-timeouts-when-a-node-js-service-calls-another-down). Only retry a POST automatically when the API supports a key.

## 9. Common Pitfalls

- **Writing the key only after the work finishes.** A retry that lands mid-flight finds nothing and runs the side effect again. Reserve as \`processing\` first, as in the demo's scenario 2.
- **Check-then-set against a remote store.** Shown above: two awaits let both concurrent requests through. Use \`SET NX\`, a unique index, or a transaction.
- **Global keys.** A key not scoped by caller and endpoint can collide across users and leak one user's response to another.
- **Ignoring the body.** Replaying the old response for a different body hides client bugs. Fingerprint and reject mismatches with 422.
- **Caching server failures forever.** Storing a 500 makes the operation permanently failed for that key. Release the key on 5xx so the retry can run.
- **Keeping keys in process memory in production.** A restart or a second instance forgets them. The \`Map\` is fine for a demo only.

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it:</strong> <span style="color:#f0e2c8;">"An operation is idempotent if doing it twice leaves the server in the same state as doing it once. GET, PUT and DELETE are idempotent by HTTP semantics; POST and PATCH are not."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the failure:</strong> <span style="color:#f0e2c8;">"A client timeout does not mean the server failed. The phone retries, and a plain POST charges the card twice. I reproduced exactly that: one tap, two charges."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Give the design:</strong> <span style="color:#f0e2c8;">"The client sends an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">Idempotency-Key</code> and reuses it on retries. The server reserves the key as processing before doing the work, scoped per user and route, with a hash of the body, then stores the final response and replays it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cover the edge cases:</strong> <span style="color:#f0e2c8;">"A duplicate that arrives mid-flight gets 409 with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">Retry-After</code>; the same key with a different body gets 422; a 5xx releases the key so the retry can run; keys expire after the retry window, for example 24 hours."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Make it correct at scale:</strong> <span style="color:#f0e2c8;">"The reservation must be atomic in a shared store: Redis <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">SET NX</code> or a unique index with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">INSERT ... ON CONFLICT</code>, ideally in the same transaction as the write. Check-then-set lets two concurrent requests through."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just make the client stop retrying?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the client cannot tell a lost request from a lost response. Without retries, a timed-out payment leaves the user unsure whether they paid, which is worse. Networks, load balancers and SDKs also retry on their own. The server is the only place that can make the retry harmless.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is DELETE really idempotent if the second call returns 404?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. Idempotency is about the state of the server, not the response. After the first DELETE the resource is gone; the second one changes nothing, so the state is the same. Returning 404 or 204 on the repeat are both acceptable, as long as you document which.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where do you store the keys when you run ten Node instances?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In a store every instance shares, never in process memory. Redis with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">SET key value NX PX ttl</code> for the reservation is common; a database table with a unique index on the scope works too and lets you insert the key row and the business row in one transaction. In my demo a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">Map</code> was atomic only because there was no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">await</code> between the check and the write; with a 5 ms remote store, get-then-set let both requests charge.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the server crashes after charging the card but before saving the response?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The key is stuck in processing and the outcome is unknown, so the processing record needs its own short timeout after which a retry may proceed. To avoid a double charge in that window, pass the same key to the payment provider (most accept one), so their side deduplicates too. If the side effect is in your own database, do the key update and the write in one transaction so they cannot disagree.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why include the user ID and route in the stored key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">So that keys are unique per caller and per operation. Without it, two clients that happen to send the same key collide, and worse, one could receive the stored response of the other, which leaks data. Scoping also lets the same client safely reuse a key format across different endpoints.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Idempotent** | Doing it twice leaves the server in the same state as doing it once |
| **Safe method** | A method that should not change state at all (GET, HEAD, OPTIONS) |
| **Idempotency key** | A client-generated ID sent with every retry of one logical operation |
| **Request fingerprint** | A hash of the request body, used to detect a key reused for different input |
| **Replay** | Returning the stored response instead of running the handler again |
| **Check-then-act race** | Two callers both pass a check before either writes; fixed with one atomic operation |
| **Natural idempotency** | Designing the write so a repeat is harmless (PUT with client IDs, upserts, unique keys) |

---
**Conclusion:** idempotency is about the server's state, not the response: doing an operation twice must leave things as if it ran once. GET, PUT and DELETE are idempotent by HTTP's rules (as long as your handlers keep that promise); POST and PATCH are not, and the failure mode is real, as the naive endpoint above showed with two charges for one tap. The standard fix is an \`Idempotency-Key\` that the client reuses on retries, and a server record that is reserved before the work starts, scoped per caller and route, fingerprinted against the body, filled with the final response for replay, released on server errors, and expired after the retry window. The part that makes it correct across many Node instances is atomicity: the reservation must be one operation in the shared store, because the run above showed check-then-set letting two concurrent requests through.`,
    examples: [
      {
        label: "Express idempotency middleware: naive retry vs key, in-flight 409, body mismatch 422",
        tech: "javascript",
        runnable: false,
        code: `const express = require("express");
const crypto = require("node:crypto");

// --- the "database" -------------------------------------------------------
const charges = [];                 // every charge we actually created
const idemStore = new Map();        // stand-in for Redis / a DB table

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- idempotency middleware ----------------------------------------------
function idempotency({ ttlMs = 24 * 60 * 60 * 1000 } = {}) {
  return (req, res, next) => {
    const key = req.get("Idempotency-Key");
    if (!key) return res.status(400).json({ error: "Idempotency-Key header required" });

    const user = req.get("X-User") || "anon";             // scope keys per caller
    const scope = \`\${user}:\${req.method}:\${req.path}:\${key}\`;
    const fingerprint = crypto.createHash("sha256").update(JSON.stringify(req.body)).digest("hex");
    const now = Date.now();
    const existing = idemStore.get(scope);

    if (existing && existing.expiresAt > now) {
      if (existing.fingerprint !== fingerprint)
        return res.status(422).json({ error: "Idempotency-Key reused with a different body" });
      if (existing.state === "processing")
        return res.status(409).set("Retry-After", "1").json({ error: "Request with this key is still in progress" });
      res.set("Idempotent-Replayed", "true");
      return res.status(existing.status).json(existing.body);
    }

    // Reserve the key BEFORE doing the work. In one process this check-and-set
    // is atomic (no await in between); across instances use SET NX or a unique index.
    idemStore.set(scope, { state: "processing", fingerprint, expiresAt: now + ttlMs });

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 500) idemStore.delete(scope);   // let the client retry a server failure
      else idemStore.set(scope, { state: "done", fingerprint, status: res.statusCode, body, expiresAt: now + ttlMs });
      return originalJson(body);
    };
    next();
  };
}

// --- the endpoint ---------------------------------------------------------
async function createCharge(req, res) {
  await sleep(300);                                    // slow payment provider
  const charge = { id: "ch_" + (charges.length + 1), amount: req.body.amount };
  charges.push(charge);
  res.status(201).json(charge);
}

const app = express();
app.use(express.json());
app.post("/naive/charges", createCharge);
app.post("/charges", idempotency(), createCharge);

// --- client helpers -------------------------------------------------------
async function post(base, path, body, key, timeoutMs = 2000) {
  const headers = { "content-type": "application/json", "x-user": "u_42" };
  if (key) headers["idempotency-key"] = key;
  try {
    const r = await fetch(base + path, { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    const replay = r.headers.get("idempotent-replayed") ? " (replayed)" : "";
    return \`\${r.status} \${await r.text()}\${replay}\`;
  } catch (e) {
    return \`client gave up: \${e.name}\`;
  }
}

const server = app.listen(0, async () => {
  const base = \`http://localhost:\${server.address().port}\`;

  console.log("--- 1. naive POST, client times out at 100ms and retries");
  console.log("attempt 1:", await post(base, "/naive/charges", { amount: 500 }, null, 100));
  console.log("attempt 2:", await post(base, "/naive/charges", { amount: 500 }));
  console.log("charges created:", charges.length, JSON.stringify(charges));

  charges.length = 0;
  const key = crypto.randomUUID();
  console.log("--- 2. same story with an Idempotency-Key");
  console.log("attempt 1:", await post(base, "/charges", { amount: 500 }, key, 100));
  console.log("attempt 2 (immediately):", await post(base, "/charges", { amount: 500 }, key));
  await sleep(400);
  console.log("attempt 3 (after 400ms):", await post(base, "/charges", { amount: 500 }, key));
  console.log("charges created:", charges.length, JSON.stringify(charges));

  console.log("--- 3. two concurrent requests, same key");
  const k2 = crypto.randomUUID();
  const both = await Promise.all([
    post(base, "/charges", { amount: 900 }, k2),
    post(base, "/charges", { amount: 900 }, k2),
  ]);
  both.forEach((r, i) => console.log(\`request \${i + 1}:\`, r));

  console.log("--- 4. same key, different body");
  console.log(await post(base, "/charges", { amount: 1 }, k2));

  console.log("--- 5. no key");
  console.log(await post(base, "/charges", { amount: 1 }, null));
  console.log("total charges created in 2-5:", charges.length);
  server.close();
});`,
      },
      {
        label: "Why the key reservation must be atomic: get-then-set vs set-if-absent against an async store",
        tech: "javascript",
        runnable: false,
        code: `// A shared store reached over the network (Redis, Postgres) is async:
// every call yields to the event loop. Simulate that with a 5ms round trip.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class FakeRemoteStore {
  #data = new Map();
  async get(k) { await sleep(5); return this.#data.get(k); }
  async set(k, v) { await sleep(5); this.#data.set(k, v); }
  // Like Redis SET key value NX: check and write in ONE server-side step.
  async setIfAbsent(k, v) {
    await sleep(5);
    if (this.#data.has(k)) return false;
    this.#data.set(k, v);
    return true;
  }
}

async function run(label, reserve) {
  const store = new FakeRemoteStore();
  let charges = 0;
  async function handle(key) {
    if (!(await reserve(store, key))) return "409 in progress";
    await sleep(50);            // call the payment provider
    charges++;
    return "201 created";
  }
  const results = await Promise.all([handle("key-1"), handle("key-1")]);
  console.log(\`\${label}: \${results.join(" | ")} -> charges = \${charges}\`);
}

(async () => {
  // check, then set: two awaits, so another request can slip in between
  await run("get-then-set", async (store, key) => {
    if (await store.get(key)) return false;
    await store.set(key, "processing");
    return true;
  });
  // one atomic call
  await run("set-if-absent", (store, key) => store.setIfAbsent(key, "processing"));
})();`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How would you approach versioning a Node.js REST API?",
    seoDescription:
      "Version a Node.js REST API: tell breaking from additive changes, pick URI or header versions, share one handler, send Deprecation and Sunset headers.",
    description: `**Question presented to candidate:**
"Our Node.js REST API has web, iOS and Android clients plus a few partner integrations. Product wants the user response to return \`name\` as an object with \`first\` and \`last\` instead of one string, and old app versions stay installed for months. How would you approach versioning this API, from deciding when a new version is needed to retiring the old one?"

**What a strong answer should cover:**
- Starts with avoiding a version when possible: additive changes (new optional fields, new endpoints) are not breaking; renaming, removing, or changing the type or meaning of a field is.
- Compares the mechanisms: URI prefix (\`/v1\`), a custom header (\`Api-Version\`), media type in \`Accept\`, or date-based versions (Stripe style), with the trade-offs in visibility, caching (\`Vary\`) and routing.
- Keeps one code path: a single service and data model, with thin per-version presenters or transforms at the edge, instead of copying controllers per version.
- Defines a default for clients that send no version, and rejects unknown versions clearly.
- Has a deprecation lifecycle: announce, send \`Deprecation\` and \`Sunset\` headers plus a migration link, measure traffic per version, and only remove a version when usage is near zero.
- Protects old versions with contract tests so an internal refactor cannot silently change a published shape.

**Clarifying questions expected:**
- "Are the consumers our own apps, which we can force-upgrade, or external partners we cannot?"
- "How long must an old version be supported, and is there a contractual sunset policy?"

**Code / implementation expected:** Optional but strong. A small Express setup where \`/v1\`, \`/v2\` and a version header share one handler with per-version presenters and deprecation headers.`,
    answer: `**Target Audience:** Engineers preparing for Node.js API design interviews who can build Express routes and now need a policy for changing them.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer expects. Every code sample here was run with Node v22.22.0 and Express 5.3.0, and the output shown is the output it printed. A companion question, [How do you design REST API versioning in a Node.js service?](/interview-question/how-do-you-design-rest-api-versioning-in-a-node-js-service), compares the three routing mechanisms in depth; this one is about the whole approach, from "do we even need a version?" to switching an old one off.

## 1. Why This Even Matters — A Story First

A bakery changes its loaf from 400 g to 500 g. Walk-in customers simply notice a bigger loaf. But a café down the road has a standing order and a recipe built around 400 g slices; if the bakery silently ships 500 g, the café's sandwiches stop fitting the boxes. A sensible bakery does three things: it keeps making the old loaf for the café for a while, it tells the café the date the old loaf ends, and it checks how many old-loaf orders are still coming in before it stops.

An API is the bakery. Your mobile apps and partners are the café, and old app builds stay on phones for months. Versioning is how you change the loaf without breaking their sandwiches.

## 2. Step One: Most Changes Should Not Need a Version

The cheapest version is the one you never create. Before reaching for \`/v2\`, sort the change:

| Change | Breaking? | Why |
| :--- | :--- | :--- |
| Add a new optional field to a response | No | Well-behaved clients ignore fields they do not know. |
| Add a new endpoint | No | Nobody calls it yet. |
| Add a new optional request parameter with a default | No | Old requests behave as before. |
| Rename or remove a response field | **Yes** | Old code reads a field that is gone. |
| Change a field type (\`"name": "Ada Lovelace"\` to an object) | **Yes** | Old code calls string methods on an object. |
| Change meaning (price now in cents, not dollars) | **Yes**, and the most dangerous | Nothing crashes; numbers are silently wrong by 100x. |
| Make an optional request field required | **Yes** | Old requests now get 400. |
| Add a new value to an enum the client switches on | Often yes | A strict client may crash on an unknown value. |

📌 **Interview term: breaking change** — a change that makes a correct existing client fail or behave wrongly. Only breaking changes need a new version.

📌 **Interview term: additive (backward-compatible) evolution** — growing the API only by adding things, so old clients keep working. It relies on clients being **tolerant readers**: they ignore fields they do not understand.

The change in the prompt, turning \`name\` from a string into an object, is breaking. One alternative is to make it additive instead: keep \`name\` as a string and add \`nameParts: { first, last }\`. Many teams prefer that, and only cut a new version when a set of breaking changes has piled up.

## 3. Step Two: Pick How a Client Says Which Version

| Mechanism | Example | Good | Costs |
| :--- | :--- | :--- | :--- |
| URI prefix | \`GET /v2/users/1\` | Visible in logs and browsers, easy to route at a gateway, caches work unchanged | The URL changes although the resource did not |
| Custom header | \`Api-Version: 2\` | Stable URLs | Invisible in a link; caches need \`Vary: Api-Version\` |
| Media type | \`Accept: application/vnd.acme.v2+json\` | Purist REST: version the representation | Hardest for clients and tools |
| Date-based | \`Stripe-Version: 2024-06-20\` | Small, frequent changes; each account pinned to the version it started on | You maintain a chain of transforms between dates |

📌 **Interview term: date-based versioning** — naming versions by release date. Stripe does this: a request uses the \`Stripe-Version\` header if sent, else the version pinned by the SDK, else the account's default version, which is set at the account's first API request ([Stripe: API versioning](https://docs.stripe.com/api-versions)).

There is no single right answer. For a public or partner API, a URI prefix is the most common choice because it is obvious. Header versioning suits internal clients you control. Saying that it is a trade-off, and why, is the strong answer.

## 4. Step Three: One Code Path, Thin Presenters

The mistake that hurts most is copying the whole controller and service into a \`v2/\` folder. Every bug fix then has to land twice. Instead:

- one service and one internal data model (always the latest);
- a small **presenter** per version that maps the internal model to that version's public shape;
- version resolution in one middleware at the edge.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="Requests for version one and version two pass through one version middleware into a single service and model; only the last step, a per version presenter, differs">
  <defs>
    <marker id="ver-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="140" height="44" rx="8"/>
  <text class="d-text" x="90" y="67" text-anchor="middle">GET /v1/users/1</text>
  <rect class="d-box-muted" x="20" y="170" width="140" height="44" rx="8"/>
  <text class="d-text" x="90" y="197" text-anchor="middle">Api-Version: 2</text>
  <rect class="d-box" x="215" y="100" width="130" height="56" rx="10"/>
  <text class="d-text" x="280" y="124" text-anchor="middle">resolve</text>
  <text class="d-sub" x="280" y="142" text-anchor="middle">version</text>
  <rect class="d-box-accent" x="395" y="100" width="100" height="56" rx="10"/>
  <text class="d-text d-accent" x="445" y="124" text-anchor="middle">one</text>
  <text class="d-sub" x="445" y="142" text-anchor="middle">service</text>
  <rect class="d-box" x="535" y="40" width="90" height="44" rx="8"/>
  <text class="d-text" x="580" y="67" text-anchor="middle">v1 view</text>
  <rect class="d-box" x="535" y="170" width="90" height="44" rx="8"/>
  <text class="d-text" x="580" y="197" text-anchor="middle">v2 view</text>
  <path class="d-edge" d="M 160 62 L 209 112" marker-end="url(#ver-arrow)"/>
  <path class="d-edge" d="M 160 192 L 209 146" marker-end="url(#ver-arrow)"/>
  <path class="d-edge" d="M 345 128 L 389 128" marker-end="url(#ver-arrow)"/>
  <path class="d-edge" d="M 495 116 L 531 72" marker-end="url(#ver-arrow)"/>
  <path class="d-edge" d="M 495 140 L 531 184" marker-end="url(#ver-arrow)"/>
</svg>

Only the presenter at the far right differs per version; routing, validation, business rules and the database are shared.

## 5. Working Example

The full script is the first example below. The important pieces:

~~~js
const presenters = {
  1: (u) => ({ id: u.id, name: \`\${u.firstName} \${u.lastName}\`, email: u.email }),
  2: (u) => ({ id: u.id, name: { first: u.firstName, last: u.lastName }, email: u.email, created_at: u.createdAt }),
};
const DEFAULT_VERSION = 1;
const SUNSET = { 1: { deprecation: "@1782864000", sunset: "Wed, 30 Jun 2027 23:59:59 GMT" } };

function resolveVersion(req, res, next) {
  const m = /^\\/v(\\d+)(\\/|$)/.exec(req.path);                     // URI first
  const raw = m ? m[1] : req.get("Api-Version") ?? String(DEFAULT_VERSION); // then header
  const v = Number(raw);
  if (!SUPPORTED.includes(v)) return res.status(400).json({ error: ..., supported: SUPPORTED });
  req.apiVersion = v;
  if (!m) res.vary("Api-Version");                                  // caches must key on it
  if (SUNSET[v]) { res.set("Deprecation", ...); res.set("Sunset", ...); res.set("Link", ...); }
  next();
}

users.get("/users/:id", (req, res) => res.json(presenters[req.apiVersion](getUser(req.params.id))));
app.use("/v1", users);
app.use("/v2", users);
app.use("/", users);   // header-versioned
~~~

Notes on the choices:

- The same \`users\` router is mounted three times. There is exactly one handler.
- **Default version.** A request with no version gets v1, the oldest supported one, because the clients most likely to omit a version are old builds written before versioning existed. Some teams instead require an explicit version on every request; either way, write the rule down.
- **\`Vary: Api-Version\`.** When the version comes from a header, the URL alone no longer identifies the response, so a CDN or browser cache must include the header in its cache key.
- **Unknown versions fail loudly** with 400 and the list of supported versions, rather than falling back to a default and returning a shape the client did not ask for.

## 6. Verified: Running the Code

~~~text
GET /v1/users/1
  200 {"id":1,"name":"Ada Lovelace","email":"ada@example.com"}
  api-version=1  deprecation=@1782864000  sunset=Wed, 30 Jun 2027 23:59:59 GMT
GET /v2/users/1
  200 {"id":1,"name":{"first":"Ada","last":"Lovelace"},"email":"ada@example.com","created_at":"2026-01-05T10:00:00Z"}
  api-version=2
GET /users/1 with Api-Version: 2
  200 {"id":1,"name":{"first":"Ada","last":"Lovelace"},"email":"ada@example.com","created_at":"2026-01-05T10:00:00Z"}
  api-version=2  vary=Api-Version
GET /users/1 with no version
  200 {"id":1,"name":"Ada Lovelace","email":"ada@example.com"}
  api-version=1  deprecation=@1782864000  sunset=Wed, 30 Jun 2027 23:59:59 GMT  vary=Api-Version
GET /v3/users/1
  400 {"error":"Unsupported API version 3","supported":[1,2]}
~~~

- \`/v1\` and \`/v2\` returned the two shapes from one model and one handler.
- The header path returned v2 and added \`Vary: Api-Version\`; the prefixed paths did not need it.
- No version at all returned v1, with the deprecation headers, so even old clients are told.
- \`/v3\` was refused with the supported list.

📌 **Interview term: Deprecation and Sunset headers** — standard response headers that tell clients a version is on its way out. \`Deprecation\` (RFC 9745, March 2025) carries a structured date such as \`@1782864000\` (1 July 2026, when v1 was deprecated); \`Sunset\` (RFC 8594) carries the HTTP date after which it may stop working. A \`Link\` with \`rel="deprecation"\` points at the migration guide.

## 7. Step Four: Retire Versions on Evidence, Not Hope

Supporting versions forever is how APIs rot. A retirement plan:

1. **Announce** the new version and the sunset date in the changelog and to partners directly.
2. **Signal in-band** with \`Deprecation\`, \`Sunset\` and \`Link\` headers on every old-version response, as above. SDKs and API gateways can surface these as warnings.
3. **Measure.** Log \`apiVersion\` (and client ID or app build) on every request and chart traffic per version. You cannot retire what you cannot see.
4. **Nudge the stragglers** that the metrics name; for your own mobile apps, use a minimum-supported-build check to force an upgrade.
5. **Remove** only when traffic is near zero, and answer the old version with \`410 Gone\` plus a link to the migration guide rather than a confusing 404.

Do not confuse API versions with package versions: [semantic versioning](/interview-question/what-is-semantic-versioning-and-how-do-and-exact-versions-behave) governs your npm dependencies, while a public HTTP API usually only exposes the major number, because minor and patch changes are by definition non-breaking.

## 8. Verified: Contract Tests Keep Old Versions Honest

The quiet danger of the presenter approach is an internal refactor that changes a published shape. Here the internal model renamed \`email\` to \`emailAddress\`. One v1 presenter maps fields explicitly; the other "saves typing" with a spread. A tiny contract test using the built-in \`node:test\` runner checks what v1 promised (the second example below):

~~~text
ok 1 - v1 explicit presenter still honours the contract
not ok 2 - v1 spread presenter still honours the contract
    v1 field "email" must be string
# pass 1
# fail 1
~~~

The spread presenter still returned a 200 with plausible-looking JSON, but \`email\` was gone, so every v1 client reading \`user.email\` would break. Only the contract test noticed. Run tests like this for every supported version in CI; more on test layers in [testing strategies for Node.js](/interview-question/what-testing-strategies-and-tools-would-you-use-for-a-node-js-application).

📌 **Interview term: contract test** — a test that pins the public shape a client depends on (field names and types), independent of how the server builds it.

## 9. Common Pitfalls

- **Versioning every change.** Adding an optional field does not need \`/v2\`. Bumping too often multiplies the versions you must keep alive.
- **Copy-pasting controllers per version.** Bug fixes then land in one version and not the other. Share the logic; vary only the presenter.
- **Changing meaning without changing shape.** Switching a price from dollars to cents inside v1 breaks every client without a single error. That needs a new field or a new version.
- **Header versioning without \`Vary\`.** A cache can serve a v2 body to a v1 client for the same URL.
- **Silently defaulting unknown versions.** A typo like \`Api-Version: 22\` should get a 400, not some other version's shape.
- **No usage metrics.** Without per-version traffic you never know when it is safe to turn the old version off, so it lives forever.

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Avoid it first:</strong> <span style="color:#f0e2c8;">"Additive changes like a new optional field or endpoint are not breaking, so they need no version. Renaming, removing, or changing a field type or meaning is breaking."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Pick a mechanism:</strong> <span style="color:#f0e2c8;">"For a public or partner API I use a URI prefix like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">/v2</code> because it is visible and easy to route; a header like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">Api-Version</code> keeps URLs stable but needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">Vary</code>. Stripe-style dated versions suit APIs that change often."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Keep one code path:</strong> <span style="color:#f0e2c8;">"One service and one internal model, with a thin presenter per version at the edge. A middleware resolves the version, defaults to the oldest supported one, and returns 400 for unknown versions."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Retire on evidence:</strong> <span style="color:#f0e2c8;">"Announce a sunset date, send <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">Deprecation</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">Sunset</code> headers with a migration link, log the version on every request, and remove the old version only when its traffic is near zero."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Protect old versions:</strong> <span style="color:#f0e2c8;">"Contract tests per version pin field names and types. In my run, a spread-based v1 presenter silently lost <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">email</code> after an internal rename, and only the contract test caught it."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">URI versioning or header versioning: which would you choose and why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It depends on the consumers. For external partners I would choose the URI prefix: it shows up in logs, docs and curl commands, gateways can route on it, and caches work without extra configuration. For internal clients that we control, a header keeps the resource URL stable. Either is defensible; what matters is consistency and a clear default.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does a client get if it sends no version at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Something you decided on purpose and documented. I default to the oldest supported version, because clients that omit the version are usually old builds written before versioning existed, and giving them the newest shape would break them. The alternative is to require an explicit version and return 400 without one, which is cleaner for a brand new API.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you version when only one endpoint changes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With a URI or header version, the whole API moves to v2 but most endpoints simply share the v1 handler and presenter. Only the changed endpoint gets a new presenter. That keeps the version number meaningful for clients without duplicating code. Date-based schemes handle this more naturally, because each dated change is a small transform.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know when it is safe to delete v1?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Measure it. Log the resolved version with the client ID or app build on every request, chart it, and contact the remaining callers. Once traffic is near zero after the announced sunset date, return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">410 Gone</code> with a link to the migration guide. For our own mobile app, a minimum-supported-build check forces the last users to upgrade.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you version GraphQL the same way?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually not. GraphQL clients ask for exactly the fields they want, so adding fields never affects them, and old fields are marked with the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">@deprecated</code> directive and removed once usage tracking shows nobody queries them. That is continuous evolution rather than numbered versions.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Breaking change** | A change that makes a correct existing client fail or misbehave |
| **Additive evolution** | Only adding optional fields and endpoints, so old clients keep working |
| **Tolerant reader** | A client that ignores fields it does not recognise |
| **URI versioning** | The version in the path, such as \`/v2/users\` |
| **Header versioning** | The version in a request header, such as \`Api-Version: 2\`; needs \`Vary\` |
| **Date-based versioning** | Versions named by release date and pinned per account (Stripe) |
| **Presenter** | A small function mapping the internal model to one version's public shape |
| **Deprecation / Sunset headers** | Response headers announcing when a version was deprecated and when it ends |
| **Contract test** | A test that pins the public fields and types a client relies on |

---
**Conclusion:** approach versioning as a lifecycle, not a URL pattern. First avoid it: additive changes are not breaking, and many breaking changes can be turned into additive ones. When a real break is needed, pick a mechanism that suits your consumers (a URI prefix for public and partner APIs, a header for clients you control, dated versions if you change often), keep one service and data model with thin per-version presenters, define a default and reject unknown versions, and add \`Vary\` when the version lives in a header. Then retire old versions deliberately: announce, send \`Deprecation\` and \`Sunset\` headers, measure traffic per version, and remove only when it reaches zero. Contract tests per version catch the silent shape changes that otherwise slip through, as the spread-based presenter above showed.`,
    examples: [
      {
        label: "Express: /v1, /v2 and an Api-Version header sharing one handler, with Deprecation and Sunset headers",
        tech: "javascript",
        runnable: false,
        code: `const express = require("express");

// One source of truth: the service always returns the LATEST internal model.
const db = { 1: { id: 1, firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", createdAt: "2026-01-05T10:00:00Z" } };
const getUser = (id) => db[id];

// Each version is a thin presenter over that model.
const presenters = {
  1: (u) => ({ id: u.id, name: \`\${u.firstName} \${u.lastName}\`, email: u.email }),
  2: (u) => ({ id: u.id, name: { first: u.firstName, last: u.lastName }, email: u.email, created_at: u.createdAt }),
};
const SUPPORTED = Object.keys(presenters).map(Number);   // [1, 2]
const DEFAULT_VERSION = 1;                               // what an unversioned old client gets
const SUNSET = { 1: { deprecation: "@1782864000", sunset: "Wed, 30 Jun 2027 23:59:59 GMT" } };

// Resolve the version from the URL prefix first, then the Api-Version header.
function resolveVersion(req, res, next) {
  const m = /^\\/v(\\d+)(\\/|$)/.exec(req.path);
  const raw = m ? m[1] : req.get("Api-Version") ?? String(DEFAULT_VERSION);
  const v = Number(raw);
  if (!SUPPORTED.includes(v))
    return res.status(400).json({ error: \`Unsupported API version \${raw}\`, supported: SUPPORTED });
  req.apiVersion = v;
  res.set("Api-Version", String(v));
  if (!m) res.vary("Api-Version");            // caches must key on the header
  if (SUNSET[v]) {
    res.set("Deprecation", SUNSET[v].deprecation);
    res.set("Sunset", SUNSET[v].sunset);
    res.set("Link", '</docs/migrate-v1-to-v2>; rel="deprecation"');
  }
  next();
}

const users = express.Router();
users.get("/users/:id", (req, res) => {
  const u = getUser(req.params.id);
  if (!u) return res.status(404).json({ error: "not found" });
  res.json(presenters[req.apiVersion](u));
});

const app = express();
app.use(resolveVersion);
app.use("/v1", users);
app.use("/v2", users);
app.use("/", users);                            // header-versioned path

const server = app.listen(0, async () => {
  const base = \`http://localhost:\${server.address().port}\`;
  const show = async (label, path, headers = {}) => {
    const r = await fetch(base + path, { headers });
    const h = ["api-version", "deprecation", "sunset", "vary"].map((k) => r.headers.get(k) && \`\${k}=\${r.headers.get(k)}\`).filter(Boolean);
    console.log(\`\${label}\\n  \${r.status} \${await r.text()}\\n  \${h.join("  ")}\`);
  };
  await show("GET /v1/users/1", "/v1/users/1");
  await show("GET /v2/users/1", "/v2/users/1");
  await show("GET /users/1 with Api-Version: 2", "/users/1", { "api-version": "2" });
  await show("GET /users/1 with no version", "/users/1");
  await show("GET /v3/users/1", "/v3/users/1");
  server.close();
});`,
      },
      {
        label: "node:test contract test that catches a silent v1 shape change after an internal rename",
        tech: "javascript",
        runnable: false,
        code: `const test = require("node:test");
const assert = require("node:assert");

// The internal model just renamed email -> emailAddress (an internal refactor).
const user = { id: 1, firstName: "Ada", lastName: "Lovelace", emailAddress: "ada@example.com" };

// Two ways to write the v1 presenter.
const v1Explicit = (u) => ({ id: u.id, name: \`\${u.firstName} \${u.lastName}\`, email: u.emailAddress });
const v1Spread = (u) => ({ ...u, name: \`\${u.firstName} \${u.lastName}\` });

// What v1 clients were promised. Extra fields are allowed (additive);
// every promised field must still exist with the promised type.
const V1_CONTRACT = { id: "number", name: "string", email: "string" };
const checkContract = (body) => {
  for (const [field, type] of Object.entries(V1_CONTRACT))
    assert.strictEqual(typeof body[field], type, \`v1 field "\${field}" must be \${type}\`);
};

test("v1 explicit presenter still honours the contract", () => checkContract(v1Explicit(user)));
test("v1 spread presenter still honours the contract", () => checkContract(v1Spread(user)));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you handle file uploads in a Node.js/Express application?",
    seoDescription:
      "Build a safe Express upload endpoint with multer: size limits, file filters, magic-byte checks, generated filenames and pre-signed URLs for large files.",
    description: `**Question presented to candidate:**
"Users need to upload a profile picture to our Express API. How would you build that endpoint, and what would you do to make sure a 2 GB file, a disguised script, or a filename like \`../../etc/passwd\` cannot hurt us? Would your answer change for large video files?"

**What a strong answer should cover:**
- Knows that browsers send files as \`multipart/form-data\`, which \`express.json()\` does not parse, and uses a streaming parser such as \`multer\` (built on \`busboy\`) instead of reading the whole body into memory.
- Sets limits in the parser: maximum file size, number of files, number of fields, and maps the resulting errors to proper status codes (413 for too large, 400 for an unexpected field).
- Treats every client-supplied value as untrusted: the declared \`Content-Type\` and the filename. Checks the real file signature (magic bytes), stores under a server-generated name, and never builds a path from \`originalname\`.
- Picks a storage strategy: disk or object storage for real files, memory storage only for small files, and for large files a direct-to-object-storage upload with a pre-signed URL so the bytes do not pass through Node at all.
- Mentions follow-ups: cleaning up partial or rejected files, serving uploads from a separate domain or bucket with a safe \`Content-Type\`, malware scanning and image re-encoding for user content.

**Clarifying questions expected:**
- "What file types and maximum size do we accept, and how many files per request?"
- "Where should the files end up: local disk, S3 or similar, or a database?"
- "Will we run several instances?" (local disk then stops being a good place)

**Code / implementation expected:** Yes. An Express route with \`multer\`, limits, a file filter, a magic-byte check and an error handler, plus the reasoning for when to switch to pre-signed direct uploads.`,
    answer: `**Target Audience:** Engineers preparing for Node.js and Express interviews who have handled JSON bodies but not files.
**Difficulty:** Medium

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer expects. Every code sample here was run with Node v22.22.0, Express 5.3.0 and multer 2.4.0, and the output shown is the output it printed. How a streaming multipart parser works chunk by chunk is covered in [streaming multipart uploads with busboy and multer](/interview-question/how-do-you-handle-streaming-multipart-file-uploads-busboy-multer); this question is about building a safe upload endpoint end to end.

## 1. Why This Even Matters — A Story First

A post office accepts parcels from anyone. A careful one weighs each parcel at the counter and refuses anything over the limit before it is carried into the building. It does not trust the label that says "books" without a quick look. It writes its own tracking number on the box rather than filing it under whatever name the sender scribbled. And for furniture, it sends a truck straight to the warehouse instead of squeezing a sofa through the front counter.

An upload endpoint needs the same habits: a size limit enforced while the bytes arrive, a check of what the file really is, a server-chosen name, and a separate route for very large files.

## 2. How a File Reaches Express

An HTML form with \`enctype="multipart/form-data"\`, or \`fetch\` with a \`FormData\` body, sends one request whose body is split into **parts**, separated by a random boundary string. Each part has its own small headers: text fields carry a name and a value; file parts also carry a \`filename\` and a \`Content-Type\`, both written by the client.

📌 **Interview term: \`multipart/form-data\`** — the request encoding that lets one HTTP body carry several named parts, including binary files. The \`Content-Type\` header includes the \`boundary\` that separates the parts.

\`express.json()\` and \`express.urlencoded()\` do not understand this format. Sending a file and a text field to a route that only has \`express.json()\`:

~~~text
200 {"contentType":"multipart/form-data","body":"undefined"}
~~~

The request succeeded, but \`req.body\` was \`undefined\` (in Express 5 it stays undefined when no parser matched). You need a multipart parser. In Express the usual choice is **multer**, which is built on the streaming parser **busboy**: it reads the file part by part as it arrives, so a big upload never has to sit in memory all at once.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="Upload pipeline: the request stream enters multer which enforces limits and a file filter, the file streams to storage under a generated name, then a magic byte check runs before the route handler responds">
  <defs>
    <marker id="up-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="16" y="40" width="120" height="60" rx="10"/>
  <text class="d-text" x="76" y="66" text-anchor="middle">request</text>
  <text class="d-sub" x="76" y="86" text-anchor="middle">multipart</text>
  <rect class="d-box" x="176" y="40" width="130" height="60" rx="10"/>
  <text class="d-text" x="241" y="66" text-anchor="middle">multer</text>
  <text class="d-sub" x="241" y="86" text-anchor="middle">limits, filter</text>
  <rect class="d-box" x="346" y="40" width="130" height="60" rx="10"/>
  <text class="d-text" x="411" y="66" text-anchor="middle">storage</text>
  <text class="d-sub" x="411" y="86" text-anchor="middle">uuid name</text>
  <rect class="d-box-accent" x="516" y="40" width="110" height="60" rx="10"/>
  <text class="d-text d-accent" x="571" y="66" text-anchor="middle">handler</text>
  <text class="d-sub" x="571" y="86" text-anchor="middle">201</text>
  <path class="d-edge" d="M 136 70 L 170 70" marker-end="url(#up-arrow)"/>
  <path class="d-edge" d="M 306 70 L 340 70" marker-end="url(#up-arrow)"/>
  <path class="d-edge" d="M 476 70 L 510 70" marker-end="url(#up-arrow)"/>
  <rect class="d-box-muted" x="176" y="150" width="300" height="50" rx="10"/>
  <text class="d-text" x="326" y="172" text-anchor="middle">error handler</text>
  <text class="d-sub" x="326" y="190" text-anchor="middle">413, 415, 400</text>
  <path class="d-edge" d="M 241 100 L 241 144" marker-end="url(#up-arrow)"/>
  <path class="d-edge" d="M 411 100 L 411 144" marker-end="url(#up-arrow)"/>
</svg>

Each stage can reject the upload; every rejection goes to one error handler that turns it into the right status code.

## 3. Working Example: a Safe Avatar Endpoint

The full script is the first example below. The configuration:

~~~js
const ALLOWED = { "image/png": ".png", "image/jpeg": ".jpg" };

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + ALLOWED[file.mimetype]), // never originalname
  }),
  limits: { fileSize: 1024 * 1024, files: 1, fields: 5 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED[file.mimetype]) return cb(Object.assign(new Error("Only PNG or JPEG"), { status: 415 }));
    cb(null, true);
  },
});

app.post("/avatars", upload.single("avatar"), checkMagicBytes, (req, res) => {
  res.status(201).json({ stored: req.file.filename, size: req.file.size, title: req.body.title });
});
~~~

And the two pieces that do the security work:

- **\`checkMagicBytes\`** opens the saved file, reads its first 4 bytes and compares them with the known signature for the declared type (\`89 50 4E 47\` for PNG, \`FF D8 FF\` for JPEG). On a mismatch it deletes the file and replies 415.
- **The error handler** catches \`multer.MulterError\` and maps \`LIMIT_FILE_SIZE\` to **413 Payload Too Large** and the other multer codes to 400; other errors use their own \`status\`.

📌 **Interview term: magic bytes (file signature)** — the fixed first bytes that identify a file format. Unlike the \`Content-Type\` and the extension, which the client chooses, they come from the file's actual content.

📌 **Interview term: \`upload.single(field)\`** — the multer middleware that accepts exactly one file in the named form field and exposes it as \`req.file\`; text fields arrive on \`req.body\`. A file in any other field is rejected with \`LIMIT_UNEXPECTED_FILE\`.

## 4. Verified: Running the Code

The script sends six uploads with \`fetch\` and \`FormData\`, then lists the upload folder:

~~~text
1. valid 20 KB PNG with a hostile filename
  fileFilter sees: field=avatar type=image/png name=passwd.png body.title=my avatar
  -> 201 {"stored":"44099afa-46b8-43cd-9565-93eeb9fdc4a7.png","size":20000,"title":"my avatar"}
2. 2 MB PNG (limit is 1 MB)
  fileFilter sees: field=avatar type=image/png name=big.png body.title=my avatar
  -> 413 {"error":"LIMIT_FILE_SIZE","field":"avatar"}
3. a PDF
  fileFilter sees: field=avatar type=application/pdf name=cv.pdf body.title=my avatar
  -> 415 {"error":"Only PNG or JPEG"}
4. a text file that claims to be a PNG
  fileFilter sees: field=avatar type=image/png name=cat.png body.title=my avatar
  -> 415 {"error":"File content does not match its declared type"}
5. file sent under the wrong field name
  -> 400 {"error":"LIMIT_UNEXPECTED_FILE","field":"photo"}
6. valid PNG, but the title field comes AFTER the file
  fileFilter sees: field=avatar type=image/png name=b.png body.title=undefined
  -> 201 {"stored":"c9bfe033-14af-4a2a-bb6c-bb43458cb226.png","size":100,"title":"my avatar"}
files on disk: 2 [ '<uuid>.png', '<uuid>.png' ]
~~~

And this is the part header the client actually put on the wire for upload 1, printed by serialising the same \`FormData\` with \`new Response(form).text()\`:

~~~text
Content-Disposition: form-data; name="avatar"; filename="../../etc/passwd.png"
~~~

What each line proves:

1. **Hostile filename.** The client really sent \`filename="../../etc/passwd.png"\` (the header above), and by the time it reached \`fileFilter\` multer had reduced it to \`passwd.png\`. That stripping helps, but the name is still attacker-chosen, so the file was stored as a UUID instead.
2. **Too large.** The 2 MB file hit the 1 MB limit, the error handler turned \`LIMIT_FILE_SIZE\` into **413**, and the final listing shows only two files: multer removed the partly written file.
3. **Wrong declared type.** The PDF was refused in \`fileFilter\`, before anything was written to disk.
4. **Disguised file.** A text file that claimed \`image/png\` and was named \`cat.png\` passed \`fileFilter\`, because that filter can only see what the client declared. The magic-byte check caught it and deleted it: **415**.
5. **Unexpected field.** A file in field \`photo\` instead of \`avatar\` got **400 \`LIMIT_UNEXPECTED_FILE\`**.
6. **Field order.** When the \`title\` field came after the file in the form, \`req.body.title\` was \`undefined\` inside \`fileFilter\` but present in the route handler. multer fills \`req.body\` as it parses, in the order the client sent the parts, so do not make filter decisions based on fields; validate fields in the handler.

## 5. Where Should the Bytes Go?

| Option | How | Good for | Watch out for |
| :--- | :--- | :--- | :--- |
| \`multer.memoryStorage()\` | File arrives as \`req.file.buffer\` | Small files you immediately process (resize, forward) | Every concurrent upload sits in RAM; keep \`fileSize\` small |
| \`multer.diskStorage()\` | Streamed to a local folder | One server, or a temp step before processing | Local disk is not shared between instances or containers |
| Stream to object storage | A custom storage engine or \`@aws-sdk/lib-storage\` piping the file stream to S3 or similar | Many instances, durable storage | Node still carries every byte |
| **Pre-signed direct upload** | API returns a short-lived signed URL; the browser PUTs the file straight to the bucket | Large files such as video | You must confirm the upload afterwards (callback or event) |

📌 **Interview term: pre-signed URL** — a URL to an object-storage location that carries a signature and an expiry, granting one specific upload (or download) without giving the client any credentials. The Node API only signs; the file bytes skip the API entirely.

For the video part of the prompt, the pre-signed route is the usual answer: a 2 GB upload through Node ties up a connection and bandwidth on your API for minutes, while the bucket is built for it. Node then only handles the small "upload finished" notification, and a background worker transcodes or scans the file (see [background job queues](/interview-question/what-is-a-background-job-queue-bullmq-redis-and-when-do-you-need-one)).

If you do stream large files through Node yourself, pipe them with [\`stream.pipeline()\`](/interview-question/why-is-stream-pipeline-preferred-over-pipe-for-chaining-streams) so a failed destination destroys the source and nothing leaks, and let [backpressure](/interview-question/what-is-backpressure-in-node-js-streams-and-how-do-you-handle-it) slow the client down instead of buffering.

## 6. Serving What You Stored

Accepting the file safely is half the job:

- Serve user uploads from a **separate domain or a bucket**, not your app origin, so an uploaded HTML or SVG file cannot run script with your cookies.
- Send a fixed, safe \`Content-Type\` from your allowlist and \`X-Content-Type-Options: nosniff\`, and use \`Content-Disposition: attachment\` for anything that should download rather than display.
- For images, **re-encode** them (for example with an image library) to strip metadata and anything hidden after the image data; for documents, run a malware scanner in a background job before marking the file as available.

More general hardening is in [Node.js security best practices](/interview-question/what-are-some-common-security-best-practices-in-node-js-applications).

## 7. Common Pitfalls

- **No size limit.** Without \`limits.fileSize\`, one client can fill your disk or, with memory storage, your RAM. Set limits in multer and also at the reverse proxy (for example Nginx \`client_max_body_size\`).
- **Trusting \`file.mimetype\` or the extension.** Both come from the client. The disguised PNG above passed the filter and was only caught by the magic-byte check.
- **Building paths from \`originalname\`.** Even after multer strips directory parts, the name can collide, contain odd Unicode, or carry an extension like \`.html\`. Generate the stored name yourself and keep the original only as display metadata.
- **Forgetting the error handler.** Without it, a too-large file becomes a generic 500, and clients cannot tell "file too big" from "server broken".
- **Local disk with several instances.** Instance A stores the file, the next request hits instance B, which has no such file. Use shared object storage.
- **Large files through the API by default.** For video and other big files, pre-signed direct uploads keep the bytes off your Node process.

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Name the format and the tool:</strong> <span style="color:#f0e2c8;">"Files arrive as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">multipart/form-data</code>, which <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">express.json()</code> ignores. I use multer, which is built on the streaming parser busboy, so the file is processed as it arrives instead of being buffered whole."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Set limits:</strong> <span style="color:#f0e2c8;">"I configure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">fileSize</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">files</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">fields</code> limits in multer and map <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">LIMIT_FILE_SIZE</code> to 413 in an error handler. multer also removed the partly written file when I tested a 2 MB upload against a 1 MB limit."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Distrust the client:</strong> <span style="color:#f0e2c8;">"The declared <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">Content-Type</code>, the extension and the filename all come from the client. I allowlist types in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">fileFilter</code>, then check the real magic bytes, and store the file under a server-generated UUID name."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Choose storage:</strong> <span style="color:#f0e2c8;">"Memory storage only for small files I process right away, disk for a single server, and object storage like S3 once there are several instances."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Handle large files differently:</strong> <span style="color:#f0e2c8;">"For video I return a pre-signed URL so the browser uploads straight to the bucket; Node only signs the URL and handles the completion event, and a background job scans or transcodes."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is checking <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">file.mimetype</code> in fileFilter not enough?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the browser or attacker sets it. In my test a text file sent as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">image/png</code> with the name <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">cat.png</code> passed the filter. Only reading the first bytes of the stored file and comparing them with the PNG signature rejected it. For user-facing images I would also re-encode them, which removes anything hidden in the file.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between memoryStorage and diskStorage?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">memoryStorage gives you <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">req.file.buffer</code> with the whole file in RAM, which is convenient for small files you immediately resize or forward, but ten concurrent 50 MB uploads mean 500 MB of memory. diskStorage streams the file to a folder and gives you <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">req.file.path</code>, so memory stays flat, but local disk is not shared between instances.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you show upload progress to the user?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Progress is measured on the client, since it knows how many bytes it has sent: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">XMLHttpRequest</code> exposes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">upload.onprogress</code>, and many upload libraries wrap that. With S3 multipart uploads (one pre-signed URL per part), the client uploads in parts and reports progress per part, which also lets it resume a failed upload instead of starting over.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">A field the handler needs is undefined in fileFilter. Why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">multer fills <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">req.body</code> in the order the parts arrive. If the client appends the text field after the file, the field has not been parsed yet when the file part reaches <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">fileFilter</code>. I saw exactly that: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">req.body.title</code> was undefined in the filter and present in the handler. Either have clients send fields first, or make the decision in the handler.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you stop someone from uploading a 10 GB file to fill the disk?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Limit at every layer: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">client_max_body_size</code> or the equivalent at the proxy, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">limits.fileSize</code> in multer so the stream is cut off while the bytes are arriving, rate limiting per user, and per-user storage quotas. With direct uploads to object storage, an S3 pre-signed POST policy can set a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">content-length-range</code> so oversized uploads are refused by the bucket.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`multipart/form-data\`** | Request encoding with several named parts, used for file uploads |
| **multer** | Express middleware for multipart uploads, built on busboy |
| **busboy** | The streaming multipart parser underneath multer |
| **\`limits\`** | multer options that cap file size, file count and field count |
| **\`fileFilter\`** | A multer callback that accepts or rejects each file before it is stored |
| **Magic bytes** | The first bytes of a file that identify its real format |
| **Storage engine** | Where multer writes the file: memory, disk or a custom target |
| **Pre-signed URL** | A short-lived signed URL that lets a client upload straight to object storage |

---
**Conclusion:** an Express upload endpoint needs a multipart parser, because \`express.json()\` leaves \`req.body\` undefined for \`multipart/form-data\`; multer, on top of busboy, streams the file instead of buffering it. The safety comes from treating every client value as untrusted: enforce \`fileSize\`, \`files\` and \`fields\` limits so oversized uploads are cut off (413, with the partial file removed, as the run showed), allowlist types in \`fileFilter\`, confirm the real type with magic bytes (which caught a text file posing as a PNG), store under a generated name, and map multer errors to clear status codes. For large files such as video, have the API hand out a pre-signed URL so the browser uploads straight to object storage and Node only handles the small confirmation.`,
    examples: [
      {
        label: "Express + multer: limits, fileFilter, magic-byte check, generated names and an error handler",
        tech: "javascript",
        runnable: false,
        code: `const express = require("express");
const multer = require("multer");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const UPLOAD_DIR = path.join(__dirname, "uploads");
fs.rmSync(UPLOAD_DIR, { recursive: true, force: true });
fs.mkdirSync(UPLOAD_DIR);

const ALLOWED = { "image/png": ".png", "image/jpeg": ".jpg" };
const MAGIC = { "image/png": [0x89, 0x50, 0x4e, 0x47], "image/jpeg": [0xff, 0xd8, 0xff] };

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    // never trust originalname for the path on disk
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + ALLOWED[file.mimetype]),
  }),
  limits: { fileSize: 1024 * 1024, files: 1, fields: 5 },     // 1 MB, one file
  fileFilter: (req, file, cb) => {
    console.log(\`  fileFilter sees: field=\${file.fieldname} type=\${file.mimetype} name=\${file.originalname} body.title=\${req.body.title}\`);
    if (!ALLOWED[file.mimetype]) return cb(Object.assign(new Error("Only PNG or JPEG"), { status: 415 }));
    cb(null, true);
  },
});

// The Content-Type above came from the client. Check the real bytes too.
function checkMagicBytes(req, res, next) {
  const fd = fs.openSync(req.file.path, "r");
  const head = Buffer.alloc(4);
  fs.readSync(fd, head, 0, 4, 0);
  fs.closeSync(fd);
  const ok = MAGIC[req.file.mimetype].every((b, i) => head[i] === b);
  if (!ok) {
    fs.unlinkSync(req.file.path);
    return res.status(415).json({ error: "File content does not match its declared type" });
  }
  next();
}

const app = express();
app.post("/avatars", upload.single("avatar"), checkMagicBytes, (req, res) => {
  res.status(201).json({ stored: req.file.filename, size: req.file.size, title: req.body.title });
});

// Multer reports problems as errors; map them to proper status codes.
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return res.status(status).json({ error: err.code, field: err.field });
  }
  res.status(err.status || 500).json({ error: err.message });
});

const png = (size) => {
  const b = Buffer.alloc(size, 0);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b);
  return b;
};

const server = app.listen(0, async () => {
  const url = \`http://localhost:\${server.address().port}/avatars\`;
  async function send(label, { field = "avatar", bytes, type, name, titleFirst = true }) {
    console.log(label);
    const form = new FormData();
    if (titleFirst) form.append("title", "my avatar");
    form.append(field, new Blob([bytes], { type }), name);
    if (!titleFirst) form.append("title", "my avatar");
    const r = await fetch(url, { method: "POST", body: form });
    console.log(\`  -> \${r.status} \${await r.text()}\`);
  }
  await send("1. valid 20 KB PNG with a hostile filename", { bytes: png(20_000), type: "image/png", name: "../../etc/passwd.png" });
  await send("2. 2 MB PNG (limit is 1 MB)", { bytes: png(2 * 1024 * 1024), type: "image/png", name: "big.png" });
  await send("3. a PDF", { bytes: Buffer.from("%PDF-1.7"), type: "application/pdf", name: "cv.pdf" });
  await send("4. a text file that claims to be a PNG", { bytes: Buffer.from("<script>alert(1)</script>"), type: "image/png", name: "cat.png" });
  await send("5. file sent under the wrong field name", { field: "photo", bytes: png(100), type: "image/png", name: "a.png" });
  await send("6. valid PNG, but the title field comes AFTER the file", { bytes: png(100), type: "image/png", name: "b.png", titleFirst: false });
  console.log("files on disk:", fs.readdirSync(UPLOAD_DIR).length, fs.readdirSync(UPLOAD_DIR).map((f) => f.replace(/^[0-9a-f-]{36}/, "<uuid>")));
  server.close();
});`,
      },
      {
        label: "Why you need a multipart parser: express.json() leaves req.body undefined for FormData",
        tech: "javascript",
        runnable: false,
        code: `const express = require("express");
const app = express();
app.use(express.json());
app.post("/avatars", (req, res) => res.json({ contentType: req.get("content-type").split(";")[0], body: req.body ?? "undefined" }));
const server = app.listen(0, async () => {
  const form = new FormData();
  form.append("title", "my avatar");
  form.append("avatar", new Blob([Buffer.alloc(10)], { type: "image/png" }), "a.png");
  const r = await fetch(\`http://localhost:\${server.address().port}/avatars\`, { method: "POST", body: form });
  console.log(r.status, await r.text());
  server.close();
});`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How would you implement request validation in a Node.js/Express API?",
    seoDescription:
      "Validate Express requests with one schema middleware: check body, query and params, coerce strings, return every issue in a consistent 400 response.",
    description: `**Question presented to candidate:**
"Our Express API has validation code scattered through the route handlers: a few \`if (!req.body.email)\` checks here, a \`parseInt\` there, and every route returns errors in a different format. How would you implement request validation properly?"

**What a strong answer should cover:**
- Validates at the edge, before the handler runs, with a reusable middleware that checks \`req.body\`, \`req.query\` and \`req.params\` against a declared schema (zod, joi, ajv with JSON Schema, or express-validator).
- Knows query strings and route params are always strings, so the schema must coerce them (\`"50"\` to \`50\`) and apply defaults and ranges (for example a \`limit\` capped at 100).
- Returns a consistent 400 response listing every problem with its location and field, not only the first one, and routes body-parser failures (malformed JSON, payload too large) into the same format.
- Hands the parsed, typed values to the handler (for example \`req.valid\`), and does not trust raw \`req.body\` afterwards; decides between rejecting and stripping unknown fields.
- Separates shape validation from business rules that need the database (email already taken, which is a 409), and treats validation as input checking, not a replacement for parameterized queries or authorization.

**Clarifying questions expected:**
- "Should unknown fields be rejected or silently removed?"
- "Do we already publish an OpenAPI spec that the validation should come from?"

**Code / implementation expected:** Yes. A \`validate(schemas)\` middleware with zod or similar, a schema for a body and for a query string, and the shared error format.`,
    answer: `**Target Audience:** Beginners and juniors preparing for Node.js and Express interviews.
**Difficulty:** Easy

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer expects. Every code sample here was run with Node v22.22.0, Express 5.3.0 and zod 4.6.7, and the output shown is the output it printed. The security side of schemas (stripping fields like \`isAdmin\`) is covered in [validating and sanitizing input with zod or joi](/interview-question/how-do-you-validate-and-sanitize-request-input-zod-joi); this question is about wiring validation into an Express app cleanly.

## 1. Why This Even Matters — A Story First

At an airport, your passport is checked once, at the border desk, by trained staff with clear rules. Imagine instead that every shop, café and gate in the terminal did its own half-check: one looks at the photo, one only checks the expiry date, one forgets. Some people would get through who should not, and each would be turned away with a different explanation.

Scattered \`if (!req.body.email)\` checks are those shops. Good validation is the border desk: **one checkpoint, at the entrance, with written rules**, and everything past it can trust what it receives.

## 2. The Idea

📌 **Interview term: request validation** — checking that incoming data has the expected shape, types and ranges before your business logic uses it, and rejecting it with a clear client error (400) if not.

📌 **Interview term: schema** — a declaration of what valid data looks like ("\`email\` is an email, \`age\` is an integer of at least 13"). Libraries such as **zod**, **joi** and **ajv** (JSON Schema) check data against it and report every problem they find.

The plan has four parts:

1. Write a schema per route input: \`body\`, \`query\`, \`params\`.
2. Run one reusable **validation middleware** before the handler (see [middleware in Express](/interview-question/explain-the-concept-of-middleware-in-express-js)).
3. On failure, reply **400** with every issue in one consistent format.
4. On success, give the handler the **parsed** values, with numbers already numbers and defaults filled in.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 220" role="img" aria-label="A request passes the JSON body parser then the validation middleware; invalid input leaves with a 400 response listing every issue, valid input reaches the handler as typed parsed values">
  <defs>
    <marker id="val-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="16" y="40" width="120" height="56" rx="10"/>
  <text class="d-text" x="76" y="73" text-anchor="middle">request</text>
  <rect class="d-box" x="176" y="40" width="130" height="56" rx="10"/>
  <text class="d-text" x="241" y="64" text-anchor="middle">body parser</text>
  <text class="d-sub" x="241" y="82" text-anchor="middle">express.json</text>
  <rect class="d-box" x="346" y="40" width="130" height="56" rx="10"/>
  <text class="d-text" x="411" y="64" text-anchor="middle">validate</text>
  <text class="d-sub" x="411" y="82" text-anchor="middle">schema</text>
  <rect class="d-box-accent" x="516" y="40" width="110" height="56" rx="10"/>
  <text class="d-text d-accent" x="571" y="64" text-anchor="middle">handler</text>
  <text class="d-sub" x="571" y="82" text-anchor="middle">req.valid</text>
  <path class="d-edge" d="M 136 68 L 170 68" marker-end="url(#val-arrow)"/>
  <path class="d-edge" d="M 306 68 L 340 68" marker-end="url(#val-arrow)"/>
  <path class="d-edge-accent" d="M 476 68 L 510 68" marker-end="url(#val-arrow)"/>
  <rect class="d-box-muted" x="176" y="146" width="300" height="50" rx="10"/>
  <text class="d-text" x="326" y="168" text-anchor="middle">400 ValidationError</text>
  <text class="d-sub" x="326" y="186" text-anchor="middle">every issue, one format</text>
  <path class="d-edge" d="M 241 96 L 241 140" marker-end="url(#val-arrow)"/>
  <path class="d-edge" d="M 411 96 L 411 140" marker-end="url(#val-arrow)"/>
</svg>

Malformed JSON fails at the body parser, a wrong shape fails at the validator; both leave through the same 400 format, and the handler only ever sees valid data.

## 3. Working Example: a \`validate()\` Middleware

The full script is the first example below. The middleware is about a dozen lines:

~~~js
const validate = (schemas) => (req, res, next) => {
  const issues = [];
  req.valid = {};
  for (const part of ["params", "query", "body"]) {
    if (!schemas[part]) continue;
    const result = schemas[part].safeParse(req[part] ?? {});
    if (result.success) req.valid[part] = result.data;
    else for (const i of result.error.issues)
      issues.push({ in: part, path: i.path.join(".") || "(root)", message: i.message });
  }
  if (issues.length) return res.status(400).json({ error: "ValidationError", issues });
  next();
};
~~~

The schemas:

~~~js
const createUser = z.strictObject({            // strict: unknown keys are an error
  email: z.email(),
  age: z.number().int().min(13),
  role: z.enum(["reader", "editor"]).default("reader"),
});

const listProducts = z.object({                 // query strings: coerce, default, cap
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["price", "name"]).optional(),
});

app.post("/users", validate({ body: createUser }), (req, res) => res.status(201).json(req.valid.body));
app.get("/products", validate({ query: listProducts }), (req, res) => res.json({ raw: req.query, valid: req.valid.query }));
~~~

Key choices:

- **\`safeParse\`** returns \`{ success, data | error }\` instead of throwing, so the middleware can collect issues from body, query and params together.
- **\`z.strictObject\`** rejects unknown keys. Plain \`z.object\` would silently drop them instead; both are valid policies, but choose one on purpose.
- **\`z.coerce.number()\`** for the query, because \`?limit=50\` arrives as the string \`"50"\`. The body uses plain \`z.number()\`, because JSON can carry a real number and a string there is a client bug.
- A final **error handler** turns body-parser failures (\`entity.parse.failed\`, \`entity.too.large\`) into the same shape, so clients parse one error format.

📌 **Interview term: coercion** — converting an input to the expected type before checking it, such as the string \`"50"\` to the number \`50\`. Needed for query strings and route params, which are always strings.

## 4. Verified: Running the Code

~~~text
1. valid body
  201 {"email":"ada@example.com","age":36,"role":"reader"}
2. three mistakes at once
  400 {"error":"ValidationError","issues":[{"in":"body","path":"email","message":"Invalid email address"},{"in":"body","path":"age","message":"Invalid input: expected number, received string"},{"in":"body","path":"role","message":"Invalid option: expected one of \\"reader\\"|\\"editor\\""}]}
3. unknown field
  400 {"error":"ValidationError","issues":[{"in":"body","path":"(root)","message":"Unrecognized key: \\"isAdmin\\""}]}
4. malformed JSON
  400 {"error":"ValidationError","issues":[{"in":"body","path":"(root)","message":"Malformed JSON"}]}
5. query strings are coerced
  200 {"raw":{"page":"2","limit":"50"},"valid":{"page":2,"limit":50}}
6. query out of range
  400 {"error":"ValidationError","issues":[{"in":"query","path":"limit","message":"Too big: expected number to be <=100"},{"in":"query","path":"sort","message":"Invalid option: expected one of \\"price\\"|\\"name\\""}]}
7. bad route param
  400 {"error":"ValidationError","issues":[{"in":"params","path":"id","message":"id must be numeric"}]}
8. assigning req.query in Express 5
  500 {"error":"TypeError: Cannot set property query of #<IncomingMessage> which has only a getter"}
~~~

Reading the results:

1. A valid body came back with \`role: "reader"\` filled in by the default.
2. **Three mistakes, three issues, one response.** The client can fix everything in one round trip instead of discovering errors one at a time. Note that \`"36"\` as a string was rejected in the body, on purpose.
3. \`strictObject\` refused the unknown \`isAdmin\` key.
4. Broken JSON never reached the validator; the error handler gave it the same \`ValidationError\` shape.
5. **Coercion.** \`raw\` shows what Express actually had, the strings \`"2"\` and \`"50"\`; \`valid\` shows real numbers, ready for a database query.
6. Two query problems were reported together: the 100 cap protects the database from \`?limit=500\` (useful for [pagination](/interview-question/how-would-you-implement-pagination-for-a-large-dataset-in-a-node-js-rest-api)).
7. Route params are validated by the same middleware.
8. **An Express 5 detail.** Assigning \`req.query = ...\` threw \`TypeError: Cannot set property query of #<IncomingMessage> which has only a getter\`. In Express 5 \`req.query\` is a getter, so the common Express 4 trick of overwriting it with parsed values fails. Store parsed values separately, as \`req.valid\` does here (or on \`res.locals\`).

## 5. Verified: Coercion Traps

Coercion is convenient but blunt. \`z.coerce.boolean()\` runs JavaScript's \`Boolean()\` on the input, and any non-empty string is truthy (the second example below):

~~~text
z.coerce.boolean() on "false": true
z.coerce.number() on "": 0
enum + transform on "false": false
~~~

So \`?inStock=false\` would become \`true\`, and an empty \`?limit=\` would become \`0\`. For booleans in query strings, accept the exact strings \`"true"\` and \`"false"\` and transform them, as the last line does.

## 6. Choosing a Library

| Option | Style | Strengths | Consider when |
| :--- | :--- | :--- | :--- |
| **zod** | Schemas in TypeScript-first code | Types are inferred from the schema, so validation and types never drift | TypeScript codebases |
| **joi** | Fluent schema objects | Mature, very expressive rules and messages | JavaScript codebases, complex rules |
| **ajv** + JSON Schema | Standard JSON Schema documents | Very fast, and the same schema can live in your OpenAPI spec | Spec-first APIs; Fastify uses JSON Schema for routes |
| **express-validator** | Chain of checks per field as middleware | Feels native to Express | Small apps with simple fields |

Whichever you use, the pattern (one middleware, parsed values, one error format) is the same. Fastify builds this in: route schemas are validated before the handler runs (see [Fastify vs Express](/interview-question/fastify-vs-express-how-do-they-differ-in-architecture-and-performance)).

## 7. What Validation Is Not

- **Not business rules that need data.** "Email is well-formed" is validation (400). "Email is already registered" needs the database and is a conflict (**409**), checked in the service.
- **Not a replacement for other defences.** Validated strings still go to the database through parameterized queries ([SQL injection](/interview-question/how-do-you-prevent-sql-injection-in-node-js-database-access)), and validation says nothing about whether this user may perform the action (authorization).
- **Careful with regexes.** A hand-written regex with nested quantifiers can freeze the event loop on a crafted input; see [ReDoS](/interview-question/what-is-a-redos-regular-expression-denial-of-service-attack-and-how-do-you-avoid). Prefer the library's built-in validators.

## 8. Common Pitfalls

- **Validating inside each handler.** Rules drift, some routes forget, and error formats differ. Use one middleware.
- **Reading \`req.body\` after validating.** The handler should use the parsed result; otherwise defaults, coercion and stripping are lost.
- **Returning only the first error.** Clients then fix one field per request. Report all issues.
- **Forgetting that query values are strings.** \`?limit=500\` gives the string \`"500"\`, so \`req.query.limit + 1\` is \`"5001"\`. Coerce in the schema.
- **Blind \`z.coerce.boolean()\`** on query strings, which turns \`"false"\` into \`true\`, as shown above.
- **Different error shapes** for malformed JSON and schema errors. Route body-parser errors through the same format.

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Say where it happens:</strong> <span style="color:#f0e2c8;">"Validation runs once, at the edge, in a reusable middleware before the handler, not as scattered if-checks inside handlers."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Say how:</strong> <span style="color:#f0e2c8;">"Each route declares schemas for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">body</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">query</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">params</code> with zod, joi or JSON Schema; the middleware uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">safeParse</code> and collects every issue."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Mention coercion:</strong> <span style="color:#f0e2c8;">"Query strings and params are always strings, so the schema coerces <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">"50"</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">50</code>, fills defaults and caps values like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">limit</code> at 100. I watch out for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">z.coerce.boolean()</code>, which turns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">"false"</code> into true."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Describe the response:</strong> <span style="color:#f0e2c8;">"Failures get a 400 with a list of issues giving location, field and message, and malformed JSON from the body parser goes through the same format."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Hand over clean data:</strong> <span style="color:#f0e2c8;">"The handler reads parsed values from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">req.valid</code>, not raw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">req.body</code>. In Express 5 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">req.query</code> is a getter, so assigning to it throws; business rules like a duplicate email stay in the service as a 409."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should unknown fields be rejected or stripped?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both are reasonable; pick one deliberately. Rejecting with a strict schema surfaces client bugs early and is good for internal APIs. Stripping is friendlier for public APIs, where clients may send extra fields, and still keeps fields like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">isAdmin</code> away from your code. The bad option is neither: passing raw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">req.body</code> straight to the database.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does the check that an email is already registered belong?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In the service layer, not the schema. The schema can only check that the input is well-formed, which is a 400. Whether the email exists needs the database and is a conflict with current state, usually a 409. The unique index in the database is the final guard against races between two signups.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you keep validation in sync with your API docs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Generate one from the other. With JSON Schema you can put the same schemas into an OpenAPI document and validate with ajv; with zod there are tools that generate OpenAPI from the schemas. Either way the schema is the single source, so the docs cannot describe a rule the server does not enforce.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use TypeScript types for the request body?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because types disappear at runtime. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">req.body</code> is whatever the client sent, and a TypeScript annotation only tells the compiler to trust it. A runtime schema actually checks the data, and with zod you can infer the TypeScript type from that schema so both stay identical.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does validation protect against SQL injection?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Partly at best. A schema can reject a value that is not an email or a number, but a valid free-text field like a name can still contain SQL. The real protection is parameterized queries; validation is the first filter, not the last.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Request validation** | Checking input shape, types and ranges before the handler runs |
| **Schema** | A declaration of what valid data looks like |
| **\`safeParse\`** | zod method that returns success or a list of issues instead of throwing |
| **Coercion** | Converting input to the expected type, such as \`"50"\` to \`50\` |
| **Strict object** | A schema that rejects keys it does not declare |
| **Validation middleware** | Reusable Express middleware that checks body, query and params against schemas |
| **400 vs 409** | 400 for malformed input; 409 for a valid request that conflicts with current data |

---
**Conclusion:** implement validation as one checkpoint at the edge: declare a schema for each route's body, query and params, run a reusable middleware before the handler, and reply 400 with every issue in one format, including body-parser errors such as malformed JSON. Coerce query strings and params, since they are always strings, cap things like \`limit\`, and decide deliberately whether unknown fields are rejected or stripped. Hand the handler the parsed values instead of raw \`req.body\`; in Express 5 store them separately, because \`req.query\` is a getter that cannot be reassigned. Keep business rules that need the database, such as duplicate emails, in the service with their own status codes.`,
    examples: [
      {
        label: "Express 5 + zod: one validate() middleware for body, query and params, with a shared 400 format",
        tech: "javascript",
        runnable: false,
        code: `"use strict";
const express = require("express");
const { z } = require("zod");

// One reusable middleware: validate any part of the request against a schema.
const validate = (schemas) => (req, res, next) => {
  const issues = [];
  req.valid = {};
  for (const part of ["params", "query", "body"]) {
    if (!schemas[part]) continue;
    const result = schemas[part].safeParse(req[part] ?? {});
    if (result.success) req.valid[part] = result.data;
    else for (const i of result.error.issues)
      issues.push({ in: part, path: i.path.join(".") || "(root)", message: i.message });
  }
  if (issues.length) return res.status(400).json({ error: "ValidationError", issues });
  next();
};

const createUser = z.strictObject({
  email: z.email(),
  age: z.number().int().min(13),
  role: z.enum(["reader", "editor"]).default("reader"),
});

const listProducts = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["price", "name"]).optional(),
});

const idParam = z.object({ id: z.string().regex(/^\\d+$/, "id must be numeric") });

const app = express();
app.use(express.json({ limit: "10kb" }));

app.post("/users", validate({ body: createUser }), (req, res) => res.status(201).json(req.valid.body));
app.get("/products", validate({ query: listProducts }), (req, res) =>
  res.json({ raw: req.query, valid: req.valid.query }));
app.get("/users/:id", validate({ params: idParam }), (req, res) => res.json({ id: Number(req.valid.params.id) }));
app.get("/try-overwrite", (req, res) => {
  try { req.query = { page: 1 }; res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.constructor.name + ": " + e.message }); }
});

// Body-parser errors (bad JSON, too large) arrive here; keep one error shape.
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "ValidationError", issues: [{ in: "body", path: "(root)", message: "Malformed JSON" }] });
  if (err.type === "entity.too.large") return res.status(413).json({ error: "PayloadTooLarge" });
  res.status(500).json({ error: "Internal" });
});

const server = app.listen(0, async () => {
  const base = \`http://localhost:\${server.address().port}\`;
  const call = async (label, path, body) => {
    const opts = body === undefined ? {} : { method: "POST", headers: { "content-type": "application/json" }, body };
    const r = await fetch(base + path, opts);
    console.log(\`\${label}\\n  \${r.status} \${await r.text()}\`);
  };
  await call("1. valid body", "/users", JSON.stringify({ email: "ada@example.com", age: 36 }));
  await call("2. three mistakes at once", "/users", JSON.stringify({ email: "nope", age: "36", role: "admin" }));
  await call("3. unknown field", "/users", JSON.stringify({ email: "ada@example.com", age: 36, isAdmin: true }));
  await call("4. malformed JSON", "/users", '{"email": "ada@example.com",');
  await call("5. query strings are coerced", "/products?page=2&limit=50");
  await call("6. query out of range", "/products?limit=500&sort=random");
  await call("7. bad route param", "/users/abc");
  await call("8. assigning req.query in Express 5", "/try-overwrite?page=1");
  server.close();
});`,
      },
      {
        label: "zod coercion traps in query strings: \"false\" becomes true, \"\" becomes 0",
        tech: "javascript",
        runnable: false,
        code: `const { z } = require("zod");
console.log('z.coerce.boolean() on "false":', z.coerce.boolean().parse("false"));
console.log('z.coerce.number() on "":', z.coerce.number().parse(""));
const inStock = z.enum(["true", "false"]).transform((v) => v === "true");
console.log('enum + transform on "false":', inStock.parse("false"));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How would you implement pagination for a large dataset in a Node.js REST API?",
    seoDescription:
      "Paginate a large Node.js REST API: cap the page size, compare offset with cursor (keyset) pagination, add a tie-breaker and return an opaque nextCursor.",
    description: `**Question presented to candidate:**
"We have an \`orders\` table with millions of rows, and \`GET /orders\` currently returns all of them. The mobile app shows an infinite-scrolling list, and the admin panel shows numbered pages. How would you add pagination to this Node.js REST API?"

**What a strong answer should cover:**
- Never returns an unbounded list: a default page size and a server-enforced maximum \`limit\`.
- Explains offset pagination (\`LIMIT ... OFFSET ...\`, page numbers): simple and allows jumping to page N, but the database still walks past every skipped row, so deep pages get slower, and rows inserted or deleted between requests cause duplicates or gaps.
- Explains cursor (keyset) pagination: the response returns a cursor holding the sort key of the last row, and the next query asks for rows after it (\`WHERE (created_at, id) < (?, ?)\`), which uses an index and stays fast at any depth and stable while data changes.
- Requires a deterministic sort with a unique tie-breaker (such as \`id\`) and a matching index, and fetches \`limit + 1\` rows to know whether another page exists.
- Designs the response: \`data\` plus \`nextCursor\` (or \`Link\` headers), an opaque cursor that the server validates, and a clear choice about whether to return a total count, which is expensive on large tables.

**Clarifying questions expected:**
- "Do users need to jump to a specific page number, or only scroll forward?"
- "What is the sort order, and can rows be inserted or deleted while someone pages?"
- "Do clients really need the total count?"

**Code / implementation expected:** Yes. A cursor-paginated endpoint with an opaque cursor and a \`limit\` cap, and ideally a measurement of offset vs keyset at depth.`,
    answer: `**Target Audience:** Beginners and juniors preparing for Node.js backend interviews.
**Difficulty:** Easy

> **How to read this doc:** Ideas are explained in plain language first, then tagged with <code>📌 Interview term:</code> so you also learn the words an interviewer expects. Every code sample here was run with Node v22.22.0, using the built-in \`node:sqlite\` module (it loaded without a flag on this version but printed an \`ExperimentalWarning\`, hidden with \`--no-warnings\`) and Express 5.3.0. The output shown is the output it printed. The SQL side is covered in more depth in [How do you paginate efficiently in SQL?](/interview-question/how-do-you-paginate-efficiently-in-sql).

## 1. Why This Even Matters — A Story First

Imagine reading a 1,000-page book where, to reach page 900, you must start from page 1 and flip every page, every single time you open it. That is offset pagination at depth. Now imagine a bookmark: you open the book exactly where you stopped, no matter how far in you are. That is a cursor.

There is a second problem. Suppose someone glues two new pages into the front of the book while you are reading. If you remember "I was on page 5", you now re-read part of what you already saw. A bookmark stays between the same two pages.

Returning millions of rows in one response is worse than either: it is slow to query, huge to send, and can exhaust memory on both sides. Pagination is how you hand the data over in pieces.

## 2. Rule Zero: Never Return Everything

Every list endpoint gets a **default page size** (say 20) and a **maximum** the server enforces (say 100), no matter what the client asks for. A client that sends \`?limit=1000000\` should still get 100 rows. That one rule protects the database, the Node process memory and the network.

## 3. Two Ways to Paginate

📌 **Interview term: offset pagination** — the client says how many rows to skip: \`?page=3&limit=20\` becomes \`LIMIT 20 OFFSET 40\`. Simple, and it supports "jump to page 50".

📌 **Interview term: cursor (keyset) pagination** — the client sends back a **cursor** that encodes where the previous page ended, and the query asks for rows *after that point*: \`WHERE (created_at, id) < (?, ?) ORDER BY created_at DESC, id DESC LIMIT 20\`. The database uses the index to jump straight there.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 220" role="img" aria-label="Offset pagination walks through every skipped row before returning the page; keyset pagination seeks directly in the index to the position after the last seen row">
  <defs>
    <marker id="pg-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="30" y="40">OFFSET 500000</text>
  <rect class="d-box-muted" x="180" y="20" width="330" height="34" rx="6"/>
  <text class="d-sub" x="345" y="42" text-anchor="middle">walk and discard 500000 rows</text>
  <rect class="d-box-accent" x="530" y="20" width="90" height="34" rx="6"/>
  <text class="d-text d-accent" x="575" y="42" text-anchor="middle">20 rows</text>
  <text class="d-text" x="30" y="140">keyset</text>
  <rect class="d-box" x="180" y="120" width="140" height="34" rx="6"/>
  <text class="d-sub" x="250" y="142" text-anchor="middle">index seek</text>
  <path class="d-edge-accent" d="M 320 137 L 524 137" marker-end="url(#pg-arrow)"/>
  <text class="d-sub" x="422" y="180" text-anchor="middle">jump past the cursor</text>
  <rect class="d-box-accent" x="530" y="120" width="90" height="34" rx="6"/>
  <text class="d-text d-accent" x="575" y="142" text-anchor="middle">20 rows</text>
</svg>

Both return the same 20 rows; the difference is how much work the database does to find them.

## 4. Verified: Offset vs Keyset on a Million Rows

The second example below loads 1,000,000 orders into an in-memory SQLite database with an index on \`(created_at, id)\`, then times one page of 20 at different depths, prints the query plans, and inserts two new orders between reading page 1 and page 2:

~~~text
--- cost of one page of 20, by depth
OFFSET 0      : 0.016 ms per page
keyset  0      : 0.016 ms per page
OFFSET 10000  : 0.093 ms per page
keyset  10000  : 0.012 ms per page
OFFSET 500000 : 4.200 ms per page
keyset  500000 : 0.032 ms per page
OFFSET 999000 : 8.592 ms per page
keyset  999000 : 0.014 ms per page
--- query plans
offset: SCAN orders USING COVERING INDEX orders_created_id
keyset: SEARCH orders USING COVERING INDEX orders_created_id (created_at<?)
--- rows inserted between page 1 and page 2
page 1         : 1000000,999999,999998,999997,999996
page 2 (offset): 999997,999996,999995,999994,999993 -> repeats 2
page 2 (keyset): 999995,999994,999993,999992,999991 -> repeats 0
~~~

Three findings:

- **Offset cost grows with depth.** Page 1 is instant either way, but at offset 999,000 offset pagination took several milliseconds per page, hundreds of times slower than keyset, which stayed flat. The absolute numbers are small because this is an in-memory database on one machine; on a real table on disk, under load, the same growth turns into seconds.
- **The plans explain it.** Offset is a \`SCAN\` (walk the index from the start, throwing rows away); keyset is a \`SEARCH ... (created_at<?)\` (seek directly to the position).
- **Offset breaks when data changes.** After two new orders arrived, offset page 2 started with \`999997,999996\`, which the user already saw on page 1. Deletes cause the opposite, silently skipped rows (by the same arithmetic; not run here). The keyset page 2 continued exactly after the last row seen.

## 5. Working Example: a Cursor-Paginated Endpoint

The first example below is the endpoint. The core:

~~~js
const encode = (row) => Buffer.from(JSON.stringify([row.created_at, row.id])).toString("base64url");

app.get("/orders", (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100); // default 20, cap 100
  let rows;
  if (req.query.cursor) {
    const key = decode(req.query.cursor);
    if (!key) return res.status(400).json({ error: "invalid cursor" });
    rows = after.all(key[0], key[1], limit + 1);     // WHERE (created_at, id) < (?, ?)
  } else rows = first.all(limit + 1);
  const hasMore = rows.length > limit;
  const data = rows.slice(0, limit);
  res.json({ data, nextCursor: hasMore ? encode(data.at(-1)) : null });
});
~~~

The ideas in it:

- **Sort by \`created_at\` and then \`id\`.** Many orders share a timestamp. Without the unique \`id\` as a tie-breaker, "after this row" is ambiguous.
- **Fetch \`limit + 1\`.** If the extra row exists, there is a next page. This avoids a separate \`COUNT(*)\`.
- **Opaque cursor.** The cursor is the last row's sort key, JSON-encoded and base64url'd. Clients treat it as a token and send it back unchanged, which leaves you free to change what is inside. It is encoded, not encrypted: if it must not be tampered with, sign it with an HMAC.
- **Validate the cursor** and reply 400 for garbage, rather than passing it to the database. In a larger app the \`limit\` and \`cursor\` checks belong in your [validation middleware](/interview-question/how-would-you-implement-request-validation-in-a-node-js-express-api).

📌 **Interview term: tie-breaker** — a unique column added to the end of the sort so that the order is fully deterministic. Keyset pagination is only correct with one.

## 6. Verified: Walking the Pages

The client follows \`nextCursor\` until it is \`null\`. The data has 230 orders, three per timestamp:

~~~text
page 1: 50 rows, ids 230..181, nextCursor=WzE3MDAwMDAwNjAsMTgxXQ
page 2: 50 rows, ids 180..131, nextCursor=WzE3MDAwMDAwNDMsMTMxXQ
page 3: 50 rows, ids 130..81, nextCursor=WzE3MDAwMDAwMjYsODFd
page 4: 50 rows, ids 80..31, nextCursor=WzE3MDAwMDAwMTAsMzFd
page 5: 30 rows, ids 30..1, nextCursor=null
unique rows seen: 230 of 230
without id tie-breaker, unique rows seen: 227 of 230
limit=5000 -> 100 rows
bad cursor -> 400 {"error":"invalid cursor"}
~~~

- Five pages of 50, 50, 50, 50 and 30, and **every one of the 230 rows was seen exactly once**. \`nextCursor\` was \`null\` on the last page, so the client knew to stop.
- **The same walk with a cursor on \`created_at\` alone saw only 227 of 230 rows.** When a page ended in the middle of a group of orders sharing one timestamp, \`WHERE created_at < ?\` jumped past the rest of that group. Nothing errored; three orders silently vanished from the list.
- \`?limit=5000\` was capped at 100, and a made-up cursor got a 400.

## 7. Choosing, and Designing the Response

| | Offset (\`?page=3\`) | Cursor (\`?cursor=...\`) |
| :--- | :--- | :--- |
| Jump to page N | Yes | No, only next (and previous with a second cursor) |
| Cost of deep pages | Grows with the offset | Flat, with the right index |
| Rows inserted or deleted while paging | Duplicates or gaps | Stable |
| Total count / page numbers | Natural, but \`COUNT(*)\` is costly on big tables | Usually omitted |
| Best for | Admin tables, small or slow-changing data | Feeds, infinite scroll, APIs, exports |

For the prompt: cursor pagination for the mobile infinite scroll; offset is acceptable for the admin panel's numbered pages, ideally with filters that keep result sets small and a cap on the maximum page.

A common response shape:

~~~json
{ "data": [ ... ], "nextCursor": "WzE3MDAwMDAwNjAsMTgxXQ" }
~~~

Some APIs put the same information in an HTTP \`Link: <...>; rel="next"\` header instead (GitHub's REST API does this, with \`next\`, \`prev\`, \`first\` and \`last\` relations, per its [pagination docs](https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api)). On the client, a cursor API pairs well with an async generator that keeps fetching until \`nextCursor\` is null; see [streaming paginated results with an async generator](/interview-question/how-would-you-implement-an-async-generator-function-to-stream-paginated-api-resu).

📌 **Interview term: total count** — the number of matching rows, needed for "page 3 of 120". On a large table it requires counting every match, so many APIs omit it, return an estimate, or compute it only on request.

## 8. Common Pitfalls

- **No maximum \`limit\`.** Clients, or attackers, will ask for everything. Cap it on the server.
- **Ordering by a non-unique column.** Shown above: three rows lost with a \`created_at\`-only cursor. Always add a unique tie-breaker.
- **No index matching the sort.** Keyset is only fast if an index covers \`(created_at, id)\` in the query's order; otherwise the database sorts the whole table for every page.
- **Deep offsets on big tables.** Cost grows with the offset, and data changes cause duplicates and gaps between pages.
- **Exposing raw database values as the cursor and trusting them.** Decode and validate cursors, return 400 for bad ones, and sign them if tampering matters.
- **Running \`COUNT(*)\` on every request** just to show a total nobody needs for infinite scroll.

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Bound every list:</strong> <span style="color:#f0e2c8;">"No list endpoint returns everything: a default page size like 20 and a server-enforced maximum like 100, whatever the client asks for."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Explain offset:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">LIMIT 20 OFFSET 40</code> is simple and supports page numbers, but the database walks every skipped row. On a million rows I measured offset 999,000 at several milliseconds per page against a flat fraction of a millisecond for keyset, and new inserts made offset pages repeat rows."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Explain cursor:</strong> <span style="color:#f0e2c8;">"Keyset pagination returns a cursor with the last row sort key, and the next query asks for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">WHERE (created_at, id) &lt; (?, ?)</code>. That is an index seek, so it stays fast and stable at any depth."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Get the details right:</strong> <span style="color:#f0e2c8;">"Sort by a unique tie-breaker such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">id</code>, with a matching index; without it my walk saw 227 of 230 rows. Fetch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">limit + 1</code> to know whether there is a next page, and make the cursor opaque and validated."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Match it to the screen:</strong> <span style="color:#f0e2c8;">"Cursors for infinite scroll, feeds and public APIs; offset for small admin tables that need page numbers. Return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">data</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">nextCursor</code>, and skip the total count unless someone really needs it."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is OFFSET slow on deep pages if there is an index?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An index helps find rows in order, but OFFSET still has to count past every skipped row to know where page N starts. The query plan in my run showed a SCAN of the index for the offset query and a SEARCH for the keyset query, which jumps straight to the cursor position.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you support a Previous button with cursors?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Return two cursors: one for the first row on the page and one for the last. For previous, reverse the comparison and the sort (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">WHERE (created_at, id) > (?, ?) ORDER BY created_at ASC, id ASC</code>), then reverse the rows before returning them so the page still reads in the normal order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the user changes the sort order or filters?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The cursor is only valid for the sort and filters it was created with. I include those in the cursor, or a hash of them, and reject a cursor used with different parameters, rather than returning a confusing page. Each sort option also needs its own index ending in the tie-breaker.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you show a total count on a huge table?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Ask whether it is needed first; infinite scroll does not need it. If it is, options are a cached count refreshed periodically, the database planner estimate, or a capped count such as showing 1,000+ results. An exact <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">COUNT(*)</code> per request on millions of rows is a common source of slow list endpoints.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should the cursor be encrypted?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually it only needs to be opaque and validated: base64url of the sort key, decoded and checked on every request, with a 400 for anything malformed. If the values are sensitive or tampering could expose data, sign it with an HMAC, or encrypt it. The cursor must never bypass the normal authorization filter on the query.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Offset pagination** | Skip N rows, take the next page: \`LIMIT ... OFFSET ...\` |
| **Cursor / keyset pagination** | Continue after the last row seen, using its sort key |
| **Cursor** | An opaque token encoding where the previous page ended |
| **Tie-breaker** | A unique column added to the sort so the order is deterministic |
| **\`limit + 1\` trick** | Fetching one extra row to know whether a next page exists |
| **Page size cap** | The server-enforced maximum number of rows per page |
| **Total count** | The number of all matches; useful for page numbers, costly on big tables |

---
**Conclusion:** paginate every list endpoint, with a default page size and a server-enforced maximum. Offset pagination is easy and supports page numbers, but the run above showed its cost growing with depth (a \`SCAN\` of every skipped row) and its pages repeating rows when new data arrived. Cursor (keyset) pagination returns a cursor holding the last row's sort key and asks for rows after it, which is an index \`SEARCH\` that stays fast at any depth and stable while data changes. It needs a deterministic order with a unique tie-breaker, as the 227-of-230 result showed, an index matching that order, the \`limit + 1\` trick to detect the last page, and an opaque, validated cursor. Use cursors for feeds, infinite scroll and public APIs, and keep offset for small admin tables that need page numbers.`,
    examples: [
      {
        label: "Express + node:sqlite: cursor pagination with an opaque cursor, limit cap and limit + 1",
        tech: "javascript",
        runnable: false,
        code: `const express = require("express");
const { DatabaseSync } = require("node:sqlite");

const db = new DatabaseSync(":memory:");
db.exec(\`CREATE TABLE orders (id INTEGER PRIMARY KEY, created_at INTEGER NOT NULL, total INTEGER NOT NULL);
         CREATE INDEX orders_created_id ON orders (created_at, id);\`);
const ins = db.prepare("INSERT INTO orders (created_at, total) VALUES (?, ?)");
for (let i = 0; i < 230; i++) ins.run(1_700_000_000 + Math.floor(i / 3), i * 10); // 3 orders share each timestamp

const first = db.prepare("SELECT * FROM orders ORDER BY created_at DESC, id DESC LIMIT ?");
const after = db.prepare(\`SELECT * FROM orders WHERE (created_at, id) < (?, ?)
                          ORDER BY created_at DESC, id DESC LIMIT ?\`);

// Opaque cursor: the sort key of the last row, base64url-encoded JSON.
const encode = (row) => Buffer.from(JSON.stringify([row.created_at, row.id])).toString("base64url");
function decode(cursor) {
  try {
    const v = JSON.parse(Buffer.from(cursor, "base64url").toString());
    if (Array.isArray(v) && v.length === 2 && v.every(Number.isInteger)) return v;
  } catch {}
  return null;
}

const app = express();
app.get("/orders", (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100); // default 20, cap 100
  let rows;
  if (req.query.cursor) {
    const key = decode(req.query.cursor);
    if (!key) return res.status(400).json({ error: "invalid cursor" });
    rows = after.all(key[0], key[1], limit + 1);     // ask for one extra row
  } else rows = first.all(limit + 1);
  const hasMore = rows.length > limit;
  const data = rows.slice(0, limit);
  res.json({ data, nextCursor: hasMore ? encode(data.at(-1)) : null });
});

// The same endpoint with a cursor on created_at ONLY (no id tie-breaker).
const afterTs = db.prepare("SELECT * FROM orders WHERE created_at < ? ORDER BY created_at DESC LIMIT ?");
app.get("/orders-no-tiebreak", (req, res) => {
  const rows = req.query.cursor ? afterTs.all(Number(req.query.cursor), 51) : first.all(51);
  const data = rows.slice(0, 50);
  res.json({ data, nextCursor: rows.length > 50 ? String(data.at(-1).created_at) : null });
});

const server = app.listen(0, async () => {
  const base = \`http://localhost:\${server.address().port}\`;
  async function walk(path, log) {
    let cursor = null, page = 0;
    const seen = new Set();
    do {
      const qs = new URLSearchParams({ limit: "50", ...(cursor && { cursor }) });
      const body = await (await fetch(\`\${base}\${path}?\${qs}\`)).json();
      page++;
      body.data.forEach((r) => seen.add(r.id));
      if (log) console.log(\`page \${page}: \${body.data.length} rows, ids \${body.data[0].id}..\${body.data.at(-1).id}, nextCursor=\${body.nextCursor}\`);
      cursor = body.nextCursor;
    } while (cursor);
    return seen.size;
  }
  console.log("unique rows seen:", await walk("/orders", true), "of 230");
  console.log("without id tie-breaker, unique rows seen:", await walk("/orders-no-tiebreak", false), "of 230");
  console.log("limit=5000 ->", (await (await fetch(\`\${base}/orders?limit=5000\`)).json()).data.length, "rows");
  const bad = await fetch(\`\${base}/orders?cursor=not-a-cursor\`);
  console.log("bad cursor ->", bad.status, await bad.text());
  server.close();
});`,
      },
      {
        label: "Offset vs keyset on 1,000,000 rows: timing, query plans and duplicates after inserts",
        tech: "javascript",
        runnable: false,
        code: `const { DatabaseSync } = require("node:sqlite");
const { performance } = require("node:perf_hooks");

const db = new DatabaseSync(":memory:");
db.exec(\`CREATE TABLE orders (id INTEGER PRIMARY KEY, created_at INTEGER NOT NULL, total INTEGER NOT NULL);
         CREATE INDEX orders_created_id ON orders (created_at, id);\`);
const insert = db.prepare("INSERT INTO orders (created_at, total) VALUES (?, ?)");
db.exec("BEGIN");
for (let i = 0; i < 1_000_000; i++) insert.run(1_700_000_000 + Math.floor(i / 3), i % 500); // 3 orders share each second
db.exec("COMMIT");

const offsetPage = db.prepare("SELECT id, created_at FROM orders ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?");
const keysetPage = db.prepare(\`SELECT id, created_at FROM orders
  WHERE (created_at, id) < (?, ?) ORDER BY created_at DESC, id DESC LIMIT ?\`);

function time(label, fn, runs = 20) {
  fn();
  const t = performance.now();
  for (let i = 0; i < runs; i++) fn();
  console.log(\`\${label}: \${((performance.now() - t) / runs).toFixed(3)} ms per page\`);
}

console.log("--- cost of one page of 20, by depth");
for (const depth of [0, 10_000, 500_000, 999_000]) {
  const last = offsetPage.get(1, depth - 1 < 0 ? 0 : depth - 1);   // the row just before the page
  time(\`OFFSET \${String(depth).padEnd(7)}\`, () => offsetPage.all(20, depth));
  time(\`keyset  \${String(depth).padEnd(7)}\`, () => keysetPage.all(last.created_at, last.id, 20));
}

console.log("--- query plans");
for (const [label, sql] of [["offset", "EXPLAIN QUERY PLAN SELECT id FROM orders ORDER BY created_at DESC, id DESC LIMIT 20 OFFSET 500000"],
                           ["keyset", "EXPLAIN QUERY PLAN SELECT id FROM orders WHERE (created_at, id) < (1, 1) ORDER BY created_at DESC, id DESC LIMIT 20"]])
  console.log(label + ":", db.prepare(sql).all().map((r) => r.detail).join(" / "));

console.log("--- rows inserted between page 1 and page 2");
const p1 = offsetPage.all(5, 0);
const last = p1.at(-1);
for (let i = 0; i < 2; i++) insert.run(1_800_000_000 + i, 1);      // two new newest orders
const p2offset = offsetPage.all(5, 5);
const p2keyset = keysetPage.all(last.created_at, last.id, 5);
const ids = (rows) => rows.map((r) => r.id).join(",");
console.log("page 1         :", ids(p1));
console.log("page 2 (offset):", ids(p2offset), "-> repeats", p2offset.filter((r) => p1.some((x) => x.id === r.id)).length);
console.log("page 2 (keyset):", ids(p2keyset), "-> repeats", p2keyset.filter((r) => p1.some((x) => x.id === r.id)).length);`,
      },
    ],
  },

];

export default augments;
