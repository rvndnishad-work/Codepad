/**
 * Absolute links for interview emails. Server only.
 *
 * NEXTAUTH_URL (or AUTH_URL, which NextAuth v5 also reads) wins. Without
 * either, the address the recruiter is using right now is the best guess,
 * which keeps emailed links from pointing at localhost on a deployment that
 * forgot to set it.
 */
import { headers } from "next/headers";

export async function appOrigin(): Promise<string> {
  const env = process.env.NEXTAUTH_URL || process.env.AUTH_URL;
  if (env) return env.replace(/\/+$/, "");
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) return `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;
  } catch {
    // Outside a request (scripts, tests).
  }
  return "http://localhost:3000";
}

export const candidateJoinUrl = (origin: string, s: { id: string; shareToken: string }) => `${origin}/interview/${s.id}?token=${s.shareToken}`;
export const guestJoinUrl = (origin: string, sessionId: string, token: string) => `${origin}/interview/${sessionId}?guest=${token}`;
