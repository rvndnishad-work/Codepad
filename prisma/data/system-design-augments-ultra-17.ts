/**
 * SYSTEM DESIGN ULTRA — batch 17: Location and collaboration. Every example was run by
 * scripts/verify-variant-examples.ts (node, python, go, java); quoted output is that run's output.
 */
import type { SystemDesignUltraAugment } from "./system-design-augments.types";

const augments: SystemDesignUltraAugment[] = [
  {
    title: `How would you design a 'nearby drivers' / proximity search?`,
    difficulty: "hard",
    seoDescription: `Design nearby-driver search: geohash, H3 and quadtree indexes, the cell-plus-neighbours query, 1.25M location writes per second, sharding by region.`,
    description: `**Question presented to candidate:**
"A rider opens our app and we want to show the drivers within a kilometre or so, and then dispatch the closest available one. Millions of drivers send their GPS position every few seconds. How do you store those positions and answer 'who is near this point' fast enough?"

**What a strong answer should cover:**
- Why a full scan (distance to every driver) does not scale, and the idea of a **spatial index**: bucket the map into cells so a query looks only at nearby cells
- **Geohash** (a prefix = a rectangle; precision picks the cell size), or **H3** hexagons / a **quadtree**, with the trade-offs between them
- The query: rider cell **plus its 8 neighbours**, then an exact distance filter; the cell must be at least as large as the search radius or the 3x3 block misses drivers
- The write path dominates: about **1.25 million location updates per second** for 5 million drivers every 4 seconds; keep positions in memory (Redis GEO or an in-process grid), with a TTL so stale drivers disappear
- Sharding by geography (city or cell prefix), hot cells (airports, stadiums), and separating "nearby" from "dispatch/matching"
- Capacity numbers and what breaks first at 10x

**Clarifying questions expected:**
- How many active drivers, how often do they report, and how many ride requests per second at peak?
- Search radius, and do we need the K nearest or everyone within R? Straight-line or road distance?
- How fresh must positions be, and is this only for display or also for dispatch?

**Code / implementation expected:** Optional — the design with numbers; the example builds a geohash index over 10,000 drivers and compares query strategies.`,
    answer: `**Target Audience:** Developers preparing for system design interviews. You know what a database index and a cache are; no maps or geometry background needed.
**Difficulty:** Hard
**Verified with:** Node 22.22, Python 3.12, Go 1.24 and Java 21 (all four print identical output). Redis behaviour and memory were checked on Redis 7.0.15.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All behaviour shown comes from running the example; the **Verified** section quotes the full output. Capacity numbers are worked from stated assumptions.

## 1. Why This Even Matters — A Story First

You lose your dog in a big city and call the police. A bad dispatcher reads the list of every officer in the city and asks each one "how far are you from 5th and Main?" A good dispatcher looks at the city map, which is divided into numbered districts, and radios only the officers in your district and the districts that touch it.

That is the whole trick behind "nearby drivers". The bad dispatcher is a **full scan**: correct, but the work grows with the size of the city. The good dispatcher uses a **spatial index**: the map is cut into cells ahead of time, every driver is filed under a cell, and a query looks only at a handful of cells. The hard parts are choosing the cell size, not missing drivers who sit just across a cell border, and keeping the index correct while millions of drivers move every few seconds.

📌 **Interview term: proximity search** — given a point, find the objects within a radius R (or the K nearest). Also called a radius query or nearest-neighbour search.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How many active drivers, and how often do they report? | Sets the write rate, which is the dominant load |
| Peak ride requests per second? | Sets the read rate; usually far smaller than writes |
| Radius, or K nearest? Straight-line or road distance? | Decides cell size, and whether a routing ETA step follows |
| Display only, or also dispatch? | Dispatch needs availability state and a lock so two riders do not get one driver |
| How stale may a position be? | Decides the TTL and whether we can drop updates under load |
| One city or global? | Decides how we shard: by region is natural |

## 3. Requirements

**Functional**
- Drivers send \`(driver_id, lat, lon, status)\` every 4 seconds while online.
- A rider asks for available drivers within R (default 1 km), nearest first, up to 20.
- A driver that stops reporting disappears from results within about 30 seconds.

**Non-functional**
- Query latency under about 50 ms at the 99th percentile; it runs again every few seconds while the rider watches the map.
- Positions at most a few seconds old; losing one update is fine because the next one arrives in 4 seconds.
- Scale: the assumptions below.

## 4. Capacity Estimate

| Input (assumption) | Value |
| :--- | :--- |
| Online drivers at global peak | 5 million |
| Report interval | 4 s |
| Update size on the wire | about 100 bytes |
| Trips per day | 30 million |
| Peak factor over the daily average | 3x |
| Memory per driver in a Redis GEO set | 109 bytes, measured on Redis 7.0.15 with 1 million 14-character member names |

Arithmetic:

- **Writes:** 5,000,000 / 4 s = **1.25 million updates/s**, about **125 MB/s** of ingress.
- **Reads:** 30,000,000 trips / 86,400 s = **347 requests/s** on average, about **1,042/s** at peak. Even if every open app re-queries every 5 seconds and there are 10x more lookers than bookers, reads are in the tens of thousands per second: still well under the write rate.
- **Memory:** 5,000,000 x 109 bytes = **0.55 GB**. The whole planet of positions fits in RAM on one machine; the problem is the write rate, not the size.

The lesson for the interview: this is a **write-heavy, tiny-dataset** system. Disk databases are the wrong home for the live positions; keep them in memory, sharded for write throughput, and send a sampled copy to durable storage for analytics. The method is in [back-of-the-envelope capacity estimation](/interview-question/how-do-you-approach-back-of-the-envelope-capacity-estimation).

## 5. API

~~~text
PUT  /v1/drivers/{id}/location     { lat, lon, heading, speed, status, ts }   -> 204
GET  /v1/nearby-drivers?lat=37.76&lon=-122.44&radius_m=1000&limit=20
     -> [{ driver_id, lat, lon, distance_m, eta_s }]
~~~

In practice the driver app keeps a long-lived connection (WebSocket or gRPC stream) and pushes updates over it, so the 1.25 million updates per second are not 1.25 million new HTTPS handshakes. See [WebSockets vs polling vs SSE](/interview-question/when-would-you-use-websockets-vs-polling-vs-sse).

## 6. Core Idea: Cut the Map Into Cells

**Geohash** turns a latitude and longitude into a short string. It halves the world again and again: first by longitude (east or west half?), then by latitude (north or south half?), alternating, and writes one bit per halving. Every 5 bits become one base-32 character. Each extra character makes the cell 32 times smaller, and **two points that share a prefix are in the same cell**.

📌 **Interview term: geohash** — a hierarchical encoding of a point as a base-32 string where each prefix names a rectangle. Precision (string length) chooses the cell size. Neighbouring cells usually share a prefix, but not always: two points a metre apart can sit on opposite sides of a cell boundary with completely different hashes.

The example checks the encoder against the standard test point and prints cell sizes at San Francisco latitude:

~~~text
geohash(57.64911, 10.40744, 11) = u4pruydqqvj
precision  cell height km  cell width km (at lat 37.76)
  4          19.546          30.905
  5          4.886          3.863
  6          0.611          0.966
  7          0.153          0.121
~~~

So precision 6 is about 0.6 km tall and 1 km wide here, and precision 5 is about 4.9 km by 3.9 km. (Cells are narrower east to west as you move away from the equator, because lines of longitude converge.) Redis agreed: \`GEOHASH\` of the rider point returned \`9q8yvcczvn0\`, whose first 6 characters \`9q8yvc\` are the rider cell the example computes.

📌 **Interview term: spatial index** — any structure that files objects by location so a query reads only nearby entries: a uniform grid, geohash cells, a quadtree, an R-tree, or a hexagon grid such as H3.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 330" role="img" aria-label="A three by three block of geohash cells; the rider sits in the centre cell; a search circle crosses into the neighbour cells; the query reads all nine cells and then filters by exact distance">
  <rect class="d-box-muted" x="140" y="20" width="120" height="90"/>
  <rect class="d-box-muted" x="260" y="20" width="120" height="90"/>
  <rect class="d-box-muted" x="380" y="20" width="120" height="90"/>
  <rect class="d-box-muted" x="140" y="110" width="120" height="90"/>
  <rect class="d-box-accent" x="260" y="110" width="120" height="90"/>
  <rect class="d-box-muted" x="380" y="110" width="120" height="90"/>
  <rect class="d-box-muted" x="140" y="200" width="120" height="90"/>
  <rect class="d-box-muted" x="260" y="200" width="120" height="90"/>
  <rect class="d-box-muted" x="380" y="200" width="120" height="90"/>
  <circle class="d-edge-accent" cx="320" cy="155" r="80" fill="none"/>
  <circle class="d-accent" cx="320" cy="155" r="7"/>
  <text class="d-text" x="320" y="185" text-anchor="middle">rider</text>
  <text class="d-sub" x="200" y="60" text-anchor="middle">neighbour</text>
  <text class="d-sub" x="440" y="60" text-anchor="middle">neighbour</text>
  <text class="d-sub" x="200" y="250" text-anchor="middle">neighbour</text>
  <text class="d-sub" x="440" y="250" text-anchor="middle">neighbour</text>
  <text class="d-sub" x="320" y="135" text-anchor="middle">rider cell</text>
</svg>

The rider cell alone would miss every driver inside the circle but across a border, which is why the query always reads the 3x3 block. The 3x3 block is only enough when the radius is no larger than one cell; otherwise the circle spills past the outer ring.

## 7. The Query: Cell Plus Eight Neighbours, Then Filter

The example puts 10,000 drivers in a 13 km by 14 km box over San Francisco, files them by precision-6 geohash, and asks for drivers near a rider in three ways:

~~~text
drivers 10000, non-empty precision-6 cells 347
rider cell 9q8yvc
radius 0.5 km:
  full scan      checked 10000  found 34
  own cell only  checked 24  found 12
  cell + 8 nbrs  checked 280  found 34
  nearest 3: driver 7365 at 23 m, driver 3700 at 27 m, driver 2809 at 172 m
radius 1.5 km:
  full scan      checked 10000  found 359
  own cell only  checked 24  found 24
  cell + 8 nbrs  checked 280  found 236
~~~

What the numbers say:

- **Full scan** computed 10,000 distances to find 34 drivers. That is the cost that grows with the city.
- **Own cell only** read 24 drivers and found **12 of 34**: 22 nearby drivers were across a border. Prefix-only lookup is the classic wrong answer.
- **Cell plus 8 neighbours** read **280** drivers (2.8% of the city) and found **all 34**, sorted by exact distance.
- At **1.5 km** the same precision-6 block found only **236 of 359**: the radius is bigger than a cell (0.611 km tall), so the circle reaches past the 3x3 block. Fix it by dropping to precision 5 for that query, or by covering the circle with as many precision-6 cells as it touches.

📌 **Interview term: candidate set + exact filter** — the index returns a superset of the answer cheaply (the 9 cells), then an exact distance check (haversine, great-circle distance) removes false positives. Every spatial index works in these two steps.

📌 **Interview term: haversine distance** — the great-circle distance between two latitude/longitude points, treating Earth as a sphere, which is accurate enough for a radius filter; road distance and ETA need a routing engine on top (see [designing Google Maps](/interview-question/how-would-you-design-google-maps-572l)).

## 8. High-Level Architecture

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="Driver apps stream locations to a location gateway, which writes to location shards keyed by region; rider apps call a nearby service that reads the shards for the rider cell and neighbours; a matching service reserves a driver; a stream copies updates to analytics">
  <defs>
    <marker id="sd17q1-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="30" width="130" height="56" rx="10"/>
  <text class="d-text" x="85" y="63" text-anchor="middle">driver apps</text>
  <rect class="d-box" x="220" y="30" width="150" height="56" rx="10"/>
  <text class="d-text" x="295" y="55" text-anchor="middle">location</text>
  <text class="d-sub" x="295" y="74" text-anchor="middle">gateway</text>
  <rect class="d-box-accent" x="440" y="110" width="170" height="76" rx="10"/>
  <text class="d-text" x="525" y="140" text-anchor="middle">location shards</text>
  <text class="d-sub" x="525" y="162" text-anchor="middle">in memory, by region</text>
  <rect class="d-box-muted" x="20" y="230" width="130" height="56" rx="10"/>
  <text class="d-text" x="85" y="263" text-anchor="middle">rider apps</text>
  <rect class="d-box" x="220" y="230" width="150" height="56" rx="10"/>
  <text class="d-text" x="295" y="255" text-anchor="middle">nearby</text>
  <text class="d-sub" x="295" y="274" text-anchor="middle">service</text>
  <rect class="d-box" x="440" y="250" width="170" height="56" rx="10"/>
  <text class="d-text" x="525" y="275" text-anchor="middle">matching</text>
  <text class="d-sub" x="525" y="294" text-anchor="middle">reserve a driver</text>
  <rect class="d-box-muted" x="640" y="30" width="110" height="56" rx="10"/>
  <text class="d-text" x="695" y="55" text-anchor="middle">stream</text>
  <text class="d-sub" x="695" y="74" text-anchor="middle">analytics</text>
  <path class="d-edge" d="M 150 58 L 214 58" marker-end="url(#sd17q1-arrow)"/>
  <path class="d-edge-accent" d="M 370 70 L 436 120" marker-end="url(#sd17q1-arrow)"/>
  <path class="d-edge-dashed" d="M 370 50 L 634 50" marker-end="url(#sd17q1-arrow)"/>
  <path class="d-edge" d="M 150 258 L 214 258" marker-end="url(#sd17q1-arrow)"/>
  <path class="d-edge" d="M 370 248 L 436 176" marker-end="url(#sd17q1-arrow)"/>
  <path class="d-edge" d="M 370 272 L 434 276" marker-end="url(#sd17q1-arrow)"/>
</svg>

Writes flow along the top: driver apps stream positions to a gateway that routes each update to the shard owning that region. Reads flow along the bottom: the nearby service computes the rider cell and its neighbours, reads them from the shard (or two shards near a region border), filters by distance, and asks a routing service for ETAs of the closest few. Dispatch is a separate step that atomically reserves one driver.

**Where the positions live — two common choices:**

| Option | How | Good | Watch out |
| :--- | :--- | :--- | :--- |
| **Redis GEO** | \`GEOADD drivers:sf lon lat id\`, then \`GEOSEARCH ... BYRADIUS 1 km ASC COUNT 20\` | Built-in radius query; 109 bytes per driver measured | A geo set is one sorted set, so one key lives on one shard: split by city or by geohash prefix |
| **In-process grid** in a location service | \`Map<cell, Set<driverId>>\` plus \`Map<driverId, position>\` per shard | No network hop per update; full control over cell size | You write replication and failover yourself |

Facts checked for this table: Redis interleaves latitude and longitude bits into a 52-bit integer used as the sorted-set score (Redis \`GEOADD\` docs); \`GEOSEARCH\` is available since Redis 6.2.0 (\`COMMAND DOCS\` on Redis 7.0.15) and \`GEORADIUS\` is deprecated in its favour (Redis docs). Expiry is per key, not per member, so stale drivers in a geo set must be removed by the application (for example a sweeper keyed on a last-seen sorted set).

## 9. Deep Dive 1: The Write Path

The run moved every driver up to about 100 m in one 4-second tick:

~~~text
one 4-second tick: 10000 position writes, 1296 changed cell (13.0%)
~~~

**87% of updates stay in the same cell**, so most writes only overwrite a position; 13% must also move the driver between cell lists. Ways to survive 1.25 million writes per second:

- **Shard by geography.** A city is a natural unit; big cities split by geohash prefix. A driver crossing a shard border is a delete on one shard and an insert on the other.
- **Overwrite, never append.** Only the latest position matters for search; keep history in a separate stream (Kafka or similar) sampled for analytics and trip records.
- **Drop and coalesce under load.** If a shard falls behind, keep only the newest update per driver; an old position is worthless once a newer one exists.
- **TTL by last-seen.** A driver whose app died must vanish: keep \`last_seen\` per driver and filter out anything older than about 30 seconds at query time, with a background sweep.

## 10. Deep Dive 2: Geohash vs Quadtree vs H3

| Index | Shape | Strength | Weakness |
| :--- | :--- | :--- | :--- |
| Uniform grid / geohash | Rectangles, fixed size per precision | Trivial to compute, a string or integer key, works in any key-value store | Same cell size downtown and in the desert; border effects; cells distort near the poles |
| Quadtree | Squares split when they hold too many points | Adapts to density: small cells downtown, big ones in the countryside | A tree to keep balanced while points move; harder to shard |
| H3 (hexagons) | Hexagons at many resolutions | All 6 neighbours are the same distance away, which suits pricing and supply-demand heat maps | Needs the H3 library; hexagons do not nest perfectly |

Uber built H3, a hexagonal hierarchical grid, for ride pricing, dispatch and analysis, and open-sourced it; its index is a 64-bit integer (Uber Engineering blog, "H3: Uber's Hexagonal Hierarchical Spatial Index", 2018). Whatever the grid, the query shape is the same as in Section 7: candidate cells, then an exact filter.

📌 **Interview term: quadtree** — a tree where each node covers a square and splits into four children when it holds more than a threshold of points. Dense areas get deep, small cells.

## 11. Deep Dive 3: From "Nearby" to "Dispatch"

Showing cars on a map tolerates staleness and duplicates. Assigning one driver to one rider does not:

- Rank the candidates by **ETA** (road time from the routing service), not straight-line distance: a driver 300 m away across a river may be 10 minutes away.
- **Reserve atomically**: a compare-and-set on the driver status (\`available\` to \`offered\`, with a short expiry) so two concurrent requests cannot both take the same driver. See [optimistic vs pessimistic locking](/interview-question/what-is-the-difference-between-optimistic-and-pessimistic-locking).
- Offer to one driver at a time with a timeout, then move to the next candidate.

## 12. What Breaks First at 10x

At 50 million drivers (12.5 million updates/s) and 10x the riders:
- **Write throughput per shard** breaks first. Split hot cities into more geohash-prefix shards; an airport cell with thousands of waiting drivers may need its own shard or a queue-based "airport lot" model instead of radius search.
- **Cross-border queries**: more shards means more queries that touch two or more shards; route the query by its 9 cells and merge.
- **Fan-out from the gateway**: 12.5 million updates per second need many gateway nodes holding long-lived connections; see [scaling WebSockets](/interview-question/how-do-you-scale-websockets-to-1m-connections-with-redis-pub-sub).
- **Memory** is still small: 50 million x 109 bytes = 5.45 GB across the cluster.

## 13. Verified: Running the Code

The example **"Geohash proximity search on 10,000 drivers: full scan vs own cell vs cell plus 8 neighbours, the radius trap, and cell churn"** was run with \`node main.js\` (Node 22.22), \`python3.12 main.py\`, \`go run main.go\` (Go 1.24) and Java 21. All four print exactly this:

~~~text
geohash(57.64911, 10.40744, 11) = u4pruydqqvj
precision  cell height km  cell width km (at lat 37.76)
  4          19.546          30.905
  5          4.886          3.863
  6          0.611          0.966
  7          0.153          0.121
drivers 10000, non-empty precision-6 cells 347
rider cell 9q8yvc
radius 0.5 km:
  full scan      checked 10000  found 34
  own cell only  checked 24  found 12
  cell + 8 nbrs  checked 280  found 34
  nearest 3: driver 7365 at 23 m, driver 3700 at 27 m, driver 2809 at 172 m
radius 1.5 km:
  full scan      checked 10000  found 359
  own cell only  checked 24  found 24
  cell + 8 nbrs  checked 280  found 236
one 4-second tick: 10000 position writes, 1296 changed cell (13.0%)
~~~

What the simulation stands for and what it leaves out: the index is an in-process \`Map\` from geohash cell to driver ids, standing for one location shard (or a Redis geo set). Driver positions come from a seeded random generator, so every run is identical. Neighbour cells are found by encoding points one cell-height or cell-width away, which is correct away from the poles and the 180th meridian; production code uses a library that handles both. There is no network, replication, TTL or concurrency.

## Edge Cases Worth Knowing

- **The 180th meridian and the poles**: neighbour cells wrap; use a tested geohash or H3 library rather than hand-rolled arithmetic.
- **Empty areas**: in the countryside a 1 km radius returns nothing; widen the radius step by step (or use K-nearest with an expanding ring of cells) instead of returning an empty list.
- **GPS noise**: positions jump in tunnels and between tall buildings; snap to roads (map matching) before using them for ETA.
- **Driver status**: index only \`available\` drivers in the search set, or filter by status before the distance check, so busy drivers do not crowd out free ones in the top 20.
- **Clock and ordering**: an update that arrives late must not overwrite a newer one; compare the device timestamp or a sequence number before writing.

## Common Pitfalls

- **Prefix-only lookup** — in the run the rider cell alone found 12 of 34 nearby drivers; always read the neighbours.
- **Cell smaller than the radius** — precision 6 with a 1.5 km radius found 236 of 359; pick precision from the radius.
- **Storing live positions in a disk database** — 1.25 million updates per second of data that is overwritten every 4 seconds belongs in memory.
- **One giant Redis geo key** — a key lives on one shard; split by city or geohash prefix.
- **Straight-line distance for dispatch** — rank by road ETA, and reserve the driver atomically.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Scope:</strong> <span style="color:#f0e2c8;">I ask for driver count, report interval, peak ride requests, radius or K-nearest, and whether this is display or dispatch. Then I point out that the data is tiny but the <strong style="color:#ffca28;">write rate</strong> is huge: 5 million drivers every 4 seconds is <strong style="color:#ffca28;">1.25 million updates per second</strong> and only about 0.55 GB of state.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Index:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">spatial index</strong>: I file drivers by <strong style="color:#ffca28;">geohash</strong> cell (or H3 hexagon), sized so a cell is at least the search radius — precision 6 is about 0.6 by 1 km at San Francisco latitude.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Query:</strong> <span style="color:#f0e2c8;">Read the rider cell <strong style="color:#ffca28;">plus its 8 neighbours</strong>, then filter by exact haversine distance and sort. In my run that read 280 of 10,000 drivers and found all 34 within 500 m; the rider cell alone found only 12.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Storage and scale:</strong> <span style="color:#f0e2c8;">Positions live in memory — Redis GEO or a location service — <strong style="color:#ffca28;">sharded by region</strong>, overwrite-only, with a last-seen TTL. History goes to a stream for analytics. Only 13% of updates change cell, so most writes are in-place.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Dispatch and 10x:</strong> <span style="color:#f0e2c8;">Rank the top candidates by road <strong style="color:#ffca28;">ETA</strong>, reserve one driver with a compare-and-set. At 10x the per-shard write rate breaks first, so I split hot cities by geohash prefix and give airports special handling.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use PostGIS with a spatial index?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">PostGIS answers radius queries well, but here every row is rewritten every 4 seconds: 1.25 million updates per second of index churn and WAL on disk. It is a fine home for slow-changing places; live positions belong in memory.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you pick the geohash precision?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">From the radius: the cell must be at least as tall and wide as the radius so the 3x3 block covers the circle. For a 500 m search at San Francisco latitude precision 6 works (0.611 km tall); for 1.5 km it missed a third of the drivers, so use precision 5 or cover the circle with more cells.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if no driver is within the radius?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Expand in rings: try the 3x3 block, then 5x5, or drop one precision level, until enough candidates appear or a maximum radius is reached. That turns a radius query into an approximate K-nearest query.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Geohash or H3?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Geohash is a string prefix that works in any key-value store and is easy to shard. H3 hexagons have equal-distance neighbours, which helps pricing and heat maps; Uber built it for that. For a pure radius search either works with the same candidate-then-filter query.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a driver crossing a shard border?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The gateway routes each update by cell, so the update goes to the new shard, and the old shard deletes the driver (or it expires by last-seen). Queries near a border read both shards and merge.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Proximity search | Find objects within a radius of a point, or the K nearest |
| Geohash | Base-32 string encoding of a point; each prefix is a rectangle |
| Spatial index | A structure that files objects by location so queries read only nearby entries |
| Candidate set + exact filter | Cheap superset from the index, then an exact distance check |
| Haversine distance | Great-circle distance between two latitude/longitude points |
| Quadtree | A tree of squares that split when they hold too many points |

**Conclusion:** Nearby-driver search is a write-heavy problem on a tiny dataset: 5 million drivers reporting every 4 seconds is 1.25 million updates per second but only about half a gigabyte of state, so positions live in memory, sharded by region, overwritten in place and expired by last-seen. Reads use a spatial index — geohash, H3 or a quadtree — with a candidate-then-filter query: the rider cell plus its 8 neighbours, then exact distance. The run showed why each detail matters: the rider cell alone found 12 of 34 drivers, the 3x3 block found all 34 while reading 2.8% of the city, and a radius larger than the cell missed a third. Ranking by road ETA and reserving one driver atomically turns "nearby" into dispatch.`,
    examples: [
      {
        label: `Geohash proximity search on 10,000 drivers: full scan vs own cell vs cell plus 8 neighbours, the radius trap, and cell churn`,
        variants: [
          { tech: "node", code: `// Proximity search: geohash grid index vs full scan, on 10,000 simulated drivers.
const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
let seed = 42;
function rand() { seed = (seed * 48271) % 2147483647; return seed / 2147483647; }

function encode(lat, lon, precision) {
  let latLo = -90, latHi = 90, lonLo = -180, lonHi = 180;
  let hash = "", bits = 0, ch = 0, even = true;
  while (hash.length < precision) {
    if (even) { const mid = (lonLo + lonHi) / 2; if (lon >= mid) { ch = ch * 2 + 1; lonLo = mid; } else { ch = ch * 2; lonHi = mid; } }
    else { const mid = (latLo + latHi) / 2; if (lat >= mid) { ch = ch * 2 + 1; latLo = mid; } else { ch = ch * 2; latHi = mid; } }
    even = !even;
    if (++bits === 5) { hash += BASE32[ch]; bits = 0; ch = 0; }
  }
  return hash;
}
function cellSize(precision) { // degrees of latitude and longitude covered by one cell
  const lonBits = Math.ceil(precision * 5 / 2), latBits = Math.floor(precision * 5 / 2);
  return [180 / 2 ** latBits, 360 / 2 ** lonBits];
}
function haversineKm(lat1, lon1, lat2, lon2) {
  const r = Math.PI / 180, dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}
function neighbours(lat, lon, p) { // the cell of (lat, lon) plus the 8 around it
  const [h, w] = cellSize(p), out = [];
  for (const dy of [-1, 0, 1]) for (const dx of [-1, 0, 1]) {
    const c = encode(lat + dy * h, lon + dx * w, p);
    if (!out.includes(c)) out.push(c);
  }
  return out;
}

console.log("geohash(57.64911, 10.40744, 11) = " + encode(57.64911, 10.40744, 11));
console.log("precision  cell height km  cell width km (at lat 37.76)");
for (const p of [4, 5, 6, 7]) {
  const [h, w] = cellSize(p);
  console.log("  " + p + "          " + haversineKm(37.76, -122.44, 37.76 + h, -122.44).toFixed(3) +
    "          " + haversineKm(37.76, -122.44, 37.76, -122.44 + w).toFixed(3));
}

const N = 10000, P = 6, drivers = [], index = new Map();
for (let i = 0; i < N; i++) drivers.push([37.70 + 0.12 * rand(), -122.52 + 0.16 * rand()]);
function add(id) { const c = encode(drivers[id][0], drivers[id][1], P); if (!index.has(c)) index.set(c, []); index.get(c).push(id); return c; }
const cellOf = drivers.map((_, i) => add(i));
console.log("drivers " + N + ", non-empty precision-6 cells " + index.size);

const rider = [37.7600, -122.4400];
console.log("rider cell " + encode(rider[0], rider[1], P));
function search(cells, radiusKm) {
  let checked = 0; const found = [];
  for (const c of cells) for (const id of index.get(c) || []) {
    checked++;
    const d = haversineKm(rider[0], rider[1], drivers[id][0], drivers[id][1]);
    if (d <= radiusKm) found.push([d, id]);
  }
  found.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return [checked, found];
}
for (const radius of [0.5, 1.5]) {
  const all = [];
  for (let id = 0; id < N; id++) all.push(id);
  let checked = 0; const truth = [];
  for (const id of all) { checked++; const d = haversineKm(rider[0], rider[1], drivers[id][0], drivers[id][1]); if (d <= radius) truth.push([d, id]); }
  truth.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const [c1, f1] = search([encode(rider[0], rider[1], P)], radius);
  const [c9, f9] = search(neighbours(rider[0], rider[1], P), radius);
  console.log("radius " + radius.toFixed(1) + " km:");
  console.log("  full scan      checked " + checked + "  found " + truth.length);
  console.log("  own cell only  checked " + c1 + "  found " + f1.length);
  console.log("  cell + 8 nbrs  checked " + c9 + "  found " + f9.length);
  if (radius === 0.5) console.log("  nearest 3: " + f9.slice(0, 3).map(([d, id]) => "driver " + id + " at " + Math.floor(d * 1000) + " m").join(", "));
}

let moved = 0;
for (let id = 0; id < N; id++) {
  drivers[id][0] += (rand() - 0.5) * 0.0018; // up to about 100 m north or south
  drivers[id][1] += (rand() - 0.5) * 0.0022; // up to about 100 m east or west
  const c = encode(drivers[id][0], drivers[id][1], P);
  if (c !== cellOf[id]) { moved++; const list = index.get(cellOf[id]); list.splice(list.indexOf(id), 1); if (!index.has(c)) index.set(c, []); index.get(c).push(id); cellOf[id] = c; }
}
console.log("one 4-second tick: " + N + " position writes, " + moved + " changed cell (" + (100 * moved / N).toFixed(1) + "%)");` },
          { tech: "python", code: `# Proximity search: geohash grid index vs full scan, on 10,000 simulated drivers.
import math

BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz"
seed = 42


def rand():
    global seed
    seed = (seed * 48271) % 2147483647
    return seed / 2147483647


def encode(lat, lon, precision):
    lat_lo, lat_hi, lon_lo, lon_hi = -90.0, 90.0, -180.0, 180.0
    out, bits, ch, even = "", 0, 0, True
    while len(out) < precision:
        if even:
            mid = (lon_lo + lon_hi) / 2
            if lon >= mid:
                ch, lon_lo = ch * 2 + 1, mid
            else:
                ch, lon_hi = ch * 2, mid
        else:
            mid = (lat_lo + lat_hi) / 2
            if lat >= mid:
                ch, lat_lo = ch * 2 + 1, mid
            else:
                ch, lat_hi = ch * 2, mid
        even = not even
        bits += 1
        if bits == 5:
            out += BASE32[ch]
            bits, ch = 0, 0
    return out


def cell_size(p):  # degrees of latitude and longitude covered by one cell
    lon_bits, lat_bits = math.ceil(p * 5 / 2), math.floor(p * 5 / 2)
    return 180 / 2 ** lat_bits, 360 / 2 ** lon_bits


def haversine_km(lat1, lon1, lat2, lon2):
    r = math.pi / 180
    d_lat, d_lon = (lat2 - lat1) * r, (lon2 - lon1) * r
    a = math.sin(d_lat / 2) ** 2 + math.cos(lat1 * r) * math.cos(lat2 * r) * math.sin(d_lon / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(a))


def neighbours(lat, lon, p):  # the cell of (lat, lon) plus the 8 around it
    h, w = cell_size(p)
    out = []
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            c = encode(lat + dy * h, lon + dx * w, p)
            if c not in out:
                out.append(c)
    return out


print("geohash(57.64911, 10.40744, 11) = " + encode(57.64911, 10.40744, 11))
print("precision  cell height km  cell width km (at lat 37.76)")
for p in (4, 5, 6, 7):
    h, w = cell_size(p)
    print(f"  {p}          {haversine_km(37.76, -122.44, 37.76 + h, -122.44):.3f}          {haversine_km(37.76, -122.44, 37.76, -122.44 + w):.3f}")

N, P = 10000, 6
drivers, index = [], {}
for i in range(N):
    a = rand()
    b = rand()
    drivers.append([37.70 + 0.12 * a, -122.52 + 0.16 * b])


def add(i):
    c = encode(drivers[i][0], drivers[i][1], P)
    index.setdefault(c, []).append(i)
    return c


cell_of = [add(i) for i in range(N)]
print(f"drivers {N}, non-empty precision-6 cells {len(index)}")
rider = (37.7600, -122.4400)
print("rider cell " + encode(rider[0], rider[1], P))


def search(cells, radius):
    checked, found = 0, []
    for c in cells:
        for i in index.get(c, []):
            checked += 1
            d = haversine_km(rider[0], rider[1], drivers[i][0], drivers[i][1])
            if d <= radius:
                found.append((d, i))
    found.sort()
    return checked, found


for radius in (0.5, 1.5):
    checked, truth = 0, []
    for i in range(N):
        checked += 1
        d = haversine_km(rider[0], rider[1], drivers[i][0], drivers[i][1])
        if d <= radius:
            truth.append((d, i))
    c1, f1 = search([encode(rider[0], rider[1], P)], radius)
    c9, f9 = search(neighbours(rider[0], rider[1], P), radius)
    print(f"radius {radius:.1f} km:")
    print(f"  full scan      checked {checked}  found {len(truth)}")
    print(f"  own cell only  checked {c1}  found {len(f1)}")
    print(f"  cell + 8 nbrs  checked {c9}  found {len(f9)}")
    if radius == 0.5:
        print("  nearest 3: " + ", ".join(f"driver {i} at {math.floor(d * 1000)} m" for d, i in f9[:3]))

moved = 0
for i in range(N):
    drivers[i][0] += (rand() - 0.5) * 0.0018  # up to about 100 m north or south
    drivers[i][1] += (rand() - 0.5) * 0.0022  # up to about 100 m east or west
    c = encode(drivers[i][0], drivers[i][1], P)
    if c != cell_of[i]:
        moved += 1
        index[cell_of[i]].remove(i)
        index.setdefault(c, []).append(i)
        cell_of[i] = c
print(f"one 4-second tick: {N} position writes, {moved} changed cell ({100 * moved / N:.1f}%)")` },
          { tech: "go", code: `// Proximity search: geohash grid index vs full scan, on 10,000 simulated drivers.
package main

import (
	"fmt"
	"math"
	"sort"
	"strings"
)

const base32 = "0123456789bcdefghjkmnpqrstuvwxyz"

var seed int64 = 42

func rand() float64 { seed = (seed * 48271) % 2147483647; return float64(seed) / 2147483647 }

func encode(lat, lon float64, precision int) string {
	latLo, latHi, lonLo, lonHi := -90.0, 90.0, -180.0, 180.0
	var sb strings.Builder
	bits, ch, even := 0, 0, true
	for sb.Len() < precision {
		if even {
			mid := (lonLo + lonHi) / 2
			if lon >= mid {
				ch, lonLo = ch*2+1, mid
			} else {
				ch, lonHi = ch*2, mid
			}
		} else {
			mid := (latLo + latHi) / 2
			if lat >= mid {
				ch, latLo = ch*2+1, mid
			} else {
				ch, latHi = ch*2, mid
			}
		}
		even = !even
		bits++
		if bits == 5 {
			sb.WriteByte(base32[ch])
			bits, ch = 0, 0
		}
	}
	return sb.String()
}

func cellSize(p int) (float64, float64) { // degrees of latitude and longitude covered by one cell
	lonBits, latBits := (p*5+1)/2, p*5/2
	return 180 / math.Pow(2, float64(latBits)), 360 / math.Pow(2, float64(lonBits))
}

func haversineKm(lat1, lon1, lat2, lon2 float64) float64 {
	r := math.Pi / 180
	dLat, dLon := (lat2-lat1)*r, (lon2-lon1)*r
	a := math.Pow(math.Sin(dLat/2), 2) + math.Cos(lat1*r)*math.Cos(lat2*r)*math.Pow(math.Sin(dLon/2), 2)
	return 2 * 6371 * math.Asin(math.Sqrt(a))
}

func neighbours(lat, lon float64, p int) []string { // the cell of (lat, lon) plus the 8 around it
	h, w := cellSize(p)
	out := []string{}
	for _, dy := range []float64{-1, 0, 1} {
		for _, dx := range []float64{-1, 0, 1} {
			c := encode(lat+dy*h, lon+dx*w, p)
			dup := false
			for _, o := range out {
				if o == c {
					dup = true
				}
			}
			if !dup {
				out = append(out, c)
			}
		}
	}
	return out
}

type hit struct {
	d  float64
	id int
}

const N, P = 10000, 6

var drivers [N][2]float64
var index = map[string][]int{}
var rider = [2]float64{37.7600, -122.4400}

func sortHits(h []hit) {
	sort.Slice(h, func(i, j int) bool {
		if h[i].d != h[j].d {
			return h[i].d < h[j].d
		}
		return h[i].id < h[j].id
	})
}

func search(cells []string, radius float64) (int, []hit) {
	checked, found := 0, []hit{}
	for _, c := range cells {
		for _, id := range index[c] {
			checked++
			d := haversineKm(rider[0], rider[1], drivers[id][0], drivers[id][1])
			if d <= radius {
				found = append(found, hit{d, id})
			}
		}
	}
	sortHits(found)
	return checked, found
}

func main() {
	fmt.Println("geohash(57.64911, 10.40744, 11) = " + encode(57.64911, 10.40744, 11))
	fmt.Println("precision  cell height km  cell width km (at lat 37.76)")
	for _, p := range []int{4, 5, 6, 7} {
		h, w := cellSize(p)
		fmt.Printf("  %d          %.3f          %.3f\\n", p, haversineKm(37.76, -122.44, 37.76+h, -122.44), haversineKm(37.76, -122.44, 37.76, -122.44+w))
	}
	cellOf := make([]string, N)
	for i := 0; i < N; i++ {
		a := rand()
		b := rand()
		drivers[i] = [2]float64{37.70 + 0.12*a, -122.52 + 0.16*b}
		c := encode(drivers[i][0], drivers[i][1], P)
		index[c] = append(index[c], i)
		cellOf[i] = c
	}
	fmt.Printf("drivers %d, non-empty precision-6 cells %d\\n", N, len(index))
	fmt.Println("rider cell " + encode(rider[0], rider[1], P))
	for _, radius := range []float64{0.5, 1.5} {
		checked, truth := 0, []hit{}
		for id := 0; id < N; id++ {
			checked++
			d := haversineKm(rider[0], rider[1], drivers[id][0], drivers[id][1])
			if d <= radius {
				truth = append(truth, hit{d, id})
			}
		}
		c1, f1 := search([]string{encode(rider[0], rider[1], P)}, radius)
		c9, f9 := search(neighbours(rider[0], rider[1], P), radius)
		fmt.Printf("radius %.1f km:\\n", radius)
		fmt.Printf("  full scan      checked %d  found %d\\n", checked, len(truth))
		fmt.Printf("  own cell only  checked %d  found %d\\n", c1, len(f1))
		fmt.Printf("  cell + 8 nbrs  checked %d  found %d\\n", c9, len(f9))
		if radius == 0.5 {
			parts := []string{}
			for _, h := range f9[:3] {
				parts = append(parts, fmt.Sprintf("driver %d at %d m", h.id, int(math.Floor(h.d*1000))))
			}
			fmt.Println("  nearest 3: " + strings.Join(parts, ", "))
		}
	}
	moved := 0
	for id := 0; id < N; id++ {
		drivers[id][0] += (rand() - 0.5) * 0.0018 // up to about 100 m north or south
		drivers[id][1] += (rand() - 0.5) * 0.0022 // up to about 100 m east or west
		c := encode(drivers[id][0], drivers[id][1], P)
		if c != cellOf[id] {
			moved++
			old := index[cellOf[id]]
			for k, v := range old {
				if v == id {
					index[cellOf[id]] = append(old[:k], old[k+1:]...)
					break
				}
			}
			index[c] = append(index[c], id)
			cellOf[id] = c
		}
	}
	fmt.Printf("one 4-second tick: %d position writes, %d changed cell (%.1f%%)\\n", N, moved, 100*float64(moved)/N)
}` },
          { tech: "java", code: `// Proximity search: geohash grid index vs full scan, on 10,000 simulated drivers.
import java.util.*;

public class Main {
    static final String BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
    static long seed = 42;
    static double rand() { seed = (seed * 48271) % 2147483647L; return seed / 2147483647.0; }

    static String encode(double lat, double lon, int precision) {
        double latLo = -90, latHi = 90, lonLo = -180, lonHi = 180;
        StringBuilder sb = new StringBuilder();
        int bits = 0, ch = 0; boolean even = true;
        while (sb.length() < precision) {
            if (even) { double mid = (lonLo + lonHi) / 2; if (lon >= mid) { ch = ch * 2 + 1; lonLo = mid; } else { ch = ch * 2; lonHi = mid; } }
            else { double mid = (latLo + latHi) / 2; if (lat >= mid) { ch = ch * 2 + 1; latLo = mid; } else { ch = ch * 2; latHi = mid; } }
            even = !even;
            if (++bits == 5) { sb.append(BASE32.charAt(ch)); bits = 0; ch = 0; }
        }
        return sb.toString();
    }
    static double[] cellSize(int p) { // degrees of latitude and longitude covered by one cell
        int lonBits = (p * 5 + 1) / 2, latBits = p * 5 / 2;
        return new double[] {180 / Math.pow(2, latBits), 360 / Math.pow(2, lonBits)};
    }
    static double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        double r = Math.PI / 180, dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
        double a = Math.pow(Math.sin(dLat / 2), 2) + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.pow(Math.sin(dLon / 2), 2);
        return 2 * 6371 * Math.asin(Math.sqrt(a));
    }
    static List<String> neighbours(double lat, double lon, int p) { // the cell of (lat, lon) plus the 8 around it
        double[] hw = cellSize(p); List<String> out = new ArrayList<>();
        for (int dy = -1; dy <= 1; dy++) for (int dx = -1; dx <= 1; dx++) {
            String c = encode(lat + dy * hw[0], lon + dx * hw[1], p);
            if (!out.contains(c)) out.add(c);
        }
        return out;
    }
    static final int N = 10000, P = 6;
    static double[][] drivers = new double[N][2];
    static Map<String, List<Integer>> index = new HashMap<>();
    static double[] rider = {37.7600, -122.4400};
    static Comparator<double[]> byDist = (x, y) -> x[0] != y[0] ? Double.compare(x[0], y[0]) : Double.compare(x[1], y[1]);

    static int checked;
    static List<double[]> search(List<String> cells, double radius) {
        checked = 0; List<double[]> found = new ArrayList<>();
        for (String c : cells) for (int id : index.getOrDefault(c, List.of())) {
            checked++;
            double d = haversineKm(rider[0], rider[1], drivers[id][0], drivers[id][1]);
            if (d <= radius) found.add(new double[] {d, id});
        }
        found.sort(byDist);
        return found;
    }
    static String f(String fmt, Object... a) { return String.format(Locale.ROOT, fmt, a); }

    public static void main(String[] args) {
        System.out.println("geohash(57.64911, 10.40744, 11) = " + encode(57.64911, 10.40744, 11));
        System.out.println("precision  cell height km  cell width km (at lat 37.76)");
        for (int p : new int[] {4, 5, 6, 7}) {
            double[] hw = cellSize(p);
            System.out.println(f("  %d          %.3f          %.3f", p, haversineKm(37.76, -122.44, 37.76 + hw[0], -122.44), haversineKm(37.76, -122.44, 37.76, -122.44 + hw[1])));
        }
        String[] cellOf = new String[N];
        for (int i = 0; i < N; i++) {
            double a = rand(), b = rand();
            drivers[i][0] = 37.70 + 0.12 * a; drivers[i][1] = -122.52 + 0.16 * b;
            String c = encode(drivers[i][0], drivers[i][1], P);
            index.computeIfAbsent(c, k -> new ArrayList<>()).add(i);
            cellOf[i] = c;
        }
        System.out.println("drivers " + N + ", non-empty precision-6 cells " + index.size());
        System.out.println("rider cell " + encode(rider[0], rider[1], P));
        for (double radius : new double[] {0.5, 1.5}) {
            int all = 0; List<double[]> truth = new ArrayList<>();
            for (int id = 0; id < N; id++) {
                all++;
                double d = haversineKm(rider[0], rider[1], drivers[id][0], drivers[id][1]);
                if (d <= radius) truth.add(new double[] {d, id});
            }
            List<double[]> f1 = search(List.of(encode(rider[0], rider[1], P)), radius); int c1 = checked;
            List<double[]> f9 = search(neighbours(rider[0], rider[1], P), radius); int c9 = checked;
            System.out.println(f("radius %.1f km:", radius));
            System.out.println("  full scan      checked " + all + "  found " + truth.size());
            System.out.println("  own cell only  checked " + c1 + "  found " + f1.size());
            System.out.println("  cell + 8 nbrs  checked " + c9 + "  found " + f9.size());
            if (radius == 0.5) {
                List<String> parts = new ArrayList<>();
                for (double[] h : f9.subList(0, 3)) parts.add("driver " + (int) h[1] + " at " + (long) Math.floor(h[0] * 1000) + " m");
                System.out.println("  nearest 3: " + String.join(", ", parts));
            }
        }
        int moved = 0;
        for (int id = 0; id < N; id++) {
            drivers[id][0] += (rand() - 0.5) * 0.0018; // up to about 100 m north or south
            drivers[id][1] += (rand() - 0.5) * 0.0022; // up to about 100 m east or west
            String c = encode(drivers[id][0], drivers[id][1], P);
            if (!c.equals(cellOf[id])) {
                moved++;
                index.get(cellOf[id]).remove(Integer.valueOf(id));
                index.computeIfAbsent(c, k -> new ArrayList<>()).add(id);
                cellOf[id] = c;
            }
        }
        System.out.println(f("one 4-second tick: %d position writes, %d changed cell (%.1f%%)", N, moved, 100.0 * moved / N));
    }
}` },
        ],
      },
    ],
  },
  {
    title: `How would you design Nearby Friends?`,
    difficulty: "hard",
    seoDescription: `Design Nearby Friends: opt-in location sharing, per-user pub/sub channels over WebSockets, receiver-side distance filter, TTL cache, 13M deliveries/s.`,
    description: `**Question presented to candidate:**
"We want a 'Nearby Friends' feature: if you opt in, you see which of your friends are within about 5 km, with the distance, and the list updates live while the app is open. Walk me through how location updates get from one phone to the right friends, and how you keep it fast and private at a hundred million daily users."

**What a strong answer should cover:**
- The difference from a driver search: the audience is **your friends**, not everyone nearby, so the core is **fan-out over the social graph**, not a geo index
- Clients hold a **WebSocket**; each update is written to a **location cache with a TTL** and published to the user's **pub/sub channel**; WebSocket servers subscribe to the channels of each connected user's friends
- **Distance filtering at the receiving side** (most deliveries are dropped: 3.9% passed in the example), and why that is cheaper than indexing
- Capacity: about **333,000 updates/s** and **13 million pub/sub deliveries/s** under the stated assumptions; sharding pub/sub channels across many nodes
- Privacy and lifecycle: explicit opt-in, both sides must share, coarse distance, location history kept separately or not at all, TTL so a closed app disappears
- The optional "nearby strangers" extension, which does need a geo index

**Clarifying questions expected:**
- How many daily users, how many friends on average, and how often does a moving phone report?
- Do we show exact positions or only "1.2 km away"? Do we keep location history?
- Must both friends opt in, and should the list be live or refreshed on open?

**Code / implementation expected:** Optional — the design with numbers; the example simulates per-user channels, fan-out and the receiver-side filter.`,
    answer: `**Target Audience:** Developers preparing for system design interviews. You know what a cache and a WebSocket are; the geo indexing side is covered on the sibling page about nearby drivers.
**Difficulty:** Hard
**Verified with:** Node 22.22 and Python 3.12 (both print identical output).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All behaviour shown comes from running the example; the **Verified** section quotes the full output. Capacity numbers are worked from stated assumptions.

## 1. Why This Even Matters — A Story First

Imagine a group chat where every friend who has the app open posts "I am at the corner of 5th and Main" every 30 seconds. Your phone reads every message and quietly shows only the friends who are within 5 km. Nobody needs a map of the whole city indexed by location: you only care about your own 400 friends, and you have their messages anyway.

That is the right mental model for Nearby Friends, and it is different from [nearby drivers](/interview-question/how-would-you-design-a-nearby-drivers-proximity-search). A rider wants *anyone* nearby, so the system needs a spatial index over all drivers. Here the set of people you might see is fixed by the friend graph and small, so the system is a **fan-out** problem: deliver each location update to the friends who are online, and let the receiving side decide whether the friend is close enough to show.

📌 **Interview term: fan-out** — sending one event to many recipients. Here one location update goes to each online friend of the sender; the number of deliveries is updates per second times online friends per user.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Daily users, share who opt in, peak concurrent users? | Sets connections and update rate |
| Average and maximum friends per user? | Sets the fan-out per update, and the worst case (celebrities) |
| Update interval while moving, and while still? | The biggest lever on load |
| Radius, and do we show distance or exact position? | Decides precision and privacy |
| Live list while open, or refresh on open? | Live needs WebSockets and pub/sub; refresh needs only a cache read |
| Location history for later features? | Changes storage and privacy obligations |

## 3. Requirements

**Functional**
- Opt in or out at any time; both friends must share to see each other.
- While the app is open, see friends within 5 km with the distance and when it was last updated, refreshed live.
- A friend who stops sharing or closes the app drops off within about 10 minutes.

**Non-functional**
- An update reaches friends within a few seconds.
- Location is personal data: never exposed to non-friends, encrypted in transit, short retention.
- Losing an update is acceptable; the next one comes in 30 seconds.

## 4. Capacity Estimate

| Input (assumption) | Value |
| :--- | :--- |
| Daily active users of the feature | 100 million |
| Concurrent at peak | 10% = 10 million connections |
| Update interval | 30 s |
| Friends per user | 400 on average, of which 10% are online and sharing = 40 receivers |
| Connections per WebSocket server | 100,000 (an assumption to load-test) |
| Location cache entry | about 100 bytes |

Arithmetic:

- **Updates:** 10,000,000 / 30 s = **333,333 updates/s**.
- **Pub/sub deliveries:** 333,333 x 40 = **13.3 million deliveries/s**. This is the number that sizes the system.
- **WebSocket servers:** 10,000,000 / 100,000 = **100 servers**.
- **Location cache:** 10 million entries x about 100 bytes = **about 1 GB**: small.

In the example (2,000 users, about 25 friends each, 30% online), one round of 597 updates became 4,470 deliveries, and only 174 of them, **3.9%**, passed the 5 km filter. Most of the delivery work is spent telling a phone about a friend it will not show. That is the cost the design accepts in exchange for not maintaining a geo index; Section 9 discusses when to switch.

## 5. API

~~~text
WebSocket /v1/nearby
  client -> server  { type: "location", lat, lon, ts }          every 30 s while moving
  server -> client  { type: "friend_location", friend_id, distance_m, ts }
  server -> client  { type: "friend_gone", friend_id }

PUT /v1/nearby/settings   { sharing: true | false }
GET /v1/nearby/friends    -> initial list on open (from the location cache)
~~~

## 6. High-Level Architecture

<svg class="iq-diagram" width="100%" viewBox="0 0 760 320" role="img" aria-label="Phone A sends a location over a WebSocket server; the server writes the location cache with a TTL and publishes on channel A in the pub/sub cluster; the WebSocket servers of A friends are subscribed to channel A, compute distance and push to friend phones">
  <defs>
    <marker id="sd17q2-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="120" width="110" height="56" rx="10"/>
  <text class="d-text" x="75" y="153" text-anchor="middle">phone A</text>
  <rect class="d-box" x="190" y="120" width="140" height="56" rx="10"/>
  <text class="d-text" x="260" y="145" text-anchor="middle">WebSocket</text>
  <text class="d-sub" x="260" y="164" text-anchor="middle">server 1</text>
  <rect class="d-box" x="190" y="240" width="140" height="56" rx="10"/>
  <text class="d-text" x="260" y="265" text-anchor="middle">location cache</text>
  <text class="d-sub" x="260" y="284" text-anchor="middle">TTL 10 min</text>
  <rect class="d-box-accent" x="390" y="120" width="150" height="56" rx="10"/>
  <text class="d-text" x="465" y="145" text-anchor="middle">pub/sub</text>
  <text class="d-sub" x="465" y="164" text-anchor="middle">channel A</text>
  <rect class="d-box" x="600" y="40" width="140" height="56" rx="10"/>
  <text class="d-text" x="670" y="65" text-anchor="middle">WebSocket</text>
  <text class="d-sub" x="670" y="84" text-anchor="middle">server 2: filter</text>
  <rect class="d-box" x="600" y="200" width="140" height="56" rx="10"/>
  <text class="d-text" x="670" y="225" text-anchor="middle">WebSocket</text>
  <text class="d-sub" x="670" y="244" text-anchor="middle">server 3: filter</text>
  <path class="d-edge" d="M 130 148 L 184 148" marker-end="url(#sd17q2-arrow)"/>
  <path class="d-edge" d="M 260 176 L 260 234" marker-end="url(#sd17q2-arrow)"/>
  <path class="d-edge-accent" d="M 330 148 L 384 148" marker-end="url(#sd17q2-arrow)"/>
  <path class="d-edge-accent" d="M 540 136 L 596 78" marker-end="url(#sd17q2-arrow)"/>
  <path class="d-edge-accent" d="M 540 160 L 596 218" marker-end="url(#sd17q2-arrow)"/>
</svg>

Phone A sends its position to the WebSocket server it is connected to. That server writes A to the location cache with a TTL and publishes on channel A. Every WebSocket server holding a connection for one of A's friends is subscribed to channel A; it computes the distance between A and that friend and pushes only if A is within the radius.

📌 **Interview term: pub/sub channel per user** — each user has a channel named by their id; publishers do not know who listens, and subscribers (the WebSocket servers of online friends) join and leave as connections come and go. Channel-per-user turns "send to my online friends" into one publish. The general pattern is on the [publish-subscribe page](/interview-question/what-is-the-publish-subscribe-pattern).

📌 **Interview term: receiver-side filtering** — the distance check happens on the subscriber, which knows both positions (its own user and the incoming friend), so the publisher never needs to know who is near.

**Connection lifecycle**

1. User connects; the WebSocket server loads the friend list (cached from the social-graph service), keeps only friends who share, and **subscribes to each friend's channel**. In the example the 597 online users opened **15,128** subscriptions.
2. It reads those friends' entries from the location cache to build the initial list (no waiting 30 seconds for the first updates).
3. On each update from its own user: write the cache, publish to the user's channel.
4. On each message from a friend channel: compute distance, push or drop.
5. On disconnect: unsubscribe from all friend channels; the user's own cache entry expires by TTL.

## 7. Deep Dive 1: The Fan-Out, Run

~~~text
users 2000, avg friends 25.4, online 597
channel subscriptions opened by the online users: 15128
one 30 s round: published 597, pub/sub deliveries 4470, pushed to phones 174 (3.9% pass the 5 km filter)
deliveries per WebSocket server: 1075 1214 1056 1125
~~~

- Each update was delivered to the online friends of its sender: **4,470 deliveries for 597 updates**, about 7.5 per update with 25 friends and 30% online. With the production assumption of 40 online friends that ratio becomes 40.
- Deliveries spread evenly over the 4 WebSocket servers (1,056 to 1,214), because users are assigned to servers independently of their friends. That is good for balance and bad for locality: almost every delivery crosses the network from the pub/sub node to some server.
- Only **3.9%** of deliveries led to a push. Friends are mostly not nearby.

**Scaling the pub/sub layer.** 13.3 million deliveries per second is more than one node can carry, so channels are spread over many pub/sub nodes by hashing the channel name (consistent hashing keeps resharding cheap; see [consistent hashing](/interview-question/what-is-consistent-hashing)). Each WebSocket server connects to every pub/sub node that owns one of its subscriptions. Redis Pub/Sub is the usual example: fire-and-forget, no persistence, which fits because a missed location is replaced 30 seconds later. The connection side of this is covered in [scaling WebSockets with Redis Pub/Sub](/interview-question/how-do-you-scale-websockets-to-1m-connections-with-redis-pub-sub).

## 8. Deep Dive 2: Moving In and Out of Range, and Going Away

The example follows one friend walking away 1 km per round:

~~~text
user 97 opens the app, initial list from the cache: user 707 2.8 km, user 256 4.1 km
friend 707 is 2.8 km away and walks away 1 km per round:
  round 1: 3.8 km -> pushed, shown
  round 2: 4.7 km -> pushed, shown
  round 3: 5.7 km -> dropped by filter
  round 4: 6.7 km -> dropped by filter
300 s after the last update: location still cached
599 s after the last update: location still cached
600 s after the last update: location expired, friend leaves every list
~~~

- The friend stayed in the list at 3.8 and 4.7 km and was dropped by the filter at 5.7 km. The receiving server should send \`friend_gone\` the first time a friend drops out, not stay silent, or the phone shows a stale entry.
- After the friend closed the app, the cached position stayed for exactly the TTL (still cached at 599 s, expired at 600 s). The TTL is the safety net for crashed apps that never sent "goodbye".

📌 **Interview term: TTL (time to live)** — an expiry set on a cache entry so it disappears on its own. Here it bounds how long a stale position can be shown, without any cleanup job.

**Reducing updates.** The update interval is the biggest lever: report every 30 s only while moving; when the phone is still, send nothing (the TTL keeps it alive if refreshed every few minutes). Also skip publishing when the position moved less than, say, 100 m since the last publish.

## 9. Deep Dive 3: Why Not a Geo Index?

A geo index answers "who is near me" among *all* users. For friends only, the comparison is:

| Approach | Work per update | Good when | Bad when |
| :--- | :--- | :--- | :--- |
| Pub/sub fan-out to friends, filter at receiver | one publish, about 40 deliveries | friend lists are bounded (hundreds) and friends are spread out | a user has 100,000 followers |
| Geo index of all sharing users, query on each update | one index write, one radius query, then intersect with friends | you also want "nearby strangers" or events | radius queries every 30 s for 10 million users |
| Pull on open, no live updates | nothing while closed; one cache read per friend on open | live updates are not required | users expect the list to move |

A strong answer picks fan-out for friends, and adds a geo index (as on the [nearby drivers page](/interview-question/how-would-you-design-a-nearby-drivers-proximity-search)) only if the product adds a "people nearby" feature. A hybrid that some designs use: subscribe each user to a channel per geohash cell around them instead of per friend; it avoids the friend fan-out but delivers updates from strangers that must be filtered out, and it churns subscriptions as users move.

## 10. Privacy and Data Lifecycle

- **Opt-in on both sides**: the friend list used for subscriptions contains only friends who share with you and with whom you share.
- **Coarse output**: send distance (rounded) rather than coordinates to the friend's phone.
- **Short retention**: the cache TTL is 10 minutes; if location history is kept for a separate feature, store it in a separate store with its own retention and access controls, and never in the pub/sub path.
- **Blocking and unfriending** must remove subscriptions immediately, which means the social-graph service publishes graph changes to the WebSocket servers.

## 11. What Breaks First at 10x

At 1 billion daily users of the feature and 100 million concurrent:
- **Pub/sub deliveries**: 133 million per second. Add pub/sub nodes, and reduce fan-out with smarter update rules (no updates while still, minimum movement), which cut the multiplier at the source.
- **Users with huge friend counts**: a user with 5,000 friends sharing produces 5,000-way fan-outs; cap the number of friends shown or move such users to the pull model.
- **Subscription churn**: every connect subscribes to hundreds of channels; reconnection storms after a deploy can overload pub/sub. Drain servers slowly and use jittered reconnects.
- **WebSocket servers**: 1,000 at 100,000 connections each.

## 12. Verified: Running the Code

The example **"Nearby Friends fan-out: per-user pub/sub channels, receiver-side distance filter, and a TTL location cache"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
users 2000, avg friends 25.4, online 597
channel subscriptions opened by the online users: 15128
one 30 s round: published 597, pub/sub deliveries 4470, pushed to phones 174 (3.9% pass the 5 km filter)
deliveries per WebSocket server: 1075 1214 1056 1125
user 97 opens the app, initial list from the cache: user 707 2.8 km, user 256 4.1 km
friend 707 is 2.8 km away and walks away 1 km per round:
  round 1: 3.8 km -> pushed, shown
  round 2: 4.7 km -> pushed, shown
  round 3: 5.7 km -> dropped by filter
  round 4: 6.7 km -> dropped by filter
300 s after the last update: location still cached
599 s after the last update: location still cached
600 s after the last update: location expired, friend leaves every list
~~~

What the simulation stands for and what it leaves out: the friend graph and positions come from a seeded random generator (2,000 users, 20 random friendships each, 30% online, a flat 40 km by 40 km city in kilometre coordinates instead of latitude and longitude). \`subs\` stands for Redis Pub/Sub channel subscriptions, \`cache\` for Redis keys with a TTL, and "WebSocket server" is just \`user id mod 4\`. There is no network, no message loss, no real clock and no concurrency.

## Edge Cases Worth Knowing

- **Both users on the same WebSocket server**: the server can deliver locally, but keeping one code path (always via pub/sub) is simpler and still correct.
- **Phone in the background**: mobile OSes restrict background location; design for updates only while the app is open, plus optional low-frequency background updates.
- **Reconnects**: on reconnect the client may land on a different server; it resubscribes and rebuilds from the cache, so no server-side session state is needed.
- **Showing freshness**: show "updated 2 min ago" from the update timestamp, so a delayed message is not presented as live.

## Common Pitfalls

- **Treating it as a geo search over everyone** — the audience is the friend graph; fan-out over friends is simpler and cheaper.
- **Filtering at the sender** — the sender would need every friend's position; the receiver already has both.
- **No TTL** — a crashed app stays "nearby" forever.
- **Ignoring the delivery multiplier** — 333,333 updates per second is fine; 13.3 million deliveries per second is the real size.
- **Keeping location history in the hot path** — retention and privacy belong to a separate store.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reframe:</strong> <span style="color:#f0e2c8;">Unlike nearby drivers, I only care about <strong style="color:#ffca28;">my friends</strong>, so this is a <strong style="color:#ffca28;">fan-out</strong> problem over the social graph, not a geo index over everyone.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Flow:</strong> <span style="color:#f0e2c8;">Phones hold a <strong style="color:#ffca28;">WebSocket</strong>. Each update writes a <strong style="color:#ffca28;">location cache with a TTL</strong> and publishes to the user <strong style="color:#ffca28;">pub/sub channel</strong>. The WebSocket servers of online friends subscribe to that channel, compute distance, and push only if within 5 km.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Numbers:</strong> <span style="color:#f0e2c8;">10 million concurrent users updating every 30 s is <strong style="color:#ffca28;">333,000 updates/s</strong>; with 40 online friends each that is <strong style="color:#ffca28;">13.3 million deliveries/s</strong>, spread over many pub/sub nodes by hashing channel names, plus about 100 WebSocket servers.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Filter and lifecycle:</strong> <span style="color:#f0e2c8;">Most deliveries are dropped — 3.9% passed in my simulation. A TTL removes crashed apps; I send <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">friend_gone</code> when someone leaves the radius.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Privacy and 10x:</strong> <span style="color:#f0e2c8;">Opt-in on both sides, distance not coordinates, short retention. At 10x the delivery multiplier breaks first, so I cut updates while still, cap huge friend lists, and only add a geo index for a "nearby strangers" feature.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why receiver-side filtering instead of the publisher deciding who is near?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The publisher would need the current position of every friend on every update. The receiving server already knows its own user position and gets the friend position in the message, so the check is one subtraction and no extra lookups.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Redis Pub/Sub loses messages if a subscriber is slow. Is that acceptable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes for this feature: a location is replaced 30 seconds later, so at-most-once delivery is fine. I would not use the same channel for anything that must arrive, such as a friend request.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does the initial list appear when I open the app?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The server reads the cached positions of my sharing friends (one multi-get), filters by distance and sends the list immediately, then live updates follow from the subscriptions.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add "people nearby who are not friends"?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That needs a spatial index over all sharing users: geohash cells in Redis GEO or a grid service, queried with the cell plus neighbours, exactly like nearby drivers. Or subscribe users to geohash-cell channels, accepting churn as they move.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens during a deploy of the WebSocket fleet?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every connection on a drained server reconnects and resubscribes to hundreds of channels. I drain servers gradually with jittered client reconnects so pub/sub does not see a subscription storm.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Fan-out | One event delivered to many recipients |
| Pub/sub channel per user | A channel named by user id that friends subscribe to |
| Receiver-side filtering | The subscriber decides whether a message is relevant (here: within the radius) |
| TTL (time to live) | An expiry on a cache entry so it disappears on its own |

**Conclusion:** Nearby Friends looks like a geo problem but is really a fan-out problem: each phone streams its position over a WebSocket, the server writes it to a TTL cache and publishes it on the user channel, and the servers of online friends filter by distance and push. The numbers decide the design — 333,000 updates per second become 13.3 million deliveries per second, and in the simulation only 3.9% of deliveries were close enough to show — so the work goes into sharding pub/sub, cutting updates at the source, and expiring stale positions. A geo index joins only when the product wants strangers, not friends.`,
    examples: [
      {
        label: `Nearby Friends fan-out: per-user pub/sub channels, receiver-side distance filter, and a TTL location cache`,
        variants: [
          { tech: "node", code: `// Nearby Friends: per-user pub/sub channels, receiver-side distance filter, TTL location cache.
let seed = 7;
function rand() { seed = (seed * 48271) % 2147483647; return seed / 2147483647; }
function randInt(n) { return Math.floor(rand() * n); }

const USERS = 2000, FRIENDS_EACH = 20, RADIUS_KM = 5, TTL_S = 600, SERVERS = 4;
const friends = Array.from({ length: USERS }, () => new Set());
for (let u = 0; u < USERS; u++) {
  while (friends[u].size < FRIENDS_EACH) { const v = randInt(USERS); if (v !== u) { friends[u].add(v); friends[v].add(u); } }
}
const online = [], pos = [];
for (let u = 0; u < USERS; u++) { online.push(rand() < 0.3); pos.push([rand() * 40, rand() * 40]); } // a 40 km x 40 km city
let edges = 0; for (const f of friends) edges += f.size;
console.log("users " + USERS + ", avg friends " + (edges / USERS).toFixed(1) + ", online " + online.filter(Boolean).length);

// Location cache: user -> { x, y, expiresAt }, standing for Redis keys with a TTL.
const cache = new Map();
// Pub/sub: channel = user id; subscribers = the WebSocket server of each online friend.
const subs = new Map(); let subscribeCalls = 0;
function connect(u) {
  for (const f of friends[u]) { if (!subs.has(f)) subs.set(f, new Set()); subs.get(f).add(u); subscribeCalls++; }
}
for (let u = 0; u < USERS; u++) if (online[u]) connect(u);
console.log("channel subscriptions opened by the online users: " + subscribeCalls);

function dist(a, b) { return Math.hypot(pos[a][0] - pos[b][0], pos[a][1] - pos[b][1]); }
const perServer = new Array(SERVERS).fill(0);
function publishRound(now) {
  let published = 0, delivered = 0, pushed = 0;
  for (let u = 0; u < USERS; u++) {
    if (!online[u]) continue;
    cache.set(u, { x: pos[u][0], y: pos[u][1], expiresAt: now + TTL_S });
    published++;
    for (const s of subs.get(u) || []) {
      if (!online[s]) continue; // the subscriber has gone; real pub/sub would have dropped it on disconnect
      delivered++; perServer[s % SERVERS]++;
      if (dist(u, s) <= RADIUS_KM) pushed++; // the receiving server filters by distance before pushing to the phone
    }
  }
  return [published, delivered, pushed];
}
const [p, d, s] = publishRound(0);
console.log("one 30 s round: published " + p + ", pub/sub deliveries " + d + ", pushed to phones " + s + " (" + (100 * s / d).toFixed(1) + "% pass the " + RADIUS_KM + " km filter)");
console.log("deliveries per WebSocket server: " + perServer.join(" "));

function nearbyList(u, now) {
  const out = [];
  for (const f of friends[u]) {
    const c = cache.get(f);
    if (!c || c.expiresAt <= now) continue;
    const km = Math.hypot(c.x - pos[u][0], c.y - pos[u][1]);
    if (km <= RADIUS_KM) out.push([km, f]);
  }
  out.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return out.map(([km, f]) => "user " + f + " " + km.toFixed(1) + " km");
}
let me = 0; while (!online[me] || nearbyList(me, 0).length < 2) me++;
console.log("user " + me + " opens the app, initial list from the cache: " + nearbyList(me, 0).join(", "));

const friend = [...friends[me]].filter((f) => online[f]).sort((a, b) => dist(me, a) - dist(me, b))[0];
console.log("friend " + friend + " is " + dist(me, friend).toFixed(1) + " km away and walks away 1 km per round:");
for (let r = 1; r <= 4; r++) {
  pos[friend][0] += (pos[friend][0] >= pos[me][0] ? 1 : -1);
  cache.set(friend, { x: pos[friend][0], y: pos[friend][1], expiresAt: r * 30 + TTL_S });
  const km = dist(me, friend);
  console.log("  round " + r + ": " + km.toFixed(1) + " km -> " + (km <= RADIUS_KM ? "pushed, shown" : "dropped by filter"));
}

online[friend] = false; // the friend closes the app: no more publishes, cached location ages out
const last = 4 * 30;
for (const age of [300, 599, 600]) {
  const c = cache.get(friend);
  console.log(age + " s after the last update: " + (c.expiresAt > last + age ? "location still cached" : "location expired, friend leaves every list"));
}` },
          { tech: "python", code: `# Nearby Friends: per-user pub/sub channels, receiver-side distance filter, TTL location cache.
import math

seed = 7


def rand():
    global seed
    seed = (seed * 48271) % 2147483647
    return seed / 2147483647


def rand_int(n):
    return math.floor(rand() * n)


USERS, FRIENDS_EACH, RADIUS_KM, TTL_S, SERVERS = 2000, 20, 5, 600, 4
friends = [dict() for _ in range(USERS)]  # dicts keep insertion order, like a JS Set
for u in range(USERS):
    while len(friends[u]) < FRIENDS_EACH:
        v = rand_int(USERS)
        if v != u:
            friends[u][v] = True
            friends[v][u] = True
online, pos = [], []
for u in range(USERS):
    online.append(rand() < 0.3)
    x = rand()
    y = rand()
    pos.append([x * 40, y * 40])  # a 40 km x 40 km city
edges = sum(len(f) for f in friends)
print(f"users {USERS}, avg friends {edges / USERS:.1f}, online {sum(online)}")

cache = {}  # user -> (x, y, expires_at), standing for Redis keys with a TTL
subs = {}  # channel = user id; subscribers = the WebSocket server of each online friend
subscribe_calls = 0


def connect(u):
    global subscribe_calls
    for f in friends[u]:
        subs.setdefault(f, {})[u] = True
        subscribe_calls += 1


for u in range(USERS):
    if online[u]:
        connect(u)
print(f"channel subscriptions opened by the online users: {subscribe_calls}")


def dist(a, b):
    return math.hypot(pos[a][0] - pos[b][0], pos[a][1] - pos[b][1])


per_server = [0] * SERVERS


def publish_round(now):
    published = delivered = pushed = 0
    for u in range(USERS):
        if not online[u]:
            continue
        cache[u] = (pos[u][0], pos[u][1], now + TTL_S)
        published += 1
        for s in subs.get(u, {}):
            if not online[s]:
                continue  # the subscriber has gone; real pub/sub would have dropped it on disconnect
            delivered += 1
            per_server[s % SERVERS] += 1
            if dist(u, s) <= RADIUS_KM:
                pushed += 1  # the receiving server filters by distance before pushing to the phone
    return published, delivered, pushed


p, d, s = publish_round(0)
print(f"one 30 s round: published {p}, pub/sub deliveries {d}, pushed to phones {s} ({100 * s / d:.1f}% pass the {RADIUS_KM} km filter)")
print("deliveries per WebSocket server: " + " ".join(str(n) for n in per_server))


def nearby_list(u, now):
    out = []
    for f in friends[u]:
        c = cache.get(f)
        if c is None or c[2] <= now:
            continue
        km = math.hypot(c[0] - pos[u][0], c[1] - pos[u][1])
        if km <= RADIUS_KM:
            out.append((km, f))
    out.sort()
    return [f"user {f} {km:.1f} km" for km, f in out]


me = 0
while not online[me] or len(nearby_list(me, 0)) < 2:
    me += 1
print(f"user {me} opens the app, initial list from the cache: " + ", ".join(nearby_list(me, 0)))

friend = sorted([f for f in friends[me] if online[f]], key=lambda f: dist(me, f))[0]
print(f"friend {friend} is {dist(me, friend):.1f} km away and walks away 1 km per round:")
for r in range(1, 5):
    pos[friend][0] += 1 if pos[friend][0] >= pos[me][0] else -1
    cache[friend] = (pos[friend][0], pos[friend][1], r * 30 + TTL_S)
    km = dist(me, friend)
    print(f"  round {r}: {km:.1f} km -> " + ("pushed, shown" if km <= RADIUS_KM else "dropped by filter"))

online[friend] = False  # the friend closes the app: no more publishes, cached location ages out
last = 4 * 30
for age in (300, 599, 600):
    c = cache[friend]
    print(f"{age} s after the last update: " + ("location still cached" if c[2] > last + age else "location expired, friend leaves every list"))` },
        ],
      },
    ],
  },
  {
    title: `How would you design Google Maps?`,
    difficulty: "hard",
    seoDescription: `Design Google Maps: map tiles on a CDN, a road graph with A* and contraction hierarchies, live traffic from GPS pings, ETA and rerouting, with numbers.`,
    description: `**Question presented to candidate:**
"Design a maps product like Google Maps. Users pan and zoom a map of the world, search for a place, ask for driving directions with an ETA, and get rerouted when traffic changes. Pick the parts you think are hardest and go deep."

**What a strong answer should cover:**
- Scope it into three systems: **map rendering** (tiles), **routing and ETA** (a road graph), and **live traffic** (location pings turned into road speeds); places search as a fourth, smaller one
- Tiles: the **z/x/y tile pyramid** (4^z tiles at zoom z), pre-rendered or **vector tiles** rendered on the device, served from a **CDN** with long cache lifetimes
- Routing: the road network as a **weighted graph**; Dijkstra is correct but explores too much, **A*** uses a distance heuristic, and **contraction hierarchies** precompute shortcuts so continental queries touch few nodes
- Traffic: phones send GPS pings, **map matching** snaps them to road segments, a streaming job computes current speed per segment, and edge weights are updated; ETA = sum of segment times, rerouting when a better route appears
- Capacity numbers (tiles, graph memory, pings per second, route requests per second) and what breaks first at 10x

**Clarifying questions expected:**
- Which features are in scope: viewing, search, directions, live navigation, offline maps?
- How many daily users and route requests, and how many users navigating at once?
- Driving only, or also walking, cycling and transit?

**Code / implementation expected:** Optional — the design with numbers; the example computes tile coordinates and compares Dijkstra and A* on a road grid with a traffic jam.`,
    answer: `**Target Audience:** Developers preparing for system design interviews. You know what a CDN and a graph are; shortest-path algorithms are explained from scratch.
**Difficulty:** Hard
**Verified with:** Node 22.22, Python 3.12, Go 1.24 and Java 21 (all four print identical output).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All behaviour shown comes from running the example; the **Verified** section quotes the full output. Capacity numbers are worked from stated assumptions; nothing here describes Google internals, which are not public in this detail.

## 1. Why This Even Matters — A Story First

A paper road atlas has a page for the whole country, then pages for each region, then city pages with every street. You never unfold the whole country at street level: you turn to the page you need. Finding a route, you look at the motorways first and only zoom into small streets at the start and end of the trip. And when the radio says the bridge is jammed, you pick another bridge.

Google Maps is those three habits turned into systems. **Tiles** are the atlas pages, cut into a grid at every zoom level so a phone downloads only what is on screen. **Routing** is a shortest-path search on a graph of road segments, made fast by skipping small streets in the middle of long trips. **Live traffic** is the radio: millions of phones report how fast they are moving, which turns into the current travel time of each road segment.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which features: view, search, directions, live navigation, offline? | Each is its own subsystem; pick two to go deep |
| Daily users, route requests per day, users navigating at once? | Sizes routing servers and traffic ingestion |
| Driving only, or walking, cycling, transit? | Different graphs and costs; transit needs timetables |
| How fresh must traffic be? | Minutes-old speeds are fine; seconds are expensive |
| Global from day one? | Decides graph partitioning and data centre placement |

## 3. Requirements

**Functional**
- Pan and zoom a world map smoothly on mobile and web.
- Search for places and addresses (geocoding).
- Directions from A to B with distance, ETA and alternatives.
- Turn-by-turn navigation with rerouting when traffic changes or the driver leaves the route.

**Non-functional**
- Map tiles appear in about 100 ms on a warm cache; a route in about a second.
- ETA within a few minutes of reality for typical trips.
- Highly available reads: viewing the map must keep working even if traffic ingestion is degraded.

## 4. Capacity Estimate

| Input (assumption) | Value |
| :--- | :--- |
| Route requests per day | 500 million |
| Peak factor | 3x |
| Users navigating at once at peak | 10 million |
| GPS ping interval while navigating | 5 s |
| Road graph | 100 million intersections, 250 million road segments |
| Graph storage | 8 bytes per intersection (two 32-bit coordinates), 8 bytes per directed edge (target + travel time) |
| Average raster tile | 20 KB |
| Maximum zoom pre-rendered | 18 |

Arithmetic (the tile counts come from the example run):

- **Route requests:** 500,000,000 / 86,400 = **5,787/s** average, **17,361/s** at peak.
- **Traffic pings:** 10,000,000 / 5 s = **2 million pings/s**.
- **Graph memory:** 100M x 8 B + 250M x 2 directions x 8 B = **4.8 GB**: one routing server can hold the whole graph in RAM, plus the precomputed shortcuts. Routing scales by **replicating** the graph, not sharding it.
- **Tiles:** zoom z has 4^z tiles; zoom 0 to 18 is **91,625,968,981** tiles. At 20 KB that would be **1.83 PB** if every tile were rendered and stored. Zoom 0 to 14 is 357,913,941 tiles, **7.2 TB**. Many deep tiles are empty sea or countryside and can share one stored blob, so the real number is lower, but the shape is clear: deep zooms dominate, so render them on demand or ship vector data instead.

## 5. Part 1: Map Tiles

The world (in the Web Mercator projection, which cuts off at about 85.05 degrees north and south) is a square image. Zoom 0 is one 256 by 256 pixel tile. Each zoom level splits every tile into 4, so zoom z is a 2^z by 2^z grid addressed as \`z/x/y\` (OpenStreetMap wiki, "Slippy map tilenames"). The example computes the tile for central London:

~~~text
London at zoom 0 -> tile 0/0/0
London at zoom 10 -> tile 10/511/340
London at zoom 15 -> tile 15/16372/10896
tiles at zoom 10: 1048576, cumulative 0..10: 1398101
tiles at zoom 14: 268435456, cumulative 0..14: 357913941
tiles at zoom 18: 68719476736, cumulative 0..18: 91625968981
~~~

📌 **Interview term: tile pyramid (z/x/y)** — the map cut into fixed-size square tiles at every zoom level; a viewer requests only the tiles covering its screen at its zoom. 4^z tiles exist at zoom z.

📌 **Interview term: raster vs vector tiles** — a raster tile is a finished picture (PNG or WebP). A vector tile contains the geometry (roads, buildings, labels) for that square, and the device draws it. Vector tiles are much smaller, rotate and tilt smoothly, restyle without re-rendering (dark mode, traffic colours), and let one tile serve several zoom levels; the cost is rendering work on the device.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="Map data from map editors and imagery feeds a tile build pipeline that writes tiles to object storage; a CDN caches tiles near users; phones request tiles by z x y from the CDN">
  <defs>
    <marker id="sd17q3-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="120" width="140" height="56" rx="10"/>
  <text class="d-text" x="90" y="145" text-anchor="middle">map data</text>
  <text class="d-sub" x="90" y="164" text-anchor="middle">roads, places</text>
  <rect class="d-box" x="220" y="120" width="140" height="56" rx="10"/>
  <text class="d-text" x="290" y="145" text-anchor="middle">tile build</text>
  <text class="d-sub" x="290" y="164" text-anchor="middle">batch pipeline</text>
  <rect class="d-box" x="420" y="120" width="140" height="56" rx="10"/>
  <text class="d-text" x="490" y="145" text-anchor="middle">object store</text>
  <text class="d-sub" x="490" y="164" text-anchor="middle">z/x/y keys</text>
  <rect class="d-box-accent" x="420" y="220" width="140" height="56" rx="10"/>
  <text class="d-text" x="490" y="245" text-anchor="middle">CDN</text>
  <text class="d-sub" x="490" y="264" text-anchor="middle">edge cache</text>
  <rect class="d-box-muted" x="620" y="220" width="120" height="56" rx="10"/>
  <text class="d-text" x="680" y="253" text-anchor="middle">phones</text>
  <path class="d-edge" d="M 160 148 L 214 148" marker-end="url(#sd17q3-arrow)"/>
  <path class="d-edge" d="M 360 148 L 414 148" marker-end="url(#sd17q3-arrow)"/>
  <path class="d-edge" d="M 490 176 L 490 214" marker-end="url(#sd17q3-arrow)"/>
  <path class="d-edge-accent" d="M 614 248 L 566 248" marker-end="url(#sd17q3-arrow)"/>
</svg>

Tiles are built offline from the map data and stored by \`z/x/y\` key; the CDN caches them close to users, and phones request only the tiles on screen. Traffic colours are a separate, short-lived overlay so the base tiles can be cached for a long time.

Design points to mention:
- **Cache keys include a version** (\`/v42/15/16372/10896.pbf\`), so a map data release is a new URL and old tiles can be cached as immutable. See [what is a CDN](/interview-question/what-is-a-cdn-and-how-does-it-work).
- **Prefetch** neighbouring tiles and the next zoom level along a route; **offline maps** are a downloaded region of vector tiles plus a routing graph extract.
- **Search** for places is a separate index: an inverted index over names and addresses, ranked by text match, distance from the viewport, and popularity, with a geo filter by cell (the cell idea is on the [nearby drivers page](/interview-question/how-would-you-design-a-nearby-drivers-proximity-search)).

## 6. Part 2: Routing

The road network is a graph: intersections are nodes, road segments are edges, and each edge has a cost — the time to drive it. A route is a shortest path.

📌 **Interview term: Dijkstra's algorithm** — explores nodes in order of their distance from the start, using a priority queue, until it reaches the target. Always correct with non-negative costs, but it grows in a circle around the start: to find a 20 km route it explores everything within 20 km in every direction.

📌 **Interview term: A* search** — Dijkstra plus a heuristic: a lower bound on the remaining cost to the target (for example straight-line distance divided by the top speed). Nodes in the wrong direction look expensive and are explored later. If the heuristic never overestimates, A* returns the same optimal route.

The example builds a 40 by 40 road grid (1,600 intersections, 3,120 segments of 20 to 60 seconds each) and routes from (5,5) to (20,30):

~~~text
graph: 1600 intersections, 3120 road segments; route (5,5) -> (20,30)
Dijkstra: eta 19 min 26 s, 41 intersections on path, settled 1045 nodes
A*:       eta 19 min 26 s, 41 intersections on path, settled 576 nodes
~~~

Both find the same 19 min 26 s route; **A* settled 576 nodes instead of 1,045**, 45% fewer, with a heuristic of 20 seconds per remaining grid step (the cheapest segment, so it never overestimates). On a real continent the gap is far larger, but A* alone is still too slow for a cross-country trip on a 100-million-node graph.

📌 **Interview term: contraction hierarchies** — a preprocessing step that ranks nodes by importance, removes the least important ones one by one and adds **shortcut edges** that preserve shortest-path distances; the query is a bidirectional search that only moves "upward" to more important nodes. Published by Geisberger, Sanders, Schultes and Delling (WEA 2008); follow-up work showed whole continents routed while visiting only a few hundred nodes. The cost is preprocessing, and re-preprocessing when weights change, which is why live traffic needs variants that split preprocessing into a slow, weight-independent step and a fast customization step per weight set: customizable contraction hierarchies (Dibbelt, Strasser and Wagner, SEA 2014; extended in the ACM Journal of Experimental Algorithmics, 2016) and customizable route planning (CRP) are the published examples.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 270" role="img" aria-label="A route request goes to a routing service holding the road graph and shortcuts in memory; it reads current segment speeds from a traffic store and returns a route with an ETA; many identical routing replicas sit behind a load balancer">
  <defs>
    <marker id="sd17q3b-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="100" width="120" height="56" rx="10"/>
  <text class="d-text" x="80" y="133" text-anchor="middle">phone</text>
  <rect class="d-box" x="200" y="100" width="140" height="56" rx="10"/>
  <text class="d-text" x="270" y="125" text-anchor="middle">load</text>
  <text class="d-sub" x="270" y="144" text-anchor="middle">balancer</text>
  <rect class="d-box-accent" x="400" y="90" width="170" height="76" rx="10"/>
  <text class="d-text" x="485" y="118" text-anchor="middle">routing replicas</text>
  <text class="d-sub" x="485" y="138" text-anchor="middle">graph + shortcuts</text>
  <text class="d-sub" x="485" y="156" text-anchor="middle">in RAM</text>
  <rect class="d-box" x="620" y="100" width="120" height="56" rx="10"/>
  <text class="d-text" x="680" y="125" text-anchor="middle">traffic</text>
  <text class="d-sub" x="680" y="144" text-anchor="middle">segment speeds</text>
  <path class="d-edge" d="M 140 128 L 194 128" marker-end="url(#sd17q3b-arrow)"/>
  <path class="d-edge" d="M 340 128 L 394 128" marker-end="url(#sd17q3b-arrow)"/>
  <path class="d-edge-dashed" d="M 614 128 L 576 128" marker-end="url(#sd17q3b-arrow)"/>
</svg>

Each routing replica holds the whole graph (about 4.8 GB under the assumptions) plus shortcuts in memory, and pulls fresh segment speeds from the traffic store every minute or so. At 17,361 route requests per second, the number of replicas is that rate divided by what one replica serves, measured by load testing.

## 7. Part 3: Live Traffic, ETA and Rerouting

**Ingest:** navigating phones send a GPS ping every few seconds: 2 million pings per second under the assumptions, into a log such as Kafka partitioned by region.

📌 **Interview term: map matching** — snapping a noisy GPS trace to the road segments the car actually drove on (a hidden-Markov-style best fit over consecutive pings). Without it, a car on a motorway looks like it is on the frontage road next to it.

**Aggregate:** a streaming job groups matched pings by segment over a short window (say 1 to 5 minutes) and computes a robust speed (median, with outliers removed). Segments with no recent pings fall back to the historical speed for that time of day and day of week.

**Publish:** new speeds go to the traffic store, the routing replicas update edge weights, and the tile overlay recolours roads.

**ETA and rerouting:** the ETA is the sum of segment times along the route (plus turn and signal costs). The example makes 6 segments in the middle of the route 5 times slower:

~~~text
jam on 6 segments: old route now takes 31 min 26 s
reroute with A*: eta 19 min 57 s, shares 31 of 41 intersections with the old route, settled 610 nodes
~~~

The old route jumped from 19 min 26 s to **31 min 26 s**; a fresh A* search found a route of **19 min 57 s** that reuses 31 of 41 intersections and detours around the jam. A navigation session runs this check periodically (or when the traffic store reports a change on the remaining route) and offers the new route if it saves enough time to be worth the switch.

📌 **Interview term: historical vs real-time speed** — predicted travel time mixes the live speed (for segments the driver will reach soon) with historical patterns (for segments an hour away, where today's live speed says little about the speed when the driver arrives).

## 8. Data Model

| Data | Store | Notes |
| :--- | :--- | :--- |
| Road graph (nodes, segments, turn restrictions) | Built offline from map data; files loaded into routing RAM | Versioned with each map release |
| Contraction shortcuts | Precomputed files per release | Rebuilt per release; weights customised often |
| Segment speeds (current) | Key-value store keyed by segment id | Overwritten every minute |
| Segment speeds (historical) | Columnar store, per segment per 15-minute slot of the week | Used for prediction |
| Tiles | Object store keyed \`version/z/x/y\`, cached by CDN | Immutable per version |
| Places | Search index plus a geo cell filter | Updated continuously from edits |

## 9. What Breaks First at 10x

- **Traffic ingestion**: 20 million pings per second. Partition by region, aggregate at the edge (phones batch pings), and sample in dense areas where a few hundred cars per segment already give a stable speed.
- **Routing**: 173,610 requests per second at peak; add replicas (the graph fits in memory, so this is linear), cache popular routes (airport to city centre) for a minute.
- **Weight updates**: more frequent traffic refreshes mean more shortcut re-customisation; keep the hierarchy fixed and update weights only.
- **Tiles** scale with the CDN; the risk is a map release invalidating everything at once, so roll releases out gradually.

## 10. Verified: Running the Code

The example **"Maps core: slippy-map tile math, Dijkstra vs A* on a road grid, and rerouting around a traffic jam"** was run with \`node main.js\` (Node 22.22), \`python3.12 main.py\`, \`go run main.go\` (Go 1.24) and Java 21. All four print exactly this:

~~~text
London at zoom 0 -> tile 0/0/0
London at zoom 10 -> tile 10/511/340
London at zoom 15 -> tile 15/16372/10896
tiles at zoom 10: 1048576, cumulative 0..10: 1398101
tiles at zoom 14: 268435456, cumulative 0..14: 357913941
tiles at zoom 18: 68719476736, cumulative 0..18: 91625968981
graph: 1600 intersections, 3120 road segments; route (5,5) -> (20,30)
Dijkstra: eta 19 min 26 s, 41 intersections on path, settled 1045 nodes
A*:       eta 19 min 26 s, 41 intersections on path, settled 576 nodes
jam on 6 segments: old route now takes 31 min 26 s
reroute with A*: eta 19 min 57 s, shares 31 of 41 intersections with the old route, settled 610 nodes
~~~

What the simulation stands for and what it leaves out: the tile formula is the standard Web Mercator slippy-map formula. The "road network" is a seeded random grid with integer travel times, not real roads; there are no one-way streets, turn costs, or contraction hierarchies. The priority queue breaks ties by node id so all four languages settle nodes in the same order. The traffic jam is a direct edit of 6 edge weights, standing for the traffic store pushing new speeds.

## Edge Cases Worth Knowing

- **One-way streets and turn restrictions**: the graph is directed, and some turns are forbidden; model turns as edges between segments when restrictions matter.
- **Ferries and border crossings**: edges with schedules or waits that are not simple travel times.
- **GPS loss in tunnels**: dead-reckon from the last speed until the signal returns, and do not reroute on a single wild ping.
- **Stale traffic overnight**: few pings at 3 a.m.; use historical speeds, not "no data means free flow".
- **Antimeridian and poles**: Web Mercator cannot show the poles; tile x wraps at 180 degrees.

## Common Pitfalls

- **Plain Dijkstra at continental scale** — correct but explores everything in a circle; use A*, and contraction hierarchies or similar preprocessing.
- **Pre-rendering every raster tile** — zoom 0 to 18 is 91.6 billion tiles, about 1.83 PB at 20 KB; render deep zooms on demand or use vector tiles.
- **Sharding the road graph** — at about 4.8 GB it fits on one machine; replicate it instead and avoid cross-shard path searches.
- **Raw GPS as speed data** — without map matching, pings land on the wrong road.
- **Rerouting on every small change** — users hate route flapping; require a meaningful saving before switching.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Scope:</strong> <span style="color:#f0e2c8;">I split it into <strong style="color:#ffca28;">tiles</strong> for viewing, <strong style="color:#ffca28;">routing</strong> for directions and ETA, and <strong style="color:#ffca28;">live traffic</strong>, with places search as a smaller fourth system, and say which two I will go deep on.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Tiles:</strong> <span style="color:#f0e2c8;">The world is a <strong style="color:#ffca28;">z/x/y pyramid</strong>: 4^z tiles at zoom z, so zoom 0 to 18 is 91.6 billion tiles. I serve versioned, immutable tiles from object storage through a <strong style="color:#ffca28;">CDN</strong>, prefer <strong style="color:#ffca28;">vector tiles</strong> so phones render and restyle locally, and draw traffic as a separate short-lived overlay.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Routing:</strong> <span style="color:#f0e2c8;">The road network is a weighted graph of about 100 million intersections, roughly 4.8 GB, so every routing replica holds it in RAM. Dijkstra is correct but explores a circle; <strong style="color:#ffca28;">A</strong>* with a distance heuristic settled 576 nodes instead of 1,045 in my run for the same route; <strong style="color:#ffca28;">contraction hierarchies</strong> add shortcuts so long trips touch only a few hundred nodes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Traffic and ETA:</strong> <span style="color:#f0e2c8;">Navigating phones send pings — about 2 million per second — into a log; <strong style="color:#ffca28;">map matching</strong> snaps them to segments; a streaming job computes speed per segment, falling back to historical speeds. ETA is the sum of segment times; when 6 segments jammed in my run, the old route went from 19:26 to 31:26 and a re-search found 19:57.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. 10x:</strong> <span style="color:#f0e2c8;">Ingestion breaks first: partition by region, batch pings on the phone, sample dense roads. Routing scales by adding replicas; the hierarchy stays fixed while only weights are updated.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is A* still correct if it skips nodes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Its heuristic never overestimates the remaining cost — here, remaining grid steps times the cheapest segment time — so any node it skips could not lead to a shorter route. With an overestimating heuristic it becomes faster but may return a worse route.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you keep contraction hierarchies fresh with live traffic?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the node ordering and shortcut structure fixed per map release and recompute only the shortcut weights when speeds change, which is much cheaper than full preprocessing. That separation is the idea behind customizable contraction hierarchies and customizable route planning.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Raster or vector tiles?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Vector tiles: smaller downloads, smooth rotation and tilt, restyling for dark mode or traffic without new tiles, and one tile reused across zoom levels. Raster is still useful for satellite imagery and very low-end clients.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you estimate the ETA for a segment an hour ahead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Blend: live speed for the next few minutes of the route, historical speed for that segment at the predicted arrival time further out, and learn the blend from past trips by comparing predicted and actual arrival times.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a user who leaves the route?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The phone detects it by map matching its pings against the route; it requests a new route from the current position. A small deviation tolerance and a few consecutive pings avoid rerouting on GPS noise.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Tile pyramid (z/x/y) | The map cut into square tiles at every zoom; 4^z tiles at zoom z |
| Raster vs vector tiles | Finished images vs geometry the device draws |
| Dijkstra's algorithm | Shortest path by exploring nodes in order of distance from the start |
| A* search | Dijkstra guided by a heuristic lower bound on the remaining cost |
| Contraction hierarchies | Preprocessing that adds shortcut edges so queries touch few nodes |
| Map matching | Snapping noisy GPS pings to the road segments actually driven |
| Historical vs real-time speed | Patterns by time of week vs current measured speed |

**Conclusion:** Google Maps is three systems that share one map: a tile pyramid of 4^z tiles per zoom served from a CDN (vector tiles keep the deep zooms affordable), a road graph small enough to replicate in RAM on every routing server, searched with A* and contraction hierarchies, and a traffic pipeline that turns millions of GPS pings per second into segment speeds through map matching and streaming aggregation. The run made the routing trade-off concrete — A* found the same route as Dijkstra while settling 45% fewer nodes — and showed why live traffic matters: a 6-segment jam turned a 19-minute route into 31 minutes until a re-search found a 20-minute detour.`,
    examples: [
      {
        label: `Maps core: slippy-map tile math, Dijkstra vs A* on a road grid, and rerouting around a traffic jam`,
        variants: [
          { tech: "node", code: `// Maps: slippy-map tile math, Dijkstra vs A* on a road grid, and a reroute after a traffic jam.
let seed = 2024;
function rand() { seed = (seed * 48271) % 2147483647; return seed / 2147483647; }

function tile(lat, lon, z) {
  const n = 2 ** z, r = lat * Math.PI / 180;
  return [Math.floor((lon + 180) / 360 * n), Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n)];
}
for (const z of [0, 10, 15]) { const [x, y] = tile(51.5074, -0.1278, z); console.log("London at zoom " + z + " -> tile " + z + "/" + x + "/" + y); }
let total = 0;
for (let z = 0; z <= 18; z++) { total += 4 ** z; if (z === 10 || z === 14 || z === 18) console.log("tiles at zoom " + z + ": " + 4 ** z + ", cumulative 0.." + z + ": " + total); }

// Road grid: SIZE x SIZE intersections, each road segment takes 20..60 seconds to drive.
const SIZE = 40, MIN_EDGE = 20;
const cost = new Map(); // "a-b" with a < b -> seconds
function key(a, b) { return a < b ? a + "-" + b : b + "-" + a; }
for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
  const id = r * SIZE + c;
  if (c + 1 < SIZE) cost.set(key(id, id + 1), 20 + Math.floor(rand() * 41));
  if (r + 1 < SIZE) cost.set(key(id, id + SIZE), 20 + Math.floor(rand() * 41));
}
function nbrs(id) {
  const r = Math.floor(id / SIZE), c = id % SIZE, out = [];
  if (r > 0) out.push(id - SIZE); if (c > 0) out.push(id - 1); if (c + 1 < SIZE) out.push(id + 1); if (r + 1 < SIZE) out.push(id + SIZE);
  return out;
}
function less(a, b) { return a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]); }
function heapPush(h, e) { h.push(e); let i = h.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (!less(h[i], h[p])) break; [h[i], h[p]] = [h[p], h[i]]; i = p; } }
function heapPop(h) {
  const top = h[0], last = h.pop();
  if (h.length) { h[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < h.length && less(h[l], h[m])) m = l; if (r < h.length && less(h[r], h[m])) m = r; if (m === i) break; [h[i], h[m]] = [h[m], h[i]]; i = m; } }
  return top;
}
function route(src, dst, useHeuristic) {
  const h = (id) => useHeuristic ? MIN_EDGE * (Math.abs(Math.floor(id / SIZE) - Math.floor(dst / SIZE)) + Math.abs(id % SIZE - dst % SIZE)) : 0;
  const dist = new Array(SIZE * SIZE).fill(Infinity), prev = new Array(SIZE * SIZE).fill(-1), done = new Array(SIZE * SIZE).fill(false);
  const heap = []; dist[src] = 0; heapPush(heap, [h(src), src]); let settled = 0;
  while (heap.length) {
    const [, u] = heapPop(heap);
    if (done[u]) continue;
    done[u] = true; settled++;
    if (u === dst) break;
    for (const v of nbrs(u)) {
      const g = dist[u] + cost.get(key(u, v));
      if (g < dist[v]) { dist[v] = g; prev[v] = u; heapPush(heap, [g + h(v), v]); }
    }
  }
  const path = []; for (let v = dst; v !== -1; v = prev[v]) path.unshift(v);
  return { eta: dist[dst], settled, path };
}
function pathCost(path) { let s = 0; for (let i = 1; i < path.length; i++) s += cost.get(key(path[i - 1], path[i])); return s; }
function fmt(sec) { return Math.floor(sec / 60) + " min " + (sec % 60) + " s"; }

const src = 5 * SIZE + 5, dst = 20 * SIZE + 30;
console.log("graph: " + SIZE * SIZE + " intersections, " + cost.size + " road segments; route (5,5) -> (20,30)");
const d = route(src, dst, false), a = route(src, dst, true);
console.log("Dijkstra: eta " + fmt(d.eta) + ", " + d.path.length + " intersections on path, settled " + d.settled + " nodes");
console.log("A*:       eta " + fmt(a.eta) + ", " + a.path.length + " intersections on path, settled " + a.settled + " nodes");

// Live traffic: the 6 segments in the middle of the chosen route become 5x slower.
const mid = Math.floor(a.path.length / 2);
for (let i = mid - 3; i < mid + 3; i++) cost.set(key(a.path[i], a.path[i + 1]), cost.get(key(a.path[i], a.path[i + 1])) * 5);
console.log("jam on 6 segments: old route now takes " + fmt(pathCost(a.path)));
const re = route(src, dst, true);
let shared = 0; for (const v of re.path) if (a.path.includes(v)) shared++;
console.log("reroute with A*: eta " + fmt(re.eta) + ", shares " + shared + " of " + re.path.length + " intersections with the old route, settled " + re.settled + " nodes");` },
          { tech: "python", code: `# Maps: slippy-map tile math, Dijkstra vs A* on a road grid, and a reroute after a traffic jam.
import heapq
import math

seed = 2024


def rand():
    global seed
    seed = (seed * 48271) % 2147483647
    return seed / 2147483647


def tile(lat, lon, z):
    n = 2 ** z
    r = lat * math.pi / 180
    return math.floor((lon + 180) / 360 * n), math.floor((1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * n)


for z in (0, 10, 15):
    x, y = tile(51.5074, -0.1278, z)
    print(f"London at zoom {z} -> tile {z}/{x}/{y}")
total = 0
for z in range(19):
    total += 4 ** z
    if z in (10, 14, 18):
        print(f"tiles at zoom {z}: {4 ** z}, cumulative 0..{z}: {total}")

SIZE, MIN_EDGE = 40, 20
cost = {}  # (a, b) with a < b -> seconds


def key(a, b):
    return (a, b) if a < b else (b, a)


for r in range(SIZE):
    for c in range(SIZE):
        i = r * SIZE + c
        if c + 1 < SIZE:
            cost[key(i, i + 1)] = 20 + math.floor(rand() * 41)
        if r + 1 < SIZE:
            cost[key(i, i + SIZE)] = 20 + math.floor(rand() * 41)


def nbrs(i):
    r, c = divmod(i, SIZE)
    out = []
    if r > 0:
        out.append(i - SIZE)
    if c > 0:
        out.append(i - 1)
    if c + 1 < SIZE:
        out.append(i + 1)
    if r + 1 < SIZE:
        out.append(i + SIZE)
    return out


def route(src, dst, use_heuristic):
    def h(i):
        return MIN_EDGE * (abs(i // SIZE - dst // SIZE) + abs(i % SIZE - dst % SIZE)) if use_heuristic else 0
    n = SIZE * SIZE
    dist, prev, done = [math.inf] * n, [-1] * n, [False] * n
    dist[src] = 0
    heap = [(h(src), src)]
    settled = 0
    while heap:
        _, u = heapq.heappop(heap)
        if done[u]:
            continue
        done[u] = True
        settled += 1
        if u == dst:
            break
        for v in nbrs(u):
            g = dist[u] + cost[key(u, v)]
            if g < dist[v]:
                dist[v], prev[v] = g, u
                heapq.heappush(heap, (g + h(v), v))
    path, v = [], dst
    while v != -1:
        path.insert(0, v)
        v = prev[v]
    return dist[dst], settled, path


def path_cost(path):
    return sum(cost[key(path[i - 1], path[i])] for i in range(1, len(path)))


def fmt(sec):
    return f"{sec // 60} min {sec % 60} s"


src, dst = 5 * SIZE + 5, 20 * SIZE + 30
print(f"graph: {SIZE * SIZE} intersections, {len(cost)} road segments; route (5,5) -> (20,30)")
d_eta, d_set, d_path = route(src, dst, False)
a_eta, a_set, a_path = route(src, dst, True)
print(f"Dijkstra: eta {fmt(d_eta)}, {len(d_path)} intersections on path, settled {d_set} nodes")
print(f"A*:       eta {fmt(a_eta)}, {len(a_path)} intersections on path, settled {a_set} nodes")

mid = len(a_path) // 2  # live traffic: the 6 segments in the middle of the chosen route become 5x slower
for i in range(mid - 3, mid + 3):
    cost[key(a_path[i], a_path[i + 1])] *= 5
print(f"jam on 6 segments: old route now takes {fmt(path_cost(a_path))}")
r_eta, r_set, r_path = route(src, dst, True)
shared = sum(1 for v in r_path if v in a_path)
print(f"reroute with A*: eta {fmt(r_eta)}, shares {shared} of {len(r_path)} intersections with the old route, settled {r_set} nodes")` },
          { tech: "go", code: `// Maps: slippy-map tile math, Dijkstra vs A* on a road grid, and a reroute after a traffic jam.
package main

import (
	"container/heap"
	"fmt"
	"math"
)

var seed int64 = 2024

func rand() float64 { seed = (seed * 48271) % 2147483647; return float64(seed) / 2147483647 }

func tile(lat, lon float64, z int) (int, int) {
	n := math.Pow(2, float64(z))
	r := lat * math.Pi / 180
	return int(math.Floor((lon + 180) / 360 * n)), int(math.Floor((1 - math.Log(math.Tan(r)+1/math.Cos(r))/math.Pi) / 2 * n))
}

const SIZE, MIN_EDGE = 40, 20

var cost = map[[2]int]int{}

func key(a, b int) [2]int {
	if a < b {
		return [2]int{a, b}
	}
	return [2]int{b, a}
}

func nbrs(i int) []int {
	r, c := i/SIZE, i%SIZE
	out := []int{}
	if r > 0 {
		out = append(out, i-SIZE)
	}
	if c > 0 {
		out = append(out, i-1)
	}
	if c+1 < SIZE {
		out = append(out, i+1)
	}
	if r+1 < SIZE {
		out = append(out, i+SIZE)
	}
	return out
}

type entry struct{ f, node int }
type pq []entry

func (p pq) Len() int { return len(p) }
func (p pq) Less(i, j int) bool {
	return p[i].f < p[j].f || (p[i].f == p[j].f && p[i].node < p[j].node)
}
func (p pq) Swap(i, j int)       { p[i], p[j] = p[j], p[i] }
func (p *pq) Push(x interface{}) { *p = append(*p, x.(entry)) }
func (p *pq) Pop() interface{}   { o := *p; e := o[len(o)-1]; *p = o[:len(o)-1]; return e }

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

func route(src, dst int, useH bool) (int, int, []int) {
	h := func(i int) int {
		if !useH {
			return 0
		}
		return MIN_EDGE * (abs(i/SIZE-dst/SIZE) + abs(i%SIZE-dst%SIZE))
	}
	n := SIZE * SIZE
	dist, prev, done := make([]int, n), make([]int, n), make([]bool, n)
	for i := range dist {
		dist[i], prev[i] = math.MaxInt64, -1
	}
	dist[src] = 0
	q := &pq{{h(src), src}}
	settled := 0
	for q.Len() > 0 {
		u := heap.Pop(q).(entry).node
		if done[u] {
			continue
		}
		done[u] = true
		settled++
		if u == dst {
			break
		}
		for _, v := range nbrs(u) {
			g := dist[u] + cost[key(u, v)]
			if g < dist[v] {
				dist[v], prev[v] = g, u
				heap.Push(q, entry{g + h(v), v})
			}
		}
	}
	path := []int{}
	for v := dst; v != -1; v = prev[v] {
		path = append([]int{v}, path...)
	}
	return dist[dst], settled, path
}

func pathCost(path []int) int {
	s := 0
	for i := 1; i < len(path); i++ {
		s += cost[key(path[i-1], path[i])]
	}
	return s
}

func fmtT(sec int) string { return fmt.Sprintf("%d min %d s", sec/60, sec%60) }

func main() {
	for _, z := range []int{0, 10, 15} {
		x, y := tile(51.5074, -0.1278, z)
		fmt.Printf("London at zoom %d -> tile %d/%d/%d\\n", z, z, x, y)
	}
	var total int64
	for z := 0; z <= 18; z++ {
		t := int64(1) << (2 * z)
		total += t
		if z == 10 || z == 14 || z == 18 {
			fmt.Printf("tiles at zoom %d: %d, cumulative 0..%d: %d\\n", z, t, z, total)
		}
	}
	for r := 0; r < SIZE; r++ {
		for c := 0; c < SIZE; c++ {
			i := r*SIZE + c
			if c+1 < SIZE {
				cost[key(i, i+1)] = 20 + int(math.Floor(rand()*41))
			}
			if r+1 < SIZE {
				cost[key(i, i+SIZE)] = 20 + int(math.Floor(rand()*41))
			}
		}
	}
	src, dst := 5*SIZE+5, 20*SIZE+30
	fmt.Printf("graph: %d intersections, %d road segments; route (5,5) -> (20,30)\\n", SIZE*SIZE, len(cost))
	dEta, dSet, dPath := route(src, dst, false)
	aEta, aSet, aPath := route(src, dst, true)
	fmt.Printf("Dijkstra: eta %s, %d intersections on path, settled %d nodes\\n", fmtT(dEta), len(dPath), dSet)
	fmt.Printf("A*:       eta %s, %d intersections on path, settled %d nodes\\n", fmtT(aEta), len(aPath), aSet)
	mid := len(aPath) / 2 // live traffic: the 6 segments in the middle of the chosen route become 5x slower
	for i := mid - 3; i < mid+3; i++ {
		cost[key(aPath[i], aPath[i+1])] *= 5
	}
	fmt.Printf("jam on 6 segments: old route now takes %s\\n", fmtT(pathCost(aPath)))
	rEta, rSet, rPath := route(src, dst, true)
	shared := 0
	for _, v := range rPath {
		for _, w := range aPath {
			if v == w {
				shared++
				break
			}
		}
	}
	fmt.Printf("reroute with A*: eta %s, shares %d of %d intersections with the old route, settled %d nodes\\n", fmtT(rEta), shared, len(rPath), rSet)
}` },
          { tech: "java", code: `// Maps: slippy-map tile math, Dijkstra vs A* on a road grid, and a reroute after a traffic jam.
import java.util.*;

public class Main {
    static long seed = 2024;
    static double rand() { seed = (seed * 48271) % 2147483647L; return seed / 2147483647.0; }

    static int[] tile(double lat, double lon, int z) {
        double n = Math.pow(2, z), r = lat * Math.PI / 180;
        return new int[] {(int) Math.floor((lon + 180) / 360 * n), (int) Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n)};
    }
    static final int SIZE = 40, MIN_EDGE = 20;
    static Map<Long, Integer> cost = new HashMap<>();
    static long key(int a, int b) { return a < b ? (long) a * 100000 + b : (long) b * 100000 + a; }
    static List<Integer> nbrs(int i) {
        int r = i / SIZE, c = i % SIZE; List<Integer> out = new ArrayList<>();
        if (r > 0) out.add(i - SIZE); if (c > 0) out.add(i - 1); if (c + 1 < SIZE) out.add(i + 1); if (r + 1 < SIZE) out.add(i + SIZE);
        return out;
    }
    static int settled, eta;
    static List<Integer> route(int src, int dst, boolean useH) {
        int n = SIZE * SIZE;
        int[] h = new int[n];
        for (int i = 0; i < n; i++) h[i] = useH ? MIN_EDGE * (Math.abs(i / SIZE - dst / SIZE) + Math.abs(i % SIZE - dst % SIZE)) : 0;
        int[] dist = new int[n], prev = new int[n]; boolean[] done = new boolean[n];
        Arrays.fill(dist, Integer.MAX_VALUE); Arrays.fill(prev, -1);
        PriorityQueue<int[]> q = new PriorityQueue<>((x, y) -> x[0] != y[0] ? Integer.compare(x[0], y[0]) : Integer.compare(x[1], y[1]));
        dist[src] = 0; q.add(new int[] {h[src], src}); settled = 0;
        while (!q.isEmpty()) {
            int u = q.poll()[1];
            if (done[u]) continue;
            done[u] = true; settled++;
            if (u == dst) break;
            for (int v : nbrs(u)) {
                int g = dist[u] + cost.get(key(u, v));
                if (g < dist[v]) { dist[v] = g; prev[v] = u; q.add(new int[] {g + h[v], v}); }
            }
        }
        LinkedList<Integer> path = new LinkedList<>();
        for (int v = dst; v != -1; v = prev[v]) path.addFirst(v);
        eta = dist[dst];
        return path;
    }
    static int pathCost(List<Integer> p) { int s = 0; for (int i = 1; i < p.size(); i++) s += cost.get(key(p.get(i - 1), p.get(i))); return s; }
    static String fmt(int sec) { return (sec / 60) + " min " + (sec % 60) + " s"; }

    public static void main(String[] args) {
        for (int z : new int[] {0, 10, 15}) { int[] t = tile(51.5074, -0.1278, z); System.out.println("London at zoom " + z + " -> tile " + z + "/" + t[0] + "/" + t[1]); }
        long total = 0;
        for (int z = 0; z <= 18; z++) { long t = 1L << (2 * z); total += t; if (z == 10 || z == 14 || z == 18) System.out.println("tiles at zoom " + z + ": " + t + ", cumulative 0.." + z + ": " + total); }
        for (int r = 0; r < SIZE; r++) for (int c = 0; c < SIZE; c++) {
            int i = r * SIZE + c;
            if (c + 1 < SIZE) cost.put(key(i, i + 1), 20 + (int) Math.floor(rand() * 41));
            if (r + 1 < SIZE) cost.put(key(i, i + SIZE), 20 + (int) Math.floor(rand() * 41));
        }
        int src = 5 * SIZE + 5, dst = 20 * SIZE + 30;
        System.out.println("graph: " + SIZE * SIZE + " intersections, " + cost.size() + " road segments; route (5,5) -> (20,30)");
        List<Integer> d = route(src, dst, false); int dEta = eta, dSet = settled;
        List<Integer> a = route(src, dst, true); int aEta = eta, aSet = settled;
        System.out.println("Dijkstra: eta " + fmt(dEta) + ", " + d.size() + " intersections on path, settled " + dSet + " nodes");
        System.out.println("A*:       eta " + fmt(aEta) + ", " + a.size() + " intersections on path, settled " + aSet + " nodes");
        int mid = a.size() / 2; // live traffic: the 6 segments in the middle of the chosen route become 5x slower
        for (int i = mid - 3; i < mid + 3; i++) { long k = key(a.get(i), a.get(i + 1)); cost.put(k, cost.get(k) * 5); }
        System.out.println("jam on 6 segments: old route now takes " + fmt(pathCost(a)));
        List<Integer> re = route(src, dst, true);
        int shared = 0; for (int v : re) if (a.contains(v)) shared++;
        System.out.println("reroute with A*: eta " + fmt(eta) + ", shares " + shared + " of " + re.size() + " intersections with the old route, settled " + settled + " nodes");
    }
}` },
        ],
      },
    ],
  },
  {
    title: `How would you design a real-time gaming leaderboard?`,
    difficulty: "hard",
    seoDescription: `Design a real-time game leaderboard: Redis sorted sets, top-N and rank queries in O(log N), fair tie-breaking, sharding, approximate rank and seasons.`,
    description: `**Question presented to candidate:**
"Our mobile game has 25 million players per season. After every match we want to show the player their global rank, the top 10, and the five players around them, all updated in real time. How would you design the leaderboard?"

**What a strong answer should cover:**
- Why \`ORDER BY score\` with \`OFFSET\` / \`COUNT(*)\` in a relational database gets slow for rank queries at this size, and the **sorted set** (skip list plus hash) that gives **O(log N)** update and rank
- Redis commands: \`ZINCRBY\`, \`ZRANGE ... REV\` (top N), \`ZREVRANK\` (my rank), a range around my rank; memory per member and whether one node is enough
- **Tie-breaking**: equal scores are ordered by member name in Redis; encode "who got there first" into the score and stay under 2^53
- Source of truth: match results in a durable database, the leaderboard as a **rebuildable derived index**; **idempotent** score updates keyed by match id
- Scale-out: **hash sharding** with a scatter-gather top-K merge vs score-range sharding, and **approximate rank** (histogram buckets) for the long tail
- Seasons, regional and friend leaderboards

**Clarifying questions expected:**
- How many players, how many score updates per second at peak, and how many rank reads?
- Does rank need to be exact for everyone, or only for the top players?
- How are ties broken, and when does a season reset?

**Code / implementation expected:** Optional — the design with numbers; the example simulates a Redis sorted set with ranks, ties, sharding and approximate rank.`,
    answer: `**Target Audience:** Developers preparing for system design interviews. You know what a database index and a cache are; sorted sets are explained from scratch.
**Difficulty:** Hard
**Verified with:** Node 22.22, Python 3.12, Go 1.24 and Java 21 (all four print identical output). Redis behaviour and memory were checked on Redis 7.0.15.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All behaviour shown comes from running the example; the **Verified** section quotes the full output. Capacity numbers are worked from stated assumptions.

## 1. Why This Even Matters — A Story First

A marathon has 40,000 runners. Showing the top 10 at the finish line is easy: the organisers watch the first few runners. But every runner also wants to know "what place did I finish?" seconds after crossing the line. If the organisers answered by counting, by hand, everyone who finished ahead, the last runners would wait hours.

A leaderboard is that problem with scores that keep changing. "Top 10" is cheap with any sorted index. "**What is my rank?**" means "how many players have a higher score than me?", and answering it quickly for 25 million players whose scores change after every match needs a structure that keeps both the order and the counts up to date.

📌 **Interview term: rank query** — the position of one player in the sorted order (number of players above them, plus one). The hard query on a leaderboard; top-N is easy.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Players per season, matches per day, peak updates per second? | Sizes memory and write throughput |
| Exact rank for everyone, or exact top and approximate tail? | Approximate rank is far cheaper at huge scale |
| How are ties broken? | Decides the score encoding |
| Global only, or also regional and friends leaderboards? | Extra keys, or a different query shape for friends |
| Season length and reset rules? | Key per season, archival |
| Can clients report scores? | Anti-cheat: scores must come from the game server |

## 3. Requirements

**Functional**
- Record a player's score after each match (add points).
- Top 10 globally; a player's rank and score; the 2 players above and below them.
- Separate leaderboards per season (and optionally per region).

**Non-functional**
- Rank visible within about a second of the match ending.
- Reads under about 10 ms at the server.
- No double counting when the match service retries.
- Scores survive a cache loss: the leaderboard can be rebuilt.

## 4. Capacity Estimate

| Input (assumption) | Value |
| :--- | :--- |
| Players per season | 25 million |
| Daily active players | 5 million, 10 matches each |
| Peak factor | 10x the daily average |
| Reads | each match end reads rank + around-me + top 10; plus leaderboard screen views |
| Memory per sorted-set member | 109 bytes, measured on Redis 7.0.15 with 1 million 14-character member names |

Arithmetic:

- **Updates:** 5,000,000 x 10 / 86,400 = **579/s** average, **5,787/s** at peak.
- **Reads:** a few per update plus browsing, so tens of thousands per second at peak.
- **Memory:** 25,000,000 x 109 bytes = **2.7 GB** for one season.

Both fit on **one Redis node** with replicas. The interesting scale question is not "it does not fit", it is "what if the game is 10x or 100x bigger, or every player opens the leaderboard at once at season end". Method: [back-of-the-envelope capacity estimation](/interview-question/how-do-you-approach-back-of-the-envelope-capacity-estimation).

## 5. Why Not Just SQL?

~~~sql
SELECT COUNT(*) + 1 AS rank FROM scores WHERE season = 7 AND points > :my_points;
~~~

With a B-tree index on \`(season, points)\` the top 10 is fast. The rank query, though, counts every row above you: a player in the middle of 25 million rows makes the database walk about 12.5 million index entries, because ordinary B-trees do not store subtree counts. At 5,787 updates per second each followed by rank reads, that is the bottleneck. A relational database is still the right **source of truth** for match results; the leaderboard is a derived index built for rank queries. More on index behaviour in [database indexing and B-trees](/interview-question/database-indexing-btrees).

## 6. Core Idea: The Sorted Set

📌 **Interview term: sorted set (ZSET)** — a Redis data type holding unique members, each with a numeric score, kept in score order. Large sorted sets are a **skip list** (ordered, with span counts that make rank lookups logarithmic) plus a **hash** from member to score. On Redis 7.0.15, a set with 128 members was still \`listpack\` (a compact array) and became \`skiplist\` above the default \`zset-max-listpack-entries\` of 128.

📌 **Interview term: skip list** — a linked list with extra "express lane" levels. Searching starts in the top lane and drops down, so it takes O(log N) steps; storing how many elements each express link skips lets Redis compute a rank while searching.

The commands (complexities from Redis \`COMMAND DOCS\` on 7.0.15):

| Need | Command | Cost |
| :--- | :--- | :--- |
| Add points after a match | \`ZINCRBY lb:s7 120 player:42\` | O(log N) |
| Top 10 | \`ZRANGE lb:s7 0 9 REV WITHSCORES\` (the \`REV\` option since 6.2.0; older code uses \`ZREVRANGE\`) | O(log N + M) |
| My rank | \`ZREVRANK lb:s7 player:42\` | O(log N) |
| Players around me | \`ZRANGE lb:s7 rank-2 rank+2 REV WITHSCORES\` | O(log N + M) |
| Scores of my friends | \`ZMSCORE lb:s7 f1 f2 ...\` (since 6.2.0) | O(number requested) |

The example simulates this on 100,000 players and 500,000 score events:

~~~text
500000 ZINCRBY events over 100000 players
top 3: #1 p000000 41975, #2 p000001 16572, #3 p000002 11628
p054321 has 12 points, rank #93387
around me: #93385 p054761 12, #93386 p054474 12, #93387 p054321 12, #93388 p053669 12, #93389 p053654 12
~~~

The player at rank 93,387 sees the 2 above and 2 below; all five have 12 points, which raises the next problem.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="Game servers send match results to a score service, which writes a match table in the database and increments the Redis sorted set; the leaderboard API reads top N, rank and around-me from Redis; a rebuild job can reload Redis from the database">
  <defs>
    <marker id="sd17q4-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="130" height="56" rx="10"/>
  <text class="d-text" x="85" y="65" text-anchor="middle">game</text>
  <text class="d-sub" x="85" y="84" text-anchor="middle">servers</text>
  <rect class="d-box" x="210" y="40" width="140" height="56" rx="10"/>
  <text class="d-text" x="280" y="65" text-anchor="middle">score</text>
  <text class="d-sub" x="280" y="84" text-anchor="middle">service</text>
  <rect class="d-box" x="420" y="40" width="150" height="56" rx="10"/>
  <text class="d-text" x="495" y="65" text-anchor="middle">database</text>
  <text class="d-sub" x="495" y="84" text-anchor="middle">match results</text>
  <rect class="d-box-accent" x="210" y="200" width="140" height="56" rx="10"/>
  <text class="d-text" x="280" y="225" text-anchor="middle">Redis ZSET</text>
  <text class="d-sub" x="280" y="244" text-anchor="middle">per season</text>
  <rect class="d-box" x="420" y="200" width="150" height="56" rx="10"/>
  <text class="d-text" x="495" y="225" text-anchor="middle">leaderboard</text>
  <text class="d-sub" x="495" y="244" text-anchor="middle">API</text>
  <rect class="d-box-muted" x="620" y="200" width="120" height="56" rx="10"/>
  <text class="d-text" x="680" y="233" text-anchor="middle">players</text>
  <path class="d-edge" d="M 150 68 L 204 68" marker-end="url(#sd17q4-arrow)"/>
  <path class="d-edge" d="M 350 68 L 414 68" marker-end="url(#sd17q4-arrow)"/>
  <path class="d-edge-accent" d="M 280 96 L 280 194" marker-end="url(#sd17q4-arrow)"/>
  <path class="d-edge-dashed" d="M 470 96 L 330 196" marker-end="url(#sd17q4-arrow)"/>
  <path class="d-edge" d="M 414 228 L 356 228" marker-end="url(#sd17q4-arrow)"/>
  <path class="d-edge" d="M 614 228 L 576 228" marker-end="url(#sd17q4-arrow)"/>
</svg>

The score service writes each match result to the database first, then increments the sorted set; the dashed arrow is the rebuild path that reloads Redis from the database after a loss or a bug. Players only ever read through the leaderboard API.

## 7. Deep Dive 1: Ties

~~~text
plain score tie order: p000002 then p000001 (by member name, not by who was first)
composite score order: p000001=967441383422 then p000002=967441383421
max points before passing 2^53: 8388607
~~~

Two players reach 900 points; p000001 got there first. Redis orders equal scores by member name (for \`ZREVRANGE\`, descending lexicographic order, per the Redis docs; confirmed on 7.0.15, where \`ZRANGE ... REV\` returned p000002 before p000001). So the plain leaderboard shows **p000002 first, which is unfair**.

📌 **Interview term: composite score** — pack the tie-breaker into the score itself: \`points x 2^30 + (2^30 - 1 - t)\`, where t is when the player reached that score (a sequence or seconds since season start). Higher points always win; for equal points, the smaller t gives the larger score. In the run p000001 got 967,441,383,422 and p000002 got 967,441,383,421, so p000001 now ranks first.

The constraint: Redis scores are IEEE 754 doubles, and integers are exact only between -(2^53) and +(2^53) (Redis \`ZADD\` docs). With 30 bits for the tie-breaker, points must stay at or below **8,388,607** (the run computes 2^53 / 2^30 - 1). Pick the split for your game: a season of 2^30 seconds is 34 years, which is far more than needed, so fewer tie bits leave more room for points.

## 8. Deep Dive 2: Correctness of Updates

- **Idempotency.** The match service may retry "add 120 points for match m-981". Record \`(match_id, player_id)\` in the database with a unique constraint in the same transaction as the result; only if the insert succeeds, apply \`ZINCRBY\`. Better: let a single consumer read committed results (an outbox or change stream) and apply them, so a crash between the two writes is replayed, not lost. See [idempotency](/interview-question/what-is-idempotency-and-why-does-it-matter) and the [outbox pattern](/interview-question/outbox-pattern-vs-polling-for-cdc-how-do-you-avoid-dual-write-failure).
- **Server-authoritative scores.** Only game servers send results; clients never call \`ZINCRBY\` directly.
- **Rebuild.** If Redis is lost, replay the season's results from the database into a new key and switch over. With replicas and append-only persistence this is rare, but it is what makes the cache safe to treat as derived.

## 9. Deep Dive 3: Beyond One Node

One node is enough for the stated numbers. At 10x or 100x, there are two ways to split one leaderboard:

~~~text
hash-sharded top 10: read 40 entries from 4 shards, same as exact: true
rank of p054321 via ZCOUNT of higher scores on every shard: #93114 (4 calls; tied players share it)
score-range shards [0,1000) [1000,3000) [3000,10000) [10000,inf): 99575 381 40 4
~~~

📌 **Interview term: scatter-gather top-K** — with players hashed across shards, each shard returns its own top 10 and the service merges them. The global top 10 must be among those 40 entries, so the run matched the exact answer. Rank is a scatter-gather too: ask every shard how many players have a higher score (\`ZCOUNT key (score +inf\`) and add them up.

Note the two different ranks in the run: \`ZREVRANK\` said **#93,387** (a position: tied players are ordered by name), while counting strictly higher scores said **#93,114** (a competition rank: everyone with 12 points shares it). Decide which one the product shows; with a composite score the two agree because no two players tie.

**Score-range sharding** (players with 0 to 999 points on shard 0, and so on) makes rank easy (all shards above yours are fully above you), but the run shows the problem: **99,575 of 100,000 players** sat on the lowest shard. Score distributions are heavily skewed, so range shards are uneven and players move between shards as they improve.

| Approach | Top 10 | Rank of one player | Balance |
| :--- | :--- | :--- | :--- |
| One sorted set | one call, O(log N + 10) | one call, O(log N) | one node |
| Hash-sharded, k shards | k calls, merge k x 10 entries | k \`ZCOUNT\` calls | even |
| Score-range shards | the top shard only | count of higher shards + one rank call | skewed |

## 10. Deep Dive 4: Approximate Rank for the Long Tail

Most players do not need an exact rank of 93,387; "top 7%" is just as meaningful. Keep a histogram: a hash of score bucket to player count (here 100-point buckets), updated on every score change (decrement the old bucket, increment the new).

~~~text
histogram buckets: 62
  p054321 score 12: exact #93387, estimated #92921
  p090000 score 48: exact #73354, estimated #73318
  p000300 score 1330: exact #244, estimated #239
~~~

**62 buckets** replace 100,000 members for rank purposes. The estimate for p054321 was #92,921 against the exact #93,387 (0.5% off), and for p000300 #239 against #244. A common hybrid: exact rank from the sorted set for the top 10,000 (a sorted set trimmed to that size), approximate rank from the histogram for everyone else. That keeps the hot structure small no matter how many players exist.

📌 **Interview term: approximate rank (histogram)** — rank estimated from counts per score bucket: all players in higher buckets plus a proportional share of your own bucket. Constant memory per bucket instead of per player.

## 11. Seasons, Regions and Friends

- **Seasons**: one key per season (\`lb:s7\`); the new season starts with a new key, the old one is archived to the database and expired.
- **Regions**: separate keys (\`lb:s7:eu\`), updated alongside the global key in the same pipeline.
- **Friends**: do not keep a sorted set per player of their friends. Fetch the friend list (hundreds of ids), then \`ZMSCORE lb:s7 f1 f2 ...\` and sort the few hundred results in the service.

## 12. What Breaks First at 10x

At 250 million players and 57,870 updates per second at peak:
- **Memory** on one node: 250 million x 109 bytes = 27 GB, possible but heavy for failover. Hash-shard, or keep only the top 10,000 exactly and use the histogram for the rest.
- **Season-end read storm**: everyone opens the leaderboard at once; cache the top 100 for one second at the API and serve it from many replicas.
- **Write hot spots**: one sorted set takes every update; pipeline updates in small batches from the score consumer.

## 13. Verified: Running the Code

The example **"Leaderboard on a simulated Redis sorted set: rank, around-me, tie-breaking, sharded top-K and approximate rank"** was run with \`node main.js\` (Node 22.22), \`python3.12 main.py\`, \`go run main.go\` (Go 1.24) and Java 21. All four print exactly this:

~~~text
500000 ZINCRBY events over 100000 players
top 3: #1 p000000 41975, #2 p000001 16572, #3 p000002 11628
p054321 has 12 points, rank #93387
around me: #93385 p054761 12, #93386 p054474 12, #93387 p054321 12, #93388 p053669 12, #93389 p053654 12
plain score tie order: p000002 then p000001 (by member name, not by who was first)
composite score order: p000001=967441383422 then p000002=967441383421
max points before passing 2^53: 8388607
hash-sharded top 10: read 40 entries from 4 shards, same as exact: true
rank of p054321 via ZCOUNT of higher scores on every shard: #93114 (4 calls; tied players share it)
score-range shards [0,1000) [1000,3000) [3000,10000) [10000,inf): 99575 381 40 4
histogram buckets: 62
  p054321 score 12: exact #93387, estimated #92921
  p090000 score 48: exact #73354, estimated #73318
  p000300 score 1330: exact #244, estimated #239
~~~

What the simulation stands for and what it leaves out: the \`ZSet\` class keeps a member-to-score map and sorts on every read, standing for a Redis sorted set (which keeps the order incrementally in a skip list); its ordering rule matches Redis for \`ZREVRANGE\`, score descending then member descending. Scores come from a seeded random generator in which low-numbered players play more, which makes the distribution skewed like a real game. There is no network, persistence, replication or concurrency.

## Edge Cases Worth Knowing

- **Score decreases** (penalties, rollbacks of cheating): \`ZINCRBY\` with a negative value, plus a histogram update; for a ban, \`ZREM\`.
- **Players with no matches**: decide whether they appear with 0 points or not at all; it changes everyone's rank and memory.
- **Composite scores and display**: always divide by 2^30 (or your split) before showing points.
- **Float scores**: if points are fractional, multiply to integers first, or the composite trick and exact ties break.
- **Rank pagination**: "page 4,000 of the leaderboard" is a \`ZRANGE\` by rank, still O(log N + M).

## Common Pitfalls

- **Rank by \`COUNT(*)\` in SQL** — counts every row above the player; fine for top 10, slow for rank in the middle.
- **Ignoring ties** — Redis orders equal scores by member name, so the run showed p000002 ahead of the player who reached 900 first.
- **Composite scores past 2^53** — with 30 tie bits, points above 8,388,607 lose precision silently.
- **Redis as the only copy** — keep match results in a database and make the leaderboard rebuildable.
- **Score-range sharding without checking the distribution** — 99,575 of 100,000 players landed on one shard in the run.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Scope:</strong> <span style="color:#f0e2c8;">I clarify players per season, peak updates, whether rank must be exact for everyone, and tie rules. With 25 million players and about 5,800 updates per second at peak, one Redis node holds it: about <strong style="color:#ffca28;">2.7 GB</strong> at 109 bytes per member.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Core structure:</strong> <span style="color:#f0e2c8;">A Redis <strong style="color:#ffca28;">sorted set</strong> per season: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ZINCRBY</code> after each match, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ZRANGE 0 9 REV</code> for the top 10, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ZREVRANK</code> for my rank and a rank range for around-me, all O(log N) thanks to the <strong style="color:#ffca28;">skip list</strong> with span counts.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Correctness:</strong> <span style="color:#f0e2c8;">Match results go to a database first with a unique match id, then a single consumer applies <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ZINCRBY</code>, so retries never double count and Redis can be <strong style="color:#ffca28;">rebuilt</strong> from the database. Only game servers submit scores.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Ties:</strong> <span style="color:#f0e2c8;">Redis orders equal scores by member name, so I use a <strong style="color:#ffca28;">composite score</strong> <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">points x 2^30 + (2^30 - 1 - t)</code> so the earlier achiever wins, staying under 2^53 — points up to 8,388,607 with 30 tie bits.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Scale:</strong> <span style="color:#f0e2c8;">Beyond one node I <strong style="color:#ffca28;">hash-shard</strong> and scatter-gather: the global top 10 is the merge of each shard top 10 (40 entries for 4 shards in my run), rank is the sum of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ZCOUNT</code> per shard. For the long tail I give <strong style="color:#ffca28;">approximate rank</strong> from a 62-bucket histogram, 0.5% off in my run.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a skip list and not a balanced tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both give O(log N); Redis chose a skip list with span counts per link, which makes rank computation part of the search and is simpler to implement and to range-scan. The interview point is the span counts: without them, rank would be O(N).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you show a friends leaderboard?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fetch the friend ids, call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ZMSCORE</code> for their scores in one round trip, and sort those few hundred in the service. A sorted set per player would multiply writes by the number of friends.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens at season end?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The new season writes to a new key from the first match. The old key is snapshotted to the database for the history screen, then expired. The top 100 of the final standings is cached because everyone looks at it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle 100,000 updates per second on one leaderboard?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Batch updates through a consumer that pipelines <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ZINCRBY</code> calls; if one node still cannot keep up, hash-shard players across several sorted sets and scatter-gather the reads, or keep an exact top-10,000 set plus a histogram for everyone else.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can two players have the same rank?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With plain scores, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ZREVRANK</code> gives a position (ties ordered by name) while counting higher scores gives a shared competition rank: in my run 93,387 vs 93,114 for the same player. With a composite score there are no ties, so the two agree.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Rank query | A player position: the number of players above them, plus one |
| Sorted set (ZSET) | Redis type of unique members ordered by a numeric score |
| Skip list | Linked list with express lanes; O(log N) search and, with span counts, rank |
| Composite score | Points and a tie-breaker packed into one number |
| Scatter-gather top-K | Each shard returns its top K; the service merges them |
| Approximate rank (histogram) | Rank estimated from player counts per score bucket |

**Conclusion:** A real-time leaderboard is a rank-query problem, and the sorted set — a skip list with span counts plus a member hash — answers top-N, my rank and around-me in O(log N). At 25 million players it is about 2.7 GB on one Redis node, kept correct by writing match results to a database first, applying score increments idempotently, and treating Redis as a rebuildable index. The run showed the details interviewers probe: ties ordered by member name unless a composite score encodes who was first (within 2^53), hash shards whose top-10 merge matches the exact answer, score-range shards that put 99.6% of players on one shard, and a 62-bucket histogram that estimates rank within 0.5%.`,
    examples: [
      {
        label: `Leaderboard on a simulated Redis sorted set: rank, around-me, tie-breaking, sharded top-K and approximate rank`,
        variants: [
          { tech: "node", code: `// Leaderboard: a simulated Redis sorted set (ZINCRBY, ZREVRANGE, ZREVRANK), tie-breaking,
// hash-sharded top-K merge, and a histogram for approximate rank.
let seed = 99;
function rand() { seed = (seed * 48271) % 2147483647; return seed / 2147483647; }

class ZSet { // standing for one Redis sorted set; Redis keeps a skip list, here we sort on read
  constructor() { this.score = new Map(); }
  zincrby(member, by) { this.score.set(member, (this.score.get(member) || 0) + by); }
  zadd(member, s) { this.score.set(member, s); }
  sorted() { // Redis order for ZREVRANGE: score descending, equal scores by member descending
    return [...this.score].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0));
  }
  zrevrange(start, stop) { return this.sorted().slice(start, stop + 1); }
  zrevrank(member) { return this.sorted().findIndex(([m]) => m === member); }
  countAbove(s) { let n = 0; for (const v of this.score.values()) if (v > s) n++; return n; } // ZCOUNT key (s +inf
}
const name = (i) => "p" + String(i).padStart(6, "0");
const PLAYERS = 100000, EVENTS = 500000;
const board = new ZSet();
for (let i = 0; i < PLAYERS; i++) board.zadd(name(i), 0);
for (let e = 0; e < EVENTS; e++) { const r = rand(); board.zincrby(name(Math.floor(PLAYERS * r * r)), 1 + Math.floor(rand() * 50)); }
const show = (rows, base) => rows.map(([m, s], i) => "#" + (base + i + 1) + " " + m + " " + s).join(", ");
console.log(EVENTS + " ZINCRBY events over " + PLAYERS + " players");
console.log("top 3: " + show(board.zrevrange(0, 2), 0));
const me = name(54321), rank = board.zrevrank(me);
console.log(me + " has " + board.score.get(me) + " points, rank #" + (rank + 1));
console.log("around me: " + show(board.zrevrange(rank - 2, rank + 2), rank - 2));

// Ties: two players reach 900 points, p000001 first (t=1), p000002 later (t=2).
const ties = new ZSet(); ties.zadd("p000001", 900); ties.zadd("p000002", 900);
console.log("plain score tie order: " + ties.zrevrange(0, 1).map(([m]) => m).join(" then ") + " (by member name, not by who was first)");
const T = 2 ** 30; // composite score = points * 2^30 + (2^30 - 1 - t): earlier t wins, and it stays below 2^53
const fair = new ZSet(); fair.zadd("p000001", 900 * T + (T - 1 - 1)); fair.zadd("p000002", 900 * T + (T - 1 - 2));
console.log("composite score order: " + fair.zrevrange(0, 1).map(([m, s]) => m + "=" + s).join(" then "));
console.log("max points before passing 2^53: " + (2 ** 53 / T - 1));

// Hash sharding: 4 sorted sets; the global top 10 is the merge of each shard top 10.
const SHARDS = 4, shards = Array.from({ length: SHARDS }, () => new ZSet());
for (const [m, s] of board.score) shards[Number(m.slice(1)) % SHARDS].zadd(m, s);
const merged = [];
for (const sh of shards) merged.push(...sh.zrevrange(0, 9));
merged.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? 1 : -1));
const exactTop = board.zrevrange(0, 9).map(([m]) => m).join(","), mergedTop = merged.slice(0, 10).map(([m]) => m).join(",");
console.log("hash-sharded top 10: read " + merged.length + " entries from " + SHARDS + " shards, same as exact: " + (exactTop === mergedTop));
let above = 0; for (const sh of shards) above += sh.countAbove(board.score.get(me));
console.log("rank of " + me + " via ZCOUNT of higher scores on every shard: #" + (above + 1) + " (" + SHARDS + " calls; tied players share it)");

// Score-range sharding puts most players on the low shard.
const bounds = [1000, 3000, 10000];
const sizes = [0, 0, 0, 0]; for (const s of board.score.values()) { let k = 0; while (k < 3 && s >= bounds[k]) k++; sizes[k]++; }
console.log("score-range shards [0,1000) [1000,3000) [3000,10000) [10000,inf): " + sizes.join(" "));

// Approximate rank from a histogram of 100-point buckets (one small hash instead of N members).
const W = 100, hist = new Map(); for (const s of board.score.values()) { const b = Math.floor(s / W); hist.set(b, (hist.get(b) || 0) + 1); }
function approxRank(s) {
  const b = Math.floor(s / W); let higher = 0;
  for (const [k, n] of hist) if (k > b) higher += n;
  return higher + Math.floor(hist.get(b) * ((b + 1) * W - 1 - s) / W) + 1;
}
console.log("histogram buckets: " + hist.size);
for (const i of [54321, 90000, 300]) {
  const m = name(i), s = board.score.get(m);
  console.log("  " + m + " score " + s + ": exact #" + (board.zrevrank(m) + 1) + ", estimated #" + approxRank(s));
}` },
          { tech: "python", code: `# Leaderboard: a simulated Redis sorted set (ZINCRBY, ZREVRANGE, ZREVRANK), tie-breaking,
# hash-sharded top-K merge, and a histogram for approximate rank.
import math

seed = 99


def rand():
    global seed
    seed = (seed * 48271) % 2147483647
    return seed / 2147483647


def redis_order(rows):  # score descending, equal scores by member descending
    rows = sorted(rows, key=lambda r: r[0], reverse=True)
    rows.sort(key=lambda r: r[1], reverse=True)
    return rows


class ZSet:  # standing for one Redis sorted set; Redis keeps a skip list, here we sort on read
    def __init__(self):
        self.score = {}

    def zincrby(self, m, by):
        self.score[m] = self.score.get(m, 0) + by

    def zadd(self, m, s):
        self.score[m] = s

    def sorted(self):
        return redis_order(list(self.score.items()))

    def zrevrange(self, start, stop):
        return self.sorted()[start:stop + 1]

    def zrevrank(self, m):
        return next(i for i, r in enumerate(self.sorted()) if r[0] == m)

    def count_above(self, s):  # ZCOUNT key (s +inf
        return sum(1 for v in self.score.values() if v > s)


def name(i):
    return f"p{i:06d}"


PLAYERS, EVENTS = 100000, 500000
board = ZSet()
for i in range(PLAYERS):
    board.zadd(name(i), 0)
for e in range(EVENTS):
    r = rand()
    board.zincrby(name(math.floor(PLAYERS * r * r)), 1 + math.floor(rand() * 50))


def show(rows, base):
    return ", ".join(f"#{base + i + 1} {m} {s}" for i, (m, s) in enumerate(rows))


print(f"{EVENTS} ZINCRBY events over {PLAYERS} players")
print("top 3: " + show(board.zrevrange(0, 2), 0))
me = name(54321)
rank = board.zrevrank(me)
print(f"{me} has {board.score[me]} points, rank #{rank + 1}")
print("around me: " + show(board.zrevrange(rank - 2, rank + 2), rank - 2))

ties = ZSet()  # two players reach 900 points, p000001 first (t=1), p000002 later (t=2)
ties.zadd("p000001", 900)
ties.zadd("p000002", 900)
print("plain score tie order: " + " then ".join(m for m, _ in ties.zrevrange(0, 1)) + " (by member name, not by who was first)")
T = 2 ** 30  # composite score = points * 2^30 + (2^30 - 1 - t): earlier t wins, and it stays below 2^53
fair = ZSet()
fair.zadd("p000001", 900 * T + (T - 1 - 1))
fair.zadd("p000002", 900 * T + (T - 1 - 2))
print("composite score order: " + " then ".join(f"{m}={s}" for m, s in fair.zrevrange(0, 1)))
print(f"max points before passing 2^53: {2 ** 53 // T - 1}")

SHARDS = 4  # hash sharding: the global top 10 is the merge of each shard top 10
shards = [ZSet() for _ in range(SHARDS)]
for m, s in board.score.items():
    shards[int(m[1:]) % SHARDS].zadd(m, s)
merged = []
for sh in shards:
    merged.extend(sh.zrevrange(0, 9))
merged = redis_order(merged)
exact_top = ",".join(m for m, _ in board.zrevrange(0, 9))
merged_top = ",".join(m for m, _ in merged[:10])
print(f"hash-sharded top 10: read {len(merged)} entries from {SHARDS} shards, same as exact: {'true' if exact_top == merged_top else 'false'}")
above = sum(sh.count_above(board.score[me]) for sh in shards)
print(f"rank of {me} via ZCOUNT of higher scores on every shard: #{above + 1} ({SHARDS} calls; tied players share it)")

bounds = [1000, 3000, 10000]  # score-range sharding puts most players on the low shard
sizes = [0, 0, 0, 0]
for s in board.score.values():
    k = 0
    while k < 3 and s >= bounds[k]:
        k += 1
    sizes[k] += 1
print("score-range shards [0,1000) [1000,3000) [3000,10000) [10000,inf): " + " ".join(str(n) for n in sizes))

W = 100  # approximate rank from a histogram of 100-point buckets (one small hash instead of N members)
hist = {}
for s in board.score.values():
    hist[s // W] = hist.get(s // W, 0) + 1


def approx_rank(s):
    b = s // W
    higher = sum(n for k, n in hist.items() if k > b)
    return higher + hist[b] * ((b + 1) * W - 1 - s) // W + 1


print(f"histogram buckets: {len(hist)}")
for i in (54321, 90000, 300):
    m = name(i)
    s = board.score[m]
    print(f"  {m} score {s}: exact #{board.zrevrank(m) + 1}, estimated #{approx_rank(s)}")` },
          { tech: "go", code: `// Leaderboard: a simulated Redis sorted set (ZINCRBY, ZREVRANGE, ZREVRANK), tie-breaking,
// hash-sharded top-K merge, and a histogram for approximate rank.
package main

import (
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
)

var seed int64 = 99

func rand() float64 { seed = (seed * 48271) % 2147483647; return float64(seed) / 2147483647 }

type row struct {
	m string
	s int64
}

func redisOrder(rows []row) { // score descending, equal scores by member descending
	sort.Slice(rows, func(i, j int) bool {
		if rows[i].s != rows[j].s {
			return rows[i].s > rows[j].s
		}
		return rows[i].m > rows[j].m
	})
}

type ZSet struct{ score map[string]int64 } // standing for one Redis sorted set; Redis keeps a skip list, here we sort on read

func newZSet() *ZSet                          { return &ZSet{map[string]int64{}} }
func (z *ZSet) zincrby(m string, by int64)    { z.score[m] += by }
func (z *ZSet) zadd(m string, s int64)        { z.score[m] = s }
func (z *ZSet) sorted() []row {
	rows := make([]row, 0, len(z.score))
	for m, s := range z.score {
		rows = append(rows, row{m, s})
	}
	redisOrder(rows)
	return rows
}
func (z *ZSet) zrevrange(start, stop int) []row { r := z.sorted(); return r[start : stop+1] }
func (z *ZSet) zrevrank(m string) int {
	for i, r := range z.sorted() {
		if r.m == m {
			return i
		}
	}
	return -1
}
func (z *ZSet) countAbove(s int64) int { // ZCOUNT key (s +inf
	n := 0
	for _, v := range z.score {
		if v > s {
			n++
		}
	}
	return n
}

func name(i int) string { return fmt.Sprintf("p%06d", i) }

func show(rows []row, base int) string {
	parts := []string{}
	for i, r := range rows {
		parts = append(parts, fmt.Sprintf("#%d %s %d", base+i+1, r.m, r.s))
	}
	return strings.Join(parts, ", ")
}

func main() {
	const PLAYERS, EVENTS = 100000, 500000
	board := newZSet()
	for i := 0; i < PLAYERS; i++ {
		board.zadd(name(i), 0)
	}
	for e := 0; e < EVENTS; e++ {
		r := rand()
		board.zincrby(name(int(math.Floor(PLAYERS*r*r))), 1+int64(math.Floor(rand()*50)))
	}
	fmt.Printf("%d ZINCRBY events over %d players\\n", EVENTS, PLAYERS)
	fmt.Println("top 3: " + show(board.zrevrange(0, 2), 0))
	me := name(54321)
	rank := board.zrevrank(me)
	fmt.Printf("%s has %d points, rank #%d\\n", me, board.score[me], rank+1)
	fmt.Println("around me: " + show(board.zrevrange(rank-2, rank+2), rank-2))

	ties := newZSet() // two players reach 900 points, p000001 first (t=1), p000002 later (t=2)
	ties.zadd("p000001", 900)
	ties.zadd("p000002", 900)
	tr := ties.zrevrange(0, 1)
	fmt.Println("plain score tie order: " + tr[0].m + " then " + tr[1].m + " (by member name, not by who was first)")
	const T = int64(1) << 30 // composite score = points * 2^30 + (2^30 - 1 - t): earlier t wins, and it stays below 2^53
	fair := newZSet()
	fair.zadd("p000001", 900*T+(T-1-1))
	fair.zadd("p000002", 900*T+(T-1-2))
	fr := fair.zrevrange(0, 1)
	fmt.Printf("composite score order: %s=%d then %s=%d\\n", fr[0].m, fr[0].s, fr[1].m, fr[1].s)
	fmt.Printf("max points before passing 2^53: %d\\n", (int64(1)<<53)/T-1)

	const SHARDS = 4 // hash sharding: the global top 10 is the merge of each shard top 10
	shards := make([]*ZSet, SHARDS)
	for i := range shards {
		shards[i] = newZSet()
	}
	for m, s := range board.score {
		id, _ := strconv.Atoi(m[1:])
		shards[id%SHARDS].zadd(m, s)
	}
	merged := []row{}
	for _, sh := range shards {
		merged = append(merged, sh.zrevrange(0, 9)...)
	}
	redisOrder(merged)
	a, b := []string{}, []string{}
	for _, r := range board.zrevrange(0, 9) {
		a = append(a, r.m)
	}
	for _, r := range merged[:10] {
		b = append(b, r.m)
	}
	fmt.Printf("hash-sharded top 10: read %d entries from %d shards, same as exact: %t\\n", len(merged), SHARDS, strings.Join(a, ",") == strings.Join(b, ","))
	above := 0
	for _, sh := range shards {
		above += sh.countAbove(board.score[me])
	}
	fmt.Printf("rank of %s via ZCOUNT of higher scores on every shard: #%d (%d calls; tied players share it)\\n", me, above+1, SHARDS)

	bounds := []int64{1000, 3000, 10000} // score-range sharding puts most players on the low shard
	sizes := []int{0, 0, 0, 0}
	for _, s := range board.score {
		k := 0
		for k < 3 && s >= bounds[k] {
			k++
		}
		sizes[k]++
	}
	fmt.Printf("score-range shards [0,1000) [1000,3000) [3000,10000) [10000,inf): %d %d %d %d\\n", sizes[0], sizes[1], sizes[2], sizes[3])

	const W = 100 // approximate rank from a histogram of 100-point buckets (one small hash instead of N members)
	hist := map[int64]int64{}
	for _, s := range board.score {
		hist[s/W]++
	}
	approx := func(s int64) int64 {
		bk := s / W
		var higher int64
		for k, n := range hist {
			if k > bk {
				higher += n
			}
		}
		return higher + hist[bk]*((bk+1)*W-1-s)/W + 1
	}
	fmt.Printf("histogram buckets: %d\\n", len(hist))
	for _, i := range []int{54321, 90000, 300} {
		m := name(i)
		s := board.score[m]
		fmt.Printf("  %s score %d: exact #%d, estimated #%d\\n", m, s, board.zrevrank(m)+1, approx(s))
	}
}` },
          { tech: "java", code: `// Leaderboard: a simulated Redis sorted set (ZINCRBY, ZREVRANGE, ZREVRANK), tie-breaking,
// hash-sharded top-K merge, and a histogram for approximate rank.
import java.util.*;

public class Main {
    static long seed = 99;
    static double rand() { seed = (seed * 48271) % 2147483647L; return seed / 2147483647.0; }

    record Row(String m, long s) {}
    // score descending, equal scores by member descending
    static final Comparator<Row> REDIS_ORDER = (x, y) -> x.s() != y.s() ? Long.compare(y.s(), x.s()) : y.m().compareTo(x.m());

    static class ZSet { // standing for one Redis sorted set; Redis keeps a skip list, here we sort on read
        Map<String, Long> score = new HashMap<>();
        void zincrby(String m, long by) { score.merge(m, by, Long::sum); }
        void zadd(String m, long s) { score.put(m, s); }
        List<Row> sorted() { List<Row> r = new ArrayList<>(); for (var e : score.entrySet()) r.add(new Row(e.getKey(), e.getValue())); r.sort(REDIS_ORDER); return r; }
        List<Row> zrevrange(int start, int stop) { return sorted().subList(start, stop + 1); }
        int zrevrank(String m) { List<Row> r = sorted(); for (int i = 0; i < r.size(); i++) if (r.get(i).m().equals(m)) return i; return -1; }
        int countAbove(long s) { int n = 0; for (long v : score.values()) if (v > s) n++; return n; } // ZCOUNT key (s +inf
    }
    static String name(int i) { return String.format("p%06d", i); }
    static String show(List<Row> rows, int base) {
        List<String> p = new ArrayList<>();
        for (int i = 0; i < rows.size(); i++) p.add("#" + (base + i + 1) + " " + rows.get(i).m() + " " + rows.get(i).s());
        return String.join(", ", p);
    }

    public static void main(String[] args) {
        final int PLAYERS = 100000, EVENTS = 500000;
        ZSet board = new ZSet();
        for (int i = 0; i < PLAYERS; i++) board.zadd(name(i), 0);
        for (int e = 0; e < EVENTS; e++) { double r = rand(); board.zincrby(name((int) Math.floor(PLAYERS * r * r)), 1 + (long) Math.floor(rand() * 50)); }
        System.out.println(EVENTS + " ZINCRBY events over " + PLAYERS + " players");
        System.out.println("top 3: " + show(board.zrevrange(0, 2), 0));
        String me = name(54321); int rank = board.zrevrank(me);
        System.out.println(me + " has " + board.score.get(me) + " points, rank #" + (rank + 1));
        System.out.println("around me: " + show(board.zrevrange(rank - 2, rank + 2), rank - 2));

        ZSet ties = new ZSet(); // two players reach 900 points, p000001 first (t=1), p000002 later (t=2)
        ties.zadd("p000001", 900); ties.zadd("p000002", 900);
        List<Row> tr = ties.zrevrange(0, 1);
        System.out.println("plain score tie order: " + tr.get(0).m() + " then " + tr.get(1).m() + " (by member name, not by who was first)");
        final long T = 1L << 30; // composite score = points * 2^30 + (2^30 - 1 - t): earlier t wins, and it stays below 2^53
        ZSet fair = new ZSet(); fair.zadd("p000001", 900 * T + (T - 1 - 1)); fair.zadd("p000002", 900 * T + (T - 1 - 2));
        List<Row> fr = fair.zrevrange(0, 1);
        System.out.println("composite score order: " + fr.get(0).m() + "=" + fr.get(0).s() + " then " + fr.get(1).m() + "=" + fr.get(1).s());
        System.out.println("max points before passing 2^53: " + ((1L << 53) / T - 1));

        final int SHARDS = 4; // hash sharding: the global top 10 is the merge of each shard top 10
        List<ZSet> shards = new ArrayList<>(); for (int i = 0; i < SHARDS; i++) shards.add(new ZSet());
        for (var e : board.score.entrySet()) shards.get(Integer.parseInt(e.getKey().substring(1)) % SHARDS).zadd(e.getKey(), e.getValue());
        List<Row> merged = new ArrayList<>();
        for (ZSet sh : shards) merged.addAll(sh.zrevrange(0, 9));
        merged.sort(REDIS_ORDER);
        List<String> a = new ArrayList<>(), b = new ArrayList<>();
        for (Row r : board.zrevrange(0, 9)) a.add(r.m());
        for (Row r : merged.subList(0, 10)) b.add(r.m());
        System.out.println("hash-sharded top 10: read " + merged.size() + " entries from " + SHARDS + " shards, same as exact: " + a.equals(b));
        int above = 0; for (ZSet sh : shards) above += sh.countAbove(board.score.get(me));
        System.out.println("rank of " + me + " via ZCOUNT of higher scores on every shard: #" + (above + 1) + " (" + SHARDS + " calls; tied players share it)");

        long[] bounds = {1000, 3000, 10000}; // score-range sharding puts most players on the low shard
        int[] sizes = new int[4];
        for (long s : board.score.values()) { int k = 0; while (k < 3 && s >= bounds[k]) k++; sizes[k]++; }
        System.out.println("score-range shards [0,1000) [1000,3000) [3000,10000) [10000,inf): " + sizes[0] + " " + sizes[1] + " " + sizes[2] + " " + sizes[3]);

        final long W = 100; // approximate rank from a histogram of 100-point buckets (one small hash instead of N members)
        Map<Long, Long> hist = new HashMap<>();
        for (long s : board.score.values()) hist.merge(s / W, 1L, Long::sum);
        System.out.println("histogram buckets: " + hist.size());
        for (int i : new int[] {54321, 90000, 300}) {
            String m = name(i); long s = board.score.get(m), bk = s / W, higher = 0;
            for (var e : hist.entrySet()) if (e.getKey() > bk) higher += e.getValue();
            long est = higher + hist.get(bk) * ((bk + 1) * W - 1 - s) / W + 1;
            System.out.println("  " + m + " score " + s + ": exact #" + (board.zrevrank(m) + 1) + ", estimated #" + est);
        }
    }
}` },
        ],
      },
    ],
  },
  {
    title: `How would you design a collaborative editor like Google Docs?`,
    difficulty: "hard",
    seoDescription: `Design a Google Docs style editor: operational transformation vs CRDTs, a per-document server with revision log, snapshots, presence, offline edits.`,
    description: `**Question presented to candidate:**
"Design a collaborative document editor like Google Docs. Several people type in the same document at the same time and everyone sees everyone else's changes within a fraction of a second, with cursors. Edits must never be lost, and everyone must end up with the same document. How does it work?"

**What a strong answer should cover:**
- Why naive "send my edit position to everyone" diverges when edits are concurrent, and the goal: **convergence** while keeping each user's intent
- **Operational transformation (OT)**: a central server orders operations into a **revision log** and transforms each incoming op against the ops it has not seen; clients keep one pending op and transform incoming ops against it
- **CRDTs**: every character gets a unique id, inserts reference neighbours by id, deletes leave **tombstones**, so replicas converge in any delivery order (good for offline and peer-to-peer) at a metadata cost
- Architecture: WebSocket to a **per-document session server** (all editors of one doc on one owner), durable op log plus periodic **snapshots**, presence and cursors on a separate lossy channel
- Capacity and limits: ops per second, log growth, editors per document; what breaks at 10x

**Clarifying questions expected:**
- Plain text or rich text with formatting, tables and comments? Is offline editing required?
- How many concurrent editors per document, and how many open documents at peak?
- Do we need version history and named versions?

**Code / implementation expected:** Optional — the design; the example shows naive replay diverging, server-ordered OT converging, and a CRDT converging in every delivery order.`,
    answer: `**Target Audience:** Developers preparing for system design interviews. You know what a WebSocket and a database log are; OT and CRDTs are explained from scratch.
**Difficulty:** Hard
**Verified with:** Node 22.22, Python 3.12, Go 1.24 and Java 21 (all four print identical output).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All behaviour shown comes from running the example; the **Verified** section quotes the full output. Capacity numbers are worked from stated assumptions.

## 1. Why This Even Matters — A Story First

Three friends edit a shopping list on three phones, offline on a train. The list says \`cat\` (someone's typo for "cats"). Alice inserts an \`h\` after the \`c\`, Bob deletes the \`c\`, and Carol adds an \`s\` at the end. Everyone means well: together they wanted \`hats\`.

When the train leaves the tunnel, each phone receives the other two edits as "insert at position 1", "delete position 0", "insert at position 3". But positions are relative to the document *as its author saw it*. Bob's phone has already deleted the \`c\`, so "insert h at position 1" lands in the wrong place and Bob ends up with \`ahts\` while the others have \`hats\`. The phones disagree, and nobody notices until the document is garbage.

A collaborative editor exists to prevent exactly this: every replica must end with the same document (**convergence**), and that document should reflect what each person meant (**intention preservation**), while each person sees their own typing instantly.

📌 **Interview term: convergence** — after all edits have been delivered everywhere, all replicas hold an identical document, regardless of the order edits arrived in.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Plain text or rich text (styles, tables, images, comments)? | Rich text multiplies operation types and transform rules |
| Concurrent editors per document, and open documents at peak? | Decides the per-document server model and fleet size |
| Offline editing for hours, or online only? | Long offline periods favour CRDTs |
| Version history, named versions, restore? | The revision log and snapshot design |
| Latency target for remote edits? | Batching window and region placement |
| Access control: share links, comment-only users? | Checked on every op at the server |

## 3. Requirements

**Functional**
- Open a document, type, and see others' edits and cursors live.
- All editors converge; no acknowledged edit is ever lost.
- Version history; restore an old version.
- Reconnect after a network drop without losing local edits.

**Non-functional**
- Own keystrokes appear instantly (local first); remote edits in about 100-500 ms.
- Durable: an acknowledged op survives a server crash.
- A bounded number of simultaneous editors per document; Google's own help page says up to 100 people with view, edit or comment access can work on a Docs, Sheets or Slides file at the same time (Google Workspace Help).

## 4. Capacity Estimate

| Input (assumption) | Value |
| :--- | :--- |
| Documents open at peak | 1 million |
| Active editors at peak | 2 million |
| Share typing at any moment | 30% |
| Ops per typing user | 5 per second |
| Stored op size | about 50 bytes |

Arithmetic:

- **Ops:** 2,000,000 x 0.3 x 5 = **3 million ops/s** across the fleet, but at most a few hundred per second for any one document. The load is huge in total and tiny per document, so the unit of scaling is the document.
- **Log growth:** 3,000,000 x 50 bytes = 150 MB/s, about **13 TB/day** if every keystroke were kept forever. So clients batch keystrokes (one op per 100-200 ms of typing), the log is compacted into **snapshots**, and fine-grained history is thinned after a few days.

## 5. Why Positions Break: The Naive Replay

The example runs the story: base \`cat\`, three concurrent ops made on revision 0.

~~~text
base 'cat'; A ins(1,'h'), B del(0), C ins(3,'s'), all made concurrently on rev 0
naive replay, each site applies its own op first: A 'hats', B 'ahts', C 'hats'
~~~

Each site applies its own op first, then the others as they arrive. A and C happen to end with \`hats\`; B ends with \`ahts\`. The replicas diverged, and nothing in the system detects it.

## 6. Core Idea 1: Operational Transformation (OT)

The fix: before applying someone else's op, **transform** it to account for the ops you have applied that its author had not seen. "Insert h at 1" made on \`cat\` becomes "insert h at 0" on a document where \`c\` is already deleted.

📌 **Interview term: operational transformation (OT)** — a function \`transform(a, b)\` that rewrites op \`a\` so it has the same intent when applied after a concurrent op \`b\`. Rules for single characters: an insert before your position shifts you right; a delete before you shifts you left; two inserts at the same position are ordered by a tie-breaker (site id); two deletes of the same character turn the second into a no-op.

Peer-to-peer OT is notoriously hard to get right for all orderings. The practical design, which Google described for Docs in 2010, puts a **server in the middle**: every op goes to the server, the server puts them in one order (the revision log), and everyone applies that order. Google's Drive blog series that September ("What's different about the new Google Docs") explains that edits are reduced to inserting text, deleting text and applying styles, kept in a revision log, and merged with operational transformation.

📌 **Interview term: revision log** — the server's ordered list of committed ops. A client sends an op with the revision it was based on; the server transforms it against every op committed since that revision, appends it, and broadcasts it with its new revision number.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="Clients A B and C send ops based on revision 0 to a document server; the server transforms each against the log and appends it; it broadcasts committed ops back to all clients, which transform them against their own pending op">
  <defs>
    <marker id="sd17q5-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="150" height="56" rx="10"/>
  <text class="d-text" x="95" y="45" text-anchor="middle">client A</text>
  <text class="d-sub" x="95" y="64" text-anchor="middle">pending op</text>
  <rect class="d-box-muted" x="20" y="120" width="150" height="56" rx="10"/>
  <text class="d-text" x="95" y="145" text-anchor="middle">client B</text>
  <text class="d-sub" x="95" y="164" text-anchor="middle">pending op</text>
  <rect class="d-box-muted" x="20" y="220" width="150" height="56" rx="10"/>
  <text class="d-text" x="95" y="245" text-anchor="middle">client C</text>
  <text class="d-sub" x="95" y="264" text-anchor="middle">pending op</text>
  <rect class="d-box-accent" x="300" y="100" width="180" height="96" rx="10"/>
  <text class="d-text" x="390" y="132" text-anchor="middle">document server</text>
  <text class="d-sub" x="390" y="154" text-anchor="middle">transform vs log</text>
  <text class="d-sub" x="390" y="174" text-anchor="middle">assign revision</text>
  <rect class="d-box" x="560" y="110" width="170" height="76" rx="10"/>
  <text class="d-text" x="645" y="140" text-anchor="middle">revision log</text>
  <text class="d-sub" x="645" y="162" text-anchor="middle">plus snapshots</text>
  <path class="d-edge" d="M 170 48 L 294 120" marker-end="url(#sd17q5-arrow)"/>
  <path class="d-edge" d="M 170 148 L 294 148" marker-end="url(#sd17q5-arrow)"/>
  <path class="d-edge" d="M 170 248 L 294 176" marker-end="url(#sd17q5-arrow)"/>
  <path class="d-edge-accent" d="M 480 148 L 554 148" marker-end="url(#sd17q5-arrow)"/>
</svg>

Each client sends its op tagged with the revision it was based on; the server transforms it against the log, appends it durably and broadcasts the committed op (with its revision) back over the same connections.

**The client side.** A client applies its own op immediately (so typing feels instant) and keeps it **pending** until the server acknowledges it; it sends at most one pending op at a time and buffers further typing into the next op. When a committed op from someone else arrives, the client transforms it against its pending op (and the pending op against it) before applying. The example runs exactly this with 3 clients, the server receiving B, then C, then A:

~~~text
server log: del(0), ins(2,'s'), ins(0,'h')
OT after broadcast: A 'hats', B 'hats', C 'hats'
both delete 't' at once: second becomes noop, result 'ca'
~~~

The server rewrote C's insert from position 3 to **2** (B's delete came first) and A's from 1 to **0**; all three clients ended with **\`hats\`**. When two users delete the same \`t\` at once, the second delete becomes a **no-op**, so the result is \`ca\`, not a double deletion.

## 7. Core Idea 2: CRDTs

A CRDT avoids positions altogether. Every character gets a globally unique, ordered id (a counter plus a site id), and an insert says "put character X with id (5,3) **after** the character with id (2,0)". Deleting a character marks it dead (a **tombstone**) rather than removing it, because later ops may still refer to it. Concurrent inserts after the same character are ordered by id, the same way on every replica.

📌 **Interview term: CRDT (conflict-free replicated data type)** — a data structure whose concurrent updates commute, so replicas that have received the same set of updates are identical, in any delivery order, with no central server needed.

📌 **Interview term: tombstone** — a deleted element kept as a marker so that ops referencing it still have an anchor. Tombstones are why text CRDTs carry metadata that grows with the edit history until it is garbage-collected.

The example uses an RGA-style sequence (replicated growable array): the same three intents plus two concurrent inserts (X by A, Y by C) after the same character, applied in **every one of the 120 possible orders**:

~~~text
CRDT: applied the 5 ops in all 120 orders -> 'haYXts' x120
CRDT state: 7 elements for 6 visible characters (1 tombstone)
~~~

All 120 orders produced \`haYXts\`: Y and X were inserted at the same spot concurrently, and the higher id (5,3) sorts first everywhere. The state holds **7 elements for 6 visible characters**: the deleted \`c\` stays as a tombstone. Production CRDT libraries exist for this; Yjs describes itself as a CRDT implementation that supports offline editing, many rich-text editors and network-agnostic sync (Yjs docs), and Automerge is another widely used CRDT library.

## 8. OT vs CRDT

| | OT with a central server | CRDT |
| :--- | :--- | :--- |
| Ordering | Server assigns one order (revision log) | No order needed; ops commute |
| Server | Required, and per document | Optional (relay/storage only); peer-to-peer possible |
| Offline for hours | Possible, but a long pending queue must be transformed on reconnect | Natural: merge whenever connected |
| Metadata | Small: positions only | Ids per character plus tombstones |
| Correctness risk | Transform functions for every op pair; rich text multiplies them | Algorithm is proven once; library quality matters |
| Access control and validation | Easy: server sees and can reject every op | Server must validate ops it relays; peers are harder |
| Known use | Google Docs (Google Drive blog, 2010) | Yjs, Automerge and editors built on them |

For an interview "design Google Docs": a central per-document server with OT is the classic answer and maps well to permissions, history and a single source of truth. Choose a CRDT if offline-first or peer-to-peer is a requirement. Either way, the rest of the architecture is the same.

## 9. Architecture

<svg class="iq-diagram" width="100%" viewBox="0 0 760 320" role="img" aria-label="Browsers connect over WebSockets through a gateway that routes by document id to the document session server that owns the document; the session server writes ops to an op log database and snapshots to object storage; presence and cursors use a separate pub sub channel">
  <defs>
    <marker id="sd17q5b-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="120" width="120" height="56" rx="10"/>
  <text class="d-text" x="80" y="153" text-anchor="middle">browsers</text>
  <rect class="d-box" x="190" y="120" width="140" height="56" rx="10"/>
  <text class="d-text" x="260" y="145" text-anchor="middle">gateway</text>
  <text class="d-sub" x="260" y="164" text-anchor="middle">route by doc id</text>
  <rect class="d-box-accent" x="390" y="110" width="170" height="76" rx="10"/>
  <text class="d-text" x="475" y="140" text-anchor="middle">doc session</text>
  <text class="d-sub" x="475" y="162" text-anchor="middle">owner of doc 42</text>
  <rect class="d-box" x="610" y="30" width="130" height="56" rx="10"/>
  <text class="d-text" x="675" y="55" text-anchor="middle">op log DB</text>
  <text class="d-sub" x="675" y="74" text-anchor="middle">by doc, rev</text>
  <rect class="d-box" x="610" y="130" width="130" height="56" rx="10"/>
  <text class="d-text" x="675" y="155" text-anchor="middle">snapshots</text>
  <text class="d-sub" x="675" y="174" text-anchor="middle">object store</text>
  <rect class="d-box-muted" x="390" y="240" width="170" height="56" rx="10"/>
  <text class="d-text" x="475" y="265" text-anchor="middle">presence</text>
  <text class="d-sub" x="475" y="284" text-anchor="middle">cursors, lossy</text>
  <path class="d-edge" d="M 140 148 L 184 148" marker-end="url(#sd17q5b-arrow)"/>
  <path class="d-edge" d="M 330 148 L 384 148" marker-end="url(#sd17q5b-arrow)"/>
  <path class="d-edge-accent" d="M 560 130 L 604 66" marker-end="url(#sd17q5b-arrow)"/>
  <path class="d-edge" d="M 560 158 L 604 158" marker-end="url(#sd17q5b-arrow)"/>
  <path class="d-edge-dashed" d="M 475 186 L 475 234" marker-end="url(#sd17q5b-arrow)"/>
</svg>

All editors of one document connect (through the gateway) to the single session server that owns that document, which makes ordering trivial: it is one process with one log. That server writes every op durably before acknowledging, takes a snapshot every few hundred ops, and sends cursors and presence over a separate lossy channel.

📌 **Interview term: per-document ownership (document affinity)** — exactly one server holds a document's live session; the gateway finds it by hashing the document id (consistent hashing) or via a lease in a coordination store. If the owner dies, the lease expires and another server loads the latest snapshot plus the log tail and takes over. See [leader election](/interview-question/what-is-leader-election-in-distributed-systems).

**Data model**

~~~sql
CREATE TABLE doc_op (
  doc_id     TEXT    NOT NULL,
  rev        BIGINT  NOT NULL,      -- assigned by the owner, dense: 1, 2, 3, ...
  author_id  TEXT    NOT NULL,
  client_op_id TEXT  NOT NULL,      -- for idempotent retries from the client
  op         BYTEA   NOT NULL,      -- encoded operation batch
  created_at TIMESTAMP NOT NULL,
  PRIMARY KEY (doc_id, rev),
  UNIQUE (doc_id, client_op_id)
);
-- snapshot: (doc_id, rev) -> full document blob in object storage
~~~

**Loading a document**: fetch the latest snapshot, then the ops after its revision, replay them, and stream new ops. **Version history** is the snapshots plus the log; "restore version" is a new op that replaces the content, so history stays append-only. A retried client op with the same \`client_op_id\` hits the unique constraint and returns the original revision, so reconnects never apply an op twice (see [idempotency](/interview-question/what-is-idempotency-and-why-does-it-matter)).

**Presence and cursors** change constantly and do not need durability: send them through the session server (or a pub/sub channel) at a throttled rate and never write them to the log. Cursor positions are themselves positions, so they are transformed by incoming ops just like pending edits.

## 10. What Breaks First at 10x

At 30 million ops per second across 10 million open documents:
- **Op log writes**: batch ops per document (one write per 100-200 ms), shard the log by document id, and move older ops into snapshots.
- **Session servers**: documents are independent, so add servers; the gateway's routing table (or hash ring) spreads documents.
- **Hot documents**: a company-wide doc opened by 10,000 people; cap live editors (Google allows up to 100 people working in one file at once) and serve everyone else a read-only view updated every few seconds.
- **Reconnect storms** after a deploy: move documents off a draining server one by one, with clients resuming from their last acknowledged revision.

## 11. Verified: Running the Code

The example **"Collaborative editing: naive replay diverges, server-ordered OT converges, an RGA-style CRDT converges in all 120 orders"** was run with \`node main.js\` (Node 22.22), \`python3.12 main.py\`, \`go run main.go\` (Go 1.24) and Java 21. All four print exactly this:

~~~text
base 'cat'; A ins(1,'h'), B del(0), C ins(3,'s'), all made concurrently on rev 0
naive replay, each site applies its own op first: A 'hats', B 'ahts', C 'hats'
server log: del(0), ins(2,'s'), ins(0,'h')
OT after broadcast: A 'hats', B 'hats', C 'hats'
both delete 't' at once: second becomes noop, result 'ca'
CRDT: applied the 5 ops in all 120 orders -> 'haYXts' x120
CRDT state: 7 elements for 6 visible characters (1 tombstone)
~~~

What the simulation stands for and what it leaves out: ops are single characters on plain text; the "server" is a list and a loop, standing for the document session server and its revision log, and the network is a fixed delivery order (B, C, A). Clients follow the one-pending-op protocol described above. The CRDT is a simplified RGA with integer counters standing for Lamport clocks; it has no garbage collection of tombstones, no formatting, and no network. Real editors batch many characters per op and handle rich text, which multiplies the transform cases.

## Edge Cases Worth Knowing

- **Undo** must undo *my* last op, transformed through everyone else's later ops, not the last op in the document.
- **Rich text**: formatting ranges, list items and tables each need transform rules (or CRDT types); this is where most real bugs live.
- **Large pastes**: one op with 50,000 characters; split or stream it so the log and broadcast stay small.
- **Long offline sessions**: OT clients with hundreds of pending ops must rebase them on reconnect; set a limit and fall back to a three-way merge or a CRDT.
- **Permissions change mid-session**: the session server checks access on every op and closes the connection of a user whose access was removed.

## Common Pitfalls

- **Sending raw positions** — the run diverged into \`hats\` vs \`ahts\` with just three edits.
- **Peer-to-peer OT** without a central order — correct transforms for every ordering are very hard; use a server-ordered log (or a CRDT).
- **Acknowledging before the op is durable** — a crash then loses an edit the user saw as saved.
- **Logging every keystroke forever** — about 13 TB per day under the assumptions; batch and snapshot.
- **Putting cursors through the durable log** — they are high-rate and disposable; use a lossy channel.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The problem:</strong> <span style="color:#f0e2c8;">Concurrent edits carry positions relative to what their author saw, so naive replay diverges — in my run three edits to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cat</code> gave <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hats</code> on two clients and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ahts</code> on the third. The goal is <strong style="color:#ffca28;">convergence</strong> with each user's intent preserved, and instant local typing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. OT:</strong> <span style="color:#f0e2c8;">I would use <strong style="color:#ffca28;">operational transformation with a central server</strong>: each client applies its op locally, sends it with its base revision, and keeps it pending; the server transforms it against the <strong style="color:#ffca28;">revision log</strong>, appends it durably and broadcasts. In my run the server rewrote two positions and all three clients converged on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hats</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. CRDT alternative:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">CRDT</strong> gives every character a unique id and inserts after ids, with <strong style="color:#ffca28;">tombstones</strong> for deletes, so any delivery order converges — all 120 orders gave the same text in my run — at the cost of per-character metadata. I pick it when offline-first or peer-to-peer matters.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Architecture:</strong> <span style="color:#f0e2c8;">WebSockets to a gateway that routes by document id to the <strong style="color:#ffca28;">one session server that owns the document</strong>; an op log table keyed by doc and revision with idempotent client op ids, snapshots every few hundred ops, and presence on a separate lossy channel.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Scale:</strong> <span style="color:#f0e2c8;">3 million ops per second in total but only hundreds per document, so the document is the unit of scaling. At 10x I batch ops, shard the log by document, and cap live editors per hot document — Google allows up to 100 people working in one file at once.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does Google Docs use a central server instead of peer-to-peer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A single ordering point makes OT tractable: clients only transform against one pending op, and the server against the log. It also gives one place for permissions, durability and history. Google described this design in its 2010 Drive blog posts.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle two users deleting the same text?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The transform turns the second delete into a no-op (or shrinks an overlapping range), so the text is deleted once. In my run two concurrent deletes of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">t</code> produced <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ca</code>, not a double deletion.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does a client recover after losing its connection?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It reconnects, tells the server the last revision it has, receives the ops after that revision, transforms its pending and buffered ops against them, and resends. The client op id makes the resend idempotent if the server had already committed it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the session server for a document crashes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Its lease expires, another server takes ownership, loads the latest snapshot plus the log tail, and clients reconnect and resume from their last acknowledged revision. Only unacknowledged ops are resent, and they are still pending on the clients.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do CRDT tombstones grow forever?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Without cleanup, yes: every deleted character keeps an entry. Libraries compact them once all replicas have seen the delete, and a server-backed design can snapshot and rebase. In my run 6 visible characters needed 7 elements; for long-lived documents the ratio can be much higher.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Convergence | All replicas end identical once every edit is delivered |
| Operational transformation (OT) | Rewriting a concurrent op so it keeps its intent after another op |
| Revision log | The server ordered list of committed ops, numbered by revision |
| CRDT | A replicated data type whose concurrent updates commute |
| Tombstone | A deleted element kept as an anchor for later ops |
| Per-document ownership | Exactly one server holds the live session of a document |

**Conclusion:** A collaborative editor turns concurrent, position-based edits into one converged document. The classic Google Docs design does it with operational transformation around a central, per-document server: clients apply locally and keep one pending op, the server transforms each op against its revision log, stores it durably and broadcasts it, and snapshots keep loading fast. CRDTs reach the same convergence without a central order by giving every character an id and keeping tombstones, which suits offline and peer-to-peer use. The run showed all of it in miniature: naive replay split into \`hats\` and \`ahts\`, server-ordered OT brought three clients to \`hats\`, and the CRDT produced the same text in all 120 delivery orders. Around that core sit the practical parts: WebSockets routed by document id, an idempotent op log, a lossy presence channel, and per-document limits for hot documents.`,
    examples: [
      {
        label: `Collaborative editing: naive replay diverges, server-ordered OT converges, an RGA-style CRDT converges in all 120 orders`,
        variants: [
          { tech: "node", code: `// Collaborative editing: naive replay diverges, OT with a central server converges, an RGA-style CRDT converges in any order.
// Ops are single characters: { t: "ins", pos, ch, site } | { t: "del", pos, site } | { t: "noop" }.
function apply(doc, op) {
  if (op.t === "ins") return doc.slice(0, op.pos) + op.ch + doc.slice(op.pos);
  if (op.t === "del") return doc.slice(0, op.pos) + doc.slice(op.pos + 1);
  return doc;
}
// transform(a, b): rewrite a so it can be applied after b (both were made on the same document).
function transform(a, b) {
  if (a.t === "noop" || b.t === "noop") return a;
  if (b.t === "ins") {
    if (b.pos < a.pos || (b.pos === a.pos && (a.t === "del" || b.site < a.site))) return { ...a, pos: a.pos + 1 };
    return a;
  }
  if (b.pos < a.pos) return { ...a, pos: a.pos - 1 };
  if (b.pos === a.pos && a.t === "del") return { t: "noop" }; // both deleted the same character
  return a;
}
const show = (op) => op.t === "ins" ? "ins(" + op.pos + ",'" + op.ch + "')" : op.t === "del" ? "del(" + op.pos + ")" : "noop";

const base = "cat";
const A = { t: "ins", pos: 1, ch: "h", site: 1 }, B = { t: "del", pos: 0, site: 2 }, C = { t: "ins", pos: 3, ch: "s", site: 3 };
console.log("base '" + base + "'; A " + show(A) + ", B " + show(B) + ", C " + show(C) + ", all made concurrently on rev 0");

const naiveA = apply(apply(apply(base, A), B), C), naiveB = apply(apply(apply(base, B), A), C), naiveC = apply(apply(apply(base, C), A), B);
console.log("naive replay, each site applies its own op first: A '" + naiveA + "', B '" + naiveB + "', C '" + naiveC + "'");

// Central server: keeps a log, transforms each incoming op against everything committed since its base revision.
const log = [];
function serverReceive(op, baseRev) {
  let t = op;
  for (let r = baseRev; r < log.length; r++) t = transform(t, log[r]);
  log.push(t);
  return t;
}
// Client: applies its own op at once, keeps it pending until the server acknowledges it.
function makeClient(name, op) { return { name, doc: apply(base, op), pending: op }; }
function clientReceive(c, op, fromSelf) {
  if (fromSelf) { c.pending = null; return; }
  let remote = op;
  if (c.pending) { const p = c.pending; remote = transform(op, p); c.pending = transform(p, op); }
  c.doc = apply(c.doc, remote);
}
const clients = [makeClient("A", A), makeClient("B", B), makeClient("C", C)];
const arrival = [B, C, A]; // the network delivers to the server in this order
const committed = arrival.map((op) => serverReceive(op, 0));
console.log("server log: " + committed.map(show).join(", "));
for (let r = 0; r < committed.length; r++) for (const c of clients) clientReceive(c, committed[r], arrival[r] === [A, B, C][clients.indexOf(c)]);
console.log("OT after broadcast: " + clients.map((c) => c.name + " '" + c.doc + "'").join(", "));
const same = { t: "del", pos: 2, site: 1 }, same2 = { t: "del", pos: 2, site: 2 };
console.log("both delete 't' at once: second becomes " + show(transform(same2, same)) + ", result '" + apply(apply(base, same), transform(same2, same)) + "'");

// CRDT (RGA style): every character has a unique id [counter, site] and is inserted after a parent id; delete = tombstone.
function crdtApply(doc, op) {
  if (op.t === "del") { doc.find((e) => e.id[0] === op.id[0] && e.id[1] === op.id[1]).dead = true; return; }
  let i = op.after === null ? 0 : doc.findIndex((e) => e.id[0] === op.after[0] && e.id[1] === op.after[1]) + 1;
  // skip siblings with a bigger id, so concurrent inserts at one spot end in the same order everywhere
  while (i < doc.length && (doc[i].id[0] > op.id[0] || (doc[i].id[0] === op.id[0] && doc[i].id[1] > op.id[1]))) i++;
  doc.splice(i, 0, { id: op.id, ch: op.ch, dead: false });
}
const text = (doc) => doc.filter((e) => !e.dead).map((e) => e.ch).join("");
function fresh() { const d = []; crdtApply(d, { t: "ins", id: [1, 0], after: null, ch: "c" }); crdtApply(d, { t: "ins", id: [2, 0], after: [1, 0], ch: "a" }); crdtApply(d, { t: "ins", id: [3, 0], after: [2, 0], ch: "t" }); return d; }
const ops = [
  { t: "ins", id: [4, 1], after: [1, 0], ch: "h" }, // A: h after c
  { t: "del", id: [1, 0] },                         // B: delete c
  { t: "ins", id: [4, 3], after: [3, 0], ch: "s" }, // C: s after t
  { t: "ins", id: [5, 1], after: [2, 0], ch: "X" }, // A: X after a
  { t: "ins", id: [5, 3], after: [2, 0], ch: "Y" }, // C: Y after a, concurrent with X
];
function perms(a) { if (a.length <= 1) return [a]; const out = []; a.forEach((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).forEach((p) => out.push([x, ...p]))); return out; }
const results = new Map();
for (const order of perms([0, 1, 2, 3, 4])) { const d = fresh(); for (const k of order) crdtApply(d, ops[k]); const t = text(d); results.set(t, (results.get(t) || 0) + 1); }
console.log("CRDT: applied the 5 ops in all 120 orders -> " + [...results].map(([t, n]) => "'" + t + "' x" + n).join(", "));
const d = fresh(); for (const op of ops) crdtApply(d, op);
console.log("CRDT state: " + d.length + " elements for " + text(d).length + " visible characters (" + d.filter((e) => e.dead).length + " tombstone)");` },
          { tech: "python", code: `# Collaborative editing: naive replay diverges, OT with a central server converges, an RGA-style CRDT converges in any order.
# Ops are single characters: dicts with t = "ins" (pos, ch, site), "del" (pos, site) or "noop".
from itertools import permutations


def apply(doc, op):
    if op["t"] == "ins":
        return doc[:op["pos"]] + op["ch"] + doc[op["pos"]:]
    if op["t"] == "del":
        return doc[:op["pos"]] + doc[op["pos"] + 1:]
    return doc


def transform(a, b):  # rewrite a so it can be applied after b (both were made on the same document)
    if a["t"] == "noop" or b["t"] == "noop":
        return a
    if b["t"] == "ins":
        if b["pos"] < a["pos"] or (b["pos"] == a["pos"] and (a["t"] == "del" or b["site"] < a["site"])):
            return {**a, "pos": a["pos"] + 1}
        return a
    if b["pos"] < a["pos"]:
        return {**a, "pos": a["pos"] - 1}
    if b["pos"] == a["pos"] and a["t"] == "del":
        return {"t": "noop"}  # both deleted the same character
    return a


def show(op):
    if op["t"] == "ins":
        return f"ins({op['pos']},'{op['ch']}')"
    return f"del({op['pos']})" if op["t"] == "del" else "noop"


base = "cat"
A = {"t": "ins", "pos": 1, "ch": "h", "site": 1}
B = {"t": "del", "pos": 0, "site": 2}
C = {"t": "ins", "pos": 3, "ch": "s", "site": 3}
print(f"base '{base}'; A {show(A)}, B {show(B)}, C {show(C)}, all made concurrently on rev 0")
na = apply(apply(apply(base, A), B), C)
nb = apply(apply(apply(base, B), A), C)
nc = apply(apply(apply(base, C), A), B)
print(f"naive replay, each site applies its own op first: A '{na}', B '{nb}', C '{nc}'")

log = []  # central server: transforms each incoming op against everything committed since its base revision


def server_receive(op, base_rev):
    t = op
    for r in range(base_rev, len(log)):
        t = transform(t, log[r])
    log.append(t)
    return t


class Client:  # applies its own op at once, keeps it pending until the server acknowledges it
    def __init__(self, name, op):
        self.name, self.doc, self.pending = name, apply(base, op), op

    def receive(self, op, from_self):
        if from_self:
            self.pending = None
            return
        remote = op
        if self.pending is not None:
            p = self.pending
            remote = transform(op, p)
            self.pending = transform(p, op)
        self.doc = apply(self.doc, remote)


clients = [Client("A", A), Client("B", B), Client("C", C)]
own = [A, B, C]
arrival = [B, C, A]  # the network delivers to the server in this order
committed = [server_receive(op, 0) for op in arrival]
print("server log: " + ", ".join(show(o) for o in committed))
for r, op in enumerate(committed):
    for i, c in enumerate(clients):
        c.receive(op, arrival[r] is own[i])
print("OT after broadcast: " + ", ".join(f"{c.name} '{c.doc}'" for c in clients))
same = {"t": "del", "pos": 2, "site": 1}
same2 = {"t": "del", "pos": 2, "site": 2}
print(f"both delete 't' at once: second becomes {show(transform(same2, same))}, result '{apply(apply(base, same), transform(same2, same))}'")


def crdt_apply(doc, op):  # RGA style: unique id (counter, site), insert after a parent id; delete = tombstone
    if op["t"] == "del":
        next(e for e in doc if e["id"] == op["id"])["dead"] = True
        return
    i = 0 if op["after"] is None else next(k for k, e in enumerate(doc) if e["id"] == op["after"]) + 1
    while i < len(doc) and doc[i]["id"] > op["id"]:  # skip siblings with a bigger id
        i += 1
    doc.insert(i, {"id": op["id"], "ch": op["ch"], "dead": False})


def text(doc):
    return "".join(e["ch"] for e in doc if not e["dead"])


def fresh():
    d = []
    crdt_apply(d, {"t": "ins", "id": (1, 0), "after": None, "ch": "c"})
    crdt_apply(d, {"t": "ins", "id": (2, 0), "after": (1, 0), "ch": "a"})
    crdt_apply(d, {"t": "ins", "id": (3, 0), "after": (2, 0), "ch": "t"})
    return d


ops = [
    {"t": "ins", "id": (4, 1), "after": (1, 0), "ch": "h"},  # A: h after c
    {"t": "del", "id": (1, 0)},                             # B: delete c
    {"t": "ins", "id": (4, 3), "after": (3, 0), "ch": "s"},  # C: s after t
    {"t": "ins", "id": (5, 1), "after": (2, 0), "ch": "X"},  # A: X after a
    {"t": "ins", "id": (5, 3), "after": (2, 0), "ch": "Y"},  # C: Y after a, concurrent with X
]
results = {}
for order in permutations(range(5)):
    d = fresh()
    for k in order:
        crdt_apply(d, ops[k])
    results[text(d)] = results.get(text(d), 0) + 1
print("CRDT: applied the 5 ops in all 120 orders -> " + ", ".join(f"'{t}' x{n}" for t, n in results.items()))
d = fresh()
for op in ops:
    crdt_apply(d, op)
print(f"CRDT state: {len(d)} elements for {len(text(d))} visible characters ({sum(1 for e in d if e['dead'])} tombstone)")` },
          { tech: "go", code: `// Collaborative editing: naive replay diverges, OT with a central server converges, an RGA-style CRDT converges in any order.
// Ops are single characters: ins (pos, ch, site), del (pos, site) or noop.
package main

import (
	"fmt"
	"strings"
)

type Op struct {
	t, ch     string
	pos, site int
}

func apply(doc string, op Op) string {
	switch op.t {
	case "ins":
		return doc[:op.pos] + op.ch + doc[op.pos:]
	case "del":
		return doc[:op.pos] + doc[op.pos+1:]
	}
	return doc
}

func transform(a, b Op) Op { // rewrite a so it can be applied after b (both were made on the same document)
	if a.t == "noop" || b.t == "noop" {
		return a
	}
	if b.t == "ins" {
		if b.pos < a.pos || (b.pos == a.pos && (a.t == "del" || b.site < a.site)) {
			a.pos++
		}
		return a
	}
	if b.pos < a.pos {
		a.pos--
		return a
	}
	if b.pos == a.pos && a.t == "del" {
		return Op{t: "noop"} // both deleted the same character
	}
	return a
}

func show(op Op) string {
	switch op.t {
	case "ins":
		return fmt.Sprintf("ins(%d,'%s')", op.pos, op.ch)
	case "del":
		return fmt.Sprintf("del(%d)", op.pos)
	}
	return "noop"
}

const base = "cat"

var log []Op // central server: transforms each incoming op against everything committed since its base revision

func serverReceive(op Op, baseRev int) Op {
	t := op
	for r := baseRev; r < len(log); r++ {
		t = transform(t, log[r])
	}
	log = append(log, t)
	return t
}

type Client struct { // applies its own op at once, keeps it pending until the server acknowledges it
	name, doc string
	pending   *Op
}

func (c *Client) receive(op Op, fromSelf bool) {
	if fromSelf {
		c.pending = nil
		return
	}
	remote := op
	if c.pending != nil {
		p := *c.pending
		remote = transform(op, p)
		np := transform(p, op)
		c.pending = &np
	}
	c.doc = apply(c.doc, remote)
}

type ID [2]int

func bigger(x, y ID) bool { return x[0] > y[0] || (x[0] == y[0] && x[1] > y[1]) }

type Elem struct {
	id   ID
	ch   string
	dead bool
}
type COp struct {
	t     string
	id    ID
	after *ID
	ch    string
}

func crdtApply(doc []Elem, op COp) []Elem { // RGA style: unique id (counter, site), insert after a parent id; delete = tombstone
	if op.t == "del" {
		for i := range doc {
			if doc[i].id == op.id {
				doc[i].dead = true
			}
		}
		return doc
	}
	i := 0
	if op.after != nil {
		for k, e := range doc {
			if e.id == *op.after {
				i = k + 1
			}
		}
	}
	for i < len(doc) && bigger(doc[i].id, op.id) { // skip siblings with a bigger id
		i++
	}
	doc = append(doc, Elem{})
	copy(doc[i+1:], doc[i:])
	doc[i] = Elem{op.id, op.ch, false}
	return doc
}

func text(doc []Elem) string {
	var sb strings.Builder
	for _, e := range doc {
		if !e.dead {
			sb.WriteString(e.ch)
		}
	}
	return sb.String()
}

func fresh() []Elem {
	d := []Elem{}
	d = crdtApply(d, COp{"ins", ID{1, 0}, nil, "c"})
	d = crdtApply(d, COp{"ins", ID{2, 0}, &ID{1, 0}, "a"})
	return crdtApply(d, COp{"ins", ID{3, 0}, &ID{2, 0}, "t"})
}

func perms(a []int) [][]int {
	if len(a) <= 1 {
		return [][]int{append([]int{}, a...)}
	}
	out := [][]int{}
	for i, x := range a {
		rest := append(append([]int{}, a[:i]...), a[i+1:]...)
		for _, p := range perms(rest) {
			out = append(out, append([]int{x}, p...))
		}
	}
	return out
}

func main() {
	A, B, C := Op{t: "ins", pos: 1, ch: "h", site: 1}, Op{t: "del", pos: 0, site: 2}, Op{t: "ins", pos: 3, ch: "s", site: 3}
	fmt.Printf("base '%s'; A %s, B %s, C %s, all made concurrently on rev 0\\n", base, show(A), show(B), show(C))
	na := apply(apply(apply(base, A), B), C)
	nb := apply(apply(apply(base, B), A), C)
	nc := apply(apply(apply(base, C), A), B)
	fmt.Printf("naive replay, each site applies its own op first: A '%s', B '%s', C '%s'\\n", na, nb, nc)

	own := []Op{A, B, C}
	clients := []*Client{}
	for i, n := range []string{"A", "B", "C"} {
		p := own[i]
		clients = append(clients, &Client{n, apply(base, p), &p})
	}
	arrival := []int{1, 2, 0} // the network delivers B, C, A to the server
	committed := []Op{}
	parts := []string{}
	for _, k := range arrival {
		t := serverReceive(own[k], 0)
		committed = append(committed, t)
		parts = append(parts, show(t))
	}
	fmt.Println("server log: " + strings.Join(parts, ", "))
	for r, op := range committed {
		for i, c := range clients {
			c.receive(op, arrival[r] == i)
		}
	}
	parts = []string{}
	for _, c := range clients {
		parts = append(parts, fmt.Sprintf("%s '%s'", c.name, c.doc))
	}
	fmt.Println("OT after broadcast: " + strings.Join(parts, ", "))
	same, same2 := Op{t: "del", pos: 2, site: 1}, Op{t: "del", pos: 2, site: 2}
	fmt.Printf("both delete 't' at once: second becomes %s, result '%s'\\n", show(transform(same2, same)), apply(apply(base, same), transform(same2, same)))

	ops := []COp{
		{"ins", ID{4, 1}, &ID{1, 0}, "h"}, // A: h after c
		{"del", ID{1, 0}, nil, ""},        // B: delete c
		{"ins", ID{4, 3}, &ID{3, 0}, "s"}, // C: s after t
		{"ins", ID{5, 1}, &ID{2, 0}, "X"}, // A: X after a
		{"ins", ID{5, 3}, &ID{2, 0}, "Y"}, // C: Y after a, concurrent with X
	}
	keys, counts := []string{}, map[string]int{}
	for _, order := range perms([]int{0, 1, 2, 3, 4}) {
		d := fresh()
		for _, k := range order {
			d = crdtApply(d, ops[k])
		}
		t := text(d)
		if _, ok := counts[t]; !ok {
			keys = append(keys, t)
		}
		counts[t]++
	}
	parts = []string{}
	for _, k := range keys {
		parts = append(parts, fmt.Sprintf("'%s' x%d", k, counts[k]))
	}
	fmt.Println("CRDT: applied the 5 ops in all 120 orders -> " + strings.Join(parts, ", "))
	d := fresh()
	for _, op := range ops {
		d = crdtApply(d, op)
	}
	dead := 0
	for _, e := range d {
		if e.dead {
			dead++
		}
	}
	fmt.Printf("CRDT state: %d elements for %d visible characters (%d tombstone)\\n", len(d), len(text(d)), dead)
}` },
          { tech: "java", code: `// Collaborative editing: naive replay diverges, OT with a central server converges, an RGA-style CRDT converges in any order.
// Ops are single characters: ins (pos, ch, site), del (pos, site) or noop.
import java.util.*;

public class Main {
    record Op(String t, int pos, String ch, int site) {}
    static final Op NOOP = new Op("noop", 0, "", 0);

    static String apply(String doc, Op op) {
        if (op.t().equals("ins")) return doc.substring(0, op.pos()) + op.ch() + doc.substring(op.pos());
        if (op.t().equals("del")) return doc.substring(0, op.pos()) + doc.substring(op.pos() + 1);
        return doc;
    }
    static Op transform(Op a, Op b) { // rewrite a so it can be applied after b (both were made on the same document)
        if (a.t().equals("noop") || b.t().equals("noop")) return a;
        if (b.t().equals("ins")) {
            if (b.pos() < a.pos() || (b.pos() == a.pos() && (a.t().equals("del") || b.site() < a.site()))) return new Op(a.t(), a.pos() + 1, a.ch(), a.site());
            return a;
        }
        if (b.pos() < a.pos()) return new Op(a.t(), a.pos() - 1, a.ch(), a.site());
        if (b.pos() == a.pos() && a.t().equals("del")) return NOOP; // both deleted the same character
        return a;
    }
    static String show(Op op) {
        if (op.t().equals("ins")) return "ins(" + op.pos() + ",'" + op.ch() + "')";
        return op.t().equals("del") ? "del(" + op.pos() + ")" : "noop";
    }
    static final String BASE = "cat";
    static List<Op> log = new ArrayList<>(); // central server: transforms each incoming op against everything committed since its base revision
    static Op serverReceive(Op op, int baseRev) { Op t = op; for (int r = baseRev; r < log.size(); r++) t = transform(t, log.get(r)); log.add(t); return t; }

    static class Client { // applies its own op at once, keeps it pending until the server acknowledges it
        String name, doc; Op pending;
        Client(String name, Op op) { this.name = name; this.doc = apply(BASE, op); this.pending = op; }
        void receive(Op op, boolean fromSelf) {
            if (fromSelf) { pending = null; return; }
            Op remote = op;
            if (pending != null) { Op p = pending; remote = transform(op, p); pending = transform(p, op); }
            doc = apply(doc, remote);
        }
    }

    static class Elem { int[] id; String ch; boolean dead; Elem(int[] id, String ch) { this.id = id; this.ch = ch; } }
    record COp(String t, int[] id, int[] after, String ch) {}
    static boolean bigger(int[] x, int[] y) { return x[0] > y[0] || (x[0] == y[0] && x[1] > y[1]); }
    static void crdtApply(List<Elem> doc, COp op) { // RGA style: unique id (counter, site), insert after a parent id; delete = tombstone
        if (op.t().equals("del")) { for (Elem e : doc) if (Arrays.equals(e.id, op.id())) e.dead = true; return; }
        int i = 0;
        if (op.after() != null) for (int k = 0; k < doc.size(); k++) if (Arrays.equals(doc.get(k).id, op.after())) i = k + 1;
        while (i < doc.size() && bigger(doc.get(i).id, op.id())) i++; // skip siblings with a bigger id
        doc.add(i, new Elem(op.id(), op.ch()));
    }
    static String text(List<Elem> doc) { StringBuilder sb = new StringBuilder(); for (Elem e : doc) if (!e.dead) sb.append(e.ch); return sb.toString(); }
    static List<Elem> fresh() {
        List<Elem> d = new ArrayList<>();
        crdtApply(d, new COp("ins", new int[] {1, 0}, null, "c"));
        crdtApply(d, new COp("ins", new int[] {2, 0}, new int[] {1, 0}, "a"));
        crdtApply(d, new COp("ins", new int[] {3, 0}, new int[] {2, 0}, "t"));
        return d;
    }
    static void perms(List<Integer> prefix, List<Integer> rest, List<List<Integer>> out) {
        if (rest.isEmpty()) { out.add(new ArrayList<>(prefix)); return; }
        for (int i = 0; i < rest.size(); i++) {
            List<Integer> r = new ArrayList<>(rest); int x = r.remove(i);
            prefix.add(x); perms(prefix, r, out); prefix.remove(prefix.size() - 1);
        }
    }

    public static void main(String[] args) {
        Op A = new Op("ins", 1, "h", 1), B = new Op("del", 0, "", 2), C = new Op("ins", 3, "s", 3);
        System.out.println("base '" + BASE + "'; A " + show(A) + ", B " + show(B) + ", C " + show(C) + ", all made concurrently on rev 0");
        String na = apply(apply(apply(BASE, A), B), C), nb = apply(apply(apply(BASE, B), A), C), nc = apply(apply(apply(BASE, C), A), B);
        System.out.println("naive replay, each site applies its own op first: A '" + na + "', B '" + nb + "', C '" + nc + "'");

        Op[] own = {A, B, C};
        Client[] clients = {new Client("A", A), new Client("B", B), new Client("C", C)};
        int[] arrival = {1, 2, 0}; // the network delivers B, C, A to the server
        List<Op> committed = new ArrayList<>(); List<String> parts = new ArrayList<>();
        for (int k : arrival) { Op t = serverReceive(own[k], 0); committed.add(t); parts.add(show(t)); }
        System.out.println("server log: " + String.join(", ", parts));
        for (int r = 0; r < committed.size(); r++) for (int i = 0; i < clients.length; i++) clients[i].receive(committed.get(r), arrival[r] == i);
        parts.clear();
        for (Client c : clients) parts.add(c.name + " '" + c.doc + "'");
        System.out.println("OT after broadcast: " + String.join(", ", parts));
        Op same = new Op("del", 2, "", 1), same2 = new Op("del", 2, "", 2);
        System.out.println("both delete 't' at once: second becomes " + show(transform(same2, same)) + ", result '" + apply(apply(BASE, same), transform(same2, same)) + "'");

        COp[] ops = {
            new COp("ins", new int[] {4, 1}, new int[] {1, 0}, "h"), // A: h after c
            new COp("del", new int[] {1, 0}, null, ""),              // B: delete c
            new COp("ins", new int[] {4, 3}, new int[] {3, 0}, "s"), // C: s after t
            new COp("ins", new int[] {5, 1}, new int[] {2, 0}, "X"), // A: X after a
            new COp("ins", new int[] {5, 3}, new int[] {2, 0}, "Y"), // C: Y after a, concurrent with X
        };
        List<List<Integer>> orders = new ArrayList<>(); perms(new ArrayList<>(), List.of(0, 1, 2, 3, 4), orders);
        Map<String, Integer> results = new LinkedHashMap<>();
        for (List<Integer> order : orders) { List<Elem> d = fresh(); for (int k : order) crdtApply(d, ops[k]); results.merge(text(d), 1, Integer::sum); }
        parts.clear();
        for (var e : results.entrySet()) parts.add("'" + e.getKey() + "' x" + e.getValue());
        System.out.println("CRDT: applied the 5 ops in all 120 orders -> " + String.join(", ", parts));
        List<Elem> d = fresh(); for (COp op : ops) crdtApply(d, op);
        int dead = 0; for (Elem e : d) if (e.dead) dead++;
        System.out.println("CRDT state: " + d.size() + " elements for " + text(d).length() + " visible characters (" + dead + " tombstone)");
    }
}` },
        ],
      },
    ],
  },
];

export default augments;
