/**
 * Live room toolbox relay.
 *
 * GET    ?since=<cursor>&token=   tool state + Yjs updates after the cursor
 * POST   { update: base64 }       append a Yjs update (either side)
 * PATCH  ToolsAction              interviewers switch tools, present one,
 *                                 push a question card or run the timer
 *
 * Yjs content (whiteboard, code pad, notes, ranking) is shared by both
 * sides. The switchboard (toolsJson) is written by interviewers only.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import * as Y from "yjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { guestFromRequest } from "@/lib/interview/guests";
import { MAX_QUESTION, MAX_TIMER_SEC, TOOL_IDS, applyToolsAction, parseTools, toolRole, type ToolsAction } from "@/lib/interview/tools";

const MAX_UPDATE_BYTES = 768 * 1024;
const COMPACT_AFTER = 200;
const LIVE = new Set(["scheduled", "in_progress"]);

async function load(req: Request, id: string) {
  const token = new URL(req.url).searchParams.get("token");
  const [session, interview] = await Promise.all([
    auth().catch(() => null),
    prisma.interviewSession.findUnique({
      where: { id },
      select: { id: true, userId: true, panelJson: true, creatorRole: true, shareToken: true, status: true, format: true, toolsJson: true, type: true },
    }),
  ]);
  if (!interview || interview.type === "take-home") return { interview: null, role: null } as const;
  const guest = await guestFromRequest(req, interview.id);
  return { interview, role: toolRole(interview, session?.user?.id, token, !!guest) } as const;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { interview, role } = await load(req, id);
  if (!interview) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!role) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const since = Math.max(0, parseInt(new URL(req.url).searchParams.get("since") ?? "0", 10) || 0);
  const rows = await prisma.interviewToolUpdate.findMany({
    where: { sessionId: id, id: { gt: since } },
    orderBy: { id: "asc" },
    take: 500,
    select: { id: true, update: true },
  });
  return NextResponse.json(
    {
      role,
      live: LIVE.has(interview.status),
      state: parseTools(interview.toolsJson, interview.format),
      updates: rows.map((r) => Buffer.from(r.update).toString("base64")),
      cursor: rows.length ? rows[rows.length - 1].id : since,
      more: rows.length === 500,
      now: Date.now(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const postSchema = z.object({ update: z.string().min(1).max(Math.ceil((MAX_UPDATE_BYTES * 4) / 3) + 8) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { interview, role } = await load(req, id);
  if (!interview) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!role) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!LIVE.has(interview.status)) return NextResponse.json({ error: "This interview has ended." }, { status: 409 });

  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad update" }, { status: 400 });
  const bytes = Buffer.from(parsed.data.update, "base64");
  if (bytes.length === 0 || bytes.length > MAX_UPDATE_BYTES) return NextResponse.json({ error: "bad update" }, { status: 400 });
  // Reject anything that is not a Yjs update before it reaches other clients.
  try {
    Y.applyUpdate(new Y.Doc(), new Uint8Array(bytes));
  } catch {
    return NextResponse.json({ error: "bad update" }, { status: 400 });
  }

  const row = await prisma.interviewToolUpdate.create({ data: { sessionId: id, update: bytes }, select: { id: true } });

  const count = await prisma.interviewToolUpdate.count({ where: { sessionId: id } });
  if (count > COMPACT_AFTER) await compact(id).catch(() => {});

  return NextResponse.json({ id: row.id });
}

/** Folds every stored update into one row. Clients may receive the merged
 * row once more, which Yjs ignores. */
async function compact(sessionId: string) {
  await prisma.$transaction(async (tx) => {
    const rows = await tx.interviewToolUpdate.findMany({ where: { sessionId }, orderBy: { id: "asc" }, select: { id: true, update: true } });
    if (rows.length <= COMPACT_AFTER) return;
    const merged = Y.mergeUpdates(rows.map((r) => new Uint8Array(r.update)));
    await tx.interviewToolUpdate.deleteMany({ where: { sessionId, id: { lte: rows[rows.length - 1].id } } });
    await tx.interviewToolUpdate.create({ data: { sessionId, update: Buffer.from(merged) } });
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
  const { interview, role } = await load(req, id);
  if (!interview) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (role !== "interviewer") return NextResponse.json({ error: "Only interviewers can change the tools." }, { status: 403 });
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
