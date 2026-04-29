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
    files: {
      "/index.js": `// Write JavaScript here\nconsole.log("Hello, JavaScript!");\n`,
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
    files: {
      "/index.ts": `const greet = (name: string): string => \`Hello, \${name}!\`;\nconsole.log(greet("TypeScript"));\n`,
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
      "/index.js": `const items = [1, 2, 3, 4, 5];\nconst squared = items.map((n) => n * n);\nconsole.log("squared:", squared);\n\ndocument.getElementById("app").innerHTML = \`<h1>JavaScript Playground</h1><p>\${squared.join(", ")}</p>\`;\n`,
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
      "/index.ts": `type User = { id: number; name: string };\n\nconst users: User[] = [\n  { id: 1, name: "Ada" },\n  { id: 2, name: "Linus" },\n];\n\nconst list = users.map((u) => \`<li>#\${u.id} — \${u.name}</li>\`).join("");\ndocument.getElementById("app")!.innerHTML = \`<ul>\${list}</ul>\`;\n`,
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
      "/App.js": `import { useState } from "react";\n\nexport default function App() {\n  const [count, setCount] = useState(0);\n  return (\n    <div style={{ fontFamily: "system-ui", padding: 24 }}>\n      <h1>React Counter</h1>\n      <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>\n    </div>\n  );\n}\n`,
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
      "/src/App.vue": `<template>\n  <div style="font-family: system-ui; padding: 24px">\n    <h1>Vue Counter</h1>\n    <button @click="count++">Clicked {{ count }} times</button>\n  </div>\n</template>\n\n<script setup>\nimport { ref } from "vue";\nconst count = ref(0);\n</script>\n`,
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
      "/App.svelte": `<script>\n  let count = 0;\n</script>\n\n<div style="font-family: system-ui; padding: 24px">\n  <h1>Svelte Counter</h1>\n  <button on:click={() => count += 1}>Clicked {count} times</button>\n</div>\n`,
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
      "/index.jsx": `import { render } from "solid-js/web";\nimport { createSignal } from "solid-js";\n\nfunction App() {\n  const [count, setCount] = createSignal(0);\n  return (\n    <div style="font-family: system-ui; padding: 24px">\n      <h1>Solid Counter</h1>\n      <button onClick={() => setCount(count() + 1)}>Clicked {count()} times</button>\n    </div>\n  );\n}\n\nrender(() => <App />, document.getElementById("app"));\n`,
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
      "/App.js": `import { useState, useEffect, useMemo } from "react";\n\nexport default function App() {\n  const [query, setQuery] = useState("");\n  const [tick, setTick] = useState(0);\n\n  useEffect(() => {\n    const id = setInterval(() => setTick((t) => t + 1), 1000);\n    return () => clearInterval(id);\n  }, []);\n\n  const upper = useMemo(() => query.toUpperCase(), [query]);\n\n  return (\n    <div style={{ fontFamily: "system-ui", padding: 24 }}>\n      <h1>useState + useEffect + useMemo</h1>\n      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="type..." />\n      <p>Upper: {upper}</p>\n      <p>Seconds elapsed: {tick}</p>\n    </div>\n  );\n}\n`,
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
      "/store.js": `import { configureStore, createSlice } from "@reduxjs/toolkit";\n\nconst counter = createSlice({\n  name: "counter",\n  initialState: { value: 0 },\n  reducers: {\n    inc: (s) => { s.value += 1 },\n    dec: (s) => { s.value -= 1 },\n  },\n});\n\nexport const { inc, dec } = counter.actions;\nexport const store = configureStore({ reducer: { counter: counter.reducer } });\n`,
      "/App.js": `import { Provider, useDispatch, useSelector } from "react-redux";\nimport { store, inc, dec } from "./store";\n\nfunction Counter() {\n  const value = useSelector((s) => s.counter.value);\n  const dispatch = useDispatch();\n  return (\n    <div style={{ fontFamily: "system-ui", padding: 24 }}>\n      <h1>Redux Toolkit: {value}</h1>\n      <button onClick={() => dispatch(dec())}>-</button>\n      <button onClick={() => dispatch(inc())}>+</button>\n    </div>\n  );\n}\n\nexport default function App() {\n  return <Provider store={store}><Counter /></Provider>;\n}\n`,
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
      "/store.js": `import { makeAutoObservable } from "mobx";\n\nclass CounterStore {\n  value = 0;\n  constructor() { makeAutoObservable(this); }\n  inc() { this.value += 1 }\n  dec() { this.value -= 1 }\n}\n\nexport const counter = new CounterStore();\n`,
      "/App.js": `import { observer } from "mobx-react-lite";\nimport { counter } from "./store";\n\nconst App = observer(() => (\n  <div style={{ fontFamily: "system-ui", padding: 24 }}>\n    <h1>MobX: {counter.value}</h1>\n    <button onClick={() => counter.dec()}>-</button>\n    <button onClick={() => counter.inc()}>+</button>\n  </div>\n));\n\nexport default App;\n`,
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
      "/App.js": `import { motion } from "framer-motion";\nimport { useState } from "react";\n\nexport default function App() {\n  const [on, setOn] = useState(false);\n  return (\n    <div style={{ fontFamily: "system-ui", padding: 24 }}>\n      <h1>Framer Motion</h1>\n      <motion.div\n        animate={{ x: on ? 200 : 0, rotate: on ? 180 : 0 }}\n        transition={{ type: "spring", stiffness: 200 }}\n        style={{ width: 80, height: 80, background: "#6366f1", borderRadius: 12 }}\n      />\n      <button onClick={() => setOn(!on)} style={{ marginTop: 16 }}>Toggle</button>\n    </div>\n  );\n}\n`,
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
      "/App.js": `import { Button, Card, CardContent, Typography, Stack } from "@mui/material";\nimport { useState } from "react";\n\nexport default function App() {\n  const [count, setCount] = useState(0);\n  return (\n    <Card sx={{ m: 3, p: 2, maxWidth: 360 }}>\n      <CardContent>\n        <Typography variant="h5" gutterBottom>Material UI</Typography>\n        <Stack direction="row" spacing={2} alignItems="center">\n          <Button variant="contained" onClick={() => setCount(count + 1)}>Clicked {count}</Button>\n          <Button variant="outlined" onClick={() => setCount(0)}>Reset</Button>\n        </Stack>\n      </CardContent>\n    </Card>\n  );\n}\n`,
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
