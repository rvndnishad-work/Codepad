/**
 * DSA augment batch 11 (final) — dsa-4.json items 26-31: unique paths,
 * partition equal subset sum, max product subarray, quickselect, monotonic
 * stack, binary search on the answer.
 * See dsa-augments.types.ts for the authoring rules (no "${", no raw backticks
 * inside these template literals; inline code uses <code> tags). Every code
 * variant is a COMPLETE RUNNABLE PROGRAM.
 */
import type { DsaAugment } from "./dsa-augments.types";

const augments: DsaAugment[] = [
  {
    title: "How do you count unique paths in a grid?",
    answer: `
**Intuition.** A robot moving only **right** or **down** reaches a cell from exactly two places: the cell above and the cell to its left. So the number of paths to any cell is the **sum** of those two — and the edges (top row, left column) have exactly one path. Fill the grid and read the bottom-right corner.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">paths(cell) = paths(up) + paths(left)</text>
  <g font-size="13" text-anchor="middle" font-family="ui-monospace,monospace">
    <rect x="120" y="35" width="40" height="34" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="140" y="57" fill="currentColor">1</text>
    <rect x="170" y="35" width="40" height="34" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="190" y="57" fill="currentColor">1</text>
    <rect x="220" y="35" width="40" height="34" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="240" y="57" fill="currentColor">1</text>
    <rect x="120" y="79" width="40" height="34" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="140" y="101" fill="currentColor">1</text>
    <rect x="170" y="79" width="40" height="34" rx="5" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="190" y="101" fill="currentColor">2</text>
    <rect x="220" y="79" width="40" height="34" rx="5" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="240" y="101" fill="currentColor">3</text>
  </g>
  <text x="350" y="80" fill="currentColor" font-size="11">3&times;2 grid → 3 paths</text>
  <text x="350" y="100" fill="currentColor" font-size="10" opacity="0.6">2 + 1 = 3</text>
</svg>
</div>

### The algorithm
1. One row <code>dp</code> of length <code>n</code>, all 1 (top row reachable one way).
2. For each subsequent row, <code>dp[j] += dp[j-1]</code> — the running value is "from above," <code>dp[j-1]</code> is "from the left."
3. <code>dp[n-1]</code> is the answer.

| Approach | Time | Space |
| --- | --- | --- |
| 1-D DP | O(m &middot; n) | O(n) |
| Combinatorics <code>C(m+n-2, m-1)</code> | O(min(m, n)) | O(1) |

There's also a **closed form**: every path is a fixed arrangement of <code>m-1</code> downs and <code>n-1</code> rights, so the count is the binomial <code>C(m+n-2, m-1)</code>.

**Dry run.** 3 rows &times; 2 cols: the rightmost column fills 1, 2, 3 going down → **3** paths.

> **Interview tip:** lead with the additive recurrence, mention the O(n) rolling row, then offer the combinatorial closed form as the slick optimization. If obstacles are added (Unique Paths II), blocked cells simply contribute 0.
`,
    examples: [
      {
        label: "Rolling 1-D DP",
        variants: [
          { tech: "python", label: "Python", code: `def unique_paths(m, n):
    dp = [1] * n                 # top row: one way to each cell
    for _ in range(1, m):
        for j in range(1, n):
            dp[j] += dp[j - 1]   # from above (dp[j]) + from the left (dp[j-1])
    return dp[n - 1]


# --- demo ---
print(unique_paths(3, 7))   # 28
print(unique_paths(3, 2))   # 3` },
          { tech: "javascript", label: "JavaScript", code: `function uniquePaths(m, n) {
  const dp = new Array(n).fill(1);
  for (let i = 1; i < m; i++) {
    for (let j = 1; j < n; j++) {
      dp[j] += dp[j - 1];        // from above + from the left
    }
  }
  return dp[n - 1];
}

// --- demo ---
console.log(uniquePaths(3, 7)); // 28
console.log(uniquePaths(3, 2)); // 3` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static int uniquePaths(int m, int n) {
        int[] dp = new int[n];
        Arrays.fill(dp, 1);
        for (int i = 1; i < m; i++) {
            for (int j = 1; j < n; j++) {
                dp[j] += dp[j - 1];
            }
        }
        return dp[n - 1];
    }

    public static void main(String[] args) {
        System.out.println(uniquePaths(3, 7));   // 28
        System.out.println(uniquePaths(3, 2));   // 3
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

int uniquePaths(int m, int n) {
    vector<int> dp(n, 1);
    for (int i = 1; i < m; i++) {
        for (int j = 1; j < n; j++) {
            dp[j] += dp[j - 1];
        }
    }
    return dp[n - 1];
}

int main() {
    cout << uniquePaths(3, 7) << endl;   // 28
    cout << uniquePaths(3, 2) << endl;   // 3
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you check if an array can be partitioned into two equal-sum subsets?",
    answer: `
**Intuition.** Two equal-sum halves are possible only if the total is even, and then each half must sum to <code>total / 2</code>. So the question reduces to **subset-sum**: can any subset of the numbers reach <code>total / 2</code>? That's a boolean 0/1 knapsack over the target.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">total 22 → can a subset hit 11?</text>
  <g font-size="12" text-anchor="middle" font-family="ui-monospace,monospace">
    <rect x="60" y="50" width="40" height="34" rx="5" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/><text x="80" y="72" fill="currentColor">1</text>
    <rect x="110" y="50" width="40" height="34" rx="5" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/><text x="130" y="72" fill="currentColor">5</text>
    <rect x="160" y="50" width="40" height="34" rx="5" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/><text x="180" y="72" fill="currentColor">5</text>
    <text x="220" y="72" fill="#22c55e" font-size="12">= 11</text>
    <rect x="320" y="50" width="50" height="34" rx="5" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="345" y="72" fill="currentColor">11</text>
    <text x="400" y="72" fill="#8b5cf6" font-size="12">= 11</text>
  </g>
  <text x="260" y="115" fill="#22c55e" font-size="11" text-anchor="middle">{1,5,5} and {11} → partition exists ✓</text>
</svg>
</div>

### The algorithm
1. If <code>sum(nums)</code> is odd → impossible.
2. <code>target = sum / 2</code>. Boolean <code>dp[s]</code> = "some subset sums to <code>s</code>"; <code>dp[0] = true</code>.
3. For each number, sweep <code>s</code> from <code>target</code> **down** to the number: <code>dp[s] |= dp[s - num]</code>.
4. Return <code>dp[target]</code>.

| | Time | Space |
| --- | --- | --- |
| Subset-sum DP | O(n &middot; sum) | O(sum) |

The **downward** sweep (as in 0/1 knapsack) ensures each number is used at most once per subset.

**Dry run.** <code>[1,5,11,5]</code>: total 22, target 11. Subset <code>{1,5,5}</code> reaches 11 and <code>{11}</code> is the other half → **true**. <code>[1,2,3,5]</code> total 11 is odd → **false**.

> **Interview tip:** the framing move — "equal partition ⇔ subset summing to half" — is the whole insight. It's literally 0/1 knapsack with a boolean table, so the downward iteration and odd-total shortcut are the two details to nail.
`,
    examples: [
      {
        label: "Subset-sum boolean DP",
        variants: [
          { tech: "python", label: "Python", code: `def can_partition(nums):
    total = sum(nums)
    if total % 2 != 0:
        return False
    target = total // 2
    dp = [False] * (target + 1)
    dp[0] = True
    for x in nums:
        for s in range(target, x - 1, -1):    # downward = use each x once
            dp[s] = dp[s] or dp[s - x]
    return dp[target]


# --- demo ---
print(can_partition([1, 5, 11, 5]))   # True   ({1,5,5} and {11})
print(can_partition([1, 2, 3, 5]))    # False  (odd total)` },
          { tech: "javascript", label: "JavaScript", code: `function canPartition(nums) {
  const total = nums.reduce((a, b) => a + b, 0);
  if (total % 2 !== 0) return false;
  const target = total / 2;
  const dp = new Array(target + 1).fill(false);
  dp[0] = true;
  for (const x of nums) {
    for (let s = target; s >= x; s--) {
      if (dp[s - x]) dp[s] = true;
    }
  }
  return dp[target];
}

// --- demo ---
console.log(canPartition([1, 5, 11, 5])); // true
console.log(canPartition([1, 2, 3, 5]));  // false` },
          { tech: "java", label: "Java", code: `public class Main {
    static boolean canPartition(int[] nums) {
        int total = 0;
        for (int x : nums) total += x;
        if (total % 2 != 0) return false;
        int target = total / 2;
        boolean[] dp = new boolean[target + 1];
        dp[0] = true;
        for (int x : nums) {
            for (int s = target; s >= x; s--) {
                if (dp[s - x]) dp[s] = true;
            }
        }
        return dp[target];
    }

    public static void main(String[] args) {
        System.out.println(canPartition(new int[]{1,5,11,5})); // true
        System.out.println(canPartition(new int[]{1,2,3,5}));  // false
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

bool canPartition(vector<int>& nums) {
    int total = accumulate(nums.begin(), nums.end(), 0);
    if (total % 2 != 0) return false;
    int target = total / 2;
    vector<char> dp(target + 1, false);
    dp[0] = true;
    for (int x : nums) {
        for (int s = target; s >= x; s--) {
            if (dp[s - x]) dp[s] = true;
        }
    }
    return dp[target];
}

int main() {
    vector<int> a = {1,5,11,5}, b = {1,2,3,5};
    cout << boolalpha << canPartition(a) << endl; // true
    cout << canPartition(b) << endl;              // false
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you find the maximum product subarray?",
    answer: `
**Intuition.** Unlike a max *sum*, products flip sign: a large **negative** can become the maximum the instant it's multiplied by another negative. So at each index track **both** the max and the min product ending there. When the current number is negative, the roles swap before you extend.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">track max AND min; a negative makes the min become the max</text>
  <g font-size="12" text-anchor="middle" font-family="ui-monospace,monospace">
    <rect x="80" y="50" width="44" height="34" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/><text x="102" y="72" fill="currentColor">-2</text>
    <rect x="134" y="50" width="44" height="34" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/><text x="156" y="72" fill="currentColor">3</text>
    <rect x="188" y="50" width="44" height="34" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/><text x="210" y="72" fill="currentColor">-4</text>
  </g>
  <text x="156" y="108" fill="currentColor" font-size="10" text-anchor="middle">min after 3 = -6</text>
  <text x="320" y="64" fill="#22c55e" font-size="11">-6 &times; -4 = 24</text>
  <text x="320" y="84" fill="#22c55e" font-size="11" font-weight="bold">max product = 24</text>
</svg>
</div>

### The algorithm
1. Seed <code>best = curMax = curMin = nums[0]</code>.
2. For each later <code>x</code>: if <code>x &lt; 0</code>, swap <code>curMax</code> and <code>curMin</code>.
3. <code>curMax = max(x, curMax * x)</code>; <code>curMin = min(x, curMin * x)</code>.
4. <code>best = max(best, curMax)</code>.

| | Time | Space |
| --- | --- | --- |
| Running max/min | O(n) | **O(1)** |

The <code>max(x, …)</code> restarts the window at <code>x</code> when the running product is worse than starting fresh — exactly how a zero or sign reset is handled.

**Dry run.** <code>[-2,3,-4]</code>: after 3, curMin = -6; at -4 the swap makes <code>-6 &times; -4 = 24</code> the new max → answer **24**.

> **Interview tip:** the headline is "carry the min too, because negatives flip it." Call out zeros — they reset both running products (handled automatically by the <code>max/min(x, …)</code> restart).
`,
    examples: [
      {
        label: "Track running max and min",
        variants: [
          { tech: "python", label: "Python", code: `def max_product(nums):
    best = cur_max = cur_min = nums[0]
    for x in nums[1:]:
        if x < 0:
            cur_max, cur_min = cur_min, cur_max     # negative swaps roles
        cur_max = max(x, cur_max * x)
        cur_min = min(x, cur_min * x)
        best = max(best, cur_max)
    return best


# --- demo ---
print(max_product([2, 3, -2, 4]))   # 6   ([2,3])
print(max_product([-2, 0, -1]))     # 0
print(max_product([-2, 3, -4]))     # 24  (all three)` },
          { tech: "javascript", label: "JavaScript", code: `function maxProduct(nums) {
  let best = nums[0], curMax = nums[0], curMin = nums[0];
  for (let i = 1; i < nums.length; i++) {
    const x = nums[i];
    if (x < 0) { const t = curMax; curMax = curMin; curMin = t; }
    curMax = Math.max(x, curMax * x);
    curMin = Math.min(x, curMin * x);
    best = Math.max(best, curMax);
  }
  return best;
}

// --- demo ---
console.log(maxProduct([2, 3, -2, 4])); // 6
console.log(maxProduct([-2, 0, -1]));   // 0
console.log(maxProduct([-2, 3, -4]));   // 24` },
          { tech: "java", label: "Java", code: `public class Main {
    static int maxProduct(int[] nums) {
        int best = nums[0], curMax = nums[0], curMin = nums[0];
        for (int i = 1; i < nums.length; i++) {
            int x = nums[i];
            if (x < 0) { int t = curMax; curMax = curMin; curMin = t; }
            curMax = Math.max(x, curMax * x);
            curMin = Math.min(x, curMin * x);
            best = Math.max(best, curMax);
        }
        return best;
    }

    public static void main(String[] args) {
        System.out.println(maxProduct(new int[]{2,3,-2,4})); // 6
        System.out.println(maxProduct(new int[]{-2,0,-1}));  // 0
        System.out.println(maxProduct(new int[]{-2,3,-4}));  // 24
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

int maxProduct(vector<int>& nums) {
    int best = nums[0], curMax = nums[0], curMin = nums[0];
    for (int i = 1; i < (int)nums.size(); i++) {
        int x = nums[i];
        if (x < 0) swap(curMax, curMin);
        curMax = max(x, curMax * x);
        curMin = min(x, curMin * x);
        best = max(best, curMax);
    }
    return best;
}

int main() {
    vector<int> a = {2,3,-2,4}, b = {-2,0,-1}, c = {-2,3,-4};
    cout << maxProduct(a) << endl; // 6
    cout << maxProduct(b) << endl; // 0
    cout << maxProduct(c) << endl; // 24
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How does Quickselect find the kth smallest/largest element?",
    answer: `
**Intuition.** Quickselect borrows quicksort's **partition** but throws away half the work: after partitioning around a pivot, the pivot lands in its final sorted position <code>p</code>. If <code>p</code> is the index you want, you're done; otherwise recurse into **only the side** that contains the target. No full sort needed.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">partition; recurse into only the side holding index k</text>
  <g font-size="12" text-anchor="middle" font-family="ui-monospace,monospace">
    <rect x="50" y="55" width="150" height="34" rx="6" fill="#3b82f6" fill-opacity="0.12" stroke="#3b82f6"/><text x="125" y="77" fill="currentColor">&lt; pivot</text>
    <rect x="210" y="55" width="60" height="34" rx="6" fill="#f59e0b" fill-opacity="0.2" stroke="#f59e0b"/><text x="240" y="77" fill="currentColor">pivot</text>
    <rect x="280" y="55" width="180" height="34" rx="6" fill="#8b5cf6" fill-opacity="0.1" stroke="#8b5cf6" stroke-opacity="0.5"/><text x="370" y="77" fill="currentColor" opacity="0.5">&gt; pivot (skip)</text>
  </g>
  <text x="240" y="110" fill="#f59e0b" font-size="10" text-anchor="middle">pivot at final index p</text>
  <text x="125" y="125" fill="#22c55e" font-size="11" text-anchor="middle">k &lt; p → recurse left only</text>
</svg>
</div>

### The algorithm
1. Pick a (ideally **random**) pivot; partition so smaller elements precede it.
2. Let <code>p</code> be the pivot's final index, <code>target = k - 1</code>.
3. If <code>p == target</code> → answer. If <code>target &lt; p</code> → recurse left; else recurse right.

| | Average | Worst |
| --- | --- | --- |
| Quickselect | **O(n)** | O(n&sup2;) |

Each step discards one side, so the average work is <code>n + n/2 + n/4 + … ≈ 2n</code>. A **random** (or median-of-medians) pivot avoids the O(n&sup2;) worst case on adversarial input.

**Dry run.** <code>[7,4,6,3,9,1]</code>, k=2: partitioning eventually places the value **3** at index 1 (= k-1) — the 2nd smallest — and the other side is never explored.

> **Interview tip:** contrast with sorting (O(n log n)) — Quickselect is the go-to when you need *one* order statistic, not the whole order. Stress random pivots for the linear average, and that it's **in-place** (unlike a heap-of-size-k).
`,
    examples: [
      {
        label: "Partition, recurse one side",
        variants: [
          { tech: "python", label: "Python", code: `import random

def quickselect(nums, k):           # k-th smallest, 1-indexed
    target = k - 1

    def partition(lo, hi, pivot_idx):
        pivot = nums[pivot_idx]
        nums[pivot_idx], nums[hi] = nums[hi], nums[pivot_idx]   # park pivot at end
        store = lo
        for i in range(lo, hi):
            if nums[i] < pivot:
                nums[store], nums[i] = nums[i], nums[store]
                store += 1
        nums[hi], nums[store] = nums[store], nums[hi]           # pivot to final spot
        return store

    lo, hi = 0, len(nums) - 1
    while True:
        if lo == hi:
            return nums[lo]
        p = partition(lo, hi, random.randint(lo, hi))
        if p == target:
            return nums[p]
        elif target < p:
            hi = p - 1
        else:
            lo = p + 1


# --- demo ---
print(quickselect([7, 4, 6, 3, 9, 1], 2))   # 3  (2nd smallest)` },
          { tech: "javascript", label: "JavaScript", code: `function quickselect(nums, k) {            // k-th smallest, 1-indexed
  const target = k - 1;
  function partition(lo, hi, pivotIdx) {
    const pivot = nums[pivotIdx];
    [nums[pivotIdx], nums[hi]] = [nums[hi], nums[pivotIdx]];
    let store = lo;
    for (let i = lo; i < hi; i++) {
      if (nums[i] < pivot) { [nums[store], nums[i]] = [nums[i], nums[store]]; store++; }
    }
    [nums[hi], nums[store]] = [nums[store], nums[hi]];
    return store;
  }
  let lo = 0, hi = nums.length - 1;
  while (true) {
    if (lo === hi) return nums[lo];
    const pivotIdx = lo + Math.floor(Math.random() * (hi - lo + 1));
    const p = partition(lo, hi, pivotIdx);
    if (p === target) return nums[p];
    else if (target < p) hi = p - 1;
    else lo = p + 1;
  }
}

// --- demo ---
console.log(quickselect([7, 4, 6, 3, 9, 1], 2)); // 3` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static int[] a;

    static int quickselect(int[] nums, int k) {   // k-th smallest, 1-indexed
        a = nums;
        int target = k - 1, lo = 0, hi = nums.length - 1;
        Random rnd = new Random(42);
        while (true) {
            if (lo == hi) return a[lo];
            int p = partition(lo, hi, lo + rnd.nextInt(hi - lo + 1));
            if (p == target) return a[p];
            else if (target < p) hi = p - 1;
            else lo = p + 1;
        }
    }

    static int partition(int lo, int hi, int pivotIdx) {
        int pivot = a[pivotIdx];
        swap(pivotIdx, hi);
        int store = lo;
        for (int i = lo; i < hi; i++) {
            if (a[i] < pivot) swap(store++, i);
        }
        swap(hi, store);
        return store;
    }

    static void swap(int i, int j) { int t = a[i]; a[i] = a[j]; a[j] = t; }

    public static void main(String[] args) {
        System.out.println(quickselect(new int[]{7,4,6,3,9,1}, 2));   // 3
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

int partitionAround(vector<int>& a, int lo, int hi, int pivotIdx) {
    int pivot = a[pivotIdx];
    swap(a[pivotIdx], a[hi]);
    int store = lo;
    for (int i = lo; i < hi; i++) {
        if (a[i] < pivot) swap(a[store++], a[i]);
    }
    swap(a[hi], a[store]);
    return store;
}

int quickselect(vector<int>& nums, int k) {   // k-th smallest, 1-indexed
    int target = k - 1, lo = 0, hi = nums.size() - 1;
    mt19937 rng(42);
    while (true) {
        if (lo == hi) return nums[lo];
        uniform_int_distribution<int> dist(lo, hi);
        int p = partitionAround(nums, lo, hi, dist(rng));
        if (p == target) return nums[p];
        else if (target < p) hi = p - 1;
        else lo = p + 1;
    }
}

int main() {
    vector<int> nums = {7, 4, 6, 3, 9, 1};
    cout << quickselect(nums, 2) << endl;   // 3
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "What is a monotonic stack and when do you use it?",
    answer: `
**Intuition.** A **monotonic stack** keeps its elements sorted (increasing or decreasing) by **popping** any element that would break the order before pushing the new one. That popping moment is exactly when you've found a "next greater/smaller element," which is why it solves those problems in a single O(n) pass.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">daily temperatures: pop colder days when a warmer one arrives</text>
  <g font-size="11" text-anchor="middle" font-family="ui-monospace,monospace">
    <rect x="60" y="60" width="36" height="34" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/><text x="78" y="82" fill="currentColor">75</text>
    <rect x="100" y="60" width="36" height="34" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/><text x="118" y="82" fill="currentColor">71</text>
    <rect x="140" y="60" width="36" height="34" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/><text x="158" y="82" fill="currentColor">69</text>
    <text x="225" y="82" fill="#f59e0b" font-size="13">← 72 pops 69, 71</text>
  </g>
  <text x="118" y="120" fill="#22c55e" font-size="10" text-anchor="middle">each index pushed &amp; popped once → O(n)</text>
</svg>
</div>

### How it works (next-greater example)
1. Iterate with a stack of **indices**, kept so their values are decreasing.
2. Before pushing <code>i</code>, while the value at the top is smaller than <code>temps[i]</code>, pop it — <code>i</code> is its "next warmer day"; record the distance.
3. Push <code>i</code>. Each index is pushed and popped at most once.

| | Time | Space |
| --- | --- | --- |
| Monotonic stack | O(n) | O(n) |

Classic uses: **next/previous greater or smaller element**, daily temperatures, stock span, largest rectangle in a histogram, trapping rain water.

**Dry run.** <code>[73,74,75,71,69,72,76,73]</code> → wait-days <code>[1,1,4,2,1,1,0,0]</code>: 72 pops 69 (1 day) and 71 (2 days); 76 pops everything still waiting.

> **Interview tip:** the signal to reach for it is "for each element, find the nearest larger/smaller one." Stress the **amortized O(n)** — each element enters and leaves the stack once — which beats the naive O(n&sup2;) scan.
`,
    examples: [
      {
        label: "Daily temperatures (next greater)",
        variants: [
          { tech: "python", label: "Python", code: `def daily_temperatures(temps):
    n = len(temps)
    answer = [0] * n
    stack = []                          # indices, temperatures decreasing
    for i, t in enumerate(temps):
        while stack and temps[stack[-1]] < t:
            j = stack.pop()
            answer[j] = i - j           # days until a warmer temperature
        stack.append(i)
    return answer


# --- demo ---
print(daily_temperatures([73, 74, 75, 71, 69, 72, 76, 73]))
# [1, 1, 4, 2, 1, 1, 0, 0]` },
          { tech: "javascript", label: "JavaScript", code: `function dailyTemperatures(temps) {
  const n = temps.length;
  const answer = new Array(n).fill(0);
  const stack = [];                     // indices, temperatures decreasing
  for (let i = 0; i < n; i++) {
    while (stack.length && temps[stack[stack.length - 1]] < temps[i]) {
      const j = stack.pop();
      answer[j] = i - j;
    }
    stack.push(i);
  }
  return answer;
}

// --- demo ---
console.log(dailyTemperatures([73, 74, 75, 71, 69, 72, 76, 73]));
// [ 1, 1, 4, 2, 1, 1, 0, 0 ]` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static int[] dailyTemperatures(int[] temps) {
        int n = temps.length;
        int[] answer = new int[n];
        Deque<Integer> stack = new ArrayDeque<>();   // indices, temps decreasing
        for (int i = 0; i < n; i++) {
            while (!stack.isEmpty() && temps[stack.peek()] < temps[i]) {
                int j = stack.pop();
                answer[j] = i - j;
            }
            stack.push(i);
        }
        return answer;
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(
            dailyTemperatures(new int[]{73,74,75,71,69,72,76,73})));
        // [1, 1, 4, 2, 1, 1, 0, 0]
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

vector<int> dailyTemperatures(vector<int>& temps) {
    int n = temps.size();
    vector<int> answer(n, 0);
    stack<int> st;                       // indices, temperatures decreasing
    for (int i = 0; i < n; i++) {
        while (!st.empty() && temps[st.top()] < temps[i]) {
            int j = st.top(); st.pop();
            answer[j] = i - j;
        }
        st.push(i);
    }
    return answer;
}

int main() {
    vector<int> temps = {73, 74, 75, 71, 69, 72, 76, 73};
    for (int x : dailyTemperatures(temps)) cout << x << " ";
    cout << endl;   // 1 1 4 2 1 1 0 0
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "What is binary search on the answer?",
    answer: `
**Intuition.** Sometimes you binary-search a **value**, not an array index. It works whenever feasibility is **monotonic**: if some candidate answer works, every value past it also works (or every value before it). You search the answer range and use a cheap **feasibility check** at each midpoint to decide which half to keep.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 140" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">monotone feasibility → binary-search the threshold (Koko: speed 4)</text>
  <rect x="40" y="50" width="200" height="28" rx="6" fill="#ef4444" fill-opacity="0.14" stroke="#ef4444" stroke-opacity="0.5"/><text x="140" y="69" fill="currentColor" font-size="11" text-anchor="middle">too slow (infeasible)</text>
  <rect x="240" y="50" width="220" height="28" rx="6" fill="#22c55e" fill-opacity="0.16" stroke="#22c55e"/><text x="350" y="69" fill="currentColor" font-size="11" text-anchor="middle">fast enough (feasible)</text>
  <line x1="240" y1="44" x2="240" y2="84" stroke="#f59e0b" stroke-width="2"/>
  <text x="240" y="104" fill="#f59e0b" font-size="11" text-anchor="middle">smallest feasible = answer</text>
</svg>
</div>

### The pattern
1. Identify the answer's range <code>[lo, hi]</code> (e.g. speed 1 … max pile).
2. While <code>lo &lt; hi</code>: take <code>mid</code>; if <code>feasible(mid)</code>, keep the lower half (<code>hi = mid</code>); else raise the floor (<code>lo = mid + 1</code>).
3. <code>lo</code> converges on the smallest feasible value.

| | Time |
| --- | --- |
| Binary search on answer | O(log(range) &middot; checkCost) |

The art is writing <code>feasible(x)</code> — a predicate that's monotone in <code>x</code>. Classic problems: **Koko eating bananas**, ship-within-D-days capacity, split-array largest sum, minimize max distance.

**Dry run (Koko, piles <code>[3,6,7,11]</code>, 8 hours).** Speeds 1–11; speed 4 needs <code>1+2+2+3 = 8</code> hours (feasible) while speed 3 needs 9 (too slow) → minimum **4**.

> **Interview tip:** the trigger phrase is "minimize the maximum" or "largest/smallest value that still satisfies a constraint." Once feasibility is monotone, it's a textbook binary search — the only real work is the predicate and the right <code>lo</code>/<code>hi</code> bounds.
`,
    examples: [
      {
        label: "Koko eating bananas",
        variants: [
          { tech: "python", label: "Python", code: `def min_eating_speed(piles, hours):
    def hours_needed(speed):
        return sum((p + speed - 1) // speed for p in piles)   # ceil division
    lo, hi = 1, max(piles)
    while lo < hi:
        mid = (lo + hi) // 2
        if hours_needed(mid) <= hours:
            hi = mid             # feasible — try slower
        else:
            lo = mid + 1         # too slow — speed up
    return lo


# --- demo ---
print(min_eating_speed([3, 6, 7, 11], 8))        # 4
print(min_eating_speed([30, 11, 23, 4, 20], 5))  # 30` },
          { tech: "javascript", label: "JavaScript", code: `function minEatingSpeed(piles, hours) {
  const hoursNeeded = (speed) =>
    piles.reduce((sum, p) => sum + Math.ceil(p / speed), 0);
  let lo = 1, hi = Math.max(...piles);
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (hoursNeeded(mid) <= hours) hi = mid;   // feasible — try slower
    else lo = mid + 1;                         // too slow — speed up
  }
  return lo;
}

// --- demo ---
console.log(minEatingSpeed([3, 6, 7, 11], 8));        // 4
console.log(minEatingSpeed([30, 11, 23, 4, 20], 5));  // 30` },
          { tech: "java", label: "Java", code: `public class Main {
    static long hoursNeeded(int[] piles, int speed) {
        long h = 0;
        for (int p : piles) h += (p + speed - 1) / speed;   // ceil division
        return h;
    }

    static int minEatingSpeed(int[] piles, int hours) {
        int lo = 1, hi = 0;
        for (int p : piles) hi = Math.max(hi, p);
        while (lo < hi) {
            int mid = (lo + hi) >>> 1;
            if (hoursNeeded(piles, mid) <= hours) hi = mid;
            else lo = mid + 1;
        }
        return lo;
    }

    public static void main(String[] args) {
        System.out.println(minEatingSpeed(new int[]{3,6,7,11}, 8));       // 4
        System.out.println(minEatingSpeed(new int[]{30,11,23,4,20}, 5));  // 30
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

long hoursNeeded(vector<int>& piles, int speed) {
    long h = 0;
    for (int p : piles) h += (p + speed - 1) / speed;   // ceil division
    return h;
}

int minEatingSpeed(vector<int>& piles, int hours) {
    int lo = 1, hi = *max_element(piles.begin(), piles.end());
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (hoursNeeded(piles, mid) <= hours) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}

int main() {
    vector<int> a = {3, 6, 7, 11}, b = {30, 11, 23, 4, 20};
    cout << minEatingSpeed(a, 8) << endl;    // 4
    cout << minEatingSpeed(b, 5) << endl;    // 30
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "Find the kth largest element in an array",
    answer: `
**Intuition.** You don't need the array fully sorted — just the kth largest. Keep a **min-heap of size k** holding the k largest values seen so far. Its smallest element (the root) is, by definition, the kth largest. Push every number and pop whenever the heap grows past k.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">min-heap of size k → its root is the kth largest</text>
  <text x="20" y="46" fill="currentColor" font-size="11" font-family="ui-monospace,monospace">[3,2,1,5,6,4]  k=2</text>
  <rect x="150" y="60" width="120" height="60" rx="10" fill="#22c55e" fill-opacity="0.06" stroke="#22c55e" stroke-opacity="0.4"/>
  <text x="210" y="80" fill="#22c55e" font-size="11" text-anchor="middle">2 largest</text>
  <text x="210" y="102" fill="currentColor" font-size="13" text-anchor="middle" font-family="ui-monospace,monospace">[5, 6]</text>
  <text x="320" y="86" fill="#f59e0b" font-size="16">→</text>
  <text x="410" y="82" fill="#22c55e" font-size="12" text-anchor="middle">root = 5</text>
  <text x="410" y="100" fill="currentColor" font-size="10" text-anchor="middle" opacity="0.6">= 2nd largest</text>
</svg>
</div>

### The algorithm
1. Min-heap, initially empty.
2. For each number, push it; if the heap size exceeds k, pop the smallest.
3. After the pass the heap holds exactly the k largest values, and its root is the answer.

| Approach | Time | Space |
| --- | --- | --- |
| Min-heap of size k | O(n log k) | O(k) |
| Quickselect | avg O(n) | O(1) |
| Sort then index | O(n log n) | O(1) |

**Quickselect** is asymptotically best for a one-shot query (average linear), while the size-k heap shines for a **stream** where n is huge or unbounded.

**Dry run (k=2).** Pushing <code>3,2,1,5,6,4</code> while capping at 2 leaves the heap holding <code>{5, 6}</code>; its root **5** is the 2nd largest.

> **Interview tip:** "kth largest" → min-heap of size k; "kth smallest" → max-heap of size k (mirror it). If asked for the optimum, reach for **Quickselect** (average O(n)); the heap is the clean, streaming-friendly answer. See also [[project-dsa-answer-enrichment]] companion question on Quickselect.
`,
    examples: [
      {
        label: "Min-heap of size k",
        variants: [
          { tech: "python", label: "Python", code: `import heapq

def find_kth_largest(nums, k):
    heap = []                       # min-heap of the k largest so far
    for x in nums:
        heapq.heappush(heap, x)
        if len(heap) > k:
            heapq.heappop(heap)     # drop the smallest
    return heap[0]                  # root = kth largest


# --- demo ---
print(find_kth_largest([3, 2, 1, 5, 6, 4], 2))            # 5
print(find_kth_largest([3, 2, 3, 1, 2, 4, 5, 5, 6], 4))   # 4` },
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

function findKthLargest(nums, k) {
  const heap = new Heap((x, y) => x < y);   // min-heap
  for (const x of nums) {
    heap.push(x);
    if (heap.size() > k) heap.pop();
  }
  return heap.peek();
}

// --- demo ---
console.log(findKthLargest([3, 2, 1, 5, 6, 4], 2));           // 5
console.log(findKthLargest([3, 2, 3, 1, 2, 4, 5, 5, 6], 4));  // 4` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static int findKthLargest(int[] nums, int k) {
        PriorityQueue<Integer> heap = new PriorityQueue<>();   // min-heap
        for (int x : nums) {
            heap.add(x);
            if (heap.size() > k) heap.poll();
        }
        return heap.peek();
    }

    public static void main(String[] args) {
        System.out.println(findKthLargest(new int[]{3,2,1,5,6,4}, 2));         // 5
        System.out.println(findKthLargest(new int[]{3,2,3,1,2,4,5,5,6}, 4));   // 4
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

int findKthLargest(vector<int>& nums, int k) {
    priority_queue<int, vector<int>, greater<int>> heap;   // min-heap
    for (int x : nums) {
        heap.push(x);
        if ((int)heap.size() > k) heap.pop();
    }
    return heap.top();
}

int main() {
    vector<int> a = {3,2,1,5,6,4}, b = {3,2,3,1,2,4,5,5,6};
    cout << findKthLargest(a, 2) << endl;   // 5
    cout << findKthLargest(b, 4) << endl;   // 4
    return 0;
}` },
        ],
      },
    ],
  },
];

export default augments;
