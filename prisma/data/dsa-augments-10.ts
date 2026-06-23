/**
 * DSA augment batch 10 — dsa-4.json items 16-25: MST (Kruskal/Prim), heaps
 * (merge k lists, median stream, k closest points, meeting rooms) and DP
 * (0/1 knapsack, LIS, edit distance, house robber, word break).
 * See dsa-augments.types.ts for the authoring rules (no "${", no raw backticks
 * inside these template literals; inline code uses <code> tags). Every code
 * variant is a COMPLETE RUNNABLE PROGRAM. JavaScript lacks a built-in heap, so
 * the heap problems embed a tiny comparator-based binary Heap.
 */
import type { DsaAugment } from "./dsa-augments.types";

const augments: DsaAugment[] = [
  {
    title: "What is the difference between Kruskal's and Prim's MST algorithms?",
    answer: `
**Intuition.** Both build a **minimum spanning tree** — a cheapest set of edges connecting every vertex with no cycle — but they grow it differently. **Kruskal's** is *edge-centric*: sort all edges, greedily add the cheapest that doesn't form a cycle (tracked with Union-Find). **Prim's** is *vertex-centric*: grow one tree outward, always adding the cheapest edge that reaches a new vertex (tracked with a heap).

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 165" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">Kruskal adds cheapest safe edges: 4, 5, 10 → MST weight 19</text>
  <g font-size="12" text-anchor="middle">
    <circle cx="120" cy="55" r="18" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="120" y="60" fill="currentColor">0</text>
    <circle cx="300" cy="55" r="18" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="300" y="60" fill="currentColor">1</text>
    <circle cx="120" cy="135" r="18" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="120" y="140" fill="currentColor">2</text>
    <circle cx="300" cy="135" r="18" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="300" y="140" fill="currentColor">3</text>
  </g>
  <g font-size="10" fill="currentColor">
    <line x1="138" y1="55" x2="282" y2="55" stroke="#f59e0b" stroke-width="2.5"/><text x="210" y="48">10</text>
    <line x1="120" y1="73" x2="120" y2="117" stroke="currentColor" stroke-opacity="0.25"/><text x="108" y="98">6</text>
    <line x1="135" y1="68" x2="285" y2="122" stroke="#f59e0b" stroke-width="2.5"/><text x="195" y="108">5</text>
    <line x1="138" y1="135" x2="282" y2="135" stroke="#f59e0b" stroke-width="2.5"/><text x="210" y="128">4</text>
    <line x1="300" y1="73" x2="300" y2="117" stroke="currentColor" stroke-opacity="0.25"/><text x="308" y="98">15</text>
  </g>
  <text x="430" y="95" fill="#f59e0b" font-size="11" text-anchor="middle">MST = 19</text>
</svg>
</div>

### Side by side
| | Kruskal's | Prim's |
| --- | --- | --- |
| Drives by | edges (global) | vertices (local frontier) |
| Cycle/visited check | **Union-Find** | visited set + heap |
| Complexity | O(E log E) | O(E log V) |
| Best for | **sparse** graphs | **dense** graphs |

Both are greedy and provably optimal via the **cut property**: the cheapest edge crossing any partition is safe to include.

**Dry run (Kruskal).** Sort edges: 4(2-3), 5(0-3), 6(0-2), 10(0-1), 15(1-3). Take 4 → take 5 → skip 6 (0 and 2 already connected) → take 10 → all four vertices joined. Weight **4 + 5 + 10 = 19**.

> **Interview tip:** the example code is Kruskal (cleanest with Union-Find). Be ready to say *why* each fits its graph density: Kruskal sorts E edges; Prim does E heap operations against V vertices. Both rely on the cut property for correctness.
`,
    examples: [
      {
        label: "Kruskal's MST (Union-Find)",
        variants: [
          { tech: "python", label: "Python", code: `def kruskal_mst(n, edges):
    parent = list(range(n))
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    total, used = 0, 0
    for w, u, v in sorted(edges):           # cheapest edge first
        ru, rv = find(u), find(v)
        if ru != rv:                        # skip if it would form a cycle
            parent[ru] = rv
            total += w
            used += 1
    return total if used == n - 1 else -1   # -1 = graph not connected


# --- demo ---  edges (w, u, v)
edges = [(10, 0, 1), (6, 0, 2), (5, 0, 3), (15, 1, 3), (4, 2, 3)]
print(kruskal_mst(4, edges))   # 19  (edges 4 + 5 + 10)` },
          { tech: "javascript", label: "JavaScript", code: `function kruskalMST(n, edges) {
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  edges.sort((a, b) => a[0] - b[0]);        // by weight
  let total = 0, used = 0;
  for (const [w, u, v] of edges) {
    const ru = find(u), rv = find(v);
    if (ru !== rv) { parent[ru] = rv; total += w; used++; }
  }
  return used === n - 1 ? total : -1;
}

// --- demo ---  edges [w, u, v]
const edges = [[10, 0, 1], [6, 0, 2], [5, 0, 3], [15, 1, 3], [4, 2, 3]];
console.log(kruskalMST(4, edges)); // 19` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static int[] parent;
    static int find(int x) {
        while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
        return x;
    }

    static int kruskalMST(int n, int[][] edges) {   // each edge {w, u, v}
        parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        Arrays.sort(edges, (a, b) -> a[0] - b[0]);
        int total = 0, used = 0;
        for (int[] e : edges) {
            int ru = find(e[1]), rv = find(e[2]);
            if (ru != rv) { parent[ru] = rv; total += e[0]; used++; }
        }
        return used == n - 1 ? total : -1;
    }

    public static void main(String[] args) {
        int[][] edges = {{10,0,1},{6,0,2},{5,0,3},{15,1,3},{4,2,3}};
        System.out.println(kruskalMST(4, edges));   // 19
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

vector<int> parent;
int find(int x) {
    while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
}

int kruskalMST(int n, vector<array<int,3>> edges) {   // {w, u, v}
    parent.resize(n);
    for (int i = 0; i < n; i++) parent[i] = i;
    sort(edges.begin(), edges.end());
    int total = 0, used = 0;
    for (auto& e : edges) {
        int ru = find(e[1]), rv = find(e[2]);
        if (ru != rv) { parent[ru] = rv; total += e[0]; used++; }
    }
    return used == n - 1 ? total : -1;
}

int main() {
    vector<array<int,3>> edges = {{10,0,1},{6,0,2},{5,0,3},{15,1,3},{4,2,3}};
    cout << kruskalMST(4, edges) << endl;   // 19
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you merge k sorted lists?",
    answer: `
**Intuition.** At every step the next smallest element is the minimum of the current heads of all k lists. A **min-heap** holding those heads gives you that minimum in O(log k); pop it, append it to the result, and push its successor. Repeat until the heap drains.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 160" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">heap of k heads → pop min, push its successor</text>
  <g font-size="12" text-anchor="middle" font-family="ui-monospace,monospace">
    <text x="40" y="50" fill="#3b82f6">1→4→5</text>
    <text x="40" y="80" fill="#8b5cf6">1→3→4</text>
    <text x="40" y="110" fill="#f59e0b">2→6</text>
  </g>
  <rect x="150" y="35" width="120" height="90" rx="10" fill="#22c55e" fill-opacity="0.06" stroke="#22c55e" stroke-opacity="0.4"/>
  <text x="210" y="55" fill="#22c55e" font-size="11" text-anchor="middle">min-heap</text>
  <text x="210" y="78" fill="currentColor" font-size="12" text-anchor="middle" font-family="ui-monospace,monospace">[1,1,2]</text>
  <text x="210" y="100" fill="currentColor" font-size="9" text-anchor="middle" opacity="0.6">pop smallest head</text>
  <text x="300" y="83" fill="#f59e0b" font-size="18">→</text>
  <text x="410" y="83" fill="#22c55e" font-size="12" text-anchor="middle" font-family="ui-monospace,monospace">1→1→2→3→4→4→5→6</text>
</svg>
</div>

### The algorithm
1. Push the head of every non-empty list into a min-heap keyed by value.
2. Pop the smallest node, attach it to the result tail.
3. If that node has a <code>next</code>, push it. Repeat until empty.

| Approach | Time | Space |
| --- | --- | --- |
| Min-heap of k heads | O(N log k) | O(k) heap |
| Pairwise divide & conquer | O(N log k) | O(1) extra |

(<code>N</code> = total nodes.) The heap never holds more than k items, so each of the N pops/pushes costs O(log k).

**Dry run.** Heads <code>[1,1,2]</code> → pop a 1, push the 4 behind it → <code>[1,2,4]</code> → pop 1, push 3 → … the result chains out to <code>1→1→2→3→4→4→5→6</code>.

> **Interview tip:** mention the equally good **divide-and-conquer** alternative — merge lists pairwise like merge sort, same O(N log k) without a heap. In Python push a tuple <code>(val, idx, node)</code> so the heap never tries to compare node objects on ties.
`,
    examples: [
      {
        label: "Min-heap of list heads",
        variants: [
          { tech: "python", label: "Python", code: `import heapq

class ListNode:
    def __init__(self, val, nxt=None):
        self.val, self.next = val, nxt

def merge_k_lists(lists):
    heap = []
    for i, node in enumerate(lists):
        if node:
            heapq.heappush(heap, (node.val, i, node))   # i breaks ties
    dummy = tail = ListNode(0)
    while heap:
        val, i, node = heapq.heappop(heap)
        tail.next = node
        tail = node
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))
    return dummy.next


# --- demo ---
def build(vals):
    head = None
    for v in reversed(vals): head = ListNode(v, head)
    return head
def to_list(head):
    out = []
    while head: out.append(head.val); head = head.next
    return out

merged = merge_k_lists([build([1, 4, 5]), build([1, 3, 4]), build([2, 6])])
print(to_list(merged))   # [1, 1, 2, 3, 4, 4, 5, 6]` },
          { tech: "javascript", label: "JavaScript", code: `class ListNode {
  constructor(val, next = null) { this.val = val; this.next = next; }
}

// tiny comparator-based binary heap (JS has none built in)
class Heap {
  constructor(less) { this.a = []; this.less = less; }
  size() { return this.a.length; }
  push(x) {
    const a = this.a; a.push(x); let i = a.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (!this.less(a[i], a[p])) break; [a[i], a[p]] = [a[p], a[i]]; i = p; }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last; let i = 0; const n = a.length;
      while (true) {
        let l = 2 * i + 1, r = 2 * i + 2, m = i;
        if (l < n && this.less(a[l], a[m])) m = l;
        if (r < n && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]]; i = m;
      }
    }
    return top;
  }
}

function mergeKLists(lists) {
  const heap = new Heap((x, y) => x.val < y.val);
  for (const node of lists) if (node) heap.push(node);
  const dummy = new ListNode(0);
  let tail = dummy;
  while (heap.size()) {
    const node = heap.pop();
    tail.next = node;
    tail = node;
    if (node.next) heap.push(node.next);
  }
  return dummy.next;
}

// --- demo ---
const build = (vals) => vals.reduceRight((next, v) => new ListNode(v, next), null);
const toArray = (h) => { const out = []; while (h) { out.push(h.val); h = h.next; } return out; };
console.log(toArray(mergeKLists([build([1,4,5]), build([1,3,4]), build([2,6])]))); // [1,1,2,3,4,4,5,6]` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static class ListNode {
        int val; ListNode next;
        ListNode(int val) { this.val = val; }
    }

    static ListNode mergeKLists(ListNode[] lists) {
        PriorityQueue<ListNode> heap = new PriorityQueue<>((a, b) -> a.val - b.val);
        for (ListNode node : lists) if (node != null) heap.add(node);
        ListNode dummy = new ListNode(0), tail = dummy;
        while (!heap.isEmpty()) {
            ListNode node = heap.poll();
            tail.next = node;
            tail = node;
            if (node.next != null) heap.add(node.next);
        }
        return dummy.next;
    }

    static ListNode build(int[] vals) {
        ListNode head = null;
        for (int i = vals.length - 1; i >= 0; i--) {
            ListNode nd = new ListNode(vals[i]); nd.next = head; head = nd;
        }
        return head;
    }

    public static void main(String[] args) {
        ListNode[] lists = { build(new int[]{1,4,5}), build(new int[]{1,3,4}), build(new int[]{2,6}) };
        StringBuilder sb = new StringBuilder();
        for (ListNode n = mergeKLists(lists); n != null; n = n.next) sb.append(n.val).append(" ");
        System.out.println(sb.toString().trim());   // 1 1 2 3 4 4 5 6
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

struct ListNode {
    int val;
    ListNode* next = nullptr;
    ListNode(int v) : val(v) {}
};

ListNode* mergeKLists(vector<ListNode*>& lists) {
    auto cmp = [](ListNode* a, ListNode* b) { return a->val > b->val; };   // min-heap
    priority_queue<ListNode*, vector<ListNode*>, decltype(cmp)> heap(cmp);
    for (ListNode* node : lists) if (node) heap.push(node);
    ListNode dummy(0);
    ListNode* tail = &dummy;
    while (!heap.empty()) {
        ListNode* node = heap.top(); heap.pop();
        tail->next = node;
        tail = node;
        if (node->next) heap.push(node->next);
    }
    return dummy.next;
}

int main() {
    auto build = [](vector<int> vals) {
        ListNode* h = nullptr;
        for (int i = (int)vals.size() - 1; i >= 0; i--) {
            ListNode* nd = new ListNode(vals[i]); nd->next = h; h = nd;
        }
        return h;
    };
    vector<ListNode*> lists = { build({1,4,5}), build({1,3,4}), build({2,6}) };
    for (ListNode* n = mergeKLists(lists); n; n = n->next) cout << n->val << " ";
    cout << endl;   // 1 1 2 3 4 4 5 6
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you find the median from a data stream?",
    answer: `
**Intuition.** Keep the numbers split into two balanced halves: a **max-heap** for the smaller half and a **min-heap** for the larger half. The median is then always at the heaps' tops — the max-heap's max (odd total) or the average of both tops (even total). Each insert just rebalances by moving one element across.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 160" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">lower half (max-heap) | upper half (min-heap) → median at the tops</text>
  <rect x="40" y="45" width="170" height="80" rx="10" fill="#3b82f6" fill-opacity="0.07" stroke="#3b82f6" stroke-opacity="0.4"/>
  <rect x="310" y="45" width="170" height="80" rx="10" fill="#8b5cf6" fill-opacity="0.07" stroke="#8b5cf6" stroke-opacity="0.4"/>
  <text x="125" y="66" fill="#3b82f6" font-size="11" text-anchor="middle">max-heap (lower)</text>
  <text x="395" y="66" fill="#8b5cf6" font-size="11" text-anchor="middle">min-heap (upper)</text>
  <text x="125" y="95" fill="currentColor" font-size="14" text-anchor="middle" font-family="ui-monospace,monospace">… 1 2</text>
  <text x="395" y="95" fill="currentColor" font-size="14" text-anchor="middle" font-family="ui-monospace,monospace">3 …</text>
  <text x="125" y="116" fill="#3b82f6" font-size="10" text-anchor="middle">top = 2</text>
  <text x="395" y="116" fill="#8b5cf6" font-size="10" text-anchor="middle">top = 3</text>
  <text x="260" y="140" fill="#22c55e" font-size="11" text-anchor="middle">median = top(s)</text>
</svg>
</div>

### The algorithm
1. Push the new number into the **lower** max-heap.
2. Move its max into the **upper** min-heap (keeps lower ≤ upper).
3. If upper grew larger than lower, move upper's min back — so lower holds the extra element on odd counts.
4. Median = lower's top (odd) or the average of the two tops (even).

| Operation | Time |
| --- | --- |
| addNum | O(log n) |
| findMedian | **O(1)** |

The invariant "lower's size equals or is one more than upper's" is what places the median deterministically.

**Dry run.** Stream 1, 2, 3: after 1 → median **1**; after 2 → tops 1 and 2 → **1.5**; after 3 → lower top **2**.

> **Interview tip:** Python has only a min-heap (<code>heapq</code>), so simulate the max-heap by **negating** values. State the balancing invariant explicitly — interviewers want to hear *why* the tops are always the median.
`,
    examples: [
      {
        label: "Two balanced heaps",
        variants: [
          { tech: "python", label: "Python", code: `import heapq

class MedianFinder:
    def __init__(self):
        self.lo = []   # max-heap (stored as negatives)
        self.hi = []   # min-heap

    def add_num(self, num):
        heapq.heappush(self.lo, -num)
        heapq.heappush(self.hi, -heapq.heappop(self.lo))   # move max of lo to hi
        if len(self.hi) > len(self.lo):                    # rebalance
            heapq.heappush(self.lo, -heapq.heappop(self.hi))

    def find_median(self):
        if len(self.lo) > len(self.hi):
            return float(-self.lo[0])
        return (-self.lo[0] + self.hi[0]) / 2.0


# --- demo ---
mf = MedianFinder()
for x in [1, 2, 3]:
    mf.add_num(x)
    print(mf.find_median())   # 1.0, then 1.5, then 2.0` },
          { tech: "javascript", label: "JavaScript", code: `class Heap {
  constructor(less) { this.a = []; this.less = less; }
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a; a.push(x); let i = a.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (!this.less(a[i], a[p])) break; [a[i], a[p]] = [a[p], a[i]]; i = p; }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last; let i = 0; const n = a.length;
      while (true) {
        let l = 2 * i + 1, r = 2 * i + 2, m = i;
        if (l < n && this.less(a[l], a[m])) m = l;
        if (r < n && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]]; i = m;
      }
    }
    return top;
  }
}

class MedianFinder {
  constructor() {
    this.lo = new Heap((x, y) => x > y);   // max-heap
    this.hi = new Heap((x, y) => x < y);   // min-heap
  }
  addNum(num) {
    this.lo.push(num);
    this.hi.push(this.lo.pop());
    if (this.hi.size() > this.lo.size()) this.lo.push(this.hi.pop());
  }
  findMedian() {
    if (this.lo.size() > this.hi.size()) return this.lo.peek();
    return (this.lo.peek() + this.hi.peek()) / 2;
  }
}

// --- demo ---
const mf = new MedianFinder();
for (const x of [1, 2, 3]) { mf.addNum(x); console.log(mf.findMedian()); } // 1, 1.5, 2` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static class MedianFinder {
        PriorityQueue<Integer> lo = new PriorityQueue<>(Collections.reverseOrder()); // max-heap
        PriorityQueue<Integer> hi = new PriorityQueue<>();                            // min-heap

        void addNum(int num) {
            lo.add(num);
            hi.add(lo.poll());
            if (hi.size() > lo.size()) lo.add(hi.poll());
        }
        double findMedian() {
            if (lo.size() > hi.size()) return lo.peek();
            return (lo.peek() + hi.peek()) / 2.0;
        }
    }

    public static void main(String[] args) {
        MedianFinder mf = new MedianFinder();
        for (int x : new int[]{1, 2, 3}) {
            mf.addNum(x);
            System.out.println(mf.findMedian());   // 1.0, 1.5, 2.0
        }
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

class MedianFinder {
    priority_queue<int> lo;                                // max-heap
    priority_queue<int, vector<int>, greater<int>> hi;     // min-heap
public:
    void addNum(int num) {
        lo.push(num);
        hi.push(lo.top()); lo.pop();
        if (hi.size() > lo.size()) { lo.push(hi.top()); hi.pop(); }
    }
    double findMedian() {
        if (lo.size() > hi.size()) return lo.top();
        return (lo.top() + hi.top()) / 2.0;
    }
};

int main() {
    MedianFinder mf;
    for (int x : {1, 2, 3}) {
        mf.addNum(x);
        cout << mf.findMedian() << endl;   // 1, 1.5, 2
    }
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you find the k closest points to the origin?",
    answer: `
**Intuition.** You want the k smallest by distance — but sorting all n points is overkill. Keep a **max-heap of size k**: push each point, and whenever the heap exceeds k, pop the *farthest*. What survives is the k closest. Compare **squared** distances to skip the needless square root.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 160" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">max-heap of size k keeps the k nearest; pop the farthest</text>
  <line x1="60" y1="120" x2="260" y2="120" stroke="currentColor" stroke-opacity="0.25"/>
  <line x1="80" y1="40" x2="80" y2="140" stroke="currentColor" stroke-opacity="0.25"/>
  <circle cx="80" cy="120" r="3" fill="currentColor"/><text x="70" y="135" fill="currentColor" font-size="9" opacity="0.6">O</text>
  <circle cx="100" cy="100" r="6" fill="#22c55e" fill-opacity="0.5" stroke="#22c55e"/><text x="110" y="98" fill="currentColor" font-size="9">(0,1) d=1</text>
  <circle cx="120" cy="78" r="6" fill="#22c55e" fill-opacity="0.5" stroke="#22c55e"/><text x="130" y="76" fill="currentColor" font-size="9">(-2,2) d=8</text>
  <circle cx="160" cy="70" r="6" fill="#ef4444" fill-opacity="0.4" stroke="#ef4444"/><text x="170" y="66" fill="currentColor" font-size="9">(1,3) d=10</text>
  <circle cx="240" cy="48" r="6" fill="#ef4444" fill-opacity="0.4" stroke="#ef4444"/><text x="250" y="44" fill="currentColor" font-size="9">(5,8) d=89</text>
  <text x="400" y="100" fill="#22c55e" font-size="12" text-anchor="middle">k=2 → (0,1),(-2,2)</text>
</svg>
</div>

### The algorithm
1. For each point compute <code>d = x&sup2; + y&sup2;</code> (no sqrt needed — order is preserved).
2. Push onto a max-heap keyed by <code>d</code>; if size exceeds k, pop the farthest.
3. The heap's contents are the k closest points.

| Approach | Time | Space |
| --- | --- | --- |
| Max-heap of size k | O(n log k) | O(k) |
| Quickselect (single batch) | avg O(n) | O(1) |

If you only need one batch (not a stream), **Quickselect** partitions around the kth distance in average linear time.

**Dry run (k=2).** Distances 10, 8, 89, 1. Heap caps at 2: it ends holding the points with distances **1** and **8** — i.e. <code>(0,1)</code> and <code>(-2,2)</code>.

> **Interview tip:** the two reusable tricks — compare **squared** distance, and cap the heap at k so each op is O(log k) not O(log n). Quickselect is the optimal one-shot answer; the heap wins for a streaming feed.
`,
    examples: [
      {
        label: "Max-heap of size k",
        variants: [
          { tech: "python", label: "Python", code: `import heapq

def k_closest(points, k):
    heap = []                       # max-heap via negative distance
    for x, y in points:
        d = x * x + y * y
        heapq.heappush(heap, (-d, [x, y]))
        if len(heap) > k:
            heapq.heappop(heap)     # drop the farthest
    return sorted(p for _, p in heap)


# --- demo ---
print(k_closest([[1, 3], [-2, 2], [5, 8], [0, 1]], 2))   # [[-2, 2], [0, 1]]` },
          { tech: "javascript", label: "JavaScript", code: `class Heap {
  constructor(less) { this.a = []; this.less = less; }
  size() { return this.a.length; }
  push(x) {
    const a = this.a; a.push(x); let i = a.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (!this.less(a[i], a[p])) break; [a[i], a[p]] = [a[p], a[i]]; i = p; }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last; let i = 0; const n = a.length;
      while (true) {
        let l = 2 * i + 1, r = 2 * i + 2, m = i;
        if (l < n && this.less(a[l], a[m])) m = l;
        if (r < n && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]]; i = m;
      }
    }
    return top;
  }
}

function kClosest(points, k) {
  const heap = new Heap((x, y) => x[0] > y[0]);   // max-heap by distance
  for (const [x, y] of points) {
    heap.push([x * x + y * y, [x, y]]);
    if (heap.size() > k) heap.pop();
  }
  return heap.a.map((item) => item[1]).sort((p, q) => p[0] - q[0] || p[1] - q[1]);
}

// --- demo ---
console.log(kClosest([[1, 3], [-2, 2], [5, 8], [0, 1]], 2)); // [ [ -2, 2 ], [ 0, 1 ] ]` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static int dist(int[] p) { return p[0] * p[0] + p[1] * p[1]; }

    static int[][] kClosest(int[][] points, int k) {
        PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> dist(b) - dist(a)); // max-heap
        for (int[] p : points) {
            heap.add(p);
            if (heap.size() > k) heap.poll();
        }
        int[][] res = new int[k][];
        for (int i = 0; i < k; i++) res[i] = heap.poll();
        Arrays.sort(res, (a, b) -> a[0] != b[0] ? a[0] - b[0] : a[1] - b[1]);
        return res;
    }

    public static void main(String[] args) {
        int[][] res = kClosest(new int[][]{{1,3},{-2,2},{5,8},{0,1}}, 2);
        System.out.println(Arrays.deepToString(res));   // [[-2, 2], [0, 1]]
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

vector<vector<int>> kClosest(vector<vector<int>>& points, int k) {
    priority_queue<pair<int,int>> heap;   // max-heap of (distance, index)
    for (int i = 0; i < (int)points.size(); i++) {
        int d = points[i][0]*points[i][0] + points[i][1]*points[i][1];
        heap.push({d, i});
        if ((int)heap.size() > k) heap.pop();
    }
    vector<vector<int>> res;
    while (!heap.empty()) { res.push_back(points[heap.top().second]); heap.pop(); }
    sort(res.begin(), res.end());
    return res;
}

int main() {
    vector<vector<int>> points = {{1,3},{-2,2},{5,8},{0,1}};
    auto res = kClosest(points, 2);
    cout << "[";
    for (int i = 0; i < (int)res.size(); i++) {
        cout << "[" << res[i][0] << "," << res[i][1] << "]";
        if (i + 1 < (int)res.size()) cout << ",";
    }
    cout << "]" << endl;   // [[-2,2],[0,1]]
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you find the minimum number of meeting rooms required?",
    answer: `
**Intuition.** A new room is only needed when a meeting starts before all earlier ones have ended. Sort meetings by start time and track ongoing end times in a **min-heap**: for each meeting, if the earliest end is ≤ this start, that room is free (reuse it); otherwise allocate a new room. The peak heap size is the answer.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">overlapping intervals → peak concurrency = rooms (here 2)</text>
  <line x1="40" y1="120" x2="490" y2="120" stroke="currentColor" stroke-opacity="0.2"/>
  <rect x="50" y="40" width="400" height="16" rx="6" fill="#3b82f6" fill-opacity="0.3" stroke="#3b82f6"/><text x="60" y="52" fill="currentColor" font-size="10">[0, 30]</text>
  <rect x="110" y="64" width="70" height="16" rx="6" fill="#8b5cf6" fill-opacity="0.3" stroke="#8b5cf6"/><text x="118" y="76" fill="currentColor" font-size="10">[5,10]</text>
  <rect x="240" y="64" width="70" height="16" rx="6" fill="#f59e0b" fill-opacity="0.3" stroke="#f59e0b"/><text x="248" y="76" fill="currentColor" font-size="10">[15,20]</text>
  <text x="150" y="105" fill="#ef4444" font-size="10" text-anchor="middle">overlap → 2 rooms</text>
  <text x="275" y="105" fill="#22c55e" font-size="10" text-anchor="middle">room reused</text>
</svg>
</div>

### The algorithm
1. Sort intervals by **start** time.
2. Maintain a min-heap of **end** times of in-progress meetings.
3. For each meeting: if <code>heap.top ≤ start</code>, pop (a room freed up). Always push the current end.
4. The heap's final size = rooms needed (it equals the max concurrent overlap).

| | Time | Space |
| --- | --- | --- |
| Sort + min-heap | O(n log n) | O(n) |

An alternative is the **chronological sweep**: sort start and end times separately, sweep with two pointers, tracking concurrent count — same O(n log n), no heap.

**Dry run.** Sorted <code>[0,30],[5,10],[15,20]</code>: room for [0,30]; [5,10] overlaps → 2nd room; [15,20] starts at 15 ≥ 10 → reuse the freed room. Peak **2**.

> **Interview tip:** the min-heap top is always the *soonest-freeing* room, which is exactly the one to test for reuse. Mention the two-pointer sweep as the heap-free equivalent — interviewers like seeing both framings.
`,
    examples: [
      {
        label: "Sort + min-heap of end times",
        variants: [
          { tech: "python", label: "Python", code: `import heapq

def min_meeting_rooms(intervals):
    if not intervals:
        return 0
    intervals.sort(key=lambda x: x[0])    # by start
    heap = []                             # end times of ongoing meetings
    for start, end in intervals:
        if heap and heap[0] <= start:
            heapq.heappop(heap)           # a room freed up — reuse it
        heapq.heappush(heap, end)
    return len(heap)


# --- demo ---
print(min_meeting_rooms([[0, 30], [5, 10], [15, 20]]))   # 2` },
          { tech: "javascript", label: "JavaScript", code: `class Heap {
  constructor(less) { this.a = []; this.less = less; }
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a; a.push(x); let i = a.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (!this.less(a[i], a[p])) break; [a[i], a[p]] = [a[p], a[i]]; i = p; }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last; let i = 0; const n = a.length;
      while (true) {
        let l = 2 * i + 1, r = 2 * i + 2, m = i;
        if (l < n && this.less(a[l], a[m])) m = l;
        if (r < n && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]]; i = m;
      }
    }
    return top;
  }
}

function minMeetingRooms(intervals) {
  if (!intervals.length) return 0;
  intervals.sort((a, b) => a[0] - b[0]);
  const heap = new Heap((x, y) => x < y);   // min-heap of end times
  for (const [start, end] of intervals) {
    if (heap.size() && heap.peek() <= start) heap.pop();
    heap.push(end);
  }
  return heap.size();
}

// --- demo ---
console.log(minMeetingRooms([[0, 30], [5, 10], [15, 20]])); // 2` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static int minMeetingRooms(int[][] intervals) {
        if (intervals.length == 0) return 0;
        Arrays.sort(intervals, (a, b) -> a[0] - b[0]);
        PriorityQueue<Integer> heap = new PriorityQueue<>();   // min-heap of end times
        for (int[] iv : intervals) {
            if (!heap.isEmpty() && heap.peek() <= iv[0]) heap.poll();
            heap.add(iv[1]);
        }
        return heap.size();
    }

    public static void main(String[] args) {
        System.out.println(minMeetingRooms(new int[][]{{0,30},{5,10},{15,20}}));   // 2
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

int minMeetingRooms(vector<vector<int>> intervals) {
    if (intervals.empty()) return 0;
    sort(intervals.begin(), intervals.end());
    priority_queue<int, vector<int>, greater<int>> heap;   // min-heap of end times
    for (auto& iv : intervals) {
        if (!heap.empty() && heap.top() <= iv[0]) heap.pop();
        heap.push(iv[1]);
    }
    return heap.size();
}

int main() {
    cout << minMeetingRooms({{0,30},{5,10},{15,20}}) << endl;   // 2
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you solve the 0/1 knapsack problem?",
    answer: `
**Intuition.** Each item is either taken whole or skipped (the "0/1"). Build up the best achievable value for every capacity using one rolling 1-D array <code>dp[w]</code>. The crucial detail: iterate capacities **downward** when adding an item, so each item contributes to a capacity at most once.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">for each item, sweep capacity high→low: take vs skip</text>
  <text x="20" y="44" fill="currentColor" font-size="11" font-family="ui-monospace,monospace">items (w,v): (1,1) (3,4) (4,5) (5,7)   cap = 7</text>
  <g font-size="11" text-anchor="middle" font-family="ui-monospace,monospace">
    <rect x="60" y="70" width="44" height="30" rx="5" fill="#8b5cf6" fill-opacity="0.12" stroke="#8b5cf6"/><text x="82" y="90" fill="currentColor">w=3</text>
    <text x="82" y="118" fill="currentColor" font-size="9">+v=4</text>
    <text x="150" y="90" fill="#f59e0b" font-size="14">+</text>
    <rect x="180" y="70" width="44" height="30" rx="5" fill="#8b5cf6" fill-opacity="0.12" stroke="#8b5cf6"/><text x="202" y="90" fill="currentColor">w=4</text>
    <text x="202" y="118" fill="currentColor" font-size="9">+v=5</text>
    <text x="270" y="90" fill="#f59e0b" font-size="14">=</text>
    <rect x="300" y="70" width="60" height="30" rx="5" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/><text x="330" y="90" fill="currentColor">w=7</text>
    <text x="330" y="118" fill="#22c55e" font-size="11">value 9</text>
  </g>
</svg>
</div>

### The algorithm
1. <code>dp[w]</code> = best value for capacity <code>w</code>; start all zero.
2. For each item, for <code>w</code> from <code>capacity</code> down to <code>weight</code>: <code>dp[w] = max(dp[w], dp[w - weight] + value)</code>.
3. <code>dp[capacity]</code> is the answer.

| | Time | Space |
| --- | --- | --- |
| 1-D DP | O(n &middot; capacity) | O(capacity) |

The **downward** sweep is the whole trick: going upward would let one item be picked multiple times — that's the *unbounded* knapsack.

**Dry run.** Items (3,4) and (4,5) exactly fill capacity 7 → value **9**, which beats any single item or the (1,1)+(5,7)=8 combo.

> **Interview tip:** the iteration direction encodes the constraint — **down = 0/1** (each item once), **up = unbounded** (reuse allowed). That one-line difference is a favorite follow-up. Mention pseudo-polynomial time (depends on the numeric capacity, not just n).
`,
    examples: [
      {
        label: "1-D DP, capacity swept downward",
        variants: [
          { tech: "python", label: "Python", code: `def knapsack(weights, values, capacity):
    dp = [0] * (capacity + 1)
    for i in range(len(weights)):
        for w in range(capacity, weights[i] - 1, -1):    # high -> low = 0/1
            dp[w] = max(dp[w], dp[w - weights[i]] + values[i])
    return dp[capacity]


# --- demo ---
weights = [1, 3, 4, 5]
values  = [1, 4, 5, 7]
print(knapsack(weights, values, 7))   # 9  (weights 3 + 4 -> values 4 + 5)` },
          { tech: "javascript", label: "JavaScript", code: `function knapsack(weights, values, capacity) {
  const dp = new Array(capacity + 1).fill(0);
  for (let i = 0; i < weights.length; i++) {
    for (let w = capacity; w >= weights[i]; w--) {      // high -> low = 0/1
      dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
    }
  }
  return dp[capacity];
}

// --- demo ---
console.log(knapsack([1, 3, 4, 5], [1, 4, 5, 7], 7)); // 9` },
          { tech: "java", label: "Java", code: `public class Main {
    static int knapsack(int[] weights, int[] values, int capacity) {
        int[] dp = new int[capacity + 1];
        for (int i = 0; i < weights.length; i++) {
            for (int w = capacity; w >= weights[i]; w--) {   // high -> low = 0/1
                dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
            }
        }
        return dp[capacity];
    }

    public static void main(String[] args) {
        System.out.println(knapsack(new int[]{1,3,4,5}, new int[]{1,4,5,7}, 7));   // 9
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

int knapsack(vector<int>& weights, vector<int>& values, int capacity) {
    vector<int> dp(capacity + 1, 0);
    for (int i = 0; i < (int)weights.size(); i++) {
        for (int w = capacity; w >= weights[i]; w--) {   // high -> low = 0/1
            dp[w] = max(dp[w], dp[w - weights[i]] + values[i]);
        }
    }
    return dp[capacity];
}

int main() {
    vector<int> weights = {1, 3, 4, 5}, values = {1, 4, 5, 7};
    cout << knapsack(weights, values, 7) << endl;   // 9
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you find the longest increasing subsequence?",
    answer: `
**Intuition.** Maintain a <code>tails</code> array where <code>tails[i]</code> is the **smallest possible tail** of any increasing subsequence of length <code>i + 1</code>. For each number, binary-search the first tail ≥ it: replace it (a better, smaller tail for that length) or append it (a brand-new longest length). The array's length is the LIS length.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">tails holds smallest tail per length; binary-search each x</text>
  <text x="20" y="44" fill="currentColor" font-size="11" font-family="ui-monospace,monospace">[10,9,2,5,3,7,101,18]</text>
  <g font-size="12" text-anchor="middle" font-family="ui-monospace,monospace">
    <rect x="60" y="70" width="34" height="30" rx="5" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/><text x="77" y="90" fill="currentColor">2</text>
    <rect x="104" y="70" width="34" height="30" rx="5" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/><text x="121" y="90" fill="currentColor">3</text>
    <rect x="148" y="70" width="34" height="30" rx="5" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/><text x="165" y="90" fill="currentColor">7</text>
    <rect x="192" y="70" width="40" height="30" rx="5" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/><text x="212" y="90" fill="currentColor">18</text>
  </g>
  <text x="146" y="125" fill="#22c55e" font-size="11" text-anchor="middle">length 4 = LIS length</text>
  <text x="340" y="90" fill="currentColor" font-size="10" opacity="0.7" text-anchor="middle">tails is not the actual</text>
  <text x="340" y="105" fill="currentColor" font-size="10" opacity="0.7" text-anchor="middle">subsequence — just its length</text>
</svg>
</div>

### The algorithm
1. Empty <code>tails</code>.
2. For each <code>x</code>: binary-search the leftmost tail ≥ <code>x</code>.
3. If none (x is largest), append it; else overwrite that tail with <code>x</code>.
4. <code>len(tails)</code> is the LIS length.

| Approach | Time | Space |
| --- | --- | --- |
| Patience sort (tails + binary search) | O(n log n) | O(n) |
| Classic DP <code>dp[i]</code> | O(n&sup2;) | O(n) |

<code>tails</code> stays sorted by construction, which is what makes the binary search valid — note it is **not** the actual subsequence, only a length oracle.

**Dry run.** <code>[10,9,2,5,3,7,101,18]</code> → tails evolves to <code>[2,3,7,18]</code> (e.g. 5 then 3 overwrite earlier tails). Length **4**.

> **Interview tip:** stress that <code>tails</code> is **not** the LIS itself — its *length* is correct, but its contents may not form a real subsequence. To reconstruct the actual sequence, store predecessor indices alongside.
`,
    examples: [
      {
        label: "Patience sort (binary search)",
        variants: [
          { tech: "python", label: "Python", code: `import bisect

def length_of_lis(nums):
    tails = []
    for x in nums:
        i = bisect.bisect_left(tails, x)
        if i == len(tails):
            tails.append(x)       # x extends the longest run
        else:
            tails[i] = x          # x is a smaller tail for that length
    return len(tails)


# --- demo ---
print(length_of_lis([10, 9, 2, 5, 3, 7, 101, 18]))   # 4  (e.g. 2,3,7,18)` },
          { tech: "javascript", label: "JavaScript", code: `function lengthOfLIS(nums) {
  const tails = [];
  for (const x of nums) {
    let lo = 0, hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tails[mid] < x) lo = mid + 1; else hi = mid;
    }
    if (lo === tails.length) tails.push(x); else tails[lo] = x;
  }
  return tails.length;
}

// --- demo ---
console.log(lengthOfLIS([10, 9, 2, 5, 3, 7, 101, 18])); // 4` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static int lengthOfLIS(int[] nums) {
        List<Integer> tails = new ArrayList<>();
        for (int x : nums) {
            int lo = 0, hi = tails.size();
            while (lo < hi) {
                int mid = (lo + hi) >>> 1;
                if (tails.get(mid) < x) lo = mid + 1; else hi = mid;
            }
            if (lo == tails.size()) tails.add(x); else tails.set(lo, x);
        }
        return tails.size();
    }

    public static void main(String[] args) {
        System.out.println(lengthOfLIS(new int[]{10,9,2,5,3,7,101,18}));   // 4
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

int lengthOfLIS(vector<int>& nums) {
    vector<int> tails;
    for (int x : nums) {
        auto it = lower_bound(tails.begin(), tails.end(), x);
        if (it == tails.end()) tails.push_back(x);
        else *it = x;
    }
    return tails.size();
}

int main() {
    vector<int> nums = {10, 9, 2, 5, 3, 7, 101, 18};
    cout << lengthOfLIS(nums) << endl;   // 4
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you compute the edit distance between two strings?",
    answer: `
**Intuition.** <code>dp[i][j]</code> is the edit distance between the first <code>i</code> chars of <code>a</code> and the first <code>j</code> of <code>b</code>. If the current characters match, no new work — carry the diagonal. Otherwise you pay 1 for the cheapest of the three edits: **insert**, **delete**, or **replace**.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">each cell = min of three neighbors (+1) or the diagonal if chars match</text>
  <g font-size="11" text-anchor="middle" font-family="ui-monospace,monospace">
    <rect x="280" y="35" width="40" height="34" rx="5" fill="#8b5cf6" fill-opacity="0.12" stroke="#8b5cf6"/><text x="300" y="57" fill="currentColor">↖ rep</text>
    <rect x="330" y="35" width="40" height="34" rx="5" fill="#8b5cf6" fill-opacity="0.12" stroke="#8b5cf6"/><text x="350" y="57" fill="currentColor">↑ del</text>
    <rect x="280" y="80" width="40" height="34" rx="5" fill="#8b5cf6" fill-opacity="0.12" stroke="#8b5cf6"/><text x="300" y="102" fill="currentColor">← ins</text>
    <rect x="330" y="80" width="40" height="34" rx="5" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="350" y="102" fill="currentColor">dp[i][j]</text>
  </g>
  <text x="60" y="70" fill="currentColor" font-size="13" font-family="ui-monospace,monospace">horse → ros</text>
  <text x="60" y="95" fill="#22c55e" font-size="13" font-family="ui-monospace,monospace">distance = 3</text>
</svg>
</div>

### The algorithm
1. Base row/column: turning a length-<code>k</code> prefix into "" costs <code>k</code> deletions (and vice versa).
2. If <code>a[i-1] == b[j-1]</code>: <code>dp[i][j] = dp[i-1][j-1]</code>.
3. Else: <code>dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])</code> = delete, insert, replace.

| | Time | Space |
| --- | --- | --- |
| Full DP table | O(m &middot; n) | O(m &middot; n) |
| Rolling two rows | O(m &middot; n) | O(min(m, n)) |

Each transition maps to a concrete operation, which is why the same table also reconstructs the actual edit script if you backtrack through it.

**Dry run.** <code>horse → ros</code>: replace h→r, delete o (or keep "os" alignment), delete e — total **3** edits.

> **Interview tip:** name the three moves and which neighbor each corresponds to (↑ delete, ← insert, ↖ replace). The space can drop to O(min(m,n)) with two rolling rows — a clean follow-up optimization.
`,
    examples: [
      {
        label: "Levenshtein DP table",
        variants: [
          { tech: "python", label: "Python", code: `def edit_distance(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j],       # delete
                                   dp[i][j - 1],       # insert
                                   dp[i - 1][j - 1])   # replace
    return dp[m][n]


# --- demo ---
print(edit_distance('horse', 'ros'))            # 3
print(edit_distance('intention', 'execution'))  # 5` },
          { tech: "javascript", label: "JavaScript", code: `function editDistance(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// --- demo ---
console.log(editDistance('horse', 'ros'));           // 3
console.log(editDistance('intention', 'execution')); // 5` },
          { tech: "java", label: "Java", code: `public class Main {
    static int editDistance(String a, String b) {
        int m = a.length(), n = b.length();
        int[][] dp = new int[m + 1][n + 1];
        for (int i = 0; i <= m; i++) dp[i][0] = i;
        for (int j = 0; j <= n; j++) dp[0][j] = j;
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (a.charAt(i - 1) == b.charAt(j - 1)) dp[i][j] = dp[i - 1][j - 1];
                else dp[i][j] = 1 + Math.min(dp[i - 1][j], Math.min(dp[i][j - 1], dp[i - 1][j - 1]));
            }
        }
        return dp[m][n];
    }

    public static void main(String[] args) {
        System.out.println(editDistance("horse", "ros"));            // 3
        System.out.println(editDistance("intention", "execution"));  // 5
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

int editDistance(string a, string b) {
    int m = a.size(), n = b.size();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
    for (int i = 0; i <= m; i++) dp[i][0] = i;
    for (int j = 0; j <= n; j++) dp[0][j] = j;
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (a[i - 1] == b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
            else dp[i][j] = 1 + min({dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]});
        }
    }
    return dp[m][n];
}

int main() {
    cout << editDistance("horse", "ros") << endl;            // 3
    cout << editDistance("intention", "execution") << endl;  // 5
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you solve the house robber problem?",
    answer: `
**Intuition.** At each house you choose: **rob it** (and add the best from two houses back, since adjacent houses can't both be robbed) or **skip it** (keep the best so far). So <code>best[i] = max(best[i-1], best[i-2] + nums[i])</code> — and you only ever need the last two results, giving O(1) space.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">rob i + best two-back, or skip i → can't rob adjacent</text>
  <g font-size="12" text-anchor="middle">
    <rect x="50" y="55" width="50" height="40" rx="6" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="75" y="80" fill="currentColor">2</text>
    <rect x="130" y="55" width="50" height="40" rx="6" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.3"/><text x="155" y="80" fill="currentColor">7</text>
    <rect x="210" y="55" width="50" height="40" rx="6" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="235" y="80" fill="currentColor">9</text>
    <rect x="290" y="55" width="50" height="40" rx="6" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.3"/><text x="315" y="80" fill="currentColor">3</text>
    <rect x="370" y="55" width="50" height="40" rx="6" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="395" y="80" fill="currentColor">1</text>
  </g>
  <text x="235" y="125" fill="#22c55e" font-size="11" text-anchor="middle">rob houses 0, 2, 4 → 2 + 9 + 1 = 12</text>
</svg>
</div>

### The algorithm
1. Track two rolling values: <code>prev</code> (best up to <code>i-2</code>) and <code>curr</code> (best up to <code>i-1</code>).
2. For each house: <code>next = max(curr, prev + nums[i])</code>, then slide <code>prev = curr; curr = next</code>.
3. <code>curr</code> is the answer.

| | Time | Space |
| --- | --- | --- |
| Rolling DP | O(n) | **O(1)** |

**House Robber II** (houses in a circle) just runs this twice — once excluding the first house, once excluding the last — and takes the max, since the ends are now adjacent.

**Dry run.** <code>[2,7,9,3,1]</code>: robbing 2, 9, 1 (non-adjacent) totals **12**, beating 7+3=10.

> **Interview tip:** frame it as the rob/skip recurrence and immediately collapse the array to two variables. The circular follow-up (Robber II) is the standard extension — "run the linear version twice."
`,
    examples: [
      {
        label: "Rolling two-variable DP",
        variants: [
          { tech: "python", label: "Python", code: `def rob(nums):
    prev, curr = 0, 0    # best up to i-2, best up to i-1
    for x in nums:
        prev, curr = curr, max(curr, prev + x)
    return curr


# --- demo ---
print(rob([2, 7, 9, 3, 1]))   # 12  (2 + 9 + 1)
print(rob([1, 2, 3, 1]))      # 4   (1 + 3)` },
          { tech: "javascript", label: "JavaScript", code: `function rob(nums) {
  let prev = 0, curr = 0;
  for (const x of nums) {
    const next = Math.max(curr, prev + x);
    prev = curr;
    curr = next;
  }
  return curr;
}

// --- demo ---
console.log(rob([2, 7, 9, 3, 1])); // 12
console.log(rob([1, 2, 3, 1]));    // 4` },
          { tech: "java", label: "Java", code: `public class Main {
    static int rob(int[] nums) {
        int prev = 0, curr = 0;
        for (int x : nums) {
            int next = Math.max(curr, prev + x);
            prev = curr;
            curr = next;
        }
        return curr;
    }

    public static void main(String[] args) {
        System.out.println(rob(new int[]{2,7,9,3,1}));   // 12
        System.out.println(rob(new int[]{1,2,3,1}));     // 4
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

int rob(vector<int>& nums) {
    int prev = 0, curr = 0;
    for (int x : nums) {
        int next = max(curr, prev + x);
        prev = curr;
        curr = next;
    }
    return curr;
}

int main() {
    vector<int> a = {2,7,9,3,1}, b = {1,2,3,1};
    cout << rob(a) << endl;   // 12
    cout << rob(b) << endl;   // 4
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you solve the word break problem?",
    answer: `
**Intuition.** <code>dp[i]</code> answers "can the first <code>i</code> characters be split into dictionary words?" It's true when some earlier split point <code>j</code> is itself breakable (<code>dp[j]</code>) **and** the chunk <code>s[j..i]</code> is a word. Build <code>dp</code> left to right; <code>dp[n]</code> is the answer.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 140" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">dp[i] true if some dp[j] true and s[j..i] is a word</text>
  <g font-size="13" text-anchor="middle" font-family="ui-monospace,monospace">
    <rect x="80" y="50" width="120" height="36" rx="6" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="140" y="74" fill="currentColor">leet</text>
    <rect x="210" y="50" width="120" height="36" rx="6" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="270" y="74" fill="currentColor">code</text>
  </g>
  <text x="140" y="106" fill="#22c55e" font-size="10" text-anchor="middle">dp[4] ✓</text>
  <text x="270" y="106" fill="#22c55e" font-size="10" text-anchor="middle">dp[8] ✓</text>
  <text x="420" y="72" fill="#22c55e" font-size="12" text-anchor="middle">true</text>
</svg>
</div>

### The algorithm
1. Put the dictionary in a hash set; <code>dp[0] = true</code> (empty string).
2. For each end <code>i</code>, scan splits <code>j &lt; i</code>: if <code>dp[j]</code> and <code>s[j..i]</code> is in the set, set <code>dp[i] = true</code> and break.
3. Return <code>dp[n]</code>.

| | Time | Space |
| --- | --- | --- |
| DP + word set | O(n&sup2; &middot; L) | O(n) |

(<code>L</code> = substring/hash cost.) A **trie** can replace the substring lookups, and memoized recursion gives the same complexity top-down.

**Dry run.** <code>leetcode</code>: <code>dp[4]</code> true via "leet", then <code>dp[8]</code> true via <code>dp[4]</code> + "code" → **true**. <code>catsandog</code> dead-ends → **false**.

> **Interview tip:** it's "can it be segmented," not "how many ways" — so a boolean <code>dp</code> with an early break suffices. The natural follow-up, **Word Break II** (return all sentences), needs backtracking/memoization on the actual splits.
`,
    examples: [
      {
        label: "Boolean DP over split points",
        variants: [
          { tech: "python", label: "Python", code: `def word_break(s, word_dict):
    words = set(word_dict)
    n = len(s)
    dp = [False] * (n + 1)
    dp[0] = True
    for i in range(1, n + 1):
        for j in range(i):
            if dp[j] and s[j:i] in words:
                dp[i] = True
                break
    return dp[n]


# --- demo ---
print(word_break('leetcode', ['leet', 'code']))                       # True
print(word_break('applepenapple', ['apple', 'pen']))                  # True
print(word_break('catsandog', ['cats', 'dog', 'sand', 'and', 'cat'])) # False` },
          { tech: "javascript", label: "JavaScript", code: `function wordBreak(s, wordDict) {
  const words = new Set(wordDict);
  const n = s.length;
  const dp = new Array(n + 1).fill(false);
  dp[0] = true;
  for (let i = 1; i <= n; i++) {
    for (let j = 0; j < i; j++) {
      if (dp[j] && words.has(s.slice(j, i))) { dp[i] = true; break; }
    }
  }
  return dp[n];
}

// --- demo ---
console.log(wordBreak('leetcode', ['leet', 'code']));                        // true
console.log(wordBreak('applepenapple', ['apple', 'pen']));                   // true
console.log(wordBreak('catsandog', ['cats', 'dog', 'sand', 'and', 'cat']));  // false` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static boolean wordBreak(String s, List<String> wordDict) {
        Set<String> words = new HashSet<>(wordDict);
        int n = s.length();
        boolean[] dp = new boolean[n + 1];
        dp[0] = true;
        for (int i = 1; i <= n; i++) {
            for (int j = 0; j < i; j++) {
                if (dp[j] && words.contains(s.substring(j, i))) { dp[i] = true; break; }
            }
        }
        return dp[n];
    }

    public static void main(String[] args) {
        System.out.println(wordBreak("leetcode", Arrays.asList("leet", "code")));       // true
        System.out.println(wordBreak("applepenapple", Arrays.asList("apple", "pen")));  // true
        System.out.println(wordBreak("catsandog", Arrays.asList("cats","dog","sand","and","cat"))); // false
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

bool wordBreak(string s, vector<string>& wordDict) {
    unordered_set<string> words(wordDict.begin(), wordDict.end());
    int n = s.size();
    vector<bool> dp(n + 1, false);
    dp[0] = true;
    for (int i = 1; i <= n; i++) {
        for (int j = 0; j < i; j++) {
            if (dp[j] && words.count(s.substr(j, i - j))) { dp[i] = true; break; }
        }
    }
    return dp[n];
}

int main() {
    vector<string> d1 = {"leet", "code"};
    vector<string> d2 = {"apple", "pen"};
    vector<string> d3 = {"cats", "dog", "sand", "and", "cat"};
    cout << boolalpha << wordBreak("leetcode", d1) << endl;       // true
    cout << wordBreak("applepenapple", d2) << endl;              // true
    cout << wordBreak("catsandog", d3) << endl;                  // false
    return 0;
}` },
        ],
      },
    ],
  },
];

export default augments;
