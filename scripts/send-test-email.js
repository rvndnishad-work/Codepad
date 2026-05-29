/**
 * Verify the Resend integration in test mode.
 *
 *   node scripts/send-test-email.js you@your-resend-account-email.com
 *
 * Mirrors src/lib/email.ts exactly (same endpoint/headers/body) so a success
 * here proves the live `sendEmail()` path works with your key + sender.
 *
 * TEST-MODE RULES (no verified domain yet):
 *   - sender must be onboarding@resend.dev  (this script forces it)
 *   - recipient must be the email you signed up to Resend with
 *     (or a reserved address: delivered@resend.dev / bounced@resend.dev)
 */
require("dotenv").config();

const to = process.argv[2] || process.env.TEST_EMAIL_TO;
const from = process.env.EMAIL_FROM || "Interviewpad (dev) <onboarding@resend.dev>";
const apiKey = process.env.RESEND_API_KEY;

(async () => {
  if (!apiKey) {
    console.error("✗ RESEND_API_KEY is not set in .env — add your Resend dev key first.");
    process.exit(1);
  }
  if (!to) {
    console.error(
      "✗ No recipient. Usage: node scripts/send-test-email.js you@example.com\n" +
        "  (in test mode this must be your Resend account email).",
    );
    process.exit(1);
  }

  console.log(`→ sending test email   from: ${from}\n                       to:   ${to}`);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        subject: "Interviewpad — Resend test mode ✓",
        html: "<p>If you can read this, Resend is wired up for local dev. 🎉</p>",
        text: "If you can read this, Resend is wired up for local dev.",
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`✗ Resend ${res.status}: ${JSON.stringify(body)}`);
      if (res.status === 403) {
        console.error(
          "  Hint: 403 usually means the sender domain isn't verified. In test mode keep\n" +
            "  from=onboarding@resend.dev and send only to your Resend account email.",
        );
      }
      process.exit(1);
    }
    console.log(`✓ accepted by Resend — id: ${body.id}\n  Check the inbox (and Resend dashboard → Emails).`);
  } catch (err) {
    console.error("✗ request failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
})();
