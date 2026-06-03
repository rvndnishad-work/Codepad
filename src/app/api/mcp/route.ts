import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authenticateRequest } from "@/lib/mcp/auth";
import { buildMcpServer } from "@/lib/mcp/server";
import { rateLimit } from "@/lib/rate-limit";
import { workspacePlanAllowsAiScreening } from "@/lib/ai-interview/credits";

/**
 * Production MCP endpoint.
 *
 * Per-request flow:
 *   1. Authenticate bearer token → AuthedKey (workspace + scopes)
 *   2. Reject if the workspace plan doesn't include MCP (GROWTH/ENTERPRISE)
 *   3. Rate limit per key
 *   4. Build a workspace-scoped McpServer
 *   5. Hand the request to the Streamable HTTP transport
 *
 * Notes:
 *   - The MCP spec lets unauthenticated `initialize` succeed on some servers
 *     for capability discovery, but we don't allow that — every call costs
 *     a DB query, and a public unauth surface would be a DoS magnet. Phase 3
 *     ships a separate /api/mcp/public for unauth discovery if we want it.
 *   - Stateless per-request: fresh server + transport every call, so we
 *     never carry session state across redeploys or process boundaries.
 *   - JSON response mode (not SSE streaming): tools complete fast (single
 *     DB query) and JSON is easier for `curl`/`fetch` testing. Switch to
 *     SSE in Phase 2 if write tools start producing long-running streams.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT_REQUESTS = 60; // per window
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

async function handle(req: Request): Promise<Response> {
  // 1. Auth
  const auth = await authenticateRequest(req);
  if (!auth) {
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32001,
          message:
            "Unauthorized. Provide a valid Interviewpad API key via Authorization: Bearer <key>.",
        },
        id: null,
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "WWW-Authenticate": 'Bearer realm="interviewpad"',
        },
      }
    );
  }

  // 2. Plan gate — match the AI Screening feature gate. A workspace that's
  //    been downgraded keeps its keys in the DB but they stop working.
  if (!workspacePlanAllowsAiScreening(auth.workspacePlanName)) {
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32002,
          message:
            "Workspace plan does not include MCP API access. Upgrade to Growth or Enterprise.",
        },
        id: null,
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // 3. Per-key rate limit. Keyed on the API key id so two keys in the same
  //    workspace don't share a bucket.
  const rl = rateLimit(`mcp:${auth.apiKeyId}`, RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_MS);
  if (!rl.ok) {
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32003,
          message: `Rate limit exceeded (${RATE_LIMIT_REQUESTS} req/min). Retry in ${Math.ceil(rl.resetMs / 1000)}s.`,
        },
        id: null,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil(rl.resetMs / 1000)),
        },
      }
    );
  }

  // 4 + 5. Build server, connect transport, dispatch
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true,
  });
  const server = buildMcpServer(auth);
  await server.connect(transport);

  try {
    return await transport.handleRequest(req);
  } finally {
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
