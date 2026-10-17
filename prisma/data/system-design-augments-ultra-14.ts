/**
 * SYSTEM DESIGN ULTRA — batch 14: Classic designs I. Every example was run by
 * scripts/verify-variant-examples.ts (node, python, go, java); quoted output is that run's output.
 */
import type { SystemDesignUltraAugment } from "./system-design-augments.types";

const augments: SystemDesignUltraAugment[] = [
  {
    title: `Design a URL shortener (TinyURL)`,
    difficulty: "hard",
    seoDescription: `Design a URL shortener end to end: requirements, capacity math, API, data model and key generation with base62, counter ranges and hash collisions.`,
    description: `**Question presented to candidate:**
"Let us design something like TinyURL. A user pastes a long URL and gets back a short link such as \`tiny.example/15FTGg\`; anyone who opens the short link is redirected to the original. Walk me through the requirements, the numbers, the API, the storage, and especially how you generate the short codes."

**What a strong answer should cover:**
- Functional and non-functional requirements, and a worked capacity estimate (writes per second, reads per second, rows and storage over 5 years, and the code length that follows from it)
- A small API (create, redirect, optional custom alias and expiry) and a data model keyed by the short code, with the store chosen for single-key lookups
- **Key generation** trade-offs: a counter encoded in **base62** (unique by construction, needs coordination, guessable), **leased ID ranges** so app servers rarely talk to the counter, and **hashing the URL** (no coordination but **collisions** that need a check and retry)
- Redirect semantics: **301 vs 302** (and 307/308), and why most shorteners use a temporary redirect when they want click analytics
- Custom aliases, expiry, deletion and abuse (enumeration of sequential codes, malicious destinations)

**Clarifying questions expected:**
- How many new links per month, and what is the read to write ratio?
- Do we need custom aliases, expiry, editing of the destination, or click analytics?
- Must codes be unguessable, or is short and unique enough?

**Code / implementation expected:** Optional — base62 encoding of a unique ID, or the collision math of hashing; the example does both with real numbers.`,
    answer: `**Target Audience:** Anyone preparing for a first system design round; no prior knowledge of databases or hashing is assumed, and every term is defined when it first appears.
**Difficulty:** Hard
**Verified with:** Node 22.22, Python 3.12, Go 1.24 and Java 21 (all four print identical output). HTTP redirect semantics checked against RFC 9110 in October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All numbers in the capacity estimate and the key generation section come from the example program; the **Verified** section quotes its full output. This page is about the core design and key generation; serving billions of redirects fast is the subject of the sibling question [How would you design a URL shortener like TinyURL?](/interview-question/how-would-you-design-a-url-shortener-like-tinyurl).

## 1. Why This Even Matters — A Story First

Imagine a cloakroom at a busy theatre. You hand over a bulky coat and get back a small numbered ticket. Later, anyone holding that ticket gets that coat back. Three things make the cloakroom work:

1. **Tickets never repeat.** If two coats got ticket 57, someone goes home with the wrong coat.
2. **Tickets are short.** A ticket with a 40-digit number would defeat the purpose.
3. **Handing out tickets is fast**, even when ten attendants are working at once and none of them wants to shout across the room to ask "which number is next?".

A URL shortener is that cloakroom. The coat is the long URL, the ticket is the short code, and the interview is mostly about rule 1 and rule 3 at the same time: how do many servers hand out short, never-repeating codes without slowing each other down?

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How many new links per month, and how many redirects per link? | Sets writes per second, reads per second and storage; the read to write ratio decides where the effort goes |
| How long must links live? Forever, or with expiry? | Decides total rows (and so code length) and whether you need a cleanup job |
| Custom aliases (\`tiny.example/my-launch\`)? | Needs a uniqueness check on a user-chosen key, separate from generated codes |
| Must codes be unguessable? | Sequential codes let anyone walk through every link; private links need random codes |
| Can the owner change the destination later? | Rules out permanent browser-cached redirects (see section 9) |
| Do we need click analytics? | Every click must reach our servers, which changes the redirect status code and adds an event pipeline |

## 3. Requirements

**Functional**

- Create: given a long URL, return a short code; optionally accept a custom alias and an expiry time.
- Redirect: \`GET /{code}\` sends the browser to the long URL.
- Owners can delete a link; expired links stop redirecting.

**Non-functional**

- Very read-heavy: assume **100 redirects per created link**.
- Redirect latency in the low milliseconds at the server; high availability for redirects (a dead short link breaks every page that embeds it).
- Codes are unique forever and as short as possible.
- Creates may be slightly slower and can tolerate brief unavailability; redirects cannot.

## 4. Capacity Estimate

Assumptions, stated so the interviewer can change them: 100 million new links per month, 100 reads per write, links kept for 5 years, about 500 bytes per row (long URL, code, owner, timestamps), and a 5x peak over the average. The example program does the arithmetic:

| Quantity | Calculation | Result |
| :--- | :--- | ---: |
| Writes per second (average) | 100,000,000 / (30 x 86,400), rounded up | 39 |
| Reads per second (average) | 39 x 100 | 3,900 |
| Reads per second (peak) | 3,900 x 5 | 19,500 |
| Rows after 5 years | 100,000,000 x 12 x 5 | 6,000,000,000 |
| Storage | 6,000,000,000 x 500 B | 3 TB |
| Codes of length 6 | 62^6 | 56,800,235,584 (enough) |
| Codes of length 7 | 62^7 | 3,521,614,606,208 |

What the numbers tell you:

- **Writes are tiny.** 39 per second fits on one database; the write path is not where scale hurts.
- **Reads are the load**, and a 19,500 per second peak is a caching problem, covered in the sibling question.
- **3 TB is small** by modern standards, but large enough that you want the store to shard by code later.
- **Length 6 is enough for 5 years** (56.8 billion codes against 6 billion rows); most designs pick **7** so the space lasts for decades and so random codes (section 7.3) are hard to guess.

📌 **Interview term: read to write ratio** — how many reads the system serves per write. At 100:1 you optimise the read path (caches, replicas) and keep the write path simple.

## 5. API

~~~http
POST /api/links          body: { "url": "https://...", "alias": "my-launch", "expiresAt": "2027-01-01T00:00:00Z" }
                         -> 201 { "code": "15FTGg", "shortUrl": "https://tiny.example/15FTGg" }
                         -> 409 if the alias is taken, 400 if the URL is invalid or blocked
GET  /{code}             -> 302 Location: https://...      (404 if unknown, 410 if expired or deleted)
DELETE /api/links/{code} -> 204 (owner only)
~~~

Keep the redirect endpoint at the root of a short domain, with no \`/api/\` prefix: every character in the short URL counts.

📌 **Interview term: idempotent create** — calling create twice with the same input returns the same result instead of making two links. Shorteners usually do not promise this for anonymous users (two people shortening the same URL can get different codes), but a client retry should not create duplicates, so accept an \`Idempotency-Key\` header on \`POST\`. See [idempotency](/interview-question/what-is-idempotency-and-why-does-it-matter).

## 6. Data Model

One table, keyed by the code:

| Column | Type | Note |
| :--- | :--- | :--- |
| \`code\` | string, primary key | 6-7 base62 characters, or a custom alias |
| \`long_url\` | text | up to a few KB; validate and normalise on create |
| \`owner_id\` | id, nullable | anonymous links allowed |
| \`created_at\`, \`expires_at\` | timestamps | \`expires_at\` nullable |
| \`is_custom\` | boolean | aliases live in the same key space |

Every redirect is a **single-key lookup** by \`code\`, and there are no joins on the hot path. That fits a key-value store (DynamoDB, Cassandra) or a relational database sharded by \`code\`; both work, and the choice usually follows what the team already runs. See [SQL vs NoSQL](/interview-question/when-would-you-choose-sql-vs-nosql) and [sharding](/interview-question/what-is-database-sharding).

A secondary index on \`owner_id\` serves "list my links"; an index on \`expires_at\` lets a background job find expired rows.

📌 **Interview term: key-value store** — a database whose main operation is "get the value for this key" and "put a value under this key", which it can spread across many machines by key.

## 7. High-Level Architecture

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="Create path: client to API servers, which lease ID ranges from a counter service and write to the link store. Redirect path: client to API servers, cache, then link store">
  <defs>
    <marker id="sd14q1-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="130" width="120" height="70" rx="10"/>
  <text class="d-text" x="80" y="162" text-anchor="middle">client</text>
  <text class="d-sub" x="80" y="184" text-anchor="middle">browser or app</text>
  <rect class="d-box-accent" x="220" y="130" width="150" height="70" rx="10"/>
  <text class="d-text" x="295" y="162" text-anchor="middle">API servers</text>
  <text class="d-sub" x="295" y="184" text-anchor="middle">stateless</text>
  <line class="d-edge" x1="140" y1="165" x2="216" y2="165" marker-end="url(#sd14q1-arrow)"/>
  <rect class="d-box" x="220" y="20" width="150" height="60" rx="10"/>
  <text class="d-text" x="295" y="46" text-anchor="middle">counter service</text>
  <text class="d-sub" x="295" y="66" text-anchor="middle">leases ID ranges</text>
  <line class="d-edge-dashed" x1="295" y1="126" x2="295" y2="84" marker-end="url(#sd14q1-arrow)"/>
  <rect class="d-box" x="450" y="130" width="120" height="70" rx="10"/>
  <text class="d-text" x="510" y="162" text-anchor="middle">cache</text>
  <text class="d-sub" x="510" y="184" text-anchor="middle">hot codes</text>
  <line class="d-edge" x1="370" y1="165" x2="446" y2="165" marker-end="url(#sd14q1-arrow)"/>
  <rect class="d-box-muted" x="620" y="130" width="120" height="70" rx="10"/>
  <text class="d-text" x="680" y="162" text-anchor="middle">link store</text>
  <text class="d-sub" x="680" y="184" text-anchor="middle">code to URL</text>
  <line class="d-edge-dashed" x1="570" y1="165" x2="616" y2="165" marker-end="url(#sd14q1-arrow)"/>
  <rect class="d-box" x="450" y="250" width="290" height="56" rx="10"/>
  <text class="d-text" x="595" y="283" text-anchor="middle">create writes go straight to the store</text>
  <line class="d-edge-accent" x1="330" y1="200" x2="446" y2="270" marker-end="url(#sd14q1-arrow)"/>
</svg>

A create asks the API server for a code (from its leased range), writes the row to the store, and returns. A redirect checks the cache and falls back to the store.

- **API servers** are stateless, so you add more behind a [load balancer](/interview-question/what-is-a-load-balancer-and-what-strategies-does-it-use) as traffic grows.
- **Counter service** hands each API server a block of IDs; it is consulted once per block, not once per link (section 8.2).
- **Cache** in front of the store absorbs most redirects; sizing it and protecting it from a viral link is in the sibling question.
- **Link store** holds the code to URL mapping, replicated for durability and read throughput.

## 8. Deep Dive: Generating the Short Code

This is the heart of the question. There are three families of approach.

### 8.1 A unique number, written in base62

Give every new link a unique integer ID, then write that integer using 62 symbols (\`0-9\`, \`a-z\`, \`A-Z\`) instead of 10. Base62 is just a bigger alphabet for the same number: the ID 1,000,000,000 is ten decimal digits but six base62 characters, \`15FTGg\`.

📌 **Interview term: base62 encoding** — writing an integer in base 62 with the characters \`0-9a-zA-Z\`. It is URL-safe (no \`+\`, \`/\` or \`=\` as in base64) and reversible: decoding the code gives the ID back.

~~~js
function encode(n) {
  if (n === 0) return "0";
  let s = "";
  while (n > 0) { s = ALPHABET[n % 62] + s; n = Math.floor(n / 62); }
  return s;
}
~~~

From the run: \`61 -> Z\`, \`62 -> 10\`, \`3843 -> ZZ\` (the largest 2-character code is 62^2 - 1), \`56800235583 -> ZZZZZZ\` (the last 6-character code) and \`3521614606207 -> ZZZZZZZ\` (the last 7-character code). Every encoded value decoded back to the same ID.

Why it is attractive: **no collisions by construction**, because two different IDs always encode to two different codes. The cost is that something must hand out unique IDs, and sequential IDs give **sequential codes**: \`15FTGg\` is followed by \`15FTGh\`, so anyone can enumerate links.

📌 **Interview term: enumeration attack** — guessing valid identifiers by walking through a predictable sequence. With sequential codes an attacker can list every link ever created, including ones the owner thought were private.

### 8.2 Leasing ID ranges so servers do not coordinate per link

A single counter (one database row incremented per create) is a bottleneck and a single point of failure. Instead, each API server **leases a range** of 1,000 IDs from the counter service and issues codes from it locally. The run:

~~~text
app-a range [1000000000, 1000001000) issued 15FTGg 15FTGh
app-b range [1000001000, 1000002000) issued 15FTWo 15FTWp 15FTWq
app-c range [1000002000, 1000003000) issued 15FUcw 15FUcx
app-b crashes: 997 ids of its range are never used (gap, not a duplicate)
app-b restarts with range [1000003000, 1000004000) first code 15FUsE
~~~

Two properties to say out loud:

- **One round trip per 1,000 codes**: 1,000,000 codes cost 1,000 counter calls, so the counter can be a small, strongly consistent service (a database row with a transaction, or a key in a consensus store such as etcd or ZooKeeper).
- **A crash wastes IDs but never duplicates them.** app-b lost 997 IDs; with 3.5 trillion 7-character codes, losing a few thousand per crash is irrelevant. What must never happen is two servers getting the same range, which is why the lease itself is a strongly consistent operation.

📌 **Interview term: range allocation (ticket server)** — handing out blocks of unique IDs from a central counter so callers can generate IDs locally. Flickr described dedicated MySQL "ticket servers" that hand out globally unique integer IDs (Flickr engineering blog, "Ticket Servers: Distributed Unique Primary Keys on the Cheap", February 2010); leasing a range instead of one ID per call is the same idea with far fewer round trips.

Other ways to get unique IDs without a central counter (time-based Snowflake-style IDs, for example) are the topic of [designing a unique ID generator](/interview-question/how-would-you-design-a-unique-id-generator-at-scale-5739). A 64-bit Snowflake ID encodes to about 11 base62 characters, which is longer than a counter needs, so shorteners usually prefer a counter or random codes.

**Hiding the sequence.** If guessability matters, either use random codes (8.3) or scramble the ID with a reversible permutation before encoding (for example multiply by a large number coprime to 62^7, modulo 62^7). Scrambling hides the order from casual eyes but is not cryptographic: someone who knows the scheme can reverse it.

### 8.3 Hashing (or random codes) with a collision check

Take a hash of the long URL (MD5, SHA-256), turn the first bytes into a number, and keep the first k base62 characters. No counter is needed and the same URL always yields the same code, which deduplicates repeat submissions for free. The catch is **collisions**: two different URLs can land on the same k-character code.

📌 **Interview term: birthday paradox** — with n items placed randomly into M slots, the expected number of colliding pairs is about n(n-1) / 2M. Collisions show up far earlier than intuition suggests.

The example hashed 200,000 URLs:

~~~text
k=5: 200000 urls, collisions 23 (birthday estimate 21.83)
  first: https://example.com/page/19656 and https://example.com/page/53436 -> H5KkS
k=7: 200000 urls, collisions 0 (birthday estimate 0.01)
~~~

With 5 characters (916 million slots) the run saw 23 real collisions, close to the formula's 21.83. With 7 characters the estimate for 200,000 URLs is 0.01. But apply the same formula to the design target of 6 billion rows in 3.5 trillion slots and the expected number of colliding pairs is about 5.1 million: collisions are not rare at scale, so **every insert must be conditional**.

The safe write is "insert if the code does not exist" (a conditional put, or a unique-key constraint), and on conflict append a salt and rehash, which is what the program does (\`url + "#" + salt\`). Random codes (generate 7 random base62 characters, insert if absent) work the same way and are the standard answer when codes must be unguessable.

### 8.4 Choosing

| Approach | Collisions | Coordination | Guessable | Same URL, same code | Typical use |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Counter + base62 | none | lease a range per 1,000 IDs | yes, sequential | no (unless you look up first) | public links, shortest codes |
| Counter + scramble + base62 | none | same | not obviously | no | public links that should not look sequential |
| Hash prefix + retry | yes, check on insert | none | no | yes | deduplicating repeat submissions |
| Random code + retry | yes, check on insert | none | no | no | private or unlisted links |

A defensible default: **leased counter ranges with base62 for public links**, and **random 7-8 character codes with a conditional insert** where links must not be guessable.

## 9. Redirect Semantics: 301, 302, 307, 308

📌 **Interview term: 301 vs 302** — both send the browser to the \`Location\` header. 301 means "moved permanently" and 302 means "found, temporarily elsewhere". RFC 9110 lists 301 and 308 among the status codes that are **heuristically cacheable**, so a browser or proxy may reuse a 301 without asking again; 302 and 307 are cached only when explicit \`Cache-Control\` headers allow it.

What that means for a shortener:

- **302 (or 307)**: every click reaches your servers, so you can count clicks, honour expiry and deletion immediately, and let owners change the destination.
- **301 (or 308)**: browsers may skip you after the first click, which saves load but loses analytics and makes edits, expiry and abuse takedowns unreliable for anyone who already clicked.
- 307 and 308 differ from 302 and 301 only in that the client must keep the HTTP method (a \`POST\` stays a \`POST\`). For links opened in a browser with \`GET\`, the pair choice is really "temporary or permanent".

The sibling question measures the effect: in its simulation 1,000 browsers clicking 5 times each produced 1,000 server hits under 301 and 5,000 under 302.

## 10. Custom Aliases, Expiry and Abuse

- **Custom aliases** share the code key space. Insert with the same conditional write (409 on conflict), and reserve words your routes use (\`api\`, \`login\`). Keep generated codes from colliding with aliases by making them a different length, or by checking both.
- **Expiry**: store \`expires_at\`; the redirect path checks it (return 410 Gone), and a background job deletes or archives expired rows using the index. Do not rely on the cleanup job for correctness; it may run hours late.
- **Reusing expired codes** is tempting and usually wrong: old printed or embedded links would suddenly point at someone else's content.
- **Abuse**: shorteners are used to hide phishing and malware destinations. Check new URLs against a blocklist or a reputation service, rate-limit anonymous creates per IP (see [designing a rate limiter](/interview-question/how-would-you-design-a-rate-limiter)), and keep a takedown path that also purges caches.

## 11. What Breaks First at 10x

| At 1 billion new links per month | Fix |
| :--- | :--- |
| Redirect peak near 193,000 per second (386 writes per second x 100 x 5) | Caching layers and a CDN; see the sibling question |
| 30 TB over 5 years | Shard the store by \`code\` (hash partitioning spreads codes evenly) |
| Counter calls are still tiny (386 IDs per second is one lease every 2.6 s) | Nothing to fix; the counter is not the bottleneck, which is the point of leasing |
| More abuse | Asynchronous URL scanning, per-account quotas |

## 12. Verified: Running the Code

What the program does: it computes the capacity table, encodes and decodes sample IDs in base62, simulates a counter service leasing ranges of 1,000 IDs to three app servers (one of which crashes), and hashes 200,000 synthetic URLs with MD5 to count collisions at code lengths 5 and 7, retrying with a salt on each collision. A Map stands in for the link store's conditional insert; it leaves out the network, persistence and concurrency of a real counter.

Full output (identical in Node, Python, Go and Java):

~~~text
== capacity estimate ==
writes/s avg: 39, reads/s avg: 3900, reads/s peak (x5): 19500
rows after 5 years: 6000000000, storage: 3 TB
length 5: 916132832 codes, fits 5y: no
length 6: 56800235584 codes, fits 5y: yes
length 7: 3521614606208 codes, fits 5y: yes
length 8: 218340105584896 codes, fits 5y: yes
== base62 ==
0 -> 0 -> 0
61 -> Z -> 61
62 -> 10 -> 62
3843 -> ZZ -> 3843
1000000000 -> 15FTGg -> 1000000000
56800235583 -> ZZZZZZ -> 56800235583
3521614606207 -> ZZZZZZZ -> 3521614606207
== counter service hands out ranges of 1000 ==
app-a range [1000000000, 1000001000) issued 15FTGg 15FTGh
app-b range [1000001000, 1000002000) issued 15FTWo 15FTWp 15FTWq
app-c range [1000002000, 1000003000) issued 15FUcw 15FUcx
app-b crashes: 997 ids of its range are never used (gap, not a duplicate)
app-b restarts with range [1000003000, 1000004000) first code 15FUsE
counter round trips for 1,000,000 codes: 1000
== hash prefix instead of a counter ==
k=5: 200000 urls, collisions 23 (birthday estimate 21.83)
  first: https://example.com/page/19656 and https://example.com/page/53436 -> H5KkS
k=7: 200000 urls, collisions 0 (birthday estimate 0.01)
same url hashed twice: 8hGRpjS 8hGRpjS
~~~

## 13. Edge Cases Worth Knowing

- **Normalise before hashing.** \`HTTP://Example.com\` and \`http://example.com/\` are the same page; normalise scheme and host case before hashing if you want deduplication.
- **Very long URLs.** Cap the input (a few KB) so one request cannot store megabytes.
- **Loops.** A short link pointing at another short link (or itself) can loop; refuse destinations on your own domain.
- **Counter failover.** If the counter service fails over to a replica that missed the last lease, it could hand out a range twice. Keep the counter strongly consistent (a single primary with synchronous replication, or a consensus store).
- **Case sensitivity.** Base62 uses both cases, so \`abc\` and \`ABC\` are different codes; some users retype links in lowercase. That is a known cost of a 62-symbol alphabet.

## Common Pitfalls

- **Hashing without a collision check.** At 6 billion rows in a 7-character space the birthday estimate is about 5.1 million colliding pairs; an unconditional write silently overwrites someone else's link.
- **One global counter row incremented per create.** It works at 39 writes per second but becomes the bottleneck and single point of failure; lease ranges.
- **Choosing 301 by default.** It breaks analytics, edits and takedowns for anyone whose browser cached it.
- **Sequential codes for private links.** Anyone can enumerate them; use random codes for anything not meant to be public.
- **Forgetting the read to write ratio.** Spending the interview on the write path when 99% of traffic is redirects.
- **Reusing expired codes.** Old links then lead to strangers' content.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify and size:</strong> <span style="color:#f0e2c8;">I would ask volume, link lifetime, custom aliases and whether codes must be unguessable. With 100 million links a month and 100 reads per write: 39 writes per second, 3,900 reads per second on average and 19,500 at peak, 6 billion rows and 3 TB over 5 years.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Code length:</strong> <span style="color:#f0e2c8;">62^6 is 56.8 billion, which already covers 6 billion rows; I pick 7 characters, 3.5 trillion codes, so the space lasts decades and random codes are hard to guess.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. API and data:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">POST /api/links</code> returns a code; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GET /{code}</code> returns a 302 to the long URL. One table keyed by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">code</code>, every redirect a single-key lookup, so a key-value store or a relational database sharded by code.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Key generation:</strong> <span style="color:#f0e2c8;">Default: a unique ID in <strong style="color:#ffca28;">base62</strong>, with each API server <strong style="color:#ffca28;">leasing ranges</strong> of 1,000 IDs, so a million codes cost a thousand counter calls and a crash only leaves gaps. For private links, random 7-8 character codes with a conditional insert, because hashing or random codes collide: 23 collisions for 200,000 URLs at 5 characters in my run.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Redirects and the rest:</strong> <span style="color:#f0e2c8;">302 so every click reaches us for analytics, expiry and takedowns; 301 would let browsers cache it. Then aliases, expiry with 410 Gone, abuse checks and a rate limit on creates. Reads dominate, so the next step is caching, which I can go into.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just hash the URL with MD5 and take 7 characters?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It works only with a collision check. By the birthday estimate n(n-1)/2M, 6 billion links in 3.5 trillion slots give about 5.1 million colliding pairs, so every insert must be "insert if absent" and retry with a salt. Its real advantage is that the same URL gets the same code without a lookup.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the counter service goes down?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Creates keep working until each API server exhausts its current range, because codes are issued locally. Redirects do not depend on the counter at all. To make the counter itself available, run it on a strongly consistent replicated store and lease larger ranges so outages are bridged longer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you stop people enumerating links?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sequential base62 codes are enumerable. Use random codes with a conditional insert for private links, or scramble IDs with a reversible permutation if you only want them not to look sequential; and rate-limit 404s per client so scanning is slow.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should two users shortening the same URL get the same code?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually no: links carry per-owner data (analytics, expiry, ability to delete). Deduplicating needs an index from long URL to code, which is a second large index for little gain. Hash-based codes give it for free if the product wants it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where do custom aliases live?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In the same key space, with the same conditional insert returning 409 if taken. Reserve route words, and make sure generated codes cannot collide with aliases, for example by giving aliases a minimum length that generated codes never reach or by checking both on insert.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Read to write ratio | Reads served per write; 100:1 here, so the read path dominates |
| Idempotent create | Repeating a create returns the same result instead of duplicating |
| Key-value store | A database built around get and put by key, spread across machines by key |
| Base62 encoding | Writing an integer with the 62 characters 0-9a-zA-Z; reversible and URL-safe |
| Enumeration attack | Guessing valid IDs by walking a predictable sequence |
| Range allocation (ticket server) | Handing out blocks of unique IDs so callers generate IDs locally |
| Birthday paradox | n random items in M slots give about n(n-1)/2M colliding pairs |
| 301 vs 302 | Permanent (heuristically cacheable) vs temporary (not cached by default) redirect |

**Conclusion:** A URL shortener is a tiny key-value lookup wrapped around one hard question: how to hand out short codes that never repeat without making servers wait on each other. The numbers (39 writes per second, 19,500 reads per second at peak, 6 billion rows, 3 TB) say writes are easy and reads are the load. A unique ID in base62 with leased ranges gives collision-free 6-7 character codes with one counter call per thousand links; hashing and random codes avoid the counter but collide (23 times for 200,000 URLs at 5 characters in the run), so they need a conditional insert. Choose 302 so clicks stay visible, handle aliases, expiry and abuse, and then move on to scaling the read path.`,
    examples: [
      {
        label: `Key generation for a URL shortener: capacity, base62, leased counter ranges and hash-prefix collisions`,
        variants: [
          { tech: "node", code: `// URL shortener key generation: capacity, base62, counter ranges, hash-prefix collisions.
const crypto = require("crypto");
const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function encode(n) {
  if (n === 0) return "0";
  let s = "";
  while (n > 0) { s = ALPHABET[n % 62] + s; n = Math.floor(n / 62); }
  return s;
}
function decode(s) {
  let n = 0;
  for (const c of s) n = n * 62 + ALPHABET.indexOf(c);
  return n;
}

console.log("== capacity estimate ==");
const perMonth = 100000000, readsPerWrite = 100, years = 5, bytesPerRow = 500;
const secPerMonth = 30 * 86400;
const writesPerSec = Math.ceil(perMonth / secPerMonth);
console.log("writes/s avg: " + writesPerSec + ", reads/s avg: " + writesPerSec * readsPerWrite + ", reads/s peak (x5): " + writesPerSec * readsPerWrite * 5);
const total = perMonth * 12 * years;
console.log("rows after " + years + " years: " + total + ", storage: " + (total * bytesPerRow) / 1000000000000 + " TB");
for (let k = 5; k <= 8; k++) {
  const space = 62 ** k;
  console.log("length " + k + ": " + space + " codes, fits " + years + "y: " + (space >= total ? "yes" : "no"));
}

console.log("== base62 ==");
for (const id of [0, 61, 62, 3843, 1000000000, 56800235583, 3521614606207]) {
  const c = encode(id);
  console.log(id + " -> " + c + " -> " + decode(c));
}

console.log("== counter service hands out ranges of 1000 ==");
class Counter {
  constructor() { this.next = 1000000000; }
  lease(size) { const start = this.next; this.next += size; return [start, start + size]; }
}
const counter = new Counter();
const servers = ["app-a", "app-b", "app-c"].map((name) => ({ name, range: counter.lease(1000), used: 0 }));
for (const s of servers) {
  const n = s.name === "app-b" ? 3 : 2;
  const codes = [];
  for (let i = 0; i < n; i++) { codes.push(encode(s.range[0] + s.used)); s.used++; }
  console.log(s.name + " range [" + s.range[0] + ", " + s.range[1] + ") issued " + codes.join(" "));
}
const crashed = servers[1];
console.log(crashed.name + " crashes: " + (1000 - crashed.used) + " ids of its range are never used (gap, not a duplicate)");
const fresh = counter.lease(1000);
console.log(crashed.name + " restarts with range [" + fresh[0] + ", " + fresh[1] + ") first code " + encode(fresh[0]));
console.log("counter round trips for 1,000,000 codes: " + 1000000 / 1000);

console.log("== hash prefix instead of a counter ==");
function hashCode(url, k) {
  const h = crypto.createHash("md5").update(url).digest();
  let n = 0;
  for (let i = 0; i < 6; i++) n = n * 256 + h[i];
  return encode(n % 62 ** k).padStart(k, "0");
}
const N = 200000;
for (const k of [5, 7]) {
  const seen = new Map();
  let collisions = 0, first = "";
  for (let i = 0; i < N; i++) {
    const url = "https://example.com/page/" + i;
    let code = hashCode(url, k), salt = 0;
    while (seen.has(code)) {
      if (salt === 0) { collisions++; if (!first) first = seen.get(code) + " and " + url + " -> " + code; }
      salt++;
      code = hashCode(url + "#" + salt, k);
    }
    seen.set(code, url);
  }
  const space = 62 ** k;
  const expected = ((N * (N - 1)) / 2 / space).toFixed(2);
  console.log("k=" + k + ": " + N + " urls, collisions " + collisions + " (birthday estimate " + expected + ")");
  if (first) console.log("  first: " + first);
}
console.log("same url hashed twice: " + hashCode("https://example.com/a", 7) + " " + hashCode("https://example.com/a", 7));` },
          { tech: "python", code: `# URL shortener key generation: capacity, base62, counter ranges, hash-prefix collisions.
import hashlib
import math

ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"


def encode(n):
    if n == 0:
        return "0"
    s = ""
    while n > 0:
        s = ALPHABET[n % 62] + s
        n //= 62
    return s


def decode(s):
    n = 0
    for c in s:
        n = n * 62 + ALPHABET.index(c)
    return n


print("== capacity estimate ==")
per_month, reads_per_write, years, bytes_per_row = 100000000, 100, 5, 500
sec_per_month = 30 * 86400
writes_per_sec = math.ceil(per_month / sec_per_month)
print(f"writes/s avg: {writes_per_sec}, reads/s avg: {writes_per_sec * reads_per_write}, reads/s peak (x5): {writes_per_sec * reads_per_write * 5}")
total = per_month * 12 * years
print(f"rows after {years} years: {total}, storage: {total * bytes_per_row // 1000000000000} TB")
for k in range(5, 9):
    space = 62 ** k
    print(f"length {k}: {space} codes, fits {years}y: {'yes' if space >= total else 'no'}")

print("== base62 ==")
for i in [0, 61, 62, 3843, 1000000000, 56800235583, 3521614606207]:
    c = encode(i)
    print(f"{i} -> {c} -> {decode(c)}")

print("== counter service hands out ranges of 1000 ==")


class Counter:
    def __init__(self):
        self.next = 1000000000

    def lease(self, size):
        start = self.next
        self.next += size
        return (start, start + size)


counter = Counter()
servers = [{"name": n, "range": counter.lease(1000), "used": 0} for n in ["app-a", "app-b", "app-c"]]
for s in servers:
    n = 3 if s["name"] == "app-b" else 2
    codes = []
    for _ in range(n):
        codes.append(encode(s["range"][0] + s["used"]))
        s["used"] += 1
    print(f"{s['name']} range [{s['range'][0]}, {s['range'][1]}) issued {' '.join(codes)}")
crashed = servers[1]
print(f"{crashed['name']} crashes: {1000 - crashed['used']} ids of its range are never used (gap, not a duplicate)")
fresh = counter.lease(1000)
print(f"{crashed['name']} restarts with range [{fresh[0]}, {fresh[1]}) first code {encode(fresh[0])}")
print(f"counter round trips for 1,000,000 codes: {1000000 // 1000}")

print("== hash prefix instead of a counter ==")


def hash_code(url, k):
    h = hashlib.md5(url.encode()).digest()
    n = int.from_bytes(h[:6], "big")
    return encode(n % 62 ** k).rjust(k, "0")


N = 200000
for k in [5, 7]:
    seen = {}
    collisions, first = 0, ""
    for i in range(N):
        url = f"https://example.com/page/{i}"
        code, salt = hash_code(url, k), 0
        while code in seen:
            if salt == 0:
                collisions += 1
                if not first:
                    first = f"{seen[code]} and {url} -> {code}"
            salt += 1
            code = hash_code(f"{url}#{salt}", k)
        seen[code] = url
    space = 62 ** k
    expected = N * (N - 1) / 2 / space
    print(f"k={k}: {N} urls, collisions {collisions} (birthday estimate {expected:.2f})")
    if first:
        print(f"  first: {first}")
print(f"same url hashed twice: {hash_code('https://example.com/a', 7)} {hash_code('https://example.com/a', 7)}")` },
          { tech: "go", code: `// URL shortener key generation: capacity, base62, counter ranges, hash-prefix collisions.
package main

import (
	"crypto/md5"
	"fmt"
	"strings"
)

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

func encode(n int64) string {
	if n == 0 {
		return "0"
	}
	s := ""
	for n > 0 {
		s = string(alphabet[n%62]) + s
		n /= 62
	}
	return s
}

func decode(s string) int64 {
	var n int64
	for _, c := range s {
		n = n*62 + int64(strings.IndexRune(alphabet, c))
	}
	return n
}

func pow62(k int) int64 {
	p := int64(1)
	for i := 0; i < k; i++ {
		p *= 62
	}
	return p
}

type server struct {
	name       string
	start, end int64
	used       int64
}

func hashCode(url string, k int) string {
	h := md5.Sum([]byte(url))
	var n int64
	for i := 0; i < 6; i++ {
		n = n*256 + int64(h[i])
	}
	c := encode(n % pow62(k))
	for len(c) < k {
		c = "0" + c
	}
	return c
}

func main() {
	fmt.Println("== capacity estimate ==")
	var perMonth, readsPerWrite, years, bytesPerRow int64 = 100000000, 100, 5, 500
	secPerMonth := int64(30 * 86400)
	writesPerSec := (perMonth + secPerMonth - 1) / secPerMonth
	fmt.Printf("writes/s avg: %d, reads/s avg: %d, reads/s peak (x5): %d\\n", writesPerSec, writesPerSec*readsPerWrite, writesPerSec*readsPerWrite*5)
	total := perMonth * 12 * years
	fmt.Printf("rows after %d years: %d, storage: %d TB\\n", years, total, total*bytesPerRow/1000000000000)
	for k := 5; k <= 8; k++ {
		space := pow62(k)
		fits := "no"
		if space >= total {
			fits = "yes"
		}
		fmt.Printf("length %d: %d codes, fits %dy: %s\\n", k, space, years, fits)
	}

	fmt.Println("== base62 ==")
	for _, id := range []int64{0, 61, 62, 3843, 1000000000, 56800235583, 3521614606207} {
		c := encode(id)
		fmt.Printf("%d -> %s -> %d\\n", id, c, decode(c))
	}

	fmt.Println("== counter service hands out ranges of 1000 ==")
	next := int64(1000000000)
	lease := func(size int64) (int64, int64) { s := next; next += size; return s, s + size }
	servers := []*server{}
	for _, name := range []string{"app-a", "app-b", "app-c"} {
		s, e := lease(1000)
		servers = append(servers, &server{name: name, start: s, end: e})
	}
	for _, s := range servers {
		n := 2
		if s.name == "app-b" {
			n = 3
		}
		codes := []string{}
		for i := 0; i < n; i++ {
			codes = append(codes, encode(s.start+s.used))
			s.used++
		}
		fmt.Printf("%s range [%d, %d) issued %s\\n", s.name, s.start, s.end, strings.Join(codes, " "))
	}
	crashed := servers[1]
	fmt.Printf("%s crashes: %d ids of its range are never used (gap, not a duplicate)\\n", crashed.name, 1000-crashed.used)
	fs, fe := lease(1000)
	fmt.Printf("%s restarts with range [%d, %d) first code %s\\n", crashed.name, fs, fe, encode(fs))
	fmt.Printf("counter round trips for 1,000,000 codes: %d\\n", 1000000/1000)

	fmt.Println("== hash prefix instead of a counter ==")
	N := 200000
	for _, k := range []int{5, 7} {
		seen := map[string]string{}
		collisions, first := 0, ""
		for i := 0; i < N; i++ {
			url := fmt.Sprintf("https://example.com/page/%d", i)
			code, salt := hashCode(url, k), 0
			for {
				prev, ok := seen[code]
				if !ok {
					break
				}
				if salt == 0 {
					collisions++
					if first == "" {
						first = prev + " and " + url + " -> " + code
					}
				}
				salt++
				code = hashCode(fmt.Sprintf("%s#%d", url, salt), k)
			}
			seen[code] = url
		}
		space := float64(pow62(k))
		expected := float64(N) * float64(N-1) / 2 / space
		fmt.Printf("k=%d: %d urls, collisions %d (birthday estimate %.2f)\\n", k, N, collisions, expected)
		if first != "" {
			fmt.Printf("  first: %s\\n", first)
		}
	}
	fmt.Printf("same url hashed twice: %s %s\\n", hashCode("https://example.com/a", 7), hashCode("https://example.com/a", 7))
}` },
          { tech: "java", code: `// URL shortener key generation: capacity, base62, counter ranges, hash-prefix collisions.
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

public class Main {
    static final String ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

    static String encode(long n) {
        if (n == 0) return "0";
        StringBuilder sb = new StringBuilder();
        while (n > 0) { sb.insert(0, ALPHABET.charAt((int) (n % 62))); n /= 62; }
        return sb.toString();
    }

    static long decode(String s) {
        long n = 0;
        for (char c : s.toCharArray()) n = n * 62 + ALPHABET.indexOf(c);
        return n;
    }

    static long pow62(int k) { long p = 1; for (int i = 0; i < k; i++) p *= 62; return p; }

    static long next = 1000000000L;
    static long[] lease(long size) { long s = next; next += size; return new long[] {s, s + size}; }

    static String hashCode(String url, int k) throws Exception {
        byte[] h = MessageDigest.getInstance("MD5").digest(url.getBytes(StandardCharsets.UTF_8));
        long n = 0;
        for (int i = 0; i < 6; i++) n = n * 256 + (h[i] & 0xff);
        String c = encode(n % pow62(k));
        while (c.length() < k) c = "0" + c;
        return c;
    }

    public static void main(String[] args) throws Exception {
        System.out.println("== capacity estimate ==");
        long perMonth = 100000000L, readsPerWrite = 100, years = 5, bytesPerRow = 500;
        long secPerMonth = 30L * 86400;
        long writesPerSec = (perMonth + secPerMonth - 1) / secPerMonth;
        System.out.println("writes/s avg: " + writesPerSec + ", reads/s avg: " + writesPerSec * readsPerWrite + ", reads/s peak (x5): " + writesPerSec * readsPerWrite * 5);
        long total = perMonth * 12 * years;
        System.out.println("rows after " + years + " years: " + total + ", storage: " + total * bytesPerRow / 1000000000000L + " TB");
        for (int k = 5; k <= 8; k++) {
            long space = pow62(k);
            System.out.println("length " + k + ": " + space + " codes, fits " + years + "y: " + (space >= total ? "yes" : "no"));
        }

        System.out.println("== base62 ==");
        for (long id : new long[] {0, 61, 62, 3843, 1000000000L, 56800235583L, 3521614606207L}) {
            String c = encode(id);
            System.out.println(id + " -> " + c + " -> " + decode(c));
        }

        System.out.println("== counter service hands out ranges of 1000 ==");
        String[] names = {"app-a", "app-b", "app-c"};
        long[][] ranges = new long[3][];
        long[] used = new long[3];
        for (int i = 0; i < 3; i++) ranges[i] = lease(1000);
        for (int i = 0; i < 3; i++) {
            int n = names[i].equals("app-b") ? 3 : 2;
            List<String> codes = new ArrayList<>();
            for (int j = 0; j < n; j++) { codes.add(encode(ranges[i][0] + used[i])); used[i]++; }
            System.out.println(names[i] + " range [" + ranges[i][0] + ", " + ranges[i][1] + ") issued " + String.join(" ", codes));
        }
        System.out.println(names[1] + " crashes: " + (1000 - used[1]) + " ids of its range are never used (gap, not a duplicate)");
        long[] fresh = lease(1000);
        System.out.println(names[1] + " restarts with range [" + fresh[0] + ", " + fresh[1] + ") first code " + encode(fresh[0]));
        System.out.println("counter round trips for 1,000,000 codes: " + 1000000 / 1000);

        System.out.println("== hash prefix instead of a counter ==");
        int N = 200000;
        for (int k : new int[] {5, 7}) {
            Map<String, String> seen = new HashMap<>();
            int collisions = 0;
            String first = "";
            for (int i = 0; i < N; i++) {
                String url = "https://example.com/page/" + i;
                String code = hashCode(url, k);
                int salt = 0;
                while (seen.containsKey(code)) {
                    if (salt == 0) {
                        collisions++;
                        if (first.isEmpty()) first = seen.get(code) + " and " + url + " -> " + code;
                    }
                    salt++;
                    code = hashCode(url + "#" + salt, k);
                }
                seen.put(code, url);
            }
            double expected = (double) N * (N - 1) / 2 / (double) pow62(k);
            System.out.println("k=" + k + ": " + N + " urls, collisions " + collisions + " (birthday estimate " + String.format("%.2f", expected) + ")");
            if (!first.isEmpty()) System.out.println("  first: " + first);
        }
        System.out.println("same url hashed twice: " + hashCode("https://example.com/a", 7) + " " + hashCode("https://example.com/a", 7));
    }
}` },
        ],
      },
    ],
  },
  {
    title: `How would you design a URL shortener like TinyURL?`,
    difficulty: "hard",
    seoDescription: `Scale a URL shortener's redirect path: cache hit rates under Zipf traffic, CDN, cache stampedes, 301 vs 302, async click analytics and multi-region reads.`,
    description: `**Question presented to candidate:**
"Assume the basic TinyURL design is done: we can create codes and store them. Now the product is a hit. Redirects are tens of thousands per second at peak, some links go viral, users are worldwide, and marketing wants click counts. How do you make redirects fast, cheap and reliable?"

**What a strong answer should cover:**
- Why the read path dominates (about 100 redirects per create) and a capacity estimate for the redirect tier, the cache and the click stream
- **Layered caching**: CDN or edge, a shared cache (cache-aside) and the replicated store; how hit rate depends on cache size under a skewed (Zipf) popularity distribution, with real numbers
- **Cache stampede** on a viral or just-expired link, and the fixes: request coalescing (single-flight), early refresh, a short lock
- **301 vs 302** as a load versus control trade-off, measured; invalidation when a link is deleted, edited or taken down; **negative caching** of unknown codes
- **Asynchronous click analytics** through a queue so counting never slows a redirect, and multi-region read replicas for global latency

**Clarifying questions expected:**
- What redirect latency and availability do we promise, and where are the users?
- How exact must click counts be, and how fresh?
- Can links be edited or deleted after creation, and how fast must that take effect?

**Code / implementation expected:** Optional — a simulation of cache hit rate under skewed traffic, or of a stampede with and without request coalescing; the example does both and measures 301 vs 302.`,
    answer: `**Target Audience:** Engineers who know the basic shortener design (codes, a table keyed by code) and want to go deep on scaling reads; caching terms are defined as they come up.
**Difficulty:** Hard
**Verified with:** Node 22.22, Python 3.12, Go 1.24 and Java 21 (all four print identical output). HTTP caching rules for redirects checked against RFC 9110 in October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. The hit rates, stampede counts and 301 vs 302 numbers come from the example program; the **Verified** section quotes its full output. Code generation, the API and the data model are covered in [Design a URL shortener (TinyURL)](/interview-question/design-url-shortener); this page starts where that one ends.

## 1. Why This Even Matters — A Story First

A small bakery sells one hundred kinds of bread. Every morning the same few loaves (the plain white, the baguette) make up half of all sales, while most kinds sell a couple of times a week. The baker does not bake every loaf to order: the popular ones sit in a basket at the till, ready to hand over, and only unusual orders go back to the oven.

Two things can still go wrong. If the basket is too small, customers wait for the oven. And if the baguettes run out at 8 a.m. just as a coach party walks in, all forty people ask the oven at once, and the oven cannot bake forty baguettes in one go.

A URL shortener is that bakery. The basket is the **cache**, the oven is the **database**, the popular loaves are the few links that get most clicks, and the coach party is a **cache stampede** on a link that has just gone viral. This question is about sizing the basket and handling the coach party.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Peak redirects per second, and how skewed is popularity? | Decides cache size and how much load reaches the store |
| Latency target and where users are | Single region with a CDN, or read replicas in several regions |
| Must clicks be counted exactly, and how fresh must counts be? | Exact and real time is expensive; approximate and a minute behind is cheap |
| Can a link be edited, deleted or taken down for abuse? How fast must that apply? | Bounds cache TTLs and rules out long-lived permanent redirects |
| Are unknown codes being scanned? | Without negative caching, every guessed code is a database read |

## 3. Requirements for the Read Path

**Functional**

- \`GET /{code}\` returns a redirect to the long URL, or 404 or 410.
- Every click produces an analytics event (time, code, country, referrer, device).
- Deletes and abuse takedowns stop redirecting within a short, stated time (say 60 seconds).

**Non-functional**

- Peak 19,500 redirects per second (from the sibling question: 100 million links a month, 100 reads per write, 5x peak), designed so 10x is a configuration change, not a redesign.
- p99 server-side redirect latency of a few milliseconds; redirects stay up even if the create path is down.
- The analytics pipeline may lag but must not slow or fail redirects.

## 4. Capacity Estimate

| Quantity | Calculation | Result |
| :--- | :--- | ---: |
| Redirects per second (average, peak) | from the sibling estimate | 3,900 and 19,500 |
| Store reads at peak with a 1,000-entry cache (1% of links) | 19,500 x (1 - 0.506) | 9,627 per second |
| Store reads at peak with a 20,000-entry cache (20% of links) | 19,500 x (1 - 0.792) | 4,051 per second |
| Cache memory for 1% of 6 billion links | 60,000,000 x 500 B | 30 GB |
| Click events per day | 3,900 x 86,400 | 336,960,000 |
| Click data per day at 200 B per event | 336,960,000 x 200 B | about 67 GB |

The hit rates come from the simulation in section 6. The cache-memory row says even a generous cache fits in RAM on a few machines; the click-data row says analytics is a real data pipeline, not a counter column.

## 5. Architecture of the Read Path

<svg class="iq-diagram" width="100%" viewBox="0 0 780 360" role="img" aria-label="Browser to CDN edge to redirect service, which checks a shared cache and falls back to store replicas; the redirect service also emits click events to a queue feeding an analytics store">
  <defs>
    <marker id="sd14q2-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="110" height="64" rx="10"/>
  <text class="d-text" x="75" y="98" text-anchor="middle">browser</text>
  <rect class="d-box" x="180" y="60" width="120" height="64" rx="10"/>
  <text class="d-text" x="240" y="88" text-anchor="middle">CDN edge</text>
  <text class="d-sub" x="240" y="108" text-anchor="middle">optional</text>
  <line class="d-edge" x1="130" y1="92" x2="176" y2="92" marker-end="url(#sd14q2-arrow)"/>
  <rect class="d-box-accent" x="350" y="60" width="140" height="64" rx="10"/>
  <text class="d-text" x="420" y="88" text-anchor="middle">redirect service</text>
  <text class="d-sub" x="420" y="108" text-anchor="middle">local LRU</text>
  <line class="d-edge" x1="300" y1="92" x2="346" y2="92" marker-end="url(#sd14q2-arrow)"/>
  <rect class="d-box" x="550" y="20" width="200" height="56" rx="10"/>
  <text class="d-text" x="650" y="53" text-anchor="middle">shared cache</text>
  <line class="d-edge" x1="490" y1="80" x2="546" y2="52" marker-end="url(#sd14q2-arrow)"/>
  <rect class="d-box-muted" x="550" y="120" width="200" height="56" rx="10"/>
  <text class="d-text" x="650" y="153" text-anchor="middle">store read replicas</text>
  <line class="d-edge-dashed" x1="490" y1="108" x2="546" y2="140" marker-end="url(#sd14q2-arrow)"/>
  <rect class="d-box" x="350" y="250" width="140" height="64" rx="10"/>
  <text class="d-text" x="420" y="278" text-anchor="middle">click queue</text>
  <text class="d-sub" x="420" y="298" text-anchor="middle">fire and forget</text>
  <line class="d-edge-accent" x1="420" y1="124" x2="420" y2="246" marker-end="url(#sd14q2-arrow)"/>
  <rect class="d-box" x="550" y="250" width="200" height="64" rx="10"/>
  <text class="d-text" x="650" y="278" text-anchor="middle">analytics store</text>
  <text class="d-sub" x="650" y="298" text-anchor="middle">aggregated counts</text>
  <line class="d-edge" x1="490" y1="282" x2="546" y2="282" marker-end="url(#sd14q2-arrow)"/>
</svg>

A redirect is answered from the nearest layer that knows the code; the click event goes to a queue and is counted later, off the hot path.

- **Redirect service**: stateless, with a small in-process LRU for the hottest codes (no network hop at all).
- **Shared cache** (Redis or Memcached cluster): **cache-aside**, keyed by code, with a TTL.
- **Store read replicas**: the source of truth for misses; writes go to the primary, reads spread over replicas. See [read replica vs cache](/interview-question/when-do-you-use-a-read-replica-vs-a-cache).
- **CDN edge**: optional; it can cache redirects close to users if you accept the analytics and invalidation trade-offs in section 8.

📌 **Interview term: cache-aside** — the application checks the cache first; on a miss it reads the database and writes the result into the cache. The cache never talks to the database itself. Background on cache strategies: [how caching improves performance](/interview-question/how-does-caching-improve-system-performance).

## 6. Deep Dive 1: How Big Must the Cache Be?

Link popularity is extremely uneven: a few links get most clicks. A standard model for that is a **Zipf distribution**.

📌 **Interview term: Zipf distribution** — popularity where the item ranked r gets traffic proportional to 1/r^s. With s = 1 the most popular link gets twice the traffic of the second and ten times the tenth.

The example generates 300,000 redirects over 100,000 links with Zipf s = 1 and runs an LRU cache of three sizes in front of the store:

~~~text
cache 1000 (1.0% of links): hit rate 50.6%, store reads at 19500 req/s peak: 9627/s
cache 5000 (5.0% of links): hit rate 66.2%, store reads at 19500 req/s peak: 6586/s
cache 20000 (20.0% of links): hit rate 79.2%, store reads at 19500 req/s peak: 4051/s
top 100 links get 42.9% of traffic; #1 gets 24923 redirects, #10 gets 2511
~~~

📌 **Interview term: LRU (least recently used) eviction** — when the cache is full, remove the entry that was used longest ago. It keeps whatever is popular right now without needing to know popularity in advance.

Reading the numbers:

- **The first 1% of cache does half the work.** 1,000 entries (1% of links) served 50.6% of requests, because the top 100 links alone carry 42.9% of traffic.
- **Each further gain costs much more memory.** Going from 1% to 20% of links (20x the memory) only took the hit rate from 50.6% to 79.2%. This diminishing return is the shape of every skewed workload.
- **The store still sees thousands of reads per second.** Even at 79.2%, 4,051 reads per second reach the store at peak, so the store needs read replicas regardless; the cache reduces its size, it does not remove it.

Real link traffic is usually more skewed than s = 1 (a handful of links in a viral tweet, a long tail never clicked again), and recent links are hotter than old ones, both of which raise hit rates. Measure your own distribution before sizing; the shape of the curve is the point, not the exact percentages.

## 7. Deep Dive 2: Cache Stampede on a Viral Link

📌 **Interview term: cache stampede (thundering herd)** — many requests miss the cache for the same key at the same moment (because it just expired or was never cached) and all of them hit the database for the same row.

The simulation sends 1,000 requests for one uncached link, one every 40 microseconds, against a store read that takes 20 ms:

~~~text
no coalescing: 1000 requests in 40 ms, store reads 500, waited on one read 0
single-flight: 1000 requests in 40 ms, store reads 1, waited on one read 499
~~~

Without coalescing, every request that arrives before the first read returns (500 of them) issues its own read of the same row. With **single-flight**, the first request reads and the next 499 wait for that one result; after 20 ms the cache is filled and the rest are hits.

📌 **Interview term: request coalescing (single-flight)** — when a read for a key is already in progress, later requests for the same key wait for it instead of starting their own.

The core of it:

~~~js
if (t >= cachedAt) continue;                                 // cache hit
if (coalesce && inflightUntil > t) { waited++; continue; }   // join the in-flight read
dbReads++;
~~~

Other stampede defences, usually combined:

- **Coalesce across servers** with a short lock in the shared cache (\`SET key:lock NX PX 100\`): one server refills, others briefly serve a stale value or wait.
- **Early or probabilistic refresh**: refresh a hot key shortly before its TTL ends, so it never expires under load.
- **TTL jitter**: add a random few percent to every TTL so many keys do not expire at the same second.
- **Long TTLs for immutable data.** A code to URL mapping almost never changes; the TTL exists only to bound how long a delete or edit takes to apply.

## 8. Deep Dive 3: 301 vs 302, Invalidation and Negative Caching

RFC 9110 lists 301 and 308 among the **heuristically cacheable** status codes, so browsers and proxies may reuse them without asking the server again; 302 and 307 are cached only when explicit \`Cache-Control\` headers allow it. The simulation has 1,000 browsers click one link 5 times each, with the owner editing the destination before the fourth click:

~~~text
301: 1000 browsers x 5 clicks -> server sees 1000 clicks; clicks sent to the old destination after an edit: 2000
302: 1000 browsers x 5 clicks -> server sees 5000 clicks; clicks sent to the old destination after an edit: 0
~~~

301 cut server load by 80% and lost 4,000 of 5,000 clicks from analytics, and 2,000 clicks went to the old destination after the edit, which the server could not prevent. 302 kept full control. (The program models the browser cache as "a 301 is reused forever"; real browsers vary in how long they keep it.)

The trade-off is usually settled by product needs: shorteners that sell analytics or support edits and takedowns use **302 or 307**. A middle path is 302 with \`Cache-Control: private, max-age=60\`: the same browser can reuse it for a minute (cutting repeated clicks), shared CDNs cannot, and edits apply within a minute.

**Invalidation.** When a link is deleted, edited or taken down: update the store, delete the key from the shared cache, and broadcast the code to redirect servers so they drop it from their local LRU (a small pub/sub channel works). TTLs are the safety net that bounds how stale anything can be if a message is lost: a 60-second local TTL means "takedown within 60 seconds" even in the worst case. If a CDN caches redirects, its purge API is part of the takedown path.

📌 **Interview term: negative caching** — caching the fact that a key does **not** exist (a 404), with a short TTL. Without it, someone scanning random codes turns every guess into a store read; with it, repeated guesses are absorbed by the cache. Combine with a [rate limiter](/interview-question/how-would-you-design-a-rate-limiter) on 404s per client. Watch the order on create: a new code must overwrite any cached "not found" for it.

## 9. Deep Dive 4: Click Analytics Off the Hot Path

Never write to the analytics store inside the redirect. Instead:

1. The redirect service sends the 302 immediately and puts a click event into an in-memory buffer.
2. A background flush sends batches to a durable log or queue (Kafka, Kinesis, SQS). See [message queues](/interview-question/what-is-a-message-queue-and-why-use-one).
3. Stream processors aggregate per code per minute (counts by country, referrer, device) into an analytics store; raw events go to cheap object storage for re-processing.

At about 337 million clicks and 67 GB a day this is a modest pipeline, but it is a pipeline. If the queue is down, the redirect service drops or spools events locally; it never delays the redirect. That makes click counts **at-least-once or at-most-once** depending on how you buffer, which is fine for marketing analytics; deduplicate with an event ID if counts are billed. The general design is covered in [ad click event aggregation](/interview-question/how-would-you-design-ad-click-event-aggregation-5733).

## 10. Multi-Region and Availability

- **Reads everywhere, writes in one place.** Run redirect services, caches and store read replicas in each region; creates go to the primary region. A new link may take a moment to replicate, so a redirect that misses locally can fall back to the primary region before returning 404.
- **Redirects survive a primary outage.** Replicas keep serving existing links even when creates are down, which matches the requirement that redirects matter more than creates. See [designing for high availability](/interview-question/how-do-you-design-for-high-availability).
- **DNS or anycast routing** sends users to the nearest healthy region. See [how a CDN works](/interview-question/what-is-a-cdn-and-how-does-it-work).

## 11. What Breaks First at 10x

| At 195,000 redirects per second | Fix |
| :--- | :--- |
| Shared cache network and CPU on the hottest keys | Local in-process LRU absorbs the top links; replicate hot keys across cache nodes |
| Store replicas at around 40,000 reads per second with a 79% hit rate | More replicas per region, bigger cache, and shard the store by code |
| Click stream at about 670 GB a day | Partition the queue by code; pre-aggregate in the redirect service before sending |
| Takedown fan-out to thousands of redirect servers | Pub/sub with a version number per code; TTL as backstop |

## 12. Verified: Running the Code

What the program simulates: a deterministic pseudo-random generator (a linear congruential generator, so all four languages see the same sequence) draws 300,000 link ranks from a Zipf (s = 1) distribution over 100,000 links; an LRU cache of each size counts hits; a set of 1,000 browsers models browser caching of 301; and a time-stepped loop with microsecond timestamps models a stampede with and without single-flight. It stands in for a real cache cluster, browsers and a database, and leaves out network latency, TTLs and memory overhead.

Full output (identical in Node, Python, Go and Java):

~~~text
== LRU cache in front of the store, Zipf traffic ==
100000 links, 300000 redirects
cache 1000 (1.0% of links): hit rate 50.6%, store reads at 19500 req/s peak: 9627/s
cache 5000 (5.0% of links): hit rate 66.2%, store reads at 19500 req/s peak: 6586/s
cache 20000 (20.0% of links): hit rate 79.2%, store reads at 19500 req/s peak: 4051/s
top 100 links get 42.9% of traffic; #1 gets 24923 redirects, #10 gets 2511
== 301 vs 302: what the server sees ==
301: 1000 browsers x 5 clicks -> server sees 1000 clicks; clicks sent to the old destination after an edit: 2000
302: 1000 browsers x 5 clicks -> server sees 5000 clicks; clicks sent to the old destination after an edit: 0
== cache stampede on a viral link ==
no coalescing: 1000 requests in 40 ms, store reads 500, waited on one read 0
single-flight: 1000 requests in 40 ms, store reads 1, waited on one read 499
~~~

## 13. Edge Cases Worth Knowing

- **Hot key on one cache node.** A single viral link always hashes to the same cache shard; the local LRU on each redirect server is what spreads that load.
- **Replication lag after create.** A link shared seconds after creation may miss in a replica region; fall back to the primary, and do not negative-cache that miss for long.
- **Cache cold start** after a deploy or cache node loss sends a burst to the store; warm the cache from the top codes, or roll out gradually.
- **Bots and link previews.** Chat apps and social sites fetch links to build previews, inflating click counts; tag known user agents and count them separately.
- **Expired links in cache.** Store \`expires_at\` in the cached value and check it on every hit, or a cached link outlives its expiry by up to a TTL.

## Common Pitfalls

- **Writing analytics synchronously in the redirect.** The redirect then fails or slows whenever the analytics store does.
- **Assuming the cache removes the database.** At a 79.2% hit rate the store still took 4,051 reads per second at peak in the simulation.
- **No stampede protection.** One viral link turned into 500 identical store reads in 20 ms without coalescing, and 1 with it.
- **301 for links that can change.** In the run it hid 4,000 of 5,000 clicks and sent 2,000 to an outdated destination.
- **No negative caching.** Scanners turn every guessed code into a database read.
- **Takedowns that only update the database.** Cached copies keep redirecting to the phishing page until their TTL ends.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Frame the problem:</strong> <span style="color:#f0e2c8;">Redirects are about 100 times creates, so this is a read-scaling problem: 19,500 redirects per second at peak, a few milliseconds of latency, and redirects must keep working even when creates are down.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Layers:</strong> <span style="color:#f0e2c8;">Browser, optional CDN, a stateless redirect service with a small in-process LRU, a shared cache-aside cache, then store read replicas. The click event goes to a queue, never to a database on the hot path.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Size the cache:</strong> <span style="color:#f0e2c8;">Popularity is Zipf-like. In my simulation a cache holding 1% of links hit 50.6% and 20% of links hit 79.2%, so the store still sees about 4,000 reads per second at peak and needs replicas; 1% of 6 billion links is only 30 GB of RAM.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Protect it:</strong> <span style="color:#f0e2c8;">A viral link that misses caused 500 identical store reads in 20 ms without coalescing and 1 with <strong style="color:#ffca28;">single-flight</strong>; add TTL jitter and early refresh. Negative-cache 404s so scanners do not reach the store.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Control and analytics:</strong> <span style="color:#f0e2c8;">I use 302 so every click is counted and edits and takedowns apply; with 301, 1,000 browsers clicking 5 times showed the server 1,000 clicks instead of 5,000. Takedowns delete from the store and caches, with short TTLs as the backstop; analytics flows through a queue into minute-level aggregates.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you put the redirect on a CDN?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only with a short TTL and if analytics can come from CDN logs, because a CDN-cached redirect never reaches our servers. A common compromise is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Cache-Control: private, max-age=60</code> on a 302: browsers reuse it briefly, shared caches do not, and edits apply within a minute.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make click counts exact?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Give each click an event ID at the redirect server, write events to a durable log with retries, and deduplicate by ID in the aggregation step. That is at-least-once delivery plus idempotent counting. Most shorteners settle for approximate counts because the cost of exactness is not worth it for marketing data.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How fast does a takedown apply?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Within the shortest TTL on any layer that does not get an explicit purge. I delete the key from the shared cache, broadcast to redirect servers to drop local copies, purge the CDN if used, and set local TTLs to about 60 seconds so even a lost message cannot keep a bad link alive longer than that.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the shared cache cluster fails?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Redirects fall back to the store replicas, which must be sized to survive that, at least for the time it takes to recover; the in-process LRU still absorbs the hottest links. Request coalescing matters most here, because every key is cold at once.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a link that just went viral in another region?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The local region misses, reads the replica (or the primary if the link is very new) and caches it; single-flight keeps that to one read per server. If replication lag causes a 404, the redirect falls back to the primary region instead of caching the 404 for long.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Cache-aside | App reads the cache, on a miss reads the database and fills the cache |
| Zipf distribution | Item ranked r gets traffic proportional to 1/r^s; a few items dominate |
| LRU eviction | When full, drop the entry used longest ago |
| Cache stampede (thundering herd) | Many simultaneous misses on one key all hitting the database |
| Request coalescing (single-flight) | Later requests for a key wait for the read already in progress |
| Negative caching | Caching "not found" for a short time so repeated misses stay cheap |

**Conclusion:** Scaling a URL shortener is scaling one cheap lookup to tens of thousands of requests per second without losing control of where links go. Under Zipf-like traffic a cache holding 1% of links served 50.6% of redirects and 20% served 79.2%, so the store still needs replicas; one viral link caused 500 identical store reads in 20 ms without single-flight and 1 with it; and 301 would have hidden 4,000 of 5,000 clicks and kept sending 2,000 to an outdated destination. Use layered caches with coalescing, negative caching and short TTLs as the invalidation backstop, keep 302 for control, push analytics through a queue, and replicate reads per region.`,
    examples: [
      {
        label: `Redirect read path: LRU hit rate under Zipf traffic, 301 vs 302 and a cache stampede with single-flight`,
        variants: [
          { tech: "node", code: `// URL shortener read path: LRU hit rate under Zipf traffic, 301 vs 302, and a cache stampede.
const LINKS = 100000, REQUESTS = 300000, PEAK_READS = 19500;

let state = 42;
function rand() { // LCG mod 2^32, same sequence in every language
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return state / 4294967296;
}
const cdf = [];
let sum = 0;
for (let i = 1; i <= LINKS; i++) { sum += 1 / i; cdf.push(sum); } // Zipf, s = 1
function pick() {
  const x = rand() * sum;
  let lo = 0, hi = LINKS - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid] < x) lo = mid + 1; else hi = mid; }
  return lo; // link rank 0 = most popular
}
function pct(part, whole) { const t = Math.floor((part * 1000) / whole); return Math.floor(t / 10) + "." + (t % 10) + "%"; }

class LRU {
  constructor(cap) { this.cap = cap; this.map = new Map(); }
  get(k) {
    if (!this.map.has(k)) return false;
    const v = this.map.get(k); this.map.delete(k); this.map.set(k, v); return true;
  }
  put(k) {
    this.map.set(k, true);
    if (this.map.size > this.cap) this.map.delete(this.map.keys().next().value);
  }
}

console.log("== LRU cache in front of the store, Zipf traffic ==");
console.log(LINKS + " links, " + REQUESTS + " redirects");
for (const cap of [1000, 5000, 20000]) {
  state = 42;
  const cache = new LRU(cap);
  let hits = 0;
  for (let i = 0; i < REQUESTS; i++) {
    const k = pick();
    if (cache.get(k)) hits++; else cache.put(k);
  }
  const misses = REQUESTS - hits;
  const dbQps = Math.ceil((PEAK_READS * misses) / REQUESTS);
  console.log("cache " + cap + " (" + pct(cap, LINKS) + " of links): hit rate " + pct(hits, REQUESTS) + ", store reads at " + PEAK_READS + " req/s peak: " + dbQps + "/s");
}
state = 42;
const top = new Array(10).fill(0);
let topHits = 0;
for (let i = 0; i < REQUESTS; i++) { const k = pick(); if (k < 100) topHits++; if (k < 10) top[k]++; }
console.log("top 100 links get " + pct(topHits, REQUESTS) + " of traffic; #1 gets " + top[0] + " redirects, #10 gets " + top[9]);

console.log("== 301 vs 302: what the server sees ==");
for (const status of [301, 302]) {
  const browserCache = new Set();
  let serverHits = 0, staleAfterEdit = 0;
  for (let round = 0; round < 5; round++) { // the owner edits the destination before round 3
    for (let b = 0; b < 1000; b++) {
      if (status === 301 && browserCache.has(b)) { if (round >= 3) staleAfterEdit++; continue; }
      serverHits++;
      if (status === 301) browserCache.add(b);
    }
  }
  console.log(status + ": 1000 browsers x 5 clicks -> server sees " + serverHits + " clicks; clicks sent to the old destination after an edit: " + staleAfterEdit);
}

console.log("== cache stampede on a viral link ==");
const ARRIVALS = 1000, GAP_US = 40, DB_US = 20000;
for (const coalesce of [false, true]) {
  let dbReads = 0, inflightUntil = -1, cachedAt = Infinity, waited = 0;
  for (let i = 0; i < ARRIVALS; i++) {
    const t = i * GAP_US;
    if (t >= cachedAt) continue; // cache hit
    if (coalesce && inflightUntil > t) { waited++; continue; } // join the in-flight read
    dbReads++;
    if (inflightUntil < 0) { inflightUntil = t + DB_US; cachedAt = t + DB_US; }
  }
  console.log((coalesce ? "single-flight" : "no coalescing") + ": " + ARRIVALS + " requests in " + (ARRIVALS * GAP_US) / 1000 + " ms, store reads " + dbReads + ", waited on one read " + waited);
}` },
          { tech: "python", code: `# URL shortener read path: LRU hit rate under Zipf traffic, 301 vs 302, and a cache stampede.
from collections import OrderedDict

LINKS, REQUESTS, PEAK_READS = 100000, 300000, 19500

state = 42


def rand():  # LCG mod 2^32, same sequence in every language
    global state
    state = (state * 1664525 + 1013904223) & 0xFFFFFFFF
    return state / 4294967296


cdf = []
total = 0.0
for i in range(1, LINKS + 1):  # Zipf, s = 1
    total += 1 / i
    cdf.append(total)


def pick():
    x = rand() * total
    lo, hi = 0, LINKS - 1
    while lo < hi:
        mid = (lo + hi) >> 1
        if cdf[mid] < x:
            lo = mid + 1
        else:
            hi = mid
    return lo  # link rank 0 = most popular


def pct(part, whole):
    t = part * 1000 // whole
    return f"{t // 10}.{t % 10}%"


class LRU:
    def __init__(self, cap):
        self.cap = cap
        self.map = OrderedDict()

    def get(self, k):
        if k not in self.map:
            return False
        self.map.move_to_end(k)
        return True

    def put(self, k):
        self.map[k] = True
        if len(self.map) > self.cap:
            self.map.popitem(last=False)


print("== LRU cache in front of the store, Zipf traffic ==")
print(f"{LINKS} links, {REQUESTS} redirects")
for cap in [1000, 5000, 20000]:
    state = 42
    cache = LRU(cap)
    hits = 0
    for _ in range(REQUESTS):
        k = pick()
        if cache.get(k):
            hits += 1
        else:
            cache.put(k)
    misses = REQUESTS - hits
    db_qps = -(-PEAK_READS * misses // REQUESTS)
    print(f"cache {cap} ({pct(cap, LINKS)} of links): hit rate {pct(hits, REQUESTS)}, store reads at {PEAK_READS} req/s peak: {db_qps}/s")
state = 42
top = [0] * 10
top_hits = 0
for _ in range(REQUESTS):
    k = pick()
    if k < 100:
        top_hits += 1
    if k < 10:
        top[k] += 1
print(f"top 100 links get {pct(top_hits, REQUESTS)} of traffic; #1 gets {top[0]} redirects, #10 gets {top[9]}")

print("== 301 vs 302: what the server sees ==")
for status in [301, 302]:
    browser_cache = set()
    server_hits, stale_after_edit = 0, 0
    for rnd in range(5):  # the owner edits the destination before round 3
        for b in range(1000):
            if status == 301 and b in browser_cache:
                if rnd >= 3:
                    stale_after_edit += 1
                continue
            server_hits += 1
            if status == 301:
                browser_cache.add(b)
    print(f"{status}: 1000 browsers x 5 clicks -> server sees {server_hits} clicks; clicks sent to the old destination after an edit: {stale_after_edit}")

print("== cache stampede on a viral link ==")
ARRIVALS, GAP_US, DB_US = 1000, 40, 20000
for coalesce in [False, True]:
    db_reads, inflight_until, cached_at, waited = 0, -1, float("inf"), 0
    for i in range(ARRIVALS):
        t = i * GAP_US
        if t >= cached_at:
            continue  # cache hit
        if coalesce and inflight_until > t:
            waited += 1  # join the in-flight read
            continue
        db_reads += 1
        if inflight_until < 0:
            inflight_until = t + DB_US
            cached_at = t + DB_US
    name = "single-flight" if coalesce else "no coalescing"
    print(f"{name}: {ARRIVALS} requests in {ARRIVALS * GAP_US // 1000} ms, store reads {db_reads}, waited on one read {waited}")` },
          { tech: "go", code: `// URL shortener read path: LRU hit rate under Zipf traffic, 301 vs 302, and a cache stampede.
package main

import (
	"container/list"
	"fmt"
)

const LINKS, REQUESTS, PEAK_READS = 100000, 300000, 19500

var state uint32 = 42
var cdf []float64
var total float64

func rand() float64 { // LCG mod 2^32, same sequence in every language
	state = state*1664525 + 1013904223
	return float64(state) / 4294967296
}

func pick() int {
	x := rand() * total
	lo, hi := 0, LINKS-1
	for lo < hi {
		mid := (lo + hi) >> 1
		if cdf[mid] < x {
			lo = mid + 1
		} else {
			hi = mid
		}
	}
	return lo // link rank 0 = most popular
}

func pct(part, whole int) string {
	t := part * 1000 / whole
	return fmt.Sprintf("%d.%d%%", t/10, t%10)
}

type LRU struct {
	cap   int
	order *list.List
	items map[int]*list.Element
}

func (c *LRU) get(k int) bool {
	e, ok := c.items[k]
	if !ok {
		return false
	}
	c.order.MoveToBack(e)
	return true
}

func (c *LRU) put(k int) {
	c.items[k] = c.order.PushBack(k)
	if c.order.Len() > c.cap {
		oldest := c.order.Front()
		c.order.Remove(oldest)
		delete(c.items, oldest.Value.(int))
	}
}

func main() {
	for i := 1; i <= LINKS; i++ { // Zipf, s = 1
		total += 1 / float64(i)
		cdf = append(cdf, total)
	}
	fmt.Println("== LRU cache in front of the store, Zipf traffic ==")
	fmt.Printf("%d links, %d redirects\\n", LINKS, REQUESTS)
	for _, cp := range []int{1000, 5000, 20000} {
		state = 42
		cache := &LRU{cap: cp, order: list.New(), items: map[int]*list.Element{}}
		hits := 0
		for i := 0; i < REQUESTS; i++ {
			k := pick()
			if cache.get(k) {
				hits++
			} else {
				cache.put(k)
			}
		}
		misses := REQUESTS - hits
		dbQps := (PEAK_READS*misses + REQUESTS - 1) / REQUESTS
		fmt.Printf("cache %d (%s of links): hit rate %s, store reads at %d req/s peak: %d/s\\n", cp, pct(cp, LINKS), pct(hits, REQUESTS), PEAK_READS, dbQps)
	}
	state = 42
	top := make([]int, 10)
	topHits := 0
	for i := 0; i < REQUESTS; i++ {
		k := pick()
		if k < 100 {
			topHits++
		}
		if k < 10 {
			top[k]++
		}
	}
	fmt.Printf("top 100 links get %s of traffic; #1 gets %d redirects, #10 gets %d\\n", pct(topHits, REQUESTS), top[0], top[9])

	fmt.Println("== 301 vs 302: what the server sees ==")
	for _, status := range []int{301, 302} {
		browserCache := map[int]bool{}
		serverHits, staleAfterEdit := 0, 0
		for round := 0; round < 5; round++ { // the owner edits the destination before round 3
			for b := 0; b < 1000; b++ {
				if status == 301 && browserCache[b] {
					if round >= 3 {
						staleAfterEdit++
					}
					continue
				}
				serverHits++
				if status == 301 {
					browserCache[b] = true
				}
			}
		}
		fmt.Printf("%d: 1000 browsers x 5 clicks -> server sees %d clicks; clicks sent to the old destination after an edit: %d\\n", status, serverHits, staleAfterEdit)
	}

	fmt.Println("== cache stampede on a viral link ==")
	const ARRIVALS, GAP_US, DB_US = 1000, 40, 20000
	for _, coalesce := range []bool{false, true} {
		dbReads, inflightUntil, cachedAt, waited := 0, -1, 1<<62, 0
		for i := 0; i < ARRIVALS; i++ {
			t := i * GAP_US
			if t >= cachedAt {
				continue // cache hit
			}
			if coalesce && inflightUntil > t {
				waited++ // join the in-flight read
				continue
			}
			dbReads++
			if inflightUntil < 0 {
				inflightUntil = t + DB_US
				cachedAt = t + DB_US
			}
		}
		name := "no coalescing"
		if coalesce {
			name = "single-flight"
		}
		fmt.Printf("%s: %d requests in %d ms, store reads %d, waited on one read %d\\n", name, ARRIVALS, ARRIVALS*GAP_US/1000, dbReads, waited)
	}
}` },
          { tech: "java", code: `// URL shortener read path: LRU hit rate under Zipf traffic, 301 vs 302, and a cache stampede.
import java.util.*;

public class Main {
    static final int LINKS = 100000, REQUESTS = 300000, PEAK_READS = 19500;
    static long state = 42;
    static double[] cdf = new double[LINKS];
    static double total = 0;

    static double rand() { // LCG mod 2^32, same sequence in every language
        state = (state * 1664525L + 1013904223L) & 0xFFFFFFFFL;
        return state / 4294967296.0;
    }

    static int pick() {
        double x = rand() * total;
        int lo = 0, hi = LINKS - 1;
        while (lo < hi) {
            int mid = (lo + hi) >> 1;
            if (cdf[mid] < x) lo = mid + 1; else hi = mid;
        }
        return lo; // link rank 0 = most popular
    }

    static String pct(long part, long whole) {
        long t = part * 1000 / whole;
        return (t / 10) + "." + (t % 10) + "%";
    }

    static class LRU extends LinkedHashMap<Integer, Boolean> {
        final int cap;
        LRU(int cap) { super(16, 0.75f, true); this.cap = cap; }
        protected boolean removeEldestEntry(Map.Entry<Integer, Boolean> e) { return size() > cap; }
    }

    public static void main(String[] args) {
        for (int i = 1; i <= LINKS; i++) { total += 1.0 / i; cdf[i - 1] = total; } // Zipf, s = 1
        System.out.println("== LRU cache in front of the store, Zipf traffic ==");
        System.out.println(LINKS + " links, " + REQUESTS + " redirects");
        for (int cap : new int[] {1000, 5000, 20000}) {
            state = 42;
            LRU cache = new LRU(cap);
            int hits = 0;
            for (int i = 0; i < REQUESTS; i++) {
                int k = pick();
                if (cache.get(k) != null) hits++; else cache.put(k, true);
            }
            long misses = REQUESTS - hits;
            long dbQps = (PEAK_READS * misses + REQUESTS - 1) / REQUESTS;
            System.out.println("cache " + cap + " (" + pct(cap, LINKS) + " of links): hit rate " + pct(hits, REQUESTS) + ", store reads at " + PEAK_READS + " req/s peak: " + dbQps + "/s");
        }
        state = 42;
        int[] top = new int[10];
        int topHits = 0;
        for (int i = 0; i < REQUESTS; i++) { int k = pick(); if (k < 100) topHits++; if (k < 10) top[k]++; }
        System.out.println("top 100 links get " + pct(topHits, REQUESTS) + " of traffic; #1 gets " + top[0] + " redirects, #10 gets " + top[9]);

        System.out.println("== 301 vs 302: what the server sees ==");
        for (int status : new int[] {301, 302}) {
            Set<Integer> browserCache = new HashSet<>();
            int serverHits = 0, staleAfterEdit = 0;
            for (int round = 0; round < 5; round++) { // the owner edits the destination before round 3
                for (int b = 0; b < 1000; b++) {
                    if (status == 301 && browserCache.contains(b)) { if (round >= 3) staleAfterEdit++; continue; }
                    serverHits++;
                    if (status == 301) browserCache.add(b);
                }
            }
            System.out.println(status + ": 1000 browsers x 5 clicks -> server sees " + serverHits + " clicks; clicks sent to the old destination after an edit: " + staleAfterEdit);
        }

        System.out.println("== cache stampede on a viral link ==");
        final int ARRIVALS = 1000, GAP_US = 40, DB_US = 20000;
        for (boolean coalesce : new boolean[] {false, true}) {
            long dbReads = 0, inflightUntil = -1, cachedAt = Long.MAX_VALUE, waited = 0;
            for (int i = 0; i < ARRIVALS; i++) {
                long t = (long) i * GAP_US;
                if (t >= cachedAt) continue; // cache hit
                if (coalesce && inflightUntil > t) { waited++; continue; } // join the in-flight read
                dbReads++;
                if (inflightUntil < 0) { inflightUntil = t + DB_US; cachedAt = t + DB_US; }
            }
            System.out.println((coalesce ? "single-flight" : "no coalescing") + ": " + ARRIVALS + " requests in " + (ARRIVALS * GAP_US / 1000) + " ms, store reads " + dbReads + ", waited on one read " + waited);
        }
    }
}` },
        ],
      },
    ],
  },
  {
    title: `How would you design a typeahead/autocomplete system?`,
    difficulty: "hard",
    seoDescription: `Design typeahead autocomplete: tries with top-k per node, offline build from query logs, trending updates, sharding, client debounce and verified lookups.`,
    description: `**Question presented to candidate:**
"As a user types into our search box, we want to show the five most popular completions for what they have typed so far, updated on every keystroke. We have about 100 million daily users. How would you design that?"

**What a strong answer should cover:**
- A capacity estimate that starts from keystrokes, not searches (requests per second after debouncing), and the size of the suggestion data
- The core structure: a **trie (prefix tree)** where every node stores its precomputed **top-k** completions, so a lookup is a walk of length equal to the prefix, not a search of the subtree
- The **data pipeline**: query logs aggregated with time decay, filtered, built into tries **offline**, swapped in atomically; plus a fast path for **trending** queries
- **Serving**: in-memory replicas, sharding by prefix and its hot-spot problem, caching of short prefixes at the edge and in the browser
- Client behaviour (**debounce**, cancel stale requests, cache results) and extensions: personalization, typo tolerance, filtering offensive suggestions

**Clarifying questions expected:**
- How fresh must suggestions be: is a daily rebuild acceptable, or must trending queries appear within minutes?
- Ranking by global popularity only, or personalized, or by location and language?
- Do we need typo tolerance, or prefix matching only?

**Code / implementation expected:** Optional — a trie with top-k cached per node and a comparison with searching the subtree; the example does both and shows a rebuild picking up a trending query.`,
    answer: `**Target Audience:** Engineers preparing for a system design round; you know what a server and a database are, and data structures like tries are explained from scratch.
**Difficulty:** Hard
**Verified with:** Node 22.22, Python 3.12, Go 1.24 and Java 21 (all four print identical output). The capacity figures are worked arithmetic from stated assumptions, not measurements of a real service.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. The capacity numbers and the trie lookups come from the example program; the **Verified** section quotes its full output.

## 1. Why This Even Matters — A Story First

Think of a librarian who has worked at the same desk for twenty years. You start to say "I am looking for a book about ca..." and before you finish she says "cars, cats or cameras?". She is not searching the shelves while you speak; she already knows, for every way a sentence can start, the three things people usually mean. She learned that over years, and she updates it every so often when new topics become popular.

A typeahead system is that librarian. The "for every way a sentence can start" is a **prefix tree**, the "three things people usually mean" is a **top-k list stored at every prefix**, and the "learned over years, updated every so often" is an **offline pipeline** that rebuilds the tree from search logs. Answering has to be instant because it happens on every keystroke, so all the hard work is done ahead of time.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How many users and searches per day? | Each search is several keystrokes, so request volume is a multiple of searches |
| Latency budget per keystroke | Suggestions slower than typing speed are useless; aim for well under 100 ms end to end |
| How fresh: daily rebuild or minutes? | Decides whether you need a real-time trending path next to the batch build |
| Global, per language or region, or personalized? | Each dimension multiplies the data you precompute |
| Prefix only, or typo tolerant? | Typo tolerance moves you toward a search engine or fuzzy automata |
| Any content that must never be suggested? | A filtering step in the pipeline, with a fast way to remove a suggestion |

## 3. Requirements

**Functional**

- Given a prefix, return the top 5 completions ranked by popularity (and later, by personal and regional signals).
- New popular queries appear within a stated time (say one day for the batch path, minutes for trending).
- Some suggestions can be blocked and removed quickly.

**Non-functional**

- 100 million daily active users.
- p99 server latency of a few milliseconds, so the round trip stays well under 100 ms.
- High availability; slightly stale suggestions are acceptable (this is a read-only, eventually consistent feature).

## 4. Capacity Estimate

Assumptions: 100 million daily users, 10 searches each per day, and 6 suggestion requests per search after the client debounces keystrokes (section 9). For storage, 10 million distinct queries worth suggesting, 20 characters on average, top-3 lists in the example (top-5 in production), 8 bytes per pointer. The example program does the arithmetic:

| Quantity | Calculation | Result |
| :--- | :--- | ---: |
| Suggestion requests per day | 100,000,000 x 10 x 6 | 6,000,000,000 |
| Average requests per second | 6,000,000,000 / 86,400, rounded up | 69,445 |
| Peak requests per second (2x) | 69,445 x 2 | 138,890 |
| Trie nodes, upper bound | 10,000,000 x 20 | 200,000,000 |
| Top-3 pointer lists, upper bound | 200,000,000 x 3 x 8 B | 4,800 MB |

What this tells you:

- **This is a high-QPS, read-only service.** 138,890 requests per second is more than the search backend itself sees, because every search is several keystrokes.
- **The data fits in memory.** Even the upper bound (shared prefixes make the real node count lower) is a few GB of pointers plus the query strings themselves, so each serving machine can hold a full copy and answer from RAM.
- **Debouncing is a capacity decision.** Without it, a 20-character query is up to 20 requests instead of 6.

## 5. API

~~~http
GET /suggest?q=ca&limit=5&lang=en
-> 200 { "prefix": "ca", "suggestions": ["car", "cat", "card", "camera", "call"] }
   Cache-Control: public, max-age=300
~~~

Short, cacheable \`GET\` requests. The response is the same for every user who typed the same prefix (until personalization), which makes it cacheable at the CDN and in the browser.

## 6. Deep Dive 1: The Trie With Top-k in Every Node

📌 **Interview term: trie (prefix tree)** — a tree where each edge is one character, so the path from the root to a node spells a prefix. All queries that start with "ca" live under the node for "ca".

<svg class="iq-diagram" width="100%" viewBox="0 0 720 330" role="img" aria-label="A trie: root to c to a, which branches to r and t; each node carries its cached top three list">
  <defs>
    <marker id="sd14q3-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <circle class="d-box" cx="70" cy="150" r="30"/>
  <text class="d-text" x="70" y="155" text-anchor="middle">root</text>
  <circle class="d-box" cx="210" cy="150" r="30"/>
  <text class="d-text" x="210" y="155" text-anchor="middle">c</text>
  <text class="d-sub" x="210" y="215" text-anchor="middle">car cat card</text>
  <line class="d-edge" x1="100" y1="150" x2="176" y2="150" marker-end="url(#sd14q3-arrow)"/>
  <circle class="d-box-accent" cx="360" cy="150" r="30"/>
  <text class="d-text" x="360" y="155" text-anchor="middle">ca</text>
  <text class="d-sub" x="360" y="215" text-anchor="middle">car cat card</text>
  <line class="d-edge" x1="240" y1="150" x2="326" y2="150" marker-end="url(#sd14q3-arrow)"/>
  <circle class="d-box" cx="530" cy="70" r="30"/>
  <text class="d-text" x="530" y="75" text-anchor="middle">car</text>
  <text class="d-sub" x="650" y="75" text-anchor="middle">car card care</text>
  <line class="d-edge" x1="388" y1="136" x2="500" y2="84" marker-end="url(#sd14q3-arrow)"/>
  <circle class="d-box" cx="530" cy="240" r="30"/>
  <text class="d-text" x="530" y="245" text-anchor="middle">cat</text>
  <text class="d-sub" x="650" y="245" text-anchor="middle">cat catalog cats</text>
  <line class="d-edge" x1="388" y1="164" x2="500" y2="226" marker-end="url(#sd14q3-arrow)"/>
</svg>

The small text by each node is its cached top-3 list; a lookup for "car" walks three nodes and returns that node list without looking further.

There are two ways to answer "top 3 for this prefix" from a trie:

1. **Search the subtree at query time**: walk to the prefix node, visit every node below it, collect all complete queries, sort by count, return the top 3.
2. **Precompute**: when building the trie, store at every node the top 3 completions of its subtree. A lookup is then just the walk to the prefix node.

📌 **Interview term: top-k per node** — the precomputed list of the k most popular completions stored at each trie node, so a lookup costs O(length of prefix) instead of O(size of subtree).

The example builds a trie from 16 queries with counts and runs both methods:

~~~text
"c" -> [car, cat, card]  nodes touched: cached 1, subtree search 28 (same: true)
"ca" -> [car, cat, card]  nodes touched: cached 2, subtree search 25 (same: true)
"car" -> [car, card, care]  nodes touched: cached 3, subtree search 10 (same: true)
"cat" -> [cat, catalog, cats]  nodes touched: cached 3, subtree search 9 (same: true)
~~~

Both return the same answer, but for the one-letter prefix "c" the cached version touched 1 node and the subtree search touched 28. In a real trie the subtree under "c" has millions of nodes, and short prefixes are exactly the ones typed most often (every query starts with a one-letter prefix), so precomputing is what makes the service fast.

The cost is memory and build time: 34 nodes stored 48 cached suggestion entries in the run, more than one per node. That is why production tries store **pointers or IDs** into a table of query strings, not the strings themselves, and why the top-k is small (5 to 10).

How the top-k is filled during the build: inserting a query with its count offers it to every node on its path; each node keeps the best k by count (ties broken alphabetically so results are deterministic):

~~~js
const offer = (n) => { n.top.push([word, count]); n.top.sort(better); if (n.top.length > K) n.top.pop(); };
~~~

📌 **Interview term: FST (finite state transducer)** — a compact automaton that shares both prefixes and suffixes, used by Lucene. The Elasticsearch completion suggester is backed by Lucene suggesters that use FSTs and is designed for fast prefix lookups (Elastic reference documentation, completion suggester page). It is the off-the-shelf alternative to hand-building a trie; how much of it sits in memory differs between versions, so check the documentation for the version you run.

## 7. Deep Dive 2: The Data Pipeline and Freshness

The trie is built offline, not updated in place on every search:

<svg class="iq-diagram" width="100%" viewBox="0 0 780 200" role="img" aria-label="Search logs flow to an aggregation job, then a filter step, then a trie builder, then serving nodes">
  <defs>
    <marker id="sd14q3-arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="10" y="60" width="130" height="70" rx="10"/>
  <text class="d-text" x="75" y="92" text-anchor="middle">search logs</text>
  <text class="d-sub" x="75" y="114" text-anchor="middle">every query</text>
  <rect class="d-box" x="210" y="60" width="130" height="70" rx="10"/>
  <text class="d-text" x="275" y="92" text-anchor="middle">aggregate</text>
  <text class="d-sub" x="275" y="114" text-anchor="middle">counts with decay</text>
  <line class="d-edge" x1="140" y1="95" x2="206" y2="95" marker-end="url(#sd14q3-arrow2)"/>
  <rect class="d-box" x="410" y="60" width="130" height="70" rx="10"/>
  <text class="d-text" x="475" y="92" text-anchor="middle">filter</text>
  <text class="d-sub" x="475" y="114" text-anchor="middle">blocklist, min count</text>
  <line class="d-edge" x1="340" y1="95" x2="406" y2="95" marker-end="url(#sd14q3-arrow2)"/>
  <rect class="d-box-accent" x="610" y="60" width="150" height="70" rx="10"/>
  <text class="d-text" x="685" y="92" text-anchor="middle">build tries</text>
  <text class="d-sub" x="685" y="114" text-anchor="middle">ship to servers</text>
  <line class="d-edge" x1="540" y1="95" x2="606" y2="95" marker-end="url(#sd14q3-arrow2)"/>
</svg>

Each stage runs as a batch job (daily or hourly); servers load the new trie next to the old one and switch over atomically, so a reader never sees a half-built tree.

- **Aggregate with time decay.** Raw all-time counts let old queries dominate forever. Weight each day so that recent searches count more, for example score = sum over days of count x 0.5^(age in days / 7), a one-week half-life.
- **Filter.** Drop queries below a minimum count (they are noise and can leak personal data typed into a search box), and apply a blocklist for offensive or legally problematic suggestions.
- **Build and ship** a trie per shard and language, as an immutable file that servers memory-map or load.

The example shows what a rebuild does when a query starts trending:

~~~text
"c" -> [chatgpt, car, cat]
"ch" -> [chatgpt, chat]
"ca" -> [car, cat, card]
~~~

Adding "chatgpt" with 5,000 searches pushed it to the top of "c" and "ch", and dropped "card" from "c", while "ca" was unaffected. Only nodes on the new query path changed.

**Trending in minutes, not a day.** A batch rebuild is too slow for breaking news. Add a small streaming path: count queries per prefix over the last few minutes (a stream processor with sliding windows reading the search log; see [the analytics pipeline design](/interview-question/how-would-you-design-an-analytics-metrics-pipeline)), keep a short "trending" list per popular prefix, and have the serving layer merge it with the trie result. The trending list is small because only queries whose recent rate jumps far above their usual rate qualify.

**Blocking a suggestion now.** Keep a small deny list that serving nodes check on every response, so a removal applies in seconds without waiting for the next build.

## 8. Deep Dive 3: Serving and Sharding

📌 **Interview term: sharding by prefix** — splitting the trie across machines by the first characters of the query, so each machine holds a part of the tree. The general idea and its hot-spot problems are covered in [database sharding](/interview-question/what-is-database-sharding).

- **Replicate before you shard.** If one trie fits in memory (a few GB here), every serving node holds the full copy and any node can answer any prefix: no routing and simple failover. Add replicas for QPS.
- **Shard when it does not fit**, for example with many languages or per-region tries. Sharding by first letter is uneven (far more queries start with "s" than with "x"), so split by ranges of prefixes sized by actual traffic (for example "s" alone might be split into "sa-sh" and "si-sz"), using a lookup table the router consults.
- **Cache short prefixes.** One- and two-character prefixes are few (62 x 62 at most for alphanumerics) and requested constantly, so the CDN (see [how a CDN works](/interview-question/what-is-a-cdn-and-how-does-it-work)) and an in-process cache can answer nearly all of them; the trie is consulted mostly for longer prefixes.

## 9. Deep Dive 4: The Client Matters

📌 **Interview term: debounce** — waiting until the user pauses typing (for example 100 ms) before sending a request, so a burst of keystrokes produces one request.

- **Debounce** keystrokes; this is the 6 requests per search in the estimate instead of one per character.
- **Cancel stale requests.** If the user types "car" while the "ca" response is in flight, discard the "ca" response when it arrives, or the list flickers backwards.
- **Cache in the browser.** Backspacing from "cart" to "car" should not hit the network again.
- **Reuse a longer prefix result.** If "car" returned fewer than k results, every extension of "car" is a subset of them, so filter locally instead of asking again.

## 10. Extensions

- **Personalization.** Precomputing per user is impossible at this scale. Fetch the global top 20 for the prefix, then re-rank with the user signals (recent searches, location) in the serving layer, and return the top 5.
- **Typo tolerance.** "chatgtp" should still suggest "chatgpt". Options: fuzzy matching with an edit-distance automaton, or a search engine with fuzzy prefix queries; both cost more per request than an exact trie walk.
- **Multiple languages and scripts.** Normalise case and accents before building and looking up; build per language.

## 11. What Breaks First at 10x

| At 1.4 million requests per second | Fix |
| :--- | :--- |
| Serving CPU | More replicas; CDN and browser caching of short prefixes take most of the load |
| Many languages and regions multiply trie size | Shard by language and region, then by prefix range |
| Hourly rebuild too slow for news | Streaming trending path merged at serve time |
| Hot prefixes after a big event | Edge caching with short TTLs; pre-warm on deploy |

## 12. Verified: Running the Code

What the program does: computes the capacity table, builds a trie from 16 queries with counts, storing the top 3 at every node, answers 7 prefixes both from the cached lists and by searching the whole subtree (counting nodes touched and checking the answers agree), and rebuilds with a trending query added. It leaves out persistence, sharding, decay weighting and the network.

Full output (identical in Node, Python, Go and Java):

~~~text
== capacity estimate ==
suggestion requests/day: 6000000000, avg 69445/s, peak (x2) 138890/s
trie upper bound: 200000000 nodes, top-3 lists: 4800 MB of pointers
== built from 16 queries: 34 nodes, 48 cached suggestion entries ==
"c" -> [car, cat, card]  nodes touched: cached 1, subtree search 28 (same: true)
"ca" -> [car, cat, card]  nodes touched: cached 2, subtree search 25 (same: true)
"car" -> [car, card, care]  nodes touched: cached 3, subtree search 10 (same: true)
"cat" -> [cat, catalog, cats]  nodes touched: cached 3, subtree search 9 (same: true)
"d" -> [dog, door, dot]  nodes touched: cached 1, subtree search 7 (same: true)
"do" -> [dog, door, dot]  nodes touched: cached 2, subtree search 7 (same: true)
"x" -> []  nodes touched: cached 1, subtree search 1 (same: true)
== next rebuild: chatgpt trends with 5000 searches ==
"c" -> [chatgpt, car, cat]
"ch" -> [chatgpt, chat]
"ca" -> [car, cat, card]
~~~

## 13. Edge Cases Worth Knowing

- **Prefix with no matches** ("x" in the run) must return an empty list quickly, not an error.
- **Privacy.** A rare query typed by one person (a name, an address) must never become a suggestion; minimum counts and filters exist for that.
- **Unicode.** Build the trie over normalised code points, not bytes, or multi-byte characters split across nodes.
- **Ties.** Equal counts need a deterministic tie-break (alphabetical in the run), or replicas return different orders for the same prefix.
- **Feedback loops.** Users click suggestions, which raises their counts, which keeps them suggested; consider counting only queries typed in full, or dampening clicks on suggestions.

## Common Pitfalls

- **Searching the subtree on every keystroke.** It touched 28 nodes instead of 1 for "c" in a 34-node trie; in production that is millions.
- **Updating the trie in place on every search.** Writes contend with reads at 138,890 requests per second; build offline and swap atomically.
- **Ignoring keystroke multiplication.** Sizing for searches per second rather than suggestion requests per second underestimates load several times over.
- **Using \`LIKE 'ca%'\` on the main database.** It cannot rank by popularity cheaply and puts autocomplete load on the database.
- **No filtering step.** Offensive or private suggestions are a product and legal problem, not just a ranking issue.
- **Forgetting the client.** Without debounce and stale-response handling the server takes far more load and the UI flickers.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify and size:</strong> <span style="color:#f0e2c8;">I would ask freshness, ranking signals and typo tolerance. Then size from keystrokes: 100 million users, 10 searches each and 6 requests per search after debouncing is 6 billion requests a day, about 69,445 per second and 138,890 at peak.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Core structure:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">trie</strong> where every node stores its precomputed <strong style="color:#ffca28;">top-k</strong> completions. A lookup walks the prefix and returns that list: in my run "c" touched 1 node instead of 28 for a subtree search, with the same answer.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Pipeline:</strong> <span style="color:#f0e2c8;">Search logs are aggregated with time decay, filtered for minimum counts and a blocklist, built into tries offline, and swapped in atomically. A streaming path tracks trending queries over minutes and is merged at serve time; a deny list applies removals in seconds.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Serving:</strong> <span style="color:#f0e2c8;">The trie fits in memory, so I replicate full copies first and shard by traffic-sized prefix ranges only when it stops fitting. Short prefixes are cached at the CDN and in the browser because they are few and requested constantly.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Client and extensions:</strong> <span style="color:#f0e2c8;">Debounce, cancel stale responses, cache locally. Personalization re-ranks a global top 20 per request; typo tolerance needs fuzzy matching or a search engine such as the Elasticsearch completion suggester.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not query Elasticsearch or the database on every keystroke?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LIKE 'prefix%'</code> query cannot rank by popularity cheaply and the database is the wrong place for 138,890 requests per second. A search engine works and adds fuzzy matching, at a higher cost per request; a precomputed trie in memory is the cheapest path for pure prefix lookups.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you update counts without rebuilding everything?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Rebuild on a schedule from aggregated logs, because only nodes on the changed queries' paths change, as the run showed with "chatgpt". For minutes-level freshness, keep a separate streaming trending list and merge it in the serving layer instead of mutating the trie.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How much memory does it take?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Upper bound from my estimate: 10 million queries of 20 characters is at most 200 million nodes, and top-3 pointer lists are 4,800 MB; shared prefixes make the real figure lower. Store IDs, not strings, in the lists, and keep k small.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you shard it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">First replicate, since it fits in RAM. When it does not, shard by prefix ranges sized by actual traffic, not by first letter, because letters are very uneven; a router maps prefix ranges to shards.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you personalize?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Take the global top 20 for the prefix and re-rank with the user's recent searches and location at request time, then return 5. Precomputing per-user tries does not scale to 100 million users.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Trie (prefix tree) | Tree where each edge is a character, so each node is a prefix |
| Top-k per node | Precomputed best k completions stored at every trie node |
| FST (finite state transducer) | Compact automaton sharing prefixes and suffixes, used by Lucene suggesters |
| Sharding by prefix | Splitting the trie across machines by prefix ranges |
| Debounce | Waiting for a pause in typing before sending a request |

**Conclusion:** Typeahead is a read-heavy, latency-critical service where all the hard work happens ahead of time. Sizing from keystrokes gives about 69,445 requests per second on average and 138,890 at peak; a trie with the top-k precomputed at each node turns each lookup into a walk of the prefix (1 node instead of 28 for "c" in the run); an offline pipeline with time decay and filtering rebuilds it, a streaming path handles trending queries, full in-memory replicas serve it, and the client debounces and caches. Say those five pieces with the numbers and you have the answer.`,
    examples: [
      {
        label: `Typeahead trie with top-k cached in every node vs searching the subtree on each keystroke`,
        variants: [
          { tech: "node", code: `// Typeahead: a trie that stores the top-k completions in every node, versus searching the subtree per keystroke.
const K = 3;

console.log("== capacity estimate ==");
const dau = 100000000, searchesPerUser = 10, requestsPerSearch = 6; // after a 100 ms debounce
const perDay = dau * searchesPerUser * requestsPerSearch;
const avgQps = Math.ceil(perDay / 86400);
console.log("suggestion requests/day: " + perDay + ", avg " + avgQps + "/s, peak (x2) " + avgQps * 2 + "/s");
const queries = 10000000, avgLen = 20, bytesPerEntry = 8;
console.log("trie upper bound: " + queries * avgLen + " nodes, top-" + K + " lists: " + (queries * avgLen * K * bytesPerEntry) / 1000000 + " MB of pointers");

function better(a, b) { return a[1] !== b[1] ? b[1] - a[1] : a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; }

class Trie {
  constructor() { this.root = { kids: new Map(), top: [], end: 0 }; this.nodes = 1; }
  insert(word, count) {
    let node = this.root;
    const offer = (n) => { n.top.push([word, count]); n.top.sort(better); if (n.top.length > K) n.top.pop(); };
    offer(node);
    for (const ch of word) {
      if (!node.kids.has(ch)) { node.kids.set(ch, { kids: new Map(), top: [], end: 0 }); this.nodes++; }
      node = node.kids.get(ch);
      offer(node);
    }
    node.end = count;
  }
  walk(prefix) {
    let node = this.root, steps = 0;
    for (const ch of prefix) { node = node.kids.get(ch); steps++; if (!node) return [null, steps]; }
    return [node, steps];
  }
  fast(prefix) { const [n, steps] = this.walk(prefix); return [n ? n.top.map((e) => e[0]) : [], steps]; }
  slow(prefix) { // no cached lists: collect every completion below the prefix, then sort
    const [n, steps] = this.walk(prefix);
    if (!n) return [[], steps];
    const found = [];
    let visited = 0;
    const dfs = (node, path) => {
      visited++;
      if (node.end) found.push([path, node.end]);
      for (const [ch, kid] of node.kids) dfs(kid, path + ch);
    };
    dfs(n, prefix);
    found.sort(better);
    return [found.slice(0, K).map((e) => e[0]), steps + visited];
  }
  stored() { let s = 0; const go = (n) => { s += n.top.length; for (const kid of n.kids.values()) go(kid); }; go(this.root); return s; }
}

const log = [["car", 900], ["cat", 800], ["card", 700], ["camera", 650], ["dog", 600], ["chat", 550], ["call", 500],
  ["can", 450], ["care", 400], ["cake", 350], ["cart", 300], ["door", 300], ["carpet", 250], ["catalog", 200], ["cats", 150], ["dot", 100]];
const build = (entries) => { const t = new Trie(); for (const [w, c] of entries) t.insert(w, c); return t; };
let trie = build(log);
console.log("== built from " + log.length + " queries: " + trie.nodes + " nodes, " + trie.stored() + " cached suggestion entries ==");
for (const p of ["c", "ca", "car", "cat", "d", "do", "x"]) {
  const [f, fw] = trie.fast(p);
  const [s, sw] = trie.slow(p);
  console.log(JSON.stringify(p) + " -> [" + f.join(", ") + "]  nodes touched: cached " + fw + ", subtree search " + sw + " (same: " + (f.join() === s.join()) + ")");
}

console.log("== next rebuild: chatgpt trends with 5000 searches ==");
trie = build(log.concat([["chatgpt", 5000]]));
for (const p of ["c", "ch", "ca"]) console.log(JSON.stringify(p) + " -> [" + trie.fast(p)[0].join(", ") + "]");` },
          { tech: "python", code: `# Typeahead: a trie that stores the top-k completions in every node, versus searching the subtree per keystroke.
import math

K = 3

print("== capacity estimate ==")
dau, searches_per_user, requests_per_search = 100000000, 10, 6  # after a 100 ms debounce
per_day = dau * searches_per_user * requests_per_search
avg_qps = math.ceil(per_day / 86400)
print(f"suggestion requests/day: {per_day}, avg {avg_qps}/s, peak (x2) {avg_qps * 2}/s")
queries, avg_len, bytes_per_entry = 10000000, 20, 8
print(f"trie upper bound: {queries * avg_len} nodes, top-{K} lists: {queries * avg_len * K * bytes_per_entry // 1000000} MB of pointers")


def rank(e):
    return (-e[1], e[0])


class Node:
    def __init__(self):
        self.kids = {}
        self.top = []
        self.end = 0


class Trie:
    def __init__(self):
        self.root = Node()
        self.nodes = 1

    def insert(self, word, count):
        def offer(n):
            n.top.append((word, count))
            n.top.sort(key=rank)
            if len(n.top) > K:
                n.top.pop()

        node = self.root
        offer(node)
        for ch in word:
            if ch not in node.kids:
                node.kids[ch] = Node()
                self.nodes += 1
            node = node.kids[ch]
            offer(node)
        node.end = count

    def walk(self, prefix):
        node, steps = self.root, 0
        for ch in prefix:
            node = node.kids.get(ch)
            steps += 1
            if node is None:
                return None, steps
        return node, steps

    def fast(self, prefix):
        n, steps = self.walk(prefix)
        return ([e[0] for e in n.top] if n else []), steps

    def slow(self, prefix):  # no cached lists: collect every completion below the prefix, then sort
        n, steps = self.walk(prefix)
        if n is None:
            return [], steps
        found = []
        visited = 0

        def dfs(node, path):
            nonlocal visited
            visited += 1
            if node.end:
                found.append((path, node.end))
            for ch, kid in node.kids.items():
                dfs(kid, path + ch)

        dfs(n, prefix)
        found.sort(key=rank)
        return [e[0] for e in found[:K]], steps + visited

    def stored(self):
        total = 0
        stack = [self.root]
        while stack:
            n = stack.pop()
            total += len(n.top)
            stack.extend(n.kids.values())
        return total


log = [("car", 900), ("cat", 800), ("card", 700), ("camera", 650), ("dog", 600), ("chat", 550), ("call", 500),
       ("can", 450), ("care", 400), ("cake", 350), ("cart", 300), ("door", 300), ("carpet", 250), ("catalog", 200), ("cats", 150), ("dot", 100)]


def build(entries):
    t = Trie()
    for w, c in entries:
        t.insert(w, c)
    return t


trie = build(log)
print(f"== built from {len(log)} queries: {trie.nodes} nodes, {trie.stored()} cached suggestion entries ==")
for p in ["c", "ca", "car", "cat", "d", "do", "x"]:
    f, fw = trie.fast(p)
    s, sw = trie.slow(p)
    same = "true" if f == s else "false"
    print(f'"{p}" -> [{", ".join(f)}]  nodes touched: cached {fw}, subtree search {sw} (same: {same})')

print("== next rebuild: chatgpt trends with 5000 searches ==")
trie = build(log + [("chatgpt", 5000)])
for p in ["c", "ch", "ca"]:
    print(f'"{p}" -> [{", ".join(trie.fast(p)[0])}]')` },
          { tech: "go", code: `// Typeahead: a trie that stores the top-k completions in every node, versus searching the subtree per keystroke.
package main

import (
	"fmt"
	"sort"
	"strings"
)

const K = 3

type entry struct {
	word  string
	count int
}

type node struct {
	kids map[rune]*node
	top  []entry
	end  int
}

func less(a, b entry) bool {
	if a.count != b.count {
		return a.count > b.count
	}
	return a.word < b.word
}

type trie struct {
	root  *node
	nodes int
}

func newNode() *node { return &node{kids: map[rune]*node{}} }

func (t *trie) insert(word string, count int) {
	offer := func(n *node) {
		n.top = append(n.top, entry{word, count})
		sort.Slice(n.top, func(i, j int) bool { return less(n.top[i], n.top[j]) })
		if len(n.top) > K {
			n.top = n.top[:K]
		}
	}
	n := t.root
	offer(n)
	for _, ch := range word {
		if _, ok := n.kids[ch]; !ok {
			n.kids[ch] = newNode()
			t.nodes++
		}
		n = n.kids[ch]
		offer(n)
	}
	n.end = count
}

func (t *trie) walk(prefix string) (*node, int) {
	n, steps := t.root, 0
	for _, ch := range prefix {
		n = n.kids[ch]
		steps++
		if n == nil {
			return nil, steps
		}
	}
	return n, steps
}

func words(es []entry) []string {
	out := []string{}
	for _, e := range es {
		out = append(out, e.word)
	}
	return out
}

func (t *trie) fast(prefix string) ([]string, int) {
	n, steps := t.walk(prefix)
	if n == nil {
		return []string{}, steps
	}
	return words(n.top), steps
}

func (t *trie) slow(prefix string) ([]string, int) { // no cached lists: collect every completion below the prefix, then sort
	n, steps := t.walk(prefix)
	if n == nil {
		return []string{}, steps
	}
	found := []entry{}
	visited := 0
	var dfs func(*node, string)
	dfs = func(nd *node, path string) {
		visited++
		if nd.end > 0 {
			found = append(found, entry{path, nd.end})
		}
		for ch, kid := range nd.kids {
			dfs(kid, path+string(ch))
		}
	}
	dfs(n, prefix)
	sort.Slice(found, func(i, j int) bool { return less(found[i], found[j]) })
	if len(found) > K {
		found = found[:K]
	}
	return words(found), steps + visited
}

func (t *trie) stored() int {
	total := 0
	var go_ func(*node)
	go_ = func(n *node) {
		total += len(n.top)
		for _, kid := range n.kids {
			go_(kid)
		}
	}
	go_(t.root)
	return total
}

func build(entries []entry) *trie {
	t := &trie{root: newNode(), nodes: 1}
	for _, e := range entries {
		t.insert(e.word, e.count)
	}
	return t
}

func main() {
	fmt.Println("== capacity estimate ==")
	dau, searchesPerUser, requestsPerSearch := 100000000, 10, 6 // after a 100 ms debounce
	perDay := dau * searchesPerUser * requestsPerSearch
	avgQps := (perDay + 86399) / 86400
	fmt.Printf("suggestion requests/day: %d, avg %d/s, peak (x2) %d/s\\n", perDay, avgQps, avgQps*2)
	queries, avgLen, bytesPerEntry := 10000000, 20, 8
	fmt.Printf("trie upper bound: %d nodes, top-%d lists: %d MB of pointers\\n", queries*avgLen, K, queries*avgLen*K*bytesPerEntry/1000000)

	log := []entry{{"car", 900}, {"cat", 800}, {"card", 700}, {"camera", 650}, {"dog", 600}, {"chat", 550}, {"call", 500},
		{"can", 450}, {"care", 400}, {"cake", 350}, {"cart", 300}, {"door", 300}, {"carpet", 250}, {"catalog", 200}, {"cats", 150}, {"dot", 100}}
	t := build(log)
	fmt.Printf("== built from %d queries: %d nodes, %d cached suggestion entries ==\\n", len(log), t.nodes, t.stored())
	for _, p := range []string{"c", "ca", "car", "cat", "d", "do", "x"} {
		f, fw := t.fast(p)
		s, sw := t.slow(p)
		same := strings.Join(f, ",") == strings.Join(s, ",")
		fmt.Printf("\\"%s\\" -> [%s]  nodes touched: cached %d, subtree search %d (same: %t)\\n", p, strings.Join(f, ", "), fw, sw, same)
	}

	fmt.Println("== next rebuild: chatgpt trends with 5000 searches ==")
	t = build(append(log, entry{"chatgpt", 5000}))
	for _, p := range []string{"c", "ch", "ca"} {
		f, _ := t.fast(p)
		fmt.Printf("\\"%s\\" -> [%s]\\n", p, strings.Join(f, ", "))
	}
}` },
          { tech: "java", code: `// Typeahead: a trie that stores the top-k completions in every node, versus searching the subtree per keystroke.
import java.util.*;

public class Main {
    static final int K = 3;

    record Entry(String word, int count) {}

    static final Comparator<Entry> RANK = Comparator.comparingInt((Entry e) -> -e.count()).thenComparing(Entry::word);

    static class Node {
        Map<Character, Node> kids = new HashMap<>();
        List<Entry> top = new ArrayList<>();
        int end = 0;
    }

    static class Trie {
        Node root = new Node();
        int nodes = 1;

        void offer(Node n, Entry e) {
            n.top.add(e);
            n.top.sort(RANK);
            if (n.top.size() > K) n.top.remove(n.top.size() - 1);
        }

        void insert(String word, int count) {
            Entry e = new Entry(word, count);
            Node n = root;
            offer(n, e);
            for (char ch : word.toCharArray()) {
                if (!n.kids.containsKey(ch)) { n.kids.put(ch, new Node()); nodes++; }
                n = n.kids.get(ch);
                offer(n, e);
            }
            n.end = count;
        }

        Object[] walk(String prefix) {
            Node n = root;
            int steps = 0;
            for (char ch : prefix.toCharArray()) {
                n = n.kids.get(ch);
                steps++;
                if (n == null) return new Object[] {null, steps};
            }
            return new Object[] {n, steps};
        }

        static List<String> words(List<Entry> es) {
            List<String> out = new ArrayList<>();
            for (Entry e : es) out.add(e.word());
            return out;
        }

        Object[] fast(String prefix) {
            Object[] w = walk(prefix);
            Node n = (Node) w[0];
            return new Object[] {n == null ? new ArrayList<String>() : words(n.top), w[1]};
        }

        int visited;

        void dfs(Node n, String path, List<Entry> found) {
            visited++;
            if (n.end > 0) found.add(new Entry(path, n.end));
            for (Map.Entry<Character, Node> kid : n.kids.entrySet()) dfs(kid.getValue(), path + kid.getKey(), found);
        }

        Object[] slow(String prefix) { // no cached lists: collect every completion below the prefix, then sort
            Object[] w = walk(prefix);
            Node n = (Node) w[0];
            if (n == null) return new Object[] {new ArrayList<String>(), w[1]};
            List<Entry> found = new ArrayList<>();
            visited = 0;
            dfs(n, prefix, found);
            found.sort(RANK);
            return new Object[] {words(found.subList(0, Math.min(K, found.size()))), (int) w[1] + visited};
        }

        int stored() {
            int total = 0;
            Deque<Node> stack = new ArrayDeque<>();
            stack.push(root);
            while (!stack.isEmpty()) { Node n = stack.pop(); total += n.top.size(); n.kids.values().forEach(stack::push); }
            return total;
        }
    }

    static Trie build(List<Entry> entries) {
        Trie t = new Trie();
        for (Entry e : entries) t.insert(e.word(), e.count());
        return t;
    }

    @SuppressWarnings("unchecked")
    public static void main(String[] args) {
        System.out.println("== capacity estimate ==");
        long dau = 100000000L, searchesPerUser = 10, requestsPerSearch = 6; // after a 100 ms debounce
        long perDay = dau * searchesPerUser * requestsPerSearch;
        long avgQps = (perDay + 86399) / 86400;
        System.out.println("suggestion requests/day: " + perDay + ", avg " + avgQps + "/s, peak (x2) " + avgQps * 2 + "/s");
        long queries = 10000000L, avgLen = 20, bytesPerEntry = 8;
        System.out.println("trie upper bound: " + queries * avgLen + " nodes, top-" + K + " lists: " + queries * avgLen * K * bytesPerEntry / 1000000 + " MB of pointers");

        List<Entry> log = new ArrayList<>(List.of(new Entry("car", 900), new Entry("cat", 800), new Entry("card", 700), new Entry("camera", 650),
            new Entry("dog", 600), new Entry("chat", 550), new Entry("call", 500), new Entry("can", 450), new Entry("care", 400), new Entry("cake", 350),
            new Entry("cart", 300), new Entry("door", 300), new Entry("carpet", 250), new Entry("catalog", 200), new Entry("cats", 150), new Entry("dot", 100)));
        Trie t = build(log);
        System.out.println("== built from " + log.size() + " queries: " + t.nodes + " nodes, " + t.stored() + " cached suggestion entries ==");
        for (String p : new String[] {"c", "ca", "car", "cat", "d", "do", "x"}) {
            Object[] f = t.fast(p), s = t.slow(p);
            List<String> fl = (List<String>) f[0], sl = (List<String>) s[0];
            System.out.println("\\"" + p + "\\" -> [" + String.join(", ", fl) + "]  nodes touched: cached " + f[1] + ", subtree search " + s[1] + " (same: " + fl.equals(sl) + ")");
        }

        System.out.println("== next rebuild: chatgpt trends with 5000 searches ==");
        log.add(new Entry("chatgpt", 5000));
        t = build(log);
        for (String p : new String[] {"c", "ch", "ca"}) {
            System.out.println("\\"" + p + "\\" -> [" + String.join(", ", (List<String>) t.fast(p)[0]) + "]");
        }
    }
}` },
        ],
      },
    ],
  },
  {
    title: `How would you design a Web Crawler?`,
    difficulty: "hard",
    seoDescription: `Design a web crawler: capacity math, a URL frontier with per-host politeness, robots.txt (RFC 9309), URL and content dedup, traps and recrawl scheduling.`,
    description: `**Question presented to candidate:**
"We need to build a crawler that downloads about a billion web pages a month for a search index. Walk me through the architecture. How do you stay polite to websites, avoid downloading the same thing twice, and not get stuck?"

**What a strong answer should cover:**
- A worked capacity estimate: pages per second, bandwidth, storage per month, and the number of hosts that must be crawled in parallel because of per-host politeness
- The pipeline: seeds, **URL frontier**, DNS resolution, fetchers, parser and link extractor, deduplication, content store, with the frontier as the central data structure
- **Politeness**: one connection and a delay per host, \`robots.txt\` (standardised as RFC 9309; \`Crawl-delay\` is not part of it), and a frontier with priority queues in front and **per-host queues** behind, as in the Mercator design
- **Deduplication** at two levels: normalised URLs (a seen set or Bloom filter) and page content (exact fingerprints, near-duplicate detection with SimHash)
- **Crawler traps**, per-host budgets and depth limits; recrawl scheduling by change rate with conditional GETs; partitioning the frontier by host across machines

**Clarifying questions expected:**
- What is the crawl for (search index, price monitoring, archive), and so which pages matter most?
- How fresh must the data be: one pass, or continuous recrawling?
- Do we need to render JavaScript, or is raw HTML enough?

**Code / implementation expected:** Optional — a URL frontier with per-host delays, robots rules and dedup; the example simulates exactly that, including a crawler trap.`,
    answer: `**Target Audience:** Engineers preparing for a system design round; no prior knowledge of crawling or search engines is assumed, and every term is defined when it first appears.
**Difficulty:** Hard
**Verified with:** Node 22.22 and Python 3.12 (both print identical output). The robots.txt standard (RFC 9309) and search engine handling of \`Crawl-delay\` checked against the RFC and Google Search Central in October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. The capacity numbers and the crawl log come from the example program; the **Verified** section quotes its full output.

## 1. Why This Even Matters — A Story First

Imagine you are asked to photograph every shop window in a huge city, and to do it again every few weeks. You have a team of photographers and a map that is incomplete: every shop you visit has flyers for other shops, which is how you discover new streets.

You quickly learn some rules. Do not send fifty photographers into the same small shop at once; the owner will throw you out (**politeness**). Respect "no photos" signs on the door (**robots.txt**). Keep a list of shops already photographed so you do not visit twice (**deduplication**). Watch out for the hall of mirrors that seems to have infinite rooms (**crawler traps**). And revisit the busy high-street shops more often than the sleepy ones (**recrawl scheduling**).

A web crawler is that team. The flyers are links, the shops are pages, and the to-visit list is the **URL frontier**. The interview is about making that list fair to every website while keeping hundreds of fetchers busy.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What is the crawl for? | A search index wants important and fresh pages first; an archive wants breadth; a price monitor wants a few sites very often |
| How many pages, and how fast? | Sets fetch rate, bandwidth and storage |
| One pass, or continuous recrawl? | Continuous crawling needs change-rate estimates and a recrawl scheduler |
| HTML only, or JavaScript rendering? | Rendering runs a headless browser per page, far more CPU and memory than parsing HTML |
| What content types: HTML, PDFs, images? | Changes parsers, sizes and storage |
| Any sites we must not crawl, or crawl only with permission? | Allow lists, deny lists and legal constraints beyond robots.txt |

## 3. Requirements

**Functional**

- Start from seed URLs; fetch pages, extract links, add new URLs to the frontier, repeat.
- Obey \`robots.txt\` and a per-host rate limit.
- Store the raw page and metadata (URL, fetch time, status, content hash) for the indexer.
- Recrawl pages at a rate that matches how often they change.

**Non-functional**

- 1 billion pages per month.
- Politeness: at most one request per second to any single host by default.
- Robust to malformed HTML, slow servers, infinite URL spaces and hostile content.
- Horizontally scalable: more machines means more pages per second.

## 4. Capacity Estimate

Assumptions: 1 billion pages per month, 100 KB per page on average (HTML only), and a politeness delay of 1 second per host. The example program does the arithmetic:

| Quantity | Calculation | Result |
| :--- | :--- | ---: |
| Pages per second | 1,000,000,000 / (30 x 86,400), rounded up | 386 |
| Download bandwidth | 386 x 100 KB | 38.6 MB/s |
| Raw storage per month | 1,000,000,000 x 100 KB | 100 TB |
| Hosts crawled in parallel | 386 pages/s x 1 s delay per host | at least 386 |
| URL seen set as 8-byte fingerprints | 1,000,000,000 x 8 B | 8 GB |
| Bloom filter for 1 billion URLs at 1% false positives | 9.6 bits per URL | about 1.2 GB |

What the numbers tell you:

- **Bandwidth and storage are manageable**: 38.6 MB/s is a few servers' worth of network, and 100 TB a month (less after compression) is object storage.
- **The real constraint is politeness.** With one request per second per host, you need at least 386 different hosts in flight at every moment. A crawler that works through one site at a time is far too slow; the frontier must interleave many hosts.
- **The seen set fits in memory on a few machines**, especially as a Bloom filter (see [Bloom filters](/interview-question/what-is-a-bloom-filter-and-when-is-it-useful)).

📌 **Interview term: politeness** — limiting how hard the crawler hits any single website: one connection at a time per host and a delay between requests, so the crawler never looks like a denial-of-service attack.

## 5. High-Level Architecture

<svg class="iq-diagram" width="100%" viewBox="0 0 780 380" role="img" aria-label="Seeds feed the URL frontier; fetchers take URLs, resolve DNS, download pages; the parser extracts links and content; dedup checks send new URLs back to the frontier and new content to the store">
  <defs>
    <marker id="sd14q4-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="110" height="60" rx="10"/>
  <text class="d-text" x="75" y="76" text-anchor="middle">seeds</text>
  <rect class="d-box-accent" x="190" y="30" width="160" height="80" rx="10"/>
  <text class="d-text" x="270" y="64" text-anchor="middle">URL frontier</text>
  <text class="d-sub" x="270" y="88" text-anchor="middle">priority and politeness</text>
  <line class="d-edge" x1="130" y1="70" x2="186" y2="70" marker-end="url(#sd14q4-arrow)"/>
  <rect class="d-box" x="420" y="30" width="150" height="80" rx="10"/>
  <text class="d-text" x="495" y="64" text-anchor="middle">fetchers</text>
  <text class="d-sub" x="495" y="88" text-anchor="middle">robots, DNS cache</text>
  <line class="d-edge" x1="350" y1="70" x2="416" y2="70" marker-end="url(#sd14q4-arrow)"/>
  <rect class="d-box" x="620" y="30" width="140" height="80" rx="10"/>
  <text class="d-text" x="690" y="64" text-anchor="middle">parser</text>
  <text class="d-sub" x="690" y="88" text-anchor="middle">links and text</text>
  <line class="d-edge" x1="570" y1="70" x2="616" y2="70" marker-end="url(#sd14q4-arrow)"/>
  <rect class="d-box" x="420" y="200" width="150" height="80" rx="10"/>
  <text class="d-text" x="495" y="234" text-anchor="middle">URL dedup</text>
  <text class="d-sub" x="495" y="258" text-anchor="middle">normalise, seen set</text>
  <line class="d-edge" x1="660" y1="110" x2="574" y2="210" marker-end="url(#sd14q4-arrow)"/>
  <line class="d-edge-accent" x1="420" y1="230" x2="300" y2="114" marker-end="url(#sd14q4-arrow)"/>
  <rect class="d-box" x="620" y="200" width="140" height="80" rx="10"/>
  <text class="d-text" x="690" y="234" text-anchor="middle">content dedup</text>
  <text class="d-sub" x="690" y="258" text-anchor="middle">fingerprints</text>
  <line class="d-edge" x1="700" y1="110" x2="700" y2="196" marker-end="url(#sd14q4-arrow)"/>
  <rect class="d-box-muted" x="620" y="320" width="140" height="50" rx="10"/>
  <text class="d-text" x="690" y="350" text-anchor="middle">page store</text>
  <line class="d-edge" x1="690" y1="280" x2="690" y2="316" marker-end="url(#sd14q4-arrow)"/>
</svg>

URLs flow from the frontier to fetchers to the parser; new links go back to the frontier only if they pass URL dedup, and pages go to the store only if their content is new.

- **URL frontier**: what to fetch next, honouring priority and politeness (section 6).
- **Fetchers**: many concurrent HTTP clients (asynchronous I/O, hundreds of connections per machine). They read \`robots.txt\` per host (cached), resolve DNS through a local cache (DNS can easily become the bottleneck; see [DNS resolution](/interview-question/how-does-dns-resolution-work)), set timeouts and a maximum page size.
- **Parser**: extracts links and text from HTML; resolves relative links against the page URL.
- **URL dedup**: normalises each link and checks a seen set before it reaches the frontier.
- **Content dedup**: fingerprints the page content so mirrors and copies are stored once.
- **Page store**: raw pages in object storage plus a metadata table (URL, status, fetch time, hash, next recrawl time).

## 6. Deep Dive 1: The URL Frontier and Politeness

📌 **Interview term: URL frontier** — the data structure holding URLs discovered but not yet fetched, which decides the order of crawling. It is the heart of the design.

A plain FIFO queue fails twice: links on a page mostly point to the same host, so the head of the queue is a run of URLs for one site (impolite, and fetchers sit idle waiting for the delay), and important pages wait behind unimportant ones.

The classic answer, from the Mercator crawler (Heydon and Najork, 1999) and the textbook *Introduction to Information Retrieval* by Manning, Raghavan and Schütze, splits the frontier in two:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="Prioritizer feeds front queues by priority; a router moves URLs into back queues, one per host; a heap of next allowed times picks which back queue a fetcher takes from">
  <defs>
    <marker id="sd14q4-arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="110" width="120" height="70" rx="10"/>
  <text class="d-text" x="80" y="142" text-anchor="middle">prioritizer</text>
  <text class="d-sub" x="80" y="164" text-anchor="middle">rank, change rate</text>
  <rect class="d-box" x="200" y="30" width="140" height="50" rx="8"/>
  <text class="d-text" x="270" y="60" text-anchor="middle">front: high</text>
  <rect class="d-box" x="200" y="120" width="140" height="50" rx="8"/>
  <text class="d-text" x="270" y="150" text-anchor="middle">front: medium</text>
  <rect class="d-box" x="200" y="210" width="140" height="50" rx="8"/>
  <text class="d-text" x="270" y="240" text-anchor="middle">front: low</text>
  <line class="d-edge" x1="140" y1="130" x2="196" y2="60" marker-end="url(#sd14q4-arrow2)"/>
  <line class="d-edge" x1="140" y1="145" x2="196" y2="145" marker-end="url(#sd14q4-arrow2)"/>
  <line class="d-edge" x1="140" y1="160" x2="196" y2="232" marker-end="url(#sd14q4-arrow2)"/>
  <rect class="d-box-accent" x="410" y="30" width="140" height="50" rx="8"/>
  <text class="d-text" x="480" y="60" text-anchor="middle">back: a.com</text>
  <rect class="d-box-accent" x="410" y="120" width="140" height="50" rx="8"/>
  <text class="d-text" x="480" y="150" text-anchor="middle">back: b.com</text>
  <rect class="d-box-accent" x="410" y="210" width="140" height="50" rx="8"/>
  <text class="d-text" x="480" y="240" text-anchor="middle">back: c.com</text>
  <line class="d-edge-dashed" x1="340" y1="145" x2="406" y2="60" marker-end="url(#sd14q4-arrow2)"/>
  <line class="d-edge-dashed" x1="340" y1="145" x2="406" y2="145" marker-end="url(#sd14q4-arrow2)"/>
  <line class="d-edge-dashed" x1="340" y1="145" x2="406" y2="232" marker-end="url(#sd14q4-arrow2)"/>
  <rect class="d-box" x="610" y="110" width="130" height="70" rx="10"/>
  <text class="d-text" x="675" y="142" text-anchor="middle">heap</text>
  <text class="d-sub" x="675" y="164" text-anchor="middle">next allowed time</text>
  <line class="d-edge" x1="550" y1="145" x2="606" y2="145" marker-end="url(#sd14q4-arrow2)"/>
</svg>

Front queues decide **what matters**; back queues, one per host, decide **when each host may be contacted**; the heap hands the next fetcher the host whose waiting time has passed.

📌 **Interview term: front queues and back queues** — front queues order URLs by priority (page importance, how often it changes); back queues hold URLs for one host each, and a heap keyed by each host's next allowed fetch time enforces the per-host delay while keeping fetchers busy with other hosts.

The example implements the back-queue half with a fake clock (each fetch takes 100 ms) and per-host delays from \`robots.txt\` (1 s for a.com and c.com, 2 s for b.com):

~~~text
t=0ms http://a.com/ stored, links found: 4
t=100ms http://b.com/ stored, links found: 2
t=200ms http://c.com/calendar?day=1 stored, links found: 1
t=1100ms http://a.com/news stored, links found: 3
t=1300ms http://c.com/calendar?day=2 stored, links found: 1
~~~

While a.com was cooling down for its 1 second, the crawler fetched b.com and c.com instead of waiting. Across the whole run no host saw more than 1 fetch in any 1-second window; the same crawl with no delays finished in 1,200 ms instead of 4,700 ms, but hit a single host 5 times within one second. Scale those numbers up and you see why the frontier must hold many more hosts than fetchers: the Mercator authors suggested about three times as many back queues as fetcher threads.

📌 **Interview term: robots.txt** — a file at \`/robots.txt\` on each host listing paths crawlers may not fetch, per user agent. It was standardised as **RFC 9309** (Robots Exclusion Protocol, September 2022). \`Crawl-delay\` is not part of the RFC; Google Search Central states that Google does not support it, while some other engines (Bing among them) document support for it. So the crawler needs its own default per-host rate and should back off on \`429\` and \`503\` responses regardless.

In the run, \`http://a.com/private/admin\` was never fetched because a.com disallows \`/private\` (1 URL blocked by robots.txt). Cache \`robots.txt\` per host (RFC 9309 says crawlers should not use a cached copy for more than 24 hours unless the file is unreachable), and treat a failure to fetch it carefully: the RFC says a 4xx means the crawler may access any resource, while a 5xx or unreachable server means it should assume complete disallow.

## 7. Deep Dive 2: Deduplication at Two Levels

**URL level.** Many different strings name the same page. Normalise before checking the seen set: lowercase scheme and host, remove the \`#fragment\`, remove default ports, resolve \`.\` and \`..\`, remove a trailing slash, and optionally sort query parameters and strip tracking parameters (\`utm_*\`).

📌 **Interview term: URL normalization (canonicalization)** — rewriting URLs into one standard form so that equivalent URLs compare equal. In the run, \`http://A.com/news#top\` and \`http://a.com/about/\` became \`http://a.com/news\` and \`http://a.com/about\`.

After normalising, a seen set (8 GB of 8-byte fingerprints for a billion URLs, or about 1.2 GB as a Bloom filter at 1% false positives) answers "have we queued this before?". The run skipped 2 duplicate URLs. A Bloom filter false positive means a new URL is wrongly skipped, which is acceptable for a crawler at 1%; it never causes a duplicate fetch.

**Content level.** Different URLs often serve the same content (mirrors, print versions, session IDs in URLs). Hash the normalised content and skip pages whose hash is already stored:

~~~text
t=2400ms http://c.com/copy stored, links found: 0
t=3300ms http://a.com/news/1 duplicate of http://c.com/copy
~~~

\`c.com/copy\` had the text "  Story ONE " and \`a.com/news/1\` had "story one"; after trimming and lowercasing they hash the same, so the second one was not stored and its links were not followed again.

📌 **Interview term: SimHash (near-duplicate detection)** — a fingerprint where similar documents get fingerprints that differ in only a few bits, so near-duplicates (the same article with a different ad or date) can be found by comparing bit differences. Manku, Jain and Das Sarma described using it for a multi-billion-page crawl at Google in "Detecting Near-Duplicates for Web Crawling" (WWW 2007). Exact hashes, as in the example, only catch byte-identical content after normalisation.

## 8. Deep Dive 3: Traps, Budgets and Recrawling

📌 **Interview term: crawler trap** — a part of a site that generates an unlimited number of URLs, such as a calendar with a "next day" link forever, session IDs in every link, or faceted search with endless filter combinations.

The simulated c.com has a calendar where each day links to the next, 50 days deep. The run stopped it with a **per-host budget** of 5 pages: it fetched \`calendar?day=1\` to \`day=4\` plus \`/copy\`, and the next calendar URL was cut. Real crawlers combine:

- A budget per host per crawl cycle, scaled by the host's importance.
- A maximum URL length and path depth, and limits on repeated path segments (\`/a/b/a/b/a/b\`).
- Detection of near-identical content across many URLs of the same host.

**Recrawling.** Pages change at very different rates: a news front page every few minutes, an old blog post never. Track each page's change history and schedule the next fetch accordingly (sooner if the content hash changed, later if not). Use **conditional GETs**: send \`If-None-Match\` (the \`ETag\` from last time) or \`If-Modified-Since\`, and a \`304 Not Modified\` response costs the site and you almost nothing.

## 9. Deep Dive 4: Distributing the Crawl

- **Partition the frontier by host**, for example \`hash(host) mod N\` or [consistent hashing](/interview-question/what-is-consistent-hashing) across crawler nodes. All URLs of one host land on one node, so that node alone enforces politeness for it with no coordination.
- **Forward discovered links** to the node that owns their host, in batches.
- **Persist the frontier** to disk or a durable store; a crawl of billions of URLs cannot live only in RAM, and a crashed node must resume. Mercator kept most of its frontier on disk with bounded memory for this reason.
- **Separate rendering.** Pages that need JavaScript go to a separate pool of headless browsers, with its own much lower throughput.

## 10. What Breaks First at 10x

| At 10 billion pages per month | Fix |
| :--- | :--- |
| 3,860 pages per second needs at least 3,860 hosts in flight | Larger frontier per node, more back queues, more crawler nodes |
| 1 PB of raw pages per month | Compression, storing only changed pages, tiered storage |
| DNS lookups | Local caching resolvers per node, prefetching DNS for queued hosts |
| Seen set of 80 GB as fingerprints | Bloom filters per partition, or a sharded key-value store |
| Recrawl load dominates new discovery | Better change-rate prediction; sitemaps and conditional GETs |

## 11. Verified: Running the Code

What the program simulates: an in-memory "web" of 58 pages on three hosts with a robots rule, a mirrored page and a 50-day calendar trap; a frontier with one queue per host where the next host is the one whose next-allowed time is earliest; a fake clock (100 ms per fetch plus each host delay); URL normalization; a seen set; SHA-256 content fingerprints; and a per-host budget of 5 pages. It then reruns with no delays to compare. It leaves out the network, DNS, the front (priority) queues, parsing real HTML and persistence.

Full output (identical in Node and Python):

~~~text
== capacity estimate ==
pages/s: 386, download: 38.6 MB/s, raw storage/month: 100 TB
at 1 request per 1 s per host, hosts that must be in flight at once: >= 386
== polite crawl ==
t=0ms http://a.com/ stored, links found: 4
t=100ms http://b.com/ stored, links found: 2
t=200ms http://c.com/calendar?day=1 stored, links found: 1
t=1100ms http://a.com/news stored, links found: 3
t=1300ms http://c.com/calendar?day=2 stored, links found: 1
t=2200ms http://a.com/about stored, links found: 0
t=2300ms http://b.com/shop stored, links found: 1
t=2400ms http://c.com/copy stored, links found: 0
t=3300ms http://a.com/news/1 duplicate of http://c.com/copy
t=3500ms http://c.com/calendar?day=3 stored, links found: 1
t=4400ms http://a.com/news/2 stored, links found: 1
t=4600ms http://c.com/calendar?day=4 stored, links found: 1
fetched 12, blocked by robots.txt 1, duplicate URLs skipped 2, duplicate content 1, cut by per-host budget 1
finished at t=4700ms, max fetches to one host in any 1 s window: 1
== same crawl with no politeness delay ==
finished at t=1200ms, max fetches to one host in any 1 s window: 5
~~~

## 12. Edge Cases Worth Knowing

- **Slow or hostile servers.** Enforce connect and read timeouts and a maximum response size; some servers trickle bytes forever.
- **Redirect chains and loops.** Follow a limited number of redirects and normalise the final URL into the seen set.
- **Soft 404s.** Pages that return 200 with "not found" text; detect by content similarity across a host.
- **Canonical tags.** \`<link rel="canonical">\` tells you the preferred URL for duplicate pages; record it, but do not trust it blindly.
- **Shared hosting.** Thousands of hosts on one IP address; rate-limit per IP as well as per host name, or you overload one machine.

## Common Pitfalls

- **A single FIFO queue.** It hammers one host at a time and leaves fetchers idle during delays; use per-host back queues and a heap of next-allowed times.
- **Ignoring \`robots.txt\` or relying on \`Crawl-delay\` alone.** Obey RFC 9309 rules, and keep your own default rate because \`Crawl-delay\` is not standard.
- **No URL normalization.** \`A.com/news#top\` and \`a.com/news\` become two fetches of one page.
- **No trap protection.** An endless calendar keeps a crawler busy forever; budgets and depth limits are mandatory.
- **Refetching unchanged pages in full.** Conditional GETs and change-rate scheduling cut recrawl cost.
- **Forgetting DNS.** Uncached DNS lookups at hundreds of pages per second can become the bottleneck.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify and size:</strong> <span style="color:#f0e2c8;">I would ask the purpose, freshness and whether JavaScript must be rendered. For 1 billion pages a month at 100 KB: 386 pages per second, 38.6 MB/s, 100 TB a month, and at one request per second per host at least 386 hosts in flight at once.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Pipeline:</strong> <span style="color:#f0e2c8;">Seeds into a <strong style="color:#ffca28;">URL frontier</strong>; fetchers with a DNS cache and cached <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">robots.txt</code>; a parser extracting links; URL dedup with normalization and a seen set or Bloom filter; content dedup with fingerprints; raw pages in object storage.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Frontier:</strong> <span style="color:#f0e2c8;">Front queues by priority, back queues one per host, and a heap of next-allowed times, as in Mercator. In my simulation fetchers moved to b.com and c.com while a.com cooled down, and no host saw more than 1 request per second.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Dedup and traps:</strong> <span style="color:#f0e2c8;">Normalise URLs before the seen set, hash normalised content to catch mirrors, and use SimHash for near-duplicates. Per-host budgets and depth limits stop traps: my run cut an endless calendar after 5 pages from that host.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Scale and freshness:</strong> <span style="color:#f0e2c8;">Partition the frontier by host so each node enforces politeness alone, persist it to disk, recrawl by change rate with conditional GETs, and send JavaScript-heavy pages to a separate rendering pool.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you prioritise which pages to crawl first?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Front queues ordered by a priority score: page importance (link-based rank, traffic, domain quality) and expected change rate. A prioritizer assigns each URL a queue; the router drains higher-priority front queues more often into the per-host back queues.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is Crawl-delay part of the robots.txt standard?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. RFC 9309 standardises allow and disallow rules per user agent, and Google states it does not support <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Crawl-delay</code>, while some engines such as Bing honour it. A crawler needs its own default per-host rate and should back off on 429 and 503 regardless of what <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">robots.txt</code> says.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you store the seen set for a billion URLs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">As 8-byte fingerprints it is 8 GB, which fits on a few machines; as a Bloom filter at 1% false positives it is about 1.2 GB. A false positive only means skipping a new URL, which is acceptable, and the set is partitioned by host along with the frontier.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you detect near-duplicate pages?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Exact hashes catch identical content only. SimHash produces fingerprints where similar documents differ in few bits, so pages within a small Hamming distance are treated as duplicates; Google described this at multi-billion-page scale in a WWW 2007 paper.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens when a crawler node dies?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Its hosts are reassigned (consistent hashing keeps the movement small) and the new owner reloads their part of the frontier from durable storage. Fetches in flight are retried; at-least-once fetching is fine because content dedup absorbs duplicates.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Politeness | Limiting load on each host: one connection and a delay between requests |
| URL frontier | The set of discovered, not yet fetched URLs, and the order to fetch them |
| Front queues and back queues | Priority queues in front, one queue per host behind, with a heap of next-allowed times |
| robots.txt | Per-host file of crawl rules, standardised as RFC 9309 |
| URL normalization | Rewriting URLs to one form so equivalent URLs compare equal |
| SimHash | Fingerprint where similar documents differ in few bits; finds near-duplicates |
| Crawler trap | A site area that generates unlimited URLs |

**Conclusion:** A web crawler is a loop of fetch, parse and enqueue, and the design lives in the URL frontier. The capacity math (386 pages per second, 38.6 MB/s, 100 TB a month) shows bandwidth is not the problem: politeness is, because it forces at least 386 hosts in flight at once. Per-host back queues with a heap of next-allowed times keep fetchers busy without hammering anyone (no host saw more than 1 request per second in the run), normalization and fingerprints avoid fetching or storing the same thing twice, budgets stop traps (the endless calendar stopped after 5 pages), and partitioning by host lets the crawl scale out with each node enforcing politeness alone.`,
    examples: [
      {
        label: `Crawler frontier: per-host politeness, robots.txt, URL normalization, content dedup and a crawler trap`,
        variants: [
          { tech: "node", code: `// Web crawler core: URL frontier with per-host politeness, robots.txt, URL and content dedup, trap limits.
const crypto = require("crypto");

console.log("== capacity estimate ==");
const pagesPerMonth = 1000000000, kbPerPage = 100, delaySec = 1;
const pagesPerSec = Math.ceil(pagesPerMonth / (30 * 86400));
console.log("pages/s: " + pagesPerSec + ", download: " + (pagesPerSec * kbPerPage) / 1000 + " MB/s, raw storage/month: " + (pagesPerMonth * kbPerPage) / 1000000000 + " TB");
console.log("at 1 request per " + delaySec + " s per host, hosts that must be in flight at once: >= " + pagesPerSec * delaySec);

// The simulated web: url -> { links, text }. c.com/calendar links to the next day forever (a crawler trap).
const web = {
  "http://a.com/": { links: ["http://A.com/news#top", "http://a.com/private/admin", "http://b.com/", "http://a.com/about/"], text: "a home" },
  "http://a.com/news": { links: ["http://a.com/news/1", "http://a.com/news/2", "http://c.com/copy"], text: "a news" },
  "http://a.com/news/1": { links: ["http://a.com/"], text: "story one" },
  "http://a.com/news/2": { links: ["http://a.com/news"], text: "story two" },
  "http://a.com/about": { links: [], text: "about a" },
  "http://b.com/": { links: ["http://b.com/shop", "http://c.com/calendar?day=1"], text: "b home" },
  "http://b.com/shop": { links: ["http://b.com/"], text: "b shop" },
  "http://c.com/copy": { links: [], text: "  Story ONE " },
};
for (let d = 1; d <= 50; d++) web["http://c.com/calendar?day=" + d] = { links: ["http://c.com/calendar?day=" + (d + 1)], text: "day " + d };
const robots = { "a.com": { disallow: ["/private"], delayMs: 1000 }, "b.com": { disallow: [], delayMs: 2000 }, "c.com": { disallow: [], delayMs: 1000 } };
const MAX_PER_HOST = 5, FETCH_MS = 100;

function normalize(url) {
  let u = url.split("#")[0];
  const m = /^(\\w+):\\/\\/([^/]+)(.*)$/.exec(u);
  let path = m[3] || "/";
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return m[1].toLowerCase() + "://" + m[2].toLowerCase() + path;
}
const hostOf = (url) => /^\\w+:\\/\\/([^/]+)/.exec(url)[1];
const pathOf = (url) => url.slice(url.indexOf("/", url.indexOf("//") + 2)) || "/";
const fingerprint = (text) => crypto.createHash("sha256").update(text.trim().toLowerCase()).digest("hex").slice(0, 8);

function crawl(polite) {
  const queues = new Map(), nextAllowed = new Map(), seenUrls = new Set(), seenContent = new Map(), perHost = new Map();
  const stats = { fetched: 0, robots: 0, dupUrl: 0, dupContent: 0, budget: 0 };
  const lines = [], times = [];
  let clock = 0;
  function add(raw) {
    const url = normalize(raw), host = hostOf(url);
    if (seenUrls.has(url)) { stats.dupUrl++; return; }
    seenUrls.add(url);
    if (robots[host].disallow.some((p) => pathOf(url).startsWith(p))) { stats.robots++; return; }
    if (!queues.has(host)) { queues.set(host, []); nextAllowed.set(host, 0); }
    queues.get(host).push(url);
  }
  add("http://a.com/");
  for (;;) {
    let best = null;
    for (const [host, q] of queues) if (q.length && (best === null || nextAllowed.get(host) < nextAllowed.get(best))) best = host;
    if (best === null) break;
    const url = queues.get(best).shift();
    if ((perHost.get(best) || 0) >= MAX_PER_HOST) { stats.budget++; continue; }
    if (polite) clock = Math.max(clock, nextAllowed.get(best));
    const page = web[url];
    times.push([best, clock]);
    perHost.set(best, (perHost.get(best) || 0) + 1);
    stats.fetched++;
    const fp = fingerprint(page.text);
    if (seenContent.has(fp)) { stats.dupContent++; lines.push("t=" + clock + "ms " + url + " duplicate of " + seenContent.get(fp)); }
    else { seenContent.set(fp, url); lines.push("t=" + clock + "ms " + url + " stored, links found: " + page.links.length); for (const l of page.links) add(l); }
    clock += FETCH_MS;
    nextAllowed.set(best, clock + (polite ? robots[best].delayMs : 0));
  }
  let worst = 0;
  for (const [h, t] of times) worst = Math.max(worst, times.filter(([h2, t2]) => h2 === h && t2 >= t && t2 < t + 1000).length);
  return { lines, stats, worst, clock };
}

const run = crawl(true);
console.log("== polite crawl ==");
for (const l of run.lines) console.log(l);
const s = run.stats;
console.log("fetched " + s.fetched + ", blocked by robots.txt " + s.robots + ", duplicate URLs skipped " + s.dupUrl + ", duplicate content " + s.dupContent + ", cut by per-host budget " + s.budget);
console.log("finished at t=" + run.clock + "ms, max fetches to one host in any 1 s window: " + run.worst);
const naive = crawl(false);
console.log("== same crawl with no politeness delay ==");
console.log("finished at t=" + naive.clock + "ms, max fetches to one host in any 1 s window: " + naive.worst);` },
          { tech: "python", code: `# Web crawler core: URL frontier with per-host politeness, robots.txt, URL and content dedup, trap limits.
import hashlib
import math
import re

print("== capacity estimate ==")
pages_per_month, kb_per_page, delay_sec = 1000000000, 100, 1
pages_per_sec = math.ceil(pages_per_month / (30 * 86400))
print(f"pages/s: {pages_per_sec}, download: {pages_per_sec * kb_per_page / 1000} MB/s, raw storage/month: {pages_per_month * kb_per_page // 1000000000} TB")
print(f"at 1 request per {delay_sec} s per host, hosts that must be in flight at once: >= {pages_per_sec * delay_sec}")

# The simulated web: url -> { links, text }. c.com/calendar links to the next day forever (a crawler trap).
web = {
    "http://a.com/": {"links": ["http://A.com/news#top", "http://a.com/private/admin", "http://b.com/", "http://a.com/about/"], "text": "a home"},
    "http://a.com/news": {"links": ["http://a.com/news/1", "http://a.com/news/2", "http://c.com/copy"], "text": "a news"},
    "http://a.com/news/1": {"links": ["http://a.com/"], "text": "story one"},
    "http://a.com/news/2": {"links": ["http://a.com/news"], "text": "story two"},
    "http://a.com/about": {"links": [], "text": "about a"},
    "http://b.com/": {"links": ["http://b.com/shop", "http://c.com/calendar?day=1"], "text": "b home"},
    "http://b.com/shop": {"links": ["http://b.com/"], "text": "b shop"},
    "http://c.com/copy": {"links": [], "text": "  Story ONE "},
}
for d in range(1, 51):
    web[f"http://c.com/calendar?day={d}"] = {"links": [f"http://c.com/calendar?day={d + 1}"], "text": f"day {d}"}
robots = {"a.com": {"disallow": ["/private"], "delay_ms": 1000}, "b.com": {"disallow": [], "delay_ms": 2000}, "c.com": {"disallow": [], "delay_ms": 1000}}
MAX_PER_HOST, FETCH_MS = 5, 100


def normalize(url):
    u = url.split("#")[0]
    m = re.match(r"^(\\w+)://([^/]+)(.*)$", u)
    path = m.group(3) or "/"
    if len(path) > 1 and path.endswith("/"):
        path = path[:-1]
    return m.group(1).lower() + "://" + m.group(2).lower() + path


def host_of(url):
    return re.match(r"^\\w+://([^/]+)", url).group(1)


def path_of(url):
    i = url.find("/", url.find("//") + 2)
    return url[i:] if i >= 0 else "/"


def fingerprint(text):
    return hashlib.sha256(text.strip().lower().encode()).hexdigest()[:8]


def crawl(polite):
    queues, next_allowed, seen_urls, seen_content, per_host = {}, {}, set(), {}, {}
    stats = {"fetched": 0, "robots": 0, "dup_url": 0, "dup_content": 0, "budget": 0}
    lines, times = [], []
    clock = 0

    def add(raw):
        url = normalize(raw)
        host = host_of(url)
        if url in seen_urls:
            stats["dup_url"] += 1
            return
        seen_urls.add(url)
        if any(path_of(url).startswith(p) for p in robots[host]["disallow"]):
            stats["robots"] += 1
            return
        if host not in queues:
            queues[host] = []
            next_allowed[host] = 0
        queues[host].append(url)

    add("http://a.com/")
    while True:
        best = None
        for host, q in queues.items():
            if q and (best is None or next_allowed[host] < next_allowed[best]):
                best = host
        if best is None:
            break
        url = queues[best].pop(0)
        if per_host.get(best, 0) >= MAX_PER_HOST:
            stats["budget"] += 1
            continue
        if polite:
            clock = max(clock, next_allowed[best])
        page = web[url]
        times.append((best, clock))
        per_host[best] = per_host.get(best, 0) + 1
        stats["fetched"] += 1
        fp = fingerprint(page["text"])
        if fp in seen_content:
            stats["dup_content"] += 1
            lines.append(f"t={clock}ms {url} duplicate of {seen_content[fp]}")
        else:
            seen_content[fp] = url
            lines.append(f"t={clock}ms {url} stored, links found: {len(page['links'])}")
            for link in page["links"]:
                add(link)
        clock += FETCH_MS
        next_allowed[best] = clock + (robots[best]["delay_ms"] if polite else 0)
    worst = 0
    for h, t in times:
        worst = max(worst, len([1 for h2, t2 in times if h2 == h and t <= t2 < t + 1000]))
    return lines, stats, worst, clock


lines, s, worst, clock = crawl(True)
print("== polite crawl ==")
for line in lines:
    print(line)
print(f"fetched {s['fetched']}, blocked by robots.txt {s['robots']}, duplicate URLs skipped {s['dup_url']}, duplicate content {s['dup_content']}, cut by per-host budget {s['budget']}")
print(f"finished at t={clock}ms, max fetches to one host in any 1 s window: {worst}")
_, _, worst, clock = crawl(False)
print("== same crawl with no politeness delay ==")
print(f"finished at t={clock}ms, max fetches to one host in any 1 s window: {worst}")` },
        ],
      },
    ],
  },
  {
    title: `How would you design a notification system?`,
    difficulty: "hard",
    seoDescription: `Design a notification system: push, email and SMS fan-out, idempotency keys, preferences and quiet hours, priority queues, retries with backoff and a DLQ.`,
    description: `**Question presented to candidate:**
"Many teams in our company want to notify users: order updates, login codes, marketing campaigns, reminders. Design one notification service they can all call that sends push notifications, emails and SMS, respects user preferences, and does not lose or duplicate important messages."

**What a strong answer should cover:**
- Requirements split into **transactional** and **marketing** traffic, and a capacity estimate that includes campaign bursts, not just the daily average
- The pipeline: an API that accepts requests with an **idempotency key**, preference and template resolution, **per-channel queues** with workers, third-party providers (APNs, FCM, an email service, an SMS gateway), and status tracking
- Reliability: **at-least-once** delivery inside the system with **deduplication**, **retries with exponential backoff**, and a **dead-letter queue**; why exactly-once to a phone is not achievable
- Respecting users: opt-outs per category and channel, **quiet hours** in the user's time zone, frequency caps, and priority isolation so a campaign never delays a login code
- Channel facts that shape the design: push tokens expire, payload size limits, SMS segment lengths, bulk email sender rules

**Clarifying questions expected:**
- Which channels, and which kinds of notification (transactional, marketing, both)?
- What volume, and how big are campaigns compared to the daily average?
- Which notifications are time-critical (login codes) and what latency do they need?

**Code / implementation expected:** Optional — a pipeline simulation with dedup, preferences, quiet hours, caps and retries; the example runs one with a fake clock and failing providers.`,
    answer: `**Target Audience:** Engineers preparing for a system design round; queues, retries and push notifications are explained from the start.
**Difficulty:** Hard
**Verified with:** Node 22.22 and Python 3.12 (both print identical output). Provider facts (FCM HTTP v1 migration, FCM payload size, SMS segment lengths, Gmail and Yahoo bulk sender rules) checked in October 2026 and cited inline.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. The capacity numbers and the delivery log come from the example program; the **Verified** section quotes its full output.

## 1. Why This Even Matters — A Story First

Think of the front desk of a large hotel. Guests get messages all day: "your taxi is here" (urgent), "the spa has a discount" (not urgent), "your room key code" (urgent and private). A good front desk does several things without thinking:

- It never slips the same note under a door twice just because the caller rang back to check it was passed on.
- It does not knock at 3 a.m. with a spa discount, but it does knock at 3 a.m. if the taxi has arrived.
- A guest who said "no promotions, please" gets none.
- If the phone line to a room is broken, the desk tries again a bit later, and after a few failures writes it in a "could not deliver" book for a human to look at.
- When the spa sends 500 discount slips at once, the taxi message still goes out first.

A notification system is that front desk for millions of guests. The notes are events from other services, the rooms are phones and inboxes, and the design is about those five habits: **dedup**, **quiet hours**, **preferences**, **retries with a dead-letter queue**, and **priority isolation**.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which channels: push, email, SMS, in-app? | Each channel has its own provider, limits, costs and failure modes |
| Transactional, marketing, or both? | Different priority, preference rules and legal requirements |
| Daily volume and the size of the biggest campaign | Campaign bursts, not the average, size the queues and workers |
| Latency target for urgent messages (login codes) | Forces separate high-priority queues |
| Do users set preferences per category and channel? Quiet hours? | Needs a preference service on the hot path |
| Do senders need delivery status (sent, delivered, opened)? | Adds callbacks from providers and a status store |

## 3. Requirements

**Functional**

- Internal services send a notification for a user (or a segment of users) with a template name, data and a category (for example \`order_update\`, \`security\`, \`marketing\`).
- The system picks channels from the user's preferences, renders the template in the user's language, and delivers through push, email or SMS.
- Users can opt out per category and channel and set quiet hours.
- Senders can query delivery status.

**Non-functional**

- No duplicate notifications for one request, even if the caller retries.
- Transactional messages are delivered within seconds even during a large campaign.
- Survive provider outages without losing accepted requests.
- Horizontal scale for campaign bursts.

## 4. Capacity Estimate

Assumptions: 50 million users, 10 notifications per user per day on average, one marketing campaign to all 50 million users sent within 10 minutes, 1 KB per row in the delivery log, kept for 30 days. The example program does the arithmetic:

| Quantity | Calculation | Result |
| :--- | :--- | ---: |
| Notifications per day | 50,000,000 x 10 | 500,000,000 |
| Average rate | 500,000,000 / 86,400, rounded up | 5,788 per second |
| Campaign burst | 50,000,000 / 600 s, rounded up | 83,334 per second |
| Delivery log per day | 500,000,000 x 1 KB | 500 GB |
| Delivery log for 30 days | 500 GB x 30 | 15 TB |

The lesson is the ratio: **a campaign burst is about 14 times the daily average** (83,334 vs 5,788). You do not size workers for the burst; you put a queue in front, let the campaign drain over its window at the rate providers allow, and keep urgent traffic in a separate lane so it is never stuck behind it.

## 5. API

~~~http
POST /v1/notifications
Idempotency-Key: order-881-shipped
{ "userId": "u1", "category": "order_update", "template": "order_shipped",
  "data": { "orderId": "881", "eta": "Friday" }, "priority": "high" }
-> 202 { "notificationId": "n_7f3a", "status": "accepted" }

POST /v1/campaigns       { "segment": "active_last_30d", "template": "autumn_sale", "category": "marketing", "sendWindow": "10m" }
GET  /v1/notifications/{id}          -> per-channel status: queued, sent, delivered, failed
PUT  /v1/users/{id}/preferences      { "marketing": { "email": true, "push": false }, "quietHours": "22:00-07:00", "tz": "Europe/Berlin" }
~~~

The API returns **202 Accepted**: the request is durably queued, not yet delivered. The \`Idempotency-Key\` is what makes a caller retry safe.

📌 **Interview term: idempotency key** — a unique key the caller attaches to a request so the server can recognise a repeat of the same request and return the original result instead of doing the work again. See [idempotency](/interview-question/what-is-idempotency-and-why-does-it-matter).

## 6. Data Model

| Table | Key | Holds |
| :--- | :--- | :--- |
| \`notifications\` | \`notification_id\`, unique \`idempotency_key\` | sender, user, category, template, data, priority, created time |
| \`deliveries\` | \`notification_id\`, \`channel\` | status, attempts, provider message ID, last error, timestamps |
| \`preferences\` | \`user_id\` | opt-ins per category and channel, quiet hours, time zone, language |
| \`devices\` | \`user_id\`, \`token\` | push tokens per device and platform, last seen; deleted when a provider reports them invalid |
| \`templates\` | \`name\`, \`locale\`, \`version\` | subject and body per channel |

The \`deliveries\` table is the write-heavy one (the 500 GB a day in the estimate); a wide-column store or a time-partitioned table with a 30-day retention fits it. Preferences are read on every notification, so they are cached.

## 7. High-Level Architecture

<svg class="iq-diagram" width="100%" viewBox="0 0 780 400" role="img" aria-label="Services call the notification API, which dedups and resolves preferences, then writes to high and low priority queues per channel; channel workers call push, email and SMS providers; provider callbacks update delivery status">
  <defs>
    <marker id="sd14q5-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="160" width="120" height="70" rx="10"/>
  <text class="d-text" x="80" y="192" text-anchor="middle">services</text>
  <text class="d-sub" x="80" y="214" text-anchor="middle">orders, auth, CRM</text>
  <rect class="d-box-accent" x="190" y="150" width="150" height="90" rx="10"/>
  <text class="d-text" x="265" y="184" text-anchor="middle">notification API</text>
  <text class="d-sub" x="265" y="206" text-anchor="middle">dedup, prefs</text>
  <text class="d-sub" x="265" y="226" text-anchor="middle">templates</text>
  <line class="d-edge" x1="140" y1="195" x2="186" y2="195" marker-end="url(#sd14q5-arrow)"/>
  <rect class="d-box" x="400" y="90" width="140" height="60" rx="10"/>
  <text class="d-text" x="470" y="117" text-anchor="middle">high priority</text>
  <text class="d-sub" x="470" y="137" text-anchor="middle">queues per channel</text>
  <rect class="d-box-muted" x="400" y="240" width="140" height="60" rx="10"/>
  <text class="d-text" x="470" y="267" text-anchor="middle">low priority</text>
  <text class="d-sub" x="470" y="287" text-anchor="middle">campaigns</text>
  <line class="d-edge" x1="340" y1="180" x2="396" y2="125" marker-end="url(#sd14q5-arrow)"/>
  <line class="d-edge" x1="340" y1="215" x2="396" y2="265" marker-end="url(#sd14q5-arrow)"/>
  <rect class="d-box" x="600" y="40" width="160" height="56" rx="10"/>
  <text class="d-text" x="680" y="73" text-anchor="middle">push: APNs, FCM</text>
  <rect class="d-box" x="600" y="167" width="160" height="56" rx="10"/>
  <text class="d-text" x="680" y="200" text-anchor="middle">email provider</text>
  <rect class="d-box" x="600" y="294" width="160" height="56" rx="10"/>
  <text class="d-text" x="680" y="327" text-anchor="middle">SMS gateway</text>
  <line class="d-edge" x1="540" y1="110" x2="596" y2="70" marker-end="url(#sd14q5-arrow)"/>
  <line class="d-edge" x1="540" y1="130" x2="596" y2="190" marker-end="url(#sd14q5-arrow)"/>
  <line class="d-edge-dashed" x1="540" y1="260" x2="596" y2="205" marker-end="url(#sd14q5-arrow)"/>
  <line class="d-edge-dashed" x1="540" y1="280" x2="596" y2="318" marker-end="url(#sd14q5-arrow)"/>
  <rect class="d-box" x="190" y="320" width="150" height="60" rx="10"/>
  <text class="d-text" x="265" y="347" text-anchor="middle">delivery status</text>
  <text class="d-sub" x="265" y="367" text-anchor="middle">callbacks, DLQ</text>
</svg>

Requests are deduplicated and resolved once, then split into channel queues by priority; workers per channel call providers and record each attempt in the delivery status store.

- **Notification API**: authenticates the calling service, checks the idempotency key, writes the notification row, and enqueues it. Writing the row and the queue message must not be a dual write that can half fail; use the [outbox pattern](/interview-question/outbox-pattern-vs-polling-for-cdc-how-do-you-avoid-dual-write-failure) or make the queue the source of truth.
- **Fan-out and preferences**: looks up the user's preferences (cached), drops channels the user opted out of, applies quiet hours and frequency caps, renders the template per channel, and enqueues one job per channel.
- **Channel queues** separated by **priority** and by **channel**, so a slow SMS gateway does not hold up email, and a campaign does not hold up login codes. See [message queues](/interview-question/what-is-a-message-queue-and-why-use-one).
- **Channel workers**: call the provider, retry transient errors with backoff, park permanent failures in a **dead-letter queue**, and record every attempt.
- **Status callbacks**: providers report delivery, bounces and invalid tokens asynchronously; a webhook endpoint updates \`deliveries\` and removes dead push tokens.
- **In-app notifications**: written to an inbox table per user and pushed live over an open connection if the user is online (see [WebSockets vs polling vs SSE](/interview-question/when-would-you-use-websockets-vs-polling-vs-sse)).

## 8. Deep Dive 1: Delivery Guarantees, Dedup, Retries and the DLQ

📌 **Interview term: at-least-once delivery** — every accepted message is delivered one or more times; duplicates are possible, losses are not. Queues give you this, and dedup on top makes the user-visible result look like once.

Exactly-once delivery to a phone is not achievable: if a provider times out, you cannot know whether the push reached the device. So the system aims for at-least-once internally and removes duplicates at the two places it can:

1. **At the API**, by idempotency key: a caller retry with the same key is dropped. In the run, the second \`ship-881\` event was dropped and the user got one push and one email.
2. **At the worker**, by checking the delivery row before sending (status already \`sent\` means skip), so a redelivered queue message does not resend.

The gap that remains is the provider timeout itself; there a duplicate is the lesser evil for transactional messages. More on why: [exactly-once processing](/interview-question/exactly-once-processing-can-kafka-or-sqs-guarantee-it).

📌 **Interview term: exponential backoff** — waiting longer after each failed attempt (30 s, 60 s, 120 s in the run), usually with random jitter, so a struggling provider is not hammered by synchronized retries.

📌 **Interview term: dead-letter queue (DLQ)** — where messages go after the maximum number of attempts, so they stop blocking the queue and a human or a repair job can inspect them.

The run shows both on user u3, whose push provider returns 503 twice and whose SMS always times out:

~~~text
day1 21:10:00 sms -> u3 promo-2 failed timeout, retry in 30s
day1 21:10:00 push -> u3 promo-2 failed 503, retry in 30s
day1 21:10:30 sms -> u3 promo-2 failed timeout, retry in 60s
day1 21:10:30 push -> u3 promo-2 failed 503, retry in 60s
day1 21:11:30 sms -> u3 promo-2 failed timeout, retry in 120s
day1 21:11:30 push -> u3 promo-2 sale (attempt 3)
day1 21:13:30 sms -> u3 promo-2 failed timeout 4 times, sent to DLQ
~~~

Push succeeded on the third attempt; SMS gave up after 4 attempts and went to the DLQ, while push was unaffected because each channel retries independently. Classify errors: transient (timeouts, 5xx, 429) are retried; permanent (invalid token, unsubscribed number, hard bounce) are not retried, and invalid push tokens are deleted.

## 9. Deep Dive 2: Respecting the User

These rules live in the fan-out step, before anything is queued for a provider:

~~~text
day1 21:05:00 promo-1 u2 opted out of marketing
day1 23:30:00 push -> u1 otp-55 login code (attempt 1)
day1 23:40:00 promo-3 quiet hours for u1, deferred to day2 07:00:00
day2 07:00:00 promo-5 u1 hit the marketing cap of 2
~~~

- **Opt-outs per category and channel.** u2 opted out of marketing, so \`promo-1\` was dropped. Transactional and security messages usually cannot be turned off, but marketing must be.
- **Quiet hours in the user's time zone.** u1 has quiet hours 22:00 to 07:00. The login code at 23:30 went out immediately (transactional), while three promotions sent at 23:40-23:42 were deferred to 07:00 the next morning.
- **Frequency caps.** At 07:00 the three deferred promotions arrived together; with a cap of 2 marketing messages per day, \`promo-5\` was dropped. Without caps, deferral turns into a morning flood.

📌 **Interview term: quiet hours** — a per-user window, in the user's own time zone, during which non-urgent notifications are held and delivered when the window ends.

📌 **Interview term: frequency cap** — a limit on how many notifications of a category a user receives per period; a per-user [rate limiter](/interview-question/how-would-you-design-a-rate-limiter) on the fan-out step.

## 10. Deep Dive 3: Priority Isolation and Campaign Fan-Out

- **Separate queues per priority.** Login codes and order updates go to high-priority queues with their own workers; campaigns go to low-priority queues. A campaign of 50 million messages can then take its full 10 minutes without adding a second of delay to a login code.
- **Fan out campaigns in batches.** A campaign request becomes jobs of, say, 1,000 users each; workers resolve preferences and enqueue per-user messages. That keeps one huge request from being a single unit of failure, and lets you pause or cancel a campaign midway.
- **Throttle to provider limits.** Providers enforce rate limits per account; channel workers use a token bucket per provider so the queue, not the provider, absorbs the burst. When a provider returns 429, back off (see [backpressure](/interview-question/what-is-backpressure-and-how-do-you-handle-it)).

## 11. Channel Facts That Shape the Design

- **Push (APNs for Apple, FCM for Android and web).** You send to device **tokens** that change and expire, so store tokens per device and delete the ones a provider reports as invalid. FCM moved to the **HTTP v1 API** with OAuth 2.0 credentials; the legacy FCM APIs were scheduled for shutdown starting in July 2024 (Firebase deprecation notice, as reported by Iterable and others). FCM limits a message payload to 4,096 bytes, 2,048 bytes for topic messages (Firebase documentation, "About FCM messages"). Put identifiers in the push, not documents; the app fetches details.
- **SMS.** One message carries 160 characters in the GSM-7 alphabet or 70 in UCS-2 (needed for emoji and many scripts); longer texts are split into segments of 153 or 67 characters, each billed separately. One emoji switches the whole message to UCS-2. SMS is the most expensive channel, so reserve it for codes and critical alerts.
- **Email.** Since February 2024 Gmail and Yahoo require bulk senders (Gmail counts over 5,000 messages a day to its users) to authenticate with SPF, DKIM and DMARC, to offer one-click unsubscribe (RFC 8058) on marketing mail, and to keep spam complaint rates below 0.3% (Google and Yahoo sender guidelines, as summarized by email providers such as Mailgun and Bird). Your email worker must add the unsubscribe headers and honour unsubscribes within two days.
- **In-app.** Always reliable (it is your own database), so it is a good fallback when push is disabled.

## 12. What Breaks First at 10x

| At 5 billion notifications a day | Fix |
| :--- | :--- |
| Campaign bursts of 833,000 per second | Longer send windows, more partitions, per-provider token buckets |
| Preference lookups on every message | Cache preferences close to fan-out workers; invalidate on change |
| Delivery log at 5 TB a day | Time-partitioned store, shorter retention for raw attempts, aggregate status |
| Provider rate limits | Multiple provider accounts or vendors per channel with failover |
| Dead push tokens waste work | Process invalid-token callbacks quickly and prune devices not seen for months |

## 13. Verified: Running the Code

What the program simulates: an event-driven loop with a fake clock that processes 8 incoming events for 3 users. It checks idempotency keys, opt-outs, quiet hours (deferring to 07:00 on the user's clock) and a per-user marketing cap, then schedules one send per allowed channel. Fake providers fail deterministically (push returns 503 twice for u3; SMS always times out for u3); failed sends retry with backoff of 30, 60 and 120 seconds and go to the DLQ after 4 attempts. It stands in for queues, provider APIs and the delivery store, and leaves out concurrency, time zones (all times are one zone), templates and provider callbacks.

Full output (identical in Node and Python):

~~~text
== capacity estimate ==
notifications/day: 500000000, avg 5788/s, campaign burst 83334/s
delivery log: 500 GB/day, 15 TB for 30 days
day1 21:00:00 ship-881 duplicate idempotency key, dropped
day1 21:00:00 push -> u1 ship-881 order shipped (attempt 1)
day1 21:00:00 email -> u1 ship-881 order shipped (attempt 1)
day1 21:05:00 promo-1 u2 opted out of marketing
day1 21:10:00 sms -> u3 promo-2 failed timeout, retry in 30s
day1 21:10:00 push -> u3 promo-2 failed 503, retry in 30s
day1 21:10:30 sms -> u3 promo-2 failed timeout, retry in 60s
day1 21:10:30 push -> u3 promo-2 failed 503, retry in 60s
day1 21:11:30 sms -> u3 promo-2 failed timeout, retry in 120s
day1 21:11:30 push -> u3 promo-2 sale (attempt 3)
day1 21:13:30 sms -> u3 promo-2 failed timeout 4 times, sent to DLQ
day1 23:30:00 push -> u1 otp-55 login code (attempt 1)
day1 23:30:00 email -> u1 otp-55 login code (attempt 1)
day1 23:40:00 promo-3 quiet hours for u1, deferred to day2 07:00:00
day1 23:41:00 promo-4 quiet hours for u1, deferred to day2 07:00:00
day1 23:42:00 promo-5 quiet hours for u1, deferred to day2 07:00:00
day2 07:00:00 promo-5 u1 hit the marketing cap of 2
day2 07:00:00 push -> u1 promo-3 sale (attempt 1)
day2 07:00:00 email -> u1 promo-3 sale (attempt 1)
day2 07:00:00 push -> u1 promo-4 sale (attempt 1)
day2 07:00:00 email -> u1 promo-4 sale (attempt 1)
== summary ==
deduped 1, optedOut 1, deferred 3, capped 1, sent 9, retries 5, dlq 1
~~~

## 14. Edge Cases Worth Knowing

- **Stale notifications.** A "your driver is arriving" push delivered 20 minutes late is worse than none; give time-sensitive notifications an expiry and drop them once it passes.
- **Multiple devices.** One user with a phone and a tablet gets the push on both; collapse keys or "mark read everywhere" logic keep them in sync.
- **Preference changes in flight.** A user unsubscribes while a campaign is queued; re-check preferences at send time, not only at fan-out.
- **Time zones and daylight saving.** Store the zone name (\`Europe/Berlin\`), not an offset, so quiet hours survive clock changes.
- **Ordering.** Two updates for one order can arrive out of order; include a sequence number or timestamp so the app shows the latest.

## Common Pitfalls

- **Calling providers synchronously from the sender.** A provider outage then breaks checkout; always accept, queue and deliver asynchronously.
- **One queue for everything.** A campaign then delays login codes; separate queues by priority and channel.
- **No idempotency key.** Caller retries become duplicate pushes; in the run the duplicate \`ship-881\` was dropped only because of the key.
- **Retrying everything forever.** Invalid tokens and hard bounces never succeed; classify errors, cap attempts (4 in the run) and use a DLQ.
- **Quiet hours without frequency caps.** Deferred messages all arrive at 07:00; the cap of 2 dropped the third promotion in the run.
- **Ignoring channel rules.** Missing unsubscribe headers or high complaint rates get bulk email filtered; long SMS texts silently cost several segments.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify and size:</strong> <span style="color:#f0e2c8;">I would ask channels, the transactional and marketing mix, and latency for urgent messages. With 50 million users at 10 a day that is 500 million a day, 5,788 per second on average, but a campaign to everyone in 10 minutes is 83,334 per second, about 14 times the average, so queues absorb bursts.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Pipeline:</strong> <span style="color:#f0e2c8;">A notification API that takes an <strong style="color:#ffca28;">idempotency key</strong> and returns 202, a fan-out step that applies preferences, quiet hours, caps and templates, then queues per channel and per priority, channel workers calling APNs, FCM, an email provider and an SMS gateway, and provider callbacks updating a delivery log.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Reliability:</strong> <span style="color:#f0e2c8;">At-least-once inside the system, dedup by idempotency key at the API and by delivery status at the worker; transient failures retry with exponential backoff and jitter, permanent ones and exhausted retries go to a <strong style="color:#ffca28;">DLQ</strong>. In my run push succeeded on attempt 3 and SMS went to the DLQ after 4, independently.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Respect the user:</strong> <span style="color:#f0e2c8;">Opt-outs per category and channel, quiet hours in the user's time zone with transactional messages exempt, and frequency caps: in my run a login code went out at 23:30, promotions were deferred to 07:00, and a cap of 2 dropped the third.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Scale and channel facts:</strong> <span style="color:#f0e2c8;">Priority isolation so campaigns never delay codes, campaigns fanned out in batches, token buckets per provider. Push tokens expire and must be pruned, FCM payloads are limited to 4,096 bytes, SMS is 160 GSM-7 characters per segment, and bulk email needs authentication and one-click unsubscribe.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you guarantee a user never gets the same notification twice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You cannot fully, because a provider timeout leaves you not knowing whether it was delivered. You make duplicates rare: an idempotency key at the API, a delivery status check before each send, and for push a collapse key so a repeat replaces the earlier one on the device.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you keep a big campaign from delaying login codes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Separate queues and worker pools per priority, and per channel, so a 50 million message campaign drains at its own pace in the low-priority lane. Providers have account rate limits, so I also reserve part of the provider throughput for high priority traffic.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens when the SMS provider is down?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">SMS jobs fail with transient errors, back off and retry, and the queue grows while push and email continue. A circuit breaker stops calling the provider for a while, and for critical messages I fail over to a second SMS vendor or fall back to push or email.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle quiet hours across time zones?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store the time zone name per user, compute the local hour at send time, and defer non-urgent notifications to the end of the window with a scheduled job, applying frequency caps when they are released. Urgent categories such as security bypass quiet hours.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you track whether a notification was delivered or opened?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each attempt writes a delivery row; providers send callbacks for delivered, bounced and invalid token, and opens come from tracking in the app or email. Status is eventually consistent, and the raw log is time-partitioned with 30-day retention, about 15 TB at our volume.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Idempotency key | Caller-supplied key that lets the server recognise and drop a repeated request |
| At-least-once delivery | Every message delivered one or more times; no loss, duplicates possible |
| Exponential backoff | Waiting longer after each failed attempt, usually with jitter |
| Dead-letter queue (DLQ) | Where messages go after the last failed attempt, for inspection |
| Quiet hours | User-local window where non-urgent notifications are held |
| Frequency cap | Limit on notifications per user per category and period |

**Conclusion:** A notification system is an asynchronous pipeline whose difficulty is not volume but behaviour. Size it for bursts (83,334 per second for a campaign against a 5,788 average), accept requests with idempotency keys and queue them, resolve preferences, quiet hours and caps before anything reaches a provider, separate queues by priority and channel, and retry each channel independently with backoff and a DLQ. The run shows each habit: one duplicate dropped, one opt-out honoured, a login code sent at 23:30 while promotions waited until 07:00 and one was capped, push succeeding on the third try and SMS parked in the DLQ after four.`,
    examples: [
      {
        label: `Notification pipeline: idempotency keys, preferences, quiet hours, per-user caps, retries with backoff and a DLQ`,
        variants: [
          { tech: "node", code: `// Notification pipeline: idempotency, preferences, quiet hours, per-user caps, per-channel retries and a DLQ.
console.log("== capacity estimate ==");
const users = 50000000, perUserPerDay = 10, campaignUsers = 50000000, campaignMinutes = 10, bytesPerRow = 1000, retentionDays = 30;
const perDay = users * perUserPerDay;
console.log("notifications/day: " + perDay + ", avg " + Math.ceil(perDay / 86400) + "/s, campaign burst " + Math.ceil(campaignUsers / (campaignMinutes * 60)) + "/s");
console.log("delivery log: " + (perDay * bytesPerRow) / 1000000000 + " GB/day, " + (perDay * bytesPerRow * retentionDays) / 1000000000000 + " TB for " + retentionDays + " days");

const prefs = {
  u1: { channels: ["push", "email"], marketing: true, quiet: [22, 7] },
  u2: { channels: ["email"], marketing: false, quiet: null },
  u3: { channels: ["sms", "push"], marketing: true, quiet: null },
};
const MARKETING_CAP = 2, MAX_ATTEMPTS = 4, BASE_BACKOFF = 30;
// Fake providers. push fails twice for u3 then works; sms always times out for u3.
const calls = new Map();
function provider(channel, user) {
  const key = channel + ":" + user;
  const n = (calls.get(key) || 0) + 1;
  calls.set(key, n);
  if (channel === "push" && user === "u3" && n <= 2) return "503";
  if (channel === "sms" && user === "u3") return "timeout";
  return "ok";
}
const fmt = (t) => "day" + (Math.floor(t / 86400) + 1) + " " + [Math.floor(t / 3600) % 24, Math.floor(t / 60) % 60, t % 60].map((x) => String(x).padStart(2, "0")).join(":");
const inQuiet = (q, t) => { if (!q) return false; const h = Math.floor(t / 3600) % 24; return q[0] > q[1] ? h >= q[0] || h < q[1] : h >= q[0] && h < q[1]; };

const tasks = []; let seq = 0;
const schedule = (t, task) => { tasks.push({ t, seq: seq++, ...task }); tasks.sort((a, b) => a.t - b.t || a.seq - b.seq); };
const T = (h, m) => h * 3600 + m * 60;
const events = [
  { t: T(21, 0), key: "ship-881", user: "u1", kind: "transactional", text: "order shipped" },
  { t: T(21, 0), key: "ship-881", user: "u1", kind: "transactional", text: "order shipped" }, // producer retry
  { t: T(21, 5), key: "promo-1", user: "u2", kind: "marketing", text: "sale" },
  { t: T(21, 10), key: "promo-2", user: "u3", kind: "marketing", text: "sale" },
  { t: T(23, 30), key: "otp-55", user: "u1", kind: "transactional", text: "login code" },
  { t: T(23, 40), key: "promo-3", user: "u1", kind: "marketing", text: "sale" },
  { t: T(23, 41), key: "promo-4", user: "u1", kind: "marketing", text: "sale" },
  { t: T(23, 42), key: "promo-5", user: "u1", kind: "marketing", text: "sale" },
];
for (const e of events) schedule(e.t, { type: "event", e });

const seen = new Set(), marketingSent = new Map();
const stats = { deduped: 0, optedOut: 0, deferred: 0, capped: 0, sent: 0, retries: 0, dlq: 0 };
while (tasks.length) {
  const task = tasks.shift(), now = task.t;
  if (task.type === "event") {
    const e = task.e, p = prefs[e.user];
    if (seen.has(e.key)) { stats.deduped++; console.log(fmt(now) + " " + e.key + " duplicate idempotency key, dropped"); continue; }
    seen.add(e.key);
    if (e.kind === "marketing" && !p.marketing) { stats.optedOut++; console.log(fmt(now) + " " + e.key + " " + e.user + " opted out of marketing"); continue; }
    if (e.kind === "marketing" && inQuiet(p.quiet, now)) {
      let wake = Math.floor(now / 86400) * 86400 + p.quiet[1] * 3600;
      if (wake <= now) wake += 86400;
      stats.deferred++; seen.delete(e.key);
      console.log(fmt(now) + " " + e.key + " quiet hours for " + e.user + ", deferred to " + fmt(wake));
      schedule(wake, { type: "event", e });
      continue;
    }
    if (e.kind === "marketing") {
      const n = marketingSent.get(e.user) || 0;
      if (n >= MARKETING_CAP) { stats.capped++; console.log(fmt(now) + " " + e.key + " " + e.user + " hit the marketing cap of " + MARKETING_CAP); continue; }
      marketingSent.set(e.user, n + 1);
    }
    for (const ch of p.channels) schedule(now, { type: "send", ch, e, attempt: 1 });
  } else {
    const { ch, e, attempt } = task;
    const result = provider(ch, e.user);
    if (result === "ok") { stats.sent++; console.log(fmt(now) + " " + ch + " -> " + e.user + " " + e.key + " " + e.text + " (attempt " + attempt + ")"); continue; }
    if (attempt >= MAX_ATTEMPTS) { stats.dlq++; console.log(fmt(now) + " " + ch + " -> " + e.user + " " + e.key + " failed " + result + " " + attempt + " times, sent to DLQ"); continue; }
    const wait = BASE_BACKOFF * 2 ** (attempt - 1);
    stats.retries++;
    console.log(fmt(now) + " " + ch + " -> " + e.user + " " + e.key + " failed " + result + ", retry in " + wait + "s");
    schedule(now + wait, { type: "send", ch, e, attempt: attempt + 1 });
  }
}
console.log("== summary ==");
console.log(Object.entries(stats).map(([k, v]) => k + " " + v).join(", "));` },
          { tech: "python", code: `# Notification pipeline: idempotency, preferences, quiet hours, per-user caps, per-channel retries and a DLQ.
import math

print("== capacity estimate ==")
users, per_user_per_day, campaign_users, campaign_minutes, bytes_per_row, retention_days = 50000000, 10, 50000000, 10, 1000, 30
per_day = users * per_user_per_day
print(f"notifications/day: {per_day}, avg {math.ceil(per_day / 86400)}/s, campaign burst {math.ceil(campaign_users / (campaign_minutes * 60))}/s")
print(f"delivery log: {per_day * bytes_per_row // 1000000000} GB/day, {per_day * bytes_per_row * retention_days // 1000000000000} TB for {retention_days} days")

prefs = {
    "u1": {"channels": ["push", "email"], "marketing": True, "quiet": (22, 7)},
    "u2": {"channels": ["email"], "marketing": False, "quiet": None},
    "u3": {"channels": ["sms", "push"], "marketing": True, "quiet": None},
}
MARKETING_CAP, MAX_ATTEMPTS, BASE_BACKOFF = 2, 4, 30
# Fake providers. push fails twice for u3 then works; sms always times out for u3.
calls = {}


def provider(channel, user):
    key = channel + ":" + user
    n = calls.get(key, 0) + 1
    calls[key] = n
    if channel == "push" and user == "u3" and n <= 2:
        return "503"
    if channel == "sms" and user == "u3":
        return "timeout"
    return "ok"


def fmt(t):
    return f"day{t // 86400 + 1} {t // 3600 % 24:02d}:{t // 60 % 60:02d}:{t % 60:02d}"


def in_quiet(q, t):
    if not q:
        return False
    h = t // 3600 % 24
    return (h >= q[0] or h < q[1]) if q[0] > q[1] else (q[0] <= h < q[1])


tasks = []
seq = 0


def schedule(t, task):
    global seq
    task.update({"t": t, "seq": seq})
    seq += 1
    tasks.append(task)
    tasks.sort(key=lambda x: (x["t"], x["seq"]))


def T(h, m):
    return h * 3600 + m * 60


events = [
    {"t": T(21, 0), "key": "ship-881", "user": "u1", "kind": "transactional", "text": "order shipped"},
    {"t": T(21, 0), "key": "ship-881", "user": "u1", "kind": "transactional", "text": "order shipped"},  # producer retry
    {"t": T(21, 5), "key": "promo-1", "user": "u2", "kind": "marketing", "text": "sale"},
    {"t": T(21, 10), "key": "promo-2", "user": "u3", "kind": "marketing", "text": "sale"},
    {"t": T(23, 30), "key": "otp-55", "user": "u1", "kind": "transactional", "text": "login code"},
    {"t": T(23, 40), "key": "promo-3", "user": "u1", "kind": "marketing", "text": "sale"},
    {"t": T(23, 41), "key": "promo-4", "user": "u1", "kind": "marketing", "text": "sale"},
    {"t": T(23, 42), "key": "promo-5", "user": "u1", "kind": "marketing", "text": "sale"},
]
for e in events:
    schedule(e["t"], {"type": "event", "e": e})

seen, marketing_sent = set(), {}
stats = {"deduped": 0, "optedOut": 0, "deferred": 0, "capped": 0, "sent": 0, "retries": 0, "dlq": 0}
while tasks:
    task = tasks.pop(0)
    now = task["t"]
    if task["type"] == "event":
        e = task["e"]
        p = prefs[e["user"]]
        if e["key"] in seen:
            stats["deduped"] += 1
            print(f"{fmt(now)} {e['key']} duplicate idempotency key, dropped")
            continue
        seen.add(e["key"])
        if e["kind"] == "marketing" and not p["marketing"]:
            stats["optedOut"] += 1
            print(f"{fmt(now)} {e['key']} {e['user']} opted out of marketing")
            continue
        if e["kind"] == "marketing" and in_quiet(p["quiet"], now):
            wake = now // 86400 * 86400 + p["quiet"][1] * 3600
            if wake <= now:
                wake += 86400
            stats["deferred"] += 1
            seen.discard(e["key"])
            print(f"{fmt(now)} {e['key']} quiet hours for {e['user']}, deferred to {fmt(wake)}")
            schedule(wake, {"type": "event", "e": e})
            continue
        if e["kind"] == "marketing":
            n = marketing_sent.get(e["user"], 0)
            if n >= MARKETING_CAP:
                stats["capped"] += 1
                print(f"{fmt(now)} {e['key']} {e['user']} hit the marketing cap of {MARKETING_CAP}")
                continue
            marketing_sent[e["user"]] = n + 1
        for ch in p["channels"]:
            schedule(now, {"type": "send", "ch": ch, "e": e, "attempt": 1})
    else:
        ch, e, attempt = task["ch"], task["e"], task["attempt"]
        result = provider(ch, e["user"])
        if result == "ok":
            stats["sent"] += 1
            print(f"{fmt(now)} {ch} -> {e['user']} {e['key']} {e['text']} (attempt {attempt})")
            continue
        if attempt >= MAX_ATTEMPTS:
            stats["dlq"] += 1
            print(f"{fmt(now)} {ch} -> {e['user']} {e['key']} failed {result} {attempt} times, sent to DLQ")
            continue
        wait = BASE_BACKOFF * 2 ** (attempt - 1)
        stats["retries"] += 1
        print(f"{fmt(now)} {ch} -> {e['user']} {e['key']} failed {result}, retry in {wait}s")
        schedule(now + wait, {"type": "send", "ch": ch, "e": e, "attempt": attempt + 1})
print("== summary ==")
print(", ".join(f"{k} {v}" for k, v in stats.items()))` },
        ],
      },
    ],
  },
];

export default augments;
