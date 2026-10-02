/**
 * Server loader for switch rows: the registry definition, the current value
 * and who last changed it, flattened to plain JSON for the client controls.
 *
 *   const rows = await loadSwitchViews({ side: "hiring" });
 *   rows.map((v) => <SwitchControl key={v.key} view={v} />)
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { getAllSwitches, SWITCHES, type SwitchSide } from "@/lib/admin/switches";
import type { SwitchView } from "./types";

export async function loadSwitchViews(filter: { side?: SwitchSide | SwitchSide[]; keys?: string[] } = {}): Promise<SwitchView[]> {
  const sides = filter.side ? (Array.isArray(filter.side) ? filter.side : [filter.side]) : null;
  const values = new Map((await getAllSwitches()).map((v) => [v.key, v]));
  const defs = SWITCHES.filter((d) => (!sides || sides.includes(d.side)) && (!filter.keys || filter.keys.includes(d.key)));
  const userIds = [...new Set(defs.map((d) => values.get(d.key)?.updatedById).filter((x): x is string => Boolean(x)))];
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
    : [];
  const nameOf = new Map(users.map((u) => [u.id, u.name?.split(" ")[0] || u.email || "an admin"]));
  return defs.map((d) => {
    const v = values.get(d.key);
    return {
      key: d.key,
      label: d.label,
      side: d.side,
      appliesTo: d.appliesTo,
      description: d.description,
      alsoAffects: d.alsoAffects ?? [],
      defaultMessage: d.defaultMessage,
      state: v?.state ?? "on",
      message: v?.message || d.defaultMessage,
      resumeAt: v?.resumeAt?.toISOString() ?? null,
      updatedAt: v?.updatedAt?.toISOString() ?? null,
      updatedNote: v?.updatedNote ?? null,
      updatedByName: v?.updatedById ? (nameOf.get(v.updatedById) ?? null) : null,
    };
  });
}
