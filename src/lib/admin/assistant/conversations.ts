/**
 * Stored conversations (AssistantConversation / AssistantMessage) and the
 * chat turn that ties the model, the tools and storage together.
 */
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getSwitch } from "@/lib/admin/switches";
import { logAdminAction, type AdminActor } from "@/lib/admin/audit";
import { AssistantError, assistantApiKey, NOT_CONFIGURED, runToolLoop, type Content } from "./model";
import { systemPrompt } from "./prompt";
import { runTool, toolDeclarations } from "./tools";
import type { Proposal, ToolCallRecord } from "./types";

export const HISTORY_MESSAGES = 20;
export const MAX_MESSAGE_CHARS = 4000;

export type MessageDTO = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls: ToolCallRecord[];
  proposal: Proposal | null;
  createdAt: string;
};

export type ConversationDTO = { id: string; title: string; updatedAt: string };

type MessageRow = { id: string; role: string; content: string; toolCalls: unknown; proposal: unknown; createdAt: Date };

export function toDTO(m: MessageRow): MessageDTO {
  return {
    id: m.id,
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
    toolCalls: Array.isArray(m.toolCalls) ? (m.toolCalls as ToolCallRecord[]) : [],
    proposal: (m.proposal as Proposal | null) ?? null,
    createdAt: m.createdAt.toISOString(),
  };
}

const MSG_SELECT = { id: true, role: true, content: true, toolCalls: true, proposal: true, createdAt: true } as const;

/** Conversation title from the first question. */
export function titleFrom(message: string): string {
  const one = message.replace(/\s+/g, " ").trim();
  if (one.length <= 60) return one || "New conversation";
  const cut = one.slice(0, 60);
  const space = cut.lastIndexOf(" ");
  return `${space > 30 ? cut.slice(0, space) : cut}…`;
}

export async function listConversations(userId: string, take = 50): Promise<ConversationDTO[]> {
  const rows = await prisma.assistantConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take,
    select: { id: true, title: true, updatedAt: true },
  });
  return rows.map((r) => ({ id: r.id, title: r.title, updatedAt: r.updatedAt.toISOString() }));
}

export async function getConversation(id: string, userId: string) {
  const conv = await prisma.assistantConversation.findFirst({
    where: { id, userId },
    select: { id: true, title: true, updatedAt: true },
  });
  if (!conv) return null;
  const rows = await prisma.assistantMessage.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: MSG_SELECT,
  });
  return {
    conversation: { id: conv.id, title: conv.title, updatedAt: conv.updatedAt.toISOString() },
    messages: rows.reverse().map(toDTO),
  };
}

export async function renameConversation(id: string, userId: string, title: string) {
  const t = title.replace(/\s+/g, " ").trim().slice(0, 120);
  if (!t) return false;
  const res = await prisma.assistantConversation.updateMany({ where: { id, userId }, data: { title: t } });
  return res.count === 1;
}

export async function deleteConversation(id: string, userId: string) {
  const res = await prisma.assistantConversation.deleteMany({ where: { id, userId } });
  return res.count === 1;
}

/** Earlier turns as model history. Cards are summarised with their status. */
export function historyContents(rows: { role: string; content: string; proposal: unknown }[]): Content[] {
  const out: Content[] = [];
  for (const r of rows) {
    const role = r.role === "user" ? "user" : "model";
    let text = r.content;
    const p = r.proposal as Proposal | null;
    if (p && role === "model") {
      text += `\n[Approval card: ${p.summary}. Status: ${p.status}${p.result ? `. ${p.result}` : ""}]`;
    }
    text = text.trim();
    if (!text) continue;
    const last = out[out.length - 1];
    if (last && last.role === role) last.parts.push({ text });
    else out.push({ role, parts: [{ text }] });
  }
  // The model expects the history to start with a user turn.
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

export type ChatResult = { conversation: ConversationDTO; messages: MessageDTO[] };

export async function chat(opts: {
  userId: string;
  actor: AdminActor;
  conversationId?: string | null;
  message: string;
  fetchImpl?: typeof fetch;
}): Promise<ChatResult> {
  const message = opts.message.trim();
  if (!message) throw new AssistantError("Write a question first.", 400);
  if (message.length > MAX_MESSAGE_CHARS) throw new AssistantError(`Keep the question under ${MAX_MESSAGE_CHARS} characters.`, 400);

  const sw = await getSwitch("admin-assistant");
  if (sw.state !== "on") throw new AssistantError(sw.message || "The assistant is paused.", 503);
  if (!assistantApiKey()) throw new AssistantError(NOT_CONFIGURED, 503);

  let conv = opts.conversationId
    ? await prisma.assistantConversation.findFirst({ where: { id: opts.conversationId, userId: opts.userId }, select: { id: true, title: true } })
    : null;
  if (opts.conversationId && !conv) throw new AssistantError("Conversation not found", 404);
  const created = !conv;
  if (!conv) {
    conv = await prisma.assistantConversation.create({
      data: { userId: opts.userId, title: titleFrom(message) },
      select: { id: true, title: true },
    });
  }

  const prior = created
    ? []
    : (
        await prisma.assistantMessage.findMany({
          where: { conversationId: conv.id },
          orderBy: { createdAt: "desc" },
          take: HISTORY_MESSAGES,
          select: { role: true, content: true, proposal: true },
        })
      ).reverse();

  const userMsg = await prisma.assistantMessage.create({
    data: { conversationId: conv.id, role: "user", content: message },
    select: MSG_SELECT,
  });

  const calls: ToolCallRecord[] = [];
  const slotProposals: (Proposal | null)[] = [];
  let text: string;
  try {
    const loop = await runToolLoop({
      system: systemPrompt(),
      contents: [...historyContents(prior), { role: "user", parts: [{ text: message }] }],
      tools: toolDeclarations(),
      fetchImpl: opts.fetchImpl,
      execute: async (call) => {
        // Reserve the slot before awaiting so chips keep the model's order.
        const slot = calls.push({ name: call.name, args: {}, summary: call.name, ok: false }) - 1;
        slotProposals[slot] = null;
        const res = await runTool(call.name, call.args, { actor: { id: opts.actor.id ?? null, email: opts.actor.email ?? null } });
        calls[slot] = { name: call.name, args: res.args, summary: res.summary, ok: res.ok, ...(res.href ? { href: res.href } : {}) };
        slotProposals[slot] = res.proposal ?? null;
        return { result: res.data as unknown } as Record<string, unknown>;
      },
    });
    text = loop.text;
  } catch (err) {
    // Leave no half turn behind: the admin sees the error and can send again.
    if (created) await prisma.assistantConversation.delete({ where: { id: conv.id } }).catch(() => {});
    else await prisma.assistantMessage.delete({ where: { id: userMsg.id } }).catch(() => {});
    throw err;
  }

  const proposals = slotProposals.filter((p): p is Proposal => !!p);
  const json = (v: unknown) => v as Prisma.InputJsonValue;
  const main = await prisma.assistantMessage.create({
    data: {
      conversationId: conv.id,
      role: "assistant",
      content: text,
      toolCalls: calls.length ? json(calls) : undefined,
      proposal: proposals[0] ? json(proposals[0]) : undefined,
    },
    select: MSG_SELECT,
  });
  const extra = [];
  for (const p of proposals.slice(1)) {
    extra.push(
      await prisma.assistantMessage.create({
        data: { conversationId: conv.id, role: "assistant", content: "", proposal: json(p) },
        select: MSG_SELECT,
      }),
    );
  }
  const updated = await prisma.assistantConversation.update({
    where: { id: conv.id },
    data: { updatedAt: new Date() },
    select: { id: true, title: true, updatedAt: true },
  });

  if (calls.length) {
    await logAdminAction({
      actor: opts.actor,
      via: "assistant",
      action: "assistant.tools",
      targetType: "assistant",
      targetId: conv.id,
      targetLabel: conv.title,
      after: { tools: calls.map((c) => ({ name: c.name, args: c.args, ok: c.ok })) },
      note: calls.map((c) => c.name).join(", "),
    });
  }

  return {
    conversation: { id: updated.id, title: updated.title, updatedAt: updated.updatedAt.toISOString() },
    messages: [toDTO(userMsg), toDTO(main), ...extra.map(toDTO)],
  };
}
