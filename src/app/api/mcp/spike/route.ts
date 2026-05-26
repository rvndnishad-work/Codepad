import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { buildSpikeMcpServer } from "@/lib/mcp/spike-server";

/**
 * MCP Streamable HTTP endpoint (Phase 0 spike).
 *
 * The MCP Streamable HTTP transport speaks JSON-RPC over a single URL using
 * POST (client → server), GET (long-poll SSE for server-initiated messages),
 * and DELETE (session teardown). We dispatch all three to the same transport.
 *
 * Stateless mode: every request constructs its own server + transport. The
 * transport sees one request, services it, and returns the Response. This
 * sacrifices server-initiated push notifications (no value for read tools)
 * but plays nicely with serverless and Vercel-style ephemeral runtimes.
 *
 * Force node runtime: Prisma client doesn't run on edge runtime, and the SDK
 * uses some Node-y dynamic imports under the hood.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(req: Request): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    // Stateless: leave sessionIdGenerator undefined so the transport doesn't
    // try to track sessions across requests.
    sessionIdGenerator: undefined,
    // JSON responses instead of SSE for simple request/response — easier to
    // hit from `curl` while testing, and there's no streaming benefit for a
    // tool that does a single DB query.
    enableJsonResponse: true,
  });

  const server = buildSpikeMcpServer();
  await server.connect(transport);

  try {
    return await transport.handleRequest(req);
  } finally {
    // Close per request to avoid hanging connections in the stateless model.
    await server.close().catch(() => {});
  }
}

export async function POST(req: Request) {
  return handle(req);
}

export async function GET(req: Request) {
  return handle(req);
}

export async function DELETE(req: Request) {
  return handle(req);
}
