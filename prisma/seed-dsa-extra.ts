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
  {
    slug: "algo-extra-best-time-stock",
    title: "Best Time to Buy and Sell Stock",
    difficulty: "easy",
    topics: ["arrays", "greedy"],
    estimatedMinutes: 15,
    description:
      "Given an array `prices` where `prices[i]` is the price of a stock on day i, return the maximum profit from buying on one day and selling on a later day. If no profit is possible, return `0`.\n\n```\nprices = [7,1,5,3,6,4]  =>  5   (buy at 1, sell at 6)\n```",
    functionName: "maxProfit",
    params: [{ name: "prices", type: "int[]" }],
    returnType: "int",
    ref: (prices: number[]) => {
      let minPrice = Infinity, best = 0;
      for (const p of prices) {
        minPrice = Math.min(minPrice, p);
        best = Math.max(best, p - minPrice);
      }
      return best;
    },
    cases: [
      { name: "profit", args: [[7, 1, 5, 3, 6, 4]] },
      { name: "no-profit", args: [[7, 6, 4, 3, 1]] },
      { name: "single", args: [[5]] },
    ],
  },
  {
    slug: "algo-extra-product-except-self",
    title: "Product of Array Except Self",
    difficulty: "medium",
    topics: ["arrays", "prefix-product"],
    estimatedMinutes: 20,
    description:
      "Given an integer array `nums`, return an array `out` where `out[i]` is the product of all elements except `nums[i]`. Solve without division.\n\n```\nnums = [1,2,3,4]  =>  [24,12,8,6]\n```",
    functionName: "productExceptSelf",
    params: [{ name: "nums", type: "int[]" }],
    returnType: "int[]",
    ref: (nums: number[]) => {
      const n = nums.length;
      const out = new Array(n).fill(1);
      let pre = 1;
      for (let i = 0; i < n; i++) { out[i] = pre; pre *= nums[i]; }
      let suf = 1;
      for (let i = n - 1; i >= 0; i--) { out[i] *= suf; suf *= nums[i]; }
      return out;
    },
    cases: [
      { name: "classic", args: [[1, 2, 3, 4]] },
      { name: "with-zero", args: [[0, 4, 0]] },
    ],
  },
  {
    slug: "algo-extra-container-most-water",
    title: "Container With Most Water",
    difficulty: "medium",
    topics: ["arrays", "two-pointers"],
    estimatedMinutes: 20,
    description:
      "Given an array `height` of n non-negative integers, find two lines that together with the x-axis form a container holding the most water. Return the maximum area.\n\n```\nheight = [1,8,6,2,5,4,8,3,7]  =>  49\n```",
    functionName: "maxArea",
    params: [{ name: "height", type: "int[]" }],
    returnType: "int",
    ref: (height: number[]) => {
      let l = 0, r = height.length - 1, best = 0;
      while (l < r) {
        best = Math.max(best, Math.min(height[l], height[r]) * (r - l));
        if (height[l] < height[r]) l++; else r--;
      }
      return best;
    },
    cases: [
      { name: "classic", args: [[1, 8, 6, 2, 5, 4, 8, 3, 7]] },
      { name: "flat", args: [[1, 1]] },
    ],
  },
  {
    slug: "algo-extra-trapping-rain-water",
    title: "Trapping Rain Water",
    difficulty: "hard",
    topics: ["arrays", "two-pointers"],
    estimatedMinutes: 25,
    description:
      "Given `height` representing an elevation map where each bar's width is 1, compute how much water can be trapped after raining.\n\n```\nheight = [0,1,0,2,1,0,1,3,2,1,2,1]  =>  6\n```",
    functionName: "trap",
    params: [{ name: "height", type: "int[]" }],
    returnType: "int",
    ref: (height: number[]) => {
      let l = 0, r = height.length - 1, lMax = 0, rMax = 0, total = 0;
      while (l < r) {
        if (height[l] < height[r]) {
          lMax = Math.max(lMax, height[l]);
          total += lMax - height[l];
          l++;
        } else {
          rMax = Math.max(rMax, height[r]);
          total += rMax - height[r];
          r--;
        }
      }
      return total;
    },
    cases: [
      { name: "classic", args: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]] },
      { name: "none", args: [[3, 2, 1]] },
    ],
  },
  {
    slug: "algo-extra-two-sum",
    title: "Two Sum",
    difficulty: "easy",
    topics: ["arrays", "hashing"],
    estimatedMinutes: 15,
    description:
      "Given an array `nums` and an integer `target`, return the indices `[i, j]` (i < j) of the two numbers that add up to `target`. Exactly one solution exists.\n\n```\nnums = [2,7,11,15], target = 9  =>  [0,1]\n```",
    functionName: "twoSum",
    params: [
      { name: "nums", type: "int[]" },
      { name: "target", type: "int" },
    ],
    returnType: "int[]",
    ref: (nums: number[], target: number) => {
      const seen = new Map<number, number>();
      for (let i = 0; i < nums.length; i++) {
        const need = target - nums[i];
        if (seen.has(need)) return [seen.get(need)!, i];
        seen.set(nums[i], i);
      }
      return [];
    },
    cases: [
      { name: "classic", args: [[2, 7, 11, 15], 9] },
      { name: "middle", args: [[3, 2, 4], 6] },
    ],
  },
  {
    slug: "algo-extra-move-zeroes",
    title: "Move Zeroes",
    difficulty: "easy",
    topics: ["arrays", "two-pointers"],
    estimatedMinutes: 15,
    description:
      "Move all `0`s to the end of `nums` while keeping the relative order of the non-zero elements. Return the resulting array.\n\n```\nnums = [0,1,0,3,12]  =>  [1,3,12,0,0]\n```",
    functionName: "moveZeroes",
    params: [{ name: "nums", type: "int[]" }],
    returnType: "int[]",
    ref: (nums: number[]) => {
      const out = nums.filter((x) => x !== 0);
      while (out.length < nums.length) out.push(0);
      return out;
    },
    cases: [
      { name: "classic", args: [[0, 1, 0, 3, 12]] },
      { name: "no-zeros", args: [[1, 2, 3]] },
    ],
  },
  {
    slug: "algo-extra-rotate-array",
    title: "Rotate Array",
    difficulty: "medium",
    topics: ["arrays"],
    estimatedMinutes: 15,
    description:
      "Rotate the array `nums` to the right by `k` steps and return it.\n\n```\nnums = [1,2,3,4,5,6,7], k = 3  =>  [5,6,7,1,2,3,4]\n```",
    functionName: "rotate",
    params: [
      { name: "nums", type: "int[]" },
      { name: "k", type: "int" },
    ],
    returnType: "int[]",
    ref: (nums: number[], k: number) => {
      const n = nums.length;
      if (n === 0) return [];
      const s = ((k % n) + n) % n;
      return [...nums.slice(n - s), ...nums.slice(0, n - s)];
    },
    cases: [
      { name: "classic", args: [[1, 2, 3, 4, 5, 6, 7], 3] },
      { name: "k-bigger", args: [[1, 2], 3] },
    ],
  },
  {
    slug: "algo-extra-single-number",
    title: "Single Number",
    difficulty: "easy",
    topics: ["arrays", "bit-manipulation"],
    estimatedMinutes: 10,
    description:
      "Every element appears twice except for one. Find that single element.\n\n```\nnums = [4,1,2,1,2]  =>  4\n```",
    functionName: "singleNumber",
    params: [{ name: "nums", type: "int[]" }],
    returnType: "int",
    ref: (nums: number[]) => nums.reduce((a, b) => a ^ b, 0),
    cases: [
      { name: "classic", args: [[4, 1, 2, 1, 2]] },
      { name: "single", args: [[7]] },
    ],
  },
  {
    slug: "algo-extra-majority-element",
    title: "Majority Element",
    difficulty: "easy",
    topics: ["arrays", "boyer-moore"],
    estimatedMinutes: 12,
    description:
      "Return the element that appears more than ⌊n/2⌋ times. You may assume it always exists.\n\n```\nnums = [2,2,1,1,1,2,2]  =>  2\n```",
    functionName: "majorityElement",
    params: [{ name: "nums", type: "int[]" }],
    returnType: "int",
    ref: (nums: number[]) => {
      let count = 0, candidate = 0;
      for (const n of nums) {
        if (count === 0) candidate = n;
        count += n === candidate ? 1 : -1;
      }
      return candidate;
    },
    cases: [
      { name: "classic", args: [[2, 2, 1, 1, 1, 2, 2]] },
      { name: "simple", args: [[3, 3, 4]] },
    ],
  },
  {
    slug: "algo-extra-missing-number",
    title: "Missing Number",
    difficulty: "easy",
    topics: ["arrays", "math"],
    estimatedMinutes: 12,
    description:
      "Given an array containing n distinct numbers in the range `[0, n]`, return the one number that is missing.\n\n```\nnums = [3,0,1]  =>  2\n```",
    functionName: "missingNumber",
    params: [{ name: "nums", type: "int[]" }],
    returnType: "int",
    ref: (nums: number[]) => {
      const n = nums.length;
      const expected = (n * (n + 1)) / 2;
      return expected - nums.reduce((a, b) => a + b, 0);
    },
    cases: [
      { name: "classic", args: [[3, 0, 1]] },
      { name: "missing-last", args: [[0, 1, 2]] },
    ],
  },
  {
    slug: "algo-extra-search-rotated",
    title: "Search in Rotated Sorted Array",
    difficulty: "medium",
    topics: ["binary-search", "arrays"],
    estimatedMinutes: 25,
    description:
      "A sorted array was rotated at an unknown pivot. Given `nums` and a `target`, return its index, or `-1` if absent.\n\n```\nnums = [4,5,6,7,0,1,2], target = 0  =>  4\n```",
    functionName: "search",
    params: [
      { name: "nums", type: "int[]" },
      { name: "target", type: "int" },
    ],
    returnType: "int",
    ref: (nums: number[], target: number) => {
      let lo = 0, hi = nums.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (nums[mid] === target) return mid;
        if (nums[lo] <= nums[mid]) {
          if (nums[lo] <= target && target < nums[mid]) hi = mid - 1; else lo = mid + 1;
        } else {
          if (nums[mid] < target && target <= nums[hi]) lo = mid + 1; else hi = mid - 1;
        }
      }
      return -1;
    },
    cases: [
      { name: "found", args: [[4, 5, 6, 7, 0, 1, 2], 0] },
      { name: "missing", args: [[4, 5, 6, 7, 0, 1, 2], 3] },
    ],
  },
  {
    slug: "algo-extra-subarray-sum-k",
    title: "Subarray Sum Equals K",
    difficulty: "medium",
    topics: ["arrays", "prefix-sum", "hashing"],
    estimatedMinutes: 20,
    description:
      "Return the total number of contiguous subarrays whose elements sum to `k`.\n\n```\nnums = [1,1,1], k = 2  =>  2\n```",
    functionName: "subarraySum",
    params: [
      { name: "nums", type: "int[]" },
      { name: "k", type: "int" },
    ],
    returnType: "int",
    ref: (nums: number[], k: number) => {
      const counts = new Map<number, number>([[0, 1]]);
      let sum = 0, total = 0;
      for (const n of nums) {
        sum += n;
        total += counts.get(sum - k) ?? 0;
        counts.set(sum, (counts.get(sum) ?? 0) + 1);
      }
      return total;
    },
    cases: [
      { name: "classic", args: [[1, 1, 1], 2] },
      { name: "with-negatives", args: [[1, -1, 0], 0] },
    ],
  },
  {
    slug: "algo-extra-house-robber",
    title: "House Robber",
    difficulty: "medium",
    topics: ["dynamic-programming"],
    estimatedMinutes: 20,
    description:
      "You cannot rob two adjacent houses. Given `nums` (money in each house), return the maximum amount you can rob.\n\n```\nnums = [2,7,9,3,1]  =>  12   (2 + 9 + 1)\n```",
    functionName: "rob",
    params: [{ name: "nums", type: "int[]" }],
    returnType: "int",
    ref: (nums: number[]) => {
      let prev = 0, curr = 0;
      for (const n of nums) {
        const next = Math.max(curr, prev + n);
        prev = curr;
        curr = next;
      }
      return curr;
    },
    cases: [
      { name: "classic", args: [[2, 7, 9, 3, 1]] },
      { name: "two", args: [[1, 2]] },
    ],
  },
  {
    slug: "algo-extra-longest-increasing-subsequence",
    title: "Longest Increasing Subsequence",
    difficulty: "medium",
    topics: ["dynamic-programming", "binary-search"],
    estimatedMinutes: 25,
    description:
      "Return the length of the longest strictly increasing subsequence of `nums`.\n\n```\nnums = [10,9,2,5,3,7,101,18]  =>  4   ([2,3,7,101])\n```",
    functionName: "lengthOfLIS",
    params: [{ name: "nums", type: "int[]" }],
    returnType: "int",
    ref: (nums: number[]) => {
      const tails: number[] = [];
      for (const n of nums) {
        let lo = 0, hi = tails.length;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (tails[mid] < n) lo = mid + 1; else hi = mid;
        }
        tails[lo] = n;
      }
      return tails.length;
    },
    cases: [
      { name: "classic", args: [[10, 9, 2, 5, 3, 7, 101, 18]] },
      { name: "decreasing", args: [[5, 4, 3, 2, 1]] },
    ],
  },
  {
    slug: "algo-extra-coin-change",
    title: "Coin Change",
    difficulty: "medium",
    topics: ["dynamic-programming"],
    estimatedMinutes: 25,
    description:
      "Given coin denominations `coins` and an `amount`, return the fewest coins needed to make the amount, or `-1` if it cannot be made.\n\n```\ncoins = [1,2,5], amount = 11  =>  3   (5+5+1)\n```",
    functionName: "coinChange",
    params: [
      { name: "coins", type: "int[]" },
      { name: "amount", type: "int" },
    ],
    returnType: "int",
    ref: (coins: number[], amount: number) => {
      const dp = new Array(amount + 1).fill(Infinity);
      dp[0] = 0;
      for (let a = 1; a <= amount; a++) {
        for (const c of coins) {
          if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);
        }
      }
      return dp[amount] === Infinity ? -1 : dp[amount];
    },
    cases: [
      { name: "classic", args: [[1, 2, 5], 11] },
      { name: "impossible", args: [[2], 3] },
    ],
  },
  {
    slug: "algo-extra-max-product-subarray",
    title: "Maximum Product Subarray",
    difficulty: "medium",
    topics: ["arrays", "dynamic-programming"],
    estimatedMinutes: 20,
    description:
      "Find the contiguous subarray with the largest product and return that product.\n\n```\nnums = [2,3,-2,4]  =>  6   ([2,3])\n```",
    functionName: "maxProduct",
    params: [{ name: "nums", type: "int[]" }],
    returnType: "int",
    ref: (nums: number[]) => {
      let best = nums[0], curMax = nums[0], curMin = nums[0];
      for (let i = 1; i < nums.length; i++) {
        const n = nums[i];
        const a = curMax * n, b = curMin * n;
        curMax = Math.max(n, a, b);
        curMin = Math.min(n, a, b);
        best = Math.max(best, curMax);
      }
      return best;
    },
    cases: [
      { name: "classic", args: [[2, 3, -2, 4]] },
      { name: "with-zero", args: [[-2, 0, -1]] },
    ],
  },
  {
    slug: "algo-extra-sort-colors",
    title: "Sort Colors (Dutch Flag)",
    difficulty: "medium",
    topics: ["arrays", "sorting", "two-pointers"],
    estimatedMinutes: 20,
    description:
      "Given an array `nums` of 0s, 1s, and 2s, sort them in place so equal colors are adjacent and ordered 0,1,2. Return the array.\n\n```\nnums = [2,0,2,1,1,0]  =>  [0,0,1,1,2,2]\n```",
    functionName: "sortColors",
    params: [{ name: "nums", type: "int[]" }],
    returnType: "int[]",
    ref: (nums: number[]) => [...nums].sort((a, b) => a - b),
    cases: [
      { name: "classic", args: [[2, 0, 2, 1, 1, 0]] },
      { name: "two", args: [[2, 0, 1]] },
    ],
  },
  {
    slug: "algo-extra-plus-one",
    title: "Plus One",
    difficulty: "easy",
    topics: ["arrays", "math"],
    estimatedMinutes: 12,
    description:
      "Given a non-negative integer represented as a digit array `digits` (most significant first), increment it by one and return the resulting digits.\n\n```\ndigits = [1,2,9]  =>  [1,3,0]\n```",
    functionName: "plusOne",
    params: [{ name: "digits", type: "int[]" }],
    returnType: "int[]",
    ref: (digits: number[]) => {
      const out = [...digits];
      for (let i = out.length - 1; i >= 0; i--) {
        if (out[i] < 9) { out[i]++; return out; }
        out[i] = 0;
      }
      return [1, ...out];
    },
    cases: [
      { name: "no-carry", args: [[1, 2, 9]] },
      { name: "all-nines", args: [[9, 9, 9]] },
    ],
  },
  {
    slug: "algo-extra-kth-largest",
    title: "Kth Largest Element in an Array",
    difficulty: "medium",
    topics: ["heap", "quickselect", "arrays"],
    estimatedMinutes: 20,
    description:
      "Return the kth largest element in `nums` (the kth largest in sorted order, not the kth distinct element).\n\n```\nnums = [3,2,1,5,6,4], k = 2  =>  5\n```",
    functionName: "findKthLargest",
    params: [
      { name: "nums", type: "int[]" },
      { name: "k", type: "int" },
    ],
    returnType: "int",
    ref: (nums: number[], k: number) => [...nums].sort((a, b) => b - a)[k - 1],
    cases: [
      { name: "classic", args: [[3, 2, 1, 5, 6, 4], 2] },
      { name: "with-dupes", args: [[3, 2, 3, 1, 2, 4, 5, 5, 6], 4] },
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
