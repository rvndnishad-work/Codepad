/**
 * Wipe development test artifacts that accumulate while iterating on
 * AI Screening / MCP / etc. Idempotent — safe to run before any demo.
 *
 *   node scripts/wipe-dev-test-data.js
 *
 * What it touches:
 *  - AIInterviewSession rows whose candidateEmail ends in test.local
 *  - McpApiKey rows whose label starts with "Verify" / "Phase" / "Test"
 *  - ExternalMcpServer rows pointing at localhost or 127.0.0.1
 *  - Candidate rows named "MCP Created" or matching the test-fixture pattern
 *  - AIInterviewCreditLedger rows tied to deleted sessions (cascades, but logged)
 *
 * What it deliberately DOES NOT touch:
 *  - Workspace plan changes (so the GROWTH dev workspace stays GROWTH)
 *  - User accounts (no signup flow auto-creates throw-away users on this surface)
 *  - Real candidate/screening data — recognized by absence of the test markers
 *  - AdminTodo rows (those are intentional notes, not test data)
 *
 * If you adopt a new test-data pattern, add it here.
 */
const { PrismaClient } = require("@prisma/client");

(async () => {
  const p = new PrismaClient();
  try {
    // 1. AI screening sessions with @test.local emails — wipe sessions
    //    AIInterviewCreditLedger rows with sessionId cascade to null on
    //    delete (per schema onDelete:SetNull), so consumption history is
    //    preserved as workspace-level events.
    const sessions = await p.aIInterviewSession.deleteMany({
      where: { candidateEmail: { endsWith: "test.local" } },
    });
    console.log(`AIInterviewSession (test.local emails): deleted ${sessions.count}`);

    // 2. MCP API keys minted during verification. We match by label prefix
    //    rather than touching the audit log directly — keys cascade and
    //    revoke any tied audit entries.
    const apiKeys = await p.mcpApiKey.deleteMany({
      where: {
        OR: [
          { label: { startsWith: "Verify" } },
          { label: { startsWith: "Phase" } },
          { label: { startsWith: "Test" } },
        ],
      },
    });
    console.log(`McpApiKey (Verify/Phase/Test prefixes): deleted ${apiKeys.count}`);

    // 3. External MCP servers pointing at localhost — these were added as
    //    self-test fixtures and would be invalid in any other environment.
    const extMcp = await p.externalMcpServer.deleteMany({
      where: {
        OR: [
          { url: { contains: "localhost" } },
          { url: { contains: "127.0.0.1" } },
        ],
      },
    });
    console.log(`ExternalMcpServer (localhost): deleted ${extMcp.count}`);

    // 4. Test candidates. We're conservative here — only match the exact
    //    fixture names we used during verification, not e.g. "test" in any
    //    real candidate name.
    const candidates = await p.candidate.deleteMany({
      where: {
        OR: [
          { name: { in: ["MCP Created Candidate", "Test Candidate", "Scope Blocked"] } },
          { email: { endsWith: "test.local" } },
        ],
      },
    });
    console.log(`Candidate (test fixtures): deleted ${candidates.count}`);

    // 5. Stranded MCP audit log entries pointing at now-deleted keys. The
    //    apiKey relation is onDelete:SetNull so this is a tidy-up pass.
    const orphanedAudits = await p.mcpAuditLog.deleteMany({
      where: { apiKeyId: null },
    });
    console.log(`McpAuditLog (orphaned, no apiKey): deleted ${orphanedAudits.count}`);

    console.log("\nDone. Re-run any time before a demo to keep the dev DB clean.");
  } finally {
    await p.$disconnect();
  }
})();
