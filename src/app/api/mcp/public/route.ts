import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { buildPublicMcpServer } from "@/lib/mcp/public-server";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * Unauthenticated MCP discovery endpoint.
 *
 * IP-rate-limited so this can't be turned into a free LLM/server-cost sink
 * by a hostile client. Tools are static (no DB), so the limit just protects
 * the Next.js process itself.
 *
 * Stateless per-request to match the authenticated `/api/mcp` route and
 * keep the runtime model uniform across both surfaces.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT_REQUESTS = 30; // per IP per window
const RATE_LIMIT_WINDOW_MS = 60_000;

async function handle(req: Request): Promise<Response> {
  // IP-based rate limit since there's no API key to bucket by.
  const key = clientKey(req);
  const rl = rateLimit(`mcp-public:${key}`, RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_MS);
  if (!rl.ok) {
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32003,
          message: `Rate limit exceeded (${RATE_LIMIT_REQUESTS} req/min per IP). Retry in ${Math.ceil(rl.resetMs / 1000)}s.`,
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

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = buildPublicMcpServer();
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
