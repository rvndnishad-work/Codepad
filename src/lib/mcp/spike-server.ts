import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

/**
 * Phase 0 spike: a throwaway MCP server with exactly ONE tool (`ping`).
 *
 * Purpose is to validate end-to-end plumbing — SDK import, streamable HTTP
 * transport under Next.js, tool discovery from Claude Desktop / Cursor /
 * Goose — before we commit to the real auth + tool surface in Phase 1.
 *
 * Stateless: a fresh McpServer is created per HTTP request by the route
 * handler. That's slightly wasteful but matches Next.js's request-scoped
 * runtime model and avoids in-memory session state that wouldn't survive
 * a redeploy or scale-out anyway.
 */
export function buildSpikeMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: "interviewpad-spike",
      version: "0.0.1",
    },
    {
      // Declare what we expose. Only tools for the spike — resources/prompts
      // come in Phase 1.
      capabilities: {
        tools: {},
      },
    }
  );

  server.registerTool(
    "ping",
    {
      title: "Ping Interviewpad",
      description:
        "Smoke-test the Interviewpad MCP connection. Returns pong plus a workspace count from the live database. If this works, the MCP transport layer is wired correctly.",
      // Empty input schema — no args.
      inputSchema: {},
    },
    async () => {
      // Hit the DB to prove the route is actually running inside the Next.js
      // process (not just a static echo).
      const workspaceCount = await prisma.workspace.count();
      const workspaces = await prisma.workspace.findMany({
        select: { name: true, slug: true, planName: true },
        orderBy: { name: "asc" },
        take: 5,
      });

      const summary = workspaces
        .map((w) => `• ${w.name} (${w.slug}) — ${w.planName}`)
        .join("\n");

      return {
        content: [
          {
            type: "text",
            text: [
              "pong 🟢",
              "",
              `Connected to Interviewpad. Found ${workspaceCount} workspace${workspaceCount === 1 ? "" : "s"}.`,
              "",
              summary || "(no workspaces yet)",
              "",
              "If you can read this inside your AI assistant, Phase 0 succeeded.",
            ].join("\n"),
          },
        ],
      };
    }
  );

  return server;
}
