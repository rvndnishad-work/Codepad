import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * Key format: `ip_live_<32 random hex chars>`.
 *
 * The `ip_live_` prefix:
 *   - mirrors Stripe-style key conventions, which most engineers recognize
 *   - makes leaked keys greppable in logs/customer code so they can be
 *     identified and rotated quickly
 *   - leaves room for future variants (`ip_test_`, `ip_oauth_`, etc.)
 *
 * Only the SHA-256 hash is persisted. We never store the plaintext —
 * generation is the only moment the secret exists in our process, after
 * which it's shown to the user once and forgotten.
 */
export const KEY_PREFIX = "ip_live_";
const SECRET_BYTES = 16; // 32 hex chars → ~128 bits of entropy

export type GeneratedKey = {
  plaintext: string;
  hash: string;
  preview: string;
};

export function generateApiKey(): GeneratedKey {
  const secret = randomBytes(SECRET_BYTES).toString("hex");
  const plaintext = `${KEY_PREFIX}${secret}`;
  return {
    plaintext,
    hash: hashApiKey(plaintext),
    preview: plaintext.slice(0, 12), // e.g. "ip_live_a1b2"
  };
}

export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

/**
 * Extract a bearer token from an Authorization header. Returns null when the
 * header is missing or malformed — callers should treat that as 401.
 */
export function extractBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  const [scheme, token] = auth.split(/\s+/, 2);
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

export type AuthedKey = {
  apiKeyId: string;
  workspaceId: string;
  workspaceSlug: string;
  workspaceName: string;
  workspacePlanName: string;
  scopes: string[];
  label: string;
};

/**
 * Validate a bearer token and return the associated workspace + scopes.
 * Returns null if the token is missing, doesn't match a key, or has been
 * revoked. Touch `lastUsedAt` on the key (fire-and-forget) so recruiters
 * can see which keys are still in use vs. dead.
 */
export async function authenticateRequest(
  req: Request
): Promise<AuthedKey | null> {
  const token = extractBearerToken(req);
  if (!token || !token.startsWith(KEY_PREFIX)) return null;

  const keyHash = hashApiKey(token);
  const row = await prisma.mcpApiKey.findUnique({
    where: { keyHash },
    include: {
      workspace: {
        select: { id: true, slug: true, name: true, planName: true },
      },
    },
  });
  if (!row || row.revokedAt) return null;

  // Bump lastUsedAt asynchronously — don't block the request on the write.
  void prisma.mcpApiKey
    .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  let scopes: string[] = ["read"];
  try {
    const parsed = JSON.parse(row.scopes);
    if (Array.isArray(parsed)) scopes = parsed.filter((s) => typeof s === "string");
  } catch {
    // fall back to read-only
  }

  return {
    apiKeyId: row.id,
    workspaceId: row.workspace.id,
    workspaceSlug: row.workspace.slug,
    workspaceName: row.workspace.name,
    workspacePlanName: row.workspace.planName,
    scopes,
    label: row.label,
  };
}

/**
 * Quick scope check used by tool handlers. Phase 1 is read-only so this
 * mostly just guards against the future when write tools land.
 */
export function hasScope(auth: AuthedKey, required: "read" | "write"): boolean {
  return auth.scopes.includes(required);
}
