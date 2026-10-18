import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
    /** When this sign-in started (ms since epoch). Null for sign-ins from before it was recorded. */
    signedInAt?: number | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    /** When this sign-in started (ms since epoch). */
    signedInAt?: number;
    /** Revocation anchor for tokens minted before `signedInAt` existed: their
     *  first-seen `iat` (ms), frozen so re-signing cannot move it forward. */
    authAt?: number;
  }
}
