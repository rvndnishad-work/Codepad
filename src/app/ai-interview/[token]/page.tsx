import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { resolveSessionRounds } from "@/lib/ai-interview/rounds";
import { resolveRoundsContent } from "@/lib/ai-interview/round-content";
import AIInterviewWorkspace from "./AIInterviewWorkspace";
import MobileLobby from "@/components/MobileLobby";
import { shouldRenderMobileLobby } from "@/lib/device";

type Props = {
  params: Promise<{ token: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
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

export default async function AIInterviewRunPage({ params, searchParams }: Props) {
  const { token } = await params;
  const sp = (searchParams ? await searchParams : {}) ?? {};

  // IP-38: mobile-handoff lobby. Run *before* DB lookup so a mobile candidate
  // never burns a session-state mutation they can't finish (AI screenings
  // consume credits on first message).
  const hdrs = await headers();
  const showLobby = shouldRenderMobileLobby({
    userAgent: hdrs.get("user-agent"),
    searchParams: sp,
    cookieHeader: hdrs.get("cookie"),
  });
  if (showLobby) {
    const host = hdrs.get("host") ?? "interviewpad.in";
    const proto = hdrs.get("x-forwarded-proto") ?? "https";
    const fullUrl = `${proto}://${host}/ai-interview/${token}`;
    return (
      <MobileLobby
        url={fullUrl}
        title="Open your AI screening on desktop"
        subtitle="AI screenings use a full IDE and chat console — scan to continue on a laptop."
        tokenLabel="ai-interview"
        emailEnabled={!!process.env.RESEND_API_KEY}
      />
    );
  }

  // Look up by inviteToken — the internal session id is never exposed to the
  // candidate's browser. Include rounds so multi-round (batch) screenings load
  // their per-round surfaces; legacy single-template sessions have none and
  // resolveSessionRounds synthesizes one.
  const session = await prisma.aIInterviewSession.findUnique({
    where: { inviteToken: token },
    include: { rounds: true },
  });

  if (!session) notFound();

  // Normalize to an ordered round list, then resolve each round's runnable
  // content (title/surface/starter files) by source kind.
  const sessionRounds = resolveSessionRounds(session);
  const roundsContent = await resolveRoundsContent(sessionRounds, session.workspaceId);

  // Defensive fallback — if content resolution produced nothing usable, seed a
  // single frontend round from the default starter so the page never crashes.
  const rounds =
    roundsContent.length > 0
      ? roundsContent.map((r) => ({
          roundId: r.roundId,
          order: r.order,
          title: r.title,
          description: r.description,
          kind: r.kind,
          language: r.language,
          estimatedMinutes: r.estimatedMinutes,
          files: Object.keys(r.files).length > 0 ? r.files : DEFAULT_STARTER_FILES,
          status: r.status,
        }))
      : [
          {
            roundId: `legacy:${session.id}`,
            order: 0,
            title: session.positionTitle,
            description: "",
            kind: "frontend" as const,
            language: undefined,
            estimatedMinutes: 30,
            files: DEFAULT_STARTER_FILES,
            status: session.status,
          },
        ];

  // Whole-session timer = sum of round budgets (the locked single-timer model).
  const estimatedMinutes = rounds.reduce((sum, r) => sum + (r.estimatedMinutes || 0), 0) || 30;

  // Parse the shared (continuous) chat history.
  let chatHistory: { role: "user" | "assistant"; text: string }[] = [];
  try {
    chatHistory = JSON.parse(session.chatHistory);
  } catch {
    chatHistory = [];
  }

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
        engagementLevel: session.engagementLevel,
      }}
      rounds={rounds}
      initialChat={chatHistory}
    />
  );
}
