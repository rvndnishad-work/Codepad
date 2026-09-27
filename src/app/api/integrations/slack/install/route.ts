/**
 * GET /api/integrations/slack/install?slug=<workspace>
 * Starts the "Add to Slack" install. Admins only.
 */
import { NextResponse, type NextRequest } from "next/server";
import { appOrigin } from "@/lib/interview/links";
import { requireAlertsAdmin } from "@/lib/alerts/access";
import { SLACK_CALLBACK_PATH, createSlackState, slackAuthorizeUrl, slackOAuthConfigured } from "@/lib/alerts/slack-oauth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") ?? "";
  const origin = await appOrigin();
  const back = (error: string) =>
    NextResponse.redirect(`${origin}/w/${encodeURIComponent(slug)}/alerts?error=${encodeURIComponent(error)}`);
  if (!slug) return NextResponse.json({ error: "Missing workspace." }, { status: 400 });
  if (!slackOAuthConfigured()) return back("The Slack app is not set up on this server. Paste a webhook URL instead.");

  let ctx: Awaited<ReturnType<typeof requireAlertsAdmin>>;
  try {
    ctx = await requireAlertsAdmin(slug);
  } catch (err) {
    return back(err instanceof Error ? err.message : "You cannot manage alerts here.");
  }

  let state: string;
  try {
    state = createSlackState({ workspaceId: ctx.workspace.id, slug: ctx.workspace.slug, userId: ctx.userId });
  } catch (err) {
    return back(err instanceof Error ? err.message : "Could not start the Slack install.");
  }
  return NextResponse.redirect(
    slackAuthorizeUrl({
      clientId: process.env.SLACK_CLIENT_ID!.trim(),
      redirectUri: `${origin}${SLACK_CALLBACK_PATH}`,
      state,
    }),
  );
}
