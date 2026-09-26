/**
 * Live room relay. Everything the two sides share goes through here over
 * plain HTTPS, so it works on any network that can open the site: no
 * peer-to-peer link, no third-party signalling server.
 *
 * GET    ?channel=&since=&client=&place=&wait=
 *        Yjs updates after the cursor, who is here (with their cursors),
 *        the tool switchboard and the room status. With `wait` it holds the
 *        request open (long poll) until something changes. With `client` it
 *        also marks that tab as present.
 * POST   { update?, awareness?, client?, place?, leave? }
 *        Append a Yjs update, publish this tab's cursor, or leave.
 * PATCH  ToolsAction   interviewers switch tools, present one, push a
 *        question card or run the timer (channel "tools" only).
 *
 * Channels: "tools" is the room document (tools and, in the workspace room,
 * the coding rounds). "code:<challengeId>" is the classic attempt page's
 * editor for one challenge.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import * as Y from "yjs";
import { Awareness, applyAwarenessUpdate } from "y-protocols/awareness";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { roomViewerFromRequest, ROOM_SELECT, type RoomViewer } from "@/lib/interview/room-access";
import { MAX_QUESTION, MAX_TIMER_SEC, TOOL_IDS, applyToolsAction, parseTools, type ToolsAction } from "@/lib/interview/tools";
import { PRESENCE_TTL_MS, parseChannel } from "@/lib/interview/relay";

export const maxDuration = 30;

const MAX_UPDATE_BYTES = 768 * 1024;
const MAX_AWARENESS_BYTES = 16 * 1024;
const COMPACT_AFTER = 200;
const MAX_WAIT_MS = 8000;
const WAIT_STEP_MS = 350;
const LIVE = new Set(["scheduled", "in_progress"]);

async function load(req: Request, id: string) {
  const [session, interview] = await Promise.all([
    auth().catch(() => null),
    prisma.interviewSession.findUnique({
      where: { id },
      select: { ...ROOM_SELECT, format: true, toolsJson: true, type: true, startedAt: true, roomRound: true, totalSec: true },
    }),
  ]);
  if (!interview || interview.type === "take-home") return { interview: null, viewer: null } as const;
  const viewer = await roomViewerFromRequest(req, interview, session?.user?.id ? { id: session.user.id, name: session.user.name, email: session.user.email } : null);
  return { interview, viewer } as const;
}

function clientOf(v: string | number | null | undefined): number | null {
  const n = typeof v === "number" ? v : parseInt(v ?? "", 10);
  return Number.isInteger(n) && n >= 0 && n <= 0xffffffff ? n : null;
}

async function touch(sessionId: string, channel: string, clientId: number, viewer: RoomViewer, place: string, awareness?: Uint8Array<ArrayBuffer>) {
  const now = new Date();
  const existing = await prisma.interviewPresence.findUnique({
    where: { sessionId_channel_clientId: { sessionId, channel, clientId } },
    select: { id: true, place: true, role: true, name: true },
  });
  if (!existing) {
    await prisma.interviewPresence
      .create({ data: { sessionId, channel, clientId, role: viewer.role, name: viewer.name, place, awareness: awareness ?? null, lastSeenAt: now, changedAt: now } })
      .catch(() => {});
    // Now and then, clear rows from tabs that closed long ago.
    if (Math.random() < 0.1) {
      await prisma.interviewPresence.deleteMany({ where: { sessionId, lastSeenAt: { lt: new Date(now.getTime() - 60 * 60 * 1000) } } }).catch(() => {});
    }
    return;
  }
  const changed = !!awareness || existing.place !== place || existing.role !== viewer.role || existing.name !== viewer.name;
  await prisma.interviewPresence.update({
    where: { id: existing.id },
    data: { lastSeenAt: now, place, role: viewer.role, name: viewer.name, ...(awareness ? { awareness } : {}), ...(changed ? { changedAt: now } : {}) },
  });
}

type Fingerprint = { maxid: number; pchanged: Date | null; fp: string };

async function fingerprint(sessionId: string, channel: string, clientId: number): Promise<Fingerprint | null> {
  const rows = await prisma.$queryRaw<{ maxid: number | bigint | null; pchanged: Date | null; status: string; roomRound: string | null; toolsJson: string | null; startedAt: Date | null }[]>`
    SELECT
      (SELECT MAX(u."id") FROM "InterviewToolUpdate" u WHERE u."sessionId" = s."id" AND u."channel" = ${channel}) AS maxid,
      (SELECT MAX(p."changedAt") FROM "InterviewPresence" p WHERE p."sessionId" = s."id" AND p."channel" = ${channel} AND p."clientId" <> ${clientId}) AS pchanged,
      s."status", s."roomRound", s."toolsJson", s."startedAt"
    FROM "InterviewSession" s WHERE s."id" = ${sessionId}`;
  const r = rows[0];
  if (!r) return null;
  return { maxid: Number(r.maxid ?? 0), pchanged: r.pchanged, fp: `${r.status}|${r.roomRound ?? ""}|${r.startedAt?.getTime() ?? ""}|${r.toolsJson ?? ""}` };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { interview, viewer } = await load(req, id);
  if (!interview) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!viewer) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const sp = new URL(req.url).searchParams;
  const channel = parseChannel(sp.get("channel"));
  if (!channel) return NextResponse.json({ error: "bad channel" }, { status: 400 });
  const since = Math.max(0, parseInt(sp.get("since") ?? "0", 10) || 0);
  const clientId = clientOf(sp.get("client"));
  const place = sp.get("place") === "lobby" ? "lobby" : "room";
  const wait = Math.min(MAX_WAIT_MS, Math.max(0, parseInt(sp.get("wait") ?? "0", 10) || 0));

  if (clientId !== null) await touch(id, channel, clientId, viewer, place);

  let rows = await prisma.interviewToolUpdate.findMany({
    where: { sessionId: id, channel, id: { gt: since } },
    orderBy: { id: "asc" },
    take: 500,
    select: { id: true, update: true },
  });

  // Long poll: hold the request until an edit, a cursor, a join or leave, or
  // a room change lands, or the wait runs out.
  if (!rows.length && wait > 0 && clientId !== null) {
    const start = await fingerprint(id, channel, clientId);
    const deadline = Date.now() + wait;
    while (start && Date.now() < deadline && !req.signal.aborted) {
      await sleep(WAIT_STEP_MS);
      const cur = await fingerprint(id, channel, clientId);
      if (!cur) break;
      if (cur.maxid > since || cur.fp !== start.fp || (cur.pchanged?.getTime() ?? 0) !== (start.pchanged?.getTime() ?? 0)) {
        if (cur.maxid > since) {
          rows = await prisma.interviewToolUpdate.findMany({
            where: { sessionId: id, channel, id: { gt: since } },
            orderBy: { id: "asc" },
            take: 500,
            select: { id: true, update: true },
          });
        }
        break;
      }
    }
  }

  const [fresh, peers] = await Promise.all([
    prisma.interviewSession.findUnique({ where: { id }, select: { status: true, startedAt: true, roomRound: true, toolsJson: true, totalSec: true } }),
    prisma.interviewPresence.findMany({
      where: { sessionId: id, channel, lastSeenAt: { gt: new Date(Date.now() - PRESENCE_TTL_MS) } },
      orderBy: { joinedAt: "asc" },
      select: { clientId: true, role: true, name: true, place: true, awareness: true, joinedAt: true },
    }),
  ]);
  const room = fresh ?? interview;

  return NextResponse.json(
    {
      role: viewer.role,
      me: { name: viewer.name },
      live: LIVE.has(room.status),
      state: parseTools(room.toolsJson, interview.format),
      room: {
        status: room.status,
        startedAt: room.startedAt ? room.startedAt.toISOString() : null,
        round: room.roomRound ?? null,
        totalSec: room.totalSec,
      },
      peers: peers.map((p) => ({
        clientId: p.clientId,
        role: p.role,
        name: p.name,
        place: p.place,
        awareness: p.awareness ? Buffer.from(p.awareness).toString("base64") : null,
        joinedAt: p.joinedAt.toISOString(),
      })),
      updates: rows.map((r) => Buffer.from(r.update).toString("base64")),
      cursor: rows.length ? rows[rows.length - 1].id : since,
      more: rows.length === 500,
      now: Date.now(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const b64 = (max: number) => z.string().min(1).max(Math.ceil((max * 4) / 3) + 8);
const postSchema = z.object({
  update: b64(MAX_UPDATE_BYTES).optional(),
  awareness: b64(MAX_AWARENESS_BYTES).optional(),
  client: z.number().int().min(0).max(0xffffffff).optional(),
  place: z.enum(["lobby", "room"]).optional(),
  leave: z.boolean().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { interview, viewer } = await load(req, id);
  if (!interview) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!viewer) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const channel = parseChannel(new URL(req.url).searchParams.get("channel"));
  if (!channel) return NextResponse.json({ error: "bad channel" }, { status: 400 });

  // sendBeacon posts text/plain; parse the body ourselves.
  const parsed = postSchema.safeParse(await req.text().then((t) => JSON.parse(t)).catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { update, awareness, client, place, leave } = parsed.data;

  if (leave && client !== undefined) {
    await prisma.interviewPresence.deleteMany({ where: { sessionId: id, channel, clientId: client } });
    return NextResponse.json({ ok: true });
  }

  let rowId: number | null = null;
  if (update) {
    if (!LIVE.has(interview.status)) return NextResponse.json({ error: "This interview has ended." }, { status: 409 });
    const bytes = Buffer.from(update, "base64");
    if (bytes.length === 0 || bytes.length > MAX_UPDATE_BYTES) return NextResponse.json({ error: "bad update" }, { status: 400 });
    // Reject anything that is not a Yjs update before it reaches other clients.
    try {
      Y.applyUpdate(new Y.Doc(), new Uint8Array(bytes));
    } catch {
      return NextResponse.json({ error: "bad update" }, { status: 400 });
    }
    const row = await prisma.interviewToolUpdate.create({ data: { sessionId: id, channel, update: bytes }, select: { id: true } });
    rowId = row.id;
    const count = await prisma.interviewToolUpdate.count({ where: { sessionId: id, channel } });
    if (count > COMPACT_AFTER) await compact(id, channel).catch(() => {});
  }

  if (awareness && client !== undefined) {
    const bytes = Buffer.from(awareness, "base64");
    if (bytes.length === 0 || bytes.length > MAX_AWARENESS_BYTES) return NextResponse.json({ error: "bad awareness" }, { status: 400 });
    try {
      applyAwarenessUpdate(new Awareness(new Y.Doc()), new Uint8Array(bytes), null);
    } catch {
      return NextResponse.json({ error: "bad awareness" }, { status: 400 });
    }
    await touch(id, channel, client, viewer, place ?? "room", bytes);
  }

  return NextResponse.json({ id: rowId });
}

/** Folds every stored update of a channel into one row. Clients may receive
 * the merged row once more, which Yjs ignores. */
async function compact(sessionId: string, channel: string) {
  await prisma.$transaction(async (tx) => {
    const rows = await tx.interviewToolUpdate.findMany({ where: { sessionId, channel }, orderBy: { id: "asc" }, select: { id: true, update: true } });
    if (rows.length <= COMPACT_AFTER) return;
    const merged = Y.mergeUpdates(rows.map((r) => new Uint8Array(r.update)));
    await tx.interviewToolUpdate.deleteMany({ where: { sessionId, channel, id: { lte: rows[rows.length - 1].id } } });
    await tx.interviewToolUpdate.create({ data: { sessionId, channel, update: Buffer.from(merged) } });
  });
}

const actionSchema = z.union([
  z.object({ type: z.literal("enable"), tool: z.enum(TOOL_IDS), on: z.boolean() }),
  z.object({ type: z.literal("present"), tool: z.enum(TOOL_IDS).nullable() }),
  z.object({ type: z.literal("question"), text: z.string().max(MAX_QUESTION).nullable() }),
  z.object({ type: z.literal("timer"), op: z.literal("set"), seconds: z.number().int().min(1).max(MAX_TIMER_SEC) }),
  z.object({ type: z.literal("timer"), op: z.enum(["start", "pause", "reset", "clear"]) }),
]);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { interview, viewer } = await load(req, id);
  if (!interview) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (viewer?.role !== "interviewer") return NextResponse.json({ error: "Only interviewers can change the tools." }, { status: 403 });
  if (!LIVE.has(interview.status)) return NextResponse.json({ error: "This interview has ended." }, { status: 409 });

  const body = await req.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad action" }, { status: 400 });
  const action = parsed.data as ToolsAction;

  // Compare-and-swap so two interviewers clicking at once do not lose a change.
  let raw = interview.toolsJson;
  for (let i = 0; i < 4; i++) {
    const cur = parseTools(raw, interview.format);
    const next = applyToolsAction(cur, action, Date.now());
    if (!next) return NextResponse.json({ state: cur, now: Date.now() });
    const json = JSON.stringify(next);
    const res = await prisma.interviewSession.updateMany({ where: { id, toolsJson: raw }, data: { toolsJson: json } });
    if (res.count === 1) return NextResponse.json({ state: next, now: Date.now() });
    const fresh = await prisma.interviewSession.findUnique({ where: { id }, select: { toolsJson: true } });
    raw = fresh?.toolsJson ?? null;
  }
  return NextResponse.json({ error: "Busy, try again." }, { status: 409 });
}
