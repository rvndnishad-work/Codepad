import { sendEmail, type EmailResult } from "@/lib/email";

export type InviteEmailInput = {
  candidateName: string;
  candidateEmail: string;
  positionTitle: string;
  workspaceName: string;
  inviteUrl: string;
};

/**
 * Send the candidate the link to their AI screening workpad. Returns the
 * adapter result; the caller should never throw if this fails — the invite is
 * already saved in the DB and the recruiter can copy the link manually.
 */
export async function sendInviteEmail(input: InviteEmailInput): Promise<EmailResult> {
  const subject = `Your AI technical screening for ${input.positionTitle} at ${input.workspaceName}`;

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
                <div style="font-size:11px;font-weight:800;letter-spacing:0.18em;color:#a78bfa;text-transform:uppercase;margin-bottom:8px;">
                  AI Screening Invitation
                </div>
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#F3F4F6;">
                  Hi ${escapeHtml(input.candidateName)} &mdash; you're invited to a technical screening.
                </h1>
                <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#cbd5e1;">
                  ${escapeHtml(input.workspaceName)} has set up an automated screening for the
                  <strong style="color:#F3F4F6;">${escapeHtml(input.positionTitle)}</strong> role.
                  An AI interviewer will guide you through a short coding exercise in your browser.
                </p>
                <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#cbd5e1;">
                  No prior setup required. Plan around 30 minutes of focused time.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:#ffe600;border-radius:10px;">
                      <a href="${input.inviteUrl}" style="display:inline-block;padding:14px 28px;color:#0B0F19;font-weight:800;font-size:14px;text-decoration:none;letter-spacing:0.04em;">
                        Start your screening &rarr;
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#64748b;">
                  Or paste this link into your browser:<br/>
                  <a href="${input.inviteUrl}" style="color:#a78bfa;word-break:break-all;">${input.inviteUrl}</a>
                </p>
                <hr style="border:none;border-top:1px solid #2a344a;margin:28px 0;"/>
                <p style="margin:0;font-size:11px;color:#64748b;line-height:1.6;">
                  This invitation was sent on behalf of ${escapeHtml(input.workspaceName)}.
                  If you didn't expect it, you can safely ignore this email.
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
    `Hi ${input.candidateName},`,
    "",
    `${input.workspaceName} has invited you to an automated AI technical screening for the ${input.positionTitle} role.`,
    "",
    "Start your screening here:",
    input.inviteUrl,
    "",
    "Plan around 30 minutes of focused time. No prior setup required.",
  ].join("\n");

  return sendEmail({
    to: input.candidateEmail,
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
