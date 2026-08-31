import type { SystemDesignAugment } from "./system-design-augments.types";

/**
 * System-design augments — batch 7. The 14 case studies from
 * liquidslr/system-design-notes not yet covered by augments 1-6
 * (72 rows in DB). Deduped via norm() against existing 72 titles.
 * See docs/tickets-p2-4-6.md — P2 gap analysis.
 */
const augments: SystemDesignAugment[] = [
  {
    title: "How would you design a Web Crawler?",
    answer:
      "## Design a Web Crawler\n\n" +
      "A crawler must fetch **billions of pages** politely, without overloading origins, while staying fresh and deduplicating.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 220' role='img' aria-label='Web crawler pipeline'>" +
      "<rect class='d-box' x='12' y='90' width='72' height='40' rx='6'/><text class='d-sub' x='48' y='115' text-anchor='middle'>Seeds</text>" +
      "<rect class='d-box-accent' x='130' y='88' width='110' height='44' rx='8'/><text class='d-text' x='185' y='106' text-anchor='middle'>URL Frontier</text><text class='d-sub' x='185' y='122' text-anchor='middle'>priority queue</text>" +
      "<rect class='d-box' x='290' y='40' width='80' height='40' rx='6'/><text class='d-sub' x='330' y='64' text-anchor='middle'>Fetcher</text>" +
      "<rect class='d-box' x='290' y='140' width='80' height='40' rx='6'/><text class='d-sub' x='330' y='164' text-anchor='middle'>Parser</text>" +
      "<rect class='d-box' x='410' y='90' width='60' height='40' rx='6'/><text class='d-sub' x='440' y='115' text-anchor='middle'>Store</text>" +
      "</svg>\n\n" +
      "| Concern | Choice | Why |\n" +
      "|---|---|---|\n" +
      "| Politeness | per-host queue + `robots.txt` + crawl-delay | avoid 429/ban |\n" +
      "| Freshness | priority by PageRank / change rate | recrawl hot pages |\n" +
      "| Scale | sharded frontier by host hash | `n` fetchers parallel |\n" +
      "| Dedup | Bloom filter + seen set in Redis | `O(1)` mem |\n\n" +
      "**Interview tip:** mention `ETag/Last-Modified` conditional fetch and `SimHash` near-dedup.",
  },
  {
    title: "How would you design YouTube?",
    answer:
      "## Design YouTube\n\n" +
      "YouTube is **write-heavy ingest** (transcode once) + **read-heavy global delivery** (CDN) + **social graph** (feed, comments).\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 220' role='img' aria-label='YouTube ingest and delivery'>" +
      "<rect class='d-box' x='12' y='90' width='70' height='40' rx='6'/><text class='d-sub' x='47' y='115' text-anchor='middle'>Upload</text>" +
      "<rect class='d-box-accent' x='120' y='88' width='110' height='44' rx='8'/><text class='d-text' x='175' y='106' text-anchor='middle'>Transcoder</text><text class='d-sub' x='175' y='122' text-anchor='middle'>H.264/AV1</text>" +
      "<rect class='d-box' x='270' y='40' width='80' height='40' rx='6'/><text class='d-sub' x='310' y='64' text-anchor='middle'>S3 + CDN</text>" +
      "<rect class='d-box' x='270' y='140' width='80' height='40' rx='6'/><text class='d-sub' x='310' y='164' text-anchor='middle'>Metadata</text>" +
      "<rect class='d-box' x='390' y='90' width='80' height='40' rx='6'/><text class='d-sub' x='430' y='115' text-anchor='middle'>Player</text>" +
      "</svg>\n\n" +
      "| Flow | Detail |\n" +
      "|---|---|\n" +
      "| Ingest | presigned S3 multipart + checksum; transcode to 144p–4K buffered queue |\n" +
      "| Metadata | `videos` table (MySQL) + `thumbs` in S3, search via Elasticsearch |\n" +
      "| Delivery | `HLS/DASH` segmented, edge CDN `Cache-Control: public, max-age=31536000, immutable` |\n" +
      "| Social | like/comment via message queue fan-out |\n\n" +
      "**Interview tip:** call out `adaptive bitrate` and `shot-based encoding` (Netflix) for quality/cost.",
  },
  {
    title: "How would you design Google Drive?",
    answer:
      "## Design Google Drive\n\n" +
      "Drive needs **large file sync**, **conflict resolution**, and **offline**.\n\n" +
      "| Piece | Pattern |\n" +
      "|---|---|\n" +
      "| Chunking | `4MB` blocks + `SHA-256` per chunk; only changed blocks uploaded |\n" +
      "| Sync | `Differential Sync` (Neil Fraser) — diff local vs server, 3-way merge |\n" +
      "| Storage | `S3` multipart + `WAL` for resumable; metadata in `MySQL` |\n" +
      "| Conflict | `LWW` + user prompt if concurrent edit on same block; tombstone on delete |\n\n" +
      "**Interview tip:** mention `block vs file` dedup and `presigned URL` for direct browser↔S3.",
  },
  {
    title: "How would you design Nearby Friends?",
    answer:
      "## Design Nearby Friends\n\n" +
      "Show friends within `r` km, updating as users move — **write-heavy location** + **read-heavy geosearch**.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 200' role='img' aria-label='Nearby friends geohash'>" +
      "<rect class='d-box' x='12' y='80' width='80' height='44' rx='6'/><text class='d-sub' x='52' y='106' text-anchor='middle'>Mobile</text>" +
      "<rect class='d-box-accent' x='140' y='80' width='110' height='44' rx='8'/><text class='d-text' x='195' y='100' text-anchor='middle'>Geohash</text><text class='d-sub' x='195' y='116' text-anchor='middle'>6-char</text>" +
      "<rect class='d-box' x='300' y='40' width='80' height='40' rx='6'/><text class='d-sub' x='340' y='64' text-anchor='middle'>Redis GEO</text>" +
      "<rect class='d-box' x='300' y='140' width='80' height='40' rx='6'/><text class='d-sub' x='340' y='164' text-anchor='middle'>Social graph</text>" +
      "</svg>\n\n" +
      "| Trade | Choice |\n" +
      "|---|---|\n" +
      "| Index | `Geohash` `6` chars (~1km cell) + `Redis GEOADD/GEORADIUS` | `O(log N)` |\n" +
      "| Privacy | `share = explicit opt-in` + `TTL 5m` on location | auto-expire |\n" +
      "| Fan-out | pull on open (query geohash neighbors) not push | scale |\n\n" +
      "**Interview tip:** mention `Quadtree` vs `Geohash` and `Haversine` distance.",
  },
  {
    title: "How would you design Google Maps?",
    answer:
      "## Design Google Maps\n\n" +
      "Maps needs **tiles**, **places search**, **routing**, and **live traffic**.\n\n" +
      "| Layer | Stack |\n" +
      "|---|---|\n" +
      "| Tiles | `256×256` PNG/WebP pyramids `z/x/y` CDN `immutable` + client cache |\n" +
      "| Places | `Elasticsearch` + `Geohash` inverted index |\n" +
      "| Routing | `Graph` `A*` + `Contraction Hierarchies` precompute; `Dijkstra` not at scale |\n" +
      "| Traffic | `Kafka` probe aggregation `window 1m` + `Bayesian` ETA |\n\n" +
      "**Interview tip:** mention `map matching` and `vector tiles` vs raster.",
  },
  {
    title: "How would you design a distributed message queue?",
    answer:
      "## Design a Distributed Message Queue\n\n" +
      "A queue must **persist orders**, **scale consumers**, and **survive broker loss**.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 200' role='img' aria-label='Message queue partitions'>" +
      "<rect class='d-box' x='12' y='80' width='70' height='44' rx='6'/><text class='d-sub' x='47' y='106' text-anchor='middle'>Producer</text>" +
      "<rect class='d-box-accent' x='130' y='88' width='110' height='44' rx='8'/><text class='d-text' x='185' y='106' text-anchor='middle'>Partitions</text><text class='d-sub' x='185' y='122' text-anchor='middle'>p0 p1 p2</text>" +
      "<rect class='d-box' x='290' y='40' width='80' height='40' rx='6'/><text class='d-sub' x='330' y='64' text-anchor='middle'>Consumers</text>" +
      "<rect class='d-box' x='290' y='140' width='80' height='40' rx='6'/><text class='d-sub' x='330' y='164' text-anchor='middle'>ZooKeeper</text>" +
      "</svg>\n\n" +
      "| Choice | Detail |\n" +
      "|---|---|\n" +
      "| Partitions | hash `key % partitions` for ordering per key; scale by adding partitions |\n" +
      "| Durability | `WAL` + `replication factor 3` + `acks=all` |\n" +
      "| Consumer | `pull` + `offset` commit; `consumer group` rebalances |\n\n" +
      "**Interview tip:** mention `Kafka vs SQS` (ordering, pull vs push).",
  },
  {
    title: "How would you design a metrics monitoring and alerting system?",
    answer:
      "## Design Metrics Monitoring & Alerting\n\n" +
      "Ingest **10M metrics/s**, store for `90d`, alert in `<1m`.\n\n" +
      "| Stage | Tech |\n" +
      "|---|---|\n" +
      "| Ingest | `Kafka` + `OpenTelemetry` `OTLP` + `throttle` |\n" +
      "| Storage | `TSDB` `Prometheus/M3/ClickHouse` `sharded by metric+labels` |\n" +
      "| Alerting | `SLO` `burn rate` `window 5m` `for 2m` + `Alertmanager` dedup/group/route |\n" +
      "| Query | `PromQL` `rate(metric[5m])` + downsample `1m→1h` |\n\n" +
      "**Interview tip:** mention ` cardinality explosion` and `head vs tail sampling`.",
  },
  {
    title: "How would you design a hotel reservation system?",
    answer:
      "## Design Hotel Reservation System\n\n" +
      "Must prevent **double-booking** under concurrency.\n\n" +
      "| Step | Pattern |\n" +
      "|---|---|\n" +
      "| Availability | `rooms` table + `inventory` per `date` row, `SELECT … FOR UPDATE` or `optimistic version` |\n" +
      "| Hold | `Redis` lock `SET NX EX 10m` on `hotel+date` → create `PENDING` reservation |\n" +
      "| Payment | `Saga` `reserve → pay → confirm` + `outbox` for idempotency |\n" +
      "| Search | `Elasticsearch` + `geohash` + `date` filter |\n\n" +
      "**Interview tip:** mention `idempotency key` on reserve.",
  },
  {
    title: "How would you design S3-like object storage?",
    answer:
      "## Design S3-like Object Storage\n\n" +
      "S3 provides **11x9 durability** via `erasure coding` + **strong read-after-write**.\n\n" +
      "| Layer | Detail |\n" +
      "|---|---|\n" +
      "| Data plane | `PUT` → `consistent hashing` to `shard` → `WAL` + `EC 6+3` across AZs |\n" +
      "| Metadata | `MySQL` `bucket/key → shard` + `R/W quorum` |\n" +
      "| Multipart | `CreateMultipartUpload` `uploadId` + parallel `UploadPart 5MB-5GB` + `Complete` |\n" +
      "| Consistency | `read quorum` + `versioning` |\n\n" +
      "**Interview tip:** mention `presigned URL` and `lifecycle` rules.",
  },
  {
    title: "How would you design a distributed email service?",
    answer:
      "## Design Distributed Email Service\n\n" +
      "| Stage | Detail |\n" +
      "|---|---|\n" +
      "| Send | `API` → `queue` → `workers` `pull` `10/s per IP` throttled |\n" +
      "| Reputation | `IP warmup` + `SPF/DKIM/DMARC` + `feedback loop` |\n" +
      "| Storage | `S3` raw + `MySQL` `status` (`queued/sent/bounced/complained`) |\n" +
      "| Retry | `exponential backoff` `5m,30m,2h` + `DLQ` |\n\n" +
      "**Interview tip:** mention `suppression list` on hard bounce.",
  },
  {
    title: "How would you design ad click event aggregation?",
    answer:
      "## Design Ad Click Event Aggregation\n\n" +
      "Count `clicks/impressions` per `ad` per `minute` for billing, `late events` handled.\n\n" +
      "| Layer | Tech |\n" +
      "|---|---|\n" +
      "| Ingest | `Kafka` `ad_clicks` `100K/s` |\n" +
      "| Window | `Flink` `tumble 1m` `event-time` + `watermark 30s` + `allowed lateness 1m` |\n" +
      "| Store | `ClickHouse` `AggregatingMergeTree` |\n" +
      "| Dedup | `idempotency key` `ad+user+timestamp` `Bloom` |\n\n" +
      "**Interview tip:** mention `exactly-once` via `idempotent consumer`.",
  },
  {
    title: "How would you design a real-time gaming leaderboard?",
    answer:
      "## Design Real-time Gaming Leaderboard\n\n" +
      "Global `top 100` + `around me` `O(log N)` updates at `10K/s`.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 180' role='img' aria-label='Gaming leaderboard Redis sorted set'>" +
      "<rect class='d-box' x='12' y='70' width='80' height='40' rx='6'/><text class='d-sub' x='52' y='94' text-anchor='middle'>Game</text>" +
      "<rect class='d-box-accent' x='140' y='68' width='110' height='44' rx='8'/><text class='d-text' x='195' y='86' text-anchor='middle'>Redis</text><text class='d-sub' x='195' y='102' text-anchor='middle'>ZSET scores</text>" +
      "<rect class='d-box' x='300' y='40' width='80' height='40' rx='6'/><text class='d-sub' x='340' y='64' text-anchor='middle'>Top 100</text>" +
      "<rect class='d-box' x='300' y='100' width='80' height='40' rx='6'/><text class='d-sub' x='340' y='124' text-anchor='middle'>Around me</text>" +
      "</svg>\n\n" +
      "| Query | Cmd |\n" +
      "|---|---|\n" +
      "| Update | `ZADD leaderboard score userId` |\n" +
      "| Top N | `ZREVRANGE 0 N-1 WITHSCORES` |\n" +
      "| Rank | `ZREVRANK userId` + `ZREVRANGE rank-2 rank+2` |\n" +
      "| Shard | `hash(userId) % shards` |\n\n" +
      "**Interview tip:** mention `TTL` season reset.",
  },
  {
    title: "How would you design a unique ID generator at scale?",
    answer:
      "## Design a Unique ID Generator\n\n" +
      "Need `64-bit` `k-sorted` `10K/s` without coordination per ID.\n\n" +
      "| Approach | How | Trade |\n" +
      "|---|---|---|\n" +
      "| Snowflake | `41b timestamp + 10b shard + 12b seq` | clock skew needs `NTP` + `sequence` reset |\n" +
      "| Ticket server | `MySQL AUTO_INCREMENT` | SPOF, `2K/s` |\n" +
      "| UUID v4 | random 122b | not k-sorted, index fragment |\n\n" +
      "**Interview tip:** mention `clock backward` handling (wait or throw).",
    examples: [
      {
        label: "Snowflake",
        variants: [
          {
            tech: "python",
            code: "import time\nEPOCH = 1609459200000\ndef snowflake(shard_id, seq):\n    ts = int(time.time()*1000) - EPOCH\n    return (ts << 22) | (shard_id << 12) | seq",
          },
        ],
      },
    ],
  },
  {
    title: "How would you design a payment system?",
    answer:
      "## Design a Payment System\n\n" +
      "Payments require **exactly-once effect** despite at-least-once networks.\n\n" +
      "| Concern | Pattern |\n" +
      "|---|---|\n" +
      "| Idempotency | `idempotency-key` `UNIQUE` on `payments` table; retry returns same result |\n" +
      "| State | `PENDING → AUTHORIZED → CAPTURED → SETTLED` `Saga` + `outbox` |\n" +
      "| Double spend | `optimistic locking` `version` on wallet `UPDATE … WHERE version=?` |\n" +
      "| Reconciliation | `ledger` `double-entry` + nightly `batch` vs `Stripe` |\n\n" +
      "**Interview tip:** mention `PCI DSS` tokenization.",
  },
];

export default augments;
