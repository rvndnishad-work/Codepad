import { Prisma } from "@prisma/client";

/**
 * User.userType values.
 *
 * - "candidate": signed up as a developer (the register form's default).
 * - "recruiter": signed up on the hiring side.
 * - "screened": created for a candidate when a recruiter's take-home starts.
 *   They never signed up, so they count on the hiring side, not as
 *   developers. Signing up or signing in with OAuth later turns them into
 *   "candidate".
 * - null: legacy and OAuth sign-ups, counted as developers.
 */
export const SCREENED_USER_TYPE = "screened";

/** Developer accounts: signed-up candidates plus legacy users with no type. */
export const developerUserWhere: Prisma.UserWhereInput = {
  OR: [{ userType: "candidate" }, { userType: null }],
};

/** SQL form of developerUserWhere for a "User" aliased as u. */
export const developerUserSql = Prisma.sql`(u."userType" IS NULL OR u."userType" = 'candidate')`;
