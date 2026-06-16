import type { SystemDesignAugment } from "./system-design-augments.types";

/**
 * System-design augments — batch 6 (reliability & scaling concepts; final batch).
 * Conventions: prose double-quoted ("\n"-joined, no bare < or >), inline SVG
 * single-quoted attrs (&gt;/&lt; only inside <text>), GFM tables. Go format
 * strings use \\n (a lone \n becomes a real newline at import time).
 */
const augments: SystemDesignAugment[] = [
  {
    title: "What is backpressure and how do you handle it?",
    answer:
      "## Backpressure\n\n" +
      "**Backpressure** is what happens when a **producer is faster than its consumer**: work piles up. Handled badly, the buffer grows without bound and the service runs out of memory and crashes. Backpressure is the **mechanism that signals upstream to slow down** (or sheds load) instead of collapsing.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 165' role='img' aria-label='Fast producer, bounded full queue, slow consumer, slow-down signal'>" +
      "<defs><marker id='ah-bp' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='14' y='56' width='96' height='44' rx='6'/><text class='d-sub' x='62' y='76' text-anchor='middle'>Producer</text><text class='d-sub' x='62' y='90' text-anchor='middle'>(fast)</text>" +
      "<rect class='d-box-accent' x='176' y='56' width='128' height='44' rx='6'/><text class='d-sub' x='240' y='76' text-anchor='middle'>bounded queue</text><text class='d-sub' x='240' y='90' text-anchor='middle'>FULL</text>" +
      "<rect class='d-box' x='370' y='56' width='96' height='44' rx='6'/><text class='d-sub' x='418' y='76' text-anchor='middle'>Consumer</text><text class='d-sub' x='418' y='90' text-anchor='middle'>(slow)</text>" +
      "<line class='d-edge' x1='110' y1='78' x2='174' y2='78' marker-end='url(#ah-bp)'/>" +
      "<line class='d-edge' x1='304' y1='78' x2='368' y2='78' marker-end='url(#ah-bp)'/>" +
      "<line class='d-edge-accent' x1='176' y1='118' x2='110' y2='118' marker-end='url(#ah-bp)'/>" +
      "<text class='d-sub' x='250' y='135' text-anchor='middle'>backpressure: when full, signal the producer to slow down</text>" +
      "</svg>\n\n" +
      "| Strategy | What it does |\n" +
      "|---|---|\n" +
      "| Bounded buffer + block | producer blocks when the queue is full (simplest) |\n" +
      "| Pull-based | consumer requests N items when ready (reactive streams) |\n" +
      "| Throttle upstream | rate-limit the producer to a sustainable rate |\n" +
      "| Load shedding | drop / sample / 503 the excess when you must stay up |\n" +
      "| Buffer + spill | absorb short bursts to disk/queue (Kafka) |\n\n" +
      "**Interview tip:** the core insight is **unbounded buffering hides a problem until it kills you** — always bound the queue, then choose to **block**, **shed**, or **throttle**. Mention **pull-based / reactive streams** (the consumer pulls at its pace) and that backpressure must propagate **end-to-end** (a bounded queue in the middle is useless if the front door accepts unlimited work).",
    examples: [
      {
        label: "Bounded queue applies backpressure",
        variants: [
          {
            tech: "python",
            code: `import queue, threading, time

q = queue.Queue(maxsize=3)         # bounded -> put() blocks when full

def consumer():
    while True:
        job = q.get()
        if job is None:
            break
        print("  processing", job)
        time.sleep(0.04)           # slow worker
        q.task_done()

threading.Thread(target=consumer, daemon=True).start()

for i in range(1, 7):
    q.put(i)                       # BLOCKS when full -> natural backpressure
    print("enqueued", i)
q.join()
print("done")`,
          },
          {
            tech: "go",
            code: `package main

import (
	"fmt"
	"time"
)

func main() {
	queue := make(chan int, 3) // bounded buffer = backpressure

	go func() { // slow consumer
		for job := range queue {
			fmt.Println("  processing", job)
			time.Sleep(40 * time.Millisecond)
		}
	}()

	for i := 1; i <= 6; i++ {
		queue <- i // BLOCKS when the buffer is full -> producer slows down
		fmt.Println("enqueued", i)
	}
	close(queue)
	time.Sleep(300 * time.Millisecond)
}`,
          },
        ],
      },
    ],
  },
  {
    title: "Why prefer stateless services and how do you handle sessions?",
    answer:
      "## Stateless services\n\n" +
      "A service is **stateless** when it keeps **no per-client state in memory between requests** — everything it needs comes with the request or from a shared store. That unlocks the things distributed systems care about:\n\n" +
      "- **Horizontal scaling:** any instance can serve any request, so you just add boxes behind a load balancer.\n" +
      "- **No sticky sessions:** the LB can route freely (round-robin), improving balance and resilience.\n" +
      "- **Trivial failover:** an instance dying loses nothing; requests just go elsewhere.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 190' role='img' aria-label='Load balancer to identical stateless instances sharing a session store'>" +
      "<defs><marker id='ah-sl' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='12' y='78' width='80' height='44' rx='6'/><text class='d-sub' x='52' y='104' text-anchor='middle'>Load bal.</text>" +
      "<rect class='d-box-accent' x='160' y='20' width='96' height='34' rx='6'/><text class='d-sub' x='208' y='42' text-anchor='middle'>Instance 1</text>" +
      "<rect class='d-box-accent' x='160' y='82' width='96' height='34' rx='6'/><text class='d-sub' x='208' y='104' text-anchor='middle'>Instance 2</text>" +
      "<rect class='d-box-accent' x='160' y='144' width='96' height='34' rx='6'/><text class='d-sub' x='208' y='166' text-anchor='middle'>Instance 3</text>" +
      "<rect class='d-box' x='330' y='80' width='130' height='40' rx='6'/><text class='d-sub' x='395' y='104' text-anchor='middle'>Session store (Redis)</text>" +
      "<line class='d-edge' x1='92' y1='92' x2='158' y2='40' marker-end='url(#ah-sl)'/>" +
      "<line class='d-edge' x1='92' y1='100' x2='158' y2='99' marker-end='url(#ah-sl)'/>" +
      "<line class='d-edge' x1='92' y1='108' x2='158' y2='160' marker-end='url(#ah-sl)'/>" +
      "<line class='d-edge-dashed' x1='256' y1='99' x2='328' y2='99' marker-end='url(#ah-sl)'/>" +
      "<text class='d-sub' x='240' y='188' text-anchor='middle'>any instance handles any request; shared state lives outside</text>" +
      "</svg>\n\n" +
      "Sessions still need to live **somewhere** — just not in app memory. Two options:\n\n" +
      "| Approach | How | Trade-off |\n" +
      "|---|---|---|\n" +
      "| Server-side session store | session id in a cookie, data in Redis/DB | central, revocable; extra lookup per request |\n" +
      "| Stateless token (JWT) | signed claims in the token itself | no lookup, scales freely; hard to revoke early, size |\n\n" +
      "**Interview tip:** the principle is **push state to the edges** (the client token) or to a **shared store** (Redis), never into a specific instance's memory. JWTs are great for scale but call out their weakness — **revocation** (mitigate with short expiry + refresh tokens / a denylist). Sticky sessions are a smell that you didn't externalize state.",
    examples: [
      {
        label: "Stateless signed session token",
        tech: "python",
        code: `import hmac, hashlib, base64

SECRET = b"server-secret"     # shared by every instance

def issue(user_id):
    payload = ("user=" + str(user_id)).encode()
    sig = hmac.new(SECRET, payload, hashlib.sha256).hexdigest()[:12]
    return base64.urlsafe_b64encode(payload).decode() + "." + sig

def verify(token):
    raw, sig = token.split(".")
    payload = base64.urlsafe_b64decode(raw)
    expected = hmac.new(SECRET, payload, hashlib.sha256).hexdigest()[:12]
    return payload.decode() if hmac.compare_digest(sig, expected) else None

t = issue(42)
print("token   :", t)
print("verify  :", verify(t))            # ANY stateless instance can validate it
print("tampered:", verify(t[:-1] + "x")) # None -> rejected`,
      },
    ],
  },
  {
    title: "When do you use a read replica vs a cache?",
    answer:
      "## Read replica vs cache\n\n" +
      "Both take read load off the primary database, but they solve different problems:\n\n" +
      "- A **read replica** is a **full copy of the database** kept in sync via replication. It can serve **any** read query (joins, ranges, aggregates) — it's still a real (disk-based) database, just not the write primary. Reads may be slightly **stale** (replication lag).\n" +
      "- A **cache** is an **in-memory subset** of hot data, usually keyed lookups. It's **sub-millisecond** and absorbs huge read volume, but **you** manage what's in it (population, TTL, invalidation), and it only helps for the access patterns you cache.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 190' role='img' aria-label='App uses a cache for hot keys and read replicas for queries'>" +
      "<defs><marker id='ah-rr' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='14' y='78' width='80' height='44' rx='6'/><text class='d-sub' x='54' y='104' text-anchor='middle'>App</text>" +
      "<rect class='d-box-accent' x='150' y='26' width='130' height='38' rx='6'/><text class='d-sub' x='215' y='49' text-anchor='middle'>Cache (hot keys)</text>" +
      "<rect class='d-box' x='150' y='86' width='130' height='38' rx='6'/><text class='d-sub' x='215' y='109' text-anchor='middle'>Read replicas</text>" +
      "<rect class='d-box' x='340' y='86' width='126' height='38' rx='6'/><text class='d-sub' x='403' y='109' text-anchor='middle'>Primary DB</text>" +
      "<line class='d-edge' x1='94' y1='90' x2='148' y2='48' marker-end='url(#ah-rr)'/>" +
      "<line class='d-edge' x1='94' y1='104' x2='148' y2='105' marker-end='url(#ah-rr)'/>" +
      "<line class='d-edge-dashed' x1='280' y1='45' x2='403' y2='84' marker-end='url(#ah-rr)'/>" +
      "<line class='d-edge-dashed' x1='340' y1='105' x2='282' y2='105' marker-end='url(#ah-rr)'/>" +
      "<text class='d-sub' x='240' y='150' text-anchor='middle'>primary replicates to replicas; cache populated from reads (cache-aside)</text>" +
      "</svg>\n\n" +
      "| | Read replica | Cache |\n" +
      "|---|---|---|\n" +
      "| Holds | full dataset | hot subset |\n" +
      "| Query shape | any SQL | mostly key lookups |\n" +
      "| Latency | DB-speed (disk) | sub-ms (memory) |\n" +
      "| Staleness | replication lag | TTL / invalidation you control |\n" +
      "| Best for | read-scaling arbitrary queries, reporting | very hot keys, lowest latency |\n\n" +
      "**Interview tip:** reach for a **cache** when a small set of keys is read enormously and you want **lowest latency**; reach for **read replicas** when you need to scale **varied read queries** (or isolate analytics/reporting from the write primary). They're complementary — most large systems run **both**, with the cache in front and replicas behind.",
  },
  {
    title: "How do you design for high availability?",
    answer:
      "## Designing for high availability\n\n" +
      "High availability (HA) means the system keeps serving despite failures. The whole game is **eliminating single points of failure** through **redundancy + automatic failover**, then measuring the result in **nines**.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 195' role='img' aria-label='Redundant app and database across two availability zones with failover'>" +
      "<defs><marker id='ah-ha' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='200' y='10' width='80' height='34' rx='6'/><text class='d-sub' x='240' y='32' text-anchor='middle'>Load bal. (HA)</text>" +
      "<rect class='d-box-accent' x='30' y='70' width='180' height='110' rx='8'/><text class='d-sub' x='120' y='90' text-anchor='middle'>Zone A</text>" +
      "<rect class='d-box' x='50' y='100' width='140' height='30' rx='5'/><text class='d-sub' x='120' y='120' text-anchor='middle'>App instances</text>" +
      "<rect class='d-box' x='50' y='140' width='140' height='30' rx='5'/><text class='d-sub' x='120' y='160' text-anchor='middle'>DB primary</text>" +
      "<rect class='d-box-accent' x='270' y='70' width='180' height='110' rx='8'/><text class='d-sub' x='360' y='90' text-anchor='middle'>Zone B</text>" +
      "<rect class='d-box' x='290' y='100' width='140' height='30' rx='5'/><text class='d-sub' x='360' y='120' text-anchor='middle'>App instances</text>" +
      "<rect class='d-box' x='290' y='140' width='140' height='30' rx='5'/><text class='d-sub' x='360' y='160' text-anchor='middle'>DB replica</text>" +
      "<line class='d-edge' x1='220' y1='44' x2='120' y2='98' marker-end='url(#ah-ha)'/>" +
      "<line class='d-edge' x1='260' y1='44' x2='360' y2='98' marker-end='url(#ah-ha)'/>" +
      "<line class='d-edge-dashed' x1='190' y1='155' x2='290' y2='155' marker-end='url(#ah-ha)'/>" +
      "<text class='d-sub' x='240' y='190' text-anchor='middle'>replica promotes to primary on failover; survive a whole-zone loss</text>" +
      "</svg>\n\n" +
      "Techniques: **redundancy** at every tier (N+1, multi-AZ, multi-region), **no SPOF** (HA load balancers, replicated DBs), **health checks** so the LB ejects bad nodes, **automatic failover** (promote a replica), **graceful degradation** (shed non-essential features rather than fail wholesale), and **isolation** (bulkheads, circuit breakers) so one failure doesn't cascade.\n\n" +
      "| Availability | Downtime / year |\n" +
      "|---|---|\n" +
      "| 99% (two nines) | ~3.65 days |\n" +
      "| 99.9% (three nines) | ~8.8 hours |\n" +
      "| 99.99% (four nines) | ~52 minutes |\n" +
      "| 99.999% (five nines) | ~5 minutes |\n\n" +
      "**Interview tip:** structure it as **find every SPOF, add redundancy, automate failover, then verify** (chaos testing). Note the costs: more nines means more money and complexity, **active-active** beats active-passive for RTO but needs conflict handling, and **stateful** tiers (databases) are the hard part — replication + tested failover, not just 'add more app servers'.",
  },
  {
    title: "How do you make a payment system reliable against retries?",
    answer:
      "## Reliable payments under retries\n\n" +
      "Payments live in an unreliable network: a request times out, the client (or a queue) **retries**, and the danger is a **double charge**. The cure is **idempotency end-to-end** plus a **durable state machine** so an interrupted charge can be safely resumed, never duplicated.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 185' role='img' aria-label='Retried charge deduped by idempotency key into a single provider call and ledger entry'>" +
      "<defs><marker id='ah-pay' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='12' y='66' width='84' height='50' rx='6'/><text class='d-sub' x='54' y='86' text-anchor='middle'>Client</text><text class='d-sub' x='54' y='102' text-anchor='middle'>retries</text>" +
      "<rect class='d-box-accent' x='150' y='60' width='130' height='62' rx='8'/><text class='d-text' x='215' y='84' text-anchor='middle'>Payment svc</text><text class='d-sub' x='215' y='100' text-anchor='middle'>idempotency key</text>" +
      "<rect class='d-box' x='330' y='34' width='136' height='36' rx='6'/><text class='d-sub' x='398' y='56' text-anchor='middle'>Provider (charge once)</text>" +
      "<rect class='d-box' x='330' y='112' width='136' height='36' rx='6'/><text class='d-sub' x='398' y='134' text-anchor='middle'>Ledger (audit)</text>" +
      "<line class='d-edge' x1='96' y1='82' x2='148' y2='82' marker-end='url(#ah-pay)'/>" +
      "<line class='d-edge' x1='96' y1='98' x2='148' y2='98' marker-end='url(#ah-pay)'/>" +
      "<line class='d-edge-accent' x1='280' y1='80' x2='328' y2='54' marker-end='url(#ah-pay)'/>" +
      "<line class='d-edge' x1='280' y1='100' x2='328' y2='126' marker-end='url(#ah-pay)'/>" +
      "<text class='d-sub' x='240' y='176' text-anchor='middle'>same key -&gt; one charge; every state change is written to the ledger</text>" +
      "</svg>\n\n" +
      "| Technique | Why |\n" +
      "|---|---|\n" +
      "| Idempotency key per attempt | a retry returns the saved result, never re-charges |\n" +
      "| Durable state machine | record intent first (pending) so a crash is recoverable |\n" +
      "| Idempotent provider call | pass the key downstream; the gateway dedupes too |\n" +
      "| Double-entry ledger | immutable audit + reconciliation source of truth |\n" +
      "| Reconciliation job | catch mismatches vs the provider, fix stuck states |\n\n" +
      "**Interview tip:** say it crisply — **at-least-once delivery + idempotent processing = effectively exactly-once.** Record **intent before** calling the provider (so you never lose track of an in-flight charge), key the provider call too, and treat the **ledger** as the source of truth with a **reconciliation** job to repair anything stuck. Money systems favor **correctness + auditability** over latency.",
    examples: [
      {
        label: "Idempotent charge with status",
        tech: "python",
        code: `charges = {}   # idempotency_key -> record (Redis/DB in production)

def charge(key, amount, provider):
    rec = charges.get(key)
    if rec and rec["status"] == "succeeded":
        print("retry of", key, "-> no second charge")
        return rec                                  # safe to retry
    charges[key] = {"status": "pending", "amount": amount}   # record intent FIRST
    ref = provider(key, amount)                     # provider call is also keyed
    charges[key] = {"status": "succeeded", "amount": amount, "ref": ref}
    return charges[key]

def fake_provider(key, amount):
    print("  charging", amount, "for", key)
    return "txn_" + key

print(charge("k1", 4999, fake_provider))
print(charge("k1", 4999, fake_provider))   # retry -> deduped, no double charge`,
      },
    ],
  },
  {
    title: "How do distributed systems detect node failures?",
    answer:
      "## Failure detection\n\n" +
      "Nodes signal liveness with **heartbeats**: each node periodically says 'I'm alive'. If a node misses heartbeats for longer than a **timeout**, it's marked **suspect**, then **dead**. The fundamental catch: you **cannot distinguish a slow node from a dead one** over an unreliable network — so detectors trade off **speed vs false positives**.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 180' role='img' aria-label='Nodes send heartbeats to a monitor; a silent node is marked dead'>" +
      "<defs><marker id='ah-fd' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='20' y='26' width='90' height='32' rx='6'/><text class='d-sub' x='65' y='46' text-anchor='middle'>Node 1</text>" +
      "<rect class='d-box' x='20' y='74' width='90' height='32' rx='6'/><text class='d-sub' x='65' y='94' text-anchor='middle'>Node 2</text>" +
      "<rect class='d-box' x='20' y='122' width='90' height='32' rx='6'/><text class='d-sub' x='65' y='142' text-anchor='middle'>Node 3</text>" +
      "<rect class='d-box-accent' x='300' y='74' width='130' height='32' rx='6'/><text class='d-sub' x='365' y='94' text-anchor='middle'>Monitor / peers</text>" +
      "<line class='d-edge' x1='110' y1='42' x2='298' y2='84' marker-end='url(#ah-fd)'/>" +
      "<line class='d-edge-dashed' x1='110' y1='90' x2='298' y2='90' marker-end='url(#ah-fd)'/>" +
      "<line class='d-edge' x1='110' y1='138' x2='298' y2='96' marker-end='url(#ah-fd)'/>" +
      "<text class='d-sub' x='200' y='120' text-anchor='middle'>node 2 silent</text>" +
      "<text class='d-sub' x='365' y='130' text-anchor='middle'>no heartbeat past timeout -&gt; mark DEAD</text>" +
      "</svg>\n\n" +
      "| Mechanism | Idea |\n" +
      "|---|---|\n" +
      "| Heartbeat + timeout | miss N beats -&gt; suspect -&gt; dead (simple, central) |\n" +
      "| Gossip (SWIM) | peers randomly ping each other; failures spread epidemically (scales) |\n" +
      "| Phi-accrual detector | output a suspicion level, not a boolean; adapts to network jitter |\n\n" +
      "**Interview tip:** lead with **heartbeats + timeout**, then the key nuance: **slow vs dead is undecidable**, so production systems use **suspicion levels** (phi-accrual) and require a **quorum** to declare death (avoid a flaky link evicting a healthy node). For large clusters, a central monitor is a bottleneck/SPOF — use **gossip (SWIM)** so detection is decentralized and scalable. Pair with **fencing** so a wrongly-declared-dead node can't keep acting.",
    examples: [
      {
        label: "Heartbeat + timeout monitor",
        variants: [
          {
            tech: "python",
            code: `TIMEOUT = 3.0   # seconds without a heartbeat -> suspected dead
last_seen = {"n1": 0.0, "n2": 0.0, "n3": 0.0}

def heartbeat(node, now):
    last_seen[node] = now

def check(now):
    return {n: ("alive" if now - t <= TIMEOUT else "DEAD")
            for n, t in last_seen.items()}

now = 5.0
heartbeat("n1", now)
heartbeat("n3", now)        # n2 stopped sending heartbeats
print(check(now))           # n2 -> DEAD (silent past the timeout)`,
          },
          {
            tech: "go",
            code: `package main

import "fmt"

func main() {
	const timeout = 3.0
	lastSeen := map[string]float64{"n1": 0, "n2": 0, "n3": 0}

	heartbeat := func(node string, now float64) { lastSeen[node] = now }
	check := func(now float64) map[string]string {
		out := map[string]string{}
		for n, t := range lastSeen {
			if now-t <= timeout {
				out[n] = "alive"
			} else {
				out[n] = "DEAD"
			}
		}
		return out
	}

	now := 5.0
	heartbeat("n1", now)
	heartbeat("n3", now) // n2 stopped sending
	fmt.Println(check(now)) // n2 -> DEAD
}`,
          },
        ],
      },
    ],
  },
];

export default augments;
