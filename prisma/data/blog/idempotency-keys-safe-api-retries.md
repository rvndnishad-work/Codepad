---
slug: idempotency-keys-safe-api-retries
title: "Retry It, Charge Once: How Idempotency Keys Make API Retries Safe"
excerpt: A request times out. Did the payment go through? Learn how idempotency keys let clients retry POST requests without doing the work twice, how to build them on the server (status codes, fingerprints, a Postgres table), and the mistakes that still cause double charges.
tags: ["backend", "api-design", "idempotency", "postgres", "interview"]
cover: /blog-images/idempotency-keys-safe-api-retries/cover.png
---

Your checkout page sends "charge this card ₹4,999" to the payment API. Thirty seconds later the request times out. Did the charge happen?

You can't tell. The request might have failed before it reached the server. Or the server might have charged the card and the response got lost on the way back. If you retry and it was the second case, the customer pays twice. If you don't retry and it was the first case, they don't pay at all.

Every networked system faces this, and you can't fix it by making the network more reliable. The fix is to make the request safe to send twice. For operations that aren't naturally safe to repeat, the standard tool is an **idempotency key**. It's also a favourite backend interview question, usually phrased as "How would you stop a payment being processed twice?"

## What "idempotent" means in HTTP

> **Short answer:** An operation is idempotent when doing it twice has the same effect as doing it once. In HTTP, GET, PUT and DELETE are idempotent by definition; POST and PATCH are not.

[RFC 9110](https://www.rfc-editor.org/rfc/rfc9110#section-9.2.2), the HTTP specification, defines a method as idempotent when "the intended effect on the server of multiple identical requests with that method is the same as the effect for a single such request", and states: "Of the request methods defined by this specification, PUT, DELETE, and safe request methods are idempotent." The safe methods are GET, HEAD, OPTIONS and TRACE.

Some examples of what that means in practice:

- `PUT /users/42/email` with `{"email": "a@b.com"}` sets the email. Sending it five times leaves the same email. Safe to retry.
- `DELETE /carts/7` removes the cart. A second delete finds nothing to remove; the end state is the same. Safe to retry (the second response may be a 404, but nothing extra happened).
- `POST /charges` with `{"amount": 4999}` creates a *new* charge each time. Five sends, five charges. **Not** safe to retry.

Many important operations are POSTs: payments, orders, sending emails or SMS, creating accounts. Those are exactly the ones where duplicates are expensive. Idempotency keys make them safe to retry.

## The double charge, in code

Here is the failure in a few lines. The server does its work, but the client never hears back, so it retries:

```javascript-run
// A payment API with no protection against retries.
const charges = [];

async function chargeCard(body) {
  charges.push({ amount: body.amount, card: body.card });
  return { status: 201, body: { chargeId: `ch_${charges.length}` } };
}

// The client's network call: the server does the work, but the response is lost.
async function callWithFlakyNetwork(body, loseResponse) {
  const response = await chargeCard(body);
  if (loseResponse) throw new Error("timeout: no response received");
  return response;
}

async function main() {
  const order = { amount: 4999, card: "card_123" };
  try {
    await callWithFlakyNetwork(order, true);
  } catch (err) {
    console.log("first try:", err.message);
    const retry = await callWithFlakyNetwork(order, false);
    console.log("retry:", JSON.stringify(retry.body));
  }
  console.log("charges made:", charges.length);
}

main();
```

Output:

```text
first try: timeout: no response received
retry: {"chargeId":"ch_2"}
charges made: 2
```

The client did the reasonable thing and the customer was charged twice. The retry logic isn't wrong. The problem is that the server has no way to tell a retry from a brand-new payment.

![Without a key the retry creates a second charge; with a key the server recognises the retry and returns the saved response](/blog-images/idempotency-keys-safe-api-retries/retry-timeline.svg)

## How an idempotency key works

> **Short answer:** The client generates a unique ID for each *operation* (not each attempt) and sends it in an `Idempotency-Key` header. The server saves the result under that key, and when the same key arrives again it returns the saved result instead of doing the work again.

The contract has two halves.

**The client** creates one key, usually a random UUID, when the user starts an operation ("pay for this order"). It sends that same key on the first attempt and on every retry. A new operation gets a new key.

**The server** keeps a table of keys it has seen:

1. If the key is new, **claim it** (record "this key is being processed"), do the work, then save the response next to the key.
2. If the key exists and the work is finished, **don't do the work again**. Return the saved response.
3. If the key exists but the request body is different, the client has a bug (it reused a key for a different operation). Reject it.
4. If the key exists and the first request is *still running*, reject the duplicate for now, and tell the client to retry later.

There is a proposed standard for this. The IETF HTTP APIs working group's [Idempotency-Key header draft](https://github.com/ietf-wg-httpapi/idempotency) (latest revision -07, October 2025) defines the header as a [Structured Field](https://www.rfc-editor.org/rfc/rfc8941) string, sent like `Idempotency-Key: "8e03978e-40d5-43e8-bc93-6894a57f9324"`. Its error rules match the steps above. It says the server SHOULD reply with:

- **400** when the key is missing on an operation that requires one,
- **422** when a key is reused with a different request payload,
- **409** when a request is retried "while the original request is still being processed".

It's an Internet-Draft, which means a proposal and not a finished standard. Large APIs already work this way: Stripe has accepted an `Idempotency-Key` header on its API for years.

![Server decision flow: missing key is 400, a new key is processed, a reused key with a different body is 422, an in-flight duplicate is 409, and a finished one replays the saved response](/blog-images/idempotency-keys-safe-api-retries/server-decision.svg)

## Building it on the server

Here's the whole algorithm in a small Node.js handler. It keeps keys in memory to stay short, and uses a SHA-256 hash of the request body as a **fingerprint**, so a reused key with a different body can be detected without storing the whole body.

```javascript
// Run with: node idempotency.js
const { createHash } = require("node:crypto");

const store = new Map(); // key -> { fingerprint, state: "processing" | "done", response }
const charges = [];

const fingerprint = (body) => createHash("sha256").update(JSON.stringify(body)).digest("hex");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function handleCharge(headers, body) {
  const key = headers["idempotency-key"];
  if (!key) return { status: 400, body: { error: "Idempotency-Key header is required" } };

  const fp = fingerprint(body);
  const saved = store.get(key);
  if (saved) {
    if (saved.fingerprint !== fp) {
      return { status: 422, body: { error: "key was already used with a different request" } };
    }
    if (saved.state === "processing") {
      return { status: 409, body: { error: "a request with this key is still in progress" } };
    }
    return { ...saved.response, replayed: true };
  }

  // Claim the key before doing the work, so a parallel duplicate sees "processing".
  store.set(key, { fingerprint: fp, state: "processing" });
  await sleep(50); // talking to the card network
  charges.push(body);
  const response = { status: 201, body: { chargeId: `ch_${charges.length}` } };
  store.set(key, { fingerprint: fp, state: "done", response });
  return response;
}

function show(label, r) {
  console.log(`${label.padEnd(26)} ${r.status} ${JSON.stringify(r.body)}${r.replayed ? " (replayed)" : ""}`);
}

async function main() {
  const order = { amount: 4999, card: "card_123" };
  const headers = { "idempotency-key": "8e03978e-40d5-43e8-bc93-6894a57f9324" };

  show("no key", await handleCharge({}, order));

  const [first, duplicate] = await Promise.all([
    handleCharge(headers, order),
    sleep(10).then(() => handleCharge(headers, order)),
  ]);
  show("first request", first);
  show("duplicate while running", duplicate);

  show("retry after it finished", await handleCharge(headers, order));
  show("same key, new amount", await handleCharge(headers, { ...order, amount: 5999 }));

  console.log("charges made:", charges.length);
}

main();
```

Output:

```text
no key                     400 {"error":"Idempotency-Key header is required"}
first request              201 {"chargeId":"ch_1"}
duplicate while running    409 {"error":"a request with this key is still in progress"}
retry after it finished    201 {"chargeId":"ch_1"} (replayed)
same key, new amount       422 {"error":"key was already used with a different request"}
charges made: 1
```

Five requests, one charge. The retry after completion got back the *same* charge ID, which is the point: from the client's view, the retry looks exactly like the first response arriving late.

The most important line is the one that **claims the key before doing the work**. If you only wrote the key *after* charging the card, two requests arriving close together would both see "new key" and both charge.

## Making it real: a database table

An in-memory `Map` disappears on restart and isn't shared between servers. In production the keys go in a database, and the claim step must be **atomic**: exactly one request can win it, however many arrive at once. A unique constraint does that for you. In PostgreSQL:

```sql
CREATE TABLE idempotency_keys (
  key          text        PRIMARY KEY,
  fingerprint  text        NOT NULL,
  status       text        NOT NULL DEFAULT 'processing',  -- processing | done
  response     jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Step 1: try to claim the key. Only one request can insert it.
INSERT INTO idempotency_keys (key, fingerprint)
VALUES ('8e03978e-40d5-43e8-bc93-6894a57f9324', 'sha256:ab12')
ON CONFLICT (key) DO NOTHING
RETURNING key;

-- Step 2: after the work succeeds, save the response for replays.
UPDATE idempotency_keys
SET status = 'done', response = '{"status": 201, "chargeId": "ch_1"}'
WHERE key = '8e03978e-40d5-43e8-bc93-6894a57f9324';

-- Cleanup job: drop keys older than the retention window.
DELETE FROM idempotency_keys WHERE created_at < now() - interval '24 hours';
```

I ran this on PostgreSQL 16. The first `INSERT ... ON CONFLICT DO NOTHING RETURNING key` returns the key: you won the claim, so do the work. Running the identical insert a second time returns **zero rows**: someone else owns the key. In that case, `SELECT` the row and decide from it: a different fingerprint means 422, `status = 'processing'` means 409, and `done` means you send back the saved `response`.

Two details make this production-grade:

- **Put the side effect in the same transaction when you can.** If "create the order row" and "mark the key done" happen in one database transaction, a crash can't leave one without the other. When the side effect is an external call (a card network, an email provider), you can't put it in your transaction. Pass your key on to that provider if it supports one, so a retry of the external call is also deduplicated.
- **Handle keys stuck in `processing`.** If the server crashes mid-request, the key stays claimed forever and every retry gets 409. Store when the claim was made and let a claim older than a timeout be taken over, after checking whether the work actually happened.

## How long to keep keys

Keys can't be kept forever, and they don't need to be: they only have to outlive the client's retries. The IETF draft leaves the window to each API, saying the resource "SHOULD define such expiration policy and publish it in the documentation".

Stripe's documentation (for its v1 API) gives a concrete example: keys can be removed once they are at least 24 hours old, and a key reused after it was pruned is treated as a new request. Stripe also saves the result of the first request even when it was an error, including 500s, so a retry gets the same error back. It does not save a result when the request failed validation or collided with a concurrent request using the same key; those can simply be retried.

Pick a window longer than your longest realistic retry sequence (including a user pressing "Pay" again after an hour), publish it, and delete older keys with a scheduled job like the `DELETE` above.

## The client side: one key per operation

The server can only help if the client sends the *same* key on every retry. Generate the key once, before the first attempt, and reuse it in the retry loop. Pair it with exponential backoff: wait longer after each failure, with random jitter so thousands of clients don't all retry at the same moment.

```javascript-run
// Client side: make ONE key per operation and send the same key on every retry.
const seen = new Map(); // fake server: key -> response
let attempts = 0;

async function fakeServer(key, body) {
  attempts++;
  if (attempts <= 2) throw new Error("503 Service Unavailable"); // first two calls fail
  if (!seen.has(key)) seen.set(key, { chargeId: `ch_${seen.size + 1}`, amount: body.amount });
  return seen.get(key);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetries(send, { tries = 5, baseMs = 20 } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await send();
    } catch (err) {
      if (attempt === tries) throw err;
      // Exponential backoff with full jitter: wait a random time up to base * 2^attempt.
      await sleep(Math.random() * baseMs * 2 ** attempt);
    }
  }
}

async function main() {
  const body = { amount: 4999 };
  const key = crypto.randomUUID(); // created once, before the first attempt
  const result = await withRetries(() => fakeServer(key, body));
  console.log("result:", JSON.stringify(result));
  console.log("attempts:", attempts, "| distinct keys seen by server:", seen.size);
}

main();
```

Output:

```text
result: {"chargeId":"ch_1","amount":4999}
attempts: 3 | distinct keys seen by server: 1
```

Three attempts, one key, one charge. If `crypto.randomUUID()` were inside `send`, each attempt would carry a new key and the server would see three different operations.

On a web page, a good place to create the key is when the checkout form is rendered or the button is first clicked, kept for the whole payment attempt. That also turns a user's double-click into a harmless duplicate.

## Mistakes that still cause double charges

**Generating the key per attempt instead of per operation.** The most common bug. It looks right in code review because a key is sent, but every retry is a "new" request.

**Claiming the key after doing the work.** Two near-simultaneous requests both see an unused key. Always claim first, with an atomic insert or lock.

**Fingerprints that change for the same request.** `JSON.stringify` keeps the order the keys were inserted in, so `{"a":1,"b":2}` and `{"b":2,"a":1}` hash differently. If clients may serialise fields in different orders, sort keys (or hash only the fields that matter) before hashing, or you'll return 422 for real retries.

**Scoping keys globally.** Two different customers could, by bad luck or a buggy client, send the same key. Scope keys to the account or API credential (make the primary key `(account_id, key)`) so one user's key can never replay another user's response.

**Retrying non-retryable errors.** A 400 or 422 won't succeed on retry; only retry timeouts, connection errors, 409, 429 and 5xx responses, and respect `Retry-After` when the server sends it.

**Assuming downstream calls are covered.** Your key protects *your* endpoint. If your handler calls a payment provider, a mail service or another internal service, each call needs its own protection, usually by passing a key derived from yours.

## How to answer this in an interview

"How would you prevent a payment from being processed twice?" A strong answer, in order:

1. **Name the problem:** a timeout leaves the client unsure whether the request succeeded, so retries are needed, and POST isn't idempotent.
2. **Introduce the key:** the client sends a unique `Idempotency-Key` per operation and reuses it on every retry.
3. **Describe the server:** atomically claim the key (unique constraint), do the work, store the response, and replay it on duplicates. Return 409 while in progress and 422 if the payload changed.
4. **Cover the edges:** key retention window (Stripe uses at least 24 hours), stuck `processing` keys after a crash, scoping keys per account, and passing idempotency on to downstream providers.

Likely follow-ups: "Why not just check for a duplicate order with the same amount?" (two genuine identical orders are legal; only the client knows whether it's a retry), "What if the server crashes after charging but before saving the response?" (the key stays `processing`; recover by checking with the provider, ideally using the same key there), and "Isn't PUT enough?" (yes, when the client can choose the resource ID, e.g. `PUT /orders/{client-generated-id}`, which is the same idea built into the URL).

## Cheat sheet

| Situation | Server response |
| --- | --- |
| Key missing on an endpoint that requires it | `400 Bad Request` |
| New key | Claim it atomically, do the work, store the response |
| Same key, same body, finished | Replay the stored response (same status and body) |
| Same key, same body, still running | `409 Conflict`, client retries later |
| Same key, different body | `422 Unprocessable Content` |
| Key older than the retention window | Deleted; treated as a new request |

The short version: let the client name each operation, store the outcome under that name, and make "have I seen this name?" an atomic check. Then every retry is safe.
