/**
 * Data for the workspace interview lobby and room, loaded per viewer so the
 * candidate never receives what only interviewers may see (reference
 * answers, the brief, questions not on the stage yet). Server only.
 */
import { prisma } from "@/lib/prisma";
import { parseQuestionnaire } from "@/lib/ai-interview/questionnaire";
import { parseTools, TOOL_BY_ID } from "./tools";
import { formatOf, parsePanel, questionState } from "./wizard";
import { passExpiry, signRoomPass } from "./room-pass";
import { roomViewer, ROOM_SELECT, type RoomViewer } from "./room-access";
import { parseRound, roundKey, type RoundKind } from "./room";
import { CANDIDATE_PAGE_SELECT, candidatePageSettings } from "@/lib/candidate-page-brand";
import { consentOutstanding, type CandidateBrand } from "@/lib/workspace/candidate-experience";
import { canMember } from "@/lib/permissions";
import { videoAddonAvailable, videoCallsOn } from "@/lib/video/addon";
import { liveKitConfig } from "@/lib/video/livekit-server";
import { getEffectivePricing } from "@/lib/billing/pricing-copy-store";
import { formatUsd } from "@/lib/billing/plans";
import { roomVideoMode, videoOffer, type RoomVideo } from "@/lib/video/room-video";
import { pendingRoomAsk, recordingConfigured } from "@/lib/recording/live-server";
import { appOrigin } from "./links";
import { siteOrigin } from "@/lib/site-url";

/** Site origin for links built without a request. Never localhost on a deployment. */
export function baseUrl(): string {
  return siteOrigin();
}

/** Path (no origin) that lets the candidate into one room until the pass expires. */
export function candidateRoomPath(s: { id: string; shareToken: string; scheduledAt: Date | null; totalSec: number }, slug: string): string {
  const k = signRoomPass({ sessionId: s.id, role: "candidate", expiresAt: passExpiry(s) }, s.shareToken);
  return `/w/${slug}/interviews/${s.id}/join?k=${k}`;
}

/** Full candidate link. */
export function candidateRoomUrl(s: { id: string; shareToken: string; scheduledAt: Date | null; totalSec: number }, slug: string, origin = baseUrl()): string {
  return `${origin}${candidateRoomPath(s, slug)}`;
}

/** Path (no origin) for an interviewer HR emailed (no account). */
export function guestRoomPath(s: { id: string; shareToken: string; scheduledAt: Date | null; totalSec: number }, slug: string, guestId: string): string {
  const k = signRoomPass({ sessionId: s.id, role: "guest", guestId, expiresAt: passExpiry(s) }, s.shareToken);
  return `/w/${slug}/interviews/${s.id}/join?k=${k}`;
}

export type RoundSummary = { key: string; kind: RoundKind; title: string; meta: string | null; steps: number };

export type RoundFile = { path: string; code: string };

/** The round on the stage, with everything the editor needs. Never the tests or reference solutions. */
export type StageRound = {
  key: string;
  kind: RoundKind;
  title: string;
  description: string;
  /** Sandpack template, for the live preview. */
  template: string | null;
  mode: "harness" | "unit-js" | "frontend" | "playground" | "prompt";
  files: RoundFile[];
  /** Harness: starter per language. */
  languages: { id: string; starter: string }[];
  signature: string | null;
  slug: string | null;
  stepId: string | null;
  step: number;
  steps: number;
  hint: string | null;
};

export type RoomData = {
  viewer: RoomViewer;
  /** `brand` is the workspace logo, colour, help contact and privacy notice (Settings > Candidate experience). */
  workspace: { name: string; slug: string; brand: CandidateBrand };
  interview: {
    /** The candidate must tick the consent box before entering the room. Always false for interviewers. */
    consentNeeded: boolean;
    /** The built-in call may be recorded, so the consent box says so and is always asked. */
    recorded: boolean;
    id: string;
    title: string;
    status: string;
    format: string | null;
    formatLabel: string;
    formatBlurb: string | null;
    scheduledAt: string | null;
    startedAt: string | null;
    finishedAt: string | null;
    totalSec: number;
    candidateName: string;
    hostName: string;
    panel: string[];
    guests: string[];
    tools: string[];
    round: string | null;
    verdict: string | null;
    /** The team's video call link, if one was set. */
    meetingUrl: string | null;
  };
  /** How people talk: built-in video, the meeting link, or nothing set up. */
  video: RoomVideo;
  /** Interviewers see every round; candidates only the one on the stage. */
  rounds: RoundSummary[];
  roundCount: number;
  stage: StageRound | null;
  /** Interviewers only. */
  private: {
    brief: string | null;
    guideTitle: string | null;
    guide: { q: string; a: string | null }[];
    questionsNeeded: boolean;
    pickHref: string | null;
    candidateLink: string;
    notes: string | null;
    rubric: Record<string, number> | null;
    rubricNotes: string | null;
    rawShareToken: string;
  } | null;
};

function ids(raw: string | null | undefined): string[] {
  try {
    const v = JSON.parse(raw ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function json<T>(raw: string | null | undefined, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function signatureOf(fn: string | null, raw: string | null): string | null {
  if (!fn || !raw) return null;
  const sig = json<{ params?: { name: string; type: string }[]; returnType?: string }>(raw, {});
  return `${fn}(${(sig.params ?? []).map((p) => `${p.name}: ${p.type}`).join(", ")}) → ${sig.returnType ?? "void"}`;
}

type Access =
  | { ok: true; data: RoomData }
  | { ok: false; reason: "missing" | "login" | "forbidden" };

export async function loadRoom(
  slug: string,
  id: string,
  a: { user: { id: string; name?: string | null; email?: string | null } | null; cookieHeader: string | null },
): Promise<Access> {
  const s = await prisma.interviewSession.findUnique({
    where: { id },
    select: {
      ...ROOM_SELECT,
      title: true,
      type: true,
      format: true,
      scheduledAt: true,
      startedAt: true,
      finishedAt: true,
      totalSec: true,
      toolsJson: true,
      roomRound: true,
      meetingUrl: true,
      builtinVideo: true,
      recordVideo: true,
      verdict: true,
      notes: true,
      scenario: true,
      challengeIds: true,
      playgroundIds: true,
      promptScenarioIds: true,
      questionPlan: true,
      guideTemplateId: true,
      guideJson: true,
      interviewerBrief: true,
      rubric: { select: { ratings: true, notes: true } },
      candidateConsentAt: true,
      user: { select: { name: true, email: true } },
      workspace: { select: { id: true, slug: true, planName: true, trialEndsAt: true, stripeSubscriptionId: true, videoEnabled: true, ...CANDIDATE_PAGE_SELECT } },
      guests: { select: { email: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!s || s.type !== "live" || !s.workspace || s.workspace.slug !== slug) return { ok: false, reason: "missing" };

  const viewer = await roomViewer(s, { user: a.user, cookieHeader: a.cookieHeader, legacy: false });
  if (!viewer) return { ok: false, reason: a.user ? "forbidden" : "login" };
  const interviewer = viewer.role === "interviewer";
  const page = candidatePageSettings(s.workspace);

  const challengeIds = ids(s.challengeIds);
  const playgroundIds = ids(s.playgroundIds);
  const promptIds = ids(s.promptScenarioIds);
  const roundCount = challengeIds.length + playgroundIds.length + promptIds.length;
  const current = parseRound(s.roomRound);

  // Round list: all of them for interviewers, none for the candidate (the
  // stage shows the current one when the interviewer puts it up).
  let rounds: RoundSummary[] = [];
  if (interviewer && roundCount) {
    const [cs, ps, qs] = await Promise.all([
      challengeIds.length
        ? prisma.challenge.findMany({ where: { id: { in: challengeIds } }, select: { id: true, title: true, difficulty: true, template: true, _count: { select: { steps: true } } } })
        : [],
      playgroundIds.length ? prisma.snippet.findMany({ where: { id: { in: playgroundIds }, userId: s.userId }, select: { id: true, title: true, template: true } }) : [],
      promptIds.length ? prisma.promptScenario.findMany({ where: { id: { in: promptIds } }, select: { id: true, title: true, category: true } }) : [],
    ]);
    const cById = new Map(cs.map((c) => [c.id, c]));
    const pById = new Map(ps.map((p) => [p.id, p]));
    const qById = new Map(qs.map((q) => [q.id, q]));
    rounds = [
      ...challengeIds.flatMap((cid) => {
        const c = cById.get(cid);
        return c ? [{ key: roundKey({ kind: "challenge", id: c.id, step: 0 }), kind: "challenge" as const, title: c.title, meta: c.difficulty, steps: Math.max(1, c._count.steps) }] : [];
      }),
      ...playgroundIds.flatMap((pid) => {
        const p = pById.get(pid);
        return p ? [{ key: roundKey({ kind: "playground", id: p.id, step: 0 }), kind: "playground" as const, title: p.title, meta: p.template, steps: 1 }] : [];
      }),
      ...promptIds.flatMap((qid) => {
        const q = qById.get(qid);
        return q ? [{ key: roundKey({ kind: "prompt", id: q.id, step: 0 }), kind: "prompt" as const, title: q.title, meta: q.category, steps: 1 }] : [];
      }),
    ];
  }

  // The round on the stage, only if it really belongs to this interview.
  let stage: StageRound | null = null;
  if (current?.kind === "challenge" && challengeIds.includes(current.id)) {
    const c = await prisma.challenge.findUnique({
      where: { id: current.id },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        template: true,
        steps: {
          orderBy: { position: "asc" },
          select: { id: true, title: true, description: true, template: true, starterFiles: true, judgingMode: true, functionName: true, signatureJson: true, languagesJson: true, starterCodeJson: true, hint: true },
        },
      },
    });
    const st = c?.steps[Math.min(current.step, Math.max(0, (c?.steps.length ?? 1) - 1))];
    if (c && st) {
      const mode = st.judgingMode === "harness" ? "harness" : st.judgingMode === "unit-js" && /^test-/.test(st.template) ? "unit-js" : "frontend";
      const starters = json<Record<string, string>>(st.starterCodeJson, {});
      const langs = json<string[]>(st.languagesJson, Object.keys(starters));
      stage = {
        key: roundKey(current),
        kind: "challenge",
        title: c.steps.length > 1 ? `${c.title}: ${st.title ?? `Step ${current.step + 1}`}` : c.title,
        description: st.description || c.description,
        template: st.template,
        mode,
        files: Object.entries(json<Record<string, string>>(st.starterFiles, {})).map(([path, code]) => ({ path, code })),
        languages: mode === "harness" ? langs.map((l) => ({ id: l, starter: starters[l] ?? "" })) : [],
        signature: mode === "harness" ? signatureOf(st.functionName, st.signatureJson) : null,
        slug: c.slug,
        stepId: st.id,
        step: current.step,
        steps: c.steps.length,
        hint: interviewer ? st.hint : null,
      };
    }
  } else if (current?.kind === "playground" && playgroundIds.includes(current.id)) {
    const p = await prisma.snippet.findFirst({ where: { id: current.id, userId: s.userId }, select: { id: true, title: true, template: true, files: true } });
    if (p) {
      const files = json<Record<string, string | { code: string }>>(p.files, {});
      stage = {
        key: roundKey(current),
        kind: "playground",
        title: p.title,
        description: s.scenario ?? "",
        template: p.template,
        mode: "playground",
        files: Object.entries(files).map(([path, v]) => ({ path, code: typeof v === "string" ? v : (v?.code ?? "") })),
        languages: [],
        signature: null,
        slug: null,
        stepId: null,
        step: 0,
        steps: 1,
        hint: null,
      };
    }
  } else if (current?.kind === "prompt" && promptIds.includes(current.id)) {
    const q = await prisma.promptScenario.findUnique({ where: { id: current.id }, select: { id: true, title: true, objective: true, description: true } });
    if (q) {
      stage = {
        key: roundKey(current),
        kind: "prompt",
        title: q.title,
        description: [q.objective, q.description].filter(Boolean).join("\n\n"),
        template: null,
        mode: "prompt",
        files: [{ path: "/answer.md", code: "" }],
        languages: [],
        signature: null,
        slug: null,
        stepId: null,
        step: 0,
        steps: 1,
        hint: null,
      };
    }
  }

  const panelIds = parsePanel(s.panelJson);
  const panelUsers = panelIds.length ? await prisma.user.findMany({ where: { id: { in: panelIds } }, select: { id: true, name: true, email: true } }) : [];
  const fmt = formatOf(s.format);
  const tools = parseTools(s.toolsJson, s.format).enabled.map((t) => TOOL_BY_ID[t].label);

  let priv: RoomData["private"] = null;
  if (interviewer) {
    const tpl = s.guideTemplateId && s.workspaceId
      ? await prisma.aIInterviewTemplate.findFirst({ where: { id: s.guideTemplateId, workspaceId: s.workspaceId }, select: { title: true, testsCode: true } })
      : null;
    const needed = s.status === "scheduled" && questionState({ questionPlan: s.questionPlan, roundCount, guideTemplateId: s.guideTemplateId ?? (s.guideJson ? "bank" : null) }) === "needed";
    priv = {
      brief: s.interviewerBrief,
      guideTitle: tpl?.title ?? (s.guideJson ? "Picked questions" : null),
      // The library questionnaire, then any public bank questions picked for this candidate.
      guide: [...(tpl ? parseQuestionnaire(tpl.testsCode) : []), ...(s.guideJson ? parseQuestionnaire(s.guideJson) : [])].map((i) => ({ q: i.q, a: i.a ?? null })),
      questionsNeeded: needed,
      pickHref: needed ? `/w/${slug}/interviews/${s.id}/questions` : null,
      candidateLink: candidateRoomUrl(s, slug, await appOrigin()),
      notes: s.notes,
      rubric: s.rubric ? json<Record<string, number>>(s.rubric.ratings, {}) : null,
      rubricNotes: s.rubric?.notes ?? null,
      rawShareToken: s.shareToken,
    };
  }

  // Built-in video, the team's link, or nothing. Only interviewers who
  // manage billing are offered the add-on; candidates never see prices.
  const addonOn = videoCallsOn(s.workspace);
  const { mode, configured } = roomVideoMode({ addonOn, builtinVideo: s.builtinVideo, meetingUrl: s.meetingUrl, liveKitReady: !!liveKitConfig() });
  let canManageBilling = false;
  if (interviewer && viewer.userId && !addonOn) {
    const m = await prisma.workspaceMember.findFirst({ where: { workspaceId: s.workspace.id, userId: viewer.userId }, select: { role: true, permissions: true } });
    canManageBilling = !!m && (await canMember(m, "billing:manage").catch(() => false));
  }
  const offer = videoOffer({ interviewer, canManageBilling, addonOn, planAllows: videoAddonAvailable(s.workspace), planName: s.workspace.planName });
  const video: RoomVideo = {
    mode,
    // Candidates are never told about server setup.
    configured: interviewer ? configured : true,
    ...offer,
    addonOn: interviewer ? addonOn : false,
    builtinVideo: s.builtinVideo,
    recordVideo: s.recordVideo && s.builtinVideo,
    recordingReady: interviewer ? recordingConfigured() : false,
    billingHref: `/w/${slug}/billing`,
    // Only people shown the offer see a price; read it only then.
    offerPrice: offer.canOffer ? formatUsd((await getEffectivePricing()).videoAddon.monthlyCents) : "",
  };
  // A recorded call always needs the candidate's agreement first, even when
  // the workspace does not ask for consent otherwise.
  const recorded = video.recordVideo && mode === "builtin";
  // Asked in the room and not answered yet: the room asks in place (where
  // the candidate can also say no), so the lobby does not ask again.
  const roomAsk = !interviewer && recorded ? await pendingRoomAsk(s) : null;

  return {
    ok: true,
    data: {
      viewer,
      video,
      workspace: { name: s.workspace.name, slug: s.workspace.slug, brand: page.brand },
      interview: {
        consentNeeded:
          !interviewer &&
          !["completed", "abandoned", "cancelled"].includes(s.status) &&
          consentOutstanding({ consentRequired: page.consentRequired || (recorded && !roomAsk) }, s.candidateConsentAt ?? roomAsk?.prevConsentAt),
        recorded: recorded && !roomAsk,
        id: s.id,
        title: s.title,
        status: s.status,
        format: s.format,
        formatLabel: fmt?.label ?? "Live interview",
        formatBlurb: fmt?.blurb ?? null,
        scheduledAt: s.scheduledAt?.toISOString() ?? null,
        startedAt: s.startedAt?.toISOString() ?? null,
        finishedAt: s.finishedAt?.toISOString() ?? null,
        totalSec: s.totalSec,
        candidateName: s.candidateName?.trim() || "Candidate",
        hostName: s.user.name ?? s.user.email ?? "Your interviewer",
        panel: panelUsers.map((u) => u.name ?? u.email ?? "Teammate"),
        guests: interviewer ? s.guests.map((g) => g.email) : [],
        tools,
        round: stage ? stage.key : null,
        verdict: interviewer ? s.verdict : null,
        meetingUrl: s.meetingUrl ?? null,
      },
      rounds,
      roundCount,
      stage,
      private: priv,
    },
  };
}
