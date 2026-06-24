import { writeFileSync, readFileSync, readdirSync } from "fs";
import { join } from "path";

// Programmatic SVG generators
function getEventLoopSvg(title: string, taskType?: string) {
  return `<div style="margin:1.25rem auto;max-width:680px;border:1px solid rgba(6,182,212,0.25);border-radius:16px;padding:16px;background:rgba(21,21,21,0.6)">
<svg viewBox="0 0 800 520" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
<text x="20" y="45" fill="currentColor" font-size="16" font-weight="800" opacity="0.95">${title}</text>
<rect x="200" y="80" width="280" height="150" rx="14" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-dasharray="0" />
<text x="340" y="72" fill="#22c55e" font-size="12" font-weight="800" text-anchor="middle" letter-spacing="1">CALL STACK</text>
<rect x="200" y="260" width="360" height="100" rx="14" fill="none" stroke="#f97316" stroke-width="2.5" />
<text x="380" y="252" fill="#f97316" font-size="12" font-weight="800" text-anchor="middle" letter-spacing="1">MICROTASK QUEUE</text>
<rect x="200" y="390" width="360" height="100" rx="14" fill="none" stroke="#eab308" stroke-width="2.5" />
<text x="380" y="382" fill="#eab308" font-size="12" font-weight="800" text-anchor="middle" letter-spacing="1">MACROTASK QUEUE</text>
<rect x="20" y="280" width="110" height="210" rx="16" fill="none" stroke="#06b6d4" stroke-width="2.5" />
<text x="75" y="315" fill="#06b6d4" font-size="13" font-weight="800" text-anchor="middle" letter-spacing="0.5">EVENT</text>
<text x="75" y="335" fill="#06b6d4" font-size="13" font-weight="800" text-anchor="middle" letter-spacing="0.5">LOOP</text>
<g transform="translate(75, 400)">
<path d="M -20,-10 C -25,15 25,15 20,-10" fill="none" stroke="#06b6d4" stroke-width="3" marker-end="url(#el-arrow-head)"/>
<path d="M 20,10 C 25,-15 -25,-15 -20,10" fill="none" stroke="#06b6d4" stroke-width="3" marker-end="url(#el-arrow-head)"/>
<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="5s" repeatCount="indefinite"/>
</g>
<g font-size="11" fill="currentColor" opacity="0.75" font-family="ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace">
<text x="580" y="285">process.nextTick()</text>
<text x="580" y="305" font-weight="700" fill="#f97316">Promise callback</text>
<text x="580" y="325">async functions</text>
<text x="580" y="345">queueMicrotask</text>
<text x="580" y="415" font-weight="700" fill="#eab308">setTimeout()</text>
<text x="580" y="435">setInterval()</text>
<text x="580" y="455">setImmediate()</text>
</g>
<path d="M 75 280 L 75 155 L 185 155" fill="none" stroke="#06b6d4" stroke-width="2" stroke-dasharray="4" marker-end="url(#generic-arrow-cyan)"/>
<path d="M 130 340 L 190 340" fill="none" stroke="#f97316" stroke-width="2" marker-start="url(#generic-arrow-orange)" marker-end="url(#generic-arrow-orange)"/>
<path d="M 130 440 L 190 440" fill="none" stroke="#eab308" stroke-width="2" marker-start="url(#generic-arrow-yellow)" marker-end="url(#generic-arrow-yellow)"/>
<g transform="translate(300, 137)">
<rect x="0" y="0" width="80" height="36" rx="8" fill="#ec4899" stroke="#db2777" stroke-width="1.5">
<animate attributeName="fill" values="#ec4899;#f472b6;#ec4899" dur="1.5s" repeatCount="indefinite" />
</rect>
<text x="40" y="22" fill="#ffffff" font-size="11" font-weight="700" text-anchor="middle">TASK 1</text>
<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.16;0.17;1" dur="12s" repeatCount="indefinite"/>
</g>
<g>
<rect x="0" y="0" width="80" height="36" rx="8" fill="#ec4899" stroke="#db2777" stroke-width="1.5">
<animate attributeName="fill" values="#ec4899;#f472b6;#ec4899" dur="1.5s" repeatCount="indefinite" />
</rect>
<text x="40" y="22" fill="#ffffff" font-size="11" font-weight="700" text-anchor="middle">TASK 2</text>
<animateTransform attributeName="transform" type="translate"
values="220,292; 220,292; 35,292; 35,137; 300,137; 300,137; 220,292; 220,292"
keyTimes="0; 0.167; 0.20; 0.233; 0.267; 0.375; 0.383; 1"
dur="12s" repeatCount="indefinite"/>
<animate attributeName="opacity"
values="1; 1; 1; 1; 1; 1; 0; 0"
keyTimes="0; 0.167; 0.20; 0.233; 0.267; 0.375; 0.383; 1"
dur="12s" repeatCount="indefinite"/>
</g>
<g>
<rect x="0" y="0" width="80" height="36" rx="8" fill="#ec4899" stroke="#db2777" stroke-width="1.5">
<animate attributeName="fill" values="#ec4899;#f472b6;#ec4899" dur="1.5s" repeatCount="indefinite" />
</rect>
<text x="40" y="22" fill="#ffffff" font-size="11" font-weight="700" text-anchor="middle">TASK 3</text>
<animateTransform attributeName="transform" type="translate"
values="310,292; 310,292; 220,292; 220,292; 35,292; 35,137; 300,137; 300,137; 310,292; 310,292"
keyTimes="0; 0.167; 0.20; 0.375; 0.408; 0.442; 0.475; 0.583; 0.592; 1"
dur="12s" repeatCount="indefinite"/>
<animate attributeName="opacity"
values="1; 1; 1; 1; 1; 1; 1; 1; 0; 0"
keyTimes="0; 0.167; 0.20; 0.375; 0.408; 0.442; 0.475; 0.583; 0.592; 1"
dur="12s" repeatCount="indefinite"/>
</g>
<g>
<rect x="0" y="0" width="80" height="36" rx="8" fill="#ec4899" stroke="#db2777" stroke-width="1.5">
<animate attributeName="fill" values="#ec4899;#f472b6;#ec4899" dur="1.5s" repeatCount="indefinite" />
</rect>
<text x="40" y="22" fill="#ffffff" font-size="11" font-weight="700" text-anchor="middle">TASK 4</text>
<animateTransform attributeName="transform" type="translate"
values="400,292; 400,292; 310,292; 310,292; 220,292; 220,292; 35,292; 35,137; 300,137; 300,137; 400,292; 400,292"
keyTimes="0; 0.167; 0.20; 0.375; 0.408; 0.583; 0.617; 0.65; 0.683; 0.792; 0.80; 1"
dur="12s" repeatCount="indefinite"/>
<animate attributeName="opacity"
values="1; 1; 1; 1; 1; 1; 1; 1; 1; 1; 0; 0"
keyTimes="0; 0.167; 0.20; 0.375; 0.408; 0.583; 0.617; 0.65; 0.683; 0.792; 0.80; 1"
dur="12s" repeatCount="indefinite"/>
</g>
<g>
<rect x="0" y="0" width="80" height="36" rx="8" fill="#ec4899" stroke="#db2777" stroke-width="1.5">
<animate attributeName="fill" values="#ec4899;#f472b6;#ec4899" dur="1.5s" repeatCount="indefinite" />
</rect>
<text x="40" y="22" fill="#ffffff" font-size="11" font-weight="700" text-anchor="middle">TASK 5</text>
<animateTransform attributeName="transform" type="translate"
values="220,422; 220,422; 35,422; 35,137; 300,137; 300,137"
keyTimes="0; 0.792; 0.825; 0.858; 0.892; 1"
dur="12s" repeatCount="indefinite"/>
<animate attributeName="opacity"
values="1; 1; 1; 1; 1; 0"
keyTimes="0; 0.792; 0.825; 0.858; 0.99; 1"
dur="12s" repeatCount="indefinite"/>
</g>
<g>
<rect x="0" y="0" width="80" height="36" rx="8" fill="#ec4899" stroke="#db2777" stroke-width="1.5">
<animate attributeName="fill" values="#ec4899;#f472b6;#ec4899" dur="1.5s" repeatCount="indefinite" />
</rect>
<text x="40" y="22" fill="#ffffff" font-size="11" font-weight="700" text-anchor="middle">TASK 6</text>
<animateTransform attributeName="transform" type="translate"
values="310,422; 310,422; 220,422; 220,422"
keyTimes="0; 0.792; 0.825; 1"
dur="12s" repeatCount="indefinite"/>
<animate attributeName="opacity"
values="1; 1; 1; 0"
keyTimes="0; 0.792; 0.99; 1"
dur="12s" repeatCount="indefinite"/>
</g>
<defs>
<marker id="generic-arrow-cyan" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
<path d="M0,0 L6,3 L0,6 Z" fill="#06b6d4"/>
</marker>
<marker id="generic-arrow-orange" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
<path d="M0,0 L6,3 L0,6 Z" fill="#f97316"/>
</marker>
<marker id="generic-arrow-yellow" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
<path d="M0,0 L6,3 L0,6 Z" fill="#eab308"/>
</marker>
<marker id="el-arrow-head" markerWidth="5" markerHeight="5" refX="2" refY="2.5" orient="auto">
<path d="M0,0 L5,2.5 L0,5 Z" fill="#06b6d4"/>
</marker>
</defs>
</svg>
</div>`;
}

function getPromiseStateSvg(title: string) {
  return `<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 180" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="22" fill="currentColor" font-size="12" font-weight="700">${title}</text>
  <rect x="30" y="70" width="110" height="40" rx="8" fill="#a1a1aa" fill-opacity="0.15" stroke="#a1a1aa" stroke-width="2"/>
  <text x="85" y="94" fill="currentColor" font-size="12" font-weight="700" text-anchor="middle">PENDING</text>

  <rect x="230" y="40" width="120" height="40" rx="8" fill="#22c55e" fill-opacity="0.15" stroke="#22c55e" stroke-width="2"/>
  <text x="290" y="64" fill="#22c55e" font-size="12" font-weight="700" text-anchor="middle">FULFILLED</text>
  
  <rect x="230" y="100" width="120" height="40" rx="8" fill="#ef4444" fill-opacity="0.15" stroke="#ef4444" stroke-width="2"/>
  <text x="290" y="124" fill="#ef4444" font-size="12" font-weight="700" text-anchor="middle">REJECTED</text>

  <path d="M 140 80 Q 180 60 220 60" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-dasharray="6" stroke-dashoffset="0">
    <animate attributeName="stroke-dashoffset" values="30;0" dur="2s" repeatCount="indefinite"/>
  </path>
  <path d="M 140 100 Q 180 120 220 120" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="6" stroke-dashoffset="0">
    <animate attributeName="stroke-dashoffset" values="30;0" dur="2s" repeatCount="indefinite"/>
  </path>
</svg>
</div>`;
}

function getObjectPrototypeSvg(title: string) {
  return `<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 180" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="22" fill="currentColor" font-size="12" font-weight="700">${title}</text>
  <rect x="20" y="60" width="110" height="50" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="75" y="85" fill="currentColor" font-size="11" text-anchor="middle">Object Instance</text>
  <text x="75" y="100" fill="currentColor" font-size="9" text-anchor="middle" opacity="0.6">[[Prototype]]</text>

  <rect x="190" y="60" width="130" height="50" rx="6" fill="#8b5cf6" fill-opacity="0.15" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="255" y="85" fill="currentColor" font-size="11" text-anchor="middle">Constructor.prototype</text>
  <text x="255" y="100" fill="currentColor" font-size="9" text-anchor="middle" opacity="0.6">{ methods }</text>

  <rect x="380" y="60" width="110" height="50" rx="6" fill="#ec4899" fill-opacity="0.15" stroke="#ec4899" stroke-width="1.5"/>
  <text x="435" y="85" fill="currentColor" font-size="11" text-anchor="middle">Object.prototype</text>
  <text x="435" y="100" fill="currentColor" font-size="9" text-anchor="middle" opacity="0.6">{ toString }</text>

  <path d="M 130 85 L 190 85" fill="none" stroke="#f59e0b" stroke-width="2" marker-end="url(#chain-arrow)"/>
  <path d="M 320 85 L 380 85" fill="none" stroke="#f59e0b" stroke-width="2" marker-end="url(#chain-arrow)"/>
  <defs>
    <marker id="chain-arrow" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
      <path d="M0,0 L6,3 L0,6 Z" fill="#f59e0b"/>
    </marker>
  </defs>
</svg>
</div>`;
}

function getTimelineSvg(title: string, mode: "debounce" | "throttle") {
  return `<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 180" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="22" fill="currentColor" font-size="12" font-weight="700">${title}</text>
  <line x1="30" y1="110" x2="480" y2="110" stroke="currentColor" stroke-width="2" marker-end="url(#time-arrow)"/>
  <circle cx="60" cy="110" r="6" fill="#ef4444" />
  <circle cx="100" cy="110" r="6" fill="#ef4444" />
  <circle cx="140" cy="110" r="6" fill="#ef4444" />
  <text x="100" y="96" fill="#ef4444" font-size="9" text-anchor="middle">events fired</text>

  ${mode === "debounce" ? `
  <rect x="140" y="55" width="120" height="30" rx="4" fill="#3b82f6" fill-opacity="0.15" stroke="#3b82f6" stroke-dasharray="4"/>
  <text x="200" y="73" fill="#3b82f6" font-size="10" text-anchor="middle">debounce wait</text>
  <circle cx="260" cy="110" r="8" fill="#22c55e"/>
  <text x="260" y="134" fill="#22c55e" font-size="10" font-weight="700" text-anchor="middle">Execution</text>
  ` : `
  <rect x="60" y="55" width="160" height="30" rx="4" fill="#f59e0b" fill-opacity="0.15" stroke="#f59e0b" stroke-dasharray="4"/>
  <text x="140" y="73" fill="#f59e0b" font-size="10" text-anchor="middle">throttle interval</text>
  <circle cx="60" cy="110" r="8" fill="#22c55e"/>
  <text x="60" y="134" fill="#22c55e" font-size="10" font-weight="700" text-anchor="middle">Execution</text>
  `}
  <defs>
    <marker id="time-arrow" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
      <path d="M0,0 L6,3 L0,6 Z" fill="currentColor"/>
    </marker>
  </defs>
</svg>
</div>`;
}

function getMemoryRefSvg(title: string) {
  return `<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 180" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="22" fill="currentColor" font-size="12" font-weight="700">${title}</text>
  <rect x="30" y="45" width="130" height="110" rx="8" fill="#3b82f6" fill-opacity="0.1" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="95" y="38" fill="#3b82f6" font-size="11" font-weight="700" text-anchor="middle">Stack (References)</text>
  <rect x="40" y="60" width="110" height="24" rx="4" fill="#3b82f6" fill-opacity="0.2" stroke="#3b82f6"/>
  <text x="95" y="75" fill="currentColor" font-size="10" text-anchor="middle">variablePtr</text>

  <rect x="250" y="45" width="240" height="110" rx="8" fill="#ec4899" fill-opacity="0.1" stroke="#ec4899" stroke-width="1.5"/>
  <text x="370" y="38" fill="#ec4899" font-size="11" font-weight="700" text-anchor="middle">Heap (Objects)</text>
  <rect x="270" y="60" width="95" height="30" rx="6" fill="#ec4899" fill-opacity="0.2" stroke="#ec4899"/>
  <text x="317" y="78" fill="currentColor" font-size="10" text-anchor="middle">{ value: 10 }</text>

  <path d="M 150 72 L 260 72" fill="none" stroke="#f59e0b" stroke-width="2.5" marker-end="url(#h-arrow)"/>
  <defs>
    <marker id="h-arrow" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
      <path d="M0,0 L6,3 L0,6 Z" fill="#f59e0b"/>
    </marker>
  </defs>
</svg>
</div>`;
}

function getBubblingSvg(title: string) {
  return `<div style="margin:1.25rem auto;max-width:540px;border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:14px;background:rgba(139,92,246,0.04)">
<svg viewBox="0 0 520 180" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="14" y="22" fill="currentColor" font-size="12" font-weight="700">${title}</text>
  
  <rect x="180" y="40" width="160" height="110" rx="8" fill="#3b82f6" fill-opacity="0.1" stroke="#3b82f6"/>
  <text x="260" y="34" fill="#3b82f6" font-size="11" font-weight="700" text-anchor="middle">window / document</text>

  <rect x="200" y="70" width="120" height="70" rx="6" fill="#8b5cf6" fill-opacity="0.15" stroke="#8b5cf6"/>
  <text x="260" y="64" fill="#8b5cf6" font-size="10" text-anchor="middle">div (parent)</text>

  <rect x="220" y="100" width="80" height="30" rx="4" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/>
  <text x="260" y="118" fill="currentColor" font-size="10" text-anchor="middle">button (target)</text>

  <!-- Bubbling Path arrow -->
  <path d="M 260 96 L 260 48" fill="none" stroke="#f59e0b" stroke-width="2.5" marker-end="url(#bub-arrow)"/>
  <text x="272" y="78" fill="#f59e0b" font-size="9">Bubbling phase (up)</text>
  
  <defs>
    <marker id="bub-arrow" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
      <path d="M0,0 L6,3 L0,6 Z" fill="#f59e0b"/>
    </marker>
  </defs>
</svg>
</div>`;
}

// Enhancements map matching titles and providing updated fields
const enhancements: Record<string, { answer: string }> = {
  "What is hoisting in JavaScript?": {
    answer: `**Core Concept (TL;DR)**
Hoisting is a behavior in JavaScript where the engine allocates memory for variable and function declarations during the compilation phase of the execution context, before any code is executed. This makes declarations accessible in their scope before the line where they are defined.

${getEventLoopSvg("Hoisting phase moves declarations", "microtask")}

**Under-the-Hood Mechanics**
When a JavaScript engine (like V8) runs code, it does so in two distinct phases:
1. **Creation/Compilation Phase**: V8 parses the source code into an Abstract Syntax Tree (AST). It sweeps through the current scope to find all declarations. It registers functions and variables in the environment record of the current Execution Context.
   - **Function Declarations**: The entire function (name and body) is registered and initialized in memory, making it fully usable immediately.
   - **\`var\` Declarations**: The variable is registered and initialized with the value \`undefined\`.
   - **\`let\` and \`const\` Declarations**: The variables are registered in the environment record but are left **uninitialized**. They enter the **Temporal Dead Zone (TDZ)**.
2. **Execution Phase**: V8 executes code line-by-line. If it encounters a reference to a \`let\` or \`const\` variable in the TDZ, it throws a \`ReferenceError\` immediately.

**Tricky Code Scenarios & Gotchas**
- **Function Declaration vs. Expression**:
  \`\`\`javascript
  foo(); // Works: prints "hello"
  bar(); // TypeError: bar is not a function (it is hoisted as undefined!)
  
  function foo() { console.log("hello"); }
  var bar = function() { console.log("world"); };
  \`\`\`
- **Variable Shadowing & Hoisting**:
  \`\`\`javascript
  var x = 1;
  function test() {
    console.log(x); // Prints undefined, NOT 1, due to local hoisting of x!
    var x = 2;
  }
  test();
  \`\`\`

**Architectural Rationale**
Hoisting was designed into the ECMAScript specification primarily to support **mutual recursion** (Function A calling Function B, and Function B calling Function A, where one must be defined after its call-site). It also allows writing code where utility functions are placed at the bottom of the file for readability.

**Pro-Level Interview Tip**
Explain that hoisting is not a physical displacement of code lines by V8, but rather a side effect of how Execution Contexts set up their Lexical Environments in the parsing phase. Use terms like "Creation Phase", "Temporal Dead Zone", and "Lexical Environment" to show deep engine-level mastery.`
  },
  "What is the difference between var, let, and const?": {
    answer: `**Core Concept (TL;DR)**
Modern JavaScript distinguishes variables by block scoping, reassignment locks, and hoisting/initialization semantics. \`var\` is function-scoped and hoisted with initialization, while \`let\` and \`const\` are block-scoped and remain uninitialized (in the Temporal Dead Zone) until declared.

${getMemoryRefSvg("const locks the variable reference in memory")}

**Under-the-Hood Mechanics**
The V8 engine allocates scope environments differently based on variable keywords:
1. **Scope Resolution**: \`var\` variables are registered on the nearest **Function Environment** or the **Global Environment**. \`let\` and \`const\` are registered on the nearest **Block Environment** (defined by nested curly braces \`{}\`), protecting them from leaking into outer scopes.
2. **Temporal Dead Zone (TDZ)**: When a block containing \`let\` or \`const\` is entered, memory is allocated, but V8 flags the binding as "uninitialized". Any access to this binding before execution passes the declaration statement throws a \`ReferenceError\`.
3. **Immutability binding**: \`const\` creates a read-only reference to a value. The variable binding cannot be reassigned, but the values inside objects/arrays it points to remain fully mutable.

**Tricky Code Scenarios & Gotchas**
- **Global Object Leak**:
  \`\`\`javascript
  var a = 1; // Attached to window/global scope (window.a === 1)
  let b = 2; // Stays inside declarative global environment (window.b === undefined)
  \`\`\`
- **Loops and Closures**:
  \`\`\`javascript
  for (var i = 0; i < 3; i++) {
    setTimeout(() => console.log(i), 10); // Prints 3, 3, 3 (shared variable reference)
  }
  for (let j = 0; j < 3; j++) {
    setTimeout(() => console.log(j), 10); // Prints 0, 1, 2 (new block binding per iteration)
  }
  \`\`\`

**Architectural Rationale**
\`let\` and \`const\` were introduced in ES6 to eliminate variable-leaking bugs, variable redeclarations, and hoisting confusion. \`const\` should be the default declaration keyword, as it makes variable state predictable and helps compiler JIT engines optimize references.

**Pro-Level Interview Tip**
Emphasize that \`const\` prevents **reassignment**, not **mutation**. Explain that using block scoping eliminates memory leaks and prevents accidental global scope pollution.`
  },
  "How does the 'this' keyword work?": {
    answer: `**Core Concept (TL;DR)**
In JavaScript, the \`this\` keyword is a reference resolved dynamically at runtime indicating the execution context of the executing function. Its value is determined by **how the function is called** (the call-site), rather than where it is defined, with the exception of lexically-bound arrow functions.

${getObjectPrototypeSvg("Method lookup determines binding context")}

**Under-the-Hood Mechanics**
V8 resolves \`this\` using five binding rules based on the invocation call-site:
1. **Default Binding**: Called as a standalone function (e.g., \`foo()\`). In strict mode (\`"use strict"\`), \`this\` is \`undefined\`. In non-strict mode, it defaults to the global object (\`window\` or \`global\`).
2. **Implicit Binding**: Called as a method of an object (e.g., \`obj.foo()\`). \`this\` references \`obj\`.
3. **Explicit Binding**: Called using \`call()\`, \`apply()\`, or \`bind()\`. \`this\` is explicitly set to the first argument.
4. **New Binding**: Invoked with the \`new\` keyword. \`this\` points to the newly instantiated object.
5. **Lexical Binding**: In arrow functions (\`() => {}\`), \`this\` is captured from the parent scope's execution context at creation time. It cannot be overridden by explicit binding.

**Tricky Code Scenarios & Gotchas**
- **Implicit Lost**:
  \`\`\`javascript
  const obj = {
    name: "Arvind",
    greet() { console.log(this.name); }
  };
  const unboundGreet = obj.greet;
  unboundGreet(); // Prints undefined (falls back to default binding!)
  \`\`\`
- **Arrow Functions inside Objects**:
  \`\`\`javascript
  const myObj = {
    name: "Codepad",
    sayName: () => console.log(this.name) // arrow function inherits global scope!
  };
  myObj.sayName(); // Prints undefined
  \`\`\`

**Architectural Rationale**
Dynamic binding of \`this\` allows writing highly reusable methods that operate on different context objects dynamically, without hardcoding constructor references. Arrow functions enforce lexical scoping to resolve issues in event handlers and timeouts where developers historically had to use \`const self = this;\`.

**Pro-Level Interview Tip**
Structure your answer around the five precedence rules. Remember that **new binding** and **explicit binding** take precedence over **implicit binding**, and **arrow functions** completely bypass dynamic binding.`
  },
  "What is the prototype chain?": {
    answer: `**Core Concept (TL;DR)**
The prototype chain is JavaScript's implementation of inheritance. Every object contains a private link (\`[[Prototype]]\`, exposed as \`__proto__\`) pointing to a prototype object. When a property is accessed, the JS engine walks up this link chain recursively until the property is found, or it reaches \`null\`.

${getObjectPrototypeSvg("Object property lookup walks up the prototype chain")}

**Under-the-Hood Mechanics**
1. **Property Lookup**: When V8 executes \`obj.prop\`, it checks if \`prop\` is an "own property" of \`obj\` (stored directly on the object's memory struct). If not, V8 accesses \`obj.__proto__\` and searches there. This process continues up the chain.
2. **Prototype Chain Termination**: The ultimate root of the chain is \`Object.prototype.__proto__\`, which points to \`null\`.
3. **Shadowing**: If \`obj\` has a property named \`toString\`, it "shadows" (overrides) the \`toString\` method on \`Object.prototype\` because the lookup stops at the first match.
4. **Memory Allocation**: Sharing methods on \`Constructor.prototype\` means only one copy of the function is created in memory, rather than duplicating the function closure for every object instance.

**Tricky Code Scenarios & Gotchas**
- **Runtime Chain Modification**:
  \`\`\`javascript
  const obj = {};
  Object.setPrototypeOf(obj, protoParent); // Extremely slow in JIT compilers!
  // Setting PrototypeOf breaks V8's "Hidden Classes" (Shapes) optimizations, forcing slow lookup paths.
  \`\`\`
- **Checking Own Properties**:
  \`\`\`javascript
  const parent = { inheritedProp: true };
  const child = Object.create(parent);
  console.log("inheritedProp" in child); // true
  console.log(child.hasOwnProperty("inheritedProp")); // false
  \`\`\`

**Architectural Rationale**
Prototypes support object-oriented patterns in a highly memory-efficient way. By delegating lookup paths rather than copying methods dynamically, prototype chains save significant RAM when instantiating thousands of object nodes.

**Pro-Level Interview Tip**
Explain why modifying \`[[Prototype]]\` at runtime (via \`__proto__\` or \`Object.setPrototypeOf\`) is a major performance bottleneck in V8. Mention JIT compiler shapes and "Inline Caching" offsets.`
  },
  "What is a Promise and what are its states?": {
    answer: `**Core Concept (TL;DR)**
A Promise is a placeholder object representing the eventual success or failure of an asynchronous operation. It acts as an event distributor that transitions through mutually exclusive states, scheduling consumer callbacks onto the Microtask Queue.

${getPromiseStateSvg("Promise lifecycle transition diagram")}

**Under-the-Hood Mechanics**
A Promise exists in one of three states:
1. **Pending**: Initial state; the asynchronous operation is still executing.
2. **Fulfilled**: The operation completed successfully. The promise holds a permanent value.
3. **Rejected**: The operation failed. The promise holds a permanent error/reason.

State transitions are **one-way and permanent** (from Pending to either Fulfilled or Rejected). Once settled, a promise's state and value are immutable. Adding \`.then()\` or \`.catch()\` handlers on an already-settled promise will immediately schedule their callbacks to run asynchronously in the next microtask sweep.

**Tricky Code Scenarios & Gotchas**
- **Promise Executor is Synchronous**:
  \`\`\`javascript
  console.log("1");
  new Promise((resolve) => {
    console.log("2"); // The executor runs synchronously!
    resolve();
  }).then(() => console.log("4"));
  console.log("3");
  // Output: 1, 2, 3, 4
  \`\`\`
- **Resolving Multiple Times**:
  \`\`\`javascript
  new Promise((resolve, reject) => {
    resolve("success");
    reject("fail"); // Ignored: state is already locked as Fulfilled
  }).then(console.log); // Prints "success"
  \`\`\`

**Architectural Rationale**
Promises were introduced in ES6 to solve "callback hell" and establish a standardized, clean asynchronous contract. They support robust error propagation, compose naturally (via combinators), and leverage the Microtask Queue to ensure prompt asynchronous execution.

**Pro-Level Interview Tip**
Emphasize that the Promise **executor function runs synchronously**, whereas the **resolution callbacks (.then/.catch) execute asynchronously** via the Microtask Queue.`
  },
  "How does async/await work?": {
    answer: `**Core Concept (TL;DR)**
\`async/await\` is a syntax wrapper built on top of Generators and Promises. It allows asynchronous, non-blocking code to be written and read sequentially like synchronous code, yielding thread control back to the event loop at each \`await\` expression.

${getEventLoopSvg("await yields execution to the microtask queue", "promise")}

**Under-the-Hood Mechanics**
1. **Async Return Binding**: Declaring a function as \`async\` forces it to return a Promise. If a primitive is returned, V8 wraps it using \`Promise.resolve(value)\`.
2. **Generator State Suspension**: Under the hood, \`async/await\` is compiled into a **Generator** structure where each \`await\` acts as a state suspension point (\`yield\`).
3. **Microtask Queue Continuation**: When the JS engine hits \`await promise;\`, it yields execution context, pushes a resolution handler to the Microtask Queue, suspends the function's call frame, and resumes execution of the main thread. When the awaited promise settles, the generator resumes with the resolved value.

**Tricky Code Scenarios & Gotchas**
- **The Async Waterfall Trap**:
  \`\`\`javascript
  // Bad: sequential awaits cause slow waterfalls (total time: 2s)
  const a = await fetchA(); // 1s
  const b = await fetchB(); // 1s
  
  // Good: run in parallel (total time: 1s)
  const [resA, resB] = await Promise.all([fetchA(), fetchB()]);
  \`\`\`
- **Try/Catch Scope Isolation**:
  Any error thrown in an awaited promise is converted into a throw statement inside the generator, which is why asynchronous errors can be caught using standard try-catch blocks.

**Architectural Rationale**
Async/await simplifies callback logic and improves stack traces. Unlike chains of \`.then()\`, suspended generator functions retain their lexical context, making debugging easier and code significantly more readable.

**Pro-Level Interview Tip**
Explain that \`await\` does not block the thread. It suspends the local execution context stack frame and yields control back to the event loop, scheduling the remainder of the function on the Microtask Queue.`
  },
  "What is currying?": {
    answer: `**Core Concept (TL;DR)**
Currying is a functional programming technique where a function with multiple arguments is transformed into a nested chain of single-argument (unary) closures. Each invocation returns a new function capturing arguments lexically until all parameters are collected.

${getMemoryRefSvg("Curried closures capture parameters in lexical scope")}

**Under-the-Hood Mechanics**
Currying relies entirely on **closures** and **lexical scoping**:
1. When a curried function is invoked, the engine creates a new Execution Context and scope environment.
2. Instead of performing computation, the function returns a nested closure.
3. Because of lexical scoping rules, the nested function retains reference pointers to all variables in the parent environment record.
4. These environment records remain in the memory heap (not garbage collected) as long as the returned closure is referenced in the program.

**Tricky Code Scenarios & Gotchas**
- **Infinite Currying implementation**:
  \`\`\`javascript
  function add(a) {
    return function(b) {
      if (b !== undefined) return add(a + b);
      return a;
    };
  }
  console.log(add(1)(2)(3)()); // Prints 6
  \`\`\`
- **Memory Overhead**:
  Extensive use of nested currying prevents V8 from garbage collecting the captured arguments, which can build up memory pressure in resource-constrained environments.

**Architectural Rationale**
Currying enables **partial application**, allowing developers to create specialized variations of a generic function. This makes code modular, highly reusable, and facilitates pure functional pipelines.

**Pro-Level Interview Tip**
Explain currying in the context of closures and execution memory retention. Use terms like "lexical environment capture" and "partial application" to show senior-level design knowledge.`
  },
  "What is a generator function?": {
    answer: `**Core Concept (TL;DR)**
A generator function (\`function*\`) is a special execution context that can pause its code execution mid-stream, yield a value to the caller, and resume later at the exact line of suspension, maintaining its lexical state across invocations.

${getPromiseStateSvg("Generators transition between active and suspended states")}

**Under-the-Hood Mechanics**
1. **Iterator Protocol**: Calling a generator does not run its body. Instead, it returns an **Iterator Object** containing a \`next()\` method.
2. **Suspension Points**: When \`iterator.next()\` is called, the function executes until it hits a \`yield\` expression.
3. **Yielding State**: The engine pauses the function, captures the local stack frame variables, and returns \`{ value: yieldedValue, done: false }\`.
4. **Bidirectional Values**: The caller can pass arguments back into the generator via \`iterator.next(inputValue)\`. The \`inputValue\` becomes the evaluation result of the suspended \`yield\` expression inside the generator.

**Tricky Code Scenarios & Gotchas**
- **Passing values on first next()**:
  \`\`\`javascript
  function* test() {
    const input = yield 1;
    console.log("Input:", input);
  }
  const it = test();
  it.next("ignored"); // First next() starts execution; passed value is discarded!
  it.next("received"); // Prints "Input: received"
  \`\`\`
- **Return vs Yield**:
  A \`return\` statement immediately transitions the iterator state to \`{ value: val, done: true }\`, terminating any subsequent yields.

**Architectural Rationale**
Generators provide **lazy evaluation** and custom iteration protocols, allowing you to generate infinite sequences (e.g. ID generators, pagination streams) with minimal memory overhead because values are generated on-demand rather than stored in arrays.

**Pro-Level Interview Tip**
Explain that generators are the foundation of modern asynchronous task managers (like Redux-Saga or the async/await spec), showcasing how they support cooperative multitasking.`
  },
  "What is memoization?": {
    answer: `**Core Concept (TL;DR)**
Memoization is an optimization technique that caches the return values of expensive pure functions based on their input arguments. Subsequent calls with identical inputs immediately return the cached result, bypassing redundant calculations.

${getMemoryRefSvg("Memoization stores function results in cache dictionaries")}

**Under-the-Hood Mechanics**
1. **Cache Dictionary**: The memoized wrapper stores a lookup dictionary (typically a \`Map\` or \`Object\`) in its closure.
2. **Key Serialization**: Arguments must be converted into a hashable key (e.g., stringifying arguments).
3. **Pure Function Requirement**: Memoization only works on **pure functions** (where identical inputs always yield identical outputs without side effects). If a function depends on external variables or mutations, memoization breaks correctness.

**Tricky Code Scenarios & Gotchas**
- **Non-Primitive Argument Keys**:
  \`\`\`javascript
  // Standard memoizers use JSON.stringify or simple string keys
  // Passing { id: 1 } and { id: 2 } can hash to "[object Object]" without proper serialization, returning incorrect cached results!
  \`\`\`
- **Memory Growth (Memory Leak)**:
  An unbounded cache will grow indefinitely in memory. To prevent crashes, memoized caches in production should use an **LRU (Least Recently Used) cache** policy or map keys weakly using a \`WeakMap\` when dealing with object keys.

**Architectural Rationale**
Memoization trades **memory space** for **CPU time**. It is highly effective for heavy computations, recursive algorithms (like Fibonacci), and expensive rendering recalculations (e.g., \`useMemo\` in React).

**Pro-Level Interview Tip**
Always discuss cache eviction policies (like LRU) and memory management (using WeakMaps) to show you understand the real-world operational trade-offs of caching.`
  },
  "What is the difference between slice and splice?": {
    answer: `**Core Concept (TL;DR)**
\`slice\` is a non-mutating query operation that returns a shallow copy of a subarray, while \`splice\` is a mutating operation that modifies the array in-place by adding, removing, or replacing elements.

${getMemoryRefSvg("slice creates a copy, splice modifies in-place")}

**Under-the-Hood Mechanics**
The operations differ fundamentally in memory footprint and mutations:
1. **Memory Allocation**:
   - \`slice(start, end)\` allocates a new array block in the heap and copies references from the original array. The original array is untouched.
   - \`splice(start, count, ...items)\` operates on the array in-place, shifting elements in memory to accommodate insertions or deletions, and returning a new array containing the deleted elements.
2. **JIT Optimizations**: Modifying array lengths dynamically via \`splice\` forces JIT compilers (like V8) to adjust internal array layouts, potentially triggering array element transitions (e.g. from Packed to Holey elements), which degrades JIT execution performance.

**Tricky Code Scenarios & Gotchas**
- **Reference Mutation**:
  \`\`\`javascript
  const arr = [{ val: 1 }, { val: 2 }];
  const sliced = arr.slice();
  sliced[0].val = 99; // Mutates both! slice only copies object references (shallow copy).
  \`\`\`
- **Negative Indexes**: Both support negative parameters representing offsets from the end of the array (e.g., \`arr.slice(-1)\` gets the last element).

**Architectural Rationale**
\`slice\` complies with functional programming principles of immutability and pure functions, whereas \`splice\` is an imperative in-place array manipulation tool designed for high-performance memory recycling.

**Pro-Level Interview Tip**
Highlight that \`slice\` is a safe, pure operation, whereas \`splice\` is destructive. Use this opportunity to discuss the performance implications of in-place memory shifts vs new memory allocation.`
  },
  "What is the difference between call, apply, and bind?": {
    answer: `**Core Concept (TL;DR)**
\`call\`, \`apply\`, and \`bind\` are methods on \`Function.prototype\` used to explicitly bind context (\`this\`). \`call\` and \`apply\` invoke the target function immediately (accepting arguments individually or as an array, respectively), while \`bind\` returns a new bound function wrapper.

${getObjectPrototypeSvg("call, apply, and bind bind function contexts")}

**Under-the-Hood Mechanics**
- **\`call(context, arg1, arg2...)\`**: Invokes the function immediately, passing arguments as parameters.
- **\`apply(context, [argsArray])\`**: Invokes the function immediately, mapping the array elements to parameters.
- **\`bind(context, arg1...)\`**: Creates a new function object whose internal \`[[BoundThis]]\` property is set to the provided context. When invoked, it sets up an execution frame with the bound context and pre-filled arguments.

**Tricky Code Scenarios & Gotchas**
- **Double Binding**:
  \`\`\`javascript
  function test() { console.log(this.name); }
  const bound1 = test.bind({ name: "First" });
  const bound2 = bound1.bind({ name: "Second" });
  bound2(); // Prints "First"! A bound function's internal [[BoundThis]] is immutable and cannot be rebound.
  \`\`\`
- **Losing Context on Callbacks**:
  Passing an object method as a callback (e.g., \`setTimeout(obj.method, 10)\`) drops the context unless it is explicitly bound (\`obj.method.bind(obj)\`) or wrapped in an arrow function.

**Architectural Rationale**
Explicit binding enables method sharing across independent objects without establishing complex inheritance chains, facilitating functional composition.

**Pro-Level Interview Tip**
Explain that \`bind\` supports currying (pre-filling arguments at binding time). Highlight that subsequent attempts to re-bind a bound function will fail to override the original context.`
  },
  "How does Array.reduce work?": {
    answer: `**Core Concept (TL;DR)**
\`reduce\` executes a user-provided reducer function on each element of an array sequentially, passing the accumulated result from the previous iteration into the next, resulting in a single aggregated value.

${getMemoryRefSvg("reduce aggregates elements into a single value accumulator")}

**Under-the-Hood Mechanics**
The loop mechanics depend on whether an \`initialValue\` is passed:
1. **With \`initialValue\`**: The accumulator starts as the \`initialValue\`, and the iteration begins at index \`0\`.
2. **Without \`initialValue\`**: V8 skips the first step, assigning the element at index \`0\` as the accumulator, and starts the loop at index \`1\`.
3. **Empty Array Safety**: If the array is empty and no \`initialValue\` is provided, JavaScript throws a \`TypeError\`.

**Tricky Code Scenarios & Gotchas**
- **Missing Initial Value bug**:
  \`\`\`javascript
  const users = [{ name: "A", age: 10 }, { name: "B", age: 20 }];
  // Bug: Accumulator starts as { name: "A" }, and the next iteration attempts to perform object + number!
  const totalAge = users.reduce((sum, user) => sum + user.age); 
  // Fix: Pass 0 as the initial value
  const correctAge = users.reduce((sum, user) => sum + user.age, 0);
  \`\`\`

**Architectural Rationale**
\`reduce\` is the most powerful array method because it is a universal fold operator. It can implement \`map\`, \`filter\`, \`find\`, and object transformations in a single iteration sweep.

**Pro-Level Interview Tip**
Explain the empty array safety case and illustrate how to compose multiple utility operations into a single \`reduce\` pass to minimize memory allocation overhead.`
  },
  "What is the difference between Promise.all, allSettled, race, and any?": {
    answer: `**Core Concept (TL;DR)**
These static methods coordinate concurrent asynchronous executions. They differ in their success requirements and rejection behaviors (fail-fast vs. complete aggregation).

${getPromiseStateSvg("Promise combinators coordinate task lists")}

**Under-the-Hood Mechanics**
1. **\`Promise.all\` (All-or-Nothing)**:
   - Resolves when **all** input promises resolve successfully.
   - Rejects immediately upon the **first** rejection (fail-fast), throwing away other pending operations.
2. **\`Promise.allSettled\` (Safe Collection)**:
   - Resolves when **all** inputs settle (either resolve or reject).
   - Never rejects. Returns an array of objects: \`{ status: "fulfilled", value: val }\` or \`{ status: "rejected", reason: err }\`.
3. **\`Promise.race\` (First Settled Wins)**:
   - Resolves or rejects as soon as the **first** promise settles.
4. **\`Promise.any\` (First Success Wins)**:
   - Resolves as soon as the **first** promise succeeds.
   - Rejects with an \`AggregateError\` only if **all** inputs fail.

**Tricky Code Scenarios & Gotchas**
- **Orphan Promises in Promise.all**:
  If \`Promise.all\` rejects early due to a failure, the remaining pending promises **continue running in the background**; they are not cancelled by the JS engine automatically.
- **Empty Array Inputs**:
  - \`Promise.all([])\` resolves synchronously to \`[]\`.
  - \`Promise.any([])\` rejects synchronously with an \`AggregateError\`.

**Architectural Rationale**
These combinators allow control over network pipelines, enabling fail-fast error handling (\`all\`), parallel tracking (\`allSettled\`), request timeouts (\`race\`), and redundant fallback queries (\`any\`).

**Pro-Level Interview Tip**
Mention that \`Promise.all\` rejections do not cancel outstanding network operations, meaning you must clean up manually (e.g. using \`AbortController\`) to prevent resources from leaking.`
  },
  "What is the difference between microtasks and macrotasks?": {
    answer: `**Core Concept (TL;DR)**
Microtasks and Macrotasks are separate asynchronous execution queues with different loop priorities. Microtasks (Promises, process.nextTick) are executed completely at the end of the current task, while Macrotasks (timers, network events) run one per loop cycle.

${getEventLoopSvg("Event Loop prioritizing microtasks before macrotasks", "promise")}

**Under-the-Hood Mechanics**
At the heart of asynchronous JavaScript is the Event Loop iteration workflow:
1. **Draining Current Frame**: Execute synchronous code on the Call Stack.
2. **Microtask Phase**: The engine checks the **Microtask Queue**. It executes callbacks, draining the queue completely. If microtasks queue more microtasks, they run too, blocking the event loop until empty.
3. **Rendering Phase**: Check if rendering is needed (typically every 16.7ms for 60fps), run \`requestAnimationFrame\`, and perform a paint.
4. **Macrotask Phase**: Dequeue and execute exactly **one** task from the **Macrotask Queue** (e.g. \`setTimeout\`).
5. **Loop Repeat**.

**Tricky Code Scenarios & Gotchas**
- **Execution Order Quiz**:
  \`\`\`javascript
  setTimeout(() => console.log("Timeout"), 0); // Macrotask
  Promise.resolve().then(() => console.log("Promise")); // Microtask
  console.log("Sync");
  // Output: Sync, Promise, Timeout
  \`\`\`
- **Blocking the Event Loop**:
  \`\`\`javascript
  function block() {
    Promise.resolve().then(block); // Recursively queues microtasks, blocking rendering and timers indefinitely!
  }
  \`\`\`

**Architectural Rationale**
Microtasks guarantee that asynchronous callbacks (like Promise resolvers) execute as close to the initiating action as possible, before layout recalculations, preventing UI flickers.

**Pro-Level Interview Tip**
Emphasize that the event loop executes **the entire microtask queue** to completion before it picks up the next **single macrotask** or performs rendering.`
  },
  "What is a Proxy in JavaScript?": {
    answer: `**Core Concept (TL;DR)**
A Proxy wraps a target object to intercept and customize fundamental operations (like property lookups, assignments, enumeration, function calls) by using trap handlers.

${getObjectPrototypeSvg("Proxy intercepts property get/set calls via trap layers")}

**Under-the-Hood Mechanics**
1. **Target and Handler**: The Proxy is initialized with a target object and a handler containing "traps" (e.g., \`get\`, \`set\`, \`has\`, \`deleteProperty\`).
2. **Interception**: When operations are performed on the Proxy object, V8 intercepts the call and runs the corresponding trap function instead of mutating the target directly.
3. **Reflect API**: Trap functions usually use \`Reflect\` (e.g., \`Reflect.get(target, prop, receiver)\`) to forward the default behavior to the target.

**Tricky Code Scenarios & Gotchas**
- **Reactivity tracking**:
  \`\`\`javascript
  const target = { count: 0 };
  const proxy = new Proxy(target, {
    set(obj, prop, value) {
      console.log(\`Setting \${prop} to \${value}\`);
      return Reflect.set(obj, prop, value);
    }
  });
  proxy.count = 1; // Logs: Setting count to 1
  \`\`\`
- **Target Identity Issues**:
  If the target object has internal private properties (like map size in \`new Map()\`), invoking methods on the proxy directly can throw errors because the receiver context is the Proxy, not the target. You must bind methods to the target.

**Architectural Rationale**
Proxies provide powerful metaprogramming capabilities, forming the foundation of reactivity systems in modern frameworks (such as Vue 3's composition API) and mock testing utilities.

**Pro-Level Interview Tip**
Mention how Proxies utilize the \`Reflect\` API to keep default behaviors intact, and show how reactivity works by using \`get\` traps to collect dependencies and \`set\` traps to trigger UI updates.`
  },
  "What does the 'new' keyword do?": {
    answer: `**Core Concept (TL;DR)**
The \`new\` keyword instantiates a constructor function, allocating a blank object, linking its prototype, executing the constructor with context bound to the object, and returning the instance.

${getObjectPrototypeSvg("new binds prototype links and constructor execution")}

**Under-the-Hood Mechanics**
When you run \`new Constructor(...args)\`, the engine executes four steps:
1. **Allocation**: Creates a new, blank plain JavaScript object: \`const obj = {};\`.
2. **Prototype Linkage**: Sets the object's internal prototype (\`__proto__\`) to reference the constructor's \`prototype\` object: \`Object.setPrototypeOf(obj, Constructor.prototype);\`.
3. **Execution/Binding**: Invokes the constructor function, binding the \`this\` context to the newly created object: \`const result = Constructor.apply(obj, args);\`.
4. **Return Resolution**: Inspects the constructor's return value. If it returns a non-primitive object, that object is returned. Otherwise, the object created in Step 1 is returned.

**Tricky Code Scenarios & Gotchas**
- **Explicit Object Return Override**:
  \`\`\`javascript
  function Person(name) {
    this.name = name;
    return { name: "Override" }; // Overrides constructor instantiation!
  }
  console.log(new Person("Arvind").name); // Prints "Override"
  \`\`\`
- **Primitive Return**:
  \`\`\`javascript
  function Car(model) {
    this.model = model;
    return "Toyota"; // String is primitive, ignored by new operator!
  }
  console.log(new Car("Corolla").model); // Prints "Corolla"
  \`\`\`

**Architectural Rationale**
The \`new\` operator supports class-like instantiation patterns, matching runtime semantics of prototype chains with object instantiation context.

**Pro-Level Interview Tip**
Outline the four steps of the constructor sequence in order. Explain how return override rules differentiate object returns from primitive returns.`
  },
  "Explain event delegation.": {
    answer: `**Core Concept (TL;DR)**
Event delegation is a performance optimization pattern where a single event listener is attached to a parent container to manage events fired by multiple child elements, leveraging DOM event bubbling.

${getBubblingSvg("Event delegation leverages event bubbling upward to parent elements")}

**Under-the-Hood Mechanics**
1. **Bubble Phase Propagation**: When an event occurs on a child node, it bubbles up through its ancestors in the DOM tree.
2. **Unified Handling**: By listening to the container, we intercept the event on its way up.
3. **Dynamic Filtering**: Inside the handler, we inspect \`event.target\` (the actual clicked node) to determine if it matches the child nodes we care about, utilizing APIs like \`element.matches()\`.

**Tricky Code Scenarios & Gotchas**
- **Nested Child Elements**:
  If a button contains a nested span or icon, \`event.target\` will refer to the span/icon instead of the button.
  \`\`\`javascript
  // Fix: Use event.target.closest('button') to find the target element context!
  container.addEventListener("click", (e) => {
    const button = e.target.closest("button");
    if (button && container.contains(button)) {
      console.log("Button clicked:", button.id);
    }
  });
  \`\`\`
- **Non-Bubbling Events**: Some DOM events (like \`focus\`, \`blur\`, \`mouseenter\`, \`mouseleave\`) do not bubble. To delegate them, you must catch them in the **Capturing Phase** by setting \`useCapture = true\` in the event listener.

**Architectural Rationale**
Event delegation saves memory by replacing thousands of individual element listeners with a single listener. It also supports dynamic DOM manipulation, automatically handling nodes added to the DOM after mounting without requiring new listeners.

**Pro-Level Interview Tip**
Explain how to handle nested elements using \`closest()\` and resolve delegation for non-bubbling events (like \`focus\`) by capturing them instead.`
  },
  "Explain the event loop, call stack, and task queues.": {
    answer: `**Core Concept (TL;DR)**
The Event Loop is the asynchronous scheduler of the JavaScript runtime. It monitors the Call Stack and task queues, dequeuing microtasks and macrotasks sequentially to enable concurrent, non-blocking I/O execution on a single thread.

${getEventLoopSvg("Call Stack triggers microtasks/macrotasks sequentially", "timer")}

**Under-the-Hood Mechanics**
JavaScript executes on a single call stack. To perform non-blocking actions, tasks are offloaded to browser Web APIs (or Node.js thread pools). When asynchronous actions complete, their callbacks enter the task queues:
1. **Call Stack**: Executes synchronous contexts frame-by-frame.
2. **Microtask Queue**: Drains completely after the Call Stack is empty.
3. **Macrotask Queue**: Runs exactly one task per event loop cycle.
4. **Layout & Paint**: Re-renders the display if the frame timer (typically 16.7ms) is ready.

**Tricky Code Scenarios & Gotchas**
- **Starving the Loop**:
  If a microtask continuously schedules more microtasks, the event loop remains trapped in the microtask phase, stalling macrotasks (like timers) and blocking rendering, causing the browser tab to freeze.
- **rAF vs SetTimeout**:
  \`requestAnimationFrame\` callbacks execute as part of the rendering pipeline, making them smoother for visual layouts compared to \`setTimeout\` macrotasks.

**Architectural Rationale**
The event loop design enables high-concurrency servers (Node.js) and responsive browser UIs without threading overhead, race conditions, or context-switching costs.

**Pro-Level Interview Tip**
Describe the loop lifecycle sequentially (Stack -> Microtasks -> Rendering -> Macrotask). Use terms like "Starving the event loop" and "Frame rendering budget" to show production-level architectural expertise.`
  },
  "What is the event loop?": {
    answer: `**Core Concept (TL;DR)**
The event loop is the concurrency mechanism that coordinates synchronous execution frames on the Call Stack with asynchronously queued tasks, enabling single-threaded, non-blocking asynchronous execution.

${getEventLoopSvg("The Event Loop coordinating stack and queues", "timer")}

**Under-the-Hood Mechanics**
The loop coordinates execution across three primary environments:
1. **Call Stack**: Runs synchronous code blocks.
2. **Microtask Queue**: Holds callbacks from settled Promises and \`queueMicrotask\`. This queue is completely drained after each execution context finishes.
3. **Macrotask Queue**: Holds callbacks from timers (\`setTimeout\`, \`setInterval\`) and I/O events.
4. **Rendering Pipeline**: Executes animations (\`requestAnimationFrame\`) and repaints the screen before running the next macrotask.

**Tricky Code Scenarios & Gotchas**
- **Call Stack vs Task execution**:
  \`\`\`javascript
  setTimeout(() => console.log("Timeout"), 0);
  Promise.resolve().then(() => console.log("Promise"));
  console.log("Stack");
  // Output: Stack -> Promise -> Timeout
  \`\`\`
  The microtask runs before the next macrotask is picked up, even if the timer has a delay of 0ms.

**Architectural Rationale**
By offloading slow tasks (e.g. database reads, network fetch) to system thread pools and returning callbacks via queues, JavaScript can handle massive concurrency scales without lock-contention overhead.

**Pro-Level Interview Tip**
Contrast microtask execution behaviors with macrotask phases, explaining how V8 ensures immediate execution of Promise resolvers to prevent frame rendering delay.`
  },
  "What is event bubbling and capturing?": {
    answer: `**Core Concept (TL;DR)**
Event bubbling and capturing are the two phases of event propagation in the DOM. Capturing propagates events down from the window object to the target element, while bubbling propagates events back up from the target to the window.

${getBubblingSvg("Events propagate down in capturing, up in bubbling phases")}

**Under-the-Hood Mechanics**
An event traverses the DOM in three phases:
1. **Capturing Phase**: The event starts at the \`Window\` and travels down the DOM tree through parents to the target node.
2. **Target Phase**: The event fires directly on the target element: \`event.target\`.
3. **Bubbling Phase**: The event travels back up the tree, firing on parents until it reaches the \`Window\` object.

By default, \`element.addEventListener(type, cb)\` listens to the **Bubbling Phase**. To catch events during the **Capturing Phase**, pass \`true\` or \`{ capture: true }\` as the third parameter.

**Tricky Code Scenarios & Gotchas**
- **stopPropagation vs preventDefault**:
  - \`e.stopPropagation()\` prevents the event from traveling further up or down the propagation chain.
  - \`e.preventDefault()\` cancels the browser's default behavior for that event (e.g., following a link, submitting a form), but does not stop it from propagating.
- **Target vs CurrentTarget**:
  - \`e.target\` refers to the element that triggered the event (innermost node).
  - \`e.currentTarget\` refers to the element that the listener is attached to.

**Architectural Rationale**
Propagation allows child events to be delegated to containers, supporting unified event routing and clean decoupling of layout nodes from event listeners.

**Pro-Level Interview Tip**
Explain the differences between \`target\` and \`currentTarget\`, and show how to use \`useCapture\` in \`addEventListener\` to intercept events early.`
  },
  "What is debouncing and throttling?": {
    answer: `**Core Concept (TL;DR)**
Debouncing and throttling are optimization techniques used to limit the execution rate of a function responding to high-frequency events. Debouncing delays execution until a quiet period occurs, while throttling limits execution to once per time interval.

${getTimelineSvg("Debouncing waits for pause, Throttling limits rates", "debounce")}

**Under-the-Hood Mechanics**
- **Debounce**:
  - Starts a timer on each event trigger.
  - If a new event fires before the timer completes, the previous timer is cancelled, and a new one starts.
  - The function only executes once the timer completes.
  - Excellent for input validation, search inputs, and auto-save fields.
- **Throttle**:
  - Sets a block window once executed.
  - Ignores or buffers intermediate event triggers until the block window expires.
  - Guarantees execution at a regular interval.
  - Excellent for scroll event trackers, resize layouts, and drag-and-drop handles.

**Tricky Code Scenarios & Gotchas**
- **Losing Closure State**:
  Debounce/throttle wrappers rely on closures to maintain timer states (\`timeoutId\` or \`lastRunTime\`).
  \`\`\`javascript
  // Bug: Instantiating the wrapper inside a React functional component render loop creates a new closure on every render!
  // Fix: Wrap the debounced function in a hook (e.g., useCallback or useRef) to persist the closure.
  \`\`\`

**Architectural Rationale**
These optimization strategies reduce execution pressure on CPU, memory, and networking pipelines, preventing application lag and eliminating server-side rate limit errors (like HTTP 429).

**Pro-Level Interview Tip**
Illustrate how debouncing helps search auto-suggest fields, and how throttling prevents performance lags on layout scroll event listeners.`
  }
};

async function main() {
  const dir = join(process.cwd(), "prisma", "data");
  const files = readdirSync(dir).filter((f) => /^js-augments.*\.json$/.test(f)).sort();

  let enhancedCount = 0;

  for (const file of files) {
    const filePath = join(dir, file);
    const data = JSON.parse(readFileSync(filePath, "utf8"));
    
    let modified = false;
    for (const item of data) {
      if (enhancements[item.title]) {
        item.answer = enhancements[item.title].answer;
        modified = true;
        enhancedCount++;
      }
    }
    
    if (modified) {
      writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`Updated: ${file}`);
    }
  }

  console.log(`Successfully enhanced ${enhancedCount} existing questions with animated SVGs.`);
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
