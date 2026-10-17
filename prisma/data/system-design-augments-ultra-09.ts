/**
 * SYSTEM DESIGN ULTRA — batch 09: Reliability patterns. Every example was run by
 * scripts/verify-variant-examples.ts (node, python, go, java); quoted output is that run's output.
 */
import type { SystemDesignUltraAugment } from "./system-design-augments.types";

const augments: SystemDesignUltraAugment[] = [
  {
    title: `What is idempotency and why does it matter?`,
    difficulty: "medium",
    seoDescription: `Idempotency explained from zero: why retries and at-least-once delivery need it, HTTP method rules, idempotency keys and dedup tables, verified.`,
    description: `**Question presented to candidate:**
"We keep hearing that an API or a message handler should be idempotent. What does idempotency actually mean, why do distributed systems need it, and how would you make a non-idempotent operation like 'create an order' safe to retry?"

**What a strong answer should cover:**
- The definition: doing an operation **many times has the same effect as doing it once** (the response may differ, the state must not)
- Why it matters: timeouts make the outcome **unknown**, so clients **retry**; queues deliver **at-least-once**; without idempotency, retries create duplicates or double charges
- HTTP semantics: GET, HEAD, OPTIONS, PUT and DELETE are idempotent by definition (RFC 9110); POST and PATCH are not
- The fix for non-idempotent operations: a client-generated **idempotency key**, a server-side table that stores key, request fingerprint and saved response, enforced with a **unique constraint**
- Details that separate strong answers: reject the same key with a different payload, handle a second request while the first is still in flight, set a retention window, and dedup by **message ID** in consumers
- Idempotency plus at-least-once delivery is how systems get "effectively once" behaviour

**Code / implementation expected:** Optional — sketching the key lookup, the unique insert and the replayed response is a plus; the example simulates a lost response and a duplicate-delivering queue.`,
    answer: `**Target Audience:** Beginners who have built or called a web API and want to understand why retries are dangerous and how real systems make them safe.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output). HTTP method semantics are cited from RFC 9110; Stripe behaviour from the Stripe API reference ("Idempotent requests"); the Idempotency-Key header from the IETF httpapi working-group Internet-Draft.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. Every number comes from running the example; the **Verified** section quotes its full output.

## 1. Why This Even Matters — A Story First

You press the lift button. Nothing seems to happen, so you press it again, and again. The lift still comes **once**. Pressing the button is idempotent: the first press changed the state ("a lift is on its way"), and every later press changes nothing.

Now imagine a shop counter where each time you say "one coffee, please" the barista makes a new coffee. If the barista is noisy and you are not sure you were heard, saying it again gets you two coffees. That operation is **not** idempotent, and repeating yourself has a cost.

Computer networks are the noisy café. A client sends "charge this card", and then the connection drops. Did the request reach the server? Did the server finish the work and the **reply** got lost? The client cannot tell. The only sensible move is to ask again, and that is only safe if asking again cannot do the work twice. Idempotency is the property that makes "just retry" a correct strategy instead of a source of duplicate orders and double charges.

## 2. The Definition

📌 **Interview term: idempotent operation** — an operation where applying it N times leaves the system in the same state as applying it once. Mathematically, f(f(x)) = f(x).

Two clarifications interviewers like to hear:

- **The state must match, not the response.** Deleting a resource twice may return \`204\` then \`404\`; the operation is still idempotent, because after both calls the resource is gone.
- **Idempotent is not the same as safe.** A **safe** operation changes nothing (a read). An idempotent one may change state, but only the first time.

The first part of the example applies three cart operations once and three times, starting from quantity 1:

~~~text
== 1. Same request applied 1x and 3x ==
PUT  /cart/7 {qty: 2}       qty after 1x=2 after 3x=2 idempotent=true
POST /cart/7/add {qty: 1}   qty after 1x=2 after 3x=4 idempotent=false
DELETE /cart/7              qty after 1x=0 after 3x=0 idempotent=true
~~~

"Set the quantity to 2" and "remove the line" are idempotent: repeat them and you land in the same place. "Add one more" is not: three calls gave quantity 4 instead of 2. Most real bugs come from operations shaped like the middle row: increments, appends, "create a new record", "send an email", "charge a card".

📌 **Interview term: safe method** — an HTTP method the client uses only to read (GET, HEAD, OPTIONS, TRACE). Safe methods are automatically idempotent.

### The HTTP rules

RFC 9110 (HTTP Semantics) defines a method as idempotent when multiple identical requests have the same intended effect on the server as a single one, and lists PUT, DELETE and the safe methods as idempotent. The same text explains why the property exists: an idempotent request can be **repeated automatically** if the connection fails before the client reads the response.

| Method | Safe | Idempotent | Why |
| :--- | :---: | :---: | :--- |
| GET, HEAD, OPTIONS | yes | yes | reads only |
| PUT | no | yes | "make the resource look like this" replaces the whole state |
| DELETE | no | yes | the resource is gone after one call or ten |
| POST | no | no | "create a new one" or "do this action" each time |
| PATCH | no | not by definition | "increment by 1" is a valid patch; "set field to X" happens to be idempotent |

Those are promises the **server implementation** must keep. A \`GET /ping?count=1\` handler that increments a counter breaks the contract, and proxies or browsers that retry GETs will double-count.

## 3. Why Retries Happen Everywhere

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="The client sends a request, the server does the work and replies, the reply is lost, and the client sees only a timeout and sends the request again">
  <defs>
    <marker id="sd09q1-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="30" width="160" height="50" rx="8"/>
  <text class="d-text" x="120" y="60" text-anchor="middle">Client</text>
  <rect class="d-box-accent" x="520" y="30" width="160" height="50" rx="8"/>
  <text class="d-text" x="600" y="60" text-anchor="middle">Server</text>
  <path class="d-edge" d="M 120 80 L 120 280"/>
  <path class="d-edge" d="M 600 80 L 600 280"/>
  <path class="d-edge-accent" d="M 120 110 L 592 130" marker-end="url(#sd09q1-arrow)"/>
  <text class="d-sub" x="340" y="105" text-anchor="middle">POST /orders</text>
  <text class="d-accent" x="660" y="160" text-anchor="middle">order 1</text>
  <path class="d-edge-dashed" d="M 600 180 L 380 195"/>
  <text class="d-sub" x="330" y="200" text-anchor="middle">reply lost</text>
  <text class="d-sub" x="200" y="225" text-anchor="middle">timeout</text>
  <path class="d-edge-accent" d="M 120 245 L 592 265" marker-end="url(#sd09q1-arrow)"/>
  <text class="d-sub" x="340" y="243" text-anchor="middle">POST /orders again</text>
</svg>

The client cannot distinguish "the request never arrived" from "the work happened and the reply was lost"; both look like a timeout. Retrying is the only way forward, so the server must make the retry harmless.

Retries come from many layers at once, not only from your own code:

- **Clients and SDKs** retry on timeouts and 5xx errors, often with exponential backoff.
- **Load balancers, proxies and service meshes** may retry a failed upstream call.
- **Users** double-click "Pay" or refresh a page that submitted a form.
- **Message queues** deliver **at-least-once**: if a consumer crashes after doing the work but before acknowledging the message, the broker redelivers it. See [What is a message queue and why use one?](/interview-question/what-is-a-message-queue-and-why-use-one).
- **Workflow engines and sagas** re-run a step after a crash. See [What is the saga pattern for distributed transactions?](/interview-question/what-is-the-saga-pattern-for-distributed-transactions).

📌 **Interview term: at-least-once delivery** — a delivery guarantee where every message is delivered one or more times; nothing is lost, duplicates are possible. It is the default for most brokers because the alternative, at-most-once, can lose messages.

📌 **Interview term: retry storm** — many layers retrying the same failed call at once, multiplying load on a struggling service. Idempotency makes each retry correct; backoff, jitter and [circuit breakers](/interview-question/what-is-the-circuit-breaker-pattern) keep retries from making an outage worse.

## 4. Making a Non-Idempotent Operation Safe: Idempotency Keys

You cannot make "create an order" idempotent by rewriting it as a PUT if the client does not know the order ID in advance. Instead, the client attaches a unique value to **one logical operation**, and reuses that same value on every retry of it.

📌 **Interview term: idempotency key** — a unique value (usually a UUID) that the client generates once per logical operation and sends with every attempt, commonly as an \`Idempotency-Key\` HTTP header. The server uses it to recognise a retry.

The server keeps a table:

| Column | Purpose |
| :--- | :--- |
| \`key\` (unique) | the client key, scoped per account or API token |
| \`request_fingerprint\` | hash of the method, path and body, to detect misuse |
| \`status\` | \`in_progress\`, \`completed\` |
| \`response_code\`, \`response_body\` | the saved result to replay |
| \`created_at\` | for the retention window |

And the request flow is:

1. Try to **insert** the key with status \`in_progress\`. A **unique constraint** makes this atomic: of two concurrent requests with the same key, exactly one insert succeeds.
2. If the insert succeeded, do the work and save the response **in the same database transaction** as the business change, then mark it \`completed\`.
3. If the key already exists and is \`completed\`, compare fingerprints. If they match, return the **saved response** without doing the work. If they differ, reject the request: the client reused a key for a different operation.
4. If the key exists and is still \`in_progress\`, a concurrent retry is running: return a conflict (for example \`409\`) so the client retries later.

Here is that logic running against a server that loses the first response it sends:

~~~text
== 2. Client retries after a lost response, no key ==
  attempt 1: timeout (response lost)
  attempt 2: 201 ord_2
  orders stored: 2 -> ord_1, ord_2

== 3. Same retry with Idempotency-Key: k-42 ==
  attempt 1: timeout (response lost)
  attempt 2: 201 ord_1 (replayed)
  a later retry of the same key:
  attempt 1: 201 ord_1 (replayed)
  orders stored: 1 -> ord_1

== 4. Same key, different payload ==
  attempt 1: 422 key reused with a different payload
  orders stored: 1

~~~

- **Without a key** the retry created a second order: \`ord_1\` and \`ord_2\` for one click.
- **With \`Idempotency-Key: k-42\`** the retry got back the saved \`201 ord_1\`, marked as replayed, and so did a later retry. One order is stored.
- **Same key, different payload** (quantity 5 instead of 1) is rejected instead of silently returning the first order, which would hide a client bug.

The heart of the server is short:

~~~js
const prev = keys.get(req.key);
if (prev) {
  if (prev.fingerprint !== JSON.stringify(req.body))
    return { status: 422, body: "key reused with a different payload" };
  return { ...prev.response, replayed: true };   // replay, do not redo
}
// ...do the work, then save { fingerprint, response } under the key
~~~

The status codes in the simulation are a design choice. Stripe documents the same behaviour: its idempotency layer compares the parameters of a retry with the original request and returns an error if they differ, keys can be up to 255 characters, and on API v1 keys may be removed once they are at least 24 hours old, after which a reused key is treated as a new request (Stripe API reference, "Idempotent requests"). An IETF Internet-Draft, "The Idempotency-Key HTTP Header Field" (httpapi working group), proposes standardising the header; it was still a draft, not an RFC, when this was written.

📌 **Interview term: request fingerprint** — a hash of the parts of a request that define the operation. Comparing it on replay catches a client that reuses a key by mistake.

📌 **Interview term: retention window** — how long the server keeps keys. It must be longer than the longest realistic retry period; after it, a retry is treated as a new operation.

### Where the key comes from matters

The key must be created **before the first attempt** and stored with the operation on the client side, for example when the checkout page loads or when a job is enqueued. A key generated inside the retry loop gives each attempt a new key and protects nothing. For server-to-server calls, a natural key often works better than a random one: the order ID for "charge order 812", or the message ID for "process message m-77".

## 5. Idempotent Consumers: Dedup by Message ID

The same idea applies to queues. Every message carries a unique ID, and the consumer records which IDs it has processed:

~~~text
  deliveries=7 unique=4
  without dedup: handled=7 credited=$35.00
  with dedup:    handled=4 credited=$20.00
~~~

The broker delivered 7 messages but only 4 were unique. A consumer that credits $5 per message without deduplication credited $35; the deduplicating consumer credited the correct $20.

📌 **Interview term: idempotent consumer (inbox / dedup table)** — a consumer that stores each processed message ID, ideally **in the same transaction as its side effect**, and skips IDs it has already seen.

If the dedup record and the side effect are not committed together, a crash between them reopens the hole: either the work is done and the ID not recorded (duplicate on redelivery) or the ID is recorded and the work lost. This is the consumer-side twin of the producer-side [outbox pattern](/interview-question/outbox-pattern-vs-polling-for-cdc-how-do-you-avoid-dual-write-failure).

📌 **Interview term: effectively-once processing** — at-least-once delivery plus idempotent processing. Each message may arrive several times, but its effect happens once. Whether brokers can promise more than this is covered in [Exactly-once processing — can Kafka or SQS guarantee it?](/interview-question/exactly-once-processing-can-kafka-or-sqs-guarantee-it).

## 6. Other Ways to Get Idempotency

Keys are the general tool, but many operations can be made idempotent by their shape:

| Technique | Example | Works because |
| :--- | :--- | :--- |
| Absolute writes instead of deltas | \`SET qty = 2\` instead of \`qty = qty + 1\` | repeating it lands on the same state |
| Client-chosen IDs | \`PUT /orders/{uuid}\` | the second PUT finds the order already there |
| Unique constraints on a natural key | one payment per \`order_id\` | the database rejects the duplicate insert |
| Conditional writes | \`UPDATE ... WHERE version = 7\`, HTTP \`If-Match\` | the retry finds the version already moved on and does nothing |
| Upserts | \`INSERT ... ON CONFLICT DO NOTHING\` | the duplicate becomes a no-op |
| State machines | only move \`PENDING -> PAID\`, ignore \`PAID -> PAID\` | the transition is applied once |

Conditional writes connect idempotency to concurrency control; see [What is the difference between optimistic and pessimistic locking?](/interview-question/what-is-the-difference-between-optimistic-and-pessimistic-locking).

Side effects outside your database (emails, card charges, calls to another company API) are the hard case: your table can say "done" only after the external call, and a crash in between leaves you not knowing. The answer is to pass an idempotency key **downstream** as well, so the external system deduplicates too. The full payment version, with crash recovery and reconciliation, is [How do you make a payment system reliable against retries?](/interview-question/how-do-you-make-a-payment-system-reliable-against-retries).

## 7. Verified: Running the Code

The example **"Idempotency in miniature: PUT vs POST, an idempotency-key store surviving a lost response, payload mismatch, and a dedup consumer"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
== 1. Same request applied 1x and 3x ==
PUT  /cart/7 {qty: 2}       qty after 1x=2 after 3x=2 idempotent=true
POST /cart/7/add {qty: 1}   qty after 1x=2 after 3x=4 idempotent=false
DELETE /cart/7              qty after 1x=0 after 3x=0 idempotent=true

== 2. Client retries after a lost response, no key ==
  attempt 1: timeout (response lost)
  attempt 2: 201 ord_2
  orders stored: 2 -> ord_1, ord_2

== 3. Same retry with Idempotency-Key: k-42 ==
  attempt 1: timeout (response lost)
  attempt 2: 201 ord_1 (replayed)
  a later retry of the same key:
  attempt 1: 201 ord_1 (replayed)
  orders stored: 1 -> ord_1

== 4. Same key, different payload ==
  attempt 1: 422 key reused with a different payload
  orders stored: 1

== 5. At-least-once queue delivers duplicates ==
  deliveries=7 unique=4
  without dedup: handled=7 credited=$35.00
  with dedup:    handled=4 credited=$20.00
~~~

What the simulation stands for and leaves out: the "server" is an in-process object and the key table is a \`Map\`/\`dict\`, standing in for a database table with a unique index. "The network loses the first response" is a counter, not a real socket. There is no concurrency, so the \`in_progress\` conflict case from section 4 is described but not exercised, and the key table never expires. The cost of the dedup table (one row per operation for the retention window) is real in production and is not modelled.

## Edge Cases Worth Knowing

- **Scope keys per client.** Two customers may generate the same key string; the unique constraint should be on (account, key), not key alone.
- **Errors are results too.** If the first attempt failed validation, replaying the same \`400\` is correct. If it failed with a transient \`500\` before doing any work, many APIs let the retry run again; decide and document which errors are saved.
- **Partial work.** If the handler does three things and crashes after two, a replay must not redo the first two. Wrap them in one transaction, or make each step idempotent on its own.
- **Reads after writes.** A replayed response is the old response. If the resource changed since, the client sees the original result, which is what "the same operation" means.
- **Long retention is not free.** At 10 million operations a day and a 7-day window, the table holds 70 million rows; budget for it and purge by \`created_at\`.

## Common Pitfalls

- **Generating the key inside the retry loop.** Every attempt gets a new key and duplicates go straight through.
- **Check-then-insert without a unique constraint.** Two concurrent retries both see "no key" and both do the work; the atomic insert is what makes it safe.
- **Saving the key in a different transaction from the business write.** A crash between them gives either a duplicate or a key that claims work that never happened.
- **Assuming PUT and DELETE handlers are idempotent because the spec says so.** The spec describes intent; a PUT that appends to a history list on every call is not idempotent.
- **Ignoring the payload on replay.** Returning the old response for a different request silently hides client bugs; compare a fingerprint.
- **Forgetting downstream calls.** Your own dedup table does not stop the email provider or card processor from acting twice; pass a key to them as well.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">An operation is idempotent if doing it many times leaves the <strong style="color:#ffca28;">same state</strong> as doing it once. The response can differ (a second DELETE may get <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">404</code>), the state cannot.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why:</strong> <span style="color:#f0e2c8;">A timeout leaves the outcome <strong style="color:#ffca28;">unknown</strong>, so clients, proxies and users retry, and queues deliver <strong style="color:#ffca28;">at-least-once</strong>. Without idempotency every retry is a possible duplicate order or double charge; in my demo a lost reply plus a retry created <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ord_1</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ord_2</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. HTTP:</strong> <span style="color:#f0e2c8;">By RFC 9110, GET, HEAD, OPTIONS, PUT and DELETE are idempotent; POST and PATCH are not. That is a contract the server code must actually keep.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The fix:</strong> <span style="color:#f0e2c8;">For non-idempotent operations, the client sends an <strong style="color:#ffca28;">idempotency key</strong> created once per operation. The server inserts it under a <strong style="color:#ffca28;">unique constraint</strong>, does the work and stores the response in the same transaction, and replays that response for any retry; same key with a different payload is rejected.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Consumers:</strong> <span style="color:#f0e2c8;">For queues, dedup by <strong style="color:#ffca28;">message ID</strong> in the same transaction as the side effect. At-least-once delivery plus idempotent processing gives <strong style="color:#ffca28;">effectively-once</strong> results; in the demo 7 deliveries of 4 unique messages credited $20, not $35.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just check whether the key exists, then insert it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two concurrent retries can both pass the check before either inserts. The insert itself must be the check: a unique constraint (or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INSERT ... ON CONFLICT</code>) lets exactly one request win, and the loser returns a conflict or the saved response.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How long do you keep idempotency keys?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Longer than the longest realistic retry window, including queued jobs and users coming back to a page. Stripe documents that v1 keys can be pruned once at least 24 hours old. After the window, a retry is a new operation, so clients must not retry older work blindly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What do you return when a retry arrives while the first request is still running?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Do not run it in parallel. Return a conflict such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">409</code> (or wait briefly on the row lock) so the client retries after the first finishes, and then gets the saved response.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is PATCH idempotent?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not by definition. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{"op":"increment"}</code> is a valid patch and is not idempotent; a patch that sets fields to absolute values happens to be. Treat PATCH like POST unless you design it otherwise, for example with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">If-Match</code> on a version.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does idempotency give you exactly-once delivery?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Delivery stays at-least-once; idempotency makes the <strong style="color:#ffca28;">effect</strong> happen once. True exactly-once delivery across a network is not achievable in general, so systems combine retries with dedup.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Idempotent operation | Doing it N times leaves the same state as doing it once |
| Safe method | An HTTP method used only to read; automatically idempotent |
| At-least-once delivery | Every message arrives one or more times; duplicates possible |
| Retry storm | Many layers retrying at once and multiplying load |
| Idempotency key | Client-generated unique value sent with every attempt of one operation |
| Request fingerprint | Hash of the request used to detect a key reused for a different operation |
| Retention window | How long the server remembers keys |
| Idempotent consumer (inbox / dedup table) | A consumer that records processed message IDs and skips repeats |
| Effectively-once processing | At-least-once delivery plus idempotent processing |

**Conclusion:** Idempotency means a repeat does no extra harm: the state after many attempts equals the state after one. Distributed systems need it because a timeout hides whether work happened, so the only safe recovery is to retry, and every layer from SDKs to message brokers does exactly that. Some operations are idempotent by shape (absolute writes, client-chosen IDs, conditional updates); the rest get an idempotency key, stored atomically with the work under a unique constraint and answered with a saved response on every retry. Consumers do the same with message IDs. The demo showed the difference in plain numbers: one order instead of two, and $20 credited instead of $35.`,
    examples: [
      {
        label: `Idempotency in miniature: PUT vs POST, an idempotency-key store surviving a lost response, payload mismatch, and a dedup consumer`,
        variants: [
          { tech: "node", code: `// Idempotency in miniature: natural vs non-idempotent operations, an idempotency-key
// store that survives a lost response, payload mismatch, and a deduplicating consumer.

console.log("== 1. Same request applied 1x and 3x ==");
// Cart state: quantity of item 7 starts at 1. 0 means the line is absent.
const ops = [
  ["PUT  /cart/7 {qty: 2}", (q) => 2],
  ["POST /cart/7/add {qty: 1}", (q) => q + 1],
  ["DELETE /cart/7", (q) => 0],
];
for (const [name, f] of ops) {
  const once = f(1);
  let thrice = 1;
  for (let i = 0; i < 3; i++) thrice = f(thrice);
  console.log(\`\${name.padEnd(27)} qty after 1x=\${once} after 3x=\${thrice} idempotent=\${once === thrice}\`);
}

// A server that creates orders. The network drops the FIRST response it sends.
function makeServer(useKeys) {
  const orders = [];
  const keys = new Map(); // idempotency key -> { fingerprint, response }
  let responsesSent = 0;
  return {
    orders,
    handle(req) {
      if (useKeys && req.key) {
        const prev = keys.get(req.key);
        if (prev) {
          if (prev.fingerprint !== JSON.stringify(req.body))
            return { status: 422, body: "key reused with a different payload" };
          return { ...prev.response, replayed: true };
        }
      }
      const order = { id: \`ord_\${orders.length + 1}\`, item: req.body.item, qty: req.body.qty };
      orders.push(order);
      const response = { status: 201, body: order.id, replayed: false };
      if (useKeys && req.key) keys.set(req.key, { fingerprint: JSON.stringify(req.body), response });
      responsesSent++;
      if (responsesSent === 1) return null; // response lost on the way back: client times out
      return response;
    },
  };
}

function clientCreate(server, body, key, maxAttempts) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = server.handle({ key, body });
    if (res === null) { console.log(\`  attempt \${attempt}: timeout (response lost)\`); continue; }
    console.log(\`  attempt \${attempt}: \${res.status} \${res.body}\${res.replayed ? " (replayed)" : ""}\`);
    return res;
  }
}

console.log("\\n== 2. Client retries after a lost response, no key ==");
const naive = makeServer(false);
clientCreate(naive, { item: "book", qty: 1 }, null, 3);
console.log(\`  orders stored: \${naive.orders.length} -> \${naive.orders.map((o) => o.id).join(", ")}\`);

console.log("\\n== 3. Same retry with Idempotency-Key: k-42 ==");
const safe = makeServer(true);
clientCreate(safe, { item: "book", qty: 1 }, "k-42", 3);
console.log("  a later retry of the same key:");
clientCreate(safe, { item: "book", qty: 1 }, "k-42", 1);
console.log(\`  orders stored: \${safe.orders.length} -> \${safe.orders.map((o) => o.id).join(", ")}\`);

console.log("\\n== 4. Same key, different payload ==");
clientCreate(safe, { item: "book", qty: 5 }, "k-42", 1);
console.log(\`  orders stored: \${safe.orders.length}\`);

console.log("\\n== 5. At-least-once queue delivers duplicates ==");
const deliveries = ["m1", "m2", "m2", "m3", "m1", "m4", "m3"];
let naiveCount = 0, dedupCount = 0;
const processed = new Set();
const naiveTotal = { cents: 0 }, dedupTotal = { cents: 0 };
for (const id of deliveries) {
  naiveCount++; naiveTotal.cents += 500;
  if (processed.has(id)) continue;
  processed.add(id); dedupCount++; dedupTotal.cents += 500;
}
console.log(\`  deliveries=\${deliveries.length} unique=\${processed.size}\`);
console.log(\`  without dedup: handled=\${naiveCount} credited=$\${(naiveTotal.cents / 100).toFixed(2)}\`);
console.log(\`  with dedup:    handled=\${dedupCount} credited=$\${(dedupTotal.cents / 100).toFixed(2)}\`);` },
          { tech: "python", code: `# Idempotency in miniature: natural vs non-idempotent operations, an idempotency-key
# store that survives a lost response, payload mismatch, and a deduplicating consumer.
import json

print("== 1. Same request applied 1x and 3x ==")
# Cart state: quantity of item 7 starts at 1. 0 means the line is absent.
ops = [
    ("PUT  /cart/7 {qty: 2}", lambda q: 2),
    ("POST /cart/7/add {qty: 1}", lambda q: q + 1),
    ("DELETE /cart/7", lambda q: 0),
]
for name, f in ops:
    once = f(1)
    thrice = 1
    for _ in range(3):
        thrice = f(thrice)
    print(f"{name:<27} qty after 1x={once} after 3x={thrice} idempotent={'true' if once == thrice else 'false'}")


def fp(body):
    return json.dumps(body, separators=(",", ":"))


class Server:
    """Creates orders. The network drops the FIRST response it sends."""

    def __init__(self, use_keys):
        self.use_keys = use_keys
        self.orders = []
        self.keys = {}  # idempotency key -> (fingerprint, response)
        self.responses_sent = 0

    def handle(self, key, body):
        if self.use_keys and key:
            prev = self.keys.get(key)
            if prev:
                if prev[0] != fp(body):
                    return {"status": 422, "body": "key reused with a different payload", "replayed": False}
                return {**prev[1], "replayed": True}
        order = {"id": f"ord_{len(self.orders) + 1}", "item": body["item"], "qty": body["qty"]}
        self.orders.append(order)
        response = {"status": 201, "body": order["id"], "replayed": False}
        if self.use_keys and key:
            self.keys[key] = (fp(body), response)
        self.responses_sent += 1
        if self.responses_sent == 1:
            return None  # response lost on the way back: client times out
        return response


def client_create(server, body, key, max_attempts):
    for attempt in range(1, max_attempts + 1):
        res = server.handle(key, body)
        if res is None:
            print(f"  attempt {attempt}: timeout (response lost)")
            continue
        print(f"  attempt {attempt}: {res['status']} {res['body']}{' (replayed)' if res['replayed'] else ''}")
        return res


print("\\n== 2. Client retries after a lost response, no key ==")
naive = Server(False)
client_create(naive, {"item": "book", "qty": 1}, None, 3)
print(f"  orders stored: {len(naive.orders)} -> {', '.join(o['id'] for o in naive.orders)}")

print("\\n== 3. Same retry with Idempotency-Key: k-42 ==")
safe = Server(True)
client_create(safe, {"item": "book", "qty": 1}, "k-42", 3)
print("  a later retry of the same key:")
client_create(safe, {"item": "book", "qty": 1}, "k-42", 1)
print(f"  orders stored: {len(safe.orders)} -> {', '.join(o['id'] for o in safe.orders)}")

print("\\n== 4. Same key, different payload ==")
client_create(safe, {"item": "book", "qty": 5}, "k-42", 1)
print(f"  orders stored: {len(safe.orders)}")

print("\\n== 5. At-least-once queue delivers duplicates ==")
deliveries = ["m1", "m2", "m2", "m3", "m1", "m4", "m3"]
naive_count = dedup_count = 0
naive_cents = dedup_cents = 0
processed = set()
for mid in deliveries:
    naive_count += 1
    naive_cents += 500
    if mid in processed:
        continue
    processed.add(mid)
    dedup_count += 1
    dedup_cents += 500
print(f"  deliveries={len(deliveries)} unique={len(processed)}")
print(f"  without dedup: handled={naive_count} credited=\${naive_cents / 100:.2f}")
print(f"  with dedup:    handled={dedup_count} credited=\${dedup_cents / 100:.2f}")` },
        ],
      },
    ],
  },
  {
    title: `How do you make a payment system reliable against retries?`,
    difficulty: "hard",
    seoDescription: `Make payments safe to retry: end-to-end idempotency keys, a payment state machine, crash recovery, reconciliation and jittered backoff, simulated.`,
    description: `**Question presented to candidate:**
"Your checkout calls a payment service, which calls a card processor such as Stripe or Adyen. Requests time out, clients retry, workers crash halfway. How do you guarantee a customer is charged exactly once, and that your records always match what the processor actually did?"

**What a strong answer should cover:**
- Why retries are unavoidable: a timeout means the outcome is **unknown**, at every hop (client to service, service to processor)
- **End-to-end idempotency**: a client key on your API, stored under a unique constraint, and a key passed **downstream** to the processor (derived from your payment ID) so the processor deduplicates too
- A durable **payment state machine** (for example \`CREATED -> PENDING_PSP -> SUCCEEDED / FAILED / UNKNOWN\`) written before the external call, so a crash leaves a row that a **recovery worker** can finish with the same key
- A **double-entry ledger** and daily **reconciliation** against processor reports to catch anything the online path missed
- Retry policy: only retry what is safe, **exponential backoff with jitter**, retry at one layer, and **dedup webhooks** by event ID
- Numbers: a worked estimate of request rate and storage for the key table and ledger

**Clarifying questions expected:**
- Is this card-on-file charging, a wallet, or payouts? Do we hold funds or only forward to a processor?
- Which processor, and does it support idempotency keys and a "look up by key or reference" call?
- What is the scale and what is the acceptable time for a payment to sit in an unknown state?

**Code / implementation expected:** Optional — a sketch of the key check, the state machine and the recovery job is strong; the example simulates timeouts and crashes and counts real charges.`,
    answer: `**Target Audience:** Engineers who know what an API and a database transaction are, and want to design the money path so that retries and crashes can never double-charge a customer.
**Difficulty:** Hard
**Verified with:** Node 22.22 and Python 3.12 (both print identical output). Stripe idempotency behaviour is cited from the Stripe API reference ("Idempotent requests"). Capacity numbers are worked arithmetic from stated assumptions, recomputed in Python.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. The basics of idempotency are covered in [What is idempotency and why does it matter?](/interview-question/what-is-idempotency-and-why-does-it-matter); this page applies them to the money path, where one mistake is a double charge. The full payment product (wallets, payouts, fraud, PSP routing) is [How would you design a payment system?](/interview-question/how-would-you-design-a-payment-system-573c).

## 1. Why This Even Matters — A Story First

You pay at a petrol station. The card machine prints "connection error". Did the bank take the money? The cashier does not know, you do not know, and the machine does not know. If the cashier simply runs the card again, you may pay twice. If the cashier lets you leave, the station may never be paid.

The sensible cashier does three things. They use the **same receipt number** for the second try, so the bank can say "I already did that one". They write in a notebook "pump 4, £50, outcome unknown" **before** trying again, so nothing is forgotten if they get distracted. And at the end of the day they compare the notebook with the bank statement line by line.

That is the whole design of a retry-safe payment system: the same **key** on every attempt, a **durable record written before** the risky call, and **reconciliation** against the source of truth. The rest of this page is those three ideas, made precise.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do we charge cards through a processor, or move money between our own accounts? | With a processor, the hardest part is the external call whose outcome can be unknown. With an internal wallet, a single database transaction can do it. |
| Does the processor accept idempotency keys and let us look a charge up by our reference? | If yes, recovery is "retry with the same key". If not, recovery needs a status query and a manual queue. |
| Is the flow synchronous (user waits) or can it be asynchronous (webhook later)? | Decides whether an unknown outcome is shown as "processing" or blocks the checkout. |
| What scale, and what peak (sales events)? | Sizes the key table, the ledger and the recovery job. |
| How long may a payment stay unknown before a human looks? | Sets the recovery and reconciliation cadence and alerting. |
| Card authorisation and capture as two steps, or one? | Two steps add a second external call that also needs a key. |

## 3. Requirements

**Functional**

- Create a payment for an order; return its final status.
- Retries from any client, proxy or worker never create a second charge.
- Every money movement is recorded in a ledger that always balances.
- Processor webhooks (asynchronous status updates) are applied once.

**Non-functional**

- **Correctness over availability** on the money path: it is better to say "processing, check back" than to guess.
- Every payment reaches a final state (succeeded or failed) automatically within minutes, or is escalated.
- Full audit trail: who asked, which attempts happened, what the processor said.

## 4. Capacity Estimate

Assumptions: 10 million payments per day, peak traffic 5x the daily average, the idempotency key table keeps keys 7 days at about 1 KB per row (key, fingerprint, saved response), and each payment writes 2 ledger rows of about 200 bytes.

| Quantity | Arithmetic | Result |
| :--- | :--- | :--- |
| Average rate | 10,000,000 / 86,400 s | about 116 payments/s |
| Peak rate | 116 x 5 | about 579 payments/s |
| Key table size | 10,000,000 x 7 days x 1 KB | 70 million rows, 70 GB |
| Ledger growth | 10,000,000 x 2 rows x 365 x 200 B | 7.3 billion rows, 1.46 TB per year |
| Worst-case retry amplification | 3 layers each retrying 3 times | 3 x 3 x 3 = 27 attempts per click |

The write rate is modest for a single well-indexed relational database; payments usually start on one primary (PostgreSQL or MySQL) because transactions and unique constraints are exactly what the design leans on. The ledger is the part that grows; it is append-only and partitions well by time. The last row is the real danger: if the client, the service and an internal HTTP library each retry 3 times, one click can become 27 calls to the processor. Idempotency keys make those calls harmless; a rule of **retrying at one layer** keeps them from happening.

## 5. API

~~~text
POST /v1/payments
Idempotency-Key: 6f1c0e7a-...          (created once per checkout attempt)
{ "order_id": "ord_812", "amount": 5000, "currency": "GBP", "payment_method": "pm_..." }

201 Created   { "payment_id": "pay_1", "status": "succeeded", "charge_id": "ch_1" }
200 OK        same body, replayed for a retry with the same key
202 Accepted  { "payment_id": "pay_1", "status": "processing" }   outcome not known yet
409 Conflict  a request with this key is still in progress
422           this key was already used with a different body

GET /v1/payments/pay_1                 poll the final status
POST /webhooks/psp                     processor events, deduplicated by event id
~~~

## 6. Data Model

| Table | Key columns | Notes |
| :--- | :--- | :--- |
| \`idempotency_keys\` | \`(merchant_id, key)\` unique, \`fingerprint\`, \`payment_id\`, \`response\`, \`created_at\` | inserted first; the unique constraint is the lock |
| \`payments\` | \`payment_id\` PK, \`order_id\` unique, \`amount\`, \`status\`, \`psp_charge_id\`, \`attempts\`, \`updated_at\` | the state machine; \`order_id\` unique blocks a second payment for one order even with a new key |
| \`ledger_entries\` | \`entry_id\`, \`payment_id\`, \`account\`, \`amount\`, append-only | every payment writes a debit and a credit that sum to zero |
| \`psp_events\` | \`event_id\` unique, \`payload\`, \`processed_at\` | webhook inbox for dedup |

📌 **Interview term: double-entry ledger** — every money movement is recorded as at least two entries, a debit and a credit, that sum to zero. If the sum of all entries is not zero, something is wrong, which makes errors detectable.

## 7. High-Level Architecture

<svg class="iq-diagram" width="100%" viewBox="0 0 760 360" role="img" aria-label="Client calls the payment API with an idempotency key; the API writes keys, payments and ledger rows in one database and calls the processor with the payment id as its key; a recovery worker and a reconciliation job read the same database">
  <defs>
    <marker id="sd09q2-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="40" width="150" height="60" rx="8"/>
  <text class="d-text" x="105" y="66" text-anchor="middle">Checkout</text>
  <text class="d-sub" x="105" y="86" text-anchor="middle">key per attempt</text>
  <rect class="d-box-accent" x="290" y="40" width="180" height="60" rx="8"/>
  <text class="d-text" x="380" y="66" text-anchor="middle">Payment API</text>
  <text class="d-sub" x="380" y="86" text-anchor="middle">state machine</text>
  <rect class="d-box" x="580" y="40" width="150" height="60" rx="8"/>
  <text class="d-text" x="655" y="66" text-anchor="middle">Processor</text>
  <text class="d-sub" x="655" y="86" text-anchor="middle">key = pay id</text>
  <rect class="d-box-muted" x="270" y="200" width="220" height="70" rx="8"/>
  <text class="d-text" x="380" y="228" text-anchor="middle">Payments DB</text>
  <text class="d-sub" x="380" y="250" text-anchor="middle">keys, payments, ledger</text>
  <rect class="d-box" x="30" y="200" width="150" height="70" rx="8"/>
  <text class="d-text" x="105" y="228" text-anchor="middle">Recovery</text>
  <text class="d-sub" x="105" y="250" text-anchor="middle">stuck rows</text>
  <rect class="d-box" x="580" y="200" width="150" height="70" rx="8"/>
  <text class="d-text" x="655" y="228" text-anchor="middle">Reconcile</text>
  <text class="d-sub" x="655" y="250" text-anchor="middle">daily report</text>
  <path class="d-edge" d="M 180 70 L 282 70" marker-end="url(#sd09q2-arrow)"/>
  <path class="d-edge-accent" d="M 470 70 L 572 70" marker-end="url(#sd09q2-arrow)"/>
  <path class="d-edge" d="M 380 100 L 380 192" marker-end="url(#sd09q2-arrow)"/>
  <path class="d-edge-dashed" d="M 180 235 L 262 235" marker-end="url(#sd09q2-arrow)"/>
  <path class="d-edge-dashed" d="M 580 235 L 498 235" marker-end="url(#sd09q2-arrow)"/>
  <path class="d-edge-dashed" d="M 655 192 L 655 108" marker-end="url(#sd09q2-arrow)"/>
  <text class="d-sub" x="695" y="150" text-anchor="start">report</text>
</svg>

The API writes to one database before and after the processor call. The recovery worker finishes payments stuck in a pending or unknown state by calling the processor again with the same key; the reconciliation job compares the ledger with the processor settlement report.

## 8. Deep Dive 1: Idempotency Has to Be End to End

There are **two** hops where a reply can be lost, and each needs its own key.

📌 **Interview term: end-to-end idempotency** — every hop that can be retried carries a key the next system deduplicates on: the client key into your API, and a key derived from your payment ID into the processor.

The example runs the same checkout three ways. A fake processor charges the card and, when told to, loses its reply; a fake service crash happens after the processor said yes.

~~~text
== A. No keys anywhere; attempt 1 dies after the charge, client sees a timeout ==
    service crashed after PSP said ok
  client attempt 1: timeout
  client attempt 2: 201 pay_2 ch_2
  card charged 2x = $100.00 | ledger merchant $50.00, entries sum to 0 | reconciled=false

== B. Key on our API only; our call to the PSP times out once ==
    psp attempt 1: timeout
  client attempt 1: 201 pay_1 ch_2
  card charged 2x = $100.00 | ledger merchant $50.00, entries sum to 0 | reconciled=false

== C. Keys end to end (API key + PSP key = payment id) ==
    psp attempt 1: timeout
  client attempt 1: 201 pay_1 ch_1 (psp replayed)
  client attempt 1: 200 pay_1 ch_1 (replayed)
  card charged 1x = $50.00 | ledger merchant $50.00, entries sum to 0 | reconciled=true
~~~

- **A. No keys:** the first attempt charged the card and then died, the client retried, and the service made a second payment and a second charge: **$100 taken for a $50 order**, and the ledger, which only knows about one, does not reconcile.
- **B. A key on our API only:** the client was fine, but **our** call to the processor timed out after the processor had charged. We retried without a key and the processor charged again. Our API key protects the first hop only.
- **C. Keys end to end:** the processor received \`pay_1\` as its idempotency key on both attempts and answered the retry with the original \`ch_1\`. A later client retry got the saved response (\`200 ... (replayed)\`). One charge, ledger reconciled.

The processor key should be **deterministic**: derived from your payment row (its ID, or ID plus attempt type like \`pay_1:capture\`), never random per attempt, so any worker on any machine that retries this payment sends the same key. Stripe documents that its idempotency layer returns the stored result for a repeated key and returns an error if the parameters differ, with keys up to 255 characters; on API v1 keys may be pruned once at least 24 hours old (Stripe API reference). That retention matters: **your recovery path must finish within the processor key window**, or a late retry becomes a new charge.

Also add a business-level guard: \`payments.order_id\` is unique. Even if a buggy client sends a new idempotency key for the same order, the database refuses a second payment row.

## 9. Deep Dive 2: The State Machine and Unknown Outcomes

The dangerous moment is between "the processor charged" and "we wrote that down". A crash there leaves the money moved and no record of it. The fix is to write the intent **first**.

📌 **Interview term: payment state machine** — the payment row moves through explicit states, each written durably before the next action: \`CREATED -> PENDING_PSP -> SUCCEEDED\` or \`FAILED\`, plus \`UNKNOWN\` when the processor could not be reached and the outcome is not known.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="States CREATED, PENDING_PSP, SUCCEEDED, FAILED and UNKNOWN; UNKNOWN goes back to PENDING_PSP through the recovery worker">
  <defs>
    <marker id="sd09q2-arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="90" width="130" height="56" rx="8"/>
  <text class="d-text" x="85" y="123" text-anchor="middle">CREATED</text>
  <rect class="d-box-accent" x="220" y="90" width="150" height="56" rx="8"/>
  <text class="d-text" x="295" y="123" text-anchor="middle">PENDING_PSP</text>
  <rect class="d-box" x="470" y="20" width="150" height="56" rx="8"/>
  <text class="d-text" x="545" y="53" text-anchor="middle">SUCCEEDED</text>
  <rect class="d-box" x="470" y="160" width="150" height="56" rx="8"/>
  <text class="d-text" x="545" y="193" text-anchor="middle">FAILED</text>
  <rect class="d-box-muted" x="220" y="190" width="150" height="50" rx="8"/>
  <text class="d-text" x="295" y="220" text-anchor="middle">UNKNOWN</text>
  <path class="d-edge" d="M 150 118 L 212 118" marker-end="url(#sd09q2-arrow2)"/>
  <path class="d-edge" d="M 370 105 L 462 55" marker-end="url(#sd09q2-arrow2)"/>
  <path class="d-edge" d="M 370 130 L 462 182" marker-end="url(#sd09q2-arrow2)"/>
  <path class="d-edge-dashed" d="M 270 146 L 270 182" marker-end="url(#sd09q2-arrow2)"/>
  <path class="d-edge-accent" d="M 320 190 L 320 154" marker-end="url(#sd09q2-arrow2)"/>
  <text class="d-sub" x="660" y="115" text-anchor="middle">final</text>
</svg>

The dashed edge is a timeout or crash; the accent edge back up is the recovery worker retrying with the same key. Only SUCCEEDED and FAILED are final.

The flow for one request:

1. In one transaction: insert the idempotency key (unique), insert the payment as \`PENDING_PSP\`. Commit.
2. Call the processor with key = payment ID.
3. In one transaction: set \`SUCCEEDED\` (or \`FAILED\`), store the charge ID, write the two ledger entries, save the response on the key row. Commit.

If step 2 times out, mark the payment \`UNKNOWN\` and tell the client \`202 processing\`. If the process crashes anywhere, the row is still \`PENDING_PSP\`. Either way a **recovery worker** picks up rows that have been pending for longer than a threshold and calls the processor again **with the same key**. Because the processor deduplicates, the retry either performs the charge once or returns the charge that already happened.

~~~text
== D. Crash after the PSP charged, before we recorded it ==
    service crashed after PSP said ok
  client attempt 1: timeout
  client attempt 2: 409 pay_1 still PENDING_PSP, retry later
    recovery: pay_1 -> ch_1 (psp replayed)
  client attempt 1: 200 pay_1 ch_1 (replayed)
  card charged 1x = $50.00 | ledger merchant $50.00, entries sum to 0 | reconciled=true
~~~

The service crashed after the processor charged. The client retry found the row still \`PENDING_PSP\` and got \`409\` instead of starting a new charge. The recovery worker retried with key \`pay_1\`, the processor replied with the existing \`ch_1\`, and the payment was completed and recorded: one charge, ledger reconciled.

📌 **Interview term: recovery worker (sweeper)** — a background job that scans for payments stuck in a non-final state and drives them to a final state using the same idempotency key. It is what turns "unknown" into "known" without a human.

Never resolve an unknown outcome by **guessing**. Declaring it failed and letting the customer pay again is a double charge if the first one went through; declaring it succeeded ships goods that may never be paid. Ask the processor.

## 10. Deep Dive 3: Retry Policy, Webhooks and Reconciliation

**What to retry.** Retry timeouts, connection errors and explicit "try again" responses (\`429\`, \`503\`). Do not retry a decline or a validation error; the answer will not change, and repeated declines can look like card testing to the processor.

**How to retry.** Use **exponential backoff with jitter**, a cap, and a small attempt limit, and retry at **one** layer (usually the service, not the SDK and the client and the proxy all at once).

~~~text
== E. Retry schedule: exponential backoff, full jitter, base 100 ms, cap 2000 ms ==
  delay/ceiling ms: 0/100  114/200  102/400  358/800  1046/1600  1933/2000
~~~

The ceiling doubles from 100 ms to a 2,000 ms cap; each actual delay is a random value between 0 and the ceiling. That randomness spreads retries from thousands of clients over time instead of having them all hit the processor in the same millisecond after an outage.

📌 **Interview term: exponential backoff with full jitter** — wait a random time between 0 and min(cap, base x 2^attempt) before each retry. Backoff reduces pressure on a struggling dependency; jitter prevents synchronised retry waves.

📌 **Interview term: retry budget** — a limit on retries as a fraction of normal traffic (for example "retries may add at most 10% load"), so retries cannot multiply an outage. A [circuit breaker](/interview-question/what-is-the-circuit-breaker-pattern) is the stronger form: stop calling a processor that is clearly down.

**Webhooks.** Processors send asynchronous events ("charge succeeded", "refund completed") and redeliver them until you answer \`2xx\`, so you will receive duplicates and out-of-order events. Insert each event ID into \`psp_events\` under a unique constraint in the same transaction that updates the payment, and only move the state machine forward (ignore \`SUCCEEDED -> PENDING\`).

**Publishing events.** "Payment succeeded" must reach the order service. Write it to an outbox table in the same transaction as the state change rather than calling a broker afterwards; see [Outbox pattern vs polling for CDC — how do you avoid dual-write failure?](/interview-question/outbox-pattern-vs-polling-for-cdc-how-do-you-avoid-dual-write-failure). Multi-step flows that need compensation (charge, then reserve stock, refund if stock fails) are sagas: [What is the saga pattern for distributed transactions?](/interview-question/what-is-the-saga-pattern-for-distributed-transactions).

📌 **Interview term: reconciliation** — regularly comparing your ledger with the processor settlement report, charge by charge. Anything present on one side and missing on the other (scenarios A and B above, a lost webhook, a manual refund in the processor dashboard) becomes a ticket. It is the safety net that catches what the online path missed.

## 11. What Breaks First at 10x

At 100 million payments a day (about 1,160/s average, 5,800/s peak):

- **The single primary database** becomes the bottleneck. Shard by merchant or by payment ID, keeping a payment, its key row and its ledger entries on the same shard so step 1 and step 3 stay single-shard transactions. See [What is database sharding?](/interview-question/what-is-database-sharding).
- **The key table** reaches 700 million rows for a 7-day window; partition by day and drop old partitions instead of deleting rows.
- **Processor rate limits** start to matter; spread across processors or accounts, and make sure retries count against a budget.
- **Recovery and reconciliation** must be parallel and incremental (per shard, per hour) instead of one nightly job.

## 12. Verified: Running the Code

The example **"Payment retries: double charges without keys, end-to-end keys through the PSP, crash recovery, reconciliation and jittered backoff"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
== A. No keys anywhere; attempt 1 dies after the charge, client sees a timeout ==
    service crashed after PSP said ok
  client attempt 1: timeout
  client attempt 2: 201 pay_2 ch_2
  card charged 2x = $100.00 | ledger merchant $50.00, entries sum to 0 | reconciled=false

== B. Key on our API only; our call to the PSP times out once ==
    psp attempt 1: timeout
  client attempt 1: 201 pay_1 ch_2
  card charged 2x = $100.00 | ledger merchant $50.00, entries sum to 0 | reconciled=false

== C. Keys end to end (API key + PSP key = payment id) ==
    psp attempt 1: timeout
  client attempt 1: 201 pay_1 ch_1 (psp replayed)
  client attempt 1: 200 pay_1 ch_1 (replayed)
  card charged 1x = $50.00 | ledger merchant $50.00, entries sum to 0 | reconciled=true

== D. Crash after the PSP charged, before we recorded it ==
    service crashed after PSP said ok
  client attempt 1: timeout
  client attempt 2: 409 pay_1 still PENDING_PSP, retry later
    recovery: pay_1 -> ch_1 (psp replayed)
  client attempt 1: 200 pay_1 ch_1 (replayed)
  card charged 1x = $50.00 | ledger merchant $50.00, entries sum to 0 | reconciled=true

== E. Retry schedule: exponential backoff, full jitter, base 100 ms, cap 2000 ms ==
  delay/ceiling ms: 0/100  114/200  102/400  358/800  1046/1600  1933/2000
~~~

The key line is the processor call, which passes the payment ID as the key only in the safe configurations:

~~~js
const res = this.psp.charge(this.pspKeys ? row.id : null, amountCents);
~~~

What the simulation stands for and leaves out: the processor is an in-process object that honours keys forever (a real one prunes them, see section 8). "Timeout" and "crash" are flags, not real sockets or processes, and the service retries the processor three times in a loop with no delays. The tables are maps, not a database, so the unique-constraint race between two concurrent first requests is not exercised; the \`409\` path shows what the loser sees. The backoff schedule uses a seeded generator (Park-Miller) so the output is deterministic; in production use a real random source. Reconciliation is one comparison of totals rather than a charge-by-charge report.

## Edge Cases Worth Knowing

- **Processor down for longer than its key retention.** A retry after the window is a new charge. Recovery must query the processor by your reference first, or escalate.
- **Authorisation and capture.** Two external calls, two keys (\`pay_1:auth\`, \`pay_1:capture\`); a retried capture must not capture twice.
- **Refunds and partial refunds.** Each refund is its own operation with its own key; "refund £10" twice is two refunds unless keyed.
- **Currency and rounding.** Store amounts as integers in minor units (pence, cents) so ledger sums are exact.
- **3-D Secure and redirects.** The customer leaves your page mid-payment; the state machine must accept the result from a webhook or a return URL, whichever arrives first, once.

## Common Pitfalls

- **Keying only your own API.** Scenario B: the service-to-processor hop still double-charged. The processor needs a deterministic key too.
- **Calling the processor before writing anything.** A crash then leaves money moved and no row; recovery has nothing to find.
- **Marking timeouts as failures.** The charge may have succeeded; ask the processor with the same key instead of letting the customer pay again.
- **Retrying at every layer.** Three layers of three retries is 27 processor calls per click; retry at one layer with jittered backoff.
- **Trusting webhooks to arrive once and in order.** Deduplicate by event ID and only move the state machine forward.
- **Skipping reconciliation.** It is the only check that catches errors your code does not know it made.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The problem:</strong> <span style="color:#f0e2c8;">A timeout means the outcome is <strong style="color:#ffca28;">unknown</strong>, on two hops: client to us, and us to the processor. Retrying is the only recovery, so every retry must be harmless and every unknown must be resolved by asking, never guessed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. End-to-end keys:</strong> <span style="color:#f0e2c8;">The client sends an <strong style="color:#ffca28;">idempotency key</strong> that I store under a unique constraint and answer with a saved response. I pass a <strong style="color:#ffca28;">deterministic key derived from the payment ID</strong> to the processor. In my simulation, keying only my API still charged the card twice; keys on both hops charged once.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State machine:</strong> <span style="color:#f0e2c8;">I write the payment as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PENDING_PSP</code> <strong style="color:#ffca28;">before</strong> calling the processor and finish it in one transaction with the ledger entries. A crash leaves a row that a <strong style="color:#ffca28;">recovery worker</strong> completes by retrying with the same key, which the processor deduplicates.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Retries and events:</strong> <span style="color:#f0e2c8;">Retry only timeouts and retryable errors, with <strong style="color:#ffca28;">exponential backoff and jitter</strong>, at one layer. Webhooks are deduped by event ID, outgoing events go through an outbox.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Safety net:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">double-entry ledger</strong> that always sums to zero, plus daily <strong style="color:#ffca28;">reconciliation</strong> against the processor settlement report. At 10M payments a day that is about 116/s, 70 GB of keys for a 7-day window and 1.46 TB of ledger a year, which one sharded relational store handles.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The processor call timed out. What do you tell the user?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">"Processing", with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">202</code> and a status URL. The row is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UNKNOWN</code>; the recovery worker retries with the same key within seconds, and the final state reaches the user by polling or a push. I never show "failed, try again" for an unknown outcome.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the processor does not support idempotency keys?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Send my payment ID as the merchant reference, and before any retry <strong style="color:#ffca28;">query</strong> the processor for a charge with that reference; only charge if none exists. If the query itself is unreliable, stop and send the payment to a manual review queue instead of retrying.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use a distributed transaction across my DB and the processor?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The processor is another company and does not take part in two-phase commit. The practical equivalent is: durable intent first, idempotent external call, record the result, and reconcile. See the two-phase commit and saga pages for why.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you prevent two concurrent requests with the same key from both charging?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The first step is an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INSERT</code> of the key under a unique constraint. Exactly one request wins; the other gets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">409</code> (or waits on the row and then returns the saved response). A unique <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">order_id</code> on payments blocks a second payment even if a client sends a new key.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How long do you keep keys?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Longer than any realistic client retry, and I make sure my recovery finishes well inside the processor's own retention (Stripe documents that v1 keys can be pruned after 24 hours). Old key partitions are dropped by day.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Double-entry ledger | Every movement recorded as debit and credit entries that sum to zero |
| End-to-end idempotency | Every retried hop carries a key the next system deduplicates on |
| Payment state machine | Explicit, durable payment states written before each external action |
| Recovery worker (sweeper) | Job that drives stuck payments to a final state with the same key |
| Exponential backoff with full jitter | Random wait between 0 and a doubling, capped ceiling |
| Retry budget | Cap on retries as a share of normal traffic |
| Reconciliation | Comparing the ledger with the processor report charge by charge |

**Conclusion:** A payment system is reliable against retries when a retry can never move money twice and an unknown outcome is always resolved by asking. That takes three layers working together: idempotency keys on every hop, with the processor key derived from your own payment ID; a state machine that records intent before the external call so a recovery worker can finish anything a crash interrupted; and a double-entry ledger reconciled against the processor report to catch the rest. The simulation showed the failure modes in money: $100 for a $50 order with no keys or with keys on one hop only, and exactly $50, reconciled, once the key went all the way through and recovery reused it.`,
    examples: [
      {
        label: `Payment retries: double charges without keys, end-to-end keys through the PSP, crash recovery, reconciliation and jittered backoff`,
        variants: [
          { tech: "node", code: `// Payment retries in miniature: a fake PSP (card processor) that honours its own
// idempotency keys, a payment service with a payments table + ledger, and injected faults.

class PSP {
  constructor() { this.charges = []; this.keys = new Map(); this.loseNext = 0; }
  charge(key, amountCents) {
    if (key && this.keys.has(key)) return { id: this.keys.get(key), replayed: true };
    const id = \`ch_\${this.charges.length + 1}\`;
    this.charges.push({ id, amountCents });
    if (key) this.keys.set(key, id);
    if (this.loseNext > 0) { this.loseNext--; return null; } // charged, but the reply is lost
    return { id, replayed: false };
  }
}

class PaymentService {
  constructor(psp, { apiKeys, pspKeys }) {
    this.psp = psp; this.apiKeys = apiKeys; this.pspKeys = pspKeys;
    this.payments = new Map(); // idempotency key -> row
    this.ledger = []; this.seq = 0; this.crashAfterPsp = false;
  }
  pay(key, amountCents) {
    if (this.apiKeys) {
      const row = this.payments.get(key);
      if (row && row.state === "SUCCEEDED") return { status: 200, body: \`\${row.id} \${row.chargeId} (replayed)\` };
      if (row) return { status: 409, body: \`\${row.id} still \${row.state}, retry later\` };
    }
    const row = { id: \`pay_\${++this.seq}\`, state: "PENDING_PSP", amountCents, chargeId: null };
    if (this.apiKeys) this.payments.set(key, row); // INSERT ... unique(key): first writer wins
    for (let attempt = 1; attempt <= 3; attempt++) {
      const res = this.psp.charge(this.pspKeys ? row.id : null, amountCents);
      if (res === null) { console.log(\`    psp attempt \${attempt}: timeout\`); continue; }
      if (this.crashAfterPsp) { this.crashAfterPsp = false; console.log("    service crashed after PSP said ok"); return null; }
      this.succeed(row, res.id);
      return { status: 201, body: \`\${row.id} \${res.id}\${res.replayed ? " (psp replayed)" : ""}\` };
    }
    row.state = "UNKNOWN"; return { status: 502, body: \`\${row.id} outcome unknown\` };
  }
  succeed(row, chargeId) {
    row.state = "SUCCEEDED"; row.chargeId = chargeId;
    this.ledger.push({ account: "customer", cents: -row.amountCents, ref: row.id });
    this.ledger.push({ account: "merchant", cents: row.amountCents, ref: row.id });
  }
  recover() { // background job: finish rows stuck in PENDING_PSP or UNKNOWN using the same PSP key
    for (const row of this.payments.values()) {
      if (row.state === "SUCCEEDED") continue;
      const res = this.psp.charge(row.id, row.amountCents);
      console.log(\`    recovery: \${row.id} -> \${res.id}\${res.replayed ? " (psp replayed)" : ""}\`);
      this.succeed(row, res.id);
    }
  }
}

function report(svc, psp) {
  const charged = psp.charges.reduce((s, c) => s + c.amountCents, 0);
  const sum = svc.ledger.reduce((s, e) => s + e.cents, 0);
  const merchant = svc.ledger.filter((e) => e.account === "merchant").reduce((s, e) => s + e.cents, 0);
  console.log(\`  card charged \${psp.charges.length}x = $\${(charged / 100).toFixed(2)} | ledger merchant $\${(merchant / 100).toFixed(2)}, entries sum to \${sum} | reconciled=\${charged === merchant}\`);
}

function client(svc, key, attempts) {
  for (let i = 1; i <= attempts; i++) {
    const r = svc.pay(key, 5000);
    if (r === null) { console.log(\`  client attempt \${i}: timeout\`); continue; }
    console.log(\`  client attempt \${i}: \${r.status} \${r.body}\`);
    if (r.status < 300) return;
  }
}

console.log("== A. No keys anywhere; attempt 1 dies after the charge, client sees a timeout ==");
let psp = new PSP(), svc = new PaymentService(psp, { apiKeys: false, pspKeys: false });
svc.crashAfterPsp = true; // the client never hears back from the first attempt
client(svc, "k1", 3); report(svc, psp);

console.log("\\n== B. Key on our API only; our call to the PSP times out once ==");
psp = new PSP(); psp.loseNext = 1; svc = new PaymentService(psp, { apiKeys: true, pspKeys: false });
client(svc, "k1", 3); report(svc, psp);

console.log("\\n== C. Keys end to end (API key + PSP key = payment id) ==");
psp = new PSP(); psp.loseNext = 1; svc = new PaymentService(psp, { apiKeys: true, pspKeys: true });
client(svc, "k1", 3); client(svc, "k1", 1); report(svc, psp);

console.log("\\n== D. Crash after the PSP charged, before we recorded it ==");
psp = new PSP(); svc = new PaymentService(psp, { apiKeys: true, pspKeys: true });
svc.crashAfterPsp = true;
client(svc, "k1", 2);
svc.recover();
client(svc, "k1", 1); report(svc, psp);

console.log("\\n== E. Retry schedule: exponential backoff, full jitter, base 100 ms, cap 2000 ms ==");
let seed = 42;
const rand = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
const delays = [];
for (let attempt = 0; attempt < 6; attempt++) {
  const ceiling = Math.min(2000, 100 * 2 ** attempt);
  delays.push(\`\${Math.floor(rand() * ceiling)}/\${ceiling}\`);
}
console.log(\`  delay/ceiling ms: \${delays.join("  ")}\`);` },
          { tech: "python", code: `# Payment retries in miniature: a fake PSP (card processor) that honours its own
# idempotency keys, a payment service with a payments table + ledger, and injected faults.


class PSP:
    def __init__(self):
        self.charges, self.keys, self.lose_next = [], {}, 0

    def charge(self, key, amount_cents):
        if key and key in self.keys:
            return {"id": self.keys[key], "replayed": True}
        cid = f"ch_{len(self.charges) + 1}"
        self.charges.append({"id": cid, "amount_cents": amount_cents})
        if key:
            self.keys[key] = cid
        if self.lose_next > 0:  # charged, but the reply is lost
            self.lose_next -= 1
            return None
        return {"id": cid, "replayed": False}


class PaymentService:
    def __init__(self, psp, api_keys, psp_keys):
        self.psp, self.api_keys, self.psp_keys = psp, api_keys, psp_keys
        self.payments = {}  # idempotency key -> row
        self.ledger, self.seq, self.crash_after_psp = [], 0, False

    def pay(self, key, amount_cents):
        if self.api_keys:
            row = self.payments.get(key)
            if row and row["state"] == "SUCCEEDED":
                return {"status": 200, "body": f"{row['id']} {row['charge_id']} (replayed)"}
            if row:
                return {"status": 409, "body": f"{row['id']} still {row['state']}, retry later"}
        self.seq += 1
        row = {"id": f"pay_{self.seq}", "state": "PENDING_PSP", "amount_cents": amount_cents, "charge_id": None}
        if self.api_keys:
            self.payments[key] = row  # INSERT ... unique(key): first writer wins
        for attempt in range(1, 4):
            res = self.psp.charge(row["id"] if self.psp_keys else None, amount_cents)
            if res is None:
                print(f"    psp attempt {attempt}: timeout")
                continue
            if self.crash_after_psp:
                self.crash_after_psp = False
                print("    service crashed after PSP said ok")
                return None
            self.succeed(row, res["id"])
            return {"status": 201, "body": f"{row['id']} {res['id']}{' (psp replayed)' if res['replayed'] else ''}"}
        row["state"] = "UNKNOWN"
        return {"status": 502, "body": f"{row['id']} outcome unknown"}

    def succeed(self, row, charge_id):
        row["state"], row["charge_id"] = "SUCCEEDED", charge_id
        self.ledger.append({"account": "customer", "cents": -row["amount_cents"], "ref": row["id"]})
        self.ledger.append({"account": "merchant", "cents": row["amount_cents"], "ref": row["id"]})

    def recover(self):  # background job: finish stuck rows using the same PSP key
        for row in self.payments.values():
            if row["state"] == "SUCCEEDED":
                continue
            res = self.psp.charge(row["id"], row["amount_cents"])
            print(f"    recovery: {row['id']} -> {res['id']}{' (psp replayed)' if res['replayed'] else ''}")
            self.succeed(row, res["id"])


def report(svc, psp):
    charged = sum(c["amount_cents"] for c in psp.charges)
    total = sum(e["cents"] for e in svc.ledger)
    merchant = sum(e["cents"] for e in svc.ledger if e["account"] == "merchant")
    rec = "true" if charged == merchant else "false"
    print(f"  card charged {len(psp.charges)}x = \${charged / 100:.2f} | ledger merchant \${merchant / 100:.2f}, entries sum to {total} | reconciled={rec}")


def client(svc, key, attempts):
    for i in range(1, attempts + 1):
        r = svc.pay(key, 5000)
        if r is None:
            print(f"  client attempt {i}: timeout")
            continue
        print(f"  client attempt {i}: {r['status']} {r['body']}")
        if r["status"] < 300:
            return


print("== A. No keys anywhere; attempt 1 dies after the charge, client sees a timeout ==")
psp = PSP(); svc = PaymentService(psp, False, False)
svc.crash_after_psp = True  # the client never hears back from the first attempt
client(svc, "k1", 3); report(svc, psp)

print("\\n== B. Key on our API only; our call to the PSP times out once ==")
psp = PSP(); psp.lose_next = 1; svc = PaymentService(psp, True, False)
client(svc, "k1", 3); report(svc, psp)

print("\\n== C. Keys end to end (API key + PSP key = payment id) ==")
psp = PSP(); psp.lose_next = 1; svc = PaymentService(psp, True, True)
client(svc, "k1", 3); client(svc, "k1", 1); report(svc, psp)

print("\\n== D. Crash after the PSP charged, before we recorded it ==")
psp = PSP(); svc = PaymentService(psp, True, True)
svc.crash_after_psp = True
client(svc, "k1", 2)
svc.recover()
client(svc, "k1", 1); report(svc, psp)

print("\\n== E. Retry schedule: exponential backoff, full jitter, base 100 ms, cap 2000 ms ==")
seed = 42


def rand():
    global seed
    seed = (seed * 48271) % 2147483647
    return seed / 2147483647


delays = []
for attempt in range(6):
    ceiling = min(2000, 100 * 2 ** attempt)
    delays.append(f"{int(rand() * ceiling)}/{ceiling}")
print(f"  delay/ceiling ms: {'  '.join(delays)}")` },
        ],
      },
    ],
  },
  {
    title: `What is the circuit breaker pattern?`,
    difficulty: "medium",
    seoDescription: `Circuit breakers explained and simulated: closed, open and half-open states, failure-rate windows, fallbacks, and why failing fast stops cascades.`,
    description: `**Question presented to candidate:**
"One of our services calls a recommendations API that sometimes becomes slow or starts timing out, and when it does, our own service falls over too. What is the circuit breaker pattern, how does it work, and how would you configure one here?"

**What a strong answer should cover:**
- The problem it solves: calls to a failing dependency **tie up threads and connections** until timeouts fire, so the caller runs out of resources and the failure **cascades**
- The three states: **closed** (calls pass, results counted), **open** (calls fail fast without touching the dependency), **half-open** (a few trial calls decide whether to close or reopen)
- Trip conditions: failure rate (and slow-call rate) over a **sliding window**, with a **minimum number of calls** so a single error does not trip it
- What the caller does when open: a **fallback** (cached or default value, degraded feature) or a fast, clear error
- How it fits with **timeouts, retries with backoff, bulkheads** and load shedding; typical tools (Resilience4j, service-mesh outlier detection)
- Trade-offs: open-state wait too long delays recovery, too short hammers a sick service; breakers per dependency or per host

**Code / implementation expected:** Optional — a small state machine is a plus; the example runs one on a fake clock and counts calls, timeouts and blocked time.`,
    answer: `**Target Audience:** Beginners who have called one service from another and want to understand why one slow dependency can take a whole system down, and how a breaker prevents it.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output). Library defaults are cited from the Apache Camel Resilience4j configuration reference; the Hystrix status from the Netflix Hystrix README; the pattern history from Martin Fowler's "CircuitBreaker" article (2014).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. Every number comes from running the example; the **Verified** section quotes its full output.

## 1. Why This Even Matters — A Story First

Your house has a fuse box. When a kettle shorts, the breaker for the kitchen trips and the kitchen goes dark, but the rest of the house keeps its lights, and the wiring does not catch fire. Later you flip the switch back to see whether the fault is gone.

Software services have the same problem with a twist. Imagine a call centre where one department stops answering its phone. Every agent who needs that department dials, waits on hold for two minutes, gives up, and dials again. Soon **every agent** is on hold, and callers with completely unrelated questions cannot get through. Nothing is broken in the call centre itself; it simply spent all its agents waiting.

A circuit breaker is the supervisor who notices "the billing department has not answered the last five calls", puts a sign up saying "billing is down, do not call, tell customers we will email them", and every few minutes tries one call to see whether billing is back. The agents stay free, customers get an answer quickly, and billing is not flooded with calls the moment it recovers.

## 2. The Problem: Waiting Is What Kills You

A failing dependency that answers **instantly** with an error is easy to survive. The dangerous case is a dependency that **hangs** until your timeout fires, because every waiting call holds a thread, a connection or a slot in a pool.

Little's law says the number of requests in flight equals the arrival rate times the time each one takes. The example applies it at 200 requests per second against a pool of 100 workers:

~~~text
Why it matters at 200 req/s (Little: busy workers = rate x time per call):
  healthy, 50 ms             busy workers =  10  pool of 100 ok
  failing, 2000 ms timeout   busy workers = 400  pool of 100 EXHAUSTED
  breaker open, ~0 ms        busy workers =   0  pool of 100 ok
~~~

Healthy, each call takes 50 ms and keeps only 10 workers busy. When the dependency starts timing out at 2,000 ms, the same traffic needs **400** workers. The pool of 100 is exhausted, and requests that do not even use the dependency queue behind it. That is a **cascading failure**: one sick service makes its callers sick, and their callers after them.

📌 **Interview term: cascading failure** — a failure that spreads from one component to the components that depend on it, usually because callers exhaust threads, connections or memory while waiting.

📌 **Interview term: fail fast** — return an error immediately instead of waiting for a call that is very likely to fail. A fast failure costs microseconds; a slow one costs a worker for the whole timeout.

## 3. How a Circuit Breaker Works

A circuit breaker is a small **state machine** wrapped around calls to one dependency. The pattern was popularised by Michael Nygard's book *Release It!*, as Martin Fowler's 2014 article on it notes.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="Three states: CLOSED goes to OPEN when the failure rate passes the threshold; OPEN goes to HALF_OPEN after the wait; HALF_OPEN goes to CLOSED if probes succeed or back to OPEN if a probe fails">
  <defs>
    <marker id="sd09q3-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="50" width="180" height="70" rx="10"/>
  <text class="d-text" x="130" y="80" text-anchor="middle">CLOSED</text>
  <text class="d-sub" x="130" y="102" text-anchor="middle">calls pass, counted</text>
  <rect class="d-box-accent" x="540" y="50" width="180" height="70" rx="10"/>
  <text class="d-text" x="630" y="80" text-anchor="middle">OPEN</text>
  <text class="d-sub" x="630" y="102" text-anchor="middle">fail fast</text>
  <rect class="d-box-muted" x="290" y="210" width="180" height="70" rx="10"/>
  <text class="d-text" x="380" y="240" text-anchor="middle">HALF_OPEN</text>
  <text class="d-sub" x="380" y="262" text-anchor="middle">a few probes</text>
  <path class="d-edge-accent" d="M 220 70 L 532 70" marker-end="url(#sd09q3-arrow)"/>
  <text class="d-accent" x="376" y="55" text-anchor="middle">failure rate over threshold</text>
  <path class="d-edge" d="M 630 120 L 478 230" marker-end="url(#sd09q3-arrow)"/>
  <text class="d-sub" x="635" y="185" text-anchor="start">wait over</text>
  <path class="d-edge-dashed" d="M 470 220 L 600 128" marker-end="url(#sd09q3-arrow)"/>
  <text class="d-sub" x="500" y="150" text-anchor="middle">probe fails</text>
  <path class="d-edge" d="M 290 245 L 130 128" marker-end="url(#sd09q3-arrow)"/>
  <text class="d-sub" x="150" y="200" text-anchor="middle">probes succeed</text>
</svg>

📌 **Interview term: closed state** — normal operation. Every call goes to the dependency, and the breaker records whether it succeeded, failed or was too slow.

📌 **Interview term: open state** — the breaker has tripped. Calls are rejected immediately, without contacting the dependency, for a fixed wait period.

📌 **Interview term: half-open state** — after the wait, the breaker lets a small number of trial calls through. If they succeed, it closes; if one fails, it opens again for another wait.

The decision to trip is made over recent history, not a single call:

📌 **Interview term: sliding window** — the set of recent calls the breaker looks at: the last N calls (count-based) or the calls of the last N seconds (time-based).

📌 **Interview term: failure-rate threshold** — the share of failed calls in the window that trips the breaker, for example 50%. Many breakers also have a **slow-call threshold**: calls slower than a limit count against the dependency even if they eventually succeed.

📌 **Interview term: minimum number of calls** — the breaker does not compute a rate until the window has at least this many calls, so 1 failure out of 1 call does not count as 100%.

The core of the example is about twenty lines:

~~~js
allow(now) {
  if (this.state === "OPEN" && now - this.openedAt >= this.cfg.openMs) { this.move(now, "HALF_OPEN", "..."); this.probes = 0; }
  if (this.state === "OPEN") return false;                       // fail fast
  if (this.state === "HALF_OPEN") return this.probes < this.cfg.halfOpenPermits;
  return true;
}
record(now, ok) {
  if (this.state === "HALF_OPEN") { /* any failure: OPEN again; N successes: CLOSED */ }
  this.results.push(ok);                                         // sliding window of the last 10
  if (this.results.length > this.cfg.window) this.results.shift();
  const fails = this.results.filter((r) => !r).length;
  if (this.results.length >= this.cfg.minCalls && fails / this.results.length >= this.cfg.failRate) { /* trip to OPEN */ }
}
~~~

## 4. Watching One Run

The simulation sends one request per second for 60 seconds. The dependency times out (2,000 ms) from t=10 s to t=34 s and is healthy otherwise. The breaker uses a count window of 10, a minimum of 5 calls, a 50% failure threshold, a 5-second open wait and 3 half-open probes.

~~~text
legend: . ok  X timeout  o rejected by open breaker  ? probe ok  ! probe failed
dependency   ..........XXXXXXXXXXXXXXXXXXXXXXXXX.........................
no breaker   ..........XXXXXXXXXXXXXXXXXXXXXXXXX.........................
breaker      ..........XXXXXoooo!oooo!oooo!oooo!oooo???..................

state transitions:
  t=14s CLOSED    -> OPEN      5/10 failed in window
  t=19s OPEN      -> HALF_OPEN wait over, letting probes through
  t=19s HALF_OPEN -> OPEN      probe failed
  t=24s OPEN      -> HALF_OPEN wait over, letting probes through
  t=24s HALF_OPEN -> OPEN      probe failed
  t=29s OPEN      -> HALF_OPEN wait over, letting probes through
  t=29s HALF_OPEN -> OPEN      probe failed
  t=34s OPEN      -> HALF_OPEN wait over, letting probes through
  t=34s HALF_OPEN -> OPEN      probe failed
  t=39s OPEN      -> HALF_OPEN wait over, letting probes through
  t=41s HALF_OPEN -> CLOSED    3 probes succeeded
~~~

Reading the timelines:

- **Without a breaker** every request during the outage waited the full 2 s and failed: 25 timeouts in a row.
- **With the breaker** the first 5 failures pushed the window to 5 of 10 failed, and it **opened at t=14 s**. From then on most calls were rejected instantly (\`o\`).
- Every 5 s it let **one probe** through (\`!\`); while the dependency was still down, the probe failed and the breaker reopened.
- The dependency recovered at t=35 s, but the breaker was open until t=39 s, then **3 probes succeeded** (\`???\`) and it closed at t=41 s. That 4-second lag is the price of the open wait.

The totals:

~~~text
                 calls to dep  timeouts  fast-fails  caller time blocked
  no breaker               60        25           0          51.75 s
  breaker                  40         9          20          19.55 s
~~~

The breaker cut calls to the sick dependency from 60 to 40 and timeouts from 25 to 9, and the caller spent **19.55 s** blocked instead of **51.75 s**. The 20 fast-fails are requests the caller must now handle without the dependency, which is where fallbacks come in.

## 5. What the Caller Does When the Breaker Is Open

A rejected call still needs an answer. Good options, best first:

- **Serve a fallback**: a cached result, a default ("top sellers" instead of personal recommendations), or a reduced page without that widget.
- **Queue the work for later** when the user does not need the result now (send the email when the mail service is back).
- **Return a fast, explicit error** (\`503\` with \`Retry-After\`) so the next layer can decide.

📌 **Interview term: fallback (graceful degradation)** — the reduced but useful behaviour a caller provides when a dependency is unavailable, so the user sees a smaller feature instead of an error page.

A fallback must be cheap and must not call the same failing dependency through another path; a fallback that itself hangs defeats the breaker.

## 6. How It Fits With Timeouts, Retries and Bulkheads

| Pattern | Question it answers | Relationship to the breaker |
| :--- | :--- | :--- |
| Timeout | How long will I wait for one call? | Without timeouts, a hung call never counts as a failure; the breaker needs them |
| Retry with backoff | Should I try this one call again? | Retries help with brief blips; the breaker stops retries when the problem is not brief |
| Circuit breaker | Should I call this dependency at all right now? | Stops calls during sustained failure, probes for recovery |
| Bulkhead | How much of my capacity may one dependency use? | Caps workers per dependency so even before it trips, one dependency cannot take all 100 |
| Load shedding / rate limiting | How much work should I accept? | Protects you from callers; the breaker protects you from your dependencies |

📌 **Interview term: bulkhead** — a separate, bounded pool (threads, connections, concurrency limit) per dependency, named after the watertight compartments of a ship, so one flooded compartment cannot sink the rest.

Order matters when they are combined: the retry should sit **outside** the breaker, so that a rejected call is not retried in a tight loop, and each retry attempt is counted by the breaker. Rate limiting is covered in [How would you design a rate limiter?](/interview-question/how-would-you-design-a-rate-limiter), and the producer-side twin of shedding load is [What is backpressure and how do you handle it?](/interview-question/what-is-backpressure-and-how-do-you-handle-it).

## 7. In Real Systems

- **Resilience4j** is the common Java library. Its defaults, as listed in the Apache Camel Resilience4j configuration reference, are a 50% failure-rate threshold, a count-based sliding window of 100 calls, a minimum of 100 calls before the rate is computed, a 60-second wait in the open state and 10 permitted calls in half-open. Those are conservative; low-traffic services usually need a smaller minimum or the breaker never trips.
- **Netflix Hystrix** introduced many teams to the pattern. Its README states it is no longer in active development and recommends projects like Resilience4j for new work.
- **Service meshes and proxies** (Envoy, Istio) offer **outlier detection**: eject a single unhealthy host from the load-balancing pool after consecutive errors, which is a per-host breaker without application code.

📌 **Interview term: outlier detection** — a load-balancer feature that temporarily removes an individual failing host from rotation, as opposed to opening the breaker for the whole dependency.

**Scope** matters. One breaker per dependency is the default. If the dependency has 10 hosts and one is broken, a single shared breaker sees a 10% failure rate and never trips, while users keep hitting the broken host; per-host ejection fixes that. The breaker state is usually **local to each caller instance**; sharing it across instances (through Redis, for example) adds a dependency to protect against dependencies, and most systems accept that each instance learns on its own within a few calls.

## 8. Verified: Running the Code

The example **"Circuit breaker on a fake clock: closed, open, half-open probes, fast-fails and the cost of waiting on timeouts"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
legend: . ok  X timeout  o rejected by open breaker  ? probe ok  ! probe failed
dependency   ..........XXXXXXXXXXXXXXXXXXXXXXXXX.........................
no breaker   ..........XXXXXXXXXXXXXXXXXXXXXXXXX.........................
breaker      ..........XXXXXoooo!oooo!oooo!oooo!oooo???..................

state transitions:
  t=14s CLOSED    -> OPEN      5/10 failed in window
  t=19s OPEN      -> HALF_OPEN wait over, letting probes through
  t=19s HALF_OPEN -> OPEN      probe failed
  t=24s OPEN      -> HALF_OPEN wait over, letting probes through
  t=24s HALF_OPEN -> OPEN      probe failed
  t=29s OPEN      -> HALF_OPEN wait over, letting probes through
  t=29s HALF_OPEN -> OPEN      probe failed
  t=34s OPEN      -> HALF_OPEN wait over, letting probes through
  t=34s HALF_OPEN -> OPEN      probe failed
  t=39s OPEN      -> HALF_OPEN wait over, letting probes through
  t=41s HALF_OPEN -> CLOSED    3 probes succeeded

                 calls to dep  timeouts  fast-fails  caller time blocked
  no breaker               60        25           0          51.75 s
  breaker                  40         9          20          19.55 s

Why it matters at 200 req/s (Little: busy workers = rate x time per call):
  healthy, 50 ms             busy workers =  10  pool of 100 ok
  failing, 2000 ms timeout   busy workers = 400  pool of 100 EXHAUSTED
  breaker open, ~0 ms        busy workers =   0  pool of 100 ok
~~~

What the simulation stands for and leaves out: time is a fake clock with one request per second, and "a call takes 2,000 ms" is added to a counter rather than slept, so the blocked time is the sum of call latencies, not wall-clock time with concurrency. The dependency is a function of time. There is no fallback logic, no slow-call threshold, no time-based window and no concurrency between probes; real libraries handle all of those. The Little's-law table is arithmetic, not a load test.

## Edge Cases Worth Knowing

- **Low traffic.** With 2 requests a minute, a minimum of 100 calls means the breaker never trips. Use a time window with a small minimum, or rely on timeouts alone.
- **Client errors are not failures.** A \`400\` or \`404\` means the caller sent something wrong; counting them can trip the breaker on a bad client while the dependency is fine. Count timeouts, connection errors and 5xx.
- **Thundering herd on close.** Many instances closing at once can flood a recovering service; small half-open permits and jittered open waits spread the load.
- **Flapping.** A dependency that fails 50% of the time makes a breaker open and close repeatedly; increase the window or add an increasing open wait.
- **Breaker open while the dependency is healthy.** Seen in the run between t=35 s and t=39 s. A shorter wait recovers faster but probes a sick service more often.

## Common Pitfalls

- **No timeouts on the wrapped call.** The breaker only sees a failure when the call ends; a call that hangs forever never trips it.
- **Retrying inside the breaker.** Five internal retries count as one call and multiply load on the dependency; retry outside it, with backoff.
- **One breaker for many hosts.** A single broken host among ten stays in rotation; use per-host outlier detection as well.
- **A fallback that calls the same dependency.** The breaker opens and the fallback hangs instead.
- **Default thresholds copied blindly.** A minimum of 100 calls and a 60-second wait suit busy services; check them against your real traffic.
- **No metrics or alerts on state changes.** An open breaker hides an outage from users, so it must not hide it from the on-call engineer.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Problem:</strong> <span style="color:#f0e2c8;">When a dependency hangs, every call holds a worker until the timeout. At 200 req/s and a 2 s timeout that is <strong style="color:#ffca28;">400 busy workers</strong>; a pool of 100 is exhausted and the failure <strong style="color:#ffca28;">cascades</strong> to unrelated requests.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Pattern:</strong> <span style="color:#f0e2c8;">A circuit breaker wraps calls to one dependency. <strong style="color:#ffca28;">Closed</strong>: calls pass and results are counted. <strong style="color:#ffca28;">Open</strong>: calls fail fast for a wait period. <strong style="color:#ffca28;">Half-open</strong>: a few probes decide whether to close or reopen.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Trip rule:</strong> <span style="color:#f0e2c8;">Trip on a failure rate (and slow-call rate) over a <strong style="color:#ffca28;">sliding window</strong>, with a <strong style="color:#ffca28;">minimum number of calls</strong>. In my simulation a window of 10 at 50% opened after 5 timeouts, cut timeouts from 25 to 9 and blocked time from 51.75 s to 19.55 s.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. When open:</strong> <span style="color:#f0e2c8;">The caller serves a <strong style="color:#ffca28;">fallback</strong>: cached data, a default, a smaller page, or a fast <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">503</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Retry-After</code>. The fallback must not touch the same dependency.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Fits with:</strong> <span style="color:#f0e2c8;">It needs <strong style="color:#ffca28;">timeouts</strong> to see failures, sits inside the retry loop, and pairs with <strong style="color:#ffca28;">bulkheads</strong> that cap each dependency share of workers. Resilience4j is the usual library; service meshes offer per-host outlier detection.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What counts as a failure?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Timeouts, connection errors and 5xx responses, and calls slower than a slow-call threshold. Not 4xx client errors, because those say the caller is wrong, not the dependency.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you pick the open wait?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Long enough for typical recovery and to give the dependency breathing room, short enough not to delay recovery. In my run the dependency was healthy for 4 s before the breaker let probes through. Some systems grow the wait on repeated failures and add jitter so instances do not all probe at once.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should breaker state be shared across instances?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually not. Each instance learns within a few calls, and sharing via a central store adds a new dependency on the failure path. Sharing makes sense only when instances are many and traffic per instance is tiny.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Circuit breaker vs retry?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A retry assumes the failure is brief and tries one call again; a breaker assumes it is sustained and stops calling. Use both: retry a couple of times with backoff, and let the breaker stop retries when the failure rate says the dependency is down.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Circuit breaker vs rate limiter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A rate limiter protects <strong style="color:#ffca28;">you</strong> from too many incoming requests. A breaker protects you from a failing <strong style="color:#ffca28;">dependency</strong> you call. One looks at your input rate, the other at your outbound results.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Cascading failure | A failure spreading to callers that exhaust resources while waiting |
| Fail fast | Return an error immediately instead of waiting for a likely failure |
| Closed state | Calls pass through and are counted |
| Open state | Calls are rejected without contacting the dependency |
| Half-open state | A few trial calls decide whether to close or reopen |
| Sliding window | The recent calls the breaker evaluates (last N calls or N seconds) |
| Failure-rate threshold | Share of failures in the window that trips the breaker |
| Minimum number of calls | Calls needed before a rate is computed |
| Fallback (graceful degradation) | Reduced behaviour served while the dependency is unavailable |
| Bulkhead | A bounded resource pool per dependency |
| Outlier detection | Removing one failing host from a load-balancing pool |

**Conclusion:** A circuit breaker exists because waiting is expensive: a hung dependency holds your workers until timeouts fire, and with enough traffic that exhausts your service and spreads the outage upstream. The breaker watches recent results, trips to open when the failure rate passes a threshold, fails fast while open, and probes in half-open to detect recovery. In the simulation it removed most of the timeouts and more than halved the time callers spent blocked, at the cost of a few seconds of lag after recovery. Pair it with timeouts, backoff, bulkheads and a cheap fallback, and one failing service becomes a degraded feature instead of a system-wide outage.`,
    examples: [
      {
        label: `Circuit breaker on a fake clock: closed, open, half-open probes, fast-fails and the cost of waiting on timeouts`,
        variants: [
          { tech: "node", code: `// Circuit breaker on a fake clock: one request per second for 60 s; the dependency
// times out (2000 ms) from t=10 to t=34 and is healthy otherwise.
const CFG = { window: 10, minCalls: 5, failRate: 0.5, openMs: 5000, halfOpenPermits: 3 };
const OK_MS = 50, TIMEOUT_MS = 2000;
const healthy = (t) => t < 10 || t >= 35;

class CircuitBreaker {
  constructor(cfg) { this.cfg = cfg; this.state = "CLOSED"; this.results = []; this.openedAt = 0; this.probes = 0; this.log = []; }
  move(now, to, why) { this.log.push(\`t=\${String(now / 1000).padStart(2)}s \${this.state.padEnd(9)} -> \${to.padEnd(9)} \${why}\`); this.state = to; }
  allow(now) {
    if (this.state === "OPEN" && now - this.openedAt >= this.cfg.openMs) { this.move(now, "HALF_OPEN", "wait over, letting probes through"); this.probes = 0; }
    if (this.state === "OPEN") return false;
    if (this.state === "HALF_OPEN") return this.probes < this.cfg.halfOpenPermits;
    return true;
  }
  record(now, ok) {
    if (this.state === "HALF_OPEN") {
      if (!ok) { this.openedAt = now; this.move(now, "OPEN", "probe failed"); return; }
      if (++this.probes === this.cfg.halfOpenPermits) { this.results = []; this.move(now, "CLOSED", \`\${this.probes} probes succeeded\`); }
      return;
    }
    this.results.push(ok);
    if (this.results.length > this.cfg.window) this.results.shift();
    const fails = this.results.filter((r) => !r).length;
    if (this.results.length >= this.cfg.minCalls && fails / this.results.length >= this.cfg.failRate) {
      this.openedAt = now; this.move(now, "OPEN", \`\${fails}/\${this.results.length} failed in window\`); this.results = [];
    }
  }
}

function run(useBreaker) {
  const cb = new CircuitBreaker(CFG);
  let timeline = "", depCalls = 0, failed = 0, fastFails = 0, waitedMs = 0;
  for (let t = 0; t < 60; t++) {
    const now = t * 1000;
    const wasHalf = cb.state === "HALF_OPEN" || (cb.state === "OPEN" && now - cb.openedAt >= CFG.openMs);
    if (useBreaker && !cb.allow(now)) { fastFails++; timeline += "o"; continue; }
    depCalls++;
    const ok = healthy(t);
    waitedMs += ok ? OK_MS : TIMEOUT_MS;
    if (!ok) failed++;
    timeline += useBreaker && wasHalf ? (ok ? "?" : "!") : ok ? "." : "X";
    if (useBreaker) cb.record(now, ok);
  }
  return { cb, timeline, depCalls, failed, fastFails, waitedMs };
}

let health = "";
for (let t = 0; t < 60; t++) health += healthy(t) ? "." : "X";
const none = run(false), withCb = run(true);
console.log("legend: . ok  X timeout  o rejected by open breaker  ? probe ok  ! probe failed");
console.log(\`dependency   \${health}\`);
console.log(\`no breaker   \${none.timeline}\`);
console.log(\`breaker      \${withCb.timeline}\`);
console.log("\\nstate transitions:");
for (const line of withCb.cb.log) console.log("  " + line);
console.log("\\n                 calls to dep  timeouts  fast-fails  caller time blocked");
for (const [name, r] of [["no breaker", none], ["breaker", withCb]])
  console.log(\`  \${name.padEnd(14)} \${String(r.depCalls).padStart(12)} \${String(r.failed).padStart(9)} \${String(r.fastFails).padStart(11)} \${String(r.waitedMs / 1000).padStart(14)} s\`);

console.log("\\nWhy it matters at 200 req/s (Little: busy workers = rate x time per call):");
for (const [name, ms] of [["healthy, 50 ms", OK_MS], ["failing, 2000 ms timeout", TIMEOUT_MS], ["breaker open, ~0 ms", 0]]) {
  const busy = (200 * ms) / 1000;
  console.log(\`  \${name.padEnd(26)} busy workers = \${String(busy).padStart(3)}  pool of 100 \${busy > 100 ? "EXHAUSTED" : "ok"}\`);
}` },
          { tech: "python", code: `# Circuit breaker on a fake clock: one request per second for 60 s; the dependency
# times out (2000 ms) from t=10 to t=34 and is healthy otherwise.
CFG = {"window": 10, "min_calls": 5, "fail_rate": 0.5, "open_ms": 5000, "half_open_permits": 3}
OK_MS, TIMEOUT_MS = 50, 2000


def healthy(t):
    return t < 10 or t >= 35


def secs(ms):
    return str(ms // 1000) if ms % 1000 == 0 else str(ms / 1000)


class CircuitBreaker:
    def __init__(self, cfg):
        self.cfg, self.state, self.results, self.opened_at, self.probes, self.log = cfg, "CLOSED", [], 0, 0, []

    def move(self, now, to, why):
        self.log.append(f"t={secs(now):>2}s {self.state:<9} -> {to:<9} {why}")
        self.state = to

    def allow(self, now):
        if self.state == "OPEN" and now - self.opened_at >= self.cfg["open_ms"]:
            self.move(now, "HALF_OPEN", "wait over, letting probes through")
            self.probes = 0
        if self.state == "OPEN":
            return False
        if self.state == "HALF_OPEN":
            return self.probes < self.cfg["half_open_permits"]
        return True

    def record(self, now, ok):
        if self.state == "HALF_OPEN":
            if not ok:
                self.opened_at = now
                self.move(now, "OPEN", "probe failed")
                return
            self.probes += 1
            if self.probes == self.cfg["half_open_permits"]:
                self.results = []
                self.move(now, "CLOSED", f"{self.probes} probes succeeded")
            return
        self.results.append(ok)
        if len(self.results) > self.cfg["window"]:
            self.results.pop(0)
        fails = sum(1 for r in self.results if not r)
        if len(self.results) >= self.cfg["min_calls"] and fails / len(self.results) >= self.cfg["fail_rate"]:
            self.opened_at = now
            self.move(now, "OPEN", f"{fails}/{len(self.results)} failed in window")
            self.results = []


def run(use_breaker):
    cb = CircuitBreaker(CFG)
    timeline, dep_calls, failed, fast_fails, waited = "", 0, 0, 0, 0
    for t in range(60):
        now = t * 1000
        was_half = cb.state == "HALF_OPEN" or (cb.state == "OPEN" and now - cb.opened_at >= CFG["open_ms"])
        if use_breaker and not cb.allow(now):
            fast_fails += 1
            timeline += "o"
            continue
        dep_calls += 1
        ok = healthy(t)
        waited += OK_MS if ok else TIMEOUT_MS
        if not ok:
            failed += 1
        timeline += ("?" if ok else "!") if (use_breaker and was_half) else ("." if ok else "X")
        if use_breaker:
            cb.record(now, ok)
    return {"cb": cb, "timeline": timeline, "dep": dep_calls, "failed": failed, "fast": fast_fails, "waited": waited}


health = "".join("." if healthy(t) else "X" for t in range(60))
none, with_cb = run(False), run(True)
print("legend: . ok  X timeout  o rejected by open breaker  ? probe ok  ! probe failed")
print(f"dependency   {health}")
print(f"no breaker   {none['timeline']}")
print(f"breaker      {with_cb['timeline']}")
print("\\nstate transitions:")
for line in with_cb["cb"].log:
    print("  " + line)
print("\\n                 calls to dep  timeouts  fast-fails  caller time blocked")
for name, r in (("no breaker", none), ("breaker", with_cb)):
    print(f"  {name:<14} {r['dep']:>12} {r['failed']:>9} {r['fast']:>11} {secs(r['waited']):>14} s")

print("\\nWhy it matters at 200 req/s (Little: busy workers = rate x time per call):")
for name, ms in (("healthy, 50 ms", OK_MS), ("failing, 2000 ms timeout", TIMEOUT_MS), ("breaker open, ~0 ms", 0)):
    busy = 200 * ms // 1000
    print(f"  {name:<26} busy workers = {busy:>3}  pool of 100 {'EXHAUSTED' if busy > 100 else 'ok'}")` },
        ],
      },
    ],
  },
  {
    title: `What is backpressure and how do you handle it?`,
    difficulty: "medium",
    seoDescription: `Backpressure explained and measured: why unbounded queues fail, bounded buffers, load shedding, blocking, credit-based pull and Node.js stream drain.`,
    description: `**Question presented to candidate:**
"A producer in your system, say an ingestion API or an upstream service, can sometimes send work faster than the downstream consumer can process it. What is backpressure, what goes wrong if you ignore it, and what are your options for handling it?"

**What a strong answer should cover:**
- The definition: a way for a slow **consumer** to signal a fast **producer** to slow down, so work is not accepted faster than it can be finished
- Why ignoring it fails: an **unbounded buffer** grows until memory runs out, and latency grows with it (Little's law: wait = queue length / service rate)
- The options: **bound the buffer**, then **block or slow the producer**, **shed load** (drop or reject with \`429\`/\`503\`), or switch to **pull / credit-based flow** where the consumer asks for N items
- Real mechanisms: TCP flow control (receive window), Node.js streams (\`write()\` returning \`false\`, the \`'drain'\` event, \`pipeline()\`), Reactive Streams \`request(n)\`, pull-based consumers like Kafka
- Backpressure must **propagate to the edge**, where a client can be told to back off; buffering in the middle only delays the problem
- Trade-offs: blocking keeps every message but adds latency upstream; dropping keeps latency bounded but loses work; choose per data type

**Code / implementation expected:** Optional — explaining \`write()\`/\`'drain'\` or a bounded queue is a plus; the examples simulate four strategies and run real Node.js stream backpressure.`,
    answer: `**Target Audience:** Beginners who have built a service or a data pipeline and want to understand why a fast producer and a slow consumer cause outages, and how systems push back.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (the strategy simulation prints identical output in both); the Node.js stream example ran on Node 22.22 and reads its own default \`highWaterMark\`. The earlier 16 KiB default is cited from the Node.js v22.0.0 release announcement, as reported in community coverage of that release.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. Every number comes from running the examples; the **Verified** section quotes their full output.

## 1. Why This Even Matters — A Story First

A sushi bar has a conveyor belt. The chef puts plates on one end, customers take them off along the way. On a quiet night the chef can make plates faster than people eat. If the chef just keeps going, the belt fills up, then plates pile onto the floor, then the fish on the oldest plates goes bad.

A good sushi bar has three ways out. The chef can **watch the belt** and stop when it is full (slow the producer). The restaurant can **turn away new customers** at the door when the kitchen is overwhelmed (shed load). Or customers can **order from the chef** directly, so the chef only makes what someone asked for (pull).

What it must never do is buy a longer belt every time it fills up. A longer belt only means more plates, older fish and a bigger mess when it finally overflows. That longer belt is an unbounded queue, and it is the most common backpressure bug in software.

## 2. The Definition

📌 **Interview term: backpressure** — feedback from a slower stage to a faster stage that makes the faster stage slow down (or stop), so the rate at which work is accepted matches the rate at which it can be completed.

The word comes from fluid in pipes: when the pipe downstream is narrow, pressure builds back toward the source. In a system, the "pressure" is any signal the producer can act on: a blocked call, a \`false\` return value, a full TCP window, a \`429\` response, or simply the consumer not asking for more.

📌 **Interview term: producer / consumer** — the stage that creates work and the stage that processes it. Every pipeline has many pairs: client and API, API and queue, queue and worker, worker and database.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 240" role="img" aria-label="A fast producer feeds a bounded buffer that feeds a slow consumer; a dashed signal goes back from the buffer to the producer">
  <defs>
    <marker id="sd09q4-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="60" width="170" height="70" rx="8"/>
  <text class="d-text" x="115" y="90" text-anchor="middle">Producer</text>
  <text class="d-sub" x="115" y="112" text-anchor="middle">150 per s</text>
  <rect class="d-box-accent" x="295" y="60" width="170" height="70" rx="8"/>
  <text class="d-text" x="380" y="90" text-anchor="middle">Buffer</text>
  <text class="d-sub" x="380" y="112" text-anchor="middle">bounded, 100</text>
  <rect class="d-box" x="560" y="60" width="170" height="70" rx="8"/>
  <text class="d-text" x="645" y="90" text-anchor="middle">Consumer</text>
  <text class="d-sub" x="645" y="112" text-anchor="middle">100 per s</text>
  <path class="d-edge" d="M 200 95 L 287 95" marker-end="url(#sd09q4-arrow)"/>
  <path class="d-edge" d="M 465 95 L 552 95" marker-end="url(#sd09q4-arrow)"/>
  <path class="d-edge-dashed" d="M 380 130 L 380 190 L 115 190 L 115 138" marker-end="url(#sd09q4-arrow)"/>
  <text class="d-accent" x="248" y="172" text-anchor="middle">slow down signal</text>
</svg>

When the producer is faster than the consumer, the gap has to go somewhere: into a buffer, back to the producer, or onto the floor. Backpressure is the decision about where.

## 3. Why an Unbounded Queue Is Not a Solution

A queue absorbs **bursts**: work that arrives faster for a short while and then slows down. It cannot absorb a **sustained** rate difference. If 120 messages per second arrive and 100 are processed, 20 per second accumulate forever:

~~~text
sustained overload with an unbounded queue (in 120/s, out 100/s, 2 KB per message):
  after  1 min:   1200 queued,   2.4 MB, newest waits 12 s
  after 10 min:  12000 queued,    24 MB, newest waits 120 s
  after 60 min:  72000 queued,   144 MB, newest waits 720 s
~~~

📌 **Interview term: Little's law** — in a stable system, items waiting = arrival rate x time each waits. Rearranged, a message that joins a queue of 72,000 behind a consumer doing 100/s waits 72,000 / 100 = 720 seconds. A queue converts excess load into **latency**, and eventually into **memory exhaustion**.

The memory is the obvious failure (an out-of-memory crash after an hour). The latency is the subtle one: long before memory runs out, every message in the queue is minutes old, users have given up and retried, and the system is busy doing work nobody is waiting for any more.

📌 **Interview term: bounded buffer** — a buffer with a fixed maximum size. It is the precondition for every backpressure strategy, because only a full buffer forces a decision.

## 4. Four Strategies, Measured

The example offers 150 messages per second for 10 seconds and then 50 per second for 10 seconds, to a consumer that does 100 per second. The bounded strategies hold at most 100 messages between seconds.

~~~text
offered: 150/s for t=0..9, 50/s for t=10..19; consumer 100/s; bound 100
queue depth at the end of each second:
  unbounded   50 100 150 200 250 300 350 400 450 500 450 400 350 300 250 200 150 100  50   0
  drop        50 100 100 100 100 100 100 100 100 100  50   0   0   0   0   0   0   0   0   0
  block       50 100 100 100 100 100 100 100 100 100 100 100 100 100 100 100 100 100  50   0
  credits      0   0   0   0   0   0   0   0   0   0   0   0   0   0   0   0   0   0   0   0

strategy    max depth  max wait  dropped  max producer backlog  processed  still pending
  unbounded        500       5 s        0                     0       2000              0
  drop             100       1 s      400                     0       1600              0
  block            100       1 s        0                   400       2000              0
  credits            0       0 s        0                   500       2000              0
~~~

- **Unbounded:** nothing is lost, but the queue grew to 500 and the last burst messages waited 5 s. With a longer burst, both numbers grow without limit.
- **Drop (load shedding):** the queue never exceeded 100 and no message waited more than 1 s, but **400 messages were rejected**: 1,600 processed of 2,000.
- **Block (slow the producer):** the queue stayed at 100, nothing was lost, and the excess, up to **400 messages**, waited on the producer side instead. The producer was forced to slow down to the consumer rate.
- **Credits (pull):** the consumer granted exactly as many credits as it could process each second, so the buffer stayed **empty** and all 500 excess messages waited upstream, where the producer can decide what to do with them.

The last two look similar, and that is the point: in both, waiting moves **upstream**, toward the source of the load. That is where it can be handled sensibly, for example by an API telling its client to slow down, instead of piling up in the middle of the system.

📌 **Interview term: load shedding** — deliberately rejecting or dropping work when overloaded, so the work you do accept is served on time. Usually done at the edge with \`429 Too Many Requests\` or \`503 Service Unavailable\` and a \`Retry-After\` header.

📌 **Interview term: blocking backpressure** — the producer call waits (or is told "not now") until the buffer has room, so the producer rate falls to the consumer rate.

📌 **Interview term: credit-based (pull) flow control** — the consumer tells the producer how many items it may send ("request 100"); the producer never sends more than it was granted. Reactive Streams (\`request(n)\`), HTTP/2 flow-control windows and Kafka consumers polling for records all work this way.

## 5. Choosing a Strategy

| Strategy | Keeps every message | Bounded memory | Bounded latency | Use when |
| :--- | :---: | :---: | :---: | :--- |
| Unbounded buffer | yes | no | no | never as a design; only for tiny, provably short bursts |
| Bounded + block producer | yes | yes | no, moves upstream | the producer can wait: file copies, ETL, internal pipelines |
| Bounded + drop / reject | no | yes | yes | fresh data beats complete data: metrics, video frames, interactive APIs |
| Pull / credits | yes | yes | moves upstream | consumers that pace themselves: Kafka consumers, streaming libraries |
| Sample or aggregate | no, summarised | yes | yes | telemetry where 1 in N, or a per-second sum, is enough |
| Scale the consumer | yes | yes | yes | the overload is sustained and the consumer can scale out |

Scaling consumers (more workers, autoscaling on queue depth) fixes a sustained imbalance, but takes minutes to react; backpressure is what keeps the system healthy during those minutes. Which work to drop first is a product decision: shed health checks and analytics before checkouts, for example by giving requests priorities.

## 6. Backpressure You Already Use

**TCP.** Every TCP receiver advertises a **receive window**, the number of bytes it can still buffer. When the application stops reading, the window shrinks to zero and the sender stops sending. That is credit-based flow control built into the network stack.

📌 **Interview term: TCP receive window** — the amount of unacknowledged data a TCP sender may have in flight, set by the receiver based on its free buffer space.

**Node.js streams.** A \`Writable\` stream buffers data up to its **\`highWaterMark\`**. \`write()\` returns \`false\` once the buffer reaches that mark, and the stream emits \`'drain'\` when it has emptied enough to accept more. Ignoring the \`false\` does not lose data; it keeps buffering, which is exactly the unbounded-queue bug. The second example runs it on Node 22:

~~~text
node v22: default writableHighWaterMark = 65536 bytes
ignore false: write() first returned false on write #4, kept writing; peak buffered = 320 KiB
respect false: paused for 'drain' 5 times; peak buffered = 64 KiB
pipeline():   20 chunks moved; peak buffered in the sink = 64 KiB
~~~

- The default \`writableHighWaterMark\` on Node 22 is **65,536 bytes**. The v22.0.0 release raised it from 16 KiB to 64 KiB (listed in the Node.js 22 release announcement). Object-mode streams count objects instead of bytes.
- With 16 KiB chunks, the **4th** write returned \`false\` (4 x 16 = 64 KiB). A producer that kept writing anyway buffered all **320 KiB** in memory.
- A producer that waited for \`'drain'\` each time paused 5 times and never buffered more than **64 KiB**.
- \`pipeline()\` did the waiting automatically and also stayed at **64 KiB**. Use \`pipeline()\` (or \`for await\` over a readable) rather than hand-written \`data\` handlers.

📌 **Interview term: highWaterMark** — the buffer threshold of a Node.js stream; above it \`write()\` returns \`false\` and a readable stops pulling from its source.

The well-behaved loop is short:

~~~js
for (let i = 0; i < TOTAL; i++) {
  const ok = w.write(CHUNK);
  if (!ok) await once(w, "drain");   // the backpressure signal
}
~~~

**Message brokers.** A broker is a large, durable buffer between producer and consumer; see [What is a message queue and why use one?](/interview-question/what-is-a-message-queue-and-why-use-one). It decouples the two, but it does not remove the need for backpressure: watch **consumer lag** (how far behind the consumer is) and alert on it, set retention so the broker itself does not fill up, and let consumers pull at their own pace instead of having a push dispatcher overwhelm them.

📌 **Interview term: consumer lag** — how many messages (or how many seconds of messages) a consumer is behind the newest message. Growing lag is the queue-depth table above, in production.

## 7. Propagate It to the Edge

Backpressure only works if it reaches a component that can actually slow down. Inside a service, that chain is: database pool full -> worker blocks -> internal queue fills -> request handler cannot enqueue -> API returns \`429\` or \`503\` -> the client backs off. Every link must pass the signal on rather than absorb it in another unbounded buffer.

- At the API edge, a [rate limiter](/interview-question/how-would-you-design-a-rate-limiter) caps each client in advance; load shedding caps the total when the system is overloaded right now. The two are compared in [What is the difference between throttling and rate limiting?](/interview-question/what-is-the-difference-between-throttling-and-rate-limiting).
- Between services, a caller that sees \`503\`s should back off and, if they persist, stop calling: that is a [circuit breaker](/interview-question/what-is-the-circuit-breaker-pattern).
- In-process, use bounded queues and bounded pools everywhere (thread pools, connection pools, channel sizes), so a full one is a visible signal and not a slow memory leak; see [What is database connection pooling?](/interview-question/what-is-database-connection-pooling).

📌 **Interview term: queue-depth-based admission control** — rejecting new work at the edge when an internal queue or latency metric passes a limit, so the system serves fewer requests well instead of all requests badly.

## 8. Verified: Running the Code

Two examples were run.

**"Backpressure strategies on a fake clock: unbounded queue, load shedding, blocking the producer and credit-based pull"** ran with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
offered: 150/s for t=0..9, 50/s for t=10..19; consumer 100/s; bound 100
queue depth at the end of each second:
  unbounded   50 100 150 200 250 300 350 400 450 500 450 400 350 300 250 200 150 100  50   0
  drop        50 100 100 100 100 100 100 100 100 100  50   0   0   0   0   0   0   0   0   0
  block       50 100 100 100 100 100 100 100 100 100 100 100 100 100 100 100 100 100  50   0
  credits      0   0   0   0   0   0   0   0   0   0   0   0   0   0   0   0   0   0   0   0

strategy    max depth  max wait  dropped  max producer backlog  processed  still pending
  unbounded        500       5 s        0                     0       2000              0
  drop             100       1 s      400                     0       1600              0
  block            100       1 s        0                   400       2000              0
  credits            0       0 s        0                   500       2000              0

sustained overload with an unbounded queue (in 120/s, out 100/s, 2 KB per message):
  after  1 min:   1200 queued,   2.4 MB, newest waits 12 s
  after 10 min:  12000 queued,    24 MB, newest waits 120 s
  after 60 min:  72000 queued,   144 MB, newest waits 720 s
~~~

**"Real Node.js stream backpressure: write() returning false, waiting for drain, and pipeline()"** ran with \`node main.js\` on Node 22.22 and printed:

~~~text
node v22: default writableHighWaterMark = 65536 bytes
ignore false: write() first returned false on write #4, kept writing; peak buffered = 320 KiB
respect false: paused for 'drain' 5 times; peak buffered = 64 KiB
pipeline():   20 chunks moved; peak buffered in the sink = 64 KiB
~~~

What the simulations stand for and leave out: the strategy example is a fake clock with one-second ticks; "the producer holds it" is a counter standing in for a blocked call or a client told to retry, and the producer-side waiting time is not added to the reported max wait. Messages are counts, not objects, and the 2 KB size is an assumption for the memory column. The Node.js example is real stream code, but the "slow consumer" finishes each chunk on the next event-loop turn (\`setImmediate\`) rather than doing real I/O, so it shows the buffering behaviour, not throughput.

## Edge Cases Worth Knowing

- **Bursty but stable traffic.** A bounded buffer sized for the expected burst (here 10 s x 50/s of excess = 500) absorbs it without loss; size buffers from the burst, not from a guess.
- **Retries amplify overload.** Clients that retry rejected requests immediately add load exactly when it hurts; reject with \`Retry-After\` and expect clients to back off with jitter.
- **Head-of-line blocking.** One slow message in a FIFO buffer delays all those behind it; separate queues per priority or per tenant contain it.
- **Fan-in.** A consumer fed by many producers needs per-producer limits, or one noisy producer uses the whole buffer.
- **Stale work.** After a long backlog, the oldest messages may be useless; set deadlines (time-to-live) and drop expired work instead of processing it.

## Common Pitfalls

- **Treating a bigger queue as a fix.** It only delays the crash and raises latency for everyone, as the 72,000-message row showed.
- **Ignoring \`write()\` returning \`false\` in Node.js.** The stream keeps buffering; the run held 320 KiB instead of 64 KiB.
- **Absorbing the signal in the middle.** An unbounded in-memory queue between two bounded components breaks the chain.
- **Shedding the wrong work.** Without priorities, a load shedder drops checkouts as readily as analytics pings.
- **Monitoring throughput but not depth or lag.** Throughput looks fine while a queue silently grows; alert on queue depth, consumer lag and age of the oldest message.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">Backpressure is a signal from a slow <strong style="color:#ffca28;">consumer</strong> to a fast <strong style="color:#ffca28;">producer</strong> to slow down, so work is accepted no faster than it can be finished.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why:</strong> <span style="color:#f0e2c8;">The gap between rates has to go somewhere. An <strong style="color:#ffca28;">unbounded queue</strong> turns it into latency and then memory exhaustion: at 120 in and 100 out, an hour gives 72,000 queued and a 720 s wait, by <strong style="color:#ffca28;">Little's law</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Options:</strong> <span style="color:#f0e2c8;">Bound every buffer, then either <strong style="color:#ffca28;">block</strong> the producer (nothing lost, waiting moves upstream), <strong style="color:#ffca28;">shed load</strong> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">429</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">503</code> (bounded latency, work lost), or use <strong style="color:#ffca28;">pull/credits</strong> so the consumer asks for N. In my simulation drop lost 400 of 2,000, block and credits lost none.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Real mechanisms:</strong> <span style="color:#f0e2c8;">TCP receive windows, Node.js <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">write()</code> returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'drain'</code> (Node 22 default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">highWaterMark</code> is 64 KiB; ignoring it buffered 320 KiB in my run), Reactive Streams <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">request(n)</code>, Kafka consumers pulling at their own pace.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Design rule:</strong> <span style="color:#f0e2c8;">Propagate the signal to the <strong style="color:#ffca28;">edge</strong>, where a client can be told to retry later; bounded pools and queues everywhere, priorities for what to shed, and alerts on queue depth and consumer lag.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Backpressure vs rate limiting?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Rate limiting is a fixed policy per client decided in advance ("100 requests per minute"). Backpressure is dynamic: it reacts to the current capacity of the consumer. Load shedding is backpressure applied at the edge.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle backpressure with Kafka?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Consumers pull, so the broker never pushes faster than they poll. The risk moves to lag and retention: monitor consumer lag, scale consumers up to the partition count, and make sure retention outlasts the worst backlog, or old data is deleted before it is read.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if a Node.js app ignores <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">write()</code> returning <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">false</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No data is lost; the stream keeps buffering in memory. With a fast producer that is an unbounded queue, and the process eventually runs out of memory. Wait for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'drain'</code> or use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pipeline()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you drop instead of block?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When fresh data is worth more than complete data: metrics, live video, interactive requests where a late answer is useless. Block when every item matters and the producer can wait, like file copies or billing events.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How big should a buffer be?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Big enough for the bursts you expect, sized by arithmetic: excess rate times burst length. Bigger than that only adds latency during sustained overload.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Backpressure | Feedback that makes a faster stage slow down to the pace of a slower one |
| Producer / consumer | The stage that creates work and the stage that processes it |
| Little's law | Items waiting = arrival rate x time each waits |
| Bounded buffer | A buffer with a fixed maximum size |
| Load shedding | Deliberately rejecting work when overloaded |
| Blocking backpressure | The producer waits until the buffer has room |
| Credit-based (pull) flow control | The consumer grants the producer permission for N items |
| TCP receive window | Bytes a sender may have in flight, set by the receiver |
| highWaterMark | Node.js stream buffer threshold where \`write()\` returns \`false\` |
| Consumer lag | How far a consumer is behind the newest message |
| Queue-depth-based admission control | Rejecting new work at the edge when internal queues are too deep |

**Conclusion:** Backpressure is how a system admits that its slowest stage sets the pace. Without it, the gap between a fast producer and a slow consumer silently fills an unbounded queue, turning overload into minutes of latency and finally an out-of-memory crash. With it, every buffer is bounded and a full buffer means a decision: block the producer, shed load at the edge, or let the consumer pull only what it can handle. The simulation showed the trade-off in numbers, 400 dropped messages versus 400 waiting upstream, and the Node.js run showed the same principle in a real API: respect \`false\` and \`'drain'\` and memory stays at 64 KiB, ignore them and it grows with the input.`,
    examples: [
      {
        label: `Backpressure strategies on a fake clock: unbounded queue, load shedding, blocking the producer and credit-based pull`,
        variants: [
          { tech: "node", code: `// Backpressure on a fake clock: a producer bursts at 150 msg/s for 10 s, then sends
// 50 msg/s; the consumer can do 100 msg/s. Four ways to handle the gap.
const SECONDS = 20, CAPACITY = 100, BOUND = 100;
const offered = (t) => (t < 10 ? 150 : 50);

function simulate(strategy) {
  const queue = []; // FIFO of [enqueueSecond, count]
  let depth = 0, dropped = 0, backlog = 0, maxDepth = 0, maxWait = 0, maxBacklog = 0, done = 0, offeredTotal = 0;
  const depths = [];
  for (let t = 0; t < SECONDS; t++) {
    let arriving = offered(t);
    offeredTotal += arriving;
    if (strategy === "block" || strategy === "credits") { arriving += backlog; backlog = 0; }
    let room = strategy === "unbounded" ? Infinity : BOUND + CAPACITY - depth; // what fits this second
    if (strategy === "credits") room = Math.min(room, CAPACITY); // consumer grants credits = its rate
    const accepted = Math.min(arriving, room);
    if (strategy === "drop") dropped += arriving - accepted;
    else backlog += arriving - accepted; // block / credits: producer holds it (upstream waits)
    if (accepted > 0) { queue.push([t, accepted]); depth += accepted; }
    let budget = CAPACITY; // consumer drains up to 100 this second
    while (budget > 0 && queue.length) {
      const seg = queue[0];
      const n = Math.min(budget, seg[1]);
      seg[1] -= n; budget -= n; depth -= n; done += n;
      maxWait = Math.max(maxWait, t - seg[0]);
      if (seg[1] === 0) queue.shift();
    }
    maxDepth = Math.max(maxDepth, depth);
    maxBacklog = Math.max(maxBacklog, backlog);
    depths.push(depth);
  }
  return { depths, maxDepth, maxWait, dropped, maxBacklog, done, offeredTotal, left: depth + backlog };
}

console.log(\`offered: 150/s for t=0..9, 50/s for t=10..19; consumer 100/s; bound \${BOUND}\`);
console.log("queue depth at the end of each second:");
const rows = [];
for (const s of ["unbounded", "drop", "block", "credits"]) {
  const r = simulate(s);
  rows.push([s, r]);
  console.log(\`  \${s.padEnd(10)} \${r.depths.map((d) => String(d).padStart(3)).join(" ")}\`);
}
console.log("\\nstrategy    max depth  max wait  dropped  max producer backlog  processed  still pending");
for (const [s, r] of rows)
  console.log(\`  \${s.padEnd(10)} \${String(r.maxDepth).padStart(9)} \${String(r.maxWait + " s").padStart(9)} \${String(r.dropped).padStart(8)} \${String(r.maxBacklog).padStart(21)} \${String(r.done).padStart(10)} \${String(r.left).padStart(14)}\`);

console.log("\\nsustained overload with an unbounded queue (in 120/s, out 100/s, 2 KB per message):");
for (const minutes of [1, 10, 60]) {
  const queued = 20 * 60 * minutes;
  console.log(\`  after \${String(minutes).padStart(2)} min: \${String(queued).padStart(6)} queued, \${String((queued * 2) / 1000).padStart(5)} MB, newest waits \${queued / 100} s\`);
}` },
          { tech: "python", code: `# Backpressure on a fake clock: a producer bursts at 150 msg/s for 10 s, then sends
# 50 msg/s; the consumer can do 100 msg/s. Four ways to handle the gap.
import math

SECONDS, CAPACITY, BOUND = 20, 100, 100


def offered(t):
    return 150 if t < 10 else 50


def simulate(strategy):
    queue = []  # FIFO of [enqueue_second, count]
    depth = dropped = backlog = max_depth = max_wait = max_backlog = done = offered_total = 0
    depths = []
    for t in range(SECONDS):
        arriving = offered(t)
        offered_total += arriving
        if strategy in ("block", "credits"):
            arriving += backlog
            backlog = 0
        room = math.inf if strategy == "unbounded" else BOUND + CAPACITY - depth  # what fits this second
        if strategy == "credits":
            room = min(room, CAPACITY)  # consumer grants credits = its rate
        accepted = min(arriving, room)
        if strategy == "drop":
            dropped += arriving - accepted
        else:
            backlog += arriving - accepted  # block / credits: producer holds it (upstream waits)
        if accepted > 0:
            queue.append([t, accepted])
            depth += accepted
        budget = CAPACITY  # consumer drains up to 100 this second
        while budget > 0 and queue:
            seg = queue[0]
            n = min(budget, seg[1])
            seg[1] -= n
            budget -= n
            depth -= n
            done += n
            max_wait = max(max_wait, t - seg[0])
            if seg[1] == 0:
                queue.pop(0)
        max_depth = max(max_depth, depth)
        max_backlog = max(max_backlog, backlog)
        depths.append(depth)
    return {"depths": depths, "max_depth": max_depth, "max_wait": max_wait, "dropped": dropped,
            "max_backlog": max_backlog, "done": done, "left": depth + backlog}


print(f"offered: 150/s for t=0..9, 50/s for t=10..19; consumer 100/s; bound {BOUND}")
print("queue depth at the end of each second:")
rows = []
for s in ("unbounded", "drop", "block", "credits"):
    r = simulate(s)
    rows.append((s, r))
    print(f"  {s:<10} {' '.join(f'{d:>3}' for d in r['depths'])}")
print("\\nstrategy    max depth  max wait  dropped  max producer backlog  processed  still pending")
for s, r in rows:
    print(f"  {s:<10} {r['max_depth']:>9} {str(r['max_wait']) + ' s':>9} {r['dropped']:>8} {r['max_backlog']:>21} {r['done']:>10} {r['left']:>14}")

print("\\nsustained overload with an unbounded queue (in 120/s, out 100/s, 2 KB per message):")
for minutes in (1, 10, 60):
    queued = 20 * 60 * minutes
    mb = queued * 2 / 1000
    mb_s = str(int(mb)) if mb == int(mb) else str(mb)
    print(f"  after {minutes:>2} min: {queued:>6} queued, {mb_s:>5} MB, newest waits {queued // 100} s")` },
        ],
      },
      {
        label: `Real Node.js stream backpressure: write() returning false, waiting for drain, and pipeline()`,
        tech: "node",
        code: `// Real Node.js stream backpressure: write() returns false once the buffer reaches
// highWaterMark; a well-behaved producer waits for 'drain'. Node 22 default HWM shown.
const { Writable } = require("node:stream");
const { once } = require("node:events");

const CHUNK = Buffer.alloc(16 * 1024); // 16 KiB per write
const TOTAL = 20; // 320 KiB in all

function slowSink() {
  // A consumer that finishes one chunk per event-loop turn (setImmediate).
  return new Writable({ write(chunk, enc, cb) { setImmediate(cb); } });
}

console.log(\`node \${process.version.split(".")[0]}: default writableHighWaterMark = \${slowSink().writableHighWaterMark} bytes\`);

async function ignoring() {
  const w = slowSink();
  let firstFalse = -1, peak = 0;
  for (let i = 0; i < TOTAL; i++) {
    const ok = w.write(CHUNK);
    if (!ok && firstFalse < 0) firstFalse = i + 1;
    peak = Math.max(peak, w.writableLength);
  }
  w.end(); await once(w, "finish");
  console.log(\`ignore false: write() first returned false on write #\${firstFalse}, kept writing; peak buffered = \${peak / 1024} KiB\`);
}

async function respecting() {
  const w = slowSink();
  let peak = 0, waits = 0;
  for (let i = 0; i < TOTAL; i++) {
    const ok = w.write(CHUNK);
    peak = Math.max(peak, w.writableLength);
    if (!ok) { waits++; await once(w, "drain"); }
  }
  w.end(); await once(w, "finish");
  console.log(\`respect false: paused for 'drain' \${waits} times; peak buffered = \${peak / 1024} KiB\`);
}

async function piped() {
  const { Readable, pipeline } = require("node:stream");
  let produced = 0, peak = 0;
  const src = new Readable({
    read() { produced++; this.push(produced <= TOTAL ? CHUNK : null); },
  });
  const w = slowSink();
  await new Promise((res, rej) => {
    const orig = w.write.bind(w);
    w.write = (c, ...a) => { const r = orig(c, ...a); peak = Math.max(peak, w.writableLength); return r; };
    pipeline(src, w, (err) => (err ? rej(err) : res()));
  });
  console.log(\`pipeline():   \${TOTAL} chunks moved; peak buffered in the sink = \${peak / 1024} KiB\`);
}

(async () => { await ignoring(); await respecting(); await piped(); })();`,
      },
    ],
  },
  {
    title: `How do distributed systems detect node failures?`,
    difficulty: "medium",
    seoDescription: `How clusters detect dead nodes: heartbeats and timeouts, the false-positive trade-off, phi accrual detectors, SWIM gossip with suspicion, and fencing.`,
    description: `**Question presented to candidate:**
"In a cluster of servers, say a database, a cache or a set of workers, how does the system decide that one node has died? What makes that hard, and how do real systems like Cassandra, etcd or Consul do it?"

**What a strong answer should cover:**
- The core difficulty: over a network a **crashed** node and a **slow or unreachable** node look the same; detectors can only **suspect**, so every detector trades **detection speed** against **false positives**
- **Heartbeats and timeouts**: how the timeout is chosen (several heartbeat intervals), and what GC pauses, network jitter and overload do to it
- **Phi accrual** detectors (Cassandra, Akka): output a suspicion level computed from the observed heartbeat history, compared with a threshold, so the timeout adapts to the network
- **Gossip / SWIM**: random probing, **indirect pings** through other members, a **suspect** state that the node can refute with an **incarnation number**, and dissemination that scales to thousands of nodes
- What happens after detection: leader election, re-replication, and **fencing tokens / leases** so a node wrongly declared dead cannot keep writing
- Real numbers: etcd defaults (100 ms heartbeat, 1,000 ms election timeout), Cassandra \`phi_convict_threshold\` of 8

**Code / implementation expected:** Optional — the reasoning matters most; the example compares fixed timeouts, a phi accrual detector and SWIM-style indirect probing on the same simulated heartbeats.`,
    answer: `**Target Audience:** Beginners who know a cluster is several servers working together and want to understand how the cluster notices when one of them stops, and why it sometimes gets it wrong.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output). The FLP result is from Fischer, Lynch and Paterson (JACM, 1985); Kubernetes lease behaviour from the Kubernetes node-status documentation; memberlist and Lifeguard from HashiCorp's "Making Gossip More Robust with Lifeguard". etcd defaults are cited from the etcd tuning documentation; Cassandra's phi threshold from the DataStax Cassandra documentation; the phi accrual detector from Hayashibara et al. (2004) as implemented in Akka; SWIM from Das, Gupta and Motivala (DSN 2002).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. Every number comes from running the example; the **Verified** section quotes its full output.

## 1. Why This Even Matters — A Story First

You are on a group hike and agree that everyone shouts "here!" every minute. One friend goes quiet. Have they fallen, or did they stop to tie a shoelace behind a rock where you cannot hear them? From where you stand, the two look exactly the same: silence.

If you raise the alarm after one missed shout, you will call the mountain rescue every time someone ties a shoe. If you wait twenty minutes to be sure, a friend who really fell waits twenty minutes for help. And if you ask two other hikers to shout for that friend from where they are, you learn much more: maybe it is only **your** view that is blocked.

That is failure detection in a distributed system. Machines cannot see each other, only hear messages. A **crashed** node and a node that is **slow**, **paused** or **cut off by the network** produce the same silence. Every detector is a guess, tuned between "fast" and "rarely wrong", and good ones ask for second opinions.

## 2. Why It Matters and Why It Is Hard

Failure detection drives the most important automatic actions in a cluster:

- **Leader election**: followers start an election when they stop hearing from the leader. See [What is leader election in distributed systems?](/interview-question/what-is-leader-election-in-distributed-systems).
- **Rerouting and re-replication**: load balancers stop sending traffic to the node; storage systems copy its data elsewhere.
- **Membership**: a consistent-hashing ring or a sharded store removes the node and hands its keys to others. See [What is consistent hashing?](/interview-question/what-is-consistent-hashing).

Each action is expensive or dangerous if triggered wrongly: an unnecessary election stops writes, re-replication moves terabytes, and a node declared dead but still running can corrupt data (section 7).

📌 **Interview term: crash failure vs partial failure** — a crash stops a node completely. A partial failure is everything else: a slow disk, a long garbage-collection pause, an overloaded CPU, or one network link down while others work. Partial failures are the common case and the hard one.

📌 **Interview term: asynchronous network** — a network with no upper bound on how long a message may take. In such a network you cannot distinguish a crashed node from a slow one with certainty. This is the root of the famous impossibility result for consensus (Fischer, Lynch and Paterson, 1985) and the reason detectors are called **unreliable failure detectors**: they can be wrong.

The two properties every detector trades:

📌 **Interview term: completeness and accuracy** — completeness: every crashed node is eventually suspected. Accuracy: live nodes are not suspected. A detector that waits longer is more accurate and slower; one that reacts quickly catches crashes sooner and produces more **false positives**.

## 3. Heartbeats and Timeouts

The simplest detector: every node sends a small message, a **heartbeat**, every interval (say 1 s). A monitor, or every peer, records when it last heard from each node and suspects any node that has been silent longer than a **timeout**.

📌 **Interview term: heartbeat** — a periodic "I am alive" message. Either the node pushes it, or the monitor pulls it with a ping and waits for an ack.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="Heartbeat arrivals on a timeline: regular beats, a gap longer than the timeout during a pause, and beats that stop after a crash">
  <path class="d-edge" d="M 40 120 L 720 120"/>
  <rect class="d-box" x="60" y="105" width="14" height="30" rx="3"/>
  <rect class="d-box" x="120" y="105" width="14" height="30" rx="3"/>
  <rect class="d-box" x="180" y="105" width="14" height="30" rx="3"/>
  <rect class="d-box-muted" x="250" y="60" width="150" height="40" rx="6"/>
  <text class="d-sub" x="325" y="85" text-anchor="middle">GC pause, silent</text>
  <rect class="d-box" x="420" y="105" width="14" height="30" rx="3"/>
  <rect class="d-box" x="480" y="105" width="14" height="30" rx="3"/>
  <rect class="d-box-accent" x="560" y="160" width="140" height="44" rx="6"/>
  <text class="d-text" x="630" y="187" text-anchor="middle">crash</text>
  <text class="d-sub" x="125" y="180" text-anchor="middle">beats every 1 s</text>
  <text class="d-accent" x="325" y="180" text-anchor="middle">false suspicion</text>
  <text class="d-sub" x="610" y="80" text-anchor="middle">no more beats</text>
</svg>

On a timeline, a pause and a crash look the same at first: no heartbeats. The pause ends and beats resume; the crash never does. A detector only sees the gap.

The example sends heartbeats every 1,000 ms with up to ±120 ms of jitter. Node **B** is alive but has a 3.5 s garbage-collection pause at t=20 s. Node **C** crashes at t=29.5 s. Four fixed timeouts:

~~~text
== 1. Fixed timeout: speed vs false positives ==
timeout   B (alive) false suspicions   C (crashed at 29.5 s) detected   delay
 1100 ms                          6                      30.2 s    0.7 s
 1500 ms                          1                      30.6 s    1.1 s
 3000 ms                          1                      32.1 s    2.6 s
 5000 ms                          0                      34.1 s    4.6 s
~~~

- **1,100 ms** detected C's crash in 0.7 s, but suspected the healthy B **6 times**: ordinary jitter alone pushed some gaps past 1.1 s.
- **1,500 ms** stopped the jitter false alarms but still suspected B during its pause.
- **3,000 ms** still caught the pause, because B's longest silence (from its last beat before the pause to its first after) was 4.56 s (from 18.94 s to 23.5 s).
- **5,000 ms** made no false accusations, and took **4.6 s** to notice a real crash.

There is no timeout that is both fast and never wrong; you choose where on the curve to sit. A common rule of thumb is a timeout of several heartbeat intervals, adjusted for the worst pauses you expect.

📌 **Interview term: false positive (false suspicion)** — declaring a live node failed. Its cost is the recovery action you trigger for nothing, plus the danger of two nodes both acting as owner.

📌 **Interview term: detection time** — the delay between a real failure and the detector suspecting it. Roughly the timeout plus up to one check interval.

Real numbers: etcd, which uses Raft, sends leader heartbeats every **100 ms** by default and uses a **1,000 ms** election timeout; its tuning guide recommends a heartbeat interval around the round-trip time between members and an election timeout several times larger (etcd documentation, "Tuning").

## 4. Phi Accrual: Let the Data Choose the Timeout

A fixed timeout ignores what the network is actually like. A 1.5 s timeout is generous inside one data centre and far too tight across continents. The **phi accrual failure detector** (Hayashibara, Défago, Yared and Katayama, 2004) instead keeps a history of heartbeat **inter-arrival times** and turns "how long since the last beat" into a suspicion level.

📌 **Interview term: phi accrual failure detector** — computes φ = -log10(P(a heartbeat would arrive later than now)), using a distribution fitted to recent inter-arrival times. φ = 1 means about a 10% chance the node is fine and the beat is just late, φ = 2 about 1%, φ = 8 about one in a hundred million. The application picks a threshold on φ, not a timeout in milliseconds.

The example fits a normal distribution (as the Akka implementation does) to two histories with the same 1,000 ms mean but different jitter:

~~~text
== 2. Phi accrual: the same threshold adapts to each network ==
LAN (jitter x1)           mean=1000 sd=101.4  phi>=1 at 1130 ms, phi>=3 at 1320 ms, phi>=8 at 1570 ms
cross-region (jitter x5)  mean=1000 sd=507.1  phi>=1 at 1650 ms, phi>=3 at 2570 ms, phi>=8 at 3850 ms
LAN phi after silence: 1100 ms -> 0.79, 1200 ms -> 1.61, 1300 ms -> 2.81, 1500 ms -> 6.39, 2000 ms -> 22.51
~~~

- On the **LAN** history (standard deviation 101.4 ms), φ reached 8 after **1,570 ms** of silence.
- On the **cross-region** history (standard deviation 507.1 ms), the same threshold of 8 was reached only after **3,850 ms**.

The threshold stayed the same; the effective timeout adapted to each network. φ also rises steeply: from 0.79 at 1,100 ms to 22.51 at 2,000 ms on the LAN. The jitter-induced false alarms of the 1,100 ms fixed timeout correspond to φ below 1, which a threshold of 8 ignores.

What phi accrual does **not** fix: a 4.56 s GC pause on a LAN still looks like a failure, because it really is far outside the normal pattern. Implementations add an "acceptable pause" allowance or a minimum standard deviation for that, which is again a fixed choice.

Apache Cassandra uses an accrual detector; its \`phi_convict_threshold\` setting defaults to **8**, and the DataStax documentation suggests raising it to 10 or 12 in environments with frequent network congestion such as some cloud deployments.

## 5. Gossip and SWIM: Second Opinions at Scale

In a large cluster, "everyone heartbeats everyone" is too expensive: with N nodes that is N x (N - 1) messages per interval. And a single monitor that cannot reach a node does not know whether the node or its own link is broken.

📌 **Interview term: gossip protocol** — nodes periodically exchange state with a few random peers, so information spreads through the cluster like a rumour, in a number of rounds that grows only with the logarithm of the cluster size.

**SWIM** (Scalable Weakly-consistent Infection-style process group Membership, Das, Gupta and Motivala, DSN 2002) combines probing and gossip:

1. Each protocol period, a member picks one other member and **pings** it directly.
2. If no ack arrives, it asks **k** other members to ping the target on its behalf: an **indirect ping**. If any of them gets an ack, the target is alive and only the direct path is bad.
3. If no ack arrives either way, the target is marked **suspect**, not dead, and the suspicion is gossiped by piggybacking on ping and ack messages.
4. A suspected member that is actually alive hears the rumour and **refutes** it by gossiping "alive" with a higher **incarnation number**. If no refutation arrives within a suspicion timeout, the member is **confirmed** dead.

📌 **Interview term: indirect ping (ping-req)** — asking other members to probe a target for you, so one bad network link does not get a healthy node evicted.

📌 **Interview term: incarnation number** — a counter each member attaches to its own status. Only the member itself increases it, so "alive with incarnation 1" beats "suspect with incarnation 0" and stale rumours cannot resurrect old accusations.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="Member A cannot reach D directly; it asks B and C to ping D; both reach D and relay the ack back to A">
  <defs>
    <marker id="sd09q5-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="40" y="120" width="120" height="60" rx="10"/>
  <text class="d-text" x="100" y="155" text-anchor="middle">A</text>
  <rect class="d-box" x="320" y="30" width="120" height="60" rx="10"/>
  <text class="d-text" x="380" y="65" text-anchor="middle">B</text>
  <rect class="d-box" x="320" y="210" width="120" height="60" rx="10"/>
  <text class="d-text" x="380" y="245" text-anchor="middle">C</text>
  <rect class="d-box" x="600" y="120" width="120" height="60" rx="10"/>
  <text class="d-text" x="660" y="155" text-anchor="middle">D</text>
  <path class="d-edge-dashed" d="M 160 150 L 592 150"/>
  <text class="d-sub" x="376" y="140" text-anchor="middle">direct ping lost</text>
  <path class="d-edge" d="M 160 135 L 312 70" marker-end="url(#sd09q5-arrow)"/>
  <path class="d-edge" d="M 160 165 L 312 230" marker-end="url(#sd09q5-arrow)"/>
  <path class="d-edge-accent" d="M 440 70 L 592 135" marker-end="url(#sd09q5-arrow)"/>
  <path class="d-edge-accent" d="M 440 230 L 592 165" marker-end="url(#sd09q5-arrow)"/>
  <text class="d-sub" x="200" y="90" text-anchor="middle">ping-req</text>
  <text class="d-sub" x="560" y="90" text-anchor="middle">ping, ack</text>
</svg>

When the direct path from A to D is broken, B and C still reach D and relay its ack, so A keeps D alive instead of evicting a healthy node.

The example runs exactly these steps:

~~~text
== 3. SWIM-style probing: indirect pings and suspicion ==
link A-D drops packets, D is fine. direct-only: D marked DEAD (false positive)
SWIM, k=3 helpers: A probes D -> ack via B,C,E (indirect) -> D stays ALIVE
D pauses (GC):     A probes D -> no ack
  A marks D SUSPECT/0 and gossips it
  D resumes, gossips ALIVE/1: A sees ALIVE/1, C sees ALIVE/1
  a late SUSPECT/0 reaches C: C keeps ALIVE/1 (stale rumour ignored)
D crashes:         A probes D -> no ack -> A marks SUSPECT/1
  no refutation after 3 periods -> CONFIRM/1 (dead, removed from membership)
~~~

- A direct-only detector on A would have declared D dead because of one lossy link; with three helpers, the indirect pings succeeded and D stayed alive.
- When D paused, A could not reach it at all and marked it \`SUSPECT/0\`. When D resumed, it gossiped \`ALIVE/1\`, which overrides \`SUSPECT/0\`; a late copy of the old rumour reaching C was ignored.
- When D really crashed, nobody refuted the suspicion, and after the suspicion timeout D was confirmed dead.

The cost scales well:

~~~text
messages per protocol period (k=3 helpers, worst case every probe goes indirect):
  N=10    all-to-all heartbeats      90   SWIM <=    140   (per member: 9 vs <= 14)
  N=100   all-to-all heartbeats    9900   SWIM <=   1400   (per member: 99 vs <= 14)
  N=1000  all-to-all heartbeats  999000   SWIM <=  14000   (per member: 999 vs <= 14)
~~~

All-to-all heartbeating costs each member N - 1 messages per period; SWIM costs each member at most 14 here (one ping and ack, plus 4 messages per helper), **independent of cluster size**. At 10 nodes SWIM is not cheaper; at 1,000 nodes it is about 70 times cheaper. HashiCorp's memberlist library implements SWIM and is embedded in Consul and Nomad (through Serf), according to HashiCorp's Lifeguard article.

## 6. Comparing the Approaches

| Approach | How it decides | Strength | Weakness | Seen in |
| :--- | :--- | :--- | :--- | :--- |
| Fixed timeout on heartbeats | silence longer than T | simple, predictable | one T cannot fit every network and pause | Raft (etcd), many custom systems |
| Phi accrual | φ from heartbeat history over a threshold | adapts to each link | still fooled by long pauses; more state per peer | Cassandra, Akka |
| SWIM / gossip | direct ping, indirect pings, suspect, confirm | tolerates bad links; constant load per member | slower confirmation; membership is eventually consistent | Consul, Nomad (memberlist) |
| Central coordinator with leases | node must renew a lease before it expires | one clear authority; easy fencing | the coordinator must itself be highly available | ZooKeeper sessions, etcd leases, Kubernetes node leases |

📌 **Interview term: lease** — a time-limited grant a node must keep renewing. If it stops renewing, the lease expires and others may take over. A lease turns failure detection into a rule both sides can check: the node itself knows it must stop acting when its lease runs out.

## 7. After Detection: Do Not Let the "Dead" Node Keep Writing

Because detection can be wrong, the cluster must assume a node it declared dead may still be running, for example after a long pause, and may still believe it is the leader or the lock holder. If both the old and the new owner write, data is corrupted. This is called **split brain**.

📌 **Interview term: split brain** — two nodes both acting as the single owner (leader, primary, lock holder) at the same time, usually because one was wrongly declared dead.

📌 **Interview term: fencing token** — a number that increases each time ownership changes (a Raft term, a lock version). Storage rejects writes carrying an older token, so the old owner's writes fail even if it does not know it was replaced.

Other safeguards: require a **majority** (quorum) to declare a node dead or to elect a new leader, so a minority partition cannot act on its own; make a node stop serving when its own lease expires; and power off or isolate a node before reassigning its role in systems that cannot fence (STONITH, "shoot the other node in the head"). Quorums are covered in [What is a read/write quorum?](/interview-question/what-is-a-read-write-quorum) and the wider availability picture in [How do you design for high availability?](/interview-question/how-do-you-design-for-high-availability).

## 8. Verified: Running the Code

The example **"Failure detectors: fixed timeouts vs a phi accrual detector, and SWIM indirect probes with suspicion and incarnation numbers"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
== 1. Fixed timeout: speed vs false positives ==
timeout   B (alive) false suspicions   C (crashed at 29.5 s) detected   delay
 1100 ms                          6                      30.2 s    0.7 s
 1500 ms                          1                      30.6 s    1.1 s
 3000 ms                          1                      32.1 s    2.6 s
 5000 ms                          0                      34.1 s    4.6 s

== 2. Phi accrual: the same threshold adapts to each network ==
LAN (jitter x1)           mean=1000 sd=101.4  phi>=1 at 1130 ms, phi>=3 at 1320 ms, phi>=8 at 1570 ms
cross-region (jitter x5)  mean=1000 sd=507.1  phi>=1 at 1650 ms, phi>=3 at 2570 ms, phi>=8 at 3850 ms
LAN phi after silence: 1100 ms -> 0.79, 1200 ms -> 1.61, 1300 ms -> 2.81, 1500 ms -> 6.39, 2000 ms -> 22.51

== 3. SWIM-style probing: indirect pings and suspicion ==
link A-D drops packets, D is fine. direct-only: D marked DEAD (false positive)
SWIM, k=3 helpers: A probes D -> ack via B,C,E (indirect) -> D stays ALIVE
D pauses (GC):     A probes D -> no ack
  A marks D SUSPECT/0 and gossips it
  D resumes, gossips ALIVE/1: A sees ALIVE/1, C sees ALIVE/1
  a late SUSPECT/0 reaches C: C keeps ALIVE/1 (stale rumour ignored)
D crashes:         A probes D -> no ack -> A marks SUSPECT/1
  no refutation after 3 periods -> CONFIRM/1 (dead, removed from membership)

messages per protocol period (k=3 helpers, worst case every probe goes indirect):
  N=10    all-to-all heartbeats      90   SWIM <=    140   (per member: 9 vs <= 14)
  N=100   all-to-all heartbeats    9900   SWIM <=   1400   (per member: 99 vs <= 14)
  N=1000  all-to-all heartbeats  999000   SWIM <=  14000   (per member: 999 vs <= 14)
~~~

The phi calculation is a single line on top of an \`erfc\` approximation (Numerical Recipes \`erfcc\`, implemented identically in both languages so the outputs match):

~~~js
const phi = (elapsed, { mean, sd }) => -Math.log10(0.5 * erfc((elapsed - mean) / (sd * Math.SQRT2)));
~~~

What the simulation stands for and leaves out: time is a fake clock in milliseconds, checked every 100 ms; jitter is a fixed repeating pattern, not real network noise. The phi detector uses a normal distribution over a fixed history with no minimum standard deviation or acceptable-pause allowance. The SWIM part models reachability as sets and applies the incarnation merge rule directly; there are no real messages, random target selection, piggybacked gossip or suspicion timers, and the message counts are the protocol worst case computed by formula.

## Edge Cases Worth Knowing

- **Asymmetric partitions.** A can hear B but B cannot hear A. One-way heartbeats then disagree; probes with acks and indirect pings catch it.
- **Gray failure.** A node answers heartbeats from a lightweight thread but fails real requests (full disk, deadlocked worker pool). Health checks should exercise the real path, not only "process is up".
- **The detector is overloaded.** A busy monitor that processes heartbeats late accuses everyone; HashiCorp's Lifeguard extensions to SWIM address this with a local health score that stretches a member's probe timeouts when the member itself is slow; HashiCorp reports about 50 times fewer false positives.
- **Correlated failures.** A rack or zone losing power makes many nodes silent at once; the recovery actions (re-replication of all of them) can overload the survivors, so rate-limit them.
- **Flapping.** A node that repeatedly crosses the threshold is added and removed over and over; hysteresis (higher bar to return than to leave) calms it.

## Common Pitfalls

- **Treating "suspected" as "dead".** Every detector can be wrong; actions on a suspicion must be safe if the node comes back.
- **Timeouts shorter than real pauses.** A 1.5 s timeout with multi-second GC pauses produces regular false failovers.
- **No fencing.** Declaring a node dead without fencing tokens or leases invites split brain when it wakes up.
- **A single observer.** One monitor's broken link evicts healthy nodes; use indirect probes or a quorum of observers.
- **Health checks that only test liveness.** A process that responds to ping but cannot serve requests is still failed for users.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The hard part:</strong> <span style="color:#f0e2c8;">Over an asynchronous network a crashed node and a slow, paused or partitioned one look identical: silence. So detectors only <strong style="color:#ffca28;">suspect</strong>, and every one trades <strong style="color:#ffca28;">detection time</strong> against <strong style="color:#ffca28;">false positives</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Heartbeats:</strong> <span style="color:#f0e2c8;">Nodes send heartbeats; a node silent longer than a <strong style="color:#ffca28;">timeout</strong> is suspected. In my simulation 1,100 ms caught a crash in 0.7 s but falsely suspected a healthy node 6 times; 5,000 ms made no false accusations but took 4.6 s. etcd defaults to 100 ms heartbeats and a 1,000 ms election timeout.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Phi accrual:</strong> <span style="color:#f0e2c8;">Instead of a fixed timeout, compute a suspicion level <strong style="color:#ffca28;">φ</strong> from the observed inter-arrival history and compare it with a threshold. The same φ of 8 meant 1,570 ms of silence on a LAN-like history and 3,850 ms on a jittery one. Cassandra uses this with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">phi_convict_threshold</code> 8.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. SWIM:</strong> <span style="color:#f0e2c8;">At scale, probe one random member per period, use <strong style="color:#ffca28;">indirect pings</strong> through k helpers, mark failures as <strong style="color:#ffca28;">suspect</strong> first and let the node refute with a higher <strong style="color:#ffca28;">incarnation number</strong>; gossip carries the news. Load per member stays constant, at most 14 messages with k=3.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. After detection:</strong> <span style="color:#f0e2c8;">Assume the "dead" node may still run. Use <strong style="color:#ffca28;">leases</strong>, <strong style="color:#ffca28;">fencing tokens</strong> and <strong style="color:#ffca28;">majority</strong> decisions so a wrongly evicted node cannot cause split brain.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you pick the heartbeat interval and timeout?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Heartbeat around the network round-trip time or a bit more; timeout several intervals, longer than the worst GC or stop-the-world pause you measure. Then check the false-positive rate in production and tune. Or use an accrual detector so the threshold adapts per link.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does SWIM use a suspect state instead of declaring death immediately?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because a missed probe may be a slow or briefly paused node. Suspicion gives it a window to refute by gossiping alive with a higher incarnation, which cuts false evictions without slowing detection of real crashes by much.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is a fencing token and why is it needed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A number that increases on every ownership change, such as a Raft term. Storage rejects writes with an older token, so a leader that was paused and replaced cannot overwrite the new leader's data when it wakes up.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Push heartbeats or pull pings?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Push is cheap and simple for a central monitor. Pull (ping and ack) checks the round trip, catches asymmetric links and lets the observer control the rate; SWIM uses pull with indirect pings.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does Kubernetes know a node is gone?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The kubelet on each node renews a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Lease</code> object in the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">kube-node-lease</code> namespace (every 10 s per the Kubernetes node-status docs) and reports status to the API server. The node controller marks the node <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NotReady</code> when updates stop for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node-monitor-grace-period</code> and later evicts its pods. It is a central, lease-based detector.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Crash failure vs partial failure | A node stopping completely vs slow, paused or partly unreachable |
| Asynchronous network | No upper bound on message delay, so crashes and slowness look alike |
| Completeness and accuracy | Every crash eventually suspected vs live nodes not suspected |
| Heartbeat | Periodic "I am alive" message or ping/ack |
| False positive (false suspicion) | Declaring a live node failed |
| Detection time | Delay between a real failure and its detection |
| Phi accrual failure detector | Suspicion level from heartbeat history, compared with a threshold |
| Gossip protocol | Spreading state through random peer exchanges |
| Indirect ping (ping-req) | Asking other members to probe a target for you |
| Incarnation number | Self-incremented counter that lets a node refute suspicion |
| Lease | Time-limited grant a node must keep renewing |
| Split brain | Two nodes acting as the single owner at once |
| Fencing token | Increasing number that makes storage reject a stale owner |

**Conclusion:** Distributed systems detect failures by listening for heartbeats and treating silence as suspicion, because over a real network silence is all a crash looks like, and a pause or a broken link looks the same. Fixed timeouts make the speed-versus-accuracy trade-off explicit, as the run showed with six false alarms at 1.1 s and a 4.6 s detection at 5 s. Phi accrual detectors let each link's own history set the effective timeout, and SWIM adds second opinions through indirect pings, a suspect state that nodes can refute, and gossip that keeps per-member cost constant. Because every detector can still be wrong, the final ingredient is safety after detection: leases, fencing tokens and majority decisions, so a node declared dead by mistake cannot do damage when it wakes up.`,
    examples: [
      {
        label: `Failure detectors: fixed timeouts vs a phi accrual detector, and SWIM indirect probes with suspicion and incarnation numbers`,
        variants: [
          { tech: "node", code: `// Failure detection on a fake clock (ms). Heartbeats every 1000 ms with jitter.
// Node B is alive but has a 3.5 s GC pause at t=20 s; node C crashes at t=29.5 s.
const JIT = [0, 40, -30, 120, 10, -60, 80];
const END = 40000;
function beats(node) {
  const out = [];
  for (let k = 0; k * 1000 < END; k++) {
    const t = k * 1000 + JIT[k % 7];
    if (node === "B" && t >= 20000 && t < 23500) continue; // paused: sends nothing
    if (node === "C" && t >= 29500) break; // crashed
    out.push(t);
  }
  if (node === "B") out.push(23500), out.sort((a, b) => a - b); // first beat after the pause
  return out;
}

function fixedTimeout(arrivals, timeoutMs) { // checked every 100 ms
  let i = 0, last = -Infinity, suspected = false, episodes = 0, firstAt = null;
  for (let now = 0; now <= END; now += 100) {
    while (i < arrivals.length && arrivals[i] <= now) { last = arrivals[i++]; suspected = false; }
    if (!suspected && last > -Infinity && now - last > timeoutMs) { suspected = true; episodes++; if (firstAt === null || now > 29500) firstAt = now; }
  }
  return { episodes, firstAt };
}

console.log("== 1. Fixed timeout: speed vs false positives ==");
console.log("timeout   B (alive) false suspicions   C (crashed at 29.5 s) detected   delay");
for (const T of [1100, 1500, 3000, 5000]) {
  const b = fixedTimeout(beats("B"), T), c = fixedTimeout(beats("C"), T);
  console.log(\`\${String(T).padStart(5)} ms \${String(b.episodes).padStart(26)} \${String(c.firstAt / 1000).padStart(25)} s \${String((c.firstAt - 29500) / 1000).padStart(6)} s\`);
}

// Phi accrual: phi = -log10(P(next heartbeat is later than now)), normal model of intervals.
function erfc(x) { // Numerical Recipes erfcc, fractional error < 1.2e-7
  const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}
function stats(intervals) {
  const mean = intervals.reduce((s, x) => s + x, 0) / intervals.length;
  const sd = Math.sqrt(intervals.reduce((s, x) => s + (x - mean) ** 2, 0) / intervals.length);
  return { mean, sd };
}
const phi = (elapsed, { mean, sd }) => -Math.log10(0.5 * erfc((elapsed - mean) / (sd * Math.SQRT2)));

console.log("\\n== 2. Phi accrual: the same threshold adapts to each network ==");
const nets = [["LAN (jitter x1)", 1], ["cross-region (jitter x5)", 5]];
for (const [name, scale] of nets) {
  const iv = [];
  for (let k = 0; k < 70; k++) iv.push(1000 + scale * (JIT[(k + 1) % 7] - JIT[k % 7]));
  const s = stats(iv);
  const cross = [1, 3, 8].map((th) => { let e = 0; while (phi(e, s) < th) e += 10; return \`phi>=\${th} at \${e} ms\`; });
  console.log(\`\${name.padEnd(25)} mean=\${s.mean.toFixed(0)} sd=\${s.sd.toFixed(1)}  \${cross.join(", ")}\`);
}
const lan = stats(Array.from({ length: 70 }, (_, k) => 1000 + JIT[(k + 1) % 7] - JIT[k % 7]));
console.log(\`LAN phi after silence: \${[1100, 1200, 1300, 1500, 2000].map((e) => \`\${e} ms -> \${Math.min(phi(e, lan), 99).toFixed(2)}\`).join(", ")}\`);

console.log("\\n== 3. SWIM-style probing: indirect pings and suspicion ==");
const reach = (a, b, down, broken) => !down.has(b) && !broken.has(\`\${a}-\${b}\`);
function probe(target, down, broken, helpers) {
  if (reach("A", target, down, broken)) return "ack (direct)";
  const via = helpers.filter((h) => reach("A", h, down, broken) && reach(h, target, down, broken));
  return via.length ? \`ack via \${via.join(",")} (indirect)\` : "no ack";
}
const helpers = ["B", "C", "E"];
let down = new Set(), broken = new Set(["A-D"]);
console.log(\`link A-D drops packets, D is fine. direct-only: \${reach("A", "D", down, broken) ? "alive" : "D marked DEAD (false positive)"}\`);
console.log(\`SWIM, k=3 helpers: A probes D -> \${probe("D", down, broken, helpers)} -> D stays ALIVE\`);

// Membership entries {status, inc}. Merge rule: higher incarnation wins; at equal
// incarnation SUSPECT beats ALIVE; CONFIRM (dead) beats everything.
const rank = { ALIVE: 0, SUSPECT: 1, CONFIRM: 2 };
function merge(cur, msg) {
  if (cur.status === "CONFIRM") return cur;
  if (msg.status === "CONFIRM" || msg.inc > cur.inc || (msg.inc === cur.inc && rank[msg.status] > rank[cur.status])) return msg;
  return cur;
}
const show = (e) => \`\${e.status}/\${e.inc}\`;
down = new Set(["D"]); broken = new Set();
let viewA = { status: "ALIVE", inc: 0 }, viewC = { status: "ALIVE", inc: 0 };
console.log(\`D pauses (GC):     A probes D -> \${probe("D", down, broken, helpers)}\`);
viewA = merge(viewA, { status: "SUSPECT", inc: 0 });
console.log(\`  A marks D \${show(viewA)} and gossips it\`);
down = new Set();
const refute = { status: "ALIVE", inc: 1 }; // D hears the rumour about itself and bumps its incarnation
viewA = merge(viewA, refute); viewC = merge(viewC, refute);
console.log(\`  D resumes, gossips \${show(refute)}: A sees \${show(viewA)}, C sees \${show(viewC)}\`);
viewC = merge(viewC, { status: "SUSPECT", inc: 0 });
console.log(\`  a late SUSPECT/0 reaches C: C keeps \${show(viewC)} (stale rumour ignored)\`);
down = new Set(["D"]);
viewA = merge(viewA, { status: "SUSPECT", inc: 1 });
console.log(\`D crashes:         A probes D -> \${probe("D", down, broken, helpers)} -> A marks \${show(viewA)}\`);
const period = 3; // suspicion timeout: 3 protocol periods pass with no refutation
viewA = merge(viewA, { status: "CONFIRM", inc: 1 });
console.log(\`  no refutation after \${period} periods -> \${show(viewA)} (dead, removed from membership)\`);

console.log("\\nmessages per protocol period (k=3 helpers, worst case every probe goes indirect):");
for (const n of [10, 100, 1000])
  console.log(\`  N=\${String(n).padEnd(5)} all-to-all heartbeats \${String(n * (n - 1)).padStart(7)}   SWIM <= \${String(n * (2 + 4 * 3)).padStart(6)}   (per member: \${n - 1} vs <= \${2 + 4 * 3})\`);` },
          { tech: "python", code: `# Failure detection on a fake clock (ms). Heartbeats every 1000 ms with jitter.
# Node B is alive but has a 3.5 s GC pause at t=20 s; node C crashes at t=29.5 s.
import math

JIT = [0, 40, -30, 120, 10, -60, 80]
END = 40000


def secs(ms):
    return str(ms // 1000) if ms % 1000 == 0 else str(ms / 1000)


def beats(node):
    out = []
    k = 0
    while k * 1000 < END:
        t = k * 1000 + JIT[k % 7]
        k += 1
        if node == "B" and 20000 <= t < 23500:
            continue  # paused: sends nothing
        if node == "C" and t >= 29500:
            break  # crashed
        out.append(t)
    if node == "B":
        out = sorted(out + [23500])  # first beat after the pause
    return out


def fixed_timeout(arrivals, timeout_ms):  # checked every 100 ms
    i, last, suspected, episodes, first_at = 0, None, False, 0, None
    for now in range(0, END + 1, 100):
        while i < len(arrivals) and arrivals[i] <= now:
            last = arrivals[i]
            i += 1
            suspected = False
        if not suspected and last is not None and now - last > timeout_ms:
            suspected = True
            episodes += 1
            if first_at is None or now > 29500:
                first_at = now
    return episodes, first_at


print("== 1. Fixed timeout: speed vs false positives ==")
print("timeout   B (alive) false suspicions   C (crashed at 29.5 s) detected   delay")
for T in (1100, 1500, 3000, 5000):
    b_ep, _ = fixed_timeout(beats("B"), T)
    _, c_at = fixed_timeout(beats("C"), T)
    print(f"{T:>5} ms {b_ep:>26} {secs(c_at):>25} s {secs(c_at - 29500):>6} s")


def erfc(x):  # Numerical Recipes erfcc, fractional error < 1.2e-7
    z = abs(x)
    t = 1 / (1 + 0.5 * z)
    r = t * math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))))
    return r if x >= 0 else 2 - r


def stats(intervals):
    mean = sum(intervals) / len(intervals)
    sd = math.sqrt(sum((x - mean) ** 2 for x in intervals) / len(intervals))
    return mean, sd


def phi(elapsed, s):
    mean, sd = s
    return -math.log10(0.5 * erfc((elapsed - mean) / (sd * math.sqrt(2))))


print("\\n== 2. Phi accrual: the same threshold adapts to each network ==")
for name, scale in (("LAN (jitter x1)", 1), ("cross-region (jitter x5)", 5)):
    iv = [1000 + scale * (JIT[(k + 1) % 7] - JIT[k % 7]) for k in range(70)]
    s = stats(iv)
    cross = []
    for th in (1, 3, 8):
        e = 0
        while phi(e, s) < th:
            e += 10
        cross.append(f"phi>={th} at {e} ms")
    print(f"{name:<25} mean={s[0]:.0f} sd={s[1]:.1f}  {', '.join(cross)}")
lan = stats([1000 + JIT[(k + 1) % 7] - JIT[k % 7] for k in range(70)])
print("LAN phi after silence: " + ", ".join(f"{e} ms -> {min(phi(e, lan), 99):.2f}" for e in (1100, 1200, 1300, 1500, 2000)))

print("\\n== 3. SWIM-style probing: indirect pings and suspicion ==")


def reach(a, b, down, broken):
    return b not in down and f"{a}-{b}" not in broken


def probe(target, down, broken, helpers):
    if reach("A", target, down, broken):
        return "ack (direct)"
    via = [h for h in helpers if reach("A", h, down, broken) and reach(h, target, down, broken)]
    return f"ack via {','.join(via)} (indirect)" if via else "no ack"


helpers = ["B", "C", "E"]
down, broken = set(), {"A-D"}
print(f"link A-D drops packets, D is fine. direct-only: {'alive' if reach('A', 'D', down, broken) else 'D marked DEAD (false positive)'}")
print(f"SWIM, k=3 helpers: A probes D -> {probe('D', down, broken, helpers)} -> D stays ALIVE")

# Membership entries (status, inc). Merge rule: higher incarnation wins; at equal
# incarnation SUSPECT beats ALIVE; CONFIRM (dead) beats everything.
RANK = {"ALIVE": 0, "SUSPECT": 1, "CONFIRM": 2}


def merge(cur, msg):
    if cur[0] == "CONFIRM":
        return cur
    if msg[0] == "CONFIRM" or msg[1] > cur[1] or (msg[1] == cur[1] and RANK[msg[0]] > RANK[cur[0]]):
        return msg
    return cur


def show(e):
    return f"{e[0]}/{e[1]}"


down, broken = {"D"}, set()
view_a, view_c = ("ALIVE", 0), ("ALIVE", 0)
print(f"D pauses (GC):     A probes D -> {probe('D', down, broken, helpers)}")
view_a = merge(view_a, ("SUSPECT", 0))
print(f"  A marks D {show(view_a)} and gossips it")
down = set()
refute = ("ALIVE", 1)  # D hears the rumour about itself and bumps its incarnation
view_a, view_c = merge(view_a, refute), merge(view_c, refute)
print(f"  D resumes, gossips {show(refute)}: A sees {show(view_a)}, C sees {show(view_c)}")
view_c = merge(view_c, ("SUSPECT", 0))
print(f"  a late SUSPECT/0 reaches C: C keeps {show(view_c)} (stale rumour ignored)")
down = {"D"}
view_a = merge(view_a, ("SUSPECT", 1))
print(f"D crashes:         A probes D -> {probe('D', down, broken, helpers)} -> A marks {show(view_a)}")
period = 3  # suspicion timeout: 3 protocol periods pass with no refutation
view_a = merge(view_a, ("CONFIRM", 1))
print(f"  no refutation after {period} periods -> {show(view_a)} (dead, removed from membership)")

print("\\nmessages per protocol period (k=3 helpers, worst case every probe goes indirect):")
for n in (10, 100, 1000):
    print(f"  N={n:<5} all-to-all heartbeats {n * (n - 1):>7}   SWIM <= {n * (2 + 4 * 3):>6}   (per member: {n - 1} vs <= {2 + 4 * 3})")` },
        ],
      },
    ],
  },
];

export default augments;
