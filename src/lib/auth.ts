import { cache } from "react";
import NextAuth, { type NextAuthConfig, CredentialsSignin } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  consumeBackupCode,
  decryptTotpSecret,
  verifyTotpCode,
} from "@/lib/totp";
import { rateLimitDistributed } from "@/lib/rate-limit";

/**
 * IP-42 P5: credentials login enforces TOTP when the user has it enabled.
 *
 * The login form has a 2-step UX:
 *   1. Submit email+password. authorize() verifies the password. If the user
 *      has `totpEnabledAt` and no `totp` was sent, we throw `TotpRequired`,
 *      which the form catches by `code` and reveals the 6-digit input.
 *   2. Resubmit email+password+totp. authorize() runs the same password
 *      check (cheap with bcrypt, fine on the second pass), then verifies
 *      the TOTP code or, failing that, consumes a backup code.
 *
 * We rerun the password check on step 2 (rather than caching the verified
 * state in a cookie) so the second submit can't be replayed without re-
 * proving knowledge of the password. Bcrypt at ~100ms is the right cost
 * model here.
 */
class TotpRequired extends CredentialsSignin {
  code = "TotpRequired";
}
class TotpInvalid extends CredentialsSignin {
  code = "TotpInvalid";
}
/** IP-55: thrown when too many TOTP/backup verification attempts are made for
 *  an account in the window — brute-force protection. */
class TotpRateLimited extends CredentialsSignin {
  code = "TotpRateLimited";
}

// Per-account cap on TOTP/backup verification attempts. 6-digit TOTP has 1e6
// combinations and rolls every 30s, so 10 tries / 15 min is plenty for a real
// user fumbling a code while making online guessing infeasible.
const TOTP_MAX_ATTEMPTS = 10;
const TOTP_ATTEMPT_WINDOW_MS = 15 * 60_000;

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  /** 6-digit TOTP OR a backup code like "a1b2-c3d4-e5". Optional on first
   *  submit; required on second submit when totp is enabled. */
  totp: z.string().min(1).max(40).optional(),
});

const oauthProviders: NextAuthConfig["providers"] = [];
if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  oauthProviders.push(
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    })
  );
}
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  oauthProviders.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    })
  );
}
if (process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET) {
  oauthProviders.push(
    Facebook({
      clientId: process.env.AUTH_FACEBOOK_ID,
      clientSecret: process.env.AUTH_FACEBOOK_SECRET,
    })
  );
}

async function logSecurityEvent(
  userId: string,
  event: string,
  meta?: Record<string, unknown>,
  request?: Request,
) {
  try {
    let ip: string | null = null;
    let userAgent: string | null = null;
    if (request?.headers) {
      ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip") ??
        null;
      userAgent = request.headers.get("user-agent") ?? null;
    }
    await prisma.securityAuditLog.create({
      data: {
        userId,
        event,
        ip,
        userAgent,
        meta: meta ? JSON.stringify(meta) : null,
      },
    });
  } catch (err) {
    // Audit failures must never block login — log and move on.
    console.error("[auth] audit write failed:", err);
  }
}

const credentialsProvider = Credentials({
  id: "credentials",
  name: "Email and password",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
    totp: { label: "Two-factor code", type: "text" },
  },
  async authorize(raw, request) {
    const parsed = credsSchema.safeParse(raw);
    if (!parsed.success) return null;
    const { email, password, totp } = parsed.data;
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        passwordHash: true,
        totpSecret: true,
        totpEnabledAt: true,
        totpBackupCodes: true,
      },
    });
    if (!user || !user.passwordHash) return null;
    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) return null;

    // 2FA gate. Once `totpEnabledAt` is set, the user CANNOT sign in with
    // just a password — `TotpRequired` makes the form prompt for the code;
    // `TotpInvalid` rejects a bad code.
    if (user.totpEnabledAt && user.totpSecret) {
      if (!totp) {
        throw new TotpRequired();
      }
      // IP-55: brute-force protection. Gate the verify path per account before
      // checking the code. The first password-only submit (TotpRequired above)
      // doesn't consume budget — only actual code submissions do. Distributed
      // (Redis-backed) so the cap holds across serverless instances; an
      // in-memory counter could be spread-and-bypassed.
      const rl = await rateLimitDistributed(`totp:${user.id}`, TOTP_MAX_ATTEMPTS, TOTP_ATTEMPT_WINDOW_MS);
      if (!rl.ok) {
        await logSecurityEvent(
          user.id,
          "TOTP_RATE_LIMITED",
          { phase: "login", resetMs: rl.resetMs },
          request as Request,
        );
        throw new TotpRateLimited();
      }
      const plaintext = decryptTotpSecret(user.totpSecret);
      const cleaned = totp.trim();

      // Try TOTP first (the common path).
      if (/^\d{6}$/.test(cleaned.replace(/\s+/g, ""))) {
        if (verifyTotpCode(plaintext, cleaned)) {
          await logSecurityEvent(user.id, "TOTP_VERIFY_OK_LOGIN", undefined, request as Request);
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
          };
        }
      } else {
        // Looks like a backup code. Try to consume it.
        const consumed = consumeBackupCode(user.totpBackupCodes ?? null, cleaned);
        if (consumed.ok) {
          await prisma.user.update({
            where: { id: user.id },
            data: { totpBackupCodes: consumed.stored },
          });
          await logSecurityEvent(
            user.id,
            "TOTP_BACKUP_USED_LOGIN",
            undefined,
            request as Request,
          );
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
          };
        }
      }

      await logSecurityEvent(user.id, "TOTP_VERIFY_FAILED", { phase: "login" }, request as Request);
      throw new TotpInvalid();
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    };
  },
});

const credentialsEnabled = true; // always available; account just needs a password set

const useJwt = credentialsEnabled;

export const {
  handlers,
  auth: uncachedAuth,
  signIn,
  signOut,
  unstable_update: updateSession,
} = NextAuth({
  adapter: PrismaAdapter(prisma),
  // NextAuth v5 requires JWT sessions when Credentials is used.
  session: { strategy: useJwt ? "jwt" : "database" },
  providers: [...oauthProviders, credentialsProvider],
  logger: {
    error(error) {
      // A session cookie that can't be decrypted (stale cookie from a previous
      // AUTH_SECRET, or one minted in another environment) is an expected,
      // recoverable condition — `auth()` already treats it as logged-out. Don't
      // spam the dev overlay / prod logs with it. Everything else logs normally.
      if (error?.name === "JWTSessionError") return;
      console.error(error);
    },
  },
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user }) {
      if (!user.id) return true;
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { banned: true },
      });
      if (dbUser?.banned) {
        throw new Error("Your account has been suspended.");
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      // The jwt callback runs on EVERY auth() call (per-request, not per-
      // session) under the JWT strategy. Reading the DB here unconditionally
      // meant a `user.findUnique` on every page render — the dominant cost in
      // navigation latency. Instead we read userType from the DB only when the
      // token is first minted (sign-in) or explicitly refreshed via
      // updateSession() (see /api/me/user-type after a UserTypeChooser change).
      // Steady-state reads do zero DB work.
      if (user?.id) {
        token.uid = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { userType: true },
        });
        token.userType = dbUser?.userType ?? null;
      } else if (trigger === "update" && token.uid) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.uid as string },
          select: { userType: true },
        });
        token.userType = dbUser?.userType ?? null;
      }
      return token;
    },
    async session({ session, token, user }) {
      if (session.user) {
        if (token?.uid) session.user.id = token.uid as string;
        else if (user?.id) session.user.id = user.id;
        // Expose userType so client + server components can branch on it
        (session.user as { userType?: string | null }).userType =
          (token?.userType as string | null | undefined) ?? null;
      }
      return session;
    },
  },
});

/**
 * Per-request-memoized `auth()`. A single page render calls `auth()` in
 * several places (root-layout Header, the page itself, sometimes a nested
 * layout). Without memoization each call re-decodes the session cookie and
 * re-runs the `jwt` callback. React's `cache()` collapses all calls within one
 * server request to a single evaluation. Safe here because `auth` is only ever
 * invoked as `auth()` (no middleware/route-handler wrapper form is used).
 */
export const auth = cache(uncachedAuth);
