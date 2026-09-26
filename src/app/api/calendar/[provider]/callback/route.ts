import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptAtRest } from "@/lib/crypto/at-rest";
import { appOrigin } from "@/lib/interview/links";
import { exchangeCode, fetchAccountEmail, isCalendarProvider, providerConfig } from "@/lib/calendar/providers";
import { verifyState } from "@/lib/calendar/state";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";

/** OAuth redirect target for the calendar connect flow. */
export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const url = new URL(req.url);
  const origin = await appOrigin();
  if (!isCalendarProvider(provider)) return NextResponse.json({ error: "unknown provider" }, { status: 404 });

  const state = verifyState(url.searchParams.get("state"));
  if (!state || state.p !== provider) return NextResponse.redirect(`${origin}/dashboard`);
  // Success returns to where the member came from; problems land on the Calendar page.
  const done = (q: string) => {
    const path = state.r && !q.startsWith("error") ? state.r : `/w/${encodeURIComponent(state.s)}/calendar`;
    return NextResponse.redirect(`${origin}${path}${path.includes("?") ? "&" : "?"}${q}`);
  };

  // The member who started the flow must be the one finishing it.
  const session = await auth().catch(() => null);
  if (!session?.user?.id || session.user.id !== state.u) return done("error=wrong_account");
  const member = await prisma.workspaceMember.findFirst({ where: { workspaceId: state.w, userId: state.u }, select: { userId: true } });
  if (!member) return done("error=not_member");

  if (url.searchParams.get("error")) return done("error=denied");
  const code = url.searchParams.get("code");
  const cfg = providerConfig(provider);
  if (!code || !cfg) return done("error=not_configured");

  try {
    const tokens = await exchangeCode(provider, cfg, code, `${origin}/api/calendar/${provider}/callback`);
    const email = (await fetchAccountEmail(provider, tokens.accessToken)) ?? session.user.email?.toLowerCase() ?? "";
    if (!email) return done("error=no_email");
    const data = {
      provider,
      email,
      accessTokenEnc: encryptAtRest(tokens.accessToken),
      refreshTokenEnc: tokens.refreshToken ? encryptAtRest(tokens.refreshToken) : null,
      expiresAt: tokens.expiresAt,
      scopes: tokens.scopes,
      status: "active",
      lastError: null,
    };
    const prior = await prisma.calendarConnection.findUnique({ where: { workspaceId_userId: { workspaceId: state.w, userId: state.u } }, select: { id: true, provider: true } });
    // A different provider means the old events live on another calendar: forget them.
    if (prior && prior.provider !== provider) await prisma.calendarConnection.delete({ where: { id: prior.id } });
    await prisma.calendarConnection.upsert({
      where: { workspaceId_userId: { workspaceId: state.w, userId: state.u } },
      create: { ...data, userId: state.u, workspaceId: state.w },
      update: data,
    });
    void writeWorkspaceAuditEntry({
      workspaceId: state.w,
      actorUserId: state.u,
      actorEmail: session.user.email ?? null,
      action: WORKSPACE_AUDIT_ACTIONS.CALENDAR_CONNECTED,
      targetType: "calendarConnection",
      targetId: state.u,
      meta: { provider },
    });
    return done(`connected=${provider}`);
  } catch (err) {
    console.error("[calendar] connect failed:", err instanceof Error ? err.message : err);
    return done("error=exchange_failed");
  }
}
