import type { SandpackPredefinedTemplate, SandpackFiles } from "@codesandbox/sandpack-react";

export type TemplateCategory = "empty" | "core" | "framework" | "react-ecosystem";

export type TemplateDef = {
  id: string;
  title: string;
  subtitle?: string;
  group: string;
  category: TemplateCategory;
  /** Underlying Sandpack bundler template */
  base: SandpackPredefinedTemplate;
  /** Starter files merged on top of the base template */
  files: SandpackFiles;
  /** Extra npm deps beyond what the base template provides */
  dependencies?: Record<string, string>;
  /** Lucide icon name or short label to render in the tile */
  label: string;
  accent: string;
  /** Whether this template is purely for console output or has a UI */
  mode?: "browser" | "console";
};

/* ---------- JavaScript ---------- */

export const templates: TemplateDef[] = [
  {
    id: "empty-js",
    title: "Empty JavaScript",
    subtitle: "Clean slate",
    group: "empty",
    category: "empty",
    base: "vanilla",
    label: "JS",
    accent: "#f7df1e",
    mode: "console",
    files: {
      "/index.js": `// Write JavaScript here\nconsole.log("Hello, JavaScript!");\n`,
      "/index.html": { code: `<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8" /><title>JS</title></head>\n<body><script src="index.js" type="module"></script></body>\n</html>\n`, hidden: true },
      "/styles.css": { code: "", hidden: true },
      "/package.json": { code: `{\n  "main": "index.js",\n  "dependencies": {}\n}`, hidden: true },
    },
  },
  {
    id: "empty-ts",
    title: "Empty TypeScript",
    subtitle: "Clean slate",
    group: "empty",
    category: "empty",
    base: "vanilla-ts",
    label: "TS",
    accent: "#3178c6",
    mode: "console",
    files: {
      "/index.ts": `// Write TypeScript here\nconst greet = (name: string): string => \`Hello, \${name}!\`;\nconsole.log(greet("TypeScript"));\n`,
      "/index.html": { code: `<!DOCTYPE html>\n<html><head><meta charset="utf-8" /><title>TS</title></head>\n<body><script src="index.ts" type="module"></script></body></html>\n`, hidden: true },
      "/styles.css": { code: "", hidden: true },
      "/package.json": { code: `{\n  "main": "index.ts",\n  "dependencies": {}\n}`, hidden: true },
    },
  },
  {
    id: "empty-react",
    title: "Empty React",
    subtitle: "Clean slate",
    group: "empty",
    category: "empty",
    base: "react",
    label: "React",
    accent: "#61dafb",
    files: {
      "/App.js": `export default function App() {\n  return <h1>Hello, React!</h1>;\n}\n`,
      "/styles.css": { code: "", hidden: true },
      "/public/index.html": { code: `<!DOCTYPE html>\n<html><head><meta charset="utf-8" /><title>React</title></head>\n<body><div id="root"></div></body></html>\n`, hidden: true },
    },
  },

  /* ---------- Core ---------- */
  {
    id: "javascript",
    title: "JavaScript",
    group: "core",
    category: "core",
    base: "vanilla",
    label: "JS",
    accent: "#f7df1e",
    files: {
      "/src/index.js": `import { greet } from "./utils/helpers.js";\nimport "../styles/main.css";\n\nconst app = document.getElementById("app");\napp.innerHTML = \`\n  <div class="container">\n    <h1>\${greet("JavaScript")}</h1>\n    <p>Edit <code>src/index.js</code> to get started</p>\n  </div>\n\`;\n`,
      "/src/utils/helpers.js": `export function greet(name) {\n  return \`Hello, \${name}! 👋\`;\n}\n\nexport function capitalize(str) {\n  return str.charAt(0).toUpperCase() + str.slice(1);\n}\n`,
      "/styles/main.css": `* { margin: 0; padding: 0; box-sizing: border-box; }\nbody { font-family: "Inter", system-ui, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }\n.container { text-align: center; }\n.container h1 { font-size: 2rem; margin-bottom: 0.5rem; background: linear-gradient(135deg,#f7df1e,#fbbf24); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }\n.container p { color: #94a3b8; }\n.container code { background: #1e293b; padding: 2px 6px; border-radius: 4px; font-size: 0.85em; color: #fbbf24; }\n`,
      "/index.html": `<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="utf-8" /><title>JS Playground</title></head>\n<body><div id="app"></div><script src="src/index.js" type="module"></script></body>\n</html>\n`,
    },
  },
  {
    id: "typescript",
    title: "TypeScript",
    group: "core",
    category: "core",
    base: "vanilla-ts",
    label: "TS",
    accent: "#3178c6",
    files: {
      "/src/index.ts": `import { greet } from "./utils/helpers";\nimport "../styles/main.css";\n\nconst app = document.getElementById("app")!;\napp.innerHTML = \`\n  <div class="container">\n    <h1>\${greet("TypeScript")}</h1>\n    <p>Edit <code>src/index.ts</code> to get started</p>\n  </div>\n\`;\n`,
      "/src/utils/helpers.ts": `export function greet(name: string): string {\n  return \`Hello, \${name}! 👋\`;\n}\n\nexport function capitalize(str: string): string {\n  return str.charAt(0).toUpperCase() + str.slice(1);\n}\n`,
      "/styles/main.css": `* { margin: 0; padding: 0; box-sizing: border-box; }\nbody { font-family: "Inter", system-ui, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }\n.container { text-align: center; }\n.container h1 { font-size: 2rem; margin-bottom: 0.5rem; background: linear-gradient(135deg,#3178c6,#60a5fa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }\n.container p { color: #94a3b8; }\n.container code { background: #1e293b; padding: 2px 6px; border-radius: 4px; font-size: 0.85em; color: #60a5fa; }\n`,
      "/index.html": `<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="utf-8" /><title>TS Playground</title></head>\n<body><div id="app"></div><script src="src/index.ts" type="module"></script></body>\n</html>\n`,
    },
  },

  /* ---------- Frameworks ---------- */
  {
    id: "react",
    title: "React",
    group: "framework",
    category: "framework",
    base: "react",
    label: "React",
    accent: "#61dafb",
    files: {
      "/App.js": `import Header from "./components/Header";
import Counter from "./components/Counter";
import "./styles/App.css";

export default function App() {
  return (
    <div className="app">
      <Header />
      <main className="main">
        <Counter />
      </main>
    </div>
  );
}
`,
      "/components/Header.js": `import "../styles/Header.css";

export default function Header() {
  return (
    <header className="header">
      <h1>⚛️ React Playground</h1>
      <p>Edit any file to get started</p>
    </header>
  );
}
`,
      "/components/Counter.js": `import { useState } from "react";
import "../styles/Counter.css";

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="counter">
      <span className="counter-value">{count}</span>
      <div className="counter-actions">
        <button onClick={() => setCount(count - 1)}>−</button>
        <button onClick={() => setCount(0)}>Reset</button>
        <button onClick={() => setCount(count + 1)}>+</button>
      </div>
    </div>
  );
}
`,
      "/styles/App.css": `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: "Inter", "Segoe UI", system-ui, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
  min-height: 100vh;
}

.app {
  max-width: 640px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

.main {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
`,
      "/styles/Header.css": `.header {
  text-align: center;
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 1.75rem;
  font-weight: 700;
  background: linear-gradient(135deg, #61dafb, #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 0.25rem;
}

.header p {
  color: #94a3b8;
  font-size: 0.875rem;
}
`,
      "/styles/Counter.css": `.counter {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
}

.counter-value {
  display: block;
  font-size: 3rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #f1f5f9;
  margin-bottom: 1rem;
}

.counter-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.counter-actions button {
  padding: 0.5rem 1.25rem;
  border-radius: 8px;
  border: 1px solid #475569;
  background: #334155;
  color: #e2e8f0;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.counter-actions button:hover {
  background: #475569;
  border-color: #61dafb;
  color: #fff;
}
`,
    },
  },
  {
    id: "vue",
    title: "Vue",
    group: "framework",
    category: "framework",
    base: "vue",
    label: "Vue",
    accent: "#42b883",
    files: {
      "/src/App.vue": `<template>\n  <div class="app">\n    <AppHeader />\n    <Counter />\n  </div>\n</template>\n\n<script setup>\nimport AppHeader from "./components/AppHeader.vue";\nimport Counter from "./components/Counter.vue";\n</script>\n\n<style>\n* { margin: 0; padding: 0; box-sizing: border-box; }\nbody { font-family: "Inter", system-ui, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }\n.app { max-width: 640px; margin: 0 auto; padding: 2rem 1.5rem; }\n</style>\n`,
      "/src/components/AppHeader.vue": `<template>\n  <header class="header">\n    <h1>💚 Vue Playground</h1>\n    <p>Edit any file to get started</p>\n  </header>\n</template>\n\n<style scoped>\n.header { text-align: center; margin-bottom: 2rem; }\nh1 { font-size: 1.75rem; color: #42b883; }\np { color: #94a3b8; font-size: 0.875rem; }\n</style>\n`,
      "/src/components/Counter.vue": `<template>\n  <div class="counter">\n    <span class="value">{{ count }}</span>\n    <div class="actions">\n      <button @click="count--">−</button>\n      <button @click="count = 0">Reset</button>\n      <button @click="count++">+</button>\n    </div>\n  </div>\n</template>\n\n<script setup>\nimport { ref } from "vue";\nconst count = ref(0);\n</script>\n\n<style scoped>\n.counter { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 2rem; text-align: center; }\n.value { display: block; font-size: 3rem; font-weight: 700; color: #f1f5f9; margin-bottom: 1rem; }\n.actions { display: flex; gap: 0.5rem; justify-content: center; }\nbutton { padding: 0.5rem 1.25rem; border-radius: 8px; border: 1px solid #475569; background: #334155; color: #e2e8f0; font-size: 1rem; cursor: pointer; }\nbutton:hover { background: #475569; border-color: #42b883; }\n</style>\n`,
    },
  },
  {
    id: "angular",
    title: "Angular",
    group: "framework",
    category: "framework",
    base: "angular",
    label: "NG",
    accent: "#dd0031",
    files: {
      "/src/app/app.component.ts": `import { Component } from "@angular/core";\n\n@Component({\n  selector: "app-root",\n  template: \`\n    <div style="font-family: system-ui; padding: 24px">\n      <h1>Angular Counter</h1>\n      <button (click)="count = count + 1">Clicked {{count}} times</button>\n    </div>\n  \`,\n})\nexport class AppComponent {\n  count = 0;\n}\n`,
    },
  },
  {
    id: "svelte",
    title: "Svelte",
    group: "framework",
    category: "framework",
    base: "svelte",
    label: "Svelte",
    accent: "#ff3e00",
    files: {
      "/App.svelte": `<script>\n  import Header from "./components/Header.svelte";\n  import Counter from "./components/Counter.svelte";\n</script>\n\n<div class="app">\n  <Header />\n  <Counter />\n</div>\n\n<style>\n  :global(*) { margin: 0; padding: 0; box-sizing: border-box; }\n  :global(body) { font-family: "Inter", system-ui, sans-serif; background: #0f172a; color: #e2e8f0; }\n  .app { max-width: 640px; margin: 0 auto; padding: 2rem 1.5rem; }\n</style>\n`,
      "/components/Header.svelte": `<header class="header">\n  <h1>🔥 Svelte Playground</h1>\n  <p>Edit any file to get started</p>\n</header>\n\n<style>\n  .header { text-align: center; margin-bottom: 2rem; }\n  h1 { font-size: 1.75rem; color: #ff3e00; }\n  p { color: #94a3b8; font-size: 0.875rem; }\n</style>\n`,
      "/components/Counter.svelte": `<script>\n  let count = 0;\n</script>\n\n<div class="counter">\n  <span class="value">{count}</span>\n  <div class="actions">\n    <button on:click={() => count--}>−</button>\n    <button on:click={() => count = 0}>Reset</button>\n    <button on:click={() => count++}>+</button>\n  </div>\n</div>\n\n<style>\n  .counter { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 2rem; text-align: center; }\n  .value { display: block; font-size: 3rem; font-weight: 700; color: #f1f5f9; margin-bottom: 1rem; }\n  .actions { display: flex; gap: 0.5rem; justify-content: center; }\n  button { padding: 0.5rem 1.25rem; border-radius: 8px; border: 1px solid #475569; background: #334155; color: #e2e8f0; font-size: 1rem; cursor: pointer; }\n  button:hover { background: #475569; border-color: #ff3e00; }\n</style>\n`,
    },
  },
  {
    id: "solid",
    title: "SolidJS",
    group: "framework",
    category: "framework",
    base: "solid",
    label: "Solid",
    accent: "#2c4f7c",
    files: {
      "/index.jsx": `import { render } from "solid-js/web";\nimport App from "./components/App";\nimport "./styles/main.css";\n\nrender(() => <App />, document.getElementById("app"));\n`,
      "/components/App.jsx": `import Header from "./Header";\nimport Counter from "./Counter";\n\nexport default function App() {\n  return (\n    <div class="app">\n      <Header />\n      <Counter />\n    </div>\n  );\n}\n`,
      "/components/Header.jsx": `export default function Header() {\n  return (\n    <header class="header">\n      <h1>⚡ SolidJS Playground</h1>\n      <p>Edit any file to get started</p>\n    </header>\n  );\n}\n`,
      "/components/Counter.jsx": `import { createSignal } from "solid-js";\n\nexport default function Counter() {\n  const [count, setCount] = createSignal(0);\n  return (\n    <div class="counter">\n      <span class="value">{count()}</span>\n      <div class="actions">\n        <button onClick={() => setCount(c => c - 1)}>−</button>\n        <button onClick={() => setCount(0)}>Reset</button>\n        <button onClick={() => setCount(c => c + 1)}>+</button>\n      </div>\n    </div>\n  );\n}\n`,
      "/styles/main.css": `* { margin: 0; padding: 0; box-sizing: border-box; }\nbody { font-family: "Inter", system-ui, sans-serif; background: #0f172a; color: #e2e8f0; }\n.app { max-width: 640px; margin: 0 auto; padding: 2rem 1.5rem; }\n.header { text-align: center; margin-bottom: 2rem; }\n.header h1 { font-size: 1.75rem; color: #4e8fdc; }\n.header p { color: #94a3b8; font-size: 0.875rem; }\n.counter { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 2rem; text-align: center; }\n.value { display: block; font-size: 3rem; font-weight: 700; color: #f1f5f9; margin-bottom: 1rem; }\n.actions { display: flex; gap: 0.5rem; justify-content: center; }\n.actions button { padding: 0.5rem 1.25rem; border-radius: 8px; border: 1px solid #475569; background: #334155; color: #e2e8f0; font-size: 1rem; cursor: pointer; }\n.actions button:hover { background: #475569; border-color: #4e8fdc; }\n`,
    },
  },

  /* ---------- React ecosystem variants ---------- */
  {
    id: "react-hooks",
    title: "React Hooks",
    group: "react-ecosystem",
    category: "react-ecosystem",
    base: "react",
    label: "Hooks",
    accent: "#61dafb",
    files: {
      "/App.js": `import Timer from "./components/Timer";\nimport SearchBox from "./components/SearchBox";\nimport "./styles/App.css";\n\nexport default function App() {\n  return (\n    <div className="app">\n      <h1>⚛️ React Hooks Demo</h1>\n      <SearchBox />\n      <Timer />\n    </div>\n  );\n}\n`,
      "/components/Timer.js": `import { useTimer } from "../hooks/useTimer";\n\nexport default function Timer() {\n  const seconds = useTimer();\n  return <div className="card"><strong>useEffect</strong> — {seconds}s elapsed</div>;\n}\n`,
      "/components/SearchBox.js": `import { useSearch } from "../hooks/useSearch";\n\nexport default function SearchBox() {\n  const { query, setQuery, upper } = useSearch();\n  return (\n    <div className="card">\n      <strong>useState + useMemo</strong>\n      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Type something..." />\n      <p>Uppercase: {upper || "—"}</p>\n    </div>\n  );\n}\n`,
      "/hooks/useTimer.js": `import { useState, useEffect } from "react";\n\nexport function useTimer() {\n  const [tick, setTick] = useState(0);\n  useEffect(() => {\n    const id = setInterval(() => setTick(t => t + 1), 1000);\n    return () => clearInterval(id);\n  }, []);\n  return tick;\n}\n`,
      "/hooks/useSearch.js": `import { useState, useMemo } from "react";\n\nexport function useSearch() {\n  const [query, setQuery] = useState("");\n  const upper = useMemo(() => query.toUpperCase(), [query]);\n  return { query, setQuery, upper };\n}\n`,
      "/styles/App.css": `* { margin: 0; padding: 0; box-sizing: border-box; }\nbody { font-family: "Inter", system-ui, sans-serif; background: #0f172a; color: #e2e8f0; }\n.app { max-width: 640px; margin: 0 auto; padding: 2rem 1.5rem; }\n.app h1 { text-align: center; margin-bottom: 1.5rem; font-size: 1.75rem; color: #61dafb; }\n.card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; }\n.card strong { display: block; color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; margin-bottom: 0.5rem; }\n.card input { width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #e2e8f0; margin-bottom: 0.5rem; outline: none; }\n.card input:focus { border-color: #61dafb; }\n.card p { color: #94a3b8; }\n`,
    },
  },
  {
    id: "react-classes",
    title: "React Classes",
    group: "react-ecosystem",
    category: "react-ecosystem",
    base: "react",
    label: "Class",
    accent: "#61dafb",
    files: {
      "/App.js": `import { Component } from "react";\n\nexport default class App extends Component {\n  state = { count: 0 };\n  render() {\n    return (\n      <div style={{ fontFamily: "system-ui", padding: 24 }}>\n        <h1>Class Component</h1>\n        <button onClick={() => this.setState({ count: this.state.count + 1 })}>\n          Clicked {this.state.count} times\n        </button>\n      </div>\n    );\n  }\n}\n`,
    },
  },
  {
    id: "redux-toolkit",
    title: "Redux Toolkit",
    group: "react-ecosystem",
    category: "react-ecosystem",
    base: "react",
    label: "RTK",
    accent: "#764abc",
    dependencies: { "@reduxjs/toolkit": "^2.3.0", "react-redux": "^9.1.2" },
    files: {
      "/App.js": `import { Provider } from "react-redux";\nimport { store } from "./store/store";\nimport Counter from "./components/Counter";\nimport "./styles/App.css";\n\nexport default function App() {\n  return (\n    <Provider store={store}>\n      <div className="app">\n        <h1>🟣 Redux Toolkit</h1>\n        <Counter />\n      </div>\n    </Provider>\n  );\n}\n`,
      "/store/store.js": `import { configureStore } from "@reduxjs/toolkit";\nimport counterReducer from "./counterSlice";\n\nexport const store = configureStore({\n  reducer: { counter: counterReducer },\n});\n`,
      "/store/counterSlice.js": `import { createSlice } from "@reduxjs/toolkit";\n\nconst counterSlice = createSlice({\n  name: "counter",\n  initialState: { value: 0 },\n  reducers: {\n    inc: (s) => { s.value += 1 },\n    dec: (s) => { s.value -= 1 },\n  },\n});\n\nexport const { inc, dec } = counterSlice.actions;\nexport default counterSlice.reducer;\n`,
      "/components/Counter.js": `import { useDispatch, useSelector } from "react-redux";\nimport { inc, dec } from "../store/counterSlice";\n\nexport default function Counter() {\n  const value = useSelector((s) => s.counter.value);\n  const dispatch = useDispatch();\n  return (\n    <div className="counter">\n      <span className="value">{value}</span>\n      <div className="actions">\n        <button onClick={() => dispatch(dec())}>−</button>\n        <button onClick={() => dispatch(inc())}>+</button>\n      </div>\n    </div>\n  );\n}\n`,
      "/styles/App.css": `* { margin: 0; padding: 0; box-sizing: border-box; }\nbody { font-family: "Inter", system-ui, sans-serif; background: #0f172a; color: #e2e8f0; }\n.app { max-width: 640px; margin: 0 auto; padding: 2rem 1.5rem; }\n.app h1 { text-align: center; margin-bottom: 1.5rem; font-size: 1.75rem; color: #764abc; }\n.counter { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 2rem; text-align: center; }\n.value { display: block; font-size: 3rem; font-weight: 700; color: #f1f5f9; margin-bottom: 1rem; }\n.actions { display: flex; gap: 0.5rem; justify-content: center; }\n.actions button { padding: 0.5rem 1.25rem; border-radius: 8px; border: 1px solid #475569; background: #334155; color: #e2e8f0; font-size: 1rem; cursor: pointer; }\n.actions button:hover { background: #475569; border-color: #764abc; }\n`,
    },
  },
  {
    id: "mobx",
    title: "MobX",
    group: "react-ecosystem",
    category: "react-ecosystem",
    base: "react",
    label: "MobX",
    accent: "#ff9955",
    dependencies: { mobx: "^6.13.5", "mobx-react-lite": "^4.0.7" },
    files: {
      "/App.js": `import Counter from "./components/Counter";\nimport "./styles/App.css";\n\nexport default function App() {\n  return (\n    <div className="app">\n      <h1>🟠 MobX</h1>\n      <Counter />\n    </div>\n  );\n}\n`,
      "/store/counterStore.js": `import { makeAutoObservable } from "mobx";\n\nclass CounterStore {\n  value = 0;\n  constructor() { makeAutoObservable(this); }\n  inc() { this.value += 1; }\n  dec() { this.value -= 1; }\n  reset() { this.value = 0; }\n}\n\nexport const counterStore = new CounterStore();\n`,
      "/components/Counter.js": `import { observer } from "mobx-react-lite";\nimport { counterStore } from "../store/counterStore";\n\nconst Counter = observer(() => (\n  <div className="counter">\n    <span className="value">{counterStore.value}</span>\n    <div className="actions">\n      <button onClick={() => counterStore.dec()}>−</button>\n      <button onClick={() => counterStore.reset()}>Reset</button>\n      <button onClick={() => counterStore.inc()}>+</button>\n    </div>\n  </div>\n));\n\nexport default Counter;\n`,
      "/styles/App.css": `* { margin: 0; padding: 0; box-sizing: border-box; }\nbody { font-family: "Inter", system-ui, sans-serif; background: #0f172a; color: #e2e8f0; }\n.app { max-width: 640px; margin: 0 auto; padding: 2rem 1.5rem; }\n.app h1 { text-align: center; margin-bottom: 1.5rem; font-size: 1.75rem; color: #ff9955; }\n.counter { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 2rem; text-align: center; }\n.value { display: block; font-size: 3rem; font-weight: 700; color: #f1f5f9; margin-bottom: 1rem; }\n.actions { display: flex; gap: 0.5rem; justify-content: center; }\n.actions button { padding: 0.5rem 1.25rem; border-radius: 8px; border: 1px solid #475569; background: #334155; color: #e2e8f0; font-size: 1rem; cursor: pointer; }\n.actions button:hover { background: #475569; border-color: #ff9955; }\n`,
    },
  },
  {
    id: "framer-motion",
    title: "Framer Motion",
    group: "react-ecosystem",
    category: "react-ecosystem",
    base: "react",
    label: "Motion",
    accent: "#e535ab",
    dependencies: { "framer-motion": "^11.15.0" },
    files: {
      "/App.js": `import AnimatedBox from "./components/AnimatedBox";\nimport "./styles/App.css";\n\nexport default function App() {\n  return (\n    <div className="app">\n      <h1>\u2728 Framer Motion</h1>\n      <p className="subtitle">Click the box or the button</p>\n      <AnimatedBox />\n    </div>\n  );\n}\n`,
      "/components/AnimatedBox.js": `import { motion } from "framer-motion";\nimport { useState } from "react";\n\nexport default function AnimatedBox() {\n  const [on, setOn] = useState(false);\n  return (\n    <div className="demo">\n      <motion.div\n        className="box"\n        animate={{ x: on ? 160 : 0, rotate: on ? 180 : 0, scale: on ? 1.1 : 1 }}\n        transition={{ type: "spring", stiffness: 200, damping: 15 }}\n        onClick={() => setOn(!on)}\n        whileHover={{ scale: 1.05 }}\n        whileTap={{ scale: 0.95 }}\n      />\n      <button className="toggle" onClick={() => setOn(!on)}>\n        {on ? "Reset" : "Animate"}\n      </button>\n    </div>\n  );\n}\n`,
      "/styles/App.css": `* { margin: 0; padding: 0; box-sizing: border-box; }\nbody { font-family: "Inter", system-ui, sans-serif; background: #0f172a; color: #e2e8f0; }\n.app { max-width: 640px; margin: 0 auto; padding: 2rem 1.5rem; text-align: center; }\n.app h1 { font-size: 1.75rem; color: #e535ab; margin-bottom: 0.25rem; }\n.subtitle { color: #94a3b8; font-size: 0.875rem; margin-bottom: 2rem; }\n.demo { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 2rem; display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }\n.box { width: 80px; height: 80px; background: linear-gradient(135deg, #6366f1, #e535ab); border-radius: 16px; cursor: pointer; }\n.toggle { padding: 0.5rem 1.5rem; border-radius: 8px; border: 1px solid #475569; background: #334155; color: #e2e8f0; font-size: 1rem; cursor: pointer; }\n.toggle:hover { background: #475569; border-color: #e535ab; }\n`,
    },
  },
  {
    id: "mui",
    title: "Material UI",
    group: "react-ecosystem",
    category: "react-ecosystem",
    base: "react",
    label: "MUI",
    accent: "#007fff",
    dependencies: {
      "@mui/material": "^6.2.1",
      "@emotion/react": "^11.14.0",
      "@emotion/styled": "^11.14.0",
    },
    files: {
      "/App.js": `import CounterCard from "./components/CounterCard";\nimport { Box, Typography, CssBaseline } from "@mui/material";\nimport { createTheme, ThemeProvider } from "@mui/material/styles";\n\nconst darkTheme = createTheme({ palette: { mode: "dark" } });\n\nexport default function App() {\n  return (\n    <ThemeProvider theme={darkTheme}>\n      <CssBaseline />\n      <Box sx={{ maxWidth: 640, mx: "auto", p: 3 }}>\n        <Typography variant=\"h4\" align=\"center\" gutterBottom sx={{ color: \"#007fff\" }}>\n          \ud83c\udfA8 Material UI\n        </Typography>\n        <CounterCard />\n      </Box>\n    </ThemeProvider>\n  );\n}\n`,
      "/components/CounterCard.js": `import { useState } from "react";\nimport { Button, Card, CardContent, Typography, Stack } from "@mui/material";\n\nexport default function CounterCard() {\n  const [count, setCount] = useState(0);\n  return (\n    <Card sx={{ p: 2 }}>\n      <CardContent sx={{ textAlign: "center" }}>\n        <Typography variant=\"h2\" sx={{ fontWeight: 700, mb: 2 }}>{count}</Typography>\n        <Stack direction=\"row\" spacing={1} justifyContent=\"center\">\n          <Button variant=\"outlined\" onClick={() => setCount(c => c - 1)}>\u2212</Button>\n          <Button variant=\"outlined\" onClick={() => setCount(0)}>Reset</Button>\n          <Button variant=\"contained\" onClick={() => setCount(c => c + 1)}>+</Button>\n        </Stack>\n      </CardContent>\n    </Card>\n  );\n}\n`,
    },
  },
];

export const templatesById = Object.fromEntries(templates.map((t) => [t.id, t]));

export const groups: { key: string; label: string }[] = [
  { key: "empty", label: "Empty / Blank" },
  { key: "core", label: "Core" },
  { key: "framework", label: "Frameworks" },
  { key: "react-ecosystem", label: "React" },
];
