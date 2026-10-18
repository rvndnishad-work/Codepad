/**
 * DSA ULTRA — batch 26: shortest paths and greedy. One complete answer per
 * language (Python, JavaScript, Java, C++). Every example was run with python3 /
 * node / javac+java / g++ -std=c++17 by scripts/verify-dsa-examples.ts and the
 * quoted output is that run's output.
 */
import type { DsaUltraAugment } from "./dsa-augments.types";

const augments: DsaUltraAugment[] = [
  {
    title: `How do you find the cheapest flight with at most K stops?`,
    difficulty: "medium",
    seoDescription: `Cheapest flight within K stops: Bellman-Ford limited to K+1 rounds, and why plain Dijkstra fails. Python, JavaScript, Java and C++, run and verified.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"There are n cities and a list of one-way flights, each given as [from, to, price]. Given a source, a destination and a number K, find the cheapest price from source to destination with at most K stops, or return -1 if there is no such route. Please code it in Python."

**What a strong answer should cover:**
- Model it as a directed weighted graph and translate "at most K stops" into "at most K + 1 flights".
- Explain why plain Dijkstra is wrong here: a cheaper arrival with more flights can be a dead end, so the state must include the flight count.
- Bounded Bellman-Ford: K + 1 rounds of relaxing every flight, reading last round's prices and writing a copy (\`cost[:]\`), in O((K + 1) · E) time and O(n) space.
- The alternative Dijkstra over (cost, flights, city) states with \`heapq\`, and why it can skip a pop only when an earlier pop used no more flights.
- Python details: \`float("inf")\` as "unreachable" (and converting it back to -1), \`cost[:]\` or \`list(cost)\` for a shallow copy, and \`heapq\` being a min-heap over tuples.
- Edge cases: source equals destination, unreachable destination, K = 0.

**Clarifying questions expected:**
- Does K stops mean K intermediate cities, so K + 1 flights?
- Are prices always positive, and what should be returned when there is no route?

**Code / implementation expected:** Yes — \`find_cheapest_price(n, flights, src, dst, k)\` in Python 3, with bounded Bellman-Ford (or a heap-based state search).`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a list, a loop and a function are; graphs and shortest paths are explained as we go.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are booking a trip from Delhi to Lisbon. The booking site shows a wonderful fare: 280 euros. You click it and see the catch — four connections, a night in an airport, and a 6 a.m. hop. You tell the site: *"I will accept at most one layover."* Now the cheapest fare is 410 euros. The answer to "what is the cheapest route?" changed because you added a **limit on the number of stops**.

That is the whole problem. Cities are points, flights are one-way arrows with a price, and you want the cheapest way from a source city to a destination city **using at most K stops** (so at most K + 1 flights). Without the limit, it is the classic cheapest-path problem that [Dijkstra's algorithm](/interview-question/how-does-dijkstra-s-algorithm-work) solves. With the limit, the cheapest way to reach some middle city might use too many flights to be useful, and the algorithms you know need one careful change.

Interviewers like this problem (LeetCode 787, "Cheapest Flights Within K Stops") because it checks whether you understand shortest-path algorithms instead of reciting them: the textbook Dijkstra gives wrong answers here, and the textbook Bellman-Ford gives wrong answers too unless you add one line — a copy of the array. Knowing *why* is what the question is really about.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Does "K stops" mean K intermediate cities, so at most K + 1 flights? | That is the usual reading (LeetCode 787). Getting it wrong is an off-by-one in the number of rounds. |
| Are flights one-way, and can there be two flights between the same pair? | One-way means a directed graph. Duplicates are harmless for the algorithms below, but it is worth knowing. |
| Can a price be zero or negative? | Prices are positive in the standard problem. Bellman-Ford copes with negative prices; Dijkstra does not. |
| What should I return if there is no route? | Usually -1. Also confirm that source equal to destination costs 0. |
| How big are n (cities) and the number of flights? | It decides between the O(K · E) rounds approach and a heap-based search, and whether prices can overflow a 32-bit integer when summed. |
| May a route visit the same city twice? | With positive prices a repeat never helps the cheapest answer, but saying so shows you thought about cycles (the example graph has one). |

## 3. The Core Idea

First, the picture. Each city is a node and each flight is a one-way arrow with a price.

📌 **Interview term: Directed weighted graph** — a set of nodes joined by one-way edges, each edge carrying a number (its weight; here, a price). See [what a graph is and how to represent it](/interview-question/what-is-a-graph-and-how-do-you-represent-it).

📌 **Interview term: Stops vs. edges** — a route with K stops has K intermediate cities and K + 1 flights (edges). Every algorithm below counts edges, so "at most K stops" becomes "at most K + 1 edges".

<svg class="iq-diagram" width="100%" viewBox="0 0 640 330" role="img" aria-label="Four cities. Flights 0 to 1 cost 100, 1 to 2 cost 100, 2 to 0 cost 100, 1 to 3 cost 600 and 2 to 3 cost 200. With at most one stop the cheapest route is 0 to 1 to 3 for 700">
  <defs>
    <marker id="b26q1-a1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge-accent" d="M 112 152 L 268 82" marker-end="url(#b26q1-a1)"/>
  <path class="d-edge" d="M 310 90 L 310 238" marker-end="url(#b26q1-a1)"/>
  <path class="d-edge-dashed" d="M 286 262 L 112 188" marker-end="url(#b26q1-a1)"/>
  <path class="d-edge-accent" d="M 332 78 L 518 152" marker-end="url(#b26q1-a1)"/>
  <path class="d-edge" d="M 332 258 L 518 190" marker-end="url(#b26q1-a1)"/>
  <circle class="d-box" cx="90" cy="170" r="24"/>
  <text class="d-text" x="90" y="175" text-anchor="middle">0</text>
  <circle class="d-box" cx="310" cy="66" r="24"/>
  <text class="d-text" x="310" y="71" text-anchor="middle">1</text>
  <circle class="d-box" cx="310" cy="274" r="24"/>
  <text class="d-text" x="310" y="279" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="540" cy="170" r="24"/>
  <text class="d-text" x="540" y="175" text-anchor="middle">3</text>
  <text class="d-sub" x="170" y="100" text-anchor="middle">100</text>
  <text class="d-sub" x="336" y="170">100</text>
  <text class="d-sub" x="170" y="256" text-anchor="middle">100</text>
  <text class="d-accent" x="450" y="96" text-anchor="middle">600</text>
  <text class="d-sub" x="450" y="250" text-anchor="middle">200</text>
  <text class="d-sub" x="90" y="224" text-anchor="middle">source</text>
  <text class="d-sub" x="540" y="224" text-anchor="middle">destination</text>
</svg>

With **no** limit, the cheapest route from 0 to 3 is 0 → 1 → 2 → 3 for 100 + 100 + 200 = 400. It has **two** stops (cities 1 and 2). With K = 1 it is not allowed, and the best legal route is 0 → 1 → 3 for 700 (the highlighted arrows). Example 1 prints 700 for this input.

### Why plain Dijkstra breaks

[Dijkstra's algorithm](/interview-question/how-does-dijkstra-s-algorithm-work) settles each city the first time it is popped from the priority queue, at its cheapest cost, and never looks at that city again. That is correct when the only thing that matters about reaching a city is the price. Here, a second thing matters: **how many flights it took**. A cheap arrival that used up all your flights is worth less than a pricier arrival with flights to spare.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="City 2 can be reached for 2 using two flights or for 5 using one flight. With at most two flights only the second arrival can continue to city 3, for a total of 6">
  <defs>
    <marker id="b26q1-a2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="120" width="120" height="56" rx="10"/>
  <text class="d-text" x="80" y="144" text-anchor="middle">city 0</text>
  <text class="d-sub" x="80" y="164" text-anchor="middle">cost 0</text>
  <rect class="d-box" x="200" y="20" width="120" height="56" rx="10"/>
  <text class="d-text" x="260" y="44" text-anchor="middle">city 1</text>
  <text class="d-sub" x="260" y="64" text-anchor="middle">1 flight, cost 1</text>
  <rect class="d-box-muted" x="400" y="20" width="140" height="56" rx="10"/>
  <text class="d-text" x="470" y="44" text-anchor="middle">city 2</text>
  <text class="d-sub" x="470" y="64" text-anchor="middle">2 flights, cost 2</text>
  <rect class="d-box" x="400" y="220" width="140" height="56" rx="10"/>
  <text class="d-text" x="470" y="244" text-anchor="middle">city 2</text>
  <text class="d-sub" x="470" y="264" text-anchor="middle">1 flight, cost 5</text>
  <rect class="d-box-accent" x="590" y="220" width="100" height="56" rx="10"/>
  <text class="d-text" x="640" y="244" text-anchor="middle">city 3</text>
  <text class="d-sub" x="640" y="264" text-anchor="middle">cost 6</text>
  <path class="d-edge" d="M 140 136 L 196 64" marker-end="url(#b26q1-a2)"/>
  <path class="d-edge" d="M 320 48 L 396 48" marker-end="url(#b26q1-a2)"/>
  <path class="d-edge" d="M 140 162 L 396 244" marker-end="url(#b26q1-a2)"/>
  <path class="d-edge-accent" d="M 540 248 L 586 248" marker-end="url(#b26q1-a2)"/>
  <text class="d-sub" x="150" y="100" text-anchor="end">price 1</text>
  <text class="d-sub" x="358" y="102" text-anchor="middle">price 1</text>
  <text class="d-sub" x="250" y="230" text-anchor="middle">price 5</text>
  <text class="d-sub" x="470" y="104" text-anchor="middle">dead end: no flights left</text>
</svg>

This is graph B in example 2, with K = 1 (at most 2 flights). City 2 is reached twice: for 2 using two flights (grey, a dead end — no flights left) and for 5 using one flight. A Dijkstra that marks city 2 as finished on its first, cheaper pop throws the second arrival away and answers -1. The real answer is 6. Our run printed exactly that: \`node-visited Dijkstra -1, stops-aware Dijkstra 6\`.

📌 **Interview term: State-space search** — instead of searching over cities, search over *states* that carry everything that matters for the future: here the pair (city, flights used so far). Two arrivals at the same city with different flight counts are different states.

## 4. From Brute Force to K + 1 Rounds

**Brute force.** Try every route of at most K + 1 flights with a depth-first search, and keep the cheapest one that ends at the destination. It is correct, and it is the reference that example 2 checks everything against, but with an average of d flights out of each city it explores up to d^(K+1) routes — exponential in K.

**The key observation.** Let \`cost_r[v]\` be the cheapest price to reach city v using **at most r flights**. Then

- \`cost_0\` is 0 at the source and infinity everywhere else, and
- \`cost_r[v]\` is the smaller of \`cost_(r-1)[v]\` and, over every flight u → v, \`cost_(r-1)[u] + price\`.

Each round extends every best route by at most one flight. After K + 1 rounds, \`cost_(K+1)[dst]\` is the answer. This is exactly [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work), stopped after K + 1 rounds instead of n − 1.

📌 **Interview term: Edge relaxation** — for an edge u → v with price p, "relaxing" it means: if reaching u and then flying to v is cheaper than the best known price for v, record the cheaper price.

📌 **Interview term: Bounded Bellman-Ford** — Bellman-Ford limited to a fixed number of rounds R, which finds the cheapest path using at most R edges. Here R = K + 1.

### The one line that matters: read last round, write this round

The formula reads \`cost_(r-1)\` and writes \`cost_r\`. If you relax in place — one array, read and written in the same round — a price written early in the round can be read later in the **same** round, so one round can chain two, three or more flights. The stop limit is silently ignored.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 290" role="img" aria-label="Graph A. With a copy, round 1 reads only the start array, so city 2 gets 500 from the direct flight. In place, city 1 is set to 100 first and the same round then sets city 2 to 200 through city 1, which is two flights">
  <defs>
    <marker id="b26q1-a3" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="200" height="60" rx="10"/>
  <text class="d-text" x="120" y="46" text-anchor="middle">start: [0, inf, inf]</text>
  <text class="d-sub" x="120" y="66" text-anchor="middle">K = 0, so one round</text>
  <rect class="d-box-accent" x="440" y="20" width="240" height="60" rx="10"/>
  <text class="d-text" x="560" y="46" text-anchor="middle">with copy: [0, 100, 500]</text>
  <text class="d-sub" x="560" y="66" text-anchor="middle">answer 500, correct</text>
  <rect class="d-box" x="440" y="200" width="240" height="60" rx="10"/>
  <text class="d-text" x="560" y="226" text-anchor="middle">in place: [0, 100, 200]</text>
  <text class="d-sub" x="560" y="246" text-anchor="middle">answer 200 uses 2 flights</text>
  <path class="d-edge-accent" d="M 222 50 L 436 50" marker-end="url(#b26q1-a3)"/>
  <path class="d-edge-dashed" d="M 160 82 L 436 222" marker-end="url(#b26q1-a3)"/>
  <text class="d-sub" x="330" y="38" text-anchor="middle">reads only the old array</text>
  <text class="d-sub" x="250" y="190" text-anchor="middle">0 to 1 writes 100, then</text>
  <text class="d-sub" x="250" y="210" text-anchor="middle">1 to 2 reads that 100</text>
</svg>

Graph A is flights 0 → 1 (100), 1 → 2 (100) and 0 → 2 (500), asked from 0 to 2 with K = 0. Only the direct flight is legal, so the answer is 500. Example 2 printed \`copy 500, in-place 200\`. Across 1,000 random graphs, the in-place version was wrong on 44 of them — and right on the other 956, which is why this bug survives casual testing.

Here is the correct version on the four-city graph from section 3 with K = 1 (two rounds):

| After round | cost[0] | cost[1] | cost[2] | cost[3] | What happened |
| :--- | :--- | :--- | :--- | :--- | :--- |
| start | 0 | inf | inf | inf | only the source is reachable |
| 1 (≤ 1 flight) | 0 | 100 | inf | inf | 0 → 1; 1 → 2 reads the *old* cost[1] = inf, so it does nothing yet |
| 2 (≤ 2 flights) | 0 | 100 | 200 | 700 | 1 → 2 gives 200, 1 → 3 gives 700; 2 → 3 still reads the old cost[2] = inf |

\`cost[3]\` is 700. The cheaper 400 route needs a third round, which K = 1 does not allow.

### The other two correct approaches

- **Dijkstra over (city, flights) states.** Push \`(cost, flights, city)\` into a min-heap. When the destination is popped, its cost is the answer. Do not mark a city "done" after its first pop; instead remember the fewest flights with which each city has been popped, and skip a pop that used at least as many — an earlier pop was cheaper *and* used no more flights, so this one can never do better. Example 2 checks this version too.
- **BFS by levels.** Process the frontier one flight at a time (level r = routes of exactly r flights), keeping the best price per city and stopping after K + 1 levels. It is the same idea as the rounds above, organised as a queue; see [when BFS beats Dijkstra](/interview-question/when-would-you-use-bfs-over-dijkstra-for-shortest-paths) for the general trade-off.

📌 **Interview term: Dominated state** — a state that can never lead to a better answer than one already processed (here: same city, higher or equal cost, and at least as many flights). Skipping dominated states is what keeps the state-space Dijkstra fast.

Most interviewers are happy with the bounded Bellman-Ford: it is short, obviously bounded, and its correctness argument fits in one sentence.

## 5. The Code in Python

~~~python
def find_cheapest_price(n, flights, src, dst, k):
    """Cheapest price from src to dst using at most k stops (k + 1 flights), or -1."""
    INF = float("inf")
    cost = [INF] * n
    cost[src] = 0
    for _ in range(k + 1):              # round r allows paths of up to r flights
        nxt = cost[:]                   # copy: read last round, write this round
        for u, v, price in flights:
            if cost[u] != INF and cost[u] + price < nxt[v]:
                nxt[v] = cost[u] + price
        cost = nxt
    return -1 if cost[dst] == INF else cost[dst]
~~~

**What to point out in this code:**

- \`float("inf")\` is Python's infinity. It compares correctly with integers (\`inf + 100\` is still \`inf\`, and \`inf + 100 < inf\` is \`False\` — we printed both), so "unreachable" needs no special case in the comparison. The \`cost[u] != INF\` check is there for clarity, not safety. Convert back to -1 only at the end.
- \`nxt = cost[:]\` makes a **shallow copy**: a new list holding the same numbers. That copy is the whole correctness argument — every relaxation in this round reads \`cost\` (last round) and writes \`nxt\` (this round). \`list(cost)\` or \`cost.copy()\` do the same; \`nxt = cost\` would **not** copy anything, it would just give the same list a second name, which brings the in-place bug back.
- \`for u, v, price in flights:\` unpacks each \`[from, to, price]\` list directly — no index juggling.
- \`range(k + 1)\` runs exactly K + 1 rounds, one per allowed flight.
- The function never builds an adjacency list: Bellman-Ford only needs the flat list of edges. That is one reason it is the shortest correct solution.

The heap-based alternative, from example 2:

~~~python
def dijkstra_stops(n, flights, src, dst, k):
    """State is (city, flights used); skip a pop that is dominated."""
    adj = adjacency(n, flights)
    heap = [(0, 0, src)]
    best_edges = [INF] * n               # fewest flights seen at a popped city
    while heap:
        c, e, u = heapq.heappop(heap)
        if u == dst:
            return c
        if e >= best_edges[u]:
            continue                     # cheaper AND not more flights was seen
        best_edges[u] = e
        if e == k + 1:
            continue
        for v, p in adj[u]:
            heapq.heappush(heap, (c + p, e + 1, v))
    return -1
~~~

- \`heapq\` is a **min-heap** over a plain list, so \`heapq.heappop\` always returns the smallest tuple. Tuples compare element by element, so \`(cost, flights, city)\` pops the cheapest state first and breaks ties by fewer flights. There is no "decrease key": you push a new tuple and skip stale ones when they are popped.
- \`best_edges[u]\` is the fewest flights with which \`u\` has been popped. Because pops come out in cost order, an earlier pop was at least as cheap; if it also used no more flights, the current state is dominated and is skipped.
- Returning on the **first** pop of \`dst\` is safe because every later pop costs at least as much.

## 6. Verified: Running the Code

Each example was saved as one file and run with \`python3 main.py\` (Python 3.13). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — bounded Bellman-Ford on seven inputs** (the four-city graph, graph A with K = 1 and K = 0, an unreachable city, source equal to destination, and the five-city chain with K = 2 and K = 3) prints:

~~~text
700
200
500
-1
0
100
4
~~~

**Example 2 — the two classic bugs, then 1,000 random graphs** checked against the brute-force DFS. The random graphs come from a small seeded generator (the same arithmetic in all four languages), so every run sees the same graphs:

~~~text
graph A, k=0: copy 500, in-place 200
graph B, k=1: node-visited Dijkstra -1, stops-aware Dijkstra 6
random graphs: 1000, copy and stops-aware match brute force on 1000
in-place Bellman-Ford wrong on 44, node-visited Dijkstra wrong on 4
~~~

Two things to notice. The correct versions matched brute force on all 1,000 graphs. The buggy versions were wrong only on 44 and 4 of them — random tests rarely catch these bugs, which is why you should be able to explain them from first principles.

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute-force DFS | O(d^(K+1)) | O(K) | every route of up to K + 1 flights, d flights per city on average |
| Bounded Bellman-Ford | O((K + 1) · E) | O(n) | K + 1 rounds, each relaxes all E flights; two lists of n prices |
| Dijkstra over (city, flights) | O(P log P), with P ≤ E · (K + 1) pushes | O(P) | each city is expanded at most K + 2 times (its best flight count only goes down), and each expansion pushes its outgoing flights |

Here n is the number of cities and E the number of flights. In Python, \`cost[:]\` allocates a new list of n numbers every round, so the rounds version also does O((K + 1) · n) copying — still dominated by the E relaxations when there are more flights than cities. See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read these bounds.

## 8. Edge Cases

- **Source equals destination** — the answer is 0 (no flight needed). Example 1 prints 0 for it.
- **No route at all** — the destination's cost stays infinity after every round; return -1 (example 1, the one-flight graph that never reaches city 2).
- **K = 0** — only direct flights count. Graph A with K = 0 must give 500, not the cheaper two-flight 200.
- **A cheaper route that is too long** — the five-city chain costs 4 with four flights but 100 with one. K = 2 gives 100, K = 3 gives 4 (both in example 1).
- **Cycles** — the four-city graph has the cycle 0 → 1 → 2 → 0. The bounded rounds never loop forever because they stop after K + 1 rounds, and with positive prices a cycle never lowers a price.
- **K larger than n − 2** — no simple route has more than n − 2 stops, so you can cap the number of rounds at n − 1 without changing the answer.

## Common Pitfalls

- **Relaxing in place.** One list, read and written in the same round, lets a round chain several flights. Always write into \`nxt = cost[:]\`.
- **\`nxt = cost\` instead of \`nxt = cost[:]\`.** Assignment does not copy a list in Python; both names point at the same object, so the bug is back while the code *looks* like it copies.
- **Off-by-one on rounds.** K stops is K + 1 flights, so \`range(k + 1)\`, not \`range(k)\`.
- **Using textbook Dijkstra with a visited set.** It returned -1 instead of 6 on graph B. The skip rule must compare flight counts, not just "seen before".
- **Returning \`inf\`.** Forgetting to map \`float("inf")\` back to -1 returns a float that prints as \`inf\`.
- **Python recursion for the brute force.** The DFS is fine for K up to a few hundred (the default recursion limit is 1000), but it is exponential anyway — mention it only as the baseline.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">Cities are nodes, flights are one-way weighted edges, and K stops means at most <strong style="color:#ffca28;">K + 1 flights</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why not Dijkstra:</strong> <span style="color:#f0e2c8;">Plain Dijkstra settles a city on its cheapest arrival, but a cheap arrival that used all the flights is a dead end. The state must be (city, flights used).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Algorithm:</strong> <span style="color:#f0e2c8;">Bounded Bellman-Ford: start with 0 at the source and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">float("inf")</code> elsewhere, then run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">range(k + 1)</code> rounds that relax every flight, reading <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cost</code> and writing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nxt = cost[:]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O((K + 1) × E) time and O(n) space; return -1 if the destination is still infinity.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nxt = cost</code> is not a copy — it is the same list under a second name — so use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cost[:]</code>. For the heap version, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code> is a min-heap over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(cost, flights, city)</code> tuples.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does textbook Dijkstra give the wrong answer here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It finalises a city on its first, cheapest pop. With a stop limit, a cheaper arrival that used more flights can be a dead end, while a pricier arrival with flights to spare is the one that reaches the destination. The state has to be (city, flights used).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do you need the copy of the array in each round?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">So that round r only extends routes from round r − 1. In place, a price written early in a round can be read later in the same round, chaining several flights in one round. Our run: graph A with K = 0 gave 200 in place instead of 500.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the complexity, and when would you pick the heap version instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Bounded Bellman-Ford is O((K + 1) × E) time and O(n) space. The heap version can stop as soon as the destination is popped, which helps when the answer is close and the graph is large, but in the worst case it pushes up to E × (K + 1) entries, each costing a log factor.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you write the heap version in Python?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Push <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(0, 0, src)</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq.heappush</code>. On each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heappop</code>, return the cost if the city is the destination; skip the pop if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best_edges[city]</code> is already at most this flight count; otherwise record it and push every neighbour with one more flight, unless the limit is reached.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Directed weighted graph** | Nodes joined by one-way edges that each carry a number (a price) |
| **Stops vs. edges** | K stops = K intermediate cities = K + 1 flights |
| **State-space search** | Search over (city, extra facts) pairs instead of cities alone |
| **Edge relaxation** | Lower a node price if going through a neighbour is cheaper |
| **Bounded Bellman-Ford** | Bellman-Ford stopped after R rounds: cheapest path with at most R edges |
| **Dominated state** | A state that cannot beat one already processed, so it is skipped |
| **\`heapq\`** | Python module that keeps a plain list as a min-heap; \`heappop\` returns the smallest item |

Related: [Floyd-Warshall](/interview-question/how-does-the-floyd-warshall-algorithm-work) computes all-pairs cheapest paths but has no notion of a stop limit; [what is a heap / priority queue](/interview-question/what-is-a-heap-priority-queue) explains the structure behind \`heapq\`.

---
**Conclusion:** The cheapest flight with at most K stops is a cheapest-path problem with one extra fact per route: how many flights it used. In Python the cleanest answer is bounded Bellman-Ford — K + 1 rounds over the flight list, each reading last round's prices and writing into a fresh \`cost[:]\` copy — which is O((K + 1) · E) time and O(n) space and matched brute force on all 1,000 random graphs we ran. The two classic mistakes, relaxing in place and using a visited-set Dijkstra, are each wrong only now and then (44 and 4 graphs out of 1,000), so explain why the copy and the (city, flights) state are needed rather than hoping tests will catch them.`,
        examples: [
          { label: `Bellman-Ford limited to k + 1 rounds (7 inputs)`, code: `def find_cheapest_price(n, flights, src, dst, k):
    """Cheapest price from src to dst using at most k stops (k + 1 flights), or -1."""
    INF = float("inf")
    cost = [INF] * n
    cost[src] = 0
    for _ in range(k + 1):              # round r allows paths of up to r flights
        nxt = cost[:]                   # copy: read last round, write this round
        for u, v, price in flights:
            if cost[u] != INF and cost[u] + price < nxt[v]:
                nxt[v] = cost[u] + price
        cost = nxt
    return -1 if cost[dst] == INF else cost[dst]


f1 = [[0, 1, 100], [1, 2, 100], [2, 0, 100], [1, 3, 600], [2, 3, 200]]
f2 = [[0, 1, 100], [1, 2, 100], [0, 2, 500]]
chain = [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 1], [0, 4, 100]]

print(find_cheapest_price(4, f1, 0, 3, 1))  # 700
print(find_cheapest_price(3, f2, 0, 2, 1))  # 200
print(find_cheapest_price(3, f2, 0, 2, 0))  # 500
print(find_cheapest_price(3, [[0, 1, 100]], 0, 2, 5))  # -1
print(find_cheapest_price(2, [[0, 1, 5]], 0, 0, 0))  # 0
print(find_cheapest_price(5, chain, 0, 4, 2))  # 100
print(find_cheapest_price(5, chain, 0, 4, 3))  # 4` },
          { label: `Two classic bugs, and a 1,000-graph cross-check against brute force`, code: `import heapq

INF = float("inf")


def bellman_copy(n, flights, src, dst, k):
    cost = [INF] * n
    cost[src] = 0
    for _ in range(k + 1):
        nxt = cost[:]
        for u, v, p in flights:
            if cost[u] + p < nxt[v]:
                nxt[v] = cost[u] + p
        cost = nxt
    return -1 if cost[dst] == INF else cost[dst]


def bellman_in_place(n, flights, src, dst, k):
    """BUG: no copy, so one round can chain several flights."""
    cost = [INF] * n
    cost[src] = 0
    for _ in range(k + 1):
        for u, v, p in flights:
            if cost[u] + p < cost[v]:
                cost[v] = cost[u] + p
    return -1 if cost[dst] == INF else cost[dst]


def adjacency(n, flights):
    adj = [[] for _ in range(n)]
    for u, v, p in flights:
        adj[u].append((v, p))
    return adj


def dijkstra_node_visited(n, flights, src, dst, k):
    """BUG: marks a city done the first time it is popped, whatever its flight count."""
    adj = adjacency(n, flights)
    heap = [(0, 0, src)]                 # (cost, flights used, city)
    done = [False] * n
    while heap:
        c, e, u = heapq.heappop(heap)
        if done[u]:
            continue
        done[u] = True
        if u == dst:
            return c
        if e == k + 1:
            continue
        for v, p in adj[u]:
            if not done[v]:
                heapq.heappush(heap, (c + p, e + 1, v))
    return -1


def dijkstra_stops(n, flights, src, dst, k):
    """State is (city, flights used); skip a pop that is dominated."""
    adj = adjacency(n, flights)
    heap = [(0, 0, src)]
    best_edges = [INF] * n               # fewest flights seen at a popped city
    while heap:
        c, e, u = heapq.heappop(heap)
        if u == dst:
            return c
        if e >= best_edges[u]:
            continue                     # cheaper AND not more flights was seen
        best_edges[u] = e
        if e == k + 1:
            continue
        for v, p in adj[u]:
            heapq.heappush(heap, (c + p, e + 1, v))
    return -1


def brute(n, flights, src, dst, k):
    adj = adjacency(n, flights)
    best = [INF]

    def dfs(u, c, e):
        if u == dst:
            best[0] = min(best[0], c)
        if e == k + 1:
            return
        for v, p in adj[u]:
            dfs(v, c + p, e + 1)

    dfs(src, 0, 0)
    return -1 if best[0] == INF else best[0]


seed = [42]


def rnd(m):
    seed[0] = seed[0] * 48271 % 2147483647
    return seed[0] % m


f2 = [[0, 1, 100], [1, 2, 100], [0, 2, 500]]
print("graph A, k=0: copy " + str(bellman_copy(3, f2, 0, 2, 0)) + ", in-place " + str(bellman_in_place(3, f2, 0, 2, 0)))
fb = [[0, 1, 1], [1, 2, 1], [0, 2, 5], [2, 3, 1]]
print("graph B, k=1: node-visited Dijkstra " + str(dijkstra_node_visited(4, fb, 0, 3, 1)) + ", stops-aware Dijkstra " + str(dijkstra_stops(4, fb, 0, 3, 1)))

trials, agree, wrong_in_place, wrong_visited = 1000, 0, 0, 0
for _ in range(trials):
    n = 5 + rnd(3)
    flights = []
    for _ in range(8 + rnd(10)):
        u, v, p = rnd(n), rnd(n), 1 + rnd(20)
        if u != v:
            flights.append([u, v, p])
    k = 1 + rnd(2)
    want = brute(n, flights, 0, n - 1, k)
    if bellman_copy(n, flights, 0, n - 1, k) == want and dijkstra_stops(n, flights, 0, n - 1, k) == want:
        agree += 1
    if bellman_in_place(n, flights, 0, n - 1, k) != want:
        wrong_in_place += 1
    if dijkstra_node_visited(n, flights, 0, n - 1, k) != want:
        wrong_visited += 1
print("random graphs: " + str(trials) + ", copy and stops-aware match brute force on " + str(agree))
print("in-place Bellman-Ford wrong on " + str(wrong_in_place) + ", node-visited Dijkstra wrong on " + str(wrong_visited))` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"There are n cities and a list of one-way flights, each given as [from, to, price]. Given a source, a destination and a number K, find the cheapest price from source to destination with at most K stops, or return -1 if there is no such route. Please code it in JavaScript."

**What a strong answer should cover:**
- Model it as a directed weighted graph and translate "at most K stops" into "at most K + 1 flights".
- Explain why plain Dijkstra is wrong here: a cheaper arrival with more flights can be a dead end, so the state must include the flight count.
- Bounded Bellman-Ford: K + 1 rounds of relaxing every flight, reading last round's prices and writing a copy (\`cost.slice()\`), in O((K + 1) · E) time and O(n) space.
- The alternative Dijkstra over (cost, flights, city) states — and that JavaScript has no built-in priority queue, so you either write a small binary heap or say you would.
- JavaScript details: \`Infinity\` as "unreachable", \`const next = cost\` being an alias rather than a copy, and prices staying exact as long as sums stay below \`Number.MAX_SAFE_INTEGER\`.
- Edge cases: source equals destination, unreachable destination, K = 0.

**Clarifying questions expected:**
- Does K stops mean K intermediate cities, so K + 1 flights?
- Are prices always positive, and what should be returned when there is no route?

**Code / implementation expected:** Yes — \`findCheapestPrice(n, flights, src, dst, k)\` in JavaScript, with bounded Bellman-Ford (or a heap-based state search).`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what an array, a loop and a function are; graphs and shortest paths are explained as we go.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are booking a trip from Delhi to Lisbon. The booking site shows a wonderful fare: 280 euros. You click it and see the catch — four connections, a night in an airport, and a 6 a.m. hop. You tell the site: *"I will accept at most one layover."* Now the cheapest fare is 410 euros. The answer to "what is the cheapest route?" changed because you added a **limit on the number of stops**.

That is the whole problem. Cities are points, flights are one-way arrows with a price, and you want the cheapest way from a source city to a destination city **using at most K stops** (so at most K + 1 flights). Without the limit, it is the classic cheapest-path problem that [Dijkstra's algorithm](/interview-question/how-does-dijkstra-s-algorithm-work) solves. With the limit, the cheapest way to reach some middle city might use too many flights to be useful, and the algorithms you know need one careful change.

Interviewers like this problem (LeetCode 787, "Cheapest Flights Within K Stops") because it checks whether you understand shortest-path algorithms instead of reciting them: the textbook Dijkstra gives wrong answers here, and the textbook Bellman-Ford gives wrong answers too unless you add one line — a copy of the array. Knowing *why* is what the question is really about.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Does "K stops" mean K intermediate cities, so at most K + 1 flights? | That is the usual reading (LeetCode 787). Getting it wrong is an off-by-one in the number of rounds. |
| Are flights one-way, and can there be two flights between the same pair? | One-way means a directed graph. Duplicates are harmless for the algorithms below, but it is worth knowing. |
| Can a price be zero or negative? | Prices are positive in the standard problem. Bellman-Ford copes with negative prices; Dijkstra does not. |
| What should I return if there is no route? | Usually -1. Also confirm that source equal to destination costs 0. |
| How big are n (cities) and the number of flights? | It decides between the O(K · E) rounds approach and a heap-based search, and whether prices can overflow a 32-bit integer when summed. |
| May a route visit the same city twice? | With positive prices a repeat never helps the cheapest answer, but saying so shows you thought about cycles (the example graph has one). |

## 3. The Core Idea

First, the picture. Each city is a node and each flight is a one-way arrow with a price.

📌 **Interview term: Directed weighted graph** — a set of nodes joined by one-way edges, each edge carrying a number (its weight; here, a price). See [what a graph is and how to represent it](/interview-question/what-is-a-graph-and-how-do-you-represent-it).

📌 **Interview term: Stops vs. edges** — a route with K stops has K intermediate cities and K + 1 flights (edges). Every algorithm below counts edges, so "at most K stops" becomes "at most K + 1 edges".

<svg class="iq-diagram" width="100%" viewBox="0 0 640 330" role="img" aria-label="Four cities. Flights 0 to 1 cost 100, 1 to 2 cost 100, 2 to 0 cost 100, 1 to 3 cost 600 and 2 to 3 cost 200. With at most one stop the cheapest route is 0 to 1 to 3 for 700">
  <defs>
    <marker id="b26q1-a1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge-accent" d="M 112 152 L 268 82" marker-end="url(#b26q1-a1)"/>
  <path class="d-edge" d="M 310 90 L 310 238" marker-end="url(#b26q1-a1)"/>
  <path class="d-edge-dashed" d="M 286 262 L 112 188" marker-end="url(#b26q1-a1)"/>
  <path class="d-edge-accent" d="M 332 78 L 518 152" marker-end="url(#b26q1-a1)"/>
  <path class="d-edge" d="M 332 258 L 518 190" marker-end="url(#b26q1-a1)"/>
  <circle class="d-box" cx="90" cy="170" r="24"/>
  <text class="d-text" x="90" y="175" text-anchor="middle">0</text>
  <circle class="d-box" cx="310" cy="66" r="24"/>
  <text class="d-text" x="310" y="71" text-anchor="middle">1</text>
  <circle class="d-box" cx="310" cy="274" r="24"/>
  <text class="d-text" x="310" y="279" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="540" cy="170" r="24"/>
  <text class="d-text" x="540" y="175" text-anchor="middle">3</text>
  <text class="d-sub" x="170" y="100" text-anchor="middle">100</text>
  <text class="d-sub" x="336" y="170">100</text>
  <text class="d-sub" x="170" y="256" text-anchor="middle">100</text>
  <text class="d-accent" x="450" y="96" text-anchor="middle">600</text>
  <text class="d-sub" x="450" y="250" text-anchor="middle">200</text>
  <text class="d-sub" x="90" y="224" text-anchor="middle">source</text>
  <text class="d-sub" x="540" y="224" text-anchor="middle">destination</text>
</svg>

With **no** limit, the cheapest route from 0 to 3 is 0 → 1 → 2 → 3 for 100 + 100 + 200 = 400. It has **two** stops (cities 1 and 2). With K = 1 it is not allowed, and the best legal route is 0 → 1 → 3 for 700 (the highlighted arrows). Example 1 prints 700 for this input.

### Why plain Dijkstra breaks

[Dijkstra's algorithm](/interview-question/how-does-dijkstra-s-algorithm-work) settles each city the first time it is popped from the priority queue, at its cheapest cost, and never looks at that city again. That is correct when the only thing that matters about reaching a city is the price. Here, a second thing matters: **how many flights it took**. A cheap arrival that used up all your flights is worth less than a pricier arrival with flights to spare.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="City 2 can be reached for 2 using two flights or for 5 using one flight. With at most two flights only the second arrival can continue to city 3, for a total of 6">
  <defs>
    <marker id="b26q1-a2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="120" width="120" height="56" rx="10"/>
  <text class="d-text" x="80" y="144" text-anchor="middle">city 0</text>
  <text class="d-sub" x="80" y="164" text-anchor="middle">cost 0</text>
  <rect class="d-box" x="200" y="20" width="120" height="56" rx="10"/>
  <text class="d-text" x="260" y="44" text-anchor="middle">city 1</text>
  <text class="d-sub" x="260" y="64" text-anchor="middle">1 flight, cost 1</text>
  <rect class="d-box-muted" x="400" y="20" width="140" height="56" rx="10"/>
  <text class="d-text" x="470" y="44" text-anchor="middle">city 2</text>
  <text class="d-sub" x="470" y="64" text-anchor="middle">2 flights, cost 2</text>
  <rect class="d-box" x="400" y="220" width="140" height="56" rx="10"/>
  <text class="d-text" x="470" y="244" text-anchor="middle">city 2</text>
  <text class="d-sub" x="470" y="264" text-anchor="middle">1 flight, cost 5</text>
  <rect class="d-box-accent" x="590" y="220" width="100" height="56" rx="10"/>
  <text class="d-text" x="640" y="244" text-anchor="middle">city 3</text>
  <text class="d-sub" x="640" y="264" text-anchor="middle">cost 6</text>
  <path class="d-edge" d="M 140 136 L 196 64" marker-end="url(#b26q1-a2)"/>
  <path class="d-edge" d="M 320 48 L 396 48" marker-end="url(#b26q1-a2)"/>
  <path class="d-edge" d="M 140 162 L 396 244" marker-end="url(#b26q1-a2)"/>
  <path class="d-edge-accent" d="M 540 248 L 586 248" marker-end="url(#b26q1-a2)"/>
  <text class="d-sub" x="150" y="100" text-anchor="end">price 1</text>
  <text class="d-sub" x="358" y="102" text-anchor="middle">price 1</text>
  <text class="d-sub" x="250" y="230" text-anchor="middle">price 5</text>
  <text class="d-sub" x="470" y="104" text-anchor="middle">dead end: no flights left</text>
</svg>

This is graph B in example 2, with K = 1 (at most 2 flights). City 2 is reached twice: for 2 using two flights (grey, a dead end — no flights left) and for 5 using one flight. A Dijkstra that marks city 2 as finished on its first, cheaper pop throws the second arrival away and answers -1. The real answer is 6. Our run printed exactly that: \`node-visited Dijkstra -1, stops-aware Dijkstra 6\`.

📌 **Interview term: State-space search** — instead of searching over cities, search over *states* that carry everything that matters for the future: here the pair (city, flights used so far). Two arrivals at the same city with different flight counts are different states.

## 4. From Brute Force to K + 1 Rounds

**Brute force.** Try every route of at most K + 1 flights with a depth-first search, and keep the cheapest one that ends at the destination. It is correct, and it is the reference that example 2 checks everything against, but with an average of d flights out of each city it explores up to d^(K+1) routes — exponential in K.

**The key observation.** Let \`cost_r[v]\` be the cheapest price to reach city v using **at most r flights**. Then

- \`cost_0\` is 0 at the source and infinity everywhere else, and
- \`cost_r[v]\` is the smaller of \`cost_(r-1)[v]\` and, over every flight u → v, \`cost_(r-1)[u] + price\`.

Each round extends every best route by at most one flight. After K + 1 rounds, \`cost_(K+1)[dst]\` is the answer. This is exactly [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work), stopped after K + 1 rounds instead of n − 1.

📌 **Interview term: Edge relaxation** — for an edge u → v with price p, "relaxing" it means: if reaching u and then flying to v is cheaper than the best known price for v, record the cheaper price.

📌 **Interview term: Bounded Bellman-Ford** — Bellman-Ford limited to a fixed number of rounds R, which finds the cheapest path using at most R edges. Here R = K + 1.

### The one line that matters: read last round, write this round

The formula reads \`cost_(r-1)\` and writes \`cost_r\`. If you relax in place — one array, read and written in the same round — a price written early in the round can be read later in the **same** round, so one round can chain two, three or more flights. The stop limit is silently ignored.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 290" role="img" aria-label="Graph A. With a copy, round 1 reads only the start array, so city 2 gets 500 from the direct flight. In place, city 1 is set to 100 first and the same round then sets city 2 to 200 through city 1, which is two flights">
  <defs>
    <marker id="b26q1-a3" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="200" height="60" rx="10"/>
  <text class="d-text" x="120" y="46" text-anchor="middle">start: [0, inf, inf]</text>
  <text class="d-sub" x="120" y="66" text-anchor="middle">K = 0, so one round</text>
  <rect class="d-box-accent" x="440" y="20" width="240" height="60" rx="10"/>
  <text class="d-text" x="560" y="46" text-anchor="middle">with copy: [0, 100, 500]</text>
  <text class="d-sub" x="560" y="66" text-anchor="middle">answer 500, correct</text>
  <rect class="d-box" x="440" y="200" width="240" height="60" rx="10"/>
  <text class="d-text" x="560" y="226" text-anchor="middle">in place: [0, 100, 200]</text>
  <text class="d-sub" x="560" y="246" text-anchor="middle">answer 200 uses 2 flights</text>
  <path class="d-edge-accent" d="M 222 50 L 436 50" marker-end="url(#b26q1-a3)"/>
  <path class="d-edge-dashed" d="M 160 82 L 436 222" marker-end="url(#b26q1-a3)"/>
  <text class="d-sub" x="330" y="38" text-anchor="middle">reads only the old array</text>
  <text class="d-sub" x="250" y="190" text-anchor="middle">0 to 1 writes 100, then</text>
  <text class="d-sub" x="250" y="210" text-anchor="middle">1 to 2 reads that 100</text>
</svg>

Graph A is flights 0 → 1 (100), 1 → 2 (100) and 0 → 2 (500), asked from 0 to 2 with K = 0. Only the direct flight is legal, so the answer is 500. Example 2 printed \`copy 500, in-place 200\`. Across 1,000 random graphs, the in-place version was wrong on 44 of them — and right on the other 956, which is why this bug survives casual testing.

Here is the correct version on the four-city graph from section 3 with K = 1 (two rounds):

| After round | cost[0] | cost[1] | cost[2] | cost[3] | What happened |
| :--- | :--- | :--- | :--- | :--- | :--- |
| start | 0 | inf | inf | inf | only the source is reachable |
| 1 (≤ 1 flight) | 0 | 100 | inf | inf | 0 → 1; 1 → 2 reads the *old* cost[1] = inf, so it does nothing yet |
| 2 (≤ 2 flights) | 0 | 100 | 200 | 700 | 1 → 2 gives 200, 1 → 3 gives 700; 2 → 3 still reads the old cost[2] = inf |

\`cost[3]\` is 700. The cheaper 400 route needs a third round, which K = 1 does not allow.

### The other two correct approaches

- **Dijkstra over (city, flights) states.** Push \`(cost, flights, city)\` into a min-heap. When the destination is popped, its cost is the answer. Do not mark a city "done" after its first pop; instead remember the fewest flights with which each city has been popped, and skip a pop that used at least as many — an earlier pop was cheaper *and* used no more flights, so this one can never do better. Example 2 checks this version too.
- **BFS by levels.** Process the frontier one flight at a time (level r = routes of exactly r flights), keeping the best price per city and stopping after K + 1 levels. It is the same idea as the rounds above, organised as a queue; see [when BFS beats Dijkstra](/interview-question/when-would-you-use-bfs-over-dijkstra-for-shortest-paths) for the general trade-off.

📌 **Interview term: Dominated state** — a state that can never lead to a better answer than one already processed (here: same city, higher or equal cost, and at least as many flights). Skipping dominated states is what keeps the state-space Dijkstra fast.

Most interviewers are happy with the bounded Bellman-Ford: it is short, obviously bounded, and its correctness argument fits in one sentence.

## 5. The Code in JavaScript

~~~javascript
function findCheapestPrice(n, flights, src, dst, k) {
  // Cheapest price from src to dst using at most k stops (k + 1 flights), or -1.
  let cost = new Array(n).fill(Infinity);
  cost[src] = 0;
  for (let round = 0; round <= k; round++) {   // round r allows up to r + 1 flights
    const next = cost.slice();                  // copy: read last round, write this round
    for (const [u, v, price] of flights) {
      if (cost[u] !== Infinity && cost[u] + price < next[v]) {
        next[v] = cost[u] + price;
      }
    }
    cost = next;
  }
  return cost[dst] === Infinity ? -1 : cost[dst];
}
~~~

**What to point out in this code:**

- \`Infinity\` is a real number value in JavaScript: \`Infinity + 100\` is still \`Infinity\`, and \`Infinity + 100 < Infinity\` is \`false\` (we printed both), so unreachable cities need no special arithmetic. Convert to -1 only when returning.
- \`const next = cost.slice();\` makes a **shallow copy** — a new array with the same numbers. That copy is the whole correctness argument: each relaxation reads \`cost\` (last round) and writes \`next\` (this round). \`[...cost]\` and \`Array.from(cost)\` work too. Writing \`const next = cost;\` would copy nothing; both names would point at the same array and the in-place bug would be back.
- \`cost\` is declared with \`let\` because it is reassigned to \`next\` at the end of each round; \`const\` only stops reassignment of the name, not changes to the array.
- \`for (const [u, v, price] of flights)\` destructures each \`[from, to, price]\` triple.
- Use \`===\` / \`!==\` for the comparisons; with plain numbers it makes no difference, but it is the habit interviewers expect.
- Numbers are 64-bit floats. Integer prices are exact up to \`Number.MAX_SAFE_INTEGER\` (9007199254740991, printed in our run), far beyond any realistic total fare.

The heap-based alternative, from example 2. JavaScript has no priority queue in the language, so the example carries a 30-line binary heap (\`heapPush\` / \`heapPop\`) that orders \`[cost, flights, city]\` arrays lexicographically:

~~~javascript
function dijkstraStops(n, flights, src, dst, k) {
  // State is (city, flights used); skip a pop that is dominated.
  const adj = adjacency(n, flights);
  const heap = [[0, 0, src]];
  const bestEdges = new Array(n).fill(Infinity);
  while (heap.length > 0) {
    const [c, e, u] = heapPop(heap);
    if (u === dst) return c;
    if (e >= bestEdges[u]) continue;
    bestEdges[u] = e;
    if (e === k + 1) continue;
    for (const [v, p] of adj[u]) heapPush(heap, [c + p, e + 1, v]);
  }
  return -1;
}
~~~

- \`bestEdges[u]\` is the fewest flights with which \`u\` has been popped. Pops come out in cost order, so an earlier pop was at least as cheap; if it also used no more flights, this state is dominated and skipped.
- Returning on the **first** pop of \`dst\` is safe because every later pop costs at least as much.
- In an interview it is fine to say "assume a \`MinPriorityQueue\`" (some platforms preload one) — but say that it is not part of the language.

## 6. Verified: Running the Code

Each example was saved as one file and run with \`node main.js\` (Node 22). They use only \`console.log\`, so they also run unchanged in a browser. The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — bounded Bellman-Ford on seven inputs** (the four-city graph, graph A with K = 1 and K = 0, an unreachable city, source equal to destination, and the five-city chain with K = 2 and K = 3) prints:

~~~text
700
200
500
-1
0
100
4
~~~

**Example 2 — the two classic bugs, then 1,000 random graphs** checked against the brute-force DFS. The random graphs come from a small seeded generator (\`seed * 48271 % 2147483647\`; the product stays below 2^53, so JavaScript computes it exactly, like the other three languages):

~~~text
graph A, k=0: copy 500, in-place 200
graph B, k=1: node-visited Dijkstra -1, stops-aware Dijkstra 6
random graphs: 1000, copy and stops-aware match brute force on 1000
in-place Bellman-Ford wrong on 44, node-visited Dijkstra wrong on 4
~~~

The correct versions matched brute force on all 1,000 graphs. The buggy versions were wrong only on 44 and 4 of them — random tests rarely catch these bugs, which is why you should be able to explain them from first principles.

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute-force DFS | O(d^(K+1)) | O(K) | every route of up to K + 1 flights, d flights per city on average |
| Bounded Bellman-Ford | O((K + 1) · E) | O(n) | K + 1 rounds, each relaxes all E flights; two arrays of n prices |
| Dijkstra over (city, flights) | O(P log P), with P ≤ E · (K + 1) pushes | O(P) | each city is expanded at most K + 2 times (its best flight count only goes down), and each expansion pushes its outgoing flights |

Here n is the number of cities and E the number of flights. \`cost.slice()\` allocates a new array every round, adding O((K + 1) · n) copying — still dominated by the E relaxations when there are more flights than cities. See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read these bounds.

## 8. Edge Cases

- **Source equals destination** — the answer is 0 (no flight needed). Example 1 prints 0 for it.
- **No route at all** — the destination's cost stays infinity after every round; return -1 (example 1, the one-flight graph that never reaches city 2).
- **K = 0** — only direct flights count. Graph A with K = 0 must give 500, not the cheaper two-flight 200.
- **A cheaper route that is too long** — the five-city chain costs 4 with four flights but 100 with one. K = 2 gives 100, K = 3 gives 4 (both in example 1).
- **Cycles** — the four-city graph has the cycle 0 → 1 → 2 → 0. The bounded rounds never loop forever because they stop after K + 1 rounds, and with positive prices a cycle never lowers a price.
- **K larger than n − 2** — no simple route has more than n − 2 stops, so you can cap the number of rounds at n − 1 without changing the answer.

## Common Pitfalls

- **Relaxing in place.** One array, read and written in the same round, lets a round chain several flights. Always write into \`next = cost.slice()\`.
- **\`const next = cost\`.** Arrays are objects; assignment copies the reference, not the contents, so the bug is back while the code *looks* like it copies.
- **Off-by-one on rounds.** K stops is K + 1 flights, so \`round <= k\`, not \`round < k\`.
- **A visited-set Dijkstra.** It returned -1 instead of 6 on graph B. The skip rule must compare flight counts.
- **Sorting to fake a priority queue.** Re-sorting an array on every push works but costs O(P log P) per push; and remember the default \`Array.prototype.sort\` compares as strings (\`[10, 9, 1].sort()\` gave \`[1, 10, 9]\` in our run), so always pass a comparator.
- **Returning \`Infinity\`.** Forgetting to map it back to -1 prints \`Infinity\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">Cities are nodes, flights are one-way weighted edges, and K stops means at most <strong style="color:#ffca28;">K + 1 flights</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why not Dijkstra:</strong> <span style="color:#f0e2c8;">Plain Dijkstra settles a city on its cheapest arrival, but a cheap arrival that used all the flights is a dead end. The state must be (city, flights used).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Algorithm:</strong> <span style="color:#f0e2c8;">Bounded Bellman-Ford: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Infinity</code> everywhere except 0 at the source, then K + 1 rounds that relax every flight, reading <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cost</code> and writing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next = cost.slice()</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O((K + 1) × E) time and O(n) space, and no priority queue needed; return -1 if the destination is still <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Infinity</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const next = cost</code> copies the reference, not the array. For the heap version, say up front that JavaScript has no built-in priority queue and that you will write a small binary heap.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does textbook Dijkstra give the wrong answer here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It finalises a city on its first, cheapest pop. With a stop limit, a cheaper arrival that used more flights can be a dead end, while a pricier arrival with flights to spare is the one that reaches the destination. The state has to be (city, flights used).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do you need the copy of the array in each round?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">So that round r only extends routes from round r − 1. In place, a price written early in a round can be read later in the same round, chaining several flights in one round. Our run: graph A with K = 0 gave 200 in place instead of 500.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the complexity, and when would you pick the heap version instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Bounded Bellman-Ford is O((K + 1) × E) time and O(n) space. The heap version can stop as soon as the destination is popped, which helps when the answer is close and the graph is large, but in the worst case it pushes up to E × (K + 1) entries, each costing a log factor.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you avoid writing a heap in JavaScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — that is a good reason to prefer bounded Bellman-Ford or a level-by-level BFS here. Both need only arrays. If you do need a heap, a binary heap is about 30 lines; sorting the array on every push also works for tiny inputs but turns each push into O(P log P).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Directed weighted graph** | Nodes joined by one-way edges that each carry a number (a price) |
| **Stops vs. edges** | K stops = K intermediate cities = K + 1 flights |
| **State-space search** | Search over (city, extra facts) pairs instead of cities alone |
| **Edge relaxation** | Lower a node price if going through a neighbour is cheaper |
| **Bounded Bellman-Ford** | Bellman-Ford stopped after R rounds: cheapest path with at most R edges |
| **Dominated state** | A state that cannot beat one already processed, so it is skipped |
| **Binary heap** | An array-backed tree where each parent is smaller than its children; push and pop are O(log n). JavaScript has none built in |

Related: [Floyd-Warshall](/interview-question/how-does-the-floyd-warshall-algorithm-work) computes all-pairs cheapest paths but has no notion of a stop limit; [what is a heap / priority queue](/interview-question/what-is-a-heap-priority-queue) explains the structure behind the example heap.

---
**Conclusion:** The cheapest flight with at most K stops is a cheapest-path problem with one extra fact per route: how many flights it used. In JavaScript the cleanest answer is bounded Bellman-Ford — K + 1 rounds over the flight list, each reading last round's prices and writing into a fresh \`cost.slice()\` — which is O((K + 1) · E) time and O(n) space, needs no priority queue (JavaScript has none built in), and matched brute force on all 1,000 random graphs we ran. The two classic mistakes, relaxing in place and a visited-set Dijkstra, are wrong only now and then (44 and 4 graphs out of 1,000), so explain why the copy and the (city, flights) state matter rather than hoping tests catch them.`,
        examples: [
          { label: `Bellman-Ford limited to k + 1 rounds (7 inputs)`, code: `function findCheapestPrice(n, flights, src, dst, k) {
  // Cheapest price from src to dst using at most k stops (k + 1 flights), or -1.
  let cost = new Array(n).fill(Infinity);
  cost[src] = 0;
  for (let round = 0; round <= k; round++) {   // round r allows up to r + 1 flights
    const next = cost.slice();                  // copy: read last round, write this round
    for (const [u, v, price] of flights) {
      if (cost[u] !== Infinity && cost[u] + price < next[v]) {
        next[v] = cost[u] + price;
      }
    }
    cost = next;
  }
  return cost[dst] === Infinity ? -1 : cost[dst];
}

const f1 = [[0, 1, 100], [1, 2, 100], [2, 0, 100], [1, 3, 600], [2, 3, 200]];
const f2 = [[0, 1, 100], [1, 2, 100], [0, 2, 500]];
const chain = [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 1], [0, 4, 100]];

console.log(findCheapestPrice(4, f1, 0, 3, 1)); // 700
console.log(findCheapestPrice(3, f2, 0, 2, 1)); // 200
console.log(findCheapestPrice(3, f2, 0, 2, 0)); // 500
console.log(findCheapestPrice(3, [[0, 1, 100]], 0, 2, 5)); // -1
console.log(findCheapestPrice(2, [[0, 1, 5]], 0, 0, 0)); // 0
console.log(findCheapestPrice(5, chain, 0, 4, 2)); // 100
console.log(findCheapestPrice(5, chain, 0, 4, 3)); // 4` },
          { label: `Two classic bugs, and a 1,000-graph cross-check against brute force`, code: `// A tiny binary min-heap of [cost, flightsUsed, city] arrays (JavaScript has no built-in one).
function less(a, b) {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
}
function heapPush(h, item) {
  h.push(item);
  let i = h.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (!less(h[i], h[p])) break;
    [h[i], h[p]] = [h[p], h[i]];
    i = p;
  }
}
function heapPop(h) {
  const top = h[0], last = h.pop();
  if (h.length > 0) {
    h[0] = last;
    let i = 0;
    for (;;) {
      const l = 2 * i + 1, r = l + 1;
      let m = i;
      if (l < h.length && less(h[l], h[m])) m = l;
      if (r < h.length && less(h[r], h[m])) m = r;
      if (m === i) break;
      [h[i], h[m]] = [h[m], h[i]];
      i = m;
    }
  }
  return top;
}

function bellmanCopy(n, flights, src, dst, k) {
  let cost = new Array(n).fill(Infinity);
  cost[src] = 0;
  for (let r = 0; r <= k; r++) {
    const next = cost.slice();
    for (const [u, v, p] of flights) if (cost[u] + p < next[v]) next[v] = cost[u] + p;
    cost = next;
  }
  return cost[dst] === Infinity ? -1 : cost[dst];
}

function bellmanInPlace(n, flights, src, dst, k) {
  // BUG: no copy, so one round can chain several flights.
  const cost = new Array(n).fill(Infinity);
  cost[src] = 0;
  for (let r = 0; r <= k; r++) {
    for (const [u, v, p] of flights) if (cost[u] + p < cost[v]) cost[v] = cost[u] + p;
  }
  return cost[dst] === Infinity ? -1 : cost[dst];
}

function adjacency(n, flights) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v, p] of flights) adj[u].push([v, p]);
  return adj;
}

function dijkstraNodeVisited(n, flights, src, dst, k) {
  // BUG: marks a city done the first time it is popped, whatever its flight count.
  const adj = adjacency(n, flights);
  const heap = [[0, 0, src]];
  const done = new Array(n).fill(false);
  while (heap.length > 0) {
    const [c, e, u] = heapPop(heap);
    if (done[u]) continue;
    done[u] = true;
    if (u === dst) return c;
    if (e === k + 1) continue;
    for (const [v, p] of adj[u]) if (!done[v]) heapPush(heap, [c + p, e + 1, v]);
  }
  return -1;
}

function dijkstraStops(n, flights, src, dst, k) {
  // State is (city, flights used); skip a pop that is dominated.
  const adj = adjacency(n, flights);
  const heap = [[0, 0, src]];
  const bestEdges = new Array(n).fill(Infinity);
  while (heap.length > 0) {
    const [c, e, u] = heapPop(heap);
    if (u === dst) return c;
    if (e >= bestEdges[u]) continue;
    bestEdges[u] = e;
    if (e === k + 1) continue;
    for (const [v, p] of adj[u]) heapPush(heap, [c + p, e + 1, v]);
  }
  return -1;
}

function brute(n, flights, src, dst, k) {
  const adj = adjacency(n, flights);
  let best = Infinity;
  function dfs(u, c, e) {
    if (u === dst) best = Math.min(best, c);
    if (e === k + 1) return;
    for (const [v, p] of adj[u]) dfs(v, c + p, e + 1);
  }
  dfs(src, 0, 0);
  return best === Infinity ? -1 : best;
}

let seed = 42;
function rnd(m) {
  seed = (seed * 48271) % 2147483647;   // product stays below 2^53, so it is exact
  return seed % m;
}

const f2 = [[0, 1, 100], [1, 2, 100], [0, 2, 500]];
console.log("graph A, k=0: copy " + bellmanCopy(3, f2, 0, 2, 0) + ", in-place " + bellmanInPlace(3, f2, 0, 2, 0));
const fb = [[0, 1, 1], [1, 2, 1], [0, 2, 5], [2, 3, 1]];
console.log("graph B, k=1: node-visited Dijkstra " + dijkstraNodeVisited(4, fb, 0, 3, 1) + ", stops-aware Dijkstra " + dijkstraStops(4, fb, 0, 3, 1));

const trials = 1000;
let agree = 0, wrongInPlace = 0, wrongVisited = 0;
for (let t = 0; t < trials; t++) {
  const n = 5 + rnd(3);
  const flights = [];
  const m = 8 + rnd(10);
  for (let i = 0; i < m; i++) {
    const u = rnd(n), v = rnd(n), p = 1 + rnd(20);
    if (u !== v) flights.push([u, v, p]);
  }
  const k = 1 + rnd(2);
  const want = brute(n, flights, 0, n - 1, k);
  if (bellmanCopy(n, flights, 0, n - 1, k) === want && dijkstraStops(n, flights, 0, n - 1, k) === want) agree++;
  if (bellmanInPlace(n, flights, 0, n - 1, k) !== want) wrongInPlace++;
  if (dijkstraNodeVisited(n, flights, 0, n - 1, k) !== want) wrongVisited++;
}
console.log("random graphs: " + trials + ", copy and stops-aware match brute force on " + agree);
console.log("in-place Bellman-Ford wrong on " + wrongInPlace + ", node-visited Dijkstra wrong on " + wrongVisited);` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"There are n cities and a list of one-way flights, each given as an int[] {from, to, price}. Given a source, a destination and a number K, find the cheapest price from source to destination with at most K stops, or return -1 if there is no such route. Please code it in Java."

**What a strong answer should cover:**
- Model it as a directed weighted graph and translate "at most K stops" into "at most K + 1 flights".
- Explain why plain Dijkstra is wrong here: a cheaper arrival with more flights can be a dead end, so the state must include the flight count.
- Bounded Bellman-Ford: K + 1 rounds of relaxing every flight, reading last round's prices and writing a copy (\`cost.clone()\`), in O((K + 1) · E) time and O(n) space.
- The alternative Dijkstra over {cost, flights, city} states with a \`PriorityQueue<int[]>\` and an explicit comparator.
- Java details: \`Integer.MAX_VALUE\` as infinity overflows to a negative number when you add a price, so check it before adding; \`int[] next = cost\` is an alias, not a copy.
- Edge cases: source equals destination, unreachable destination, K = 0.

**Clarifying questions expected:**
- Does K stops mean K intermediate cities, so K + 1 flights?
- Are prices always positive, and can the total exceed the int range?

**Code / implementation expected:** Yes — \`int findCheapestPrice(int n, int[][] flights, int src, int dst, int k)\` in Java, with bounded Bellman-Ford (or a heap-based state search).`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what an array, a loop and a static method are; graphs and shortest paths are explained as we go.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are booking a trip from Delhi to Lisbon. The booking site shows a wonderful fare: 280 euros. You click it and see the catch — four connections, a night in an airport, and a 6 a.m. hop. You tell the site: *"I will accept at most one layover."* Now the cheapest fare is 410 euros. The answer to "what is the cheapest route?" changed because you added a **limit on the number of stops**.

That is the whole problem. Cities are points, flights are one-way arrows with a price, and you want the cheapest way from a source city to a destination city **using at most K stops** (so at most K + 1 flights). Without the limit, it is the classic cheapest-path problem that [Dijkstra's algorithm](/interview-question/how-does-dijkstra-s-algorithm-work) solves. With the limit, the cheapest way to reach some middle city might use too many flights to be useful, and the algorithms you know need one careful change.

Interviewers like this problem (LeetCode 787, "Cheapest Flights Within K Stops") because it checks whether you understand shortest-path algorithms instead of reciting them: the textbook Dijkstra gives wrong answers here, and the textbook Bellman-Ford gives wrong answers too unless you add one line — a copy of the array. Knowing *why* is what the question is really about.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Does "K stops" mean K intermediate cities, so at most K + 1 flights? | That is the usual reading (LeetCode 787). Getting it wrong is an off-by-one in the number of rounds. |
| Are flights one-way, and can there be two flights between the same pair? | One-way means a directed graph. Duplicates are harmless for the algorithms below, but it is worth knowing. |
| Can a price be zero or negative? | Prices are positive in the standard problem. Bellman-Ford copes with negative prices; Dijkstra does not. |
| What should I return if there is no route? | Usually -1. Also confirm that source equal to destination costs 0. |
| How big are n (cities) and the number of flights? | It decides between the O(K · E) rounds approach and a heap-based search, and whether prices can overflow a 32-bit integer when summed. |
| May a route visit the same city twice? | With positive prices a repeat never helps the cheapest answer, but saying so shows you thought about cycles (the example graph has one). |

## 3. The Core Idea

First, the picture. Each city is a node and each flight is a one-way arrow with a price.

📌 **Interview term: Directed weighted graph** — a set of nodes joined by one-way edges, each edge carrying a number (its weight; here, a price). See [what a graph is and how to represent it](/interview-question/what-is-a-graph-and-how-do-you-represent-it).

📌 **Interview term: Stops vs. edges** — a route with K stops has K intermediate cities and K + 1 flights (edges). Every algorithm below counts edges, so "at most K stops" becomes "at most K + 1 edges".

<svg class="iq-diagram" width="100%" viewBox="0 0 640 330" role="img" aria-label="Four cities. Flights 0 to 1 cost 100, 1 to 2 cost 100, 2 to 0 cost 100, 1 to 3 cost 600 and 2 to 3 cost 200. With at most one stop the cheapest route is 0 to 1 to 3 for 700">
  <defs>
    <marker id="b26q1-a1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge-accent" d="M 112 152 L 268 82" marker-end="url(#b26q1-a1)"/>
  <path class="d-edge" d="M 310 90 L 310 238" marker-end="url(#b26q1-a1)"/>
  <path class="d-edge-dashed" d="M 286 262 L 112 188" marker-end="url(#b26q1-a1)"/>
  <path class="d-edge-accent" d="M 332 78 L 518 152" marker-end="url(#b26q1-a1)"/>
  <path class="d-edge" d="M 332 258 L 518 190" marker-end="url(#b26q1-a1)"/>
  <circle class="d-box" cx="90" cy="170" r="24"/>
  <text class="d-text" x="90" y="175" text-anchor="middle">0</text>
  <circle class="d-box" cx="310" cy="66" r="24"/>
  <text class="d-text" x="310" y="71" text-anchor="middle">1</text>
  <circle class="d-box" cx="310" cy="274" r="24"/>
  <text class="d-text" x="310" y="279" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="540" cy="170" r="24"/>
  <text class="d-text" x="540" y="175" text-anchor="middle">3</text>
  <text class="d-sub" x="170" y="100" text-anchor="middle">100</text>
  <text class="d-sub" x="336" y="170">100</text>
  <text class="d-sub" x="170" y="256" text-anchor="middle">100</text>
  <text class="d-accent" x="450" y="96" text-anchor="middle">600</text>
  <text class="d-sub" x="450" y="250" text-anchor="middle">200</text>
  <text class="d-sub" x="90" y="224" text-anchor="middle">source</text>
  <text class="d-sub" x="540" y="224" text-anchor="middle">destination</text>
</svg>

With **no** limit, the cheapest route from 0 to 3 is 0 → 1 → 2 → 3 for 100 + 100 + 200 = 400. It has **two** stops (cities 1 and 2). With K = 1 it is not allowed, and the best legal route is 0 → 1 → 3 for 700 (the highlighted arrows). Example 1 prints 700 for this input.

### Why plain Dijkstra breaks

[Dijkstra's algorithm](/interview-question/how-does-dijkstra-s-algorithm-work) settles each city the first time it is popped from the priority queue, at its cheapest cost, and never looks at that city again. That is correct when the only thing that matters about reaching a city is the price. Here, a second thing matters: **how many flights it took**. A cheap arrival that used up all your flights is worth less than a pricier arrival with flights to spare.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="City 2 can be reached for 2 using two flights or for 5 using one flight. With at most two flights only the second arrival can continue to city 3, for a total of 6">
  <defs>
    <marker id="b26q1-a2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="120" width="120" height="56" rx="10"/>
  <text class="d-text" x="80" y="144" text-anchor="middle">city 0</text>
  <text class="d-sub" x="80" y="164" text-anchor="middle">cost 0</text>
  <rect class="d-box" x="200" y="20" width="120" height="56" rx="10"/>
  <text class="d-text" x="260" y="44" text-anchor="middle">city 1</text>
  <text class="d-sub" x="260" y="64" text-anchor="middle">1 flight, cost 1</text>
  <rect class="d-box-muted" x="400" y="20" width="140" height="56" rx="10"/>
  <text class="d-text" x="470" y="44" text-anchor="middle">city 2</text>
  <text class="d-sub" x="470" y="64" text-anchor="middle">2 flights, cost 2</text>
  <rect class="d-box" x="400" y="220" width="140" height="56" rx="10"/>
  <text class="d-text" x="470" y="244" text-anchor="middle">city 2</text>
  <text class="d-sub" x="470" y="264" text-anchor="middle">1 flight, cost 5</text>
  <rect class="d-box-accent" x="590" y="220" width="100" height="56" rx="10"/>
  <text class="d-text" x="640" y="244" text-anchor="middle">city 3</text>
  <text class="d-sub" x="640" y="264" text-anchor="middle">cost 6</text>
  <path class="d-edge" d="M 140 136 L 196 64" marker-end="url(#b26q1-a2)"/>
  <path class="d-edge" d="M 320 48 L 396 48" marker-end="url(#b26q1-a2)"/>
  <path class="d-edge" d="M 140 162 L 396 244" marker-end="url(#b26q1-a2)"/>
  <path class="d-edge-accent" d="M 540 248 L 586 248" marker-end="url(#b26q1-a2)"/>
  <text class="d-sub" x="150" y="100" text-anchor="end">price 1</text>
  <text class="d-sub" x="358" y="102" text-anchor="middle">price 1</text>
  <text class="d-sub" x="250" y="230" text-anchor="middle">price 5</text>
  <text class="d-sub" x="470" y="104" text-anchor="middle">dead end: no flights left</text>
</svg>

This is graph B in example 2, with K = 1 (at most 2 flights). City 2 is reached twice: for 2 using two flights (grey, a dead end — no flights left) and for 5 using one flight. A Dijkstra that marks city 2 as finished on its first, cheaper pop throws the second arrival away and answers -1. The real answer is 6. Our run printed exactly that: \`node-visited Dijkstra -1, stops-aware Dijkstra 6\`.

📌 **Interview term: State-space search** — instead of searching over cities, search over *states* that carry everything that matters for the future: here the pair (city, flights used so far). Two arrivals at the same city with different flight counts are different states.

## 4. From Brute Force to K + 1 Rounds

**Brute force.** Try every route of at most K + 1 flights with a depth-first search, and keep the cheapest one that ends at the destination. It is correct, and it is the reference that example 2 checks everything against, but with an average of d flights out of each city it explores up to d^(K+1) routes — exponential in K.

**The key observation.** Let \`cost_r[v]\` be the cheapest price to reach city v using **at most r flights**. Then

- \`cost_0\` is 0 at the source and infinity everywhere else, and
- \`cost_r[v]\` is the smaller of \`cost_(r-1)[v]\` and, over every flight u → v, \`cost_(r-1)[u] + price\`.

Each round extends every best route by at most one flight. After K + 1 rounds, \`cost_(K+1)[dst]\` is the answer. This is exactly [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work), stopped after K + 1 rounds instead of n − 1.

📌 **Interview term: Edge relaxation** — for an edge u → v with price p, "relaxing" it means: if reaching u and then flying to v is cheaper than the best known price for v, record the cheaper price.

📌 **Interview term: Bounded Bellman-Ford** — Bellman-Ford limited to a fixed number of rounds R, which finds the cheapest path using at most R edges. Here R = K + 1.

### The one line that matters: read last round, write this round

The formula reads \`cost_(r-1)\` and writes \`cost_r\`. If you relax in place — one array, read and written in the same round — a price written early in the round can be read later in the **same** round, so one round can chain two, three or more flights. The stop limit is silently ignored.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 290" role="img" aria-label="Graph A. With a copy, round 1 reads only the start array, so city 2 gets 500 from the direct flight. In place, city 1 is set to 100 first and the same round then sets city 2 to 200 through city 1, which is two flights">
  <defs>
    <marker id="b26q1-a3" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="200" height="60" rx="10"/>
  <text class="d-text" x="120" y="46" text-anchor="middle">start: [0, inf, inf]</text>
  <text class="d-sub" x="120" y="66" text-anchor="middle">K = 0, so one round</text>
  <rect class="d-box-accent" x="440" y="20" width="240" height="60" rx="10"/>
  <text class="d-text" x="560" y="46" text-anchor="middle">with copy: [0, 100, 500]</text>
  <text class="d-sub" x="560" y="66" text-anchor="middle">answer 500, correct</text>
  <rect class="d-box" x="440" y="200" width="240" height="60" rx="10"/>
  <text class="d-text" x="560" y="226" text-anchor="middle">in place: [0, 100, 200]</text>
  <text class="d-sub" x="560" y="246" text-anchor="middle">answer 200 uses 2 flights</text>
  <path class="d-edge-accent" d="M 222 50 L 436 50" marker-end="url(#b26q1-a3)"/>
  <path class="d-edge-dashed" d="M 160 82 L 436 222" marker-end="url(#b26q1-a3)"/>
  <text class="d-sub" x="330" y="38" text-anchor="middle">reads only the old array</text>
  <text class="d-sub" x="250" y="190" text-anchor="middle">0 to 1 writes 100, then</text>
  <text class="d-sub" x="250" y="210" text-anchor="middle">1 to 2 reads that 100</text>
</svg>

Graph A is flights 0 → 1 (100), 1 → 2 (100) and 0 → 2 (500), asked from 0 to 2 with K = 0. Only the direct flight is legal, so the answer is 500. Example 2 printed \`copy 500, in-place 200\`. Across 1,000 random graphs, the in-place version was wrong on 44 of them — and right on the other 956, which is why this bug survives casual testing.

Here is the correct version on the four-city graph from section 3 with K = 1 (two rounds):

| After round | cost[0] | cost[1] | cost[2] | cost[3] | What happened |
| :--- | :--- | :--- | :--- | :--- | :--- |
| start | 0 | inf | inf | inf | only the source is reachable |
| 1 (≤ 1 flight) | 0 | 100 | inf | inf | 0 → 1; 1 → 2 reads the *old* cost[1] = inf, so it does nothing yet |
| 2 (≤ 2 flights) | 0 | 100 | 200 | 700 | 1 → 2 gives 200, 1 → 3 gives 700; 2 → 3 still reads the old cost[2] = inf |

\`cost[3]\` is 700. The cheaper 400 route needs a third round, which K = 1 does not allow.

### The other two correct approaches

- **Dijkstra over (city, flights) states.** Push \`(cost, flights, city)\` into a min-heap. When the destination is popped, its cost is the answer. Do not mark a city "done" after its first pop; instead remember the fewest flights with which each city has been popped, and skip a pop that used at least as many — an earlier pop was cheaper *and* used no more flights, so this one can never do better. Example 2 checks this version too.
- **BFS by levels.** Process the frontier one flight at a time (level r = routes of exactly r flights), keeping the best price per city and stopping after K + 1 levels. It is the same idea as the rounds above, organised as a queue; see [when BFS beats Dijkstra](/interview-question/when-would-you-use-bfs-over-dijkstra-for-shortest-paths) for the general trade-off.

📌 **Interview term: Dominated state** — a state that can never lead to a better answer than one already processed (here: same city, higher or equal cost, and at least as many flights). Skipping dominated states is what keeps the state-space Dijkstra fast.

Most interviewers are happy with the bounded Bellman-Ford: it is short, obviously bounded, and its correctness argument fits in one sentence.

## 5. The Code in Java

~~~java
// Cheapest price from src to dst using at most k stops (k + 1 flights), or -1.
static int findCheapestPrice(int n, int[][] flights, int src, int dst, int k) {
    int[] cost = new int[n];
    Arrays.fill(cost, INF);
    cost[src] = 0;
    for (int round = 0; round <= k; round++) {   // round r allows up to r + 1 flights
        int[] next = cost.clone();               // copy: read last round, write this round
        for (int[] f : flights) {
            int u = f[0], v = f[1], price = f[2];
            // check INF first: INF + price would overflow to a negative number
            if (cost[u] != INF && cost[u] + price < next[v]) {
                next[v] = cost[u] + price;
            }
        }
        cost = next;
    }
    return cost[dst] == INF ? -1 : cost[dst];
}
~~~

**What to point out in this code:**

- \`INF = Integer.MAX_VALUE\` stands for "unreachable". Java \`int\` arithmetic **wraps around** silently: \`Integer.MAX_VALUE + 100\` printed \`-2147483549\` in our run. Without the \`cost[u] != INF\` check, an unreachable city plus a price would become a large *negative* number and win every comparison. This check is not optional in Java.
- \`int[] next = cost.clone();\` makes a **copy** of the array (for an \`int[]\`, \`clone()\` copies the values). That copy is the whole correctness argument: each relaxation reads \`cost\` (last round) and writes \`next\` (this round). \`Arrays.copyOf(cost, n)\` does the same. Writing \`int[] next = cost;\` copies only the reference — both names point at one array — and the in-place bug is back.
- \`Arrays.fill(cost, INF)\` initialises every slot; a new \`int[]\` starts at 0, which would mean "reachable for free".
- Each flight is an \`int[]\` of three values, read as \`f[0]\`, \`f[1]\`, \`f[2]\`. Keeping primitives (not \`Integer\`) avoids boxing and the \`Integer ==\` trap.
- If prices could sum past about 2.1 billion, switch \`cost\` to \`long[]\` and use \`Long.MAX_VALUE\` with the same guard.

The heap-based alternative, from example 2:

~~~java
// State is (city, flights used); skip a pop that is dominated.
static int dijkstraStops(int n, List<int[]> flights, int src, int dst, int k) {
    List<List<int[]>> adj = adjacency(n, flights);
    PriorityQueue<int[]> heap = new PriorityQueue<>(ORDER);
    heap.add(new int[]{0, 0, src});
    int[] bestEdges = new int[n];
    Arrays.fill(bestEdges, INF);
    while (!heap.isEmpty()) {
        int[] top = heap.poll();
        int c = top[0], e = top[1], u = top[2];
        if (u == dst) return c;
        if (e >= bestEdges[u]) continue;
        bestEdges[u] = e;
        if (e == k + 1) continue;
        for (int[] vp : adj.get(u)) heap.add(new int[]{c + vp[1], e + 1, vp[0]});
    }
    return -1;
}
~~~

- \`PriorityQueue\` is a **min-heap** for the order you give it. The \`ORDER\` comparator compares \`{cost, flights, city}\` arrays element by element. Use \`Integer.compare(a[i], b[i])\`, not \`a[i] - b[i]\`: subtraction can overflow for large values and flip the order.
- \`poll()\` removes the smallest entry. There is no "decrease key"; you add a new entry and skip stale ones when they come out.
- \`bestEdges[u]\` is the fewest flights with which \`u\` has been polled; a later poll with at least as many flights is dominated and skipped. Returning on the **first** poll of \`dst\` is safe because every later poll costs at least as much.

## 6. Verified: Running the Code

Each example was saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — bounded Bellman-Ford on seven inputs** (the four-city graph, graph A with K = 1 and K = 0, an unreachable city, source equal to destination, and the five-city chain with K = 2 and K = 3) prints:

~~~text
700
200
500
-1
0
100
4
~~~

**Example 2 — the two classic bugs, then 1,000 random graphs** checked against the brute-force DFS. The random graphs come from a small seeded generator (\`seed * 48271 % 2147483647\` in \`long\`, so the product never overflows), the same arithmetic in all four languages:

~~~text
graph A, k=0: copy 500, in-place 200
graph B, k=1: node-visited Dijkstra -1, stops-aware Dijkstra 6
random graphs: 1000, copy and stops-aware match brute force on 1000
in-place Bellman-Ford wrong on 44, node-visited Dijkstra wrong on 4
~~~

The correct versions matched brute force on all 1,000 graphs. The buggy versions were wrong only on 44 and 4 of them — random tests rarely catch these bugs, which is why you should be able to explain them from first principles.

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute-force DFS | O(d^(K+1)) | O(K) | every route of up to K + 1 flights, d flights per city on average |
| Bounded Bellman-Ford | O((K + 1) · E) | O(n) | K + 1 rounds, each relaxes all E flights; two \`int[]\` of n prices |
| Dijkstra over (city, flights) | O(P log P), with P ≤ E · (K + 1) pushes | O(P) | each city is expanded at most K + 2 times (its best flight count only goes down), and each expansion pushes its outgoing flights |

Here n is the number of cities and E the number of flights. \`clone()\` allocates a new array every round, adding O((K + 1) · n) copying — still dominated by the E relaxations when there are more flights than cities. The heap version also allocates one small \`int[]\` per push, which is the main constant-factor cost in Java. See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read these bounds.

## 8. Edge Cases

- **Source equals destination** — the answer is 0 (no flight needed). Example 1 prints 0 for it.
- **No route at all** — the destination's cost stays infinity after every round; return -1 (example 1, the one-flight graph that never reaches city 2).
- **K = 0** — only direct flights count. Graph A with K = 0 must give 500, not the cheaper two-flight 200.
- **A cheaper route that is too long** — the five-city chain costs 4 with four flights but 100 with one. K = 2 gives 100, K = 3 gives 4 (both in example 1).
- **Cycles** — the four-city graph has the cycle 0 → 1 → 2 → 0. The bounded rounds never loop forever because they stop after K + 1 rounds, and with positive prices a cycle never lowers a price.
- **K larger than n − 2** — no simple route has more than n − 2 stops, so you can cap the number of rounds at n − 1 without changing the answer.

## Common Pitfalls

- **\`INF + price\` overflow.** \`Integer.MAX_VALUE + 100\` is negative in Java. Guard with \`cost[u] != INF\` before adding, or use a smaller sentinel such as \`1_000_000_000\` that leaves room.
- **Relaxing in place.** One array, read and written in the same round, lets a round chain several flights. Always write into \`next = cost.clone()\`.
- **\`int[] next = cost\`.** Arrays are objects; assignment copies the reference, not the contents.
- **Comparator by subtraction.** \`(a, b) -> a[0] - b[0]\` can overflow; use \`Integer.compare\`.
- **A visited-set Dijkstra.** It returned -1 instead of 6 on graph B. The skip rule must compare flight counts.
- **Off-by-one on rounds.** K stops is K + 1 flights, so \`round <= k\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">Cities are nodes, flights are one-way weighted edges, and K stops means at most <strong style="color:#ffca28;">K + 1 flights</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why not Dijkstra:</strong> <span style="color:#f0e2c8;">Plain Dijkstra settles a city on its cheapest arrival, but a cheap arrival that used all the flights is a dead end. The state must be (city, flights used).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Algorithm:</strong> <span style="color:#f0e2c8;">Bounded Bellman-Ford: fill <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cost</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.MAX_VALUE</code>, set the source to 0, then run K + 1 rounds that relax every flight, reading <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cost</code> and writing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next = cost.clone()</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O((K + 1) × E) time and O(n) space; return -1 if the destination is still <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INF</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">Check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cost[u] != INF</code> before adding a price — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.MAX_VALUE + 100</code> wraps to a negative number. For the heap version, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue&lt;int[]&gt;</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.compare</code>, not subtraction.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does textbook Dijkstra give the wrong answer here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It finalises a city on its first, cheapest pop. With a stop limit, a cheaper arrival that used more flights can be a dead end, while a pricier arrival with flights to spare is the one that reaches the destination. The state has to be (city, flights used).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do you need the copy of the array in each round?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">So that round r only extends routes from round r − 1. In place, a price written early in a round can be read later in the same round, chaining several flights in one round. Our run: graph A with K = 0 gave 200 in place instead of 500.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the complexity, and when would you pick the heap version instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Bounded Bellman-Ford is O((K + 1) × E) time and O(n) space. The heap version can stop as soon as the destination is popped, which helps when the answer is close and the graph is large, but in the worst case it pushes up to E × (K + 1) entries, each costing a log factor.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why use int[] entries in the PriorityQueue instead of a record or Integer list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> keeps the values unboxed and needs only a comparator. A small <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">record State(int cost, int flights, int city)</code> reads better and is fine too; avoid <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">List&lt;Integer&gt;</code> because of boxing and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer ==</code> trap above 127.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Directed weighted graph** | Nodes joined by one-way edges that each carry a number (a price) |
| **Stops vs. edges** | K stops = K intermediate cities = K + 1 flights |
| **State-space search** | Search over (city, extra facts) pairs instead of cities alone |
| **Edge relaxation** | Lower a node price if going through a neighbour is cheaper |
| **Bounded Bellman-Ford** | Bellman-Ford stopped after R rounds: cheapest path with at most R edges |
| **Dominated state** | A state that cannot beat one already processed, so it is skipped |
| **Integer overflow** | Java \`int\` silently wraps past 2,147,483,647 to negative numbers |
| **\`PriorityQueue\`** | Java min-heap for the comparator it is given; \`poll()\` removes the smallest |

Related: [Floyd-Warshall](/interview-question/how-does-the-floyd-warshall-algorithm-work) computes all-pairs cheapest paths but has no notion of a stop limit; [what is a heap / priority queue](/interview-question/what-is-a-heap-priority-queue) explains the structure behind \`PriorityQueue\`.

---
**Conclusion:** The cheapest flight with at most K stops is a cheapest-path problem with one extra fact per route: how many flights it used. In Java the cleanest answer is bounded Bellman-Ford — K + 1 rounds over the flight array, each reading last round's prices and writing into \`cost.clone()\`, with an \`INF\` guard because \`int\` overflows silently — which is O((K + 1) · E) time and O(n) space and matched brute force on all 1,000 random graphs we ran. The two classic mistakes, relaxing in place and a visited-set Dijkstra, are wrong only now and then (44 and 4 graphs out of 1,000), so explain why the copy and the (city, flights) state matter rather than hoping tests catch them.`,
        examples: [
          { label: `Bellman-Ford limited to k + 1 rounds (7 inputs)`, code: `import java.util.Arrays;

public class Main {
    static final int INF = Integer.MAX_VALUE;

    // Cheapest price from src to dst using at most k stops (k + 1 flights), or -1.
    static int findCheapestPrice(int n, int[][] flights, int src, int dst, int k) {
        int[] cost = new int[n];
        Arrays.fill(cost, INF);
        cost[src] = 0;
        for (int round = 0; round <= k; round++) {   // round r allows up to r + 1 flights
            int[] next = cost.clone();               // copy: read last round, write this round
            for (int[] f : flights) {
                int u = f[0], v = f[1], price = f[2];
                // check INF first: INF + price would overflow to a negative number
                if (cost[u] != INF && cost[u] + price < next[v]) {
                    next[v] = cost[u] + price;
                }
            }
            cost = next;
        }
        return cost[dst] == INF ? -1 : cost[dst];
    }

    public static void main(String[] args) {
        int[][] f1 = {{0, 1, 100}, {1, 2, 100}, {2, 0, 100}, {1, 3, 600}, {2, 3, 200}};
        int[][] f2 = {{0, 1, 100}, {1, 2, 100}, {0, 2, 500}};
        int[][] chain = {{0, 1, 1}, {1, 2, 1}, {2, 3, 1}, {3, 4, 1}, {0, 4, 100}};

        System.out.println(findCheapestPrice(4, f1, 0, 3, 1));                  // 700
        System.out.println(findCheapestPrice(3, f2, 0, 2, 1));                  // 200
        System.out.println(findCheapestPrice(3, f2, 0, 2, 0));                  // 500
        System.out.println(findCheapestPrice(3, new int[][]{{0, 1, 100}}, 0, 2, 5)); // -1
        System.out.println(findCheapestPrice(2, new int[][]{{0, 1, 5}}, 0, 0, 0));   // 0
        System.out.println(findCheapestPrice(5, chain, 0, 4, 2));               // 100
        System.out.println(findCheapestPrice(5, chain, 0, 4, 3));               // 4
    }
}` },
          { label: `Two classic bugs, and a 1,000-graph cross-check against brute force`, code: `import java.util.*;

public class Main {
    static final int INF = Integer.MAX_VALUE;

    static int bellmanCopy(int n, List<int[]> flights, int src, int dst, int k) {
        int[] cost = new int[n];
        Arrays.fill(cost, INF);
        cost[src] = 0;
        for (int r = 0; r <= k; r++) {
            int[] next = cost.clone();
            for (int[] f : flights)
                if (cost[f[0]] != INF && cost[f[0]] + f[2] < next[f[1]]) next[f[1]] = cost[f[0]] + f[2];
            cost = next;
        }
        return cost[dst] == INF ? -1 : cost[dst];
    }

    // BUG: no copy, so one round can chain several flights.
    static int bellmanInPlace(int n, List<int[]> flights, int src, int dst, int k) {
        int[] cost = new int[n];
        Arrays.fill(cost, INF);
        cost[src] = 0;
        for (int r = 0; r <= k; r++)
            for (int[] f : flights)
                if (cost[f[0]] != INF && cost[f[0]] + f[2] < cost[f[1]]) cost[f[1]] = cost[f[0]] + f[2];
        return cost[dst] == INF ? -1 : cost[dst];
    }

    static List<List<int[]>> adjacency(int n, List<int[]> flights) {
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] f : flights) adj.get(f[0]).add(new int[]{f[1], f[2]});
        return adj;
    }

    // Order heap entries {cost, flightsUsed, city} lexicographically.
    static final Comparator<int[]> ORDER = (a, b) -> {
        for (int i = 0; i < 3; i++) if (a[i] != b[i]) return Integer.compare(a[i], b[i]);
        return 0;
    };

    // BUG: marks a city done the first time it is popped, whatever its flight count.
    static int dijkstraNodeVisited(int n, List<int[]> flights, int src, int dst, int k) {
        List<List<int[]>> adj = adjacency(n, flights);
        PriorityQueue<int[]> heap = new PriorityQueue<>(ORDER);
        heap.add(new int[]{0, 0, src});
        boolean[] done = new boolean[n];
        while (!heap.isEmpty()) {
            int[] top = heap.poll();
            int c = top[0], e = top[1], u = top[2];
            if (done[u]) continue;
            done[u] = true;
            if (u == dst) return c;
            if (e == k + 1) continue;
            for (int[] vp : adj.get(u)) if (!done[vp[0]]) heap.add(new int[]{c + vp[1], e + 1, vp[0]});
        }
        return -1;
    }

    // State is (city, flights used); skip a pop that is dominated.
    static int dijkstraStops(int n, List<int[]> flights, int src, int dst, int k) {
        List<List<int[]>> adj = adjacency(n, flights);
        PriorityQueue<int[]> heap = new PriorityQueue<>(ORDER);
        heap.add(new int[]{0, 0, src});
        int[] bestEdges = new int[n];
        Arrays.fill(bestEdges, INF);
        while (!heap.isEmpty()) {
            int[] top = heap.poll();
            int c = top[0], e = top[1], u = top[2];
            if (u == dst) return c;
            if (e >= bestEdges[u]) continue;
            bestEdges[u] = e;
            if (e == k + 1) continue;
            for (int[] vp : adj.get(u)) heap.add(new int[]{c + vp[1], e + 1, vp[0]});
        }
        return -1;
    }

    static int best;

    static void dfs(List<List<int[]>> adj, int u, int c, int e, int dst, int k) {
        if (u == dst) best = Math.min(best, c);
        if (e == k + 1) return;
        for (int[] vp : adj.get(u)) dfs(adj, vp[0], c + vp[1], e + 1, dst, k);
    }

    static int brute(int n, List<int[]> flights, int src, int dst, int k) {
        best = INF;
        dfs(adjacency(n, flights), src, 0, 0, dst, k);
        return best == INF ? -1 : best;
    }

    static long seed = 42;

    static int rnd(int m) {
        seed = seed * 48271 % 2147483647L;
        return (int) (seed % m);
    }

    public static void main(String[] args) {
        List<int[]> f2 = List.of(new int[]{0, 1, 100}, new int[]{1, 2, 100}, new int[]{0, 2, 500});
        System.out.println("graph A, k=0: copy " + bellmanCopy(3, f2, 0, 2, 0) + ", in-place " + bellmanInPlace(3, f2, 0, 2, 0));
        List<int[]> fb = List.of(new int[]{0, 1, 1}, new int[]{1, 2, 1}, new int[]{0, 2, 5}, new int[]{2, 3, 1});
        System.out.println("graph B, k=1: node-visited Dijkstra " + dijkstraNodeVisited(4, fb, 0, 3, 1) + ", stops-aware Dijkstra " + dijkstraStops(4, fb, 0, 3, 1));

        int trials = 1000, agree = 0, wrongInPlace = 0, wrongVisited = 0;
        for (int t = 0; t < trials; t++) {
            int n = 5 + rnd(3);
            List<int[]> flights = new ArrayList<>();
            int m = 8 + rnd(10);
            for (int i = 0; i < m; i++) {
                int u = rnd(n);
                int v = rnd(n);
                int p = 1 + rnd(20);
                if (u != v) flights.add(new int[]{u, v, p});
            }
            int k = 1 + rnd(2);
            int want = brute(n, flights, 0, n - 1, k);
            if (bellmanCopy(n, flights, 0, n - 1, k) == want && dijkstraStops(n, flights, 0, n - 1, k) == want) agree++;
            if (bellmanInPlace(n, flights, 0, n - 1, k) != want) wrongInPlace++;
            if (dijkstraNodeVisited(n, flights, 0, n - 1, k) != want) wrongVisited++;
        }
        System.out.println("random graphs: " + trials + ", copy and stops-aware match brute force on " + agree);
        System.out.println("in-place Bellman-Ford wrong on " + wrongInPlace + ", node-visited Dijkstra wrong on " + wrongVisited);
    }
}` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"There are n cities and a list of one-way flights, each given as {from, to, price} in a \`vector<vector<int>>\`. Given a source, a destination and a number K, find the cheapest price from source to destination with at most K stops, or return -1 if there is no such route. Please code it in C++."

**What a strong answer should cover:**
- Model it as a directed weighted graph and translate "at most K stops" into "at most K + 1 flights".
- Explain why plain Dijkstra is wrong here: a cheaper arrival with more flights can be a dead end, so the state must include the flight count.
- Bounded Bellman-Ford: K + 1 rounds of relaxing every flight, reading last round's prices and writing a copy (\`vector<int> next = cost;\` copies in C++), in O((K + 1) · E) time and O(n) space.
- The alternative Dijkstra over {cost, flights, city} states — noting that \`std::priority_queue\` is a max-heap, so it needs \`greater<>\` to act as a min-heap.
- C++ details: \`INT_MAX + price\` is signed overflow, which is undefined behaviour, so guard before adding; pass the flight list by \`const&\` to avoid copying it.
- Edge cases: source equals destination, unreachable destination, K = 0.

**Clarifying questions expected:**
- Does K stops mean K intermediate cities, so K + 1 flights?
- Are prices always positive, and can the total exceed the int range?

**Code / implementation expected:** Yes — \`int findCheapestPrice(int n, const vector<vector<int>>& flights, int src, int dst, int k)\` in C++17, with bounded Bellman-Ford (or a heap-based state search).`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a \`vector\`, a loop and a function are; graphs and shortest paths are explained as we go.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are booking a trip from Delhi to Lisbon. The booking site shows a wonderful fare: 280 euros. You click it and see the catch — four connections, a night in an airport, and a 6 a.m. hop. You tell the site: *"I will accept at most one layover."* Now the cheapest fare is 410 euros. The answer to "what is the cheapest route?" changed because you added a **limit on the number of stops**.

That is the whole problem. Cities are points, flights are one-way arrows with a price, and you want the cheapest way from a source city to a destination city **using at most K stops** (so at most K + 1 flights). Without the limit, it is the classic cheapest-path problem that [Dijkstra's algorithm](/interview-question/how-does-dijkstra-s-algorithm-work) solves. With the limit, the cheapest way to reach some middle city might use too many flights to be useful, and the algorithms you know need one careful change.

Interviewers like this problem (LeetCode 787, "Cheapest Flights Within K Stops") because it checks whether you understand shortest-path algorithms instead of reciting them: the textbook Dijkstra gives wrong answers here, and the textbook Bellman-Ford gives wrong answers too unless you add one line — a copy of the array. Knowing *why* is what the question is really about.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Does "K stops" mean K intermediate cities, so at most K + 1 flights? | That is the usual reading (LeetCode 787). Getting it wrong is an off-by-one in the number of rounds. |
| Are flights one-way, and can there be two flights between the same pair? | One-way means a directed graph. Duplicates are harmless for the algorithms below, but it is worth knowing. |
| Can a price be zero or negative? | Prices are positive in the standard problem. Bellman-Ford copes with negative prices; Dijkstra does not. |
| What should I return if there is no route? | Usually -1. Also confirm that source equal to destination costs 0. |
| How big are n (cities) and the number of flights? | It decides between the O(K · E) rounds approach and a heap-based search, and whether prices can overflow a 32-bit integer when summed. |
| May a route visit the same city twice? | With positive prices a repeat never helps the cheapest answer, but saying so shows you thought about cycles (the example graph has one). |

## 3. The Core Idea

First, the picture. Each city is a node and each flight is a one-way arrow with a price.

📌 **Interview term: Directed weighted graph** — a set of nodes joined by one-way edges, each edge carrying a number (its weight; here, a price). See [what a graph is and how to represent it](/interview-question/what-is-a-graph-and-how-do-you-represent-it).

📌 **Interview term: Stops vs. edges** — a route with K stops has K intermediate cities and K + 1 flights (edges). Every algorithm below counts edges, so "at most K stops" becomes "at most K + 1 edges".

<svg class="iq-diagram" width="100%" viewBox="0 0 640 330" role="img" aria-label="Four cities. Flights 0 to 1 cost 100, 1 to 2 cost 100, 2 to 0 cost 100, 1 to 3 cost 600 and 2 to 3 cost 200. With at most one stop the cheapest route is 0 to 1 to 3 for 700">
  <defs>
    <marker id="b26q1-a1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge-accent" d="M 112 152 L 268 82" marker-end="url(#b26q1-a1)"/>
  <path class="d-edge" d="M 310 90 L 310 238" marker-end="url(#b26q1-a1)"/>
  <path class="d-edge-dashed" d="M 286 262 L 112 188" marker-end="url(#b26q1-a1)"/>
  <path class="d-edge-accent" d="M 332 78 L 518 152" marker-end="url(#b26q1-a1)"/>
  <path class="d-edge" d="M 332 258 L 518 190" marker-end="url(#b26q1-a1)"/>
  <circle class="d-box" cx="90" cy="170" r="24"/>
  <text class="d-text" x="90" y="175" text-anchor="middle">0</text>
  <circle class="d-box" cx="310" cy="66" r="24"/>
  <text class="d-text" x="310" y="71" text-anchor="middle">1</text>
  <circle class="d-box" cx="310" cy="274" r="24"/>
  <text class="d-text" x="310" y="279" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="540" cy="170" r="24"/>
  <text class="d-text" x="540" y="175" text-anchor="middle">3</text>
  <text class="d-sub" x="170" y="100" text-anchor="middle">100</text>
  <text class="d-sub" x="336" y="170">100</text>
  <text class="d-sub" x="170" y="256" text-anchor="middle">100</text>
  <text class="d-accent" x="450" y="96" text-anchor="middle">600</text>
  <text class="d-sub" x="450" y="250" text-anchor="middle">200</text>
  <text class="d-sub" x="90" y="224" text-anchor="middle">source</text>
  <text class="d-sub" x="540" y="224" text-anchor="middle">destination</text>
</svg>

With **no** limit, the cheapest route from 0 to 3 is 0 → 1 → 2 → 3 for 100 + 100 + 200 = 400. It has **two** stops (cities 1 and 2). With K = 1 it is not allowed, and the best legal route is 0 → 1 → 3 for 700 (the highlighted arrows). Example 1 prints 700 for this input.

### Why plain Dijkstra breaks

[Dijkstra's algorithm](/interview-question/how-does-dijkstra-s-algorithm-work) settles each city the first time it is popped from the priority queue, at its cheapest cost, and never looks at that city again. That is correct when the only thing that matters about reaching a city is the price. Here, a second thing matters: **how many flights it took**. A cheap arrival that used up all your flights is worth less than a pricier arrival with flights to spare.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="City 2 can be reached for 2 using two flights or for 5 using one flight. With at most two flights only the second arrival can continue to city 3, for a total of 6">
  <defs>
    <marker id="b26q1-a2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="120" width="120" height="56" rx="10"/>
  <text class="d-text" x="80" y="144" text-anchor="middle">city 0</text>
  <text class="d-sub" x="80" y="164" text-anchor="middle">cost 0</text>
  <rect class="d-box" x="200" y="20" width="120" height="56" rx="10"/>
  <text class="d-text" x="260" y="44" text-anchor="middle">city 1</text>
  <text class="d-sub" x="260" y="64" text-anchor="middle">1 flight, cost 1</text>
  <rect class="d-box-muted" x="400" y="20" width="140" height="56" rx="10"/>
  <text class="d-text" x="470" y="44" text-anchor="middle">city 2</text>
  <text class="d-sub" x="470" y="64" text-anchor="middle">2 flights, cost 2</text>
  <rect class="d-box" x="400" y="220" width="140" height="56" rx="10"/>
  <text class="d-text" x="470" y="244" text-anchor="middle">city 2</text>
  <text class="d-sub" x="470" y="264" text-anchor="middle">1 flight, cost 5</text>
  <rect class="d-box-accent" x="590" y="220" width="100" height="56" rx="10"/>
  <text class="d-text" x="640" y="244" text-anchor="middle">city 3</text>
  <text class="d-sub" x="640" y="264" text-anchor="middle">cost 6</text>
  <path class="d-edge" d="M 140 136 L 196 64" marker-end="url(#b26q1-a2)"/>
  <path class="d-edge" d="M 320 48 L 396 48" marker-end="url(#b26q1-a2)"/>
  <path class="d-edge" d="M 140 162 L 396 244" marker-end="url(#b26q1-a2)"/>
  <path class="d-edge-accent" d="M 540 248 L 586 248" marker-end="url(#b26q1-a2)"/>
  <text class="d-sub" x="150" y="100" text-anchor="end">price 1</text>
  <text class="d-sub" x="358" y="102" text-anchor="middle">price 1</text>
  <text class="d-sub" x="250" y="230" text-anchor="middle">price 5</text>
  <text class="d-sub" x="470" y="104" text-anchor="middle">dead end: no flights left</text>
</svg>

This is graph B in example 2, with K = 1 (at most 2 flights). City 2 is reached twice: for 2 using two flights (grey, a dead end — no flights left) and for 5 using one flight. A Dijkstra that marks city 2 as finished on its first, cheaper pop throws the second arrival away and answers -1. The real answer is 6. Our run printed exactly that: \`node-visited Dijkstra -1, stops-aware Dijkstra 6\`.

📌 **Interview term: State-space search** — instead of searching over cities, search over *states* that carry everything that matters for the future: here the pair (city, flights used so far). Two arrivals at the same city with different flight counts are different states.

## 4. From Brute Force to K + 1 Rounds

**Brute force.** Try every route of at most K + 1 flights with a depth-first search, and keep the cheapest one that ends at the destination. It is correct, and it is the reference that example 2 checks everything against, but with an average of d flights out of each city it explores up to d^(K+1) routes — exponential in K.

**The key observation.** Let \`cost_r[v]\` be the cheapest price to reach city v using **at most r flights**. Then

- \`cost_0\` is 0 at the source and infinity everywhere else, and
- \`cost_r[v]\` is the smaller of \`cost_(r-1)[v]\` and, over every flight u → v, \`cost_(r-1)[u] + price\`.

Each round extends every best route by at most one flight. After K + 1 rounds, \`cost_(K+1)[dst]\` is the answer. This is exactly [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work), stopped after K + 1 rounds instead of n − 1.

📌 **Interview term: Edge relaxation** — for an edge u → v with price p, "relaxing" it means: if reaching u and then flying to v is cheaper than the best known price for v, record the cheaper price.

📌 **Interview term: Bounded Bellman-Ford** — Bellman-Ford limited to a fixed number of rounds R, which finds the cheapest path using at most R edges. Here R = K + 1.

### The one line that matters: read last round, write this round

The formula reads \`cost_(r-1)\` and writes \`cost_r\`. If you relax in place — one array, read and written in the same round — a price written early in the round can be read later in the **same** round, so one round can chain two, three or more flights. The stop limit is silently ignored.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 290" role="img" aria-label="Graph A. With a copy, round 1 reads only the start array, so city 2 gets 500 from the direct flight. In place, city 1 is set to 100 first and the same round then sets city 2 to 200 through city 1, which is two flights">
  <defs>
    <marker id="b26q1-a3" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="200" height="60" rx="10"/>
  <text class="d-text" x="120" y="46" text-anchor="middle">start: [0, inf, inf]</text>
  <text class="d-sub" x="120" y="66" text-anchor="middle">K = 0, so one round</text>
  <rect class="d-box-accent" x="440" y="20" width="240" height="60" rx="10"/>
  <text class="d-text" x="560" y="46" text-anchor="middle">with copy: [0, 100, 500]</text>
  <text class="d-sub" x="560" y="66" text-anchor="middle">answer 500, correct</text>
  <rect class="d-box" x="440" y="200" width="240" height="60" rx="10"/>
  <text class="d-text" x="560" y="226" text-anchor="middle">in place: [0, 100, 200]</text>
  <text class="d-sub" x="560" y="246" text-anchor="middle">answer 200 uses 2 flights</text>
  <path class="d-edge-accent" d="M 222 50 L 436 50" marker-end="url(#b26q1-a3)"/>
  <path class="d-edge-dashed" d="M 160 82 L 436 222" marker-end="url(#b26q1-a3)"/>
  <text class="d-sub" x="330" y="38" text-anchor="middle">reads only the old array</text>
  <text class="d-sub" x="250" y="190" text-anchor="middle">0 to 1 writes 100, then</text>
  <text class="d-sub" x="250" y="210" text-anchor="middle">1 to 2 reads that 100</text>
</svg>

Graph A is flights 0 → 1 (100), 1 → 2 (100) and 0 → 2 (500), asked from 0 to 2 with K = 0. Only the direct flight is legal, so the answer is 500. Example 2 printed \`copy 500, in-place 200\`. Across 1,000 random graphs, the in-place version was wrong on 44 of them — and right on the other 956, which is why this bug survives casual testing.

Here is the correct version on the four-city graph from section 3 with K = 1 (two rounds):

| After round | cost[0] | cost[1] | cost[2] | cost[3] | What happened |
| :--- | :--- | :--- | :--- | :--- | :--- |
| start | 0 | inf | inf | inf | only the source is reachable |
| 1 (≤ 1 flight) | 0 | 100 | inf | inf | 0 → 1; 1 → 2 reads the *old* cost[1] = inf, so it does nothing yet |
| 2 (≤ 2 flights) | 0 | 100 | 200 | 700 | 1 → 2 gives 200, 1 → 3 gives 700; 2 → 3 still reads the old cost[2] = inf |

\`cost[3]\` is 700. The cheaper 400 route needs a third round, which K = 1 does not allow.

### The other two correct approaches

- **Dijkstra over (city, flights) states.** Push \`(cost, flights, city)\` into a min-heap. When the destination is popped, its cost is the answer. Do not mark a city "done" after its first pop; instead remember the fewest flights with which each city has been popped, and skip a pop that used at least as many — an earlier pop was cheaper *and* used no more flights, so this one can never do better. Example 2 checks this version too.
- **BFS by levels.** Process the frontier one flight at a time (level r = routes of exactly r flights), keeping the best price per city and stopping after K + 1 levels. It is the same idea as the rounds above, organised as a queue; see [when BFS beats Dijkstra](/interview-question/when-would-you-use-bfs-over-dijkstra-for-shortest-paths) for the general trade-off.

📌 **Interview term: Dominated state** — a state that can never lead to a better answer than one already processed (here: same city, higher or equal cost, and at least as many flights). Skipping dominated states is what keeps the state-space Dijkstra fast.

Most interviewers are happy with the bounded Bellman-Ford: it is short, obviously bounded, and its correctness argument fits in one sentence.

## 5. The Code in C++

~~~cpp
// Cheapest price from src to dst using at most k stops (k + 1 flights), or -1.
int findCheapestPrice(int n, const vector<vector<int>>& flights, int src, int dst, int k) {
    vector<int> cost(n, INF);
    cost[src] = 0;
    for (int round = 0; round <= k; round++) {   // round r allows up to r + 1 flights
        vector<int> next = cost;                 // copy: read last round, write this round
        for (const auto& f : flights) {
            int u = f[0], v = f[1], price = f[2];
            // check INF first: INT_MAX + price is signed overflow (undefined behaviour)
            if (cost[u] != INF && cost[u] + price < next[v]) {
                next[v] = cost[u] + price;
            }
        }
        cost = std::move(next);
    }
    return cost[dst] == INF ? -1 : cost[dst];
}
~~~

**What to point out in this code:**

- \`INF = INT_MAX\` stands for "unreachable". In C++, \`INT_MAX + price\` is **signed integer overflow, which is undefined behaviour** — the compiler is allowed to assume it never happens, so the result is not even reliably "a negative number". The \`cost[u] != INF\` check before adding is therefore mandatory. (We did not run the overflowing version: a program with undefined behaviour proves nothing either way.)
- \`vector<int> next = cost;\` **copies** the whole vector — C++ containers have value semantics, unlike Python lists or Java arrays. That copy is the correctness argument: each relaxation reads \`cost\` (last round) and writes \`next\` (this round). Writing \`vector<int>& next = cost;\` (a reference) would bring the in-place bug back.
- \`cost = std::move(next);\` hands \`next\`'s buffer to \`cost\` instead of copying it a second time.
- \`const vector<vector<int>>& flights\` passes the input by reference to const: no copy, and the function promises not to modify it.
- If prices could sum past about 2.1 billion, switch to \`long long\` and \`LLONG_MAX\` with the same guard.

The heap-based alternative, from example 2:

~~~cpp
// std::priority_queue is a max-heap; greater<> turns it into a min-heap.
using MinHeap = priority_queue<State, vector<State>, greater<State>>;

// State is (city, flights used); skip a pop that is dominated.
int dijkstraStops(int n, const Flights& flights, int src, int dst, int k) {
    Adj adj = adjacency(n, flights);
    MinHeap heap;
    heap.push({0, 0, src});
    vector<int> bestEdges(n, INF);
    while (!heap.empty()) {
        auto [c, e, u] = heap.top();
        heap.pop();
        if (u == dst) return c;
        if (e >= bestEdges[u]) continue;
        bestEdges[u] = e;
        if (e == k + 1) continue;
        for (auto [v, p] : adj[u]) heap.push({c + p, e + 1, v});
    }
    return -1;
}
~~~

- \`std::priority_queue\` is a **max-heap** by default: \`top()\` is the largest element. \`greater<State>\` flips it into a min-heap. \`State\` is \`array<int, 3>\` holding {cost, flights, city}, and \`std::array\` compares lexicographically, so the cheapest state comes out first and ties go to fewer flights.
- \`top()\` only reads; \`pop()\` removes and returns nothing. That is why the code calls both. Structured bindings (\`auto [c, e, u] = heap.top();\`) copy the three ints out before the \`pop()\`.
- \`bestEdges[u]\` is the fewest flights with which \`u\` has been popped; a later pop with at least as many flights is dominated and skipped. Returning on the **first** pop of \`dst\` is safe because every later pop costs at least as much.

## 6. Verified: Running the Code

Each example was saved as \`main.cpp\` and run with \`g++ -std=c++17 -O2 main.cpp && ./a.out\` (GCC 13). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — bounded Bellman-Ford on seven inputs** (the four-city graph, graph A with K = 1 and K = 0, an unreachable city, source equal to destination, and the five-city chain with K = 2 and K = 3) prints:

~~~text
700
200
500
-1
0
100
4
~~~

**Example 2 — the two classic bugs, then 1,000 random graphs** checked against the brute-force DFS. The random graphs come from a small seeded generator (\`seed * 48271 % 2147483647\` in \`long long\`), the same arithmetic in all four languages. Note the three separate \`rnd()\` statements in the generator: inside a single expression the evaluation order of function arguments is unspecified in C++, and the ports would draw the numbers in a different order:

~~~text
graph A, k=0: copy 500, in-place 200
graph B, k=1: node-visited Dijkstra -1, stops-aware Dijkstra 6
random graphs: 1000, copy and stops-aware match brute force on 1000
in-place Bellman-Ford wrong on 44, node-visited Dijkstra wrong on 4
~~~

The correct versions matched brute force on all 1,000 graphs. The buggy versions were wrong only on 44 and 4 of them — random tests rarely catch these bugs, which is why you should be able to explain them from first principles.

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute-force DFS | O(d^(K+1)) | O(K) | every route of up to K + 1 flights, d flights per city on average |
| Bounded Bellman-Ford | O((K + 1) · E) | O(n) | K + 1 rounds, each relaxes all E flights; two vectors of n prices |
| Dijkstra over (city, flights) | O(P log P), with P ≤ E · (K + 1) pushes | O(P) | each city is expanded at most K + 2 times (its best flight count only goes down), and each expansion pushes its outgoing flights |

Here n is the number of cities and E the number of flights. Copying \`cost\` every round adds O((K + 1) · n) work — still dominated by the E relaxations when there are more flights than cities. See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read these bounds.

## 8. Edge Cases

- **Source equals destination** — the answer is 0 (no flight needed). Example 1 prints 0 for it.
- **No route at all** — the destination's cost stays infinity after every round; return -1 (example 1, the one-flight graph that never reaches city 2).
- **K = 0** — only direct flights count. Graph A with K = 0 must give 500, not the cheaper two-flight 200.
- **A cheaper route that is too long** — the five-city chain costs 4 with four flights but 100 with one. K = 2 gives 100, K = 3 gives 4 (both in example 1).
- **Cycles** — the four-city graph has the cycle 0 → 1 → 2 → 0. The bounded rounds never loop forever because they stop after K + 1 rounds, and with positive prices a cycle never lowers a price.
- **K larger than n − 2** — no simple route has more than n − 2 stops, so you can cap the number of rounds at n − 1 without changing the answer.

## Common Pitfalls

- **\`INT_MAX + price\`.** Signed overflow is undefined behaviour in C++. Guard with \`cost[u] != INF\`, or use a sentinel such as \`1e9\` that leaves room.
- **Forgetting \`greater<>\`.** A plain \`priority_queue\` pops the *most expensive* state first, and the "first pop of dst" return gives a wrong, too-high answer.
- **Relaxing in place / a reference instead of a copy.** \`vector<int>& next = cost\` aliases the same vector; the copy is what keeps each round to one flight.
- **Copying the input by value.** \`vector<vector<int>> flights\` as a parameter copies every flight on each call; use \`const&\`.
- **A visited-set Dijkstra.** It returned -1 instead of 6 on graph B. The skip rule must compare flight counts.
- **Off-by-one on rounds.** K stops is K + 1 flights, so \`round <= k\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">Cities are nodes, flights are one-way weighted edges, and K stops means at most <strong style="color:#ffca28;">K + 1 flights</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why not Dijkstra:</strong> <span style="color:#f0e2c8;">Plain Dijkstra settles a city on its cheapest arrival, but a cheap arrival that used all the flights is a dead end. The state must be (city, flights used).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Algorithm:</strong> <span style="color:#f0e2c8;">Bounded Bellman-Ford: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;int&gt; cost(n, INT_MAX)</code>, source 0, then K + 1 rounds that relax every flight, reading <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cost</code> and writing a copied <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O((K + 1) × E) time and O(n) space; return -1 if the destination is still <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INF</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">Guard <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cost[u] != INF</code> before adding — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INT_MAX + price</code> is undefined behaviour. For the heap version, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">priority_queue</code> is a max-heap, so pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">greater&lt;&gt;</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does textbook Dijkstra give the wrong answer here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It finalises a city on its first, cheapest pop. With a stop limit, a cheaper arrival that used more flights can be a dead end, while a pricier arrival with flights to spare is the one that reaches the destination. The state has to be (city, flights used).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do you need the copy of the array in each round?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">So that round r only extends routes from round r − 1. In place, a price written early in a round can be read later in the same round, chaining several flights in one round. Our run: graph A with K = 0 gave 200 in place instead of 500.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the complexity, and when would you pick the heap version instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Bounded Bellman-Ford is O((K + 1) × E) time and O(n) space. The heap version can stop as soon as the destination is popped, which helps when the answer is close and the graph is large, but in the worst case it pushes up to E × (K + 1) entries, each costing a log factor.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why array of three ints in the priority_queue rather than a struct?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::array</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::tuple</code> already have lexicographic <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator&lt;</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator&gt;</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">greater&lt;&gt;</code> works with no extra code. A struct is fine too, but then you must write the comparison yourself.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Directed weighted graph** | Nodes joined by one-way edges that each carry a number (a price) |
| **Stops vs. edges** | K stops = K intermediate cities = K + 1 flights |
| **State-space search** | Search over (city, extra facts) pairs instead of cities alone |
| **Edge relaxation** | Lower a node price if going through a neighbour is cheaper |
| **Bounded Bellman-Ford** | Bellman-Ford stopped after R rounds: cheapest path with at most R edges |
| **Dominated state** | A state that cannot beat one already processed, so it is skipped |
| **Undefined behaviour** | Code the C++ standard gives no meaning to, such as signed overflow; the compiler may do anything |
| **\`std::priority_queue\`** | Max-heap adaptor; \`greater<>\` makes it a min-heap; \`top()\` reads, \`pop()\` removes |

Related: [Floyd-Warshall](/interview-question/how-does-the-floyd-warshall-algorithm-work) computes all-pairs cheapest paths but has no notion of a stop limit; [what is a heap / priority queue](/interview-question/what-is-a-heap-priority-queue) explains the structure behind \`std::priority_queue\`.

---
**Conclusion:** The cheapest flight with at most K stops is a cheapest-path problem with one extra fact per route: how many flights it used. In C++ the cleanest answer is bounded Bellman-Ford — K + 1 rounds over the flight list, each reading last round's prices and writing into a copied \`vector<int>\`, with an \`INF\` guard because signed overflow is undefined behaviour — which is O((K + 1) · E) time and O(n) space and matched brute force on all 1,000 random graphs we ran. The two classic mistakes, relaxing in place and a visited-set Dijkstra, are wrong only now and then (44 and 4 graphs out of 1,000), so explain why the copy and the (city, flights) state matter rather than hoping tests catch them.`,
        examples: [
          { label: `Bellman-Ford limited to k + 1 rounds (7 inputs)`, code: `#include <climits>
#include <iostream>
#include <vector>
using namespace std;

const int INF = INT_MAX;

// Cheapest price from src to dst using at most k stops (k + 1 flights), or -1.
int findCheapestPrice(int n, const vector<vector<int>>& flights, int src, int dst, int k) {
    vector<int> cost(n, INF);
    cost[src] = 0;
    for (int round = 0; round <= k; round++) {   // round r allows up to r + 1 flights
        vector<int> next = cost;                 // copy: read last round, write this round
        for (const auto& f : flights) {
            int u = f[0], v = f[1], price = f[2];
            // check INF first: INT_MAX + price is signed overflow (undefined behaviour)
            if (cost[u] != INF && cost[u] + price < next[v]) {
                next[v] = cost[u] + price;
            }
        }
        cost = std::move(next);
    }
    return cost[dst] == INF ? -1 : cost[dst];
}

int main() {
    vector<vector<int>> f1 = {{0, 1, 100}, {1, 2, 100}, {2, 0, 100}, {1, 3, 600}, {2, 3, 200}};
    vector<vector<int>> f2 = {{0, 1, 100}, {1, 2, 100}, {0, 2, 500}};
    vector<vector<int>> chain = {{0, 1, 1}, {1, 2, 1}, {2, 3, 1}, {3, 4, 1}, {0, 4, 100}};

    cout << findCheapestPrice(4, f1, 0, 3, 1) << "\\n";             // 700
    cout << findCheapestPrice(3, f2, 0, 2, 1) << "\\n";             // 200
    cout << findCheapestPrice(3, f2, 0, 2, 0) << "\\n";             // 500
    cout << findCheapestPrice(3, {{0, 1, 100}}, 0, 2, 5) << "\\n";  // -1
    cout << findCheapestPrice(2, {{0, 1, 5}}, 0, 0, 0) << "\\n";    // 0
    cout << findCheapestPrice(5, chain, 0, 4, 2) << "\\n";          // 100
    cout << findCheapestPrice(5, chain, 0, 4, 3) << "\\n";          // 4
    return 0;
}` },
          { label: `Two classic bugs, and a 1,000-graph cross-check against brute force`, code: `#include <algorithm>
#include <array>
#include <climits>
#include <functional>
#include <iostream>
#include <queue>
#include <vector>
using namespace std;

const int INF = INT_MAX;
using Flights = vector<array<int, 3>>;
using Adj = vector<vector<pair<int, int>>>;
using State = array<int, 3>;   // {cost, flights used, city}, compared lexicographically

int bellmanCopy(int n, const Flights& flights, int src, int dst, int k) {
    vector<int> cost(n, INF);
    cost[src] = 0;
    for (int r = 0; r <= k; r++) {
        vector<int> next = cost;
        for (auto [u, v, p] : flights)
            if (cost[u] != INF && cost[u] + p < next[v]) next[v] = cost[u] + p;
        cost = next;
    }
    return cost[dst] == INF ? -1 : cost[dst];
}

// BUG: no copy, so one round can chain several flights.
int bellmanInPlace(int n, const Flights& flights, int src, int dst, int k) {
    vector<int> cost(n, INF);
    cost[src] = 0;
    for (int r = 0; r <= k; r++)
        for (auto [u, v, p] : flights)
            if (cost[u] != INF && cost[u] + p < cost[v]) cost[v] = cost[u] + p;
    return cost[dst] == INF ? -1 : cost[dst];
}

Adj adjacency(int n, const Flights& flights) {
    Adj adj(n);
    for (auto [u, v, p] : flights) adj[u].push_back({v, p});
    return adj;
}

// std::priority_queue is a max-heap; greater<> turns it into a min-heap.
using MinHeap = priority_queue<State, vector<State>, greater<State>>;

// BUG: marks a city done the first time it is popped, whatever its flight count.
int dijkstraNodeVisited(int n, const Flights& flights, int src, int dst, int k) {
    Adj adj = adjacency(n, flights);
    MinHeap heap;
    heap.push({0, 0, src});
    vector<bool> done(n, false);
    while (!heap.empty()) {
        auto [c, e, u] = heap.top();
        heap.pop();
        if (done[u]) continue;
        done[u] = true;
        if (u == dst) return c;
        if (e == k + 1) continue;
        for (auto [v, p] : adj[u]) if (!done[v]) heap.push({c + p, e + 1, v});
    }
    return -1;
}

// State is (city, flights used); skip a pop that is dominated.
int dijkstraStops(int n, const Flights& flights, int src, int dst, int k) {
    Adj adj = adjacency(n, flights);
    MinHeap heap;
    heap.push({0, 0, src});
    vector<int> bestEdges(n, INF);
    while (!heap.empty()) {
        auto [c, e, u] = heap.top();
        heap.pop();
        if (u == dst) return c;
        if (e >= bestEdges[u]) continue;
        bestEdges[u] = e;
        if (e == k + 1) continue;
        for (auto [v, p] : adj[u]) heap.push({c + p, e + 1, v});
    }
    return -1;
}

int brute(int n, const Flights& flights, int src, int dst, int k) {
    Adj adj = adjacency(n, flights);
    int best = INF;
    function<void(int, int, int)> dfs = [&](int u, int c, int e) {
        if (u == dst) best = min(best, c);
        if (e == k + 1) return;
        for (auto [v, p] : adj[u]) dfs(v, c + p, e + 1);
    };
    dfs(src, 0, 0);
    return best == INF ? -1 : best;
}

long long seed = 42;
int rnd(int m) {
    seed = seed * 48271 % 2147483647LL;
    return (int)(seed % m);
}

int main() {
    Flights f2 = {{0, 1, 100}, {1, 2, 100}, {0, 2, 500}};
    cout << "graph A, k=0: copy " << bellmanCopy(3, f2, 0, 2, 0) << ", in-place " << bellmanInPlace(3, f2, 0, 2, 0) << "\\n";
    Flights fb = {{0, 1, 1}, {1, 2, 1}, {0, 2, 5}, {2, 3, 1}};
    cout << "graph B, k=1: node-visited Dijkstra " << dijkstraNodeVisited(4, fb, 0, 3, 1) << ", stops-aware Dijkstra " << dijkstraStops(4, fb, 0, 3, 1) << "\\n";

    int trials = 1000, agree = 0, wrongInPlace = 0, wrongVisited = 0;
    for (int t = 0; t < trials; t++) {
        int n = 5 + rnd(3);
        Flights flights;
        int m = 8 + rnd(10);
        for (int i = 0; i < m; i++) {
            int u = rnd(n);    // separate statements: the order of rnd() calls
            int v = rnd(n);    // inside one expression is unspecified in C++
            int p = 1 + rnd(20);
            if (u != v) flights.push_back({u, v, p});
        }
        int k = 1 + rnd(2);
        int want = brute(n, flights, 0, n - 1, k);
        if (bellmanCopy(n, flights, 0, n - 1, k) == want && dijkstraStops(n, flights, 0, n - 1, k) == want) agree++;
        if (bellmanInPlace(n, flights, 0, n - 1, k) != want) wrongInPlace++;
        if (dijkstraNodeVisited(n, flights, 0, n - 1, k) != want) wrongVisited++;
    }
    cout << "random graphs: " << trials << ", copy and stops-aware match brute force on " << agree << "\\n";
    cout << "in-place Bellman-Ford wrong on " << wrongInPlace << ", node-visited Dijkstra wrong on " << wrongVisited << "\\n";
    return 0;
}` },
        ],
      },
    },
  },
  {
    title: `What is a greedy algorithm?`,
    difficulty: "medium",
    seoDescription: `What a greedy algorithm is, when it is provably optimal, and where it fails (coin change, 0/1 knapsack), with verified Python, JavaScript, Java and C++.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"What is a greedy algorithm? How do you know when a greedy approach gives the optimal answer, and can you show one example where it works and one where it fails — in Python?"

**What a strong answer should cover:**
- A one-sentence definition: build the answer step by step with the locally best choice and never undo a choice.
- The two conditions for correctness — the greedy-choice property and optimal substructure — and the exchange argument used to prove the first.
- A working example, typically interval scheduling by earliest finish time: sort, then one pass, O(n log n).
- A failing example with a concrete counterexample (coin change with \`[1, 3, 4]\` and amount 6, or 0/1 knapsack), and that dynamic programming is the fix.
- Python details: \`sorted(..., key=lambda iv: (iv[1], iv[0]))\` with a tuple key for deterministic ties, Python's sort being stable, and \`functools.cmp_to_key\` when the natural order is a pairwise comparison.
- Testing a greedy rule against a brute force on small inputs before trusting it.

**Code / implementation expected:** Optional — a short Python greedy (interval scheduling or coin change) and its counterexample.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know lists, loops and functions in Python; everything else is explained.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are at a buffet with a small plate, and you want the most delicious meal you can fit. One strategy: look at what is in front of you, take the thing that looks best *right now*, and never put anything back. That strategy is fast — no planning, no regrets — and for some buffets it is perfect. But imagine the best-looking dish is an enormous lasagne that fills the whole plate, and right behind it are three small dishes that together would have been better. Your "take the best thing now" strategy just lost.

That is a **greedy algorithm**: build the answer one step at a time, at each step make the choice that looks best locally, and **never undo a choice**. It is the simplest kind of algorithm to write, and when it works it is usually the fastest — often just a sort and one pass. The catch is the lasagne: for many problems, the locally best choice is not part of the best overall answer.

So the interview question "what is a greedy algorithm?" is really two questions: *what is it*, and *how do you know when it is allowed*. A strong answer defines it in one sentence and then spends its time on the second part — the two properties that make greedy correct, how to prove them with an exchange argument, and the classic problems where greedy is wrong and [dynamic programming](/interview-question/what-is-dynamic-programming) is needed instead.

## 2. The Core Idea

📌 **Interview term: Greedy algorithm** — an algorithm that builds a solution step by step, always making the choice that looks best at that moment (the *locally optimal* choice), and never reconsidering a choice once it is made.

Almost every greedy algorithm has the same shape: decide what "best right now" means (a **greedy rule**, often a sort key), go through the options in that order, and keep each one if it still fits.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 170" role="img" aria-label="The greedy template: sort by the greedy rule, look at the next option, keep it if it still fits, and never undo a kept choice">
  <defs>
    <marker id="b26q2-a1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="10" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="90" y="70" text-anchor="middle">sort by the rule</text>
  <text class="d-sub" x="90" y="92" text-anchor="middle">for example end time</text>
  <rect class="d-box" x="210" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="290" y="70" text-anchor="middle">take next option</text>
  <text class="d-sub" x="290" y="92" text-anchor="middle">in that order</text>
  <rect class="d-box" x="410" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="490" y="70" text-anchor="middle">still fits?</text>
  <text class="d-sub" x="490" y="92" text-anchor="middle">feasibility check</text>
  <rect class="d-box-accent" x="610" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="680" y="70" text-anchor="middle">keep it</text>
  <text class="d-sub" x="680" y="92" text-anchor="middle">never undone</text>
  <path class="d-edge" d="M 172 75 L 206 75" marker-end="url(#b26q2-a1)"/>
  <path class="d-edge" d="M 372 75 L 406 75" marker-end="url(#b26q2-a1)"/>
  <path class="d-edge-accent" d="M 572 75 L 606 75" marker-end="url(#b26q2-a1)"/>
  <path class="d-edge-dashed" d="M 490 112 C 490 150, 290 150, 290 114" marker-end="url(#b26q2-a1)"/>
  <text class="d-sub" x="390" y="160" text-anchor="middle">no: skip it</text>
</svg>

The loop runs once per option, so after the sort the whole algorithm is usually O(n). Compare that with trying every subset of options (2^n of them) or a dynamic-programming table.

### When is greedy correct?

Greedy is correct exactly when two properties hold:

📌 **Interview term: Greedy-choice property** — there is always an optimal solution that contains the greedy (locally best) choice. So committing to it can never lock you out of the best answer.

📌 **Interview term: Optimal substructure** — after the greedy choice is made, what is left is a smaller instance of the same problem, and an optimal answer to it plus the greedy choice is optimal overall. (Dynamic programming needs this property too; greedy additionally needs the first one.)

The usual way to prove the greedy-choice property is an **exchange argument**:

📌 **Interview term: Exchange argument** — take any optimal solution that does *not* use the greedy choice, swap one of its choices for the greedy one, and show the result is still valid and no worse. Then an optimal solution with the greedy choice exists.

And the usual way to *disprove* a greedy rule is a single small input where it loses:

📌 **Interview term: Counterexample** — one concrete input on which the greedy answer is worse than the true optimum. One is enough to kill a greedy rule.

## 3. A Greedy That Works: Interval Scheduling

**Problem.** You have a list of meetings, each with a start and an end time, and one room. Pick as many meetings as possible with no two overlapping. (Intervals are half-open, \`[start, end)\`, so a meeting ending at 3 and one starting at 3 do not clash.)

📌 **Interview term: Interval scheduling (activity selection)** — choose the maximum number of pairwise non-overlapping intervals from a list.

There are three obvious greedy rules: take the meeting that **starts earliest**, the one that is **shortest**, or the one that **ends earliest**. Only one of them is always right. Example 1 runs all three against a brute force that tries all 2^n subsets:

| Input | Earliest start | Shortest | Earliest finish | Brute force (true best) |
| :--- | :--- | :--- | :--- | :--- |
| B: \`[0,10) [1,2) [3,4)\` | 1 (takes the long \`[0,10)\`) | 2 | 2 | 2 |
| C: \`[0,5) [4,7) [6,11)\` | 2 | 1 (takes \`[4,7)\`, which blocks both others) | 2 | 2 |
| D: 11 meetings | 3 | 4 | 4 | 4 |

Earliest start and shortest each have a counterexample (B and C). **Earliest finish** matched the brute force on every input. Here is what it keeps on input D:

<svg class="iq-diagram" width="100%" viewBox="0 0 660 360" role="img" aria-label="Eleven meetings on a time line from 0 to 16, sorted by end time. Earliest finish keeps 1 to 4, 5 to 7, 8 to 11 and 12 to 16, and skips every meeting that overlaps a kept one">
  <rect class="d-box-accent" x="76" y="14" width="108" height="18" rx="4"/>
  <text class="d-sub" x="130" y="27" text-anchor="middle">[1,4) kept</text>
  <rect class="d-box-muted" x="148" y="40" width="72" height="18" rx="4"/>
  <text class="d-sub" x="184" y="53" text-anchor="middle">[3,5)</text>
  <rect class="d-box-muted" x="40" y="66" width="216" height="18" rx="4"/>
  <text class="d-sub" x="148" y="79" text-anchor="middle">[0,6)</text>
  <rect class="d-box-accent" x="220" y="92" width="72" height="18" rx="4"/>
  <text class="d-sub" x="256" y="105" text-anchor="middle">[5,7) kept</text>
  <rect class="d-box-muted" x="148" y="118" width="216" height="18" rx="4"/>
  <text class="d-sub" x="256" y="131" text-anchor="middle">[3,9)</text>
  <rect class="d-box-muted" x="220" y="144" width="144" height="18" rx="4"/>
  <text class="d-sub" x="292" y="157" text-anchor="middle">[5,9)</text>
  <rect class="d-box-muted" x="256" y="170" width="144" height="18" rx="4"/>
  <text class="d-sub" x="328" y="183" text-anchor="middle">[6,10)</text>
  <rect class="d-box-accent" x="328" y="196" width="108" height="18" rx="4"/>
  <text class="d-sub" x="382" y="209" text-anchor="middle">[8,11) kept</text>
  <rect class="d-box-muted" x="328" y="222" width="144" height="18" rx="4"/>
  <text class="d-sub" x="400" y="235" text-anchor="middle">[8,12)</text>
  <rect class="d-box-muted" x="112" y="248" width="432" height="18" rx="4"/>
  <text class="d-sub" x="328" y="261" text-anchor="middle">[2,14)</text>
  <rect class="d-box-accent" x="472" y="274" width="144" height="18" rx="4"/>
  <text class="d-sub" x="544" y="287" text-anchor="middle">[12,16) kept</text>
  <path class="d-edge" d="M 40 316 L 616 316"/>
  <text class="d-sub" x="40" y="340" text-anchor="middle">0</text>
  <text class="d-sub" x="184" y="340" text-anchor="middle">4</text>
  <text class="d-sub" x="328" y="340" text-anchor="middle">8</text>
  <text class="d-sub" x="472" y="340" text-anchor="middle">12</text>
  <text class="d-sub" x="616" y="340" text-anchor="middle">16</text>
</svg>

The meetings are drawn in end-time order, top to bottom. The highlighted ones are kept; every grey one starts before the last kept meeting ends. Example 1 prints the same four: \`[1, 4) [5, 7) [8, 11) [12, 16)\`.

**Why earliest finish is always right (the exchange argument).** Let g be the meeting that ends first. Take any optimal schedule and let f be its first meeting. g ends no later than f (g ends first of all), so replacing f by g cannot create an overlap with the rest of the schedule — everything after f started after f ended, hence after g ended. The new schedule has the same size, so it is still optimal and contains g. That is the greedy-choice property. After choosing g, the remaining problem is "the same problem on the meetings that start at or after g ends" — optimal substructure. Repeat, and greedy is optimal.

The same "sort, then sweep" pattern solves [merging overlapping intervals](/interview-question/how-do-you-merge-overlapping-intervals) and the [minimum number of meeting rooms](/interview-question/how-do-you-find-the-minimum-number-of-meeting-rooms-required).

## 4. Greedy That Fails: Coins and Knapsacks

**Coin change.** "Pay an amount with the fewest coins" has an obvious greedy rule: always take the largest coin that fits. With US-style coins \`[1, 5, 10, 25]\` it is optimal for every amount from 1 to 99 (example 2 checks all of them against a DP). With coins \`[1, 3, 4]\` it fails at 6:

<svg class="iq-diagram" width="100%" viewBox="0 0 620 210" role="img" aria-label="Making 6 from coins 1, 3 and 4. Greedy takes 4, then 1, then 1, which is three coins. The optimum is 3 plus 3, which is two coins">
  <rect class="d-box-muted" x="20" y="20" width="270" height="170" rx="12"/>
  <text class="d-text" x="155" y="50" text-anchor="middle">greedy: largest first</text>
  <circle class="d-box" cx="80" cy="110" r="28"/>
  <text class="d-text" x="80" y="115" text-anchor="middle">4</text>
  <circle class="d-box" cx="155" cy="110" r="28"/>
  <text class="d-text" x="155" y="115" text-anchor="middle">1</text>
  <circle class="d-box" cx="230" cy="110" r="28"/>
  <text class="d-text" x="230" y="115" text-anchor="middle">1</text>
  <text class="d-sub" x="155" y="170" text-anchor="middle">3 coins</text>
  <rect class="d-box-accent" x="330" y="20" width="270" height="170" rx="12"/>
  <text class="d-text" x="465" y="50" text-anchor="middle">optimal</text>
  <circle class="d-box" cx="420" cy="110" r="28"/>
  <text class="d-text" x="420" y="115" text-anchor="middle">3</text>
  <circle class="d-box" cx="510" cy="110" r="28"/>
  <text class="d-text" x="510" y="115" text-anchor="middle">3</text>
  <text class="d-sub" x="465" y="170" text-anchor="middle">2 coins</text>
</svg>

Taking the 4 felt best, but it left 2, which only 1s can pay. The greedy-choice property fails: no optimal way to make 6 uses a 4. Example 2 found that greedy is wrong for 24 of the amounts 1–99 with \`[1, 3, 4]\`, 27 with \`[1, 7, 10]\`, and with \`[2, 5]\` it even reports "impossible" for 6, which is 2 + 2 + 2. The fix is the DP in [the coin change problem](/interview-question/how-do-you-solve-the-coin-change-problem).

**Knapsack.** A bag holds weight 50, and the items are (value 60, weight 10), (100, 20) and (120, 30). The greedy rule "best value per unit of weight first" takes 60 and 100, then:

- if you may take **a fraction** of an item (*fractional knapsack*), you take 20/30 of the last one for 80 more — total **240**, which is optimal;
- if each item is all-or-nothing (*0/1 knapsack*), the last item does not fit, so greedy stops at **160** — but the best is 100 + 120 = **220**.

Same rule, same items: correct for one problem, wrong for the other. Fractions make the exchange argument work (you can always swap a little of a worse item for a little of a better one); whole items break it. Example 3 prints all three numbers. See [the 0/1 knapsack problem](/interview-question/how-do-you-solve-the-0-1-knapsack-problem) for the DP.

## 5. Greedy vs. Dynamic Programming

| | Greedy | Dynamic programming |
| :--- | :--- | :--- |
| Choices | commits to one choice per step, never revisits | considers every choice per step, keeps the best |
| Needs | greedy-choice property **and** optimal substructure | optimal substructure and overlapping subproblems |
| Typical cost | a sort plus one pass, O(n log n) or O(n) | a table, often O(n · W) or O(n²) |
| Proof | exchange argument (or "greedy stays ahead") | the recurrence |
| If you are wrong | silently returns a worse answer | slower, but still correct |

Well-known algorithms that are greedy and provably correct: [Dijkstra's shortest paths](/interview-question/how-does-dijkstra-s-algorithm-work) (always settle the closest unsettled node; needs non-negative weights), [Kruskal's and Prim's minimum spanning trees](/interview-question/what-is-the-difference-between-kruskal-s-and-prim-s-mst-algorithms) (always add the cheapest safe edge), Huffman coding, interval scheduling, [the Jump Game](/interview-question/how-do-you-solve-the-jump-game) and [the Gas Station problem](/interview-question/how-do-you-solve-the-gas-station-problem). [Kadane's maximum subarray](/interview-question/how-do-you-find-the-maximum-subarray-sum) is often described both ways — it is a one-variable DP whose update looks greedy.

📌 **Interview term: Greedy stays ahead** — the other common proof style: show by induction that after every step, the greedy partial solution is at least as good as any other solution's first k steps.

## 6. The Code in Python

The interval-scheduling greedy, taking the greedy rule as a parameter so example 1 can try all three:

~~~python
def greedy_schedule(intervals, key):
    """Sort by the greedy rule, then keep every interval that fits after the last kept one."""
    chosen = []
    last_end = float("-inf")
    for start, end in sorted(intervals, key=lambda iv: (key(iv), iv[0], iv[1])):
        if start >= last_end:                     # half-open: [1, 3) and [3, 5) do not overlap
            chosen.append((start, end))
            last_end = end
    return chosen
~~~

- \`sorted(...)\` returns a **new** list and leaves the input alone; \`list.sort()\` would sort in place and mutate the caller's data. In a helper that is called three times on the same input, that difference matters.
- The key is a **tuple**: \`(key(iv), iv[0], iv[1])\`. Tuples compare element by element, so ties on the greedy rule are broken by start and then end, and the result is deterministic. Python's sort is also guaranteed stable — equal keys keep their original order ([Python Sorting HOWTO](https://docs.python.org/3/howto/sorting.html)) — but an explicit tie-breaker documents the intent and makes the result identical in every language.
- \`float("-inf")\` as the initial \`last_end\` means the first meeting always fits, with no special case.
- \`start >= last_end\` is the half-open overlap test.

The coin-change greedy and the DP that checks it:

~~~python
def greedy_coins(coins, amount):
    """Always take the largest coin that still fits. Returns the coin count, or -1."""
    count = 0
    for c in sorted(coins, reverse=True):
        count += amount // c
        amount %= c
    return count if amount == 0 else -1
~~~

- \`amount // c\` is integer division and \`amount %= c\` keeps the remainder: "take as many of this coin as fit". \`sorted(coins, reverse=True)\` gives the largest coin first.
- The DP in example 2 (\`dp_coins\`) fills \`best[v]\` = fewest coins for value v for every v up to the amount; it is the reference answer. It is O(amount × number of coins), against greedy's O(number of coins) after sorting.

For the knapsack, "best value per weight first" is a comparison between two items, \`v1 / w1\` vs \`v2 / w2\`. Example 3 cross-multiplies (\`v1 * w2\` vs \`v2 * w1\`) to stay in exact integers and turns that comparison into a sort key with \`functools.cmp_to_key\`:

~~~python
def by_ratio(items):
    """Sort (value, weight) pairs by value/weight, best first.
    Compare v1 * w2 with v2 * w1 so no floating point is involved."""
    return sorted(items, key=cmp_to_key(lambda a, b: b[0] * a[1] - a[0] * b[1]))
~~~

Python integers never overflow, so the cross-multiplication is safe for any size; in Java or C++ it would need a 64-bit type.

## 7. Verified: Running the Code

Each example was saved as one file and run with \`python3 main.py\` (Python 3.13). The same three programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — interval scheduling: three greedy rules vs a brute force over all 2^n subsets:**

~~~text
input A: earliest finish 3, earliest start 3, shortest 2, brute force 3
input B: earliest finish 2, earliest start 1, shortest 2, brute force 2
input C: earliest finish 2, earliest start 2, shortest 1, brute force 2
input D: earliest finish 4, earliest start 3, shortest 4, brute force 4
earliest finish on D keeps [1, 4) [5, 7) [8, 11) [12, 16)
~~~

**Example 2 — greedy coin change vs dynamic programming for every amount 1–99:**

~~~text
coins [1, 5, 10, 25]: greedy correct for 99 of 99 amounts
coins [1, 3, 4]: greedy correct for 75 of 99 amounts, first failure 6 (greedy 3, best 2)
coins [1, 7, 10]: greedy correct for 72 of 99 amounts, first failure 14 (greedy 5, best 2)
coins [2, 5]: greedy correct for 61 of 99 amounts, first failure 6 (greedy -1, best 3)
~~~

**Example 3 — the same "value per weight" greedy on the fractional and the 0/1 knapsack:**

~~~text
fractional knapsack, greedy by value/weight: 240.00
0/1 knapsack, same greedy: 160
0/1 knapsack, dynamic programming: 220
~~~

## 8. Complexity

| Algorithm | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Interval scheduling (greedy) | O(n log n) | O(n) | the sort dominates; the sweep is O(n). \`sorted\` makes a new list |
| Interval scheduling (brute force) | O(2^n · n²) | O(n) | every subset, each checked pairwise — fine for 11 meetings, hopeless for 50 |
| Coin change (greedy) | O(c log c) | O(c) | sort c coin types, then one division per type |
| Coin change (DP) | O(amount · c) | O(amount) | one table entry per value, each tries every coin |
| Fractional knapsack (greedy) | O(n log n) | O(n) | sort by ratio, then one pass |
| 0/1 knapsack (DP) | O(n · W) | O(W) | W is the capacity; one row, updated from right to left |

## Edge Cases and Gotchas

- **Ties in the sort key.** Two meetings that end at the same time: either choice is fine for the *count*, but if you print the chosen meetings, fix a tie-breaker (here: start time, then end time) so the output is deterministic.
- **Touching intervals.** With half-open intervals, \`[1, 3)\` and \`[3, 5)\` do not overlap, so the test is \`start >= last_end\`. With closed intervals it would be \`>\`. Ask which one the interviewer means.
- **Empty input.** Zero meetings gives zero; zero coins of any kind for amount 0 is 0 coins.
- **Greedy that "fails to find any answer".** With coins \`[2, 5]\`, greedy takes 5 for amount 6 and is left with 1, so it reports impossible — although 2 + 2 + 2 works. A greedy can be wrong about *feasibility*, not only about optimality.
- **"It worked on the sample" is not a proof.** Greedy coin change passes every sample with US coins. Always test a greedy rule against a brute force on small inputs, as examples 1 and 2 do.

## Common Pitfalls

- **Assuming greedy works because it is intuitive.** Earliest start and shortest-first both sound reasonable; inputs B and C break them. State the rule, then prove it or find a counterexample.
- **Sorting by the wrong key.** \`key=lambda iv: iv[0]\` (start) instead of \`iv[1]\` (end) is the single most common bug in interval scheduling — and it passes many test cases.
- **\`list.sort()\` on the caller's list.** It returns \`None\` and mutates the input; \`intervals = intervals.sort()\` leaves you with \`None\`. Use \`sorted()\` when you need a new list.
- **Floating-point ratios as sort keys.** \`v / w\` works for small inputs, but comparing cross-products keeps it exact; with \`cmp_to_key\` you can sort by any pairwise rule.
- **Greedy coin change for arbitrary coins.** It is only safe for "canonical" coin systems like \`[1, 5, 10, 25]\`; for anything else, use DP.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A greedy algorithm builds the answer one step at a time, always takes the <strong style="color:#ffca28;">locally best</strong> choice, and never undoes it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. When it is correct:</strong> <span style="color:#f0e2c8;">When the greedy-choice property (some optimal answer contains the greedy choice) and optimal substructure both hold.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Proof:</strong> <span style="color:#f0e2c8;">Use an exchange argument: swap an optimal solution's first choice for the greedy one and show it is still valid and no worse.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Example:</strong> <span style="color:#f0e2c8;">Interval scheduling by earliest finish: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted(meetings, key=lambda m: (m[1], m[0]))</code>, then keep each one with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">start &gt;= last_end</code>. O(n log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Counterexample:</strong> <span style="color:#f0e2c8;">Coins <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 3, 4]</code>, amount 6: greedy 4 + 1 + 1, optimal 3 + 3. When greedy breaks, use dynamic programming.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you prove a greedy algorithm is correct?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Show the greedy-choice property with an exchange argument — take any optimal solution, swap its first choice for the greedy one, and show it stays valid and no worse — and show optimal substructure, so you can repeat the argument on what is left.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Give an example where greedy fails.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Coin change with coins 1, 3 and 4 for amount 6: greedy takes 4 + 1 + 1 (three coins), but 3 + 3 is two. Our check found 24 failing amounts out of 1 to 99 for that coin set. The fix is dynamic programming.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is greedy different from dynamic programming?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Greedy commits to one choice per step and never revisits it; DP evaluates every choice per step and keeps the best, using a table of subproblem answers. DP is correct whenever optimal substructure holds; greedy additionally needs the greedy-choice property.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is Dijkstra a greedy algorithm?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. It always settles the unsettled node with the smallest known distance, and the exchange-style proof works only because edge weights are non-negative. With a negative edge the greedy choice can be wrong, which is why Bellman-Ford exists.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">In Python, how do you sort by a rule that compares two items, like value per weight?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either use a float key (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">key=lambda it: it[0] / it[1]</code>), or keep it exact with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">functools.cmp_to_key</code> and a comparison that cross-multiplies. Python integers never overflow, so the cross-product is always safe.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Greedy algorithm** | Build the answer step by step with the locally best choice, never undoing one |
| **Greedy-choice property** | Some optimal solution contains the greedy choice |
| **Optimal substructure** | After a choice, the rest is a smaller copy of the same problem |
| **Exchange argument** | Swap a choice in an optimal solution for the greedy one without making it worse |
| **Counterexample** | One input where the greedy answer is worse than the optimum |
| **Interval scheduling (activity selection)** | Pick the most non-overlapping intervals; earliest finish first is optimal |
| **Greedy stays ahead** | Proof that greedy is at least as good as any solution after every step |
| **\`functools.cmp_to_key\`** | Turns a two-argument comparison function into a key for \`sorted\` |

---
**Conclusion:** A greedy algorithm makes the locally best choice at each step and never looks back, which makes it short and fast — often a sort and one pass in Python. It is only correct when the greedy-choice property and optimal substructure hold, and the exchange argument is how you show it: earliest-finish interval scheduling matched a brute force on every input we ran, while earliest-start and shortest-first each had a counterexample, greedy coin change was wrong for 24 of 99 amounts with coins \`[1, 3, 4]\`, and the value-per-weight rule gave 240 (optimal) on the fractional knapsack but 160 instead of 220 on the 0/1 one. Say the rule, prove it or break it, and reach for dynamic programming when it breaks.`,
        examples: [
          { label: `Interval scheduling: three greedy rules vs brute force`, code: `def greedy_schedule(intervals, key):
    """Sort by the greedy rule, then keep every interval that fits after the last kept one."""
    chosen = []
    last_end = float("-inf")
    for start, end in sorted(intervals, key=lambda iv: (key(iv), iv[0], iv[1])):
        if start >= last_end:                     # half-open: [1, 3) and [3, 5) do not overlap
            chosen.append((start, end))
            last_end = end
    return chosen


def fits(chosen, iv):
    return all(iv[0] >= c[1] or c[0] >= iv[1] for c in chosen)


def brute_force(intervals):
    """Try every subset (2^n of them) and keep the largest non-overlapping one."""
    best = 0
    n = len(intervals)
    for mask in range(1 << n):
        chosen = []
        ok = True
        for i in range(n):
            if mask >> i & 1:
                if not fits(chosen, intervals[i]):
                    ok = False
                    break
                chosen.append(intervals[i])
        if ok:
            best = max(best, len(chosen))
    return best


rules = [
    ("earliest finish", lambda iv: iv[1]),
    ("earliest start", lambda iv: iv[0]),
    ("shortest", lambda iv: iv[1] - iv[0]),
]
inputs = [
    ("A", [(1, 3), (2, 5), (4, 7), (6, 9), (8, 10)]),
    ("B", [(0, 10), (1, 2), (3, 4)]),
    ("C", [(0, 5), (4, 7), (6, 11)]),
    ("D", [(1, 4), (3, 5), (0, 6), (5, 7), (3, 9), (5, 9), (6, 10), (8, 11), (8, 12), (2, 14), (12, 16)]),
]
for name, intervals in inputs:
    parts = [rule + " " + str(len(greedy_schedule(intervals, key))) for rule, key in rules]
    print("input " + name + ": " + ", ".join(parts) + ", brute force " + str(brute_force(intervals)))

picked = greedy_schedule(inputs[3][1], rules[0][1])
print("earliest finish on D keeps " + " ".join("[" + str(s) + ", " + str(e) + ")" for s, e in picked))` },
          { label: `Greedy coin change vs dynamic programming`, code: `def greedy_coins(coins, amount):
    """Always take the largest coin that still fits. Returns the coin count, or -1."""
    count = 0
    for c in sorted(coins, reverse=True):
        count += amount // c
        amount %= c
    return count if amount == 0 else -1


def dp_coins(coins, amount):
    """Fewest coins for every value 0..amount (dynamic programming)."""
    INF = float("inf")
    best = [0] + [INF] * amount
    for v in range(1, amount + 1):
        for c in coins:
            if c <= v and best[v - c] + 1 < best[v]:
                best[v] = best[v - c] + 1
    return -1 if best[amount] == INF else best[amount]


def report(coins):
    wrong = [a for a in range(1, 100) if greedy_coins(coins, a) != dp_coins(coins, a)]
    line = "coins " + str(coins) + ": greedy correct for " + str(99 - len(wrong)) + " of 99 amounts"
    if wrong:
        a = wrong[0]
        line += ", first failure " + str(a) + " (greedy " + str(greedy_coins(coins, a)) + ", best " + str(dp_coins(coins, a)) + ")"
    print(line)


report([1, 5, 10, 25])
report([1, 3, 4])
report([1, 7, 10])
report([2, 5])` },
          { label: `Fractional vs 0/1 knapsack: same greedy, different verdict`, code: `from functools import cmp_to_key


def by_ratio(items):
    """Sort (value, weight) pairs by value/weight, best first.
    Compare v1 * w2 with v2 * w1 so no floating point is involved."""
    return sorted(items, key=cmp_to_key(lambda a, b: b[0] * a[1] - a[0] * b[1]))


def fractional_greedy(items, capacity):
    total = 0.0
    for value, weight in by_ratio(items):
        take = min(weight, capacity)
        total += value * take / weight          # a fraction of an item is allowed
        capacity -= take
        if capacity == 0:
            break
    return total


def zero_one_greedy(items, capacity):
    total = 0
    for value, weight in by_ratio(items):
        if weight <= capacity:                  # whole item or nothing
            total += value
            capacity -= weight
    return total


def zero_one_dp(items, capacity):
    best = [0] * (capacity + 1)
    for value, weight in items:
        for c in range(capacity, weight - 1, -1):
            best[c] = max(best[c], best[c - weight] + value)
    return best[capacity]


items = [(60, 10), (100, 20), (120, 30)]
print("fractional knapsack, greedy by value/weight: " + format(fractional_greedy(items, 50), ".2f"))  # fractional knapsack, greedy by value/weight: 240.00
print("0/1 knapsack, same greedy: " + str(zero_one_greedy(items, 50)))  # 0/1 knapsack, same greedy: 160
print("0/1 knapsack, dynamic programming: " + str(zero_one_dp(items, 50)))  # 0/1 knapsack, dynamic programming: 220` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"What is a greedy algorithm? How do you know when a greedy approach gives the optimal answer, and can you show one example where it works and one where it fails — in JavaScript?"

**What a strong answer should cover:**
- A one-sentence definition: build the answer step by step with the locally best choice and never undo a choice.
- The two conditions for correctness — the greedy-choice property and optimal substructure — and the exchange argument used to prove the first.
- A working example, typically interval scheduling by earliest finish time: sort, then one pass, O(n log n).
- A failing example with a concrete counterexample (coin change with \`[1, 3, 4]\` and amount 6, or 0/1 knapsack), and that dynamic programming is the fix.
- JavaScript details: \`Array.prototype.sort\` sorts in place and compares as strings unless you pass a comparator; chain tie-breakers with \`||\`; copy with \`slice()\` first if the caller's array must not change.
- Testing a greedy rule against a brute force on small inputs before trusting it.

**Code / implementation expected:** Optional — a short JavaScript greedy (interval scheduling or coin change) and its counterexample.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays, loops and functions in JavaScript; everything else is explained.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are at a buffet with a small plate, and you want the most delicious meal you can fit. One strategy: look at what is in front of you, take the thing that looks best *right now*, and never put anything back. That strategy is fast — no planning, no regrets — and for some buffets it is perfect. But imagine the best-looking dish is an enormous lasagne that fills the whole plate, and right behind it are three small dishes that together would have been better. Your "take the best thing now" strategy just lost.

That is a **greedy algorithm**: build the answer one step at a time, at each step make the choice that looks best locally, and **never undo a choice**. It is the simplest kind of algorithm to write, and when it works it is usually the fastest — often just a sort and one pass. The catch is the lasagne: for many problems, the locally best choice is not part of the best overall answer.

So the interview question "what is a greedy algorithm?" is really two questions: *what is it*, and *how do you know when it is allowed*. A strong answer defines it in one sentence and then spends its time on the second part — the two properties that make greedy correct, how to prove them with an exchange argument, and the classic problems where greedy is wrong and [dynamic programming](/interview-question/what-is-dynamic-programming) is needed instead.

## 2. The Core Idea

📌 **Interview term: Greedy algorithm** — an algorithm that builds a solution step by step, always making the choice that looks best at that moment (the *locally optimal* choice), and never reconsidering a choice once it is made.

Almost every greedy algorithm has the same shape: decide what "best right now" means (a **greedy rule**, often a sort key), go through the options in that order, and keep each one if it still fits.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 170" role="img" aria-label="The greedy template: sort by the greedy rule, look at the next option, keep it if it still fits, and never undo a kept choice">
  <defs>
    <marker id="b26q2-a1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="10" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="90" y="70" text-anchor="middle">sort by the rule</text>
  <text class="d-sub" x="90" y="92" text-anchor="middle">for example end time</text>
  <rect class="d-box" x="210" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="290" y="70" text-anchor="middle">take next option</text>
  <text class="d-sub" x="290" y="92" text-anchor="middle">in that order</text>
  <rect class="d-box" x="410" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="490" y="70" text-anchor="middle">still fits?</text>
  <text class="d-sub" x="490" y="92" text-anchor="middle">feasibility check</text>
  <rect class="d-box-accent" x="610" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="680" y="70" text-anchor="middle">keep it</text>
  <text class="d-sub" x="680" y="92" text-anchor="middle">never undone</text>
  <path class="d-edge" d="M 172 75 L 206 75" marker-end="url(#b26q2-a1)"/>
  <path class="d-edge" d="M 372 75 L 406 75" marker-end="url(#b26q2-a1)"/>
  <path class="d-edge-accent" d="M 572 75 L 606 75" marker-end="url(#b26q2-a1)"/>
  <path class="d-edge-dashed" d="M 490 112 C 490 150, 290 150, 290 114" marker-end="url(#b26q2-a1)"/>
  <text class="d-sub" x="390" y="160" text-anchor="middle">no: skip it</text>
</svg>

The loop runs once per option, so after the sort the whole algorithm is usually O(n). Compare that with trying every subset of options (2^n of them) or a dynamic-programming table.

### When is greedy correct?

Greedy is correct exactly when two properties hold:

📌 **Interview term: Greedy-choice property** — there is always an optimal solution that contains the greedy (locally best) choice. So committing to it can never lock you out of the best answer.

📌 **Interview term: Optimal substructure** — after the greedy choice is made, what is left is a smaller instance of the same problem, and an optimal answer to it plus the greedy choice is optimal overall. (Dynamic programming needs this property too; greedy additionally needs the first one.)

The usual way to prove the greedy-choice property is an **exchange argument**:

📌 **Interview term: Exchange argument** — take any optimal solution that does *not* use the greedy choice, swap one of its choices for the greedy one, and show the result is still valid and no worse. Then an optimal solution with the greedy choice exists.

And the usual way to *disprove* a greedy rule is a single small input where it loses:

📌 **Interview term: Counterexample** — one concrete input on which the greedy answer is worse than the true optimum. One is enough to kill a greedy rule.

## 3. A Greedy That Works: Interval Scheduling

**Problem.** You have a list of meetings, each with a start and an end time, and one room. Pick as many meetings as possible with no two overlapping. (Intervals are half-open, \`[start, end)\`, so a meeting ending at 3 and one starting at 3 do not clash.)

📌 **Interview term: Interval scheduling (activity selection)** — choose the maximum number of pairwise non-overlapping intervals from a list.

There are three obvious greedy rules: take the meeting that **starts earliest**, the one that is **shortest**, or the one that **ends earliest**. Only one of them is always right. Example 1 runs all three against a brute force that tries all 2^n subsets:

| Input | Earliest start | Shortest | Earliest finish | Brute force (true best) |
| :--- | :--- | :--- | :--- | :--- |
| B: \`[0,10) [1,2) [3,4)\` | 1 (takes the long \`[0,10)\`) | 2 | 2 | 2 |
| C: \`[0,5) [4,7) [6,11)\` | 2 | 1 (takes \`[4,7)\`, which blocks both others) | 2 | 2 |
| D: 11 meetings | 3 | 4 | 4 | 4 |

Earliest start and shortest each have a counterexample (B and C). **Earliest finish** matched the brute force on every input. Here is what it keeps on input D:

<svg class="iq-diagram" width="100%" viewBox="0 0 660 360" role="img" aria-label="Eleven meetings on a time line from 0 to 16, sorted by end time. Earliest finish keeps 1 to 4, 5 to 7, 8 to 11 and 12 to 16, and skips every meeting that overlaps a kept one">
  <rect class="d-box-accent" x="76" y="14" width="108" height="18" rx="4"/>
  <text class="d-sub" x="130" y="27" text-anchor="middle">[1,4) kept</text>
  <rect class="d-box-muted" x="148" y="40" width="72" height="18" rx="4"/>
  <text class="d-sub" x="184" y="53" text-anchor="middle">[3,5)</text>
  <rect class="d-box-muted" x="40" y="66" width="216" height="18" rx="4"/>
  <text class="d-sub" x="148" y="79" text-anchor="middle">[0,6)</text>
  <rect class="d-box-accent" x="220" y="92" width="72" height="18" rx="4"/>
  <text class="d-sub" x="256" y="105" text-anchor="middle">[5,7) kept</text>
  <rect class="d-box-muted" x="148" y="118" width="216" height="18" rx="4"/>
  <text class="d-sub" x="256" y="131" text-anchor="middle">[3,9)</text>
  <rect class="d-box-muted" x="220" y="144" width="144" height="18" rx="4"/>
  <text class="d-sub" x="292" y="157" text-anchor="middle">[5,9)</text>
  <rect class="d-box-muted" x="256" y="170" width="144" height="18" rx="4"/>
  <text class="d-sub" x="328" y="183" text-anchor="middle">[6,10)</text>
  <rect class="d-box-accent" x="328" y="196" width="108" height="18" rx="4"/>
  <text class="d-sub" x="382" y="209" text-anchor="middle">[8,11) kept</text>
  <rect class="d-box-muted" x="328" y="222" width="144" height="18" rx="4"/>
  <text class="d-sub" x="400" y="235" text-anchor="middle">[8,12)</text>
  <rect class="d-box-muted" x="112" y="248" width="432" height="18" rx="4"/>
  <text class="d-sub" x="328" y="261" text-anchor="middle">[2,14)</text>
  <rect class="d-box-accent" x="472" y="274" width="144" height="18" rx="4"/>
  <text class="d-sub" x="544" y="287" text-anchor="middle">[12,16) kept</text>
  <path class="d-edge" d="M 40 316 L 616 316"/>
  <text class="d-sub" x="40" y="340" text-anchor="middle">0</text>
  <text class="d-sub" x="184" y="340" text-anchor="middle">4</text>
  <text class="d-sub" x="328" y="340" text-anchor="middle">8</text>
  <text class="d-sub" x="472" y="340" text-anchor="middle">12</text>
  <text class="d-sub" x="616" y="340" text-anchor="middle">16</text>
</svg>

The meetings are drawn in end-time order, top to bottom. The highlighted ones are kept; every grey one starts before the last kept meeting ends. Example 1 prints the same four: \`[1, 4) [5, 7) [8, 11) [12, 16)\`.

**Why earliest finish is always right (the exchange argument).** Let g be the meeting that ends first. Take any optimal schedule and let f be its first meeting. g ends no later than f (g ends first of all), so replacing f by g cannot create an overlap with the rest of the schedule — everything after f started after f ended, hence after g ended. The new schedule has the same size, so it is still optimal and contains g. That is the greedy-choice property. After choosing g, the remaining problem is "the same problem on the meetings that start at or after g ends" — optimal substructure. Repeat, and greedy is optimal.

The same "sort, then sweep" pattern solves [merging overlapping intervals](/interview-question/how-do-you-merge-overlapping-intervals) and the [minimum number of meeting rooms](/interview-question/how-do-you-find-the-minimum-number-of-meeting-rooms-required).

## 4. Greedy That Fails: Coins and Knapsacks

**Coin change.** "Pay an amount with the fewest coins" has an obvious greedy rule: always take the largest coin that fits. With US-style coins \`[1, 5, 10, 25]\` it is optimal for every amount from 1 to 99 (example 2 checks all of them against a DP). With coins \`[1, 3, 4]\` it fails at 6:

<svg class="iq-diagram" width="100%" viewBox="0 0 620 210" role="img" aria-label="Making 6 from coins 1, 3 and 4. Greedy takes 4, then 1, then 1, which is three coins. The optimum is 3 plus 3, which is two coins">
  <rect class="d-box-muted" x="20" y="20" width="270" height="170" rx="12"/>
  <text class="d-text" x="155" y="50" text-anchor="middle">greedy: largest first</text>
  <circle class="d-box" cx="80" cy="110" r="28"/>
  <text class="d-text" x="80" y="115" text-anchor="middle">4</text>
  <circle class="d-box" cx="155" cy="110" r="28"/>
  <text class="d-text" x="155" y="115" text-anchor="middle">1</text>
  <circle class="d-box" cx="230" cy="110" r="28"/>
  <text class="d-text" x="230" y="115" text-anchor="middle">1</text>
  <text class="d-sub" x="155" y="170" text-anchor="middle">3 coins</text>
  <rect class="d-box-accent" x="330" y="20" width="270" height="170" rx="12"/>
  <text class="d-text" x="465" y="50" text-anchor="middle">optimal</text>
  <circle class="d-box" cx="420" cy="110" r="28"/>
  <text class="d-text" x="420" y="115" text-anchor="middle">3</text>
  <circle class="d-box" cx="510" cy="110" r="28"/>
  <text class="d-text" x="510" y="115" text-anchor="middle">3</text>
  <text class="d-sub" x="465" y="170" text-anchor="middle">2 coins</text>
</svg>

Taking the 4 felt best, but it left 2, which only 1s can pay. The greedy-choice property fails: no optimal way to make 6 uses a 4. Example 2 found that greedy is wrong for 24 of the amounts 1–99 with \`[1, 3, 4]\`, 27 with \`[1, 7, 10]\`, and with \`[2, 5]\` it even reports "impossible" for 6, which is 2 + 2 + 2. The fix is the DP in [the coin change problem](/interview-question/how-do-you-solve-the-coin-change-problem).

**Knapsack.** A bag holds weight 50, and the items are (value 60, weight 10), (100, 20) and (120, 30). The greedy rule "best value per unit of weight first" takes 60 and 100, then:

- if you may take **a fraction** of an item (*fractional knapsack*), you take 20/30 of the last one for 80 more — total **240**, which is optimal;
- if each item is all-or-nothing (*0/1 knapsack*), the last item does not fit, so greedy stops at **160** — but the best is 100 + 120 = **220**.

Same rule, same items: correct for one problem, wrong for the other. Fractions make the exchange argument work (you can always swap a little of a worse item for a little of a better one); whole items break it. Example 3 prints all three numbers. See [the 0/1 knapsack problem](/interview-question/how-do-you-solve-the-0-1-knapsack-problem) for the DP.

## 5. Greedy vs. Dynamic Programming

| | Greedy | Dynamic programming |
| :--- | :--- | :--- |
| Choices | commits to one choice per step, never revisits | considers every choice per step, keeps the best |
| Needs | greedy-choice property **and** optimal substructure | optimal substructure and overlapping subproblems |
| Typical cost | a sort plus one pass, O(n log n) or O(n) | a table, often O(n · W) or O(n²) |
| Proof | exchange argument (or "greedy stays ahead") | the recurrence |
| If you are wrong | silently returns a worse answer | slower, but still correct |

Well-known algorithms that are greedy and provably correct: [Dijkstra's shortest paths](/interview-question/how-does-dijkstra-s-algorithm-work) (always settle the closest unsettled node; needs non-negative weights), [Kruskal's and Prim's minimum spanning trees](/interview-question/what-is-the-difference-between-kruskal-s-and-prim-s-mst-algorithms) (always add the cheapest safe edge), Huffman coding, interval scheduling, [the Jump Game](/interview-question/how-do-you-solve-the-jump-game) and [the Gas Station problem](/interview-question/how-do-you-solve-the-gas-station-problem). [Kadane's maximum subarray](/interview-question/how-do-you-find-the-maximum-subarray-sum) is often described both ways — it is a one-variable DP whose update looks greedy.

📌 **Interview term: Greedy stays ahead** — the other common proof style: show by induction that after every step, the greedy partial solution is at least as good as any other solution's first k steps.

## 6. The Code in JavaScript

The interval-scheduling greedy, taking the greedy rule as a parameter so example 1 can try all three:

~~~javascript
function greedySchedule(intervals, key) {
  // Sort by the greedy rule (ties by start, then end), then keep every interval
  // that starts at or after the end of the last kept one.
  const sorted = intervals.slice().sort((a, b) => key(a) - key(b) || a[0] - b[0] || a[1] - b[1]);
  const chosen = [];
  let lastEnd = -Infinity;
  for (const [start, end] of sorted) {
    if (start >= lastEnd) {            // half-open: [1, 3) and [3, 5) do not overlap
      chosen.push([start, end]);
      lastEnd = end;
    }
  }
  return chosen;
}
~~~

- \`Array.prototype.sort\` **sorts in place** and returns the same array. \`intervals.slice().sort(...)\` sorts a copy, so the caller's array is untouched — important here because the same input is sorted three ways.
- Without a comparator, \`sort\` converts elements to strings and compares those: \`[10, 9, 1].sort()\` gave \`[1, 10, 9]\` in our run. Always pass \`(a, b) => ...\` returning a negative, zero or positive number.
- \`key(a) - key(b) || a[0] - b[0] || a[1] - b[1]\` chains tie-breakers: \`||\` moves on to the next comparison only when the previous one is \`0\`. Since ES2019 the specification also requires \`sort\` to be stable ([V8: stable \`Array.prototype.sort\`](https://v8.dev/features/stable-sort)), but an explicit tie-breaker documents the intent and gives the same result in every language.
- \`-Infinity\` as the initial \`lastEnd\` means the first meeting always fits.

The coin-change greedy:

~~~javascript
function greedyCoins(coins, amount) {
  // Always take the largest coin that still fits. Returns the coin count, or -1.
  let count = 0;
  for (const c of coins.slice().sort((a, b) => b - a)) {   // numeric comparator, not the default string sort
    count += Math.floor(amount / c);
    amount %= c;
  }
  return amount === 0 ? count : -1;
}
~~~

- \`coins.slice().sort((a, b) => b - a)\` is largest first — and again a copy, so the caller's coin list keeps its order.
- \`Math.floor(amount / c)\` is the integer division; \`/\` alone would give a fraction such as \`1.2\`.
- The DP in example 2 (\`dpCoins\`) fills \`best[v]\` = fewest coins for value v for every v up to the amount and is the reference answer.

For the knapsack, "best value per weight first" compares two items. Example 3 cross-multiplies to stay exact:

~~~javascript
function byRatio(items) {
  // Sort [value, weight] pairs by value/weight, best first.
  // Compare v1 * w2 with v2 * w1 so no floating point is involved.
  return items.slice().sort((a, b) => b[0] * a[1] - a[0] * b[1]);
}
~~~

The comparator returns \`b.value × a.weight − a.value × b.weight\`: negative when \`a\` has the better ratio. The products are exact as long as they stay below \`Number.MAX_SAFE_INTEGER\` (about 9 × 10^15); for bigger values use \`BigInt\` or plain division.

## 7. Verified: Running the Code

Each example was saved as one file and run with \`node main.js\` (Node 22); they use only \`console.log\`, so they also run in a browser. The same three programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — interval scheduling: three greedy rules vs a brute force over all 2^n subsets:**

~~~text
input A: earliest finish 3, earliest start 3, shortest 2, brute force 3
input B: earliest finish 2, earliest start 1, shortest 2, brute force 2
input C: earliest finish 2, earliest start 2, shortest 1, brute force 2
input D: earliest finish 4, earliest start 3, shortest 4, brute force 4
earliest finish on D keeps [1, 4) [5, 7) [8, 11) [12, 16)
~~~

**Example 2 — greedy coin change vs dynamic programming for every amount 1–99:**

~~~text
coins [1, 5, 10, 25]: greedy correct for 99 of 99 amounts
coins [1, 3, 4]: greedy correct for 75 of 99 amounts, first failure 6 (greedy 3, best 2)
coins [1, 7, 10]: greedy correct for 72 of 99 amounts, first failure 14 (greedy 5, best 2)
coins [2, 5]: greedy correct for 61 of 99 amounts, first failure 6 (greedy -1, best 3)
~~~

**Example 3 — the same "value per weight" greedy on the fractional and the 0/1 knapsack** (\`toFixed(2)\` prints the fractional total with two decimals):

~~~text
fractional knapsack, greedy by value/weight: 240.00
0/1 knapsack, same greedy: 160
0/1 knapsack, dynamic programming: 220
~~~

## 8. Complexity

| Algorithm | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Interval scheduling (greedy) | O(n log n) | O(n) | the sort dominates; the sweep is O(n); \`slice()\` copies the input |
| Interval scheduling (brute force) | O(2^n · n²) | O(n) | every subset, each checked pairwise — fine for 11 meetings, hopeless for 50 |
| Coin change (greedy) | O(c log c) | O(c) | sort c coin types, then one division per type |
| Coin change (DP) | O(amount · c) | O(amount) | one table entry per value, each tries every coin |
| Fractional knapsack (greedy) | O(n log n) | O(n) | sort by ratio, then one pass |
| 0/1 knapsack (DP) | O(n · W) | O(W) | W is the capacity; one row, updated from right to left |

## Edge Cases and Gotchas

- **Ties in the sort key.** Two meetings that end at the same time: either choice is fine for the *count*, but if you print the chosen meetings, fix a tie-breaker (here: start time, then end time) so the output is deterministic.
- **Touching intervals.** With half-open intervals, \`[1, 3)\` and \`[3, 5)\` do not overlap, so the test is \`start >= last_end\`. With closed intervals it would be \`>\`. Ask which one the interviewer means.
- **Empty input.** Zero meetings gives zero; zero coins of any kind for amount 0 is 0 coins.
- **Greedy that "fails to find any answer".** With coins \`[2, 5]\`, greedy takes 5 for amount 6 and is left with 1, so it reports impossible — although 2 + 2 + 2 works. A greedy can be wrong about *feasibility*, not only about optimality.
- **"It worked on the sample" is not a proof.** Greedy coin change passes every sample with US coins. Always test a greedy rule against a brute force on small inputs, as examples 1 and 2 do.

## Common Pitfalls

- **Assuming greedy works because it is intuitive.** Earliest start and shortest-first both sound reasonable; inputs B and C break them.
- **Sorting without a comparator.** The default sort is by string, so numbers like 10 and 9 come out in the wrong order.
- **Sorting the caller's array.** \`sort\` mutates in place; copy with \`slice()\` (or use \`toSorted()\` where your runtime supports it).
- **A comparator that returns a boolean.** \`(a, b) => a[1] > b[1]\` returns \`true\`/\`false\`, which \`sort\` reads as 1/0 and never as "less than": in our run \`[5, 1, 4, 2, 3].sort((a, b) => a > b)\` came back unchanged. Return a number.
- **Greedy coin change for arbitrary coins.** It is only safe for "canonical" coin systems like \`[1, 5, 10, 25]\`; otherwise use DP.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A greedy algorithm builds the answer one step at a time, always takes the <strong style="color:#ffca28;">locally best</strong> choice, and never undoes it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. When it is correct:</strong> <span style="color:#f0e2c8;">When the greedy-choice property (some optimal answer contains the greedy choice) and optimal substructure both hold.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Proof:</strong> <span style="color:#f0e2c8;">Use an exchange argument: swap an optimal solution's first choice for the greedy one and show it is still valid and no worse.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Example:</strong> <span style="color:#f0e2c8;">Interval scheduling by earliest finish: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">meetings.slice().sort((a, b) =&gt; a[1] - b[1] || a[0] - b[0])</code>, then keep each one with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">start &gt;= lastEnd</code>. O(n log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Counterexample:</strong> <span style="color:#f0e2c8;">Coins <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 3, 4]</code>, amount 6: greedy 4 + 1 + 1, optimal 3 + 3. When greedy breaks, use dynamic programming.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you prove a greedy algorithm is correct?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Show the greedy-choice property with an exchange argument — take any optimal solution, swap its first choice for the greedy one, and show it stays valid and no worse — and show optimal substructure, so you can repeat the argument on what is left.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Give an example where greedy fails.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Coin change with coins 1, 3 and 4 for amount 6: greedy takes 4 + 1 + 1 (three coins), but 3 + 3 is two. Our check found 24 failing amounts out of 1 to 99 for that coin set. The fix is dynamic programming.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is greedy different from dynamic programming?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Greedy commits to one choice per step and never revisits it; DP evaluates every choice per step and keeps the best, using a table of subproblem answers. DP is correct whenever optimal substructure holds; greedy additionally needs the greedy-choice property.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is Dijkstra a greedy algorithm?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. It always settles the unsettled node with the smallest known distance, and the exchange-style proof works only because edge weights are non-negative. With a negative edge the greedy choice can be wrong, which is why Bellman-Ford exists.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What goes wrong if you call sort() with no comparator on numbers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">JavaScript compares the elements as strings, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[10, 9, 1].sort()</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 10, 9]</code>. A greedy that relies on sorted order then makes the wrong choices. Always pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a, b) =&gt; a - b</code> or a key-based comparator.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Greedy algorithm** | Build the answer step by step with the locally best choice, never undoing one |
| **Greedy-choice property** | Some optimal solution contains the greedy choice |
| **Optimal substructure** | After a choice, the rest is a smaller copy of the same problem |
| **Exchange argument** | Swap a choice in an optimal solution for the greedy one without making it worse |
| **Counterexample** | One input where the greedy answer is worse than the optimum |
| **Interval scheduling (activity selection)** | Pick the most non-overlapping intervals; earliest finish first is optimal |
| **Greedy stays ahead** | Proof that greedy is at least as good as any solution after every step |
| **Comparator** | A function \`(a, b) => number\` telling \`sort\` whether a goes before b (negative), after (positive) or ties (0) |

---
**Conclusion:** A greedy algorithm makes the locally best choice at each step and never looks back, which makes it short and fast — usually a \`slice().sort(comparator)\` and one loop in JavaScript. It is only correct when the greedy-choice property and optimal substructure hold, and the exchange argument is how you show it: earliest-finish interval scheduling matched a brute force on every input we ran, while earliest-start and shortest-first each had a counterexample, greedy coin change was wrong for 24 of 99 amounts with coins \`[1, 3, 4]\`, and the value-per-weight rule gave 240 (optimal) on the fractional knapsack but 160 instead of 220 on the 0/1 one. Say the rule, prove it or break it, and reach for dynamic programming when it breaks.`,
        examples: [
          { label: `Interval scheduling: three greedy rules vs brute force`, code: `function greedySchedule(intervals, key) {
  // Sort by the greedy rule (ties by start, then end), then keep every interval
  // that starts at or after the end of the last kept one.
  const sorted = intervals.slice().sort((a, b) => key(a) - key(b) || a[0] - b[0] || a[1] - b[1]);
  const chosen = [];
  let lastEnd = -Infinity;
  for (const [start, end] of sorted) {
    if (start >= lastEnd) {            // half-open: [1, 3) and [3, 5) do not overlap
      chosen.push([start, end]);
      lastEnd = end;
    }
  }
  return chosen;
}

function fits(chosen, iv) {
  return chosen.every((c) => iv[0] >= c[1] || c[0] >= iv[1]);
}

function bruteForce(intervals) {
  // Try every subset (2^n of them) and keep the largest non-overlapping one.
  let best = 0;
  const n = intervals.length;
  for (let mask = 0; mask < (1 << n); mask++) {
    const chosen = [];
    let ok = true;
    for (let i = 0; i < n; i++) {
      if ((mask >> i) & 1) {
        if (!fits(chosen, intervals[i])) { ok = false; break; }
        chosen.push(intervals[i]);
      }
    }
    if (ok) best = Math.max(best, chosen.length);
  }
  return best;
}

const rules = [
  ["earliest finish", (iv) => iv[1]],
  ["earliest start", (iv) => iv[0]],
  ["shortest", (iv) => iv[1] - iv[0]],
];
const inputs = [
  ["A", [[1, 3], [2, 5], [4, 7], [6, 9], [8, 10]]],
  ["B", [[0, 10], [1, 2], [3, 4]]],
  ["C", [[0, 5], [4, 7], [6, 11]]],
  ["D", [[1, 4], [3, 5], [0, 6], [5, 7], [3, 9], [5, 9], [6, 10], [8, 11], [8, 12], [2, 14], [12, 16]]],
];
for (const [name, intervals] of inputs) {
  const parts = rules.map(([rule, key]) => rule + " " + greedySchedule(intervals, key).length);
  console.log("input " + name + ": " + parts.join(", ") + ", brute force " + bruteForce(intervals));
}

const picked = greedySchedule(inputs[3][1], rules[0][1]);
console.log("earliest finish on D keeps " + picked.map(([s, e]) => "[" + s + ", " + e + ")").join(" "));` },
          { label: `Greedy coin change vs dynamic programming`, code: `function greedyCoins(coins, amount) {
  // Always take the largest coin that still fits. Returns the coin count, or -1.
  let count = 0;
  for (const c of coins.slice().sort((a, b) => b - a)) {   // numeric comparator, not the default string sort
    count += Math.floor(amount / c);
    amount %= c;
  }
  return amount === 0 ? count : -1;
}

function dpCoins(coins, amount) {
  // Fewest coins for every value 0..amount (dynamic programming).
  const best = new Array(amount + 1).fill(Infinity);
  best[0] = 0;
  for (let v = 1; v <= amount; v++) {
    for (const c of coins) {
      if (c <= v && best[v - c] + 1 < best[v]) best[v] = best[v - c] + 1;
    }
  }
  return best[amount] === Infinity ? -1 : best[amount];
}

function report(coins) {
  const wrong = [];
  for (let a = 1; a < 100; a++) if (greedyCoins(coins, a) !== dpCoins(coins, a)) wrong.push(a);
  let line = "coins [" + coins.join(", ") + "]: greedy correct for " + (99 - wrong.length) + " of 99 amounts";
  if (wrong.length > 0) {
    const a = wrong[0];
    line += ", first failure " + a + " (greedy " + greedyCoins(coins, a) + ", best " + dpCoins(coins, a) + ")";
  }
  console.log(line);
}

report([1, 5, 10, 25]);
report([1, 3, 4]);
report([1, 7, 10]);
report([2, 5]);` },
          { label: `Fractional vs 0/1 knapsack: same greedy, different verdict`, code: `function byRatio(items) {
  // Sort [value, weight] pairs by value/weight, best first.
  // Compare v1 * w2 with v2 * w1 so no floating point is involved.
  return items.slice().sort((a, b) => b[0] * a[1] - a[0] * b[1]);
}

function fractionalGreedy(items, capacity) {
  let total = 0;
  for (const [value, weight] of byRatio(items)) {
    const take = Math.min(weight, capacity);
    total += (value * take) / weight;   // a fraction of an item is allowed
    capacity -= take;
    if (capacity === 0) break;
  }
  return total;
}

function zeroOneGreedy(items, capacity) {
  let total = 0;
  for (const [value, weight] of byRatio(items)) {
    if (weight <= capacity) {           // whole item or nothing
      total += value;
      capacity -= weight;
    }
  }
  return total;
}

function zeroOneDp(items, capacity) {
  const best = new Array(capacity + 1).fill(0);
  for (const [value, weight] of items) {
    for (let c = capacity; c >= weight; c--) best[c] = Math.max(best[c], best[c - weight] + value);
  }
  return best[capacity];
}

const items = [[60, 10], [100, 20], [120, 30]];
console.log("fractional knapsack, greedy by value/weight: " + fractionalGreedy(items, 50).toFixed(2)); // fractional knapsack, greedy by value/weight: 240.00
console.log("0/1 knapsack, same greedy: " + zeroOneGreedy(items, 50)); // 0/1 knapsack, same greedy: 160
console.log("0/1 knapsack, dynamic programming: " + zeroOneDp(items, 50)); // 0/1 knapsack, dynamic programming: 220` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"What is a greedy algorithm? How do you know when a greedy approach gives the optimal answer, and can you show one example where it works and one where it fails — in Java?"

**What a strong answer should cover:**
- A one-sentence definition: build the answer step by step with the locally best choice and never undo a choice.
- The two conditions for correctness — the greedy-choice property and optimal substructure — and the exchange argument used to prove the first.
- A working example, typically interval scheduling by earliest finish time: sort, then one pass, O(n log n).
- A failing example with a concrete counterexample (coin change with \`[1, 3, 4]\` and amount 6, or 0/1 knapsack), and that dynamic programming is the fix.
- Java details: \`Arrays.sort(int[][], Comparator)\` with \`Comparator.comparingInt(...).thenComparingInt(...)\`, \`Integer.compare\` / \`Long.compare\` instead of subtraction, and cross-multiplying ratios in \`long\` to avoid overflow.
- Testing a greedy rule against a brute force on small inputs before trusting it.

**Code / implementation expected:** Optional — a short Java greedy (interval scheduling or coin change) and its counterexample.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays, loops and static methods in Java; everything else is explained.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are at a buffet with a small plate, and you want the most delicious meal you can fit. One strategy: look at what is in front of you, take the thing that looks best *right now*, and never put anything back. That strategy is fast — no planning, no regrets — and for some buffets it is perfect. But imagine the best-looking dish is an enormous lasagne that fills the whole plate, and right behind it are three small dishes that together would have been better. Your "take the best thing now" strategy just lost.

That is a **greedy algorithm**: build the answer one step at a time, at each step make the choice that looks best locally, and **never undo a choice**. It is the simplest kind of algorithm to write, and when it works it is usually the fastest — often just a sort and one pass. The catch is the lasagne: for many problems, the locally best choice is not part of the best overall answer.

So the interview question "what is a greedy algorithm?" is really two questions: *what is it*, and *how do you know when it is allowed*. A strong answer defines it in one sentence and then spends its time on the second part — the two properties that make greedy correct, how to prove them with an exchange argument, and the classic problems where greedy is wrong and [dynamic programming](/interview-question/what-is-dynamic-programming) is needed instead.

## 2. The Core Idea

📌 **Interview term: Greedy algorithm** — an algorithm that builds a solution step by step, always making the choice that looks best at that moment (the *locally optimal* choice), and never reconsidering a choice once it is made.

Almost every greedy algorithm has the same shape: decide what "best right now" means (a **greedy rule**, often a sort key), go through the options in that order, and keep each one if it still fits.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 170" role="img" aria-label="The greedy template: sort by the greedy rule, look at the next option, keep it if it still fits, and never undo a kept choice">
  <defs>
    <marker id="b26q2-a1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="10" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="90" y="70" text-anchor="middle">sort by the rule</text>
  <text class="d-sub" x="90" y="92" text-anchor="middle">for example end time</text>
  <rect class="d-box" x="210" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="290" y="70" text-anchor="middle">take next option</text>
  <text class="d-sub" x="290" y="92" text-anchor="middle">in that order</text>
  <rect class="d-box" x="410" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="490" y="70" text-anchor="middle">still fits?</text>
  <text class="d-sub" x="490" y="92" text-anchor="middle">feasibility check</text>
  <rect class="d-box-accent" x="610" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="680" y="70" text-anchor="middle">keep it</text>
  <text class="d-sub" x="680" y="92" text-anchor="middle">never undone</text>
  <path class="d-edge" d="M 172 75 L 206 75" marker-end="url(#b26q2-a1)"/>
  <path class="d-edge" d="M 372 75 L 406 75" marker-end="url(#b26q2-a1)"/>
  <path class="d-edge-accent" d="M 572 75 L 606 75" marker-end="url(#b26q2-a1)"/>
  <path class="d-edge-dashed" d="M 490 112 C 490 150, 290 150, 290 114" marker-end="url(#b26q2-a1)"/>
  <text class="d-sub" x="390" y="160" text-anchor="middle">no: skip it</text>
</svg>

The loop runs once per option, so after the sort the whole algorithm is usually O(n). Compare that with trying every subset of options (2^n of them) or a dynamic-programming table.

### When is greedy correct?

Greedy is correct exactly when two properties hold:

📌 **Interview term: Greedy-choice property** — there is always an optimal solution that contains the greedy (locally best) choice. So committing to it can never lock you out of the best answer.

📌 **Interview term: Optimal substructure** — after the greedy choice is made, what is left is a smaller instance of the same problem, and an optimal answer to it plus the greedy choice is optimal overall. (Dynamic programming needs this property too; greedy additionally needs the first one.)

The usual way to prove the greedy-choice property is an **exchange argument**:

📌 **Interview term: Exchange argument** — take any optimal solution that does *not* use the greedy choice, swap one of its choices for the greedy one, and show the result is still valid and no worse. Then an optimal solution with the greedy choice exists.

And the usual way to *disprove* a greedy rule is a single small input where it loses:

📌 **Interview term: Counterexample** — one concrete input on which the greedy answer is worse than the true optimum. One is enough to kill a greedy rule.

## 3. A Greedy That Works: Interval Scheduling

**Problem.** You have a list of meetings, each with a start and an end time, and one room. Pick as many meetings as possible with no two overlapping. (Intervals are half-open, \`[start, end)\`, so a meeting ending at 3 and one starting at 3 do not clash.)

📌 **Interview term: Interval scheduling (activity selection)** — choose the maximum number of pairwise non-overlapping intervals from a list.

There are three obvious greedy rules: take the meeting that **starts earliest**, the one that is **shortest**, or the one that **ends earliest**. Only one of them is always right. Example 1 runs all three against a brute force that tries all 2^n subsets:

| Input | Earliest start | Shortest | Earliest finish | Brute force (true best) |
| :--- | :--- | :--- | :--- | :--- |
| B: \`[0,10) [1,2) [3,4)\` | 1 (takes the long \`[0,10)\`) | 2 | 2 | 2 |
| C: \`[0,5) [4,7) [6,11)\` | 2 | 1 (takes \`[4,7)\`, which blocks both others) | 2 | 2 |
| D: 11 meetings | 3 | 4 | 4 | 4 |

Earliest start and shortest each have a counterexample (B and C). **Earliest finish** matched the brute force on every input. Here is what it keeps on input D:

<svg class="iq-diagram" width="100%" viewBox="0 0 660 360" role="img" aria-label="Eleven meetings on a time line from 0 to 16, sorted by end time. Earliest finish keeps 1 to 4, 5 to 7, 8 to 11 and 12 to 16, and skips every meeting that overlaps a kept one">
  <rect class="d-box-accent" x="76" y="14" width="108" height="18" rx="4"/>
  <text class="d-sub" x="130" y="27" text-anchor="middle">[1,4) kept</text>
  <rect class="d-box-muted" x="148" y="40" width="72" height="18" rx="4"/>
  <text class="d-sub" x="184" y="53" text-anchor="middle">[3,5)</text>
  <rect class="d-box-muted" x="40" y="66" width="216" height="18" rx="4"/>
  <text class="d-sub" x="148" y="79" text-anchor="middle">[0,6)</text>
  <rect class="d-box-accent" x="220" y="92" width="72" height="18" rx="4"/>
  <text class="d-sub" x="256" y="105" text-anchor="middle">[5,7) kept</text>
  <rect class="d-box-muted" x="148" y="118" width="216" height="18" rx="4"/>
  <text class="d-sub" x="256" y="131" text-anchor="middle">[3,9)</text>
  <rect class="d-box-muted" x="220" y="144" width="144" height="18" rx="4"/>
  <text class="d-sub" x="292" y="157" text-anchor="middle">[5,9)</text>
  <rect class="d-box-muted" x="256" y="170" width="144" height="18" rx="4"/>
  <text class="d-sub" x="328" y="183" text-anchor="middle">[6,10)</text>
  <rect class="d-box-accent" x="328" y="196" width="108" height="18" rx="4"/>
  <text class="d-sub" x="382" y="209" text-anchor="middle">[8,11) kept</text>
  <rect class="d-box-muted" x="328" y="222" width="144" height="18" rx="4"/>
  <text class="d-sub" x="400" y="235" text-anchor="middle">[8,12)</text>
  <rect class="d-box-muted" x="112" y="248" width="432" height="18" rx="4"/>
  <text class="d-sub" x="328" y="261" text-anchor="middle">[2,14)</text>
  <rect class="d-box-accent" x="472" y="274" width="144" height="18" rx="4"/>
  <text class="d-sub" x="544" y="287" text-anchor="middle">[12,16) kept</text>
  <path class="d-edge" d="M 40 316 L 616 316"/>
  <text class="d-sub" x="40" y="340" text-anchor="middle">0</text>
  <text class="d-sub" x="184" y="340" text-anchor="middle">4</text>
  <text class="d-sub" x="328" y="340" text-anchor="middle">8</text>
  <text class="d-sub" x="472" y="340" text-anchor="middle">12</text>
  <text class="d-sub" x="616" y="340" text-anchor="middle">16</text>
</svg>

The meetings are drawn in end-time order, top to bottom. The highlighted ones are kept; every grey one starts before the last kept meeting ends. Example 1 prints the same four: \`[1, 4) [5, 7) [8, 11) [12, 16)\`.

**Why earliest finish is always right (the exchange argument).** Let g be the meeting that ends first. Take any optimal schedule and let f be its first meeting. g ends no later than f (g ends first of all), so replacing f by g cannot create an overlap with the rest of the schedule — everything after f started after f ended, hence after g ended. The new schedule has the same size, so it is still optimal and contains g. That is the greedy-choice property. After choosing g, the remaining problem is "the same problem on the meetings that start at or after g ends" — optimal substructure. Repeat, and greedy is optimal.

The same "sort, then sweep" pattern solves [merging overlapping intervals](/interview-question/how-do-you-merge-overlapping-intervals) and the [minimum number of meeting rooms](/interview-question/how-do-you-find-the-minimum-number-of-meeting-rooms-required).

## 4. Greedy That Fails: Coins and Knapsacks

**Coin change.** "Pay an amount with the fewest coins" has an obvious greedy rule: always take the largest coin that fits. With US-style coins \`[1, 5, 10, 25]\` it is optimal for every amount from 1 to 99 (example 2 checks all of them against a DP). With coins \`[1, 3, 4]\` it fails at 6:

<svg class="iq-diagram" width="100%" viewBox="0 0 620 210" role="img" aria-label="Making 6 from coins 1, 3 and 4. Greedy takes 4, then 1, then 1, which is three coins. The optimum is 3 plus 3, which is two coins">
  <rect class="d-box-muted" x="20" y="20" width="270" height="170" rx="12"/>
  <text class="d-text" x="155" y="50" text-anchor="middle">greedy: largest first</text>
  <circle class="d-box" cx="80" cy="110" r="28"/>
  <text class="d-text" x="80" y="115" text-anchor="middle">4</text>
  <circle class="d-box" cx="155" cy="110" r="28"/>
  <text class="d-text" x="155" y="115" text-anchor="middle">1</text>
  <circle class="d-box" cx="230" cy="110" r="28"/>
  <text class="d-text" x="230" y="115" text-anchor="middle">1</text>
  <text class="d-sub" x="155" y="170" text-anchor="middle">3 coins</text>
  <rect class="d-box-accent" x="330" y="20" width="270" height="170" rx="12"/>
  <text class="d-text" x="465" y="50" text-anchor="middle">optimal</text>
  <circle class="d-box" cx="420" cy="110" r="28"/>
  <text class="d-text" x="420" y="115" text-anchor="middle">3</text>
  <circle class="d-box" cx="510" cy="110" r="28"/>
  <text class="d-text" x="510" y="115" text-anchor="middle">3</text>
  <text class="d-sub" x="465" y="170" text-anchor="middle">2 coins</text>
</svg>

Taking the 4 felt best, but it left 2, which only 1s can pay. The greedy-choice property fails: no optimal way to make 6 uses a 4. Example 2 found that greedy is wrong for 24 of the amounts 1–99 with \`[1, 3, 4]\`, 27 with \`[1, 7, 10]\`, and with \`[2, 5]\` it even reports "impossible" for 6, which is 2 + 2 + 2. The fix is the DP in [the coin change problem](/interview-question/how-do-you-solve-the-coin-change-problem).

**Knapsack.** A bag holds weight 50, and the items are (value 60, weight 10), (100, 20) and (120, 30). The greedy rule "best value per unit of weight first" takes 60 and 100, then:

- if you may take **a fraction** of an item (*fractional knapsack*), you take 20/30 of the last one for 80 more — total **240**, which is optimal;
- if each item is all-or-nothing (*0/1 knapsack*), the last item does not fit, so greedy stops at **160** — but the best is 100 + 120 = **220**.

Same rule, same items: correct for one problem, wrong for the other. Fractions make the exchange argument work (you can always swap a little of a worse item for a little of a better one); whole items break it. Example 3 prints all three numbers. See [the 0/1 knapsack problem](/interview-question/how-do-you-solve-the-0-1-knapsack-problem) for the DP.

## 5. Greedy vs. Dynamic Programming

| | Greedy | Dynamic programming |
| :--- | :--- | :--- |
| Choices | commits to one choice per step, never revisits | considers every choice per step, keeps the best |
| Needs | greedy-choice property **and** optimal substructure | optimal substructure and overlapping subproblems |
| Typical cost | a sort plus one pass, O(n log n) or O(n) | a table, often O(n · W) or O(n²) |
| Proof | exchange argument (or "greedy stays ahead") | the recurrence |
| If you are wrong | silently returns a worse answer | slower, but still correct |

Well-known algorithms that are greedy and provably correct: [Dijkstra's shortest paths](/interview-question/how-does-dijkstra-s-algorithm-work) (always settle the closest unsettled node; needs non-negative weights), [Kruskal's and Prim's minimum spanning trees](/interview-question/what-is-the-difference-between-kruskal-s-and-prim-s-mst-algorithms) (always add the cheapest safe edge), Huffman coding, interval scheduling, [the Jump Game](/interview-question/how-do-you-solve-the-jump-game) and [the Gas Station problem](/interview-question/how-do-you-solve-the-gas-station-problem). [Kadane's maximum subarray](/interview-question/how-do-you-find-the-maximum-subarray-sum) is often described both ways — it is a one-variable DP whose update looks greedy.

📌 **Interview term: Greedy stays ahead** — the other common proof style: show by induction that after every step, the greedy partial solution is at least as good as any other solution's first k steps.

## 6. The Code in Java

The interval-scheduling greedy, taking the greedy rule as a \`ToIntFunction<int[]>\` so example 1 can try all three:

~~~java
// Sort by the greedy rule (ties by start, then end), then keep every interval
// that starts at or after the end of the last kept one.
static List<int[]> greedySchedule(int[][] intervals, ToIntFunction<int[]> key) {
    int[][] sorted = intervals.clone();
    Arrays.sort(sorted, Comparator.comparingInt(key)
            .thenComparingInt((int[] iv) -> iv[0])
            .thenComparingInt((int[] iv) -> iv[1]));
    List<int[]> chosen = new ArrayList<>();
    long lastEnd = Long.MIN_VALUE;
    for (int[] iv : sorted) {
        if (iv[0] >= lastEnd) {             // half-open: [1, 3) and [3, 5) do not overlap
            chosen.add(iv);
            lastEnd = iv[1];
        }
    }
    return chosen;
}
~~~

- \`intervals.clone()\` copies the outer array (the inner \`int[]\` rows are shared, which is fine because nothing modifies them), so sorting does not reorder the caller's input.
- \`Comparator.comparingInt(key).thenComparingInt(...)\` builds "sort by the greedy rule, then by start, then by end" without writing a comparator by hand. The explicit lambda parameter type \`(int[] iv) ->\` is needed because Java cannot infer it inside the chain.
- \`Arrays.sort\` on an array of objects (here \`int[][]\`) is documented as stable — equal elements keep their order ([Java 17 \`Arrays.sort(T[], Comparator)\`](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Arrays.html)). The explicit tie-breakers make the result deterministic regardless, and identical in every language.
- \`lastEnd\` starts at \`Long.MIN_VALUE\` so the first meeting always fits; it is a \`long\` so the comparison with an \`int\` start can never overflow.

The coin-change greedy:

~~~java
// Always take the largest coin that still fits. Returns the coin count, or -1.
static int greedyCoins(int[] coins, int amount) {
    int[] sorted = coins.clone();
    Arrays.sort(sorted);                       // ascending, so walk it backwards
    int count = 0;
    for (int i = sorted.length - 1; i >= 0; i--) {
        count += amount / sorted[i];
        amount %= sorted[i];
    }
    return amount == 0 ? count : -1;
}
~~~

- \`Arrays.sort(int[])\` sorts primitives ascending and has no comparator overload, so the loop walks it from the end to get the largest coin first. (Sorting descending with a comparator would need an \`Integer[]\`, with boxing.)
- \`amount / c\` on two \`int\`s is integer division; \`amount %= c\` keeps the remainder.
- The DP (\`dpCoins\`) guards \`best[v - c] != INF\` before adding 1, because \`Integer.MAX_VALUE + 1\` wraps to a negative number in Java.

For the knapsack, "best value per weight first" compares two items. Example 3 cross-multiplies in \`long\`:

~~~java
// Sort {value, weight} pairs by value/weight, best first.
// Compare v1 * w2 with v2 * w1 (as long) so no floating point is involved.
static int[][] byRatio(int[][] items) {
    int[][] sorted = items.clone();
    Arrays.sort(sorted, (a, b) -> Long.compare((long) b[0] * a[1], (long) a[0] * b[1]));
    return sorted;
}
~~~

\`(long) b[0] * a[1]\` casts **before** multiplying; \`(long) (b[0] * a[1])\` would multiply in \`int\`, overflow, and only then widen. When printing the fractional total, \`String.format(Locale.ROOT, "%.2f", x)\` is used because \`String.format\` without a locale follows the machine's default locale, and some locales write a decimal comma (\`240,00\`).

## 7. Verified: Running the Code

Each example was saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21). The same three programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — interval scheduling: three greedy rules vs a brute force over all 2^n subsets:**

~~~text
input A: earliest finish 3, earliest start 3, shortest 2, brute force 3
input B: earliest finish 2, earliest start 1, shortest 2, brute force 2
input C: earliest finish 2, earliest start 2, shortest 1, brute force 2
input D: earliest finish 4, earliest start 3, shortest 4, brute force 4
earliest finish on D keeps [1, 4) [5, 7) [8, 11) [12, 16)
~~~

**Example 2 — greedy coin change vs dynamic programming for every amount 1–99:**

~~~text
coins [1, 5, 10, 25]: greedy correct for 99 of 99 amounts
coins [1, 3, 4]: greedy correct for 75 of 99 amounts, first failure 6 (greedy 3, best 2)
coins [1, 7, 10]: greedy correct for 72 of 99 amounts, first failure 14 (greedy 5, best 2)
coins [2, 5]: greedy correct for 61 of 99 amounts, first failure 6 (greedy -1, best 3)
~~~

**Example 3 — the same "value per weight" greedy on the fractional and the 0/1 knapsack:**

~~~text
fractional knapsack, greedy by value/weight: 240.00
0/1 knapsack, same greedy: 160
0/1 knapsack, dynamic programming: 220
~~~

## 8. Complexity

| Algorithm | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Interval scheduling (greedy) | O(n log n) | O(n) | the sort dominates; the sweep is O(n) |
| Interval scheduling (brute force) | O(2^n · n²) | O(n) | every subset, each checked pairwise — fine for 11 meetings, hopeless for 50 |
| Coin change (greedy) | O(c log c) | O(c) | sort c coin types, then one division per type |
| Coin change (DP) | O(amount · c) | O(amount) | one table entry per value, each tries every coin |
| Fractional knapsack (greedy) | O(n log n) | O(n) | sort by ratio, then one pass |
| 0/1 knapsack (DP) | O(n · W) | O(W) | W is the capacity; one row, updated from right to left |

## Edge Cases and Gotchas

- **Ties in the sort key.** Two meetings that end at the same time: either choice is fine for the *count*, but if you print the chosen meetings, fix a tie-breaker (here: start time, then end time) so the output is deterministic.
- **Touching intervals.** With half-open intervals, \`[1, 3)\` and \`[3, 5)\` do not overlap, so the test is \`start >= last_end\`. With closed intervals it would be \`>\`. Ask which one the interviewer means.
- **Empty input.** Zero meetings gives zero; zero coins of any kind for amount 0 is 0 coins.
- **Greedy that "fails to find any answer".** With coins \`[2, 5]\`, greedy takes 5 for amount 6 and is left with 1, so it reports impossible — although 2 + 2 + 2 works. A greedy can be wrong about *feasibility*, not only about optimality.
- **"It worked on the sample" is not a proof.** Greedy coin change passes every sample with US coins. Always test a greedy rule against a brute force on small inputs, as examples 1 and 2 do.

## Common Pitfalls

- **Assuming greedy works because it is intuitive.** Earliest start and shortest-first both sound reasonable; inputs B and C break them.
- **Comparator by subtraction.** \`(a, b) -> a[1] - b[1]\` overflows when values are near the \`int\` limits and silently flips the order; use \`Integer.compare\` or \`Comparator.comparingInt\`.
- **Overflow in ratio comparisons.** Cross-multiply in \`long\`, and cast before the multiplication.
- **Sorting the caller's array.** \`Arrays.sort\` is in place; \`clone()\` first if the input must stay as it was.
- **Greedy coin change for arbitrary coins.** It is only safe for "canonical" coin systems like \`[1, 5, 10, 25]\`; otherwise use DP.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A greedy algorithm builds the answer one step at a time, always takes the <strong style="color:#ffca28;">locally best</strong> choice, and never undoes it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. When it is correct:</strong> <span style="color:#f0e2c8;">When the greedy-choice property (some optimal answer contains the greedy choice) and optimal substructure both hold.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Proof:</strong> <span style="color:#f0e2c8;">Use an exchange argument: swap an optimal solution's first choice for the greedy one and show it is still valid and no worse.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Example:</strong> <span style="color:#f0e2c8;">Interval scheduling by earliest finish: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.sort(meetings, Comparator.comparingInt(m -&gt; m[1]))</code>, then keep each one with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">start &gt;= lastEnd</code>. O(n log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Counterexample:</strong> <span style="color:#f0e2c8;">Coins <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 3, 4]</code>, amount 6: greedy 4 + 1 + 1, optimal 3 + 3. When greedy breaks, use dynamic programming.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you prove a greedy algorithm is correct?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Show the greedy-choice property with an exchange argument — take any optimal solution, swap its first choice for the greedy one, and show it stays valid and no worse — and show optimal substructure, so you can repeat the argument on what is left.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Give an example where greedy fails.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Coin change with coins 1, 3 and 4 for amount 6: greedy takes 4 + 1 + 1 (three coins), but 3 + 3 is two. Our check found 24 failing amounts out of 1 to 99 for that coin set. The fix is dynamic programming.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is greedy different from dynamic programming?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Greedy commits to one choice per step and never revisits it; DP evaluates every choice per step and keeps the best, using a table of subproblem answers. DP is correct whenever optimal substructure holds; greedy additionally needs the greedy-choice property.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is Dijkstra a greedy algorithm?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. It always settles the unsettled node with the smallest known distance, and the exchange-style proof works only because edge weights are non-negative. With a negative edge the greedy choice can be wrong, which is why Bellman-Ford exists.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not write the comparator as a[1] - b[1]?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Subtraction can overflow when the values are large or negative, and an overflowed result has the wrong sign, so the sort order silently breaks. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.compare(a[1], b[1])</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Comparator.comparingInt(a -&gt; a[1])</code> never overflows.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Greedy algorithm** | Build the answer step by step with the locally best choice, never undoing one |
| **Greedy-choice property** | Some optimal solution contains the greedy choice |
| **Optimal substructure** | After a choice, the rest is a smaller copy of the same problem |
| **Exchange argument** | Swap a choice in an optimal solution for the greedy one without making it worse |
| **Counterexample** | One input where the greedy answer is worse than the optimum |
| **Interval scheduling (activity selection)** | Pick the most non-overlapping intervals; earliest finish first is optimal |
| **Greedy stays ahead** | Proof that greedy is at least as good as any solution after every step |
| **\`Comparator.comparingInt\`** | Builds a comparator from an int-valued key; chain more keys with \`thenComparingInt\` |

---
**Conclusion:** A greedy algorithm makes the locally best choice at each step and never looks back, which makes it short and fast — usually an \`Arrays.sort\` with a \`Comparator\` and one loop in Java. It is only correct when the greedy-choice property and optimal substructure hold, and the exchange argument is how you show it: earliest-finish interval scheduling matched a brute force on every input we ran, while earliest-start and shortest-first each had a counterexample, greedy coin change was wrong for 24 of 99 amounts with coins \`[1, 3, 4]\`, and the value-per-weight rule gave 240 (optimal) on the fractional knapsack but 160 instead of 220 on the 0/1 one. Say the rule, prove it or break it, and reach for dynamic programming when it breaks.`,
        examples: [
          { label: `Interval scheduling: three greedy rules vs brute force`, code: `import java.util.*;
import java.util.function.ToIntFunction;

public class Main {
    // Sort by the greedy rule (ties by start, then end), then keep every interval
    // that starts at or after the end of the last kept one.
    static List<int[]> greedySchedule(int[][] intervals, ToIntFunction<int[]> key) {
        int[][] sorted = intervals.clone();
        Arrays.sort(sorted, Comparator.comparingInt(key)
                .thenComparingInt((int[] iv) -> iv[0])
                .thenComparingInt((int[] iv) -> iv[1]));
        List<int[]> chosen = new ArrayList<>();
        long lastEnd = Long.MIN_VALUE;
        for (int[] iv : sorted) {
            if (iv[0] >= lastEnd) {             // half-open: [1, 3) and [3, 5) do not overlap
                chosen.add(iv);
                lastEnd = iv[1];
            }
        }
        return chosen;
    }

    static boolean fits(List<int[]> chosen, int[] iv) {
        for (int[] c : chosen) if (!(iv[0] >= c[1] || c[0] >= iv[1])) return false;
        return true;
    }

    // Try every subset (2^n of them) and keep the largest non-overlapping one.
    static int bruteForce(int[][] intervals) {
        int best = 0, n = intervals.length;
        for (int mask = 0; mask < (1 << n); mask++) {
            List<int[]> chosen = new ArrayList<>();
            boolean ok = true;
            for (int i = 0; i < n; i++) {
                if ((mask >> i & 1) == 1) {
                    if (!fits(chosen, intervals[i])) { ok = false; break; }
                    chosen.add(intervals[i]);
                }
            }
            if (ok) best = Math.max(best, chosen.size());
        }
        return best;
    }

    public static void main(String[] args) {
        String[] ruleNames = {"earliest finish", "earliest start", "shortest"};
        List<ToIntFunction<int[]>> rules = List.of(iv -> iv[1], iv -> iv[0], iv -> iv[1] - iv[0]);
        String[] names = {"A", "B", "C", "D"};
        int[][][] inputs = {
            {{1, 3}, {2, 5}, {4, 7}, {6, 9}, {8, 10}},
            {{0, 10}, {1, 2}, {3, 4}},
            {{0, 5}, {4, 7}, {6, 11}},
            {{1, 4}, {3, 5}, {0, 6}, {5, 7}, {3, 9}, {5, 9}, {6, 10}, {8, 11}, {8, 12}, {2, 14}, {12, 16}},
        };
        for (int t = 0; t < inputs.length; t++) {
            List<String> parts = new ArrayList<>();
            for (int r = 0; r < rules.size(); r++)
                parts.add(ruleNames[r] + " " + greedySchedule(inputs[t], rules.get(r)).size());
            System.out.println("input " + names[t] + ": " + String.join(", ", parts) + ", brute force " + bruteForce(inputs[t]));
        }
        StringBuilder sb = new StringBuilder("earliest finish on D keeps");
        for (int[] iv : greedySchedule(inputs[3], rules.get(0))) sb.append(" [").append(iv[0]).append(", ").append(iv[1]).append(")");
        System.out.println(sb);
    }
}` },
          { label: `Greedy coin change vs dynamic programming`, code: `import java.util.*;

public class Main {
    // Always take the largest coin that still fits. Returns the coin count, or -1.
    static int greedyCoins(int[] coins, int amount) {
        int[] sorted = coins.clone();
        Arrays.sort(sorted);                       // ascending, so walk it backwards
        int count = 0;
        for (int i = sorted.length - 1; i >= 0; i--) {
            count += amount / sorted[i];
            amount %= sorted[i];
        }
        return amount == 0 ? count : -1;
    }

    // Fewest coins for every value 0..amount (dynamic programming).
    static int dpCoins(int[] coins, int amount) {
        final int INF = Integer.MAX_VALUE;
        int[] best = new int[amount + 1];
        Arrays.fill(best, INF);
        best[0] = 0;
        for (int v = 1; v <= amount; v++)
            for (int c : coins)
                if (c <= v && best[v - c] != INF && best[v - c] + 1 < best[v]) best[v] = best[v - c] + 1;
        return best[amount] == INF ? -1 : best[amount];
    }

    static void report(int[] coins) {
        List<Integer> wrong = new ArrayList<>();
        for (int a = 1; a < 100; a++) if (greedyCoins(coins, a) != dpCoins(coins, a)) wrong.add(a);
        StringBuilder line = new StringBuilder("coins " + Arrays.toString(coins) + ": greedy correct for " + (99 - wrong.size()) + " of 99 amounts");
        if (!wrong.isEmpty()) {
            int a = wrong.get(0);
            line.append(", first failure ").append(a).append(" (greedy ").append(greedyCoins(coins, a))
                .append(", best ").append(dpCoins(coins, a)).append(")");
        }
        System.out.println(line);
    }

    public static void main(String[] args) {
        report(new int[]{1, 5, 10, 25});
        report(new int[]{1, 3, 4});
        report(new int[]{1, 7, 10});
        report(new int[]{2, 5});
    }
}` },
          { label: `Fractional vs 0/1 knapsack: same greedy, different verdict`, code: `import java.util.*;

public class Main {
    // Sort {value, weight} pairs by value/weight, best first.
    // Compare v1 * w2 with v2 * w1 (as long) so no floating point is involved.
    static int[][] byRatio(int[][] items) {
        int[][] sorted = items.clone();
        Arrays.sort(sorted, (a, b) -> Long.compare((long) b[0] * a[1], (long) a[0] * b[1]));
        return sorted;
    }

    static double fractionalGreedy(int[][] items, int capacity) {
        double total = 0;
        for (int[] it : byRatio(items)) {
            int take = Math.min(it[1], capacity);
            total += (double) it[0] * take / it[1];   // a fraction of an item is allowed
            capacity -= take;
            if (capacity == 0) break;
        }
        return total;
    }

    static int zeroOneGreedy(int[][] items, int capacity) {
        int total = 0;
        for (int[] it : byRatio(items)) {
            if (it[1] <= capacity) {                  // whole item or nothing
                total += it[0];
                capacity -= it[1];
            }
        }
        return total;
    }

    static int zeroOneDp(int[][] items, int capacity) {
        int[] best = new int[capacity + 1];
        for (int[] it : items)
            for (int c = capacity; c >= it[1]; c--) best[c] = Math.max(best[c], best[c - it[1]] + it[0]);
        return best[capacity];
    }

    public static void main(String[] args) {
        int[][] items = {{60, 10}, {100, 20}, {120, 30}};
        // Locale.ROOT: some default locales would print 240,00
        System.out.println("fractional knapsack, greedy by value/weight: " + String.format(Locale.ROOT, "%.2f", fractionalGreedy(items, 50))); // fractional knapsack, greedy by value/weight: 240.00
        System.out.println("0/1 knapsack, same greedy: " + zeroOneGreedy(items, 50));        // 0/1 knapsack, same greedy: 160
        System.out.println("0/1 knapsack, dynamic programming: " + zeroOneDp(items, 50));    // 0/1 knapsack, dynamic programming: 220
    }
}` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"What is a greedy algorithm? How do you know when a greedy approach gives the optimal answer, and can you show one example where it works and one where it fails — in C++?"

**What a strong answer should cover:**
- A one-sentence definition: build the answer step by step with the locally best choice and never undo a choice.
- The two conditions for correctness — the greedy-choice property and optimal substructure — and the exchange argument used to prove the first.
- A working example, typically interval scheduling by earliest finish time: sort, then one pass, O(n log n).
- A failing example with a concrete counterexample (coin change with \`[1, 3, 4]\` and amount 6, or 0/1 knapsack), and that dynamic programming is the fix.
- C++ details: \`std::sort\` is not stable (use explicit tie-breakers or \`std::stable_sort\`), the comparator must be a strict "less than" (never \`<=\`), and ratio cross-products belong in \`long long\`.
- Testing a greedy rule against a brute force on small inputs before trusting it.

**Code / implementation expected:** Optional — a short C++ greedy (interval scheduling or coin change) and its counterexample.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know \`vector\`, loops and functions in C++; everything else is explained.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are at a buffet with a small plate, and you want the most delicious meal you can fit. One strategy: look at what is in front of you, take the thing that looks best *right now*, and never put anything back. That strategy is fast — no planning, no regrets — and for some buffets it is perfect. But imagine the best-looking dish is an enormous lasagne that fills the whole plate, and right behind it are three small dishes that together would have been better. Your "take the best thing now" strategy just lost.

That is a **greedy algorithm**: build the answer one step at a time, at each step make the choice that looks best locally, and **never undo a choice**. It is the simplest kind of algorithm to write, and when it works it is usually the fastest — often just a sort and one pass. The catch is the lasagne: for many problems, the locally best choice is not part of the best overall answer.

So the interview question "what is a greedy algorithm?" is really two questions: *what is it*, and *how do you know when it is allowed*. A strong answer defines it in one sentence and then spends its time on the second part — the two properties that make greedy correct, how to prove them with an exchange argument, and the classic problems where greedy is wrong and [dynamic programming](/interview-question/what-is-dynamic-programming) is needed instead.

## 2. The Core Idea

📌 **Interview term: Greedy algorithm** — an algorithm that builds a solution step by step, always making the choice that looks best at that moment (the *locally optimal* choice), and never reconsidering a choice once it is made.

Almost every greedy algorithm has the same shape: decide what "best right now" means (a **greedy rule**, often a sort key), go through the options in that order, and keep each one if it still fits.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 170" role="img" aria-label="The greedy template: sort by the greedy rule, look at the next option, keep it if it still fits, and never undo a kept choice">
  <defs>
    <marker id="b26q2-a1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="10" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="90" y="70" text-anchor="middle">sort by the rule</text>
  <text class="d-sub" x="90" y="92" text-anchor="middle">for example end time</text>
  <rect class="d-box" x="210" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="290" y="70" text-anchor="middle">take next option</text>
  <text class="d-sub" x="290" y="92" text-anchor="middle">in that order</text>
  <rect class="d-box" x="410" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="490" y="70" text-anchor="middle">still fits?</text>
  <text class="d-sub" x="490" y="92" text-anchor="middle">feasibility check</text>
  <rect class="d-box-accent" x="610" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="680" y="70" text-anchor="middle">keep it</text>
  <text class="d-sub" x="680" y="92" text-anchor="middle">never undone</text>
  <path class="d-edge" d="M 172 75 L 206 75" marker-end="url(#b26q2-a1)"/>
  <path class="d-edge" d="M 372 75 L 406 75" marker-end="url(#b26q2-a1)"/>
  <path class="d-edge-accent" d="M 572 75 L 606 75" marker-end="url(#b26q2-a1)"/>
  <path class="d-edge-dashed" d="M 490 112 C 490 150, 290 150, 290 114" marker-end="url(#b26q2-a1)"/>
  <text class="d-sub" x="390" y="160" text-anchor="middle">no: skip it</text>
</svg>

The loop runs once per option, so after the sort the whole algorithm is usually O(n). Compare that with trying every subset of options (2^n of them) or a dynamic-programming table.

### When is greedy correct?

Greedy is correct exactly when two properties hold:

📌 **Interview term: Greedy-choice property** — there is always an optimal solution that contains the greedy (locally best) choice. So committing to it can never lock you out of the best answer.

📌 **Interview term: Optimal substructure** — after the greedy choice is made, what is left is a smaller instance of the same problem, and an optimal answer to it plus the greedy choice is optimal overall. (Dynamic programming needs this property too; greedy additionally needs the first one.)

The usual way to prove the greedy-choice property is an **exchange argument**:

📌 **Interview term: Exchange argument** — take any optimal solution that does *not* use the greedy choice, swap one of its choices for the greedy one, and show the result is still valid and no worse. Then an optimal solution with the greedy choice exists.

And the usual way to *disprove* a greedy rule is a single small input where it loses:

📌 **Interview term: Counterexample** — one concrete input on which the greedy answer is worse than the true optimum. One is enough to kill a greedy rule.

## 3. A Greedy That Works: Interval Scheduling

**Problem.** You have a list of meetings, each with a start and an end time, and one room. Pick as many meetings as possible with no two overlapping. (Intervals are half-open, \`[start, end)\`, so a meeting ending at 3 and one starting at 3 do not clash.)

📌 **Interview term: Interval scheduling (activity selection)** — choose the maximum number of pairwise non-overlapping intervals from a list.

There are three obvious greedy rules: take the meeting that **starts earliest**, the one that is **shortest**, or the one that **ends earliest**. Only one of them is always right. Example 1 runs all three against a brute force that tries all 2^n subsets:

| Input | Earliest start | Shortest | Earliest finish | Brute force (true best) |
| :--- | :--- | :--- | :--- | :--- |
| B: \`[0,10) [1,2) [3,4)\` | 1 (takes the long \`[0,10)\`) | 2 | 2 | 2 |
| C: \`[0,5) [4,7) [6,11)\` | 2 | 1 (takes \`[4,7)\`, which blocks both others) | 2 | 2 |
| D: 11 meetings | 3 | 4 | 4 | 4 |

Earliest start and shortest each have a counterexample (B and C). **Earliest finish** matched the brute force on every input. Here is what it keeps on input D:

<svg class="iq-diagram" width="100%" viewBox="0 0 660 360" role="img" aria-label="Eleven meetings on a time line from 0 to 16, sorted by end time. Earliest finish keeps 1 to 4, 5 to 7, 8 to 11 and 12 to 16, and skips every meeting that overlaps a kept one">
  <rect class="d-box-accent" x="76" y="14" width="108" height="18" rx="4"/>
  <text class="d-sub" x="130" y="27" text-anchor="middle">[1,4) kept</text>
  <rect class="d-box-muted" x="148" y="40" width="72" height="18" rx="4"/>
  <text class="d-sub" x="184" y="53" text-anchor="middle">[3,5)</text>
  <rect class="d-box-muted" x="40" y="66" width="216" height="18" rx="4"/>
  <text class="d-sub" x="148" y="79" text-anchor="middle">[0,6)</text>
  <rect class="d-box-accent" x="220" y="92" width="72" height="18" rx="4"/>
  <text class="d-sub" x="256" y="105" text-anchor="middle">[5,7) kept</text>
  <rect class="d-box-muted" x="148" y="118" width="216" height="18" rx="4"/>
  <text class="d-sub" x="256" y="131" text-anchor="middle">[3,9)</text>
  <rect class="d-box-muted" x="220" y="144" width="144" height="18" rx="4"/>
  <text class="d-sub" x="292" y="157" text-anchor="middle">[5,9)</text>
  <rect class="d-box-muted" x="256" y="170" width="144" height="18" rx="4"/>
  <text class="d-sub" x="328" y="183" text-anchor="middle">[6,10)</text>
  <rect class="d-box-accent" x="328" y="196" width="108" height="18" rx="4"/>
  <text class="d-sub" x="382" y="209" text-anchor="middle">[8,11) kept</text>
  <rect class="d-box-muted" x="328" y="222" width="144" height="18" rx="4"/>
  <text class="d-sub" x="400" y="235" text-anchor="middle">[8,12)</text>
  <rect class="d-box-muted" x="112" y="248" width="432" height="18" rx="4"/>
  <text class="d-sub" x="328" y="261" text-anchor="middle">[2,14)</text>
  <rect class="d-box-accent" x="472" y="274" width="144" height="18" rx="4"/>
  <text class="d-sub" x="544" y="287" text-anchor="middle">[12,16) kept</text>
  <path class="d-edge" d="M 40 316 L 616 316"/>
  <text class="d-sub" x="40" y="340" text-anchor="middle">0</text>
  <text class="d-sub" x="184" y="340" text-anchor="middle">4</text>
  <text class="d-sub" x="328" y="340" text-anchor="middle">8</text>
  <text class="d-sub" x="472" y="340" text-anchor="middle">12</text>
  <text class="d-sub" x="616" y="340" text-anchor="middle">16</text>
</svg>

The meetings are drawn in end-time order, top to bottom. The highlighted ones are kept; every grey one starts before the last kept meeting ends. Example 1 prints the same four: \`[1, 4) [5, 7) [8, 11) [12, 16)\`.

**Why earliest finish is always right (the exchange argument).** Let g be the meeting that ends first. Take any optimal schedule and let f be its first meeting. g ends no later than f (g ends first of all), so replacing f by g cannot create an overlap with the rest of the schedule — everything after f started after f ended, hence after g ended. The new schedule has the same size, so it is still optimal and contains g. That is the greedy-choice property. After choosing g, the remaining problem is "the same problem on the meetings that start at or after g ends" — optimal substructure. Repeat, and greedy is optimal.

The same "sort, then sweep" pattern solves [merging overlapping intervals](/interview-question/how-do-you-merge-overlapping-intervals) and the [minimum number of meeting rooms](/interview-question/how-do-you-find-the-minimum-number-of-meeting-rooms-required).

## 4. Greedy That Fails: Coins and Knapsacks

**Coin change.** "Pay an amount with the fewest coins" has an obvious greedy rule: always take the largest coin that fits. With US-style coins \`[1, 5, 10, 25]\` it is optimal for every amount from 1 to 99 (example 2 checks all of them against a DP). With coins \`[1, 3, 4]\` it fails at 6:

<svg class="iq-diagram" width="100%" viewBox="0 0 620 210" role="img" aria-label="Making 6 from coins 1, 3 and 4. Greedy takes 4, then 1, then 1, which is three coins. The optimum is 3 plus 3, which is two coins">
  <rect class="d-box-muted" x="20" y="20" width="270" height="170" rx="12"/>
  <text class="d-text" x="155" y="50" text-anchor="middle">greedy: largest first</text>
  <circle class="d-box" cx="80" cy="110" r="28"/>
  <text class="d-text" x="80" y="115" text-anchor="middle">4</text>
  <circle class="d-box" cx="155" cy="110" r="28"/>
  <text class="d-text" x="155" y="115" text-anchor="middle">1</text>
  <circle class="d-box" cx="230" cy="110" r="28"/>
  <text class="d-text" x="230" y="115" text-anchor="middle">1</text>
  <text class="d-sub" x="155" y="170" text-anchor="middle">3 coins</text>
  <rect class="d-box-accent" x="330" y="20" width="270" height="170" rx="12"/>
  <text class="d-text" x="465" y="50" text-anchor="middle">optimal</text>
  <circle class="d-box" cx="420" cy="110" r="28"/>
  <text class="d-text" x="420" y="115" text-anchor="middle">3</text>
  <circle class="d-box" cx="510" cy="110" r="28"/>
  <text class="d-text" x="510" y="115" text-anchor="middle">3</text>
  <text class="d-sub" x="465" y="170" text-anchor="middle">2 coins</text>
</svg>

Taking the 4 felt best, but it left 2, which only 1s can pay. The greedy-choice property fails: no optimal way to make 6 uses a 4. Example 2 found that greedy is wrong for 24 of the amounts 1–99 with \`[1, 3, 4]\`, 27 with \`[1, 7, 10]\`, and with \`[2, 5]\` it even reports "impossible" for 6, which is 2 + 2 + 2. The fix is the DP in [the coin change problem](/interview-question/how-do-you-solve-the-coin-change-problem).

**Knapsack.** A bag holds weight 50, and the items are (value 60, weight 10), (100, 20) and (120, 30). The greedy rule "best value per unit of weight first" takes 60 and 100, then:

- if you may take **a fraction** of an item (*fractional knapsack*), you take 20/30 of the last one for 80 more — total **240**, which is optimal;
- if each item is all-or-nothing (*0/1 knapsack*), the last item does not fit, so greedy stops at **160** — but the best is 100 + 120 = **220**.

Same rule, same items: correct for one problem, wrong for the other. Fractions make the exchange argument work (you can always swap a little of a worse item for a little of a better one); whole items break it. Example 3 prints all three numbers. See [the 0/1 knapsack problem](/interview-question/how-do-you-solve-the-0-1-knapsack-problem) for the DP.

## 5. Greedy vs. Dynamic Programming

| | Greedy | Dynamic programming |
| :--- | :--- | :--- |
| Choices | commits to one choice per step, never revisits | considers every choice per step, keeps the best |
| Needs | greedy-choice property **and** optimal substructure | optimal substructure and overlapping subproblems |
| Typical cost | a sort plus one pass, O(n log n) or O(n) | a table, often O(n · W) or O(n²) |
| Proof | exchange argument (or "greedy stays ahead") | the recurrence |
| If you are wrong | silently returns a worse answer | slower, but still correct |

Well-known algorithms that are greedy and provably correct: [Dijkstra's shortest paths](/interview-question/how-does-dijkstra-s-algorithm-work) (always settle the closest unsettled node; needs non-negative weights), [Kruskal's and Prim's minimum spanning trees](/interview-question/what-is-the-difference-between-kruskal-s-and-prim-s-mst-algorithms) (always add the cheapest safe edge), Huffman coding, interval scheduling, [the Jump Game](/interview-question/how-do-you-solve-the-jump-game) and [the Gas Station problem](/interview-question/how-do-you-solve-the-gas-station-problem). [Kadane's maximum subarray](/interview-question/how-do-you-find-the-maximum-subarray-sum) is often described both ways — it is a one-variable DP whose update looks greedy.

📌 **Interview term: Greedy stays ahead** — the other common proof style: show by induction that after every step, the greedy partial solution is at least as good as any other solution's first k steps.

## 6. The Code in C++

The interval-scheduling greedy, taking the greedy rule as a \`std::function\` so example 1 can try all three:

~~~cpp
// Sort by the greedy rule (ties by start, then end), then keep every interval
// that starts at or after the end of the last kept one.
vector<Interval> greedySchedule(vector<Interval> v, const function<int(const Interval&)>& key) {
    sort(v.begin(), v.end(), [&](const Interval& a, const Interval& b) {
        if (key(a) != key(b)) return key(a) < key(b);
        return a < b;              // pair compares start, then end
    });
    vector<Interval> chosen;
    long long lastEnd = LLONG_MIN;
    for (const auto& [start, end] : v) {
        if (start >= lastEnd) {    // half-open: [1, 3) and [3, 5) do not overlap
            chosen.push_back({start, end});
            lastEnd = end;
        }
    }
    return chosen;
}
~~~

- The vector is taken **by value** (\`vector<Interval> v\`), so the function sorts its own copy and the caller's input is untouched.
- \`std::sort\` does **not** guarantee that equal elements keep their order ([cppreference: \`std::sort\`](https://en.cppreference.com/w/cpp/algorithm/sort)); \`std::stable_sort\` does. The comparator therefore breaks ties itself: by the greedy key first, then \`a < b\` on the \`pair\`, which compares start and then end. That makes the output deterministic.
- The comparator must behave like "strictly less than". Writing \`key(a) <= key(b)\` breaks that requirement, and \`std::sort\` may then misbehave (wrong order or worse); always use \`<\`.
- \`lastEnd\` starts at \`LLONG_MIN\` (a \`long long\`), so the first meeting always fits.
- \`for (const auto& [start, end] : v)\` is a C++17 structured binding over each \`pair\`.

The coin-change greedy:

~~~cpp
// Always take the largest coin that still fits. Returns the coin count, or -1.
int greedyCoins(vector<int> coins, int amount) {
    sort(coins.begin(), coins.end(), greater<int>());   // largest first
    int count = 0;
    for (int c : coins) {
        count += amount / c;
        amount %= c;
    }
    return amount == 0 ? count : -1;
}
~~~

- \`sort(..., greater<int>())\` sorts descending. The parameter is a copy, so sorting it is harmless to the caller.
- \`amount / c\` on \`int\`s is integer division and \`amount %= c\` keeps the remainder.
- The DP (\`dpCoins\`) guards \`best[v - c] != INF\` before adding 1: \`INT_MAX + 1\` is signed overflow, which is undefined behaviour.

For the knapsack, "best value per weight first" compares two items. Example 3 cross-multiplies in \`long long\`:

~~~cpp
// Sort by value/weight, best first. Compare v1 * w2 with v2 * w1 (as long long)
// so no floating point is involved.
vector<Item> byRatio(vector<Item> items) {
    sort(items.begin(), items.end(), [](const Item& a, const Item& b) {
        return (long long)a.first * b.second > (long long)b.first * a.second;
    });
    return items;
}
~~~

\`(long long)a.first * b.second\` converts **before** multiplying; \`(long long)(a.first * b.second)\` would multiply in \`int\` first. The fractional total is printed with \`cout << fixed << setprecision(2)\`, which gives \`240.00\`.

## 7. Verified: Running the Code

Each example was saved as \`main.cpp\` and run with \`g++ -std=c++17 -O2 main.cpp && ./a.out\` (GCC 13). The same three programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — interval scheduling: three greedy rules vs a brute force over all 2^n subsets:**

~~~text
input A: earliest finish 3, earliest start 3, shortest 2, brute force 3
input B: earliest finish 2, earliest start 1, shortest 2, brute force 2
input C: earliest finish 2, earliest start 2, shortest 1, brute force 2
input D: earliest finish 4, earliest start 3, shortest 4, brute force 4
earliest finish on D keeps [1, 4) [5, 7) [8, 11) [12, 16)
~~~

**Example 2 — greedy coin change vs dynamic programming for every amount 1–99:**

~~~text
coins [1, 5, 10, 25]: greedy correct for 99 of 99 amounts
coins [1, 3, 4]: greedy correct for 75 of 99 amounts, first failure 6 (greedy 3, best 2)
coins [1, 7, 10]: greedy correct for 72 of 99 amounts, first failure 14 (greedy 5, best 2)
coins [2, 5]: greedy correct for 61 of 99 amounts, first failure 6 (greedy -1, best 3)
~~~

**Example 3 — the same "value per weight" greedy on the fractional and the 0/1 knapsack:**

~~~text
fractional knapsack, greedy by value/weight: 240.00
0/1 knapsack, same greedy: 160
0/1 knapsack, dynamic programming: 220
~~~

## 8. Complexity

| Algorithm | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Interval scheduling (greedy) | O(n log n) | O(n) | the sort dominates; the sweep is O(n); the by-value parameter is a copy |
| Interval scheduling (brute force) | O(2^n · n²) | O(n) | every subset, each checked pairwise — fine for 11 meetings, hopeless for 50 |
| Coin change (greedy) | O(c log c) | O(c) | sort c coin types, then one division per type |
| Coin change (DP) | O(amount · c) | O(amount) | one table entry per value, each tries every coin |
| Fractional knapsack (greedy) | O(n log n) | O(n) | sort by ratio, then one pass |
| 0/1 knapsack (DP) | O(n · W) | O(W) | W is the capacity; one row, updated from right to left |

## Edge Cases and Gotchas

- **Ties in the sort key.** Two meetings that end at the same time: either choice is fine for the *count*, but if you print the chosen meetings, fix a tie-breaker (here: start time, then end time) so the output is deterministic.
- **Touching intervals.** With half-open intervals, \`[1, 3)\` and \`[3, 5)\` do not overlap, so the test is \`start >= last_end\`. With closed intervals it would be \`>\`. Ask which one the interviewer means.
- **Empty input.** Zero meetings gives zero; zero coins of any kind for amount 0 is 0 coins.
- **Greedy that "fails to find any answer".** With coins \`[2, 5]\`, greedy takes 5 for amount 6 and is left with 1, so it reports impossible — although 2 + 2 + 2 works. A greedy can be wrong about *feasibility*, not only about optimality.
- **"It worked on the sample" is not a proof.** Greedy coin change passes every sample with US coins. Always test a greedy rule against a brute force on small inputs, as examples 1 and 2 do.

## Common Pitfalls

- **Assuming greedy works because it is intuitive.** Earliest start and shortest-first both sound reasonable; inputs B and C break them.
- **\`<=\` in a comparator.** \`std::sort\` requires a strict ordering; \`<=\` violates it and can break the sort. Use \`<\`.
- **Relying on \`std::sort\` to keep ties in input order.** It does not promise that; break ties explicitly or use \`std::stable_sort\`.
- **Overflow in ratio comparisons.** Cross-multiply in \`long long\`, converting before the multiplication.
- **Greedy coin change for arbitrary coins.** It is only safe for "canonical" coin systems like \`[1, 5, 10, 25]\`; otherwise use DP.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A greedy algorithm builds the answer one step at a time, always takes the <strong style="color:#ffca28;">locally best</strong> choice, and never undoes it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. When it is correct:</strong> <span style="color:#f0e2c8;">When the greedy-choice property (some optimal answer contains the greedy choice) and optimal substructure both hold.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Proof:</strong> <span style="color:#f0e2c8;">Use an exchange argument: swap an optimal solution's first choice for the greedy one and show it is still valid and no worse.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Example:</strong> <span style="color:#f0e2c8;">Interval scheduling by earliest finish: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sort</code> the meetings by end time (ties by start), then keep each one with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">start &gt;= lastEnd</code>. O(n log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Counterexample:</strong> <span style="color:#f0e2c8;">Coins <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 3, 4]</code>, amount 6: greedy 4 + 1 + 1, optimal 3 + 3. When greedy breaks, use dynamic programming.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you prove a greedy algorithm is correct?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Show the greedy-choice property with an exchange argument — take any optimal solution, swap its first choice for the greedy one, and show it stays valid and no worse — and show optimal substructure, so you can repeat the argument on what is left.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Give an example where greedy fails.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Coin change with coins 1, 3 and 4 for amount 6: greedy takes 4 + 1 + 1 (three coins), but 3 + 3 is two. Our check found 24 failing amounts out of 1 to 99 for that coin set. The fix is dynamic programming.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is greedy different from dynamic programming?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Greedy commits to one choice per step and never revisits it; DP evaluates every choice per step and keeps the best, using a table of subproblem answers. DP is correct whenever optimal substructure holds; greedy additionally needs the greedy-choice property.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is Dijkstra a greedy algorithm?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. It always settles the unsettled node with the smallest known distance, and the exchange-style proof works only because edge weights are non-negative. With a negative edge the greedy choice can be wrong, which is why Bellman-Ford exists.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does it matter that std::sort is not stable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For the count of meetings, no. For which meetings you print, ties can come out in any order, so break ties explicitly in the comparator (as the example does with the pair comparison) or use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::stable_sort</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Greedy algorithm** | Build the answer step by step with the locally best choice, never undoing one |
| **Greedy-choice property** | Some optimal solution contains the greedy choice |
| **Optimal substructure** | After a choice, the rest is a smaller copy of the same problem |
| **Exchange argument** | Swap a choice in an optimal solution for the greedy one without making it worse |
| **Counterexample** | One input where the greedy answer is worse than the optimum |
| **Interval scheduling (activity selection)** | Pick the most non-overlapping intervals; earliest finish first is optimal |
| **Greedy stays ahead** | Proof that greedy is at least as good as any solution after every step |
| **Stable sort** | A sort that keeps equal elements in their input order; \`std::stable_sort\` is, \`std::sort\` is not guaranteed to be |

---
**Conclusion:** A greedy algorithm makes the locally best choice at each step and never looks back, which makes it short and fast — usually a \`std::sort\` with a strict comparator and one loop in C++. It is only correct when the greedy-choice property and optimal substructure hold, and the exchange argument is how you show it: earliest-finish interval scheduling matched a brute force on every input we ran, while earliest-start and shortest-first each had a counterexample, greedy coin change was wrong for 24 of 99 amounts with coins \`[1, 3, 4]\`, and the value-per-weight rule gave 240 (optimal) on the fractional knapsack but 160 instead of 220 on the 0/1 one. Say the rule, prove it or break it, and reach for dynamic programming when it breaks.`,
        examples: [
          { label: `Interval scheduling: three greedy rules vs brute force`, code: `#include <algorithm>
#include <climits>
#include <functional>
#include <iostream>
#include <string>
#include <utility>
#include <vector>
using namespace std;

using Interval = pair<int, int>;   // [start, end)

// Sort by the greedy rule (ties by start, then end), then keep every interval
// that starts at or after the end of the last kept one.
vector<Interval> greedySchedule(vector<Interval> v, const function<int(const Interval&)>& key) {
    sort(v.begin(), v.end(), [&](const Interval& a, const Interval& b) {
        if (key(a) != key(b)) return key(a) < key(b);
        return a < b;              // pair compares start, then end
    });
    vector<Interval> chosen;
    long long lastEnd = LLONG_MIN;
    for (const auto& [start, end] : v) {
        if (start >= lastEnd) {    // half-open: [1, 3) and [3, 5) do not overlap
            chosen.push_back({start, end});
            lastEnd = end;
        }
    }
    return chosen;
}

bool fits(const vector<Interval>& chosen, const Interval& iv) {
    for (const auto& c : chosen) if (!(iv.first >= c.second || c.first >= iv.second)) return false;
    return true;
}

// Try every subset (2^n of them) and keep the largest non-overlapping one.
int bruteForce(const vector<Interval>& v) {
    int best = 0, n = (int)v.size();
    for (int mask = 0; mask < (1 << n); mask++) {
        vector<Interval> chosen;
        bool ok = true;
        for (int i = 0; i < n && ok; i++) {
            if (mask >> i & 1) {
                if (!fits(chosen, v[i])) ok = false;
                else chosen.push_back(v[i]);
            }
        }
        if (ok) best = max(best, (int)chosen.size());
    }
    return best;
}

int main() {
    vector<pair<string, function<int(const Interval&)>>> rules = {
        {"earliest finish", [](const Interval& iv) { return iv.second; }},
        {"earliest start", [](const Interval& iv) { return iv.first; }},
        {"shortest", [](const Interval& iv) { return iv.second - iv.first; }},
    };
    vector<pair<string, vector<Interval>>> inputs = {
        {"A", {{1, 3}, {2, 5}, {4, 7}, {6, 9}, {8, 10}}},
        {"B", {{0, 10}, {1, 2}, {3, 4}}},
        {"C", {{0, 5}, {4, 7}, {6, 11}}},
        {"D", {{1, 4}, {3, 5}, {0, 6}, {5, 7}, {3, 9}, {5, 9}, {6, 10}, {8, 11}, {8, 12}, {2, 14}, {12, 16}}},
    };
    for (const auto& [name, intervals] : inputs) {
        cout << "input " << name << ": ";
        for (size_t r = 0; r < rules.size(); r++)
            cout << (r ? ", " : "") << rules[r].first << " " << greedySchedule(intervals, rules[r].second).size();
        cout << ", brute force " << bruteForce(intervals) << "\\n";
    }
    cout << "earliest finish on D keeps";
    for (const auto& [s, e] : greedySchedule(inputs[3].second, rules[0].second)) cout << " [" << s << ", " << e << ")";
    cout << "\\n";
    return 0;
}` },
          { label: `Greedy coin change vs dynamic programming`, code: `#include <algorithm>
#include <climits>
#include <functional>
#include <iostream>
#include <vector>
using namespace std;

// Always take the largest coin that still fits. Returns the coin count, or -1.
int greedyCoins(vector<int> coins, int amount) {
    sort(coins.begin(), coins.end(), greater<int>());   // largest first
    int count = 0;
    for (int c : coins) {
        count += amount / c;
        amount %= c;
    }
    return amount == 0 ? count : -1;
}

// Fewest coins for every value 0..amount (dynamic programming).
int dpCoins(const vector<int>& coins, int amount) {
    const int INF = INT_MAX;
    vector<int> best(amount + 1, INF);
    best[0] = 0;
    for (int v = 1; v <= amount; v++)
        for (int c : coins)
            if (c <= v && best[v - c] != INF && best[v - c] + 1 < best[v]) best[v] = best[v - c] + 1;
    return best[amount] == INF ? -1 : best[amount];
}

void report(const vector<int>& coins) {
    vector<int> wrong;
    for (int a = 1; a < 100; a++) if (greedyCoins(coins, a) != dpCoins(coins, a)) wrong.push_back(a);
    cout << "coins [";
    for (size_t i = 0; i < coins.size(); i++) cout << (i ? ", " : "") << coins[i];
    cout << "]: greedy correct for " << 99 - (int)wrong.size() << " of 99 amounts";
    if (!wrong.empty()) {
        int a = wrong[0];
        cout << ", first failure " << a << " (greedy " << greedyCoins(coins, a) << ", best " << dpCoins(coins, a) << ")";
    }
    cout << "\\n";
}

int main() {
    report({1, 5, 10, 25});
    report({1, 3, 4});
    report({1, 7, 10});
    report({2, 5});
    return 0;
}` },
          { label: `Fractional vs 0/1 knapsack: same greedy, different verdict`, code: `#include <algorithm>
#include <iomanip>
#include <iostream>
#include <utility>
#include <vector>
using namespace std;

using Item = pair<int, int>;   // {value, weight}

// Sort by value/weight, best first. Compare v1 * w2 with v2 * w1 (as long long)
// so no floating point is involved.
vector<Item> byRatio(vector<Item> items) {
    sort(items.begin(), items.end(), [](const Item& a, const Item& b) {
        return (long long)a.first * b.second > (long long)b.first * a.second;
    });
    return items;
}

double fractionalGreedy(const vector<Item>& items, int capacity) {
    double total = 0;
    for (auto [value, weight] : byRatio(items)) {
        int take = min(weight, capacity);
        total += (double)value * take / weight;   // a fraction of an item is allowed
        capacity -= take;
        if (capacity == 0) break;
    }
    return total;
}

int zeroOneGreedy(const vector<Item>& items, int capacity) {
    int total = 0;
    for (auto [value, weight] : byRatio(items)) {
        if (weight <= capacity) {                 // whole item or nothing
            total += value;
            capacity -= weight;
        }
    }
    return total;
}

int zeroOneDp(const vector<Item>& items, int capacity) {
    vector<int> best(capacity + 1, 0);
    for (auto [value, weight] : items)
        for (int c = capacity; c >= weight; c--) best[c] = max(best[c], best[c - weight] + value);
    return best[capacity];
}

int main() {
    vector<Item> items = {{60, 10}, {100, 20}, {120, 30}};
    cout << fixed << setprecision(2);
    cout << "fractional knapsack, greedy by value/weight: " << fractionalGreedy(items, 50) << "\\n";  // fractional knapsack, greedy by value/weight: 240.00
    cout << "0/1 knapsack, same greedy: " << zeroOneGreedy(items, 50) << "\\n";                       // 0/1 knapsack, same greedy: 160
    cout << "0/1 knapsack, dynamic programming: " << zeroOneDp(items, 50) << "\\n";                   // 0/1 knapsack, dynamic programming: 220
    return 0;
}` },
        ],
      },
    },
  },
  {
    title: `How do you solve the Jump Game?`,
    difficulty: "medium",
    seoDescription: `Solve the Jump Game in O(n) by tracking the farthest reachable index, with the O(n^2) DP and Jump Game II, in Python, JavaScript, Java and C++.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You are given a list of non-negative integers. You start at index 0, and each value is the maximum jump length from that position. Write a Python function that returns whether you can reach the last index."

**What a strong answer should cover:**
- The key observation: shorter jumps are allowed, so the reachable indices always form a prefix, and one number — the farthest reach — describes them.
- The one-pass greedy: return false as soon as \`i > farthest\`, otherwise update \`farthest = max(farthest, i + nums[i])\`; O(n) time, O(1) space.
- A correctness argument (the prefix / loop-invariant argument), not just the code.
- The slower alternatives and why they lose: recursion (exponential) and the \`good[]\` DP (O(n²)).
- Python details: \`enumerate(nums)\` for index and value together, an early \`return True\` once the end is covered, and avoiding recursion because of the default recursion limit.
- The Jump Game II follow-up (fewest jumps) as BFS levels.

**Clarifying questions expected:**
- Is each value the maximum jump (shorter jumps allowed)?
- Do you want only yes/no, or the fewest jumps?

**Code / implementation expected:** Yes — \`can_jump(nums) -> bool\` in Python 3, one pass.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know lists, loops and functions in Python; everything else is explained.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A row of stepping stones crosses a river. Painted on each stone is a number: the longest jump you can make from that stone (you may always jump shorter). You start on the first stone. Can you reach the last one?

With stones \`2 3 1 1 4\` it is easy: jump 1 to the "3", then 3 to the end. With stones \`3 2 1 0 4\` you are stuck — every route lands on the "0" and the "4" is out of reach. The puzzle is deciding which, quickly, for a row of a hundred thousand stones.

The natural first idea is to explore: from each stone try every jump length, like a maze. That works, but it explodes. The trick that makes this problem a favourite (LeetCode 55, "Jump Game") is to stop asking *which path* and ask only *how far can I possibly get?* One number, updated in a single pass, answers the question. It is a clean example of a [greedy algorithm](/interview-question/what-is-a-greedy-algorithm) whose correctness you can prove in two sentences — which is exactly what the interviewer wants to hear.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is \`nums[i]\` the *maximum* jump, so any shorter jump is allowed? | That is the standard problem, and it is what makes "reachable indices form a prefix" true. If the jump had to be exact, the greedy would not work. |
| Do I only need yes/no, or the fewest jumps, or the path? | Yes/no is Jump Game I; the fewest jumps is Jump Game II, a different (but also greedy) algorithm. |
| Can values be zero? Negative? | Zeros are the whole difficulty (they are the traps). Negative values would mean jumping backwards, which is a different, graph-search problem. |
| What is the size of the array? | Up to 10^4 or 10^5 rules out the O(n²) DP in a slow language and points to the O(n) pass. |
| Is a single-element array already "at the end"? | Yes in the standard problem: you start on the last index, so the answer is true. |

## 3. The Core Idea

📌 **Interview term: Reachable index** — an index you can stand on by some sequence of legal jumps from index 0.

Here is the key fact. If you can reach index i, and \`nums[i]\` is the longest jump from there, then **every** index from i to \`i + nums[i]\` is reachable — because shorter jumps are allowed. So the reachable indices never have gaps: they are always a block \`0, 1, ..., farthest\`.

📌 **Interview term: Farthest reach** — the largest index known to be reachable so far. Because reachable indices form a prefix, this one number describes the whole reachable set.

That turns the problem into one left-to-right scan:

1. Start with \`farthest = 0\`.
2. At each index i: if \`i > farthest\`, index i is not reachable — and neither is anything after it — so the answer is **false**.
3. Otherwise update \`farthest = max(farthest, i + nums[i])\`.
4. If \`farthest\` reaches the last index, the answer is **true**.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 240" role="img" aria-label="Array 2, 3, 1, 1, 4. From index 0 the reach is index 2. Index 1 holds 3 and extends the reach to index 4, the last index, so the answer is true">
  <defs>
    <marker id="b26q3-a1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="80" y="125" text-anchor="middle">2</text>
  <text class="d-sub" x="80" y="145" text-anchor="middle">index 0</text>
  <rect class="d-box" x="160" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="200" y="125" text-anchor="middle">3</text>
  <text class="d-sub" x="200" y="145" text-anchor="middle">index 1</text>
  <rect class="d-box" x="280" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="320" y="125" text-anchor="middle">1</text>
  <text class="d-sub" x="320" y="145" text-anchor="middle">index 2</text>
  <rect class="d-box" x="400" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="440" y="125" text-anchor="middle">1</text>
  <text class="d-sub" x="440" y="145" text-anchor="middle">index 3</text>
  <rect class="d-box-accent" x="520" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="560" y="125" text-anchor="middle">4</text>
  <text class="d-sub" x="560" y="145" text-anchor="middle">index 4</text>
  <path class="d-edge-dashed" d="M 80 160 C 80 205, 320 205, 320 162" marker-end="url(#b26q3-a1)"/>
  <text class="d-sub" x="200" y="226" text-anchor="middle">from index 0: reach 2</text>
  <path class="d-edge-accent" d="M 200 96 C 200 40, 560 40, 560 94" marker-end="url(#b26q3-a1)"/>
  <text class="d-accent" x="380" y="24" text-anchor="middle">from index 1: reach 4, the last index</text>
</svg>

Index 0 can reach up to index 2. Index 1 is inside that range, and from it the reach becomes 1 + 3 = 4, the last index — done after looking at just two numbers.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="Array 3, 2, 1, 0, 4. Indices 0, 1 and 2 all reach exactly index 3, which holds 0. Index 4 is beyond the farthest reach, so the answer is false">
  <defs>
    <marker id="b26q3-a2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="80" y="125" text-anchor="middle">3</text>
  <text class="d-sub" x="80" y="145" text-anchor="middle">index 0</text>
  <rect class="d-box" x="160" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="200" y="125" text-anchor="middle">2</text>
  <text class="d-sub" x="200" y="145" text-anchor="middle">index 1</text>
  <rect class="d-box" x="280" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="320" y="125" text-anchor="middle">1</text>
  <text class="d-sub" x="320" y="145" text-anchor="middle">index 2</text>
  <rect class="d-box-accent" x="400" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="440" y="125" text-anchor="middle">0</text>
  <text class="d-sub" x="440" y="145" text-anchor="middle">index 3</text>
  <rect class="d-box-muted" x="520" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="560" y="125" text-anchor="middle">4</text>
  <text class="d-sub" x="560" y="145" text-anchor="middle">index 4</text>
  <path class="d-edge" d="M 80 96 C 80 10, 440 10, 440 94" marker-end="url(#b26q3-a2)"/>
  <path class="d-edge" d="M 200 96 C 200 45, 440 45, 440 94" marker-end="url(#b26q3-a2)"/>
  <path class="d-edge" d="M 320 96 C 320 75, 440 75, 440 94" marker-end="url(#b26q3-a2)"/>
  <text class="d-accent" x="560" y="60" text-anchor="middle">every reach ends at 3</text>
  <text class="d-sub" x="560" y="186" text-anchor="middle">unreachable</text>
</svg>

Every stone before the 0 reaches exactly index 3, and the 0 adds nothing. When the scan arrives at index 4, \`4 > farthest = 3\`, so the answer is false:

| i | nums[i] | i ≤ farthest? | farthest after |
| :--- | :--- | :--- | :--- |
| 0 | 3 | yes | 3 |
| 1 | 2 | yes | 3 |
| 2 | 1 | yes | 3 |
| 3 | 0 | yes | 3 |
| 4 | 4 | **no (4 > 3)** | return false |

📌 **Interview term: Loop invariant** — a statement that is true before every iteration of a loop. Here: "every index from 0 to \`farthest\` is reachable, and no index beyond it is reachable using only indices before i". It is what proves the scan correct.

**Why the greedy is correct, in two sentences.** The reachable indices form a prefix (shorter jumps are allowed), so tracking its right end loses no information. And every reachable index is visited by the scan before it could matter, so \`farthest\` ends up as large as any sequence of jumps could make it.

## 4. From Brute Force to One Pass

**Brute force (recursion).** From index i, try every jump length 1 to \`nums[i]\` and recurse. It is the definition written as code, and it can take exponential time because the same indices are explored again and again from different routes.

**Dynamic programming, O(n²).** Remember the answer per index. Let \`good[i]\` mean "the last index is reachable from i". The last index is good; going right to left, \`good[i]\` is true if any j in \`i+1 .. i+nums[i]\` is good. Each index may scan up to n others, so the worst case is O(n²). See [what dynamic programming is](/interview-question/what-is-dynamic-programming).

📌 **Interview term: Memoization / tabulation** — storing the answer to each subproblem (here, one per index) so it is computed once; tabulation fills the table in a loop, as \`good[]\` does.

**Greedy, O(n).** The farthest-reach scan from section 3. One pass, one variable.

**Greedy from the right, also O(n).** Keep \`goal\`, the leftmost index known to reach the end (start with the last index). Going right to left, if \`i + nums[i] >= goal\`, index i can reach the goal, so move \`goal = i\`. The answer is \`goal == 0\`. It is the DP with the table squeezed into one number: you only ever need the leftmost good index.

Example 2 runs all three (DP, forward greedy, backward greedy) on 2,000 random arrays — they agreed on every one — and then counts the work on the worst case for the DP, an array like \`[n-2, n-3, ..., 1, 0, 0]\` where every jump lands just short of the end:

| n | Greedy steps | DP inner steps |
| :--- | :--- | :--- |
| 1,000 | 1,000 | 498,501 |
| 2,000 | 2,000 | 1,997,001 |
| 4,000 | 4,000 | 7,994,001 |

Doubling n doubles the greedy work and roughly quadruples the DP work — linear versus quadratic, measured. The DP count is exactly (n − 1)(n − 2) / 2.

## 5. Follow-Up: Jump Game II (Fewest Jumps)

The usual next question: *assuming the end is reachable, what is the fewest number of jumps?* (LeetCode 45.)

Think of it as [breadth-first search](/interview-question/what-is-the-difference-between-bfs-and-dfs) where the "levels" are ranges of indices. Level 0 is index 0. Level 1 is every index reachable with one jump: \`1 .. nums[0]\`. Level 2 is everything reachable from level 1, and so on. Because reachable sets are prefixes, each level is a contiguous range, so you never need a queue — just the end of the current level and the farthest reach seen while scanning it.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="Jump Game II on 2, 3, 1, 1, 4. Level 0 is index 0. Level 1 is indices 1 and 2. Level 2 is indices 3 and 4, which contains the last index, so two jumps are needed">
  <rect class="d-box-muted" x="40" y="70" width="80" height="56" rx="8"/>
  <text class="d-text" x="80" y="103" text-anchor="middle">2</text>
  <rect class="d-box" x="160" y="70" width="80" height="56" rx="8"/>
  <text class="d-text" x="200" y="103" text-anchor="middle">3</text>
  <rect class="d-box" x="280" y="70" width="80" height="56" rx="8"/>
  <text class="d-text" x="320" y="103" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="400" y="70" width="80" height="56" rx="8"/>
  <text class="d-text" x="440" y="103" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="520" y="70" width="80" height="56" rx="8"/>
  <text class="d-text" x="560" y="103" text-anchor="middle">4</text>
  <text class="d-sub" x="80" y="40" text-anchor="middle">level 0</text>
  <text class="d-sub" x="260" y="40" text-anchor="middle">level 1: one jump</text>
  <text class="d-sub" x="500" y="40" text-anchor="middle">level 2: two jumps</text>
  <path class="d-edge" d="M 160 150 L 360 150"/>
  <path class="d-edge-accent" d="M 400 150 L 600 150"/>
  <text class="d-sub" x="260" y="180" text-anchor="middle">indices 1 to 2</text>
  <text class="d-sub" x="500" y="180" text-anchor="middle">indices 3 to 4</text>
</svg>

The last index is in level 2, so the answer is 2. The algorithm scans i from 0 to n − 2, keeps \`farthest = max(farthest, i + nums[i])\`, and whenever i reaches \`end\` (the end of the current level) it counts one more jump and sets \`end = farthest\`. That is O(n) time and O(1) space. Example 3 prints the answers for six arrays.

## 6. The Code in Python

~~~python
def can_jump(nums):
    """True if you can reach the last index, where nums[i] is the longest jump from i."""
    farthest = 0                         # farthest index reachable so far
    for i, step in enumerate(nums):
        if i > farthest:
            return False                 # index i itself is out of reach
        farthest = max(farthest, i + step)
        if farthest >= len(nums) - 1:
            return True                  # early exit: the end is already covered
    return True
~~~

**What to point out in this code:**

- \`for i, step in enumerate(nums):\` gives the index and the value together — the Pythonic replacement for \`range(len(nums))\` plus indexing.
- The \`i > farthest\` check comes **before** the update. If it came after, a stone you cannot reach would still extend the reach.
- \`max(farthest, i + step)\` never shrinks the reach: a short jump from a later stone must not undo a long jump from an earlier one.
- The early \`return True\` stops as soon as the end is covered; without it the loop is still correct, just longer.
- Python integers are unbounded, so \`i + step\` cannot overflow however large the values are.
- Everything is a loop. A recursive "try every jump" version would hit Python's default recursion limit of 1000 nested calls on long inputs, as well as being exponential.

The two other approaches from example 2, for comparison:

~~~python
def can_jump_dp(nums):
    """good[i] is True when the last index is reachable from i. O(n^2) in the worst case."""
    n = len(nums)
    good = [False] * n
    good[n - 1] = True
    for i in range(n - 2, -1, -1):
        for j in range(i + 1, min(i + nums[i], n - 1) + 1):
            work[0] += 1
            if good[j]:
                good[i] = True
                break
    return good[0]


def can_jump_backward(nums):
    """Greedy from the right: the leftmost index known to reach the end."""
    goal = len(nums) - 1
    for i in range(len(nums) - 2, -1, -1):
        if i + nums[i] >= goal:
            goal = i
    return goal == 0
~~~

\`range(n - 2, -1, -1)\` walks from the second-to-last index down to 0; the inner \`range(i + 1, min(i + nums[i], n - 1) + 1)\` is every landing spot. The \`work[0] += 1\` lines in the example code (a one-element list, so the functions can update it without a \`global\` statement) count the inner steps for the table in section 4.

And the Jump Game II follow-up:

~~~python
def min_jumps(nums):
    """Jump Game II: fewest jumps to reach the last index (assumes it is reachable).
    Think of BFS levels: [start, end] is the range reachable with \`jumps\` jumps."""
    jumps = 0
    end = 0                    # last index reachable with the current number of jumps
    farthest = 0               # farthest index reachable with one more jump
    for i in range(len(nums) - 1):
        farthest = max(farthest, i + nums[i])
        if i == end:           # finished scanning this level: we must jump again
            jumps += 1
            end = farthest
            if end >= len(nums) - 1:
                break
    return jumps
~~~

## 7. Verified: Running the Code

Each example was saved as one file and run with \`python3 main.py\` (Python 3.13). The same three programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the greedy check on nine arrays** (the two classic examples, a single element, a leading zero, zeros you can and cannot jump over):

~~~text
true
false
true
false
true
false
false
false
true
~~~

**Example 2 — greedy vs DP vs backward greedy on 2,000 random arrays** from a seeded generator (the same arithmetic in all four languages), then the work counts on the DP worst case:

~~~text
random arrays: 2000, all three agree on 2000, reachable 1084
n=1000: answer false/false, greedy steps 1000, DP steps 498501
n=2000: answer false/false, greedy steps 2000, DP steps 1997001
n=4000: answer false/false, greedy steps 4000, DP steps 7994001
~~~

**Example 3 — Jump Game II, fewest jumps:**

~~~text
2
2
3
0
1
3
~~~

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Recursion, try every jump | exponential | O(n) stack | the same indices are re-explored from many routes |
| DP over \`good[]\` | O(n²) | O(n) | each index may scan every later index; 7,994,001 steps for n = 4,000 |
| Greedy farthest reach | O(n) | O(1) | one pass, one variable; 4,000 steps for n = 4,000 |
| Greedy from the right | O(n) | O(1) | one pass, one variable (\`goal\`) |
| Jump Game II (BFS levels) | O(n) | O(1) | one pass with \`end\` and \`farthest\` |

The step counts are from example 2. See [Big-O notation](/interview-question/what-is-big-o-notation).

## 9. Edge Cases

- **One element** (\`[0]\`) — you are already on the last index: true, and zero jumps for Jump Game II.
- **A zero at the start** (\`[0, 1]\`) — you cannot move at all: false.
- **Zeros you can jump over** (\`[2, 0, 0]\` is true; \`[3, 0, 8, 2, 0, 0, 1]\` is true because the 8 carries you past the zeros).
- **A zero you cannot avoid** (\`[3, 2, 1, 0, 4]\`, \`[4, 0, 0, 0, 0, 1]\`) — every reach ends on or before it: false.
- **Huge jumps** — \`i + nums[i]\` can point far beyond the array; that is fine, it just means "the end is covered". In fixed-width integer languages, make sure \`i + nums[i]\` cannot overflow (it cannot with the usual limits of n ≤ 10^4 and nums[i] ≤ 10^5).
- **Empty array** — not allowed by the standard problem; if asked, decide and say what you return.

## Common Pitfalls

- **Updating \`farthest\` before checking \`i > farthest\`.** An unreachable stone would then extend the reach.
- **Shrinking the reach.** \`farthest = i + step\` instead of \`max(farthest, i + step)\` forgets earlier long jumps; \`[3, 0, 8, 2, 0, 0, 1]\`-style inputs break it.
- **Off-by-one on the goal.** The goal is the last *index*, \`len(nums) - 1\`, not \`len(nums)\`.
- **Writing the brute-force recursion.** It is exponential and also limited by the 1000-frame recursion limit; mention it, do not ship it.
- **Confusing Jump Game I and II.** The fewest-jumps loop runs to \`len(nums) - 1\` (exclusive) and counts a jump when \`i == end\`; reusing the yes/no loop gives wrong counts.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Key fact:</strong> <span style="color:#f0e2c8;">Shorter jumps are allowed, so the reachable indices always form a <strong style="color:#ffca28;">prefix</strong> 0..farthest. One number describes them.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Algorithm:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for i, step in enumerate(nums)</code>: if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &gt; farthest</code> return False, else <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">farthest = max(farthest, i + step)</code>; return True once it covers the last index.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(1) space — one pass, no recursion, no table.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Alternatives:</strong> <span style="color:#f0e2c8;">Recursion is exponential; the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">good[]</code> DP is O(n²). They agree with the greedy, just slower.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Follow-up:</strong> <span style="color:#f0e2c8;">Jump Game II: BFS by levels — count a jump each time <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> reaches the current level end, then extend the end to the farthest reach.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it safe to keep only one number instead of the set of reachable indices?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because shorter jumps are allowed: if i is reachable, so is every index up to i + nums[i]. The reachable set is therefore always a prefix 0..farthest, and its right end describes it completely.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the DP solution and why is it worse?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">good[i] is true if any index in i+1..i+nums[i] is good, filled from right to left. It is correct but O(n²) in the worst case: on our 4,000-element worst case it did 7,994,001 inner steps against the greedy 4,000.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you find the fewest jumps (Jump Game II)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Treat it as BFS by levels. Scan left to right keeping the farthest reach; each time i reaches the end of the current level, add one jump and set the new level end to the farthest reach. O(n) time, O(1) space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not write it recursively in Python?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The recursive version tries every jump and is exponential, and long inputs would also exceed Python's default recursion limit of 1000 frames. The greedy is a plain loop with O(1) extra space.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Reachable index** | An index you can stand on through some sequence of legal jumps from index 0 |
| **Farthest reach** | The largest index known to be reachable so far; it describes the whole reachable prefix |
| **Loop invariant** | A statement true before every loop iteration, used to prove the loop correct |
| **Memoization / tabulation** | Storing each subproblem answer so it is computed once |
| **\`enumerate\`** | Python built-in that yields \`(index, value)\` pairs while looping |

Related: [the Gas Station problem](/interview-question/how-do-you-solve-the-gas-station-problem) is another one-pass greedy with a two-sentence proof.

---
**Conclusion:** The Jump Game is a reachability question that looks like a search but collapses to one number: because shorter jumps are allowed, the reachable indices are always a prefix, so tracking the farthest reach in a single \`enumerate\` loop — and failing the moment \`i > farthest\` — answers it in O(n) time and O(1) space. It agreed with the O(n²) DP on 2,000 random arrays in our run and did 4,000 steps where the DP did almost 8 million. Say the prefix argument out loud, then offer Jump Game II as BFS by levels.`,
        examples: [
          { label: `Greedy farthest-reach check (9 inputs)`, code: `def can_jump(nums):
    """True if you can reach the last index, where nums[i] is the longest jump from i."""
    farthest = 0                         # farthest index reachable so far
    for i, step in enumerate(nums):
        if i > farthest:
            return False                 # index i itself is out of reach
        farthest = max(farthest, i + step)
        if farthest >= len(nums) - 1:
            return True                  # early exit: the end is already covered
    return True


def show(nums):
    return str(can_jump(nums)).lower()


print(show([2, 3, 1, 1, 4]))  # true
print(show([3, 2, 1, 0, 4]))  # false
print(show([0]))  # true
print(show([0, 1]))  # false
print(show([2, 0, 0]))  # true
print(show([1, 0, 1, 0]))  # false
print(show([4, 0, 0, 0, 0, 1]))  # false
print(show([1, 2, 0, 1, 0, 2, 0]))  # false
print(show([3, 0, 8, 2, 0, 0, 1]))  # true` },
          { label: `Greedy vs DP vs backward greedy: 2,000 random arrays and work counts`, code: `work = [0]


def can_jump_greedy(nums):
    farthest = 0
    for i, step in enumerate(nums):
        work[0] += 1
        if i > farthest:
            return False
        farthest = max(farthest, i + step)
    return True


def can_jump_dp(nums):
    """good[i] is True when the last index is reachable from i. O(n^2) in the worst case."""
    n = len(nums)
    good = [False] * n
    good[n - 1] = True
    for i in range(n - 2, -1, -1):
        for j in range(i + 1, min(i + nums[i], n - 1) + 1):
            work[0] += 1
            if good[j]:
                good[i] = True
                break
    return good[0]


def can_jump_backward(nums):
    """Greedy from the right: the leftmost index known to reach the end."""
    goal = len(nums) - 1
    for i in range(len(nums) - 2, -1, -1):
        if i + nums[i] >= goal:
            goal = i
    return goal == 0


seed = [7]


def rnd(m):
    seed[0] = seed[0] * 48271 % 2147483647
    return seed[0] % m


trials, agree, reachable = 2000, 0, 0
for _ in range(trials):
    n = 1 + rnd(12)
    nums = [rnd(4) for _ in range(n)]
    a, b, c = can_jump_greedy(nums), can_jump_dp(nums), can_jump_backward(nums)
    if a == b == c:
        agree += 1
    if a:
        reachable += 1
print("random arrays: " + str(trials) + ", all three agree on " + str(agree) + ", reachable " + str(reachable))

for n in [1000, 2000, 4000]:
    nums = [n - 2 - i for i in range(n - 1)] + [0]     # every jump lands just short: [n-2, n-3, ..., 1, 0, 0]
    work[0] = 0
    g = can_jump_greedy(nums)
    greedy_work = work[0]
    work[0] = 0
    d = can_jump_dp(nums)
    print("n=" + str(n) + ": answer " + str(g).lower() + "/" + str(d).lower() + ", greedy steps " + str(greedy_work) + ", DP steps " + str(work[0]))` },
          { label: `Follow-up: Jump Game II (fewest jumps)`, code: `def min_jumps(nums):
    """Jump Game II: fewest jumps to reach the last index (assumes it is reachable).
    Think of BFS levels: [start, end] is the range reachable with \`jumps\` jumps."""
    jumps = 0
    end = 0                    # last index reachable with the current number of jumps
    farthest = 0               # farthest index reachable with one more jump
    for i in range(len(nums) - 1):
        farthest = max(farthest, i + nums[i])
        if i == end:           # finished scanning this level: we must jump again
            jumps += 1
            end = farthest
            if end >= len(nums) - 1:
                break
    return jumps


print(min_jumps([2, 3, 1, 1, 4]))  # 2
print(min_jumps([2, 3, 0, 1, 4]))  # 2
print(min_jumps([1, 1, 1, 1]))  # 3
print(min_jumps([0]))  # 0
print(min_jumps([10, 1, 1]))  # 1
print(min_jumps([1, 2, 1, 1, 1]))  # 3` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You are given an array of non-negative integers. You start at index 0, and each value is the maximum jump length from that position. Write a JavaScript function that returns whether you can reach the last index."

**What a strong answer should cover:**
- The key observation: shorter jumps are allowed, so the reachable indices always form a prefix, and one number — the farthest reach — describes them.
- The one-pass greedy: return false as soon as \`i > farthest\`, otherwise update \`farthest = Math.max(farthest, i + nums[i])\`; O(n) time, O(1) space.
- A correctness argument (the prefix / loop-invariant argument), not just the code.
- The slower alternatives and why they lose: recursion (exponential) and the \`good[]\` DP (O(n²)).
- JavaScript details: a classic indexed \`for\` loop rather than \`forEach\` (you cannot \`return\` out of \`forEach\`), and numbers being exact integers far beyond any realistic \`i + nums[i]\`.
- The Jump Game II follow-up (fewest jumps) as BFS levels.

**Clarifying questions expected:**
- Is each value the maximum jump (shorter jumps allowed)?
- Do you want only yes/no, or the fewest jumps?

**Code / implementation expected:** Yes — \`canJump(nums)\` returning a boolean in JavaScript, one pass.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays, loops and functions in JavaScript; everything else is explained.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A row of stepping stones crosses a river. Painted on each stone is a number: the longest jump you can make from that stone (you may always jump shorter). You start on the first stone. Can you reach the last one?

With stones \`2 3 1 1 4\` it is easy: jump 1 to the "3", then 3 to the end. With stones \`3 2 1 0 4\` you are stuck — every route lands on the "0" and the "4" is out of reach. The puzzle is deciding which, quickly, for a row of a hundred thousand stones.

The natural first idea is to explore: from each stone try every jump length, like a maze. That works, but it explodes. The trick that makes this problem a favourite (LeetCode 55, "Jump Game") is to stop asking *which path* and ask only *how far can I possibly get?* One number, updated in a single pass, answers the question. It is a clean example of a [greedy algorithm](/interview-question/what-is-a-greedy-algorithm) whose correctness you can prove in two sentences — which is exactly what the interviewer wants to hear.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is \`nums[i]\` the *maximum* jump, so any shorter jump is allowed? | That is the standard problem, and it is what makes "reachable indices form a prefix" true. If the jump had to be exact, the greedy would not work. |
| Do I only need yes/no, or the fewest jumps, or the path? | Yes/no is Jump Game I; the fewest jumps is Jump Game II, a different (but also greedy) algorithm. |
| Can values be zero? Negative? | Zeros are the whole difficulty (they are the traps). Negative values would mean jumping backwards, which is a different, graph-search problem. |
| What is the size of the array? | Up to 10^4 or 10^5 rules out the O(n²) DP in a slow language and points to the O(n) pass. |
| Is a single-element array already "at the end"? | Yes in the standard problem: you start on the last index, so the answer is true. |

## 3. The Core Idea

📌 **Interview term: Reachable index** — an index you can stand on by some sequence of legal jumps from index 0.

Here is the key fact. If you can reach index i, and \`nums[i]\` is the longest jump from there, then **every** index from i to \`i + nums[i]\` is reachable — because shorter jumps are allowed. So the reachable indices never have gaps: they are always a block \`0, 1, ..., farthest\`.

📌 **Interview term: Farthest reach** — the largest index known to be reachable so far. Because reachable indices form a prefix, this one number describes the whole reachable set.

That turns the problem into one left-to-right scan:

1. Start with \`farthest = 0\`.
2. At each index i: if \`i > farthest\`, index i is not reachable — and neither is anything after it — so the answer is **false**.
3. Otherwise update \`farthest = max(farthest, i + nums[i])\`.
4. If \`farthest\` reaches the last index, the answer is **true**.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 240" role="img" aria-label="Array 2, 3, 1, 1, 4. From index 0 the reach is index 2. Index 1 holds 3 and extends the reach to index 4, the last index, so the answer is true">
  <defs>
    <marker id="b26q3-a1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="80" y="125" text-anchor="middle">2</text>
  <text class="d-sub" x="80" y="145" text-anchor="middle">index 0</text>
  <rect class="d-box" x="160" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="200" y="125" text-anchor="middle">3</text>
  <text class="d-sub" x="200" y="145" text-anchor="middle">index 1</text>
  <rect class="d-box" x="280" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="320" y="125" text-anchor="middle">1</text>
  <text class="d-sub" x="320" y="145" text-anchor="middle">index 2</text>
  <rect class="d-box" x="400" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="440" y="125" text-anchor="middle">1</text>
  <text class="d-sub" x="440" y="145" text-anchor="middle">index 3</text>
  <rect class="d-box-accent" x="520" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="560" y="125" text-anchor="middle">4</text>
  <text class="d-sub" x="560" y="145" text-anchor="middle">index 4</text>
  <path class="d-edge-dashed" d="M 80 160 C 80 205, 320 205, 320 162" marker-end="url(#b26q3-a1)"/>
  <text class="d-sub" x="200" y="226" text-anchor="middle">from index 0: reach 2</text>
  <path class="d-edge-accent" d="M 200 96 C 200 40, 560 40, 560 94" marker-end="url(#b26q3-a1)"/>
  <text class="d-accent" x="380" y="24" text-anchor="middle">from index 1: reach 4, the last index</text>
</svg>

Index 0 can reach up to index 2. Index 1 is inside that range, and from it the reach becomes 1 + 3 = 4, the last index — done after looking at just two numbers.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="Array 3, 2, 1, 0, 4. Indices 0, 1 and 2 all reach exactly index 3, which holds 0. Index 4 is beyond the farthest reach, so the answer is false">
  <defs>
    <marker id="b26q3-a2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="80" y="125" text-anchor="middle">3</text>
  <text class="d-sub" x="80" y="145" text-anchor="middle">index 0</text>
  <rect class="d-box" x="160" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="200" y="125" text-anchor="middle">2</text>
  <text class="d-sub" x="200" y="145" text-anchor="middle">index 1</text>
  <rect class="d-box" x="280" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="320" y="125" text-anchor="middle">1</text>
  <text class="d-sub" x="320" y="145" text-anchor="middle">index 2</text>
  <rect class="d-box-accent" x="400" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="440" y="125" text-anchor="middle">0</text>
  <text class="d-sub" x="440" y="145" text-anchor="middle">index 3</text>
  <rect class="d-box-muted" x="520" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="560" y="125" text-anchor="middle">4</text>
  <text class="d-sub" x="560" y="145" text-anchor="middle">index 4</text>
  <path class="d-edge" d="M 80 96 C 80 10, 440 10, 440 94" marker-end="url(#b26q3-a2)"/>
  <path class="d-edge" d="M 200 96 C 200 45, 440 45, 440 94" marker-end="url(#b26q3-a2)"/>
  <path class="d-edge" d="M 320 96 C 320 75, 440 75, 440 94" marker-end="url(#b26q3-a2)"/>
  <text class="d-accent" x="560" y="60" text-anchor="middle">every reach ends at 3</text>
  <text class="d-sub" x="560" y="186" text-anchor="middle">unreachable</text>
</svg>

Every stone before the 0 reaches exactly index 3, and the 0 adds nothing. When the scan arrives at index 4, \`4 > farthest = 3\`, so the answer is false:

| i | nums[i] | i ≤ farthest? | farthest after |
| :--- | :--- | :--- | :--- |
| 0 | 3 | yes | 3 |
| 1 | 2 | yes | 3 |
| 2 | 1 | yes | 3 |
| 3 | 0 | yes | 3 |
| 4 | 4 | **no (4 > 3)** | return false |

📌 **Interview term: Loop invariant** — a statement that is true before every iteration of a loop. Here: "every index from 0 to \`farthest\` is reachable, and no index beyond it is reachable using only indices before i". It is what proves the scan correct.

**Why the greedy is correct, in two sentences.** The reachable indices form a prefix (shorter jumps are allowed), so tracking its right end loses no information. And every reachable index is visited by the scan before it could matter, so \`farthest\` ends up as large as any sequence of jumps could make it.

## 4. From Brute Force to One Pass

**Brute force (recursion).** From index i, try every jump length 1 to \`nums[i]\` and recurse. It is the definition written as code, and it can take exponential time because the same indices are explored again and again from different routes.

**Dynamic programming, O(n²).** Remember the answer per index. Let \`good[i]\` mean "the last index is reachable from i". The last index is good; going right to left, \`good[i]\` is true if any j in \`i+1 .. i+nums[i]\` is good. Each index may scan up to n others, so the worst case is O(n²). See [what dynamic programming is](/interview-question/what-is-dynamic-programming).

📌 **Interview term: Memoization / tabulation** — storing the answer to each subproblem (here, one per index) so it is computed once; tabulation fills the table in a loop, as \`good[]\` does.

**Greedy, O(n).** The farthest-reach scan from section 3. One pass, one variable.

**Greedy from the right, also O(n).** Keep \`goal\`, the leftmost index known to reach the end (start with the last index). Going right to left, if \`i + nums[i] >= goal\`, index i can reach the goal, so move \`goal = i\`. The answer is \`goal == 0\`. It is the DP with the table squeezed into one number: you only ever need the leftmost good index.

Example 2 runs all three (DP, forward greedy, backward greedy) on 2,000 random arrays — they agreed on every one — and then counts the work on the worst case for the DP, an array like \`[n-2, n-3, ..., 1, 0, 0]\` where every jump lands just short of the end:

| n | Greedy steps | DP inner steps |
| :--- | :--- | :--- |
| 1,000 | 1,000 | 498,501 |
| 2,000 | 2,000 | 1,997,001 |
| 4,000 | 4,000 | 7,994,001 |

Doubling n doubles the greedy work and roughly quadruples the DP work — linear versus quadratic, measured. The DP count is exactly (n − 1)(n − 2) / 2.

## 5. Follow-Up: Jump Game II (Fewest Jumps)

The usual next question: *assuming the end is reachable, what is the fewest number of jumps?* (LeetCode 45.)

Think of it as [breadth-first search](/interview-question/what-is-the-difference-between-bfs-and-dfs) where the "levels" are ranges of indices. Level 0 is index 0. Level 1 is every index reachable with one jump: \`1 .. nums[0]\`. Level 2 is everything reachable from level 1, and so on. Because reachable sets are prefixes, each level is a contiguous range, so you never need a queue — just the end of the current level and the farthest reach seen while scanning it.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="Jump Game II on 2, 3, 1, 1, 4. Level 0 is index 0. Level 1 is indices 1 and 2. Level 2 is indices 3 and 4, which contains the last index, so two jumps are needed">
  <rect class="d-box-muted" x="40" y="70" width="80" height="56" rx="8"/>
  <text class="d-text" x="80" y="103" text-anchor="middle">2</text>
  <rect class="d-box" x="160" y="70" width="80" height="56" rx="8"/>
  <text class="d-text" x="200" y="103" text-anchor="middle">3</text>
  <rect class="d-box" x="280" y="70" width="80" height="56" rx="8"/>
  <text class="d-text" x="320" y="103" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="400" y="70" width="80" height="56" rx="8"/>
  <text class="d-text" x="440" y="103" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="520" y="70" width="80" height="56" rx="8"/>
  <text class="d-text" x="560" y="103" text-anchor="middle">4</text>
  <text class="d-sub" x="80" y="40" text-anchor="middle">level 0</text>
  <text class="d-sub" x="260" y="40" text-anchor="middle">level 1: one jump</text>
  <text class="d-sub" x="500" y="40" text-anchor="middle">level 2: two jumps</text>
  <path class="d-edge" d="M 160 150 L 360 150"/>
  <path class="d-edge-accent" d="M 400 150 L 600 150"/>
  <text class="d-sub" x="260" y="180" text-anchor="middle">indices 1 to 2</text>
  <text class="d-sub" x="500" y="180" text-anchor="middle">indices 3 to 4</text>
</svg>

The last index is in level 2, so the answer is 2. The algorithm scans i from 0 to n − 2, keeps \`farthest = max(farthest, i + nums[i])\`, and whenever i reaches \`end\` (the end of the current level) it counts one more jump and sets \`end = farthest\`. That is O(n) time and O(1) space. Example 3 prints the answers for six arrays.

## 6. The Code in JavaScript

~~~javascript
function canJump(nums) {
  // True if you can reach the last index, where nums[i] is the longest jump from i.
  let farthest = 0;                      // farthest index reachable so far
  for (let i = 0; i < nums.length; i++) {
    if (i > farthest) return false;      // index i itself is out of reach
    farthest = Math.max(farthest, i + nums[i]);
    if (farthest >= nums.length - 1) return true;   // early exit: the end is covered
  }
  return true;
}
~~~

**What to point out in this code:**

- A plain indexed \`for\` loop is used on purpose. \`nums.forEach(...)\` cannot stop early — a \`return\` inside its callback only leaves the callback — so the early \`return false\` / \`return true\` would not work. \`for...of\` would work but hides the index we need.
- The \`i > farthest\` check comes **before** the update; otherwise an unreachable stone would extend the reach.
- \`Math.max(farthest, i + nums[i])\` never shrinks the reach.
- JavaScript numbers are 64-bit floats, but integers are exact up to \`Number.MAX_SAFE_INTEGER\` (9007199254740991), so \`i + nums[i]\` is always exact for any array that fits in memory.
- \`console.log(true)\` prints \`true\`, so the examples print the booleans directly.

The two other approaches from example 2, for comparison:

~~~javascript
function canJumpDp(nums) {
  // good[i] is true when the last index is reachable from i. O(n^2) in the worst case.
  const n = nums.length;
  const good = new Array(n).fill(false);
  good[n - 1] = true;
  for (let i = n - 2; i >= 0; i--) {
    const last = Math.min(i + nums[i], n - 1);
    for (let j = i + 1; j <= last; j++) {
      work++;
      if (good[j]) { good[i] = true; break; }
    }
  }
  return good[0];
}

function canJumpBackward(nums) {
  // Greedy from the right: the leftmost index known to reach the end.
  let goal = nums.length - 1;
  for (let i = nums.length - 2; i >= 0; i--) if (i + nums[i] >= goal) goal = i;
  return goal === 0;
}
~~~

And the Jump Game II follow-up:

~~~javascript
function minJumps(nums) {
  // Jump Game II: fewest jumps to reach the last index (assumes it is reachable).
  // Think of BFS levels: indices up to \`end\` are reachable with \`jumps\` jumps.
  let jumps = 0;
  let end = 0;         // last index reachable with the current number of jumps
  let farthest = 0;    // farthest index reachable with one more jump
  for (let i = 0; i < nums.length - 1; i++) {
    farthest = Math.max(farthest, i + nums[i]);
    if (i === end) {   // finished scanning this level: we must jump again
      jumps++;
      end = farthest;
      if (end >= nums.length - 1) break;
    }
  }
  return jumps;
}
~~~

## 7. Verified: Running the Code

Each example was saved as one file and run with \`node main.js\` (Node 22); they use only \`console.log\`, so they also run in a browser. The same three programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the greedy check on nine arrays** (the two classic examples, a single element, a leading zero, zeros you can and cannot jump over):

~~~text
true
false
true
false
true
false
false
false
true
~~~

**Example 2 — greedy vs DP vs backward greedy on 2,000 random arrays** from a seeded generator (the same arithmetic in all four languages), then the work counts on the DP worst case:

~~~text
random arrays: 2000, all three agree on 2000, reachable 1084
n=1000: answer false/false, greedy steps 1000, DP steps 498501
n=2000: answer false/false, greedy steps 2000, DP steps 1997001
n=4000: answer false/false, greedy steps 4000, DP steps 7994001
~~~

**Example 3 — Jump Game II, fewest jumps:**

~~~text
2
2
3
0
1
3
~~~

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Recursion, try every jump | exponential | O(n) stack | the same indices are re-explored from many routes |
| DP over \`good[]\` | O(n²) | O(n) | each index may scan every later index; 7,994,001 steps for n = 4,000 |
| Greedy farthest reach | O(n) | O(1) | one pass, one variable; 4,000 steps for n = 4,000 |
| Greedy from the right | O(n) | O(1) | one pass, one variable (\`goal\`) |
| Jump Game II (BFS levels) | O(n) | O(1) | one pass with \`end\` and \`farthest\` |

The DP also allocates \`new Array(n).fill(false)\`; the greedy allocates nothing. See [Big-O notation](/interview-question/what-is-big-o-notation).

## 9. Edge Cases

- **One element** (\`[0]\`) — you are already on the last index: true, and zero jumps for Jump Game II.
- **A zero at the start** (\`[0, 1]\`) — you cannot move at all: false.
- **Zeros you can jump over** (\`[2, 0, 0]\` is true; \`[3, 0, 8, 2, 0, 0, 1]\` is true because the 8 carries you past the zeros).
- **A zero you cannot avoid** (\`[3, 2, 1, 0, 4]\`, \`[4, 0, 0, 0, 0, 1]\`) — every reach ends on or before it: false.
- **Huge jumps** — \`i + nums[i]\` can point far beyond the array; that is fine, it just means "the end is covered". In fixed-width integer languages, make sure \`i + nums[i]\` cannot overflow (it cannot with the usual limits of n ≤ 10^4 and nums[i] ≤ 10^5).
- **Empty array** — not allowed by the standard problem; if asked, decide and say what you return.

## Common Pitfalls

- **Using \`forEach\` and expecting \`return\` to exit.** It only exits the callback; the loop carries on and the function returns \`undefined\`.
- **Updating \`farthest\` before checking \`i > farthest\`.** An unreachable stone would then extend the reach.
- **Shrinking the reach.** \`farthest = i + nums[i]\` instead of \`Math.max(...)\` forgets earlier long jumps.
- **Off-by-one on the goal.** The goal is \`nums.length - 1\`, not \`nums.length\`.
- **Confusing Jump Game I and II.** The fewest-jumps loop runs while \`i < nums.length - 1\` and counts a jump when \`i === end\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Key fact:</strong> <span style="color:#f0e2c8;">Shorter jumps are allowed, so the reachable indices always form a <strong style="color:#ffca28;">prefix</strong> 0..farthest. One number describes them.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Algorithm:</strong> <span style="color:#f0e2c8;">Indexed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for</code> loop: if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &gt; farthest</code> return false, else <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">farthest = Math.max(farthest, i + nums[i])</code>; return true once it covers the last index.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(1) space — one pass, no recursion, no table.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Alternatives:</strong> <span style="color:#f0e2c8;">Recursion is exponential; the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">good[]</code> DP is O(n²). They agree with the greedy, just slower.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Follow-up:</strong> <span style="color:#f0e2c8;">Jump Game II: BFS by levels — count a jump each time <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> reaches the current level end, then extend the end to the farthest reach.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it safe to keep only one number instead of the set of reachable indices?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because shorter jumps are allowed: if i is reachable, so is every index up to i + nums[i]. The reachable set is therefore always a prefix 0..farthest, and its right end describes it completely.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the DP solution and why is it worse?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">good[i] is true if any index in i+1..i+nums[i] is good, filled from right to left. It is correct but O(n²) in the worst case: on our 4,000-element worst case it did 7,994,001 inner steps against the greedy 4,000.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you find the fewest jumps (Jump Game II)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Treat it as BFS by levels. Scan left to right keeping the farthest reach; each time i reaches the end of the current level, add one jump and set the new level end to the farthest reach. O(n) time, O(1) space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you write it with reduce or forEach?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not cleanly: neither can stop early, so you would lose the early <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return false</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reduce</code> can carry <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">farthest</code>, but you would still have to check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &gt; farthest</code> on every step and ignore the rest. A plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for</code> loop is clearer and stops as soon as the answer is known.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Reachable index** | An index you can stand on through some sequence of legal jumps from index 0 |
| **Farthest reach** | The largest index known to be reachable so far; it describes the whole reachable prefix |
| **Loop invariant** | A statement true before every loop iteration, used to prove the loop correct |
| **Memoization / tabulation** | Storing each subproblem answer so it is computed once |
| **\`Array.prototype.forEach\`** | Calls a function for each element; it cannot be stopped early with \`return\` or \`break\` |

Related: [the Gas Station problem](/interview-question/how-do-you-solve-the-gas-station-problem) is another one-pass greedy with a two-sentence proof.

---
**Conclusion:** The Jump Game is a reachability question that looks like a search but collapses to one number: because shorter jumps are allowed, the reachable indices are always a prefix, so tracking the farthest reach in a single indexed \`for\` loop — and failing the moment \`i > farthest\` — answers it in O(n) time and O(1) space. It agreed with the O(n²) DP on 2,000 random arrays in our run and did 4,000 steps where the DP did almost 8 million. Say the prefix argument out loud, then offer Jump Game II as BFS by levels.`,
        examples: [
          { label: `Greedy farthest-reach check (9 inputs)`, code: `function canJump(nums) {
  // True if you can reach the last index, where nums[i] is the longest jump from i.
  let farthest = 0;                      // farthest index reachable so far
  for (let i = 0; i < nums.length; i++) {
    if (i > farthest) return false;      // index i itself is out of reach
    farthest = Math.max(farthest, i + nums[i]);
    if (farthest >= nums.length - 1) return true;   // early exit: the end is covered
  }
  return true;
}

console.log(canJump([2, 3, 1, 1, 4])); // true
console.log(canJump([3, 2, 1, 0, 4])); // false
console.log(canJump([0])); // true
console.log(canJump([0, 1])); // false
console.log(canJump([2, 0, 0])); // true
console.log(canJump([1, 0, 1, 0])); // false
console.log(canJump([4, 0, 0, 0, 0, 1])); // false
console.log(canJump([1, 2, 0, 1, 0, 2, 0])); // false
console.log(canJump([3, 0, 8, 2, 0, 0, 1])); // true` },
          { label: `Greedy vs DP vs backward greedy: 2,000 random arrays and work counts`, code: `let work = 0;

function canJumpGreedy(nums) {
  let farthest = 0;
  for (let i = 0; i < nums.length; i++) {
    work++;
    if (i > farthest) return false;
    farthest = Math.max(farthest, i + nums[i]);
  }
  return true;
}

function canJumpDp(nums) {
  // good[i] is true when the last index is reachable from i. O(n^2) in the worst case.
  const n = nums.length;
  const good = new Array(n).fill(false);
  good[n - 1] = true;
  for (let i = n - 2; i >= 0; i--) {
    const last = Math.min(i + nums[i], n - 1);
    for (let j = i + 1; j <= last; j++) {
      work++;
      if (good[j]) { good[i] = true; break; }
    }
  }
  return good[0];
}

function canJumpBackward(nums) {
  // Greedy from the right: the leftmost index known to reach the end.
  let goal = nums.length - 1;
  for (let i = nums.length - 2; i >= 0; i--) if (i + nums[i] >= goal) goal = i;
  return goal === 0;
}

let seed = 7;
function rnd(m) {
  seed = (seed * 48271) % 2147483647;
  return seed % m;
}

const trials = 2000;
let agree = 0, reachable = 0;
for (let t = 0; t < trials; t++) {
  const n = 1 + rnd(12);
  const nums = [];
  for (let i = 0; i < n; i++) nums.push(rnd(4));
  const a = canJumpGreedy(nums), b = canJumpDp(nums), c = canJumpBackward(nums);
  if (a === b && b === c) agree++;
  if (a) reachable++;
}
console.log("random arrays: " + trials + ", all three agree on " + agree + ", reachable " + reachable);

for (const n of [1000, 2000, 4000]) {
  const nums = [];
  for (let i = 0; i < n - 1; i++) nums.push(n - 2 - i);   // every jump lands just short
  nums.push(0);
  work = 0;
  const g = canJumpGreedy(nums);
  const greedyWork = work;
  work = 0;
  const d = canJumpDp(nums);
  console.log("n=" + n + ": answer " + g + "/" + d + ", greedy steps " + greedyWork + ", DP steps " + work);
}` },
          { label: `Follow-up: Jump Game II (fewest jumps)`, code: `function minJumps(nums) {
  // Jump Game II: fewest jumps to reach the last index (assumes it is reachable).
  // Think of BFS levels: indices up to \`end\` are reachable with \`jumps\` jumps.
  let jumps = 0;
  let end = 0;         // last index reachable with the current number of jumps
  let farthest = 0;    // farthest index reachable with one more jump
  for (let i = 0; i < nums.length - 1; i++) {
    farthest = Math.max(farthest, i + nums[i]);
    if (i === end) {   // finished scanning this level: we must jump again
      jumps++;
      end = farthest;
      if (end >= nums.length - 1) break;
    }
  }
  return jumps;
}

console.log(minJumps([2, 3, 1, 1, 4])); // 2
console.log(minJumps([2, 3, 0, 1, 4])); // 2
console.log(minJumps([1, 1, 1, 1])); // 3
console.log(minJumps([0])); // 0
console.log(minJumps([10, 1, 1])); // 1
console.log(minJumps([1, 2, 1, 1, 1])); // 3` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You are given an int[] of non-negative integers. You start at index 0, and each value is the maximum jump length from that position. Write a Java method that returns whether you can reach the last index."

**What a strong answer should cover:**
- The key observation: shorter jumps are allowed, so the reachable indices always form a prefix, and one number — the farthest reach — describes them.
- The one-pass greedy: return false as soon as \`i > farthest\`, otherwise update \`farthest = Math.max(farthest, i + nums[i])\`; O(n) time, O(1) space.
- A correctness argument (the prefix / loop-invariant argument), not just the code.
- The slower alternatives and why they lose: recursion (exponential, and a \`StackOverflowError\` risk) and the \`boolean[] good\` DP (O(n²)).
- Java details: \`i + nums[i]\` is an \`int\` sum, so mention when it could overflow (it cannot under the usual limits); \`long\` counters for work counts.
- The Jump Game II follow-up (fewest jumps) as BFS levels.

**Clarifying questions expected:**
- Is each value the maximum jump (shorter jumps allowed)?
- Do you want only yes/no, or the fewest jumps?

**Code / implementation expected:** Yes — \`boolean canJump(int[] nums)\` in Java, one pass.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays, loops and static methods in Java; everything else is explained.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A row of stepping stones crosses a river. Painted on each stone is a number: the longest jump you can make from that stone (you may always jump shorter). You start on the first stone. Can you reach the last one?

With stones \`2 3 1 1 4\` it is easy: jump 1 to the "3", then 3 to the end. With stones \`3 2 1 0 4\` you are stuck — every route lands on the "0" and the "4" is out of reach. The puzzle is deciding which, quickly, for a row of a hundred thousand stones.

The natural first idea is to explore: from each stone try every jump length, like a maze. That works, but it explodes. The trick that makes this problem a favourite (LeetCode 55, "Jump Game") is to stop asking *which path* and ask only *how far can I possibly get?* One number, updated in a single pass, answers the question. It is a clean example of a [greedy algorithm](/interview-question/what-is-a-greedy-algorithm) whose correctness you can prove in two sentences — which is exactly what the interviewer wants to hear.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is \`nums[i]\` the *maximum* jump, so any shorter jump is allowed? | That is the standard problem, and it is what makes "reachable indices form a prefix" true. If the jump had to be exact, the greedy would not work. |
| Do I only need yes/no, or the fewest jumps, or the path? | Yes/no is Jump Game I; the fewest jumps is Jump Game II, a different (but also greedy) algorithm. |
| Can values be zero? Negative? | Zeros are the whole difficulty (they are the traps). Negative values would mean jumping backwards, which is a different, graph-search problem. |
| What is the size of the array? | Up to 10^4 or 10^5 rules out the O(n²) DP in a slow language and points to the O(n) pass. |
| Is a single-element array already "at the end"? | Yes in the standard problem: you start on the last index, so the answer is true. |

## 3. The Core Idea

📌 **Interview term: Reachable index** — an index you can stand on by some sequence of legal jumps from index 0.

Here is the key fact. If you can reach index i, and \`nums[i]\` is the longest jump from there, then **every** index from i to \`i + nums[i]\` is reachable — because shorter jumps are allowed. So the reachable indices never have gaps: they are always a block \`0, 1, ..., farthest\`.

📌 **Interview term: Farthest reach** — the largest index known to be reachable so far. Because reachable indices form a prefix, this one number describes the whole reachable set.

That turns the problem into one left-to-right scan:

1. Start with \`farthest = 0\`.
2. At each index i: if \`i > farthest\`, index i is not reachable — and neither is anything after it — so the answer is **false**.
3. Otherwise update \`farthest = max(farthest, i + nums[i])\`.
4. If \`farthest\` reaches the last index, the answer is **true**.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 240" role="img" aria-label="Array 2, 3, 1, 1, 4. From index 0 the reach is index 2. Index 1 holds 3 and extends the reach to index 4, the last index, so the answer is true">
  <defs>
    <marker id="b26q3-a1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="80" y="125" text-anchor="middle">2</text>
  <text class="d-sub" x="80" y="145" text-anchor="middle">index 0</text>
  <rect class="d-box" x="160" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="200" y="125" text-anchor="middle">3</text>
  <text class="d-sub" x="200" y="145" text-anchor="middle">index 1</text>
  <rect class="d-box" x="280" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="320" y="125" text-anchor="middle">1</text>
  <text class="d-sub" x="320" y="145" text-anchor="middle">index 2</text>
  <rect class="d-box" x="400" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="440" y="125" text-anchor="middle">1</text>
  <text class="d-sub" x="440" y="145" text-anchor="middle">index 3</text>
  <rect class="d-box-accent" x="520" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="560" y="125" text-anchor="middle">4</text>
  <text class="d-sub" x="560" y="145" text-anchor="middle">index 4</text>
  <path class="d-edge-dashed" d="M 80 160 C 80 205, 320 205, 320 162" marker-end="url(#b26q3-a1)"/>
  <text class="d-sub" x="200" y="226" text-anchor="middle">from index 0: reach 2</text>
  <path class="d-edge-accent" d="M 200 96 C 200 40, 560 40, 560 94" marker-end="url(#b26q3-a1)"/>
  <text class="d-accent" x="380" y="24" text-anchor="middle">from index 1: reach 4, the last index</text>
</svg>

Index 0 can reach up to index 2. Index 1 is inside that range, and from it the reach becomes 1 + 3 = 4, the last index — done after looking at just two numbers.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="Array 3, 2, 1, 0, 4. Indices 0, 1 and 2 all reach exactly index 3, which holds 0. Index 4 is beyond the farthest reach, so the answer is false">
  <defs>
    <marker id="b26q3-a2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="80" y="125" text-anchor="middle">3</text>
  <text class="d-sub" x="80" y="145" text-anchor="middle">index 0</text>
  <rect class="d-box" x="160" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="200" y="125" text-anchor="middle">2</text>
  <text class="d-sub" x="200" y="145" text-anchor="middle">index 1</text>
  <rect class="d-box" x="280" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="320" y="125" text-anchor="middle">1</text>
  <text class="d-sub" x="320" y="145" text-anchor="middle">index 2</text>
  <rect class="d-box-accent" x="400" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="440" y="125" text-anchor="middle">0</text>
  <text class="d-sub" x="440" y="145" text-anchor="middle">index 3</text>
  <rect class="d-box-muted" x="520" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="560" y="125" text-anchor="middle">4</text>
  <text class="d-sub" x="560" y="145" text-anchor="middle">index 4</text>
  <path class="d-edge" d="M 80 96 C 80 10, 440 10, 440 94" marker-end="url(#b26q3-a2)"/>
  <path class="d-edge" d="M 200 96 C 200 45, 440 45, 440 94" marker-end="url(#b26q3-a2)"/>
  <path class="d-edge" d="M 320 96 C 320 75, 440 75, 440 94" marker-end="url(#b26q3-a2)"/>
  <text class="d-accent" x="560" y="60" text-anchor="middle">every reach ends at 3</text>
  <text class="d-sub" x="560" y="186" text-anchor="middle">unreachable</text>
</svg>

Every stone before the 0 reaches exactly index 3, and the 0 adds nothing. When the scan arrives at index 4, \`4 > farthest = 3\`, so the answer is false:

| i | nums[i] | i ≤ farthest? | farthest after |
| :--- | :--- | :--- | :--- |
| 0 | 3 | yes | 3 |
| 1 | 2 | yes | 3 |
| 2 | 1 | yes | 3 |
| 3 | 0 | yes | 3 |
| 4 | 4 | **no (4 > 3)** | return false |

📌 **Interview term: Loop invariant** — a statement that is true before every iteration of a loop. Here: "every index from 0 to \`farthest\` is reachable, and no index beyond it is reachable using only indices before i". It is what proves the scan correct.

**Why the greedy is correct, in two sentences.** The reachable indices form a prefix (shorter jumps are allowed), so tracking its right end loses no information. And every reachable index is visited by the scan before it could matter, so \`farthest\` ends up as large as any sequence of jumps could make it.

## 4. From Brute Force to One Pass

**Brute force (recursion).** From index i, try every jump length 1 to \`nums[i]\` and recurse. It is the definition written as code, and it can take exponential time because the same indices are explored again and again from different routes.

**Dynamic programming, O(n²).** Remember the answer per index. Let \`good[i]\` mean "the last index is reachable from i". The last index is good; going right to left, \`good[i]\` is true if any j in \`i+1 .. i+nums[i]\` is good. Each index may scan up to n others, so the worst case is O(n²). See [what dynamic programming is](/interview-question/what-is-dynamic-programming).

📌 **Interview term: Memoization / tabulation** — storing the answer to each subproblem (here, one per index) so it is computed once; tabulation fills the table in a loop, as \`good[]\` does.

**Greedy, O(n).** The farthest-reach scan from section 3. One pass, one variable.

**Greedy from the right, also O(n).** Keep \`goal\`, the leftmost index known to reach the end (start with the last index). Going right to left, if \`i + nums[i] >= goal\`, index i can reach the goal, so move \`goal = i\`. The answer is \`goal == 0\`. It is the DP with the table squeezed into one number: you only ever need the leftmost good index.

Example 2 runs all three (DP, forward greedy, backward greedy) on 2,000 random arrays — they agreed on every one — and then counts the work on the worst case for the DP, an array like \`[n-2, n-3, ..., 1, 0, 0]\` where every jump lands just short of the end:

| n | Greedy steps | DP inner steps |
| :--- | :--- | :--- |
| 1,000 | 1,000 | 498,501 |
| 2,000 | 2,000 | 1,997,001 |
| 4,000 | 4,000 | 7,994,001 |

Doubling n doubles the greedy work and roughly quadruples the DP work — linear versus quadratic, measured. The DP count is exactly (n − 1)(n − 2) / 2.

## 5. Follow-Up: Jump Game II (Fewest Jumps)

The usual next question: *assuming the end is reachable, what is the fewest number of jumps?* (LeetCode 45.)

Think of it as [breadth-first search](/interview-question/what-is-the-difference-between-bfs-and-dfs) where the "levels" are ranges of indices. Level 0 is index 0. Level 1 is every index reachable with one jump: \`1 .. nums[0]\`. Level 2 is everything reachable from level 1, and so on. Because reachable sets are prefixes, each level is a contiguous range, so you never need a queue — just the end of the current level and the farthest reach seen while scanning it.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="Jump Game II on 2, 3, 1, 1, 4. Level 0 is index 0. Level 1 is indices 1 and 2. Level 2 is indices 3 and 4, which contains the last index, so two jumps are needed">
  <rect class="d-box-muted" x="40" y="70" width="80" height="56" rx="8"/>
  <text class="d-text" x="80" y="103" text-anchor="middle">2</text>
  <rect class="d-box" x="160" y="70" width="80" height="56" rx="8"/>
  <text class="d-text" x="200" y="103" text-anchor="middle">3</text>
  <rect class="d-box" x="280" y="70" width="80" height="56" rx="8"/>
  <text class="d-text" x="320" y="103" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="400" y="70" width="80" height="56" rx="8"/>
  <text class="d-text" x="440" y="103" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="520" y="70" width="80" height="56" rx="8"/>
  <text class="d-text" x="560" y="103" text-anchor="middle">4</text>
  <text class="d-sub" x="80" y="40" text-anchor="middle">level 0</text>
  <text class="d-sub" x="260" y="40" text-anchor="middle">level 1: one jump</text>
  <text class="d-sub" x="500" y="40" text-anchor="middle">level 2: two jumps</text>
  <path class="d-edge" d="M 160 150 L 360 150"/>
  <path class="d-edge-accent" d="M 400 150 L 600 150"/>
  <text class="d-sub" x="260" y="180" text-anchor="middle">indices 1 to 2</text>
  <text class="d-sub" x="500" y="180" text-anchor="middle">indices 3 to 4</text>
</svg>

The last index is in level 2, so the answer is 2. The algorithm scans i from 0 to n − 2, keeps \`farthest = max(farthest, i + nums[i])\`, and whenever i reaches \`end\` (the end of the current level) it counts one more jump and sets \`end = farthest\`. That is O(n) time and O(1) space. Example 3 prints the answers for six arrays.

## 6. The Code in Java

~~~java
// True if you can reach the last index, where nums[i] is the longest jump from i.
static boolean canJump(int[] nums) {
    int farthest = 0;                        // farthest index reachable so far
    for (int i = 0; i < nums.length; i++) {
        if (i > farthest) return false;      // index i itself is out of reach
        farthest = Math.max(farthest, i + nums[i]);
        if (farthest >= nums.length - 1) return true;   // early exit: the end is covered
    }
    return true;
}
~~~

**What to point out in this code:**

- The \`i > farthest\` check comes **before** the update; otherwise an unreachable stone would extend the reach.
- \`Math.max(farthest, i + nums[i])\` never shrinks the reach.
- \`i + nums[i]\` is an \`int\` addition. With the usual limits (n ≤ 10^4, values ≤ 10^5) it is far below \`Integer.MAX_VALUE\`, but if values could be near 2^31 it would wrap to a negative number and the reach would *drop*; use \`long\` or \`Math.addExact\` then.
- \`System.out.println(boolean)\` prints \`true\` / \`false\`, so the examples print the result directly.
- No recursion: a recursive "try every jump" version is exponential and, on long arrays, risks a \`StackOverflowError\`.

The two other approaches from example 2, for comparison. \`boolean[] good = new boolean[n]\` starts all \`false\`, which is exactly the initial state the DP needs:

~~~java
// good[i] is true when the last index is reachable from i. O(n^2) in the worst case.
static boolean canJumpDp(int[] nums) {
    int n = nums.length;
    boolean[] good = new boolean[n];
    good[n - 1] = true;
    for (int i = n - 2; i >= 0; i--) {
        int last = Math.min(i + nums[i], n - 1);
        for (int j = i + 1; j <= last; j++) {
            work++;
            if (good[j]) { good[i] = true; break; }
        }
    }
    return good[0];
}

// Greedy from the right: the leftmost index known to reach the end.
static boolean canJumpBackward(int[] nums) {
    int goal = nums.length - 1;
    for (int i = nums.length - 2; i >= 0; i--) if (i + nums[i] >= goal) goal = i;
    return goal == 0;
}
~~~

The work counter in example 2 is a \`long\`: the DP count for n = 4,000 is almost 8 million, which fits in an \`int\`, but a counter that grows quadratically should not be an \`int\` by default.

And the Jump Game II follow-up:

~~~java
// Jump Game II: fewest jumps to reach the last index (assumes it is reachable).
// Think of BFS levels: indices up to end are reachable with jumps jumps.
static int minJumps(int[] nums) {
    int jumps = 0;
    int end = 0;         // last index reachable with the current number of jumps
    int farthest = 0;    // farthest index reachable with one more jump
    for (int i = 0; i < nums.length - 1; i++) {
        farthest = Math.max(farthest, i + nums[i]);
        if (i == end) {  // finished scanning this level: we must jump again
            jumps++;
            end = farthest;
            if (end >= nums.length - 1) break;
        }
    }
    return jumps;
}
~~~

## 7. Verified: Running the Code

Each example was saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21). The same three programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the greedy check on nine arrays** (the two classic examples, a single element, a leading zero, zeros you can and cannot jump over):

~~~text
true
false
true
false
true
false
false
false
true
~~~

**Example 2 — greedy vs DP vs backward greedy on 2,000 random arrays** from a seeded generator (the same arithmetic in all four languages), then the work counts on the DP worst case:

~~~text
random arrays: 2000, all three agree on 2000, reachable 1084
n=1000: answer false/false, greedy steps 1000, DP steps 498501
n=2000: answer false/false, greedy steps 2000, DP steps 1997001
n=4000: answer false/false, greedy steps 4000, DP steps 7994001
~~~

**Example 3 — Jump Game II, fewest jumps:**

~~~text
2
2
3
0
1
3
~~~

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Recursion, try every jump | exponential | O(n) stack | the same indices are re-explored from many routes |
| DP over \`boolean[] good\` | O(n²) | O(n) | each index may scan every later index; 7,994,001 steps for n = 4,000 |
| Greedy farthest reach | O(n) | O(1) | one pass, one \`int\`; 4,000 steps for n = 4,000 |
| Greedy from the right | O(n) | O(1) | one pass, one \`int\` (\`goal\`) |
| Jump Game II (BFS levels) | O(n) | O(1) | one pass with \`end\` and \`farthest\` |

See [Big-O notation](/interview-question/what-is-big-o-notation).

## 9. Edge Cases

- **One element** (\`[0]\`) — you are already on the last index: true, and zero jumps for Jump Game II.
- **A zero at the start** (\`[0, 1]\`) — you cannot move at all: false.
- **Zeros you can jump over** (\`[2, 0, 0]\` is true; \`[3, 0, 8, 2, 0, 0, 1]\` is true because the 8 carries you past the zeros).
- **A zero you cannot avoid** (\`[3, 2, 1, 0, 4]\`, \`[4, 0, 0, 0, 0, 1]\`) — every reach ends on or before it: false.
- **Huge jumps** — \`i + nums[i]\` can point far beyond the array; that is fine, it just means "the end is covered". In fixed-width integer languages, make sure \`i + nums[i]\` cannot overflow (it cannot with the usual limits of n ≤ 10^4 and nums[i] ≤ 10^5).
- **Empty array** — not allowed by the standard problem; if asked, decide and say what you return.

## Common Pitfalls

- **Updating \`farthest\` before checking \`i > farthest\`.** An unreachable stone would then extend the reach.
- **Shrinking the reach.** \`farthest = i + nums[i]\` instead of \`Math.max(...)\` forgets earlier long jumps.
- **Overflow in \`i + nums[i]\` with extreme values.** Harmless under the usual limits; with values near \`Integer.MAX_VALUE\` the sum wraps negative.
- **Recursion.** Exponential time and a \`StackOverflowError\` on long inputs.
- **Confusing Jump Game I and II.** The fewest-jumps loop runs while \`i < nums.length - 1\` and counts a jump when \`i == end\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Key fact:</strong> <span style="color:#f0e2c8;">Shorter jumps are allowed, so the reachable indices always form a <strong style="color:#ffca28;">prefix</strong> 0..farthest. One number describes them.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Algorithm:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for (int i = 0; i &lt; nums.length; i++)</code>: if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &gt; farthest</code> return false, else <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">farthest = Math.max(farthest, i + nums[i])</code>; return true once it covers the last index.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(1) space — one pass, no recursion, no table.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Alternatives:</strong> <span style="color:#f0e2c8;">Recursion is exponential (and risks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code>); the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">boolean[]</code> DP is O(n²). They agree with the greedy, just slower.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Follow-up:</strong> <span style="color:#f0e2c8;">Jump Game II: BFS by levels — count a jump each time <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> reaches the current level end, then extend the end to the farthest reach.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it safe to keep only one number instead of the set of reachable indices?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because shorter jumps are allowed: if i is reachable, so is every index up to i + nums[i]. The reachable set is therefore always a prefix 0..farthest, and its right end describes it completely.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the DP solution and why is it worse?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">good[i] is true if any index in i+1..i+nums[i] is good, filled from right to left. It is correct but O(n²) in the worst case: on our 4,000-element worst case it did 7,994,001 inner steps against the greedy 4,000.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you find the fewest jumps (Jump Game II)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Treat it as BFS by levels. Scan left to right keeping the farthest reach; each time i reaches the end of the current level, add one jump and set the new level end to the farthest reach. O(n) time, O(1) space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could i + nums[i] overflow in Java?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only if values approach <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.MAX_VALUE</code>. Under the usual constraints it cannot. If it could, compute the reach in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code>, or cap it: once it reaches the last index you can return true immediately, which the early exit already does.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Reachable index** | An index you can stand on through some sequence of legal jumps from index 0 |
| **Farthest reach** | The largest index known to be reachable so far; it describes the whole reachable prefix |
| **Loop invariant** | A statement true before every loop iteration, used to prove the loop correct |
| **Memoization / tabulation** | Storing each subproblem answer so it is computed once |
| **\`StackOverflowError\`** | Thrown when recursion nests deeper than the thread stack allows |

Related: [the Gas Station problem](/interview-question/how-do-you-solve-the-gas-station-problem) is another one-pass greedy with a two-sentence proof.

---
**Conclusion:** The Jump Game is a reachability question that looks like a search but collapses to one number: because shorter jumps are allowed, the reachable indices are always a prefix, so tracking the farthest reach in one \`for\` loop over the \`int[]\` — and failing the moment \`i > farthest\` — answers it in O(n) time and O(1) space. It agreed with the O(n²) DP on 2,000 random arrays in our run and did 4,000 steps where the DP did almost 8 million. Say the prefix argument out loud, mention the \`int\` overflow bound, then offer Jump Game II as BFS by levels.`,
        examples: [
          { label: `Greedy farthest-reach check (9 inputs)`, code: `public class Main {
    // True if you can reach the last index, where nums[i] is the longest jump from i.
    static boolean canJump(int[] nums) {
        int farthest = 0;                        // farthest index reachable so far
        for (int i = 0; i < nums.length; i++) {
            if (i > farthest) return false;      // index i itself is out of reach
            farthest = Math.max(farthest, i + nums[i]);
            if (farthest >= nums.length - 1) return true;   // early exit: the end is covered
        }
        return true;
    }

    public static void main(String[] args) {
        System.out.println(canJump(new int[]{2, 3, 1, 1, 4}));        // true
        System.out.println(canJump(new int[]{3, 2, 1, 0, 4}));        // false
        System.out.println(canJump(new int[]{0}));                    // true
        System.out.println(canJump(new int[]{0, 1}));                 // false
        System.out.println(canJump(new int[]{2, 0, 0}));              // true
        System.out.println(canJump(new int[]{1, 0, 1, 0}));           // false
        System.out.println(canJump(new int[]{4, 0, 0, 0, 0, 1}));     // false
        System.out.println(canJump(new int[]{1, 2, 0, 1, 0, 2, 0}));  // false
        System.out.println(canJump(new int[]{3, 0, 8, 2, 0, 0, 1}));  // true
    }
}` },
          { label: `Greedy vs DP vs backward greedy: 2,000 random arrays and work counts`, code: `public class Main {
    static long work = 0;

    static boolean canJumpGreedy(int[] nums) {
        int farthest = 0;
        for (int i = 0; i < nums.length; i++) {
            work++;
            if (i > farthest) return false;
            farthest = Math.max(farthest, i + nums[i]);
        }
        return true;
    }

    // good[i] is true when the last index is reachable from i. O(n^2) in the worst case.
    static boolean canJumpDp(int[] nums) {
        int n = nums.length;
        boolean[] good = new boolean[n];
        good[n - 1] = true;
        for (int i = n - 2; i >= 0; i--) {
            int last = Math.min(i + nums[i], n - 1);
            for (int j = i + 1; j <= last; j++) {
                work++;
                if (good[j]) { good[i] = true; break; }
            }
        }
        return good[0];
    }

    // Greedy from the right: the leftmost index known to reach the end.
    static boolean canJumpBackward(int[] nums) {
        int goal = nums.length - 1;
        for (int i = nums.length - 2; i >= 0; i--) if (i + nums[i] >= goal) goal = i;
        return goal == 0;
    }

    static long seed = 7;

    static int rnd(int m) {
        seed = seed * 48271 % 2147483647L;
        return (int) (seed % m);
    }

    public static void main(String[] args) {
        int trials = 2000, agree = 0, reachable = 0;
        for (int t = 0; t < trials; t++) {
            int n = 1 + rnd(12);
            int[] nums = new int[n];
            for (int i = 0; i < n; i++) nums[i] = rnd(4);
            boolean a = canJumpGreedy(nums), b = canJumpDp(nums), c = canJumpBackward(nums);
            if (a == b && b == c) agree++;
            if (a) reachable++;
        }
        System.out.println("random arrays: " + trials + ", all three agree on " + agree + ", reachable " + reachable);

        for (int n : new int[]{1000, 2000, 4000}) {
            int[] nums = new int[n];
            for (int i = 0; i < n - 1; i++) nums[i] = n - 2 - i;   // every jump lands just short
            work = 0;
            boolean g = canJumpGreedy(nums);
            long greedyWork = work;
            work = 0;
            boolean d = canJumpDp(nums);
            System.out.println("n=" + n + ": answer " + g + "/" + d + ", greedy steps " + greedyWork + ", DP steps " + work);
        }
    }
}` },
          { label: `Follow-up: Jump Game II (fewest jumps)`, code: `public class Main {
    // Jump Game II: fewest jumps to reach the last index (assumes it is reachable).
    // Think of BFS levels: indices up to end are reachable with jumps jumps.
    static int minJumps(int[] nums) {
        int jumps = 0;
        int end = 0;         // last index reachable with the current number of jumps
        int farthest = 0;    // farthest index reachable with one more jump
        for (int i = 0; i < nums.length - 1; i++) {
            farthest = Math.max(farthest, i + nums[i]);
            if (i == end) {  // finished scanning this level: we must jump again
                jumps++;
                end = farthest;
                if (end >= nums.length - 1) break;
            }
        }
        return jumps;
    }

    public static void main(String[] args) {
        System.out.println(minJumps(new int[]{2, 3, 1, 1, 4}));   // 2
        System.out.println(minJumps(new int[]{2, 3, 0, 1, 4}));   // 2
        System.out.println(minJumps(new int[]{1, 1, 1, 1}));      // 3
        System.out.println(minJumps(new int[]{0}));               // 0
        System.out.println(minJumps(new int[]{10, 1, 1}));        // 1
        System.out.println(minJumps(new int[]{1, 2, 1, 1, 1}));   // 3
    }
}` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You are given a \`vector<int>\` of non-negative integers. You start at index 0, and each value is the maximum jump length from that position. Write a C++ function that returns whether you can reach the last index."

**What a strong answer should cover:**
- The key observation: shorter jumps are allowed, so the reachable indices always form a prefix, and one number — the farthest reach — describes them.
- The one-pass greedy: return false as soon as \`i > farthest\`, otherwise update \`farthest = max(farthest, i + nums[i])\`; O(n) time, O(1) space.
- A correctness argument (the prefix / loop-invariant argument), not just the code.
- The slower alternatives and why they lose: recursion (exponential) and the \`good\` DP (O(n²)).
- C++ details: \`nums.size()\` is unsigned (\`size_t\`), so convert it to \`int\` before arithmetic like \`n - 1\`; pass the vector by \`const&\`; \`boolalpha\` to print \`true\`/\`false\`.
- The Jump Game II follow-up (fewest jumps) as BFS levels.

**Clarifying questions expected:**
- Is each value the maximum jump (shorter jumps allowed)?
- Do you want only yes/no, or the fewest jumps?

**Code / implementation expected:** Yes — \`bool canJump(const vector<int>& nums)\` in C++17, one pass.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know \`vector\`, loops and functions in C++; everything else is explained.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A row of stepping stones crosses a river. Painted on each stone is a number: the longest jump you can make from that stone (you may always jump shorter). You start on the first stone. Can you reach the last one?

With stones \`2 3 1 1 4\` it is easy: jump 1 to the "3", then 3 to the end. With stones \`3 2 1 0 4\` you are stuck — every route lands on the "0" and the "4" is out of reach. The puzzle is deciding which, quickly, for a row of a hundred thousand stones.

The natural first idea is to explore: from each stone try every jump length, like a maze. That works, but it explodes. The trick that makes this problem a favourite (LeetCode 55, "Jump Game") is to stop asking *which path* and ask only *how far can I possibly get?* One number, updated in a single pass, answers the question. It is a clean example of a [greedy algorithm](/interview-question/what-is-a-greedy-algorithm) whose correctness you can prove in two sentences — which is exactly what the interviewer wants to hear.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is \`nums[i]\` the *maximum* jump, so any shorter jump is allowed? | That is the standard problem, and it is what makes "reachable indices form a prefix" true. If the jump had to be exact, the greedy would not work. |
| Do I only need yes/no, or the fewest jumps, or the path? | Yes/no is Jump Game I; the fewest jumps is Jump Game II, a different (but also greedy) algorithm. |
| Can values be zero? Negative? | Zeros are the whole difficulty (they are the traps). Negative values would mean jumping backwards, which is a different, graph-search problem. |
| What is the size of the array? | Up to 10^4 or 10^5 rules out the O(n²) DP in a slow language and points to the O(n) pass. |
| Is a single-element array already "at the end"? | Yes in the standard problem: you start on the last index, so the answer is true. |

## 3. The Core Idea

📌 **Interview term: Reachable index** — an index you can stand on by some sequence of legal jumps from index 0.

Here is the key fact. If you can reach index i, and \`nums[i]\` is the longest jump from there, then **every** index from i to \`i + nums[i]\` is reachable — because shorter jumps are allowed. So the reachable indices never have gaps: they are always a block \`0, 1, ..., farthest\`.

📌 **Interview term: Farthest reach** — the largest index known to be reachable so far. Because reachable indices form a prefix, this one number describes the whole reachable set.

That turns the problem into one left-to-right scan:

1. Start with \`farthest = 0\`.
2. At each index i: if \`i > farthest\`, index i is not reachable — and neither is anything after it — so the answer is **false**.
3. Otherwise update \`farthest = max(farthest, i + nums[i])\`.
4. If \`farthest\` reaches the last index, the answer is **true**.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 240" role="img" aria-label="Array 2, 3, 1, 1, 4. From index 0 the reach is index 2. Index 1 holds 3 and extends the reach to index 4, the last index, so the answer is true">
  <defs>
    <marker id="b26q3-a1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="80" y="125" text-anchor="middle">2</text>
  <text class="d-sub" x="80" y="145" text-anchor="middle">index 0</text>
  <rect class="d-box" x="160" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="200" y="125" text-anchor="middle">3</text>
  <text class="d-sub" x="200" y="145" text-anchor="middle">index 1</text>
  <rect class="d-box" x="280" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="320" y="125" text-anchor="middle">1</text>
  <text class="d-sub" x="320" y="145" text-anchor="middle">index 2</text>
  <rect class="d-box" x="400" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="440" y="125" text-anchor="middle">1</text>
  <text class="d-sub" x="440" y="145" text-anchor="middle">index 3</text>
  <rect class="d-box-accent" x="520" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="560" y="125" text-anchor="middle">4</text>
  <text class="d-sub" x="560" y="145" text-anchor="middle">index 4</text>
  <path class="d-edge-dashed" d="M 80 160 C 80 205, 320 205, 320 162" marker-end="url(#b26q3-a1)"/>
  <text class="d-sub" x="200" y="226" text-anchor="middle">from index 0: reach 2</text>
  <path class="d-edge-accent" d="M 200 96 C 200 40, 560 40, 560 94" marker-end="url(#b26q3-a1)"/>
  <text class="d-accent" x="380" y="24" text-anchor="middle">from index 1: reach 4, the last index</text>
</svg>

Index 0 can reach up to index 2. Index 1 is inside that range, and from it the reach becomes 1 + 3 = 4, the last index — done after looking at just two numbers.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="Array 3, 2, 1, 0, 4. Indices 0, 1 and 2 all reach exactly index 3, which holds 0. Index 4 is beyond the farthest reach, so the answer is false">
  <defs>
    <marker id="b26q3-a2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="80" y="125" text-anchor="middle">3</text>
  <text class="d-sub" x="80" y="145" text-anchor="middle">index 0</text>
  <rect class="d-box" x="160" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="200" y="125" text-anchor="middle">2</text>
  <text class="d-sub" x="200" y="145" text-anchor="middle">index 1</text>
  <rect class="d-box" x="280" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="320" y="125" text-anchor="middle">1</text>
  <text class="d-sub" x="320" y="145" text-anchor="middle">index 2</text>
  <rect class="d-box-accent" x="400" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="440" y="125" text-anchor="middle">0</text>
  <text class="d-sub" x="440" y="145" text-anchor="middle">index 3</text>
  <rect class="d-box-muted" x="520" y="100" width="80" height="56" rx="8"/>
  <text class="d-text" x="560" y="125" text-anchor="middle">4</text>
  <text class="d-sub" x="560" y="145" text-anchor="middle">index 4</text>
  <path class="d-edge" d="M 80 96 C 80 10, 440 10, 440 94" marker-end="url(#b26q3-a2)"/>
  <path class="d-edge" d="M 200 96 C 200 45, 440 45, 440 94" marker-end="url(#b26q3-a2)"/>
  <path class="d-edge" d="M 320 96 C 320 75, 440 75, 440 94" marker-end="url(#b26q3-a2)"/>
  <text class="d-accent" x="560" y="60" text-anchor="middle">every reach ends at 3</text>
  <text class="d-sub" x="560" y="186" text-anchor="middle">unreachable</text>
</svg>

Every stone before the 0 reaches exactly index 3, and the 0 adds nothing. When the scan arrives at index 4, \`4 > farthest = 3\`, so the answer is false:

| i | nums[i] | i ≤ farthest? | farthest after |
| :--- | :--- | :--- | :--- |
| 0 | 3 | yes | 3 |
| 1 | 2 | yes | 3 |
| 2 | 1 | yes | 3 |
| 3 | 0 | yes | 3 |
| 4 | 4 | **no (4 > 3)** | return false |

📌 **Interview term: Loop invariant** — a statement that is true before every iteration of a loop. Here: "every index from 0 to \`farthest\` is reachable, and no index beyond it is reachable using only indices before i". It is what proves the scan correct.

**Why the greedy is correct, in two sentences.** The reachable indices form a prefix (shorter jumps are allowed), so tracking its right end loses no information. And every reachable index is visited by the scan before it could matter, so \`farthest\` ends up as large as any sequence of jumps could make it.

## 4. From Brute Force to One Pass

**Brute force (recursion).** From index i, try every jump length 1 to \`nums[i]\` and recurse. It is the definition written as code, and it can take exponential time because the same indices are explored again and again from different routes.

**Dynamic programming, O(n²).** Remember the answer per index. Let \`good[i]\` mean "the last index is reachable from i". The last index is good; going right to left, \`good[i]\` is true if any j in \`i+1 .. i+nums[i]\` is good. Each index may scan up to n others, so the worst case is O(n²). See [what dynamic programming is](/interview-question/what-is-dynamic-programming).

📌 **Interview term: Memoization / tabulation** — storing the answer to each subproblem (here, one per index) so it is computed once; tabulation fills the table in a loop, as \`good[]\` does.

**Greedy, O(n).** The farthest-reach scan from section 3. One pass, one variable.

**Greedy from the right, also O(n).** Keep \`goal\`, the leftmost index known to reach the end (start with the last index). Going right to left, if \`i + nums[i] >= goal\`, index i can reach the goal, so move \`goal = i\`. The answer is \`goal == 0\`. It is the DP with the table squeezed into one number: you only ever need the leftmost good index.

Example 2 runs all three (DP, forward greedy, backward greedy) on 2,000 random arrays — they agreed on every one — and then counts the work on the worst case for the DP, an array like \`[n-2, n-3, ..., 1, 0, 0]\` where every jump lands just short of the end:

| n | Greedy steps | DP inner steps |
| :--- | :--- | :--- |
| 1,000 | 1,000 | 498,501 |
| 2,000 | 2,000 | 1,997,001 |
| 4,000 | 4,000 | 7,994,001 |

Doubling n doubles the greedy work and roughly quadruples the DP work — linear versus quadratic, measured. The DP count is exactly (n − 1)(n − 2) / 2.

## 5. Follow-Up: Jump Game II (Fewest Jumps)

The usual next question: *assuming the end is reachable, what is the fewest number of jumps?* (LeetCode 45.)

Think of it as [breadth-first search](/interview-question/what-is-the-difference-between-bfs-and-dfs) where the "levels" are ranges of indices. Level 0 is index 0. Level 1 is every index reachable with one jump: \`1 .. nums[0]\`. Level 2 is everything reachable from level 1, and so on. Because reachable sets are prefixes, each level is a contiguous range, so you never need a queue — just the end of the current level and the farthest reach seen while scanning it.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="Jump Game II on 2, 3, 1, 1, 4. Level 0 is index 0. Level 1 is indices 1 and 2. Level 2 is indices 3 and 4, which contains the last index, so two jumps are needed">
  <rect class="d-box-muted" x="40" y="70" width="80" height="56" rx="8"/>
  <text class="d-text" x="80" y="103" text-anchor="middle">2</text>
  <rect class="d-box" x="160" y="70" width="80" height="56" rx="8"/>
  <text class="d-text" x="200" y="103" text-anchor="middle">3</text>
  <rect class="d-box" x="280" y="70" width="80" height="56" rx="8"/>
  <text class="d-text" x="320" y="103" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="400" y="70" width="80" height="56" rx="8"/>
  <text class="d-text" x="440" y="103" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="520" y="70" width="80" height="56" rx="8"/>
  <text class="d-text" x="560" y="103" text-anchor="middle">4</text>
  <text class="d-sub" x="80" y="40" text-anchor="middle">level 0</text>
  <text class="d-sub" x="260" y="40" text-anchor="middle">level 1: one jump</text>
  <text class="d-sub" x="500" y="40" text-anchor="middle">level 2: two jumps</text>
  <path class="d-edge" d="M 160 150 L 360 150"/>
  <path class="d-edge-accent" d="M 400 150 L 600 150"/>
  <text class="d-sub" x="260" y="180" text-anchor="middle">indices 1 to 2</text>
  <text class="d-sub" x="500" y="180" text-anchor="middle">indices 3 to 4</text>
</svg>

The last index is in level 2, so the answer is 2. The algorithm scans i from 0 to n − 2, keeps \`farthest = max(farthest, i + nums[i])\`, and whenever i reaches \`end\` (the end of the current level) it counts one more jump and sets \`end = farthest\`. That is O(n) time and O(1) space. Example 3 prints the answers for six arrays.

## 6. The Code in C++

~~~cpp
// True if you can reach the last index, where nums[i] is the longest jump from i.
bool canJump(const vector<int>& nums) {
    int n = (int)nums.size();          // signed copy: size() is unsigned (size_t)
    int farthest = 0;                  // farthest index reachable so far
    for (int i = 0; i < n; i++) {
        if (i > farthest) return false;            // index i itself is out of reach
        farthest = max(farthest, i + nums[i]);
        if (farthest >= n - 1) return true;        // early exit: the end is covered
    }
    return true;
}
~~~

**What to point out in this code:**

- \`int n = (int)nums.size();\` first. \`size()\` returns \`size_t\`, an **unsigned** type. Comparing a signed \`int\` with it, or computing \`nums.size() - 1\` on an empty vector, gives surprising results: \`0u - 1\` wraps around to the largest \`size_t\` value. Converting once at the top keeps all the arithmetic signed.
- The \`i > farthest\` check comes **before** the update; otherwise an unreachable stone would extend the reach.
- \`max(farthest, i + nums[i])\` never shrinks the reach. Under the usual limits the \`int\` sum cannot overflow; with values near \`INT_MAX\` it would be signed overflow (undefined behaviour), so you would switch to \`long long\`.
- \`const vector<int>& nums\` avoids copying the input.
- \`cout << boolalpha\` makes \`bool\` print as \`true\` / \`false\` instead of \`1\` / \`0\`.

The two other approaches from example 2, for comparison:

~~~cpp
// good[i] is true when the last index is reachable from i. O(n^2) in the worst case.
bool canJumpDp(const vector<int>& nums) {
    int n = (int)nums.size();
    vector<char> good(n, 0);           // vector<char>, not vector<bool>: plain bytes, no bit proxies
    good[n - 1] = 1;
    for (int i = n - 2; i >= 0; i--) {
        int last = min(i + nums[i], n - 1);
        for (int j = i + 1; j <= last; j++) {
            work++;
            if (good[j]) { good[i] = 1; break; }
        }
    }
    return good[0];
}

// Greedy from the right: the leftmost index known to reach the end.
bool canJumpBackward(const vector<int>& nums) {
    int goal = (int)nums.size() - 1;
    for (int i = (int)nums.size() - 2; i >= 0; i--) if (i + nums[i] >= goal) goal = i;
    return goal == 0;
}
~~~

\`vector<char>\` is used for the DP table instead of \`vector<bool>\`, which is a special space-saving specialisation that packs bits and hands out proxy objects rather than real \`bool&\` references — fine here, but a classic source of surprises, so plain bytes are the simpler choice.

And the Jump Game II follow-up:

~~~cpp
// Jump Game II: fewest jumps to reach the last index (assumes it is reachable).
// Think of BFS levels: indices up to end are reachable with jumps jumps.
int minJumps(const vector<int>& nums) {
    int n = (int)nums.size();
    int jumps = 0;
    int end = 0;         // last index reachable with the current number of jumps
    int farthest = 0;    // farthest index reachable with one more jump
    for (int i = 0; i < n - 1; i++) {   // with n as size_t, n - 1 would wrap for an empty vector
        farthest = max(farthest, i + nums[i]);
        if (i == end) {  // finished scanning this level: we must jump again
            jumps++;
            end = farthest;
            if (end >= n - 1) break;
        }
    }
    return jumps;
}
~~~

## 7. Verified: Running the Code

Each example was saved as \`main.cpp\` and run with \`g++ -std=c++17 -O2 main.cpp && ./a.out\` (GCC 13). The same three programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the greedy check on nine arrays** (the two classic examples, a single element, a leading zero, zeros you can and cannot jump over):

~~~text
true
false
true
false
true
false
false
false
true
~~~

**Example 2 — greedy vs DP vs backward greedy on 2,000 random arrays** from a seeded generator (the same arithmetic in all four languages), then the work counts on the DP worst case:

~~~text
random arrays: 2000, all three agree on 2000, reachable 1084
n=1000: answer false/false, greedy steps 1000, DP steps 498501
n=2000: answer false/false, greedy steps 2000, DP steps 1997001
n=4000: answer false/false, greedy steps 4000, DP steps 7994001
~~~

**Example 3 — Jump Game II, fewest jumps:**

~~~text
2
2
3
0
1
3
~~~

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Recursion, try every jump | exponential | O(n) stack | the same indices are re-explored from many routes |
| DP over \`good\` | O(n²) | O(n) | each index may scan every later index; 7,994,001 steps for n = 4,000 |
| Greedy farthest reach | O(n) | O(1) | one pass, one \`int\`; 4,000 steps for n = 4,000 |
| Greedy from the right | O(n) | O(1) | one pass, one \`int\` (\`goal\`) |
| Jump Game II (BFS levels) | O(n) | O(1) | one pass with \`end\` and \`farthest\` |

See [Big-O notation](/interview-question/what-is-big-o-notation).

## 9. Edge Cases

- **One element** (\`[0]\`) — you are already on the last index: true, and zero jumps for Jump Game II.
- **A zero at the start** (\`[0, 1]\`) — you cannot move at all: false.
- **Zeros you can jump over** (\`[2, 0, 0]\` is true; \`[3, 0, 8, 2, 0, 0, 1]\` is true because the 8 carries you past the zeros).
- **A zero you cannot avoid** (\`[3, 2, 1, 0, 4]\`, \`[4, 0, 0, 0, 0, 1]\`) — every reach ends on or before it: false.
- **Huge jumps** — \`i + nums[i]\` can point far beyond the array; that is fine, it just means "the end is covered". In fixed-width integer languages, make sure \`i + nums[i]\` cannot overflow (it cannot with the usual limits of n ≤ 10^4 and nums[i] ≤ 10^5).
- **Empty array** — not allowed by the standard problem; if asked, decide and say what you return.

## Common Pitfalls

- **Unsigned \`size()\` arithmetic.** \`nums.size() - 1\` on an empty vector is a huge number, and \`i < nums.size() - 1\` then loops far past the end. Convert to \`int\` first.
- **Updating \`farthest\` before checking \`i > farthest\`.** An unreachable stone would then extend the reach.
- **Shrinking the reach.** \`farthest = i + nums[i]\` instead of \`max(...)\` forgets earlier long jumps.
- **Signed overflow with extreme values.** \`i + nums[i]\` near \`INT_MAX\` is undefined behaviour; use \`long long\` if values can be that large.
- **Confusing Jump Game I and II.** The fewest-jumps loop runs while \`i < n - 1\` and counts a jump when \`i == end\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Key fact:</strong> <span style="color:#f0e2c8;">Shorter jumps are allowed, so the reachable indices always form a <strong style="color:#ffca28;">prefix</strong> 0..farthest. One number describes them.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Algorithm:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int n = (int)nums.size();</code> then for each i: if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &gt; farthest</code> return false, else <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">farthest = max(farthest, i + nums[i])</code>; return true once it covers <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n - 1</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(1) space — one pass, no recursion, no table.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Alternatives:</strong> <span style="color:#f0e2c8;">Recursion is exponential; the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">good</code> DP is O(n²). They agree with the greedy, just slower.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Follow-up:</strong> <span style="color:#f0e2c8;">Jump Game II: BFS by levels — count a jump each time <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> reaches the current level end, then extend the end to the farthest reach.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it safe to keep only one number instead of the set of reachable indices?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because shorter jumps are allowed: if i is reachable, so is every index up to i + nums[i]. The reachable set is therefore always a prefix 0..farthest, and its right end describes it completely.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the DP solution and why is it worse?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">good[i] is true if any index in i+1..i+nums[i] is good, filled from right to left. It is correct but O(n²) in the worst case: on our 4,000-element worst case it did 7,994,001 inner steps against the greedy 4,000.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you find the fewest jumps (Jump Game II)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Treat it as BFS by levels. Scan left to right keeping the farthest reach; each time i reaches the end of the current level, add one jump and set the new level end to the farthest reach. O(n) time, O(1) space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why convert nums.size() to int first?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size()</code> is unsigned. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums.size() - 1</code> on an empty vector wraps to the largest <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size_t</code>, and mixing it with a signed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> in a comparison converts <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> to unsigned too. One signed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n</code> at the top avoids both problems.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Reachable index** | An index you can stand on through some sequence of legal jumps from index 0 |
| **Farthest reach** | The largest index known to be reachable so far; it describes the whole reachable prefix |
| **Loop invariant** | A statement true before every loop iteration, used to prove the loop correct |
| **Memoization / tabulation** | Storing each subproblem answer so it is computed once |
| **\`size_t\`** | The unsigned type returned by \`size()\`; subtracting past zero wraps to a huge value |

Related: [the Gas Station problem](/interview-question/how-do-you-solve-the-gas-station-problem) is another one-pass greedy with a two-sentence proof.

---
**Conclusion:** The Jump Game is a reachability question that looks like a search but collapses to one number: because shorter jumps are allowed, the reachable indices are always a prefix, so tracking the farthest reach in one loop over the vector — after converting \`size()\` to a signed \`int\` — and failing the moment \`i > farthest\` answers it in O(n) time and O(1) space. It agreed with the O(n²) DP on 2,000 random arrays in our run and did 4,000 steps where the DP did almost 8 million. Say the prefix argument out loud, then offer Jump Game II as BFS by levels.`,
        examples: [
          { label: `Greedy farthest-reach check (9 inputs)`, code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

// True if you can reach the last index, where nums[i] is the longest jump from i.
bool canJump(const vector<int>& nums) {
    int n = (int)nums.size();          // signed copy: size() is unsigned (size_t)
    int farthest = 0;                  // farthest index reachable so far
    for (int i = 0; i < n; i++) {
        if (i > farthest) return false;            // index i itself is out of reach
        farthest = max(farthest, i + nums[i]);
        if (farthest >= n - 1) return true;        // early exit: the end is covered
    }
    return true;
}

int main() {
    cout << boolalpha;   // print true/false instead of 1/0
    cout << canJump({2, 3, 1, 1, 4}) << "\\n";        // true
    cout << canJump({3, 2, 1, 0, 4}) << "\\n";        // false
    cout << canJump({0}) << "\\n";                    // true
    cout << canJump({0, 1}) << "\\n";                 // false
    cout << canJump({2, 0, 0}) << "\\n";              // true
    cout << canJump({1, 0, 1, 0}) << "\\n";           // false
    cout << canJump({4, 0, 0, 0, 0, 1}) << "\\n";     // false
    cout << canJump({1, 2, 0, 1, 0, 2, 0}) << "\\n";  // false
    cout << canJump({3, 0, 8, 2, 0, 0, 1}) << "\\n";  // true
    return 0;
}` },
          { label: `Greedy vs DP vs backward greedy: 2,000 random arrays and work counts`, code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

long long work = 0;

bool canJumpGreedy(const vector<int>& nums) {
    int n = (int)nums.size(), farthest = 0;
    for (int i = 0; i < n; i++) {
        work++;
        if (i > farthest) return false;
        farthest = max(farthest, i + nums[i]);
    }
    return true;
}

// good[i] is true when the last index is reachable from i. O(n^2) in the worst case.
bool canJumpDp(const vector<int>& nums) {
    int n = (int)nums.size();
    vector<char> good(n, 0);           // vector<char>, not vector<bool>: plain bytes, no bit proxies
    good[n - 1] = 1;
    for (int i = n - 2; i >= 0; i--) {
        int last = min(i + nums[i], n - 1);
        for (int j = i + 1; j <= last; j++) {
            work++;
            if (good[j]) { good[i] = 1; break; }
        }
    }
    return good[0];
}

// Greedy from the right: the leftmost index known to reach the end.
bool canJumpBackward(const vector<int>& nums) {
    int goal = (int)nums.size() - 1;
    for (int i = (int)nums.size() - 2; i >= 0; i--) if (i + nums[i] >= goal) goal = i;
    return goal == 0;
}

long long seed = 7;
int rnd(int m) {
    seed = seed * 48271 % 2147483647LL;
    return (int)(seed % m);
}

int main() {
    cout << boolalpha;
    int trials = 2000, agree = 0, reachable = 0;
    for (int t = 0; t < trials; t++) {
        int n = 1 + rnd(12);
        vector<int> nums;
        for (int i = 0; i < n; i++) nums.push_back(rnd(4));
        bool a = canJumpGreedy(nums), b = canJumpDp(nums), c = canJumpBackward(nums);
        if (a == b && b == c) agree++;
        if (a) reachable++;
    }
    cout << "random arrays: " << trials << ", all three agree on " << agree << ", reachable " << reachable << "\\n";

    for (int n : {1000, 2000, 4000}) {
        vector<int> nums(n, 0);
        for (int i = 0; i < n - 1; i++) nums[i] = n - 2 - i;   // every jump lands just short
        work = 0;
        bool g = canJumpGreedy(nums);
        long long greedyWork = work;
        work = 0;
        bool d = canJumpDp(nums);
        cout << "n=" << n << ": answer " << g << "/" << d << ", greedy steps " << greedyWork << ", DP steps " << work << "\\n";
    }
    return 0;
}` },
          { label: `Follow-up: Jump Game II (fewest jumps)`, code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

// Jump Game II: fewest jumps to reach the last index (assumes it is reachable).
// Think of BFS levels: indices up to end are reachable with jumps jumps.
int minJumps(const vector<int>& nums) {
    int n = (int)nums.size();
    int jumps = 0;
    int end = 0;         // last index reachable with the current number of jumps
    int farthest = 0;    // farthest index reachable with one more jump
    for (int i = 0; i < n - 1; i++) {   // with n as size_t, n - 1 would wrap for an empty vector
        farthest = max(farthest, i + nums[i]);
        if (i == end) {  // finished scanning this level: we must jump again
            jumps++;
            end = farthest;
            if (end >= n - 1) break;
        }
    }
    return jumps;
}

int main() {
    cout << minJumps({2, 3, 1, 1, 4}) << "\\n";   // 2
    cout << minJumps({2, 3, 0, 1, 4}) << "\\n";   // 2
    cout << minJumps({1, 1, 1, 1}) << "\\n";      // 3
    cout << minJumps({0}) << "\\n";               // 0
    cout << minJumps({10, 1, 1}) << "\\n";        // 1
    cout << minJumps({1, 2, 1, 1, 1}) << "\\n";   // 3
    return 0;
}` },
        ],
      },
    },
  },
  {
    title: `How do you solve the Gas Station problem?`,
    difficulty: "medium",
    seoDescription: `Solve the Gas Station problem in one O(n) pass: total fuel decides if a start exists, a resetting tank finds it. Python, JavaScript, Java, C++ verified.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"There are n petrol stations on a circular road. Station i has \`gas[i]\` units of fuel, and driving from station i to the next one costs \`cost[i]\`. Your car starts empty with an unlimited tank. Write a Python function that returns the index of the station to start from to drive around the circle once, or -1 if that is impossible."

**What a strong answer should cover:**
- Reduce each station to its net gain \`gas[i] - cost[i]\`.
- Fact 1: if the total gain is negative, no start works; otherwise one does.
- Fact 2: if the tank goes negative after station j, no station from the current start to j can be a start, so jump to j + 1 and reset the tank.
- The one-pass solution with \`total\`, \`tank\` and \`start\`: O(n) time, O(1) space — and the prefix-sum argument for why the final start works.
- The O(n²) brute force as a baseline, and the \`% n\` wrap-around it needs.
- Python details: \`zip(gas, cost)\` or \`range(len(gas))\`, integers that cannot overflow, and that the answer is a station index (not a fuel amount).

**Clarifying questions expected:**
- Does the tank start empty, with no capacity limit?
- Is the answer guaranteed to be unique, and what should be returned when there is none?

**Code / implementation expected:** Yes — \`can_complete_circuit(gas, cost)\` in Python 3, one pass.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know lists, loops and functions in Python; everything else is explained.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A ring road has five petrol stations. Your car has an unlimited tank but starts **empty**. At each station you may fill up with whatever that station has, and driving to the next station burns a known amount of fuel. You want to drive all the way round once and come back where you started. Which station should you start from — or is the trip impossible?

Start at the wrong station and you are stranded a few kilometres later. The obvious approach is to try every station as a start and simulate the drive. That is correct, and for n stations it costs about n × n steps — fine for five stations, painful for a hundred thousand.

This is LeetCode 134, "Gas Station", and it is a favourite because the fast answer is a single pass with two running totals, yet it only makes sense once you see two small facts. The first decides *whether* any start works; the second lets you throw away a whole block of candidate starts at once. Interviewers want you to state both and argue why they are true — it is a compact test of [greedy reasoning](/interview-question/what-is-a-greedy-algorithm).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Does \`cost[i]\` mean the fuel to drive from station i to station i + 1 (and the last one back to station 0)? | That is the standard reading; it fixes the direction of travel and the wrap-around. |
| Does the tank start empty, and is its capacity unlimited? | Both are assumed by the standard problem. A capacity limit would break the greedy argument. |
| If several starts work, which one should I return? Is the answer guaranteed unique? | The LeetCode version promises a unique answer when one exists. Without that promise, the algorithm still returns a valid start; say which one. |
| What should I return when no start works? | Usually -1. |
| How many stations, and how large are the values? | Large n rules out the O(n²) simulation; large values decide whether running sums need a 64-bit type. |

## 3. The Core Idea

First simplify. At station i you gain \`gas[i]\` and then spend \`cost[i]\` to reach the next station, so all that matters is the **net gain** \`gain[i] = gas[i] - cost[i]\`. A start s works if, adding the gains in order around the circle from s, the running total never drops below zero.

📌 **Interview term: Net gain** — \`gas[i] - cost[i]\`, the change in fuel from arriving at station i to arriving at station i + 1.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="Five stations in a ring. Gas 1, 2, 3, 4, 5 and cost 3, 4, 5, 1, 2 give net gains of minus 2, minus 2, minus 2, plus 3 and plus 3. Station 3 is the start that works">
  <defs>
    <marker id="b26q4-a1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="100" height="70" rx="10"/>
  <text class="d-text" x="70" y="68" text-anchor="middle">station 0</text>
  <text class="d-sub" x="70" y="92" text-anchor="middle">1 - 3 = -2</text>
  <rect class="d-box" x="160" y="40" width="100" height="70" rx="10"/>
  <text class="d-text" x="210" y="68" text-anchor="middle">station 1</text>
  <text class="d-sub" x="210" y="92" text-anchor="middle">2 - 4 = -2</text>
  <rect class="d-box" x="300" y="40" width="100" height="70" rx="10"/>
  <text class="d-text" x="350" y="68" text-anchor="middle">station 2</text>
  <text class="d-sub" x="350" y="92" text-anchor="middle">3 - 5 = -2</text>
  <rect class="d-box-accent" x="440" y="40" width="100" height="70" rx="10"/>
  <text class="d-text" x="490" y="68" text-anchor="middle">station 3</text>
  <text class="d-sub" x="490" y="92" text-anchor="middle">4 - 1 = +3</text>
  <rect class="d-box" x="580" y="40" width="100" height="70" rx="10"/>
  <text class="d-text" x="630" y="68" text-anchor="middle">station 4</text>
  <text class="d-sub" x="630" y="92" text-anchor="middle">5 - 2 = +3</text>
  <path class="d-edge" d="M 122 75 L 156 75" marker-end="url(#b26q4-a1)"/>
  <path class="d-edge" d="M 262 75 L 296 75" marker-end="url(#b26q4-a1)"/>
  <path class="d-edge" d="M 402 75 L 436 75" marker-end="url(#b26q4-a1)"/>
  <path class="d-edge" d="M 542 75 L 576 75" marker-end="url(#b26q4-a1)"/>
  <path class="d-edge-dashed" d="M 630 112 C 630 190, 70 190, 70 114" marker-end="url(#b26q4-a1)"/>
  <text class="d-sub" x="350" y="204" text-anchor="middle">wrap-around</text>
</svg>

Each box shows \`gas - cost\` for that station. The dashed arrow is the wrap-around: after the last station you drive back to the first.

**Fact 1 — the total decides whether an answer exists.** Driving the whole circle collects every gain exactly once, whatever the start. If \`sum(gain) < 0\`, you end with less fuel than you started with (none), so no start can work: return -1. If \`sum(gain) >= 0\`, some start always works (the proof is in section 4).

**Fact 2 — a failure eliminates a whole block of starts.** Suppose you start at s and the tank first goes negative just after station j. Then **no station between s and j** can be a start either. Why: you arrived at any such station m with a tank that was at least 0 (it had not gone negative yet). Starting fresh at m means arriving there with exactly 0 — never more. Less fuel at m cannot get you further than before, so starting at m also fails at or before j.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 200" role="img" aria-label="Starting at s the tank goes negative after station j. Every station m between s and j arrived with a tank of at least zero, so starting at m with zero fuel also fails, and the next candidate is j plus 1">
  <defs>
    <marker id="b26q4-a2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="110" height="60" rx="10"/>
  <text class="d-text" x="75" y="88" text-anchor="middle">start s</text>
  <text class="d-sub" x="75" y="108" text-anchor="middle">tank 0</text>
  <rect class="d-box-muted" x="200" y="60" width="140" height="60" rx="10"/>
  <text class="d-text" x="270" y="88" text-anchor="middle">any m between</text>
  <text class="d-sub" x="270" y="108" text-anchor="middle">arrived with 0 or more</text>
  <rect class="d-box" x="410" y="60" width="110" height="60" rx="10"/>
  <text class="d-text" x="465" y="88" text-anchor="middle">station j</text>
  <text class="d-sub" x="465" y="108" text-anchor="middle">tank below 0</text>
  <rect class="d-box-accent" x="580" y="60" width="110" height="60" rx="10"/>
  <text class="d-text" x="635" y="88" text-anchor="middle">j + 1</text>
  <text class="d-sub" x="635" y="108" text-anchor="middle">next candidate</text>
  <path class="d-edge" d="M 132 90 L 196 90" marker-end="url(#b26q4-a2)"/>
  <path class="d-edge" d="M 342 90 L 406 90" marker-end="url(#b26q4-a2)"/>
  <path class="d-edge-accent" d="M 522 90 L 576 90" marker-end="url(#b26q4-a2)"/>
  <text class="d-sub" x="270" y="160" text-anchor="middle">starting at m with 0 fuel</text>
  <text class="d-sub" x="270" y="180" text-anchor="middle">fails by j as well</text>
</svg>

So when the tank goes negative, you do not try s + 1, s + 2, …; you jump straight to **j + 1** and reset the tank to 0. Every station is passed once. That is the whole algorithm:

1. \`total = 0\`, \`tank = 0\`, \`start = 0\`.
2. For each station i: add \`gain[i]\` to both \`total\` and \`tank\`. If \`tank < 0\`, set \`start = i + 1\` and \`tank = 0\`.
3. Return \`start\` if \`total >= 0\`, else -1.

📌 **Interview term: Candidate start** — the station the greedy is currently betting on; it only ever moves forward, past a block that has been proven useless.

Here is the trace for the five stations above (example 2 prints it):

| Station | Gain | Tank after | Action |
| :--- | :--- | :--- | :--- |
| 0 | -2 | -2 | reset, start = 1 |
| 1 | -2 | -2 | reset, start = 2 |
| 2 | -2 | -2 | reset, start = 3 |
| 3 | +3 | 3 | keep going |
| 4 | +3 | 6 | keep going |

The total is -2 - 2 - 2 + 3 + 3 = 0, which is not negative, so the answer is 3. Check it by hand: from station 3 the tank goes 3, 6, 4, 2, 0 — never negative.

## 4. Why the Last Candidate Always Works: the Prefix-Sum View

Fact 2 explains why skipped stations are useless. It remains to show that when \`total >= 0\`, the final \`start\` really completes the circle. The cleanest argument uses [prefix sums](/interview-question/what-is-the-prefix-sum-technique).

📌 **Interview term: Prefix sum** — \`P[i] = gain[0] + gain[1] + ... + gain[i]\`, the running total from station 0.

The fuel in the tank after driving from s through station j is \`P[j] - P[s-1]\` (for j at or after s). It is never negative exactly when \`P[s-1]\` is the **smallest** prefix sum. So the best start is the station right after the lowest point of the running sum:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Running sums for the five stations are minus 2, minus 4, minus 6, minus 3 and 0. The lowest point is after station 2, so the start is station 3">
  <path class="d-edge-dashed" d="M 60 50 L 600 50"/>
  <text class="d-sub" x="50" y="55" text-anchor="end">0</text>
  <text class="d-sub" x="50" y="255" text-anchor="end">-6</text>
  <path class="d-edge" d="M 60 50 L 140 117 L 240 183 L 340 250 L 440 150 L 540 50"/>
  <circle class="d-box" cx="140" cy="117" r="7"/>
  <circle class="d-box" cx="240" cy="183" r="7"/>
  <circle class="d-box-accent" cx="340" cy="250" r="9"/>
  <circle class="d-box" cx="440" cy="150" r="7"/>
  <circle class="d-box" cx="540" cy="50" r="7"/>
  <text class="d-sub" x="140" y="145" text-anchor="middle">-2</text>
  <text class="d-sub" x="240" y="211" text-anchor="middle">-4</text>
  <text class="d-accent" x="340" y="285" text-anchor="middle">-6, lowest</text>
  <text class="d-sub" x="462" y="178">-3</text>
  <text class="d-sub" x="540" y="80" text-anchor="middle">0</text>
  <text class="d-sub" x="140" y="30" text-anchor="middle">after 0</text>
  <text class="d-sub" x="240" y="30" text-anchor="middle">after 1</text>
  <text class="d-sub" x="340" y="30" text-anchor="middle">after 2</text>
  <text class="d-sub" x="440" y="30" text-anchor="middle">after 3</text>
  <text class="d-sub" x="540" y="30" text-anchor="middle">after 4</text>
</svg>

The running sum bottoms out at -6 after station 2, so station 3 is the start. Every point after the minimum is at least as high (the tank never goes negative to the end of the array), and for the wrap-around part the tank is \`total - P[s-1] + P[j]\`, which is at least \`total >= 0\` because \`P[j] >= P[s-1]\`. That completes the proof.

The resetting-tank greedy is the same thing in disguise: the tank goes negative exactly when the running sum hits a new lowest point, so \`start\` always ends up just after the (first) minimum. Example 2 checks this: on 3,000 random cases the greedy's answer was always a valid start, was -1 exactly when the brute force found none, and was always equal to the prefix-minimum answer.

**Brute force for comparison.** Try every start and simulate up to n stations: O(n²). Example 2 builds a worst case where only the last station works (every earlier start fails just before the end):

| n | Greedy steps | Brute-force steps |
| :--- | :--- | :--- |
| 1,000 | 1,000 | 500,500 |
| 2,000 | 2,000 | 2,001,000 |
| 4,000 | 4,000 | 8,002,000 |

Linear against quadratic, measured: doubling n doubles one and quadruples the other.

📌 **Interview term: Amortised single pass** — each station is looked at once in total, even though the candidate start moves; the work done for discarded candidates is never repeated.

## 5. The Code in Python

~~~python
def can_complete_circuit(gas, cost):
    """Index of the station to start from to drive the full circle once, or -1."""
    total = 0      # net fuel over the whole loop: decides IF an answer exists
    tank = 0       # fuel since the current candidate start: decides WHERE
    start = 0
    for i in range(len(gas)):
        gain = gas[i] - cost[i]
        total += gain
        tank += gain
        if tank < 0:            # cannot reach station i + 1 from start...
            start = i + 1       # ...nor from any station between start and i
            tank = 0
    return start if total >= 0 else -1
~~~

**What to point out in this code:**

- Two running totals with two jobs: \`total\` never resets and answers *whether* a start exists; \`tank\` resets and finds *where*.
- \`start = i + 1\` may briefly equal \`len(gas)\` (if the tank goes negative at the last station). That can only happen when \`total < 0\`, so the function returns -1 and never returns that out-of-range index.
- Python integers never overflow, so the totals are exact for any input size.
- A more Pythonic loop is \`for i, (g, c) in enumerate(zip(gas, cost)):\` — same algorithm, no indexing. The indexed form above mirrors the other languages.

The brute force and the prefix-minimum version used in example 2 to check the greedy:

~~~python
def completes_from(gas, cost, s):
    """Simulate the drive from station s; True if the tank never goes negative."""
    n = len(gas)
    tank = 0
    for step in range(n):
        work[0] += 1
        i = (s + step) % n
        tank += gas[i] - cost[i]
        if tank < 0:
            return False
    return True


def prefix_min(gas, cost):
    """Start right after the station where the running sum is lowest."""
    running, low, low_at = 0, 0, -1
    for i in range(len(gas)):
        running += gas[i] - cost[i]
        if running < low:
            low, low_at = running, i
    return (low_at + 1) % len(gas) if running >= 0 else -1
~~~

\`(s + step) % n\` is the wrap-around: after the last station, \`%\` brings the index back to 0. In \`prefix_min\`, \`low_at = -1\` stands for "the running sum before station 0", so if the sum never goes below 0 the start is \`(-1 + 1) % n = 0\`.

## 6. Verified: Running the Code

Each example was saved as one file and run with \`python3 main.py\` (Python 3.13). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the one-pass greedy on seven inputs** (the classic two, one station either way, a start at 0, a start at the last index, and a tie):

~~~text
3
-1
0
-1
0
4
0
~~~

**Example 2 — the tank trace for the five-station example, 3,000 random cases from a seeded generator (the same arithmetic in all four languages), and the work counts on the brute-force worst case:**

~~~text
station 0: gain -2, tank -2 -> reset, start = 1
station 1: gain -2, tank -2 -> reset, start = 2
station 2: gain -2, tank -2 -> reset, start = 3
station 3: gain 3, tank 3
station 4: gain 3, tank 6
random cases: 3000, greedy valid and equal to prefix-min on 3000, solvable 1643
n=1000: start 999/999, greedy steps 1000, brute force steps 500500
n=2000: start 1999/1999, greedy steps 2000, brute force steps 2001000
n=4000: start 3999/3999, greedy steps 4000, brute force steps 8002000
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force, simulate every start | O(n²) | O(1) | n starts × up to n stations; 8,002,000 steps for n = 4,000 |
| Prefix minimum | O(n) | O(1) | one pass to find the lowest running sum |
| Greedy with resetting tank | O(n) | O(1) | one pass, three integers; 4,000 steps for n = 4,000 |

See [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **One station** — \`[5]\`/\`[4]\` works (gain +1, start 0); \`[4]\`/\`[5]\` does not (-1). Both are in example 1.
- **Total exactly zero** — still solvable (\`[1, 2, 3, 4, 5]\`/\`[3, 4, 5, 1, 2]\` has total 0 and answer 3). The test is \`total >= 0\`, not \`> 0\`.
- **Several valid starts** — \`[1, 1]\`/\`[1, 1]\` can start anywhere; the greedy returns 0, the first start after the lowest running sum. The LeetCode version promises uniqueness, so this only matters if the interviewer drops that promise.
- **\`start\` ending up as n** — only happens if the tank goes negative at the last station. The running sum then reaches a new lowest point at the very end, below the earlier low (which is at most 0), so \`total < 0\` and the function returns -1; it never returns n.
- **Large values** — the running totals can be as large as n × max value. In 32-bit languages, check whether that fits (10^5 stations × 10^4 fuel = 10^9 fits in a 32-bit int; larger limits need 64 bits).

## Common Pitfalls

- **Using one total for both jobs.** Resetting the only running sum loses the information about whether *any* start works; keep \`total\` and \`tank\` separate.
- **\`total > 0\` instead of \`total >= 0\`.** A total of exactly 0 is solvable (the five-station example).
- **Moving \`start\` to \`start + 1\` instead of \`i + 1\`.** Still correct, but it re-simulates the skipped block and turns the solution back into O(n²) — Fact 2 is what makes it linear.
- **Forgetting the wrap-around in a simulation.** Without \`% n\` the brute force reads past the end of the list (\`IndexError\`) or never drives the stations before the start.
- **Returning the fuel left instead of the index.** The answer is a station number.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reduce:</strong> <span style="color:#f0e2c8;">Only the net gain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gas[i] - cost[i]</code> matters at each station.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Fact 1:</strong> <span style="color:#f0e2c8;">If the total gain is negative, no start can work: return -1. If it is 0 or more, a start exists.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Fact 2:</strong> <span style="color:#f0e2c8;">If the tank goes negative after station j, every start from the current one up to j fails too, so set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">start = i + 1</code> and reset <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tank = 0</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">One pass with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">total</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tank</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">start</code>: O(n) time, O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">Integers cannot overflow, so the totals are exact; use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">% n</code> only in the brute-force simulation, the greedy never wraps.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you skip every station between the old start and the failure point?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each of them was reached with a tank of at least zero. Starting there means arriving with exactly zero, which is no better, so it fails at the same point or earlier. The next possible start is the station after the failure.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does total &gt;= 0 guarantee the final start works?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Prefix-sum view: the final start comes right after the lowest running sum. From there the running total only rises above that low, and for the wrap-around part the tank is total minus the low plus a later prefix, which is at least total, so it never goes negative.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the brute force and its cost?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Try each start and simulate the full circle: O(n²). On our worst case with 4,000 stations it took 8,002,000 steps against the greedy 4,000.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this related to Kadane's algorithm?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both keep a running sum and reset it when it goes negative, because a negative prefix can only hurt what follows. Kadane tracks the best sum seen; here you track where the last reset happened.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Net gain** | \`gas[i] - cost[i]\`: fuel gained from station i to station i + 1 |
| **Candidate start** | The start the greedy is currently betting on; it only moves forward |
| **Prefix sum** | Running total of gains from station 0; the best start follows its lowest point |
| **Amortised single pass** | Every station is processed once in total, even though the candidate moves |
| **\`%\` (modulo)** | Remainder after division; \`(s + step) % n\` wraps an index around a circle |

Related: [the Jump Game](/interview-question/how-do-you-solve-the-jump-game) is another one-pass greedy; [Kadane's maximum subarray](/interview-question/how-do-you-find-the-maximum-subarray-sum) uses the same "reset when the running sum goes negative" move.

---
**Conclusion:** The Gas Station problem is solved by two observations: the total net gain decides whether any start exists, and a start that runs dry after station j rules out every station up to j. In Python that is one loop with three integers — \`total\`, a resetting \`tank\`, and \`start\` — in O(n) time and O(1) space, and the prefix-sum view proves the last candidate works. In our run it agreed with an O(n²) brute force and the prefix-minimum method on 3,000 random cases, and took 4,000 steps where the brute force took over 8 million.`,
        examples: [
          { label: `One-pass greedy on 7 inputs`, code: `def can_complete_circuit(gas, cost):
    """Index of the station to start from to drive the full circle once, or -1."""
    total = 0      # net fuel over the whole loop: decides IF an answer exists
    tank = 0       # fuel since the current candidate start: decides WHERE
    start = 0
    for i in range(len(gas)):
        gain = gas[i] - cost[i]
        total += gain
        tank += gain
        if tank < 0:            # cannot reach station i + 1 from start...
            start = i + 1       # ...nor from any station between start and i
            tank = 0
    return start if total >= 0 else -1


print(can_complete_circuit([1, 2, 3, 4, 5], [3, 4, 5, 1, 2]))  # 3
print(can_complete_circuit([2, 3, 4], [3, 4, 3]))  # -1
print(can_complete_circuit([5], [4]))  # 0
print(can_complete_circuit([4], [5]))  # -1
print(can_complete_circuit([3, 1, 1], [1, 2, 2]))  # 0
print(can_complete_circuit([5, 1, 2, 3, 4], [4, 4, 1, 5, 1]))  # 4
print(can_complete_circuit([1, 1], [1, 1]))  # 0` },
          { label: `Tank trace, 3,000 random cases vs brute force and prefix-min, and work counts`, code: `work = [0]


def greedy(gas, cost):
    total = tank = start = 0
    for i in range(len(gas)):
        work[0] += 1
        total += gas[i] - cost[i]
        tank += gas[i] - cost[i]
        if tank < 0:
            start, tank = i + 1, 0
    return start if total >= 0 else -1


def completes_from(gas, cost, s):
    """Simulate the drive from station s; True if the tank never goes negative."""
    n = len(gas)
    tank = 0
    for step in range(n):
        work[0] += 1
        i = (s + step) % n
        tank += gas[i] - cost[i]
        if tank < 0:
            return False
    return True


def brute_force(gas, cost):
    """Try every start: O(n^2)."""
    for s in range(len(gas)):
        if completes_from(gas, cost, s):
            return s
    return -1


def prefix_min(gas, cost):
    """Start right after the station where the running sum is lowest."""
    running, low, low_at = 0, 0, -1
    for i in range(len(gas)):
        running += gas[i] - cost[i]
        if running < low:
            low, low_at = running, i
    return (low_at + 1) % len(gas) if running >= 0 else -1


gas, cost = [1, 2, 3, 4, 5], [3, 4, 5, 1, 2]
tank, start = 0, 0
for i in range(len(gas)):
    tank += gas[i] - cost[i]
    line = "station " + str(i) + ": gain " + str(gas[i] - cost[i]) + ", tank " + str(tank)
    if tank < 0:
        start, tank = i + 1, 0
        line += " -> reset, start = " + str(start)
    print(line)

seed = [11]


def rnd(m):
    seed[0] = seed[0] * 48271 % 2147483647
    return seed[0] % m


trials, valid, solvable = 3000, 0, 0
for _ in range(trials):
    n = 1 + rnd(8)
    g = [rnd(6) for _ in range(n)]
    c = [rnd(6) for _ in range(n)]
    b, a, p = brute_force(g, c), greedy(g, c), prefix_min(g, c)
    ok = (a == -1) == (b == -1) and (a == -1 or completes_from(g, c, a)) and a == p
    if ok:
        valid += 1
    if b != -1:
        solvable += 1
print("random cases: " + str(trials) + ", greedy valid and equal to prefix-min on " + str(valid) + ", solvable " + str(solvable))

for n in [1000, 2000, 4000]:
    g = [1] * n
    c = [1] * n
    c[n - 2], g[n - 1] = 2, 2                 # only the last station works as a start
    work[0] = 0
    a = greedy(g, c)
    greedy_work = work[0]
    work[0] = 0
    b = brute_force(g, c)
    print("n=" + str(n) + ": start " + str(a) + "/" + str(b) + ", greedy steps " + str(greedy_work) + ", brute force steps " + str(work[0]))` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"There are n petrol stations on a circular road. Station i has \`gas[i]\` units of fuel, and driving from station i to the next one costs \`cost[i]\`. Your car starts empty with an unlimited tank. Write a JavaScript function that returns the index of the station to start from to drive around the circle once, or -1 if that is impossible."

**What a strong answer should cover:**
- Reduce each station to its net gain \`gas[i] - cost[i]\`.
- Fact 1: if the total gain is negative, no start works; otherwise one does.
- Fact 2: if the tank goes negative after station j, no station from the current start to j can be a start, so jump to j + 1 and reset the tank.
- The one-pass solution with \`total\`, \`tank\` and \`start\`: O(n) time, O(1) space — and the prefix-sum argument for why the final start works.
- The O(n²) brute force as a baseline, and the \`% n\` wrap-around it needs.
- JavaScript details: integer sums are exact up to \`Number.MAX_SAFE_INTEGER\`, and reading past the end of an array gives \`undefined\` (so \`gain\` becomes \`NaN\`) instead of throwing.

**Clarifying questions expected:**
- Does the tank start empty, with no capacity limit?
- Is the answer guaranteed to be unique, and what should be returned when there is none?

**Code / implementation expected:** Yes — \`canCompleteCircuit(gas, cost)\` in JavaScript, one pass.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays, loops and functions in JavaScript; everything else is explained.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A ring road has five petrol stations. Your car has an unlimited tank but starts **empty**. At each station you may fill up with whatever that station has, and driving to the next station burns a known amount of fuel. You want to drive all the way round once and come back where you started. Which station should you start from — or is the trip impossible?

Start at the wrong station and you are stranded a few kilometres later. The obvious approach is to try every station as a start and simulate the drive. That is correct, and for n stations it costs about n × n steps — fine for five stations, painful for a hundred thousand.

This is LeetCode 134, "Gas Station", and it is a favourite because the fast answer is a single pass with two running totals, yet it only makes sense once you see two small facts. The first decides *whether* any start works; the second lets you throw away a whole block of candidate starts at once. Interviewers want you to state both and argue why they are true — it is a compact test of [greedy reasoning](/interview-question/what-is-a-greedy-algorithm).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Does \`cost[i]\` mean the fuel to drive from station i to station i + 1 (and the last one back to station 0)? | That is the standard reading; it fixes the direction of travel and the wrap-around. |
| Does the tank start empty, and is its capacity unlimited? | Both are assumed by the standard problem. A capacity limit would break the greedy argument. |
| If several starts work, which one should I return? Is the answer guaranteed unique? | The LeetCode version promises a unique answer when one exists. Without that promise, the algorithm still returns a valid start; say which one. |
| What should I return when no start works? | Usually -1. |
| How many stations, and how large are the values? | Large n rules out the O(n²) simulation; large values decide whether running sums need a 64-bit type. |

## 3. The Core Idea

First simplify. At station i you gain \`gas[i]\` and then spend \`cost[i]\` to reach the next station, so all that matters is the **net gain** \`gain[i] = gas[i] - cost[i]\`. A start s works if, adding the gains in order around the circle from s, the running total never drops below zero.

📌 **Interview term: Net gain** — \`gas[i] - cost[i]\`, the change in fuel from arriving at station i to arriving at station i + 1.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="Five stations in a ring. Gas 1, 2, 3, 4, 5 and cost 3, 4, 5, 1, 2 give net gains of minus 2, minus 2, minus 2, plus 3 and plus 3. Station 3 is the start that works">
  <defs>
    <marker id="b26q4-a1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="100" height="70" rx="10"/>
  <text class="d-text" x="70" y="68" text-anchor="middle">station 0</text>
  <text class="d-sub" x="70" y="92" text-anchor="middle">1 - 3 = -2</text>
  <rect class="d-box" x="160" y="40" width="100" height="70" rx="10"/>
  <text class="d-text" x="210" y="68" text-anchor="middle">station 1</text>
  <text class="d-sub" x="210" y="92" text-anchor="middle">2 - 4 = -2</text>
  <rect class="d-box" x="300" y="40" width="100" height="70" rx="10"/>
  <text class="d-text" x="350" y="68" text-anchor="middle">station 2</text>
  <text class="d-sub" x="350" y="92" text-anchor="middle">3 - 5 = -2</text>
  <rect class="d-box-accent" x="440" y="40" width="100" height="70" rx="10"/>
  <text class="d-text" x="490" y="68" text-anchor="middle">station 3</text>
  <text class="d-sub" x="490" y="92" text-anchor="middle">4 - 1 = +3</text>
  <rect class="d-box" x="580" y="40" width="100" height="70" rx="10"/>
  <text class="d-text" x="630" y="68" text-anchor="middle">station 4</text>
  <text class="d-sub" x="630" y="92" text-anchor="middle">5 - 2 = +3</text>
  <path class="d-edge" d="M 122 75 L 156 75" marker-end="url(#b26q4-a1)"/>
  <path class="d-edge" d="M 262 75 L 296 75" marker-end="url(#b26q4-a1)"/>
  <path class="d-edge" d="M 402 75 L 436 75" marker-end="url(#b26q4-a1)"/>
  <path class="d-edge" d="M 542 75 L 576 75" marker-end="url(#b26q4-a1)"/>
  <path class="d-edge-dashed" d="M 630 112 C 630 190, 70 190, 70 114" marker-end="url(#b26q4-a1)"/>
  <text class="d-sub" x="350" y="204" text-anchor="middle">wrap-around</text>
</svg>

Each box shows \`gas - cost\` for that station. The dashed arrow is the wrap-around: after the last station you drive back to the first.

**Fact 1 — the total decides whether an answer exists.** Driving the whole circle collects every gain exactly once, whatever the start. If \`sum(gain) < 0\`, you end with less fuel than you started with (none), so no start can work: return -1. If \`sum(gain) >= 0\`, some start always works (the proof is in section 4).

**Fact 2 — a failure eliminates a whole block of starts.** Suppose you start at s and the tank first goes negative just after station j. Then **no station between s and j** can be a start either. Why: you arrived at any such station m with a tank that was at least 0 (it had not gone negative yet). Starting fresh at m means arriving there with exactly 0 — never more. Less fuel at m cannot get you further than before, so starting at m also fails at or before j.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 200" role="img" aria-label="Starting at s the tank goes negative after station j. Every station m between s and j arrived with a tank of at least zero, so starting at m with zero fuel also fails, and the next candidate is j plus 1">
  <defs>
    <marker id="b26q4-a2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="110" height="60" rx="10"/>
  <text class="d-text" x="75" y="88" text-anchor="middle">start s</text>
  <text class="d-sub" x="75" y="108" text-anchor="middle">tank 0</text>
  <rect class="d-box-muted" x="200" y="60" width="140" height="60" rx="10"/>
  <text class="d-text" x="270" y="88" text-anchor="middle">any m between</text>
  <text class="d-sub" x="270" y="108" text-anchor="middle">arrived with 0 or more</text>
  <rect class="d-box" x="410" y="60" width="110" height="60" rx="10"/>
  <text class="d-text" x="465" y="88" text-anchor="middle">station j</text>
  <text class="d-sub" x="465" y="108" text-anchor="middle">tank below 0</text>
  <rect class="d-box-accent" x="580" y="60" width="110" height="60" rx="10"/>
  <text class="d-text" x="635" y="88" text-anchor="middle">j + 1</text>
  <text class="d-sub" x="635" y="108" text-anchor="middle">next candidate</text>
  <path class="d-edge" d="M 132 90 L 196 90" marker-end="url(#b26q4-a2)"/>
  <path class="d-edge" d="M 342 90 L 406 90" marker-end="url(#b26q4-a2)"/>
  <path class="d-edge-accent" d="M 522 90 L 576 90" marker-end="url(#b26q4-a2)"/>
  <text class="d-sub" x="270" y="160" text-anchor="middle">starting at m with 0 fuel</text>
  <text class="d-sub" x="270" y="180" text-anchor="middle">fails by j as well</text>
</svg>

So when the tank goes negative, you do not try s + 1, s + 2, …; you jump straight to **j + 1** and reset the tank to 0. Every station is passed once. That is the whole algorithm:

1. \`total = 0\`, \`tank = 0\`, \`start = 0\`.
2. For each station i: add \`gain[i]\` to both \`total\` and \`tank\`. If \`tank < 0\`, set \`start = i + 1\` and \`tank = 0\`.
3. Return \`start\` if \`total >= 0\`, else -1.

📌 **Interview term: Candidate start** — the station the greedy is currently betting on; it only ever moves forward, past a block that has been proven useless.

Here is the trace for the five stations above (example 2 prints it):

| Station | Gain | Tank after | Action |
| :--- | :--- | :--- | :--- |
| 0 | -2 | -2 | reset, start = 1 |
| 1 | -2 | -2 | reset, start = 2 |
| 2 | -2 | -2 | reset, start = 3 |
| 3 | +3 | 3 | keep going |
| 4 | +3 | 6 | keep going |

The total is -2 - 2 - 2 + 3 + 3 = 0, which is not negative, so the answer is 3. Check it by hand: from station 3 the tank goes 3, 6, 4, 2, 0 — never negative.

## 4. Why the Last Candidate Always Works: the Prefix-Sum View

Fact 2 explains why skipped stations are useless. It remains to show that when \`total >= 0\`, the final \`start\` really completes the circle. The cleanest argument uses [prefix sums](/interview-question/what-is-the-prefix-sum-technique).

📌 **Interview term: Prefix sum** — \`P[i] = gain[0] + gain[1] + ... + gain[i]\`, the running total from station 0.

The fuel in the tank after driving from s through station j is \`P[j] - P[s-1]\` (for j at or after s). It is never negative exactly when \`P[s-1]\` is the **smallest** prefix sum. So the best start is the station right after the lowest point of the running sum:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Running sums for the five stations are minus 2, minus 4, minus 6, minus 3 and 0. The lowest point is after station 2, so the start is station 3">
  <path class="d-edge-dashed" d="M 60 50 L 600 50"/>
  <text class="d-sub" x="50" y="55" text-anchor="end">0</text>
  <text class="d-sub" x="50" y="255" text-anchor="end">-6</text>
  <path class="d-edge" d="M 60 50 L 140 117 L 240 183 L 340 250 L 440 150 L 540 50"/>
  <circle class="d-box" cx="140" cy="117" r="7"/>
  <circle class="d-box" cx="240" cy="183" r="7"/>
  <circle class="d-box-accent" cx="340" cy="250" r="9"/>
  <circle class="d-box" cx="440" cy="150" r="7"/>
  <circle class="d-box" cx="540" cy="50" r="7"/>
  <text class="d-sub" x="140" y="145" text-anchor="middle">-2</text>
  <text class="d-sub" x="240" y="211" text-anchor="middle">-4</text>
  <text class="d-accent" x="340" y="285" text-anchor="middle">-6, lowest</text>
  <text class="d-sub" x="462" y="178">-3</text>
  <text class="d-sub" x="540" y="80" text-anchor="middle">0</text>
  <text class="d-sub" x="140" y="30" text-anchor="middle">after 0</text>
  <text class="d-sub" x="240" y="30" text-anchor="middle">after 1</text>
  <text class="d-sub" x="340" y="30" text-anchor="middle">after 2</text>
  <text class="d-sub" x="440" y="30" text-anchor="middle">after 3</text>
  <text class="d-sub" x="540" y="30" text-anchor="middle">after 4</text>
</svg>

The running sum bottoms out at -6 after station 2, so station 3 is the start. Every point after the minimum is at least as high (the tank never goes negative to the end of the array), and for the wrap-around part the tank is \`total - P[s-1] + P[j]\`, which is at least \`total >= 0\` because \`P[j] >= P[s-1]\`. That completes the proof.

The resetting-tank greedy is the same thing in disguise: the tank goes negative exactly when the running sum hits a new lowest point, so \`start\` always ends up just after the (first) minimum. Example 2 checks this: on 3,000 random cases the greedy's answer was always a valid start, was -1 exactly when the brute force found none, and was always equal to the prefix-minimum answer.

**Brute force for comparison.** Try every start and simulate up to n stations: O(n²). Example 2 builds a worst case where only the last station works (every earlier start fails just before the end):

| n | Greedy steps | Brute-force steps |
| :--- | :--- | :--- |
| 1,000 | 1,000 | 500,500 |
| 2,000 | 2,000 | 2,001,000 |
| 4,000 | 4,000 | 8,002,000 |

Linear against quadratic, measured: doubling n doubles one and quadruples the other.

📌 **Interview term: Amortised single pass** — each station is looked at once in total, even though the candidate start moves; the work done for discarded candidates is never repeated.

## 5. The Code in JavaScript

~~~javascript
function canCompleteCircuit(gas, cost) {
  // Index of the station to start from to drive the full circle once, or -1.
  let total = 0;   // net fuel over the whole loop: decides IF an answer exists
  let tank = 0;    // fuel since the current candidate start: decides WHERE
  let start = 0;
  for (let i = 0; i < gas.length; i++) {
    const gain = gas[i] - cost[i];
    total += gain;
    tank += gain;
    if (tank < 0) {     // cannot reach station i + 1 from start...
      start = i + 1;    // ...nor from any station between start and i
      tank = 0;
    }
  }
  return total >= 0 ? start : -1;
}
~~~

**What to point out in this code:**

- Two running totals with two jobs: \`total\` never resets and answers *whether* a start exists; \`tank\` resets and finds *where*.
- \`start = i + 1\` may briefly equal \`gas.length\` (if the tank goes negative at the last station). That can only happen when \`total < 0\`, so the function returns -1 and never returns that out-of-range index.
- Sums of integers are exact in JavaScript up to \`Number.MAX_SAFE_INTEGER\` (about 9 × 10^15), far above any realistic fuel total.
- \`const gain\` is block-scoped to each iteration; \`let\` is needed for the three values that change.

The brute force and the prefix-minimum version used in example 2 to check the greedy:

~~~javascript
function completesFrom(gas, cost, s) {
  // Simulate the drive from station s; true if the tank never goes negative.
  const n = gas.length;
  let tank = 0;
  for (let step = 0; step < n; step++) {
    work++;
    const i = (s + step) % n;
    tank += gas[i] - cost[i];
    if (tank < 0) return false;
  }
  return true;
}

function prefixMin(gas, cost) {
  // Start right after the station where the running sum is lowest.
  let running = 0, low = 0, lowAt = -1;
  for (let i = 0; i < gas.length; i++) {
    running += gas[i] - cost[i];
    if (running < low) { low = running; lowAt = i; }
  }
  return running >= 0 ? (lowAt + 1) % gas.length : -1;
}
~~~

\`(s + step) % n\` is the wrap-around. Forget it and \`gas[i]\` past the end is \`undefined\`, \`undefined - undefined\` is \`NaN\`, and \`NaN < 0\` is \`false\` — so the broken simulation silently "succeeds" instead of throwing an error. In \`prefixMin\`, \`lowAt = -1\` stands for "the running sum before station 0".

## 6. Verified: Running the Code

Each example was saved as one file and run with \`node main.js\` (Node 22); they use only \`console.log\`, so they also run in a browser. The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the one-pass greedy on seven inputs** (the classic two, one station either way, a start at 0, a start at the last index, and a tie):

~~~text
3
-1
0
-1
0
4
0
~~~

**Example 2 — the tank trace for the five-station example, 3,000 random cases from a seeded generator (the same arithmetic in all four languages), and the work counts on the brute-force worst case:**

~~~text
station 0: gain -2, tank -2 -> reset, start = 1
station 1: gain -2, tank -2 -> reset, start = 2
station 2: gain -2, tank -2 -> reset, start = 3
station 3: gain 3, tank 3
station 4: gain 3, tank 6
random cases: 3000, greedy valid and equal to prefix-min on 3000, solvable 1643
n=1000: start 999/999, greedy steps 1000, brute force steps 500500
n=2000: start 1999/1999, greedy steps 2000, brute force steps 2001000
n=4000: start 3999/3999, greedy steps 4000, brute force steps 8002000
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force, simulate every start | O(n²) | O(1) | n starts × up to n stations; 8,002,000 steps for n = 4,000 |
| Prefix minimum | O(n) | O(1) | one pass to find the lowest running sum |
| Greedy with resetting tank | O(n) | O(1) | one pass, three numbers; 4,000 steps for n = 4,000 |

See [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **One station** — \`[5]\`/\`[4]\` works (gain +1, start 0); \`[4]\`/\`[5]\` does not (-1). Both are in example 1.
- **Total exactly zero** — still solvable (\`[1, 2, 3, 4, 5]\`/\`[3, 4, 5, 1, 2]\` has total 0 and answer 3). The test is \`total >= 0\`, not \`> 0\`.
- **Several valid starts** — \`[1, 1]\`/\`[1, 1]\` can start anywhere; the greedy returns 0, the first start after the lowest running sum. The LeetCode version promises uniqueness, so this only matters if the interviewer drops that promise.
- **\`start\` ending up as n** — only happens if the tank goes negative at the last station. The running sum then reaches a new lowest point at the very end, below the earlier low (which is at most 0), so \`total < 0\` and the function returns -1; it never returns n.
- **Large values** — the running totals can be as large as n × max value. In 32-bit languages, check whether that fits (10^5 stations × 10^4 fuel = 10^9 fits in a 32-bit int; larger limits need 64 bits).

## Common Pitfalls

- **Using one total for both jobs.** Resetting the only running sum loses the information about whether *any* start works; keep \`total\` and \`tank\` separate.
- **\`total > 0\` instead of \`total >= 0\`.** A total of exactly 0 is solvable (the five-station example).
- **Moving \`start\` to \`start + 1\` instead of \`i + 1\`.** Still correct, but it re-simulates the skipped block and is O(n²) again.
- **Out-of-range reads that do not throw.** Without \`% n\`, \`gas[n]\` is \`undefined\` and the arithmetic turns into \`NaN\`, which fails every comparison quietly.
- **Returning the fuel left instead of the index.** The answer is a station number.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reduce:</strong> <span style="color:#f0e2c8;">Only the net gain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gas[i] - cost[i]</code> matters at each station.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Fact 1:</strong> <span style="color:#f0e2c8;">If the total gain is negative, no start can work: return -1. If it is 0 or more, a start exists.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Fact 2:</strong> <span style="color:#f0e2c8;">If the tank goes negative after station j, every start from the current one up to j fails too, so set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">start = i + 1</code> and reset <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tank = 0</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">One pass with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">total</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tank</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">start</code>: O(n) time, O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">Sums stay exact below <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Number.MAX_SAFE_INTEGER</code>; in a simulation, always wrap with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">% n</code>, because reading past the end gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NaN</code>, not an error.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you skip every station between the old start and the failure point?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each of them was reached with a tank of at least zero. Starting there means arriving with exactly zero, which is no better, so it fails at the same point or earlier. The next possible start is the station after the failure.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does total &gt;= 0 guarantee the final start works?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Prefix-sum view: the final start comes right after the lowest running sum. From there the running total only rises above that low, and for the wrap-around part the tank is total minus the low plus a later prefix, which is at least total, so it never goes negative.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the brute force and its cost?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Try each start and simulate the full circle: O(n²). On our worst case with 4,000 stations it took 8,002,000 steps against the greedy 4,000.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this related to Kadane's algorithm?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both keep a running sum and reset it when it goes negative, because a negative prefix can only hurt what follows. Kadane tracks the best sum seen; here you track where the last reset happened.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Net gain** | \`gas[i] - cost[i]\`: fuel gained from station i to station i + 1 |
| **Candidate start** | The start the greedy is currently betting on; it only moves forward |
| **Prefix sum** | Running total of gains from station 0; the best start follows its lowest point |
| **Amortised single pass** | Every station is processed once in total, even though the candidate moves |
| **\`NaN\`** | "Not a number": the result of arithmetic on \`undefined\`; every comparison with it is \`false\` |

Related: [the Jump Game](/interview-question/how-do-you-solve-the-jump-game) is another one-pass greedy; [Kadane's maximum subarray](/interview-question/how-do-you-find-the-maximum-subarray-sum) uses the same "reset when the running sum goes negative" move.

---
**Conclusion:** The Gas Station problem is solved by two observations: the total net gain decides whether any start exists, and a start that runs dry after station j rules out every station up to j. In JavaScript that is one \`for\` loop with three numbers — \`total\`, a resetting \`tank\`, and \`start\` — in O(n) time and O(1) space, and the prefix-sum view proves the last candidate works. In our run it agreed with an O(n²) brute force and the prefix-minimum method on 3,000 random cases, and took 4,000 steps where the brute force took over 8 million.`,
        examples: [
          { label: `One-pass greedy on 7 inputs`, code: `function canCompleteCircuit(gas, cost) {
  // Index of the station to start from to drive the full circle once, or -1.
  let total = 0;   // net fuel over the whole loop: decides IF an answer exists
  let tank = 0;    // fuel since the current candidate start: decides WHERE
  let start = 0;
  for (let i = 0; i < gas.length; i++) {
    const gain = gas[i] - cost[i];
    total += gain;
    tank += gain;
    if (tank < 0) {     // cannot reach station i + 1 from start...
      start = i + 1;    // ...nor from any station between start and i
      tank = 0;
    }
  }
  return total >= 0 ? start : -1;
}

console.log(canCompleteCircuit([1, 2, 3, 4, 5], [3, 4, 5, 1, 2])); // 3
console.log(canCompleteCircuit([2, 3, 4], [3, 4, 3])); // -1
console.log(canCompleteCircuit([5], [4])); // 0
console.log(canCompleteCircuit([4], [5])); // -1
console.log(canCompleteCircuit([3, 1, 1], [1, 2, 2])); // 0
console.log(canCompleteCircuit([5, 1, 2, 3, 4], [4, 4, 1, 5, 1])); // 4
console.log(canCompleteCircuit([1, 1], [1, 1])); // 0` },
          { label: `Tank trace, 3,000 random cases vs brute force and prefix-min, and work counts`, code: `let work = 0;

function greedy(gas, cost) {
  let total = 0, tank = 0, start = 0;
  for (let i = 0; i < gas.length; i++) {
    work++;
    total += gas[i] - cost[i];
    tank += gas[i] - cost[i];
    if (tank < 0) { start = i + 1; tank = 0; }
  }
  return total >= 0 ? start : -1;
}

function completesFrom(gas, cost, s) {
  // Simulate the drive from station s; true if the tank never goes negative.
  const n = gas.length;
  let tank = 0;
  for (let step = 0; step < n; step++) {
    work++;
    const i = (s + step) % n;
    tank += gas[i] - cost[i];
    if (tank < 0) return false;
  }
  return true;
}

function bruteForce(gas, cost) {
  // Try every start: O(n^2).
  for (let s = 0; s < gas.length; s++) if (completesFrom(gas, cost, s)) return s;
  return -1;
}

function prefixMin(gas, cost) {
  // Start right after the station where the running sum is lowest.
  let running = 0, low = 0, lowAt = -1;
  for (let i = 0; i < gas.length; i++) {
    running += gas[i] - cost[i];
    if (running < low) { low = running; lowAt = i; }
  }
  return running >= 0 ? (lowAt + 1) % gas.length : -1;
}

{
  const gas = [1, 2, 3, 4, 5], cost = [3, 4, 5, 1, 2];
  let tank = 0, start = 0;
  for (let i = 0; i < gas.length; i++) {
    tank += gas[i] - cost[i];
    let line = "station " + i + ": gain " + (gas[i] - cost[i]) + ", tank " + tank;
    if (tank < 0) {
      start = i + 1;
      tank = 0;
      line += " -> reset, start = " + start;
    }
    console.log(line);
  }
}

let seed = 11;
function rnd(m) {
  seed = (seed * 48271) % 2147483647;
  return seed % m;
}

const trials = 3000;
let valid = 0, solvable = 0;
for (let t = 0; t < trials; t++) {
  const n = 1 + rnd(8);
  const g = [], c = [];
  for (let i = 0; i < n; i++) g.push(rnd(6));
  for (let i = 0; i < n; i++) c.push(rnd(6));
  const b = bruteForce(g, c), a = greedy(g, c), p = prefixMin(g, c);
  const ok = (a === -1) === (b === -1) && (a === -1 || completesFrom(g, c, a)) && a === p;
  if (ok) valid++;
  if (b !== -1) solvable++;
}
console.log("random cases: " + trials + ", greedy valid and equal to prefix-min on " + valid + ", solvable " + solvable);

for (const n of [1000, 2000, 4000]) {
  const g = new Array(n).fill(1), c = new Array(n).fill(1);
  c[n - 2] = 2;
  g[n - 1] = 2;                   // only the last station works as a start
  work = 0;
  const a = greedy(g, c);
  const greedyWork = work;
  work = 0;
  const b = bruteForce(g, c);
  console.log("n=" + n + ": start " + a + "/" + b + ", greedy steps " + greedyWork + ", brute force steps " + work);
}` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"There are n petrol stations on a circular road. Station i has \`gas[i]\` units of fuel, and driving from station i to the next one costs \`cost[i]\`. Your car starts empty with an unlimited tank. Write a Java method that returns the index of the station to start from to drive around the circle once, or -1 if that is impossible."

**What a strong answer should cover:**
- Reduce each station to its net gain \`gas[i] - cost[i]\`.
- Fact 1: if the total gain is negative, no start works; otherwise one does.
- Fact 2: if the tank goes negative after station j, no station from the current start to j can be a start, so jump to j + 1 and reset the tank.
- The one-pass solution with \`total\`, \`tank\` and \`start\`: O(n) time, O(1) space — and the prefix-sum argument for why the final start works.
- The O(n²) brute force as a baseline, and the \`% n\` wrap-around it needs.
- Java details: whether an \`int\` total can overflow for the given limits (n × max value), and \`long\` when it can; \`ArrayIndexOutOfBoundsException\` without the wrap-around.

**Clarifying questions expected:**
- Does the tank start empty, with no capacity limit?
- Is the answer guaranteed to be unique, and what should be returned when there is none?

**Code / implementation expected:** Yes — \`int canCompleteCircuit(int[] gas, int[] cost)\` in Java, one pass.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays, loops and static methods in Java; everything else is explained.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A ring road has five petrol stations. Your car has an unlimited tank but starts **empty**. At each station you may fill up with whatever that station has, and driving to the next station burns a known amount of fuel. You want to drive all the way round once and come back where you started. Which station should you start from — or is the trip impossible?

Start at the wrong station and you are stranded a few kilometres later. The obvious approach is to try every station as a start and simulate the drive. That is correct, and for n stations it costs about n × n steps — fine for five stations, painful for a hundred thousand.

This is LeetCode 134, "Gas Station", and it is a favourite because the fast answer is a single pass with two running totals, yet it only makes sense once you see two small facts. The first decides *whether* any start works; the second lets you throw away a whole block of candidate starts at once. Interviewers want you to state both and argue why they are true — it is a compact test of [greedy reasoning](/interview-question/what-is-a-greedy-algorithm).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Does \`cost[i]\` mean the fuel to drive from station i to station i + 1 (and the last one back to station 0)? | That is the standard reading; it fixes the direction of travel and the wrap-around. |
| Does the tank start empty, and is its capacity unlimited? | Both are assumed by the standard problem. A capacity limit would break the greedy argument. |
| If several starts work, which one should I return? Is the answer guaranteed unique? | The LeetCode version promises a unique answer when one exists. Without that promise, the algorithm still returns a valid start; say which one. |
| What should I return when no start works? | Usually -1. |
| How many stations, and how large are the values? | Large n rules out the O(n²) simulation; large values decide whether running sums need a 64-bit type. |

## 3. The Core Idea

First simplify. At station i you gain \`gas[i]\` and then spend \`cost[i]\` to reach the next station, so all that matters is the **net gain** \`gain[i] = gas[i] - cost[i]\`. A start s works if, adding the gains in order around the circle from s, the running total never drops below zero.

📌 **Interview term: Net gain** — \`gas[i] - cost[i]\`, the change in fuel from arriving at station i to arriving at station i + 1.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="Five stations in a ring. Gas 1, 2, 3, 4, 5 and cost 3, 4, 5, 1, 2 give net gains of minus 2, minus 2, minus 2, plus 3 and plus 3. Station 3 is the start that works">
  <defs>
    <marker id="b26q4-a1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="100" height="70" rx="10"/>
  <text class="d-text" x="70" y="68" text-anchor="middle">station 0</text>
  <text class="d-sub" x="70" y="92" text-anchor="middle">1 - 3 = -2</text>
  <rect class="d-box" x="160" y="40" width="100" height="70" rx="10"/>
  <text class="d-text" x="210" y="68" text-anchor="middle">station 1</text>
  <text class="d-sub" x="210" y="92" text-anchor="middle">2 - 4 = -2</text>
  <rect class="d-box" x="300" y="40" width="100" height="70" rx="10"/>
  <text class="d-text" x="350" y="68" text-anchor="middle">station 2</text>
  <text class="d-sub" x="350" y="92" text-anchor="middle">3 - 5 = -2</text>
  <rect class="d-box-accent" x="440" y="40" width="100" height="70" rx="10"/>
  <text class="d-text" x="490" y="68" text-anchor="middle">station 3</text>
  <text class="d-sub" x="490" y="92" text-anchor="middle">4 - 1 = +3</text>
  <rect class="d-box" x="580" y="40" width="100" height="70" rx="10"/>
  <text class="d-text" x="630" y="68" text-anchor="middle">station 4</text>
  <text class="d-sub" x="630" y="92" text-anchor="middle">5 - 2 = +3</text>
  <path class="d-edge" d="M 122 75 L 156 75" marker-end="url(#b26q4-a1)"/>
  <path class="d-edge" d="M 262 75 L 296 75" marker-end="url(#b26q4-a1)"/>
  <path class="d-edge" d="M 402 75 L 436 75" marker-end="url(#b26q4-a1)"/>
  <path class="d-edge" d="M 542 75 L 576 75" marker-end="url(#b26q4-a1)"/>
  <path class="d-edge-dashed" d="M 630 112 C 630 190, 70 190, 70 114" marker-end="url(#b26q4-a1)"/>
  <text class="d-sub" x="350" y="204" text-anchor="middle">wrap-around</text>
</svg>

Each box shows \`gas - cost\` for that station. The dashed arrow is the wrap-around: after the last station you drive back to the first.

**Fact 1 — the total decides whether an answer exists.** Driving the whole circle collects every gain exactly once, whatever the start. If \`sum(gain) < 0\`, you end with less fuel than you started with (none), so no start can work: return -1. If \`sum(gain) >= 0\`, some start always works (the proof is in section 4).

**Fact 2 — a failure eliminates a whole block of starts.** Suppose you start at s and the tank first goes negative just after station j. Then **no station between s and j** can be a start either. Why: you arrived at any such station m with a tank that was at least 0 (it had not gone negative yet). Starting fresh at m means arriving there with exactly 0 — never more. Less fuel at m cannot get you further than before, so starting at m also fails at or before j.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 200" role="img" aria-label="Starting at s the tank goes negative after station j. Every station m between s and j arrived with a tank of at least zero, so starting at m with zero fuel also fails, and the next candidate is j plus 1">
  <defs>
    <marker id="b26q4-a2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="110" height="60" rx="10"/>
  <text class="d-text" x="75" y="88" text-anchor="middle">start s</text>
  <text class="d-sub" x="75" y="108" text-anchor="middle">tank 0</text>
  <rect class="d-box-muted" x="200" y="60" width="140" height="60" rx="10"/>
  <text class="d-text" x="270" y="88" text-anchor="middle">any m between</text>
  <text class="d-sub" x="270" y="108" text-anchor="middle">arrived with 0 or more</text>
  <rect class="d-box" x="410" y="60" width="110" height="60" rx="10"/>
  <text class="d-text" x="465" y="88" text-anchor="middle">station j</text>
  <text class="d-sub" x="465" y="108" text-anchor="middle">tank below 0</text>
  <rect class="d-box-accent" x="580" y="60" width="110" height="60" rx="10"/>
  <text class="d-text" x="635" y="88" text-anchor="middle">j + 1</text>
  <text class="d-sub" x="635" y="108" text-anchor="middle">next candidate</text>
  <path class="d-edge" d="M 132 90 L 196 90" marker-end="url(#b26q4-a2)"/>
  <path class="d-edge" d="M 342 90 L 406 90" marker-end="url(#b26q4-a2)"/>
  <path class="d-edge-accent" d="M 522 90 L 576 90" marker-end="url(#b26q4-a2)"/>
  <text class="d-sub" x="270" y="160" text-anchor="middle">starting at m with 0 fuel</text>
  <text class="d-sub" x="270" y="180" text-anchor="middle">fails by j as well</text>
</svg>

So when the tank goes negative, you do not try s + 1, s + 2, …; you jump straight to **j + 1** and reset the tank to 0. Every station is passed once. That is the whole algorithm:

1. \`total = 0\`, \`tank = 0\`, \`start = 0\`.
2. For each station i: add \`gain[i]\` to both \`total\` and \`tank\`. If \`tank < 0\`, set \`start = i + 1\` and \`tank = 0\`.
3. Return \`start\` if \`total >= 0\`, else -1.

📌 **Interview term: Candidate start** — the station the greedy is currently betting on; it only ever moves forward, past a block that has been proven useless.

Here is the trace for the five stations above (example 2 prints it):

| Station | Gain | Tank after | Action |
| :--- | :--- | :--- | :--- |
| 0 | -2 | -2 | reset, start = 1 |
| 1 | -2 | -2 | reset, start = 2 |
| 2 | -2 | -2 | reset, start = 3 |
| 3 | +3 | 3 | keep going |
| 4 | +3 | 6 | keep going |

The total is -2 - 2 - 2 + 3 + 3 = 0, which is not negative, so the answer is 3. Check it by hand: from station 3 the tank goes 3, 6, 4, 2, 0 — never negative.

## 4. Why the Last Candidate Always Works: the Prefix-Sum View

Fact 2 explains why skipped stations are useless. It remains to show that when \`total >= 0\`, the final \`start\` really completes the circle. The cleanest argument uses [prefix sums](/interview-question/what-is-the-prefix-sum-technique).

📌 **Interview term: Prefix sum** — \`P[i] = gain[0] + gain[1] + ... + gain[i]\`, the running total from station 0.

The fuel in the tank after driving from s through station j is \`P[j] - P[s-1]\` (for j at or after s). It is never negative exactly when \`P[s-1]\` is the **smallest** prefix sum. So the best start is the station right after the lowest point of the running sum:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Running sums for the five stations are minus 2, minus 4, minus 6, minus 3 and 0. The lowest point is after station 2, so the start is station 3">
  <path class="d-edge-dashed" d="M 60 50 L 600 50"/>
  <text class="d-sub" x="50" y="55" text-anchor="end">0</text>
  <text class="d-sub" x="50" y="255" text-anchor="end">-6</text>
  <path class="d-edge" d="M 60 50 L 140 117 L 240 183 L 340 250 L 440 150 L 540 50"/>
  <circle class="d-box" cx="140" cy="117" r="7"/>
  <circle class="d-box" cx="240" cy="183" r="7"/>
  <circle class="d-box-accent" cx="340" cy="250" r="9"/>
  <circle class="d-box" cx="440" cy="150" r="7"/>
  <circle class="d-box" cx="540" cy="50" r="7"/>
  <text class="d-sub" x="140" y="145" text-anchor="middle">-2</text>
  <text class="d-sub" x="240" y="211" text-anchor="middle">-4</text>
  <text class="d-accent" x="340" y="285" text-anchor="middle">-6, lowest</text>
  <text class="d-sub" x="462" y="178">-3</text>
  <text class="d-sub" x="540" y="80" text-anchor="middle">0</text>
  <text class="d-sub" x="140" y="30" text-anchor="middle">after 0</text>
  <text class="d-sub" x="240" y="30" text-anchor="middle">after 1</text>
  <text class="d-sub" x="340" y="30" text-anchor="middle">after 2</text>
  <text class="d-sub" x="440" y="30" text-anchor="middle">after 3</text>
  <text class="d-sub" x="540" y="30" text-anchor="middle">after 4</text>
</svg>

The running sum bottoms out at -6 after station 2, so station 3 is the start. Every point after the minimum is at least as high (the tank never goes negative to the end of the array), and for the wrap-around part the tank is \`total - P[s-1] + P[j]\`, which is at least \`total >= 0\` because \`P[j] >= P[s-1]\`. That completes the proof.

The resetting-tank greedy is the same thing in disguise: the tank goes negative exactly when the running sum hits a new lowest point, so \`start\` always ends up just after the (first) minimum. Example 2 checks this: on 3,000 random cases the greedy's answer was always a valid start, was -1 exactly when the brute force found none, and was always equal to the prefix-minimum answer.

**Brute force for comparison.** Try every start and simulate up to n stations: O(n²). Example 2 builds a worst case where only the last station works (every earlier start fails just before the end):

| n | Greedy steps | Brute-force steps |
| :--- | :--- | :--- |
| 1,000 | 1,000 | 500,500 |
| 2,000 | 2,000 | 2,001,000 |
| 4,000 | 4,000 | 8,002,000 |

Linear against quadratic, measured: doubling n doubles one and quadruples the other.

📌 **Interview term: Amortised single pass** — each station is looked at once in total, even though the candidate start moves; the work done for discarded candidates is never repeated.

## 5. The Code in Java

~~~java
// Index of the station to start from to drive the full circle once, or -1.
static int canCompleteCircuit(int[] gas, int[] cost) {
    int total = 0;   // net fuel over the whole loop: decides IF an answer exists
    int tank = 0;    // fuel since the current candidate start: decides WHERE
    int start = 0;
    for (int i = 0; i < gas.length; i++) {
        int gain = gas[i] - cost[i];
        total += gain;
        tank += gain;
        if (tank < 0) {     // cannot reach station i + 1 from start...
            start = i + 1;  // ...nor from any station between start and i
            tank = 0;
        }
    }
    return total >= 0 ? start : -1;
}
~~~

**What to point out in this code:**

- Two running totals with two jobs: \`total\` never resets and answers *whether* a start exists; \`tank\` resets and finds *where*.
- \`start = i + 1\` may briefly equal \`gas.length\` (if the tank goes negative at the last station). That can only happen when \`total < 0\`, so the method returns -1 and never returns that out-of-range index.
- \`int\` is enough when n × max value fits in about 2.1 billion (10^5 stations × 10^4 fuel is 10^9). If the limits are larger, declare \`total\` and \`tank\` as \`long\` — Java \`int\` overflow wraps silently to a negative number and would turn a solvable input into -1.
- The method takes two \`int[]\` and allocates nothing.

The brute force and the prefix-minimum version used in example 2 to check the greedy:

~~~java
// Simulate the drive from station s; true if the tank never goes negative.
static boolean completesFrom(int[] gas, int[] cost, int s) {
    int n = gas.length, tank = 0;
    for (int step = 0; step < n; step++) {
        work++;
        int i = (s + step) % n;
        tank += gas[i] - cost[i];
        if (tank < 0) return false;
    }
    return true;
}

// Start right after the station where the running sum is lowest.
static int prefixMin(int[] gas, int[] cost) {
    int running = 0, low = 0, lowAt = -1;
    for (int i = 0; i < gas.length; i++) {
        running += gas[i] - cost[i];
        if (running < low) { low = running; lowAt = i; }
    }
    return running >= 0 ? (lowAt + 1) % gas.length : -1;
}
~~~

\`(s + step) % n\` is the wrap-around. Without it, \`gas[n]\` throws \`ArrayIndexOutOfBoundsException\`. In \`prefixMin\`, \`lowAt = -1\` stands for "the running sum before station 0". The \`work\` counter in example 2 is a \`long\` because a quadratic count grows fast.

## 6. Verified: Running the Code

Each example was saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the one-pass greedy on seven inputs** (the classic two, one station either way, a start at 0, a start at the last index, and a tie):

~~~text
3
-1
0
-1
0
4
0
~~~

**Example 2 — the tank trace for the five-station example, 3,000 random cases from a seeded generator (the same arithmetic in all four languages), and the work counts on the brute-force worst case:**

~~~text
station 0: gain -2, tank -2 -> reset, start = 1
station 1: gain -2, tank -2 -> reset, start = 2
station 2: gain -2, tank -2 -> reset, start = 3
station 3: gain 3, tank 3
station 4: gain 3, tank 6
random cases: 3000, greedy valid and equal to prefix-min on 3000, solvable 1643
n=1000: start 999/999, greedy steps 1000, brute force steps 500500
n=2000: start 1999/1999, greedy steps 2000, brute force steps 2001000
n=4000: start 3999/3999, greedy steps 4000, brute force steps 8002000
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force, simulate every start | O(n²) | O(1) | n starts × up to n stations; 8,002,000 steps for n = 4,000 |
| Prefix minimum | O(n) | O(1) | one pass to find the lowest running sum |
| Greedy with resetting tank | O(n) | O(1) | one pass, three \`int\`s; 4,000 steps for n = 4,000 |

See [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **One station** — \`[5]\`/\`[4]\` works (gain +1, start 0); \`[4]\`/\`[5]\` does not (-1). Both are in example 1.
- **Total exactly zero** — still solvable (\`[1, 2, 3, 4, 5]\`/\`[3, 4, 5, 1, 2]\` has total 0 and answer 3). The test is \`total >= 0\`, not \`> 0\`.
- **Several valid starts** — \`[1, 1]\`/\`[1, 1]\` can start anywhere; the greedy returns 0, the first start after the lowest running sum. The LeetCode version promises uniqueness, so this only matters if the interviewer drops that promise.
- **\`start\` ending up as n** — only happens if the tank goes negative at the last station. The running sum then reaches a new lowest point at the very end, below the earlier low (which is at most 0), so \`total < 0\` and the function returns -1; it never returns n.
- **Large values** — the running totals can be as large as n × max value. In 32-bit languages, check whether that fits (10^5 stations × 10^4 fuel = 10^9 fits in a 32-bit int; larger limits need 64 bits).

## Common Pitfalls

- **Using one total for both jobs.** Resetting the only running sum loses the information about whether *any* start works; keep \`total\` and \`tank\` separate.
- **\`total > 0\` instead of \`total >= 0\`.** A total of exactly 0 is solvable (the five-station example).
- **\`int\` overflow on big inputs.** Check n × max value against \`Integer.MAX_VALUE\`; use \`long\` when in doubt.
- **Moving \`start\` to \`start + 1\` instead of \`i + 1\`.** Still correct, but O(n²) again.
- **Forgetting \`% n\` in a simulation.** \`ArrayIndexOutOfBoundsException\` at the end of the array.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reduce:</strong> <span style="color:#f0e2c8;">Only the net gain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gas[i] - cost[i]</code> matters at each station.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Fact 1:</strong> <span style="color:#f0e2c8;">If the total gain is negative, no start can work: return -1. If it is 0 or more, a start exists.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Fact 2:</strong> <span style="color:#f0e2c8;">If the tank goes negative after station j, every start from the current one up to j fails too, so set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">start = i + 1</code> and reset <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tank = 0</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">One pass with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">total</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tank</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">start</code>: O(n) time, O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">Check that n × max value fits in an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>; if not, make <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">total</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tank</code> <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code>, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> overflow wraps silently.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you skip every station between the old start and the failure point?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each of them was reached with a tank of at least zero. Starting there means arriving with exactly zero, which is no better, so it fails at the same point or earlier. The next possible start is the station after the failure.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does total &gt;= 0 guarantee the final start works?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Prefix-sum view: the final start comes right after the lowest running sum. From there the running total only rises above that low, and for the wrap-around part the tank is total minus the low plus a later prefix, which is at least total, so it never goes negative.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the brute force and its cost?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Try each start and simulate the full circle: O(n²). On our worst case with 4,000 stations it took 8,002,000 steps against the greedy 4,000.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could the int totals overflow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With 10^5 stations and values up to 10^4, the totals stay within plus or minus 10^9, which fits. For larger limits use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long total, tank</code>; an overflowed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> total could turn negative and make the method wrongly return -1.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Net gain** | \`gas[i] - cost[i]\`: fuel gained from station i to station i + 1 |
| **Candidate start** | The start the greedy is currently betting on; it only moves forward |
| **Prefix sum** | Running total of gains from station 0; the best start follows its lowest point |
| **Amortised single pass** | Every station is processed once in total, even though the candidate moves |
| **Integer overflow** | Java \`int\` silently wraps past 2,147,483,647 to negative numbers |

Related: [the Jump Game](/interview-question/how-do-you-solve-the-jump-game) is another one-pass greedy; [Kadane's maximum subarray](/interview-question/how-do-you-find-the-maximum-subarray-sum) uses the same "reset when the running sum goes negative" move.

---
**Conclusion:** The Gas Station problem is solved by two observations: the total net gain decides whether any start exists, and a start that runs dry after station j rules out every station up to j. In Java that is one \`for\` loop over the two \`int[]\` arrays with three running values — \`total\`, a resetting \`tank\`, and \`start\` — in O(n) time and O(1) space, with \`long\` totals if the limits could overflow an \`int\`. In our run it agreed with an O(n²) brute force and the prefix-minimum method on 3,000 random cases, and took 4,000 steps where the brute force took over 8 million.`,
        examples: [
          { label: `One-pass greedy on 7 inputs`, code: `public class Main {
    // Index of the station to start from to drive the full circle once, or -1.
    static int canCompleteCircuit(int[] gas, int[] cost) {
        int total = 0;   // net fuel over the whole loop: decides IF an answer exists
        int tank = 0;    // fuel since the current candidate start: decides WHERE
        int start = 0;
        for (int i = 0; i < gas.length; i++) {
            int gain = gas[i] - cost[i];
            total += gain;
            tank += gain;
            if (tank < 0) {     // cannot reach station i + 1 from start...
                start = i + 1;  // ...nor from any station between start and i
                tank = 0;
            }
        }
        return total >= 0 ? start : -1;
    }

    public static void main(String[] args) {
        System.out.println(canCompleteCircuit(new int[]{1, 2, 3, 4, 5}, new int[]{3, 4, 5, 1, 2}));  // 3
        System.out.println(canCompleteCircuit(new int[]{2, 3, 4}, new int[]{3, 4, 3}));              // -1
        System.out.println(canCompleteCircuit(new int[]{5}, new int[]{4}));                          // 0
        System.out.println(canCompleteCircuit(new int[]{4}, new int[]{5}));                          // -1
        System.out.println(canCompleteCircuit(new int[]{3, 1, 1}, new int[]{1, 2, 2}));              // 0
        System.out.println(canCompleteCircuit(new int[]{5, 1, 2, 3, 4}, new int[]{4, 4, 1, 5, 1}));  // 4
        System.out.println(canCompleteCircuit(new int[]{1, 1}, new int[]{1, 1}));                    // 0
    }
}` },
          { label: `Tank trace, 3,000 random cases vs brute force and prefix-min, and work counts`, code: `import java.util.Arrays;

public class Main {
    static long work = 0;

    static int greedy(int[] gas, int[] cost) {
        int total = 0, tank = 0, start = 0;
        for (int i = 0; i < gas.length; i++) {
            work++;
            total += gas[i] - cost[i];
            tank += gas[i] - cost[i];
            if (tank < 0) { start = i + 1; tank = 0; }
        }
        return total >= 0 ? start : -1;
    }

    // Simulate the drive from station s; true if the tank never goes negative.
    static boolean completesFrom(int[] gas, int[] cost, int s) {
        int n = gas.length, tank = 0;
        for (int step = 0; step < n; step++) {
            work++;
            int i = (s + step) % n;
            tank += gas[i] - cost[i];
            if (tank < 0) return false;
        }
        return true;
    }

    // Try every start: O(n^2).
    static int bruteForce(int[] gas, int[] cost) {
        for (int s = 0; s < gas.length; s++) if (completesFrom(gas, cost, s)) return s;
        return -1;
    }

    // Start right after the station where the running sum is lowest.
    static int prefixMin(int[] gas, int[] cost) {
        int running = 0, low = 0, lowAt = -1;
        for (int i = 0; i < gas.length; i++) {
            running += gas[i] - cost[i];
            if (running < low) { low = running; lowAt = i; }
        }
        return running >= 0 ? (lowAt + 1) % gas.length : -1;
    }

    static long seed = 11;

    static int rnd(int m) {
        seed = seed * 48271 % 2147483647L;
        return (int) (seed % m);
    }

    public static void main(String[] args) {
        int[] gas = {1, 2, 3, 4, 5}, cost = {3, 4, 5, 1, 2};
        int tank = 0, start = 0;
        for (int i = 0; i < gas.length; i++) {
            tank += gas[i] - cost[i];
            String line = "station " + i + ": gain " + (gas[i] - cost[i]) + ", tank " + tank;
            if (tank < 0) {
                start = i + 1;
                tank = 0;
                line += " -> reset, start = " + start;
            }
            System.out.println(line);
        }

        int trials = 3000, valid = 0, solvable = 0;
        for (int t = 0; t < trials; t++) {
            int n = 1 + rnd(8);
            int[] g = new int[n], c = new int[n];
            for (int i = 0; i < n; i++) g[i] = rnd(6);
            for (int i = 0; i < n; i++) c[i] = rnd(6);
            int b = bruteForce(g, c), a = greedy(g, c), p = prefixMin(g, c);
            boolean ok = (a == -1) == (b == -1) && (a == -1 || completesFrom(g, c, a)) && a == p;
            if (ok) valid++;
            if (b != -1) solvable++;
        }
        System.out.println("random cases: " + trials + ", greedy valid and equal to prefix-min on " + valid + ", solvable " + solvable);

        for (int n : new int[]{1000, 2000, 4000}) {
            int[] g = new int[n], c = new int[n];
            Arrays.fill(g, 1);
            Arrays.fill(c, 1);
            c[n - 2] = 2;
            g[n - 1] = 2;                // only the last station works as a start
            work = 0;
            int a = greedy(g, c);
            long greedyWork = work;
            work = 0;
            int b = bruteForce(g, c);
            System.out.println("n=" + n + ": start " + a + "/" + b + ", greedy steps " + greedyWork + ", brute force steps " + work);
        }
    }
}` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"There are n petrol stations on a circular road. Station i has \`gas[i]\` units of fuel, and driving from station i to the next one costs \`cost[i]\`. Your car starts empty with an unlimited tank. Write a C++ function that returns the index of the station to start from to drive around the circle once, or -1 if that is impossible."

**What a strong answer should cover:**
- Reduce each station to its net gain \`gas[i] - cost[i]\`.
- Fact 1: if the total gain is negative, no start works; otherwise one does.
- Fact 2: if the tank goes negative after station j, no station from the current start to j can be a start, so jump to j + 1 and reset the tank.
- The one-pass solution with \`total\`, \`tank\` and \`start\`: O(n) time, O(1) space — and the prefix-sum argument for why the final start works.
- The O(n²) brute force as a baseline, and the \`% n\` wrap-around it needs.
- C++ details: \`long long\` running totals (signed overflow is undefined behaviour), \`(int)gas.size()\` to avoid signed/unsigned comparisons, and that \`vector::operator[]\` past the end is undefined behaviour, not an exception.

**Clarifying questions expected:**
- Does the tank start empty, with no capacity limit?
- Is the answer guaranteed to be unique, and what should be returned when there is none?

**Code / implementation expected:** Yes — \`int canCompleteCircuit(const vector<int>& gas, const vector<int>& cost)\` in C++17, one pass.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know \`vector\`, loops and functions in C++; everything else is explained.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A ring road has five petrol stations. Your car has an unlimited tank but starts **empty**. At each station you may fill up with whatever that station has, and driving to the next station burns a known amount of fuel. You want to drive all the way round once and come back where you started. Which station should you start from — or is the trip impossible?

Start at the wrong station and you are stranded a few kilometres later. The obvious approach is to try every station as a start and simulate the drive. That is correct, and for n stations it costs about n × n steps — fine for five stations, painful for a hundred thousand.

This is LeetCode 134, "Gas Station", and it is a favourite because the fast answer is a single pass with two running totals, yet it only makes sense once you see two small facts. The first decides *whether* any start works; the second lets you throw away a whole block of candidate starts at once. Interviewers want you to state both and argue why they are true — it is a compact test of [greedy reasoning](/interview-question/what-is-a-greedy-algorithm).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Does \`cost[i]\` mean the fuel to drive from station i to station i + 1 (and the last one back to station 0)? | That is the standard reading; it fixes the direction of travel and the wrap-around. |
| Does the tank start empty, and is its capacity unlimited? | Both are assumed by the standard problem. A capacity limit would break the greedy argument. |
| If several starts work, which one should I return? Is the answer guaranteed unique? | The LeetCode version promises a unique answer when one exists. Without that promise, the algorithm still returns a valid start; say which one. |
| What should I return when no start works? | Usually -1. |
| How many stations, and how large are the values? | Large n rules out the O(n²) simulation; large values decide whether running sums need a 64-bit type. |

## 3. The Core Idea

First simplify. At station i you gain \`gas[i]\` and then spend \`cost[i]\` to reach the next station, so all that matters is the **net gain** \`gain[i] = gas[i] - cost[i]\`. A start s works if, adding the gains in order around the circle from s, the running total never drops below zero.

📌 **Interview term: Net gain** — \`gas[i] - cost[i]\`, the change in fuel from arriving at station i to arriving at station i + 1.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="Five stations in a ring. Gas 1, 2, 3, 4, 5 and cost 3, 4, 5, 1, 2 give net gains of minus 2, minus 2, minus 2, plus 3 and plus 3. Station 3 is the start that works">
  <defs>
    <marker id="b26q4-a1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="100" height="70" rx="10"/>
  <text class="d-text" x="70" y="68" text-anchor="middle">station 0</text>
  <text class="d-sub" x="70" y="92" text-anchor="middle">1 - 3 = -2</text>
  <rect class="d-box" x="160" y="40" width="100" height="70" rx="10"/>
  <text class="d-text" x="210" y="68" text-anchor="middle">station 1</text>
  <text class="d-sub" x="210" y="92" text-anchor="middle">2 - 4 = -2</text>
  <rect class="d-box" x="300" y="40" width="100" height="70" rx="10"/>
  <text class="d-text" x="350" y="68" text-anchor="middle">station 2</text>
  <text class="d-sub" x="350" y="92" text-anchor="middle">3 - 5 = -2</text>
  <rect class="d-box-accent" x="440" y="40" width="100" height="70" rx="10"/>
  <text class="d-text" x="490" y="68" text-anchor="middle">station 3</text>
  <text class="d-sub" x="490" y="92" text-anchor="middle">4 - 1 = +3</text>
  <rect class="d-box" x="580" y="40" width="100" height="70" rx="10"/>
  <text class="d-text" x="630" y="68" text-anchor="middle">station 4</text>
  <text class="d-sub" x="630" y="92" text-anchor="middle">5 - 2 = +3</text>
  <path class="d-edge" d="M 122 75 L 156 75" marker-end="url(#b26q4-a1)"/>
  <path class="d-edge" d="M 262 75 L 296 75" marker-end="url(#b26q4-a1)"/>
  <path class="d-edge" d="M 402 75 L 436 75" marker-end="url(#b26q4-a1)"/>
  <path class="d-edge" d="M 542 75 L 576 75" marker-end="url(#b26q4-a1)"/>
  <path class="d-edge-dashed" d="M 630 112 C 630 190, 70 190, 70 114" marker-end="url(#b26q4-a1)"/>
  <text class="d-sub" x="350" y="204" text-anchor="middle">wrap-around</text>
</svg>

Each box shows \`gas - cost\` for that station. The dashed arrow is the wrap-around: after the last station you drive back to the first.

**Fact 1 — the total decides whether an answer exists.** Driving the whole circle collects every gain exactly once, whatever the start. If \`sum(gain) < 0\`, you end with less fuel than you started with (none), so no start can work: return -1. If \`sum(gain) >= 0\`, some start always works (the proof is in section 4).

**Fact 2 — a failure eliminates a whole block of starts.** Suppose you start at s and the tank first goes negative just after station j. Then **no station between s and j** can be a start either. Why: you arrived at any such station m with a tank that was at least 0 (it had not gone negative yet). Starting fresh at m means arriving there with exactly 0 — never more. Less fuel at m cannot get you further than before, so starting at m also fails at or before j.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 200" role="img" aria-label="Starting at s the tank goes negative after station j. Every station m between s and j arrived with a tank of at least zero, so starting at m with zero fuel also fails, and the next candidate is j plus 1">
  <defs>
    <marker id="b26q4-a2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="110" height="60" rx="10"/>
  <text class="d-text" x="75" y="88" text-anchor="middle">start s</text>
  <text class="d-sub" x="75" y="108" text-anchor="middle">tank 0</text>
  <rect class="d-box-muted" x="200" y="60" width="140" height="60" rx="10"/>
  <text class="d-text" x="270" y="88" text-anchor="middle">any m between</text>
  <text class="d-sub" x="270" y="108" text-anchor="middle">arrived with 0 or more</text>
  <rect class="d-box" x="410" y="60" width="110" height="60" rx="10"/>
  <text class="d-text" x="465" y="88" text-anchor="middle">station j</text>
  <text class="d-sub" x="465" y="108" text-anchor="middle">tank below 0</text>
  <rect class="d-box-accent" x="580" y="60" width="110" height="60" rx="10"/>
  <text class="d-text" x="635" y="88" text-anchor="middle">j + 1</text>
  <text class="d-sub" x="635" y="108" text-anchor="middle">next candidate</text>
  <path class="d-edge" d="M 132 90 L 196 90" marker-end="url(#b26q4-a2)"/>
  <path class="d-edge" d="M 342 90 L 406 90" marker-end="url(#b26q4-a2)"/>
  <path class="d-edge-accent" d="M 522 90 L 576 90" marker-end="url(#b26q4-a2)"/>
  <text class="d-sub" x="270" y="160" text-anchor="middle">starting at m with 0 fuel</text>
  <text class="d-sub" x="270" y="180" text-anchor="middle">fails by j as well</text>
</svg>

So when the tank goes negative, you do not try s + 1, s + 2, …; you jump straight to **j + 1** and reset the tank to 0. Every station is passed once. That is the whole algorithm:

1. \`total = 0\`, \`tank = 0\`, \`start = 0\`.
2. For each station i: add \`gain[i]\` to both \`total\` and \`tank\`. If \`tank < 0\`, set \`start = i + 1\` and \`tank = 0\`.
3. Return \`start\` if \`total >= 0\`, else -1.

📌 **Interview term: Candidate start** — the station the greedy is currently betting on; it only ever moves forward, past a block that has been proven useless.

Here is the trace for the five stations above (example 2 prints it):

| Station | Gain | Tank after | Action |
| :--- | :--- | :--- | :--- |
| 0 | -2 | -2 | reset, start = 1 |
| 1 | -2 | -2 | reset, start = 2 |
| 2 | -2 | -2 | reset, start = 3 |
| 3 | +3 | 3 | keep going |
| 4 | +3 | 6 | keep going |

The total is -2 - 2 - 2 + 3 + 3 = 0, which is not negative, so the answer is 3. Check it by hand: from station 3 the tank goes 3, 6, 4, 2, 0 — never negative.

## 4. Why the Last Candidate Always Works: the Prefix-Sum View

Fact 2 explains why skipped stations are useless. It remains to show that when \`total >= 0\`, the final \`start\` really completes the circle. The cleanest argument uses [prefix sums](/interview-question/what-is-the-prefix-sum-technique).

📌 **Interview term: Prefix sum** — \`P[i] = gain[0] + gain[1] + ... + gain[i]\`, the running total from station 0.

The fuel in the tank after driving from s through station j is \`P[j] - P[s-1]\` (for j at or after s). It is never negative exactly when \`P[s-1]\` is the **smallest** prefix sum. So the best start is the station right after the lowest point of the running sum:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Running sums for the five stations are minus 2, minus 4, minus 6, minus 3 and 0. The lowest point is after station 2, so the start is station 3">
  <path class="d-edge-dashed" d="M 60 50 L 600 50"/>
  <text class="d-sub" x="50" y="55" text-anchor="end">0</text>
  <text class="d-sub" x="50" y="255" text-anchor="end">-6</text>
  <path class="d-edge" d="M 60 50 L 140 117 L 240 183 L 340 250 L 440 150 L 540 50"/>
  <circle class="d-box" cx="140" cy="117" r="7"/>
  <circle class="d-box" cx="240" cy="183" r="7"/>
  <circle class="d-box-accent" cx="340" cy="250" r="9"/>
  <circle class="d-box" cx="440" cy="150" r="7"/>
  <circle class="d-box" cx="540" cy="50" r="7"/>
  <text class="d-sub" x="140" y="145" text-anchor="middle">-2</text>
  <text class="d-sub" x="240" y="211" text-anchor="middle">-4</text>
  <text class="d-accent" x="340" y="285" text-anchor="middle">-6, lowest</text>
  <text class="d-sub" x="462" y="178">-3</text>
  <text class="d-sub" x="540" y="80" text-anchor="middle">0</text>
  <text class="d-sub" x="140" y="30" text-anchor="middle">after 0</text>
  <text class="d-sub" x="240" y="30" text-anchor="middle">after 1</text>
  <text class="d-sub" x="340" y="30" text-anchor="middle">after 2</text>
  <text class="d-sub" x="440" y="30" text-anchor="middle">after 3</text>
  <text class="d-sub" x="540" y="30" text-anchor="middle">after 4</text>
</svg>

The running sum bottoms out at -6 after station 2, so station 3 is the start. Every point after the minimum is at least as high (the tank never goes negative to the end of the array), and for the wrap-around part the tank is \`total - P[s-1] + P[j]\`, which is at least \`total >= 0\` because \`P[j] >= P[s-1]\`. That completes the proof.

The resetting-tank greedy is the same thing in disguise: the tank goes negative exactly when the running sum hits a new lowest point, so \`start\` always ends up just after the (first) minimum. Example 2 checks this: on 3,000 random cases the greedy's answer was always a valid start, was -1 exactly when the brute force found none, and was always equal to the prefix-minimum answer.

**Brute force for comparison.** Try every start and simulate up to n stations: O(n²). Example 2 builds a worst case where only the last station works (every earlier start fails just before the end):

| n | Greedy steps | Brute-force steps |
| :--- | :--- | :--- |
| 1,000 | 1,000 | 500,500 |
| 2,000 | 2,000 | 2,001,000 |
| 4,000 | 4,000 | 8,002,000 |

Linear against quadratic, measured: doubling n doubles one and quadruples the other.

📌 **Interview term: Amortised single pass** — each station is looked at once in total, even though the candidate start moves; the work done for discarded candidates is never repeated.

## 5. The Code in C++

~~~cpp
// Index of the station to start from to drive the full circle once, or -1.
int canCompleteCircuit(const vector<int>& gas, const vector<int>& cost) {
    long long total = 0;   // net fuel over the whole loop: decides IF an answer exists
    long long tank = 0;    // fuel since the current candidate start: decides WHERE
    int start = 0;
    for (int i = 0; i < (int)gas.size(); i++) {
        int gain = gas[i] - cost[i];
        total += gain;
        tank += gain;
        if (tank < 0) {     // cannot reach station i + 1 from start...
            start = i + 1;  // ...nor from any station between start and i
            tank = 0;
        }
    }
    return total >= 0 ? start : -1;
}
~~~

**What to point out in this code:**

- Two running totals with two jobs: \`total\` never resets and answers *whether* a start exists; \`tank\` resets and finds *where*.
- They are \`long long\`. With large limits an \`int\` sum could overflow, and in C++ signed overflow is **undefined behaviour** — not merely a wrong number. 64-bit totals cost nothing here.
- \`i < (int)gas.size()\` compares two signed values; \`i < gas.size()\` compiles too but mixes signed and unsigned, which \`-Wall\` warns about and which misbehaves as soon as either side is negative.
- \`start = i + 1\` may briefly equal \`gas.size()\` (if the tank goes negative at the last station). That only happens when \`total < 0\`, so the function returns -1 and never returns that out-of-range index.

The brute force and the prefix-minimum version used in example 2 to check the greedy:

~~~cpp
// Simulate the drive from station s; true if the tank never goes negative.
bool completesFrom(const vector<int>& gas, const vector<int>& cost, int s) {
    int n = (int)gas.size();
    long long tank = 0;
    for (int step = 0; step < n; step++) {
        work++;
        int i = (s + step) % n;
        tank += gas[i] - cost[i];
        if (tank < 0) return false;
    }
    return true;
}

// Start right after the station where the running sum is lowest.
int prefixMin(const vector<int>& gas, const vector<int>& cost) {
    long long running = 0, low = 0;
    int lowAt = -1;
    for (int i = 0; i < (int)gas.size(); i++) {
        running += gas[i] - cost[i];
        if (running < low) { low = running; lowAt = i; }
    }
    return running >= 0 ? (lowAt + 1) % (int)gas.size() : -1;
}
~~~

\`(s + step) % n\` is the wrap-around. Without it, \`gas[n]\` reads past the end of the vector. \`operator[]\` does no bounds check, so that is undefined behaviour — it may print garbage, crash, or appear to work. (\`gas.at(n)\` would throw \`std::out_of_range\` instead.) In \`prefixMin\`, \`lowAt = -1\` stands for "the running sum before station 0".

## 6. Verified: Running the Code

Each example was saved as \`main.cpp\` and run with \`g++ -std=c++17 -O2 main.cpp && ./a.out\` (GCC 13). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the one-pass greedy on seven inputs** (the classic two, one station either way, a start at 0, a start at the last index, and a tie):

~~~text
3
-1
0
-1
0
4
0
~~~

**Example 2 — the tank trace for the five-station example, 3,000 random cases from a seeded generator (the same arithmetic in all four languages), and the work counts on the brute-force worst case:**

~~~text
station 0: gain -2, tank -2 -> reset, start = 1
station 1: gain -2, tank -2 -> reset, start = 2
station 2: gain -2, tank -2 -> reset, start = 3
station 3: gain 3, tank 3
station 4: gain 3, tank 6
random cases: 3000, greedy valid and equal to prefix-min on 3000, solvable 1643
n=1000: start 999/999, greedy steps 1000, brute force steps 500500
n=2000: start 1999/1999, greedy steps 2000, brute force steps 2001000
n=4000: start 3999/3999, greedy steps 4000, brute force steps 8002000
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force, simulate every start | O(n²) | O(1) | n starts × up to n stations; 8,002,000 steps for n = 4,000 |
| Prefix minimum | O(n) | O(1) | one pass to find the lowest running sum |
| Greedy with resetting tank | O(n) | O(1) | one pass, three integers; 4,000 steps for n = 4,000 |

Passing both vectors by \`const&\` keeps the extra space at O(1). See [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **One station** — \`[5]\`/\`[4]\` works (gain +1, start 0); \`[4]\`/\`[5]\` does not (-1). Both are in example 1.
- **Total exactly zero** — still solvable (\`[1, 2, 3, 4, 5]\`/\`[3, 4, 5, 1, 2]\` has total 0 and answer 3). The test is \`total >= 0\`, not \`> 0\`.
- **Several valid starts** — \`[1, 1]\`/\`[1, 1]\` can start anywhere; the greedy returns 0, the first start after the lowest running sum. The LeetCode version promises uniqueness, so this only matters if the interviewer drops that promise.
- **\`start\` ending up as n** — only happens if the tank goes negative at the last station. The running sum then reaches a new lowest point at the very end, below the earlier low (which is at most 0), so \`total < 0\` and the function returns -1; it never returns n.
- **Large values** — the running totals can be as large as n × max value. In 32-bit languages, check whether that fits (10^5 stations × 10^4 fuel = 10^9 fits in a 32-bit int; larger limits need 64 bits).

## Common Pitfalls

- **Using one total for both jobs.** Resetting the only running sum loses the information about whether *any* start works; keep \`total\` and \`tank\` separate.
- **\`total > 0\` instead of \`total >= 0\`.** A total of exactly 0 is solvable (the five-station example).
- **\`int\` totals on big inputs.** Signed overflow is undefined behaviour; use \`long long\`.
- **Forgetting \`% n\` in a simulation.** \`operator[]\` past the end is undefined behaviour, not an exception.
- **Moving \`start\` to \`start + 1\` instead of \`i + 1\`.** Still correct, but O(n²) again.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reduce:</strong> <span style="color:#f0e2c8;">Only the net gain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gas[i] - cost[i]</code> matters at each station.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Fact 1:</strong> <span style="color:#f0e2c8;">If the total gain is negative, no start can work: return -1. If it is 0 or more, a start exists.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Fact 2:</strong> <span style="color:#f0e2c8;">If the tank goes negative after station j, every start from the current one up to j fails too, so set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">start = i + 1</code> and reset <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tank = 0</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">One pass with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">total</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tank</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">start</code>: O(n) time, O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">total</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tank</code> as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> (signed overflow is undefined behaviour) and loop with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &lt; (int)gas.size()</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you skip every station between the old start and the failure point?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each of them was reached with a tank of at least zero. Starting there means arriving with exactly zero, which is no better, so it fails at the same point or earlier. The next possible start is the station after the failure.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does total &gt;= 0 guarantee the final start works?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Prefix-sum view: the final start comes right after the lowest running sum. From there the running total only rises above that low, and for the wrap-around part the tank is total minus the low plus a later prefix, which is at least total, so it never goes negative.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the brute force and its cost?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Try each start and simulate the full circle: O(n²). On our worst case with 4,000 stations it took 8,002,000 steps against the greedy 4,000.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens in C++ if the simulation forgets the wrap-around?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gas[n]</code> reads past the end, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector::operator[]</code> does not check bounds, so it is undefined behaviour: it may crash or silently use garbage. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gas.at(n)</code> would throw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::out_of_range</code>, which is why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">at</code> is handy while debugging.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Net gain** | \`gas[i] - cost[i]\`: fuel gained from station i to station i + 1 |
| **Candidate start** | The start the greedy is currently betting on; it only moves forward |
| **Prefix sum** | Running total of gains from station 0; the best start follows its lowest point |
| **Amortised single pass** | Every station is processed once in total, even though the candidate moves |
| **Undefined behaviour** | Code the C++ standard gives no meaning to (signed overflow, out-of-bounds \`[]\`); anything may happen |

Related: [the Jump Game](/interview-question/how-do-you-solve-the-jump-game) is another one-pass greedy; [Kadane's maximum subarray](/interview-question/how-do-you-find-the-maximum-subarray-sum) uses the same "reset when the running sum goes negative" move.

---
**Conclusion:** The Gas Station problem is solved by two observations: the total net gain decides whether any start exists, and a start that runs dry after station j rules out every station up to j. In C++ that is one loop over two \`const vector<int>&\` with three running values — \`long long total\`, a resetting \`long long tank\`, and \`int start\` — in O(n) time and O(1) space. In our run it agreed with an O(n²) brute force and the prefix-minimum method on 3,000 random cases, and took 4,000 steps where the brute force took over 8 million.`,
        examples: [
          { label: `One-pass greedy on 7 inputs`, code: `#include <iostream>
#include <vector>
using namespace std;

// Index of the station to start from to drive the full circle once, or -1.
int canCompleteCircuit(const vector<int>& gas, const vector<int>& cost) {
    long long total = 0;   // net fuel over the whole loop: decides IF an answer exists
    long long tank = 0;    // fuel since the current candidate start: decides WHERE
    int start = 0;
    for (int i = 0; i < (int)gas.size(); i++) {
        int gain = gas[i] - cost[i];
        total += gain;
        tank += gain;
        if (tank < 0) {     // cannot reach station i + 1 from start...
            start = i + 1;  // ...nor from any station between start and i
            tank = 0;
        }
    }
    return total >= 0 ? start : -1;
}

int main() {
    cout << canCompleteCircuit({1, 2, 3, 4, 5}, {3, 4, 5, 1, 2}) << "\\n";  // 3
    cout << canCompleteCircuit({2, 3, 4}, {3, 4, 3}) << "\\n";              // -1
    cout << canCompleteCircuit({5}, {4}) << "\\n";                          // 0
    cout << canCompleteCircuit({4}, {5}) << "\\n";                          // -1
    cout << canCompleteCircuit({3, 1, 1}, {1, 2, 2}) << "\\n";              // 0
    cout << canCompleteCircuit({5, 1, 2, 3, 4}, {4, 4, 1, 5, 1}) << "\\n";  // 4
    cout << canCompleteCircuit({1, 1}, {1, 1}) << "\\n";                    // 0
    return 0;
}` },
          { label: `Tank trace, 3,000 random cases vs brute force and prefix-min, and work counts`, code: `#include <iostream>
#include <string>
#include <vector>
using namespace std;

long long work = 0;

int greedy(const vector<int>& gas, const vector<int>& cost) {
    long long total = 0, tank = 0;
    int start = 0;
    for (int i = 0; i < (int)gas.size(); i++) {
        work++;
        total += gas[i] - cost[i];
        tank += gas[i] - cost[i];
        if (tank < 0) { start = i + 1; tank = 0; }
    }
    return total >= 0 ? start : -1;
}

// Simulate the drive from station s; true if the tank never goes negative.
bool completesFrom(const vector<int>& gas, const vector<int>& cost, int s) {
    int n = (int)gas.size();
    long long tank = 0;
    for (int step = 0; step < n; step++) {
        work++;
        int i = (s + step) % n;
        tank += gas[i] - cost[i];
        if (tank < 0) return false;
    }
    return true;
}

// Try every start: O(n^2).
int bruteForce(const vector<int>& gas, const vector<int>& cost) {
    for (int s = 0; s < (int)gas.size(); s++) if (completesFrom(gas, cost, s)) return s;
    return -1;
}

// Start right after the station where the running sum is lowest.
int prefixMin(const vector<int>& gas, const vector<int>& cost) {
    long long running = 0, low = 0;
    int lowAt = -1;
    for (int i = 0; i < (int)gas.size(); i++) {
        running += gas[i] - cost[i];
        if (running < low) { low = running; lowAt = i; }
    }
    return running >= 0 ? (lowAt + 1) % (int)gas.size() : -1;
}

long long seed = 11;
int rnd(int m) {
    seed = seed * 48271 % 2147483647LL;
    return (int)(seed % m);
}

int main() {
    vector<int> gas = {1, 2, 3, 4, 5}, cost = {3, 4, 5, 1, 2};
    int tank = 0, start = 0;
    for (int i = 0; i < (int)gas.size(); i++) {
        tank += gas[i] - cost[i];
        string line = "station " + to_string(i) + ": gain " + to_string(gas[i] - cost[i]) + ", tank " + to_string(tank);
        if (tank < 0) {
            start = i + 1;
            tank = 0;
            line += " -> reset, start = " + to_string(start);
        }
        cout << line << "\\n";
    }

    int trials = 3000, valid = 0, solvable = 0;
    for (int t = 0; t < trials; t++) {
        int n = 1 + rnd(8);
        vector<int> g(n), c(n);
        for (int i = 0; i < n; i++) g[i] = rnd(6);
        for (int i = 0; i < n; i++) c[i] = rnd(6);
        int b = bruteForce(g, c), a = greedy(g, c), p = prefixMin(g, c);
        bool ok = ((a == -1) == (b == -1)) && (a == -1 || completesFrom(g, c, a)) && a == p;
        if (ok) valid++;
        if (b != -1) solvable++;
    }
    cout << "random cases: " << trials << ", greedy valid and equal to prefix-min on " << valid << ", solvable " << solvable << "\\n";

    for (int n : {1000, 2000, 4000}) {
        vector<int> g(n, 1), c(n, 1);
        c[n - 2] = 2;
        g[n - 1] = 2;                    // only the last station works as a start
        work = 0;
        int a = greedy(g, c);
        long long greedyWork = work;
        work = 0;
        int b = bruteForce(g, c);
        cout << "n=" << n << ": start " << a << "/" << b << ", greedy steps " << greedyWork << ", brute force steps " << work << "\\n";
    }
    return 0;
}` },
        ],
      },
    },
  },
];

export default augments;
