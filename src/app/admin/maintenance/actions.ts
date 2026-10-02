"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { logAdminAction } from "@/lib/admin/audit";
import {
  areaDef,
  clearRulesCache,
  isExemptPath,
  LEGACY_RULE_ID,
} from "@/lib/admin/maintenance-rules";
import { clearMaintenanceCache, MAINTENANCE_KEY } from "@/lib/maintenance";
import { DEFAULT_MAINTENANCE, type MaintenanceConfig } from "@/lib/settings-constants";

export type ActionResult = { ok: true; id?: string } | { ok: false, error: string };

export type ScheduleInput = {
  /** Set to edit an existing rule. */
  ruleId?: string | null;
  area: string;
  /** Custom rules only: one path per entry. */
  paths?: string[];
  /** ISO time, or null to start now. */
  startsAt: string | null;
  /** Minutes, or null to run until someone brings it back. */
  durationMin: number | null;
  message: string;
  bannerHours: number;
  bypassRoles: string[];
};

async function actor() {
  const session = await requireAdminAccess("platform:admin");
  return { id: session?.user?.id ?? null, email: session?.user?.email ?? null };
}

function cleanPaths(raw: string[] | undefined): string[] | string {
  const out: string[] = [];
  for (const line of raw ?? []) {
    const p = line.trim().replace(/\/+$/, "") || "/";
    if (!p) continue;
    if (!p.startsWith("/")) return `Paths start with a slash: ${p}`;
    if (p.length > 200) return "Paths are at most 200 characters.";
    if (!/^[A-Za-z0-9/_\-.*]+$/.test(p)) return `Use letters, digits, - _ . / and * only: ${p}`;
    if (p === "/") return "Use the Whole site row to take the whole site down.";
    if (isExemptPath(p)) return `${p} is always kept up (admin, sign-in, webhooks, crons).`;
    if (!out.includes(p)) out.push(p);
  }
  if (!out.length) return "Add at least one path.";
  if (out.length > 20) return "At most 20 paths per rule.";
  return out;
}

function label(area: string, paths: string[]) {
  return area === "custom" ? paths.join(", ") : areaDef(area)?.label ?? area;
}

export async function scheduleMaintenanceAction(input: ScheduleInput): Promise<ActionResult> {
  const who = await actor();

  const message = (input.message ?? "").trim();
  if (!message) return { ok: false, error: "Write the message people will see." };
  if (message.length > 1000) return { ok: false, error: "Keep the message under 1,000 characters." };

  let paths: string[];
  if (input.area === "custom") {
    const res = cleanPaths(input.paths);
    if (typeof res === "string") return { ok: false, error: res };
    paths = res;
  } else {
    const def = areaDef(input.area);
    if (!def) return { ok: false, error: "Unknown area." };
    paths = [...def.paths];
  }

  const now = new Date();
  let startsAt: Date | null = null;
  if (input.startsAt) {
    const d = new Date(input.startsAt);
    if (Number.isNaN(d.getTime())) return { ok: false, error: "Pick a valid start time." };
    // A start in the past (or within a minute) means now.
    startsAt = d.getTime() > now.getTime() + 60_000 ? d : null;
  }
  let endsAt: Date | null = null;
  if (input.durationMin !== null && input.durationMin !== undefined) {
    const mins = Math.round(Number(input.durationMin));
    if (!Number.isFinite(mins) || mins < 5 || mins > 60 * 24 * 14) {
      return { ok: false, error: "Length is between 5 minutes and 14 days." };
    }
    endsAt = new Date((startsAt ?? now).getTime() + mins * 60_000);
  }
  const bannerHours = [0, 1, 24].includes(input.bannerHours) ? input.bannerHours : 24;

  const roleKeys = (input.bypassRoles ?? []).filter((k) => typeof k === "string" && k !== "PLATFORM_ADMIN");
  const known = roleKeys.length
    ? await prisma.role.findMany({ where: { key: { in: roleKeys }, scope: "GLOBAL" }, select: { key: true } })
    : [];
  const bypassRoles = known.map((r) => r.key);

  const data = { area: input.area, paths, message, startsAt, endsAt, bannerHours, bypassRoles };

  if (input.ruleId) {
    const before = await prisma.maintenanceRule.findUnique({ where: { id: input.ruleId } });
    if (!before) return { ok: false, error: "That maintenance no longer exists." };
    if (before.endedAt) return { ok: false, error: "That maintenance has already ended." };
    // Editing a running rule keeps its original start.
    const running = !before.startsAt || before.startsAt.getTime() <= now.getTime();
    const patch = running
      ? {
          ...data,
          startsAt: before.startsAt,
          endsAt:
            input.durationMin === null
              ? null
              : new Date((before.startsAt ?? before.createdAt).getTime() + Math.round(Number(input.durationMin)) * 60_000),
        }
      : data;
    if (patch.endsAt && patch.endsAt.getTime() <= now.getTime()) {
      return { ok: false, error: "That length would end it in the past. Use Bring back instead." };
    }
    const after = await prisma.maintenanceRule.update({ where: { id: before.id }, data: patch });
    await logAdminAction({
      actor: who,
      action: "maintenance.update",
      targetType: "maintenance",
      targetId: after.id,
      targetLabel: label(after.area, after.paths),
      before,
      after,
    });
    clearRulesCache();
    revalidatePath("/admin/maintenance");
    return { ok: true, id: after.id };
  }

  const created = await prisma.maintenanceRule.create({ data: { ...data, createdById: who.id } });
  await logAdminAction({
    actor: who,
    action: "maintenance.create",
    targetType: "maintenance",
    targetId: created.id,
    targetLabel: label(created.area, created.paths),
    after: created,
  });
  clearRulesCache();
  revalidatePath("/admin/maintenance");
  return { ok: true, id: created.id };
}

/** Cancel a scheduled rule or bring a running one back. */
export async function endMaintenanceAction(input: { ruleId: string; note?: string }): Promise<ActionResult> {
  const who = await actor();
  const note = input.note?.trim().slice(0, 2000) || null;

  if (input.ruleId === LEGACY_RULE_ID) {
    const row = await prisma.siteSetting.findUnique({ where: { key: MAINTENANCE_KEY } });
    let cfg: MaintenanceConfig = DEFAULT_MAINTENANCE;
    try {
      if (row) cfg = { ...DEFAULT_MAINTENANCE, ...(JSON.parse(row.value) as Partial<MaintenanceConfig>) };
    } catch {
      /* keep defaults */
    }
    const next = { ...cfg, enabled: false };
    await prisma.siteSetting.upsert({
      where: { key: MAINTENANCE_KEY },
      update: { value: JSON.stringify(next) },
      create: { key: MAINTENANCE_KEY, value: JSON.stringify(next) },
    });
    clearMaintenanceCache();
    await logAdminAction({
      actor: who,
      action: "maintenance.end",
      targetType: "maintenance",
      targetId: LEGACY_RULE_ID,
      targetLabel: "Whole site (old switch)",
      before: cfg,
      after: next,
      note,
    });
    clearRulesCache();
    revalidatePath("/admin/maintenance");
    return { ok: true };
  }

  const before = await prisma.maintenanceRule.findUnique({ where: { id: input.ruleId } });
  if (!before) return { ok: false, error: "That maintenance no longer exists." };
  if (before.endedAt) return { ok: true };
  const after = await prisma.maintenanceRule.update({ where: { id: before.id }, data: { endedAt: new Date() } });
  const wasScheduled = !!before.startsAt && before.startsAt.getTime() > Date.now();
  await logAdminAction({
    actor: who,
    action: "maintenance.end",
    targetType: "maintenance",
    targetId: after.id,
    targetLabel: label(after.area, after.paths),
    before,
    after,
    note: note ?? (wasScheduled ? "Cancelled before it started" : "Brought back"),
  });
  clearRulesCache();
  revalidatePath("/admin/maintenance");
  return { ok: true };
}

export type BookedInterview = {
  id: string;
  title: string;
  candidateName: string | null;
  scheduledAt: string | null;
  status: string;
  workspace: string | null;
  hostName: string | null;
  hostEmail: string | null;
};

/** Live interviews running now or booked inside the window (rooms only). */
export async function bookedInterviewsAction(input: {
  startsAt: string | null;
  durationMin: number | null;
}): Promise<{ items: BookedInterview[]; more: boolean }> {
  await actor();
  const now = new Date();
  const start = input.startsAt ? new Date(input.startsAt) : now;
  if (Number.isNaN(start.getTime())) return { items: [], more: false };
  // Open-ended windows look a day ahead.
  const end = new Date(start.getTime() + (input.durationMin ?? 24 * 60) * 60_000);
  const startsNow = start.getTime() <= now.getTime() + 60_000;

  const rows = await prisma.interviewSession.findMany({
    where: {
      workspaceId: { not: null },
      type: { not: "take-home" },
      cancelledAt: null,
      OR: [
        { status: "scheduled", scheduledAt: { gte: start, lt: end } },
        ...(startsNow ? [{ status: { in: ["active", "in_progress"] } }] : []),
      ],
    },
    orderBy: { scheduledAt: "asc" },
    take: 26,
    select: {
      id: true,
      title: true,
      candidateName: true,
      scheduledAt: true,
      status: true,
      workspace: { select: { name: true } },
      user: { select: { name: true, email: true } },
    },
  });
  return {
    more: rows.length > 25,
    items: rows.slice(0, 25).map((r) => ({
      id: r.id,
      title: r.title,
      candidateName: r.candidateName,
      scheduledAt: r.scheduledAt?.toISOString() ?? null,
      status: r.status,
      workspace: r.workspace?.name ?? null,
      hostName: r.user.name,
      hostEmail: r.user.email,
    })),
  };
}
