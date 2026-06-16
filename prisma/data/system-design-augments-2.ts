import type { SystemDesignAugment } from "./system-design-augments.types";

/**
 * System-design augments — batch 2 (data/consistency, resiliency, API patterns).
 * Conventions: answer = double-quoted prose ("\n"-joined, backticks stay
 * literal) + inline <svg class='iq-diagram'> (single-quote attrs, no backticks)
 * + GFM tables. Code variants: template literals, backtick-free, no ${}.
 */
const augments: SystemDesignAugment[] = [
  {
    title: "When would you choose SQL vs NoSQL?",
    answer:
      "## SQL vs NoSQL\n\n" +
      "It comes down to your **data shape**, **consistency needs**, and **scale/access pattern** — not fashion.\n\n" +
      "- **SQL (relational):** a fixed schema of tables with relationships, **ACID** transactions, rich joins and ad-hoc queries. Scales **up** easily; scaling **out** (sharding) takes work.\n" +
      "- **NoSQL:** a family of stores — **document** (Mongo), **key-value** (Redis, DynamoDB), **wide-column** (Cassandra), **graph** (Neo4j). Flexible/!schema, built to scale **out**, high write throughput, often **eventual** consistency. You model the data for your queries.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 185' role='img' aria-label='Relational table versus NoSQL data models'>" +
      "<text class='d-sub' x='110' y='20' text-anchor='middle'>SQL — relational</text>" +
      "<rect class='d-box-accent' x='40' y='32' width='140' height='104' rx='6'/>" +
      "<line class='d-edge' x1='40' y1='60' x2='180' y2='60'/><line class='d-edge' x1='40' y1='88' x2='180' y2='88'/><line class='d-edge' x1='40' y1='112' x2='180' y2='112'/>" +
      "<line class='d-edge' x1='87' y1='32' x2='87' y2='136'/><line class='d-edge' x1='133' y1='32' x2='133' y2='136'/>" +
      "<text class='d-sub' x='110' y='154' text-anchor='middle'>fixed schema, rows + columns</text>" +
      "<line class='d-edge-dashed' x1='240' y1='26' x2='240' y2='160'/>" +
      "<text class='d-sub' x='362' y='20' text-anchor='middle'>NoSQL — pick a model</text>" +
      "<rect class='d-box' x='300' y='32' width='70' height='38' rx='6'/><text class='d-sub' x='335' y='55' text-anchor='middle'>Document</text>" +
      "<rect class='d-box' x='378' y='32' width='82' height='38' rx='6'/><text class='d-sub' x='419' y='55' text-anchor='middle'>Key-Value</text>" +
      "<rect class='d-box' x='300' y='80' width='82' height='38' rx='6'/><text class='d-sub' x='341' y='103' text-anchor='middle'>Wide-Col</text>" +
      "<rect class='d-box' x='390' y='80' width='70' height='38' rx='6'/><text class='d-sub' x='425' y='103' text-anchor='middle'>Graph</text>" +
      "<text class='d-sub' x='378' y='140' text-anchor='middle'>flexible schema, scale-out</text>" +
      "</svg>\n\n" +
      "| | SQL (relational) | NoSQL |\n" +
      "|---|---|---|\n" +
      "| Schema | fixed, predefined | flexible / schema-less |\n" +
      "| Consistency | strong (ACID) | often eventual (BASE) |\n" +
      "| Scaling | up + read replicas; sharding is work | out by design |\n" +
      "| Queries | rich joins, ad-hoc | limited joins; model for access |\n" +
      "| Best for | transactions, relationships, reporting | scale, high writes, evolving data |\n" +
      "| Examples | PostgreSQL, MySQL | Mongo, Redis/Dynamo, Cassandra, Neo4j |\n\n" +
      "**Interview tip:** it is rarely either/or — real systems use **polyglot persistence** (Postgres for orders, Redis for sessions, a search engine for full-text). Note that modern Postgres scales far and has JSONB, and that **NoSQL = 'not only SQL'**. Pick per access pattern; the shard/consistency story is what should drive the choice.",
    examples: [
      {
        label: "Relational schema (SQL)",
        tech: "sql",
        code: `-- Normalized: users and orders in separate tables, joined by user_id
CREATE TABLE users (
  id    BIGINT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name  TEXT NOT NULL
);

CREATE TABLE orders (
  id          BIGINT PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id),
  total_cents INT    NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Read needs a join:
SELECT u.name, o.total_cents
FROM orders o JOIN users u ON u.id = o.user_id
WHERE u.email = 'ada@example.com';`,
      },
      {
        label: "Document model (NoSQL)",
        tech: "javascript",
        runnable: false,
        code: `// Same data denormalized into ONE document — no joins, one read.
{
  "_id": "user_42",
  "email": "ada@example.com",
  "name": "Ada",
  "orders": [
    { "id": "o_1", "totalCents": 4999, "createdAt": "2024-01-04T10:00:00Z" },
    { "id": "o_2", "totalCents": 1200, "createdAt": "2024-02-11T08:30:00Z" }
  ]
}`,
      },
    ],
  },
  {
    title: "What is the difference between strong and eventual consistency?",
    answer:
      "## Strong vs eventual consistency\n\n" +
      "- **Strong consistency:** once a write completes, **every** subsequent read (on any node) returns that value. You never see stale data — but the system must coordinate (quorums/leader), which costs **latency** and **availability** during partitions.\n" +
      "- **Eventual consistency:** replicas accept the write and **converge over time**. Reads may briefly return stale data, but in exchange you get **low latency** and **high availability**.\n\n" +
      "The gap between a write landing on the leader and reaching a replica is **replication lag** — the window in which a replica read is stale:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 200' role='img' aria-label='Replication lag causing a stale read under eventual consistency'>" +
      "<defs><marker id='ah-cons' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<text class='d-sub' x='14' y='56' >Leader</text>" +
      "<line class='d-edge' x1='70' y1='60' x2='458' y2='60' marker-end='url(#ah-cons)'/>" +
      "<circle class='d-accent' cx='130' cy='60' r='5'/><text class='d-sub' x='130' y='46' text-anchor='middle'>write x=2</text>" +
      "<text class='d-sub' x='14' y='150'>Replica</text>" +
      "<line class='d-edge' x1='70' y1='154' x2='458' y2='154' marker-end='url(#ah-cons)'/>" +
      "<line class='d-edge-dashed' x1='132' y1='66' x2='250' y2='150' marker-end='url(#ah-cons)'/>" +
      "<text class='d-sub' x='205' y='112' text-anchor='middle'>replicate (lag)</text>" +
      "<circle class='d-arrow' cx='190' cy='154' r='5'/><text class='d-sub' x='185' y='176' text-anchor='middle'>read -> x=1 (stale)</text>" +
      "<circle class='d-accent' cx='330' cy='154' r='5'/><text class='d-sub' x='330' y='176' text-anchor='middle'>read -> x=2</text>" +
      "</svg>\n\n" +
      "| | Strong | Eventual |\n" +
      "|---|---|---|\n" +
      "| Read after write | always latest | may be stale briefly |\n" +
      "| Latency | higher (coordination) | lower |\n" +
      "| Partition behavior | sacrifices availability (CP) | stays available (AP) |\n" +
      "| Examples | RDBMS, etcd, Spanner | DynamoDB, Cassandra, DNS |\n" +
      "| Fits | balances, inventory, locks | likes, feeds, view counts |\n\n" +
      "**Interview tip:** it is a **spectrum**, not a binary. Mention the useful midpoints — **read-your-writes** (a user always sees their own writes), **monotonic reads** (never go backwards in time), and **causal** consistency. Tie it back to CAP/PACELC: strong = pay latency/availability for correctness; eventual = the opposite.",
  },
  {
    title: "What is idempotency and why does it matter?",
    answer:
      "## Idempotency\n\n" +
      "An operation is **idempotent** if performing it **many times has the same effect as performing it once**. `GET`, `PUT`, and `DELETE` are idempotent; **`POST` is not** (two POSTs = two resources).\n\n" +
      "It matters because the network is unreliable: a client times out and **retries**, or a queue delivers **at-least-once**. Without idempotency a retry double-charges a card or creates duplicate orders. The fix is an **idempotency key**: the client sends a unique key per logical operation; the server records it and returns the **saved result** for any duplicate.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 185' role='img' aria-label='Idempotency key dedupes a retried request to a single charge'>" +
      "<defs><marker id='ah-idem' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='14' y='70' width='84' height='48' rx='6'/><text class='d-sub' x='56' y='90' text-anchor='middle'>Client</text><text class='d-sub' x='56' y='106' text-anchor='middle'>retries</text>" +
      "<line class='d-edge' x1='98' y1='86' x2='214' y2='86' marker-end='url(#ah-idem)'/>" +
      "<line class='d-edge' x1='98' y1='102' x2='214' y2='102' marker-end='url(#ah-idem)'/>" +
      "<text class='d-sub' x='156' y='72' text-anchor='middle'>POST /charge</text>" +
      "<text class='d-sub' x='156' y='128' text-anchor='middle'>Idempotency-Key: k1 (x2)</text>" +
      "<rect class='d-box-accent' x='216' y='64' width='132' height='60' rx='8'/><text class='d-text' x='282' y='88' text-anchor='middle'>Payment svc</text><text class='d-sub' x='282' y='104' text-anchor='middle'>seen k1? return saved</text>" +
      "<line class='d-edge-accent' x1='348' y1='94' x2='414' y2='94' marker-end='url(#ah-idem)'/><text class='d-sub' x='382' y='82' text-anchor='middle'>charge</text>" +
      "<rect class='d-box' x='416' y='74' width='54' height='40' rx='6'/><text class='d-sub' x='443' y='98' text-anchor='middle'>ONCE</text>" +
      "</svg>\n\n" +
      "| HTTP method | Idempotent? |\n" +
      "|---|---|\n" +
      "| GET, HEAD | yes (read-only) |\n" +
      "| PUT, DELETE | yes (same end state) |\n" +
      "| POST | no -> use an idempotency key |\n\n" +
      "**Interview tip:** this is the backbone of **reliable payments** and **at-least-once** message consumers. Store the key with its result and a **TTL** in a fast store (Redis), and make the check-and-set **atomic** so two concurrent retries can't both proceed. Pair it with retries + exponential backoff.",
    examples: [
      {
        label: "Idempotency-key handler",
        variants: [
          {
            tech: "python",
            code: `processed = {}   # key -> saved result (use Redis + TTL in production)

def charge(idempotency_key, amount):
    if idempotency_key in processed:
        print("duplicate", idempotency_key, "-> returning saved result")
        return processed[idempotency_key]
    # ... actually charge the card exactly once here ...
    result = {"status": "charged", "amount": amount}
    processed[idempotency_key] = result
    print("charged", amount, "for", idempotency_key)
    return result

charge("k1", 4999)   # charges
charge("k1", 4999)   # retry -> no double charge
charge("k2", 1200)   # different op -> charges`,
          },
          {
            tech: "go",
            code: `package main

import "fmt"

var processed = map[string]string{}

func charge(key string, amount int) string {
	if r, ok := processed[key]; ok {
		fmt.Println("duplicate", key, "-> returning saved result")
		return r
	}
	result := fmt.Sprintf("charged %d", amount)
	processed[key] = result
	fmt.Println(result, "for", key)
	return result
}

func main() {
	charge("k1", 4999) // charges
	charge("k1", 4999) // retry -> no double charge
	charge("k2", 1200) // charges
}`,
          },
          {
            tech: "node",
            code: `const processed = new Map(); // key -> result (Redis + TTL in production)

function charge(key, amount) {
  if (processed.has(key)) {
    console.log("duplicate", key, "-> returning saved result");
    return processed.get(key);
  }
  const result = { status: "charged", amount };
  processed.set(key, result);
  console.log("charged", amount, "for", key);
  return result;
}

charge("k1", 4999);
charge("k1", 4999); // retry -> no double charge
charge("k2", 1200);`,
          },
        ],
      },
    ],
  },
  {
    title: "What is the circuit breaker pattern?",
    answer:
      "## Circuit breaker\n\n" +
      "A **circuit breaker** wraps calls to a flaky dependency and **stops calling it when it is clearly failing**, so one slow/broken service doesn't cascade into a system-wide outage (threads pile up waiting, queues back up, everything falls over).\n\n" +
      "It is a small state machine:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 215' role='img' aria-label='Circuit breaker states: closed, open, half-open'>" +
      "<defs><marker id='ah-cb' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='38' y='40' width='120' height='52' rx='8'/><text class='d-text' x='98' y='63' text-anchor='middle'>CLOSED</text><text class='d-sub' x='98' y='80' text-anchor='middle'>calls pass</text>" +
      "<rect class='d-box-accent' x='322' y='40' width='120' height='52' rx='8'/><text class='d-text' x='382' y='63' text-anchor='middle'>OPEN</text><text class='d-sub' x='382' y='80' text-anchor='middle'>fail fast</text>" +
      "<rect class='d-box' x='180' y='150' width='130' height='52' rx='8'/><text class='d-text' x='245' y='173' text-anchor='middle'>HALF-OPEN</text><text class='d-sub' x='245' y='190' text-anchor='middle'>allow one probe</text>" +
      "<line class='d-edge' x1='158' y1='58' x2='320' y2='58' marker-end='url(#ah-cb)'/><text class='d-sub' x='239' y='50' text-anchor='middle'>failures >= N</text>" +
      "<line class='d-edge' x1='392' y1='94' x2='305' y2='150' marker-end='url(#ah-cb)'/><text class='d-sub' x='378' y='130' text-anchor='middle'>after cooldown</text>" +
      "<line class='d-edge' x1='188' y1='150' x2='108' y2='94' marker-end='url(#ah-cb)'/><text class='d-sub' x='112' y='130' text-anchor='middle'>probe ok</text>" +
      "<line class='d-edge' x1='300' y1='168' x2='372' y2='94' marker-end='url(#ah-cb)'/><text class='d-sub' x='362' y='176' text-anchor='middle'>probe fails</text>" +
      "</svg>\n\n" +
      "**CLOSED** (normal) → too many failures → **OPEN** (reject instantly, no call) → after a cooldown → **HALF-OPEN** (let one trial through) → success → **CLOSED**, or failure → back to **OPEN**.\n\n" +
      "**Interview tip:** circuit breakers go hand-in-hand with **timeouts** (never wait forever), **retries with backoff + jitter**, **fallbacks** (cached/default response), and **bulkheads** (isolate resource pools). Name a library: **resilience4j** (Java) or the older Hystrix. The whole point is **fail fast and shed load** so the dependency can recover.",
    examples: [
      {
        label: "Circuit breaker",
        variants: [
          {
            tech: "python",
            code: `import time

class CircuitBreaker:
    def __init__(self, threshold=3, cooldown=5):
        self.threshold = threshold
        self.cooldown = cooldown
        self.failures = 0
        self.state = "CLOSED"
        self.opened_at = 0

    def call(self, fn):
        if self.state == "OPEN":
            if time.time() - self.opened_at >= self.cooldown:
                self.state = "HALF_OPEN"           # time to probe
            else:
                raise Exception("circuit OPEN - failing fast")
        try:
            result = fn()
        except Exception:
            self.failures += 1
            if self.failures >= self.threshold:
                self.state = "OPEN"
                self.opened_at = time.time()
            raise
        self.failures = 0                          # success resets
        self.state = "CLOSED"
        return result

cb = CircuitBreaker(threshold=2, cooldown=5)
def flaky():
    raise Exception("downstream down")

for i in range(4):
    try:
        cb.call(flaky)
    except Exception as e:
        print(i, cb.state, "-", e)`,
          },
          {
            tech: "go",
            code: `package main

import (
	"errors"
	"fmt"
	"time"
)

type CircuitBreaker struct {
	threshold int
	cooldown  time.Duration
	failures  int
	state     string
	openedAt  time.Time
}

func (cb *CircuitBreaker) Call(fn func() error) error {
	if cb.state == "OPEN" {
		if time.Since(cb.openedAt) >= cb.cooldown {
			cb.state = "HALF_OPEN" // probe
		} else {
			return errors.New("circuit OPEN - failing fast")
		}
	}
	if err := fn(); err != nil {
		cb.failures++
		if cb.failures >= cb.threshold {
			cb.state = "OPEN"
			cb.openedAt = time.Now()
		}
		return err
	}
	cb.failures = 0
	cb.state = "CLOSED"
	return nil
}

func main() {
	cb := &CircuitBreaker{threshold: 2, cooldown: 5 * time.Second, state: "CLOSED"}
	flaky := func() error { return errors.New("downstream down") }
	for i := 0; i < 4; i++ {
		err := cb.Call(flaky)
		fmt.Println(i, cb.state, "-", err)
	}
}`,
          },
        ],
      },
    ],
  },
  {
    title: "What is an API gateway?",
    answer:
      "## API gateway\n\n" +
      "An **API gateway** is a single entry point that sits in front of your services and handles **cross-cutting concerns** so each service doesn't have to. Clients talk to the gateway; it routes to the right service and applies auth, rate limiting, TLS, etc., on the way.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 215' role='img' aria-label='API gateway in front of microservices'>" +
      "<defs><marker id='ah-gw' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='12' y='86' width='76' height='46' rx='6'/><text class='d-sub' x='50' y='113' text-anchor='middle'>Clients</text>" +
      "<rect class='d-box-accent' x='162' y='58' width='124' height='100' rx='8'/><text class='d-text' x='224' y='82' text-anchor='middle'>API Gateway</text><text class='d-sub' x='224' y='102' text-anchor='middle'>auth + TLS</text><text class='d-sub' x='224' y='118' text-anchor='middle'>rate limit</text><text class='d-sub' x='224' y='134' text-anchor='middle'>routing + cache</text>" +
      "<rect class='d-box' x='372' y='28' width='94' height='38' rx='6'/><rect class='d-box' x='372' y='90' width='94' height='38' rx='6'/><rect class='d-box' x='372' y='152' width='94' height='38' rx='6'/>" +
      "<text class='d-sub' x='419' y='51' text-anchor='middle'>Auth svc</text><text class='d-sub' x='419' y='113' text-anchor='middle'>Orders svc</text><text class='d-sub' x='419' y='175' text-anchor='middle'>Users svc</text>" +
      "<line class='d-edge' x1='88' y1='108' x2='160' y2='108' marker-end='url(#ah-gw)'/>" +
      "<line class='d-edge' x1='286' y1='100' x2='370' y2='48' marker-end='url(#ah-gw)'/><line class='d-edge' x1='286' y1='108' x2='370' y2='109' marker-end='url(#ah-gw)'/><line class='d-edge' x1='286' y1='116' x2='370' y2='170' marker-end='url(#ah-gw)'/>" +
      "</svg>\n\n" +
      "| The gateway handles | so services don't |\n" +
      "|---|---|\n" +
      "| Auth / authz, TLS termination | re-implement auth each |\n" +
      "| Rate limiting, throttling | guard themselves |\n" +
      "| Routing, path rewriting | know each other's hosts |\n" +
      "| Aggregation / BFF | force chatty clients |\n" +
      "| Caching, logging, metrics | duplicate plumbing |\n\n" +
      "**Interview tip:** keep **business logic out** of the gateway — it routes and applies policy, it isn't a service. It's a potential **bottleneck / single point of failure**, so run it **HA and horizontally scaled**. Mention the **BFF (backend-for-frontend)** variant when web and mobile need different shapes, and that a service mesh handles east-west traffic while the gateway handles north-south.",
    examples: [
      {
        label: "Gateway routing table (concept)",
        tech: "javascript",
        runnable: false,
        code: `// Match path -> upstream service. Cross-cutting policy applied centrally.
const routes = [
  { prefix: "/auth",   upstream: "http://auth-svc:8080" },
  { prefix: "/orders", upstream: "http://orders-svc:8080", auth: true, rateLimit: "100/min" },
  { prefix: "/users",  upstream: "http://users-svc:8080", auth: true },
];

// Every request flows through the same pipeline:
//   tls -> authenticate -> rateLimit -> route(prefix) -> proxy(upstream)`,
      },
    ],
  },
  {
    title: "What is the difference between REST and GraphQL?",
    answer:
      "## REST vs GraphQL\n\n" +
      "- **REST:** resources exposed as multiple endpoints, manipulated with HTTP verbs. Simple and cacheable, but a screen often needs **several round trips**, and each endpoint returns a fixed shape (**over- or under-fetching**).\n" +
      "- **GraphQL:** a **single endpoint** with a typed schema. The client sends a query describing **exactly** the fields it wants, and gets them back in **one round trip** — great for nested data and varied clients.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 205' role='img' aria-label='REST multiple round trips versus a single GraphQL query'>" +
      "<defs><marker id='ah-rest' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<text class='d-sub' x='115' y='20' text-anchor='middle'>REST: many endpoints</text>" +
      "<rect class='d-box' x='70' y='32' width='90' height='32' rx='6'/><text class='d-sub' x='115' y='52' text-anchor='middle'>client</text>" +
      "<rect class='d-box' x='70' y='150' width='90' height='32' rx='6'/><text class='d-sub' x='115' y='170' text-anchor='middle'>server</text>" +
      "<line class='d-edge' x1='90' y1='64' x2='90' y2='148' marker-end='url(#ah-rest)'/><line class='d-edge' x1='115' y1='64' x2='115' y2='148' marker-end='url(#ah-rest)'/><line class='d-edge' x1='140' y1='64' x2='140' y2='148' marker-end='url(#ah-rest)'/>" +
      "<text class='d-sub' x='115' y='112' text-anchor='middle'>3 round trips</text>" +
      "<line class='d-edge-dashed' x1='240' y1='18' x2='240' y2='190'/>" +
      "<text class='d-sub' x='365' y='20' text-anchor='middle'>GraphQL: one endpoint</text>" +
      "<rect class='d-box' x='320' y='32' width='90' height='32' rx='6'/><text class='d-sub' x='365' y='52' text-anchor='middle'>client</text>" +
      "<rect class='d-box-accent' x='320' y='150' width='90' height='32' rx='6'/><text class='d-sub' x='365' y='170' text-anchor='middle'>/graphql</text>" +
      "<line class='d-edge-accent' x1='352' y1='64' x2='352' y2='148' marker-end='url(#ah-rest)'/><line class='d-edge-accent' x1='380' y1='148' x2='380' y2='64' marker-end='url(#ah-rest)'/>" +
      "<text class='d-sub' x='366' y='112' text-anchor='middle'>one query</text>" +
      "</svg>\n\n" +
      "| | REST | GraphQL |\n" +
      "|---|---|---|\n" +
      "| Endpoints | many (per resource) | one (/graphql) |\n" +
      "| Data shape | server-defined; over/under-fetch | client picks exact fields |\n" +
      "| Round trips | several for nested data | one for a graph |\n" +
      "| Caching | easy (HTTP/CDN by URL) | harder (POST, app-level) |\n" +
      "| Typing | docs / OpenAPI | built-in schema + introspection |\n" +
      "| Watch out | versioning, chatty clients | N+1, query-cost / abuse |\n\n" +
      "**Interview tip:** not either/or. GraphQL shines when **many clients need different shapes** or data is **highly relational** (aggregation in one call). REST stays great for **simple, cacheable, public** APIs. With GraphQL, call out **N+1** (fix with DataLoader/batching) and **query-cost limiting** to prevent abusive deep queries.",
    examples: [
      {
        label: "REST: assemble from several endpoints",
        tech: "javascript",
        runnable: false,
        code: `// REST: a screen needs data from multiple endpoints (N round trips)
const user   = await fetch('/api/users/42').then(r => r.json());
const orders = await fetch('/api/users/42/orders').then(r => r.json());
const items  = await fetch('/api/orders/' + orders[0].id + '/items').then(r => r.json());`,
      },
      {
        label: "GraphQL: one query, exact shape",
        runnable: false,
        code: `# One request; the server returns exactly this shape, in one round trip.
query {
  user(id: 42) {
    name
    orders(first: 1) {
      id
      items { sku, qty }
    }
  }
}`,
      },
    ],
  },
  {
    title: "What is a Bloom filter and when is it useful?",
    answer:
      "## Bloom filter\n\n" +
      "A **Bloom filter** is a compact, probabilistic structure that answers **set membership**: *is this element in the set?* It can say **'definitely not present'** or **'possibly present'** — there are **no false negatives**, only tunable **false positives**.\n\n" +
      "It's a **bit array** plus **k hash functions**. To add an element, hash it k ways and set those k bits. To test, check those k bits: if **any** is 0, the element was never added; if all are 1, it's *probably* there.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 195' role='img' aria-label='Bloom filter: k hashes set bits in a bit array'>" +
      "<defs><marker id='ah-bloom' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='14' y='78' width='80' height='42' rx='6'/><text class='d-sub' x='54' y='103' text-anchor='middle'>add 'ada'</text>" +
      "<text class='d-sub' x='150' y='60' text-anchor='middle'>h1, h2, h3</text>" +
      "<line class='d-edge' x1='96' y1='95' x2='238' y2='92' marker-end='url(#ah-bloom)'/>" +
      "<line class='d-edge' x1='96' y1='100' x2='322' y2='92' marker-end='url(#ah-bloom)'/>" +
      "<line class='d-edge' x1='96' y1='105' x2='378' y2='92' marker-end='url(#ah-bloom)'/>" +
      "<rect class='d-box' x='200' y='96' width='27' height='30' rx='3'/>" +
      "<rect class='d-box-accent' x='228' y='96' width='27' height='30' rx='3'/>" +
      "<rect class='d-box' x='256' y='96' width='27' height='30' rx='3'/>" +
      "<rect class='d-box' x='284' y='96' width='27' height='30' rx='3'/>" +
      "<rect class='d-box-accent' x='312' y='96' width='27' height='30' rx='3'/>" +
      "<rect class='d-box' x='340' y='96' width='27' height='30' rx='3'/>" +
      "<rect class='d-box-accent' x='368' y='96' width='27' height='30' rx='3'/>" +
      "<rect class='d-box' x='396' y='96' width='27' height='30' rx='3'/>" +
      "<text class='d-sub' x='311' y='150' text-anchor='middle'>bit array — set bits at h1,h2,h3</text>" +
      "</svg>\n\n" +
      "**When it's useful:** skip an expensive lookup for keys that are **definitely absent**. LSM-tree stores (**Cassandra, Bigtable, RocksDB**) keep a Bloom filter per SSTable to avoid disk reads for missing keys; CDNs/caches use them to avoid caching one-hit items; crawlers track **seen URLs**.\n\n" +
      "**Interview tip:** the key properties — **no false negatives**, false positives only, and you can't delete (use a **counting** Bloom filter for that). You size the bit array **m** and hash count **k** for a target false-positive rate given **n** expected items. Net win: huge memory savings versus a real set when an occasional false positive is cheap.",
    examples: [
      {
        label: "Bloom filter (add / contains)",
        variants: [
          {
            tech: "python",
            code: `import hashlib

class BloomFilter:
    def __init__(self, size=1000, k=3):
        self.size = size
        self.k = k
        self.bits = [0] * size
    def _positions(self, item):
        for i in range(self.k):
            h = hashlib.md5((str(i) + item).encode()).hexdigest()
            yield int(h, 16) % self.size
    def add(self, item):
        for pos in self._positions(item):
            self.bits[pos] = 1
    def contains(self, item):
        return all(self.bits[pos] for pos in self._positions(item))

bf = BloomFilter()
for name in ["ada", "grace", "linus"]:
    bf.add(name)

print("ada  ->", bf.contains("ada"))    # True  (was added)
print("alan ->", bf.contains("alan"))   # False (definitely not present)
# 'True' can be a false positive; 'False' is always correct.`,
          },
          {
            tech: "go",
            code: `package main

import (
	"crypto/md5"
	"encoding/binary"
	"fmt"
)

type Bloom struct {
	bits []bool
	k    int
}

func New(size, k int) *Bloom { return &Bloom{bits: make([]bool, size), k: k} }

func (b *Bloom) positions(item string) []int {
	out := make([]int, b.k)
	for i := 0; i < b.k; i++ {
		sum := md5.Sum([]byte(fmt.Sprintf("%d%s", i, item)))
		out[i] = int(binary.BigEndian.Uint64(sum[:8]) % uint64(len(b.bits)))
	}
	return out
}

func (b *Bloom) Add(item string) {
	for _, p := range b.positions(item) {
		b.bits[p] = true
	}
}

func (b *Bloom) Contains(item string) bool {
	for _, p := range b.positions(item) {
		if !b.bits[p] {
			return false // definitely absent
		}
	}
	return true // possibly present
}

func main() {
	bf := New(1000, 3)
	for _, n := range []string{"ada", "grace", "linus"} {
		bf.Add(n)
	}
	fmt.Println("ada  ->", bf.Contains("ada"))
	fmt.Println("alan ->", bf.Contains("alan"))
}`,
          },
          {
            tech: "java",
            code: `import java.security.MessageDigest;

public class Main {
    static class Bloom {
        boolean[] bits;
        int k;
        Bloom(int size, int k) { bits = new boolean[size]; this.k = k; }
        int[] positions(String item) {
            int[] out = new int[k];
            try {
                for (int i = 0; i < k; i++) {
                    byte[] d = MessageDigest.getInstance("MD5").digest((i + item).getBytes());
                    long v = 0;
                    for (int j = 0; j < 8; j++) v = (v << 8) | (d[j] & 0xff);
                    out[i] = (int) Math.floorMod(v, bits.length);
                }
            } catch (Exception e) { throw new RuntimeException(e); }
            return out;
        }
        void add(String item) { for (int p : positions(item)) bits[p] = true; }
        boolean contains(String item) {
            for (int p : positions(item)) if (!bits[p]) return false;
            return true;
        }
    }
    public static void main(String[] args) {
        Bloom bf = new Bloom(1000, 3);
        for (String n : new String[]{"ada", "grace", "linus"}) bf.add(n);
        System.out.println("ada  -> " + bf.contains("ada"));
        System.out.println("alan -> " + bf.contains("alan"));
    }
}`,
          },
        ],
      },
    ],
  },
  {
    title: "What is a write-ahead log (WAL)?",
    answer:
      "## Write-ahead log (WAL)\n\n" +
      "A **WAL** is an **append-only log** that records every change **before** it is applied to the main data structures (the on-disk pages/B-tree). The rule: **log first, then apply**. Because the change is durably recorded, a crash can be recovered by **replaying** the log.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 195' role='img' aria-label='Write-ahead log written before applying to data pages'>" +
      "<defs><marker id='ah-wal' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='14' y='76' width='74' height='44' rx='6'/><text class='d-sub' x='51' y='102' text-anchor='middle'>Write</text>" +
      "<rect class='d-box-accent' x='148' y='70' width='146' height='56' rx='8'/><text class='d-text' x='221' y='92' text-anchor='middle'>WAL</text><text class='d-sub' x='221' y='108' text-anchor='middle'>append-only + fsync</text>" +
      "<rect class='d-box' x='358' y='76' width='108' height='44' rx='6'/><text class='d-sub' x='412' y='102' text-anchor='middle'>Data pages</text>" +
      "<line class='d-edge' x1='88' y1='98' x2='146' y2='98' marker-end='url(#ah-wal)'/><text class='d-sub' x='117' y='88' text-anchor='middle'>1. log</text>" +
      "<line class='d-edge' x1='294' y1='98' x2='356' y2='98' marker-end='url(#ah-wal)'/><text class='d-sub' x='325' y='88' text-anchor='middle'>2. apply</text>" +
      "<text class='d-sub' x='240' y='158' text-anchor='middle'>crash -> replay the log to recover (durability + atomicity)</text>" +
      "</svg>\n\n" +
      "Why it works: appends are **sequential** (fast, one `fsync`) versus random page writes. The WAL gives you **durability** (committed data survives a crash) and **atomicity** (replay redoes committed txns, discards partial ones).\n\n" +
      "**Interview tip:** the WAL is *why* databases are durable without synchronously random-writing every page. Name where it shows up: **Postgres WAL**, **SQLite**, **LSM-tree** commit logs, **Kafka** (the log *is* the data), **Raft** (replicated log). Mention **checkpointing** (flush + truncate the log so recovery isn't unbounded) and **group commit** (batch fsyncs for throughput).",
    examples: [
      {
        label: "WAL: log then apply, recover by replay",
        variants: [
          {
            tech: "python",
            code: `class WAL:
    def __init__(self):
        self.log = []      # append-only (a file on disk in reality)
        self.state = {}    # the "data pages"
    def set(self, key, value):
        self.log.append(("set", key, value))  # 1. write-ahead (fsync) FIRST
        self.state[key] = value               # 2. then apply
    def recover(self):
        self.state = {}
        for op, key, value in self.log:       # replay on restart
            if op == "set":
                self.state[key] = value
        return self.state

wal = WAL()
wal.set("balance", 100)
wal.set("balance", 80)
# simulate crash + restart: rebuild state purely from the log
print("recovered:", wal.recover())   # {'balance': 80}`,
          },
          {
            tech: "go",
            code: `package main

import "fmt"

type entry struct{ key, value string }

type WAL struct {
	log   []entry          // append-only
	state map[string]string // data pages
}

func NewWAL() *WAL { return &WAL{state: map[string]string{}} }

func (w *WAL) Set(key, value string) {
	w.log = append(w.log, entry{key, value}) // 1. log first
	w.state[key] = value                      // 2. then apply
}

func (w *WAL) Recover() map[string]string {
	w.state = map[string]string{}
	for _, e := range w.log { // replay
		w.state[e.key] = e.value
	}
	return w.state
}

func main() {
	w := NewWAL()
	w.Set("balance", "100")
	w.Set("balance", "80")
	fmt.Println("recovered:", w.Recover())
}`,
          },
        ],
      },
    ],
  },
  {
    title: "What is the publish-subscribe pattern?",
    answer:
      "## Publish-subscribe\n\n" +
      "In **pub/sub**, publishers send messages to a **topic**, and the broker **fans out** a copy to **every** subscriber of that topic. Publishers and subscribers never reference each other — they're fully **decoupled**, and you can add subscribers without touching the publisher.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 200' role='img' aria-label='Publisher sends to a topic, broker fans out to subscribers'>" +
      "<defs><marker id='ah-ps' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='12' y='78' width='90' height='46' rx='6'/><text class='d-sub' x='57' y='105' text-anchor='middle'>Publisher</text>" +
      "<rect class='d-box-accent' x='178' y='74' width='110' height='54' rx='8'/><text class='d-text' x='233' y='98' text-anchor='middle'>Topic</text><text class='d-sub' x='233' y='114' text-anchor='middle'>orders</text>" +
      "<rect class='d-box' x='382' y='24' width='90' height='38' rx='6'/><rect class='d-box' x='382' y='84' width='90' height='38' rx='6'/><rect class='d-box' x='382' y='144' width='90' height='38' rx='6'/>" +
      "<text class='d-sub' x='427' y='47' text-anchor='middle'>Email svc</text><text class='d-sub' x='427' y='107' text-anchor='middle'>Analytics</text><text class='d-sub' x='427' y='167' text-anchor='middle'>Inventory</text>" +
      "<line class='d-edge' x1='102' y1='100' x2='176' y2='100' marker-end='url(#ah-ps)'/>" +
      "<line class='d-edge' x1='288' y1='94' x2='380' y2='44' marker-end='url(#ah-ps)'/><line class='d-edge' x1='288' y1='100' x2='380' y2='102' marker-end='url(#ah-ps)'/><line class='d-edge' x1='288' y1='108' x2='380' y2='162' marker-end='url(#ah-ps)'/>" +
      "</svg>\n\n" +
      "| | Queue (point-to-point) | Pub/Sub (topic) |\n" +
      "|---|---|---|\n" +
      "| Each message goes to | one consumer | every subscriber |\n" +
      "| Used for | work distribution | event broadcast / fan-out |\n" +
      "| Examples | SQS, RabbitMQ queue | SNS, Kafka, Redis pub/sub |\n\n" +
      "**Interview tip:** pub/sub powers **event-driven architectures** — emit a `OrderPlaced` event and any number of services react independently. Call out **at-least-once delivery** (subscribers must be **idempotent**), **ordering** guarantees (often only per-partition), and **durable vs ephemeral** subscriptions. Kafka **consumer groups** combine fan-out across services with load-balanced consumption within a service.",
    examples: [
      {
        label: "In-memory broker (subscribe / publish)",
        variants: [
          {
            tech: "python",
            code: `from collections import defaultdict

class Broker:
    def __init__(self):
        self.subs = defaultdict(list)      # topic -> [callbacks]
    def subscribe(self, topic, fn):
        self.subs[topic].append(fn)
    def publish(self, topic, msg):
        for fn in self.subs[topic]:        # fan-out: every subscriber gets it
            fn(msg)

broker = Broker()
broker.subscribe("orders", lambda m: print("email service got", m))
broker.subscribe("orders", lambda m: print("analytics got", m))
broker.publish("orders", {"id": 1, "total": 4999})`,
          },
          {
            tech: "go",
            code: `package main

import "fmt"

type Broker struct {
	subs map[string][]func(string)
}

func NewBroker() *Broker { return &Broker{subs: map[string][]func(string){}} }

func (b *Broker) Subscribe(topic string, fn func(string)) {
	b.subs[topic] = append(b.subs[topic], fn)
}

func (b *Broker) Publish(topic, msg string) {
	for _, fn := range b.subs[topic] { // fan-out to every subscriber
		fn(msg)
	}
}

func main() {
	b := NewBroker()
	b.Subscribe("orders", func(m string) { fmt.Println("email service got", m) })
	b.Subscribe("orders", func(m string) { fmt.Println("analytics got", m) })
	b.Publish("orders", "order #1 total 4999")
}`,
          },
        ],
      },
    ],
  },
  {
    title: "What is the difference between optimistic and pessimistic locking?",
    answer:
      "## Optimistic vs pessimistic locking\n\n" +
      "Both prevent two transactions from clobbering each other's writes; they differ in **when** they guard.\n\n" +
      "- **Pessimistic:** assume conflicts are likely — **lock the row up front** (`SELECT ... FOR UPDATE`). Others **block** until you commit. Safe under heavy contention, but reduces concurrency and risks **deadlocks**.\n" +
      "- **Optimistic:** assume conflicts are rare — **don't lock**. Read a **version**, and at write time do a **compare-and-set**: update only if the version is unchanged. If someone else won, your update affects 0 rows → **retry**.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 190' role='img' aria-label='Optimistic locking with a version check'>" +
      "<text class='d-sub' x='240' y='18' text-anchor='middle'>Optimistic: compare-and-set on a version column</text>" +
      "<rect class='d-box' x='28' y='32' width='200' height='32' rx='6'/><text class='d-sub' x='128' y='52' text-anchor='middle'>T1 reads row (version = 7)</text>" +
      "<rect class='d-box' x='252' y='32' width='200' height='32' rx='6'/><text class='d-sub' x='352' y='52' text-anchor='middle'>T2 reads row (version = 7)</text>" +
      "<rect class='d-box-accent' x='28' y='82' width='200' height='46' rx='6'/><text class='d-sub' x='128' y='102' text-anchor='middle'>T1 UPDATE WHERE version=7</text><text class='d-sub' x='128' y='118' text-anchor='middle'>OK -> version=8</text>" +
      "<rect class='d-box' x='252' y='82' width='200' height='46' rx='6'/><text class='d-sub' x='352' y='102' text-anchor='middle'>T2 UPDATE WHERE version=7</text><text class='d-sub' x='352' y='118' text-anchor='middle'>0 rows -> conflict -> retry</text>" +
      "<text class='d-sub' x='240' y='160' text-anchor='middle'>Pessimistic instead: T1 holds a row lock; T2 blocks until T1 commits.</text>" +
      "</svg>\n\n" +
      "| | Optimistic | Pessimistic |\n" +
      "|---|---|---|\n" +
      "| Locks | none until commit (version check) | locks row up front |\n" +
      "| Best for | low contention (most web apps) | high contention / hot rows |\n" +
      "| On conflict | write fails -> retry | other txns wait |\n" +
      "| Risks | wasted work on retries | deadlocks, low concurrency |\n\n" +
      "**Interview tip:** default to **optimistic** for typical web traffic (conflicts are rare) using a **version** or `updated_at` column. Reach for **pessimistic** on genuinely hot rows (e.g. decrementing scarce inventory) — but watch **deadlocks** (always acquire locks in a consistent order) and keep the locked section short.",
    examples: [
      {
        label: "Optimistic update (version check)",
        variants: [
          {
            tech: "sql",
            code: `-- Optimistic locking with a version column (compare-and-set).
-- 1. Read the current row + its version:
SELECT id, stock, version FROM products WHERE id = 42;   -- version = 7

-- 2. Write only if nobody changed it in the meantime:
UPDATE products
SET stock = stock - 1, version = version + 1
WHERE id = 42 AND version = 7;

-- If 0 rows were updated, someone else won the race -> re-read and retry.`,
          },
          {
            tech: "python",
            code: `class DB:
    def __init__(self):
        self.row = {"stock": 1, "version": 7}
    def read(self):
        return dict(self.row)                       # snapshot
    def update_if_version(self, new_stock, expected_version):
        if self.row["version"] != expected_version: # compare-and-set
            return False                            # lost the race
        self.row["stock"] = new_stock
        self.row["version"] += 1
        return True

db = DB()
t1 = db.read()   # both read version 7
t2 = db.read()
print("T1 commit:", db.update_if_version(t1["stock"] - 1, t1["version"]))  # True  -> v8
print("T2 commit:", db.update_if_version(t2["stock"] - 1, t2["version"]))  # False -> retry`,
          },
        ],
      },
    ],
  },
];

export default augments;
