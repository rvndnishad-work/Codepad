import type { SystemDesignAugment } from "./system-design-augments.types";

/**
 * System-design augments — batch 5 (storage systems + ops/architecture).
 * Conventions: prose double-quoted ("\n"-joined, no bare < or >), inline SVG
 * single-quoted attrs (&gt;/&lt; only inside <text>), GFM tables. Code in
 * template literals — Go format strings MUST use \\n (a lone \n becomes a real
 * newline at import time and breaks the string literal).
 */
const augments: SystemDesignAugment[] = [
  {
    title: "How would you design a distributed key-value store?",
    answer:
      "## Distributed key-value store\n\n" +
      "Think Dynamo / Cassandra: a store of simple key-value pairs spread across a cluster, built for **horizontal scale** and **high availability** with **no single leader**. Four pillars:\n\n" +
      "1. **Partitioning** — place keys with **consistent hashing** so adding/removing a node remaps only a slice of keys.\n" +
      "2. **Replication** — each key lives on **N** nodes (the key's node plus the next ones on the ring) for durability and availability.\n" +
      "3. **Tunable consistency** — **quorum** reads/writes (W + R greater than N for strong reads; smaller for speed).\n" +
      "4. **Membership & repair** — nodes learn the cluster via **gossip**; **hinted handoff** + **read-repair** / anti-entropy heal misses; conflicts reconcile with **version vectors** (or last-write-wins).\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 195' role='img' aria-label='Coordinator routes a key to N replica nodes'>" +
      "<defs><marker id='ah-kv' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='12' y='80' width='78' height='44' rx='6'/><text class='d-sub' x='51' y='106' text-anchor='middle'>Client</text>" +
      "<rect class='d-box-accent' x='132' y='74' width='130' height='56' rx='8'/><text class='d-text' x='197' y='96' text-anchor='middle'>Coordinator</text><text class='d-sub' x='197' y='112' text-anchor='middle'>hash(key) -&gt; nodes</text>" +
      "<rect class='d-box' x='330' y='26' width='140' height='34' rx='6'/><text class='d-sub' x='400' y='48' text-anchor='middle'>Replica 1</text>" +
      "<rect class='d-box' x='330' y='86' width='140' height='34' rx='6'/><text class='d-sub' x='400' y='108' text-anchor='middle'>Replica 2</text>" +
      "<rect class='d-box' x='330' y='146' width='140' height='34' rx='6'/><text class='d-sub' x='400' y='168' text-anchor='middle'>Replica 3 (N=3)</text>" +
      "<line class='d-edge' x1='90' y1='102' x2='130' y2='102' marker-end='url(#ah-kv)'/>" +
      "<line class='d-edge' x1='262' y1='96' x2='328' y2='44' marker-end='url(#ah-kv)'/>" +
      "<line class='d-edge' x1='262' y1='102' x2='328' y2='104' marker-end='url(#ah-kv)'/>" +
      "<line class='d-edge' x1='262' y1='110' x2='328' y2='162' marker-end='url(#ah-kv)'/>" +
      "</svg>\n\n" +
      "| Decision | Choice |\n" +
      "|---|---|\n" +
      "| Partitioning | consistent hashing + virtual nodes |\n" +
      "| Replication | N copies on successor nodes |\n" +
      "| Consistency | tunable quorum (R, W vs N) |\n" +
      "| Conflicts | version vectors / LWW + read-repair |\n" +
      "| Storage engine | LSM-tree (write-optimized) + Bloom filters |\n\n" +
      "**Interview tip:** this question is really a synthesis — name the building blocks (**consistent hashing**, **quorum**, **gossip**, **LSM-tree**) and how they combine into an **AP, leaderless** store. Mention that any node can **coordinate** a request, and that the **R/W/N** knobs let callers choose consistency vs latency per operation.",
    examples: [
      {
        label: "Pick N replica nodes for a key",
        tech: "python",
        code: `import hashlib, bisect

class Ring:                          # consistent hashing (see that question)
    def __init__(self, nodes, vnodes=50):
        self.ring, self.points = {}, []
        for n in nodes:
            for i in range(vnodes):
                h = int(hashlib.md5((n + str(i)).encode()).hexdigest(), 16)
                self.ring[h] = n
                bisect.insort(self.points, h)

    def nodes_for(self, key, n):     # key's node + next distinct ones = N replicas
        h = int(hashlib.md5(key.encode()).hexdigest(), 16)
        i = bisect.bisect(self.points, h) % len(self.points)
        out, seen = [], set()
        while len(out) < n:
            node = self.ring[self.points[i % len(self.points)]]
            if node not in seen:
                seen.add(node)
                out.append(node)
            i += 1
        return out

ring = Ring(["A", "B", "C", "D"])
print("user:1 ->", ring.nodes_for("user:1", n=3))   # 3 replicas
print("cart:9 ->", ring.nodes_for("cart:9", n=3))`,
      },
    ],
  },
  {
    title: "How would you design a file storage service like Dropbox?",
    answer:
      "## File storage & sync (Dropbox)\n\n" +
      "The trick that makes sync fast and storage cheap is **chunking + content-addressing**: split each file into fixed (or content-defined) **blocks**, hash each block, and store blocks by their hash. Two big wins fall out: **deduplication** (identical blocks stored once) and **delta sync** (editing a file re-uploads only the **changed** blocks).\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 195' role='img' aria-label='Files are chunked and hashed, blocks go to object storage, metadata maps file to chunks'>" +
      "<defs><marker id='ah-dbx' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='12' y='80' width='80' height='44' rx='6'/><text class='d-sub' x='52' y='100' text-anchor='middle'>File</text><text class='d-sub' x='52' y='114' text-anchor='middle'>(client)</text>" +
      "<rect class='d-box-accent' x='128' y='74' width='124' height='56' rx='8'/><text class='d-text' x='190' y='96' text-anchor='middle'>Chunk + hash</text><text class='d-sub' x='190' y='112' text-anchor='middle'>dedupe blocks</text>" +
      "<rect class='d-box' x='320' y='38' width='150' height='38' rx='6'/><text class='d-sub' x='395' y='61' text-anchor='middle'>Block store (S3)</text>" +
      "<rect class='d-box' x='320' y='120' width='150' height='38' rx='6'/><text class='d-sub' x='395' y='143' text-anchor='middle'>Metadata DB</text>" +
      "<line class='d-edge' x1='92' y1='102' x2='126' y2='102' marker-end='url(#ah-dbx)'/>" +
      "<line class='d-edge' x1='252' y1='94' x2='318' y2='60' marker-end='url(#ah-dbx)'/>" +
      "<line class='d-edge' x1='252' y1='112' x2='318' y2='138' marker-end='url(#ah-dbx)'/>" +
      "<text class='d-sub' x='240' y='188' text-anchor='middle'>blocks -&gt; object storage; file -&gt; ordered chunk-hash list in metadata</text>" +
      "</svg>\n\n" +
      "Architecture: **block storage** (S3-style object store) holds content-addressed chunks; a **metadata DB** maps each file/version to its ordered list of chunk hashes; a **sync service** + client watcher detect local changes, diff against the last manifest, and upload only new chunks. Layer in **versioning** (manifests are cheap), **sharing/permissions**, and notifications to other devices.\n\n" +
      "| Component | Role |\n" +
      "|---|---|\n" +
      "| Block store | content-addressed chunks (dedup, immutable) |\n" +
      "| Metadata DB | file/version -&gt; chunk list, permissions |\n" +
      "| Sync service | diff + upload changed chunks only |\n" +
      "| Notification | tell other devices to pull updates |\n\n" +
      "**Interview tip:** the headline ideas are **content-addressed chunking** (dedup + delta sync) and **separating metadata from block storage**. Mention **conflict handling** (two devices edit offline -&gt; keep both as conflicted copies), client-side **compression/encryption**, and serving downloads via a **CDN**.",
    examples: [
      {
        label: "Content-hash chunk dedup",
        variants: [
          {
            tech: "python",
            code: `import hashlib

store = {}    # content-addressed blocks: hash -> bytes (S3 in production)

def put_file(data, chunk_size=4):
    manifest = []
    for i in range(0, len(data), chunk_size):
        c = data[i:i + chunk_size]
        h = hashlib.sha256(c).hexdigest()[:8]
        if h not in store:                 # only upload NEW blocks (dedupe)
            store[h] = c
            print("upload", h, repr(c))
        else:
            print("skip (already stored)", h)
        manifest.append(h)
    return manifest                        # file = ordered list of chunk hashes

v1 = put_file(b"hello world data")
print("--- edit the end, re-sync ---")
v2 = put_file(b"hello world DATA")          # leading chunks unchanged -> reused
print("v1:", v1)
print("v2:", v2)`,
          },
          {
            tech: "go",
            code: `package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
)

var store = map[string][]byte{}

func putFile(data []byte, chunkSize int) []string {
	var manifest []string
	for i := 0; i < len(data); i += chunkSize {
		end := i + chunkSize
		if end > len(data) {
			end = len(data)
		}
		c := data[i:end]
		sum := sha256.Sum256(c)
		h := hex.EncodeToString(sum[:])[:8]
		if _, ok := store[h]; !ok {
			store[h] = c
			fmt.Printf("upload %s %q\\n", h, c) // only NEW blocks
		} else {
			fmt.Println("skip (already stored)", h)
		}
		manifest = append(manifest, h)
	}
	return manifest
}

func main() {
	v1 := putFile([]byte("hello world data"), 4)
	fmt.Println("--- edit the end, re-sync ---")
	v2 := putFile([]byte("hello world DATA"), 4)
	fmt.Println("v1:", v1)
	fmt.Println("v2:", v2)
}`,
          },
        ],
      },
    ],
  },
  {
    title: "How would you design an analytics/metrics pipeline?",
    answer:
      "## Analytics / metrics pipeline\n\n" +
      "You're ingesting a **firehose** of events (clicks, page views, app metrics) and need both **real-time** dashboards and **accurate** historical reports. The standard shape: buffer everything in a durable **log** (Kafka), then branch into a fast **stream** path and a thorough **batch** path.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 200' role='img' aria-label='Events to Kafka, then stream and batch paths'>" +
      "<defs><marker id='ah-an' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='8' y='82' width='84' height='44' rx='6'/><text class='d-sub' x='50' y='102' text-anchor='middle'>Producers</text><text class='d-sub' x='50' y='116' text-anchor='middle'>events</text>" +
      "<rect class='d-box-accent' x='120' y='82' width='86' height='44' rx='8'/><text class='d-text' x='163' y='102' text-anchor='middle'>Kafka</text><text class='d-sub' x='163' y='116' text-anchor='middle'>event log</text>" +
      "<rect class='d-box' x='250' y='34' width='96' height='38' rx='6'/><text class='d-sub' x='298' y='57' text-anchor='middle'>Stream proc</text>" +
      "<rect class='d-box' x='250' y='134' width='96' height='38' rx='6'/><text class='d-sub' x='298' y='157' text-anchor='middle'>Batch job</text>" +
      "<rect class='d-box' x='380' y='34' width='92' height='38' rx='6'/><text class='d-sub' x='426' y='57' text-anchor='middle'>Dashboards</text>" +
      "<rect class='d-box' x='380' y='134' width='92' height='38' rx='6'/><text class='d-sub' x='426' y='157' text-anchor='middle'>Warehouse</text>" +
      "<line class='d-edge' x1='92' y1='104' x2='118' y2='104' marker-end='url(#ah-an)'/>" +
      "<line class='d-edge' x1='206' y1='98' x2='248' y2='56' marker-end='url(#ah-an)'/>" +
      "<line class='d-edge' x1='206' y1='110' x2='248' y2='150' marker-end='url(#ah-an)'/>" +
      "<line class='d-edge' x1='346' y1='53' x2='378' y2='53' marker-end='url(#ah-an)'/>" +
      "<line class='d-edge' x1='346' y1='153' x2='378' y2='153' marker-end='url(#ah-an)'/>" +
      "<text class='d-sub' x='240' y='192' text-anchor='middle'>fast approximate (stream) + accurate offline (batch) = lambda architecture</text>" +
      "</svg>\n\n" +
      "The **stream** path (Flink / Spark Streaming / Kafka Streams) computes **windowed aggregates** for live dashboards; the **batch** path lands raw events in a **data lake/warehouse** for accurate, reprocessable analytics. (Doing it all on the stream with replay is the **kappa** simplification.)\n\n" +
      "| Concern | Approach |\n" +
      "|---|---|\n" +
      "| Ingest spikes | Kafka buffers; producers never block |\n" +
      "| Real-time | windowed aggregation on the stream |\n" +
      "| Accuracy / history | batch into a warehouse, reprocessable |\n" +
      "| Volume | pre-aggregate, sample, roll up old data |\n\n" +
      "**Interview tip:** lead with a **durable log (Kafka) decoupling producers from processing**, then the **stream vs batch** split (lambda) and why (speed vs accuracy/reprocessing). Mention **windowing + watermarks** for late events, **idempotent/at-least-once** processing, and pre-aggregation to tame cardinality.",
    examples: [
      {
        label: "Tumbling-window aggregation",
        tech: "python",
        code: `from collections import defaultdict

# (timestamp_seconds, metric) event stream
events = [
    (0, "page_view"), (5, "page_view"), (61, "page_view"),
    (62, "click"), (119, "page_view"),
]
WINDOW = 60   # seconds per tumbling window

agg = defaultdict(int)
for ts, metric in events:
    window = ts // WINDOW                 # bucket the event into its window
    agg[(window, metric)] += 1

for (window, metric), count in sorted(agg.items()):
    print("minute", window, metric, "=", count)`,
      },
    ],
  },
  {
    title: "What are the trade-offs of microservices vs a monolith?",
    answer:
      "## Microservices vs monolith\n\n" +
      "- **Monolith:** one deployable app. Simple to build, test, and deploy; fast in-process calls; easy transactions. But it gets hard to scale **teams** and **components independently**, and one bad deploy risks the whole app.\n" +
      "- **Microservices:** many small services, each owning its data and deploy. Independent scaling, tech choice, and team autonomy — at the cost of a **distributed system**: network calls, partial failures, eventual consistency, and heavy ops.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 195' role='img' aria-label='One monolith box versus several services behind a gateway'>" +
      "<defs><marker id='ah-ms' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<text class='d-sub' x='110' y='20' text-anchor='middle'>Monolith</text>" +
      "<rect class='d-box-accent' x='40' y='34' width='140' height='130' rx='8'/>" +
      "<text class='d-sub' x='110' y='66' text-anchor='middle'>UI</text><text class='d-sub' x='110' y='90' text-anchor='middle'>Orders</text><text class='d-sub' x='110' y='114' text-anchor='middle'>Users</text><text class='d-sub' x='110' y='138' text-anchor='middle'>Payments</text>" +
      "<line class='d-edge-dashed' x1='240' y1='24' x2='240' y2='172'/>" +
      "<text class='d-sub' x='370' y='20' text-anchor='middle'>Microservices</text>" +
      "<rect class='d-box' x='300' y='34' width='140' height='30' rx='6'/><text class='d-sub' x='370' y='54' text-anchor='middle'>API gateway</text>" +
      "<rect class='d-box' x='300' y='80' width='66' height='36' rx='6'/><text class='d-sub' x='333' y='102' text-anchor='middle'>Orders</text>" +
      "<rect class='d-box' x='374' y='80' width='66' height='36' rx='6'/><text class='d-sub' x='407' y='102' text-anchor='middle'>Users</text>" +
      "<rect class='d-box' x='300' y='126' width='66' height='36' rx='6'/><text class='d-sub' x='333' y='148' text-anchor='middle'>Pay</text>" +
      "<rect class='d-box' x='374' y='126' width='66' height='36' rx='6'/><text class='d-sub' x='407' y='148' text-anchor='middle'>Search</text>" +
      "<line class='d-edge' x1='340' y1='64' x2='333' y2='78' marker-end='url(#ah-ms)'/>" +
      "<line class='d-edge' x1='380' y1='64' x2='407' y2='78' marker-end='url(#ah-ms)'/>" +
      "</svg>\n\n" +
      "| | Monolith | Microservices |\n" +
      "|---|---|---|\n" +
      "| Deploy | one unit | per service |\n" +
      "| Scaling | whole app | per service |\n" +
      "| Calls | in-process (fast) | network (latency, can fail) |\n" +
      "| Data / transactions | one DB, ACID easy | DB per service, sagas |\n" +
      "| Team fit | small teams | many independent teams |\n" +
      "| Ops complexity | low | high (CI/CD, mesh, tracing) |\n\n" +
      "**Interview tip:** the senior answer is **start with a (well-modularized) monolith** and extract services only when a real force demands it — a component needs **independent scaling**, a team needs **independent deploys**, or a module has a different reliability/tech profile. Microservices trade development simplicity for operational complexity; don't pay that tax prematurely.",
  },
  {
    title: "What are the three pillars of observability?",
    answer:
      "## The three pillars of observability\n\n" +
      "Observability is being able to **ask new questions about your system from the outside** without shipping new code. The three classic signal types:\n\n" +
      "- **Metrics** — cheap numeric time series (QPS, latency p99, error rate, CPU). Best for **dashboards and alerting**; aggregate, low cardinality.\n" +
      "- **Logs** — timestamped, detailed event records. Best for **debugging the specifics** of what happened; high volume, searchable.\n" +
      "- **Traces** — the path of a **single request across services**, with timing per hop. Best for finding **where** latency or an error came from in a distributed call graph.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 175' role='img' aria-label='Metrics, logs, and traces and what each answers'>" +
      "<rect class='d-box-accent' x='24' y='40' width='130' height='90' rx='8'/><text class='d-text' x='89' y='70' text-anchor='middle'>Metrics</text><text class='d-sub' x='89' y='92' text-anchor='middle'>is something</text><text class='d-sub' x='89' y='107' text-anchor='middle'>wrong? (alert)</text>" +
      "<rect class='d-box-accent' x='175' y='40' width='130' height='90' rx='8'/><text class='d-text' x='240' y='70' text-anchor='middle'>Logs</text><text class='d-sub' x='240' y='92' text-anchor='middle'>what exactly</text><text class='d-sub' x='240' y='107' text-anchor='middle'>happened?</text>" +
      "<rect class='d-box-accent' x='326' y='40' width='130' height='90' rx='8'/><text class='d-text' x='391' y='70' text-anchor='middle'>Traces</text><text class='d-sub' x='391' y='92' text-anchor='middle'>where (which</text><text class='d-sub' x='391' y='107' text-anchor='middle'>service)?</text>" +
      "<text class='d-sub' x='240' y='158' text-anchor='middle'>correlate all three by a shared request / trace id</text>" +
      "</svg>\n\n" +
      "| Signal | Answers | Cost | Tools |\n" +
      "|---|---|---|---|\n" +
      "| Metrics | is it broken, how much | low | Prometheus, Grafana |\n" +
      "| Logs | the exact details | medium-high | ELK, Loki |\n" +
      "| Traces | which hop is slow/failing | medium | Jaeger, OpenTelemetry |\n\n" +
      "**Interview tip:** the distinction interviewers want: **metrics alert, logs explain, traces localize**. The glue is a **correlation/trace id** propagated through every service so you can pivot from a metric spike to the relevant traces and logs. Mention **OpenTelemetry** as the vendor-neutral standard, plus SLO/SLI-driven alerting over raw thresholds.",
  },
  {
    title: "What are blue-green and canary deployments?",
    answer:
      "## Blue-green & canary deployments\n\n" +
      "Both are strategies to ship a new version with **minimal risk and fast rollback** — they differ in how traffic moves to the new version.\n\n" +
      "- **Blue-green:** run **two identical environments**. *Blue* serves all live traffic while you deploy and smoke-test *green*. Then flip the router to green **all at once**. Rollback is instant (flip back). Costs ~2x infra during the switch.\n" +
      "- **Canary:** roll the new version out to a **small slice** of traffic (say 5%), watch metrics, and **gradually ramp** to 100% — or roll back at the first sign of trouble. Catches problems with limited blast radius.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 200' role='img' aria-label='Blue-green traffic flip versus canary gradual rollout'>" +
      "<defs><marker id='ah-bg' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<text class='d-sub' x='120' y='18' text-anchor='middle'>Blue-green (flip all at once)</text>" +
      "<rect class='d-box' x='40' y='80' width='70' height='40' rx='6'/><text class='d-sub' x='75' y='104' text-anchor='middle'>Router</text>" +
      "<rect class='d-box-accent' x='160' y='40' width='80' height='36' rx='6'/><text class='d-sub' x='200' y='62' text-anchor='middle'>Blue v1</text>" +
      "<rect class='d-box' x='160' y='118' width='80' height='36' rx='6'/><text class='d-sub' x='200' y='140' text-anchor='middle'>Green v2</text>" +
      "<line class='d-edge-accent' x1='110' y1='92' x2='158' y2='62' marker-end='url(#ah-bg)'/>" +
      "<line class='d-edge-dashed' x1='110' y1='108' x2='158' y2='134' marker-end='url(#ah-bg)'/>" +
      "<line class='d-edge-dashed' x1='280' y1='30' x2='280' y2='164'/>" +
      "<text class='d-sub' x='380' y='18' text-anchor='middle'>Canary (ramp gradually)</text>" +
      "<rect class='d-box' x='312' y='80' width='60' height='40' rx='6'/><text class='d-sub' x='342' y='104' text-anchor='middle'>Router</text>" +
      "<rect class='d-box' x='410' y='44' width='60' height='34' rx='6'/><text class='d-sub' x='440' y='65' text-anchor='middle'>v1 95%</text>" +
      "<rect class='d-box-accent' x='410' y='120' width='60' height='34' rx='6'/><text class='d-sub' x='440' y='141' text-anchor='middle'>v2 5%</text>" +
      "<line class='d-edge' x1='372' y1='92' x2='408' y2='62' marker-end='url(#ah-bg)'/>" +
      "<line class='d-edge-accent' x1='372' y1='108' x2='408' y2='136' marker-end='url(#ah-bg)'/>" +
      "</svg>\n\n" +
      "| | Blue-green | Canary | Rolling |\n" +
      "|---|---|---|---|\n" +
      "| Traffic shift | all at once | small % then ramp | instance by instance |\n" +
      "| Rollback | instant (flip) | shift % back | redeploy old |\n" +
      "| Blast radius | full (after flip) | tiny | partial |\n" +
      "| Infra cost | ~2x during switch | low | low |\n\n" +
      "**Interview tip:** blue-green optimizes for **instant rollback** (at ~2x cost); canary optimizes for **small blast radius + real-traffic validation**. Both need **backward-compatible** changes (especially DB migrations — expand/contract) so old and new versions can run together, plus **automated metric checks** to gate the promotion.",
  },
];

export default augments;
