// Mint a NextAuth v5 JWT for the admin user and print Cookie: header.
import "dotenv/config";
import { encode } from "@auth/core/jwt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET not set in env");
  const adminEmail = (process.env.ADMIN_EMAILS || "").split(",")[0].trim();
  if (!adminEmail) throw new Error("ADMIN_EMAILS not set");

  const user = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true, name: true, email: true, image: true, userType: true },
  });
  if (!user) throw new Error("admin user not found: " + adminEmail);

  // Token shape mirrors what src/lib/auth.ts produces in callbacks.jwt:
  // it adds `uid` and refreshes `userType` on every jwt() call.
  const token = {
    sub: user.id,
    uid: user.id,
    name: user.name,
    email: user.email,
    picture: user.image,
    userType: user.userType,
  };

  // NextAuth v5 default cookie names are "authjs.session-token" in dev,
  // "__Secure-authjs.session-token" in prod. dev server is plain HTTP.
  const cookieName = "authjs.session-token";

  // 30 day expiry — matches NextAuth default.
  const maxAge = 30 * 24 * 60 * 60;
  const jwt = await encode({
    token,
    secret,
    salt: cookieName,
    maxAge,
  });

  console.log("COOKIE_NAME=" + cookieName);
  console.log("COOKIE_VALUE=" + jwt);
  console.log("CURL_HEADER=Cookie: " + cookieName + "=" + jwt);
}

main().finally(() => prisma.$disconnect());
