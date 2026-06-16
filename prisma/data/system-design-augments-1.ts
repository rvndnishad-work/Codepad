import type { SystemDesignAugment } from "./system-design-augments.types";

/**
 * System-design augments — batch 1.
 * Answers: markdown prose (double-quoted, "\n"-joined so inline-code backticks
 * stay literal) + inline <svg class='iq-diagram'> (single-quoted attrs, no
 * backticks) + GFM tables. Code variants: template literals, backtick-free.
 */
const augments: SystemDesignAugment[] = [
  {
    title: "What is the CAP theorem?",
    answer:
      "## What the CAP theorem says\n\n" +
      "In a distributed data store, when a **network partition** happens (some nodes can't talk to others), you can keep **at most one** of these two:\n\n" +
      "- **Consistency (C)** — every read returns the most recent write, or an error. All nodes agree on the data.\n" +
      "- **Availability (A)** — every request gets a non-error response (possibly stale data).\n" +
      "- **Partition tolerance (P)** — the system keeps operating despite dropped or delayed messages between nodes.\n\n" +
      "Because real networks *will* partition, **P is non-negotiable** for any distributed system. So the real decision, **during a partition**, is **C vs A**:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 320' role='img' aria-label='CAP theorem triangle: consistency, availability, partition tolerance'>" +
      "<polygon class='d-box-muted' points='240,72 70,255 410,255' fill-opacity='0.5'/>" +
      "<text class='d-sub' x='150' y='168' text-anchor='middle'>CA</text>" +
      "<text class='d-sub' x='332' y='168' text-anchor='middle'>CP</text>" +
      "<text class='d-sub' x='240' y='245' text-anchor='middle'>AP</text>" +
      "<circle class='d-box-accent' cx='240' cy='72' r='30'/>" +
      "<text class='d-accent d-text' x='240' y='78' text-anchor='middle' font-size='18'>C</text>" +
      "<text class='d-sub' x='240' y='30' text-anchor='middle'>Consistency</text>" +
      "<circle class='d-box-accent' cx='70' cy='255' r='30'/>" +
      "<text class='d-accent d-text' x='70' y='261' text-anchor='middle' font-size='18'>A</text>" +
      "<text class='d-sub' x='70' y='305' text-anchor='middle'>Availability</text>" +
      "<circle class='d-box-accent' cx='410' cy='255' r='30'/>" +
      "<text class='d-accent d-text' x='410' y='261' text-anchor='middle' font-size='18'>P</text>" +
      "<text class='d-sub' x='410' y='305' text-anchor='middle'>Partition tolerance</text>" +
      "</svg>\n\n" +
      "### CP vs AP\n\n" +
      "| During a partition | CP (consistency first) | AP (availability first) |\n" +
      "|---|---|---|\n" +
      "| Behavior | reject/block writes to stay correct | serve every node, reconcile later |\n" +
      "| Risk | reduced availability | stale / conflicting reads |\n" +
      "| Examples | HBase, etcd, ZooKeeper, Mongo (majority) | Cassandra, DynamoDB, Riak |\n" +
      "| Use for | payments, inventory, bookings | feeds, carts, metrics, presence |\n\n" +
      "### Beyond CAP — PACELC\n\n" +
      "CAP only talks about the partition case. **PACELC** adds: **E**lse (no partition), you still trade **L**atency vs **C**onsistency. Dynamo-style stores are *PA/EL* (favor availability, then latency); a strongly-consistent store is *PC/EC*.\n\n" +
      "**Interview tip:** don't say 'pick 2 of 3'. Say partitions are unavoidable, so you choose **CP or AP for the partition window** — and it's **per-operation**, not whole-system (you can serve strong reads on one path and eventual on another).",
  },
  {
    title: "What is the difference between horizontal and vertical scaling?",
    answer:
      "## Two ways to add capacity\n\n" +
      "- **Vertical scaling (scale up):** make one machine more powerful — more CPU, RAM, faster disk/NVMe.\n" +
      "- **Horizontal scaling (scale out):** add more machines and spread load across them, usually behind a **load balancer**.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 235' role='img' aria-label='Vertical scaling versus horizontal scaling'>" +
      "<defs><marker id='ah-scale' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<text class='d-sub' x='95' y='18' text-anchor='middle'>Vertical (scale up)</text>" +
      "<rect class='d-box-accent' x='55' y='34' width='80' height='150' rx='8'/>" +
      "<text class='d-text' x='95' y='116' text-anchor='middle'>Server</text>" +
      "<text class='d-sub' x='95' y='134' text-anchor='middle'>+CPU +RAM</text>" +
      "<line class='d-edge-accent' x1='95' y1='210' x2='95' y2='190' marker-end='url(#ah-scale)'/>" +
      "<text class='d-sub' x='95' y='226' text-anchor='middle'>make it bigger</text>" +
      "<line class='d-edge-dashed' x1='240' y1='12' x2='240' y2='214'/>" +
      "<text class='d-sub' x='370' y='18' text-anchor='middle'>Horizontal (scale out)</text>" +
      "<rect class='d-box' x='330' y='32' width='80' height='30' rx='6'/>" +
      "<text class='d-sub' x='370' y='51' text-anchor='middle'>Load balancer</text>" +
      "<rect class='d-box-accent' x='300' y='120' width='44' height='40' rx='6'/>" +
      "<rect class='d-box-accent' x='348' y='120' width='44' height='40' rx='6'/>" +
      "<rect class='d-box-accent' x='396' y='120' width='44' height='40' rx='6'/>" +
      "<text class='d-sub' x='322' y='144' text-anchor='middle'>S1</text>" +
      "<text class='d-sub' x='370' y='144' text-anchor='middle'>S2</text>" +
      "<text class='d-sub' x='418' y='144' text-anchor='middle'>S3</text>" +
      "<line class='d-edge' x1='360' y1='62' x2='324' y2='118' marker-end='url(#ah-scale)'/>" +
      "<line class='d-edge' x1='370' y1='62' x2='370' y2='118' marker-end='url(#ah-scale)'/>" +
      "<line class='d-edge' x1='380' y1='62' x2='416' y2='118' marker-end='url(#ah-scale)'/>" +
      "<text class='d-sub' x='370' y='184' text-anchor='middle'>add more nodes</text>" +
      "</svg>\n\n" +
      "| | Vertical (scale up) | Horizontal (scale out) |\n" +
      "|---|---|---|\n" +
      "| How | bigger machine | more machines |\n" +
      "| Ceiling | hardware limit | ~unlimited |\n" +
      "| Failure mode | single point of failure | redundant |\n" +
      "| Cost curve | expensive fast (premium HW) | linear-ish, commodity HW |\n" +
      "| App changes | none | statelessness, sharding, LB |\n" +
      "| Scaling downtime | often (resize/reboot) | none (add nodes live) |\n\n" +
      "**Interview tip:** vertical is the simplest first move (no code changes) but hits a ceiling and stays a single point of failure. Horizontal scales almost limitlessly **and** adds redundancy, but forces you to handle **stateless services, data partitioning, and coordination**. Mature systems do both: scale up the cheap wins, then scale out for growth and availability.",
  },
  {
    title: "How would you design a rate limiter?",
    answer:
      "## Designing a rate limiter\n\n" +
      "A rate limiter caps how many requests a client (user / IP / API key) may make per time window — protecting backends from abuse, accidental loops, and overload. It runs at the **edge or API gateway** and answers one question per request: **allow, or reject with HTTP 429?**\n\n" +
      "### Algorithms\n\n" +
      "| Algorithm | Idea | Bursts | Memory | Notes |\n" +
      "|---|---|---|---|---|\n" +
      "| Fixed window | count per fixed interval | spiky at edges | tiny | simplest; boundary burst x2 |\n" +
      "| Sliding window log | store each request timestamp | smooth | high | most accurate |\n" +
      "| Sliding window counter | weight prev + current window | smooth-ish | tiny | best accuracy/cost balance |\n" +
      "| Token bucket | refill tokens, spend one per request | allows bursts | tiny | most common default |\n" +
      "| Leaky bucket | queue drains at a fixed rate | smooths output | small | traffic shaping |\n\n" +
      "### Token bucket (the usual default)\n\n" +
      "Each client gets a bucket that **refills at a steady rate** up to a **capacity**. Every request removes one token; if the bucket is empty, reject. This permits short **bursts** (up to capacity) while bounding the long-run rate.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 470 225' role='img' aria-label='Token bucket rate limiter'>" +
      "<defs><marker id='ah-rl' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<text class='d-sub' x='180' y='22' text-anchor='middle'>refill: r tokens / sec</text>" +
      "<line class='d-edge-accent' x1='180' y1='28' x2='180' y2='72' marker-end='url(#ah-rl)'/>" +
      "<path class='d-box' d='M122,76 L238,76 L226,186 L134,186 Z'/>" +
      "<text class='d-sub' x='180' y='206' text-anchor='middle'>bucket: capacity = C tokens</text>" +
      "<circle class='d-arrow' cx='162' cy='150' r='7'/>" +
      "<circle class='d-arrow' cx='182' cy='162' r='7'/>" +
      "<circle class='d-arrow' cx='200' cy='150' r='7'/>" +
      "<circle class='d-arrow' cx='172' cy='134' r='7'/>" +
      "<circle class='d-arrow' cx='194' cy='134' r='7'/>" +
      "<line class='d-edge' x1='238' y1='118' x2='322' y2='118' marker-end='url(#ah-rl)'/>" +
      "<text class='d-sub' x='280' y='110' text-anchor='middle'>take 1</text>" +
      "<rect class='d-box-accent' x='322' y='98' width='126' height='44' rx='6'/>" +
      "<text class='d-text' x='385' y='116' text-anchor='middle'>request</text>" +
      "<text class='d-sub' x='385' y='132' text-anchor='middle'>token? allow : 429</text>" +
      "</svg>\n\n" +
      "The code below is in-memory for clarity. In production, store each bucket (tokens + last-refill timestamp) in **Redis** and update it **atomically with a Lua script**, so every gateway node shares the same counts.\n\n" +
      "**Interview tip:** structure the answer as *where* it runs (gateway, keyed per user/IP/API-key), *what state* it needs (counter + timestamp per key in Redis), and *which algorithm* and why. Mention the **distributed** twist: counts must be shared and mutated atomically, and you often fail-open (allow) if the limiter store is down.",
    examples: [
      {
        label: "Token bucket",
        variants: [
          {
            tech: "python",
            code: `import time

class TokenBucket:
    def __init__(self, capacity, refill_rate):
        self.capacity = capacity
        self.refill_rate = refill_rate      # tokens added per second
        self.tokens = capacity
        self.last = time.monotonic()

    def allow(self, cost=1):
        now = time.monotonic()
        # refill proportional to elapsed time, capped at capacity
        self.tokens = min(self.capacity, self.tokens + (now - self.last) * self.refill_rate)
        self.last = now
        if self.tokens >= cost:
            self.tokens -= cost
            return True
        return False

# demo: capacity 5, refill 2 tokens/sec -> first 5 burst through, rest blocked
bucket = TokenBucket(capacity=5, refill_rate=2)
for i in range(8):
    print(i, "allowed" if bucket.allow() else "BLOCKED (429)")`,
          },
          {
            tech: "go",
            code: `package main

import (
	"fmt"
	"time"
)

type TokenBucket struct {
	capacity, tokens, refillRate float64
	last                         time.Time
}

func NewBucket(capacity, refillRate float64) *TokenBucket {
	return &TokenBucket{capacity: capacity, tokens: capacity, refillRate: refillRate, last: time.Now()}
}

func (b *TokenBucket) Allow(cost float64) bool {
	now := time.Now()
	elapsed := now.Sub(b.last).Seconds()
	if b.tokens+elapsed*b.refillRate < b.capacity {
		b.tokens += elapsed * b.refillRate
	} else {
		b.tokens = b.capacity
	}
	b.last = now
	if b.tokens >= cost {
		b.tokens -= cost
		return true
	}
	return false
}

func main() {
	bucket := NewBucket(5, 2)
	for i := 0; i < 8; i++ {
		if bucket.Allow(1) {
			fmt.Println(i, "allowed")
		} else {
			fmt.Println(i, "BLOCKED (429)")
		}
	}
}`,
          },
          {
            tech: "java",
            code: `public class Main {
    static class TokenBucket {
        double capacity, tokens, refillRate;
        long last;
        TokenBucket(double capacity, double refillRate) {
            this.capacity = capacity;
            this.tokens = capacity;
            this.refillRate = refillRate;
            this.last = System.nanoTime();
        }
        boolean allow(double cost) {
            long now = System.nanoTime();
            double elapsed = (now - last) / 1e9;          // seconds
            tokens = Math.min(capacity, tokens + elapsed * refillRate);
            last = now;
            if (tokens >= cost) { tokens -= cost; return true; }
            return false;
        }
    }

    public static void main(String[] args) {
        TokenBucket bucket = new TokenBucket(5, 2);
        for (int i = 0; i < 8; i++) {
            System.out.println(i + (bucket.allow(1) ? " allowed" : " BLOCKED (429)"));
        }
    }
}`,
          },
        ],
      },
    ],
  },
  {
    title: "What is a load balancer and what strategies does it use?",
    answer:
      "## What a load balancer does\n\n" +
      "A load balancer (LB) sits in front of a pool of servers and **spreads incoming requests** across them so no single server is overwhelmed. It also delivers **high availability**: it health-checks backends and stops routing to unhealthy ones.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 470 215' role='img' aria-label='Load balancer distributing client requests across servers'>" +
      "<defs><marker id='ah-lb' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='14' y='86' width='74' height='44' rx='6'/><text class='d-sub' x='51' y='112' text-anchor='middle'>Clients</text>" +
      "<rect class='d-box-accent' x='168' y='80' width='100' height='56' rx='8'/><text class='d-text' x='218' y='104' text-anchor='middle'>Load</text><text class='d-text' x='218' y='120' text-anchor='middle'>balancer</text>" +
      "<rect class='d-box' x='374' y='22' width='84' height='40' rx='6'/><rect class='d-box' x='374' y='88' width='84' height='40' rx='6'/><rect class='d-box' x='374' y='154' width='84' height='40' rx='6'/>" +
      "<text class='d-sub' x='416' y='46' text-anchor='middle'>Server 1</text><text class='d-sub' x='416' y='112' text-anchor='middle'>Server 2</text><text class='d-sub' x='416' y='178' text-anchor='middle'>Server 3</text>" +
      "<line class='d-edge' x1='88' y1='108' x2='166' y2='108' marker-end='url(#ah-lb)'/>" +
      "<line class='d-edge' x1='268' y1='100' x2='372' y2='44' marker-end='url(#ah-lb)'/><line class='d-edge' x1='268' y1='108' x2='372' y2='108' marker-end='url(#ah-lb)'/><line class='d-edge' x1='268' y1='116' x2='372' y2='172' marker-end='url(#ah-lb)'/>" +
      "</svg>\n\n" +
      "### Layer 4 vs Layer 7\n\n" +
      "- **L4 (transport):** routes by IP/port — fast, protocol-agnostic (TCP/UDP), but blind to HTTP.\n" +
      "- **L7 (application):** understands HTTP — can route by path/header/cookie, terminate TLS, compress, and do sticky sessions.\n\n" +
      "### Strategies\n\n" +
      "| Strategy | Picks the server... | Good when |\n" +
      "|---|---|---|\n" +
      "| Round robin | next in rotation | uniform servers & requests |\n" +
      "| Weighted RR | by capacity weight | mixed server sizes |\n" +
      "| Least connections | with fewest active conns | long-lived / uneven requests |\n" +
      "| Least response time | fastest + least loaded | latency-sensitive |\n" +
      "| IP / consistent hash | by hash of client or key | stickiness, cache affinity |\n" +
      "| Power of two choices | random 2, pick less loaded | cheap, very even |\n\n" +
      "**Interview tip:** mention **health checks** (eject dead nodes), **sticky sessions** (and why stateless backends are better), and that the **LB itself must be HA** (active-passive pair or anycast) so it isn't the single point of failure.",
    examples: [
      {
        label: "Round-robin selection",
        variants: [
          {
            tech: "python",
            code: `import itertools

class RoundRobin:
    def __init__(self, servers):
        self.servers = servers
        self._cycle = itertools.cycle(servers)
    def next(self):
        return next(self._cycle)

lb = RoundRobin(["s1", "s2", "s3"])
for _ in range(7):
    print("route ->", lb.next())`,
          },
          {
            tech: "go",
            code: `package main

import "fmt"

type RoundRobin struct {
	servers []string
	i       int
}

func (r *RoundRobin) Next() string {
	s := r.servers[r.i%len(r.servers)]
	r.i++
	return s
}

func main() {
	lb := &RoundRobin{servers: []string{"s1", "s2", "s3"}}
	for n := 0; n < 7; n++ {
		fmt.Println("route ->", lb.Next())
	}
}`,
          },
          {
            tech: "java",
            code: `public class Main {
    static class RoundRobin {
        String[] servers;
        int i = 0;
        RoundRobin(String[] servers) { this.servers = servers; }
        String next() { String s = servers[i % servers.length]; i++; return s; }
    }
    public static void main(String[] args) {
        RoundRobin lb = new RoundRobin(new String[]{"s1", "s2", "s3"});
        for (int n = 0; n < 7; n++) System.out.println("route -> " + lb.next());
    }
}`,
          },
        ],
      },
    ],
  },
  {
    title: "How does caching improve system performance?",
    answer:
      "## Why caching helps\n\n" +
      "A cache keeps **hot data in fast storage** (usually memory) close to the consumer. Reads hit the cache instead of the slow backing store, which **cuts latency** and **offloads the database**, so the same hardware serves far more traffic.\n\n" +
      "The most common pattern is **cache-aside** (lazy loading): the app checks the cache first; on a miss it loads from the DB and populates the cache.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 200' role='img' aria-label='Cache-aside read path'>" +
      "<defs><marker id='ah-cache' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='14' y='80' width='80' height='44' rx='6'/><text class='d-sub' x='54' y='106' text-anchor='middle'>App</text>" +
      "<rect class='d-box-accent' x='184' y='80' width='100' height='44' rx='8'/><text class='d-text' x='234' y='100' text-anchor='middle'>Cache</text><text class='d-sub' x='234' y='115' text-anchor='middle'>in-memory</text>" +
      "<rect class='d-box' x='378' y='80' width='90' height='44' rx='6'/><text class='d-sub' x='423' y='106' text-anchor='middle'>Database</text>" +
      "<line class='d-edge' x1='94' y1='96' x2='182' y2='96' marker-end='url(#ah-cache)'/><text class='d-sub' x='138' y='88' text-anchor='middle'>1. get</text>" +
      "<line class='d-edge-accent' x1='182' y1='114' x2='96' y2='114' marker-end='url(#ah-cache)'/><text class='d-sub' x='138' y='136' text-anchor='middle'>2a. hit</text>" +
      "<line class='d-edge-dashed' x1='284' y1='96' x2='376' y2='96' marker-end='url(#ah-cache)'/><text class='d-sub' x='330' y='88' text-anchor='middle'>2b. miss</text>" +
      "<line class='d-edge-dashed' x1='376' y1='114' x2='286' y2='114' marker-end='url(#ah-cache)'/><text class='d-sub' x='330' y='136' text-anchor='middle'>3. populate</text>" +
      "</svg>\n\n" +
      "### Write strategies\n\n" +
      "| Strategy | What happens on write | Trade-off |\n" +
      "|---|---|---|\n" +
      "| Write-through | write cache + DB synchronously | consistent, slightly slower writes |\n" +
      "| Write-back | write cache, flush to DB later | fast, risk of loss on crash |\n" +
      "| Write-around | write DB, skip cache | avoids polluting cache, more read misses |\n\n" +
      "**Interview tip:** the famous hard part is **invalidation** — combine **TTL** with explicit invalidation on writes. Call out **eviction** (LRU/LFU), and the **cache stampede / thundering herd**: when a hot key expires, many requests hit the DB at once — fix with a short lock, request coalescing (single-flight), or early/jittered refresh.",
    examples: [
      {
        label: "Cache-aside read",
        variants: [
          {
            tech: "python",
            code: `cache = {}                      # stand-in for Redis/Memcached

def load_from_db(key):
    print("  DB read for", key)
    return key.upper() + "-value"

def get(key):
    if key in cache:            # 1. check cache
        return cache[key]       # 2a. hit
    value = load_from_db(key)   # 2b. miss -> load
    cache[key] = value          # 3. populate
    return value

print(get("user:1"))            # miss -> DB
print(get("user:1"))            # hit  -> no DB read
print(get("user:2"))            # miss -> DB`,
          },
          {
            tech: "go",
            code: `package main

import (
	"fmt"
	"strings"
)

var cache = map[string]string{}

func loadFromDB(key string) string {
	fmt.Println("  DB read for", key)
	return strings.ToUpper(key) + "-value"
}

func get(key string) string {
	if v, ok := cache[key]; ok { // 1. check cache (2a. hit)
		return v
	}
	v := loadFromDB(key) // 2b. miss -> load
	cache[key] = v       // 3. populate
	return v
}

func main() {
	fmt.Println(get("user:1")) // miss -> DB
	fmt.Println(get("user:1")) // hit
	fmt.Println(get("user:2")) // miss -> DB
}`,
          },
        ],
      },
    ],
  },
  {
    title: "What is a CDN and how does it work?",
    answer:
      "## Content Delivery Network\n\n" +
      "A **CDN** is a globally distributed network of **edge servers (PoPs)** that cache content **close to users**. A request is routed (via anycast/DNS) to the nearest PoP; if the PoP has the content cached it serves it directly, otherwise it fetches from your **origin**, caches it, and serves it.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 200' role='img' aria-label='CDN edge caching between user and origin'>" +
      "<defs><marker id='ah-cdn' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='14' y='80' width='80' height='44' rx='6'/><text class='d-sub' x='54' y='106' text-anchor='middle'>User</text>" +
      "<rect class='d-box-accent' x='186' y='78' width='110' height='48' rx='8'/><text class='d-text' x='241' y='98' text-anchor='middle'>Edge PoP</text><text class='d-sub' x='241' y='114' text-anchor='middle'>nearby cache</text>" +
      "<rect class='d-box' x='388' y='80' width='84' height='44' rx='6'/><text class='d-sub' x='430' y='106' text-anchor='middle'>Origin</text>" +
      "<line class='d-edge' x1='94' y1='96' x2='184' y2='96' marker-end='url(#ah-cdn)'/><text class='d-sub' x='139' y='88' text-anchor='middle'>1. request</text>" +
      "<line class='d-edge-accent' x1='184' y1='114' x2='96' y2='114' marker-end='url(#ah-cdn)'/><text class='d-sub' x='139' y='136' text-anchor='middle'>2a. cache hit</text>" +
      "<line class='d-edge-dashed' x1='296' y1='96' x2='386' y2='96' marker-end='url(#ah-cdn)'/><text class='d-sub' x='341' y='88' text-anchor='middle'>2b. miss</text>" +
      "<line class='d-edge-dashed' x1='386' y1='114' x2='298' y2='114' marker-end='url(#ah-cdn)'/><text class='d-sub' x='341' y='136' text-anchor='middle'>3. fill + TTL</text>" +
      "</svg>\n\n" +
      "### What you gain\n\n" +
      "| Benefit | Why |\n" +
      "|---|---|\n" +
      "| Lower latency | content served from a nearby PoP, not across the globe |\n" +
      "| Less origin load | most requests never reach your servers |\n" +
      "| Scalability & burst absorption | the edge soaks up traffic spikes |\n" +
      "| Security | DDoS absorption, TLS, WAF at the edge |\n\n" +
      "**Push vs pull:** *pull* CDNs fetch on first miss (easy, lazy); *push* CDNs are pre-loaded by you (good for big/predictable assets). You control freshness with `Cache-Control` / `ETag` and **purge/invalidate** APIs.\n\n" +
      "**Interview tip:** CDNs shine for **static/cacheable** content (images, JS/CSS, video) and increasingly **edge-cached dynamic** content. Discuss **cache keys**, **TTLs**, **invalidation** (versioned URLs / cache-busting hashes beat purges), and stale-while-revalidate.",
    examples: [
      {
        label: "Cache-Control headers (origin response)",
        tech: "javascript",
        runnable: false,
        code: `// Static, versioned asset (filename has a content hash) -> cache forever:
Cache-Control: public, max-age=31536000, immutable

// HTML that may change -> let the CDN serve stale briefly while refreshing:
Cache-Control: public, max-age=0, s-maxage=60, stale-while-revalidate=300

// Per-user / private data -> never cache at the shared edge:
Cache-Control: private, no-store`,
      },
    ],
  },
  {
    title: "What is consistent hashing?",
    answer:
      "## The problem it solves\n\n" +
      "If you place keys with `hash(key) % N` across N servers, then **changing N** (adding/removing a server) remaps **almost every key** — catastrophic for a cache or sharded store. **Consistent hashing** fixes this: adding/removing a node only moves about **K/N** keys.\n\n" +
      "## How it works\n\n" +
      "Map both **nodes and keys** onto a circular hash space (the *ring*). A key is owned by the **first node clockwise** from its position. Remove a node and only its keys move to the next node; add a node and it only steals keys from its neighbor.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 360 300' role='img' aria-label='Consistent hashing ring: a key maps to the next node clockwise'>" +
      "<defs><marker id='ah-ch' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<circle cx='180' cy='150' r='108' class='d-edge'/>" +
      "<circle class='d-box-accent' cx='180' cy='42' r='20'/><text class='d-accent d-text' x='180' y='47' text-anchor='middle'>A</text>" +
      "<circle class='d-box-accent' cx='288' cy='150' r='20'/><text class='d-accent d-text' x='288' y='155' text-anchor='middle'>B</text>" +
      "<circle class='d-box-accent' cx='180' cy='258' r='20'/><text class='d-accent d-text' x='180' y='263' text-anchor='middle'>C</text>" +
      "<circle class='d-box-accent' cx='72' cy='150' r='20'/><text class='d-accent d-text' x='72' y='155' text-anchor='middle'>D</text>" +
      "<circle class='d-arrow' cx='256' cy='74' r='6'/><text class='d-sub' x='256' y='60' text-anchor='middle'>key k</text>" +
      "<path class='d-edge-accent' d='M260,80 A 108 108 0 0 1 286,128' marker-end='url(#ah-ch)'/>" +
      "<text class='d-sub' x='180' y='150' text-anchor='middle'>hash ring</text>" +
      "<text class='d-sub' x='180' y='166' text-anchor='middle'>k goes to next node clockwise (B)</text>" +
      "</svg>\n\n" +
      "**Virtual nodes:** give each physical node many points on the ring (e.g. 100–200). This **evens out** the load and makes rebalancing smoother when nodes join/leave.\n\n" +
      "**Interview tip:** name where it's used — **distributed caches** (memcached client rings), **Dynamo/Cassandra** partitioning. The key selling point is *minimal remapping on membership change*, and **virtual nodes** are the standard fix for uneven distribution and hotspots.",
    examples: [
      {
        label: "Hash ring with virtual nodes",
        variants: [
          {
            tech: "python",
            code: `import hashlib, bisect

class HashRing:
    def __init__(self, nodes, vnodes=100):
        self.vnodes = vnodes
        self.ring = {}          # point_hash -> node
        self.points = []        # sorted hashes
        for n in nodes:
            self.add(n)
    def _h(self, key):
        return int(hashlib.md5(key.encode()).hexdigest(), 16)
    def add(self, node):
        for i in range(self.vnodes):
            h = self._h(node + "#" + str(i))
            self.ring[h] = node
            bisect.insort(self.points, h)
    def get(self, key):
        if not self.ring:
            return None
        h = self._h(key)
        i = bisect.bisect(self.points, h) % len(self.points)  # next clockwise
        return self.ring[self.points[i]]

ring = HashRing(["A", "B", "C", "D"])
for k in ["user:1", "user:2", "cart:9", "img:42"]:
    print(k, "->", ring.get(k))`,
          },
          {
            tech: "go",
            code: `package main

import (
	"crypto/md5"
	"encoding/binary"
	"fmt"
	"sort"
)

type HashRing struct {
	ring   map[uint64]string
	points []uint64
	vnodes int
}

func hash(s string) uint64 {
	sum := md5.Sum([]byte(s))
	return binary.BigEndian.Uint64(sum[:8])
}

func New(vnodes int, nodes ...string) *HashRing {
	r := &HashRing{ring: map[uint64]string{}, vnodes: vnodes}
	for _, n := range nodes {
		r.Add(n)
	}
	return r
}

func (r *HashRing) Add(node string) {
	for i := 0; i < r.vnodes; i++ {
		h := hash(fmt.Sprintf("%s#%d", node, i))
		r.ring[h] = node
		r.points = append(r.points, h)
	}
	sort.Slice(r.points, func(a, b int) bool { return r.points[a] < r.points[b] })
}

func (r *HashRing) Get(key string) string {
	if len(r.points) == 0 {
		return ""
	}
	h := hash(key)
	i := sort.Search(len(r.points), func(i int) bool { return r.points[i] >= h }) % len(r.points)
	return r.ring[r.points[i]]
}

func main() {
	r := New(100, "A", "B", "C", "D")
	for _, k := range []string{"user:1", "user:2", "cart:9", "img:42"} {
		fmt.Println(k, "->", r.Get(k))
	}
}`,
          },
          {
            tech: "java",
            code: `import java.security.MessageDigest;
import java.util.*;

public class Main {
    static class HashRing {
        TreeMap<Long, String> ring = new TreeMap<>();
        int vnodes;
        HashRing(int vnodes, String... nodes) {
            this.vnodes = vnodes;
            for (String n : nodes) add(n);
        }
        long h(String s) {
            try {
                byte[] d = MessageDigest.getInstance("MD5").digest(s.getBytes());
                long v = 0;
                for (int i = 0; i < 8; i++) v = (v << 8) | (d[i] & 0xff);
                return v;
            } catch (Exception e) { throw new RuntimeException(e); }
        }
        void add(String node) {
            for (int i = 0; i < vnodes; i++) ring.put(h(node + "#" + i), node);
        }
        String get(String key) {
            if (ring.isEmpty()) return null;
            Map.Entry<Long, String> e = ring.ceilingEntry(h(key));   // next clockwise
            return (e != null ? e : ring.firstEntry()).getValue();   // wrap around
        }
    }
    public static void main(String[] args) {
        HashRing r = new HashRing(100, "A", "B", "C", "D");
        for (String k : new String[]{"user:1", "user:2", "cart:9", "img:42"})
            System.out.println(k + " -> " + r.get(k));
    }
}`,
          },
        ],
      },
    ],
  },
  {
    title: "What is database sharding?",
    answer:
      "## Sharding = horizontal partitioning\n\n" +
      "**Sharding** splits one logical dataset across **multiple databases/nodes (shards)**, each holding a subset of the rows, chosen by a **shard key**. It lets you scale **writes and storage** beyond a single machine (read replicas only scale reads).\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 470 210' role='img' aria-label='Shard router directing writes to shards by key'>" +
      "<defs><marker id='ah-shard' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='14' y='84' width='76' height='42' rx='6'/><text class='d-sub' x='52' y='110' text-anchor='middle'>Queries</text>" +
      "<rect class='d-box-accent' x='160' y='78' width='112' height='54' rx='8'/><text class='d-text' x='216' y='100' text-anchor='middle'>Shard router</text><text class='d-sub' x='216' y='116' text-anchor='middle'>by shard key</text>" +
      "<rect class='d-box' x='376' y='20' width='86' height='40' rx='6'/><rect class='d-box' x='376' y='86' width='86' height='40' rx='6'/><rect class='d-box' x='376' y='152' width='86' height='40' rx='6'/>" +
      "<text class='d-sub' x='419' y='44' text-anchor='middle'>Shard 0</text><text class='d-sub' x='419' y='110' text-anchor='middle'>Shard 1</text><text class='d-sub' x='419' y='176' text-anchor='middle'>Shard 2</text>" +
      "<line class='d-edge' x1='90' y1='105' x2='158' y2='105' marker-end='url(#ah-shard)'/>" +
      "<line class='d-edge' x1='272' y1='98' x2='374' y2='42' marker-end='url(#ah-shard)'/><line class='d-edge' x1='272' y1='105' x2='374' y2='106' marker-end='url(#ah-shard)'/><line class='d-edge' x1='272' y1='112' x2='374' y2='170' marker-end='url(#ah-shard)'/>" +
      "</svg>\n\n" +
      "### Strategies\n\n" +
      "| Strategy | Shard chosen by | Pros / cons |\n" +
      "|---|---|---|\n" +
      "| Range | key ranges (A–M, N–Z) | range scans easy; hotspots if skewed |\n" +
      "| Hash | hash(key) % N | even spread; range scans hard; resharding moves data |\n" +
      "| Consistent hash | key on a ring | minimal movement on resize |\n" +
      "| Directory / lookup | a mapping service | flexible; the map is a dependency/SPOF |\n\n" +
      "**Interview tip:** the make-or-break decision is the **shard key** — high cardinality, evenly distributed, and aligned with your access pattern (so most queries hit one shard). Call out the pains: **cross-shard joins/transactions**, **hotspots** (celebrity problem), and **resharding** (prefer consistent hashing so growth doesn't reshuffle everything).",
    examples: [
      {
        label: "Routing a key to a shard",
        variants: [
          {
            tech: "python",
            code: `import hashlib

SHARDS = ["db-0", "db-1", "db-2", "db-3"]

def shard_for(key):
    h = int(hashlib.md5(key.encode()).hexdigest(), 16)
    return SHARDS[h % len(SHARDS)]

for k in ["user:1001", "user:1002", "order:77", "order:78"]:
    print(k, "->", shard_for(k))

# NOTE: plain modulo means adding a shard remaps most keys.
# Use consistent hashing to limit how much data moves on resize.`,
          },
          {
            tech: "go",
            code: `package main

import (
	"crypto/md5"
	"encoding/binary"
	"fmt"
)

var shards = []string{"db-0", "db-1", "db-2", "db-3"}

func shardFor(key string) string {
	sum := md5.Sum([]byte(key))
	h := binary.BigEndian.Uint64(sum[:8])
	return shards[h%uint64(len(shards))]
}

func main() {
	for _, k := range []string{"user:1001", "user:1002", "order:77", "order:78"} {
		fmt.Println(k, "->", shardFor(k))
	}
	// NOTE: modulo remaps most keys when len(shards) changes.
	// Prefer consistent hashing to minimize data movement.
}`,
          },
        ],
      },
    ],
  },
  {
    title: "What is database replication?",
    answer:
      "## Replication = copies of the data\n\n" +
      "**Replication** keeps the same data on **multiple nodes** for three reasons: **high availability** (survive a node loss), **read scaling** (serve reads from many replicas), and **locality** (replicas near users).\n\n" +
      "The common topology is **single-leader**: all writes go to the **leader**, which streams its change log to **followers**; reads can be served by followers.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 470 220' role='img' aria-label='Single-leader replication: writes to leader, reads from followers'>" +
      "<defs><marker id='ah-repl' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='12' y='92' width='70' height='40' rx='6'/><text class='d-sub' x='47' y='117' text-anchor='middle'>Writes</text>" +
      "<rect class='d-box-accent' x='150' y='86' width='96' height='52' rx='8'/><text class='d-text' x='198' y='108' text-anchor='middle'>Leader</text><text class='d-sub' x='198' y='124' text-anchor='middle'>(primary)</text>" +
      "<rect class='d-box' x='362' y='40' width='96' height='42' rx='6'/><rect class='d-box' x='362' y='140' width='96' height='42' rx='6'/>" +
      "<text class='d-sub' x='410' y='65' text-anchor='middle'>Follower 1</text><text class='d-sub' x='410' y='165' text-anchor='middle'>Follower 2</text>" +
      "<line class='d-edge' x1='82' y1='112' x2='148' y2='112' marker-end='url(#ah-repl)'/>" +
      "<line class='d-edge-dashed' x1='246' y1='104' x2='360' y2='62' marker-end='url(#ah-repl)'/><line class='d-edge-dashed' x1='246' y1='120' x2='360' y2='162' marker-end='url(#ah-repl)'/>" +
      "<text class='d-sub' x='300' y='150' text-anchor='middle'>replicate (async)</text>" +
      "<text class='d-sub' x='410' y='100' text-anchor='middle'>reads</text>" +
      "</svg>\n\n" +
      "### Key choices\n\n" +
      "| Choice | Options | Trade-off |\n" +
      "|---|---|---|\n" +
      "| Sync vs async | wait for replicas vs fire-and-forget | durability/consistency vs write latency |\n" +
      "| Topology | single-leader / multi-leader / leaderless | simplicity vs multi-region writes vs conflict handling |\n" +
      "| Read source | leader vs follower | fresh reads vs scale (with lag) |\n\n" +
      "**Interview tip:** the headline risk is **replication lag** → **stale reads**. Mention **read-your-own-writes** (route a user's reads to the leader briefly after they write), **failover** (promote a follower, fence the old leader to avoid split-brain), and that **synchronous** replication trades latency for durability. Multi-leader/leaderless add **conflict resolution** (LWW, vector clocks, CRDTs).",
    examples: [
      {
        label: "Read routing with read-your-writes",
        tech: "javascript",
        runnable: false,
        code: `// Route reads to a follower for scale, but send a user to the leader
// briefly after they write so they never see their own stale data.
function pickReadDB(userId, lastWriteAt) {
  const RECENT_MS = 3000; // longer than typical replication lag
  if (Date.now() - (lastWriteAt[userId] ?? 0) < RECENT_MS) {
    return leader;        // read-your-writes: hit the primary
  }
  return followers[Math.floor(Math.random() * followers.length)];
}`,
      },
    ],
  },
  {
    title: "What is a message queue and why use one?",
    answer:
      "## What a message queue gives you\n\n" +
      "A **message queue** is a buffer between **producers** and **consumers**. Producers drop messages in and move on; consumers pull and process them at their own pace. This **decouples** the two sides in time and scale.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 200' role='img' aria-label='Producer, queue, and consumer workers'>" +
      "<defs><marker id='ah-mq' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='12' y='80' width='84' height='44' rx='6'/><text class='d-sub' x='54' y='106' text-anchor='middle'>Producer</text>" +
      "<rect class='d-box-accent' x='160' y='78' width='150' height='48' rx='8'/>" +
      "<line class='d-edge' x1='188' y1='102' x2='298' y2='102'/>" +
      "<text class='d-sub' x='235' y='118' text-anchor='middle'>queue (FIFO buffer)</text>" +
      "<rect class='d-box' x='386' y='40' width='84' height='40' rx='6'/><rect class='d-box' x='386' y='120' width='84' height='40' rx='6'/>" +
      "<text class='d-sub' x='428' y='64' text-anchor='middle'>Worker 1</text><text class='d-sub' x='428' y='144' text-anchor='middle'>Worker 2</text>" +
      "<line class='d-edge' x1='96' y1='102' x2='158' y2='102' marker-end='url(#ah-mq)'/>" +
      "<line class='d-edge' x1='310' y1='96' x2='384' y2='62' marker-end='url(#ah-mq)'/><line class='d-edge' x1='310' y1='108' x2='384' y2='140' marker-end='url(#ah-mq)'/>" +
      "</svg>\n\n" +
      "### Why use one\n\n" +
      "- **Decoupling** — producer and consumer can be deployed, scaled, and fail independently.\n" +
      "- **Buffering / spike absorption** — a traffic burst queues up instead of crashing the backend.\n" +
      "- **Async work** — return fast to the user; do email/thumbnails/billing in the background.\n" +
      "- **Reliability** — retries + **dead-letter queue** for poison messages; work survives a consumer crash.\n" +
      "- **Fan-out** — pub/sub delivers one event to many subscribers.\n\n" +
      "| | Queue (point-to-point) | Pub/Sub (topic) |\n" +
      "|---|---|---|\n" +
      "| Delivery | one consumer per message | every subscriber gets a copy |\n" +
      "| Use for | work/task distribution | event broadcast / fan-out |\n" +
      "| Examples | SQS, RabbitMQ queue | SNS, Kafka, Redis pub/sub |\n\n" +
      "**Interview tip:** discuss **delivery semantics** — most systems are **at-least-once**, so consumers must be **idempotent** (exactly-once is mostly a myth end-to-end). Mention **ordering** (global ordering is costly; Kafka orders only within a partition), **backpressure**, and **DLQs** for messages that keep failing.",
    examples: [
      {
        label: "Producer / consumer workers",
        variants: [
          {
            tech: "python",
            code: `import queue, threading, time

q = queue.Queue()

def worker(name):
    while True:
        job = q.get()
        if job is None:           # shutdown signal
            break
        print(name, "processing", job)
        time.sleep(0.05)          # simulate work
        q.task_done()

workers = [threading.Thread(target=worker, args=("w" + str(i),)) for i in range(2)]
for t in workers:
    t.start()

for i in range(6):                # producer enqueues, decoupled from consumers
    q.put("job-" + str(i))

q.join()                          # wait until all jobs processed
for _ in workers:
    q.put(None)
for t in workers:
    t.join()
print("done")`,
          },
          {
            tech: "go",
            code: `package main

import (
	"fmt"
	"sync"
	"time"
)

func main() {
	jobs := make(chan string, 10) // buffered queue
	var wg sync.WaitGroup

	for i := 0; i < 2; i++ { // two consumer workers
		wg.Add(1)
		go func(name string) {
			defer wg.Done()
			for job := range jobs { // consume until the channel is closed
				fmt.Println(name, "processing", job)
				time.Sleep(50 * time.Millisecond)
			}
		}(fmt.Sprintf("w%d", i))
	}

	for i := 0; i < 6; i++ { // producer
		jobs <- fmt.Sprintf("job-%d", i)
	}
	close(jobs)
	wg.Wait()
	fmt.Println("done")
}`,
          },
        ],
      },
    ],
  },
];

export default augments;
