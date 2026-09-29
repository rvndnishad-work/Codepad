/**
 * Absolute links for interview emails and pages. Server only.
 *
 * NEXTAUTH_URL (or AUTH_URL / NEXT_PUBLIC_SITE_URL) wins. Without one, the
 * address the recruiter is using right now is the best guess, then the
 * deployment's own domain. Never localhost on a deployment; see site-url.ts.
 */
import { headers } from "next/headers";
import { configuredOrigin, originFromHeaders, siteOrigin } from "@/lib/site-url";

export async function appOrigin(): Promise<string> {
  const env = configuredOrigin();
  if (env) return env;
  try {
    const fromRequest = originFromHeaders(await headers());
    if (fromRequest) return fromRequest;
  } catch {
    // Outside a request (scripts, tests, crons).
  }
  return siteOrigin();
}

export const candidateJoinUrl = (origin: string, s: { id: string; shareToken: string }) => `${origin}/interview/${s.id}?token=${s.shareToken}`;
export const guestJoinUrl = (origin: string, sessionId: string, token: string) => `${origin}/interview/${sessionId}?guest=${token}`;
