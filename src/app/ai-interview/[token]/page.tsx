import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveTemplate } from "@/lib/ai-interview/template-resolver";
import AIInterviewWorkspace from "./AIInterviewWorkspace";

type Props = {
  params: Promise<{ token: string }>;
};

const DEFAULT_STARTER_FILES = {
  "/App.js": `import React, { useState } from "react";
import "./styles.css";

export default function App() {
  // TODO: Build your paginated Todo List here!
  // 1. State for todos and current input.
  // 2. Pagination controls (currentPage, itemsPerPage).
  // 3. Disabled button boundary checking to prevent overflow.

  return (
    <div className="todo-app">
      <h1 className="title">Interviewpad Workpad</h1>
      <p className="subtitle">Build a Paginated Todo List component in React</p>
      
      <div className="placeholder-card">
        Start editing App.js to begin your implementation...
      </div>
    </div>
  );
}`,
  "/styles.css": `body {
  font-family: 'Inter', sans-serif;
  background: #0B0F19;
  color: #f3f4f6;
  margin: 0;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}
.todo-app {
  width: 100%;
  max-width: 440px;
  background: #161b2e;
  padding: 25px;
  border-radius: 20px;
  border: 1px solid #2a344a;
  box-shadow: 0 10px 40px rgba(0,0,0,0.45);
}
.title {
  font-size: 20px;
  font-weight: 800;
  margin: 0 0 6px 0;
  color: #ffe600;
  text-align: center;
}
.subtitle {
  font-size: 12px;
  color: #94a3b8;
  margin: 0 0 20px 0;
  text-align: center;
  line-height: 1.5;
}
.placeholder-card {
  padding: 30px;
  background: #0b0f19;
  border: 1.5px dashed #374151;
  border-radius: 12px;
  color: #64748b;
  text-align: center;
  font-size: 13px;
  font-weight: 500;
}`
};

export default async function AIInterviewRunPage({ params }: Props) {
  const { token } = await params;

  // Look up by inviteToken — the internal session id is never exposed to the
  // candidate's browser.
  const session = await prisma.aIInterviewSession.findUnique({
    where: { inviteToken: token },
  });

  if (!session) notFound();

  // Resolve template — workspace customs take precedence over builtins.
  const template = await resolveTemplate(session.templateId, session.workspaceId);
  const starter = template ? template.starterFiles : DEFAULT_STARTER_FILES;

  // Load starter files or current state files
  let initialFiles: Record<string, string> = starter;
  if (session.filesJson) {
    try {
      initialFiles = JSON.parse(session.filesJson) as Record<string, string>;
    } catch {
      initialFiles = starter;
    }
  }

  // Parse chat history
  let chatHistory: any[] = [];
  try {
    chatHistory = JSON.parse(session.chatHistory);
  } catch {
    chatHistory = [];
  }

  const estimatedMinutes = template?.estimatedMinutes ?? 30;

  return (
    <AIInterviewWorkspace
      session={{
        inviteToken: session.inviteToken,
        candidateName: session.candidateName,
        candidateEmail: session.candidateEmail,
        positionTitle: session.positionTitle,
        status: session.status,
        startedAt: session.startedAt?.toISOString() ?? null,
        estimatedMinutes,
      }}
      initialFiles={initialFiles}
      initialChat={chatHistory}
    />
  );
}
