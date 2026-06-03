/**
 * Centralized Gemini model name for AI Interview endpoints. Update here when
 * Google rotates models — touching one constant avoids per-route drift.
 * `gemini-1.5-flash` was retired; use a current model from the v1beta catalog.
 */
export const AI_INTERVIEW_GEMINI_MODEL =
  process.env.AI_INTERVIEW_GEMINI_MODEL || "gemini-2.5-flash";

export interface AIInterviewTemplateDef {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  starterFiles: Record<string, string>;
  testsCode: string;
  /** Coding surface kind. Defaults to "frontend" (Sandpack/React) when unset.
   *  "backend"/"dsa" render a Monaco + Run console surface (Piston). */
  kind?: "frontend" | "backend" | "dsa";
  /** Execution language for backend/dsa surfaces (/api/execute + Monaco). */
  language?: string;
  /** Non-executable framework label (e.g. "React", "Express") — steers AI
   *  questions only. */
  frameworkLabel?: string;
}

export const AI_INTERVIEW_TEMPLATES: AIInterviewTemplateDef[] = [
  {
    id: "react-todo-pagination",
    title: "React Todo with Pagination",
    kind: "frontend",
    frameworkLabel: "React",
    description: `Build an interactive and responsive Todo List in React with paginated controls. State management should dynamically slice the list array based on active page index limits, manage input validation, and render disabled states for buttons when boundary limits are hit.

### 📋 Core Requirements

1. **Pagination State**
   - Track \`currentPage\` (starts at \`1\`).
   - Limit items per page (\`itemsPerPage = 3\`).

2. **Filter Logic**
   - Filter todos based on active selection: \`All\`, \`Active\`, or \`Completed\`.

3. **Slice Logic**
   - Slice the filtered list so that only a maximum of 3 items display for the active page index.

4. **Input Validation**
   - Prevent adding empty or whitespace-only todos.
   - Clear the input field automatically upon successful addition.

5. **Boundary Safeguards**
   - Disable the **Prev** button when on Page 1.
   - Disable the **Next** button when on the last page.

---

### 📂 File Structure
- \`App.js\`: Contains the main component structure and state. **This is where you should write your pagination and filter implementation.**
- \`styles.css\`: Glassmorphic premium dashboard styles. Do not modify unless tweaking visuals.

---

### 💡 Pro Tip
To slice a list dynamically in React, you can compute:
\`\`\`javascript
const startIndex = (currentPage - 1) * itemsPerPage;
const paginatedTodos = filteredTodos.slice(startIndex, startIndex + itemsPerPage);
\`\`\`
Ensure that if the filtered list becomes empty, the pagination index resets gracefully!`,
    estimatedMinutes: 30,
    testsCode: `// Automated checks for React Todo Pagination
checkStateManagement() {
  const hasUseState = code.includes("useState");
  const hasSlice = code.includes("slice") || code.includes("itemsPerPage");
  const hasDisabled = code.includes("disabled");
  return hasUseState && hasSlice && hasDisabled;
}`,
    starterFiles: {
      "/App.js": `import React, { useState } from "react";
import "./styles.css";

export default function App() {
  const [todos, setTodos] = useState([
    { id: 1, text: "Configure Prisma database connections", completed: true },
    { id: 2, text: "Set up Google Gemini conversational orchestrators", completed: true },
    { id: 3, text: "Design premium split-pane workspace dashboard", completed: false },
    { id: 4, text: "Integrate Monaco code editor with Sandpack compiler", completed: false },
    { id: 5, text: "Build automated recommendation ranking metrics", completed: false },
  ]);
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState("all"); // 'all' | 'active' | 'completed'

  // TODO: Build your paginated Todo List here!
  // 1. Pagination State: currentPage (starts at 1), itemsPerPage (limit: 3)
  // 2. Filter logic: Filter todos based on 'filter' selection
  // 3. Slice logic: Slice the filtered todos to only display 3 items for the current page
  // 4. Input validation: prevent empty todos and clear input upon addition
  // 5. Button bounds check: Disable "Prev" on page 1 and "Next" on the last page

  const handleAddTodo = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const newTodo = {
      id: Date.now(),
      text: input.trim(),
      completed: false,
    };
    setTodos([...todos, newTodo]);
    setInput("");
  };

  const toggleTodo = (id) => {
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  return (
    <div className="todo-app">
      <div className="glow-spotlight" />
      <h1 className="title">Workpad Console</h1>
      <p className="subtitle">Build dynamic React Todo state with slice pagination</p>
      
      <form onSubmit={handleAddTodo} className="input-group">
        <input 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          placeholder="Enter a new mission objective..." 
          className="todo-input"
        />
        <button type="submit" className="add-btn">Add</button>
      </form>

      <div className="filters">
        {["all", "active", "completed"].map(f => (
          <button 
            key={f}
            onClick={() => setFilter(f)} 
            className={"filter-btn " + (filter === f ? "active" : "")}
          >
            {f}
          </button>
        ))}
      </div>

      <ul className="todo-list">
        {/* Replace with paginated list implementation */}
        {todos.map(t => (
          <li key={t.id} className={"todo-item " + (t.completed ? "completed" : "")}>
            <span onClick={() => toggleTodo(t.id)} className="todo-text">
              {t.text}
            </span>
            <button onClick={() => deleteTodo(t.id)} className="delete-btn">×</button>
          </li>
        ))}
      </ul>

      {/* Implement dynamic paginated controls here */}
      <div className="pagination-controls">
        <button className="page-btn">Prev</button>
        <span className="page-indicator">Page 1 of 1</span>
        <button className="page-btn">Next</button>
      </div>
    </div>
  );
}`,
      "/styles.css": `body {
  font-family: 'Outfit', 'Inter', sans-serif;
  background: #0B0F19;
  color: #f3f4f6;
  margin: 0;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 90vh;
}
.todo-app {
  width: 100%;
  max-width: 440px;
  background: rgba(22, 27, 46, 0.7);
  padding: 30px;
  border-radius: 24px;
  border: 1px solid rgba(139, 92, 246, 0.2);
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  backdrop-filter: blur(12px);
  position: relative;
  overflow: hidden;
}
.glow-spotlight {
  position: absolute;
  top: -80px;
  right: -80px;
  width: 160px;
  height: 160px;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%);
  pointer-events: none;
}
.title {
  font-size: 22px;
  font-weight: 900;
  margin: 0 0 6px 0;
  background: linear-gradient(to right, #ffe600, #ff8c00);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-align: center;
}
.subtitle {
  font-size: 12px;
  color: #94a3b8;
  margin: 0 0 25px 0;
  text-align: center;
  line-height: 1.5;
}
.input-group {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}
.todo-input {
  flex: 1;
  padding: 12px 16px;
  border-radius: 12px;
  background: #0b0f19;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #f3f4f6;
  font-size: 13px;
  transition: all 0.2s;
}
.todo-input:focus {
  border-color: #ffe600;
  outline: none;
  box-shadow: 0 0 0 2px rgba(255, 230, 0, 0.1);
}
.add-btn {
  background: #ffe600;
  color: #0b0f19;
  border: none;
  padding: 0 18px;
  border-radius: 12px;
  font-weight: 800;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.add-btn:hover {
  background: #ffd600;
  transform: translateY(-1px);
}
.filters {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}
.filter-btn {
  flex: 1;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.05);
  padding: 6px 12px;
  border-radius: 8px;
  color: #94a3b8;
  font-size: 11px;
  text-transform: uppercase;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.filter-btn:hover {
  background: rgba(255,255,255,0.05);
  color: #f3f4f6;
}
.filter-btn.active {
  background: rgba(139, 92, 246, 0.2);
  border-color: rgba(139, 92, 246, 0.4);
  color: #c084fc;
}
.todo-list {
  list-style: none;
  padding: 0;
  margin: 0 0 25px 0;
  min-height: 180px;
}
.todo-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: rgba(11, 15, 25, 0.5);
  border-radius: 10px;
  margin-bottom: 8px;
  border: 1px solid rgba(255,255,255,0.02);
  transition: all 0.2s;
}
.todo-item:hover {
  background: rgba(11, 15, 25, 0.8);
  border-color: rgba(255, 230, 0, 0.15);
}
.todo-text {
  font-size: 13px;
  cursor: pointer;
  flex: 1;
  user-select: none;
}
.todo-item.completed .todo-text {
  text-decoration: line-through;
  color: #64748b;
}
.delete-btn {
  background: transparent;
  border: none;
  color: rgba(239, 68, 68, 0.6);
  font-size: 18px;
  cursor: pointer;
  padding: 0 5px;
}
.delete-btn:hover {
  color: #ef4444;
}
.pagination-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 20px;
}
.page-btn {
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #f3f4f6;
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.page-btn:hover:not(:disabled) {
  background: #334155;
  border-color: rgba(255, 255, 255, 0.15);
}
.page-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.page-indicator {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}`
    }
  },
  {
    id: "interactive-carousel",
    title: "Interactive Image Carousel",
    kind: "frontend",
    frameworkLabel: "React",
    description: `Build an interactive and responsive image carousel component in React. You must implement cyclic slideshow transitions, hover-triggered auto-pausing, direct slide indicators, and slick visual states.

### 📋 Core Requirements

1. **Autoplay Mechanism**
   - Set up an automatic cycle (\`setInterval\` timer) inside a \`useEffect\` hook.
   - Increment the active slide index every \`3000ms\`.

2. **Memory Leak Safeguards**
   - Clean up active intervals on component unmount and when dependency states change to prevent memory leaks.

3. **Pause on Hover**
   - Pause autoplay dynamically when the candidate's pointer hovers over the main carousel card.
   - Resume autoplay as soon as the mouse leaves the card boundary.

4. **Cyclic Boundaries**
   - Wrap indices gracefully: clicking "Next" on the last slide should loop back to the first; clicking "Previous" on the first should wrap to the last.

5. **Direct Navigation Dots**
   - Render slide indicator dots at the bottom.
   - Clicking a dot must navigate the carousel directly to the selected slide.

---

### 📂 File Structure
- \`App.js\`: Core carousel structure and states. **Implement your timer and hover hooks here.**
- \`styles.css\`: Neon glow-themed responsive styling.`,
    estimatedMinutes: 30,
    testsCode: `// Automated checks for Interactive Carousel
checkCarouselControls() {
  const hasUseState = code.includes("useState");
  const hasAutoplay = code.includes("setInterval") || code.includes("useEffect");
  const hasHover = code.includes("onMouseEnter") && code.includes("onMouseLeave");
  return hasUseState && hasAutoplay && hasHover;
}`,
    starterFiles: {
      "/App.js": `import React, { useState, useEffect, useRef } from "react";
import "./styles.css";

const CAROUSEL_SLIDES = [
  {
    id: 1,
    title: "Quantum Compiler Matrix",
    tag: "ARCH",
    img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80",
    desc: "Optimizing multi-node state graphs with zero leakage."
  },
  {
    id: 2,
    title: "Neural Engine Core",
    tag: "COGNITIVE",
    img: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=500&auto=format&fit=crop&q=80",
    desc: "Running heavy multi-agent weights directly in browser sandboxes."
  },
  {
    id: 3,
    title: "Synthesizer Telemetry",
    tag: "VOICE",
    img: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=500&auto=format&fit=crop&q=80",
    desc: "Real-time speech translation and vocal waveforms monitoring."
  }
];

export default function App() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);

  // TODO: Build your interactive carousel component here!
  // 1. Setup autoplay using useEffect & setInterval: increment slide index every 3000ms
  // 2. Clear intervals on unmount to prevent memory leaks
  // 3. Pause on Hover: Pause autoplay when candidate hover enters card, resume on leave
  // 4. Index cycling boundary calculations (next slide cycles to 0; prev slide cycles to max)
  // 5. Selectors: Clicking bottom indicators goes directly to the selected index

  const handleNext = () => {
    setActiveIndex((prev) => (prev === CAROUSEL_SLIDES.length - 1 ? 0 : prev + 1));
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? CAROUSEL_SLIDES.length - 1 : prev - 1));
  };

  return (
    <div className="carousel-app">
      <h1 className="title">Spectra Slider</h1>
      <p className="subtitle">Construct a resilient hover-pausing cyclic carousel</p>

      {/* Render Carousel Panel */}
      <div className="carousel-card">
        <div className="slide-image-container">
          <img 
            src={CAROUSEL_SLIDES[activeIndex].img} 
            alt={CAROUSEL_SLIDES[activeIndex].title} 
            className="slide-image"
          />
          <span className="slide-tag">{CAROUSEL_SLIDES[activeIndex].tag}</span>
        </div>

        <div className="slide-body">
          <h3 className="slide-title">{CAROUSEL_SLIDES[activeIndex].title}</h3>
          <p className="slide-desc">{CAROUSEL_SLIDES[activeIndex].desc}</p>
        </div>

        {/* Carousel buttons */}
        <button onClick={handlePrev} className="nav-btn prev">❮</button>
        <button onClick={handleNext} className="nav-btn next">❯</button>
      </div>

      {/* Dots and Autoplay telemetry controls */}
      <div className="control-deck">
        <div className="dots-row">
          {/* Loop dots & highlight active index */}
          {CAROUSEL_SLIDES.map((slide, idx) => (
            <span 
              key={slide.id} 
              className={"dot " + (idx === activeIndex ? "active" : "")}
            />
          ))}
        </div>

        <button 
          onClick={() => setAutoplay(!autoplay)} 
          className={"autoplay-toggle " + (autoplay ? "active" : "")}
        >
          Autoplay: {autoplay ? "ON" : "OFF"}
        </button>
      </div>
    </div>
  );
}`,
      "/styles.css": `body {
  font-family: 'Outfit', 'Inter', sans-serif;
  background: #0B0F19;
  color: #f3f4f6;
  margin: 0;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 90vh;
}
.carousel-app {
  width: 100%;
  max-width: 440px;
  background: rgba(22, 27, 46, 0.65);
  padding: 30px;
  border-radius: 28px;
  border: 1px solid rgba(139, 92, 246, 0.2);
  box-shadow: 0 25px 60px rgba(0,0,0,0.5);
  backdrop-filter: blur(16px);
}
.title {
  font-size: 22px;
  font-weight: 900;
  margin: 0 0 6px 0;
  background: linear-gradient(to right, #a855f7, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-align: center;
}
.subtitle {
  font-size: 12px;
  color: #94a3b8;
  margin: 0 0 25px 0;
  text-align: center;
  line-height: 1.5;
}
.carousel-card {
  position: relative;
  background: #0b0f19;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.carousel-card:hover {
  transform: translateY(-4px);
}
.slide-image-container {
  height: 200px;
  position: relative;
  overflow: hidden;
}
.slide-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}
.slide-tag {
  position: absolute;
  top: 15px;
  left: 15px;
  background: rgba(168, 85, 247, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 9px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 6px;
  letter-spacing: 0.1em;
}
.slide-body {
  padding: 20px;
}
.slide-title {
  font-size: 16px;
  font-weight: 800;
  color: #f3f4f6;
  margin: 0 0 8px 0;
}
.slide-desc {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.6;
  margin: 0;
}
.nav-btn {
  position: absolute;
  top: 100px;
  width: 36px;
  height: 36px;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255,255,255,0.1);
  color: #f3f4f6;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}
.nav-btn:hover {
  background: #a855f7;
  border-color: #c084fc;
}
.nav-btn.prev {
  left: 15px;
}
.nav-btn.next {
  right: 15px;
}
.control-deck {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid rgba(255,255,255,0.05);
}
.dots-row {
  display: flex;
  gap: 8px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background: rgba(255,255,255,0.15);
  cursor: pointer;
  transition: all 0.2s;
}
.dot.active {
  width: 20px;
  background: #a855f7;
}
.autoplay-toggle {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  color: #94a3b8;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
}
.autoplay-toggle.active {
  background: rgba(236, 72, 153, 0.15);
  border-color: rgba(236, 72, 153, 0.3);
  color: #f472b6;
}`
    }
  },
  {
    id: "valid-parentheses-stack",
    title: "Valid Parentheses Stack Parser",
    description: `Given a string containing brackets '(', ')', '{', '}', '[' and ']' check if the input string is valid under O(N) time and space complexity. Open brackets must be closed by the same type of brackets and closed in the correct order.

### 📋 Core Requirements

1. **Balanced Brackets Evaluation**
   - Ensure every open bracket is closed by a matching bracket of the exact same type.
   - Ensure brackets are closed in the correct hierarchical order.

2. **Algorithmic Complexity**
   - **Time Complexity**: $O(N)$ where $N$ is the string length. Double-nested loops are unacceptable.
   - **Space Complexity**: $O(N)$ auxiliary space for bracket tracking.

3. **Stack-Based Architecture**
   - Push open brackets onto a stack array.
   - Pop the stack on encountering a closing bracket and verify matching correctness.
   - Ensure the stack is completely empty at the end.

---

### 📂 File Structure
- \`validate.js\`: **Implement your \`isValidParentheses(s)\` algorithm inside this file.**
- \`App.js\`: Diagnostic CLI suite that evaluates your solution against our real-time unit tests.`,
    estimatedMinutes: 25,
    testsCode: `// Algorithmic validation checks
checkStackImplementation() {
  const code = files["/validate.js"];
  const hasStack = code.includes("stack") || code.includes("push") || code.includes("pop");
  return hasStack;
}`,
    starterFiles: {
      "/validate.js": `/**
 * Given a string s containing just the characters '(', ')', '{', '}', '[' and ']',
 * determine if the input string is valid.
 * An input string is valid if:
 * 1. Open brackets must be closed by the same type of brackets.
 * 2. Open brackets must be closed in the correct order.
 * 3. Every close bracket has a corresponding open bracket of the same type.
 *
 * Requirements:
 * - Time Complexity: O(N) where N is the length of the string
 * - Space Complexity: O(N) to store brackets in a stack
 *
 * @param {string} s
 * @returns {boolean}
 */
export function isValidParentheses(s) {
  // TODO: Write your Stack-based string parsing algorithm here!
  // Hint: Create a list/stack to push opening brackets, pop them on matching closers,
  // and check if stack is empty at the end. Return true if balanced, else false.
  
  return false;
}`,
      "/App.js": `import React, { useState, useEffect } from "react";
import { isValidParentheses } from "./validate";
import "./styles.css";

const EVALUATION_SUITE = [
  { input: "()", expected: true, label: "Simple balanced" },
  { input: "()[]{}", expected: true, label: "Multiple groups" },
  { input: "(]", expected: false, label: "Mismatched close" },
  { input: "([)]", expected: false, label: "Overlapping groups" },
  { input: "{[]}", expected: true, label: "Nested groups" },
  { input: "(((", expected: false, label: "Unclosed opens" },
  { input: ")))", expected: false, label: "No open openers" },
  { input: "   ", expected: true, label: "Whitespace strings" },
];

export default function App() {
  const [results, setResults] = useState([]);
  const [customInput, setCustomInput] = useState("");
  const [customResult, setCustomResult] = useState(null);

  const runDiagnostic = () => {
    const outputs = EVALUATION_SUITE.map(test => {
      let actual = null;
      let error = null;
      try {
        actual = isValidParentheses(test.input);
      } catch (e) {
        error = e.message;
      }
      return {
        ...test,
        actual,
        error,
        passed: actual === test.expected && !error
      };
    });
    setResults(outputs);
  };

  useEffect(() => {
    runDiagnostic();
  }, []);

  const handleTestCustom = (e) => {
    e.preventDefault();
    try {
      const res = isValidParentheses(customInput);
      setCustomResult({ success: true, val: res.toString() });
    } catch (err) {
      setCustomResult({ success: false, val: err.message });
    }
  };

  const totalPassed = results.filter(r => r.passed).length;
  const isOptimal = totalPassed === results.length;

  return (
    <div className="terminal-app">
      <div className="terminal-header">
        <div className="traffic-lights">
          <span className="light red" />
          <span className="light yellow" />
          <span className="light green" />
        </div>
        <span className="terminal-title">bash -- stack-validator-telemetry</span>
      </div>

      <div className="terminal-body">
        <div className="intro-line">
          <span className="prompt">guest@interviewpad:~$</span> {"run-diagnostics --verbose"}
        </div>
        
        <p className="system-msg">
          Seeding stack checks... Analyzing candidate solver output below:
        </p>

        <div className="results-grid">
          {results.map((r, i) => (
            <div key={i} className={"test-row " + (r.passed ? "pass" : "fail")}>
              <span className="symbol">{r.passed ? "✔" : "✘"}</span>
              <span className="label font-mono">{r.label} ({r.input}):</span>
              <span className="outcome font-mono ml-auto">
                {r.error ? "ERR: " + r.error.slice(0, 10) : "expected " + r.expected + ", got " + r.actual}
              </span>
            </div>
          ))}
        </div>

        <div className="summary-block">
          <span className="prompt">guest@interviewpad:~$</span> {"stats --summary"}
          <div className={"status-badge " + (isOptimal ? "perfect" : "failing")}>
            {totalPassed} / {results.length} PASSED {isOptimal ? "· SECURE & MATCHED" : "· ACTION NEEDED"}
          </div>
        </div>

        <form onSubmit={handleTestCustom} className="custom-input-form">
          <span className="prompt">guest@interviewpad:~$</span> {"test --s="}
          <input 
            value={customInput} 
            onChange={e => setCustomInput(e.target.value)} 
            placeholder="e.g. {[()]}"
            className="cli-input"
          />
          {customResult && (
            <div className={"cli-output " + (customResult.success ? "success" : "error")}>
              {customResult.success ? "=> " + customResult.val : "=> ERROR: " + customResult.val}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}`,
      "/styles.css": `body {
  font-family: 'Outfit', 'Inter', 'JetBrains Mono', monospace;
  background: #0B0F19;
  color: #10B981;
  margin: 0;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 90vh;
}
.terminal-app {
  width: 100%;
  max-width: 480px;
  background: #080C14;
  border-radius: 16px;
  border: 1px solid rgba(16, 185, 129, 0.2);
  box-shadow: 0 20px 45px rgba(0, 255, 128, 0.05), 0 10px 30px rgba(0,0,0,0.6);
  overflow: hidden;
}
.terminal-header {
  background: #111827;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  border-b: 1px solid #1f2937;
  position: relative;
}
.traffic-lights {
  display: flex;
  gap: 6px;
}
.light {
  width: 9px;
  height: 9px;
  border-radius: 5px;
}
.light.red { background: #ef4444; }
.light.yellow { background: #f59e0b; }
.light.green { background: #10b981; }
.terminal-title {
  color: #9ca3af;
  font-size: 11px;
  font-weight: 700;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  letter-spacing: 0.05em;
}
.terminal-body {
  padding: 20px;
  font-size: 12px;
  line-height: 1.5;
  color: #a7f3d0;
}
.intro-line {
  color: #fff;
  font-weight: 600;
  margin-bottom: 8px;
}
.prompt {
  color: #6ee7b7;
  font-weight: 800;
  margin-right: 6px;
}
.system-msg {
  color: #64748b;
  margin: 0 0 16px 0;
  font-style: italic;
}
.results-grid {
  background: #04060b;
  border: 1px solid #1f2937;
  padding: 12px;
  border-radius: 10px;
  margin-bottom: 16px;
  max-height: 180px;
  overflow-y: auto;
}
.test-row {
  display: flex;
  align-items: center;
  padding: 4px 0;
  gap: 8px;
}
.test-row.pass { color: #34d399; }
.test-row.fail { color: #f87171; }
.outcome {
  font-weight: 700;
}
.summary-block {
  margin-bottom: 15px;
}
.status-badge {
  display: inline-block;
  margin-top: 8px;
  padding: 6px 14px;
  border-radius: 8px;
  font-weight: 800;
  font-size: 10px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.status-badge.perfect {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #34d399;
}
.status-badge.failing {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
}
.custom-input-form {
  display: flex;
  align-items: center;
  background: rgba(255,255,255,0.02);
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid #1f2937;
}
.cli-input {
  background: transparent;
  border: none;
  color: #f3f4f6;
  outline: none;
  font-family: monospace;
  font-size: 12px;
  flex: 1;
}
.cli-output {
  margin-left: 10px;
  font-weight: 800;
}
.cli-output.success { color: #34d399; }
.cli-output.error { color: #f87171; }`
    }
  },
  {
    id: "dynamic-fibonacci",
    title: "Dynamic Memoized Fibonacci",
    description: `Write an optimized, memoized algorithm calculating the N-th Fibonacci element. Avoid simple recursion stack overflows for large input bounds (N = 50).

### 📋 Core Requirements

1. **Performance Bottleneck**
   - Naive recursion runs in $O(2^N)$ complexity, which crashes browsers or times out for $N > 40$.
   - You must optimize this calculation to run in linear $O(N)$ time.

2. **Memoization / Dynamic Programming**
   - Store previously calculated values in a memo object or cache array.
   - Reuse cached results before repeating computations.

3. **Depth Safeguard**
   - Ensure your recursive calls pass the stateful memo object through correctly.

---

### 📂 File Structure
- \`fibonacci.js\`: **Implement your memoized \`fibonacci(n, memo)\` solver inside this file.**
- \`App.js\`: CPU benchmarking panel that profiles execution times and draws interactive performance charts.`,
    estimatedMinutes: 25,
    testsCode: `// Algorithmic checks for Dynamic Fibonacci
checkFibonacciMemo() {
  const code = files["/fibonacci.js"];
  const hasMemo = code.includes("memo") || code.includes("dp") || code.includes("cache");
  return hasMemo;
}`,
    starterFiles: {
      "/fibonacci.js": `/**
 * Calculate the N-th Fibonacci number.
 * 
 * Standard recursive solutions O(2^N) will trigger stack overflows or freeze
 * the candidate's browser environment for N > 40.
 *
 * Requirements:
 * - Time Complexity: O(N) via memoization or dynamic programming.
 * - Space Complexity: O(N) to hold prior computed array states.
 * 
 * @param {number} n
 * @param {Record<number, number>} memo
 * @returns {number}
 */
export function fibonacci(n, memo = {}) {
  // TODO: Write your optimized, memoized calculation algorithm here!
  // Hint: Store previously calculated sequences inside the memo object map.
  
  if (n <= 1) return n;
  
  return fibonacci(n - 1) + fibonacci(n - 2);
}`,
      "/App.js": `import React, { useState } from "react";
import { fibonacci } from "./fibonacci";
import "./styles.css";

export default function App() {
  const [profile, setProfile] = useState([]);
  const [calculating, setCalculating] = useState(false);
  const [isBroken, setIsBroken] = useState(false);

  const runBenchmark = () => {
    setCalculating(true);
    setIsBroken(false);
    
    // We execute the benchmark under 100ms safeguards.
    // If standard recursion is used, N=45 would freeze the browser,
    // so we set a timeout or warn the user.
    
    const checkpoints = [10, 20, 30, 40, 45, 50];
    const log = [];
    
    setTimeout(() => {
      let failedSafeguard = false;
      for (const n of checkpoints) {
        if (n > 30 && !failedSafeguard) {
          // Double check if standard recursion is active (takes > 20ms for N=30)
          const checkStart = performance.now();
          try {
            fibonacci(30);
          } catch (e) {}
          const checkDur = performance.now() - checkStart;
          if (checkDur > 10) {
            failedSafeguard = true;
            setIsBroken(true);
            log.push({ n, val: "TIMEOUT DETECTED", time: "> 3000ms (O(2^N) Overflow Warning)" });
            continue;
          }
        }

        if (failedSafeguard) {
          log.push({ n, val: "BLOCKED BY SAFEGUARD", time: "Aborted to prevent browser crash" });
          continue;
        }

        const t0 = performance.now();
        let val;
        try {
          val = fibonacci(n);
        } catch (e) {
          val = "ERR: Stack Overflow";
        }
        const t1 = performance.now();
        const elapsed = (t1 - t0).toFixed(4);
        
        log.push({
          n,
          val: typeof val === "number" ? val.toLocaleString() : val,
          time: elapsed + " ms"
        });
      }
      setProfile(log);
      setCalculating(false);
    }, 100);
  };

  return (
    <div className="bench-app">
      <div className="dashboard-header">
        <span className="indicator-node online" />
        <h2 className="title">CPU Benchmarking Studio</h2>
      </div>

      <p className="description">
        Profile execution times for Fibonacci arrays. Standard algorithms run in O(2^N) and crash; memoized code calculates in O(N).
      </p>

      <button 
        onClick={runBenchmark} 
        disabled={calculating}
        className="run-btn"
      >
        {calculating ? "Profiling CPU Registers..." : "Execute Benchmarking Suite"}
      </button>

      {isBroken && (
        <div className="alert-card animate-pulse">
          <strong>⚠ STACK EXHAUSTION SAFEGUARD TRIGGERED</strong>
          <p>Recursive stack depth exceeds linear bounds. Implement memoization in fibonacci.js to avoid performance penalties!</p>
        </div>
      )}

      {profile.length > 0 && (
        <table className="telemetry-table">
          <thead>
            <tr>
              <th>Sequence Index (N)</th>
              <th>Calculated Value</th>
              <th>Execution Time</th>
            </tr>
          </thead>
          <tbody>
            {profile.map((row, i) => (
              <tr key={i} className={row.val.includes("BLOCKED") || row.val.includes("TIMEOUT") ? "failing-row" : "passing-row"}>
                <td className="font-mono">N = {row.n}</td>
                <td className="val font-mono">{row.val}</td>
                <td className={"time font-mono " + (parseFloat(row.time) < 0.1 ? "fast" : "slow")}>{row.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}`,
      "/styles.css": `body {
  font-family: 'Outfit', 'Inter', sans-serif;
  background: #0B0F19;
  color: #e2e8f0;
  margin: 0;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 90vh;
}
.bench-app {
  width: 100%;
  max-width: 460px;
  background: rgba(22, 27, 46, 0.75);
  padding: 30px;
  border-radius: 24px;
  border: 1px solid rgba(59, 130, 246, 0.25);
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(14px);
}
.dashboard-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.indicator-node {
  width: 8px;
  height: 8px;
  border-radius: 4px;
}
.indicator-node.online { background: #3b82f6; box-shadow: 0 0 10px #3b82f6; }
.title {
  font-size: 18px;
  font-weight: 900;
  color: #fff;
  margin: 0;
}
.description {
  font-size: 12px;
  color: #94a3b8;
  margin: 0 0 20px 0;
  line-height: 1.6;
}
.run-btn {
  width: 100%;
  background: #3b82f6;
  color: #fff;
  border: none;
  padding: 12px;
  border-radius: 12px;
  font-weight: 800;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
}
.run-btn:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
}
.run-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.alert-card {
  margin-top: 20px;
  padding: 15px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  color: #f87171;
  font-size: 11px;
}
.alert-card strong {
  display: block;
  margin-bottom: 4px;
}
.alert-card p {
  margin: 0;
  line-height: 1.5;
}
.telemetry-table {
  width: 100%;
  margin-top: 20px;
  border-collapse: collapse;
  font-size: 11px;
}
.telemetry-table th {
  text-align: left;
  color: #64748b;
  font-weight: 700;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.telemetry-table td {
  padding: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.03);
}
.passing-row { color: #f3f4f6; }
.failing-row { color: #f87171; background: rgba(239,68,68,0.03); }
.val { font-weight: 700; color: #fff; }
.time.fast { color: #34d399; font-weight: bold; }
.time.slow { color: #f59e0b; }`
    }
  },
  // ── Backend (Node) — console surface, executed on Piston via /api/execute ──
  {
    id: "backend-node-rate-limiter",
    title: "Node.js: Sliding-Window Rate Limiter",
    description: `Implement a \`RateLimiter\` in Node.js that allows at most N requests per sliding time window per key.

### 📋 Core Requirements

1. **Sliding-Window Architecture**
   - Track precise request timestamps per key.
   - Avoid fixed-window boundary spikes (allow sliding request tracking).

2. **State and Storage**
   - Maintain historical request timestamps in memory.
   - Filter out timestamps older than the active window dynamically.

3. **Methods to Implement**
   - \`allow(key, nowMs)\`: Returns \`true\` if permitted, \`false\` if the key has exceeded the limit.

---

### 📂 File Structure
- \`index.js\`: **Implement your rate limiter class and test calls here.** Use the "Run Code" button to see terminal logs in real-time.`,
    estimatedMinutes: 30,
    kind: "backend",
    language: "node",
    frameworkLabel: "Express",
    testsCode: `const hasClass = code.includes("class") || code.includes("function");
const hasWindow = code.includes("now") || code.includes("Date") || code.includes("window");
return hasClass && hasWindow;`,
    starterFiles: {
      "/index.js": `// Implement a sliding-window rate limiter.
// allow(key, nowMs) -> boolean (true if the request is permitted)

class RateLimiter {
  constructor(limit, windowMs) {
    this.limit = limit;
    this.windowMs = windowMs;
    // TODO: track timestamps per key
  }

  allow(key, nowMs) {
    // TODO: implement
    return true;
  }
}

// Demo — run with the Run button to see output:
const rl = new RateLimiter(2, 1000);
console.log(rl.allow("a", 0));     // true
console.log(rl.allow("a", 100));   // true
console.log(rl.allow("a", 200));   // false (limit reached)
console.log(rl.allow("a", 1300));  // true (window slid)
`,
    },
  },
  // ── DSA — console surface; candidate writes a function + prints results ──
  {
    id: "dsa-group-anagrams",
    title: "DSA: Group Anagrams",
    description: `Given an array of strings, group the anagrams together. Implement \`groupAnagrams(words)\` and print the grouped result.

### 📋 Core Requirements

1. **Grouping Correctness**
   - Anagrams are words composed of the exact same characters in different orders (e.g. "eat", "tea", "ate").
   - Group all related anagrams together in arrays.

2. **Algorithmic Optimization**
   - Target an optimal time complexity of $O(N \cdot K \log K)$ or $O(N \cdot K)$ where $K$ is the maximum word length.

3. **HashMap Hashing Key**
   - Create a reliable hashing key (e.g., sorted string characters or character count arrays).

---

### 📂 File Structure
- \`solution.py\`: **Write your Python group-anagrams algorithm here.** Run it to verify outputs directly.`,
    estimatedMinutes: 30,
    kind: "dsa",
    language: "python",
    testsCode: `const hasDict = code.includes("{}") || code.includes("dict") || code.includes("defaultdict");
const hasSort = code.includes("sorted") || code.includes("sort");
return hasDict && hasSort;`,
    starterFiles: {
      "/solution.py": `from collections import defaultdict

def groupAnagrams(words):
    # TODO: implement — return a list of groups (lists of strings)
    return []

# Demo — run with the Run button to see output:
print(groupAnagrams(["eat", "tea", "tan", "ate", "nat", "bat"]))
`,
    },
  },
];

export function getTemplateById(id: string): AIInterviewTemplateDef | undefined {
  return AI_INTERVIEW_TEMPLATES.find(t => t.id === id);
}

/**
 * Compute the hard deadline for a session. `startedAt` is null until the
 * candidate sends their first message — before that, the session has no
 * deadline (the invite can sit unused indefinitely).
 *
 * `extraGraceMs` is added on top of estimatedMinutes so a candidate who is
 * mid-keystroke when the timer expires can still hit submit without losing
 * their work to a race. Default 30s.
 */
export function computeDeadline(
  startedAt: Date | null,
  templateId: string,
  extraGraceMs: number = 30_000
): Date | null {
  if (!startedAt) return null;
  const tpl = getTemplateById(templateId);
  const minutes = tpl?.estimatedMinutes ?? 30;
  return new Date(startedAt.getTime() + minutes * 60_000 + extraGraceMs);
}
