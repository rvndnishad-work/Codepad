/**
 * DSA augment batch 2 — the remaining core techniques/concepts from dsa.json.
 * See dsa-augments.types.ts for the authoring rules (no "${", no raw backticks
 * inside these template literals; inline code uses <code> tags).
 */
import type { DsaAugment } from "./dsa-augments.types";

const augments: DsaAugment[] = [
  {
    title: "What is dynamic programming?",
    answer: `
**Intuition.** Dynamic programming (DP) is recursion that *remembers*. When a problem breaks into subproblems that **overlap**, you solve each one **once** and reuse the answer instead of recomputing it. That turns exponential work into polynomial.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 210" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="18" fill="currentColor" font-size="12" opacity="0.7">fib table filled bottom-up: dp[i] = dp[i-1] + dp[i-2]</text>
  <g font-size="13" text-anchor="middle">
    <rect x="20" y="70" width="60" height="46" rx="6" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/>
    <rect x="84" y="70" width="60" height="46" rx="6" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/>
    <rect x="148" y="70" width="60" height="46" rx="6" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"><animate attributeName="fill-opacity" values="0;0.16" dur="0.4s" begin="0.6s" fill="freeze"/></rect>
    <rect x="212" y="70" width="60" height="46" rx="6" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"><animate attributeName="fill-opacity" values="0;0.16" dur="0.4s" begin="1.1s" fill="freeze"/></rect>
    <rect x="276" y="70" width="60" height="46" rx="6" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"><animate attributeName="fill-opacity" values="0;0.16" dur="0.4s" begin="1.6s" fill="freeze"/></rect>
    <rect x="340" y="70" width="60" height="46" rx="6" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"><animate attributeName="fill-opacity" values="0;0.16" dur="0.4s" begin="2.1s" fill="freeze"/></rect>
    <rect x="404" y="70" width="60" height="46" rx="6" fill="#f59e0b" fill-opacity="0.2" stroke="#f59e0b"><animate attributeName="fill-opacity" values="0;0.2" dur="0.4s" begin="2.6s" fill="freeze"/></rect>
    <text x="50" y="98" fill="currentColor">0</text>
    <text x="114" y="98" fill="currentColor">1</text>
    <text x="178" y="98" fill="currentColor" opacity="0"><animate attributeName="opacity" values="0;1" dur="0.3s" begin="0.6s" fill="freeze"/>1</text>
    <text x="242" y="98" fill="currentColor" opacity="0"><animate attributeName="opacity" values="0;1" dur="0.3s" begin="1.1s" fill="freeze"/>2</text>
    <text x="306" y="98" fill="currentColor" opacity="0"><animate attributeName="opacity" values="0;1" dur="0.3s" begin="1.6s" fill="freeze"/>3</text>
    <text x="370" y="98" fill="currentColor" opacity="0"><animate attributeName="opacity" values="0;1" dur="0.3s" begin="2.1s" fill="freeze"/>5</text>
    <text x="434" y="98" fill="currentColor" opacity="0"><animate attributeName="opacity" values="0;1" dur="0.3s" begin="2.6s" fill="freeze"/>8</text>
  </g>
  <g font-size="10" fill="currentColor" opacity="0.55" text-anchor="middle">
    <text x="50" y="134">dp0</text><text x="114" y="134">dp1</text><text x="178" y="134">dp2</text><text x="242" y="134">dp3</text><text x="306" y="134">dp4</text><text x="370" y="134">dp5</text><text x="434" y="134">dp6</text>
  </g>
</svg>
</div>

### Two ways to implement DP
| Style | Direction | How |
| --- | --- | --- |
| **Memoization** | top-down | normal recursion + a cache of solved subproblems |
| **Tabulation** | bottom-up | fill a table from base cases upward, no recursion |

### When does DP apply? Two signals
1. **Overlapping subproblems** — the same subproblem recurs (naive Fibonacci recomputes <code>fib(2)</code> many times).
2. **Optimal substructure** — the optimal answer is built from optimal answers to subproblems.

**Dry run.** Naive <code>fib(6)</code> makes ~25 calls (a doubling tree). With a table you fill 7 cells **once** — O(n) time, and O(1) space if you keep only the last two values.

Classic DP problems: knapsack, coin change, longest common subsequence, edit distance, longest increasing subsequence.

> **Interview tip:** the recipe is (1) define the **state** (what does <code>dp[i]</code> mean?), (2) write the **transition** (recurrence), (3) set **base cases**, (4) decide the **order** to fill. Say these four out loud — interviewers grade the framing as much as the code.
`,
    examples: [
      {
        label: "Fibonacci — naive vs memo vs tabulation",
        variants: [
          {
            tech: "python",
            label: "Python",
            code: `# O(2^n) - recomputes overlapping subproblems
def fib_naive(n):
    return n if n < 2 else fib_naive(n - 1) + fib_naive(n - 2)

# O(n) top-down memoization
def fib_memo(n, cache={}):
    if n < 2: return n
    if n not in cache:
        cache[n] = fib_memo(n - 1, cache) + fib_memo(n - 2, cache)
    return cache[n]

# O(n) time, O(1) space bottom-up
def fib(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a


# --- demo ---
print(fib_naive(10), fib_memo(10), fib(10))   # 55 55 55`,
          },
          {
            tech: "javascript",
            label: "JavaScript",
            code: `// O(2^n)
function fibNaive(n) {
  return n < 2 ? n : fibNaive(n - 1) + fibNaive(n - 2);
}

// O(n) memoization
function fibMemo(n, cache = new Map()) {
  if (n < 2) return n;
  if (!cache.has(n))
    cache.set(n, fibMemo(n - 1, cache) + fibMemo(n - 2, cache));
  return cache.get(n);
}

// O(n) time, O(1) space
function fib(n) {
  let a = 0, b = 1;
  for (let i = 0; i < n; i++) [a, b] = [b, a + b];
  return a;
}

// --- demo ---
console.log(fibNaive(10), fibMemo(10), fib(10)); // 55 55 55`,
          },
          {
            tech: "java",
            label: "Java",
            code: `import java.util.*;

public class Main {
    // O(n) top-down memoization
    static int fibMemo(int n, Map<Integer,Integer> cache) {
        if (n < 2) return n;
        if (cache.containsKey(n)) return cache.get(n);
        int v = fibMemo(n - 1, cache) + fibMemo(n - 2, cache);
        cache.put(n, v);
        return v;
    }

    // O(n) time, O(1) space
    static int fib(int n) {
        int a = 0, b = 1;
        for (int i = 0; i < n; i++) { int t = a + b; a = b; b = t; }
        return a;
    }

    public static void main(String[] args) {
        System.out.println(fibMemo(10, new HashMap<>())); // 55
        System.out.println(fib(10));                      // 55
    }
}`,
          },
          {
            tech: "cpp",
            label: "C++",
            code: `#include <bits/stdc++.h>
using namespace std;

// O(n) tabulation
int fibTable(int n) {
    if (n < 2) return n;
    vector<int> dp(n + 1);
    dp[0] = 0; dp[1] = 1;
    for (int i = 2; i <= n; i++) dp[i] = dp[i-1] + dp[i-2];
    return dp[n];
}

// O(n) time, O(1) space
int fib(int n) {
    int a = 0, b = 1;
    for (int i = 0; i < n; i++) { int t = a + b; a = b; b = t; }
    return a;
}

int main() {
    cout << fibTable(10) << " " << fib(10) << endl;   // 55 55
    return 0;
}`,
          },
        ],
      },
    ],
  },

  {
    title: "What is the two-pointer technique?",
    answer: `
**Intuition.** Instead of a nested loop checking every pair (O(n²)), you move **two indices** through the data intelligently — often from both ends inward — so each element is visited once. That collapses many pair/subarray problems to **O(n)**.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 160" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="20" fill="currentColor" font-size="12" opacity="0.7">sorted array, find a pair summing to 18</text>
  <g font-size="13" text-anchor="middle">
    <rect x="20" y="50" width="56" height="40" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="80" y="50" width="56" height="40" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="140" y="50" width="56" height="40" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="200" y="50" width="56" height="40" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="260" y="50" width="56" height="40" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="320" y="50" width="56" height="40" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="48" y="75" fill="currentColor">2</text>
    <text x="108" y="75" fill="currentColor">7</text>
    <text x="168" y="75" fill="currentColor">8</text>
    <text x="228" y="75" fill="currentColor">11</text>
    <text x="288" y="75" fill="currentColor">15</text>
    <text x="348" y="75" fill="currentColor">18</text>
  </g>
  <polygon points="48,98 40,114 56,114" fill="#22c55e">
    <animate attributeName="points" values="48,98 40,114 56,114; 108,98 100,114 116,114; 108,98 100,114 116,114" dur="3s" repeatCount="indefinite"/>
  </polygon>
  <polygon points="348,98 340,114 356,114" fill="#ef4444">
    <animate attributeName="points" values="348,98 340,114 356,114; 348,98 340,114 356,114; 288,98 280,114 296,114" dur="3s" repeatCount="indefinite"/>
  </polygon>
  <text x="44" y="132" fill="#22c55e" font-size="11" text-anchor="middle">left</text>
  <text x="352" y="132" fill="#ef4444" font-size="11" text-anchor="middle">right</text>
  <text x="430" y="75" fill="currentColor" font-size="11" opacity="0.7">7 + 11 = 18</text>
</svg>
</div>

**The rule.** With a sorted array and a target sum: if <code>arr[left] + arr[right]</code> is **too small**, move <code>left</code> up; if **too big**, move <code>right</code> down; if equal, you found it.

### Common shapes
| Pattern | Example problem |
| --- | --- |
| Opposite ends, converging | pair sum, container with most water, valid palindrome |
| Same direction (fast/slow) | remove duplicates in place, cycle detection, middle of list |
| Fixed/variable window | sliding window (see that question) |

**Dry run.** left=2, right=18 → 20 &gt; 18 → right→15 → 17 &lt; 18 → left→7 → 7+15=22 &gt; 18 → right→11 → 7+11 = **18**. Done in a handful of steps, never re-scanning.

| | Time | Space |
| --- | --- | --- |
| Two pointers | O(n) | O(1) |
| Brute-force pairs | O(n²) | O(1) |

> **Interview tip:** two pointers usually needs the data **sorted** (or a monotonic property). If it isn't sorted and you need pairs, a hash map is often the better O(n) tool — mention both and pick based on whether order/space matters.
`,
    examples: [
      {
        label: "Pair sum in a sorted array",
        variants: [
          {
            tech: "python",
            label: "Python",
            code: `def pair_sum(arr, target):
    left, right = 0, len(arr) - 1
    while left < right:
        s = arr[left] + arr[right]
        if s == target:
            return (left, right)
        if s < target:
            left += 1
        else:
            right -= 1
    return None


# --- demo ---
print(pair_sum([2, 7, 8, 11, 15, 18], 18))   # (1, 3)  -> 7 + 11`,
          },
          {
            tech: "javascript",
            label: "JavaScript",
            code: `function pairSum(arr, target) {
  let left = 0, right = arr.length - 1;
  while (left < right) {
    const s = arr[left] + arr[right];
    if (s === target) return [left, right];
    if (s < target) left++;
    else right--;
  }
  return null;
}

// --- demo ---
console.log(pairSum([2, 7, 8, 11, 15, 18], 18)); // [1, 3] -> 7 + 11`,
          },
          {
            tech: "java",
            label: "Java",
            code: `import java.util.*;

public class Main {
    static int[] pairSum(int[] arr, int target) {
        int left = 0, right = arr.length - 1;
        while (left < right) {
            int s = arr[left] + arr[right];
            if (s == target) return new int[]{left, right};
            if (s < target) left++;
            else right--;
        }
        return new int[]{-1, -1};
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(
            pairSum(new int[]{2, 7, 8, 11, 15, 18}, 18))); // [1, 3]
    }
}`,
          },
          {
            tech: "cpp",
            label: "C++",
            code: `#include <bits/stdc++.h>
using namespace std;

pair<int,int> pairSum(vector<int>& arr, int target) {
    int left = 0, right = (int)arr.size() - 1;
    while (left < right) {
        int s = arr[left] + arr[right];
        if (s == target) return {left, right};
        if (s < target) left++;
        else right--;
    }
    return {-1, -1};
}

int main() {
    vector<int> arr = {2, 7, 8, 11, 15, 18};
    auto [i, j] = pairSum(arr, 18);
    cout << i << " " << j << endl;   // 1 3
    return 0;
}`,
          },
        ],
      },
    ],
  },

  {
    title: "What is the sliding window technique?",
    answer: `
**Intuition.** Many problems ask about a *contiguous* run of elements. Rather than recompute each window from scratch, you **slide** a window across the data — adding the new element on the right and removing the old one on the left — reusing the previous result. O(n²) → **O(n)**.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="20" fill="currentColor" font-size="12" opacity="0.7">max sum of a window of size 3</text>
  <g font-size="13" text-anchor="middle">
    <rect x="20" y="46" width="56" height="44" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="80" y="46" width="56" height="44" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="140" y="46" width="56" height="44" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="200" y="46" width="56" height="44" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="260" y="46" width="56" height="44" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="320" y="46" width="56" height="44" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="380" y="46" width="56" height="44" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="48" y="73" fill="currentColor">1</text>
    <text x="108" y="73" fill="currentColor">4</text>
    <text x="168" y="73" fill="currentColor">2</text>
    <text x="228" y="73" fill="currentColor">9</text>
    <text x="288" y="73" fill="currentColor">3</text>
    <text x="348" y="73" fill="currentColor">5</text>
    <text x="408" y="73" fill="currentColor">1</text>
  </g>
  <rect x="18" y="42" width="180" height="52" rx="8" fill="#8b5cf6" fill-opacity="0.12" stroke="#8b5cf6" stroke-width="2.5">
    <animate attributeName="x" values="18;78;138;198;258;18" dur="4s" repeatCount="indefinite"/>
  </rect>
  <text x="260" y="120" fill="currentColor" font-size="11" text-anchor="middle" opacity="0.7">slide: subtract leftmost, add next on the right</text>
</svg>
</div>

### Two flavours
| Type | Window size | Example |
| --- | --- | --- |
| **Fixed** | constant k | max/min sum of k elements, averages |
| **Variable** | grows/shrinks to meet a condition | longest substring without repeats, minimum window substring |

The fixed window keeps a running total; the variable window expands the right edge until the constraint breaks, then shrinks the left edge until it holds again.

**Dry run (fixed, k=3).** Windows: [1,4,2]=7 → [4,2,9]=15 → [2,9,3]=14 → [9,3,5]=**17** → [3,5,1]=9. The max is **17** — and we never re-summed a window (each slide is one subtract + one add).

| | Time | Space |
| --- | --- | --- |
| Sliding window | O(n) | O(1)–O(k) |
| Recompute each window | O(n·k) | O(1) |

> **Interview tip:** the trigger words are "contiguous subarray/substring" plus "longest / shortest / max / min / at most k". For *variable* windows, track what makes the window invalid (a count map, a sum, a distinct-char count) and shrink from the left.
`,
    examples: [
      {
        label: "Max sum of a fixed window",
        variants: [
          {
            tech: "python",
            label: "Python",
            code: `def max_window_sum(arr, k):
    window = sum(arr[:k])
    best = window
    for i in range(k, len(arr)):
        window += arr[i] - arr[i - k]   # add new, drop old
        best = max(best, window)
    return best


# --- demo ---
print(max_window_sum([1, 4, 2, 9, 3, 5, 1], 3))   # 17  -> [9,3,5]`,
          },
          {
            tech: "javascript",
            label: "JavaScript",
            code: `function maxWindowSum(arr, k) {
  let window = 0;
  for (let i = 0; i < k; i++) window += arr[i];
  let best = window;
  for (let i = k; i < arr.length; i++) {
    window += arr[i] - arr[i - k];   // add new, drop old
    best = Math.max(best, window);
  }
  return best;
}

// --- demo ---
console.log(maxWindowSum([1, 4, 2, 9, 3, 5, 1], 3)); // 17 -> [9,3,5]`,
          },
          {
            tech: "java",
            label: "Java",
            code: `public class Main {
    static int maxWindowSum(int[] arr, int k) {
        int window = 0;
        for (int i = 0; i < k; i++) window += arr[i];
        int best = window;
        for (int i = k; i < arr.length; i++) {
            window += arr[i] - arr[i - k];  // add new, drop old
            best = Math.max(best, window);
        }
        return best;
    }

    public static void main(String[] args) {
        System.out.println(maxWindowSum(new int[]{1, 4, 2, 9, 3, 5, 1}, 3)); // 17
    }
}`,
          },
          {
            tech: "cpp",
            label: "C++",
            code: `#include <bits/stdc++.h>
using namespace std;

int maxWindowSum(vector<int>& arr, int k) {
    int window = 0;
    for (int i = 0; i < k; i++) window += arr[i];
    int best = window;
    for (int i = k; i < (int)arr.size(); i++) {
        window += arr[i] - arr[i - k];  // add new, drop old
        best = max(best, window);
    }
    return best;
}

int main() {
    vector<int> arr = {1, 4, 2, 9, 3, 5, 1};
    cout << maxWindowSum(arr, 3) << endl;   // 17
    return 0;
}`,
          },
        ],
      },
    ],
  },

  {
    title: "What is a heap / priority queue?",
    answer: `
**Intuition.** A heap is a tree that always keeps the smallest (or largest) element at the **root**, so you can peek the extreme in O(1) and pull it in O(log n). It is the engine behind a **priority queue** — a queue where you dequeue by priority, not arrival order.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 210" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="18" fill="currentColor" font-size="12" opacity="0.7">min-heap: every parent ≤ its children</text>
  <line x1="160" y1="48" x2="100" y2="98" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="160" y1="48" x2="220" y2="98" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="100" y1="118" x2="60" y2="160" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="100" y1="118" x2="140" y2="160" stroke="currentColor" stroke-opacity="0.3"/>
  <g font-size="14" text-anchor="middle">
    <circle cx="160" cy="40" r="22" fill="#22c55e" fill-opacity="0.22" stroke="#22c55e"/><text x="160" y="45" fill="currentColor">2</text>
    <circle cx="100" cy="110" r="22" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="100" y="115" fill="currentColor">5</text>
    <circle cx="220" cy="110" r="22" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="220" y="115" fill="currentColor">8</text>
    <circle cx="60" cy="172" r="20" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="60" y="177" fill="currentColor">9</text>
    <circle cx="140" cy="172" r="20" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="140" y="177" fill="currentColor">7</text>
  </g>
  <text x="160" y="20" fill="#22c55e" font-size="11" text-anchor="middle">root = min</text>
  <circle cx="160" cy="40" r="27" fill="none" stroke="#22c55e" stroke-width="2.5" opacity="0.8">
    <animate attributeName="r" values="22;28;22" dur="1.6s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.9;0.2;0.9" dur="1.6s" repeatCount="indefinite"/>
  </circle>
  <g font-size="11" text-anchor="middle">
    <text x="370" y="40" fill="currentColor" opacity="0.7">stored as an array:</text>
    <rect x="300" y="56" width="34" height="28" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/><text x="317" y="75" fill="currentColor">2</text>
    <rect x="334" y="56" width="34" height="28" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/><text x="351" y="75" fill="currentColor">5</text>
    <rect x="368" y="56" width="34" height="28" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/><text x="385" y="75" fill="currentColor">8</text>
    <rect x="402" y="56" width="34" height="28" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/><text x="419" y="75" fill="currentColor">9</text>
    <rect x="436" y="56" width="34" height="28" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/><text x="453" y="75" fill="currentColor">7</text>
    <text x="385" y="104" fill="currentColor" opacity="0.6">child of i at 2i+1, 2i+2</text>
  </g>
</svg>
</div>

A heap is a **complete binary tree**, so it packs perfectly into an array — no pointers needed. Children of index <code>i</code> live at <code>2i+1</code> and <code>2i+2</code>.

### Operations
| Operation | Cost | How |
| --- | --- | --- |
| Peek min/max | O(1) | read the root |
| Insert (push) | O(log n) | append, then "sift up" |
| Extract min/max (pop) | O(log n) | swap root with last, shrink, "sift down" |
| Build from n items | O(n) | heapify bottom-up |

### Where it shines
- **Top-K** elements (keep a heap of size k) — O(n log k).
- **Dijkstra** / Prim's MST — always pull the cheapest frontier node.
- **Merge k sorted lists**, **median of a stream** (two heaps), event scheduling.

**Dry run (push 3 into the heap above).** Append 3 as a leaf, compare with its parent 5 → 3 &lt; 5, swap up; compare with new parent 2 → 3 &gt; 2, stop. Two comparisons, O(log n).

> **Interview tip:** a heap gives you the *single* extreme cheaply but is **not** sorted overall — don't reach for it when you need full order. For "k largest/smallest" or "process by priority", it is usually the optimal tool.
`,
    examples: [
      {
        label: "k largest with a heap",
        variants: [
          {
            tech: "python",
            label: "Python",
            code: `import heapq

def k_largest(nums, k):
    heap = []                      # min-heap of size k
    for n in nums:
        heapq.heappush(heap, n)
        if len(heap) > k:
            heapq.heappop(heap)    # drop the smallest
    return sorted(heap, reverse=True)


# --- demo --- (or the built-in: heapq.nlargest(k, nums))
print(k_largest([3, 1, 5, 12, 2, 11], 3))   # [12, 11, 5]`,
          },
          {
            tech: "javascript",
            label: "JavaScript",
            code: `// JS has no built-in heap; a tiny binary min-heap:
class MinHeap {
  constructor() { this.a = []; }
  push(v) {
    this.a.push(v);
    let i = this.a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.a[p] <= this.a[i]) break;
      [this.a[p], this.a[i]] = [this.a[i], this.a[p]];
      i = p;
    }
  }
  pop() {
    const top = this.a[0], last = this.a.pop();
    if (this.a.length) {
      this.a[0] = last;
      let i = 0;
      for (;;) {
        let s = i, l = 2*i+1, r = 2*i+2;
        if (l < this.a.length && this.a[l] < this.a[s]) s = l;
        if (r < this.a.length && this.a[r] < this.a[s]) s = r;
        if (s === i) break;
        [this.a[s], this.a[i]] = [this.a[i], this.a[s]];
        i = s;
      }
    }
    return top;
  }
  get size() { return this.a.length; }
}

function kLargest(nums, k) {
  const heap = new MinHeap();        // min-heap of size k
  for (const n of nums) {
    heap.push(n);
    if (heap.size > k) heap.pop();   // drop smallest
  }
  const out = [];
  while (heap.size) out.push(heap.pop());
  return out.reverse();              // largest first
}

// --- demo ---
console.log(kLargest([3, 1, 5, 12, 2, 11], 3)); // [12, 11, 5]`,
          },
          {
            tech: "java",
            label: "Java",
            code: `import java.util.*;

public class Main {
    static int[] kLargest(int[] nums, int k) {
        PriorityQueue<Integer> heap = new PriorityQueue<>(); // min-heap
        for (int n : nums) {
            heap.offer(n);
            if (heap.size() > k) heap.poll();   // drop smallest
        }
        int[] out = new int[k];
        for (int i = k - 1; i >= 0; i--) out[i] = heap.poll();
        return out;
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(
            kLargest(new int[]{3, 1, 5, 12, 2, 11}, 3))); // [12, 11, 5]
    }
}`,
          },
          {
            tech: "cpp",
            label: "C++",
            code: `#include <bits/stdc++.h>
using namespace std;

vector<int> kLargest(vector<int>& nums, int k) {
    priority_queue<int, vector<int>, greater<int>> heap; // min-heap
    for (int n : nums) {
        heap.push(n);
        if ((int)heap.size() > k) heap.pop();  // drop smallest
    }
    vector<int> out;
    while (!heap.empty()) { out.push_back(heap.top()); heap.pop(); }
    return out;                                 // smallest..largest of top k
}

int main() {
    vector<int> nums = {3, 1, 5, 12, 2, 11};
    for (int x : kLargest(nums, 3)) cout << x << " ";
    cout << endl;                               // 5 11 12
    return 0;
}`,
          },
        ],
      },
    ],
  },

  {
    title: "What is a greedy algorithm?",
    answer: `
**Intuition.** A greedy algorithm builds a solution one step at a time, always taking the choice that looks best **right now**, never reconsidering. It is fast and simple — but only *correct* when local optima compose into a global optimum.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 180" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="18" fill="currentColor" font-size="12" opacity="0.7">activity selection: sort by end time, keep non-overlapping</text>
  <line x1="20" y1="150" x2="500" y2="150" stroke="currentColor" stroke-opacity="0.3"/>
  <g>
    <rect x="40" y="40" width="120" height="20" rx="5" fill="#22c55e" fill-opacity="0.3" stroke="#22c55e"/>
    <text x="100" y="55" fill="currentColor" font-size="11" text-anchor="middle">A ✓</text>
    <rect x="120" y="66" width="120" height="20" rx="5" fill="#ef4444" fill-opacity="0.18" stroke="#ef4444" stroke-dasharray="4 3"/>
    <text x="180" y="81" fill="currentColor" font-size="11" text-anchor="middle">B ✗ overlaps A</text>
    <rect x="180" y="92" width="130" height="20" rx="5" fill="#22c55e" fill-opacity="0.3" stroke="#22c55e"/>
    <text x="245" y="107" fill="currentColor" font-size="11" text-anchor="middle">C ✓</text>
    <rect x="330" y="118" width="140" height="20" rx="5" fill="#22c55e" fill-opacity="0.3" stroke="#22c55e"/>
    <text x="400" y="133" fill="currentColor" font-size="11" text-anchor="middle">D ✓</text>
  </g>
  <text x="260" y="172" fill="currentColor" font-size="11" text-anchor="middle" opacity="0.7">earliest finishing first leaves the most room for the rest</text>
</svg>
</div>

### When is greedy correct? Two properties
1. **Greedy-choice property** — a locally optimal choice is part of *some* globally optimal solution.
2. **Optimal substructure** — once you commit to the greedy choice, the remaining subproblem is the same kind of problem.

If those hold, greedy gives the optimum. If they don't, greedy can be wrong and you need **DP** instead.

| Greedy works | Greedy fails (needs DP) |
| --- | --- |
| Activity selection / interval scheduling | 0/1 knapsack |
| Huffman coding | coin change with arbitrary coins |
| Dijkstra (non-negative weights) | longest path in a graph |
| Fractional knapsack | edit distance |

**Dry run (activity selection).** Sort by finish time. Pick A (finishes first). B overlaps A → skip. C starts after A → pick. D starts after C → pick. Result: A, C, D — provably maximal.

> **Interview tip:** never *assume* greedy is correct — say "greedy works **if** I can prove the greedy-choice property", then give a one-line exchange argument or a counterexample. Famous trap: greedy coin change is wrong for coins like {1, 3, 4} making 6 (greedy gives 4+1+1, optimal is 3+3).
`,
    examples: [
      {
        label: "Activity selection (interval scheduling)",
        variants: [
          {
            tech: "python",
            label: "Python",
            code: `def max_activities(intervals):
    # intervals = list of (start, end)
    intervals.sort(key=lambda x: x[1])   # by finish time
    count, last_end = 0, float('-inf')
    for start, end in intervals:
        if start >= last_end:
            count += 1
            last_end = end
    return count


# --- demo ---
print(max_activities([(1, 3), (2, 5), (4, 7), (6, 9), (8, 10)]))   # 3`,
          },
          {
            tech: "javascript",
            label: "JavaScript",
            code: `function maxActivities(intervals) {
  // intervals = [[start, end], ...]
  intervals.sort((a, b) => a[1] - b[1]);   // by finish time
  let count = 0, lastEnd = -Infinity;
  for (const [start, end] of intervals) {
    if (start >= lastEnd) { count++; lastEnd = end; }
  }
  return count;
}

// --- demo ---
console.log(maxActivities([[1, 3], [2, 5], [4, 7], [6, 9], [8, 10]])); // 3`,
          },
          {
            tech: "java",
            label: "Java",
            code: `import java.util.*;

public class Main {
    static int maxActivities(int[][] intervals) {
        Arrays.sort(intervals, (a, b) -> a[1] - b[1]); // by finish
        int count = 0, lastEnd = Integer.MIN_VALUE;
        for (int[] it : intervals) {
            if (it[0] >= lastEnd) { count++; lastEnd = it[1]; }
        }
        return count;
    }

    public static void main(String[] args) {
        int[][] iv = {{1,3},{2,5},{4,7},{6,9},{8,10}};
        System.out.println(maxActivities(iv));   // 3
    }
}`,
          },
          {
            tech: "cpp",
            label: "C++",
            code: `#include <bits/stdc++.h>
using namespace std;

int maxActivities(vector<pair<int,int>>& intervals) {
    sort(intervals.begin(), intervals.end(),
         [](auto& a, auto& b){ return a.second < b.second; });
    int count = 0, lastEnd = INT_MIN;
    for (auto& [start, end] : intervals) {
        if (start >= lastEnd) { count++; lastEnd = end; }
    }
    return count;
}

int main() {
    vector<pair<int,int>> iv = {{1,3},{2,5},{4,7},{6,9},{8,10}};
    cout << maxActivities(iv) << endl;   // 3
    return 0;
}`,
          },
        ],
      },
    ],
  },

  {
    title: "What is backtracking?",
    answer: `
**Intuition.** Backtracking is brute force with a brain. You build a candidate solution one decision at a time; the moment a partial choice can't possibly lead to a valid answer, you **undo it** ("backtrack") and try the next option. It walks the solution space as a tree, pruning dead branches.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 200" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">choose → explore → un-choose (prune dead ends)</text>
  <line x1="250" y1="42" x2="150" y2="92" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="250" y1="42" x2="350" y2="92" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="150" y1="112" x2="100" y2="160" stroke="#ef4444" stroke-opacity="0.5" stroke-dasharray="4 3"/>
  <line x1="150" y1="112" x2="200" y2="160" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="350" y1="112" x2="320" y2="160" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="350" y1="112" x2="410" y2="160" stroke="currentColor" stroke-opacity="0.3"/>
  <g font-size="13" text-anchor="middle">
    <circle cx="250" cy="34" r="20" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="250" y="39" fill="currentColor">[]</text>
    <circle cx="150" cy="104" r="20" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="150" y="109" fill="currentColor">1</text>
    <circle cx="350" cy="104" r="20" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="350" y="109" fill="currentColor">2</text>
    <circle cx="100" cy="172" r="18" fill="#ef4444" fill-opacity="0.15" stroke="#ef4444"/><text x="100" y="177" fill="currentColor">✗</text>
    <circle cx="200" cy="172" r="18" fill="#22c55e" fill-opacity="0.22" stroke="#22c55e"/><text x="200" y="177" fill="currentColor">✓</text>
    <circle cx="320" cy="172" r="18" fill="#22c55e" fill-opacity="0.22" stroke="#22c55e"/><text x="320" y="177" fill="currentColor">✓</text>
    <circle cx="410" cy="172" r="18" fill="#22c55e" fill-opacity="0.22" stroke="#22c55e"/><text x="410" y="177" fill="currentColor">✓</text>
  </g>
  <circle cx="100" cy="172" r="24" fill="none" stroke="#ef4444" stroke-width="2.5" opacity="0">
    <animate attributeName="opacity" values="0;1;1;0" dur="2.5s" repeatCount="indefinite" keyTimes="0;0.3;0.6;1"/>
  </circle>
  <text x="100" y="200" fill="#ef4444" font-size="10" text-anchor="middle">pruned</text>
</svg>
</div>

### The universal template
1. If the candidate is **complete**, record it.
2. For each **valid choice** at this step: apply it → recurse → **undo it**.
3. Skip choices that violate a constraint early (pruning) to cut the search.

### Classic problems
| Problem | The "choice" |
| --- | --- |
| Subsets / combinations | include or exclude each element |
| Permutations | which unused element goes next |
| N-Queens | which column to place the queen in this row |
| Sudoku | which digit fills this cell |
| Word search / maze | which direction to step |

Worst case it explores the whole tree (exponential, e.g. O(2ⁿ) for subsets, O(n!) for permutations), but **pruning** usually makes it far faster in practice.

**Dry run (subsets of [1,2]).** Start []. Choose 1 → [1] → choose 2 → [1,2] ✓ → undo 2 → [1] ✓ → undo 1 → []. Choose 2 → [2] ✓ → undo. Yields [], [1], [1,2], [2].

> **Interview tip:** always pair the "choose" with an explicit "un-choose" (pop what you pushed). Forgetting to undo state is the #1 backtracking bug. Mention pruning — it's what separates a passable answer from a strong one.
`,
    examples: [
      {
        label: "Generate all subsets",
        variants: [
          {
            tech: "python",
            label: "Python",
            code: `def subsets(nums):
    result, path = [], []
    def backtrack(start):
        result.append(path[:])           # record a copy
        for i in range(start, len(nums)):
            path.append(nums[i])         # choose
            backtrack(i + 1)             # explore
            path.pop()                   # un-choose
    backtrack(0)
    return result


# --- demo ---
print(subsets([1, 2, 3]))   # [[], [1], [1,2], [1,2,3], [1,3], [2], [2,3], [3]]`,
          },
          {
            tech: "javascript",
            label: "JavaScript",
            code: `function subsets(nums) {
  const result = [], path = [];
  function backtrack(start) {
    result.push([...path]);              // record a copy
    for (let i = start; i < nums.length; i++) {
      path.push(nums[i]);                // choose
      backtrack(i + 1);                  // explore
      path.pop();                        // un-choose
    }
  }
  backtrack(0);
  return result;
}

// --- demo ---
console.log(JSON.stringify(subsets([1, 2, 3])));
// [[],[1],[1,2],[1,2,3],[1,3],[2],[2,3],[3]]`,
          },
          {
            tech: "java",
            label: "Java",
            code: `import java.util.*;

public class Main {
    static List<List<Integer>> subsets(int[] nums) {
        List<List<Integer>> result = new ArrayList<>();
        backtrack(nums, 0, new ArrayList<>(), result);
        return result;
    }

    static void backtrack(int[] nums, int start,
                   List<Integer> path, List<List<Integer>> result) {
        result.add(new ArrayList<>(path));   // record a copy
        for (int i = start; i < nums.length; i++) {
            path.add(nums[i]);               // choose
            backtrack(nums, i + 1, path, result); // explore
            path.remove(path.size() - 1);    // un-choose
        }
    }

    public static void main(String[] args) {
        System.out.println(subsets(new int[]{1, 2, 3}));
    }
}`,
          },
          {
            tech: "cpp",
            label: "C++",
            code: `#include <bits/stdc++.h>
using namespace std;

void backtrack(vector<int>& nums, int start,
               vector<int>& path, vector<vector<int>>& result) {
    result.push_back(path);              // record a copy
    for (int i = start; i < (int)nums.size(); i++) {
        path.push_back(nums[i]);         // choose
        backtrack(nums, i + 1, path, result); // explore
        path.pop_back();                 // un-choose
    }
}

vector<vector<int>> subsets(vector<int>& nums) {
    vector<vector<int>> result;
    vector<int> path;
    backtrack(nums, 0, path, result);
    return result;
}

int main() {
    vector<int> nums = {1, 2, 3};
    for (auto& s : subsets(nums)) {
        cout << "[";
        for (int x : s) cout << x << " ";
        cout << "] ";
    }
    cout << endl;
    return 0;
}`,
          },
        ],
      },
    ],
  },

  {
    title: "How do you detect a cycle in a linked list?",
    answer: `
**Intuition.** Use **Floyd's Tortoise and Hare**: two pointers, one stepping by 1 and one by 2. If the list ends, there is no cycle. If there *is* a loop, the fast pointer laps the slow one and they collide — like two runners on a circular track. O(1) extra space, no hash set needed.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 180" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <g font-size="12" text-anchor="middle">
    <circle cx="60" cy="60" r="20" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/><text x="60" y="65" fill="currentColor">1</text>
    <circle cx="140" cy="60" r="20" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/><text x="140" y="65" fill="currentColor">2</text>
    <circle cx="220" cy="60" r="20" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/><text x="220" y="65" fill="currentColor">3</text>
    <circle cx="300" cy="60" r="20" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/><text x="300" y="65" fill="currentColor">4</text>
    <circle cx="300" cy="130" r="20" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/><text x="300" y="135" fill="currentColor">5</text>
    <circle cx="220" cy="130" r="20" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/><text x="220" y="135" fill="currentColor">6</text>
  </g>
  <line x1="80" y1="60" x2="120" y2="60" stroke="currentColor" stroke-opacity="0.4" marker-end="url(#a3)"/>
  <line x1="160" y1="60" x2="200" y2="60" stroke="currentColor" stroke-opacity="0.4" marker-end="url(#a3)"/>
  <line x1="240" y1="60" x2="280" y2="60" stroke="currentColor" stroke-opacity="0.4" marker-end="url(#a3)"/>
  <line x1="300" y1="80" x2="300" y2="110" stroke="currentColor" stroke-opacity="0.4" marker-end="url(#a3)"/>
  <line x1="280" y1="130" x2="240" y2="130" stroke="currentColor" stroke-opacity="0.4" marker-end="url(#a3)"/>
  <path d="M204,124 Q150,96 204,68" fill="none" stroke="#ef4444" stroke-opacity="0.5" marker-end="url(#a3r)"/>
  <text x="150" y="100" fill="#ef4444" font-size="11">loops back</text>
  <circle cx="60" cy="60" r="9" fill="#22c55e">
    <animate attributeName="cx" values="60;140;220;300;300;220;220" dur="3s" repeatCount="indefinite"/>
    <animate attributeName="cy" values="60;60;60;60;130;130;60" dur="3s" repeatCount="indefinite"/>
  </circle>
  <circle cx="60" cy="60" r="7" fill="#f59e0b">
    <animate attributeName="cx" values="60;220;300;220;220;300;220" dur="3s" repeatCount="indefinite"/>
    <animate attributeName="cy" values="60;60;60;130;60;60;60" dur="3s" repeatCount="indefinite"/>
  </circle>
  <text x="430" y="55" fill="#22c55e" font-size="11">slow +1</text>
  <text x="430" y="72" fill="#f59e0b" font-size="11">fast +2</text>
  <defs>
    <marker id="a3" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="currentColor" fill-opacity="0.5"/></marker>
    <marker id="a3r" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#ef4444" fill-opacity="0.6"/></marker>
  </defs>
</svg>
</div>

### Why it works
Inside a loop of length L, each step the fast pointer gains 1 on the slow pointer, so the gap shrinks by 1 every move — they must meet within L steps. If there's no loop, fast simply hits <code>null</code> first.

| Approach | Time | Space |
| --- | --- | --- |
| **Floyd's two pointers** | O(n) | **O(1)** |
| Hash set of visited nodes | O(n) | O(n) |

**Bonus — finding the cycle's start.** After they meet, reset one pointer to the head and advance both by 1; they meet again exactly at the loop entrance (a classic follow-up).

**Dry run.** slow: 1→2→3; fast: 1→3→5→6→... they circle the 3-4-5-6 loop until slow and fast land on the same node → returns **true**.

> **Interview tip:** lead with "Floyd's cycle detection, O(1) space" — interviewers specifically want the constant-space answer, not the hash-set one. Be ready for the follow-up: *where* does the cycle begin?
`,
    examples: [
      {
        label: "Floyd's cycle detection",
        variants: [
          {
            tech: "python",
            label: "Python",
            code: `class ListNode:
    def __init__(self, val, nxt=None):
        self.val, self.next = val, nxt

def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False


# --- demo ---
a, b, c, d = ListNode(1), ListNode(2), ListNode(3), ListNode(4)
a.next, b.next, c.next, d.next = b, c, d, b   # tail links back -> cycle
print(has_cycle(a))                            # True
x = ListNode(1); x.next = ListNode(2)
print(has_cycle(x))                            # False`,
          },
          {
            tech: "javascript",
            label: "JavaScript",
            code: `class ListNode {
  constructor(val, next = null) { this.val = val; this.next = next; }
}

function hasCycle(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}

// --- demo ---
const a = new ListNode(1), b = new ListNode(2), c = new ListNode(3), d = new ListNode(4);
a.next = b; b.next = c; c.next = d; d.next = b;   // tail links back -> cycle
console.log(hasCycle(a));                          // true
const x = new ListNode(1); x.next = new ListNode(2);
console.log(hasCycle(x));                          // false`,
          },
          {
            tech: "java",
            label: "Java",
            code: `public class Main {
    static class ListNode {
        int val; ListNode next;
        ListNode(int val) { this.val = val; }
    }

    static boolean hasCycle(ListNode head) {
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) return true;
        }
        return false;
    }

    public static void main(String[] args) {
        ListNode a = new ListNode(1), b = new ListNode(2),
                 c = new ListNode(3), d = new ListNode(4);
        a.next = b; b.next = c; c.next = d; d.next = b;   // cycle
        System.out.println(hasCycle(a));                  // true
        ListNode x = new ListNode(1); x.next = new ListNode(2);
        System.out.println(hasCycle(x));                  // false
    }
}`,
          },
          {
            tech: "cpp",
            label: "C++",
            code: `#include <bits/stdc++.h>
using namespace std;

struct ListNode {
    int val;
    ListNode* next = nullptr;
    ListNode(int v) : val(v) {}
};

bool hasCycle(ListNode* head) {
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) return true;
    }
    return false;
}

int main() {
    ListNode* a = new ListNode(1); ListNode* b = new ListNode(2);
    ListNode* c = new ListNode(3); ListNode* d = new ListNode(4);
    a->next = b; b->next = c; c->next = d; d->next = b;   // cycle
    cout << boolalpha << hasCycle(a) << endl;             // true
    ListNode* x = new ListNode(1); x->next = new ListNode(2);
    cout << hasCycle(x) << endl;                          // false
    return 0;
}`,
          },
        ],
      },
    ],
  },

  {
    title: "What is a trie and when is it useful?",
    answer: `
**Intuition.** A trie (prefix tree) stores strings by their **shared prefixes**. Each node is a character; a path from the root spells a word. Looking up a word costs O(L) in its length — completely independent of how many words the trie holds.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 200" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">words: cat, car, can — shared prefix "ca"</text>
  <line x1="100" y1="46" x2="100" y2="84" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="100" y1="106" x2="100" y2="144" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="100" y1="166" x2="60" y2="190" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="100" y1="166" x2="140" y2="190" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="100" y1="166" x2="100" y2="190" stroke="currentColor" stroke-opacity="0.3"/>
  <g font-size="13" text-anchor="middle">
    <circle cx="100" cy="34" r="16" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.3"/><text x="100" y="39" fill="currentColor" font-size="10">root</text>
    <circle cx="100" cy="96" r="16" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="100" y="101" fill="currentColor">c</text>
    <circle cx="100" cy="156" r="16" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="100" y="161" fill="currentColor">a</text>
    <circle cx="60" cy="190" r="14" fill="#22c55e" fill-opacity="0.22" stroke="#22c55e"/><text x="60" y="195" fill="currentColor">t</text>
    <circle cx="100" cy="190" r="14" fill="#22c55e" fill-opacity="0.22" stroke="#22c55e"/><text x="100" y="195" fill="currentColor">r</text>
    <circle cx="140" cy="190" r="14" fill="#22c55e" fill-opacity="0.22" stroke="#22c55e"/><text x="140" y="195" fill="currentColor">n</text>
  </g>
  <circle cx="100" cy="96" r="20" fill="none" stroke="#f59e0b" stroke-width="2.5" opacity="0"><animate attributeName="opacity" values="0;1;1;0;0" dur="3s" repeatCount="indefinite" keyTimes="0;0.1;0.3;0.4;1"/></circle>
  <circle cx="100" cy="156" r="20" fill="none" stroke="#f59e0b" stroke-width="2.5" opacity="0"><animate attributeName="opacity" values="0;0;1;1;0" dur="3s" repeatCount="indefinite" keyTimes="0;0.3;0.45;0.7;0.8"/></circle>
  <text x="300" y="96" fill="currentColor" font-size="12" opacity="0.7">green = end of a word</text>
  <text x="300" y="118" fill="currentColor" font-size="12" opacity="0.7">"ca" stored once,</text>
  <text x="300" y="136" fill="currentColor" font-size="12" opacity="0.7">shared by all three</text>
</svg>
</div>

### Operations (L = word length)
| Operation | Cost |
| --- | --- |
| Insert a word | O(L) |
| Search exact word | O(L) |
| Prefix exists / autocomplete | O(L + matches) |

Each node has a map/array of child links plus an <code>isEndOfWord</code> flag. Storing 100,000 words that share prefixes is far more compact than 100,000 separate strings.

### Where tries win
- **Autocomplete / typeahead** — find every word under a prefix.
- **Spell-check** and dictionary lookups.
- **Prefix matching** in IP routing, word games (Boggle), longest-prefix problems.

**Trie vs hash set.** A hash set answers "is this exact word present?" in O(L) too — but it **cannot** answer "which words start with <code>ca</code>?" A trie makes prefix queries first-class.

**Dry run (search "car").** root → 'c' (exists) → 'a' (exists) → 'r' (exists, isEnd = true) → **found**. Searching "ca" returns *prefix exists* but *not a complete word* (no end flag).

> **Interview tip:** reach for a trie the instant a problem mentions **prefixes** or **autocomplete**. Note the trade-off: tries use more memory per node than a hash set, so they pay off specifically when prefix queries matter.
`,
    examples: [
      {
        label: "Trie: insert, search, startsWith",
        variants: [
          {
            tech: "python",
            label: "Python",
            code: `class Trie:
    def __init__(self):
        self.root = {}

    def insert(self, word):
        node = self.root
        for ch in word:
            node = node.setdefault(ch, {})
        node["$"] = True              # end-of-word marker

    def search(self, word):
        node = self._walk(word)
        return node is not None and "$" in node

    def starts_with(self, prefix):
        return self._walk(prefix) is not None

    def _walk(self, s):
        node = self.root
        for ch in s:
            if ch not in node: return None
            node = node[ch]
        return node


# --- demo ---
t = Trie()
for w in ["cat", "car", "can"]:
    t.insert(w)
print(t.search("car"))        # True
print(t.search("ca"))         # False (prefix, not a full word)
print(t.starts_with("ca"))    # True`,
          },
          {
            tech: "javascript",
            label: "JavaScript",
            code: `class Trie {
  constructor() { this.root = {}; }

  insert(word) {
    let node = this.root;
    for (const ch of word) node = node[ch] ??= {};
    node.$ = true;                    // end-of-word marker
  }

  search(word) {
    const node = this._walk(word);
    return !!node && node.$ === true;
  }

  startsWith(prefix) {
    return this._walk(prefix) !== null;
  }

  _walk(s) {
    let node = this.root;
    for (const ch of s) {
      if (!(ch in node)) return null;
      node = node[ch];
    }
    return node;
  }
}

// --- demo ---
const t = new Trie();
for (const w of ["cat", "car", "can"]) t.insert(w);
console.log(t.search("car"));      // true
console.log(t.search("ca"));       // false (prefix, not a full word)
console.log(t.startsWith("ca"));   // true`,
          },
          {
            tech: "java",
            label: "Java",
            code: `public class Main {
    public static void main(String[] args) {
        Trie t = new Trie();
        for (String w : new String[]{"cat", "car", "can"}) t.insert(w);
        System.out.println(t.search("car"));     // true
        System.out.println(t.search("ca"));      // false
        System.out.println(t.startsWith("ca"));  // true
    }
}

class Trie {
    static class Node {
        Node[] kids = new Node[26];
        boolean end;
    }
    private final Node root = new Node();

    void insert(String word) {
        Node node = root;
        for (char c : word.toCharArray()) {
            int i = c - 'a';
            if (node.kids[i] == null) node.kids[i] = new Node();
            node = node.kids[i];
        }
        node.end = true;
    }

    boolean search(String word) {
        Node n = walk(word);
        return n != null && n.end;
    }

    boolean startsWith(String prefix) { return walk(prefix) != null; }

    private Node walk(String s) {
        Node node = root;
        for (char c : s.toCharArray()) {
            int i = c - 'a';
            if (node.kids[i] == null) return null;
            node = node.kids[i];
        }
        return node;
    }
}`,
          },
          {
            tech: "cpp",
            label: "C++",
            code: `#include <bits/stdc++.h>
using namespace std;

struct Trie {
    struct Node { Node* kids[26] = {}; bool end = false; };
    Node* root = new Node();

    void insert(const string& word) {
        Node* node = root;
        for (char c : word) {
            int i = c - 'a';
            if (!node->kids[i]) node->kids[i] = new Node();
            node = node->kids[i];
        }
        node->end = true;
    }

    bool search(const string& word) {
        Node* n = walk(word);
        return n && n->end;
    }

    bool startsWith(const string& prefix) { return walk(prefix); }

    Node* walk(const string& s) {
        Node* node = root;
        for (char c : s) {
            int i = c - 'a';
            if (!node->kids[i]) return nullptr;
            node = node->kids[i];
        }
        return node;
    }
};

int main() {
    Trie t;
    for (string w : {"cat", "car", "can"}) t.insert(w);
    cout << boolalpha << t.search("car") << endl;     // true
    cout << t.search("ca") << endl;                   // false
    cout << t.startsWith("ca") << endl;               // true
    return 0;
}`,
          },
        ],
      },
    ],
  },

  {
    title: "How does Dijkstra's algorithm work?",
    answer: `
**Intuition.** Dijkstra finds the shortest path from one source to every node in a graph with **non-negative** edge weights. It always expands the **closest unfinalized node** next (via a min-heap), "relaxing" its edges — because with no negative edges, once a node is the cheapest reachable, no later path can beat it.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 190" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <line x1="70" y1="95" x2="200" y2="50" stroke="currentColor" stroke-opacity="0.35"/><text x="125" y="60" fill="currentColor" font-size="11">4</text>
  <line x1="70" y1="95" x2="200" y2="140" stroke="currentColor" stroke-opacity="0.35"/><text x="125" y="135" fill="currentColor" font-size="11">1</text>
  <line x1="200" y1="50" x2="340" y2="95" stroke="currentColor" stroke-opacity="0.35"/><text x="280" y="60" fill="currentColor" font-size="11">1</text>
  <line x1="200" y1="140" x2="200" y2="72" stroke="#22c55e" stroke-opacity="0.6" stroke-width="2"/><text x="210" y="105" fill="#22c55e" font-size="11">2</text>
  <line x1="200" y1="140" x2="340" y2="95" stroke="currentColor" stroke-opacity="0.35"/><text x="280" y="135" fill="currentColor" font-size="11">5</text>
  <g font-size="13" text-anchor="middle">
    <circle cx="70" cy="95" r="22" fill="#22c55e" fill-opacity="0.22" stroke="#22c55e"/><text x="70" y="100" fill="currentColor">A</text>
    <circle cx="200" cy="50" r="22" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="200" y="55" fill="currentColor">B</text>
    <circle cx="200" cy="140" r="22" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="200" y="145" fill="currentColor">C</text>
    <circle cx="340" cy="95" r="22" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="340" y="100" fill="currentColor">D</text>
  </g>
  <g font-size="11" fill="#f59e0b" text-anchor="middle">
    <text x="70" y="135">0</text>
    <text x="200" y="22">3</text>
    <text x="172" y="170">1</text>
    <text x="372" y="100">4</text>
  </g>
  <text x="410" y="50" fill="currentColor" font-size="11" opacity="0.7">A→C→B→D</text>
  <text x="410" y="68" fill="currentColor" font-size="11" opacity="0.7">= 1+2+1 = 4</text>
</svg>
</div>

The orange numbers are the **final shortest distances** from A. Note A→C (1) then C→B (1+2=3) beats the direct A→B (4) — relaxation found the cheaper route.

### The algorithm
1. <code>dist[source] = 0</code>, all others ∞. Push <code>(0, source)</code> into a min-heap.
2. Pop the node with the smallest distance. If it is stale (a better distance was already finalized), skip it.
3. **Relax** each neighbour: if <code>dist[u] + weight &lt; dist[v]</code>, update <code>dist[v]</code> and push it.
4. Repeat until the heap empties.

| | Complexity |
| --- | --- |
| With a binary heap | O((V + E) log V) |
| Space | O(V) |

### Limits and cousins
- **Negative edges?** Dijkstra can be wrong — use **Bellman-Ford** (O(V·E)), which also detects negative cycles.
- **Unweighted graph?** Plain **BFS** already gives shortest paths in O(V+E).
- **All-pairs?** **Floyd-Warshall** (O(V³)).

> **Interview tip:** state the **non-negative weight** precondition unprompted — it's the assumption the whole correctness argument rests on. If the interviewer adds a negative edge, pivot to Bellman-Ford.
`,
    examples: [
      {
        label: "Dijkstra with a min-heap",
        variants: [
          {
            tech: "python",
            label: "Python",
            code: `import heapq

def dijkstra(graph, source):
    # graph: {node: [(neighbor, weight), ...]}
    dist = {source: 0}
    heap = [(0, source)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist.get(u, float('inf')):
            continue                    # stale entry
        for v, w in graph[u]:
            nd = d + w
            if nd < dist.get(v, float('inf')):
                dist[v] = nd
                heapq.heappush(heap, (nd, v))
    return dist


# --- demo ---  nodes A=0 B=1 C=2 D=3
graph = {0: [(1, 4), (2, 1)], 1: [(3, 1)], 2: [(1, 2), (3, 5)], 3: []}
print(dijkstra(graph, 0))   # {0: 0, 2: 1, 1: 3, 3: 4}`,
          },
          {
            tech: "javascript",
            label: "JavaScript",
            code: `function dijkstra(graph, source) {
  // graph: { node: [[neighbor, weight], ...] }
  const dist = { [source]: 0 };
  // min-heap simulated with a sorted array for brevity
  const heap = [[0, source]];
  while (heap.length) {
    heap.sort((a, b) => a[0] - b[0]);
    const [d, u] = heap.shift();
    if (d > (dist[u] ?? Infinity)) continue;   // stale
    for (const [v, w] of graph[u] || []) {
      const nd = d + w;
      if (nd < (dist[v] ?? Infinity)) {
        dist[v] = nd;
        heap.push([nd, v]);
      }
    }
  }
  return dist;
}

// --- demo ---  nodes A=0 B=1 C=2 D=3
const graph = { 0: [[1, 4], [2, 1]], 1: [[3, 1]], 2: [[1, 2], [3, 5]], 3: [] };
console.log(dijkstra(graph, 0)); // { '0': 0, '1': 3, '2': 1, '3': 4 }`,
          },
          {
            tech: "java",
            label: "Java",
            code: `import java.util.*;

public class Main {
    static Map<Integer,Integer> dijkstra(
            Map<Integer,List<int[]>> graph, int source) {
        Map<Integer,Integer> dist = new HashMap<>();
        dist.put(source, 0);
        PriorityQueue<int[]> heap =
            new PriorityQueue<>((a, b) -> a[0] - b[0]);
        heap.offer(new int[]{0, source});
        while (!heap.isEmpty()) {
            int[] top = heap.poll();
            int d = top[0], u = top[1];
            if (d > dist.getOrDefault(u, Integer.MAX_VALUE)) continue;
            for (int[] e : graph.getOrDefault(u, List.of())) {
                int v = e[0], nd = d + e[1];
                if (nd < dist.getOrDefault(v, Integer.MAX_VALUE)) {
                    dist.put(v, nd);
                    heap.offer(new int[]{nd, v});
                }
            }
        }
        return dist;
    }

    public static void main(String[] args) {
        Map<Integer,List<int[]>> graph = new HashMap<>();
        graph.put(0, List.of(new int[]{1,4}, new int[]{2,1}));
        graph.put(1, List.of(new int[]{3,1}));
        graph.put(2, List.of(new int[]{1,2}, new int[]{3,5}));
        graph.put(3, List.of());
        System.out.println(new TreeMap<>(dijkstra(graph, 0))); // {0=0, 1=3, 2=1, 3=4}
    }
}`,
          },
          {
            tech: "cpp",
            label: "C++",
            code: `#include <bits/stdc++.h>
using namespace std;

vector<int> dijkstra(vector<vector<pair<int,int>>>& graph, int src) {
    int n = graph.size();
    vector<int> dist(n, INT_MAX);
    dist[src] = 0;
    priority_queue<pair<int,int>, vector<pair<int,int>>,
                   greater<>> heap;
    heap.push({0, src});
    while (!heap.empty()) {
        auto [d, u] = heap.top(); heap.pop();
        if (d > dist[u]) continue;          // stale
        for (auto [v, w] : graph[u]) {
            if (d + w < dist[v]) {
                dist[v] = d + w;
                heap.push({dist[v], v});
            }
        }
    }
    return dist;
}

int main() {
    vector<vector<pair<int,int>>> graph = {
        {{1,4},{2,1}}, {{3,1}}, {{1,2},{3,5}}, {}
    };
    for (int d : dijkstra(graph, 0)) cout << d << " ";
    cout << endl;   // 0 3 1 4
    return 0;
}`,
          },
        ],
      },
    ],
  },

  {
    title: "What is a stable sorting algorithm?",
    answer: `
**Intuition.** A sort is **stable** if elements that compare *equal* keep their original relative order. It only matters when records carry more than the sort key — e.g. sorting people by age shouldn't scramble the order they were already in by name.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 200" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="18" fill="currentColor" font-size="12" opacity="0.7">sort by number; the letters track original order</text>
  <g font-size="12" text-anchor="middle">
    <rect x="40" y="30" width="60" height="30" rx="5" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="70" y="50" fill="currentColor">3a</text>
    <rect x="110" y="30" width="60" height="30" rx="5" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="140" y="50" fill="currentColor">1b</text>
    <rect x="180" y="30" width="60" height="30" rx="5" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="210" y="50" fill="currentColor">3c</text>
    <rect x="250" y="30" width="60" height="30" rx="5" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="280" y="50" fill="currentColor">1d</text>
  </g>
  <text x="20" y="100" fill="#22c55e" font-size="12" font-weight="700">stable →</text>
  <g font-size="12" text-anchor="middle">
    <rect x="110" y="84" width="60" height="30" rx="5" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="140" y="104" fill="currentColor">1b</text>
    <rect x="180" y="84" width="60" height="30" rx="5" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="210" y="104" fill="currentColor">1d</text>
    <rect x="250" y="84" width="60" height="30" rx="5" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="280" y="104" fill="currentColor">3a</text>
    <rect x="320" y="84" width="60" height="30" rx="5" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="350" y="104" fill="currentColor">3c</text>
  </g>
  <text x="20" y="158" fill="#ef4444" font-size="12" font-weight="700">unstable →</text>
  <g font-size="12" text-anchor="middle">
    <rect x="110" y="142" width="60" height="30" rx="5" fill="#ef4444" fill-opacity="0.14" stroke="#ef4444"/><text x="140" y="162" fill="currentColor">1d</text>
    <rect x="180" y="142" width="60" height="30" rx="5" fill="#ef4444" fill-opacity="0.14" stroke="#ef4444"/><text x="210" y="162" fill="currentColor">1b</text>
    <rect x="250" y="142" width="60" height="30" rx="5" fill="#ef4444" fill-opacity="0.14" stroke="#ef4444"/><text x="280" y="162" fill="currentColor">3c</text>
    <rect x="320" y="142" width="60" height="30" rx="5" fill="#ef4444" fill-opacity="0.14" stroke="#ef4444"/><text x="350" y="162" fill="currentColor">3a</text>
  </g>
  <text x="430" y="104" fill="#22c55e" font-size="11">b before d ✓</text>
  <text x="430" y="162" fill="#ef4444" font-size="11">order flipped ✗</text>
</svg>
</div>

Both rows are correctly sorted by number — but only the stable sort keeps <code>b</code> before <code>d</code> and <code>a</code> before <code>c</code>, matching the input order.

### Which sorts are stable?
| Stable | Not stable (by default) |
| --- | --- |
| Merge sort | Quicksort |
| Insertion sort | Heap sort |
| Bubble sort | Selection sort |
| Counting / radix sort | — |

### Why it matters: multi-key sorting
Stability lets you sort by several keys in passes. Sort by **name** first, then by **date** with a stable sort — same-date rows stay in name order. With an unstable sort you'd have to compare both keys at once.

Most standard libraries hand you a **stable** sort for objects: Python's <code>sorted</code>/<code>list.sort</code> (Timsort), Java's <code>Collections.sort</code>, JavaScript's <code>Array.sort</code> (stable since ES2019), C++ <code>std::stable_sort</code>. C++ <code>std::sort</code> and Java's primitive <code>Arrays.sort</code> are **not** guaranteed stable.

> **Interview tip:** if a problem sorts records by one field but says "preserve existing order of ties" — or chains sorts by multiple keys — call out that you need a **stable** sort. It's a small detail interviewers love to see you notice.
`,
    examples: [
      {
        label: "Stable multi-key sort",
        variants: [
          {
            tech: "python",
            label: "Python",
            code: `people = [("Bob", 30), ("Ann", 25), ("Cy", 30), ("Dan", 25)]

# sort by age; Timsort is stable, so equal ages keep input order
by_age = sorted(people, key=lambda p: p[1])

# --- demo --- Ann before Dan, Bob before Cy (input order preserved)
print(by_age)   # [('Ann', 25), ('Dan', 25), ('Bob', 30), ('Cy', 30)]`,
          },
          {
            tech: "javascript",
            label: "JavaScript",
            code: `const people = [["Bob",30],["Ann",25],["Cy",30],["Dan",25]];

// Array.sort is stable (ES2019+): equal ages keep input order
const byAge = [...people].sort((a, b) => a[1] - b[1]);

// --- demo ---
console.log(JSON.stringify(byAge));
// [["Ann",25],["Dan",25],["Bob",30],["Cy",30]]`,
          },
          {
            tech: "java",
            label: "Java",
            code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        // {name, age} pairs
        List<String[]> people = new ArrayList<>(List.of(
            new String[]{"Bob","30"}, new String[]{"Ann","25"},
            new String[]{"Cy","30"}, new String[]{"Dan","25"}));
        // List.sort uses a stable Timsort: equal ages keep input order
        people.sort(Comparator.comparingInt(p -> Integer.parseInt(p[1])));
        for (String[] p : people) System.out.print(p[0] + " ");
        System.out.println();   // Ann Dan Bob Cy
        // Note: Arrays.sort(int[]) on primitives is NOT stable.
    }
}`,
          },
          {
            tech: "cpp",
            label: "C++",
            code: `#include <bits/stdc++.h>
using namespace std;

struct Person { string name; int age; };

int main() {
    vector<Person> v = {{"Bob",30},{"Ann",25},{"Cy",30},{"Dan",25}};
    // stable_sort preserves input order among equal ages
    stable_sort(v.begin(), v.end(),
        [](const Person& a, const Person& b){ return a.age < b.age; });
    for (auto& p : v) cout << p.name << " ";
    cout << endl;   // Ann Dan Bob Cy
    return 0;
}`,
          },
        ],
      },
    ],
  },
];

export default augments;
