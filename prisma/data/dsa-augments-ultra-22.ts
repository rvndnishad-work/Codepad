/**
 * DSA ULTRA — batch 22: graphs I (traversal problems) — cloning a graph, the
 * bipartite check, Rotting Oranges with multi-source BFS, Word Ladder, and
 * building the Word Ladder wildcard graph. One complete answer per language
 * (Python, JavaScript, Java, C++). Every example was run with python3 / node /
 * javac+java / g++ -std=c++17 by scripts/verify-dsa-examples.ts and the quoted
 * output is that run's output.
 */
import type { DsaUltraAugment } from "./dsa-augments.types";

const augments: DsaUltraAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you clone a graph?",
    difficulty: "medium",
    seoDescription: "Clone a graph with BFS or DFS and an old-to-new hash map: why the map stops cycles, O(V+E) cost, and verified code in Python, JS, Java and C++.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You get a reference to one node of a connected, undirected graph. Each node has a value and a list of its neighbours. Return a deep copy of the whole graph — every node must be a new object, wired up the same way. Please write it in Python and tell me the complexity."

**What a strong answer should cover:**
- A traversal (BFS with a queue or DFS with recursion) plus a \`dict\` mapping each **original node → its copy**; the map is both the visited set and the way to find the copy of a neighbour.
- Why the map is mandatory: graphs have cycles, so copying without it loops forever (or duplicates nodes).
- Inserting the copy into the map **before** visiting its neighbours, and handling the empty input (\`None\`).
- O(V + E) time and O(V) extra space for the map and the queue (or the recursion stack).
- Python specifics: \`collections.deque\` with \`popleft()\` for the queue (not \`list.pop(0)\`), node objects are hashable by identity unless the class defines \`__eq__\` without \`__hash__\`, and recursive DFS hits the default recursion limit of 1000 on a long path.

**Clarifying questions expected:**
- Is the input possibly \`None\`, and is everything reachable from the given node?
- How big can the graph be (is recursion safe)?

**Code / implementation expected:** Yes — a \`clone_graph(node)\` function in Python using BFS or DFS with a \`dict\`, plus a check that the copy shares no node with the original.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know Python classes, lists and dicts; graphs are explained from scratch.
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by actually running the code with \`python3\` (3.13); nothing is typed in by hand.

## 1. Why This Even Matters — A Story First

Imagine a group chat app that wants to let you **duplicate a friend group** so you can plan a surprise party without the guest of honour. Each person in the group is a card with a name and a list of "friends" — arrows pointing to other cards. Alice points to Bob, Bob points back to Alice and on to Carol, and so on.

If you photocopy only Alice's card, the copy still points at the **real** Bob. Change "copy Bob" and you have actually changed the real Bob. That is a **shallow copy**. What you want is a fresh card for every person, and every arrow on a fresh card must point to another **fresh** card — a parallel world with the same shape and none of the original objects.

The catch is that friendships go in circles: Alice → Bob → Alice. If you copy blindly ("copy Alice, then copy each of her friends, then each of their friends…"), you walk around that circle forever, making a new Alice every lap. The fix is a small notebook: **"original card → the copy I already made for it."** Before copying anyone, look in the notebook. If they are there, reuse that copy. That notebook is the whole algorithm.

Clone Graph is a favourite interview question because it checks three things at once: can you traverse a graph, can you stop on cycles, and do you understand the difference between an object and a reference to it.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Am I given one node, and should I copy everything reachable from it? | That is the usual contract (LeetCode 133). Nodes not reachable from the start are not copied — if the graph can be disconnected you need a list of all nodes instead. |
| Is the graph directed or undirected? | The algorithm is the same, but for undirected graphs every edge appears in **both** neighbour lists, so each edge is wired twice — once from each end. |
| Can the input be empty (null)? | Return null/None straight away; the traversal needs a start node. |
| Are node values unique? | They are in the LeetCode version, but you should **not** key the map by value anyway — key it by the node itself. Then duplicates do not matter. |
| Can there be self-loops or repeated edges? | The map handles both for free: a self-loop finds its own copy in the map. |
| How large can it get — thousands or millions of nodes? | Decides whether a recursive DFS is safe or you need an iterative BFS/DFS to avoid a stack overflow. |

## 3. The Core Idea: Traverse Once, Remember Every Copy

A graph is a set of **nodes** joined by **edges**; here each node object holds a value and a list of neighbour references. How graphs are stored in general is its own page: [What is a graph, and how do you represent it?](/interview-question/what-is-a-graph-and-how-do-you-represent-it)

📌 **Interview term: Deep copy** — a copy in which every reachable object is duplicated, so the copy shares **no** objects with the original. The opposite is a **shallow copy**, which duplicates only the top object and keeps references to the original children.

📌 **Interview term: Visited map (old → new)** — a hash map from each original node to its copy. It does two jobs at once: it is the **visited set** that stops the traversal from looping on cycles, and it is the **lookup table** you use to wire copied edges to copied nodes.

📌 **Interview term: Graph traversal** — visiting every node reachable from a start node. Breadth-first search (BFS) uses a queue and goes level by level; depth-first search (DFS) uses recursion or a stack and goes deep first. Either works here; the difference is covered in [What is the difference between BFS and DFS?](/interview-question/what-is-the-difference-between-bfs-and-dfs)

<svg class="iq-diagram" width="100%" viewBox="0 0 680 270" role="img" aria-label="An original 4-cycle with nodes 1 2 3 4 on the left and a copy with new nodes c1 c2 c3 c4 on the right that has the same edges">
  <defs>
    <marker id="cg22-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="150" y="28" text-anchor="middle">Original objects</text>
  <text class="d-text d-accent" x="530" y="28" text-anchor="middle">Brand new objects</text>
  <line class="d-edge" x1="90" y1="80" x2="210" y2="80"/>
  <line class="d-edge" x1="210" y1="80" x2="210" y2="210"/>
  <line class="d-edge" x1="210" y1="210" x2="90" y2="210"/>
  <line class="d-edge" x1="90" y1="210" x2="90" y2="80"/>
  <circle class="d-box" cx="90" cy="80" r="24"/>
  <text class="d-text" x="90" y="86" text-anchor="middle">1</text>
  <circle class="d-box" cx="210" cy="80" r="24"/>
  <text class="d-text" x="210" y="86" text-anchor="middle">2</text>
  <circle class="d-box" cx="210" cy="210" r="24"/>
  <text class="d-text" x="210" y="216" text-anchor="middle">3</text>
  <circle class="d-box" cx="90" cy="210" r="24"/>
  <text class="d-text" x="90" y="216" text-anchor="middle">4</text>
  <path class="d-edge-accent" d="M 270 145 L 400 145" marker-end="url(#cg22-arrow)"/>
  <text class="d-sub" x="335" y="130" text-anchor="middle">clone</text>
  <line class="d-edge-accent" x1="470" y1="80" x2="590" y2="80"/>
  <line class="d-edge-accent" x1="590" y1="80" x2="590" y2="210"/>
  <line class="d-edge-accent" x1="590" y1="210" x2="470" y2="210"/>
  <line class="d-edge-accent" x1="470" y1="210" x2="470" y2="80"/>
  <circle class="d-box-accent" cx="470" cy="80" r="24"/>
  <text class="d-text d-accent" x="470" y="86" text-anchor="middle">c1</text>
  <circle class="d-box-accent" cx="590" cy="80" r="24"/>
  <text class="d-text d-accent" x="590" y="86" text-anchor="middle">c2</text>
  <circle class="d-box-accent" cx="590" cy="210" r="24"/>
  <text class="d-text d-accent" x="590" y="216" text-anchor="middle">c3</text>
  <circle class="d-box-accent" cx="470" cy="210" r="24"/>
  <text class="d-text d-accent" x="470" y="216" text-anchor="middle">c4</text>
</svg>

The copy has the same shape — c1 is joined to c2 and c4, exactly like 1 is joined to 2 and 4 — but not one arrow crosses from the right side to the left side. "Same shape, zero shared objects" is precisely what the verified examples check.

### How BFS fills the map

The algorithm, in plain words:

1. If the start node is empty, return empty.
2. Copy the start node, put \`start → copy\` in the map, and put the start node in a queue.
3. Take a node \`cur\` off the queue. For each neighbour \`nb\`:
   - if \`nb\` is **not** in the map, make its copy, add it to the map and queue \`nb\` (this happens exactly once per node);
   - in every case, append \`map[nb]\` to \`map[cur]\`'s neighbour list (this happens once per neighbour-list entry).
4. When the queue is empty, return \`map[start]\`.

Here is that loop on the 4-cycle whose neighbour lists are 1: [2, 4], 2: [1, 3], 3: [2, 4], 4: [1, 3]:

<svg class="iq-diagram" width="100%" viewBox="0 0 680 390" role="img" aria-label="BFS clone trace on the 4-cycle. Start with map 1 to c1 and queue 1. Pop 1 copies 2 and 4. Pop 2 copies 3. Pop 4 and pop 3 only wire edges to existing copies">
  <rect class="d-box-muted" x="30" y="20" width="620" height="54" rx="8"/>
  <text class="d-text" x="50" y="43">Start: map = { 1: c1 }</text>
  <text class="d-sub" x="50" y="63">queue = [1]</text>
  <rect class="d-box-accent" x="30" y="92" width="620" height="54" rx="8"/>
  <text class="d-text d-accent" x="50" y="115">Pop 1: 2 and 4 are new, so make c2 and c4</text>
  <text class="d-sub" x="50" y="135">wire c1 to c2, c1 to c4; queue = [2, 4]</text>
  <rect class="d-box-accent" x="30" y="164" width="620" height="54" rx="8"/>
  <text class="d-text d-accent" x="50" y="187">Pop 2: 1 is already in the map, 3 is new, so make c3</text>
  <text class="d-sub" x="50" y="207">wire c2 to c1, c2 to c3; queue = [4, 3]</text>
  <rect class="d-box" x="30" y="236" width="620" height="54" rx="8"/>
  <text class="d-text" x="50" y="259">Pop 4: 1 and 3 are both in the map, nothing new</text>
  <text class="d-sub" x="50" y="279">wire c4 to c1, c4 to c3; queue = [3]</text>
  <rect class="d-box" x="30" y="308" width="620" height="54" rx="8"/>
  <text class="d-text" x="50" y="331">Pop 3: 2 and 4 are both in the map, nothing new</text>
  <text class="d-sub" x="50" y="351">wire c3 to c2, c3 to c4; queue is empty, return c1</text>
</svg>

Four copies were made (one per node) and eight neighbour entries were wired (two per undirected edge). The check "is it in the map?" ran once for each of those eight entries — that is where the O(V + E) bound comes from.

### Why "register the copy before you recurse" (DFS version)

The recursive DFS version is shorter: \`clone(node)\` returns the map entry if there is one; otherwise it creates the copy, **stores it in the map**, and then calls \`clone\` on each neighbour. The order of those two middle steps is the classic bug. If you recurse first and store later, the cycle 1 → 2 → 1 comes back to node 1 before node 1 is in the map, makes a second copy of 1, and never stops. Storing first means the walk back to 1 finds \`c1\` and returns at once. Example 2 shows the version with **no** map at all giving up after 50 calls on a graph with just two nodes.


## 4. The Code in Python (BFS)

~~~python
from collections import deque


class Node:
    def __init__(self, val, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []


def clone_graph(node):
    if node is None:
        return None
    copies = {node: Node(node.val)}          # original node -> its copy
    queue = deque([node])
    while queue:
        cur = queue.popleft()
        for nb in cur.neighbors:
            if nb not in copies:             # first time we see nb: copy it, queue it
                copies[nb] = Node(nb.val)
                queue.append(nb)
            copies[cur].neighbors.append(copies[nb])   # wire the copied edge
    return copies[node]
~~~

The Python parts that matter:

- **\`neighbors=None\` then \`[]\` inside \`__init__\`.** Writing \`def __init__(self, val, neighbors=[])\` is the famous mutable-default bug: that one list would be shared by every node created without an argument, so all copies would end up with the same neighbour list. \`None\` as the default and a fresh list in the body avoids it.
- **\`copies = {node: Node(node.val)}\`** — a \`dict\` keyed by the **node object**. A plain class instance is hashable out of the box: its hash and equality come from its identity (where it lives in memory), which is exactly what we want — two different nodes that happen to hold the same value stay two different keys.
- **\`deque\` and \`popleft()\`.** \`collections.deque\` is a double-ended queue; the Python docs describe appends and pops at either end as O(1) and note that \`list.pop(0)\` and \`list.insert(0, v)\` are O(n) because they shift the whole list ([collections docs](https://docs.python.org/3/library/collections.html#collections.deque)). On a big graph \`pop(0)\` would silently make the clone quadratic.
- **\`if nb not in copies\`** is an average O(1) hash lookup. It is the visited check *and* it guarantees each node is copied once.
- **\`copies[cur].neighbors.append(copies[nb])\`** runs for **every** neighbour entry, new or not — skipping it for already-seen neighbours is a common bug that drops edges.

📌 **Interview term: Identity vs equality** — identity asks "is this the very same object?" (\`a is b\`), equality asks "do these look the same?" (\`a == b\`). The clone map must work on identity, and the final check "no shared nodes" is an identity check.

The recursive DFS version, for comparison (this is the one in example 2):

~~~python
def dfs_clone(node, copies):
    if node in copies:
        return copies[node]
    copy = Node(node.val)
    copies[node] = copy                   # register BEFORE recursing: breaks cycles
    for nb in node.neighbors:
        copy.neighbors.append(dfs_clone(nb, copies))
    return copy
~~~

It is shorter, but every node on the current path sits on Python's call stack. Two Python facts worth knowing, checked by running them — a 5,000-node path breaks the recursive version, and a class that defines \`__eq__\` without \`__hash__\` can no longer be a dict key at all:

~~~python
import sys


class Node:
    def __init__(self, val):
        self.val = val
        self.neighbors = []


def dfs_clone(node, copies):
    if node in copies:
        return copies[node]
    copy = Node(node.val)
    copies[node] = copy
    for nb in node.neighbors:
        copy.neighbors.append(dfs_clone(nb, copies))
    return copy


nodes = [Node(i) for i in range(5000)]       # a path 0 - 1 - 2 - ... - 4999
for a, b in zip(nodes, nodes[1:]):
    a.neighbors.append(b)
    b.neighbors.append(a)

print("recursion limit:", sys.getrecursionlimit())
try:
    dfs_clone(nodes[0], {})
except RecursionError as e:
    print("RecursionError:", e)


class ValueNode:                              # defines __eq__ but not __hash__
    def __init__(self, val):
        self.val = val

    def __eq__(self, other):
        return self.val == other.val


try:
    {ValueNode(1): "copy"}
except TypeError as e:
    print("TypeError:", e)
~~~

~~~text
recursion limit: 1000
RecursionError: maximum recursion depth exceeded
TypeError: unhashable type: 'ValueNode'
~~~

So in Python: prefer the BFS (or an explicit-stack DFS) for anything that might be long and thin, and do not give \`Node\` a value-based \`__eq__\`. Raising the limit with \`sys.setrecursionlimit\` is possible but only moves the problem — the C stack underneath can still overflow. Why recursion costs stack space at all is explained in [How much stack space does recursion use?](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)

## 5. Verified: Running the Code

Both examples were saved as \`main.py\` and run with \`python3 main.py\` (Python 3.13). Example 1 clones four graphs (a 4-cycle, a single node, the empty graph and a triangle), checks the copy has the same shape, checks by identity (\`id()\`) that it shares no node with the original, and then edits the copy to prove the original does not change:

~~~text
4-cycle
  clone: 1 -> [2, 4]; 2 -> [1, 3]; 3 -> [2, 4]; 4 -> [1, 3]
  same shape: true
  shares a node with the original: false
single node
  clone: 1 -> []
  same shape: true
  shares a node with the original: false
empty graph
  clone: null
  same shape: true
triangle
  clone: 1 -> [2, 3]; 2 -> [1, 3]; 3 -> [1, 2]
  same shape: true
  shares a node with the original: false
after editing the clone, original: 1 -> [2, 4]; 2 -> [1, 3]; 3 -> [2, 4]; 4 -> [1, 3]
clone now: 3 -> [200, 4]; 4 -> [100, 3]; 100 -> [200, 4]; 200 -> [100, 3]
~~~

The last two lines are the deep-copy proof: values 100 and 200 appear only in the clone.

Example 2 shows why the map is required and counts the work. A clone **without** a map recurses forever on the two-node graph \`1 - 2\` (it stops only because of a safety limit). With the map, the DFS makes exactly one copy per node and \`1 + 2E\` calls — one for the start, and one for each end of each undirected edge. The BFS clone of a 10,000-node path does exactly \`2 × 9,999 = 19,998\` neighbour checks:

~~~text
naive clone of 1 - 2 without a map: gave up after 50 calls
4-cycle: nodes=4 edges=4 dfs calls=9 copies=4
K5: nodes=5 edges=10 dfs calls=21 copies=5
star: nodes=7 edges=6 dfs calls=13 copies=7
bfs clone of a 10000-node path: copies=10000 neighbor checks=19998
~~~

## 6. Complexity

| | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| BFS clone | O(V + E) | O(V) | Each node is copied and queued once; each neighbour entry is checked and wired once. The \`dict\` holds V entries; the \`deque\` holds at most V nodes. |
| Recursive DFS clone | O(V + E) | O(V) | Same work; the call stack can be V frames deep on a path — which is what hits the 1000-frame limit. |
| The copy itself | — | O(V + E) | The output graph has V new nodes and the same number of neighbour entries; this is usually not counted as "extra". |

\`V\` is the number of nodes and \`E\` the number of edges. "O(1) average" \`dict\` operations are behind the linear bound — see [How does a hash table work?](/interview-question/how-does-a-hash-table-work)

## Edge Cases

- **\`None\` input** — return \`None\` before touching the queue (example 1, "empty graph").
- **A single node with no neighbours** — the loop runs once, wires nothing, returns one fresh node.
- **Cycles of any length** — the map handles them; the triangle and the 4-cycle both clone correctly.
- **Self-loop** (a node listed as its own neighbour) — \`copies[cur]\` already exists, so the copy gets itself as a neighbour, as it should.
- **Duplicate values** — irrelevant, because the map is keyed by node object, not by \`val\`.
- **Disconnected graph** — only the part reachable from the given node is copied. If you are handed a list of all nodes, run the same loop from every node that is not yet in the map.

## Common Pitfalls

- **No map, or a map filled too late** — the naive version in example 2 is still recursing after 50 calls on two nodes. In DFS, put \`copies[node] = copy\` *before* the loop over neighbours.
- **Keying the map by \`node.val\`** — breaks as soon as two nodes share a value; key by the node object.
- **\`list.pop(0)\` as the queue** — O(n) per pop, so the whole clone becomes O(V²) on a large graph; use \`deque.popleft()\`.
- **Mutable default argument** \`neighbors=[]\` — every node would share one list.
- **Wiring only new neighbours** — the edge to an already-copied neighbour must still be appended, otherwise the clone loses edges.
- **Recursive DFS on a long chain** — \`RecursionError\` at depth 1000 by default, as shown above.
- **Using \`copy.deepcopy\`** — it works on this structure (it keeps its own memo dict for exactly this reason), but the interviewer wants to see you write the traversal; mention it as the library equivalent, not as the answer.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Traverse the graph once with BFS and keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> from each <strong style="color:#ffca28;">original</strong> node to its <strong style="color:#ffca28;">copy</strong>; for every neighbour, create its copy on first sight, then append <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">copies[nb]</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">copies[cur].neighbors</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why the map is the key:</strong> <span style="color:#f0e2c8;">It is the visited set, so cycles cannot loop forever, and it is how I find the copy of a neighbour I have already copied. In DFS I store the copy <strong style="color:#ffca28;">before</strong> recursing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">O(V + E) time — each node is copied once and each neighbour entry is checked once — and O(V) extra space for the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deque</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Edge cases:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> input returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>; a single node, self-loops and duplicate values all work because the map is keyed by the node object, not by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">val</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The Python detail:</strong> <span style="color:#f0e2c8;">I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">collections.deque</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">popleft()</code> rather than <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list.pop(0)</code>, and BFS rather than recursion because a recursive DFS hits <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RecursionError</code> at the default limit of 1000 on a long path.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not key the map by the node value?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Values are not guaranteed unique in general, and two different nodes with the same value would collapse into one copy. Keying by the node object uses identity, which is exactly "this node, not one that looks like it".</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you just call <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">copy.deepcopy</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It would work — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deepcopy</code> keeps its own memo <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> of already-copied objects for exactly this cyclic case. But it hides the algorithm the question is testing, so I mention it and then write the traversal.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">BFS or DFS — does it matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not for correctness or the O(V + E) bound. Recursive DFS is shorter but uses a call stack as deep as the longest path, so in Python I default to BFS or an explicit stack.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes if the graph can be disconnected?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Given only one node you can only reach its component. Given a list of all nodes, loop over them and start a BFS from each node that is not yet in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">copies</code> — the same pattern as counting connected components.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you prove the copy is deep?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Collect the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">id()</code> of every original node into a set and check no node of the clone is in it, then mutate the clone and show the original is unchanged — that is what example 1 prints.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Deep copy** | A copy that duplicates every reachable object and shares none with the original |
| **Shallow copy** | A copy of the top object only; its children are still the original objects |
| **Visited map (old → new)** | \`dict\` from each original node to its copy; also stops cycles |
| **Graph traversal** | Visiting every reachable node — BFS with a queue, DFS with recursion or a stack |
| **Identity vs equality** | \`is\` (same object) vs \`==\` (looks the same); the clone map relies on identity |

---
**Conclusion:** Cloning a graph is a traversal with one extra structure: a \`dict\` from each original node to its copy. BFS with a \`deque\` (or DFS that registers the copy before recursing) visits each node once and each neighbour entry once, so it runs in O(V + E) time with O(V) extra space, and the map is what keeps cycles from looping forever. In Python, the details that separate a good answer are a \`deque\` instead of \`list.pop(0)\`, identity-keyed nodes, no mutable default argument, and knowing that a recursive DFS stops at 1000 frames. The same old → new map idea comes back whenever you copy a structure with shared or cyclic references; the traversal itself is the same one used for [counting connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph) and the [bipartite check](/interview-question/how-do-you-check-if-a-graph-is-bipartite).`,
        examples: [
          {
            label: "BFS clone with an old-to-new map: shape check and no shared nodes",
            code: `from collections import deque


class Node:
    def __init__(self, val, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []


def clone_graph(node):
    """Deep-copy a connected graph with BFS and an original -> copy dict."""
    if node is None:
        return None
    copies = {node: Node(node.val)}          # keyed by the node object itself
    queue = deque([node])
    while queue:
        cur = queue.popleft()
        for nb in cur.neighbors:
            if nb not in copies:             # first time we see nb: copy it, queue it
                copies[nb] = Node(nb.val)
                queue.append(nb)
            copies[cur].neighbors.append(copies[nb])   # wire the copied edge
    return copies[node]


def build(adj):
    """adj[i] lists the neighbours of node i + 1 (1-indexed, LeetCode style)."""
    if not adj:
        return None
    nodes = [Node(i + 1) for i in range(len(adj))]
    for i, nbs in enumerate(adj):
        nodes[i].neighbors = [nodes[v - 1] for v in nbs]
    return nodes[0]


def all_nodes(start):
    seen, order, queue = {start}, [start], deque([start])
    while queue:
        for nb in queue.popleft().neighbors:
            if nb not in seen:
                seen.add(nb)
                order.append(nb)
                queue.append(nb)
    return sorted(order, key=lambda n: n.val)


def describe(start):
    if start is None:
        return "null"
    return "; ".join(str(n.val) + " -> [" + ", ".join(str(m.val) for m in n.neighbors) + "]"
                     for n in all_nodes(start))


cases = [("4-cycle", [[2, 4], [1, 3], [2, 4], [1, 3]]),
         ("single node", [[]]),
         ("empty graph", []),
         ("triangle", [[2, 3], [1, 3], [1, 2]])]
for name, adj in cases:
    original = build(adj)
    copy = clone_graph(original)
    print(name)
    print("  clone: " + describe(copy))
    print("  same shape: " + str(describe(copy) == describe(original)).lower())
    if original is not None:
        orig_ids = {id(n) for n in all_nodes(original)}
        shared = any(id(n) in orig_ids for n in all_nodes(copy))
        print("  shares a node with the original: " + str(shared).lower())

original = build([[2, 4], [1, 3], [2, 4], [1, 3]])
copy = clone_graph(original)
copy.val = 100
copy.neighbors[0].val = 200
print("after editing the clone, original: " + describe(original))
print("clone now: " + describe(copy))`,
          },
          {
            label: "Why the map matters: naive recursion vs DFS clone call counts, and BFS on a 10000-node path",
            code: `from collections import deque


class Node:
    def __init__(self, val):
        self.val = val
        self.neighbors = []


def naive_clone(node, stats, limit):
    """WRONG on purpose: no original -> copy map, so a cycle never ends."""
    stats["calls"] += 1
    if stats["calls"] > limit:            # safety valve so the demo stops
        return None
    copy = Node(node.val)
    for nb in node.neighbors:
        copy.neighbors.append(naive_clone(nb, stats, limit))
    return copy


def dfs_clone(node, copies, stats):
    """Recursive DFS clone: the map is both the visited set and the result."""
    stats["calls"] += 1
    if node in copies:
        return copies[node]
    copy = Node(node.val)
    copies[node] = copy                   # register BEFORE recursing: breaks cycles
    for nb in node.neighbors:
        copy.neighbors.append(dfs_clone(nb, copies, stats))
    return copy


def bfs_clone(node, stats):
    copies = {node: Node(node.val)}
    queue = deque([node])
    while queue:
        cur = queue.popleft()
        for nb in cur.neighbors:
            stats["checks"] += 1
            if nb not in copies:
                copies[nb] = Node(nb.val)
                queue.append(nb)
            copies[cur].neighbors.append(copies[nb])
    return copies


def make(n, edges):
    nodes = [Node(i + 1) for i in range(n)]
    for a, b in edges:                    # undirected: store both directions
        nodes[a - 1].neighbors.append(nodes[b - 1])
        nodes[b - 1].neighbors.append(nodes[a - 1])
    return nodes[0]


stats = {"calls": 0}
naive_clone(make(2, [(1, 2)]), stats, 50)
print("naive clone of 1 - 2 without a map: gave up after " + str(stats["calls"] - 1) + " calls")

graphs = [("4-cycle", 4, [(1, 2), (2, 3), (3, 4), (4, 1)]),
          ("K5", 5, [(a, b) for a in range(1, 6) for b in range(a + 1, 6)]),
          ("star", 7, [(1, k) for k in range(2, 8)])]
for name, n, edges in graphs:
    stats, copies = {"calls": 0}, {}
    dfs_clone(make(n, edges), copies, stats)
    print(name + ": nodes=" + str(n) + " edges=" + str(len(edges)) +
          " dfs calls=" + str(stats["calls"]) + " copies=" + str(len(copies)))

n = 10000
stats = {"checks": 0}
copies = bfs_clone(make(n, [(k, k + 1) for k in range(1, n)]), stats)
print("bfs clone of a " + str(n) + "-node path: copies=" + str(len(copies)) +
      " neighbor checks=" + str(stats["checks"]))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You get a reference to one node of a connected, undirected graph. Each node has a \`val\` and an array of \`neighbors\`. Return a deep copy of the whole graph — every node must be a new object, wired up the same way. Please write it in JavaScript and tell me the complexity."

**What a strong answer should cover:**
- A traversal (BFS with a queue or DFS with recursion) plus a \`Map\` from each **original node → its copy**; the map is both the visited set and the way to find the copy of a neighbour.
- Why the map is mandatory: graphs have cycles, so copying without it recurses forever.
- Inserting the copy into the map **before** visiting its neighbours, and returning \`null\` for an empty input.
- O(V + E) time and O(V) extra space for the map and the queue (or the call stack).
- JavaScript specifics: a \`Map\` keys by object identity while a plain object turns every key into the string \`"[object Object]"\`; \`Array.prototype.shift()\` moves every element, so a head index is the cheap queue; recursive DFS throws \`RangeError: Maximum call stack size exceeded\` on a long path; \`structuredClone\` handles cycles but returns plain objects, not \`Node\` instances.

**Clarifying questions expected:**
- Can the input be \`null\`, and is everything reachable from the given node?
- How big can the graph be (is recursion safe)?

**Code / implementation expected:** Yes — a \`cloneGraph(node)\` function in JavaScript using BFS or DFS with a \`Map\`, plus a check that the copy shares no node with the original.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know JavaScript classes, arrays and objects; graphs are explained from scratch.
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by actually running the code with \`node\` (v22); nothing is typed in by hand. The examples use no Node-only APIs, so they also run in the browser.

## 1. Why This Even Matters — A Story First

Imagine a group chat app that wants to let you **duplicate a friend group** so you can plan a surprise party without the guest of honour. Each person in the group is a card with a name and a list of "friends" — arrows pointing to other cards. Alice points to Bob, Bob points back to Alice and on to Carol, and so on.

If you photocopy only Alice's card, the copy still points at the **real** Bob. Change "copy Bob" and you have actually changed the real Bob. That is a **shallow copy**. What you want is a fresh card for every person, and every arrow on a fresh card must point to another **fresh** card — a parallel world with the same shape and none of the original objects.

The catch is that friendships go in circles: Alice → Bob → Alice. If you copy blindly ("copy Alice, then copy each of her friends, then each of their friends…"), you walk around that circle forever, making a new Alice every lap. The fix is a small notebook: **"original card → the copy I already made for it."** Before copying anyone, look in the notebook. If they are there, reuse that copy. That notebook is the whole algorithm.

Clone Graph is a favourite interview question because it checks three things at once: can you traverse a graph, can you stop on cycles, and do you understand the difference between an object and a reference to it.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Am I given one node, and should I copy everything reachable from it? | That is the usual contract (LeetCode 133). Nodes not reachable from the start are not copied — if the graph can be disconnected you need a list of all nodes instead. |
| Is the graph directed or undirected? | The algorithm is the same, but for undirected graphs every edge appears in **both** neighbour lists, so each edge is wired twice — once from each end. |
| Can the input be empty (null)? | Return null/None straight away; the traversal needs a start node. |
| Are node values unique? | They are in the LeetCode version, but you should **not** key the map by value anyway — key it by the node itself. Then duplicates do not matter. |
| Can there be self-loops or repeated edges? | The map handles both for free: a self-loop finds its own copy in the map. |
| How large can it get — thousands or millions of nodes? | Decides whether a recursive DFS is safe or you need an iterative BFS/DFS to avoid a stack overflow. |

## 3. The Core Idea: Traverse Once, Remember Every Copy

A graph is a set of **nodes** joined by **edges**; here each node object holds a value and a list of neighbour references. How graphs are stored in general is its own page: [What is a graph, and how do you represent it?](/interview-question/what-is-a-graph-and-how-do-you-represent-it)

📌 **Interview term: Deep copy** — a copy in which every reachable object is duplicated, so the copy shares **no** objects with the original. The opposite is a **shallow copy**, which duplicates only the top object and keeps references to the original children.

📌 **Interview term: Visited map (old → new)** — a hash map from each original node to its copy. It does two jobs at once: it is the **visited set** that stops the traversal from looping on cycles, and it is the **lookup table** you use to wire copied edges to copied nodes.

📌 **Interview term: Graph traversal** — visiting every node reachable from a start node. Breadth-first search (BFS) uses a queue and goes level by level; depth-first search (DFS) uses recursion or a stack and goes deep first. Either works here; the difference is covered in [What is the difference between BFS and DFS?](/interview-question/what-is-the-difference-between-bfs-and-dfs)

<svg class="iq-diagram" width="100%" viewBox="0 0 680 270" role="img" aria-label="An original 4-cycle with nodes 1 2 3 4 on the left and a copy with new nodes c1 c2 c3 c4 on the right that has the same edges">
  <defs>
    <marker id="cg22-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="150" y="28" text-anchor="middle">Original objects</text>
  <text class="d-text d-accent" x="530" y="28" text-anchor="middle">Brand new objects</text>
  <line class="d-edge" x1="90" y1="80" x2="210" y2="80"/>
  <line class="d-edge" x1="210" y1="80" x2="210" y2="210"/>
  <line class="d-edge" x1="210" y1="210" x2="90" y2="210"/>
  <line class="d-edge" x1="90" y1="210" x2="90" y2="80"/>
  <circle class="d-box" cx="90" cy="80" r="24"/>
  <text class="d-text" x="90" y="86" text-anchor="middle">1</text>
  <circle class="d-box" cx="210" cy="80" r="24"/>
  <text class="d-text" x="210" y="86" text-anchor="middle">2</text>
  <circle class="d-box" cx="210" cy="210" r="24"/>
  <text class="d-text" x="210" y="216" text-anchor="middle">3</text>
  <circle class="d-box" cx="90" cy="210" r="24"/>
  <text class="d-text" x="90" y="216" text-anchor="middle">4</text>
  <path class="d-edge-accent" d="M 270 145 L 400 145" marker-end="url(#cg22-arrow)"/>
  <text class="d-sub" x="335" y="130" text-anchor="middle">clone</text>
  <line class="d-edge-accent" x1="470" y1="80" x2="590" y2="80"/>
  <line class="d-edge-accent" x1="590" y1="80" x2="590" y2="210"/>
  <line class="d-edge-accent" x1="590" y1="210" x2="470" y2="210"/>
  <line class="d-edge-accent" x1="470" y1="210" x2="470" y2="80"/>
  <circle class="d-box-accent" cx="470" cy="80" r="24"/>
  <text class="d-text d-accent" x="470" y="86" text-anchor="middle">c1</text>
  <circle class="d-box-accent" cx="590" cy="80" r="24"/>
  <text class="d-text d-accent" x="590" y="86" text-anchor="middle">c2</text>
  <circle class="d-box-accent" cx="590" cy="210" r="24"/>
  <text class="d-text d-accent" x="590" y="216" text-anchor="middle">c3</text>
  <circle class="d-box-accent" cx="470" cy="210" r="24"/>
  <text class="d-text d-accent" x="470" y="216" text-anchor="middle">c4</text>
</svg>

The copy has the same shape — c1 is joined to c2 and c4, exactly like 1 is joined to 2 and 4 — but not one arrow crosses from the right side to the left side. "Same shape, zero shared objects" is precisely what the verified examples check.

### How BFS fills the map

The algorithm, in plain words:

1. If the start node is empty, return empty.
2. Copy the start node, put \`start → copy\` in the map, and put the start node in a queue.
3. Take a node \`cur\` off the queue. For each neighbour \`nb\`:
   - if \`nb\` is **not** in the map, make its copy, add it to the map and queue \`nb\` (this happens exactly once per node);
   - in every case, append \`map[nb]\` to \`map[cur]\`'s neighbour list (this happens once per neighbour-list entry).
4. When the queue is empty, return \`map[start]\`.

Here is that loop on the 4-cycle whose neighbour lists are 1: [2, 4], 2: [1, 3], 3: [2, 4], 4: [1, 3]:

<svg class="iq-diagram" width="100%" viewBox="0 0 680 390" role="img" aria-label="BFS clone trace on the 4-cycle. Start with map 1 to c1 and queue 1. Pop 1 copies 2 and 4. Pop 2 copies 3. Pop 4 and pop 3 only wire edges to existing copies">
  <rect class="d-box-muted" x="30" y="20" width="620" height="54" rx="8"/>
  <text class="d-text" x="50" y="43">Start: map = { 1: c1 }</text>
  <text class="d-sub" x="50" y="63">queue = [1]</text>
  <rect class="d-box-accent" x="30" y="92" width="620" height="54" rx="8"/>
  <text class="d-text d-accent" x="50" y="115">Pop 1: 2 and 4 are new, so make c2 and c4</text>
  <text class="d-sub" x="50" y="135">wire c1 to c2, c1 to c4; queue = [2, 4]</text>
  <rect class="d-box-accent" x="30" y="164" width="620" height="54" rx="8"/>
  <text class="d-text d-accent" x="50" y="187">Pop 2: 1 is already in the map, 3 is new, so make c3</text>
  <text class="d-sub" x="50" y="207">wire c2 to c1, c2 to c3; queue = [4, 3]</text>
  <rect class="d-box" x="30" y="236" width="620" height="54" rx="8"/>
  <text class="d-text" x="50" y="259">Pop 4: 1 and 3 are both in the map, nothing new</text>
  <text class="d-sub" x="50" y="279">wire c4 to c1, c4 to c3; queue = [3]</text>
  <rect class="d-box" x="30" y="308" width="620" height="54" rx="8"/>
  <text class="d-text" x="50" y="331">Pop 3: 2 and 4 are both in the map, nothing new</text>
  <text class="d-sub" x="50" y="351">wire c3 to c2, c3 to c4; queue is empty, return c1</text>
</svg>

Four copies were made (one per node) and eight neighbour entries were wired (two per undirected edge). The check "is it in the map?" ran once for each of those eight entries — that is where the O(V + E) bound comes from.

### Why "register the copy before you recurse" (DFS version)

The recursive DFS version is shorter: \`clone(node)\` returns the map entry if there is one; otherwise it creates the copy, **stores it in the map**, and then calls \`clone\` on each neighbour. The order of those two middle steps is the classic bug. If you recurse first and store later, the cycle 1 → 2 → 1 comes back to node 1 before node 1 is in the map, makes a second copy of 1, and never stops. Storing first means the walk back to 1 finds \`c1\` and returns at once. Example 2 shows the version with **no** map at all giving up after 50 calls on a graph with just two nodes.


## 4. The Code in JavaScript (BFS)

~~~javascript
class Node {
  constructor(val, neighbors = []) {
    this.val = val;
    this.neighbors = neighbors;
  }
}

function cloneGraph(node) {
  if (node === null) return null;
  const copies = new Map([[node, new Node(node.val)]]); // original -> copy
  const queue = [node];
  for (let head = 0; head < queue.length; head++) {      // head index instead of shift()
    const cur = queue[head];
    for (const nb of cur.neighbors) {
      if (!copies.has(nb)) {                             // first sighting: copy and queue
        copies.set(nb, new Node(nb.val));
        queue.push(nb);
      }
      copies.get(cur).neighbors.push(copies.get(nb));    // wire the copied edge
    }
  }
  return copies.get(node);
}
~~~

The JavaScript parts that matter:

- **\`new Map()\`, not \`{}\`.** A \`Map\` can use any value as a key and compares object keys by identity — "is this the very same object?". A plain object converts every key to a string, and every node object becomes the same string \`"[object Object]"\`, so the "map" would hold one entry for the whole graph. That is shown in the snippet below.
- **The queue is an array plus a \`head\` index.** \`queue.shift()\` removes the first element and, per its definition, moves every remaining element down by one ([MDN: Array.prototype.shift](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/shift)), so in principle each call is O(n). Engines may optimise this, but you cannot rely on it; advancing a \`head\` index is always O(1). The array keeps the dequeued nodes, which costs O(V) memory you were paying anyway.
- **\`copies.has(nb)\`** is the visited check *and* makes sure each node is copied once.
- **\`copies.get(cur).neighbors.push(copies.get(nb))\`** runs for **every** neighbour entry, new or already copied — skipping it for seen neighbours drops edges.
- **\`neighbors = []\` as a default parameter is safe in JavaScript.** Default parameters are evaluated on every call, so each node gets its own fresh array (the snippet prints \`false\` for "shared"). This is the opposite of Python, where a \`[]\` default is created once and shared.

📌 **Interview term: Reference equality** — \`a === b\` on two objects is true only if they are the **same** object, never because they have equal contents. \`Map\` and \`Set\` use this (technically *SameValueZero*) for object keys, which is exactly what a clone map needs.

The recursive DFS version is shorter; it is the one used in example 2:

~~~javascript
function dfsClone(node, copies) {
  if (copies.has(node)) return copies.get(node);
  const copy = new Node(node.val);
  copies.set(node, copy);                        // register BEFORE recursing: breaks cycles
  for (const nb of node.neighbors) copy.neighbors.push(dfsClone(nb, copies));
  return copy;
}
~~~

Every node on the current path is a stack frame. On a 100,000-node path it runs out of stack, and the plain-object "map" collapses all nodes into one key — both checked by running this:

~~~javascript
class Node {
  constructor(val) { this.val = val; this.neighbors = []; }
}

function dfsClone(node, copies) {
  if (copies.has(node)) return copies.get(node);
  const copy = new Node(node.val);
  copies.set(node, copy);
  for (const nb of node.neighbors) copy.neighbors.push(dfsClone(nb, copies));
  return copy;
}

const nodes = Array.from({ length: 100000 }, (_, i) => new Node(i)); // a long path
for (let i = 0; i + 1 < nodes.length; i++) {
  nodes[i].neighbors.push(nodes[i + 1]);
  nodes[i + 1].neighbors.push(nodes[i]);
}
try {
  dfsClone(nodes[0], new Map());
  console.log('finished');
} catch (e) {
  console.log(e.name + ': ' + e.message);
}

// Plain objects turn keys into strings, so every node becomes the same key:
const obj = {};
obj[nodes[0]] = 'copy of 0';
obj[nodes[1]] = 'copy of 1';
console.log(JSON.stringify(Object.keys(obj)));
console.log(Object.keys(obj).length);
~~~

~~~text
RangeError: Maximum call stack size exceeded
["[object Object]"]
1
~~~

How deep JavaScript can recurse depends on the engine and the size of each frame, so there is no fixed number to quote; the safe interview answer is "BFS or an explicit stack for big inputs". More on why recursion uses memory: [How much stack space does recursion use?](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)

### What about \`structuredClone\`?

The built-in \`structuredClone\` does a deep copy and handles cycles — but it is not a substitute in an interview, and it changes the type of your nodes:

~~~javascript
class Node {
  constructor(val, neighbors = []) { this.val = val; this.neighbors = neighbors; }
}
const a = new Node(1), b = new Node(2);
a.neighbors.push(b);
b.neighbors.push(a);                                   // a cycle: 1 - 2

const c = structuredClone(a);                           // built-in deep copy
console.log('cycle kept: ' + (c.neighbors[0].neighbors[0] === c));
console.log('shares node b: ' + (c.neighbors[0] === b));
console.log('still a Node: ' + (c instanceof Node) + ' (constructor is ' + c.constructor.name + ')');

const x = new Node(1), y = new Node(2);
console.log('default [] shared between nodes: ' + (x.neighbors === y.neighbors));
~~~

~~~text
cycle kept: true
shares node b: false
still a Node: false (constructor is Object)
default [] shared between nodes: false
~~~

The cycle survives and no node is shared, but the copies are plain \`Object\`s, so any methods on the \`Node\` class are gone. Mention it as the library route, then write the traversal.

## 5. Verified: Running the Code

Both examples were saved as \`main.js\` and run with \`node main.js\` (Node.js v22). Example 1 clones four graphs (a 4-cycle, a single node, the empty graph and a triangle), checks the copy has the same shape, checks with a \`Set\` of original nodes (reference equality) that the copy shares none of them, and then edits the copy to prove the original does not change:

~~~text
4-cycle
  clone: 1 -> [2, 4]; 2 -> [1, 3]; 3 -> [2, 4]; 4 -> [1, 3]
  same shape: true
  shares a node with the original: false
single node
  clone: 1 -> []
  same shape: true
  shares a node with the original: false
empty graph
  clone: null
  same shape: true
triangle
  clone: 1 -> [2, 3]; 2 -> [1, 3]; 3 -> [1, 2]
  same shape: true
  shares a node with the original: false
after editing the clone, original: 1 -> [2, 4]; 2 -> [1, 3]; 3 -> [2, 4]; 4 -> [1, 3]
clone now: 3 -> [200, 4]; 4 -> [100, 3]; 100 -> [200, 4]; 200 -> [100, 3]
~~~

The last two lines are the deep-copy proof: the values 100 and 200 appear only in the clone. Note the \`sort((a, b) => a.val - b.val)\` in the helper: the default \`Array.prototype.sort\` compares as strings, which would put 100 before 2.

Example 2 shows why the map is required and counts the work. A clone **without** a map recurses forever on the two-node graph \`1 - 2\` (it stops only because of a safety limit). With the map, the DFS makes exactly one copy per node and \`1 + 2E\` calls — one for the start and one for each end of each undirected edge. The BFS clone of a 10,000-node path does exactly \`2 × 9,999 = 19,998\` neighbour checks:

~~~text
naive clone of 1 - 2 without a map: gave up after 50 calls
4-cycle: nodes=4 edges=4 dfs calls=9 copies=4
K5: nodes=5 edges=10 dfs calls=21 copies=5
star: nodes=7 edges=6 dfs calls=13 copies=7
bfs clone of a 10000-node path: copies=10000 neighbor checks=19998
~~~

## 6. Complexity

| | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| BFS clone (head index) | O(V + E) | O(V) | Each node is copied and queued once; each neighbour entry is checked and wired once. The \`Map\` and the queue array hold V entries each. |
| BFS clone with \`shift()\` | up to O(V² + E) | O(V) | Each \`shift()\` may move the rest of the queue. |
| Recursive DFS clone | O(V + E) | O(V) | Same work; the call stack can be V frames deep — the \`RangeError\` above. |

\`V\` is the number of nodes and \`E\` the number of edges. \`Map\` operations are O(1) on average, which is what makes the total linear — see [How does a hash table work?](/interview-question/how-does-a-hash-table-work)

## Edge Cases

- **\`null\` input** — return \`null\` before building the queue (example 1, "empty graph").
- **A single node with no neighbours** — one copy, nothing wired.
- **Cycles of any length** — handled by the map; the triangle and the 4-cycle both clone correctly.
- **Self-loop** — \`copies.get(cur)\` already exists, so the copy lists itself as a neighbour.
- **Duplicate values** — irrelevant, the \`Map\` is keyed by node object.
- **Disconnected graph** — only the component of the given node is reachable; with a list of all nodes, start a BFS from each node not yet in \`copies\`.

## Common Pitfalls

- **Using a plain object as the map** — every node key becomes \`"[object Object]"\`; the snippet above prints \`1\` key for two nodes.
- **No map, or \`copies.set\` after the recursive calls** — infinite recursion on the first cycle (example 2 gives up after 50 calls on two nodes).
- **Keying the \`Map\` by \`node.val\`** — breaks when two nodes share a value.
- **\`queue.shift()\` in a hot loop** — may make the BFS quadratic; use a head index.
- **Wiring only new neighbours** — edges to already-copied neighbours must be pushed too.
- **Default \`sort()\` on numbers** when printing or comparing results — it sorts as strings; pass \`(a, b) => a - b\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Traverse the graph once with BFS and keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> from each <strong style="color:#ffca28;">original</strong> node to its <strong style="color:#ffca28;">copy</strong>; for every neighbour, create its copy on first sight, then push <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">copies.get(nb)</code> onto <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">copies.get(cur).neighbors</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why the map is the key:</strong> <span style="color:#f0e2c8;">It is the visited set, so cycles cannot loop forever, and it is how I find the copy of a neighbour I already copied. In DFS I call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">copies.set</code> <strong style="color:#ffca28;">before</strong> recursing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">O(V + E) time — each node copied once, each neighbour entry checked once — and O(V) extra space for the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> and the queue.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Edge cases:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>; a single node, self-loops and duplicate values all work because the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> is keyed by the node object, not by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">val</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The JavaScript detail:</strong> <span style="color:#f0e2c8;">It must be a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code>, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{}</code> — a plain object stringifies every node to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"[object Object]"</code>. I use a head index instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shift()</code>, and BFS instead of recursion so a long path cannot throw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not use a plain object keyed by <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">node.val</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Values are not guaranteed unique, so two nodes with the same value would share one copy. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> keyed by the node object compares by reference, which is exactly "this node".</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">structuredClone</code> instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It copies cycles correctly, but the copies come back as plain objects — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">instanceof Node</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> — and it skips the algorithm being tested. I mention it, then write the traversal.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">WeakMap</code> work for the copies?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WeakMap</code> also keys by object identity and lets the originals be garbage-collected. But it is not iterable and has no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size</code>, and the map only lives for one call, so a plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> is simpler.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">BFS or DFS — does it matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not for correctness or the bound. Recursive DFS is shorter but its depth equals the longest path, and the engine stack limit is not something I can control from the code, so BFS is the safer default.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test that the copy is deep?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Put every original node in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code>, walk the clone and check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set.has(n)</code> is never true, then change a value in the clone and show the original is unchanged — example 1 does exactly that.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Deep copy** | A copy that duplicates every reachable object and shares none with the original |
| **Shallow copy** | A copy of the top object only; its children are still the original objects |
| **Visited map (old → new)** | \`Map\` from each original node to its copy; also stops cycles |
| **Graph traversal** | Visiting every reachable node — BFS with a queue, DFS with recursion or a stack |
| **Reference equality** | \`===\` on objects: true only for the very same object; how \`Map\` compares object keys |

---
**Conclusion:** Cloning a graph is a traversal with one extra structure: a \`Map\` from each original node to its copy. BFS with a head-indexed array (or DFS that registers the copy before recursing) visits each node once and each neighbour entry once — O(V + E) time, O(V) extra space — and the \`Map\` is what keeps cycles from looping. In JavaScript, the details that make the answer strong are \`Map\` instead of a plain object, avoiding \`shift()\` in the BFS, knowing that deep recursion throws \`RangeError\`, and knowing that \`structuredClone\` copies cycles but drops the class. The same traversal drives [counting connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph) and the [bipartite check](/interview-question/how-do-you-check-if-a-graph-is-bipartite).`,
        examples: [
          {
            label: "BFS clone with an old-to-new map: shape check and no shared nodes",
            code: `class Node {
  constructor(val, neighbors = []) {
    this.val = val;
    this.neighbors = neighbors;
  }
}

// Deep-copy a connected graph with BFS and an original -> copy Map.
function cloneGraph(node) {
  if (node === null) return null;
  const copies = new Map([[node, new Node(node.val)]]); // Map keys by object identity
  const queue = [node];
  for (let head = 0; head < queue.length; head++) {      // head index: no O(n) shift()
    const cur = queue[head];
    for (const nb of cur.neighbors) {
      if (!copies.has(nb)) {                             // first sighting: copy and queue
        copies.set(nb, new Node(nb.val));
        queue.push(nb);
      }
      copies.get(cur).neighbors.push(copies.get(nb));    // wire the copied edge
    }
  }
  return copies.get(node);
}

// adj[i] lists the neighbours of node i + 1 (1-indexed, LeetCode style).
function build(adj) {
  if (adj.length === 0) return null;
  const nodes = adj.map((_, i) => new Node(i + 1));
  adj.forEach((nbs, i) => { nodes[i].neighbors = nbs.map((v) => nodes[v - 1]); });
  return nodes[0];
}

function allNodes(start) {
  const seen = new Set([start]);
  const order = [start];
  for (let head = 0; head < order.length; head++) {
    for (const nb of order[head].neighbors) {
      if (!seen.has(nb)) { seen.add(nb); order.push(nb); }
    }
  }
  return order.sort((a, b) => a.val - b.val);            // numeric comparator, not default sort
}

function describe(start) {
  if (start === null) return 'null';
  return allNodes(start)
    .map((n) => n.val + ' -> [' + n.neighbors.map((m) => m.val).join(', ') + ']')
    .join('; ');
}

const cases = [['4-cycle', [[2, 4], [1, 3], [2, 4], [1, 3]]],
  ['single node', [[]]],
  ['empty graph', []],
  ['triangle', [[2, 3], [1, 3], [1, 2]]]];
for (const [name, adj] of cases) {
  const original = build(adj);
  const copy = cloneGraph(original);
  console.log(name);
  console.log('  clone: ' + describe(copy));
  console.log('  same shape: ' + (describe(copy) === describe(original)));
  if (original !== null) {
    const origSet = new Set(allNodes(original));
    const shared = allNodes(copy).some((n) => origSet.has(n));
    console.log('  shares a node with the original: ' + shared);
  }
}

const original = build([[2, 4], [1, 3], [2, 4], [1, 3]]);
const copy = cloneGraph(original);
copy.val = 100;
copy.neighbors[0].val = 200;
console.log('after editing the clone, original: ' + describe(original));
console.log('clone now: ' + describe(copy));`,
          },
          {
            label: "Why the map matters: naive recursion vs DFS clone call counts, and BFS on a 10000-node path",
            code: `class Node {
  constructor(val) { this.val = val; this.neighbors = []; }
}

// WRONG on purpose: no original -> copy map, so a cycle never ends.
function naiveClone(node, stats, limit) {
  stats.calls++;
  if (stats.calls > limit) return null;          // safety valve so the demo stops
  const copy = new Node(node.val);
  for (const nb of node.neighbors) copy.neighbors.push(naiveClone(nb, stats, limit));
  return copy;
}

// Recursive DFS clone: the Map is both the visited set and the result.
function dfsClone(node, copies, stats) {
  stats.calls++;
  if (copies.has(node)) return copies.get(node);
  const copy = new Node(node.val);
  copies.set(node, copy);                        // register BEFORE recursing: breaks cycles
  for (const nb of node.neighbors) copy.neighbors.push(dfsClone(nb, copies, stats));
  return copy;
}

function bfsClone(node, stats) {
  const copies = new Map([[node, new Node(node.val)]]);
  const queue = [node];
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head];
    for (const nb of cur.neighbors) {
      stats.checks++;
      if (!copies.has(nb)) { copies.set(nb, new Node(nb.val)); queue.push(nb); }
      copies.get(cur).neighbors.push(copies.get(nb));
    }
  }
  return copies;
}

function make(n, edges) {
  const nodes = Array.from({ length: n }, (_, i) => new Node(i + 1));
  for (const [a, b] of edges) {                  // undirected: store both directions
    nodes[a - 1].neighbors.push(nodes[b - 1]);
    nodes[b - 1].neighbors.push(nodes[a - 1]);
  }
  return nodes[0];
}

let stats = { calls: 0 };
naiveClone(make(2, [[1, 2]]), stats, 50);
console.log('naive clone of 1 - 2 without a map: gave up after ' + (stats.calls - 1) + ' calls');

const k5 = [];
for (let a = 1; a <= 5; a++) for (let b = a + 1; b <= 5; b++) k5.push([a, b]);
const star = [];
for (let k = 2; k <= 7; k++) star.push([1, k]);
const graphs = [['4-cycle', 4, [[1, 2], [2, 3], [3, 4], [4, 1]]], ['K5', 5, k5], ['star', 7, star]];
for (const [name, n, edges] of graphs) {
  stats = { calls: 0 };
  const copies = new Map();
  dfsClone(make(n, edges), copies, stats);
  console.log(name + ': nodes=' + n + ' edges=' + edges.length +
    ' dfs calls=' + stats.calls + ' copies=' + copies.size);
}

const n = 10000;
const path = [];
for (let k = 1; k < n; k++) path.push([k, k + 1]);
stats = { checks: 0 };
const copies = bfsClone(make(n, path), stats);
console.log('bfs clone of a ' + n + '-node path: copies=' + copies.size +
  ' neighbor checks=' + stats.checks);`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You get a reference to one node of a connected, undirected graph. Each node has an \`int val\` and a \`List<Node> neighbors\`. Return a deep copy of the whole graph — every node must be a new object, wired up the same way. Please write it in Java and tell me the complexity."

**What a strong answer should cover:**
- A traversal (BFS with a queue or DFS with recursion) plus a \`HashMap<Node, Node>\` from each **original node → its copy**; the map is both the visited set and the way to find the copy of a neighbour.
- Why the map is mandatory: graphs have cycles, so copying without it recurses until \`StackOverflowError\`.
- Putting the copy in the map **before** visiting its neighbours, and returning \`null\` for an empty input.
- O(V + E) time and O(V) extra space for the map and the queue (or the call stack).
- Java specifics: \`HashMap\` uses \`equals\`/\`hashCode\`, which default to identity — a \`Node\` that overrides them by value breaks the clone (\`IdentityHashMap\` is the safe alternative); \`ArrayDeque\` as the queue; recursive DFS throws \`StackOverflowError\` on a long path with the default thread stack.

**Clarifying questions expected:**
- Can the input be \`null\`, and is everything reachable from the given node?
- Does \`Node\` override \`equals\`/\`hashCode\`, and how big can the graph be?

**Code / implementation expected:** Yes — a \`static Node cloneGraph(Node node)\` in Java using BFS or DFS with a \`HashMap\`, plus a check that the copy shares no node with the original.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know Java classes, \`List\` and \`Map\`; graphs are explained from scratch.
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by actually compiling and running the code with \`javac\` and \`java\` (OpenJDK 21); nothing is typed in by hand.

## 1. Why This Even Matters — A Story First

Imagine a group chat app that wants to let you **duplicate a friend group** so you can plan a surprise party without the guest of honour. Each person in the group is a card with a name and a list of "friends" — arrows pointing to other cards. Alice points to Bob, Bob points back to Alice and on to Carol, and so on.

If you photocopy only Alice's card, the copy still points at the **real** Bob. Change "copy Bob" and you have actually changed the real Bob. That is a **shallow copy**. What you want is a fresh card for every person, and every arrow on a fresh card must point to another **fresh** card — a parallel world with the same shape and none of the original objects.

The catch is that friendships go in circles: Alice → Bob → Alice. If you copy blindly ("copy Alice, then copy each of her friends, then each of their friends…"), you walk around that circle forever, making a new Alice every lap. The fix is a small notebook: **"original card → the copy I already made for it."** Before copying anyone, look in the notebook. If they are there, reuse that copy. That notebook is the whole algorithm.

Clone Graph is a favourite interview question because it checks three things at once: can you traverse a graph, can you stop on cycles, and do you understand the difference between an object and a reference to it.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Am I given one node, and should I copy everything reachable from it? | That is the usual contract (LeetCode 133). Nodes not reachable from the start are not copied — if the graph can be disconnected you need a list of all nodes instead. |
| Is the graph directed or undirected? | The algorithm is the same, but for undirected graphs every edge appears in **both** neighbour lists, so each edge is wired twice — once from each end. |
| Can the input be empty (null)? | Return null/None straight away; the traversal needs a start node. |
| Are node values unique? | They are in the LeetCode version, but you should **not** key the map by value anyway — key it by the node itself. Then duplicates do not matter. |
| Can there be self-loops or repeated edges? | The map handles both for free: a self-loop finds its own copy in the map. |
| How large can it get — thousands or millions of nodes? | Decides whether a recursive DFS is safe or you need an iterative BFS/DFS to avoid a stack overflow. |

## 3. The Core Idea: Traverse Once, Remember Every Copy

A graph is a set of **nodes** joined by **edges**; here each node object holds a value and a list of neighbour references. How graphs are stored in general is its own page: [What is a graph, and how do you represent it?](/interview-question/what-is-a-graph-and-how-do-you-represent-it)

📌 **Interview term: Deep copy** — a copy in which every reachable object is duplicated, so the copy shares **no** objects with the original. The opposite is a **shallow copy**, which duplicates only the top object and keeps references to the original children.

📌 **Interview term: Visited map (old → new)** — a hash map from each original node to its copy. It does two jobs at once: it is the **visited set** that stops the traversal from looping on cycles, and it is the **lookup table** you use to wire copied edges to copied nodes.

📌 **Interview term: Graph traversal** — visiting every node reachable from a start node. Breadth-first search (BFS) uses a queue and goes level by level; depth-first search (DFS) uses recursion or a stack and goes deep first. Either works here; the difference is covered in [What is the difference between BFS and DFS?](/interview-question/what-is-the-difference-between-bfs-and-dfs)

<svg class="iq-diagram" width="100%" viewBox="0 0 680 270" role="img" aria-label="An original 4-cycle with nodes 1 2 3 4 on the left and a copy with new nodes c1 c2 c3 c4 on the right that has the same edges">
  <defs>
    <marker id="cg22-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="150" y="28" text-anchor="middle">Original objects</text>
  <text class="d-text d-accent" x="530" y="28" text-anchor="middle">Brand new objects</text>
  <line class="d-edge" x1="90" y1="80" x2="210" y2="80"/>
  <line class="d-edge" x1="210" y1="80" x2="210" y2="210"/>
  <line class="d-edge" x1="210" y1="210" x2="90" y2="210"/>
  <line class="d-edge" x1="90" y1="210" x2="90" y2="80"/>
  <circle class="d-box" cx="90" cy="80" r="24"/>
  <text class="d-text" x="90" y="86" text-anchor="middle">1</text>
  <circle class="d-box" cx="210" cy="80" r="24"/>
  <text class="d-text" x="210" y="86" text-anchor="middle">2</text>
  <circle class="d-box" cx="210" cy="210" r="24"/>
  <text class="d-text" x="210" y="216" text-anchor="middle">3</text>
  <circle class="d-box" cx="90" cy="210" r="24"/>
  <text class="d-text" x="90" y="216" text-anchor="middle">4</text>
  <path class="d-edge-accent" d="M 270 145 L 400 145" marker-end="url(#cg22-arrow)"/>
  <text class="d-sub" x="335" y="130" text-anchor="middle">clone</text>
  <line class="d-edge-accent" x1="470" y1="80" x2="590" y2="80"/>
  <line class="d-edge-accent" x1="590" y1="80" x2="590" y2="210"/>
  <line class="d-edge-accent" x1="590" y1="210" x2="470" y2="210"/>
  <line class="d-edge-accent" x1="470" y1="210" x2="470" y2="80"/>
  <circle class="d-box-accent" cx="470" cy="80" r="24"/>
  <text class="d-text d-accent" x="470" y="86" text-anchor="middle">c1</text>
  <circle class="d-box-accent" cx="590" cy="80" r="24"/>
  <text class="d-text d-accent" x="590" y="86" text-anchor="middle">c2</text>
  <circle class="d-box-accent" cx="590" cy="210" r="24"/>
  <text class="d-text d-accent" x="590" y="216" text-anchor="middle">c3</text>
  <circle class="d-box-accent" cx="470" cy="210" r="24"/>
  <text class="d-text d-accent" x="470" y="216" text-anchor="middle">c4</text>
</svg>

The copy has the same shape — c1 is joined to c2 and c4, exactly like 1 is joined to 2 and 4 — but not one arrow crosses from the right side to the left side. "Same shape, zero shared objects" is precisely what the verified examples check.

### How BFS fills the map

The algorithm, in plain words:

1. If the start node is empty, return empty.
2. Copy the start node, put \`start → copy\` in the map, and put the start node in a queue.
3. Take a node \`cur\` off the queue. For each neighbour \`nb\`:
   - if \`nb\` is **not** in the map, make its copy, add it to the map and queue \`nb\` (this happens exactly once per node);
   - in every case, append \`map[nb]\` to \`map[cur]\`'s neighbour list (this happens once per neighbour-list entry).
4. When the queue is empty, return \`map[start]\`.

Here is that loop on the 4-cycle whose neighbour lists are 1: [2, 4], 2: [1, 3], 3: [2, 4], 4: [1, 3]:

<svg class="iq-diagram" width="100%" viewBox="0 0 680 390" role="img" aria-label="BFS clone trace on the 4-cycle. Start with map 1 to c1 and queue 1. Pop 1 copies 2 and 4. Pop 2 copies 3. Pop 4 and pop 3 only wire edges to existing copies">
  <rect class="d-box-muted" x="30" y="20" width="620" height="54" rx="8"/>
  <text class="d-text" x="50" y="43">Start: map = { 1: c1 }</text>
  <text class="d-sub" x="50" y="63">queue = [1]</text>
  <rect class="d-box-accent" x="30" y="92" width="620" height="54" rx="8"/>
  <text class="d-text d-accent" x="50" y="115">Pop 1: 2 and 4 are new, so make c2 and c4</text>
  <text class="d-sub" x="50" y="135">wire c1 to c2, c1 to c4; queue = [2, 4]</text>
  <rect class="d-box-accent" x="30" y="164" width="620" height="54" rx="8"/>
  <text class="d-text d-accent" x="50" y="187">Pop 2: 1 is already in the map, 3 is new, so make c3</text>
  <text class="d-sub" x="50" y="207">wire c2 to c1, c2 to c3; queue = [4, 3]</text>
  <rect class="d-box" x="30" y="236" width="620" height="54" rx="8"/>
  <text class="d-text" x="50" y="259">Pop 4: 1 and 3 are both in the map, nothing new</text>
  <text class="d-sub" x="50" y="279">wire c4 to c1, c4 to c3; queue = [3]</text>
  <rect class="d-box" x="30" y="308" width="620" height="54" rx="8"/>
  <text class="d-text" x="50" y="331">Pop 3: 2 and 4 are both in the map, nothing new</text>
  <text class="d-sub" x="50" y="351">wire c3 to c2, c3 to c4; queue is empty, return c1</text>
</svg>

Four copies were made (one per node) and eight neighbour entries were wired (two per undirected edge). The check "is it in the map?" ran once for each of those eight entries — that is where the O(V + E) bound comes from.

### Why "register the copy before you recurse" (DFS version)

The recursive DFS version is shorter: \`clone(node)\` returns the map entry if there is one; otherwise it creates the copy, **stores it in the map**, and then calls \`clone\` on each neighbour. The order of those two middle steps is the classic bug. If you recurse first and store later, the cycle 1 → 2 → 1 comes back to node 1 before node 1 is in the map, makes a second copy of 1, and never stops. Storing first means the walk back to 1 finds \`c1\` and returns at once. Example 2 shows the version with **no** map at all giving up after 50 calls on a graph with just two nodes.


## 4. The Code in Java (BFS)

~~~java
static class Node {
    int val;
    List<Node> neighbors = new ArrayList<>();
    Node(int val) { this.val = val; }
    // No equals/hashCode override: HashMap keys compare by identity.
}

static Node cloneGraph(Node node) {
    if (node == null) return null;
    Map<Node, Node> copies = new HashMap<>();       // original -> copy
    copies.put(node, new Node(node.val));
    ArrayDeque<Node> queue = new ArrayDeque<>();
    queue.offer(node);
    while (!queue.isEmpty()) {
        Node cur = queue.poll();
        for (Node nb : cur.neighbors) {
            if (!copies.containsKey(nb)) {          // first sighting: copy and queue
                copies.put(nb, new Node(nb.val));
                queue.offer(nb);
            }
            copies.get(cur).neighbors.add(copies.get(nb));   // wire the copied edge
        }
    }
    return copies.get(node);
}
~~~

The Java parts that matter:

- **\`Map<Node, Node> copies = new HashMap<>()\`.** \`HashMap\` finds keys with \`hashCode()\` and \`equals()\`. If \`Node\` does not override them, both come from \`Object\` and mean **identity** — two different nodes are two different keys even with the same \`val\`. That is exactly what a clone needs, and it is why the comment in the class matters.
- **\`ArrayDeque\` as the queue.** \`offer\` adds at the tail, \`poll\` removes from the head, both amortised O(1). Its Javadoc says it is "likely to be faster than \`Stack\` when used as a stack, and faster than \`LinkedList\` when used as a queue" ([ArrayDeque Javadoc](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/ArrayDeque.html)). It does not accept \`null\` elements, which is fine here — we never queue \`null\`.
- **\`containsKey\` then \`put\`** — the visited check, which also guarantees one copy per node.
- **\`copies.get(cur).neighbors.add(copies.get(nb))\`** runs for **every** neighbour entry, new or already copied — skipping it drops edges.

📌 **Interview term: Identity vs equality** — \`a == b\` on objects asks "same object?"; \`a.equals(b)\` asks whatever the class defines, and by default it is also identity. The clone map must use identity. When you cannot control the class, \`IdentityHashMap\` forces identity no matter what \`equals\` says.

The recursive DFS version is shorter; it is the one in example 2:

~~~java
static Node dfsClone(Node node, Map<Node, Node> copies) {
    Node seen = copies.get(node);
    if (seen != null) return seen;
    Node copy = new Node(node.val);
    copies.put(node, copy);                     // register BEFORE recursing: breaks cycles
    for (Node nb : node.neighbors) copy.neighbors.add(dfsClone(nb, copies));
    return copy;
}
~~~

Two Java facts worth saying out loud, checked by running this snippet with a plain \`java Main\` (default thread stack): the recursive clone overflows the stack on a 200,000-node path, and a node class that defines value-based \`equals\`/\`hashCode\` makes \`HashMap\` merge two different nodes into one key, while \`IdentityHashMap\` keeps them apart:

~~~java
import java.util.*;

public class Main {
    static class Node {
        int val;
        List<Node> neighbors = new ArrayList<>();
        Node(int val) { this.val = val; }
    }

    static class ValueNode {                     // equality by value: a bad map key here
        int val;
        ValueNode(int val) { this.val = val; }
        @Override public boolean equals(Object o) { return o instanceof ValueNode v && v.val == val; }
        @Override public int hashCode() { return Integer.hashCode(val); }
    }

    static Node dfsClone(Node node, Map<Node, Node> copies) {
        Node seen = copies.get(node);
        if (seen != null) return seen;
        Node copy = new Node(node.val);
        copies.put(node, copy);
        for (Node nb : node.neighbors) copy.neighbors.add(dfsClone(nb, copies));
        return copy;
    }

    public static void main(String[] args) {
        Node[] nodes = new Node[200000];                 // a long path
        for (int i = 0; i < nodes.length; i++) nodes[i] = new Node(i);
        for (int i = 0; i + 1 < nodes.length; i++) {
            nodes[i].neighbors.add(nodes[i + 1]);
            nodes[i + 1].neighbors.add(nodes[i]);
        }
        try {
            dfsClone(nodes[0], new HashMap<>());
            System.out.println("finished");
        } catch (StackOverflowError e) {
            System.out.println("StackOverflowError on a 200000-node path");
        }

        ValueNode a = new ValueNode(7), b = new ValueNode(7);   // two different nodes, same val
        Map<ValueNode, String> byEquals = new HashMap<>();
        byEquals.put(a, "copy of a");
        byEquals.put(b, "copy of b");
        Map<ValueNode, String> byIdentity = new IdentityHashMap<>();
        byIdentity.put(a, "copy of a");
        byIdentity.put(b, "copy of b");
        System.out.println("HashMap entries: " + byEquals.size());
        System.out.println("IdentityHashMap entries: " + byIdentity.size());
    }
}
~~~

~~~text
StackOverflowError on a 200000-node path
HashMap entries: 1
IdentityHashMap entries: 2
~~~

\`StackOverflowError\` is an \`Error\`, not an \`Exception\` — catching it is fine for a demo, not for production code. You can give a thread a bigger stack (\`java -Xss…\`, or the \`Thread\` constructor that takes a stack size), but the real fix is an iterative BFS or an explicit \`ArrayDeque\` stack. Background: [How much stack space does recursion use?](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)

## 5. Verified: Running the Code

Both examples were saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21). Example 1 clones four graphs (a 4-cycle, a single node, the empty graph and a triangle), checks the copy has the same shape, checks with a \`HashSet\` of original nodes (identity, since \`Node\` has no \`equals\`) that the copy shares none of them, and then edits the copy to prove the original does not change:

~~~text
4-cycle
  clone: 1 -> [2, 4]; 2 -> [1, 3]; 3 -> [2, 4]; 4 -> [1, 3]
  same shape: true
  shares a node with the original: false
single node
  clone: 1 -> []
  same shape: true
  shares a node with the original: false
empty graph
  clone: null
  same shape: true
triangle
  clone: 1 -> [2, 3]; 2 -> [1, 3]; 3 -> [1, 2]
  same shape: true
  shares a node with the original: false
after editing the clone, original: 1 -> [2, 4]; 2 -> [1, 3]; 3 -> [2, 4]; 4 -> [1, 3]
clone now: 3 -> [200, 4]; 4 -> [100, 3]; 100 -> [200, 4]; 200 -> [100, 3]
~~~

The last two lines are the deep-copy proof: values 100 and 200 appear only in the clone.

Example 2 shows why the map is required and counts the work. A clone **without** a map recurses forever on the two-node graph \`1 - 2\` (it stops only because of a safety limit; without it, it would end in \`StackOverflowError\`). With the map, the DFS makes exactly one copy per node and \`1 + 2E\` calls — one for the start and one for each end of each undirected edge. The BFS clone of a 10,000-node path does exactly \`2 × 9,999 = 19,998\` neighbour checks:

~~~text
naive clone of 1 - 2 without a map: gave up after 50 calls
4-cycle: nodes=4 edges=4 dfs calls=9 copies=4
K5: nodes=5 edges=10 dfs calls=21 copies=5
star: nodes=7 edges=6 dfs calls=13 copies=7
bfs clone of a 10000-node path: copies=10000 neighbor checks=19998
~~~

## 6. Complexity

| | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| BFS clone | O(V + E) | O(V) | Each node is copied and queued once; each neighbour entry is checked and wired once. The \`HashMap\` and the \`ArrayDeque\` hold at most V entries. |
| Recursive DFS clone | O(V + E) | O(V) | Same work; the call stack can be V frames deep — the \`StackOverflowError\` above. |
| The copy itself | — | O(V + E) | V new \`Node\` objects and the same number of list entries; usually not counted as extra. |

\`HashMap\` operations are O(1) on average, which is what makes the total linear — see [How does a hash table work?](/interview-question/how-does-a-hash-table-work)

## Edge Cases

- **\`null\` input** — return \`null\` first (example 1, "empty graph").
- **A single node with no neighbours** — one copy, an empty \`ArrayList\`.
- **Cycles of any length** — handled by the map; the triangle and the 4-cycle both clone correctly.
- **Self-loop** — \`copies.get(cur)\` already exists, so the copy lists itself as a neighbour.
- **Duplicate values** — irrelevant as long as \`Node\` keeps identity equality (or you use \`IdentityHashMap\`).
- **Disconnected graph** — only the component of the given node is reachable; with a list of all nodes, start a BFS from each node not yet in \`copies\`.

## Common Pitfalls

- **A \`Node\` with value-based \`equals\`/\`hashCode\`** — \`HashMap\` merges distinct nodes; the snippet prints \`HashMap entries: 1\` for two nodes. Use \`IdentityHashMap\` if you cannot change the class.
- **No map, or \`put\` after the recursive calls** — infinite recursion and \`StackOverflowError\` on the first cycle.
- **Keying the map by \`node.val\` (\`Map<Integer, Node>\`)** — breaks with duplicate values; it also boxes every key into an \`Integer\`.
- **Using \`Stack\` or \`LinkedList\` out of habit** — both work, but \`ArrayDeque\` is the recommended general-purpose queue/stack.
- **Wiring only new neighbours** — edges to already-copied neighbours must be added too.
- **Comparing nodes with \`equals\` in the "no shared nodes" test** — use \`==\` (or a \`HashSet\` of identity-equal nodes) so you are really testing identity.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Traverse the graph once with BFS and keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap&lt;Node, Node&gt;</code> from each <strong style="color:#ffca28;">original</strong> node to its <strong style="color:#ffca28;">copy</strong>; for every neighbour, create its copy on first sight, then add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">copies.get(nb)</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">copies.get(cur).neighbors</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why the map is the key:</strong> <span style="color:#f0e2c8;">It is the visited set, so cycles cannot recurse forever, and it is how I find the copy of a neighbour I already copied. In DFS I <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">put</code> the copy <strong style="color:#ffca28;">before</strong> recursing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">O(V + E) time — each node copied once, each neighbour entry checked once — and O(V) extra space for the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code> and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Edge cases:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>; a single node, self-loops and duplicate values all work because the map is keyed by the node object, not by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">val</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The Java detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code> uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">equals</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hashCode</code>, which are identity unless <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Node</code> overrides them — if it does, I switch to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IdentityHashMap</code>. I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> and BFS so a long path cannot cause <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What breaks if <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Node</code> overrides <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">equals</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">hashCode</code> by <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">val</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two different nodes with the same value become one key, so they share a single copy and the clone has the wrong shape. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IdentityHashMap</code> compares keys with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> and fixes it without touching the class.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ArrayDeque</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">LinkedList</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both implement <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Queue</code>, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> is a resizable circular array with no per-element node objects; its Javadoc says it is likely faster than <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LinkedList</code> as a queue. The one restriction is no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> elements.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">BFS or DFS — does it matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not for correctness or the O(V + E) bound. The recursive DFS is shorter but needs one stack frame per node on the current path, and the default thread stack overflows long before the heap runs out.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">clone()</code> or serialization instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.clone()</code> is shallow — the copied <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">neighbors</code> list would still point at the original nodes. Serialization does handle cycles, but it is slow, needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Serializable</code>, and hides the algorithm the interviewer wants to see.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you prove the copy is deep?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Put every original node in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashSet</code> (identity, since <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Node</code> has no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">equals</code>), walk the clone and check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">contains</code> is never true, then mutate the clone and show the original is unchanged — example 1 prints exactly that.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Deep copy** | A copy that duplicates every reachable object and shares none with the original |
| **Shallow copy** | A copy of the top object only; its children are still the original objects |
| **Visited map (old → new)** | \`HashMap<Node, Node>\` from each original node to its copy; also stops cycles |
| **Graph traversal** | Visiting every reachable node — BFS with a queue, DFS with recursion or a stack |
| **Identity vs equality** | \`==\` (same object) vs \`equals\` (whatever the class defines); the clone map needs identity |

---
**Conclusion:** Cloning a graph is a traversal with one extra structure: a \`HashMap\` from each original node to its copy. BFS with an \`ArrayDeque\` (or DFS that registers the copy before recursing) visits each node once and each neighbour entry once — O(V + E) time, O(V) extra space — and the map is what keeps cycles from looping. In Java the details that make the answer strong are knowing that \`HashMap\` relies on \`equals\`/\`hashCode\` (identity by default, \`IdentityHashMap\` when in doubt), choosing \`ArrayDeque\`, and avoiding deep recursion that ends in \`StackOverflowError\`. The same traversal drives [counting connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph) and the [bipartite check](/interview-question/how-do-you-check-if-a-graph-is-bipartite).`,
        examples: [
          {
            label: "BFS clone with an old-to-new map: shape check and no shared nodes",
            code: `import java.util.*;

public class Main {
    static class Node {
        int val;
        List<Node> neighbors = new ArrayList<>();
        Node(int val) { this.val = val; }
        // No equals/hashCode override: HashMap keys compare by identity.
    }

    // Deep-copy a connected graph with BFS and an original -> copy HashMap.
    static Node cloneGraph(Node node) {
        if (node == null) return null;
        Map<Node, Node> copies = new HashMap<>();
        copies.put(node, new Node(node.val));
        ArrayDeque<Node> queue = new ArrayDeque<>();
        queue.offer(node);
        while (!queue.isEmpty()) {
            Node cur = queue.poll();
            for (Node nb : cur.neighbors) {
                if (!copies.containsKey(nb)) {          // first sighting: copy and queue
                    copies.put(nb, new Node(nb.val));
                    queue.offer(nb);
                }
                copies.get(cur).neighbors.add(copies.get(nb));   // wire the copied edge
            }
        }
        return copies.get(node);
    }

    // adj[i] lists the neighbours of node i + 1 (1-indexed, LeetCode style).
    static Node build(int[][] adj) {
        if (adj.length == 0) return null;
        Node[] nodes = new Node[adj.length];
        for (int i = 0; i < adj.length; i++) nodes[i] = new Node(i + 1);
        for (int i = 0; i < adj.length; i++)
            for (int v : adj[i]) nodes[i].neighbors.add(nodes[v - 1]);
        return nodes[0];
    }

    static List<Node> allNodes(Node start) {
        Set<Node> seen = new HashSet<>(List.of(start));
        List<Node> order = new ArrayList<>(List.of(start));
        for (int head = 0; head < order.size(); head++)
            for (Node nb : order.get(head).neighbors)
                if (seen.add(nb)) order.add(nb);             // add() returns false if present
        order.sort(Comparator.comparingInt(n -> n.val));
        return order;
    }

    static String describe(Node start) {
        if (start == null) return "null";
        StringJoiner all = new StringJoiner("; ");
        for (Node n : allNodes(start)) {
            StringJoiner nb = new StringJoiner(", ", "[", "]");
            for (Node m : n.neighbors) nb.add(String.valueOf(m.val));
            all.add(n.val + " -> " + nb);
        }
        return all.toString();
    }

    public static void main(String[] args) {
        String[] names = {"4-cycle", "single node", "empty graph", "triangle"};
        int[][][] adjs = {{{2, 4}, {1, 3}, {2, 4}, {1, 3}}, {{}}, {}, {{2, 3}, {1, 3}, {1, 2}}};
        for (int c = 0; c < names.length; c++) {
            Node original = build(adjs[c]);
            Node copy = cloneGraph(original);
            System.out.println(names[c]);
            System.out.println("  clone: " + describe(copy));
            System.out.println("  same shape: " + describe(copy).equals(describe(original)));
            if (original != null) {
                Set<Node> origSet = new HashSet<>(allNodes(original));
                boolean shared = false;
                for (Node n : allNodes(copy)) shared |= origSet.contains(n);
                System.out.println("  shares a node with the original: " + shared);
            }
        }
        Node original = build(new int[][]{{2, 4}, {1, 3}, {2, 4}, {1, 3}});
        Node copy = cloneGraph(original);
        copy.val = 100;
        copy.neighbors.get(0).val = 200;
        System.out.println("after editing the clone, original: " + describe(original));
        System.out.println("clone now: " + describe(copy));
    }
}`,
          },
          {
            label: "Why the map matters: naive recursion vs DFS clone call counts, and BFS on a 10000-node path",
            code: `import java.util.*;

public class Main {
    static class Node {
        int val;
        List<Node> neighbors = new ArrayList<>();
        Node(int val) { this.val = val; }
    }

    static int calls = 0, checks = 0;

    // WRONG on purpose: no original -> copy map, so a cycle never ends.
    static Node naiveClone(Node node, int limit) {
        calls++;
        if (calls > limit) return null;             // safety valve so the demo stops
        Node copy = new Node(node.val);
        for (Node nb : node.neighbors) copy.neighbors.add(naiveClone(nb, limit));
        return copy;
    }

    // Recursive DFS clone: the map is both the visited set and the result.
    static Node dfsClone(Node node, Map<Node, Node> copies) {
        calls++;
        Node seen = copies.get(node);
        if (seen != null) return seen;
        Node copy = new Node(node.val);
        copies.put(node, copy);                     // register BEFORE recursing: breaks cycles
        for (Node nb : node.neighbors) copy.neighbors.add(dfsClone(nb, copies));
        return copy;
    }

    static Map<Node, Node> bfsClone(Node node) {
        Map<Node, Node> copies = new HashMap<>();
        copies.put(node, new Node(node.val));
        ArrayDeque<Node> queue = new ArrayDeque<>(List.of(node));
        while (!queue.isEmpty()) {
            Node cur = queue.poll();
            for (Node nb : cur.neighbors) {
                checks++;
                if (!copies.containsKey(nb)) { copies.put(nb, new Node(nb.val)); queue.offer(nb); }
                copies.get(cur).neighbors.add(copies.get(nb));
            }
        }
        return copies;
    }

    static Node make(int n, List<int[]> edges) {
        Node[] nodes = new Node[n];
        for (int i = 0; i < n; i++) nodes[i] = new Node(i + 1);
        for (int[] e : edges) {                     // undirected: store both directions
            nodes[e[0] - 1].neighbors.add(nodes[e[1] - 1]);
            nodes[e[1] - 1].neighbors.add(nodes[e[0] - 1]);
        }
        return nodes[0];
    }

    public static void main(String[] args) {
        naiveClone(make(2, List.of(new int[]{1, 2})), 50);
        System.out.println("naive clone of 1 - 2 without a map: gave up after " + (calls - 1) + " calls");

        List<int[]> cycle = List.of(new int[]{1, 2}, new int[]{2, 3}, new int[]{3, 4}, new int[]{4, 1});
        List<int[]> k5 = new ArrayList<>(), star = new ArrayList<>();
        for (int a = 1; a <= 5; a++) for (int b = a + 1; b <= 5; b++) k5.add(new int[]{a, b});
        for (int k = 2; k <= 7; k++) star.add(new int[]{1, k});
        String[] names = {"4-cycle", "K5", "star"};
        int[] sizes = {4, 5, 7};
        List<List<int[]>> all = List.of(cycle, k5, star);
        for (int g = 0; g < 3; g++) {
            calls = 0;
            Map<Node, Node> copies = new HashMap<>();
            dfsClone(make(sizes[g], all.get(g)), copies);
            System.out.println(names[g] + ": nodes=" + sizes[g] + " edges=" + all.get(g).size() +
                    " dfs calls=" + calls + " copies=" + copies.size());
        }

        int n = 10000;
        List<int[]> path = new ArrayList<>();
        for (int k = 1; k < n; k++) path.add(new int[]{k, k + 1});
        Map<Node, Node> copies = bfsClone(make(n, path));
        System.out.println("bfs clone of a " + n + "-node path: copies=" + copies.size() +
                " neighbor checks=" + checks);
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You get a pointer to one node of a connected, undirected graph. Each node has an \`int val\` and a \`vector<Node*> neighbors\`. Return a deep copy of the whole graph — every node must be a newly allocated object, wired up the same way. Please write it in C++ and tell me the complexity."

**What a strong answer should cover:**
- A traversal (BFS with a queue or DFS with recursion) plus an \`unordered_map<Node*, Node*>\` from each **original node → its copy**; the map is both the visited set and the way to find the copy of a neighbour.
- Why the map is mandatory: graphs have cycles, so copying without it recurses until the stack overflows.
- Inserting the copy into the map **before** visiting its neighbours, and returning \`nullptr\` for an empty input.
- O(V + E) time and O(V) extra space for the map and the queue (or the call stack).
- C++ specifics: keying by pointer gives identity for free; \`operator[]\` on the map **inserts** a default entry, so test membership with \`find\`/\`count\`; \`std::queue::pop()\` returns \`void\`; and who owns (and later \`delete\`s) the nodes allocated with \`new\`.

**Clarifying questions expected:**
- Can the input be \`nullptr\`, and is everything reachable from the given node?
- Who owns the copied nodes — raw \`new\`, or should I use smart pointers?

**Code / implementation expected:** Yes — a \`Node* cloneGraph(Node* node)\` in C++17 using BFS or DFS with an \`unordered_map\`, plus a check that the copy shares no node with the original and that everything is freed.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know basic C++ (\`struct\`, pointers, \`vector\`); graphs are explained from scratch.
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by actually compiling and running the code with \`g++ -std=c++17\` (GCC 13); nothing is typed in by hand.

## 1. Why This Even Matters — A Story First

Imagine a group chat app that wants to let you **duplicate a friend group** so you can plan a surprise party without the guest of honour. Each person in the group is a card with a name and a list of "friends" — arrows pointing to other cards. Alice points to Bob, Bob points back to Alice and on to Carol, and so on.

If you photocopy only Alice's card, the copy still points at the **real** Bob. Change "copy Bob" and you have actually changed the real Bob. That is a **shallow copy**. What you want is a fresh card for every person, and every arrow on a fresh card must point to another **fresh** card — a parallel world with the same shape and none of the original objects.

The catch is that friendships go in circles: Alice → Bob → Alice. If you copy blindly ("copy Alice, then copy each of her friends, then each of their friends…"), you walk around that circle forever, making a new Alice every lap. The fix is a small notebook: **"original card → the copy I already made for it."** Before copying anyone, look in the notebook. If they are there, reuse that copy. That notebook is the whole algorithm.

Clone Graph is a favourite interview question because it checks three things at once: can you traverse a graph, can you stop on cycles, and do you understand the difference between an object and a reference to it.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Am I given one node, and should I copy everything reachable from it? | That is the usual contract (LeetCode 133). Nodes not reachable from the start are not copied — if the graph can be disconnected you need a list of all nodes instead. |
| Is the graph directed or undirected? | The algorithm is the same, but for undirected graphs every edge appears in **both** neighbour lists, so each edge is wired twice — once from each end. |
| Can the input be empty (null)? | Return null/None straight away; the traversal needs a start node. |
| Are node values unique? | They are in the LeetCode version, but you should **not** key the map by value anyway — key it by the node itself. Then duplicates do not matter. |
| Can there be self-loops or repeated edges? | The map handles both for free: a self-loop finds its own copy in the map. |
| How large can it get — thousands or millions of nodes? | Decides whether a recursive DFS is safe or you need an iterative BFS/DFS to avoid a stack overflow. |

## 3. The Core Idea: Traverse Once, Remember Every Copy

A graph is a set of **nodes** joined by **edges**; here each node object holds a value and a list of neighbour references. How graphs are stored in general is its own page: [What is a graph, and how do you represent it?](/interview-question/what-is-a-graph-and-how-do-you-represent-it)

📌 **Interview term: Deep copy** — a copy in which every reachable object is duplicated, so the copy shares **no** objects with the original. The opposite is a **shallow copy**, which duplicates only the top object and keeps references to the original children.

📌 **Interview term: Visited map (old → new)** — a hash map from each original node to its copy. It does two jobs at once: it is the **visited set** that stops the traversal from looping on cycles, and it is the **lookup table** you use to wire copied edges to copied nodes.

📌 **Interview term: Graph traversal** — visiting every node reachable from a start node. Breadth-first search (BFS) uses a queue and goes level by level; depth-first search (DFS) uses recursion or a stack and goes deep first. Either works here; the difference is covered in [What is the difference between BFS and DFS?](/interview-question/what-is-the-difference-between-bfs-and-dfs)

<svg class="iq-diagram" width="100%" viewBox="0 0 680 270" role="img" aria-label="An original 4-cycle with nodes 1 2 3 4 on the left and a copy with new nodes c1 c2 c3 c4 on the right that has the same edges">
  <defs>
    <marker id="cg22-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="150" y="28" text-anchor="middle">Original objects</text>
  <text class="d-text d-accent" x="530" y="28" text-anchor="middle">Brand new objects</text>
  <line class="d-edge" x1="90" y1="80" x2="210" y2="80"/>
  <line class="d-edge" x1="210" y1="80" x2="210" y2="210"/>
  <line class="d-edge" x1="210" y1="210" x2="90" y2="210"/>
  <line class="d-edge" x1="90" y1="210" x2="90" y2="80"/>
  <circle class="d-box" cx="90" cy="80" r="24"/>
  <text class="d-text" x="90" y="86" text-anchor="middle">1</text>
  <circle class="d-box" cx="210" cy="80" r="24"/>
  <text class="d-text" x="210" y="86" text-anchor="middle">2</text>
  <circle class="d-box" cx="210" cy="210" r="24"/>
  <text class="d-text" x="210" y="216" text-anchor="middle">3</text>
  <circle class="d-box" cx="90" cy="210" r="24"/>
  <text class="d-text" x="90" y="216" text-anchor="middle">4</text>
  <path class="d-edge-accent" d="M 270 145 L 400 145" marker-end="url(#cg22-arrow)"/>
  <text class="d-sub" x="335" y="130" text-anchor="middle">clone</text>
  <line class="d-edge-accent" x1="470" y1="80" x2="590" y2="80"/>
  <line class="d-edge-accent" x1="590" y1="80" x2="590" y2="210"/>
  <line class="d-edge-accent" x1="590" y1="210" x2="470" y2="210"/>
  <line class="d-edge-accent" x1="470" y1="210" x2="470" y2="80"/>
  <circle class="d-box-accent" cx="470" cy="80" r="24"/>
  <text class="d-text d-accent" x="470" y="86" text-anchor="middle">c1</text>
  <circle class="d-box-accent" cx="590" cy="80" r="24"/>
  <text class="d-text d-accent" x="590" y="86" text-anchor="middle">c2</text>
  <circle class="d-box-accent" cx="590" cy="210" r="24"/>
  <text class="d-text d-accent" x="590" y="216" text-anchor="middle">c3</text>
  <circle class="d-box-accent" cx="470" cy="210" r="24"/>
  <text class="d-text d-accent" x="470" y="216" text-anchor="middle">c4</text>
</svg>

The copy has the same shape — c1 is joined to c2 and c4, exactly like 1 is joined to 2 and 4 — but not one arrow crosses from the right side to the left side. "Same shape, zero shared objects" is precisely what the verified examples check.

### How BFS fills the map

The algorithm, in plain words:

1. If the start node is empty, return empty.
2. Copy the start node, put \`start → copy\` in the map, and put the start node in a queue.
3. Take a node \`cur\` off the queue. For each neighbour \`nb\`:
   - if \`nb\` is **not** in the map, make its copy, add it to the map and queue \`nb\` (this happens exactly once per node);
   - in every case, append \`map[nb]\` to \`map[cur]\`'s neighbour list (this happens once per neighbour-list entry).
4. When the queue is empty, return \`map[start]\`.

Here is that loop on the 4-cycle whose neighbour lists are 1: [2, 4], 2: [1, 3], 3: [2, 4], 4: [1, 3]:

<svg class="iq-diagram" width="100%" viewBox="0 0 680 390" role="img" aria-label="BFS clone trace on the 4-cycle. Start with map 1 to c1 and queue 1. Pop 1 copies 2 and 4. Pop 2 copies 3. Pop 4 and pop 3 only wire edges to existing copies">
  <rect class="d-box-muted" x="30" y="20" width="620" height="54" rx="8"/>
  <text class="d-text" x="50" y="43">Start: map = { 1: c1 }</text>
  <text class="d-sub" x="50" y="63">queue = [1]</text>
  <rect class="d-box-accent" x="30" y="92" width="620" height="54" rx="8"/>
  <text class="d-text d-accent" x="50" y="115">Pop 1: 2 and 4 are new, so make c2 and c4</text>
  <text class="d-sub" x="50" y="135">wire c1 to c2, c1 to c4; queue = [2, 4]</text>
  <rect class="d-box-accent" x="30" y="164" width="620" height="54" rx="8"/>
  <text class="d-text d-accent" x="50" y="187">Pop 2: 1 is already in the map, 3 is new, so make c3</text>
  <text class="d-sub" x="50" y="207">wire c2 to c1, c2 to c3; queue = [4, 3]</text>
  <rect class="d-box" x="30" y="236" width="620" height="54" rx="8"/>
  <text class="d-text" x="50" y="259">Pop 4: 1 and 3 are both in the map, nothing new</text>
  <text class="d-sub" x="50" y="279">wire c4 to c1, c4 to c3; queue = [3]</text>
  <rect class="d-box" x="30" y="308" width="620" height="54" rx="8"/>
  <text class="d-text" x="50" y="331">Pop 3: 2 and 4 are both in the map, nothing new</text>
  <text class="d-sub" x="50" y="351">wire c3 to c2, c3 to c4; queue is empty, return c1</text>
</svg>

Four copies were made (one per node) and eight neighbour entries were wired (two per undirected edge). The check "is it in the map?" ran once for each of those eight entries — that is where the O(V + E) bound comes from.

### Why "register the copy before you recurse" (DFS version)

The recursive DFS version is shorter: \`clone(node)\` returns the map entry if there is one; otherwise it creates the copy, **stores it in the map**, and then calls \`clone\` on each neighbour. The order of those two middle steps is the classic bug. If you recurse first and store later, the cycle 1 → 2 → 1 comes back to node 1 before node 1 is in the map, makes a second copy of 1, and never stops. Storing first means the walk back to 1 finds \`c1\` and returns at once. Example 2 shows the version with **no** map at all giving up after 50 calls on a graph with just two nodes.


## 4. The Code in C++ (BFS)

~~~cpp
struct Node {
    int val;
    vector<Node*> neighbors;
    explicit Node(int v) : val(v) {}
};

Node* cloneGraph(Node* node) {
    if (node == nullptr) return nullptr;
    unordered_map<Node*, Node*> copies{{node, new Node(node->val)}};  // original -> copy
    queue<Node*> q;
    q.push(node);
    while (!q.empty()) {
        Node* cur = q.front();
        q.pop();                                   // pop() returns void: read front() first
        for (Node* nb : cur->neighbors) {
            auto it = copies.find(nb);
            if (it == copies.end()) {              // first sighting: copy and queue
                it = copies.emplace(nb, new Node(nb->val)).first;
                q.push(nb);
            }
            copies[cur]->neighbors.push_back(it->second);   // wire the copied edge
        }
    }
    return copies[node];
}
~~~

The C++ parts that matter:

- **\`unordered_map<Node*, Node*>\`** — the key is the **address** of the original node. Two different nodes always have different addresses, so pointer keys give identity for free, whatever \`val\` holds. \`std::hash\` is defined for every pointer type, so no custom hash is needed.
- **\`find\` then \`emplace\`, not \`operator[]\`, for the membership test.** \`copies[nb]\` on a missing key **inserts** \`{nb, nullptr}\` and returns a reference to that \`nullptr\`. Writing \`if (!copies[nb])\` happens to work, but it silently grows the map and is the kind of thing a reviewer flags. \`find\` returns \`end()\` without inserting; \`emplace(...).first\` gives an iterator to the new entry so the edge can be wired without a second lookup. The snippet below shows the difference.
- **\`std::queue\`** is an adaptor over \`std::deque\` by default; \`front()\` reads the head and \`pop()\` removes it and returns nothing ([cppreference: std::queue](https://en.cppreference.com/w/cpp/container/queue)). Read first, then pop.
- **\`new Node(...)\` means someone must \`delete\`.** The function returns raw owning pointers, as LeetCode's signature does. Example 1 frees both graphs with a \`freeGraph\` helper; example 2 avoids the question by keeping every node in a \`vector<unique_ptr<Node>>\` "pool" that frees everything when \`main\` ends. In real code, decide the ownership model first.

📌 **Interview term: Ownership** — which piece of code is responsible for freeing an object. A graph with cycles cannot be owned by \`shared_ptr\`s pointing at each other (a cycle of \`shared_ptr\`s never reaches count zero and leaks), so a common pattern is one container that owns all nodes, with raw \`Node*\` used only as non-owning links.

The recursive DFS version is shorter; it is the one in example 2:

~~~cpp
Node* dfsClone(Node* node, unordered_map<Node*, Node*>& copies) {
    auto it = copies.find(node);
    if (it != copies.end()) return it->second;
    Node* copy = new Node(node->val);
    copies[node] = copy;                       // register BEFORE recursing: breaks cycles
    for (Node* nb : node->neighbors) copy->neighbors.push_back(dfsClone(nb, copies));
    return copy;
}
~~~

Note the \`unordered_map&\` — pass the map by reference, or every call gets its own copy of the map and cycles are never detected. On a very long path this recursion can exhaust the thread stack; in C++ that is not an exception you can catch but typically a crash, so BFS is the safe default. (That crash was deliberately not run here.) Background: [How much stack space does recursion use?](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)

The \`operator[]\` trap, checked by running it:

~~~cpp
#include <iostream>
#include <unordered_map>
using namespace std;

struct Node { int val; };

int main() {
    Node a{1}, b{2};
    unordered_map<Node*, Node*> copies;
    if (copies[&a] == nullptr) cout << "a not copied yet\\n";     // operator[] INSERTS
    cout << "size after operator[] test: " << copies.size() << "\\n";
    if (copies.find(&b) == copies.end()) cout << "b not copied yet\\n";  // find does not
    cout << "size after find test: " << copies.size() << "\\n";
    cout << "count(&b) = " << copies.count(&b) << "\\n";
}
~~~

~~~text
a not copied yet
size after operator[] test: 1
b not copied yet
size after find test: 1
count(&b) = 0
~~~

## 5. Verified: Running the Code

Both examples were saved as \`main.cpp\` and run with \`g++ -std=c++17 -O2 main.cpp -o main && ./main\` (GCC 13). They were also run once with \`-fsanitize=address,undefined\`, which reported no leaks or memory errors. Example 1 clones four graphs (a 4-cycle, a single node, the empty graph and a triangle), checks the copy has the same shape, checks with an \`unordered_set<Node*>\` of original addresses that the copy shares none of them, and then edits the copy to prove the original does not change:

~~~text
4-cycle
  clone: 1 -> [2, 4]; 2 -> [1, 3]; 3 -> [2, 4]; 4 -> [1, 3]
  same shape: true
  shares a node with the original: false
single node
  clone: 1 -> []
  same shape: true
  shares a node with the original: false
empty graph
  clone: null
  same shape: true
triangle
  clone: 1 -> [2, 3]; 2 -> [1, 3]; 3 -> [1, 2]
  same shape: true
  shares a node with the original: false
after editing the clone, original: 1 -> [2, 4]; 2 -> [1, 3]; 3 -> [2, 4]; 4 -> [1, 3]
clone now: 3 -> [200, 4]; 4 -> [100, 3]; 100 -> [200, 4]; 200 -> [100, 3]
~~~

The last two lines are the deep-copy proof: values 100 and 200 appear only in the clone. \`cout << boolalpha\` makes the \`bool\`s print as \`true\`/\`false\` instead of \`1\`/\`0\`.

Example 2 shows why the map is required and counts the work. A clone **without** a map recurses forever on the two-node graph \`1 - 2\` (it stops only because of a safety limit). With the map, the DFS makes exactly one copy per node and \`1 + 2E\` calls — one for the start and one for each end of each undirected edge. The BFS clone of a 10,000-node path does exactly \`2 × 9,999 = 19,998\` neighbour checks:

~~~text
naive clone of 1 - 2 without a map: gave up after 50 calls
4-cycle: nodes=4 edges=4 dfs calls=9 copies=4
K5: nodes=5 edges=10 dfs calls=21 copies=5
star: nodes=7 edges=6 dfs calls=13 copies=7
bfs clone of a 10000-node path: copies=10000 neighbor checks=19998
~~~

## 6. Complexity

| | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| BFS clone | O(V + E) | O(V) | Each node is copied and queued once; each neighbour entry is checked and wired once. The map and the queue hold at most V entries. |
| Recursive DFS clone | O(V + E) | O(V) | Same work; the call stack can be V frames deep. |
| The copy itself | — | O(V + E) | V heap-allocated \`Node\`s and the same number of \`vector\` entries. |

\`unordered_map\` operations are O(1) on average — see [How does a hash table work?](/interview-question/how-does-a-hash-table-work)

## Edge Cases

- **\`nullptr\` input** — return \`nullptr\` first (example 1, "empty graph").
- **A single node with no neighbours** — one copy, an empty \`vector\`.
- **Cycles of any length** — handled by the map; the triangle and the 4-cycle both clone correctly.
- **Self-loop** — \`find\` succeeds on the node itself, so the copy lists itself as a neighbour.
- **Duplicate values** — irrelevant, the map is keyed by address.
- **Disconnected graph** — only the component of the given node is reachable; with a list of all nodes, start a BFS from each node not yet in \`copies\`.

## Common Pitfalls

- **Testing membership with \`copies[nb]\`** — inserts a \`nullptr\` entry for every miss; use \`find\` or \`count\`.
- **Passing the map by value in the recursive DFS** — each call gets a fresh copy, so cycles are never detected and the recursion runs until the stack is gone.
- **\`q.pop()\` expecting a value** — it returns \`void\`; take \`q.front()\` first.
- **Leaking the copies** — every \`new\` needs a matching \`delete\`; free by traversing (as \`freeGraph\` does) or keep nodes in an owning container.
- **\`shared_ptr\` neighbours on a cyclic graph** — reference cycles never free; use raw or \`weak_ptr\` links with a separate owner.
- **Wiring only new neighbours** — edges to already-copied neighbours must be pushed too.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Traverse the graph once with BFS and keep an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map&lt;Node*, Node*&gt;</code> from each <strong style="color:#ffca28;">original</strong> node to its <strong style="color:#ffca28;">copy</strong>; for every neighbour, create its copy on first sight, then push the copy onto <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">copies[cur]-&gt;neighbors</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why the map is the key:</strong> <span style="color:#f0e2c8;">It is the visited set, so cycles cannot recurse forever, and it is how I find the copy of a neighbour I already copied. In DFS I store the copy <strong style="color:#ffca28;">before</strong> recursing, and pass the map by reference.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">O(V + E) time — each node copied once, each neighbour entry checked once — and O(V) extra space for the map and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::queue</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Edge cases:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nullptr</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nullptr</code>; a single node, self-loops and duplicate values all work because the key is the node address, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">val</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The C++ detail:</strong> <span style="color:#f0e2c8;">I test membership with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code>, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator[]</code>, which inserts; I read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">front()</code> before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code> because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">void</code>; and I say who owns the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new</code>ed copies and how they are freed.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why key the map by <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Node*</code> instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">val</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Addresses are unique per object, so pointer keys mean identity: two different nodes with the same value still get two different copies. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::hash</code> already works for pointers, so there is nothing extra to write.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you avoid leaking the copied nodes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either walk the clone and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">delete</code> each node once (collect them first, since the graph has cycles), or allocate them into one owning container such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;unique_ptr&lt;Node&gt;&gt;</code> and keep raw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Node*</code> only as links. Example 2 uses the second pattern; ASan reported no leaks for either example.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could the neighbours be <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">shared_ptr&lt;Node&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not safely on a cyclic graph: 1 holds 2 and 2 holds 1, so neither count reaches zero and both leak. You would need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">weak_ptr</code> for back edges, which is awkward for an undirected graph — one owner plus raw links is simpler.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">BFS or DFS — does it matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not for correctness or the bound. A recursive DFS needs a stack frame per node on the current path, and overflowing the stack in C++ is a crash, not an exception, so for unknown sizes I use BFS or an explicit stack.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you prove the copy is deep?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Put every original address in an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_set&lt;Node*&gt;</code>, walk the clone and check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count</code> is always 0, then mutate the clone and show the original is unchanged — example 1 prints exactly that.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Deep copy** | A copy that duplicates every reachable object and shares none with the original |
| **Shallow copy** | A copy of the top object only; its children are still the original objects |
| **Visited map (old → new)** | \`unordered_map<Node*, Node*>\` from each original node to its copy; also stops cycles |
| **Graph traversal** | Visiting every reachable node — BFS with a queue, DFS with recursion or a stack |
| **Ownership** | Which code is responsible for freeing an object; one owner for all nodes avoids leaks |

---
**Conclusion:** Cloning a graph is a traversal with one extra structure: an \`unordered_map<Node*, Node*>\` from each original node to its copy. BFS with \`std::queue\` (or DFS that registers the copy before recursing) visits each node once and each neighbour entry once — O(V + E) time, O(V) extra space — and the map is what keeps cycles from looping. In C++ the details that make the answer strong are pointer keys for identity, \`find\` instead of \`operator[]\` for membership, reading \`front()\` before \`pop()\`, passing the map by reference, and having a clear answer for who frees the copies. The same traversal drives [counting connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph) and the [bipartite check](/interview-question/how-do-you-check-if-a-graph-is-bipartite).`,
        examples: [
          {
            label: "BFS clone with an old-to-new map: shape check and no shared nodes",
            code: `#include <algorithm>
#include <iostream>
#include <queue>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>
using namespace std;

struct Node {
    int val;
    vector<Node*> neighbors;
    explicit Node(int v) : val(v) {}
};

// Deep-copy a connected graph with BFS and an original -> copy unordered_map.
Node* cloneGraph(Node* node) {
    if (node == nullptr) return nullptr;
    unordered_map<Node*, Node*> copies{{node, new Node(node->val)}};  // keyed by address
    queue<Node*> q;
    q.push(node);
    while (!q.empty()) {
        Node* cur = q.front();
        q.pop();                                   // pop() returns void: read front() first
        for (Node* nb : cur->neighbors) {
            auto it = copies.find(nb);
            if (it == copies.end()) {              // first sighting: copy and queue
                it = copies.emplace(nb, new Node(nb->val)).first;
                q.push(nb);
            }
            copies[cur]->neighbors.push_back(it->second);   // wire the copied edge
        }
    }
    return copies[node];
}

vector<Node*> allNodes(Node* start) {
    unordered_set<Node*> seen{start};
    vector<Node*> order{start};
    for (size_t head = 0; head < order.size(); head++)
        for (Node* nb : order[head]->neighbors)
            if (seen.insert(nb).second) order.push_back(nb);   // .second: was it new?
    sort(order.begin(), order.end(), [](Node* a, Node* b) { return a->val < b->val; });
    return order;
}

void freeGraph(Node* start) {                      // we used new, so we must delete
    if (start == nullptr) return;
    for (Node* n : allNodes(start)) delete n;
}

// adj[i] lists the neighbours of node i + 1 (1-indexed, LeetCode style).
Node* build(const vector<vector<int>>& adj) {
    if (adj.empty()) return nullptr;
    vector<Node*> nodes;
    for (size_t i = 0; i < adj.size(); i++) nodes.push_back(new Node(int(i) + 1));
    for (size_t i = 0; i < adj.size(); i++)
        for (int v : adj[i]) nodes[i]->neighbors.push_back(nodes[v - 1]);
    return nodes[0];
}

string describe(Node* start) {
    if (start == nullptr) return "null";
    string s;
    for (Node* n : allNodes(start)) {
        if (!s.empty()) s += "; ";
        s += to_string(n->val) + " -> [";
        for (size_t i = 0; i < n->neighbors.size(); i++)
            s += (i ? ", " : "") + to_string(n->neighbors[i]->val);
        s += "]";
    }
    return s;
}

int main() {
    cout << boolalpha;
    vector<pair<string, vector<vector<int>>>> cases = {
        {"4-cycle", {{2, 4}, {1, 3}, {2, 4}, {1, 3}}},
        {"single node", {{}}},
        {"empty graph", {}},
        {"triangle", {{2, 3}, {1, 3}, {1, 2}}}};
    for (auto& [name, adj] : cases) {
        Node* original = build(adj);
        Node* copy = cloneGraph(original);
        cout << name << "\\n";
        cout << "  clone: " << describe(copy) << "\\n";
        cout << "  same shape: " << (describe(copy) == describe(original)) << "\\n";
        if (original != nullptr) {
            vector<Node*> o = allNodes(original);
            unordered_set<Node*> origSet(o.begin(), o.end());
            bool shared = false;
            for (Node* n : allNodes(copy)) shared = shared || origSet.count(n);
            cout << "  shares a node with the original: " << shared << "\\n";
        }
        freeGraph(original);
        freeGraph(copy);
    }
    Node* original = build({{2, 4}, {1, 3}, {2, 4}, {1, 3}});
    Node* copy = cloneGraph(original);
    copy->val = 100;
    copy->neighbors[0]->val = 200;
    cout << "after editing the clone, original: " << describe(original) << "\\n";
    cout << "clone now: " << describe(copy) << "\\n";
    freeGraph(original);
    freeGraph(copy);
}`,
          },
          {
            label: "Why the map matters: naive recursion vs DFS clone call counts, and BFS on a 10000-node path",
            code: `#include <iostream>
#include <memory>
#include <queue>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>
using namespace std;

struct Node {
    int val;
    vector<Node*> neighbors;
    explicit Node(int v) : val(v) {}
};

int calls = 0, checks = 0;
vector<unique_ptr<Node>> pool;                 // owns every node: freed automatically

Node* fresh(int v) { pool.push_back(make_unique<Node>(v)); return pool.back().get(); }

// WRONG on purpose: no original -> copy map, so a cycle never ends.
Node* naiveClone(Node* node, int limit) {
    if (++calls > limit) return nullptr;       // safety valve so the demo stops
    Node* copy = fresh(node->val);
    for (Node* nb : node->neighbors) copy->neighbors.push_back(naiveClone(nb, limit));
    return copy;
}

// Recursive DFS clone: the map is both the visited set and the result.
Node* dfsClone(Node* node, unordered_map<Node*, Node*>& copies) {
    calls++;
    auto it = copies.find(node);
    if (it != copies.end()) return it->second;
    Node* copy = fresh(node->val);
    copies[node] = copy;                       // register BEFORE recursing: breaks cycles
    for (Node* nb : node->neighbors) copy->neighbors.push_back(dfsClone(nb, copies));
    return copy;
}

unordered_map<Node*, Node*> bfsClone(Node* node) {
    unordered_map<Node*, Node*> copies{{node, fresh(node->val)}};
    queue<Node*> q;
    q.push(node);
    while (!q.empty()) {
        Node* cur = q.front(); q.pop();
        for (Node* nb : cur->neighbors) {
            checks++;
            if (!copies.count(nb)) { copies[nb] = fresh(nb->val); q.push(nb); }
            copies[cur]->neighbors.push_back(copies[nb]);
        }
    }
    return copies;
}

Node* make(int n, const vector<pair<int, int>>& edges) {
    vector<Node*> nodes;
    for (int i = 0; i < n; i++) nodes.push_back(fresh(i + 1));
    for (auto [a, b] : edges) {                // undirected: store both directions
        nodes[a - 1]->neighbors.push_back(nodes[b - 1]);
        nodes[b - 1]->neighbors.push_back(nodes[a - 1]);
    }
    return nodes[0];
}

int main() {
    naiveClone(make(2, {{1, 2}}), 50);
    cout << "naive clone of 1 - 2 without a map: gave up after " << calls - 1 << " calls\\n";

    vector<pair<int, int>> k5, star;
    for (int a = 1; a <= 5; a++) for (int b = a + 1; b <= 5; b++) k5.push_back({a, b});
    for (int k = 2; k <= 7; k++) star.push_back({1, k});
    vector<pair<string, pair<int, vector<pair<int, int>>>>> graphs = {
        {"4-cycle", {4, {{1, 2}, {2, 3}, {3, 4}, {4, 1}}}}, {"K5", {5, k5}}, {"star", {7, star}}};
    for (auto& [name, g] : graphs) {
        calls = 0;
        unordered_map<Node*, Node*> copies;
        dfsClone(make(g.first, g.second), copies);
        cout << name << ": nodes=" << g.first << " edges=" << g.second.size()
             << " dfs calls=" << calls << " copies=" << copies.size() << "\\n";
    }

    int n = 10000;
    vector<pair<int, int>> path;
    for (int k = 1; k < n; k++) path.push_back({k, k + 1});
    auto copies = bfsClone(make(n, path));
    cout << "bfs clone of a " << n << "-node path: copies=" << copies.size()
         << " neighbor checks=" << checks << "\\n";
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you check if a graph is bipartite?",
    difficulty: "medium",
    seoDescription: "Check if a graph is bipartite by 2-colouring it with BFS: odd cycles, disconnected graphs, O(V+E), and verified code in Python, JS, Java and C++.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You are given an undirected graph as an adjacency list — \`graph[u]\` is the list of nodes joined to \`u\`. Return whether the graph is bipartite: can you split the nodes into two groups so that every edge goes between the groups? The graph may be disconnected. Please write it in Python."

**What a strong answer should cover:**
- The reformulation: bipartite ⇔ the graph can be **2-coloured** ⇔ it has **no odd cycle**.
- BFS (or DFS) colouring: give each uncoloured neighbour the opposite colour; a neighbour with the **same** colour means \`False\`.
- An outer loop over every node so each **connected component** gets its own traversal.
- O(V + E) time and O(V) extra space, plus the free result: the colour array *is* the two sides.
- Python specifics: \`collections.deque\` with \`popleft()\` for the queue, building adjacency lists with a list comprehension (never \`[[]] * n\`), and recursion depth limits if you write the DFS recursively.

**Clarifying questions expected:**
- Can the graph be disconnected or contain self-loops?
- Do you need only the yes/no answer, or the two groups too?

**Code / implementation expected:** Yes — an \`is_bipartite(graph)\` function in Python with a colour list and BFS, tested on a bipartite graph, a triangle and a disconnected graph.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know Python lists and loops; graphs and colouring are explained from scratch.
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by actually running the code with \`python3\` (3.13); nothing is typed in by hand.

## 1. Why This Even Matters — A Story First

A teacher wants to split a class into **two teams** for a quiz. There is one rule: some pairs of students are rivals, and rivals must be on **different** teams. Can it be done?

Try it with four students in a ring of rivalries: Ana–Ben, Ben–Cy, Cy–Dee, Dee–Ana. Put Ana on Red. Then Ben must be Blue, so Cy must be Red, so Dee must be Blue — and Dee–Ana is Blue–Red, fine. It works.

Now three students who are all rivals: Ana–Ben, Ben–Cy, Cy–Ana. Ana is Red, Ben is Blue, Cy must differ from Ben so Cy is Red — but Cy and Ana are rivals and both Red. **No split exists.** You did not have to try every split to know that: one forced choice after another led straight to a contradiction.

That is the whole algorithm. A graph that can be split this way is called **bipartite**, and checking it is a plain graph traversal where each step is forced: once you choose a colour for one student, everybody connected to them has no choice left. The same question appears in real life as "can these jobs run on two machines without conflicts?", "can this map of rival teams be scheduled into two time slots?", and inside harder algorithms such as bipartite matching.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How is the graph given — adjacency list or edge list? 0- or 1-indexed? | Decides how you build or index it; 1-indexed edge lists need \`n + 1\` slots. |
| Is it undirected? | Bipartite is defined on undirected edges. The LeetCode version (785) gives symmetric adjacency lists: if \`v\` is in \`graph[u]\`, \`u\` is in \`graph[v]\`. |
| Can the graph be disconnected? | Yes, usually. Then one traversal from node 0 is not enough — you must start a new one from every uncoloured node. |
| Can there be self-loops? | A node joined to itself can never get a colour different from its own, so the answer is immediately \`false\`. |
| Do you want just true/false, or the two sides (or an odd cycle as proof)? | The colouring gives you the two sides for free; reporting the odd cycle needs parent pointers. |
| How big can it get? | A recursive DFS can overflow the call stack on long paths; BFS or an explicit stack is safer. |

## 3. The Core Idea: Two-Colour It, and Watch for a Clash

📌 **Interview term: Bipartite graph** — a graph whose nodes can be split into two sets A and B so that **every edge goes between A and B**, never inside A or inside B.

📌 **Interview term: 2-colouring** — giving each node one of two colours so that the two ends of every edge have different colours. A graph is bipartite exactly when it has a 2-colouring; the two colour classes are the sets A and B.

📌 **Interview term: Odd cycle** — a cycle with an odd number of edges, like a triangle (3) or a pentagon (5). Around an odd cycle the colours would have to alternate an odd number of times and come back to the start with the wrong colour. The classic theorem: **a graph is bipartite if and only if it has no odd cycle.** The colour clash your traversal finds is exactly how an odd cycle shows itself.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 250" role="img" aria-label="The 4-cycle 0 1 2 3 drawn as two columns. Side A holds 0 and 2, side B holds 1 and 3, and all four edges cross between the columns">
  <text class="d-text" x="200" y="28" text-anchor="middle">Side A (colour 0)</text>
  <text class="d-text d-accent" x="480" y="28" text-anchor="middle">Side B (colour 1)</text>
  <line class="d-edge" x1="226" y1="80" x2="454" y2="80"/>
  <line class="d-edge" x1="226" y1="80" x2="454" y2="190"/>
  <line class="d-edge" x1="226" y1="190" x2="454" y2="80"/>
  <line class="d-edge" x1="226" y1="190" x2="454" y2="190"/>
  <circle class="d-box-muted" cx="200" cy="80" r="26"/>
  <text class="d-text" x="200" y="86" text-anchor="middle">0</text>
  <circle class="d-box-muted" cx="200" cy="190" r="26"/>
  <text class="d-text" x="200" y="196" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="480" cy="80" r="26"/>
  <text class="d-text d-accent" x="480" y="86" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="480" cy="190" r="26"/>
  <text class="d-text d-accent" x="480" y="196" text-anchor="middle">3</text>
</svg>

The square 0–1–2–3–0 redrawn as two columns: the edges 0–1, 1–2, 2–3 and 3–0 all cross from one side to the other, so it is bipartite with A = {0, 2} and B = {1, 3} — exactly what example 1 prints.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 270" role="img" aria-label="A triangle 0 1 2. Node 0 gets colour A, node 1 gets colour B, node 2 is forced to A by node 1, and then the edge from 2 to 0 joins two A nodes, which is the clash">
  <line class="d-edge" x1="340" y1="70" x2="200" y2="210"/>
  <line class="d-edge" x1="200" y1="210" x2="480" y2="210"/>
  <line class="d-edge-dashed" x1="480" y1="210" x2="340" y2="70"/>
  <circle class="d-box-muted" cx="340" cy="70" r="26"/>
  <text class="d-text" x="340" y="76" text-anchor="middle">0 A</text>
  <circle class="d-box-accent" cx="200" cy="210" r="26"/>
  <text class="d-text d-accent" x="200" y="216" text-anchor="middle">1 B</text>
  <circle class="d-box-muted" cx="480" cy="210" r="26"/>
  <text class="d-text" x="480" y="216" text-anchor="middle">2 A</text>
  <text class="d-sub" x="560" y="130" text-anchor="middle">A next to A</text>
  <text class="d-sub" x="120" y="130" text-anchor="middle">forced</text>
</svg>

In the triangle, 0 is coloured A, which forces 1 to B, which forces 2 to A — and the dashed edge 2–0 now joins two A nodes. Three edges is an odd cycle, so no choice of starting colour could have avoided the clash.

### The algorithm

1. Make a \`color\` array of size \`n\`, filled with **-1** meaning "not coloured yet".
2. For every node \`start\` that is still -1 (this loop is what handles disconnected graphs): colour it 0 and run a BFS from it.
3. When you take node \`u\` off the queue, look at each neighbour \`v\`:
   - if \`v\` is uncoloured, give it the **opposite** colour \`1 - color[u]\` and queue it;
   - if \`v\` already has the **same** colour as \`u\`, stop and return **false**;
   - if \`v\` has the opposite colour, it is fine — do nothing.
4. If every BFS finishes without a clash, return **true**. The \`color\` array is the two sides.

📌 **Interview term: Connected component** — a group of nodes that can all reach each other. Each component is coloured independently, so the graph is bipartite only if **every** component is. Counting components with the same outer loop is its own page: [How do you count connected components in an undirected graph?](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph)

Why is the first colour choice in each component free? Because swapping the two colours of a whole component gives another valid colouring — so if colouring \`start\` with 0 leads to a clash, colouring it with 1 would lead to the mirror-image clash. There is never a reason to backtrack.

BFS is not special here: a DFS (recursive or with an explicit stack) gives the same answer, because each colour is forced by the edge it came through, in any order. A third route is **Union-Find**: all neighbours of \`u\` must end up on the same side, so union them together, and if \`u\` ever lands in the same set as one of its neighbours, the graph is not bipartite. Example 2 runs all three on 500 random graphs and checks they agree. For the general trade-offs see [What is the difference between BFS and DFS?](/interview-question/what-is-the-difference-between-bfs-and-dfs) and [What is the Union-Find (Disjoint Set) data structure?](/interview-question/what-is-the-union-find-disjoint-set-data-structure)


## 4. Brute Force First, Then the Python Code

The **brute force** is to try every way of splitting the nodes into two groups — \`2^n\` splits — and check every edge for each one: O(2^n · E). With 30 nodes that is over a billion splits. The colouring idea removes the guessing: inside a component, the first colour decides every other colour, so one traversal is enough.

~~~python
from collections import deque


def two_color(graph):
    """BFS 2-colouring. Returns the colour list, or None if an edge joins two equal colours."""
    n = len(graph)
    color = [-1] * n                       # -1 = not coloured yet, 0 = side A, 1 = side B
    for start in range(n):                 # every component needs its own start
        if color[start] != -1:
            continue
        color[start] = 0
        queue = deque([start])
        while queue:
            u = queue.popleft()
            for v in graph[u]:
                if color[v] == -1:
                    color[v] = 1 - color[u]        # opposite side
                    queue.append(v)
                elif color[v] == color[u]:
                    return None                    # same side on both ends: odd cycle
    return color


def is_bipartite(graph):
    return two_color(graph) is not None
~~~

Line by line, with the Python parts that matter:

- **\`color = [-1] * n\`** — one int per node. \`[-1] * n\` is safe because ints are immutable; the same trick with a list inside (\`[[]] * n\`) is a bug, shown below.
- **\`for start in range(n)\`** — the outer loop. Without it, a graph whose odd cycle sits in a second component (the "edge 0-1 plus a 5-cycle" case in example 1) would wrongly return \`True\`.
- **\`deque\` and \`popleft()\`** — O(1) at both ends, per the [collections docs](https://docs.python.org/3/library/collections.html#collections.deque); \`list.pop(0)\` shifts the whole list every time.
- **\`1 - color[u]\`** flips 0 ↔ 1. (\`color[u] ^ 1\` does the same with XOR.)
- **Colour when you enqueue, not when you dequeue.** Setting \`color[v]\` at the moment \`v\` is queued means it is never queued twice.
- **Returning \`None\` vs a list** lets one function answer both "is it bipartite?" and "what are the two sides?".

📌 **Interview term: Multi-component traversal** — the pattern "for every node, if it is not visited yet, start a new traversal from it". It visits every node exactly once overall, so the total cost is still O(V + E), not O(V · (V + E)).

The Python trap when you build the adjacency lists yourself (for example from an edge list), checked by running it:

~~~python
n = 3
graph = [[]] * n                  # BUG: three references to ONE list
graph[0].append(1)
print("[[]] * n          ->", graph)

graph = [[] for _ in range(n)]    # three separate lists
graph[0].append(1)
print("list comprehension ->", graph)

color = [-1] * n                  # fine: ints are immutable, nothing is shared
color[0] = 0
print("color              ->", color)
~~~

~~~text
[[]] * n          -> [[1], [1], [1]]
list comprehension -> [[1], [], []]
color              -> [0, -1, -1]
~~~

\`[[]] * n\` copies the **reference** to one list three times, so an edge added to node 0 appears on every node — and the colouring then sees edges that do not exist.

A recursive DFS colouring is also correct, but every node on the current path is a Python stack frame and the default recursion limit is 1000 (\`sys.getrecursionlimit()\`), so a long path raises \`RecursionError\`. Example 2 uses an explicit-stack DFS instead, which has no such limit.

## 5. Verified: Running the Code

Both examples were saved as \`main.py\` and run with \`python3 main.py\` (Python 3.13). Example 1 checks eight graphs: the square, a triangle, the two LeetCode 785 examples, a disconnected graph whose second component is a 5-cycle, an even cycle plus an isolated node, the empty graph and a self-loop — and prints both sides when the answer is true. The last line is the plain \`is_bipartite\` on a path:

~~~text
square 0-1-2-3: true  A=[0, 2] B=[1, 3]
triangle: false
LeetCode example 1: false
LeetCode example 2: true  A=[0, 2] B=[1, 3]
edge 0-1 plus a 5-cycle 2..6: false
6-cycle plus isolated 6: true  A=[0, 2, 4, 6] B=[1, 3, 5]
empty graph: true  A=[] B=[]
self-loop on 0: false
true
~~~

Things to notice: the isolated node 6 lands on side A (it starts its own component and gets colour 0), the empty graph is bipartite (there is no edge to break the rule), and the self-loop fails immediately because node 0 is its own neighbour with its own colour.

Example 2 generates 500 small random graphs (2 to 8 nodes, each pair joined with probability 30%, from a fixed-seed generator so all four languages build the same graphs) and runs BFS colouring, iterative DFS colouring and the union-find check on each:

~~~text
graphs tested: 500
bipartite: 355, not bipartite: 145
BFS, DFS and union-find agree on: 500
~~~

All three methods agree on all 500 graphs. Roughly 70% of these small random graphs happen to be bipartite; denser graphs almost always contain a triangle or a pentagon.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Try every split | O(2^n · E) | O(n) | \`2^n\` ways to assign sides, each checked against every edge |
| BFS colouring | O(V + E) | O(V) | Each node is coloured and queued once; each adjacency entry is looked at once. The colour list and the \`deque\` hold at most V items. |
| DFS colouring (explicit stack) | O(V + E) | O(V) | Same work, a list used as a stack |
| Union-find | O((V + E) · α(V)) | O(V) | One \`find\` per adjacency entry; α is the inverse Ackermann function, at most 4 in practice |

V is the number of nodes, E the number of edges. The adjacency list itself is input, not extra space.

## Edge Cases

- **Disconnected graph** — the outer \`for start\` loop; the 5-cycle in the second component is found.
- **Isolated nodes** — coloured 0 on their own, never cause a clash.
- **Empty graph** (\`[]\`) — the loop does not run; \`True\` with two empty sides.
- **Self-loop** — \`v == u\`, same colour, so \`False\` at once.
- **Even cycles** are fine (square, 6-cycle); **any** odd cycle anywhere makes it \`False\`.
- **Duplicate edges** — harmless: the second time the neighbour already has the opposite colour.

## Common Pitfalls

- **Only running BFS from node 0** — misses odd cycles in other components.
- **\`[[]] * n\` for adjacency lists** — one shared list, as the snippet shows; use \`[[] for _ in range(n)]\`.
- **Using \`0\` as "uncoloured"** — then side A and "not visited" are the same value; use \`-1\` or \`None\`.
- **Colouring on dequeue instead of enqueue** — nodes can be queued several times and you may compare against a colour that has not been set yet.
- **\`list.pop(0)\` as the queue** — O(n) per pop; use \`deque.popleft()\`.
- **Recursive DFS on large inputs** — \`RecursionError\` past 1000 frames by default.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">A graph is bipartite exactly when it can be 2-coloured, so I BFS from every uncoloured node, give each new neighbour <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 - color[u]</code>, and return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">False</code> if a neighbour already has the <strong style="color:#ffca28;">same</strong> colour as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is correct:</strong> <span style="color:#f0e2c8;">Inside a component the first colour forces every other one, so there is nothing to backtrack; a same-colour edge means an <strong style="color:#ffca28;">odd cycle</strong>, and a graph with an odd cycle can never be split.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">O(V + E) time — each node coloured once, each adjacency entry checked once — and O(V) extra space for the colour list and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deque</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Edge cases:</strong> <span style="color:#f0e2c8;">The outer loop over all nodes handles disconnected graphs; isolated nodes and the empty graph are bipartite; a self-loop is not.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The Python detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">color = [-1] * n</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-1</code> as "uncoloured", a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">collections.deque</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">popleft()</code>, adjacency lists from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[[] for _ in range(n)]</code> never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[[]] * n</code>, and BFS rather than recursion to stay clear of the 1000-frame limit.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return an odd cycle as proof when the answer is no?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent</code> for each node during BFS. When the clashing edge <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u</code>–<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v</code> is found, walk both up the parent chain until they meet; the two paths plus the edge form a cycle, and because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v</code> are at depths of the same parity it has odd length.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use DFS instead of BFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, the answer is the same because each colour is forced by its edge whatever the order. I would use an explicit list as a stack in Python, since a recursive DFS hits <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RecursionError</code> on long paths.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does the union-find version work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For each node <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u</code>, every neighbour must be on the side opposite <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u</code>, so I union all of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u</code>'s neighbours with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">graph[u][0]</code>; if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find(u) == find(v)</code> for any neighbour <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v</code>, the graph is not bipartite. It is O((V + E)·α(V)) and handy when edges arrive one at a time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the graph is given as an edge list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Build the adjacency list first with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[[] for _ in range(n)]</code>, appending both directions for each edge, then run the same BFS. With 1-indexed nodes I size it <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n + 1</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does this show up in practice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two-slot scheduling with conflicts, splitting people into two teams with rivalries, and as the first step of bipartite matching — LeetCode 886, Possible Bipartition, is the same check on an edge list.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Bipartite graph** | Nodes split into two sets with every edge going between the sets |
| **2-colouring** | Two colours, different on the two ends of every edge |
| **Odd cycle** | A cycle with an odd number of edges; its presence means "not bipartite" |
| **Connected component** | A maximal group of nodes that can all reach each other |
| **Multi-component traversal** | Start a new BFS/DFS from every node that is still unvisited |

---
**Conclusion:** Checking whether a graph is bipartite is a 2-colouring traversal: colour a start node 0, give every uncoloured neighbour the opposite colour, and fail the moment an edge joins two nodes of the same colour — which happens exactly when the graph has an odd cycle. Wrapping the BFS in a loop over all nodes handles disconnected graphs, and the whole check is O(V + E) time and O(V) space, with the two sides as a free by-product. In Python, use a \`deque\`, a \`-1\` sentinel for "uncoloured", and build adjacency lists with a comprehension rather than \`[[]] * n\`. The same "visit, colour, propagate" pattern drives [cloning a graph](/interview-question/how-do-you-clone-a-graph), [counting islands](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid) and [detecting a cycle in a directed graph](/interview-question/how-do-you-detect-a-cycle-in-a-directed-graph).`,
        examples: [
          {
            label: "BFS 2-colouring on eight graphs, printing both sides when it succeeds",
            code: `from collections import deque


def two_color(graph):
    """BFS 2-colouring. Returns the colour list, or None if an edge joins two equal colours."""
    n = len(graph)
    color = [-1] * n                       # -1 = not coloured yet, 0 = side A, 1 = side B
    for start in range(n):                 # every component needs its own start
        if color[start] != -1:
            continue
        color[start] = 0
        queue = deque([start])
        while queue:
            u = queue.popleft()
            for v in graph[u]:
                if color[v] == -1:
                    color[v] = 1 - color[u]        # opposite side
                    queue.append(v)
                elif color[v] == color[u]:
                    return None                    # same side on both ends: odd cycle
    return color


def is_bipartite(graph):
    return two_color(graph) is not None


def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


def report(name, graph):
    color = two_color(graph)
    if color is None:
        print(name + ": false")
    else:
        a = [i for i in range(len(graph)) if color[i] == 0]
        b = [i for i in range(len(graph)) if color[i] == 1]
        print(name + ": true  A=" + fmt(a) + " B=" + fmt(b))


report("square 0-1-2-3", [[1, 3], [0, 2], [1, 3], [0, 2]])
report("triangle", [[1, 2], [0, 2], [0, 1]])
report("LeetCode example 1", [[1, 2, 3], [0, 2], [0, 1, 3], [0, 2]])
report("LeetCode example 2", [[1, 3], [0, 2], [1, 3], [0, 2]])
report("edge 0-1 plus a 5-cycle 2..6", [[1], [0], [3, 6], [2, 4], [3, 5], [4, 6], [5, 2]])
report("6-cycle plus isolated 6", [[1, 5], [0, 2], [1, 3], [2, 4], [3, 5], [4, 0], []])
report("empty graph", [])
report("self-loop on 0", [[0, 1], [0]])
print(str(is_bipartite([[1], [0, 2], [1, 3], [2]])).lower())   # true`,
          },
          {
            label: "BFS vs iterative DFS vs union-find agree on 500 random graphs",
            code: `from collections import deque

seed = 12345


def rand():                                  # Park-Miller generator: same numbers in every language
    global seed
    seed = seed * 48271 % 2147483647
    return seed


def bfs_check(graph):
    color = [-1] * len(graph)
    for s in range(len(graph)):
        if color[s] != -1:
            continue
        color[s] = 0
        queue = deque([s])
        while queue:
            u = queue.popleft()
            for v in graph[u]:
                if color[v] == -1:
                    color[v] = 1 - color[u]
                    queue.append(v)
                elif color[v] == color[u]:
                    return False
    return True


def dfs_check(graph):                        # iterative DFS: an explicit stack, no recursion
    color = [-1] * len(graph)
    for s in range(len(graph)):
        if color[s] != -1:
            continue
        color[s] = 0
        stack = [s]
        while stack:
            u = stack.pop()
            for v in graph[u]:
                if color[v] == -1:
                    color[v] = 1 - color[u]
                    stack.append(v)
                elif color[v] == color[u]:
                    return False
    return True


def union_find_check(graph):                 # all neighbours of u must share one set, u another
    parent = list(range(len(graph)))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]    # path halving
            x = parent[x]
        return x

    for u in range(len(graph)):
        for v in graph[u]:
            if find(u) == find(v):
                return False
            parent[find(v)] = find(graph[u][0])
    return True


tested = bipartite = agree = 0
for _ in range(500):
    n = 2 + rand() % 7                       # 2..8 nodes
    graph = [[] for _ in range(n)]
    for a in range(n):
        for b in range(a + 1, n):
            if rand() % 100 < 30:            # each pair is an edge with probability 30%
                graph[a].append(b)
                graph[b].append(a)
    r1, r2, r3 = bfs_check(graph), dfs_check(graph), union_find_check(graph)
    tested += 1
    bipartite += r1
    agree += (r1 == r2 == r3)
print("graphs tested: " + str(tested))
print("bipartite: " + str(bipartite) + ", not bipartite: " + str(tested - bipartite))
print("BFS, DFS and union-find agree on: " + str(agree))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You are given an undirected graph as an adjacency list — \`graph[u]\` is the array of nodes joined to \`u\`. Return whether the graph is bipartite: can you split the nodes into two groups so that every edge goes between the groups? The graph may be disconnected. Please write it in JavaScript."

**What a strong answer should cover:**
- The reformulation: bipartite ⇔ the graph can be **2-coloured** ⇔ it has **no odd cycle**.
- BFS (or DFS) colouring: give each uncoloured neighbour the opposite colour; a neighbour with the **same** colour means \`false\`.
- An outer loop over every node so each **connected component** gets its own traversal.
- O(V + E) time and O(V) extra space, plus the free result: the colour array *is* the two sides.
- JavaScript specifics: a head index instead of \`shift()\` for the queue, \`new Array(n).fill(-1)\` is fine for numbers but \`fill([])\` shares one array, and \`===\` comparisons on the colour values.

**Clarifying questions expected:**
- Can the graph be disconnected or contain self-loops?
- Do you need only the yes/no answer, or the two groups too?

**Code / implementation expected:** Yes — an \`isBipartite(graph)\` function in JavaScript with a colour array and BFS, tested on a bipartite graph, a triangle and a disconnected graph.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know JavaScript arrays and loops; graphs and colouring are explained from scratch.
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by actually running the code with \`node\` (v22); nothing is typed in by hand. The examples use no Node-only APIs, so they also run in the browser.

## 1. Why This Even Matters — A Story First

A teacher wants to split a class into **two teams** for a quiz. There is one rule: some pairs of students are rivals, and rivals must be on **different** teams. Can it be done?

Try it with four students in a ring of rivalries: Ana–Ben, Ben–Cy, Cy–Dee, Dee–Ana. Put Ana on Red. Then Ben must be Blue, so Cy must be Red, so Dee must be Blue — and Dee–Ana is Blue–Red, fine. It works.

Now three students who are all rivals: Ana–Ben, Ben–Cy, Cy–Ana. Ana is Red, Ben is Blue, Cy must differ from Ben so Cy is Red — but Cy and Ana are rivals and both Red. **No split exists.** You did not have to try every split to know that: one forced choice after another led straight to a contradiction.

That is the whole algorithm. A graph that can be split this way is called **bipartite**, and checking it is a plain graph traversal where each step is forced: once you choose a colour for one student, everybody connected to them has no choice left. The same question appears in real life as "can these jobs run on two machines without conflicts?", "can this map of rival teams be scheduled into two time slots?", and inside harder algorithms such as bipartite matching.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How is the graph given — adjacency list or edge list? 0- or 1-indexed? | Decides how you build or index it; 1-indexed edge lists need \`n + 1\` slots. |
| Is it undirected? | Bipartite is defined on undirected edges. The LeetCode version (785) gives symmetric adjacency lists: if \`v\` is in \`graph[u]\`, \`u\` is in \`graph[v]\`. |
| Can the graph be disconnected? | Yes, usually. Then one traversal from node 0 is not enough — you must start a new one from every uncoloured node. |
| Can there be self-loops? | A node joined to itself can never get a colour different from its own, so the answer is immediately \`false\`. |
| Do you want just true/false, or the two sides (or an odd cycle as proof)? | The colouring gives you the two sides for free; reporting the odd cycle needs parent pointers. |
| How big can it get? | A recursive DFS can overflow the call stack on long paths; BFS or an explicit stack is safer. |

## 3. The Core Idea: Two-Colour It, and Watch for a Clash

📌 **Interview term: Bipartite graph** — a graph whose nodes can be split into two sets A and B so that **every edge goes between A and B**, never inside A or inside B.

📌 **Interview term: 2-colouring** — giving each node one of two colours so that the two ends of every edge have different colours. A graph is bipartite exactly when it has a 2-colouring; the two colour classes are the sets A and B.

📌 **Interview term: Odd cycle** — a cycle with an odd number of edges, like a triangle (3) or a pentagon (5). Around an odd cycle the colours would have to alternate an odd number of times and come back to the start with the wrong colour. The classic theorem: **a graph is bipartite if and only if it has no odd cycle.** The colour clash your traversal finds is exactly how an odd cycle shows itself.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 250" role="img" aria-label="The 4-cycle 0 1 2 3 drawn as two columns. Side A holds 0 and 2, side B holds 1 and 3, and all four edges cross between the columns">
  <text class="d-text" x="200" y="28" text-anchor="middle">Side A (colour 0)</text>
  <text class="d-text d-accent" x="480" y="28" text-anchor="middle">Side B (colour 1)</text>
  <line class="d-edge" x1="226" y1="80" x2="454" y2="80"/>
  <line class="d-edge" x1="226" y1="80" x2="454" y2="190"/>
  <line class="d-edge" x1="226" y1="190" x2="454" y2="80"/>
  <line class="d-edge" x1="226" y1="190" x2="454" y2="190"/>
  <circle class="d-box-muted" cx="200" cy="80" r="26"/>
  <text class="d-text" x="200" y="86" text-anchor="middle">0</text>
  <circle class="d-box-muted" cx="200" cy="190" r="26"/>
  <text class="d-text" x="200" y="196" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="480" cy="80" r="26"/>
  <text class="d-text d-accent" x="480" y="86" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="480" cy="190" r="26"/>
  <text class="d-text d-accent" x="480" y="196" text-anchor="middle">3</text>
</svg>

The square 0–1–2–3–0 redrawn as two columns: the edges 0–1, 1–2, 2–3 and 3–0 all cross from one side to the other, so it is bipartite with A = {0, 2} and B = {1, 3} — exactly what example 1 prints.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 270" role="img" aria-label="A triangle 0 1 2. Node 0 gets colour A, node 1 gets colour B, node 2 is forced to A by node 1, and then the edge from 2 to 0 joins two A nodes, which is the clash">
  <line class="d-edge" x1="340" y1="70" x2="200" y2="210"/>
  <line class="d-edge" x1="200" y1="210" x2="480" y2="210"/>
  <line class="d-edge-dashed" x1="480" y1="210" x2="340" y2="70"/>
  <circle class="d-box-muted" cx="340" cy="70" r="26"/>
  <text class="d-text" x="340" y="76" text-anchor="middle">0 A</text>
  <circle class="d-box-accent" cx="200" cy="210" r="26"/>
  <text class="d-text d-accent" x="200" y="216" text-anchor="middle">1 B</text>
  <circle class="d-box-muted" cx="480" cy="210" r="26"/>
  <text class="d-text" x="480" y="216" text-anchor="middle">2 A</text>
  <text class="d-sub" x="560" y="130" text-anchor="middle">A next to A</text>
  <text class="d-sub" x="120" y="130" text-anchor="middle">forced</text>
</svg>

In the triangle, 0 is coloured A, which forces 1 to B, which forces 2 to A — and the dashed edge 2–0 now joins two A nodes. Three edges is an odd cycle, so no choice of starting colour could have avoided the clash.

### The algorithm

1. Make a \`color\` array of size \`n\`, filled with **-1** meaning "not coloured yet".
2. For every node \`start\` that is still -1 (this loop is what handles disconnected graphs): colour it 0 and run a BFS from it.
3. When you take node \`u\` off the queue, look at each neighbour \`v\`:
   - if \`v\` is uncoloured, give it the **opposite** colour \`1 - color[u]\` and queue it;
   - if \`v\` already has the **same** colour as \`u\`, stop and return **false**;
   - if \`v\` has the opposite colour, it is fine — do nothing.
4. If every BFS finishes without a clash, return **true**. The \`color\` array is the two sides.

📌 **Interview term: Connected component** — a group of nodes that can all reach each other. Each component is coloured independently, so the graph is bipartite only if **every** component is. Counting components with the same outer loop is its own page: [How do you count connected components in an undirected graph?](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph)

Why is the first colour choice in each component free? Because swapping the two colours of a whole component gives another valid colouring — so if colouring \`start\` with 0 leads to a clash, colouring it with 1 would lead to the mirror-image clash. There is never a reason to backtrack.

BFS is not special here: a DFS (recursive or with an explicit stack) gives the same answer, because each colour is forced by the edge it came through, in any order. A third route is **Union-Find**: all neighbours of \`u\` must end up on the same side, so union them together, and if \`u\` ever lands in the same set as one of its neighbours, the graph is not bipartite. Example 2 runs all three on 500 random graphs and checks they agree. For the general trade-offs see [What is the difference between BFS and DFS?](/interview-question/what-is-the-difference-between-bfs-and-dfs) and [What is the Union-Find (Disjoint Set) data structure?](/interview-question/what-is-the-union-find-disjoint-set-data-structure)


## 4. Brute Force First, Then the JavaScript Code

The **brute force** is to try every way of splitting the nodes into two groups — \`2^n\` splits — and check every edge for each one: O(2^n · E). With 30 nodes that is over a billion splits. The colouring idea removes the guessing: inside a component, the first colour decides every other colour, so one traversal is enough.

~~~javascript
// BFS 2-colouring. Returns the colour array, or null if an edge joins two equal colours.
function twoColor(graph) {
  const n = graph.length;
  const color = new Array(n).fill(-1);   // -1 = not coloured yet, 0 = side A, 1 = side B
  for (let start = 0; start < n; start++) {        // every component needs its own start
    if (color[start] !== -1) continue;
    color[start] = 0;
    const queue = [start];
    for (let head = 0; head < queue.length; head++) {
      const u = queue[head];
      for (const v of graph[u]) {
        if (color[v] === -1) {
          color[v] = 1 - color[u];                 // opposite side
          queue.push(v);
        } else if (color[v] === color[u]) {
          return null;                             // same side on both ends: odd cycle
        }
      }
    }
  }
  return color;
}

function isBipartite(graph) {
  return twoColor(graph) !== null;
}
~~~

Line by line, with the JavaScript parts that matter:

- **\`new Array(n).fill(-1)\`** — one number per node, all "uncoloured". \`fill\` with a number is safe; \`fill([])\` is a bug (below). An \`Int8Array(n).fill(-1)\` would also work and uses one byte per node.
- **\`for (let start = 0; ...)\`** — the outer loop. Without it, a graph whose odd cycle sits in a second component (the "edge 0-1 plus a 5-cycle" case in example 1) would wrongly return \`true\`.
- **\`queue\` plus a \`head\` index** — \`shift()\` moves every remaining element down by one ([MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/shift)); reading \`queue[head++]\` is O(1).
- **\`for (const v of graph[u])\`** iterates the values. \`for...in\` would iterate the **indices as strings** — a classic JS slip.
- **\`1 - color[u]\`** flips 0 ↔ 1; colour **when you enqueue**, so a node is never queued twice.
- **\`===\`** everywhere — the values are all numbers, so \`==\` would give the same answers here, but strict equality is the habit interviewers expect.

📌 **Interview term: Multi-component traversal** — the pattern "for every node, if it is not visited yet, start a new traversal from it". It visits every node exactly once overall, so the total is still O(V + E).

The JavaScript trap when you build the adjacency lists yourself (for example from an edge list), checked by running it:

~~~javascript
const n = 3;
let graph = new Array(n).fill([]);             // BUG: one array, three references
graph[0].push(1);
console.log('fill([])     -> ' + JSON.stringify(graph));

graph = Array.from({ length: n }, () => []);  // three separate arrays
graph[0].push(1);
console.log('Array.from   -> ' + JSON.stringify(graph));

const color = new Array(n).fill(-1);          // fine: numbers are values, not references
color[0] = 0;
console.log('color        -> ' + JSON.stringify(color));
~~~

~~~text
fill([])     -> [[1],[1],[1]]
Array.from   -> [[1],[],[]]
color        -> [0,-1,-1]
~~~

\`fill([])\` evaluates \`[]\` **once** and puts the same array in every slot, so an edge added to node 0 appears on every node. \`Array.from({ length: n }, () => [])\` calls the arrow function per slot. Example 2 builds its random graphs that way.

A recursive DFS colouring is correct too, but each node on the current path is a stack frame, and on a long path it throws \`RangeError: Maximum call stack size exceeded\`. Example 2 uses an explicit array as a stack (\`push\`/\`pop\`) instead.

## 5. Verified: Running the Code

Both examples were saved as \`main.js\` and run with \`node main.js\` (Node.js v22). Example 1 checks eight graphs: the square, a triangle, the two LeetCode 785 examples, a disconnected graph whose second component is a 5-cycle, an even cycle plus an isolated node, the empty graph and a self-loop — and prints both sides when the answer is true. The last line is the plain \`isBipartite\` on a path:

~~~text
square 0-1-2-3: true  A=[0, 2] B=[1, 3]
triangle: false
LeetCode example 1: false
LeetCode example 2: true  A=[0, 2] B=[1, 3]
edge 0-1 plus a 5-cycle 2..6: false
6-cycle plus isolated 6: true  A=[0, 2, 4, 6] B=[1, 3, 5]
empty graph: true  A=[] B=[]
self-loop on 0: false
true
~~~

Things to notice: the isolated node 6 lands on side A (it starts its own component and gets colour 0), the empty graph is bipartite (no edge breaks the rule), and the self-loop fails immediately because node 0 is its own neighbour with its own colour.

Example 2 generates 500 small random graphs (2 to 8 nodes, each pair joined with probability 30%) from a fixed-seed Park–Miller generator, so all four languages build the very same graphs. \`seed * 48271\` stays below \`2^53\`, so JavaScript numbers compute it exactly — with a larger multiplier you would need \`BigInt\` to match Java and C++. It runs BFS colouring, iterative DFS colouring and the union-find check on each graph:

~~~text
graphs tested: 500
bipartite: 355, not bipartite: 145
BFS, DFS and union-find agree on: 500
~~~

All three methods agree on all 500 graphs. About 70% of these small random graphs happen to be bipartite.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Try every split | O(2^n · E) | O(n) | \`2^n\` ways to assign sides, each checked against every edge |
| BFS colouring (head index) | O(V + E) | O(V) | Each node coloured and queued once; each adjacency entry looked at once |
| BFS with \`shift()\` | up to O(V² + E) | O(V) | Each \`shift()\` may move the rest of the queue |
| DFS colouring (explicit stack) | O(V + E) | O(V) | Same work with \`push\`/\`pop\` |
| Union-find | O((V + E) · α(V)) | O(V) | One \`find\` per adjacency entry; α is at most 4 in practice |

## Edge Cases

- **Disconnected graph** — the outer loop; the 5-cycle in the second component is found.
- **Isolated nodes** — coloured 0 on their own, never clash.
- **Empty graph** (\`[]\`) — \`true\` with two empty sides.
- **Self-loop** — \`v === u\`, same colour, so \`false\` at once.
- **Even cycles** are fine; **any** odd cycle anywhere makes it \`false\`.
- **Duplicate edges** — harmless: the neighbour already has the opposite colour.

## Common Pitfalls

- **Only running BFS from node 0** — misses odd cycles in other components.
- **\`new Array(n).fill([])\`** — one shared array, as the snippet shows.
- **Using \`0\` (or \`undefined\` checks with \`!color[v]\`) as "uncoloured"** — \`0\` is a real colour and is falsy, so \`if (!color[v])\` treats side-A nodes as unvisited.
- **\`for...in\` over a neighbour array** — yields string indices, not neighbours.
- **\`queue.shift()\` on big graphs** — may turn the BFS quadratic.
- **Recursive DFS on long paths** — \`RangeError\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">A graph is bipartite exactly when it can be 2-coloured, so I BFS from every uncoloured node, give each new neighbour <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 - color[u]</code>, and return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> if a neighbour already has the <strong style="color:#ffca28;">same</strong> colour as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is correct:</strong> <span style="color:#f0e2c8;">Inside a component the first colour forces every other one, so there is nothing to backtrack; a same-colour edge means an <strong style="color:#ffca28;">odd cycle</strong>, and a graph with an odd cycle can never be split.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">O(V + E) time — each node coloured once, each adjacency entry checked once — and O(V) extra space for the colour array and the queue.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Edge cases:</strong> <span style="color:#f0e2c8;">The outer loop over all nodes handles disconnected graphs; isolated nodes and the empty graph are bipartite; a self-loop is not.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The JavaScript detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new Array(n).fill(-1)</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-1</code> meaning uncoloured (never test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!color[v]</code>, since 0 is falsy), a head index instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shift()</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.from({ length: n }, () =&gt; [])</code> when I build adjacency lists, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fill([])</code> shares one array.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return an odd cycle as proof when the answer is no?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent</code> array during BFS. When the clashing edge <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u</code>–<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v</code> appears, walk both up the parent chain until they meet; the two paths plus the edge form a cycle, and since <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v</code> have the same colour they are at depths of the same parity, so the cycle is odd.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use DFS instead of BFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — each colour is forced by its edge, whatever the order, so the answer is the same. I would use an array as an explicit stack, because a recursive DFS can throw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code> on a long path.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does the union-find version work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For each node <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u</code>, all its neighbours belong on the same side, so union each neighbour with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">graph[u][0]</code>; if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find(u) === find(v)</code> for any neighbour <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v</code>, it is not bipartite. Example 2 checks it against BFS and DFS on 500 graphs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the graph comes as an edge list with 1-indexed nodes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Build <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.from({ length: n + 1 }, () =&gt; [])</code>, push both directions for every edge, and loop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">start</code> from 1 to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n</code>. The colouring itself does not change.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the random generator in example 2 not overflow in JavaScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Numbers are 64-bit floats with exact integers up to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2^53</code>. The seed stays below <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2^31</code> and the multiplier is 48271, so the product is below <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2^47</code> and exact; a bigger multiplier would need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code> to match Java and C++.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Bipartite graph** | Nodes split into two sets with every edge going between the sets |
| **2-colouring** | Two colours, different on the two ends of every edge |
| **Odd cycle** | A cycle with an odd number of edges; its presence means "not bipartite" |
| **Connected component** | A maximal group of nodes that can all reach each other |
| **Multi-component traversal** | Start a new BFS/DFS from every node that is still unvisited |

---
**Conclusion:** Checking whether a graph is bipartite is a 2-colouring traversal: colour a start node 0, give every uncoloured neighbour the opposite colour, and fail the moment an edge joins two nodes of the same colour — which happens exactly when the graph has an odd cycle. A loop over all nodes handles disconnected graphs, and the check is O(V + E) time and O(V) space, with the two sides as a by-product. In JavaScript, use a head-indexed queue, a \`-1\` sentinel compared with \`===\`, and \`Array.from\` rather than \`fill([])\` when you build adjacency lists. The same "visit, colour, propagate" pattern drives [cloning a graph](/interview-question/how-do-you-clone-a-graph), [counting islands](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid) and [detecting a cycle in a directed graph](/interview-question/how-do-you-detect-a-cycle-in-a-directed-graph).`,
        examples: [
          {
            label: "BFS 2-colouring on eight graphs, printing both sides when it succeeds",
            code: `// BFS 2-colouring. Returns the colour array, or null if an edge joins two equal colours.
function twoColor(graph) {
  const n = graph.length;
  const color = new Array(n).fill(-1);   // -1 = not coloured yet, 0 = side A, 1 = side B
  for (let start = 0; start < n; start++) {        // every component needs its own start
    if (color[start] !== -1) continue;
    color[start] = 0;
    const queue = [start];
    for (let head = 0; head < queue.length; head++) {
      const u = queue[head];
      for (const v of graph[u]) {
        if (color[v] === -1) {
          color[v] = 1 - color[u];                 // opposite side
          queue.push(v);
        } else if (color[v] === color[u]) {
          return null;                             // same side on both ends: odd cycle
        }
      }
    }
  }
  return color;
}

function isBipartite(graph) {
  return twoColor(graph) !== null;
}

function fmt(xs) {
  return '[' + xs.join(', ') + ']';
}

function report(name, graph) {
  const color = twoColor(graph);
  if (color === null) {
    console.log(name + ': false');
  } else {
    const a = [], b = [];
    color.forEach((c, i) => (c === 0 ? a : b).push(i));
    console.log(name + ': true  A=' + fmt(a) + ' B=' + fmt(b));
  }
}

report('square 0-1-2-3', [[1, 3], [0, 2], [1, 3], [0, 2]]);
report('triangle', [[1, 2], [0, 2], [0, 1]]);
report('LeetCode example 1', [[1, 2, 3], [0, 2], [0, 1, 3], [0, 2]]);
report('LeetCode example 2', [[1, 3], [0, 2], [1, 3], [0, 2]]);
report('edge 0-1 plus a 5-cycle 2..6', [[1], [0], [3, 6], [2, 4], [3, 5], [4, 6], [5, 2]]);
report('6-cycle plus isolated 6', [[1, 5], [0, 2], [1, 3], [2, 4], [3, 5], [4, 0], []]);
report('empty graph', []);
report('self-loop on 0', [[0, 1], [0]]);
console.log(String(isBipartite([[1], [0, 2], [1, 3], [2]]))); // true`,
          },
          {
            label: "BFS vs iterative DFS vs union-find agree on 500 random graphs",
            code: `let seed = 12345;
function rand() {                    // Park-Miller generator: products stay below 2^53, so exact
  seed = (seed * 48271) % 2147483647;
  return seed;
}

function bfsCheck(graph) {
  const color = new Array(graph.length).fill(-1);
  for (let s = 0; s < graph.length; s++) {
    if (color[s] !== -1) continue;
    color[s] = 0;
    const queue = [s];
    for (let head = 0; head < queue.length; head++) {
      const u = queue[head];
      for (const v of graph[u]) {
        if (color[v] === -1) { color[v] = 1 - color[u]; queue.push(v); }
        else if (color[v] === color[u]) return false;
      }
    }
  }
  return true;
}

function dfsCheck(graph) {           // iterative DFS: an explicit stack, no recursion
  const color = new Array(graph.length).fill(-1);
  for (let s = 0; s < graph.length; s++) {
    if (color[s] !== -1) continue;
    color[s] = 0;
    const stack = [s];
    while (stack.length > 0) {
      const u = stack.pop();
      for (const v of graph[u]) {
        if (color[v] === -1) { color[v] = 1 - color[u]; stack.push(v); }
        else if (color[v] === color[u]) return false;
      }
    }
  }
  return true;
}

function unionFindCheck(graph) {     // all neighbours of u must share one set, u another
  const parent = graph.map((_, i) => i);
  const find = (x) => {
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }  // path halving
    return x;
  };
  for (let u = 0; u < graph.length; u++) {
    for (const v of graph[u]) {
      if (find(u) === find(v)) return false;
      parent[find(v)] = find(graph[u][0]);
    }
  }
  return true;
}

let tested = 0, bipartite = 0, agree = 0;
for (let t = 0; t < 500; t++) {
  const n = 2 + (rand() % 7);        // 2..8 nodes
  const graph = Array.from({ length: n }, () => []);   // NOT new Array(n).fill([])
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      if (rand() % 100 < 30) { graph[a].push(b); graph[b].push(a); }
    }
  }
  const r1 = bfsCheck(graph), r2 = dfsCheck(graph), r3 = unionFindCheck(graph);
  tested++;
  if (r1) bipartite++;
  if (r1 === r2 && r2 === r3) agree++;
}
console.log('graphs tested: ' + tested);
console.log('bipartite: ' + bipartite + ', not bipartite: ' + (tested - bipartite));
console.log('BFS, DFS and union-find agree on: ' + agree);`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You are given an undirected graph as an adjacency list, \`int[][] graph\`, where \`graph[u]\` holds the nodes joined to \`u\`. Return whether the graph is bipartite: can you split the nodes into two groups so that every edge goes between the groups? The graph may be disconnected. Please write it in Java."

**What a strong answer should cover:**
- The reformulation: bipartite ⇔ the graph can be **2-coloured** ⇔ it has **no odd cycle**.
- BFS (or DFS) colouring: give each uncoloured neighbour the opposite colour; a neighbour with the **same** colour means \`false\`.
- An outer loop over every node so each **connected component** gets its own traversal.
- O(V + E) time and O(V) extra space, plus the free result: the colour array *is* the two sides.
- Java specifics: \`new int[n]\` is zero-filled, so you must \`Arrays.fill(color, -1)\` or 0 means both "side A" and "unvisited"; \`ArrayDeque<Integer>\` boxes each index; recursive DFS can throw \`StackOverflowError\` on long paths.

**Clarifying questions expected:**
- Can the graph be disconnected or contain self-loops?
- Do you need only the boolean, or the two groups too?

**Code / implementation expected:** Yes — a \`static boolean isBipartite(int[][] graph)\` in Java with an \`int[]\` colour array and BFS, tested on a bipartite graph, a triangle and a disconnected graph.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know Java arrays, loops and basic collections; graphs and colouring are explained from scratch.
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by actually compiling and running the code with \`javac\` and \`java\` (OpenJDK 21); nothing is typed in by hand.

## 1. Why This Even Matters — A Story First

A teacher wants to split a class into **two teams** for a quiz. There is one rule: some pairs of students are rivals, and rivals must be on **different** teams. Can it be done?

Try it with four students in a ring of rivalries: Ana–Ben, Ben–Cy, Cy–Dee, Dee–Ana. Put Ana on Red. Then Ben must be Blue, so Cy must be Red, so Dee must be Blue — and Dee–Ana is Blue–Red, fine. It works.

Now three students who are all rivals: Ana–Ben, Ben–Cy, Cy–Ana. Ana is Red, Ben is Blue, Cy must differ from Ben so Cy is Red — but Cy and Ana are rivals and both Red. **No split exists.** You did not have to try every split to know that: one forced choice after another led straight to a contradiction.

That is the whole algorithm. A graph that can be split this way is called **bipartite**, and checking it is a plain graph traversal where each step is forced: once you choose a colour for one student, everybody connected to them has no choice left. The same question appears in real life as "can these jobs run on two machines without conflicts?", "can this map of rival teams be scheduled into two time slots?", and inside harder algorithms such as bipartite matching.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How is the graph given — adjacency list or edge list? 0- or 1-indexed? | Decides how you build or index it; 1-indexed edge lists need \`n + 1\` slots. |
| Is it undirected? | Bipartite is defined on undirected edges. The LeetCode version (785) gives symmetric adjacency lists: if \`v\` is in \`graph[u]\`, \`u\` is in \`graph[v]\`. |
| Can the graph be disconnected? | Yes, usually. Then one traversal from node 0 is not enough — you must start a new one from every uncoloured node. |
| Can there be self-loops? | A node joined to itself can never get a colour different from its own, so the answer is immediately \`false\`. |
| Do you want just true/false, or the two sides (or an odd cycle as proof)? | The colouring gives you the two sides for free; reporting the odd cycle needs parent pointers. |
| How big can it get? | A recursive DFS can overflow the call stack on long paths; BFS or an explicit stack is safer. |

## 3. The Core Idea: Two-Colour It, and Watch for a Clash

📌 **Interview term: Bipartite graph** — a graph whose nodes can be split into two sets A and B so that **every edge goes between A and B**, never inside A or inside B.

📌 **Interview term: 2-colouring** — giving each node one of two colours so that the two ends of every edge have different colours. A graph is bipartite exactly when it has a 2-colouring; the two colour classes are the sets A and B.

📌 **Interview term: Odd cycle** — a cycle with an odd number of edges, like a triangle (3) or a pentagon (5). Around an odd cycle the colours would have to alternate an odd number of times and come back to the start with the wrong colour. The classic theorem: **a graph is bipartite if and only if it has no odd cycle.** The colour clash your traversal finds is exactly how an odd cycle shows itself.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 250" role="img" aria-label="The 4-cycle 0 1 2 3 drawn as two columns. Side A holds 0 and 2, side B holds 1 and 3, and all four edges cross between the columns">
  <text class="d-text" x="200" y="28" text-anchor="middle">Side A (colour 0)</text>
  <text class="d-text d-accent" x="480" y="28" text-anchor="middle">Side B (colour 1)</text>
  <line class="d-edge" x1="226" y1="80" x2="454" y2="80"/>
  <line class="d-edge" x1="226" y1="80" x2="454" y2="190"/>
  <line class="d-edge" x1="226" y1="190" x2="454" y2="80"/>
  <line class="d-edge" x1="226" y1="190" x2="454" y2="190"/>
  <circle class="d-box-muted" cx="200" cy="80" r="26"/>
  <text class="d-text" x="200" y="86" text-anchor="middle">0</text>
  <circle class="d-box-muted" cx="200" cy="190" r="26"/>
  <text class="d-text" x="200" y="196" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="480" cy="80" r="26"/>
  <text class="d-text d-accent" x="480" y="86" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="480" cy="190" r="26"/>
  <text class="d-text d-accent" x="480" y="196" text-anchor="middle">3</text>
</svg>

The square 0–1–2–3–0 redrawn as two columns: the edges 0–1, 1–2, 2–3 and 3–0 all cross from one side to the other, so it is bipartite with A = {0, 2} and B = {1, 3} — exactly what example 1 prints.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 270" role="img" aria-label="A triangle 0 1 2. Node 0 gets colour A, node 1 gets colour B, node 2 is forced to A by node 1, and then the edge from 2 to 0 joins two A nodes, which is the clash">
  <line class="d-edge" x1="340" y1="70" x2="200" y2="210"/>
  <line class="d-edge" x1="200" y1="210" x2="480" y2="210"/>
  <line class="d-edge-dashed" x1="480" y1="210" x2="340" y2="70"/>
  <circle class="d-box-muted" cx="340" cy="70" r="26"/>
  <text class="d-text" x="340" y="76" text-anchor="middle">0 A</text>
  <circle class="d-box-accent" cx="200" cy="210" r="26"/>
  <text class="d-text d-accent" x="200" y="216" text-anchor="middle">1 B</text>
  <circle class="d-box-muted" cx="480" cy="210" r="26"/>
  <text class="d-text" x="480" y="216" text-anchor="middle">2 A</text>
  <text class="d-sub" x="560" y="130" text-anchor="middle">A next to A</text>
  <text class="d-sub" x="120" y="130" text-anchor="middle">forced</text>
</svg>

In the triangle, 0 is coloured A, which forces 1 to B, which forces 2 to A — and the dashed edge 2–0 now joins two A nodes. Three edges is an odd cycle, so no choice of starting colour could have avoided the clash.

### The algorithm

1. Make a \`color\` array of size \`n\`, filled with **-1** meaning "not coloured yet".
2. For every node \`start\` that is still -1 (this loop is what handles disconnected graphs): colour it 0 and run a BFS from it.
3. When you take node \`u\` off the queue, look at each neighbour \`v\`:
   - if \`v\` is uncoloured, give it the **opposite** colour \`1 - color[u]\` and queue it;
   - if \`v\` already has the **same** colour as \`u\`, stop and return **false**;
   - if \`v\` has the opposite colour, it is fine — do nothing.
4. If every BFS finishes without a clash, return **true**. The \`color\` array is the two sides.

📌 **Interview term: Connected component** — a group of nodes that can all reach each other. Each component is coloured independently, so the graph is bipartite only if **every** component is. Counting components with the same outer loop is its own page: [How do you count connected components in an undirected graph?](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph)

Why is the first colour choice in each component free? Because swapping the two colours of a whole component gives another valid colouring — so if colouring \`start\` with 0 leads to a clash, colouring it with 1 would lead to the mirror-image clash. There is never a reason to backtrack.

BFS is not special here: a DFS (recursive or with an explicit stack) gives the same answer, because each colour is forced by the edge it came through, in any order. A third route is **Union-Find**: all neighbours of \`u\` must end up on the same side, so union them together, and if \`u\` ever lands in the same set as one of its neighbours, the graph is not bipartite. Example 2 runs all three on 500 random graphs and checks they agree. For the general trade-offs see [What is the difference between BFS and DFS?](/interview-question/what-is-the-difference-between-bfs-and-dfs) and [What is the Union-Find (Disjoint Set) data structure?](/interview-question/what-is-the-union-find-disjoint-set-data-structure)


## 4. Brute Force First, Then the Java Code

The **brute force** is to try every way of splitting the nodes into two groups — \`2^n\` splits — and check every edge for each one: O(2^n · E). With 30 nodes that is over a billion splits. The colouring idea removes the guessing: inside a component, the first colour decides every other colour, so one traversal is enough.

~~~java
// BFS 2-colouring. Returns the colour array, or null if an edge joins two equal colours.
static int[] twoColor(int[][] graph) {
    int n = graph.length;
    int[] color = new int[n];
    Arrays.fill(color, -1);             // -1 = not coloured yet, 0 = side A, 1 = side B
    ArrayDeque<Integer> queue = new ArrayDeque<>();
    for (int start = 0; start < n; start++) {      // every component needs its own start
        if (color[start] != -1) continue;
        color[start] = 0;
        queue.offer(start);
        while (!queue.isEmpty()) {
            int u = queue.poll();                  // auto-unboxing Integer -> int
            for (int v : graph[u]) {
                if (color[v] == -1) {
                    color[v] = 1 - color[u];       // opposite side
                    queue.offer(v);
                } else if (color[v] == color[u]) {
                    return null;                   // same side on both ends: odd cycle
                }
            }
        }
    }
    return color;
}

static boolean isBipartite(int[][] graph) {
    return twoColor(graph) != null;
}
~~~

Line by line, with the Java parts that matter:

- **\`new int[n]\` then \`Arrays.fill(color, -1)\`.** Java initialises every \`int\` array element to 0. If you skip the fill, 0 means both "side A" and "not visited", and the algorithm quietly does nothing — the snippet below proves it calls a triangle bipartite.
- **\`ArrayDeque<Integer>\`** — collections hold objects, so each \`int\` is **boxed** into an \`Integer\` on \`offer\` and unboxed on \`poll\`. That is fine at interview scale; for millions of nodes an \`int[]\` used as a circular queue avoids the allocations. \`ArrayDeque\` is the recommended queue — its Javadoc calls it "likely to be faster than \`LinkedList\` when used as a queue" ([ArrayDeque Javadoc](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/ArrayDeque.html)).
- **\`int u = queue.poll();\`** — \`poll\` returns \`null\` on an empty queue, and unboxing \`null\` throws \`NullPointerException\`; the \`while (!queue.isEmpty())\` guard prevents that.
- **One queue reused across components** — it is always empty when a component finishes, so there is no need to allocate a new one.
- **Comparing \`color[v] == color[u]\`** compares primitive \`int\`s, so \`==\` is exact. If you stored colours in a \`List<Integer>\` or \`Map<Integer, Integer>\` you would be comparing \`Integer\` objects, where \`==\` checks identity — it happens to work for small cached values like 0 and 1, which makes it a bug that hides.

📌 **Interview term: Multi-component traversal** — the pattern "for every node, if it is not visited yet, start a new traversal from it". It visits every node exactly once overall, so the total is still O(V + E).

The zero-fill trap, checked by running it:

~~~java
import java.util.*;

public class Main {
    static boolean check(int[][] graph, boolean fillFirst) {
        int[] color = new int[graph.length];       // Java zero-fills: every entry starts as 0
        if (fillFirst) Arrays.fill(color, -1);     // -1 = not coloured yet
        ArrayDeque<Integer> queue = new ArrayDeque<>();
        for (int s = 0; s < graph.length; s++) {
            if (color[s] != -1) continue;          // without the fill, every node is "already coloured"
            color[s] = 0;
            queue.offer(s);
            while (!queue.isEmpty()) {
                int u = queue.poll();
                for (int v : graph[u]) {
                    if (color[v] == -1) { color[v] = 1 - color[u]; queue.offer(v); }
                    else if (color[v] == color[u]) return false;
                }
            }
        }
        return true;
    }

    public static void main(String[] args) {
        int[][] square = {{1, 3}, {0, 2}, {1, 3}, {0, 2}};
        int[][] triangle = {{1, 2}, {0, 2}, {0, 1}};
        System.out.println("forgot Arrays.fill: square=" + check(square, false) + " triangle=" + check(triangle, false));
        System.out.println("with Arrays.fill:   square=" + check(square, true) + " triangle=" + check(triangle, true));
    }
}
~~~

~~~text
forgot Arrays.fill: square=true triangle=true
with Arrays.fill:   square=true triangle=false
~~~

Without the fill, \`color[s] != -1\` is true for every node, so no traversal starts and the method returns \`true\` for the triangle.

A recursive DFS colouring is also correct, but each node on the current path is a stack frame, and on long paths the default thread stack overflows with \`StackOverflowError\`. Example 2 uses \`ArrayDeque\` as an explicit stack (\`push\`/\`pop\`) instead.

## 5. Verified: Running the Code

Both examples were saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21). Example 1 checks eight graphs: the square, a triangle, the two LeetCode 785 examples, a disconnected graph whose second component is a 5-cycle, an even cycle plus an isolated node, the empty graph and a self-loop — and prints both sides when the answer is true (\`List.toString()\` prints the \`[0, 2]\` format). The last line is the plain \`isBipartite\` on a path:

~~~text
square 0-1-2-3: true  A=[0, 2] B=[1, 3]
triangle: false
LeetCode example 1: false
LeetCode example 2: true  A=[0, 2] B=[1, 3]
edge 0-1 plus a 5-cycle 2..6: false
6-cycle plus isolated 6: true  A=[0, 2, 4, 6] B=[1, 3, 5]
empty graph: true  A=[] B=[]
self-loop on 0: false
true
~~~

Things to notice: the isolated node 6 lands on side A (it starts its own component and gets colour 0), the empty graph is bipartite (no edge breaks the rule), and the self-loop fails immediately because node 0 is its own neighbour with its own colour.

Example 2 generates 500 small random graphs (2 to 8 nodes, each pair joined with probability 30%) from a fixed-seed Park–Miller generator, so all four languages build the very same graphs. The seed is a \`long\`: \`seed * 48271\` can reach about \`10^14\`, far beyond \`Integer.MAX_VALUE\`, and an \`int\` multiply would silently wrap around. It runs BFS colouring, iterative DFS colouring and the union-find check on each graph:

~~~text
graphs tested: 500
bipartite: 355, not bipartite: 145
BFS, DFS and union-find agree on: 500
~~~

All three methods agree on all 500 graphs. About 70% of these small random graphs happen to be bipartite.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Try every split | O(2^n · E) | O(n) | \`2^n\` ways to assign sides, each checked against every edge |
| BFS colouring | O(V + E) | O(V) | Each node coloured and queued once; each adjacency entry looked at once |
| DFS colouring (explicit stack) | O(V + E) | O(V) | Same work with \`ArrayDeque.push\`/\`pop\` |
| Union-find | O((V + E) · α(V)) | O(V) | One \`find\` per adjacency entry; α is at most 4 in practice |

## Edge Cases

- **Disconnected graph** — the outer loop; the 5-cycle in the second component is found.
- **Isolated nodes** — coloured 0 on their own (\`graph[6]\` is an empty \`int[]\`), never clash.
- **Empty graph** (\`new int[0][]\`) — \`true\` with two empty sides.
- **Self-loop** — \`v == u\`, same colour, so \`false\` at once.
- **Even cycles** are fine; **any** odd cycle anywhere makes it \`false\`.
- **Duplicate edges** — harmless: the neighbour already has the opposite colour.

## Common Pitfalls

- **Forgetting \`Arrays.fill(color, -1)\`** — zero-filled arrays make every node look visited; the snippet returns \`true\` for a triangle.
- **Only running BFS from node 0** — misses odd cycles in other components.
- **Storing colours as \`Integer\` and comparing with \`==\`** — identity comparison that only works by accident for cached small values.
- **\`int u = queue.poll()\` on a possibly empty queue** — unboxing \`null\` throws \`NullPointerException\`.
- **\`int\` overflow in helper arithmetic** (like the random generator) — use \`long\`.
- **Recursive DFS on long paths** — \`StackOverflowError\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">A graph is bipartite exactly when it can be 2-coloured, so I BFS from every uncoloured node, give each new neighbour <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 - color[u]</code>, and return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> if a neighbour already has the <strong style="color:#ffca28;">same</strong> colour as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is correct:</strong> <span style="color:#f0e2c8;">Inside a component the first colour forces every other one, so there is nothing to backtrack; a same-colour edge means an <strong style="color:#ffca28;">odd cycle</strong>, and a graph with an odd cycle can never be split.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">O(V + E) time — each node coloured once, each adjacency entry checked once — and O(V) extra space for the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> colours and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Edge cases:</strong> <span style="color:#f0e2c8;">The outer loop over all nodes handles disconnected graphs; isolated nodes and the empty graph are bipartite; a self-loop is not.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The Java detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new int[n]</code> is zero-filled, so I call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.fill(color, -1)</code> first — otherwise 0 means both side A and unvisited. Colours stay primitive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>s so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> is safe, and I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> with BFS so long paths cannot overflow the stack.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return an odd cycle as proof when the answer is no?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[] parent</code> during BFS. When the clashing edge <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u</code>–<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v</code> appears, walk both up the parent chain until they meet; the two paths plus the edge form a cycle, and since <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v</code> have the same colour they are at depths of the same parity, so the cycle is odd.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use DFS instead of BFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, each colour is forced by its edge in any order, so the answer is the same. I would use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> as an explicit stack; a recursive DFS risks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code> with the default thread stack.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does the union-find version work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For each node <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u</code>, all its neighbours belong on the same side, so union each neighbour with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">graph[u][0]</code>; if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find(u) == find(v)</code> for any neighbour, it is not bipartite. With path compression it is O((V + E)·α(V)).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not store colours in a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">HashMap&lt;Integer, Integer&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It works but boxes every key and value, costs more memory and time than an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code>, and tempts you into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">map.get(u) == map.get(v)</code>, an identity comparison on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code> objects. Node ids are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0..n-1</code>, so an array is the natural fit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the graph comes as an edge list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Build a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">List&lt;List&lt;Integer&gt;&gt;</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n</code> empty lists, add both directions for each edge, then run the same BFS. With 1-indexed nodes I allocate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n + 1</code> lists.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Bipartite graph** | Nodes split into two sets with every edge going between the sets |
| **2-colouring** | Two colours, different on the two ends of every edge |
| **Odd cycle** | A cycle with an odd number of edges; its presence means "not bipartite" |
| **Connected component** | A maximal group of nodes that can all reach each other |
| **Multi-component traversal** | Start a new BFS/DFS from every node that is still unvisited |

---
**Conclusion:** Checking whether a graph is bipartite is a 2-colouring traversal: colour a start node 0, give every uncoloured neighbour the opposite colour, and fail the moment an edge joins two nodes of the same colour — which happens exactly when the graph has an odd cycle. A loop over all nodes handles disconnected graphs, and the check is O(V + E) time and O(V) space, with the two sides as a by-product. In Java, remember that \`int\` arrays start at 0 (fill with -1), that \`ArrayDeque<Integer>\` boxes, and that \`Integer\` objects should not be compared with \`==\`. The same "visit, colour, propagate" pattern drives [cloning a graph](/interview-question/how-do-you-clone-a-graph), [counting islands](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid) and [detecting a cycle in a directed graph](/interview-question/how-do-you-detect-a-cycle-in-a-directed-graph).`,
        examples: [
          {
            label: "BFS 2-colouring on eight graphs, printing both sides when it succeeds",
            code: `import java.util.*;

public class Main {
    // BFS 2-colouring. Returns the colour array, or null if an edge joins two equal colours.
    static int[] twoColor(int[][] graph) {
        int n = graph.length;
        int[] color = new int[n];
        Arrays.fill(color, -1);             // -1 = not coloured yet, 0 = side A, 1 = side B
        ArrayDeque<Integer> queue = new ArrayDeque<>();
        for (int start = 0; start < n; start++) {      // every component needs its own start
            if (color[start] != -1) continue;
            color[start] = 0;
            queue.offer(start);
            while (!queue.isEmpty()) {
                int u = queue.poll();                  // auto-unboxing Integer -> int
                for (int v : graph[u]) {
                    if (color[v] == -1) {
                        color[v] = 1 - color[u];       // opposite side
                        queue.offer(v);
                    } else if (color[v] == color[u]) {
                        return null;                   // same side on both ends: odd cycle
                    }
                }
            }
        }
        return color;
    }

    static boolean isBipartite(int[][] graph) {
        return twoColor(graph) != null;
    }

    static void report(String name, int[][] graph) {
        int[] color = twoColor(graph);
        if (color == null) {
            System.out.println(name + ": false");
            return;
        }
        List<Integer> a = new ArrayList<>(), b = new ArrayList<>();
        for (int i = 0; i < color.length; i++) (color[i] == 0 ? a : b).add(i);
        System.out.println(name + ": true  A=" + a + " B=" + b);   // List.toString is [x, y]
    }

    public static void main(String[] args) {
        report("square 0-1-2-3", new int[][]{{1, 3}, {0, 2}, {1, 3}, {0, 2}});
        report("triangle", new int[][]{{1, 2}, {0, 2}, {0, 1}});
        report("LeetCode example 1", new int[][]{{1, 2, 3}, {0, 2}, {0, 1, 3}, {0, 2}});
        report("LeetCode example 2", new int[][]{{1, 3}, {0, 2}, {1, 3}, {0, 2}});
        report("edge 0-1 plus a 5-cycle 2..6", new int[][]{{1}, {0}, {3, 6}, {2, 4}, {3, 5}, {4, 6}, {5, 2}});
        report("6-cycle plus isolated 6", new int[][]{{1, 5}, {0, 2}, {1, 3}, {2, 4}, {3, 5}, {4, 0}, {}});
        report("empty graph", new int[][]{});
        report("self-loop on 0", new int[][]{{0, 1}, {0}});
        System.out.println(isBipartite(new int[][]{{1}, {0, 2}, {1, 3}, {2}}));  // true
    }
}`,
          },
          {
            label: "BFS vs iterative DFS vs union-find agree on 500 random graphs",
            code: `import java.util.*;

public class Main {
    static long seed = 12345;

    static int rand() {              // Park-Miller generator; long avoids int overflow
        seed = seed * 48271 % 2147483647L;
        return (int) seed;
    }

    static boolean bfsCheck(List<List<Integer>> graph) {
        int[] color = new int[graph.size()];
        Arrays.fill(color, -1);
        for (int s = 0; s < graph.size(); s++) {
            if (color[s] != -1) continue;
            color[s] = 0;
            ArrayDeque<Integer> queue = new ArrayDeque<>(List.of(s));
            while (!queue.isEmpty()) {
                int u = queue.poll();
                for (int v : graph.get(u)) {
                    if (color[v] == -1) { color[v] = 1 - color[u]; queue.offer(v); }
                    else if (color[v] == color[u]) return false;
                }
            }
        }
        return true;
    }

    static boolean dfsCheck(List<List<Integer>> graph) {   // explicit stack, no recursion
        int[] color = new int[graph.size()];
        Arrays.fill(color, -1);
        for (int s = 0; s < graph.size(); s++) {
            if (color[s] != -1) continue;
            color[s] = 0;
            ArrayDeque<Integer> stack = new ArrayDeque<>(List.of(s));
            while (!stack.isEmpty()) {
                int u = stack.pop();
                for (int v : graph.get(u)) {
                    if (color[v] == -1) { color[v] = 1 - color[u]; stack.push(v); }
                    else if (color[v] == color[u]) return false;
                }
            }
        }
        return true;
    }

    static int[] parent;

    static int find(int x) {
        while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }   // path halving
        return x;
    }

    static boolean unionFindCheck(List<List<Integer>> graph) {
        parent = new int[graph.size()];
        for (int i = 0; i < parent.length; i++) parent[i] = i;
        for (int u = 0; u < graph.size(); u++) {
            for (int v : graph.get(u)) {
                if (find(u) == find(v)) return false;
                parent[find(v)] = find(graph.get(u).get(0));
            }
        }
        return true;
    }

    public static void main(String[] args) {
        int tested = 0, bipartite = 0, agree = 0;
        for (int t = 0; t < 500; t++) {
            int n = 2 + rand() % 7;                    // 2..8 nodes
            List<List<Integer>> graph = new ArrayList<>();
            for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
            for (int a = 0; a < n; a++)
                for (int b = a + 1; b < n; b++)
                    if (rand() % 100 < 30) { graph.get(a).add(b); graph.get(b).add(a); }
            boolean r1 = bfsCheck(graph), r2 = dfsCheck(graph), r3 = unionFindCheck(graph);
            tested++;
            if (r1) bipartite++;
            if (r1 == r2 && r2 == r3) agree++;
        }
        System.out.println("graphs tested: " + tested);
        System.out.println("bipartite: " + bipartite + ", not bipartite: " + (tested - bipartite));
        System.out.println("BFS, DFS and union-find agree on: " + agree);
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You are given an undirected graph as an adjacency list, \`vector<vector<int>> graph\`, where \`graph[u]\` holds the nodes joined to \`u\`. Return whether the graph is bipartite: can you split the nodes into two groups so that every edge goes between the groups? The graph may be disconnected. Please write it in C++."

**What a strong answer should cover:**
- The reformulation: bipartite ⇔ the graph can be **2-coloured** ⇔ it has **no odd cycle**.
- BFS (or DFS) colouring: give each uncoloured neighbour the opposite colour; a neighbour with the **same** colour means \`false\`.
- An outer loop over every node so each **connected component** gets its own traversal.
- O(V + E) time and O(V) extra space, plus the free result: the colour vector *is* the two sides.
- C++ specifics: \`vector<int> color(n, -1)\`, passing the graph by \`const&\` (not by value), \`std::queue\` with \`front()\` then \`pop()\`, \`std::optional\` to return "no colouring", and bounds — \`operator[]\` does not check indices, so 1-indexed input needs \`n + 1\` slots.

**Clarifying questions expected:**
- Can the graph be disconnected or contain self-loops?
- Are node ids 0-based, and do you need the two groups too?

**Code / implementation expected:** Yes — a \`bool isBipartite(const vector<vector<int>>& graph)\` in C++17 with BFS colouring, tested on a bipartite graph, a triangle and a disconnected graph.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know basic C++ (\`vector\`, loops, functions); graphs and colouring are explained from scratch.
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by actually compiling and running the code with \`g++ -std=c++17\` (GCC 13); nothing is typed in by hand.

## 1. Why This Even Matters — A Story First

A teacher wants to split a class into **two teams** for a quiz. There is one rule: some pairs of students are rivals, and rivals must be on **different** teams. Can it be done?

Try it with four students in a ring of rivalries: Ana–Ben, Ben–Cy, Cy–Dee, Dee–Ana. Put Ana on Red. Then Ben must be Blue, so Cy must be Red, so Dee must be Blue — and Dee–Ana is Blue–Red, fine. It works.

Now three students who are all rivals: Ana–Ben, Ben–Cy, Cy–Ana. Ana is Red, Ben is Blue, Cy must differ from Ben so Cy is Red — but Cy and Ana are rivals and both Red. **No split exists.** You did not have to try every split to know that: one forced choice after another led straight to a contradiction.

That is the whole algorithm. A graph that can be split this way is called **bipartite**, and checking it is a plain graph traversal where each step is forced: once you choose a colour for one student, everybody connected to them has no choice left. The same question appears in real life as "can these jobs run on two machines without conflicts?", "can this map of rival teams be scheduled into two time slots?", and inside harder algorithms such as bipartite matching.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How is the graph given — adjacency list or edge list? 0- or 1-indexed? | Decides how you build or index it; 1-indexed edge lists need \`n + 1\` slots. |
| Is it undirected? | Bipartite is defined on undirected edges. The LeetCode version (785) gives symmetric adjacency lists: if \`v\` is in \`graph[u]\`, \`u\` is in \`graph[v]\`. |
| Can the graph be disconnected? | Yes, usually. Then one traversal from node 0 is not enough — you must start a new one from every uncoloured node. |
| Can there be self-loops? | A node joined to itself can never get a colour different from its own, so the answer is immediately \`false\`. |
| Do you want just true/false, or the two sides (or an odd cycle as proof)? | The colouring gives you the two sides for free; reporting the odd cycle needs parent pointers. |
| How big can it get? | A recursive DFS can overflow the call stack on long paths; BFS or an explicit stack is safer. |

## 3. The Core Idea: Two-Colour It, and Watch for a Clash

📌 **Interview term: Bipartite graph** — a graph whose nodes can be split into two sets A and B so that **every edge goes between A and B**, never inside A or inside B.

📌 **Interview term: 2-colouring** — giving each node one of two colours so that the two ends of every edge have different colours. A graph is bipartite exactly when it has a 2-colouring; the two colour classes are the sets A and B.

📌 **Interview term: Odd cycle** — a cycle with an odd number of edges, like a triangle (3) or a pentagon (5). Around an odd cycle the colours would have to alternate an odd number of times and come back to the start with the wrong colour. The classic theorem: **a graph is bipartite if and only if it has no odd cycle.** The colour clash your traversal finds is exactly how an odd cycle shows itself.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 250" role="img" aria-label="The 4-cycle 0 1 2 3 drawn as two columns. Side A holds 0 and 2, side B holds 1 and 3, and all four edges cross between the columns">
  <text class="d-text" x="200" y="28" text-anchor="middle">Side A (colour 0)</text>
  <text class="d-text d-accent" x="480" y="28" text-anchor="middle">Side B (colour 1)</text>
  <line class="d-edge" x1="226" y1="80" x2="454" y2="80"/>
  <line class="d-edge" x1="226" y1="80" x2="454" y2="190"/>
  <line class="d-edge" x1="226" y1="190" x2="454" y2="80"/>
  <line class="d-edge" x1="226" y1="190" x2="454" y2="190"/>
  <circle class="d-box-muted" cx="200" cy="80" r="26"/>
  <text class="d-text" x="200" y="86" text-anchor="middle">0</text>
  <circle class="d-box-muted" cx="200" cy="190" r="26"/>
  <text class="d-text" x="200" y="196" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="480" cy="80" r="26"/>
  <text class="d-text d-accent" x="480" y="86" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="480" cy="190" r="26"/>
  <text class="d-text d-accent" x="480" y="196" text-anchor="middle">3</text>
</svg>

The square 0–1–2–3–0 redrawn as two columns: the edges 0–1, 1–2, 2–3 and 3–0 all cross from one side to the other, so it is bipartite with A = {0, 2} and B = {1, 3} — exactly what example 1 prints.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 270" role="img" aria-label="A triangle 0 1 2. Node 0 gets colour A, node 1 gets colour B, node 2 is forced to A by node 1, and then the edge from 2 to 0 joins two A nodes, which is the clash">
  <line class="d-edge" x1="340" y1="70" x2="200" y2="210"/>
  <line class="d-edge" x1="200" y1="210" x2="480" y2="210"/>
  <line class="d-edge-dashed" x1="480" y1="210" x2="340" y2="70"/>
  <circle class="d-box-muted" cx="340" cy="70" r="26"/>
  <text class="d-text" x="340" y="76" text-anchor="middle">0 A</text>
  <circle class="d-box-accent" cx="200" cy="210" r="26"/>
  <text class="d-text d-accent" x="200" y="216" text-anchor="middle">1 B</text>
  <circle class="d-box-muted" cx="480" cy="210" r="26"/>
  <text class="d-text" x="480" y="216" text-anchor="middle">2 A</text>
  <text class="d-sub" x="560" y="130" text-anchor="middle">A next to A</text>
  <text class="d-sub" x="120" y="130" text-anchor="middle">forced</text>
</svg>

In the triangle, 0 is coloured A, which forces 1 to B, which forces 2 to A — and the dashed edge 2–0 now joins two A nodes. Three edges is an odd cycle, so no choice of starting colour could have avoided the clash.

### The algorithm

1. Make a \`color\` array of size \`n\`, filled with **-1** meaning "not coloured yet".
2. For every node \`start\` that is still -1 (this loop is what handles disconnected graphs): colour it 0 and run a BFS from it.
3. When you take node \`u\` off the queue, look at each neighbour \`v\`:
   - if \`v\` is uncoloured, give it the **opposite** colour \`1 - color[u]\` and queue it;
   - if \`v\` already has the **same** colour as \`u\`, stop and return **false**;
   - if \`v\` has the opposite colour, it is fine — do nothing.
4. If every BFS finishes without a clash, return **true**. The \`color\` array is the two sides.

📌 **Interview term: Connected component** — a group of nodes that can all reach each other. Each component is coloured independently, so the graph is bipartite only if **every** component is. Counting components with the same outer loop is its own page: [How do you count connected components in an undirected graph?](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph)

Why is the first colour choice in each component free? Because swapping the two colours of a whole component gives another valid colouring — so if colouring \`start\` with 0 leads to a clash, colouring it with 1 would lead to the mirror-image clash. There is never a reason to backtrack.

BFS is not special here: a DFS (recursive or with an explicit stack) gives the same answer, because each colour is forced by the edge it came through, in any order. A third route is **Union-Find**: all neighbours of \`u\` must end up on the same side, so union them together, and if \`u\` ever lands in the same set as one of its neighbours, the graph is not bipartite. Example 2 runs all three on 500 random graphs and checks they agree. For the general trade-offs see [What is the difference between BFS and DFS?](/interview-question/what-is-the-difference-between-bfs-and-dfs) and [What is the Union-Find (Disjoint Set) data structure?](/interview-question/what-is-the-union-find-disjoint-set-data-structure)


## 4. Brute Force First, Then the C++ Code

The **brute force** is to try every way of splitting the nodes into two groups — \`2^n\` splits, for example by looping over a bitmask — and check every edge for each one: O(2^n · E). With 30 nodes that is over a billion splits. The colouring idea removes the guessing: inside a component, the first colour decides every other colour, so one traversal is enough.

~~~cpp
// BFS 2-colouring. Returns the colours, or nullopt if an edge joins two equal colours.
optional<vector<int>> twoColor(const vector<vector<int>>& graph) {
    int n = graph.size();
    vector<int> color(n, -1);              // -1 = not coloured yet, 0 = side A, 1 = side B
    queue<int> q;
    for (int start = 0; start < n; start++) {      // every component needs its own start
        if (color[start] != -1) continue;
        color[start] = 0;
        q.push(start);
        while (!q.empty()) {
            int u = q.front(); q.pop();
            for (int v : graph[u]) {
                if (color[v] == -1) {
                    color[v] = 1 - color[u];       // opposite side
                    q.push(v);
                } else if (color[v] == color[u]) {
                    return nullopt;                // same side on both ends: odd cycle
                }
            }
        }
    }
    return color;
}

bool isBipartite(const vector<vector<int>>& graph) { return twoColor(graph).has_value(); }
~~~

Line by line, with the C++ parts that matter:

- **\`const vector<vector<int>>& graph\`** — pass by const reference. Passing by value would copy every adjacency list on each call: O(V + E) extra work and memory before the algorithm even starts.
- **\`vector<int> color(n, -1)\`** — the two-argument constructor fills every slot with -1. \`vector<int> color(n)\` would fill with 0, which is also "side A" — the same bug Java has with zero-filled arrays.
- **\`int n = graph.size();\`** — \`size()\` returns an unsigned \`size_t\`. Converting once to \`int\` avoids signed/unsigned comparison warnings and, more importantly, the classic underflow where \`graph.size() - 1\` on an empty vector becomes a huge number.
- **\`q.front(); q.pop();\`** — \`pop()\` returns \`void\`; \`std::queue\` is an adaptor over \`std::deque\` by default ([cppreference: std::queue](https://en.cppreference.com/w/cpp/container/queue)).
- **\`optional<vector<int>>\`** — C++17's way to return "a colouring, or nothing". \`has_value()\` gives the boolean; \`*color\` gives the sides.
- **\`1 - color[u]\`** flips 0 ↔ 1; colour **when you enqueue**, so a node is never queued twice.

📌 **Interview term: Multi-component traversal** — the pattern "for every node, if it is not visited yet, start a new traversal from it". It visits every node exactly once overall, so the total is still O(V + E).

The bounds trap when you build the graph from a 1-indexed edge list, checked by running it. \`.at()\` throws on a bad index; plain \`[]\` would not — writing past the end is undefined behaviour that may appear to work:

~~~cpp
#include <iostream>
#include <stdexcept>
#include <vector>
using namespace std;

int main() {
    int n = 3;                                    // nodes are 1..3 in the input
    vector<pair<int, int>> edges = {{1, 2}, {2, 3}};
    vector<vector<int>> graph(n);                 // indices 0..2 only
    try {
        for (auto [a, b] : edges) {
            graph.at(a).push_back(b);             // .at() checks the index
            graph.at(b).push_back(a);
        }
    } catch (const out_of_range&) {
        cout << "out_of_range: node 3 does not fit in a vector of size " << n << "\\n";
    }
    vector<vector<int>> fixed(n + 1);             // size n + 1 for 1-indexed nodes
    for (auto [a, b] : edges) {
        fixed[a].push_back(b);
        fixed[b].push_back(a);
    }
    cout << "with size n + 1, node 3 has " << fixed[3].size() << " neighbour\\n";
}
~~~

~~~text
out_of_range: node 3 does not fit in a vector of size 3
with size n + 1, node 3 has 1 neighbour
~~~

A recursive DFS colouring is also correct, but every node on the current path is a stack frame; on a very long path that can exhaust the thread stack, which in C++ is a crash rather than an exception. Example 2 uses a \`vector<int>\` as an explicit stack (\`push_back\`/\`pop_back\`) instead.

## 5. Verified: Running the Code

Both examples were saved as \`main.cpp\` and run with \`g++ -std=c++17 -O2 main.cpp -o main && ./main\` (GCC 13), and once more under \`-fsanitize=address,undefined\`, which reported nothing. Example 1 checks eight graphs: the square, a triangle, the two LeetCode 785 examples, a disconnected graph whose second component is a 5-cycle, an even cycle plus an isolated node, the empty graph and a self-loop — and prints both sides when the answer is true. The last line uses \`boolalpha\` to print the \`bool\` as \`true\`:

~~~text
square 0-1-2-3: true  A=[0, 2] B=[1, 3]
triangle: false
LeetCode example 1: false
LeetCode example 2: true  A=[0, 2] B=[1, 3]
edge 0-1 plus a 5-cycle 2..6: false
6-cycle plus isolated 6: true  A=[0, 2, 4, 6] B=[1, 3, 5]
empty graph: true  A=[] B=[]
self-loop on 0: false
true
~~~

Things to notice: the isolated node 6 lands on side A (it starts its own component and gets colour 0), the empty graph is bipartite (no edge breaks the rule), and the self-loop fails immediately because node 0 is its own neighbour with its own colour.

Example 2 generates 500 small random graphs (2 to 8 nodes, each pair joined with probability 30%) from a fixed-seed Park–Miller generator, so all four languages build the very same graphs. The seed is a \`long long\`: \`seed * 48271\` reaches about \`10^14\`, and overflowing a signed \`int\` is **undefined behaviour** in C++, not a polite wrap-around. It runs BFS colouring, iterative DFS colouring and the union-find check on each graph:

~~~text
graphs tested: 500
bipartite: 355, not bipartite: 145
BFS, DFS and union-find agree on: 500
~~~

All three methods agree on all 500 graphs. About 70% of these small random graphs happen to be bipartite.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Try every split (bitmask) | O(2^n · E) | O(1) | \`2^n\` masks, each checked against every edge |
| BFS colouring | O(V + E) | O(V) | Each node coloured and queued once; each adjacency entry looked at once |
| DFS colouring (explicit stack) | O(V + E) | O(V) | Same work with \`push_back\`/\`pop_back\` |
| Union-find | O((V + E) · α(V)) | O(V) | One \`find\` per adjacency entry; α is at most 4 in practice |

## Edge Cases

- **Disconnected graph** — the outer loop; the 5-cycle in the second component is found.
- **Isolated nodes** — coloured 0 on their own, never clash.
- **Empty graph** (\`{}\`) — \`true\` with two empty sides.
- **Self-loop** — \`v == u\`, same colour, so \`false\` at once.
- **Even cycles** are fine; **any** odd cycle anywhere makes it \`false\`.
- **1-indexed input** — size the containers \`n + 1\`, as the snippet shows.

## Common Pitfalls

- **\`vector<int> color(n)\`** — zero-filled, so 0 means both "side A" and "unvisited"; pass \`-1\` as the fill value.
- **Taking the graph by value** — copies all of it on every call.
- **Only running BFS from node 0** — misses odd cycles in other components.
- **Out-of-range indices with \`[]\`** — undefined behaviour, not an exception; use \`.at()\` while debugging or size for 1-indexed ids.
- **\`int\` overflow in helper arithmetic** — undefined behaviour; use \`long long\`.
- **Recursive DFS on long paths** — can crash the process with a stack overflow.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">A graph is bipartite exactly when it can be 2-coloured, so I BFS from every uncoloured node, give each new neighbour <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 - color[u]</code>, and return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> if a neighbour already has the <strong style="color:#ffca28;">same</strong> colour as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is correct:</strong> <span style="color:#f0e2c8;">Inside a component the first colour forces every other one, so there is nothing to backtrack; a same-colour edge means an <strong style="color:#ffca28;">odd cycle</strong>, and a graph with an odd cycle can never be split.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">O(V + E) time — each node coloured once, each adjacency entry checked once — and O(V) extra space for the colour vector and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::queue</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Edge cases:</strong> <span style="color:#f0e2c8;">The outer loop over all nodes handles disconnected graphs; isolated nodes and the empty graph are bipartite; a self-loop is not.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The C++ detail:</strong> <span style="color:#f0e2c8;">I take the graph by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const&amp;</code>, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;int&gt; color(n, -1)</code> so 0 is not confused with unvisited, read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">front()</code> before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code>, and return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">optional&lt;vector&lt;int&gt;&gt;</code> so the caller gets the two sides too.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return an odd cycle as proof when the answer is no?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;int&gt; parent</code> during BFS. When the clashing edge <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u</code>–<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v</code> appears, walk both up the parent chain until they meet; the two paths plus the edge form a cycle, and since <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v</code> have the same colour they are at depths of the same parity, so the cycle is odd.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use DFS instead of BFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, each colour is forced by its edge in any order, so the answer is the same. I would use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;int&gt;</code> as an explicit stack, because a deep recursive DFS can overflow the stack and crash.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does the union-find version work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For each node <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u</code>, all its neighbours belong on the same side, so union each neighbour with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">graph[u][0]</code>; if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find(u) == find(v)</code> for any neighbour, it is not bipartite. With path halving it is O((V + E)·α(V)).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">vector&lt;bool&gt;</code> for the colours save memory?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It packs bits, but it needs a separate "visited" structure because a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bool</code> has only two states and I need three; and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;bool&gt;</code> returns proxy objects instead of real references. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;int8_t&gt;</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;int&gt;</code> with -1/0/1 is simpler.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the input is a 1-indexed edge list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Allocate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;vector&lt;int&gt;&gt; graph(n + 1)</code>, add both directions per edge, and loop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">start</code> from 1 to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n</code>. Using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n</code> slots writes past the end, which <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator[]</code> does not catch.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Bipartite graph** | Nodes split into two sets with every edge going between the sets |
| **2-colouring** | Two colours, different on the two ends of every edge |
| **Odd cycle** | A cycle with an odd number of edges; its presence means "not bipartite" |
| **Connected component** | A maximal group of nodes that can all reach each other |
| **Multi-component traversal** | Start a new BFS/DFS from every node that is still unvisited |

---
**Conclusion:** Checking whether a graph is bipartite is a 2-colouring traversal: colour a start node 0, give every uncoloured neighbour the opposite colour, and fail the moment an edge joins two nodes of the same colour — which happens exactly when the graph has an odd cycle. A loop over all nodes handles disconnected graphs, and the check is O(V + E) time and O(V) space, with the two sides as a by-product. In C++, take the graph by \`const&\`, fill the colour vector with -1, read \`front()\` before \`pop()\`, and respect bounds and signed overflow, both of which are undefined behaviour rather than errors. The same "visit, colour, propagate" pattern drives [cloning a graph](/interview-question/how-do-you-clone-a-graph), [counting islands](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid) and [detecting a cycle in a directed graph](/interview-question/how-do-you-detect-a-cycle-in-a-directed-graph).`,
        examples: [
          {
            label: "BFS 2-colouring on eight graphs, printing both sides when it succeeds",
            code: `#include <iostream>
#include <optional>
#include <queue>
#include <string>
#include <vector>
using namespace std;

// BFS 2-colouring. Returns the colours, or nullopt if an edge joins two equal colours.
optional<vector<int>> twoColor(const vector<vector<int>>& graph) {
    int n = graph.size();
    vector<int> color(n, -1);              // -1 = not coloured yet, 0 = side A, 1 = side B
    queue<int> q;
    for (int start = 0; start < n; start++) {      // every component needs its own start
        if (color[start] != -1) continue;
        color[start] = 0;
        q.push(start);
        while (!q.empty()) {
            int u = q.front(); q.pop();
            for (int v : graph[u]) {
                if (color[v] == -1) {
                    color[v] = 1 - color[u];       // opposite side
                    q.push(v);
                } else if (color[v] == color[u]) {
                    return nullopt;                // same side on both ends: odd cycle
                }
            }
        }
    }
    return color;
}

bool isBipartite(const vector<vector<int>>& graph) { return twoColor(graph).has_value(); }

string fmt(const vector<int>& xs) {
    string s = "[";
    for (size_t i = 0; i < xs.size(); i++) s += (i ? ", " : "") + to_string(xs[i]);
    return s + "]";
}

void report(const string& name, const vector<vector<int>>& graph) {
    auto color = twoColor(graph);
    if (!color) { cout << name << ": false\\n"; return; }
    vector<int> a, b;
    for (int i = 0; i < (int)color->size(); i++) ((*color)[i] == 0 ? a : b).push_back(i);
    cout << name << ": true  A=" << fmt(a) << " B=" << fmt(b) << "\\n";
}

int main() {
    report("square 0-1-2-3", {{1, 3}, {0, 2}, {1, 3}, {0, 2}});
    report("triangle", {{1, 2}, {0, 2}, {0, 1}});
    report("LeetCode example 1", {{1, 2, 3}, {0, 2}, {0, 1, 3}, {0, 2}});
    report("LeetCode example 2", {{1, 3}, {0, 2}, {1, 3}, {0, 2}});
    report("edge 0-1 plus a 5-cycle 2..6", {{1}, {0}, {3, 6}, {2, 4}, {3, 5}, {4, 6}, {5, 2}});
    report("6-cycle plus isolated 6", {{1, 5}, {0, 2}, {1, 3}, {2, 4}, {3, 5}, {4, 0}, {}});
    report("empty graph", {});
    report("self-loop on 0", {{0, 1}, {0}});
    cout << boolalpha << isBipartite({{1}, {0, 2}, {1, 3}, {2}}) << "\\n";  // true
}`,
          },
          {
            label: "BFS vs iterative DFS vs union-find agree on 500 random graphs",
            code: `#include <iostream>
#include <numeric>
#include <queue>
#include <vector>
using namespace std;

long long seed = 12345;
int rnd() {                          // Park-Miller generator; long long avoids overflow
    seed = seed * 48271 % 2147483647LL;
    return int(seed);
}

using Graph = vector<vector<int>>;

bool bfsCheck(const Graph& g) {
    vector<int> color(g.size(), -1);
    for (int s = 0; s < (int)g.size(); s++) {
        if (color[s] != -1) continue;
        color[s] = 0;
        queue<int> q;
        q.push(s);
        while (!q.empty()) {
            int u = q.front(); q.pop();
            for (int v : g[u]) {
                if (color[v] == -1) { color[v] = 1 - color[u]; q.push(v); }
                else if (color[v] == color[u]) return false;
            }
        }
    }
    return true;
}

bool dfsCheck(const Graph& g) {      // explicit stack, no recursion
    vector<int> color(g.size(), -1);
    for (int s = 0; s < (int)g.size(); s++) {
        if (color[s] != -1) continue;
        color[s] = 0;
        vector<int> st{s};
        while (!st.empty()) {
            int u = st.back(); st.pop_back();
            for (int v : g[u]) {
                if (color[v] == -1) { color[v] = 1 - color[u]; st.push_back(v); }
                else if (color[v] == color[u]) return false;
            }
        }
    }
    return true;
}

bool unionFindCheck(const Graph& g) {   // all neighbours of u share one set, u another
    vector<int> parent(g.size());
    iota(parent.begin(), parent.end(), 0);
    auto find = [&](int x) {
        while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }  // path halving
        return x;
    };
    for (int u = 0; u < (int)g.size(); u++)
        for (int v : g[u]) {
            if (find(u) == find(v)) return false;
            parent[find(v)] = find(g[u][0]);
        }
    return true;
}

int main() {
    int tested = 0, bipartite = 0, agree = 0;
    for (int t = 0; t < 500; t++) {
        int n = 2 + rnd() % 7;                 // 2..8 nodes
        Graph g(n);
        for (int a = 0; a < n; a++)
            for (int b = a + 1; b < n; b++)
                if (rnd() % 100 < 30) { g[a].push_back(b); g[b].push_back(a); }
        bool r1 = bfsCheck(g), r2 = dfsCheck(g), r3 = unionFindCheck(g);
        tested++;
        if (r1) bipartite++;
        if (r1 == r2 && r2 == r3) agree++;
    }
    cout << "graphs tested: " << tested << "\\n";
    cout << "bipartite: " << bipartite << ", not bipartite: " << tested - bipartite << "\\n";
    cout << "BFS, DFS and union-find agree on: " << agree << "\\n";
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you solve the Rotting Oranges problem with multi-source BFS?",
    difficulty: "medium",
    seoDescription: "Rotting Oranges with multi-source BFS: start from every rotten orange at once, count minutes by level, return -1 if any stay fresh. Code in 4 languages.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You have a grid where 0 is an empty cell, 1 is a fresh orange and 2 is a rotten orange. Every minute, each rotten orange rots the fresh oranges directly up, down, left and right of it. Return the minimum number of minutes until no fresh orange is left, or -1 if that is impossible. Please solve it in Python."

**What a strong answer should cover:**
- Seeing the grid as a graph and the spread as BFS levels: level k = the oranges that rot at minute k.
- **Multi-source BFS**: put **every** rotten orange in the queue at time 0 before the loop — not one BFS per rotten orange.
- Counting fresh oranges up front to detect the **-1** case, and the **0** case when nothing is fresh.
- O(rows × cols) time and space, versus O(minutes × rows × cols) for a minute-by-minute simulation.
- Python specifics: \`collections.deque\` with \`popleft()\`, \`for _ in range(len(queue))\` to process exactly one level, building a 2D grid with a comprehension (never \`[[-1] * cols] * rows\`), and saying whether you mutate the caller's grid.

**Clarifying questions expected:**
- Four directions or eight? What if there are no fresh oranges?
- May I modify the input grid?

**Code / implementation expected:** Yes — an \`oranges_rotting(grid)\` function in Python using multi-source BFS, tested on the impossible case and the no-fresh case.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know Python lists, tuples and loops; BFS and grids-as-graphs are explained from scratch.
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by actually running the code with \`python3\` (3.13); nothing is typed in by hand.

## 1. Why This Even Matters — A Story First

You leave a crate of oranges in the sun. A few are already rotten. Every minute, each rotten orange spoils the fresh oranges directly above, below, left and right of it — not diagonally, and not across an empty slot. How many minutes until no fresh orange is left? And is there an orange that will **never** rot because it is walled off by empty slots?

Picture dropping several stones into a pond at the same moment. Ripples spread from **all** of them at once, at the same speed, and a point on the water is reached by whichever ripple gets there first. That is exactly how the rot spreads — and it is exactly what a **multi-source breadth-first search** computes: start the search from every rotten orange at time 0, all together, and let the "waves" expand one step per minute.

The same pattern shows up everywhere: how long until a rumour reaches everyone in an office with several gossips, the distance from every empty room to the nearest exit (LeetCode "Walls and Gates"), the distance from every cell to the nearest 0 ("01 Matrix"), or fire spreading from several sparks. Learn it once here.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What do the cell values mean — 0 empty, 1 fresh, 2 rotten? | The standard encoding (LeetCode 994). Confirm it before coding. |
| Does rot spread in 4 directions, or 8 (diagonals too)? | Changes the direction list only, but answering the wrong one gives wrong minutes. |
| What should I return if some orange can never rot? | Usually **-1**. You must detect it: count fresh oranges and check that the count reaches 0. |
| What if there are no fresh oranges at the start? | The answer is **0**, even if there are no rotten oranges either. |
| May I modify the input grid? | Marking oranges rotten in place saves a visited array; otherwise copy the grid or keep a separate \`time\`/\`visited\` grid. |
| How large can the grid be? | Up to 10 × 10 on LeetCode, but the O(rows × cols) solution scales to millions of cells. |

## 3. The Core Idea: One BFS, Many Starting Points

📌 **Interview term: Grid as an implicit graph** — every cell is a node and every pair of side-by-side cells is an edge. You never build an adjacency list; you compute the 4 neighbours \`(r±1, c)\` and \`(r, c±1)\` on the fly and skip those that fall off the grid. The same view drives [counting islands](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid).

📌 **Interview term: BFS level (layer)** — breadth-first search visits nodes in order of distance from the start: first everything at distance 1, then everything at distance 2, and so on. Each "ring" is a level. Here, **level k = the oranges that rot at minute k**. Why BFS (and not DFS) gives shortest distances in unweighted graphs is covered in [What is the difference between BFS and DFS?](/interview-question/what-is-the-difference-between-bfs-and-dfs) and [When would you use BFS over Dijkstra?](/interview-question/when-would-you-use-bfs-over-dijkstra-for-shortest-paths)

📌 **Interview term: Multi-source BFS** — a BFS whose queue starts with **all** the sources at distance 0, instead of a single start node. Every node then gets its distance to the **nearest** source, in one pass.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="A super source S joined to three rotten oranges R1 R2 R3 by dashed edges. From the rotten oranges the BFS wave reaches the fresh oranges at minute 1 and then minute 2">
  <defs>
    <marker id="ro22-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="40" y="125" width="90" height="50" rx="10"/>
  <text class="d-text" x="85" y="155" text-anchor="middle">S</text>
  <path class="d-edge-dashed" d="M 130 140 L 222 70" marker-end="url(#ro22-arrow)"/>
  <path class="d-edge-dashed" d="M 130 150 L 222 150" marker-end="url(#ro22-arrow)"/>
  <path class="d-edge-dashed" d="M 130 160 L 222 230" marker-end="url(#ro22-arrow)"/>
  <rect class="d-box-accent" x="230" y="45" width="100" height="46" rx="8"/>
  <text class="d-text d-accent" x="280" y="74" text-anchor="middle">R1 min 0</text>
  <rect class="d-box-accent" x="230" y="127" width="100" height="46" rx="8"/>
  <text class="d-text d-accent" x="280" y="156" text-anchor="middle">R2 min 0</text>
  <rect class="d-box-accent" x="230" y="209" width="100" height="46" rx="8"/>
  <text class="d-text d-accent" x="280" y="238" text-anchor="middle">R3 min 0</text>
  <path class="d-edge" d="M 330 68 L 402 108" marker-end="url(#ro22-arrow)"/>
  <path class="d-edge" d="M 330 232 L 402 192" marker-end="url(#ro22-arrow)"/>
  <rect class="d-box" x="410" y="90" width="100" height="46" rx="8"/>
  <text class="d-text" x="460" y="119" text-anchor="middle">min 1</text>
  <rect class="d-box" x="410" y="166" width="100" height="46" rx="8"/>
  <text class="d-text" x="460" y="195" text-anchor="middle">min 1</text>
  <path class="d-edge" d="M 510 136 L 562 146" marker-end="url(#ro22-arrow)"/>
  <rect class="d-box" x="570" y="127" width="90" height="46" rx="8"/>
  <text class="d-text" x="615" y="156" text-anchor="middle">min 2</text>
</svg>

A helpful way to see multi-source BFS: imagine one extra "super source" node S joined to every rotten orange (the dashed edges). A normal single-source BFS from S would put all the rotten oranges at the first level — which is exactly what "push every rotten orange into the queue before starting" does, without ever building S.

### Why not run one BFS per rotten orange?

You could run a separate BFS from each rotten orange and keep, for every fresh orange, the smallest distance seen. That gives the right answer, but with \`k\` rotten oranges it costs O(k × rows × cols). Running the minute-by-minute simulation literally — rescan the whole grid every minute and rot whatever touches a rotten orange — is also correct but costs O(minutes × rows × cols), and the number of minutes can be close to rows × cols on a snake-shaped grid. Multi-source BFS touches each cell **once**: O(rows × cols). Example 2 counts all three.

### The algorithm

1. Scan the grid once: push every rotten cell \`(r, c)\` into the queue with time 0, and count the fresh oranges.
2. While the queue is not empty, pop a cell. For each of its 4 neighbours that is inside the grid and **fresh and not yet reached**: record its time as the popped cell time + 1, decrement the fresh count, and push it.
3. When the queue is empty: if the fresh count is 0, the answer is the largest time recorded (0 if nothing had to rot); otherwise return **-1**.

Two equivalent ways to track minutes:

- **Store a time per cell** (\`time[nr][nc] = time[r][c] + 1\`) and take the maximum — used in example 1, and it gives you the whole "when did each orange rot" map.
- **Process the queue level by level**: read the queue size, pop exactly that many cells (that is one minute), then add 1 to \`minutes\`. Stop when the fresh count hits 0, or you count one extra, empty minute at the end.

Here is the "minute each orange rotted" map for the first LeetCode example, \`[[2,1,1],[1,1,0],[0,1,1]]\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 680 290" role="img" aria-label="A 3 by 3 grid of rot times. Row one is 0 1 2. Row two is 1 2 and an empty cell. Row three is an empty cell then 3 and 4">
  <rect class="d-box-accent" x="200" y="30" width="80" height="70" rx="6"/>
  <text class="d-text d-accent" x="240" y="72" text-anchor="middle">0</text>
  <rect class="d-box" x="300" y="30" width="80" height="70" rx="6"/>
  <text class="d-text" x="340" y="72" text-anchor="middle">1</text>
  <rect class="d-box" x="400" y="30" width="80" height="70" rx="6"/>
  <text class="d-text" x="440" y="72" text-anchor="middle">2</text>
  <rect class="d-box" x="200" y="115" width="80" height="70" rx="6"/>
  <text class="d-text" x="240" y="157" text-anchor="middle">1</text>
  <rect class="d-box" x="300" y="115" width="80" height="70" rx="6"/>
  <text class="d-text" x="340" y="157" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="400" y="115" width="80" height="70" rx="6"/>
  <text class="d-sub" x="440" y="157" text-anchor="middle">empty</text>
  <rect class="d-box-muted" x="200" y="200" width="80" height="70" rx="6"/>
  <text class="d-sub" x="240" y="242" text-anchor="middle">empty</text>
  <rect class="d-box" x="300" y="200" width="80" height="70" rx="6"/>
  <text class="d-text" x="340" y="242" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="400" y="200" width="80" height="70" rx="6"/>
  <text class="d-text d-accent" x="440" y="242" text-anchor="middle">4</text>
</svg>

The single rotten orange in the top-left corner is minute 0. The rot reaches its two neighbours at minute 1, then spreads along the only open route around the empty cells, reaching the bottom-right orange last at minute **4** — the answer. Note that the bottom-right orange is 4 steps away even though it looks "diagonally close": rot does not move diagonally.


## 4. The Code in Python

This version keeps a separate \`time\` grid, so it does **not** modify the caller's grid and it can report when each orange rotted:

~~~python
from collections import deque

EMPTY, FRESH, ROTTEN = 0, 1, 2
DIRS = [(1, 0), (-1, 0), (0, 1), (0, -1)]


def rot_times(grid):
    rows, cols = len(grid), len(grid[0])
    time = [[-1] * cols for _ in range(rows)]        # -1 = never rotted (or empty)
    queue = deque()
    fresh = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == ROTTEN:
                time[r][c] = 0
                queue.append((r, c))                 # ALL rotten oranges start at minute 0
            elif grid[r][c] == FRESH:
                fresh += 1
    minutes = 0
    while queue:
        r, c = queue.popleft()
        for dr, dc in DIRS:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == FRESH and time[nr][nc] == -1:
                time[nr][nc] = time[r][c] + 1        # one minute after its neighbour
                minutes = max(minutes, time[nr][nc])
                fresh -= 1
                queue.append((nr, nc))
    return (minutes if fresh == 0 else -1), time
~~~

The Python parts that matter:

- **\`DIRS\` as a list of \`(dr, dc)\` tuples** — one loop instead of four copy-pasted \`if\` blocks; switching to 8 directions means adding four tuples.
- **\`0 <= nr < rows\`** — Python's chained comparison reads exactly like the maths. Without the bounds check, \`grid[-1]\` would **not** raise — negative indices wrap to the last row in Python, so a missing \`0 <=\` check silently rots oranges on the opposite edge.
- **\`time = [[-1] * cols for _ in range(rows)]\`** — one new row per iteration. The \`[[-1] * cols] * rows\` shortcut repeats one row object; see the snippet below.
- **\`deque\` and \`popleft()\`** — O(1) at the front ([collections docs](https://docs.python.org/3/library/collections.html#collections.deque)); \`list.pop(0)\` is O(n).
- **Mark when you push, not when you pop.** Setting \`time[nr][nc]\` before \`append\` means no cell is ever queued twice, even when two rotten neighbours reach it in the same minute.
- **\`fresh\` counter** — decides between the answer and -1 without a second scan of the grid.

📌 **Interview term: Visited marking on enqueue** — recording "this node has been reached" at the moment it enters the queue. It caps the queue at one entry per node and is what keeps BFS at O(V + E).

The level-by-level form many interviewers expect — it rots the grid **in place**, which saves the \`time\` grid but changes the caller's data:

~~~python
from collections import deque


def oranges_rotting(grid):
    """Level-by-level BFS: one pass of the inner loop = one minute. Rots grid IN PLACE."""
    rows, cols = len(grid), len(grid[0])
    queue = deque((r, c) for r in range(rows) for c in range(cols) if grid[r][c] == 2)
    fresh = sum(row.count(1) for row in grid)
    minutes = 0
    while queue and fresh > 0:                 # "and fresh > 0" avoids counting one extra minute
        for _ in range(len(queue)):            # exactly the oranges that rotted last minute
            r, c = queue.popleft()
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:
                    grid[nr][nc] = 2           # mark rotten when queued
                    fresh -= 1
                    queue.append((nr, nc))
        minutes += 1
    return minutes if fresh == 0 else -1


grid = [[2, 1, 1], [1, 1, 0], [0, 1, 1]]
print(oranges_rotting(grid))
print("caller grid afterwards:", grid)          # the input was modified
print(oranges_rotting([[2, 1, 1], [0, 1, 1], [1, 0, 1]]), oranges_rotting([[0, 2]]), oranges_rotting([[0]]))
~~~

~~~text
4
caller grid afterwards: [[2, 2, 2], [2, 2, 0], [0, 2, 2]]
-1 0 0
~~~

\`for _ in range(len(queue))\` evaluates \`len(queue)\` **once**, before the loop starts, so the oranges pushed during this minute wait for the next pass. The \`and fresh > 0\` in the \`while\` stops before an extra empty level would add one minute too many.

And the 2D-list trap, checked by running it:

~~~python
time = [[-1] * 3] * 3            # BUG: three references to ONE row
time[0][0] = 0
print("[[-1] * 3] * 3  ->", time)

time = [[-1] * 3 for _ in range(3)]
time[0][0] = 0
print("comprehension   ->", time)
~~~

~~~text
[[-1] * 3] * 3  -> [[0, -1, -1], [0, -1, -1], [0, -1, -1]]
comprehension   -> [[0, -1, -1], [-1, -1, -1], [-1, -1, -1]]
~~~

With the multiplied list, setting one cell sets the whole column, so the BFS would think cells were reached that never were.

## 5. Verified: Running the Code

Both examples were saved as \`main.py\` and run with \`python3 main.py\` (Python 3.13). Example 1 runs six grids — the three LeetCode 994 examples, a grid with nothing in it, a lone fresh orange with no rotten one, and a row rotting from both ends — then prints the "minute each orange rotted" map for the first one:

~~~text
LeetCode 1: 4
LeetCode 2: -1
LeetCode 3: 0
only empty: 0
one fresh, no rotten: -1
rotten at both ends: 2
minute each orange rotted in LeetCode 1:
  0 1 2
  1 2 .
  . 3 4
2
~~~

Check the cases: LeetCode 2 is -1 because the bottom-left orange is fenced off by empty cells; LeetCode 3 and "only empty" are 0 because nothing fresh exists; "rotten at both ends" is 2, not 4, because the two waves meet in the middle — that is the multi-source effect.

Example 2 compares three correct approaches on an n × n grid whose whole left column is rotten (n sources) and everything else fresh, so it takes n - 1 minutes:

~~~text
10x10: minutes=9 all agree=true
  simulation cells scanned:   1000
  one BFS per rotten orange:  910
  multi-source BFS pops:      100
20x20: minutes=19 all agree=true
  simulation cells scanned:   8000
  one BFS per rotten orange:  7620
  multi-source BFS pops:      400
40x40: minutes=39 all agree=true
  simulation cells scanned:   64000
  one BFS per rotten orange:  62440
  multi-source BFS pops:      1600
~~~

The multi-source BFS pops each cell exactly once (n² pops). The simulation rescans all n² cells every minute, n times (n - 1 rotting minutes plus one final scan that finds nothing): n³. Running a separate BFS from each of the n rotten oranges is also about n³. Doubling n from 20 to 40 multiplied the BFS work by 4 and the other two by about 8.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Minute-by-minute simulation | O(minutes × R × C) | O(R × C) | Every minute rescans the grid; minutes can approach R × C |
| One BFS per rotten orange | O(k × R × C) | O(R × C) | k full BFS runs |
| Multi-source BFS | O(R × C) | O(R × C) | Every cell is pushed and popped at most once, and checks 4 neighbours |

R and C are the numbers of rows and columns. The space is the \`deque\` (up to R × C cells in the worst case) plus the \`time\` grid; the in-place level version drops the \`time\` grid but still needs the queue.

## Edge Cases

- **No fresh oranges** — return 0, even with no rotten ones (\`[[0]]\`, \`[[0, 2]]\`).
- **Fresh oranges but no rotten ones** — the queue starts empty, \`fresh > 0\`, return -1 (\`[[1]]\`).
- **An unreachable fresh orange** — walled off by empty cells: -1 (LeetCode 2).
- **Several rotten oranges** — they spread together; the answer is the distance to the **nearest** source, maximised over all fresh oranges.
- **A single row or column** — the bounds checks handle it; no special case.
- **Empty grid (\`[]\`)** — \`grid[0]\` would raise \`IndexError\`; guard with \`if not grid or not grid[0]: return 0\` if the input can be empty.

## Common Pitfalls

- **Starting a BFS from one rotten orange at a time** (and adding up or overwriting times) — gives wrong minutes when several sources race; put all sources in the queue first.
- **Forgetting the bounds check's lower half** — \`grid[-1][c]\` is a valid Python index (the last row), so the bug does not crash; it rots the wrong cells.
- **\`[[-1] * cols] * rows\`** — one shared row, as shown above.
- **Counting one minute too many** in the level-by-level loop — stop when \`fresh == 0\`, or subtract one at the end.
- **Marking rotten on pop instead of on push** — the same orange is queued twice and the counts drift.
- **Silently mutating the caller's grid** — fine on LeetCode, surprising in real code; say which you are doing, or copy with \`[row[:] for row in grid]\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">It is a multi-source BFS: push <strong style="color:#ffca28;">every</strong> rotten orange into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deque</code> at minute 0, count the fresh ones, then expand one level per minute, rotting fresh neighbours and decrementing the count.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How I get the answer:</strong> <span style="color:#f0e2c8;">The last minute at which something rotted is the answer; if the fresh count is not 0 when the queue empties, some orange is walled off and I return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-1</code>; with nothing fresh at the start the answer is 0.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">O(R × C) time and space — every cell is pushed and popped at most once — compared with O(minutes × R × C) for re-simulating the grid every minute.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why multi-source:</strong> <span style="color:#f0e2c8;">All rotten oranges spread at the same time, so a single BFS seeded with all of them gives each orange its distance to the <strong style="color:#ffca28;">nearest</strong> rotten one; one BFS per source would cost O(k × R × C).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The Python detail:</strong> <span style="color:#f0e2c8;">I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for _ in range(len(queue))</code> to process exactly one minute, check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0 &lt;= nr &lt; rows</code> because negative indices wrap instead of failing, and build 2D lists with a comprehension, never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[[0] * C] * R</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if rot also spreads diagonally?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only the direction list changes: add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(1, 1)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(1, -1)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(-1, 1)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(-1, -1)</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DIRS</code>. The BFS and the O(R × C) bound stay the same, with 8 neighbour checks per cell instead of 4.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it without modifying the input grid?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — keep a separate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">time</code> grid (or a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">visited</code> set of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(r, c)</code> tuples) and mark that instead of writing 2 into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">grid</code>. It costs O(R × C) extra memory, which the queue needs in the worst case anyway.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does BFS give the minimum number of minutes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">BFS pops nodes in order of distance from the sources, so the first time a fresh orange is reached is along a shortest path — and in this problem distance is exactly time, since every step takes one minute.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if some oranges take two minutes to rot?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then edges have different weights and plain BFS no longer gives the earliest time. With weights 1 and 2 a 0-1-BFS-style deque or Dijkstra with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code>, seeded with all rotten oranges, solves it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where else does multi-source BFS appear?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Distance to the nearest exit in "Walls and Gates", distance to the nearest 0 in "01 Matrix", and the nearest hospital or charger to every cell of a map — any "distance to the nearest of several sources" question.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Grid as an implicit graph** | Cells are nodes, side-by-side cells are edges; neighbours computed on the fly |
| **BFS level (layer)** | All nodes at the same distance from the start; here, the oranges that rot in the same minute |
| **Multi-source BFS** | A BFS whose queue starts with every source at distance 0 |
| **Super source** | An imaginary node joined to every source; multi-source BFS is a normal BFS from it |
| **Visited marking on enqueue** | Mark a node when it enters the queue so it is queued only once |

---
**Conclusion:** Rotting Oranges is a shortest-distance question on a grid, and because every rotten orange starts spreading at the same moment, the right tool is a **multi-source BFS**: push every rotten orange at time 0, expand one level per minute, and count fresh oranges to tell the answer from -1. That is O(rows × cols) — each cell is touched once — instead of the O(minutes × rows × cols) simulation or one BFS per source. In Python, use a \`deque\`, build 2D lists with a comprehension, guard both sides of every index (negative indices do not raise), and decide up front whether you may rot the input in place. The same pattern solves "Walls and Gates", "01 Matrix", and the same level-by-level BFS is what finds the shortest chain in [Word Ladder](/interview-question/how-do-you-solve-the-word-ladder-problem).`,
        examples: [
          {
            label: "Multi-source BFS on six grids, plus the minute each orange rotted",
            code: `from collections import deque

EMPTY, FRESH, ROTTEN = 0, 1, 2
DIRS = [(1, 0), (-1, 0), (0, 1), (0, -1)]


def rot_times(grid):
    """Multi-source BFS. Returns (minutes or -1, grid of the minute each cell rotted)."""
    rows, cols = len(grid), len(grid[0])
    time = [[-1] * cols for _ in range(rows)]        # -1 = never rotted (or empty)
    queue = deque()
    fresh = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == ROTTEN:
                time[r][c] = 0
                queue.append((r, c))                 # ALL rotten oranges start at minute 0
            elif grid[r][c] == FRESH:
                fresh += 1
    minutes = 0
    while queue:
        r, c = queue.popleft()
        for dr, dc in DIRS:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == FRESH and time[nr][nc] == -1:
                time[nr][nc] = time[r][c] + 1        # one minute after its neighbour
                minutes = max(minutes, time[nr][nc])
                fresh -= 1
                queue.append((nr, nc))
    return (minutes if fresh == 0 else -1), time


def oranges_rotting(grid):
    return rot_times(grid)[0]


cases = [("LeetCode 1", [[2, 1, 1], [1, 1, 0], [0, 1, 1]]),
         ("LeetCode 2", [[2, 1, 1], [0, 1, 1], [1, 0, 1]]),
         ("LeetCode 3", [[0, 2]]),
         ("only empty", [[0]]),
         ("one fresh, no rotten", [[1]]),
         ("rotten at both ends", [[2, 1, 1, 1, 2]])]
for name, grid in cases:
    print(name + ": " + str(oranges_rotting(grid)))

minutes, time = rot_times([[2, 1, 1], [1, 1, 0], [0, 1, 1]])
print("minute each orange rotted in LeetCode 1:")
for row in time:
    print("  " + " ".join("." if t == -1 else str(t) for t in row))
print(oranges_rotting([[2, 1], [1, 1]]))   # 2`,
          },
          {
            label: "Simulation vs one BFS per rotten orange vs multi-source BFS: counting the work",
            code: `from collections import deque

DIRS = [(1, 0), (-1, 0), (0, 1), (0, -1)]


def neighbours(r, c, rows, cols):
    for dr, dc in DIRS:
        if 0 <= r + dr < rows and 0 <= c + dc < cols:
            yield r + dr, c + dc


def simulate(grid):
    """Minute-by-minute simulation: rescan the whole grid every minute."""
    g = [row[:] for row in grid]               # copy each row: do not touch the input
    rows, cols = len(g), len(g[0])
    minutes = scanned = 0
    while True:
        to_rot = []
        for r in range(rows):
            for c in range(cols):
                scanned += 1
                if g[r][c] == 1 and any(g[nr][nc] == 2 for nr, nc in neighbours(r, c, rows, cols)):
                    to_rot.append((r, c))
        if not to_rot:
            break
        for r, c in to_rot:                    # rot them only after the scan: same minute
            g[r][c] = 2
        minutes += 1
    fresh = sum(row.count(1) for row in g)
    return (minutes if fresh == 0 else -1), scanned


def bfs_from(grid, sources):
    rows, cols = len(grid), len(grid[0])
    dist = [[-1] * cols for _ in range(rows)]
    queue = deque()
    for r, c in sources:
        dist[r][c] = 0
        queue.append((r, c))
    pops = 0
    while queue:
        r, c = queue.popleft()
        pops += 1
        for nr, nc in neighbours(r, c, rows, cols):
            if grid[nr][nc] == 1 and dist[nr][nc] == -1:
                dist[nr][nc] = dist[r][c] + 1
                queue.append((nr, nc))
    return dist, pops


def answer_from(grid, dist):
    worst = 0
    for r in range(len(grid)):
        for c in range(len(grid[0])):
            if grid[r][c] == 1:
                if dist[r][c] == -1:
                    return -1
                worst = max(worst, dist[r][c])
    return worst


def one_bfs_per_source(grid):
    rows, cols = len(grid), len(grid[0])
    sources = [(r, c) for r in range(rows) for c in range(cols) if grid[r][c] == 2]
    best = [[-1] * cols for _ in range(rows)]
    total = 0
    for s in sources:
        dist, pops = bfs_from(grid, [s])
        total += pops
        for r in range(rows):
            for c in range(cols):
                if dist[r][c] != -1 and (best[r][c] == -1 or dist[r][c] < best[r][c]):
                    best[r][c] = dist[r][c]
    return answer_from(grid, best), total


def multi_source(grid):
    rows, cols = len(grid), len(grid[0])
    sources = [(r, c) for r in range(rows) for c in range(cols) if grid[r][c] == 2]
    dist, pops = bfs_from(grid, sources)       # every source in the queue at minute 0
    return answer_from(grid, dist), pops


for n in [10, 20, 40]:
    grid = [[2 if c == 0 else 1 for c in range(n)] for _ in range(n)]   # left column rotten
    a, s = simulate(grid)
    b, p = one_bfs_per_source(grid)
    m, q = multi_source(grid)
    print(str(n) + "x" + str(n) + ": minutes=" + str(m) + " all agree=" + str(a == b == m).lower())
    print("  simulation cells scanned:   " + str(s))
    print("  one BFS per rotten orange:  " + str(p))
    print("  multi-source BFS pops:      " + str(q))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You have a grid where 0 is an empty cell, 1 is a fresh orange and 2 is a rotten orange. Every minute, each rotten orange rots the fresh oranges directly up, down, left and right of it. Return the minimum number of minutes until no fresh orange is left, or -1 if that is impossible. Please solve it in JavaScript."

**What a strong answer should cover:**
- Seeing the grid as a graph and the spread as BFS levels: level k = the oranges that rot at minute k.
- **Multi-source BFS**: put **every** rotten orange in the queue at time 0 before the loop — not one BFS per rotten orange.
- Counting fresh oranges up front to detect the **-1** case, and the **0** case when nothing is fresh.
- O(rows × cols) time and space, versus O(minutes × rows × cols) for a minute-by-minute simulation.
- JavaScript specifics: a head index or a fresh \`next\` array per level instead of \`shift()\`, explicit bounds checks because \`grid[-1]\` is \`undefined\` (and \`grid[-1][c]\` throws), \`Array.from\` for 2D arrays (never \`fill(new Array(...))\`), and whether you mutate the caller's grid.

**Clarifying questions expected:**
- Four directions or eight? What if there are no fresh oranges?
- May I modify the input grid?

**Code / implementation expected:** Yes — an \`orangesRotting(grid)\` function in JavaScript using multi-source BFS, tested on the impossible case and the no-fresh case.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know JavaScript arrays and loops; BFS and grids-as-graphs are explained from scratch.
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by actually running the code with \`node\` (v22); nothing is typed in by hand. The examples use no Node-only APIs, so they also run in the browser.

## 1. Why This Even Matters — A Story First

You leave a crate of oranges in the sun. A few are already rotten. Every minute, each rotten orange spoils the fresh oranges directly above, below, left and right of it — not diagonally, and not across an empty slot. How many minutes until no fresh orange is left? And is there an orange that will **never** rot because it is walled off by empty slots?

Picture dropping several stones into a pond at the same moment. Ripples spread from **all** of them at once, at the same speed, and a point on the water is reached by whichever ripple gets there first. That is exactly how the rot spreads — and it is exactly what a **multi-source breadth-first search** computes: start the search from every rotten orange at time 0, all together, and let the "waves" expand one step per minute.

The same pattern shows up everywhere: how long until a rumour reaches everyone in an office with several gossips, the distance from every empty room to the nearest exit (LeetCode "Walls and Gates"), the distance from every cell to the nearest 0 ("01 Matrix"), or fire spreading from several sparks. Learn it once here.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What do the cell values mean — 0 empty, 1 fresh, 2 rotten? | The standard encoding (LeetCode 994). Confirm it before coding. |
| Does rot spread in 4 directions, or 8 (diagonals too)? | Changes the direction list only, but answering the wrong one gives wrong minutes. |
| What should I return if some orange can never rot? | Usually **-1**. You must detect it: count fresh oranges and check that the count reaches 0. |
| What if there are no fresh oranges at the start? | The answer is **0**, even if there are no rotten oranges either. |
| May I modify the input grid? | Marking oranges rotten in place saves a visited array; otherwise copy the grid or keep a separate \`time\`/\`visited\` grid. |
| How large can the grid be? | Up to 10 × 10 on LeetCode, but the O(rows × cols) solution scales to millions of cells. |

## 3. The Core Idea: One BFS, Many Starting Points

📌 **Interview term: Grid as an implicit graph** — every cell is a node and every pair of side-by-side cells is an edge. You never build an adjacency list; you compute the 4 neighbours \`(r±1, c)\` and \`(r, c±1)\` on the fly and skip those that fall off the grid. The same view drives [counting islands](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid).

📌 **Interview term: BFS level (layer)** — breadth-first search visits nodes in order of distance from the start: first everything at distance 1, then everything at distance 2, and so on. Each "ring" is a level. Here, **level k = the oranges that rot at minute k**. Why BFS (and not DFS) gives shortest distances in unweighted graphs is covered in [What is the difference between BFS and DFS?](/interview-question/what-is-the-difference-between-bfs-and-dfs) and [When would you use BFS over Dijkstra?](/interview-question/when-would-you-use-bfs-over-dijkstra-for-shortest-paths)

📌 **Interview term: Multi-source BFS** — a BFS whose queue starts with **all** the sources at distance 0, instead of a single start node. Every node then gets its distance to the **nearest** source, in one pass.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="A super source S joined to three rotten oranges R1 R2 R3 by dashed edges. From the rotten oranges the BFS wave reaches the fresh oranges at minute 1 and then minute 2">
  <defs>
    <marker id="ro22-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="40" y="125" width="90" height="50" rx="10"/>
  <text class="d-text" x="85" y="155" text-anchor="middle">S</text>
  <path class="d-edge-dashed" d="M 130 140 L 222 70" marker-end="url(#ro22-arrow)"/>
  <path class="d-edge-dashed" d="M 130 150 L 222 150" marker-end="url(#ro22-arrow)"/>
  <path class="d-edge-dashed" d="M 130 160 L 222 230" marker-end="url(#ro22-arrow)"/>
  <rect class="d-box-accent" x="230" y="45" width="100" height="46" rx="8"/>
  <text class="d-text d-accent" x="280" y="74" text-anchor="middle">R1 min 0</text>
  <rect class="d-box-accent" x="230" y="127" width="100" height="46" rx="8"/>
  <text class="d-text d-accent" x="280" y="156" text-anchor="middle">R2 min 0</text>
  <rect class="d-box-accent" x="230" y="209" width="100" height="46" rx="8"/>
  <text class="d-text d-accent" x="280" y="238" text-anchor="middle">R3 min 0</text>
  <path class="d-edge" d="M 330 68 L 402 108" marker-end="url(#ro22-arrow)"/>
  <path class="d-edge" d="M 330 232 L 402 192" marker-end="url(#ro22-arrow)"/>
  <rect class="d-box" x="410" y="90" width="100" height="46" rx="8"/>
  <text class="d-text" x="460" y="119" text-anchor="middle">min 1</text>
  <rect class="d-box" x="410" y="166" width="100" height="46" rx="8"/>
  <text class="d-text" x="460" y="195" text-anchor="middle">min 1</text>
  <path class="d-edge" d="M 510 136 L 562 146" marker-end="url(#ro22-arrow)"/>
  <rect class="d-box" x="570" y="127" width="90" height="46" rx="8"/>
  <text class="d-text" x="615" y="156" text-anchor="middle">min 2</text>
</svg>

A helpful way to see multi-source BFS: imagine one extra "super source" node S joined to every rotten orange (the dashed edges). A normal single-source BFS from S would put all the rotten oranges at the first level — which is exactly what "push every rotten orange into the queue before starting" does, without ever building S.

### Why not run one BFS per rotten orange?

You could run a separate BFS from each rotten orange and keep, for every fresh orange, the smallest distance seen. That gives the right answer, but with \`k\` rotten oranges it costs O(k × rows × cols). Running the minute-by-minute simulation literally — rescan the whole grid every minute and rot whatever touches a rotten orange — is also correct but costs O(minutes × rows × cols), and the number of minutes can be close to rows × cols on a snake-shaped grid. Multi-source BFS touches each cell **once**: O(rows × cols). Example 2 counts all three.

### The algorithm

1. Scan the grid once: push every rotten cell \`(r, c)\` into the queue with time 0, and count the fresh oranges.
2. While the queue is not empty, pop a cell. For each of its 4 neighbours that is inside the grid and **fresh and not yet reached**: record its time as the popped cell time + 1, decrement the fresh count, and push it.
3. When the queue is empty: if the fresh count is 0, the answer is the largest time recorded (0 if nothing had to rot); otherwise return **-1**.

Two equivalent ways to track minutes:

- **Store a time per cell** (\`time[nr][nc] = time[r][c] + 1\`) and take the maximum — used in example 1, and it gives you the whole "when did each orange rot" map.
- **Process the queue level by level**: read the queue size, pop exactly that many cells (that is one minute), then add 1 to \`minutes\`. Stop when the fresh count hits 0, or you count one extra, empty minute at the end.

Here is the "minute each orange rotted" map for the first LeetCode example, \`[[2,1,1],[1,1,0],[0,1,1]]\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 680 290" role="img" aria-label="A 3 by 3 grid of rot times. Row one is 0 1 2. Row two is 1 2 and an empty cell. Row three is an empty cell then 3 and 4">
  <rect class="d-box-accent" x="200" y="30" width="80" height="70" rx="6"/>
  <text class="d-text d-accent" x="240" y="72" text-anchor="middle">0</text>
  <rect class="d-box" x="300" y="30" width="80" height="70" rx="6"/>
  <text class="d-text" x="340" y="72" text-anchor="middle">1</text>
  <rect class="d-box" x="400" y="30" width="80" height="70" rx="6"/>
  <text class="d-text" x="440" y="72" text-anchor="middle">2</text>
  <rect class="d-box" x="200" y="115" width="80" height="70" rx="6"/>
  <text class="d-text" x="240" y="157" text-anchor="middle">1</text>
  <rect class="d-box" x="300" y="115" width="80" height="70" rx="6"/>
  <text class="d-text" x="340" y="157" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="400" y="115" width="80" height="70" rx="6"/>
  <text class="d-sub" x="440" y="157" text-anchor="middle">empty</text>
  <rect class="d-box-muted" x="200" y="200" width="80" height="70" rx="6"/>
  <text class="d-sub" x="240" y="242" text-anchor="middle">empty</text>
  <rect class="d-box" x="300" y="200" width="80" height="70" rx="6"/>
  <text class="d-text" x="340" y="242" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="400" y="200" width="80" height="70" rx="6"/>
  <text class="d-text d-accent" x="440" y="242" text-anchor="middle">4</text>
</svg>

The single rotten orange in the top-left corner is minute 0. The rot reaches its two neighbours at minute 1, then spreads along the only open route around the empty cells, reaching the bottom-right orange last at minute **4** — the answer. Note that the bottom-right orange is 4 steps away even though it looks "diagonally close": rot does not move diagonally.


## 4. The Code in JavaScript

This version keeps a separate \`time\` grid, so it does **not** modify the caller's grid and it can report when each orange rotted:

~~~javascript
const EMPTY = 0, FRESH = 1, ROTTEN = 2;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function rotTimes(grid) {
  const rows = grid.length, cols = grid[0].length;
  const time = Array.from({ length: rows }, () => new Array(cols).fill(-1)); // -1 = never rotted
  const queue = [];
  let fresh = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === ROTTEN) { time[r][c] = 0; queue.push([r, c]); } // ALL start at minute 0
      else if (grid[r][c] === FRESH) fresh++;
    }
  }
  let minutes = 0;
  for (let head = 0; head < queue.length; head++) {
    const [r, c] = queue[head];
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols &&
          grid[nr][nc] === FRESH && time[nr][nc] === -1) {
        time[nr][nc] = time[r][c] + 1;               // one minute after its neighbour
        minutes = Math.max(minutes, time[nr][nc]);
        fresh--;
        queue.push([nr, nc]);
      }
    }
  }
  return [fresh === 0 ? minutes : -1, time];
}
~~~

The JavaScript parts that matter:

- **\`for (let head = 0; head < queue.length; head++)\`** — the queue is a plain array that only grows; \`head\` points at the next cell to pop. The loop condition re-reads \`queue.length\` each time, so cells pushed during the loop are picked up. \`shift()\` would move every remaining element on each pop ([MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/shift)).
- **\`const [r, c] = queue[head]\`** — array destructuring. Each queued cell is a small \`[r, c]\` array; for very large grids, encoding the cell as one number \`r * cols + c\` avoids allocating an array per cell.
- **Explicit bounds checks.** \`grid[-1]\` is \`undefined\` in JavaScript, so \`grid[-1][c]\` throws \`TypeError\`, while \`grid[0][-1]\` is just \`undefined\` and compares unequal to \`FRESH\` — inconsistent behaviour that hides bugs. Check \`nr >= 0 && nr < rows && nc >= 0 && nc < cols\` first, and \`&&\` short-circuits before any bad index is read.
- **\`Array.from({ length: rows }, () => new Array(cols).fill(-1))\`** — one new row per slot. See the snippet below for what \`fill(new Array(...))\` does instead.
- **Mark when you push** (\`time[nr][nc] = ...\` before \`queue.push\`) so a cell reached by two rotten neighbours in the same minute is queued once.
- **\`===\`** against named constants \`FRESH\`/\`ROTTEN\` — clearer than magic numbers and no type coercion.

📌 **Interview term: Visited marking on enqueue** — recording "this node has been reached" at the moment it enters the queue. It caps the queue at one entry per node and is what keeps BFS at O(V + E).

The level-by-level form many interviewers expect — it builds a new \`next\` array for each minute (so no \`shift()\` at all) and rots the grid **in place**, which changes the caller's data:

~~~javascript
// Level-by-level BFS: one pass of the inner loop = one minute. Rots grid IN PLACE.
function orangesRotting(grid) {
  const rows = grid.length, cols = grid[0].length;
  let queue = [];
  let fresh = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 2) queue.push([r, c]);
      else if (grid[r][c] === 1) fresh++;
    }
  }
  let minutes = 0;
  while (queue.length > 0 && fresh > 0) {    // "&& fresh > 0" avoids counting one extra minute
    const next = [];                          // the next level goes in a new array: no shift()
    for (const [r, c] of queue) {
      for (const [nr, nc] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]) {
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === 1) {
          grid[nr][nc] = 2;                   // mark rotten when queued
          fresh--;
          next.push([nr, nc]);
        }
      }
    }
    queue = next;
    minutes++;
  }
  return fresh === 0 ? minutes : -1;
}

const grid = [[2, 1, 1], [1, 1, 0], [0, 1, 1]];
console.log(orangesRotting(grid));
console.log('caller grid afterwards: ' + JSON.stringify(grid));   // the input was modified
console.log(orangesRotting([[2, 1, 1], [0, 1, 1], [1, 0, 1]]), orangesRotting([[0, 2]]), orangesRotting([[0]]));
~~~

~~~text
4
caller grid afterwards: [[2,2,2],[2,2,0],[0,2,2]]
-1 0 0
~~~

The \`&& fresh > 0\` in the \`while\` stops before an extra empty level would add one minute too many. Note the last line: \`console.log\` with several arguments prints them separated by spaces.

And the 2D-array trap, checked by running it:

~~~javascript
let time = new Array(3).fill(new Array(3).fill(-1));   // BUG: one row array, three references
time[0][0] = 0;
console.log('fill(new Array) -> ' + JSON.stringify(time));

time = Array.from({ length: 3 }, () => new Array(3).fill(-1));
time[0][0] = 0;
console.log('Array.from      -> ' + JSON.stringify(time));
~~~

~~~text
fill(new Array) -> [[0,-1,-1],[0,-1,-1],[0,-1,-1]]
Array.from      -> [[0,-1,-1],[-1,-1,-1],[-1,-1,-1]]
~~~

\`fill\` puts the **same** row object in every slot, so setting one cell sets the whole column.

## 5. Verified: Running the Code

Both examples were saved as \`main.js\` and run with \`node main.js\` (Node.js v22). Example 1 runs six grids — the three LeetCode 994 examples, a grid with nothing in it, a lone fresh orange with no rotten one, and a row rotting from both ends — then prints the "minute each orange rotted" map for the first one:

~~~text
LeetCode 1: 4
LeetCode 2: -1
LeetCode 3: 0
only empty: 0
one fresh, no rotten: -1
rotten at both ends: 2
minute each orange rotted in LeetCode 1:
  0 1 2
  1 2 .
  . 3 4
2
~~~

Check the cases: LeetCode 2 is -1 because the bottom-left orange is fenced off by empty cells; LeetCode 3 and "only empty" are 0 because nothing fresh exists; "rotten at both ends" is 2, not 4, because the two waves meet in the middle — that is the multi-source effect.

Example 2 compares three correct approaches on an n × n grid whose whole left column is rotten (n sources) and everything else fresh, so it takes n - 1 minutes:

~~~text
10x10: minutes=9 all agree=true
  simulation cells scanned:   1000
  one BFS per rotten orange:  910
  multi-source BFS pops:      100
20x20: minutes=19 all agree=true
  simulation cells scanned:   8000
  one BFS per rotten orange:  7620
  multi-source BFS pops:      400
40x40: minutes=39 all agree=true
  simulation cells scanned:   64000
  one BFS per rotten orange:  62440
  multi-source BFS pops:      1600
~~~

The multi-source BFS pops each cell exactly once (n² pops). The simulation rescans all n² cells every minute, n times: n³. Running a separate BFS from each of the n rotten oranges is also about n³. Doubling n from 20 to 40 multiplied the BFS work by 4 and the other two by about 8.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Minute-by-minute simulation | O(minutes × R × C) | O(R × C) | Every minute rescans the grid; minutes can approach R × C |
| One BFS per rotten orange | O(k × R × C) | O(R × C) | k full BFS runs |
| Multi-source BFS | O(R × C) | O(R × C) | Every cell is pushed and popped at most once, and checks 4 neighbours |

R and C are the numbers of rows and columns. With the head-index queue the array keeps every popped cell until the function returns — still O(R × C), the same bound as the worst-case queue.

## Edge Cases

- **No fresh oranges** — return 0, even with no rotten ones (\`[[0]]\`, \`[[0, 2]]\`).
- **Fresh oranges but no rotten ones** — the queue starts empty, \`fresh > 0\`, return -1 (\`[[1]]\`).
- **An unreachable fresh orange** — walled off by empty cells: -1 (LeetCode 2).
- **Several rotten oranges** — they spread together; each orange gets the distance to its **nearest** source.
- **A single row or column** — the bounds checks handle it.
- **Empty grid (\`[]\`)** — \`grid[0].length\` throws \`TypeError\`; guard with \`if (grid.length === 0) return 0\` if that input is allowed.

## Common Pitfalls

- **One BFS per rotten orange** — gives wrong minutes if you overwrite times, and costs O(k × R × C) even when done right; seed one queue with all sources.
- **Missing bounds checks** — \`grid[-1][c]\` throws, \`grid[r][-1]\` silently returns \`undefined\`; check before indexing.
- **\`new Array(rows).fill(new Array(cols).fill(-1))\`** — one shared row, as shown above.
- **\`queue.shift()\` per pop** — may make the BFS quadratic on big grids.
- **Counting one minute too many** in the level loop — stop when \`fresh === 0\`.
- **Mutating the caller's grid without saying so** — copy with \`grid.map((row) => row.slice())\` if the input must be preserved (example 2's simulation does that).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">It is a multi-source BFS: push <strong style="color:#ffca28;">every</strong> rotten orange into the queue at minute 0, count the fresh ones, then expand one level per minute, rotting fresh neighbours and decrementing the count.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How I get the answer:</strong> <span style="color:#f0e2c8;">The last minute at which something rotted is the answer; if the fresh count is not 0 when the queue empties, some orange is walled off and I return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-1</code>; with nothing fresh at the start the answer is 0.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">O(R × C) time and space — every cell is pushed and popped at most once — compared with O(minutes × R × C) for re-simulating the grid every minute.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why multi-source:</strong> <span style="color:#f0e2c8;">All rotten oranges spread at the same time, so a single BFS seeded with all of them gives each orange its distance to the <strong style="color:#ffca28;">nearest</strong> rotten one; one BFS per source would cost O(k × R × C).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The JavaScript detail:</strong> <span style="color:#f0e2c8;">I use a head index (or a new <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code> array per minute) instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shift()</code>, check bounds before indexing because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">grid[-1][c]</code> throws while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">grid[r][-1]</code> is silently <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>, and build 2D arrays with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.from</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if rot also spreads diagonally?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DIRS</code> changes: add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 1]</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, -1]</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[-1, 1]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[-1, -1]</code>. The BFS and the O(R × C) bound stay the same, with 8 checks per cell.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it without modifying the input grid?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — keep a separate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">time</code> grid (as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rotTimes</code> does) or a visited <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r * cols + c</code> numbers. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[r, c]</code> arrays would not work: arrays are compared by reference, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set.has([0, 1])</code> is always <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does BFS give the minimum number of minutes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">BFS pops nodes in order of distance from the sources, so the first time a fresh orange is reached is along a shortest path — and here distance is exactly time, since every step takes one minute.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make it faster on a huge grid?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store each cell as one integer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r * cols + c</code> in an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Int32Array</code> queue of size R × C, so there is no per-cell array allocation, and use an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Int8Array</code> for the grid state. The algorithm is unchanged; the constant factor drops.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where else does multi-source BFS appear?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Distance to the nearest exit in "Walls and Gates", distance to the nearest 0 in "01 Matrix", and the nearest store to every cell of a map — any "distance to the nearest of several sources" question.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Grid as an implicit graph** | Cells are nodes, side-by-side cells are edges; neighbours computed on the fly |
| **BFS level (layer)** | All nodes at the same distance from the start; here, the oranges that rot in the same minute |
| **Multi-source BFS** | A BFS whose queue starts with every source at distance 0 |
| **Super source** | An imaginary node joined to every source; multi-source BFS is a normal BFS from it |
| **Visited marking on enqueue** | Mark a node when it enters the queue so it is queued only once |

---
**Conclusion:** Rotting Oranges is a shortest-distance question on a grid, and because every rotten orange starts spreading at the same moment, the right tool is a **multi-source BFS**: push every rotten orange at time 0, expand one level per minute, and count fresh oranges to tell the answer from -1. That is O(rows × cols) — each cell is touched once — instead of the O(minutes × rows × cols) simulation or one BFS per source. In JavaScript, use a head index or a per-level \`next\` array instead of \`shift()\`, check bounds before indexing, build 2D arrays with \`Array.from\`, and say whether you rot the input in place. The same pattern solves "Walls and Gates" and "01 Matrix", and the same level-by-level BFS finds the shortest chain in [Word Ladder](/interview-question/how-do-you-solve-the-word-ladder-problem).`,
        examples: [
          {
            label: "Multi-source BFS on six grids, plus the minute each orange rotted",
            code: `const EMPTY = 0, FRESH = 1, ROTTEN = 2;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Multi-source BFS. Returns [minutes or -1, grid of the minute each cell rotted].
function rotTimes(grid) {
  const rows = grid.length, cols = grid[0].length;
  const time = Array.from({ length: rows }, () => new Array(cols).fill(-1)); // -1 = never rotted
  const queue = [];
  let fresh = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === ROTTEN) { time[r][c] = 0; queue.push([r, c]); } // ALL start at minute 0
      else if (grid[r][c] === FRESH) fresh++;
    }
  }
  let minutes = 0;
  for (let head = 0; head < queue.length; head++) {
    const [r, c] = queue[head];
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols &&
          grid[nr][nc] === FRESH && time[nr][nc] === -1) {
        time[nr][nc] = time[r][c] + 1;               // one minute after its neighbour
        minutes = Math.max(minutes, time[nr][nc]);
        fresh--;
        queue.push([nr, nc]);
      }
    }
  }
  return [fresh === 0 ? minutes : -1, time];
}

function orangesRotting(grid) {
  return rotTimes(grid)[0];
}

const cases = [['LeetCode 1', [[2, 1, 1], [1, 1, 0], [0, 1, 1]]],
  ['LeetCode 2', [[2, 1, 1], [0, 1, 1], [1, 0, 1]]],
  ['LeetCode 3', [[0, 2]]],
  ['only empty', [[0]]],
  ['one fresh, no rotten', [[1]]],
  ['rotten at both ends', [[2, 1, 1, 1, 2]]]];
for (const [name, grid] of cases) console.log(name + ': ' + orangesRotting(grid));

const [, time] = rotTimes([[2, 1, 1], [1, 1, 0], [0, 1, 1]]);
console.log('minute each orange rotted in LeetCode 1:');
for (const row of time) console.log('  ' + row.map((t) => (t === -1 ? '.' : String(t))).join(' '));
console.log(orangesRotting([[2, 1], [1, 1]])); // 2`,
          },
          {
            label: "Simulation vs one BFS per rotten orange vs multi-source BFS: counting the work",
            code: `const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function neighbours(r, c, rows, cols) {
  const out = [];
  for (const [dr, dc] of DIRS) {
    if (r + dr >= 0 && r + dr < rows && c + dc >= 0 && c + dc < cols) out.push([r + dr, c + dc]);
  }
  return out;
}

// Minute-by-minute simulation: rescan the whole grid every minute.
function simulate(grid) {
  const g = grid.map((row) => row.slice());          // copy each row: do not touch the input
  const rows = g.length, cols = g[0].length;
  let minutes = 0, scanned = 0;
  while (true) {
    const toRot = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        scanned++;
        if (g[r][c] === 1 && neighbours(r, c, rows, cols).some(([nr, nc]) => g[nr][nc] === 2)) {
          toRot.push([r, c]);
        }
      }
    }
    if (toRot.length === 0) break;
    for (const [r, c] of toRot) g[r][c] = 2;          // rot them only after the scan: same minute
    minutes++;
  }
  const fresh = g.flat().filter((v) => v === 1).length;
  return [fresh === 0 ? minutes : -1, scanned];
}

function bfsFrom(grid, sources) {
  const rows = grid.length, cols = grid[0].length;
  const dist = Array.from({ length: rows }, () => new Array(cols).fill(-1));
  const queue = [];
  for (const [r, c] of sources) { dist[r][c] = 0; queue.push([r, c]); }
  let head = 0;
  while (head < queue.length) {
    const [r, c] = queue[head++];
    for (const [nr, nc] of neighbours(r, c, rows, cols)) {
      if (grid[nr][nc] === 1 && dist[nr][nc] === -1) {
        dist[nr][nc] = dist[r][c] + 1;
        queue.push([nr, nc]);
      }
    }
  }
  return [dist, head];                                // head = number of pops
}

function answerFrom(grid, dist) {
  let worst = 0;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c] === 1) {
        if (dist[r][c] === -1) return -1;
        worst = Math.max(worst, dist[r][c]);
      }
    }
  }
  return worst;
}

function sourcesOf(grid) {
  const s = [];
  grid.forEach((row, r) => row.forEach((v, c) => { if (v === 2) s.push([r, c]); }));
  return s;
}

function oneBfsPerSource(grid) {
  const rows = grid.length, cols = grid[0].length;
  const best = Array.from({ length: rows }, () => new Array(cols).fill(-1));
  let total = 0;
  for (const s of sourcesOf(grid)) {
    const [dist, pops] = bfsFrom(grid, [s]);
    total += pops;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (dist[r][c] !== -1 && (best[r][c] === -1 || dist[r][c] < best[r][c])) best[r][c] = dist[r][c];
      }
    }
  }
  return [answerFrom(grid, best), total];
}

function multiSource(grid) {
  const [dist, pops] = bfsFrom(grid, sourcesOf(grid));  // every source in the queue at minute 0
  return [answerFrom(grid, dist), pops];
}

for (const n of [10, 20, 40]) {
  const grid = Array.from({ length: n }, () => Array.from({ length: n }, (_, c) => (c === 0 ? 2 : 1)));
  const [a, s] = simulate(grid);
  const [b, p] = oneBfsPerSource(grid);
  const [m, q] = multiSource(grid);
  console.log(n + 'x' + n + ': minutes=' + m + ' all agree=' + (a === b && b === m));
  console.log('  simulation cells scanned:   ' + s);
  console.log('  one BFS per rotten orange:  ' + p);
  console.log('  multi-source BFS pops:      ' + q);
}`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You have an \`int[][] grid\` where 0 is an empty cell, 1 is a fresh orange and 2 is a rotten orange. Every minute, each rotten orange rots the fresh oranges directly up, down, left and right of it. Return the minimum number of minutes until no fresh orange is left, or -1 if that is impossible. Please solve it in Java."

**What a strong answer should cover:**
- Seeing the grid as a graph and the spread as BFS levels: level k = the oranges that rot at minute k.
- **Multi-source BFS**: put **every** rotten orange in the queue at time 0 before the loop — not one BFS per rotten orange.
- Counting fresh oranges up front to detect the **-1** case, and the **0** case when nothing is fresh.
- O(rows × cols) time and space, versus O(minutes × rows × cols) for a minute-by-minute simulation.
- Java specifics: \`ArrayDeque<int[]>\` for cells, reading \`queue.size()\` **once** per level, bounds checks to avoid \`ArrayIndexOutOfBoundsException\`, and \`grid.clone()\` being a shallow copy if you need to preserve the input.

**Clarifying questions expected:**
- Four directions or eight? What if there are no fresh oranges?
- May I modify the input grid?

**Code / implementation expected:** Yes — an \`orangesRotting(int[][] grid)\` method in Java using multi-source BFS, tested on the impossible case and the no-fresh case.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know Java arrays, loops and basic collections; BFS and grids-as-graphs are explained from scratch.
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by actually compiling and running the code with \`javac\` and \`java\` (OpenJDK 21); nothing is typed in by hand.

## 1. Why This Even Matters — A Story First

You leave a crate of oranges in the sun. A few are already rotten. Every minute, each rotten orange spoils the fresh oranges directly above, below, left and right of it — not diagonally, and not across an empty slot. How many minutes until no fresh orange is left? And is there an orange that will **never** rot because it is walled off by empty slots?

Picture dropping several stones into a pond at the same moment. Ripples spread from **all** of them at once, at the same speed, and a point on the water is reached by whichever ripple gets there first. That is exactly how the rot spreads — and it is exactly what a **multi-source breadth-first search** computes: start the search from every rotten orange at time 0, all together, and let the "waves" expand one step per minute.

The same pattern shows up everywhere: how long until a rumour reaches everyone in an office with several gossips, the distance from every empty room to the nearest exit (LeetCode "Walls and Gates"), the distance from every cell to the nearest 0 ("01 Matrix"), or fire spreading from several sparks. Learn it once here.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What do the cell values mean — 0 empty, 1 fresh, 2 rotten? | The standard encoding (LeetCode 994). Confirm it before coding. |
| Does rot spread in 4 directions, or 8 (diagonals too)? | Changes the direction list only, but answering the wrong one gives wrong minutes. |
| What should I return if some orange can never rot? | Usually **-1**. You must detect it: count fresh oranges and check that the count reaches 0. |
| What if there are no fresh oranges at the start? | The answer is **0**, even if there are no rotten oranges either. |
| May I modify the input grid? | Marking oranges rotten in place saves a visited array; otherwise copy the grid or keep a separate \`time\`/\`visited\` grid. |
| How large can the grid be? | Up to 10 × 10 on LeetCode, but the O(rows × cols) solution scales to millions of cells. |

## 3. The Core Idea: One BFS, Many Starting Points

📌 **Interview term: Grid as an implicit graph** — every cell is a node and every pair of side-by-side cells is an edge. You never build an adjacency list; you compute the 4 neighbours \`(r±1, c)\` and \`(r, c±1)\` on the fly and skip those that fall off the grid. The same view drives [counting islands](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid).

📌 **Interview term: BFS level (layer)** — breadth-first search visits nodes in order of distance from the start: first everything at distance 1, then everything at distance 2, and so on. Each "ring" is a level. Here, **level k = the oranges that rot at minute k**. Why BFS (and not DFS) gives shortest distances in unweighted graphs is covered in [What is the difference between BFS and DFS?](/interview-question/what-is-the-difference-between-bfs-and-dfs) and [When would you use BFS over Dijkstra?](/interview-question/when-would-you-use-bfs-over-dijkstra-for-shortest-paths)

📌 **Interview term: Multi-source BFS** — a BFS whose queue starts with **all** the sources at distance 0, instead of a single start node. Every node then gets its distance to the **nearest** source, in one pass.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="A super source S joined to three rotten oranges R1 R2 R3 by dashed edges. From the rotten oranges the BFS wave reaches the fresh oranges at minute 1 and then minute 2">
  <defs>
    <marker id="ro22-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="40" y="125" width="90" height="50" rx="10"/>
  <text class="d-text" x="85" y="155" text-anchor="middle">S</text>
  <path class="d-edge-dashed" d="M 130 140 L 222 70" marker-end="url(#ro22-arrow)"/>
  <path class="d-edge-dashed" d="M 130 150 L 222 150" marker-end="url(#ro22-arrow)"/>
  <path class="d-edge-dashed" d="M 130 160 L 222 230" marker-end="url(#ro22-arrow)"/>
  <rect class="d-box-accent" x="230" y="45" width="100" height="46" rx="8"/>
  <text class="d-text d-accent" x="280" y="74" text-anchor="middle">R1 min 0</text>
  <rect class="d-box-accent" x="230" y="127" width="100" height="46" rx="8"/>
  <text class="d-text d-accent" x="280" y="156" text-anchor="middle">R2 min 0</text>
  <rect class="d-box-accent" x="230" y="209" width="100" height="46" rx="8"/>
  <text class="d-text d-accent" x="280" y="238" text-anchor="middle">R3 min 0</text>
  <path class="d-edge" d="M 330 68 L 402 108" marker-end="url(#ro22-arrow)"/>
  <path class="d-edge" d="M 330 232 L 402 192" marker-end="url(#ro22-arrow)"/>
  <rect class="d-box" x="410" y="90" width="100" height="46" rx="8"/>
  <text class="d-text" x="460" y="119" text-anchor="middle">min 1</text>
  <rect class="d-box" x="410" y="166" width="100" height="46" rx="8"/>
  <text class="d-text" x="460" y="195" text-anchor="middle">min 1</text>
  <path class="d-edge" d="M 510 136 L 562 146" marker-end="url(#ro22-arrow)"/>
  <rect class="d-box" x="570" y="127" width="90" height="46" rx="8"/>
  <text class="d-text" x="615" y="156" text-anchor="middle">min 2</text>
</svg>

A helpful way to see multi-source BFS: imagine one extra "super source" node S joined to every rotten orange (the dashed edges). A normal single-source BFS from S would put all the rotten oranges at the first level — which is exactly what "push every rotten orange into the queue before starting" does, without ever building S.

### Why not run one BFS per rotten orange?

You could run a separate BFS from each rotten orange and keep, for every fresh orange, the smallest distance seen. That gives the right answer, but with \`k\` rotten oranges it costs O(k × rows × cols). Running the minute-by-minute simulation literally — rescan the whole grid every minute and rot whatever touches a rotten orange — is also correct but costs O(minutes × rows × cols), and the number of minutes can be close to rows × cols on a snake-shaped grid. Multi-source BFS touches each cell **once**: O(rows × cols). Example 2 counts all three.

### The algorithm

1. Scan the grid once: push every rotten cell \`(r, c)\` into the queue with time 0, and count the fresh oranges.
2. While the queue is not empty, pop a cell. For each of its 4 neighbours that is inside the grid and **fresh and not yet reached**: record its time as the popped cell time + 1, decrement the fresh count, and push it.
3. When the queue is empty: if the fresh count is 0, the answer is the largest time recorded (0 if nothing had to rot); otherwise return **-1**.

Two equivalent ways to track minutes:

- **Store a time per cell** (\`time[nr][nc] = time[r][c] + 1\`) and take the maximum — used in example 1, and it gives you the whole "when did each orange rot" map.
- **Process the queue level by level**: read the queue size, pop exactly that many cells (that is one minute), then add 1 to \`minutes\`. Stop when the fresh count hits 0, or you count one extra, empty minute at the end.

Here is the "minute each orange rotted" map for the first LeetCode example, \`[[2,1,1],[1,1,0],[0,1,1]]\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 680 290" role="img" aria-label="A 3 by 3 grid of rot times. Row one is 0 1 2. Row two is 1 2 and an empty cell. Row three is an empty cell then 3 and 4">
  <rect class="d-box-accent" x="200" y="30" width="80" height="70" rx="6"/>
  <text class="d-text d-accent" x="240" y="72" text-anchor="middle">0</text>
  <rect class="d-box" x="300" y="30" width="80" height="70" rx="6"/>
  <text class="d-text" x="340" y="72" text-anchor="middle">1</text>
  <rect class="d-box" x="400" y="30" width="80" height="70" rx="6"/>
  <text class="d-text" x="440" y="72" text-anchor="middle">2</text>
  <rect class="d-box" x="200" y="115" width="80" height="70" rx="6"/>
  <text class="d-text" x="240" y="157" text-anchor="middle">1</text>
  <rect class="d-box" x="300" y="115" width="80" height="70" rx="6"/>
  <text class="d-text" x="340" y="157" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="400" y="115" width="80" height="70" rx="6"/>
  <text class="d-sub" x="440" y="157" text-anchor="middle">empty</text>
  <rect class="d-box-muted" x="200" y="200" width="80" height="70" rx="6"/>
  <text class="d-sub" x="240" y="242" text-anchor="middle">empty</text>
  <rect class="d-box" x="300" y="200" width="80" height="70" rx="6"/>
  <text class="d-text" x="340" y="242" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="400" y="200" width="80" height="70" rx="6"/>
  <text class="d-text d-accent" x="440" y="242" text-anchor="middle">4</text>
</svg>

The single rotten orange in the top-left corner is minute 0. The rot reaches its two neighbours at minute 1, then spreads along the only open route around the empty cells, reaching the bottom-right orange last at minute **4** — the answer. Note that the bottom-right orange is 4 steps away even though it looks "diagonally close": rot does not move diagonally.


## 4. The Code in Java

This version fills a separate \`time\` grid, so it does **not** modify the caller's grid and it can report when each orange rotted:

~~~java
static final int EMPTY = 0, FRESH = 1, ROTTEN = 2;
static final int[][] DIRS = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};

static int rotTimes(int[][] grid, int[][] time) {
    int rows = grid.length, cols = grid[0].length;
    for (int[] row : time) Arrays.fill(row, -1);     // -1 = never rotted (or empty)
    ArrayDeque<int[]> queue = new ArrayDeque<>();
    int fresh = 0;
    for (int r = 0; r < rows; r++)
        for (int c = 0; c < cols; c++) {
            if (grid[r][c] == ROTTEN) { time[r][c] = 0; queue.offer(new int[]{r, c}); }  // ALL at minute 0
            else if (grid[r][c] == FRESH) fresh++;
        }
    int minutes = 0;
    while (!queue.isEmpty()) {
        int[] cell = queue.poll();
        int r = cell[0], c = cell[1];
        for (int[] d : DIRS) {
            int nr = r + d[0], nc = c + d[1];
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
                    && grid[nr][nc] == FRESH && time[nr][nc] == -1) {
                time[nr][nc] = time[r][c] + 1;       // one minute after its neighbour
                minutes = Math.max(minutes, time[nr][nc]);
                fresh--;
                queue.offer(new int[]{nr, nc});
            }
        }
    }
    return fresh == 0 ? minutes : -1;
}
~~~

The Java parts that matter:

- **\`ArrayDeque<int[]>\`** — each queued cell is a tiny \`int[]{r, c}\`. Generic collections cannot hold primitives, and an \`int[]\` avoids boxing two \`Integer\`s. For very large grids you can encode the cell as one \`int\` (\`r * cols + c\`) in an \`int[]\` used as a circular buffer to avoid one allocation per cell.
- **\`static final int[][] DIRS\`** — one loop over four direction pairs instead of four copy-pasted \`if\` blocks.
- **Bounds first, then the cell.** \`&&\` short-circuits, so \`grid[nr][nc]\` is only read when \`nr\` and \`nc\` are valid. Reading \`grid[-1][c]\` throws \`ArrayIndexOutOfBoundsException\` — loud, which is better than silent, but still a bug.
- **\`Arrays.fill(row, -1)\` on every row** — Java zero-fills new \`int\` arrays, and 0 is a valid minute (the rotten oranges), so "never reached" needs its own value.
- **Mark when you offer** (\`time[nr][nc] = ...\` before \`queue.offer\`) so a cell reached by two rotten neighbours in the same minute is queued once.

📌 **Interview term: Visited marking on enqueue** — recording "this node has been reached" at the moment it enters the queue. It caps the queue at one entry per node and is what keeps BFS at O(V + E).

The level-by-level form many interviewers expect — it rots the grid **in place**, so the caller's array changes:

~~~java
import java.util.*;

public class Main {
    // Level-by-level BFS: one pass of the inner loop = one minute. Rots grid IN PLACE.
    static int orangesRotting(int[][] grid) {
        int rows = grid.length, cols = grid[0].length, fresh = 0;
        ArrayDeque<int[]> queue = new ArrayDeque<>();
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++) {
                if (grid[r][c] == 2) queue.offer(new int[]{r, c});
                else if (grid[r][c] == 1) fresh++;
            }
        int minutes = 0;
        int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!queue.isEmpty() && fresh > 0) {   // "&& fresh > 0" avoids one extra minute
            for (int k = queue.size(); k > 0; k--) {   // size() read ONCE: this minute only
                int[] cell = queue.poll();
                for (int[] d : dirs) {
                    int nr = cell[0] + d[0], nc = cell[1] + d[1];
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] == 1) {
                        grid[nr][nc] = 2;              // mark rotten when queued
                        fresh--;
                        queue.offer(new int[]{nr, nc});
                    }
                }
            }
            minutes++;
        }
        return fresh == 0 ? minutes : -1;
    }

    public static void main(String[] args) {
        int[][] grid = {{2, 1, 1}, {1, 1, 0}, {0, 1, 1}};
        System.out.println(orangesRotting(grid));
        System.out.println("caller grid afterwards: " + Arrays.deepToString(grid));
        System.out.println(orangesRotting(new int[][]{{2, 1, 1}, {0, 1, 1}, {1, 0, 1}}) + " "
                + orangesRotting(new int[][]{{0, 2}}) + " " + orangesRotting(new int[][]{{0}}));
    }
}
~~~

~~~text
4
caller grid afterwards: [[2, 2, 2], [2, 2, 0], [0, 2, 2]]
-1 0 0
~~~

\`for (int k = queue.size(); k > 0; k--)\` reads the size **once**, so cells offered during this minute wait for the next pass. Writing \`for (int k = 0; k < queue.size(); k++)\` re-reads a growing size and merges minutes together — a classic level-BFS bug. The \`&& fresh > 0\` stops before an extra empty level adds one minute too many.

If you need to keep the input intact, copy it — but carefully:

~~~java
import java.util.*;

public class Main {
    public static void main(String[] args) {
        int[][] grid = {{2, 1}, {1, 1}};
        int[][] shallow = grid.clone();          // copies the outer array only
        shallow[0][1] = 2;
        System.out.println("after editing clone(): original = " + Arrays.deepToString(grid));

        int[][] grid2 = {{2, 1}, {1, 1}};
        int[][] deep = new int[grid2.length][];
        for (int r = 0; r < grid2.length; r++) deep[r] = grid2[r].clone();   // copy every row
        deep[0][1] = 2;
        System.out.println("after editing row copies: original = " + Arrays.deepToString(grid2));
    }
}
~~~

~~~text
after editing clone(): original = [[2, 2], [1, 1]]
after editing row copies: original = [[2, 1], [1, 1]]
~~~

\`clone()\` on an \`int[][]\` copies only the outer array of row references, so the rows are still shared. Clone each row (or use \`Arrays.copyOf\` per row).

## 5. Verified: Running the Code

Both examples were saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21). Example 1 runs six grids — the three LeetCode 994 examples, a grid with nothing in it, a lone fresh orange with no rotten one, and a row rotting from both ends — then prints the "minute each orange rotted" map for the first one:

~~~text
LeetCode 1: 4
LeetCode 2: -1
LeetCode 3: 0
only empty: 0
one fresh, no rotten: -1
rotten at both ends: 2
minute each orange rotted in LeetCode 1:
  0 1 2
  1 2 .
  . 3 4
2
~~~

Check the cases: LeetCode 2 is -1 because the bottom-left orange is fenced off by empty cells; LeetCode 3 and "only empty" are 0 because nothing fresh exists; "rotten at both ends" is 2, not 4, because the two waves meet in the middle — that is the multi-source effect.

Example 2 compares three correct approaches on an n × n grid whose whole left column is rotten (n sources) and everything else fresh, so it takes n - 1 minutes:

~~~text
10x10: minutes=9 all agree=true
  simulation cells scanned:   1000
  one BFS per rotten orange:  910
  multi-source BFS pops:      100
20x20: minutes=19 all agree=true
  simulation cells scanned:   8000
  one BFS per rotten orange:  7620
  multi-source BFS pops:      400
40x40: minutes=39 all agree=true
  simulation cells scanned:   64000
  one BFS per rotten orange:  62440
  multi-source BFS pops:      1600
~~~

The multi-source BFS pops each cell exactly once (n² pops). The simulation rescans all n² cells every minute, n times: n³. Running a separate BFS from each of the n rotten oranges is also about n³. Doubling n from 20 to 40 multiplied the BFS work by 4 and the other two by about 8.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Minute-by-minute simulation | O(minutes × R × C) | O(R × C) | Every minute rescans the grid; minutes can approach R × C |
| One BFS per rotten orange | O(k × R × C) | O(R × C) | k full BFS runs |
| Multi-source BFS | O(R × C) | O(R × C) | Every cell is offered and polled at most once, and checks 4 neighbours |

R and C are the numbers of rows and columns. The space is the \`ArrayDeque\` (up to R × C small arrays in the worst case) plus the \`time\` grid.

## Edge Cases

- **No fresh oranges** — return 0, even with no rotten ones (\`{{0}}\`, \`{{0, 2}}\`).
- **Fresh oranges but no rotten ones** — the queue starts empty, \`fresh > 0\`, return -1 (\`{{1}}\`).
- **An unreachable fresh orange** — walled off by empty cells: -1 (LeetCode 2).
- **Several rotten oranges** — they spread together; each orange gets the distance to its **nearest** source.
- **A single row or column** — the bounds checks handle it.
- **Empty grid (\`new int[0][]\`)** — \`grid[0]\` throws \`ArrayIndexOutOfBoundsException\`; guard with \`if (grid.length == 0) return 0\` if that input is allowed.

## Common Pitfalls

- **One BFS per rotten orange** — wrong if you overwrite times, slow (O(k × R × C)) even if you take the minimum; seed one queue with all sources.
- **\`for (int k = 0; k < queue.size(); k++)\`** in the level loop — \`size()\` grows as you offer, so minutes blur together; read it once.
- **Forgetting \`Arrays.fill(..., -1)\`** — 0 already means "minute 0", so every cell looks reached.
- **\`grid.clone()\` as a "copy"** — shallow; the rows are shared, as the snippet shows.
- **Counting one minute too many** — stop when \`fresh == 0\`.
- **Using \`LinkedList\` or \`Queue<Integer[]>\` out of habit** — works, but \`ArrayDeque<int[]>\` is the lighter, recommended choice.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">It is a multi-source BFS: offer <strong style="color:#ffca28;">every</strong> rotten orange into an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque&lt;int[]&gt;</code> at minute 0, count the fresh ones, then expand one level per minute, rotting fresh neighbours and decrementing the count.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How I get the answer:</strong> <span style="color:#f0e2c8;">The last minute at which something rotted is the answer; if the fresh count is not 0 when the queue empties, some orange is walled off and I return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-1</code>; with nothing fresh at the start the answer is 0.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">O(R × C) time and space — every cell is offered and polled at most once — compared with O(minutes × R × C) for re-simulating the grid every minute.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why multi-source:</strong> <span style="color:#f0e2c8;">All rotten oranges spread at the same time, so a single BFS seeded with all of them gives each orange its distance to the <strong style="color:#ffca28;">nearest</strong> rotten one; one BFS per source would cost O(k × R × C).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The Java detail:</strong> <span style="color:#f0e2c8;">In the level loop I write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for (int k = queue.size(); k &gt; 0; k--)</code> so the size is read once; I check bounds before indexing to avoid <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayIndexOutOfBoundsException</code>; and if I must preserve the input I clone each row, since <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">grid.clone()</code> is shallow.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if rot also spreads diagonally?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DIRS</code> changes: add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{1, 1}</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{1, -1}</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{-1, 1}</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{-1, -1}</code>. The BFS and the O(R × C) bound stay the same, with 8 checks per cell.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int[]</code> cells and not a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">record Cell(int r, int c)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both work. A record is more readable and gets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">equals</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hashCode</code> for free if you ever put cells in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashSet</code>; an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> is what most interview code uses and has no extra class. For huge grids, one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> per cell (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r * cols + c</code>) avoids allocating anything.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does BFS give the minimum number of minutes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">BFS polls nodes in order of distance from the sources, so the first time a fresh orange is reached is along a shortest path — and here distance is exactly time, since every step takes one minute.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if some oranges take two minutes to rot?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then edges have different weights and plain BFS no longer gives the earliest time. Dijkstra with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue&lt;int[]&gt;</code> ordered by time and seeded with all rotten oranges solves it (or a 0-1-BFS-style deque for small integer weights).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where else does multi-source BFS appear?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Distance to the nearest exit in "Walls and Gates", distance to the nearest 0 in "01 Matrix", and nearest-facility maps — any "distance to the nearest of several sources" question.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Grid as an implicit graph** | Cells are nodes, side-by-side cells are edges; neighbours computed on the fly |
| **BFS level (layer)** | All nodes at the same distance from the start; here, the oranges that rot in the same minute |
| **Multi-source BFS** | A BFS whose queue starts with every source at distance 0 |
| **Super source** | An imaginary node joined to every source; multi-source BFS is a normal BFS from it |
| **Visited marking on enqueue** | Mark a node when it enters the queue so it is queued only once |

---
**Conclusion:** Rotting Oranges is a shortest-distance question on a grid, and because every rotten orange starts spreading at the same moment, the right tool is a **multi-source BFS**: offer every rotten orange at time 0, expand one level per minute, and count fresh oranges to tell the answer from -1. That is O(rows × cols) — each cell is touched once — instead of the O(minutes × rows × cols) simulation or one BFS per source. In Java, use \`ArrayDeque<int[]>\`, read \`queue.size()\` once per level, fill "unreached" with -1 because arrays start at 0, and remember that \`clone()\` on a 2D array is shallow. The same pattern solves "Walls and Gates" and "01 Matrix", and the same level-by-level BFS finds the shortest chain in [Word Ladder](/interview-question/how-do-you-solve-the-word-ladder-problem).`,
        examples: [
          {
            label: "Multi-source BFS on six grids, plus the minute each orange rotted",
            code: `import java.util.*;

public class Main {
    static final int EMPTY = 0, FRESH = 1, ROTTEN = 2;
    static final int[][] DIRS = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};

    // Multi-source BFS. Fills time[][] with the minute each cell rotted; returns minutes or -1.
    static int rotTimes(int[][] grid, int[][] time) {
        int rows = grid.length, cols = grid[0].length;
        for (int[] row : time) Arrays.fill(row, -1);     // -1 = never rotted (or empty)
        ArrayDeque<int[]> queue = new ArrayDeque<>();
        int fresh = 0;
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++) {
                if (grid[r][c] == ROTTEN) { time[r][c] = 0; queue.offer(new int[]{r, c}); }  // ALL at minute 0
                else if (grid[r][c] == FRESH) fresh++;
            }
        int minutes = 0;
        while (!queue.isEmpty()) {
            int[] cell = queue.poll();
            int r = cell[0], c = cell[1];
            for (int[] d : DIRS) {
                int nr = r + d[0], nc = c + d[1];
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
                        && grid[nr][nc] == FRESH && time[nr][nc] == -1) {
                    time[nr][nc] = time[r][c] + 1;       // one minute after its neighbour
                    minutes = Math.max(minutes, time[nr][nc]);
                    fresh--;
                    queue.offer(new int[]{nr, nc});
                }
            }
        }
        return fresh == 0 ? minutes : -1;
    }

    static int orangesRotting(int[][] grid) {
        return rotTimes(grid, new int[grid.length][grid[0].length]);
    }

    public static void main(String[] args) {
        String[] names = {"LeetCode 1", "LeetCode 2", "LeetCode 3", "only empty", "one fresh, no rotten", "rotten at both ends"};
        int[][][] grids = {{{2, 1, 1}, {1, 1, 0}, {0, 1, 1}}, {{2, 1, 1}, {0, 1, 1}, {1, 0, 1}},
                {{0, 2}}, {{0}}, {{1}}, {{2, 1, 1, 1, 2}}};
        for (int i = 0; i < names.length; i++) System.out.println(names[i] + ": " + orangesRotting(grids[i]));

        int[][] time = new int[3][3];
        rotTimes(grids[0], time);
        System.out.println("minute each orange rotted in LeetCode 1:");
        for (int[] row : time) {
            StringJoiner sj = new StringJoiner(" ", "  ", "");
            for (int t : row) sj.add(t == -1 ? "." : String.valueOf(t));
            System.out.println(sj);
        }
        System.out.println(orangesRotting(new int[][]{{2, 1}, {1, 1}}));  // 2
    }
}`,
          },
          {
            label: "Simulation vs one BFS per rotten orange vs multi-source BFS: counting the work",
            code: `import java.util.*;

public class Main {
    static final int[][] DIRS = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
    static int rows, cols;

    static boolean inside(int r, int c) { return r >= 0 && r < rows && c >= 0 && c < cols; }

    // Minute-by-minute simulation: rescan the whole grid every minute. Returns {minutes, scanned}.
    static int[] simulate(int[][] grid) {
        int[][] g = new int[rows][];
        for (int r = 0; r < rows; r++) g[r] = grid[r].clone();   // clone() of int[][] is shallow
        int minutes = 0, scanned = 0;
        while (true) {
            List<int[]> toRot = new ArrayList<>();
            for (int r = 0; r < rows; r++)
                for (int c = 0; c < cols; c++) {
                    scanned++;
                    if (g[r][c] != 1) continue;
                    for (int[] d : DIRS)
                        if (inside(r + d[0], c + d[1]) && g[r + d[0]][c + d[1]] == 2) { toRot.add(new int[]{r, c}); break; }
                }
            if (toRot.isEmpty()) break;
            for (int[] cell : toRot) g[cell[0]][cell[1]] = 2;  // rot them only after the scan
            minutes++;
        }
        for (int[] row : g) for (int v : row) if (v == 1) return new int[]{-1, scanned};
        return new int[]{minutes, scanned};
    }

    static int pops;

    static int[][] bfsFrom(int[][] grid, List<int[]> sources) {
        int[][] dist = new int[rows][cols];
        for (int[] row : dist) Arrays.fill(row, -1);
        ArrayDeque<int[]> queue = new ArrayDeque<>();
        for (int[] s : sources) { dist[s[0]][s[1]] = 0; queue.offer(s); }
        while (!queue.isEmpty()) {
            int[] cell = queue.poll();
            pops++;
            for (int[] d : DIRS) {
                int nr = cell[0] + d[0], nc = cell[1] + d[1];
                if (inside(nr, nc) && grid[nr][nc] == 1 && dist[nr][nc] == -1) {
                    dist[nr][nc] = dist[cell[0]][cell[1]] + 1;
                    queue.offer(new int[]{nr, nc});
                }
            }
        }
        return dist;
    }

    static int answerFrom(int[][] grid, int[][] dist) {
        int worst = 0;
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++)
                if (grid[r][c] == 1) {
                    if (dist[r][c] == -1) return -1;
                    worst = Math.max(worst, dist[r][c]);
                }
        return worst;
    }

    static List<int[]> sourcesOf(int[][] grid) {
        List<int[]> s = new ArrayList<>();
        for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) if (grid[r][c] == 2) s.add(new int[]{r, c});
        return s;
    }

    static int oneBfsPerSource(int[][] grid) {
        int[][] best = new int[rows][cols];
        for (int[] row : best) Arrays.fill(row, -1);
        for (int[] s : sourcesOf(grid)) {
            int[][] dist = bfsFrom(grid, List.of(s));
            for (int r = 0; r < rows; r++)
                for (int c = 0; c < cols; c++)
                    if (dist[r][c] != -1 && (best[r][c] == -1 || dist[r][c] < best[r][c])) best[r][c] = dist[r][c];
        }
        return answerFrom(grid, best);
    }

    static int multiSource(int[][] grid) {
        return answerFrom(grid, bfsFrom(grid, sourcesOf(grid)));  // every source at minute 0
    }

    public static void main(String[] args) {
        for (int n : new int[]{10, 20, 40}) {
            rows = cols = n;
            int[][] grid = new int[n][n];
            for (int[] row : grid) { Arrays.fill(row, 1); row[0] = 2; }   // left column rotten
            int[] sim = simulate(grid);
            pops = 0;
            int b = oneBfsPerSource(grid);
            int p = pops;
            pops = 0;
            int m = multiSource(grid);
            System.out.println(n + "x" + n + ": minutes=" + m + " all agree=" + (sim[0] == b && b == m));
            System.out.println("  simulation cells scanned:   " + sim[1]);
            System.out.println("  one BFS per rotten orange:  " + p);
            System.out.println("  multi-source BFS pops:      " + pops);
        }
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You have a \`vector<vector<int>> grid\` where 0 is an empty cell, 1 is a fresh orange and 2 is a rotten orange. Every minute, each rotten orange rots the fresh oranges directly up, down, left and right of it. Return the minimum number of minutes until no fresh orange is left, or -1 if that is impossible. Please solve it in C++."

**What a strong answer should cover:**
- Seeing the grid as a graph and the spread as BFS levels: level k = the oranges that rot at minute k.
- **Multi-source BFS**: put **every** rotten orange in the queue at time 0 before the loop — not one BFS per rotten orange.
- Counting fresh oranges up front to detect the **-1** case, and the **0** case when nothing is fresh.
- O(rows × cols) time and space, versus O(minutes × rows × cols) for a minute-by-minute simulation.
- C++ specifics: \`queue<pair<int, int>>\` with structured bindings, **signed** \`int\` indices (an unsigned \`size_t\` row index minus 1 wraps to a huge number), bounds checks because out-of-range \`[]\` is undefined behaviour, and taking the grid by reference vs by value depending on whether you may mutate it.

**Clarifying questions expected:**
- Four directions or eight? What if there are no fresh oranges?
- May I modify the input grid?

**Code / implementation expected:** Yes — an \`int orangesRotting(vector<vector<int>>& grid)\` in C++17 using multi-source BFS, tested on the impossible case and the no-fresh case.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know basic C++ (\`vector\`, loops, functions); BFS and grids-as-graphs are explained from scratch.
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by actually compiling and running the code with \`g++ -std=c++17\` (GCC 13); nothing is typed in by hand.

## 1. Why This Even Matters — A Story First

You leave a crate of oranges in the sun. A few are already rotten. Every minute, each rotten orange spoils the fresh oranges directly above, below, left and right of it — not diagonally, and not across an empty slot. How many minutes until no fresh orange is left? And is there an orange that will **never** rot because it is walled off by empty slots?

Picture dropping several stones into a pond at the same moment. Ripples spread from **all** of them at once, at the same speed, and a point on the water is reached by whichever ripple gets there first. That is exactly how the rot spreads — and it is exactly what a **multi-source breadth-first search** computes: start the search from every rotten orange at time 0, all together, and let the "waves" expand one step per minute.

The same pattern shows up everywhere: how long until a rumour reaches everyone in an office with several gossips, the distance from every empty room to the nearest exit (LeetCode "Walls and Gates"), the distance from every cell to the nearest 0 ("01 Matrix"), or fire spreading from several sparks. Learn it once here.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What do the cell values mean — 0 empty, 1 fresh, 2 rotten? | The standard encoding (LeetCode 994). Confirm it before coding. |
| Does rot spread in 4 directions, or 8 (diagonals too)? | Changes the direction list only, but answering the wrong one gives wrong minutes. |
| What should I return if some orange can never rot? | Usually **-1**. You must detect it: count fresh oranges and check that the count reaches 0. |
| What if there are no fresh oranges at the start? | The answer is **0**, even if there are no rotten oranges either. |
| May I modify the input grid? | Marking oranges rotten in place saves a visited array; otherwise copy the grid or keep a separate \`time\`/\`visited\` grid. |
| How large can the grid be? | Up to 10 × 10 on LeetCode, but the O(rows × cols) solution scales to millions of cells. |

## 3. The Core Idea: One BFS, Many Starting Points

📌 **Interview term: Grid as an implicit graph** — every cell is a node and every pair of side-by-side cells is an edge. You never build an adjacency list; you compute the 4 neighbours \`(r±1, c)\` and \`(r, c±1)\` on the fly and skip those that fall off the grid. The same view drives [counting islands](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid).

📌 **Interview term: BFS level (layer)** — breadth-first search visits nodes in order of distance from the start: first everything at distance 1, then everything at distance 2, and so on. Each "ring" is a level. Here, **level k = the oranges that rot at minute k**. Why BFS (and not DFS) gives shortest distances in unweighted graphs is covered in [What is the difference between BFS and DFS?](/interview-question/what-is-the-difference-between-bfs-and-dfs) and [When would you use BFS over Dijkstra?](/interview-question/when-would-you-use-bfs-over-dijkstra-for-shortest-paths)

📌 **Interview term: Multi-source BFS** — a BFS whose queue starts with **all** the sources at distance 0, instead of a single start node. Every node then gets its distance to the **nearest** source, in one pass.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="A super source S joined to three rotten oranges R1 R2 R3 by dashed edges. From the rotten oranges the BFS wave reaches the fresh oranges at minute 1 and then minute 2">
  <defs>
    <marker id="ro22-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="40" y="125" width="90" height="50" rx="10"/>
  <text class="d-text" x="85" y="155" text-anchor="middle">S</text>
  <path class="d-edge-dashed" d="M 130 140 L 222 70" marker-end="url(#ro22-arrow)"/>
  <path class="d-edge-dashed" d="M 130 150 L 222 150" marker-end="url(#ro22-arrow)"/>
  <path class="d-edge-dashed" d="M 130 160 L 222 230" marker-end="url(#ro22-arrow)"/>
  <rect class="d-box-accent" x="230" y="45" width="100" height="46" rx="8"/>
  <text class="d-text d-accent" x="280" y="74" text-anchor="middle">R1 min 0</text>
  <rect class="d-box-accent" x="230" y="127" width="100" height="46" rx="8"/>
  <text class="d-text d-accent" x="280" y="156" text-anchor="middle">R2 min 0</text>
  <rect class="d-box-accent" x="230" y="209" width="100" height="46" rx="8"/>
  <text class="d-text d-accent" x="280" y="238" text-anchor="middle">R3 min 0</text>
  <path class="d-edge" d="M 330 68 L 402 108" marker-end="url(#ro22-arrow)"/>
  <path class="d-edge" d="M 330 232 L 402 192" marker-end="url(#ro22-arrow)"/>
  <rect class="d-box" x="410" y="90" width="100" height="46" rx="8"/>
  <text class="d-text" x="460" y="119" text-anchor="middle">min 1</text>
  <rect class="d-box" x="410" y="166" width="100" height="46" rx="8"/>
  <text class="d-text" x="460" y="195" text-anchor="middle">min 1</text>
  <path class="d-edge" d="M 510 136 L 562 146" marker-end="url(#ro22-arrow)"/>
  <rect class="d-box" x="570" y="127" width="90" height="46" rx="8"/>
  <text class="d-text" x="615" y="156" text-anchor="middle">min 2</text>
</svg>

A helpful way to see multi-source BFS: imagine one extra "super source" node S joined to every rotten orange (the dashed edges). A normal single-source BFS from S would put all the rotten oranges at the first level — which is exactly what "push every rotten orange into the queue before starting" does, without ever building S.

### Why not run one BFS per rotten orange?

You could run a separate BFS from each rotten orange and keep, for every fresh orange, the smallest distance seen. That gives the right answer, but with \`k\` rotten oranges it costs O(k × rows × cols). Running the minute-by-minute simulation literally — rescan the whole grid every minute and rot whatever touches a rotten orange — is also correct but costs O(minutes × rows × cols), and the number of minutes can be close to rows × cols on a snake-shaped grid. Multi-source BFS touches each cell **once**: O(rows × cols). Example 2 counts all three.

### The algorithm

1. Scan the grid once: push every rotten cell \`(r, c)\` into the queue with time 0, and count the fresh oranges.
2. While the queue is not empty, pop a cell. For each of its 4 neighbours that is inside the grid and **fresh and not yet reached**: record its time as the popped cell time + 1, decrement the fresh count, and push it.
3. When the queue is empty: if the fresh count is 0, the answer is the largest time recorded (0 if nothing had to rot); otherwise return **-1**.

Two equivalent ways to track minutes:

- **Store a time per cell** (\`time[nr][nc] = time[r][c] + 1\`) and take the maximum — used in example 1, and it gives you the whole "when did each orange rot" map.
- **Process the queue level by level**: read the queue size, pop exactly that many cells (that is one minute), then add 1 to \`minutes\`. Stop when the fresh count hits 0, or you count one extra, empty minute at the end.

Here is the "minute each orange rotted" map for the first LeetCode example, \`[[2,1,1],[1,1,0],[0,1,1]]\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 680 290" role="img" aria-label="A 3 by 3 grid of rot times. Row one is 0 1 2. Row two is 1 2 and an empty cell. Row three is an empty cell then 3 and 4">
  <rect class="d-box-accent" x="200" y="30" width="80" height="70" rx="6"/>
  <text class="d-text d-accent" x="240" y="72" text-anchor="middle">0</text>
  <rect class="d-box" x="300" y="30" width="80" height="70" rx="6"/>
  <text class="d-text" x="340" y="72" text-anchor="middle">1</text>
  <rect class="d-box" x="400" y="30" width="80" height="70" rx="6"/>
  <text class="d-text" x="440" y="72" text-anchor="middle">2</text>
  <rect class="d-box" x="200" y="115" width="80" height="70" rx="6"/>
  <text class="d-text" x="240" y="157" text-anchor="middle">1</text>
  <rect class="d-box" x="300" y="115" width="80" height="70" rx="6"/>
  <text class="d-text" x="340" y="157" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="400" y="115" width="80" height="70" rx="6"/>
  <text class="d-sub" x="440" y="157" text-anchor="middle">empty</text>
  <rect class="d-box-muted" x="200" y="200" width="80" height="70" rx="6"/>
  <text class="d-sub" x="240" y="242" text-anchor="middle">empty</text>
  <rect class="d-box" x="300" y="200" width="80" height="70" rx="6"/>
  <text class="d-text" x="340" y="242" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="400" y="200" width="80" height="70" rx="6"/>
  <text class="d-text d-accent" x="440" y="242" text-anchor="middle">4</text>
</svg>

The single rotten orange in the top-left corner is minute 0. The rot reaches its two neighbours at minute 1, then spreads along the only open route around the empty cells, reaching the bottom-right orange last at minute **4** — the answer. Note that the bottom-right orange is 4 steps away even though it looks "diagonally close": rot does not move diagonally.


## 4. The Code in C++

This version fills a separate \`time\` grid and takes the input by \`const&\`, so it does **not** modify the caller's grid and it can report when each orange rotted:

~~~cpp
const int EMPTY = 0, FRESH = 1, ROTTEN = 2;
const int DR[4] = {1, -1, 0, 0}, DC[4] = {0, 0, 1, -1};
using Grid = vector<vector<int>>;

int rotTimes(const Grid& grid, Grid& time) {
    int rows = grid.size(), cols = grid[0].size();       // int, not size_t: r - 1 may be -1
    time.assign(rows, vector<int>(cols, -1));             // -1 = never rotted (or empty)
    queue<pair<int, int>> q;
    int fresh = 0;
    for (int r = 0; r < rows; r++)
        for (int c = 0; c < cols; c++) {
            if (grid[r][c] == ROTTEN) { time[r][c] = 0; q.push({r, c}); }  // ALL at minute 0
            else if (grid[r][c] == FRESH) fresh++;
        }
    int minutes = 0;
    while (!q.empty()) {
        auto [r, c] = q.front(); q.pop();
        for (int k = 0; k < 4; k++) {
            int nr = r + DR[k], nc = c + DC[k];
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
                && grid[nr][nc] == FRESH && time[nr][nc] == -1) {
                time[nr][nc] = time[r][c] + 1;           // one minute after its neighbour
                minutes = max(minutes, time[nr][nc]);
                fresh--;
                q.push({nr, nc});
            }
        }
    }
    return fresh == 0 ? minutes : -1;
}
~~~

The C++ parts that matter:

- **\`int rows = grid.size()\`** — \`size()\` is an unsigned \`size_t\`. If the row index were \`size_t\`, then \`r - 1\` at \`r = 0\` would wrap around to the largest possible value instead of -1 (the snippet below prints it). Converting to \`int\` once makes \`nr >= 0\` a real check.
- **\`auto [r, c] = q.front(); q.pop();\`** — C++17 structured bindings unpack the \`pair\`. They copy the values out before \`pop()\`, which matters: \`auto& [r, c] = q.front();\` followed by \`pop()\` would leave dangling references.
- **\`DR\`/\`DC\` arrays** — one loop over four directions instead of four copy-pasted blocks.
- **Bounds first, then the cell.** \`&&\` short-circuits, so \`grid[nr][nc]\` is only read for valid indices. Out-of-range \`operator[]\` is undefined behaviour — it may "work", crash, or corrupt memory.
- **\`time.assign(rows, vector<int>(cols, -1))\`** — resizes and fills in one call; -1 because 0 is a real minute.
- **Mark when you push** so a cell reached by two rotten neighbours in the same minute is queued once.

📌 **Interview term: Visited marking on enqueue** — recording "this node has been reached" at the moment it enters the queue. It caps the queue at one entry per node and is what keeps BFS at O(V + E).

The level-by-level form many interviewers expect — it takes the grid by non-const reference and rots it **in place**, so the caller's grid changes:

~~~cpp
#include <iostream>
#include <queue>
#include <utility>
#include <vector>
using namespace std;

// Level-by-level BFS: one pass of the inner loop = one minute. Rots grid IN PLACE.
int orangesRotting(vector<vector<int>>& grid) {
    int rows = grid.size(), cols = grid[0].size(), fresh = 0;
    queue<pair<int, int>> q;
    for (int r = 0; r < rows; r++)
        for (int c = 0; c < cols; c++) {
            if (grid[r][c] == 2) q.push({r, c});
            else if (grid[r][c] == 1) fresh++;
        }
    int minutes = 0;
    const int dr[4] = {1, -1, 0, 0}, dc[4] = {0, 0, 1, -1};
    while (!q.empty() && fresh > 0) {             // "&& fresh > 0" avoids one extra minute
        for (size_t k = q.size(); k > 0; k--) {   // size() read ONCE: this minute only
            auto [r, c] = q.front(); q.pop();
            for (int d = 0; d < 4; d++) {
                int nr = r + dr[d], nc = c + dc[d];
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] == 1) {
                    grid[nr][nc] = 2;              // mark rotten when queued
                    fresh--;
                    q.push({nr, nc});
                }
            }
        }
        minutes++;
    }
    return fresh == 0 ? minutes : -1;
}

int main() {
    vector<vector<int>> grid = {{2, 1, 1}, {1, 1, 0}, {0, 1, 1}};
    cout << orangesRotting(grid) << "\\n";
    cout << "caller grid afterwards:";
    for (auto& row : grid) { cout << " ["; for (size_t c = 0; c < row.size(); c++) cout << (c ? "," : "") << row[c]; cout << "]"; }
    cout << "\\n";
    vector<vector<int>> b = {{2, 1, 1}, {0, 1, 1}, {1, 0, 1}}, c = {{0, 2}}, d = {{0}};
    cout << orangesRotting(b) << " " << orangesRotting(c) << " " << orangesRotting(d) << "\\n";
}
~~~

~~~text
4
caller grid afterwards: [2,2,2] [2,2,0] [0,2,2]
-1 0 0
~~~

\`for (size_t k = q.size(); k > 0; k--)\` reads the size **once**, so cells pushed during this minute wait for the next pass. Counting **down** to 0 with an unsigned counter is safe because the loop stops at \`k > 0\`; counting down with \`k >= 0\` would never stop. The \`&& fresh > 0\` avoids one extra empty minute.

The unsigned-index trap, checked by running it:

~~~cpp
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<vector<int>> grid = {{2, 1}, {1, 1}};
    size_t r = 0;                                 // an unsigned row index
    size_t up = r - 1;                            // wraps around instead of becoming -1
    cout << "size_t 0 - 1 = " << up << "\\n";
    cout << "up < grid.size()? " << boolalpha << (up < grid.size()) << "\\n";
    int ri = 0;                                   // a signed row index
    int upi = ri - 1;
    cout << "int 0 - 1 = " << upi << ", in range? " << (upi >= 0 && upi < (int)grid.size()) << "\\n";
}
~~~

~~~text
size_t 0 - 1 = 18446744073709551615
up < grid.size()? false
int 0 - 1 = -1, in range? false
~~~

The wrapped value happens to fail \`up < grid.size()\`, so a check written only as \`nr < rows\` with unsigned types would "accidentally" work — but mixing signed and unsigned arithmetic is how off-by-one bugs sneak in. Signed \`int\` indices with both checks are the clear version.

## 5. Verified: Running the Code

Both examples were saved as \`main.cpp\` and run with \`g++ -std=c++17 -O2 main.cpp -o main && ./main\` (GCC 13), and once more under \`-fsanitize=address,undefined\`, which reported nothing. Example 1 runs six grids — the three LeetCode 994 examples, a grid with nothing in it, a lone fresh orange with no rotten one, and a row rotting from both ends — then prints the "minute each orange rotted" map for the first one:

~~~text
LeetCode 1: 4
LeetCode 2: -1
LeetCode 3: 0
only empty: 0
one fresh, no rotten: -1
rotten at both ends: 2
minute each orange rotted in LeetCode 1:
  0 1 2
  1 2 .
  . 3 4
2
~~~

Check the cases: LeetCode 2 is -1 because the bottom-left orange is fenced off by empty cells; LeetCode 3 and "only empty" are 0 because nothing fresh exists; "rotten at both ends" is 2, not 4, because the two waves meet in the middle — that is the multi-source effect.

Example 2 compares three correct approaches on an n × n grid whose whole left column is rotten (n sources) and everything else fresh, so it takes n - 1 minutes. The simulation takes its \`Grid\` **by value**, so it gets its own copy to modify:

~~~text
10x10: minutes=9 all agree=true
  simulation cells scanned:   1000
  one BFS per rotten orange:  910
  multi-source BFS pops:      100
20x20: minutes=19 all agree=true
  simulation cells scanned:   8000
  one BFS per rotten orange:  7620
  multi-source BFS pops:      400
40x40: minutes=39 all agree=true
  simulation cells scanned:   64000
  one BFS per rotten orange:  62440
  multi-source BFS pops:      1600
~~~

The multi-source BFS pops each cell exactly once (n² pops). The simulation rescans all n² cells every minute, n times: n³. Running a separate BFS from each of the n rotten oranges is also about n³. Doubling n from 20 to 40 multiplied the BFS work by 4 and the other two by about 8.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Minute-by-minute simulation | O(minutes × R × C) | O(R × C) | Every minute rescans the grid; minutes can approach R × C |
| One BFS per rotten orange | O(k × R × C) | O(R × C) | k full BFS runs |
| Multi-source BFS | O(R × C) | O(R × C) | Every cell is pushed and popped at most once, and checks 4 neighbours |

R and C are the numbers of rows and columns. The space is the \`std::queue\` (up to R × C pairs in the worst case) plus the \`time\` grid.

## Edge Cases

- **No fresh oranges** — return 0, even with no rotten ones (\`{{0}}\`, \`{{0, 2}}\`).
- **Fresh oranges but no rotten ones** — the queue starts empty, \`fresh > 0\`, return -1 (\`{{1}}\`).
- **An unreachable fresh orange** — walled off by empty cells: -1 (LeetCode 2).
- **Several rotten oranges** — they spread together; each orange gets the distance to its **nearest** source.
- **A single row or column** — the bounds checks handle it.
- **Empty grid** — \`grid[0]\` on an empty vector is undefined behaviour; guard with \`if (grid.empty()) return 0\`.

## Common Pitfalls

- **One BFS per rotten orange** — wrong if you overwrite times, O(k × R × C) even if you take the minimum.
- **\`size_t\` row/column indices** — \`r - 1\` wraps around; use \`int\`.
- **\`auto& [r, c] = q.front(); q.pop();\`** — references into a popped element dangle; copy with \`auto [r, c]\`.
- **Out-of-range \`grid[nr][nc]\`** — undefined behaviour, not an exception; check bounds first.
- **Counting one minute too many** in the level loop — stop when \`fresh == 0\`.
- **Taking \`grid\` by value in the main solution** — copies R × C ints per call; take \`const&\` and keep a separate \`time\` grid, or a non-const \`&\` if in-place rotting is allowed.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">It is a multi-source BFS: push <strong style="color:#ffca28;">every</strong> rotten orange into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">queue&lt;pair&lt;int, int&gt;&gt;</code> at minute 0, count the fresh ones, then expand one level per minute, rotting fresh neighbours and decrementing the count.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How I get the answer:</strong> <span style="color:#f0e2c8;">The last minute at which something rotted is the answer; if the fresh count is not 0 when the queue empties, some orange is walled off and I return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-1</code>; with nothing fresh at the start the answer is 0.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">O(R × C) time and space — every cell is pushed and popped at most once — compared with O(minutes × R × C) for re-simulating the grid every minute.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why multi-source:</strong> <span style="color:#f0e2c8;">All rotten oranges spread at the same time, so a single BFS seeded with all of them gives each orange its distance to the <strong style="color:#ffca28;">nearest</strong> rotten one; one BFS per source would cost O(k × R × C).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The C++ detail:</strong> <span style="color:#f0e2c8;">I keep indices as signed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r - 1</code> can be -1, check bounds before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator[]</code> because out-of-range is undefined behaviour, copy the front with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">auto [r, c] = q.front()</code> before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code>, and take the grid by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const&amp;</code> unless in-place rotting is allowed.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if rot also spreads diagonally?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only the direction arrays change: extend <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DR</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DC</code> to the 8 offsets and loop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k &lt; 8</code>. The BFS and the O(R × C) bound stay the same.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make it faster on a huge grid?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Encode each cell as one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r * cols + c</code> in a preallocated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;int&gt;</code> used as the queue with a head index, and keep the state in a flat <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;int8_t&gt;</code>. That removes the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deque</code> chunk allocations and improves cache locality; the algorithm is unchanged.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does BFS give the minimum number of minutes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">BFS pops nodes in order of distance from the sources, so the first time a fresh orange is reached is along a shortest path — and here distance is exactly time, since every step takes one minute.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if some oranges take two minutes to rot?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then edges have different weights and plain BFS no longer gives the earliest time. Dijkstra with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">priority_queue</code> — remember it is a max-heap, so use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">greater&lt;&gt;</code> — seeded with all rotten oranges solves it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where else does multi-source BFS appear?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Distance to the nearest exit in "Walls and Gates", distance to the nearest 0 in "01 Matrix", and nearest-facility maps — any "distance to the nearest of several sources" question.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Grid as an implicit graph** | Cells are nodes, side-by-side cells are edges; neighbours computed on the fly |
| **BFS level (layer)** | All nodes at the same distance from the start; here, the oranges that rot in the same minute |
| **Multi-source BFS** | A BFS whose queue starts with every source at distance 0 |
| **Super source** | An imaginary node joined to every source; multi-source BFS is a normal BFS from it |
| **Visited marking on enqueue** | Mark a node when it enters the queue so it is queued only once |

---
**Conclusion:** Rotting Oranges is a shortest-distance question on a grid, and because every rotten orange starts spreading at the same moment, the right tool is a **multi-source BFS**: push every rotten orange at time 0, expand one level per minute, and count fresh oranges to tell the answer from -1. That is O(rows × cols) — each cell is touched once — instead of the O(minutes × rows × cols) simulation or one BFS per source. In C++, use signed indices, check bounds before \`operator[]\`, copy (not reference) the queue front before \`pop()\`, and choose \`const&\`, \`&\` or by-value for the grid on purpose. The same pattern solves "Walls and Gates" and "01 Matrix", and the same level-by-level BFS finds the shortest chain in [Word Ladder](/interview-question/how-do-you-solve-the-word-ladder-problem).`,
        examples: [
          {
            label: "Multi-source BFS on six grids, plus the minute each orange rotted",
            code: `#include <algorithm>
#include <iostream>
#include <queue>
#include <string>
#include <utility>
#include <vector>
using namespace std;

const int EMPTY = 0, FRESH = 1, ROTTEN = 2;
const int DR[4] = {1, -1, 0, 0}, DC[4] = {0, 0, 1, -1};
using Grid = vector<vector<int>>;

// Multi-source BFS. Fills time with the minute each cell rotted; returns minutes or -1.
int rotTimes(const Grid& grid, Grid& time) {
    int rows = grid.size(), cols = grid[0].size();       // int, not size_t: r - 1 may be -1
    time.assign(rows, vector<int>(cols, -1));             // -1 = never rotted (or empty)
    queue<pair<int, int>> q;
    int fresh = 0;
    for (int r = 0; r < rows; r++)
        for (int c = 0; c < cols; c++) {
            if (grid[r][c] == ROTTEN) { time[r][c] = 0; q.push({r, c}); }  // ALL at minute 0
            else if (grid[r][c] == FRESH) fresh++;
        }
    int minutes = 0;
    while (!q.empty()) {
        auto [r, c] = q.front(); q.pop();
        for (int k = 0; k < 4; k++) {
            int nr = r + DR[k], nc = c + DC[k];
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
                && grid[nr][nc] == FRESH && time[nr][nc] == -1) {
                time[nr][nc] = time[r][c] + 1;           // one minute after its neighbour
                minutes = max(minutes, time[nr][nc]);
                fresh--;
                q.push({nr, nc});
            }
        }
    }
    return fresh == 0 ? minutes : -1;
}

int orangesRotting(const Grid& grid) {
    Grid time;
    return rotTimes(grid, time);
}

int main() {
    vector<pair<string, Grid>> cases = {
        {"LeetCode 1", {{2, 1, 1}, {1, 1, 0}, {0, 1, 1}}},
        {"LeetCode 2", {{2, 1, 1}, {0, 1, 1}, {1, 0, 1}}},
        {"LeetCode 3", {{0, 2}}},
        {"only empty", {{0}}},
        {"one fresh, no rotten", {{1}}},
        {"rotten at both ends", {{2, 1, 1, 1, 2}}}};
    for (auto& [name, grid] : cases) cout << name << ": " << orangesRotting(grid) << "\\n";

    Grid time;
    rotTimes(cases[0].second, time);
    cout << "minute each orange rotted in LeetCode 1:\\n";
    for (auto& row : time) {
        cout << " ";
        for (int t : row) cout << " " << (t == -1 ? string(".") : to_string(t));
        cout << "\\n";
    }
    cout << orangesRotting({{2, 1}, {1, 1}}) << "\\n";  // 2
}`,
          },
          {
            label: "Simulation vs one BFS per rotten orange vs multi-source BFS: counting the work",
            code: `#include <algorithm>
#include <iostream>
#include <queue>
#include <utility>
#include <vector>
using namespace std;

using Grid = vector<vector<int>>;
const int DR[4] = {1, -1, 0, 0}, DC[4] = {0, 0, 1, -1};
int rows, cols;

bool inside(int r, int c) { return r >= 0 && r < rows && c >= 0 && c < cols; }

// Minute-by-minute simulation: rescan the whole grid every minute. Returns {minutes, scanned}.
pair<int, int> simulate(Grid g) {                     // by value: we get our own copy to modify
    int minutes = 0, scanned = 0;
    while (true) {
        vector<pair<int, int>> toRot;
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++) {
                scanned++;
                if (g[r][c] != 1) continue;
                for (int k = 0; k < 4; k++)
                    if (inside(r + DR[k], c + DC[k]) && g[r + DR[k]][c + DC[k]] == 2) { toRot.push_back({r, c}); break; }
            }
        if (toRot.empty()) break;
        for (auto [r, c] : toRot) g[r][c] = 2;        // rot them only after the scan
        minutes++;
    }
    for (auto& row : g) if (count(row.begin(), row.end(), 1)) return {-1, scanned};
    return {minutes, scanned};
}

int pops = 0;

Grid bfsFrom(const Grid& grid, const vector<pair<int, int>>& sources) {
    Grid dist(rows, vector<int>(cols, -1));
    queue<pair<int, int>> q;
    for (auto [r, c] : sources) { dist[r][c] = 0; q.push({r, c}); }
    while (!q.empty()) {
        auto [r, c] = q.front(); q.pop();
        pops++;
        for (int k = 0; k < 4; k++) {
            int nr = r + DR[k], nc = c + DC[k];
            if (inside(nr, nc) && grid[nr][nc] == 1 && dist[nr][nc] == -1) {
                dist[nr][nc] = dist[r][c] + 1;
                q.push({nr, nc});
            }
        }
    }
    return dist;
}

int answerFrom(const Grid& grid, const Grid& dist) {
    int worst = 0;
    for (int r = 0; r < rows; r++)
        for (int c = 0; c < cols; c++)
            if (grid[r][c] == 1) {
                if (dist[r][c] == -1) return -1;
                worst = max(worst, dist[r][c]);
            }
    return worst;
}

vector<pair<int, int>> sourcesOf(const Grid& grid) {
    vector<pair<int, int>> s;
    for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) if (grid[r][c] == 2) s.push_back({r, c});
    return s;
}

int oneBfsPerSource(const Grid& grid) {
    Grid best(rows, vector<int>(cols, -1));
    for (auto s : sourcesOf(grid)) {
        Grid dist = bfsFrom(grid, {s});
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++)
                if (dist[r][c] != -1 && (best[r][c] == -1 || dist[r][c] < best[r][c])) best[r][c] = dist[r][c];
    }
    return answerFrom(grid, best);
}

int multiSource(const Grid& grid) { return answerFrom(grid, bfsFrom(grid, sourcesOf(grid))); }

int main() {
    cout << boolalpha;
    for (int n : {10, 20, 40}) {
        rows = cols = n;
        Grid grid(n, vector<int>(n, 1));
        for (auto& row : grid) row[0] = 2;            // left column rotten
        auto [a, scanned] = simulate(grid);
        pops = 0;
        int b = oneBfsPerSource(grid);
        int p = pops;
        pops = 0;
        int m = multiSource(grid);
        cout << n << "x" << n << ": minutes=" << m << " all agree=" << (a == b && b == m) << "\\n";
        cout << "  simulation cells scanned:   " << scanned << "\\n";
        cout << "  one BFS per rotten orange:  " << p << "\\n";
        cout << "  multi-source BFS pops:      " << pops << "\\n";
    }
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you solve the word ladder problem?",
    difficulty: "hard",
    seoDescription: "Word Ladder as BFS over words: neighbours by one-letter changes, visited-on-enqueue, path rebuilding, bidirectional BFS, and code in 4 languages.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given a begin word, an end word and a list of dictionary words, find the number of words in the shortest transformation sequence from begin to end, where each step changes exactly one letter and every intermediate word must be in the list. Return 0 if there is no such sequence. Please code it in Python."

**What a strong answer should cover:**
- Modelling: words are nodes, one-letter changes are edges, and the graph is **implicit** — generated on demand, not stored.
- BFS because every edge has the same cost, so the first time \`end\` is reached is the shortest chain; the answer counts **words**, not steps.
- Neighbour generation: 26 letters × L positions, kept only if the candidate is in a \`set\`; mark visited **when queued** (e.g. by removing from the set).
- Complexity O(N · 26 · L²) time and O(N · L) space, and why comparing all pairs, O(N² · L), is worse for large N.
- Python specifics: \`set\` (not \`list\`) for membership, \`collections.deque\`, \`string.ascii_lowercase\`, and the O(L) cost of \`word[:i] + ch + word[i+1:]\` because strings are immutable. Bidirectional BFS as the follow-up optimisation.

**Clarifying questions expected:**
- Count words or steps? Must \`endWord\` be in the list?
- Do you want the sequence itself, or all shortest sequences?

**Code / implementation expected:** Yes — a \`ladder_length(begin, end, word_list)\` in Python using BFS with a \`set\`, ideally also returning the chain via a parent map.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know Python strings, sets and dicts; graph search is explained from scratch.
**Difficulty:** Hard
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by actually running the code with \`python3\` (3.13); nothing is typed in by hand.

## 1. Why This Even Matters — A Story First

Lewis Carroll published this puzzle in 1879 as "Doublets": turn one word into another by changing **one letter at a time**, and every step must be a real word. His own example turns HEAD into TAIL: HEAD → HEAL → TEAL → TELL → TALL → TAIL ([Wikipedia: Word ladder](https://en.wikipedia.org/wiki/Word_ladder)).

Try it by hand and you quickly notice you are exploring: from HEAD you could go to HEAL, HEAP, HEAR, READ, BEAD… and from each of those to many more. Wandering down one promising path is how people play; it is **not** how you find the **shortest** chain. For that you want to look at every word one step away, then every word two steps away, and so on — and stop the first time you see the target. That is breadth-first search.

The interview version (LeetCode 127) gives you a \`beginWord\`, an \`endWord\` and a dictionary \`wordList\`, and asks for the **number of words** in the shortest chain, or 0 if there is none. It is rated hard not because the BFS is unusual, but because nobody hands you a graph: you have to see that **words are nodes and one-letter changes are edges**, then generate those edges cheaply.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you want the number of **words** in the chain, or the number of **steps**? | LeetCode counts words: \`hit → hot → dot → dog → cog\` is 5. Steps would be 4. An off-by-one here is the most common wrong answer. |
| Must \`endWord\` be in the word list? Must \`beginWord\`? | \`endWord\` must be (otherwise return 0); \`beginWord\` usually does not have to be. |
| Are all words the same length and lowercase \`a\`–\`z\`? | Lets you generate neighbours by trying 26 letters at each position. |
| Do you need the chain itself, or all shortest chains? | One chain needs a parent map; **all** shortest chains is Word Ladder II, a harder follow-up. |
| How large are N (words) and L (word length)? | Decides between trying 26 letters per position and the wildcard-bucket graph, and whether bidirectional BFS is worth it. |
| Is the word list reused for many queries? | Then precompute the wildcard buckets once — see [building the wildcard graph](/interview-question/word-ladder-shortest-transformation-via-bfs-how-do-you-build-the-wildcard-graph). |

## 3. The Core Idea: An Implicit Graph of Words

📌 **Interview term: Implicit graph** — a graph you never store as an adjacency list. You only have a rule for computing a node's neighbours on demand. Here: the neighbours of a word are all dictionary words that differ from it in exactly one position.

📌 **Interview term: Unweighted shortest path** — when every edge costs the same (one letter change = one step), BFS finds shortest paths, because it reaches every node at distance \`d\` before any node at distance \`d + 1\`. No Dijkstra needed; see [When would you use BFS over Dijkstra?](/interview-question/when-would-you-use-bfs-over-dijkstra-for-shortest-paths)

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="Word graph for hit to cog. hit links to hot. hot links to dot and lot. dot links to dog and lot. lot links to log. dog links to log and cog. log links to cog. Columns show BFS levels 1 to 5">
  <text class="d-sub" x="60" y="28" text-anchor="middle">level 1</text>
  <text class="d-sub" x="190" y="28" text-anchor="middle">level 2</text>
  <text class="d-sub" x="330" y="28" text-anchor="middle">level 3</text>
  <text class="d-sub" x="480" y="28" text-anchor="middle">level 4</text>
  <text class="d-sub" x="630" y="28" text-anchor="middle">level 5</text>
  <line class="d-edge-accent" x1="95" y1="160" x2="155" y2="160"/>
  <line class="d-edge-accent" x1="225" y1="150" x2="295" y2="90"/>
  <line class="d-edge" x1="225" y1="170" x2="295" y2="230"/>
  <line class="d-edge" x1="330" y1="110" x2="330" y2="210"/>
  <line class="d-edge-accent" x1="365" y1="80" x2="445" y2="80"/>
  <line class="d-edge" x1="365" y1="240" x2="445" y2="240"/>
  <line class="d-edge" x1="480" y1="100" x2="480" y2="220"/>
  <line class="d-edge-accent" x1="515" y1="90" x2="595" y2="150"/>
  <line class="d-edge" x1="515" y1="230" x2="595" y2="170"/>
  <rect class="d-box-muted" x="25" y="140" width="70" height="40" rx="8"/>
  <text class="d-text" x="60" y="166" text-anchor="middle">hit</text>
  <rect class="d-box" x="155" y="140" width="70" height="40" rx="8"/>
  <text class="d-text" x="190" y="166" text-anchor="middle">hot</text>
  <rect class="d-box" x="295" y="60" width="70" height="40" rx="8"/>
  <text class="d-text" x="330" y="86" text-anchor="middle">dot</text>
  <rect class="d-box" x="295" y="220" width="70" height="40" rx="8"/>
  <text class="d-text" x="330" y="246" text-anchor="middle">lot</text>
  <rect class="d-box" x="445" y="60" width="70" height="40" rx="8"/>
  <text class="d-text" x="480" y="86" text-anchor="middle">dog</text>
  <rect class="d-box" x="445" y="220" width="70" height="40" rx="8"/>
  <text class="d-text" x="480" y="246" text-anchor="middle">log</text>
  <rect class="d-box-accent" x="595" y="140" width="70" height="40" rx="8"/>
  <text class="d-text d-accent" x="630" y="166" text-anchor="middle">cog</text>
</svg>

Each column is one BFS level. \`cog\` first appears at level 5, so the answer is **5** words. The highlighted route \`hit → hot → dot → dog → cog\` is the one the verified code reconstructs; \`hit → hot → lot → log → cog\` is equally short — BFS returns whichever it reaches first, which depends only on the order neighbours are generated.

### Finding neighbours: two ways

1. **Compare every pair of words** and join those that differ in one letter. That is N² comparisons of L letters each — O(N² · L) before the search even starts. Fine for 50 words, slow for 5,000 if the list is big and words are short.
2. **Generate candidates**: for a word of length L, replace each position with each of the 26 letters and keep the candidates that are in a **hash set** of the dictionary. That is 26 · L candidates per word, each costing O(L) to build and hash, so O(26 · L²) per word and O(N · 26 · L²) overall — independent of N² — which is why it is the standard answer.

A third way — grouping words by **wildcard patterns** such as \`h*t\` — gets rid of the factor 26 and is the subject of its own page: [Word Ladder: how do you build the wildcard graph?](/interview-question/word-ladder-shortest-transformation-via-bfs-how-do-you-build-the-wildcard-graph)

### The algorithm

1. Put the dictionary in a hash set. If \`endWord\` is not in it, return 0.
2. Queue \`beginWord\` with length 1. Remove it from the set if present.
3. Pop a word. If it is \`endWord\`, return its length. Otherwise, for each position and each letter, build the candidate; if the candidate is in the set, **remove it from the set** (that is the visited mark), record its parent, and queue it with length + 1.
4. If the queue empties, return 0.

📌 **Interview term: Visited by deletion** — instead of a separate \`visited\` set, delete a word from the dictionary set the moment it is queued. Any later attempt to reach it fails the membership test, so each word is queued at most once.

📌 **Interview term: Parent map** — a map from each discovered word to the word it was discovered from. Walking it backwards from \`endWord\` rebuilds the chain in O(length).

### Going faster: bidirectional BFS

📌 **Interview term: Bidirectional BFS** — run two BFS searches at once, one forward from \`beginWord\` and one backward from \`endWord\`, always expanding the **smaller** frontier, and stop when they meet. If each word has about \`b\` neighbours and the answer is \`d\` steps away, one-way BFS explores about \`b^d\` words, while two searches that each go half way explore about \`2 · b^(d/2)\` — a far smaller number. It works here because edges are symmetric: if \`hot → dot\` is one letter change, so is \`dot → hot\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 210" role="img" aria-label="Words expanded on a 601 word dictionary. One way BFS expanded 215 words. Bidirectional BFS expanded 30 words">
  <text class="d-text" x="20" y="40">One-way BFS</text>
  <rect class="d-box-muted" x="200" y="20" width="430" height="34" rx="6"/>
  <text class="d-text" x="415" y="43" text-anchor="middle">215 words expanded</text>
  <text class="d-text d-accent" x="20" y="130">Bidirectional BFS</text>
  <rect class="d-box-accent" x="200" y="110" width="60" height="34" rx="6"/>
  <text class="d-text d-accent" x="300" y="133">30 words expanded</text>
</svg>

Those two numbers come from example 2 (the 601-word dictionary, where the answer is a 7-word chain). Both searches return the same length; the bidirectional one did about a seventh of the work.


## 4. The Code in Python

~~~python
from collections import deque
from string import ascii_lowercase


def ladder(begin, end, word_list):
    """BFS over words. Returns (number of words in the shortest chain, the chain) or (0, [])."""
    words = set(word_list)                     # O(1) average membership tests
    if end not in words:
        return 0, []
    words.discard(begin)                       # never come back to the start
    parent = {begin: None}
    queue = deque([begin])
    while queue:
        word = queue.popleft()
        if word == end:                        # first time we pop end = shortest chain
            chain = []
            while word is not None:
                chain.append(word)
                word = parent[word]
            return len(chain), chain[::-1]
        for i in range(len(word)):
            for ch in ascii_lowercase:         # 26 candidates per position
                cand = word[:i] + ch + word[i + 1:]
                if cand in words:
                    words.remove(cand)         # visited: remove when queued
                    parent[cand] = word
                    queue.append(cand)
    return 0, []


def ladder_length(begin, end, word_list):
    return ladder(begin, end, word_list)[0]
~~~

The Python parts that matter:

- **\`words = set(word_list)\`** — the single most important line. \`cand in word_list\` on a **list** is a linear scan, so every one of the 26 · L candidates per word would cost O(N): the solution silently becomes O(N² · 26 · L²). On a \`set\` it is an average O(1) hash lookup (plus O(L) to hash the string). Background: [How does a hash table work?](/interview-question/how-does-a-hash-table-work)
- **\`words.discard(begin)\`** — \`discard\` does nothing if the word is absent, while \`remove\` would raise \`KeyError\`. \`beginWord\` is often not in the list, so \`discard\` is the right call here; inside the loop \`remove\` is safe because we just checked membership.
- **\`word[:i] + ch + word[i + 1:]\`** — Python strings are immutable, so every candidate is a brand-new string built in O(L). That is where one of the two L factors in O(26 · L²) per word comes from (the other is hashing it). Building from a \`list(word)\` and \`"".join(...)\` costs the same O(L).
- **\`string.ascii_lowercase\`** is the constant \`'abcdefghijklmnopqrstuvwxyz'\` — clearer than typing it, and iterating a string yields one character at a time.
- **\`parent = {begin: None}\`** — the parent map; walking it from \`end\` and reversing with \`[::-1]\` gives the chain.
- **Removing on enqueue** — \`words.remove(cand)\` the moment \`cand\` is queued. If you only marked words when they were popped, the same word could be queued many times from different parents in the same level.

A common speed-up is to return as soon as a candidate **equals** \`end\` (one level earlier than waiting to pop it). Example 2's \`one_way\` does that; it changes the work, not the answer.

### Bidirectional BFS in Python

~~~python
def two_way(begin, end, word_list, alphabet):
    remaining = set(word_list)
    if end not in remaining:
        return 0, 0
    remaining.discard(begin)
    remaining.discard(end)
    front, back = [begin], [end]
    length, expanded = 1, 0
    while front and back:
        if len(front) > len(back):            # always grow the smaller frontier
            front, back = back, front
        back_set = set(back)
        nxt = []
        for word in front:
            expanded += 1
            for cand in neighbours(word, alphabet):
                if cand in back_set:          # the two searches meet
                    return length + 1, expanded
                if cand in remaining:
                    remaining.remove(cand)
                    nxt.append(cand)
        front = nxt
        length += 1
    return 0, expanded
~~~

\`front, back = back, front\` swaps the two frontiers with tuple unpacking — no temporary variable. \`length\` counts the words on the path found so far: it starts at 1 (just \`begin\`), grows by one per expanded level on either side, and the meeting edge adds the last word. Frontiers are kept as **lists** so the order is deterministic (a \`set\` would iterate in hash order); the extra \`back_set\` makes the "did we meet?" test O(1).

## 5. Verified: Running the Code

Both examples were saved as \`main.py\` and run with \`python3 main.py\` (Python 3.13). Example 1 runs six cases — the two LeetCode 127 examples, a one-letter dictionary, a pair with no intermediate word, a three-word chain, and a one-step change — and prints the chain found through the parent map:

~~~text
hit -> cog: 5  hit -> hot -> dot -> dog -> cog
hit -> cog: 0
a -> c: 2  a -> c
hot -> dog: 0
hot -> dog: 3  hot -> dot -> dog
lost -> cost: 2  lost -> cost
5
~~~

\`hot -> dog\` with only \`["hot", "dog"]\` is 0: the words differ in two letters and there is no word in between. \`a -> c\` is 2 because \`a → c\` is a single change and the answer counts words.

Example 2 builds four random dictionaries of 4-letter words over the letters \`a\`–\`h\` (fixed seed, so every language builds the same words), always adding \`hhhh\`, and searches from \`aaaa\` to \`hhhh\` both ways, counting how many words each search expanded:

~~~text
dictionary of 301 words: length 0 vs 0
  one-way BFS expanded:        2
  bidirectional BFS expanded:  2
dictionary of 601 words: length 7 vs 7
  one-way BFS expanded:        215
  bidirectional BFS expanded:  30
dictionary of 1201 words: length 5 vs 5
  one-way BFS expanded:        159
  bidirectional BFS expanded:  9
dictionary of 2501 words: length 5 vs 5
  one-way BFS expanded:        322
  bidirectional BFS expanded:  17
~~~

Both searches always agree on the length (0 for the first dictionary, where no chain exists). Bidirectional BFS expanded 30 words instead of 215, 9 instead of 159, and 17 instead of 322. It is not a different complexity class in the worst case, but on real dictionaries it is routinely an order of magnitude less work.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Build all edges by comparing pairs, then BFS | O(N² · L) | O(N²) edges in the worst case | Every pair compared letter by letter |
| BFS with 26-letter candidates (this page) | O(N · 26 · L²) | O(N · L) | Each word is expanded once; 26 · L candidates each, each O(L) to build and hash |
| Bidirectional BFS | Same worst case, far less in practice | O(N · L) | Two frontiers of roughly \`b^(d/2)\` words instead of one of \`b^d\` |
| BFS over wildcard buckets | O(N · L²) | O(N · L²) | No factor 26; see the [wildcard graph page](/interview-question/word-ladder-shortest-transformation-via-bfs-how-do-you-build-the-wildcard-graph) |

N is the number of words, L the word length. The space is the \`set\`, the \`deque\` and the \`parent\` dict, each holding at most N strings of length L.

## Edge Cases

- **\`end\` not in the list** — return 0 immediately (example 1, second case).
- **\`begin\` not in the list** — fine; it is only the start node.
- **\`begin == end\`** — LeetCode guarantees they differ; if allowed, decide whether the answer is 1 (and handle it before the loop).
- **No path** — the queue empties, return 0.
- **Duplicates in the list** — the \`set\` removes them.
- **Different word lengths** — no candidate of the wrong length is ever generated, so such words are simply unreachable.

## Common Pitfalls

- **Membership on the list instead of a set** — \`cand in word_list\` turns every lookup into an O(N) scan.
- **Marking visited on pop instead of on enqueue** — the same word is queued repeatedly and the work explodes on dense dictionaries.
- **Off-by-one in the answer** — LeetCode counts words, so the start has length 1, not 0.
- **Returning the first chain found by DFS** — DFS finds *a* chain, not the shortest one.
- **\`words.remove(begin)\` when \`begin\` is not in the list** — \`KeyError\`; use \`discard\`.
- **Forgetting that strings are immutable** — trying \`word[i] = ch\` raises \`TypeError\`; build a new string (or work on \`list(word)\`).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Treat words as nodes and one-letter changes as edges, and run BFS from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">begin_word</code>; neighbours are the 26 · L one-letter variants that are in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> of the dictionary, and the first time I reach <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">end_word</code> its level is the answer.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why BFS:</strong> <span style="color:#f0e2c8;">Every change costs one step, so BFS reaches words in order of distance and the first arrival is the <strong style="color:#ffca28;">shortest</strong> chain; DFS would find a chain, not the shortest one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Visited and the answer:</strong> <span style="color:#f0e2c8;">I remove each word from the set when I queue it, so nothing is queued twice; the start has length 1 because the answer counts <strong style="color:#ffca28;">words</strong>, and if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">end_word</code> is not in the list I return 0 straight away.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(N · 26 · L²) time — each word expanded once, 26 · L candidates, each O(L) to build and hash — and O(N · L) space for the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code>, the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deque</code> and the parent map.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The Python detail:</strong> <span style="color:#f0e2c8;">The dictionary must be a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code>, never a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list</code>, or each lookup is O(N); I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deque.popleft()</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">discard</code> for a begin word that may be missing, and string slicing to build candidates because strings are immutable.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make it faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Bidirectional BFS: search from both ends, always expand the smaller frontier, and stop when a candidate lands in the other frontier. In example 2 it expanded 30 words instead of 215 for the same answer. The other speed-up is wildcard buckets, which remove the factor 26.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you return the actual sequence?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent</code> dict filled when each word is queued; when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">end_word</code> is popped, follow parents back to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">begin_word</code> and reverse the list. That costs O(chain length) extra.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about returning all shortest sequences (Word Ladder II)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Run BFS level by level, record <strong style="color:#ffca28;">every</strong> parent from the previous level instead of just the first, and only remove a level's words from the set after the whole level is processed. Then DFS backwards from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">end_word</code> over the parent lists to list every chain.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not precompute the whole graph by comparing every pair of words?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That is O(N² · L) comparisons up front, which dominates for thousands of short words. Generating candidates is O(26 · L²) per word and never looks at unrelated words.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the alphabet were huge, say Unicode?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Trying every letter per position stops making sense, and the wildcard approach — mapping patterns like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h*t</code> to the words that match — is better because its cost does not depend on alphabet size.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Implicit graph** | Nodes and edges computed on demand from a rule, never stored |
| **Unweighted shortest path** | Shortest path when every edge costs the same — what BFS finds |
| **Visited by deletion** | Remove a word from the dictionary set when it is queued, instead of a separate visited set |
| **Parent map** | Word → the word it was reached from; walked backwards to rebuild the chain |
| **Bidirectional BFS** | Two BFS searches from both ends that stop when they meet; expand the smaller frontier |

---
**Conclusion:** Word Ladder becomes a textbook BFS once you see the implicit graph: words are nodes, one-letter changes are edges, and BFS finds the shortest chain because every step costs the same. Generate neighbours by trying 26 letters at each position against a \`set\` of the dictionary, delete words as you queue them, and keep a parent map if you need the chain — O(N · 26 · L²) time and O(N · L) space. In Python the decisive details are using a \`set\` rather than a list, a \`deque\` for the queue, \`discard\` for the possibly-missing begin word, and remembering that each candidate string is a fresh O(L) object. Bidirectional BFS is the standard follow-up, and the [wildcard-bucket graph](/interview-question/word-ladder-shortest-transformation-via-bfs-how-do-you-build-the-wildcard-graph) removes the factor of 26. The same level-by-level search appears in [Rotting Oranges](/interview-question/how-do-you-solve-the-rotting-oranges-problem-with-multi-source-bfs) and in [level-order tree traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree).`,
        examples: [
          {
            label: "BFS word ladder on six inputs, printing the shortest chain",
            code: `from collections import deque
from string import ascii_lowercase


def ladder(begin, end, word_list):
    """BFS over words. Returns (number of words in the shortest chain, the chain) or (0, [])."""
    words = set(word_list)                     # O(1) average membership tests
    if end not in words:
        return 0, []
    words.discard(begin)                       # never come back to the start
    parent = {begin: None}
    queue = deque([begin])
    while queue:
        word = queue.popleft()
        if word == end:                        # first time we pop end = shortest chain
            chain = []
            while word is not None:
                chain.append(word)
                word = parent[word]
            return len(chain), chain[::-1]
        for i in range(len(word)):
            for ch in ascii_lowercase:         # 26 candidates per position
                cand = word[:i] + ch + word[i + 1:]
                if cand in words:
                    words.remove(cand)         # visited: remove when queued
                    parent[cand] = word
                    queue.append(cand)
    return 0, []


def ladder_length(begin, end, word_list):
    return ladder(begin, end, word_list)[0]


cases = [("hit", "cog", ["hot", "dot", "dog", "lot", "log", "cog"]),
         ("hit", "cog", ["hot", "dot", "dog", "lot", "log"]),
         ("a", "c", ["a", "b", "c"]),
         ("hot", "dog", ["hot", "dog"]),
         ("hot", "dog", ["hot", "dot", "dog"]),
         ("lost", "cost", ["most", "fist", "lost", "cost", "fish"])]
for begin, end, words in cases:
    n, chain = ladder(begin, end, words)
    print(begin + " -> " + end + ": " + str(n) + ("  " + " -> ".join(chain) if chain else ""))
print(ladder_length("hit", "cog", ["hot", "dot", "dog", "lot", "log", "cog"]))   # 5`,
          },
          {
            label: "One-way BFS vs bidirectional BFS: words expanded on generated dictionaries",
            code: `from collections import deque

LETTERS = "abcdefgh"                          # a small alphabet keeps the demo dense
seed = 2024


def rand():                                   # Park-Miller generator: same words in every language
    global seed
    seed = seed * 48271 % 2147483647
    return seed


def neighbours(word, alphabet):
    for i in range(len(word)):
        for ch in alphabet:
            if ch != word[i]:
                yield word[:i] + ch + word[i + 1:]


def one_way(begin, end, word_list, alphabet):
    words = set(word_list)
    if end not in words:
        return 0, 0
    words.discard(begin)
    queue, expanded = deque([(begin, 1)]), 0
    while queue:
        word, length = queue.popleft()
        expanded += 1
        for cand in neighbours(word, alphabet):
            if cand == end:
                return length + 1, expanded
            if cand in words:
                words.remove(cand)
                queue.append((cand, length + 1))
    return 0, expanded


def two_way(begin, end, word_list, alphabet):
    remaining = set(word_list)
    if end not in remaining:
        return 0, 0
    remaining.discard(begin)
    remaining.discard(end)
    front, back = [begin], [end]
    length, expanded = 1, 0
    while front and back:
        if len(front) > len(back):            # always grow the smaller frontier
            front, back = back, front
        back_set = set(back)
        nxt = []
        for word in front:
            expanded += 1
            for cand in neighbours(word, alphabet):
                if cand in back_set:          # the two searches meet
                    return length + 1, expanded
                if cand in remaining:
                    remaining.remove(cand)
                    nxt.append(cand)
        front = nxt
        length += 1
    return 0, expanded


for size in [300, 600, 1200, 2500]:
    words = []
    for _ in range(size):
        words.append("".join(LETTERS[rand() % len(LETTERS)] for _ in range(4)))
    words.append("hhhh")
    a, ea = one_way("aaaa", "hhhh", words, LETTERS)
    b, eb = two_way("aaaa", "hhhh", words, LETTERS)
    print("dictionary of " + str(size + 1) + " words: length " + str(a) + " vs " + str(b))
    print("  one-way BFS expanded:        " + str(ea))
    print("  bidirectional BFS expanded:  " + str(eb))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given a begin word, an end word and an array of dictionary words, find the number of words in the shortest transformation sequence from begin to end, where each step changes exactly one letter and every intermediate word must be in the dictionary. Return 0 if there is no such sequence. Please code it in JavaScript."

**What a strong answer should cover:**
- Modelling: words are nodes, one-letter changes are edges, and the graph is **implicit** — generated on demand, not stored.
- BFS because every edge has the same cost, so the first time \`end\` is reached is the shortest chain; the answer counts **words**, not steps.
- Neighbour generation: 26 letters × L positions, kept only if the candidate is in a \`Set\`; mark visited **when queued** (e.g. by deleting from the set).
- Complexity O(N · 26 · L²) time and O(N · L) space, and why comparing all pairs, O(N² · L), is worse for large N.
- JavaScript specifics: \`Set.has\` instead of \`Array.includes\` (a linear scan), a head index instead of \`shift()\`, building candidates with \`slice\` because strings are immutable, and \`for...of\` over a string yielding characters. Bidirectional BFS as the follow-up.

**Clarifying questions expected:**
- Count words or steps? Must \`endWord\` be in the list?
- Do you want the sequence itself, or all shortest sequences?

**Code / implementation expected:** Yes — a \`ladderLength(begin, end, wordList)\` in JavaScript using BFS with a \`Set\`, ideally also returning the chain via a parent \`Map\`.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know JavaScript strings, arrays, \`Set\` and \`Map\`; graph search is explained from scratch.
**Difficulty:** Hard
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by actually running the code with \`node\` (v22); nothing is typed in by hand. The examples use no Node-only APIs, so they also run in the browser.

## 1. Why This Even Matters — A Story First

Lewis Carroll published this puzzle in 1879 as "Doublets": turn one word into another by changing **one letter at a time**, and every step must be a real word. His own example turns HEAD into TAIL: HEAD → HEAL → TEAL → TELL → TALL → TAIL ([Wikipedia: Word ladder](https://en.wikipedia.org/wiki/Word_ladder)).

Try it by hand and you quickly notice you are exploring: from HEAD you could go to HEAL, HEAP, HEAR, READ, BEAD… and from each of those to many more. Wandering down one promising path is how people play; it is **not** how you find the **shortest** chain. For that you want to look at every word one step away, then every word two steps away, and so on — and stop the first time you see the target. That is breadth-first search.

The interview version (LeetCode 127) gives you a \`beginWord\`, an \`endWord\` and a dictionary \`wordList\`, and asks for the **number of words** in the shortest chain, or 0 if there is none. It is rated hard not because the BFS is unusual, but because nobody hands you a graph: you have to see that **words are nodes and one-letter changes are edges**, then generate those edges cheaply.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you want the number of **words** in the chain, or the number of **steps**? | LeetCode counts words: \`hit → hot → dot → dog → cog\` is 5. Steps would be 4. An off-by-one here is the most common wrong answer. |
| Must \`endWord\` be in the word list? Must \`beginWord\`? | \`endWord\` must be (otherwise return 0); \`beginWord\` usually does not have to be. |
| Are all words the same length and lowercase \`a\`–\`z\`? | Lets you generate neighbours by trying 26 letters at each position. |
| Do you need the chain itself, or all shortest chains? | One chain needs a parent map; **all** shortest chains is Word Ladder II, a harder follow-up. |
| How large are N (words) and L (word length)? | Decides between trying 26 letters per position and the wildcard-bucket graph, and whether bidirectional BFS is worth it. |
| Is the word list reused for many queries? | Then precompute the wildcard buckets once — see [building the wildcard graph](/interview-question/word-ladder-shortest-transformation-via-bfs-how-do-you-build-the-wildcard-graph). |

## 3. The Core Idea: An Implicit Graph of Words

📌 **Interview term: Implicit graph** — a graph you never store as an adjacency list. You only have a rule for computing a node's neighbours on demand. Here: the neighbours of a word are all dictionary words that differ from it in exactly one position.

📌 **Interview term: Unweighted shortest path** — when every edge costs the same (one letter change = one step), BFS finds shortest paths, because it reaches every node at distance \`d\` before any node at distance \`d + 1\`. No Dijkstra needed; see [When would you use BFS over Dijkstra?](/interview-question/when-would-you-use-bfs-over-dijkstra-for-shortest-paths)

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="Word graph for hit to cog. hit links to hot. hot links to dot and lot. dot links to dog and lot. lot links to log. dog links to log and cog. log links to cog. Columns show BFS levels 1 to 5">
  <text class="d-sub" x="60" y="28" text-anchor="middle">level 1</text>
  <text class="d-sub" x="190" y="28" text-anchor="middle">level 2</text>
  <text class="d-sub" x="330" y="28" text-anchor="middle">level 3</text>
  <text class="d-sub" x="480" y="28" text-anchor="middle">level 4</text>
  <text class="d-sub" x="630" y="28" text-anchor="middle">level 5</text>
  <line class="d-edge-accent" x1="95" y1="160" x2="155" y2="160"/>
  <line class="d-edge-accent" x1="225" y1="150" x2="295" y2="90"/>
  <line class="d-edge" x1="225" y1="170" x2="295" y2="230"/>
  <line class="d-edge" x1="330" y1="110" x2="330" y2="210"/>
  <line class="d-edge-accent" x1="365" y1="80" x2="445" y2="80"/>
  <line class="d-edge" x1="365" y1="240" x2="445" y2="240"/>
  <line class="d-edge" x1="480" y1="100" x2="480" y2="220"/>
  <line class="d-edge-accent" x1="515" y1="90" x2="595" y2="150"/>
  <line class="d-edge" x1="515" y1="230" x2="595" y2="170"/>
  <rect class="d-box-muted" x="25" y="140" width="70" height="40" rx="8"/>
  <text class="d-text" x="60" y="166" text-anchor="middle">hit</text>
  <rect class="d-box" x="155" y="140" width="70" height="40" rx="8"/>
  <text class="d-text" x="190" y="166" text-anchor="middle">hot</text>
  <rect class="d-box" x="295" y="60" width="70" height="40" rx="8"/>
  <text class="d-text" x="330" y="86" text-anchor="middle">dot</text>
  <rect class="d-box" x="295" y="220" width="70" height="40" rx="8"/>
  <text class="d-text" x="330" y="246" text-anchor="middle">lot</text>
  <rect class="d-box" x="445" y="60" width="70" height="40" rx="8"/>
  <text class="d-text" x="480" y="86" text-anchor="middle">dog</text>
  <rect class="d-box" x="445" y="220" width="70" height="40" rx="8"/>
  <text class="d-text" x="480" y="246" text-anchor="middle">log</text>
  <rect class="d-box-accent" x="595" y="140" width="70" height="40" rx="8"/>
  <text class="d-text d-accent" x="630" y="166" text-anchor="middle">cog</text>
</svg>

Each column is one BFS level. \`cog\` first appears at level 5, so the answer is **5** words. The highlighted route \`hit → hot → dot → dog → cog\` is the one the verified code reconstructs; \`hit → hot → lot → log → cog\` is equally short — BFS returns whichever it reaches first, which depends only on the order neighbours are generated.

### Finding neighbours: two ways

1. **Compare every pair of words** and join those that differ in one letter. That is N² comparisons of L letters each — O(N² · L) before the search even starts. Fine for 50 words, slow for 5,000 if the list is big and words are short.
2. **Generate candidates**: for a word of length L, replace each position with each of the 26 letters and keep the candidates that are in a **hash set** of the dictionary. That is 26 · L candidates per word, each costing O(L) to build and hash, so O(26 · L²) per word and O(N · 26 · L²) overall — independent of N² — which is why it is the standard answer.

A third way — grouping words by **wildcard patterns** such as \`h*t\` — gets rid of the factor 26 and is the subject of its own page: [Word Ladder: how do you build the wildcard graph?](/interview-question/word-ladder-shortest-transformation-via-bfs-how-do-you-build-the-wildcard-graph)

### The algorithm

1. Put the dictionary in a hash set. If \`endWord\` is not in it, return 0.
2. Queue \`beginWord\` with length 1. Remove it from the set if present.
3. Pop a word. If it is \`endWord\`, return its length. Otherwise, for each position and each letter, build the candidate; if the candidate is in the set, **remove it from the set** (that is the visited mark), record its parent, and queue it with length + 1.
4. If the queue empties, return 0.

📌 **Interview term: Visited by deletion** — instead of a separate \`visited\` set, delete a word from the dictionary set the moment it is queued. Any later attempt to reach it fails the membership test, so each word is queued at most once.

📌 **Interview term: Parent map** — a map from each discovered word to the word it was discovered from. Walking it backwards from \`endWord\` rebuilds the chain in O(length).

### Going faster: bidirectional BFS

📌 **Interview term: Bidirectional BFS** — run two BFS searches at once, one forward from \`beginWord\` and one backward from \`endWord\`, always expanding the **smaller** frontier, and stop when they meet. If each word has about \`b\` neighbours and the answer is \`d\` steps away, one-way BFS explores about \`b^d\` words, while two searches that each go half way explore about \`2 · b^(d/2)\` — a far smaller number. It works here because edges are symmetric: if \`hot → dot\` is one letter change, so is \`dot → hot\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 210" role="img" aria-label="Words expanded on a 601 word dictionary. One way BFS expanded 215 words. Bidirectional BFS expanded 30 words">
  <text class="d-text" x="20" y="40">One-way BFS</text>
  <rect class="d-box-muted" x="200" y="20" width="430" height="34" rx="6"/>
  <text class="d-text" x="415" y="43" text-anchor="middle">215 words expanded</text>
  <text class="d-text d-accent" x="20" y="130">Bidirectional BFS</text>
  <rect class="d-box-accent" x="200" y="110" width="60" height="34" rx="6"/>
  <text class="d-text d-accent" x="300" y="133">30 words expanded</text>
</svg>

Those two numbers come from example 2 (the 601-word dictionary, where the answer is a 7-word chain). Both searches return the same length; the bidirectional one did about a seventh of the work.


## 4. The Code in JavaScript

~~~javascript
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

function ladder(begin, end, wordList) {
  const words = new Set(wordList);              // O(1) average membership tests
  if (!words.has(end)) return [0, []];
  words.delete(begin);                          // never come back to the start
  const parent = new Map([[begin, null]]);
  const queue = [begin];
  for (let head = 0; head < queue.length; head++) {
    let word = queue[head];
    if (word === end) {                         // first time we pop end = shortest chain
      const chain = [];
      while (word !== null) { chain.push(word); word = parent.get(word); }
      return [chain.length, chain.reverse()];
    }
    for (let i = 0; i < word.length; i++) {
      for (const ch of ALPHABET) {              // 26 candidates per position
        const cand = word.slice(0, i) + ch + word.slice(i + 1);
        if (words.has(cand)) {
          words.delete(cand);                   // visited: remove when queued
          parent.set(cand, word);
          queue.push(cand);
        }
      }
    }
  }
  return [0, []];
}
~~~

The JavaScript parts that matter:

- **\`new Set(wordList)\`** — \`words.has(cand)\` is an average O(1) hash lookup. \`wordList.includes(cand)\` would scan the array, O(N) per candidate, turning the whole thing into O(N² · 26 · L²).
- **\`words.delete(begin)\`** — \`Set.prototype.delete\` simply returns \`false\` if the value is absent, so it is safe when \`beginWord\` is not in the list.
- **\`word.slice(0, i) + ch + word.slice(i + 1)\`** — strings are immutable in JavaScript; \`word[i] = ch\` is silently ignored (or throws in strict mode), so every candidate is a new string built in O(L). That and hashing it give the L² in the complexity.
- **\`for (const ch of ALPHABET)\`** — \`for...of\` over a string yields one character at a time. (\`for...in\` would yield the indices \`"0"\`, \`"1"\`… as strings.)
- **The queue is an array plus a \`head\` index** — \`shift()\` moves every remaining element ([MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/shift)).
- **\`parent\` is a \`Map\`** from word to the word it came from; following it back from \`end\` and calling \`reverse()\` (which reverses in place and returns the same array) gives the chain.
- **Deleting on enqueue** — \`words.delete(cand)\` the moment \`cand\` is queued, so no word is queued twice.

A common speed-up is to return as soon as a candidate **equals** \`end\`, one level before it would be popped. Example 2's \`oneWay\` does that; it changes the work, not the answer.

### Bidirectional BFS in JavaScript

~~~javascript
function twoWay(begin, end, wordList, alphabet) {
  const remaining = new Set(wordList);
  if (!remaining.has(end)) return [0, 0];
  remaining.delete(begin);
  remaining.delete(end);
  let front = [begin], back = [end];
  let length = 1, expanded = 0;
  while (front.length > 0 && back.length > 0) {
    if (front.length > back.length) [front, back] = [back, front];   // grow the smaller side
    const backSet = new Set(back);
    const next = [];
    for (const word of front) {
      expanded++;
      for (const cand of neighbours(word, alphabet)) {
        if (backSet.has(cand)) return [length + 1, expanded];          // the searches meet
        if (remaining.has(cand)) { remaining.delete(cand); next.push(cand); }
      }
    }
    front = next;
    length++;
  }
  return [0, expanded];
}
~~~

\`[front, back] = [back, front]\` swaps the two frontiers with destructuring assignment. Frontiers are arrays so the expansion order is deterministic (a \`Set\` iterates in insertion order too, but an array makes the order obvious); \`backSet\` makes the "did we meet?" check O(1). \`length\` starts at 1 (just \`begin\`), grows by one per expanded level on either side, and the meeting edge adds the last word.

## 5. Verified: Running the Code

Both examples were saved as \`main.js\` and run with \`node main.js\` (Node.js v22). Example 1 runs six cases — the two LeetCode 127 examples, a one-letter dictionary, a pair with no intermediate word, a three-word chain, and a one-step change — and prints the chain found through the parent map:

~~~text
hit -> cog: 5  hit -> hot -> dot -> dog -> cog
hit -> cog: 0
a -> c: 2  a -> c
hot -> dog: 0
hot -> dog: 3  hot -> dot -> dog
lost -> cost: 2  lost -> cost
5
~~~

\`hot -> dog\` with only \`["hot", "dog"]\` is 0: the words differ in two letters and nothing is in between. \`a -> c\` is 2 because the answer counts words.

Example 2 builds four random dictionaries of 4-letter words over the letters \`a\`–\`h\` (fixed-seed Park–Miller generator, so every language builds the same words; the products stay below \`2^53\`, so JavaScript numbers are exact), always adding \`hhhh\`, and searches from \`aaaa\` to \`hhhh\` both ways, counting how many words each search expanded:

~~~text
dictionary of 301 words: length 0 vs 0
  one-way BFS expanded:        2
  bidirectional BFS expanded:  2
dictionary of 601 words: length 7 vs 7
  one-way BFS expanded:        215
  bidirectional BFS expanded:  30
dictionary of 1201 words: length 5 vs 5
  one-way BFS expanded:        159
  bidirectional BFS expanded:  9
dictionary of 2501 words: length 5 vs 5
  one-way BFS expanded:        322
  bidirectional BFS expanded:  17
~~~

Both searches always agree on the length (0 for the first dictionary, where no chain exists). Bidirectional BFS expanded 30 words instead of 215, 9 instead of 159, and 17 instead of 322.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Build all edges by comparing pairs, then BFS | O(N² · L) | O(N²) edges in the worst case | Every pair compared letter by letter |
| BFS with 26-letter candidates (this page) | O(N · 26 · L²) | O(N · L) | Each word expanded once; 26 · L candidates, each O(L) to build and hash |
| Same, but \`Array.includes\` for lookups | O(N² · 26 · L²) | O(N · L) | Every lookup scans the whole list |
| Bidirectional BFS | Same worst case, far less in practice | O(N · L) | Two frontiers of about \`b^(d/2)\` words instead of one of \`b^d\` |
| BFS over wildcard buckets | O(N · L²) | O(N · L²) | No factor 26; see the [wildcard graph page](/interview-question/word-ladder-shortest-transformation-via-bfs-how-do-you-build-the-wildcard-graph) |

## Edge Cases

- **\`end\` not in the list** — return 0 immediately.
- **\`begin\` not in the list** — fine; it is only the start node.
- **\`begin === end\`** — LeetCode guarantees they differ; decide the answer (1) before the loop if allowed.
- **No path** — the queue empties, return 0.
- **Duplicates in the list** — the \`Set\` removes them.
- **Uppercase or mixed case input** — \`'Hot' !== 'hot'\`; normalise with \`toLowerCase()\` if the interviewer allows mixed case.

## Common Pitfalls

- **\`wordList.includes(cand)\`** — an O(N) scan per candidate; build a \`Set\` once.
- **Marking visited on pop instead of on enqueue** — the same word is queued repeatedly.
- **Off-by-one** — the start counts as 1 word.
- **\`word[i] = ch\`** — strings are immutable; build a new string with \`slice\` (or split into an array and \`join\`).
- **\`queue.shift()\` in a hot loop** — may make the BFS quadratic.
- **DFS "because it is shorter to write"** — finds *a* chain, not the shortest one.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Treat words as nodes and one-letter changes as edges, and run BFS from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">beginWord</code>; neighbours are the 26 · L one-letter variants that are in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> of the dictionary, and the first time I reach <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">endWord</code> its level is the answer.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why BFS:</strong> <span style="color:#f0e2c8;">Every change costs one step, so BFS reaches words in order of distance and the first arrival is the <strong style="color:#ffca28;">shortest</strong> chain; DFS would find a chain, not the shortest one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Visited and the answer:</strong> <span style="color:#f0e2c8;">I delete each word from the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> when I queue it, so nothing is queued twice; the start has length 1 because the answer counts <strong style="color:#ffca28;">words</strong>, and if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">endWord</code> is not in the list I return 0 straight away.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(N · 26 · L²) time — each word expanded once, 26 · L candidates, each O(L) to build and hash — and O(N · L) space for the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code>, the queue and the parent <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The JavaScript detail:</strong> <span style="color:#f0e2c8;">Lookups go through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set.has</code>, never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.includes</code>; the queue uses a head index instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shift()</code>; and candidates are built with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slice</code> because strings are immutable.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make it faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Bidirectional BFS: search from both ends, always expand the smaller frontier, and stop when a candidate lands in the other frontier. In example 2 it expanded 30 words instead of 215 for the same answer. Wildcard buckets remove the factor 26 as well.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you return the actual sequence?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fill a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> from each word to its parent when it is queued; when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">endWord</code> is popped, follow parents back to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">beginWord</code> and reverse the array — O(chain length) extra.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about returning all shortest sequences (Word Ladder II)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Run BFS level by level, record <strong style="color:#ffca28;">every</strong> parent from the previous level instead of the first one, and only delete a level's words from the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> after the whole level is processed. Then walk backwards from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">endWord</code> over the parent lists to build every chain.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is building strings with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">+</code> in a loop slow in JavaScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each candidate is a new string, so building it is O(L) work — that is part of the L² in the bound, not something to optimise away. The real win is avoiding the factor 26 with wildcard buckets or the work with bidirectional BFS.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not precompute the graph by comparing every pair?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That is O(N² · L) before the search starts, which dominates for thousands of short words. Generating candidates touches only the words that are actually one change away.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Implicit graph** | Nodes and edges computed on demand from a rule, never stored |
| **Unweighted shortest path** | Shortest path when every edge costs the same — what BFS finds |
| **Visited by deletion** | Delete a word from the dictionary \`Set\` when it is queued, instead of a separate visited set |
| **Parent map** | Word → the word it was reached from; walked backwards to rebuild the chain |
| **Bidirectional BFS** | Two BFS searches from both ends that stop when they meet; expand the smaller frontier |

---
**Conclusion:** Word Ladder becomes a textbook BFS once you see the implicit graph: words are nodes, one-letter changes are edges, and BFS finds the shortest chain because every step costs the same. Generate neighbours by trying 26 letters at each position against a \`Set\`, delete words as you queue them, and keep a parent \`Map\` if you need the chain — O(N · 26 · L²) time and O(N · L) space. In JavaScript the decisive details are \`Set.has\` instead of \`includes\`, a head index instead of \`shift()\`, and building candidates with \`slice\` because strings cannot be edited in place. Bidirectional BFS is the standard follow-up, and the [wildcard-bucket graph](/interview-question/word-ladder-shortest-transformation-via-bfs-how-do-you-build-the-wildcard-graph) removes the factor of 26. The same level-by-level search appears in [Rotting Oranges](/interview-question/how-do-you-solve-the-rotting-oranges-problem-with-multi-source-bfs) and in [level-order tree traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree).`,
        examples: [
          {
            label: "BFS word ladder on six inputs, printing the shortest chain",
            code: `const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

// BFS over words. Returns [number of words in the shortest chain, the chain] or [0, []].
function ladder(begin, end, wordList) {
  const words = new Set(wordList);              // O(1) average membership tests
  if (!words.has(end)) return [0, []];
  words.delete(begin);                          // never come back to the start
  const parent = new Map([[begin, null]]);
  const queue = [begin];
  for (let head = 0; head < queue.length; head++) {
    let word = queue[head];
    if (word === end) {                         // first time we pop end = shortest chain
      const chain = [];
      while (word !== null) { chain.push(word); word = parent.get(word); }
      return [chain.length, chain.reverse()];
    }
    for (let i = 0; i < word.length; i++) {
      for (const ch of ALPHABET) {              // 26 candidates per position
        const cand = word.slice(0, i) + ch + word.slice(i + 1);
        if (words.has(cand)) {
          words.delete(cand);                   // visited: remove when queued
          parent.set(cand, word);
          queue.push(cand);
        }
      }
    }
  }
  return [0, []];
}

function ladderLength(begin, end, wordList) {
  return ladder(begin, end, wordList)[0];
}

const cases = [['hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log', 'cog']],
  ['hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log']],
  ['a', 'c', ['a', 'b', 'c']],
  ['hot', 'dog', ['hot', 'dog']],
  ['hot', 'dog', ['hot', 'dot', 'dog']],
  ['lost', 'cost', ['most', 'fist', 'lost', 'cost', 'fish']]];
for (const [begin, end, words] of cases) {
  const [n, chain] = ladder(begin, end, words);
  console.log(begin + ' -> ' + end + ': ' + n + (chain.length ? '  ' + chain.join(' -> ') : ''));
}
console.log(ladderLength('hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log', 'cog'])); // 5`,
          },
          {
            label: "One-way BFS vs bidirectional BFS: words expanded on generated dictionaries",
            code: `const LETTERS = 'abcdefgh';                     // a small alphabet keeps the demo dense
let seed = 2024;
function rand() {                               // Park-Miller generator: same words in every language
  seed = (seed * 48271) % 2147483647;
  return seed;
}

function neighbours(word, alphabet) {
  const out = [];
  for (let i = 0; i < word.length; i++) {
    for (const ch of alphabet) {
      if (ch !== word[i]) out.push(word.slice(0, i) + ch + word.slice(i + 1));
    }
  }
  return out;
}

function oneWay(begin, end, wordList, alphabet) {
  const words = new Set(wordList);
  if (!words.has(end)) return [0, 0];
  words.delete(begin);
  const queue = [[begin, 1]];
  let expanded = 0;
  for (let head = 0; head < queue.length; head++) {
    const [word, length] = queue[head];
    expanded++;
    for (const cand of neighbours(word, alphabet)) {
      if (cand === end) return [length + 1, expanded];
      if (words.has(cand)) { words.delete(cand); queue.push([cand, length + 1]); }
    }
  }
  return [0, expanded];
}

function twoWay(begin, end, wordList, alphabet) {
  const remaining = new Set(wordList);
  if (!remaining.has(end)) return [0, 0];
  remaining.delete(begin);
  remaining.delete(end);
  let front = [begin], back = [end];
  let length = 1, expanded = 0;
  while (front.length > 0 && back.length > 0) {
    if (front.length > back.length) [front, back] = [back, front];   // grow the smaller side
    const backSet = new Set(back);
    const next = [];
    for (const word of front) {
      expanded++;
      for (const cand of neighbours(word, alphabet)) {
        if (backSet.has(cand)) return [length + 1, expanded];          // the searches meet
        if (remaining.has(cand)) { remaining.delete(cand); next.push(cand); }
      }
    }
    front = next;
    length++;
  }
  return [0, expanded];
}

for (const size of [300, 600, 1200, 2500]) {
  const words = [];
  for (let k = 0; k < size; k++) {
    let w = '';
    for (let j = 0; j < 4; j++) w += LETTERS[rand() % LETTERS.length];
    words.push(w);
  }
  words.push('hhhh');
  const [a, ea] = oneWay('aaaa', 'hhhh', words, LETTERS);
  const [b, eb] = twoWay('aaaa', 'hhhh', words, LETTERS);
  console.log('dictionary of ' + (size + 1) + ' words: length ' + a + ' vs ' + b);
  console.log('  one-way BFS expanded:        ' + ea);
  console.log('  bidirectional BFS expanded:  ' + eb);
}`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given a begin word, an end word and a \`List<String>\` of dictionary words, find the number of words in the shortest transformation sequence from begin to end, where each step changes exactly one letter and every intermediate word must be in the dictionary. Return 0 if there is no such sequence. Please code it in Java."

**What a strong answer should cover:**
- Modelling: words are nodes, one-letter changes are edges, and the graph is **implicit** — generated on demand, not stored.
- BFS because every edge has the same cost, so the first time \`end\` is reached is the shortest chain; the answer counts **words**, not steps.
- Neighbour generation: 26 letters × L positions, kept only if the candidate is in a \`HashSet\`; mark visited **when queued** (e.g. by removing from the set).
- Complexity O(N · 26 · L²) time and O(N · L) space, and why comparing all pairs, O(N² · L), is worse for large N.
- Java specifics: \`String\` is immutable, so edit a \`char[]\` and build \`new String(chars)\`; compare strings with \`equals\`, never \`==\`; \`HashSet.remove\` returns a \`boolean\` you can use as the membership test; \`List.contains\` is a linear scan. Bidirectional BFS as the follow-up.

**Clarifying questions expected:**
- Count words or steps? Must \`endWord\` be in the list?
- Do you want the sequence itself, or all shortest sequences?

**Code / implementation expected:** Yes — a \`ladderLength(String begin, String end, List<String> wordList)\` in Java using BFS with a \`HashSet\`, ideally also returning the chain via a parent \`HashMap\`.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know Java strings, \`List\`, \`Set\` and \`Map\`; graph search is explained from scratch.
**Difficulty:** Hard
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by actually compiling and running the code with \`javac\` and \`java\` (OpenJDK 21); nothing is typed in by hand.

## 1. Why This Even Matters — A Story First

Lewis Carroll published this puzzle in 1879 as "Doublets": turn one word into another by changing **one letter at a time**, and every step must be a real word. His own example turns HEAD into TAIL: HEAD → HEAL → TEAL → TELL → TALL → TAIL ([Wikipedia: Word ladder](https://en.wikipedia.org/wiki/Word_ladder)).

Try it by hand and you quickly notice you are exploring: from HEAD you could go to HEAL, HEAP, HEAR, READ, BEAD… and from each of those to many more. Wandering down one promising path is how people play; it is **not** how you find the **shortest** chain. For that you want to look at every word one step away, then every word two steps away, and so on — and stop the first time you see the target. That is breadth-first search.

The interview version (LeetCode 127) gives you a \`beginWord\`, an \`endWord\` and a dictionary \`wordList\`, and asks for the **number of words** in the shortest chain, or 0 if there is none. It is rated hard not because the BFS is unusual, but because nobody hands you a graph: you have to see that **words are nodes and one-letter changes are edges**, then generate those edges cheaply.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you want the number of **words** in the chain, or the number of **steps**? | LeetCode counts words: \`hit → hot → dot → dog → cog\` is 5. Steps would be 4. An off-by-one here is the most common wrong answer. |
| Must \`endWord\` be in the word list? Must \`beginWord\`? | \`endWord\` must be (otherwise return 0); \`beginWord\` usually does not have to be. |
| Are all words the same length and lowercase \`a\`–\`z\`? | Lets you generate neighbours by trying 26 letters at each position. |
| Do you need the chain itself, or all shortest chains? | One chain needs a parent map; **all** shortest chains is Word Ladder II, a harder follow-up. |
| How large are N (words) and L (word length)? | Decides between trying 26 letters per position and the wildcard-bucket graph, and whether bidirectional BFS is worth it. |
| Is the word list reused for many queries? | Then precompute the wildcard buckets once — see [building the wildcard graph](/interview-question/word-ladder-shortest-transformation-via-bfs-how-do-you-build-the-wildcard-graph). |

## 3. The Core Idea: An Implicit Graph of Words

📌 **Interview term: Implicit graph** — a graph you never store as an adjacency list. You only have a rule for computing a node's neighbours on demand. Here: the neighbours of a word are all dictionary words that differ from it in exactly one position.

📌 **Interview term: Unweighted shortest path** — when every edge costs the same (one letter change = one step), BFS finds shortest paths, because it reaches every node at distance \`d\` before any node at distance \`d + 1\`. No Dijkstra needed; see [When would you use BFS over Dijkstra?](/interview-question/when-would-you-use-bfs-over-dijkstra-for-shortest-paths)

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="Word graph for hit to cog. hit links to hot. hot links to dot and lot. dot links to dog and lot. lot links to log. dog links to log and cog. log links to cog. Columns show BFS levels 1 to 5">
  <text class="d-sub" x="60" y="28" text-anchor="middle">level 1</text>
  <text class="d-sub" x="190" y="28" text-anchor="middle">level 2</text>
  <text class="d-sub" x="330" y="28" text-anchor="middle">level 3</text>
  <text class="d-sub" x="480" y="28" text-anchor="middle">level 4</text>
  <text class="d-sub" x="630" y="28" text-anchor="middle">level 5</text>
  <line class="d-edge-accent" x1="95" y1="160" x2="155" y2="160"/>
  <line class="d-edge-accent" x1="225" y1="150" x2="295" y2="90"/>
  <line class="d-edge" x1="225" y1="170" x2="295" y2="230"/>
  <line class="d-edge" x1="330" y1="110" x2="330" y2="210"/>
  <line class="d-edge-accent" x1="365" y1="80" x2="445" y2="80"/>
  <line class="d-edge" x1="365" y1="240" x2="445" y2="240"/>
  <line class="d-edge" x1="480" y1="100" x2="480" y2="220"/>
  <line class="d-edge-accent" x1="515" y1="90" x2="595" y2="150"/>
  <line class="d-edge" x1="515" y1="230" x2="595" y2="170"/>
  <rect class="d-box-muted" x="25" y="140" width="70" height="40" rx="8"/>
  <text class="d-text" x="60" y="166" text-anchor="middle">hit</text>
  <rect class="d-box" x="155" y="140" width="70" height="40" rx="8"/>
  <text class="d-text" x="190" y="166" text-anchor="middle">hot</text>
  <rect class="d-box" x="295" y="60" width="70" height="40" rx="8"/>
  <text class="d-text" x="330" y="86" text-anchor="middle">dot</text>
  <rect class="d-box" x="295" y="220" width="70" height="40" rx="8"/>
  <text class="d-text" x="330" y="246" text-anchor="middle">lot</text>
  <rect class="d-box" x="445" y="60" width="70" height="40" rx="8"/>
  <text class="d-text" x="480" y="86" text-anchor="middle">dog</text>
  <rect class="d-box" x="445" y="220" width="70" height="40" rx="8"/>
  <text class="d-text" x="480" y="246" text-anchor="middle">log</text>
  <rect class="d-box-accent" x="595" y="140" width="70" height="40" rx="8"/>
  <text class="d-text d-accent" x="630" y="166" text-anchor="middle">cog</text>
</svg>

Each column is one BFS level. \`cog\` first appears at level 5, so the answer is **5** words. The highlighted route \`hit → hot → dot → dog → cog\` is the one the verified code reconstructs; \`hit → hot → lot → log → cog\` is equally short — BFS returns whichever it reaches first, which depends only on the order neighbours are generated.

### Finding neighbours: two ways

1. **Compare every pair of words** and join those that differ in one letter. That is N² comparisons of L letters each — O(N² · L) before the search even starts. Fine for 50 words, slow for 5,000 if the list is big and words are short.
2. **Generate candidates**: for a word of length L, replace each position with each of the 26 letters and keep the candidates that are in a **hash set** of the dictionary. That is 26 · L candidates per word, each costing O(L) to build and hash, so O(26 · L²) per word and O(N · 26 · L²) overall — independent of N² — which is why it is the standard answer.

A third way — grouping words by **wildcard patterns** such as \`h*t\` — gets rid of the factor 26 and is the subject of its own page: [Word Ladder: how do you build the wildcard graph?](/interview-question/word-ladder-shortest-transformation-via-bfs-how-do-you-build-the-wildcard-graph)

### The algorithm

1. Put the dictionary in a hash set. If \`endWord\` is not in it, return 0.
2. Queue \`beginWord\` with length 1. Remove it from the set if present.
3. Pop a word. If it is \`endWord\`, return its length. Otherwise, for each position and each letter, build the candidate; if the candidate is in the set, **remove it from the set** (that is the visited mark), record its parent, and queue it with length + 1.
4. If the queue empties, return 0.

📌 **Interview term: Visited by deletion** — instead of a separate \`visited\` set, delete a word from the dictionary set the moment it is queued. Any later attempt to reach it fails the membership test, so each word is queued at most once.

📌 **Interview term: Parent map** — a map from each discovered word to the word it was discovered from. Walking it backwards from \`endWord\` rebuilds the chain in O(length).

### Going faster: bidirectional BFS

📌 **Interview term: Bidirectional BFS** — run two BFS searches at once, one forward from \`beginWord\` and one backward from \`endWord\`, always expanding the **smaller** frontier, and stop when they meet. If each word has about \`b\` neighbours and the answer is \`d\` steps away, one-way BFS explores about \`b^d\` words, while two searches that each go half way explore about \`2 · b^(d/2)\` — a far smaller number. It works here because edges are symmetric: if \`hot → dot\` is one letter change, so is \`dot → hot\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 210" role="img" aria-label="Words expanded on a 601 word dictionary. One way BFS expanded 215 words. Bidirectional BFS expanded 30 words">
  <text class="d-text" x="20" y="40">One-way BFS</text>
  <rect class="d-box-muted" x="200" y="20" width="430" height="34" rx="6"/>
  <text class="d-text" x="415" y="43" text-anchor="middle">215 words expanded</text>
  <text class="d-text d-accent" x="20" y="130">Bidirectional BFS</text>
  <rect class="d-box-accent" x="200" y="110" width="60" height="34" rx="6"/>
  <text class="d-text d-accent" x="300" y="133">30 words expanded</text>
</svg>

Those two numbers come from example 2 (the 601-word dictionary, where the answer is a 7-word chain). Both searches return the same length; the bidirectional one did about a seventh of the work.


## 4. The Code in Java

~~~java
static List<String> ladder(String begin, String end, List<String> wordList) {
    Set<String> words = new HashSet<>(wordList);     // O(1) average membership tests
    if (!words.contains(end)) return List.of();
    words.remove(begin);                             // never come back to the start
    Map<String, String> parent = new HashMap<>();
    parent.put(begin, null);
    ArrayDeque<String> queue = new ArrayDeque<>(List.of(begin));
    while (!queue.isEmpty()) {
        String word = queue.poll();
        if (word.equals(end)) {                      // equals, never == on strings
            LinkedList<String> chain = new LinkedList<>();
            for (String w = word; w != null; w = parent.get(w)) chain.addFirst(w);
            return chain;
        }
        char[] chars = word.toCharArray();           // Strings are immutable: edit a char[]
        for (int i = 0; i < chars.length; i++) {
            char original = chars[i];
            for (char ch = 'a'; ch <= 'z'; ch++) {   // 26 candidates per position
                chars[i] = ch;
                String cand = new String(chars);
                if (words.remove(cand)) {            // remove() returns true if it was there
                    parent.put(cand, word);
                    queue.offer(cand);
                }
            }
            chars[i] = original;                     // restore before the next position
        }
    }
    return List.of();
}

static int ladderLength(String begin, String end, List<String> wordList) {
    return ladder(begin, end, wordList).size();
}
~~~

The Java parts that matter:

- **\`new HashSet<>(wordList)\`** — \`words.contains(cand)\` is an average O(1) hash lookup (plus O(L) to hash the string). Calling \`wordList.contains(cand)\` on the \`List\` would scan it, O(N) per candidate. Background: [How does a hash table work?](/interview-question/how-does-a-hash-table-work)
- **\`words.remove(cand)\` as the test.** \`Set.remove\` returns \`true\` only if the element was present, so one call both checks membership and marks the word visited. It is also safe for a \`begin\` that is not in the list — it just returns \`false\`.
- **\`char[] chars = word.toCharArray()\`** — a \`String\` cannot be changed, so we change one slot of a char array, build \`new String(chars)\` for the lookup (O(L)), and put the original letter back before moving to the next position. Forgetting the restore line makes later candidates differ from \`word\` in two places.
- **\`word.equals(end)\`, never \`word == end\`.** \`==\` compares object identity. A string built at run time from a \`char[]\` is a different object from the literal \`"cog"\`, even with the same letters — the snippet below shows \`==\` returning \`false\`.
- **\`LinkedList.addFirst\`** builds the chain in order while walking parents backwards, without a final reverse. (\`ArrayDeque.addFirst\` would work just as well.)
- **\`parent.put(begin, null)\`** — \`HashMap\` allows a \`null\` value, which marks the start of the chain. (\`Map.of\` would not: it rejects \`null\`s.)

~~~java
public class Main {
    public static void main(String[] args) {
        char[] chars = {'h', 'o', 't'};
        String built = new String(chars);          // a new String object at run time
        String literal = "hot";                    // a literal from the string pool
        System.out.println("built == literal:      " + (built == literal));
        System.out.println("built.equals(literal): " + built.equals(literal));
        System.out.println("same hashCode:         " + (built.hashCode() == literal.hashCode()));
    }
}
~~~

~~~text
built == literal:      false
built.equals(literal): true
same hashCode:         true
~~~

Equal strings always have equal hash codes, which is why \`HashSet<String>\` works with candidates built at run time: it hashes, then compares with \`equals\`.

### Bidirectional BFS in Java

~~~java
static int twoWay(String begin, String end, List<String> wordList, String alphabet) {
    Set<String> remaining = new HashSet<>(wordList);
    expanded = 0;
    if (!remaining.contains(end)) return 0;
    remaining.remove(begin);
    remaining.remove(end);
    List<String> front = new ArrayList<>(List.of(begin)), back = new ArrayList<>(List.of(end));
    int length = 1;
    while (!front.isEmpty() && !back.isEmpty()) {
        if (front.size() > back.size()) { List<String> t = front; front = back; back = t; }  // smaller side
        Set<String> backSet = new HashSet<>(back);
        List<String> next = new ArrayList<>();
        for (String word : front) {
            expanded++;
            for (String cand : neighbours(word, alphabet)) {
                if (backSet.contains(cand)) return length + 1;      // the searches meet
                if (remaining.remove(cand)) next.add(cand);
            }
        }
        front = next;
        length++;
    }
    return 0;
}
~~~

Swapping the two \`List\` references is O(1) — no elements move. Frontiers are \`ArrayList\`s so the expansion order is deterministic (a \`HashSet\` iterates in hash order); \`backSet\` makes the meeting test O(1). \`length\` starts at 1 (just \`begin\`), grows by one per expanded level on either side, and the meeting edge adds the last word. The static \`expanded\` counter is only for the demo.

## 5. Verified: Running the Code

Both examples were saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21). Example 1 runs six cases — the two LeetCode 127 examples, a one-letter dictionary, a pair with no intermediate word, a three-word chain, and a one-step change — and prints the chain found through the parent map:

~~~text
hit -> cog: 5  hit -> hot -> dot -> dog -> cog
hit -> cog: 0
a -> c: 2  a -> c
hot -> dog: 0
hot -> dog: 3  hot -> dot -> dog
lost -> cost: 2  lost -> cost
5
~~~

\`hot -> dog\` with only \`["hot", "dog"]\` is 0: the words differ in two letters and nothing is in between. \`a -> c\` is 2 because the answer counts words.

Example 2 builds four random dictionaries of 4-letter words over the letters \`a\`–\`h\` (fixed-seed Park–Miller generator with a \`long\` seed, so every language builds the same words), always adding \`hhhh\`, and searches from \`aaaa\` to \`hhhh\` both ways, counting how many words each search expanded:

~~~text
dictionary of 301 words: length 0 vs 0
  one-way BFS expanded:        2
  bidirectional BFS expanded:  2
dictionary of 601 words: length 7 vs 7
  one-way BFS expanded:        215
  bidirectional BFS expanded:  30
dictionary of 1201 words: length 5 vs 5
  one-way BFS expanded:        159
  bidirectional BFS expanded:  9
dictionary of 2501 words: length 5 vs 5
  one-way BFS expanded:        322
  bidirectional BFS expanded:  17
~~~

Both searches always agree on the length (0 for the first dictionary, where no chain exists). Bidirectional BFS expanded 30 words instead of 215, 9 instead of 159, and 17 instead of 322.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Build all edges by comparing pairs, then BFS | O(N² · L) | O(N²) edges in the worst case | Every pair compared letter by letter |
| BFS with 26-letter candidates (this page) | O(N · 26 · L²) | O(N · L) | Each word expanded once; 26 · L candidates, each O(L) to build and hash |
| Same, but \`List.contains\` for lookups | O(N² · 26 · L²) | O(N · L) | Every lookup scans the list |
| Bidirectional BFS | Same worst case, far less in practice | O(N · L) | Two frontiers of about \`b^(d/2)\` words instead of one of \`b^d\` |
| BFS over wildcard buckets | O(N · L²) | O(N · L²) | No factor 26; see the [wildcard graph page](/interview-question/word-ladder-shortest-transformation-via-bfs-how-do-you-build-the-wildcard-graph) |

## Edge Cases

- **\`end\` not in the list** — return 0 immediately.
- **\`begin\` not in the list** — \`words.remove(begin)\` just returns \`false\`.
- **\`begin.equals(end)\`** — LeetCode guarantees they differ; decide the answer (1) before the loop if allowed.
- **No path** — the queue empties, return an empty list (length 0).
- **Duplicates in the list** — the \`HashSet\` removes them.
- **\`null\` in the list** — \`HashSet\` accepts one \`null\`, but \`ArrayDeque\` throws \`NullPointerException\` on \`offer(null)\`; validate input if it can contain \`null\`.

## Common Pitfalls

- **\`word == end\`** — compares references; use \`equals\`.
- **\`wordList.contains(cand)\`** — an O(N) scan; build a \`HashSet\` once.
- **Forgetting \`chars[i] = original\`** — later candidates change two letters at once.
- **Marking visited on poll instead of on offer** — the same word is queued repeatedly.
- **Off-by-one** — the start counts as 1 word.
- **\`Map.of(begin, null)\` for the parent map** — throws \`NullPointerException\`; use \`HashMap\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Treat words as nodes and one-letter changes as edges, and run BFS from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">beginWord</code>; neighbours are the 26 · L one-letter variants that are in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashSet</code> of the dictionary, and the first time I reach <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">endWord</code> its level is the answer.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why BFS:</strong> <span style="color:#f0e2c8;">Every change costs one step, so BFS reaches words in order of distance and the first arrival is the <strong style="color:#ffca28;">shortest</strong> chain; DFS would find a chain, not the shortest one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Visited and the answer:</strong> <span style="color:#f0e2c8;">I call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">words.remove(cand)</code>, which returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true</code> only if the word was there, so the same call tests membership and marks it visited; the start has length 1 because the answer counts <strong style="color:#ffca28;">words</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(N · 26 · L²) time — each word expanded once, 26 · L candidates, each O(L) to build and hash — and O(N · L) space for the set, the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> and the parent map.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The Java detail:</strong> <span style="color:#f0e2c8;">Strings are immutable, so I edit a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">char[]</code>, build <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new String(chars)</code> for the lookup and restore the letter; and I compare with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">equals</code>, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> on a run-time string and a literal is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make it faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Bidirectional BFS: search from both ends, always expand the smaller frontier, and stop when a candidate lands in the other frontier. In example 2 it expanded 30 words instead of 215 for the same answer. Wildcard buckets remove the factor 26 as well.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you return the actual sequence?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap&lt;String, String&gt;</code> from each word to its parent, filled when the word is offered; when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">endWord</code> is polled, walk back to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">beginWord</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">addFirst</code> on a deque. That costs O(chain length) extra.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about returning all shortest sequences (Word Ladder II)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Run BFS level by level, store a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">List&lt;String&gt;</code> of <strong style="color:#ffca28;">all</strong> parents from the previous level, and only remove a level's words from the set after the whole level is done. Then backtrack from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">endWord</code> over those lists to emit every chain.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">StringBuilder</code> be better than a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">char[]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StringBuilder.setCharAt</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toString()</code> does the same work; both copy L characters per candidate. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">char[]</code> version is slightly leaner and is the common interview idiom.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not precompute the graph by comparing every pair?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That is O(N² · L) before the search starts, which dominates for thousands of short words. Generating candidates touches only words that are actually one change away.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Implicit graph** | Nodes and edges computed on demand from a rule, never stored |
| **Unweighted shortest path** | Shortest path when every edge costs the same — what BFS finds |
| **Visited by deletion** | Remove a word from the dictionary \`HashSet\` when it is queued, instead of a separate visited set |
| **Parent map** | Word → the word it was reached from; walked backwards to rebuild the chain |
| **Bidirectional BFS** | Two BFS searches from both ends that stop when they meet; expand the smaller frontier |

---
**Conclusion:** Word Ladder becomes a textbook BFS once you see the implicit graph: words are nodes, one-letter changes are edges, and BFS finds the shortest chain because every step costs the same. Generate neighbours by trying 26 letters at each position against a \`HashSet\`, remove words as you queue them, and keep a parent \`HashMap\` if you need the chain — O(N · 26 · L²) time and O(N · L) space. In Java the decisive details are editing a \`char[]\` (and restoring it), comparing with \`equals\`, using the \`boolean\` from \`Set.remove\`, and never calling \`List.contains\` in the inner loop. Bidirectional BFS is the standard follow-up, and the [wildcard-bucket graph](/interview-question/word-ladder-shortest-transformation-via-bfs-how-do-you-build-the-wildcard-graph) removes the factor of 26. The same level-by-level search appears in [Rotting Oranges](/interview-question/how-do-you-solve-the-rotting-oranges-problem-with-multi-source-bfs) and in [level-order tree traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree).`,
        examples: [
          {
            label: "BFS word ladder on six inputs, printing the shortest chain",
            code: `import java.util.*;

public class Main {
    // BFS over words. Returns the shortest chain (empty list if there is none).
    static List<String> ladder(String begin, String end, List<String> wordList) {
        Set<String> words = new HashSet<>(wordList);     // O(1) average membership tests
        if (!words.contains(end)) return List.of();
        words.remove(begin);                             // never come back to the start
        Map<String, String> parent = new HashMap<>();
        parent.put(begin, null);
        ArrayDeque<String> queue = new ArrayDeque<>(List.of(begin));
        while (!queue.isEmpty()) {
            String word = queue.poll();
            if (word.equals(end)) {                      // equals, never == on strings
                LinkedList<String> chain = new LinkedList<>();
                for (String w = word; w != null; w = parent.get(w)) chain.addFirst(w);
                return chain;
            }
            char[] chars = word.toCharArray();           // Strings are immutable: edit a char[]
            for (int i = 0; i < chars.length; i++) {
                char original = chars[i];
                for (char ch = 'a'; ch <= 'z'; ch++) {   // 26 candidates per position
                    chars[i] = ch;
                    String cand = new String(chars);
                    if (words.remove(cand)) {            // remove() returns true if it was there
                        parent.put(cand, word);
                        queue.offer(cand);
                    }
                }
                chars[i] = original;                     // restore before the next position
            }
        }
        return List.of();
    }

    static int ladderLength(String begin, String end, List<String> wordList) {
        return ladder(begin, end, wordList).size();
    }

    public static void main(String[] args) {
        String[][] be = {{"hit", "cog"}, {"hit", "cog"}, {"a", "c"}, {"hot", "dog"}, {"hot", "dog"}, {"lost", "cost"}};
        List<List<String>> lists = List.of(
                List.of("hot", "dot", "dog", "lot", "log", "cog"),
                List.of("hot", "dot", "dog", "lot", "log"),
                List.of("a", "b", "c"),
                List.of("hot", "dog"),
                List.of("hot", "dot", "dog"),
                List.of("most", "fist", "lost", "cost", "fish"));
        for (int k = 0; k < be.length; k++) {
            List<String> chain = ladder(be[k][0], be[k][1], lists.get(k));
            System.out.println(be[k][0] + " -> " + be[k][1] + ": " + chain.size()
                    + (chain.isEmpty() ? "" : "  " + String.join(" -> ", chain)));
        }
        System.out.println(ladderLength("hit", "cog", lists.get(0)));  // 5
    }
}`,
          },
          {
            label: "One-way BFS vs bidirectional BFS: words expanded on generated dictionaries",
            code: `import java.util.*;

public class Main {
    static final String LETTERS = "abcdefgh";       // a small alphabet keeps the demo dense
    static long seed = 2024;

    static int rand() {                             // Park-Miller generator; long avoids overflow
        seed = seed * 48271 % 2147483647L;
        return (int) seed;
    }

    static List<String> neighbours(String word, String alphabet) {
        List<String> out = new ArrayList<>();
        char[] chars = word.toCharArray();
        for (int i = 0; i < chars.length; i++) {
            char original = chars[i];
            for (char ch : alphabet.toCharArray()) {
                if (ch == original) continue;
                chars[i] = ch;
                out.add(new String(chars));
            }
            chars[i] = original;
        }
        return out;
    }

    static int expanded;

    static int oneWay(String begin, String end, List<String> wordList, String alphabet) {
        Set<String> words = new HashSet<>(wordList);
        expanded = 0;
        if (!words.contains(end)) return 0;
        words.remove(begin);
        ArrayDeque<String> queue = new ArrayDeque<>(List.of(begin));
        Map<String, Integer> length = new HashMap<>(Map.of(begin, 1));
        while (!queue.isEmpty()) {
            String word = queue.poll();
            expanded++;
            for (String cand : neighbours(word, alphabet)) {
                if (cand.equals(end)) return length.get(word) + 1;
                if (words.remove(cand)) { length.put(cand, length.get(word) + 1); queue.offer(cand); }
            }
        }
        return 0;
    }

    static int twoWay(String begin, String end, List<String> wordList, String alphabet) {
        Set<String> remaining = new HashSet<>(wordList);
        expanded = 0;
        if (!remaining.contains(end)) return 0;
        remaining.remove(begin);
        remaining.remove(end);
        List<String> front = new ArrayList<>(List.of(begin)), back = new ArrayList<>(List.of(end));
        int length = 1;
        while (!front.isEmpty() && !back.isEmpty()) {
            if (front.size() > back.size()) { List<String> t = front; front = back; back = t; }  // smaller side
            Set<String> backSet = new HashSet<>(back);
            List<String> next = new ArrayList<>();
            for (String word : front) {
                expanded++;
                for (String cand : neighbours(word, alphabet)) {
                    if (backSet.contains(cand)) return length + 1;      // the searches meet
                    if (remaining.remove(cand)) next.add(cand);
                }
            }
            front = next;
            length++;
        }
        return 0;
    }

    public static void main(String[] args) {
        for (int size : new int[]{300, 600, 1200, 2500}) {
            List<String> words = new ArrayList<>();
            for (int k = 0; k < size; k++) {
                StringBuilder sb = new StringBuilder();
                for (int j = 0; j < 4; j++) sb.append(LETTERS.charAt(rand() % LETTERS.length()));
                words.add(sb.toString());
            }
            words.add("hhhh");
            int a = oneWay("aaaa", "hhhh", words, LETTERS);
            int ea = expanded;
            int b = twoWay("aaaa", "hhhh", words, LETTERS);
            System.out.println("dictionary of " + (size + 1) + " words: length " + a + " vs " + b);
            System.out.println("  one-way BFS expanded:        " + ea);
            System.out.println("  bidirectional BFS expanded:  " + expanded);
        }
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given a begin word, an end word and a \`vector<string>\` of dictionary words, find the number of words in the shortest transformation sequence from begin to end, where each step changes exactly one letter and every intermediate word must be in the dictionary. Return 0 if there is no such sequence. Please code it in C++."

**What a strong answer should cover:**
- Modelling: words are nodes, one-letter changes are edges, and the graph is **implicit** — generated on demand, not stored.
- BFS because every edge has the same cost, so the first time \`end\` is reached is the shortest chain; the answer counts **words**, not steps.
- Neighbour generation: 26 letters × L positions, kept only if the candidate is in an \`unordered_set<string>\`; mark visited **when queued** (e.g. by erasing from the set).
- Complexity O(N · 26 · L²) time and O(N · L) space, and why comparing all pairs, O(N² · L), is worse for large N.
- C++ specifics: \`std::string\` is mutable, so change one character in place and restore it; \`unordered_set::erase(key)\` returns how many elements it removed (0 or 1) and doubles as the membership test; \`std::find\` on the vector is a linear scan; avoid needless string copies with \`const&\` and \`std::move\`. Bidirectional BFS as the follow-up.

**Clarifying questions expected:**
- Count words or steps? Must \`endWord\` be in the list?
- Do you want the sequence itself, or all shortest sequences?

**Code / implementation expected:** Yes — an \`int ladderLength(const string& begin, const string& end, const vector<string>& wordList)\` in C++17 using BFS with an \`unordered_set\`, ideally also returning the chain via a parent map.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know basic C++ (\`string\`, \`vector\`, \`unordered_set\`); graph search is explained from scratch.
**Difficulty:** Hard
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by actually compiling and running the code with \`g++ -std=c++17\` (GCC 13); nothing is typed in by hand.

## 1. Why This Even Matters — A Story First

Lewis Carroll published this puzzle in 1879 as "Doublets": turn one word into another by changing **one letter at a time**, and every step must be a real word. His own example turns HEAD into TAIL: HEAD → HEAL → TEAL → TELL → TALL → TAIL ([Wikipedia: Word ladder](https://en.wikipedia.org/wiki/Word_ladder)).

Try it by hand and you quickly notice you are exploring: from HEAD you could go to HEAL, HEAP, HEAR, READ, BEAD… and from each of those to many more. Wandering down one promising path is how people play; it is **not** how you find the **shortest** chain. For that you want to look at every word one step away, then every word two steps away, and so on — and stop the first time you see the target. That is breadth-first search.

The interview version (LeetCode 127) gives you a \`beginWord\`, an \`endWord\` and a dictionary \`wordList\`, and asks for the **number of words** in the shortest chain, or 0 if there is none. It is rated hard not because the BFS is unusual, but because nobody hands you a graph: you have to see that **words are nodes and one-letter changes are edges**, then generate those edges cheaply.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you want the number of **words** in the chain, or the number of **steps**? | LeetCode counts words: \`hit → hot → dot → dog → cog\` is 5. Steps would be 4. An off-by-one here is the most common wrong answer. |
| Must \`endWord\` be in the word list? Must \`beginWord\`? | \`endWord\` must be (otherwise return 0); \`beginWord\` usually does not have to be. |
| Are all words the same length and lowercase \`a\`–\`z\`? | Lets you generate neighbours by trying 26 letters at each position. |
| Do you need the chain itself, or all shortest chains? | One chain needs a parent map; **all** shortest chains is Word Ladder II, a harder follow-up. |
| How large are N (words) and L (word length)? | Decides between trying 26 letters per position and the wildcard-bucket graph, and whether bidirectional BFS is worth it. |
| Is the word list reused for many queries? | Then precompute the wildcard buckets once — see [building the wildcard graph](/interview-question/word-ladder-shortest-transformation-via-bfs-how-do-you-build-the-wildcard-graph). |

## 3. The Core Idea: An Implicit Graph of Words

📌 **Interview term: Implicit graph** — a graph you never store as an adjacency list. You only have a rule for computing a node's neighbours on demand. Here: the neighbours of a word are all dictionary words that differ from it in exactly one position.

📌 **Interview term: Unweighted shortest path** — when every edge costs the same (one letter change = one step), BFS finds shortest paths, because it reaches every node at distance \`d\` before any node at distance \`d + 1\`. No Dijkstra needed; see [When would you use BFS over Dijkstra?](/interview-question/when-would-you-use-bfs-over-dijkstra-for-shortest-paths)

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="Word graph for hit to cog. hit links to hot. hot links to dot and lot. dot links to dog and lot. lot links to log. dog links to log and cog. log links to cog. Columns show BFS levels 1 to 5">
  <text class="d-sub" x="60" y="28" text-anchor="middle">level 1</text>
  <text class="d-sub" x="190" y="28" text-anchor="middle">level 2</text>
  <text class="d-sub" x="330" y="28" text-anchor="middle">level 3</text>
  <text class="d-sub" x="480" y="28" text-anchor="middle">level 4</text>
  <text class="d-sub" x="630" y="28" text-anchor="middle">level 5</text>
  <line class="d-edge-accent" x1="95" y1="160" x2="155" y2="160"/>
  <line class="d-edge-accent" x1="225" y1="150" x2="295" y2="90"/>
  <line class="d-edge" x1="225" y1="170" x2="295" y2="230"/>
  <line class="d-edge" x1="330" y1="110" x2="330" y2="210"/>
  <line class="d-edge-accent" x1="365" y1="80" x2="445" y2="80"/>
  <line class="d-edge" x1="365" y1="240" x2="445" y2="240"/>
  <line class="d-edge" x1="480" y1="100" x2="480" y2="220"/>
  <line class="d-edge-accent" x1="515" y1="90" x2="595" y2="150"/>
  <line class="d-edge" x1="515" y1="230" x2="595" y2="170"/>
  <rect class="d-box-muted" x="25" y="140" width="70" height="40" rx="8"/>
  <text class="d-text" x="60" y="166" text-anchor="middle">hit</text>
  <rect class="d-box" x="155" y="140" width="70" height="40" rx="8"/>
  <text class="d-text" x="190" y="166" text-anchor="middle">hot</text>
  <rect class="d-box" x="295" y="60" width="70" height="40" rx="8"/>
  <text class="d-text" x="330" y="86" text-anchor="middle">dot</text>
  <rect class="d-box" x="295" y="220" width="70" height="40" rx="8"/>
  <text class="d-text" x="330" y="246" text-anchor="middle">lot</text>
  <rect class="d-box" x="445" y="60" width="70" height="40" rx="8"/>
  <text class="d-text" x="480" y="86" text-anchor="middle">dog</text>
  <rect class="d-box" x="445" y="220" width="70" height="40" rx="8"/>
  <text class="d-text" x="480" y="246" text-anchor="middle">log</text>
  <rect class="d-box-accent" x="595" y="140" width="70" height="40" rx="8"/>
  <text class="d-text d-accent" x="630" y="166" text-anchor="middle">cog</text>
</svg>

Each column is one BFS level. \`cog\` first appears at level 5, so the answer is **5** words. The highlighted route \`hit → hot → dot → dog → cog\` is the one the verified code reconstructs; \`hit → hot → lot → log → cog\` is equally short — BFS returns whichever it reaches first, which depends only on the order neighbours are generated.

### Finding neighbours: two ways

1. **Compare every pair of words** and join those that differ in one letter. That is N² comparisons of L letters each — O(N² · L) before the search even starts. Fine for 50 words, slow for 5,000 if the list is big and words are short.
2. **Generate candidates**: for a word of length L, replace each position with each of the 26 letters and keep the candidates that are in a **hash set** of the dictionary. That is 26 · L candidates per word, each costing O(L) to build and hash, so O(26 · L²) per word and O(N · 26 · L²) overall — independent of N² — which is why it is the standard answer.

A third way — grouping words by **wildcard patterns** such as \`h*t\` — gets rid of the factor 26 and is the subject of its own page: [Word Ladder: how do you build the wildcard graph?](/interview-question/word-ladder-shortest-transformation-via-bfs-how-do-you-build-the-wildcard-graph)

### The algorithm

1. Put the dictionary in a hash set. If \`endWord\` is not in it, return 0.
2. Queue \`beginWord\` with length 1. Remove it from the set if present.
3. Pop a word. If it is \`endWord\`, return its length. Otherwise, for each position and each letter, build the candidate; if the candidate is in the set, **remove it from the set** (that is the visited mark), record its parent, and queue it with length + 1.
4. If the queue empties, return 0.

📌 **Interview term: Visited by deletion** — instead of a separate \`visited\` set, delete a word from the dictionary set the moment it is queued. Any later attempt to reach it fails the membership test, so each word is queued at most once.

📌 **Interview term: Parent map** — a map from each discovered word to the word it was discovered from. Walking it backwards from \`endWord\` rebuilds the chain in O(length).

### Going faster: bidirectional BFS

📌 **Interview term: Bidirectional BFS** — run two BFS searches at once, one forward from \`beginWord\` and one backward from \`endWord\`, always expanding the **smaller** frontier, and stop when they meet. If each word has about \`b\` neighbours and the answer is \`d\` steps away, one-way BFS explores about \`b^d\` words, while two searches that each go half way explore about \`2 · b^(d/2)\` — a far smaller number. It works here because edges are symmetric: if \`hot → dot\` is one letter change, so is \`dot → hot\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 210" role="img" aria-label="Words expanded on a 601 word dictionary. One way BFS expanded 215 words. Bidirectional BFS expanded 30 words">
  <text class="d-text" x="20" y="40">One-way BFS</text>
  <rect class="d-box-muted" x="200" y="20" width="430" height="34" rx="6"/>
  <text class="d-text" x="415" y="43" text-anchor="middle">215 words expanded</text>
  <text class="d-text d-accent" x="20" y="130">Bidirectional BFS</text>
  <rect class="d-box-accent" x="200" y="110" width="60" height="34" rx="6"/>
  <text class="d-text d-accent" x="300" y="133">30 words expanded</text>
</svg>

Those two numbers come from example 2 (the 601-word dictionary, where the answer is a 7-word chain). Both searches return the same length; the bidirectional one did about a seventh of the work.


## 4. The Code in C++

~~~cpp
vector<string> ladder(const string& begin, const string& end, const vector<string>& wordList) {
    unordered_set<string> words(wordList.begin(), wordList.end());   // O(1) average lookups
    if (!words.count(end)) return {};
    words.erase(begin);                                // never come back to the start
    unordered_map<string, string> parent;
    queue<string> q;
    q.push(begin);
    while (!q.empty()) {
        string word = q.front(); q.pop();
        if (word == end) {                             // first time we pop end = shortest chain
            vector<string> chain{word};
            while (chain.back() != begin) chain.push_back(parent[chain.back()]);
            reverse(chain.begin(), chain.end());
            return chain;
        }
        string cand = word;                            // edit one copy in place
        for (size_t i = 0; i < cand.size(); i++) {
            char original = cand[i];
            for (char ch = 'a'; ch <= 'z'; ch++) {     // 26 candidates per position
                cand[i] = ch;
                if (words.erase(cand)) {               // erase returns 1 if it was there
                    parent[cand] = word;
                    q.push(cand);
                }
            }
            cand[i] = original;                        // restore before the next position
        }
    }
    return {};
}

int ladderLength(const string& begin, const string& end, const vector<string>& wordList) {
    return ladder(begin, end, wordList).size();
}
~~~

The C++ parts that matter:

- **\`unordered_set<string> words(wordList.begin(), wordList.end())\`** — the iterator-range constructor builds the hash set in one line. \`words.count(x)\` and \`words.erase(x)\` are average O(1) plus O(L) to hash the string. \`std::find(wordList.begin(), wordList.end(), cand)\` would scan the vector, O(N) per candidate.
- **\`words.erase(cand)\` as the test.** Erasing by key returns the number of elements removed — 0 or 1 for a set — so one call both checks membership and marks the word visited. \`words.erase(begin)\` is safe when \`begin\` is absent: it just returns 0.
- **\`cand[i] = ch\` edits the string in place.** Unlike Java, Python and JavaScript, \`std::string\` is mutable, so there is no new string per candidate for the edit itself; the restore line \`cand[i] = original\` puts the letter back before the next position. Hashing for the lookup still reads all L characters, and \`q.push(cand)\` copies it only when it is a real dictionary word.
- **\`string word = q.front(); q.pop();\`** — copy the front out before \`pop()\` destroys it (\`pop()\` returns \`void\`). \`string word = std::move(q.front());\` would move instead of copy, which is cheaper for long strings.
- **\`parent[cand] = word\`** — \`operator[]\` inserts or overwrites. In the rebuild loop \`parent[chain.back()]\` is only called for words we know are in the map; for anything else it would silently insert an empty string, so \`parent.at(...)\` (which throws on a missing key) is the safer choice when you are unsure.
- **Pass \`const string&\` and \`const vector<string>&\`** — taking them by value copies every word on every call.

### Bidirectional BFS in C++

~~~cpp
int twoWay(const string& begin, const string& end, const vector<string>& list, const string& alphabet) {
    unordered_set<string> remaining(list.begin(), list.end());
    expanded = 0;
    if (!remaining.count(end)) return 0;
    remaining.erase(begin);
    remaining.erase(end);
    vector<string> front{begin}, back{end};
    int length = 1;
    while (!front.empty() && !back.empty()) {
        if (front.size() > back.size()) swap(front, back);   // grow the smaller side (O(1) swap)
        unordered_set<string> backSet(back.begin(), back.end());
        vector<string> next;
        for (const string& word : front) {
            expanded++;
            for (const string& cand : neighbours(word, alphabet)) {
                if (backSet.count(cand)) return length + 1;  // the searches meet
                if (remaining.erase(cand)) next.push_back(cand);
            }
        }
        front = move(next);
        length++;
    }
    return 0;
}
~~~

\`swap(front, back)\` on two \`vector\`s exchanges their internal buffers in O(1) — no strings are copied — and \`front = move(next)\` hands over the next level the same way. Frontiers are vectors so the expansion order is deterministic (an \`unordered_set\` iterates in an unspecified order); \`backSet\` makes the meeting test O(1). \`length\` starts at 1 (just \`begin\`), grows by one per expanded level on either side, and the meeting edge adds the last word.

## 5. Verified: Running the Code

Both examples were saved as \`main.cpp\` and run with \`g++ -std=c++17 -O2 main.cpp -o main && ./main\` (GCC 13), and once more under \`-fsanitize=address,undefined\`, which reported nothing. Example 1 runs six cases — the two LeetCode 127 examples, a one-letter dictionary, a pair with no intermediate word, a three-word chain, and a one-step change — and prints the chain found through the parent map:

~~~text
hit -> cog: 5  hit -> hot -> dot -> dog -> cog
hit -> cog: 0
a -> c: 2  a -> c
hot -> dog: 0
hot -> dog: 3  hot -> dot -> dog
lost -> cost: 2  lost -> cost
5
~~~

\`hot -> dog\` with only \`{"hot", "dog"}\` is 0: the words differ in two letters and nothing is in between. \`a -> c\` is 2 because the answer counts words.

Example 2 builds four random dictionaries of 4-letter words over the letters \`a\`–\`h\` (fixed-seed Park–Miller generator with a \`long long\` seed, because signed \`int\` overflow would be undefined behaviour), always adding \`hhhh\`, and searches from \`aaaa\` to \`hhhh\` both ways, counting how many words each search expanded:

~~~text
dictionary of 301 words: length 0 vs 0
  one-way BFS expanded:        2
  bidirectional BFS expanded:  2
dictionary of 601 words: length 7 vs 7
  one-way BFS expanded:        215
  bidirectional BFS expanded:  30
dictionary of 1201 words: length 5 vs 5
  one-way BFS expanded:        159
  bidirectional BFS expanded:  9
dictionary of 2501 words: length 5 vs 5
  one-way BFS expanded:        322
  bidirectional BFS expanded:  17
~~~

Both searches always agree on the length (0 for the first dictionary, where no chain exists). Bidirectional BFS expanded 30 words instead of 215, 9 instead of 159, and 17 instead of 322.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Build all edges by comparing pairs, then BFS | O(N² · L) | O(N²) edges in the worst case | Every pair compared letter by letter |
| BFS with 26-letter candidates (this page) | O(N · 26 · L²) | O(N · L) | Each word expanded once; 26 · L candidates, each O(L) to hash |
| Same, but \`std::find\` on the vector | O(N² · 26 · L²) | O(N · L) | Every lookup scans the vector |
| Bidirectional BFS | Same worst case, far less in practice | O(N · L) | Two frontiers of about \`b^(d/2)\` words instead of one of \`b^d\` |
| BFS over wildcard buckets | O(N · L²) | O(N · L²) | No factor 26; see the [wildcard graph page](/interview-question/word-ladder-shortest-transformation-via-bfs-how-do-you-build-the-wildcard-graph) |

## Edge Cases

- **\`end\` not in the list** — return 0 immediately.
- **\`begin\` not in the list** — \`erase(begin)\` returns 0, no harm.
- **\`begin == end\`** — LeetCode guarantees they differ; decide the answer (1) before the loop if allowed.
- **No path** — the queue empties, return an empty vector (length 0).
- **Duplicates in the list** — the set removes them.
- **Characters outside \`a\`–\`z\`** — never generated, so such words are unreachable; widen the loop if the alphabet is larger.

## Common Pitfalls

- **Forgetting \`cand[i] = original\`** — later candidates change two letters at once.
- **\`std::find\` on the vector inside the loop** — an O(N) scan per candidate.
- **Marking visited on pop instead of on push** — the same word is pushed repeatedly.
- **Off-by-one** — the start counts as 1 word.
- **\`parent[x]\` on a missing key** — inserts an empty string; use \`.at()\` or \`find\` if you are not sure it exists.
- **Passing strings and vectors by value** — copies every word on every call.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Treat words as nodes and one-letter changes as edges, and run BFS from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">beginWord</code>; neighbours are the 26 · L one-letter variants that are in an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_set&lt;string&gt;</code>, and the first time I reach <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">endWord</code> its level is the answer.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why BFS:</strong> <span style="color:#f0e2c8;">Every change costs one step, so BFS reaches words in order of distance and the first arrival is the <strong style="color:#ffca28;">shortest</strong> chain; DFS would find a chain, not the shortest one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Visited and the answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">words.erase(cand)</code> returns 1 only if the word was there, so one call tests membership and marks it visited; the start has length 1 because the answer counts <strong style="color:#ffca28;">words</strong>, and a missing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">endWord</code> means 0.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(N · 26 · L²) time — each word expanded once, 26 · L candidates, each O(L) to hash — and O(N · L) space for the set, the queue and the parent map.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The C++ detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::string</code> is mutable, so I change <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cand[i]</code> in place and restore it after the 26 letters; I copy <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">q.front()</code> before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code>, and pass words by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const&amp;</code> so nothing is copied needlessly.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make it faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Bidirectional BFS: search from both ends, always expand the smaller frontier — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">swap</code> of two vectors is O(1) — and stop when a candidate lands in the other frontier. In example 2 it expanded 30 words instead of 215 for the same answer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you return the actual sequence?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map&lt;string, string&gt;</code> from each word to its parent, filled when it is pushed; when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">endWord</code> is popped, walk back to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">beginWord</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reverse</code> the vector — O(chain length) extra.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about returning all shortest sequences (Word Ladder II)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Run BFS level by level, store a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;string&gt;</code> of <strong style="color:#ffca28;">all</strong> parents from the previous level, and only erase a level's words from the set after the whole level is processed. Then backtrack from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">endWord</code> over those lists to emit every chain.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you avoid hashing strings altogether?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Map each word to an integer id once, then BFS over ids with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;int&gt;</code> distance array. Neighbour discovery still needs a string lookup (or wildcard buckets), but visited checks and parents become plain array accesses.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not precompute the graph by comparing every pair?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That is O(N² · L) before the search starts, which dominates for thousands of short words. Generating candidates only touches words that are actually one change away.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Implicit graph** | Nodes and edges computed on demand from a rule, never stored |
| **Unweighted shortest path** | Shortest path when every edge costs the same — what BFS finds |
| **Visited by deletion** | Erase a word from the dictionary set when it is queued, instead of a separate visited set |
| **Parent map** | Word → the word it was reached from; walked backwards to rebuild the chain |
| **Bidirectional BFS** | Two BFS searches from both ends that stop when they meet; expand the smaller frontier |

---
**Conclusion:** Word Ladder becomes a textbook BFS once you see the implicit graph: words are nodes, one-letter changes are edges, and BFS finds the shortest chain because every step costs the same. Generate neighbours by trying 26 letters at each position against an \`unordered_set\`, erase words as you queue them, and keep a parent map if you need the chain — O(N · 26 · L²) time and O(N · L) space. In C++ the decisive details are editing the candidate string in place and restoring it, using the count returned by \`erase\` as the membership test, and avoiding needless copies with \`const&\`, \`swap\` and \`move\`. Bidirectional BFS is the standard follow-up, and the [wildcard-bucket graph](/interview-question/word-ladder-shortest-transformation-via-bfs-how-do-you-build-the-wildcard-graph) removes the factor of 26. The same level-by-level search appears in [Rotting Oranges](/interview-question/how-do-you-solve-the-rotting-oranges-problem-with-multi-source-bfs) and in [level-order tree traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree).`,
        examples: [
          {
            label: "BFS word ladder on six inputs, printing the shortest chain",
            code: `#include <algorithm>
#include <iostream>
#include <queue>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>
using namespace std;

// BFS over words. Returns the shortest chain (empty if there is none).
vector<string> ladder(const string& begin, const string& end, const vector<string>& wordList) {
    unordered_set<string> words(wordList.begin(), wordList.end());   // O(1) average lookups
    if (!words.count(end)) return {};
    words.erase(begin);                                // never come back to the start
    unordered_map<string, string> parent;
    queue<string> q;
    q.push(begin);
    while (!q.empty()) {
        string word = q.front(); q.pop();
        if (word == end) {                             // first time we pop end = shortest chain
            vector<string> chain{word};
            while (chain.back() != begin) chain.push_back(parent[chain.back()]);
            reverse(chain.begin(), chain.end());
            return chain;
        }
        string cand = word;                            // edit one copy in place
        for (size_t i = 0; i < cand.size(); i++) {
            char original = cand[i];
            for (char ch = 'a'; ch <= 'z'; ch++) {     // 26 candidates per position
                cand[i] = ch;
                if (words.erase(cand)) {               // erase returns 1 if it was there
                    parent[cand] = word;
                    q.push(cand);
                }
            }
            cand[i] = original;                        // restore before the next position
        }
    }
    return {};
}

int ladderLength(const string& begin, const string& end, const vector<string>& wordList) {
    return ladder(begin, end, wordList).size();
}

int main() {
    struct Case { string begin, end; vector<string> words; };
    vector<Case> cases = {{"hit", "cog", {"hot", "dot", "dog", "lot", "log", "cog"}},
                          {"hit", "cog", {"hot", "dot", "dog", "lot", "log"}},
                          {"a", "c", {"a", "b", "c"}},
                          {"hot", "dog", {"hot", "dog"}},
                          {"hot", "dog", {"hot", "dot", "dog"}},
                          {"lost", "cost", {"most", "fist", "lost", "cost", "fish"}}};
    for (auto& c : cases) {
        vector<string> chain = ladder(c.begin, c.end, c.words);
        cout << c.begin << " -> " << c.end << ": " << chain.size();
        for (size_t i = 0; i < chain.size(); i++) cout << (i ? " -> " : "  ") << chain[i];
        cout << "\\n";
    }
    cout << ladderLength("hit", "cog", cases[0].words) << "\\n";  // 5
}`,
          },
          {
            label: "One-way BFS vs bidirectional BFS: words expanded on generated dictionaries",
            code: `#include <iostream>
#include <queue>
#include <string>
#include <unordered_set>
#include <utility>
#include <vector>
using namespace std;

const string LETTERS = "abcdefgh";                  // a small alphabet keeps the demo dense
long long seed = 2024;
int rnd() {                                         // Park-Miller generator; long long avoids overflow
    seed = seed * 48271 % 2147483647LL;
    return int(seed);
}

vector<string> neighbours(string word, const string& alphabet) {   // by value: we edit a copy
    vector<string> out;
    for (size_t i = 0; i < word.size(); i++) {
        char original = word[i];
        for (char ch : alphabet) {
            if (ch == original) continue;
            word[i] = ch;
            out.push_back(word);
        }
        word[i] = original;
    }
    return out;
}

int expanded = 0;

int oneWay(const string& begin, const string& end, const vector<string>& list, const string& alphabet) {
    unordered_set<string> words(list.begin(), list.end());
    expanded = 0;
    if (!words.count(end)) return 0;
    words.erase(begin);
    queue<pair<string, int>> q;
    q.push({begin, 1});
    while (!q.empty()) {
        auto [word, length] = q.front(); q.pop();
        expanded++;
        for (const string& cand : neighbours(word, alphabet)) {
            if (cand == end) return length + 1;
            if (words.erase(cand)) q.push({cand, length + 1});
        }
    }
    return 0;
}

int twoWay(const string& begin, const string& end, const vector<string>& list, const string& alphabet) {
    unordered_set<string> remaining(list.begin(), list.end());
    expanded = 0;
    if (!remaining.count(end)) return 0;
    remaining.erase(begin);
    remaining.erase(end);
    vector<string> front{begin}, back{end};
    int length = 1;
    while (!front.empty() && !back.empty()) {
        if (front.size() > back.size()) swap(front, back);   // grow the smaller side (O(1) swap)
        unordered_set<string> backSet(back.begin(), back.end());
        vector<string> next;
        for (const string& word : front) {
            expanded++;
            for (const string& cand : neighbours(word, alphabet)) {
                if (backSet.count(cand)) return length + 1;  // the searches meet
                if (remaining.erase(cand)) next.push_back(cand);
            }
        }
        front = move(next);
        length++;
    }
    return 0;
}

int main() {
    for (int size : {300, 600, 1200, 2500}) {
        vector<string> words;
        for (int k = 0; k < size; k++) {
            string w;
            for (int j = 0; j < 4; j++) w += LETTERS[rnd() % LETTERS.size()];
            words.push_back(w);
        }
        words.push_back("hhhh");
        int a = oneWay("aaaa", "hhhh", words, LETTERS);
        int ea = expanded;
        int b = twoWay("aaaa", "hhhh", words, LETTERS);
        cout << "dictionary of " << size + 1 << " words: length " << a << " vs " << b << "\\n";
        cout << "  one-way BFS expanded:        " << ea << "\\n";
        cout << "  bidirectional BFS expanded:  " << expanded << "\\n";
    }
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Word Ladder: shortest transformation via BFS — how do you build the wildcard graph?",
    difficulty: "medium",
    seoDescription: "Build the Word Ladder wildcard graph: bucket words by patterns like h*t, BFS through the buckets, clear them after use. O(N·L²), code in 4 languages.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"In Word Ladder you BFS from a begin word to an end word, changing one letter per step, using only dictionary words. Instead of trying all 26 letters at every position, build a wildcard graph: group the words by patterns like \`h*t\`, and use those groups to find neighbours. Show how you build it and how the BFS uses it, in Python."

**What a strong answer should cover:**
- The pattern idea: each word of length L yields L patterns (\`hot\` → \`*ot\`, \`h*t\`, \`ho*\`); two words are one letter apart **iff** they share a pattern.
- Building \`pattern → [words]\` buckets in O(N · L²) time and memory, including \`beginWord\`.
- BFS that looks up a word's L buckets for neighbours, marks visited on enqueue, and **clears each bucket after scanning it** so the whole search reads at most N · L entries.
- Comparison with pairwise comparison (O(N² · L)) and with the 26-letter method (O(N · 26 · L²)), and the memory cost of the buckets.
- Python specifics: \`collections.defaultdict(list)\` for building, \`.get(p, [])\` for reading so lookups do not insert empty buckets, and slicing \`w[:i] + "*" + w[i+1:]\` to make patterns.

**Clarifying questions expected:**
- Are all words the same length, and is the dictionary reused for many queries?

**Code / implementation expected:** Yes — a Python \`build_buckets(words)\` with \`defaultdict(list)\` and a BFS \`ladder(begin, end, word_list)\` that uses and clears the buckets.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know Python dicts and strings, and ideally have read the basic Word Ladder BFS; everything else is explained from scratch.
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by actually running the code with \`python3\` (3.13); nothing is typed in by hand.

## 1. Why This Even Matters — A Story First

Crossword solvers own a strange kind of dictionary: it is sorted by **pattern**. Stuck on "H _ T"? Look up \`h?t\` and the book lists HAT, HIT, HOT, HUT on one line. You do not compare HOT against all 100,000 words in the language to find its one-letter relatives — you look up the three lines \`?ot\`, \`h?t\` and \`ho?\`, and every word on those lines is exactly one letter away.

That is the **wildcard graph** for Word Ladder. The basic solution ([How do you solve the word ladder problem?](/interview-question/how-do-you-solve-the-word-ladder-problem)) runs a BFS over words where neighbours differ in one letter. The open question is how you *find* those neighbours. Comparing every pair of words is slow; trying all 26 letters at every position works but multiplies everything by 26. Grouping words into **buckets by wildcard pattern** — \`*ot\`, \`h*t\`, \`ho*\` — finds every neighbour of a word by reading L buckets, and it does not care how big the alphabet is.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are all words the same length L? | Patterns are built per position; words of other lengths never share a pattern, so they simply never connect. |
| What is the alphabet — lowercase \`a\`–\`z\` only? | The 26-letter approach depends on it; the wildcard approach does not. Pick a wildcard character that cannot appear in a word (\`*\`). |
| How many words, and how long? | Building buckets is O(N · L²) time and memory; pairwise comparison is O(N² · L). Large N with small L favours buckets strongly. |
| Is the dictionary reused for many queries? | Then build the buckets once and keep them; only the BFS runs per query (on a copy if you clear buckets). |
| Do I need the number of words, the chain, or all shortest chains? | The bucket graph is the same; only the BFS bookkeeping changes. |

## 3. The Core Idea: Words That Share a Pattern Are Neighbours

📌 **Interview term: Wildcard pattern** — a word with exactly one position replaced by a placeholder: \`hot\` → \`*ot\`, \`h*t\`, \`ho*\`. A word of length L has exactly L patterns.

📌 **Interview term: Bucket (inverted index)** — a hash map from each pattern to the list of words that produce it. "Inverted" because instead of word → patterns it stores pattern → words, which is the direction you need for lookups.

The key fact: **two different words of the same length differ in exactly one letter if and only if they share a pattern** — the pattern with the wildcard at the position where they differ. They cannot share two patterns (that would need them to agree everywhere except two different positions at once, which means they are equal). So every one-letter edge lives in exactly one bucket, and a bucket holding \`k\` words contributes \`k · (k - 1) / 2\` edges. Example 2 checks this: the edges counted by comparing every pair equal the sum over buckets — 747, 5,412 and 15,027 on three dictionaries.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 330" role="img" aria-label="Words on the left and patterns on the right. hit and hot connect to the pattern h star t. hot dot and lot connect to star o t. dot and dog connect to d o star. dog log and cog connect to star o g">
  <text class="d-text" x="120" y="26" text-anchor="middle">words</text>
  <text class="d-text d-accent" x="520" y="26" text-anchor="middle">buckets</text>
  <line class="d-edge" x1="160" y1="62" x2="470" y2="72"/>
  <line class="d-edge" x1="160" y1="102" x2="470" y2="78"/>
  <line class="d-edge" x1="160" y1="108" x2="470" y2="146"/>
  <line class="d-edge" x1="160" y1="142" x2="470" y2="152"/>
  <line class="d-edge" x1="160" y1="182" x2="470" y2="158"/>
  <line class="d-edge" x1="160" y1="148" x2="470" y2="222"/>
  <line class="d-edge" x1="160" y1="222" x2="470" y2="230"/>
  <line class="d-edge" x1="160" y1="228" x2="470" y2="296"/>
  <line class="d-edge" x1="160" y1="262" x2="470" y2="300"/>
  <line class="d-edge" x1="160" y1="302" x2="470" y2="306"/>
  <rect class="d-box-muted" x="80" y="44" width="80" height="34" rx="6"/>
  <text class="d-text" x="120" y="66" text-anchor="middle">hit</text>
  <rect class="d-box" x="80" y="88" width="80" height="34" rx="6"/>
  <text class="d-text" x="120" y="110" text-anchor="middle">hot</text>
  <rect class="d-box" x="80" y="128" width="80" height="34" rx="6"/>
  <text class="d-text" x="120" y="150" text-anchor="middle">dot</text>
  <rect class="d-box" x="80" y="168" width="80" height="34" rx="6"/>
  <text class="d-text" x="120" y="190" text-anchor="middle">lot</text>
  <rect class="d-box" x="80" y="208" width="80" height="34" rx="6"/>
  <text class="d-text" x="120" y="230" text-anchor="middle">dog</text>
  <rect class="d-box" x="80" y="248" width="80" height="34" rx="6"/>
  <text class="d-text" x="120" y="270" text-anchor="middle">log</text>
  <rect class="d-box-accent" x="80" y="288" width="80" height="34" rx="6"/>
  <text class="d-text d-accent" x="120" y="310" text-anchor="middle">cog</text>
  <rect class="d-box-accent" x="470" y="58" width="100" height="34" rx="6"/>
  <text class="d-text d-accent" x="520" y="80" text-anchor="middle">h*t</text>
  <rect class="d-box-accent" x="470" y="134" width="100" height="34" rx="6"/>
  <text class="d-text d-accent" x="520" y="156" text-anchor="middle">*ot</text>
  <rect class="d-box-accent" x="470" y="208" width="100" height="34" rx="6"/>
  <text class="d-text d-accent" x="520" y="230" text-anchor="middle">do*</text>
  <rect class="d-box-accent" x="470" y="284" width="100" height="34" rx="6"/>
  <text class="d-text d-accent" x="520" y="306" text-anchor="middle">*og</text>
</svg>

The four busiest buckets of the LeetCode example (\`lo*\` with lot and log is the fifth). Read it as a two-layer graph: from \`hot\` you step into the buckets \`h*t\` and \`*ot\`, and out of them to \`hit\`, \`dot\` and \`lot\` — exactly hot's one-letter neighbours. Buckets with a single word (like \`hi*\`, which only \`hit\` produces) connect nothing, and example 1 leaves them out of its listing.

📌 **Interview term: Bipartite word–pattern graph** — the picture above: two kinds of nodes, words and patterns, with edges only between the kinds. A word-to-word step is two hops (word → pattern → word). You can BFS this graph directly; the chain length in words is \`(hops / 2) + 1\`.

### Building it

For every word, for every position \`i\`, form the pattern (the word with position \`i\` replaced by \`*\`) and append the word to that pattern's bucket. N words × L patterns × O(L) to build and hash each pattern: **O(N · L²)** time, and the buckets hold N · L word entries: **O(N · L²)** memory counting the characters. Remember to put \`beginWord\` in too (it may not be in the list), or its patterns will have no entry.

### Searching it

Standard BFS from \`beginWord\`. When you pop a word, generate its L patterns; for each pattern, every word in the bucket that has not been visited is a neighbour — mark it and queue it. Then comes the trick that makes this fast:

📌 **Interview term: Clearing a used bucket** — after you scan a bucket, every word in it is visited (it was either visited before or you just visited it). Nothing in it can ever help again, so empty it. Each bucket is then scanned at most once in the whole search, so the BFS reads at most N · L entries in total.

Without clearing, a bucket of \`k\` words is scanned again by every one of its \`k\` words — about \`k²\` reads — and on dense dictionaries that brings the quadratic cost back. Example 2 measures it: on 2,095 words the BFS read 36,670 bucket entries without clearing and 8,369 with clearing, for the same answer.

### Which neighbour-finding method to use?

| Method | Build cost | Neighbours of one word | Best when |
| :--- | :--- | :--- | :--- |
| Compare every pair | O(N² · L) | precomputed list | N is small (a few hundred) |
| Try 26 letters per position | none | O(26 · L²) hash lookups | Alphabet is small and fixed; no extra memory wanted |
| Wildcard buckets | O(N · L²) | L bucket lookups + the bucket contents | Large N, any alphabet, dictionary reused across queries |

The numbers in example 2 make the first row concrete: 2,193,465 pair comparisons to find 15,027 edges, against 8,380 patterns built to find the same 15,027 edges.


## 4. The Code in Python

~~~python
from collections import defaultdict, deque


def patterns(word):
    """hot -> *ot, h*t, ho*  (one wildcard per position)."""
    return [word[:i] + "*" + word[i + 1:] for i in range(len(word))]


def build_buckets(words):
    buckets = defaultdict(list)                # pattern -> words that match it
    for w in words:
        for p in patterns(w):
            buckets[p].append(w)
    return buckets


def ladder(begin, end, word_list):
    if end not in set(word_list):
        return 0, []
    buckets = build_buckets([begin] + word_list)  # begin needs its patterns too
    parent = {begin: None}                     # also the visited set
    queue = deque([begin])
    while queue:
        word = queue.popleft()
        if word == end:
            chain = []
            while word is not None:
                chain.append(word)
                word = parent[word]
            return len(chain), chain[::-1]
        for p in patterns(word):
            for nxt in buckets.get(p, []):     # .get: do not create empty buckets
                if nxt not in parent:
                    parent[nxt] = word
                    queue.append(nxt)
            buckets[p] = []                    # every word here is now visited: never rescan
    return 0, []


words = ["hot", "dot", "dog", "lot", "log", "cog"]
buckets = build_buckets(["hit"] + words)
print("patterns: " + str(len(buckets)))
for p in sorted(buckets):
    if len(buckets[p]) >= 2:                   # a bucket with k words = k*(k-1)/2 edges
        print("  " + p + " -> " + ", ".join(buckets[p]))

for begin, end, wl in [("hit", "cog", words), ("hit", "cog", words[:-1]), ("hot", "dog", ["hot", "dog"])]:
    n, chain = ladder(begin, end, wl)
    print(begin + " -> " + end + ": " + str(n) + ("  " + " -> ".join(chain) if chain else ""))
~~~

The Python parts that matter:

- **\`defaultdict(list)\`** — a \`dict\` that calls \`list()\` to create a value the first time a missing key is used. \`buckets[p].append(w)\` then works without an \`if p not in buckets\` check. That is exactly right while **building**.
- **\`buckets.get(p, [])\` while searching** — reading a \`defaultdict\` with \`[]\` also creates the key. In the BFS that would insert an empty bucket for every pattern of every word you look at; \`.get\` returns the default without inserting. The snippet below shows the difference.
- **\`word[:i] + "*" + word[i + 1:]\`** — strings are immutable, so each pattern is a new string built in O(L); with L patterns per word that is the O(L²) per word in the build cost. \`*\` is safe as the wildcard because it never occurs in a lowercase word.
- **\`build_buckets([begin] + word_list)\`** — \`begin\` may not be in the list, but its patterns are how the BFS takes its first step. Duplicates (if \`begin\` is in the list too) are harmless: the visited check skips them.
- **\`parent\` doubles as the visited set** — \`nxt not in parent\` is an O(1) average \`dict\` lookup.
- **\`buckets[p] = []\`** after scanning — the clearing step. Every word in the bucket is now visited, so the bucket can never contribute again.

📌 **Interview term: Amortised bucket scanning** — with clearing, the total number of bucket entries read across the whole BFS is at most the total number stored, N · L, no matter how the work is spread across individual pops. That is what makes the search O(N · L²) overall.

The \`defaultdict\` trap, checked by running it:

~~~python
from collections import defaultdict

buckets = defaultdict(list)
for w in ["hot", "dot"]:
    for i in range(len(w)):
        buckets[w[:i] + "*" + w[i + 1:]].append(w)
print("buckets after building:", len(buckets))

print("lookup with .get:", buckets.get("z*z", []), "-> size", len(buckets))
print("lookup with []:  ", buckets["z*z"], "-> size", len(buckets))   # [] INSERTS the key
~~~

~~~text
buckets after building: 5
lookup with .get: [] -> size 5
lookup with []:   [] -> size 6
~~~

Reading \`buckets["z*z"]\` grew the dictionary from 5 to 6 entries. In a BFS that probes L patterns per word, that silently fills memory with empty lists — use \`.get\` for lookups.

## 5. Verified: Running the Code

Both examples were saved as \`main.py\` and run with \`python3 main.py\` (Python 3.13). Example 1 builds the buckets for \`hit\` plus the LeetCode 127 list, prints how many distinct patterns there are and every bucket that holds at least two words (the ones that create edges), then runs the bucket BFS on three queries:

~~~text
patterns: 14
  *og -> dog, log, cog
  *ot -> hot, dot, lot
  do* -> dot, dog
  h*t -> hit, hot
  lo* -> lot, log
hit -> cog: 5  hit -> hot -> dot -> dog -> cog
hit -> cog: 0
hot -> dog: 0
~~~

Seven words of length 3 produce 21 patterns, of which 14 are distinct. Only five buckets hold two or more words, and together they contain \`3 + 3 + 1 + 1 + 1 = 9\` edges (a bucket of 3 words gives 3 edges, a bucket of 2 gives 1) — the whole graph of this example. The BFS finds the same 5-word chain as the 26-letter version.

Example 2 builds three random dictionaries of distinct 4-letter words over the letters \`a\`–\`h\` (fixed seed, so every language builds the same words) and measures both the build and the search:

~~~text
476 distinct words, 1296 buckets
  pairwise: 113050 pairs compared, 747 edges
  buckets:  1904 patterns made, 747 edges
  BFS length 8 = 8; entries scanned 606 without clearing, 387 with clearing
1264 distinct words, 1942 buckets
  pairwise: 798216 pairs compared, 5412 edges
  buckets:  5056 patterns made, 5412 edges
  BFS length 5 = 5; entries scanned 6647 without clearing, 3092 with clearing
2095 distinct words, 2044 buckets
  pairwise: 2193465 pairs compared, 15027 edges
  buckets:  8380 patterns made, 15027 edges
  BFS length 6 = 6; entries scanned 36670 without clearing, 8369 with clearing
~~~

Three things to read off it:

- **The edge counts match.** Comparing every pair and summing \`k · (k - 1) / 2\` over the buckets find exactly the same edges (747, 5,412, 15,027), which confirms that every one-letter edge sits in exactly one bucket.
- **The build costs diverge.** Pairwise comparison grows with N²: 113,050 → 2,193,465 pairs as the dictionary grows about 4.4 times. Pattern generation grows with N: 1,904 → 8,380.
- **Clearing matters.** The BFS answer is identical with and without clearing, but the number of bucket entries read drops from 36,670 to 8,369 on the largest dictionary — and with clearing it can never exceed the 8,380 entries stored.

## 6. Complexity

| Step | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Build buckets | O(N · L²) | O(N · L²) | N · L patterns, each built and hashed in O(L); N · L stored entries |
| BFS with clearing | O(N · L²) | O(N · L) for the queue and \`parent\` | L patterns per popped word, each O(L) to build and hash; each bucket read at most once in total |
| BFS without clearing | up to O(Σ k² + N · L²) | same | A bucket of k words is scanned by each of its k words |
| Pairwise graph build (for comparison) | O(N² · L) | O(E) | Every pair compared letter by letter |
| 26-letter BFS (for comparison) | O(N · 26 · L²) | O(N · L) | 26 · L candidates per word |

N is the number of words, L the word length, k a bucket size.

## Edge Cases

- **\`end\` not in the list** — return 0 before building anything (example 1, second query).
- **\`begin\` not in the list** — it is added when building, so its patterns exist.
- **No chain** — \`hot → dog\` with only \`["hot", "dog"]\`: they share no pattern (two letters differ), the BFS ends, 0.
- **Words of different lengths** — they never share a pattern, so they are simply unreachable from a word of another length.
- **Duplicate words** — appear twice in a bucket; the visited check skips the second copy.
- **Reusing the buckets for many queries** — the BFS clears them, so search on a copy (example 2 copies with \`{p: list(ws) for ...}\`) or rebuild.

## Common Pitfalls

- **Not clearing used buckets** — correct but slower; on dense dictionaries it brings back quadratic work (36,670 vs 8,369 reads in example 2).
- **\`buckets[p]\` on a \`defaultdict\` during the search** — inserts empty lists for every probed pattern; use \`.get(p, [])\`.
- **Forgetting to add \`begin\`'s patterns** — the BFS cannot leave the start word.
- **Using a wildcard character that can appear in words** — then two unrelated words could share a "pattern"; pick a character outside the alphabet.
- **Counting hops in the word–pattern graph as words** — if you BFS the two-layer graph, the answer is \`hops / 2 + 1\`.
- **Clearing a shared bucket map you still need** — copy it first if the dictionary is reused.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">For every word I generate its L patterns, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*ot</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h*t</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ho*</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hot</code>, and append the word to a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defaultdict(list)</code> bucket per pattern; two words are one letter apart exactly when they share a bucket.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How the BFS uses it:</strong> <span style="color:#f0e2c8;">When I pop a word, I read its L buckets with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.get(p, [])</code>, queue every unvisited word in them, and then <strong style="color:#ffca28;">clear</strong> each bucket, because everything in it is now visited.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">Building is O(N · L²) time and memory; with clearing, the BFS reads each stored entry at most once, so it is O(N · L²) too — no factor 26 and no N² pairwise comparison.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why clearing matters:</strong> <span style="color:#f0e2c8;">Without it, a bucket of k words is rescanned by each of its k words, about k² reads; in my measurement on 2,095 words that was 36,670 reads instead of 8,369 for the same answer.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The Python detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defaultdict(list)</code> only while building, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.get</code> while searching so lookups do not insert empty buckets, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">begin</code> added to the build, and a copy of the buckets if the dictionary is reused, since clearing destroys them.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it true that sharing a pattern means one letter apart?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If two different words share the pattern with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*</code> at position <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>, they agree everywhere except <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>, and they are different, so they differ in exactly that letter. They cannot share two patterns, or they would agree everywhere and be the same word.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you still use the 26-letter method?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the alphabet is small and fixed, N is modest, and I do not want O(N · L²) extra memory for buckets; it needs nothing but a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code>. For a large or unknown alphabet, or a dictionary queried many times, buckets win.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How much memory do the buckets take?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">N · L list entries pointing at the words, plus up to N · L distinct pattern keys of length L — O(N · L²) characters. For 5,000 words of length 10 that is 50,000 entries, which is small.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you combine buckets with bidirectional BFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. The buckets are just the neighbour function; bidirectional BFS only changes which frontier is expanded. Keep a separate visited set per side, or clear buckets only when both sides are done with them.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return all shortest chains with buckets?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Do not clear a bucket in the middle of a level, because another word of the same level may need the same neighbours as an extra parent. Process whole levels, record every parent, and clear or mark visited only after the level ends.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Wildcard pattern** | A word with one position replaced by \`*\`; a word of length L has L of them |
| **Bucket (inverted index)** | \`dict\` from pattern to the words that produce it |
| **Bipartite word–pattern graph** | Two node kinds, words and patterns; one word-to-word step is two hops |
| **Clearing a used bucket** | Empty a bucket after scanning it, since all its words are now visited |
| **Amortised bucket scanning** | With clearing, the whole BFS reads at most N · L bucket entries in total |

---
**Conclusion:** The wildcard graph turns "which words are one letter away?" into a dictionary lookup: bucket every word under its L patterns, and two words are neighbours exactly when they share a bucket. Building the buckets is O(N · L²), the BFS reads a word's L buckets for its neighbours, and clearing each bucket after use keeps the whole search at O(N · L²) — independent of the alphabet and far below the O(N² · L) of comparing every pair. In Python, build with \`defaultdict(list)\`, read with \`.get\` so lookups do not insert, include the begin word, and copy the buckets if you will search again. For the basic BFS, the parent map and bidirectional search, see [How do you solve the word ladder problem?](/interview-question/how-do-you-solve-the-word-ladder-problem); the BFS-versus-DFS background is in [What is the difference between BFS and DFS?](/interview-question/what-is-the-difference-between-bfs-and-dfs)`,
        examples: [
          {
            label: "Building the wildcard buckets for the LeetCode list, then BFS through them",
            code: `from collections import defaultdict, deque


def patterns(word):
    """hot -> *ot, h*t, ho*  (one wildcard per position)."""
    return [word[:i] + "*" + word[i + 1:] for i in range(len(word))]


def build_buckets(words):
    buckets = defaultdict(list)                # pattern -> words that match it
    for w in words:
        for p in patterns(w):
            buckets[p].append(w)
    return buckets


def ladder(begin, end, word_list):
    if end not in set(word_list):
        return 0, []
    buckets = build_buckets([begin] + word_list)  # begin needs its patterns too
    parent = {begin: None}                     # also the visited set
    queue = deque([begin])
    while queue:
        word = queue.popleft()
        if word == end:
            chain = []
            while word is not None:
                chain.append(word)
                word = parent[word]
            return len(chain), chain[::-1]
        for p in patterns(word):
            for nxt in buckets.get(p, []):     # .get: do not create empty buckets
                if nxt not in parent:
                    parent[nxt] = word
                    queue.append(nxt)
            buckets[p] = []                    # every word here is now visited: never rescan
    return 0, []


words = ["hot", "dot", "dog", "lot", "log", "cog"]
buckets = build_buckets(["hit"] + words)
print("patterns: " + str(len(buckets)))
for p in sorted(buckets):
    if len(buckets[p]) >= 2:                   # a bucket with k words = k*(k-1)/2 edges
        print("  " + p + " -> " + ", ".join(buckets[p]))

for begin, end, wl in [("hit", "cog", words), ("hit", "cog", words[:-1]), ("hot", "dog", ["hot", "dog"])]:
    n, chain = ladder(begin, end, wl)
    print(begin + " -> " + end + ": " + str(n) + ("  " + " -> ".join(chain) if chain else ""))`,
          },
          {
            label: "Pairwise comparison vs wildcard buckets, and BFS with vs without clearing buckets",
            code: `from collections import defaultdict, deque

LETTERS = "abcdefgh"
seed = 7


def rand():                                    # Park-Miller generator: same words in every language
    global seed
    seed = seed * 48271 % 2147483647
    return seed


def patterns(word):
    return [word[:i] + "*" + word[i + 1:] for i in range(len(word))]


def pairwise_edges(words):
    """Compare every pair letter by letter: O(N^2 * L)."""
    pairs = edges = 0
    for i in range(len(words)):
        for j in range(i + 1, len(words)):
            pairs += 1
            diff = sum(1 for a, b in zip(words[i], words[j]) if a != b)
            edges += diff == 1
    return pairs, edges


def bucket_edges(words):
    """Group by wildcard pattern: O(N * L^2). A bucket of k words holds k*(k-1)/2 edges."""
    buckets = defaultdict(list)
    for w in words:
        for p in patterns(w):
            buckets[p].append(w)
    edges = sum(len(b) * (len(b) - 1) // 2 for b in buckets.values())
    return buckets, len(words) * len(words[0]), edges


def bfs(begin, end, buckets, clear):
    buckets = {p: list(ws) for p, ws in buckets.items()}   # private copy: we may clear it
    dist, queue, scanned = {begin: 1}, deque([begin]), 0
    while queue:
        word = queue.popleft()
        if word == end:
            return dist[word], scanned
        for p in patterns(word):
            for nxt in buckets.get(p, []):
                scanned += 1
                if nxt not in dist:
                    dist[nxt] = dist[word] + 1
                    queue.append(nxt)
            if clear:
                buckets[p] = []
    return 0, scanned


for size in [500, 1500, 3000]:
    seen, words = set(), []
    for _ in range(size):
        w = "".join(LETTERS[rand() % len(LETTERS)] for _ in range(4))
        if w not in seen:                      # keep the first copy of each word, in order
            seen.add(w)
            words.append(w)
    for extra in ["aaaa", "hhhh"]:
        if extra not in seen:
            seen.add(extra)
            words.append(extra)
    pairs, e1 = pairwise_edges(words)
    buckets, made, e2 = bucket_edges(words)
    a, s1 = bfs("aaaa", "hhhh", buckets, clear=False)
    b, s2 = bfs("aaaa", "hhhh", buckets, clear=True)
    print(str(len(words)) + " distinct words, " + str(len(buckets)) + " buckets")
    print("  pairwise: " + str(pairs) + " pairs compared, " + str(e1) + " edges")
    print("  buckets:  " + str(made) + " patterns made, " + str(e2) + " edges")
    print("  BFS length " + str(a) + " = " + str(b) + "; entries scanned " + str(s1) +
          " without clearing, " + str(s2) + " with clearing")`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"In Word Ladder you BFS from a begin word to an end word, changing one letter per step, using only dictionary words. Instead of trying all 26 letters at every position, build a wildcard graph: group the words by patterns like \`h*t\`, and use those groups to find neighbours. Show how you build it and how the BFS uses it, in JavaScript."

**What a strong answer should cover:**
- The pattern idea: each word of length L yields L patterns (\`hot\` → \`*ot\`, \`h*t\`, \`ho*\`); two words are one letter apart **iff** they share a pattern.
- Building \`pattern → [words]\` buckets in O(N · L²) time and memory, including \`beginWord\`.
- BFS that looks up a word's L buckets for neighbours, marks visited on enqueue, and **clears each bucket after scanning it** so the whole search reads at most N · L entries.
- Comparison with pairwise comparison (O(N² · L)) and with the 26-letter method (O(N · 26 · L²)), and the memory cost of the buckets.
- JavaScript specifics: a \`Map\` (not a plain object) from pattern to array, \`buckets.get(p) || []\` for missing patterns, \`slice\` to build patterns, and copying arrays with \`slice()\` before clearing if the buckets are reused.

**Clarifying questions expected:**
- Are all words the same length, and is the dictionary reused for many queries?

**Code / implementation expected:** Yes — a JavaScript \`buildBuckets(words)\` returning a \`Map\`, and a BFS \`ladder(begin, end, wordList)\` that uses and clears the buckets.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know JavaScript strings, arrays and \`Map\`, and ideally have read the basic Word Ladder BFS; everything else is explained from scratch.
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by actually running the code with \`node\` (v22); nothing is typed in by hand. The examples use no Node-only APIs, so they also run in the browser.

## 1. Why This Even Matters — A Story First

Crossword solvers own a strange kind of dictionary: it is sorted by **pattern**. Stuck on "H _ T"? Look up \`h?t\` and the book lists HAT, HIT, HOT, HUT on one line. You do not compare HOT against all 100,000 words in the language to find its one-letter relatives — you look up the three lines \`?ot\`, \`h?t\` and \`ho?\`, and every word on those lines is exactly one letter away.

That is the **wildcard graph** for Word Ladder. The basic solution ([How do you solve the word ladder problem?](/interview-question/how-do-you-solve-the-word-ladder-problem)) runs a BFS over words where neighbours differ in one letter. The open question is how you *find* those neighbours. Comparing every pair of words is slow; trying all 26 letters at every position works but multiplies everything by 26. Grouping words into **buckets by wildcard pattern** — \`*ot\`, \`h*t\`, \`ho*\` — finds every neighbour of a word by reading L buckets, and it does not care how big the alphabet is.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are all words the same length L? | Patterns are built per position; words of other lengths never share a pattern, so they simply never connect. |
| What is the alphabet — lowercase \`a\`–\`z\` only? | The 26-letter approach depends on it; the wildcard approach does not. Pick a wildcard character that cannot appear in a word (\`*\`). |
| How many words, and how long? | Building buckets is O(N · L²) time and memory; pairwise comparison is O(N² · L). Large N with small L favours buckets strongly. |
| Is the dictionary reused for many queries? | Then build the buckets once and keep them; only the BFS runs per query (on a copy if you clear buckets). |
| Do I need the number of words, the chain, or all shortest chains? | The bucket graph is the same; only the BFS bookkeeping changes. |

## 3. The Core Idea: Words That Share a Pattern Are Neighbours

📌 **Interview term: Wildcard pattern** — a word with exactly one position replaced by a placeholder: \`hot\` → \`*ot\`, \`h*t\`, \`ho*\`. A word of length L has exactly L patterns.

📌 **Interview term: Bucket (inverted index)** — a hash map from each pattern to the list of words that produce it. "Inverted" because instead of word → patterns it stores pattern → words, which is the direction you need for lookups.

The key fact: **two different words of the same length differ in exactly one letter if and only if they share a pattern** — the pattern with the wildcard at the position where they differ. They cannot share two patterns (that would need them to agree everywhere except two different positions at once, which means they are equal). So every one-letter edge lives in exactly one bucket, and a bucket holding \`k\` words contributes \`k · (k - 1) / 2\` edges. Example 2 checks this: the edges counted by comparing every pair equal the sum over buckets — 747, 5,412 and 15,027 on three dictionaries.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 330" role="img" aria-label="Words on the left and patterns on the right. hit and hot connect to the pattern h star t. hot dot and lot connect to star o t. dot and dog connect to d o star. dog log and cog connect to star o g">
  <text class="d-text" x="120" y="26" text-anchor="middle">words</text>
  <text class="d-text d-accent" x="520" y="26" text-anchor="middle">buckets</text>
  <line class="d-edge" x1="160" y1="62" x2="470" y2="72"/>
  <line class="d-edge" x1="160" y1="102" x2="470" y2="78"/>
  <line class="d-edge" x1="160" y1="108" x2="470" y2="146"/>
  <line class="d-edge" x1="160" y1="142" x2="470" y2="152"/>
  <line class="d-edge" x1="160" y1="182" x2="470" y2="158"/>
  <line class="d-edge" x1="160" y1="148" x2="470" y2="222"/>
  <line class="d-edge" x1="160" y1="222" x2="470" y2="230"/>
  <line class="d-edge" x1="160" y1="228" x2="470" y2="296"/>
  <line class="d-edge" x1="160" y1="262" x2="470" y2="300"/>
  <line class="d-edge" x1="160" y1="302" x2="470" y2="306"/>
  <rect class="d-box-muted" x="80" y="44" width="80" height="34" rx="6"/>
  <text class="d-text" x="120" y="66" text-anchor="middle">hit</text>
  <rect class="d-box" x="80" y="88" width="80" height="34" rx="6"/>
  <text class="d-text" x="120" y="110" text-anchor="middle">hot</text>
  <rect class="d-box" x="80" y="128" width="80" height="34" rx="6"/>
  <text class="d-text" x="120" y="150" text-anchor="middle">dot</text>
  <rect class="d-box" x="80" y="168" width="80" height="34" rx="6"/>
  <text class="d-text" x="120" y="190" text-anchor="middle">lot</text>
  <rect class="d-box" x="80" y="208" width="80" height="34" rx="6"/>
  <text class="d-text" x="120" y="230" text-anchor="middle">dog</text>
  <rect class="d-box" x="80" y="248" width="80" height="34" rx="6"/>
  <text class="d-text" x="120" y="270" text-anchor="middle">log</text>
  <rect class="d-box-accent" x="80" y="288" width="80" height="34" rx="6"/>
  <text class="d-text d-accent" x="120" y="310" text-anchor="middle">cog</text>
  <rect class="d-box-accent" x="470" y="58" width="100" height="34" rx="6"/>
  <text class="d-text d-accent" x="520" y="80" text-anchor="middle">h*t</text>
  <rect class="d-box-accent" x="470" y="134" width="100" height="34" rx="6"/>
  <text class="d-text d-accent" x="520" y="156" text-anchor="middle">*ot</text>
  <rect class="d-box-accent" x="470" y="208" width="100" height="34" rx="6"/>
  <text class="d-text d-accent" x="520" y="230" text-anchor="middle">do*</text>
  <rect class="d-box-accent" x="470" y="284" width="100" height="34" rx="6"/>
  <text class="d-text d-accent" x="520" y="306" text-anchor="middle">*og</text>
</svg>

The four busiest buckets of the LeetCode example (\`lo*\` with lot and log is the fifth). Read it as a two-layer graph: from \`hot\` you step into the buckets \`h*t\` and \`*ot\`, and out of them to \`hit\`, \`dot\` and \`lot\` — exactly hot's one-letter neighbours. Buckets with a single word (like \`hi*\`, which only \`hit\` produces) connect nothing, and example 1 leaves them out of its listing.

📌 **Interview term: Bipartite word–pattern graph** — the picture above: two kinds of nodes, words and patterns, with edges only between the kinds. A word-to-word step is two hops (word → pattern → word). You can BFS this graph directly; the chain length in words is \`(hops / 2) + 1\`.

### Building it

For every word, for every position \`i\`, form the pattern (the word with position \`i\` replaced by \`*\`) and append the word to that pattern's bucket. N words × L patterns × O(L) to build and hash each pattern: **O(N · L²)** time, and the buckets hold N · L word entries: **O(N · L²)** memory counting the characters. Remember to put \`beginWord\` in too (it may not be in the list), or its patterns will have no entry.

### Searching it

Standard BFS from \`beginWord\`. When you pop a word, generate its L patterns; for each pattern, every word in the bucket that has not been visited is a neighbour — mark it and queue it. Then comes the trick that makes this fast:

📌 **Interview term: Clearing a used bucket** — after you scan a bucket, every word in it is visited (it was either visited before or you just visited it). Nothing in it can ever help again, so empty it. Each bucket is then scanned at most once in the whole search, so the BFS reads at most N · L entries in total.

Without clearing, a bucket of \`k\` words is scanned again by every one of its \`k\` words — about \`k²\` reads — and on dense dictionaries that brings the quadratic cost back. Example 2 measures it: on 2,095 words the BFS read 36,670 bucket entries without clearing and 8,369 with clearing, for the same answer.

### Which neighbour-finding method to use?

| Method | Build cost | Neighbours of one word | Best when |
| :--- | :--- | :--- | :--- |
| Compare every pair | O(N² · L) | precomputed list | N is small (a few hundred) |
| Try 26 letters per position | none | O(26 · L²) hash lookups | Alphabet is small and fixed; no extra memory wanted |
| Wildcard buckets | O(N · L²) | L bucket lookups + the bucket contents | Large N, any alphabet, dictionary reused across queries |

The numbers in example 2 make the first row concrete: 2,193,465 pair comparisons to find 15,027 edges, against 8,380 patterns built to find the same 15,027 edges.


## 4. The Code in JavaScript

~~~javascript
// hot -> *ot, h*t, ho*  (one wildcard per position).
function patterns(word) {
  const out = [];
  for (let i = 0; i < word.length; i++) out.push(word.slice(0, i) + '*' + word.slice(i + 1));
  return out;
}

function buildBuckets(words) {
  const buckets = new Map();                     // pattern -> words that match it
  for (const w of words) {
    for (const p of patterns(w)) {
      if (!buckets.has(p)) buckets.set(p, []);
      buckets.get(p).push(w);
    }
  }
  return buckets;
}

function ladder(begin, end, wordList) {
  if (!wordList.includes(end)) return [0, []];   // one O(N) check up front is fine
  const buckets = buildBuckets([begin, ...wordList]);   // begin needs its patterns too
  const parent = new Map([[begin, null]]);       // also the visited set
  const queue = [begin];
  for (let head = 0; head < queue.length; head++) {
    let word = queue[head];
    if (word === end) {
      const chain = [];
      while (word !== null) { chain.push(word); word = parent.get(word); }
      return [chain.length, chain.reverse()];
    }
    for (const p of patterns(word)) {
      for (const next of buckets.get(p) || []) {
        if (!parent.has(next)) { parent.set(next, word); queue.push(next); }
      }
      buckets.set(p, []);                        // every word here is now visited: never rescan
    }
  }
  return [0, []];
}

const words = ['hot', 'dot', 'dog', 'lot', 'log', 'cog'];
const buckets = buildBuckets(['hit', ...words]);
console.log('patterns: ' + buckets.size);
for (const p of [...buckets.keys()].sort()) {   // string sort is right here: keys are strings
  if (buckets.get(p).length >= 2) console.log('  ' + p + ' -> ' + buckets.get(p).join(', '));
}

for (const [begin, end, wl] of [['hit', 'cog', words], ['hit', 'cog', words.slice(0, -1)], ['hot', 'dog', ['hot', 'dog']]]) {
  const [n, chain] = ladder(begin, end, wl);
  console.log(begin + ' -> ' + end + ': ' + n + (chain.length ? '  ' + chain.join(' -> ') : ''));
}
~~~

The JavaScript parts that matter:

- **\`new Map()\` for the buckets.** A \`Map\` takes any string as a key, has an O(1) \`size\`, and iterates in insertion order. A plain object would also work for pattern strings, but it inherits keys from \`Object.prototype\` (so \`"constructor" in {}\` is \`true\`), and its size needs \`Object.keys(obj).length\`. \`Map\` is the idiomatic hash map.
- **\`if (!buckets.has(p)) buckets.set(p, []); buckets.get(p).push(w);\`** — the build step. There is no \`defaultdict\` in JavaScript; this two-line pattern (or \`buckets.set(p, [...(buckets.get(p) || []), w])\`, which copies — avoid it) is the usual way.
- **\`buckets.get(p) || []\`** during the search — \`get\` returns \`undefined\` for a missing key, and \`|| []\` turns that into an empty array to iterate. Unlike Python's \`defaultdict\`, a \`Map.get\` never inserts anything.
- **\`word.slice(0, i) + '*' + word.slice(i + 1)\`** — strings are immutable, so each pattern is a new O(L) string; L patterns per word give the O(L²) per word in the build.
- **\`[begin, ...wordList]\`** — spread syntax makes a new array with \`begin\` first, so its patterns exist even if it is not in the list.
- **\`wordList.includes(end)\`** — an O(N) scan, but it runs **once** before the search, which is fine. The mistake would be using \`includes\` inside the BFS loop.
- **\`buckets.set(p, [])\`** after scanning — the clearing step; every word in that bucket is now visited.
- **\`[...buckets.keys()].sort()\`** in the demo — the default \`sort\` compares strings by UTF-16 code units, which is what we want for pattern keys (\`*\` has code 42, so \`*og\` sorts before \`do*\`). For numbers it would be wrong.

📌 **Interview term: Amortised bucket scanning** — with clearing, the total number of bucket entries read across the whole BFS is at most the total number stored, N · L, no matter how the work is spread across individual pops. That is what makes the search O(N · L²) overall.

## 5. Verified: Running the Code

Both examples were saved as \`main.js\` and run with \`node main.js\` (Node.js v22). Example 1 builds the buckets for \`hit\` plus the LeetCode 127 list, prints how many distinct patterns there are and every bucket that holds at least two words (the ones that create edges), then runs the bucket BFS on three queries:

~~~text
patterns: 14
  *og -> dog, log, cog
  *ot -> hot, dot, lot
  do* -> dot, dog
  h*t -> hit, hot
  lo* -> lot, log
hit -> cog: 5  hit -> hot -> dot -> dog -> cog
hit -> cog: 0
hot -> dog: 0
~~~

Seven words of length 3 produce 21 patterns, of which 14 are distinct. Only five buckets hold two or more words, and together they contain \`3 + 3 + 1 + 1 + 1 = 9\` edges — the whole graph of this example. The BFS finds the same 5-word chain as the 26-letter version.

Example 2 builds three random dictionaries of distinct 4-letter words over the letters \`a\`–\`h\` (fixed-seed generator, so every language builds the same words) and measures both the build and the search. The BFS works on a copy of the buckets (\`ws.slice()\` per bucket), because clearing destroys them:

~~~text
476 distinct words, 1296 buckets
  pairwise: 113050 pairs compared, 747 edges
  buckets:  1904 patterns made, 747 edges
  BFS length 8 = 8; entries scanned 606 without clearing, 387 with clearing
1264 distinct words, 1942 buckets
  pairwise: 798216 pairs compared, 5412 edges
  buckets:  5056 patterns made, 5412 edges
  BFS length 5 = 5; entries scanned 6647 without clearing, 3092 with clearing
2095 distinct words, 2044 buckets
  pairwise: 2193465 pairs compared, 15027 edges
  buckets:  8380 patterns made, 15027 edges
  BFS length 6 = 6; entries scanned 36670 without clearing, 8369 with clearing
~~~

Three things to read off it:

- **The edge counts match.** Comparing every pair and summing \`k · (k - 1) / 2\` over the buckets find exactly the same edges (747, 5,412, 15,027).
- **The build costs diverge.** Pairwise comparison grows with N²: 113,050 → 2,193,465 pairs as the dictionary grows about 4.4 times; pattern generation grows with N: 1,904 → 8,380.
- **Clearing matters.** The answer is identical, but the bucket entries read drop from 36,670 to 8,369 on the largest dictionary — and with clearing they can never exceed the 8,380 stored.

## 6. Complexity

| Step | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Build buckets | O(N · L²) | O(N · L²) | N · L patterns, each built and hashed in O(L); N · L stored entries |
| BFS with clearing | O(N · L²) | O(N · L) for the queue and \`parent\` | L patterns per popped word; each bucket read at most once in total |
| BFS without clearing | up to O(Σ k² + N · L²) | same | A bucket of k words is scanned by each of its k words |
| Pairwise graph build (for comparison) | O(N² · L) | O(E) | Every pair compared letter by letter |
| 26-letter BFS (for comparison) | O(N · 26 · L²) | O(N · L) | 26 · L candidates per word |

## Edge Cases

- **\`end\` not in the list** — return 0 before building anything.
- **\`begin\` not in the list** — it is added to the build with spread syntax.
- **No chain** — \`hot → dog\` with only \`["hot", "dog"]\` share no pattern; 0.
- **Words of different lengths** — never share a pattern, so they are unreachable from each other.
- **Duplicate words** — appear twice in a bucket; the visited check skips the second copy.
- **Reusing the buckets** — clear a copy, not the original (example 2 copies each array with \`slice()\`).

## Common Pitfalls

- **Not clearing used buckets** — correct but slower; 36,670 vs 8,369 reads in example 2.
- **Forgetting \`|| []\`** — \`for (const x of undefined)\` throws \`TypeError\` when a pattern has no bucket.
- **Copying arrays on every push** (\`[...old, w]\`) — turns the O(N · L) build into something quadratic in bucket size.
- **Forgetting to add \`begin\`'s patterns** — the BFS cannot leave the start word.
- **A wildcard character that can appear in words** — unrelated words could collide; pick one outside the alphabet.
- **\`Array.includes\` inside the BFS loop** — an O(N) scan per lookup; keep membership in a \`Map\`/\`Set\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">For every word I generate its L patterns, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*ot</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h*t</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ho*</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hot</code>, and push the word into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> from pattern to array; two words are one letter apart exactly when they share a bucket.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How the BFS uses it:</strong> <span style="color:#f0e2c8;">When I pop a word, I read its L buckets with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">buckets.get(p) || []</code>, queue every unvisited word in them, and then <strong style="color:#ffca28;">clear</strong> each bucket with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">buckets.set(p, [])</code>, because everything in it is now visited.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">Building is O(N · L²) time and memory; with clearing, the BFS reads each stored entry at most once, so it is O(N · L²) too — no factor 26 and no N² pairwise comparison.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why clearing matters:</strong> <span style="color:#f0e2c8;">Without it, a bucket of k words is rescanned by each of its k words, about k² reads; in my measurement on 2,095 words that was 36,670 reads instead of 8,369 for the same answer.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The JavaScript detail:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> rather than a plain object, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">|| []</code> because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> for a missing key, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code> into the existing array rather than copying it, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slice()</code> copies of the buckets if the dictionary is reused.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it true that sharing a pattern means one letter apart?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If two different words share the pattern with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*</code> at position <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>, they agree everywhere except <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>, and they are different, so they differ in exactly that letter. They cannot share two patterns, or they would agree everywhere and be the same word.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you still use the 26-letter method?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the alphabet is small and fixed, N is modest, and I do not want the extra memory for buckets; it needs only a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code>. For a large or unknown alphabet, or a dictionary queried many times, buckets win.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Map</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">{}</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both hash string keys, but an object inherits properties from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.prototype</code>, so a check like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if (obj[p])</code> could see an inherited key, and counting entries needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.keys</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> has no inherited keys, a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size</code>, and clear <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">has</code> semantics.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you combine buckets with bidirectional BFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. The buckets are just the neighbour function; bidirectional BFS only changes which frontier is expanded. Keep visited information per side, and only clear a bucket once neither side can need it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return all shortest chains with buckets?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Do not clear a bucket in the middle of a level, because another word of the same level may need the same neighbours as an extra parent. Process whole levels, record every parent, and clear or mark visited only after the level ends.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Wildcard pattern** | A word with one position replaced by \`*\`; a word of length L has L of them |
| **Bucket (inverted index)** | \`Map\` from pattern to the words that produce it |
| **Bipartite word–pattern graph** | Two node kinds, words and patterns; one word-to-word step is two hops |
| **Clearing a used bucket** | Empty a bucket after scanning it, since all its words are now visited |
| **Amortised bucket scanning** | With clearing, the whole BFS reads at most N · L bucket entries in total |

---
**Conclusion:** The wildcard graph turns "which words are one letter away?" into a lookup: bucket every word under its L patterns, and two words are neighbours exactly when they share a bucket. Building the buckets is O(N · L²), the BFS reads a word's L buckets for its neighbours, and clearing each bucket after use keeps the whole search at O(N · L²) — independent of the alphabet and far below the O(N² · L) of comparing every pair. In JavaScript, use a \`Map\` of arrays, \`get(p) || []\` for missing patterns, push into existing arrays rather than copying them, and clear a copy if the buckets are reused. For the basic BFS, the parent map and bidirectional search, see [How do you solve the word ladder problem?](/interview-question/how-do-you-solve-the-word-ladder-problem); the BFS-versus-DFS background is in [What is the difference between BFS and DFS?](/interview-question/what-is-the-difference-between-bfs-and-dfs)`,
        examples: [
          {
            label: "Building the wildcard buckets for the LeetCode list, then BFS through them",
            code: `// hot -> *ot, h*t, ho*  (one wildcard per position).
function patterns(word) {
  const out = [];
  for (let i = 0; i < word.length; i++) out.push(word.slice(0, i) + '*' + word.slice(i + 1));
  return out;
}

function buildBuckets(words) {
  const buckets = new Map();                     // pattern -> words that match it
  for (const w of words) {
    for (const p of patterns(w)) {
      if (!buckets.has(p)) buckets.set(p, []);
      buckets.get(p).push(w);
    }
  }
  return buckets;
}

function ladder(begin, end, wordList) {
  if (!wordList.includes(end)) return [0, []];   // one O(N) check up front is fine
  const buckets = buildBuckets([begin, ...wordList]);   // begin needs its patterns too
  const parent = new Map([[begin, null]]);       // also the visited set
  const queue = [begin];
  for (let head = 0; head < queue.length; head++) {
    let word = queue[head];
    if (word === end) {
      const chain = [];
      while (word !== null) { chain.push(word); word = parent.get(word); }
      return [chain.length, chain.reverse()];
    }
    for (const p of patterns(word)) {
      for (const next of buckets.get(p) || []) {
        if (!parent.has(next)) { parent.set(next, word); queue.push(next); }
      }
      buckets.set(p, []);                        // every word here is now visited: never rescan
    }
  }
  return [0, []];
}

const words = ['hot', 'dot', 'dog', 'lot', 'log', 'cog'];
const buckets = buildBuckets(['hit', ...words]);
console.log('patterns: ' + buckets.size);
for (const p of [...buckets.keys()].sort()) {   // string sort is right here: keys are strings
  if (buckets.get(p).length >= 2) console.log('  ' + p + ' -> ' + buckets.get(p).join(', '));
}

for (const [begin, end, wl] of [['hit', 'cog', words], ['hit', 'cog', words.slice(0, -1)], ['hot', 'dog', ['hot', 'dog']]]) {
  const [n, chain] = ladder(begin, end, wl);
  console.log(begin + ' -> ' + end + ': ' + n + (chain.length ? '  ' + chain.join(' -> ') : ''));
}`,
          },
          {
            label: "Pairwise comparison vs wildcard buckets, and BFS with vs without clearing buckets",
            code: `const LETTERS = 'abcdefgh';
let seed = 7;
function rand() {                              // Park-Miller generator: same words in every language
  seed = (seed * 48271) % 2147483647;
  return seed;
}

function patterns(word) {
  const out = [];
  for (let i = 0; i < word.length; i++) out.push(word.slice(0, i) + '*' + word.slice(i + 1));
  return out;
}

// Compare every pair letter by letter: O(N^2 * L).
function pairwiseEdges(words) {
  let pairs = 0, edges = 0;
  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j < words.length; j++) {
      pairs++;
      let diff = 0;
      for (let k = 0; k < words[i].length; k++) if (words[i][k] !== words[j][k]) diff++;
      if (diff === 1) edges++;
    }
  }
  return [pairs, edges];
}

// Group by wildcard pattern: O(N * L^2). A bucket of k words holds k*(k-1)/2 edges.
function bucketEdges(words) {
  const buckets = new Map();
  for (const w of words) {
    for (const p of patterns(w)) {
      if (!buckets.has(p)) buckets.set(p, []);
      buckets.get(p).push(w);
    }
  }
  let edges = 0;
  for (const b of buckets.values()) edges += (b.length * (b.length - 1)) / 2;
  return [buckets, words.length * words[0].length, edges];
}

function bfs(begin, end, original, clear) {
  const buckets = new Map();                   // private copy: we may clear it
  for (const [p, ws] of original) buckets.set(p, ws.slice());
  const dist = new Map([[begin, 1]]);
  const queue = [begin];
  let scanned = 0;
  for (let head = 0; head < queue.length; head++) {
    const word = queue[head];
    if (word === end) return [dist.get(word), scanned];
    for (const p of patterns(word)) {
      for (const next of buckets.get(p) || []) {
        scanned++;
        if (!dist.has(next)) { dist.set(next, dist.get(word) + 1); queue.push(next); }
      }
      if (clear) buckets.set(p, []);
    }
  }
  return [0, scanned];
}

for (const size of [500, 1500, 3000]) {
  const seen = new Set(), words = [];
  for (let t = 0; t < size; t++) {
    let w = '';
    for (let j = 0; j < 4; j++) w += LETTERS[rand() % LETTERS.length];
    if (!seen.has(w)) { seen.add(w); words.push(w); }   // keep the first copy, in order
  }
  for (const extra of ['aaaa', 'hhhh']) if (!seen.has(extra)) { seen.add(extra); words.push(extra); }
  const [pairs, e1] = pairwiseEdges(words);
  const [buckets, made, e2] = bucketEdges(words);
  const [a, s1] = bfs('aaaa', 'hhhh', buckets, false);
  const [b, s2] = bfs('aaaa', 'hhhh', buckets, true);
  console.log(words.length + ' distinct words, ' + buckets.size + ' buckets');
  console.log('  pairwise: ' + pairs + ' pairs compared, ' + e1 + ' edges');
  console.log('  buckets:  ' + made + ' patterns made, ' + e2 + ' edges');
  console.log('  BFS length ' + a + ' = ' + b + '; entries scanned ' + s1 +
    ' without clearing, ' + s2 + ' with clearing');
}`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"In Word Ladder you BFS from a begin word to an end word, changing one letter per step, using only dictionary words. Instead of trying all 26 letters at every position, build a wildcard graph: group the words by patterns like \`h*t\`, and use those groups to find neighbours. Show how you build it and how the BFS uses it, in Java."

**What a strong answer should cover:**
- The pattern idea: each word of length L yields L patterns (\`hot\` → \`*ot\`, \`h*t\`, \`ho*\`); two words are one letter apart **iff** they share a pattern.
- Building \`Map<String, List<String>>\` buckets in O(N · L²) time and memory, including \`beginWord\`.
- BFS that looks up a word's L buckets for neighbours, marks visited on enqueue, and **clears each bucket after scanning it** so the whole search reads at most N · L entries.
- Comparison with pairwise comparison (O(N² · L)) and with the 26-letter method (O(N · 26 · L²)), and the memory cost of the buckets.
- Java specifics: \`computeIfAbsent(p, k -> new ArrayList<>()).add(w)\` to build, \`getOrDefault(p, List.of())\` to read (and why you must never \`add\` to that immutable \`List.of()\`), \`substring\` to make patterns, and \`TreeMap\` when you want sorted keys.

**Clarifying questions expected:**
- Are all words the same length, and is the dictionary reused for many queries?

**Code / implementation expected:** Yes — a Java \`buildBuckets(List<String> words)\` using \`computeIfAbsent\`, and a BFS \`ladder(begin, end, wordList)\` that uses and clears the buckets.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know Java strings, \`List\` and \`Map\`, and ideally have read the basic Word Ladder BFS; everything else is explained from scratch.
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by actually compiling and running the code with \`javac\` and \`java\` (OpenJDK 21); nothing is typed in by hand.

## 1. Why This Even Matters — A Story First

Crossword solvers own a strange kind of dictionary: it is sorted by **pattern**. Stuck on "H _ T"? Look up \`h?t\` and the book lists HAT, HIT, HOT, HUT on one line. You do not compare HOT against all 100,000 words in the language to find its one-letter relatives — you look up the three lines \`?ot\`, \`h?t\` and \`ho?\`, and every word on those lines is exactly one letter away.

That is the **wildcard graph** for Word Ladder. The basic solution ([How do you solve the word ladder problem?](/interview-question/how-do-you-solve-the-word-ladder-problem)) runs a BFS over words where neighbours differ in one letter. The open question is how you *find* those neighbours. Comparing every pair of words is slow; trying all 26 letters at every position works but multiplies everything by 26. Grouping words into **buckets by wildcard pattern** — \`*ot\`, \`h*t\`, \`ho*\` — finds every neighbour of a word by reading L buckets, and it does not care how big the alphabet is.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are all words the same length L? | Patterns are built per position; words of other lengths never share a pattern, so they simply never connect. |
| What is the alphabet — lowercase \`a\`–\`z\` only? | The 26-letter approach depends on it; the wildcard approach does not. Pick a wildcard character that cannot appear in a word (\`*\`). |
| How many words, and how long? | Building buckets is O(N · L²) time and memory; pairwise comparison is O(N² · L). Large N with small L favours buckets strongly. |
| Is the dictionary reused for many queries? | Then build the buckets once and keep them; only the BFS runs per query (on a copy if you clear buckets). |
| Do I need the number of words, the chain, or all shortest chains? | The bucket graph is the same; only the BFS bookkeeping changes. |

## 3. The Core Idea: Words That Share a Pattern Are Neighbours

📌 **Interview term: Wildcard pattern** — a word with exactly one position replaced by a placeholder: \`hot\` → \`*ot\`, \`h*t\`, \`ho*\`. A word of length L has exactly L patterns.

📌 **Interview term: Bucket (inverted index)** — a hash map from each pattern to the list of words that produce it. "Inverted" because instead of word → patterns it stores pattern → words, which is the direction you need for lookups.

The key fact: **two different words of the same length differ in exactly one letter if and only if they share a pattern** — the pattern with the wildcard at the position where they differ. They cannot share two patterns (that would need them to agree everywhere except two different positions at once, which means they are equal). So every one-letter edge lives in exactly one bucket, and a bucket holding \`k\` words contributes \`k · (k - 1) / 2\` edges. Example 2 checks this: the edges counted by comparing every pair equal the sum over buckets — 747, 5,412 and 15,027 on three dictionaries.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 330" role="img" aria-label="Words on the left and patterns on the right. hit and hot connect to the pattern h star t. hot dot and lot connect to star o t. dot and dog connect to d o star. dog log and cog connect to star o g">
  <text class="d-text" x="120" y="26" text-anchor="middle">words</text>
  <text class="d-text d-accent" x="520" y="26" text-anchor="middle">buckets</text>
  <line class="d-edge" x1="160" y1="62" x2="470" y2="72"/>
  <line class="d-edge" x1="160" y1="102" x2="470" y2="78"/>
  <line class="d-edge" x1="160" y1="108" x2="470" y2="146"/>
  <line class="d-edge" x1="160" y1="142" x2="470" y2="152"/>
  <line class="d-edge" x1="160" y1="182" x2="470" y2="158"/>
  <line class="d-edge" x1="160" y1="148" x2="470" y2="222"/>
  <line class="d-edge" x1="160" y1="222" x2="470" y2="230"/>
  <line class="d-edge" x1="160" y1="228" x2="470" y2="296"/>
  <line class="d-edge" x1="160" y1="262" x2="470" y2="300"/>
  <line class="d-edge" x1="160" y1="302" x2="470" y2="306"/>
  <rect class="d-box-muted" x="80" y="44" width="80" height="34" rx="6"/>
  <text class="d-text" x="120" y="66" text-anchor="middle">hit</text>
  <rect class="d-box" x="80" y="88" width="80" height="34" rx="6"/>
  <text class="d-text" x="120" y="110" text-anchor="middle">hot</text>
  <rect class="d-box" x="80" y="128" width="80" height="34" rx="6"/>
  <text class="d-text" x="120" y="150" text-anchor="middle">dot</text>
  <rect class="d-box" x="80" y="168" width="80" height="34" rx="6"/>
  <text class="d-text" x="120" y="190" text-anchor="middle">lot</text>
  <rect class="d-box" x="80" y="208" width="80" height="34" rx="6"/>
  <text class="d-text" x="120" y="230" text-anchor="middle">dog</text>
  <rect class="d-box" x="80" y="248" width="80" height="34" rx="6"/>
  <text class="d-text" x="120" y="270" text-anchor="middle">log</text>
  <rect class="d-box-accent" x="80" y="288" width="80" height="34" rx="6"/>
  <text class="d-text d-accent" x="120" y="310" text-anchor="middle">cog</text>
  <rect class="d-box-accent" x="470" y="58" width="100" height="34" rx="6"/>
  <text class="d-text d-accent" x="520" y="80" text-anchor="middle">h*t</text>
  <rect class="d-box-accent" x="470" y="134" width="100" height="34" rx="6"/>
  <text class="d-text d-accent" x="520" y="156" text-anchor="middle">*ot</text>
  <rect class="d-box-accent" x="470" y="208" width="100" height="34" rx="6"/>
  <text class="d-text d-accent" x="520" y="230" text-anchor="middle">do*</text>
  <rect class="d-box-accent" x="470" y="284" width="100" height="34" rx="6"/>
  <text class="d-text d-accent" x="520" y="306" text-anchor="middle">*og</text>
</svg>

The four busiest buckets of the LeetCode example (\`lo*\` with lot and log is the fifth). Read it as a two-layer graph: from \`hot\` you step into the buckets \`h*t\` and \`*ot\`, and out of them to \`hit\`, \`dot\` and \`lot\` — exactly hot's one-letter neighbours. Buckets with a single word (like \`hi*\`, which only \`hit\` produces) connect nothing, and example 1 leaves them out of its listing.

📌 **Interview term: Bipartite word–pattern graph** — the picture above: two kinds of nodes, words and patterns, with edges only between the kinds. A word-to-word step is two hops (word → pattern → word). You can BFS this graph directly; the chain length in words is \`(hops / 2) + 1\`.

### Building it

For every word, for every position \`i\`, form the pattern (the word with position \`i\` replaced by \`*\`) and append the word to that pattern's bucket. N words × L patterns × O(L) to build and hash each pattern: **O(N · L²)** time, and the buckets hold N · L word entries: **O(N · L²)** memory counting the characters. Remember to put \`beginWord\` in too (it may not be in the list), or its patterns will have no entry.

### Searching it

Standard BFS from \`beginWord\`. When you pop a word, generate its L patterns; for each pattern, every word in the bucket that has not been visited is a neighbour — mark it and queue it. Then comes the trick that makes this fast:

📌 **Interview term: Clearing a used bucket** — after you scan a bucket, every word in it is visited (it was either visited before or you just visited it). Nothing in it can ever help again, so empty it. Each bucket is then scanned at most once in the whole search, so the BFS reads at most N · L entries in total.

Without clearing, a bucket of \`k\` words is scanned again by every one of its \`k\` words — about \`k²\` reads — and on dense dictionaries that brings the quadratic cost back. Example 2 measures it: on 2,095 words the BFS read 36,670 bucket entries without clearing and 8,369 with clearing, for the same answer.

### Which neighbour-finding method to use?

| Method | Build cost | Neighbours of one word | Best when |
| :--- | :--- | :--- | :--- |
| Compare every pair | O(N² · L) | precomputed list | N is small (a few hundred) |
| Try 26 letters per position | none | O(26 · L²) hash lookups | Alphabet is small and fixed; no extra memory wanted |
| Wildcard buckets | O(N · L²) | L bucket lookups + the bucket contents | Large N, any alphabet, dictionary reused across queries |

The numbers in example 2 make the first row concrete: 2,193,465 pair comparisons to find 15,027 edges, against 8,380 patterns built to find the same 15,027 edges.


## 4. The Code in Java

~~~java
import java.util.*;

public class Main {
    // hot -> *ot, h*t, ho*  (one wildcard per position).
    static List<String> patterns(String word) {
        List<String> out = new ArrayList<>();
        for (int i = 0; i < word.length(); i++) out.add(word.substring(0, i) + "*" + word.substring(i + 1));
        return out;
    }

    static Map<String, List<String>> buildBuckets(List<String> words) {
        Map<String, List<String>> buckets = new TreeMap<>();   // TreeMap: keys come out sorted
        for (String w : words)
            for (String p : patterns(w))
                buckets.computeIfAbsent(p, k -> new ArrayList<>()).add(w);
        return buckets;
    }

    static List<String> ladder(String begin, String end, List<String> wordList) {
        if (!wordList.contains(end)) return List.of();       // one O(N) check up front is fine
        List<String> all = new ArrayList<>(List.of(begin));  // begin needs its patterns too
        all.addAll(wordList);
        Map<String, List<String>> buckets = buildBuckets(all);
        Map<String, String> parent = new HashMap<>();        // also the visited set
        parent.put(begin, null);
        ArrayDeque<String> queue = new ArrayDeque<>(List.of(begin));
        while (!queue.isEmpty()) {
            String word = queue.poll();
            if (word.equals(end)) {
                LinkedList<String> chain = new LinkedList<>();
                for (String w = word; w != null; w = parent.get(w)) chain.addFirst(w);
                return chain;
            }
            for (String p : patterns(word)) {
                for (String next : buckets.getOrDefault(p, List.of())) {
                    if (!parent.containsKey(next)) { parent.put(next, word); queue.offer(next); }
                }
                buckets.put(p, List.of());       // every word here is now visited: never rescan
            }
        }
        return List.of();
    }

    public static void main(String[] args) {
        List<String> words = List.of("hot", "dot", "dog", "lot", "log", "cog");
        List<String> all = new ArrayList<>(List.of("hit"));
        all.addAll(words);
        Map<String, List<String>> buckets = buildBuckets(all);
        System.out.println("patterns: " + buckets.size());
        for (Map.Entry<String, List<String>> e : buckets.entrySet())
            if (e.getValue().size() >= 2) System.out.println("  " + e.getKey() + " -> " + String.join(", ", e.getValue()));

        String[][] be = {{"hit", "cog"}, {"hit", "cog"}, {"hot", "dog"}};
        List<List<String>> lists = List.of(words, words.subList(0, 5), List.of("hot", "dog"));
        for (int k = 0; k < be.length; k++) {
            List<String> chain = ladder(be[k][0], be[k][1], lists.get(k));
            System.out.println(be[k][0] + " -> " + be[k][1] + ": " + chain.size()
                    + (chain.isEmpty() ? "" : "  " + String.join(" -> ", chain)));
        }
    }
}
~~~

The Java parts that matter:

- **\`buckets.computeIfAbsent(p, k -> new ArrayList<>()).add(w)\`** — one line that creates the bucket the first time a pattern appears and returns the existing list afterwards. It replaces the \`get\` / null check / \`put\` dance.
- **\`TreeMap\` in \`buildBuckets\`** — a sorted map, used here only so the demo prints buckets in key order. Its operations are O(log n); for the real search a \`HashMap\` (O(1) average) is the usual choice, which is what example 2 uses.
- **\`buckets.getOrDefault(p, List.of())\`** while searching — returns an empty list for a pattern with no bucket, without inserting anything. \`List.of()\` is **immutable**: reading it is fine, but calling \`add\` on it throws, which is exactly the bug the snippet below shows.
- **\`word.substring(0, i) + "*" + word.substring(i + 1)\`** — strings are immutable, so each pattern is a new O(L) string; L patterns per word give the O(L²) per word in the build. A \`char[]\` with one slot set to \`'*'\` and \`new String(chars)\` costs the same.
- **\`parent.containsKey(next)\`** — \`parent\` doubles as the visited set; \`HashMap\` allows the \`null\` value we store for \`begin\`.
- **\`buckets.put(p, List.of())\`** after scanning — the clearing step; every word in that bucket is now visited, so it is replaced by an empty list. (\`list.clear()\` on the existing \`ArrayList\` would work too.)
- **\`wordList.contains(end)\`** — an O(N) scan, but it runs once before the search, which is fine.

📌 **Interview term: Amortised bucket scanning** — with clearing, the total number of bucket entries read across the whole BFS is at most the total number stored, N · L, no matter how the work is spread across individual polls. That is what makes the search O(N · L²) overall.

The immutable-default trap, checked by running it:

~~~java
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Map<String, List<String>> buckets = new HashMap<>();
        try {
            buckets.getOrDefault("h*t", List.of()).add("hot");   // List.of() is immutable
        } catch (UnsupportedOperationException e) {
            System.out.println("UnsupportedOperationException from List.of().add");
        }
        buckets.computeIfAbsent("h*t", k -> new ArrayList<>()).add("hot");   // creates a mutable list once
        buckets.computeIfAbsent("h*t", k -> new ArrayList<>()).add("hit");   // reuses it
        System.out.println("h*t -> " + buckets.get("h*t"));
    }
}
~~~

~~~text
UnsupportedOperationException from List.of().add
h*t -> [hot, hit]
~~~

\`getOrDefault\` is for **reading**; for building, \`computeIfAbsent\` gives you a real, mutable list that is stored in the map.

## 5. Verified: Running the Code

Both examples were saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21). Example 1 builds the buckets for \`hit\` plus the LeetCode 127 list, prints how many distinct patterns there are and every bucket that holds at least two words (the ones that create edges), then runs the bucket BFS on three queries:

~~~text
patterns: 14
  *og -> dog, log, cog
  *ot -> hot, dot, lot
  do* -> dot, dog
  h*t -> hit, hot
  lo* -> lot, log
hit -> cog: 5  hit -> hot -> dot -> dog -> cog
hit -> cog: 0
hot -> dog: 0
~~~

Seven words of length 3 produce 21 patterns, of which 14 are distinct. Only five buckets hold two or more words, and together they contain \`3 + 3 + 1 + 1 + 1 = 9\` edges — the whole graph of this example. The BFS finds the same 5-word chain as the 26-letter version.

Example 2 builds three random dictionaries of distinct 4-letter words over the letters \`a\`–\`h\` (fixed-seed generator with a \`long\` seed, so every language builds the same words) and measures both the build and the search. The BFS works on a copy of the buckets (\`new ArrayList<>(e.getValue())\` per bucket) because clearing destroys them; the pair and edge counters are \`long\`, since N² grows quickly:

~~~text
476 distinct words, 1296 buckets
  pairwise: 113050 pairs compared, 747 edges
  buckets:  1904 patterns made, 747 edges
  BFS length 8 = 8; entries scanned 606 without clearing, 387 with clearing
1264 distinct words, 1942 buckets
  pairwise: 798216 pairs compared, 5412 edges
  buckets:  5056 patterns made, 5412 edges
  BFS length 5 = 5; entries scanned 6647 without clearing, 3092 with clearing
2095 distinct words, 2044 buckets
  pairwise: 2193465 pairs compared, 15027 edges
  buckets:  8380 patterns made, 15027 edges
  BFS length 6 = 6; entries scanned 36670 without clearing, 8369 with clearing
~~~

Three things to read off it:

- **The edge counts match.** Comparing every pair and summing \`k · (k - 1) / 2\` over the buckets find exactly the same edges (747, 5,412, 15,027).
- **The build costs diverge.** Pairwise comparison grows with N²: 113,050 → 2,193,465 pairs as the dictionary grows about 4.4 times; pattern generation grows with N: 1,904 → 8,380.
- **Clearing matters.** The answer is identical, but the bucket entries read drop from 36,670 to 8,369 on the largest dictionary — and with clearing they can never exceed the 8,380 stored.

## 6. Complexity

| Step | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Build buckets (\`HashMap\`) | O(N · L²) | O(N · L²) | N · L patterns, each built and hashed in O(L); N · L stored entries |
| Build buckets (\`TreeMap\`) | O(N · L² · log N) | O(N · L²) | Each insert compares strings O(log n) times |
| BFS with clearing | O(N · L²) | O(N · L) for the queue and \`parent\` | L patterns per polled word; each bucket read at most once in total |
| BFS without clearing | up to O(Σ k² + N · L²) | same | A bucket of k words is scanned by each of its k words |
| Pairwise graph build (for comparison) | O(N² · L) | O(E) | Every pair compared letter by letter |

## Edge Cases

- **\`end\` not in the list** — return an empty chain before building anything.
- **\`begin\` not in the list** — it is added to the build list first.
- **No chain** — \`hot → dog\` with only \`["hot", "dog"]\` share no pattern; 0.
- **Words of different lengths** — never share a pattern, so they are unreachable from each other.
- **Duplicate words** — appear twice in a bucket; the visited check skips the second copy.
- **Reusing the buckets** — clear a copy, not the original (example 2 copies each list).

## Common Pitfalls

- **\`getOrDefault(p, List.of()).add(w)\` while building** — \`UnsupportedOperationException\`, and even with a mutable default the new list would never be stored in the map; use \`computeIfAbsent\`.
- **Not clearing used buckets** — correct but slower; 36,670 vs 8,369 reads in example 2.
- **Forgetting to add \`begin\`'s patterns** — the BFS cannot leave the start word.
- **\`int\` counters for N² work** — 2,193,465 fits in an \`int\`, but 100,000 words would give about 5 × 10⁹ pairs; use \`long\`.
- **A wildcard character that can appear in words** — unrelated words could collide.
- **Comparing words with \`==\`** — compare \`String\`s with \`equals\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">For every word I generate its L patterns, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*ot</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h*t</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ho*</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hot</code>, and add the word with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computeIfAbsent(p, k -&gt; new ArrayList&lt;&gt;()).add(w)</code>; two words are one letter apart exactly when they share a bucket.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How the BFS uses it:</strong> <span style="color:#f0e2c8;">When I poll a word, I read its L buckets with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getOrDefault(p, List.of())</code>, offer every unvisited word in them, and then <strong style="color:#ffca28;">clear</strong> each bucket, because everything in it is now visited.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">Building is O(N · L²) time and memory with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code>; with clearing, the BFS reads each stored entry at most once, so it is O(N · L²) too — no factor 26 and no N² pairwise comparison.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why clearing matters:</strong> <span style="color:#f0e2c8;">Without it, a bucket of k words is rescanned by each of its k words, about k² reads; in my measurement on 2,095 words that was 36,670 reads instead of 8,369 for the same answer.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The Java detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computeIfAbsent</code> to build, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getOrDefault</code> with an immutable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">List.of()</code> only to read — adding to it throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UnsupportedOperationException</code> — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">substring</code> for the patterns, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> counters if I measure N² work.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it true that sharing a pattern means one letter apart?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If two different words share the pattern with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*</code> at position <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>, they agree everywhere except <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>, and they are different, so they differ in exactly that letter. They cannot share two patterns, or they would agree everywhere and be the same word.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;"><code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">HashMap</code> or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">TreeMap</code> for the buckets?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code> for the algorithm: O(1) average per operation. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TreeMap</code> costs O(log n) string comparisons per operation and is only worth it if you need the patterns in sorted order, as the demo printout does.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you still use the 26-letter method?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the alphabet is small and fixed, N is modest, and I do not want the O(N · L²) memory for buckets; it needs only a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashSet</code>. For a large or unknown alphabet, or a dictionary queried many times, buckets win.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you combine buckets with bidirectional BFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. The buckets are just the neighbour function; bidirectional BFS only changes which frontier is expanded. Keep visited information per side, and only clear a bucket once neither side can need it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return all shortest chains with buckets?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Do not clear a bucket in the middle of a level, because another word of the same level may need the same neighbours as an extra parent. Process whole levels, record every parent in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map&lt;String, List&lt;String&gt;&gt;</code>, and clear or mark visited only after the level ends.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Wildcard pattern** | A word with one position replaced by \`*\`; a word of length L has L of them |
| **Bucket (inverted index)** | \`Map<String, List<String>>\` from pattern to the words that produce it |
| **Bipartite word–pattern graph** | Two node kinds, words and patterns; one word-to-word step is two hops |
| **Clearing a used bucket** | Empty a bucket after scanning it, since all its words are now visited |
| **Amortised bucket scanning** | With clearing, the whole BFS reads at most N · L bucket entries in total |

---
**Conclusion:** The wildcard graph turns "which words are one letter away?" into a lookup: bucket every word under its L patterns, and two words are neighbours exactly when they share a bucket. Building the buckets is O(N · L²), the BFS reads a word's L buckets for its neighbours, and clearing each bucket after use keeps the whole search at O(N · L²) — independent of the alphabet and far below the O(N² · L) of comparing every pair. In Java, build with \`computeIfAbsent\`, read with \`getOrDefault\` and an immutable empty list (never add to it), prefer \`HashMap\` unless you need sorted output, and clear a copy if the buckets are reused. For the basic BFS, the parent map and bidirectional search, see [How do you solve the word ladder problem?](/interview-question/how-do-you-solve-the-word-ladder-problem); the BFS-versus-DFS background is in [What is the difference between BFS and DFS?](/interview-question/what-is-the-difference-between-bfs-and-dfs)`,
        examples: [
          {
            label: "Building the wildcard buckets for the LeetCode list, then BFS through them",
            code: `import java.util.*;

public class Main {
    // hot -> *ot, h*t, ho*  (one wildcard per position).
    static List<String> patterns(String word) {
        List<String> out = new ArrayList<>();
        for (int i = 0; i < word.length(); i++) out.add(word.substring(0, i) + "*" + word.substring(i + 1));
        return out;
    }

    static Map<String, List<String>> buildBuckets(List<String> words) {
        Map<String, List<String>> buckets = new TreeMap<>();   // TreeMap: keys come out sorted
        for (String w : words)
            for (String p : patterns(w))
                buckets.computeIfAbsent(p, k -> new ArrayList<>()).add(w);
        return buckets;
    }

    static List<String> ladder(String begin, String end, List<String> wordList) {
        if (!wordList.contains(end)) return List.of();       // one O(N) check up front is fine
        List<String> all = new ArrayList<>(List.of(begin));  // begin needs its patterns too
        all.addAll(wordList);
        Map<String, List<String>> buckets = buildBuckets(all);
        Map<String, String> parent = new HashMap<>();        // also the visited set
        parent.put(begin, null);
        ArrayDeque<String> queue = new ArrayDeque<>(List.of(begin));
        while (!queue.isEmpty()) {
            String word = queue.poll();
            if (word.equals(end)) {
                LinkedList<String> chain = new LinkedList<>();
                for (String w = word; w != null; w = parent.get(w)) chain.addFirst(w);
                return chain;
            }
            for (String p : patterns(word)) {
                for (String next : buckets.getOrDefault(p, List.of())) {
                    if (!parent.containsKey(next)) { parent.put(next, word); queue.offer(next); }
                }
                buckets.put(p, List.of());       // every word here is now visited: never rescan
            }
        }
        return List.of();
    }

    public static void main(String[] args) {
        List<String> words = List.of("hot", "dot", "dog", "lot", "log", "cog");
        List<String> all = new ArrayList<>(List.of("hit"));
        all.addAll(words);
        Map<String, List<String>> buckets = buildBuckets(all);
        System.out.println("patterns: " + buckets.size());
        for (Map.Entry<String, List<String>> e : buckets.entrySet())
            if (e.getValue().size() >= 2) System.out.println("  " + e.getKey() + " -> " + String.join(", ", e.getValue()));

        String[][] be = {{"hit", "cog"}, {"hit", "cog"}, {"hot", "dog"}};
        List<List<String>> lists = List.of(words, words.subList(0, 5), List.of("hot", "dog"));
        for (int k = 0; k < be.length; k++) {
            List<String> chain = ladder(be[k][0], be[k][1], lists.get(k));
            System.out.println(be[k][0] + " -> " + be[k][1] + ": " + chain.size()
                    + (chain.isEmpty() ? "" : "  " + String.join(" -> ", chain)));
        }
    }
}`,
          },
          {
            label: "Pairwise comparison vs wildcard buckets, and BFS with vs without clearing buckets",
            code: `import java.util.*;

public class Main {
    static final String LETTERS = "abcdefgh";
    static long seed = 7;

    static int rand() {                          // Park-Miller generator; long avoids overflow
        seed = seed * 48271 % 2147483647L;
        return (int) seed;
    }

    static List<String> patterns(String word) {
        List<String> out = new ArrayList<>();
        for (int i = 0; i < word.length(); i++) out.add(word.substring(0, i) + "*" + word.substring(i + 1));
        return out;
    }

    // Compare every pair letter by letter: O(N^2 * L). Returns {pairs, edges}.
    static long[] pairwiseEdges(List<String> words) {
        long pairs = 0, edges = 0;
        for (int i = 0; i < words.size(); i++)
            for (int j = i + 1; j < words.size(); j++) {
                pairs++;
                String a = words.get(i), b = words.get(j);
                int diff = 0;
                for (int k = 0; k < a.length(); k++) if (a.charAt(k) != b.charAt(k)) diff++;
                if (diff == 1) edges++;
            }
        return new long[]{pairs, edges};
    }

    // Group by wildcard pattern: O(N * L^2).
    static Map<String, List<String>> buckets(List<String> words) {
        Map<String, List<String>> buckets = new HashMap<>();
        for (String w : words)
            for (String p : patterns(w)) buckets.computeIfAbsent(p, k -> new ArrayList<>()).add(w);
        return buckets;
    }

    static int scanned;

    static int bfs(String begin, String end, Map<String, List<String>> original, boolean clear) {
        Map<String, List<String>> buckets = new HashMap<>();          // private copy: we may clear it
        for (Map.Entry<String, List<String>> e : original.entrySet()) buckets.put(e.getKey(), new ArrayList<>(e.getValue()));
        Map<String, Integer> dist = new HashMap<>(Map.of(begin, 1));
        ArrayDeque<String> queue = new ArrayDeque<>(List.of(begin));
        scanned = 0;
        while (!queue.isEmpty()) {
            String word = queue.poll();
            if (word.equals(end)) return dist.get(word);
            for (String p : patterns(word)) {
                for (String next : buckets.getOrDefault(p, List.of())) {
                    scanned++;
                    if (!dist.containsKey(next)) { dist.put(next, dist.get(word) + 1); queue.offer(next); }
                }
                if (clear) buckets.put(p, new ArrayList<>());
            }
        }
        return 0;
    }

    public static void main(String[] args) {
        for (int size : new int[]{500, 1500, 3000}) {
            Set<String> seen = new HashSet<>();
            List<String> words = new ArrayList<>();
            for (int t = 0; t < size; t++) {
                StringBuilder sb = new StringBuilder();
                for (int j = 0; j < 4; j++) sb.append(LETTERS.charAt(rand() % LETTERS.length()));
                if (seen.add(sb.toString())) words.add(sb.toString());   // keep the first copy, in order
            }
            for (String extra : new String[]{"aaaa", "hhhh"}) if (seen.add(extra)) words.add(extra);
            long[] pw = pairwiseEdges(words);
            Map<String, List<String>> b = buckets(words);
            long edges = 0;
            for (List<String> ws : b.values()) edges += (long) ws.size() * (ws.size() - 1) / 2;
            int a1 = bfs("aaaa", "hhhh", b, false);
            int s1 = scanned;
            int a2 = bfs("aaaa", "hhhh", b, true);
            System.out.println(words.size() + " distinct words, " + b.size() + " buckets");
            System.out.println("  pairwise: " + pw[0] + " pairs compared, " + pw[1] + " edges");
            System.out.println("  buckets:  " + words.size() * 4 + " patterns made, " + edges + " edges");
            System.out.println("  BFS length " + a1 + " = " + a2 + "; entries scanned " + s1
                    + " without clearing, " + scanned + " with clearing");
        }
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"In Word Ladder you BFS from a begin word to an end word, changing one letter per step, using only dictionary words. Instead of trying all 26 letters at every position, build a wildcard graph: group the words by patterns like \`h*t\`, and use those groups to find neighbours. Show how you build it and how the BFS uses it, in C++."

**What a strong answer should cover:**
- The pattern idea: each word of length L yields L patterns (\`hot\` → \`*ot\`, \`h*t\`, \`ho*\`); two words are one letter apart **iff** they share a pattern.
- Building \`unordered_map<string, vector<string>>\` buckets in O(N · L²) time and memory, including \`beginWord\`.
- BFS that looks up a word's L buckets for neighbours, marks visited on enqueue, and **clears each bucket after scanning it** so the whole search reads at most N · L entries.
- Comparison with pairwise comparison (O(N² · L)) and with the 26-letter method (O(N · 26 · L²)), and the memory cost of the buckets.
- C++ specifics: \`buckets[p].push_back(w)\` is right for building because \`operator[]\` creates the bucket, but during the search use \`find\` so lookups do not insert; \`vector::clear()\` to empty a bucket; copy the word into a pattern with one \`p[i] = '*'\`; \`std::map\` when you want sorted keys.

**Clarifying questions expected:**
- Are all words the same length, and is the dictionary reused for many queries?

**Code / implementation expected:** Yes — a C++17 \`buildBuckets(const vector<string>&)\` and a BFS \`ladder(begin, end, wordList)\` that uses \`find\` and clears the buckets.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know basic C++ (\`string\`, \`vector\`, \`unordered_map\`), and ideally have read the basic Word Ladder BFS; everything else is explained from scratch.
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by actually compiling and running the code with \`g++ -std=c++17\` (GCC 13); nothing is typed in by hand.

## 1. Why This Even Matters — A Story First

Crossword solvers own a strange kind of dictionary: it is sorted by **pattern**. Stuck on "H _ T"? Look up \`h?t\` and the book lists HAT, HIT, HOT, HUT on one line. You do not compare HOT against all 100,000 words in the language to find its one-letter relatives — you look up the three lines \`?ot\`, \`h?t\` and \`ho?\`, and every word on those lines is exactly one letter away.

That is the **wildcard graph** for Word Ladder. The basic solution ([How do you solve the word ladder problem?](/interview-question/how-do-you-solve-the-word-ladder-problem)) runs a BFS over words where neighbours differ in one letter. The open question is how you *find* those neighbours. Comparing every pair of words is slow; trying all 26 letters at every position works but multiplies everything by 26. Grouping words into **buckets by wildcard pattern** — \`*ot\`, \`h*t\`, \`ho*\` — finds every neighbour of a word by reading L buckets, and it does not care how big the alphabet is.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are all words the same length L? | Patterns are built per position; words of other lengths never share a pattern, so they simply never connect. |
| What is the alphabet — lowercase \`a\`–\`z\` only? | The 26-letter approach depends on it; the wildcard approach does not. Pick a wildcard character that cannot appear in a word (\`*\`). |
| How many words, and how long? | Building buckets is O(N · L²) time and memory; pairwise comparison is O(N² · L). Large N with small L favours buckets strongly. |
| Is the dictionary reused for many queries? | Then build the buckets once and keep them; only the BFS runs per query (on a copy if you clear buckets). |
| Do I need the number of words, the chain, or all shortest chains? | The bucket graph is the same; only the BFS bookkeeping changes. |

## 3. The Core Idea: Words That Share a Pattern Are Neighbours

📌 **Interview term: Wildcard pattern** — a word with exactly one position replaced by a placeholder: \`hot\` → \`*ot\`, \`h*t\`, \`ho*\`. A word of length L has exactly L patterns.

📌 **Interview term: Bucket (inverted index)** — a hash map from each pattern to the list of words that produce it. "Inverted" because instead of word → patterns it stores pattern → words, which is the direction you need for lookups.

The key fact: **two different words of the same length differ in exactly one letter if and only if they share a pattern** — the pattern with the wildcard at the position where they differ. They cannot share two patterns (that would need them to agree everywhere except two different positions at once, which means they are equal). So every one-letter edge lives in exactly one bucket, and a bucket holding \`k\` words contributes \`k · (k - 1) / 2\` edges. Example 2 checks this: the edges counted by comparing every pair equal the sum over buckets — 747, 5,412 and 15,027 on three dictionaries.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 330" role="img" aria-label="Words on the left and patterns on the right. hit and hot connect to the pattern h star t. hot dot and lot connect to star o t. dot and dog connect to d o star. dog log and cog connect to star o g">
  <text class="d-text" x="120" y="26" text-anchor="middle">words</text>
  <text class="d-text d-accent" x="520" y="26" text-anchor="middle">buckets</text>
  <line class="d-edge" x1="160" y1="62" x2="470" y2="72"/>
  <line class="d-edge" x1="160" y1="102" x2="470" y2="78"/>
  <line class="d-edge" x1="160" y1="108" x2="470" y2="146"/>
  <line class="d-edge" x1="160" y1="142" x2="470" y2="152"/>
  <line class="d-edge" x1="160" y1="182" x2="470" y2="158"/>
  <line class="d-edge" x1="160" y1="148" x2="470" y2="222"/>
  <line class="d-edge" x1="160" y1="222" x2="470" y2="230"/>
  <line class="d-edge" x1="160" y1="228" x2="470" y2="296"/>
  <line class="d-edge" x1="160" y1="262" x2="470" y2="300"/>
  <line class="d-edge" x1="160" y1="302" x2="470" y2="306"/>
  <rect class="d-box-muted" x="80" y="44" width="80" height="34" rx="6"/>
  <text class="d-text" x="120" y="66" text-anchor="middle">hit</text>
  <rect class="d-box" x="80" y="88" width="80" height="34" rx="6"/>
  <text class="d-text" x="120" y="110" text-anchor="middle">hot</text>
  <rect class="d-box" x="80" y="128" width="80" height="34" rx="6"/>
  <text class="d-text" x="120" y="150" text-anchor="middle">dot</text>
  <rect class="d-box" x="80" y="168" width="80" height="34" rx="6"/>
  <text class="d-text" x="120" y="190" text-anchor="middle">lot</text>
  <rect class="d-box" x="80" y="208" width="80" height="34" rx="6"/>
  <text class="d-text" x="120" y="230" text-anchor="middle">dog</text>
  <rect class="d-box" x="80" y="248" width="80" height="34" rx="6"/>
  <text class="d-text" x="120" y="270" text-anchor="middle">log</text>
  <rect class="d-box-accent" x="80" y="288" width="80" height="34" rx="6"/>
  <text class="d-text d-accent" x="120" y="310" text-anchor="middle">cog</text>
  <rect class="d-box-accent" x="470" y="58" width="100" height="34" rx="6"/>
  <text class="d-text d-accent" x="520" y="80" text-anchor="middle">h*t</text>
  <rect class="d-box-accent" x="470" y="134" width="100" height="34" rx="6"/>
  <text class="d-text d-accent" x="520" y="156" text-anchor="middle">*ot</text>
  <rect class="d-box-accent" x="470" y="208" width="100" height="34" rx="6"/>
  <text class="d-text d-accent" x="520" y="230" text-anchor="middle">do*</text>
  <rect class="d-box-accent" x="470" y="284" width="100" height="34" rx="6"/>
  <text class="d-text d-accent" x="520" y="306" text-anchor="middle">*og</text>
</svg>

The four busiest buckets of the LeetCode example (\`lo*\` with lot and log is the fifth). Read it as a two-layer graph: from \`hot\` you step into the buckets \`h*t\` and \`*ot\`, and out of them to \`hit\`, \`dot\` and \`lot\` — exactly hot's one-letter neighbours. Buckets with a single word (like \`hi*\`, which only \`hit\` produces) connect nothing, and example 1 leaves them out of its listing.

📌 **Interview term: Bipartite word–pattern graph** — the picture above: two kinds of nodes, words and patterns, with edges only between the kinds. A word-to-word step is two hops (word → pattern → word). You can BFS this graph directly; the chain length in words is \`(hops / 2) + 1\`.

### Building it

For every word, for every position \`i\`, form the pattern (the word with position \`i\` replaced by \`*\`) and append the word to that pattern's bucket. N words × L patterns × O(L) to build and hash each pattern: **O(N · L²)** time, and the buckets hold N · L word entries: **O(N · L²)** memory counting the characters. Remember to put \`beginWord\` in too (it may not be in the list), or its patterns will have no entry.

### Searching it

Standard BFS from \`beginWord\`. When you pop a word, generate its L patterns; for each pattern, every word in the bucket that has not been visited is a neighbour — mark it and queue it. Then comes the trick that makes this fast:

📌 **Interview term: Clearing a used bucket** — after you scan a bucket, every word in it is visited (it was either visited before or you just visited it). Nothing in it can ever help again, so empty it. Each bucket is then scanned at most once in the whole search, so the BFS reads at most N · L entries in total.

Without clearing, a bucket of \`k\` words is scanned again by every one of its \`k\` words — about \`k²\` reads — and on dense dictionaries that brings the quadratic cost back. Example 2 measures it: on 2,095 words the BFS read 36,670 bucket entries without clearing and 8,369 with clearing, for the same answer.

### Which neighbour-finding method to use?

| Method | Build cost | Neighbours of one word | Best when |
| :--- | :--- | :--- | :--- |
| Compare every pair | O(N² · L) | precomputed list | N is small (a few hundred) |
| Try 26 letters per position | none | O(26 · L²) hash lookups | Alphabet is small and fixed; no extra memory wanted |
| Wildcard buckets | O(N · L²) | L bucket lookups + the bucket contents | Large N, any alphabet, dictionary reused across queries |

The numbers in example 2 make the first row concrete: 2,193,465 pair comparisons to find 15,027 edges, against 8,380 patterns built to find the same 15,027 edges.


## 4. The Code in C++

~~~cpp
#include <algorithm>
#include <iostream>
#include <map>
#include <queue>
#include <string>
#include <unordered_map>
#include <vector>
using namespace std;

// hot -> *ot, h*t, ho*  (one wildcard per position).
vector<string> patterns(const string& word) {
    vector<string> out;
    for (size_t i = 0; i < word.size(); i++) {
        string p = word;
        p[i] = '*';
        out.push_back(p);
    }
    return out;
}

using Buckets = map<string, vector<string>>;      // std::map: keys come out sorted

Buckets buildBuckets(const vector<string>& words) {
    Buckets buckets;
    for (const string& w : words)
        for (const string& p : patterns(w)) buckets[p].push_back(w);   // [] creates the bucket
    return buckets;
}

vector<string> ladder(const string& begin, const string& end, const vector<string>& wordList) {
    if (find(wordList.begin(), wordList.end(), end) == wordList.end()) return {};  // one O(N) check
    vector<string> all{begin};                    // begin needs its patterns too
    all.insert(all.end(), wordList.begin(), wordList.end());
    Buckets buckets = buildBuckets(all);
    unordered_map<string, string> parent{{begin, ""}};   // also the visited set
    queue<string> q;
    q.push(begin);
    while (!q.empty()) {
        string word = q.front(); q.pop();
        if (word == end) {
            vector<string> chain{word};
            while (chain.back() != begin) chain.push_back(parent.at(chain.back()));
            reverse(chain.begin(), chain.end());
            return chain;
        }
        for (const string& p : patterns(word)) {
            auto it = buckets.find(p);            // find: do not create empty buckets
            if (it == buckets.end()) continue;
            for (const string& next : it->second)
                if (!parent.count(next)) { parent[next] = word; q.push(next); }
            it->second.clear();                   // every word here is now visited: never rescan
        }
    }
    return {};
}

int main() {
    vector<string> words = {"hot", "dot", "dog", "lot", "log", "cog"};
    vector<string> all{"hit"};
    all.insert(all.end(), words.begin(), words.end());
    Buckets buckets = buildBuckets(all);
    cout << "patterns: " << buckets.size() << "\\n";
    for (auto& [p, ws] : buckets) {
        if (ws.size() < 2) continue;
        cout << "  " << p << " -> ";
        for (size_t i = 0; i < ws.size(); i++) cout << (i ? ", " : "") << ws[i];
        cout << "\\n";
    }
    vector<string> noCog(words.begin(), words.end() - 1);
    vector<pair<pair<string, string>, vector<string>>> cases = {
        {{"hit", "cog"}, words}, {{"hit", "cog"}, noCog}, {{"hot", "dog"}, {"hot", "dog"}}};
    for (auto& [be, wl] : cases) {
        vector<string> chain = ladder(be.first, be.second, wl);
        cout << be.first << " -> " << be.second << ": " << chain.size();
        for (size_t i = 0; i < chain.size(); i++) cout << (i ? " -> " : "  ") << chain[i];
        cout << "\\n";
    }
}
~~~

The C++ parts that matter:

- **\`string p = word; p[i] = '*';\`** — \`std::string\` is mutable, so a pattern is one O(L) copy plus a single character write. L patterns per word give the O(L²) per word in the build.
- **\`buckets[p].push_back(w)\` while building** — \`operator[]\` default-constructs an empty \`vector\` the first time a pattern appears and returns a reference to the stored one afterwards. That is exactly what you want here.
- **\`buckets.find(p)\` while searching** — \`operator[]\` would also *insert* an empty bucket for every pattern you merely look at. \`find\` returns \`end()\` for a missing key and never inserts. The snippet below shows the size difference.
- **\`it->second.clear()\`** — the clearing step. \`clear()\` empties the vector (its capacity may stay allocated, which is harmless); every word that was in it is already visited.
- **\`std::map\` in example 1** — a sorted map (a balanced tree, O(log n) per operation) used only so the demo prints buckets in key order; \`'*'\` (code 42) sorts before the letters. Example 2 uses \`unordered_map\`, the usual choice for the algorithm.
- **\`parent.at(chain.back())\`** in the rebuild — \`at\` throws \`std::out_of_range\` on a missing key instead of silently inserting, a good habit when you are walking a map you believe is complete.
- **\`find(wordList.begin(), wordList.end(), end)\`** — an O(N) scan, but it runs once before the search, which is fine.

📌 **Interview term: Amortised bucket scanning** — with clearing, the total number of bucket entries read across the whole BFS is at most the total number stored, N · L, no matter how the work is spread across individual pops. That is what makes the search O(N · L²) overall.

The \`operator[]\` trap, checked by running it:

~~~cpp
#include <iostream>
#include <string>
#include <unordered_map>
#include <vector>
using namespace std;

int main() {
    unordered_map<string, vector<string>> buckets;
    buckets["h*t"].push_back("hot");             // [] creates the bucket: what we want here
    cout << "after building: " << buckets.size() << " bucket\\n";
    auto it = buckets.find("z*z");               // find never inserts
    cout << "find z*z found it? " << boolalpha << (it != buckets.end()) << ", size " << buckets.size() << "\\n";
    size_t n = buckets["z*z"].size();            // [] on a missing key INSERTS an empty vector
    cout << "buckets[z*z].size() = " << n << ", size now " << buckets.size() << "\\n";
}
~~~

~~~text
after building: 1 bucket
find z*z found it? false, size 1
buckets[z*z].size() = 0, size now 2
~~~

Reading \`buckets["z*z"]\` created a bucket. In a BFS that probes L patterns per word, that fills the map with empty vectors — and if you were iterating the map at the time, inserting could rehash it and invalidate your iterators.

## 5. Verified: Running the Code

Both examples were saved as \`main.cpp\` and run with \`g++ -std=c++17 -O2 main.cpp -o main && ./main\` (GCC 13), and once more under \`-fsanitize=address,undefined\`, which reported nothing. Example 1 builds the buckets for \`hit\` plus the LeetCode 127 list, prints how many distinct patterns there are and every bucket that holds at least two words (the ones that create edges), then runs the bucket BFS on three queries:

~~~text
patterns: 14
  *og -> dog, log, cog
  *ot -> hot, dot, lot
  do* -> dot, dog
  h*t -> hit, hot
  lo* -> lot, log
hit -> cog: 5  hit -> hot -> dot -> dog -> cog
hit -> cog: 0
hot -> dog: 0
~~~

Seven words of length 3 produce 21 patterns, of which 14 are distinct. Only five buckets hold two or more words, and together they contain \`3 + 3 + 1 + 1 + 1 = 9\` edges — the whole graph of this example. The BFS finds the same 5-word chain as the 26-letter version.

Example 2 builds three random dictionaries of distinct 4-letter words over the letters \`a\`–\`h\` (fixed-seed generator with a \`long long\` seed, so every language builds the same words) and measures both the build and the search. Each BFS runs on \`Buckets b = buckets;\`, a full copy, because clearing destroys the buckets; the pair and edge counters are \`long long\`:

~~~text
476 distinct words, 1296 buckets
  pairwise: 113050 pairs compared, 747 edges
  buckets:  1904 patterns made, 747 edges
  BFS length 8 = 8; entries scanned 606 without clearing, 387 with clearing
1264 distinct words, 1942 buckets
  pairwise: 798216 pairs compared, 5412 edges
  buckets:  5056 patterns made, 5412 edges
  BFS length 5 = 5; entries scanned 6647 without clearing, 3092 with clearing
2095 distinct words, 2044 buckets
  pairwise: 2193465 pairs compared, 15027 edges
  buckets:  8380 patterns made, 15027 edges
  BFS length 6 = 6; entries scanned 36670 without clearing, 8369 with clearing
~~~

Three things to read off it:

- **The edge counts match.** Comparing every pair and summing \`k · (k - 1) / 2\` over the buckets find exactly the same edges (747, 5,412, 15,027).
- **The build costs diverge.** Pairwise comparison grows with N²: 113,050 → 2,193,465 pairs as the dictionary grows about 4.4 times; pattern generation grows with N: 1,904 → 8,380.
- **Clearing matters.** The answer is identical, but the bucket entries read drop from 36,670 to 8,369 on the largest dictionary — and with clearing they can never exceed the 8,380 stored.

## 6. Complexity

| Step | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Build buckets (\`unordered_map\`) | O(N · L²) | O(N · L²) | N · L patterns, each built and hashed in O(L); N · L stored strings |
| Build buckets (\`std::map\`) | O(N · L² · log N) | O(N · L²) | Each insert compares strings O(log n) times |
| BFS with clearing | O(N · L²) | O(N · L) for the queue and \`parent\` | L patterns per popped word; each bucket read at most once in total |
| BFS without clearing | up to O(Σ k² + N · L²) | same | A bucket of k words is scanned by each of its k words |
| Pairwise graph build (for comparison) | O(N² · L) | O(E) | Every pair compared letter by letter |

Each bucket here stores **copies** of the words (\`vector<string>\`), so the N · L entries are N · L strings of length L. Storing word **indices** (\`vector<int>\`) instead cuts the bucket memory to N · L integers plus the keys.

## Edge Cases

- **\`end\` not in the list** — return an empty chain before building anything.
- **\`begin\` not in the list** — it is put first in the build list.
- **No chain** — \`hot → dog\` with only \`{"hot", "dog"}\` share no pattern; 0.
- **Words of different lengths** — never share a pattern, so they are unreachable from each other.
- **Duplicate words** — appear twice in a bucket; the visited check skips the second copy.
- **Reusing the buckets** — clear a copy, not the original (example 2 copies the whole map).

## Common Pitfalls

- **\`buckets[p]\` during the search** — inserts empty buckets for every probed pattern; use \`find\`.
- **Not clearing used buckets** — correct but slower; 36,670 vs 8,369 reads in example 2.
- **Forgetting to add \`begin\`'s patterns** — the BFS cannot leave the start word.
- **\`int\` counters for N² work** — overflow is undefined behaviour; use \`long long\` once N passes about 65,000.
- **Holding a reference into a bucket while inserting into the map** — a rehash can move buckets; finish reading before inserting.
- **A wildcard character that can appear in words** — unrelated words could collide.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">For every word I generate its L patterns, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*ot</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h*t</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ho*</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hot</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push_back</code> the word into an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map&lt;string, vector&lt;string&gt;&gt;</code> bucket per pattern; two words are one letter apart exactly when they share a bucket.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How the BFS uses it:</strong> <span style="color:#f0e2c8;">When I pop a word, I <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code> each of its L buckets, push every unvisited word in them, and then <strong style="color:#ffca28;">clear</strong> the bucket, because everything in it is now visited.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">Building is O(N · L²) time and memory; with clearing, the BFS reads each stored entry at most once, so it is O(N · L²) too — no factor 26 and no N² pairwise comparison.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why clearing matters:</strong> <span style="color:#f0e2c8;">Without it, a bucket of k words is rescanned by each of its k words, about k² reads; in my measurement on 2,095 words that was 36,670 reads instead of 8,369 for the same answer.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The C++ detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator[]</code> to build because it creates the bucket, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code> to search because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator[]</code> would insert empty buckets, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector::clear()</code> to empty a used bucket, and indices instead of string copies if memory is tight.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it true that sharing a pattern means one letter apart?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If two different words share the pattern with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*</code> at position <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>, they agree everywhere except <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>, and they are different, so they differ in exactly that letter. They cannot share two patterns, or they would agree everywhere and be the same word.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;"><code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unordered_map</code> or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::map</code> for the buckets?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map</code> for the algorithm: O(1) average per operation. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::map</code> is a balanced tree with O(log n) string comparisons per operation; I would only use it to print patterns in sorted order, as example 1 does.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you cut the memory?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store word indices in the buckets (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;int&gt;</code>) instead of string copies, and track visited and parents in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;int&gt;</code> arrays indexed by word id. The keys still cost N · L strings, but the bucket contents drop to plain integers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you combine buckets with bidirectional BFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. The buckets are just the neighbour function; bidirectional BFS only changes which frontier is expanded. Keep visited information per side, and only clear a bucket once neither side can need it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return all shortest chains with buckets?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Do not clear a bucket in the middle of a level, because another word of the same level may need the same neighbours as an extra parent. Process whole levels, record every parent, and clear or mark visited only after the level ends.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Wildcard pattern** | A word with one position replaced by \`*\`; a word of length L has L of them |
| **Bucket (inverted index)** | \`unordered_map<string, vector<string>>\` from pattern to the words that produce it |
| **Bipartite word–pattern graph** | Two node kinds, words and patterns; one word-to-word step is two hops |
| **Clearing a used bucket** | Empty a bucket after scanning it, since all its words are now visited |
| **Amortised bucket scanning** | With clearing, the whole BFS reads at most N · L bucket entries in total |

---
**Conclusion:** The wildcard graph turns "which words are one letter away?" into a lookup: bucket every word under its L patterns, and two words are neighbours exactly when they share a bucket. Building the buckets is O(N · L²), the BFS reads a word's L buckets for its neighbours, and clearing each bucket after use keeps the whole search at O(N · L²) — independent of the alphabet and far below the O(N² · L) of comparing every pair. In C++, build with \`buckets[p].push_back(w)\`, search with \`find\` so nothing is inserted, empty used buckets with \`clear()\`, prefer \`unordered_map\` unless you need sorted output, and consider storing indices instead of string copies. For the basic BFS, the parent map and bidirectional search, see [How do you solve the word ladder problem?](/interview-question/how-do-you-solve-the-word-ladder-problem); the BFS-versus-DFS background is in [What is the difference between BFS and DFS?](/interview-question/what-is-the-difference-between-bfs-and-dfs)`,
        examples: [
          {
            label: "Building the wildcard buckets for the LeetCode list, then BFS through them",
            code: `#include <algorithm>
#include <iostream>
#include <map>
#include <queue>
#include <string>
#include <unordered_map>
#include <vector>
using namespace std;

// hot -> *ot, h*t, ho*  (one wildcard per position).
vector<string> patterns(const string& word) {
    vector<string> out;
    for (size_t i = 0; i < word.size(); i++) {
        string p = word;
        p[i] = '*';
        out.push_back(p);
    }
    return out;
}

using Buckets = map<string, vector<string>>;      // std::map: keys come out sorted

Buckets buildBuckets(const vector<string>& words) {
    Buckets buckets;
    for (const string& w : words)
        for (const string& p : patterns(w)) buckets[p].push_back(w);   // [] creates the bucket
    return buckets;
}

vector<string> ladder(const string& begin, const string& end, const vector<string>& wordList) {
    if (find(wordList.begin(), wordList.end(), end) == wordList.end()) return {};  // one O(N) check
    vector<string> all{begin};                    // begin needs its patterns too
    all.insert(all.end(), wordList.begin(), wordList.end());
    Buckets buckets = buildBuckets(all);
    unordered_map<string, string> parent{{begin, ""}};   // also the visited set
    queue<string> q;
    q.push(begin);
    while (!q.empty()) {
        string word = q.front(); q.pop();
        if (word == end) {
            vector<string> chain{word};
            while (chain.back() != begin) chain.push_back(parent.at(chain.back()));
            reverse(chain.begin(), chain.end());
            return chain;
        }
        for (const string& p : patterns(word)) {
            auto it = buckets.find(p);            // find: do not create empty buckets
            if (it == buckets.end()) continue;
            for (const string& next : it->second)
                if (!parent.count(next)) { parent[next] = word; q.push(next); }
            it->second.clear();                   // every word here is now visited: never rescan
        }
    }
    return {};
}

int main() {
    vector<string> words = {"hot", "dot", "dog", "lot", "log", "cog"};
    vector<string> all{"hit"};
    all.insert(all.end(), words.begin(), words.end());
    Buckets buckets = buildBuckets(all);
    cout << "patterns: " << buckets.size() << "\\n";
    for (auto& [p, ws] : buckets) {
        if (ws.size() < 2) continue;
        cout << "  " << p << " -> ";
        for (size_t i = 0; i < ws.size(); i++) cout << (i ? ", " : "") << ws[i];
        cout << "\\n";
    }
    vector<string> noCog(words.begin(), words.end() - 1);
    vector<pair<pair<string, string>, vector<string>>> cases = {
        {{"hit", "cog"}, words}, {{"hit", "cog"}, noCog}, {{"hot", "dog"}, {"hot", "dog"}}};
    for (auto& [be, wl] : cases) {
        vector<string> chain = ladder(be.first, be.second, wl);
        cout << be.first << " -> " << be.second << ": " << chain.size();
        for (size_t i = 0; i < chain.size(); i++) cout << (i ? " -> " : "  ") << chain[i];
        cout << "\\n";
    }
}`,
          },
          {
            label: "Pairwise comparison vs wildcard buckets, and BFS with vs without clearing buckets",
            code: `#include <iostream>
#include <queue>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>
using namespace std;

const string LETTERS = "abcdefgh";
long long seed = 7;
int rnd() {                                    // Park-Miller generator; long long avoids overflow
    seed = seed * 48271 % 2147483647LL;
    return int(seed);
}

vector<string> patterns(const string& word) {
    vector<string> out;
    for (size_t i = 0; i < word.size(); i++) { string p = word; p[i] = '*'; out.push_back(p); }
    return out;
}

using Buckets = unordered_map<string, vector<string>>;

int main() {
    for (int size : {500, 1500, 3000}) {
        unordered_set<string> seen;
        vector<string> words;
        for (int t = 0; t < size; t++) {
            string w;
            for (int j = 0; j < 4; j++) w += LETTERS[rnd() % LETTERS.size()];
            if (seen.insert(w).second) words.push_back(w);   // keep the first copy, in order
        }
        for (string extra : {"aaaa", "hhhh"}) if (seen.insert(extra).second) words.push_back(extra);

        long long pairs = 0, e1 = 0;                // compare every pair: O(N^2 * L)
        for (size_t i = 0; i < words.size(); i++)
            for (size_t j = i + 1; j < words.size(); j++) {
                pairs++;
                int diff = 0;
                for (size_t k = 0; k < words[i].size(); k++) diff += words[i][k] != words[j][k];
                e1 += diff == 1;
            }

        Buckets buckets;                            // group by pattern: O(N * L^2)
        for (const string& w : words) for (const string& p : patterns(w)) buckets[p].push_back(w);
        long long e2 = 0;
        for (auto& [p, ws] : buckets) e2 += (long long)ws.size() * (ws.size() - 1) / 2;

        int lengths[2], scans[2];
        for (int clear = 0; clear < 2; clear++) {
            Buckets b = buckets;                    // a full copy: we may clear it
            unordered_map<string, int> dist{{"aaaa", 1}};
            queue<string> q;
            q.push("aaaa");
            int scanned = 0, found = 0;
            while (!q.empty() && !found) {
                string word = q.front(); q.pop();
                if (word == "hhhh") { found = dist[word]; break; }
                for (const string& p : patterns(word)) {
                    auto it = b.find(p);
                    if (it == b.end()) continue;
                    for (const string& next : it->second) {
                        scanned++;
                        if (!dist.count(next)) { dist[next] = dist[word] + 1; q.push(next); }
                    }
                    if (clear) it->second.clear();
                }
            }
            lengths[clear] = found;
            scans[clear] = scanned;
        }
        cout << words.size() << " distinct words, " << buckets.size() << " buckets\\n";
        cout << "  pairwise: " << pairs << " pairs compared, " << e1 << " edges\\n";
        cout << "  buckets:  " << words.size() * 4 << " patterns made, " << e2 << " edges\\n";
        cout << "  BFS length " << lengths[0] << " = " << lengths[1] << "; entries scanned " << scans[0]
             << " without clearing, " << scans[1] << " with clearing\\n";
    }
}`,
          },
        ],
      },
    },
  },
];

export default augments;
