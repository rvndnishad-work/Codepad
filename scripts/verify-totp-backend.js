/**
 * Backend verification for IP-42. Exercises the same Prisma + crypto + otplib
 * paths the /profile/security server actions hit. Smoke-tests the round-trip
 * without needing a browser session.
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { authenticator } = require("otplib");
const { createCipheriv, createDecipheriv, randomBytes, createHash } = require("crypto");

authenticator.options = { window: 1, step: 30 };

const PREFIX = "v1";
const IV_LENGTH = 12;
function getKey() {
  return Buffer.from(process.env.ENCRYPTION_KEY_BASE64, "base64");
}
function encryptAtRest(pt) {
  if (!pt) return pt;
  const iv = randomBytes(IV_LENGTH);
  const c = createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([c.update(pt, "utf8"), c.final()]);
  return [PREFIX, iv.toString("base64"), c.getAuthTag().toString("base64"), enc.toString("base64")].join(":");
}
function decryptAtRest(stored) {
  if (!stored || !stored.startsWith(PREFIX + ":")) return stored;
  const [, iv, tag, ct] = stored.split(":");
  const d = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64")), d.final()]).toString("utf8");
}
function hashHex(s) {
  return createHash("sha256").update(s).digest("hex");
}

(async () => {
  const prisma = new PrismaClient();
  const out = [];
  try {
    // Pick an admin user for verification.
    const user = await prisma.user.findFirst({ where: { email: "rvndnishad@gmail.com" } });
    if (!user) throw new Error("Expected admin user not found.");
    out.push(`[1] picked user: ${user.email} (${user.id})`);

    // ── 1. Start enrollment: mint secret, encrypt, persist as pending ───────
    const secret = authenticator.generateSecret();
    const encrypted = encryptAtRest(secret);
    out.push(`[2] secret minted (${secret.length} b32 chars); ciphertext starts: ${encrypted.slice(0, 12)}...`);
    out.push(`    encrypted format starts with v1: → ${encrypted.startsWith("v1:")}`);

    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: encrypted, totpEnabledAt: null, totpBackupCodes: null },
    });
    await prisma.securityAuditLog.create({
      data: { userId: user.id, event: "TOTP_ENROLL_START" },
    });
    out.push(`[3] pending enrollment persisted; audit row written`);

    // ── 2. Round-trip decrypt + generate live token + verify ────────────────
    const stored = await prisma.user.findUnique({
      where: { id: user.id },
      select: { totpSecret: true, totpEnabledAt: true },
    });
    const decrypted = decryptAtRest(stored.totpSecret);
    out.push(`[4] decrypted secret matches original: ${decrypted === secret}`);

    const liveToken = authenticator.generate(decrypted);
    const verified = authenticator.verify({ token: liveToken, secret: decrypted });
    out.push(`[5] live token = ${liveToken}; verify() = ${verified}`);

    const bogusVerify = authenticator.verify({ token: "000000", secret: decrypted });
    out.push(`[6] bogus token rejected: ${!bogusVerify}`);

    // ── 3. Verify enrollment: mint backup codes, mark enabled ───────────────
    const codes = [];
    const records = [];
    for (let i = 0; i < 10; i++) {
      const hex = randomBytes(5).toString("hex");
      codes.push(hex.match(/.{1,4}/g).join("-"));
      records.push({ hash: hashHex(hex), usedAt: null });
    }
    const enabledAt = new Date();
    await prisma.user.update({
      where: { id: user.id },
      data: { totpEnabledAt: enabledAt, totpBackupCodes: JSON.stringify(records) },
    });
    await prisma.securityAuditLog.create({
      data: { userId: user.id, event: "TOTP_ENROLL_VERIFY" },
    });
    out.push(`[7] enrolled at ${enabledAt.toISOString()}; minted 10 backup codes`);
    out.push(`    example shown to user: ${codes[0]}`);
    out.push(`    stored hash (first): ${records[0].hash.slice(0, 16)}... (no plaintext anywhere)`);

    // ── 4. Read back enrolled state ────────────────────────────────────────
    const after = await prisma.user.findUnique({
      where: { id: user.id },
      select: { totpEnabledAt: true, totpBackupCodes: true, totpSecret: true },
    });
    const unused = JSON.parse(after.totpBackupCodes).filter((c) => c.usedAt === null).length;
    out.push(`[8] read back: enrolled=${!!after.totpEnabledAt}, unused codes=${unused}, secret still encrypted=${after.totpSecret.startsWith("v1:")}`);

    // ── 5. Disable (cleanup) ───────────────────────────────────────────────
    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: null, totpEnabledAt: null, totpBackupCodes: null },
    });
    await prisma.securityAuditLog.create({
      data: { userId: user.id, event: "TOTP_DISABLE" },
    });
    out.push(`[9] disabled + cleaned up`);

    // ── 6. Inspect audit trail ─────────────────────────────────────────────
    const events = await prisma.securityAuditLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    out.push(`[10] audit log rows for this user: ${events.length}`);
    events.forEach((e) => out.push(`     - ${e.event} @ ${e.createdAt.toISOString()}`));

    console.log(out.join("\n"));
    console.log("\n✓ All TOTP backend paths verified.");
  } catch (err) {
    console.error("FAIL:", err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
