import type { SystemDesignAugment } from "./system-design-augments.types";

/**
 * System-design augments — batch 3 (distributed coordination + data layer).
 * Conventions: answer = double-quoted prose ("\n"-joined) + inline
 * <svg class='iq-diagram'> (single-quote attrs, no backticks) + GFM tables.
 * Code variants: template literals, backtick-free, no ${}.
 */
const augments: SystemDesignAugment[] = [
  {
    title: "What is a read/write quorum?",
    answer:
      "## Read/write quorums\n\n" +
      "In a replicated store with **N** copies of each key, a **quorum** is the number of replicas that must respond for an operation to succeed: **W** for a write, **R** for a read. The magic rule is:\n\n" +
      "> If **W + R > N**, the read set and write set are guaranteed to **overlap** on at least one replica — so a read always sees the latest acknowledged write.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 200' role='img' aria-label='Quorum overlap when W plus R is greater than N'>" +
      "<text class='d-sub' x='240' y='20' text-anchor='middle'>N = 5 replicas of a key</text>" +
      "<circle class='d-box-accent' cx='70' cy='92' r='26'/><text class='d-sub' x='70' y='97' text-anchor='middle'>n1</text>" +
      "<circle class='d-box-accent' cx='160' cy='92' r='26'/><text class='d-sub' x='160' y='97' text-anchor='middle'>n2</text>" +
      "<circle class='d-box-accent' cx='250' cy='92' r='26'/><text class='d-sub' x='250' y='97' text-anchor='middle'>n3</text>" +
      "<circle class='d-box' cx='340' cy='92' r='26'/><text class='d-sub' x='340' y='97' text-anchor='middle'>n4</text>" +
      "<circle class='d-box' cx='430' cy='92' r='26'/><text class='d-sub' x='430' y='97' text-anchor='middle'>n5</text>" +
      "<path class='d-edge-accent' d='M42,54 H278'/><text class='d-sub' x='160' y='44' text-anchor='middle'>W = 3 (write set)</text>" +
      "<path class='d-edge' d='M222,130 H458'/><text class='d-sub' x='340' y='150' text-anchor='middle'>R = 3 (read set)</text>" +
      "<text class='d-sub' x='240' y='180' text-anchor='middle'>W + R &gt; N  -&gt;  the sets overlap (n3)  -&gt;  reads see the latest write</text>" +
      "</svg>\n\n" +
      "Tune the knobs for your workload: **W=N, R=1** gives fast reads / slow durable writes; **W=1, R=N** the reverse; **W=R=(N/2)+1** balances both (the common default). Leaderless stores like **Dynamo/Cassandra** expose exactly these as `QUORUM` / `ONE` / `ALL`.\n\n" +
      "**Interview tip:** state the **W + R > N** invariant and what each extreme buys you. Mention that quorums alone don't fix conflicts — concurrent writes still need **versioning** (vector clocks) and **read-repair** / anti-entropy to converge.",
    examples: [
      {
        label: "Quorum write + read",
        variants: [
          {
            tech: "python",
            code: `N, W, R = 5, 3, 3   # W + R > N guarantees overlap

replicas = [{"value": None, "version": 0} for _ in range(N)]

def write(value, version):
    acks = 0
    for r in replicas:               # send to all, succeed once W ack
        r["value"], r["version"] = value, version
        acks += 1
        if acks == W:
            break
    return acks >= W

def read():
    sample = replicas[:R]            # read from R replicas
    latest = max(sample, key=lambda r: r["version"])  # newest wins
    return latest["value"], latest["version"]

write("v2", 2)
print("read ->", read())   # sees v2 because the read/write sets overlap`,
          },
          {
            tech: "go",
            code: `package main

import "fmt"

type Replica struct {
	value   string
	version int
}

const N, W, R = 5, 3, 3 // W + R > N

func main() {
	replicas := make([]*Replica, N)
	for i := range replicas {
		replicas[i] = &Replica{}
	}

	write := func(value string, version int) bool {
		acks := 0
		for _, r := range replicas { // succeed once W ack
			r.value, r.version = value, version
			acks++
			if acks == W {
				break
			}
		}
		return acks >= W
	}

	read := func() (string, int) { // newest of R replicas
		latest := replicas[0]
		for _, r := range replicas[:R] {
			if r.version > latest.version {
				latest = r
			}
		}
		return latest.value, latest.version
	}

	write("v2", 2)
	v, ver := read()
	fmt.Println("read ->", v, ver)
}`,
          },
        ],
      },
    ],
  },
  {
    title: "What is leader election in distributed systems?",
    answer:
      "## Leader election\n\n" +
      "Many distributed tasks need exactly **one** node in charge — to order writes, assign work, or own a resource — without two nodes both thinking they're the boss (**split-brain**). **Leader election** is how a cluster agrees on a single leader and **re-elects** when it fails.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 200' role='img' aria-label='Followers vote, one node becomes leader'>" +
      "<defs><marker id='ah-le' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<text class='d-sub' x='240' y='20' text-anchor='middle'>One leader; re-elect on failure</text>" +
      "<rect class='d-box-accent' x='180' y='34' width='120' height='48' rx='8'/><text class='d-text' x='240' y='55' text-anchor='middle'>Node A</text><text class='d-sub' x='240' y='71' text-anchor='middle'>LEADER</text>" +
      "<rect class='d-box' x='40' y='142' width='110' height='40' rx='6'/><text class='d-sub' x='95' y='167' text-anchor='middle'>Node B</text>" +
      "<rect class='d-box' x='185' y='142' width='110' height='40' rx='6'/><text class='d-sub' x='240' y='167' text-anchor='middle'>Node C</text>" +
      "<rect class='d-box' x='330' y='142' width='110' height='40' rx='6'/><text class='d-sub' x='385' y='167' text-anchor='middle'>Node D</text>" +
      "<line class='d-edge' x1='95' y1='142' x2='202' y2='84' marker-end='url(#ah-le)'/>" +
      "<line class='d-edge' x1='240' y1='142' x2='240' y2='84' marker-end='url(#ah-le)'/>" +
      "<line class='d-edge' x1='385' y1='142' x2='278' y2='84' marker-end='url(#ah-le)'/>" +
      "<text class='d-sub' x='150' y='118' text-anchor='middle'>votes / heartbeats</text>" +
      "</svg>\n\n" +
      "Two practical ways to get it:\n" +
      "1. **Consensus algorithm** — **Raft** / Paxos: candidates request votes for a new *term*; a node winning a **majority** becomes leader and sends heartbeats. Missing heartbeats trigger a new election.\n" +
      "2. **A coordination service** — put the election behind **ZooKeeper/etcd**: whoever grabs an ephemeral lock / lease is leader; if it dies, the lease expires and others compete.\n\n" +
      "**Interview tip:** the must-mention is avoiding **split-brain** — use a **majority quorum** (so two leaders can't both win) and **fencing tokens** (monotonic term/epoch) so a stale old leader's writes get rejected. Don't hand-roll consensus; lean on Raft/etcd/ZooKeeper.",
    examples: [
      {
        label: "Majority-vote election (simplified)",
        variants: [
          {
            tech: "python",
            code: `class Node:
    def __init__(self, node_id):
        self.id = node_id
        self.term = 0
        self.voted_for = None

def elect(nodes, candidate):
    candidate.term += 1                 # start a new election term
    votes = 1                           # candidate votes for itself
    for n in nodes:
        if n is candidate:
            continue
        if n.term < candidate.term:     # grant vote for a newer term
            n.term = candidate.term
            n.voted_for = candidate.id
            votes += 1
    majority = len(nodes) // 2 + 1
    return votes >= majority, votes

nodes = [Node(i) for i in range(5)]
won, votes = elect(nodes, nodes[0])
print("node 0 won?", won, "with", votes, "/", len(nodes), "votes")`,
          },
          {
            tech: "go",
            code: `package main

import "fmt"

type Node struct {
	id       int
	term     int
	votedFor int
}

func elect(nodes []*Node, cand *Node) (bool, int) {
	cand.term++   // new term
	votes := 1    // self-vote
	for _, n := range nodes {
		if n == cand {
			continue
		}
		if n.term < cand.term { // grant vote for newer term
			n.term = cand.term
			n.votedFor = cand.id
			votes++
		}
	}
	majority := len(nodes)/2 + 1
	return votes >= majority, votes
}

func main() {
	nodes := make([]*Node, 5)
	for i := range nodes {
		nodes[i] = &Node{id: i, votedFor: -1}
	}
	won, votes := elect(nodes, nodes[0])
	fmt.Printf("node 0 won? %v with %d/%d votes\\n", won, votes, len(nodes))
}`,
          },
        ],
      },
    ],
  },
  {
    title: "What is two-phase commit and its drawbacks?",
    answer:
      "## Two-phase commit (2PC)\n\n" +
      "2PC is a protocol to commit a transaction **atomically across multiple nodes** (e.g. two databases) — either all commit or none do. A **coordinator** drives two phases:\n\n" +
      "1. **Prepare (voting):** coordinator asks every participant *can you commit?* Each does the work, writes it to its log, locks the rows, and votes **yes/no**.\n" +
      "2. **Commit:** if **all** voted yes, the coordinator tells everyone to **commit**; if any voted no (or timed out), everyone **aborts**.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 210' role='img' aria-label='Coordinator runs prepare then commit across two participants'>" +
      "<defs><marker id='ah-2pc' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box-accent' x='24' y='80' width='112' height='54' rx='8'/><text class='d-text' x='80' y='102' text-anchor='middle'>Coordinator</text><text class='d-sub' x='80' y='118' text-anchor='middle'>(tx manager)</text>" +
      "<rect class='d-box' x='340' y='36' width='118' height='44' rx='6'/><text class='d-sub' x='399' y='62' text-anchor='middle'>Participant 1</text>" +
      "<rect class='d-box' x='340' y='134' width='118' height='44' rx='6'/><text class='d-sub' x='399' y='160' text-anchor='middle'>Participant 2</text>" +
      "<line class='d-edge' x1='136' y1='96' x2='338' y2='58' marker-end='url(#ah-2pc)'/>" +
      "<line class='d-edge' x1='136' y1='118' x2='338' y2='156' marker-end='url(#ah-2pc)'/>" +
      "<text class='d-sub' x='238' y='72' text-anchor='middle'>1. prepare? (vote)</text>" +
      "<text class='d-sub' x='238' y='150' text-anchor='middle'>2. commit (only if all voted yes)</text>" +
      "</svg>\n\n" +
      "| Drawback | Why it hurts |\n" +
      "|---|---|\n" +
      "| Blocking | participants hold locks between phases; a slow coordinator stalls everyone |\n" +
      "| Coordinator is a SPOF | if it crashes after prepare, participants are stuck 'in doubt' |\n" +
      "| Synchronous + chatty | extra round trips and fsyncs add latency; scales poorly |\n" +
      "| Not partition-tolerant | a network split halts progress |\n\n" +
      "**Interview tip:** 2PC gives strong atomicity but is **blocking** and fragile under failure, so it's avoided in high-scale microservices. The modern alternative for cross-service consistency is the **saga pattern** (eventual consistency + compensations). Three-phase commit reduces blocking but adds complexity and still struggles with partitions.",
  },
  {
    title: "What is the saga pattern for distributed transactions?",
    answer:
      "## The saga pattern\n\n" +
      "A **saga** replaces a single distributed transaction with a **sequence of local transactions**, one per service. Each step has a **compensating action** that semantically undoes it. If a step fails, the saga runs the compensations for the **already-completed** steps **in reverse** — giving you atomicity-like behavior with **eventual consistency** and no distributed locks.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 200' role='img' aria-label='Saga steps run forward, compensations run in reverse on failure'>" +
      "<defs><marker id='ah-saga' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<text class='d-sub' x='240' y='18' text-anchor='middle'>Each local step has a compensating action</text>" +
      "<rect class='d-box-accent' x='20' y='40' width='120' height='42' rx='6'/><text class='d-sub' x='80' y='66' text-anchor='middle'>T1 create order</text>" +
      "<rect class='d-box-accent' x='180' y='40' width='120' height='42' rx='6'/><text class='d-sub' x='240' y='66' text-anchor='middle'>T2 charge card</text>" +
      "<rect class='d-box' x='340' y='40' width='120' height='42' rx='6'/><text class='d-sub' x='400' y='60' text-anchor='middle'>T3 reserve stock</text><text class='d-sub' x='400' y='75' text-anchor='middle'>FAILS</text>" +
      "<line class='d-edge' x1='140' y1='61' x2='178' y2='61' marker-end='url(#ah-saga)'/>" +
      "<line class='d-edge' x1='300' y1='61' x2='338' y2='61' marker-end='url(#ah-saga)'/>" +
      "<rect class='d-box' x='20' y='132' width='120' height='42' rx='6'/><text class='d-sub' x='80' y='158' text-anchor='middle'>C1 cancel order</text>" +
      "<rect class='d-box' x='180' y='132' width='120' height='42' rx='6'/><text class='d-sub' x='240' y='158' text-anchor='middle'>C2 refund card</text>" +
      "<line class='d-edge-accent' x1='340' y1='74' x2='256' y2='130' marker-end='url(#ah-saga)'/>" +
      "<line class='d-edge-accent' x1='178' y1='153' x2='142' y2='153' marker-end='url(#ah-saga)'/>" +
      "<text class='d-sub' x='240' y='192' text-anchor='middle'>on failure -&gt; run compensations in reverse (C2 then C1)</text>" +
      "</svg>\n\n" +
      "Two coordination styles: **orchestration** (a central saga coordinator tells each service what to do — easy to follow, one place to reason about) and **choreography** (services react to each other's events — looser, but logic is spread out).\n\n" +
      "**Interview tip:** compensations are **semantic**, not a rollback — you can't un-send an email, so you send an apology / issue a refund. Steps and compensations must be **idempotent** (they may be retried), and intermediate states are visible (no isolation), so design for it. Sagas are the go-to for cross-service consistency where 2PC is too costly.",
    examples: [
      {
        label: "Orchestrated saga with compensations",
        variants: [
          {
            tech: "python",
            code: `def create_order():  print("  create order");  return True
def charge_card():   print("  charge card");    return True
def reserve_stock(): print("  reserve stock");  return False   # fails

def cancel_order():  print("  compensate: cancel order")
def refund_card():   print("  compensate: refund card")

# (action, compensation) pairs run in order; undo completed steps on failure.
steps = [
    (create_order, cancel_order),
    (charge_card,  refund_card),
    (reserve_stock, lambda: None),
]

done, ok = [], True
for action, compensate in steps:
    if action():
        done.append(compensate)
    else:
        ok = False
        print("step failed -> compensating", len(done), "completed step(s)")
        for c in reversed(done):       # reverse order
            c()
        break

print("saga", "committed" if ok else "rolled back")`,
          },
          {
            tech: "go",
            code: `package main

import "fmt"

type step struct {
	action     func() bool
	compensate func()
}

func main() {
	steps := []step{
		{func() bool { fmt.Println("  create order"); return true }, func() { fmt.Println("  compensate: cancel order") }},
		{func() bool { fmt.Println("  charge card"); return true }, func() { fmt.Println("  compensate: refund card") }},
		{func() bool { fmt.Println("  reserve stock"); return false }, func() {}}, // fails
	}

	var done []func()
	ok := true
	for _, s := range steps {
		if s.action() {
			done = append(done, s.compensate)
		} else {
			ok = false
			fmt.Println("step failed -> compensating", len(done), "completed step(s)")
			for i := len(done) - 1; i >= 0; i-- {
				done[i]()
			}
			break
		}
	}
	if ok {
		fmt.Println("saga committed")
	} else {
		fmt.Println("saga rolled back")
	}
}`,
          },
        ],
      },
    ],
  },
  {
    title: "What are event sourcing and CQRS?",
    answer:
      "## Event sourcing & CQRS\n\n" +
      "**Event sourcing:** instead of storing only the *current* state, store the **full sequence of events** that produced it in an **append-only log**. Current state is derived by **folding** (replaying) the events. The log is the source of truth — so you get a complete **audit trail**, **time travel** (rebuild state as of any point), and the ability to build **new projections** retroactively.\n\n" +
      "**CQRS (Command Query Responsibility Segregation):** split the **write model** (commands → validate → emit events) from the **read model(s)** (denormalized **projections** optimized for queries). They scale and evolve independently.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 200' role='img' aria-label='Commands append events; read models are projections'>" +
      "<defs><marker id='ah-es' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='14' y='80' width='92' height='44' rx='6'/><text class='d-sub' x='60' y='106' text-anchor='middle'>Command</text>" +
      "<rect class='d-box-accent' x='150' y='74' width='132' height='56' rx='8'/><text class='d-text' x='216' y='96' text-anchor='middle'>Event store</text><text class='d-sub' x='216' y='112' text-anchor='middle'>append-only log</text>" +
      "<rect class='d-box' x='338' y='40' width='128' height='42' rx='6'/><text class='d-sub' x='402' y='66' text-anchor='middle'>Read model (SQL)</text>" +
      "<rect class='d-box' x='338' y='122' width='128' height='42' rx='6'/><text class='d-sub' x='402' y='148' text-anchor='middle'>Read model (search)</text>" +
      "<line class='d-edge' x1='106' y1='102' x2='148' y2='102' marker-end='url(#ah-es)'/>" +
      "<line class='d-edge' x1='282' y1='96' x2='336' y2='62' marker-end='url(#ah-es)'/>" +
      "<line class='d-edge' x1='282' y1='108' x2='336' y2='144' marker-end='url(#ah-es)'/>" +
      "<text class='d-sub' x='240' y='188' text-anchor='middle'>writes append events; read models are projections built from them</text>" +
      "</svg>\n\n" +
      "**Interview tip:** the superpowers are **auditability** and **rebuildable projections**; the costs are **complexity**, **eventual consistency** between write and read sides, and **schema/versioning of events** (events are immutable forever). Use **snapshots** so you don't replay millions of events on every load. They're often paired (CQRS read models are projections of the event stream) but you can use either alone.",
    examples: [
      {
        label: "Derive state by folding events",
        variants: [
          {
            tech: "python",
            code: `# Event sourcing: events are the source of truth; state is a fold of them.
events = [
    {"type": "Opened",    "balance": 0},
    {"type": "Deposited", "amount": 100},
    {"type": "Withdrew",  "amount": 30},
    {"type": "Deposited", "amount": 50},
]

def project(events):                       # build a read model from the log
    balance = 0
    for e in events:
        if e["type"] == "Opened":     balance = e["balance"]
        elif e["type"] == "Deposited": balance += e["amount"]
        elif e["type"] == "Withdrew":  balance -= e["amount"]
    return balance

print("current balance:", project(events))   # 120
# You can replay to any point in time, audit every change, or build a
# brand-new projection from the same events.`,
          },
          {
            tech: "go",
            code: `package main

import "fmt"

type Event struct {
	kind   string
	amount int
}

func project(events []Event) int { // fold the log into a read model
	balance := 0
	for _, e := range events {
		switch e.kind {
		case "Opened":
			balance = e.amount
		case "Deposited":
			balance += e.amount
		case "Withdrew":
			balance -= e.amount
		}
	}
	return balance
}

func main() {
	events := []Event{
		{"Opened", 0},
		{"Deposited", 100},
		{"Withdrew", 30},
		{"Deposited", 50},
	}
	fmt.Println("current balance:", project(events)) // 120
}`,
          },
        ],
      },
    ],
  },
  {
    title: "Explain database indexing and B-trees",
    answer:
      "## Indexing & B-trees\n\n" +
      "An **index** is a separate, sorted data structure that maps **column values → row locations**, so the database can find rows without scanning the whole table. The default index type in relational databases is the **B-tree** (really a **B+tree**): a balanced, high-fan-out tree that keeps keys **sorted**.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 200' role='img' aria-label='A B-tree index with a root and leaf nodes'>" +
      "<defs><marker id='ah-bt' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box-accent' x='190' y='34' width='100' height='34' rx='5'/><text class='d-sub' x='240' y='56' text-anchor='middle'>30 | 60</text>" +
      "<rect class='d-box' x='40' y='132' width='100' height='34' rx='5'/><text class='d-sub' x='90' y='154' text-anchor='middle'>10 | 20</text>" +
      "<rect class='d-box' x='190' y='132' width='100' height='34' rx='5'/><text class='d-sub' x='240' y='154' text-anchor='middle'>40 | 50</text>" +
      "<rect class='d-box' x='340' y='132' width='100' height='34' rx='5'/><text class='d-sub' x='390' y='154' text-anchor='middle'>70 | 80</text>" +
      "<line class='d-edge' x1='206' y1='68' x2='110' y2='130' marker-end='url(#ah-bt)'/>" +
      "<line class='d-edge' x1='240' y1='68' x2='240' y2='130' marker-end='url(#ah-bt)'/>" +
      "<line class='d-edge' x1='274' y1='68' x2='370' y2='130' marker-end='url(#ah-bt)'/>" +
      "<text class='d-sub' x='240' y='188' text-anchor='middle'>balanced + sorted -&gt; O(log n) lookups AND range scans (leaves are linked)</text>" +
      "</svg>\n\n" +
      "Because the tree is **balanced** and **shallow** (high fan-out), a lookup touches only a few pages — **O(log n)**. And because leaves are **sorted and linked**, B-trees also serve **range queries** and `ORDER BY` efficiently (a **hash index** can't — it does equality only). The trade-off: indexes **speed reads** but **slow writes** (every insert/update maintains the index) and use extra storage.\n\n" +
      "**Interview tip:** know *why* B-trees win for general use (sorted → ranges + ordering, shallow → few I/Os) and the cost (write amplification, storage). Contrast with **hash** (equality only) and **LSM-trees** (write-optimized, used by Cassandra/RocksDB). Always read the query planner with `EXPLAIN`.",
    examples: [
      {
        label: "Creating and using an index",
        tech: "sql",
        code: `-- Without an index this scans every row (sequential scan):
SELECT * FROM users WHERE email = 'ada@example.com';

-- A B-tree index turns it into an O(log n) lookup:
CREATE INDEX idx_users_email ON users (email);

-- B-trees also accelerate ranges and ORDER BY (sorted, linked leaves):
SELECT * FROM orders
WHERE created_at >= '2024-01-01'
ORDER BY created_at;

-- Always confirm the planner actually uses the index:
EXPLAIN SELECT * FROM users WHERE email = 'ada@example.com';`,
      },
    ],
  },
  {
    title: "What indexing strategies improve database performance?",
    answer:
      "## Indexing strategies\n\n" +
      "Beyond a plain single-column index, the high-leverage techniques are:\n\n" +
      "| Strategy | Use it when |\n" +
      "|---|---|\n" +
      "| Composite (multi-column) | queries filter/sort on several columns — order matters (leftmost prefix) |\n" +
      "| Covering (`INCLUDE`) | a hot query can be answered from the index alone (index-only scan) |\n" +
      "| Partial / filtered | only a subset of rows is ever queried (e.g. `status = 'open'`) |\n" +
      "| Hash | exact-match lookups only, never ranges |\n" +
      "| Full-text / GIN | search inside text / JSON / arrays |\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 120' role='img' aria-label='Leftmost-prefix rule for a composite index'>" +
      "<rect class='d-box-accent' x='90' y='40' width='300' height='40' rx='6'/>" +
      "<line class='d-edge' x1='190' y1='40' x2='190' y2='80'/><line class='d-edge' x1='290' y1='40' x2='290' y2='80'/>" +
      "<text class='d-sub' x='140' y='64' text-anchor='middle'>tenant_id</text>" +
      "<text class='d-sub' x='240' y='64' text-anchor='middle'>created_at</text>" +
      "<text class='d-sub' x='340' y='64' text-anchor='middle'>status</text>" +
      "<text class='d-sub' x='240' y='22' text-anchor='middle'>composite index — usable left-to-right</text>" +
      "<text class='d-sub' x='240' y='100' text-anchor='middle'>filters on tenant_id (and +created_at) hit it; on status alone it does NOT</text>" +
      "</svg>\n\n" +
      "**Interview tip:** the big gotchas — **column order** in composite indexes (the *leftmost-prefix* rule), and that **every index taxes writes and storage**, so index for real query patterns and drop unused ones. Favor **high-selectivity** columns (an index on a boolean rarely helps). Watch for things that **defeat** an index: a function/cast on the column (`WHERE lower(email)=...`) or a leading wildcard (`LIKE '%x'`).",
    examples: [
      {
        label: "Composite, covering, and partial indexes",
        tech: "sql",
        code: `-- Composite: serves WHERE (tenant_id) and (tenant_id, created_at),
-- but NOT (created_at) alone -> the leftmost-prefix rule.
CREATE INDEX idx_events_tenant_time ON events (tenant_id, created_at);

-- Covering: INCLUDE the selected columns so the query is index-only
-- (no extra trip to the table heap).
CREATE INDEX idx_orders_cover ON orders (user_id) INCLUDE (status, total_cents);

-- Partial: index only the rows you actually query -> smaller and faster.
CREATE INDEX idx_orders_open ON orders (user_id) WHERE status = 'open';`,
      },
    ],
  },
  {
    title: "When would you use WebSockets vs polling vs SSE?",
    answer:
      "## Real-time options\n\n" +
      "Three ways to push fresh data to a client, in order of capability:\n\n" +
      "- **Polling:** the client repeatedly asks the server on an interval. Simplest, but wasteful and laggy (you only learn of changes at the next poll). *Long-polling* improves it by holding the request open until there's data.\n" +
      "- **SSE (Server-Sent Events):** a single long-lived HTTP connection streams events **server → client**, one-way, with automatic reconnect. Great for feeds/notifications.\n" +
      "- **WebSocket:** a persistent **full-duplex** TCP connection — both sides push any time, lowest latency. Best for chat, multiplayer, live trading.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 200' role='img' aria-label='Polling versus SSE versus WebSocket message flow'>" +
      "<defs><marker id='ah-rt' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<text class='d-text' x='14' y='34'>Polling</text>" +
      "<line class='d-edge' x1='150' y1='28' x2='430' y2='28' marker-end='url(#ah-rt)'/>" +
      "<line class='d-edge-dashed' x1='430' y1='40' x2='150' y2='40' marker-end='url(#ah-rt)'/>" +
      "<text class='d-sub' x='290' y='58' text-anchor='middle'>client asks again and again (wasteful, laggy)</text>" +
      "<text class='d-text' x='14' y='100'>SSE</text>" +
      "<line class='d-edge-accent' x1='430' y1='96' x2='150' y2='96' marker-end='url(#ah-rt)'/>" +
      "<text class='d-sub' x='290' y='120' text-anchor='middle'>server -&gt; client one-way stream (live feeds)</text>" +
      "<text class='d-text' x='14' y='162'>WebSocket</text>" +
      "<line class='d-edge-accent' x1='150' y1='158' x2='430' y2='158' marker-end='url(#ah-rt)'/>" +
      "<line class='d-edge-accent' x1='430' y1='172' x2='150' y2='172' marker-end='url(#ah-rt)'/>" +
      "<text class='d-sub' x='290' y='194' text-anchor='middle'>full-duplex, lowest latency (chat, games)</text>" +
      "</svg>\n\n" +
      "| | Polling | SSE | WebSocket |\n" +
      "|---|---|---|---|\n" +
      "| Direction | client pulls | server -&gt; client | bidirectional |\n" +
      "| Transport | repeated HTTP | one HTTP stream | TCP upgrade (ws://) |\n" +
      "| Latency | poor (interval) | good | best |\n" +
      "| Complexity | trivial | low | higher (stateful conns) |\n" +
      "| Use for | simple, low-frequency | notifications, live feeds | chat, multiplayer, trading |\n\n" +
      "**Interview tip:** default to the **simplest thing that works** — polling/long-polling for low-frequency updates, **SSE** for one-way streams (it rides plain HTTP and auto-reconnects), and **WebSockets** only when you truly need **bidirectional, low-latency** messaging. Remember WebSockets are **stateful**, so scaling them needs sticky sessions or a pub/sub backplane (e.g. Redis) across nodes.",
    examples: [
      {
        label: "WebSocket vs SSE client",
        tech: "javascript",
        runnable: false,
        code: `// WebSocket: full-duplex — both sides can send any time.
const ws = new WebSocket('wss://example.com/chat');
ws.onopen    = () => ws.send(JSON.stringify({ type: 'join', room: 'general' }));
ws.onmessage = (e) => console.log('received', e.data);

// SSE: server -> client only, auto-reconnects; you just listen.
const es = new EventSource('/api/stream');
es.onmessage = (e) => console.log('event', e.data);`,
      },
    ],
  },
  {
    title: "What is database connection pooling?",
    answer:
      "## Connection pooling\n\n" +
      "Opening a database connection is **expensive** — TCP handshake, TLS, and auth round trips — and databases cap how many connections they can handle. A **connection pool** keeps a fixed set of connections **open and reusable**: a request **borrows** one, runs its query, and **returns** it. If all are busy, requests **queue** until one frees up.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 190' role='img' aria-label='App borrows connections from a pool to reach the database'>" +
      "<defs><marker id='ah-cp' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='12' y='74' width='92' height='46' rx='6'/><text class='d-sub' x='58' y='94' text-anchor='middle'>App</text><text class='d-sub' x='58' y='110' text-anchor='middle'>many reqs</text>" +
      "<rect class='d-box-accent' x='158' y='60' width='152' height='76' rx='8'/><text class='d-text' x='234' y='82' text-anchor='middle'>Connection pool</text>" +
      "<rect class='d-box' x='174' y='98' width='26' height='26' rx='3'/><rect class='d-box' x='208' y='98' width='26' height='26' rx='3'/><rect class='d-box' x='242' y='98' width='26' height='26' rx='3'/><rect class='d-box' x='276' y='98' width='26' height='26' rx='3'/>" +
      "<rect class='d-box' x='366' y='74' width='102' height='46' rx='6'/><text class='d-sub' x='417' y='100' text-anchor='middle'>Database</text>" +
      "<line class='d-edge' x1='104' y1='96' x2='156' y2='96' marker-end='url(#ah-cp)'/>" +
      "<line class='d-edge' x1='310' y1='96' x2='364' y2='96' marker-end='url(#ah-cp)'/>" +
      "<text class='d-sub' x='240' y='160' text-anchor='middle'>reuse a fixed set of open connections; requests queue when all are busy</text>" +
      "</svg>\n\n" +
      "**Sizing matters:** too few connections → requests queue and latency spikes; too many → you overwhelm the database (each connection costs it memory/CPU). A common surprise is that a **smaller** pool can be **faster** under load. With many app instances, add an external pooler like **PgBouncer** so the total connection count to the DB stays bounded.\n\n" +
      "**Interview tip:** the headline is *amortize the expensive handshake and cap concurrent DB load*. Mention tuning **max pool size**, **acquire timeout**, and **idle/max-lifetime** to recycle stale connections — and that serverless/many-instance deployments need a **shared pooler** because each instance otherwise opens its own pool.",
    examples: [
      {
        label: "A pool of N reusable connections",
        variants: [
          {
            tech: "python",
            code: `import threading, queue, time

class Pool:
    def __init__(self, size):
        self.free = queue.Queue()
        for i in range(size):
            self.free.put("conn-" + str(i))   # pre-open N connections
    def acquire(self):
        return self.free.get()                 # blocks/queues if none free
    def release(self, conn):
        self.free.put(conn)

pool = Pool(2)                                  # only 2 connections for everyone

def handle(req):
    conn = pool.acquire()
    print(req, "using", conn)
    time.sleep(0.05)                            # run query
    pool.release(conn)                          # return -> reused

threads = [threading.Thread(target=handle, args=("req" + str(i),)) for i in range(5)]
for t in threads: t.start()
for t in threads: t.join()
print("5 requests served by 2 pooled connections")`,
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
	pool := make(chan string, 2) // 2 connections for everyone
	pool <- "conn-0"
	pool <- "conn-1"

	var wg sync.WaitGroup
	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func(req int) {
			defer wg.Done()
			conn := <-pool // acquire (blocks if none free)
			fmt.Printf("req%d using %s\\n", req, conn)
			time.Sleep(50 * time.Millisecond)
			pool <- conn // release back to the pool
		}(i)
	}
	wg.Wait()
	fmt.Println("5 requests served by 2 pooled connections")
}`,
          },
        ],
      },
    ],
  },
  {
    title: "What is the difference between throttling and rate limiting?",
    answer:
      "## Throttling vs rate limiting\n\n" +
      "They're often used interchangeably, but the useful distinction is **what happens to traffic over the limit**:\n\n" +
      "- **Rate limiting** enforces a hard cap and **rejects** the excess — typically HTTP **429 Too Many Requests**. Protects a service from abuse/overload (the client retries later).\n" +
      "- **Throttling** **slows or shapes** traffic instead of dropping it — queueing, delaying, or reducing the rate so the downstream isn't overwhelmed. The request still completes, just later.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 195' role='img' aria-label='Rate limiting rejects excess; throttling delays it'>" +
      "<defs><marker id='ah-th' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<text class='d-sub' x='240' y='18' text-anchor='middle'>Same burst, two responses</text>" +
      "<rect class='d-box-accent' x='150' y='34' width='124' height='40' rx='6'/><text class='d-sub' x='212' y='58' text-anchor='middle'>Rate limiter</text>" +
      "<line class='d-edge' x1='36' y1='54' x2='148' y2='54' marker-end='url(#ah-th)'/><text class='d-sub' x='86' y='44' text-anchor='middle'>burst</text>" +
      "<line class='d-edge' x1='274' y1='54' x2='386' y2='54' marker-end='url(#ah-th)'/><text class='d-sub' x='436' y='58' text-anchor='middle'>429</text>" +
      "<rect class='d-box' x='150' y='118' width='124' height='40' rx='6'/><text class='d-sub' x='212' y='142' text-anchor='middle'>Throttle (queue)</text>" +
      "<line class='d-edge' x1='36' y1='138' x2='148' y2='138' marker-end='url(#ah-th)'/><text class='d-sub' x='86' y='128' text-anchor='middle'>burst</text>" +
      "<line class='d-edge-accent' x1='274' y1='138' x2='386' y2='138' marker-end='url(#ah-th)'/><text class='d-sub' x='330' y='128' text-anchor='middle'>steady drip</text>" +
      "<text class='d-sub' x='240' y='184' text-anchor='middle'>rate limiting REJECTS excess; throttling DELAYS / shapes it</text>" +
      "</svg>\n\n" +
      "| | Rate limiting | Throttling |\n" +
      "|---|---|---|\n" +
      "| Over the limit | reject (429) | delay / queue / slow |\n" +
      "| Goal | protect from abuse / overload | smooth bursts, fair sharing |\n" +
      "| Client sees | errors (retry later) | slower responses |\n" +
      "| Example | 100 req/min per API key | shape upload bandwidth, drain a queue |\n\n" +
      "**Interview tip:** in practice the algorithms overlap (a **token/leaky bucket** can either drop or delay). Say it cleanly: rate limiting is about a **hard quota with rejection**; throttling is about **traffic shaping / smoothing**. Throttling is closely related to **backpressure** — signaling upstream to slow down rather than dropping work.",
  },
];

export default augments;
