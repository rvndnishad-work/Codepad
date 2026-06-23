/**
 * DSA augment batch 5 — the final 10 questions from dsa-2.json.
 * Richer visuals: several answers use TWO SVGs (concept + step/compare).
 * See dsa-augments.types.ts for the authoring rules (no "${", no raw backticks
 * inside these template literals; inline code uses <code> tags).
 */
import type { DsaAugment } from "./dsa-augments.types";

const augments: DsaAugment[] = [
  {
    title: "How do you do a level-order (BFS) traversal of a tree?",
    answer: `
**Intuition.** Level-order means visiting nodes **top to bottom, left to right** — one full level before the next. A **queue** makes this natural: dequeue a node, process it, enqueue its children. Because children are added behind everything on the current level, they're only reached after the whole level is done.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 190" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">visit order by level: F · B G · A D</text>
  <line x1="250" y1="44" x2="170" y2="96" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="250" y1="44" x2="330" y2="96" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="170" y1="116" x2="120" y2="162" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="170" y1="116" x2="220" y2="162" stroke="currentColor" stroke-opacity="0.3"/>
  <g font-size="14" text-anchor="middle">
    <circle cx="250" cy="36" r="20" fill="#3b82f6" fill-opacity="0.2" stroke="#3b82f6"/><text x="250" y="41" fill="currentColor">F</text>
    <circle cx="170" cy="108" r="20" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="170" y="113" fill="currentColor">B</text>
    <circle cx="330" cy="108" r="20" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="330" y="113" fill="currentColor">G</text>
    <circle cx="120" cy="174" r="18" fill="#f59e0b" fill-opacity="0.2" stroke="#f59e0b"/><text x="120" y="179" fill="currentColor">A</text>
    <circle cx="220" cy="174" r="18" fill="#f59e0b" fill-opacity="0.2" stroke="#f59e0b"/><text x="220" y="179" fill="currentColor">D</text>
  </g>
  <text x="430" y="40" fill="#3b82f6" font-size="11">level 0</text>
  <text x="430" y="112" fill="#22c55e" font-size="11">level 1</text>
  <text x="430" y="178" fill="#f59e0b" font-size="11">level 2</text>
</svg>
</div>

<div style="margin:1rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 120" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="18" fill="currentColor" font-size="12" opacity="0.7">queue over time (front on the left):</text>
  <g font-size="12" text-anchor="middle">
    <text x="44" y="48" fill="currentColor" opacity="0.6" text-anchor="start">[F]</text>
    <text x="44" y="74" fill="currentColor" opacity="0.6" text-anchor="start">dequeue F, enqueue B,G →</text>
    <text x="300" y="74" fill="#22c55e" text-anchor="start">[B, G]</text>
    <text x="44" y="100" fill="currentColor" opacity="0.6" text-anchor="start">dequeue B, enqueue A,D →</text>
    <text x="300" y="100" fill="#f59e0b" text-anchor="start">[G, A, D]</text>
  </g>
</svg>
</div>

### The algorithm
1. Enqueue the root.
2. While the queue isn't empty: dequeue a node, process it, enqueue its non-null children.
3. To group results **by level**, snapshot the queue's size at the start of each round and process exactly that many nodes.

| | Time | Space |
| --- | --- | --- |
| Level-order BFS | O(n) | O(w) — w = max width of the tree |

The space is the widest level, which for a complete tree is ~n/2 leaves — so BFS can use more memory than DFS on bushy trees.

**Dry run.** Queue [F] → pop F, push B,G → [B,G] → pop B, push A,D → [G,A,D] → pop G (no kids) → pop A → pop D. Visit order **F, B, G, A, D**.

> **Interview tip:** the "process queue in size-batches" trick is what turns a flat traversal into a list-of-levels — needed for "level averages", "zigzag order", and "right-side view". Mention BFS's O(width) space vs DFS's O(height).
`,
    examples: [
      {
        label: "Level-order, grouped by level",
        variants: [
          { tech: "python", label: "Python", code: `from collections import deque

class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def level_order(root):
    if not root:
        return []
    levels, q = [], deque([root])
    while q:
        size = len(q)
        level = []
        for _ in range(size):          # one full level
            node = q.popleft()
            level.append(node.val)
            if node.left:  q.append(node.left)
            if node.right: q.append(node.right)
        levels.append(level)
    return levels


# --- demo ---  3 / (9) , (20 / 15,7)
root = TreeNode(3, TreeNode(9), TreeNode(20, TreeNode(15), TreeNode(7)))
print(level_order(root))   # [[3], [9, 20], [15, 7]]` },
          { tech: "javascript", label: "JavaScript", code: `class TreeNode {
  constructor(val, left = null, right = null) {
    this.val = val; this.left = left; this.right = right;
  }
}

function levelOrder(root) {
  if (!root) return [];
  const levels = [], q = [root];
  while (q.length) {
    const size = q.length, level = [];
    for (let i = 0; i < size; i++) {   // one full level
      const node = q.shift();
      level.push(node.val);
      if (node.left)  q.push(node.left);
      if (node.right) q.push(node.right);
    }
    levels.push(level);
  }
  return levels;
}

// --- demo ---
const root = new TreeNode(3, new TreeNode(9),
  new TreeNode(20, new TreeNode(15), new TreeNode(7)));
console.log(JSON.stringify(levelOrder(root))); // [[3],[9,20],[15,7]]` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static class TreeNode {
        int val; TreeNode left, right;
        TreeNode(int val) { this.val = val; }
        TreeNode(int val, TreeNode left, TreeNode right) {
            this.val = val; this.left = left; this.right = right;
        }
    }

    static List<List<Integer>> levelOrder(TreeNode root) {
        List<List<Integer>> levels = new ArrayList<>();
        if (root == null) return levels;
        Queue<TreeNode> q = new LinkedList<>();
        q.offer(root);
        while (!q.isEmpty()) {
            int size = q.size();
            List<Integer> level = new ArrayList<>();
            for (int i = 0; i < size; i++) {   // one full level
                TreeNode node = q.poll();
                level.add(node.val);
                if (node.left != null)  q.offer(node.left);
                if (node.right != null) q.offer(node.right);
            }
            levels.add(level);
        }
        return levels;
    }

    public static void main(String[] args) {
        TreeNode root = new TreeNode(3, new TreeNode(9),
            new TreeNode(20, new TreeNode(15), new TreeNode(7)));
        System.out.println(levelOrder(root)); // [[3], [9, 20], [15, 7]]
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

struct TreeNode {
    int val;
    TreeNode *left = nullptr, *right = nullptr;
    TreeNode(int v) : val(v) {}
    TreeNode(int v, TreeNode* l, TreeNode* r) : val(v), left(l), right(r) {}
};

vector<vector<int>> levelOrder(TreeNode* root) {
    vector<vector<int>> levels;
    if (!root) return levels;
    queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        int size = q.size();
        vector<int> level;
        for (int i = 0; i < size; i++) {   // one full level
            TreeNode* node = q.front(); q.pop();
            level.push_back(node->val);
            if (node->left)  q.push(node->left);
            if (node->right) q.push(node->right);
        }
        levels.push_back(level);
    }
    return levels;
}

int main() {
    TreeNode* root = new TreeNode(3, new TreeNode(9),
        new TreeNode(20, new TreeNode(15), new TreeNode(7)));
    for (auto& lvl : levelOrder(root)) {
        cout << "[";
        for (int x : lvl) cout << x << " ";
        cout << "] ";
    }
    cout << endl;   // [3] [9 20] [15 7]
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you find a duplicate in an array?",
    answer: `
**Intuition.** The approach depends on the constraints. The general tool is a **hash set** (O(n) time, O(n) space). But when the values are bounded in <code>1..n</code>, you can treat the array as a linked list of "value → index" pointers and find the duplicate with **Floyd's cycle detection** in O(1) extra space.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="18" fill="currentColor" font-size="12" opacity="0.7">hash-set scan: store each value, flag a repeat</text>
  <g font-size="13" text-anchor="middle">
    <rect x="20" y="44" width="48" height="38" rx="5" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/><text x="44" y="68" fill="currentColor">1</text>
    <rect x="72" y="44" width="48" height="38" rx="5" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/><text x="96" y="68" fill="currentColor">3</text>
    <rect x="124" y="44" width="48" height="38" rx="5" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/><text x="148" y="68" fill="currentColor">4</text>
    <rect x="176" y="44" width="48" height="38" rx="5" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/><text x="200" y="68" fill="currentColor">2</text>
    <rect x="228" y="44" width="48" height="38" rx="5" fill="#ef4444" fill-opacity="0.2" stroke="#ef4444"/><text x="252" y="68" fill="currentColor">3</text>
  </g>
  <text x="252" y="104" fill="#ef4444" font-size="11" text-anchor="middle">3 already in the set → duplicate</text>
  <g font-size="11">
    <rect x="330" y="44" width="150" height="60" rx="6" fill="#8b5cf6" fill-opacity="0.1" stroke="#8b5cf6"/>
    <text x="405" y="62" fill="currentColor" text-anchor="middle" opacity="0.7">seen = {1, 3, 4, 2}</text>
    <text x="405" y="86" fill="#ef4444" text-anchor="middle">add 3 → already present</text>
  </g>
</svg>
</div>

### Approaches, by constraint
| Constraint | Method | Time | Space |
| --- | --- | --- | --- |
| Any values | **hash set** | O(n) | O(n) |
| Can modify, sorted ok | sort then scan neighbours | O(n log n) | O(1) |
| Values in 1..n, read-only | **Floyd's cycle** on index graph | O(n) | **O(1)** |
| Values in 1..n, can modify | mark seen by negating <code>arr[abs(x)]</code> | O(n) | O(1) |

**The Floyd trick:** with values in <code>1..n</code>, follow <code>i → arr[i]</code> like next-pointers. A duplicate value means two indices point to the same place — a **cycle** — and the cycle's entrance is the duplicate. Same tortoise/hare machinery as linked-list cycle detection.

**Dry run (hash set).** [1,3,4,2,3]: add 1,3,4,2; see 3 again → already in set → return **3**.

> **Interview tip:** *ask about the constraints first.* "Are values bounded? Can I modify the array? Is extra space allowed?" The expected answer flips between a trivial hash set and the clever O(1) Floyd approach based on those — showing you tailor the solution earns big points.
`,
    examples: [
      {
        label: "Hash set + Floyd (1..n)",
        variants: [
          { tech: "python", label: "Python", code: `def find_duplicate_set(nums):
    seen = set()
    for x in nums:
        if x in seen:
            return x
        seen.add(x)
    return -1

# O(1) space, values in 1..n (read-only):
def find_duplicate_floyd(nums):
    slow = fast = nums[0]
    while True:
        slow = nums[slow]
        fast = nums[nums[fast]]
        if slow == fast:
            break
    slow = nums[0]
    while slow != fast:
        slow = nums[slow]
        fast = nums[fast]
    return slow


# --- demo ---
print(find_duplicate_set([1, 3, 4, 2, 3]))     # 3
print(find_duplicate_floyd([1, 3, 4, 2, 2]))   # 2  (values 1..4)` },
          { tech: "javascript", label: "JavaScript", code: `function findDuplicateSet(nums) {
  const seen = new Set();
  for (const x of nums) {
    if (seen.has(x)) return x;
    seen.add(x);
  }
  return -1;
}

// O(1) space, values in 1..n:
function findDuplicateFloyd(nums) {
  let slow = nums[0], fast = nums[0];
  do { slow = nums[slow]; fast = nums[nums[fast]]; } while (slow !== fast);
  slow = nums[0];
  while (slow !== fast) { slow = nums[slow]; fast = nums[fast]; }
  return slow;
}

// --- demo ---
console.log(findDuplicateSet([1, 3, 4, 2, 3]));   // 3
console.log(findDuplicateFloyd([1, 3, 4, 2, 2])); // 2` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static int findDuplicateSet(int[] nums) {
        Set<Integer> seen = new HashSet<>();
        for (int x : nums) {
            if (!seen.add(x)) return x;   // add returns false if present
        }
        return -1;
    }

    // O(1) space, values in 1..n:
    static int findDuplicateFloyd(int[] nums) {
        int slow = nums[0], fast = nums[0];
        do { slow = nums[slow]; fast = nums[nums[fast]]; } while (slow != fast);
        slow = nums[0];
        while (slow != fast) { slow = nums[slow]; fast = nums[fast]; }
        return slow;
    }

    public static void main(String[] args) {
        System.out.println(findDuplicateSet(new int[]{1,3,4,2,3}));   // 3
        System.out.println(findDuplicateFloyd(new int[]{1,3,4,2,2})); // 2
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

int findDuplicateSet(vector<int>& nums) {
    unordered_set<int> seen;
    for (int x : nums) {
        if (!seen.insert(x).second) return x;
    }
    return -1;
}

// O(1) space, values in 1..n:
int findDuplicateFloyd(vector<int>& nums) {
    int slow = nums[0], fast = nums[0];
    do { slow = nums[slow]; fast = nums[nums[fast]]; } while (slow != fast);
    slow = nums[0];
    while (slow != fast) { slow = nums[slow]; fast = nums[fast]; }
    return slow;
}

int main() {
    vector<int> a = {1, 3, 4, 2, 3};
    cout << findDuplicateSet(a) << endl;     // 3
    vector<int> b = {1, 3, 4, 2, 2};
    cout << findDuplicateFloyd(b) << endl;   // 2
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "When would you use BFS over Dijkstra for shortest paths?",
    answer: `
**Intuition.** Both find shortest paths, but they're optimised for different graphs. **BFS** assumes every edge costs the same (it counts *hops*), so it's pure O(V+E). **Dijkstra** handles *weighted* edges with a priority queue, paying an extra log factor. On an unweighted graph, BFS gives the same answer faster and simpler.

<div style="margin:1.25rem auto;max-width:540px;display:flex;gap:10px;flex-wrap:wrap">
<div style="flex:1 1 220px;border:1px solid rgba(59,130,246,0.3);border-radius:14px;padding:12px;background:rgba(59,130,246,0.05)">
<svg viewBox="0 0 240 170" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="120" y="16" fill="#3b82f6" font-size="12" font-weight="700" text-anchor="middle">Unweighted → BFS</text>
  <line x1="50" y1="60" x2="120" y2="40" stroke="currentColor" stroke-opacity="0.35"/>
  <line x1="50" y1="60" x2="120" y2="100" stroke="currentColor" stroke-opacity="0.35"/>
  <line x1="120" y1="40" x2="190" y2="80" stroke="currentColor" stroke-opacity="0.35"/>
  <line x1="120" y1="100" x2="190" y2="80" stroke="currentColor" stroke-opacity="0.35"/>
  <g font-size="12" text-anchor="middle">
    <circle cx="50" cy="60" r="18" fill="#3b82f6" fill-opacity="0.2" stroke="#3b82f6"/><text x="50" y="65" fill="currentColor">S</text>
    <circle cx="120" cy="40" r="18" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="120" y="45" fill="currentColor">A</text>
    <circle cx="120" cy="100" r="18" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="120" y="105" fill="currentColor">B</text>
    <circle cx="190" cy="80" r="18" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="190" y="85" fill="currentColor">T</text>
  </g>
  <text x="120" y="150" fill="currentColor" font-size="10" text-anchor="middle" opacity="0.65">all edges = 1 hop</text>
  <text x="120" y="164" fill="#3b82f6" font-size="10" text-anchor="middle">O(V+E)</text>
</svg>
</div>
<div style="flex:1 1 220px;border:1px solid rgba(245,158,11,0.3);border-radius:14px;padding:12px;background:rgba(245,158,11,0.05)">
<svg viewBox="0 0 240 170" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="120" y="16" fill="#f59e0b" font-size="12" font-weight="700" text-anchor="middle">Weighted → Dijkstra</text>
  <line x1="50" y1="60" x2="120" y2="40" stroke="currentColor" stroke-opacity="0.35"/><text x="78" y="42" fill="currentColor" font-size="10">7</text>
  <line x1="50" y1="60" x2="120" y2="100" stroke="currentColor" stroke-opacity="0.35"/><text x="78" y="92" fill="currentColor" font-size="10">1</text>
  <line x1="120" y1="40" x2="190" y2="80" stroke="currentColor" stroke-opacity="0.35"/><text x="162" y="50" fill="currentColor" font-size="10">2</text>
  <line x1="120" y1="100" x2="190" y2="80" stroke="currentColor" stroke-opacity="0.35"/><text x="162" y="100" fill="currentColor" font-size="10">3</text>
  <g font-size="12" text-anchor="middle">
    <circle cx="50" cy="60" r="18" fill="#f59e0b" fill-opacity="0.2" stroke="#f59e0b"/><text x="50" y="65" fill="currentColor">S</text>
    <circle cx="120" cy="40" r="18" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/><text x="120" y="45" fill="currentColor">A</text>
    <circle cx="120" cy="100" r="18" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/><text x="120" y="105" fill="currentColor">B</text>
    <circle cx="190" cy="80" r="18" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/><text x="190" y="85" fill="currentColor">T</text>
  </g>
  <text x="120" y="150" fill="currentColor" font-size="10" text-anchor="middle" opacity="0.65">S→B→T = 4 beats S→A→T = 9</text>
  <text x="120" y="164" fill="#f59e0b" font-size="10" text-anchor="middle">O((V+E) log V)</text>
</svg>
</div>
</div>

### Decision guide
| Graph | Use | Why |
| --- | --- | --- |
| Unweighted / all-equal weights | **BFS** | shortest = fewest edges; no heap needed → O(V+E) |
| Non-negative weights | **Dijkstra** | greedily finalize the closest node via a min-heap |
| Weights only 0 or 1 | **0-1 BFS** (deque) | push 0-edges front, 1-edges back → O(V+E) |
| Negative weights | **Bellman-Ford** | Dijkstra breaks; also detects negative cycles |

The core reason BFS works unweighted: it reaches nodes in **non-decreasing distance order** automatically, so the first time you see a node is via a shortest path. With varied weights that's no longer true — a longer-hop path can be cheaper — which is exactly why Dijkstra needs the priority queue.

**Dry run.** Unweighted S–A–B–T: BFS finds S→A→T = 2 hops instantly. Weighted (right): BFS would wrongly pick the 2-hop S→A→T (cost 9); Dijkstra correctly finds S→B→T (cost 4).

> **Interview tip:** lead with the one-liner — "**unweighted → BFS, weighted non-negative → Dijkstra, negative → Bellman-Ford**." Bonus credit for mentioning **0-1 BFS** with a deque, the in-between case interviewers rarely expect.
`,
    examples: [
      {
        label: "BFS shortest path (unweighted)",
        variants: [
          { tech: "python", label: "Python", code: `from collections import deque

def bfs_shortest(graph, src, dst):
    q = deque([(src, 0)])
    seen = {src}
    while q:
        node, dist = q.popleft()
        if node == dst:
            return dist
        for nb in graph[node]:
            if nb not in seen:
                seen.add(nb)
                q.append((nb, dist + 1))
    return -1


# --- demo ---  unweighted graph
graph = {0: [1, 2], 1: [0, 3], 2: [0, 3], 3: [1, 2, 4], 4: [3]}
print(bfs_shortest(graph, 0, 4))   # 3` },
          { tech: "javascript", label: "JavaScript", code: `function bfsShortest(graph, src, dst) {
  const q = [[src, 0]];
  const seen = new Set([src]);
  for (let i = 0; i < q.length; i++) {
    const [node, dist] = q[i];
    if (node === dst) return dist;
    for (const nb of graph[node]) {
      if (!seen.has(nb)) { seen.add(nb); q.push([nb, dist + 1]); }
    }
  }
  return -1;
}

// --- demo ---
const graph = { 0: [1, 2], 1: [0, 3], 2: [0, 3], 3: [1, 2, 4], 4: [3] };
console.log(bfsShortest(graph, 0, 4)); // 3` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static int bfsShortest(Map<Integer,List<Integer>> graph, int src, int dst) {
        Queue<int[]> q = new LinkedList<>();
        q.offer(new int[]{src, 0});
        Set<Integer> seen = new HashSet<>(List.of(src));
        while (!q.isEmpty()) {
            int[] cur = q.poll();
            if (cur[0] == dst) return cur[1];
            for (int nb : graph.getOrDefault(cur[0], List.of())) {
                if (seen.add(nb)) q.offer(new int[]{nb, cur[1] + 1});
            }
        }
        return -1;
    }

    public static void main(String[] args) {
        Map<Integer,List<Integer>> g = new HashMap<>();
        g.put(0, List.of(1,2)); g.put(1, List.of(0,3)); g.put(2, List.of(0,3));
        g.put(3, List.of(1,2,4)); g.put(4, List.of(3));
        System.out.println(bfsShortest(g, 0, 4)); // 3
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

int bfsShortest(vector<vector<int>>& graph, int src, int dst) {
    queue<pair<int,int>> q;
    q.push({src, 0});
    unordered_set<int> seen{src};
    while (!q.empty()) {
        auto [node, dist] = q.front(); q.pop();
        if (node == dst) return dist;
        for (int nb : graph[node])
            if (seen.insert(nb).second) q.push({nb, dist + 1});
    }
    return -1;
}

int main() {
    vector<vector<int>> g = {{1,2},{0,3},{0,3},{1,2,4},{3}};
    cout << bfsShortest(g, 0, 4) << endl;   // 3
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you count the number of set bits in an integer?",
    answer: `
**Intuition.** A "set bit" is a 1 in the binary representation (also called the population count, or *popcount*). The slick trick is <code>n &amp; (n - 1)</code>, which clears the **lowest** set bit each time — so you loop exactly as many times as there are 1s, not 32.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 110" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace,monospace">
  <text x="14" y="18" fill="currentColor" font-size="12" opacity="0.7" font-family="ui-sans-serif,system-ui">12 = 1100 (two 1s)</text>
  <g font-size="16" text-anchor="middle">
    <rect x="120" y="34" width="36" height="40" rx="4" fill="#22c55e" fill-opacity="0.25" stroke="#22c55e"/><text x="138" y="60" fill="currentColor">1</text>
    <rect x="156" y="34" width="36" height="40" rx="4" fill="#22c55e" fill-opacity="0.25" stroke="#22c55e"/><text x="174" y="60" fill="currentColor">1</text>
    <rect x="192" y="34" width="36" height="40" rx="4" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/><text x="210" y="60" fill="currentColor" opacity="0.5">0</text>
    <rect x="228" y="34" width="36" height="40" rx="4" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/><text x="246" y="60" fill="currentColor" opacity="0.5">0</text>
  </g>
  <text x="138" y="96" fill="#f59e0b" font-size="10" text-anchor="middle" font-family="ui-sans-serif,system-ui">8</text>
  <text x="174" y="96" fill="#f59e0b" font-size="10" text-anchor="middle" font-family="ui-sans-serif,system-ui">4</text>
</svg>
</div>

<div style="margin:1rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 130" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace,monospace">
  <text x="14" y="18" fill="currentColor" font-size="12" opacity="0.7" font-family="ui-sans-serif,system-ui">n &amp; (n-1) clears the lowest 1 each step</text>
  <g font-size="13">
    <text x="30" y="46" fill="currentColor">1100  &amp;  1011  =  1000</text>
    <text x="330" y="46" fill="#22c55e" font-family="ui-sans-serif,system-ui" font-size="12">count = 1</text>
    <text x="30" y="78" fill="currentColor">1000  &amp;  0111  =  0000</text>
    <text x="330" y="78" fill="#22c55e" font-family="ui-sans-serif,system-ui" font-size="12">count = 2</text>
    <text x="30" y="110" fill="#f59e0b" font-family="ui-sans-serif,system-ui" font-size="12">n is 0 → stop. answer = 2</text>
  </g>
</svg>
</div>

### Three ways
| Method | Cost |
| --- | --- |
| Check each bit (<code>n &amp; 1</code>, shift) | O(32) — fixed 32/64 iterations |
| **Brian Kernighan** (<code>n &amp;= n - 1</code>) | O(number of set bits) |
| Builtin popcount | O(1) hardware instruction |

Why <code>n &amp; (n-1)</code> works: subtracting 1 flips the lowest set bit to 0 and turns all the zeros below it into 1s; ANDing with the original clears exactly that lowest bit and leaves the rest untouched.

**Dry run (n = 12 = 1100).** 1100 & 1011 = 1000 (count 1). 1000 & 0111 = 0000 (count 2). n is 0 → stop → **2**.

> **Interview tip:** in real code use the builtin — Python <code>bin(n).count('1')</code> or <code>int.bit_count()</code>, Java <code>Integer.bitCount</code>, C++ <code>__builtin_popcount</code>. But know Kernighan's trick, because the follow-up "count bits for every number 0..n" uses DP: <code>bits[i] = bits[i &gt;&gt; 1] + (i &amp; 1)</code>.
`,
    examples: [
      {
        label: "Brian Kernighan's algorithm",
        variants: [
          { tech: "python", label: "Python", code: `def count_bits(n):
    count = 0
    while n:
        n &= n - 1      # clear the lowest set bit
        count += 1
    return count


# --- demo ---  (builtin: bin(n).count('1') or n.bit_count())
print(count_bits(12))   # 2  (1100)
print(count_bits(7))    # 3  (0111)` },
          { tech: "javascript", label: "JavaScript", code: `function countBits(n) {
  let count = 0;
  while (n) {
    n &= n - 1;        // clear the lowest set bit
    count++;
  }
  return count;
}

// --- demo ---
console.log(countBits(12)); // 2
console.log(countBits(7));  // 3` },
          { tech: "java", label: "Java", code: `public class Main {
    static int countBits(int n) {
        int count = 0;
        while (n != 0) {
            n &= n - 1;     // clear the lowest set bit
            count++;
        }
        return count;       // builtin: Integer.bitCount(n)
    }

    public static void main(String[] args) {
        System.out.println(countBits(12)); // 2
        System.out.println(countBits(7));  // 3
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

int countBits(int n) {
    int count = 0;
    while (n) {
        n &= n - 1;     // clear the lowest set bit
        count++;
    }
    return count;       // builtin: __builtin_popcount(n)
}

int main() {
    cout << countBits(12) << endl;   // 2
    cout << countBits(7) << endl;    // 3
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you compute the GCD of two numbers?",
    answer: `
**Intuition.** The greatest common divisor is found by **Euclid's algorithm**: <code>gcd(a, b) = gcd(b, a mod b)</code>, repeating until the remainder is 0 — then the other number is the GCD. It works because any common divisor of <code>a</code> and <code>b</code> also divides <code>a mod b</code>.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 140" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="18" fill="currentColor" font-size="12" opacity="0.7">gcd(48, 18): replace with (b, a mod b) until b = 0</text>
  <g font-size="13" text-anchor="middle">
    <rect x="30" y="40" width="120" height="34" rx="6" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="90" y="62" fill="currentColor">gcd(48, 18)</text>
    <rect x="200" y="40" width="120" height="34" rx="6" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="260" y="62" fill="currentColor">gcd(18, 12)</text>
    <rect x="370" y="40" width="120" height="34" rx="6" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="430" y="62" fill="currentColor">gcd(12, 6)</text>
    <rect x="200" y="92" width="120" height="34" rx="6" fill="#22c55e" fill-opacity="0.22" stroke="#22c55e"/><text x="260" y="114" fill="currentColor">gcd(6, 0) = 6</text>
  </g>
  <line x1="150" y1="57" x2="200" y2="57" stroke="#f59e0b" stroke-width="2" marker-end="url(#g)"/>
  <line x1="320" y1="57" x2="370" y2="57" stroke="#f59e0b" stroke-width="2" marker-end="url(#g)"/>
  <path d="M430,74 Q360,92 322,104" fill="none" stroke="#f59e0b" stroke-width="2" marker-end="url(#g)"/>
  <text x="175" y="50" fill="currentColor" font-size="9" text-anchor="middle">48%18=12</text>
  <text x="345" y="50" fill="currentColor" font-size="9" text-anchor="middle">18%12=6</text>
  <defs><marker id="g" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#f59e0b"/></marker></defs>
</svg>
</div>

### The algorithm
1. While <code>b != 0</code>: set <code>(a, b) = (b, a mod b)</code>.
2. When <code>b</code> reaches 0, <code>a</code> is the GCD.

| | Time | Space |
| --- | --- | --- |
| Euclid (iterative) | O(log min(a, b)) | O(1) |
| Recursive | O(log min(a, b)) | O(log) stack |

The number of steps is logarithmic — it shrinks fast because the remainder is always less than half the larger value within two steps.

**LCM for free:** <code>lcm(a, b) = a / gcd(a, b) * b</code> (divide first to avoid overflow).

**Dry run.** gcd(48,18) → gcd(18, 48%18=12) → gcd(12, 18%12=6) → gcd(6, 12%6=0) → **6**.

> **Interview tip:** prefer the **mod** form over the slower repeated-subtraction version. Know the LCM relationship and the divide-before-multiply ordering — overflow on <code>a*b</code> is a subtle bug interviewers like to probe.
`,
    examples: [
      {
        label: "Euclid's algorithm + LCM",
        variants: [
          { tech: "python", label: "Python", code: `def gcd(a, b):
    while b:
        a, b = b, a % b
    return a

def lcm(a, b):
    return a // gcd(a, b) * b      # divide first to avoid overflow


# --- demo ---  (stdlib: math.gcd, math.lcm)
print(gcd(48, 18))   # 6
print(lcm(4, 6))     # 12` },
          { tech: "javascript", label: "JavaScript", code: `function gcd(a, b) {
  while (b) [a, b] = [b, a % b];
  return a;
}

function lcm(a, b) {
  return (a / gcd(a, b)) * b;      // divide first to avoid overflow
}

// --- demo ---
console.log(gcd(48, 18)); // 6
console.log(lcm(4, 6));   // 12` },
          { tech: "java", label: "Java", code: `public class Main {
    static int gcd(int a, int b) {
        while (b != 0) {
            int t = b;
            b = a % b;
            a = t;
        }
        return a;
    }

    static long lcm(int a, int b) {
        return (long) a / gcd(a, b) * b; // divide first to avoid overflow
    }

    public static void main(String[] args) {
        System.out.println(gcd(48, 18)); // 6
        System.out.println(lcm(4, 6));   // 12
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

int gcd_(int a, int b) {
    while (b) { int t = b; b = a % b; a = t; }
    return a;
}

long long lcm_(int a, int b) {
    return (long long) a / gcd_(a, b) * b; // divide first
}

int main() {
    cout << gcd_(48, 18) << endl;   // 6
    cout << lcm_(4, 6) << endl;     // 12
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How does the Sieve of Eratosthenes work?",
    answer: `
**Intuition.** To find every prime up to <code>n</code>, don't test each number for primality. Instead, start at 2 and **cross out all its multiples**, then the next uncrossed number (3), cross out its multiples, and so on. Whatever survives unmarked is prime.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 170" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">cross multiples of 2 (red), then 3 (amber); primes stay green</text>
  <g font-size="13" text-anchor="middle">
    <!-- row: 2..11 -->
    <g>
      <rect x="20" y="34" width="44" height="34" rx="5" fill="#22c55e" fill-opacity="0.22" stroke="#22c55e"/><text x="42" y="56" fill="currentColor">2</text>
      <rect x="68" y="34" width="44" height="34" rx="5" fill="#22c55e" fill-opacity="0.22" stroke="#22c55e"/><text x="90" y="56" fill="currentColor">3</text>
      <rect x="116" y="34" width="44" height="34" rx="5" fill="#ef4444" fill-opacity="0.18" stroke="#ef4444"/><text x="138" y="56" fill="currentColor" opacity="0.6">4</text>
      <rect x="164" y="34" width="44" height="34" rx="5" fill="#22c55e" fill-opacity="0.22" stroke="#22c55e"/><text x="186" y="56" fill="currentColor">5</text>
      <rect x="212" y="34" width="44" height="34" rx="5" fill="#ef4444" fill-opacity="0.18" stroke="#ef4444"/><text x="234" y="56" fill="currentColor" opacity="0.6">6</text>
      <rect x="260" y="34" width="44" height="34" rx="5" fill="#22c55e" fill-opacity="0.22" stroke="#22c55e"/><text x="282" y="56" fill="currentColor">7</text>
      <rect x="308" y="34" width="44" height="34" rx="5" fill="#ef4444" fill-opacity="0.18" stroke="#ef4444"/><text x="330" y="56" fill="currentColor" opacity="0.6">8</text>
      <rect x="356" y="34" width="44" height="34" rx="5" fill="#f59e0b" fill-opacity="0.2" stroke="#f59e0b"/><text x="378" y="56" fill="currentColor" opacity="0.6">9</text>
      <rect x="404" y="34" width="44" height="34" rx="5" fill="#ef4444" fill-opacity="0.18" stroke="#ef4444"/><text x="426" y="56" fill="currentColor" opacity="0.6">10</text>
      <rect x="452" y="34" width="44" height="34" rx="5" fill="#22c55e" fill-opacity="0.22" stroke="#22c55e"/><text x="474" y="56" fill="currentColor">11</text>
    </g>
  </g>
  <text x="20" y="100" fill="#22c55e" font-size="12" text-anchor="start">primes ≤ 11: 2, 3, 5, 7, 11</text>
  <text x="20" y="124" fill="currentColor" font-size="11" text-anchor="start" opacity="0.7">start crossing from p·p (smaller multiples already marked)</text>
</svg>
</div>

### The algorithm
1. Make a boolean array <code>isPrime[0..n]</code>, all true; mark 0 and 1 false.
2. For each <code>p</code> from 2 while <code>p·p ≤ n</code>: if <code>p</code> is still prime, mark <code>p·p, p·p+p, p·p+2p, …</code> as composite.
3. Indices still true are prime.

| | Time | Space |
| --- | --- | --- |
| Sieve | **O(n log log n)** | O(n) |
| Trial-divide each number | O(n √n) | O(1) |

Two key optimisations: stop the outer loop at <code>√n</code> (any composite has a factor ≤ its square root), and start marking from <code>p·p</code> (smaller multiples like <code>2p, 3p</code> were already crossed by smaller primes).

**Dry run (n = 11).** p=2: cross 4,6,8,10. p=3: cross 9 (start at 3·3). 3·3=9 ≤ 11, but next prime 5 has 25 &gt; 11 → stop. Survivors: **2, 3, 5, 7, 11**.

> **Interview tip:** mention both optimisations (start at <code>p·p</code>, loop to <code>√n</code>) — they're what make it efficient and are easy to forget. For huge ranges or memory limits, name the **segmented sieve**.
`,
    examples: [
      {
        label: "Sieve of Eratosthenes",
        variants: [
          { tech: "python", label: "Python", code: `def sieve(n):
    is_prime = [True] * (n + 1)
    is_prime[0] = is_prime[1] = False
    p = 2
    while p * p <= n:
        if is_prime[p]:
            for multiple in range(p * p, n + 1, p):
                is_prime[multiple] = False
        p += 1
    return [i for i in range(2, n + 1) if is_prime[i]]


# --- demo ---
print(sieve(30))   # [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]` },
          { tech: "javascript", label: "JavaScript", code: `function sieve(n) {
  const isPrime = new Array(n + 1).fill(true);
  isPrime[0] = isPrime[1] = false;
  for (let p = 2; p * p <= n; p++) {
    if (isPrime[p]) {
      for (let m = p * p; m <= n; m += p) isPrime[m] = false;
    }
  }
  const primes = [];
  for (let i = 2; i <= n; i++) if (isPrime[i]) primes.push(i);
  return primes;
}

// --- demo ---
console.log(sieve(30)); // [2,3,5,7,11,13,17,19,23,29]` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static List<Integer> sieve(int n) {
        boolean[] isPrime = new boolean[n + 1];
        Arrays.fill(isPrime, true);
        isPrime[0] = isPrime[1] = false;
        for (int p = 2; (long) p * p <= n; p++) {
            if (isPrime[p]) {
                for (int m = p * p; m <= n; m += p) isPrime[m] = false;
            }
        }
        List<Integer> primes = new ArrayList<>();
        for (int i = 2; i <= n; i++) if (isPrime[i]) primes.add(i);
        return primes;
    }

    public static void main(String[] args) {
        System.out.println(sieve(30)); // [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

vector<int> sieve(int n) {
    vector<bool> isPrime(n + 1, true);
    isPrime[0] = isPrime[1] = false;
    for (int p = 2; (long long) p * p <= n; p++) {
        if (isPrime[p]) {
            for (int m = p * p; m <= n; m += p) isPrime[m] = false;
        }
    }
    vector<int> primes;
    for (int i = 2; i <= n; i++) if (isPrime[i]) primes.push_back(i);
    return primes;
}

int main() {
    for (int p : sieve(30)) cout << p << " ";
    cout << endl;   // 2 3 5 7 11 13 17 19 23 29
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "What is amortized analysis?",
    answer: `
**Intuition.** Amortized analysis asks for the *average* cost of an operation **over a sequence**, not the worst single call. Some operations are occasionally expensive but rare enough that, spread out, each one is cheap. The classic example: appending to a **dynamic array** is O(1) amortized even though some appends trigger an O(n) resize.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 160" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">push cost: mostly 1, occasional spike when capacity doubles</text>
  <line x1="30" y1="120" x2="500" y2="120" stroke="currentColor" stroke-opacity="0.3"/>
  <g>
    <rect x="40" y="108" width="20" height="12" fill="#22c55e" fill-opacity="0.5"/>
    <rect x="66" y="92" width="20" height="28" fill="#ef4444" fill-opacity="0.5"/>
    <rect x="92" y="108" width="20" height="12" fill="#22c55e" fill-opacity="0.5"/>
    <rect x="118" y="76" width="20" height="44" fill="#ef4444" fill-opacity="0.5"/>
    <rect x="144" y="108" width="20" height="12" fill="#22c55e" fill-opacity="0.5"/>
    <rect x="170" y="108" width="20" height="12" fill="#22c55e" fill-opacity="0.5"/>
    <rect x="196" y="108" width="20" height="12" fill="#22c55e" fill-opacity="0.5"/>
    <rect x="222" y="52" width="20" height="68" fill="#ef4444" fill-opacity="0.5"/>
    <rect x="248" y="108" width="20" height="12" fill="#22c55e" fill-opacity="0.5"/>
    <rect x="274" y="108" width="20" height="12" fill="#22c55e" fill-opacity="0.5"/>
  </g>
  <line x1="40" y1="100" x2="300" y2="100" stroke="#3b82f6" stroke-width="2" stroke-dasharray="5 4"/>
  <text x="320" y="104" fill="#3b82f6" font-size="11">average ≈ 2 = O(1)</text>
  <text x="118" y="70" fill="#ef4444" font-size="10" text-anchor="middle">resize</text>
  <text x="222" y="46" fill="#ef4444" font-size="10" text-anchor="middle">resize</text>
</svg>
</div>

### Three ways to do the analysis
| Method | Idea |
| --- | --- |
| **Aggregate** | total cost of n operations ÷ n |
| **Accounting** | charge cheap ops a little extra to "prepay" for future expensive ones |
| **Potential** | track a potential function that releases energy on costly ops |

**Why dynamic-array append is O(1) amortized.** When the array fills, it doubles its capacity and copies everything (O(n)). But that copy happens after n cheap O(1) pushes, so the n + (n copies) total work over ~n operations averages to a **constant** per push. Doubling (not adding a fixed amount) is the key — it makes resizes exponentially rare.

**Amortized vs average-case.** Amortized is a *guarantee over any sequence* (no probability involved); average-case depends on the input distribution. They're different claims.

**Other amortized-O(1) examples:** hash table insert (with resizing), the two-stack queue, Union-Find with path compression, incrementing a binary counter.

> **Interview tip:** when you claim "amortized O(1)", be ready to justify it — usually the "each element is touched a constant number of times across all operations" argument. Distinguish it from worst-case (a single op can still be O(n)) and from average-case (no randomness assumed).
`,
    examples: [
      {
        label: "Dynamic array with doubling",
        variants: [
          { tech: "python", label: "Python", code: `class DynamicArray:
    def __init__(self):
        self.data = [None]
        self.size = 0

    def push(self, x):
        if self.size == len(self.data):    # full -> O(n) resize, but rare
            new = [None] * (2 * len(self.data))
            for i in range(self.size):
                new[i] = self.data[i]
            self.data = new
        self.data[self.size] = x           # O(1) amortized
        self.size += 1


# --- demo ---  5 pushes trigger resizes at cap 1,2,4 -> still O(1) amortized
arr = DynamicArray()
for x in range(5): arr.push(x)
print(arr.size, arr.data[:arr.size])   # 5 [0, 1, 2, 3, 4]` },
          { tech: "javascript", label: "JavaScript", code: `class DynamicArray {
  constructor() { this.data = new Array(1); this.size = 0; }

  push(x) {
    if (this.size === this.data.length) {  // full -> O(n) resize, rare
      const next = new Array(2 * this.data.length);
      for (let i = 0; i < this.size; i++) next[i] = this.data[i];
      this.data = next;
    }
    this.data[this.size++] = x;            // O(1) amortized
  }
}

// --- demo ---
const arr = new DynamicArray();
for (let x = 0; x < 5; x++) arr.push(x);
console.log(arr.size, arr.data.slice(0, arr.size)); // 5 [0, 1, 2, 3, 4]` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        DynamicArray arr = new DynamicArray();
        for (int x = 0; x < 5; x++) arr.push(x);
        System.out.println(arr.size() + " " + arr.snapshot()); // 5 [0, 1, 2, 3, 4]
    }
}

class DynamicArray {
    private int[] data = new int[1];
    private int size = 0;

    void push(int x) {
        if (size == data.length) {         // full -> O(n) resize, rare
            int[] next = new int[2 * data.length];
            System.arraycopy(data, 0, next, 0, size);
            data = next;
        }
        data[size++] = x;                  // O(1) amortized
    }

    int size() { return size; }
    String snapshot() { return Arrays.toString(Arrays.copyOf(data, size)); }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

// std::vector already gives amortized O(1) push_back via doubling.
struct DynamicArray {
    int* data;
    int size = 0, cap = 1;
    DynamicArray() { data = new int[cap]; }

    void push(int x) {
        if (size == cap) {                 // full -> O(n) resize, rare
            cap *= 2;
            int* next = new int[cap];
            for (int i = 0; i < size; i++) next[i] = data[i];
            delete[] data;
            data = next;
        }
        data[size++] = x;                  // O(1) amortized
    }
};

int main() {
    DynamicArray arr;
    for (int x = 0; x < 5; x++) arr.push(x);
    cout << arr.size << ": ";
    for (int i = 0; i < arr.size; i++) cout << arr.data[i] << " ";
    cout << endl;   // 5: 0 1 2 3 4
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you find the top K frequent elements?",
    answer: `
**Intuition.** First **count frequencies** with a hash map. Then you only need the K most frequent — not a full sort. A **min-heap of size K** keeps the running top-K in O(n log k); even better, **bucket sort by frequency** gets you O(n) because a frequency can't exceed the array length.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 130" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">[1,1,1,2,2,3], k=2 → count, then take top 2</text>
  <g font-size="12" text-anchor="middle">
    <rect x="40" y="34" width="120" height="30" rx="5" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="100" y="54" fill="currentColor">1 → freq 3</text>
    <rect x="40" y="68" width="120" height="30" rx="5" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="100" y="88" fill="currentColor">2 → freq 2</text>
    <rect x="40" y="102" width="120" height="22" rx="5" fill="#ef4444" fill-opacity="0.12" stroke="#ef4444" stroke-opacity="0.5"/><text x="100" y="118" fill="currentColor" opacity="0.6" font-size="11">3 → freq 1 (drop)</text>
  </g>
  <text x="220" y="50" fill="currentColor" font-size="11" text-anchor="start" opacity="0.7">heap of size k keeps</text>
  <text x="220" y="68" fill="currentColor" font-size="11" text-anchor="start" opacity="0.7">the 2 highest counts</text>
  <text x="220" y="100" fill="#22c55e" font-size="12" text-anchor="start">answer = [1, 2]</text>
</svg>
</div>

### Three approaches
| Approach | Time | Space |
| --- | --- | --- |
| Count + full sort by frequency | O(n log n) | O(n) |
| Count + **min-heap of size k** | **O(n log k)** | O(n) |
| Count + **bucket sort** by frequency | **O(n)** | O(n) |
| Count + **quickselect** on frequencies | O(n) average | O(n) |

**Min-heap method:** push each (count, element) and pop the smallest whenever the heap exceeds size k — the survivors are the k most frequent. Beats a full sort when k ≪ n.

**Bucket-sort method:** make buckets indexed by frequency (0..n); place each element in <code>bucket[its count]</code>; read buckets from the high end until you've collected k. Linear, because frequencies are bounded by n.

**Dry run.** [1,1,1,2,2,3] → counts {1:3, 2:2, 3:1}. Heap of size 2 keeps {1:3, 2:2}, drops 3 → top-2 = **[1, 2]**.

> **Interview tip:** start with "count with a hash map", then offer the heap (O(n log k)) and note bucket sort gives O(n) since counts are bounded. Naming the O(n) bucket approach when the interviewer pushes for "better than n log k" is the strong finish.
`,
    examples: [
      {
        label: "Heap + bucket sort",
        variants: [
          { tech: "python", label: "Python", code: `from collections import Counter
import heapq

def top_k_frequent(nums, k):
    counts = Counter(nums)
    # O(n log k) with a heap:
    return heapq.nlargest(k, counts.keys(), key=counts.get)

def top_k_bucket(nums, k):
    counts = Counter(nums)
    buckets = [[] for _ in range(len(nums) + 1)]
    for val, freq in counts.items():
        buckets[freq].append(val)
    result = []
    for freq in range(len(buckets) - 1, 0, -1):
        for val in buckets[freq]:
            result.append(val)
            if len(result) == k:
                return result
    return result


# --- demo ---
print(top_k_frequent([1, 1, 1, 2, 2, 3], 2))   # [1, 2]
print(top_k_bucket([1, 1, 1, 2, 2, 3], 2))     # [1, 2]` },
          { tech: "javascript", label: "JavaScript", code: `function topKFrequent(nums, k) {
  const counts = new Map();
  for (const n of nums) counts.set(n, (counts.get(n) || 0) + 1);

  // bucket sort by frequency -> O(n)
  const buckets = Array.from({ length: nums.length + 1 }, () => []);
  for (const [val, freq] of counts) buckets[freq].push(val);

  const result = [];
  for (let f = buckets.length - 1; f > 0 && result.length < k; f--) {
    for (const val of buckets[f]) {
      result.push(val);
      if (result.length === k) return result;
    }
  }
  return result;
}

// --- demo ---
console.log(topKFrequent([1, 1, 1, 2, 2, 3], 2)); // [1, 2]` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static int[] topKFrequent(int[] nums, int k) {
        Map<Integer,Integer> counts = new HashMap<>();
        for (int n : nums) counts.merge(n, 1, Integer::sum);

        // min-heap of size k -> O(n log k)
        PriorityQueue<Integer> heap =
            new PriorityQueue<>((a, b) -> counts.get(a) - counts.get(b));
        for (int key : counts.keySet()) {
            heap.offer(key);
            if (heap.size() > k) heap.poll();
        }
        int[] out = new int[k];
        for (int i = k - 1; i >= 0; i--) out[i] = heap.poll();
        return out;
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(
            topKFrequent(new int[]{1,1,1,2,2,3}, 2))); // [1, 2]
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

vector<int> topKFrequent(vector<int>& nums, int k) {
    unordered_map<int,int> counts;
    for (int n : nums) counts[n]++;

    // min-heap of size k -> O(n log k)
    auto cmp = [&](int a, int b){ return counts[a] > counts[b]; };
    priority_queue<int, vector<int>, decltype(cmp)> heap(cmp);
    for (auto& [val, freq] : counts) {
        heap.push(val);
        if ((int)heap.size() > k) heap.pop();
    }
    vector<int> out;
    while (!heap.empty()) { out.push_back(heap.top()); heap.pop(); }
    reverse(out.begin(), out.end());   // most frequent first
    return out;
}

int main() {
    vector<int> nums = {1, 1, 1, 2, 2, 3};
    for (int x : topKFrequent(nums, 2)) cout << x << " ";
    cout << endl;   // 1 2
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "What is the time complexity of common operations on arrays, hash maps, and balanced trees?",
    answer: `
**Intuition.** Each structure optimises something different: arrays for **indexed access**, hash maps for **average-constant lookup**, balanced trees for **ordered** operations. Choosing well starts with knowing these costs cold.

<div style="margin:1.25rem auto;max-width:540px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
<div style="flex:1 1 150px;border:1px solid rgba(59,130,246,0.3);border-radius:12px;padding:10px;background:rgba(59,130,246,0.05);text-align:center">
<svg viewBox="0 0 160 90" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="80" y="16" fill="#3b82f6" font-size="12" font-weight="700" text-anchor="middle">Array</text>
  <g font-size="11" text-anchor="middle">
    <rect x="14" y="34" width="30" height="26" fill="#3b82f6" fill-opacity="0.18" stroke="#3b82f6"/>
    <rect x="44" y="34" width="30" height="26" fill="#3b82f6" fill-opacity="0.18" stroke="#3b82f6"/>
    <rect x="74" y="34" width="30" height="26" fill="#3b82f6" fill-opacity="0.18" stroke="#3b82f6"/>
    <rect x="104" y="34" width="30" height="26" fill="#3b82f6" fill-opacity="0.18" stroke="#3b82f6"/>
  </g>
  <text x="80" y="78" fill="currentColor" font-size="10" text-anchor="middle" opacity="0.7">index = O(1)</text>
</svg>
</div>
<div style="flex:1 1 150px;border:1px solid rgba(139,92,246,0.3);border-radius:12px;padding:10px;background:rgba(139,92,246,0.05);text-align:center">
<svg viewBox="0 0 160 90" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="80" y="16" fill="#8b5cf6" font-size="12" font-weight="700" text-anchor="middle">Hash map</text>
  <g font-size="11" text-anchor="middle">
    <circle cx="40" cy="46" r="14" fill="#8b5cf6" fill-opacity="0.18" stroke="#8b5cf6"/><text x="40" y="50" fill="currentColor">k</text>
    <text x="68" y="50" fill="#f59e0b" font-size="14">→</text>
    <rect x="88" y="34" width="58" height="24" fill="#8b5cf6" fill-opacity="0.18" stroke="#8b5cf6"/><text x="117" y="50" fill="currentColor">bucket</text>
  </g>
  <text x="80" y="78" fill="currentColor" font-size="10" text-anchor="middle" opacity="0.7">lookup = O(1) avg</text>
</svg>
</div>
<div style="flex:1 1 150px;border:1px solid rgba(34,197,94,0.3);border-radius:12px;padding:10px;background:rgba(34,197,94,0.05);text-align:center">
<svg viewBox="0 0 160 90" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="80" y="16" fill="#22c55e" font-size="12" font-weight="700" text-anchor="middle">Balanced BST</text>
  <line x1="80" y1="36" x2="58" y2="58" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="80" y1="36" x2="102" y2="58" stroke="currentColor" stroke-opacity="0.3"/>
  <circle cx="80" cy="32" r="9" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/>
  <circle cx="56" cy="62" r="9" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/>
  <circle cx="104" cy="62" r="9" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/>
  <text x="80" y="86" fill="currentColor" font-size="10" text-anchor="middle" opacity="0.7">search = O(log n)</text>
</svg>
</div>
</div>

### The cheat sheet
| Operation | Array | Hash map | Balanced BST |
| --- | --- | --- | --- |
| Access by index | **O(1)** | n/a | n/a |
| Search by key/value | O(n) | **O(1)** avg, O(n) worst | O(log n) |
| Insert | O(n) (shift) / O(1) amort. at end | **O(1)** avg | O(log n) |
| Delete | O(n) (shift) | **O(1)** avg | O(log n) |
| Min / max | O(n) | O(n) | **O(log n)** |
| Ordered traversal | O(n) (if sorted) | O(n log n) (must sort) | **O(n)** in-order |
| Range / successor query | O(log n) if sorted (binary search) | **not supported** | **O(log n)** |

### When to pick which
- **Array** — known indices, tight iteration, cache-friendly scans.
- **Hash map** — fast membership / key→value, *no* ordering needed.
- **Balanced BST** (Red-Black/AVL; Java <code>TreeMap</code>, C++ <code>std::map</code>) — you need **sorted order**, range queries, or successor/predecessor.

The decisive difference: a hash map is faster on average but **loses ordering** — it can't do "next-larger key" or a range scan, which a balanced tree does in O(log n).

> **Interview tip:** the trade-off to verbalise is **hash map O(1) but unordered vs balanced tree O(log n) but ordered**. Also flag hash maps' O(n) *worst case* (bad hash/collisions) — saying only "O(1)" without that caveat is the usual miss.
`,
    examples: [
      {
        label: "Picking the right structure",
        variants: [
          { tech: "python", label: "Python", code: `import bisect

# Array / list: O(1) index, O(n) search
arr = [10, 20, 30]
print(arr[1])              # 20    O(1)
print(20 in arr)           # True  O(n)

# dict (hash map): O(1) average lookup, unordered
seen = {"a": 1, "b": 2}
print(seen["a"])           # 1     O(1) avg

# Ordered / range queries: Python has no built-in BST; a sorted list
# + bisect gives O(log n) search. (3rd-party: sortedcontainers.SortedDict)
keys = [1, 3, 5]
print(keys[bisect.bisect_left(keys, 3)])   # 3   search/successor, O(log n)` },
          { tech: "javascript", label: "JavaScript", code: `// Array: O(1) index, O(n) search
const arr = [10, 20, 30];
console.log(arr[1]);           // 20   O(1)
console.log(arr.includes(20)); // true O(n)

// Map (hash map): O(1) average, preserves insertion order only
const m = new Map([["a", 1], ["b", 2]]);
console.log(m.get("a"));       // 1    O(1) avg

// JS has no built-in balanced BST; for ordered/range queries
// you implement one or use a library (e.g. a sorted structure).` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        int[] arr = {10, 20, 30};
        System.out.println(arr[1]);             // 20  O(1)

        Map<String,Integer> hash = new HashMap<>();
        hash.put("a", 1);
        System.out.println(hash.get("a"));      // 1   O(1) avg, unordered

        // Balanced BST (Red-Black): ordered + range/successor in O(log n)
        TreeMap<Integer,String> tree = new TreeMap<>();
        tree.put(5, "e"); tree.put(1, "a");
        System.out.println(tree.firstKey());    // 1   min, O(log n)
        System.out.println(tree.ceilingKey(3)); // 5   successor, O(log n)
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

int main() {
    vector<int> arr = {10, 20, 30};
    cout << arr[1] << endl;                  // 20  O(1)

    unordered_map<string,int> hash;          // O(1) avg, unordered
    hash["a"] = 1;
    cout << hash["a"] << endl;               // 1

    map<int,string> tree;                    // Red-Black tree: ordered
    tree[5] = "e"; tree[1] = "a";
    cout << tree.begin()->first << endl;     // 1   min, O(log n)
    cout << tree.lower_bound(3)->first << endl; // 5  successor, O(log n)
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you merge two sorted arrays?",
    answer: `
**Intuition.** Because both inputs are already sorted, you never need to re-sort — just **walk two pointers** in parallel and always take the smaller current element. This is the *merge* step of merge sort, and it runs in **O(m + n)**.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 170" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">compare heads, take the smaller, advance that pointer</text>
  <g font-size="13" text-anchor="middle">
    <rect x="30" y="34" width="44" height="32" rx="5" fill="#3b82f6" fill-opacity="0.18" stroke="#3b82f6"/><text x="52" y="56" fill="currentColor">1</text>
    <rect x="78" y="34" width="44" height="32" rx="5" fill="#3b82f6" fill-opacity="0.18" stroke="#3b82f6"/><text x="100" y="56" fill="currentColor">3</text>
    <rect x="126" y="34" width="44" height="32" rx="5" fill="#3b82f6" fill-opacity="0.18" stroke="#3b82f6"/><text x="148" y="56" fill="currentColor">5</text>
    <text x="14" y="56" fill="#3b82f6" font-size="11" text-anchor="start">A</text>

    <rect x="30" y="74" width="44" height="32" rx="5" fill="#8b5cf6" fill-opacity="0.18" stroke="#8b5cf6"/><text x="52" y="96" fill="currentColor">2</text>
    <rect x="78" y="74" width="44" height="32" rx="5" fill="#8b5cf6" fill-opacity="0.18" stroke="#8b5cf6"/><text x="100" y="96" fill="currentColor">4</text>
    <rect x="126" y="74" width="44" height="32" rx="5" fill="#8b5cf6" fill-opacity="0.18" stroke="#8b5cf6"/><text x="148" y="96" fill="currentColor">6</text>
    <text x="14" y="96" fill="#8b5cf6" font-size="11" text-anchor="start">B</text>
  </g>
  <g font-size="13" text-anchor="middle">
    <rect x="220" y="54" width="40" height="32" rx="5" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="240" y="76" fill="currentColor">1</text>
    <rect x="262" y="54" width="40" height="32" rx="5" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="282" y="76" fill="currentColor">2</text>
    <rect x="304" y="54" width="40" height="32" rx="5" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="324" y="76" fill="currentColor">3</text>
    <rect x="346" y="54" width="40" height="32" rx="5" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="366" y="76" fill="currentColor">4</text>
    <rect x="388" y="54" width="40" height="32" rx="5" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="408" y="76" fill="currentColor">5</text>
    <rect x="430" y="54" width="40" height="32" rx="5" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="450" y="76" fill="currentColor">6</text>
  </g>
  <text x="345" y="116" fill="#22c55e" font-size="11" text-anchor="middle">merged, still sorted</text>
  <text x="190" y="76" fill="#f59e0b" font-size="16">→</text>
</svg>
</div>

### The algorithm
1. Pointers <code>i = 0</code> (A), <code>j = 0</code> (B), empty result.
2. While both have elements: append the smaller of <code>A[i]</code>/<code>B[j]</code> and advance that pointer.
3. Append whatever remains in the non-empty array.

| | Time | Space |
| --- | --- | --- |
| Two-pointer merge | O(m + n) | O(m + n) output |
| Concatenate + sort | O((m+n) log(m+n)) | O(m+n) |

**The in-place twist (LeetCode 88).** When A has trailing space for B's elements, merge **from the back** — fill the largest elements first so you never overwrite an unread value. That gives O(1) extra space.

**Dry run.** A=[1,3,5], B=[2,4,6]: take 1(A), 2(B), 3(A), 4(B), 5(A), 6(B) → **[1,2,3,4,5,6]**.

> **Interview tip:** mention the **merge-from-the-back** technique for the in-place version — it's the specific trick interviewers want and avoids the O(n) shifting that front-to-back in-place merging would cause.
`,
    examples: [
      {
        label: "Two-pointer merge",
        variants: [
          { tech: "python", label: "Python", code: `def merge_sorted(a, b):
    i = j = 0
    out = []
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            out.append(a[i]); i += 1
        else:
            out.append(b[j]); j += 1
    out.extend(a[i:])
    out.extend(b[j:])
    return out


# --- demo ---
print(merge_sorted([1, 3, 5], [2, 4, 6]))   # [1, 2, 3, 4, 5, 6]` },
          { tech: "javascript", label: "JavaScript", code: `function mergeSorted(a, b) {
  let i = 0, j = 0;
  const out = [];
  while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) out.push(a[i++]);
    else out.push(b[j++]);
  }
  while (i < a.length) out.push(a[i++]);
  while (j < b.length) out.push(b[j++]);
  return out;
}

// --- demo ---
console.log(mergeSorted([1, 3, 5], [2, 4, 6])); // [1, 2, 3, 4, 5, 6]` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static int[] mergeSorted(int[] a, int[] b) {
        int[] out = new int[a.length + b.length];
        int i = 0, j = 0, k = 0;
        while (i < a.length && j < b.length) {
            if (a[i] <= b[j]) out[k++] = a[i++];
            else out[k++] = b[j++];
        }
        while (i < a.length) out[k++] = a[i++];
        while (j < b.length) out[k++] = b[j++];
        return out;
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(
            mergeSorted(new int[]{1,3,5}, new int[]{2,4,6}))); // [1, 2, 3, 4, 5, 6]
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

vector<int> mergeSorted(vector<int>& a, vector<int>& b) {
    vector<int> out;
    out.reserve(a.size() + b.size());
    size_t i = 0, j = 0;
    while (i < a.size() && j < b.size()) {
        if (a[i] <= b[j]) out.push_back(a[i++]);
        else out.push_back(b[j++]);
    }
    while (i < a.size()) out.push_back(a[i++]);
    while (j < b.size()) out.push_back(b[j++]);
    return out;
}

int main() {
    vector<int> a = {1, 3, 5}, b = {2, 4, 6};
    for (int x : mergeSorted(a, b)) cout << x << " ";
    cout << endl;   // 1 2 3 4 5 6
    return 0;
}` },
        ],
      },
    ],
  },
];

export default augments;
