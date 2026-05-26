/**
 * Phase 4.1 end-to-end test scaffolding. Sets up the smallest possible config
 * to exercise the outbound MCP wire against our own /api/mcp/public:
 *
 *   1. Workspace kill-switch ON
 *   2. ExternalMcpServer pointing at http://localhost:3000/api/mcp/public, enabled
 *   3. Custom AIInterviewTemplate bound to that server via TemplateExternalMcp
 *   4. Fresh AIInterviewSession on that template
 *
 * Prints the inviteToken so the test driver can POST to /api/ai-interview/message.
 *
 * Re-runnable — finds existing rows by stable identifiers and updates rather
 * than duplicating.
 */
const { PrismaClient } = require("@prisma/client");

const WORKSPACE_SLUG = "vercel-engineering";
const SERVER_URL = "http://localhost:3000/api/mcp/public";
const SERVER_NAME = "Phase4.1 E2E (own public MCP)";
const TEMPLATE_TITLE = "Phase4.1 E2E Template";

(async () => {
  const p = new PrismaClient();
  try {
    const ws = await p.workspace.findUnique({ where: { slug: WORKSPACE_SLUG } });
    if (!ws) throw new Error(`Workspace ${WORKSPACE_SLUG} not found`);

    // 1. Kill-switch ON
    if (!ws.allowExternalMcp) {
      await p.workspace.update({
        where: { id: ws.id },
        data: { allowExternalMcp: true },
      });
      console.log("Flipped workspace kill-switch ON");
    } else {
      console.log("Kill-switch already ON");
    }

    // 2. ExternalMcpServer (enabled, localhost — fine in dev mode)
    let server = await p.externalMcpServer.findFirst({
      where: { workspaceId: ws.id, url: SERVER_URL },
    });
    if (!server) {
      server = await p.externalMcpServer.create({
        data: {
          workspaceId: ws.id,
          name: SERVER_NAME,
          url: SERVER_URL,
          authToken: null,
          enabled: true,
          lastTestStatus: "ok",
          lastTestSummary: "E2E seed — assumed reachable",
          lastTestedAt: new Date(),
        },
      });
      console.log("Created ExternalMcpServer:", server.id);
    } else if (!server.enabled) {
      await p.externalMcpServer.update({
        where: { id: server.id },
        data: { enabled: true },
      });
      console.log("Enabled existing ExternalMcpServer:", server.id);
    } else {
      console.log("ExternalMcpServer already configured:", server.id);
    }

    // 3. Template (custom — built-ins can't be bound, by design)
    let template = await p.aIInterviewTemplate.findFirst({
      where: { workspaceId: ws.id, title: TEMPLATE_TITLE },
    });
    if (!template) {
      template = await p.aIInterviewTemplate.create({
        data: {
          workspaceId: ws.id,
          title: TEMPLATE_TITLE,
          description:
            "Phase 4.1 end-to-end smoke template. The interviewer is bound to our own /api/mcp/public so Gemini can call describe_templates mid-conversation.",
          starterFiles: JSON.stringify({
            "/App.js":
              "export default function App() {\n  return <h1>Hello E2E</h1>;\n}",
          }),
          testsCode: "Just smoke. No grading.",
          estimatedMinutes: 30,
        },
      });
      console.log("Created template:", template.id);
    } else {
      console.log("Template already exists:", template.id);
    }

    // 4. Binding
    const binding = await p.templateExternalMcp.upsert({
      where: {
        templateId_externalMcpServerId: {
          templateId: template.id,
          externalMcpServerId: server.id,
        },
      },
      create: {
        templateId: template.id,
        externalMcpServerId: server.id,
      },
      update: {},
    });
    console.log("Binding row:", binding.id);

    // 5. Fresh AIInterviewSession bound to that template
    const session = await p.aIInterviewSession.create({
      data: {
        workspaceId: ws.id,
        candidateName: "Phase4.1 E2E Candidate",
        candidateEmail: "phase41-e2e@test.local",
        positionTitle: "E2E Engineer",
        templateId: template.id,
        chatHistory: "[]",
        filesJson: "{}",
      },
    });
    console.log("\nSession ready:");
    console.log("  inviteToken:", session.inviteToken);
    console.log("  templateId :", template.id);
    console.log("  serverId   :", server.id);
    console.log("\nNext:");
    console.log("  fetch http://localhost:3000/api/ai-interview/message with");
    console.log("    { inviteToken, message: \"What templates do you offer?\", files: {} }");
    console.log("  then check the session's outboundCallCount in the DB.");
  } finally {
    await p.$disconnect();
  }
})();
