/**
 * One-off helper: print a fresh 256-bit key (base64-encoded) for
 * ENCRYPTION_KEY_BASE64. Paste the output into your env file.
 *
 *   node scripts/generate-encryption-key.js
 *
 * Generates a new key every run — don't run twice in production unless you
 * mean to rotate (and have a re-encrypt strategy ready).
 */
const { randomBytes } = require("crypto");
console.log("Add this to your environment (Vercel encrypted env var, .env.local, etc.):");
console.log("");
console.log(`ENCRYPTION_KEY_BASE64=${randomBytes(32).toString("base64")}`);
console.log("");
console.log("After saving, restart the Next.js dev server so the new value is picked up.");
