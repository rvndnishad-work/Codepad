import { sendEmail } from "@/lib/email";

export type RecruiterNotifyInput = {
  recruiterEmail: string;
  recruiterName: string;
  candidateName: string;
  positionTitle: string;
  workspaceName: string;
  score: number;
  aiSuspicionScore: number | null;
  consoleUrl: string;
};

/**
 * Notify a single workspace recruiter that a candidate just submitted. Caller
 * fans out one call per member; this keeps templating logic in one place.
 * Returns a normalized status — failures should be logged, never thrown.
 */
export async function sendRecruiterNotifyEmail(input: RecruiterNotifyInput) {
  const integrityNote =
    input.aiSuspicionScore !== null && input.aiSuspicionScore >= 60
      ? ` <strong style="color:#fb7185;">(High AI-cheat suspicion: ${input.aiSuspicionScore}/100)</strong>`
      : input.aiSuspicionScore !== null && input.aiSuspicionScore >= 30
        ? ` <span style="color:#fbbf24;">(Some integrity flags: ${input.aiSuspicionScore}/100)</span>`
        : "";

  const subject = `${input.candidateName} completed their AI screening for ${input.positionTitle} — ${input.score}%`;

  const html = `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#0B0F19;font-family:'Inter',system-ui,sans-serif;color:#F3F4F6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0B0F19;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#161B2E;border:1px solid #2a344a;border-radius:16px;padding:32px;">
            <tr>
              <td>
                <div style="font-size:11px;font-weight:800;letter-spacing:0.18em;color:#34d399;text-transform:uppercase;margin-bottom:8px;">
                  Screening Completed
                </div>
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#F3F4F6;">
                  ${escapeHtml(input.candidateName)} finished their screening.
                </h1>
                <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#cbd5e1;">
                  Hi ${escapeHtml(input.recruiterName)}, a candidate just submitted their AI screening
                  for the <strong style="color:#F3F4F6;">${escapeHtml(input.positionTitle)}</strong> role.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0f19;border:1px solid #2a344a;border-radius:12px;margin-bottom:24px;">
                  <tr>
                    <td style="padding:16px 18px;">
                      <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;">Composite score</div>
                      <div style="font-size:32px;font-weight:900;color:${input.score >= 80 ? "#34d399" : input.score >= 60 ? "#fbbf24" : "#f87171"};margin-top:4px;">
                        ${input.score}%${integrityNote}
                      </div>
                    </td>
                  </tr>
                </table>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:#ffe600;border-radius:10px;">
                      <a href="${input.consoleUrl}" style="display:inline-block;padding:14px 28px;color:#0B0F19;font-weight:800;font-size:14px;text-decoration:none;letter-spacing:0.04em;">
                        Review scorecard &rarr;
                      </a>
                    </td>
                  </tr>
                </table>
                <hr style="border:none;border-top:1px solid #2a344a;margin:28px 0;"/>
                <p style="margin:0;font-size:11px;color:#64748b;line-height:1.6;">
                  Sent from ${escapeHtml(input.workspaceName)} — Interviewpad AI Screening.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

  const text = [
    `${input.candidateName} finished their AI screening for ${input.positionTitle}.`,
    "",
    `Composite score: ${input.score}%`,
    input.aiSuspicionScore !== null ? `AI-cheat suspicion: ${input.aiSuspicionScore}/100` : "",
    "",
    `Review the scorecard: ${input.consoleUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return sendEmail({
    to: input.recruiterEmail,
    subject,
    html,
    text,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
