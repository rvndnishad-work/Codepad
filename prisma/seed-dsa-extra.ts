import { PrismaClient } from "@prisma/client";
import { genStub } from "../src/lib/judge/harness";
import type { Contract, ContractType, ReturnType, CompareMode } from "../src/lib/judge/types";

const prisma = new PrismaClient();
const DSA_LANGS = ["python", "javascript", "typescript", "go", "java", "cpp", "rust"];

type ProblemCase = { name: string; args: unknown[]; isHidden?: boolean; weight?: number };
type Problem = {
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  description: string;
  functionName: string;
  params: { name: string; type: ContractType }[];
  returnType: ReturnType;
  compare?: CompareMode;
  topics?: string[];
  estimatedMinutes?: number;
  ref: (...args: any[]) => unknown;
  cases: ProblemCase[];
};

const PROBLEMS: Problem[] = [
  {
    slug: "algo-extra-merge-sorted-arrays",
    title: "Merge Sorted Arrays",
    difficulty: "easy",
    topics: ["two-pointers", "arrays"],
    estimatedMinutes: 15,
    description:
      "Given two sorted integer arrays `arr1` and `arr2`, return a new sorted array containing all elements of both arrays.\n\n```\narr1 = [1, 3, 5], arr2 = [2, 4, 6]  =>  [1, 2, 3, 4, 5, 6]\n```",
    functionName: "mergeSortedArrays",
    params: [
      { name: "arr1", type: "int[]" },
      { name: "arr2", type: "int[]" },
    ],
    returnType: "int[]",
    ref: (arr1: number[], arr2: number[]) => [...arr1, ...arr2].sort((a, b) => a - b),
    cases: [
      { name: "classic", args: [[1, 3, 5], [2, 4, 6]] },
      { name: "empty-first", args: [[], [1, 2, 3]] },
      { name: "empty-second", args: [[1, 2, 3], []] },
    ],
  },
  {
    slug: "algo-extra-binary-search",
    title: "Binary Search",
    difficulty: "easy",
    topics: ["binary-search", "arrays"],
    estimatedMinutes: 15,
    description:
      "Given a sorted integer array `nums` and a `target`, return the index of `target` in `nums`, or `-1` if it is not present.\n\n```\nnums = [-1,0,3,5,9,12], target = 9  =>  4\n```",
    functionName: "search",
    params: [
      { name: "nums", type: "int[]" },
      { name: "target", type: "int" },
    ],
    returnType: "int",
    ref: (nums: number[], target: number) => nums.indexOf(target),
    cases: [
      { name: "found", args: [[-1, 0, 3, 5, 9, 12], 9] },
      { name: "missing", args: [[-1, 0, 3, 5, 9, 12], 2] },
    ],
  },
  {
    slug: "algo-extra-fibonacci",
    title: "Fibonacci Number",
    difficulty: "easy",
    topics: ["recursion", "math"],
    estimatedMinutes: 10,
    description:
      "Calculate the n-th Fibonacci number. Fib(0) = 0, Fib(1) = 1, Fib(n) = Fib(n-1) + Fib(n-2).\n\n```\nn = 4  =>  3\n```",
    functionName: "fib",
    params: [{ name: "n", type: "int" }],
    returnType: "int",
    ref: (n: number) => {
      let a = 0, b = 1;
      for (let i = 0; i < n; i++) {
        const t = a + b;
        a = b;
        b = t;
      }
      return a;
    },
    cases: [
      { name: "zero", args: [0] },
      { name: "one", args: [1] },
      { name: "four", args: [4] },
      { name: "ten", args: [10], isHidden: true },
    ],
  },
  {
    slug: "algo-extra-palindrome",
    title: "Is Palindrome",
    difficulty: "easy",
    topics: ["strings", "two-pointers"],
    estimatedMinutes: 10,
    description:
      "Check if a string `s` is a palindrome (reads same forwards and backwards, case-sensitive).\n\n```\ns = \"racecar\"  =>  true\n```",
    functionName: "isPalindrome",
    params: [{ name: "s", type: "string" }],
    returnType: "bool",
    ref: (s: string) => s === s.split("").reverse().join(""),
    cases: [
      { name: "yes", args: ["racecar"] },
      { name: "no", args: ["hello"] },
    ],
  },
  {
    slug: "algo-extra-anagram",
    title: "Valid Anagram",
    difficulty: "easy",
    topics: ["strings", "hashing"],
    estimatedMinutes: 15,
    description:
      "Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.\n\n```\ns = \"anagram\", t = \"nagaram\"  =>  true\n```",
    functionName: "isAnagram",
    params: [
      { name: "s", type: "string" },
      { name: "t", type: "string" },
    ],
    returnType: "bool",
    ref: (s: string, t: string) => s.split("").sort().join("") === t.split("").sort().join(""),
    cases: [
      { name: "yes", args: ["anagram", "nagaram"] },
      { name: "no", args: ["rat", "car"] },
    ],
  },
  {
    slug: "algo-extra-max-subarray",
    title: "Maximum Subarray",
    difficulty: "medium",
    topics: ["arrays", "dynamic-programming"],
    estimatedMinutes: 20,
    description:
      "Find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.\n\n```\nnums = [-2,1,-3,4,-1,2,1,-5,4]  =>  6   ([4,-1,2,1])\n```",
    functionName: "maxSubArray",
    params: [{ name: "nums", type: "int[]" }],
    returnType: "int",
    ref: (nums: number[]) => {
      let maxSoFar = nums[0], maxEndingHere = nums[0];
      for (let i = 1; i < nums.length; i++) {
        maxEndingHere = Math.max(nums[i], maxEndingHere + nums[i]);
        maxSoFar = Math.max(maxSoFar, maxEndingHere);
      }
      return maxSoFar;
    },
    cases: [
      { name: "classic", args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]] },
      { name: "single", args: [[5]] },
    ],
  },
  {
    slug: "algo-extra-climbing-stairs",
    title: "Climbing Stairs",
    difficulty: "easy",
    topics: ["dynamic-programming", "math"],
    estimatedMinutes: 15,
    description:
      "It takes `n` steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?\n\n```\nn = 3  =>  3   (1+1+1, 1+2, 2+1)\n```",
    functionName: "climbStairs",
    params: [{ name: "n", type: "int" }],
    returnType: "int",
    ref: (n: number) => {
      let a = 1, b = 1;
      for (let i = 2; i <= n; i++) {
        const t = a + b;
        a = b;
        b = t;
      }
      return b;
    },
    cases: [
      { name: "two", args: [2] },
      { name: "three", args: [3] },
      { name: "five", args: [5], isHidden: true },
    ],
  },
  {
    slug: "algo-extra-longest-common-prefix",
    title: "Longest Common Prefix",
    difficulty: "easy",
    topics: ["strings"],
    estimatedMinutes: 15,
    description:
      "Find the longest common prefix string amongst an array of strings. If there is no common prefix, return an empty string `\"\"`.\n\n```\nstrs = [\"flower\",\"flow\",\"flight\"]  =>  \"fl\"\n```",
    functionName: "longestCommonPrefix",
    params: [{ name: "strs", type: "string[]" }],
    returnType: "string",
    ref: (strs: string[]) => {
      if (!strs.length) return "";
      let prefix = strs[0];
      for (let i = 1; i < strs.length; i++) {
        while (strs[i].indexOf(prefix) !== 0) {
          prefix = prefix.substring(0, prefix.length - 1);
          if (!prefix) return "";
        }
      }
      return prefix;
    },
    cases: [
      { name: "classic", args: [["flower", "flow", "flight"]] },
      { name: "none", args: [["dog", "racecar", "car"]] },
    ],
  },
  {
    slug: "algo-extra-linked-list-cycle",
    title: "Linked List Cycle Check",
    difficulty: "medium",
    topics: ["linked-list", "two-pointers"],
    estimatedMinutes: 20,
    description:
      "Given the head of a linked list (modeled as an array list representing node target connections, where `-1` means no cycle, other values represent index cycles), return `true` if it contains a cycle.",
    functionName: "hasCycle",
    params: [{ name: "nodes", type: "int[]" }],
    returnType: "bool",
    ref: (nodes: number[]) => {
      if (nodes.length <= 1) return false;
      let slow = 0, fast = 0;
      while (fast !== -1 && nodes[fast] !== -1 && nodes[nodes[fast]] !== -1) {
        slow = nodes[slow];
        fast = nodes[nodes[fast]];
        if (slow === fast) return true;
      }
      return false;
    },
    cases: [
      { name: "cycle", args: [[1, 2, 0]] },
      { name: "no-cycle", args: [[1, 2, -1]] },
    ],
  },
  {
    slug: "algo-extra-middle-node",
    title: "Middle of the Linked List",
    difficulty: "easy",
    topics: ["linked-list", "two-pointers"],
    estimatedMinutes: 15,
    description:
      "Given a linked list of size `n` (represented as an array of values), return the value of the middle node. If there are two middle nodes, return the second middle node's value.",
    functionName: "middleNode",
    params: [{ name: "arr", type: "int[]" }],
    returnType: "int",
    ref: (arr: number[]) => arr[Math.floor(arr.length / 2)],
    cases: [
      { name: "odd", args: [[1, 2, 3, 4, 5]] },
      { name: "even", args: [[1, 2, 3, 4, 5, 6]] },
    ],
  },
  {
    slug: "algo-extra-invert-tree",
    title: "Invert Binary Tree",
    difficulty: "easy",
    topics: ["trees", "recursion"],
    estimatedMinutes: 15,
    description:
      "Invert a binary tree (represented as level-order array list). Swap left and right subtrees at each node.\n\n```\n[4, 2, 7]  =>  [4, 7, 2]\n```",
    functionName: "invertTree",
    params: [{ name: "tree", type: "int[]" }],
    returnType: "int[]",
    ref: (tree: number[]) => {
      const invert = (idx: number) => {
        if (idx >= tree.length) return;
        const left = 2 * idx + 1;
        const right = 2 * idx + 2;
        if (left < tree.length && right < tree.length) {
          const temp = tree[left];
          tree[left] = tree[right];
          tree[right] = temp;
        }
        invert(left);
        invert(right);
      };
      const res = [...tree];
      invert(0);
      return res;
    },
    cases: [
      { name: "simple", args: [[4, 2, 7]] },
      { name: "empty", args: [[]] },
    ],
  },
  {
    slug: "algo-extra-bubble-sort",
    title: "Bubble Sort",
    difficulty: "easy",
    topics: ["sorting"],
    estimatedMinutes: 10,
    description:
      "Implement Bubble Sort: sort an array in-place and return it in non-decreasing order.",
    functionName: "bubbleSort",
    params: [{ name: "arr", type: "int[]" }],
    returnType: "int[]",
    ref: (arr: number[]) => [...arr].sort((a, b) => a - b),
    cases: [
      { name: "unsorted", args: [[5, 3, 8, 4, 2]] },
    ],
  },
  {
    slug: "algo-extra-insertion-sort",
    title: "Insertion Sort",
    difficulty: "easy",
    topics: ["sorting"],
    estimatedMinutes: 12,
    description:
      "Implement Insertion Sort: sort an array in-place and return it in non-decreasing order.",
    functionName: "insertionSort",
    params: [{ name: "arr", type: "int[]" }],
    returnType: "int[]",
    ref: (arr: number[]) => [...arr].sort((a, b) => a - b),
    cases: [
      { name: "unsorted", args: [[6, 2, 5, 8, 1]] },
    ],
  },
  {
    slug: "algo-extra-merge-sort",
    title: "Merge Sort",
    difficulty: "medium",
    topics: ["sorting", "recursion"],
    estimatedMinutes: 20,
    description:
      "Implement Merge Sort: sort an array recursively and return it in non-decreasing order.",
    functionName: "mergeSort",
    params: [{ name: "arr", type: "int[]" }],
    returnType: "int[]",
    ref: (arr: number[]) => [...arr].sort((a, b) => a - b),
    cases: [
      { name: "unsorted", args: [[12, 11, 13, 5, 6, 7]] },
    ],
  },
  {
    slug: "algo-extra-quick-sort",
    title: "Quick Sort",
    difficulty: "medium",
    topics: ["sorting", "recursion"],
    estimatedMinutes: 20,
    description:
      "Implement Quick Sort: sort an array recursively and return it in non-decreasing order.",
    functionName: "quickSort",
    params: [{ name: "arr", type: "int[]" }],
    returnType: "int[]",
    ref: (arr: number[]) => [...arr].sort((a, b) => a - b),
    cases: [
      { name: "unsorted", args: [[10, 7, 8, 9, 1, 5]] },
    ],
  },
  {
    slug: "algo-extra-valid-parentheses",
    title: "Valid Parentheses Checker",
    difficulty: "easy",
    topics: ["stack", "strings"],
    estimatedMinutes: 15,
    description:
      "Check if parenthesized string containing `()[]{}` is valid. Brackets must close in matching pairs.",
    functionName: "isValid",
    params: [{ name: "s", type: "string" }],
    returnType: "bool",
    ref: (s: string) => {
      const st: string[] = [];
      const m: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
      for (const c of s) {
        if (c === "(" || c === "[" || c === "{") st.push(c);
        else if (st.pop() !== m[c]) return false;
      }
      return st.length === 0;
    },
    cases: [
      { name: "valid", args: ["()[]{}"] },
      { name: "invalid", args: ["(]"] },
    ],
  },
];

async function main() {
  let created = 0;
  for (const p of PROBLEMS) {
    const contract: Contract = { functionName: p.functionName, params: p.params, returnType: p.returnType };
    const starterCode: Record<string, string> = {};
    for (const lang of DSA_LANGS) {
      try {
        starterCode[lang] = genStub(lang, contract);
      } catch (e) {
        console.warn(`  ! no stub for ${lang} on ${p.slug}: ${(e as Error).message}`);
      }
    }
    const harnessTests = p.cases.map((c, i) => ({
      id: `${p.slug}-${i}`,
      name: c.name,
      argsJson: JSON.stringify(c.args),
      expectedJson: JSON.stringify(p.ref(...c.args)),
      isHidden: Boolean(c.isHidden),
      weight: c.weight ?? 1,
      compare: p.compare ?? "exact",
    }));
    const tags = [...DSA_LANGS, "dsa", ...(p.topics ?? [])];
    const minutes = p.estimatedMinutes ?? 20;

    const challenge = await prisma.challenge.upsert({
      where: { slug: p.slug },
      update: {
        title: p.title,
        description: p.description,
        difficulty: p.difficulty,
        category: "DSA",
        tags: JSON.stringify(tags),
        estimatedMinutes: minutes,
        published: true,
        visibility: "public",
      },
      create: {
        slug: p.slug,
        title: p.title,
        description: p.description,
        difficulty: p.difficulty,
        template: "harness",
        starterFiles: "{}",
        testFiles: "{}",
        category: "DSA",
        tags: JSON.stringify(tags),
        estimatedMinutes: minutes,
        published: true,
        visibility: "public",
      },
      select: { id: true },
    });

    await prisma.challengeStep.upsert({
      where: { challengeId_position: { challengeId: challenge.id, position: 0 } },
      update: {
        description: p.description,
        estimatedMinutes: minutes,
        judgingMode: "harness",
        functionName: p.functionName,
        signatureJson: JSON.stringify({ params: p.params, returnType: p.returnType }),
        languagesJson: JSON.stringify(DSA_LANGS),
        starterCodeJson: JSON.stringify(starterCode),
        harnessTestsJson: JSON.stringify(harnessTests),
        referenceSolutionsJson: "{}",
      },
      create: {
        challengeId: challenge.id,
        position: 0,
        title: p.title,
        description: p.description,
        template: "harness",
        starterFiles: "{}",
        testFiles: "{}",
        estimatedMinutes: minutes,
        judgingMode: "harness",
        functionName: p.functionName,
        signatureJson: JSON.stringify({ params: p.params, returnType: p.returnType }),
        languagesJson: JSON.stringify(DSA_LANGS),
        starterCodeJson: JSON.stringify(starterCode),
        harnessTestsJson: JSON.stringify(harnessTests),
        referenceSolutionsJson: "{}",
      },
    });

    created++;
    console.log(`  ✓ ${p.slug} (${p.difficulty})`);
  }
  console.log(`\nSeeded ${created} additional DSA challenges.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
