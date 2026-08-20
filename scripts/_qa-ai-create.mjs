import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 1) continue;
  const k = t.slice(0, i).trim();
  let v = t.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  if (!(k in process.env)) process.env[k] = v;
}

const prisma = new PrismaClient();

const STARTER = {
  "/App.js": `import React, { useState } from "react";
import "./styles.css";

export default function App() {
  const [todos, setTodos] = useState([
    { id: 1, text: "Configure Prisma database connections", completed: true },
    { id: 2, text: "Set up Google Gemini conversational orchestrators", completed: true },
    { id: 3, text: "Design premium split-pane workspace dashboard", completed: false },
  ]);
  const [input, setInput] = useState("");
  return (
    <div className="todo-app">
      <h1 className="title">Interviewpad Workpad</h1>
      <p className="subtitle">Build a Paginated Todo List component in React</p>
      <form onSubmit={(e) => { e.preventDefault(); }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Add a todo" />
      </form>
      <ul>
        {todos.map((t) => (
          <li key={t.id}>{t.completed ? "[x] " : "[ ] "}{t.text}</li>
        ))}
      </ul>
    </div>
  );
}`,
  "/styles.css": `body { font-family: Inter, sans-serif; background: #0B0F19; color: #f3f4f6; margin: 0; padding: 20px; }
.todo-app { max-width: 440px; margin: 0 auto; background: #161b2e; padding: 25px; border-radius: 20px; }
.title { color: #ffe600; }`,
};

async function main() {
  const ws = await prisma.workspace.upsert({
    where: { slug: "__ai-practice__" },
    update: {},
    create: { name: "AI Practice", slug: "__ai-practice__" },
    select: { id: true },
  });

  const created = await prisma.aIInterviewSession.create({
    data: {
      workspaceId: ws.id,
      practice: true,
      candidateName: "Visual QA Candidate",
      candidateEmail: "qa-ai-interview@example.com",
      positionTitle: "Practice — React Todo with Pagination",
      status: "PENDING",
      chatHistory: "[]",
      filesJson: JSON.stringify(STARTER),
      templateId: "react-todo-pagination",
    },
    select: { inviteToken: true, id: true, status: true },
  });
  console.log(JSON.stringify(created));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
