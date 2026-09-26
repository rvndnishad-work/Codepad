/**
 * GET /api/integrations/slack/callback
 * Slack sends people here after they pick a channel. We check the signed
 * state, make sure the same admin is still signed in, trade the code for the
 * channel webhook, and save it as an alert channel.
 */
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { appOrigin } from "@/lib/interview/links";
import { encryptAtRest } from "@/lib/crypto/at-rest";
import { requireAlertsAdmin } from "@/lib/alerts/access";
import { DEFAULT_ALERT_EVENTS, validateAlertUrl } from "@/lib/alerts/format";
import { SLACK_CALLBACK_PATH, exchangeSlackCode, slackOAuthConfigured, verifySlackState } from "@/lib/alerts/slack-oauth";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";

export const dynamic = "force-dynamic";

const MAX_CHANNELS = 10;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const origin = await appOrigin();
  const state = verifySlackState(sp.get("state"));
  if (!state) return NextResponse.redirect(`${origin}/dashboard`);

  const page = `${origin}/w/${encodeURIComponent(state.slug)}/alerts`;
  const back = (error: string) => NextResponse.redirect(`${page}?error=${encodeURIComponent(error)}`);

  if (sp.get("error")) return back(sp.get("error") === "access_denied" ? "The Slack install was cancelled." : "Slack did not finish the install.");
  const code = sp.get("code");
  if (!code) return back("Slack did not finish the install.");
  if (!slackOAuthConfigured()) return back("The Slack app is not set up on this server.");

  let ctx: Awaited<ReturnType<typeof requireAlertsAdmin>>;
  try {
    ctx = await requireAlertsAdmin(state.slug);
  } catch (err) {
    return back(err instanceof Error ? err.message : "You cannot manage alerts here.");
  }
  if (ctx.workspace.id !== state.workspaceId || ctx.userId !== state.userId) {
    return back("The install was started by someone else. Start it again.");
  }

  const exchanged = await exchangeSlackCode({
    code,
    redirectUri: `${origin}${SLACK_CALLBACK_PATH}`,
    clientId: process.env.SLACK_CLIENT_ID!.trim(),
    clientSecret: process.env.SLACK_CLIENT_SECRET!.trim(),
  });
  if (!exchanged.ok) return back(exchanged.error);
  const { install } = exchanged;
  const checked = validateAlertUrl("slack", install.webhookUrl);
  if (!checked.ok) return back("Slack returned an unexpected webhook address.");

  const count = await prisma.alertChannel.count({ where: { workspaceId: ctx.workspace.id } });
  if (count >= MAX_CHANNELS) return back(`A workspace can have up to ${MAX_CHANNELS} alert channels.`);

  const channel = await prisma.alertChannel.create({
    data: {
      workspaceId: ctx.workspace.id,
      provider: "slack",
      mode: "oauth",
      target: install.channel,
      teamName: install.teamName,
      url: encryptAtRest(checked.url),
      token: install.accessToken ? encryptAtRest(install.accessToken) : null,
      events: DEFAULT_ALERT_EVENTS,
      createdById: ctx.userId,
    },
    select: { id: true },
  });
  await writeWorkspaceAuditEntry({
    ...ctx.actor,
    action: WORKSPACE_AUDIT_ACTIONS.ALERT_CHANNEL_CONNECTED,
    targetType: "alertChannel",
    targetId: channel.id,
    meta: { provider: "slack", mode: "oauth", target: install.channel, team: install.teamName },
  });
  return NextResponse.redirect(`${page}?channel=${channel.id}&connected=1`);
}
