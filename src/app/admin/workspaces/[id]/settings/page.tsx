import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { Card, Kv, fmtDate } from "../_ui";

export const metadata = { title: "Workspace settings — Interviewpad Admin" };

type Props = { params: Promise<{ id: string }> };

/** Read-only copy of the workspace's own Settings pages. Owners change these in the workspace. */
export default async function WorkspaceSettingsPage({ params }: Props) {
  await requireAdminAccess("platform:admin");
  const { id } = await params;
  const [ws, integrations] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id },
      select: {
        timezone: true,
        dateFormat: true,
        hiringType: true,
        logoUrl: true,
        brandColor: true,
        senderName: true,
        replyToEmail: true,
        replyToConfirmedAt: true,
        privacyNoticeUrl: true,
        consentRequired: true,
        helpEmail: true,
        defaultTakeHomePassMark: true,
        defaultAiPassMark: true,
        defaultInterviewPassMark: true,
        inviteExpiryDays: true,
        remindNotStarted: true,
        remindBeforeDeadline: true,
        aiDefaultMinutes: true,
        keepVoiceAnswers: true,
        interviewerLanguage: true,
        interviewDefaultMinutes: true,
        scorecardFirst: true,
        scorecardReminderHours: true,
        require2faForAll: true,
        require2faFrom: true,
        sessionMaxAgeDays: true,
        sessionsRevokedAt: true,
        allowedEmailDomains: true,
        joinWithoutInvite: true,
        joinRole: true,
        apiKeyMaxLifetimeDays: true,
        allowExternalMcp: true,
        lowCreditThreshold: true,
        _count: { select: { mcpApiKeys: { where: { revokedAt: null } }, webhookEndpoints: true, alertChannels: true, calendarConnections: true, retentionRules: { where: { enabled: true } } } },
      },
    }),
    prisma.atsIntegration.findUnique({ where: { workspaceId: id }, select: { provider: true } }),
  ]);
  if (!ws) notFound();
  const yn = (b: boolean) => (b ? "Yes" : "No");
  const none = <span className="text-muted">Not set</span>;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">Read only. Owners and admins change these under Settings in their workspace.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Card title="General and candidate experience">
          <Kv k="Time zone">{ws.timezone}</Kv>
          <Kv k="Date format">{ws.dateFormat}</Kv>
          <Kv k="Hiring type">{ws.hiringType.replace("_", " ")}</Kv>
          <Kv k="Logo">{ws.logoUrl ? "Uploaded" : none}</Kv>
          <Kv k="Brand colour">{ws.brandColor ?? none}</Kv>
          <Kv k="Sender name">{ws.senderName ?? none}</Kv>
          <Kv k="Reply-to">{ws.replyToEmail ? `${ws.replyToEmail}${ws.replyToConfirmedAt ? ", confirmed" : ", not confirmed"}` : none}</Kv>
          <Kv k="Privacy notice">{ws.privacyNoticeUrl ?? none}</Kv>
          <Kv k="Candidate consent">{yn(ws.consentRequired)}</Kv>
          <Kv k="Help email">{ws.helpEmail ?? none}</Kv>
        </Card>
        <Card title="Screening defaults">
          <Kv k="Take-home pass mark">{ws.defaultTakeHomePassMark}</Kv>
          <Kv k="AI screening pass mark">{ws.defaultAiPassMark}</Kv>
          <Kv k="Interview pass mark">{ws.defaultInterviewPassMark}</Kv>
          <Kv k="Invite expiry">{ws.inviteExpiryDays} days</Kv>
          <Kv k="Reminders">
            {[ws.remindNotStarted && "not started", ws.remindBeforeDeadline && "before deadline"].filter(Boolean).join(", ") || "Off"}
          </Kv>
          <Kv k="AI screening length">{ws.aiDefaultMinutes} min</Kv>
          <Kv k="Keep voice answers">{yn(ws.keepVoiceAnswers)}</Kv>
          <Kv k="Interviewer language">{ws.interviewerLanguage}</Kv>
          <Kv k="Interview length">{ws.interviewDefaultMinutes} min</Kv>
          <Kv k="Scorecard first">{yn(ws.scorecardFirst)}</Kv>
          <Kv k="Scorecard reminder">{ws.scorecardReminderHours ? `${ws.scorecardReminderHours} h` : "Off"}</Kv>
        </Card>
        <Card title="Security">
          <Kv k="Two-factor for everyone">{ws.require2faForAll ? `Yes${ws.require2faFrom ? `, from ${fmtDate(ws.require2faFrom)}` : ""}` : "No"}</Kv>
          <Kv k="Sign-in lasts">{ws.sessionMaxAgeDays ? `${ws.sessionMaxAgeDays} days` : "Site default"}</Kv>
          <Kv k="Everyone signed out">{ws.sessionsRevokedAt ? fmtDate(ws.sessionsRevokedAt, true) : "Never"}</Kv>
          <Kv k="Allowed email domains">{ws.allowedEmailDomains.length ? ws.allowedEmailDomains.join(", ") : "Any"}</Kv>
          <Kv k="Join without invite">{ws.joinWithoutInvite ? `Yes, as ${ws.joinRole.toLowerCase()}` : "No"}</Kv>
          <Kv k="API key lifetime">{ws.apiKeyMaxLifetimeDays ? `${ws.apiKeyMaxLifetimeDays} days` : "No limit"}</Kv>
        </Card>
        <Card title="Connections">
          <Kv k="ATS">{integrations?.provider ?? none}</Kv>
          <Kv k="Active API keys">{ws._count.mcpApiKeys}</Kv>
          <Kv k="Webhooks">{ws._count.webhookEndpoints}</Kv>
          <Kv k="Alert channels">{ws._count.alertChannels}</Kv>
          <Kv k="Calendars connected">{ws._count.calendarConnections}</Kv>
          <Kv k="External tools in screenings">{yn(ws.allowExternalMcp)}</Kv>
          <Kv k="Retention rules on">{ws._count.retentionRules}</Kv>
          <Kv k="Low credit email">{ws.lowCreditThreshold === null ? "Off" : `Below ${ws.lowCreditThreshold}`}</Kv>
        </Card>
      </div>
    </div>
  );
}
