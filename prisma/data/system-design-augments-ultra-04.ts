/**
 * SYSTEM DESIGN ULTRA — batch 04: Caching. Every example was run by
 * scripts/verify-variant-examples.ts (node, python, go, java); quoted output is that run's output.
 */
import type { SystemDesignUltraAugment } from "./system-design-augments.types";

const augments: SystemDesignUltraAugment[] = [
  {
    title: `How does caching improve system performance?`,
    difficulty: "medium",
    seoDescription: `How a cache cuts latency and database load: hit ratio maths, cache-aside, write-through and write-back, TTLs, eviction and stampedes, simulated.`,
    description: `**Question presented to candidate:**
"Our product pages take about 20 milliseconds to load from the database, and the database is close to its limit at peak. Explain how adding a cache would help, how you would decide what to cache, and what can go wrong once the cache is in place."

**What a strong answer should cover:**
- The two wins: lower **latency** (memory is far faster than a database round trip) and **offload** (each hit is a query the database never sees), and why the **hit ratio** decides both: average latency = hit ratio x cache time + miss ratio x (cache + database time)
- Why caching works at all: **skewed access** (a small set of hot keys gets most reads), and why the **tail latency** (p99) only improves when the hit ratio passes 99%
- Read pattern **cache-aside** and write policies: **invalidate on write**, **write-through**, **write-back**, with the staleness and durability trade-off of each
- **TTL** and **eviction** (LRU/LFU), and what to cache: read-heavy, expensive to compute, tolerant of brief staleness; not per-request unique data
- Failure modes: **stale data**, **cache stampede** on a hot key expiring, **cache penetration** by lookups for keys that do not exist, and the database falling over when a cold cache restarts
- Layers: browser, CDN, application memory, a shared cache such as Redis or Memcached, and the database buffer pool

**Clarifying questions expected:**
- What is the read-to-write ratio, and how stale may a page be before it is a bug?
- How skewed is access (do a few products get most views)?
- What happens to the database if the cache is empty, for example after a restart?

**Code / implementation expected:** Optional — cache-aside pseudocode and the hit-ratio arithmetic are enough; the example simulates hit ratio by cache size and compares write policies.`,
    answer: `**Target Audience:** Beginners to system design — you know what a database query is; no caching background assumed.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Hit ratios, latencies and counts come from running the example; the **Verified** section quotes the full output.

## 1. Why This Even Matters — A Story First

A chef keeps salt, oil and the three sauces used in most dishes on the counter next to the stove. Everything else lives in the walk-in storeroom at the back. Reaching for the counter takes a second; walking to the storeroom takes a minute. The counter is tiny compared with the storeroom, yet because most orders use the same few ingredients, the chef almost never walks to the back.

That counter is a **cache**. The storeroom is the database. The chef is fast for two reasons: most reaches are short (lower **latency**), and the storeroom door is rarely opened, so other cooks can use it (**offload**). When a sauce on the counter goes off because someone made a new batch in the storeroom, that is **stale data**, the main price you pay.

📌 **Interview term: cache** — a smaller, faster store that keeps copies of data whose source of truth lives somewhere slower, so repeated reads are served without going to the source.

📌 **Interview term: cache hit / cache miss** — the data was in the cache (hit) or was not and had to be fetched from the source (miss).

## 2. Where the Speed Comes From

### 2.1 Latency: the arithmetic

With hit ratio \`h\`, cache lookup time \`c\` and database time \`d\`, a cache-aside read costs:

~~~text
average latency = h x c + (1 - h) x (c + d)
~~~

A miss pays for the cache lookup **and** the database. With the example's assumed costs (\`c\` = 1 ms, \`d\` = 20 ms) and a 67.5% hit ratio: 0.675 x 1 + 0.325 x 21 = 7.5 ms, the figure the simulation printed. Order-of-magnitude numbers for memory, network and disk are on their own page: [latency numbers every engineer should know](/interview-question/what-latency-numbers-and-availability-targets-should-every-engineer-know).

📌 **Interview term: hit ratio** — hits divided by all lookups. Everything else about a cache follows from it.

### 2.2 Offload: the database sees only the misses

At 5,000 reads per second and a 91.4% hit ratio, the database gets only the misses: 428 reads per second (8.56% of 5,000) instead of 5,000. That is often the real reason for a cache: the database can no longer keep up, and buying a bigger one costs more than a few gigabytes of memory.

📌 **Interview term: offload** — the share of requests a layer absorbs so the layer behind it never sees them.

### 2.3 Why a small cache works: skew

Real traffic is skewed: a few products, users or pages get most of the reads. The simulation draws keys from a **Zipf** distribution (key number *k* is requested with weight 1/*k*) over 10,000 keys. A cache holding **1% of the keys** (100) already serves 39.5% of reads; **10%** (1,000) serves 67.5%; **90%** serves 91.4%. Uniform traffic would give a hit ratio roughly equal to the share of keys cached, and caching would help far less.

📌 **Interview term: working set / hot keys** — the subset of data that receives most of the traffic in a period. Size the cache to hold the working set, not the whole dataset.

### 2.4 The tail does not move until the hit ratio is very high

The p99 (the latency 99% of requests beat) stayed at 21 ms in every row, because even 8.6% misses are far more than 1%. The **median** fell to 1 ms once more than half the reads hit. If your goal is a p99 target, either push the hit ratio above 99% or make misses cheaper. Note too that a miss got slower (21 ms vs 20 ms without a cache): the cache lookup is pure overhead for data that is never reused.

📌 **Interview term: tail latency (p99)** — the latency of the slowest 1% of requests. Users notice it, and a page that makes many backend calls is likely to hit at least one slow one.

## 3. The Read Path: Cache-Aside

The application owns the logic: look in the cache; on a miss, read the database and put the result in the cache for next time.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Cache-aside: the app asks the cache first, and on a miss reads the database and fills the cache">
  <defs>
    <marker id="sd04q1-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="110" width="150" height="70" rx="10"/>
  <text class="d-text" x="105" y="140" text-anchor="middle">Application</text>
  <text class="d-sub" x="105" y="162" text-anchor="middle">cache-aside logic</text>
  <rect class="d-box-accent" x="290" y="30" width="160" height="70" rx="10"/>
  <text class="d-text" x="370" y="60" text-anchor="middle">Cache</text>
  <text class="d-sub" x="370" y="82" text-anchor="middle">memory, about 1 ms</text>
  <rect class="d-box-muted" x="290" y="200" width="160" height="70" rx="10"/>
  <text class="d-text" x="370" y="230" text-anchor="middle">Database</text>
  <text class="d-sub" x="370" y="252" text-anchor="middle">source of truth, 20 ms</text>
  <line class="d-edge-accent" x1="180" y1="125" x2="288" y2="70" marker-end="url(#sd04q1-arrow)"/>
  <text class="d-sub" x="200" y="78" text-anchor="middle">1. GET key</text>
  <line class="d-edge-dashed" x1="180" y1="165" x2="288" y2="230" marker-end="url(#sd04q1-arrow)"/>
  <text class="d-sub" x="196" y="232" text-anchor="middle">2. on miss</text>
  <line class="d-edge" x1="450" y1="235" x2="560" y2="235"/>
  <line class="d-edge" x1="560" y1="235" x2="560" y2="65"/>
  <line class="d-edge" x1="560" y1="65" x2="452" y2="65" marker-end="url(#sd04q1-arrow)"/>
  <text class="d-sub" x="640" y="155" text-anchor="middle">3. SET key</text>
  <text class="d-sub" x="640" y="177" text-anchor="middle">with a TTL</text>
</svg>

Steps 2 and 3 run only on a miss; every later read of the same key is answered at step 1.

~~~js
async function getProduct(id) {
  const key = "product:" + id;
  const cached = await cache.get(key);
  if (cached) return JSON.parse(cached);                  // hit
  const row = await db.query("SELECT ... WHERE id = $1", [id]); // miss
  await cache.set(key, JSON.stringify(row), { EX: 300 }); // fill, 5 minute TTL
  return row;
}
~~~

📌 **Interview term: cache-aside (lazy loading)** — the application reads the cache, and on a miss loads from the database and fills the cache. Only data that is actually requested gets cached; a cold cache costs extra misses at first.

📌 **Interview term: read-through** — the same flow, but the cache library or service loads from the database itself on a miss, so the application only talks to the cache.

📌 **Interview term: TTL (time to live)** — how long an entry may be served before it expires. It bounds staleness and frees memory used by keys nobody reads any more.

## 4. The Write Path: Four Policies

A write changes the database, so the cached copy must be dealt with. The simulation ran the same 100,000 operations (10% writes) under four policies:

| Policy | What a write does | DB reads | DB writes | Stale reads | Unsaved if the cache dies |
| :--- | :--- | ---: | ---: | ---: | ---: |
| Cache-aside + TTL only | Write the DB, leave the cache alone | 36,817 | 10,018 | **28,194** | 0 |
| Cache-aside + delete | Write the DB, then delete the key | 34,151 | 10,018 | 0 | 0 |
| Write-through | Write the DB and the cache together | 29,212 | 10,018 | 0 | 0 |
| Write-back | Write the cache only; flush to the DB on eviction | 29,212 | **4,387** | 0 | **207** |

What the rows teach:

- **Relying on TTL alone** served 28,194 stale reads out of 89,982 reads (31%), because the hottest keys are also the most written. A TTL bounds how long data is wrong; it does not make it right.
- **Deleting on write** removes the staleness, and the next read refills the key, which is why it has more database reads than write-through.
- **Write-through** keeps the cache warm with the new value, so it has the fewest database reads, at the cost of writing data into the cache that may never be read.
- **Write-back** cut database writes by 56% because repeated writes to a hot key collapse into one flush, but 207 keys existed only in cache memory at the end. If that node dies, those writes are gone.

📌 **Interview term: write-through** — every write goes to the cache and the database synchronously; reads after a write see the new value.

📌 **Interview term: write-back (write-behind)** — writes go to the cache and are flushed to the database later. Fast and coalescing, but data can be lost; used for counters and metrics, rarely for money.

📌 **Interview term: write-around** — writes skip the cache entirely (the cache-aside + delete row); good when written data is rarely read soon after.

📌 **Interview term: cache invalidation** — removing or updating cached copies when the source changes. Doing it reliably across services is often done from the database change log; see [CDC with Debezium keeping search and cache in sync](/interview-question/how-does-cdc-with-debezium-keep-search-and-cache-in-sync-with-postgres).

## 5. Eviction: What Leaves When Memory Is Full

A cache is smaller than the data, so something must go when it is full. The example uses **LRU**: the key unused for the longest time is dropped.

📌 **Interview term: LRU / LFU eviction** — least recently used drops the key touched longest ago; least frequently used drops the key with the fewest accesses, which protects steadily popular keys from a one-off scan. Redis approximates both by sampling keys rather than tracking every access, and its default \`maxmemory-policy\` is \`noeviction\` (writes fail with an out-of-memory error when full), so a cache deployment must set a policy such as \`allkeys-lru\` explicitly.

## 6. Verified: Running the Code

The example **"Cache size vs hit ratio, latency and database load, and four write policies compared"** simulates the system in one process: an LRU map stands for Redis or Memcached, another map stands for the database, and latency is added up from the assumed costs (1 ms cache, 20 ms database), not measured. A fixed-seed generator produces the same Zipf traffic in both languages. It leaves out network variance, serialisation cost and concurrency.

The key part, the read path under each write policy:

~~~js
let e = cache.get(k);
if (e && policy === "cache-aside + TTL" && i - e.at > 2000) { cache.delete(k); e = undefined; }
if (!e) { dbReads++; e = { v: db.has(k) ? db.get(k) : -1, at: i }; put(k, e); }
if (e.v !== (truth.has(k) ? truth.get(k) : -1)) stale++;
~~~

Full output (identical in Node and Python):

~~~text
Part 1: 100000 reads over 10000 keys (Zipf), cache 1 ms, database 20 ms
  cache size   hit ratio   avg ms   p50 ms   p99 ms   db reads/s at 5000 req/s
           0        0.0%     20.0       20       20       5000
         100       39.5%     13.1       21       21       3025
        1000       67.5%      7.5        1       21       1626
        3000       81.7%      4.7        1       21        917
        9000       91.4%      2.7        1       21        428

Part 2: 100000 operations, 10% writes, cache holds 1000 keys, TTL 2000 operations
  policy                 db reads   db writes   stale reads   unsaved if cache dies
  cache-aside + TTL         36817       10018         28194                       0
  cache-aside + delete      34151       10018             0                       0
  write-through             29212       10018             0                       0
  write-back                29212        4387             0                     207
~~~

## 7. What to Cache, and Where

| Layer | Example | Good for |
| :--- | :--- | :--- |
| Browser | \`Cache-Control: max-age\` | Static assets, a user's own data for seconds |
| CDN / edge | Cloudflare, CloudFront | Public pages, images, video; see [what a CDN is](/interview-question/what-is-a-cdn-and-how-does-it-work) and [edge caching on Cloudflare](/interview-question/edge-caching-on-cloudflare-how-do-you-get-95-hit-rate-without-stale-data) |
| In-process memory | A map in each app server | Tiny, very hot, rarely changing data (config, feature flags) |
| Shared cache | Redis, Memcached | Sessions, query results, rendered fragments; scaling it out is [designing a distributed cache](/interview-question/how-would-you-design-a-distributed-cache) |
| Database | Buffer pool, [read replicas](/interview-question/when-do-you-use-a-read-replica-vs-a-cache) | Everything, automatically, but only as fast as the database |

Cache data that is read far more than it is written, is expensive to produce (a join, a rendered page, a call to another service), and can be a little stale. Do not cache data unique to each request, data that must never be stale (an account balance during a transfer), or anything whose key includes user identity unless the cache is private to that user.

## 8. Edge Cases Worth Knowing

- **Cache stampede (thundering herd).** A hot key expires and hundreds of requests miss at the same moment, all querying the database. Fixes: let one request rebuild while others wait or get the old value (*single-flight* or a lock), add random jitter to TTLs, or refresh hot keys before they expire. Facebook's *Scaling Memcache at Facebook* paper (NSDI 2013) describes **leases** for this and reports the peak database query rate dropping from 17K/s to 1.3K/s.
- **Cache penetration.** Requests for keys that do not exist always miss and always reach the database (a bot probing random IDs). Cache the "not found" answer for a short TTL, or put a [Bloom filter](/interview-question/what-is-a-bloom-filter-and-when-is-it-useful) in front.
- **Cold start.** After a restart or a new deployment of the cache, the hit ratio is zero and the database takes the full load. Warm the cache from logs of hot keys, or bring capacity back gradually.
- **Race between write and fill.** Reader A misses and reads the old row; writer B updates the row and deletes the key; reader A then writes the old row into the cache. Short TTLs bound the damage; version numbers or a delayed second delete close the gap.
- **Serialisation cost.** For large objects, encoding and decoding can cost more than the database read you saved. Cache the shape the caller needs, not the raw rows.

## Common Pitfalls

- **Quoting "the cache makes it fast" without a hit ratio.** At 39.5% hits the average only fell from 20 ms to 13.1 ms and the p99 got worse; always state the expected hit ratio and what it does to the database.
- **Treating TTL as an invalidation strategy.** The run served 28,194 stale reads with TTL alone; delete or update on write, and use the TTL as a safety net.
- **Forgetting the empty-cache case.** If the database cannot survive the full read load, the cache is now part of availability and needs replicas and warm-up.
- **Caching per-user data under a shared key.** A key like \`homepage\` that contains one user's name leaks data to everyone.
- **Write-back for data you cannot lose.** It is a durability decision, not a performance tweak.
- **Unbounded keys.** Caching every search query string fills memory with entries read once; cache the hot ones or normalise the key.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The two wins:</strong> <span style="color:#f0e2c8;">A cache keeps copies of hot data in memory, so a <strong style="color:#ffca28;">hit</strong> costs about a millisecond instead of a database round trip, and every hit is a query the database never sees. Both depend on the <strong style="color:#ffca28;">hit ratio</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it works:</strong> <span style="color:#f0e2c8;">Access is skewed. In a Zipf workload, caching 10% of keys served 67.5% of reads and cut average latency from 20 ms to 7.5 ms. The <strong style="color:#ffca28;">p99</strong> only improves once misses drop below 1%.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Read path:</strong> <span style="color:#f0e2c8;">Default to <strong style="color:#ffca28;">cache-aside</strong>: check the cache, on a miss read the database and fill the key with a <strong style="color:#ffca28;">TTL</strong>. Evict with <strong style="color:#ffca28;">LRU</strong> or <strong style="color:#ffca28;">LFU</strong>, and set that policy explicitly.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Write path:</strong> <span style="color:#f0e2c8;">Delete or update the key on write; TTL alone left 31% of reads stale in the simulation. <strong style="color:#ffca28;">Write-through</strong> keeps the cache warm; <strong style="color:#ffca28;">write-back</strong> saves writes but can lose data.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. What breaks:</strong> <span style="color:#f0e2c8;">Hot-key expiry causing a <strong style="color:#ffca28;">stampede</strong> (single-flight, jitter), lookups for missing keys (negative caching, Bloom filter), and a cold cache after restart overwhelming the database.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you choose a TTL?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">From how stale the data may be and how often it changes. Product descriptions can live for hours with delete-on-write; a stock count might get seconds. Add jitter so keys written together do not expire together, and keep the TTL as a safety net even when you invalidate on write.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you not add a cache?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When reads are mostly unique (low hit ratio), when data must always be current, or when the database is not actually the bottleneck. A cache adds a second copy that can be wrong, another service to run, and a failure mode where an empty cache overloads the database.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Cache-aside or write-through?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Cache-aside is simpler and only caches what is read. Write-through is better when data is read right after it is written, because the next read is a hit. Many systems combine them: write-through for the entity, delete for derived keys such as lists that contain it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you prevent a stampede on a hot key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Let one request rebuild while the rest wait or are served the old value (a lock or lease, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stale-while-revalidate</code> behaviour), refresh hot keys before expiry, and spread expiries with random jitter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you measure whether the cache is working?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Hit ratio per key prefix, cache and database latency percentiles, database queries per second, eviction rate and memory use. A rising eviction rate with a falling hit ratio means the working set no longer fits.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Cache | A smaller, faster copy of data whose source of truth is elsewhere |
| Cache hit / miss | Found in the cache vs fetched from the source |
| Hit ratio | Hits divided by all lookups |
| Offload | Share of requests absorbed before reaching the next layer |
| Working set / hot keys | The data that gets most of the traffic |
| Tail latency (p99) | Latency of the slowest 1% of requests |
| Cache-aside | App checks cache, loads from DB on a miss, fills the cache |
| Read-through | The cache itself loads from the DB on a miss |
| TTL | How long an entry may be served before it expires |
| Write-through | Write cache and DB together |
| Write-back | Write cache now, DB later |
| Write-around | Write DB only; the cache fills on the next read |
| Cache invalidation | Removing or updating cached copies when the source changes |
| LRU / LFU | Evict least recently / least frequently used keys |

**Conclusion:** Caching improves performance by answering repeated reads from fast memory and by keeping those reads away from the database, and both effects are set by the hit ratio. Skewed traffic is what makes a small cache effective: in the run, 10% of keys served 67.5% of reads and the database load fell from 5,000 to 1,626 reads per second. Use cache-aside with a TTL for reads, delete or update keys on write instead of trusting TTLs, choose write-back only for data you can afford to lose, and plan for stampedes, missing-key floods and the day the cache is empty.`,
    examples: [
      {
        label: `Cache size vs hit ratio, latency and database load, and four write policies compared`,
        variants: [
          { tech: "node", code: `// How a cache changes latency and database load, and what each write policy costs.
// Simulated: an in-process LRU stands for Redis/Memcached, a Map stands for the database.
// Latencies are assumed costs (cache 1 ms, database 20 ms), not measurements.

let seed = 7;
function rand() { // Park-Miller generator, identical in every language
  seed = (seed * 48271) % 2147483647;
  return seed / 2147483647;
}

const KEYS = 10000;
const cdf = [];
let total = 0;
for (let k = 1; k <= KEYS; k++) { total += 1 / k; cdf.push(total); }
function pick() { // Zipf: key k is requested with weight 1/k
  const u = rand() * total;
  let lo = 0, hi = KEYS - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid] < u) lo = mid + 1; else hi = mid; }
  return lo;
}

class LRU {
  constructor(cap) { this.cap = cap; this.map = new Map(); }
  get(k) {
    if (!this.map.has(k)) return undefined;
    const v = this.map.get(k); this.map.delete(k); this.map.set(k, v); return v;
  }
  set(k, v) {
    let out = null;
    if (this.map.has(k)) this.map.delete(k);
    else if (this.map.size >= this.cap) {
      const old = this.map.keys().next().value;
      out = [old, this.map.get(old)]; this.map.delete(old);
    }
    this.map.set(k, v);
    return out;
  }
  delete(k) { this.map.delete(k); }
}

const CACHE_MS = 1, DB_MS = 20, N = 100000, RPS = 5000;

console.log(\`Part 1: \${N} reads over \${KEYS} keys (Zipf), cache \${CACHE_MS} ms, database \${DB_MS} ms\`);
console.log("  cache size   hit ratio   avg ms   p50 ms   p99 ms   db reads/s at " + RPS + " req/s");
for (const cap of [0, 100, 1000, 3000, 9000]) {
  seed = 7;
  const cache = new LRU(Math.max(cap, 1));
  const lat = [];
  let hits = 0;
  for (let i = 0; i < N; i++) {
    const k = pick();
    if (cap > 0 && cache.get(k) !== undefined) { hits++; lat.push(CACHE_MS); continue; }
    lat.push(cap > 0 ? CACHE_MS + DB_MS : DB_MS); // a miss pays for the cache lookup too
    if (cap > 0) cache.set(k, "row" + k);
  }
  lat.sort((a, b) => a - b);
  const sum = lat.reduce((a, b) => a + b, 0);
  const avg = (Math.round((sum * 10) / N) / 10).toFixed(1);
  const p50 = lat[Math.floor(N * 0.5)], p99 = lat[Math.floor(N * 0.99)];
  const dbPerSec = Math.round((RPS * (N - hits)) / N);
  console.log(\`  \${String(cap).padStart(10)}   \${(Math.round((hits * 1000) / N) / 10).toFixed(1).padStart(8)}%   \${avg.padStart(6)}   \${String(p50).padStart(6)}   \${String(p99).padStart(6)}   \${String(dbPerSec).padStart(8)}\`);
}

console.log("\\nPart 2: 100000 operations, 10% writes, cache holds 1000 keys, TTL 2000 operations");
console.log("  policy                 db reads   db writes   stale reads   unsaved if cache dies");
for (const policy of ["cache-aside + TTL", "cache-aside + delete", "write-through", "write-back"]) {
  seed = 7;
  const db = new Map(), truth = new Map(), dirty = new Set();
  const cache = new LRU(1000);
  let dbReads = 0, dbWrites = 0, stale = 0;
  const put = (k, e) => { // write-back flushes a dirty entry only when it is evicted
    const out = cache.set(k, e);
    if (out && dirty.has(out[0])) { db.set(out[0], out[1].v); dbWrites++; dirty.delete(out[0]); }
  };
  for (let i = 0; i < N; i++) {
    const k = pick();
    if (rand() < 0.1) { // a write of value i to key k
      truth.set(k, i);
      if (policy === "write-back") { put(k, { v: i, at: i }); dirty.add(k); continue; }
      db.set(k, i); dbWrites++;
      if (policy === "cache-aside + delete") cache.delete(k);
      if (policy === "write-through") put(k, { v: i, at: i });
      continue;
    }
    let e = cache.get(k);
    if (e && policy === "cache-aside + TTL" && i - e.at > 2000) { cache.delete(k); e = undefined; }
    if (!e) { dbReads++; e = { v: db.has(k) ? db.get(k) : -1, at: i }; put(k, e); }
    if (e.v !== (truth.has(k) ? truth.get(k) : -1)) stale++;
  }
  console.log(\`  \${policy.padEnd(22)} \${String(dbReads).padStart(8)}   \${String(dbWrites).padStart(9)}   \${String(stale).padStart(11)}   \${String(dirty.size).padStart(21)}\`);
}` },
          { tech: "python", code: `# How a cache changes latency and database load, and what each write policy costs.
# Simulated: an in-process LRU stands for Redis/Memcached, a dict stands for the database.
# Latencies are assumed costs (cache 1 ms, database 20 ms), not measurements.
import math
from collections import OrderedDict

seed = 7


def rand():  # Park-Miller generator, identical in every language
    global seed
    seed = (seed * 48271) % 2147483647
    return seed / 2147483647


KEYS = 10000
cdf = []
total = 0.0
for k in range(1, KEYS + 1):
    total += 1 / k
    cdf.append(total)


def pick():  # Zipf: key k is requested with weight 1/k
    u = rand() * total
    lo, hi = 0, KEYS - 1
    while lo < hi:
        mid = (lo + hi) >> 1
        if cdf[mid] < u:
            lo = mid + 1
        else:
            hi = mid
    return lo


class LRU:
    def __init__(self, cap):
        self.cap = cap
        self.map = OrderedDict()

    def get(self, k):
        if k not in self.map:
            return None
        self.map.move_to_end(k)
        return self.map[k]

    def set(self, k, v):
        out = None
        if k in self.map:
            del self.map[k]
        elif len(self.map) >= self.cap:
            out = self.map.popitem(last=False)
        self.map[k] = v
        return out

    def delete(self, k):
        self.map.pop(k, None)


def jround(x):  # JavaScript Math.round for positive numbers
    return math.floor(x + 0.5)


CACHE_MS, DB_MS, N, RPS = 1, 20, 100000, 5000

print(f"Part 1: {N} reads over {KEYS} keys (Zipf), cache {CACHE_MS} ms, database {DB_MS} ms")
print("  cache size   hit ratio   avg ms   p50 ms   p99 ms   db reads/s at " + str(RPS) + " req/s")
for cap in [0, 100, 1000, 3000, 9000]:
    seed = 7
    cache = LRU(max(cap, 1))
    lat = []
    hits = 0
    for i in range(N):
        k = pick()
        if cap > 0 and cache.get(k) is not None:
            hits += 1
            lat.append(CACHE_MS)
            continue
        lat.append(CACHE_MS + DB_MS if cap > 0 else DB_MS)  # a miss pays for the cache lookup too
        if cap > 0:
            cache.set(k, "row" + str(k))
    lat.sort()
    s = sum(lat)
    avg = f"{jround(s * 10 / N) / 10:.1f}"
    p50, p99 = lat[math.floor(N * 0.5)], lat[math.floor(N * 0.99)]
    db_per_sec = jround(RPS * (N - hits) / N)
    hit = f"{jround(hits * 1000 / N) / 10:.1f}"
    print(f"  {cap:>10}   {hit:>8}%   {avg:>6}   {p50:>6}   {p99:>6}   {db_per_sec:>8}")

print("\\nPart 2: 100000 operations, 10% writes, cache holds 1000 keys, TTL 2000 operations")
print("  policy                 db reads   db writes   stale reads   unsaved if cache dies")
for policy in ["cache-aside + TTL", "cache-aside + delete", "write-through", "write-back"]:
    seed = 7
    db, truth, dirty = {}, {}, set()
    cache = LRU(1000)
    db_reads = db_writes = stale = 0

    def put(k, e):  # write-back flushes a dirty entry only when it is evicted
        global db_writes
        out = cache.set(k, e)
        if out and out[0] in dirty:
            db[out[0]] = out[1]["v"]
            db_writes += 1
            dirty.discard(out[0])

    for i in range(N):
        k = pick()
        if rand() < 0.1:  # a write of value i to key k
            truth[k] = i
            if policy == "write-back":
                put(k, {"v": i, "at": i})
                dirty.add(k)
                continue
            db[k] = i
            db_writes += 1
            if policy == "cache-aside + delete":
                cache.delete(k)
            if policy == "write-through":
                put(k, {"v": i, "at": i})
            continue
        e = cache.get(k)
        if e and policy == "cache-aside + TTL" and i - e["at"] > 2000:
            cache.delete(k)
            e = None
        if not e:
            db_reads += 1
            e = {"v": db.get(k, -1), "at": i}
            put(k, e)
        if e["v"] != truth.get(k, -1):
            stale += 1
    print(f"  {policy:<22} {db_reads:>8}   {db_writes:>9}   {stale:>11}   {len(dirty):>21}")` },
        ],
      },
    ],
  },
  {
    title: `When do you use a read replica vs a cache?`,
    difficulty: "medium",
    seoDescription: `Read replica or cache? What each can answer, replication lag and read-your-writes, invalidation, cost, and the bug of refilling a cache from a replica.`,
    description: `**Question presented to candidate:**
"Our primary Postgres database is overloaded with reads. One engineer wants to add read replicas, another wants to put Redis in front. How do you decide, and could you use both?"

**What a strong answer should cover:**
- The core distinction: a **read replica** is a full copy of the database that can run **any query** (joins, filters, aggregates) but is a little behind (**replication lag**); a **cache** holds a **subset** of answers under keys you choose, is far faster per lookup, and stays correct only if **you** invalidate it
- Which workload fits which: repeated key lookups of hot objects favour a cache; many different queries, reports and search pages favour replicas
- Consistency on replicas: **asynchronous replication**, **read-your-writes** (route a user to the primary after their own write), **monotonic reads** (stick a session to one replica)
- Consistency on caches: invalidation on write, TTLs, and the race of **refilling a cache from a lagging replica**
- Cost and operations: replicas cost a whole database instance each and need no application changes beyond routing; a cache needs code for keys, invalidation and failure handling
- Using both: cache for the hot keys, replicas for the long tail of queries, primary for writes and must-be-current reads

**Clarifying questions expected:**
- Are the expensive reads repeated key lookups, or many distinct queries?
- How stale may a read be, and does a user need to see their own write immediately?

**Code / implementation expected:** No — a clear comparison with the consistency traps is the answer; the example simulates lag, routing and the cache refill race.`,
    answer: `**Target Audience:** Beginners to system design — you know what a database and a query are; replication and caching are explained here.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Behaviour claims (stale reads, counts) come from running the example; the **Verified** section quotes the full output.

## 1. Why This Even Matters — A Story First

A busy library has one reference librarian who knows every book. Queues form. You could hire **assistant librarians** who each have a full copy of the catalogue, updated every evening from the head librarian's notes: they can answer any question, but if a book was moved this afternoon, they do not know yet. Or you could put a **notice board** by the door with answers to the twenty questions everyone asks ("Where are the toilets? When do you close?"): instant, but useless for any question not on the board, and wrong if somebody forgets to update it.

The assistants are **read replicas**. The notice board is a **cache**. Both take load off the head librarian (the **primary** database), but they help with different questions and go wrong in different ways.

📌 **Interview term: primary (leader) and read replica (follower)** — the primary accepts writes; a read replica is another database server that receives the primary's changes and serves read-only queries. How changes flow is covered in [what is database replication](/interview-question/what-is-database-replication).

📌 **Interview term: cache** — a fast key-value store (usually in memory, such as Redis or Memcached) holding copies of selected answers. How caches speed things up in general is on [how caching improves system performance](/interview-question/how-does-caching-improve-system-performance).

## 2. The Core Difference

<svg class="iq-diagram" width="100%" viewBox="0 0 760 320" role="img" aria-label="The app sends writes to the primary, key lookups to the cache, and other queries to read replicas fed by replication">
  <defs>
    <marker id="sd04q2-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="125" width="140" height="70" rx="10"/>
  <text class="d-text" x="100" y="155" text-anchor="middle">Application</text>
  <text class="d-sub" x="100" y="177" text-anchor="middle">routes each read</text>
  <rect class="d-box-accent" x="300" y="20" width="180" height="66" rx="10"/>
  <text class="d-text" x="390" y="48" text-anchor="middle">Cache</text>
  <text class="d-sub" x="390" y="70" text-anchor="middle">hot keys only</text>
  <rect class="d-box" x="300" y="127" width="180" height="66" rx="10"/>
  <text class="d-text" x="390" y="155" text-anchor="middle">Primary</text>
  <text class="d-sub" x="390" y="177" text-anchor="middle">all writes</text>
  <rect class="d-box-muted" x="300" y="234" width="180" height="66" rx="10"/>
  <text class="d-text" x="390" y="262" text-anchor="middle">Read replicas</text>
  <text class="d-sub" x="390" y="284" text-anchor="middle">any query, slightly behind</text>
  <line class="d-edge-accent" x1="170" y1="140" x2="298" y2="60" marker-end="url(#sd04q2-arrow)"/>
  <line class="d-edge" x1="170" y1="160" x2="298" y2="160" marker-end="url(#sd04q2-arrow)"/>
  <line class="d-edge" x1="170" y1="180" x2="298" y2="262" marker-end="url(#sd04q2-arrow)"/>
  <line class="d-edge-dashed" x1="480" y1="170" x2="600" y2="170"/>
  <line class="d-edge-dashed" x1="600" y1="170" x2="600" y2="267"/>
  <line class="d-edge-dashed" x1="600" y1="267" x2="482" y2="267" marker-end="url(#sd04q2-arrow)"/>
  <text class="d-sub" x="680" y="210" text-anchor="middle">async</text>
  <text class="d-sub" x="680" y="230" text-anchor="middle">replication</text>
</svg>

The replica gets every change automatically but late; the cache gets only what the application puts in it, and stays correct only if the application removes or updates it.

| | Read replica | Cache |
| :--- | :--- | :--- |
| What it holds | A full copy of the database | A subset: answers you chose to store, under keys you chose |
| What it can answer | Any read query: joins, filters, sorts, aggregates | Only exact keys that were stored |
| How it stays current | Replication from the primary, automatic, with **lag** | Your code: delete or update on write, plus a **TTL** |
| Typical latency per read | A database query (milliseconds, more for heavy queries) | A memory lookup over the network (sub-millisecond to about a millisecond) |
| Application changes | Route reads to a replica endpoint | Key design, fill logic, invalidation, fallback when the cache is down |
| Scales by | Adding replicas (a whole database server each) | Adding memory or nodes; one node serves many times a replica's lookups |
| Failure effect | Reads move to other replicas or the primary | Misses fall through to the database, possibly overloading it |

📌 **Interview term: replication lag** — how far a replica is behind the primary, in time or log position. On PostgreSQL, streaming replication is asynchronous by default: the primary does not wait for replicas to confirm (Crunchy Data, *Synchronous Replication in PostgreSQL*). On Amazon Aurora, replicas share the writer's storage volume but are updated asynchronously, and AWS exposes the delay as the \`AuroraReplicaLag\` CloudWatch metric (AWS re:Post knowledge-center article on Aurora replica restarts). Lag is usually small and occasionally large, during a big write burst or a long query on the replica.

## 3. When Each One Wins

**Choose read replicas when:**

- Reads are many **different** queries: search pages with filters, reports, admin screens, exports. A cache would need a key per query shape and would rarely hit.
- You need **complex query power** on a copy: the example ran "top 3 users in Oslo by followers" on the replica (\`user10:70 user7:59 user4:48\`), while the cache could only answer \`GET user:4\` and missed on the top-3 question because nobody had stored that exact answer.
- You want almost **no application changes**: point read-only traffic at a replica endpoint.
- You want to isolate heavy work (analytics, backups) from the primary.

**Choose a cache when:**

- Reads are **repeated lookups** of the same objects: product pages, user profiles, session data, feature flags, computed feeds.
- The answer is **expensive to compute** (many joins, a call to another service), so storing the result saves more than a query.
- You need **lower latency** than any database can give, or far more reads per second per dollar.

**Use both** in most real systems: a cache absorbs the hot keys, replicas serve the varied long tail, and the primary takes writes and the reads that must be current.

## 4. Consistency Traps on Replicas

### 4.1 Read-your-writes

A user renames themselves and the page reloads from a replica that has not received the change yet. The example's slow replica (400 ms lag) returned the old name 100 ms after the write.

📌 **Interview term: read-your-writes (read-after-write) consistency** — a user always sees their own writes. Common fixes: send a user's reads to the primary for a short window after they write (the example pinned for 1 s and returned \`Asha\`), wait until the replica has replayed past the write's log position, or answer from the data the write already returned.

### 4.2 Monotonic reads

Session B read the new name from a fast replica (50 ms lag) at t=2060, then the old name from the slow replica at t=2080: time went backwards.

📌 **Interview term: monotonic reads** — once you have seen a value, you never see an older one. Fix: pin each session to one replica (by hashing the session ID), or track the last log position the session saw.

For the full spectrum, see [strong vs eventual consistency](/interview-question/what-is-the-difference-between-strong-and-eventual-consistency).

## 5. The Trap of Using Both: Refilling a Cache from a Replica

This is the bug interviewers like, because it only appears when replicas and a cache are combined. The application writes to the primary and deletes the cache key, which is correct. The next read misses, but the fill logic reads from a **replica** that has not caught up, and writes the **old** value back into the cache with a long TTL.

| Time (ms) | Event |
| :--- | :--- |
| 5000 | Write \`v2\` to the primary; delete \`user:9\` from the cache |
| 5010 | Read misses; fill from the replica, which still has \`v1\`; cache \`v1\` for one hour |
| 5400 | The replica applies \`v2\` (400 ms lag), but the cache still holds \`v1\` |
| 5010 to 65010 | Every read is a cache hit on \`v1\` |

The example made one read every 100 ms for a minute:

| Fill strategy | Stale reads out of 600 | Reads from the source |
| :--- | ---: | ---: |
| Fill from the replica | **600** | 1 |
| Fill from the primary | 0 | 1 |
| Fill from the replica, and delete the key again after the lag | 5 | 2 |

Fixes, in order of strength: fill the cache from the primary (or have the writer write the new value into the cache); a **delayed double delete** (delete again after the expected lag), which shrank the damage to 5 stale reads; store a **version** with each cache entry and refuse to overwrite a newer version with an older one; or drive invalidation from the replication stream itself (see [CDC with Debezium](/interview-question/how-does-cdc-with-debezium-keep-search-and-cache-in-sync-with-postgres)).

📌 **Interview term: delayed double delete** — delete the cache key at write time, then again after a delay longer than replication lag, so a stale refill in between is removed.

## 6. Sizing: a Worked Example

Assume 20,000 reads per second, one replica handles 4,000 reads per second, one cache node handles 100,000 lookups per second, and the cache hits 95% (assumptions, not benchmarks; measure your own):

- **Replicas only:** 20,000 / 4,000 = **5 replicas**, each a full database server with its own storage.
- **Cache plus primary:** 20,000 / 100,000 rounds up to **1 cache node**, and 20,000 x 5% = **1,000 misses per second** reach the database, which the primary may handle alone.

The cache looks cheaper, but only if 95% of reads really are repeated key lookups. If half the traffic is varied search queries, those never hit a cache and still need replicas.

## 7. Verified: Running the Code

The example **"Read replica vs cache: query power, replication lag, read-your-writes, refilling a cache from a replica"** runs on a fake clock in milliseconds. The primary is a map plus a replication log; each replica applies a log entry once it is \`lag\` ms old, which stands in for asynchronous streaming replication. The cache is a map with expiry times. It leaves out real networking, replication by log position, and query planning.

The key part, the replica applying the log late:

~~~js
catchUp(now) { // apply every log entry that is at least LAG ms old
  while (this.applied < this.p.log.length && this.p.log[this.applied].t + this.lag <= now) {
    const e = this.p.log[this.applied++]; this.rows.set(e.id, { ...e.row });
  }
}
~~~

Full output (identical in Node and Python):

~~~text
Part 1: what each one can answer (t=1000 ms)
  replica, top 3 in Oslo by followers (filter + sort): user10:70 user7:59 user4:48
  cache, GET user:4: user4
  cache, top 3 in Oslo: miss (nobody cached that exact answer)

Part 2: read-your-writes and monotonic reads
  t=2000 user 7 renames to Asha on the primary
  t=2100 read from slow replica (lag 400): user7 <- the user sees the old name
  t=2100 same read, pinned to primary after a write: Asha
  session B, t=2060 read from fast replica (lag 50): Asha
  session B, t=2080 next read lands on slow replica: user7 <- went back in time

Part 3: cache refilled from a lagging replica after an invalidation
  fill from replica                          stale reads 600 of 600, source reads 1
  fill from primary                          stale reads   0 of 600, source reads 1
  fill from replica + delete again after lag stale reads   5 of 600, source reads 2

Part 4: sizing for 20000 reads/s (assumed capacities)
  replicas only: 5 replicas at 4000 reads/s each
  cache (95% hits) + primary: 1 cache node, 1000 misses/s reach the database
~~~

## 8. Edge Cases Worth Knowing

- **Replica lag spikes.** A long-running query on a replica, or a burst of writes on the primary, can push lag from milliseconds to seconds or minutes. Monitor it, and take a replica out of rotation when it is too far behind.
- **Failover changes the picture.** If the primary fails and a replica is promoted, writes it had not received can be lost under asynchronous replication.
- **Synchronous replicas trade write latency for freshness.** PostgreSQL can make a commit wait until a standby has applied it (\`synchronous_commit = remote_apply\`), which removes read-your-writes problems on that standby but slows every write.
- **Cache down, replicas fine.** When a cache cluster fails, all its traffic falls through to the database. If the replicas and primary cannot take that load, the cache has become an availability dependency and needs replicas of its own.
- **Caching query results.** You can cache a whole query result under a key derived from the query, but invalidation becomes hard: any write to any row in the result must remove it.

## Common Pitfalls

- **Treating them as interchangeable.** A cache does not help a workload of varied queries; replicas do not give sub-millisecond lookups of computed objects.
- **Reading your own write from a replica.** Users see their change vanish and click again; route post-write reads to the primary or wait for the replica.
- **Filling the cache from a replica.** The run cached a stale value for 600 of 600 reads; fill from the primary or use versions.
- **Ignoring the cache-down case.** Size the database for the misses you would get when the cache is empty, or protect it with rate limits.
- **Forgetting that replicas cost a full database each.** Five replicas mean five servers with storage, backups and upgrades.
- **Adding replicas for a write bottleneck.** Replicas only absorb reads; every replica still replays every write.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The distinction:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">read replica</strong> is a full copy of the database that can run <strong style="color:#ffca28;">any query</strong> but lags the primary. A <strong style="color:#ffca28;">cache</strong> holds a <strong style="color:#ffca28;">subset</strong> of answers under keys you choose, is much faster per lookup, and is only correct if you <strong style="color:#ffca28;">invalidate</strong> it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Choosing:</strong> <span style="color:#f0e2c8;">Many different queries, reports and filters go to <strong style="color:#ffca28;">replicas</strong>. Repeated lookups of hot or expensive objects go to a <strong style="color:#ffca28;">cache</strong>. Most systems use both, with writes and must-be-current reads on the primary.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Replica consistency:</strong> <span style="color:#f0e2c8;">Replication is usually <strong style="color:#ffca28;">asynchronous</strong>, so plan for <strong style="color:#ffca28;">read-your-writes</strong> (pin a user to the primary after their write) and <strong style="color:#ffca28;">monotonic reads</strong> (stick a session to one replica).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The combined trap:</strong> <span style="color:#f0e2c8;">Never refill a cache from a lagging replica after invalidating it. In my simulation that cached the old value for a whole minute; fill from the primary, use versions, or do a delayed second delete.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost and failure:</strong> <span style="color:#f0e2c8;">Each replica is a whole database server; a cache node handles far more lookups but adds code and a failure mode where an empty cache sends everything to the database.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you implement read-your-writes with replicas?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Record the time or log position of the user's last write (in their session or a cookie), and route their reads to the primary until the replica has passed that point, or for a fixed window longer than typical lag.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you cache results of search queries?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only the few very popular ones, with a short TTL, because invalidating a result set on every matching write is hard. The long tail of searches is better served by replicas or a search index.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens when replica lag grows to 30 seconds?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Users see old data and lose their own writes. Alert on lag, remove the lagging replica from the read pool, and fall back to the primary or other replicas for reads that must be fresh.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a cache replace replicas for availability?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. A cache does not hold the full data and cannot take over if the primary fails. Replicas double as failover candidates; a cache only reduces load.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use synchronous replication instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When reads on the replica must always be current or committed data must survive losing the primary. It costs write latency on every commit, so it is usually limited to one standby.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Primary / read replica | The writable database and its read-only copies |
| Cache | A fast key-value store of selected answers |
| Replication lag | How far a replica is behind the primary |
| Read-your-writes | A user always sees their own writes |
| Monotonic reads | A reader never sees an older value after a newer one |
| Delayed double delete | Delete a cache key at write time and again after the lag |

**Conclusion:** Read replicas and caches both take reads off the primary, but a replica is a complete, slightly late copy that answers any query, and a cache is a fast, partial copy that answers only the keys you store and stays correct only through your invalidation. Pick replicas for varied queries and little code change, a cache for repeated hot lookups and very low latency, and usually both. Then handle the consistency traps the simulation showed: users reading their own writes from a lagging replica, sessions going back in time across replicas, and a cache refilled from a replica holding the old value for 600 of 600 reads.`,
    examples: [
      {
        label: `Read replica vs cache: query power, replication lag, read-your-writes, refilling a cache from a replica`,
        variants: [
          { tech: "node", code: `// Read replica vs cache, simulated on a fake clock (milliseconds).
// The primary is a Map plus a replication log; a replica applies each log entry
// LAG ms after it was committed (asynchronous replication). The cache is a Map with TTLs.

class Primary {
  constructor() { this.rows = new Map(); this.log = []; }
  write(t, id, row) { this.rows.set(id, { ...row }); this.log.push({ t, id, row: { ...row } }); }
}
class Replica {
  constructor(primary, lag) { this.p = primary; this.lag = lag; this.rows = new Map(); this.applied = 0; }
  catchUp(now) { // apply every log entry that is at least LAG ms old
    while (this.applied < this.p.log.length && this.p.log[this.applied].t + this.lag <= now) {
      const e = this.p.log[this.applied++]; this.rows.set(e.id, { ...e.row });
    }
  }
  get(now, id) { this.catchUp(now); return this.rows.get(id); }
  query(now, fn) { this.catchUp(now); return fn([...this.rows.values()]); }
}
class Cache {
  constructor() { this.m = new Map(); }
  get(now, k) { const e = this.m.get(k); return e && e.exp > now ? e.v : undefined; }
  set(now, k, v, ttl) { this.m.set(k, { v, exp: now + ttl }); }
  del(k) { this.m.delete(k); }
}

const db = new Primary();
const cities = ["Pune", "Oslo", "Lima"];
for (let id = 1; id <= 12; id++) db.write(0, id, { id, name: "user" + id, city: cities[id % 3], followers: (id * 37) % 100 });
const fast = new Replica(db, 50), slow = new Replica(db, 400);

console.log("Part 1: what each one can answer (t=1000 ms)");
const top = fast.query(1000, (rs) => rs.filter((r) => r.city === "Oslo").sort((a, b) => b.followers - a.followers).slice(0, 3).map((r) => r.name + ":" + r.followers));
console.log("  replica, top 3 in Oslo by followers (filter + sort):", top.join(" "));
const cache = new Cache();
cache.set(1000, "user:4", db.rows.get(4), 60000);
console.log("  cache, GET user:4:", cache.get(1000, "user:4").name);
console.log("  cache, top 3 in Oslo:", cache.get(1000, "top:Oslo") === undefined ? "miss (nobody cached that exact answer)" : "hit");

console.log("\\nPart 2: read-your-writes and monotonic reads");
db.write(2000, 7, { ...db.rows.get(7), name: "Asha" });
console.log("  t=2000 user 7 renames to Asha on the primary");
console.log("  t=2100 read from slow replica (lag 400):", slow.get(2100, 7).name, "<- the user sees the old name");
const pinnedUntil = 2000 + 1000; // route this user to the primary for 1 s after their own write
const route = (now) => (now < pinnedUntil ? db.rows : slow.rows);
console.log("  t=2100 same read, pinned to primary after a write:", route(2100).get(7).name);
console.log("  session B, t=2060 read from fast replica (lag 50):", fast.get(2060, 7).name);
console.log("  session B, t=2080 next read lands on slow replica:", slow.get(2080, 7).name, "<- went back in time");

console.log("\\nPart 3: cache refilled from a lagging replica after an invalidation");
for (const strategy of ["fill from replica", "fill from primary", "fill from replica + delete again after lag"]) {
  const c = new Cache();
  const p = new Primary();
  p.write(0, 9, { name: "v1" });
  const r = new Replica(p, 400);
  c.set(0, "user:9", { name: "v1" }, 3600000);
  p.write(5000, 9, { name: "v2" }); c.del("user:9"); // write, then invalidate
  let stale = 0, dbReads = 0;
  for (let now = 5010; now < 65010; now += 100) { // one read every 100 ms for a minute
    if (strategy.endsWith("after lag") && now === 5510) c.del("user:9"); // second delete at write + lag + 100
    let v = c.get(now, "user:9");
    if (v === undefined) {
      dbReads++;
      v = strategy === "fill from primary" ? p.rows.get(9) : r.get(now, 9);
      c.set(now, "user:9", v, 3600000);
    }
    if (v.name !== "v2") stale++;
  }
  console.log(\`  \${strategy.padEnd(42)} stale reads \${String(stale).padStart(3)} of 600, source reads \${dbReads}\`);
}

console.log("\\nPart 4: sizing for 20000 reads/s (assumed capacities)");
const reads = 20000, replicaCap = 4000, cacheCap = 100000, hitRatio = 0.95;
console.log(\`  replicas only: \${Math.ceil(reads / replicaCap)} replicas at \${replicaCap} reads/s each\`);
const misses = Math.round(reads * (1 - hitRatio));
console.log(\`  cache (95% hits) + primary: \${Math.ceil(reads / cacheCap)} cache node, \${misses} misses/s reach the database\`);` },
          { tech: "python", code: `# Read replica vs cache, simulated on a fake clock (milliseconds).
# The primary is a dict plus a replication log; a replica applies each log entry
# LAG ms after it was committed (asynchronous replication). The cache is a dict with TTLs.
import math


class Primary:
    def __init__(self):
        self.rows, self.log = {}, []

    def write(self, t, id, row):
        self.rows[id] = dict(row)
        self.log.append({"t": t, "id": id, "row": dict(row)})


class Replica:
    def __init__(self, primary, lag):
        self.p, self.lag, self.rows, self.applied = primary, lag, {}, 0

    def catch_up(self, now):  # apply every log entry that is at least LAG ms old
        while self.applied < len(self.p.log) and self.p.log[self.applied]["t"] + self.lag <= now:
            e = self.p.log[self.applied]
            self.applied += 1
            self.rows[e["id"]] = dict(e["row"])

    def get(self, now, id):
        self.catch_up(now)
        return self.rows.get(id)

    def query(self, now, fn):
        self.catch_up(now)
        return fn(list(self.rows.values()))


class Cache:
    def __init__(self):
        self.m = {}

    def get(self, now, k):
        e = self.m.get(k)
        return e["v"] if e and e["exp"] > now else None

    def set(self, now, k, v, ttl):
        self.m[k] = {"v": v, "exp": now + ttl}

    def delete(self, k):
        self.m.pop(k, None)


db = Primary()
cities = ["Pune", "Oslo", "Lima"]
for id in range(1, 13):
    db.write(0, id, {"id": id, "name": "user" + str(id), "city": cities[id % 3], "followers": (id * 37) % 100})
fast, slow = Replica(db, 50), Replica(db, 400)

print("Part 1: what each one can answer (t=1000 ms)")
top = fast.query(1000, lambda rs: [r["name"] + ":" + str(r["followers"]) for r in sorted([r for r in rs if r["city"] == "Oslo"], key=lambda r: -r["followers"])[:3]])
print("  replica, top 3 in Oslo by followers (filter + sort):", " ".join(top))
cache = Cache()
cache.set(1000, "user:4", db.rows[4], 60000)
print("  cache, GET user:4:", cache.get(1000, "user:4")["name"])
print("  cache, top 3 in Oslo:", "miss (nobody cached that exact answer)" if cache.get(1000, "top:Oslo") is None else "hit")

print("\\nPart 2: read-your-writes and monotonic reads")
db.write(2000, 7, {**db.rows[7], "name": "Asha"})
print("  t=2000 user 7 renames to Asha on the primary")
print("  t=2100 read from slow replica (lag 400):", slow.get(2100, 7)["name"], "<- the user sees the old name")
pinned_until = 2000 + 1000  # route this user to the primary for 1 s after their own write


def route(now):
    return db.rows if now < pinned_until else slow.rows


print("  t=2100 same read, pinned to primary after a write:", route(2100)[7]["name"])
print("  session B, t=2060 read from fast replica (lag 50):", fast.get(2060, 7)["name"])
print("  session B, t=2080 next read lands on slow replica:", slow.get(2080, 7)["name"], "<- went back in time")

print("\\nPart 3: cache refilled from a lagging replica after an invalidation")
for strategy in ["fill from replica", "fill from primary", "fill from replica + delete again after lag"]:
    c = Cache()
    p = Primary()
    p.write(0, 9, {"name": "v1"})
    r = Replica(p, 400)
    c.set(0, "user:9", {"name": "v1"}, 3600000)
    p.write(5000, 9, {"name": "v2"})
    c.delete("user:9")  # write, then invalidate
    stale = db_reads = 0
    for now in range(5010, 65010, 100):  # one read every 100 ms for a minute
        if strategy.endswith("after lag") and now == 5510:
            c.delete("user:9")  # second delete at write + lag + 100
        v = c.get(now, "user:9")
        if v is None:
            db_reads += 1
            v = p.rows[9] if strategy == "fill from primary" else r.get(now, 9)
            c.set(now, "user:9", v, 3600000)
        if v["name"] != "v2":
            stale += 1
    print(f"  {strategy:<42} stale reads {stale:>3} of 600, source reads {db_reads}")

print("\\nPart 4: sizing for 20000 reads/s (assumed capacities)")
reads, replica_cap, cache_cap, hit_ratio = 20000, 4000, 100000, 0.95
print(f"  replicas only: {math.ceil(reads / replica_cap)} replicas at {replica_cap} reads/s each")
misses = math.floor(reads * (1 - hit_ratio) + 0.5)
print(f"  cache (95% hits) + primary: {math.ceil(reads / cache_cap)} cache node, {misses} misses/s reach the database")` },
        ],
      },
    ],
  },
  {
    title: `How would you design a distributed cache?`,
    difficulty: "hard",
    seoDescription: `Design a distributed cache like Redis Cluster or Memcached: sizing, hash slots, routing, replication and failover, eviction, hot keys and stampedes.`,
    description: `**Question presented to candidate:**
"Design a distributed in-memory cache that our services can use instead of one Redis box. It should hold about half a terabyte, take around a million operations per second at peak, and keep working when a node dies. Walk me through how keys are placed, how clients find them, and what happens when we add a node or one fails."

**What a strong answer should cover:**
- Requirements and a **capacity estimate** with numbers: data size with overhead, memory headroom per node, number of shards and replicas, operations and bandwidth per node
- **Partitioning**: hash slots (Redis Cluster uses CRC16 of the key mod 16,384) or a consistent-hash ring, and why \`hash mod N\` is wrong (most keys move when N changes)
- **Routing**: a smart client with a slot map and redirects (\`MOVED\`/\`ASK\`), or a proxy tier; **hash tags** to keep related keys together for multi-key operations
- **Replication and failover**: a primary plus replicas per shard, asynchronous replication, failure detection and promotion, and the honest consequence that acknowledged writes can be lost
- **Per-node behaviour**: memory limit, eviction policy (approximated LRU/LFU), TTL expiry
- **Hot keys and stampedes**: a near (in-process) cache or key replication for hot keys, request coalescing or leases for misses, and the database behind the cache surviving a cold start

**Clarifying questions expected:**
- Is it a pure cache (data can be rebuilt from a database) or must it be durable?
- What are the value sizes, the read/write ratio and the latency target (p99)?
- Do callers need multi-key operations or transactions across keys?

**Code / implementation expected:** Optional — the routing logic (key to slot to node) and the resharding arithmetic are worth sketching; the example implements them.`,
    answer: `**Target Audience:** Intermediate — you know what a cache is and what a hash function does; distributed-systems vocabulary is defined as it appears.
**Difficulty:** Hard
**Verified with:** Node 22.22, Python 3.12, Go 1.24 and Java 21 (all four print identical output).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Slot numbers, key movements and node loads come from running the example; the **Verified** section quotes the full output.

## 1. Why This Even Matters — A Story First

A post office starts with one sorting room. Mail grows until one room cannot hold it, so they open four rooms. Now every clerk needs a rule for *which room* holds a given address, and the rule must not change much when a fifth room opens, or every letter has to be carried to a new room. If a room floods, a backup room should already have copies. And if one celebrity gets a million letters a day, the room that holds their address will drown while the others are idle.

That is the whole design of a distributed cache: **placement** (which node holds a key), **routing** (how a client finds it), **rebalancing** (adding nodes without moving everything), **replication** (surviving a dead node), and **hot keys** (one key outgrowing one node).

📌 **Interview term: distributed cache** — an in-memory key-value store spread across many nodes, so its total memory and throughput grow with the number of nodes. Redis Cluster, Memcached pools and managed services such as ElastiCache are examples. For the general benefits of caching see [how caching improves system performance](/interview-question/how-does-caching-improve-system-performance).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can every value be rebuilt from a database? | If yes, losing a node costs misses, not data, and replication is about availability, not durability. If no, you are designing a [distributed key-value store](/interview-question/how-would-you-design-a-distributed-key-value-store). |
| Value size distribution? | 1 KB values and 5 MB values need different memory planning and network budgets; large values block single-threaded nodes. |
| Peak operations per second, and read/write ratio? | Sets the shard count by throughput, which may exceed the count by memory. |
| Latency target (p99)? | Decides smart client vs proxy (a proxy adds a hop) and whether a near cache is needed. |
| Multi-key operations or transactions? | Forces related keys onto one shard (hash tags) or rules them out. |
| One region or several? | Cross-region caches are usually separate per region, invalidated by events, not one global cluster. |

## 3. Requirements

**Functional:** \`GET\`, \`SET\` with optional TTL, \`DELETE\`, atomic increment, and batch get; values up to 1 MB; per-key expiry.

**Non-functional:** p99 under 2 ms inside one region; about 1 million operations per second at peak; about 500 million keys; survive the loss of any single node with no manual action; add capacity without downtime; data loss on failure is acceptable (it is a cache) but should be rare.

## 4. Capacity Estimate

Assumptions (state them; they are inputs, not facts): 500 million keys, average value 1,000 bytes, key 50 bytes, about 100 bytes of per-entry overhead in the store; 1.1 million operations per second at peak (1M reads, 100K writes); nodes with 64 GB RAM of which we fill 50 GB, leaving room for fragmentation, buffers and a fork for snapshots; one replica per primary.

| Quantity | Arithmetic | Result |
| :--- | :--- | ---: |
| Data in memory | 500M x (1,000 + 50 + 100) bytes | 575 GB |
| Primaries by memory | 575 GB / 50 GB, rounded up | 12 |
| Nodes with one replica each | 12 x 2 | 24 |
| Data per primary | 575 GB / 12 | about 48 GB |
| Operations per primary | 1.1M / 12 | about 92K per second |
| Read bandwidth, whole cluster | 1M x 1,000 bytes | 1 GB/s (8 Gbit/s) |
| Read bandwidth per primary | 8 Gbit/s / 12 | about 670 Mbit/s |

Check the throughput row against a benchmark of your node type before trusting it; if 92K operations per second is too close to one node's limit, add shards (more primaries with less data each) or serve some reads from replicas. Memory usually decides the shard count; for small values and very high traffic, throughput does.

## 5. API

~~~text
GET key                      -> value | nil
SET key value [EX seconds]   -> OK
DEL key                      -> 0 | 1
INCRBY key n                 -> new value
MGET key1 key2 ...           -> values (all keys on one shard, or split by the client)
~~~

The client library hides the cluster: it maps each key to a node, batches by node, retries on redirects and handles timeouts.

## 6. High-Level Architecture

<svg class="iq-diagram" width="100%" viewBox="0 0 760 360" role="img" aria-label="App servers with a smart client and slot map talk directly to shard primaries, each with a replica">
  <defs>
    <marker id="sd04q3-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="130" width="190" height="90" rx="10"/>
  <text class="d-text" x="125" y="160" text-anchor="middle">App server</text>
  <text class="d-sub" x="125" y="183" text-anchor="middle">smart client</text>
  <text class="d-sub" x="125" y="203" text-anchor="middle">slot map cached</text>
  <rect class="d-box-accent" x="340" y="30" width="170" height="70" rx="10"/>
  <text class="d-text" x="425" y="60" text-anchor="middle">Shard 1 primary</text>
  <text class="d-sub" x="425" y="82" text-anchor="middle">slots 0 to 5460</text>
  <rect class="d-box-accent" x="340" y="140" width="170" height="70" rx="10"/>
  <text class="d-text" x="425" y="170" text-anchor="middle">Shard 2 primary</text>
  <text class="d-sub" x="425" y="192" text-anchor="middle">slots 5461 to 10922</text>
  <rect class="d-box-accent" x="340" y="250" width="170" height="70" rx="10"/>
  <text class="d-text" x="425" y="280" text-anchor="middle">Shard 3 primary</text>
  <text class="d-sub" x="425" y="302" text-anchor="middle">slots 10923 to 16383</text>
  <rect class="d-box-muted" x="590" y="40" width="140" height="50" rx="10"/>
  <text class="d-sub" x="660" y="70" text-anchor="middle">replica</text>
  <rect class="d-box-muted" x="590" y="150" width="140" height="50" rx="10"/>
  <text class="d-sub" x="660" y="180" text-anchor="middle">replica</text>
  <rect class="d-box-muted" x="590" y="260" width="140" height="50" rx="10"/>
  <text class="d-sub" x="660" y="290" text-anchor="middle">replica</text>
  <line class="d-edge" x1="220" y1="150" x2="338" y2="70" marker-end="url(#sd04q3-arrow)"/>
  <line class="d-edge" x1="220" y1="175" x2="338" y2="175" marker-end="url(#sd04q3-arrow)"/>
  <line class="d-edge" x1="220" y1="200" x2="338" y2="282" marker-end="url(#sd04q3-arrow)"/>
  <line class="d-edge-dashed" x1="510" y1="65" x2="588" y2="65" marker-end="url(#sd04q3-arrow)"/>
  <line class="d-edge-dashed" x1="510" y1="175" x2="588" y2="175" marker-end="url(#sd04q3-arrow)"/>
  <line class="d-edge-dashed" x1="510" y1="285" x2="588" y2="285" marker-end="url(#sd04q3-arrow)"/>
</svg>

The client computes the slot locally and talks straight to the owning primary; dashed lines are asynchronous replication to each shard replica.

Components:

1. **Cache nodes**, each a single process holding the keys of the slots it owns, with a memory limit and an eviction policy.
2. **Shards**: one primary and one or more replicas per slot range.
3. **Cluster metadata**: which node owns which slot, kept by the nodes themselves (Redis Cluster gossips it) or by a coordinator such as ZooKeeper or etcd.
4. **Smart client** in every app server, holding a copy of the slot map. The alternative is a **proxy tier** (Twemproxy, Envoy or a managed endpoint) that hides the topology at the cost of one extra network hop.

📌 **Interview term: smart client vs proxy** — a smart client routes each request directly to the right node (lowest latency, but every language needs a cluster-aware library); a proxy routes on the client's behalf (simple clients, one more hop and another tier to scale).

## 7. Deep Dive 1: Partitioning and Routing

### 7.1 Why not \`hash(key) mod N\`

With N nodes, \`hash mod N\` spreads keys evenly, but adding one node changes almost every key's answer. The example placed 30,000 keys: going from 3 to 4 nodes with \`mod N\` moved **22,557 keys (75%)**, so three quarters of the cache would miss at once, sending that load to the database.

### 7.2 Hash slots

Redis Cluster puts a fixed layer between keys and nodes: each key maps to one of **16,384 slots** by \`CRC16(key) mod 16384\`, and each node owns some slots (Redis Cluster specification). Adding a node means moving *some slots*, not rehashing keys. The example moved 4,096 slots (a quarter) to the new node D, and exactly the keys in those slots moved: **7,486 keys (25%)**, the minimum needed for D to take its fair share. A consistent-hash ring with virtual nodes achieves the same property differently; see [consistent hashing](/interview-question/what-is-consistent-hashing) and [virtual nodes](/interview-question/what-is-consistent-hashing-with-virtual-nodes-and-when-do-you-need-it).

📌 **Interview term: hash slot** — a fixed bucket number between the key and the node. The slot of a key never changes; only the slot-to-node table does, which makes resharding a matter of moving buckets.

📌 **Interview term: CRC16 (XMODEM)** — the 16-bit checksum Redis Cluster uses for slots. The specification gives the test vector \`CRC16("123456789") = 0x31C3\`, which the example reproduces in all four languages.

### 7.3 Redirects during and after moves

The client caches the slot map. If it sends a key to the wrong node, Redis Cluster answers \`MOVED slot host:port\`: the slot has a new permanent owner, so the client updates its map and retries. While a slot is being migrated, a node may answer \`ASK\`: retry this one request on the target, but do not update the map yet.

📌 **Interview term: MOVED vs ASK redirect** — \`MOVED\` means the slot moved for good (update the slot map); \`ASK\` means it is moving right now (redirect only this request).

### 7.4 Hash tags for multi-key operations

Operations across keys (\`MGET\`, transactions, Lua scripts) are only allowed when every key is in the same slot. Redis lets you choose the hashed part with braces: only the text inside the first \`{...}\` is hashed. In the run, \`{user:42}:profile\` and \`{user:42}:cart\` both landed in slot 15880, while \`user:42:profile\` without braces landed in 9133.

📌 **Interview term: hash tag** — the \`{...}\` part of a key that alone decides its slot, used to co-locate related keys. Overuse creates one huge slot on one node.

## 8. Deep Dive 2: Replication, Failure Detection and Failover

- Each primary streams its writes to its replicas **asynchronously**: the primary acknowledges the client first and replicates after. The Redis Cluster specification states plainly that there is a window in which acknowledged writes can be lost, for example when a primary dies before its replica received the write.
- Nodes ping each other; when a majority of primaries agree a primary has been unreachable longer than a timeout (\`cluster-node-timeout\` in Redis), one of its replicas is promoted and takes over its slots. How the timeout trades false alarms against detection time is covered in [detecting node failures](/interview-question/how-do-distributed-systems-detect-node-failures).
- During failover, that shard is unavailable for writes for the detection time plus the election. For a pure cache this is acceptable: clients treat errors as misses and read from the database, which must survive that extra load.
- Memcached takes the opposite approach: its documentation says servers are unaware of each other, with no replication; the client decides which server holds a key, and a dead server's keys are simply gone until refilled. This is simpler and is fine when the database can absorb the misses.

📌 **Interview term: failover** — promoting a replica to primary when the primary is judged dead, then updating the slot map so clients follow.

📌 **Interview term: split brain** — two nodes both believing they are primary for the same slots after a network partition. Requiring a majority of primaries to agree before promotion prevents two promotions; an isolated old primary stops accepting writes after the timeout.

## 9. Deep Dive 3: Hot Keys and Stampedes

### 9.1 Hot keys

Slots spread *keys* evenly, not *traffic*. If 30% of all reads ask for one product, the node that owns it takes that 30% on top of its share. In the run, node C took **47,519** of 100,000 reads while the others took about 17,500 each, 2.7 times its share. Fixes:

- A **near cache** (in-process memory in each app server) for the hottest keys with a short TTL. With 50 app servers caching the key for 1 second, C dropped to **18,019** reads: at most one fetch per server per second.
- **Key replication**: store copies as \`product:42#1\` to \`product:42#8\` on different slots and read a random copy; writes must update all copies.
- Detect hot keys by sampling requests in the client or with the server's own tools, and alert on per-node load imbalance.

📌 **Interview term: near cache (L1 cache)** — a small cache inside the application process in front of the shared cache; it removes network hops for the hottest keys at the price of a short, bounded staleness.

### 9.2 Stampedes

When a hot key expires or a node restarts empty, many requests miss together and all query the database. Use **request coalescing** (one request per key goes to the database, the rest wait for its result), TTL jitter, and refresh-ahead for hot keys. *Scaling Memcache at Facebook* (NSDI 2013) describes **leases**: the first client to miss gets a token to fill the key, the others wait briefly, and the paper reports peak database query rate falling from 17K/s to 1.3K/s.

📌 **Interview term: cache stampede (thundering herd)** — a burst of identical misses hitting the backing store at once.

## 10. Per-Node Behaviour: Memory and Eviction

Each node has a hard memory limit. Redis defaults to \`maxmemory-policy noeviction\`, which rejects writes when memory is full, so a cache must set a policy such as \`allkeys-lru\` or \`allkeys-lfu\`. Redis approximates LRU by sampling a few keys (\`maxmemory-samples\`, default 5) rather than keeping an exact list, trading a little accuracy for memory. Watch the eviction rate: a rising rate with a falling hit ratio means the working set no longer fits and you need more shards.

📌 **Interview term: eviction policy** — the rule for which key to drop when memory is full: LRU (least recently used), LFU (least frequently used), random, or only keys with a TTL.

## 11. Verified: Running the Code

The example **"Redis Cluster style routing: CRC16 hash slots, hash tags, resharding vs hash mod N, a hot key"** implements the routing layer only, in one process: CRC16 (XMODEM), the hash-tag rule, a slot table of 16,384 entries for three nodes, moving 4,096 slots to a fourth node, and per-node load for a skewed workload. Nodes are table entries, not servers; there is no network, replication or eviction in it.

The key part, key to slot:

~~~js
function hashPart(key) { // only the text inside the first {...} is hashed, if non-empty
  const open = key.indexOf("{");
  if (open >= 0) {
    const close = key.indexOf("}", open + 1);
    if (close > open + 1) return key.substring(open + 1, close);
  }
  return key;
}
const slotOf = (key) => crc16(hashPart(key)) % 16384;
~~~

Full output (identical in Node, Python, Go and Java):

~~~text
Part 1: key -> slot
  crc16(123456789) = 0x31C3
  user:1000          slot  1649
  {user:42}:profile  slot 15880
  {user:42}:cart     slot 15880
  user:42:profile    slot  9133

Part 2: 30000 keys on 3 nodes: A=9996 B=10012 C=9992
  add node D, 4096 slots move: A=7501 B=7517 C=7496 D=7486
  keys that changed node with slots:    7486 (25%)
  keys that changed node with hash % N: 22557 (75%)

Part 3: a hot key, 100000 reads in 10 s from 50 app servers
  without a local cache: A=17493 B=17447 C=47519 D=17541 (hot key on C)
  with a 1 s local cache: A=17493 B=17447 C=18019 D=17541
~~~

## 12. What Breaks First at 10x

| Growth | What breaks | Response |
| :--- | :--- | :--- |
| 10x keys | Memory: 5.75 TB needs about 120 primaries at 50 GB | More shards; check that values are compressed and TTLs are set |
| 10x traffic on the same data | Per-node CPU and network, at about 920K operations per second per primary | Split slots across more primaries with less data each; read from replicas where staleness is fine |
| One viral key | One node, regardless of cluster size | Near cache and key replication |
| Many clients | Connections per node, and slot-map refresh storms after a failover | Connection pooling, a proxy tier, jittered refreshes |
| Multiple regions | Cross-region latency for every miss | A cluster per region, invalidated by events from the source of truth |

## 13. Edge Cases Worth Knowing

- **Large values.** A 10 MB value blocks a single-threaded node while it is sent; cap value size or split large objects.
- **Cross-slot operations fail.** \`MGET a b\` across slots is an error in Redis Cluster; clients must split batches by node or use hash tags.
- **Resharding under load.** Keys are migrated one by one; during migration a slot is split between two nodes and clients see \`ASK\` redirects and slightly higher latency.
- **Cache as a database by accident.** If teams start storing data that exists nowhere else, losing acknowledged writes on failover becomes a data-loss incident. Decide and document which it is.

## Common Pitfalls

- **Using \`hash mod N\`.** Adding one node moved 75% of keys in the run; use slots or consistent hashing.
- **Sizing by memory only.** A small cluster can fit the data but not the operations per second or the network bandwidth.
- **Filling nodes to 100% of RAM.** Leave headroom for fragmentation, replication buffers and snapshot forks.
- **Ignoring hot keys.** Even placement of keys does not mean even load; one key made a node take 2.7 times its share.
- **Assuming replication makes it durable.** Asynchronous replication loses acknowledged writes on failover.
- **No plan for the cold start.** After a full restart the database must take every read; warm the cache gradually or rate-limit.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify and size:</strong> <span style="color:#f0e2c8;">Confirm it is a <strong style="color:#ffca28;">cache</strong> (rebuildable data), then size it: 500M keys at about 1.15 KB is 575 GB, so 12 primaries at 50 GB each plus replicas, about 92K operations per second per primary at peak.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Placement:</strong> <span style="color:#f0e2c8;">Map keys to <strong style="color:#ffca28;">16,384 hash slots</strong> with CRC16 and assign slots to shards. Adding a node moves only some slots: 25% of keys in my run, versus 75% with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hash mod N</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Routing:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">smart client</strong> caches the slot map and talks to the owner directly, following <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MOVED</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ASK</code> redirects; a proxy is the simpler but slower alternative. <strong style="color:#ffca28;">Hash tags</strong> keep related keys on one slot.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Failure:</strong> <span style="color:#f0e2c8;">Each shard has a primary and an <strong style="color:#ffca28;">asynchronous</strong> replica; a majority of nodes detects a dead primary and promotes the replica. Acknowledged writes can be lost, which is acceptable for a cache, and clients treat errors as misses.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Hot spots:</strong> <span style="color:#f0e2c8;">Even keys do not mean even traffic. Use a <strong style="color:#ffca28;">near cache</strong> or key replication for hot keys, <strong style="color:#ffca28;">request coalescing</strong> or leases for stampedes, set an <strong style="color:#ffca28;">eviction policy</strong>, and make sure the database survives a cold cache.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why 16,384 slots and not a hash ring?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both decouple keys from nodes. A fixed slot count makes the ownership table small and explicit, so moving slots and gossiping the map is simple; a ring with virtual nodes does the same job without a fixed bucket count. The key property in both is that adding a node moves only its fair share.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do clients learn about a topology change?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They cache the slot map and refresh it when a node answers <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MOVED</code>, or periodically. During a migration, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ASK</code> redirects single requests without changing the map. A proxy tier hides this from simple clients.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make the cache strongly consistent with the database?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You cannot fully, cheaply. Delete or update keys on write, drive invalidation from the database change log, use versions to reject stale fills, and keep TTLs as a safety net. If a value must never be stale, read it from the database.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">One key gets 30% of traffic. What do you do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Detect it from per-node load or client sampling, then serve it from an in-process near cache with a short TTL (in my run that took the node from 47,519 reads to 18,019), or replicate it under several keys on different shards.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens when a node runs out of memory?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With an LRU or LFU policy it evicts keys and the hit ratio drops; with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">noeviction</code> writes fail. Alert on eviction rate and memory, and add shards before the working set stops fitting.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Distributed cache | An in-memory key-value store spread across nodes |
| Smart client vs proxy | Client routes directly with a slot map vs a tier routes for it |
| Hash slot | A fixed bucket between key and node (16,384 in Redis Cluster) |
| CRC16 (XMODEM) | The checksum Redis Cluster uses to pick a slot |
| MOVED vs ASK | Permanent vs in-progress slot redirect |
| Hash tag | The \`{...}\` part of a key that alone decides its slot |
| Failover | Promoting a replica when a primary dies |
| Split brain | Two primaries for the same data after a partition |
| Near cache (L1) | A small in-process cache in front of the shared cache |
| Cache stampede | Many simultaneous misses hitting the database |
| Eviction policy | Which key to drop when memory is full |

**Conclusion:** A distributed cache is a set of in-memory shards plus a placement rule, a routing method, replication and a plan for uneven load. Size it from the data with overhead and headroom (575 GB became 12 primaries and 24 nodes), place keys with hash slots so that adding a node moves only its share (25% of keys in the run instead of 75%), route with a smart client that follows redirects, and replicate each shard asynchronously, accepting that a cache can lose recent writes. Then deal with the real-world problems that sink these systems: hot keys that overload one node, stampedes after expiry, eviction once the working set outgrows memory, and the database that must still stand when the cache is cold.`,
    examples: [
      {
        label: `Redis Cluster style routing: CRC16 hash slots, hash tags, resharding vs hash mod N, a hot key`,
        variants: [
          { tech: "node", code: `// A distributed cache routing layer in the style of Redis Cluster:
// CRC16 -> 16384 hash slots -> nodes, hash tags, resharding, and a hot key.

function crc16(s) { // CRC-16/XMODEM (poly 0x1021, init 0), the variant Redis Cluster uses
  let crc = 0;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc;
}
function hashPart(key) { // only the text inside the first {...} is hashed, if non-empty
  const open = key.indexOf("{");
  if (open >= 0) {
    const close = key.indexOf("}", open + 1);
    if (close > open + 1) return key.substring(open + 1, close);
  }
  return key;
}
const slotOf = (key) => crc16(hashPart(key)) % 16384;

console.log("Part 1: key -> slot");
console.log("  crc16(123456789) = 0x" + crc16("123456789").toString(16).toUpperCase());
for (const k of ["user:1000", "{user:42}:profile", "{user:42}:cart", "user:42:profile"]) {
  console.log(\`  \${k.padEnd(18)} slot \${String(slotOf(k)).padStart(5)}\`);
}

// Slot table: owner[slot] = node index. Three nodes start with even ranges.
const names = ["A", "B", "C", "D"];
const owner = new Array(16384);
for (let s = 0; s < 16384; s++) owner[s] = s <= 5460 ? 0 : s <= 10922 ? 1 : 2;
const KEYS = 30000;
const keys = [];
for (let i = 0; i < KEYS; i++) keys.push("key:" + i);
function countPerNode(n) {
  const c = new Array(n).fill(0);
  for (const k of keys) c[owner[slotOf(k)]]++;
  return c.map((x, i) => names[i] + "=" + x).join(" ");
}
console.log("\\nPart 2: 30000 keys on 3 nodes:", countPerNode(3));

const before = keys.map((k) => owner[slotOf(k)]);
// Add node D: move the top 1365 slots of A, 1365 of B and 1366 of C (4096 slots in total).
let moved = 0;
for (const [lo, hi] of [[5460 - 1364, 5460], [10922 - 1364, 10922], [16383 - 1365, 16383]]) {
  for (let s = lo; s <= hi; s++) { owner[s] = 3; moved++; }
}
let keysMoved = 0;
keys.forEach((k, i) => { if (owner[slotOf(k)] !== before[i]) keysMoved++; });
let modMoved = 0;
for (const k of keys) if (crc16(k) % 3 !== crc16(k) % 4) modMoved++;
console.log(\`  add node D, \${moved} slots move:\`, countPerNode(4));
console.log(\`  keys that changed node with slots:    \${keysMoved} (\${Math.round((keysMoved * 100) / KEYS)}%)\`);
console.log(\`  keys that changed node with hash % N: \${modMoved} (\${Math.round((modMoved * 100) / KEYS)}%)\`);

console.log("\\nPart 3: a hot key, 100000 reads in 10 s from 50 app servers");
const load = [0, 0, 0, 0];
const hot = "product:42";
let hotReads = 0;
for (let i = 0; i < 100000; i++) {
  const k = i % 10 < 3 ? hot : keys[(i * 7919) % KEYS]; // 30% of reads hit one key
  if (k === hot) hotReads++;
  load[owner[slotOf(k)]]++;
}
const hotNode = owner[slotOf(hot)];
console.log("  without a local cache:", load.map((x, i) => names[i] + "=" + x).join(" "), "(hot key on " + names[hotNode] + ")");
// Each app server keeps the hot key in process memory for 1 s: at most 1 fetch per server per second.
const l1Fetches = 50 * 10;
load[hotNode] = load[hotNode] - hotReads + l1Fetches;
console.log("  with a 1 s local cache:", load.map((x, i) => names[i] + "=" + x).join(" "));` },
          { tech: "python", code: `# A distributed cache routing layer in the style of Redis Cluster:
# CRC16 -> 16384 hash slots -> nodes, hash tags, resharding, and a hot key.
import math


def crc16(s):  # CRC-16/XMODEM (poly 0x1021, init 0), the variant Redis Cluster uses
    crc = 0
    for ch in s:
        crc ^= ord(ch) << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) & 0xFFFF if crc & 0x8000 else (crc << 1) & 0xFFFF
    return crc


def hash_part(key):  # only the text inside the first {...} is hashed, if non-empty
    o = key.find("{")
    if o >= 0:
        c = key.find("}", o + 1)
        if c > o + 1:
            return key[o + 1:c]
    return key


def slot_of(key):
    return crc16(hash_part(key)) % 16384


def pct(x, n):
    return math.floor(x * 100 / n + 0.5)


print("Part 1: key -> slot")
print("  crc16(123456789) = 0x" + format(crc16("123456789"), "X"))
for k in ["user:1000", "{user:42}:profile", "{user:42}:cart", "user:42:profile"]:
    print(f"  {k:<18} slot {slot_of(k):>5}")

names = ["A", "B", "C", "D"]
owner = [0 if s <= 5460 else 1 if s <= 10922 else 2 for s in range(16384)]
KEYS = 30000
keys = ["key:" + str(i) for i in range(KEYS)]
slots = [slot_of(k) for k in keys]


def count_per_node(n):
    c = [0] * n
    for s in slots:
        c[owner[s]] += 1
    return " ".join(names[i] + "=" + str(x) for i, x in enumerate(c))


print("\\nPart 2: 30000 keys on 3 nodes:", count_per_node(3))
before = [owner[s] for s in slots]
moved = 0
for lo, hi in [(5460 - 1364, 5460), (10922 - 1364, 10922), (16383 - 1365, 16383)]:
    for s in range(lo, hi + 1):
        owner[s] = 3
        moved += 1
keys_moved = sum(1 for i, s in enumerate(slots) if owner[s] != before[i])
mod_moved = sum(1 for k in keys if crc16(k) % 3 != crc16(k) % 4)
print(f"  add node D, {moved} slots move:", count_per_node(4))
print(f"  keys that changed node with slots:    {keys_moved} ({pct(keys_moved, KEYS)}%)")
print(f"  keys that changed node with hash % N: {mod_moved} ({pct(mod_moved, KEYS)}%)")

print("\\nPart 3: a hot key, 100000 reads in 10 s from 50 app servers")
load = [0, 0, 0, 0]
hot = "product:42"
hot_reads = 0
for i in range(100000):
    k = hot if i % 10 < 3 else keys[(i * 7919) % KEYS]  # 30% of reads hit one key
    if k == hot:
        hot_reads += 1
    load[owner[slot_of(k)]] += 1
hot_node = owner[slot_of(hot)]
print("  without a local cache:", " ".join(names[i] + "=" + str(x) for i, x in enumerate(load)), "(hot key on " + names[hot_node] + ")")
# Each app server keeps the hot key in process memory for 1 s: at most 1 fetch per server per second.
l1_fetches = 50 * 10
load[hot_node] = load[hot_node] - hot_reads + l1_fetches
print("  with a 1 s local cache:", " ".join(names[i] + "=" + str(x) for i, x in enumerate(load)))` },
          { tech: "go", code: `// A distributed cache routing layer in the style of Redis Cluster:
// CRC16 -> 16384 hash slots -> nodes, hash tags, resharding, and a hot key.
package main

import (
	"fmt"
	"strings"
)

func crc16(s string) int { // CRC-16/XMODEM (poly 0x1021, init 0), the variant Redis Cluster uses
	crc := 0
	for i := 0; i < len(s); i++ {
		crc ^= int(s[i]) << 8
		for b := 0; b < 8; b++ {
			if crc&0x8000 != 0 {
				crc = ((crc << 1) ^ 0x1021) & 0xffff
			} else {
				crc = (crc << 1) & 0xffff
			}
		}
	}
	return crc
}

func hashPart(key string) string { // only the text inside the first {...} is hashed, if non-empty
	o := strings.Index(key, "{")
	if o >= 0 {
		c := strings.Index(key[o+1:], "}")
		if c > 0 {
			return key[o+1 : o+1+c]
		}
	}
	return key
}

func slotOf(key string) int { return crc16(hashPart(key)) % 16384 }

var names = []string{"A", "B", "C", "D"}

func show(c []int) string {
	parts := make([]string, len(c))
	for i, x := range c {
		parts[i] = fmt.Sprintf("%s=%d", names[i], x)
	}
	return strings.Join(parts, " ")
}

func main() {
	fmt.Println("Part 1: key -> slot")
	fmt.Printf("  crc16(123456789) = 0x%X\\n", crc16("123456789"))
	for _, k := range []string{"user:1000", "{user:42}:profile", "{user:42}:cart", "user:42:profile"} {
		fmt.Printf("  %-18s slot %5d\\n", k, slotOf(k))
	}

	owner := make([]int, 16384)
	for s := range owner {
		switch {
		case s <= 5460:
			owner[s] = 0
		case s <= 10922:
			owner[s] = 1
		default:
			owner[s] = 2
		}
	}
	const KEYS = 30000
	keys := make([]string, KEYS)
	slots := make([]int, KEYS)
	for i := range keys {
		keys[i] = fmt.Sprintf("key:%d", i)
		slots[i] = slotOf(keys[i])
	}
	count := func(n int) string {
		c := make([]int, n)
		for _, s := range slots {
			c[owner[s]]++
		}
		return show(c)
	}
	fmt.Println("\\nPart 2: 30000 keys on 3 nodes:", count(3))
	before := make([]int, KEYS)
	for i, s := range slots {
		before[i] = owner[s]
	}
	moved := 0
	for _, r := range [][2]int{{5460 - 1364, 5460}, {10922 - 1364, 10922}, {16383 - 1365, 16383}} {
		for s := r[0]; s <= r[1]; s++ {
			owner[s] = 3
			moved++
		}
	}
	keysMoved, modMoved := 0, 0
	for i, s := range slots {
		if owner[s] != before[i] {
			keysMoved++
		}
		if crc16(keys[i])%3 != crc16(keys[i])%4 {
			modMoved++
		}
	}
	fmt.Printf("  add node D, %d slots move: %s\\n", moved, count(4))
	fmt.Printf("  keys that changed node with slots:    %d (%d%%)\\n", keysMoved, (keysMoved*100+KEYS/2)/KEYS)
	fmt.Printf("  keys that changed node with hash %% N: %d (%d%%)\\n", modMoved, (modMoved*100+KEYS/2)/KEYS)

	fmt.Println("\\nPart 3: a hot key, 100000 reads in 10 s from 50 app servers")
	load := []int{0, 0, 0, 0}
	hot := "product:42"
	hotReads := 0
	for i := 0; i < 100000; i++ {
		k := keys[(i*7919)%KEYS]
		if i%10 < 3 { // 30% of reads hit one key
			k = hot
			hotReads++
		}
		load[owner[slotOf(k)]]++
	}
	hotNode := owner[slotOf(hot)]
	fmt.Println("  without a local cache:", show(load), "(hot key on "+names[hotNode]+")")
	// Each app server keeps the hot key in process memory for 1 s: at most 1 fetch per server per second.
	l1Fetches := 50 * 10
	load[hotNode] = load[hotNode] - hotReads + l1Fetches
	fmt.Println("  with a 1 s local cache:", show(load))
}` },
          { tech: "java", code: `// A distributed cache routing layer in the style of Redis Cluster:
// CRC16 -> 16384 hash slots -> nodes, hash tags, resharding, and a hot key.
import java.util.*;

public class Main {
    static int crc16(String s) { // CRC-16/XMODEM (poly 0x1021, init 0), the variant Redis Cluster uses
        int crc = 0;
        for (int i = 0; i < s.length(); i++) {
            crc ^= s.charAt(i) << 8;
            for (int b = 0; b < 8; b++) crc = (crc & 0x8000) != 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
        }
        return crc;
    }

    static String hashPart(String key) { // only the text inside the first {...} is hashed, if non-empty
        int o = key.indexOf('{');
        if (o >= 0) {
            int c = key.indexOf('}', o + 1);
            if (c > o + 1) return key.substring(o + 1, c);
        }
        return key;
    }

    static int slotOf(String key) { return crc16(hashPart(key)) % 16384; }

    static final String[] NAMES = {"A", "B", "C", "D"};
    static int[] owner = new int[16384];

    static String show(int[] c) {
        StringJoiner j = new StringJoiner(" ");
        for (int i = 0; i < c.length; i++) j.add(NAMES[i] + "=" + c[i]);
        return j.toString();
    }

    public static void main(String[] args) {
        System.out.println("Part 1: key -> slot");
        System.out.println("  crc16(123456789) = 0x" + Integer.toHexString(crc16("123456789")).toUpperCase());
        for (String k : new String[]{"user:1000", "{user:42}:profile", "{user:42}:cart", "user:42:profile"})
            System.out.printf(java.util.Locale.ROOT, "  %-18s slot %5d%n", k, slotOf(k));

        for (int s = 0; s < 16384; s++) owner[s] = s <= 5460 ? 0 : s <= 10922 ? 1 : 2;
        final int KEYS = 30000;
        String[] keys = new String[KEYS];
        int[] slots = new int[KEYS];
        for (int i = 0; i < KEYS; i++) { keys[i] = "key:" + i; slots[i] = slotOf(keys[i]); }
        int[] c3 = new int[3];
        for (int s : slots) c3[owner[s]]++;
        System.out.println("\\nPart 2: 30000 keys on 3 nodes: " + show(c3));
        int[] before = new int[KEYS];
        for (int i = 0; i < KEYS; i++) before[i] = owner[slots[i]];
        int moved = 0;
        for (int[] r : new int[][]{{5460 - 1364, 5460}, {10922 - 1364, 10922}, {16383 - 1365, 16383}})
            for (int s = r[0]; s <= r[1]; s++) { owner[s] = 3; moved++; }
        int keysMoved = 0, modMoved = 0;
        for (int i = 0; i < KEYS; i++) {
            if (owner[slots[i]] != before[i]) keysMoved++;
            if (crc16(keys[i]) % 3 != crc16(keys[i]) % 4) modMoved++;
        }
        int[] c4 = new int[4];
        for (int s : slots) c4[owner[s]]++;
        System.out.println("  add node D, " + moved + " slots move: " + show(c4));
        System.out.printf(java.util.Locale.ROOT, "  keys that changed node with slots:    %d (%d%%)%n", keysMoved, (keysMoved * 100 + KEYS / 2) / KEYS);
        System.out.printf(java.util.Locale.ROOT, "  keys that changed node with hash %% N: %d (%d%%)%n", modMoved, (modMoved * 100 + KEYS / 2) / KEYS);

        System.out.println("\\nPart 3: a hot key, 100000 reads in 10 s from 50 app servers");
        int[] load = new int[4];
        String hot = "product:42";
        int hotReads = 0;
        for (int i = 0; i < 100000; i++) {
            String k = i % 10 < 3 ? hot : keys[(i * 7919) % KEYS]; // 30% of reads hit one key
            if (k.equals(hot)) hotReads++;
            load[owner[slotOf(k)]]++;
        }
        int hotNode = owner[slotOf(hot)];
        System.out.println("  without a local cache: " + show(load) + " (hot key on " + NAMES[hotNode] + ")");
        // Each app server keeps the hot key in process memory for 1 s: at most 1 fetch per server per second.
        int l1Fetches = 50 * 10;
        load[hotNode] = load[hotNode] - hotReads + l1Fetches;
        System.out.println("  with a 1 s local cache: " + show(load));
    }
}` },
        ],
      },
    ],
  },
  {
    title: `Edge caching on Cloudflare — how do you get 95%+ hit rate without stale data?`,
    difficulty: "medium",
    seoDescription: `Reach a 95%+ Cloudflare cache hit rate without stale pages: cache HTML with long edge TTLs, purge by Cache-Tag, normalise the cache key, tiered cache, SWR.`,
    description: `**Question presented to candidate:**
"Our news site sits behind Cloudflare, but the dashboard shows a cache hit rate around 30% and the origin is struggling. Editors also complain that when they fix a headline, readers keep seeing the old one. How would you get the hit rate above 95% without serving stale articles?"

**What a strong answer should cover:**
- Why the hit rate is low out of the box: Cloudflare caches by **file extension** and does not cache HTML or JSON by default; \`Set-Cookie\`, \`private\` or \`no-store\` responses are not cached; tracking query strings split one page into thousands of **cache keys**
- The core move: cache HTML with a **long edge TTL** and make freshness **event-driven** by **purging by tag** (\`Cache-Tag\` header) when content changes, instead of relying on short TTLs
- **Cache key normalisation**: ignore or strip \`utm_*\`, \`fbclid\`, \`gclid\`; sort query strings; never vary on cookies for public pages
- Separate **edge TTL** from **browser TTL** (\`CDN-Cache-Control\` / \`Cloudflare-CDN-Cache-Control\`, or Cache Rules), so purges reach users
- Origin protection: **Tiered Cache** (an upper-tier PoP between edges and origin), **stale-while-revalidate**, and **Cache Reserve** for the long tail
- Measuring it: \`cf-cache-status\`, hit rate by path, and origin offload rather than a single number

**Clarifying questions expected:**
- Which responses are personalised (logged-in pages, paywall), and which are the same for everyone?
- How quickly must an edit be visible, and does the CMS emit an event on publish?
- Which Cloudflare plan, since some cache-key controls are Enterprise-only?

**Code / implementation expected:** Optional — the response headers, a Cache Rule outline and a purge call on publish; the example simulates a day of traffic under each strategy.`,
    answer: `**Target Audience:** Intermediate — you know what a CDN does; Cloudflare-specific settings and terms are explained here.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output). Cloudflare product behaviour is taken from Cloudflare documentation and changelog entries cited inline, checked in October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Hit rates and stale counts come from running the example; the **Verified** section quotes the full output. How a CDN works in general (PoPs, anycast, shields, collapsing) is on [what is a CDN and how does it work](/interview-question/what-is-a-cdn-and-how-does-it-work); this page is about tuning one for a high hit rate and correct content.

## 1. Why This Even Matters — A Story First

A newspaper stand sells copies of the morning paper. If the vendor phones the printing press for every customer, the queue is long and the press is swamped. If the vendor keeps a big stack but never checks for a corrected edition, people read yesterday's mistakes. The smart vendor keeps a big stack **and** has the press call them the moment a correction is printed, so the old stack goes in the bin and fresh copies come out.

A short TTL is the vendor phoning the press every minute "just in case": lots of calls, and still a minute of wrong papers. A long TTL with no calls is the stale stack. **A long TTL plus a call on every correction** is how you get both a high hit rate and fresh content. That call is a **purge**.

📌 **Interview term: cache hit rate** — the share of requests the edge answered from its cache without contacting the origin. Cloudflare shows the outcome per response in the \`cf-cache-status\` header (\`HIT\`, \`MISS\`, \`EXPIRED\`, \`STALE\`, \`UPDATING\`, \`REVALIDATED\`, \`BYPASS\`, \`DYNAMIC\`).

📌 **Interview term: origin offload** — the share of requests that never reached the origin. With stale-while-revalidate and tiered caching, it can differ from the edge hit rate; it is what your origin servers feel.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which pages are identical for every visitor? | Only those can be cached at the edge as shared HTML; logged-in and paywalled views need a bypass or a different design. |
| Does the CMS fire an event on publish and edit? | Event-driven purge needs a hook; without one you are stuck with TTL guessing. |
| How fast must an edit be visible? | Seconds means purge; minutes may allow a short TTL plus stale-while-revalidate. |
| What does the URL space look like? | A few thousand articles fit any edge; millions of rarely read pages need tiered cache or Cache Reserve. |
| Which plan is the zone on? | Custom query-string include and exclude in the cache key is Enterprise-only; other plans use ignore or a URL rewrite. |

## 3. Why Hit Rates Start Low

- **HTML is not cached by default.** Cloudflare decides cacheability by **file extension** (images, CSS, JS and so on), not MIME type, and HTML and JSON are not on the default list (Cloudflare docs, *Default cache behavior*). For a site whose traffic is mostly page views, the default hit rate on HTML is zero, which the first row of the simulation shows.
- **Origin headers opt out.** The same page says Cloudflare does not cache when the origin sends \`Cache-Control: private\`, \`no-store\`, \`no-cache\` or \`max-age=0\`, or when the response sets a cookie (\`Set-Cookie\`). Frameworks often add a session cookie to every page.
- **Cache-key fragmentation.** By default the query string is part of the cache key, so \`/a/42?utm_source=newsletter\` and \`/a/42?fbclid=...\` are separate objects. In the simulation, 30% of requests carried tracking parameters, and the day produced **49,579 distinct keys** for only **2,001 pages**.
- **Short TTLs.** A 60-second TTL means a popular page is fetched again every minute in every PoP, and rarely read pages expire before their second visitor.

📌 **Interview term: cache key** — the identity of a cached object: by default scheme, host, path and query string. Two requests share a cached response only if their keys match.

## 4. The Strategy: Long TTL, Event-Driven Purge, Clean Keys

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="Request path from browser through an edge PoP with key normalisation and an upper tier to the origin, with the CMS purging by tag">
  <defs>
    <marker id="sd04q4-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="120" height="66" rx="10"/>
  <text class="d-text" x="80" y="90" text-anchor="middle">Browser</text>
  <text class="d-sub" x="80" y="110" text-anchor="middle">short max-age</text>
  <rect class="d-box-accent" x="210" y="50" width="160" height="86" rx="10"/>
  <text class="d-text" x="290" y="80" text-anchor="middle">Edge PoP</text>
  <text class="d-sub" x="290" y="102" text-anchor="middle">clean cache key</text>
  <text class="d-sub" x="290" y="122" text-anchor="middle">long edge TTL</text>
  <rect class="d-box" x="440" y="60" width="140" height="66" rx="10"/>
  <text class="d-text" x="510" y="90" text-anchor="middle">Upper tier</text>
  <text class="d-sub" x="510" y="110" text-anchor="middle">tiered cache</text>
  <rect class="d-box-muted" x="640" y="60" width="100" height="66" rx="10"/>
  <text class="d-text" x="690" y="98" text-anchor="middle">Origin</text>
  <rect class="d-box-muted" x="560" y="210" width="180" height="66" rx="10"/>
  <text class="d-text" x="650" y="238" text-anchor="middle">CMS</text>
  <text class="d-sub" x="650" y="260" text-anchor="middle">on publish or edit</text>
  <line class="d-edge" x1="140" y1="93" x2="208" y2="93" marker-end="url(#sd04q4-arrow)"/>
  <line class="d-edge" x1="370" y1="93" x2="438" y2="93" marker-end="url(#sd04q4-arrow)"/>
  <line class="d-edge" x1="580" y1="93" x2="638" y2="93" marker-end="url(#sd04q4-arrow)"/>
  <line class="d-edge-accent" x1="558" y1="243" x2="290" y2="243"/>
  <line class="d-edge-accent" x1="290" y1="243" x2="290" y2="138" marker-end="url(#sd04q4-arrow)"/>
  <text class="d-sub" x="420" y="226" text-anchor="middle">purge by tag</text>
</svg>

The read path keeps pages for a long time at the edge and the upper tier; the CMS purge removes exactly the pages an edit affects.

### 4.1 Cache HTML with a long edge TTL

Make public pages eligible for cache with a **Cache Rule** (the docs' route to "cache everything" for a set of URLs) and give them a long **edge TTL**, hours to a day. Keep the **browser TTL** short (a minute or \`max-age=0\` with revalidation), because a purge cannot reach a copy already in a reader's browser.

Cloudflare reads targeted headers for its own cache: \`Cloudflare-CDN-Cache-Control\`, then \`CDN-Cache-Control\`, then \`Cache-Control\`. When a CDN-specific header is present, \`Cache-Control\` is passed to the browser untouched and does not drive Cloudflare's decision (Cloudflare docs, *CDN-Cache-Control*). That lets one response say "edge: a day, browser: a minute":

~~~http
Cache-Control: public, max-age=60
CDN-Cache-Control: max-age=86400, stale-while-revalidate=600
Cache-Tag: article-42,section-politics,home
~~~

📌 **Interview term: edge TTL vs browser TTL** — how long Cloudflare may serve its copy vs how long the visitor's browser may. Long at the edge (you can purge it), short in the browser (you cannot).

### 4.2 Purge by tag when content changes

Tag each response with everything it depends on: the article page gets \`article-42\`; the home page and section pages that list it get \`home\` and \`section-politics\`. When an editor saves article 42, the CMS purges the tags \`article-42\` and \`home\`, and every cached variant of those pages, in every PoP, is dropped. Cloudflare made purge by tag, prefix and hostname available on **all plans** in April 2025 (Cloudflare changelog, *Purge for all*, 2025-04-01), and reports global purge latency under 150 ms at P50 for its Instant Purge pipeline (Cloudflare blog, *Instant Purge*). Batch several tags into one purge request rather than one call per tag, as the changelog recommends.

📌 **Interview term: purge by tag (Cache-Tag)** — the origin labels responses with tags in a \`Cache-Tag\` header; a purge call naming a tag removes every cached response carrying it, whatever its URL.

📌 **Interview term: event-driven invalidation** — freshness comes from "this changed" events, not from timers, so content can be cached for a long time and still be correct seconds after an edit.

### 4.3 Normalise the cache key

Tracking parameters do not change the page, so they must not change the key. Cloudflare's cache-key options (Cloudflare docs, *Cache keys*): **ignore query string** and **sort query string** are available on every plan; including or excluding **specific** query parameters is Enterprise-only. On other plans, a URL Rewrite Transform Rule can strip \`utm_*\`, \`fbclid\` and \`gclid\` before the cache lookup. Also make sure public pages do not vary on cookies, device or language unless they really do, and if they do, put that dimension in the key on purpose.

In the simulation, normalising the key took the purge strategy from **81.2% to 99.2%** and origin fetches from **56,548 to 2,395**.

### 4.4 Protect the origin for the long tail

- **Tiered Cache.** Edge PoPs ask an upper-tier PoP before the origin, so one origin fetch can fill many edges. Smart Tiered Cache topology is available on every plan, including Free; Generic Global and custom topologies are Enterprise features, and Regional Tiered Cache is now part of Smart Shield (Cloudflare docs, *Tiered Cache*).
- **stale-while-revalidate.** When an object expires, serve the old copy while one background request refreshes it. Cloudflare's changelog of 2026-02-26 says its handling is now fully asynchronous: the first request after expiry gets the stale copy with status \`UPDATING\` instead of waiting for the origin, live on Free, Pro and Business and rolling out across Enterprise zones.
- **Cache Reserve.** A persistent cache tier built on R2 that keeps objects after edges evict them. Assets need a freshness TTL of at least 10 hours and a \`Content-Length\` header to qualify (Cloudflare docs, *Cache Reserve*). It is paid; check current pricing.

📌 **Interview term: tiered cache** — a two-level cache hierarchy inside the CDN; lower-tier edges miss to an upper tier, which alone talks to the origin.

📌 **Interview term: stale-while-revalidate (SWR)** — a \`Cache-Control\` extension (RFC 5861) allowing a cache to serve an expired response for a set time while it revalidates in the background.

## 5. Verified: Running the Code

The example **"A day at one edge: TTL vs purge by tag vs cache-key normalisation vs stale-while-revalidate"** simulates one PoP in front of a news site for a day: 300,000 requests (10% for the home page, the rest for 2,000 articles with Zipf popularity), 20% of requests with one of 30 \`utm_source\` values and 10% with a unique \`fbclid\`, and an article edit every 432 seconds that also changes the home page. The origin is a version number per page; a response is **stale** if its version is older than the page's current one. The edge never evicts, purge is instant (Cloudflare reports under 150 ms), there is one PoP so tiered caching is not modelled, and an SWR refresh is counted as an origin fetch.

The key part, the lookup with a TTL and a stale window:

~~~js
const key = cfg.stripTracking ? ev.page : ev.url; // the cache key
const c = edge.get(key);
const fresh = c && ev.t < c.storedAt + cfg.ttl;
const swr = c && !fresh && ev.t < c.storedAt + cfg.ttl + (cfg.swr || 0);
~~~

Full output (identical in Node and Python):

~~~text
One day: 300000 requests, 2000 articles + home page, 199 edits
  strategy                              hit    origin   stale  max stale s
  default (HTML not cached)              0.0%   300000       0          0
  cache everything, TTL 60 s            33.2%   200433    1690         58
  TTL 1 day, no purge                   83.5%    49579  121588      83764
  TTL 1 day + purge by tag              81.2%    56548       0          0
    + strip utm and fbclid from key     99.2%     2395       0          0
  TTL 300 s + swr 600 s, clean key      84.7%    96283   12651        695

Distinct cache keys: 49579 with raw URLs, 2001 after stripping tracking parameters
~~~

What the rows show:

| Strategy | Hit rate | Stale responses | Lesson |
| :--- | ---: | ---: | :--- |
| Default (HTML not cached) | 0.0% | 0 | The out-of-the-box setting does nothing for page views |
| TTL 60 s | 33.2% | 1,690 | Short TTLs lose most hits and are still stale for up to 58 s |
| TTL 1 day, no purge | 83.5% | 121,588 | High hits, wrong for up to 83,764 s (23 hours) |
| TTL 1 day + purge by tag | 81.2% | 0 | Correct, but tracking parameters split the keys |
| + clean cache key | **99.2%** | **0** | Both goals met: 2,395 origin fetches for the day |
| TTL 300 s + SWR 600 s | 84.7% | 12,651 | SWR hides refresh latency but is not invalidation |

The SWR row is worth explaining in an interview: its hit rate counts stale-window responses as hits, yet the origin received 96,283 requests, more than the 45,900 or so misses alone, because every hit in the stale window also triggers a background refresh. SWR improves latency and smooths load spikes; it does not replace purging when correctness matters.

## 6. Getting to 95% on a Real Site

The simulation hit 99.2% because 2,001 pages is a small catalogue. Real sites have a long tail, and every PoP has its own cache, so the hit rate is set by how many requests each object gets **per PoP** before it is evicted or purged. Levers, roughly in order of impact:

1. Cache HTML and API responses that are public (Cache Rules), with a long edge TTL.
2. Remove cookies and \`private\` from public responses; move personalisation to a small uncached API call or to the client.
3. Normalise the cache key (ignore or strip tracking parameters, sort the rest).
4. Turn on Tiered Cache so edges share one upper-tier copy; consider Cache Reserve for large, rarely read assets.
5. Version static assets (\`app.3f9c2b.js\`) and cache them for a year as \`immutable\`; no purge needed.
6. Measure hit rate by path prefix and content type, not one global number; one uncacheable endpoint with heavy traffic can hide behind a good average.

For dynamic logic at the edge (personalisation, A/B variants, auth checks), see [designing an edge-native app on Cloudflare Workers and R2](/interview-question/how-would-you-design-an-edge-native-app-on-cloudflare-workers-r2).

## 7. Edge Cases Worth Knowing

- **Purge order with a database replica.** If the CMS purges before the origin can read the new content (replica lag, a build still running), the next miss refetches the old page and caches it again for a day. Purge after the new content is readable, or purge twice.
- **Pages that depend on many objects.** A home page listing 50 articles must be tagged with all of them, or with a shared tag like \`home\` that every edit purges. Popular shared tags get purged often; that is fine as long as the page is cheap to rebuild.
- **Browser copies.** A purge clears Cloudflare, not browsers; a long browser \`max-age\` on HTML means readers see the old headline until it expires.
- **Personalised responses cached by mistake.** "Cache everything" on a path that sometimes returns logged-in HTML can serve one user's page to another; bypass on the session cookie.
- **Origin errors.** Decide whether to cache 404s and 5xx (briefly) and whether to serve stale content when the origin is down.

## Common Pitfalls

- **Chasing hit rate with short TTLs.** The 60-second TTL got 33.2% and was still stale; long TTL plus purge got 99.2% with no stale responses.
- **Leaving tracking parameters in the key.** They turned 2,001 pages into 49,579 keys in the run.
- **Long browser TTLs on HTML.** Purges cannot reach browsers; keep HTML browser TTLs short.
- **Session cookies on public pages.** One \`Set-Cookie\` makes a page uncacheable at Cloudflare.
- **Purging everything on every deploy.** It drops the hit rate to zero across all PoPs and floods the origin; purge by tag or prefix.
- **Reading SWR as freshness.** It serves stale content by design; use it for speed, not for correctness.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Diagnose:</strong> <span style="color:#f0e2c8;">Out of the box Cloudflare caches by <strong style="color:#ffca28;">file extension</strong>, so HTML is not cached; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set-Cookie</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">private</code> disables caching; and tracking query strings split each page into many <strong style="color:#ffca28;">cache keys</strong>. That is why the hit rate starts low.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Long TTL:</strong> <span style="color:#f0e2c8;">Cache public HTML with a <strong style="color:#ffca28;">Cache Rule</strong> and a long <strong style="color:#ffca28;">edge TTL</strong>, but keep the <strong style="color:#ffca28;">browser TTL</strong> short, using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CDN-Cache-Control</code> for the edge and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Cache-Control</code> for the browser.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Event-driven freshness:</strong> <span style="color:#f0e2c8;">Tag responses with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Cache-Tag</code> (article, section, home) and have the CMS <strong style="color:#ffca28;">purge by tag</strong> on every edit; that is available on all plans since April 2025 and Cloudflare reports sub-150 ms P50 purges.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Clean keys:</strong> <span style="color:#f0e2c8;">Ignore or strip <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">utm_*</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fbclid</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gclid</code>, sort query strings, and never vary public pages on cookies. In my simulation that took the hit rate from 81.2% to 99.2% with zero stale responses.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Origin protection:</strong> <span style="color:#f0e2c8;">Add <strong style="color:#ffca28;">Tiered Cache</strong> so one upper-tier copy fills many edges, <strong style="color:#ffca28;">stale-while-revalidate</strong> to hide refreshes, and <strong style="color:#ffca28;">Cache Reserve</strong> for the long tail; then measure hit rate per path and origin offload.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use a 60-second TTL everywhere?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each popular page is refetched every minute in every PoP, rarely read pages expire before their second visitor, and content is still stale for up to a minute. In the simulation it gave 33.2% hits and 1,690 stale responses; a long TTL with purge gave 99.2% and none.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you invalidate a home page that lists many articles?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Tag it with a shared tag such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">home</code> (or with each listed article tag) and purge that tag whenever any listed article changes. The home page is purged often, but it is one object and cheap to refetch.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle logged-in users?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Bypass the cache when the session cookie is present, or keep the page shell public and fetch the personal parts from a small uncached API. Never cache a response that contains user-specific data under a shared key.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between stale-while-revalidate and purge?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">SWR lets the edge serve an expired copy while it refreshes in the background, which improves latency but serves old content by design. Purge removes the copy as soon as content changes. Use both: purge for correctness, SWR for smooth refreshes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The dashboard says 95% but the origin is still overloaded. Why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The global number can hide one heavy uncacheable path, background revalidations and per-PoP misses. Look at origin requests by path, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cf-cache-status</code> breakdowns, and turn on Tiered Cache to cut per-PoP misses.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Cache hit rate | Share of requests answered by the edge cache |
| Origin offload | Share of requests that never reached the origin |
| Cache key | What makes two requests the same cached object |
| Edge TTL vs browser TTL | How long Cloudflare vs the browser may keep a copy |
| Purge by tag (Cache-Tag) | Remove every response labelled with a tag |
| Event-driven invalidation | Freshness from change events instead of timers |
| Tiered cache | Edges miss to an upper-tier PoP, which alone calls the origin |
| Stale-while-revalidate | Serve an expired copy while refreshing in the background |

**Conclusion:** A 95%+ hit rate without stale data comes from separating the two goals: long edge TTLs give the hits, and event-driven purge by tag gives the freshness. Start by making public HTML cacheable (it is not by default), strip cookies and tracking parameters from what the edge sees, keep browser TTLs short so purges matter, and have the CMS purge the exact tags an edit affects. In the simulation that combination reached 99.2% with zero stale responses, while short TTLs managed 33.2% and still served old pages. Tiered Cache, stale-while-revalidate and Cache Reserve then protect the origin from the long tail and from refresh bursts.`,
    examples: [
      {
        label: `A day at one edge: TTL vs purge by tag vs cache-key normalisation vs stale-while-revalidate`,
        variants: [
          { tech: "node", code: `// One Cloudflare-style edge cache in front of a news site for one simulated day.
// The edge is a Map (no eviction); the origin is a version counter per page.
// Purge is modelled as instant; Cloudflare reports under 150 ms P50 for Instant Purge.

let seed = 11;
function rand() { // Park-Miller generator, identical in every language
  seed = (seed * 48271) % 2147483647;
  return seed / 2147483647;
}
const ARTICLES = 2000, N = 300000, DAY = 86400;
const cdf = [];
let total = 0;
for (let k = 1; k <= ARTICLES; k++) { total += 1 / k; cdf.push(total); }
function pick() { // Zipf popularity: article k has weight 1/k
  const u = rand() * total;
  let lo = 0, hi = ARTICLES - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid] < u) lo = mid + 1; else hi = mid; }
  return lo + 1;
}

// Build the day once so every strategy sees the same traffic and the same edits.
const events = [];
for (let i = 0; i < N; i++) {
  const t = Math.floor((i * DAY) / N);
  const r = rand();
  const page = r < 0.1 ? "/" : "/a/" + pick();
  const q = rand();
  const query = q < 0.2 ? "?utm_source=s" + Math.floor(rand() * 30) : q < 0.3 ? "?fbclid=" + i : "";
  events.push({ t, url: page + query, page });
}
const edits = []; // an editor updates an article every 432 s (199 edits in the day)
for (let t = 432; t < DAY; t += 432) edits.push({ t, page: "/a/" + pick() });

function run(name, cfg) {
  const version = new Map(), edge = new Map(), byTag = new Map(); // byTag: page -> its cache keys
  const ver = (p) => version.get(p) || 0;
  let hits = 0, origin = 0, stale = 0, maxStale = 0, e = 0;
  const changedAt = new Map();
  for (const ev of events) {
    while (e < edits.length && edits[e].t <= ev.t) { // apply edits that happened before this request
      const ed = edits[e++];
      for (const p of [ed.page, "/"]) { version.set(p, ver(p) + 1); changedAt.set(p, ed.t); }
      if (cfg.purgeTags) for (const p of [ed.page, "/"]) { // purge by tag: every key carrying the tag
        for (const k of byTag.get(p) || []) edge.delete(k);
        byTag.delete(p);
      }
    }
    if (!cfg.cache) { origin++; continue; }
    const key = cfg.stripTracking ? ev.page : ev.url; // the cache key
    const c = edge.get(key);
    const fresh = c && ev.t < c.storedAt + cfg.ttl;
    const swr = c && !fresh && ev.t < c.storedAt + cfg.ttl + (cfg.swr || 0);
    if (fresh || swr) {
      hits++;
      if (c.v !== ver(ev.page)) { stale++; maxStale = Math.max(maxStale, ev.t - changedAt.get(ev.page)); }
      if (swr) { origin++; edge.set(key, { v: ver(ev.page), storedAt: ev.t }); } // background refresh
      continue;
    }
    origin++;
    edge.set(key, { v: ver(ev.page), storedAt: ev.t });
    if (!byTag.has(ev.page)) byTag.set(ev.page, new Set());
    byTag.get(ev.page).add(key);
  }
  const pct = (Math.round((hits * 1000) / N) / 10).toFixed(1);
  console.log(\`  \${name.padEnd(36)} \${pct.padStart(5)}%  \${String(origin).padStart(7)}  \${String(stale).padStart(6)}  \${String(maxStale).padStart(9)}\`);
}

console.log(\`One day: \${N} requests, \${ARTICLES} articles + home page, \${edits.length} edits\`);
console.log("  strategy                              hit    origin   stale  max stale s");
run("default (HTML not cached)", { cache: false });
run("cache everything, TTL 60 s", { cache: true, ttl: 60 });
run("TTL 1 day, no purge", { cache: true, ttl: DAY });
run("TTL 1 day + purge by tag", { cache: true, ttl: DAY, purgeTags: true });
run("  + strip utm and fbclid from key", { cache: true, ttl: DAY, purgeTags: true, stripTracking: true });
run("TTL 300 s + swr 600 s, clean key", { cache: true, ttl: 300, swr: 600, stripTracking: true });

const distinct = new Set(events.map((x) => x.url)).size, clean = new Set(events.map((x) => x.page)).size;
console.log(\`\\nDistinct cache keys: \${distinct} with raw URLs, \${clean} after stripping tracking parameters\`);` },
          { tech: "python", code: `# One Cloudflare-style edge cache in front of a news site for one simulated day.
# The edge is a dict (no eviction); the origin is a version counter per page.
# Purge is modelled as instant; Cloudflare reports under 150 ms P50 for Instant Purge.
import math

seed = 11


def rand():  # Park-Miller generator, identical in every language
    global seed
    seed = (seed * 48271) % 2147483647
    return seed / 2147483647


ARTICLES, N, DAY = 2000, 300000, 86400
cdf = []
total = 0.0
for k in range(1, ARTICLES + 1):
    total += 1 / k
    cdf.append(total)


def pick():  # Zipf popularity: article k has weight 1/k
    u = rand() * total
    lo, hi = 0, ARTICLES - 1
    while lo < hi:
        mid = (lo + hi) >> 1
        if cdf[mid] < u:
            lo = mid + 1
        else:
            hi = mid
    return lo + 1


# Build the day once so every strategy sees the same traffic and the same edits.
events = []
for i in range(N):
    t = i * DAY // N
    r = rand()
    page = "/" if r < 0.1 else "/a/" + str(pick())
    q = rand()
    query = "?utm_source=s" + str(math.floor(rand() * 30)) if q < 0.2 else ("?fbclid=" + str(i) if q < 0.3 else "")
    events.append((t, page + query, page))
edits = []  # an editor updates an article every 432 s (199 edits in the day)
for t in range(432, DAY, 432):
    edits.append((t, "/a/" + str(pick())))


def run(name, cache=False, ttl=0, swr=0, purge_tags=False, strip_tracking=False):
    version, edge, by_tag, changed_at = {}, {}, {}, {}  # by_tag: page -> its cache keys
    hits = origin = stale = max_stale = e = 0
    for t, url, page in events:
        while e < len(edits) and edits[e][0] <= t:  # apply edits that happened before this request
            et, ep = edits[e]
            e += 1
            for p in (ep, "/"):
                version[p] = version.get(p, 0) + 1
                changed_at[p] = et
            if purge_tags:
                for p in (ep, "/"):  # purge by tag: every key carrying the tag
                    for k in by_tag.pop(p, ()):
                        edge.pop(k, None)
        if not cache:
            origin += 1
            continue
        key = page if strip_tracking else url  # the cache key
        c = edge.get(key)
        fresh = c is not None and t < c[1] + ttl
        in_swr = c is not None and not fresh and t < c[1] + ttl + swr
        if fresh or in_swr:
            hits += 1
            if c[0] != version.get(page, 0):
                stale += 1
                max_stale = max(max_stale, t - changed_at[page])
            if in_swr:  # background refresh
                origin += 1
                edge[key] = (version.get(page, 0), t)
            continue
        origin += 1
        edge[key] = (version.get(page, 0), t)
        by_tag.setdefault(page, set()).add(key)
    pct = f"{math.floor(hits * 1000 / N + 0.5) / 10:.1f}"
    print(f"  {name:<36} {pct:>5}%  {origin:>7}  {stale:>6}  {max_stale:>9}")


print(f"One day: {N} requests, {ARTICLES} articles + home page, {len(edits)} edits")
print("  strategy                              hit    origin   stale  max stale s")
run("default (HTML not cached)")
run("cache everything, TTL 60 s", cache=True, ttl=60)
run("TTL 1 day, no purge", cache=True, ttl=DAY)
run("TTL 1 day + purge by tag", cache=True, ttl=DAY, purge_tags=True)
run("  + strip utm and fbclid from key", cache=True, ttl=DAY, purge_tags=True, strip_tracking=True)
run("TTL 300 s + swr 600 s, clean key", cache=True, ttl=300, swr=600, strip_tracking=True)

distinct = len({u for _, u, _ in events})
clean = len({p for _, _, p in events})
print(f"\\nDistinct cache keys: {distinct} with raw URLs, {clean} after stripping tracking parameters")` },
        ],
      },
    ],
  },
  {
    title: `What is a Bloom filter and when is it useful?`,
    difficulty: "medium",
    seoDescription: `How a Bloom filter answers "definitely not" or "maybe" in a few bits per item: the false-positive formula, sizing m and k, and real uses.`,
    description: `**Question presented to candidate:**
"What is a Bloom filter? Explain how it works, what kind of mistakes it can make, how you would size one, and give me a couple of places in a real system where you would use it."

**What a strong answer should cover:**
- The structure: a **bit array** of m bits and **k hash functions**; add sets k bits, a lookup checks the same k bits
- The guarantee: **no false negatives** ("not present" is always right), tunable **false positives** ("maybe present" can be wrong)
- The maths: false-positive rate about (1 - e^(-kn/m))^k; optimal k = (m/n) ln 2; about **9.6 bits per item for 1%**, independent of item size
- What it cannot do: no deletes (unless counting or cuckoo filters), no listing members, and the error rate climbs fast when you insert more than it was sized for
- Real uses: LSM-tree databases skipping files that cannot hold a key (Cassandra keeps one per SSTable), guarding a cache or database from lookups of keys that do not exist, crawlers checking seen URLs; Redis 8 ships Bloom filters built in
- The trade-off in one line: memory and speed for a small, known chance of an unnecessary expensive lookup

**Code / implementation expected:** Optional — a short implementation (bit array plus double hashing) or the sizing formula; the example builds one and measures its error rate.`,
    answer: `**Target Audience:** Beginners to system design — you know what a hash function and a set are; the probability is worked through step by step.
**Difficulty:** Medium
**Verified with:** Node 22.22, Python 3.12, Go 1.24 and Java 21 (all four print identical output).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Error rates and sizes come from running the example; the **Verified** section quotes the full output.

## 1. Why This Even Matters — A Story First

A nightclub bouncer has a guest list of 10,000 names, but no time to read it for every person in the queue. So the organiser gives the bouncer a card with 100,000 tiny boxes. For every guest, the organiser ran their name through seven different scrambling rules, each pointing to one box, and ticked those seven boxes. When someone arrives, the bouncer applies the same seven rules to their name and looks at those seven boxes.

If **any box is empty**, this person is **definitely not** on the list: had they been, the organiser would have ticked it. If **all seven are ticked**, they are **probably** on the list, so the bouncer checks the real list. Occasionally all seven boxes were ticked by other guests, and the bouncer checks the real list for nothing. That is the only kind of mistake the card makes.

The card is a **Bloom filter**. It is tiny compared with the list, it never turns away a real guest, and it saves a trip to the real list for almost everyone who is not on it.

📌 **Interview term: Bloom filter** — a probabilistic set-membership structure (Burton Bloom, 1970) that answers "definitely not in the set" or "possibly in the set" using a bit array and several hash functions.

## 2. How It Works

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="Adding cat sets bits 2, 5 and 9 of a 12 bit array; looking up dog checks bits 1, 5 and 9 and finds bit 1 empty">
  <defs>
    <marker id="sd04q5-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="40" y="20" width="140" height="56" rx="10"/>
  <text class="d-text" x="110" y="54" text-anchor="middle">add cat</text>
  <rect class="d-box" x="40" y="254" width="140" height="56" rx="10"/>
  <text class="d-text" x="110" y="288" text-anchor="middle">lookup dog</text>
  <rect class="d-box" x="130" y="140" width="50" height="50" rx="4"/>
  <text class="d-sub" x="155" y="170" text-anchor="middle">0</text>
  <rect class="d-box" x="180" y="140" width="50" height="50" rx="4"/>
  <text class="d-sub" x="205" y="170" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="230" y="140" width="50" height="50" rx="4"/>
  <text class="d-text" x="255" y="170" text-anchor="middle">1</text>
  <rect class="d-box" x="280" y="140" width="50" height="50" rx="4"/>
  <text class="d-sub" x="305" y="170" text-anchor="middle">0</text>
  <rect class="d-box" x="330" y="140" width="50" height="50" rx="4"/>
  <text class="d-sub" x="355" y="170" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="380" y="140" width="50" height="50" rx="4"/>
  <text class="d-text" x="405" y="170" text-anchor="middle">1</text>
  <rect class="d-box" x="430" y="140" width="50" height="50" rx="4"/>
  <text class="d-sub" x="455" y="170" text-anchor="middle">0</text>
  <rect class="d-box" x="480" y="140" width="50" height="50" rx="4"/>
  <text class="d-sub" x="505" y="170" text-anchor="middle">0</text>
  <rect class="d-box" x="530" y="140" width="50" height="50" rx="4"/>
  <text class="d-sub" x="555" y="170" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="580" y="140" width="50" height="50" rx="4"/>
  <text class="d-text" x="605" y="170" text-anchor="middle">1</text>
  <rect class="d-box" x="630" y="140" width="50" height="50" rx="4"/>
  <text class="d-sub" x="655" y="170" text-anchor="middle">0</text>
  <rect class="d-box" x="680" y="140" width="50" height="50" rx="4"/>
  <text class="d-sub" x="705" y="170" text-anchor="middle">0</text>
  <text class="d-sub" x="155" y="128" text-anchor="middle">0</text>
  <text class="d-sub" x="205" y="128" text-anchor="middle">1</text>
  <text class="d-sub" x="255" y="128" text-anchor="middle">2</text>
  <text class="d-sub" x="405" y="128" text-anchor="middle">5</text>
  <text class="d-sub" x="605" y="128" text-anchor="middle">9</text>
  <line class="d-edge-accent" x1="180" y1="56" x2="252" y2="100" marker-end="url(#sd04q5-arrow)"/>
  <line class="d-edge-accent" x1="180" y1="48" x2="402" y2="100" marker-end="url(#sd04q5-arrow)"/>
  <line class="d-edge-accent" x1="180" y1="40" x2="602" y2="100" marker-end="url(#sd04q5-arrow)"/>
  <line class="d-edge-dashed" x1="180" y1="266" x2="203" y2="194" marker-end="url(#sd04q5-arrow)"/>
  <line class="d-edge-dashed" x1="180" y1="276" x2="403" y2="194" marker-end="url(#sd04q5-arrow)"/>
  <line class="d-edge-dashed" x1="180" y1="286" x2="603" y2="194" marker-end="url(#sd04q5-arrow)"/>
  <text class="d-sub" x="560" y="270" text-anchor="middle">bit 1 is 0: definitely absent</text>
</svg>

Adding \`cat\` with k = 3 sets bits 2, 5 and 9. Looking up \`dog\` hashes to 1, 5 and 9; bit 1 is still 0, so \`dog\` was never added, even though 5 and 9 are set.

- **Add(x):** compute k positions from k hash functions and set those bits to 1.
- **MightContain(x):** compute the same positions; if any bit is 0, answer **no**; if all are 1, answer **maybe**.
- Both operations cost O(k), no matter how many items are stored, and the filter never stores the items themselves.

📌 **Interview term: false positive** — the filter says "maybe present" for an item that was never added, because other items happened to set all its bits.

📌 **Interview term: no false negatives** — an added item's bits are never cleared, so the filter never says "absent" for something that was added. This is what makes it safe as a pre-check in front of the real data.

📌 **Interview term: double hashing (Kirsch–Mitzenmacher)** — instead of k independent hash functions, compute two hashes h1 and h2 and use positions \`h1 + i x h2 mod m\` for i = 0 to k-1. The error rate stays essentially the same, and it is what the example does.

## 3. The Maths, With Numbers

For n items in m bits with k hashes, the probability that a given bit is still 0 after all insertions is about e^(-kn/m). A false positive needs all k bits set:

~~~text
false-positive rate  p  ≈ (1 - e^(-k n / m))^k
best k for given m, n  =  (m / n) x ln 2
bits needed for target p:  m = -n x ln p / (ln 2)^2   (about 1.44 x log2(1/p) bits per item)
~~~

For n = 10,000 and p = 1%, the example computed **m = 95,851 bits (11,982 bytes)** and **k = 7**: about 9.6 bits per item. Each further tenfold drop in p costs about 4.8 more bits per item. The size does not depend on how big the items are: the 10,000 keys themselves were 88,890 bytes of text, more than seven times the filter, before any hash-table overhead.

The run then measured:

| Situation | Measured false positives | Formula predicts |
| :--- | ---: | ---: |
| 10,000 items, as designed | 0.985% | 1.004% |
| 20,000 items (2x overfilled) | 15.599% | 15.745% |
| 40,000 items (4x overfilled) | 67.593% | 67.867% |

And for the same m and n with different k:

| k | 1 | 3 | 7 | 12 | 20 |
| :--- | ---: | ---: | ---: | ---: | ---: |
| Measured | 10.285% | 1.905% | **0.985%** | 1.788% | 7.122% |

Too few hashes and each item leaves too little evidence; too many and the array fills with ones. The optimum, k = 7 here, sits where about half the bits are set.

📌 **Interview term: saturation (overfilling)** — inserting more items than the filter was sized for. The error rate does not degrade gently: doubling n took 1% to 15.6%. Size for the maximum n, or use a scalable filter that adds layers as it grows.

## 4. When It Is Useful

The pattern is always the same: **an expensive lookup that usually finds nothing**, and a cheap pre-check that can rule most of them out.

- **LSM-tree storage engines.** Data is spread across many immutable files; a read would have to check each. A per-file Bloom filter in memory says "this key is definitely not in this file", skipping disk reads. Apache Cassandra keeps one per SSTable, set by the table property \`bloom_filter_fp_chance\` (default 0.01, or 0.1 for tables using LeveledCompactionStrategy, per the Apache Cassandra 4.0 documentation). The same docs note that a lower rate costs memory non-linearly: 0.01 needs about three times the memory of 0.1.
- **Guarding a cache and database from missing keys.** Bots requesting random IDs always miss the cache and hit the database (cache penetration). A filter of all valid IDs rejects them first: in the run, **99,015 of 100,000** lookups for non-existent keys were stopped. See [how caching improves performance](/interview-question/how-does-caching-improve-system-performance) for the cache side.
- **Web crawlers.** "Have I already queued this URL?" for billions of URLs fits in memory; a false positive means skipping one page, which is acceptable. See [designing a web crawler](/interview-question/how-would-you-design-a-web-crawler-5715).
- **Distributed joins and sync.** Send a Bloom filter of your keys instead of the keys, so the other side only returns rows that might match.
- **Usernames, coupons, one-time tokens.** A quick "definitely not taken" before a database check.

Redis 8.0, generally available since May 2025, includes the Bloom filter, cuckoo filter, count-min sketch, top-k and t-digest in Redis Open Source (Redis blog, *Redis 8 GA*); commands such as \`BF.RESERVE\`, \`BF.ADD\` and \`BF.EXISTS\` create and query a filter with a chosen error rate and capacity.

**When not to use it:** when false positives are unacceptable and you cannot afford the real check behind them, when you need to delete items (plain Bloom filters cannot), when you need to list or count members, or when the set is small enough to keep as an ordinary hash set.

## 5. Variants Worth Naming

| Variant | Adds | Cost |
| :--- | :--- | :--- |
| Counting Bloom filter | Deletes, by keeping a small counter per position instead of a bit | Several times the memory |
| Scalable Bloom filter | Grows by adding new, larger filters as items arrive | Lookups check every layer |
| Cuckoo filter | Deletes, and often less memory at low error rates, by storing short fingerprints | Inserts can fail when it is nearly full |
| Blocked Bloom filter | Fewer cache-line misses by keeping an item's bits close together | Slightly higher error for the same memory |

📌 **Interview term: cuckoo filter** — a membership filter that stores small fingerprints of items in a cuckoo hash table, supporting deletion.

## 6. Verified: Running the Code

The example **"A Bloom filter from scratch: sizing, false positives measured vs predicted, overfilling, choosing k"** builds the filter on a byte array, hashes with 32-bit FNV-1a (h1) and djb2 (h2, forced odd) using double hashing, inserts \`user:0\` to \`user:9999\`, and tests 100,000 keys \`visitor:0\` to \`visitor:99999\` that were never added. Integer arithmetic keeps the four languages identical; only the predicted column uses floating point.

The key part:

~~~js
positions(s) { // double hashing: index_i = (h1 + i * h2) mod m
  const h1 = fnv1a(s), h2 = djb2(s) | 1;
  const out = [];
  for (let i = 0; i < this.k; i++) out.push((h1 + i * (h2 >>> 0)) % this.m);
  return out;
}
~~~

Full output (identical in Node, Python, Go and Java):

~~~text
Sizing for n=10000, target p=0.01: m=95851 bits (11982 bytes), k=7
  the keys themselves are 88890 bytes of text, before any hash-table overhead

After adding 10000 members
  members reported absent (false negatives): 0
  non-members reported present: 985 of 100000 = 0.985% (predicted 1.004%)
  as a guard in front of a database: 99015 of 100000 lookups for missing keys never reach it

Overfilling the same filter (m and k fixed)
  20000 items: false positives 15.599% (predicted 15.745%)
  40000 items: false positives 67.593% (predicted 67.867%)

Choosing k for the same m and n
  k= 1: false positives 10.285% (predicted 9.907%)
  k= 3: false positives  1.905% (predicted 1.941%)
  k= 7: false positives  0.985% (predicted 1.004%)
  k=12: false positives  1.788% (predicted 1.757%)
  k=20: false positives  7.122% (predicted 7.063%)
~~~

## 7. Edge Cases Worth Knowing

- **Poor hash functions.** Correlated or weak hashes cluster bits and push the error rate above the formula; use well-mixed hashes such as MurmurHash3 or xxHash in production.
- **Merging filters.** Two filters with the same m, k and hash functions can be combined with a bitwise OR to represent the union.
- **Persisting and shipping.** The filter is just bits, so it is cheap to save and send, but every reader must use exactly the same hash functions and parameters.
- **Rebuilding after deletes.** If items are removed from the real set, a plain filter keeps saying "maybe" for them; rebuild it periodically from the source.
- **Adversarial inputs.** Someone who knows your hash functions can craft keys that are all false positives; use a keyed (seeded) hash where that matters.

## Common Pitfalls

- **Saying it can have false negatives.** It cannot; only false positives.
- **Sizing for today's n.** Doubling the items took the run from 1% to 15.6% false positives.
- **Picking k by instinct.** k = 1 gave 10.3% and k = 20 gave 7.1% where k = 7 gave 1%; use k = (m/n) ln 2.
- **Trying to delete by clearing bits.** That breaks other items that share those bits and creates false negatives.
- **Forgetting the real check.** A "maybe" must still be confirmed against the source of truth.
- **Thinking memory depends on item size.** It depends only on n and p.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">Bloom filter</strong> is a bit array of m bits plus k hash functions. Adding an item sets k bits; a lookup checks those k bits. Any 0 means <strong style="color:#ffca28;">definitely not present</strong>; all 1s means <strong style="color:#ffca28;">maybe present</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The guarantee:</strong> <span style="color:#f0e2c8;">There are <strong style="color:#ffca28;">no false negatives</strong>, only <strong style="color:#ffca28;">false positives</strong>, at a rate of about (1 - e^(-kn/m))^k. That makes it a safe pre-check in front of an expensive lookup.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Sizing:</strong> <span style="color:#f0e2c8;">About 9.6 bits per item for 1%, with k = (m/n) ln 2. For 10,000 items that is 11,982 bytes and k = 7, and my run measured 0.985% against 1.004% predicted, whatever the size of the items.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Where it is used:</strong> <span style="color:#f0e2c8;">LSM-tree databases skip files that cannot hold a key (Cassandra has one per SSTable), caches reject lookups for keys that do not exist, crawlers track seen URLs; Redis 8 includes it as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BF.ADD</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BF.EXISTS</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Limits:</strong> <span style="color:#f0e2c8;">No deletes (use a counting or <strong style="color:#ffca28;">cuckoo filter</strong>), no listing members, and the error rate explodes if overfilled: 2x the items gave 15.6% in my run. Size for the maximum n or use a scalable filter.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can it not have false negatives?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Adding an item sets its k bits and nothing ever clears a bit, so when you look the item up again all k bits are still 1. Only another item can set bits, which can only turn a "no" into a wrong "maybe".</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you delete from a Bloom filter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You cannot with plain bits, because bits are shared between items. A counting Bloom filter keeps a counter per position and decrements on delete; a cuckoo filter stores fingerprints and removes them directly. Or rebuild the filter from the source periodically.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do you need k independent hash functions?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Two good hashes combined as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h1 + i x h2</code> give positions that behave almost like k independent ones; that is the Kirsch–Mitzenmacher technique the example uses.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you use one to protect a database?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Load all existing IDs into a filter sized for the expected maximum, check it before the cache and database, and return "not found" immediately on a no. Add new IDs to the filter on insert. In the run it stopped 99,015 of 100,000 lookups for missing keys.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you insert far more items than planned?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The array fills with ones and the false-positive rate rises steeply: 4x the planned items gave 67.6% in the run, at which point the filter is nearly useless. Monitor the count, and rebuild bigger or use a scalable filter.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Bloom filter | Bit array plus k hashes answering "definitely not" or "maybe" |
| False positive | "Maybe" for an item that was never added |
| No false negatives | An added item is always reported as maybe present |
| Double hashing | Deriving k positions from two hashes as h1 + i x h2 |
| Saturation | Too many items; most bits set and errors climb |
| Cuckoo filter | A fingerprint-based filter that supports deletion |

**Conclusion:** A Bloom filter trades a small, tunable chance of a wasted lookup for a huge saving in memory and time: a bit array and k hashes that can say "definitely not" with certainty and "maybe" with a known error rate. Size it with m = -n ln p / (ln 2)^2 and k = (m/n) ln 2, which for 10,000 items at 1% is under 12 KB and seven hashes, and the run matched the formula (0.985% measured, 1.004% predicted). Use it wherever an expensive lookup usually finds nothing, such as LSM-tree files, cache-penetration guards and crawler frontiers, and remember its limits: no deletes, no listing, and a steep error climb once it is overfilled.`,
    examples: [
      {
        label: `A Bloom filter from scratch: sizing, false positives measured vs predicted, overfilling, choosing k`,
        variants: [
          { tech: "node", code: `// A Bloom filter from scratch: sizing, no false negatives, measured vs predicted
// false-positive rate, what overfilling does, and the effect of k.

function fnv1a(s) { // 32-bit FNV-1a
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}
function djb2(s) { // 32-bit djb2, used as the second hash
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) + s.charCodeAt(i)) >>> 0;
  return h;
}

class Bloom {
  constructor(m, k) { this.m = m; this.k = k; this.bits = new Uint8Array(Math.ceil(m / 8)); }
  positions(s) { // double hashing: index_i = (h1 + i * h2) mod m
    const h1 = fnv1a(s), h2 = djb2(s) | 1;
    const out = [];
    for (let i = 0; i < this.k; i++) out.push((h1 + i * (h2 >>> 0)) % this.m);
    return out;
  }
  add(s) { for (const p of this.positions(s)) this.bits[p >> 3] |= 1 << (p & 7); }
  has(s) { return this.positions(s).every((p) => (this.bits[p >> 3] & (1 << (p & 7))) !== 0); }
}

const pct3 = (count, of) => { // count / of as a percentage with 3 decimals, integer maths only
  const x = Math.round((count * 100000) / of);
  return Math.floor(x / 1000) + "." + String(x % 1000).padStart(3, "0") + "%";
};
const predicted = (m, k, n) => (100 * Math.pow(1 - Math.exp((-k * n) / m), k)).toFixed(3) + "%";

const n = 10000, p = 0.01;
const m = Math.ceil((-n * Math.log(p)) / (Math.LN2 * Math.LN2));
const k = Math.round((m / n) * Math.LN2);
let keyBytes = 0;
for (let i = 0; i < n; i++) keyBytes += ("user:" + i).length;
console.log(\`Sizing for n=\${n}, target p=\${p}: m=\${m} bits (\${Math.ceil(m / 8)} bytes), k=\${k}\`);
console.log(\`  the keys themselves are \${keyBytes} bytes of text, before any hash-table overhead\`);

const f = new Bloom(m, k);
for (let i = 0; i < n; i++) f.add("user:" + i);
let missing = 0;
for (let i = 0; i < n; i++) if (!f.has("user:" + i)) missing++;
const TESTS = 100000;
function fpCount(filter) {
  let c = 0;
  for (let j = 0; j < TESTS; j++) if (filter.has("visitor:" + j)) c++;
  return c;
}
const fp = fpCount(f);
console.log("\\nAfter adding 10000 members");
console.log(\`  members reported absent (false negatives): \${missing}\`);
console.log(\`  non-members reported present: \${fp} of \${TESTS} = \${pct3(fp, TESTS)} (predicted \${predicted(m, k, n)})\`);
console.log(\`  as a guard in front of a database: \${TESTS - fp} of \${TESTS} lookups for missing keys never reach it\`);

console.log("\\nOverfilling the same filter (m and k fixed)");
for (const total of [20000, 40000]) {
  const g = new Bloom(m, k);
  for (let i = 0; i < total; i++) g.add("user:" + i);
  const c = fpCount(g);
  console.log(\`  \${String(total).padStart(5)} items: false positives \${pct3(c, TESTS).padStart(7)} (predicted \${predicted(m, k, total)})\`);
}

console.log("\\nChoosing k for the same m and n");
for (const kk of [1, 3, 7, 12, 20]) {
  const g = new Bloom(m, kk);
  for (let i = 0; i < n; i++) g.add("user:" + i);
  const c = fpCount(g);
  console.log(\`  k=\${String(kk).padStart(2)}: false positives \${pct3(c, TESTS).padStart(7)} (predicted \${predicted(m, kk, n)})\`);
}` },
          { tech: "python", code: `# A Bloom filter from scratch: sizing, no false negatives, measured vs predicted
# false-positive rate, what overfilling does, and the effect of k.
import math


def fnv1a(s):  # 32-bit FNV-1a
    h = 2166136261
    for ch in s:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def djb2(s):  # 32-bit djb2, used as the second hash
    h = 5381
    for ch in s:
        h = (h * 33 + ord(ch)) & 0xFFFFFFFF
    return h


class Bloom:
    def __init__(self, m, k):
        self.m, self.k = m, k
        self.bits = bytearray((m + 7) // 8)

    def positions(self, s):  # double hashing: index_i = (h1 + i * h2) mod m
        h1, h2 = fnv1a(s), djb2(s) | 1
        return [(h1 + i * h2) % self.m for i in range(self.k)]

    def add(self, s):
        for p in self.positions(s):
            self.bits[p >> 3] |= 1 << (p & 7)

    def has(self, s):
        return all(self.bits[p >> 3] & (1 << (p & 7)) for p in self.positions(s))


def pct3(count, of):  # count / of as a percentage with 3 decimals, integer maths only
    x = (count * 100000 * 2 + of) // (2 * of)
    return f"{x // 1000}.{x % 1000:03d}%"


def predicted(m, k, n):
    return f"{100 * math.pow(1 - math.exp(-k * n / m), k):.3f}%"


n, p = 10000, 0.01
m = math.ceil(-n * math.log(p) / (math.log(2) * math.log(2)))
k = math.floor(m / n * math.log(2) + 0.5)
key_bytes = sum(len("user:" + str(i)) for i in range(n))
print(f"Sizing for n={n}, target p={p}: m={m} bits ({(m + 7) // 8} bytes), k={k}")
print(f"  the keys themselves are {key_bytes} bytes of text, before any hash-table overhead")

f = Bloom(m, k)
for i in range(n):
    f.add("user:" + str(i))
missing = sum(1 for i in range(n) if not f.has("user:" + str(i)))
TESTS = 100000


def fp_count(flt):
    return sum(1 for j in range(TESTS) if flt.has("visitor:" + str(j)))


fp = fp_count(f)
print("\\nAfter adding 10000 members")
print(f"  members reported absent (false negatives): {missing}")
print(f"  non-members reported present: {fp} of {TESTS} = {pct3(fp, TESTS)} (predicted {predicted(m, k, n)})")
print(f"  as a guard in front of a database: {TESTS - fp} of {TESTS} lookups for missing keys never reach it")

print("\\nOverfilling the same filter (m and k fixed)")
for total in [20000, 40000]:
    g = Bloom(m, k)
    for i in range(total):
        g.add("user:" + str(i))
    c = fp_count(g)
    print(f"  {total:>5} items: false positives {pct3(c, TESTS):>7} (predicted {predicted(m, k, total)})")

print("\\nChoosing k for the same m and n")
for kk in [1, 3, 7, 12, 20]:
    g = Bloom(m, kk)
    for i in range(n):
        g.add("user:" + str(i))
    c = fp_count(g)
    print(f"  k={kk:>2}: false positives {pct3(c, TESTS):>7} (predicted {predicted(m, kk, n)})")` },
          { tech: "go", code: `// A Bloom filter from scratch: sizing, no false negatives, measured vs predicted
// false-positive rate, what overfilling does, and the effect of k.
package main

import (
	"fmt"
	"math"
	"strconv"
)

func fnv1a(s string) uint64 { // 32-bit FNV-1a
	var h uint32 = 2166136261
	for i := 0; i < len(s); i++ {
		h ^= uint32(s[i])
		h *= 16777619
	}
	return uint64(h)
}

func djb2(s string) uint64 { // 32-bit djb2, used as the second hash
	var h uint32 = 5381
	for i := 0; i < len(s); i++ {
		h = h*33 + uint32(s[i])
	}
	return uint64(h)
}

type Bloom struct {
	m, k uint64
	bits []byte
}

func NewBloom(m, k uint64) *Bloom { return &Bloom{m, k, make([]byte, (m+7)/8)} }

func (b *Bloom) positions(s string) []uint64 { // double hashing: index_i = (h1 + i * h2) mod m
	h1, h2 := fnv1a(s), djb2(s)|1
	out := make([]uint64, b.k)
	for i := uint64(0); i < b.k; i++ {
		out[i] = (h1 + i*h2) % b.m
	}
	return out
}

func (b *Bloom) Add(s string) {
	for _, p := range b.positions(s) {
		b.bits[p>>3] |= 1 << (p & 7)
	}
}

func (b *Bloom) Has(s string) bool {
	for _, p := range b.positions(s) {
		if b.bits[p>>3]&(1<<(p&7)) == 0 {
			return false
		}
	}
	return true
}

func pct3(count, of int) string { // count / of as a percentage with 3 decimals, integer maths only
	x := (count*100000*2 + of) / (2 * of)
	return fmt.Sprintf("%d.%03d%%", x/1000, x%1000)
}

func predicted(m, k uint64, n int) string {
	return fmt.Sprintf("%.3f%%", 100*math.Pow(1-math.Exp(-float64(k)*float64(n)/float64(m)), float64(k)))
}

const TESTS = 100000

func fpCount(f *Bloom) int {
	c := 0
	for j := 0; j < TESTS; j++ {
		if f.Has("visitor:" + strconv.Itoa(j)) {
			c++
		}
	}
	return c
}

func filled(m, k uint64, total int) *Bloom {
	g := NewBloom(m, k)
	for i := 0; i < total; i++ {
		g.Add("user:" + strconv.Itoa(i))
	}
	return g
}

func main() {
	n, p := 10000, 0.01
	m := uint64(math.Ceil(-float64(n) * math.Log(p) / (math.Ln2 * math.Ln2)))
	k := uint64(math.Floor(float64(m)/float64(n)*math.Ln2 + 0.5))
	keyBytes := 0
	for i := 0; i < n; i++ {
		keyBytes += len("user:" + strconv.Itoa(i))
	}
	fmt.Printf("Sizing for n=%d, target p=%v: m=%d bits (%d bytes), k=%d\\n", n, p, m, (m+7)/8, k)
	fmt.Printf("  the keys themselves are %d bytes of text, before any hash-table overhead\\n", keyBytes)

	f := filled(m, k, n)
	missing := 0
	for i := 0; i < n; i++ {
		if !f.Has("user:" + strconv.Itoa(i)) {
			missing++
		}
	}
	fp := fpCount(f)
	fmt.Println("\\nAfter adding 10000 members")
	fmt.Printf("  members reported absent (false negatives): %d\\n", missing)
	fmt.Printf("  non-members reported present: %d of %d = %s (predicted %s)\\n", fp, TESTS, pct3(fp, TESTS), predicted(m, k, n))
	fmt.Printf("  as a guard in front of a database: %d of %d lookups for missing keys never reach it\\n", TESTS-fp, TESTS)

	fmt.Println("\\nOverfilling the same filter (m and k fixed)")
	for _, total := range []int{20000, 40000} {
		c := fpCount(filled(m, k, total))
		fmt.Printf("  %5d items: false positives %7s (predicted %s)\\n", total, pct3(c, TESTS), predicted(m, k, total))
	}

	fmt.Println("\\nChoosing k for the same m and n")
	for _, kk := range []uint64{1, 3, 7, 12, 20} {
		c := fpCount(filled(m, kk, n))
		fmt.Printf("  k=%2d: false positives %7s (predicted %s)\\n", kk, pct3(c, TESTS), predicted(m, kk, n))
	}
}` },
          { tech: "java", code: `// A Bloom filter from scratch: sizing, no false negatives, measured vs predicted
// false-positive rate, what overfilling does, and the effect of k.
public class Main {
    static long fnv1a(String s) { // 32-bit FNV-1a
        long h = 2166136261L;
        for (int i = 0; i < s.length(); i++) { h ^= s.charAt(i); h = (h * 16777619L) & 0xFFFFFFFFL; }
        return h;
    }

    static long djb2(String s) { // 32-bit djb2, used as the second hash
        long h = 5381;
        for (int i = 0; i < s.length(); i++) h = (h * 33 + s.charAt(i)) & 0xFFFFFFFFL;
        return h;
    }

    static class Bloom {
        final long m; final int k; final byte[] bits;
        Bloom(long m, int k) { this.m = m; this.k = k; this.bits = new byte[(int) ((m + 7) / 8)]; }
        long[] positions(String s) { // double hashing: index_i = (h1 + i * h2) mod m
            long h1 = fnv1a(s), h2 = djb2(s) | 1;
            long[] out = new long[k];
            for (int i = 0; i < k; i++) out[i] = (h1 + i * h2) % m;
            return out;
        }
        void add(String s) { for (long p : positions(s)) bits[(int) (p >> 3)] |= (byte) (1 << (p & 7)); }
        boolean has(String s) {
            for (long p : positions(s)) if ((bits[(int) (p >> 3)] & (1 << (p & 7))) == 0) return false;
            return true;
        }
    }

    static String pct3(int count, int of) { // count / of as a percentage with 3 decimals, integer maths only
        long x = ((long) count * 100000 * 2 + of) / (2L * of);
        return String.format(java.util.Locale.ROOT, "%d.%03d%%", x / 1000, x % 1000);
    }

    static String predicted(long m, int k, int n) {
        return String.format(java.util.Locale.ROOT, "%.3f%%", 100 * Math.pow(1 - Math.exp(-(double) k * n / m), k));
    }

    static final int TESTS = 100000;

    static int fpCount(Bloom f) {
        int c = 0;
        for (int j = 0; j < TESTS; j++) if (f.has("visitor:" + j)) c++;
        return c;
    }

    static Bloom filled(long m, int k, int total) {
        Bloom g = new Bloom(m, k);
        for (int i = 0; i < total; i++) g.add("user:" + i);
        return g;
    }

    public static void main(String[] args) {
        int n = 10000; double p = 0.01;
        long m = (long) Math.ceil(-n * Math.log(p) / (Math.log(2) * Math.log(2)));
        int k = (int) Math.floor((double) m / n * Math.log(2) + 0.5);
        int keyBytes = 0;
        for (int i = 0; i < n; i++) keyBytes += ("user:" + i).length();
        System.out.printf(java.util.Locale.ROOT, "Sizing for n=%d, target p=%s: m=%d bits (%d bytes), k=%d%n", n, p, m, (m + 7) / 8, k);
        System.out.printf(java.util.Locale.ROOT, "  the keys themselves are %d bytes of text, before any hash-table overhead%n", keyBytes);

        Bloom f = filled(m, k, n);
        int missing = 0;
        for (int i = 0; i < n; i++) if (!f.has("user:" + i)) missing++;
        int fp = fpCount(f);
        System.out.println("\\nAfter adding 10000 members");
        System.out.printf(java.util.Locale.ROOT, "  members reported absent (false negatives): %d%n", missing);
        System.out.printf(java.util.Locale.ROOT, "  non-members reported present: %d of %d = %s (predicted %s)%n", fp, TESTS, pct3(fp, TESTS), predicted(m, k, n));
        System.out.printf(java.util.Locale.ROOT, "  as a guard in front of a database: %d of %d lookups for missing keys never reach it%n", TESTS - fp, TESTS);

        System.out.println("\\nOverfilling the same filter (m and k fixed)");
        for (int total : new int[]{20000, 40000}) {
            int c = fpCount(filled(m, k, total));
            System.out.printf(java.util.Locale.ROOT, "  %5d items: false positives %7s (predicted %s)%n", total, pct3(c, TESTS), predicted(m, k, total));
        }

        System.out.println("\\nChoosing k for the same m and n");
        for (int kk : new int[]{1, 3, 7, 12, 20}) {
            int c = fpCount(filled(m, kk, n));
            System.out.printf(java.util.Locale.ROOT, "  k=%2d: false positives %7s (predicted %s)%n", kk, pct3(c, TESTS), predicted(m, kk, n));
        }
    }
}` },
        ],
      },
    ],
  },
];

export default augments;
