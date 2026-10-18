-- Data only. Accounts made for take-home candidates got no userType (or
-- "candidate" from prisma/backfill-user-types.ts), so they were counted as
-- developers. They have no password and no OAuth account, which means they
-- never signed up or signed in themselves: mark them "screened".
UPDATE "User" u
SET "userType" = 'screened'
WHERE (u."userType" IS NULL OR u."userType" = 'candidate')
  AND u."passwordHash" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "Account" a WHERE a."userId" = u."id");
