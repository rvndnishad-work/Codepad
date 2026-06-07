const { PrismaClient } = require("@prisma/client");

const ip13AC = [
  { text: "Install @playwright/test and initialize playwright.config.ts config file", done: false },
  { text: "E2E Authentication (auth.spec.ts): login, signup, reset password, 2FA/TOTP verification gate", done: false },
  { text: "E2E Candidate Flow (candidate.spec.ts): mobile device handoff, multi-step challenge coding attempt, portfolio page", done: false },
  { text: "E2E Recruiter Flow (recruiter.spec.ts): workspace Kanban board drag-drop, leaderboard CSV, scheduling builder, settings & webhooks, audit logs", done: false },
  { text: "E2E Live Collab (interview.spec.ts): dual-browser mock session, multiplayer Yjs code sync, verdict drawer", done: false },
  { text: "E2E Admin Operations (admin.spec.ts): Todos board mutation, Gemma copilot center, telemetry cron log, broadcast notification", done: false }
];

const ip14AC = [
  { text: "Install vitest, testing-library/react, testing-library/jest-dom, jsdom and setup vitest.config.ts", done: false },
  { text: "Unit Security (security.test.ts): TOTP 6-digit verification, AES-GCM at-rest encryption, validateOutboundUrl SSRF blocking", done: false },
  { text: "Unit Server Actions (server-actions.test.ts): create/update todos actions, Stripe lazy init config, candidates CRM workflow transitions, AI credit sweeps", done: false },
  { text: "Unit Components (components.test.ts): NotificationBell dropdown triggers, Modal portal mounting and ESC key logic, MonacoEditor file changes", done: false }
];

const ip13Body = [
  "Set up a complete End-to-End (E2E) testing suite using Playwright. This suite will run cross-browser integration checks mimicking real user actions over all routes and personas.",
  "",
  "Scopes:",
  "1. Configuration: Boot clean local Next.js server, Docker database isolation setup, and NextAuth storage state authentication helper.",
  "2. Auth & Security: Login, signup, recovery flows, and TOTP redirects.",
  "3. Candidate flow: Mobile lobby UA check, QR handoff, challenges multi-step Monaco solver editor, and public portfolio pages.",
  "4. Recruiter workflow: Workspace pipeline CRM Kanban board drag-drop mutations, leaderboard sorting, live interview scheduler builder, audit log table, and webhooks configuration.",
  "5. Live Interview Multiplayer: Simulated dual-browser multiplayer socket sync (Yjs/WebRTC editor updates, canvas, chat, and verdict saves).",
  "6. Admin console: Admin todos board card moves, Gemma copilot, and system-wide broadcast composer."
].join("\n");

const ip14Body = [
  "Set up a blazingly fast Unit and Integration testing suite using Vitest + React Testing Library + jsdom. This suite will cover backend utility methods, server actions, custom Prisma operations, hooks, and React UI components.",
  "",
  "Scopes:",
  "1. Configurations: Setup vitest, jsdom, `@/*` aliases, and mock handlers for Gemini, Resend, Stripe, and global routers.",
  "2. Security & Utils: RFC 6238 TOTP verification, AES-GCM at-rest encryption helper, and validateOutboundUrl TOCTOU & SSRF resolving IP filter checks.",
  "3. Server Actions & Ledger: Admin todo dependency checks, candidate status transitions, credit ledger balance checks & refunds, and notification dispatch loops.",
  "4. UI Components: NotificationBell dropdown toggle, MonacoEditor tabs selection, and document.body portaled Modals (including Esc close focus trap)."
].join("\n");

(async () => {
  const prisma = new PrismaClient();
  try {
    console.log("Enriching testing tickets IP-13 and IP-14...");
    
    // Check if IP-13 exists
    const ip13 = await prisma.adminTodo.findUnique({
      where: { ticketKey: "IP-13" }
    });
    
    if (ip13) {
      await prisma.adminTodo.update({
        where: { id: ip13.id },
        data: {
          body: ip13Body,
          category: "Harden",
          priority: "HIGH",
          acceptanceCriteria: JSON.stringify(ip13AC)
        }
      });
      console.log("Updated IP-13 successfully.");
    } else {
      console.log("IP-13 not found in database.");
    }

    // Check if IP-14 exists
    const ip14 = await prisma.adminTodo.findUnique({
      where: { ticketKey: "IP-14" }
    });
    
    if (ip14) {
      await prisma.adminTodo.update({
        where: { id: ip14.id },
        data: {
          body: ip14Body,
          category: "Harden",
          priority: "HIGH",
          acceptanceCriteria: JSON.stringify(ip14AC)
        }
      });
      console.log("Updated IP-14 successfully.");
    } else {
      console.log("IP-14 not found in database.");
    }
    
  } catch (error) {
    console.error("Enrichment failed:", error);
  } finally {
    await prisma.$disconnect();
  }
})();
