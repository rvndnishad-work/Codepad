/**
 * DSA augment batch 8 — last 5 linked-list (dsa-3.json) + first 5 trees (dsa-4.json).
 * See dsa-augments.types.ts for the authoring rules (no "${", no raw backticks
 * inside these template literals; inline code uses <code> tags).
 */
import type { DsaAugment } from "./dsa-augments.types";

const augments: DsaAugment[] = [
  {
    title: "How do you remove the nth node from the end of a linked list?",
    answer: `
**Intuition.** You don't know the length, and you want a single pass. Send a **fast** pointer <code>n</code> nodes ahead, then move <code>fast</code> and a **slow** pointer together until <code>fast</code> hits the end — <code>slow</code> now sits just *before* the node to delete. A dummy head makes deleting the first node uniform.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">n=2: fast leads by 2, then both move → slow precedes target</text>
  <g font-size="13" text-anchor="middle">
    <circle cx="60" cy="60" r="18" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="60" y="65" fill="currentColor">1</text>
    <circle cx="150" cy="60" r="18" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="150" y="65" fill="currentColor">2</text>
    <circle cx="240" cy="60" r="18" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="240" y="65" fill="currentColor">3</text>
    <circle cx="330" cy="60" r="18" fill="#ef4444" fill-opacity="0.18" stroke="#ef4444"/><text x="330" y="65" fill="currentColor">4</text>
    <circle cx="420" cy="60" r="18" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="420" y="65" fill="currentColor">5</text>
  </g>
  <line x1="78" y1="60" x2="132" y2="60" stroke="currentColor" stroke-opacity="0.35" marker-end="url(#rn)"/>
  <line x1="168" y1="60" x2="222" y2="60" stroke="currentColor" stroke-opacity="0.35" marker-end="url(#rn)"/>
  <line x1="258" y1="60" x2="312" y2="60" stroke="currentColor" stroke-opacity="0.35" marker-end="url(#rn)"/>
  <line x1="348" y1="60" x2="402" y2="60" stroke="currentColor" stroke-opacity="0.35" marker-end="url(#rn)"/>
  <text x="240" y="100" fill="#22c55e" font-size="11" text-anchor="middle">slow (before target)</text>
  <text x="330" y="118" fill="#ef4444" font-size="11" text-anchor="middle">4 = 2nd from end → remove</text>
  <defs><marker id="rn" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="currentColor" fill-opacity="0.4"/></marker></defs>
</svg>
</div>

### The algorithm
1. <code>dummy → head</code>; <code>slow = fast = dummy</code>.
2. Advance <code>fast</code> by <code>n + 1</code> steps (so slow ends one *before* the target).
3. Move both until <code>fast</code> is null.
4. <code>slow.next = slow.next.next</code> (unlink); return <code>dummy.next</code>.

| | Time | Space |
| --- | --- | --- |
| Two-pointer, one pass | O(L) | **O(1)** |

The dummy head means removing the actual head node (n == length) needs no special case.

**Dry run (n=2, 1→2→3→4→5).** fast leads by 2; when fast reaches the end, slow points at 3 → unlink 4 → **1→2→3→5**.

> **Interview tip:** the gap is <code>n + 1</code> (from the dummy) so slow stops *before* the target — off-by-one here is the classic bug. The dummy node is what makes head-removal uniform.
`,
    examples: [
      {
        label: "Two-pointer gap",
        variants: [
          { tech: "python", label: "Python", code: `class ListNode:
    def __init__(self, val, nxt=None):
        self.val, self.next = val, nxt

def remove_nth_from_end(head, n):
    dummy = ListNode(0, head)
    slow = fast = dummy
    for _ in range(n + 1):
        fast = fast.next
    while fast:
        slow = slow.next
        fast = fast.next
    slow.next = slow.next.next      # unlink target
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

print(to_list(remove_nth_from_end(build([1, 2, 3, 4, 5]), 2)))   # [1, 2, 3, 5]` },
          { tech: "javascript", label: "JavaScript", code: `class ListNode {
  constructor(val, next = null) { this.val = val; this.next = next; }
}

function removeNthFromEnd(head, n) {
  const dummy = new ListNode(0, head);
  let slow = dummy, fast = dummy;
  for (let i = 0; i < n + 1; i++) fast = fast.next;
  while (fast) { slow = slow.next; fast = fast.next; }
  slow.next = slow.next.next;       // unlink target
  return dummy.next;
}

// --- demo ---
const build = (vals) => vals.reduceRight((next, v) => new ListNode(v, next), null);
const toArray = (h) => { const out = []; while (h) { out.push(h.val); h = h.next; } return out; };
console.log(toArray(removeNthFromEnd(build([1, 2, 3, 4, 5]), 2))); // [1, 2, 3, 5]` },
          { tech: "java", label: "Java", code: `public class Main {
    static class ListNode {
        int val; ListNode next;
        ListNode(int val) { this.val = val; }
    }

    static ListNode removeNthFromEnd(ListNode head, int n) {
        ListNode dummy = new ListNode(0);
        dummy.next = head;
        ListNode slow = dummy, fast = dummy;
        for (int i = 0; i < n + 1; i++) fast = fast.next;
        while (fast != null) { slow = slow.next; fast = fast.next; }
        slow.next = slow.next.next;       // unlink target
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
        StringBuilder sb = new StringBuilder();
        for (ListNode n = removeNthFromEnd(build(new int[]{1,2,3,4,5}), 2);
             n != null; n = n.next) sb.append(n.val).append(" ");
        System.out.println(sb.toString().trim());   // 1 2 3 5
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

struct ListNode {
    int val;
    ListNode* next = nullptr;
    ListNode(int v) : val(v) {}
};

ListNode* removeNthFromEnd(ListNode* head, int n) {
    ListNode dummy(0); dummy.next = head;
    ListNode* slow = &dummy; ListNode* fast = &dummy;
    for (int i = 0; i < n + 1; i++) fast = fast->next;
    while (fast) { slow = slow->next; fast = fast->next; }
    slow->next = slow->next->next;     // unlink target
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
    for (ListNode* n = removeNthFromEnd(build({1,2,3,4,5}), 2); n; n = n->next)
        cout << n->val << " ";
    cout << endl;   // 1 2 3 5
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you add two numbers stored as linked lists?",
    answer: `
**Intuition.** The digits are stored least-significant first, which is perfect — you add them the way you do by hand: column by column, left to right, carrying overflow. Build a new list, one node per digit sum, and don't forget a final carry node.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">342 + 465 stored reversed → 2→4→3 + 5→6→4</text>
  <g font-size="13" text-anchor="middle">
    <circle cx="60" cy="44" r="16" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="60" y="49" fill="currentColor">2</text>
    <circle cx="130" cy="44" r="16" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="130" y="49" fill="currentColor">4</text>
    <circle cx="200" cy="44" r="16" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="200" y="49" fill="currentColor">3</text>
    <circle cx="60" cy="86" r="16" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="60" y="91" fill="currentColor">5</text>
    <circle cx="130" cy="86" r="16" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="130" y="91" fill="currentColor">6</text>
    <circle cx="200" cy="86" r="16" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="200" y="91" fill="currentColor">4</text>
  </g>
  <g font-size="13" text-anchor="middle">
    <circle cx="320" cy="65" r="16" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="320" y="70" fill="currentColor">7</text>
    <circle cx="390" cy="65" r="16" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="390" y="70" fill="currentColor">0</text>
    <circle cx="460" cy="65" r="16" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="460" y="70" fill="currentColor">8</text>
  </g>
  <text x="265" y="70" fill="#f59e0b" font-size="16">=</text>
  <text x="390" y="105" fill="#f59e0b" font-size="10" text-anchor="middle">4+6=10 → 0 carry 1</text>
  <text x="320" y="120" fill="currentColor" font-size="11" text-anchor="middle" opacity="0.7">807 = 342 + 465</text>
</svg>
</div>

### The algorithm
1. Dummy head; <code>carry = 0</code>.
2. While either list has nodes or <code>carry &gt; 0</code>: <code>sum = a + b + carry</code>; append node <code>sum % 10</code>; <code>carry = sum / 10</code>; advance both lists.
3. Return <code>dummy.next</code>.

| | Time | Space |
| --- | --- | --- |
| Single pass with carry | O(max(m, n)) | O(max(m, n)) output |

Handling unequal lengths and the trailing carry in the **same loop condition** (<code>l1 or l2 or carry</code>) keeps the code branch-free.

**Dry run.** (2→4→3) + (5→6→4): 2+5=7; 4+6=10 → 0 carry 1; 3+4+1=8 → **7→0→8** (807).

> **Interview tip:** the loop must continue while *either* list remains **or** there's a leftover carry — e.g. 5 + 5 = "0→1". If digits were stored most-significant first instead, you'd reverse the lists or use a stack.
`,
    examples: [
      {
        label: "Digit-by-digit with carry",
        variants: [
          { tech: "python", label: "Python", code: `class ListNode:
    def __init__(self, val, nxt=None):
        self.val, self.next = val, nxt

def add_two_numbers(l1, l2):
    dummy = tail = ListNode(0)
    carry = 0
    while l1 or l2 or carry:
        total = carry
        if l1: total += l1.val; l1 = l1.next
        if l2: total += l2.val; l2 = l2.next
        carry, digit = divmod(total, 10)
        tail.next = ListNode(digit)
        tail = tail.next
    return dummy.next


# --- demo ---  342 + 465 = 807 (digits stored reversed)
def build(vals):
    head = None
    for v in reversed(vals): head = ListNode(v, head)
    return head
def to_list(head):
    out = []
    while head: out.append(head.val); head = head.next
    return out

print(to_list(add_two_numbers(build([2, 4, 3]), build([5, 6, 4]))))   # [7, 0, 8]` },
          { tech: "javascript", label: "JavaScript", code: `class ListNode {
  constructor(val, next = null) { this.val = val; this.next = next; }
}

function addTwoNumbers(l1, l2) {
  const dummy = new ListNode(0);
  let tail = dummy, carry = 0;
  while (l1 || l2 || carry) {
    let total = carry;
    if (l1) { total += l1.val; l1 = l1.next; }
    if (l2) { total += l2.val; l2 = l2.next; }
    carry = Math.floor(total / 10);
    tail.next = new ListNode(total % 10);
    tail = tail.next;
  }
  return dummy.next;
}

// --- demo ---  342 + 465 = 807
const build = (vals) => vals.reduceRight((next, v) => new ListNode(v, next), null);
const toArray = (h) => { const out = []; while (h) { out.push(h.val); h = h.next; } return out; };
console.log(toArray(addTwoNumbers(build([2, 4, 3]), build([5, 6, 4])))); // [7, 0, 8]` },
          { tech: "java", label: "Java", code: `public class Main {
    static class ListNode {
        int val; ListNode next;
        ListNode(int val) { this.val = val; }
    }

    static ListNode addTwoNumbers(ListNode l1, ListNode l2) {
        ListNode dummy = new ListNode(0), tail = dummy;
        int carry = 0;
        while (l1 != null || l2 != null || carry != 0) {
            int total = carry;
            if (l1 != null) { total += l1.val; l1 = l1.next; }
            if (l2 != null) { total += l2.val; l2 = l2.next; }
            carry = total / 10;
            tail.next = new ListNode(total % 10);
            tail = tail.next;
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
        StringBuilder sb = new StringBuilder();
        for (ListNode n = addTwoNumbers(build(new int[]{2,4,3}), build(new int[]{5,6,4}));
             n != null; n = n.next) sb.append(n.val).append(" ");
        System.out.println(sb.toString().trim());   // 7 0 8
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

struct ListNode {
    int val;
    ListNode* next = nullptr;
    ListNode(int v) : val(v) {}
};

ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) {
    ListNode dummy(0);
    ListNode* tail = &dummy;
    int carry = 0;
    while (l1 || l2 || carry) {
        int total = carry;
        if (l1) { total += l1->val; l1 = l1->next; }
        if (l2) { total += l2->val; l2 = l2->next; }
        carry = total / 10;
        tail->next = new ListNode(total % 10);
        tail = tail->next;
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
    for (ListNode* n = addTwoNumbers(build({2,4,3}), build({5,6,4})); n; n = n->next)
        cout << n->val << " ";
    cout << endl;   // 7 0 8
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you find the intersection node of two linked lists?",
    answer: `
**Intuition.** Two lists that intersect share a common tail. The elegant trick: walk pointer <code>a</code> through list A then list B, and pointer <code>b</code> through list B then list A. Both travel <code>lenA + lenB</code> steps total, so they **align at the intersection** (or both reach null together if there's none).

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">switch lists at the end → equal distance → meet at the join</text>
  <g font-size="12" text-anchor="middle">
    <circle cx="50" cy="44" r="15" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="50" y="49" fill="currentColor">a1</text>
    <circle cx="120" cy="44" r="15" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="120" y="49" fill="currentColor">a2</text>
    <circle cx="50" cy="104" r="15" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="50" y="109" fill="currentColor">b1</text>
    <circle cx="120" cy="104" r="15" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="120" y="109" fill="currentColor">b2</text>
    <circle cx="190" cy="104" r="15" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="190" y="109" fill="currentColor">b3</text>
    <circle cx="290" cy="74" r="17" fill="#22c55e" fill-opacity="0.25" stroke="#22c55e"/><text x="290" y="79" fill="currentColor">c1</text>
    <circle cx="370" cy="74" r="15" fill="#22c55e" fill-opacity="0.18" stroke="#22c55e"/><text x="370" y="79" fill="currentColor">c2</text>
  </g>
  <line x1="135" y1="48" x2="275" y2="68" stroke="currentColor" stroke-opacity="0.35" marker-end="url(#in)"/>
  <line x1="205" y1="100" x2="275" y2="80" stroke="currentColor" stroke-opacity="0.35" marker-end="url(#in)"/>
  <text x="290" y="48" fill="#22c55e" font-size="11" text-anchor="middle">intersection</text>
  <defs><marker id="in" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="currentColor" fill-opacity="0.4"/></marker></defs>
</svg>
</div>

### The algorithm
1. <code>a = headA</code>, <code>b = headB</code>.
2. Advance both by one. When <code>a</code> reaches the end, redirect it to <code>headB</code>; when <code>b</code> ends, redirect to <code>headA</code>.
3. They meet at the intersection node, or both become null (no intersection).

| Approach | Time | Space |
| --- | --- | --- |
| **Pointer switch** | O(m + n) | **O(1)** |
| Hash set of A's nodes | O(m + n) | O(m) |
| Length difference align | O(m + n) | O(1) |

After at most one switch each, both pointers have walked exactly <code>m + n</code> nodes, cancelling the length difference so they arrive at the join together.

**Dry run.** Lengths 2 and 3 before a shared tail: pointer a does A(2)+B(3) before the join, pointer b does B(3)+A(2) — same total → they meet at **c1**.

> **Interview tip:** the "redirect to the other head" is the slick O(1)-space answer. The intuition to verbalise: both pointers traverse <code>m + n</code> nodes, which equalises their head start. It also naturally returns null when the lists don't intersect.
`,
    examples: [
      {
        label: "Two-pointer switch",
        variants: [
          { tech: "python", label: "Python", code: `class ListNode:
    def __init__(self, val, nxt=None):
        self.val, self.next = val, nxt

def get_intersection(headA, headB):
    a, b = headA, headB
    while a is not b:
        a = a.next if a else headB
        b = b.next if b else headA
    return a            # node or None


# --- demo ---  both lists share the tail 8->4->5
shared = ListNode(8, ListNode(4, ListNode(5)))
headA = ListNode(4, ListNode(1, shared))            # 4->1->8->4->5
headB = ListNode(5, ListNode(6, ListNode(1, shared)))  # 5->6->1->8->4->5
node = get_intersection(headA, headB)
print(node.val if node else None)   # 8` },
          { tech: "javascript", label: "JavaScript", code: `class ListNode {
  constructor(val, next = null) { this.val = val; this.next = next; }
}

function getIntersectionNode(headA, headB) {
  let a = headA, b = headB;
  while (a !== b) {
    a = a ? a.next : headB;
    b = b ? b.next : headA;
  }
  return a;            // node or null
}

// --- demo ---  both lists share the tail 8->4->5
const shared = new ListNode(8, new ListNode(4, new ListNode(5)));
const headA = new ListNode(4, new ListNode(1, shared));
const headB = new ListNode(5, new ListNode(6, new ListNode(1, shared)));
const node = getIntersectionNode(headA, headB);
console.log(node ? node.val : null); // 8` },
          { tech: "java", label: "Java", code: `public class Main {
    static class ListNode {
        int val; ListNode next;
        ListNode(int val) { this.val = val; }
        ListNode(int val, ListNode next) { this.val = val; this.next = next; }
    }

    static ListNode getIntersectionNode(ListNode headA, ListNode headB) {
        ListNode a = headA, b = headB;
        while (a != b) {
            a = (a != null) ? a.next : headB;
            b = (b != null) ? b.next : headA;
        }
        return a;          // node or null
    }

    public static void main(String[] args) {
        ListNode shared = new ListNode(8, new ListNode(4, new ListNode(5)));
        ListNode headA = new ListNode(4, new ListNode(1, shared));
        ListNode headB = new ListNode(5, new ListNode(6, new ListNode(1, shared)));
        ListNode node = getIntersectionNode(headA, headB);
        System.out.println(node != null ? node.val : "null");   // 8
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

struct ListNode {
    int val;
    ListNode* next;
    ListNode(int v, ListNode* n = nullptr) : val(v), next(n) {}
};

ListNode* getIntersectionNode(ListNode* headA, ListNode* headB) {
    ListNode* a = headA;
    ListNode* b = headB;
    while (a != b) {
        a = a ? a->next : headB;
        b = b ? b->next : headA;
    }
    return a;          // node or nullptr
}

int main() {
    ListNode* shared = new ListNode(8, new ListNode(4, new ListNode(5)));
    ListNode* headA = new ListNode(4, new ListNode(1, shared));
    ListNode* headB = new ListNode(5, new ListNode(6, new ListNode(1, shared)));
    ListNode* node = getIntersectionNode(headA, headB);
    cout << (node ? to_string(node->val) : "null") << endl;   // 8
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you find the node where a linked list cycle begins?",
    answer: `
**Intuition.** Two phases of **Floyd's algorithm**. Phase 1: slow/fast pointers detect the cycle (they meet inside it). Phase 2: reset one pointer to the head and advance both one step at a time — they meet exactly at the **cycle's entrance**, thanks to a neat distance equality.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 160" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">after meeting, walk from head + meeting point → entrance</text>
  <g font-size="12" text-anchor="middle">
    <circle cx="60" cy="80" r="16" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="60" y="85" fill="currentColor">1</text>
    <circle cx="140" cy="80" r="16" fill="#22c55e" fill-opacity="0.25" stroke="#22c55e"/><text x="140" y="85" fill="currentColor">2</text>
    <circle cx="240" cy="40" r="16" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="240" y="45" fill="currentColor">3</text>
    <circle cx="320" cy="80" r="16" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="320" y="85" fill="currentColor">4</text>
    <circle cx="240" cy="120" r="16" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="240" y="125" fill="currentColor">5</text>
  </g>
  <line x1="76" y1="80" x2="124" y2="80" stroke="currentColor" stroke-opacity="0.35" marker-end="url(#cb)"/>
  <line x1="154" y1="74" x2="226" y2="46" stroke="currentColor" stroke-opacity="0.35" marker-end="url(#cb)"/>
  <line x1="254" y1="46" x2="308" y2="72" stroke="currentColor" stroke-opacity="0.35" marker-end="url(#cb)"/>
  <line x1="312" y1="94" x2="254" y2="114" stroke="currentColor" stroke-opacity="0.35" marker-end="url(#cb)"/>
  <line x1="226" y1="114" x2="154" y2="86" stroke="currentColor" stroke-opacity="0.35" marker-end="url(#cb)"/>
  <text x="140" y="118" fill="#22c55e" font-size="11" text-anchor="middle">cycle entrance = node 2</text>
  <defs><marker id="cb" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="currentColor" fill-opacity="0.4"/></marker></defs>
</svg>
</div>

### The two phases
1. **Detect:** advance <code>slow</code> by 1, <code>fast</code> by 2. If <code>fast</code> hits null, no cycle. If they meet, there's a cycle.
2. **Locate:** move <code>slow</code> back to <code>head</code>; advance <code>slow</code> and <code>fast</code> by 1 each. Their meeting point is the cycle's start.

| | Time | Space |
| --- | --- | --- |
| Floyd, two phases | O(n) | **O(1)** |
| Hash set of visited nodes | O(n) | O(n) |

**Why phase 2 works:** if the entrance is <code>F</code> steps from the head and the meeting point is <code>a</code> steps into the cycle, the math gives <code>F = (cycle length) − a</code> — so a pointer from the head and one from the meeting point converge exactly at the entrance.

**Dry run.** List 1→2→3→4→5→(back to 2): slow/fast meet inside the loop; reset slow to head; both step once at a time and meet at **node 2**, the entrance.

> **Interview tip:** this is the natural follow-up to "detect a cycle". Memorise the two-phase structure; the distance proof (<code>F = C − a</code>) is what convinces the interviewer you understand *why* phase 2 lands on the entrance.
`,
    examples: [
      {
        label: "Floyd two-phase",
        variants: [
          { tech: "python", label: "Python", code: `class ListNode:
    def __init__(self, val, nxt=None):
        self.val, self.next = val, nxt

def detect_cycle(head):
    slow = fast = head
    while fast and fast.next:           # phase 1: detect
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            slow = head                 # phase 2: locate
            while slow is not fast:
                slow = slow.next
                fast = fast.next
            return slow
    return None


# --- demo ---  1->2->3->4->5 with tail looping back to node 2
n1, n2, n3, n4, n5 = ListNode(1), ListNode(2), ListNode(3), ListNode(4), ListNode(5)
n1.next, n2.next, n3.next, n4.next, n5.next = n2, n3, n4, n5, n2  # cycle
start = detect_cycle(n1)
print(start.val if start else None)   # 2` },
          { tech: "javascript", label: "JavaScript", code: `class ListNode {
  constructor(val, next = null) { this.val = val; this.next = next; }
}

function detectCycle(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {           // phase 1: detect
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) {
      slow = head;                      // phase 2: locate
      while (slow !== fast) { slow = slow.next; fast = fast.next; }
      return slow;
    }
  }
  return null;
}

// --- demo ---  tail loops back to node 2
const n1=new ListNode(1),n2=new ListNode(2),n3=new ListNode(3),n4=new ListNode(4),n5=new ListNode(5);
n1.next=n2; n2.next=n3; n3.next=n4; n4.next=n5; n5.next=n2; // cycle
const start = detectCycle(n1);
console.log(start ? start.val : null); // 2` },
          { tech: "java", label: "Java", code: `public class Main {
    static class ListNode {
        int val; ListNode next;
        ListNode(int val) { this.val = val; }
    }

    static ListNode detectCycle(ListNode head) {
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) {  // phase 1
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) {
                slow = head;                         // phase 2
                while (slow != fast) { slow = slow.next; fast = fast.next; }
                return slow;
            }
        }
        return null;
    }

    public static void main(String[] args) {
        ListNode n1=new ListNode(1),n2=new ListNode(2),n3=new ListNode(3),
                 n4=new ListNode(4),n5=new ListNode(5);
        n1.next=n2; n2.next=n3; n3.next=n4; n4.next=n5; n5.next=n2; // cycle
        ListNode start = detectCycle(n1);
        System.out.println(start != null ? start.val : "null");   // 2
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

struct ListNode {
    int val;
    ListNode* next = nullptr;
    ListNode(int v) : val(v) {}
};

ListNode* detectCycle(ListNode* head) {
    ListNode* slow = head; ListNode* fast = head;
    while (fast && fast->next) {          // phase 1: detect
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) {
            slow = head;                   // phase 2: locate
            while (slow != fast) { slow = slow->next; fast = fast->next; }
            return slow;
        }
    }
    return nullptr;
}

int main() {
    ListNode* n1=new ListNode(1); ListNode* n2=new ListNode(2);
    ListNode* n3=new ListNode(3); ListNode* n4=new ListNode(4); ListNode* n5=new ListNode(5);
    n1->next=n2; n2->next=n3; n3->next=n4; n4->next=n5; n5->next=n2; // cycle
    ListNode* start = detectCycle(n1);
    cout << (start ? to_string(start->val) : "null") << endl;   // 2
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you check if a linked list is a palindrome?",
    answer: `
**Intuition.** You can't index backwards in a singly linked list, so reverse the *second half* and compare it node-by-node with the first half. Find the middle with slow/fast pointers, reverse from there, then walk the two halves inward. O(n) time, O(1) space.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">1→2→2→1: reverse 2nd half, compare with 1st half</text>
  <g font-size="13" text-anchor="middle">
    <circle cx="80" cy="60" r="18" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="80" y="65" fill="currentColor">1</text>
    <circle cx="180" cy="60" r="18" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6"/><text x="180" y="65" fill="currentColor">2</text>
    <circle cx="320" cy="60" r="18" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="320" y="65" fill="currentColor">2</text>
    <circle cx="420" cy="60" r="18" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="420" y="65" fill="currentColor">1</text>
  </g>
  <line x1="80" y1="92" x2="80" y2="110" stroke="#22c55e"/><line x1="420" y1="92" x2="420" y2="110" stroke="#22c55e"/>
  <path d="M80,110 Q250,140 420,110" fill="none" stroke="#22c55e" stroke-opacity="0.5" stroke-dasharray="4 3"/>
  <text x="250" y="60" fill="currentColor" font-size="20">|</text>
  <text x="250" y="120" fill="#22c55e" font-size="11" text-anchor="middle">ends match inward → palindrome ✓</text>
</svg>
</div>

### The algorithm
1. Find the middle with slow/fast pointers.
2. **Reverse** the second half in place.
3. Compare the first half and the reversed second half node by node.
4. (Optional) restore the list by reversing again.

| Approach | Time | Space |
| --- | --- | --- |
| Reverse second half | O(n) | **O(1)** |
| Copy values to an array | O(n) | O(n) |

The array approach is trivial; the reverse-half method is the one that hits O(1) space — the expected optimisation.

**Dry run (1→2→2→1).** middle after node 2; reverse second half → 1→2 and 1→2; compare 1==1, 2==2 → **palindrome**.

> **Interview tip:** if asked to preserve the input, reverse the second half back after comparing. The O(1)-space requirement is the whole point — the copy-to-array version is a fallback, not the target answer.
`,
    examples: [
      {
        label: "Reverse second half",
        variants: [
          { tech: "python", label: "Python", code: `class ListNode:
    def __init__(self, val, nxt=None):
        self.val, self.next = val, nxt

def is_palindrome(head):
    slow = fast = head                    # find middle
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    prev = None                           # reverse second half
    while slow:
        slow.next, prev, slow = prev, slow, slow.next
    left, right = head, prev              # compare
    while right:
        if left.val != right.val:
            return False
        left, right = left.next, right.next
    return True


# --- demo ---
def build(vals):
    head = None
    for v in reversed(vals): head = ListNode(v, head)
    return head

print(is_palindrome(build([1, 2, 2, 1])))   # True
print(is_palindrome(build([1, 2, 3])))      # False` },
          { tech: "javascript", label: "JavaScript", code: `class ListNode {
  constructor(val, next = null) { this.val = val; this.next = next; }
}

function isPalindrome(head) {
  let slow = head, fast = head;          // find middle
  while (fast && fast.next) { slow = slow.next; fast = fast.next.next; }
  let prev = null;                       // reverse second half
  while (slow) { const n = slow.next; slow.next = prev; prev = slow; slow = n; }
  let left = head, right = prev;         // compare
  while (right) {
    if (left.val !== right.val) return false;
    left = left.next; right = right.next;
  }
  return true;
}

// --- demo ---
const build = (vals) => vals.reduceRight((next, v) => new ListNode(v, next), null);
console.log(isPalindrome(build([1, 2, 2, 1]))); // true
console.log(isPalindrome(build([1, 2, 3])));    // false` },
          { tech: "java", label: "Java", code: `public class Main {
    static class ListNode {
        int val; ListNode next;
        ListNode(int val) { this.val = val; }
    }

    static boolean isPalindrome(ListNode head) {
        ListNode slow = head, fast = head;     // find middle
        while (fast != null && fast.next != null) { slow = slow.next; fast = fast.next.next; }
        ListNode prev = null;                  // reverse second half
        while (slow != null) { ListNode n = slow.next; slow.next = prev; prev = slow; slow = n; }
        ListNode left = head, right = prev;    // compare
        while (right != null) {
            if (left.val != right.val) return false;
            left = left.next; right = right.next;
        }
        return true;
    }

    static ListNode build(int[] vals) {
        ListNode head = null;
        for (int i = vals.length - 1; i >= 0; i--) {
            ListNode nd = new ListNode(vals[i]); nd.next = head; head = nd;
        }
        return head;
    }

    public static void main(String[] args) {
        System.out.println(isPalindrome(build(new int[]{1,2,2,1}))); // true
        System.out.println(isPalindrome(build(new int[]{1,2,3})));   // false
    }
}` },
          { tech: "cpp", label: "C++", code: `#include <bits/stdc++.h>
using namespace std;

struct ListNode {
    int val;
    ListNode* next = nullptr;
    ListNode(int v) : val(v) {}
};

bool isPalindrome(ListNode* head) {
    ListNode* slow = head; ListNode* fast = head;    // find middle
    while (fast && fast->next) { slow = slow->next; fast = fast->next->next; }
    ListNode* prev = nullptr;                        // reverse second half
    while (slow) { ListNode* n = slow->next; slow->next = prev; prev = slow; slow = n; }
    ListNode* left = head; ListNode* right = prev;   // compare
    while (right) {
        if (left->val != right->val) return false;
        left = left->next; right = right->next;
    }
    return true;
}

int main() {
    auto build = [](vector<int> vals) {
        ListNode* h = nullptr;
        for (int i = (int)vals.size() - 1; i >= 0; i--) {
            ListNode* nd = new ListNode(vals[i]); nd->next = h; h = nd;
        }
        return h;
    };
    cout << boolalpha << isPalindrome(build({1,2,2,1})) << endl;   // true
    cout << isPalindrome(build({1,2,3})) << endl;                  // false
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you validate that a binary tree is a BST?",
    answer: `
**Intuition.** It's not enough to check each node against its immediate children — the BST property is global. Every node must fall within a **valid (min, max) range** that tightens as you descend: going left lowers the allowed max, going right raises the allowed min.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 180" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">each node carries a (min, max) window</text>
  <line x1="250" y1="46" x2="160" y2="100" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="250" y1="46" x2="340" y2="100" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="340" y1="120" x2="300" y2="160" stroke="currentColor" stroke-opacity="0.3"/>
  <g font-size="14" text-anchor="middle">
    <circle cx="250" cy="38" r="20" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="250" y="43" fill="currentColor">8</text>
    <circle cx="160" cy="110" r="20" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="160" y="115" fill="currentColor">4</text>
    <circle cx="340" cy="110" r="20" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="340" y="115" fill="currentColor">12</text>
    <circle cx="300" cy="170" r="20" fill="#ef4444" fill-opacity="0.16" stroke="#ef4444"/><text x="300" y="175" fill="currentColor">7</text>
  </g>
  <g font-size="10" fill="currentColor" opacity="0.6" text-anchor="middle">
    <text x="250" y="14">(−∞, +∞)</text>
    <text x="120" y="110">(−∞, 8)</text>
    <text x="395" y="110">(8, +∞)</text>
  </g>
  <text x="300" y="148" fill="#ef4444" font-size="10" text-anchor="middle">7 ∉ (8, 12) → invalid!</text>
</svg>
</div>

### Two clean approaches
| Method | Idea |
| --- | --- |
| **Range bounds** | recurse passing <code>(min, max)</code>; node must satisfy <code>min &lt; val &lt; max</code> |
| **In-order traversal** | an in-order walk of a valid BST is strictly increasing |

| | Time | Space |
| --- | --- | --- |
| Either approach | O(n) | O(h) recursion |

The classic mistake is comparing only <code>node.left.val &lt; node.val &lt; node.right.val</code> — that misses violations deeper down (a small value in the far-right subtree).

**Dry run.** Node 12 has range (8, +∞). Its left child 7 inherits range (8, 12) — but 7 ≤ 8 → **invalid**, even though 7 &lt; 12 locally looks fine.

> **Interview tip:** lead with the (min, max) range method and call out the "local comparison isn't enough" trap. Mention the in-order alternative — "a BST's in-order is sorted" — as an equally valid O(n) check.
`,
    examples: [
      {
        label: "Range-bounds validation",
        variants: [
          { tech: "python", label: "Python", code: `class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def is_valid_bst(root):
    def validate(node, low, high):
        if not node:
            return True
        if not (low < node.val < high):
            return False
        return (validate(node.left, low, node.val) and
                validate(node.right, node.val, high))
    return validate(root, float('-inf'), float('inf'))


# --- demo ---
valid = TreeNode(5, TreeNode(3, TreeNode(1), TreeNode(4)), TreeNode(8, None, TreeNode(9)))
invalid = TreeNode(8, TreeNode(4), TreeNode(12, TreeNode(7), None))   # 7 < 8 deep on the right
print(is_valid_bst(valid))     # True
print(is_valid_bst(invalid))   # False` },
          { tech: "javascript", label: "JavaScript", code: `class TreeNode {
  constructor(val, left = null, right = null) { this.val = val; this.left = left; this.right = right; }
}

function isValidBST(root) {
  function validate(node, low, high) {
    if (!node) return true;
    if (!(low < node.val && node.val < high)) return false;
    return validate(node.left, low, node.val) &&
           validate(node.right, node.val, high);
  }
  return validate(root, -Infinity, Infinity);
}

// --- demo ---
const valid = new TreeNode(5, new TreeNode(3, new TreeNode(1), new TreeNode(4)), new TreeNode(8, null, new TreeNode(9)));
const invalid = new TreeNode(8, new TreeNode(4), new TreeNode(12, new TreeNode(7), null));
console.log(isValidBST(valid));   // true
console.log(isValidBST(invalid)); // false` },
          { tech: "java", label: "Java", code: `public class Main {
    static class TreeNode {
        int val; TreeNode left, right;
        TreeNode(int val) { this.val = val; }
        TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
    }

    static boolean isValidBST(TreeNode root) {
        return validate(root, Long.MIN_VALUE, Long.MAX_VALUE);
    }

    static boolean validate(TreeNode node, long low, long high) {
        if (node == null) return true;
        if (node.val <= low || node.val >= high) return false;
        return validate(node.left, low, node.val) &&
               validate(node.right, node.val, high);
    }

    public static void main(String[] args) {
        TreeNode valid = new TreeNode(5,
            new TreeNode(3, new TreeNode(1), new TreeNode(4)),
            new TreeNode(8, null, new TreeNode(9)));
        TreeNode invalid = new TreeNode(8,
            new TreeNode(4),
            new TreeNode(12, new TreeNode(7), null));
        System.out.println(isValidBST(valid));   // true
        System.out.println(isValidBST(invalid)); // false
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

bool validate(TreeNode* node, long low, long high) {
    if (!node) return true;
    if (node->val <= low || node->val >= high) return false;
    return validate(node->left, low, node->val) &&
           validate(node->right, node->val, high);
}

bool isValidBST(TreeNode* root) {
    return validate(root, LONG_MIN, LONG_MAX);
}

int main() {
    TreeNode* valid = new TreeNode(5,
        new TreeNode(3, new TreeNode(1), new TreeNode(4)),
        new TreeNode(8, nullptr, new TreeNode(9)));
    TreeNode* invalid = new TreeNode(8,
        new TreeNode(4),
        new TreeNode(12, new TreeNode(7), nullptr));
    cout << boolalpha << isValidBST(valid) << endl;   // true
    cout << isValidBST(invalid) << endl;              // false
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you find the maximum depth of a binary tree?",
    answer: `
**Intuition.** The depth of a tree is one more than the depth of its deeper subtree. That's a one-line recursion: <code>depth(node) = 1 + max(depth(left), depth(right))</code>, with an empty subtree counting as 0.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 170" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">depth = longest root-to-leaf path = 3 levels</text>
  <line x1="250" y1="46" x2="170" y2="86" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="250" y1="46" x2="330" y2="86" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="330" y1="106" x2="290" y2="146" stroke="currentColor" stroke-opacity="0.3"/>
  <g font-size="14" text-anchor="middle">
    <circle cx="250" cy="38" r="18" fill="#3b82f6" fill-opacity="0.18" stroke="#3b82f6"/><text x="250" y="43" fill="currentColor">A</text>
    <circle cx="170" cy="96" r="18" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="170" y="101" fill="currentColor">B</text>
    <circle cx="330" cy="96" r="18" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="330" y="101" fill="currentColor">C</text>
    <circle cx="290" cy="156" r="18" fill="#22c55e" fill-opacity="0.22" stroke="#22c55e"/><text x="290" y="161" fill="currentColor">D</text>
  </g>
  <text x="420" y="42" fill="#3b82f6" font-size="11">level 1</text>
  <text x="420" y="100" fill="#8b5cf6" font-size="11">level 2</text>
  <text x="420" y="160" fill="#22c55e" font-size="11">level 3 → depth 3</text>
</svg>
</div>

### Two ways
| Method | How |
| --- | --- |
| **Recursive DFS** | <code>1 + max(left, right)</code> |
| **Iterative BFS** | count levels with a queue |

| | Time | Space |
| --- | --- | --- |
| DFS | O(n) | O(h) recursion |
| BFS | O(n) | O(w) queue |

**Dry run.** A → max(depth(B)=1, depth(C)=2) + 1. C has child D → depth(C) = 2. So depth(A) = 1 + 2 = **3**.

This is the simplest of the tree recursions and the template for many others (diameter, balance, etc., all piggyback on a height computation).

> **Interview tip:** this is usually a warm-up. Be ready to extend it — *minimum* depth (careful: a node with one child isn't a leaf), or convert to the BFS level-count version if asked for an iterative solution.
`,
    examples: [
      {
        label: "Recursive height",
        variants: [
          { tech: "python", label: "Python", code: `class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def max_depth(root):
    if not root:
        return 0
    return 1 + max(max_depth(root.left), max_depth(root.right))


# --- demo ---  tree of depth 3
root = TreeNode(3, TreeNode(9), TreeNode(20, TreeNode(15), TreeNode(7)))
print(max_depth(root))   # 3` },
          { tech: "javascript", label: "JavaScript", code: `class TreeNode {
  constructor(val, left = null, right = null) { this.val = val; this.left = left; this.right = right; }
}

function maxDepth(root) {
  if (!root) return 0;
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}

// --- demo ---  tree of depth 3
const root = new TreeNode(3, new TreeNode(9), new TreeNode(20, new TreeNode(15), new TreeNode(7)));
console.log(maxDepth(root)); // 3` },
          { tech: "java", label: "Java", code: `public class Main {
    static class TreeNode {
        int val; TreeNode left, right;
        TreeNode(int val) { this.val = val; }
        TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
    }

    static int maxDepth(TreeNode root) {
        if (root == null) return 0;
        return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
    }

    public static void main(String[] args) {
        TreeNode root = new TreeNode(3,
            new TreeNode(9),
            new TreeNode(20, new TreeNode(15), new TreeNode(7)));
        System.out.println(maxDepth(root));   // 3
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

int maxDepth(TreeNode* root) {
    if (!root) return 0;
    return 1 + max(maxDepth(root->left), maxDepth(root->right));
}

int main() {
    TreeNode* root = new TreeNode(3,
        new TreeNode(9),
        new TreeNode(20, new TreeNode(15), new TreeNode(7)));
    cout << maxDepth(root) << endl;   // 3
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you compute the diameter of a binary tree?",
    answer: `
**Intuition.** The diameter is the longest path between any two nodes (counted in edges). At any node, the longest path *through* it is <code>leftHeight + rightHeight</code>. So compute heights bottom-up and, at every node, update a global best with that sum — one pass, O(n).

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 180" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">longest path through a node = leftHeight + rightHeight</text>
  <line x1="250" y1="46" x2="160" y2="96" stroke="#22c55e" stroke-width="2.5"/>
  <line x1="250" y1="46" x2="340" y2="96" stroke="#22c55e" stroke-width="2.5"/>
  <line x1="160" y1="116" x2="110" y2="160" stroke="#22c55e" stroke-width="2.5"/>
  <line x1="340" y1="116" x2="390" y2="160" stroke="#22c55e" stroke-width="2.5"/>
  <g font-size="14" text-anchor="middle">
    <circle cx="250" cy="38" r="18" fill="#f59e0b" fill-opacity="0.2" stroke="#f59e0b"/><text x="250" y="43" fill="currentColor">A</text>
    <circle cx="160" cy="106" r="18" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="160" y="111" fill="currentColor">B</text>
    <circle cx="340" cy="106" r="18" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="340" y="111" fill="currentColor">C</text>
    <circle cx="110" cy="170" r="16" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="110" y="175" fill="currentColor">D</text>
    <circle cx="390" cy="170" r="16" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="390" y="175" fill="currentColor">E</text>
  </g>
  <text x="250" y="150" fill="#22c55e" font-size="11" text-anchor="middle">path D–B–A–C–E = 4 edges (the diameter)</text>
</svg>
</div>

### The algorithm
1. A helper returns the **height** of a subtree.
2. At each node, <code>diameter = max(diameter, leftHeight + rightHeight)</code> (a global/outer variable).
3. The node returns <code>1 + max(leftHeight, rightHeight)</code> to its parent.

| | Time | Space |
| --- | --- | --- |
| Height + global max (one pass) | O(n) | O(h) recursion |

Crucially, the path need **not** pass through the root — that's why you check the sum at *every* node, not just the root.

**Dry run.** At A, leftHeight (via B–D) = 2, rightHeight (via C–E) = 2 → through-path = 4 edges. No node beats it → diameter **4**.

> **Interview tip:** the elegance is computing height and updating the diameter in the **same recursion** (O(n)); computing height separately per node is the O(n²) trap. Stress that the longest path may not include the root.
`,
    examples: [
      {
        label: "Height + global best",
        variants: [
          { tech: "python", label: "Python", code: `class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def diameter_of_binary_tree(root):
    best = 0
    def height(node):
        nonlocal best
        if not node:
            return 0
        lh = height(node.left)
        rh = height(node.right)
        best = max(best, lh + rh)        # path through this node
        return 1 + max(lh, rh)
    height(root)
    return best


# --- demo ---  longest path 4->2->1->3->5 = 4 edges
root = TreeNode(1, TreeNode(2, TreeNode(4), None), TreeNode(3, None, TreeNode(5)))
print(diameter_of_binary_tree(root))   # 4` },
          { tech: "javascript", label: "JavaScript", code: `class TreeNode {
  constructor(val, left = null, right = null) { this.val = val; this.left = left; this.right = right; }
}

function diameterOfBinaryTree(root) {
  let best = 0;
  function height(node) {
    if (!node) return 0;
    const lh = height(node.left), rh = height(node.right);
    best = Math.max(best, lh + rh);      // path through this node
    return 1 + Math.max(lh, rh);
  }
  height(root);
  return best;
}

// --- demo ---  longest path 4->2->1->3->5 = 4 edges
const root = new TreeNode(1, new TreeNode(2, new TreeNode(4), null), new TreeNode(3, null, new TreeNode(5)));
console.log(diameterOfBinaryTree(root)); // 4` },
          { tech: "java", label: "Java", code: `public class Main {
    static class TreeNode {
        int val; TreeNode left, right;
        TreeNode(int val) { this.val = val; }
        TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
    }

    static int best = 0;

    static int diameterOfBinaryTree(TreeNode root) {
        best = 0;
        height(root);
        return best;
    }

    static int height(TreeNode node) {
        if (node == null) return 0;
        int lh = height(node.left), rh = height(node.right);
        best = Math.max(best, lh + rh);      // path through this node
        return 1 + Math.max(lh, rh);
    }

    public static void main(String[] args) {
        TreeNode root = new TreeNode(1,
            new TreeNode(2, new TreeNode(4), null),
            new TreeNode(3, null, new TreeNode(5)));
        System.out.println(diameterOfBinaryTree(root));   // 4
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

int best = 0;

int height(TreeNode* node) {
    if (!node) return 0;
    int lh = height(node->left), rh = height(node->right);
    best = max(best, lh + rh);           // path through this node
    return 1 + max(lh, rh);
}

int diameterOfBinaryTree(TreeNode* root) {
    best = 0;
    height(root);
    return best;
}

int main() {
    TreeNode* root = new TreeNode(1,
        new TreeNode(2, new TreeNode(4), nullptr),
        new TreeNode(3, nullptr, new TreeNode(5)));
    cout << diameterOfBinaryTree(root) << endl;   // 4
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you check if a binary tree is symmetric?",
    answer: `
**Intuition.** A tree is symmetric if its left and right subtrees are **mirror images**. Two trees mirror each other when their roots are equal and, crucially, the *outer* children match and the *inner* children match: <code>left.left ↔ right.right</code> and <code>left.right ↔ right.left</code>.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 170" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">mirror: compare left.left↔right.right, left.right↔right.left</text>
  <line x1="250" y1="46" x2="170" y2="96" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="250" y1="46" x2="330" y2="96" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="170" y1="116" x2="120" y2="156" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="170" y1="116" x2="220" y2="156" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="330" y1="116" x2="280" y2="156" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="330" y1="116" x2="380" y2="156" stroke="currentColor" stroke-opacity="0.3"/>
  <g font-size="14" text-anchor="middle">
    <circle cx="250" cy="38" r="18" fill="#3b82f6" fill-opacity="0.18" stroke="#3b82f6"/><text x="250" y="43" fill="currentColor">1</text>
    <circle cx="170" cy="106" r="18" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="170" y="111" fill="currentColor">2</text>
    <circle cx="330" cy="106" r="18" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="330" y="111" fill="currentColor">2</text>
    <circle cx="120" cy="166" r="15" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="120" y="171" fill="currentColor">3</text>
    <circle cx="220" cy="166" r="15" fill="#f59e0b" fill-opacity="0.2" stroke="#f59e0b"/><text x="220" y="171" fill="currentColor">4</text>
    <circle cx="280" cy="166" r="15" fill="#f59e0b" fill-opacity="0.2" stroke="#f59e0b"/><text x="280" y="171" fill="currentColor">4</text>
    <circle cx="380" cy="166" r="15" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="380" y="171" fill="currentColor">3</text>
  </g>
  <path d="M135,160 Q250,200 365,160" fill="none" stroke="#22c55e" stroke-opacity="0.4" stroke-dasharray="4 3"/>
</svg>
</div>

### The algorithm
A helper <code>mirror(a, b)</code>:
1. Both null → true; one null → false.
2. <code>a.val != b.val</code> → false.
3. Recurse <code>mirror(a.left, b.right)</code> **and** <code>mirror(a.right, b.left)</code>.

Call <code>mirror(root.left, root.right)</code>.

| | Time | Space |
| --- | --- | --- |
| Recursive mirror | O(n) | O(h) recursion |
| Iterative (queue of pairs) | O(n) | O(n) |

The cross-pairing (left's left vs right's right) is the whole trick — comparing same-side children would test for *identical* subtrees, not *mirrored* ones.

**Dry run.** Root 1; mirror(2,2): values equal; mirror(3,3) and mirror(4,4) both true → whole tree **symmetric**.

> **Interview tip:** the crux is the **cross comparison** — outer-with-outer, inner-with-inner. Mention you can do it iteratively by pushing node pairs onto a queue, which avoids recursion depth limits on skewed trees.
`,
    examples: [
      {
        label: "Recursive mirror check",
        variants: [
          { tech: "python", label: "Python", code: `class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def is_symmetric(root):
    def mirror(a, b):
        if not a and not b:
            return True
        if not a or not b or a.val != b.val:
            return False
        return mirror(a.left, b.right) and mirror(a.right, b.left)
    return mirror(root.left, root.right) if root else True


# --- demo ---
sym = TreeNode(1, TreeNode(2, TreeNode(3), TreeNode(4)), TreeNode(2, TreeNode(4), TreeNode(3)))
asym = TreeNode(1, TreeNode(2, None, TreeNode(3)), TreeNode(2, None, TreeNode(3)))
print(is_symmetric(sym))    # True
print(is_symmetric(asym))   # False` },
          { tech: "javascript", label: "JavaScript", code: `class TreeNode {
  constructor(val, left = null, right = null) { this.val = val; this.left = left; this.right = right; }
}

function isSymmetric(root) {
  function mirror(a, b) {
    if (!a && !b) return true;
    if (!a || !b || a.val !== b.val) return false;
    return mirror(a.left, b.right) && mirror(a.right, b.left);
  }
  return root ? mirror(root.left, root.right) : true;
}

// --- demo ---
const sym = new TreeNode(1, new TreeNode(2, new TreeNode(3), new TreeNode(4)), new TreeNode(2, new TreeNode(4), new TreeNode(3)));
const asym = new TreeNode(1, new TreeNode(2, null, new TreeNode(3)), new TreeNode(2, null, new TreeNode(3)));
console.log(isSymmetric(sym));  // true
console.log(isSymmetric(asym)); // false` },
          { tech: "java", label: "Java", code: `public class Main {
    static class TreeNode {
        int val; TreeNode left, right;
        TreeNode(int val) { this.val = val; }
        TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
    }

    static boolean isSymmetric(TreeNode root) {
        return root == null || mirror(root.left, root.right);
    }

    static boolean mirror(TreeNode a, TreeNode b) {
        if (a == null && b == null) return true;
        if (a == null || b == null || a.val != b.val) return false;
        return mirror(a.left, b.right) && mirror(a.right, b.left);
    }

    public static void main(String[] args) {
        TreeNode sym = new TreeNode(1,
            new TreeNode(2, new TreeNode(3), new TreeNode(4)),
            new TreeNode(2, new TreeNode(4), new TreeNode(3)));
        TreeNode asym = new TreeNode(1,
            new TreeNode(2, null, new TreeNode(3)),
            new TreeNode(2, null, new TreeNode(3)));
        System.out.println(isSymmetric(sym));  // true
        System.out.println(isSymmetric(asym)); // false
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

bool mirror(TreeNode* a, TreeNode* b) {
    if (!a && !b) return true;
    if (!a || !b || a->val != b->val) return false;
    return mirror(a->left, b->right) && mirror(a->right, b->left);
}

bool isSymmetric(TreeNode* root) {
    return !root || mirror(root->left, root->right);
}

int main() {
    TreeNode* sym = new TreeNode(1,
        new TreeNode(2, new TreeNode(3), new TreeNode(4)),
        new TreeNode(2, new TreeNode(4), new TreeNode(3)));
    TreeNode* asym = new TreeNode(1,
        new TreeNode(2, nullptr, new TreeNode(3)),
        new TreeNode(2, nullptr, new TreeNode(3)));
    cout << boolalpha << isSymmetric(sym) << endl;   // true
    cout << isSymmetric(asym) << endl;               // false
    return 0;
}` },
        ],
      },
    ],
  },

  {
    title: "How do you serialize and deserialize a binary tree?",
    answer: `
**Intuition.** Turn the tree into a string and back without losing structure. A **preorder traversal** that emits a sentinel (like <code>#</code>) for every null child fully captures the shape — because nulls mark exactly where subtrees end. Deserialization replays that preorder, consuming tokens in the same order.

<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 170" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="16" fill="currentColor" font-size="12" opacity="0.7">preorder with null markers fully encodes the shape</text>
  <line x1="120" y1="46" x2="80" y2="92" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="120" y1="46" x2="160" y2="92" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="160" y1="112" x2="130" y2="150" stroke="currentColor" stroke-opacity="0.3"/>
  <line x1="160" y1="112" x2="190" y2="150" stroke="currentColor" stroke-opacity="0.3"/>
  <g font-size="13" text-anchor="middle">
    <circle cx="120" cy="38" r="17" fill="#3b82f6" fill-opacity="0.18" stroke="#3b82f6"/><text x="120" y="43" fill="currentColor">1</text>
    <circle cx="80" cy="102" r="16" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="80" y="107" fill="currentColor">2</text>
    <circle cx="160" cy="102" r="16" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6"/><text x="160" y="107" fill="currentColor">3</text>
    <circle cx="130" cy="158" r="14" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="130" y="163" fill="currentColor">4</text>
    <circle cx="190" cy="158" r="14" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="190" y="163" fill="currentColor">5</text>
  </g>
  <text x="300" y="70" fill="currentColor" font-size="11" text-anchor="start" opacity="0.7">serialized (preorder):</text>
  <text x="300" y="92" fill="#22c55e" font-size="12" text-anchor="start" font-family="ui-monospace,monospace">1,2,#,#,3,4,#,#,5,#,#</text>
  <text x="300" y="116" fill="currentColor" font-size="10" text-anchor="start" opacity="0.6"># = null child marker</text>
</svg>
</div>

### The algorithm
**Serialize (preorder):** emit the node value, then recurse left and right; emit <code>#</code> for null.
**Deserialize:** read tokens in order; <code>#</code> → null, otherwise create a node and recursively build its left then right from the remaining stream.

| | Time | Space |
| --- | --- | --- |
| Serialize / deserialize | O(n) | O(n) |

Preorder works because the first token is always the next subtree's root, and the null markers tell you precisely when a branch terminates — so the reconstruction is unambiguous. (Level-order/BFS encoding is an equally valid alternative.)

**Dry run.** The tree above serializes to <code>1,2,#,#,3,4,#,#,5,#,#</code>; deserialization consumes 1 (root), 2 (left, two nulls), 3, 4, 5 — rebuilding the identical tree.

> **Interview tip:** preorder + null markers is the cleanest scheme; make the deserializer consume from a shared index/iterator so left is fully built before right. Note that inorder alone is **not** enough to reconstruct a tree (it's ambiguous) — you need preorder/postorder or the null markers.
`,
    examples: [
      {
        label: "Preorder serialize/deserialize",
        variants: [
          { tech: "python", label: "Python", code: `class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def serialize(root):
    out = []
    def dfs(node):
        if not node:
            out.append('#')
            return
        out.append(str(node.val))
        dfs(node.left)
        dfs(node.right)
    dfs(root)
    return ','.join(out)

def deserialize(data):
    tokens = iter(data.split(','))
    def build():
        val = next(tokens)
        if val == '#':
            return None
        node = TreeNode(int(val))
        node.left = build()
        node.right = build()
        return node
    return build()


# --- demo ---
root = TreeNode(1, TreeNode(2), TreeNode(3, TreeNode(4), TreeNode(5)))
data = serialize(root)
print(data)                          # 1,2,#,#,3,4,#,#,5,#,#
print(serialize(deserialize(data)))  # same string -> round-trip ok` },
          { tech: "javascript", label: "JavaScript", code: `class TreeNode {
  constructor(val, left = null, right = null) { this.val = val; this.left = left; this.right = right; }
}

function serialize(root) {
  const out = [];
  (function dfs(node) {
    if (!node) { out.push('#'); return; }
    out.push(node.val);
    dfs(node.left);
    dfs(node.right);
  })(root);
  return out.join(',');
}

function deserialize(data) {
  const tokens = data.split(',');
  let i = 0;
  function build() {
    const val = tokens[i++];
    if (val === '#') return null;
    const node = new TreeNode(Number(val));
    node.left = build();
    node.right = build();
    return node;
  }
  return build();
}

// --- demo ---
const root = new TreeNode(1, new TreeNode(2), new TreeNode(3, new TreeNode(4), new TreeNode(5)));
const data = serialize(root);
console.log(data);                       // 1,2,#,#,3,4,#,#,5,#,#
console.log(serialize(deserialize(data))); // same string -> round-trip ok` },
          { tech: "java", label: "Java", code: `import java.util.*;

public class Main {
    static class TreeNode {
        int val; TreeNode left, right;
        TreeNode(int val) { this.val = val; }
        TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
    }

    static String serialize(TreeNode root) {
        StringBuilder sb = new StringBuilder();
        dfs(root, sb);
        return sb.toString();
    }
    static void dfs(TreeNode node, StringBuilder sb) {
        if (node == null) { sb.append("#,"); return; }
        sb.append(node.val).append(",");
        dfs(node.left, sb);
        dfs(node.right, sb);
    }

    static TreeNode deserialize(String data) {
        Deque<String> tokens = new ArrayDeque<>(Arrays.asList(data.split(",")));
        return build(tokens);
    }
    static TreeNode build(Deque<String> tokens) {
        String val = tokens.poll();
        if (val.equals("#")) return null;
        TreeNode node = new TreeNode(Integer.parseInt(val));
        node.left = build(tokens);
        node.right = build(tokens);
        return node;
    }

    public static void main(String[] args) {
        TreeNode root = new TreeNode(1,
            new TreeNode(2),
            new TreeNode(3, new TreeNode(4), new TreeNode(5)));
        String data = serialize(root);
        System.out.println(data);                       // 1,2,#,#,3,4,#,#,5,#,#,
        System.out.println(serialize(deserialize(data))); // same string -> round-trip ok
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

void dfs(TreeNode* node, string& out) {
    if (!node) { out += "#,"; return; }
    out += to_string(node->val) + ",";
    dfs(node->left, out);
    dfs(node->right, out);
}
string serialize(TreeNode* root) {
    string out; dfs(root, out); return out;
}

TreeNode* build(istringstream& ss) {
    string val;
    getline(ss, val, ',');
    if (val == "#") return nullptr;
    TreeNode* node = new TreeNode(stoi(val));
    node->left = build(ss);
    node->right = build(ss);
    return node;
}
TreeNode* deserialize(string data) {
    istringstream ss(data);
    return build(ss);
}

int main() {
    TreeNode* root = new TreeNode(1,
        new TreeNode(2),
        new TreeNode(3, new TreeNode(4), new TreeNode(5)));
    string data = serialize(root);
    cout << data << endl;                       // 1,2,#,#,3,4,#,#,5,#,#,
    cout << serialize(deserialize(data)) << endl; // same string -> round-trip ok
    return 0;
}` },
        ],
      },
    ],
  },
];

export default augments;
