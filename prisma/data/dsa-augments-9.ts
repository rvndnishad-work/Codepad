/**
 * DSA augment batch 9 — dsa-4.json items 6-15: trees (kth-smallest, path sum,
 * build-from-traversals, right-side view) + graphs (clone, course schedule,
 * connected components, word ladder, bipartite, Bellman-Ford).
 * See dsa-augments.types.ts for the authoring rules (no "${", no raw backticks
 * inside these template literals; inline code uses <code> tags). Every code
 * variant is a COMPLETE RUNNABLE PROGRAM.
 */
import type { DsaAugment } from "./dsa-augments.types";

const augments: DsaAugment[] = [
  {
    title: "How do you find the kth smallest element in a BST?",
    answer: `
**Intuition.** An **in-order traversal** of a BST visits nodes in **sorted order** (left → node → right). So the kth node you visit is the kth smallest — you don't need to traverse the whole tree, just stop the moment the counter hits <code>k</code>.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 175" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">in-order visit order is sorted: 1,2,3,… → stop at k</text>
  <line x1="250" y1="44" x2="170" y2="84" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="250" y1="44" x2="340" y2="84" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="170" y1="104" x2="120" y2="142" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="170" y1="104" x2="220" y2="142" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="120" y1="158" x2="95" y2="158" stroke="currentColor" stroke-opacity="0"/>
  <g font-size="13" text-anchor="middle">
    <circle cx="250" cy="36" r="17" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="250" y="41" fill="currentColor">5</text>
    <circle cx="170" cy="94" r="17" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="170" y="99" fill="currentColor">3</text>
    <circle cx="340" cy="94" r="17" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="340" y="99" fill="currentColor">6</text>
    <circle cx="120" cy="152" r="15" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="120" y="157" fill="currentColor">2</text>
    <circle cx="220" cy="152" r="17" fill="#22c55e" fill-opacity="0.25" stroke="#22c55e"/><text x="220" y="157" fill="currentColor">4</text>
  </g>
  <text x="430" y="60" fill="currentColor" font-size="11" opacity="0.7">in-order:</text>
  <text x="430" y="80" fill="#22c55e" font-size="12" font-family="ui-monospace,monospace">2,3,4,5,6</text>
  <text x="430" y="104" fill="#22c55e" font-size="11">k=3 → 4</text>
</svg>
</div>

### The algorithm
1. Walk the tree in-order with an explicit stack: push all left children, pop, count.
2. Each pop is the next-smallest value; decrement <code>k</code>.
3. When <code>k</code> reaches 0, that popped node is the answer — return early.

| Approach | Time | Space |
| --- | --- | --- |
| Iterative in-order, early stop | O(h + k) | O(h) stack |
| Augment nodes with subtree size | O(h) per query | O(n) extra |

For **repeated** queries, store each node's left-subtree size so you can descend straight to the kth element in O(h).

**Dry run (k=3).** In-order pops 2, then 3, then 4 — at the third pop <code>k</code> hits 0 → answer **4**.

> **Interview tip:** lead with "in-order of a BST is sorted" — that one sentence frames the whole solution. Mention the subtree-size augmentation if the interviewer asks about many repeated queries.
`,
    examples: [
      {
        label: "Iterative in-order, early stop",
        variants: [
          { tech: "python", label: "Python", code: `class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def kth_smallest(root, k):
    stack = []
    node = root
    while stack or node:
        while node:                 # dive to the smallest
            stack.append(node)
            node = node.left
        node = stack.pop()
        k -= 1
        if k == 0:
            return node.val
        node = node.right           # then the right subtree
    return None


# --- demo ---
root = TreeNode(5,
    TreeNode(3, TreeNode(2), TreeNode(4)),
    TreeNode(6))
print(kth_smallest(root, 3))   # 4` },
          { tech: "javascript", label: "JavaScript", code: `class TreeNode {
  constructor(val, left = null, right = null) { this.val = val; this.left = left; this.right = right; }
}

function kthSmallest(root, k) {
  const stack = [];
  let node = root;
  while (stack.length || node) {
    while (node) { stack.push(node); node = node.left; }
    node = stack.pop();
    if (--k === 0) return node.val;
    node = node.right;
  }
  return null;
}

// --- demo ---
const root = new TreeNode(5,
  new TreeNode(3, new TreeNode(2), new TreeNode(4)),
  new TreeNode(6));
console.log(kthSmallest(root, 3)); // 4` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static class TreeNode {
        int val; TreeNode left, right;
        TreeNode(int val) { this.val = val; }
        TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
    }

    static int kthSmallest(TreeNode root, int k) {
        Deque<TreeNode> stack = new ArrayDeque<>();
        TreeNode node = root;
        while (!stack.isEmpty() || node != null) {
            while (node != null) { stack.push(node); node = node.left; }
            node = stack.pop();
            if (--k == 0) return node.val;
            node = node.right;
        }
        return -1;
    }

    public static void main(String[] args) {
        TreeNode root = new TreeNode(5,
            new TreeNode(3, new TreeNode(2), new TreeNode(4)),
            new TreeNode(6));
        System.out.println(kthSmallest(root, 3));   // 4
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

struct TreeNode {
    int val;
    TreeNode* left = nullptr;
    TreeNode* right = nullptr;
    TreeNode(int v) : val(v) {}
    TreeNode(int v, TreeNode* l, TreeNode* r) : val(v), left(l), right(r) {}
};

int kthSmallest(TreeNode* root, int k) {
    stack<TreeNode*> st;
    TreeNode* node = root;
    while (!st.empty() || node) {
        while (node) { st.push(node); node = node->left; }
        node = st.top(); st.pop();
        if (--k == 0) return node->val;
        node = node->right;
    }
    return -1;
}

int main() {
    TreeNode* root = new TreeNode(5,
        new TreeNode(3, new TreeNode(2), new TreeNode(4)),
        new TreeNode(6));
    cout << kthSmallest(root, 3) << endl;   // 4
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you check if a root-to-leaf path sums to a target?",
    answer: `
**Intuition.** Carry the target *down* the tree, **subtracting** each node's value as you descend. The question "does some root-to-leaf path sum to <code>T</code>?" becomes "at this child, does some path sum to <code>T − node.val</code>?" — a smaller version of the same problem. Success means hitting a **leaf** where the remaining target equals the leaf's value.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 175" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">target 20: subtract down → leaf reaches 0 along 5→4→11</text>
  <line x1="250" y1="44" x2="170" y2="86" stroke="#22c55e" stroke-width="2.5"/>
  <line x1="250" y1="44" x2="340" y2="86" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="170" y1="106" x2="130" y2="146" stroke="#22c55e" stroke-width="2.5"/>
  <g font-size="13" text-anchor="middle">
    <circle cx="250" cy="36" r="18" fill="#3b82f6" fill-opacity="0.18" stroke="#3b82f6"/><text x="250" y="41" fill="currentColor">5</text>
    <circle cx="170" cy="96" r="18" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="170" y="101" fill="currentColor">4</text>
    <circle cx="340" cy="96" r="18" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="340" y="101" fill="currentColor">8</text>
    <circle cx="130" cy="156" r="16" fill="#22c55e" fill-opacity="0.25" stroke="#22c55e"/><text x="130" y="161" fill="currentColor">11</text>
  </g>
  <g font-size="10" fill="currentColor" opacity="0.6" text-anchor="middle">
    <text x="290" y="34">need 20</text>
    <text x="205" y="92">need 15</text>
    <text x="95" y="150">need 11 ✓</text>
  </g>
</svg>
</div>

### The algorithm
1. Null node → false.
2. **Leaf** (no children) → return <code>target == node.val</code>.
3. Otherwise recurse into either child with <code>target − node.val</code>; succeed if *any* branch does.

| | Time | Space |
| --- | --- | --- |
| DFS with running remainder | O(n) | O(h) recursion |

The leaf check matters: a path must end at a leaf, so you can't declare success at an internal node even if the remainder hits 0 there.

**Dry run (target 20).** 5 → remainder 15 → 4 → remainder 11 → leaf 11 equals 11 → **true**. The 8 branch needs 15 at a leaf and fails.

> **Interview tip:** the subtle bug is treating an internal node whose remainder is 0 as success — only **leaves** count. The natural follow-up "Path Sum II" asks for every qualifying path, which adds backtracking on a running list.
`,
    examples: [
      {
        label: "DFS subtracting the target",
        variants: [
          { tech: "python", label: "Python", code: `class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def has_path_sum(root, target):
    if not root:
        return False
    if not root.left and not root.right:    # leaf
        return target == root.val
    rest = target - root.val
    return has_path_sum(root.left, rest) or has_path_sum(root.right, rest)


# --- demo ---
root = TreeNode(5, TreeNode(4, TreeNode(11)), TreeNode(8))
print(has_path_sum(root, 20))   # True   (5 -> 4 -> 11)
print(has_path_sum(root, 21))   # False` },
          { tech: "javascript", label: "JavaScript", code: `class TreeNode {
  constructor(val, left = null, right = null) { this.val = val; this.left = left; this.right = right; }
}

function hasPathSum(root, target) {
  if (!root) return false;
  if (!root.left && !root.right) return target === root.val;  // leaf
  const rest = target - root.val;
  return hasPathSum(root.left, rest) || hasPathSum(root.right, rest);
}

// --- demo ---
const root = new TreeNode(5, new TreeNode(4, new TreeNode(11)), new TreeNode(8));
console.log(hasPathSum(root, 20)); // true
console.log(hasPathSum(root, 21)); // false` },
          { tech: "java", label: "Java", code: `public class Main {
    static class TreeNode {
        int val; TreeNode left, right;
        TreeNode(int val) { this.val = val; }
        TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
    }

    static boolean hasPathSum(TreeNode root, int target) {
        if (root == null) return false;
        if (root.left == null && root.right == null) return target == root.val;
        int rest = target - root.val;
        return hasPathSum(root.left, rest) || hasPathSum(root.right, rest);
    }

    public static void main(String[] args) {
        TreeNode root = new TreeNode(5,
            new TreeNode(4, new TreeNode(11), null),
            new TreeNode(8));
        System.out.println(hasPathSum(root, 20)); // true
        System.out.println(hasPathSum(root, 21)); // false
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

struct TreeNode {
    int val;
    TreeNode* left = nullptr;
    TreeNode* right = nullptr;
    TreeNode(int v) : val(v) {}
    TreeNode(int v, TreeNode* l, TreeNode* r) : val(v), left(l), right(r) {}
};

bool hasPathSum(TreeNode* root, int target) {
    if (!root) return false;
    if (!root->left && !root->right) return target == root->val;
    int rest = target - root->val;
    return hasPathSum(root->left, rest) || hasPathSum(root->right, rest);
}

int main() {
    TreeNode* root = new TreeNode(5,
        new TreeNode(4, new TreeNode(11), nullptr),
        new TreeNode(8));
    cout << boolalpha << hasPathSum(root, 20) << endl; // true
    cout << hasPathSum(root, 21) << endl;              // false
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you build a binary tree from preorder and inorder traversals?",
    answer: `
**Intuition.** **Preorder** gives you roots in the order root-first; **inorder** tells you, for any root, which values fall to its left vs its right. So: take the next preorder value as the current root, locate it in inorder to split the remaining values into left and right halves, and recurse.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 165" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">preorder[0]=3 is root; split inorder around it</text>
  <text x="20" y="44" fill="currentColor" font-size="12" font-family="ui-monospace,monospace">preorder: <tspan fill="#ef4444">3</tspan> 9 20 15 7</text>
  <text x="20" y="66" fill="currentColor" font-size="12" font-family="ui-monospace,monospace">inorder:  <tspan fill="#3b82f6">9</tspan> <tspan fill="#ef4444">3</tspan> <tspan fill="#22c55e">15 20 7</tspan></text>
  <text x="20" y="86" fill="#3b82f6" font-size="10">left = 9</text>
  <text x="120" y="86" fill="#22c55e" font-size="10">right = 15,20,7</text>
  <line x1="380" y1="40" x2="330" y2="78" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="380" y1="40" x2="430" y2="78" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="430" y1="98" x2="400" y2="132" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="430" y1="98" x2="460" y2="132" stroke="currentColor" stroke-opacity="0.3"/>
  <g font-size="12" text-anchor="middle">
    <circle cx="380" cy="34" r="15" fill="#ef4444" fill-opacity="0.16" stroke="#ef4444"/><text x="380" y="39" fill="currentColor">3</text>
    <circle cx="330" cy="88" r="14" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="330" y="93" fill="currentColor">9</text>
    <circle cx="430" cy="88" r="14" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="430" y="93" fill="currentColor">20</text>
    <circle cx="400" cy="142" r="13" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="400" y="147" fill="currentColor">15</text>
    <circle cx="460" cy="142" r="13" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="460" y="147" fill="currentColor">7</text>
  </g>
</svg>
</div>

### The algorithm
1. Build a hashmap <code>value → index</code> for inorder (O(1) splits).
2. Keep a moving preorder pointer; the value it points to is the next root.
3. Find that root in inorder to know the left subtree's size; recurse left then right.

| Approach | Time | Space |
| --- | --- | --- |
| Hashmap + preorder pointer | O(n) | O(n) |
| Scan inorder each time | O(n&sup2;) | O(n) |

The hashmap is what turns the naive O(n&sup2;) (re-scanning inorder for every root) into a clean linear solve.

**Dry run.** Root 3 (preorder[0]); inorder splits into left <code>[9]</code> and right <code>[15,20,7]</code>. Recurse: next preorder 9 builds the left leaf, then 20 becomes the right child with 15 and 7 under it.

> **Interview tip:** state the two roles up front — "preorder orders the roots, inorder partitions left/right" — then mention the hashmap optimization. Preorder+postorder alone can't uniquely rebuild a tree; you need inorder (or null markers).
`,
    examples: [
      {
        label: "Preorder pointer + inorder index map",
        variants: [
          { tech: "python", label: "Python", code: `class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def build_tree(preorder, inorder):
    idx = {v: i for i, v in enumerate(inorder)}
    pos = [0]
    def build(lo, hi):
        if lo > hi:
            return None
        root_val = preorder[pos[0]]
        pos[0] += 1
        node = TreeNode(root_val)
        mid = idx[root_val]
        node.left = build(lo, mid - 1)
        node.right = build(mid + 1, hi)
        return node
    return build(0, len(inorder) - 1)


# --- demo ---  rebuild, then re-emit preorder to confirm round-trip
def preorder_of(node, out):
    if node:
        out.append(node.val)
        preorder_of(node.left, out)
        preorder_of(node.right, out)
    return out

tree = build_tree([3, 9, 20, 15, 7], [9, 3, 15, 20, 7])
print(preorder_of(tree, []))   # [3, 9, 20, 15, 7]` },
          { tech: "javascript", label: "JavaScript", code: `class TreeNode {
  constructor(val, left = null, right = null) { this.val = val; this.left = left; this.right = right; }
}

function buildTree(preorder, inorder) {
  const idx = new Map(inorder.map((v, i) => [v, i]));
  let pos = 0;
  function build(lo, hi) {
    if (lo > hi) return null;
    const rootVal = preorder[pos++];
    const node = new TreeNode(rootVal);
    const mid = idx.get(rootVal);
    node.left = build(lo, mid - 1);
    node.right = build(mid + 1, hi);
    return node;
  }
  return build(0, inorder.length - 1);
}

// --- demo ---  rebuild, then re-emit preorder to confirm round-trip
function preorderOf(node, out) {
  if (node) { out.push(node.val); preorderOf(node.left, out); preorderOf(node.right, out); }
  return out;
}
const tree = buildTree([3, 9, 20, 15, 7], [9, 3, 15, 20, 7]);
console.log(preorderOf(tree, [])); // [3, 9, 20, 15, 7]` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static class TreeNode {
        int val; TreeNode left, right;
        TreeNode(int val) { this.val = val; }
    }

    static int pos = 0;
    static Map<Integer, Integer> idx = new HashMap<>();

    static TreeNode buildTree(int[] preorder, int[] inorder) {
        pos = 0; idx.clear();
        for (int i = 0; i < inorder.length; i++) idx.put(inorder[i], i);
        return build(preorder, 0, inorder.length - 1);
    }
    static TreeNode build(int[] preorder, int lo, int hi) {
        if (lo > hi) return null;
        int rootVal = preorder[pos++];
        TreeNode node = new TreeNode(rootVal);
        int mid = idx.get(rootVal);
        node.left = build(preorder, lo, mid - 1);
        node.right = build(preorder, mid + 1, hi);
        return node;
    }

    static void preorderOf(TreeNode node, List<Integer> out) {
        if (node == null) return;
        out.add(node.val);
        preorderOf(node.left, out);
        preorderOf(node.right, out);
    }

    public static void main(String[] args) {
        TreeNode tree = buildTree(new int[]{3,9,20,15,7}, new int[]{9,3,15,20,7});
        List<Integer> out = new ArrayList<>();
        preorderOf(tree, out);
        System.out.println(out);   // [3, 9, 20, 15, 7]
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

struct TreeNode {
    int val;
    TreeNode* left = nullptr;
    TreeNode* right = nullptr;
    TreeNode(int v) : val(v) {}
};

int pos = 0;
unordered_map<int,int> idx;

TreeNode* build(vector<int>& preorder, int lo, int hi) {
    if (lo > hi) return nullptr;
    int rootVal = preorder[pos++];
    TreeNode* node = new TreeNode(rootVal);
    int mid = idx[rootVal];
    node->left = build(preorder, lo, mid - 1);
    node->right = build(preorder, mid + 1, hi);
    return node;
}
TreeNode* buildTree(vector<int>& preorder, vector<int>& inorder) {
    pos = 0; idx.clear();
    for (int i = 0; i < (int)inorder.size(); i++) idx[inorder[i]] = i;
    return build(preorder, 0, (int)inorder.size() - 1);
}

void preorderOf(TreeNode* node, vector<int>& out) {
    if (!node) return;
    out.push_back(node->val);
    preorderOf(node->left, out);
    preorderOf(node->right, out);
}

int main() {
    vector<int> pre = {3,9,20,15,7}, ino = {9,3,15,20,7};
    TreeNode* tree = buildTree(pre, ino);
    vector<int> out;
    preorderOf(tree, out);
    for (int v : out) cout << v << " ";
    cout << endl;   // 3 9 20 15 7
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you get the right-side view of a binary tree?",
    answer: `
**Intuition.** Standing to the right of the tree, you see exactly the **last node of each level**. A level-order BFS processes the tree one level at a time, so capturing the last node dequeued per level gives the right-side view directly.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 175" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">last node of each level (green) is what the right eye sees</text>
  <line x1="220" y1="44" x2="150" y2="86" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="220" y1="44" x2="300" y2="86" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="150" y1="106" x2="190" y2="142" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="300" y1="106" x2="330" y2="142" stroke="currentColor" stroke-opacity="0.3"/>
  <g font-size="13" text-anchor="middle">
    <circle cx="220" cy="36" r="17" fill="#22c55e" fill-opacity="0.25" stroke="#22c55e"/><text x="220" y="41" fill="currentColor">1</text>
    <circle cx="150" cy="96" r="17" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="150" y="101" fill="currentColor">2</text>
    <circle cx="300" cy="96" r="17" fill="#22c55e" fill-opacity="0.25" stroke="#22c55e"/><text x="300" y="101" fill="currentColor">3</text>
    <circle cx="190" cy="152" r="15" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="190" y="157" fill="currentColor">5</text>
    <circle cx="330" cy="152" r="15" fill="#22c55e" fill-opacity="0.25" stroke="#22c55e"/><text x="330" y="157" fill="currentColor">4</text>
  </g>
  <g opacity="0.7"><path d="M470,40 L470,150" stroke="#22c55e" stroke-dasharray="3 3"/><text x="478" y="48" fill="#22c55e" font-size="9">eye</text></g>
  <text x="430" y="100" fill="#22c55e" font-size="12" text-anchor="middle">[1,3,4]</text>
</svg>
</div>

### The algorithm
1. BFS level by level with a queue; record the level's size <code>n</code>.
2. Dequeue <code>n</code> nodes; the one at index <code>n − 1</code> is the rightmost — append it.
3. Enqueue children left-then-right so order within a level is preserved.

| Approach | Time | Space |
| --- | --- | --- |
| BFS, last per level | O(n) | O(w) queue |
| DFS right-first, first per depth | O(n) | O(h) recursion |

The DFS variant visits **right before left** and records a node only the first time it reaches a new depth — equivalent result, recursion instead of a queue.

**Dry run.** Level 0 → [1] → take 1. Level 1 → [2,3] → take 3. Level 2 → [5,4] → take 4. Result **[1, 3, 4]**.

> **Interview tip:** clarify it's the *rightmost per level*, not "the right spine" — a left child can be visible if the right subtree is shorter. Both BFS-last and DFS-right-first are clean; pick whichever you can code without bugs.
`,
    examples: [
      {
        label: "Level-order BFS, last per level",
        variants: [
          { tech: "python", label: "Python", code: `from collections import deque

class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def right_side_view(root):
    if not root:
        return []
    view, q = [], deque([root])
    while q:
        n = len(q)
        for i in range(n):
            node = q.popleft()
            if i == n - 1:              # last node of this level
                view.append(node.val)
            if node.left: q.append(node.left)
            if node.right: q.append(node.right)
    return view


# --- demo ---
root = TreeNode(1, TreeNode(2, None, TreeNode(5)), TreeNode(3, None, TreeNode(4)))
print(right_side_view(root))   # [1, 3, 4]` },
          { tech: "javascript", label: "JavaScript", code: `class TreeNode {
  constructor(val, left = null, right = null) { this.val = val; this.left = left; this.right = right; }
}

function rightSideView(root) {
  if (!root) return [];
  const view = [], q = [root];
  while (q.length) {
    const n = q.length;
    for (let i = 0; i < n; i++) {
      const node = q.shift();
      if (i === n - 1) view.push(node.val);   // last node of this level
      if (node.left) q.push(node.left);
      if (node.right) q.push(node.right);
    }
  }
  return view;
}

// --- demo ---
const root = new TreeNode(1, new TreeNode(2, null, new TreeNode(5)), new TreeNode(3, null, new TreeNode(4)));
console.log(rightSideView(root)); // [1, 3, 4]` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static class TreeNode {
        int val; TreeNode left, right;
        TreeNode(int val) { this.val = val; }
        TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
    }

    static List<Integer> rightSideView(TreeNode root) {
        List<Integer> view = new ArrayList<>();
        if (root == null) return view;
        Queue<TreeNode> q = new LinkedList<>();
        q.add(root);
        while (!q.isEmpty()) {
            int n = q.size();
            for (int i = 0; i < n; i++) {
                TreeNode node = q.poll();
                if (i == n - 1) view.add(node.val);
                if (node.left != null) q.add(node.left);
                if (node.right != null) q.add(node.right);
            }
        }
        return view;
    }

    public static void main(String[] args) {
        TreeNode root = new TreeNode(1,
            new TreeNode(2, null, new TreeNode(5)),
            new TreeNode(3, null, new TreeNode(4)));
        System.out.println(rightSideView(root));   // [1, 3, 4]
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

struct TreeNode {
    int val;
    TreeNode* left = nullptr;
    TreeNode* right = nullptr;
    TreeNode(int v) : val(v) {}
    TreeNode(int v, TreeNode* l, TreeNode* r) : val(v), left(l), right(r) {}
};

vector<int> rightSideView(TreeNode* root) {
    vector<int> view;
    if (!root) return view;
    queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        int n = q.size();
        for (int i = 0; i < n; i++) {
            TreeNode* node = q.front(); q.pop();
            if (i == n - 1) view.push_back(node->val);
            if (node->left) q.push(node->left);
            if (node->right) q.push(node->right);
        }
    }
    return view;
}

int main() {
    TreeNode* root = new TreeNode(1,
        new TreeNode(2, nullptr, new TreeNode(5)),
        new TreeNode(3, nullptr, new TreeNode(4)));
    for (int v : rightSideView(root)) cout << v << " ";
    cout << endl;   // 1 3 4
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you clone a graph?",
    answer: `
**Intuition.** A deep copy means every node and every edge is duplicated, with the clones wired to *clones* (never the originals). The trick that handles **cycles and shared neighbors** is a hash map <code>original → clone</code>: before recursing into a neighbor, check the map so each node is cloned exactly once.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 160" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">map original→clone makes each node copied once (handles cycles)</text>
  <g font-size="12" text-anchor="middle">
    <circle cx="70" cy="60" r="16" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="70" y="65" fill="currentColor">1</text>
    <circle cx="160" cy="60" r="16" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="160" y="65" fill="currentColor">2</text>
    <circle cx="70" cy="125" r="16" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="70" y="130" fill="currentColor">4</text>
    <circle cx="160" cy="125" r="16" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="160" y="130" fill="currentColor">3</text>
  </g>
  <line x1="86" y1="60" x2="144" y2="60" stroke="currentColor" stroke-opacity="0.35"/>
  <line x1="70" y1="76" x2="70" y2="109" stroke="currentColor" stroke-opacity="0.35"/>
  <line x1="160" y1="76" x2="160" y2="109" stroke="currentColor" stroke-opacity="0.35"/>
  <line x1="86" y1="125" x2="144" y2="125" stroke="currentColor" stroke-opacity="0.35"/>
  <text x="250" y="95" fill="#f59e0b" font-size="20">→</text>
  <g font-size="12" text-anchor="middle">
    <circle cx="350" cy="60" r="16" fill="#22c55e" fill-opacity="0.22" stroke="#22c55e"/><text x="350" y="65" fill="currentColor">1'</text>
    <circle cx="440" cy="60" r="16" fill="#22c55e" fill-opacity="0.22" stroke="#22c55e"/><text x="440" y="65" fill="currentColor">2'</text>
    <circle cx="350" cy="125" r="16" fill="#22c55e" fill-opacity="0.22" stroke="#22c55e"/><text x="350" y="130" fill="currentColor">4'</text>
    <circle cx="440" cy="125" r="16" fill="#22c55e" fill-opacity="0.22" stroke="#22c55e"/><text x="440" y="130" fill="currentColor">3'</text>
  </g>
  <line x1="366" y1="60" x2="424" y2="60" stroke="#22c55e" stroke-opacity="0.5"/>
  <line x1="350" y1="76" x2="350" y2="109" stroke="#22c55e" stroke-opacity="0.5"/>
  <line x1="440" y1="76" x2="440" y2="109" stroke="#22c55e" stroke-opacity="0.5"/>
  <line x1="366" y1="125" x2="424" y2="125" stroke="#22c55e" stroke-opacity="0.5"/>
</svg>
</div>

### The algorithm
1. Seed the map with the start node's clone.
2. BFS/DFS the original; for each node, for each neighbor: clone the neighbor if unseen (and enqueue it), then link the current clone to the neighbor's clone.
3. Return the start node's clone.

| | Time | Space |
| --- | --- | --- |
| BFS/DFS + hash map | O(V + E) | O(V) map |

The map does double duty: it's the "visited" set *and* the original-to-clone lookup, which is what keeps cycles from looping forever.

**Dry run.** Square 1–2–3–4–1: clone 1, visit neighbors 2 and 4 (clone + link), then 3 from both — the map ensures 3 is created once and both 2' and 4' point to the same 3'.

> **Interview tip:** emphasize that the map keys are **node references**, not values (values may repeat). Either BFS or DFS works; DFS is a tidy recursion: <code>clone(node)</code> returns the map entry, creating it on first visit.
`,
    examples: [
      {
        label: "BFS with original→clone map",
        variants: [
          { tech: "python", label: "Python", code: `from collections import deque

class Node:
    def __init__(self, val):
        self.val = val
        self.neighbors = []

def clone_graph(node):
    if not node:
        return None
    clones = {node: Node(node.val)}
    q = deque([node])
    while q:
        cur = q.popleft()
        for nb in cur.neighbors:
            if nb not in clones:
                clones[nb] = Node(nb.val)
                q.append(nb)
            clones[cur].neighbors.append(clones[nb])
    return clones[node]


# --- demo ---  square graph 1-2-3-4-1
a, b, c, d = Node(1), Node(2), Node(3), Node(4)
a.neighbors = [b, d]; b.neighbors = [a, c]
c.neighbors = [b, d]; d.neighbors = [a, c]
copy = clone_graph(a)
print(copy is not a)                              # True  (deep copy)
print(copy.val, [n.val for n in copy.neighbors])  # 1 [2, 4]` },
          { tech: "javascript", label: "JavaScript", code: `class Node {
  constructor(val) { this.val = val; this.neighbors = []; }
}

function cloneGraph(node) {
  if (!node) return null;
  const clones = new Map([[node, new Node(node.val)]]);
  const q = [node];
  while (q.length) {
    const cur = q.shift();
    for (const nb of cur.neighbors) {
      if (!clones.has(nb)) { clones.set(nb, new Node(nb.val)); q.push(nb); }
      clones.get(cur).neighbors.push(clones.get(nb));
    }
  }
  return clones.get(node);
}

// --- demo ---  square graph 1-2-3-4-1
const a = new Node(1), b = new Node(2), c = new Node(3), d = new Node(4);
a.neighbors = [b, d]; b.neighbors = [a, c]; c.neighbors = [b, d]; d.neighbors = [a, c];
const copy = cloneGraph(a);
console.log(copy !== a);                              // true
console.log(copy.val, copy.neighbors.map(n => n.val)); // 1 [ 2, 4 ]` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static class Node {
        int val; List<Node> neighbors = new ArrayList<>();
        Node(int val) { this.val = val; }
    }

    static Node cloneGraph(Node node) {
        if (node == null) return null;
        Map<Node, Node> clones = new HashMap<>();
        clones.put(node, new Node(node.val));
        Queue<Node> q = new LinkedList<>();
        q.add(node);
        while (!q.isEmpty()) {
            Node cur = q.poll();
            for (Node nb : cur.neighbors) {
                if (!clones.containsKey(nb)) {
                    clones.put(nb, new Node(nb.val));
                    q.add(nb);
                }
                clones.get(cur).neighbors.add(clones.get(nb));
            }
        }
        return clones.get(node);
    }

    public static void main(String[] args) {
        Node a = new Node(1), b = new Node(2), c = new Node(3), d = new Node(4);
        a.neighbors = Arrays.asList(b, d);
        b.neighbors = Arrays.asList(a, c);
        c.neighbors = Arrays.asList(b, d);
        d.neighbors = Arrays.asList(a, c);
        Node copy = cloneGraph(a);
        System.out.println(copy != a);   // true
        List<Integer> vals = new ArrayList<>();
        for (Node n : copy.neighbors) vals.add(n.val);
        System.out.println(copy.val + " " + vals);   // 1 [2, 4]
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

struct Node {
    int val;
    vector<Node*> neighbors;
    Node(int v) : val(v) {}
};

Node* cloneGraph(Node* node) {
    if (!node) return nullptr;
    unordered_map<Node*, Node*> clones;
    clones[node] = new Node(node->val);
    queue<Node*> q;
    q.push(node);
    while (!q.empty()) {
        Node* cur = q.front(); q.pop();
        for (Node* nb : cur->neighbors) {
            if (!clones.count(nb)) {
                clones[nb] = new Node(nb->val);
                q.push(nb);
            }
            clones[cur]->neighbors.push_back(clones[nb]);
        }
    }
    return clones[node];
}

int main() {
    Node* a = new Node(1); Node* b = new Node(2);
    Node* c = new Node(3); Node* d = new Node(4);
    a->neighbors = {b, d}; b->neighbors = {a, c};
    c->neighbors = {b, d}; d->neighbors = {a, c};
    Node* copy = cloneGraph(a);
    cout << boolalpha << (copy != a) << endl;   // true
    cout << copy->val << " ";
    for (Node* n : copy->neighbors) cout << n->val << " ";
    cout << endl;   // 1 2 4
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you solve the course schedule (prerequisites) problem?",
    answer: `
**Intuition.** Courses with prerequisites form a **directed graph** (an edge <code>pre → course</code>). You can finish all of them **iff the graph has no cycle** — a cycle is a deadlock where each course waits on another. **Kahn's algorithm** repeatedly takes courses with zero remaining prerequisites; if some are never freed, a cycle exists.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">peel off in-degree-0 nodes; left with some → cycle</text>
  <g font-size="12" text-anchor="middle">
    <circle cx="80" cy="70" r="18" fill="#22c55e" fill-opacity="0.22" stroke="#22c55e"/><text x="80" y="75" fill="currentColor">0</text>
    <circle cx="200" cy="70" r="18" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="200" y="75" fill="currentColor">1</text>
    <circle cx="320" cy="70" r="18" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="320" y="75" fill="currentColor">2</text>
  </g>
  <line x1="98" y1="70" x2="180" y2="70" stroke="currentColor" stroke-opacity="0.4" marker-end="url(#cs)"/>
  <line x1="218" y1="70" x2="300" y2="70" stroke="currentColor" stroke-opacity="0.4" marker-end="url(#cs)"/>
  <text x="80" y="105" fill="#22c55e" font-size="10" text-anchor="middle">in-deg 0 → take first</text>
  <text x="420" y="66" fill="currentColor" font-size="11" text-anchor="middle">order:</text>
  <text x="420" y="84" fill="#22c55e" font-size="12" text-anchor="middle">0 → 1 → 2</text>
  <defs><marker id="cs" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor" fill-opacity="0.5"/></marker></defs>
</svg>
</div>

### The algorithm (Kahn / BFS topological sort)
1. Build adjacency lists and an **in-degree** count per course.
2. Enqueue every course with in-degree 0.
3. Pop a course (mark it taken); for each dependent, decrement its in-degree and enqueue it when it hits 0.
4. If the number taken equals <code>numCourses</code>, no cycle → schedule exists.

| | Time | Space |
| --- | --- | --- |
| Kahn's algorithm | O(V + E) | O(V + E) |

A DFS with three-color (white/gray/black) marking detects the cycle equivalently — a back-edge to a gray node means a cycle.

**Dry run.** 2 courses, prereq <code>[1,0]</code>: course 0 has in-degree 0 → take it → frees 1 → take 1. Taken 2 = numCourses → **true**. With <code>[1,0],[0,1]</code> neither starts at in-degree 0 → **false**.

> **Interview tip:** name it explicitly — "this is cycle detection on a DAG / topological sort." Kahn's also *produces the ordering* for the Course Schedule II follow-up, where you return the actual sequence.
`,
    examples: [
      {
        label: "Kahn's algorithm (BFS topo-sort)",
        variants: [
          { tech: "python", label: "Python", code: `from collections import deque

def can_finish(num_courses, prerequisites):
    graph = [[] for _ in range(num_courses)]
    indegree = [0] * num_courses
    for course, pre in prerequisites:
        graph[pre].append(course)
        indegree[course] += 1
    q = deque(c for c in range(num_courses) if indegree[c] == 0)
    taken = 0
    while q:
        c = q.popleft()
        taken += 1
        for nxt in graph[c]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                q.append(nxt)
    return taken == num_courses


# --- demo ---
print(can_finish(2, [[1, 0]]))            # True   (take 0, then 1)
print(can_finish(2, [[1, 0], [0, 1]]))    # False  (0 and 1 depend on each other)` },
          { tech: "javascript", label: "JavaScript", code: `function canFinish(numCourses, prerequisites) {
  const graph = Array.from({ length: numCourses }, () => []);
  const indegree = new Array(numCourses).fill(0);
  for (const [course, pre] of prerequisites) {
    graph[pre].push(course);
    indegree[course]++;
  }
  const q = [];
  for (let c = 0; c < numCourses; c++) if (indegree[c] === 0) q.push(c);
  let taken = 0;
  while (q.length) {
    const c = q.shift();
    taken++;
    for (const nxt of graph[c]) {
      if (--indegree[nxt] === 0) q.push(nxt);
    }
  }
  return taken === numCourses;
}

// --- demo ---
console.log(canFinish(2, [[1, 0]]));         // true
console.log(canFinish(2, [[1, 0], [0, 1]])); // false` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static boolean canFinish(int numCourses, int[][] prerequisites) {
        List<List<Integer>> graph = new ArrayList<>();
        for (int i = 0; i < numCourses; i++) graph.add(new ArrayList<>());
        int[] indegree = new int[numCourses];
        for (int[] p : prerequisites) {
            graph.get(p[1]).add(p[0]);
            indegree[p[0]]++;
        }
        Queue<Integer> q = new LinkedList<>();
        for (int c = 0; c < numCourses; c++) if (indegree[c] == 0) q.add(c);
        int taken = 0;
        while (!q.isEmpty()) {
            int c = q.poll();
            taken++;
            for (int nxt : graph.get(c)) {
                if (--indegree[nxt] == 0) q.add(nxt);
            }
        }
        return taken == numCourses;
    }

    public static void main(String[] args) {
        System.out.println(canFinish(2, new int[][]{{1, 0}}));           // true
        System.out.println(canFinish(2, new int[][]{{1, 0}, {0, 1}}));   // false
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {
    vector<vector<int>> graph(numCourses);
    vector<int> indegree(numCourses, 0);
    for (auto& p : prerequisites) {
        graph[p[1]].push_back(p[0]);
        indegree[p[0]]++;
    }
    queue<int> q;
    for (int c = 0; c < numCourses; c++) if (indegree[c] == 0) q.push(c);
    int taken = 0;
    while (!q.empty()) {
        int c = q.front(); q.pop();
        taken++;
        for (int nxt : graph[c]) {
            if (--indegree[nxt] == 0) q.push(nxt);
        }
    }
    return taken == numCourses;
}

int main() {
    vector<vector<int>> a = {{1, 0}};
    vector<vector<int>> b = {{1, 0}, {0, 1}};
    cout << boolalpha << canFinish(2, a) << endl;   // true
    cout << canFinish(2, b) << endl;                // false
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you count connected components in an undirected graph?",
    answer: `
**Intuition.** Each launch of a traversal floods exactly one component. So either DFS/BFS from every unvisited node (one launch = one component), or use **Union-Find**: union the endpoints of every edge, and the number of distinct roots left is the component count.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">union edges; distinct roots = components (here 2)</text>
  <g font-size="12" text-anchor="middle">
    <circle cx="90" cy="80" r="18" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="90" y="85" fill="currentColor">0</text>
    <circle cx="180" cy="55" r="18" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="180" y="60" fill="currentColor">1</text>
    <circle cx="180" cy="115" r="18" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="180" y="120" fill="currentColor">2</text>
    <circle cx="360" cy="80" r="18" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="360" y="85" fill="currentColor">3</text>
    <circle cx="450" cy="80" r="18" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="450" y="85" fill="currentColor">4</text>
  </g>
  <line x1="106" y1="74" x2="166" y2="60" stroke="#3b82f6" stroke-opacity="0.5"/>
  <line x1="106" y1="86" x2="166" y2="110" stroke="#3b82f6" stroke-opacity="0.5"/>
  <line x1="378" y1="80" x2="432" y2="80" stroke="#8b5cf6" stroke-opacity="0.5"/>
  <text x="135" y="140" fill="#3b82f6" font-size="11" text-anchor="middle">component A</text>
  <text x="405" y="140" fill="#8b5cf6" font-size="11" text-anchor="middle">component B</text>
</svg>
</div>

### Union-Find approach
1. <code>parent[i] = i</code>; start <code>count = n</code>.
2. For each edge <code>(a, b)</code>, find both roots; if different, union them and decrement <code>count</code> (two groups merged into one).
3. <code>count</code> is the number of components.

| Approach | Time | Space |
| --- | --- | --- |
| Union-Find (path compression) | ~O(E &alpha;(n)) | O(n) |
| DFS/BFS per unvisited node | O(V + E) | O(V) |

Path compression flattens the parent chains, making <code>find</code> nearly constant amortized (the inverse-Ackermann &alpha; factor).

**Dry run.** n=5, edges <code>(0,1),(1,2),(3,4)</code>: unioning 0-1 and 1-2 collapses {0,1,2} (count 5→4→3); 3-4 collapses {3,4} (count 3→2). Node-less merges stop — **2** components.

> **Interview tip:** Union-Find shines when edges arrive incrementally (dynamic connectivity); DFS/BFS is simpler for a one-shot count. Mention path compression + union by rank as the standard optimizations.
`,
    examples: [
      {
        label: "Union-Find with path compression",
        variants: [
          { tech: "python", label: "Python", code: `def count_components(n, edges):
    parent = list(range(n))
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]   # path compression
            x = parent[x]
        return x
    count = n
    for a, b in edges:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb
            count -= 1
    return count


# --- demo ---
print(count_components(5, [[0, 1], [1, 2], [3, 4]]))   # 2` },
          { tech: "javascript", label: "JavaScript", code: `function countComponents(n, edges) {
  const parent = Array.from({ length: n }, (_, i) => i);
  function find(x) {
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
  }
  let count = n;
  for (const [a, b] of edges) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) { parent[ra] = rb; count--; }
  }
  return count;
}

// --- demo ---
console.log(countComponents(5, [[0, 1], [1, 2], [3, 4]])); // 2` },
          { tech: "java", label: "Java", code: `public class Main {
    static int[] parent;
    static int find(int x) {
        while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
        return x;
    }

    static int countComponents(int n, int[][] edges) {
        parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        int count = n;
        for (int[] e : edges) {
            int ra = find(e[0]), rb = find(e[1]);
            if (ra != rb) { parent[ra] = rb; count--; }
        }
        return count;
    }

    public static void main(String[] args) {
        System.out.println(countComponents(5, new int[][]{{0,1},{1,2},{3,4}}));   // 2
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

vector<int> parent;
int find(int x) {
    while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
}

int countComponents(int n, vector<vector<int>>& edges) {
    parent.resize(n);
    for (int i = 0; i < n; i++) parent[i] = i;
    int count = n;
    for (auto& e : edges) {
        int ra = find(e[0]), rb = find(e[1]);
        if (ra != rb) { parent[ra] = rb; count--; }
    }
    return count;
}

int main() {
    vector<vector<int>> edges = {{0,1},{1,2},{3,4}};
    cout << countComponents(5, edges) << endl;   // 2
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you solve the word ladder problem?",
    answer: `
**Intuition.** Think of each word as a **graph node**, with an edge between words that differ by exactly **one letter**. The shortest transformation sequence is then the shortest path in an unweighted graph — which is exactly what **BFS** finds. Generate neighbors on the fly by trying every position × every letter and checking the dictionary.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">BFS over one-letter edits: hit → … → cog (5 words)</text>
  <g font-size="11" text-anchor="middle" font-family="ui-monospace,monospace">
    <rect x="30" y="55" width="56" height="28" rx="6" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="58" y="73" fill="currentColor">hit</text>
    <rect x="130" y="55" width="56" height="28" rx="6" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="158" y="73" fill="currentColor">hot</text>
    <rect x="230" y="55" width="56" height="28" rx="6" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="258" y="73" fill="currentColor">dot</text>
    <rect x="330" y="55" width="56" height="28" rx="6" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="358" y="73" fill="currentColor">dog</text>
    <rect x="430" y="55" width="56" height="28" rx="6" fill="#22c55e" fill-opacity="0.22" stroke="#22c55e"/><text x="458" y="73" fill="currentColor">cog</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.35" marker-end="url(#wl)">
    <line x1="88" y1="69" x2="128" y2="69"/><line x1="188" y1="69" x2="228" y2="69"/>
    <line x1="288" y1="69" x2="328" y2="69"/><line x1="388" y1="69" x2="428" y2="69"/>
  </g>
  <text x="258" y="110" fill="#22c55e" font-size="11" text-anchor="middle">length 5 (inclusive of both ends)</text>
  <defs><marker id="wl" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor" fill-opacity="0.45"/></marker></defs>
</svg>
</div>

### The algorithm
1. Put all dictionary words in a set; bail if <code>endWord</code> isn't in it.
2. BFS from <code>beginWord</code> with a step counter; the start counts as length 1.
3. For the current word, try each position with every letter a–z; any result in the set (and unseen) is enqueued with <code>steps + 1</code>.
4. Return <code>steps</code> when you dequeue <code>endWord</code>; 0 if BFS drains.

| | Time | Space |
| --- | --- | --- |
| BFS, generate-and-check | O(N &middot; L &middot; 26) | O(N &middot; L) |

(<code>N</code> words, length <code>L</code>.) **Bidirectional BFS** — searching from both ends and meeting in the middle — dramatically shrinks the frontier.

**Dry run.** <code>hit → hot → dot → dog → cog</code>: five words on the shortest chain, so the answer is **5** (the problem counts words, not edges).

> **Interview tip:** clarify whether the count is words or transformations (LeetCode counts words → includes both ends). Mention generating neighbors by position×letter (cheaper than comparing against all N words) and bidirectional BFS as the speed-up.
`,
    examples: [
      {
        label: "BFS over one-letter edits",
        variants: [
          { tech: "python", label: "Python", code: `from collections import deque

def ladder_length(begin, end, word_list):
    words = set(word_list)
    if end not in words:
        return 0
    q = deque([(begin, 1)])
    seen = {begin}
    while q:
        word, steps = q.popleft()
        if word == end:
            return steps
        for i in range(len(word)):
            for c in 'abcdefghijklmnopqrstuvwxyz':
                nxt = word[:i] + c + word[i + 1:]
                if nxt in words and nxt not in seen:
                    seen.add(nxt)
                    q.append((nxt, steps + 1))
    return 0


# --- demo ---
print(ladder_length('hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log', 'cog']))   # 5` },
          { tech: "javascript", label: "JavaScript", code: `function ladderLength(begin, end, wordList) {
  const words = new Set(wordList);
  if (!words.has(end)) return 0;
  const q = [[begin, 1]];
  const seen = new Set([begin]);
  const alpha = 'abcdefghijklmnopqrstuvwxyz';
  while (q.length) {
    const [word, steps] = q.shift();
    if (word === end) return steps;
    for (let i = 0; i < word.length; i++) {
      for (const c of alpha) {
        const nxt = word.slice(0, i) + c + word.slice(i + 1);
        if (words.has(nxt) && !seen.has(nxt)) {
          seen.add(nxt);
          q.push([nxt, steps + 1]);
        }
      }
    }
  }
  return 0;
}

// --- demo ---
console.log(ladderLength('hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log', 'cog'])); // 5` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static int ladderLength(String begin, String end, List<String> wordList) {
        Set<String> words = new HashSet<>(wordList);
        if (!words.contains(end)) return 0;
        Queue<String> q = new LinkedList<>();
        Map<String, Integer> steps = new HashMap<>();
        q.add(begin);
        steps.put(begin, 1);
        while (!q.isEmpty()) {
            String word = q.poll();
            if (word.equals(end)) return steps.get(word);
            char[] arr = word.toCharArray();
            for (int i = 0; i < arr.length; i++) {
                char orig = arr[i];
                for (char c = 'a'; c <= 'z'; c++) {
                    arr[i] = c;
                    String nxt = new String(arr);
                    if (words.contains(nxt) && !steps.containsKey(nxt)) {
                        steps.put(nxt, steps.get(word) + 1);
                        q.add(nxt);
                    }
                }
                arr[i] = orig;
            }
        }
        return 0;
    }

    public static void main(String[] args) {
        System.out.println(ladderLength("hit", "cog",
            Arrays.asList("hot", "dot", "dog", "lot", "log", "cog")));   // 5
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

int ladderLength(string begin, string end, vector<string>& wordList) {
    unordered_set<string> words(wordList.begin(), wordList.end());
    if (!words.count(end)) return 0;
    queue<pair<string,int>> q;
    q.push({begin, 1});
    unordered_set<string> seen = {begin};
    while (!q.empty()) {
        auto [word, steps] = q.front(); q.pop();
        if (word == end) return steps;
        string w = word;
        for (int i = 0; i < (int)w.size(); i++) {
            char orig = w[i];
            for (char c = 'a'; c <= 'z'; c++) {
                w[i] = c;
                if (words.count(w) && !seen.count(w)) {
                    seen.insert(w);
                    q.push({w, steps + 1});
                }
            }
            w[i] = orig;
        }
    }
    return 0;
}

int main() {
    vector<string> wl = {"hot", "dot", "dog", "lot", "log", "cog"};
    cout << ladderLength("hit", "cog", wl) << endl;   // 5
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you check if a graph is bipartite?",
    answer: `
**Intuition.** A graph is bipartite if you can split its vertices into two groups so that **every edge crosses between groups** — equivalently, you can **2-color** it with no two adjacent nodes sharing a color. Traverse with BFS/DFS, coloring each neighbor the opposite color; a conflict means an **odd cycle**, so it's not bipartite.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 155" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">2-color via BFS: neighbor gets opposite color</text>
  <g font-size="12" text-anchor="middle">
    <circle cx="100" cy="50" r="18" fill="#3b82f6" fill-opacity="0.2" stroke="#3b82f6"/><text x="100" y="55" fill="currentColor">0</text>
    <circle cx="220" cy="50" r="18" fill="#f59e0b" fill-opacity="0.2" stroke="#f59e0b"/><text x="220" y="55" fill="currentColor">1</text>
    <circle cx="220" cy="120" r="18" fill="#f59e0b" fill-opacity="0.2" stroke="#f59e0b"/><text x="220" y="125" fill="currentColor">3</text>
    <circle cx="100" cy="120" r="18" fill="#3b82f6" fill-opacity="0.2" stroke="#3b82f6"/><text x="100" y="125" fill="currentColor">2</text>
  </g>
  <line x1="118" y1="50" x2="202" y2="50" stroke="currentColor" stroke-opacity="0.35"/>
  <line x1="118" y1="120" x2="202" y2="120" stroke="currentColor" stroke-opacity="0.35"/>
  <line x1="100" y1="68" x2="100" y2="102" stroke="currentColor" stroke-opacity="0.35"/>
  <line x1="220" y1="68" x2="220" y2="102" stroke="currentColor" stroke-opacity="0.35"/>
  <text x="350" y="50" fill="#3b82f6" font-size="11" text-anchor="middle">group A: {0,2}</text>
  <text x="350" y="120" fill="#f59e0b" font-size="11" text-anchor="middle">group B: {1,3}</text>
  <text x="350" y="85" fill="#22c55e" font-size="11" text-anchor="middle">every edge crosses → ✓</text>
</svg>
</div>

### The algorithm
1. <code>color[i] = 0</code> (uncolored). For each uncolored start (handles disconnected graphs), color it and BFS.
2. For each edge to a neighbor: if uncolored, paint it the opposite color and enqueue; if already the **same** color as the current node → not bipartite.
3. Survive all edges → bipartite.

| | Time | Space |
| --- | --- | --- |
| BFS/DFS 2-coloring | O(V + E) | O(V) |

The key fact: a graph is bipartite **iff it contains no odd-length cycle** — the coloring conflict is precisely how an odd cycle reveals itself.

**Dry run.** Square 0-1-2-3 (even cycle): 0=A, then 1=B, 3=B, 2=A — no clash → **bipartite**. A triangle would force a third node to clash → not bipartite.

> **Interview tip:** tie it to "no odd cycle." Remember to loop over **all** start vertices for disconnected graphs, and that <code>color</code> doubles as the visited marker.
`,
    examples: [
      {
        label: "BFS 2-coloring",
        variants: [
          { tech: "python", label: "Python", code: `from collections import deque

def is_bipartite(graph):
    n = len(graph)
    color = [0] * n            # 0 = uncolored, 1 / -1 the two colors
    for start in range(n):
        if color[start] != 0:
            continue
        color[start] = 1
        q = deque([start])
        while q:
            u = q.popleft()
            for v in graph[u]:
                if color[v] == 0:
                    color[v] = -color[u]
                    q.append(v)
                elif color[v] == color[u]:
                    return False
    return True


# --- demo ---  adjacency lists
print(is_bipartite([[1, 3], [0, 2], [1, 3], [0, 2]]))   # True   (square / even cycle)
print(is_bipartite([[1, 2], [0, 2], [0, 1]]))           # False  (triangle / odd cycle)` },
          { tech: "javascript", label: "JavaScript", code: `function isBipartite(graph) {
  const n = graph.length;
  const color = new Array(n).fill(0);
  for (let start = 0; start < n; start++) {
    if (color[start] !== 0) continue;
    color[start] = 1;
    const q = [start];
    while (q.length) {
      const u = q.shift();
      for (const v of graph[u]) {
        if (color[v] === 0) { color[v] = -color[u]; q.push(v); }
        else if (color[v] === color[u]) return false;
      }
    }
  }
  return true;
}

// --- demo ---
console.log(isBipartite([[1, 3], [0, 2], [1, 3], [0, 2]])); // true
console.log(isBipartite([[1, 2], [0, 2], [0, 1]]));         // false` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static boolean isBipartite(int[][] graph) {
        int n = graph.length;
        int[] color = new int[n];
        for (int start = 0; start < n; start++) {
            if (color[start] != 0) continue;
            color[start] = 1;
            Queue<Integer> q = new LinkedList<>();
            q.add(start);
            while (!q.isEmpty()) {
                int u = q.poll();
                for (int v : graph[u]) {
                    if (color[v] == 0) { color[v] = -color[u]; q.add(v); }
                    else if (color[v] == color[u]) return false;
                }
            }
        }
        return true;
    }

    public static void main(String[] args) {
        System.out.println(isBipartite(new int[][]{{1,3},{0,2},{1,3},{0,2}}));   // true
        System.out.println(isBipartite(new int[][]{{1,2},{0,2},{0,1}}));         // false
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

bool isBipartite(vector<vector<int>>& graph) {
    int n = graph.size();
    vector<int> color(n, 0);
    for (int start = 0; start < n; start++) {
        if (color[start] != 0) continue;
        color[start] = 1;
        queue<int> q;
        q.push(start);
        while (!q.empty()) {
            int u = q.front(); q.pop();
            for (int v : graph[u]) {
                if (color[v] == 0) { color[v] = -color[u]; q.push(v); }
                else if (color[v] == color[u]) return false;
            }
        }
    }
    return true;
}

int main() {
    vector<vector<int>> sq = {{1,3},{0,2},{1,3},{0,2}};
    vector<vector<int>> tri = {{1,2},{0,2},{0,1}};
    cout << boolalpha << isBipartite(sq) << endl;    // true
    cout << isBipartite(tri) << endl;                // false
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How does the Bellman-Ford algorithm work?",
    answer: `
**Intuition.** A shortest path in a graph with <code>V</code> vertices uses at most <code>V − 1</code> edges. **Bellman-Ford** simply **relaxes every edge** <code>V − 1</code> times: each pass lets correct distances propagate one edge further. Unlike Dijkstra it tolerates **negative edges**, and one extra pass that still improves something proves a **negative cycle**.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 160" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">relax all edges V-1 times; negative weights allowed</text>
  <g font-size="12" text-anchor="middle">
    <circle cx="60" cy="80" r="17" fill="#22c55e" fill-opacity="0.22" stroke="#22c55e"/><text x="60" y="85" fill="currentColor">0</text>
    <circle cx="190" cy="40" r="17" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="190" y="45" fill="currentColor">1</text>
    <circle cx="190" cy="120" r="17" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="190" y="125" fill="currentColor">2</text>
    <circle cx="330" cy="80" r="17" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="330" y="85" fill="currentColor">3</text>
    <circle cx="450" cy="80" r="17" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="450" y="85" fill="currentColor">4</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.35" font-size="10" fill="currentColor">
    <line x1="76" y1="72" x2="176" y2="46" marker-end="url(#bf)"/><text x="120" y="50">6</text>
    <line x1="76" y1="88" x2="176" y2="114" marker-end="url(#bf)"/><text x="120" y="115">7</text>
    <line x1="205" y1="112" x2="316" y2="86" marker-end="url(#bf)"/><text x="265" y="92" fill="#ef4444">-3</text>
    <line x1="205" y1="50" x2="436" y2="74" marker-end="url(#bf)"/><text x="300" y="48" fill="#ef4444">-4</text>
  </g>
  <text x="450" y="120" fill="#22c55e" font-size="10" text-anchor="middle">dist[4]=2</text>
  <defs><marker id="bf" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor" fill-opacity="0.45"/></marker></defs>
</svg>
</div>

### The algorithm
1. <code>dist[source] = 0</code>, all others infinity.
2. Repeat <code>V − 1</code> times: for every edge <code>(u, v, w)</code>, if <code>dist[u] + w &lt; dist[v]</code>, update <code>dist[v]</code> (relax).
3. One more sweep: if any edge can still relax, a reachable **negative cycle** exists.

| | Time | Space |
| --- | --- | --- |
| Bellman-Ford | O(V &middot; E) | O(V) |
| Dijkstra (no negatives) | O(E log V) | O(V) |

It's slower than Dijkstra but strictly more capable — it handles negative weights and *detects* negative cycles, which Dijkstra cannot.

**Dry run.** The CLRS graph above from source 0 settles to <code>dist = [0, 6, 7, 4, 2]</code> — node 3 via <code>0→2→3</code> (7 − 3 = 4), node 4 via <code>0→1→4</code> (6 − 4 = 2).

> **Interview tip:** the headline is "handles negative edges and detects negative cycles" — that's why you'd pick it over Dijkstra. Note the <code>V − 1</code> bound comes from a shortest path being simple (no repeated vertices).
`,
    examples: [
      {
        label: "Edge relaxation + negative-cycle check",
        variants: [
          { tech: "python", label: "Python", code: `def bellman_ford(n, edges, source):
    INF = float('inf')
    dist = [INF] * n
    dist[source] = 0
    for _ in range(n - 1):                      # relax V-1 times
        for u, v, w in edges:
            if dist[u] != INF and dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
    for u, v, w in edges:                        # one more pass detects a cycle
        if dist[u] != INF and dist[u] + w < dist[v]:
            return None                          # negative cycle
    return dist


# --- demo ---  edges (u, v, w); note negatives on 2->3 and 1->4
edges = [(0, 1, 6), (0, 2, 7), (1, 2, 8), (1, 3, 5),
         (2, 3, -3), (1, 4, -4), (3, 4, 9)]
print(bellman_ford(5, edges, 0))   # [0, 6, 7, 4, 2]` },
          { tech: "javascript", label: "JavaScript", code: `function bellmanFord(n, edges, source) {
  const INF = Infinity;
  const dist = new Array(n).fill(INF);
  dist[source] = 0;
  for (let i = 0; i < n - 1; i++) {              // relax V-1 times
    for (const [u, v, w] of edges) {
      if (dist[u] !== INF && dist[u] + w < dist[v]) dist[v] = dist[u] + w;
    }
  }
  for (const [u, v, w] of edges) {               // detect negative cycle
    if (dist[u] !== INF && dist[u] + w < dist[v]) return null;
  }
  return dist;
}

// --- demo ---
const edges = [[0,1,6],[0,2,7],[1,2,8],[1,3,5],[2,3,-3],[1,4,-4],[3,4,9]];
console.log(bellmanFord(5, edges, 0)); // [0, 6, 7, 4, 2]` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static int[] bellmanFord(int n, int[][] edges, int source) {
        final int INF = Integer.MAX_VALUE;
        int[] dist = new int[n];
        Arrays.fill(dist, INF);
        dist[source] = 0;
        for (int i = 0; i < n - 1; i++) {                 // relax V-1 times
            for (int[] e : edges) {
                int u = e[0], v = e[1], w = e[2];
                if (dist[u] != INF && dist[u] + w < dist[v]) dist[v] = dist[u] + w;
            }
        }
        for (int[] e : edges) {                            // detect negative cycle
            if (dist[e[0]] != INF && dist[e[0]] + e[2] < dist[e[1]]) return null;
        }
        return dist;
    }

    public static void main(String[] args) {
        int[][] edges = {{0,1,6},{0,2,7},{1,2,8},{1,3,5},{2,3,-3},{1,4,-4},{3,4,9}};
        System.out.println(Arrays.toString(bellmanFord(5, edges, 0)));   // [0, 6, 7, 4, 2]
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

vector<int> bellmanFord(int n, vector<vector<int>>& edges, int source) {
    const long INF = LONG_MAX;
    vector<long> dist(n, INF);
    dist[source] = 0;
    for (int i = 0; i < n - 1; i++) {                  // relax V-1 times
        for (auto& e : edges) {
            int u = e[0], v = e[1], w = e[2];
            if (dist[u] != INF && dist[u] + w < dist[v]) dist[v] = dist[u] + w;
        }
    }
    for (auto& e : edges) {                            // detect negative cycle
        if (dist[e[0]] != INF && dist[e[0]] + e[2] < dist[e[1]]) return {};
    }
    return vector<int>(dist.begin(), dist.end());
}

int main() {
    vector<vector<int>> edges = {{0,1,6},{0,2,7},{1,2,8},{1,3,5},{2,3,-3},{1,4,-4},{3,4,9}};
    vector<int> dist = bellmanFord(5, edges, 0);
    for (int d : dist) cout << d << " ";
    cout << endl;   // 0 6 7 4 2
    return 0;
}` },
        ],
      },
    ],
  },
];

export default augments;
