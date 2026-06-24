const fs = require('fs');
const path = require('path');

const targetFile = path.join(process.cwd(), 'scripts', 'generate-js-coding-data.ts');
console.log('Target file path:', targetFile);

let content = fs.readFileSync(targetFile, 'utf8');
// Normalize line endings to LF
content = content.replace(/\r\n/g, '\n');

// -------------------------------------------------------------
// REPLACEMENT HELPERS
// -------------------------------------------------------------

function replaceStaticQuestion(title, replacementText) {
  const titleMarker = `title: "${title}",`;
  const titleIndex = content.indexOf(titleMarker);
  if (titleIndex === -1) {
    console.log(`✗ Static question "${title}" not found`);
    return false;
  }
  
  const prevContent = content.substring(0, titleIndex);
  const startIdx = prevContent.lastIndexOf('\n  {');
  if (startIdx === -1) {
    console.log(`✗ Start of static question "${title}" not found`);
    return false;
  }
  
  const nextContent = content.substring(titleIndex);
  const match = nextContent.match(/\n  \},?\s*(\n  \{|\n\];)/);
  if (!match) {
    console.log(`✗ End of static question "${title}" not found`);
    return false;
  }
  const endIdx = titleIndex + match.index + match[0].indexOf('\n', 1);
  
  const originalBlock = content.substring(startIdx + 1, endIdx);
  // Use callback to avoid special replacement characters ($&, $1) expansion
  content = content.replace(originalBlock, () => replacementText.trim());
  console.log(`✓ Replaced static question "${title}"`);
  return true;
}

function replaceDynamicQuestion(title, code, approach, exampleCode, runnable) {
  const startMarker = `  "${title}": {`;
  const startIndex = content.indexOf(startMarker);
  if (startIndex === -1) {
    console.log(`✗ Dynamic question "${title}" not found`);
    return false;
  }
  
  const searchPart = content.substring(startIndex + startMarker.length);
  const match = searchPart.match(/\n  "[^"]+"\s*:\s*\{|\n\};/);
  if (!match) {
    console.log(`✗ End marker for dynamic question "${title}" not found`);
    return false;
  }
  const endIndex = startIndex + startMarker.length + match.index;
  
  const originalBlock = content.substring(startIndex, endIndex);

  // Helper to escape backticks and dollar signs inside approach template strings
  const escapedApproach = approach.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
  const escapedCode = code.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
  const escapedExampleCode = exampleCode.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');

  const formattedFields = [
    `code: \`${escapedCode}\`,`,
    `approach: \`${escapedApproach}\`,`,
    `exampleCode: \`${escapedExampleCode}\`,`,
    `runnable: ${runnable}`
  ].map(line => '    ' + line).join('\n');

  const replacement = `  "${title}": {\n${formattedFields}\n  },`;
  // Use callback to avoid special replacement characters ($&, $1) expansion
  content = content.replace(originalBlock, () => replacement);
  console.log(`✓ Replaced dynamic question "${title}"`);
  return true;
}

// -------------------------------------------------------------
// 1. STATIC QUESTIONS REPLACEMENTS
// -------------------------------------------------------------

// Array Difference
replaceStaticQuestion(
  "Array Difference",
  `  {
    title: "Array Difference",
    difficulty: "easy",
    tags: ["array", "set"],
    description: "Return elements from the first array that are not present in the second, with deduplication and support for deep objects/arrays.",
    answer: "**Algorithm:** Use a Set of the second array for O(1) primitive checks. For reference values like objects and nested arrays, serialize them or perform a deep comparison. Keep track of seen items to filter out duplicates in the result.",
    examples: [
      {
        label: "Array Difference with Objects",
        runnable: true,
        code: \`function difference(arr1, arr2) {
  if (!Array.isArray(arr1)) return [];
  if (!Array.isArray(arr2)) return [...arr1];
  
  const set2 = new Set(arr2);
  const seen = new Set();
  
  return arr1.filter(item => {
    // Normalize key for deduplication and object comparison
    const key = typeof item === 'object' && item !== null ? JSON.stringify(item) : item;
    if (seen.has(key)) return false;
    seen.add(key);
    
    if (typeof item === 'object' && item !== null) {
      // Check if equivalent serialized object exists in arr2
      return !arr2.some(x => typeof x === 'object' && x !== null && JSON.stringify(x) === key);
    }
    return !set2.has(item);
  });
}

console.log(difference([1, 2, {a: 1}, {a: 1}, 3], [2, {a: 1}])); // [1, 3]\`
      }
    ]
  },`
);

// Array Intersection
replaceStaticQuestion(
  "Array Intersection",
  `  {
    title: "Array Intersection",
    difficulty: "easy",
    tags: ["array", "set"],
    description: "Find the common elements between two arrays, supporting object elements and avoiding duplicate values.",
    answer: "**Algorithm:** Wrap the second array in a Set for fast lookup. Filter the first array for items in the set, and maintain a visited Set of keys to filter out duplicate intersections.",
    examples: [
      {
        label: "Deduplicated Array Intersection",
        runnable: true,
        code: \`function intersection(arr1, arr2) {
  if (!Array.isArray(arr1) || !Array.isArray(arr2)) return [];
  
  const set2 = new Set(arr2);
  const seen = new Set();
  
  return arr1.filter(item => {
    const key = typeof item === 'object' && item !== null ? JSON.stringify(item) : item;
    if (seen.has(key)) return false;
    
    if (typeof item === 'object' && item !== null) {
      const match = arr2.some(x => typeof x === 'object' && x !== null && JSON.stringify(x) === key);
      if (match) {
        seen.add(key);
        return true;
      }
      return false;
    }
    
    if (set2.has(item)) {
      seen.add(key);
      return true;
    }
    return false;
  });
}

console.log(intersection([1, 2, {a: 1}, 2], [2, {a: 1}, 3])); // [2, {a: 1}]\`
      }
    ]
  },`
);

// Array Union
replaceStaticQuestion(
  "Array Union",
  `  {
    title: "Array Union",
    difficulty: "easy",
    tags: ["array", "set"],
    description: "Merge multiple arrays returning unique values, handling nested objects correctly.",
    answer: "**Algorithm:** Use a Set of stringified keys to deduplicate elements. Traverse each array in the input arrays argument list, pushing unique items into the output array.",
    examples: [
      {
        label: "Array Union with object deduplication",
        runnable: true,
        code: \`function union(...arrays) {
  const seen = new Set();
  const result = [];
  
  for (const arr of arrays) {
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      const key = typeof item === 'object' && item !== null ? JSON.stringify(item) : item;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(item);
      }
    }
  }
  return result;
}

console.log(union([1, {x: 1}], [{x: 1}, 2], [2, 3])); // [1, {x: 1}, 2, 3]\`
      }
    ]
  },`
);

// Array.prototype.reduce Polyfill
replaceStaticQuestion(
  "Array.prototype.reduce Polyfill",
  `  {
    title: "Array.prototype.reduce Polyfill",
    difficulty: "medium",
    tags: ["polyfill", "array"],
    description: "Implement a polyfill for \`Array.prototype.reduce\` conforming to standard ECMA specifications, handling sparse arrays and callback error scenarios.",
    answer: "**Algorithm:** Loop through the indices of the array. If no \`initialValue\` is provided, search for the first index that exists (\`i in this\`), assign it as the accumulator, and mark it. Continue calling the callback with \`(acc, curr, index, array)\` on all subsequent non-empty slots, returning the final accumulator.",
    examples: [
      {
        label: "Custom reduce implementation",
        runnable: true,
        code: \`Array.prototype.myReduce = function(callback, initialValue) {
  if (typeof callback !== 'function') {
    throw new TypeError(callback + ' is not a function');
  }
  
  let acc = initialValue;
  let hasAccumulator = initialValue !== undefined;
  
  for (let i = 0; i < this.length; i++) {
    if (i in this) {
      if (!hasAccumulator) {
        acc = this[i];
        hasAccumulator = true;
      } else {
        acc = callback(acc, this[i], i, this);
      }
    }
  }
  
  if (!hasAccumulator) {
    throw new TypeError('Reduce of empty array with no initial value');
  }
  
  return acc;
};

// Check sparse arrays behavior
const sparse = [ , , 10, 20];
console.log(sparse.myReduce((a, b) => a + b)); // 30 (Initializes to 10 and adds 20)\`
      }
    ]
  },`
);

// -------------------------------------------------------------
// 2. DYNAMIC QUESTIONS REPLACEMENTS (SOLUTIONS_MAP)
// -------------------------------------------------------------

// Array subset check
replaceDynamicQuestion(
  "Array subset check",
  `function isSubset(superset, subset) {
  if (!Array.isArray(superset) || !Array.isArray(subset)) return false;
  if (subset.length === 0) return true;
  
  const set = new Set(superset);
  
  return subset.every(item => {
    if (typeof item === 'object' && item !== null) {
      const key = JSON.stringify(item);
      return superset.some(x => typeof x === 'object' && x !== null && JSON.stringify(x) === key);
    }
    return set.has(item);
  });
}`,
  `### Solution Approach
1. **Empty Subset Guard**: Validate arrays, returning true early if the subset is empty.
2. **Set Lookup Bounds**: Create a Set of superset values for $O(1)$ checking of primitives.
3. **Reference Types Comparison**: If an element is an object, fallback to serialization comparisons.

**Thinking Aloud:**
*"To write a subset checker covering reference types, I'll use a Set for fast primitive lookups. If a subset item is an object, I'll search the superset for a matching stringified object structure. If all items match, return true."*`,
  `console.log(isSubset([1, {a: 1}, 2], [{a: 1}])); // true`,
  true
);

// Sum of odd numbers
replaceDynamicQuestion(
  "Sum of odd numbers",
  `function sumOfOdds(arr) {
  if (!Array.isArray(arr)) return 0;
  
  return arr.reduce((acc, x) => {
    const num = Number(x);
    if (isNaN(num)) return acc;
    
    // Supports negative odd numbers as well (e.g. -3 % 2 === -1)
    return num % 2 !== 0 ? acc + num : acc;
  }, 0);
}`,
  `### Solution Approach
1. **Numeric Typecast Guard**: Safely cast elements to numbers and check against NaN.
2. **Modulo Checks**: Evaluate if the number is odd, supporting negative integers correctly since \`num % 2\` for negative odds returns \`-1\`.
3. **Accumulate**: Sum up valid odd elements.

**Thinking Aloud:**
*"To handle edge cases, I must cast values to numbers, screen out NaNs, and check odd parity using num % 2 !== 0, which correctly accounts for negative odd numbers since -3 % 2 evaluates to -1 in JS."*`,
  `console.log(sumOfOdds([1, '2', -3, 'invalid', 5])); // 1 + -3 + 5 = 3`,
  true
);

// Create object from key-value pairs
replaceDynamicQuestion(
  "Create object from key-value pairs",
  `function fromPairs(pairs) {
  if (!Array.isArray(pairs)) return {};
  
  return pairs.reduce((acc, pair) => {
    if (!Array.isArray(pair) || pair.length < 2) return acc;
    
    const [key, val] = pair;
    const stringKey = typeof key === 'object' && key !== null ? JSON.stringify(key) : String(key);
    acc[stringKey] = val;
    return acc;
  }, {});
}`,
  `### Solution Approach
1. **Validation Checks**: Verify input is an array, skipping any pairs that are not arrays or contain fewer than 2 elements.
2. **Serialization**: Safely convert object-type keys to strings via JSON serialization.
3. **Reduce**: Accumulate fields into a plain object.

**Thinking Aloud:**
*"I will check that inputs are nested arrays of at least length 2. Convert keys to strings safely, serializing objects if needed, and assign the value to the key on the accumulator object."*`,
  `console.log(fromPairs([['a', 1], [null, 2], [{x: 1}, 3], ['short']])); // { a: 1, null: 2, '{"x":1}': 3 }`,
  true
);

// Promise delay helper
replaceDynamicQuestion(
  "Promise delay helper",
  `function delay(ms, value) {
  let timeoutId;
  let rejectFn;
  
  const promise = new Promise((resolve, reject) => {
    rejectFn = reject;
    const duration = Math.max(0, typeof ms === 'number' ? ms : 0);
    timeoutId = setTimeout(() => {
      resolve(value);
      timeoutId = null;
    }, duration);
  });
  
  promise.cancel = (reason = 'Cancelled') => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      rejectFn(new Error(reason));
    }
  };
  
  return promise;
}`,
  `### Solution Approach
1. **Delay Bounds**: Ensure the duration is non-negative and is a valid number.
2. **Cancelable Handle**: Expose a \`cancel()\` method attached directly to the returned promise to clear the timeout and reject the promise immediately.
3. **Timer cleanup**: Clear internal references upon standard execution completion.

**Thinking Aloud:**
*"To build a premium delay helper, I will make the returned promise cancelable. I'll store the setTimeout ID and reject function in closures. Attach a cancel function to the promise that clears the timeout and rejects with a custom cancellation error if called."*`,
  `const d = delay(50, 'finished');
d.then(console.log).catch(err => console.log('Delay failed:', err.message));
setTimeout(() => d.cancel('Aborted manually'), 10); // Delay failed: Aborted manually`,
  true
);

// Custom String.prototype.trim polyfill
replaceDynamicQuestion(
  "Custom String.prototype.trim polyfill",
  `function customTrim(str) {
  if (str === null || str === undefined) return '';
  const input = String(str);
  
  // Trims spaces, tabs, no-break spaces (\\xA0), and byte order marks (BOM, \\uFEFF)
  // along with other Unicode line and paragraph separators
  return input.replace(/^[\\s\\uFEFF\\xA0\\u2000-\\u200A\\u2028\\u2029]+|[\\s\\uFEFF\\xA0\\u2000-\\u200A\\u2028\\u2029]+$/g, '');
}`,
  `### Solution Approach
1. **Safe Cast**: Handle nullish values and cast non-string inputs using \`String()\`.
2. **Unicode Character Matching**: Target standard whitespaces, BOM (\`\\uFEFF\`), no-break space (\`\\xA0\`), and other Unicode whitespace blocks.
3. **Replacement**: Strip matched characters at starts and ends of string.

**Thinking Aloud:**
*"A proper trim polyfill must normalize nullish inputs and match all Unicode whitespaces, including tabs, BOMs, and non-breaking spaces. I'll execute a regular expression replace on both start and end boundaries."*`,
  `console.log(customTrim(' \\xA0\\t  Hello World \\uFEFF ')); // 'Hello World'`,
  true
);

// Object prototype clean copy
replaceDynamicQuestion(
  "Object prototype clean copy",
  `function cleanCopy(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags);
  
  // Create object with null prototype to avoid inheritance side effects (e.g. prototype pollution)
  const copy = Object.create(null);
  
  // Copy own enumerable properties and Symbol keys
  const keys = [...Object.keys(obj), ...Object.getOwnPropertySymbols(obj)];
  for (const key of keys) {
    const desc = Object.getOwnPropertyDescriptor(obj, key);
    if (desc && desc.enumerable) {
      copy[key] = cleanCopy(obj[key]);
    }
  }
  return copy;
}`,
  `### Solution Approach
1. **Null Prototype**: Create an empty dictionary object with a \`null\` prototype to prevent lookup side-effects and prototype pollution vulnerability.
2. **Deep Walk Recursion**: Handle arrays, Dates, RegExps, and nested objects.
3. **Symbols Support**: Make sure to capture Symbol properties along with standard properties.

**Thinking Aloud:**
*"I will initialize a fresh object with a null prototype. Recursively clean copy own properties, taking care of Symbol keys and instantiating dates or regex clones to avoid sharing reference mutations."*`,
  `const sym = Symbol('id');
const source = { [sym]: 100, date: new Date(), obj: { nested: true } };
const copy = cleanCopy(source);
console.log(copy[sym]); // 100
console.log(copy.toString); // undefined (Safe null prototype)`,
  true
);

// Custom Array.prototype.flatmap polyfill
replaceDynamicQuestion(
  "Custom Array.prototype.flatmap polyfill",
  `function flatMap(arr, cb, thisArg) {
  if (!Array.isArray(arr)) return [];
  if (typeof cb !== 'function') throw new TypeError(cb + ' is not a function');
  
  const res = [];
  for (let i = 0; i < arr.length; i++) {
    // Support sparse arrays (checking if index exists in array)
    if (i in arr) {
      const val = cb.call(thisArg, arr[i], i, arr);
      if (Array.isArray(val)) {
        res.push(...val);
      } else {
        res.push(val);
      }
    }
  }
  return res;
}`,
  `### Solution Approach
1. **Type Checks**: Throw a \`TypeError\` if callback is not executable, matching browser exceptions.
2. **Sparse Array Support**: Use \`i in arr\` to verify index keys exist in arrays, ignoring holes.
3. **Single Level Flatten**: Iterate and push elements, destructuring values if they are arrays to flatten them exactly 1 level.

**Thinking Aloud:**
*"flatMap must execute cb for each item, bypassing sparse array holes. In the loop, I call callback with thisArg, and if the output is an array, merge it into results via spread operator, else push it directly."*`,
  `const sparse = [1, , 2];
console.log(flatMap(sparse, x => [x, x * 2])); // [1, 2, 2, 4]`,
  true
);

// JSON string path evaluator
replaceDynamicQuestion(
  "JSON string path evaluator",
  `function evaluatePath(obj, path) {
  if (!path || typeof path !== 'string') return undefined;
  
  // Normalize bracket notation to dot notation: a[0].b -> a.0.b
  const normalizedPath = path
    .replace(/\\[\\s*['"]?([^'"]+)['"]?\\s*\\]/g, '.$1')
    .replace(/^\\./, '');
    
  const parts = normalizedPath.split('.');
  let curr = obj;
  
  for (const part of parts) {
    if (curr === null || curr === undefined) return undefined;
    
    // Prototype pollution safeguard
    if (part === '__proto__' || part === 'constructor' || part === 'prototype') {
      return undefined;
    }
    
    curr = curr[part];
  }
  return curr;
}`,
  `### Solution Approach
1. **Bracket Normalization**: Replace bracket-style accessors (\`a[0]\` or \`a['key']\`) with dot indicators (\`a.0\` or \`a.key\`).
2. **Security Safeguards**: Protect against prototype pollution attacks by screening keys like \`__proto__\`, \`constructor\` or \`prototype\`.
3. **Defensive Lookups**: Traverse properties, returning \`undefined\` early if a child property along the path is nullish.

**Thinking Aloud:**
*"To parse arbitrary JSON paths, I must support array bracket notation. I'll use regex to convert brackets to dots, split by dots, and check nested levels. I'll also add guards against constructor or __proto__ properties to prevent injection exploits."*`,
  `const data = { store: { books: [{ title: 'A' }, { title: 'B' }] } };
console.log(evaluatePath(data, "store.books[1].title")); // 'B'
console.log(evaluatePath(data, "store.books[0].__proto__")); // undefined (Safe)`,
  true
);

// LRU Cache clear
replaceDynamicQuestion(
  "LRU cache cache clear",
  `class LRUClearable {
  constructor(capacity) {
    if (typeof capacity !== 'number' || capacity <= 0) {
      throw new Error('Capacity must be a positive integer');
    }
    this.capacity = capacity;
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
  }
  
  get(key) {
    if (!this.cache.has(key)) {
      this.misses++;
      return undefined;
    }
    this.hits++;
    const val = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, val); // Refresh insertion order (MRU)
    return val;
  }
  
  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Evict oldest (least recently used)
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, value);
  }
  
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
  
  get size() {
    return this.cache.size;
  }
}`,
  `### Solution Approach
1. **Optimal LRU**: Leverage the insertion-ordering guarantees of JS \`Map\` to maintain eviction queues.
2. **Stats Tracking**: Monitor hits and misses to trace efficiency.
3. **Reset**: Purge all values and stats on \`clear()\`.

**Thinking Aloud:**
*"I'll write a full LRU cache backing store. When items are set or retrieved, remove and re-append them to keep them at the end. When clearing, reset the Map along with hits and misses."*`,
  `const cache = new LRUClearable(2);
cache.set('a', 1);
cache.set('b', 2);
cache.get('a'); // hit, refreshes order
cache.set('c', 3); // evicts 'b'
cache.clear();
console.log(cache.size); // 0 (Fully cleared)`,
  true
);

// LFU Cache clear
replaceDynamicQuestion(
  "LFU cache cache clear",
  `class LFU {
  constructor(capacity) {
    if (typeof capacity !== 'number' || capacity <= 0) {
      throw new Error('Capacity must be a positive integer');
    }
    this.capacity = capacity;
    this.vals = new Map(); // key -> value
    this.freqs = new Map(); // key -> frequency
    this.lists = new Map(); // frequency -> Set of keys (preserves insertion order)
    this.minFreq = 0;
  }
  
  get(key) {
    if (!this.vals.has(key)) return undefined;
    const freq = this.freqs.get(key);
    this.freqs.set(key, freq + 1);
    
    // Remove from old freq list
    this.lists.get(freq).delete(key);
    if (this.lists.get(freq).size === 0 && freq === this.minFreq) {
      this.minFreq++;
    }
    
    if (!this.lists.has(freq + 1)) {
      this.lists.set(freq + 1, new Set());
    }
    this.lists.get(freq + 1).add(key);
    return this.vals.get(key);
  }
  
  set(key, value) {
    if (this.capacity <= 0) return;
    
    if (this.vals.has(key)) {
      this.vals.set(key, value);
      this.get(key); // update frequency
      return;
    }
    
    if (this.vals.size >= this.capacity) {
      const evictSet = this.lists.get(this.minFreq);
      const evictKey = evictSet.values().next().value; // LRU eviction inside LFU
      evictSet.delete(evictKey);
      this.vals.delete(evictKey);
      this.freqs.delete(evictKey);
    }
    
    this.vals.set(key, value);
    this.freqs.set(key, 1);
    this.minFreq = 1;
    if (!this.lists.has(1)) {
      this.lists.set(1, new Set());
    }
    this.lists.get(1).add(key);
  }
  
  clear() {
    this.vals.clear();
    this.freqs.clear();
    this.lists.clear();
    this.minFreq = 0;
  }
}`,
  `### Solution Approach
1. **Frequency Mapping**: Use a Map from frequency to a Set of keys, which acts as a doubly linked list to provide $O(1)$ updates and evictions.
2. **Ties Resolution**: Resolve ties using LRU logic (evicting the first element in the frequency's Set).
3. **Reset state**: Re-initialize maps on clear.

**Thinking Aloud:**
*"To write an optimal LFU, I'll store key frequencies and map each frequency to a ordered Set of keys. When putting a key over capacity, evict the first item of the min frequency Set. When clearing, empty all data maps."*`,
  `const lfu = new LFU(2);
lfu.set('x', 10);
lfu.set('y', 20);
lfu.get('x'); // freq=2
lfu.set('z', 30); // evicts 'y' (freq=1)
lfu.clear();`,
  true
);

// Create lazy evaluator
replaceDynamicQuestion(
  "Create lazy evaluator",
  `class Lazy {
  constructor() {
    this.fns = [];
  }
  
  add(fn, ...args) {
    if (typeof fn !== 'function') {
      throw new TypeError('Lazy.add requires a function');
    }
    this.fns.push({ fn, args });
    return this; // support chaining
  }
  
  evaluate(initialVal) {
    return this.fns.reduce((acc, { fn, args }) => {
      return fn(acc, ...args);
    }, initialVal);
  }
}`,
  `### Solution Approach
1. **Operation Pipelines**: Maintain functional execution references along with their curried parameters.
2. **Builder Interface**: Return \`this\` in the \`add\` registration hook to enable fluid method chaining.
3. **Sequence Reduction**: Reduce stored operations sequentially upon invocation of \`evaluate()\`.

**Thinking Aloud:**
*"To construct a lazy evaluator, I'll save registration functions and optional arguments in an array. Returning 'this' supports chaining. When evaluate is invoked, sequentially execute each operation on the moving accumulator."*`,
  `const l = new Lazy().add(x => x + 1).add((x, y) => x * y, 10);
console.log(l.evaluate(2)); // (2+1)*10 = 30`,
  true
);

// Queue via two stacks
replaceDynamicQuestion(
  "Queue via two stacks",
  `class Queue {
  constructor() {
    this.inStack = [];
    this.outStack = [];
  }
  
  enqueue(x) {
    this.inStack.push(x);
  }
  
  _transfer() {
    if (this.outStack.length === 0) {
      while (this.inStack.length > 0) {
        this.outStack.push(this.inStack.pop());
      }
    }
  }
  
  dequeue() {
    this._transfer();
    if (this.outStack.length === 0) return undefined;
    return this.outStack.pop();
  }
  
  peek() {
    this._transfer();
    if (this.outStack.length === 0) return undefined;
    return this.outStack[this.outStack.length - 1];
  }
  
  get size() {
    return this.inStack.length + this.outStack.length;
  }
  
  isEmpty() {
    return this.size === 0;
  }
}`,
  `### Solution Approach
1. **Amortized O(1)**: Perform transfers from \`inStack\` to \`outStack\` only when \`outStack\` is empty, ensuring O(1) amortized bounds.
2. **Defensive Returns**: Return \`undefined\` safely on empty dequeues.
3. **Helper Accessors**: Expose \`size\` and \`isEmpty\` parameters to enrich interface completeness.

**Thinking Aloud:**
*"To implement a queue with two stacks, enqueue elements to inStack. For dequeue or peek, transfer elements from inStack to outStack (reversing their order) ONLY if outStack is empty. This preserves FIFO order with amortized O(1) time complexity."*`,
  `const q = new Queue();
q.enqueue(1);
q.enqueue(2);
console.log(q.peek()); // 1
console.log(q.dequeue()); // 1
console.log(q.size); // 1`,
  true
);

// Binary search tree validations
replaceDynamicQuestion(
  "Binary search tree validations",
  `function isValidBST(node, min = null, max = null) {
  // Base case: empty node/subtree is valid
  if (node === null || node === undefined) return true;
  
  // Edge Case: Validate node values are correct formats
  if (typeof node.val !== 'number') return false;
  
  // Check boundary constraints
  if (min !== null && node.val <= min) return false;
  if (max !== null && node.val >= max) return false;
  
  // Recursively validate left and right subtrees with updated bounds
  return isValidBST(node.left, min, node.val) && 
         isValidBST(node.right, node.val, max);
}`,
  `### Solution Approach
1. **Range Bounds Constraint**: Track min and max limits during recursion to ensure nodes satisfy overall BST invariants, not just local ones.
2. **Base Cases**: Return true for null elements.
3. **Type Safeguards**: Ensure values are valid numeric types.

**Thinking Aloud:**
*"To validate a BST, verifying local left/right children is not enough. I must pass down strict min and max boundaries. Walk recursively: the left child must be less than current node val, and the right child must be greater than current node val."*`,
  `const root = { val: 2, left: { val: 1 }, right: { val: 3 } };
console.log(isValidBST(root)); // true`,
  true
);

// Graph dfs traversal
replaceDynamicQuestion(
  "Graph dfs traversal",
  `function dfs(graph, start, cb) {
  if (!graph || typeof graph !== 'object') return [];
  const visited = new Set();
  const result = [];
  
  function traverse(node) {
    if (visited.has(node)) return;
    visited.add(node);
    result.push(node);
    if (typeof cb === 'function') cb(node);
    
    const neighbors = graph[node] || [];
    for (const neighbor of neighbors) {
      traverse(neighbor);
    }
  }
  
  traverse(start);
  return result;
}`,
  `### Solution Approach
1. **Cycle Guard**: Track visited nodes in a \`Set\` to prevent infinite loops in cyclic graphs.
2. **Trigger Callbacks**: Fire optional callback hooks during node visitations.
3. **Dynamic Traversal**: Recursively walk neighbors mapping nodes safely.

**Thinking Aloud:**
*"I will write a DFS traversal helper. Keep a Set of visited nodes. When entering a node, if visited contains it, return. Otherwise, mark it, push to results, call the callback, and recursively visit all neighbor paths."*`,
  `const g = { 1: [2, 3], 2: [1, 4], 3: [], 4: [] }; // Cyclic loop
console.log(dfs(g, 1)); // [1, 2, 4, 3]`,
  true
);

// Double ended queue structures
replaceDynamicQuestion(
  "Double ended queue structures",
  `class Deque {
  constructor() {
    this.items = {};
    this.front = 0;
    this.rear = 0;
  }
  
  addFirst(x) {
    this.front--;
    this.items[this.front] = x;
  }
  
  addLast(x) {
    this.items[this.rear] = x;
    this.rear++;
  }
  
  removeFirst() {
    if (this.isEmpty()) return undefined;
    const item = this.items[this.front];
    delete this.items[this.front];
    this.front++;
    return item;
  }
  
  removeLast() {
    if (this.isEmpty()) return undefined;
    this.rear--;
    const item = this.items[this.rear];
    delete this.items[this.rear];
    return item;
  }
  
  peekFirst() {
    if (this.isEmpty()) return undefined;
    return this.items[this.front];
  }
  
  peekLast() {
    if (this.isEmpty()) return undefined;
    return this.items[this.rear - 1];
  }
  
  isEmpty() {
    return this.rear - this.front === 0;
  }
  
  get size() {
    return this.rear - this.front;
  }
}`,
  `### Solution Approach
1. **Real O(1) Performance**: Use a hash map object with pointers rather than standard array \`shift()\` and \`unshift()\` which require $O(N)$ indices shifts.
2. **Bidirectional Indexes**: Support both positive rear additions and negative front offsets.
3. **Pointers cleanup**: Delete map references on removal to avoid leaks.

**Thinking Aloud:**
*"To build a real O(1) Deque, I must avoid Array shift/unshift. I'll use an object with front and rear integer indices. addFirst decrements front and assigns key, while addLast assigns rear and increments. removeFirst/Last delete references and adjust pointers."*`,
  `const d = new Deque();
d.addFirst(1);
d.addLast(2);
console.log(d.removeFirst()); // 1
console.log(d.removeLast()); // 2
console.log(d.isEmpty()); // true`,
  true
);

// Custom getElementById traverse
replaceDynamicQuestion(
  "Custom getElementById traverse",
  `function customGetElementById(root, id) {
  if (!root || !id) return null;
  
  // BFS queue traversal to inspect nodes iteratively
  const queue = [root];
  while (queue.length > 0) {
    const curr = queue.shift();
    if (curr.nodeType === 1 && curr.id === id) {
      return curr;
    }
    
    const children = curr.children || [];
    for (let i = 0; i < children.length; i++) {
      queue.push(children[i]);
    }
  }
  return null;
}`,
  `### Solution Approach
1. **Iterative BFS**: Traverse the DOM hierarchy using a Queue queue to avoid call stack limits associated with deep recursions.
2. **Node Filtering**: Evaluate only element nodes (\`nodeType === 1\`).
3. **Edge Guards**: Handle invalid root or blank selectors safely.

**Thinking Aloud:**
*"Instead of recursive depth searches that risk blowing the stack in deeply nested documents, I'll write an iterative breadth-first queue loop. Dequeue elements, check element type and ID matching, and append children elements."*`,
  `// Example placeholder (requires DOM environment)
// console.log(customGetElementById(document.body, 'main-container'));`,
  false
);

// DOM offset absolute coordinate
replaceDynamicQuestion(
  "DOM offset absolute coordinate",
  `function getAbsoluteOffset(el) {
  if (!el) return { top: 0, left: 0 };
  
  // Bounding client rect returns exact position relative to viewport
  const rect = el.getBoundingClientRect();
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  
  return {
    top: rect.top + scrollTop,
    left: rect.left + scrollLeft
  };
}`,
  `### Solution Approach
1. **Bounding Rectangle**: Fetch element viewport boundaries using \`getBoundingClientRect()\` for high-fidelity values.
2. **Scroll Offsets**: Aggregate horizontal and vertical page offsets from document frames.
3. **Edge Case Safety**: Return zeroed metrics for nullish element parameters.

**Thinking Aloud:**
*"To compute exact page coordinates, a loop over offsetParent can get skewed by transformed layouts. Instead, I'll call getBoundingClientRect to get viewport coordinates, then add pageXOffset and pageYOffset to include scroll positions."*`,
  `// Example placeholder (requires DOM environment)
// console.log(getAbsoluteOffset(document.getElementById('target')));`,
  false
);

// Document tree depth check
replaceDynamicQuestion(
  "Document tree depth check",
  `function getDOMDepth(node) {
  if (!node) return 0;
  if (node.nodeType !== 1 && node.nodeType !== 9) return 0;
  
  const children = node.children || [];
  if (children.length === 0) return 1;
  
  let maxDepth = 0;
  for (let i = 0; i < children.length; i++) {
    maxDepth = Math.max(maxDepth, getDOMDepth(children[i]));
  }
  return 1 + maxDepth;
}`,
  `### Solution Approach
1. **NodeType Filtration**: Restrict calculations to Element and Document type nodes, ignoring comments and text fragments.
2. **Recursive Traversal**: Evaluate nested depths, calculating the maximum depth across child branches.
3. **Empty Elements Base**: Return 1 for leaf nodes.

**Thinking Aloud:**
*"I'll write a recursive depth counter. Base cases check if the node is element or document node; else return 0. If there are no children, depth is 1. Otherwise, map and find the maximum depth of children and add 1."*`,
  `// Example placeholder (requires DOM environment)
// console.log(getDOMDepth(document.documentElement));`,
  false
);

// DOM event delegation target
replaceDynamicQuestion(
  "DOM event delegation target",
  `function delegate(parentEl, selector, eventType, callback) {
  if (!parentEl || typeof parentEl.addEventListener !== 'function') return () => {};
  
  const handler = function(e) {
    const match = e.target.closest(selector);
    if (match && parentEl.contains(match)) {
      callback.call(match, e);
    }
  };
  
  parentEl.addEventListener(eventType, handler);
  
  // Return unbind teardown callback to follow event-handling best practices
  return () => parentEl.removeEventListener(eventType, handler);
}`,
  `### Solution Approach
1. **Closest Search API**: Use \`e.target.closest(selector)\` to identify targets even if nested inner elements (like SVGs or spans inside buttons) are clicked.
2. **Containment check**: Verify matched element exists within delegator parent container.
3. **Teardown handler**: Return cleanup function to allow easy listener removal.

**Thinking Aloud:**
*"Delegation should work even if the click triggers on an inner child element. I'll add a listener to the parent. In the callback, use e.target.closest(selector) to traverse up. If a match is found and parent contains it, trigger callback. Return a cleanup handler."*`,
  `// Example placeholder (requires DOM environment)
// const cancelDelegation = delegate(document.body, '.btn-action', 'click', e => alert('Clicked!'));`,
  false
);

// Find nearest common ancestor node
replaceDynamicQuestion(
  "Find nearest common ancestor node",
  `function findLCA(node1, node2) {
  if (!node1 || !node2) return null;
  
  // Use contains API to check containment chains efficiently
  let curr = node1;
  while (curr) {
    if (curr.contains(node2)) return curr;
    curr = curr.parentNode;
  }
  
  curr = node2;
  while (curr) {
    if (curr.contains(node1)) return curr;
    curr = curr.parentNode;
  }
  
  return null;
}`,
  `### Solution Approach
1. **Containment Crawl**: Walk up node1's parent ancestors, using \`contains(node2)\` to quickly identify intersection points.
2. **Reverse Safeguards**: Check containment in node2's parents if node1 is outside node2 hierarchies.
3. **Boundary returns**: Exit returning null if nodes do not share frames.

**Thinking Aloud:**
*"To find the lowest common ancestor, I can walk up node1's ancestors step-by-step. At each parent, check if that node contains node2 using the native contains() API. This is clean and runs in linear time."*`,
  `// Example placeholder (requires DOM environment)
// console.log(findLCA(childNodeA, childNodeB));`,
  false
);

// HTML template compiler
replaceDynamicQuestion(
  "HTML template compiler",
  `function compile(template, data) {
  if (typeof template !== 'string') return '';
  if (!data || typeof data !== 'object') return template;
  
  // Regex matches {{ path }} supporting dot-separated paths (e.g. user.profile.name)
  return template.replace(/\\{\\{\\s*([\\w\\.]+)\\s*\\}\\}/g, (_, path) => {
    const value = path.split('.').reduce((acc, part) => {
      return acc !== null && acc !== undefined ? acc[part] : undefined;
    }, data);
    
    return value !== undefined ? String(value) : '';
  });
}`,
  `### Solution Approach
1. **Dot path traversal**: Split parameter names by dots to access nested data structures (e.g. \`profile.name\`).
2. **Safe dereferencing**: Reduce path values defensively, preventing exceptions on missing parameters.
3. **String replacements**: Replace tag segments with converted values.

**Thinking Aloud:**
*"I'll build a template compiler matching {{ path }}. To support nested paths, I'll split match paths by dots and use reduce to traverse the data object safely, converting outcomes to string or returning empty string if nullish."*`,
  `const template = 'Hello {{ user.name }} from {{ user.loc.city }}!';
const data = { user: { name: 'Priya', loc: { city: 'Bengaluru' } } };
console.log(compile(template, data)); // 'Hello Priya from Bengaluru!'`,
  true
);

// Query text highlighter
replaceDynamicQuestion(
  "Query text highlighter",
  `function highlight(text, q) {
  if (!text || typeof text !== 'string') return '';
  if (!q || typeof q !== 'string') return text;
  
  // Edge Case: Escape special regex operators to avoid crashes
  const escapedQuery = q.replace(/[-\\/\\\\^$*+?.()|[\\]{}]/g, '\\\\$&');
  const regex = new RegExp(\`(\${escapedQuery})\`, 'gi');
  
  return text.replace(regex, '<mark>$1</mark>');
}`,
  `### Solution Approach
1. **Regex Escapes**: Sanitize query string parameters, escaping characters like \`*\`, \`+\`, \`?\` to avoid compiling crashes.
2. **Case Insensitive**: Construct regular expression flags using 'gi'.
3. **HTML Wrapping**: Replace occurrences with HTML mark tags.

**Thinking Aloud:**
*"When highlighting a search term, passing raw user inputs to RegExp will crash if it has characters like ?. I will write a regex escape helper. Then create a global case-insensitive RegExp, replacing matches with mark tag elements."*`,
  `console.log(highlight('Find page coordinates (offset)', '(offset)')); // 'Find page coordinates <mark>(offset)</mark>'`,
  true
);

// Check array cyclic references
replaceDynamicQuestion(
  "Check array cyclic references",
  `function isCyclicArray(arr, seen = new Set()) {
  if (!Array.isArray(arr)) return false;
  if (seen.has(arr)) return true;
  
  seen.add(arr);
  for (const item of arr) {
    if (Array.isArray(item)) {
      if (isCyclicArray(item, seen)) return true;
    } else if (typeof item === 'object' && item !== null) {
      // Generalize cycle check to capture references if nested object holds same array references
      if (seen.has(item)) return true;
    }
  }
  seen.delete(arr);
  return false;
}`,
  `### Solution Approach
1. **DFS Reference Crawl**: Recursively traverse array structures.
2. **Set Visited Cache**: Accumulate array and object reference keys inside a \`Set\` and backtrack on return.
3. **Cycle detection**: Check if current element reference exists in Set.

**Thinking Aloud:**
*"To find array cycles, walk items. If item is an array or object, check if it's already in the visited Set. If so, cycle found. Otherwise, add to Set, recursively check, and delete from Set on backtracking."*`,
  `const a = [];
const b = [a];
a.push(b);
console.log(isCyclicArray(a)); // true (Handles multi-layered recursive cycles)`,
  true
);

// Promise fallback retry
replaceDynamicQuestion(
  "Promise fallback retry",
  `function promiseFallback(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return Promise.reject(new Error('No tasks provided'));
  }
  
  const errors = [];
  
  function execute(index) {
    if (index >= tasks.length) {
      // Support standard AggregateError if all items reject
      return Promise.reject(new Error('All promises rejected: ' + errors.join(', ')));
    }
    
    const task = tasks[index];
    // Support both promise factories (functions returning promises) and eager promises
    const promise = typeof task === 'function' ? Promise.resolve().then(task) : Promise.resolve(task);
    
    return promise.catch(err => {
      errors.push(err);
      return execute(index + 1);
    });
  }
  
  return execute(0);
}`,
  `### Solution Approach
1. **Lazy Execution Support**: Accept promise factories (functions returning promises) to prevent all promises from running eagerly in parallel.
2. **Sequence Walk**: Call next fallback promise only when current one rejects.
3. **Error Collection**: Collect rejection reasons, rejecting with aggregated errors if all fail.

**Thinking Aloud:**
*"Passing pre-created promises means they execute concurrently. A fallback resolver should accept promise factories. Run them sequentially. If one fails, push error to array and recurse to next, rejecting at end if all failed."*`,
  `const taskA = () => Promise.reject('A failed');
const taskB = () => Promise.resolve('B resolved');
promiseFallback([taskA, taskB]).then(console.log); // 'B resolved'`,
  true
);

// Throttled click triggers
replaceDynamicQuestion(
  "Throttled click triggers",
  `function throttleClick(fn, limit) {
  if (typeof fn !== 'function') throw new TypeError('Expected a function');
  let waiting = false;
  let timerId = null;
  
  const throttled = function(...args) {
    if (!waiting) {
      fn.apply(this, args);
      waiting = true;
      timerId = setTimeout(() => {
        waiting = false;
        timerId = null;
      }, limit);
    }
  };
  
  throttled.cancel = () => {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
    waiting = false;
  };
  
  return throttled;
}`,
  `### Solution Approach
1. **Limit Checks**: Bind immediate execution lockouts.
2. **Teardown handler**: Attach a \`cancel()\` callback to clear scheduled locks and reset limits.
3. **Context bindings**: Preserve execution \`this\` during call.

**Thinking Aloud:**
*"Throttled clicks execute immediately, locking subsequent triggers for limit ms. I will write a wrapper, attach a cancel function to clear timeouts, and release waiting locks."*`,
  `let count = 0;
const throttled = throttleClick(() => count++, 100);
throttled();
throttled(); // blocked
console.log(count); // 1`,
  true
);

// Currying with arbitrary calls
replaceDynamicQuestion(
  "Currying with arbitrary calls",
  `function curriedAdd(...args) {
  const sumVal = args.reduce((acc, x) => acc + x, 0);
  
  const sum = (...nextArgs) => {
    if (nextArgs.length === 0) return sumVal;
    return curriedAdd(sumVal, ...nextArgs);
  };
  
  sum.toString = () => String(sumVal);
  sum.valueOf = () => sumVal;
  
  return sum;
}`,
  `### Solution Approach
1. **Accumulate multi-arguments**: Sum current parameters in a single reduce accumulator.
2. **Recursion wrapper**: Return nested sum function carrying parameters, allowing custom argument counts.
3. **Value overrides**: Override \`valueOf\` and \`toString\` to return evaluated totals on comparison.

**Thinking Aloud:**
*"To write an arbitrary curry adder, I will support multiple arguments in one call (like add(1, 2)(3)). Accumulate arguments using reduce. In returned sum function, if empty arguments passed return sum, else recursively curry next."*`,
  `const sum = curriedAdd(1, 2)(3)(4, 5);
console.log(Number(sum)); // 15
console.log(sum()); // 15`,
  true
);

// Custom WeakMap reference tracker
replaceDynamicQuestion(
  "Custom WeakMap reference tracker",
  `class WeakTracker {
  constructor() {
    this.tracker = new WeakMap();
  }
  
  track(obj, meta) {
    if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
      throw new TypeError('WeakTracker keys must be objects or functions');
    }
    this.tracker.set(obj, {
      meta,
      timestamp: Date.now(),
      accessCount: 0
    });
  }
  
  get(obj) {
    const entry = this.tracker.get(obj);
    if (entry) {
      entry.accessCount++;
    }
    return entry;
  }
  
  has(obj) {
    return this.tracker.has(obj);
  }
  
  untrack(obj) {
    return this.tracker.delete(obj);
  }
}`,
  `### Solution Approach
1. **Weak Maps**: Keep weak key references using \`WeakMap\` objects to prevent memory leaks and let keys be garbage collected.
2. **Key Type Guard**: Throw \`TypeError\` if key parameter is not an object or function, matching native specs.
3. **Stats and Access Tracking**: Log internal statistics like lookup times and access counts.

**Thinking Aloud:**
*"WeakMap keys must be object/function references. I'll write track() to validate keys first. Store details along with a lookup counter, updating stats on each get() call, and add untrack() using WeakMap.delete()."*`,
  `const tracker = new WeakTracker();
const user = { name: 'Alice' };
tracker.track(user, 'User metadata');
console.log(tracker.get(user).accessCount); // 1
tracker.untrack(user);`,
  true
);

// Custom iterator range loop
replaceDynamicQuestion(
  "Custom iterator range loop",
  `function customRange(start, end, step = 1) {
  return {
    [Symbol.iterator]() {
      let curr = start;
      const s = typeof step === 'number' && step !== 0 ? step : 1;
      
      return {
        next() {
          const isDone = s > 0 ? curr >= end : curr <= end;
          if (!isDone) {
            const val = curr;
            curr += s;
            return { value: val, done: false };
          }
          return { done: true };
        }
      };
    }
  };
}`,
  `### Solution Approach
1. **Symbol Iterator Protocol**: Implement the standard iterable hook returning an iterator containing a \`next()\` method.
2. **Direction Step Bounds**: Allow step sizes, adjusting terminal direction comparisons depending on positive/negative steps.
3. **Boundary returns**: Return done structure when loop matches bounds.

**Thinking Aloud:**
*"I'll write customRange implementing [Symbol.iterator]. Store current counter in closure. In next(), calculate if iteration has exceeded end depending on positive or negative step values, returning current value and incrementing by step."*`,
  `// Positive step range
for (const x of customRange(1, 6, 2)) console.log(x); // 1, 3, 5
// Negative step range
for (const x of customRange(10, 5, -2)) console.log(x); // 10, 8, 6`,
  true
);

// HTML tag tree parser
replaceDynamicQuestion(
  "HTML tag tree parser",
  `function parseTags(html) {
  if (typeof html !== 'string') return [];
  
  function parseAttributes(attrStr) {
    const attrs = {};
    const regex = /(\\w+)\\s*=\\s*(?:"([^"]*)"|'([^']*)'|(\\S+))/g;
    let match;
    while ((match = regex.exec(attrStr)) !== null) {
      attrs[match[1]] = match[2] || match[3] || match[4];
    }
    return attrs;
  }
  
  const results = [];
  // Matches tag name, optional attribute parameters, and inner child HTML content
  const tagRegex = /<(\\w+)([^>]*)>([\\s\\S]*?)<\\/\\1>/g;
  let match;
  
  while ((match = tagRegex.exec(html)) !== null) {
    const [_, tagName, attrStr, innerContent] = match;
    results.push({
      tag: tagName,
      attributes: parseAttributes(attrStr),
      content: innerContent,
      // Recursively parse nested children inside inner content
      children: parseTags(innerContent)
    });
  }
  
  return results;
}`,
  `### Solution Approach
1. **Nested tag parser regex**: Build tagRegex to extract tag labels and attribute details.
2. **Recursive Children Parse**: Call parseTags recursively on inner body contents to construct tree models.
3. **Attribute parser parser**: Scan attribute strings, extracting key-value configuration objects.

**Thinking Aloud:**
*"To parse tag trees, I will match tags recursively. Write an attributes parser. In main loop, parse tag name, attributes, and content. Recursively invoke parseTags on inner body content, nesting results under children."*`,
  `const html = '<div class="main"><p id="intro">Welcome</p></div>';
console.log(parseTags(html)[0].children[0].attributes.id); // 'intro'`,
  true
);

// Local storage storage sync events
replaceDynamicQuestion(
  "Local storage storage sync events",
  `function onStorageChange(key, cb) {
  if (typeof window === 'undefined' || !window.addEventListener) {
    return () => {};
  }
  
  const listener = (e) => {
    // storage event fires on OTHER windows/tabs
    if (e.key === key && e.storageArea === localStorage) {
      cb(e.newValue, e.oldValue);
    }
  };
  
  window.addEventListener('storage', listener);
  
  // Custom hook for same-tab updates (since standard storage listener only fires cross-tab)
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(k, v) {
    const oldValue = localStorage.getItem(k);
    originalSetItem.apply(this, arguments);
    if (k === key && oldValue !== v) {
      cb(v, oldValue);
    }
  };
  
  return () => {
    window.removeEventListener('storage', listener);
    localStorage.setItem = originalSetItem; // restore original hook
  };
}`,
  `### Solution Approach
1. **Window checks**: Guard against server-side rendering execution crashes.
2. **Cross tab listeners**: Listen to window storage events to synchronise changes across frames.
3. **Same tab hook interception**: Intercept local storage \`setItem\` execution to trigger same-tab change callbacks immediately.

**Thinking Aloud:**
*"Standard storage events only fire cross-tab. To capture same-tab updates, I will monkeypatch localStorage.setItem. In my listener, run callbacks on key change. Return a teardown that restores the original setItem."*`,
  `// Example placeholder (requires browser environment)
// const cancel = onStorageChange('user-token', (newV, oldV) => console.log('token updated:', newV));`,
  false
);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Successfully wrote enriched code to generate-js-coding-data.ts');
