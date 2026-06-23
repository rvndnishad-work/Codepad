/**
 * DSA augment batch 6 — arrays/strings problems from dsa-3.json (part 1).
 * Multiple SVGs per answer where a second diagram clarifies the idea.
 * See dsa-augments.types.ts for the authoring rules (no "${", no raw backticks
 * inside these template literals; inline code uses <code> tags).
 */
import type { DsaAugment } from "./dsa-augments.types";

const augments: DsaAugment[] = [
  {
    title: "How do you find the best time to buy and sell a stock?",
    answer: `
**Intuition.** You want the biggest "sell minus buy" where the sell day comes *after* the buy day. Sweep once, tracking the **lowest price seen so far** — at each day the best profit if you sold today is <code>price − minSoFar</code>. Keep the maximum of those.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 180" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">prices [7,1,5,3,6,4] → buy at 1, sell at 6, profit 5</text>
  <polyline points="40,40 120,150 200,80 280,110 360,50 440,90" fill="none" stroke="#3b82f6" stroke-width="2.5"/>
  <g font-size="11" text-anchor="middle">
    <circle cx="40" cy="40" r="4" fill="#3b82f6"/><text x="40" y="30" fill="currentColor">7</text>
    <circle cx="120" cy="150" r="6" fill="#22c55e"/><text x="120" y="168" fill="#22c55e">1 buy</text>
    <circle cx="200" cy="80" r="4" fill="#3b82f6"/><text x="200" y="70" fill="currentColor">5</text>
    <circle cx="280" cy="110" r="4" fill="#3b82f6"/><text x="280" y="128" fill="currentColor">3</text>
    <circle cx="360" cy="50" r="6" fill="#ef4444"/><text x="360" y="40" fill="#ef4444">6 sell</text>
    <circle cx="440" cy="90" r="4" fill="#3b82f6"/><text x="440" y="80" fill="currentColor">4</text>
  </g>
  <line x1="120" y1="150" x2="120" y2="50" stroke="#22c55e" stroke-opacity="0.4" stroke-dasharray="4 3"/>
  <line x1="360" y1="50" x2="120" y2="50" stroke="#f59e0b" stroke-opacity="0.5" stroke-dasharray="4 3"/>
  <text x="240" y="46" fill="#f59e0b" font-size="11" text-anchor="middle">max gap = 5</text>
</svg>
</div>

### The algorithm
1. <code>minPrice = ∞</code>, <code>best = 0</code>.
2. For each <code>price</code>: <code>minPrice = min(minPrice, price)</code>, then <code>best = max(best, price − minPrice)</code>.
3. Return <code>best</code> (0 if prices only fall).

| Approach | Time | Space |
| --- | --- | --- |
| One pass, track min | **O(n)** | O(1) |
| Brute-force all pairs | O(n²) | O(1) |

This is a lightweight cousin of Kadane's — you're maximising a difference rather than a running sum.

**Dry run.** [7,1,5,3,6,4]: min→7 (p0), min→1 at day1, then 5−1=4, 3−1=2, **6−1=5**, 4−1=3. Best = **5**.

> **Interview tip:** clarify it's a **single** transaction (buy once, sell once). The "at most k transactions" and "with cooldown" variants are DP — name that you'd switch approaches if the constraint changes.
`,
    examples: [
      {
        label: "Track the running minimum",
        variants: [
          { tech: "python", label: "Python", code: `def max_profit(prices):
    min_price = float('inf')
    best = 0
    for price in prices:
        min_price = min(min_price, price)
        best = max(best, price - min_price)
    return best


# --- demo ---
print(max_profit([7, 1, 5, 3, 6, 4]))   # 5  (buy 1, sell 6)` },
          { tech: "javascript", label: "JavaScript", code: `function maxProfit(prices) {
  let minPrice = Infinity, best = 0;
  for (const price of prices) {
    minPrice = Math.min(minPrice, price);
    best = Math.max(best, price - minPrice);
  }
  return best;
}

// --- demo ---
console.log(maxProfit([7, 1, 5, 3, 6, 4])); // 5` },
          { tech: "java", label: "Java", code: `public class Main {
    static int maxProfit(int[] prices) {
        int minPrice = Integer.MAX_VALUE, best = 0;
        for (int price : prices) {
            minPrice = Math.min(minPrice, price);
            best = Math.max(best, price - minPrice);
        }
        return best;
    }

    public static void main(String[] args) {
        System.out.println(maxProfit(new int[]{7, 1, 5, 3, 6, 4})); // 5
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

int maxProfit(vector<int>& prices) {
    int minPrice = INT_MAX, best = 0;
    for (int price : prices) {
        minPrice = min(minPrice, price);
        best = max(best, price - minPrice);
    }
    return best;
}

int main() {
    vector<int> prices = {7, 1, 5, 3, 6, 4};
    cout << maxProfit(prices) << endl;   // 5
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you compute the product of an array except self without division?",
    answer: `
**Intuition.** <code>output[i]</code> is "everything to the left of i" times "everything to the right of i". Compute those two running products in two passes — no division needed (which also dodges the divide-by-zero problem when the array contains a 0).

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 90" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="#3b82f6" font-size="12" opacity="0.85">pass 1 →  prefix products (product of everything to the left)</text>
  <g font-size="12" text-anchor="middle">
    <rect x="60" y="32" width="80" height="34" rx="5" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="100" y="54" fill="currentColor">1</text>
    <rect x="150" y="32" width="80" height="34" rx="5" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="190" y="54" fill="currentColor">1</text>
    <rect x="240" y="32" width="80" height="34" rx="5" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="280" y="54" fill="currentColor">2</text>
    <rect x="330" y="32" width="80" height="34" rx="5" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="370" y="54" fill="currentColor">6</text>
  </g>
</svg>
</div>
<div style="margin:0.5rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 110" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="#f59e0b" font-size="12" opacity="0.85">pass 2 ←  multiply by suffix product (everything to the right)</text>
  <g font-size="12" text-anchor="middle">
    <rect x="60" y="30" width="80" height="34" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/><text x="100" y="52" fill="currentColor">×24</text>
    <rect x="150" y="30" width="80" height="34" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/><text x="190" y="52" fill="currentColor">×12</text>
    <rect x="240" y="30" width="80" height="34" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/><text x="280" y="52" fill="currentColor">×4</text>
    <rect x="330" y="30" width="80" height="34" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="#f59e0b"/><text x="370" y="52" fill="currentColor">×1</text>
  </g>
  <g font-size="13" text-anchor="middle" font-weight="700">
    <text x="100" y="92" fill="#22c55e">24</text>
    <text x="190" y="92" fill="#22c55e">12</text>
    <text x="280" y="92" fill="#22c55e">8</text>
    <text x="370" y="92" fill="#22c55e">6</text>
  </g>
  <text x="455" y="92" fill="currentColor" font-size="11" opacity="0.7">result</text>
</svg>
</div>

### The algorithm
1. First pass (left → right): <code>out[i]</code> = product of all elements before i (a running prefix).
2. Second pass (right → left): multiply each <code>out[i]</code> by a running **suffix** product of all elements after i.

| Approach | Time | Space |
| --- | --- | --- |
| Prefix × suffix | O(n) | **O(1)** extra (output aside) |
| Divide total product | O(n) | O(1) — but breaks on zeros |

The output array itself holds the prefix products, so no second array is needed.

**Dry run ([1,2,3,4]).** prefix = [1,1,2,6]; sweep back with suffix 1→4→12→24, multiplying: out = **[24,12,8,6]**.

> **Interview tip:** explicitly say "division is banned (and unsafe with zeros)". Mention the O(1)-extra-space trick of reusing the output array for the prefix pass — that's the detail that turns a good answer into the expected optimal one.
`,
    examples: [
      {
        label: "Prefix then suffix",
        variants: [
          { tech: "python", label: "Python", code: `def product_except_self(nums):
    n = len(nums)
    out = [1] * n
    prefix = 1
    for i in range(n):
        out[i] = prefix
        prefix *= nums[i]
    suffix = 1
    for i in range(n - 1, -1, -1):
        out[i] *= suffix
        suffix *= nums[i]
    return out


# --- demo ---
print(product_except_self([1, 2, 3, 4]))   # [24, 12, 8, 6]` },
          { tech: "javascript", label: "JavaScript", code: `function productExceptSelf(nums) {
  const n = nums.length, out = new Array(n).fill(1);
  let prefix = 1;
  for (let i = 0; i < n; i++) { out[i] = prefix; prefix *= nums[i]; }
  let suffix = 1;
  for (let i = n - 1; i >= 0; i--) { out[i] *= suffix; suffix *= nums[i]; }
  return out;
}

// --- demo ---
console.log(productExceptSelf([1, 2, 3, 4])); // [24, 12, 8, 6]` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static int[] productExceptSelf(int[] nums) {
        int n = nums.length;
        int[] out = new int[n];
        int prefix = 1;
        for (int i = 0; i < n; i++) { out[i] = prefix; prefix *= nums[i]; }
        int suffix = 1;
        for (int i = n - 1; i >= 0; i--) { out[i] *= suffix; suffix *= nums[i]; }
        return out;
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(
            productExceptSelf(new int[]{1, 2, 3, 4}))); // [24, 12, 8, 6]
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

vector<int> productExceptSelf(vector<int>& nums) {
    int n = nums.size();
    vector<int> out(n, 1);
    int prefix = 1;
    for (int i = 0; i < n; i++) { out[i] = prefix; prefix *= nums[i]; }
    int suffix = 1;
    for (int i = n - 1; i >= 0; i--) { out[i] *= suffix; suffix *= nums[i]; }
    return out;
}

int main() {
    vector<int> nums = {1, 2, 3, 4};
    for (int x : productExceptSelf(nums)) cout << x << " ";
    cout << endl;   // 24 12 8 6
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you solve the container with most water problem?",
    answer: `
**Intuition.** Two vertical lines form a container whose water area is <code>min(leftHeight, rightHeight) × width</code>. Start with the **widest** container (pointers at both ends) and move inward. Always advance the **shorter** wall — keeping it can never beat the current area, since width only shrinks.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 170" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">area = min(walls) × width; move the shorter wall</text>
  <line x1="20" y1="150" x2="500" y2="150" stroke="currentColor" stroke-opacity="0.25"/>
  <g stroke-width="6">
    <line x1="60" y1="150" x2="60" y2="120" stroke="#8b5cf6"/>
    <line x1="120" y1="150" x2="120" y2="40" stroke="#22c55e"/>
    <line x1="180" y1="150" x2="180" y2="70" stroke="#8b5cf6"/>
    <line x1="240" y1="150" x2="240" y2="110" stroke="#8b5cf6"/>
    <line x1="300" y1="150" x2="300" y2="80" stroke="#8b5cf6"/>
    <line x1="360" y1="150" x2="360" y2="90" stroke="#8b5cf6"/>
    <line x1="420" y1="150" x2="420" y2="55" stroke="#22c55e"/>
  </g>
  <rect x="120" y="55" width="300" height="95" fill="#3b82f6" fill-opacity="0.16"/>
  <text x="270" y="105" fill="#3b82f6" font-size="12" text-anchor="middle">water held between the two tallest-usable walls</text>
  <text x="120" y="166" fill="#22c55e" font-size="11" text-anchor="middle">left</text>
  <text x="420" y="166" fill="#22c55e" font-size="11" text-anchor="middle">right</text>
</svg>
</div>

### The algorithm
1. <code>left = 0</code>, <code>right = n − 1</code>, <code>best = 0</code>.
2. Compute area; update <code>best</code>.
3. If <code>height[left] &lt; height[right]</code>, do <code>left++</code>; else <code>right−−</code>.
4. Stop when the pointers cross.

| Approach | Time | Space |
| --- | --- | --- |
| Two pointers (greedy) | **O(n)** | O(1) |
| All pairs | O(n²) | O(1) |

**Why move the shorter wall?** The area is capped by the shorter wall. Moving the taller one keeps that cap but loses width — strictly worse. Moving the shorter one is the only move that can find a taller limiting wall.

**Dry run.** Ends [1..7] give a wide but short start; advancing the shorter side each time, the best container forms between the two tall walls → area **49** for the classic [1,8,6,2,5,4,8,3,7].

> **Interview tip:** the proof of why you move the shorter pointer is what interviewers want to hear — "the area is bounded by the smaller height, so moving the larger one can't help." Don't confuse this with *trapping rain water*, which sums water over *every* bar.
`,
    examples: [
      {
        label: "Greedy two pointers",
        variants: [
          { tech: "python", label: "Python", code: `def max_area(height):
    left, right = 0, len(height) - 1
    best = 0
    while left < right:
        best = max(best, min(height[left], height[right]) * (right - left))
        if height[left] < height[right]:
            left += 1
        else:
            right -= 1
    return best


# --- demo ---
print(max_area([1, 8, 6, 2, 5, 4, 8, 3, 7]))   # 49` },
          { tech: "javascript", label: "JavaScript", code: `function maxArea(height) {
  let left = 0, right = height.length - 1, best = 0;
  while (left < right) {
    best = Math.max(best, Math.min(height[left], height[right]) * (right - left));
    if (height[left] < height[right]) left++;
    else right--;
  }
  return best;
}

// --- demo ---
console.log(maxArea([1, 8, 6, 2, 5, 4, 8, 3, 7])); // 49` },
          { tech: "java", label: "Java", code: `public class Main {
    static int maxArea(int[] height) {
        int left = 0, right = height.length - 1, best = 0;
        while (left < right) {
            best = Math.max(best,
                Math.min(height[left], height[right]) * (right - left));
            if (height[left] < height[right]) left++;
            else right--;
        }
        return best;
    }

    public static void main(String[] args) {
        System.out.println(maxArea(new int[]{1,8,6,2,5,4,8,3,7})); // 49
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

int maxArea(vector<int>& height) {
    int left = 0, right = height.size() - 1, best = 0;
    while (left < right) {
        best = max(best,
            min(height[left], height[right]) * (right - left));
        if (height[left] < height[right]) left++;
        else right--;
    }
    return best;
}

int main() {
    vector<int> height = {1, 8, 6, 2, 5, 4, 8, 3, 7};
    cout << maxArea(height) << endl;   // 49
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you solve the trapping rain water problem?",
    answer: `
**Intuition.** Water sitting above bar <code>i</code> is capped by the **shorter** of the tallest wall to its left and the tallest to its right, minus its own height. With two pointers you compute this in one pass: whichever side has the smaller running max is the side whose water you can safely finalise.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 170" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">water[i] = min(maxLeft, maxRight) − height[i]</text>
  <line x1="20" y1="150" x2="500" y2="150" stroke="currentColor" stroke-opacity="0.25"/>
  <!-- heights [0,1,0,2,1,0,1,3,2,1,2,1] simplified -->
  <g>
    <rect x="60" y="130" width="30" height="20" fill="#8b5cf6" fill-opacity="0.3" stroke="#8b5cf6"/>
    <rect x="92" y="110" width="30" height="40" fill="#8b5cf6" fill-opacity="0.3" stroke="#8b5cf6"/>
    <rect x="124" y="90" width="30" height="60" fill="#8b5cf6" fill-opacity="0.3" stroke="#8b5cf6"/>
    <rect x="156" y="130" width="30" height="20" fill="#8b5cf6" fill-opacity="0.3" stroke="#8b5cf6"/>
    <rect x="188" y="50" width="30" height="100" fill="#8b5cf6" fill-opacity="0.3" stroke="#8b5cf6"/>
    <rect x="220" y="110" width="30" height="40" fill="#8b5cf6" fill-opacity="0.3" stroke="#8b5cf6"/>
    <rect x="252" y="90" width="30" height="60" fill="#8b5cf6" fill-opacity="0.3" stroke="#8b5cf6"/>
    <rect x="284" y="70" width="30" height="80" fill="#8b5cf6" fill-opacity="0.3" stroke="#8b5cf6"/>
  </g>
  <!-- trapped water -->
  <g fill="#3b82f6" fill-opacity="0.3">
    <rect x="124" y="70" width="30" height="20"/>
    <rect x="156" y="70" width="30" height="60"/>
    <rect x="220" y="70" width="30" height="40"/>
    <rect x="252" y="70" width="30" height="20"/>
  </g>
  <text x="200" y="60" fill="#3b82f6" font-size="11" text-anchor="middle">trapped water (blue)</text>
</svg>
</div>

### The two-pointer algorithm
1. <code>l = 0</code>, <code>r = n − 1</code>, <code>leftMax = rightMax = 0</code>, <code>total = 0</code>.
2. If <code>height[l] &lt; height[r]</code>: update <code>leftMax</code>; add <code>leftMax − height[l]</code>; <code>l++</code>. Else mirror on the right.
3. Repeat until pointers meet.

| Approach | Time | Space |
| --- | --- | --- |
| Two pointers | O(n) | **O(1)** |
| Precompute left/right max arrays | O(n) | O(n) |
| Monotonic stack | O(n) | O(n) |

Because you advance the side with the smaller bar, the running max on that side is guaranteed to be the true limiting wall — so you can add its water immediately.

**Dry run.** For [0,1,0,2,1,0,1,3,2,1,2,1] the trapped units total **6** — the dips between taller walls fill up to the lower surrounding wall.

> **Interview tip:** distinguish this from *container with most water* — here you **sum water over every bar**; there you pick the single best pair. The O(1)-space two-pointer version is the gold standard; mention the stack and DP alternatives to show range.
`,
    examples: [
      {
        label: "Two-pointer water trapping",
        variants: [
          { tech: "python", label: "Python", code: `def trap(height):
    l, r = 0, len(height) - 1
    left_max = right_max = total = 0
    while l < r:
        if height[l] < height[r]:
            left_max = max(left_max, height[l])
            total += left_max - height[l]
            l += 1
        else:
            right_max = max(right_max, height[r])
            total += right_max - height[r]
            r -= 1
    return total


# --- demo ---
print(trap([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]))   # 6` },
          { tech: "javascript", label: "JavaScript", code: `function trap(height) {
  let l = 0, r = height.length - 1;
  let leftMax = 0, rightMax = 0, total = 0;
  while (l < r) {
    if (height[l] < height[r]) {
      leftMax = Math.max(leftMax, height[l]);
      total += leftMax - height[l];
      l++;
    } else {
      rightMax = Math.max(rightMax, height[r]);
      total += rightMax - height[r];
      r--;
    }
  }
  return total;
}

// --- demo ---
console.log(trap([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1])); // 6` },
          { tech: "java", label: "Java", code: `public class Main {
    static int trap(int[] height) {
        int l = 0, r = height.length - 1;
        int leftMax = 0, rightMax = 0, total = 0;
        while (l < r) {
            if (height[l] < height[r]) {
                leftMax = Math.max(leftMax, height[l]);
                total += leftMax - height[l];
                l++;
            } else {
                rightMax = Math.max(rightMax, height[r]);
                total += rightMax - height[r];
                r--;
            }
        }
        return total;
    }

    public static void main(String[] args) {
        System.out.println(trap(new int[]{0,1,0,2,1,0,1,3,2,1,2,1})); // 6
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

int trap(vector<int>& height) {
    int l = 0, r = height.size() - 1;
    int leftMax = 0, rightMax = 0, total = 0;
    while (l < r) {
        if (height[l] < height[r]) {
            leftMax = max(leftMax, height[l]);
            total += leftMax - height[l];
            l++;
        } else {
            rightMax = max(rightMax, height[r]);
            total += rightMax - height[r];
            r--;
        }
    }
    return total;
}

int main() {
    vector<int> height = {0,1,0,2,1,0,1,3,2,1,2,1};
    cout << trap(height) << endl;   // 6
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you group anagrams together?",
    answer: `
**Intuition.** Anagrams share a **canonical form**. If you reduce each word to the same key — its sorted letters, or a letter-count signature — then words with the same key are anagrams. Bucket them in a hash map keyed by that form.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 170" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">key = sorted letters → same key, same bucket</text>
  <g font-size="12" text-anchor="middle" font-family="monospace">
    <text x="60" y="50" fill="currentColor">eat</text>
    <text x="60" y="80" fill="currentColor">tea</text>
    <text x="60" y="120" fill="currentColor">tan</text>
    <text x="60" y="150" fill="currentColor">nat</text>
  </g>
  <line x1="90" y1="46" x2="160" y2="55" stroke="#f59e0b" stroke-opacity="0.5"/>
  <line x1="90" y1="76" x2="160" y2="60" stroke="#f59e0b" stroke-opacity="0.5"/>
  <line x1="90" y1="116" x2="160" y2="120" stroke="#f59e0b" stroke-opacity="0.5"/>
  <line x1="90" y1="146" x2="160" y2="125" stroke="#f59e0b" stroke-opacity="0.5"/>
  <g font-size="12" text-anchor="middle">
    <rect x="160" y="42" width="70" height="30" rx="5" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="195" y="62" fill="currentColor" font-family="monospace">"aet"</text>
    <rect x="160" y="106" width="70" height="30" rx="5" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="195" y="126" fill="currentColor" font-family="monospace">"ant"</text>
  </g>
  <line x1="230" y1="57" x2="300" y2="57" stroke="#22c55e" stroke-width="2" marker-end="url(#ga)"/>
  <line x1="230" y1="121" x2="300" y2="121" stroke="#22c55e" stroke-width="2" marker-end="url(#ga)"/>
  <g font-size="12" text-anchor="middle">
    <rect x="300" y="42" width="160" height="30" rx="5" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/><text x="380" y="62" fill="currentColor">[eat, tea]</text>
    <rect x="300" y="106" width="160" height="30" rx="5" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/><text x="380" y="126" fill="currentColor">[tan, nat]</text>
  </g>
  <defs><marker id="ga" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#22c55e"/></marker></defs>
</svg>
</div>

### Two key choices
| Key | Build cost per word | Total |
| --- | --- | --- |
| Sorted characters | O(k log k) | O(n·k log k) |
| 26-length count signature | O(k) | **O(n·k)** |

The count signature (a tuple of 26 letter counts, e.g. <code>"1#0#0#...#1"</code>) avoids the per-word sort, so it's asymptotically faster for long words.

**Dry run.** "eat"→"aet", "tea"→"aet" (same bucket); "tan"→"ant", "nat"→"ant" (same bucket). Result: **[[eat, tea], [tan, nat]]**.

> **Interview tip:** start with the simple sorted-key version, then offer the O(k) count-signature key as the optimisation when words are long. Both are O(n·k)-ish; the difference is the per-word sort factor.
`,
    examples: [
      {
        label: "Group by canonical key",
        variants: [
          { tech: "python", label: "Python", code: `from collections import defaultdict

def group_anagrams(words):
    groups = defaultdict(list)
    for w in words:
        key = ''.join(sorted(w))      # or a 26-count tuple
        groups[key].append(w)
    return list(groups.values())


# --- demo ---
print(group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]))
# [['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']]` },
          { tech: "javascript", label: "JavaScript", code: `function groupAnagrams(words) {
  const groups = new Map();
  for (const w of words) {
    const key = [...w].sort().join('');   // or a count signature
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(w);
  }
  return [...groups.values()];
}

// --- demo ---
console.log(groupAnagrams(["eat", "tea", "tan", "ate", "nat", "bat"]));
// [['eat','tea','ate'], ['tan','nat'], ['bat']]` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static List<List<String>> groupAnagrams(String[] words) {
        Map<String, List<String>> groups = new HashMap<>();
        for (String w : words) {
            char[] c = w.toCharArray();
            Arrays.sort(c);
            String key = new String(c);
            groups.computeIfAbsent(key, k -> new ArrayList<>()).add(w);
        }
        return new ArrayList<>(groups.values());
    }

    public static void main(String[] args) {
        System.out.println(groupAnagrams(
            new String[]{"eat","tea","tan","ate","nat","bat"}));
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

vector<vector<string>> groupAnagrams(vector<string>& words) {
    unordered_map<string, vector<string>> groups;
    for (auto& w : words) {
        string key = w;
        sort(key.begin(), key.end());
        groups[key].push_back(w);
    }
    vector<vector<string>> out;
    for (auto& [k, v] : groups) out.push_back(v);
    return out;
}

int main() {
    vector<string> words = {"eat","tea","tan","ate","nat","bat"};
    for (auto& g : groupAnagrams(words)) {
        cout << "[";
        for (auto& w : g) cout << w << " ";
        cout << "] ";
    }
    cout << endl;
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you find the longest substring without repeating characters?",
    answer: `
**Intuition.** Slide a **window** across the string. Expand the right edge to include new characters; the instant you hit a repeat, jump the left edge to just past the previous occurrence of that character. Track the widest window seen. Each character is visited at most twice → O(n).

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace,monospace">
  <text x="14" y="18" fill="currentColor" font-size="12" opacity="0.7" font-family="ui-sans-serif,system-ui">"abcabcbb" → longest unique window "abc" (len 3)</text>
  <g font-size="16" text-anchor="middle">
    <rect x="40" y="44" width="48" height="44" rx="5" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/><text x="64" y="73" fill="currentColor">a</text>
    <rect x="92" y="44" width="48" height="44" rx="5" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/><text x="116" y="73" fill="currentColor">b</text>
    <rect x="144" y="44" width="48" height="44" rx="5" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/><text x="168" y="73" fill="currentColor">c</text>
    <rect x="196" y="44" width="48" height="44" rx="5" fill="#ef4444" fill-opacity="0.14" stroke="#ef4444"/><text x="220" y="73" fill="currentColor">a</text>
    <rect x="248" y="44" width="48" height="44" rx="5" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/><text x="272" y="73" fill="currentColor">b</text>
    <rect x="300" y="44" width="48" height="44" rx="5" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/><text x="324" y="73" fill="currentColor">c</text>
  </g>
  <rect x="38" y="40" width="156" height="52" rx="7" fill="#22c55e" fill-opacity="0.1" stroke="#22c55e" stroke-width="2.5"/>
  <text x="116" y="116" fill="#22c55e" font-size="11" text-anchor="middle" font-family="ui-sans-serif,system-ui">window "abc"; next 'a' repeats → slide left past old 'a'</text>
</svg>
</div>

### The algorithm
1. Keep a map <code>char → last index</code>, <code>left = 0</code>, <code>best = 0</code>.
2. For each <code>right</code>: if the char was seen at index <code>≥ left</code>, move <code>left</code> to <code>lastIndex + 1</code>.
3. Update the last-index map; update <code>best = max(best, right − left + 1)</code>.

| Approach | Time | Space |
| --- | --- | --- |
| Sliding window + last-index map | **O(n)** | O(min(n, charset)) |
| Recheck every substring | O(n³) | O(1) |

**Dry run ("abcabcbb").** window grows a,b,c (len 3). At the second 'a', left jumps past index 0. The window keeps sliding but never exceeds 3 → answer **3**.

> **Interview tip:** the subtle bug is the <code>lastIndex ≥ left</code> guard — only jump <code>left</code> if the repeat is *inside* the current window, otherwise an old occurrence wrongly shrinks it. This variable-window template generalises to "at most k distinct characters", etc.
`,
    examples: [
      {
        label: "Sliding window with last-seen map",
        variants: [
          { tech: "python", label: "Python", code: `def length_of_longest(s):
    last = {}
    left = best = 0
    for right, ch in enumerate(s):
        if ch in last and last[ch] >= left:
            left = last[ch] + 1
        last[ch] = right
        best = max(best, right - left + 1)
    return best


# --- demo ---
print(length_of_longest("abcabcbb"))   # 3  ("abc")
print(length_of_longest("bbbbb"))      # 1` },
          { tech: "javascript", label: "JavaScript", code: `function lengthOfLongest(s) {
  const last = new Map();
  let left = 0, best = 0;
  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    if (last.has(ch) && last.get(ch) >= left) left = last.get(ch) + 1;
    last.set(ch, right);
    best = Math.max(best, right - left + 1);
  }
  return best;
}

// --- demo ---
console.log(lengthOfLongest("abcabcbb")); // 3
console.log(lengthOfLongest("bbbbb"));    // 1` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static int lengthOfLongest(String s) {
        Map<Character,Integer> last = new HashMap<>();
        int left = 0, best = 0;
        for (int right = 0; right < s.length(); right++) {
            char ch = s.charAt(right);
            if (last.containsKey(ch) && last.get(ch) >= left)
                left = last.get(ch) + 1;
            last.put(ch, right);
            best = Math.max(best, right - left + 1);
        }
        return best;
    }

    public static void main(String[] args) {
        System.out.println(lengthOfLongest("abcabcbb")); // 3
        System.out.println(lengthOfLongest("bbbbb"));    // 1
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

int lengthOfLongest(const string& s) {
    unordered_map<char,int> last;
    int left = 0, best = 0;
    for (int right = 0; right < (int)s.size(); right++) {
        char ch = s[right];
        if (last.count(ch) && last[ch] >= left) left = last[ch] + 1;
        last[ch] = right;
        best = max(best, right - left + 1);
    }
    return best;
}

int main() {
    cout << lengthOfLongest("abcabcbb") << endl;   // 3
    cout << lengthOfLongest("bbbbb") << endl;      // 1
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you find the minimum window substring?",
    answer: `
**Intuition.** Find the shortest slice of string <code>S</code> that contains all characters of <code>T</code> (with multiplicity). Grow a window to the right until it **covers** everything needed, then shrink it from the left as far as it stays valid — recording the smallest valid window along the way.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="18" fill="currentColor" font-size="12" opacity="0.7">S="ADOBECODEBANC", T="ABC" → min window "BANC"</text>
  <g font-size="13" text-anchor="middle" font-family="ui-monospace,monospace">
    <text x="40" y="60" fill="currentColor" opacity="0.5">A D O B E C O D E</text>
    <text x="330" y="60" fill="#22c55e" font-weight="700">B A N C</text>
  </g>
  <rect x="306" y="44" width="86" height="26" rx="5" fill="#22c55e" fill-opacity="0.12" stroke="#22c55e" stroke-width="2"/>
  <g font-size="12">
    <text x="40" y="100" fill="currentColor" opacity="0.75">1) expand right until window covers A, B, C</text>
    <text x="40" y="122" fill="currentColor" opacity="0.75">2) shrink left while still valid → smallest = "BANC"</text>
  </g>
</svg>
</div>

### The algorithm
1. Build a <code>need</code> count map from <code>T</code>; track how many distinct chars are still <code>required</code>.
2. Expand <code>right</code>, decrementing needs; when a char's need hits 0, one requirement is satisfied.
3. When all requirements are met, **shrink left** while still valid, updating the best (smallest) window.

| | Time | Space |
| --- | --- | --- |
| Variable sliding window | **O(\|S\| + \|T\|)** | O(\|T\|) |

Each character enters and leaves the window at most once, so it's linear despite the nested-looking shrink loop.

**Dry run.** Expanding over "ADOBEC" first satisfies A, B, C → valid; shrinking can't beat it yet. Later "...BANC" at the end becomes valid and is shorter → answer **"BANC"**.

> **Interview tip:** the engine is a <code>need</code> map plus a <code>required</code> counter that tells you *when* the window is valid in O(1) — without rescanning. This expand-then-shrink template covers a whole class of "smallest/longest window meeting a constraint" problems.
`,
    examples: [
      {
        label: "Expand then shrink",
        variants: [
          { tech: "python", label: "Python", code: `from collections import Counter

def min_window(s, t):
    if not t or not s:
        return ""
    need = Counter(t)
    required = len(need)
    formed = 0
    window = {}
    best = (float('inf'), 0, 0)
    left = 0
    for right, ch in enumerate(s):
        window[ch] = window.get(ch, 0) + 1
        if ch in need and window[ch] == need[ch]:
            formed += 1
        while formed == required:
            if right - left + 1 < best[0]:
                best = (right - left + 1, left, right)
            lc = s[left]
            window[lc] -= 1
            if lc in need and window[lc] < need[lc]:
                formed -= 1
            left += 1
    return "" if best[0] == float('inf') else s[best[1]:best[2] + 1]


# --- demo ---
print(min_window("ADOBECODEBANC", "ABC"))   # BANC` },
          { tech: "javascript", label: "JavaScript", code: `function minWindow(s, t) {
  if (!t || !s) return "";
  const need = new Map();
  for (const c of t) need.set(c, (need.get(c) || 0) + 1);
  let required = need.size, formed = 0, left = 0;
  const window = new Map();
  let best = [Infinity, 0, 0];
  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    window.set(ch, (window.get(ch) || 0) + 1);
    if (need.has(ch) && window.get(ch) === need.get(ch)) formed++;
    while (formed === required) {
      if (right - left + 1 < best[0]) best = [right - left + 1, left, right];
      const lc = s[left];
      window.set(lc, window.get(lc) - 1);
      if (need.has(lc) && window.get(lc) < need.get(lc)) formed--;
      left++;
    }
  }
  return best[0] === Infinity ? "" : s.slice(best[1], best[2] + 1);
}

// --- demo ---
console.log(minWindow("ADOBECODEBANC", "ABC")); // BANC` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static String minWindow(String s, String t) {
        if (s.isEmpty() || t.isEmpty()) return "";
        Map<Character,Integer> need = new HashMap<>();
        for (char c : t.toCharArray()) need.merge(c, 1, Integer::sum);
        int required = need.size(), formed = 0, left = 0;
        Map<Character,Integer> window = new HashMap<>();
        int[] best = {Integer.MAX_VALUE, 0, 0};
        for (int right = 0; right < s.length(); right++) {
            char ch = s.charAt(right);
            window.merge(ch, 1, Integer::sum);
            if (need.containsKey(ch) && window.get(ch).equals(need.get(ch)))
                formed++;
            while (formed == required) {
                if (right - left + 1 < best[0])
                    best = new int[]{right - left + 1, left, right};
                char lc = s.charAt(left);
                window.merge(lc, -1, Integer::sum);
                if (need.containsKey(lc) && window.get(lc) < need.get(lc))
                    formed--;
                left++;
            }
        }
        return best[0] == Integer.MAX_VALUE ? "" : s.substring(best[1], best[2] + 1);
    }

    public static void main(String[] args) {
        System.out.println(minWindow("ADOBECODEBANC", "ABC")); // BANC
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

string minWindow(string s, string t) {
    if (s.empty() || t.empty()) return "";
    unordered_map<char,int> need, window;
    for (char c : t) need[c]++;
    int required = need.size(), formed = 0, left = 0;
    int bestLen = INT_MAX, bestL = 0;
    for (int right = 0; right < (int)s.size(); right++) {
        window[s[right]]++;
        if (need.count(s[right]) && window[s[right]] == need[s[right]])
            formed++;
        while (formed == required) {
            if (right - left + 1 < bestLen) {
                bestLen = right - left + 1; bestL = left;
            }
            char lc = s[left];
            window[lc]--;
            if (need.count(lc) && window[lc] < need[lc]) formed--;
            left++;
        }
    }
    return bestLen == INT_MAX ? "" : s.substr(bestL, bestLen);
}

int main() {
    cout << minWindow("ADOBECODEBANC", "ABC") << endl;   // BANC
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you solve the 3Sum problem?",
    answer: `
**Intuition.** Find all unique triplets that sum to zero. **Sort** the array, then fix one number and use **two pointers** on the rest to find pairs that complete the triplet. Sorting makes both the two-pointer search and duplicate-skipping easy.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="18" fill="currentColor" font-size="12" opacity="0.7">sorted; fix i, then two pointers seek −nums[i]</text>
  <g font-size="13" text-anchor="middle">
    <rect x="40" y="44" width="52" height="38" rx="5" fill="#f59e0b" fill-opacity="0.22" stroke="#f59e0b"/><text x="66" y="69" fill="currentColor">-4</text>
    <rect x="96" y="44" width="52" height="38" rx="5" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/><text x="122" y="69" fill="currentColor">-1</text>
    <rect x="152" y="44" width="52" height="38" rx="5" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/><text x="178" y="69" fill="currentColor">-1</text>
    <rect x="208" y="44" width="52" height="38" rx="5" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/><text x="234" y="69" fill="currentColor">0</text>
    <rect x="264" y="44" width="52" height="38" rx="5" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/><text x="290" y="69" fill="currentColor">1</text>
    <rect x="320" y="44" width="52" height="38" rx="5" fill="#ef4444" fill-opacity="0.18" stroke="#ef4444"/><text x="346" y="69" fill="currentColor">2</text>
  </g>
  <text x="122" y="104" fill="#22c55e" font-size="11" text-anchor="middle">left</text>
  <text x="346" y="104" fill="#ef4444" font-size="11" text-anchor="middle">right</text>
  <text x="66" y="104" fill="#f59e0b" font-size="11" text-anchor="middle">fixed i</text>
  <text x="430" y="65" fill="currentColor" font-size="11">-1+-1+2 = 0 ✓</text>
</svg>
</div>

### The algorithm
1. **Sort** the array.
2. For each index <code>i</code> (the fixed number): set <code>left = i+1</code>, <code>right = n−1</code>.
3. Move pointers: if the triple sum is &lt; 0, <code>left++</code>; if &gt; 0, <code>right−−</code>; if 0, record it and skip duplicates on both sides.
4. **Skip duplicate** values of <code>i</code> too, so triplets are unique.

| Approach | Time | Space |
| --- | --- | --- |
| Sort + two pointers | **O(n²)** | O(1) extra |
| Brute force | O(n³) | O(1) |
| Hash set per pair | O(n²) | O(n) |

The sort is O(n log n); the nested fixed-index + two-pointer scan dominates at O(n²).

**Dry run ([-4,-1,-1,0,1,2]).** Fix -1: left=-1, right=2 → -1+-1+2 = 0 ✓. Skip the duplicate -1. Fix 0: 0+1+? none. Result includes **[-1,-1,2]** and **[-1,0,1]**.

> **Interview tip:** duplicate handling is the crux — skip equal values for the fixed index *and* after recording a match. Sorting is what makes both the O(n) inner search and dedup clean; mention it's the difference from the O(n³) brute force.
`,
    examples: [
      {
        label: "Sort + two pointers",
        variants: [
          { tech: "python", label: "Python", code: `def three_sum(nums):
    nums.sort()
    res = []
    for i in range(len(nums) - 2):
        if i > 0 and nums[i] == nums[i - 1]:
            continue                      # skip duplicate fixed value
        left, right = i + 1, len(nums) - 1
        while left < right:
            total = nums[i] + nums[left] + nums[right]
            if total < 0:
                left += 1
            elif total > 0:
                right -= 1
            else:
                res.append([nums[i], nums[left], nums[right]])
                left += 1; right -= 1
                while left < right and nums[left] == nums[left - 1]:
                    left += 1
                while left < right and nums[right] == nums[right + 1]:
                    right -= 1
    return res


# --- demo ---
print(three_sum([-1, 0, 1, 2, -1, -4]))   # [[-1, -1, 2], [-1, 0, 1]]` },
          { tech: "javascript", label: "JavaScript", code: `function threeSum(nums) {
  nums.sort((a, b) => a - b);
  const res = [];
  for (let i = 0; i < nums.length - 2; i++) {
    if (i > 0 && nums[i] === nums[i - 1]) continue;  // skip duplicate
    let left = i + 1, right = nums.length - 1;
    while (left < right) {
      const sum = nums[i] + nums[left] + nums[right];
      if (sum < 0) left++;
      else if (sum > 0) right--;
      else {
        res.push([nums[i], nums[left], nums[right]]);
        left++; right--;
        while (left < right && nums[left] === nums[left - 1]) left++;
        while (left < right && nums[right] === nums[right + 1]) right--;
      }
    }
  }
  return res;
}

// --- demo ---
console.log(JSON.stringify(threeSum([-1, 0, 1, 2, -1, -4])));
// [[-1,-1,2],[-1,0,1]]` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static List<List<Integer>> threeSum(int[] nums) {
        Arrays.sort(nums);
        List<List<Integer>> res = new ArrayList<>();
        for (int i = 0; i < nums.length - 2; i++) {
            if (i > 0 && nums[i] == nums[i - 1]) continue;  // skip duplicate
            int left = i + 1, right = nums.length - 1;
            while (left < right) {
                int sum = nums[i] + nums[left] + nums[right];
                if (sum < 0) left++;
                else if (sum > 0) right--;
                else {
                    res.add(List.of(nums[i], nums[left], nums[right]));
                    left++; right--;
                    while (left < right && nums[left] == nums[left - 1]) left++;
                    while (left < right && nums[right] == nums[right + 1]) right--;
                }
            }
        }
        return res;
    }

    public static void main(String[] args) {
        System.out.println(threeSum(new int[]{-1, 0, 1, 2, -1, -4}));
        // [[-1, -1, 2], [-1, 0, 1]]
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

vector<vector<int>> threeSum(vector<int>& nums) {
    sort(nums.begin(), nums.end());
    vector<vector<int>> res;
    for (int i = 0; i + 2 < (int)nums.size(); i++) {
        if (i > 0 && nums[i] == nums[i - 1]) continue;  // skip duplicate
        int left = i + 1, right = nums.size() - 1;
        while (left < right) {
            int sum = nums[i] + nums[left] + nums[right];
            if (sum < 0) left++;
            else if (sum > 0) right--;
            else {
                res.push_back({nums[i], nums[left], nums[right]});
                left++; right--;
                while (left < right && nums[left] == nums[left - 1]) left++;
                while (left < right && nums[right] == nums[right + 1]) right--;
            }
        }
    }
    return res;
}

int main() {
    vector<int> nums = {-1, 0, 1, 2, -1, -4};
    for (auto& t : threeSum(nums)) {
        cout << "[";
        for (int x : t) cout << x << " ";
        cout << "] ";
    }
    cout << endl;   // [-1 -1 2] [-1 0 1]
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you search in a rotated sorted array?",
    answer: `
**Intuition.** A sorted array rotated at some pivot still has the property that, for any midpoint, **at least one half is fully sorted**. Run binary search; at each step figure out which half is sorted, check whether the target lies within that sorted half's range, and discard the other half.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="18" fill="currentColor" font-size="12" opacity="0.7">[4,5,6,7,0,1,2] target 0 — left half sorted, right not</text>
  <g font-size="13" text-anchor="middle">
    <rect x="30" y="44" width="56" height="38" rx="5" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="58" y="69" fill="currentColor">4</text>
    <rect x="90" y="44" width="56" height="38" rx="5" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="118" y="69" fill="currentColor">5</text>
    <rect x="150" y="44" width="56" height="38" rx="5" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="178" y="69" fill="currentColor">6</text>
    <rect x="210" y="44" width="56" height="38" rx="5" fill="#f59e0b" fill-opacity="0.22" stroke="#f59e0b"/><text x="238" y="69" fill="currentColor">7</text>
    <rect x="270" y="44" width="56" height="38" rx="5" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="298" y="69" fill="currentColor">0</text>
    <rect x="330" y="44" width="56" height="38" rx="5" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="358" y="69" fill="currentColor">1</text>
    <rect x="390" y="44" width="56" height="38" rx="5" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="418" y="69" fill="currentColor">2</text>
  </g>
  <text x="238" y="104" fill="#f59e0b" font-size="11" text-anchor="middle">mid=7</text>
  <text x="130" y="124" fill="#3b82f6" font-size="11" text-anchor="middle">left half [4..7] sorted, 0 not inside → search right</text>
</svg>
</div>

### The algorithm
1. Standard <code>lo</code>/<code>hi</code> binary search; compute <code>mid</code>.
2. If <code>nums[mid] == target</code>, return mid.
3. If the **left half** is sorted (<code>nums[lo] ≤ nums[mid]</code>): if target is in <code>[nums[lo], nums[mid])</code>, go left; else go right.
4. Otherwise the **right half** is sorted: if target is in <code>(nums[mid], nums[hi]]</code>, go right; else go left.

| | Time | Space |
| --- | --- | --- |
| Modified binary search | **O(log n)** | O(1) |

The rotation never breaks the "one half is sorted" invariant, so each step still halves the search space.

**Dry run (target 0).** mid = 7; left half [4..7] is sorted but 0 isn't in it → search right [0,1,2]; mid = 1; right portion sorted, 0 &lt; 1 → go left → find **0** at index 4.

> **Interview tip:** the decision tree is "which half is sorted, and is the target inside its range?" Be careful with <code>≤</code> vs <code>&lt;</code> at the boundaries (duplicates make it trickier — the variant with duplicates can degrade to O(n)).
`,
    examples: [
      {
        label: "Binary search on a rotated array",
        variants: [
          { tech: "python", label: "Python", code: `def search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[lo] <= nums[mid]:                 # left half sorted
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        else:                                     # right half sorted
            if nums[mid] < target <= nums[hi]:
                lo = mid + 1
            else:
                hi = mid - 1
    return -1


# --- demo ---
print(search([4, 5, 6, 7, 0, 1, 2], 0))   # 4
print(search([4, 5, 6, 7, 0, 1, 2], 3))   # -1` },
          { tech: "javascript", label: "JavaScript", code: `function search(nums, target) {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] === target) return mid;
    if (nums[lo] <= nums[mid]) {                  // left half sorted
      if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
      else lo = mid + 1;
    } else {                                      // right half sorted
      if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
      else hi = mid - 1;
    }
  }
  return -1;
}

// --- demo ---
console.log(search([4, 5, 6, 7, 0, 1, 2], 0)); // 4
console.log(search([4, 5, 6, 7, 0, 1, 2], 3)); // -1` },
          { tech: "java", label: "Java", code: `public class Main {
    static int search(int[] nums, int target) {
        int lo = 0, hi = nums.length - 1;
        while (lo <= hi) {
            int mid = (lo + hi) >>> 1;
            if (nums[mid] == target) return mid;
            if (nums[lo] <= nums[mid]) {              // left half sorted
                if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
                else lo = mid + 1;
            } else {                                  // right half sorted
                if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
                else hi = mid - 1;
            }
        }
        return -1;
    }

    public static void main(String[] args) {
        System.out.println(search(new int[]{4,5,6,7,0,1,2}, 0)); // 4
        System.out.println(search(new int[]{4,5,6,7,0,1,2}, 3)); // -1
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

int search(vector<int>& nums, int target) {
    int lo = 0, hi = nums.size() - 1;
    while (lo <= hi) {
        int mid = (lo + hi) / 2;
        if (nums[mid] == target) return mid;
        if (nums[lo] <= nums[mid]) {              // left half sorted
            if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
            else lo = mid + 1;
        } else {                                  // right half sorted
            if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
            else hi = mid - 1;
        }
    }
    return -1;
}

int main() {
    vector<int> nums = {4, 5, 6, 7, 0, 1, 2};
    cout << search(nums, 0) << endl;   // 4
    cout << search(nums, 3) << endl;   // -1
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you find a peak element in an array?",
    answer: `
**Intuition.** A peak is any element greater than its neighbours. You don't have to scan — use **binary search on the slope**: if <code>nums[mid] &lt; nums[mid+1]</code>, the array is rising, so a peak must lie to the **right**; otherwise it's to the left (including mid). You always walk uphill toward a peak.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 160" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">rising slope at mid → a peak is to the right</text>
  <polyline points="40,120 120,90 200,100 280,40 360,70 440,30" fill="none" stroke="#8b5cf6" stroke-width="2.5"/>
  <g font-size="11" text-anchor="middle">
    <circle cx="40" cy="120" r="4" fill="#8b5cf6"/>
    <circle cx="120" cy="90" r="4" fill="#8b5cf6"/>
    <circle cx="200" cy="100" r="6" fill="#f59e0b"/><text x="200" y="120" fill="#f59e0b">mid</text>
    <circle cx="280" cy="40" r="6" fill="#22c55e"/><text x="280" y="30" fill="#22c55e">peak</text>
    <circle cx="360" cy="70" r="4" fill="#8b5cf6"/>
    <circle cx="440" cy="30" r="6" fill="#22c55e"/><text x="440" y="20" fill="#22c55e">peak</text>
  </g>
  <line x1="200" y1="100" x2="280" y2="100" stroke="#f59e0b" stroke-opacity="0.5" stroke-dasharray="4 3"/>
  <text x="240" y="142" fill="currentColor" font-size="10" text-anchor="middle" opacity="0.7">nums[mid] &lt; nums[mid+1] → go right</text>
</svg>
</div>

### The algorithm
1. <code>lo = 0</code>, <code>hi = n − 1</code>.
2. While <code>lo &lt; hi</code>: <code>mid = (lo + hi) / 2</code>.
3. If <code>nums[mid] &lt; nums[mid+1]</code>: a peak is to the right → <code>lo = mid + 1</code>; else → <code>hi = mid</code>.
4. <code>lo == hi</code> points at a peak.

| Approach | Time | Space |
| --- | --- | --- |
| Binary search on slope | **O(log n)** | O(1) |
| Linear scan | O(n) | O(1) |

Treating out-of-bounds neighbours as <code>−∞</code> guarantees a peak always exists (the ends count), so the search never fails.

**Dry run.** Rising at mid → move right, climbing toward a local maximum; the pointers converge on a peak index in log n steps. Any valid peak is acceptable.

> **Interview tip:** the insight that justifies binary search is "always step toward the higher neighbour — you must eventually hit a peak." Note the problem asks for **any** peak (not the global max), which is what makes O(log n) possible.
`,
    examples: [
      {
        label: "Binary search toward the peak",
        variants: [
          { tech: "python", label: "Python", code: `def find_peak(nums):
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] < nums[mid + 1]:
            lo = mid + 1          # uphill to the right
        else:
            hi = mid              # peak is mid or to the left
    return lo


# --- demo ---
print(find_peak([1, 2, 3, 1]))   # 2  (nums[2] = 3 is a peak)` },
          { tech: "javascript", label: "JavaScript", code: `function findPeak(nums) {
  let lo = 0, hi = nums.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] < nums[mid + 1]) lo = mid + 1;  // uphill right
    else hi = mid;                                // peak at mid or left
  }
  return lo;
}

// --- demo ---
console.log(findPeak([1, 2, 3, 1])); // 2` },
          { tech: "java", label: "Java", code: `public class Main {
    static int findPeak(int[] nums) {
        int lo = 0, hi = nums.length - 1;
        while (lo < hi) {
            int mid = (lo + hi) >>> 1;
            if (nums[mid] < nums[mid + 1]) lo = mid + 1; // uphill right
            else hi = mid;                               // peak mid or left
        }
        return lo;
    }

    public static void main(String[] args) {
        System.out.println(findPeak(new int[]{1, 2, 3, 1})); // 2
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

int findPeak(vector<int>& nums) {
    int lo = 0, hi = nums.size() - 1;
    while (lo < hi) {
        int mid = (lo + hi) / 2;
        if (nums[mid] < nums[mid + 1]) lo = mid + 1; // uphill right
        else hi = mid;                               // peak mid or left
    }
    return lo;
}

int main() {
    vector<int> nums = {1, 2, 3, 1};
    cout << findPeak(nums) << endl;   // 2
    return 0;
}` },
        ],
      },
    ],
  },
];

export default augments;
