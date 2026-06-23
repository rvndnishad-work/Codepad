/**
 * DSA augment batch 3 — the 10 most-asked concrete problems from dsa-2.json.
 * See dsa-augments.types.ts for the authoring rules (no "${", no raw backticks
 * inside these template literals; inline code uses <code> tags).
 */
import type { DsaAugment } from "./dsa-augments.types";

const augments: DsaAugment[] = [
  {
    title: "How do you reverse a linked list?",
    answer: `
**Intuition.** Walk the list once, flipping each <code>next</code> pointer to point **backwards**. You carry three references — <code>prev</code>, <code>curr</code>, <code>next</code> — so you never lose the rest of the list when you rewire a node.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 170" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="20" fill="currentColor" font-size="12" opacity="0.7">flip each arrow: curr.next = prev, then step forward</text>
  <g font-size="13" text-anchor="middle">
    <circle cx="80" cy="70" r="22" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="80" y="75" fill="currentColor">1</text>
    <circle cx="200" cy="70" r="22" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="200" y="75" fill="currentColor">2</text>
    <circle cx="320" cy="70" r="22" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="320" y="75" fill="currentColor">3</text>
  </g>
  <line x1="102" y1="62" x2="178" y2="62" stroke="#ef4444" stroke-width="2" marker-end="url(#fwd)" opacity="0.4"/>
  <line x1="222" y1="62" x2="298" y2="62" stroke="#ef4444" stroke-width="2" marker-end="url(#fwd)" opacity="0.4"/>
  <line x1="178" y1="84" x2="102" y2="84" stroke="#22c55e" stroke-width="2.5" marker-end="url(#rev)">
    <animate attributeName="opacity" values="0;1" dur="0.5s" begin="0.4s" fill="freeze"/>
  </line>
  <line x1="298" y1="84" x2="222" y2="84" stroke="#22c55e" stroke-width="2.5" marker-end="url(#rev)">
    <animate attributeName="opacity" values="0;1" dur="0.5s" begin="1.2s" fill="freeze"/>
  </line>
  <text x="80" y="125" fill="#3b82f6" font-size="11" text-anchor="middle">prev</text>
  <text x="200" y="125" fill="#22c55e" font-size="11" text-anchor="middle">curr</text>
  <text x="320" y="125" fill="#f59e0b" font-size="11" text-anchor="middle">next</text>
  <defs>
    <marker id="fwd" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#ef4444"/></marker>
    <marker id="rev" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#22c55e"/></marker>
  </defs>
</svg>
</div>

### The loop (iterative)
1. <code>prev = null</code>, <code>curr = head</code>.
2. Save <code>next = curr.next</code> (so it isn't lost).
3. Point <code>curr.next = prev</code> (the flip).
4. Advance: <code>prev = curr</code>, <code>curr = next</code>.
5. When <code>curr</code> is null, <code>prev</code> is the new head.

| Approach | Time | Space |
| --- | --- | --- |
| Iterative (3 pointers) | O(n) | **O(1)** |
| Recursive | O(n) | O(n) call stack |

**Dry run.** 1→2→3. Step: next=2, 1→null, prev=1, curr=2. Step: next=3, 2→1, prev=2, curr=3. Step: next=null, 3→2, prev=3, curr=null. New head = 3 → **3→2→1**.

> **Interview tip:** the iterative O(1)-space version is the expected answer — practise it until the pointer dance is muscle memory. Be ready for the recursive variant and for "reverse only between positions m and n".
`,
    examples: [
      {
        label: "Iterative reversal",
        variants: [
          { tech: "python", label: "Python", code: `class ListNode:
    def __init__(self, val, nxt=None):
        self.val, self.next = val, nxt

def reverse_list(head):
    prev, curr = None, head
    while curr:
        nxt = curr.next     # save next
        curr.next = prev    # flip
        prev = curr         # advance
        curr = nxt
    return prev             # new head


# --- demo ---
def build(vals):
    head = None
    for v in reversed(vals): head = ListNode(v, head)
    return head
def to_list(head):
    out = []
    while head: out.append(head.val); head = head.next
    return out

print(to_list(reverse_list(build([1, 2, 3]))))   # [3, 2, 1]` },
          { tech: "javascript", label: "JavaScript", code: `class ListNode {
  constructor(val, next = null) { this.val = val; this.next = next; }
}

function reverseList(head) {
  let prev = null, curr = head;
  while (curr) {
    const next = curr.next;  // save next
    curr.next = prev;        // flip
    prev = curr;             // advance
    curr = next;
  }
  return prev;               // new head
}

// --- demo ---
const build = (vals) => vals.reduceRight((next, v) => new ListNode(v, next), null);
const toArray = (h) => { const out = []; while (h) { out.push(h.val); h = h.next; } return out; };
console.log(toArray(reverseList(build([1, 2, 3]))));   // [3, 2, 1]` },
          { tech: "java", label: "Java", code: `public class Main {
    static class ListNode {
        int val; ListNode next;
        ListNode(int val) { this.val = val; }
    }

    static ListNode reverseList(ListNode head) {
        ListNode prev = null, curr = head;
        while (curr != null) {
            ListNode next = curr.next; // save next
            curr.next = prev;          // flip
            prev = curr;               // advance
            curr = next;
        }
        return prev;                   // new head
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
        for (ListNode n = reverseList(build(new int[]{1, 2, 3})); n != null; n = n.next)
            sb.append(n.val).append(" ");
        System.out.println(sb.toString().trim());   // 3 2 1
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

struct ListNode {
    int val;
    ListNode* next = nullptr;
    ListNode(int v) : val(v) {}
};

ListNode* reverseList(ListNode* head) {
    ListNode* prev = nullptr;
    ListNode* curr = head;
    while (curr) {
        ListNode* next = curr->next; // save next
        curr->next = prev;           // flip
        prev = curr;                 // advance
        curr = next;
    }
    return prev;                     // new head
}

int main() {
    ListNode* head = nullptr;        // build 1->2->3
    for (int v : {3, 2, 1}) { ListNode* n = new ListNode(v); n->next = head; head = n; }
    for (ListNode* n = reverseList(head); n; n = n->next) cout << n->val << " ";
    cout << endl;                    // 3 2 1
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you solve the Two Sum problem efficiently?",
    answer: `
**Intuition.** For each number you need its *complement* (<code>target - num</code>). Instead of scanning the rest of the array for it (O(n²)), keep a **hash map** of values you've already seen, so the complement check is O(1). One pass, **O(n)**.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 170" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="18" fill="currentColor" font-size="12" opacity="0.7">target = 9; at 7, is (9-7)=2 in the map? yes → done</text>
  <g font-size="13" text-anchor="middle">
    <rect x="20" y="40" width="56" height="40" rx="6" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="48" y="65" fill="currentColor">2</text>
    <rect x="80" y="40" width="56" height="40" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/><text x="108" y="65" fill="currentColor">4</text>
    <rect x="140" y="40" width="56" height="40" rx="6" fill="#f59e0b" fill-opacity="0.2" stroke="#f59e0b"/><text x="168" y="65" fill="currentColor">7</text>
    <rect x="200" y="40" width="56" height="40" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/><text x="228" y="65" fill="currentColor">11</text>
    <text x="48" y="98" fill="currentColor" font-size="10" opacity="0.6">[0]</text>
    <text x="108" y="98" fill="currentColor" font-size="10" opacity="0.6">[1]</text>
    <text x="168" y="98" fill="currentColor" font-size="10" opacity="0.6">[2]</text>
    <text x="228" y="98" fill="currentColor" font-size="10" opacity="0.6">[3]</text>
  </g>
  <g font-size="11">
    <text x="300" y="40" fill="currentColor" opacity="0.7">seen map:</text>
    <rect x="300" y="50" width="120" height="24" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/><text x="360" y="66" fill="currentColor" text-anchor="middle">2 → 0</text>
    <rect x="300" y="76" width="120" height="24" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/><text x="360" y="92" fill="currentColor" text-anchor="middle">4 → 1</text>
  </g>
  <path d="M168,82 Q250,140 360,74" fill="none" stroke="#22c55e" stroke-width="2" stroke-dasharray="300" stroke-dashoffset="300" marker-end="url(#ts)"><animate attributeName="stroke-dashoffset" values="300;0" dur="1.4s" begin="0.4s" fill="freeze"/></path>
  <text x="250" y="135" fill="#22c55e" font-size="11" text-anchor="middle">complement 2 found → return [0, 2]</text>
  <defs><marker id="ts" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#22c55e"/></marker></defs>
</svg>
</div>

### The algorithm
1. Make an empty map <code>value → index</code>.
2. For each <code>num</code> at index <code>i</code>: if <code>target - num</code> is in the map, return both indices.
3. Otherwise store <code>num → i</code> and continue.

| Approach | Time | Space |
| --- | --- | --- |
| **Hash map (one pass)** | O(n) | O(n) |
| Sort + two pointers | O(n log n) | O(1) |
| Brute force | O(n²) | O(1) |

**Dry run (target 9).** See 2 → store {2:0}. See 4 → store {2:0, 4:1}. See 7 → need 9-7=2, in the map at index 0 → return **[0, 2]**.

> **Interview tip:** mention you store the index *as you go* (not all upfront) — that's what guarantees a single pass and avoids using the same element twice. If the array were sorted, two pointers gives O(1) space; call out that trade-off.
`,
    examples: [
      {
        label: "One-pass hash map",
        variants: [
          { tech: "python", label: "Python", code: `def two_sum(nums, target):
    seen = {}                       # value -> index
    for i, num in enumerate(nums):
        if target - num in seen:
            return [seen[target - num], i]
        seen[num] = i
    return []


# --- demo ---
print(two_sum([2, 7, 11, 15], 9))   # [0, 1]` },
          { tech: "javascript", label: "JavaScript", code: `function twoSum(nums, target) {
  const seen = new Map();           // value -> index
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
  return [];
}

// --- demo ---
console.log(twoSum([2, 7, 11, 15], 9)); // [0, 1]` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static int[] twoSum(int[] nums, int target) {
        Map<Integer,Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int need = target - nums[i];
            if (seen.containsKey(need)) return new int[]{seen.get(need), i};
            seen.put(nums[i], i);
        }
        return new int[]{};
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(twoSum(new int[]{2, 7, 11, 15}, 9))); // [0, 1]
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int,int> seen;     // value -> index
    for (int i = 0; i < (int)nums.size(); i++) {
        int need = target - nums[i];
        if (seen.count(need)) return {seen[need], i};
        seen[nums[i]] = i;
    }
    return {};
}

int main() {
    vector<int> nums = {2, 7, 11, 15};
    auto r = twoSum(nums, 9);
    cout << r[0] << " " << r[1] << endl;   // 0 1
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you find the maximum subarray sum?",
    answer: `
**Intuition.** Scan left to right keeping a **running sum**. The key insight (Kadane's algorithm): if the running sum ever goes negative, it can only *hurt* whatever comes next — so drop it and start fresh from the current element. Track the best sum you ever saw.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 170" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="18" fill="currentColor" font-size="12" opacity="0.7">reset the run when it would go negative; keep the best</text>
  <g font-size="12" text-anchor="middle">
    <rect x="20" y="40" width="50" height="38" rx="5" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/><text x="45" y="64" fill="currentColor">-2</text>
    <rect x="74" y="40" width="50" height="38" rx="5" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="99" y="64" fill="currentColor">1</text>
    <rect x="128" y="40" width="50" height="38" rx="5" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/><text x="153" y="64" fill="currentColor">-3</text>
    <rect x="182" y="40" width="50" height="38" rx="5" fill="#22c55e" fill-opacity="0.25" stroke="#22c55e"/><text x="207" y="64" fill="currentColor">4</text>
    <rect x="236" y="40" width="50" height="38" rx="5" fill="#22c55e" fill-opacity="0.25" stroke="#22c55e"/><text x="261" y="64" fill="currentColor">-1</text>
    <rect x="290" y="40" width="50" height="38" rx="5" fill="#22c55e" fill-opacity="0.25" stroke="#22c55e"/><text x="315" y="64" fill="currentColor">2</text>
    <rect x="344" y="40" width="50" height="38" rx="5" fill="#22c55e" fill-opacity="0.25" stroke="#22c55e"/><text x="369" y="64" fill="currentColor">1</text>
    <rect x="398" y="40" width="50" height="38" rx="5" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/><text x="423" y="64" fill="currentColor">-5</text>
  </g>
  <rect x="180" y="36" width="216" height="46" rx="8" fill="none" stroke="#f59e0b" stroke-width="2.5">
    <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite"/>
  </rect>
  <text x="288" y="108" fill="#f59e0b" font-size="12" text-anchor="middle">best contiguous run [4,-1,2,1] = 6</text>
</svg>
</div>

### Kadane's algorithm
1. <code>maxEnding = nums[0]</code>, <code>best = nums[0]</code>.
2. For each next <code>x</code>: <code>maxEnding = max(x, maxEnding + x)</code> — either extend the run or restart at <code>x</code>.
3. <code>best = max(best, maxEnding)</code>.

| | Time | Space |
| --- | --- | --- |
| Kadane | O(n) | O(1) |
| Brute force (all subarrays) | O(n²) | O(1) |

**Dry run.** [-2,1,-3,4,-1,2,1,-5,4]: the run resets after the early negatives and builds 4 → 3 → 5 → 6 across [4,-1,2,1], then -5 drops it. Best = **6**.

**Edge case:** all-negative arrays — using <code>max(x, maxEnding + x)</code> (not <code>max(0, ...)</code>) correctly returns the least-negative single element.

> **Interview tip:** Kadane is secretly DP — <code>maxEnding</code> is "best subarray ending here". If asked for the actual subarray (not just the sum), track the start/end indices whenever <code>best</code> updates.
`,
    examples: [
      {
        label: "Kadane's algorithm",
        variants: [
          { tech: "python", label: "Python", code: `def max_subarray(nums):
    max_ending = best = nums[0]
    for x in nums[1:]:
        max_ending = max(x, max_ending + x)  # extend or restart
        best = max(best, max_ending)
    return best


# --- demo ---
print(max_subarray([-2, 1, -3, 4, -1, 2, 1, -5, 4]))   # 6  -> [4,-1,2,1]` },
          { tech: "javascript", label: "JavaScript", code: `function maxSubArray(nums) {
  let maxEnding = nums[0], best = nums[0];
  for (let i = 1; i < nums.length; i++) {
    maxEnding = Math.max(nums[i], maxEnding + nums[i]); // extend or restart
    best = Math.max(best, maxEnding);
  }
  return best;
}

// --- demo ---
console.log(maxSubArray([-2, 1, -3, 4, -1, 2, 1, -5, 4])); // 6 -> [4,-1,2,1]` },
          { tech: "java", label: "Java", code: `public class Main {
    static int maxSubArray(int[] nums) {
        int maxEnding = nums[0], best = nums[0];
        for (int i = 1; i < nums.length; i++) {
            maxEnding = Math.max(nums[i], maxEnding + nums[i]); // extend/restart
            best = Math.max(best, maxEnding);
        }
        return best;
    }

    public static void main(String[] args) {
        System.out.println(maxSubArray(new int[]{-2, 1, -3, 4, -1, 2, 1, -5, 4})); // 6
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

int maxSubArray(vector<int>& nums) {
    int maxEnding = nums[0], best = nums[0];
    for (size_t i = 1; i < nums.size(); i++) {
        maxEnding = max(nums[i], maxEnding + nums[i]); // extend or restart
        best = max(best, maxEnding);
    }
    return best;
}

int main() {
    vector<int> nums = {-2, 1, -3, 4, -1, 2, 1, -5, 4};
    cout << maxSubArray(nums) << endl;   // 6
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you check for valid/balanced parentheses?",
    answer: `
**Intuition.** Brackets must close in the reverse order they opened — that's exactly what a **stack** models. Push every opening bracket; on a closing bracket, the top of the stack must be its matching opener. Valid means every close matched and the stack ends empty.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 180" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="18" fill="currentColor" font-size="12" opacity="0.7">scan "( [ ] )": push openers, match on closers</text>
  <g font-size="16" text-anchor="middle" font-family="monospace">
    <text x="60" y="55" fill="#22c55e">(</text>
    <text x="100" y="55" fill="#22c55e">[</text>
    <text x="140" y="55" fill="#ef4444">]</text>
    <text x="180" y="55" fill="#ef4444">)</text>
  </g>
  <text x="300" y="40" fill="currentColor" font-size="11" opacity="0.7">stack grows then drains:</text>
  <g font-size="13" text-anchor="middle" font-family="monospace">
    <rect x="300" y="120" width="44" height="30" rx="4" fill="#8b5cf6" fill-opacity="0.18" stroke="#8b5cf6"/><text x="322" y="140" fill="currentColor">(</text>
    <rect x="300" y="90" width="44" height="30" rx="4" fill="#8b5cf6" fill-opacity="0.18" stroke="#8b5cf6"><animate attributeName="opacity" values="1;1;0;0" dur="3s" repeatCount="indefinite" keyTimes="0;0.4;0.5;1"/></rect>
    <text x="322" y="110" fill="currentColor"><animate attributeName="opacity" values="1;1;0;0" dur="3s" repeatCount="indefinite" keyTimes="0;0.4;0.5;1"/>[</text>
  </g>
  <text x="322" y="168" fill="currentColor" font-size="10" opacity="0.6">bottom</text>
  <text x="430" y="110" fill="#22c55e" font-size="12">stack empty</text>
  <text x="430" y="128" fill="#22c55e" font-size="12">→ valid ✓</text>
</svg>
</div>

### The algorithm
1. Keep a stack and a map <code>close → open</code> (e.g. <code>)</code>→<code>(</code>).
2. For each char: if it's an opener, push it.
3. If it's a closer, the popped top must equal its matching opener — otherwise **invalid**.
4. At the end, the stack must be **empty** (no unclosed openers).

| | Time | Space |
| --- | --- | --- |
| Stack scan | O(n) | O(n) |

**Two failure modes:** a closer with the wrong/empty top (<code>(]</code> or <code>)</code> alone), and leftover openers at the end (<code>(((</code>).

**Dry run.** "([])": push <code>(</code>, push <code>[</code>; see <code>]</code> → top is <code>[</code> ✓ pop; see <code>)</code> → top is <code>(</code> ✓ pop; stack empty → **valid**.

> **Interview tip:** handle the empty-stack-on-closer case explicitly (a stray <code>)</code> should fail, not crash). This generalises to expression parsing and the "min add to make valid" follow-ups.
`,
    examples: [
      {
        label: "Stack-based validator",
        variants: [
          { tech: "python", label: "Python", code: `def is_valid(s):
    pairs = {')': '(', ']': '[', '}': '{'}
    stack = []
    for c in s:
        if c in '([{':
            stack.append(c)
        elif not stack or stack.pop() != pairs[c]:
            return False
    return not stack


# --- demo ---
print(is_valid("()[]{}"))   # True
print(is_valid("(]"))       # False` },
          { tech: "javascript", label: "JavaScript", code: `function isValid(s) {
  const pairs = { ')': '(', ']': '[', '}': '{' };
  const stack = [];
  for (const c of s) {
    if (c === '(' || c === '[' || c === '{') stack.push(c);
    else if (stack.pop() !== pairs[c]) return false;
  }
  return stack.length === 0;
}

// --- demo ---
console.log(isValid("()[]{}")); // true
console.log(isValid("(]"));     // false` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static boolean isValid(String s) {
        Map<Character,Character> pairs =
            Map.of(')', '(', ']', '[', '}', '{');
        Deque<Character> stack = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(' || c == '[' || c == '{') stack.push(c);
            else if (stack.isEmpty() || stack.pop() != pairs.get(c))
                return false;
        }
        return stack.isEmpty();
    }

    public static void main(String[] args) {
        System.out.println(isValid("()[]{}"));  // true
        System.out.println(isValid("(]"));      // false
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

bool isValid(const string& s) {
    unordered_map<char,char> pairs{{')','('},{']','['},{'}','{'}};
    stack<char> st;
    for (char c : s) {
        if (c=='('||c=='['||c=='{') st.push(c);
        else {
            if (st.empty() || st.top() != pairs[c]) return false;
            st.pop();
        }
    }
    return st.empty();
}

int main() {
    cout << boolalpha << isValid("()[]{}") << endl;  // true
    cout << isValid("(]") << endl;                   // false
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you merge overlapping intervals?",
    answer: `
**Intuition.** Sort the intervals by **start** time. Then sweep left to right: if the next interval starts before (or when) the current one ends, they overlap — extend the end. Otherwise there's a gap, so close out the current interval and begin a new one.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 170" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="18" fill="currentColor" font-size="12" opacity="0.7">[1,3] [2,6] [8,10] → [1,6] [8,10]</text>
  <line x1="20" y1="70" x2="500" y2="70" stroke="currentColor" stroke-opacity="0.25"/>
  <rect x="40" y="44" width="100" height="18" rx="4" fill="#8b5cf6" fill-opacity="0.25" stroke="#8b5cf6"/><text x="90" y="38" fill="currentColor" font-size="10" text-anchor="middle">[1,3]</text>
  <rect x="80" y="44" width="160" height="18" rx="4" fill="#8b5cf6" fill-opacity="0.18" stroke="#8b5cf6" stroke-dasharray="3 2"/><text x="200" y="38" fill="currentColor" font-size="10" text-anchor="middle">[2,6]</text>
  <rect x="340" y="44" width="100" height="18" rx="4" fill="#8b5cf6" fill-opacity="0.25" stroke="#8b5cf6"/><text x="390" y="38" fill="currentColor" font-size="10" text-anchor="middle">[8,10]</text>
  <rect x="40" y="92" width="200" height="20" rx="5" fill="#22c55e" fill-opacity="0.28" stroke="#22c55e"/><text x="140" y="106" fill="currentColor" font-size="11" text-anchor="middle">[1,6] merged</text>
  <rect x="340" y="92" width="100" height="20" rx="5" fill="#22c55e" fill-opacity="0.28" stroke="#22c55e"/><text x="390" y="106" fill="currentColor" font-size="11" text-anchor="middle">[8,10]</text>
  <text x="240" y="140" fill="#ef4444" font-size="11" text-anchor="middle">gap before 8 → start a new interval</text>
</svg>
</div>

### The algorithm
1. **Sort** by start.
2. Put the first interval in the result.
3. For each next interval: if <code>start &lt;= lastEnd</code>, overlap → <code>lastEnd = max(lastEnd, end)</code>. Else, append it as a new interval.

| | Time | Space |
| --- | --- | --- |
| Sort + sweep | **O(n log n)** | O(n) output |

The cost is dominated by the sort; the sweep itself is O(n).

**Dry run.** Sorted: [1,3],[2,6],[8,10]. Start with [1,3]. [2,6]: 2 ≤ 3 → extend to [1,6]. [8,10]: 8 &gt; 6 → gap → append. Result: **[1,6],[8,10]**.

> **Interview tip:** the <code>&lt;=</code> vs <code>&lt;</code> choice decides whether touching intervals like [1,3] and [3,5] merge — clarify with the interviewer. This sweep pattern also powers "insert interval", "meeting rooms", and "employee free time".
`,
    examples: [
      {
        label: "Sort then sweep",
        variants: [
          { tech: "python", label: "Python", code: `def merge(intervals):
    intervals.sort(key=lambda x: x[0])
    merged = [intervals[0]]
    for start, end in intervals[1:]:
        if start <= merged[-1][1]:           # overlap
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return merged


# --- demo ---
print(merge([[1, 3], [2, 6], [8, 10], [15, 18]]))   # [[1, 6], [8, 10], [15, 18]]` },
          { tech: "javascript", label: "JavaScript", code: `function merge(intervals) {
  intervals.sort((a, b) => a[0] - b[0]);
  const merged = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const [start, end] = intervals[i];
    const last = merged[merged.length - 1];
    if (start <= last[1]) last[1] = Math.max(last[1], end); // overlap
    else merged.push([start, end]);
  }
  return merged;
}

// --- demo ---
console.log(JSON.stringify(merge([[1,3],[2,6],[8,10],[15,18]])));
// [[1,6],[8,10],[15,18]]` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static int[][] merge(int[][] intervals) {
        Arrays.sort(intervals, (a, b) -> a[0] - b[0]);
        List<int[]> merged = new ArrayList<>();
        merged.add(intervals[0]);
        for (int i = 1; i < intervals.length; i++) {
            int[] last = merged.get(merged.size() - 1);
            if (intervals[i][0] <= last[1])           // overlap
                last[1] = Math.max(last[1], intervals[i][1]);
            else merged.add(intervals[i]);
        }
        return merged.toArray(new int[0][]);
    }

    public static void main(String[] args) {
        int[][] r = merge(new int[][]{{1,3},{2,6},{8,10},{15,18}});
        System.out.println(Arrays.deepToString(r)); // [[1, 6], [8, 10], [15, 18]]
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

vector<vector<int>> merge(vector<vector<int>>& intervals) {
    sort(intervals.begin(), intervals.end());
    vector<vector<int>> merged{intervals[0]};
    for (size_t i = 1; i < intervals.size(); i++) {
        if (intervals[i][0] <= merged.back()[1])      // overlap
            merged.back()[1] = max(merged.back()[1], intervals[i][1]);
        else merged.push_back(intervals[i]);
    }
    return merged;
}

int main() {
    vector<vector<int>> iv = {{1,3},{2,6},{8,10},{15,18}};
    for (auto& m : merge(iv)) cout << "[" << m[0] << "," << m[1] << "] ";
    cout << endl;   // [1,6] [8,10] [15,18]
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you design an LRU cache?",
    answer: `
**Intuition.** An LRU (Least Recently Used) cache evicts the entry untouched for the longest when it's full. To do both <code>get</code> and <code>put</code> in **O(1)**, combine two structures: a **hash map** for instant lookup, and a **doubly linked list** that orders entries by recency (most-recent at the front, least-recent at the back).

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 190" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">map → node; list orders by recency</text>
  <text x="60" y="46" fill="#22c55e" font-size="11" text-anchor="middle">most recent</text>
  <text x="460" y="46" fill="#ef4444" font-size="11" text-anchor="middle">evict here</text>
  <g font-size="13" text-anchor="middle">
    <rect x="30" y="56" width="80" height="40" rx="6" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="70" y="81" fill="currentColor">C</text>
    <rect x="150" y="56" width="80" height="40" rx="6" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="190" y="81" fill="currentColor">A</text>
    <rect x="270" y="56" width="80" height="40" rx="6" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="310" y="81" fill="currentColor">B</text>
    <rect x="390" y="56" width="80" height="40" rx="6" fill="#ef4444" fill-opacity="0.14" stroke="#ef4444"/><text x="430" y="81" fill="currentColor">D</text>
  </g>
  <line x1="110" y1="76" x2="150" y2="76" stroke="currentColor" stroke-opacity="0.4" marker-end="url(#lru)"/>
  <line x1="230" y1="76" x2="270" y2="76" stroke="currentColor" stroke-opacity="0.4" marker-end="url(#lru)"/>
  <line x1="350" y1="76" x2="390" y2="76" stroke="currentColor" stroke-opacity="0.4" marker-end="url(#lru)"/>
  <path d="M190,100 Q130,150 70,100" fill="none" stroke="#22c55e" stroke-width="2" marker-end="url(#lru2)" opacity="0"><animate attributeName="opacity" values="0;1;1;0" dur="3s" repeatCount="indefinite"/></path>
  <text x="130" y="150" fill="#22c55e" font-size="11" text-anchor="middle">get(A) → move A to front</text>
  <defs>
    <marker id="lru" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="currentColor" fill-opacity="0.4"/></marker>
    <marker id="lru2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#22c55e"/></marker>
  </defs>
</svg>
</div>

### The operations (both O(1))
- **get(key):** look up the node in the map; if present, **move it to the front** (most recent) and return its value.
- **put(key, value):** insert/update and move to front; if over capacity, **remove the tail node** (least recent) and delete it from the map.

The doubly linked list gives O(1) removal *and* insertion at both ends (each node knows its <code>prev</code> and <code>next</code>); the map gives O(1) "find the node for this key". Dummy head/tail sentinels remove edge-case branching.

| Operation | Time | Space |
| --- | --- | --- |
| get / put | O(1) | O(capacity) |

**Dry run (capacity 2).** put(A), put(B) → [B, A]. get(A) → move A front → [A, B]. put(C) → full → evict B (tail) → [C, A].

> **Interview tip:** the phrase to say is "**hash map + doubly linked list**". A singly linked list can't remove a node in O(1) (you can't reach its predecessor), which is the whole reason it must be doubly linked. Many languages also have a shortcut — Python's <code>OrderedDict</code>, Java's <code>LinkedHashMap</code>.
`,
    examples: [
      {
        label: "LRU cache",
        variants: [
          { tech: "python", label: "Python", code: `from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity):
        self.cap = capacity
        self.cache = OrderedDict()   # ordered by recency

    def get(self, key):
        if key not in self.cache:
            return -1
        self.cache.move_to_end(key)  # mark most recent
        return self.cache[key]

    def put(self, key, value):
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.cap:
            self.cache.popitem(last=False)  # evict least recent


# --- demo --- (capacity 2)
lru = LRUCache(2)
lru.put(1, 1); lru.put(2, 2)
print(lru.get(1))     # 1
lru.put(3, 3)         # full -> evicts key 2
print(lru.get(2))     # -1` },
          { tech: "javascript", label: "JavaScript", code: `// JS Map preserves insertion order — exploit it for LRU.
class LRUCache {
  constructor(capacity) { this.cap = capacity; this.map = new Map(); }

  get(key) {
    if (!this.map.has(key)) return -1;
    const val = this.map.get(key);
    this.map.delete(key);      // re-insert to mark most recent
    this.map.set(key, val);
    return val;
  }

  put(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.cap)
      this.map.delete(this.map.keys().next().value); // evict oldest
  }
}

// --- demo --- (capacity 2)
const lru = new LRUCache(2);
lru.put(1, 1); lru.put(2, 2);
console.log(lru.get(1));   // 1
lru.put(3, 3);             // full -> evicts key 2
console.log(lru.get(2));   // -1` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        LRUCache lru = new LRUCache(2);
        lru.put(1, 1); lru.put(2, 2);
        System.out.println(lru.get(1));   // 1
        lru.put(3, 3);                    // full -> evicts key 2
        System.out.println(lru.get(2));   // -1
    }
}

class LRUCache extends LinkedHashMap<Integer,Integer> {
    private final int cap;
    LRUCache(int capacity) {
        super(capacity, 0.75f, true);   // accessOrder = true
        this.cap = capacity;
    }
    public int get(int key) { return super.getOrDefault(key, -1); }
    public void put(int key, int value) { super.put(key, value); }

    @Override
    protected boolean removeEldestEntry(Map.Entry<Integer,Integer> e) {
        return size() > cap;            // auto-evict least recent
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

class LRUCache {
    int cap;
    list<pair<int,int>> dll;                    // front = most recent
    unordered_map<int, list<pair<int,int>>::iterator> map;
public:
    LRUCache(int capacity) : cap(capacity) {}

    int get(int key) {
        auto it = map.find(key);
        if (it == map.end()) return -1;
        dll.splice(dll.begin(), dll, it->second); // move to front
        return it->second->second;
    }

    void put(int key, int value) {
        auto it = map.find(key);
        if (it != map.end()) dll.erase(it->second);
        dll.push_front({key, value});
        map[key] = dll.begin();
        if ((int)map.size() > cap) {
            map.erase(dll.back().first);          // evict tail
            dll.pop_back();
        }
    }
};

int main() {
    LRUCache lru(2);
    lru.put(1, 1); lru.put(2, 2);
    cout << lru.get(1) << endl;   // 1
    lru.put(3, 3);                // full -> evicts key 2
    cout << lru.get(2) << endl;   // -1
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "What is topological sort and when is it used?",
    answer: `
**Intuition.** A topological sort linearly orders the nodes of a **directed acyclic graph (DAG)** so that every edge <code>u → v</code> has <code>u</code> **before** <code>v</code>. It answers "in what order can I do these tasks if some depend on others?" — and it's only possible when there's **no cycle**.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 180" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">repeatedly remove a node with in-degree 0 (Kahn's)</text>
  <line x1="70" y1="70" x2="170" y2="50" stroke="currentColor" stroke-opacity="0.35" marker-end="url(#tp)"/>
  <line x1="70" y1="70" x2="170" y2="110" stroke="currentColor" stroke-opacity="0.35" marker-end="url(#tp)"/>
  <line x1="200" y1="55" x2="300" y2="80" stroke="currentColor" stroke-opacity="0.35" marker-end="url(#tp)"/>
  <line x1="200" y1="110" x2="300" y2="90" stroke="currentColor" stroke-opacity="0.35" marker-end="url(#tp)"/>
  <g font-size="14" text-anchor="middle">
    <circle cx="50" cy="75" r="22" fill="#22c55e" fill-opacity="0.22" stroke="#22c55e"/><text x="50" y="80" fill="currentColor">A</text>
    <circle cx="185" cy="48" r="22" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="185" y="53" fill="currentColor">B</text>
    <circle cx="185" cy="115" r="22" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="185" y="120" fill="currentColor">C</text>
    <circle cx="320" cy="85" r="22" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="320" y="90" fill="currentColor">D</text>
  </g>
  <g font-size="13" text-anchor="middle">
    <text x="420" y="60" fill="currentColor" opacity="0.7">order:</text>
    <text x="420" y="84" fill="#22c55e" font-weight="700">A → B → C → D</text>
    <text x="420" y="108" fill="currentColor" font-size="11" opacity="0.6">(in-degree 0 first)</text>
  </g>
  <defs><marker id="tp" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="currentColor" fill-opacity="0.45"/></marker></defs>
</svg>
</div>

### Two standard algorithms (both O(V + E))
| Method | How |
| --- | --- |
| **Kahn's (BFS)** | compute in-degrees; repeatedly remove a node with in-degree 0 and decrement its neighbours' in-degrees |
| **DFS** | DFS, and prepend each node to the output as you *finish* it (reverse post-order) |

**Cycle detection comes free.** If Kahn's can't output all V nodes (some never reach in-degree 0), the graph has a **cycle** and no topological order exists. The DFS version detects a back edge to a node currently on the recursion stack.

### Where it's used
- Build systems / task schedulers (compile order, Make, npm).
- Course prerequisites ("can I finish all courses?").
- Spreadsheet formula recomputation, package/dependency resolution.

**Dry run (Kahn's).** In-degrees: A=0, B=1, C=1, D=2. Remove A → B,C drop to 0. Remove B, then C → D drops to 0. Remove D. Order: **A, B, C, D**.

> **Interview tip:** when a problem says "ordering", "dependencies", or "prerequisites" on a directed graph, reach for topological sort — and immediately note that it requires a **DAG**, so detecting a cycle is part of the answer.
`,
    examples: [
      {
        label: "Kahn's algorithm (BFS)",
        variants: [
          { tech: "python", label: "Python", code: `from collections import deque

def topo_sort(n, edges):
    graph = [[] for _ in range(n)]
    indeg = [0] * n
    for u, v in edges:
        graph[u].append(v)
        indeg[v] += 1
    q = deque(i for i in range(n) if indeg[i] == 0)
    order = []
    while q:
        u = q.popleft()
        order.append(u)
        for v in graph[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)
    return order if len(order) == n else []   # [] means a cycle


# --- demo ---  edges: 0->1, 0->2, 1->3, 2->3
print(topo_sort(4, [(0, 1), (0, 2), (1, 3), (2, 3)]))   # [0, 1, 2, 3]` },
          { tech: "javascript", label: "JavaScript", code: `function topoSort(n, edges) {
  const graph = Array.from({ length: n }, () => []);
  const indeg = new Array(n).fill(0);
  for (const [u, v] of edges) { graph[u].push(v); indeg[v]++; }
  const q = [];
  for (let i = 0; i < n; i++) if (indeg[i] === 0) q.push(i);
  const order = [];
  for (let i = 0; i < q.length; i++) {
    const u = q[i];
    order.push(u);
    for (const v of graph[u]) if (--indeg[v] === 0) q.push(v);
  }
  return order.length === n ? order : [];   // [] means a cycle
}

// --- demo ---  edges: 0->1, 0->2, 1->3, 2->3
console.log(topoSort(4, [[0,1],[0,2],[1,3],[2,3]])); // [0, 1, 2, 3]` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static List<Integer> topoSort(int n, int[][] edges) {
        List<List<Integer>> g = new ArrayList<>();
        for (int i = 0; i < n; i++) g.add(new ArrayList<>());
        int[] indeg = new int[n];
        for (int[] e : edges) { g.get(e[0]).add(e[1]); indeg[e[1]]++; }
        Queue<Integer> q = new LinkedList<>();
        for (int i = 0; i < n; i++) if (indeg[i] == 0) q.offer(i);
        List<Integer> order = new ArrayList<>();
        while (!q.isEmpty()) {
            int u = q.poll();
            order.add(u);
            for (int v : g.get(u)) if (--indeg[v] == 0) q.offer(v);
        }
        return order.size() == n ? order : List.of(); // empty = cycle
    }

    public static void main(String[] args) {
        System.out.println(topoSort(4, new int[][]{{0,1},{0,2},{1,3},{2,3}})); // [0, 1, 2, 3]
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

vector<int> topoSort(int n, vector<vector<int>>& edges) {
    vector<vector<int>> g(n);
    vector<int> indeg(n, 0);
    for (auto& e : edges) { g[e[0]].push_back(e[1]); indeg[e[1]]++; }
    queue<int> q;
    for (int i = 0; i < n; i++) if (indeg[i] == 0) q.push(i);
    vector<int> order;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        order.push_back(u);
        for (int v : g[u]) if (--indeg[v] == 0) q.push(v);
    }
    return (int)order.size() == n ? order : vector<int>{}; // empty = cycle
}

int main() {
    vector<vector<int>> edges = {{0,1},{0,2},{1,3},{2,3}};
    for (int x : topoSort(4, edges)) cout << x << " ";
    cout << endl;   // 0 1 2 3
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "What is the Union-Find (Disjoint Set) data structure?",
    answer: `
**Intuition.** Union-Find tracks a collection of elements split into **disjoint groups**, with two near-instant operations: <code>find</code> (which group is this element in?) and <code>union</code> (merge two groups). Each group is a tree; the root is the group's representative.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 180" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">union(A,B): attach one root under the other</text>
  <line x1="80" y1="60" x2="80" y2="98" stroke="currentColor" stroke-opacity="0.35" marker-end="url(#uf)"/>
  <line x1="220" y1="60" x2="220" y2="98" stroke="currentColor" stroke-opacity="0.35" marker-end="url(#uf)"/>
  <g font-size="13" text-anchor="middle">
    <circle cx="80" cy="50" r="20" fill="#3b82f6" fill-opacity="0.18" stroke="#3b82f6"/><text x="80" y="55" fill="currentColor">A</text>
    <circle cx="80" cy="118" r="20" fill="#3b82f6" fill-opacity="0.18" stroke="#3b82f6"/><text x="80" y="123" fill="currentColor">a2</text>
    <circle cx="220" cy="50" r="20" fill="#8b5cf6" fill-opacity="0.18" stroke="#8b5cf6"/><text x="220" y="55" fill="currentColor">B</text>
    <circle cx="220" cy="118" r="20" fill="#8b5cf6" fill-opacity="0.18" stroke="#8b5cf6"/><text x="220" y="123" fill="currentColor">b2</text>
  </g>
  <path d="M242,50 Q330,40 400,55" fill="none" stroke="#22c55e" stroke-width="2.5" marker-end="url(#uf2)" stroke-dasharray="200" stroke-dashoffset="200"><animate attributeName="stroke-dashoffset" values="200;0" dur="1.4s" begin="0.3s" fill="freeze"/></path>
  <g font-size="13" text-anchor="middle">
    <circle cx="420" cy="50" r="20" fill="#22c55e" fill-opacity="0.22" stroke="#22c55e"/><text x="420" y="55" fill="currentColor">A</text>
    <text x="430" y="120" fill="currentColor" font-size="11" opacity="0.7">now one set</text>
  </g>
  <defs>
    <marker id="uf" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="currentColor" fill-opacity="0.45"/></marker>
    <marker id="uf2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#22c55e"/></marker>
  </defs>
</svg>
</div>

### Two optimizations make it near-O(1)
| Optimization | Effect |
| --- | --- |
| **Path compression** | during <code>find</code>, point every visited node straight at the root, flattening the tree |
| **Union by rank/size** | always attach the smaller tree under the larger root, keeping trees shallow |

With both, each operation runs in **O(α(n))** amortised — α is the inverse Ackermann function, effectively a small constant (≤ 4 for any practical n).

### Where it's used
- **Cycle detection** in an undirected graph (union the endpoints of each edge; a self-union means a cycle).
- **Kruskal's MST** — add an edge only if its endpoints are in different sets.
- Connected components, network connectivity, account/friend merging, percolation.

**Dry run.** union(1,2): parent[2]=1. union(2,3): find(2)=1, find(3)=3 → parent[3]=1. find(3) now compresses 3 straight to 1. find(1)==find(3) → they're connected.

> **Interview tip:** if a problem is about "are these connected?", "group these together", or "number of connected components" with incremental merges, Union-Find is usually cleaner and faster than repeated BFS/DFS. Always mention both optimizations.
`,
    examples: [
      {
        label: "Union-Find with both optimizations",
        variants: [
          { tech: "python", label: "Python", code: `class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n

    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]  # path compression
            x = self.parent[x]
        return x

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False                 # already connected
        if self.rank[ra] < self.rank[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra             # union by rank
        if self.rank[ra] == self.rank[rb]:
            self.rank[ra] += 1
        return True


# --- demo ---
uf = UnionFind(5)
uf.union(0, 1); uf.union(2, 3); uf.union(1, 3)
print(uf.find(0) == uf.find(2))   # True  (0-1-3-2 connected)
print(uf.find(0) == uf.find(4))   # False` },
          { tech: "javascript", label: "JavaScript", code: `class UnionFind {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
  }
  find(x) {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]]; // path compression
      x = this.parent[x];
    }
    return x;
  }
  union(a, b) {
    let ra = this.find(a), rb = this.find(b);
    if (ra === rb) return false;          // already connected
    if (this.rank[ra] < this.rank[rb]) [ra, rb] = [rb, ra];
    this.parent[rb] = ra;                 // union by rank
    if (this.rank[ra] === this.rank[rb]) this.rank[ra]++;
    return true;
  }
}

// --- demo ---
const uf = new UnionFind(5);
uf.union(0, 1); uf.union(2, 3); uf.union(1, 3);
console.log(uf.find(0) === uf.find(2));   // true
console.log(uf.find(0) === uf.find(4));   // false` },
          { tech: "java", label: "Java", code: `public class Main {
    public static void main(String[] args) {
        UnionFind uf = new UnionFind(5);
        uf.union(0, 1); uf.union(2, 3); uf.union(1, 3);
        System.out.println(uf.find(0) == uf.find(2));   // true
        System.out.println(uf.find(0) == uf.find(4));   // false
    }
}

class UnionFind {
    int[] parent, rank;
    UnionFind(int n) {
        parent = new int[n]; rank = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
    }
    int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];   // path compression
            x = parent[x];
        }
        return x;
    }
    boolean union(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return false;          // already connected
        if (rank[ra] < rank[rb]) { int t = ra; ra = rb; rb = t; }
        parent[rb] = ra;                     // union by rank
        if (rank[ra] == rank[rb]) rank[ra]++;
        return true;
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

struct UnionFind {
    vector<int> parent, rank_;
    UnionFind(int n) : parent(n), rank_(n, 0) {
        iota(parent.begin(), parent.end(), 0);
    }
    int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];   // path compression
            x = parent[x];
        }
        return x;
    }
    bool unite(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return false;          // already connected
        if (rank_[ra] < rank_[rb]) swap(ra, rb);
        parent[rb] = ra;                     // union by rank
        if (rank_[ra] == rank_[rb]) rank_[ra]++;
        return true;
    }
};

int main() {
    UnionFind uf(5);
    uf.unite(0, 1); uf.unite(2, 3); uf.unite(1, 3);
    cout << boolalpha << (uf.find(0) == uf.find(2)) << endl;   // true
    cout << (uf.find(0) == uf.find(4)) << endl;                // false
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you count the number of islands in a grid?",
    answer: `
**Intuition.** Each "island" is a connected blob of land cells (1s) surrounded by water (0s). Scan the grid; every time you hit an *unvisited* land cell, you've found a new island — then **flood-fill** all its connected land (DFS or BFS) so you don't count it again.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 180" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">flood-fill each new land cell; count the launches</text>
  <g font-size="12" text-anchor="middle">
    <rect x="120" y="30" width="36" height="36" fill="#22c55e" fill-opacity="0.3" stroke="#22c55e"/><text x="138" y="53" fill="currentColor">1</text>
    <rect x="156" y="30" width="36" height="36" fill="#22c55e" fill-opacity="0.3" stroke="#22c55e"/><text x="174" y="53" fill="currentColor">1</text>
    <rect x="192" y="30" width="36" height="36" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/><text x="210" y="53" fill="currentColor" opacity="0.5">0</text>
    <rect x="228" y="30" width="36" height="36" fill="#f59e0b" fill-opacity="0.3" stroke="#f59e0b"/><text x="246" y="53" fill="currentColor">1</text>

    <rect x="120" y="66" width="36" height="36" fill="#22c55e" fill-opacity="0.3" stroke="#22c55e"/><text x="138" y="89" fill="currentColor">1</text>
    <rect x="156" y="66" width="36" height="36" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/><text x="174" y="89" fill="currentColor" opacity="0.5">0</text>
    <rect x="192" y="66" width="36" height="36" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/><text x="210" y="89" fill="currentColor" opacity="0.5">0</text>
    <rect x="228" y="66" width="36" height="36" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/><text x="246" y="89" fill="currentColor" opacity="0.5">0</text>

    <rect x="120" y="102" width="36" height="36" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/><text x="138" y="125" fill="currentColor" opacity="0.5">0</text>
    <rect x="156" y="102" width="36" height="36" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/><text x="174" y="125" fill="currentColor" opacity="0.5">0</text>
    <rect x="192" y="102" width="36" height="36" fill="#8b5cf6" fill-opacity="0.3" stroke="#8b5cf6"/><text x="210" y="125" fill="currentColor">1</text>
    <rect x="228" y="102" width="36" height="36" fill="#8b5cf6" fill-opacity="0.3" stroke="#8b5cf6"/><text x="246" y="125" fill="currentColor">1</text>
  </g>
  <text x="330" y="60" fill="currentColor" font-size="12">3 islands:</text>
  <text x="330" y="82" fill="#22c55e" font-size="11">green (4 cells)</text>
  <text x="330" y="100" fill="#f59e0b" font-size="11">amber (1 cell)</text>
  <text x="330" y="118" fill="#8b5cf6" font-size="11">violet (2 cells)</text>
</svg>
</div>

### The algorithm
1. Loop over every cell <code>(r, c)</code>.
2. If it's land (<code>'1'</code>) and unvisited: increment the island count, then **DFS/BFS** to mark every connected land cell visited (4-directionally).
3. Return the count.

| | Time | Space |
| --- | --- | --- |
| Flood fill | O(rows × cols) | O(rows × cols) recursion/queue worst case |

Each cell is visited a constant number of times, so the whole scan is linear in the grid size. (Marking cells in place as <code>'0'</code> avoids a separate visited array.)

**Dry run.** Find land at (0,0) → DFS floods the top-left L-shape → island #1. Continue scanning, hit the isolated (0,3) → island #2. Later hit (2,2)-(2,3) → island #3. Total = **3**.

> **Interview tip:** this is **connected components on a grid**. The same flood-fill template solves "max area of island", "surrounded regions", "number of closed islands", and the paint-bucket tool. Mention you can mutate the grid to avoid extra visited memory.
`,
    examples: [
      {
        label: "DFS flood fill",
        variants: [
          { tech: "python", label: "Python", code: `def num_islands(grid):
    if not grid: return 0
    rows, cols = len(grid), len(grid[0])

    def dfs(r, c):
        if r < 0 or c < 0 or r >= rows or c >= cols or grid[r][c] != '1':
            return
        grid[r][c] = '0'                  # mark visited
        dfs(r+1, c); dfs(r-1, c); dfs(r, c+1); dfs(r, c-1)

    count = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == '1':
                count += 1
                dfs(r, c)
    return count


# --- demo ---
grid = [
    ["1", "1", "0", "1"],
    ["1", "0", "0", "0"],
    ["0", "0", "1", "1"],
]
print(num_islands(grid))   # 3` },
          { tech: "javascript", label: "JavaScript", code: `function numIslands(grid) {
  const rows = grid.length, cols = grid[0].length;
  function dfs(r, c) {
    if (r < 0 || c < 0 || r >= rows || c >= cols || grid[r][c] !== '1') return;
    grid[r][c] = '0';                     // mark visited
    dfs(r+1, c); dfs(r-1, c); dfs(r, c+1); dfs(r, c-1);
  }
  let count = 0;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (grid[r][c] === '1') { count++; dfs(r, c); }
  return count;
}

// --- demo ---
const grid = [
  ["1", "1", "0", "1"],
  ["1", "0", "0", "0"],
  ["0", "0", "1", "1"],
];
console.log(numIslands(grid));   // 3` },
          { tech: "java", label: "Java", code: `public class Main {
    static int numIslands(char[][] grid) {
        int rows = grid.length, cols = grid[0].length, count = 0;
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++)
                if (grid[r][c] == '1') { count++; dfs(grid, r, c); }
        return count;
    }

    static void dfs(char[][] grid, int r, int c) {
        if (r < 0 || c < 0 || r >= grid.length || c >= grid[0].length
            || grid[r][c] != '1') return;
        grid[r][c] = '0';                     // mark visited
        dfs(grid, r+1, c); dfs(grid, r-1, c);
        dfs(grid, r, c+1); dfs(grid, r, c-1);
    }

    public static void main(String[] args) {
        char[][] grid = {
            {'1','1','0','1'},
            {'1','0','0','0'},
            {'0','0','1','1'},
        };
        System.out.println(numIslands(grid));   // 3
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

void dfs(vector<vector<char>>& grid, int r, int c) {
    int rows = grid.size(), cols = grid[0].size();
    if (r < 0 || c < 0 || r >= rows || c >= cols || grid[r][c] != '1')
        return;
    grid[r][c] = '0';                     // mark visited
    dfs(grid, r+1, c); dfs(grid, r-1, c);
    dfs(grid, r, c+1); dfs(grid, r, c-1);
}

int numIslands(vector<vector<char>>& grid) {
    int count = 0;
    for (int r = 0; r < (int)grid.size(); r++)
        for (int c = 0; c < (int)grid[0].size(); c++)
            if (grid[r][c] == '1') { count++; dfs(grid, r, c); }
    return count;
}

int main() {
    vector<vector<char>> grid = {
        {'1','1','0','1'},
        {'1','0','0','0'},
        {'0','0','1','1'},
    };
    cout << numIslands(grid) << endl;   // 3
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you find the lowest common ancestor in a binary tree?",
    answer: `
**Intuition.** The lowest common ancestor (LCA) of two nodes is the **deepest** node that has both as descendants. Recurse from the root: if the two targets split — one found on the left, one on the right — the current node *is* the LCA. If both are on one side, the LCA is down that side.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 200" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">LCA(4, 7): targets split at node 5 → 5 is the LCA</text>
  <line x1="250" y1="46" x2="170" y2="96" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="250" y1="46" x2="330" y2="96" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="170" y1="116" x2="120" y2="164" stroke="#22c55e" stroke-opacity="0.6" stroke-width="2"/>
  <line x1="170" y1="116" x2="220" y2="164" stroke="#22c55e" stroke-opacity="0.6" stroke-width="2"/>
  <g font-size="14" text-anchor="middle">
    <circle cx="250" cy="38" r="20" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="250" y="43" fill="currentColor">3</text>
    <circle cx="170" cy="108" r="20" fill="#f59e0b" fill-opacity="0.25" stroke="#f59e0b"/><text x="170" y="113" fill="currentColor">5</text>
    <circle cx="330" cy="108" r="20" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="330" y="113" fill="currentColor">1</text>
    <circle cx="120" cy="176" r="20" fill="#22c55e" fill-opacity="0.25" stroke="#22c55e"/><text x="120" y="181" fill="currentColor">4</text>
    <circle cx="220" cy="176" r="20" fill="#22c55e" fill-opacity="0.25" stroke="#22c55e"/><text x="220" y="181" fill="currentColor">7</text>
  </g>
  <text x="170" y="86" fill="#f59e0b" font-size="11" text-anchor="middle">LCA</text>
  <circle cx="170" cy="108" r="25" fill="none" stroke="#f59e0b" stroke-width="2.5"><animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite"/></circle>
</svg>
</div>

### The recursive rule
1. If the node is <code>null</code> or equals either target, return it.
2. Recurse left and right.
3. If **both** sides return non-null, the current node is the LCA. Otherwise, propagate whichever side is non-null upward.

| | Time | Space |
| --- | --- | --- |
| Single DFS | O(n) | O(h) recursion |

This visits each node once, O(n), with stack depth equal to the tree height.

**Dry run (LCA of 4 and 7).** At node 5: left recursion finds 4, right recursion finds 7 → both non-null → return **5**. Node 5 propagates up as the answer; node 3 sees a non-null only from the left, so it just passes 5 along.

**Special case — a BST.** If it's a *binary search* tree, you can do better: walk down comparing values; the first node that sits *between* the two targets (or equals one) is the LCA — O(h) without recursion.

> **Interview tip:** clarify the assumptions: are both nodes guaranteed present? Is it a BST (use the value comparison) or a general binary tree (use the split recursion)? Do nodes have parent pointers (then it's like finding the intersection of two linked lists)?
`,
    examples: [
      {
        label: "LCA in a general binary tree",
        variants: [
          { tech: "python", label: "Python", code: `class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def lowest_common_ancestor(root, p, q):
    if root is None or root is p or root is q:
        return root
    left = lowest_common_ancestor(root.left, p, q)
    right = lowest_common_ancestor(root.right, p, q)
    if left and right:
        return root            # targets split here -> LCA
    return left or right       # propagate the non-null side


# --- demo ---  tree: 3 / (5 / 4,7) , 1
n4, n7 = TreeNode(4), TreeNode(7)
root = TreeNode(3, TreeNode(5, n4, n7), TreeNode(1))
print(lowest_common_ancestor(root, n4, n7).val)   # 5` },
          { tech: "javascript", label: "JavaScript", code: `class TreeNode {
  constructor(val, left = null, right = null) {
    this.val = val; this.left = left; this.right = right;
  }
}

function lowestCommonAncestor(root, p, q) {
  if (root === null || root === p || root === q) return root;
  const left = lowestCommonAncestor(root.left, p, q);
  const right = lowestCommonAncestor(root.right, p, q);
  if (left && right) return root;   // targets split here -> LCA
  return left || right;             // propagate the non-null side
}

// --- demo ---  tree: 3 / (5 / 4,7) , 1
const n4 = new TreeNode(4), n7 = new TreeNode(7);
const root = new TreeNode(3, new TreeNode(5, n4, n7), new TreeNode(1));
console.log(lowestCommonAncestor(root, n4, n7).val);   // 5` },
          { tech: "java", label: "Java", code: `public class Main {
    static class TreeNode {
        int val; TreeNode left, right;
        TreeNode(int val) { this.val = val; }
        TreeNode(int val, TreeNode left, TreeNode right) {
            this.val = val; this.left = left; this.right = right;
        }
    }

    static TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
        if (root == null || root == p || root == q) return root;
        TreeNode left = lowestCommonAncestor(root.left, p, q);
        TreeNode right = lowestCommonAncestor(root.right, p, q);
        if (left != null && right != null) return root; // split -> LCA
        return left != null ? left : right;             // propagate
    }

    public static void main(String[] args) {
        TreeNode n4 = new TreeNode(4), n7 = new TreeNode(7);
        TreeNode root = new TreeNode(3, new TreeNode(5, n4, n7), new TreeNode(1));
        System.out.println(lowestCommonAncestor(root, n4, n7).val);   // 5
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

TreeNode* lowestCommonAncestor(TreeNode* root, TreeNode* p, TreeNode* q) {
    if (root == nullptr || root == p || root == q) return root;
    TreeNode* left = lowestCommonAncestor(root->left, p, q);
    TreeNode* right = lowestCommonAncestor(root->right, p, q);
    if (left && right) return root;   // split here -> LCA
    return left ? left : right;       // propagate non-null side
}

int main() {
    TreeNode* n4 = new TreeNode(4); TreeNode* n7 = new TreeNode(7);
    TreeNode* root = new TreeNode(3, new TreeNode(5, n4, n7), new TreeNode(1));
    cout << lowestCommonAncestor(root, n4, n7)->val << endl;   // 5
    return 0;
}` },
        ],
      },
    ],
  },
];

export default augments;
