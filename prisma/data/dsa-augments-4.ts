/**
 * DSA augment batch 4 — more concrete problems from dsa-2.json.
 * See dsa-augments.types.ts for the authoring rules (no "${", no raw backticks
 * inside these template literals; inline code uses <code> tags).
 */
import type { DsaAugment } from "./dsa-augments.types";

const augments: DsaAugment[] = [
  {
    title: "How do you find the middle of a linked list?",
    answer: `
**Intuition.** You can't index a linked list, and you don't know its length up front. The trick is **two pointers at different speeds**: a slow one steps by 1, a fast one by 2. When the fast pointer reaches the end, the slow pointer is exactly halfway. One pass, no length count.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="18" fill="currentColor" font-size="12" opacity="0.7">slow +1, fast +2 → slow stops at the middle</text>
  <g font-size="13" text-anchor="middle">
    <circle cx="60" cy="70" r="20" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="60" y="75" fill="currentColor">1</text>
    <circle cx="150" cy="70" r="20" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="150" y="75" fill="currentColor">2</text>
    <circle cx="240" cy="70" r="20" fill="#22c55e" fill-opacity="0.22" stroke="#22c55e"/><text x="240" y="75" fill="currentColor">3</text>
    <circle cx="330" cy="70" r="20" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="330" y="75" fill="currentColor">4</text>
    <circle cx="420" cy="70" r="20" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="420" y="75" fill="currentColor">5</text>
  </g>
  <line x1="80" y1="70" x2="130" y2="70" stroke="currentColor" stroke-opacity="0.35" marker-end="url(#mid)"/>
  <line x1="170" y1="70" x2="220" y2="70" stroke="currentColor" stroke-opacity="0.35" marker-end="url(#mid)"/>
  <line x1="260" y1="70" x2="310" y2="70" stroke="currentColor" stroke-opacity="0.35" marker-end="url(#mid)"/>
  <line x1="350" y1="70" x2="400" y2="70" stroke="currentColor" stroke-opacity="0.35" marker-end="url(#mid)"/>
  <circle cx="60" cy="70" r="9" fill="#22c55e"><animate attributeName="cx" values="60;150;240;240" dur="3s" repeatCount="indefinite"/></circle>
  <circle cx="60" cy="70" r="7" fill="#f59e0b"><animate attributeName="cx" values="60;240;420;420" dur="3s" repeatCount="indefinite"/></circle>
  <text x="60" y="118" fill="#22c55e" font-size="11" text-anchor="middle">slow</text>
  <text x="60" y="134" fill="#f59e0b" font-size="11" text-anchor="middle">fast</text>
  <defs><marker id="mid" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="currentColor" fill-opacity="0.4"/></marker></defs>
</svg>
</div>

### The algorithm
1. <code>slow = fast = head</code>.
2. While <code>fast</code> and <code>fast.next</code> exist: <code>slow = slow.next</code>, <code>fast = fast.next.next</code>.
3. <code>slow</code> is now the middle.

| | Time | Space |
| --- | --- | --- |
| Slow / fast pointers | O(n) | O(1) |
| Count length, then walk n/2 | O(n) (two passes) | O(1) |

**Even-length lists** return the **second** of the two middles with this loop condition — adjust to <code>fast.next.next</code> checks if you want the first.

**Dry run.** 1→2→3→4→5. slow:1→2→3, fast:1→3→5 (then fast.next is null, stop). slow points at **3**, the middle.

> **Interview tip:** this slow/fast pattern is the same machinery as cycle detection and "delete the middle node" — once you internalise it, a whole family of linked-list problems opens up.
`,
    examples: [
      {
        label: "Slow / fast pointers",
        variants: [
          { tech: "python", label: "Python", code: `class ListNode:
    def __init__(self, val, nxt=None):
        self.val, self.next = val, nxt

def middle_node(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow


# --- demo ---
def build(vals):
    head = None
    for v in reversed(vals): head = ListNode(v, head)
    return head

print(middle_node(build([1, 2, 3, 4, 5])).val)    # 3
print(middle_node(build([1, 2, 3, 4, 5, 6])).val) # 4 (second middle)` },
          { tech: "javascript", label: "JavaScript", code: `class ListNode {
  constructor(val, next = null) { this.val = val; this.next = next; }
}

function middleNode(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
  }
  return slow;
}

// --- demo ---
const build = (vals) => vals.reduceRight((next, v) => new ListNode(v, next), null);
console.log(middleNode(build([1, 2, 3, 4, 5])).val);    // 3
console.log(middleNode(build([1, 2, 3, 4, 5, 6])).val); // 4` },
          { tech: "java", label: "Java", code: `public class Main {
    static class ListNode {
        int val; ListNode next;
        ListNode(int val) { this.val = val; }
    }

    static ListNode middleNode(ListNode head) {
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
        }
        return slow;
    }

    static ListNode build(int[] vals) {
        ListNode head = null;
        for (int i = vals.length - 1; i >= 0; i--) {
            ListNode n = new ListNode(vals[i]); n.next = head; head = n;
        }
        return head;
    }

    public static void main(String[] args) {
        System.out.println(middleNode(build(new int[]{1,2,3,4,5})).val);    // 3
        System.out.println(middleNode(build(new int[]{1,2,3,4,5,6})).val);  // 4
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

struct ListNode {
    int val;
    ListNode* next = nullptr;
    ListNode(int v) : val(v) {}
};

ListNode* middleNode(ListNode* head) {
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
    }
    return slow;
}

int main() {
    auto build = [](vector<int> vals) {
        ListNode* h = nullptr;
        for (int i = (int)vals.size() - 1; i >= 0; i--) {
            ListNode* n = new ListNode(vals[i]); n->next = h; h = n;
        }
        return h;
    };
    cout << middleNode(build({1,2,3,4,5}))->val << endl;     // 3
    cout << middleNode(build({1,2,3,4,5,6}))->val << endl;   // 4
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you check if two strings are anagrams?",
    answer: `
**Intuition.** Two strings are anagrams if they contain the **same characters with the same counts** — just rearranged. So compare their character frequencies. If every count matches (and lengths are equal), they're anagrams.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 160" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="18" fill="currentColor" font-size="12" opacity="0.7">"listen" vs "silent": same letter counts</text>
  <text x="60" y="50" fill="#3b82f6" font-size="14" font-family="monospace" font-weight="700">listen</text>
  <text x="60" y="120" fill="#8b5cf6" font-size="14" font-family="monospace" font-weight="700">silent</text>
  <g font-size="11" text-anchor="middle">
    <rect x="170" y="68" width="40" height="24" rx="4" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/><text x="190" y="84" fill="currentColor">l:1</text>
    <rect x="214" y="68" width="40" height="24" rx="4" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/><text x="234" y="84" fill="currentColor">i:1</text>
    <rect x="258" y="68" width="40" height="24" rx="4" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/><text x="278" y="84" fill="currentColor">s:1</text>
    <rect x="302" y="68" width="44" height="24" rx="4" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/><text x="324" y="84" fill="currentColor">t:1</text>
    <rect x="350" y="68" width="44" height="24" rx="4" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/><text x="372" y="84" fill="currentColor">e:1</text>
    <rect x="398" y="68" width="46" height="24" rx="4" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/><text x="421" y="84" fill="currentColor">n:1</text>
  </g>
  <text x="305" y="120" fill="#22c55e" font-size="12">all counts equal → anagram ✓</text>
  <rect x="168" y="64" width="278" height="32" rx="6" fill="none" stroke="#22c55e" stroke-width="2"><animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite"/></rect>
</svg>
</div>

### Two standard approaches
| Approach | Time | Space |
| --- | --- | --- |
| **Frequency count** (map / 26-array) | O(n) | O(1) for a fixed alphabet |
| Sort both, compare | O(n log n) | O(n) |

The frequency method: build a count map for the first string, decrement for the second; if any count goes negative or a residue remains, it's not an anagram. For lowercase-only input, a 26-length array beats a hash map.

**Dry run.** "rat" vs "car": counts of "rat" = {r:1,a:1,t:1}. Subtract "car" → c becomes -1 → **not an anagram** (and 't' is left over).

**Quick reject:** if the lengths differ, return false immediately — saves the whole count.

> **Interview tip:** ask about the character set (lowercase a–z? Unicode? case-sensitive? spaces?). It changes whether a fixed 26-array works or you need a full hash map — interviewers love that clarifying question.
`,
    examples: [
      {
        label: "Frequency-count check",
        variants: [
          { tech: "python", label: "Python", code: `from collections import Counter

def is_anagram(s, t):
    if len(s) != len(t):
        return False
    return Counter(s) == Counter(t)


# --- demo ---
print(is_anagram("listen", "silent"))   # True
print(is_anagram("rat", "car"))         # False` },
          { tech: "javascript", label: "JavaScript", code: `function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const count = {};
  for (const c of s) count[c] = (count[c] || 0) + 1;
  for (const c of t) {
    if (!count[c]) return false;
    count[c]--;
  }
  return true;
}

// --- demo ---
console.log(isAnagram("listen", "silent")); // true
console.log(isAnagram("rat", "car"));       // false` },
          { tech: "java", label: "Java", code: `public class Main {
    static boolean isAnagram(String s, String t) {
        if (s.length() != t.length()) return false;
        int[] count = new int[26];
        for (int i = 0; i < s.length(); i++) {
            count[s.charAt(i) - 'a']++;
            count[t.charAt(i) - 'a']--;
        }
        for (int c : count) if (c != 0) return false;
        return true;
    }

    public static void main(String[] args) {
        System.out.println(isAnagram("listen", "silent")); // true
        System.out.println(isAnagram("rat", "car"));       // false
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

bool isAnagram(const string& s, const string& t) {
    if (s.size() != t.size()) return false;
    array<int,26> count{};
    for (size_t i = 0; i < s.size(); i++) {
        count[s[i] - 'a']++;
        count[t[i] - 'a']--;
    }
    for (int c : count) if (c != 0) return false;
    return true;
}

int main() {
    cout << boolalpha << isAnagram("listen", "silent") << endl; // true
    cout << isAnagram("rat", "car") << endl;                    // false
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you find the longest common subsequence?",
    answer: `
**Intuition.** A subsequence keeps order but can skip characters. The LCS of two strings is found with a **2-D DP table**: <code>dp[i][j]</code> = LCS length of the first <code>i</code> chars of A and first <code>j</code> of B. If the current characters match, extend the diagonal; otherwise take the best of dropping one character from either string.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 200" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">A="ABCBDAB", B="BDCAB" → LCS length 4</text>
  <g font-size="12" text-anchor="middle">
    <text x="60" y="44" fill="currentColor" opacity="0.7">match → dp[i-1][j-1] + 1 (diagonal)</text>
    <text x="60" y="62" fill="currentColor" opacity="0.7">mismatch → max(up, left)</text>
  </g>
  <g font-size="12" text-anchor="middle">
    <rect x="230" y="40" width="44" height="34" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/><text x="252" y="62" fill="currentColor">2</text>
    <rect x="274" y="40" width="44" height="34" fill="#f59e0b" fill-opacity="0.18" stroke="#f59e0b"/><text x="296" y="62" fill="currentColor">2</text>
    <rect x="230" y="74" width="44" height="34" fill="#3b82f6" fill-opacity="0.15" stroke="#3b82f6"/><text x="252" y="96" fill="currentColor">2</text>
    <rect x="274" y="74" width="44" height="34" fill="#22c55e" fill-opacity="0.25" stroke="#22c55e"/><text x="296" y="96" fill="currentColor">3</text>
    <path d="M236,80 L290,98" stroke="#22c55e" stroke-width="2" marker-end="url(#lcs)"/>
    <text x="360" y="80" fill="#22c55e" font-size="11">chars match →</text>
    <text x="360" y="96" fill="#22c55e" font-size="11">take diagonal + 1</text>
  </g>
  <text x="120" y="150" fill="currentColor" font-size="11" opacity="0.7">each cell builds on its neighbours; answer is the bottom-right</text>
  <defs><marker id="lcs" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#22c55e"/></marker></defs>
</svg>
</div>

### The recurrence
- If <code>A[i-1] == B[j-1]</code>: <code>dp[i][j] = dp[i-1][j-1] + 1</code>.
- Else: <code>dp[i][j] = max(dp[i-1][j], dp[i][j-1])</code>.
- Base row/column (empty string) = 0.

| | Time | Space |
| --- | --- | --- |
| 2-D DP | O(m × n) | O(m × n), reducible to O(min(m, n)) |

The answer is <code>dp[m][n]</code>; to recover the actual subsequence, walk back from the bottom-right following the choices.

**Dry run.** "ABCBDAB" / "BDCAB" → LCS length **4** (e.g. "BCAB" or "BDAB"). Each match nudges the diagonal up by 1; mismatches inherit the best neighbour.

**Related DP cousins:** edit distance, longest common substring (resets on mismatch), and shortest common supersequence all share this grid shape.

> **Interview tip:** be precise — *subsequence* (gaps allowed, this DP) vs *substring* (contiguous, a different recurrence that resets to 0 on mismatch). Mixing them up is a classic slip.
`,
    examples: [
      {
        label: "LCS length (2-D DP)",
        variants: [
          { tech: "python", label: "Python", code: `def lcs(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i-1] == b[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])
    return dp[m][n]


# --- demo ---
print(lcs("ABCBDAB", "BDCAB"))   # 4  (e.g. "BCAB")` },
          { tech: "javascript", label: "JavaScript", code: `function lcs(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i-1] === b[j-1]) dp[i][j] = dp[i-1][j-1] + 1;
      else dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
    }
  }
  return dp[m][n];
}

// --- demo ---
console.log(lcs("ABCBDAB", "BDCAB")); // 4` },
          { tech: "java", label: "Java", code: `public class Main {
    static int lcs(String a, String b) {
        int m = a.length(), n = b.length();
        int[][] dp = new int[m + 1][n + 1];
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (a.charAt(i-1) == b.charAt(j-1))
                    dp[i][j] = dp[i-1][j-1] + 1;
                else
                    dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
            }
        }
        return dp[m][n];
    }

    public static void main(String[] args) {
        System.out.println(lcs("ABCBDAB", "BDCAB")); // 4
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

int lcs(const string& a, const string& b) {
    int m = a.size(), n = b.size();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
    for (int i = 1; i <= m; i++)
        for (int j = 1; j <= n; j++)
            dp[i][j] = (a[i-1] == b[j-1])
                ? dp[i-1][j-1] + 1
                : max(dp[i-1][j], dp[i][j-1]);
    return dp[m][n];
}

int main() {
    cout << lcs("ABCBDAB", "BDCAB") << endl;   // 4
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you solve the coin change problem?",
    answer: `
**Intuition.** "Fewest coins to make an amount" is a **DP** problem, not greedy (greedy fails for coins like {1,3,4} making 6). Build up the answer for every sub-amount from 0 to the target: the best for amount <code>a</code> is 1 + the best for <code>a - coin</code>, over all coins that fit.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 170" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">coins {1,3,4}, amount 6 → dp[6]=2 (3+3)</text>
  <g font-size="12" text-anchor="middle">
    <rect x="20" y="46" width="58" height="40" rx="5" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="49" y="71" fill="currentColor">0</text>
    <rect x="78" y="46" width="58" height="40" rx="5" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="107" y="71" fill="currentColor">1</text>
    <rect x="136" y="46" width="58" height="40" rx="5" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="165" y="71" fill="currentColor">2</text>
    <rect x="194" y="46" width="58" height="40" rx="5" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="223" y="71" fill="currentColor">1</text>
    <rect x="252" y="46" width="58" height="40" rx="5" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="281" y="71" fill="currentColor">1</text>
    <rect x="310" y="46" width="58" height="40" rx="5" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="339" y="71" fill="currentColor">2</text>
    <rect x="368" y="46" width="58" height="40" rx="5" fill="#f59e0b" fill-opacity="0.22" stroke="#f59e0b"/><text x="397" y="71" fill="currentColor">2</text>
  </g>
  <g font-size="10" fill="currentColor" opacity="0.55" text-anchor="middle">
    <text x="49" y="102">amt 0</text><text x="107" y="102">1</text><text x="165" y="102">2</text><text x="223" y="102">3</text><text x="281" y="102">4</text><text x="339" y="102">5</text><text x="397" y="102">6</text>
  </g>
  <path d="M281,90 Q340,130 397,90" fill="none" stroke="#f59e0b" stroke-width="2" marker-end="url(#cc)"/>
  <text x="339" y="140" fill="#f59e0b" font-size="11" text-anchor="middle">dp[6] = dp[6-3] + 1 = 1 + 1 = 2</text>
  <defs><marker id="cc" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#f59e0b"/></marker></defs>
</svg>
</div>

### The recurrence
- <code>dp[0] = 0</code> (zero coins make amount 0); all others start at ∞.
- For each amount <code>a</code> from 1 to target, for each <code>coin ≤ a</code>: <code>dp[a] = min(dp[a], dp[a - coin] + 1)</code>.
- If <code>dp[target]</code> is still ∞, the amount is impossible → return -1.

| | Time | Space |
| --- | --- | --- |
| Bottom-up DP | O(amount × coins) | O(amount) |

**Dry run (coins {1,3,4}, amount 6).** dp grows [0,1,2,1,1,2,2]. dp[6] = min(dp[5]+1, dp[3]+1, dp[2]+1) = min(3, 2, 3) = **2** — the two 3-coins, which greedy (4+1+1 = 3) would miss.

**The count-of-ways variant** flips the loops (coins outer, amount inner) to avoid counting permutations as distinct.

> **Interview tip:** explicitly say "greedy is wrong here" and give the {1,3,4}→6 counterexample. That single sentence shows you know *why* DP is required, which is the whole point of the question.
`,
    examples: [
      {
        label: "Min coins (bottom-up DP)",
        variants: [
          { tech: "python", label: "Python", code: `def coin_change(coins, amount):
    dp = [0] + [float('inf')] * amount
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a:
                dp[a] = min(dp[a], dp[a - c] + 1)
    return dp[amount] if dp[amount] != float('inf') else -1


# --- demo ---
print(coin_change([1, 3, 4], 6))   # 2  (3+3, beats greedy's 4+1+1)
print(coin_change([2], 3))         # -1 (impossible)` },
          { tech: "javascript", label: "JavaScript", code: `function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let a = 1; a <= amount; a++) {
    for (const c of coins) {
      if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}

// --- demo ---
console.log(coinChange([1, 3, 4], 6)); // 2
console.log(coinChange([2], 3));       // -1` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static int coinChange(int[] coins, int amount) {
        int[] dp = new int[amount + 1];
        Arrays.fill(dp, amount + 1);          // "infinity"
        dp[0] = 0;
        for (int a = 1; a <= amount; a++)
            for (int c : coins)
                if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);
        return dp[amount] > amount ? -1 : dp[amount];
    }

    public static void main(String[] args) {
        System.out.println(coinChange(new int[]{1, 3, 4}, 6)); // 2
        System.out.println(coinChange(new int[]{2}, 3));       // -1
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

int coinChange(vector<int>& coins, int amount) {
    vector<int> dp(amount + 1, amount + 1);  // "infinity"
    dp[0] = 0;
    for (int a = 1; a <= amount; a++)
        for (int c : coins)
            if (c <= a) dp[a] = min(dp[a], dp[a - c] + 1);
    return dp[amount] > amount ? -1 : dp[amount];
}

int main() {
    vector<int> coins = {1, 3, 4};
    cout << coinChange(coins, 6) << endl;   // 2
    vector<int> c2 = {2};
    cout << coinChange(c2, 3) << endl;      // -1
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you solve the climbing stairs problem?",
    answer: `
**Intuition.** To reach step <code>n</code> you arrived either from step <code>n-1</code> (a 1-step) or step <code>n-2</code> (a 2-step). So the number of ways to reach <code>n</code> is the sum of the ways to reach those two — which is exactly the **Fibonacci** recurrence.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 170" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">ways(n) = ways(n-1) + ways(n-2)</text>
  <g font-size="12" text-anchor="middle">
    <rect x="40" y="120" width="70" height="28" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="75" y="139" fill="currentColor">1 way</text>
    <rect x="120" y="92" width="70" height="56" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="155" y="125" fill="currentColor">2</text>
    <rect x="200" y="64" width="70" height="84" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="235" y="111" fill="currentColor">3</text>
    <rect x="280" y="36" width="70" height="112" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="315" y="97" fill="currentColor">5</text>
  </g>
  <path d="M155,86 Q195,50 235,58" fill="none" stroke="#f59e0b" stroke-width="2" marker-end="url(#cs)"/>
  <path d="M235,58 Q280,30 315,30" fill="none" stroke="#f59e0b" stroke-width="2" marker-end="url(#cs)"/>
  <text x="400" y="70" fill="currentColor" font-size="11">step 4:</text>
  <text x="400" y="88" fill="#22c55e" font-size="11">3 + 2 = 5</text>
  <defs><marker id="cs" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#f59e0b"/></marker></defs>
</svg>
</div>

### From recurrence to O(1) space
The naive recursion recomputes the same subproblems exponentially. Since each value needs only the previous two, keep **two rolling variables** and sweep upward.

1. <code>a = 1</code> (ways to step 0), <code>b = 1</code> (ways to step 1).
2. For <code>i</code> from 2 to n: <code>next = a + b</code>, then shift <code>a = b</code>, <code>b = next</code>.
3. Answer is <code>b</code>.

| Approach | Time | Space |
| --- | --- | --- |
| Naive recursion | O(2ⁿ) | O(n) |
| DP / two variables | **O(n)** | **O(1)** |

**Dry run (n = 4).** ways: 1, 1, 2, 3, **5**. (1+1+1+1, 1+1+2, 1+2+1, 2+1+1, 2+2.)

**Generalisation:** if you can take 1, 2, or 3 steps, sum the previous *three* — a sliding-window of the recurrence.

> **Interview tip:** name it: "this is Fibonacci in disguise." That instantly signals the O(n)/O(1) DP and pre-empts the interviewer's "can you do better than recursion?" follow-up.
`,
    examples: [
      {
        label: "O(1)-space DP",
        variants: [
          { tech: "python", label: "Python", code: `def climb_stairs(n):
    a, b = 1, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b


# --- demo ---
print(climb_stairs(2), climb_stairs(3), climb_stairs(5))   # 2 3 8` },
          { tech: "javascript", label: "JavaScript", code: `function climbStairs(n) {
  let a = 1, b = 1;
  for (let i = 2; i <= n; i++) [a, b] = [b, a + b];
  return b;
}

// --- demo ---
console.log(climbStairs(2), climbStairs(3), climbStairs(5)); // 2 3 8` },
          { tech: "java", label: "Java", code: `public class Main {
    static int climbStairs(int n) {
        int a = 1, b = 1;
        for (int i = 2; i <= n; i++) { int next = a + b; a = b; b = next; }
        return b;
    }

    public static void main(String[] args) {
        System.out.println(climbStairs(2) + " " + climbStairs(3) + " " + climbStairs(5)); // 2 3 8
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

int climbStairs(int n) {
    int a = 1, b = 1;
    for (int i = 2; i <= n; i++) { int next = a + b; a = b; b = next; }
    return b;
}

int main() {
    cout << climbStairs(2) << " " << climbStairs(3) << " " << climbStairs(5) << endl; // 2 3 8
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you detect a cycle in a directed graph?",
    answer: `
**Intuition.** In a directed graph, a cycle is a **back edge** — an edge that points to a node still being explored on the current DFS path. Track three states per node: **unvisited**, **in-progress** (on the recursion stack), and **done**. Reaching an in-progress node means you've looped back to it.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 180" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">edge to a gray (in-progress) node = cycle</text>
  <line x1="90" y1="70" x2="180" y2="70" stroke="currentColor" stroke-opacity="0.35" marker-end="url(#dc)"/>
  <line x1="210" y1="84" x2="280" y2="120" stroke="currentColor" stroke-opacity="0.35" marker-end="url(#dc)"/>
  <path d="M280,120 Q200,150 90,90" fill="none" stroke="#ef4444" stroke-width="2.5" marker-end="url(#dc2)" stroke-dasharray="300" stroke-dashoffset="300"><animate attributeName="stroke-dashoffset" values="300;0" dur="1.6s" begin="0.5s" fill="freeze"/></path>
  <g font-size="13" text-anchor="middle">
    <circle cx="70" cy="70" r="22" fill="#f59e0b" fill-opacity="0.22" stroke="#f59e0b"/><text x="70" y="75" fill="currentColor">A</text>
    <circle cx="200" cy="70" r="22" fill="#f59e0b" fill-opacity="0.22" stroke="#f59e0b"/><text x="200" y="75" fill="currentColor">B</text>
    <circle cx="300" cy="130" r="22" fill="#f59e0b" fill-opacity="0.22" stroke="#f59e0b"/><text x="300" y="135" fill="currentColor">C</text>
  </g>
  <text x="400" y="60" fill="#f59e0b" font-size="11">gray = in-progress</text>
  <text x="400" y="100" fill="#ef4444" font-size="11">C → A revisits gray A</text>
  <text x="400" y="116" fill="#ef4444" font-size="11">→ cycle found</text>
  <defs>
    <marker id="dc" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="currentColor" fill-opacity="0.4"/></marker>
    <marker id="dc2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#ef4444"/></marker>
  </defs>
</svg>
</div>

### Two ways
| Method | How it detects a cycle |
| --- | --- |
| **DFS + 3 colors** | reaching a node currently *in-progress* (gray) is a back edge → cycle |
| **Kahn's topo sort** | if you can't remove all nodes (some keep a non-zero in-degree), a cycle exists |

Both run in **O(V + E)**. Note the **directed** case needs the in-progress state — you can't just use a single "visited" set (a node reached twice via different paths isn't necessarily a cycle). That differs from undirected graphs, where any already-visited non-parent neighbour signals a cycle.

**Dry run.** DFS A (gray) → B (gray) → C (gray) → C has edge to A, and A is still gray → **cycle**. Without the edge to A, C finishes (black), B finishes, A finishes → no cycle.

> **Interview tip:** stress the difference from undirected cycle detection — directed needs the *recursion-stack* (gray) check, not just visited. If the problem is "can all tasks finish?" it's the same as "is this DAG?" → topological sort.
`,
    examples: [
      {
        label: "DFS with 3 colors",
        variants: [
          { tech: "python", label: "Python", code: `def has_cycle(graph, n):
    # 0 = unvisited, 1 = in-progress, 2 = done
    state = [0] * n

    def dfs(u):
        state[u] = 1
        for v in graph[u]:
            if state[v] == 1:        # back edge -> cycle
                return True
            if state[v] == 0 and dfs(v):
                return True
        state[u] = 2
        return False

    return any(state[i] == 0 and dfs(i) for i in range(n))


# --- demo ---
print(has_cycle([[1], [2], [0]], 3))   # True  (0->1->2->0)
print(has_cycle([[1], [2], []], 3))    # False` },
          { tech: "javascript", label: "JavaScript", code: `function hasCycle(graph, n) {
  const state = new Array(n).fill(0); // 0=unvisited,1=in-progress,2=done
  function dfs(u) {
    state[u] = 1;
    for (const v of graph[u]) {
      if (state[v] === 1) return true;        // back edge -> cycle
      if (state[v] === 0 && dfs(v)) return true;
    }
    state[u] = 2;
    return false;
  }
  for (let i = 0; i < n; i++)
    if (state[i] === 0 && dfs(i)) return true;
  return false;
}

// --- demo ---
console.log(hasCycle([[1], [2], [0]], 3)); // true
console.log(hasCycle([[1], [2], []], 3));  // false` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static boolean hasCycle(List<List<Integer>> graph, int n) {
        int[] state = new int[n]; // 0=unvisited,1=in-progress,2=done
        for (int i = 0; i < n; i++)
            if (state[i] == 0 && dfs(graph, i, state)) return true;
        return false;
    }

    static boolean dfs(List<List<Integer>> graph, int u, int[] state) {
        state[u] = 1;
        for (int v : graph.get(u)) {
            if (state[v] == 1) return true;          // back edge -> cycle
            if (state[v] == 0 && dfs(graph, v, state)) return true;
        }
        state[u] = 2;
        return false;
    }

    public static void main(String[] args) {
        System.out.println(hasCycle(List.of(List.of(1), List.of(2), List.of(0)), 3)); // true
        System.out.println(hasCycle(List.of(List.of(1), List.of(2), List.of()), 3));  // false
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

bool dfs(vector<vector<int>>& g, int u, vector<int>& state) {
    state[u] = 1;                       // in-progress
    for (int v : g[u]) {
        if (state[v] == 1) return true; // back edge -> cycle
        if (state[v] == 0 && dfs(g, v, state)) return true;
    }
    state[u] = 2;                       // done
    return false;
}

bool hasCycle(vector<vector<int>>& g, int n) {
    vector<int> state(n, 0);
    for (int i = 0; i < n; i++)
        if (state[i] == 0 && dfs(g, i, state)) return true;
    return false;
}

int main() {
    vector<vector<int>> g1 = {{1},{2},{0}};
    cout << boolalpha << hasCycle(g1, 3) << endl;   // true
    vector<vector<int>> g2 = {{1},{2},{}};
    cout << hasCycle(g2, 3) << endl;                // false
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you move all zeroes to the end of an array in place?",
    answer: `
**Intuition.** Keep a **write pointer** for where the next non-zero belongs. Scan the array; each time you see a non-zero, place it at the write pointer and advance it. After the pass, everything from the write pointer onward is filled with zeros. Order of non-zeros is preserved, O(1) extra space.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 160" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="18" fill="currentColor" font-size="12" opacity="0.7">[0,1,0,3,12] → [1,3,12,0,0]</text>
  <g font-size="13" text-anchor="middle">
    <rect x="40" y="44" width="50" height="40" rx="5" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="65" y="69" fill="currentColor">1</text>
    <rect x="94" y="44" width="50" height="40" rx="5" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="119" y="69" fill="currentColor">3</text>
    <rect x="148" y="44" width="50" height="40" rx="5" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="173" y="69" fill="currentColor">12</text>
    <rect x="202" y="44" width="50" height="40" rx="5" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.25"/><text x="227" y="69" fill="currentColor" opacity="0.6">0</text>
    <rect x="256" y="44" width="50" height="40" rx="5" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.25"/><text x="281" y="69" fill="currentColor" opacity="0.6">0</text>
  </g>
  <polygon points="173,104 165,120 181,120" fill="#f59e0b"><animate attributeName="points" values="65,104 57,120 73,120; 119,104 111,120 127,120; 173,104 165,120 181,120; 173,104 165,120 181,120" dur="3s" repeatCount="indefinite"/></polygon>
  <text x="173" y="138" fill="#f59e0b" font-size="11" text-anchor="middle">write pointer (next non-zero slot)</text>
</svg>
</div>

### The algorithm
1. <code>write = 0</code>.
2. For each <code>x</code> in the array: if <code>x != 0</code>, set <code>arr[write] = x</code> and <code>write++</code>.
3. Fill <code>arr[write..end]</code> with 0.

(A swap-based variant moves zeros in a single loop without the final fill.)

| | Time | Space |
| --- | --- | --- |
| Write-pointer pass | O(n) | O(1) |

**Dry run.** [0,1,0,3,12]: skip 0; 1→arr[0], write=1; skip 0; 3→arr[1], write=2; 12→arr[2], write=3. Fill arr[3],arr[4]=0 → **[1,3,12,0,0]**.

> **Interview tip:** "in place" means O(1) extra space — don't build a new array. Confirm whether the relative order of non-zeros must be preserved (it usually must), which rules out a naive two-end swap that would scramble it.
`,
    examples: [
      {
        label: "Write-pointer (stable)",
        variants: [
          { tech: "python", label: "Python", code: `def move_zeroes(nums):
    write = 0
    for x in nums:
        if x != 0:
            nums[write] = x
            write += 1
    for i in range(write, len(nums)):
        nums[i] = 0
    return nums


# --- demo ---
print(move_zeroes([0, 1, 0, 3, 12]))   # [1, 3, 12, 0, 0]` },
          { tech: "javascript", label: "JavaScript", code: `function moveZeroes(nums) {
  let write = 0;
  for (const x of nums) {
    if (x !== 0) nums[write++] = x;
  }
  while (write < nums.length) nums[write++] = 0;
  return nums;
}

// --- demo ---
console.log(moveZeroes([0, 1, 0, 3, 12])); // [1, 3, 12, 0, 0]` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static void moveZeroes(int[] nums) {
        int write = 0;
        for (int x : nums) {
            if (x != 0) nums[write++] = x;
        }
        while (write < nums.length) nums[write++] = 0;
    }

    public static void main(String[] args) {
        int[] a = {0, 1, 0, 3, 12};
        moveZeroes(a);
        System.out.println(Arrays.toString(a)); // [1, 3, 12, 0, 0]
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

void moveZeroes(vector<int>& nums) {
    int write = 0;
    for (int x : nums) {
        if (x != 0) nums[write++] = x;
    }
    while (write < (int)nums.size()) nums[write++] = 0;
}

int main() {
    vector<int> a = {0, 1, 0, 3, 12};
    moveZeroes(a);
    for (int x : a) cout << x << " ";
    cout << endl;   // 1 3 12 0 0
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you rotate an array by k positions?",
    answer: `
**Intuition.** Rotating right by <code>k</code> means the last <code>k</code> elements wrap to the front. The elegant O(1)-space trick is the **reversal method**: reverse the whole array, then reverse the first <code>k</code> and the remaining <code>n−k</code>. Two flips put everything in place.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 180" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">[1,2,3,4,5], k=2 → [4,5,1,2,3]</text>
  <g font-size="12" text-anchor="middle">
    <text x="20" y="44" fill="currentColor" opacity="0.7" text-anchor="start">1) reverse all:</text>
    <text x="250" y="44" fill="currentColor" font-family="monospace">5 4 3 2 1</text>
    <text x="20" y="78" fill="currentColor" opacity="0.7" text-anchor="start">2) reverse first k:</text>
    <text x="250" y="78" fill="#22c55e" font-family="monospace" font-weight="700">4 5</text>
    <text x="306" y="78" fill="currentColor" font-family="monospace">3 2 1</text>
    <text x="20" y="112" fill="currentColor" opacity="0.7" text-anchor="start">3) reverse rest:</text>
    <text x="250" y="112" fill="currentColor" font-family="monospace">4 5</text>
    <text x="306" y="112" fill="#f59e0b" font-family="monospace" font-weight="700">1 2 3</text>
    <text x="20" y="146" fill="#22c55e" opacity="0.9" text-anchor="start">result:</text>
    <text x="250" y="146" fill="#22c55e" font-family="monospace" font-weight="700">4 5 1 2 3</text>
  </g>
  <rect x="232" y="132" width="100" height="20" rx="4" fill="none" stroke="#22c55e" stroke-width="2"><animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite"/></rect>
</svg>
</div>

### The reversal method
1. Normalise: <code>k = k % n</code> (rotating by n is a no-op).
2. Reverse the entire array.
3. Reverse <code>arr[0 .. k-1]</code>.
4. Reverse <code>arr[k .. n-1]</code>.

| Approach | Time | Space |
| --- | --- | --- |
| **Reversal** | O(n) | **O(1)** |
| Extra array (copy shifted) | O(n) | O(n) |
| Rotate one step k times | O(n·k) | O(1) |

**Dry run ([1,2,3,4,5], k=2).** reverse all → [5,4,3,2,1]; reverse first 2 → [4,5,3,2,1]; reverse last 3 → **[4,5,1,2,3]**.

> **Interview tip:** always reduce <code>k %= n</code> first — a forgotten modulo breaks when <code>k ≥ n</code> (and avoid the O(n·k) "shift one at a time" approach unless k is tiny).
`,
    examples: [
      {
        label: "Reversal method (O(1) space)",
        variants: [
          { tech: "python", label: "Python", code: `def rotate(nums, k):
    n = len(nums)
    k %= n
    def reverse(lo, hi):
        while lo < hi:
            nums[lo], nums[hi] = nums[hi], nums[lo]
            lo += 1; hi -= 1
    reverse(0, n - 1)
    reverse(0, k - 1)
    reverse(k, n - 1)
    return nums


# --- demo ---
print(rotate([1, 2, 3, 4, 5], 2))   # [4, 5, 1, 2, 3]` },
          { tech: "javascript", label: "JavaScript", code: `function rotate(nums, k) {
  const n = nums.length;
  k %= n;
  const reverse = (lo, hi) => {
    while (lo < hi) { [nums[lo], nums[hi]] = [nums[hi], nums[lo]]; lo++; hi--; }
  };
  reverse(0, n - 1);
  reverse(0, k - 1);
  reverse(k, n - 1);
  return nums;
}

// --- demo ---
console.log(rotate([1, 2, 3, 4, 5], 2)); // [4, 5, 1, 2, 3]` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static void rotate(int[] nums, int k) {
        int n = nums.length;
        k %= n;
        reverse(nums, 0, n - 1);
        reverse(nums, 0, k - 1);
        reverse(nums, k, n - 1);
    }

    static void reverse(int[] a, int lo, int hi) {
        while (lo < hi) {
            int t = a[lo]; a[lo] = a[hi]; a[hi] = t;
            lo++; hi--;
        }
    }

    public static void main(String[] args) {
        int[] a = {1, 2, 3, 4, 5};
        rotate(a, 2);
        System.out.println(Arrays.toString(a)); // [4, 5, 1, 2, 3]
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

void rotateArray(vector<int>& nums, int k) {
    int n = nums.size();
    k %= n;
    reverse(nums.begin(), nums.end());
    reverse(nums.begin(), nums.begin() + k);
    reverse(nums.begin() + k, nums.end());
}

int main() {
    vector<int> a = {1, 2, 3, 4, 5};
    rotateArray(a, 2);
    for (int x : a) cout << x << " ";
    cout << endl;   // 4 5 1 2 3
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you check if a binary tree is balanced?",
    answer: `
**Intuition.** A tree is height-balanced if, at **every** node, the heights of the left and right subtrees differ by at most 1. The naive check recomputes heights repeatedly (O(n²)). The trick: compute height **bottom-up** and use a sentinel (-1) to signal "already unbalanced", so the whole check is a single O(n) pass.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 190" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">|height(left) − height(right)| ≤ 1 at every node</text>
  <text x="130" y="40" fill="#22c55e" font-size="12" font-weight="700" text-anchor="middle">balanced ✓</text>
  <line x1="130" y1="58" x2="95" y2="100" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="130" y1="58" x2="165" y2="100" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="95" y1="120" x2="70" y2="160" stroke="currentColor" stroke-opacity="0.3"/>
  <g font-size="12" text-anchor="middle">
    <circle cx="130" cy="52" r="16" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="130" y="57" fill="currentColor">A</text>
    <circle cx="90" cy="112" r="16" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="90" y="117" fill="currentColor">B</text>
    <circle cx="170" cy="112" r="16" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="170" y="117" fill="currentColor">C</text>
    <circle cx="65" cy="168" r="15" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="65" y="173" fill="currentColor">D</text>
  </g>
  <text x="400" y="40" fill="#ef4444" font-size="12" font-weight="700" text-anchor="middle">unbalanced ✗</text>
  <line x1="400" y1="58" x2="400" y2="100" stroke="#ef4444" stroke-opacity="0.5"/>
  <line x1="400" y1="120" x2="400" y2="160" stroke="#ef4444" stroke-opacity="0.5"/>
  <g font-size="12" text-anchor="middle">
    <circle cx="400" cy="52" r="16" fill="#ef4444" fill-opacity="0.14" stroke="#ef4444"/><text x="400" y="57" fill="currentColor">A</text>
    <circle cx="400" cy="112" r="16" fill="#ef4444" fill-opacity="0.14" stroke="#ef4444"/><text x="400" y="117" fill="currentColor">B</text>
    <circle cx="400" cy="168" r="15" fill="#ef4444" fill-opacity="0.14" stroke="#ef4444"/><text x="400" y="173" fill="currentColor">C</text>
  </g>
  <text x="400" y="92" fill="#ef4444" font-size="10">left=2, right=0</text>
</svg>
</div>

### The O(n) approach
A recursive helper returns the **height** of a subtree, or **-1** if it (or anything below) is unbalanced:
1. Empty subtree → height 0.
2. Recurse left and right. If either returns -1, propagate -1.
3. If <code>|leftH − rightH| &gt; 1</code>, return -1 (unbalanced).
4. Otherwise return <code>1 + max(leftH, rightH)</code>.

The tree is balanced iff the root call doesn't return -1.

| Approach | Time | Space |
| --- | --- | --- |
| Bottom-up with sentinel | **O(n)** | O(h) recursion |
| Naive (height per node) | O(n²) | O(h) |

**Dry run (right tree).** A→B→C is a right (or left) chain: at A, left height 0, right height 2 → differ by 2 → return -1 → **unbalanced**.

> **Interview tip:** the key optimisation to articulate is "compute height and check balance **in one pass**, short-circuiting with -1." Recomputing heights top-down is the O(n²) trap interviewers watch for.
`,
    examples: [
      {
        label: "Bottom-up balance check",
        variants: [
          { tech: "python", label: "Python", code: `class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def is_balanced(root):
    def height(node):
        if not node:
            return 0
        lh = height(node.left)
        if lh == -1: return -1
        rh = height(node.right)
        if rh == -1: return -1
        if abs(lh - rh) > 1: return -1
        return 1 + max(lh, rh)
    return height(root) != -1


# --- demo ---
balanced = TreeNode(1, TreeNode(2, TreeNode(4)), TreeNode(3))
skewed = TreeNode(1, TreeNode(2, TreeNode(3)))   # 1->2->3 chain
print(is_balanced(balanced))   # True
print(is_balanced(skewed))     # False` },
          { tech: "javascript", label: "JavaScript", code: `class TreeNode {
  constructor(val, left = null, right = null) {
    this.val = val; this.left = left; this.right = right;
  }
}

function isBalanced(root) {
  function height(node) {
    if (!node) return 0;
    const lh = height(node.left);
    if (lh === -1) return -1;
    const rh = height(node.right);
    if (rh === -1) return -1;
    if (Math.abs(lh - rh) > 1) return -1;
    return 1 + Math.max(lh, rh);
  }
  return height(root) !== -1;
}

// --- demo ---
const balanced = new TreeNode(1, new TreeNode(2, new TreeNode(4)), new TreeNode(3));
const skewed = new TreeNode(1, new TreeNode(2, new TreeNode(3))); // chain
console.log(isBalanced(balanced)); // true
console.log(isBalanced(skewed));   // false` },
          { tech: "java", label: "Java", code: `public class Main {
    static class TreeNode {
        int val; TreeNode left, right;
        TreeNode(int val) { this.val = val; }
        TreeNode(int val, TreeNode left, TreeNode right) {
            this.val = val; this.left = left; this.right = right;
        }
    }

    static boolean isBalanced(TreeNode root) {
        return height(root) != -1;
    }

    static int height(TreeNode node) {
        if (node == null) return 0;
        int lh = height(node.left);
        if (lh == -1) return -1;
        int rh = height(node.right);
        if (rh == -1) return -1;
        if (Math.abs(lh - rh) > 1) return -1;
        return 1 + Math.max(lh, rh);
    }

    public static void main(String[] args) {
        TreeNode balanced = new TreeNode(1,
            new TreeNode(2, new TreeNode(4), null), new TreeNode(3));
        TreeNode skewed = new TreeNode(1,
            new TreeNode(2, new TreeNode(3), null), null);
        System.out.println(isBalanced(balanced)); // true
        System.out.println(isBalanced(skewed));   // false
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

int height(TreeNode* node) {
    if (!node) return 0;
    int lh = height(node->left);
    if (lh == -1) return -1;
    int rh = height(node->right);
    if (rh == -1) return -1;
    if (abs(lh - rh) > 1) return -1;
    return 1 + max(lh, rh);
}

bool isBalanced(TreeNode* root) {
    return height(root) != -1;
}

int main() {
    TreeNode* balanced = new TreeNode(1,
        new TreeNode(2, new TreeNode(4), nullptr), new TreeNode(3));
    TreeNode* skewed = new TreeNode(1,
        new TreeNode(2, new TreeNode(3), nullptr), nullptr);
    cout << boolalpha << isBalanced(balanced) << endl;   // true
    cout << isBalanced(skewed) << endl;                  // false
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you implement a queue using two stacks?",
    answer: `
**Intuition.** A stack is LIFO and a queue is FIFO — opposite orders. Reversing a stack into a *second* stack flips the order, turning the newest-on-top into oldest-on-top. So use an **in** stack for pushes and an **out** stack for pops; move elements across only when <code>out</code> is empty.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 190" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="100" y="22" fill="currentColor" font-size="12" font-weight="700" text-anchor="middle">in (push here)</text>
  <text x="400" y="22" fill="currentColor" font-size="12" font-weight="700" text-anchor="middle">out (pop here)</text>
  <g font-size="13" text-anchor="middle">
    <rect x="60" y="120" width="80" height="30" rx="4" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="100" y="140" fill="currentColor">1</text>
    <rect x="60" y="86" width="80" height="30" rx="4" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="100" y="106" fill="currentColor">2</text>
    <rect x="60" y="52" width="80" height="30" rx="4" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="100" y="72" fill="currentColor">3</text>
  </g>
  <path d="M150,80 Q260,40 350,80" fill="none" stroke="#f59e0b" stroke-width="2.5" marker-end="url(#q2)" stroke-dasharray="260" stroke-dashoffset="260"><animate attributeName="stroke-dashoffset" values="260;0" dur="1.6s" begin="0.4s" fill="freeze"/></path>
  <text x="255" y="46" fill="#f59e0b" font-size="11" text-anchor="middle">pour over → order flips</text>
  <g font-size="13" text-anchor="middle">
    <rect x="360" y="120" width="80" height="30" rx="4" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"><animate attributeName="opacity" values="0;1" dur="0.4s" begin="1.6s" fill="freeze"/></rect><text x="400" y="140" fill="currentColor" opacity="0"><animate attributeName="opacity" values="0;1" dur="0.4s" begin="1.6s" fill="freeze"/>3</text>
    <rect x="360" y="86" width="80" height="30" rx="4" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"><animate attributeName="opacity" values="0;1" dur="0.4s" begin="1.8s" fill="freeze"/></rect><text x="400" y="106" fill="currentColor" opacity="0"><animate attributeName="opacity" values="0;1" dur="0.4s" begin="1.8s" fill="freeze"/>2</text>
    <rect x="360" y="52" width="80" height="30" rx="4" fill="#22c55e" fill-opacity="0.3" stroke="#22c55e"><animate attributeName="opacity" values="0;1" dur="0.4s" begin="2.0s" fill="freeze"/></rect><text x="400" y="72" fill="currentColor" opacity="0"><animate attributeName="opacity" values="0;1" dur="0.4s" begin="2.0s" fill="freeze"/>1</text>
  </g>
  <text x="400" y="174" fill="#22c55e" font-size="11" text-anchor="middle">1 is now on top → dequeue returns 1</text>
  <defs><marker id="q2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#f59e0b"/></marker></defs>
</svg>
</div>

### The operations
- **enqueue(x):** push onto <code>in</code>.
- **dequeue() / peek():** if <code>out</code> is empty, pop everything from <code>in</code> into <code>out</code> (this reverses the order), then pop/peek <code>out</code>.

### Why it's O(1) amortised
Each element is moved from <code>in</code> to <code>out</code> **at most once** over its lifetime. A single dequeue might trigger an O(n) transfer, but spread across all operations the cost per element is constant.

| Operation | Worst case | Amortised |
| --- | --- | --- |
| enqueue | O(1) | O(1) |
| dequeue / peek | O(n) | **O(1)** |

**Dry run.** enqueue 1,2,3 → in=[1,2,3] (3 on top). dequeue → out empty, pour → out=[3,2,1] (1 on top) → pop **1**. dequeue → out non-empty → pop **2**.

> **Interview tip:** the magic word is **amortised O(1)** — explain the "each element moves at most once" argument. The mirror question ("stack from two queues") is harder because making *one* op O(1) forces the other to O(n).
`,
    examples: [
      {
        label: "Queue via in/out stacks",
        variants: [
          { tech: "python", label: "Python", code: `class MyQueue:
    def __init__(self):
        self.in_stack = []
        self.out_stack = []

    def enqueue(self, x):
        self.in_stack.append(x)

    def dequeue(self):
        self._shift()
        return self.out_stack.pop()

    def peek(self):
        self._shift()
        return self.out_stack[-1]

    def _shift(self):
        if not self.out_stack:
            while self.in_stack:
                self.out_stack.append(self.in_stack.pop())


# --- demo ---
q = MyQueue()
q.enqueue(1); q.enqueue(2); q.enqueue(3)
print(q.dequeue())   # 1
print(q.dequeue())   # 2
q.enqueue(4)
print(q.dequeue())   # 3` },
          { tech: "javascript", label: "JavaScript", code: `class MyQueue {
  constructor() { this.inStack = []; this.outStack = []; }

  enqueue(x) { this.inStack.push(x); }

  dequeue() { this._shift(); return this.outStack.pop(); }

  peek() { this._shift(); return this.outStack[this.outStack.length - 1]; }

  _shift() {
    if (this.outStack.length === 0) {
      while (this.inStack.length) this.outStack.push(this.inStack.pop());
    }
  }
}

// --- demo ---
const q = new MyQueue();
q.enqueue(1); q.enqueue(2); q.enqueue(3);
console.log(q.dequeue());   // 1
console.log(q.dequeue());   // 2
q.enqueue(4);
console.log(q.dequeue());   // 3` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        MyQueue q = new MyQueue();
        q.enqueue(1); q.enqueue(2); q.enqueue(3);
        System.out.println(q.dequeue());   // 1
        System.out.println(q.dequeue());   // 2
        q.enqueue(4);
        System.out.println(q.dequeue());   // 3
    }
}

class MyQueue {
    private Deque<Integer> in = new ArrayDeque<>();
    private Deque<Integer> out = new ArrayDeque<>();

    void enqueue(int x) { in.push(x); }

    int dequeue() { shift(); return out.pop(); }

    int peek() { shift(); return out.peek(); }

    private void shift() {
        if (out.isEmpty())
            while (!in.isEmpty()) out.push(in.pop());
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

class MyQueue {
    stack<int> in_, out_;
    void shift() {
        if (out_.empty())
            while (!in_.empty()) { out_.push(in_.top()); in_.pop(); }
    }
public:
    void enqueue(int x) { in_.push(x); }
    int dequeue() { shift(); int v = out_.top(); out_.pop(); return v; }
    int peek() { shift(); return out_.top(); }
};

int main() {
    MyQueue q;
    q.enqueue(1); q.enqueue(2); q.enqueue(3);
    cout << q.dequeue() << endl;   // 1
    cout << q.dequeue() << endl;   // 2
    q.enqueue(4);
    cout << q.dequeue() << endl;   // 3
    return 0;
}` },
        ],
      },
    ],
  },
];

export default augments;
