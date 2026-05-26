/**
 * Outbound MCP client helpers.
 *
 * Phase 4.0 surface: just a test-connection probe. The actual screening-time
 * fan-out (Phase 4.1) will reuse the same SSRF guard and request shape but
 * adds per-call audit, token caps, and a hard call budget per session.
 *
 * Why we don't use the official `@modelcontextprotocol/sdk` client here:
 * the SDK's StreamableHTTPClientTransport assumes the server is reachable
 * and forgives a lot. For an admin-facing "is this URL even an MCP server"
 * probe we want explicit timeouts, SSRF rejection BEFORE the request, and a
 * single round-trip — easier to just speak JSON-RPC directly.
 */

import { lookup } from "dns/promises";

const TEST_TIMEOUT_MS = 5000;
const MAX_RESPONSE_BYTES = 256 * 1024; // 256KB — tools/list responses should be tiny

export type SSRFCheckResult = { ok: true } | { ok: false; reason: string };

/**
 * Reject URLs that could be used to pivot inside the Interviewpad network
 * (SSRF). The list of blocked ranges covers RFC1918, loopback, link-local,
 * carrier-grade NAT, and IPv6 equivalents.
 *
 * In dev (`NODE_ENV !== "production"`) we allow http: and localhost so
 * recruiters can test against a local MCP server during onboarding. In
 * production both are blocked.
 *
 * IMPORTANT: SSRF checks happen on the resolved IP, not the hostname,
 * because a hostile DNS record could resolve to a private address at fetch
 * time even if the hostname looked public. We resolve once here and the
 * caller is responsible for re-resolving + reusing that IP if they want
 * defense-in-depth against TOCTOU races (Phase 4.1 concern).
 */
const PRIVATE_RANGES_V4: [number, number, number, number, number][] = [
  // [a, b, c, d, prefixLen] — only the first prefixLen bits matter
  [10, 0, 0, 0, 8],
  [172, 16, 0, 0, 12],
  [192, 168, 0, 0, 16],
  [127, 0, 0, 0, 8],
  [169, 254, 0, 0, 16],
  [100, 64, 0, 0, 10], // carrier-grade NAT
  [0, 0, 0, 0, 8],
];

function ipv4InRange(ip: string, base: number[], prefixLen: number): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
  const ipInt = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  const baseInt =
    ((base[0] << 24) | (base[1] << 16) | (base[2] << 8) | base[3]) >>> 0;
  const mask = prefixLen === 0 ? 0 : (~0 << (32 - prefixLen)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

export async function validateOutboundUrl(rawUrl: string): Promise<SSRFCheckResult> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "Not a valid URL." };
  }

  const isProd = process.env.NODE_ENV === "production";
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, reason: `Unsupported protocol: ${parsed.protocol}` };
  }
  if (isProd && parsed.protocol !== "https:") {
    return { ok: false, reason: "Production requires https:// URLs." };
  }

  const hostname = parsed.hostname;
  if (!hostname) return { ok: false, reason: "URL has no hostname." };

  // Allow `localhost` only in dev — easier than running DNS for a literal.
  if (!isProd && (hostname === "localhost" || hostname === "127.0.0.1")) {
    return { ok: true };
  }

  // Resolve and check every address (DNS may return many).
  let addrs: { address: string; family: number }[];
  try {
    addrs = await lookup(hostname, { all: true });
  } catch (err) {
    return {
      ok: false,
      reason: `DNS lookup failed: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }
  if (addrs.length === 0) {
    return { ok: false, reason: "Hostname resolves to no addresses." };
  }

  for (const a of addrs) {
    if (a.family === 4) {
      for (const range of PRIVATE_RANGES_V4) {
        const [b0, b1, b2, b3, prefix] = range;
        if (ipv4InRange(a.address, [b0, b1, b2, b3], prefix)) {
          return {
            ok: false,
            reason: `Resolves to a private/internal address (${a.address}).`,
          };
        }
      }
    } else if (a.family === 6) {
      const v6 = a.address.toLowerCase();
      // Loopback, link-local, ULA — IPv6 equivalents of the v4 blocks.
      if (
        v6 === "::1" ||
        v6.startsWith("fe80:") || // link-local
        v6.startsWith("fc") ||
        v6.startsWith("fd") || // ULA fc00::/7
        v6 === "::"
      ) {
        return {
          ok: false,
          reason: `Resolves to a private/internal IPv6 address (${a.address}).`,
        };
      }
    }
  }

  return { ok: true };
}

export type TestRemoteResult =
  | {
      ok: true;
      serverName?: string;
      serverVersion?: string;
      protocolVersion?: string;
      toolNames: string[];
      summary: string;
    }
  | {
      ok: false;
      reason: string;
    };

/**
 * Probe a remote MCP server: run `initialize`, then `tools/list`. Returns a
 * human-readable summary the UI can show in the "last tested" row, or an
 * error message if anything fails.
 *
 * Errors are caught and returned as `{ ok: false }` rather than thrown —
 * the caller is an admin action that wants to show the user the failure
 * mode, not a 500.
 */
export async function testRemoteMcpConnection(params: {
  url: string;
  authToken?: string | null;
}): Promise<TestRemoteResult> {
  const ssrf = await validateOutboundUrl(params.url);
  if (!ssrf.ok) {
    return { ok: false, reason: ssrf.reason };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    "User-Agent": "Interviewpad-MCP-Probe/1.0",
  };
  if (params.authToken) {
    headers.Authorization = `Bearer ${params.authToken}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);

  try {
    // Step 1: initialize
    const initRes = await fetch(params.url, {
      method: "POST",
      headers,
      redirect: "error", // refuse redirects — a hostile server could 30x to a private URL
      signal: controller.signal,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "Interviewpad", version: "1.0" },
        },
      }),
    });
    if (!initRes.ok) {
      return { ok: false, reason: `initialize HTTP ${initRes.status}` };
    }
    const initText = await readBoundedText(initRes);
    const initJson = parseJsonRpc(initText);
    if (!initJson) return { ok: false, reason: "initialize returned invalid JSON." };
    if (initJson.error) {
      return {
        ok: false,
        reason: `initialize error: ${initJson.error.message ?? "unknown"}`,
      };
    }
    const serverInfo = initJson.result?.serverInfo ?? {};
    const protocolVersion = initJson.result?.protocolVersion;

    // Step 2: tools/list
    const listRes = await fetch(params.url, {
      method: "POST",
      headers,
      redirect: "error",
      signal: controller.signal,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {},
      }),
    });
    if (!listRes.ok) {
      return { ok: false, reason: `tools/list HTTP ${listRes.status}` };
    }
    const listText = await readBoundedText(listRes);
    const listJson = parseJsonRpc(listText);
    if (!listJson) return { ok: false, reason: "tools/list returned invalid JSON." };
    if (listJson.error) {
      return {
        ok: false,
        reason: `tools/list error: ${listJson.error.message ?? "unknown"}`,
      };
    }
    const tools: unknown = listJson.result?.tools ?? [];
    if (!Array.isArray(tools)) {
      return { ok: false, reason: "tools/list result.tools is not an array." };
    }
    const toolNames = tools
      .map((t) => (t && typeof t === "object" && "name" in t ? String((t as Record<string, unknown>).name) : null))
      .filter((n): n is string => !!n);

    return {
      ok: true,
      serverName: serverInfo.name,
      serverVersion: serverInfo.version,
      protocolVersion,
      toolNames,
      summary:
        `Connected to ${serverInfo.name ?? "unknown server"}` +
        (serverInfo.version ? ` v${serverInfo.version}` : "") +
        ` — ${toolNames.length} tool${toolNames.length === 1 ? "" : "s"}`,
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, reason: `Timed out after ${TEST_TIMEOUT_MS}ms` };
    }
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "Network error",
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Read at most MAX_RESPONSE_BYTES from a Response body. Streaming because a
 * hostile server could send a multi-GB body to exhaust memory.
 */
async function readBoundedText(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return await res.text(); // no streaming support — fallback
  let total = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("response too large");
      }
      chunks.push(value);
    }
  }
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    combined.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder().decode(combined);
}

/**
 * Lenient JSON-RPC response parser. Some servers (including MCP HTTP+SSE)
 * may prefix the JSON with SSE framing (`data: ...`); strip that if present.
 */
function parseJsonRpc(text: string): {
  result?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  error?: { message?: string };
} | null {
  const trimmed = text.trim();
  // SSE prefix variants
  if (trimmed.startsWith("data:")) {
    const lines = trimmed.split("\n");
    const dataLine = lines.find((l) => l.startsWith("data:"));
    if (!dataLine) return null;
    try {
      return JSON.parse(dataLine.slice(5).trim());
    } catch {
      return null;
    }
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}
