/**
 * DSA augment batch 7 — dsa-3.json arrays/strings (part 2) + first linked list.
 * See dsa-augments.types.ts for the authoring rules (no "${", no raw backticks
 * inside these template literals; inline code uses <code> tags).
 */
import type { DsaAugment } from "./dsa-augments.types";

const augments: DsaAugment[] = [
  {
    title: "How do you count subarrays that sum to k?",
    answer: `
**Intuition.** A subarray sum equals <code>prefix[j] − prefix[i]</code>. So a subarray ending at <code>j</code> sums to <code>k</code> exactly when an earlier prefix equals <code>prefix[j] − k</code>. Keep a running prefix sum and a **hash map of how many times each prefix value has occurred** — then each step adds those matches in O(1).

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">k=3: at prefix 6, look up prefix 6−3=3 seen before</text>
  <g font-size="12" text-anchor="middle">
    <rect x="40" y="36" width="60" height="32" rx="5" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/><text x="70" y="57" fill="currentColor">1</text>
    <rect x="104" y="36" width="60" height="32" rx="5" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/><text x="134" y="57" fill="currentColor">2</text>
    <rect x="168" y="36" width="60" height="32" rx="5" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="198" y="57" fill="currentColor">1</text>
    <rect x="232" y="36" width="60" height="32" rx="5" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="262" y="57" fill="currentColor">3</text>
  </g>
  <g font-size="10" fill="#3b82f6" text-anchor="middle">
    <text x="70" y="86">pre=1</text><text x="134" y="86">pre=3</text><text x="198" y="86">pre=4</text><text x="262" y="86">pre=7</text>
  </g>
  <text x="300" y="120" fill="#22c55e" font-size="11" text-anchor="middle">[3] and [1,2] both reach a +3 window → count grows</text>
</svg>
</div>

### The algorithm
1. <code>counts = {0: 1}</code> (empty prefix), running <code>sum = 0</code>, <code>total = 0</code>.
2. For each <code>x</code>: <code>sum += x</code>; add <code>counts[sum − k]</code> to <code>total</code>.
3. Increment <code>counts[sum]</code>.

| Approach | Time | Space |
| --- | --- | --- |
| Prefix sum + hash map | **O(n)** | O(n) |
| Check every subarray | O(n²) | O(1) |

The <code>{0: 1}</code> seed matters — it counts subarrays starting at index 0 (where the whole prefix itself equals <code>k</code>). This works with negatives too, which is why a sliding window (which assumes monotonic sums) does **not** apply here.

**Dry run ([1,2,1,3], k=3).** prefixes 1,3,4,7. At pre=3, look for 0 → found (count 1). At pre=4, look for 1 → found → another. At pre=7, look for 4 → found. Total = **3** ([1,2], [3], [2,1]).

> **Interview tip:** the seed <code>counts[0] = 1</code> is the classic off-by-one trap. Emphasise that this handles **negative numbers** — the reason you can't just slide a window like the all-positive variant.
`,
    examples: [
      {
        label: "Prefix sum + hash map",
        variants: [
          { tech: "python", label: "Python", code: `def subarray_sum(nums, k):
    counts = {0: 1}
    total = run = 0
    for x in nums:
        run += x
        total += counts.get(run - k, 0)
        counts[run] = counts.get(run, 0) + 1
    return total


# --- demo ---
print(subarray_sum([1, 1, 1], 2))   # 2
print(subarray_sum([1, 2, 3], 3))   # 2  ([1,2] and [3])` },
          { tech: "javascript", label: "JavaScript", code: `function subarraySum(nums, k) {
  const counts = new Map([[0, 1]]);
  let total = 0, run = 0;
  for (const x of nums) {
    run += x;
    total += counts.get(run - k) || 0;
    counts.set(run, (counts.get(run) || 0) + 1);
  }
  return total;
}

// --- demo ---
console.log(subarraySum([1, 1, 1], 2)); // 2
console.log(subarraySum([1, 2, 3], 3)); // 2` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static int subarraySum(int[] nums, int k) {
        Map<Integer,Integer> counts = new HashMap<>();
        counts.put(0, 1);
        int total = 0, run = 0;
        for (int x : nums) {
            run += x;
            total += counts.getOrDefault(run - k, 0);
            counts.merge(run, 1, Integer::sum);
        }
        return total;
    }

    public static void main(String[] args) {
        System.out.println(subarraySum(new int[]{1, 1, 1}, 2)); // 2
        System.out.println(subarraySum(new int[]{1, 2, 3}, 3)); // 2
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

int subarraySum(vector<int>& nums, int k) {
    unordered_map<int,int> counts{{0, 1}};
    int total = 0, run = 0;
    for (int x : nums) {
        run += x;
        total += counts.count(run - k) ? counts[run - k] : 0;
        counts[run]++;
    }
    return total;
}

int main() {
    vector<int> a = {1, 1, 1};
    cout << subarraySum(a, 2) << endl;   // 2
    vector<int> b = {1, 2, 3};
    cout << subarraySum(b, 3) << endl;   // 2
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you traverse a matrix in spiral order?",
    answer: `
**Intuition.** Peel the matrix like an onion. Keep four boundaries — <code>top</code>, <code>bottom</code>, <code>left</code>, <code>right</code> — and walk right along the top, down the right, left along the bottom, up the left. After each edge, shrink that boundary inward. Repeat until the boundaries cross.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 180" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">right → down → left → up, shrinking each round</text>
  <g font-size="13" text-anchor="middle">
    <rect x="160" y="30" width="40" height="40" fill="#3b82f6" fill-opacity="0.18" stroke="#3b82f6"/><text x="180" y="55" fill="currentColor">1</text>
    <rect x="200" y="30" width="40" height="40" fill="#3b82f6" fill-opacity="0.18" stroke="#3b82f6"/><text x="220" y="55" fill="currentColor">2</text>
    <rect x="240" y="30" width="40" height="40" fill="#3b82f6" fill-opacity="0.18" stroke="#3b82f6"/><text x="260" y="55" fill="currentColor">3</text>
    <rect x="160" y="70" width="40" height="40" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="180" y="95" fill="currentColor">8</text>
    <rect x="200" y="70" width="40" height="40" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="220" y="95" fill="currentColor">9</text>
    <rect x="240" y="70" width="40" height="40" fill="#f59e0b" fill-opacity="0.18" stroke="#f59e0b"/><text x="260" y="95" fill="currentColor">4</text>
    <rect x="160" y="110" width="40" height="40" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="180" y="135" fill="currentColor">7</text>
    <rect x="200" y="110" width="40" height="40" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="220" y="135" fill="currentColor">6</text>
    <rect x="240" y="110" width="40" height="40" fill="#f59e0b" fill-opacity="0.18" stroke="#f59e0b"/><text x="260" y="135" fill="currentColor">5</text>
  </g>
  <path d="M180,50 L260,50 L260,130 L180,130 L180,90 L220,90" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="320" stroke-dashoffset="320" marker-end="url(#sp)"><animate attributeName="stroke-dashoffset" values="320;0" dur="2.5s" repeatCount="indefinite"/></path>
  <text x="380" y="80" fill="currentColor" font-size="11">order:</text>
  <text x="380" y="100" fill="#22c55e" font-size="11">1 2 3 4 5 6 7 8 9</text>
  <defs><marker id="sp" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#ef4444"/></marker></defs>
</svg>
</div>

### The algorithm
1. <code>top=0, bottom=rows−1, left=0, right=cols−1</code>.
2. Walk left→right along <code>top</code>, then <code>top++</code>.
3. Walk top→bottom along <code>right</code>, then <code>right−−</code>.
4. If <code>top ≤ bottom</code>: walk right→left along <code>bottom</code>, then <code>bottom−−</code>.
5. If <code>left ≤ right</code>: walk bottom→top along <code>left</code>, then <code>left++</code>.
6. Repeat while <code>top ≤ bottom</code> and <code>left ≤ right</code>.

| | Time | Space |
| --- | --- | --- |
| Boundary shrinking | O(rows × cols) | O(1) extra |

The two guard checks in steps 4–5 prevent re-visiting a row/column when the matrix is non-square or collapses to a single line.

**Dry run (3×3).** Top row 1,2,3 → right col 4,5 → bottom row 6,7 → left col 8 → inner 9. Order **1..9**.

> **Interview tip:** the bugs live in the boundary updates and the guard conditions for the bottom/left passes — walk through a 1×n and an n×1 case aloud to show your bounds are airtight.
`,
    examples: [
      {
        label: "Four-boundary spiral",
        variants: [
          { tech: "python", label: "Python", code: `def spiral_order(matrix):
    if not matrix: return []
    top, bottom = 0, len(matrix) - 1
    left, right = 0, len(matrix[0]) - 1
    res = []
    while top <= bottom and left <= right:
        for c in range(left, right + 1): res.append(matrix[top][c])
        top += 1
        for r in range(top, bottom + 1): res.append(matrix[r][right])
        right -= 1
        if top <= bottom:
            for c in range(right, left - 1, -1): res.append(matrix[bottom][c])
            bottom -= 1
        if left <= right:
            for r in range(bottom, top - 1, -1): res.append(matrix[r][left])
            left += 1
    return res


# --- demo ---
print(spiral_order([[1, 2, 3], [8, 9, 4], [7, 6, 5]]))
# [1, 2, 3, 4, 5, 6, 7, 8, 9]` },
          { tech: "javascript", label: "JavaScript", code: `function spiralOrder(matrix) {
  if (!matrix.length) return [];
  let top = 0, bottom = matrix.length - 1;
  let left = 0, right = matrix[0].length - 1;
  const res = [];
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) res.push(matrix[top][c]);
    top++;
    for (let r = top; r <= bottom; r++) res.push(matrix[r][right]);
    right--;
    if (top <= bottom) {
      for (let c = right; c >= left; c--) res.push(matrix[bottom][c]);
      bottom--;
    }
    if (left <= right) {
      for (let r = bottom; r >= top; r--) res.push(matrix[r][left]);
      left++;
    }
  }
  return res;
}

// --- demo ---
console.log(spiralOrder([[1, 2, 3], [8, 9, 4], [7, 6, 5]]));
// [1, 2, 3, 4, 5, 6, 7, 8, 9]` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static List<Integer> spiralOrder(int[][] matrix) {
        List<Integer> res = new ArrayList<>();
        if (matrix.length == 0) return res;
        int top = 0, bottom = matrix.length - 1;
        int left = 0, right = matrix[0].length - 1;
        while (top <= bottom && left <= right) {
            for (int c = left; c <= right; c++) res.add(matrix[top][c]);
            top++;
            for (int r = top; r <= bottom; r++) res.add(matrix[r][right]);
            right--;
            if (top <= bottom) {
                for (int c = right; c >= left; c--) res.add(matrix[bottom][c]);
                bottom--;
            }
            if (left <= right) {
                for (int r = bottom; r >= top; r--) res.add(matrix[r][left]);
                left++;
            }
        }
        return res;
    }

    public static void main(String[] args) {
        int[][] m = {{1,2,3},{8,9,4},{7,6,5}};
        System.out.println(spiralOrder(m)); // [1, 2, 3, 4, 5, 6, 7, 8, 9]
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

vector<int> spiralOrder(vector<vector<int>>& matrix) {
    vector<int> res;
    if (matrix.empty()) return res;
    int top = 0, bottom = matrix.size() - 1;
    int left = 0, right = matrix[0].size() - 1;
    while (top <= bottom && left <= right) {
        for (int c = left; c <= right; c++) res.push_back(matrix[top][c]);
        top++;
        for (int r = top; r <= bottom; r++) res.push_back(matrix[r][right]);
        right--;
        if (top <= bottom) {
            for (int c = right; c >= left; c--) res.push_back(matrix[bottom][c]);
            bottom--;
        }
        if (left <= right) {
            for (int r = bottom; r >= top; r--) res.push_back(matrix[r][left]);
            left++;
        }
    }
    return res;
}

int main() {
    vector<vector<int>> m = {{1,2,3},{8,9,4},{7,6,5}};
    for (int x : spiralOrder(m)) cout << x << " ";
    cout << endl;   // 1 2 3 4 5 6 7 8 9
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you rotate an N×N matrix by 90 degrees in place?",
    answer: `
**Intuition.** A clockwise 90° rotation is two simple in-place steps: **transpose** the matrix (swap across the main diagonal), then **reverse each row**. Together they move every element to its rotated position without an extra matrix.

<div style="margin:1.25rem auto;max-width:540px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
<div style="flex:1 1 150px;border:1px solid rgba(139,92,246,0.25);border-radius:12px;padding:10px;background:rgba(139,92,246,0.04);text-align:center">
<svg viewBox="0 0 150 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="75" y="16" fill="currentColor" font-size="11" text-anchor="middle" opacity="0.7">original</text>
  <g font-size="13" text-anchor="middle">
    <rect x="30" y="30" width="30" height="30" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="45" y="50" fill="currentColor">1</text>
    <rect x="60" y="30" width="30" height="30" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="75" y="50" fill="currentColor">2</text>
    <rect x="90" y="30" width="30" height="30" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="105" y="50" fill="currentColor">3</text>
    <rect x="30" y="60" width="30" height="30" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="45" y="80" fill="currentColor">4</text>
    <rect x="60" y="60" width="30" height="30" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="75" y="80" fill="currentColor">5</text>
    <rect x="90" y="60" width="30" height="30" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="105" y="80" fill="currentColor">6</text>
    <rect x="30" y="90" width="30" height="30" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="45" y="110" fill="currentColor">7</text>
    <rect x="60" y="90" width="30" height="30" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="75" y="110" fill="currentColor">8</text>
    <rect x="90" y="90" width="30" height="30" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="105" y="110" fill="currentColor">9</text>
  </g>
</svg>
</div>
<div style="flex:1 1 150px;border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:10px;background:rgba(245,158,11,0.05);text-align:center">
<svg viewBox="0 0 150 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="75" y="16" fill="#f59e0b" font-size="11" text-anchor="middle">transpose</text>
  <g font-size="13" text-anchor="middle">
    <rect x="30" y="30" width="30" height="30" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/><text x="45" y="50" fill="currentColor">1</text>
    <rect x="60" y="30" width="30" height="30" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/><text x="75" y="50" fill="currentColor">4</text>
    <rect x="90" y="30" width="30" height="30" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/><text x="105" y="50" fill="currentColor">7</text>
    <rect x="30" y="60" width="30" height="30" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/><text x="45" y="80" fill="currentColor">2</text>
    <rect x="60" y="60" width="30" height="30" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/><text x="75" y="80" fill="currentColor">5</text>
    <rect x="90" y="60" width="30" height="30" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/><text x="105" y="80" fill="currentColor">8</text>
    <rect x="30" y="90" width="30" height="30" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/><text x="45" y="110" fill="currentColor">3</text>
    <rect x="60" y="90" width="30" height="30" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/><text x="75" y="110" fill="currentColor">6</text>
    <rect x="90" y="90" width="30" height="30" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/><text x="105" y="110" fill="currentColor">9</text>
  </g>
</svg>
</div>
<div style="flex:1 1 150px;border:1px solid rgba(34,197,94,0.3);border-radius:12px;padding:10px;background:rgba(34,197,94,0.05);text-align:center">
<svg viewBox="0 0 150 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="75" y="16" fill="#22c55e" font-size="11" text-anchor="middle">reverse rows</text>
  <g font-size="13" text-anchor="middle">
    <rect x="30" y="30" width="30" height="30" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/><text x="45" y="50" fill="currentColor">7</text>
    <rect x="60" y="30" width="30" height="30" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/><text x="75" y="50" fill="currentColor">4</text>
    <rect x="90" y="30" width="30" height="30" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/><text x="105" y="50" fill="currentColor">1</text>
    <rect x="30" y="60" width="30" height="30" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/><text x="45" y="80" fill="currentColor">8</text>
    <rect x="60" y="60" width="30" height="30" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/><text x="75" y="80" fill="currentColor">5</text>
    <rect x="90" y="60" width="30" height="30" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/><text x="105" y="80" fill="currentColor">2</text>
    <rect x="30" y="90" width="30" height="30" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/><text x="45" y="110" fill="currentColor">9</text>
    <rect x="60" y="90" width="30" height="30" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/><text x="75" y="110" fill="currentColor">6</text>
    <rect x="90" y="90" width="30" height="30" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/><text x="105" y="110" fill="currentColor">3</text>
  </g>
</svg>
</div>
</div>

### The two steps (clockwise)
1. **Transpose:** for <code>i &lt; j</code>, swap <code>m[i][j]</code> with <code>m[j][i]</code>.
2. **Reverse each row.**

| | Time | Space |
| --- | --- | --- |
| Transpose + reverse | O(n²) | **O(1)** |

To rotate **counter-clockwise**, transpose then reverse each *column* (or reverse rows first, then transpose).

**Dry run.** [[1,2,3],[4,5,6],[7,8,9]] → transpose → [[1,4,7],[2,5,8],[3,6,9]] → reverse rows → **[[7,4,1],[8,5,2],[9,6,3]]**.

> **Interview tip:** transposing only the upper triangle (<code>j</code> from <code>i+1</code>) avoids double-swapping back to the original — a subtle bug if you loop over all <code>i,j</code>. Know the counter-clockwise variant too.
`,
    examples: [
      {
        label: "Transpose then reverse rows",
        variants: [
          { tech: "python", label: "Python", code: `def rotate(matrix):
    n = len(matrix)
    for i in range(n):                 # transpose (upper triangle)
        for j in range(i + 1, n):
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
    for row in matrix:                 # reverse each row
        row.reverse()
    return matrix


# --- demo ---
print(rotate([[1, 2, 3], [4, 5, 6], [7, 8, 9]]))
# [[7, 4, 1], [8, 5, 2], [9, 6, 3]]` },
          { tech: "javascript", label: "JavaScript", code: `function rotate(matrix) {
  const n = matrix.length;
  for (let i = 0; i < n; i++)          // transpose
    for (let j = i + 1; j < n; j++)
      [matrix[i][j], matrix[j][i]] = [matrix[j][i], matrix[i][j]];
  for (const row of matrix) row.reverse(); // reverse rows
  return matrix;
}

// --- demo ---
console.log(JSON.stringify(rotate([[1,2,3],[4,5,6],[7,8,9]])));
// [[7,4,1],[8,5,2],[9,6,3]]` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static void rotate(int[][] matrix) {
        int n = matrix.length;
        for (int i = 0; i < n; i++)         // transpose
            for (int j = i + 1; j < n; j++) {
                int t = matrix[i][j];
                matrix[i][j] = matrix[j][i];
                matrix[j][i] = t;
            }
        for (int[] row : matrix) {          // reverse each row
            for (int l = 0, r = n - 1; l < r; l++, r--) {
                int t = row[l]; row[l] = row[r]; row[r] = t;
            }
        }
    }

    public static void main(String[] args) {
        int[][] m = {{1,2,3},{4,5,6},{7,8,9}};
        rotate(m);
        System.out.println(Arrays.deepToString(m)); // [[7, 4, 1], [8, 5, 2], [9, 6, 3]]
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

void rotateMatrix(vector<vector<int>>& matrix) {
    int n = matrix.size();
    for (int i = 0; i < n; i++)         // transpose
        for (int j = i + 1; j < n; j++)
            swap(matrix[i][j], matrix[j][i]);
    for (auto& row : matrix)            // reverse each row
        reverse(row.begin(), row.end());
}

int main() {
    vector<vector<int>> m = {{1,2,3},{4,5,6},{7,8,9}};
    rotateMatrix(m);
    for (auto& row : m) { for (int x : row) cout << x << " "; cout << "| "; }
    cout << endl;   // 7 4 1 | 8 5 2 | 9 6 3 |
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you find the longest palindromic substring?",
    answer: `
**Intuition.** Every palindrome has a center. There are <code>2n−1</code> possible centers (each character, and each gap between characters). **Expand around each center** outward while the two sides match, and remember the longest palindrome you grow.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 140" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace,monospace">
  <text x="14" y="18" fill="currentColor" font-size="12" opacity="0.7" font-family="ui-sans-serif,system-ui">"babad": expand around center 'a' → "bab"</text>
  <g font-size="18" text-anchor="middle">
    <text x="100" y="70" fill="currentColor">b</text>
    <text x="160" y="70" fill="#22c55e" font-weight="700">a</text>
    <text x="220" y="70" fill="currentColor">b</text>
    <text x="280" y="70" fill="currentColor" opacity="0.5">a</text>
    <text x="340" y="70" fill="currentColor" opacity="0.5">d</text>
  </g>
  <path d="M160,82 Q160,110 100,90" fill="none" stroke="#f59e0b" stroke-width="2" marker-end="url(#pal)"/>
  <path d="M160,82 Q160,110 220,90" fill="none" stroke="#f59e0b" stroke-width="2" marker-end="url(#pal)"/>
  <text x="160" y="44" fill="#22c55e" font-size="11" text-anchor="middle" font-family="ui-sans-serif,system-ui">center</text>
  <text x="160" y="128" fill="currentColor" font-size="11" text-anchor="middle" font-family="ui-sans-serif,system-ui">b == b → expand; next would go out of a palindrome</text>
  <defs><marker id="pal" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#f59e0b"/></marker></defs>
</svg>
</div>

### The algorithm
1. For each index <code>i</code>: expand around the **odd** center <code>(i, i)</code> and the **even** center <code>(i, i+1)</code>.
2. Each expansion grows while <code>s[left] == s[right]</code> and bounds hold.
3. Track the longest span found.

| Approach | Time | Space |
| --- | --- | --- |
| Expand around center | O(n²) | **O(1)** |
| DP table | O(n²) | O(n²) |
| Manacher's algorithm | **O(n)** | O(n) |

The odd/even split handles palindromes of both parities ("aba" vs "abba").

**Dry run ("babad").** Center 'a' (index 1): b==b expand → "bab"; next out of bounds → stop, length 3. Center 'a' (index 3): "aba" also length 3. Answer **"bab"** (or "aba").

> **Interview tip:** remember the **even-length centers** — forgetting them misses palindromes like "abba". Mention Manacher's for the O(n) follow-up, but expand-around-center is the expected, clean O(n²)/O(1) answer.
`,
    examples: [
      {
        label: "Expand around center",
        variants: [
          { tech: "python", label: "Python", code: `def longest_palindrome(s):
    if not s: return ""
    start, end = 0, 0
    def expand(l, r):
        while l >= 0 and r < len(s) and s[l] == s[r]:
            l -= 1; r += 1
        return l + 1, r - 1
    for i in range(len(s)):
        for l, r in (expand(i, i), expand(i, i + 1)):
            if r - l > end - start:
                start, end = l, r
    return s[start:end + 1]


# --- demo ---
print(longest_palindrome("babad"))   # bab (or aba)
print(longest_palindrome("cbbd"))    # bb` },
          { tech: "javascript", label: "JavaScript", code: `function longestPalindrome(s) {
  if (!s) return "";
  let start = 0, end = 0;
  const expand = (l, r) => {
    while (l >= 0 && r < s.length && s[l] === s[r]) { l--; r++; }
    return [l + 1, r - 1];
  };
  for (let i = 0; i < s.length; i++) {
    for (const [l, r] of [expand(i, i), expand(i, i + 1)]) {
      if (r - l > end - start) { start = l; end = r; }
    }
  }
  return s.slice(start, end + 1);
}

// --- demo ---
console.log(longestPalindrome("babad")); // bab
console.log(longestPalindrome("cbbd"));  // bb` },
          { tech: "java", label: "Java", code: `public class Main {
    static String longestPalindrome(String s) {
        if (s.isEmpty()) return "";
        int start = 0, end = 0;
        for (int i = 0; i < s.length(); i++) {
            int[] a = expand(s, i, i), b = expand(s, i, i + 1);
            if (a[1] - a[0] > end - start) { start = a[0]; end = a[1]; }
            if (b[1] - b[0] > end - start) { start = b[0]; end = b[1]; }
        }
        return s.substring(start, end + 1);
    }

    static int[] expand(String s, int l, int r) {
        while (l >= 0 && r < s.length() && s.charAt(l) == s.charAt(r)) { l--; r++; }
        return new int[]{l + 1, r - 1};
    }

    public static void main(String[] args) {
        System.out.println(longestPalindrome("babad")); // bab
        System.out.println(longestPalindrome("cbbd"));  // bb
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

string longestPalindrome(string s) {
    if (s.empty()) return "";
    int start = 0, end = 0;
    auto expand = [&](int l, int r) {
        while (l >= 0 && r < (int)s.size() && s[l] == s[r]) { l--; r++; }
        if (r - 1 - (l + 1) > end - start) { start = l + 1; end = r - 1; }
    };
    for (int i = 0; i < (int)s.size(); i++) {
        expand(i, i);
        expand(i, i + 1);
    }
    return s.substr(start, end - start + 1);
}

int main() {
    cout << longestPalindrome("babad") << endl;   // bab
    cout << longestPalindrome("cbbd") << endl;     // bb
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you find the single number where every other element appears twice?",
    answer: `
**Intuition.** XOR is the perfect tool: <code>x ^ x = 0</code> and <code>x ^ 0 = x</code>. XOR every element together — each pair cancels to 0, and the lone element is left standing. O(n) time, O(1) space, no hash set.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 120" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="18" fill="currentColor" font-size="12" opacity="0.7">[4,1,2,1,2] → pairs cancel, 4 remains</text>
  <g font-size="14" text-anchor="middle" font-family="ui-monospace,monospace">
    <text x="60" y="60" fill="#22c55e">4</text>
    <text x="100" y="60" fill="currentColor">^</text>
    <text x="140" y="60" fill="#ef4444">1</text>
    <text x="180" y="60" fill="currentColor">^</text>
    <text x="220" y="60" fill="#8b5cf6">2</text>
    <text x="260" y="60" fill="currentColor">^</text>
    <text x="300" y="60" fill="#ef4444">1</text>
    <text x="340" y="60" fill="currentColor">^</text>
    <text x="380" y="60" fill="#8b5cf6">2</text>
    <text x="420" y="60" fill="currentColor">=</text>
    <text x="460" y="60" fill="#22c55e" font-weight="700">4</text>
  </g>
  <path d="M140,72 Q220,100 300,72" fill="none" stroke="#ef4444" stroke-opacity="0.5" stroke-dasharray="4 3"/>
  <path d="M220,74 Q300,108 380,74" fill="none" stroke="#8b5cf6" stroke-opacity="0.5" stroke-dasharray="4 3"/>
  <text x="220" y="108" fill="currentColor" font-size="10" text-anchor="middle" opacity="0.6">1^1=0, 2^2=0</text>
</svg>
</div>

### Why XOR works
XOR is **commutative and associative**, so you can reorder the elements freely: <code>(1^1) ^ (2^2) ^ 4 = 0 ^ 0 ^ 4 = 4</code>. The duplicates pair off regardless of position.

| Approach | Time | Space |
| --- | --- | --- |
| **XOR fold** | O(n) | **O(1)** |
| Hash set (add/remove) | O(n) | O(n) |
| Sum trick (2·set − all) | O(n) | O(n) for the set |

**Dry run.** 4 ^ 1 ^ 2 ^ 1 ^ 2 → reorder → 4 ^ (1^1) ^ (2^2) → 4 ^ 0 ^ 0 → **4**.

**Variants:** "every element appears 3× except one" needs bit-by-bit counting mod 3; "two single numbers" splits the XOR by a differing bit.

> **Interview tip:** XOR is the signal interviewers want — O(1) space beats the obvious hash set. Be ready for the harder variants (appears-three-times, two-singles); they test whether you understand *why* XOR works, not just the trick.
`,
    examples: [
      {
        label: "XOR fold",
        variants: [
          { tech: "python", label: "Python", code: `def single_number(nums):
    result = 0
    for x in nums:
        result ^= x
    return result


# --- demo ---  (one-liner: reduce(xor, nums))
print(single_number([4, 1, 2, 1, 2]))   # 4` },
          { tech: "javascript", label: "JavaScript", code: `function singleNumber(nums) {
  return nums.reduce((acc, x) => acc ^ x, 0);
}

// --- demo ---
console.log(singleNumber([4, 1, 2, 1, 2])); // 4` },
          { tech: "java", label: "Java", code: `public class Main {
    static int singleNumber(int[] nums) {
        int result = 0;
        for (int x : nums) result ^= x;
        return result;
    }

    public static void main(String[] args) {
        System.out.println(singleNumber(new int[]{4, 1, 2, 1, 2})); // 4
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

int singleNumber(vector<int>& nums) {
    int result = 0;
    for (int x : nums) result ^= x;
    return result;
}

int main() {
    vector<int> nums = {4, 1, 2, 1, 2};
    cout << singleNumber(nums) << endl;   // 4
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you find the majority element?",
    answer: `
**Intuition.** The majority element appears more than <code>n/2</code> times — more than everything else combined. **Boyer-Moore voting** exploits that: keep a candidate and a counter; matching votes increment it, others decrement it. When the counter hits 0, adopt the next element as the new candidate. The true majority always survives.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 130" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="18" fill="currentColor" font-size="12" opacity="0.7">[2,2,1,1,1,2,2]: count cancels minorities, 2 wins</text>
  <g font-size="13" text-anchor="middle" font-family="ui-monospace,monospace">
    <text x="50" y="56" fill="#22c55e">2</text>
    <text x="110" y="56" fill="#22c55e">2</text>
    <text x="170" y="56" fill="#ef4444">1</text>
    <text x="230" y="56" fill="#ef4444">1</text>
    <text x="290" y="56" fill="#ef4444">1</text>
    <text x="350" y="56" fill="#22c55e">2</text>
    <text x="410" y="56" fill="#22c55e">2</text>
  </g>
  <g font-size="11" text-anchor="middle" fill="#f59e0b">
    <text x="50" y="82">+1</text>
    <text x="110" y="82">+1</text>
    <text x="170" y="82">-1</text>
    <text x="230" y="82">-1</text>
    <text x="290" y="82">0!</text>
    <text x="350" y="82">+1</text>
    <text x="410" y="82">+1</text>
  </g>
  <text x="230" y="112" fill="currentColor" font-size="11" text-anchor="middle" opacity="0.7">count hits 0 → next element becomes candidate; majority 2 survives</text>
</svg>
</div>

### The algorithm
1. <code>candidate = none</code>, <code>count = 0</code>.
2. For each <code>x</code>: if <code>count == 0</code>, set <code>candidate = x</code>. Then <code>count += (x == candidate ? 1 : −1)</code>.
3. <code>candidate</code> is the majority element.

| Approach | Time | Space |
| --- | --- | --- |
| **Boyer-Moore voting** | O(n) | **O(1)** |
| Hash map counts | O(n) | O(n) |
| Sort, take middle | O(n log n) | O(1) |

It works because every non-majority element can cancel at most one majority vote, and there are strictly more majority votes than all others combined — so the counter can never end on a minority candidate.

**Dry run ([2,2,1,1,1,2,2]).** votes: 2(+1→cand 2), 2(+1), 1(−1), 1(−1), 1(−1→count 0), 2(cand 2,+1), 2(+1) → candidate **2**.

> **Interview tip:** if majority is **not** guaranteed to exist, add a verification pass to confirm the candidate truly exceeds n/2. The generalisation (elements appearing &gt; n/3) keeps **two** candidates — a nice follow-up.
`,
    examples: [
      {
        label: "Boyer-Moore voting",
        variants: [
          { tech: "python", label: "Python", code: `def majority_element(nums):
    candidate, count = None, 0
    for x in nums:
        if count == 0:
            candidate = x
        count += 1 if x == candidate else -1
    return candidate


# --- demo ---
print(majority_element([2, 2, 1, 1, 1, 2, 2]))   # 2` },
          { tech: "javascript", label: "JavaScript", code: `function majorityElement(nums) {
  let candidate = null, count = 0;
  for (const x of nums) {
    if (count === 0) candidate = x;
    count += x === candidate ? 1 : -1;
  }
  return candidate;
}

// --- demo ---
console.log(majorityElement([2, 2, 1, 1, 1, 2, 2])); // 2` },
          { tech: "java", label: "Java", code: `public class Main {
    static int majorityElement(int[] nums) {
        Integer candidate = null;
        int count = 0;
        for (int x : nums) {
            if (count == 0) candidate = x;
            count += (x == candidate) ? 1 : -1;
        }
        return candidate;
    }

    public static void main(String[] args) {
        System.out.println(majorityElement(new int[]{2, 2, 1, 1, 1, 2, 2})); // 2
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

int majorityElement(vector<int>& nums) {
    int candidate = 0, count = 0;
    for (int x : nums) {
        if (count == 0) candidate = x;
        count += (x == candidate) ? 1 : -1;
    }
    return candidate;
}

int main() {
    vector<int> nums = {2, 2, 1, 1, 1, 2, 2};
    cout << majorityElement(nums) << endl;   // 2
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you find the missing number in 0..n?",
    answer: `
**Intuition.** The set <code>0..n</code> has a known total (<code>n(n+1)/2</code>). Subtract the actual array sum and the difference is the missing number. An XOR variant achieves the same with no overflow risk.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 120" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="18" fill="currentColor" font-size="12" opacity="0.7">[3,0,1], n=3 → expected sum 6 − actual 4 = 2</text>
  <g font-size="13" text-anchor="middle">
    <rect x="60" y="40" width="120" height="34" rx="6" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="120" y="62" fill="currentColor">0+1+2+3 = 6</text>
    <rect x="220" y="40" width="120" height="34" rx="6" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="280" y="62" fill="currentColor">3+0+1 = 4</text>
    <rect x="380" y="40" width="80" height="34" rx="6" fill="#22c55e" fill-opacity="0.22" stroke="#22c55e"/><text x="420" y="62" fill="currentColor">= 2</text>
  </g>
  <text x="200" y="62" fill="#f59e0b" font-size="16" text-anchor="middle">−</text>
  <text x="360" y="62" fill="#f59e0b" font-size="16" text-anchor="middle">=</text>
</svg>
</div>

### Three O(n) / O(1) ways
| Method | Idea | Risk |
| --- | --- | --- |
| **Gauss sum** | <code>n(n+1)/2 − sum(arr)</code> | possible overflow for huge n |
| **XOR** | XOR of <code>0..n</code> XOR all array values | none |
| Index marking | place each value at its index, find the gap | mutates array |

XOR works because XORing the full range with the array cancels every present number, leaving the missing one — overflow-proof since values never grow.

**Dry run ([3,0,1], n=3).** expected = 3·4/2 = 6; actual = 3+0+1 = 4; missing = **2**.

> **Interview tip:** mention the **XOR** alternative as the overflow-safe version — for very large n the Gauss sum can overflow 32-bit integers, and naming that shows attention to numeric edge cases.
`,
    examples: [
      {
        label: "Gauss sum + XOR",
        variants: [
          { tech: "python", label: "Python", code: `def missing_number(nums):
    n = len(nums)
    return n * (n + 1) // 2 - sum(nums)

def missing_number_xor(nums):
    result = len(nums)
    for i, x in enumerate(nums):
        result ^= i ^ x
    return result


# --- demo ---
print(missing_number([3, 0, 1]))       # 2
print(missing_number_xor([3, 0, 1]))   # 2` },
          { tech: "javascript", label: "JavaScript", code: `function missingNumber(nums) {
  const n = nums.length;
  const expected = (n * (n + 1)) / 2;
  return expected - nums.reduce((a, b) => a + b, 0);
}

function missingNumberXor(nums) {
  let result = nums.length;
  for (let i = 0; i < nums.length; i++) result ^= i ^ nums[i];
  return result;
}

// --- demo ---
console.log(missingNumber([3, 0, 1]));    // 2
console.log(missingNumberXor([3, 0, 1])); // 2` },
          { tech: "java", label: "Java", code: `public class Main {
    static int missingNumber(int[] nums) {
        int n = nums.length, sum = n * (n + 1) / 2;
        for (int x : nums) sum -= x;
        return sum;
    }

    static int missingNumberXor(int[] nums) {
        int result = nums.length;
        for (int i = 0; i < nums.length; i++) result ^= i ^ nums[i];
        return result;
    }

    public static void main(String[] args) {
        System.out.println(missingNumber(new int[]{3, 0, 1}));    // 2
        System.out.println(missingNumberXor(new int[]{3, 0, 1})); // 2
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

int missingNumber(vector<int>& nums) {
    int n = nums.size(), sum = n * (n + 1) / 2;
    for (int x : nums) sum -= x;
    return sum;
}

int missingNumberXor(vector<int>& nums) {
    int result = nums.size();
    for (int i = 0; i < (int)nums.size(); i++) result ^= i ^ nums[i];
    return result;
}

int main() {
    vector<int> nums = {3, 0, 1};
    cout << missingNumber(nums) << endl;     // 2
    cout << missingNumberXor(nums) << endl;  // 2
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you sort an array of 0s, 1s, and 2s?",
    answer: `
**Intuition.** With only three values you don't need a comparison sort. The **Dutch National Flag** algorithm makes one pass with three pointers — <code>low</code>, <code>mid</code>, <code>high</code> — partitioning the array into 0s, 1s, and 2s in place.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 140" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="18" fill="currentColor" font-size="12" opacity="0.7">low region = 0s, mid scans, high region = 2s</text>
  <g font-size="13" text-anchor="middle">
    <rect x="40" y="44" width="60" height="38" rx="5" fill="#ef4444" fill-opacity="0.2" stroke="#ef4444"/><text x="70" y="69" fill="currentColor">0</text>
    <rect x="104" y="44" width="60" height="38" rx="5" fill="#ef4444" fill-opacity="0.2" stroke="#ef4444"/><text x="134" y="69" fill="currentColor">0</text>
    <rect x="168" y="44" width="60" height="38" rx="5" fill="#f59e0b" fill-opacity="0.2" stroke="#f59e0b"/><text x="198" y="69" fill="currentColor">1</text>
    <rect x="232" y="44" width="60" height="38" rx="5" fill="#f59e0b" fill-opacity="0.2" stroke="#f59e0b"/><text x="262" y="69" fill="currentColor">1</text>
    <rect x="296" y="44" width="60" height="38" rx="5" fill="#3b82f6" fill-opacity="0.2" stroke="#3b82f6"/><text x="326" y="69" fill="currentColor">2</text>
    <rect x="360" y="44" width="60" height="38" rx="5" fill="#3b82f6" fill-opacity="0.2" stroke="#3b82f6"/><text x="390" y="69" fill="currentColor">2</text>
  </g>
  <text x="100" y="104" fill="#ef4444" font-size="11" text-anchor="middle">low → 0s</text>
  <text x="230" y="104" fill="#f59e0b" font-size="11" text-anchor="middle">1s untouched</text>
  <text x="380" y="104" fill="#3b82f6" font-size="11" text-anchor="middle">high → 2s</text>
</svg>
</div>

### The algorithm (one pass)
1. <code>low = 0</code>, <code>mid = 0</code>, <code>high = n − 1</code>.
2. While <code>mid ≤ high</code>:
   - <code>arr[mid] == 0</code>: swap <code>arr[low], arr[mid]</code>; <code>low++, mid++</code>.
   - <code>arr[mid] == 1</code>: <code>mid++</code>.
   - <code>arr[mid] == 2</code>: swap <code>arr[mid], arr[high]</code>; <code>high−−</code> (don't advance <code>mid</code> — the swapped-in value is unexamined).

| Approach | Time | Space | Passes |
| --- | --- | --- | --- |
| **Dutch flag** | O(n) | O(1) | **1** |
| Counting sort | O(n) | O(1) | 2 |

The one subtlety: after swapping a 2 to the back, **don't** increment <code>mid</code> — you haven't looked at what came from <code>high</code> yet.

**Dry run ([2,0,1]).** mid=2 → swap with high → [1,0,2], high=1. mid=1 → mid++. mid=0 at idx1 → swap low → [0,1,2]. Result **[0,1,2]**.

> **Interview tip:** the "don't advance <code>mid</code> after a 2-swap" rule is the trap — articulate it. Counting sort (count 0s/1s/2s, overwrite) is a valid 2-pass alternative; Dutch flag's appeal is the single pass.
`,
    examples: [
      {
        label: "Dutch National Flag",
        variants: [
          { tech: "python", label: "Python", code: `def sort_colors(nums):
    low, mid, high = 0, 0, len(nums) - 1
    while mid <= high:
        if nums[mid] == 0:
            nums[low], nums[mid] = nums[mid], nums[low]
            low += 1; mid += 1
        elif nums[mid] == 1:
            mid += 1
        else:                               # == 2
            nums[mid], nums[high] = nums[high], nums[mid]
            high -= 1                        # do NOT advance mid
    return nums


# --- demo ---
print(sort_colors([2, 0, 2, 1, 1, 0]))   # [0, 0, 1, 1, 2, 2]` },
          { tech: "javascript", label: "JavaScript", code: `function sortColors(nums) {
  let low = 0, mid = 0, high = nums.length - 1;
  while (mid <= high) {
    if (nums[mid] === 0) {
      [nums[low], nums[mid]] = [nums[mid], nums[low]];
      low++; mid++;
    } else if (nums[mid] === 1) {
      mid++;
    } else {                                // === 2
      [nums[mid], nums[high]] = [nums[high], nums[mid]];
      high--;                               // do NOT advance mid
    }
  }
  return nums;
}

// --- demo ---
console.log(sortColors([2, 0, 2, 1, 1, 0])); // [0, 0, 1, 1, 2, 2]` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static void sortColors(int[] nums) {
        int low = 0, mid = 0, high = nums.length - 1;
        while (mid <= high) {
            if (nums[mid] == 0) {
                int t = nums[low]; nums[low] = nums[mid]; nums[mid] = t;
                low++; mid++;
            } else if (nums[mid] == 1) {
                mid++;
            } else {                            // == 2
                int t = nums[mid]; nums[mid] = nums[high]; nums[high] = t;
                high--;                         // do NOT advance mid
            }
        }
    }

    public static void main(String[] args) {
        int[] a = {2, 0, 2, 1, 1, 0};
        sortColors(a);
        System.out.println(Arrays.toString(a)); // [0, 0, 1, 1, 2, 2]
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

void sortColors(vector<int>& nums) {
    int low = 0, mid = 0, high = nums.size() - 1;
    while (mid <= high) {
        if (nums[mid] == 0) swap(nums[low++], nums[mid++]);
        else if (nums[mid] == 1) mid++;
        else swap(nums[mid], nums[high--]);  // do NOT advance mid
    }
}

int main() {
    vector<int> a = {2, 0, 2, 1, 1, 0};
    sortColors(a);
    for (int x : a) cout << x << " ";
    cout << endl;   // 0 0 1 1 2 2
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you add one to a number represented as a digit array?",
    answer: `
**Intuition.** The number is stored most-significant digit first. Adding one only affects the end — unless you hit a chain of 9s. Walk from the **last digit**: if it's less than 9, increment and you're done; if it's 9, set it to 0 and carry left. If the carry runs off the front (all 9s), prepend a 1.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 140" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="18" fill="currentColor" font-size="12" opacity="0.7">[1,2,9] + 1: 9→0 carry, 2→3 stop → [1,3,0]</text>
  <g font-size="14" text-anchor="middle">
    <rect x="120" y="40" width="56" height="40" rx="5" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/><text x="148" y="66" fill="currentColor">1</text>
    <rect x="180" y="40" width="56" height="40" rx="5" fill="#f59e0b" fill-opacity="0.2" stroke="#f59e0b"/><text x="208" y="66" fill="currentColor">2→3</text>
    <rect x="240" y="40" width="56" height="40" rx="5" fill="#ef4444" fill-opacity="0.18" stroke="#ef4444"/><text x="268" y="66" fill="currentColor">9→0</text>
  </g>
  <path d="M268,84 Q238,108 208,84" fill="none" stroke="#f59e0b" stroke-width="2" marker-end="url(#po)"/>
  <text x="238" y="118" fill="#f59e0b" font-size="11" text-anchor="middle">carry stops at the first non-9</text>
  <defs><marker id="po" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#f59e0b"/></marker></defs>
</svg>
</div>

### The algorithm
1. From the last index down: if <code>digit &lt; 9</code>, increment and **return** immediately.
2. Otherwise set the digit to 0 and continue (carry).
3. If the loop ends (every digit was 9), prepend a <code>1</code> to the array.

| | Time | Space |
| --- | --- | --- |
| Walk from the end | O(n) | O(1) (O(n) only when all 9s) |

The early return means most inputs finish after touching just the last digit; only the all-9s case (<code>[9,9,9] → [1,0,0,0]</code>) touches everything and grows the array.

**Dry run ([1,2,9]).** last digit 9 → set 0, carry. next 2 &lt; 9 → 3, return → **[1,3,0]**. For [9,9]: both → 0, fall through → prepend 1 → **[1,0,0]**.

> **Interview tip:** the all-9s case is the one to call out — it's the only time the array length changes. Returning early on the first non-9 keeps it clean and avoids tracking a separate carry variable.
`,
    examples: [
      {
        label: "Carry from the last digit",
        variants: [
          { tech: "python", label: "Python", code: `def plus_one(digits):
    for i in range(len(digits) - 1, -1, -1):
        if digits[i] < 9:
            digits[i] += 1
            return digits
        digits[i] = 0
    return [1] + digits        # all nines


# --- demo ---
print(plus_one([1, 2, 9]))   # [1, 3, 0]
print(plus_one([9, 9, 9]))   # [1, 0, 0, 0]` },
          { tech: "javascript", label: "JavaScript", code: `function plusOne(digits) {
  for (let i = digits.length - 1; i >= 0; i--) {
    if (digits[i] < 9) { digits[i]++; return digits; }
    digits[i] = 0;
  }
  return [1, ...digits];       // all nines
}

// --- demo ---
console.log(plusOne([1, 2, 9])); // [1, 3, 0]
console.log(plusOne([9, 9, 9])); // [1, 0, 0, 0]` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static int[] plusOne(int[] digits) {
        for (int i = digits.length - 1; i >= 0; i--) {
            if (digits[i] < 9) { digits[i]++; return digits; }
            digits[i] = 0;
        }
        int[] out = new int[digits.length + 1];
        out[0] = 1;                // all nines
        return out;
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(plusOne(new int[]{1, 2, 9}))); // [1, 3, 0]
        System.out.println(Arrays.toString(plusOne(new int[]{9, 9, 9}))); // [1, 0, 0, 0]
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

vector<int> plusOne(vector<int>& digits) {
    for (int i = digits.size() - 1; i >= 0; i--) {
        if (digits[i] < 9) { digits[i]++; return digits; }
        digits[i] = 0;
    }
    digits.insert(digits.begin(), 1);   // all nines
    return digits;
}

int main() {
    vector<int> a = {1, 2, 9};
    for (int x : plusOne(a)) cout << x << " ";
    cout << endl;   // 1 3 0
    vector<int> b = {9, 9, 9};
    for (int x : plusOne(b)) cout << x << " ";
    cout << endl;   // 1 0 0 0
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you merge two sorted linked lists?",
    answer: `
**Intuition.** Like the merge step of merge sort, but on linked nodes. Use a **dummy head** so you don't special-case the first node; a tail pointer always attaches the smaller of the two current nodes, then advances.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 160" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">attach the smaller head, advance, repeat</text>
  <g font-size="13" text-anchor="middle">
    <circle cx="60" cy="46" r="18" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="60" y="51" fill="currentColor">1</text>
    <circle cx="150" cy="46" r="18" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="150" y="51" fill="currentColor">4</text>
    <text x="40" y="50" fill="#3b82f6" font-size="11" text-anchor="end">A</text>
    <circle cx="60" cy="104" r="18" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="60" y="109" fill="currentColor">2</text>
    <circle cx="150" cy="104" r="18" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="150" y="109" fill="currentColor">5</text>
    <text x="40" y="108" fill="#8b5cf6" font-size="11" text-anchor="end">B</text>
  </g>
  <g font-size="13" text-anchor="middle">
    <circle cx="280" cy="75" r="18" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="280" y="80" fill="currentColor">1</text>
    <circle cx="340" cy="75" r="18" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="340" y="80" fill="currentColor">2</text>
    <circle cx="400" cy="75" r="18" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="400" y="80" fill="currentColor">4</text>
    <circle cx="460" cy="75" r="18" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="460" y="80" fill="currentColor">5</text>
  </g>
  <line x1="298" y1="75" x2="322" y2="75" stroke="currentColor" stroke-opacity="0.4" marker-end="url(#ml)"/>
  <line x1="358" y1="75" x2="382" y2="75" stroke="currentColor" stroke-opacity="0.4" marker-end="url(#ml)"/>
  <line x1="418" y1="75" x2="442" y2="75" stroke="currentColor" stroke-opacity="0.4" marker-end="url(#ml)"/>
  <text x="210" y="80" fill="#f59e0b" font-size="16">→</text>
  <defs><marker id="ml" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="currentColor" fill-opacity="0.4"/></marker></defs>
</svg>
</div>

### The algorithm
1. Create a <code>dummy</code> node; <code>tail = dummy</code>.
2. While both lists have nodes: attach the smaller head to <code>tail.next</code>, advance that list and <code>tail</code>.
3. Append whichever list still has nodes.
4. Return <code>dummy.next</code>.

| | Time | Space |
| --- | --- | --- |
| Iterative merge | O(m + n) | **O(1)** |
| Recursive | O(m + n) | O(m + n) stack |

The dummy head removes the "is this the first node?" branching — you always just append to <code>tail</code>.

**Dry run.** A=1→4, B=2→5: take 1(A), 2(B), 4(A), 5(B) → **1→2→4→5**.

> **Interview tip:** the **dummy head** is the technique to name — it eliminates head edge cases. This same merge powers "merge k sorted lists" (pairwise or via a heap) and the linked-list merge sort.
`,
    examples: [
      {
        label: "Dummy-head iterative merge",
        variants: [
          { tech: "python", label: "Python", code: `class ListNode:
    def __init__(self, val, nxt=None):
        self.val, self.next = val, nxt

def merge_two_lists(l1, l2):
    dummy = tail = ListNode(0)
    while l1 and l2:
        if l1.val <= l2.val:
            tail.next, l1 = l1, l1.next
        else:
            tail.next, l2 = l2, l2.next
        tail = tail.next
    tail.next = l1 or l2
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

print(to_list(merge_two_lists(build([1, 4]), build([2, 5]))))   # [1, 2, 4, 5]` },
          { tech: "javascript", label: "JavaScript", code: `class ListNode {
  constructor(val, next = null) { this.val = val; this.next = next; }
}

function mergeTwoLists(l1, l2) {
  const dummy = new ListNode(0);
  let tail = dummy;
  while (l1 && l2) {
    if (l1.val <= l2.val) { tail.next = l1; l1 = l1.next; }
    else { tail.next = l2; l2 = l2.next; }
    tail = tail.next;
  }
  tail.next = l1 || l2;
  return dummy.next;
}

// --- demo ---
const build = (vals) => vals.reduceRight((next, v) => new ListNode(v, next), null);
const toArray = (h) => { const out = []; while (h) { out.push(h.val); h = h.next; } return out; };
console.log(toArray(mergeTwoLists(build([1, 4]), build([2, 5])))); // [1, 2, 4, 5]` },
          { tech: "java", label: "Java", code: `public class Main {
    static class ListNode {
        int val; ListNode next;
        ListNode(int val) { this.val = val; }
    }

    static ListNode mergeTwoLists(ListNode l1, ListNode l2) {
        ListNode dummy = new ListNode(0), tail = dummy;
        while (l1 != null && l2 != null) {
            if (l1.val <= l2.val) { tail.next = l1; l1 = l1.next; }
            else { tail.next = l2; l2 = l2.next; }
            tail = tail.next;
        }
        tail.next = (l1 != null) ? l1 : l2;
        return dummy.next;
    }

    static ListNode build(int[] vals) {
        ListNode head = null;
        for (int i = vals.length - 1; i >= 0; i--) {
            ListNode n = new ListNode(vals[i]); n.next = head; head = n;
        }
        return head;
    }

    public static void main(String[] args) {
        StringBuilder sb = new StringBuilder();
        for (ListNode n = mergeTwoLists(build(new int[]{1,4}), build(new int[]{2,5}));
             n != null; n = n.next) sb.append(n.val).append(" ");
        System.out.println(sb.toString().trim());   // 1 2 4 5
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

struct ListNode {
    int val;
    ListNode* next = nullptr;
    ListNode(int v) : val(v) {}
};

ListNode* mergeTwoLists(ListNode* l1, ListNode* l2) {
    ListNode dummy(0);
    ListNode* tail = &dummy;
    while (l1 && l2) {
        if (l1->val <= l2->val) { tail->next = l1; l1 = l1->next; }
        else { tail->next = l2; l2 = l2->next; }
        tail = tail->next;
    }
    tail->next = l1 ? l1 : l2;
    return dummy.next;
}

int main() {
    auto build = [](vector<int> vals) {
        ListNode* h = nullptr;
        for (int i = (int)vals.size() - 1; i >= 0; i--) {
            ListNode* n = new ListNode(vals[i]); n->next = h; h = n;
        }
        return h;
    };
    for (ListNode* n = mergeTwoLists(build({1,4}), build({2,5})); n; n = n->next)
        cout << n->val << " ";
    cout << endl;   // 1 2 4 5
    return 0;
}` },
        ],
      },
    ],
  },
];

export default augments;
