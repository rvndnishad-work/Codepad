/**
 * DSA augment batch 1 — the 10 highest-traffic fundamentals.
 * See dsa-augments.types.ts for the authoring rules (no "${", no raw backticks
 * inside these template literals; inline code uses <code> tags).
 */
import type { DsaAugment } from "./dsa-augments.types";

const augments: DsaAugment[] = [
  {
    title: "What is Big-O notation?",
    answer: `
**Intuition.** Big-O answers one question: *as the input grows, how fast does the work grow?* It throws away constants and hardware speed and keeps only the dominant term, so you can compare algorithms on a whiteboard instead of a benchmark.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 220" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <line x1="44" y1="20" x2="44" y2="190" stroke="currentColor" stroke-opacity="0.35" stroke-width="1.5"/>
  <line x1="44" y1="190" x2="496" y2="190" stroke="currentColor" stroke-opacity="0.35" stroke-width="1.5"/>
  <text x="40" y="14" fill="currentColor" font-size="11" text-anchor="end" opacity="0.6">ops</text>
  <text x="500" y="205" fill="currentColor" font-size="11" text-anchor="end" opacity="0.6">input n</text>
  <path d="M44,150 L488,150" fill="none" stroke="#22c55e" stroke-width="3" stroke-dasharray="600" stroke-dashoffset="600">
    <animate attributeName="stroke-dashoffset" from="600" to="0" dur="1.6s" fill="freeze"/>
  </path>
  <path d="M44,178 Q170,120 488,96" fill="none" stroke="#3b82f6" stroke-width="3" stroke-dasharray="600" stroke-dashoffset="600">
    <animate attributeName="stroke-dashoffset" from="600" to="0" dur="1.6s" begin="0.3s" fill="freeze"/>
  </path>
  <path d="M44,188 L482,40" fill="none" stroke="#f59e0b" stroke-width="3" stroke-dasharray="600" stroke-dashoffset="600">
    <animate attributeName="stroke-dashoffset" from="600" to="0" dur="1.6s" begin="0.6s" fill="freeze"/>
  </path>
  <path d="M44,188 Q360,186 456,26" fill="none" stroke="#ef4444" stroke-width="3" stroke-dasharray="600" stroke-dashoffset="600">
    <animate attributeName="stroke-dashoffset" from="600" to="0" dur="1.6s" begin="0.9s" fill="freeze"/>
  </path>
  <text x="492" y="150" fill="#22c55e" font-size="12" font-weight="700">O(1)</text>
  <text x="492" y="92" fill="#3b82f6" font-size="12" font-weight="700">O(log n)</text>
  <text x="486" y="36" fill="#f59e0b" font-size="12" font-weight="700">O(n)</text>
  <text x="360" y="24" fill="#ef4444" font-size="12" font-weight="700">O(n²)</text>
</svg>
</div>

**How to read it.** We care about the **worst case** and the **dominant term**. <code>O(2n + 5)</code> is just <code>O(n)</code>; <code>O(n² + n)</code> is <code>O(n²)</code>. Constants vanish because for large enough n the highest-order term dwarfs everything else.

### Common classes, fastest to slowest
| Big-O | Name | Example |
| --- | --- | --- |
| O(1) | constant | array index, hash lookup |
| O(log n) | logarithmic | binary search |
| O(n) | linear | one pass over an array |
| O(n log n) | linearithmic | merge sort, heap sort |
| O(n²) | quadratic | nested loops, bubble sort |
| O(2ⁿ) | exponential | naive recursive subsets |

**Dry run.** At n = 1,000,000: an O(n) pass is ~10⁶ steps; O(n log n) ~2×10⁷; O(n²) ~10¹² — the last one is the difference between *milliseconds* and *hours*.

**Space complexity** is the same idea applied to extra memory. An in-place reversal is O(1) space; copying into a new array is O(n).

> **Interview tip:** always state the complexity of your solution *before* you code, then again after. Mention both time **and** space — forgetting space is the most common omission.
`,
    examples: [
      {
        label: "Constant vs linear vs quadratic",
        variants: [
          {
            tech: "python",
            label: "Python",
            code: `def constant(nums):        # O(1) - one access, size-independent
    return nums[0] if nums else None

def linear(nums, target):  # O(n) - touches each element once
    for x in nums:
        if x == target:
            return True
    return False

def quadratic(nums):       # O(n^2) - every pair
    pairs = []
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            pairs.append((nums[i], nums[j]))
    return pairs


# --- demo ---
print(constant([10, 20, 30]))       # 10
print(linear([10, 20, 30], 20))     # True
print(quadratic([1, 2, 3]))         # [(1, 2), (1, 3), (2, 3)]`,
          },
          {
            tech: "javascript",
            label: "JavaScript",
            code: `function constant(nums) {        // O(1)
  return nums.length ? nums[0] : null;
}

function linear(nums, target) {  // O(n)
  for (const x of nums) if (x === target) return true;
  return false;
}

function quadratic(nums) {       // O(n^2)
  const pairs = [];
  for (let i = 0; i < nums.length; i++)
    for (let j = i + 1; j < nums.length; j++)
      pairs.push([nums[i], nums[j]]);
  return pairs;
}

// --- demo ---
console.log(constant([10, 20, 30]));    // 10
console.log(linear([10, 20, 30], 20));  // true
console.log(quadratic([1, 2, 3]));      // [[1,2],[1,3],[2,3]]`,
          },
          {
            tech: "java",
            label: "Java",
            code: `import java.util.*;

public class Main {
    static int constant(int[] nums) {           // O(1)
        return nums.length > 0 ? nums[0] : -1;
    }

    static boolean linear(int[] nums, int target) { // O(n)
        for (int x : nums) if (x == target) return true;
        return false;
    }

    static int quadratic(int[] nums) {          // O(n^2) - counts pairs
        int count = 0;
        for (int i = 0; i < nums.length; i++)
            for (int j = i + 1; j < nums.length; j++)
                count++;
        return count;
    }

    public static void main(String[] args) {
        int[] nums = {10, 20, 30};
        System.out.println(constant(nums));      // 10
        System.out.println(linear(nums, 20));    // true
        System.out.println(quadratic(nums));     // 3 pairs
    }
}`,
          },
          {
            tech: "cpp",
            label: "C++",
            code: `#include <bits/stdc++.h>
using namespace std;

int constant(vector<int>& nums) {            // O(1)
    return nums.empty() ? -1 : nums[0];
}

bool linear(vector<int>& nums, int target) { // O(n)
    for (int x : nums) if (x == target) return true;
    return false;
}

int quadratic(vector<int>& nums) {           // O(n^2) - counts pairs
    int count = 0;
    for (size_t i = 0; i < nums.size(); i++)
        for (size_t j = i + 1; j < nums.size(); j++)
            count++;
    return count;
}

int main() {
    vector<int> nums = {10, 20, 30};
    cout << constant(nums) << endl;          // 10
    cout << boolalpha << linear(nums, 20) << endl; // true
    cout << quadratic(nums) << endl;         // 3 pairs
    return 0;
}`,
          },
        ],
      },
    ],
  },

  {
    title: "What is the difference between an array and a linked list?",
    answer: `
**Intuition.** Both store a sequence, but they make opposite trade-offs. An **array** is one contiguous block — instant random access, painful inserts. A **linked list** is scattered nodes joined by pointers — cheap inserts, no random access.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 220" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="10" y="28" fill="currentColor" font-size="13" font-weight="700">Array — contiguous, index = address</text>
  <g>
    <rect x="14" y="40" width="56" height="44" rx="6" fill="#3b82f6" fill-opacity="0.18" stroke="#3b82f6" stroke-width="1.5"/>
    <rect x="70" y="40" width="56" height="44" rx="6" fill="#3b82f6" fill-opacity="0.18" stroke="#3b82f6" stroke-width="1.5"/>
    <rect x="126" y="40" width="56" height="44" rx="6" fill="#3b82f6" fill-opacity="0.18" stroke="#3b82f6" stroke-width="1.5"/>
    <rect x="182" y="40" width="56" height="44" rx="6" fill="#3b82f6" fill-opacity="0.18" stroke="#3b82f6" stroke-width="1.5"/>
    <text x="42" y="67" fill="currentColor" font-size="14" text-anchor="middle">10</text>
    <text x="98" y="67" fill="currentColor" font-size="14" text-anchor="middle">20</text>
    <text x="154" y="67" fill="currentColor" font-size="14" text-anchor="middle">30</text>
    <text x="210" y="67" fill="currentColor" font-size="14" text-anchor="middle">40</text>
    <text x="42" y="98" fill="currentColor" font-size="10" text-anchor="middle" opacity="0.6">[0]</text>
    <text x="98" y="98" fill="currentColor" font-size="10" text-anchor="middle" opacity="0.6">[1]</text>
    <text x="154" y="98" fill="currentColor" font-size="10" text-anchor="middle" opacity="0.6">[2]</text>
    <text x="210" y="98" fill="currentColor" font-size="10" text-anchor="middle" opacity="0.6">[3]</text>
    <rect x="14" y="40" width="56" height="44" rx="6" fill="none" stroke="#22c55e" stroke-width="3">
      <animate attributeName="x" values="14;70;126;182;14" dur="3.2s" repeatCount="indefinite"/>
    </rect>
  </g>
  <text x="10" y="132" fill="currentColor" font-size="13" font-weight="700">Linked list — nodes + next pointers</text>
  <g transform="translate(0,144)">
    <rect x="14" y="0" width="74" height="40" rx="6" fill="#8b5cf6" fill-opacity="0.18" stroke="#8b5cf6" stroke-width="1.5"/>
    <rect x="150" y="0" width="74" height="40" rx="6" fill="#8b5cf6" fill-opacity="0.18" stroke="#8b5cf6" stroke-width="1.5"/>
    <rect x="286" y="0" width="74" height="40" rx="6" fill="#8b5cf6" fill-opacity="0.18" stroke="#8b5cf6" stroke-width="1.5"/>
    <text x="51" y="25" fill="currentColor" font-size="14" text-anchor="middle">10</text>
    <text x="187" y="25" fill="currentColor" font-size="14" text-anchor="middle">20</text>
    <text x="323" y="25" fill="currentColor" font-size="14" text-anchor="middle">30</text>
    <line x1="88" y1="20" x2="150" y2="20" stroke="#f59e0b" stroke-width="2" marker-end="url(#ah)"/>
    <line x1="224" y1="20" x2="286" y2="20" stroke="#f59e0b" stroke-width="2" marker-end="url(#ah)"/>
    <text x="392" y="25" fill="currentColor" font-size="12" opacity="0.6">null</text>
    <circle cx="51" cy="20" r="8" fill="#22c55e" fill-opacity="0.5">
      <animate attributeName="cx" values="51;187;323;51" dur="3.2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <defs>
    <marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#f59e0b"/></marker>
  </defs>
</svg>
</div>

The green outline jumps straight to any array slot (O(1)); the linked list must *walk* node by node to reach one (O(n)).

### Side by side
| Operation | Array | Linked list |
| --- | --- | --- |
| Access by index | **O(1)** | O(n) |
| Search (unsorted) | O(n) | O(n) |
| Insert / delete at head | O(n) | **O(1)** |
| Insert / delete in middle | O(n) | O(1)* after you have the node |
| Memory overhead | low (just data) | higher (a pointer per node) |
| Cache locality | **excellent** | poor (scattered nodes) |

*\*O(1) once you already hold a reference to the node; finding it is still O(n).*

**Why cache locality matters.** Arrays sit in one block, so the CPU prefetches neighbours — real-world iteration over an array often crushes a linked list even when both are "O(n)".

> **Interview tip:** if the interviewer stresses *frequent insertions/deletions in the middle* with a held reference, lean linked list. If they stress *random access or tight iteration*, lean array. Mention cache locality — it signals you think beyond the asymptotics.
`,
    examples: [
      {
        label: "Singly linked node + traversal",
        variants: [
          {
            tech: "python",
            label: "Python",
            code: `class Node:
    def __init__(self, val, nxt=None):
        self.val = val
        self.next = nxt

def get(head, index):          # O(n) - must walk
    cur, i = head, 0
    while cur and i < index:
        cur, i = cur.next, i + 1
    return cur.val if cur else None

def push_front(head, val):     # O(1) - just relink
    return Node(val, head)


# --- demo ---
head = Node(10, Node(20, Node(30)))   # 10 -> 20 -> 30
print(get(head, 1))            # 20
head = push_front(head, 5)
print(get(head, 0))            # 5`,
          },
          {
            tech: "javascript",
            label: "JavaScript",
            code: `class Node {
  constructor(val, next = null) { this.val = val; this.next = next; }
}

function get(head, index) {        // O(n) - must walk
  let cur = head, i = 0;
  while (cur && i < index) { cur = cur.next; i++; }
  return cur ? cur.val : null;
}

function pushFront(head, val) {    // O(1) - just relink
  return new Node(val, head);
}

// --- demo ---
let head = new Node(10, new Node(20, new Node(30))); // 10 -> 20 -> 30
console.log(get(head, 1));   // 20
head = pushFront(head, 5);
console.log(get(head, 0));   // 5`,
          },
          {
            tech: "java",
            label: "Java",
            code: `public class Main {
    static class Node {
        int val; Node next;
        Node(int val, Node next) { this.val = val; this.next = next; }
    }

    static int get(Node head, int index) {     // O(n) - must walk
        Node cur = head; int i = 0;
        while (cur != null && i < index) { cur = cur.next; i++; }
        return cur != null ? cur.val : -1;
    }

    static Node pushFront(Node head, int val) { // O(1) - just relink
        return new Node(val, head);
    }

    public static void main(String[] args) {
        Node head = new Node(10, new Node(20, new Node(30, null)));
        System.out.println(get(head, 1));   // 20
        head = pushFront(head, 5);
        System.out.println(get(head, 0));   // 5
    }
}`,
          },
          {
            tech: "cpp",
            label: "C++",
            code: `#include <bits/stdc++.h>
using namespace std;

struct Node {
    int val;
    Node* next;
    Node(int v, Node* n = nullptr) : val(v), next(n) {}
};

int get(Node* head, int index) {     // O(n) - must walk
    Node* cur = head; int i = 0;
    while (cur && i < index) { cur = cur->next; i++; }
    return cur ? cur->val : -1;
}

Node* pushFront(Node* head, int val) { // O(1) - just relink
    return new Node(val, head);
}

int main() {
    Node* head = new Node(10, new Node(20, new Node(30)));
    cout << get(head, 1) << endl;   // 20
    head = pushFront(head, 5);
    cout << get(head, 0) << endl;   // 5
    return 0;
}`,
          },
        ],
      },
    ],
  },

  {
    title: "What is the difference between a stack and a queue?",
    answer: `
**Intuition.** Both are linear collections; they differ only in *which end you take from*. A **stack** is LIFO — last in, first out, like a pile of plates. A **queue** is FIFO — first in, first out, like a line at a counter.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 220" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="120" y="22" fill="currentColor" font-size="13" font-weight="700" text-anchor="middle">Stack (LIFO)</text>
  <rect x="70" y="150" width="100" height="34" rx="5" fill="#3b82f6" fill-opacity="0.18" stroke="#3b82f6"/>
  <rect x="70" y="114" width="100" height="34" rx="5" fill="#3b82f6" fill-opacity="0.18" stroke="#3b82f6"/>
  <rect x="70" y="78" width="100" height="34" rx="5" fill="#3b82f6" fill-opacity="0.18" stroke="#3b82f6"/>
  <text x="120" y="172" fill="currentColor" font-size="13" text-anchor="middle">A</text>
  <text x="120" y="136" fill="currentColor" font-size="13" text-anchor="middle">B</text>
  <text x="120" y="100" fill="currentColor" font-size="13" text-anchor="middle">C</text>
  <rect x="70" y="42" width="100" height="30" rx="5" fill="#22c55e" fill-opacity="0.5" stroke="#22c55e">
    <animate attributeName="y" values="20;42;42;20" dur="3s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0;1;1;0" dur="3s" repeatCount="indefinite"/>
  </rect>
  <text x="200" y="40" fill="#22c55e" font-size="12">push / pop</text>
  <text x="200" y="56" fill="currentColor" font-size="11" opacity="0.6">both at the top</text>

  <text x="390" y="22" fill="currentColor" font-size="13" font-weight="700" text-anchor="middle">Queue (FIFO)</text>
  <rect x="300" y="92" width="50" height="40" rx="5" fill="#8b5cf6" fill-opacity="0.18" stroke="#8b5cf6"/>
  <rect x="356" y="92" width="50" height="40" rx="5" fill="#8b5cf6" fill-opacity="0.18" stroke="#8b5cf6"/>
  <rect x="412" y="92" width="50" height="40" rx="5" fill="#8b5cf6" fill-opacity="0.18" stroke="#8b5cf6"/>
  <text x="325" y="117" fill="currentColor" font-size="13" text-anchor="middle">A</text>
  <text x="381" y="117" fill="currentColor" font-size="13" text-anchor="middle">B</text>
  <text x="437" y="117" fill="currentColor" font-size="13" text-anchor="middle">C</text>
  <text x="300" y="152" fill="#22c55e" font-size="11" text-anchor="middle">dequeue</text>
  <text x="437" y="152" fill="#f59e0b" font-size="11" text-anchor="middle">enqueue</text>
  <circle cx="325" cy="112" r="9" fill="#22c55e" fill-opacity="0.5">
    <animate attributeName="cx" values="325;280" dur="3s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="1;0" dur="3s" repeatCount="indefinite"/>
  </circle>
</svg>
</div>

### Side by side
| | Stack | Queue |
| --- | --- | --- |
| Order | LIFO | FIFO |
| Add | push (top) | enqueue (back) |
| Remove | pop (top) | dequeue (front) |
| Peek | top | front |
| Typical uses | recursion/call stack, undo, DFS, expression parsing | scheduling, buffering, BFS, producer/consumer |

Both support **push / pop / peek in O(1)**. A stack uses one end; a queue uses two (front and back).

**Dry run (stack).** push A, push B, push C → top is C. pop → returns **C**. pop → returns **B**.
**Dry run (queue).** enqueue A, B, C → front is A. dequeue → returns **A**. dequeue → returns **B**.

> **Interview tip:** the giveaway is the traversal — *DFS uses a stack, BFS uses a queue*. Also remember a **deque** (double-ended queue) generalises both and powers sliding-window problems.
`,
    examples: [
      {
        label: "Stack and queue from a dynamic array",
        variants: [
          {
            tech: "python",
            label: "Python",
            code: `from collections import deque

stack = []
stack.append(1); stack.append(2)   # push
print(stack.pop())                 # 2 (LIFO)

queue = deque()
queue.append(1); queue.append(2)   # enqueue
print(queue.popleft())             # 1 (FIFO)`,
          },
          {
            tech: "javascript",
            label: "JavaScript",
            code: `const stack = [];
stack.push(1); stack.push(2);   // push
console.log(stack.pop());       // 2 (LIFO)

// Use a real queue (shift is O(n)); a deque/linked list is O(1).
const queue = [];
queue.push(1); queue.push(2);   // enqueue
console.log(queue.shift());     // 1 (FIFO)`,
          },
          {
            tech: "java",
            label: "Java",
            code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Deque<Integer> stack = new ArrayDeque<>();
        stack.push(1); stack.push(2);     // push
        System.out.println(stack.pop());  // 2 (LIFO)

        Queue<Integer> queue = new ArrayDeque<>();
        queue.offer(1); queue.offer(2);   // enqueue
        System.out.println(queue.poll()); // 1 (FIFO)
    }
}`,
          },
          {
            tech: "cpp",
            label: "C++",
            code: `#include <bits/stdc++.h>
using namespace std;

int main() {
    stack<int> s;
    s.push(1); s.push(2);              // push
    cout << s.top() << endl; s.pop();  // 2 (LIFO)

    queue<int> q;
    q.push(1); q.push(2);              // enqueue
    cout << q.front() << endl; q.pop(); // 1 (FIFO)
    return 0;
}`,
          },
        ],
      },
    ],
  },

  {
    title: "How does a hash table work?",
    answer: `
**Intuition.** A hash table turns a *key* into an *array index* with a hash function, so lookups skip the search entirely — go straight to the slot. That is what gives you average **O(1)** insert and lookup.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 220" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <rect x="14" y="92" width="86" height="38" rx="6" fill="#3b82f6" fill-opacity="0.18" stroke="#3b82f6"/>
  <text x="57" y="116" fill="currentColor" font-size="13" text-anchor="middle">"cat"</text>
  <rect x="150" y="86" width="96" height="50" rx="8" fill="#8b5cf6" fill-opacity="0.18" stroke="#8b5cf6"/>
  <text x="198" y="108" fill="currentColor" font-size="12" text-anchor="middle">hash(key)</text>
  <text x="198" y="124" fill="currentColor" font-size="11" text-anchor="middle" opacity="0.6">% size</text>
  <line x1="100" y1="111" x2="150" y2="111" stroke="#f59e0b" stroke-width="2" marker-end="url(#ah2)"/>
  <line x1="246" y1="111" x2="300" y2="65" stroke="#f59e0b" stroke-width="2" marker-end="url(#ah2)">
    <animate attributeName="stroke-opacity" values="0.2;1;0.2" dur="2s" repeatCount="indefinite"/>
  </line>
  <g>
    <rect x="300" y="32" width="120" height="28" rx="5" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/>
    <rect x="300" y="62" width="120" height="28" rx="5" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="300" y="92" width="120" height="28" rx="5" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="300" y="122" width="120" height="28" rx="5" fill="#ef4444" fill-opacity="0.12" stroke="#ef4444" stroke-opacity="0.6"/>
    <text x="288" y="51" fill="currentColor" font-size="11" text-anchor="end" opacity="0.6">0</text>
    <text x="288" y="81" fill="currentColor" font-size="11" text-anchor="end" opacity="0.6">1</text>
    <text x="288" y="111" fill="currentColor" font-size="11" text-anchor="end" opacity="0.6">2</text>
    <text x="288" y="141" fill="currentColor" font-size="11" text-anchor="end" opacity="0.6">3</text>
    <text x="360" y="51" fill="currentColor" font-size="12" text-anchor="middle">cat</text>
    <text x="360" y="141" fill="currentColor" font-size="11" text-anchor="middle">dog → cow</text>
  </g>
  <text x="300" y="170" fill="#ef4444" font-size="11">slot 3: collision → chained</text>
  <defs>
    <marker id="ah2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#f59e0b"/></marker>
  </defs>
</svg>
</div>

**The three steps:** (1) hash the key to a number, (2) map it into the bucket array with <code>hash % size</code>, (3) store or read the value there.

### Collisions
Two keys can hash to the same bucket. The two standard fixes:
- **Chaining** — each bucket holds a small list (or tree) of entries. Simple, degrades gracefully.
- **Open addressing** — on a clash, probe to the next free slot (linear/quadratic probing). Better cache use, but needs careful deletion.

### Complexity
| Operation | Average | Worst case |
| --- | --- | --- |
| Insert | O(1) | O(n) (all keys collide) |
| Lookup | O(1) | O(n) |
| Delete | O(1) | O(n) |

The worst case appears with a bad hash function or an adversary. To keep buckets short, hash tables track a **load factor** (entries ÷ buckets) and **resize** (rehash everything into a bigger array) when it crosses a threshold like 0.75. Resizing is O(n) but rare, so insert stays **O(1) amortised**.

**Dry run.** Insert "cat" → hash 902 → 902 % 4 = 2 → bucket 2. Insert "dog" → bucket 3. Insert "cow" → also bucket 3 → appended to the chain. Lookup "cow" → bucket 3 → scan the tiny chain → found.

> **Interview tip:** when asked "how is it O(1)?", say *average* and immediately mention collisions, a good hash, load factor, and resizing. That nuance is exactly what they are probing for.
`,
    examples: [
      {
        label: "Frequency count with a hash map",
        variants: [
          {
            tech: "python",
            label: "Python",
            code: `def char_count(s):
    counts = {}                       # dict = hash table
    for c in s:
        counts[c] = counts.get(c, 0) + 1
    return counts

print(char_count("banana"))          # {'b':1,'a':3,'n':2}`,
          },
          {
            tech: "javascript",
            label: "JavaScript",
            code: `function charCount(s) {
  const counts = new Map();           // Map = hash table
  for (const c of s) counts.set(c, (counts.get(c) ?? 0) + 1);
  return counts;
}

console.log(charCount("banana"));     // Map { b:1, a:3, n:2 }`,
          },
          {
            tech: "java",
            label: "Java",
            code: `import java.util.*;

public class Main {
    static Map<Character, Integer> charCount(String s) {
        Map<Character, Integer> counts = new HashMap<>();
        for (char c : s.toCharArray())
            counts.merge(c, 1, Integer::sum);
        return counts;
    }

    public static void main(String[] args) {
        System.out.println(charCount("banana")); // {a=3, b=1, n=2}
    }
}`,
          },
          {
            tech: "cpp",
            label: "C++",
            code: `#include <bits/stdc++.h>
using namespace std;

unordered_map<char,int> charCount(const string& s) {
    unordered_map<char,int> counts;    // hash table
    for (char c : s) counts[c]++;
    return counts;
}

int main() {
    for (auto& [ch, n] : charCount("banana"))
        cout << ch << ":" << n << " ";
    cout << endl;                      // b:1 a:3 n:2 (order varies)
    return 0;
}`,
          },
        ],
      },
    ],
  },

  {
    title: "How does binary search work and what are its requirements?",
    answer: `
**Intuition.** In a **sorted** array you never need to look at most elements. Check the middle: if it is too small the answer is to the right, too big it is to the left. Each step throws away **half** the remaining range — that is O(log n).

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 170" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="10" y="22" fill="currentColor" font-size="12" opacity="0.7">target = 23, sorted array</text>
  <g font-size="13" text-anchor="middle">
    <rect x="14" y="40" width="52" height="40" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="70" y="40" width="52" height="40" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="126" y="40" width="52" height="40" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="182" y="40" width="52" height="40" rx="6" fill="#f59e0b" fill-opacity="0.18" stroke="#f59e0b"/>
    <rect x="238" y="40" width="52" height="40" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="294" y="40" width="52" height="40" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="350" y="40" width="52" height="40" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="40" y="65" fill="currentColor">3</text>
    <text x="96" y="65" fill="currentColor">9</text>
    <text x="152" y="65" fill="currentColor">15</text>
    <text x="208" y="65" fill="currentColor">18</text>
    <text x="264" y="65" fill="currentColor">23</text>
    <text x="320" y="65" fill="currentColor">42</text>
    <text x="376" y="65" fill="currentColor">56</text>
  </g>
  <g font-size="11" fill="#3b82f6" text-anchor="middle">
    <text x="40" y="100">lo</text>
    <text x="376" y="100">hi</text>
  </g>
  <text x="208" y="100" fill="#f59e0b" font-size="11" text-anchor="middle">mid</text>
  <rect x="182" y="36" width="52" height="48" rx="6" fill="none" stroke="#3b82f6" stroke-width="3" opacity="0">
    <animate attributeName="x" values="182;294;238;238" dur="3.2s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0;1;1;1;0" dur="3.2s" repeatCount="indefinite"/>
  </rect>
  <rect x="238" y="40" width="52" height="40" rx="6" fill="none" stroke="#22c55e" stroke-width="3" opacity="0">
    <animate attributeName="opacity" values="0;0;0;1;1" dur="3.2s" repeatCount="indefinite"/>
  </rect>
  <text x="10" y="138" fill="currentColor" font-size="11" opacity="0.7">mid=18 &lt; 23 → discard left half → mid=42 &gt; 23 → discard right → found 23</text>
</svg>
</div>

### The algorithm
1. Set <code>lo = 0</code>, <code>hi = n - 1</code>.
2. While <code>lo &lt;= hi</code>: compute <code>mid = lo + (hi - lo) / 2</code>.
3. If <code>arr[mid] == target</code> return mid; if <code>arr[mid] &lt; target</code> set <code>lo = mid + 1</code>; else <code>hi = mid - 1</code>.
4. Loop ends without a match → return -1.

### Requirements (all three matter)
- **Sorted** data on the search key.
- **Random access** — O(1) indexing (arrays, not linked lists).
- A **consistent comparison** (total order) on elements.

| | Time | Space |
| --- | --- | --- |
| Binary search | O(log n) | O(1) iterative / O(log n) recursive |
| Linear search | O(n) | O(1) |

**The classic bugs.** Use <code>mid = lo + (hi - lo) / 2</code> (not <code>(lo + hi) / 2</code>) to avoid integer overflow, and make sure each branch *shrinks* the range or you get an infinite loop.

> **Interview tip:** binary search is also a *pattern*, not just an array trick — "binary search on the answer" solves min/max-feasibility problems (e.g. Koko eating bananas) whenever the predicate is monotonic.
`,
    examples: [
      {
        label: "Iterative binary search",
        variants: [
          {
            tech: "python",
            label: "Python",
            code: `def binary_search(arr, target):
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        if arr[mid] == target:
            return mid
        if arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1


# --- demo ---
print(binary_search([-1, 0, 3, 5, 9, 12], 9))   # 4
print(binary_search([-1, 0, 3, 5, 9, 12], 2))   # -1`,
          },
          {
            tech: "javascript",
            label: "JavaScript",
            code: `function binarySearch(arr, target) {
  let lo = 0, hi = arr.length - 1;
  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}

// --- demo ---
console.log(binarySearch([-1, 0, 3, 5, 9, 12], 9)); // 4
console.log(binarySearch([-1, 0, 3, 5, 9, 12], 2)); // -1`,
          },
          {
            tech: "java",
            label: "Java",
            code: `public class Main {
    static int binarySearch(int[] arr, int target) {
        int lo = 0, hi = arr.length - 1;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;   // overflow-safe
            if (arr[mid] == target) return mid;
            if (arr[mid] < target) lo = mid + 1;
            else hi = mid - 1;
        }
        return -1;
    }

    public static void main(String[] args) {
        int[] arr = {-1, 0, 3, 5, 9, 12};
        System.out.println(binarySearch(arr, 9));   // 4
        System.out.println(binarySearch(arr, 2));   // -1
    }
}`,
          },
          {
            tech: "cpp",
            label: "C++",
            code: `#include <bits/stdc++.h>
using namespace std;

int binarySearch(vector<int>& arr, int target) {
    int lo = 0, hi = (int)arr.size() - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;   // overflow-safe
        if (arr[mid] == target) return mid;
        if (arr[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}

int main() {
    vector<int> arr = {-1, 0, 3, 5, 9, 12};
    cout << binarySearch(arr, 9) << endl;   // 4
    cout << binarySearch(arr, 2) << endl;   // -1
    return 0;
}`,
          },
        ],
      },
    ],
  },

  {
    title: "What is recursion and what is a base case?",
    answer: `
**Intuition.** Recursion solves a problem by solving a *smaller version of the same problem* and combining the result. The **base case** is the smallest version you can answer directly — it stops the recursion. No base case (or one you never reach) means infinite recursion and a **stack overflow**.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 230" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="20" fill="currentColor" font-size="12" font-weight="700">factorial(4) — call stack grows, then unwinds</text>
  <g font-size="12" text-anchor="middle">
    <rect x="40" y="34" width="180" height="30" rx="5" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"><animate attributeName="fill-opacity" values="0;0.16" dur="0.4s" begin="0s" fill="freeze"/></rect>
    <text x="130" y="54" fill="currentColor">fact(4) = 4 * fact(3)</text>
    <rect x="60" y="70" width="180" height="30" rx="5" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"><animate attributeName="fill-opacity" values="0;0.16" dur="0.4s" begin="0.4s" fill="freeze"/></rect>
    <text x="150" y="90" fill="currentColor">fact(3) = 3 * fact(2)</text>
    <rect x="80" y="106" width="180" height="30" rx="5" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"><animate attributeName="fill-opacity" values="0;0.16" dur="0.4s" begin="0.8s" fill="freeze"/></rect>
    <text x="170" y="126" fill="currentColor">fact(2) = 2 * fact(1)</text>
    <rect x="100" y="142" width="180" height="30" rx="5" fill="#22c55e" fill-opacity="0.22" stroke="#22c55e"><animate attributeName="fill-opacity" values="0;0.22" dur="0.4s" begin="1.2s" fill="freeze"/></rect>
    <text x="190" y="162" fill="currentColor">fact(1) = 1  ← base case</text>
  </g>
  <g font-size="12" fill="#f59e0b">
    <text x="300" y="161" opacity="0"><animate attributeName="opacity" values="0;1" dur="0.3s" begin="1.7s" fill="freeze"/>returns 1</text>
    <text x="300" y="125" opacity="0"><animate attributeName="opacity" values="0;1" dur="0.3s" begin="2.0s" fill="freeze"/>returns 2</text>
    <text x="300" y="89" opacity="0"><animate attributeName="opacity" values="0;1" dur="0.3s" begin="2.3s" fill="freeze"/>returns 6</text>
    <text x="300" y="53" opacity="0"><animate attributeName="opacity" values="0;1" dur="0.3s" begin="2.6s" fill="freeze"/>returns 24</text>
  </g>
  <text x="14" y="206" fill="currentColor" font-size="11" opacity="0.7">Each call waits on the one below; the base case unblocks the whole chain.</text>
</svg>
</div>

### Every correct recursion has two parts
1. **Base case** — a stopping condition with a direct answer (<code>fact(1) = 1</code>).
2. **Recursive case** — reduce toward the base and combine (<code>n * fact(n-1)</code>).

Each call adds a **stack frame** (its locals + return address). The depth of recursion is your **space** cost: <code>fact(n)</code> uses O(n) stack.

| Aspect | Note |
| --- | --- |
| Time | depends on the recurrence (here O(n)) |
| Space | O(depth) for the call stack |
| Risk | deep/unbounded recursion → stack overflow |
| Fixes | iteration, an explicit stack, or **memoization** for overlapping subproblems |

**Dry run.** <code>fact(4)</code> → <code>4*fact(3)</code> → <code>4*3*fact(2)</code> → <code>4*3*2*fact(1)</code> → base returns 1 → unwinds to 2 → 6 → **24**.

> **Interview tip:** state the base case *first*, then the recursive step — and check the argument always moves toward the base. When subproblems repeat (like naive Fibonacci), reach for memoization or convert to DP.
`,
    examples: [
      {
        label: "Factorial — recursive",
        variants: [
          {
            tech: "python",
            label: "Python",
            code: `def factorial(n):
    if n <= 1:          # base case
        return 1
    return n * factorial(n - 1)   # recursive case

print(factorial(4))    # 24`,
          },
          {
            tech: "javascript",
            label: "JavaScript",
            code: `function factorial(n) {
  if (n <= 1) return 1;            // base case
  return n * factorial(n - 1);    // recursive case
}

console.log(factorial(4));   // 24`,
          },
          {
            tech: "java",
            label: "Java",
            code: `public class Main {
    static long factorial(int n) {
        if (n <= 1) return 1;            // base case
        return n * factorial(n - 1);    // recursive case
    }

    public static void main(String[] args) {
        System.out.println(factorial(4));   // 24
    }
}`,
          },
          {
            tech: "cpp",
            label: "C++",
            code: `#include <bits/stdc++.h>
using namespace std;

long long factorial(int n) {
    if (n <= 1) return 1;            // base case
    return (long long)n * factorial(n - 1); // recursive case
}

int main() {
    cout << factorial(4) << endl;   // 24
    return 0;
}`,
          },
        ],
      },
    ],
  },

  {
    title: "What is a binary search tree (BST)?",
    answer: `
**Intuition.** A BST keeps keys *ordered by position*: for every node, everything in its **left** subtree is smaller and everything in its **right** subtree is larger. That invariant lets you search by halving the tree at each step — like binary search, but on a tree.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 220" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="18" fill="currentColor" font-size="12" opacity="0.7">search 7: go left if smaller, right if larger</text>
  <line x1="250" y1="48" x2="160" y2="98" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.5"/>
  <line x1="250" y1="48" x2="350" y2="98" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.5"/>
  <line x1="160" y1="118" x2="100" y2="168" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.5"/>
  <line x1="160" y1="118" x2="220" y2="168" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.5"/>
  <line x1="350" y1="118" x2="410" y2="168" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.5"/>
  <g font-size="14" text-anchor="middle">
    <circle cx="250" cy="40" r="22" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="250" y="45" fill="currentColor">8</text>
    <circle cx="160" cy="110" r="22" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="160" y="115" fill="currentColor">4</text>
    <circle cx="350" cy="110" r="22" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="350" y="115" fill="currentColor">12</text>
    <circle cx="100" cy="180" r="22" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="100" y="185" fill="currentColor">2</text>
    <circle cx="220" cy="180" r="22" fill="#22c55e" fill-opacity="0.22" stroke="#22c55e"/><text x="220" y="185" fill="currentColor">7</text>
    <circle cx="410" cy="180" r="22" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="410" y="185" fill="currentColor">14</text>
  </g>
  <circle cx="250" cy="40" r="26" fill="none" stroke="#f59e0b" stroke-width="3" opacity="0">
    <animate attributeName="opacity" values="0;1;1;0" dur="3s" repeatCount="indefinite" keyTimes="0;0.05;0.3;0.35"/>
  </circle>
  <circle cx="160" cy="110" r="26" fill="none" stroke="#f59e0b" stroke-width="3" opacity="0">
    <animate attributeName="opacity" values="0;0;1;1;0" dur="3s" repeatCount="indefinite" keyTimes="0;0.33;0.4;0.6;0.65"/>
  </circle>
  <circle cx="220" cy="180" r="26" fill="none" stroke="#22c55e" stroke-width="3" opacity="0">
    <animate attributeName="opacity" values="0;0;1;1" dur="3s" repeatCount="indefinite" keyTimes="0;0.66;0.72;1"/>
  </circle>
</svg>
</div>

7 &lt; 8 → go left; 7 &gt; 4 → go right; found 7. Three comparisons instead of scanning six nodes.

### Operations
| Operation | Balanced | Skewed (worst) |
| --- | --- | --- |
| Search | O(log n) | O(n) |
| Insert | O(log n) | O(n) |
| Delete | O(log n) | O(n) |
| In-order traversal | O(n) → sorted output | O(n) |

**The catch — balance.** Insert already-sorted keys (1, 2, 3, 4…) and the BST degenerates into a linked list, so every operation becomes O(n). **Self-balancing** variants fix this:
- **AVL** — strictly balanced, faster lookups.
- **Red-Black** — looser balance, faster inserts/deletes (used by many standard libraries: Java <code>TreeMap</code>, C++ <code>std::map</code>).

A handy property: an **in-order traversal** (left, node, right) visits keys in **sorted order**.

> **Interview tip:** if asked "why not just a hash map?", answer: a BST keeps keys **ordered**, so it supports range queries, successor/predecessor, and min/max in O(log n) — things a hash map cannot do.
`,
    examples: [
      {
        label: "BST insert + search",
        variants: [
          {
            tech: "python",
            label: "Python",
            code: `class TreeNode:
    def __init__(self, val):
        self.val = val
        self.left = self.right = None

def insert(root, val):
    if not root:
        return TreeNode(val)
    if val < root.val:
        root.left = insert(root.left, val)
    else:
        root.right = insert(root.right, val)
    return root

def search(root, val):
    while root:
        if val == root.val: return True
        root = root.left if val < root.val else root.right
    return False


# --- demo ---
root = None
for v in [8, 4, 12, 2, 7, 14]:
    root = insert(root, v)
print(search(root, 7))    # True
print(search(root, 5))    # False`,
          },
          {
            tech: "javascript",
            label: "JavaScript",
            code: `class TreeNode {
  constructor(val) { this.val = val; this.left = this.right = null; }
}

function insert(root, val) {
  if (!root) return new TreeNode(val);
  if (val < root.val) root.left = insert(root.left, val);
  else root.right = insert(root.right, val);
  return root;
}

function search(root, val) {
  while (root) {
    if (val === root.val) return true;
    root = val < root.val ? root.left : root.right;
  }
  return false;
}

// --- demo ---
let root = null;
for (const v of [8, 4, 12, 2, 7, 14]) root = insert(root, v);
console.log(search(root, 7));   // true
console.log(search(root, 5));   // false`,
          },
          {
            tech: "java",
            label: "Java",
            code: `public class Main {
    static class TreeNode {
        int val; TreeNode left, right;
        TreeNode(int val) { this.val = val; }
    }

    static TreeNode insert(TreeNode root, int val) {
        if (root == null) return new TreeNode(val);
        if (val < root.val) root.left = insert(root.left, val);
        else root.right = insert(root.right, val);
        return root;
    }

    static boolean search(TreeNode root, int val) {
        while (root != null) {
            if (val == root.val) return true;
            root = val < root.val ? root.left : root.right;
        }
        return false;
    }

    public static void main(String[] args) {
        TreeNode root = null;
        for (int v : new int[]{8, 4, 12, 2, 7, 14}) root = insert(root, v);
        System.out.println(search(root, 7));   // true
        System.out.println(search(root, 5));   // false
    }
}`,
          },
          {
            tech: "cpp",
            label: "C++",
            code: `#include <bits/stdc++.h>
using namespace std;

struct TreeNode {
    int val;
    TreeNode *left = nullptr, *right = nullptr;
    TreeNode(int v) : val(v) {}
};

TreeNode* insert(TreeNode* root, int val) {
    if (!root) return new TreeNode(val);
    if (val < root->val) root->left = insert(root->left, val);
    else root->right = insert(root->right, val);
    return root;
}

bool search(TreeNode* root, int val) {
    while (root) {
        if (val == root->val) return true;
        root = val < root->val ? root->left : root->right;
    }
    return false;
}

int main() {
    TreeNode* root = nullptr;
    for (int v : {8, 4, 12, 2, 7, 14}) root = insert(root, v);
    cout << boolalpha << search(root, 7) << endl;   // true
    cout << search(root, 5) << endl;                // false
    return 0;
}`,
          },
        ],
      },
    ],
  },

  {
    title: "What are the tree traversal methods?",
    answer: `
**Intuition.** A traversal is just an *order* for visiting every node. The depth-first orders differ only in **when you visit the node** relative to its children; breadth-first visits **level by level**.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 200" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <line x1="250" y1="42" x2="170" y2="100" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.5"/>
  <line x1="250" y1="42" x2="330" y2="100" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.5"/>
  <line x1="170" y1="120" x2="120" y2="170" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.5"/>
  <line x1="170" y1="120" x2="220" y2="170" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.5"/>
  <g font-size="15" text-anchor="middle">
    <circle cx="250" cy="34" r="22" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="250" y="39" fill="currentColor">F</text>
    <circle cx="170" cy="112" r="22" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="170" y="117" fill="currentColor">B</text>
    <circle cx="330" cy="112" r="22" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="330" y="117" fill="currentColor">G</text>
    <circle cx="120" cy="182" r="20" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="120" y="187" fill="currentColor">A</text>
    <circle cx="220" cy="182" r="20" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="220" y="187" fill="currentColor">D</text>
  </g>
  <g font-size="12" fill="#22c55e" font-weight="700">
    <text x="380" y="60">in-order:</text>
    <text x="380" y="80" fill="currentColor">A B D F G</text>
    <text x="380" y="110" fill="#3b82f6">pre-order:</text>
    <text x="380" y="130" fill="currentColor">F B A D G</text>
    <text x="380" y="160" fill="#f59e0b">post-order:</text>
    <text x="380" y="180" fill="currentColor">A D B G F</text>
  </g>
</svg>
</div>

### The four orders
| Traversal | Order | Yields / used for |
| --- | --- | --- |
| **In-order** | left → **node** → right | sorted order in a BST |
| **Pre-order** | **node** → left → right | copy/serialize a tree |
| **Post-order** | left → right → **node** | delete a tree, evaluate expressions |
| **Level-order (BFS)** | level by level | shortest path, by-depth grouping |

The three depth-first orders are naturally **recursive** (or use an explicit **stack**); level-order uses a **queue**.

**Dry run (in-order on the tree above).** Recurse left from F to B, left to A (leaf) → visit **A**, back to **B** → visit **B**, right to **D** → visit **D**, back up → visit **F**, right to **G** → visit **G**. Result: **A B D F G** — sorted, as expected for a BST.

| | Time | Space |
| --- | --- | --- |
| Any traversal | O(n) | O(h) recursion / O(w) queue for BFS |

(h = height, w = max width.)

> **Interview tip:** memorise the position of "node" in the name — **pre/in/post** = node visited first/middle/last. "In-order of a BST is sorted" is one of the most reused facts in tree problems.
`,
    examples: [
      {
        label: "DFS orders + BFS",
        variants: [
          {
            tech: "python",
            label: "Python",
            code: `from collections import deque

class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def inorder(node, out):
    if not node: return
    inorder(node.left, out)
    out.append(node.val)
    inorder(node.right, out)

def level_order(root):
    out, q = [], deque([root] if root else [])
    while q:
        node = q.popleft()
        out.append(node.val)
        if node.left:  q.append(node.left)
        if node.right: q.append(node.right)
    return out


# --- demo ---  tree:    4 / (2 / 1,3) , 6
root = TreeNode(4, TreeNode(2, TreeNode(1), TreeNode(3)), TreeNode(6))
out = []
inorder(root, out)
print(out)                 # [1, 2, 3, 4, 6]
print(level_order(root))   # [4, 2, 6, 1, 3]`,
          },
          {
            tech: "javascript",
            label: "JavaScript",
            code: `class TreeNode {
  constructor(val, left = null, right = null) {
    this.val = val; this.left = left; this.right = right;
  }
}

function inorder(node, out = []) {
  if (!node) return out;
  inorder(node.left, out);
  out.push(node.val);
  inorder(node.right, out);
  return out;
}

function levelOrder(root) {
  const out = [], q = root ? [root] : [];
  for (let i = 0; i < q.length; i++) {
    const node = q[i];
    out.push(node.val);
    if (node.left)  q.push(node.left);
    if (node.right) q.push(node.right);
  }
  return out;
}

// --- demo ---  tree:  4 / (2 / 1,3) , 6
const root = new TreeNode(4, new TreeNode(2, new TreeNode(1), new TreeNode(3)), new TreeNode(6));
console.log(inorder(root));     // [1, 2, 3, 4, 6]
console.log(levelOrder(root));  // [4, 2, 6, 1, 3]`,
          },
          {
            tech: "java",
            label: "Java",
            code: `import java.util.*;

public class Main {
    static class TreeNode {
        int val; TreeNode left, right;
        TreeNode(int val) { this.val = val; }
        TreeNode(int val, TreeNode left, TreeNode right) {
            this.val = val; this.left = left; this.right = right;
        }
    }

    static void inorder(TreeNode node, List<Integer> out) {
        if (node == null) return;
        inorder(node.left, out);
        out.add(node.val);
        inorder(node.right, out);
    }

    static List<Integer> levelOrder(TreeNode root) {
        List<Integer> out = new ArrayList<>();
        Queue<TreeNode> q = new LinkedList<>();
        if (root != null) q.offer(root);
        while (!q.isEmpty()) {
            TreeNode n = q.poll();
            out.add(n.val);
            if (n.left != null)  q.offer(n.left);
            if (n.right != null) q.offer(n.right);
        }
        return out;
    }

    public static void main(String[] args) {
        TreeNode root = new TreeNode(4,
            new TreeNode(2, new TreeNode(1), new TreeNode(3)),
            new TreeNode(6));
        List<Integer> in = new ArrayList<>();
        inorder(root, in);
        System.out.println(in);               // [1, 2, 3, 4, 6]
        System.out.println(levelOrder(root)); // [4, 2, 6, 1, 3]
    }
}`,
          },
          {
            tech: "cpp",
            label: "C++",
            code: `#include <bits/stdc++.h>
using namespace std;

struct TreeNode {
    int val;
    TreeNode *left = nullptr, *right = nullptr;
    TreeNode(int v) : val(v) {}
    TreeNode(int v, TreeNode* l, TreeNode* r) : val(v), left(l), right(r) {}
};

void inorder(TreeNode* node, vector<int>& out) {
    if (!node) return;
    inorder(node->left, out);
    out.push_back(node->val);
    inorder(node->right, out);
}

vector<int> levelOrder(TreeNode* root) {
    vector<int> out;
    queue<TreeNode*> q;
    if (root) q.push(root);
    while (!q.empty()) {
        TreeNode* n = q.front(); q.pop();
        out.push_back(n->val);
        if (n->left)  q.push(n->left);
        if (n->right) q.push(n->right);
    }
    return out;
}

int main() {
    TreeNode* root = new TreeNode(4,
        new TreeNode(2, new TreeNode(1), new TreeNode(3)),
        new TreeNode(6));
    vector<int> in;
    inorder(root, in);
    for (int x : in) cout << x << " ";
    cout << endl;                              // 1 2 3 4 6
    for (int x : levelOrder(root)) cout << x << " ";
    cout << endl;                              // 4 2 6 1 3
    return 0;
}`,
          },
        ],
      },
    ],
  },

  {
    title: "What is the difference between BFS and DFS?",
    answer: `
**Intuition.** Both visit every node of a graph/tree once; they differ in *shape*. **BFS** explores in rings — all neighbours, then their neighbours — using a **queue**. **DFS** plunges down one path to the end, then backtracks — using a **stack** (or recursion).

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 210" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="130" y="18" fill="#3b82f6" font-size="12" font-weight="700" text-anchor="middle">BFS — level by level</text>
  <text x="390" y="18" fill="#f59e0b" font-size="12" font-weight="700" text-anchor="middle">DFS — deep first</text>
  <g font-size="12" text-anchor="middle">
    <line x1="130" y1="44" x2="80" y2="96" stroke="currentColor" stroke-opacity="0.3"/><line x1="130" y1="44" x2="180" y2="96" stroke="currentColor" stroke-opacity="0.3"/>
    <line x1="80" y1="116" x2="55" y2="166" stroke="currentColor" stroke-opacity="0.3"/><line x1="80" y1="116" x2="115" y2="166" stroke="currentColor" stroke-opacity="0.3"/>
    <circle cx="130" cy="38" r="18" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="130" y="43" fill="currentColor">1</text>
    <circle cx="80" cy="108" r="18" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="80" y="113" fill="currentColor">2</text>
    <circle cx="180" cy="108" r="18" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="180" y="113" fill="currentColor">3</text>
    <circle cx="55" cy="178" r="18" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="55" y="183" fill="currentColor">4</text>
    <circle cx="115" cy="178" r="18" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="115" y="183" fill="currentColor">5</text>
  </g>
  <g font-size="12" text-anchor="middle">
    <line x1="390" y1="44" x2="340" y2="96" stroke="currentColor" stroke-opacity="0.3"/><line x1="390" y1="44" x2="440" y2="96" stroke="currentColor" stroke-opacity="0.3"/>
    <line x1="340" y1="116" x2="315" y2="166" stroke="currentColor" stroke-opacity="0.3"/><line x1="340" y1="116" x2="375" y2="166" stroke="currentColor" stroke-opacity="0.3"/>
    <circle cx="390" cy="38" r="18" fill="#f59e0b" fill-opacity="0.16" stroke="#f59e0b"/><text x="390" y="43" fill="currentColor">1</text>
    <circle cx="340" cy="108" r="18" fill="#f59e0b" fill-opacity="0.16" stroke="#f59e0b"/><text x="340" y="113" fill="currentColor">2</text>
    <circle cx="440" cy="108" r="18" fill="#f59e0b" fill-opacity="0.16" stroke="#f59e0b"/><text x="440" y="113" fill="currentColor">5</text>
    <circle cx="315" cy="178" r="18" fill="#f59e0b" fill-opacity="0.16" stroke="#f59e0b"/><text x="315" y="183" fill="currentColor">3</text>
    <circle cx="375" cy="178" r="18" fill="#f59e0b" fill-opacity="0.16" stroke="#f59e0b"/><text x="375" y="183" fill="currentColor">4</text>
  </g>
  <text x="260" y="205" fill="currentColor" font-size="11" text-anchor="middle" opacity="0.7">numbers = visit order</text>
</svg>
</div>

### Side by side
| | BFS | DFS |
| --- | --- | --- |
| Data structure | **queue** (FIFO) | **stack** / recursion |
| Order | by distance from start | one branch to the bottom |
| Shortest path (unweighted) | **yes** | no |
| Memory | O(width) — can be large | O(height/depth) — usually smaller |
| Natural fits | levels, nearest, shortest hops | cycle detection, topological sort, connected components, backtracking |
| Time | O(V + E) | O(V + E) |

Both are **O(V + E)** — every vertex and edge is touched once. The memory difference is what often decides: a wide, shallow graph favours DFS; a deep, narrow one favours BFS.

**One must-remember rule:** on an **unweighted** graph, BFS finds the **shortest path** (fewest edges) because it reaches nodes in increasing distance order. For weighted graphs you need Dijkstra instead.

> **Interview tip:** when a problem says "shortest / fewest / minimum steps" on an unweighted graph, reach for **BFS**. When it says "all paths", "detect a cycle", or "ordering of dependencies", reach for **DFS**.
`,
    examples: [
      {
        label: "BFS and DFS on an adjacency list",
        variants: [
          {
            tech: "python",
            label: "Python",
            code: `from collections import deque

def bfs(graph, start):
    seen, q, order = {start}, deque([start]), []
    while q:
        node = q.popleft()
        order.append(node)
        for nb in graph[node]:
            if nb not in seen:
                seen.add(nb); q.append(nb)
    return order

def dfs(graph, node, seen=None, order=None):
    if seen is None: seen, order = set(), []
    seen.add(node); order.append(node)
    for nb in graph[node]:
        if nb not in seen:
            dfs(graph, nb, seen, order)
    return order


# --- demo ---
graph = {0: [1, 2], 1: [0, 3, 4], 2: [0], 3: [1], 4: [1]}
print(bfs(graph, 0))   # [0, 1, 2, 3, 4]
print(dfs(graph, 0))   # [0, 1, 3, 4, 2]`,
          },
          {
            tech: "javascript",
            label: "JavaScript",
            code: `function bfs(graph, start) {
  const seen = new Set([start]), q = [start], order = [];
  for (let i = 0; i < q.length; i++) {
    const node = q[i];
    order.push(node);
    for (const nb of graph[node])
      if (!seen.has(nb)) { seen.add(nb); q.push(nb); }
  }
  return order;
}

function dfs(graph, node, seen = new Set(), order = []) {
  seen.add(node); order.push(node);
  for (const nb of graph[node])
    if (!seen.has(nb)) dfs(graph, nb, seen, order);
  return order;
}

// --- demo ---
const graph = { 0: [1, 2], 1: [0, 3, 4], 2: [0], 3: [1], 4: [1] };
console.log(bfs(graph, 0));   // [0, 1, 2, 3, 4]
console.log(dfs(graph, 0));   // [0, 1, 3, 4, 2]`,
          },
          {
            tech: "java",
            label: "Java",
            code: `import java.util.*;

public class Main {
    static List<Integer> bfs(Map<Integer,List<Integer>> g, int start) {
        List<Integer> order = new ArrayList<>();
        Set<Integer> seen = new HashSet<>(List.of(start));
        Queue<Integer> q = new LinkedList<>(List.of(start));
        while (!q.isEmpty()) {
            int node = q.poll();
            order.add(node);
            for (int nb : g.getOrDefault(node, List.of()))
                if (seen.add(nb)) q.offer(nb);
        }
        return order;
    }

    static void dfs(Map<Integer,List<Integer>> g, int node,
                    Set<Integer> seen, List<Integer> order) {
        seen.add(node); order.add(node);
        for (int nb : g.getOrDefault(node, List.of()))
            if (!seen.contains(nb)) dfs(g, nb, seen, order);
    }

    public static void main(String[] args) {
        Map<Integer,List<Integer>> g = new HashMap<>();
        g.put(0, List.of(1, 2)); g.put(1, List.of(0, 3, 4));
        g.put(2, List.of(0)); g.put(3, List.of(1)); g.put(4, List.of(1));
        System.out.println(bfs(g, 0));   // [0, 1, 2, 3, 4]
        List<Integer> order = new ArrayList<>();
        dfs(g, 0, new HashSet<>(), order);
        System.out.println(order);       // [0, 1, 3, 4, 2]
    }
}`,
          },
          {
            tech: "cpp",
            label: "C++",
            code: `#include <bits/stdc++.h>
using namespace std;

vector<int> bfs(vector<vector<int>>& g, int start) {
    vector<int> order;
    unordered_set<int> seen{start};
    queue<int> q; q.push(start);
    while (!q.empty()) {
        int node = q.front(); q.pop();
        order.push_back(node);
        for (int nb : g[node])
            if (seen.insert(nb).second) q.push(nb);
    }
    return order;
}

void dfs(vector<vector<int>>& g, int node,
         unordered_set<int>& seen, vector<int>& order) {
    seen.insert(node); order.push_back(node);
    for (int nb : g[node])
        if (!seen.count(nb)) dfs(g, nb, seen, order);
}

int main() {
    vector<vector<int>> g = {{1,2},{0,3,4},{0},{1},{1}};
    for (int x : bfs(g, 0)) cout << x << " ";
    cout << endl;                          // 0 1 2 3 4
    unordered_set<int> seen; vector<int> order;
    dfs(g, 0, seen, order);
    for (int x : order) cout << x << " ";
    cout << endl;                          // 0 1 3 4 2
    return 0;
}`,
          },
        ],
      },
    ],
  },

  {
    title: "Compare common sorting algorithms.",
    answer: `
**Intuition.** Sorting algorithms trade simplicity, speed, memory, and **stability**. The simple O(n²) ones (bubble/insertion/selection) are easy but slow; the O(n log n) ones (merge/quick/heap) are what you actually use at scale.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 180" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="18" fill="currentColor" font-size="12" opacity="0.7">bubble sort: adjacent swaps bring the biggest to the end</text>
  <g>
    <rect x="40" y="90" width="40" height="60" rx="4" fill="#3b82f6" fill-opacity="0.25" stroke="#3b82f6"><animate attributeName="x" values="40;40;100;100" dur="3s" repeatCount="indefinite" keyTimes="0;0.2;0.4;1"/><animate attributeName="height" values="60;60;60;60" dur="3s" repeatCount="indefinite"/></rect>
    <rect x="100" y="50" width="40" height="100" rx="4" fill="#ef4444" fill-opacity="0.25" stroke="#ef4444"><animate attributeName="x" values="100;100;40;40" dur="3s" repeatCount="indefinite" keyTimes="0;0.2;0.4;1"/></rect>
    <rect x="160" y="110" width="40" height="40" rx="4" fill="#3b82f6" fill-opacity="0.25" stroke="#3b82f6"/>
    <rect x="220" y="70" width="40" height="80" rx="4" fill="#3b82f6" fill-opacity="0.25" stroke="#3b82f6"/>
    <rect x="280" y="30" width="40" height="120" rx="4" fill="#22c55e" fill-opacity="0.25" stroke="#22c55e"/>
  </g>
  <text x="160" y="170" fill="currentColor" font-size="11" opacity="0.6">compare neighbours, swap if out of order, repeat</text>
</svg>
</div>

### The cheat sheet
| Algorithm | Best | Average | Worst | Space | Stable? |
| --- | --- | --- | --- | --- | --- |
| Bubble | O(n) | O(n²) | O(n²) | O(1) | yes |
| Insertion | O(n) | O(n²) | O(n²) | O(1) | yes |
| Selection | O(n²) | O(n²) | O(n²) | O(1) | no |
| **Merge** | O(n log n) | O(n log n) | O(n log n) | O(n) | yes |
| **Quick** | O(n log n) | O(n log n) | **O(n²)** | O(log n) | no |
| **Heap** | O(n log n) | O(n log n) | O(n log n) | O(1) | no |

### How to choose
- **Merge sort** — guaranteed O(n log n) and **stable**; needs O(n) extra space. Great for linked lists and external sorting.
- **Quick sort** — fastest in practice (good cache behaviour, in-place), but a bad pivot gives O(n²). Randomised/median-of-three pivots fix that.
- **Heap sort** — O(n log n) worst case with O(1) space, but not stable and cache-unfriendly.
- **Insertion sort** — beats everything on *tiny* or *nearly sorted* inputs, which is why hybrids switch to it for small subarrays.

**Real libraries use hybrids:** Python/Java objects use **Timsort** (merge + insertion, stable); C++ <code>std::sort</code> uses **introsort** (quick → heap on bad pivots → insertion for small chunks).

> **Interview tip:** lead with the three properties they grade on — **time, space, and stability** — then justify your pick from the input shape (size, near-sortedness, memory limits, need for stability).
`,
    examples: [
      {
        label: "Quicksort + mergesort",
        variants: [
          {
            tech: "python",
            label: "Python",
            code: `def quicksort(a):
    if len(a) <= 1: return a
    pivot = a[len(a) // 2]
    less = [x for x in a if x < pivot]
    eq   = [x for x in a if x == pivot]
    more = [x for x in a if x > pivot]
    return quicksort(less) + eq + quicksort(more)

def mergesort(a):
    if len(a) <= 1: return a
    mid = len(a) // 2
    l, r = mergesort(a[:mid]), mergesort(a[mid:])
    out, i, j = [], 0, 0
    while i < len(l) and j < len(r):
        if l[i] <= r[j]: out.append(l[i]); i += 1
        else: out.append(r[j]); j += 1
    return out + l[i:] + r[j:]


# --- demo ---
print(quicksort([5, 2, 8, 1, 9]))   # [1, 2, 5, 8, 9]
print(mergesort([5, 2, 8, 1, 9]))   # [1, 2, 5, 8, 9]`,
          },
          {
            tech: "javascript",
            label: "JavaScript",
            code: `function quicksort(a) {
  if (a.length <= 1) return a;
  const pivot = a[a.length >> 1];
  const less = a.filter((x) => x < pivot);
  const eq   = a.filter((x) => x === pivot);
  const more = a.filter((x) => x > pivot);
  return [...quicksort(less), ...eq, ...quicksort(more)];
}

function mergesort(a) {
  if (a.length <= 1) return a;
  const mid = a.length >> 1;
  const l = mergesort(a.slice(0, mid)), r = mergesort(a.slice(mid));
  const out = []; let i = 0, j = 0;
  while (i < l.length && j < r.length)
    out.push(l[i] <= r[j] ? l[i++] : r[j++]);
  return [...out, ...l.slice(i), ...r.slice(j)];
}

// --- demo ---
console.log(quicksort([5, 2, 8, 1, 9]));   // [1, 2, 5, 8, 9]
console.log(mergesort([5, 2, 8, 1, 9]));   // [1, 2, 5, 8, 9]`,
          },
          {
            tech: "java",
            label: "Java",
            code: `import java.util.*;

public class Main {
    // Library sort is usually the right answer; mergeSort shown for learning.
    static int[] mergeSort(int[] x) {
        if (x.length <= 1) return x;
        int mid = x.length / 2;
        int[] l = mergeSort(Arrays.copyOfRange(x, 0, mid));
        int[] r = mergeSort(Arrays.copyOfRange(x, mid, x.length));
        int[] out = new int[x.length];
        int i = 0, j = 0, k = 0;
        while (i < l.length && j < r.length)
            out[k++] = l[i] <= r[j] ? l[i++] : r[j++];
        while (i < l.length) out[k++] = l[i++];
        while (j < r.length) out[k++] = r[j++];
        return out;
    }

    public static void main(String[] args) {
        int[] a = {5, 2, 8, 1, 9};
        Arrays.sort(a);                          // dual-pivot quicksort
        System.out.println(Arrays.toString(a));  // [1, 2, 5, 8, 9]
        System.out.println(Arrays.toString(mergeSort(new int[]{5, 2, 8, 1, 9})));
    }
}`,
          },
          {
            tech: "cpp",
            label: "C++",
            code: `#include <bits/stdc++.h>
using namespace std;

int main() {
    vector<int> a = {5, 2, 8, 1, 9};
    sort(a.begin(), a.end());         // introsort: quick -> heap -> insertion
    for (int x : a) cout << x << " ";
    cout << endl;                     // 1 2 5 8 9
    return 0;
}`,
          },
        ],
      },
    ],
  },
];

export default augments;
